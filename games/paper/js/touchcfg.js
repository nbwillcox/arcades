/* Touch controls for SpacePaper: a floating stick on the left steers (up = faster, down = brake); on the right, THROW buttons for each side, HOP and AUTO. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacepaper', title: 'SpacePaper', orient: 'landscape', accent: '#ffd24a',
  hint: '<b>Left thumb</b>: stick to steer (up = faster, down = brake) &nbsp; <b>THROW</b> buttons toss a paper that way &nbsp; <b>HOP</b> jumps &nbsp; <b>AUTO</b> throws at the nearest target',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, t: 58 } },
  controls: [
    { t: 'stick', id: 'move', zone: [0, 0.12, 0.45, 1], mode: '8', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, r: 56, dead: 0.25 },
    { t: 'btn', id: 'tl', label: '\u25C0 THROW', key: 'KeyZ', hold: false, size: 78, pos: { r: 170, b: 22 } },
    { t: 'btn', id: 'tr', label: 'THROW \u25B6', key: 'KeyX', hold: false, size: 78, pos: { r: 20, b: 22 } },
    { t: 'btn', id: 'hop', label: 'HOP', key: 'Space', hold: true, size: 70, pos: { r: 96, b: 110 } },
    { t: 'btn', id: 'auto', label: 'AUTO', key: 'KeyC', hold: false, size: 56, pos: { r: 20, b: 118 } },
  ],
};
