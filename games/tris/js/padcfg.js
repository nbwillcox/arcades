/* Button remapping + dead zone for SpaceTris's own gamepad code (native mode: js/pad.js wraps navigator.getGamepads). btn[0] is the button the game reads for that action. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacetris', title: 'SpaceTris', native: true, deadDefault: 0.1,
  actions: [
    { id: 'hard', label: 'Hard drop', btn: ['RT'] },
    { id: 'rotR', label: 'Rotate right', btn: ['A'] },
    { id: 'rotL', label: 'Rotate left', btn: ['X'] },
    { id: 'hold', label: 'Hold piece', btn: ['Y'] },
  ],
};
