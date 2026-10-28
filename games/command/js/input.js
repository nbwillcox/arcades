/* Mouse + keyboard: move the cursor, left click fires, right click / Space detonates the nuke, 1-4 or Q/E/wheel pick a weapon. */
(function (G) {
  'use strict';
  const I = { fire: false, mouseX: 480, mouseY: 200, mouseSeen: false, _nuke: false, _pause: false, _any: false, _weapon: 0, _click: false };
  const GAME_KEYS = new Set(['Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'KeyQ', 'KeyE', 'Tab']);

  I.takeNuke = () => { const b = I._nuke; I._nuke = false; return b; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.takeClick = () => { const b = I._click; I._click = false; return b; };
  I.takeWeapon = () => { const w = I._weapon; I._weapon = 0; return w; }; // 1-4 = pick, 5 = next, 6 = previous
  I.clear = () => { I.fire = false; I._nuke = I._pause = I._any = I._click = false; I._weapon = 0; };

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    if (c === 'Space' && !e.repeat) I._nuke = true;
    else if (c === 'Digit1') I._weapon = 1;
    else if (c === 'Digit2') I._weapon = 2;
    else if (c === 'Digit3') I._weapon = 3;
    else if (c === 'Digit4') I._weapon = 4;
    else if ((c === 'KeyE' || c === 'Tab') && !e.repeat) I._weapon = 5;
    else if (c === 'KeyQ' && !e.repeat) I._weapon = 6;
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('blur', () => I.clear());

  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      const v = G.view;
      if (v) { I.mouseX = (e.clientX - v.ox) / v.s; I.mouseY = (e.clientY - v.oy) / v.s; I.mouseSeen = true; }
      if (e.button === 0) { I.fire = true; I._click = true; }
      else if (e.button === 2) I._nuke = true;
      I._any = true;
      e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    canvas.addEventListener('wheel', (e) => { I._weapon = e.deltaY > 0 ? 5 : 6; e.preventDefault(); }, { passive: false });
  };
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; });
  window.addEventListener('mousemove', (e) => {
    const v = G.view;
    if (!v) return;
    I.mouseX = (e.clientX - v.ox) / v.s;
    I.mouseY = (e.clientY - v.oy) / v.s;
    I.mouseSeen = true;
  });

  G.input = I;
})((window.SGS = window.SGS || {}));
