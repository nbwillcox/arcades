/* Keyboard + gamepad. Arrows/WASD steer, Up/W/Z accelerate, Down/S brake, X/Space boost, Q / E side-slide, P/Esc pause. */
(function (G) {
  'use strict';
  const S = G.settings;
  const I = { steer: 0, accel: 0, brake: 0, boost: 0, slideL: 0, slideR: 0, _pause: false, _any: false, _enter: false, k: {}, pad: null };
  const MAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'a', KeyW: 'a', KeyZ: 'a', ArrowDown: 'b', KeyS: 'b', KeyX: 'x', Space: 'x', KeyQ: 'sl', KeyE: 'sr' };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const m = MAP[e.code];
    if (m) I.k[m] = true;
    if (!e.repeat) { if (e.code === 'KeyP' || e.code === 'Escape') I._pause = true; if (e.code === 'Enter') I._enter = true; I._any = true; }
    if ((m || e.code === 'KeyP') && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const m = MAP[e.code]; if (m) I.k[m] = false; });
  window.addEventListener('blur', () => { I.k = {}; });
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeEnter = () => { const b = I._enter; I._enter = false; return b; };
  I.clear = () => { I.k = {}; I.steer = I.accel = I.brake = I.boost = I.slideL = I.slideR = 0; I._pause = I._any = I._enter = false; };
  const dz = (v) => (Math.abs(v) < 0.16 ? 0 : (v - Math.sign(v) * 0.16) / 0.84);
  let padStart = false;
  /* sample devices once per frame */
  I.poll = function (dt) {
    const k = I.k;
    let tgt = (k.r ? 1 : 0) - (k.l ? 1 : 0), acc = k.a ? 1 : 0, brk = k.b ? 1 : 0, bst = k.x ? 1 : 0, sl = k.sl ? 1 : 0, sr = k.sr ? 1 : 0;
    I.pad = null;
    if (S.gamepad && navigator.getGamepads) {
      for (const g of navigator.getGamepads()) {
        if (!g || !g.connected) continue;
        I.pad = g.id;
        const ax = dz(g.axes[0] || 0), b = (i) => (g.buttons[i] && g.buttons[i].pressed ? 1 : 0);
        if (ax) tgt = ax; else if (b(14) || b(15)) tgt = b(15) - b(14);
        acc = Math.max(acc, b(0), b(7) ? 1 : 0); brk = Math.max(brk, b(6), b(1) && !b(0) ? 0 : 0); bst = Math.max(bst, b(2), b(1), b(3)); sl = Math.max(sl, b(4)); sr = Math.max(sr, b(5));
        if (b(9) && !padStart) I._pause = true; padStart = !!b(9);
        if (b(0) || b(9)) I._any = true;
        break;
      }
    }
    // keyboard steering eases in and out; stick values are used as they come
    const rate = Math.abs(tgt) > 0.99 ? 7.5 : 12;
    I.steer += Math.max(-rate * dt, Math.min(rate * dt, tgt - I.steer));
    I.accel = acc; I.brake = brk; I.boost = bst; I.slideL = sl; I.slideR = sr;
  };
  G.input = I;
})((window.SGS = window.SGS || {}));
