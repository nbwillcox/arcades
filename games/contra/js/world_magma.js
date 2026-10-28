/* World 3: MAGMA FIELDS - smoky red sky, a dying sun, volcanoes, basalt columns and lava rivers. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix, rgb = PX.rgb;
  const A = GFX.art, Wd = A.world, NW = Wd.NW, NH = Wd.NH;
  function haze(p, cx, cy, r0, r1, c, amt) {
    const cs = rgb(c);
    for (let y = Math.max(0, cy - r1); y < Math.min(NH, cy + r1); y++) for (let x = cx - r1; x < cx + r1; x++) { const d = Math.hypot(x - cx, y - cy); if (d > r0 && d < r1) { const f = 1 - (d - r0) / (r1 - r0); const xx = ((x % NW) + NW) % NW; if (PX.dither(xx, y, f * f * amt)) p.set(xx, y, cs); } }
  }
  function volcano(p, cx, baseY, w, h, rnd) {
    const m = new Pix(NW, NH);
    for (const ox of [-NW, 0, NW]) m.poly([[cx + ox - w, baseY], [cx + ox - w * 0.18, baseY - h], [cx + ox - w * 0.08, baseY - h + 4], [cx + ox + w * 0.08, baseY - h + 4], [cx + ox + w * 0.18, baseY - h], [cx + ox + w, baseY]], 1);
    p.paint(m, 0, 0, ['#5a2a30', '#3a1a24', '#24101a', '#160a12', '#0a0509'].map(rgb), 5);
    for (const ox of [-NW, 0, NW]) {
      p.rect(cx + ox - w * 0.09, baseY - h + 2, w * 0.18, 2, rgb('#ffd060')); p.rect(cx + ox - w * 0.12, baseY - h + 3, w * 0.24, 1, rgb('#ff7a1a'));
      for (let i = 0; i < 3; i++) { let x = cx + ox + (rnd() - 0.5) * w * 0.1, y = baseY - h + 4; const dir = rnd() < 0.5 ? -1 : 1; for (let q = 0; q < h * 0.7; q++) { y += 1; x += dir * 0.28 * (0.6 + rnd() * 0.5); p.set(Math.round(x), Math.round(y), rgb(q % 5 < 3 ? '#ff7a1a' : '#c0401a')); } }
    }
  }
  A.layerGens[2] = [
    function (p, rnd) {
      Wd.grad(p, 0, NH, [[0, '#12040a'], [0.28, '#3a0c14'], [0.52, '#8a2410'], [0.76, '#e0601a'], [1, '#ffb040']]);
      haze(p, 190, 150, 44, 96, '#ff8a2a', 0.5); haze(p, 190, 150, 44, 66, '#ffc060', 0.7);
      Wd.sphere(p, 190, 150, 42, ['#fff6d0', '#ffd870', '#ffa030', '#e85a1a', '#a02a10'], 0.35, 5);
      Wd.stars(p, rnd, 40, 60, ['#ffb890', '#ffd8c0']);
      const a = Wd.prof(4, 4, 3), ya = new Float32Array(NW); for (let x = 0; x < NW; x++) ya[x] = 190 - a[x] * 34;
      Wd.ridge(p, ya, NH, '#4a1418', '#8a2a14', '#d8602a', '#a8401c', 0.8);
      volcano(p, 380, 214, 90, 96, rnd); volcano(p, 60, 214, 70, 64, rnd);
      const sm = new Pix(NW, NH); for (let i = 0; i < 16; i++) { const x = rnd() * NW, y = 20 + rnd() * 100, r = 10 + rnd() * 22; for (const ox of [-NW, 0, NW]) { sm.ell(x + ox, y, r * 1.6, r * 0.5, 1); sm.ell(x + ox + r * 0.4, y - r * 0.2, r, r * 0.5, 1); } }
      const tmp = new Pix(NW, NH); tmp.paint(sm, 0, 0, ['#8a3a30', '#52201e', '#2e1016', '#1a0a10', '#0c0408'].map(rgb), 4);
      for (let i = 0; i < NW * NH; i++) if (tmp.d[i] && PX.dither(i % NW, (i / NW) | 0, 0.78)) p.d[i] = tmp.d[i];
    },
    function (p, rnd) {
      const h = Wd.prof(31, 5, 3), ys = new Float32Array(NW); for (let x = 0; x < NW; x++) ys[x] = 196 - h[x] * 22;
      Wd.ridge(p, ys, NH, '#2a121a', '#10060c', '#ff7a2a', '#c0481c', 0.6);
      const m = new Pix(NW, NH);
      for (let i = 0; i < 26; i++) { const x = rnd() * NW, w = 5 + rnd() * 7, hg = 18 + rnd() * 44; for (const ox of [-NW, 0, NW]) m.rect(x + ox - w / 2, 204 - hg, w, hg + 2, 1); }
      p.paint(m, 0, 0, ['#8a3a30', '#52241e', '#34161a', '#1e0c12', '#0c0509'].map(rgb), 3);
      for (let x = 0; x < NW; x++) { const y = 200 + Math.round(Math.sin(x * 0.4 + PX.hash(x >> 3, 1, 2) * 4) * 0.8); p.set(x, y, rgb(x % 7 < 3 ? '#ffd060' : '#ff8a2a')); p.set(x, y + 1, rgb('#e0541a')); p.set(x, y + 2, rgb('#8a2810')); }
      for (let i = 0; i < 60; i++) { const x = Math.floor(rnd() * NW), y = 80 + Math.floor(rnd() * 120); if (!p.get(x, y)) p.set(x, y, rgb(rnd() < 0.5 ? '#ffb040' : '#ff7a1a')); }
    },
    function (p, rnd) {
      const dk = rgb('#0a0408'), li = [rgb('#c0481c'), rgb('#ff8a2a')], m = new Pix(NW, NH);
      for (let i = 0; i < 28; i++) { const x = (i + rnd() * 0.8) * (NW / 28), w = 3 + rnd() * 8, hg = 8 + rnd() * 34, lean = (rnd() - 0.5) * 10; for (const ox of [-NW, 0, NW]) m.poly([[x + ox - w, 226], [x + ox + lean - 1, 226 - hg], [x + ox + lean + 1, 226 - hg], [x + ox + w, 226]], 1); }
      for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) if (m.d[y * NW + x]) p.set(x, y, m.get(x - 1, y) ? dk : li[m.get(x - 1, y - 1) ? 0 : 1]);
      for (let i = 0; i < 34; i++) { const x = Math.floor(rnd() * NW), y = 170 + Math.floor(rnd() * 50); if (!p.get(x, y)) p.set(x, y, rgb(rnd() < 0.5 ? '#ffb040' : '#ff5a1a')); }
      p.rect(0, 223, NW, 47, dk);
    },
  ];
})((window.SGS = window.SGS || {}));
