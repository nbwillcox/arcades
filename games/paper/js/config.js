(function (G) {
  'use strict';
  const C = {
    W: 960, H: 540,
    REPO: 'https://github.com/nbwillcox/spacePaper',
    LOT: 100,            /* z length of one lot */
    WALL: 158,           /* |x| of the street-facing house wall */
    CURB: 58,            /* |x| where the street ends */
    SIDEW: 86,           /* |x| where the sidewalk ends and lawn begins */
    EDGE: 232,           /* |x| of the platform edge */
    RIDE_MAX: 148,       /* furthest the rider can go sideways */
    CRUISE: 62, FAST: 108, SLOW: 30, SUPER: 175,
    G: 260, TV: 165, TVY: 92,   /* paper gravity, lateral speed, lift */
    DAYS: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'],
    SCORE: { mailbox: 100, porch: 250, patio: 150, window: 150, nsMail: 50, door: 50, dog: 100, gnome: 75, kid: 50, car: 25, ufo: 300, meteor: 200, hop: 25, ramp: 500, hoop: 300, perfect: 1000, bundle: 10 },
  };
  const KEY = 'spacepaper.settings.v1';
  const defaults = { master: 0.8, music: 0.5, sfx: 0.9, guide: true, shake: true, reduced: false, difficulty: 'normal' };
  const S = Object.assign({}, defaults);
  let had = false;
  try { const raw = localStorage.getItem(KEY); if (raw) { Object.assign(S, JSON.parse(raw)); had = true; } } catch (e) { /* no storage */ }
  S.save = function () { try { const o = {}; for (const k in defaults) o[k] = S[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  if (!had && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  G.C = C; G.settings = S;
})((window.SGS = window.SGS || {}));
