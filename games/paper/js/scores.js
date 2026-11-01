(function (G) {
  'use strict';
  const KEY = 'spacepaper.scores.v1', NAME_KEY = 'spacepaper.lastname';
  const Sc = { list: [] };
  const seed = [['PAP', 250000, 4], ['BOY', 170000, 3], ['MJ', 110000, 3], ['NBW', 75000, 2], ['DOG', 48000, 2], ['ZAP', 30000, 1], ['NEB', 18000, 1], ['MOO', 10000, 1], ['PIX', 5000, 1], ['OWL', 2000, 1]]
    .map((a) => ({ name: a[0].slice(0, 3), score: a[1], stage: a[2] }));
  Sc.load = function () {
    try { const raw = localStorage.getItem(KEY), arr = raw ? JSON.parse(raw) : null; Sc.list = Array.isArray(arr) && arr.length ? arr.filter((r) => r && typeof r.score === 'number').slice(0, 10) : seed.slice(); } catch (e) { Sc.list = seed.slice(); }
  };
  Sc.save = function () { try { localStorage.setItem(KEY, JSON.stringify(Sc.list)); } catch (e) { /* ignore */ } };
  Sc.best = () => (Sc.list.length ? Sc.list[0].score : 0);
  Sc.qualifies = (s) => s > 0 && (Sc.list.length < 10 || s > Sc.list[Sc.list.length - 1].score);
  Sc.add = function (name, score, stage) {
    name = String(name || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'AAA';
    Sc.list.push({ name, score: Math.floor(score), stage, date: Date.now() });
    Sc.list.sort((a, b) => b.score - a.score); Sc.list.length = Math.min(10, Sc.list.length); Sc.save(); Sc.lastName = name;
    try { localStorage.setItem(NAME_KEY, name); } catch (e) { /* ignore */ }
    return Sc.list.findIndex((r) => r.name === name && r.score === Math.floor(score));
  };
  Sc.lastName = (function () { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } })();
  Sc.load();
  G.scores = Sc;
})((window.SGS = window.SGS || {}));
