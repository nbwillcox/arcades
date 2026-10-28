/* Paddle controls: the mouse (or A/D and the arrow keys) moves it; click or Space launches the ball and fires the laser. */
(function (G) {
  'use strict';
  const I = { left: false, right: false, fire: false, mouseX: 480, mouseActive: false, mouseSeen: false, _launch: false, _pause: false, _any: false };
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD']);

  I.takeLaunch = () => { const b = I._launch; I._launch = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { I.left = I.right = I.fire = false; I._launch = I._pause = I._any = false; };
  I.dir = () => (I.right ? 1 : 0) - (I.left ? 1 : 0);

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
  function setKey(c, v) {
    if (c === 'KeyA' || c === 'ArrowLeft') I.left = v;
    else if (c === 'KeyD' || c === 'ArrowRight') I.right = v;
    else if (c === 'Space') I.fire = v;
  }

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    setKey(c, true);
    if (c === 'KeyA' || c === 'KeyD' || c === 'ArrowLeft' || c === 'ArrowRight') I.mouseActive = false;
    if (c === 'Space' && !e.repeat) I._launch = true;
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));
  window.addEventListener('blur', () => I.clear());

  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { I.fire = true; I._launch = true; }
      I._any = true;
      e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; });
  window.addEventListener('mousemove', (e) => {
    const v = G.view;
    if (!v) return;
    I.mouseX = (e.clientX - v.ox) / v.s;
    I.mouseSeen = true;
    if (Math.abs(e.movementX) + Math.abs(e.movementY) >= 2 && !I.left && !I.right) I.mouseActive = true;
  });

  G.input = I;
})((window.SGS = window.SGS || {}));
