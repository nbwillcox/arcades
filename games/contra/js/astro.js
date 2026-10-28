/* The astronaut: pose sprites are built once from shaded pixel shapes (run cycle x 5 aim directions, prone, somersault) and blitted per frame. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix;
  const A = (GFX.art = GFX.art || {});
  const rp = (a) => a.map(PX.rgb);
  const SUIT = rp(['#ffffff', '#e8effd', '#c6d3f0', '#8ea2d2', '#5d6eaa']);
  const VISOR = rp(['#dffcff', '#5bd6f6', '#1c88d2', '#0f4f96', '#0a2c5e']);
  const ORNG = rp(['#ffd884', '#ffa63c', '#ee7a1c', '#b44a1a', '#7a2a14']);
  const METAL = rp(['#cbd5ec', '#9caacb', '#6e7ba0', '#48527a', '#2c3352']);
  const BOOT = rp(['#8fa0d6', '#6b7cb8', '#4a5a96', '#343f72', '#232a52']);
  const C = PX.pal({ y: '#eaffff', a: '#ffd24a', w: '#ffffff', r: '#ff5a3a' });
  const OX = 20, OY = 30, W = 40, H = 36;
  const mask = (w, h, fn) => { const m = new Pix(w, h); fn(m); return m; };

  function leg(p, col, hipx, fx, fy, back) {
    const hy = -7, kx0 = (hipx + fx) / 2, ky0 = (hy + fy) / 2, dx = fx - hipx, dy = fy - hy, d = Math.hypot(dx, dy) || 1;
    const a = Math.sqrt(Math.max(0, 3.6 * 3.6 - (d / 2) * (d / 2))), kx = kx0 + (dy / d) * a * (back ? 0.6 : 1), ky = ky0 - (dx / d) * a * (back ? 0.6 : 1);
    const m = new Pix(W, H);
    m.line(OX + hipx, OY + hy, OX + kx, OY + ky, 3, 1); m.line(OX + kx, OY + ky, OX + fx, OY + fy, 3, 1);
    p.paint(m, 0, 0, col, 2);
    // boot
    const bm = new Pix(W, H); bm.rect(OX + Math.round(fx) - 2, OY + Math.round(fy) - 1, 6, 3, 1);
    p.paint(bm, 0, 0, back ? BOOT.map((c, i) => PX.mix(c, PX.OUT, 0.25)) : BOOT, 2);
  }
  const BACKLEG = SUIT.map((c) => PX.mix(c, PX.rgb('#2a3566'), 0.45));
  function legs(p, f) {
    let A1, B1;
    if (f === 0) { A1 = [2.5, -1.5]; B1 = [-2.5, -1.5]; }
    else if (f === 7) { A1 = [3.5, -4.5]; B1 = [-3.5, -3]; }
    else { const ph = (f - 1) / 6 * Math.PI * 2; A1 = [Math.sin(ph) * 4.5, -1.5 - Math.max(0, Math.cos(ph)) * 3]; B1 = [Math.sin(ph + Math.PI) * 4.5, -1.5 - Math.max(0, Math.cos(ph + Math.PI)) * 3]; }
    leg(p, BACKLEG, -1, B1[0], B1[1], true);
    return () => leg(p, SUIT, 1, A1[0], A1[1], false);
  }
  function body(p, bob) {
    const by = bob || 0;
    // backpack
    p.paint(mask(W, H, (m) => m.rect(OX - 8, OY - 15 + by, 4, 9, 1)), 0, 0, METAL, 2);
    p.rect(OX - 7, OY - 17 + by, 2, 2, METAL[1]); p.set(OX - 7, OY - 11 + by, PX.rgb('#ff5a3a')); p.set(OX - 6, OY - 11 + by, PX.rgb('#ffd24a')); p.rect(OX - 7, OY - 9 + by, 2, 1, METAL[4]);
    // torso
    p.paint(mask(W, H, (m) => { m.rect(OX - 4, OY - 14 + by, 9, 8, 1); m.set(OX - 4, OY - 14 + by, 0); m.set(OX + 4, OY - 7 + by, 0); }), 0, 0, SUIT, 3);
    p.rect(OX - 4, OY - 8 + by, 9, 1, ORNG[3]); p.rect(OX - 1, OY - 8 + by, 3, 1, ORNG[1]);
    p.paint(mask(W, H, (m) => m.rect(OX + 1, OY - 13 + by, 3, 2, 1)), 0, 0, ORNG, 2); p.set(OX + 3, OY - 12 + by, C.y);
    p.set(OX - 2, OY - 12 + by, C.r); p.set(OX - 2, OY - 10 + by, VISOR[1]);
    // helmet
    p.paint(mask(W, H, (m) => m.ell(OX + 0.5, OY - 18 + by, 4.9, 4.6, 1)), 0, 0, SUIT, 3);
    p.rect(OX - 3, OY - 14 + by, 7, 1, SUIT[4]);
    const vm = mask(W, H, (m) => m.ell(OX + 2.6, OY - 18.2 + by, 3.5, 2.9, 1));
    p.paint(vm, 0, 0, [VISOR[3], VISOR[3], VISOR[3], VISOR[4], VISOR[4]], 3);
    for (let yy = -21; yy <= -17; yy++) for (let xx = 0; xx <= 6; xx++) if (vm.get(OX + xx, OY + yy) && PX.dither(xx + 3, yy + 40, (yy + 21 < 2 ? 0.7 : 0.25))) p.set(OX + xx, OY + yy + by, VISOR[2]);
    p.set(OX + 1, OY - 19 + by, C.y); p.set(OX + 2, OY - 20 + by, C.y); p.set(OX + 2, OY - 19 + by, VISOR[1]); p.set(OX + 5, OY - 16 + by, VISOR[1]);
    p.set(OX - 3, OY - 22 + by, ORNG[1]); p.set(OX - 3, OY - 23 + by, ORNG[2]);
  }
  /* nine arm poses, every 22.5 degrees from straight up to straight down (index 4 = forward); the shoulder pivot is interpolated between the hand-tuned ones */
  const NA = 9, AIMS = [];
  const KEYP = [[-90, [5, -9]], [-45, [2, -11]], [0, [2, -11]], [45, [3, -10]], [90, [4, -9]]];
  for (let i = 0; i < NA; i++) {
    const deg = (i - 4) * 22.5, a = deg * Math.PI / 180;
    let k = 0; while (k < KEYP.length - 2 && deg > KEYP[k + 1][0]) k++;
    const [d0, p0] = KEYP[k], [d1, p1] = KEYP[k + 1], u = (deg - d0) / (d1 - d0);
    AIMS.push({ d: [Math.cos(a), Math.sin(a)], s: [p0[0] + (p1[0] - p0[0]) * u, p0[1] + (p1[1] - p0[1]) * u] });
  }
  function gun(p, ai, by) {
    const d = AIMS[ai].d, s = AIMS[ai].s, sx = OX + s[0], sy = OY + s[1] + (by || 0), at = (t) => [sx + d[0] * t, sy + d[1] * t];
    const L = (t0, t1, w, col) => { const a = at(t0), b = at(t1); p.line(a[0], a[1], b[0], b[1], w, col); };
    L(0, 3, 2, SUIT[3]);                        // forearm
    L(2, 8, 3, METAL[4]); L(2, 8, 2, METAL[3]); L(3, 7, 1, METAL[1]);  // receiver
    L(7.5, 12, 2, METAL[3]); L(7.5, 12, 1, METAL[1]);
    const m = at(11.6); p.set(Math.round(m[0]), Math.round(m[1]), ORNG[1]);
    const mg = at(4.5); p.rect(Math.round(mg[0]) - (d[1] > 0.5 ? 0 : 0), Math.round(mg[1]) + (d[0] > 0.9 ? 1 : 0), d[0] > 0.9 ? 2 : 1, d[0] > 0.9 ? 2 : 2, ORNG[3]);
    const h = at(2.5); p.rect(Math.round(h[0]), Math.round(h[1]), 2, 2, SUIT[0]);
  }
  A.muzzle = [];
  A.initAstro = function () {
    const fr = [];
    for (let ai = 0; ai < NA; ai++) {
      fr[ai] = [];
      for (let f = 0; f < 8; f++) {
        const p = new Pix(W, H), front = legs(p, f), bob = (f === 2 || f === 5) ? 1 : 0;
        body(p, bob); front(); gun(p, ai, bob);
        fr[ai][f] = PX.sprite(p, OX, OY);
      }
    }
    A.astro = { fr };
    // prone
    const p = new Pix(W, H), py = OY;
    p.paint(mask(W, H, (m) => m.rect(OX - 13, py - 6, 5, 6, 1)), 0, 0, SUIT.map((c) => PX.mix(c, PX.rgb('#2a3566'), 0.3)), 2);
    p.paint(mask(W, H, (m) => m.rect(OX - 15, py - 5, 3, 4, 1)), 0, 0, BOOT, 2);
    p.paint(mask(W, H, (m) => m.rect(OX - 8, py - 8, 3, 8, 1)), 0, 0, METAL, 2);
    p.paint(mask(W, H, (m) => { m.rect(OX - 5, py - 7, 10, 7, 1); m.set(OX + 4, py - 7, 0); }), 0, 0, SUIT, 3);
    p.rect(OX - 1, py - 7, 3, 1, ORNG[1]); p.set(OX + 1, py - 4, C.r);
    p.paint(mask(W, H, (m) => m.ell(OX + 6, py - 6.4, 4.2, 4.2, 1)), 0, 0, SUIT, 3);
    p.paint(mask(W, H, (m) => m.ell(OX + 8, py - 6.6, 2.7, 2.4, 1)), 0, 0, VISOR, 2); p.set(OX + 7, py - 7, C.y);
    p.line(OX + 2, py - 4, OX + 7, py - 4, 2, SUIT[2]);
    p.line(OX + 4, py - 5, OX + 9, py - 5, 3, METAL[4]); p.line(OX + 4, py - 5, OX + 9, py - 5, 2, METAL[3]); p.line(OX + 9, py - 5, OX + 14, py - 5, 2, METAL[2]); p.line(OX + 9, py - 5, OX + 14, py - 5, 1, METAL[0]); p.set(OX + 14, py - 5, ORNG[1]);
    A.astro.prone = PX.sprite(p, OX, py);
    // somersault
    A.astro.spin = [];
    for (let i = 0; i < 8; i++) {
      const q = new Pix(W, H), a = i / 8 * Math.PI * 2, cx = OX, cy = OY - 8;
      q.paint(mask(W, H, (m) => m.disc(cx, cy, 6.4, 1)), 0, 0, SUIT, 3);
      for (let t = -5; t <= 5; t++) { const x = cx + Math.cos(a + 1.2) * t * 0.9 + Math.cos(a) * 0.6, y = cy + Math.sin(a + 1.2) * t * 0.9 + Math.sin(a) * 0.6; q.set(Math.round(x), Math.round(y), ORNG[2]); }
      const vx = cx + Math.cos(a) * 3.6, vy = cy + Math.sin(a) * 3.6, vis = Math.cos(a) > -0.2;
      if (vis) { q.paint(mask(W, H, (m) => m.ell(vx, vy, 2.6, 2.2, 1)), 0, 0, VISOR, 2); q.set(Math.round(vx - 1), Math.round(vy - 1), C.y); }
      A.astro.spin.push(PX.sprite(q, OX, cy));
    }
    A.muzzle = [0, 1, 2].map((i) => { const q = new Pix(11, 11); const c = PX.rgb(['#ffffff', '#ffe27a', '#ff9a2a'][i]); q.disc(5, 5, 4 - i, c); q.disc(5, 5, 2 - (i > 1 ? 1 : 0), PX.rgb('#ffffff')); return PX.sprite(q, 5, 5, { outline: false }); });
  };
  /* draw the astronaut; s = {x, y (feet), face, aim (local angle), phase, prone, spin, air, moving, t} */
  A.drawAstro = function (ctx, s) {
    const f = s.face, a = A.astro;
    if (s.spin) { PX.draw(ctx, a.spin[Math.floor(s.t * 22) & 7], s.x, s.y - 2 * K * 0 - 16, f); return; }
    if (s.prone) { PX.draw(ctx, a.prone, s.x, s.y, f); return; }
    const ai = Math.max(0, Math.min(NA - 1, Math.round(s.aim / (Math.PI / 8)) + 4));
    const leg = s.air ? 7 : s.moving ? 1 + (Math.floor(s.phase / (Math.PI * 2) * 6) % 6 + 6) % 6 : 0;
    PX.draw(ctx, a.fr[ai][leg], s.x, s.y, f);
  };
})((window.SGS = window.SGS || {}));
