/* Keyboard + gamepad. Arrows/WASD move, Space/Z/K jump, X/J fire (hold to charge), C/L missile, Shift/V dash, E aim-lock, R swap missile type, M map, P/Esc pause. */
(function (G) {
  'use strict';
  const I = { held: {}, down: {}, k: {}, lt: {}, prev: {}, mouse: { on: false, x: 0, y: 0, fire: false } };
  const MAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', Space: 'jump', KeyZ: 'jump', KeyK: 'jump', KeyX: 'fire', KeyJ: 'fire', KeyC: 'missile', KeyL: 'missile', ShiftLeft: 'dash', ShiftRight: 'dash', KeyV: 'dash', KeyE: 'aim', KeyR: 'swap', KeyQ: 'grapple', KeyF: 'scan', KeyM: 'map', KeyI: 'inv', Tab: 'map', KeyP: 'pause', Escape: 'pause', Enter: 'start', Digit1: 'b1', Digit2: 'b2', Digit3: 'b3' };
  const ACTIONS = ['l', 'r', 'u', 'd', 'jump', 'fire', 'missile', 'dash', 'aim', 'swap', 'map', 'pause', 'start', 'b1', 'b2', 'b3', 'grapple', 'scan', 'inv'];
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const a = MAP[e.code]; if (!a) return;
    if (!I.k[a]) I.lt[a] = true;
    I.k[a] = true; I.any = true; e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const a = MAP[e.code]; if (a) I.k[a] = false; });
  window.addEventListener('blur', () => { I.k = {}; });
  const cv = () => document.getElementById('game');
  window.addEventListener('pointermove', (e) => { const c = cv(); if (!c || e.target !== c) return; const r = c.getBoundingClientRect(); I.mouse.on = true; I.mouse.t = performance.now(); I.mouse.x = (e.clientX - r.left) / r.width * 480; I.mouse.y = (e.clientY - r.top) / r.height * 270; });
  /* holding the mouse button to charge must never start a browser drag of the canvas (it behaves like an image) or select text */
  for (const ev of ['dragstart', 'selectstart', 'mousedown']) window.addEventListener(ev, (e) => { if (e.target === cv()) e.preventDefault(); });
  window.addEventListener('pointerdown', (e) => {
    if (e.target !== cv()) return;
    e.preventDefault(); try { cv().setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const c = cv(), r = c.getBoundingClientRect();
    if (e.pointerType === 'touch') {                                 /* a touch on the canvas only drives the canvas menus (the touch layer owns play); it is not mouse aim and does not fire */
      I.tap = { x: (e.clientX - r.left) / r.width * 480, y: (e.clientY - r.top) / r.height * 270, t: performance.now() };
      const md = G.main && G.main.mode; if (md === 'title' || md === 'pause' || md === 'end') { I.lt.fire = true; I.any = true; }
      return;
    }
    I.mouse.on = true; I.mouse.t = performance.now(); I.mouse.x = (e.clientX - r.left) / r.width * 480; I.mouse.y = (e.clientY - r.top) / r.height * 270;
    if (e.button === 0) { if (!I.k.fire) I.lt.fire = true; I.k.fire = true; I.mouse.fire = true; I.any = true; I.tap = { x: I.mouse.x, y: I.mouse.y, t: performance.now() }; }
    else if (e.button === 2) { if (!I.k.missile) I.lt.missile = true; I.k.missile = true; I.mouse.missile = true; }
  });
  window.addEventListener('contextmenu', (e) => { if (e.target === cv()) e.preventDefault(); });
  window.addEventListener('pointerup', (e) => { if (e.button === 0 && I.mouse.fire) { I.k.fire = false; I.mouse.fire = false; } if (e.button === 2 && I.mouse.missile) { I.k.missile = false; I.mouse.missile = false; } });
  /* sample once per fixed step: I.held[a] = held now, I.down[a] = pressed this step */
  I.poll = function () {
    const pad = {}, PM = G.settings.padmap || {}, pi = (a, d) => (PM[a] === undefined ? d : PM[a]);
    I.newBtn = -1;
    if (G.settings.gamepad && navigator.getGamepads) {
      for (const g of navigator.getGamepads()) {
        if (!g || !g.connected) continue;
        const bt = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
        const rx = g.axes[2] || 0, ry = g.axes[3] || 0; pad.stick = Math.hypot(rx, ry) > 0.4 ? { x: rx, y: ry } : null;
        pad.l = ax < -0.4 || bt(14); pad.r = ax > 0.4 || bt(15); pad.u = ay < -0.5 || bt(12); pad.d = ay > 0.5 || bt(13);
        pad.jump = bt(pi('jump', 0)); pad.fire = bt(pi('fire', 2)) || bt(7); pad.missile = bt(pi('missile', 1)); pad.swap = bt(pi('swap', 3)); pad.dash = bt(pi('dash', 5)) || bt(6); pad.aim = bt(pi('aim', 4)); pad.map = bt(8); pad.grapple = bt(11); pad.scan = bt(10); pad.pause = bt(9); pad.start = bt(9);
        const nb = []; for (let i = 0; i < g.buttons.length; i++) nb.push(bt(i));
        for (let i = 0; i < nb.length; i++) if (nb[i] && !(I._rp && I._rp[i]) && i !== 9 && I.newBtn < 0) I.newBtn = i;
        I._rp = nb;
        if (G.ui && G.ui.cap) { for (const k in pad) delete pad[k]; pad.stick = null; }
        break;
      }
    }
    I.stick = pad.stick || I.touchStick || null;                 /* I.touchStick: the on-screen aim pad (set by the touch layer) */
    for (const a of ACTIONS) {
      const h = !!I.k[a] || !!pad[a];
      I.down[a] = !!I.lt[a] || (!!pad[a] && !I.prev[a]);
      I.held[a] = h; I.prev[a] = !!pad[a]; I.lt[a] = false;
      if (pad[a]) I.any = true;
    }
  };
  I.takeTap = () => { const t = I.tap; I.tap = null; return t && performance.now() - t.t < 400 ? t : null; };            /* a click / tap on the canvas, in canvas pixels (480 x 270) */
  I.clear = () => { I.k = {}; I.lt = {}; I.held = {}; I.down = {}; I.any = false; I.tap = null; };
  G.input = I;
})((window.SGS = window.SGS || {}));
