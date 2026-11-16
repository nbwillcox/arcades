// Stick Doosh - config.js (core): tunables.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  S.C = {
    T: 20,              // tile size (world px)
    VIEW_H: 450,        // logical view height
    VIEW_W_MIN: 640,
    VIEW_W_MAX: 1000,
    GRAV: 1500,
    MAX_FALL: 900,
    RUN: 215,
    JUMP: -500,
    CLIMB: 170,
    ACCEL_GROUND: 2600,
    ACCEL_AIR: 1700,
    FRICTION: 2400,
    COYOTE: 0.1,
    JUMP_BUF: 0.12,
    INV_TIME: 1.0,
    PLAYER_W: 14,
    PLAYER_H: 32,
    BASE_HP: 3,
    BASE_SPECIALS: 3,
    SUPER_AMMO: 28,
    PARTICLES_DESK: 900,
    PARTICLES_MOBILE: 320,
    WORDS_DESK: 40,
    WORDS_MOBILE: 20,
    CHUNK: 8,           // tiles per terrain chunk side
    CHUNK_CACHE: 56,    // max cached chunk canvases
    ACTIVE_X: 520,      // enemies update within camera +- this
    ACTIVE_Y: 360,
    INK: '#141018',
    DIFF: {
      baby:   { name: 'BABY DOOSH',  dmgMul: 0.5, enemyRate: 0.7, hpBonus: 2, enemyBonus: 0 },
      normal: { name: 'DOOSH',       dmgMul: 1.0, enemyRate: 1.0, hpBonus: 0, enemyBonus: 0 },
      ultra:  { name: 'ULTRA DOOSH', dmgMul: 1.5, enemyRate: 1.35, hpBonus: 0, enemyBonus: 0.3 },
    },
  };
})();
