/* Constants, settings, high scores and progress. */
(function (G) {
  'use strict';
  G.C = {
    COLS: 10, ROWS: 22, VIS: 20, REPO: 'https://github.com/nbwillcox/SpaceTris',
    LOCK: 0.5, MAXRESETS: 15, CLEAR_T: 0.42,
    OPPONENTS: [
      { name: 'SCOUT DRONE', pps: 0.75, err: 0.28, hold: false },
      { name: 'ROGUE PIRATE', pps: 1.2, err: 0.14, hold: false },
      { name: 'STATION CMDR', pps: 1.9, err: 0.06, hold: true },
      { name: 'THE OVERMIND', pps: 2.9, err: 0.015, hold: true },
    ],
  };
  const KEY = 'spacetris.settings.v1', HKEY = 'spacetris.scores.v1', PKEY = 'spacetris.progress.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, shake: true, reduced: false, gamepad: true, ghost: true, das: 0.167, arr: 0.033, touch: 'auto', quality: 1 };
  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try { const raw = localStorage.getItem(KEY); if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; } } catch (e) { /* storage unavailable */ }
  S.save = function () { try { const o = {}; for (const k in defaults) o[k] = S[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  G.settings = S;

  /* score tables keyed by mode + ruleset: marathon / ultra rank by score (high first), sprint by time (low first) */
  const SC = { tables: {}, lastName: '' };
  try { const raw = localStorage.getItem(HKEY); if (raw) { const o = JSON.parse(raw); if (o.tables) SC.tables = o.tables; SC.lastName = o.lastName || ''; } } catch (e) { /* ignore */ }
  const save = () => { try { localStorage.setItem(HKEY, JSON.stringify({ tables: SC.tables, lastName: SC.lastName })); } catch (e) { /* ignore */ } };
  const seedList = (key) => (key.indexOf('sprint') === 0 ? [['NBW', 62], ['ACE', 78], ['ORB', 95], ['SKY', 118], ['ZAP', 150]] : key.indexOf('ultra') === 0 ? [['NBW', 52000], ['ACE', 38000], ['ORB', 26000], ['SKY', 16000], ['ZAP', 9000]] : [['NBW', 180000], ['ACE', 120000], ['ORB', 80000], ['SKY', 50000], ['ZAP', 30000], ['VEX', 18000], ['BIT', 9000], ['NOV', 5000], ['AAA', 2500], ['ZZZ', 1000]]);
  SC.list = (key) => SC.tables[key] || (SC.tables[key] = seedList(key));
  SC.isTime = (key) => key.indexOf('sprint') === 0;
  SC.qualifies = (key, v) => { const l = SC.list(key), t = SC.isTime(key); if (!(v > 0)) return false; return l.length < (t ? 5 : 10) || (t ? v < l[l.length - 1][1] : v > l[l.length - 1][1]); };
  SC.add = (key, name, v) => { const t = SC.isTime(key), l = SC.list(key); SC.lastName = name; l.push([name, v]); l.sort((a, b) => (t ? a[1] - b[1] : b[1] - a[1])); SC.tables[key] = l.slice(0, t ? 5 : 10); save(); return SC.tables[key].findIndex((r) => r[0] === name && r[1] === v); };
  SC.best = (key) => SC.list(key)[0][1];
  G.scores = SC;
  const PR = { vsWins: [0, 0, 0, 0] };
  try { const raw = localStorage.getItem(PKEY); if (raw) Object.assign(PR, JSON.parse(raw)); } catch (e) { /* ignore */ }
  PR.save = function () { try { localStorage.setItem(PKEY, JSON.stringify({ vsWins: PR.vsWins })); } catch (e) { /* ignore */ } };
  G.progress = PR;
})((window.SGS = window.SGS || {}));
