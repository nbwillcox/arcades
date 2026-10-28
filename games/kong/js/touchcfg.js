/* Touch controls for SpaceKong: a floating stick on the lower left walks (left / right) and climbs ladders (up / down); JUMP is on the right. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacekong', title: 'SpaceKong', orient: 'portrait', accent: '#ff7aa8',
  hint: '<b>Left thumb</b>: floating stick to walk and climb ladders &nbsp; <b>Right thumb</b>: <b>JUMP</b>',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 16, b: 150 } },
  controls: [
    { t: 'stick', id: 'move', zone: [0, 0.45, 0.6, 1], mode: '8', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, r: 58, dead: 0.3, deadY: 0.4, at: [0.28, 0.74] },
    { t: 'btn', id: 'jump', label: 'JUMP', key: 'Space', hold: false, size: 96, pos: { r: 18, b: 26 } },
  ],
};
