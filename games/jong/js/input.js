/* Mouse and touch pick tiles; the keyboard and a gamepad hop a cursor between free tiles. */
(function (G) {
  'use strict';
  const g = G.game, R = G.render, S = G.settings;
  const I = { last: 'mouse', q: {}, prev: {}, rep: { t: 0, d: '' } };
  G.input = I;
  const canvas = document.getElementById('game');
  const dev = (e) => [e.clientX * R.W / window.innerWidth, e.clientY * R.H / window.innerHeight];
  const playing = () => G.main.mode === 'play' && !(G.ui && G.ui.isOpen());
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' || !playing()) return;
    const [x, y] = dev(e); g.useCursor = false; I.last = 'mouse'; g.hover = R.hit(g, x, y);
    R.setPointer((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2);
    canvas.style.cursor = g.hover >= 0 && g.freeSet[g.hover] ? 'pointer' : 'default';
  });
  canvas.addEventListener('pointerleave', () => { g.hover = -1; });
  canvas.addEventListener('pointerdown', (e) => {
    if (!playing() || e.button === 2) return;
    if (G.audio) G.audio.resume();
    const [x, y] = dev(e), i = R.hit(g, x, y); g.useCursor = false; I.last = e.pointerType;
    if (i >= 0) g.pick(i); else if (g.sel >= 0 && g.canAct()) { g.sel = -1; if (G.audio) G.audio.sfx.drop(); }
    e.preventDefault();
  });
  canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); if (playing() && g.sel >= 0) { g.sel = -1; if (G.audio) G.audio.sfx.drop(); } });
  const DIR = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1] };
  window.addEventListener('keydown', (e) => {
    const t = e.target && e.target.tagName; if (t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT') return;
    if (!playing()) { if (G.main.mode === 'pause' && (e.code === 'KeyP' || e.code === 'Escape') && !G.ui.isOpen()) G.main.resume(); return; }
    const d = DIR[e.code], c = e.code; let used = true;
    if (d && !(c === 'KeyD' && e.ctrlKey)) { I.last = 'kbd'; g.moveCursor(d[0], d[1]); }
    else if (c === 'Enter' || c === 'Space') { I.last = 'kbd'; g.useCursor = true; g.pickCursor(); }
    else if (c === 'KeyH') g.useHint();
    else if (c === 'KeyU' || c === 'KeyZ' || c === 'Backspace') g.undo();
    else if (c === 'KeyS' || c === 'KeyX') g.shuffle(false);
    else if (c === 'KeyP' || c === 'Escape') G.main.pause();
    else if (c === 'KeyR' && !e.repeat) G.main.restart();
    else if (c === 'KeyQ') { if (g.sel >= 0) { g.sel = -1; if (G.audio) G.audio.sfx.drop(); } }
    else used = false;
    if (used && (e.target.tagName !== 'BUTTON' || c.indexOf('Arrow') === 0)) e.preventDefault();
  });
  /* gamepad: D-pad / left stick hop (with repeat), A pick, B cancel, X hint, Y undo, RB / LB shuffle, Start pause */
  I.poll = function (dt) {
    if (!S.gamepad || !navigator.getGamepads || !playing()) return;
    const pad = [...navigator.getGamepads()].find((p) => p && p.connected); if (!pad) return;
    const b = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed), ax = pad.axes[0] || 0, ay = pad.axes[1] || 0;
    const now = { a: b(0), b: b(1), x: b(2), y: b(3), sh: b(4) || b(5), st: b(9) }, edge = (k) => now[k] && !I.prev[k];
    let dir = '';
    if (b(14) || ax < -0.55) dir = 'l'; else if (b(15) || ax > 0.55) dir = 'r'; else if (b(12) || ay < -0.55) dir = 'u'; else if (b(13) || ay > 0.55) dir = 'd';
    if (dir && dir !== I.rep.d) { I.rep.d = dir; I.rep.t = 0.3; I.last = 'pad'; g.moveCursor(dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0); }
    else if (dir) { I.rep.t -= dt; if (I.rep.t <= 0) { I.rep.t = 0.13; g.moveCursor(dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0); } }
    else I.rep.d = '';
    if (edge('a')) { I.last = 'pad'; g.useCursor = true; g.pickCursor(); }
    if (edge('b') && g.sel >= 0) { g.sel = -1; if (G.audio) G.audio.sfx.drop(); }
    if (edge('x')) g.useHint(); if (edge('y')) g.undo(); if (edge('sh')) g.shuffle(false); if (edge('st')) G.main.pause();
    I.prev = now;
  };
})((window.SGS = window.SGS || {}));
