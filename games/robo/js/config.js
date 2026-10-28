(function (G) {
  'use strict';

  G.C = {
    W: 960,
    H: 540,
    REPO: 'https://github.com/nbwillcox/SpaceRoboShooter',
    // playfield rectangle inside the logical 960x540 canvas (HUD sits above it)
    AX0: 14, AY0: 62, AX1: 946, AY1: 526,
    START_LIVES: 3,
    EXTRA_LIFE_AT: [25000],
    EXTRA_LIFE_EVERY: 25000,
    FINAL_WAVE: 40,
    MAX_TIER: 4,
    MAX_BOMBS: 3,
    PLAYER_SPEED: 205,
    PLAYER_R: 7,
    BULLET_SPEED: 760,
    BULLET_LIFE: 1.05,
    SHIELD_TIME: 12,
    RAPID_TIME: 12,
    SPEED_TIME: 12,
    PICK_EVERY: 4,
  };

  const KEY = 'spaceroboshooter.settings.v1';
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
