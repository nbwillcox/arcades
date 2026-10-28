/* Constants and the saved settings. */
(function (G) {
  'use strict';
  const C = {
    W: 540,
    H: 720,
    CX: 270, CY: 366,                                         /* the vanishing point of the tube */
    R: 214,                                                   /* the rim's outer radius in pixels */
    K0: 0.1,                                                  /* size of the far end of the tube relative to the rim */
    REPO: 'https://github.com/nbwillcox/SpaceTube',
    START_LIVES: 3,
    BULLET_V: 2.1,                                            /* tube depths per second */
    EXTRA_LIFE: 25000,
    /* web colour themes: spokes, rim, accent */
    THEMES: [
      { spoke: '#2f6bff', rim: '#5ad0ff', glow: 'rgba(60,170,255,0.9)', hue: 215 },
      { spoke: '#ff3d6e', rim: '#ff9ab5', glow: 'rgba(255,70,120,0.9)', hue: 345 },
      { spoke: '#22d36a', rim: '#8dffb8', glow: 'rgba(60,255,150,0.9)', hue: 140 },
      { spoke: '#b04dff', rim: '#e0a8ff', glow: 'rgba(190,90,255,0.9)', hue: 275 },
      { spoke: '#ff9a1f', rim: '#ffd27a', glow: 'rgba(255,170,40,0.9)', hue: 32 },
      { spoke: '#1fd0d0', rim: '#a0ffff', glow: 'rgba(40,230,230,0.9)', hue: 180 },
    ],
    /* the upgrade shop: id, name, description, max level, base price */
    UPGRADES: [
      { id: 'rate', name: 'RAPID CANNON', desc: 'Faster fire rate', max: 5, price: 90 },
      { id: 'shots', name: 'MAGAZINE', desc: 'More shots in flight at once', max: 4, price: 110 },
      { id: 'speed', name: 'CLAW MOTORS', desc: 'Faster movement around the rim', max: 4, price: 80 },
      { id: 'pierce', name: 'PIERCING ROUNDS', desc: 'Chance a shot punches through', max: 3, price: 160 },
      { id: 'power', name: 'POWER-UP TIMER', desc: 'Power-ups last longer', max: 3, price: 100 },
      { id: 'shield', name: 'AUTO SHIELD', desc: 'Start every web with a shield', max: 2, price: 200 },
      { id: 'zap', name: 'ZAPPER CHARGE', desc: 'Start every web with a zapper', max: 2, price: 220 },
      { id: 'life', name: 'EXTRA CLAW', desc: 'One more life', max: 99, price: 420 },
    ],
  };

  const KEY = 'spacetube.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false, mouseSteer: true, sens: 1 };
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
