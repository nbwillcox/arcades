/* Settings, saved records and shared constants. */
(function (G) {
  'use strict';
  G.C = {
    IH: 270,                 // internal render height in art pixels (width follows the window aspect)
    MAP: 2048,               // track texture size (1 texel = 1 world unit)
    STEP: 8,                 // track sample spacing in world units
    LAPS: 3,
    REPO: 'https://github.com/nbwillcox/FSpaceZero',
  };
  const KEY = 'fspacezero.settings.v1', RKEY = 'fspacezero.records.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, shake: true, reduced: false, gamepad: true };
  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try { const raw = localStorage.getItem(KEY); if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; } } catch (e) { /* storage unavailable */ }
  S.save = function () { try { const o = {}; for (const k in defaults) o[k] = S[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  G.settings = S;

  /* records: best race time / best lap per track, time-trial ghosts, cup results */
  const R = { tracks: {}, cups: {}, ghosts: {} };
  try { const raw = localStorage.getItem(RKEY); if (raw) Object.assign(R, JSON.parse(raw)); } catch (e) { /* ignore */ }
  R.save = function () { try { localStorage.setItem(RKEY, JSON.stringify({ tracks: R.tracks, cups: R.cups, ghosts: R.ghosts })); } catch (e) { /* ignore */ } };
  /* returns { race: bool, lap: bool } for new records */
  R.submit = function (id, raceT, lapT) {
    const t = R.tracks[id] || (R.tracks[id] = { race: null, lap: null }), out = { race: false, lap: false };
    if (raceT && (t.race === null || raceT < t.race)) { t.race = raceT; out.race = true; }
    if (lapT && (t.lap === null || lapT < t.lap)) { t.lap = lapT; out.lap = true; }
    R.save();
    return out;
  };
  R.cup = function (key, pts, rank) { const c = R.cups[key]; if (!c || pts > c.pts) { R.cups[key] = { pts, rank }; R.save(); return true; } return false; };
  G.records = R;
})((window.SGS = window.SGS || {}));
