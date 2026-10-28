/* Touch controls for SpaceRoboShooter: twin floating sticks (left = WASD move, right = arrow keys, which aim and fire 8-way), BOMB, pause. Upgrade cards are plain canvas taps, so the controls step aside there. Read by js/mobile.js. */
window.TOUCH_CFG = {
  id: 'spaceroboshooter', title: 'SpaceRoboShooter', orient: 'landscape', accent: '#ff3dd0',
  hint: '<b>Left thumb</b>: move &nbsp; <b>Right thumb</b>: aim and fire &nbsp; <b>BOMB</b> button: smart bomb &nbsp; tap an upgrade card to pick it',
  unlock: () => window.SGS && window.SGS.audio && window.SGS.audio.resume(),
  hide: () => !!(window.SGS && window.SGS.game && window.SGS.game.state === 'pick'),
  controls: [
    { t: 'stick', id: 'move', zone: [0, 0.12, 0.5, 1], mode: '8', keys: { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' }, r: 56 },
    { t: 'stick', id: 'aim', zone: [0.5, 0.12, 1, 1], mode: '8', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, r: 56, dead: 0.25 },
    { t: 'btn', id: 'bomb', label: 'BOMB', key: 'KeyB', hold: false, size: 62, pos: { l: 16, b: 168 } },
  ],
};
