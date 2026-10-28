/* Controller map for SpaceRoboShooter: twin sticks (left moves, right fires 8-way). Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spaceroboshooter', title: 'SpaceRoboShooter', pause: 'KeyP',
  hint: '<b>Left stick</b> move &nbsp; <b>Right stick</b> aim and fire &nbsp; <b>RB / LB</b> smart bomb &nbsp; <b>X / Y / B</b> pick an upgrade card &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'KeyA', r: 'KeyD', u: 'KeyW', d: 'KeyS' }, mode: '8' },
  aim: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '8', stick: 'right' },
  actions: [
    { id: 'fire', label: 'Fire (forward)', btn: ['RT'], key: 'Space' },
    { id: 'bomb', label: 'Smart bomb', btn: ['RB', 'LB', 'LT'], key: 'KeyB' },
    { id: 'pick1', label: 'Card 1', btn: ['X'], key: 'Digit1' },
    { id: 'pick2', label: 'Card 2', btn: ['Y'], key: 'Digit2' },
    { id: 'pick3', label: 'Card 3', btn: ['B'], key: 'Digit3' },
  ],
};
