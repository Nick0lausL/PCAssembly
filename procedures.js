// tools & parts
const BASE_INVENTORY_ITEMS = [
  {
    id: 'new_cpu',
    name: 'Second CPU (New)',
    shortLabel: 'Second CPU',
    description: 'New CPU'
  },
  {
    id: 'hand',
    name: 'Hand Tool',
    shortLabel: 'Hand Tool',
    description: 'Use your hands to unplug cables and move parts.'
  },
  {
    id: 'esd_strap',
    name: 'Wrist Strap',
    shortLabel: 'Wrist Strap',
    description: 'Anti-static strap'
  },
  {
    id: 'screwdriver',
    name: 'Screwdriver',
    shortLabel: 'Screwdriver',
    description: 'Phillips screwdriver for the cooler'
  },
  {
    id: 'wipe',
    name: 'Alcohol Wipes',
    shortLabel: 'Alcohol Wipes',
    description: 'Used to clean old thermal paste off the cpu'
  },
  {
    id: 'thermal_paste',
    name: 'Thermal Paste',
    shortLabel: 'Thermal Paste',
    description: 'Put a small dot on the new CPU'
  },
  {
    id: 'cpu_cooler_item',
    name: 'CPU Cooler',
    shortLabel: 'CPU Cooler',
    description: 'The cooler you took off earlier'
  },
  {
    id: 'old_cpu_item',
    name: 'Old CPU (Removed)',
    shortLabel: 'Old CPU',
    description: 'The old CPU you took out'
  }
];







// show/hide items per step
function getInventoryItemsForStep(stepNumber) {
    let activeIds = ['hand', 'esd_strap', 'screwdriver', 'wipe', 'thermal_paste'];

    if (stepNumber <= 8) {
      activeIds.unshift('new_cpu');
    }

    if (stepNumber >= 5 && stepNumber <= 11) {
      activeIds.push('cpu_cooler_item');
    }

    if (stepNumber >= 8) {
      activeIds.push('old_cpu_item');
    }

    return activeIds
      .map((id) => BASE_INVENTORY_ITEMS.find((item) => item.id === id))
      .filter(Boolean);
}


// add AMD 
const CPU_MODELS = {
  intel_i5: {
    id: 'intel_i5',
    name: 'i5-13600K'
  }
};


// AR box
const PC_COMPONENTS = [
  { id: 'psu_plug', name: 'PSU Switch', x: 18, y: 438, width: 116, height: 82 },
  { id: 'esd_ground', name: 'Ground', x: 18, y: 28, width: 116, height: 60 },
  { id: 'fan_header', name: 'Fan Cable', x: 430, y: 54, width: 142, height: 32 },
  { id: 'cpu_cooler', name: 'CPU Fan', x: 268, y: 145, width: 190, height: 180 },
  { id: 'socket_lever', name: 'Socket Bar', x: 468, y: 170, width: 48, height: 135 },
  { id: 'cpu_socket', name: 'CPU Socket', x: 292, y: 168, width: 142, height: 135 },
  { id: 'ram_slots', name: 'RAM', x: 545, y: 135, width: 90, height: 210 },
  { id: 'gpu_slot', name: 'RTX 2060', x: 215, y: 352, width: 340, height: 64 }
];



// steps
const CPU_REPLACEMENT_STEPS = [
  {
    stepNumber: 1,
    title: 'Turn off PSU',
    targetComponentId: 'psu_plug',
    requiredToolId: 'hand',
    acceptedToolIds: ['hand'],
    instructionManual:
      'Step 1: Turn off the power supply switch in the bottom left before touching anything.',
    subtasks: [
      'Pick Hand Tool',
      'Click the red PSU switch in the bottom left'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 2,
    title: 'Put on wrist strap',
    targetComponentId: 'esd_ground',
    requiredToolId: 'esd_strap',
    acceptedToolIds: ['esd_strap'],
    instructionManual:
      'Step 2: Grab the wrist strap and click Ground at the top left so you dont static shock anything.',
    subtasks: [
      'Pick Wrist Strap',
      'Click Ground at the top left'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 3,
    title: 'Unplug CPU fan',
    targetComponentId: 'fan_header',
    requiredToolId: 'hand',
    acceptedToolIds: ['hand'],
    instructionManual:
      'Step 3: Unplug the fan cable from the CPU_FAN header above the cpu.',
    subtasks: [
      'Pick Hand Tool',
      'Click CPU_FAN above the cooler'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 4,
    title: 'Take off cooler',
    targetComponentId: 'cpu_cooler',
    requiredToolId: 'screwdriver',
    acceptedToolIds: ['screwdriver'],
    instructionManual:
      'Step 4: Use the screwdriver to take off the cpu fan/cooler. It goes into your inventory.',
    subtasks: [
      'Pick Screwdriver',
      'Click CPU Fan to unscrew and take it off'
    ],
    hazardWarning: {
      id: 'hazard_hot_heatsink',
      title: 'Hold on - Heatsink is still hot!',
      message:
        'The cooler is still hot from being on. Click OK before taking it off.'
    }
  },
  {
    stepNumber: 5,
    title: 'Clean old thermal paste',
    targetComponentId: 'cpu_socket',
    requiredToolId: 'wipe',
    acceptedToolIds: ['wipe'],
    instructionManual:
      'Step 5: Use the alcohol wipe to clean the old grey paste off the cpu.',
    subtasks: [
      'Pick Alcohol Wipes',
      'Click the old CPU to wipe the paste off'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 6,
    title: 'Open socket bar',
    targetComponentId: 'socket_lever',
    requiredToolId: 'hand',
    acceptedToolIds: ['hand'],
    instructionManual:
      'Step 6: Use your hand to open the metal bar next to the cpu socket.',
    subtasks: [
      'Pick Hand Tool',
      'Click the metal lever on the right of the cpu'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 7,
    title: 'Take out old CPU',
    targetComponentId: 'cpu_socket',
    requiredToolId: 'hand',
    acceptedToolIds: ['hand'],
    instructionManual:
      'Step 7: Grab the old cpu with your hand and take it out',
    subtasks: [
      'Use Hand Tool',
      'Click the old CPU to take it out'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 8,
    title: 'Put in new CPU',
    targetComponentId: 'cpu_socket',
    requiredToolId: 'new_cpu',
    acceptedToolIds: ['new_cpu', 'hand'],
    instructionManual:
      'Step 8: Grab the new cpu from your inventory and put it into the socket. Line up the gold corner!',
    subtasks: [
      'Pick Second CPU in Inventory',
      'Click the empty socket to put it in'
    ],
    hazardWarning: {
      id: 'hazard_bent_pins',
      title: 'Careful - Socket pins!',
      message:
        'Be careful with the CPU pins in the socket. Click OK before putting the cpu in.'
    }
  },
  {
    stepNumber: 9,
    title: 'Close socket bar',
    targetComponentId: 'socket_lever',
    requiredToolId: 'hand',
    acceptedToolIds: ['hand'],
    instructionManual:
      'Step 9: Pull the metal bar back down to lock the new cpu in.',
    subtasks: [
      'Pick Hand Tool',
      'Click the metal lever to lock it'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 10,
    title: 'Put thermal paste',
    targetComponentId: 'cpu_socket',
    requiredToolId: 'thermal_paste',
    acceptedToolIds: ['thermal_paste'],
    instructionManual:
      'Step 10: Use thermal paste and put a small dot in the middle of the new cpu.',
    subtasks: [
      'Pick Thermal Paste',
      'Click the middle of the new CPU'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 11,
    title: 'Put cooler back',
    targetComponentId: 'cpu_cooler',
    requiredToolId: 'cpu_cooler_item',
    acceptedToolIds: ['cpu_cooler_item', 'hand'],
    instructionManual:
      'Step 11: Grab the cpu cooler from your inventory and put it back on top of the cpu.',
    subtasks: [
      'Pick CPU Cooler from Inventory',
      'Click over the cpu to place it back'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 12,
    title: 'Screw cooler back in',
    targetComponentId: 'cpu_cooler',
    requiredToolId: 'screwdriver',
    acceptedToolIds: ['screwdriver'],
    instructionManual:
      'Step 12: Use the screwdriver to tighten the 4 screws on the cooler',
    subtasks: [
      'Pick Screwdriver',
      'Click CPU Fan to screw it back in'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 13,
    title: 'Plug fan cable back in',
    targetComponentId: 'fan_header',
    requiredToolId: 'hand',
    acceptedToolIds: ['hand'],
    instructionManual:
      'Step 13: Use your hand to plug the cpu fan cable back in.',
    subtasks: [
      'Pick Hand Tool',
      'Click CPU_FAN above the cooler'
    ],
    hazardWarning: null
  },
  {
    stepNumber: 14,
    title: 'Turn PSU back on',
    targetComponentId: 'psu_plug',
    requiredToolId: 'hand',
    acceptedToolIds: ['hand'],
    instructionManual:
      'Step 14: Flip the power supply switch back on and youre done!',
    subtasks: [
      'Pick Hand Tool',
      'Click the PSU switch in the bottom left'
    ],
    hazardWarning: null
  }
];




// check click
function validateStepAction(currentStep, clickedComponentId, selectedToolId, isPaused, activeHazard) {
    if (isPaused) {
      return {
        valid: false,
        errorType: 'paused_interaction',
        message: 'Game is paused! Click Resume first'
      };
    }

    if (activeHazard && !activeHazard.acknowledged) {
      return {
        valid: false,
        errorType: 'unacknowledged_hazard',
        message: 'Click OK on the warning banner before clicking anything.'
      };
    }

    if (clickedComponentId !== currentStep.targetComponentId) {
      return {
        valid: false,
        errorType: 'wrong_component',
        message: 'Wrong part!'
      };
    }

    let allowedIds = currentStep.acceptedToolIds || [currentStep.requiredToolId];
    if (!allowedIds.includes(selectedToolId)) {
      let reqItem = BASE_INVENTORY_ITEMS.find((i) => i.id === currentStep.requiredToolId);
      let reqName = reqItem ? reqItem.shortLabel : currentStep.requiredToolId;
      return {
        valid: false,
        errorType: 'wrong_tool',
        message: 'Wrong tool! You need ' + reqName
      };
    }

    return {
      valid: true,
      errorType: null,
      message: 'Step ' + currentStep.stepNumber + ' done!'
    };
}
