/* Touch controls for SpaceTube: slide a thumb left or right anywhere to step the claw around the rim (one lane per short slide). The cannon auto-fires while you play; tap ZAP for the screen-clearing zapper. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacetube', title: 'SpaceTube', orient: 'portrait', accent: '#5ad0ff',
  hint: '<b>Slide a thumb</b> left or right anywhere to step around the rim; the cannon fires by itself. Tap <b>ZAP</b> for the zapper',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  autoKeys: ['Space'],
  pause: { pos: { r: 12, b: 70 } },
  controls: [
    { t: 'swipe', id: 'slide', zone: [0, 0, 1, 1], keys: { l: 'ArrowLeft', r: 'ArrowRight' }, min: 20 },
    { t: 'btn', id: 'zap', label: 'ZAP', key: 'KeyX', hold: false, size: 66, pos: { l: 14, b: 62 } },
  ],
};
