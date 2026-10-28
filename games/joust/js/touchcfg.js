/* Touch controls for SpaceJoust: a floating stick on the left steers (left / right), and a big FLAP button on the right: tap it again and again to climb. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacejoust', title: 'SpaceJoust', orient: 'landscape', accent: '#ffe45a',
  hint: '<b>Left thumb</b>: floating stick to steer &nbsp; <b>Right thumb</b>: tap <b>FLAP</b> again and again to climb',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, t: 10 } },
  controls: [
    { t: 'stick', id: 'steer', zone: [0, 0.2, 0.45, 1], mode: 'h', keys: { l: 'ArrowLeft', r: 'ArrowRight' }, r: 62, dead: 0.2, at: [0.2, 0.7] },
    { t: 'btn', id: 'flap', label: 'FLAP', key: 'Space', hold: false, size: 120, pos: { r: 26, b: 24 } },
  ],
};
