/* Keyboard, gamepad and (through js/mobile.js) a touch stick. You move while a direction is held. Holding SLOW (Shift / Space) when you leave the border starts a slow, double-scoring line. */
(function (G) {
  'use strict';
  const I = { dir: 0, slow: false, _pause: false, _any: false, pad: false };
  const KEYS = { ArrowUp: 1, KeyW: 1, ArrowLeft: 2, KeyA: 2, ArrowDown: 3, KeyS: 3, ArrowRight: 4, KeyD: 4 };
  const SLOW = { ShiftLeft: 1, ShiftRight: 1, Space: 1, KeyX: 1, KeyZ: 1 };
  const held = [];
  let padDir = 0;
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };

  function refresh() { I.dir = held.length ? held[held.length - 1] : padDir; }

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const d = KEYS[e.code];
    if (d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); held.push(d); refresh(); if (e.target.tagName !== 'BUTTON') e.preventDefault(); }
    else if (SLOW[e.code]) { I.slow = true; if (e.target.tagName !== 'BUTTON') e.preventDefault(); }
    else if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
  });
  window.addEventListener('keyup', (e) => {
    const d = KEYS[e.code];
    if (d) { const i = held.indexOf(d); if (i >= 0) held.splice(i, 1); refresh(); }
    else if (SLOW[e.code]) I.slow = false;
  });
  window.addEventListener('blur', () => { held.length = 0; I.slow = false; refresh(); });

  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.clear = () => { held.length = 0; padDir = 0; I.dir = 0; I.slow = false; I._pause = false; I._any = false; };
  I.resync = () => { I._pause = false; };
  I.bind = function () {};

  let padStart = false;
  I.poll = function () {
    const pads = window.PAD ? [] : (navigator.getGamepads ? navigator.getGamepads() : []);
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = p.buttons, ax = p.axes;
      let d = 0;
      if (b[12] && b[12].pressed) d = 1; else if (b[13] && b[13].pressed) d = 3; else if (b[14] && b[14].pressed) d = 2; else if (b[15] && b[15].pressed) d = 4;
      else if (ax.length >= 2 && Math.hypot(ax[0], ax[1]) > 0.5) d = Math.abs(ax[0]) > Math.abs(ax[1]) ? (ax[0] < 0 ? 2 : 4) : (ax[1] < 0 ? 1 : 3);
      if (d !== padDir) { padDir = d; refresh(); if (d) I._any = true; }
      const slow = !!((b[0] && b[0].pressed) || (b[1] && b[1].pressed) || (b[6] && b[6].value > 0.3) || (b[7] && b[7].value > 0.3));
      if (slow) I.slow = true; else if (I.padSlow) I.slow = false;
      I.padSlow = slow;
      const st = !!(b[9] && b[9].pressed);
      if (st && !padStart) I._pause = true;
      padStart = st;
      I.pad = true;
      break;
    }
  };

  G.input = I;
})((window.SGS = window.SGS || {}));
