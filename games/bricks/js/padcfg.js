/* Controller map for SpaceBricks. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacebricks', title: 'SpaceBricks',
  hint: '<b>Stick / D-pad</b> slide the paddle &nbsp; <b>A / RT</b> launch the ball and fire the laser &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight' }, mode: 'h' },
  actions: [
    { id: 'fire', label: 'Launch / laser', btn: ['A', 'RT', 'X', 'RB'], key: 'Space' },
  ],
};
