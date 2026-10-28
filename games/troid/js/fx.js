/* Pixel-snapped particles and effect helpers (all drawn as 1-3 px squares, no blur). */
(function (G) {
  'use strict';
  const F = { list: [] };
  G.fx = F;
  const add = (o) => {
    if (F.list.length > (G.settings.reduced ? 80 : 420)) return;               /* cap particle count so big explosions never stall a frame */
    o.t = 0; if (o.life === undefined) o.life = 20; if (o.vx === undefined) o.vx = 0; if (o.vy === undefined) o.vy = 0; if (o.g === undefined) o.g = 0; if (o.s === undefined) o.s = 2; if (o.c === undefined) o.c = '#fff';
    F.list.push(o);
  };
  F.reset = () => { F.list.length = 0; };
  F.puff = (x, y, n) => { for (let i = 0; i < n; i++) add({ x: x + (Math.random() - 0.5) * 8, y, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.5, life: 14 + Math.random() * 8, s: 2, c: i % 2 ? '#8ea2d2' : '#566cac', g: -0.01 }); };
  F.ring = (x, y) => { for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283; add({ x, y, vx: Math.cos(a) * 1.6, vy: Math.sin(a) * 0.9, life: 12, s: 1, c: i % 2 ? '#86f0f2' : '#f2ffff' }); } };
  F.flash = (x, y, c, r) => { add({ x, y, life: 4, s: r, c, flash: true }); };
  F.spark = (x, y, c) => add({ x, y, vx: (Math.random() - 0.5) * 1.5, vy: (Math.random() - 0.5) * 1.5, life: 10, s: 1, c });
  F.sparkBurst = (x, y, c, n) => { for (let i = 0; i < n; i++) add({ x, y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 10 + Math.random() * 6, s: 1, c }); };
  F.debris = (x, y, cols) => { for (let i = 0; i < 10; i++) add({ x: x + (Math.random() - 0.5) * 12, y: y + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 3, vy: -Math.random() * 3, g: 0.22, life: 28 + Math.random() * 12, s: i % 3 ? 2 : 3, c: cols[i % cols.length] }); };
  F.boom = (x, y, r) => { add({ x, y, life: 8, s: Math.round(r * 0.5), c: '#fff6a0', flash: true }); for (let i = 0; i < r; i++) { const a = Math.random() * 6.283, v = 0.6 + Math.random() * 2.4; add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 14 + Math.random() * 12, s: Math.random() < 0.4 ? 3 : 2, c: ['#fff6a0', '#ffd24a', '#ff7a2a', '#d8688a'][Math.floor(Math.random() * 4)] }); } };
  F.update = function () {
    const L = F.list; let w = 0;
    for (let i = 0; i < L.length; i++) { const p = L[i]; p.t++; p.x += p.vx; p.y += p.vy; p.vy += p.g; if (p.t < p.life) L[w++] = p; }
    L.length = w;                                                           /* in-place compaction: no new array every frame */
  };
  F.draw = function (ctx) {
    for (const p of F.list) {
      const a = 1 - p.t / p.life; if (a < 0.3 && p.t % 2) continue;
      ctx.fillStyle = p.c;
      if (p.flash) { const r = Math.round(p.s * (1 - p.t / p.life * 0.5)); ctx.fillRect(Math.round(p.x) - r, Math.round(p.y) - r + 1, r * 2, r * 2 - 2); ctx.fillRect(Math.round(p.x) - r + 1, Math.round(p.y) - r, r * 2 - 2, r * 2); }
      else ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s);
    }
  };
})((window.SGS = window.SGS || {}));
