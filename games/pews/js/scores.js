/* Local top-10 high score table (browser localStorage). */
(function (G) {
  'use strict';
  const KEY = 'spacesidepews.scores.v1';
  const NAME_KEY = 'spacesidepews.lastname';
  const Sc = { list: [] };

  const seed = [
    ['NBW', 150000, 14], ['ACE', 100000, 11], ['VIC', 70000, 8], ['SPC', 45000, 6], ['PLT', 28000, 5],
    ['NOVA', 16000, 4], ['ZAP', 9000, 3], ['BIT', 5000, 2], ['PIX', 2500, 2], ['OWL', 1000, 1],
  ].map((a) => ({ name: a[0].slice(0, 3), score: a[1], stage: a[2] }));

  Sc.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : null;
      Sc.list = Array.isArray(arr) && arr.length ? arr.filter((r) => r && typeof r.score === 'number').slice(0, 10) : seed.slice();
    } catch (e) { Sc.list = seed.slice(); }
    return Sc.list;
  };
  Sc.save = function () { try { localStorage.setItem(KEY, JSON.stringify(Sc.list)); } catch (e) { /* ignore */ } };
  Sc.best = function () { return Sc.list.length ? Sc.list[0].score : 0; };
  Sc.qualifies = function (score) {
    return score > 0 && (Sc.list.length < 10 || score > Sc.list[Sc.list.length - 1].score);
  };
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
  Sc.lastName = (function () { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } })();
  Sc.load();
  G.scores = Sc;
})((window.SGS = window.SGS || {}));
