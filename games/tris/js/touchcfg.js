/* SpaceTris draws and handles its own touch buttons on the canvas, so the shared layer only adds the install / fullscreen shell and a pause button. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacetris', title: 'SpaceTris', orient: 'portrait', accent: '#7ad0ff', bias: false, settings: false,
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume && window.SGS.audio.resume(),
  pause: { pos: { r: 10, t: 10 } },
  controls: [],
};
