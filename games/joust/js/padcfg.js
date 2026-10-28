/* Controller map for SpaceJoust: steer left / right, tap flap to climb. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacejoust', title: 'SpaceJoust',
  hint: '<b>Stick / D-pad</b> steer &nbsp; tap <b>A / X / RT</b> again and again to flap &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight' }, mode: 'h' },
  actions: [
    { id: 'flap', label: 'Flap', btn: ['A', 'X', 'RT', 'RB'], key: 'Space' },
  ],
};
