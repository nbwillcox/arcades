/* World 4: HIVE WORLD - a living, veined cavern of bone ribs, egg sacs and tendrils. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix, rgb = PX.rgb;
  const A = GFX.art, Wd = A.world, NW = Wd.NW, NH = Wd.NH;
  function vein(p, rnd, x, y, ang, len, w, c1, c2, depth) {
    for (let q = 0; q < len; q++) {
      ang += (rnd() - 0.5) * 0.35; x += Math.cos(ang); y += Math.sin(ang);
      const xx = ((Math.round(x) % NW) + NW) % NW, yy = Math.round(y);
      p.set(xx, yy, rgb(c1)); if (w > 1) p.set(xx + 1, yy, rgb(c2)); if (w > 2) p.set(xx, yy + 1, rgb(c2));
      if (depth > 0 && rnd() < 0.035) vein(p, rnd, x, y, ang + (rnd() < 0.5 ? 0.9 : -0.9), len * 0.6, Math.max(1, w - 1), c1, c2, depth - 1);
    }
  }
  A.layerGens[3] = [
    function (p, rnd) {
      Wd.grad(p, 0, NH, [[0, '#14030f'], [0.5, '#30081f'], [1, '#52123a']]);
      const nz = PX.noise(77, 8);
      for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) { const v = nz(x / NW * 8, y * 0.045) * 0.6 + nz(x / NW * 16, y * 0.09) * 0.4; if (v > 0.58 && PX.dither(x, y, (v - 0.58) * 4)) p.set(x, y, rgb('#6a1c4c')); else if (v < 0.36 && PX.dither(x, y, (0.36 - v) * 4)) p.set(x, y, rgb('#1c0412')); }
      for (let i = 0; i < 5; i++) vein(p, rnd, rnd() * NW, rnd() * 40, 1.3 + (rnd() - 0.5) * 0.6, 90 + rnd() * 50, 3, '#8a2a60', '#b04682', 1);
      // distant rib arches: thick bone, dimmed into the wall
      const m = new Pix(NW, NH);
      for (let i = 0; i < 5; i++) { const cx = (i + 0.5) * (NW / 5), rx = 46 + rnd() * 8; for (const ox of [-NW, 0, NW]) { let px = null; for (let a = 0; a <= Math.PI + 0.001; a += 0.04) { const x = cx + ox + Math.cos(a) * rx, y = 222 - Math.sin(a) * 200, w = 5 + Math.sin(a) * 2; if (px) m.line(px[0], px[1], x, y, Math.round(w), 1); px = [x, y]; } } }
      const tmp = new Pix(NW, NH); tmp.paint(m, 0, 0, ['#e8c8b0', '#bc9484', '#8a5a66', '#5a2c44', '#381830'].map(rgb), 3);
      for (let i = 0; i < NW * NH; i++) if (tmp.d[i] && PX.dither(i % NW, (i / NW) | 0, 0.72)) p.d[i] = tmp.d[i];
      for (let i = 0; i < 50; i++) { const x = Math.floor(rnd() * NW), y = Math.floor(rnd() * 190); p.set(x, y, rgb(rnd() < 0.5 ? '#ff7ad0' : '#ffd0ee')); }
    },
    function (p, rnd) {
      const h = Wd.prof(41, 9, 3), ys = new Float32Array(NW); for (let x = 0; x < NW; x++) ys[x] = 196 - h[x] * 34;
      // sinew columns
      const cm = new Pix(NW, NH);
      for (let i = 0; i < 7; i++) { const x = (i + 0.3 + rnd() * 0.4) * (NW / 7), ph = rnd() * 6, w = 5 + rnd() * 4; for (let y = 80; y < 210; y++) for (const ox of [-NW, 0, NW]) cm.rect(x + ox + Math.sin(y * 0.06 + ph) * 4, y, w - Math.sin(y * 0.03) * 1.5, 1, 1); }
      p.paint(cm, 0, 0, ['#e0709c', '#b04478', '#7a2656', '#4a1238', '#2a0822'].map(rgb), 3);
      Wd.ridge(p, ys, NH, '#52163c', '#2a0a24', '#f06aa0', '#b83c78', 0.7);
      const em = new Pix(NW, NH);
      for (let i = 0; i < 22; i++) { const x = rnd() * NW, r = 4 + rnd() * 6, y = ys[Math.floor(x) % NW] + 2; for (const ox of [-NW, 0, NW]) { em.ell(x + ox, y - r * 0.5, r * 0.8, r, 1); } }
      p.paint(em, 0, 0, ['#ffe0b0', '#ffa86a', '#e0604a', '#962a4a', '#4a1236'].map(rgb), 3);
      for (let i = 0; i < 40; i++) { const x = Math.floor(rnd() * NW), y = 100 + Math.floor(rnd() * 100); if (!p.get(x, y)) p.set(x, y, rgb(rnd() < 0.5 ? '#ff7ad0' : '#ffe27a')); }
    },
    function (p, rnd) {
      const dk = rgb('#0c010a'), rim = [rgb('#c04886'), rgb('#ff9ac8')];
      for (let i = 0; i < 15; i++) {
        const x = (i + rnd() * 0.8) * (NW / 15), len = 30 + Math.floor(rnd() * 40), curl = (rnd() - 0.5) * 1.8, w0 = 5 + Math.floor(rnd() * 3);
        for (let q = 0; q < len; q++) {
          const u = q / len, bx = Math.round(x + Math.sin(u * 2.6) * curl * 12), by = 224 - q, w = Math.max(1, Math.round(w0 * (1 - u * 0.8)));
          for (let k = 0; k < w; k++) for (const ox of [-NW, 0, NW]) p.set(bx + k + ox, by, k === 0 ? rim[q > len * 0.7 ? 1 : 0] : dk);
          if (q % 7 === 3 && w > 1) for (const ox of [-NW, 0, NW]) p.set(bx + w + ox, by, rgb('#ffa0c8'));
        }
      }
      for (let i = 0; i < 30; i++) { const x = Math.floor(rnd() * NW), y = 180 + Math.floor(rnd() * 40); if (!p.get(x, y)) p.set(x, y, rgb(rnd() < 0.5 ? '#ff7ad0' : '#ffe27a')); }
      p.rect(0, 223, NW, 47, dk);
    },
  ];
})((window.SGS = window.SGS || {}));
