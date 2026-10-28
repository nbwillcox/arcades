(function (G) {
  'use strict';

  G.C = {
    W: 960,
    H: 540,
    REPO: 'https://github.com/nbwillcox/SpaceContra',
    FLOOR: 440,
    GRAV: 1900, RUN: 215, JUMP: -730, MAXFALL: 900, SPRING: -1010, JUMP_CUT: 0.42,
    START_LIVES: 3,
    EXTRA_LIFE_AT: [20000, 50000],
    EXTRA_LIFE_EVERY: 50000,
    BOSS_NAMES: ['DEFENSE WALL', 'IRON WALKER', 'ALIEN HEART', 'MOTHERSHIP'],
  };

  const KEY = 'spacecontra.settings.v1';
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
  G.cheat = { inf: false };
})((window.SGS = window.SGS || {}));
