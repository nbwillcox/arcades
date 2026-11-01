/* Controller map for SpacePaper: stick / D-pad steers (up = faster, down = brake), LB / RB throw left / right, A hops, Y auto-throws. Read by js/pad.js. */
window.PAD_CFG = {
  id: 'spacepaper', title: 'SpacePaper',
  hint: '<b>Stick / D-pad</b> steer, up = faster, down = brake &nbsp; <b>LB / X</b> throw left &nbsp; <b>RB / B</b> throw right &nbsp; <b>A</b> hop &nbsp; <b>Y</b> auto-throw &nbsp; <b>Start</b> pause',
  move: { keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, mode: '8' },
  actions: [
    { id: 'tl', label: 'Throw left', btn: ['LB', 'X', 'LT'], key: 'KeyZ' },
    { id: 'tr', label: 'Throw right', btn: ['RB', 'B', 'RT'], key: 'KeyX' },
    { id: 'hop', label: 'Hop', btn: ['A'], key: 'Space' },
    { id: 'auto', label: 'Auto-throw', btn: ['Y'], key: 'KeyC' },
  ],
};
