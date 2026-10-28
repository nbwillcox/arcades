/* Keyboard (rebindable), gamepad and (through the mobile kit later) touch. Defaults: arrows move, Z punch, X kick, Space jump, P or Esc pause. */
(function (G) {
  'use strict';
  const BUF = 0.16;
  const I = { dx: 0, dy: 0, left: false, right: false, up: false, down: false, buf: { punch: 0, kick: 0, jump: 0 }, held: { punch: false, kick: false, jump: false }, _pause: false, _any: false, pad: false };
  /* one key per action; rebound in Settings > Controls and saved with the other settings */
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  const refresh = () => { I.dx = (I.right ? 1 : 0) - (I.left ? 1 : 0); I.dy = (I.down ? 1 : 0) - (I.up ? 1 : 0); };
  const MOVE = { left: 1, right: 1, up: 1, down: 1 }, BTN = { punch: 1, kick: 1, jump: 1 };
  let CODE = {};                                         /* key code -> action */
  I.rebuild = function () {
    CODE = {}; const k = G.settings.keys; for (const a in k) CODE[k[a]] = a;
    /* the on-screen touch controls send these fixed codes, so rebinding the keyboard never breaks them */
    Object.assign(CODE, { TouchLeft: 'left', TouchRight: 'right', TouchUp: 'up', TouchDown: 'down', TouchPunch: 'punch', TouchKick: 'kick', TouchJump: 'jump', TouchPause: 'pause' });
  };
  I.capture = null;                                      /* while set, the next key press goes here instead of the game (rebinding) */

  /* keys and mouse buttons share one path: codes are KeyboardEvent codes or Mouse0 (left) / Mouse1 (middle) / Mouse2 (right) */
  function press(code, repeat, target, e) {
    const a = CODE[code];
    if (a && MOVE[a]) { I[a] = true; refresh(); }
    else if (a && BTN[a]) { if (!repeat) I.buf[a] = BUF; I.held[a] = true; }
    else if ((a === 'pause' || code === 'Escape') && !repeat) I._pause = true;
    else return false;
    if (e && target.tagName !== 'BUTTON') e.preventDefault();
    if (!repeat) I._any = true;
    return true;
  }
  function release(code) {
    const a = CODE[code];
    if (a && MOVE[a]) { I[a] = false; refresh(); }
    if (a && BTN[a]) I.held[a] = false;
  }
  window.addEventListener('keydown', (e) => {
    if (I.capture) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) I.capture(e.code); return; }
    if (G.ui && G.ui.isOpen && G.ui.isOpen() && G.ui.navKey(e.code)) { e.preventDefault(); return; }
    if (typing(e.target)) return;
    if (!press(e.code, e.repeat, e.target, e) && G.debugKey && !e.repeat) G.debugKey(e);
  }, true);
  window.addEventListener('keyup', (e) => release(e.code));
  /* mouse: while rebinding any click is taken as the new binding; in play only clicks on the game canvas count, so menus keep working */
  let swallowClick = false;
  window.addEventListener('mousedown', (e) => {
    const code = 'Mouse' + e.button;
    if (I.capture) { e.preventDefault(); e.stopPropagation(); swallowClick = e.button === 0; I.capture(code); return; }
    if (e.target.id !== 'game') return;
    press(code, false, e.target, e);
  }, true);
  window.addEventListener('mouseup', (e) => { release('Mouse' + e.button); if (swallowClick) setTimeout(() => { swallowClick = false; }, 0); }, true);
  window.addEventListener('click', (e) => { if (swallowClick) { swallowClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
  window.addEventListener('contextmenu', (e) => { if (I.capture || e.target.id === 'game') e.preventDefault(); });
  window.addEventListener('auxclick', (e) => { if (I.capture || e.target.id === 'game') e.preventDefault(); });
  window.addEventListener('blur', () => { I.left = I.right = I.up = I.down = false; I.held.punch = I.held.kick = I.held.jump = false; refresh(); });

  I.tick = function (dt) { const b = I.buf; if (b.punch > 0) b.punch -= dt; if (b.kick > 0) b.kick -= dt; if (b.jump > 0) b.jump -= dt; };
  I.bind = function (canvas) { canvas.addEventListener('contextmenu', (e) => e.preventDefault()); };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.clear = () => { I.left = I.right = I.up = I.down = false; I.dx = I.dy = 0; I.buf.punch = I.buf.kick = I.buf.jump = 0; I.held.punch = I.held.kick = I.held.jump = false; I._pause = false; I._any = false; };
  I.resync = () => { I._pause = false; };

  /* gamepad: d-pad / left stick always move; jump, punch, kick and pause are buttons chosen in Settings > Controls (settings.pad holds button indices) */
  const prev = {}; let pdx = 0, pdy = 0;
  I.padCapture = null;                                   /* while set, the next gamepad button press goes here (rebinding) */
  I.poll = function () {
    const list = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of list) {
      if (!p || !p.connected) continue;
      const b = p.buttons, ax = p.axes, down = (i) => !!(b[i] && b[i].pressed);
      if (I.padCapture) {
        for (let i = 0; i < b.length; i++) { const d = down(i); if (d && !prev[i]) { prev[i] = true; const cb = I.padCapture; I.padCapture = null; cb(i); return; } prev[i] = d; }
        return;
      }
      if (G.ui && G.ui.isOpen && G.ui.isOpen()) {                 /* a menu is open: d-pad / stick up and down move the focus, A presses, Start still pauses / resumes */
        const up = down(12) || (ax.length > 1 && ax[1] < -0.5), dn = down(13) || (ax.length > 1 && ax[1] > 0.5), a = down(0), st = down(G.settings.pad.pause);
        if (up && !prev.mu) G.ui.padPress('up'); if (dn && !prev.md) G.ui.padPress('down'); if (a && !prev.ma) G.ui.padPress('a'); if (st && !prev.mst) I._pause = true;
        prev.mu = up; prev.md = dn; prev.ma = a; prev.mst = st;
        for (let i = 0; i < b.length; i++) prev[i] = down(i);
        return;
      }
      let x = 0, y = 0;
      if (down(14)) x = -1; else if (down(15)) x = 1; else if (ax.length && Math.abs(ax[0]) > 0.35) x = ax[0] < 0 ? -1 : 1;
      if (down(12)) y = -1; else if (down(13)) y = 1; else if (ax.length > 1 && Math.abs(ax[1]) > 0.4) y = ax[1] < 0 ? -1 : 1;
      if (x !== pdx || y !== pdy) { I.left = x < 0; I.right = x > 0; I.up = y < 0; I.down = y > 0; pdx = x; pdy = y; refresh(); }
      const m = G.settings.pad;
      for (const a of ['jump', 'punch', 'kick', 'pause']) {
        const d = down(m[a]);
        if (d && !prev['a' + a]) { if (a === 'pause') I._pause = true; else I.buf[a] = BUF; I._any = true; }
        prev['a' + a] = d;
      }
      for (let i = 0; i < b.length; i++) prev[i] = down(i);
      I.pad = true;
      break;
    }
  };
  I.rebuild();
  G.input = I;
})((window.SGS = window.SGS || {}));
