/* Trackside scenery sprites per world, planted along the circuit. */
(function (G) {
  'use strict';
  const PX = G.px, Pix = PX.Pix, rgb = PX.rgb, PR = {};
  G.props = PR;
  const rp = (a) => a.map(rgb);
  const mk = (w, h, fn) => { const p = new Pix(w, h); fn(p, (fn2) => { const m = new Pix(w, h); fn2(m); return m; }); const s = PX.sprite(p, w >> 1, h); return { c: s.c, wu: w * 0.9 }; };
  const sh = (p, m, ramp, depth) => p.shade3d(m, 0, 0, ramp, { depth: depth || 4 });
  const SETS = [];
  SETS[0] = () => [
    mk(10, 44, (p, M) => { p.rect(4, 8, 2, 36, rgb('#3a2a78')); p.rect(4, 8, 1, 36, rgb('#6a4ac0')); sh(p, M((m) => m.ell(5, 6, 4, 4, 1)), rp(['#ffffff', '#ffc0f0', '#ff3ad0', '#a01a98', '#5a0a60']), 3); p.rect(2, 9, 6, 1, rgb('#ff3ad0')); }),
    mk(32, 40, (p, M) => { p.rect(15, 20, 2, 20, rgb('#2a2060')); p.rect(2, 2, 28, 20, rgb('#10102a')); p.rect(3, 3, 26, 18, rgb('#1a1a4a')); for (let i = 0; i < 5; i++) p.rect(5 + i * 5, 5, 3, 14, rgb(i % 2 ? '#3affea' : '#ff3ad0')); p.rect(2, 2, 28, 1, rgb('#6a6aff')); }),
    mk(22, 64, (p) => { p.rect(0, 0, 22, 64, rgb('#1a1850')); p.rect(0, 0, 3, 64, rgb('#2a2a78')); p.rect(19, 0, 3, 64, rgb('#0e0c30')); for (let y = 4; y < 60; y += 4) for (let x = 5; x < 18; x += 3) if (((x * 7 + y * 3) % 5) < 2) p.set(x, y, rgb(((x + y) & 1) ? '#ffe27a' : '#8affff')); p.rect(9, 0, 4, 2, rgb('#ff3a3a')); }),
  ];
  SETS[1] = () => [
    mk(22, 40, (p, M) => { for (const [x, h, w] of [[11, 38, 6], [5, 24, 5], [17, 28, 5]]) sh(p, M((m) => m.poly([[x - w / 2, 40], [x, 40 - h], [x + w / 2, 40]], 1)), rp(['#ffffff', '#d8f4ff', '#8ad0ff', '#4a8ad8', '#26468c']), 2); }),
    mk(24, 36, (p, M) => { p.rect(11, 26, 3, 10, rgb('#5a3a28')); for (let i = 0; i < 3; i++) sh(p, M((m) => m.poly([[12 - 9 + i * 1.5, 28 - i * 9], [12, 14 - i * 9 - 4 + 8], [12 + 9 - i * 1.5, 28 - i * 9]], 1)), rp(['#ffffff', '#e8f6ff', '#9ad0c8', '#3a7a6a', '#1a4a40']), 2); }),
    mk(10, 30, (p, M) => { p.rect(4, 6, 2, 24, rgb('#6a8ac0')); sh(p, M((m) => m.disc(5, 5, 4, 1)), rp(['#ffffff', '#c8f8ff', '#6ae0ff', '#2a8ad8', '#144a98']), 3); }),
  ];
  SETS[2] = () => [
    mk(20, 44, (p, M) => { sh(p, M((m) => m.poly([[0, 44], [8, 4], [12, 8], [20, 44]], 1)), rp(['#7a5a60', '#4a3440', '#2a1c26', '#160c14', '#0a0509']), 4); for (const [x, y] of [[9, 20], [10, 28], [8, 34]]) p.rect(x, y, 2, 4, rgb('#ff8a2a')); p.rect(9, 6, 2, 2, rgb('#ffd060')); }),
    mk(12, 26, (p, M) => { p.rect(5, 12, 2, 14, rgb('#3a2a30')); sh(p, M((m) => m.poly([[2, 14], [10, 14], [8, 4], [6, 0], [4, 4]], 1)), rp(['#fff6d0', '#ffd870', '#ffa030', '#e85a1a', '#a02a10']), 3); }),
    mk(26, 18, (p, M) => { sh(p, M((m) => m.ell(13, 11, 12, 7, 1)), rp(['#7a5a60', '#4a3440', '#2a1c26', '#160c14', '#0a0509']), 5); p.rect(7, 12, 5, 1, rgb('#ff8a2a')); p.rect(15, 9, 4, 1, rgb('#ff8a2a')); }),
  ];
  SETS[3] = () => [
    mk(30, 48, (p, M) => { p.rect(14, 14, 3, 34, rgb('#176068')); p.rect(14, 14, 1, 34, rgb('#3ab0a0')); sh(p, M((m) => { m.ell(15, 12, 14, 5, 1); m.ell(15, 13, 11, 4, 1); }), rp(['#ff9ac0', '#3cc0a8', '#1f8a84', '#145a68', '#0b3248']), 4); for (const x of [6, 12, 20, 25]) p.set(x, 18, rgb('#7affd8')); }),
    mk(24, 16, (p, M) => { for (let i = 0; i < 5; i++) sh(p, M((m) => m.poly([[12, 16], [2 + i * 5, 4 + (i % 2) * 3], [4 + i * 5, 16]], 1)), rp(['#a8ff9a', '#4ad07a', '#1f8a46', '#146a30', '#0a3a1c']), 2); }),
    mk(12, 24, (p, M) => { p.rect(5, 10, 2, 14, rgb('#1f8a46')); sh(p, M((m) => m.disc(6, 6, 5, 1)), rp(['#ffffff', '#ffc0f0', '#ff5ad0', '#b02a98', '#601a58']), 3); }),
  ];
  SETS[4] = () => [
    mk(10, 52, (p) => { p.rect(4, 6, 2, 46, rgb('#5a6aa0')); p.rect(1, 20, 8, 1, rgb('#5a6aa0')); p.rect(2, 34, 6, 1, rgb('#5a6aa0')); p.rect(3, 0, 4, 2, rgb('#ff3a3a')); p.rect(4, 2, 2, 4, rgb('#8a9ad0')); }),
    mk(10, 26, (p) => { for (let y = 0; y < 26; y += 4) p.rect(2, y, 6, 2, rgb('#ffd24a')), p.rect(2, y + 2, 6, 2, rgb('#161a30')); p.rect(2, 0, 6, 1, rgb('#ffffff')); }),
    mk(30, 20, (p) => { for (const [x, y, w, c] of [[0, 8, 14, '#c0462a'], [14, 8, 14, '#2a6ac0'], [4, 0, 14, '#2aa070']]) { p.rect(x, y, w, 12, rgb(c)); p.rect(x, y, w, 2, PX.mix(rgb(c), rgb('#ffffff'), 0.35)); for (let q = 3; q < w; q += 3) p.rect(x + q, y + 3, 1, 8, PX.mix(rgb(c), rgb('#000000'), 0.35)); } }),
  ];
  const cache = {};
  PR.set = (world) => cache[world] || (cache[world] = SETS[world]());
})((window.SGS = window.SGS || {}));
