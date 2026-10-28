/* Touch controls for SpacePac: swipe anywhere on the screen to steer. The hero keeps going until you swipe again, so one thumb is all you need. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacepac', title: 'SpacePac', orient: 'portrait', accent: '#b9f322',
  hint: '<b>Swipe</b> anywhere to steer: the hero keeps going until you swipe a new way, and takes the next turn you asked for',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, b: 70 } },
  controls: [
    { t: 'swipe', id: 'swipe', zone: [0, 0, 1, 1], keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, min: 22 },
  ],
};
