/* World 2: ICE CAVERNS - deep blue cave, glowing crystals, light shafts, ice pillars. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix, rgb = PX.rgb;
  const A = GFX.art, Wd = A.world, NW = Wd.NW, NH = Wd.NH;
  const ICE = ['#effcff', '#a8e4ff', '#62a6ec', '#3a62ac', '#1e3472'].map(rgb);
  function crystal(p, x, y, w, h, tilt, ramp) {
    const m = new Pix(p.w, p.h);
    for (const ox of [-NW, 0, NW]) { m.poly([[x + ox - w / 2, y], [x + ox - w / 2 + tilt * 0.4, y - h * 0.8], [x + ox + tilt, y - h], [x + ox + w / 2 + tilt * 0.4, y - h * 0.8], [x + ox + w / 2, y]], 1); }
    p.paint(m, 0, 0, ramp, 2);
  }
  function beam(p, x0, ang, wd, amt, c) {
    const cs = rgb(c), ca = Math.cos(ang), sa = Math.sin(ang);
    for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) {
      for (const ox of [-NW, 0]) {
        const dx = x - (x0 + ox), d = Math.abs(dx * ca - y * sa), f = 1 - d / wd;
        if (f > 0 && y > 4 && PX.dither(x, y, f * amt * (1 - y / (NH * 1.15)))) { const o = p.get(x, y); if (o) p.set(x, y, PX.mix(o, cs, 0.28)); }
      }
    }
  }
  A.layerGens[1] = [
    function (p, rnd) {
      Wd.grad(p, 0, NH, [[0, '#03051a'], [0.35, '#091440'], [0.72, '#163270'], [1, '#2a58a2']]);
      const top = Wd.prof(3, 6, 3), ysT = new Float32Array(NW), bot = Wd.prof(8, 5, 3), ysB = new Float32Array(NW);
      for (let x = 0; x < NW; x++) { ysT[x] = 6 + top[x] * 34; ysB[x] = 196 - bot[x] * 46; }
      for (let i = 0; i < 70; i++) { const x = Math.floor(rnd() * NW), y = Math.floor(30 + rnd() * 160); if (p.get(x, y) && PX.dither(x, y, 0.3)) p.set(x, y, rgb(rnd() < 0.5 ? '#8ad0ff' : '#ffffff')); }
      Wd.ridge(p, ysB, NH, '#102a66', '#0a1a4a', '#3a70c8', '#2a56a8', 0.6);
      for (let i = 0; i < 26; i++) { const x = rnd() * NW, h = 8 + rnd() * 20, base = 200 - rnd() * 10; crystal(p, x, base, 3 + rnd() * 3, h, (rnd() - 0.5) * 6, ICE.map((c, k) => PX.mix(c, rgb('#0a1a4a'), 0.25 + (k < 2 ? 0 : 0.15)))); }
      // stalactites
      const sm = new Pix(NW, NH); for (let x = 0; x < NW; x++) for (let y = 0; y < ysT[x]; y++) sm.set(x, y, 1);
      for (let i = 0; i < 22; i++) { const x = rnd() * NW, w = 4 + rnd() * 8, l = 14 + rnd() * 40, y0 = ysT[Math.floor(x)] - 4; for (const ox of [-NW, 0, NW]) sm.poly([[x + ox - w, y0], [x + ox + w, y0], [x + ox + (rnd() - 0.5) * 2, y0 + l]], 1); }
      p.paint(sm, 0, 0, ['#4a80d0', '#2a52a0', '#14286a', '#0a1646', '#050a28'].map(rgb), 3);
      beam(p, 120, 0.42, 22, 0.9, '#8ad8ff'); beam(p, 300, 0.36, 30, 0.8, '#a8e8ff'); beam(p, 450, 0.46, 16, 0.9, '#8ad8ff');
    },
    function (p, rnd) {
      const h = Wd.prof(21, 4, 3), ys = new Float32Array(NW); for (let x = 0; x < NW; x++) ys[x] = 200 - h[x] * 22;
      Wd.ridge(p, ys, NH, '#143a82', '#091a50', '#58a8f0', '#3a78c8', 0.65);
      const m = new Pix(NW, NH);
      for (let i = 0; i < 14; i++) {
        const x = (i + rnd() * 0.7) * (NW / 14), w = 9 + rnd() * 14, hgt = 40 + rnd() * 74, lean = (rnd() - 0.5) * 10;
        for (const ox of [-NW, 0, NW]) { m.poly([[x + ox - w, 204], [x + ox - w * 0.55 + lean * 0.5, 204 - hgt * 0.62], [x + ox + lean, 204 - hgt], [x + ox + w * 0.4 + lean * 0.6, 204 - hgt * 0.6], [x + ox + w, 204]], 1); }
      }
      p.paint(m, 0, 0, ICE.map((c, k) => PX.mix(c, rgb('#0a1a4a'), 0.18 + k * 0.05)), 4);
      for (let i = 0; i < 50; i++) { const x = Math.floor(rnd() * NW), y = 110 + Math.floor(rnd() * 90); if (p.get(x, y)) p.set(x, y, rgb('#ffffff')); }
    },
    function (p, rnd) {
      const dk = rgb('#040a24'), li = [rgb('#3c78c8'), rgb('#9adcff')], m = new Pix(NW, NH);
      for (let i = 0; i < 30; i++) {
        const x = (i + rnd() * 0.8) * (NW / 30), w = 3 + rnd() * 7, hgt = 10 + rnd() * 36, lean = (rnd() - 0.5) * 8;
        for (const ox of [-NW, 0, NW]) m.poly([[x + ox - w, 226], [x + ox + lean, 226 - hgt], [x + ox + w, 226]], 1);
      }
      for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) if (m.d[y * NW + x]) p.set(x, y, m.get(x - 1, y) ? dk : li[m.get(x - 1, y - 1) ? 0 : 1]);
      for (let i = 0; i < 26; i++) { const x = Math.floor(rnd() * NW), y = 190 + Math.floor(rnd() * 30); if (!p.get(x, y)) p.set(x, y, rgb('#ffffff')); }
      p.rect(0, 223, NW, 47, dk);
    },
  ];
})((window.SGS = window.SGS || {}));
