/* Classic side-scroller controls: WASD flies, Space/click fires, Shift reverses, E cashes in the power-up meter, B smart bomb, H hyperspace. */
(function (G) {
  'use strict';
  const I = { l: false, r: false, u: false, d: false, fire: false, _rev: false, _pow: false, _bomb: false, _hyper: false, _pause: false, _any: false };
  const GAME_KEYS = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyE', 'KeyB', 'KeyH', 'ShiftLeft', 'ShiftRight']);

  const take = (k) => () => { const b = I[k]; I[k] = false; return b; };
  I.takeRev = take('_rev'); I.takePow = take('_pow'); I.takeBomb = take('_bomb'); I.takeHyper = take('_hyper'); I.takePause = take('_pause'); I.takeAny = take('_any');
  I.clear = () => { I.l = I.r = I.u = I.d = I.fire = false; I._rev = I._pow = I._bomb = I._hyper = I._pause = I._any = false; };

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
  function setKey(c, v) {
    if (c === 'KeyA' || c === 'ArrowLeft') I.l = v; else if (c === 'KeyD' || c === 'ArrowRight') I.r = v;
    else if (c === 'KeyW' || c === 'ArrowUp') I.u = v; else if (c === 'KeyS' || c === 'ArrowDown') I.d = v;
    else if (c === 'Space') I.fire = v;
  }
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    setKey(c, true);
    if (!e.repeat) {
      if (c === 'ShiftLeft' || c === 'ShiftRight') I._rev = true;
      else if (c === 'KeyE' || c === 'Enter') I._pow = true;
      else if (c === 'KeyB') I._bomb = true;
      else if (c === 'KeyH') I._hyper = true;
      else if (c === 'KeyP' || c === 'Escape') I._pause = true;
      I._any = true;
    }
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => setKey(e.code, false));
  window.addEventListener('blur', () => I.clear());
  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) I.fire = true; else if (e.button === 2) I._bomb = true;
      I._any = true;
      e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; });

  G.input = I;
})((window.SGS = window.SGS || {}));
