/* Controller map for SpaceCommand: both sticks move the cursor, A / RT fires, the D-pad picks a weapon. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacecommand', title: 'SpaceCommand',
  hint: '<b>Sticks</b> aim &nbsp; <b>A / RT</b> fire &nbsp; <b>X</b> nuke &nbsp; <b>D-pad</b> or <b>LB / RB</b> pick a weapon &nbsp; <b>Start</b> pause',
  cursor: { sticks: ['left', 'right'], speed: 820 },
  actions: [
    { id: 'fire', label: 'Fire', btn: ['A', 'RT'], mouse: 0 },
    { id: 'nuke', label: 'Nuke', btn: ['X', 'Y'], key: 'Space' },
    { id: 'w1', label: 'Weapon 1', btn: ['UP'], key: 'Digit1' },
    { id: 'w2', label: 'Weapon 2', btn: ['RIGHT'], key: 'Digit2' },
    { id: 'w3', label: 'Weapon 3', btn: ['DOWN'], key: 'Digit3' },
    { id: 'w4', label: 'Weapon 4', btn: ['LEFT'], key: 'Digit4' },
    { id: 'wprev', label: 'Previous weapon', btn: ['LB'], key: 'KeyQ' },
    { id: 'wnext', label: 'Next weapon', btn: ['RB'], key: 'KeyE' },
  ],
};
