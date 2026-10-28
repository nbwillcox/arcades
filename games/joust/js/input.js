/* Keyboard, mouse, gamepad and (through js/mobile.js) a touch stick and FLAP button. Tap flap again and again to climb; left and right steer. */
(function (G) {
  'use strict';
  const I = { dir: 0, left: false, right: false, flap: 0, _pause: false, _any: false, pad: false };
  const FLAP = { Space: 1, ArrowUp: 1, KeyW: 1, KeyZ: 1, KeyX: 1 };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  const refresh = () => { I.dir = (I.right ? 1 : 0) - (I.left ? 1 : 0); };

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { I.left = true; refresh(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { I.right = true; refresh(); }
    else if (FLAP[e.code]) { if (!e.repeat) I.flap = Math.min(3, I.flap + 1); }
    else if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) I._pause = true;
    else return;
    if (e.target.tagName !== 'BUTTON') e.preventDefault();
    if (!e.repeat) I._any = true;
  });
  window.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { I.left = false; refresh(); }
    else if (e.code === 'ArrowRight' || e.code === 'KeyD') { I.right = false; refresh(); }
  });
  window.addEventListener('blur', () => { I.left = I.right = false; refresh(); });

  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) I.flap = Math.min(3, I.flap + 1); I._any = true; e.preventDefault(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  I.takeFlap = () => { const f = I.flap; I.flap = 0; return f; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.clear = () => { I.left = I.right = false; I.dir = 0; I.flap = 0; I._pause = false; I._any = false; };
  I.resync = () => { I._pause = false; };

  let padA = false, padStart = false, padX = 0;
  I.poll = function () {
    const pads = window.PAD ? [] : (navigator.getGamepads ? navigator.getGamepads() : []);
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = p.buttons, ax = p.axes;
      let x = 0;
      if (b[14] && b[14].pressed) x = -1; else if (b[15] && b[15].pressed) x = 1; else if (ax.length && Math.abs(ax[0]) > 0.4) x = ax[0] < 0 ? -1 : 1;
      if (x !== padX) { if (x < 0) I.left = true; else if (padX < 0) I.left = false; if (x > 0) I.right = true; else if (padX > 0) I.right = false; padX = x; refresh(); }
      const a = !!((b[0] && b[0].pressed) || (b[2] && b[2].pressed) || (b[7] && b[7].pressed));
      if (a && !padA) { I.flap = Math.min(3, I.flap + 1); I._any = true; }
      padA = a;
      const st = !!(b[9] && b[9].pressed);
      if (st && !padStart) I._pause = true;
      padStart = st;
      I.pad = true;
      break;
    }
  };

  G.input = I;
})((window.SGS = window.SGS || {}));
