/* Controller map for SpaceBert: the four hops sit on the diamond of face buttons, or push the stick diagonally. Read by js/pad.js. */
(function () {
  const DEF = { UL: 'KeyQ', UR: 'KeyE', DL: 'KeyZ', DR: 'KeyC' };
  const K = (d) => () => { const s = window.SGS && window.SGS.settings; return (s && s.keys && s.keys[d]) || DEF[d]; };      /* follows the player's own keyboard bindings */
  let armed = true;
  window.PAD_CFG = {
    id: 'spacebert', title: 'SpaceBert',
    hint: '<b>Stick</b> push diagonally to hop &nbsp; <b>X</b> up-left &nbsp; <b>Y</b> up-right &nbsp; <b>A</b> down-left &nbsp; <b>B</b> down-right &nbsp; <b>Start</b> pause',
    move: {
      stick: 'left', mode: '8', noDpad: true,
      fn: (x, y) => {
        if (Math.hypot(x, y) < 0.45) { armed = true; return; }
        if (!armed || Math.abs(x) < 0.3 || Math.abs(y) < 0.3) return;                          /* wait for a clear diagonal */
        armed = false;
        window.PAD.tap(K((y < 0 ? 'U' : 'D') + (x < 0 ? 'L' : 'R'))());
      },
    },
    actions: [
      { id: 'UL', label: 'Hop up-left', btn: ['X', 'LB', 'LEFT'], key: K('UL') },
      { id: 'UR', label: 'Hop up-right', btn: ['Y', 'RB', 'UP'], key: K('UR') },
      { id: 'DL', label: 'Hop down-left', btn: ['A', 'LT', 'DOWN'], key: K('DL') },
      { id: 'DR', label: 'Hop down-right', btn: ['B', 'RT', 'RIGHT'], key: K('DR') },
    ],
  };
})();
