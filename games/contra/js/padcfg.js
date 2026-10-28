/* Controller map for SpaceContra: left stick runs (down = prone), right stick aims and fires, A jumps. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacecontra', title: 'SpaceContra',
  hint: '<b>Left stick / D-pad</b> run, down = prone &nbsp; <b>Right stick</b> aim and fire &nbsp; <b>A</b> jump (down + A drops through a ledge) &nbsp; <b>X / RT</b> fire &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', d: 'ArrowDown' }, mode: '8' },
  aim: { stick: 'right', holdKey: 'KeyX', holdAt: 0.3, fn: (x, y) => { const I = window.SGS && window.SGS.input; if (I) I.stick = x || y ? { x, y } : null; } },
  actions: [
    { id: 'jump', label: 'Jump', btn: ['A', 'LB'], key: 'Space' },
    { id: 'fire', label: 'Fire (forward)', btn: ['X', 'RT', 'RB'], key: 'KeyX' },
  ],
};
