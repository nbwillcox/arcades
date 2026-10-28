/* Touch controls for SpaceStroids: a floating stick (left/right turn, up thrust, down reverse), FIRE (hold), HYPER, pause. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacestroids', title: 'SpaceStroids', orient: 'landscape', accent: '#ff7a3d',
  hint: '<b>Left thumb</b>: stick to turn and thrust &nbsp; <b>Right thumb</b>: hold <b>FIRE</b>, tap <b>HYPER</b>',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  controls: [
    { t: 'stick', id: 'fly', zone: [0, 0.2, 0.5, 1], mode: '8', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, r: 56 },
    { t: 'btn', id: 'fire', label: 'FIRE', key: 'Space', hold: true, size: 86, pos: { r: 20, b: 24 } },
    { t: 'btn', id: 'hyper', label: 'HYPER', key: 'KeyH', hold: false, size: 60, pos: { r: 124, b: 70 } },
  ],
};
