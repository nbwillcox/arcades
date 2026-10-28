/* Keyboard (arrows move, Down soft-drops, Up / Space hard-drop, A / D rotate left / right, S / Shift / C hold), gamepad and on-screen touch buttons. */
(function (G) {
  'use strict';
  const S = G.settings;
  const I = { held: { left: false, right: false, down: false }, q: {}, k: {}, touchBtns: [], ptr: new Map(), lastDevice: null, _prevPad: {} };
  G.input = I;
  const HELD = { ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down' };
  const EVT = { ArrowUp: 'hard', Space: 'hard', KeyA: 'rotL', KeyD: 'rotR', KeyZ: 'rotL', KeyX: 'rotR', KeyS: 'hold', ShiftLeft: 'hold', ShiftRight: 'hold', KeyC: 'hold', KeyW: 'hold', KeyP: 'pause', Escape: 'pause', KeyR: 'restart' };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const h = HELD[e.code], ev = EVT[e.code];
    if (h) { I.k[h] = true; I.lastDevice = 'kbd'; }
    if (ev && !e.repeat) { I.q[ev] = true; I.lastDevice = 'kbd'; }
    if ((h || ev) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const h = HELD[e.code]; if (h) I.k[h] = false; });
  window.addEventListener('blur', () => { I.k = {}; I.ptr.clear(); });
  I.take = (n) => { const v = !!I.q[n]; I.q[n] = false; return v; };
  I.clear = () => { I.k = {}; I.q = {}; I.ptr.clear(); I.held.left = I.held.right = I.held.down = false; };
  /* touch: buttons are { id, x, y, w, h } in CSS pixels, set by the renderer each layout */
  const hit = (x, y) => { for (const b of I.touchBtns) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b; return null; };
  window.addEventListener('pointerdown', (e) => {
    if (!e.target || e.target.id !== 'game' || e.pointerType === 'mouse') return;
    I.lastDevice = 'touch'; const b = hit(e.clientX, e.clientY); if (!b) return;
    I.ptr.set(e.pointerId, b.id); if (b.id === 'left' || b.id === 'right' || b.id === 'down') I.k['t' + b.id] = true; else I.q[b.id] = true;
    e.preventDefault();
  });
  const up = (e) => { const id = I.ptr.get(e.pointerId); if (id) { I.ptr.delete(e.pointerId); if (id === 'left' || id === 'right' || id === 'down') I.k['t' + id] = false; } };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  I.poll = function () {
    let l = !!I.k.left || !!I.k.tleft, r = !!I.k.right || !!I.k.tright, d = !!I.k.down || !!I.k.tdown;
    if (S.gamepad && navigator.getGamepads) {
      for (const g of navigator.getGamepads()) {
        if (!g || !g.connected) continue;
        const bt = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        l = l || bt(14) || ax < -0.5; r = r || bt(15) || ax > 0.5; d = d || bt(13) || ay > 0.6;
        const now = { hard: bt(12) || bt(7), rotR: bt(0) || bt(5), rotL: bt(2) || bt(1) || bt(4), hold: bt(3) || bt(6), pause: bt(9) };
        for (const k in now) { if (now[k] && !I._prevPad[k]) I.q[k] = true; }
        if (Object.values(now).some(Boolean) || l || r || d) I.lastDevice = 'pad';
        I._prevPad = now; break;
      }
    }
    I.held.left = l; I.held.right = r; I.held.down = d;
  };
})((window.SGS = window.SGS || {}));
