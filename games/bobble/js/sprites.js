/* Pixel sprites: the astronaut, seven alien types (recoloured per world), bubbles, items. Everything is drawn once at startup. */
(function (G) {
  'use strict';
  const PX = G.px, Pix = PX.Pix, rgb = PX.rgb;
  const S = {};
  G.sprites = S;
  const rp = (a) => a.map(rgb);
  const SUIT = rp(['#ffffff', '#e8effd', '#c6d3f0', '#8ea2d2', '#5d6eaa']), VISOR = rp(['#dffcff', '#5bd6f6', '#1c88d2', '#0f4f96', '#0a2c5e']), ORNG = rp(['#ffd884', '#ffa63c', '#ee7a1c', '#b44a1a', '#7a2a14']), METAL = rp(['#cbd5ec', '#9caacb', '#6e7ba0', '#48527a', '#2c3352']);
  const mask = (w, h, fn) => { const m = new Pix(w, h); fn(m); return m; };
  const pm = (p, ramp, cap, fn) => p.paint(mask(p.w, p.h, fn), 0, 0, ramp, cap);
  const sp = (p, ax, ay) => PX.sprite(p, ax, ay).c;
  const tint = (p, col, amt) => { for (let i = 0; i < p.d.length; i++) if (p.d[i]) p.d[i] = PX.mix(p.d[i], rgb(col), amt); };

  /* ---------- the astronaut: opt = { leg 0..3 (-1 standing), air 0/1/2, blow, flip } ---------- */
  function hero(o) {
    const p = new Pix(18, 20), by = o.bob || 0;
    const legs = o.leg >= 0 ? [[-1, 1], [0, 0], [1, -1], [0, 0]][o.leg] : [0, 0], air = o.air || 0;
    pm(p, METAL, 2, (m) => m.rect(2, 8 + by, 4, 6, 1)); p.rect(3, 6 + by, 2, 2, ORNG[2]); p.rect(3, 6 + by, 1, 1, ORNG[0]);
    // legs
    const ly = 14 + by, lift = air ? [0, 0] : [Math.max(0, legs[0]), Math.max(0, legs[1])];
    pm(p, SUIT.map((c) => PX.mix(c, rgb('#2a3566'), 0.25)), 2, (m) => { m.rect(5 + (air === 1 ? -1 : 0) + Math.min(0, legs[0]), ly, 3, 3 - lift[0], 1); });
    pm(p, SUIT, 2, (m) => { m.rect(9 + (air === 2 ? 1 : 0) + Math.max(0, legs[1]) * 0, ly, 3, 3 - lift[1], 1); });
    p.rect(4 + Math.min(0, legs[0]), 16 + by - lift[0], 4, 1, METAL[3]); p.rect(9, 16 + by - lift[1], 4, 1, METAL[3]);
    // body + head
    pm(p, SUIT, 3, (m) => { m.rect(4, 9 + by, 9, 6, 1); m.set(4, 9 + by, 0); m.set(12, 14 + by, 0); });
    p.rect(4, 13 + by, 9, 1, ORNG[3]); p.rect(7, 13 + by, 3, 1, ORNG[1]); p.set(10, 10 + by, VISOR[1]); p.set(9, 11 + by, ORNG[1]);
    p.shade3d(mask(18, 20, (m) => m.ell(8.5, 5 + by, 5.4, 5, 1)), 0, 0, SUIT, { depth: 4 });
    const vm = mask(18, 20, (m) => m.ell(10.4, 5.2 + by, 3.4, 2.9, 1));
    p.paint(vm, 0, 0, [VISOR[3], VISOR[3], VISOR[3], VISOR[4], VISOR[4]], 3); p.set(9, 4 + by, rgb('#eaffff')); p.set(10, 4 + by, rgb('#eaffff')); p.set(8, 5 + by, VISOR[1]);
    // arm with the bubble blaster
    const ay = o.air === 1 ? 7 : 10;
    if (o.blow) { p.rect(11, ay + by, 3, 2, SUIT[2]); pm(p, METAL, 2, (m) => m.rect(13, ay - 1 + by, 3, 4, 1)); p.rect(15, ay + by, 1, 2, rgb('#9ae8ff')); }
    else { p.rect(11, ay + by, 3, 2, SUIT[2]); p.rect(13, ay + by, 2, 2, METAL[2]); p.set(14, ay + by, rgb('#9ae8ff')); }
    return p;
  }
  S.initHero = function () {
    const H = {};
    H.stand = [sp(hero({ leg: -1 }), 9, 17)];
    H.run = [0, 1, 2, 3].map((i) => sp(hero({ leg: i, bob: i % 2 ? 1 : 0 }), 9, 17));
    H.up = sp(hero({ leg: -1, air: 1 }), 9, 17); H.down = sp(hero({ leg: -1, air: 2 }), 9, 17);
    H.blow = sp(hero({ leg: -1, blow: true }), 9, 17); H.blowAir = sp(hero({ leg: -1, air: 2, blow: true }), 9, 17);
    // dying: tumbling helmet
    const d = hero({ leg: -1 }); const f = new Pix(18, 20); for (let y = 0; y < 20; y++) for (let x = 0; x < 18; x++) { const c = d.get(x, y); if (c) f.set(x, 19 - y, c); }
    H.die = [H.stand[0], sp(d, 9, 15), sp(f, 9, 17), sp(d, 9, 15)];
    S.hero = H;
  };

  /* ---------- aliens (face right; flip at draw time). type: 0 droid, 1 zapper, 2 drone, 3 hopper, 4 bomber, 5 floater, 6 charger ---------- */
  function foe(type, hue, angry, fr) {
    const p = new Pix(16, 16), H = angry ? 356 : hue, R = PX.ramp(H, angry ? 78 : 58, angry ? 46 : 44), D = R.map((c) => PX.mix(c, rgb('#1a1030'), 0.38));
    const eye = angry ? rgb('#ff3a3a') : rgb('#ffe45a'), W = rgb('#ffffff'), K = rgb('#16162a'), w = fr & 1;
    const eyeAt = (x, y) => { p.set(x, y, W); p.set(x + 1, y, W); p.set(x, y + 1, W); p.set(x + 1, y + 1, eye); };
    if (type === 0) {
      p.shade3d(mask(16, 16, (m) => { m.ell(8, 8, 6, 6, 1); m.rect(2, 8, 12, 4, 1); }), 0, 0, R, { depth: 4 });
      p.rect(4 + w, 12, 3, 2, D[2]); p.rect(9 - w, 12, 3, 2, D[2]); eyeAt(8, 5); p.rect(5, 9, 6, 1, D[3]);
    } else if (type === 1) {
      pm(p, R, 2, (m) => m.rect(2, 5, 10, 8, 1)); p.rect(2, 11, 10, 1, D[3]); p.rect(7, 1, 1, 4, D[2]); p.set(7, 0, angry ? rgb('#ff6a6a') : rgb('#7affd8'));
      p.rect(9, 6, 5, 3, METAL[3]); p.rect(13, 7, 2, 1, METAL[0]); p.rect(4, 6, 6, 3, K); p.rect(7, 7, 2, 1, eye);
      p.rect(3 + w, 13, 3, 2, D[2]); p.rect(9 - w, 13, 3, 2, D[2]);
    } else if (type === 2) {
      p.shade3d(mask(16, 16, (m) => m.ell(8, 10, 7, 3.2, 1)), 0, 0, R, { depth: 3 }); p.shade3d(mask(16, 16, (m) => m.ell(8, 7.5, 3.6, 3.2, 1)), 0, 0, [rgb('#e8fbff'), rgb('#9ae8ff'), rgb('#4aa8e8'), rgb('#2a68b8'), rgb('#143a78')], { depth: 2 });
      eyeAt(8, 6); const rx = w ? 2 : 4; p.rect(rx, 3, 3, 1, METAL[1]); p.rect(15 - rx - 3, 3, 3, 1, METAL[1]); p.rect(7, 4, 2, 1, METAL[3]); p.rect(5, 13, 6, 1, D[3]);
    } else if (type === 3) {
      p.shade3d(mask(16, 16, (m) => m.ell(8, 8.5, 6, 5, 1)), 0, 0, R, { depth: 4 });
      p.rect(6, 2, 2, 3, D[2]); p.rect(9, 2, 2, 3, D[2]); eyeAt(6, 1); eyeAt(9, 1); p.rect(4, 10, 8, 1, D[4]); for (let x = 5; x < 11; x += 2) p.set(x, 9, W);
      if (w) { p.rect(2, 13, 4, 2, D[2]); p.rect(10, 13, 4, 2, D[2]); } else { p.rect(3, 12, 3, 3, D[2]); p.rect(10, 12, 3, 3, D[2]); }
    } else if (type === 4) {
      p.shade3d(mask(16, 16, (m) => m.ell(8, 10, 4.6, 4.2, 1)), 0, 0, R, { depth: 3 }); eyeAt(7, 8); p.rect(5 + w, 13, 2, 2, D[2]); p.rect(9 - w, 13, 2, 2, D[2]);
      p.shade3d(mask(16, 16, (m) => m.disc(8, 3.4, 2.8, 1)), 0, 0, [rgb('#7a7a9a'), rgb('#4a4a6a'), rgb('#2a2a40'), rgb('#18182a'), rgb('#0c0c18')], { depth: 2 }); p.set(8, 0, w ? rgb('#ffe27a') : rgb('#ff7a2a')); p.rect(4, 5, 1, 4, R[2]); p.rect(12, 5, 1, 4, R[2]);
    } else if (type === 5) {
      p.shade3d(mask(16, 16, (m) => { m.ell(8, 6, 6, 5, 1); m.rect(2, 6, 12, 2, 1); }), 0, 0, R, { depth: 4 }); eyeAt(5, 4); eyeAt(9, 4);
      for (const x of [3, 6, 9, 12]) for (let y = 9; y < 14; y++) p.set(x + ((y + w * 2) & 2 ? 1 : 0), y, R[3]);
    } else {
      pm(p, R, 3, (m) => { m.rect(2, 5, 12, 8, 1); m.set(2, 5, 0); m.set(13, 5, 0); }); p.poly([[3, 5], [4, 0], [6, 5]], D[2]); p.poly([[10, 5], [12, 0], [13, 5]], D[2]); p.set(4, 1, W); p.set(12, 1, W);
      eyeAt(9, 7); p.rect(8, 11, 4, 1, D[4]); p.rect(3 + w, 13, 3, 2, D[2]); p.rect(10 - w, 13, 3, 2, D[2]);
    }
    return p;
  }
  const foeCache = {};
  /* S.foes(world)[type][angry][frame] = canvas, anchor = bottom centre (8,15) */
  S.foes = function (world) {
    if (foeCache[world]) return foeCache[world];
    const hue = G.levels.WORLDS[world].hue, hs = [(hue + 150) % 360, (hue + 40) % 360, (hue + 190) % 360, (hue + 100) % 360, (hue + 60) % 360, (hue + 230) % 360, (hue + 20) % 360], out = [];
    for (let t = 0; t < 7; t++) { out[t] = [[], []]; for (let a = 0; a < 2; a++) for (let f = 0; f < 2; f++) out[t][a][f] = sp(foe(t, hs[t], a === 1, f), 8, 15); }
    return (foeCache[world] = out);
  };

  /* ---------- bubbles (translucent, drawn with real alpha) ---------- */
  const rgba = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
  const TINT = { air: [160, 224, 255], coolant: [90, 160, 255], arc: [255, 226, 90], plasma: [255, 130, 70], letter: [255, 214, 100] };
  function bubble(kind, r, squash) {
    const n = r * 2 + 4, p = new Pix(n, n), c = n / 2, t = TINT[kind] || TINT.air, k = kind === 'air' ? 0 : 1;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const dx = (x + 0.5 - c) / (squash || 1), dy = y + 0.5 - c, d = Math.hypot(dx, dy);
      if (d > r) continue;
      if (d > r - 1.2) p.set(x, y, dx > 1 && dy > 1 ? rgba(t[0] * 0.55, t[1] * 0.7, 255, 210) : rgba(t[0], t[1], t[2], 235));
      else p.set(x, y, ((x + y) & 1) ? rgba(t[0], t[1], t[2], k ? 70 : 38) : rgba(t[0], t[1], t[2], k ? 36 : 14));
    }
    const hx = Math.round(c - r * 0.5), hy = Math.round(c - r * 0.55);
    p.set(hx, hy, rgba(255, 255, 255, 255)); p.set(hx + 1, hy, rgba(255, 255, 255, 255)); p.set(hx, hy + 1, rgba(255, 255, 255, 230));
    return p;
  }
  function symbol(p, kind, ch) {
    const c = p.w / 2 | 0, W = rgb('#ffffff'), K = rgb('#101028');
    if (kind === 'letter') {
      const gl = PX.glyphs[ch];
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (gl[y][x] === '1') p.set(c - 2 + x, c - 3 + y, K);
      for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (gl[y][x] === '1') p.set(c - 3 + x, c - 4 + y, W);
    } else if (kind === 'coolant') { p.rect(c - 1, c - 4, 2, 2, W); p.rect(c - 2, c - 2, 4, 4, W); p.rect(c - 1, c + 2, 2, 1, W); }
    else if (kind === 'arc') { for (const [x, y] of [[2, -4], [1, -3], [0, -2], [-1, -1], [1, -1], [0, 0], [-1, 1], [-2, 2], [-3, 3]]) p.set(c + x, c + y, W); }
    else if (kind === 'plasma') { p.rect(c - 1, c - 4, 2, 3, W); p.rect(c - 2, c - 1, 4, 4, W); p.rect(c - 1, c - 5, 1, 2, W); }
  }
  S.initBubbles = function () {
    const B = { air: [bubble('air', 8, 1).toCanvas(1), bubble('air', 8, 0.93).toCanvas(1)], big: {} };
    for (const k of ['coolant', 'arc', 'plasma']) { const p = bubble(k, 9, 1); symbol(p, k); B.big[k] = p.toCanvas(1); }
    B.letter = 'EXTEND'.split('').map((ch) => { const p = bubble('letter', 9, 1); symbol(p, 'letter', ch); return p.toCanvas(1); });
    S.bub = B;
  };

  /* ---------- items ---------- */
  function snack(i) {
    const p = new Pix(12, 12), c = (h) => rgb(h);
    if (i === 0) { p.disc(6, 6, 5, c('#a8682a')); p.rect(4, 4, 4, 4, c('#ffd84a')); for (const [x, y] of [[6, 3], [6, 8], [3, 6], [8, 6]]) p.set(x, y, c('#ffd84a')); }
    else if (i === 1) { p.disc(6, 6, 5.2, c('#ff7ac0')); p.rect(5, 5, 2, 2, 0); for (const [x, y] of [[3, 3], [8, 4], [4, 8], [9, 8], [6, 2]]) p.set(x, y, c('#ffffff')); }
    else if (i === 2) { p.rect(3, 7, 6, 4, c('#4a7ae0')); p.disc(6, 5, 3.2, c('#ff9ad0')); p.rect(5, 2, 2, 2, c('#ff9ad0')); p.set(6, 0, c('#ff3a3a')); p.set(6, 1, c('#ff3a3a')); }
    else if (i === 3) { p.poly([[3, 6], [9, 6], [6, 12]], c('#e0a050')); p.disc(6, 4, 3.4, c('#9ae8ff')); p.rect(5, 2, 2, 1, c('#ffffff')); }
    else if (i === 4) { p.poly([[1, 10], [11, 10], [11, 4]], c('#ffd84a')); p.set(8, 8, c('#c8941a')); p.set(5, 9, c('#c8941a')); p.set(9, 6, c('#c8941a')); p.rect(1, 10, 10, 1, c('#e0b030')); }
    else if (i === 5) { p.disc(6, 7, 4.6, c('#ff4a5a')); p.rect(6, 1, 1, 3, c('#7a4a1a')); p.poly([[7, 2], [10, 1], [8, 4]], c('#4ad07a')); p.set(4, 5, c('#ffd0d0')); }
    else if (i === 6) { p.rect(2, 2, 8, 3, c('#d89a3a')); p.rect(1, 5, 10, 1, c('#4ad07a')); p.rect(2, 6, 8, 2, c('#8a3a1a')); p.rect(2, 8, 8, 3, c('#d89a3a')); p.set(4, 3, c('#fff4c0')); p.set(7, 3, c('#fff4c0')); }
    else if (i === 7) { p.rect(3, 4, 6, 4, c('#ff5a9a')); p.poly([[0, 3], [3, 5], [0, 8]], c('#ffd84a')); p.poly([[12, 3], [9, 5], [12, 8]], c('#ffd84a')); p.rect(4, 5, 2, 1, c('#ffffff')); }
    else if (i === 8) { p.poly([[1, 3], [11, 3], [6, 12]], c('#ffd84a')); p.rect(1, 2, 10, 2, c('#d8902a')); for (const [x, y] of [[4, 5], [7, 5], [6, 8]]) p.rect(x, y, 2, 2, c('#e83a3a')); }
    else { p.poly([[6, 0], [11, 5], [6, 11], [1, 5]], c('#4adfff')); p.poly([[6, 0], [8, 5], [6, 11]], c('#1a9ad8')); p.poly([[6, 0], [4, 5], [1, 5]], c('#bff4ff')); }
    return p;
  }
  function potion(col) {
    const p = new Pix(10, 12), c = rgb(col);
    p.rect(4, 0, 2, 2, rgb('#c8a060')); p.rect(4, 2, 2, 2, rgb('#e8f4ff')); p.disc(5, 8, 4.2, rgb('#e8f4ff')); p.disc(5, 8.4, 3.2, c); p.rect(3, 7, 2, 1, PX.mix(c, rgb('#ffffff'), 0.6));
    return p;
  }
  function warpRing() {
    const p = new Pix(14, 14), c = 7;
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) { const d = Math.hypot(x + 0.5 - c, y + 0.5 - c), a = Math.atan2(y - c, x - c); if (d < 6.2 && d > 2.4) p.set(x, y, Math.sin(a * 2 + d) > 0 ? rgb('#c88aff') : rgb('#6a4ad8')); }
    p.disc(c, c, 1.6, rgb('#ffffff'));
    return p;
  }
  S.initItems = function () {
    S.snack = []; for (let i = 0; i < 10; i++) S.snack.push(sp(snack(i), 6, 11));
    S.candy = { speed: sp(potion('#3a8aff'), 5, 11), rapid: sp(potion('#ff4ad8'), 5, 11), range: sp(potion('#ffd24a'), 5, 11) };
    S.warp = sp(warpRing(), 7, 12);
    const life = new Pix(12, 12); life.shade3d(mask(12, 12, (m) => m.disc(6, 6, 5, 1)), 0, 0, SUIT, { depth: 3 }); life.paint(mask(12, 12, (m) => m.ell(7.5, 5.6, 3, 2.6, 1)), 0, 0, VISOR, 2); S.life = sp(life, 6, 11);
    const p = new Pix(20, 20), c = 10;
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) { const d = Math.hypot(x + 0.5 - c, y + 0.5 - c); if (d < 9) p.set(x, y, d < 4 ? rgb('#050510') : PX.dither(x, y, (d - 4) / 5) ? rgb('#3a1a6a') : rgb('#6a2ab8')); }
    p.rect(5, 6, 3, 3, rgb('#ff4a4a')); p.rect(12, 6, 3, 3, rgb('#ff4a4a')); p.set(6, 7, rgb('#ffffff')); p.set(13, 7, rgb('#ffffff'));
    S.maw = sp(p, 10, 10);
  };
  S.init = function () { S.initHero(); S.initBubbles(); S.initItems(); };
})((window.SGS = window.SGS || {}));
