/* Touch controls for StickBrawl: a floating stick on the left walks (and walks up and down the street's depth); PUNCH, KICK and JUMP on the right. Read by js/mobile.js.
   The buttons send fixed Touch* key codes (see input.js), so keyboard rebinding never affects them. */
window.TOUCH_CFG = {
  id: 'stickbrawl', title: 'StickBrawl', orient: 'landscape', accent: '#2f62e8',
  hint: '<b>Left thumb</b>: floating stick to walk &nbsp; <b>Right thumb</b>: <b>PUNCH</b>, <b>KICK</b>, <b>JUMP</b> (jump, then punch = spin kick, kick = jump kick) &nbsp; walk into a stunned enemy to grab him',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  pause: { pos: { r: 12, t: 44 }, key: 'TouchPause' },
  controls: [
    { t: 'stick', id: 'move', zone: [0, 0.25, 0.5, 1], mode: '8', keys: { l: 'TouchLeft', r: 'TouchRight', u: 'TouchUp', d: 'TouchDown' }, r: 56, dead: 0.25, deadY: 0.3 },
    { t: 'btn', id: 'punch', label: 'PUNCH', key: 'TouchPunch', hold: true, size: 84, pos: { r: 112, b: 20 } },
    { t: 'btn', id: 'kick', label: 'KICK', key: 'TouchKick', hold: true, size: 78, pos: { r: 18, b: 24 } },
    { t: 'btn', id: 'jump', label: 'JUMP', key: 'TouchJump', hold: true, size: 72, pos: { r: 66, b: 118 } },
  ],
};
