/* Constants and saved settings. World units are logical pixels: the screen is 480 x 270, scaled to fit the window. */
(function (G) {
  'use strict';
  const C = {
    W: 480, H: 270,
    YMIN: 176, YMAX: 254,                 /* the walkable depth band (screen y of the feet) */
    GRAV: 560,
    ATK_SPEED: 1.2,                       /* player attack speed multiplier (1 = the move table as written) */
    START_LIVES: 3,
    PLAYER_HP: 24,                        /* 6 hearts x 4 */
    HEART: 4,
    EXTRA_LIFE: [20000, 50000],           /* then every 50,000 */
    STAGE_TIME: 300,
    REPO: 'https://github.com/nbwillcox/StickBrawl',
    INK: '#2b2a27', PAPER: '#f1e9d4',
    BLUE: '#2f62e8', BLUE_D: '#142f86',
    RED: '#dc3a30', RED_D: '#7e1712',
  };

  const KEY = 'stickbrawl.settings.v1';
  C.KEYS = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown', punch: 'KeyZ', kick: 'KeyX', jump: 'Space', pause: 'KeyP' };
  C.PAD = { jump: 0, kick: 1, punch: 2, pause: 9 };                 /* standard-layout button indices: A, B, X, Start */
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, shake: true, hitstop: true, keys: Object.assign({}, C.KEYS), pad: Object.assign({}, C.PAD) };
  const S = Object.assign({}, defaults);
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) Object.assign(S, JSON.parse(raw));
  } catch (e) { /* storage unavailable */ }
  S.keys = Object.assign({}, C.KEYS, S.keys || {});
  S.pad = Object.assign({}, C.PAD, S.pad || {});
  S.save = function () {
    try {
      const o = {};
      for (const k in defaults) o[k] = k === 'keys' ? Object.assign({}, S.keys) : k === 'pad' ? Object.assign({}, S.pad) : S[k];
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  };
  const qp = new URLSearchParams(location.search);
  /* ?debug=1 shows spawn keys + hitboxes, ?god=1 stops damage, ?wave=N starts at that wave, ?lab=1 is an empty arena */
  G.debug = { on: qp.get('debug') === '1', god: qp.get('god') === '1', wave: parseInt(qp.get('wave'), 10) || 0, level: Math.max(0, (parseInt(qp.get('level'), 10) || 1) - 1), theme: qp.get('theme') || '', lab: qp.get('lab') === '1', boxes: qp.get('boxes') === '1' };
  G.C = C;
  G.settings = S;
})((window.SGS = window.SGS || {}));
