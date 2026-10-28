/* Procedural sprites for the hero, the robots, colonists, shots and crates, plus the arena floors. Everything is drawn once and cached. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly, mirror = GFX.mirror, flashOf = GFX.flashOf;
  const A = {};
  GFX.art = A;

  /* ---- hero: top-down trooper, blaster pointing up ---- */
  function drawPlayer(x) {
    x.shadowColor = 'rgba(70,225,255,0.9)'; x.shadowBlur = 7;
    x.fillStyle = lg(x, -12, 0, 12, 0, [[0, '#244a80'], [0.5, '#a9d6ff'], [1, '#244a80']]);
    x.beginPath(); x.ellipse(0, 1, 12, 7, 0, 0, TAU); x.fill();
    x.shadowBlur = 0;
    x.strokeStyle = '#37e6ff'; x.lineWidth = 1.4; x.stroke();
    x.fillStyle = '#17285a'; x.fillRect(-5, 3, 10, 7);
    x.strokeStyle = '#ff3dd0'; x.lineWidth = 1.2; x.strokeRect(-5, 3, 10, 7);
    x.fillStyle = lg(x, -2.4, 0, 2.4, 0, [[0, '#40507a'], [0.5, '#e4f0ff'], [1, '#40507a']]);
    x.fillRect(-2.4, -17, 4.8, 14);
    x.fillStyle = '#ff3dd0'; x.fillRect(-1.4, -18, 2.8, 3.5);
    x.fillStyle = rg(x, -1.5, -2, 1, 8, [[0, '#ffffff'], [0.5, '#9fd8ff'], [1, '#2a6aa8']]);
    x.beginPath(); x.arc(0, 0, 6.2, 0, TAU); x.fill();
    x.fillStyle = '#052a44'; x.beginPath(); x.ellipse(0, -2.6, 3.6, 2.2, 0, 0, TAU); x.fill();
    x.fillStyle = '#52f0ff'; x.fillRect(-2.4, -3.2, 4.8, 1.2);
  }

  /* ---- robots ---- */
  function drawSwarmer(x) {
    x.strokeStyle = '#ff9060'; x.lineWidth = 1.7;
    for (let i = 0; i < 3; i++) {
      const y = -6 + i * 6;
      x.beginPath(); x.moveTo(5, y); x.lineTo(12, y + 2); x.moveTo(-5, y); x.lineTo(-12, y + 2); x.stroke();
    }
    x.shadowColor = 'rgba(255,70,60,0.95)'; x.shadowBlur = 7;
    const hex = []; for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU + 0.52) * 8.5, Math.sin(i / 6 * TAU + 0.52) * 8.5]);
    poly(x, hex); x.fillStyle = rg(x, -2, -2, 1, 11, [[0, '#ffd6c0'], [0.4, '#ff5a3c'], [1, '#661208']]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffb090'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#2a0606'; x.beginPath(); x.arc(0, -2, 3.4, 0, TAU); x.fill();
    x.fillStyle = '#ffec6a'; x.beginPath(); x.arc(0, -2.4, 1.6, 0, TAU); x.fill();
  }
  function drawBulwark(x) {
    x.shadowColor = 'rgba(90,255,140,0.8)'; x.shadowBlur = 8;
    x.fillStyle = '#10151f';
    x.fillRect(-23, -18, 7, 36); x.fillRect(16, -18, 7, 36);
    x.fillStyle = lg(x, 0, -18, 0, 18, [[0, '#7d8da3'], [0.5, '#3b4658'], [1, '#1c2230']]);
    x.beginPath(); x.moveTo(-15, -17); x.lineTo(15, -17); x.lineTo(17, -12); x.lineTo(17, 15); x.lineTo(-17, 15); x.lineTo(-17, -12); x.closePath(); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#8affb4'; x.lineWidth = 1.5; x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.14)'; x.lineWidth = 1;
    for (let i = -14; i <= 14; i += 5) { x.beginPath(); x.moveTo(-23, i); x.lineTo(-16, i); x.moveTo(16, i); x.lineTo(23, i); x.stroke(); }
    x.save(); x.beginPath(); x.rect(-14, -16, 28, 6); x.clip();
    x.fillStyle = '#ffd24a'; x.fillRect(-14, -16, 28, 6);
    x.fillStyle = '#10151f';
    for (let i = -20; i < 20; i += 8) { x.beginPath(); x.moveTo(i, -10); x.lineTo(i + 4, -10); x.lineTo(i + 8, -16); x.lineTo(i + 4, -16); x.fill(); }
    x.restore();
    x.fillStyle = '#05140c'; x.fillRect(-9, -4, 18, 14);
    x.fillStyle = 'rgba(90,255,140,0.85)';
    for (let i = 0; i < 3; i++) x.fillRect(-7, -1 + i * 4, 14, 1.6);
    x.fillStyle = '#ff3b3b'; x.fillRect(-4, -8.5, 8, 2.2);
  }
  function drawMindcore(x) {
    x.shadowColor = 'rgba(255,60,210,0.95)'; x.shadowBlur = 9;
    x.strokeStyle = '#ff9aeb'; x.lineWidth = 1.8;
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; x.beginPath(); x.moveTo(Math.cos(a) * 9, Math.sin(a) * 9); x.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); x.stroke(); }
    x.fillStyle = rg(x, -3, -4, 1, 13, [[0, '#ffe0f8'], [0.4, '#ff4fd0'], [1, '#6a0a58']]);
    x.beginPath(); x.arc(0, 0, 12, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffd0f4'; x.lineWidth = 1.3; x.stroke();
    x.strokeStyle = 'rgba(80,0,60,0.65)'; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(-8, -2); x.quadraticCurveTo(-4, -9, 0, -3); x.quadraticCurveTo(4, 3, 8, -4); x.moveTo(-7, 5); x.quadraticCurveTo(-2, 1, 2, 6); x.quadraticCurveTo(5, 9, 8, 4); x.stroke();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(-4, -5, 1.8, 0, TAU); x.fill();
  }
  function drawThrall(x) {
    x.shadowColor = 'rgba(255,50,50,0.95)'; x.shadowBlur = 7;
    x.fillStyle = lg(x, -8, 0, 8, 0, [[0, '#5a1018'], [0.5, '#ff6a5a'], [1, '#5a1018']]);
    x.beginPath(); x.ellipse(0, 2, 8, 5, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffb0a0'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#2a0808'; x.beginPath(); x.arc(0, -1, 4.6, 0, TAU); x.fill();
    x.fillStyle = '#ff2a2a'; x.fillRect(-3, -2.4, 2, 1.8); x.fillRect(1, -2.4, 2, 1.8);
    x.fillStyle = '#ffd0c0'; x.fillRect(-1, -11, 2, 5);
  }
  function drawSentinel(x) {
    x.shadowColor = 'rgba(80,200,255,0.95)'; x.shadowBlur = 8;
    x.strokeStyle = '#8fe6ff'; x.lineWidth = 2.2;
    x.beginPath(); x.arc(0, 0, 15, 0.3, 2.3); x.stroke();
    x.beginPath(); x.arc(0, 0, 15, 3.45, 5.45); x.stroke();
    x.strokeStyle = '#4aa8ff'; x.lineWidth = 1.8;
    x.beginPath(); x.arc(0, 0, 10.5, 1.2, 3.6); x.stroke();
    x.beginPath(); x.arc(0, 0, 10.5, 4.4, 6.7); x.stroke();
    x.fillStyle = rg(x, -1.5, -1.5, 0.5, 6.5, [[0, '#ffffff'], [0.45, '#7fe0ff'], [1, '#1a5aa8']]);
    x.beginPath(); x.arc(0, 0, 6, 0, TAU); x.fill();
  }
  function drawStriker(x) {
    x.shadowColor = 'rgba(190,100,255,0.95)'; x.shadowBlur = 8;
    poly(x, [[0, -13], [11, 10], [0, 4.5], [-11, 10]]);
    x.fillStyle = lg(x, 0, -13, 0, 10, [[0, '#f0d0ff'], [0.5, '#a64cff'], [1, '#34106a']]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#e6b8ff'; x.lineWidth = 1.3; x.stroke();
    x.fillStyle = '#ffec6a'; x.beginPath(); x.arc(0, -2, 2.2, 0, TAU); x.fill();
  }
  function drawNexus(x) {
    x.shadowColor = 'rgba(255,225,80,0.95)'; x.shadowBlur = 9;
    x.strokeStyle = '#ffe97a'; x.lineWidth = 2.4;
    x.beginPath(); x.moveTo(-17, 0); x.lineTo(17, 0); x.moveTo(0, -17); x.lineTo(0, 17); x.stroke();
    x.fillStyle = '#ffd24a';
    for (const [px, py] of [[17, 0], [-17, 0], [0, 17], [0, -17]]) { x.beginPath(); x.arc(px, py, 2.6, 0, TAU); x.fill(); }
    x.strokeStyle = '#fff0a8'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, 0, 10, 0, TAU); x.stroke();
    x.fillStyle = rg(x, -2, -2, 0.5, 8, [[0, '#ffffff'], [0.5, '#ffd24a'], [1, '#a35a00']]);
    x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.fill();
  }
  function drawCrawler(x) {
    x.shadowColor = 'rgba(255,150,60,0.9)'; x.shadowBlur = 7;
    x.fillStyle = '#1a1208'; x.fillRect(-16, -14, 6, 28); x.fillRect(10, -14, 6, 28);
    x.fillStyle = lg(x, 0, -12, 0, 14, [[0, '#ffb070'], [0.5, '#c25a1a'], [1, '#4a1a06']]);
    x.beginPath(); x.moveTo(-10, -12); x.lineTo(10, -12); x.lineTo(11, 13); x.lineTo(-11, 13); x.closePath(); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffd0a0'; x.lineWidth = 1.3; x.stroke();
    x.fillStyle = '#ffe0b8'; x.fillRect(-2.2, -20, 4.4, 14);
    x.fillStyle = rg(x, -1, -1, 0.5, 6, [[0, '#fff2dc'], [1, '#a04a10']]); x.beginPath(); x.arc(0, 0, 6, 0, TAU); x.fill();
  }
  function drawPylon(col, deep) {
    return (x) => {
      x.shadowColor = col; x.shadowBlur = 8;
      poly(x, [[0, -12], [12, 0], [0, 12], [-12, 0]]);
      x.fillStyle = lg(x, -10, -10, 10, 10, [[0, col], [1, deep]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#ffffff'; x.lineWidth = 1.6; x.stroke();
      poly(x, [[0, -6], [6, 0], [0, 6], [-6, 0]]); x.fillStyle = 'rgba(8,10,30,0.7)'; x.fill();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(0, 0, 1.8, 0, TAU); x.fill();
    };
  }
  /* colonists: three suit colours, two walk frames */
  function drawColonist(hue, frame) {
    return (x) => {
      x.shadowColor = U.hsl(hue, 100, 60, 0.9); x.shadowBlur = 5;
      x.fillStyle = '#1a2038';
      x.fillRect(-3.4, 3 + (frame ? 1.6 : -0.4), 2.6, 4); x.fillRect(0.8, 3 + (frame ? -0.4 : 1.6), 2.6, 4);
      x.fillStyle = lg(x, -6, 0, 6, 0, [[0, U.hsl(hue, 70, 30)], [0.5, U.hsl(hue, 90, 70)], [1, U.hsl(hue, 70, 30)]]);
      x.beginPath(); x.ellipse(0, 0, 6.2, 3.8, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.fillStyle = '#ffe2c8'; x.beginPath(); x.arc(0, 0, 3.1, 0, TAU); x.fill();
      x.fillStyle = U.hsl(hue, 80, 45); x.beginPath(); x.arc(0, -0.6, 3.1, Math.PI, TAU); x.fill();
    };
  }
  /* ---- shots ---- */
  function drawBolt(x) {
    x.shadowColor = 'rgba(60,225,255,1)'; x.shadowBlur = 8;
    x.fillStyle = lg(x, 0, -13, 0, 13, [[0, '#9af3ff'], [0.5, '#ffffff'], [1, '#27c6ee']]);
    x.beginPath(); x.ellipse(0, 0, 2.8, 11, 0, 0, TAU); x.fill();
  }
  function drawLance(x) {
    x.shadowColor = 'rgba(255,120,230,1)'; x.shadowBlur = 10;
    x.fillStyle = lg(x, 0, -30, 0, 30, [[0, '#ffffff'], [0.4, '#ffc2f4'], [1, 'rgba(255,60,210,0)']]);
    x.beginPath(); x.moveTo(0, -30); x.lineTo(3.4, -18); x.lineTo(2.2, 30); x.lineTo(-2.2, 30); x.lineTo(-3.4, -18); x.closePath(); x.fill();
  }
  function drawSpark(x) {
    x.fillStyle = rg(x, 0, 0, 0, 9, [[0, '#ffffff'], [0.3, '#ff8aef'], [0.7, '#ff2dc0'], [1, 'rgba(255,40,200,0)']]);
    x.beginPath(); x.arc(0, 0, 9, 0, TAU); x.fill();
  }
  function drawShell(x) {
    x.fillStyle = rg(x, 0, 0, 0, 10, [[0, '#ffffff'], [0.3, '#ffd24a'], [0.7, '#ff7a1a'], [1, 'rgba(255,60,0,0)']]);
    x.beginPath(); x.arc(0, 0, 10, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,230,160,0.9)'; x.lineWidth = 1.3; x.beginPath(); x.arc(0, 0, 5.5, 0.4, 4); x.stroke();
  }
  function drawMissile(x) {
    x.shadowColor = 'rgba(255,60,60,1)'; x.shadowBlur = 7;
    poly(x, [[0, -11], [4.5, 6], [0, 3], [-4.5, 6]]);
    x.fillStyle = lg(x, 0, -11, 0, 6, [[0, '#ffe0e0'], [0.5, '#ff4a4a'], [1, '#7a0a14']]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffb0b0'; x.lineWidth = 1; x.stroke();
  }
  /* ---- crates ---- */
  const PICK = {
    W: { c1: '#ffe27a', c2: '#c98600', name: 'WEAPON UP', hue: 45 },
    R: { c1: '#ff9ad8', c2: '#b3127a', name: 'RAPID FIRE', hue: 320 },
    V: { c1: '#9bffd0', c2: '#13915b', name: 'SPEED BOOST', hue: 150 },
    S: { c1: '#a6dcff', c2: '#1a6fc2', name: 'SHIELD', hue: 205 },
    B: { c1: '#ffb28a', c2: '#c2410a', name: 'SMART BOMB', hue: 20 },
  };
  A.PICK = PICK;
  function drawPickup(kind) {
    return (x) => {
      const p = PICK[kind];
      x.shadowColor = p.c1; x.shadowBlur = 9;
      const hex = []; for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU) * 17, Math.sin(i / 6 * TAU) * 17]);
      poly(x, hex); x.fillStyle = lg(x, -14, -14, 14, 14, [[0, p.c1], [1, p.c2]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#ffffff'; x.lineWidth = 1.6; x.stroke();
      poly(x, hex.map((q) => [q[0] * 0.72, q[1] * 0.72])); x.fillStyle = 'rgba(10,14,40,0.58)'; x.fill();
      x.strokeStyle = '#ffffff'; x.fillStyle = '#ffffff'; x.lineWidth = 2;
      if (kind === 'W') { for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(-6, 5 - i * 5); x.lineTo(0, -1 - i * 5); x.lineTo(6, 5 - i * 5); x.stroke(); } }
      else if (kind === 'R') { x.beginPath(); x.moveTo(2, -9); x.lineTo(-5, 1); x.lineTo(0, 1); x.lineTo(-2, 9); x.lineTo(6, -2); x.lineTo(1, -2); x.closePath(); x.fill(); }
      else if (kind === 'V') { for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(-7 + i * 7, -6); x.lineTo(-1 + i * 7, 0); x.lineTo(-7 + i * 7, 6); x.stroke(); } }
      else if (kind === 'S') { x.beginPath(); x.moveTo(0, -8); x.lineTo(7, -5); x.lineTo(7, 1); x.quadraticCurveTo(7, 7, 0, 10); x.quadraticCurveTo(-7, 7, -7, 1); x.lineTo(-7, -5); x.closePath(); x.stroke(); }
      else { x.beginPath(); x.arc(0, 2, 6, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(3, -4); x.lineTo(6, -8); x.stroke(); x.beginPath(); x.arc(7, -9, 1.6, 0, TAU); x.fill(); }
    };
  }

  GFX.initArt = function () {
    const s = GFX.spr = {};
    s.player = mk(44, 44, drawPlayer);
    s.swarmer = mk(34, 34, drawSwarmer);
    s.bulwark = mk(56, 52, drawBulwark);
    s.mindcore = mk(42, 42, drawMindcore);
    s.thrall = mk(30, 30, drawThrall);
    s.sentinel = mk(44, 44, drawSentinel);
    s.striker = mk(34, 34, drawStriker);
    s.nexus = mk(46, 46, drawNexus);
    s.crawler = mk(48, 52, drawCrawler);
    s.pylon = [mk(34, 34, drawPylon('#ffd24a', '#a36a00')), mk(34, 34, drawPylon('#37e6ff', '#0a5f8a')), mk(34, 34, drawPylon('#ff3dd0', '#7a0a62'))];
    s.col = [140, 45, 200].map((h) => [mk(20, 24, drawColonist(h, 0)), mk(20, 24, drawColonist(h, 1))]);
    s.bolt = mk(18, 34, drawBolt);
    s.lance = mk(18, 70, drawLance);
    s.spark = mk(26, 26, drawSpark);
    s.shell = mk(28, 28, drawShell);
    s.missile = mk(18, 32, drawMissile);
    s.pick = {};
    for (const k of ['W', 'R', 'V', 'S', 'B']) s.pick[k] = mk(46, 46, drawPickup(k));
    s.flash = {};
    for (const k of ['swarmer', 'mindcore', 'sentinel', 'nexus', 'crawler', 'striker', 'thrall']) s.flash[k] = flashOf(s[k]);
  };

  /* ---- arena floors (one per world), pre-rendered at 1.25x ---- */
  const WORLDS = [{ h: 195, name: 'NEON YARD' }, { h: 305, name: 'MAGENTA FOUNDRY' }, { h: 135, name: 'GREENLINE DOCKS' }, { h: 22, name: 'EMBER WORKS' }, { h: 262, name: 'VIOLET CORE' }];
  A.WORLDS = WORLDS;
  const cache = {};
  A.backdrop = function (idx) {
    idx = ((idx % WORLDS.length) + WORLDS.length) % WORLDS.length;
    if (cache[idx]) return cache[idx];
    const T = WORLDS[idx], SC = 1.25, W = C.W, H = C.H;
    const c = document.createElement('canvas'); c.width = Math.round(W * SC); c.height = Math.round(H * SC);
    const x = c.getContext('2d'); x.scale(SC, SC);
    x.fillStyle = '#03040d'; x.fillRect(0, 0, W, H);
    x.fillStyle = lg(x, 0, 0, 0, 58, [[0, 'rgba(12,16,40,0.95)'], [1, 'rgba(6,8,22,0.95)']]); x.fillRect(0, 0, W, 58);
    const w = C.AX1 - C.AX0, h = C.AY1 - C.AY0;
    x.fillStyle = lg(x, 0, C.AY0, 0, C.AY1, [[0, U.hsl(T.h, 45, 9)], [1, U.hsl(T.h + 20, 50, 5)]]);
    x.fillRect(C.AX0, C.AY0, w, h);
    x.fillStyle = rg(x, W / 2, (C.AY0 + C.AY1) / 2, 40, 520, [[0, U.hsl(T.h, 80, 40, 0.2)], [1, U.hsl(T.h, 80, 40, 0)]]);
    x.fillRect(C.AX0, C.AY0, w, h);
    x.save(); x.beginPath(); x.rect(C.AX0, C.AY0, w, h); x.clip();
    x.strokeStyle = U.hsl(T.h, 90, 60, 0.13); x.lineWidth = 1;
    for (let gx = C.AX0 + 48; gx < C.AX1; gx += 48) { x.beginPath(); x.moveTo(gx, C.AY0); x.lineTo(gx, C.AY1); x.stroke(); }
    for (let gy = C.AY0 + 48; gy < C.AY1; gy += 48) { x.beginPath(); x.moveTo(C.AX0, gy); x.lineTo(C.AX1, gy); x.stroke(); }
    const rnd = GFX.mulberry(idx * 131 + 7);
    x.strokeStyle = U.hsl(T.h, 90, 60, 0.1); x.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      const px = C.AX0 + 24 + Math.floor(rnd() * (w / 48)) * 48, py = C.AY0 + 24 + Math.floor(rnd() * (h / 48)) * 48, l = 20 + rnd() * 40;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + (rnd() < 0.5 ? l : 0), py + (rnd() < 0.5 ? 0 : l)); x.stroke();
    }
    x.restore();
    for (const [wd, al] of [[9, 0.1], [4.5, 0.2], [1.6, 0.9]]) {
      x.strokeStyle = U.hsl(T.h, 100, 62, al); x.lineWidth = wd; x.strokeRect(C.AX0, C.AY0, w, h);
    }
    x.strokeStyle = U.hsl(T.h, 100, 75, 0.9); x.lineWidth = 2.4;
    for (const [px, py, sx, sy] of [[C.AX0, C.AY0, 1, 1], [C.AX1, C.AY0, -1, 1], [C.AX0, C.AY1, 1, -1], [C.AX1, C.AY1, -1, -1]]) {
      x.beginPath(); x.moveTo(px + sx * 26, py); x.lineTo(px, py); x.lineTo(px, py + sy * 26); x.stroke();
    }
    return (cache[idx] = c);
  };
  /* animated light sweep over the grid */
  A.overlay = function (ctx, t, idx) {
    const T = WORLDS[idx % WORLDS.length], span = C.AX1 - C.AX0, px = C.AX0 + ((t * 70) % (span + 160)) - 80;
    ctx.save();
    ctx.beginPath(); ctx.rect(C.AX0, C.AY0, span, C.AY1 - C.AY0); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(px - 80, 0, px + 80, 0);
    gr.addColorStop(0, U.hsl(T.h, 100, 60, 0)); gr.addColorStop(0.5, U.hsl(T.h, 100, 60, 0.07)); gr.addColorStop(1, U.hsl(T.h, 100, 60, 0));
    ctx.fillStyle = gr; ctx.fillRect(px - 80, C.AY0, 160, C.AY1 - C.AY0);
    ctx.restore();
  };
})((window.SGS = window.SGS || {}));
