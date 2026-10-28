/* Hop controls. Desktop: arrow keys / WASD. Touch: swipe in a direction to hop that way, tap anywhere to hop forward. Space / E or the on-screen button uses the stored power-up. */
(function (G) {
  'use strict';
  const S = G.settings;
  const I = { _hops: [], _pow: false, _pause: false, _any: false, buttons: {} };
  const KEYS = { ArrowUp: [0, 1], KeyW: [0, 1], ArrowDown: [0, -1], KeyS: [0, -1], ArrowLeft: [-1, 0], KeyA: [-1, 0], ArrowRight: [1, 0], KeyD: [1, 0] };
  const GAME_KEYS = new Set([...Object.keys(KEYS), 'Space', 'KeyE', 'Enter']);

  I.takeHop = () => I._hops.shift() || null;                 // [dx, dr] with dr>0 = forward
  I.takePow = () => { const b = I._pow; I._pow = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { I._hops.length = 0; I._pow = I._pause = I._any = false; };
  I.queue = (dx, dr) => { if (I._hops.length < 2) I._hops.push([dx, dr]); I._any = true; };

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    if (KEYS[c] && !e.repeat) I.queue(KEYS[c][0], KEYS[c][1]);
    else if ((c === 'Space' || c === 'KeyE' || c === 'Enter') && !e.repeat) { I._pow = true; I._any = true; }
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('blur', () => I.clear());

  /* ---- pointer gestures (mouse, touch and pen all arrive as pointer events) ---- */
  const toLogical = (e) => { const v = G.view; return v ? { x: (e.clientX - v.ox) / v.s, y: (e.clientY - v.oy) / v.s } : { x: 0, y: 0 }; };
  const hit = (b, p) => b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
  const gest = new Map();
  I.bind = function (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      I._any = true;
      const p = toLogical(e), id = e.pointerId;
      try { canvas.setPointerCapture(id); } catch (err) { /* ignore */ }
      if (hit(I.buttons.pow, p)) { I._pow = true; gest.set(id, { btn: true }); return; }
      if (hit(I.buttons.pause, p)) { I._pause = true; gest.set(id, { btn: true }); return; }
      gest.set(id, { x: e.clientX, y: e.clientY, done: false });
    });
    canvas.addEventListener('pointermove', (e) => {
      const g = gest.get(e.pointerId);
      if (!g || g.btn || g.done) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y, th = S.swipe || 26;
      if (Math.abs(dx) >= th || Math.abs(dy) >= th) {
        g.done = true;
        if (Math.abs(dx) > Math.abs(dy)) I.queue(dx > 0 ? 1 : -1, 0); else I.queue(0, dy < 0 ? 1 : -1);
      }
    });
    canvas.addEventListener('pointerup', (e) => {
      const g = gest.get(e.pointerId);
      gest.delete(e.pointerId);
      if (g && !g.btn && !g.done) I.queue(0, 1);                // a tap hops forward
    });
    canvas.addEventListener('pointercancel', (e) => gest.delete(e.pointerId));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  G.input = I;
})((window.SGS = window.SGS || {}));
