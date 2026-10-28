/* Touch controls for SpaceBricks: drag anywhere to slide the paddle, a short tap launches the ball, FIRE (hold) for the laser, pause. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacebricks', title: 'SpaceBricks', orient: 'landscape', accent: '#37e6a0',
  hint: '<b>Drag</b> to slide the paddle &nbsp; <b>tap</b> to launch the ball &nbsp; hold <b>FIRE</b> for the laser',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  controls: [
    { t: 'drag', id: 'paddle', zone: [0, 0, 1, 1], mirror: false, fire: false, tapFire: true },
    { t: 'btn', id: 'fire', label: 'FIRE', key: 'Space', hold: true, size: 84, pos: { r: 18, b: 90 } },
  ],
};
