/* Keys: arrows/WASD steer + speed, Z/Q/J throw left, X/E/K throw right, C/Enter auto-throw, Space hop, P/Esc pause. Pad and touch arrive as synthetic keys via the shared kits. */
(function (G) {
  'use strict';
  const I = { ax: 0, ay: 0, hopHeld: false, _tl: 0, _tr: 0, _ta: 0, _hop: 0, _pause: false, _any: false, padName: '' };
  const held = Object.create(null);
  const MOVE = { ArrowLeft: 'L', KeyA: 'L', ArrowRight: 'R', KeyD: 'R', ArrowUp: 'U', KeyW: 'U', ArrowDown: 'D', KeyS: 'D' };
  const TL = new Set(['KeyZ', 'KeyQ', 'KeyJ']), TR = new Set(['KeyX', 'KeyE', 'KeyK']), TA = new Set(['KeyC', 'Enter']);
  const GAME = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
  I.take = (k) => { const v = I[k]; I[k] = 0; return v; };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.clear = () => { I._tl = I._tr = I._ta = I._hop = 0; I._pause = I._any = false; I.hopHeld = false; for (const k in held) held[k] = false; I.ax = I.ay = 0; };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    const c = e.code;
    if (!e.repeat) {
      I._any = true;
      if (TL.has(c)) I._tl = 1; else if (TR.has(c)) I._tr = 1; else if (TA.has(c)) I._ta = 1;
      else if (c === 'Space') { I._hop = 1; I.hopHeld = true; }
      else if (c === 'KeyP' || c === 'Escape') I._pause = true;
    }
    if (MOVE[c]) held[MOVE[c]] = true;
    if ((GAME.has(c) || MOVE[c] || TL.has(c) || TR.has(c) || TA.has(c)) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { const d = MOVE[e.code]; if (d) held[d] = false; if (e.code === 'Space') I.hopHeld = false; });
  window.addEventListener('blur', () => I.clear());
  I.bind = function (canvas) {
    canvas.addEventListener('pointerdown', () => { I._any = true; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };
  I.poll = function () {
    I.ax = (held.R ? 1 : 0) - (held.L ? 1 : 0);
    I.ay = (held.U ? 1 : 0) - (held.D ? 1 : 0);
    if (I.script) { const s = I.script; I.ax = s.ax || 0; I.ay = s.ay || 0; }
  };
  G.input = I;
})((window.SGS = window.SGS || {}));
