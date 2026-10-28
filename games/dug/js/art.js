/* Procedural art: the miner, aliens, boulders, minerals, crates and the layered dirt. Everything is drawn once and cached. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly, flashOf = GFX.flashOf;
  const A = {};
  GFX.art = A;

  /* ---- the miner (faces right) ---- */
  function drawMiner(x) {
    x.shadowColor = 'rgba(255,190,80,0.8)'; x.shadowBlur = 6;
    x.fillStyle = lg(x, 0, -8, 0, 12, [[0, '#f4f8ff'], [0.5, '#b8c8e8'], [1, '#5a6a9a']]);
    x.beginPath(); x.ellipse(-2, 5, 9, 9, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffb347'; x.lineWidth = 1.4; x.stroke();
    x.fillStyle = '#ffb347'; x.fillRect(-8, 6, 12, 3);
    x.fillStyle = rg(x, -1, -9, 1, 10, [[0, '#ffffff'], [0.5, '#9fd8ff'], [1, '#2a6aa8']]);
    x.beginPath(); x.arc(0, -6, 8, 0, TAU); x.fill();
    x.fillStyle = '#052a44'; x.beginPath(); x.ellipse(3, -6, 4.4, 3.4, 0, 0, TAU); x.fill();
    x.fillStyle = '#52f0ff'; x.fillRect(1, -7, 5, 1.4);
    x.fillStyle = lg(x, 6, 0, 18, 0, [[0, '#7a8ab0'], [1, '#e8f0ff']]); x.fillRect(6, 3, 9, 4);
    poly(x, [[15, 2], [20, 5], [15, 8]]); x.fillStyle = '#ffd24a'; x.fill();
  }
  /* ---- aliens ---- */
  function drawBlob(x) {
    x.shadowColor = 'rgba(255,80,200,0.9)'; x.shadowBlur = 7;
    x.fillStyle = rg(x, -3, -4, 2, 15, [[0, '#ffd8f4'], [0.45, '#ff5ac8'], [1, '#6a0a58']]);
    x.beginPath(); x.arc(0, 1, 13, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffc0ec'; x.lineWidth = 1.4; x.stroke();
    x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(2, -2, 8, 6.4, 0, 0, TAU); x.fill();
    x.fillStyle = '#2a0828'; x.beginPath(); x.arc(5, -2, 3.6, 0, TAU); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.8)'; x.beginPath(); x.arc(6, -3.2, 1.2, 0, TAU); x.fill();
    x.fillStyle = '#ffec6a'; x.fillRect(-9, 8, 3, 4); x.fillRect(5, 8, 3, 4);
  }
  function drawDrake(x) {
    x.shadowColor = 'rgba(110,255,90,0.9)'; x.shadowBlur = 7;
    x.fillStyle = lg(x, 0, -12, 0, 13, [[0, '#d8ffb8'], [0.5, '#4fd83a'], [1, '#14501a']]);
    x.beginPath(); x.ellipse(-2, 2, 12, 11, 0, 0, TAU); x.fill();
    poly(x, [[8, -3], [20, -1], [20, 5], [9, 7]]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#c8ffa8'; x.lineWidth = 1.3; x.stroke();
    x.fillStyle = '#ffb347'; poly(x, [[-10, -8], [-6, -14], [-3, -8]]); x.fill(); poly(x, [[-3, -9], [1, -15], [4, -9]]); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(5, -3, 3.4, 0, TAU); x.fill(); x.fillStyle = '#2a0808'; x.beginPath(); x.arc(6, -3, 1.6, 0, TAU); x.fill();
    x.fillStyle = '#10300f'; x.fillRect(15, 2, 5, 1.6);
  }
  function drawBurrower(x) {
    x.shadowColor = 'rgba(255,150,60,0.9)'; x.shadowBlur = 6;
    x.fillStyle = lg(x, 0, -11, 0, 12, [[0, '#ffd2a0'], [0.5, '#e07a2a'], [1, '#5a2808']]);
    x.beginPath(); x.ellipse(-3, 2, 13, 10, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffe0b8'; x.lineWidth = 1.3; x.stroke();
    x.strokeStyle = 'rgba(60,20,0,0.55)'; x.lineWidth = 1.6; for (let i = -9; i <= 3; i += 6) { x.beginPath(); x.moveTo(i, -7); x.lineTo(i, 11); x.stroke(); }
    poly(x, [[9, -5], [20, 2], [9, 9]]); x.fillStyle = lg(x, 9, 0, 20, 0, [[0, '#9aa4c0'], [1, '#f2f6ff']]); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1; x.stroke();
    x.fillStyle = '#ffec6a'; x.beginPath(); x.arc(5, -4, 2.2, 0, TAU); x.fill();
  }
  function drawSpitter(x) {
    x.shadowColor = 'rgba(80,255,220,0.9)'; x.shadowBlur = 7;
    x.fillStyle = rg(x, -2, -4, 2, 15, [[0, '#e0fff8'], [0.45, '#38e0c0'], [1, '#0a504a']]);
    x.beginPath(); x.arc(-2, 0, 12.5, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#b8fff0'; x.lineWidth = 1.3; x.stroke();
    x.fillStyle = lg(x, 8, 0, 20, 0, [[0, '#2a6a62'], [1, '#a0fff0']]); x.fillRect(8, -3, 12, 6);
    x.fillStyle = '#082a26'; x.beginPath(); x.ellipse(20, 0, 2, 3.4, 0, 0, TAU); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(-1, -3, 3.4, 0, TAU); x.fill(); x.fillStyle = '#082a26'; x.beginPath(); x.arc(0, -3, 1.6, 0, TAU); x.fill();
  }
  function drawRock(x) {
    const rnd = GFX.mulberry(7), pts = [];
    for (let i = 0; i < 11; i++) { const a = i / 11 * TAU, k = 0.8 + rnd() * 0.22; pts.push([Math.cos(a) * 14 * k, Math.sin(a) * 14 * k]); }
    x.shadowColor = 'rgba(0,0,0,0.7)'; x.shadowBlur = 5;
    poly(x, pts); x.fillStyle = lg(x, -10, -12, 10, 12, [[0, '#c8b8a0'], [0.5, '#6e6258'], [1, '#2a241f']]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#e8d8c0'; x.lineWidth = 1.6; x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.3)'; for (const [px, py, r] of [[-4, -3, 3.2], [5, 4, 2.6], [-2, 7, 2]]) { x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
  }
  const TIERS = [
    { name: 'FERRITE', val: 500, c1: '#bcd4ff', c2: '#3a5aa8' }, { name: 'AURELIUM', val: 1500, c1: '#fff0a0', c2: '#c98600' },
    { name: 'NEBULITE', val: 4000, c1: '#f0c8ff', c2: '#8a2ad8' }, { name: 'QUASARITE', val: 15000, c1: '#ffffff', c2: '#37e6ff' },
  ];
  A.TIERS = TIERS;
  function drawGem(t) {
    return (x) => {
      const T = TIERS[t], r = 9 + t * 1.6;
      x.shadowColor = T.c1; x.shadowBlur = 9;
      poly(x, [[0, -r - 2], [r, -2], [r * 0.6, r], [-r * 0.6, r], [-r, -2]]);
      x.fillStyle = lg(x, -r, -r, r, r, [[0, T.c1], [1, T.c2]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#fff'; x.lineWidth = 1.4; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.6)'; x.lineWidth = 1; x.beginPath(); x.moveTo(-r, -2); x.lineTo(r, -2); x.moveTo(0, -r - 2); x.lineTo(-r * 0.3, -2); x.lineTo(0, r); x.moveTo(0, -r - 2); x.lineTo(r * 0.3, -2); x.lineTo(0, r); x.stroke();
    };
  }
  const CRATES = { drill: { c: '#ffb347', name: 'DRILL BOOST' }, hose: { c: '#9bffb0', name: 'LONG HOSE' }, shield: { c: '#8fd4ff', name: 'SHIELD' }, scan: { c: '#ff9af0', name: 'SCANNER' } };
  A.CRATES = CRATES;
  function drawCrate(kind) {
    return (x) => {
      const col = CRATES[kind].c;
      x.shadowColor = col; x.shadowBlur = 8;
      x.fillStyle = 'rgba(14,20,44,0.92)'; x.fillRect(-12, -12, 24, 24); x.shadowBlur = 0; x.strokeStyle = col; x.lineWidth = 2; x.strokeRect(-12, -12, 24, 24);
      x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 2; x.lineCap = 'round';
      if (kind === 'drill') { poly(x, [[-6, -6], [8, 0], [-6, 6]]); x.stroke(); }
      else if (kind === 'hose') { x.beginPath(); x.moveTo(-8, 4); x.quadraticCurveTo(-2, -8, 3, 2); x.quadraticCurveTo(6, 7, 9, -1); x.stroke(); }
      else if (kind === 'shield') { x.beginPath(); x.moveTo(0, -8); x.lineTo(7, -5); x.lineTo(7, 1); x.quadraticCurveTo(7, 7, 0, 9); x.quadraticCurveTo(-7, 7, -7, 1); x.lineTo(-7, -5); x.closePath(); x.stroke(); }
      else { x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.stroke(); x.beginPath(); x.arc(0, 0, 2.4, 0, TAU); x.fill(); }
    };
  }
  function drawSpit(x) {
    x.fillStyle = rg(x, 0, 0, 0, 8, [[0, '#ffffff'], [0.35, '#9affd8'], [0.75, '#2ad8a8'], [1, 'rgba(40,220,170,0)']]);
    x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.fill();
  }
  GFX.initArt = function () {
    const s = GFX.spr = {};
    s.miner = mk(48, 40, drawMiner); s.blob = mk(40, 40, drawBlob); s.drake = mk(48, 40, drawDrake); s.burrower = mk(48, 40, drawBurrower); s.spitter = mk(48, 40, drawSpitter);
    s.rock = mk(40, 40, drawRock); s.spit = mk(22, 22, drawSpit);
    s.gem = TIERS.map((t, i) => mk(40, 40, drawGem(i)));
    s.crate = {}; for (const k in CRATES) s.crate[k] = mk(36, 36, drawCrate(k));
    s.flash = {}; for (const k of ['blob', 'drake', 'burrower', 'spitter']) s.flash[k] = flashOf(s[k]);
  };

  /* ---- dirt strata (one carvable canvas per level) ---- */
  const SC = 1.25, DY = C.GY0 + C.CELL;
  A.DY = DY;
  const STRATA = [{ h: 28, s: 38, l: 22 }, { h: 10, s: 46, l: 20 }, { h: 232, s: 30, l: 22 }, { h: 288, s: 36, l: 19 }];
  A.STRATA = STRATA;
  A.buildDirt = function (level) {
    const c = document.createElement('canvas'), W = C.W, H = C.H - DY;
    c.width = Math.round(W * SC); c.height = Math.round(H * SC);
    const x = c.getContext('2d'); x.scale(SC, SC);
    const rnd = GFX.mulberry(level * 31 + 9), shift = ((level - 1) * 17) % 60;
    for (let i = 0; i < 4; i++) {
      const y0 = C.LAYERS[i] * C.CELL + C.GY0 - DY, y1 = (i < 3 ? C.LAYERS[i + 1] * C.CELL + C.GY0 : C.H) - DY, S = STRATA[i], h = S.h + (i === 0 ? shift * 0.3 : 0);
      x.fillStyle = lg(x, 0, y0, 0, y1, [[0, U.hsl(h, S.s, S.l + 5)], [1, U.hsl(h, S.s, S.l - 3)]]); x.fillRect(0, y0, W, y1 - y0 + 1);
      for (let k = 0; k < 520; k++) { x.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,' + (0.03 + rnd() * 0.06) + ')' : 'rgba(0,0,0,' + (0.05 + rnd() * 0.1) + ')'; const r = 0.8 + rnd() * 2.4; x.fillRect(rnd() * W, y0 + rnd() * (y1 - y0), r, r * (0.6 + rnd() * 0.6)); }
      x.strokeStyle = U.hsl(h, 70, 55, 0.2); x.lineWidth = 1.2; x.beginPath(); x.moveTo(0, y0 + 0.5); x.lineTo(W, y0 + 0.5); x.stroke();
    }
    return c;
  };
  /* the canvas context keeps the 1.25x scale from buildDirt, so these take plain logical coordinates */
  A.carve = function (cv, px, py, r) {
    const x = cv.getContext('2d');
    x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
    x.beginPath(); x.arc(px, py - DY, r, 0, TAU); x.fill(); x.restore();
  };
  A.carveRect = function (cv, x0, y0, w, h) {
    const x = cv.getContext('2d');
    x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.fillRect(x0, y0 - DY, w, h); x.restore();
  };

  /* ---- sky, surface walkway and the dark cavity behind the dirt (cached) ---- */
  let back = null;
  A.backdrop = function () {
    if (back) return back;
    const c = document.createElement('canvas'), W = C.W, H = C.H;
    c.width = Math.round(W * SC); c.height = Math.round(H * SC);
    const x = c.getContext('2d'); x.scale(SC, SC);
    const rnd = GFX.mulberry(3);
    x.fillStyle = lg(x, 0, 0, 0, C.GY0, [[0, '#04030c'], [1, '#1a1040']]); x.fillRect(0, 0, W, C.GY0 + 4);
    for (let i = 0; i < 60; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.2 + rnd() * 0.6) + ')'; x.fillRect(rnd() * W, rnd() * C.GY0, 1.4, 1.4); }
    x.fillStyle = rg(x, 440, 70, 6, 60, [[0, '#ffd8a0'], [0.5, '#c06a3a'], [1, 'rgba(80,20,10,0)']]); x.beginPath(); x.arc(440, 58, 46, Math.PI, TAU); x.fill();
    // walkway
    x.fillStyle = lg(x, 0, C.GY0, 0, C.GY0 + C.CELL, [[0, '#6a7494'], [0.5, '#3a4260'], [1, '#222a44']]); x.fillRect(0, C.GY0, W, C.CELL);
    x.fillStyle = 'rgba(255,179,71,0.9)'; x.fillRect(0, C.GY0, W, 2);
    for (let px = 12; px < W; px += 36) { x.fillStyle = 'rgba(255,179,71,0.5)'; x.fillRect(px, C.GY0 + 12, 14, 3); }
    // cavity
    x.fillStyle = lg(x, 0, DY, 0, H, [[0, '#120a1e'], [1, '#060410']]); x.fillRect(0, DY, W, H - DY);
    x.fillStyle = 'rgba(255,255,255,0.04)'; for (let gx = 15; gx < W; gx += 30) for (let gy = DY + 15; gy < H; gy += 30) x.fillRect(gx, gy, 1.5, 1.5);
    return (back = c);
  };
})((window.SGS = window.SGS || {}));
