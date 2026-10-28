/* Boss art: the Defense Wall, Iron Walker, Alien Heart and Mothership, pre-rendered as pixel sprites; moving parts (guns, core, lights) are drawn on top each frame. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, C = G.C, K = PX.K, Pix = PX.Pix, rgb = PX.rgb;
  const A = (GFX.art = GFX.art || {});
  const rp = (a) => a.map(rgb);
  const STEEL = rp(['#a3b0d4', '#7584b0', '#505d8a', '#374268', '#222a4a']);
  const DARK = rp(['#566290', '#3c466f', '#2a3354', '#1b2139', '#0f1327']);
  const RUST = rp(['#ffc07a', '#ee8a3a', '#b8562a', '#7a3220', '#44190f']);
  const RED = rp(['#ffd0c0', '#ff7a5a', '#e83a2a', '#a01a22', '#5a0c18']);
  const OUT = PX.OUT, GLOW = rgb('#ffd060'), HOT = rgb('#ff7a1a');
  const mask = (w, h, fn) => { const m = new Pix(w, h); fn(m); return m; };
  const pm = (p, ramp, cap, fn) => p.paint(mask(p.w, p.h, fn), 0, 0, ramp, cap);
  const mixR = (r, c, t) => r.map((x) => PX.mix(x, rgb(c), t));
  /* grit: scattered darkened pixels and light scratches so big hulls do not look like clean plastic */
  function weather(p, seed, amt) {
    const rnd = PX.rng(seed), blk = rgb('#0a0c1c');
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
      const c = p.d[y * p.w + x]; if (!c) continue;
      const r = rnd();
      if (r < amt) p.d[y * p.w + x] = PX.mix(c, blk, 0.28 + rnd() * 0.2);
      else if (r < amt * 1.25 && p.get(x - 1, y) === c) p.d[y * p.w + x] = PX.mix(c, rgb('#ffffff'), 0.16);
    }
  }
  A.bossK = {};

  /* ---------- DEFENSE WALL (95 x 205 art px, drawn with its top-left at x0, FL-410) ---------- */
  function wallBody() {
    const W = 96, H = 206, p = new Pix(W, H);
    pm(p, STEEL, 4, (m) => { m.rect(0, 22, W, H - 22, 1); for (let i = 0; i < 5; i++) m.rect(2 + i * 19, i % 2 ? 8 : 0, 15, 26, 1); });
    for (const [x, y, w, h] of [[14, 30, 25, 36], [56, 30, 25, 36], [14, 80, 25, 44], [56, 80, 25, 44], [14, 170, 25, 24], [56, 170, 25, 24]]) {
      p.rect(x, y, w, h, DARK[4]); p.rect(x + 1, y + 1, w - 2, h - 2, DARK[3]);
      for (let q = y + 4; q < y + h - 3; q += 4) p.rect(x + 3, q, w - 6, 1, DARK[4]);
      p.rect(x, y + h - 1, w, 1, STEEL[2]); p.rect(x + w - 1, y, 1, h, STEEL[3]);
    }
    for (let q = 2; q < H - 8; q += 18) for (const x of [4, 8, 86, 90]) { p.set(x, q, STEEL[0]); p.set(x + 1, q + 1, STEEL[4]); }
    for (const y of [70, 128, 168]) for (let x = 0; x < W; x++) { p.set(x, y, ((x >> 2) % 2) ? rgb('#ffb02e') : rgb('#161a30')); p.set(x, y + 1, ((x >> 2) % 2) ? rgb('#ffb02e') : rgb('#161a30')); p.set(x, y + 2, STEEL[4]); }
    for (const [x, y] of [[20, 40], [20, 52], [64, 40], [64, 52], [20, 92], [20, 104], [64, 92], [64, 104], [30, 176], [64, 176]]) { p.rect(x, y, 10, 2, RUST[1]); p.rect(x + 1, y, 6, 1, GLOW); }
    pm(p, STEEL, 3, (m) => { m.rect(40, 22, 16, 150, 1); });
    for (let y = 26; y < 170; y += 12) p.rect(43, y, 10, 1, STEEL[4]);
    // foundation + gate
    pm(p, DARK, 3, (m) => { m.rect(0, 190, W, 16, 1); m.poly([[0, 190], [8, 180], [8, 190]], 1); m.poly([[96, 190], [88, 180], [88, 190]], 1); });
    p.rect(36, 186, 24, 20, DARK[4]); for (let y = 186; y < 206; y += 3) p.rect(38, y, 20, 1, DARK[3]);
    for (let x = 0; x < W; x += 6) p.set(x, 205, STEEL[3]);
    weather(p, 21, 0.07);
    // sockets (gun1, gun2, top gun) and the core chamber
    for (const [cx, cy, r] of [[15, 55, 13.5], [15, 110, 13.5], [29, 11, 10.5], [38, 146, 20]]) {
      p.disc(cx, cy, r + 1.5, STEEL[1]); p.disc(cx, cy, r, DARK[4]); p.disc(cx, cy, r - 2, DARK[3]);
      for (let a = 0; a < 8; a++) p.set(Math.round(cx + Math.cos(a * 0.785) * (r + 0.5)), Math.round(cy + Math.sin(a * 0.785) * (r + 0.5)), STEEL[0]);
    }
    return PX.sprite(p, 0, 0, { outline: true });
  }
  /* gun dome (r=22 logical -> 11 art) with 16 pre-aimed barrels, hot variant, and a wrecked socket */
  function bigBarrel(i, len, w) {
    const a = i / 16 * Math.PI * 2, W = 70, H = 70, c = 35, p = new Pix(W, H), dx = Math.cos(a), dy = Math.sin(a);
    p.line(c, c, c + dx * len, c + dy * len, w + 2, DARK[4]); p.line(c, c, c + dx * len, c + dy * len, w, STEEL[3]); p.line(c + dx * 2, c + dy * 2 - 1, c + dx * (len - 1), c + dy * (len - 1) - 1, 1, STEEL[0]);
    p.disc(Math.round(c + dx * len), Math.round(c + dy * len), 2, RUST[1]); p.set(Math.round(c + dx * len), Math.round(c + dy * len), GLOW);
    return PX.sprite(p, c, c);
  }
  function gunDome(r, hot) {
    const n = r * 2 + 4, p = new Pix(n, n), c = n / 2;
    pm(p, hot ? RED : STEEL, 3, (m) => m.disc(c, c, r, 1));
    p.disc(c, c, r * 0.4, DARK[4]); p.disc(c, c, r * 0.28, hot ? rgb('#ff5a3a') : RUST[1]); p.set(Math.round(c - 1), Math.round(c - 1), GLOW);
    return PX.sprite(p, c, c);
  }
  function wreck(r) {
    const n = r * 2 + 6, p = new Pix(n, n), c = n / 2, rnd = PX.rng(r * 7);
    pm(p, DARK, 3, (m) => { m.disc(c, c, r * 0.8, 1); });
    for (let i = 0; i < 16; i++) { const a = rnd() * 6.28, d = rnd() * r * 0.8; p.set(Math.round(c + Math.cos(a) * d), Math.round(c + Math.sin(a) * d), rgb(rnd() < 0.5 ? '#2a1a1a' : '#6a3a22')); }
    for (let i = 0; i < 5; i++) { const a = rnd() * 6.28, d = rnd() * r * 0.6; p.set(Math.round(c + Math.cos(a) * d), Math.round(c + Math.sin(a) * d), rgb('#ff7a1a')); }
    return PX.sprite(p, c, c);
  }
  function wallCore(open, f, rr) {
    const r = rr || 16, n = r * 2 + 4, p = new Pix(n, n), c = n / 2;
    if (!open) {
      pm(p, DARK, 3, (m) => m.disc(c, c, r - 1, 1)); p.rect(c - r + 2, c - 1, 2 * r - 4, 3, DARK[4]); p.rect(c - r + 2, c - 1, 2 * r - 4, 1, STEEL[2]);
      for (let a = 0; a < 6; a++) { const x = Math.round(c + Math.cos(a * 1.047) * (r - 4)), y = Math.round(c + Math.sin(a * 1.047) * (r - 4)); p.set(x, y, STEEL[1]); }
    } else {
      p.disc(c, c, r - 1, RED[4]); p.disc(c, c, r - 3 + (f === 1 ? 1 : 0), RED[2]); p.disc(c, c, r - 7 + (f === 1 ? 1 : 0), RED[1]); p.disc(c, c, 5, rgb('#ffe0c0')); p.disc(c, c, 2.5, rgb('#ffffff'));
      for (let a = 0; a < 8; a++) { const x = Math.round(c + Math.cos(a * 0.785 + f) * (r - 2)), y = Math.round(c + Math.sin(a * 0.785 + f) * (r - 2)); p.set(x, y, rgb('#ffe27a')); }
    }
    return PX.sprite(p, c, c);
  }
  A.initBoss = function () {
    const B = (A.boss = {});
    B.wall = { body: wallBody(), dome: gunDome(11, false), domeH: gunDome(11, true), domeT: gunDome(8, false), wreck: wreck(11), wreckT: wreck(8), barrel: [], core: [wallCore(false), wallCore(true, 0), wallCore(true, 1)] };
    B.wall.domeF = PX.flash(B.wall.dome); B.wall.domeTF = PX.flash(B.wall.domeT); B.wall.bodyF = PX.flash(B.wall.body, 'rgba(255,230,210,0.55)');
    for (let i = 0; i < 16; i++) B.wall.barrel.push(bigBarrel(i, 15, 3));
    if (A.initBoss2) A.initBoss2(B);
  };
  A.drawWall = function (ctx, g, b, sx, fl, ex) {
    const B = A.boss.wall, cam = g.cam.x, x0 = sx - 36, t = b.t;
    PX.draw(ctx, fl && ex ? B.bodyF : B.body, x0, C.FLOOR - 410, 1);
    for (const p of b.parts) {
      const px = p.x - cam, top = p.k === 'top';
      if (!p.alive) { PX.draw(ctx, top ? B.wreckT : B.wreck, px, p.y, 1); continue; }
      const a = Math.atan2(g.player.y - p.y, g.player.x - p.x), bi = ((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16;
      PX.draw(ctx, B.barrel[bi], px, p.y, 1);
      PX.draw(ctx, p.hitT > 0 ? (top ? B.domeTF : B.domeF) : top ? B.domeT : B.dome, px, p.y, 1);
    }
    const c = b.core;
    PX.draw(ctx, ex ? B.core[1 + (Math.floor(t * 6) % 2)] : B.core[0], c.x - cam, c.y, 1);
  };

  /* ---------- IRON WALKER: 6 walking frames + a jump frame, facing right, anchored at the feet ---------- */
  function walkerFrame(f, air) {
    const W = 104, H = 108, OX = 50, OY = 104, p = new Pix(W, H);
    const ph = f / 6 * Math.PI * 2, bob = air ? 0 : (f % 3 === 1 ? 1 : 0);
    const leg = (hx, fx, fy, back) => {
      const hy = -35 + bob, mx = (hx + fx) / 2, my = (hy + fy) / 2, dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 1, a = Math.sqrt(Math.max(0, 17.5 * 17.5 - (d / 2) * (d / 2))), kx = mx + dy / d * a * 0.8, ky = my - dx / d * a * 0.8;
      const col = back ? mixR(DARK, '#0a0e22', 0.2) : STEEL.map((c) => PX.mix(c, rgb('#2a3566'), 0.25));
      pm(p, col, 3, (m) => { m.line(OX + hx, OY + hy, OX + kx, OY + ky, 8, 1); m.line(OX + kx, OY + ky, OX + fx, OY + fy - 3, 6, 1); });
      pm(p, mixR(DARK, '#0a0e22', back ? 0.35 : 0.05), 2, (m) => { m.rect(OX + fx - 8, OY + fy - 4, 16, 5, 1); m.rect(OX + fx + 4, OY + fy - 6, 5, 3, 1); });
      p.disc(Math.round(OX + kx), Math.round(OY + ky), 3, RUST[2]); p.set(Math.round(OX + kx) - 1, Math.round(OY + ky) - 1, GLOW);
    };
    let A1, B1;
    if (air) { A1 = [10, -14]; B1 = [-8, -10]; }
    else { A1 = [Math.sin(ph) * 11, -Math.max(0, Math.cos(ph)) * 7]; B1 = [Math.sin(ph + Math.PI) * 11, -Math.max(0, Math.cos(ph + Math.PI)) * 7]; }
    leg(-9, B1[0] - 3, B1[1], true);
    pm(p, STEEL, 3, (m) => m.rect(OX - 17, OY - 40 + bob, 34, 9, 1));
    for (let x = OX - 15; x < OX + 15; x += 6) p.rect(x, OY - 36 + bob, 2, 3, DARK[4]);
    // torso
    pm(p, STEEL, 4, (m) => m.poly([[OX - 20, OY - 33 + bob], [OX + 20, OY - 33 + bob], [OX + 25, OY - 70 + bob], [OX + 10, OY - 78 + bob], [OX - 12, OY - 78 + bob], [OX - 24, OY - 68 + bob]], 1));
    p.rect(OX - 15, OY - 60 + bob, 30, 20, DARK[4]); p.rect(OX - 14, OY - 59 + bob, 28, 18, DARK[3]);
    for (let q = 0; q < 5; q++) p.rect(OX - 12 + q * 6, OY - 57 + bob, 4, 14, DARK[4]);
    p.disc(OX, OY - 50 + bob, 7, RED[4]); p.disc(OX, OY - 50 + bob, 5.5, RED[2]); p.disc(OX, OY - 50 + bob, 3, RED[1]); p.disc(OX, OY - 51 + bob, 1.4, rgb('#ffffff'));
    for (let x = OX - 22; x < OX + 23; x++) if (((x >> 2) % 2)) { p.set(x, OY - 34 + bob, rgb('#ffb02e')); p.set(x, OY - 35 + bob, rgb('#161a30')); }
    pm(p, RUST, 3, (m) => { m.ell(OX - 24, OY - 68 + bob, 8, 7, 1); m.ell(OX + 24, OY - 68 + bob, 8, 7, 1); });
    for (const sx of [-1, 1]) for (let q = 0; q < 4; q++) p.set(OX + sx * 24 - 4 + q * 2, OY - 62 + bob, rgb(q % 2 ? '#161a30' : '#ffd060'));
    // head
    pm(p, STEEL, 4, (m) => { m.ell(OX + 3, OY - 86 + bob, 12, 10, 1); m.rect(OX - 5, OY - 80 + bob, 14, 5, 1); });
    p.rect(OX + 2, OY - 89 + bob, 12, 4, RED[4]); p.rect(OX + 3, OY - 88 + bob, 10, 2, RED[1]); p.rect(OX + 4, OY - 88 + bob, 4, 1, rgb('#ffe0c0'));
    p.rect(OX - 7, OY - 94 + bob, 2, 6, STEEL[3]); p.set(OX - 7, OY - 95 + bob, RED[1]);
    leg(9, A1[0] + 3, A1[1], false);
    // arm cannon
    pm(p, DARK, 3, (m) => { m.line(OX + 12, OY - 60 + bob, OX + 20, OY - 55 + bob, 7, 1); });
    pm(p, STEEL, 3, (m) => { m.rect(OX + 18, OY - 61 + bob, 22, 9, 1); m.rect(OX + 38, OY - 63 + bob, 5, 13, 1); });
    for (let x = OX + 22; x < OX + 38; x += 4) p.rect(x, OY - 61 + bob, 1, 9, DARK[4]);
    p.rect(OX + 43, OY - 60 + bob, 2, 7, HOT); p.set(OX + 44, OY - 57 + bob, GLOW);
    weather(p, 31 + f, 0.06);
    return PX.sprite(p, OX, OY);
  }
  /* ---------- MOTHERSHIP hull ---------- */
  function shipHull() {
    const W = 142, H = 70, OX = 71, OY = 28, p = new Pix(W, H);
    pm(p, STEEL, 5, (m) => { m.ell(OX, OY, 66, 19, 1); });
    pm(p, DARK, 4, (m) => { m.ell(OX, OY + 6, 56, 12, 1); m.ell(OX, OY + 12, 38, 10, 1); });
    for (const [rx, ry, c] of [[60, 14, STEEL[1]], [48, 11, STEEL[3]]]) for (let a = 0; a < 6.28; a += 0.02) { const x = Math.round(OX + Math.cos(a) * rx), y = Math.round(OY + Math.sin(a) * ry); if (Math.sin(a) < 0.35 && p.get(x, y)) p.set(x, y, c); }
    for (let a = 0.1; a < 3.04; a += 0.02) { const x = Math.round(OX + Math.cos(a) * 64), y = Math.round(OY + Math.sin(a) * 12.5 + 2); if (p.get(x, y)) p.set(x, y, ((x >> 2) % 2) ? rgb('#ffb02e') : rgb('#161a30')); }
    for (let k = 0; k < 14; k++) { const a = 0.15 + k * (Math.PI - 0.3) / 13, x = Math.round(OX + Math.cos(a) * 62), y = Math.round(OY + Math.sin(a) * 15.5); p.rect(x - 1, y, 3, 2, DARK[4]); }
    for (const sx of [-45, 0, 45]) { const y = sx ? 12 : 22; p.disc(OX + sx, OY + y, 10, DARK[4]); p.disc(OX + sx, OY + y, 8.5, DARK[3]); p.disc(OX + sx, OY + y, 8.5 + (sx ? 0 : 5), DARK[3]); }
    p.disc(OX, OY + 31, 15.5, STEEL[2]); p.disc(OX, OY + 31, 14.5, DARK[4]);
    // dome
    pm(p, ['#d8fbff', '#8ae8ff', '#3ab4e8', '#1a6ab0', '#0e3a78'].map(rgb), 4, (m) => { m.ell(OX, OY - 10, 24, 14, 1); m.rect(OX - 24, OY - 10, 49, 8, 1); });
    p.ell(OX - 1, OY - 11, 7, 6, rgb('#52c850')); p.ell(OX - 1, OY - 11, 5.5, 4.6, rgb('#7aff70')); p.rect(OX - 5, OY - 12, 3, 2, rgb('#0a1a10')); p.rect(OX + 1, OY - 12, 3, 2, rgb('#0a1a10')); p.set(OX - 4, OY - 12, rgb('#ffffff')); p.set(OX + 2, OY - 12, rgb('#ffffff'));
    for (let a = 0.6; a < 2.6; a += 0.4) p.set(Math.round(OX + Math.cos(a) * 20), Math.round(OY - 10 - Math.sin(a) * 9 + 4), rgb('#effcff'));
    weather(p, 41, 0.05);
    return PX.sprite(p, OX, OY);
  }
  /* ---------- ALIEN HEART: arteries + a lumpy muscle mass, pulse frames x (closed | open valve) ---------- */
  function heartFrame(pulse, open, f2) {
    const W = 96, H = 214, OX = 48, OY = 118, p = new Pix(W, H), q = pulse, VES = rp(['#ff9ab8', '#e4527e', '#b0305e', '#7a1840', '#430a26']), MUS = rp(['#ffe2ec', '#ff8fb4', '#d8447a', '#9a2056', '#5a0c32', '#2e0618']);
    const tube = (pts, wd) => { const m = new Pix(W, H); for (let i = 0; i < pts.length - 1; i++) m.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], wd, 1); p.shade3d(m, 0, 0, VES, { depth: wd * 0.55 }); };
    tube([[OX - 5, OY - 24 * q], [OX - 8, OY - 50], [OX - 20, OY - 78], [OX - 16, 0]], 10);
    tube([[OX + 6, OY - 24 * q], [OX + 10, OY - 50], [OX + 22, OY - 84], [OX + 20, 0]], 9);
    tube([[OX - 5, OY + 30 * q], [OX - 8, OY + 62], [OX - 16, OY + 95]], 10);
    tube([[OX + 10, OY + 26 * q], [OX + 18, OY + 60], [OX + 16, OY + 95]], 8);
    const m = new Pix(W, H);
    m.disc(OX - 13 * q, OY - 8 * q, 19 * q, 1); m.disc(OX + 13 * q, OY - 8 * q, 19 * q, 1); m.poly([[OX - 31 * q, OY - 2 * q], [OX + 31 * q, OY - 2 * q], [OX + 2 * q, OY + 35 * q]], 1); m.disc(OX, OY + 6 * q, 22 * q, 1);
    p.shade3d(m, 0, 0, MUS, { depth: 15 });
    const rnd = PX.rng(5);
    for (let v = 0; v < 10; v++) { let x = OX + (rnd() - 0.5) * 44, y = OY + (rnd() - 0.5) * 40, a = rnd() * 6.28; for (let s = 0; s < 22; s++) { a += (rnd() - 0.5) * 0.8; x += Math.cos(a); y += Math.sin(a); const xi = Math.round(x), yi = Math.round(y); if (m.get(xi, yi) && Math.hypot(xi - OX, yi - OY) > 10) { p.set(xi, yi, MUS[4]); if (s % 2 === 0) p.set(xi + 1, yi, MUS[3]); } } }
    for (let s = -22; s <= 22; s += 1) { const x = OX + s, y = Math.round(OY - 18 * q + Math.abs(s) * 0.18); if (m.get(x, y)) p.set(x, y, MUS[5]); }
    p.ell(OX - 17 * q, OY - 15 * q, 5, 3, MUS[1]); p.ell(OX - 17 * q, OY - 16 * q, 3, 1.5, rgb('#ffffff')); p.set(OX + 15, OY - 12, MUS[0]);
    if (open) {
      p.ell(OX, OY, 12, 11 + (f2 ? 1 : 0), rgb('#2a0414')); p.ell(OX, OY, 10.5, 9.5 + (f2 ? 1 : 0), rgb('#14020a'));
      p.disc(OX, OY, 7, rgb('#ffb02e')); p.disc(OX, OY, 5.5, rgb('#ffe27a')); p.rect(OX - 1, OY - 6, 2, 12, rgb('#1a0412')); p.set(OX - 3, OY - 3, rgb('#ffffff')); p.set(OX - 3, OY - 2, rgb('#ffffff'));
    } else {
      p.ell(OX, OY, 15, 2.6, MUS[4]); p.ell(OX, OY, 13.5, 1.4, rgb('#14020a')); for (let x = OX - 13; x <= OX + 13; x += 4) p.set(x, OY - 3, MUS[0]);
    }
    return PX.sprite(p, OX, OY);
  }
  A.initBoss2 = function (B) {
    B.walker = { fr: [], fl: [] };
    for (let f = 0; f < 7; f++) { const s = walkerFrame(f, f === 6); B.walker.fr.push(s); B.walker.fl.push(PX.flash(s, 'rgba(255,240,230,0.7)')); }
    B.heart = { closed: [], open: [], openF: [] };
    for (const pu of [0.96, 1.0, 1.05]) { B.heart.closed.push(heartFrame(pu, false)); const o = heartFrame(pu, true, pu > 1); B.heart.open.push(o); B.heart.openF.push(PX.flash(o, 'rgba(255,240,230,0.6)')); }
    B.ship = { hull: shipHull(), dome: gunDome(8, false), domeH: gunDome(8, false), wreck: wreck(8), barrel: [], core: [wallCore(false, 0, 14), wallCore(true, 0, 14), wallCore(true, 1, 14)] };
    B.ship.domeF = PX.flash(B.ship.dome); B.ship.hullF = PX.flash(B.ship.hull, 'rgba(255,240,230,0.5)');
    for (let i = 0; i < 16; i++) B.ship.barrel.push(bigBarrel(i, 10, 2));
  };
  A.drawWalker = function (ctx, b, sx) {
    const W = A.boss.walker, f = b.air ? 6 : Math.floor(b.t * 5) % 6;
    PX.draw(ctx, (b.hit > 0 ? W.fl : W.fr)[f], sx, C.FLOOR + b.y, b.face);
  };
  A.drawHeart = function (ctx, b, sx) {
    const H = A.boss.heart, pi = Math.round(1 + Math.sin(b.t * 5)), set = b.open ? (b.hit > 0 ? H.openF : H.open) : H.closed;
    PX.draw(ctx, set[pi], sx, b.core.y, 1);
  };
  A.drawShip = function (ctx, g, b, sx, ex) {
    const S = A.boss.ship, cam = g.cam.x, y = b.y, t = b.t;
    PX.draw(ctx, b.hit > 0 && ex ? S.hullF : S.hull, sx, y, 1);
    for (let k = 0; k < 14; k++) {
      if ((k + Math.floor(t * 6)) % 3) continue;
      const a = 0.15 + k * (Math.PI - 0.3) / 13;
      ctx.fillStyle = k % 2 ? '#ffe27a' : '#ff5a3a'; ctx.fillRect(Math.round((sx + Math.cos(a) * 62 * K) / K) * K - K, Math.round((y + Math.sin(a) * 15.5 * K) / K) * K, K * 3, K * 2);
    }
    for (const p of b.parts) {
      const px = p.x - cam;
      if (!p.alive) { PX.draw(ctx, S.wreck, px, p.y, 1); continue; }
      const a = Math.atan2(g.player.y - p.y, g.player.x - p.x), bi = ((Math.round(a / (Math.PI / 8)) % 16) + 16) % 16;
      PX.draw(ctx, S.barrel[bi], px, p.y, 1); PX.draw(ctx, p.hitT > 0 ? S.domeF : S.dome, px, p.y, 1);
    }
    PX.draw(ctx, ex ? S.core[1 + (Math.floor(t * 6) % 2)] : S.core[0], b.core.x - cam, b.core.y, 1);
  };
})((window.SGS = window.SGS || {}));
