/* Controller map for SpaceFrogger. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacefrogger', title: 'SpaceFrogger',
  hint: '<b>Stick / D-pad</b> hop &nbsp; <b>A / X</b> use the power-up &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '4' },
  actions: [
    { id: 'power', label: 'Use power-up', btn: ['A', 'X', 'RT'], key: 'Space' },
  ],
};
