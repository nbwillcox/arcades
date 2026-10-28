/* Controller map for SpaceSidePews. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacesidepews', title: 'SpaceSidePews', pause: 'KeyP',
  hint: '<b>Stick / D-pad</b> fly &nbsp; <b>A / RT</b> fire &nbsp; <b>X</b> reverse &nbsp; <b>Y</b> power-up meter &nbsp; <b>B / RB</b> bomb &nbsp; <b>LB</b> hyperspace &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' }, mode: '8' },
  actions: [
    { id: 'fire', label: 'Fire', btn: ['A', 'RT'], key: 'Space' },
    { id: 'rev', label: 'Reverse facing', btn: ['X'], key: 'ShiftLeft' },
    { id: 'pow', label: 'Cash in power-up', btn: ['Y'], key: 'KeyE' },
    { id: 'bomb', label: 'Smart bomb', btn: ['B', 'RB'], key: 'KeyB' },
    { id: 'hyper', label: 'Hyperspace', btn: ['LB', 'LT'], key: 'KeyH' },
  ],
};
