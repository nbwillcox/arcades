/* Constants and the saved settings. World units are "arcade pixels": the playfield is 224 x 256 units, drawn at 2.4x. */
(function (G) {
  'use strict';
  const C = {
    W: 540,
    H: 720,
    K: 2.4,                                                   /* units -> canvas pixels */
    UW: 224, UH: 256,
    OX: (540 - 224 * 2.4) / 2, OY: 92,                        /* where the playfield sits on the canvas */
    REPO: 'https://github.com/nbwillcox/SpaceKong',
    START_LIVES: 3,
    EXTRA_LIFE: 20000,
    SPEED: 52, CLIMB: 32,                                     /* walking and climbing speeds, units per second */
    JUMP_V: -137, GRAVITY: 520,
    DEADLY_DROP: 27,                                          /* fall further than this and you do not get up */
    BARREL_V: 46, FIRE_V: 24,
    HAMMER_TIME: 9,
    STAGES: [
      { name: 'THE GIRDERS', sub: 'Climb to Nova. Jump the drums.', hue: 345, rim: '#ff7aa8', glow: 'rgba(255,100,160,0.9)' },
      { name: 'THE CONVEYORS', sub: 'The belts carry you. Mind the pies.', hue: 200, rim: '#7ee8ff', glow: 'rgba(80,200,255,0.9)' },
      { name: 'THE LIFTS', sub: 'Ride up. Dodge the springs.', hue: 140, rim: '#8dffb8', glow: 'rgba(80,255,150,0.9)' },
      { name: 'THE RIVETS', sub: 'Pull all eight rivets.', hue: 45, rim: '#ffd27a', glow: 'rgba(255,200,80,0.9)' },
    ],
  };

  const KEY = 'spacekong.settings.v1';
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
