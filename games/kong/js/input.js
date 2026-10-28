/* Keyboard, gamepad and (through js/mobile.js) a touch stick and JUMP button. Arrows / WASD walk and climb; Space, Z or X jump. */
(function (G) {
  'use strict';
  const I = { dx: 0, dy: 0, jump: 0, left: false, right: false, up: false, down: false, _pause: false, _any: false, pad: false };
  const JUMP = { Space: 1, KeyZ: 1, KeyX: 1, KeyK: 1 };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  const refresh = () => { I.dx = (I.right ? 1 : 0) - (I.left ? 1 : 0); I.dy = (I.down ? 1 : 0) - (I.up ? 1 : 0); };
  const MAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const m = MAP[e.code];
    if (m) { I[m] = true; refresh(); }
    else if (JUMP[e.code]) { if (!e.repeat) I.jump = 1; }
    else if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) I._pause = true;
    else return;
    if (e.target.tagName !== 'BUTTON') e.preventDefault();
    if (!e.repeat) I._any = true;
  });
  window.addEventListener('keyup', (e) => { const m = MAP[e.code]; if (m) { I[m] = false; refresh(); } });
  window.addEventListener('blur', () => { I.left = I.right = I.up = I.down = false; refresh(); });

  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) I.jump = 1; I._any = true; e.preventDefault(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  I.takeJump = () => { const j = I.jump; I.jump = 0; return j; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.clear = () => { I.left = I.right = I.up = I.down = false; I.dx = I.dy = 0; I.jump = 0; I._pause = false; I._any = false; };
  I.resync = () => { I._pause = false; };

  let padA = false, padStart = false, pdx = 0, pdy = 0;
  I.poll = function () {
    const pads = window.PAD ? [] : (navigator.getGamepads ? navigator.getGamepads() : []);
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = p.buttons, ax = p.axes;
      let x = 0, y = 0;
      if (b[14] && b[14].pressed) x = -1; else if (b[15] && b[15].pressed) x = 1; else if (ax.length && Math.abs(ax[0]) > 0.4) x = ax[0] < 0 ? -1 : 1;
      if (b[12] && b[12].pressed) y = -1; else if (b[13] && b[13].pressed) y = 1; else if (ax.length > 1 && Math.abs(ax[1]) > 0.5) y = ax[1] < 0 ? -1 : 1;
      if (x !== pdx || y !== pdy) { I.left = x < 0; I.right = x > 0; I.up = y < 0; I.down = y > 0; pdx = x; pdy = y; refresh(); }
      const a = !!((b[0] && b[0].pressed) || (b[1] && b[1].pressed) || (b[2] && b[2].pressed));
      if (a && !padA) { I.jump = 1; I._any = true; }
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
