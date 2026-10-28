/* Static and flying hardware: flyers, pillboxes, turrets, capsule pods, weapon capsules and shot sprites. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix;
  const A = (GFX.art = GFX.art || {});
  const rp = (a) => a.map(PX.rgb);
  const STEEL = rp(['#e2e9f8', '#b3c0de', '#8190b8', '#56638e', '#323c66']);
  const METAL = rp(['#cbd5ec', '#9caacb', '#6e7ba0', '#48527a', '#2c3352']);
  const C = PX.pal({ e: '#ffe45a', E: '#ffffff', t: '#f1e8cc', r: '#ff4a3a', o: '#ffa02e', k: '#161a30', y: '#ffd24a' });
  const dark = (r, t) => r.map((c) => PX.mix(c, PX.rgb('#1a1030'), t));
  const rampOf = (hex) => { const c = PX.rgb(hex); return [PX.mix(c, PX.rgb('#ffffff'), 0.75), PX.mix(c, PX.rgb('#ffffff'), 0.4), c, PX.mix(c, PX.rgb('#0c0e22'), 0.38), PX.mix(c, PX.rgb('#0c0e22'), 0.65)]; };
  A.rampOf = rampOf;
  function pm(p, ramp, cap, fn) { const m = new Pix(p.w, p.h); fn(m); p.paint(m, 0, 0, ramp, cap); }

  /* ---- flyer: 3 flap poses (facing left, anchored at its centre) ---- */
  function flyer(hue, tip) {
    const W = 40, H = 36, OX = 20, OY = 18, p = new Pix(W, H), S = PX.ramp(hue, 62, 46), WG = PX.ramp(hue + 38, 62, 48), SD = dark(S, 0.35);
    const wing = (ox, oy, col, bone) => {
      const tx = OX + tip[0] + ox, ty = OY + tip[1] + oy, rx = OX + ox, ry = OY - 2 + oy;
      pm(p, col, 2, (m) => m.poly([[rx - 2, ry], [rx + 6, ry + 1], [tx + 1, ty + 4], [(tx + rx) / 2 + 3, (ty + ry) / 2 + 5], [tx - 2, ty]], 1));
      p.line(rx - 1, ry, tx, ty, 1, bone);
    };
    wing(3, -1, dark(WG, 0.45), WG[2]);
    pm(p, SD, 2, (m) => { m.poly([[OX + 4, OY], [OX + 11, OY + 3], [OX + 10, OY + 4], [OX + 3, OY + 3]], 1); });
    pm(p, S, 3, (m) => { m.ell(OX, OY, 5.4, 3.8, 1); m.ell(OX - 5.5, OY + 0.5, 3.2, 2.8, 1); });
    p.rect(OX - 8, OY + 2, 3, 1, C.t); p.set(OX - 9, OY + 1, C.t); p.rect(OX - 2, OY + 3, 6, 1, S[4]);
    p.set(OX - 8, OY - 1, C.E); p.set(OX - 7, OY - 1, C.e); p.set(OX - 6, OY - 1, C.e);
    wing(0, 0, WG, WG[0]);
    return PX.sprite(p, OX, OY);
  }
  /* ---- pillbox: armoured bunker, closed and open ---- */
  function pillbox(open) {
    const W = 30, H = 24, OX = 15, OY = 21, p = new Pix(W, H);
    pm(p, STEEL, 4, (m) => { for (let y = 0; y < 18; y++) for (let x = -12; x <= 12; x++) { const dx = x / 12, dy = y / 17; if (dx * dx + (1 - dy) * (1 - dy) <= 1 || y > 15) m.set(OX + x, OY - 17 + y, 1); } m.rect(OX - 12, OY - 3, 25, 3, 1); });
    p.rect(OX - 12, OY - 3, 25, 1, STEEL[3]);
    for (let x = -12; x <= 12; x++) if (((x + 12) >> 2) % 2 === 0) { p.set(OX + x, OY - 2, C.y); p.set(OX + x, OY - 1, C.k); } else { p.set(OX + x, OY - 2, C.k); p.set(OX + x, OY - 1, C.y); }
    for (const [rx, ry] of [[-7, -13], [7, -13], [-10, -7], [10, -7], [-4, -15], [4, -15]]) { p.set(OX + rx, OY + ry, STEEL[0]); p.set(OX + rx + 1, OY + ry + 1, STEEL[4]); }
    p.rect(OX - 11, OY - 10, 23, 1, STEEL[4]);
    if (open) { p.rect(OX - 6, OY - 14, 13, 6, C.k); p.rect(OX - 5, OY - 13, 11, 4, PX.rgb('#3a0a14')); p.disc(OX + 0.5, OY - 11, 2.6, PX.rgb('#ff3b2a')); p.disc(OX + 0.5, OY - 11, 1.2, C.E); p.rect(OX - 6, OY - 14, 13, 1, STEEL[3]); }
    else { p.rect(OX - 5, OY - 12, 11, 2, C.k); p.set(OX, OY - 12, PX.rgb('#ff6a3d')); p.set(OX + 1, OY - 12, PX.rgb('#ff6a3d')); }
    return PX.sprite(p, OX, OY);
  }
  /* ---- turret: dome + 16 pre-rotated barrels ---- */
  function turretDome() {
    const W = 24, H = 20, OX = 12, OY = 17, p = new Pix(W, H);
    pm(p, STEEL, 3, (m) => { for (let y = 0; y < 13; y++) for (let x = -8; x <= 8; x++) { const dx = x / 8, dy = y / 12; if (dx * dx + (1 - dy) * (1 - dy) <= 1) m.set(OX + x, OY - 12 + y, 1); } m.rect(OX - 8, OY - 3, 17, 3, 1); });
    p.rect(OX - 9, OY - 2, 19, 2, STEEL[4]); p.rect(OX - 8, OY - 3, 17, 1, STEEL[4]); p.set(OX - 5, OY - 7, C.o); p.set(OX + 5, OY - 7, C.o); p.set(OX, OY - 10, STEEL[0]);
    return PX.sprite(p, OX, OY);
  }
  function barrel(i) {
    const a = i / 16 * Math.PI * 2, W = 40, H = 40, OX = 20, OY = 20, p = new Pix(W, H), dx = Math.cos(a), dy = Math.sin(a);
    p.line(OX, OY, OX + dx * 13, OY + dy * 13, 4, METAL[4]); p.line(OX, OY, OX + dx * 13, OY + dy * 13, 3, METAL[2]); p.line(OX + dx * 2, OY + dy * 2 - 1, OX + dx * 12, OY + dy * 12 - 1, 1, METAL[0]);
    p.rect(Math.round(OX + dx * 14) - 1, Math.round(OY + dy * 14) - 1, 3, 3, C.o);
    return PX.sprite(p, OX, OY);
  }
  /* ---- capsule pod (carries an item) ---- */
  function pod(fl) {
    const W = 44, H = 28, OX = 22, OY = 14, p = new Pix(W, H), wy = fl ? -7 : -4;
    for (const sx of [-1, 1]) pm(p, dark(STEEL, 0.2), 2, (m) => m.poly([[OX + sx * 5, OY - 3], [OX + sx * 11, OY + wy - 2], [OX + sx * 13, OY + wy + 1], [OX + sx * 8, OY - 2]], 1));
    pm(p, STEEL, 3, (m) => m.ell(OX, OY, 14, 6.2, 1));
    pm(p, dark(STEEL, 0.25), 2, (m) => { m.ell(OX - 15, OY + 1, 3, 2.4, 1); m.ell(OX + 15, OY + 1, 3, 2.4, 1); });
    p.rect(OX - 7, OY - 3, 15, 7, C.k); p.rect(OX - 6, OY - 2, 13, 5, PX.rgb('#0e1a36'));
    p.set(OX - 17, OY + 1, C.o); p.set(OX + 17, OY + 1, C.o); p.rect(OX - 13, OY + 3, 3, 1, STEEL[4]); p.rect(OX + 11, OY + 3, 3, 1, STEEL[4]);
    return PX.sprite(p, OX, OY);
  }
  /* ---- 5x5 capsule letters ---- */
  const L5 = { S: '01111,10000,01110,00001,11110', M: '10001,11011,10101,10001,10001', L: '10000,10000,10000,10000,11111', F: '11111,10000,11110,10000,10000', R: '11110,10001,11110,10010,10001', B: '11110,10001,11110,10001,11110', 1: '00100,01100,00100,00100,01110', U: '10001,10001,10001,10001,01110', P: '11110,10001,11110,10000,10000' };
  function letters(p, str, cx, cy, col) {
    const w = str.length * 6 - 1; let x = cx - Math.floor(w / 2);
    for (const ch of str) { const g = L5[ch].split(','); for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) if (g[r][q] === '1') p.set(x + q, cy - 2 + r, col); x += 6; }
  }
  A.letters = letters;
  function capsule(k, hex) {
    const W = 40, H = 24, OX = 20, OY = 12, p = new Pix(W, H), R = rampOf(hex), wd = k.length > 1 ? 3 : 0;
    for (const sx of [-1, 1]) for (const [tx, ty, w] of [[13 + wd, -8, 3], [14 + wd, -4, 3], [12.5 + wd, 0, 3], [10 + wd, 3, 2]]) pm(p, R, 2, (m) => m.line(OX + sx * (6 + wd), OY - 1, OX + sx * tx, OY + ty, w, 1));
    pm(p, R, 3, (m) => { m.ell(OX, OY, 8.8 + wd, 5.8, 1); });
    p.rect(OX - 7 - wd, OY - 4, 15 + 2 * wd, 9, PX.rgb('#0e1426')); p.rect(OX - 6 - wd, OY - 3, 13 + 2 * wd, 7, PX.rgb('#1b2444'));
    letters(p, k, OX, OY, PX.rgb('#ffffff'));
    return PX.sprite(p, OX, OY);
  }
  /* ---- shots ---- */
  function orb(d, ramp, core) {
    const n = d + 2, p = new Pix(n, n), c = n >> 1;
    pm(p, ramp, 2, (m) => m.disc(n / 2, n / 2, d / 2, 1));
    if (core) { p.set(c - 1, c - 1, core); if (d > 4) { p.set(c, c - 1, core); p.set(c - 1, c, core); } }
    return PX.sprite(p, n / 2, n / 2, { outline: d > 3 });
  }
  function flame(i) {
    const p = new Pix(16, 16), r = [4.6, 5.4, 5, 4.2][i], R = rp(['#ffffff', '#ffe27a', '#ffa02e', '#e0561a', '#8a2410']);
    pm(p, R, 3, (m) => { m.disc(8, 8, r, 1); m.disc(8 + (i % 2 ? 2 : -2), 8 + (i < 2 ? -3 : 3), 2.4, 1); });
    return PX.sprite(p, 8, 8, { outline: false });
  }
  function podLetter(k, hex) {
    const p = new Pix(12, 7); letters(p, k === '1UP' ? 'UP' : k, 6, 3, PX.rgb(hex)); return PX.sprite(p, 6, 3, { outline: false });
  }
  function shieldRing(bright) {
    const n = 40, p = new Pix(n, n), c = n / 2, r = 15.2, R = rp(['#ffffff', '#e8d4ff', '#c88aff', '#8a52d0', '#4a2890']);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const d = Math.hypot(x + 0.5 - c, y + 0.5 - c); if (d <= r && d > r - 1.5) p.set(x, y, bright ? R[0] : R[1]); else if (d <= r - 1.5 && d > r - 3) p.set(x, y, R[2]); else if (d <= r - 3 && PX.dither(x, y, 0.18)) p.set(x, y, R[3]); }
    return PX.sprite(p, c, c, { outline: false });
  }
  A.initFoes2 = function () {
    A.fl = {};
    A.fl.podL = {}; for (const k in A.CAPS) A.fl.podL[k] = podLetter(k, A.CAPS[k].c);
    A.fl.shield = [shieldRing(false), shieldRing(true)];
    A.fl.flyer = (theme) => { const hue = [318, 22, 172, 78, 356][theme]; return [[3, -12], [9, -6], [10, 5]].map((t) => flyer(hue, t)); };
    A.fl.pill = [pillbox(false), pillbox(true)];
    A.fl.pillF = A.fl.pill.map((s) => PX.flash(s));
    A.fl.dome = turretDome(); A.fl.domeF = PX.flash(A.fl.dome);
    A.fl.barrel = []; for (let i = 0; i < 16; i++) A.fl.barrel.push(barrel(i));
    A.fl.pod = [pod(0), pod(1)];
    A.fl.cap = {}; for (const k in A.CAPS) A.fl.cap[k] = capsule(k, A.CAPS[k].c);
    A.fl.bN = orb(4, rp(['#ffffff', '#fff6c0', '#ffe27a', '#ffb02e', '#c26a10']), PX.rgb('#ffffff'));
    A.fl.bM = orb(3, rp(['#ffffff', '#ffe0a0', '#ffb347', '#e0801a', '#a04a10']), PX.rgb('#ffffff'));
    A.fl.bS = orb(6, rp(['#fff0f0', '#ffa0a0', '#ff5a5a', '#c42a3a', '#7a1428']), PX.rgb('#ffffff'));
    const eb = rp(['#ffffff', '#ffc4f2', '#ff6ad8', '#c02098', '#6a1060']);
    A.fl.eb = [orb(5, eb, PX.rgb('#ffffff')), orb(8, eb, PX.rgb('#ffffff')), orb(12, eb, PX.rgb('#ffffff'))];
    A.fl.fire = [0, 1, 2, 3].map(flame);
    const fs = {};
    A.flyerSet = (th) => fs[th] || (fs[th] = (() => { const n = A.fl.flyer(th); return { n, f: n.map((s) => PX.flash(s)) }; })());
  };
})((window.SGS = window.SGS || {}));
