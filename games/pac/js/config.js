/* Constants and the saved settings. */
(function (G) {
  'use strict';
  const T = 24;                                               /* one maze tile in logical pixels */
  const C = {
    W: 540,
    H: 720,
    T,
    COLS: 21, ROWS: 23,
    MX: 18, MY: 92,                                           /* where the maze's top-left corner sits on the canvas */
    REPO: 'https://github.com/nbwillcox/SpacePac',
    START_LIVES: 3,
    HERO_SPEED: 7.4,                                          /* tiles per second at level 1 */
    EXTRA_LIFE: [10000, 50000],
    THEMES: [
      { name: 'CYAN GRID', hue: 190, wall: '#37e6ff', glow: 'rgba(55,230,255,0.9)', dot: '#ffe9a8', bg: 200 },
      { name: 'MAGENTA ARCADE', hue: 310, wall: '#ff3dd0', glow: 'rgba(255,61,208,0.9)', dot: '#ffe9a8', bg: 310 },
      { name: 'ACID GARDEN', hue: 130, wall: '#4dff9a', glow: 'rgba(77,255,154,0.9)', dot: '#fff2b0', bg: 140 },
      { name: 'EMBER VAULT', hue: 28, wall: '#ffa22e', glow: 'rgba(255,162,46,0.9)', dot: '#ffe0b0', bg: 28 },
      { name: 'VIOLET DEEP', hue: 265, wall: '#a77bff', glow: 'rgba(167,123,255,0.9)', dot: '#ffe9ff', bg: 265 },
    ],
    /* bonus gems: name, points, colour, shape */
    GEMS: [
      { name: 'CRYSTAL', pts: 100, color: '#7ee8ff', shape: 'diamond' },
      { name: 'RING', pts: 300, color: '#ffd24a', shape: 'ring' },
      { name: 'ORB', pts: 500, color: '#ff7ad9', shape: 'orb' },
      { name: 'STAR', pts: 700, color: '#fff27a', shape: 'star' },
      { name: 'COMET', pts: 1000, color: '#ff9a3d', shape: 'comet' },
      { name: 'MOON', pts: 2000, color: '#cfe0ff', shape: 'moon' },
      { name: 'SUN', pts: 3000, color: '#ffb347', shape: 'sun' },
      { name: 'KEY', pts: 5000, color: '#7dffb0', shape: 'key' },
    ],
  };
  C.px = (tx) => C.MX + tx * T;                                /* tile column -> canvas x (left edge) */
  C.py = (ty) => C.MY + ty * T;

  const KEY = 'spacepac.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false, siren: true };
  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; }
  } catch (e) { /* storage unavailable */ }
  S.save = function () {
    try {
      const o = {};
      for (const k in defaults) o[k] = S[k];
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  const qp = new URLSearchParams(location.search);
  G.debug = { level: parseInt(qp.get('level'), 10) || 0, god: qp.get('god') === '1' };
  G.C = C;
  G.settings = S;
})((window.SGS = window.SGS || {}));
