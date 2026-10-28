(function (G) {
  'use strict';

  G.C = {
    W: 960,
    H: 540,
    REPO: 'https://github.com/nbwillcox/SpaceBricks',
    // playfield: left/right/top walls, open bottom
    AX0: 24, AX1: 936, AY0: 66,
    // brick grid
    COLS: 15, ROWS: 10, BW: 56, BH: 22, PX: 60, PY: 26, BX0: 32, BY0: 86,
    PADDLE_Y: 504, PADDLE_W: 108, PADDLE_H: 14, BALL_R: 6, NET_Y: 528,
    START_LIVES: 3,
    EXTRA_LIFE_AT: [20000],
    EXTRA_LIFE_EVERY: 50000,
    BOSS_EVERY: 5,
    LASER_T: 14, CATCH_T: 16, BIG_T: 18, SLOW_T: 12, FIRE_T: 8,
    DROP_CHANCE: 0.14,
  };

  const KEY = 'spacebricks.settings.v1';
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
