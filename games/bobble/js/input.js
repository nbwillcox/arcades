/* Keyboard + mouse + gamepad: arrows/WASD move, Space/Z/Up jump (Down + jump drops through a platform), X/J or left click blow a bubble, P/Esc pause. */
(function (G) {
  'use strict';
  const S = G.settings;
  const I = { l: false, r: false, jump: false, blow: false, _jumpP: false, _blowP: false, _pause: false, _any: false, k: {}, _prevPad: {} };
  const MAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', Space: 'j', KeyZ: 'j', KeyK: 'j', ArrowUp: 'j', KeyW: 'j', KeyX: 'b', KeyJ: 'b', KeyL: 'b', ShiftLeft: 'b', ArrowDown: 'd', KeyS: 'd' };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const m = MAP[e.code];
    if (m) { if (!I.k[m] && m === 'j') I._jumpP = true; if (!I.k[m] && m === 'b') I._blowP = true; I.k[m] = true; }
    if (!e.repeat) { if (e.code === 'KeyP' || e.code === 'Escape') I._pause = true; I._any = true; }
    if ((m || e.code === 'KeyP') && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const m = MAP[e.code]; if (m) I.k[m] = false; });
  window.addEventListener('blur', () => { I.k = {}; });
  // left mouse button on the playfield blows a bubble (hold to keep blowing)
  window.addEventListener('pointerdown', (e) => { if (e.button === 0 && e.target && e.target.id === 'game') { if (!I.k.m) I._blowP = true; I.k.m = true; I._any = true; } });
  window.addEventListener('pointerup', (e) => { if (e.button === 0) I.k.m = false; });
  window.addEventListener('pointercancel', () => { I.k.m = false; });
  I.takeJump = () => { const b = I._jumpP; I._jumpP = false; return b; };
  I.takeBlow = () => { const b = I._blowP; I._blowP = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.clear = () => { I.k = {}; I.l = I.r = I.jump = I.blow = I.down = false; I._jumpP = I._blowP = I._pause = I._any = false; };
  /* sample the devices once per frame (call before the fixed-step loop) */
  I.poll = function () {
    const k = I.k;
    let l = !!k.l, r = !!k.r, j = !!k.j, b = !!k.b || !!k.m, d = !!k.d;
    if (S.gamepad && navigator.getGamepads) {
      for (const g of navigator.getGamepads()) {
        if (!g || !g.connected) continue;
        const ax = g.axes[0] || 0, bt = (i) => !!(g.buttons[i] && g.buttons[i].pressed);
        l = l || ax < -0.4 || bt(14); r = r || ax > 0.4 || bt(15); d = d || (g.axes[1] || 0) > 0.55 || bt(13);
        const gj = bt(0) || bt(12), gb = bt(2) || bt(1) || bt(7) || bt(5);
        if (gj && !I._prevPad.j) I._jumpP = true; if (gb && !I._prevPad.b) I._blowP = true;
        if (bt(9) && !I._prevPad.s) I._pause = true;
        I._prevPad = { j: gj, b: gb, s: bt(9) };
        j = j || gj; b = b || gb;
        if (gj || gb || bt(9)) I._any = true;
        break;
      }
    }
    I.l = l; I.r = r; I.jump = j; I.blow = b; I.down = d;
  };
  G.input = I;
})((window.SGS = window.SGS || {}));
