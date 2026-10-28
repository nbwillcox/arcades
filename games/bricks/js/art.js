/* Procedural art: bricks, paddle, balls, capsules, drifters and the arena floors. Sprites are drawn once and cached. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly;
  const A = {};
  GFX.art = A;

  function rr(x, x0, y0, w, h, r) {
    x.beginPath(); x.moveTo(x0 + r, y0); x.lineTo(x0 + w - r, y0); x.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
    x.lineTo(x0 + w, y0 + h - r); x.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); x.lineTo(x0 + r, y0 + h);
    x.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); x.lineTo(x0, y0 + r); x.quadraticCurveTo(x0, y0, x0 + r, y0); x.closePath();
  }
  A.rr = rr;

  /* ---- bricks ---- */
  function drawBrick(x, type, hue, hp, maxhp) {
    const w = C.BW, h = C.BH, x0 = -w / 2, y0 = -h / 2;
    if (type === 'normal') {
      x.shadowColor = U.hsl(hue, 100, 60, 0.85); x.shadowBlur = 7;
      rr(x, x0, y0, w, h, 4); x.fillStyle = lg(x, 0, y0, 0, y0 + h, [[0, U.hsl(hue, 95, 68)], [1, U.hsl(hue, 90, 34)]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 100, 82, 0.9); x.lineWidth = 1.4; x.stroke();
      rr(x, x0 + 3, y0 + 2.5, w - 6, h * 0.38, 3); x.fillStyle = 'rgba(255,255,255,0.22)'; x.fill();
    } else if (type === 'armored') {
      x.shadowColor = U.hsl(hue, 100, 60, 0.7); x.shadowBlur = 6;
      rr(x, x0, y0, w, h, 4); x.fillStyle = lg(x, 0, y0, 0, y0 + h, [[0, '#c4cfe4'], [0.5, '#66718c'], [1, '#2a3144']]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 100, 70, 0.95); x.lineWidth = 1.8; x.stroke();
      x.fillStyle = 'rgba(20,26,44,0.7)';
      for (const [px, py] of [[x0 + 5, y0 + 5], [x0 + w - 5, y0 + 5], [x0 + 5, y0 + h - 5], [x0 + w - 5, y0 + h - 5]]) { x.beginPath(); x.arc(px, py, 1.5, 0, TAU); x.fill(); }
      x.fillStyle = U.hsl(hue, 90, 60, 0.85); rr(x, -w * 0.28, -2.5, w * 0.56, 5, 2.5); x.fill();
      x.strokeStyle = 'rgba(10,14,30,0.85)'; x.lineWidth = 1.5;
      const cr = maxhp - hp;
      if (cr >= 1) { x.beginPath(); x.moveTo(-12, y0 + 1); x.lineTo(-6, -3); x.lineTo(-11, 2); x.lineTo(-5, y0 + h - 1); x.stroke(); }
      if (cr >= 2) { x.beginPath(); x.moveTo(14, y0 + 1); x.lineTo(8, 1); x.lineTo(15, 4); x.lineTo(9, y0 + h - 1); x.stroke(); }
    } else if (type === 'gold') {
      x.shadowColor = 'rgba(255,210,70,0.9)'; x.shadowBlur = 8;
      rr(x, x0, y0, w, h, 4); x.fillStyle = lg(x, 0, y0, 0, y0 + h, [[0, '#fff6b0'], [0.5, '#e0a800'], [1, '#7a4c00']]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#fff3a0'; x.lineWidth = 1.6; x.stroke();
      x.save(); rr(x, x0, y0, w, h, 4); x.clip();
      x.fillStyle = 'rgba(255,255,255,0.28)'; x.beginPath(); x.moveTo(-14, y0); x.lineTo(-4, y0); x.lineTo(-14 + 12, y0 + h); x.lineTo(-24 + 12, y0 + h); x.fill();
      x.restore();
    } else {
      x.shadowColor = 'rgba(255,80,40,0.95)'; x.shadowBlur = 9;
      rr(x, x0, y0, w, h, 4); x.fillStyle = lg(x, 0, y0, 0, y0 + h, [[0, '#ffa07a'], [0.5, '#e03a1c'], [1, '#6a0a08']]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#ffd2a0'; x.lineWidth = 1.6; x.stroke();
      x.fillStyle = '#1a0606'; x.beginPath(); x.arc(0, 2, 6.2, 0, TAU); x.fill();
      x.strokeStyle = '#ffd24a'; x.lineWidth = 1.6; x.beginPath(); x.moveTo(3, -2); x.quadraticCurveTo(7, -6, 10, -4); x.stroke();
      x.fillStyle = '#ffffff'; x.beginPath(); x.arc(10.5, -4.2, 1.6, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.4)'; x.beginPath(); x.arc(-2, 0, 1.6, 0, TAU); x.fill();
    }
  }
  const bcache = new Map();
  A.brick = function (type, hue, hp, maxhp) {
    hue = (Math.round(hue / 10) * 10 + 360) % 360;
    const key = type + '|' + (type === 'normal' || type === 'armored' ? hue : 0) + '|' + hp + '|' + maxhp;
    let s = bcache.get(key);
    if (!s) { s = mk(C.BW + 12, C.BH + 12, (x) => drawBrick(x, type, hue, hp, maxhp)); bcache.set(key, s); }
    return s;
  };

  /* ---- paddle ---- */
  const pcache = new Map();
  A.paddle = function (w, laser, sticky) {
    w = Math.round(w / 2) * 2;
    const key = w + '|' + (laser ? 1 : 0) + '|' + (sticky ? 1 : 0);
    let s = pcache.get(key);
    if (s) return s;
    if (pcache.size > 60) pcache.clear();
    s = mk(w + 36, 40, (x) => {
      const h = C.PADDLE_H;
      x.shadowColor = 'rgba(70,225,255,0.9)'; x.shadowBlur = 9;
      rr(x, -w / 2, -h / 2, w, h, 7); x.fillStyle = lg(x, 0, -h / 2, 0, h / 2, [[0, '#f0f6ff'], [0.45, '#8fa8da'], [1, '#26356a']]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#37e6ff'; x.lineWidth = 1.6; x.stroke();
      x.fillStyle = '#ff4fd8'; rr(x, -w / 2 + 2, -h / 2 + 2, 12, h - 4, 4); x.fill(); rr(x, w / 2 - 14, -h / 2 + 2, 12, h - 4, 4); x.fill();
      x.fillStyle = 'rgba(8,16,48,0.55)'; rr(x, -w * 0.22, -3, w * 0.44, 6, 3); x.fill();
      x.fillStyle = '#52f0ff'; rr(x, -w * 0.12, -1.2, w * 0.24, 2.4, 1.2); x.fill();
      if (laser) { x.fillStyle = '#ff6a6a'; x.strokeStyle = '#ffd0d0'; x.lineWidth = 1; for (const sx of [-w * 0.36, w * 0.36]) { rr(x, sx - 2.5, -h / 2 - 9, 5, 10, 2); x.fill(); x.stroke(); } }
      if (sticky) { x.shadowColor = 'rgba(120,255,160,0.9)'; x.shadowBlur = 7; x.fillStyle = 'rgba(130,255,170,0.9)'; rr(x, -w / 2 + 12, -h / 2 - 3, w - 24, 4, 2); x.fill(); x.shadowBlur = 0; }
    });
    pcache.set(key, s);
    return s;
  };

  /* ---- balls, shots, drifters, capsules ---- */
  const CAPS = {
    L: { c1: '#ff9a9a', c2: '#c21a1a', name: 'LASER', hue: 0 },
    C: { c1: '#9bffb0', c2: '#139a3a', name: 'CATCH', hue: 140 },
    E: { c1: '#9ac8ff', c2: '#1a5ac2', name: 'ENLARGE', hue: 215 },
    S: { c1: '#ffd09a', c2: '#c2640a', name: 'SLOW', hue: 30 },
    M: { c1: '#9afff4', c2: '#0a9a9a', name: 'MULTI-BALL', hue: 180 },
    F: { c1: '#ffb070', c2: '#d83a0a', name: 'FIREBALL', hue: 18 },
    N: { c1: '#b0c4ff', c2: '#3a4ad8', name: 'SAFETY NET', hue: 235 },
    B: { c1: '#fff08a', c2: '#c29a0a', name: 'BOMB', hue: 52 },
    W: { c1: '#ffa0f2', c2: '#a01a8a', name: 'WARP', hue: 310 },
    U: { c1: '#ffffff', c2: '#7a8aa8', name: 'EXTRA LIFE', hue: 200 },
  };
  A.CAPS = CAPS;
  function drawCap(k) {
    return (x) => {
      const P = CAPS[k];
      x.shadowColor = P.c1; x.shadowBlur = 8;
      rr(x, -20, -9, 40, 18, 9); x.fillStyle = lg(x, 0, -9, 0, 9, [[0, P.c1], [1, P.c2]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#ffffff'; x.lineWidth = 1.5; x.stroke();
      rr(x, -16, -7, 32, 5, 2.5); x.fillStyle = 'rgba(255,255,255,0.3)'; x.fill();
      x.fillStyle = '#10142c'; x.font = '900 ' + (k === 'U' ? 10 : 13) + 'px "Segoe UI", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText(k === 'U' ? '1UP' : k, 0, 1);
    };
  }
  function drawBall(core, mid, edge) {
    return (x) => {
      x.fillStyle = rg(x, -1.5, -1.5, 0.5, 8, [[0, '#ffffff'], [0.4, core], [0.8, mid], [1, edge]]);
      x.beginPath(); x.arc(0, 0, 6.4, 0, TAU); x.fill();
    };
  }
  function drawDrifter(x) {
    x.shadowColor = 'rgba(255,60,220,0.95)'; x.shadowBlur = 8;
    x.strokeStyle = '#ff9af0'; x.lineWidth = 1.8;
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU - Math.PI / 2; x.beginPath(); x.moveTo(Math.cos(a) * 8, Math.sin(a) * 8); x.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); x.stroke(); }
    const hex = []; for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU) * 9.5, Math.sin(i / 6 * TAU) * 9.5]);
    poly(x, hex); x.fillStyle = rg(x, -2, -2, 1, 11, [[0, '#ffe0f8'], [0.4, '#ff4fd0'], [1, '#5a0a50']]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffd0f4'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#2a0828'; x.beginPath(); x.arc(0, 0, 3.4, 0, TAU); x.fill();
    x.fillStyle = '#ffec6a'; x.beginPath(); x.arc(0, 0, 1.5, 0, TAU); x.fill();
  }
  function drawLaser(x) {
    x.shadowColor = 'rgba(255,90,90,1)'; x.shadowBlur = 7;
    x.fillStyle = lg(x, 0, -11, 0, 11, [[0, '#ffffff'], [0.5, '#ff9a9a'], [1, '#ff2a2a']]);
    x.beginPath(); x.ellipse(0, 0, 2.2, 10, 0, 0, TAU); x.fill();
  }
  function drawBolt(x) {
    x.shadowColor = 'rgba(255,60,200,1)'; x.shadowBlur = 8;
    x.fillStyle = rg(x, 0, 3, 0, 9, [[0, '#ffffff'], [0.4, '#ff8aef'], [1, 'rgba(255,40,200,0)']]);
    x.beginPath(); x.moveTo(0, 11); x.lineTo(5, -4); x.quadraticCurveTo(0, -9, -5, -4); x.closePath(); x.fill();
  }
  GFX.initArt = function () {
    const s = GFX.spr = {};
    s.ball = mk(22, 22, drawBall('#bff6ff', '#37c8ff', 'rgba(20,100,200,0.9)'));
    s.fireball = mk(24, 24, drawBall('#ffe08a', '#ff7a1a', 'rgba(200,30,0,0.9)'));
    s.drifter = mk(40, 40, drawDrifter);
    s.laser = mk(10, 26, drawLaser);
    s.bolt = mk(16, 28, drawBolt);
    s.cap = {};
    for (const k in CAPS) s.cap[k] = mk(48, 24, drawCap(k));
  };

  /* ---- arena floors (one per world), pre-rendered at 1.25x ---- */
  const WORLDS = [{ h: 195, name: 'NEON GRID' }, { h: 305, name: 'MAGENTA FOUNDRY' }, { h: 135, name: 'GREEN LINE' }, { h: 22, name: 'EMBER WORKS' }, { h: 262, name: 'VIOLET CORE' }];
  A.WORLDS = WORLDS;
  const cache = {};
  A.backdrop = function (idx) {
    idx = ((idx % WORLDS.length) + WORLDS.length) % WORLDS.length;
    if (cache[idx]) return cache[idx];
    const T = WORLDS[idx], SC = 1.25, W = C.W, H = C.H;
    const c = document.createElement('canvas'); c.width = Math.round(W * SC); c.height = Math.round(H * SC);
    const x = c.getContext('2d'); x.scale(SC, SC);
    x.fillStyle = '#03040d'; x.fillRect(0, 0, W, H);
    x.fillStyle = lg(x, 0, 0, 0, C.AY0, [[0, 'rgba(12,16,40,0.95)'], [1, 'rgba(6,8,22,0.95)']]); x.fillRect(0, 0, W, C.AY0);
    const w = C.AX1 - C.AX0, h = H - C.AY0;
    x.fillStyle = lg(x, 0, C.AY0, 0, H, [[0, U.hsl(T.h, 45, 8)], [1, U.hsl(T.h + 20, 50, 4)]]); x.fillRect(C.AX0, C.AY0, w, h);
    x.fillStyle = rg(x, W / 2, 280, 40, 560, [[0, U.hsl(T.h, 80, 40, 0.18)], [1, U.hsl(T.h, 80, 40, 0)]]); x.fillRect(C.AX0, C.AY0, w, h);
    x.strokeStyle = U.hsl(T.h, 90, 60, 0.07); x.lineWidth = 1;
    for (let gx = C.BX0 - 2; gx < C.AX1; gx += C.PX) { x.beginPath(); x.moveTo(gx, C.AY0); x.lineTo(gx, H); x.stroke(); }
    for (let gy = C.BY0 - 2; gy < H; gy += C.PY) { x.beginPath(); x.moveTo(C.AX0, gy); x.lineTo(C.AX1, gy); x.stroke(); }
    const rnd = GFX.mulberry(idx * 97 + 3);
    for (let i = 0; i < 90; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.1 + rnd() * 0.3) + ')'; x.fillRect(C.AX0 + rnd() * w, C.AY0 + rnd() * h, 1.2, 1.2); }
    x.strokeStyle = U.hsl(T.h, 100, 60, 0.25); x.setLineDash([3, 7]); x.lineWidth = 1;
    x.beginPath(); x.moveTo(C.AX0, C.PADDLE_Y + 16); x.lineTo(C.AX1, C.PADDLE_Y + 16); x.stroke(); x.setLineDash([]);
    // neon walls: left, right, top (the bottom is open)
    for (const [wd, al] of [[10, 0.1], [6, 0.2], [2.4, 0.95]]) {
      x.strokeStyle = U.hsl(T.h, 100, wd < 3 ? 78 : 62, al); x.lineWidth = wd;
      x.beginPath(); x.moveTo(C.AX0, H); x.lineTo(C.AX0, C.AY0); x.lineTo(C.AX1, C.AY0); x.lineTo(C.AX1, H); x.stroke();
    }
    return (cache[idx] = c);
  };
  A.overlay = function (ctx, t, idx) {
    const T = WORLDS[idx % WORLDS.length], span = C.AX1 - C.AX0, px = C.AX0 + ((t * 80) % (span + 200)) - 100;
    ctx.save();
    ctx.beginPath(); ctx.rect(C.AX0, C.AY0, span, C.H - C.AY0); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    const gr = ctx.createLinearGradient(px - 90, 0, px + 90, 0);
    gr.addColorStop(0, U.hsl(T.h, 100, 60, 0)); gr.addColorStop(0.5, U.hsl(T.h, 100, 60, 0.06)); gr.addColorStop(1, U.hsl(T.h, 100, 60, 0));
    ctx.fillStyle = gr; ctx.fillRect(px - 90, C.AY0, 180, C.H - C.AY0);
    ctx.restore();
  };
})((window.SGS = window.SGS || {}));
