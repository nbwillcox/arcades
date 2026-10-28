/* Controller map for SpaceKong. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacekong', title: 'SpaceKong',
  hint: '<b>Stick / D-pad</b> walk and climb ladders &nbsp; <b>A / B / X</b> jump &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '8' },
  actions: [
    { id: 'jump', label: 'Jump', btn: ['A', 'B', 'X', 'RT'], key: 'Space' },
  ],
};
