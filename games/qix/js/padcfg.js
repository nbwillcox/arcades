/* Controller map for SpaceQix. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spaceqix', title: 'SpaceQix',
  hint: '<b>Stick / D-pad</b> move the marker &nbsp; hold <b>A / B / LT / RT</b> to draw slowly for double points &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '4' },
  actions: [
    { id: 'slow', label: 'Slow draw (x2)', btn: ['A', 'B', 'LT', 'RT'], key: 'ShiftLeft' },
  ],
};
