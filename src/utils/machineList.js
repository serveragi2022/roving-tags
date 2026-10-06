import { MACHINE_ROWS } from './machineRows';

// Mills (areas) shown on the Setup screen
export const MILLS = ['Silo', 'Mill A', 'Mill B', 'Bran', 'Others'];

// Which mill does a location text belong to?
function getMill(location) {
  if (location.startsWith('Silo')) return 'Silo';
  if (location.includes('Mill A')) return 'Mill A';
  if (location.includes('Mill B')) return 'Mill B';
  if (location.includes('Bran')) return 'Bran';
  return 'Others';
}

// "Mill A - 1st Floor" -> "1st Floor", "Compressor Room Mill A" -> "Compressor Room"
function getFloor(location) {
  if (location === 'N/A') return 'No location';
  const floor = location
    .replace(/^(Silo|Mill A|Mill B|Bran B)\s*-?\s*/, '')
    .replace(/\s*-?\s*(Mill A|Mill B)$/, '');
  return floor === '' ? location : floor;
}

// 1st Floor = 10, 1st Floor Extension = 11, 2nd Floor = 20 ... places without a number go last
function getFloorRank(floor) {
  const match = floor.match(/(\d+)(st|nd|rd|th)/i);
  const number = match ? parseInt(match[1], 10) : 99;
  return number * 10 + (/extension/i.test(floor) ? 1 : 0);
}

// All machines, sorted by mill, then floor, then the original order
export const MACHINES = MACHINE_ROWS.map(([code, desc, location], index) => ({
  code,
  name: desc,
  area: getMill(location),
  floor: getFloor(location),
  index,
})).sort((a, b) => {
  const millDifference = MILLS.indexOf(a.area) - MILLS.indexOf(b.area);
  if (millDifference !== 0) return millDifference;
  const floorDifference = getFloorRank(a.floor) - getFloorRank(b.floor);
  if (floorDifference !== 0) return floorDifference;
  return a.index - b.index;
});

const machineByCode = new Map(MACHINES.map((machine) => [machine.code.toUpperCase(), machine]));

// Finds a machine by the code in the QR (not case sensitive). Returns undefined if not found.
export function findMachine(code) {
  return machineByCode.get(String(code).trim().toUpperCase());
}

export function getMachinesOfMill(mill) {
  return MACHINES.filter((machine) => machine.area === mill);
}
