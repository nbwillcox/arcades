/* Touch controls for FSpaceZero: the ship accelerates by itself, a floating stick steers (hold left / right), BRAKE (pauses the auto-accelerate), BOOST, side-slides, pause. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'fspacezero', title: 'FSpaceZero', orient: 'landscape', accent: '#ff4ad8',
  hint: '<b>Left thumb</b>: hold the floating stick left or right to steer &nbsp; the ship <b>accelerates</b> by itself &nbsp; <b>BRAKE</b>, <b>BOOST</b> and the slide buttons are on the right',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  autoKeys: ['ArrowUp'],
  controls: [
    { t: 'stick', id: 'steer', zone: [0, 0.18, 0.5, 1], mode: 'h', keys: { l: 'ArrowLeft', r: 'ArrowRight' }, r: 56, dead: 0.2 },
    { t: 'btn', id: 'boost', label: 'BOOST', key: 'Space', hold: true, size: 84, pos: { r: 18, b: 26 } },
    { t: 'btn', id: 'brake', label: 'BRAKE', key: 'ArrowDown', hold: true, suspendAuto: true, size: 62, pos: { r: 120, b: 24 } },
    { t: 'btn', id: 'sl', label: '<<', key: 'KeyQ', hold: true, size: 48, pos: { r: 124, b: 96 } },
    { t: 'btn', id: 'sr', label: '>>', key: 'KeyE', hold: true, size: 48, pos: { r: 66, b: 112 } },
  ],
};
