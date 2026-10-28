/* Run-and-gun controls. A / D / arrows run, Down lies prone (Down + jump drops through a ledge), W / Up / Space / Z / K jump, the MOUSE aims (the cannon follows the cursor) and left click / X / J fires.
   On a touch screen the left stick runs and the right stick aims and fires (see touchcfg.js). P pauses. Secret code on the keyboard: up up down down B A right shift enter. */
(function (G) {
  'use strict';
  const I = { l: false, r: false, d: false, fire: false, _jump: false, jumpHeld: false, _pause: false, _any: false, mouse: { on: false, x: 0, y: 0 }, stick: null };
  const MAP = { ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r', ArrowDown: 'd', KeyS: 'd', KeyX: 'fire', KeyJ: 'fire' };
  const JUMPS = new Set(['Space', 'KeyZ', 'KeyK', 'ArrowUp', 'KeyW']);
  const GAME_KEYS = new Set([...Object.keys(MAP), ...JUMPS, 'ShiftLeft', 'ShiftRight']);
  const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'KeyB', 'KeyA', 'ArrowRight', 'Shift', 'Enter'];
  let ci = 0;

  I.takeJump = () => { const b = I._jump; I._jump = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { I.l = I.r = I.d = I.fire = I.jumpHeld = false; I._jump = I._pause = I._any = false; };

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
  function code(e) {
    const k = e.code === 'ShiftLeft' || e.code === 'ShiftRight' ? 'Shift' : e.code;
    if (k === CODE[ci]) ci++;
    else ci = k === CODE[0] ? 1 : 0;
    if (ci === CODE.length) {
      ci = 0;
      G.cheat.inf = true;
      if (G.audio && G.audio.sfx) G.audio.sfx.extraLife();
      if (G.ui && G.ui.toast) G.ui.toast('CHEAT ON: INFINITE LIVES');
      e.preventDefault();
      return true;
    }
    return false;
  }
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    if (!e.repeat && code(e)) return;
    const c = e.code, m = MAP[c];
    if (m) I[m] = true;
    else if (JUMPS.has(c)) { if (!e.repeat) I._jump = true; I.jumpHeld = true; }
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const m = MAP[e.code];
    if (m) I[m] = false; else if (JUMPS.has(e.code)) I.jumpHeld = false;
  });
  window.addEventListener('blur', () => I.clear());
  /* the mouse: its position is the aim point (canvas pixels of the 960 x 540 playfield); touches are ignored here, the touch layer has its own aim stick */
  const toLogical = (e) => { const v = G.view; return v ? { x: (e.clientX - v.ox) / v.s, y: (e.clientY - v.oy) / v.s } : null; };
  const track = (e) => { const p = toLogical(e); if (p) { I.mouse.x = p.x; I.mouse.y = p.y; I.mouse.on = true; } };
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') track(e); });
  I.bind = function (canvas) {
    canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; track(e); if (e.button === 0) I.fire = true; I._any = true; e.preventDefault(); });
    canvas.addEventListener('mousedown', (e) => e.preventDefault());
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse' && e.button === 0) I.fire = false; });
  window.addEventListener('pointercancel', (e) => { if (e.pointerType === 'mouse') I.fire = false; });

  G.input = I;
})((window.SGS = window.SGS || {}));
