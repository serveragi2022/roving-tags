// The standard checklist. It is used for every machine that has no checklist of its own.
// "icon" is a MaterialIcons name (custom items without an icon get a default one).
export const DEFAULT_CHECKLIST = {
  id: 'default',
  name: 'Standard Checklist',
  operating: [
    { id: 'gauges', label: 'Gauges & Pressure', icon: 'speed' },
    { id: 'leaks', label: 'Leaks & Seals', icon: 'opacity' },
    { id: 'temperature', label: 'Running Temperature', icon: 'device-thermostat' },
    { id: 'vibration', label: 'Abnormal Vibration', icon: 'vibration' },
    { id: 'noise', label: 'Unusual Noise', icon: 'volume-up' },
    {
      id: 'status',
      label: 'Machine Running Status',
      icon: 'power-settings-new',
      goodLabel: 'Running Normal',
      badLabel: 'Stopped',
    },
  ],
  housekeeping: [
    { id: 'noLeaks', label: 'No leaks or spills', icon: 'water-drop' },
    { id: 'noHazards', label: 'No safety hazards', icon: 'health-and-safety' },
    { id: 'noStrayTools', label: 'No stray tools / loose parts', icon: 'home-repair-service' },
    { id: 'cleanPerimeter', label: 'Clean perimeter (no flour dust/debris)', icon: 'cleaning-services' },
  ],
};

const DEFAULT_ICONS = { operating: 'tune', housekeeping: 'cleaning-services' };

// All items of a checklist in one list, each with its section and icon
export function getAllItems(checklist) {
  const operating = checklist.operating.map((item) => ({
    ...item,
    section: 'operating',
    icon: item.icon || DEFAULT_ICONS.operating,
  }));
  const housekeeping = checklist.housekeeping.map((item) => ({
    ...item,
    section: 'housekeeping',
    icon: item.icon || DEFAULT_ICONS.housekeeping,
  }));
  return [...operating, ...housekeeping];
}

// Process Owner checkboxes on the approval screen
export const WORK_APPROVAL_CHECKS = [
  'Breakdown confirmed and repair is authorized to start',
  'Machine is isolated and safe to work on',
  'Valid reason confirmed for roving deferral',
];

export const COMPLETION_APPROVAL_CHECKS = [
  'Repair quality and mechanical safety inspected',
  'Line handover completed & area 5S cleared (no stray tools)',
  'Valid reason confirmed for roving deferral',
];
