/* Touch controls for SpaceCommand: touch to aim (the cursor floats above the finger) and hold to fire, weapon buttons 1-4, NUKE, pause. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacecommand', title: 'SpaceCommand', orient: 'landscape', accent: '#ff9a3d',
  hint: '<b>Touch</b> to aim, hold to fire &nbsp; <b>1-4</b> buttons: weapon &nbsp; <b>NUKE</b> button: detonate',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  controls: [
    { t: 'drag', id: 'aim', zone: [0, 0, 1, 1], mirror: false, dy: -44 },
    { t: 'btn', id: 'w1', label: '1', key: 'Digit1', hold: false, size: 46, cls: 'tk-sq', pos: { l: 12, t: 70 } },        /* the side bars of a wide phone hold the buttons, clear of the cities */
    { t: 'btn', id: 'w2', label: '2', key: 'Digit2', hold: false, size: 46, cls: 'tk-sq', pos: { l: 12, t: 124 } },
    { t: 'btn', id: 'w3', label: '3', key: 'Digit3', hold: false, size: 46, cls: 'tk-sq', pos: { l: 12, t: 178 } },
    { t: 'btn', id: 'w4', label: '4', key: 'Digit4', hold: false, size: 46, cls: 'tk-sq', pos: { l: 12, t: 232 } },
    { t: 'btn', id: 'nuke', label: 'NUKE', key: 'Space', hold: false, size: 62, pos: { r: 10, b: 110 } },
  ],
};
