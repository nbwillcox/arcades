/* Local top-10 high score tables (browser localStorage), one per mode. */
(function (G) {
  'use strict';
  const NAME_KEY = 'spacefrogger.lastname';
  const Sc = { mode: 'classic', lists: { classic: [], endless: [] } };
  const SEEDS = {
    classic: [['NBW', 40000, 12], ['MJ', 30000, 9], ['ACE', 22000, 7], ['FRG', 15000, 6], ['HOP', 10000, 4], ['LIL', 6000, 3], ['ZAP', 3500, 2], ['BIT', 2000, 2], ['PIX', 1000, 1], ['OWL', 400, 1]],
    endless: [['NBW', 4200, 420], ['MJ', 3000, 300], ['ACE', 2200, 220], ['FRG', 1500, 150], ['HOP', 1000, 100], ['LIL', 700, 70], ['ZAP', 450, 45], ['BIT', 300, 30], ['PIX', 150, 15], ['OWL', 60, 6]],
  };
  const seed = (m) => SEEDS[m].map((a) => ({ name: a[0].slice(0, 3), score: a[1], stage: a[2] }));
  const key = (m) => 'spacefrogger.scores.' + m + '.v1';

  Sc.load = function () {
    for (const m of ['classic', 'endless']) {
      try {
        const raw = localStorage.getItem(key(m)), arr = raw ? JSON.parse(raw) : null;
        Sc.lists[m] = Array.isArray(arr) && arr.length ? arr.filter((r) => r && typeof r.score === 'number').slice(0, 10) : seed(m);
      } catch (e) { Sc.lists[m] = seed(m); }
    }
    Sc.list = Sc.lists[Sc.mode];
  };
  Sc.setMode = function (m) { Sc.mode = m === 'endless' ? 'endless' : 'classic'; Sc.list = Sc.lists[Sc.mode]; };
  Sc.save = function () { try { localStorage.setItem(key(Sc.mode), JSON.stringify(Sc.list)); } catch (e) { /* ignore */ } };
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
  Sc.lastName = (function () { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } })();
  Sc.load();
  G.scores = Sc;
})((window.SGS = window.SGS || {}));
