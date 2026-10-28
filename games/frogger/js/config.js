(function (G) {
  'use strict';

  G.C = {
    W: 540,
    H: 720,
    REPO: 'https://github.com/nbwillcox/SpaceFrogger',
    TILE: 45, COLS: 12,
    BASE_Y: 607.5,          // screen y of the centre of world row 0 (the start row)
    BAY_ROW: 12, BAY_X: [54, 162, 270, 378, 486], BAY_TOL: 34,
    START_LIVES: 3,
    TIMER: 30,
    EXTRA_LIFE_AT: [10000, 30000],
    EXTRA_LIFE_EVERY: 50000,
    HOP_T: 0.11,
    FROG_R: 15,
  };

  const KEY = 'spacefrogger.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false, left: false, swipe: 26 };

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
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    S.reduced = true;
  }
  G.settings = S;
})((window.SGS = window.SGS || {}));
