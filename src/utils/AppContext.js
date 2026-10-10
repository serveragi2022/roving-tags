import { createContext, useContext, useEffect, useRef, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { loadJson, saveJson } from './storage';
import {
  BRANCH,
  getConfigRemote,
  getRouteRemote,
  getUsers,
  saveConfigRemote,
  setApiKey,
  saveRouteRemote,
  uploadRecord,
} from '../services/api';
import { canSetup, loadAccountInfo, saveAccounts } from './accounts';
import { DEFAULT_CHECKLIST } from './checklistItems';
import { MACHINES } from './machineList';
import { getRouteKey, getWorkDate } from './helpers';

// Shared data for all screens: logged-in user, setup (date, shift), route,
// checklists, saved records, online status.
const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null); // null = not logged in
  const [accountInfo, setAccountInfo] = useState({ count: 0, syncedAt: null });
  const [setup, setSetup] = useState({ workDate: getWorkDate(), shift: '1' });
  const [routeCodes, setRouteCodes] = useState([]); // machine codes assigned for the setup
  const [checklists, setChecklists] = useState([DEFAULT_CHECKLIST]);
  const [checklistMap, setChecklistMap] = useState({}); // { machineCode: checklistId }
  const [records, setRecords] = useState([]); // newest first
  const [isOnline, setIsOnline] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [urgentDraft, setUrgentDraft] = useState(null); // urgent repair sheet in progress

  // Route / checklist changes (made by someone with setup access) that are not on the server yet
  // { config: timestamp or 0, routes: { [routeKey]: { workDate, shift, codes } } }
  const pendingRef = useRef({ config: 0, routes: {} });

  // Only one upload run at a time (a state value is too slow to stop a double tap)
  const uploadLockRef = useRef(false);
  const uploadedIdsRef = useRef(new Set()); // records uploaded since the app opened
  const [pendingSetupCount, setPendingSetupCount] = useState(0);

  // 1. Load everything saved on the phone when the app starts
  useEffect(() => {
    async function loadSavedData() {
      const savedChoice = await loadJson('roving_setup', { shift: '1' });
      const newSetup = { workDate: getWorkDate(), shift: savedChoice.shift || '1' };
      const savedChecklists = await loadJson('roving_checklists', null);

      pendingRef.current = await loadJson('roving_pending_setup', { config: 0, routes: {} });
      setPendingSetupCount(Object.keys(pendingRef.current.routes).length + (pendingRef.current.config ? 1 : 0));
      setApiKey(await loadJson('roving_api_key', ''));
      setUser(await loadJson('roving_user', null));
      setAccountInfo(await loadAccountInfo());
      setRecords(await loadJson('roving_records', []));
      setSetup(newSetup);
      setRouteCodes(await loadJson(getRouteKey(newSetup), []));
      setChecklistMap(await loadJson('roving_checklist_map', {}));
      if (savedChecklists) {
        // the standard checklist must always exist
        const hasDefault = savedChecklists.some((item) => item.id === 'default');
        setChecklists(hasDefault ? savedChecklists : [DEFAULT_CHECKLIST, ...savedChecklists]);
      }
      setIsLoading(false);
    }
    loadSavedData();
  }, []);

  // 2. Watch the internet connection
  useEffect(() => {
    const stopWatching = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected !== false && state.isInternetReachable !== false);
    });
    return stopWatching;
  }, []);

  // 3. When online and logged in: upload waiting changes, then download the latest
  //    checklists and the route of the current setup from the server
  useEffect(() => {
    if (isLoading || !user || !isOnline) return;
    (async () => {
      await flushPending();
      await pullConfig();
      setRouteCodes(await loadRoute(setup));
    })().catch(() => {});
  }, [isLoading, user, isOnline]);

  // ---------- Login / accounts ----------

  function loginUser(newUser) {
    // The api_key (online login only) is kept apart from the user. An offline login
    // keeps using the key saved by the last online login.
    const { apiKey, ...savedUser } = newUser;
    if (apiKey) {
      setApiKey(apiKey);
      saveJson('roving_api_key', apiKey);
    }
    setUser(savedUser);
    saveJson('roving_user', savedUser);
  }

  function logoutUser() {
    setUser(null);
    saveJson('roving_user', null);
  }

  // Downloads the accounts of the branch for offline login and approval. Returns the count.
  // After an account sync, the logged-in user gets the latest access from the server
  function refreshUserAccess(apiUsers) {
    setUser((current) => {
      if (!current) return current;
      const match = apiUsers.find(
        (item) => String(item.username).toLowerCase() === String(current.username).toLowerCase()
      );
      if (!match) return current;
      const updated = {
        ...current,
        role: match.position || current.role,
        accessModule: match.accessmodule ?? match.access_module ?? match.accessModule,
        accessDept: match.access_department,
      };
      saveJson('roving_user', updated);
      return updated;
    });
  }

  async function syncAccounts(branch) {
    const users = await getUsers(branch || (user && user.branch) || BRANCH);
    const count = await saveAccounts(users);
    refreshUserAccess(users);
    setAccountInfo({ count, syncedAt: new Date().toISOString() });
    return count;
  }

  // ---------- Setup and route ----------

  // Called by the Setup screen: remember the choice and load the route saved for it
  async function applySetup(newSetup) {
    const codes = await loadJson(getRouteKey(newSetup), []);
    setSetup(newSetup);
    setRouteCodes(codes);
    saveJson('roving_setup', { shift: newSetup.shift });
  }

  // The route for a date + shift. The server copy (set by the route setter) wins when we
  // are online; it is saved on the phone so it also works offline. Returns the machine codes.
  async function loadRoute(choice) {
    const key = getRouteKey(choice);
    const local = await loadJson(key, []);
    if (!isOnline || !user || pendingRef.current.routes[key]) return local; // keep our own waiting change
    try {
      const remote = await getRouteRemote(getBranch(), choice);
      if (remote && remote.machineCodes.length > 0) {
        saveJson(key, remote.machineCodes);
        return remote.machineCodes;
      }
    } catch (error) {
      // no connection or server problem: use what is saved on the phone
    }
    return local;
  }

  // Called by the Assign Route screen (setup access only): save the machines to rove for the
  // current setup. Returns true when the server has it, false when it is waiting to upload.
  async function saveRoute(codes) {
    if (!canSetup(user)) return false;
    setRouteCodes(codes);
    saveJson(getRouteKey(setup), codes);
    const choice = { workDate: setup.workDate, shift: setup.shift };
    changePending((pending) => {
      pending.routes[getRouteKey(choice)] = { ...choice, codes };
    });
    return await sendRoute(getRouteKey(choice));
  }

  // ---------- Syncing the setup with the server ----------

  function getBranch() {
    return (user && user.branch) || BRANCH;
  }

  // Changes the waiting list and saves it on the phone
  function changePending(change) {
    const next = { config: pendingRef.current.config, routes: { ...pendingRef.current.routes } };
    change(next);
    pendingRef.current = next;
    saveJson('roving_pending_setup', next);
    setPendingSetupCount(Object.keys(next.routes).length + (next.config ? 1 : 0));
  }

  // Uploads one waiting route. Returns true when done.
  async function sendRoute(key) {
    const item = pendingRef.current.routes[key];
    if (!item) return true;
    if (!isOnline || !user) return false;
    const done = () =>
      changePending((pending) => {
        if (pending.routes[key] === item) delete pending.routes[key];
      });
    try {
      await saveRouteRemote({
        branch: getBranch(),
        workDate: item.workDate,
        shift: item.shift,
        machineCodes: item.codes,
        userId: user.userId,
      });
      done();
      return true;
    } catch (error) {
      // demo mode (no server) or refused by the server: nothing to retry
      if (error.message === 'NO_API_URL' || error.message === 'FORBIDDEN') done();
      return error.message === 'NO_API_URL';
    }
  }

  // Uploads the waiting checklists + machine assignments. Returns true when done.
  async function sendConfig(list, map) {
    const stamp = pendingRef.current.config;
    if (!stamp) return true;
    if (!isOnline || !user) return false;
    const done = () =>
      changePending((pending) => {
        if (pending.config === stamp) pending.config = 0;
      });
    try {
      await saveConfigRemote({
        branch: getBranch(),
        checklists: list || (await loadJson('roving_checklists', [DEFAULT_CHECKLIST])),
        checklistMap: map || (await loadJson('roving_checklist_map', {})),
        userId: user.userId,
      });
      done();
      return true;
    } catch (error) {
      if (error.message === 'NO_API_URL' || error.message === 'FORBIDDEN') done();
      return error.message === 'NO_API_URL';
    }
  }

  // Marks the checklists as changed and tries to upload them right away
  function pushConfig(list, map) {
    if (!canSetup(user)) return;
    changePending((pending) => {
      pending.config = Date.now();
    });
    sendConfig(list, map).catch(() => {});
  }

  async function flushPending() {
    for (const key of Object.keys(pendingRef.current.routes)) {
      await sendRoute(key);
    }
    if (pendingRef.current.config) await sendConfig();
  }

  // Downloads the checklists and machine assignments made by the route setter
  async function pullConfig() {
    if (pendingRef.current.config) return; // our own change is still waiting to upload
    try {
      const remote = await getConfigRemote(getBranch());
      if (!remote) {
        // Nothing on the server yet: the existing setup of the route setter becomes the server copy
        if (canSetup(user) && (checklists.length > 1 || Object.keys(checklistMap).length > 0)) {
          pushConfig(checklists, checklistMap);
        }
        return;
      }
      const hasDefault = remote.checklists.some((item) => item.id === 'default');
      const newList = hasDefault ? remote.checklists : [DEFAULT_CHECKLIST, ...remote.checklists];
      setChecklists(newList);
      setChecklistMap(remote.checklistMap);
      saveJson('roving_checklists', newList);
      saveJson('roving_checklist_map', remote.checklistMap);
    } catch (error) {
      // no connection or server problem: keep what is saved on the phone
    }
  }

  // ---------- Checklists ----------

  // Adds a new checklist or replaces the one with the same id
  function saveChecklist(checklist) {
    const exists = checklists.some((item) => item.id === checklist.id);
    const newList = exists
      ? checklists.map((item) => (item.id === checklist.id ? checklist : item))
      : [...checklists, checklist];
    setChecklists(newList);
    saveJson('roving_checklists', newList);
    pushConfig(newList, checklistMap);
  }

  // Deletes a checklist. Its machines go back to the standard checklist.
  function deleteChecklist(id) {
    if (id === 'default') return;
    const newList = checklists.filter((item) => item.id !== id);
    const newMap = {};
    Object.keys(checklistMap).forEach((code) => {
      if (checklistMap[code] !== id) newMap[code] = checklistMap[code];
    });
    setChecklists(newList);
    setChecklistMap(newMap);
    saveJson('roving_checklists', newList);
    saveJson('roving_checklist_map', newMap);
    pushConfig(newList, newMap);
  }

  // Gives the checklist to exactly these machines.
  // Machines that had it before but are not in the list go back to the standard checklist.
  function assignChecklist(checklistId, machineCodes) {
    const chosen = new Set(machineCodes);
    const newMap = { ...checklistMap };
    Object.keys(newMap).forEach((code) => {
      if (newMap[code] === checklistId && !chosen.has(code)) delete newMap[code];
    });
    machineCodes.forEach((code) => {
      newMap[code] = checklistId;
    });
    setChecklistMap(newMap);
    saveJson('roving_checklist_map', newMap);
    pushConfig(checklists, newMap);
  }

  // The checklist to show when this machine is scanned
  function getChecklistFor(machineCode) {
    const id = checklistMap[machineCode] || 'default';
    return (
      checklists.find((item) => item.id === id) ||
      checklists.find((item) => item.id === 'default') ||
      DEFAULT_CHECKLIST
    );
  }

  // ---------- Records ----------

  // Changes the records list and saves it on the phone
  function changeRecords(updateFunction) {
    setRecords((oldRecords) => {
      const newRecords = updateFunction(oldRecords);
      saveJson('roving_records', newRecords);
      return newRecords;
    });
  }

  function addRecord(record) {
    changeRecords((oldRecords) => [record, ...oldRecords]);
  }

  // Uploads the given records ONE AT A TIME. Only one upload run can be active:
  // a second call (double tap, "Upload Now" + "Upload All") is ignored until the first one ends.
  // A record that is already uploaded, or listed twice, is skipped.
  // Returns { uploaded, failed, busy }.
  async function uploadRecords(recordsToUpload) {
    if (uploadLockRef.current) return { uploaded: 0, failed: 0, busy: true };
    uploadLockRef.current = true;
    setIsUploading(true);

    let uploaded = 0;
    let failed = 0;
    let duplicates = 0;
    const seen = new Set();

    try {
      for (const record of recordsToUpload) {
        if (seen.has(record.id) || uploadedIdsRef.current.has(record.id) || record.uploadStatus === 'uploaded') continue;
        seen.add(record.id);

        let newStatus = 'uploaded';
        try {
          await uploadRecord(record, {
            branch: getBranch(),
            userId: user && user.userId,
          });
          uploaded += 1;
          uploadedIdsRef.current.add(record.id);
        } catch (error) {
          if (error?.message === 'DUPLICATE') {
            // The server already has an inspection of this machine for this date and shift
            newStatus = 'duplicate';
            duplicates += 1;
          } else {
            newStatus = 'failed';
            failed += 1;
            console.error('UPLOAD FAILED:', {
              recordId: record.id,
              message: error?.message,
            });
          }
        }

        changeRecords((oldRecords) =>
          oldRecords.map((item) =>
            item.id === record.id ? { ...item, uploadStatus: newStatus } : item
          )
        );
      }
    } finally {
      uploadLockRef.current = false;
      setIsUploading(false);
    }

    return { uploaded, failed, duplicates, busy: false };
  }

  // The route: assigned machines, already sorted by floor
  const codeSet = new Set(routeCodes);
  const stops = MACHINES.filter((machine) => codeSet.has(machine.code));

  const pendingRecords = records.filter((item) => item.uploadStatus !== 'uploaded' && item.uploadStatus !== 'duplicate');
  const todayRecords = records.filter(
    (item) => item.workDate === setup.workDate && item.shift === setup.shift
  );

  const value = {
    user,
    loginUser,
    logoutUser,
    accountInfo,
    syncAccounts,
    isLoading,
    setup,
    applySetup,
    stops,
    saveRoute,
    loadRoute,
    pendingSetupCount,
    checklists,
    checklistMap,
    saveChecklist,
    deleteChecklist,
    assignChecklist,
    getChecklistFor,
    records,
    todayRecords,
    pendingRecords,
    addRecord,
    uploadRecords,
    isOnline,
    isUploading,
    urgentDraft,
    setUrgentDraft,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
