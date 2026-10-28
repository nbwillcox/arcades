(function (G) {
  'use strict';

  G.C = {
    W: 960,
    H: 540,
    GROUND: 500,
    REPO: 'https://github.com/nbwillcox/SpaceCommand',
    BOSS_EVERY: 5,
    LAUNCHERS: [70, 480, 890],
    CITIES: [170, 270, 370, 590, 690, 790],
    BONUS_CITY_EVERY: 10000,
    REBUILD_CITY: 120,
    REBUILD_LAUNCHER: 90,
    TARGET_MAX_Y: 455,
  };

  const KEY = 'spacecommand.settings.v1';
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
