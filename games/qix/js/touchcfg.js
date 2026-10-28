/* Touch controls for SpaceQix: a floating stick on the lower half moves the marker (it moves while the stick is pushed); hold SLOW when you leave the edge for a slow, double-scoring line. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spaceqix', title: 'SpaceQix', orient: 'portrait', accent: '#c9a0ff',
  hint: '<b>Left thumb</b>: floating stick to move &nbsp; hold <b>SLOW</b> as you leave the edge for a slow, double-scoring line',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, b: 70 } },
  controls: [
    { t: 'stick', id: 'move', zone: [0, 0.38, 0.62, 1], mode: '4', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, r: 58, dead: 0.32, at: [0.3, 0.74] },
    { t: 'btn', id: 'slow', label: 'SLOW', key: 'ShiftLeft', hold: true, size: 92, pos: { r: 16, b: 26 } },
  ],
};
