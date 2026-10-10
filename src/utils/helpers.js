// Small helper functions used by many screens
import { findMachine } from './machineList';

// Name of the app (login screen and home screen)
export const APP_TITLE = 'AGI Roving Tags Cleaning and Monitoring';

// Change this if the night shift (Shift C) ends at a different hour.
// Records made before this hour still belong to the previous day's work date.
const NEW_WORK_DAY_STARTS_AT_HOUR = 6;

// Work date like "2026-10-05". Used to know which records belong to "today".
export function getWorkDate() {
  const date = new Date(Date.now() - NEW_WORK_DAY_STARTS_AT_HOUR * 60 * 60 * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

// "08:04 AM"
export function formatTime(isoText) {
  if (!isoText) return '--:--';
  return new Date(isoText).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// "1 hr 15 mins"
export function formatDuration(startIso, endIso) {
  if (!startIso || !endIso) return '--';
  const totalMinutes = Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours} hr ${minutes} mins` : `${minutes} mins`;
}

export function formatGps(gps) {
  if (!gps) return 'GPS not available';
  return `${gps.latitude.toFixed(5)}, ${gps.longitude.toFixed(5)} (±${Math.round(gps.accuracy)}m)`;
}

export function makeRecordId(assetCode) {
  return `${assetCode}-${Date.now()}`;
}

// True if at least one checklist answer is "bad"
export function hasProblem(answers) {
  return Object.values(answers || {}).includes('bad');
}

// Status of one stop for today:
// pending, done, issue (checklist has a Not Good answer) or deferred (urgent repair)
// "todayRecords" is newest first, so find() returns the latest record.
export function getStopStatus(stop, todayRecords) {
  const record = todayRecords.find((item) => item.assetCode === stop.code);
  if (!record) return { status: 'pending', record: null };
  if (record.type === 'urgent') return { status: 'deferred', record };
  if (hasProblem(record.answers)) return { status: 'issue', record };
  return { status: 'done', record };
}

// How many stops are in each status
export function countStops(stops, todayRecords) {
  const counts = { total: stops.length, done: 0, issue: 0, deferred: 0, pending: 0 };
  stops.forEach((stop) => {
    const { status } = getStopStatus(stop, todayRecords);
    counts[status] += 1;
  });
  return counts;
}

// Groups stops by area + floor for the route list
export function groupByFloor(stops) {
  const sections = [];
  stops.forEach((stop) => {
    const title = `${stop.area} — ${stop.floor}`;
    let section = sections.find((item) => item.title === title);
    if (!section) {
      section = { title, data: [] };
      sections.push(section);
    }
    section.data.push(stop);
  });
  return sections;
}

// Shared fields for every saved record. "setup" is { workDate, shift }.
// The mill (area) of the record is the area of the machine, because a route can have machines from different areas.
export function makeRecordBase(user, setup, assetCode, stop) {
  return {
    id: makeRecordId(assetCode),
    assetCode,
    assetName: stop ? stop.name : '',
    location: stop ? `${stop.area} — ${stop.floor}` : '',
    userId: user.userId, // the server uses it to find who made the record
    branch: user.branch,
    operatorId: user.employeeId,
    operatorName: user.name,
    shift: setup.shift,
    mill: (stop && stop.area) || (findMachine(assetCode) || {}).area || 'Others',
    workDate: setup.workDate,
    createdAt: new Date().toISOString(),
    uploadStatus: 'waiting', // waiting, uploaded or failed
  };
}

// Switch to a screen without keeping history (used by the bottom bar and "finish" buttons)
export function goTo(navigation, screenName) {
  navigation.reset({ index: 0, routes: [{ name: screenName }] });
}

// Empty urgent repair sheet (kept in the app context while the technician fills it in)
export function makeBlankUrgentDraft(assetCode = '') {
  return {
    assetCode,
    notifiedAt: null,
    workApproval: null, // { status, approvedBy, remarks, approvedAt }
    problem: '',
    correctiveAction: '',
    startTime: null,
    endTime: null,
    photo: null, // { uri, takenAt, gps }
    completionApproval: null,
  };
}

// Storage key of the route that was assigned for one date + shift (a route can have machines from any area)
export function getRouteKey(setup) {
  return `roving_route_${setup.workDate}_${setup.shift}`;
}

// "2026-10-05" + 1 -> "2026-10-06"
export function shiftDate(dateText, days) {
  const [year, month, day] = dateText.split('-').map(Number);
  const date = new Date(year, month - 1, day + days);
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${newMonth}-${newDay}`;
}

// "2026-10-05" -> "Mon, Oct 5, 2026"
export function formatDateLabel(dateText) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
