(function (G) {
  'use strict';

  G.C = {
    W: 960,
    H: 540,
    REPO: 'https://github.com/nbwillcox/SpaceSidePews',
    TOP: 60,            // HUD band height
    YMIN: 74, YMAX: 484, // ship's flight band
    WW: 3840,           // width of the looping free-flight world
    START_LIVES: 3,
    EXTRA_LIFE_AT: [30000, 80000],
    EXTRA_LIFE_EVERY: 80000,
    SHIP_R: 6,
    SPEED_BASE: 215, SPEED_STEP: 38, MAX_SPEED_LV: 5,
    MAX_OPTIONS: 4, MAX_BOMBS: 5, START_BOMBS: 2,
    SCROLL: 72,         // forced-scroll speed, px/s
    HYPER_CD: 5,
  };

  const KEY = 'spacesidepews.settings.v1';
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
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    S.reduced = true;
  }
  G.settings = S;
})((window.SGS = window.SGS || {}));
