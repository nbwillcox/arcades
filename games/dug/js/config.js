(function (G) {
  'use strict';

  G.C = {
    W: 540,
    H: 720,
    REPO: 'https://github.com/nbwillcox/SpaceDug',
    CELL: 30, COLS: 18, ROWS: 22, GY0: 60,       // row 0 is the surface walkway; rows 1..21 are rock
    LAYERS: [1, 6, 11, 16],                       // first row of each stratum
    START_C: 9,
    START_LIVES: 3,
    EXTRA_LIFE_AT: [20000, 60000],
    EXTRA_LIFE_EVERY: 60000,
    BOSS_EVERY: 5,
    SPEED_OPEN: 190, SPEED_DIG: 125,
    HOSE_LEN: 96, HOSE_LEN_LONG: 156, PUMP_STAGES: 4,
    FX_T: 14,
  };

  const KEY = 'spacedug.settings.v1';
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
