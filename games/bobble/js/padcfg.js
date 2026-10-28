/* Button remapping + dead zone for SpaceBobble's own gamepad code (native mode: js/pad.js wraps navigator.getGamepads). btn[0] is the button the game reads for that action. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacebobble', title: 'SpaceBobble', native: true, deadDefault: 0.08,
  actions: [
    { id: 'jump', label: 'Jump', btn: ['A'] },
    { id: 'blow', label: 'Blow bubble', btn: ['X'] },
  ],
};
