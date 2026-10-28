/* Keyboard, mouse, wheel, gamepad and (through js/mobile.js) touch swipes. Steering is by lane: arrows step the claw one lane at a time, the mouse picks the lane under the pointer, and a swipe on a phone
   steps lanes as your thumb slides. */
(function (G) {
  'use strict';
  const S = G.settings;
  const I = { left: false, right: false, fire: false, pend: 0, zap: false, px: 0, py: 0, mouseActive: false, _pause: false, _any: false, pad: false };
  const MAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'fire', ArrowUp: 'fire', KeyW: 'fire', KeyX: 'zap', KeyZ: 'zap', ShiftLeft: 'zap', ShiftRight: 'zap', ArrowDown: 'zap', KeyS: 'zap' };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const a = MAP[e.code];
    if (a === 'left' || a === 'right') { I[a] = true; if (!e.repeat) I.pend = Math.max(-2, Math.min(2, I.pend + (a === 'left' ? -1 : 1))); I.mouseActive = false; }
    else if (a === 'fire') I.fire = true;
    else if (a === 'zap') { if (!e.repeat) I.zap = true; }
    else if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) I._pause = true;
    if (a && e.target.tagName !== 'BUTTON') e.preventDefault();
    if (!e.repeat) I._any = true;
  });
  window.addEventListener('keyup', (e) => {
    const a = MAP[e.code];
    if (a === 'left' || a === 'right') I[a] = false;
    else if (a === 'fire') I.fire = false;
  });
  window.addEventListener('blur', () => { I.left = I.right = I.fire = false; });

  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) I.fire = true; else if (e.button === 2) I.zap = true;
      I._any = true; e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { I.pend = Math.max(-2, Math.min(2, I.pend + (e.deltaY > 0 ? 1 : -1))); I.mouseActive = false; e.preventDefault(); }, { passive: false });
  };
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; });
  window.addEventListener('mousemove', (e) => {
    const v = G.view;
    if (!v) return;
    I.px = (e.clientX - v.ox) / v.s; I.py = (e.clientY - v.oy) / v.s;
    if (S.mouseSteer !== false && (e.movementX || e.movementY)) I.mouseActive = true;
  });

  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeZap = () => { const b = I.zap; I.zap = false; return b; };
  I.takePend = () => { const p = I.pend; I.pend = 0; return p; };
  I.clear = () => { I.left = I.right = I.fire = false; I.pend = 0; I.zap = false; I._pause = false; I._any = false; };
  I.resync = () => { I._pause = false; };

  let padPrevX = 0, padStart = false, padZap = false, padFire = false;
  I.poll = function () {
    const pads = window.PAD ? [] : (navigator.getGamepads ? navigator.getGamepads() : []);
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = p.buttons, ax = p.axes;
      let x = 0;
      if (b[14] && b[14].pressed) x = -1; else if (b[15] && b[15].pressed) x = 1; else if (ax.length && Math.abs(ax[0]) > 0.5) x = ax[0] < 0 ? -1 : 1;
      if (x && x !== padPrevX) I.pend = Math.max(-2, Math.min(2, I.pend + x));
      if (x || padPrevX) { I.left = x < 0; I.right = x > 0; }
      padPrevX = x;
      const f = !!((b[0] && b[0].pressed) || (b[7] && b[7].value > 0.3));
      if (f !== padFire) I.fire = f;
      padFire = f;
      const z = !!((b[1] && b[1].pressed) || (b[2] && b[2].pressed) || (b[5] && b[5].pressed));
      if (z && !padZap) I.zap = true;
      padZap = z;
      const st = !!(b[9] && b[9].pressed);
      if (st && !padStart) I._pause = true;
      padStart = st;
      if (b[0] && b[0].pressed) I._any = true;
      I.pad = true;
      break;
    }
  };

  G.input = I;
})((window.SGS = window.SGS || {}));
