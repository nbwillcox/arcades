/* Bosses: one at the end of every world (levels 10, 20 ... 100). Each has its own sprite, movement and attack pattern; bubbles and special blasts wear it down. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U, PX = G.px, Pix = PX.Pix, rgb = PX.rgb, TILE = C.TILE;
  const B = {};
  G.boss = B;
  const snd = (n) => { const a = G.audio; if (a && a.sfx && a.sfx[n]) a.sfx[n](); };
  const mask = (w, h, fn) => { const m = new Pix(w, h); fn(m); return m; };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const WHT = rgb('#ffffff'), INK = rgb('#16162a'), ORG = rgb('#ffa63c'), YEL = rgb('#ffe45a');
  const eye = (p, x, y, c) => { p.rect(x, y, 4, 4, WHT); p.rect(x + 1, y + 1, 3, 3, c); p.set(x + 3, y + 3, INK); };
  const dark = (R) => R.map((c) => PX.mix(c, rgb('#1a1030'), 0.4));

  /* ---------- sprites: PAINT[k](p, R, D, fr, rage, E) draws one frame facing right into p ---------- */
  const SZ = [[44, 30], [44, 28], [36, 44], [30, 28], [40, 46], [44, 30], [40, 40], [56, 28], [40, 46], [48, 48]];
  const PAINT = [];
  PAINT[0] = (p, R, D, fr, rage, E) => {
    p.shade3d(mask(44, 30, (m) => { m.ell(22, 15, 20, 13, 1); m.rect(3, 18, 38, 7, 1); }), 0, 0, R, { depth: 6 });
    for (const x of [9, 16, 23, 30]) { p.poly([[x - 3, 8], [x + 1, x % 5 === 1 ? 1 : 3], [x + 5, 8]], R[1]); p.line(x + 1, 5, x + 1, 8, 1, R[0]); }
    for (const [x, y] of [[8, 14], [14, 19], [26, 16], [33, 20], [20, 11]]) { p.rect(x, y, 3, 2, D[3]); p.set(x, y, D[1]); }
    for (let i = 0; i < 4; i++) { const x = 5 + i * 9, up = (i + fr) & 1; p.rect(x, 24 - up, 6, 5, D[2]); p.rect(x, 28 - up, 6, 1, D[4]); }
    eye(p, 27, 9, E); eye(p, 34, 10, E); p.rect(25, 19, 15, 3, INK); for (let x = 26; x < 38; x += 3) p.rect(x, 19, 2, 1, WHT);
    if (rage) { p.line(25, 6, 30, 9, 1, INK); p.line(38, 7, 33, 9, 1, INK); }
  };
  PAINT[1] = (p, R, D, fr, rage, E) => {
    const GL = PX.ramp(190, 60, 52);
    p.shade3d(mask(44, 28, (m) => m.ell(22, 11, 9, 9, 1)), 0, 0, GL, { depth: 5 });
    p.rect(19, 7, 6, 5, WHT); p.rect(21, 8, 3, 3, E); p.rect(21, 11, 3, 1, INK);
    p.shade3d(mask(44, 28, (m) => m.ell(22, 17, 21, 8, 1)), 0, 0, R, { depth: 5 });
    for (let i = 0; i < 6; i++) p.rect(6 + i * 6, 17, 3, 2, (i + fr) & 1 ? YEL : ORG);
    p.rect(19, 23, 6, 3, D[2]); p.rect(20, 26, 4, 2, INK); p.rect(8, 24, 3, 2 + fr, ORG); p.rect(33, 24, 3, 2 + (1 - fr), ORG);
    p.rect(22, 0, 1, 3, D[2]); p.set(22, 0, rage ? rgb('#ff4a4a') : rgb('#7affd8'));
  };
  PAINT[2] = (p, R, D, fr, rage, E) => {
    const ICE = PX.ramp(195, 70, 60);
    p.shade3d(mask(36, 44, (m) => { m.rect(8, 14, 20, 18, 1); m.ell(7, 17, 5, 5, 1); m.ell(29, 17, 5, 5, 1); m.rect(1, 19, 6, 14, 1); m.rect(29, 19, 6, 14, 1); m.rect(0, 31, 8, 6, 1); m.rect(28, 31, 8, 6, 1); }), 0, 0, R, { depth: 5 });
    p.shade3d(mask(36, 44, (m) => { m.rect(9 + fr, 32, 8, 11, 1); m.rect(19 - fr, 32, 8, 11, 1); }), 0, 0, D, { depth: 3 });
    p.shade3d(mask(36, 44, (m) => m.ell(18, 9, 7, 7, 1)), 0, 0, R, { depth: 5 });
    p.rect(13, 8, 10, 3, INK); p.rect(14, 9, 3, 1, E); p.rect(19, 9, 3, 1, E);
    p.poly([[3, 15], [6, 3], [10, 15]], ICE[1]); p.poly([[26, 15], [30, 5], [33, 15]], ICE[1]); p.poly([[14, 3], [18, 1], [22, 3]], ICE[0]);
    p.line(6, 5, 6, 14, 1, ICE[0]); p.line(30, 7, 30, 14, 1, ICE[0]);
    p.disc(18, 23, 3, E); p.set(17, 22, WHT);
  };
  PAINT[3] = (p, R, D, fr, rage, E) => {
    p.shade3d(mask(30, 28, (m) => m.ell(14, 15, 13, 11, 1)), 0, 0, R, { depth: 6 });
    p.poly([[4, 8], [2, 0], [9, 5]], D[1]); p.poly([[18, 5], [25, 0], [24, 9]], D[1]);
    p.rect(14, 19, 14, 4 + fr, INK); for (let x = 15; x < 27; x += 3) { p.rect(x, 19, 2, 2, WHT); p.rect(x + 1, 21 + fr, 2, 2, WHT); }
    eye(p, 16, 9, E); eye(p, 22, 10, E); p.line(15, 7, 20, 9, 1, INK); p.line(26, 8, 22, 9, 1, INK);
    for (const [x, y] of [[7, 14], [9, 20], [12, 10]]) p.rect(x, y, 2, 2, YEL);
  };
  PAINT[4] = (p, R, D, fr, rage, E) => {
    const GL = PX.ramp(300, 60, 56);
    p.shade3d(mask(40, 46, (m) => { m.rect(13, 22, 14, 17, 1); m.rect(8, 37, 24, 6, 1); }), 0, 0, D, { depth: 4 });
    p.shade3d(mask(40, 46, (m) => { m.ell(20, 13, 19, 12, 1); m.rect(2, 17, 36, 6, 1); }), 0, 0, GL, { depth: 6 });
    for (const [x, y, r] of [[10, 9, 3], [20, 5, 3], [30, 10, 3], [24, 14, 2], [14, 15, 2]]) p.disc(x, y, r, PX.mix(GL[0], WHT, 0.5));
    for (const x of [6, 14, 26, 34]) p.disc(x, 24 + (x & 1), 2, PX.mix(R[0], WHT, 0.4));
    p.poly([[9, 4], [12, 1], [14, 4]], GL[0]); p.poly([[26, 3], [30, 0], [32, 6]], GL[0]);
    eye(p, 14, 26, E); eye(p, 22, 26, E); p.rect(16, 32, 8, 2, INK); if (rage) p.rect(17, 32, 6, 1, WHT);
    p.line(6, 40, 1, 45, 1, D[2]); p.line(34, 40, 39, 45, 1, D[2]); p.line(10, 42, 7, 45, 1, D[2]); p.line(30, 42, 33, 45, 1, D[2]);
  };
  PAINT[5] = (p, R, D, fr, rage, E) => {
    for (let i = 0; i < 4; i++) { const bx = 12 + i * 4, o = ((i + fr) & 1) * 2, kx = bx + (i < 2 ? -7 : 5); p.line(bx, 18, kx, 9 - o + 6, 2, D[3]); p.line(kx, 15 - o, bx + (i < 2 ? -9 : 9) + i, 28, 1, D[3]); }
    p.shade3d(mask(44, 30, (m) => { m.ell(20, 14, 11, 9, 1); m.ell(32, 13, 6, 6, 1); }), 0, 0, R, { depth: 5 });
    const CR = PX.ramp(300, 80, 58);
    for (const [x, h] of [[14, 8], [20, 11], [26, 8]]) { p.poly([[x - 2, 9], [x, 8 - h + 3], [x + 3, 9]], CR[1]); p.line(x, 8 - h + 5, x, 8, 1, CR[0]); }
    for (const [x, y] of [[33, 9], [36, 10], [34, 12], [37, 13]]) p.rect(x, y, 2, 2, (x + y) & 1 ? E : WHT);
    p.rect(35, 17, 5, 2, INK);
  };
  PAINT[6] = (p, R, D, fr, rage, E) => {
    const RD = PX.ramp(rage ? 0 : 190, 70, 50);
    p.shade3d(mask(40, 40, (m) => m.rect(2, 2, 36, 36, 1)), 0, 0, R, { depth: 3 });
    p.rect(6, 6, 28, 28, D[3]); p.rect(7, 7, 26, 26, D[2]);
    for (const [x, y] of [[3, 3], [35, 3], [3, 35], [35, 35]]) p.rect(x, y, 2, 2, D[4]);
    for (let i = 0; i < 4; i++) { p.rect(8 + i * 6, 8, 4, 1, D[4]); p.rect(8 + i * 6, 31, 4, 1, D[4]); p.rect(3, 9 + i * 6, 1, 4, (i + fr) & 1 ? YEL : D[4]); p.rect(36, 9 + i * 6, 1, 4, (i + fr) & 1 ? D[4] : YEL); }
    p.shade3d(mask(40, 40, (m) => m.disc(20, 20, 9, 1)), 0, 0, RD, { depth: 6 });
    p.disc(20, 20, 4, INK); p.disc(20, 20, 3, E); p.set(19, 19, WHT);
    p.rect(19, 0, 2, 3, D[3]); p.set(19, 0, rage ? rgb('#ff4a4a') : rgb('#7affd8'));
  };
  PAINT[7] = (p, R, D, fr, rage, E) => {
    p.shade3d(mask(56, 28, (m) => m.poly([[2, 14], [14, 6], [44, 6], [54, 14], [44, 23], [14, 23]], 1)), 0, 0, R, { depth: 5 });
    p.poly([[18, 6], [26, 2], [34, 6]], D[1]); p.rect(26, 1, 1, 5, D[3]);
    for (let i = 0; i < 4; i++) { p.disc(17 + i * 6, 15, 2, (i + fr) & 1 ? E : YEL); p.set(16 + i * 6, 14, WHT); }
    p.rect(42, 10, 5, 4, INK); p.rect(49, 11, 3, 3, INK); p.set(43, 11, E); p.set(45, 11, E); p.rect(43, 17, 8, 2, INK); for (let x = 43; x < 51; x += 2) p.rect(x, 17, 1, 2, WHT);
    p.rect(0, 11 + fr, 5, 3, ORG); p.rect(0, 16, 4, 2 - fr, YEL); p.line(10, 22, 6, 27, 1, D[2]); p.line(24, 23, 24, 27, 1, D[2]);
  };
  PAINT[8] = (p, R, D, fr, rage, E) => {
    for (let i = 0; i < 6; i++) { const x = 6 + i * 5.6; for (let y = 22; y < 45; y++) { const xx = Math.round(x + Math.sin(y * 0.38 + i + fr * 1.7) * (1 + (y - 22) * 0.08)); p.rect(xx, y, 2, 1, R[2 + ((y >> 2) & 1)]); } }
    p.shade3d(mask(40, 46, (m) => { m.ell(20, 14, 18, 13, 1); m.rect(2, 14, 36, 8, 1); m.ell(20, 22, 18, 3, 1); }), 0, 0, R, { depth: 7 });
    p.shade3d(mask(40, 46, (m) => m.ell(20, 12, 8, 6, 1)), 0, 0, [PX.mix(R[0], WHT, 0.6), R[0], R[1], R[1], R[2]], { depth: 4 });
    eye(p, 12, 10, E); eye(p, 24, 10, E); p.rect(15, 18, 10, 2, INK); if (rage) p.line(11, 8, 16, 10, 1, INK);
    for (const [x, y] of [[6, 16], [33, 18], [10, 4], [30, 5]]) p.rect(x, y, 2, 2, PX.mix(R[0], WHT, 0.5));
  };
  PAINT[9] = (p, R, D, fr, rage, E) => {
    const ring = (front) => {
      for (let a = 0; a < 6.2832; a += 0.012) {
        const s = Math.sin(a); if ((s > 0) !== front) continue;
        const px = Math.cos(a) * 23, py = s * 6, x = Math.round(24 + px * Math.cos(-0.35) - py * Math.sin(-0.35)), y = Math.round(24 + px * Math.sin(-0.35) + py * Math.cos(-0.35)), k = (Math.cos(a) + 1) / 2;
        for (let t = -1; t <= 1; t++) p.set(x, y + t, PX.mix(rgb('#ff8a2a'), rgb(rage ? '#ff2a4a' : '#d44aff'), Math.min(1, k * 0.9 + (t === 0 ? 0 : 0.15) + ((a * 7 + fr * 3) | 0) % 2 * 0.1)));
      }
    };
    ring(false);
    p.shade3d(mask(48, 48, (m) => m.disc(24, 24, 13, 1)), 0, 0, [rgb('#7a4aa8'), rgb('#3a2468'), rgb('#1e1240'), rgb('#120a2a'), rgb('#0a0618')], { depth: 6 });
    p.ell(24, 24, 7, 4, E); p.ell(24, 24, 2, 4, INK); p.set(22, 22, WHT);
    ring(true);
  };

  function build(k, world) {
    const W = G.levels.WORLDS[world], R = PX.ramp(W.hue, W.sat + 15, 46), D = dark(R), out = { norm: [], rage: [] };
    for (let r = 0; r < 2; r++) for (let fr = 0; fr < 2; fr++) {
      const p = new Pix(SZ[k][0], SZ[k][1]);
      PAINT[k](p, r ? PX.ramp((W.hue + 340) % 360, 80, 44) : R, D, fr, !!r, r ? rgb('#ff3a3a') : YEL);
      out[r ? 'rage' : 'norm'].push(PX.sprite(p, SZ[k][0] / 2, SZ[k][1] / 2));
    }
    if (k === 3) {
      out.seg = [];
      for (let r = 0; r < 2; r++) { const p = new Pix(18, 18); p.shade3d(mask(18, 18, (m) => m.disc(9, 9, 8, 1)), 0, 0, PX.ramp(r ? 350 : W.hue, 80, 46), { depth: 5 }); p.rect(5, 6, 3, 2, YEL); p.rect(10, 10, 3, 2, ORG); out.seg.push(PX.sprite(p, 9, 9)); }
    }
    return out;
  }
  B.build = build; B.SZ = SZ; B.PAINT = PAINT;

  /* ---------- helpers ---------- */
  const AI = [];
  const W_ = (g) => g.cols * TILE;
  const live = (g) => g.foes.reduce((n, f) => n + (f.dead ? 0 : 1), 0);
  const minion = (g, type, max) => { if (live(g) >= max) return; g.spawnFoe(type, rnd(28, W_(g) - 28), type === 2 || type === 5 ? rnd(50, 110) : 36, 0.1); };
  const aim = (g, b) => Math.atan2((g.P.y - 7) - b.y, g.P.x - b.x);
  const orb = (g, b, ang, spd, c1, c2, extra) => g.shoot('orb', b.x + Math.cos(ang) * b.hw * 0.5, b.y + Math.sin(ang) * b.hh * 0.5, Math.cos(ang) * spd, Math.sin(ang) * spd, Object.assign({ r: 4, life: 7, col: c1, col2: c2 }, extra || {}));
  const spd = (b, g) => (b.rage ? 1.5 : 1) * g.diff.foe;
  /* walk / jump a floor boss through the tile physics (the boss box is centred, the physics box is feet-anchored) */
  const step = (g, b, dt) => {
    const e = b.e; e.x = b.x; e.y = b.y + b.hh; e.vx = b.vx; e.vy = b.vy; e.w = b.hw * 1.7; e.h = b.hh * 2;
    const mv = g.move(e, dt); b.x = e.x; b.y = e.y - b.hh; b.vx = e.vx; b.vy = e.vy; b.ground = mv.ground; return mv;
  };
  const floorY = () => (C.ROWS - 2) * TILE;

  /* 0 ROCK CRAWLER: lumbers about, hops, and every landing shakes rocks loose from the ceiling */
  AI[0] = (g, b, dt) => {
    const P = g.P, s = spd(b, g); b.stT -= dt;
    if (b.ground) {
      b.vx = b.face * 24 * s;
      if (b.stT <= 0) { b.stT = rnd(2.4, 3.6) / s; b.vy = -225; b.face = P.x > b.x ? 1 : -1; b.vx = b.face * 46 * s; b.air = true; }
    }
    const mv = step(g, b, dt); if (mv.hitX) b.face = -b.face;
    if (mv.ground && b.air) {
      b.air = false; g.shake = 5; snd('boom');
      for (let i = 0, n = b.rage ? 7 : 5; i < n; i++) g.shoot('orb', rnd(24, W_(g) - 24), 22, 0, rnd(0, 30), { r: 4, life: 6, col: '#8a7a6a', col2: '#d8c8b0', g: true, land: true });
    }
  };
  /* 1 WARDEN DRONE: cruises the top firing spreads, then lines up and dives for the floor */
  AI[1] = (g, b, dt) => {
    const P = g.P, s = spd(b, g), W = W_(g); b.stT -= dt;
    let tx = b.x, ty = b.y, k = 3;
    if (b.st === 0) {
      tx = W / 2 + Math.sin(b.t * 0.8 * s) * (W / 2 - 44); ty = 52 + Math.sin(b.t * 2) * 8; b.atk -= dt;
      if (b.atk <= 0) { b.atk = 1.7 / s; const a = aim(g, b); for (const d of [-0.32, 0, 0.32]) orb(g, b, a + d, 78, '#ff5ad0', '#fff'); snd('zap'); }
      if (b.stT <= 0) { b.st = 1; b.stT = 1.1; }
    } else if (b.st === 1) { tx = P.x; ty = 52; if (b.stT <= 0) b.st = 2; }
    else if (b.st === 2) {
      tx = b.x; ty = 176; k = 4.5;
      if (Math.abs(b.y - ty) < 9) { b.st = 3; b.stT = 0.9; g.shake = 4; snd('boom'); for (const d of [-1, 1]) g.shoot('bolt', b.x, floorY() - 5, d * 100, 0, { life: 2.6 }); }
    } else if (b.st === 3) { tx = b.x; ty = 176; k = 4.5; if (b.stT <= 0) b.st = 4; }
    else { tx = b.x; ty = 52; k = 1.8; if (b.y < 60) { b.st = 0; b.stT = rnd(5, 7) / s; } }
    b.x = U.clamp(b.x + (tx - b.x) * Math.min(1, k * dt), 16 + b.hw, W - 16 - b.hw); b.y += (ty - b.y) * Math.min(1, k * dt);
  };
  /* 2 FROST GOLEM: stomps (a shockwave runs along the floor) and lobs ice balls */
  AI[2] = (g, b, dt) => {
    const P = g.P, s = spd(b, g); b.stT -= dt; b.atk -= dt;
    if (b.ground) {
      b.vx = b.face * 22 * s;
      if (b.stT <= 0) { b.stT = rnd(3, 4.2) / s; b.vy = -245; b.face = P.x > b.x ? 1 : -1; b.vx = b.face * 62 * s; b.air = true; }
      else if (b.atk <= 0) { b.atk = rnd(2.6, 3.6) / s; b.face = P.x > b.x ? 1 : -1; g.shoot('ice', b.x + b.face * 12, b.y - 14, b.face * 74, -135, { g: true, r: 4, life: 4 }); snd('zap'); }
    }
    const mv = step(g, b, dt); if (mv.hitX) b.face = -b.face;
    if (mv.ground && b.air) { b.air = false; b.vx = 0; g.shake = 6; snd('boom'); for (const d of [-1, 1]) g.shoot('ice', b.x + d * 16, floorY() - 4, d * 82, 0, { r: 4, life: 3.2 }); }
  };
  /* 3 MAGMA WORM: sweeps the room in lanes, body and all, spitting fire */
  AI[3] = (g, b, dt) => {
    const s = spd(b, g), W = W_(g); b.atk -= dt;
    b.x += b.dir * 62 * s * dt; b.y = b.lane + Math.sin(b.t * 3.2) * 13; b.face = b.dir;
    if ((b.dir > 0 && b.x > W - 34) || (b.dir < 0 && b.x < 34)) { b.dir = -b.dir; b.lane = U.pick([62, 104, 146, 188]); }
    b.trT -= dt; if (b.trT <= 0) { b.trT = 0.055; b.trail.unshift({ x: b.x, y: b.y }); if (b.trail.length > 40) b.trail.pop(); }
    if (b.atk <= 0) { b.atk = 2 / s; g.shoot('fire', b.x, b.y - 4, b.dir * rnd(10, 40), -rnd(50, 90), { g: true, bounce: true, r: 4, life: 3.4 }); snd('zap'); }
  };
  /* 4 SPORE QUEEN: drifts overhead releasing rings of spores */
  AI[4] = (g, b, dt) => {
    const s = spd(b, g), W = W_(g); b.atk -= dt;
    b.x = W / 2 + Math.sin(b.t * 0.55 * s) * (W / 2 - 70); b.y = 82 + Math.sin(b.t * 1.4) * 8;
    if (b.atk <= 0) { b.atk = 2.9 / s; const n = b.rage ? 12 : 8, a0 = rnd(0, 6.28); for (let i = 0; i < n; i++) orb(g, b, a0 + i / n * 6.2832, 42, '#8aff5a', '#eaffc8'); snd('blast'); }
  };
  /* 5 CRYSTAL SPIDER: pounces after the player and fans out crystal shards on landing */
  AI[5] = (g, b, dt) => {
    const P = g.P, s = spd(b, g); b.stT -= dt;
    if (b.ground) {
      b.vx = b.face * 14 * s;
      if (b.stT <= 0) { b.stT = rnd(1.6, 2.6) / s; b.face = P.x > b.x ? 1 : -1; b.vy = P.y < b.y - 40 ? -285 : -235; b.vx = b.face * U.clamp(Math.abs(P.x - b.x) * 0.75, 44, 112) * s; b.air = true; }
    }
    const mv = step(g, b, dt); if (mv.hitX) b.face = -b.face;
    if (mv.ground && b.air) { b.air = false; b.vx = 0; g.shake = 4; snd('boom'); const a = aim(g, b), n = b.rage ? 5 : 3; for (let i = 0; i < n; i++) orb(g, b, a + (i - (n - 1) / 2) * 0.34, 82, '#c86aff', '#f0d0ff'); }
  };
  /* 6 MAINFRAME CORE: opens to be hit, then shields itself behind a spinning wall of bolts */
  AI[6] = (g, b, dt) => {
    const s = spd(b, g), W = W_(g); b.stT -= dt; b.atk -= dt;
    b.x = W / 2; b.y = 84 + Math.sin(b.t * 1.6) * 4;
    if (b.st === 0) {
      b.shield = false;
      if (b.atk <= 0) { b.atk = 1.5 / s; const a = aim(g, b); for (const d of [-0.22, 0.22]) orb(g, b, a + d, 96, '#5affff', '#fff'); snd('zap'); }
      if (b.stT <= 0) { b.st = 1; b.stT = 3.4; b.ang = 0; snd('power'); }
    } else {
      b.shield = true; b.ang += dt * 2.2 * s;
      if (b.atk <= 0) { b.atk = 0.2 / Math.min(1.4, s); const n = b.rage ? 3 : 2; for (let a = 0; a < n; a++) orb(g, b, b.ang + a * 6.2832 / n, 62, '#5affff', '#fff'); }
      if (b.stT <= 0) { b.st = 0; b.stT = 5.2; b.shield = false; minion(g, 2, 3); minion(g, 2, 3); snd('power'); }
    }
  };
  /* 7 GHOST CRUISER: patrols dropping bombs, then charges across at the player's height */
  AI[7] = (g, b, dt) => {
    const P = g.P, s = spd(b, g), W = W_(g); b.atk -= dt; b.stT -= dt;
    if (b.st === 0) {
      b.x += b.dir * 52 * s * dt; b.y += (b.lane + Math.sin(b.t * 2.2) * 6 - b.y) * Math.min(1, 2 * dt);
      if (b.atk <= 0) { b.atk = 1.5 / s; g.shoot('bomb', b.x, b.y + 8, b.dir * 24, 0, { g: true, r: 4, life: 4 }); snd('zap'); }
      if ((b.dir > 0 && b.x > W - 46) || (b.dir < 0 && b.x < 46)) { b.dir = -b.dir; b.lane = b.lane < 90 ? 130 : 62; }
      if (b.stT <= 0) { b.st = 1; b.stT = 0.9; b.dir = P.x > b.x ? 1 : -1; b.lane = U.clamp(P.y - 8, 70, 200); }
    } else if (b.st === 1) { b.y += (b.lane - b.y) * Math.min(1, 5 * dt); if (b.stT <= 0) { b.st = 2; snd('maw'); } }
    else {
      b.x += b.dir * 175 * s * dt;
      if ((b.dir > 0 && b.x > W - 40) || (b.dir < 0 && b.x < 40)) { b.dir = -b.dir; b.st = 0; b.stT = rnd(6, 8) / s; g.shake = 4; snd('boom'); b.lane = b.y < 90 ? 62 : 130; }
    }
    b.face = b.dir;
  };
  /* 8 NEBULA JELLY: drifts after the player in low gravity, pulsing out fans of spores and shedding floaters as it weakens */
  AI[8] = (g, b, dt) => {
    const P = g.P, s = spd(b, g), W = W_(g); b.atk -= dt;
    const dx = P.x - b.x, dy = (P.y - 40) - b.y;
    b.vx += (Math.sign(dx) * 24 * s - b.vx) * 0.8 * dt; b.vy += (Math.sign(dy) * 14 * s + Math.sin(b.t * 2.4) * 10 - b.vy) * 0.8 * dt;
    b.x = U.clamp(b.x + b.vx * dt, 16 + b.hw, W - 16 - b.hw); b.y = U.clamp(b.y + b.vy * dt, 40, 180);
    if (b.atk <= 0) { b.atk = 2.5 / s; const n = b.rage ? 7 : 5; for (let i = 0; i < n; i++) orb(g, b, 1.5708 + (i - (n - 1) / 2) * 0.42, 52, '#ff7aff', '#ffe0ff'); snd('blast'); }
    for (const th of [0.66, 0.33]) if (b.hp < b.max * th && !b['s' + th]) { b['s' + th] = 1; for (let i = 0; i < 3; i++) minion(g, 5, 9); }
  };
  /* 9 THE SINGULARITY: three phases - spiral storms, then teleporting with gravity, then the event horizon */
  AI[9] = (g, b, dt) => {
    const P = g.P, W = W_(g), ph = b.hp > b.max * 0.66 ? 0 : b.hp > b.max * 0.33 ? 1 : 2, sp = 1 + ph * 0.3 * g.diff.foe;
    if (ph !== b.ph) { b.ph = ph; if (ph) { g.banner(ph === 1 ? 'GRAVITY WELL' : 'EVENT HORIZON', 1.8, 'bad'); snd('maw'); g.shake = 6; } }
    b.rage = ph === 2; b.atk -= dt; b.stT -= dt; b.mT -= dt; b.bT -= dt;
    if (b.tp > 0) { b.tp -= dt; if (b.tp <= 0) { const q = U.pick([[W / 2, 86], [W / 2 - 74, 70], [W / 2 + 74, 70], [W / 2, 140], [W / 2 - 60, 150], [W / 2 + 60, 150]]); b.x = q[0]; b.y = q[1]; } }
    else if (ph >= 1 && b.stT <= 0) { b.stT = 4.5 / sp; b.tp = 0.6; snd('warp'); }
    else if (ph === 0) { b.x = W / 2 + Math.sin(b.t * 0.9) * 40; b.y = 88 + Math.cos(b.t * 1.3) * 14; }
    b.ghost = b.tp > 0;
    if (b.ghost) return;
    if (b.atk <= 0) { b.atk = 0.24 / sp; b.ang += 0.55; const arms = ph + 1; for (let a = 0; a < arms; a++) orb(g, b, b.ang + a * 6.2832 / arms, 60, '#ff4ad8', '#ffe0ff'); }
    if (b.bT <= 0) { b.bT = 3.6 / sp; const a = aim(g, b); for (const d of [-0.28, 0, 0.28]) orb(g, b, a + d, 96, '#ffd24a', '#fff'); snd('zap'); }
    if (ph >= 1 && b.mT <= 0) { b.mT = ph === 1 ? 8 : 6; minion(g, U.pick([2, 5, 6]), ph === 1 ? 2 : 3); }
    if (ph >= 1 && !P.dead && !P.ground) P.x += Math.sign(b.x - P.x) * 14 * dt;
  };

  /* ---------- damage, death, flow ---------- */
  const MIN = [{ t: 14, types: [0, 1], max: 2 }, { t: 10, types: [2], max: 3 }, { t: 12, types: [0, 3], max: 2 }, { t: 11, types: [5], max: 2 }, { t: 9, types: [5], max: 3 }, { t: 12, types: [6, 3], max: 2 }, null, { t: 12, types: [4], max: 2 }, null, null];
  const FACE = [1, 0, 1, 1, 0, 1, 0, 1, 0, 0];
  function hurt(g, b, d) {
    if (b.dying || b.ghost) return;
    b.hp -= d; b.hurtT = 0.14; snd('hit'); g.addScore(100 * d); g.shake = Math.max(g.shake, 1.5);
    if (b.hp <= 0) kill(g, b);
  }
  B.hurt = hurt;
  function kill(g, b) {
    b.dying = true; b.deadT = 0; b.hp = 0; b.shield = false; b.ghost = false;
    for (const f of g.foes) { if (f.bubble) f.bubble.dead = true; g.killFoe(f, 500, f.x, f.y); }
    g.shots = g.shots.filter((s) => !s.harm);
    g.P.invuln = Math.max(g.P.invuln, 12); g.shake = 8;
    g.banner('BOSS DESTROYED', 2.6, 'good'); snd('boom'); snd('boss');
    if (G.audio && G.audio.music) G.audio.music('off');
  }
  function dying(g, b, dt) {
    if (b.gone) return;
    b.deadT += dt; g.shake = Math.max(g.shake, 3); b.bT -= dt;
    if (b.bT <= 0) {
      b.bT = 0.07; const x = b.x + rnd(-b.hw, b.hw), y = b.y + rnd(-b.hh, b.hh);
      for (let i = 0; i < 6; i++) g.parts.push({ x, y, vx: rnd(-110, 110), vy: rnd(-130, 40), t: 0, life: 0.7, c: ['#fff6a0', '#ff9a2a', '#ff4a2a', '#ffffff'][i & 3] });
      if (Math.random() < 0.4) snd('boom');
    }
    if (b.deadT > 2.4) finish(g, b);
  }
  function finish(g, b) {
    b.gone = true; const big = g.level >= G.levels.TOTAL;
    for (let i = 0; i < 14; i++) g.items.push({ x: b.x + rnd(-20, 20), y: b.y, vx: rnd(-70, 70), vy: rnd(-190, -80), kind: i % 5 === 4 ? 'candy' : 'snack', sub: ['speed', 'rapid', 'range'][i % 3], w: 10, h: 10, age: -6, bounce: 2, spr: i % 10, val: 1000 + b.k * 200 });
    if (g.level === 50 || big) g.items.push({ x: b.x, y: b.y, vx: 0, vy: -150, kind: 'life', w: 10, h: 10, age: -6, bounce: 2 });
    g.addScore(10000 + b.k * 3000 + (big ? 80000 : 0), b.x, b.y - 10);
    g.state = 'clear'; g.clearT = 4.5; g.nextLevel = g.level + 1; snd('clear'); snd('win');
    g.banner(big ? 'MISSION COMPLETE' : 'WORLD CLEARED', 3.4, 'good');
  }

  B.begin = function (g) {
    const k = g.world, W = W_(g), hp = Math.round((16 + k * 5.5) * g.diff.foe * (k === 9 ? 1.4 : 1));
    const HB = [[19, 14], [21, 11], [14, 20], [13, 11], [18, 20], [19, 12], [17, 17], [26, 10], [17, 18], [19, 19]][k];
    const b = { k, name: G.levels.WORLDS[k].boss, x: W / 2, y: 100, hw: HB[0], hh: HB[1], hp, max: hp, t: 0, anim: 0, hurtT: 0, vx: 0, vy: 0, face: -1, dir: 1, st: 0, stT: 2.2, atk: 2.6, mT: 9, bT: 0, rage: false, dying: false, deadT: 0, ph: 0, ang: 0, tp: 0, trail: [], trT: 0, lane: 104, ground: true, giftT: 9, e: { x: 0, y: 0, vx: 0, vy: 0, w: 0, h: 0, maxFall: 380 }, spr: build(k, k) };
    if (k === 0 || k === 2 || k === 5) { b.x = W * 0.7; b.y = floorY() - b.hh; }
    else if (k === 1) b.y = 52;
    else if (k === 3) { b.x = 34; b.lane = 104; }
    else if (k === 6) b.y = 84;
    else if (k === 7) { b.x = 46; b.y = 62; b.lane = 62; b.stT = 6; }
    else if (k === 8) { b.y = 80; g.room.lowg.push({ x0: 16, y0: 16, x1: W - 16, y1: 230 }); }
    else if (k === 9) b.y = 88;
    g.bossObj = b; g.foes = []; g.chaser = null;
  };

  B.update = function (g, dt) {
    const b = g.bossObj; if (!b) return;
    if (b.dying) { dying(g, b, dt); return; }
    if (g.state !== 'play') return;
    const P = g.P, W = W_(g);
    b.t += dt; b.anim += dt; if (b.hurtT > 0) b.hurtT -= dt;
    if (!b.rage && b.k !== 9 && b.hp < b.max * 0.4) { b.rage = true; g.banner('ENRAGED!', 1.4, 'bad'); snd('boss'); g.shake = 5; }
    AI[b.k](g, b, dt);
    if (b.dying) return;
    const mn = MIN[b.k]; if (mn) { b.mT -= dt; if (b.mT <= 0) { b.mT = mn.t / (b.rage ? 1.3 : 1); minion(g, U.pick(mn.types), mn.max); } }
    b.giftT -= dt; if (b.giftT <= 0) { b.giftT = rnd(11, 16); g.spawnBubble(U.pick(['coolant', 'arc', 'plasma']), rnd(40, W - 40), 30, { life: 14, vy: 12, r: 9 }); }
    if (b.ghost) return;
    // bubbles wear it down
    for (const bu of g.bubbles) {
      if (bu.dead || bu.enemy || bu.kind !== 'air') continue;
      if (Math.abs(bu.x - b.x) < b.hw + 4 && Math.abs(bu.y - b.y) < b.hh + 4) { g.popBubble(bu, false); if (b.shield) snd('hit'); else hurt(g, b, 1); if (b.dying) return; }
    }
    // special blasts
    for (const s of g.shots) {
      if (s.bt > 0) s.bt -= dt;
      if (!s.kills || s.dead || s.bt > 0 || b.shield) continue;
      if (Math.abs(s.x - b.x) < b.hw + s.r && Math.abs(s.y - b.y) < b.hh + s.r) { s.bt = 0.45; if (s.kind === 'arc') s.dead = true; hurt(g, b, s.kind === 'fire' ? 2 : s.kind === 'arc' ? 4 : 3); if (b.dying) return; }
    }
    // touching it hurts
    if (!P.dead) {
      if (Math.abs(P.x - b.x) < b.hw * 0.85 + 4 && Math.abs((P.y - 7) - b.y) < b.hh * 0.9 + 6) g.killPlayer();
      if (b.k === 3) for (let i = 1; i < 9; i++) { const q = b.trail[Math.min(b.trail.length - 1, i * 4)]; if (q && Math.hypot(q.x - P.x, q.y - (P.y - 7)) < 11) { g.killPlayer(); break; } }
    }
  };

  /* ---------- drawing ---------- */
  B.draw = function (ctx, g, time) {
    const b = g.bossObj; if (!b || b.gone) return;
    if (!b.ghost) {
      const set = b.rage ? b.spr.rage : b.spr.norm, fr = Math.floor(b.anim * (b.rage ? 7 : 4)) & 1;
      let s = set[fr]; if (b.hurtT > 0) s = s.fl || (s.fl = PX.flash(s, 'rgba(255,255,255,0.85)'));
      const jx = b.dying ? Math.round(rnd(-2, 2)) : 0, jy = b.dying ? Math.round(rnd(-1, 1)) : 0;
      if (b.k === 3) for (let i = 8; i >= 1; i--) { const q = b.trail[Math.min(b.trail.length - 1, i * 4)]; if (!q) continue; const sg = b.spr.seg[b.rage ? 1 : 0]; ctx.drawImage(sg.c, Math.round(q.x - sg.ox), Math.round(q.y - sg.oy)); }
      if (b.face < 0 && FACE[b.k]) { ctx.save(); ctx.translate(Math.round(b.x) + jx, 0); ctx.scale(-1, 1); ctx.drawImage(s.c, -s.ox, Math.round(b.y - s.oy) + jy); ctx.restore(); }
      else ctx.drawImage(s.c, Math.round(b.x - s.ox) + jx, Math.round(b.y - s.oy) + jy);
      if (b.shield) { ctx.fillStyle = '#7affff'; const R = b.hw + 7; for (let a = 0; a < 6.2832; a += 0.14) ctx.fillRect(Math.round(b.x + Math.cos(a + time * 2) * R), Math.round(b.y + Math.sin(a + time * 2) * R), 2, 2); }
      if (b.k === 9 && b.ph >= 1) { ctx.fillStyle = '#ff9aff'; for (let i = 0; i < 18; i++) { const a = time * 2 + i * 0.35, r = 46 - ((time * 24 + i * 7) % 40); ctx.fillRect(Math.round(b.x + Math.cos(a) * r), Math.round(b.y + Math.sin(a) * r * 0.7), 1, 1); } }
    }
    if (b.dying) return;
    const cx = Math.round(g.cols * TILE / 2), k = U.clamp(b.hp / b.max, 0, 1), n = Math.round(120 * k);
    ctx.fillStyle = '#0b0d1a'; ctx.fillRect(cx - 62, 21, 124, 8); ctx.fillStyle = '#3a1620'; ctx.fillRect(cx - 60, 23, 120, 4);
    ctx.fillStyle = b.rage ? '#ff5a3a' : '#ff9a3a'; ctx.fillRect(cx - 60, 23, n, 4); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(cx - 60, 23, n, 1);
    PX.text(ctx, b.name, cx, 31, { s: 1, c: b.rage ? '#ff9a8a' : '#ffd0c0', o: '#0b0d1a', a: 'c' });
  };
})((window.SGS = window.SGS || {}));
