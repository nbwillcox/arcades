/* Twin-stick controls: WASD moves, the mouse aims (left click / Space fires), arrow keys fire in 8 directions, B / right click = smart bomb, 1-2-3 or click picks an upgrade. */
(function (G) {
  'use strict';
  const I = { l: false, r: false, u: false, d: false, al: false, ar: false, au: false, ad: false, fire: false, mouseX: 0, mouseY: 0, mouseActive: false, mouseSeen: false, _bomb: false, _pause: false, _any: false, _pick: 0, _click: null };
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyB', 'ShiftLeft', 'ShiftRight', 'Digit1', 'Digit2', 'Digit3']);

  I.takeBomb = () => { const b = I._bomb; I._bomb = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.takePick = () => { const n = I._pick; I._pick = 0; return n; };
  I.takeClick = () => { const c = I._click; I._click = null; return c; };
  I.clear = () => { I.l = I.r = I.u = I.d = I.al = I.ar = I.au = I.ad = I.fire = false; I._bomb = I._pause = I._any = false; I._pick = 0; I._click = null; };
  I.move = () => ({ x: (I.r ? 1 : 0) - (I.l ? 1 : 0), y: (I.d ? 1 : 0) - (I.u ? 1 : 0) });
  I.arrows = () => ({ x: (I.ar ? 1 : 0) - (I.al ? 1 : 0), y: (I.ad ? 1 : 0) - (I.au ? 1 : 0) });

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
  function setKey(c, v) {
    if (c === 'KeyA') I.l = v; else if (c === 'KeyD') I.r = v; else if (c === 'KeyW') I.u = v; else if (c === 'KeyS') I.d = v;
    else if (c === 'ArrowLeft') I.al = v; else if (c === 'ArrowRight') I.ar = v; else if (c === 'ArrowUp') I.au = v; else if (c === 'ArrowDown') I.ad = v;
    else if (c === 'Space') I.fire = v;
  }

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    setKey(c, true);
    if ((c === 'KeyB' || c === 'ShiftLeft' || c === 'ShiftRight') && !e.repeat) I._bomb = true;
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    else if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') I._pick = parseInt(c.slice(5), 10);
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));
  window.addEventListener('blur', () => I.clear());

  function toLogical(e) {
    const v = G.view;
    return v ? { x: (e.clientX - v.ox) / v.s, y: (e.clientY - v.oy) / v.s } : { x: 0, y: 0 };
  }
  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      const p = toLogical(e);
      I.mouseX = p.x; I.mouseY = p.y; I.mouseSeen = true;
      if (e.button === 0) { I.fire = true; I._click = p; }
      else if (e.button === 2) I._bomb = true;
      I._any = true;
      e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; });
  window.addEventListener('mousemove', (e) => {
    const p = toLogical(e);
    I.mouseX = p.x; I.mouseY = p.y; I.mouseSeen = true;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) >= 2) I.mouseActive = true;
  });

  G.input = I;
})((window.SGS = window.SGS || {}));
