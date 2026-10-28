/* Constants, physics tuning and the saved settings. World units are tiles: one tile is 1 x 1, heights are in the same units. */
(function (G) {
  'use strict';
  const C = {
    REPO: 'https://github.com/nbwillcox/SpaceMarble',
    TW: 64, TH: 32, ZS: 30,                       /* projection at zoom 1: tile width / height in pixels and pixels per unit of height */
    /* marble physics (units and seconds) */
    R: 0.34,                                      /* marble radius */
    ACC: 13.5,                                    /* thrust from full tilt */
    G_AIR: 26,                                    /* gravity while airborne */
    G_SLOPE: 15,                                  /* how hard a slope pulls */
    FRIC: 1.35,                                   /* rolling resistance on plain tiles */
    AIR_CTL: 0.22,                                /* how much steering survives in the air */
    MAXV: 15.5,
    STEPH: 0.3,                                   /* a rise this small is just rolled over, anything taller is a wall */
    RAIL_T: 0.14, RAIL_H: 0.62,                   /* guard rail thickness and height */
    LAUNCH: 2.6,                                  /* drop in climb rate across a crest that throws the marble into the air */
    HIT_SOFT: 6.2, HIT_HARD: 9.3, HIT_BREAK: 13.2,/* landing speeds: thud, crack, shatter */
    START_TIME_BONUS: 100,
    EXTRA_TIME_CAP: 25,
    TIME_CRYSTAL: 5,
    TOTAL_LEVELS: 6,
  };
  /* surface kinds */
  C.S = { NORMAL: 0, ICE: 1, GOO: 2, BOOST: 3, CONVEY: 4, ACID: 5, CRUMBLE: 6, BOUNCE: 7, GOAL: 8, START: 9, GLASS: 10 };

  const KEY = 'spacemarble.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false, control: 'auto', tiltSens: 1, tiltInvert: false, mouseSteer: true, trail: true };
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
  try { if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true; } catch (e) { /* ignore */ }
  let qp = null;
  try { qp = new URLSearchParams(location.search); } catch (e) { qp = new URLSearchParams(''); }
  G.debug = { level: parseInt(qp.get('level'), 10) || 0, god: qp.get('god') === '1', bot: qp.get('bot') === '1', time: parseFloat(qp.get('time')) || 0, at: qp.get('at') === null ? -1 : parseFloat(qp.get('at')), zoom: parseFloat(qp.get('zoom')) || 1 };
  G.C = C;
  G.settings = S;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));

