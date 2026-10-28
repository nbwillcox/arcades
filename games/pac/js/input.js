/* Keyboard, gamepad and (through js/mobile.js) touch swipes. The hero keeps going until you steer: the last direction you asked for is remembered and taken at the next turn. */
(function (G) {
  'use strict';
  const I = { want: 0, _pause: false, _any: false, pad: false };
  const KEYS = { ArrowUp: 1, KeyW: 1, ArrowLeft: 2, KeyA: 2, ArrowDown: 3, KeyS: 3, ArrowRight: 4, KeyD: 4 };
  const held = [];

  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const d = KEYS[e.code];
    if (d) {
      const i = held.indexOf(d); if (i >= 0) held.splice(i, 1);
      held.push(d); I.want = d;
      if (e.target.tagName !== 'BUTTON') e.preventDefault();
    } else if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
  });
  window.addEventListener('keyup', (e) => {
    const d = KEYS[e.code];
    if (!d) return;
    const i = held.indexOf(d); if (i >= 0) held.splice(i, 1);
    if (held.length) I.want = held[held.length - 1];                              /* let go of one of two held keys: carry on with the other */
  });

  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { held.length = 0; I.want = 0; I._pause = false; I._any = false; };
  I.resync = () => { I._pause = false; };

  let padPrev = 0, padStart = false;
  I.poll = function () {
    const pads = window.PAD ? [] : (navigator.getGamepads ? navigator.getGamepads() : []);
    for (const p of pads) {
      if (!p || !p.connected) continue;
      let d = 0;
      const b = p.buttons, ax = p.axes;
      if (b[12] && b[12].pressed) d = 1; else if (b[13] && b[13].pressed) d = 3; else if (b[14] && b[14].pressed) d = 2; else if (b[15] && b[15].pressed) d = 4;
      else if (ax.length >= 2 && Math.hypot(ax[0], ax[1]) > 0.5) d = Math.abs(ax[0]) > Math.abs(ax[1]) ? (ax[0] < 0 ? 2 : 4) : (ax[1] < 0 ? 1 : 3);
      if (d && d !== padPrev) { I.want = d; I._any = true; }
      padPrev = d;
      const st = !!(b[9] && b[9].pressed);
      if (st && !padStart) I._pause = true;
      padStart = st;
      I.pad = true;
      break;
    }
  };

  window.addEventListener('blur', () => { held.length = 0; });
  G.input = I;
})((window.SGS = window.SGS || {}));
