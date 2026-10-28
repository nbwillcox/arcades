/* Settings, difficulty tables, high scores and progress. */
(function (G) {
  'use strict';
  G.C = {
    IH: 240,           // internal render height in art pixels (rooms are 30 tiles tall)
    TILE: 8, ROWS: 30, MINCOLS: 32, MAXCOLS: 80,
    REPO: 'https://github.com/nbwillcox/SpaceBobble',
    EXTEND_AT: [30000], EXTEND_EVERY: 70000,
    DIFF: [
      { name: 'EASY', foe: 0.82, trap: 9, hurry: 62, lives: 5, cont: 5, hint: 'More lives, slower aliens, bubbles hold longer.' },
      { name: 'NORMAL', foe: 1.0, trap: 7, hurry: 46, lives: 3, cont: 3, hint: 'The classic balance.' },
      { name: 'HARD', foe: 1.22, trap: 5.4, hurry: 33, lives: 3, cont: 1, hint: 'Fast aliens, short bubbles, early hurry-up.' },
    ],
  };
  const KEY = 'spacebobble.settings.v1', HKEY = 'spacebobble.scores.v1', PKEY = 'spacebobble.progress.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, shake: true, reduced: false, gamepad: true };
  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try { const raw = localStorage.getItem(KEY); if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; } } catch (e) { /* storage unavailable */ }
  S.save = function () { try { const o = {}; for (const k in defaults) o[k] = S[k]; localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) { /* ignore */ } };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  G.settings = S;

  /* top-10 arcade table */
  const SC = { list: [['NBW', 120000, 40], ['ACE', 80000, 28], ['BUB', 52000, 20], ['O2X', 34000, 14], ['SPC', 22000, 10], ['MOO', 14000, 7], ['ZAP', 9000, 5], ['POP', 5000, 3], ['AAA', 2500, 2], ['ZZZ', 1000, 1]], lastName: '' };
  try { const raw = localStorage.getItem(HKEY); if (raw) { const o = JSON.parse(raw); if (Array.isArray(o.list)) SC.list = o.list; SC.lastName = o.lastName || ''; } } catch (e) { /* ignore */ }
  const saveScores = () => { try { localStorage.setItem(HKEY, JSON.stringify({ list: SC.list, lastName: SC.lastName })); } catch (e) { /* ignore */ } };
  SC.best = () => SC.list[0][1];
  SC.qualifies = (score) => score > 0 && (SC.list.length < 10 || score > SC.list[SC.list.length - 1][1]);
  SC.add = (name, score, level) => { SC.lastName = name; SC.list.push([name, score, level]); SC.list.sort((a, b) => b[1] - a[1]); SC.list = SC.list.slice(0, 10); saveScores(); return SC.list.findIndex((r) => r[0] === name && r[1] === score); };
  G.scores = SC;

  /* progress: hard mode unlock is not used (all difficulties open), but the true ending and EXTEND tally are remembered */
  const PR = { cleared: false, trueEnding: false, bestLevel: 0 };
  try { const raw = localStorage.getItem(PKEY); if (raw) Object.assign(PR, JSON.parse(raw)); } catch (e) { /* ignore */ }
  PR.save = function () { try { localStorage.setItem(PKEY, JSON.stringify({ cleared: PR.cleared, trueEnding: PR.trueEnding, bestLevel: PR.bestLevel })); } catch (e) { /* ignore */ } };
  G.progress = PR;
})((window.SGS = window.SGS || {}));
