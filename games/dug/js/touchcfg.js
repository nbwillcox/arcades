/* Touch controls for SpaceDug: a floating thumb-stick (dig and move, one direction at a time), a PUMP button (hold to fire the hose and inflate), pause. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacedug', title: 'SpaceDug', orient: 'portrait', accent: '#ffb347',
  hint: '<b>Left thumb</b>: floating stick to dig and move &nbsp; <b>Right thumb</b>: hold <b>PUMP</b> to fire the hose and inflate aliens',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 24, b: 176 }, mirror: true },
  controls: [
    { t: 'stick', id: 'move', zone: [0, 0.4, 0.6, 1], mode: '4', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, r: 56 },
    { t: 'btn', id: 'pump', label: 'PUMP', key: 'Space', hold: true, size: 96, pos: { r: 20, b: 56 } },
  ],
};
