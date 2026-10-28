/* Touch controls for SpaceBobble: a floating stick (run; down + JUMP drops through a platform), JUMP and BLOW on the right, pause. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacebobble', title: 'SpaceBobble', orient: 'landscape', accent: '#4ad8ff',
  hint: '<b>Left thumb</b>: floating stick to run &nbsp; <b>Right thumb</b>: <b>JUMP</b> and <b>BLOW</b> &nbsp; down + jump drops through a platform',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 10, t: 42 } },                                                /* just under the HUD bar */
  controls: [
    { t: 'stick', id: 'run', zone: [0, 0.18, 0.5, 1], mode: '8', keys: { l: 'ArrowLeft', r: 'ArrowRight', d: 'ArrowDown' }, r: 56 },
    { t: 'btn', id: 'blow', label: 'BLOW', key: 'KeyX', hold: true, size: 84, pos: { r: 18, b: 26 } },
    { t: 'btn', id: 'jump', label: 'JUMP', key: 'Space', hold: true, size: 84, pos: { r: 120, b: 66 } },
  ],
};
