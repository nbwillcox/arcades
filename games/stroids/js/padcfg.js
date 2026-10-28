/* Controller map for SpaceStroids: left / right turn, up thrust, down reverse. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacestroids', title: 'SpaceStroids',
  hint: '<b>Stick / D-pad</b> turn, thrust, reverse &nbsp; <b>A / RT</b> fire &nbsp; <b>B / X</b> hyperspace &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '8' },
  actions: [
    { id: 'fire', label: 'Fire', btn: ['A', 'RT', 'RB'], key: 'Space' },
    { id: 'hyper', label: 'Hyperspace', btn: ['B', 'X', 'Y'], key: 'KeyH' },
  ],
};
