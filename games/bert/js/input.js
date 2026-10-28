/* Hop controls: Q / E / Z / C (or the numpad 7 / 9 / 1 / 3) hop up-left, up-right, down-left, down-right; clicking or tapping a quadrant around the hero does the same. */
(function (G) {
  'use strict';
  const I = { dir: null, _pause: false, _any: false, _launch: false };
  const EXTRA = { Numpad7: 'UL', Numpad9: 'UR', Numpad1: 'DL', Numpad3: 'DR', Home: 'UL', PageUp: 'UR', End: 'DL', PageDown: 'DR' };   /* always on, unless you bind that key to something else */
  const DIRK = ['UL', 'UR', 'DL', 'DR'];
  function dirOf(code) {
    const K = G.settings.keys;
    for (const d of DIRK) if (K[d] === code) return d;
    for (const k in K) if (K[k] === code) return null;                  /* bound to pause */
    return EXTRA[code] || null;
  }
  I.capture = null;                                                     /* set by the settings screen: gets the next key code */
  I.keyName = function (code) {
    if (!code) return '-';
    const m = /^(Key|Digit)(.)$/.exec(code);
    if (m) return m[2];
    const n = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Escape: 'Esc', Enter: 'Enter', Backspace: 'Bksp', Tab: 'Tab', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Backslash: '\\' };
    if (n[code]) return n[code];
    return code.replace(/^Numpad/, 'Num ').replace(/^(Shift|Control|Alt)(Left|Right)/, '$1 $2');
  };
  const GAME_KEYS = new Set(['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown']);

  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeAny = () => { const b = I._any; I._any = false; return b; };
  I.takeLaunch = () => { const b = I._launch; I._launch = false; return b; };
  I.take = () => { const d = I.dir; I.dir = null; return d; };
  I.clear = () => { I.dir = null; I._pause = I._any = I._launch = false; };

  function typing(t) { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; }

  window.addEventListener('keydown', (e) => {
    const c = e.code;
    if (I.capture) { e.preventDefault(); e.stopPropagation(); if (!e.repeat) I.capture(c); return; }
    if (typing(e.target)) return;
    const d = dirOf(c);
    if (d && !e.repeat) I.dir = d;
    else if ((c === G.settings.keys.pause || c === 'Escape') && !e.repeat) I._pause = true;
    if (!e.repeat) I._any = true;
    if ((d || GAME_KEYS.has(c)) && e.target.tagName !== 'BUTTON') e.preventDefault();
  });
  window.addEventListener('blur', () => I.clear());

  I.bind = function (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const v = G.view, g = G.game;
      I._any = true;
      if (!v || !g || !g.heroXY) return;
      const x = (e.clientX - v.ox) / v.s, y = (e.clientY - v.oy) / v.s, h = g.heroXY();
      I.dir = (y < h.y ? 'U' : 'D') + (x < h.x ? 'L' : 'R');
      e.preventDefault();
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  G.input = I;
})((window.SGS = window.SGS || {}));
