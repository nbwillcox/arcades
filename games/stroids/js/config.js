(function (G) {
  'use strict';

  G.C = {
    W: 720,
    H: 540,
    REPO: 'https://github.com/nbwillcox/SpaceStroids',
    ACCEL: 560,
    TURN_RATE: 4.6,
    MAX_SPEED: 400,
    SHIP_SCALE: 0.5,
    SHIP_R: 11,
    START_LIVES: 3,
    BOSS_EVERY: 5,
    EXTRA_LIFE_AT: [10000, 30000],
    EXTRA_LIFE_EVERY: 40000,
    MAX_TIER: 4,
    MAX_DRONES: 2,
    SHIELD_TIME: 14,
    HYPER_CD: 3.5,
    BULLET_LIFE: 1.0,
  };

  const KEY = 'spacestroids.settings.v1';
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
