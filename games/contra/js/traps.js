/* Trap and moving-platform art, themed per world: spike strips, flame / plasma jets with their vents, falling spikes and boulders, spring pads, and the platform strips (moving, crumbling, blinking). */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix, rgb = PX.rgb;
  const A = (GFX.art = GFX.art || {});
  const rp = (a) => a.map(rgb);
  const SPIKE = [rp(['#f6f0d0', '#d8d094', '#a89a58', '#6a5a38', '#3a2a24']), rp(['#ffffff', '#d6f6ff', '#8ad4ff', '#4a8ad8', '#26468c']), rp(['#8a7a90', '#584a68', '#362c46', '#1e1830', '#0c0814']), rp(['#fff0e0', '#f4cab2', '#cc8c88', '#8c4a62', '#4a2038']), rp(['#e8eeff', '#b0c0e4', '#7888b8', '#4a5890', '#2a3260'])];
  const TIP = ['#ff7ad0', '#ffffff', '#ff9a2a', '#ffe27a', '#ffb02e'];
  const STEEL = rp(['#c6d2f0', '#98a8d0', '#6a7aa8', '#47547f', '#2a3258']);
  const LH = 15;
  const pm = (p, ramp, cap, fn) => { const m = new Pix(p.w, p.h); fn(m); p.paint(m, 0, 0, ramp, cap); };
  const cache = {};

  function spikeTile(t) {
    const p = new Pix(7, 13), R = SPIKE[t];
    for (let y = 0; y < 13; y++) { const half = Math.max(0.5, (y + 1) / 13 * 3.5); for (let x = 0; x < 7; x++) { const dx = x + 0.5 - 3.5; if (Math.abs(dx) <= half) p.set(x, y, dx < -0.4 ? R[1] : dx > 0.4 ? R[3] : R[0]); } }
    p.set(3, 0, rgb(TIP[t])); p.set(3, 1, rgb(TIP[t])); p.rect(0, 12, 7, 1, R[4]);
    return PX.sprite(p, 0, 13, { outline: true });
  }
  function ventSprite(t) {
    const p = new Pix(14, 5), plasma = t === 4;
    pm(p, STEEL, 2, (m) => m.rect(0, 1, 14, 4, 1));
    p.rect(2, 2, 10, 1, rgb('#0c0e1e')); for (let x = 2; x < 12; x += 2) p.set(x, 2, rgb(plasma ? '#6ae8ff' : '#ff9a2a')); p.rect(0, 0, 14, 1, STEEL[1]);
    return PX.sprite(p, 7, 5);
  }
  function flame(t, f) {
    const H = 52, p = new Pix(18, H), plasma = t === 4, cols = rp(plasma ? ['#ffffff', '#c8fbff', '#6ae8ff', '#2a8ae8', '#1a3ea8'] : ['#fffbe0', '#ffe27a', '#ffa22a', '#ee5a1c', '#a02a18']);
    for (let i = 0; i < H - 2; i++) {
      const u = i / (H - 2), hw = 5.2 * Math.pow(1 - u, 0.55) + Math.sin(i * 0.55 + f * 1.7) * 1.1 * (0.3 + u), c = 9 + Math.sin(i * 0.3 - f * 1.3) * 1.4 * u, y = H - 1 - i;
      for (let x = Math.ceil(c - hw); x <= Math.floor(c + hw); x++) { const d = Math.abs(x + 0.5 - c) / Math.max(0.5, hw), s = d * 0.9 + u * 0.55; p.set(x, y, cols[s < 0.22 ? 0 : s < 0.45 ? 1 : s < 0.7 ? 2 : s < 0.9 ? 3 : 4]); }
    }
    return PX.sprite(p, 9, H, { outline: false });
  }
  function dropSprite(t) {
    const R = SPIKE[t];
    if (t === 1 || t === 3 || t === 4) {
      const p = new Pix(10, 20); pm(p, R, 3, (m) => m.poly([[0, 2], [10, 2], [6, 20], [4, 20]], 1)); p.rect(0, 0, 10, 3, STEEL[4]); p.rect(0, 0, 10, 1, STEEL[2]); p.set(5, 19, rgb(TIP[t]));
      return PX.sprite(p, 5, 0);
    }
    const p = new Pix(14, 15), base = t === 0 ? rp(['#c8f08a', '#8ad048', '#4a9a30', '#2a6428', '#143a1c']) : R;
    pm(p, base, 3, (m) => { m.disc(7, 8, 5.6, 1); m.poly([[7, 0], [9, 3], [5, 3]], 1); m.poly([[0, 8], [3, 6], [3, 10]], 1); m.poly([[14, 8], [11, 6], [11, 10]], 1); m.poly([[7, 15], [9, 12], [5, 12]], 1); });
    if (t === 2) for (const [x, y] of [[5, 6], [8, 9], [6, 10], [9, 6]]) p.set(x, y, rgb('#ff9a2a')); else for (const [x, y] of [[7, 0], [0, 8], [14 - 1, 8]]) p.set(x, y, rgb('#ff7ad0'));
    return PX.sprite(p, 7, 0);
  }
  function springPad(ext) {
    const p = new Pix(16, 12), h = ext ? 12 : 7;
    for (let i = 0; i < h - 3; i++) { const y = 12 - 1 - i; p.rect(i % 2 ? 4 : 5, y, 7 - (i % 2), 1, i % 2 ? STEEL[3] : STEEL[1]); }
    pm(p, rp(['#ffd0c0', '#ff7a5a', '#e83a2a', '#a01a22', '#5a0c18']), 2, (m) => m.rect(1, 12 - h, 14, 3, 1));
    p.rect(1, 12 - h, 14, 1, rgb('#ffe0d0')); p.rect(0, 11, 16, 1, STEEL[4]);
    return PX.sprite(p, 8, 12);
  }
  /* ---------- platform strips: a left cap, a tiling middle and a right cap per style ---------- */
  function strip(w, caps, body) {
    const p = new Pix(w, LH);
    body(p, w, caps);
    return { c: p.toCanvas(K), w: w * K, h: LH * K };
  }
  function edgeCut(p, w, caps) { // rounded end
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3 - y; x++) { if (caps === 1) p.set(x, y, 0); else if (caps === 2) p.set(w - 1 - x, y, 0); }
  }
  function moverBody(t) {
    const glow = rgb(A.worldPal[t].glow);
    return (p, w, caps) => {
      for (let x = 0; x < w; x++) {
        p.set(x, 0, STEEL[0]); p.set(x, 1, STEEL[1]); p.set(x, 2, STEEL[2]); p.set(x, 3, STEEL[2]); p.set(x, 4, STEEL[3]); p.set(x, 5, STEEL[4]);
        if ((x + (caps === 2 ? 0 : 0)) % 8 === 3) { p.set(x, 2, STEEL[0]); p.set(x, 3, STEEL[4]); }
      }
      if (caps !== 1 && caps !== 2) for (let x = 0; x < w; x += 16) { p.rect(x + 5, 6, 6, 2, STEEL[4]); p.rect(x + 6, 6, 4, 1, STEEL[2]); p.rect(x + 6, 8, 4, 2, glow); p.rect(x + 7, 8, 2, 1, rgb('#ffffff')); p.rect(x + 7, 10, 2, 2, PX.mix(glow, rgb('#0c0e1e'), 0.5)); }
      else { const x = caps === 1 ? 4 : w - 12; p.rect(x + 1, 6, 6, 2, STEEL[4]); p.rect(x + 2, 8, 4, 2, glow); p.rect(x + 3, 8, 2, 1, rgb('#ffffff')); }
      edgeCut(p, w, caps);
    };
  }
  function crumbleBody(t) {
    const P = A.worldPal[t], ea = P.earth.map(rgb), st = rgb(P.stone), rnd = PX.rng(t * 17 + 3);
    return (p, w, caps) => {
      for (let x = 0; x < w; x++) {
        const bot = 7 + Math.floor(rnd() * 3);
        for (let y = 0; y <= bot; y++) p.set(x, y, y === 0 ? PX.mix(st, rgb('#ffffff'), 0.8) : y === 1 ? PX.mix(st, rgb('#ffffff'), 0.4) : y < 4 ? PX.mix(ea[0], rgb('#ffffff'), 0.28) : y < bot - 1 ? PX.mix(ea[1], rgb('#ffffff'), 0.12) : ea[2]);
        if (rnd() < 0.2) p.set(x, bot + 1, ea[3]);
        if (rnd() < 0.5) p.set(x, 2 + Math.floor(rnd() * 3), ea[3]);
      }
      for (let i = 0; i < Math.max(1, w / 8); i++) { let x = Math.floor(rnd() * w), y = 1; for (let q = 0; q < 8; q++) { p.set(x, y, rgb(q < 5 ? '#ff9a50' : '#0c0814')); y++; x += Math.floor(rnd() * 3) - 1; } }
      edgeCut(p, w, caps);
    };
  }
  function blinkBody(t, ghost, hot) {
    const glow = rgb(A.worldPal[t].glow), dim = PX.mix(glow, rgb('#0c0e22'), 0.3), dk = rgb('#0e1230');
    return (p, w, caps) => {
      for (let x = 0; x < w; x++) {
        if (ghost) { if ((x & 1) === 0) { p.set(x, 0, dim); p.set(x, 6, dim); } if (x === 0 || x === w - 1) for (let y = 1; y < 6; y += 2) p.set(x, y, dim); continue; }
        p.set(x, 0, rgb('#ffffff')); p.set(x, 1, hot ? rgb('#ffffff') : glow);
        for (let y = 2; y < 6; y++) p.set(x, y, PX.dither(x, y, 0.45) ? PX.mix(glow, dk, 0.45) : dk);
        p.set(x, 6, glow);
      }
      if (!ghost) edgeCut(p, w, caps);
    };
  }
  function set3(mk) { return { left: mk(8, 1), mid: mk(32, 0), right: mk(8, 2) }; }
  A.trapArt = function (t) {
    if (cache[t]) return cache[t];
    const R = {};
    R.spike = spikeTile(t); R.vent = ventSprite(t); R.flame = [0, 1, 2, 3].map((f) => flame(t, f)); R.drop = dropSprite(t); R.spring = [springPad(false), springPad(true)];
    const mv = moverBody(t), cr = crumbleBody(t);
    R.mover = set3((w, c) => strip(w, c, mv)); R.crumble = set3((w, c) => strip(w, c, cr));
    R.blink = { on: set3((w, c) => strip(w, c, blinkBody(t, false, false))), hot: set3((w, c) => strip(w, c, blinkBody(t, false, true))), ghost: set3((w, c) => strip(w, c, blinkBody(t, true))) };
    return (cache[t] = R);
  };
})((window.SGS = window.SGS || {}));
