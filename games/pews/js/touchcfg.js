/* Touch controls for SpaceSidePews: a floating stick (flies the ship), FIRE (hold), REV, POWER, BOMB, HYPER, pause. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spacesidepews', title: 'SpaceSidePews', orient: 'landscape', accent: '#ff5a6a',
  hint: '<b>Left thumb</b>: floating stick to fly &nbsp; <b>Right thumb</b>: hold <b>FIRE</b>, <b>REV</b> reverses, <b>POWER</b> cashes in the meter, <b>BOMB</b>, <b>HYPER</b>',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  controls: [
    { t: 'stick', id: 'fly', zone: [0, 0.15, 0.5, 1], mode: '8', keys: { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' }, r: 56 },
    { t: 'btn', id: 'fire', label: 'FIRE', key: 'Space', hold: true, size: 84, pos: { r: 18, b: 20 } },
    { t: 'btn', id: 'rev', label: 'REV', key: 'ShiftLeft', hold: false, size: 52, pos: { r: 116, b: 22 } },
    { t: 'btn', id: 'pow', label: 'POWER', key: 'KeyE', hold: false, size: 54, pos: { r: 124, b: 80 } },
    { t: 'btn', id: 'bomb', label: 'BOMB', key: 'KeyB', hold: false, size: 52, pos: { r: 70, b: 112 } },
    { t: 'btn', id: 'hyper', label: 'HYPER', key: 'KeyH', hold: false, size: 50, pos: { r: 14, b: 118 } },
  ],
};
