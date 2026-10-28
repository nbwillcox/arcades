/* Controller map for SpaceDug. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacedug', title: 'SpaceDug',
  hint: '<b>Stick / D-pad</b> dig and move &nbsp; hold <b>A / RT</b> to pump the hose &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '4' },
  actions: [
    { id: 'pump', label: 'Pump hose', btn: ['A', 'RT', 'X', 'RB'], key: 'Space' },
  ],
};
