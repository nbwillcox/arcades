/* Touch layer for SpaceMarble: the marble is steered by tilting the device (js/input.js reads the orientation sensor) or, without a sensor, by a floating thumb stick. Only the pause button comes from js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacemarble', title: 'SpaceMarble', orient: 'any', accent: '#37e6ff', bias: false,
  hint: '<b>Tilt</b> your device to roll the marble &nbsp; no tilt sensor? <b>drag a thumb</b> on the screen &nbsp; <b>Tap RECENTER</b> if the neutral angle drifts',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, b: 14 } },
  controls: [],
};
