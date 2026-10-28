/* Touch controls for SpaceContra: two thumbsticks. The left one runs (push it up to jump, down to lie prone); the right one aims in any direction and fires while it is pushed. A JUMP button is there
   too (for a drop through a ledge: hold down on the left stick and tap JUMP). Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacecontra', title: 'SpaceContra', orient: 'landscape', accent: '#ff6a3d',
  hint: '<b>Left thumb</b>: stick to run (up = jump, down = prone) &nbsp; <b>Right thumb</b>: stick to aim and fire &nbsp; <b>JUMP</b> button: jump, or drop through a ledge with the stick held down',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, t: 46 } },                                                /* just under the HUD bar */
  controls: [
    { t: 'stick', id: 'run', zone: [0, 0.12, 0.5, 1], mode: '8', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'Space', d: 'ArrowDown' }, r: 56, dead: 0.3, deadY: 0.6 },
    { t: 'stick', id: 'aim', zone: [0.5, 0.12, 1, 1], mode: '8', keys: {}, r: 56, dead: 0.2, holdKey: 'KeyX', holdAt: 0.3, onMove: (x, y) => { const I = window.SGS && window.SGS.input; if (I) I.stick = x || y ? { x, y } : null; } },
    { t: 'btn', id: 'jump', label: 'JUMP', key: 'Space', hold: true, size: 72, pos: { r: 16, b: 16 } },
  ],
};
