/* World 5: STEEL FORTRESS - a night sky over an alien military base: skyline, towers, searchlights, girders. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix, rgb = PX.rgb;
  const A = GFX.art, Wd = A.world, NW = Wd.NW, NH = Wd.NH;
  function skyline(p, rnd, base, hmin, hmax, wmin, wmax, body, rim, win, density) {
    const m = new Pix(NW, NH); let x = 0; const bl = [];
    while (x < NW) { const w = Math.round(wmin + rnd() * (wmax - wmin)), h = Math.round(hmin + rnd() * (hmax - hmin)); bl.push([x, w, h]); x += w + (rnd() < 0.4 ? 1 : 0); }
    for (const [bx, w, h] of bl) { m.rect(bx, base - h, w, h + 4, 1); if (rnd() < 0.3) m.rect(bx + Math.floor(w / 2), base - h - 6 - Math.floor(rnd() * 10), 1, 8, 1); if (rnd() < 0.3) m.rect(bx + 1, base - h - 2, w - 2, 2, 1); }
    p.paint(m, 0, 0, body.map(rgb), 2);
    for (const [bx, w, h] of bl) {
      for (let y = base - h + 3; y < base - 2; y += 3) for (let q = bx + 1; q < bx + w - 1; q += 2) if (rnd() < density) p.set(q, y, rgb(win[Math.floor(rnd() * win.length)]));
      if (rnd() < 0.25) p.set(bx + Math.floor(w / 2), base - h - 8, rgb('#ff3a3a'));
    }
  }
  function cone(p, x, y, ang, len, spread, amt) {
    const ca = Math.cos(ang), sa = Math.sin(ang);
    for (let q = 0; q < len; q += 1) { const w = q * spread; for (let t = -w; t <= w; t++) { const px = Math.round(x + ca * q - sa * t), py = Math.round(y + sa * q + ca * t), f = (1 - Math.abs(t) / (w + 0.01)) * (1 - q / len); if (f > 0 && PX.dither(px, py, f * amt)) { const o = p.get(((px % NW) + NW) % NW, py); if (o) p.set(((px % NW) + NW) % NW, py, PX.mix(o, rgb('#d8f0ff'), 0.4)); } } }
  }
  A.layerGens[4] = [
    function (p, rnd) {
      Wd.grad(p, 0, NH, [[0, '#03061a'], [0.4, '#0a1840'], [0.75, '#1f3f84'], [1, '#3a6ab8']]);
      Wd.stars(p, rnd, 110, 120, ['#ffffff', '#bcd0ff', '#ffe8c0']);
      Wd.sphere(p, 96, 74, 36, ['#f4f6ff', '#c4cce8', '#8892bc', '#525c88', '#2a3258'], 0, 2); Wd.craters(p, 96, 74, 36, rnd, 14, '#525c88', '#e8ecff');
      skyline(p, rnd, 214, 14, 64, 4, 9, ['#4a6ab4', '#2c4a98', '#1a3278', '#10205a', '#0a1440'], '', ['#ffe27a', '#8affff'], 0.16);
      skyline(p, rnd, 222, 10, 40, 5, 11, ['#34509c', '#1e3a86', '#122660', '#0a1646', '#060c2c'], '', ['#ffb02e', '#8affff'], 0.12);
    },
    function (p, rnd) {
      const m = new Pix(NW, NH);
      for (let i = 0; i < 5; i++) { const x = (i + 0.5) * (NW / 5), h = 70 + rnd() * 50, wb = 20 + rnd() * 8, wn = 11 + rnd() * 4; for (const ox of [-NW, 0, NW]) { const pts = []; for (let q = 0; q <= 12; q++) { const u = q / 12, w = wn + (wb - wn) * Math.pow(Math.abs(u - 0.3) / 0.7, 1.6) * (u > 0.3 ? 0.6 : 1) + (u > 0.3 ? 0 : 0); pts.push([x + ox - (wn + (wb - wn) * Math.pow(1 - u, 1.7)), 206 - u * h]); } for (let q = 12; q >= 0; q--) { const u = q / 12; pts.push([x + ox + (wn + (wb - wn) * Math.pow(1 - u, 1.7)), 206 - u * h]); } m.poly(pts, 1); m.rect(x + ox - wn - 2, 206 - h - 2, wn * 2 + 4, 3, 1); } }
      for (let i = 0; i < 4; i++) { const x = (i + 0.2 + rnd() * 0.5) * (NW / 4) + 20, h = 60 + rnd() * 60; for (const ox of [-NW, 0, NW]) { m.rect(x + ox, 206 - h, 8, h + 2, 1); m.rect(x + ox - 1, 206 - h - 2, 10, 3, 1); } }
      p.paint(m, 0, 0, ['#5a78c0', '#38559c', '#223a7c', '#14265a', '#0a1440'].map(rgb), 3);
      for (let i = 0; i < 4; i++) { const x = (i + 0.2 + rnd() * 0.5) * (NW / 4) + 24; p.set(x, 206 - 70, rgb('#ff3a3a')); }
      const pm = new Pix(NW, NH); for (let i = 0; i < 6; i++) { const y = 180 + rnd() * 20, x0 = rnd() * NW, len = 60 + rnd() * 90; for (const ox of [-NW, 0, NW]) pm.rect(x0 + ox, y, len, 4, 1); }
      p.paint(pm, 0, 0, ['#6a88d0', '#44629e', '#2c4682', '#1a2c60', '#0e1844'].map(rgb), 2);
      for (let i = 0; i < 70; i++) { const x = Math.floor(rnd() * NW), y = 112 + Math.floor(rnd() * 90); if (p.get(x, y) && rnd() < 0.8) p.set(x, y, rgb(rnd() < 0.5 ? '#ffe27a' : '#8affff')); }
      cone(p, 130, 100, 1.1, 120, 0.22, 0.9); cone(p, 390, 90, 2.0, 110, 0.2, 0.9);
    },
    function (p, rnd) {
      const dk = rgb('#050a1e'), li = [rgb('#3a58a0'), rgb('#8aa8e8')], m = new Pix(NW, NH);
      for (let i = 0; i < 9; i++) { const x = (i + 0.3) * (NW / 9), w = 4; for (const ox of [-NW, 0, NW]) { m.rect(x + ox, 150, w, 76, 1); m.rect(x + ox - 3, 150, w + 6, 3, 1); m.rect(x + ox - 3, 224 - 2, w + 6, 3, 1); } }
      for (let i = 0; i < 9; i++) { const x0 = (i + 0.3) * (NW / 9) + 4, x1 = x0 + NW / 9 - 4; for (const ox of [-NW, 0, NW]) { m.line(x0 + ox, 153, x1 + ox - 4, 222, 1, 1); m.line(x1 + ox - 4, 153, x0 + ox, 222, 1, 1); } }
      m.rect(0, 186, NW, 3, 1); m.rect(0, 196, NW, 2, 1);
      for (let y = 0; y < NH; y++) for (let x = 0; x < NW; x++) if (m.d[y * NW + x]) p.set(x, y, m.get(x - 1, y) ? dk : li[m.get(x, y - 1) ? 0 : 1]);
      for (let i = 0; i < 9; i++) { const x = (i + 0.3) * (NW / 9) + 1; p.set(x, 147, rgb('#ffb02e')); p.set(x + 1, 147, rgb('#ff7a1a')); }
      p.rect(0, 223, NW, 47, dk);
    },
  ];
})((window.SGS = window.SGS || {}));
