/* Keyboard controls: arrows / WASD move and dig, hold Space to fire the pump hose and inflate, P pauses. */
(function (G) {
  'use strict';
  const I = { fire: false, _pause: false, _any: false, order: [] };
  const DIRS = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  const GAME_KEYS = new Set([...Object.keys(DIRS), 'Space']);

  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { I.fire = false; I.order.length = 0; I._pause = I._any = false; };
  /* the most recently pressed direction that is still held */
  I.dir = () => (I.order.length ? I.order[I.order.length - 1] : null);

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code, d = DIRS[c];
    if (d) { const i = I.order.indexOf(d); if (i >= 0) I.order.splice(i, 1); I.order.push(d); }
    else if (c === 'Space') I.fire = true;
    else if ((c === 'KeyP' || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if (GAME_KEYS.has(c) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => {
    const d = DIRS[e.code];
    if (d) { const i = I.order.indexOf(d); if (i >= 0) I.order.splice(i, 1); }
    else if (e.code === 'Space') I.fire = false;
  });
  window.addEventListener('blur', () => I.clear());
  I.bind = function (canvas) {
    canvas.addEventListener('mousedown', (e) => { if (e.button === 0) I.fire = true; I._any = true; e.preventDefault(); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  window.addEventListener('mouseup', (e) => { if (e.button === 0) I.fire = false; });

  G.input = I;
})((window.SGS = window.SGS || {}));
