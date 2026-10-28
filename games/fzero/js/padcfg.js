/* Button remapping + dead zone for FSpaceZero's own gamepad code (native mode: js/pad.js wraps navigator.getGamepads). btn[0] is the button the game reads for that action. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'fspacezero', title: 'FSpaceZero', native: true, deadDefault: 0.08,
  actions: [
    { id: 'accel', label: 'Accelerate', btn: ['A'] },
    { id: 'brake', label: 'Brake', btn: ['LT'] },
    { id: 'boost', label: 'Boost', btn: ['X'] },
    { id: 'slideL', label: 'Side-slide left', btn: ['LB'] },
    { id: 'slideR', label: 'Side-slide right', btn: ['RB'] },
  ],
};
