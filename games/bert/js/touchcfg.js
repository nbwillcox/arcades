/* Touch controls for SpaceBert: four diagonal hop buttons (a tap on the screen around the hero works too). Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacebert', title: 'SpaceBert', orient: 'portrait', accent: '#ff9a3d',
  hint: '<b>Tap</b> the four diagonal buttons to hop (or tap the screen on a side of the hero)',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, t: 10 } },
  controls: [
    { t: 'btn', id: 'ul', label: '\u2196', key: 'KeyQ', hold: false, size: 88, pos: { r: 112, b: 128 } },
    { t: 'btn', id: 'ur', label: '\u2197', key: 'KeyE', hold: false, size: 88, pos: { r: 16, b: 128 } },
    { t: 'btn', id: 'dl', label: '\u2199', key: 'KeyZ', hold: false, size: 88, pos: { r: 112, b: 30 } },
    { t: 'btn', id: 'dr', label: '\u2198', key: 'KeyC', hold: false, size: 88, pos: { r: 16, b: 30 } },
  ],
};
