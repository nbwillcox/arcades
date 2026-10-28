/* Local top-10 high score table, per-race best times and race unlocks (browser localStorage). */
(function (G) {
  'use strict';
  const KEY = 'spacemarble.scores.v1', NAME_KEY = 'spacemarble.lastname', PROG_KEY = 'spacemarble.progress.v1';
  const Sc = { list: [], prog: { unlocked: 1, best: {} } };

  const seed = [
    ['NBW', 120000, 6], ['ACE', 80000, 5], ['ZAP', 52000, 4], ['PIP', 34000, 3], ['MAX', 21000, 3],
    ['NEO', 12000, 2], ['ZIP', 7000, 2], ['CAT', 4000, 1], ['RED', 2000, 1], ['OWL', 800, 1],
  ].map((a) => ({ name: a[0].slice(0, 3), score: a[1], stage: a[2] }));

  Sc.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : null;
      Sc.list = Array.isArray(arr) && arr.length ? arr.filter((r) => r && typeof r.score === 'number').slice(0, 10) : seed.slice();
    } catch (e) { Sc.list = seed.slice(); }
    try { const p = JSON.parse(localStorage.getItem(PROG_KEY) || 'null'); if (p && p.unlocked) Sc.prog = { unlocked: Math.min(6, p.unlocked | 0), best: p.best || {} }; } catch (e) { /* ignore */ }
    return Sc.list;
  };
  Sc.save = function () { try { localStorage.setItem(KEY, JSON.stringify(Sc.list)); } catch (e) { /* ignore */ } };
  Sc.saveProg = function () { try { localStorage.setItem(PROG_KEY, JSON.stringify(Sc.prog)); } catch (e) { /* ignore */ } };
  Sc.best = function () { return Sc.list.length ? Sc.list[0].score : 0; };
  Sc.qualifies = function (score) { return score > 0 && (Sc.list.length < 10 || score > Sc.list[Sc.list.length - 1].score); };
  Sc.add = function (name, score, stage) {
    name = String(name || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA';
    Sc.list.push({ name, score: Math.floor(score), stage, date: Date.now() });
    Sc.list.sort((a, b) => b.score - a.score);
    Sc.list.length = Math.min(10, Sc.list.length);
    Sc.save();
    Sc.lastName = name;
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignore */ }
    return Sc.list.findIndex((r) => r.name === name && r.score === Math.floor(score));
  };
  /* a race was finished: unlock the next one and keep the best time */
  Sc.raceDone = function (id, timeLeft) {
    if (id + 1 > Sc.prog.unlocked) Sc.prog.unlocked = Math.min(6, id + 1);
    const prev = Sc.prog.best[id];
    const isBest = prev === undefined || timeLeft > prev;
    if (isBest) Sc.prog.best[id] = +timeLeft.toFixed(2);
    Sc.saveProg();
    return isBest;
  };
  Sc.lastName = (function () { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } })();
  Sc.load();
  G.scores = Sc;
})((window.SGS = window.SGS || {}));
