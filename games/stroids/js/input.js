/* Ship controls: W/Up thrust forward, S/Down reverse thrust, A/D or Left/Right turn, or aim with the mouse. Space or left mouse fires, Shift / H / right mouse = hyperspace. */
(function (G) {
  'use strict';
  const I = { left: false, right: false, up: false, down: false, fire: false, mouseX: 0, mouseY: 0, mouseActive: false, mouseSeen: false, _hyper: false, _pause: false, _any: false };
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyQ', 'KeyE', 'KeyH', 'ShiftLeft', 'ShiftRight']);

  I.takeHyper = () => { const b = I._hyper; I._hyper = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { I.left = I.right = I.up = I.down = I.fire = false; I._hyper = I._pause = I._any = false; };

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
  function setKey(c, v) {
    if (c === 'KeyA' || c === 'ArrowLeft' || c === 'KeyQ') I.left = v;
    else if (c === 'KeyD' || c === 'ArrowRight' || c === 'KeyE') I.right = v;
    else if (c === 'KeyW' || c === 'ArrowUp') I.up = v;
    else if (c === 'KeyS' || c === 'ArrowDown') I.down = v;
    else if (c === 'Space') I.fire = v;
  }

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    setKey(c, true);
    if (c === 'KeyA' || c === 'KeyD' || c === 'KeyQ' || c === 'KeyE' || c === 'ArrowLeft' || c === 'ArrowRight') I.mouseActive = false; // turning keys take over from the mouse
    if ((c === 'ShiftLeft' || c === 'ShiftRight' || c === 'KeyH') && !e.repeat) I._hyper = true;
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));
  window.addEventListener('blur', () => I.clear());

  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) I.fire = true;
      else if (e.button === 2) I._hyper = true;
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
    I.mouseY = (e.clientY - v.oy) / v.s;
    I.mouseSeen = true;
    // a deliberate mouse move hands aiming back to the mouse (ignored while a turn key is held)
    if (Math.abs(e.movementX) + Math.abs(e.movementY) >= 3 && !I.left && !I.right) I.mouseActive = true;
  });

  G.input = I;
})((window.SGS = window.SGS || {}));
