/* Loads the AI-generated pictures (title hero, game-over kid, boss portraits). Everything in the street itself is drawn procedurally. */
(function (G) {
  'use strict';
  const A = { boss: {}, ready: false };
  A.load = function () {
    const names = { rex: 'boss1', gorp: 'boss2', mower: 'boss3' };
    const jobs = Object.keys(names).map((k) => new Promise((res) => { const im = new Image(); im.onload = im.onerror = () => res(); im.decoding = 'async'; im.src = 'assets/' + names[k] + '.webp?v=1'; A.boss[k] = im; }));
    return Promise.all(jobs).then(() => { A.ready = true; });
  };
  G.art = A;
})((window.SGS = window.SGS || {}));
