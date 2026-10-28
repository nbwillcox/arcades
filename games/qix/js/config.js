/* Constants and the saved settings. */
(function (G) {
  'use strict';
  const C = {
    W: 540,
    H: 720,
    CELL: 5,                                                  /* one grid cell in logical pixels */
    NX: 100, NY: 108,                                         /* the field is 100 x 108 cells */
    PX: 20, PY: 94,                                           /* where the field's top-left corner sits on the canvas */
    REPO: 'https://github.com/nbwillcox/SpaceQix',
    START_LIVES: 3,
    FAST: 46, SLOW: 22,                                       /* player steps per second */
    EXTRA_LIFE: 20000,
    /* the hidden pictures, one per level (cycling); hue tints the rim and the page background */
    PICS: [
      { name: 'RINGED WORLD', hue: 265, rim: '#c9a0ff', glow: 'rgba(190,140,255,0.9)' },
      { name: 'NEON HORIZON', hue: 320, rim: '#ff7ad9', glow: 'rgba(255,100,210,0.9)' },
      { name: 'GALAXY', hue: 220, rim: '#8fb8ff', glow: 'rgba(110,160,255,0.9)' },
      { name: 'CRYSTAL CAVE', hue: 175, rim: '#7dffe8', glow: 'rgba(80,255,220,0.9)' },
      { name: 'AURORA', hue: 140, rim: '#8dffb0', glow: 'rgba(80,255,150,0.9)' },
      { name: 'DEEP SEA', hue: 200, rim: '#7fd8ff', glow: 'rgba(70,190,255,0.9)' },
      { name: 'STATION', hue: 28, rim: '#ffc27a', glow: 'rgba(255,170,70,0.9)' },
      { name: 'GAS GIANT', hue: 350, rim: '#ff9a8a', glow: 'rgba(255,120,100,0.9)' },
    ],
    BOSSES: [
      { name: 'THE WEAVER', col: '#ff5a3d' },
      { name: 'THE PRISM', col: '#b97aff' },
      { name: 'THE HYDRA', col: '#3dffb0' },
    ],
  };
  C.FW = C.NX * C.CELL; C.FH = C.NY * C.CELL;                 /* the field in logical pixels */

  const KEY = 'spaceqix.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false };
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
