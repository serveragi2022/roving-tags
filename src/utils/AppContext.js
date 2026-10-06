import { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { loadJson, saveJson } from './storage';
import { BRANCH, getUsers, uploadRecord } from '../services/api';
import { loadAccountInfo, saveAccounts } from './accounts';
import { DEFAULT_CHECKLIST } from './checklistItems';
import { MACHINES } from './machineList';
import { getRouteKey, getWorkDate } from './helpers';

// Shared data for all screens: logged-in user, setup (date, mill, shift), route,
// checklists, saved records, online status.
const AppContext = createContext(null);

export function useApp() {
  return useContext(AppContext);
}

export function AppProvider({ children }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null); // null = not logged in
  const [accountInfo, setAccountInfo] = useState({ count: 0, syncedAt: null });
  const [setup, setSetup] = useState({ workDate: getWorkDate(), mill: 'Mill A', shift: 'A' });
  const [routeCodes, setRouteCodes] = useState([]); // machine codes assigned for the setup
  const [checklists, setChecklists] = useState([DEFAULT_CHECKLIST]);
  const [checklistMap, setChecklistMap] = useState({}); // { machineCode: checklistId }
  const [records, setRecords] = useState([]); // newest first
  const [isOnline, setIsOnline] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [urgentDraft, setUrgentDraft] = useState(null); // urgent repair sheet in progress

  // 1. Load everything saved on the phone when the app starts
  useEffect(() => {
    async function loadSavedData() {
      const savedChoice = await loadJson('roving_setup', { mill: 'Mill A', shift: 'A' });
      const newSetup = { workDate: getWorkDate(), mill: savedChoice.mill, shift: savedChoice.shift };
      const savedChecklists = await loadJson('roving_checklists', null);

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

  // ---------- Login / accounts ----------

  function loginUser(newUser) {
    setUser(newUser);
    saveJson('roving_user', newUser);
  }

  function logoutUser() {
    setUser(null);
    saveJson('roving_user', null);
  }

  // Downloads the accounts of the branch for offline login and approval. Returns the count.
  async function syncAccounts(branch) {
    const users = await getUsers(branch || (user && user.branch) || BRANCH);
    const count = await saveAccounts(users);
    setAccountInfo({ count, syncedAt: new Date().toISOString() });
    return count;
  }

  // ---------- Setup and route ----------

  // Called by the Setup screen: remember the choice and load the route saved for it
  async function applySetup(newSetup) {
    const codes = await loadJson(getRouteKey(newSetup), []);
    setSetup(newSetup);
    setRouteCodes(codes);
    saveJson('roving_setup', { mill: newSetup.mill, shift: newSetup.shift });
  }

  // Called by the Assign Route screen: save the machines to rove for the current setup
  function saveRoute(codes) {
    setRouteCodes(codes);
    saveJson(getRouteKey(setup), codes);
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

  // Uploads the given records one by one. Returns how many worked and failed.
  async function uploadRecords(recordsToUpload) {
    if (isUploading) return { uploaded: 0, failed: 0 };

    setIsUploading(true);
    let uploaded = 0;
    let failed = 0;

    for (const record of recordsToUpload) {
      let newStatus = 'uploaded';
      try {
        await uploadRecord(record);
        uploaded += 1;
      } catch (error) {
        newStatus = 'failed';
        failed += 1;
      }
      changeRecords((oldRecords) =>
        oldRecords.map((item) =>
          item.id === record.id ? { ...item, uploadStatus: newStatus } : item
        )
      );
    }

    setIsUploading(false);
    return { uploaded, failed };
  }

  // The route: assigned machines, already sorted by floor
  const codeSet = new Set(routeCodes);
  const stops = MACHINES.filter((machine) => codeSet.has(machine.code));

  const pendingRecords = records.filter((item) => item.uploadStatus !== 'uploaded');
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
