/* Settings, high scores and progress (all in localStorage). */
(function (G) {
  'use strict';
  G.C = { REPO: 'https://github.com/nbwillcox/spacejong', COMBO_WIN: 3.6, INTRO: 1.5 };
  const KEY = 'spacejong.settings.v1', HKEY = 'spacejong.scores.v1', PKEY = 'spacejong.progress.v1';
  const defaults = { master: 0.8, music: 0.5, sfx: 0.9, shake: true, reduced: false, tilt: true, glass: 'high', dim: true, gamepad: true, quality: 1 };
  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try { const raw = localStorage.getItem(KEY); if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; } } catch (e) { /* storage unavailable */ }
  S.save = function () { try { const o = {}; for (const k in defaults) o[k] = S[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  G.settings = S;

  /* Timed scores per layout (top 5, highest first) */
  const SC = { tables: {}, lastName: '' };
  try { const raw = localStorage.getItem(HKEY); if (raw) { const o = JSON.parse(raw); if (o.tables) SC.tables = o.tables; SC.lastName = o.lastName || ''; } } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(HKEY, JSON.stringify({ tables: SC.tables, lastName: SC.lastName })); } catch (e) { /* ignore */ } };
  const seed = (n) => [['NBW', 190], ['ACE', 140], ['ORB', 105], ['SKY', 75], ['ZAP', 50]].map((r) => [r[0], Math.round(r[1] * n / 100) * 100]);
  SC.list = (id) => SC.tables[id] || (SC.tables[id] = seed(G.layoutById(id).n));
  SC.qualifies = (id, v) => { const l = SC.list(id); return v > 0 && (l.length < 5 || v > l[l.length - 1][1]); };
  SC.add = (id, name, v) => { const l = SC.list(id); SC.lastName = name; l.push([name, v]); l.sort((a, b) => b[1] - a[1]); SC.tables[id] = l.slice(0, 5); save(); return SC.tables[id].findIndex((r) => r[0] === name && r[1] === v); };
  SC.best = (id) => SC.list(id)[0][1];
  G.scores = SC;

  /* Zen clears: best time per layout */
  const PR = { zen: {}, timed: {} };
  try { const raw = localStorage.getItem(PKEY); if (raw) Object.assign(PR, JSON.parse(raw)); } catch (e) { /* ignore */ }
  PR.save = function () { try { localStorage.setItem(PKEY, JSON.stringify({ zen: PR.zen, timed: PR.timed })); } catch (e) { /* ignore */ } };
  PR.clear = function (mode, id, time) { const t = PR[mode]; if (!(id in t) || time < t[id]) t[id] = Math.round(time); PR.save(); };
  G.progress = PR;
})((window.SGS = window.SGS || {}));
