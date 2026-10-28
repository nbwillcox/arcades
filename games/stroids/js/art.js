/* Procedural rocks (plain, ore, volatile, iron) and saucers. Each shape is generated once and cached. */
(function (G) {
  'use strict';
  const U = G.U, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly, flashOf = GFX.flashOf;
  const A = {};
  GFX.art = A;

  const SIZE_R = { L: 44, M: 24, S: 12, G: 96 };
  A.SIZE_R = SIZE_R;
  const LIGHT = [-0.55, -0.83];

  const TYPES = {
    plain: { h: 208, s: 45, edge: 'rgba(110,225,255,0.95)', glow: 'rgba(60,200,255,0.9)' },
    ore: { h: 38, s: 55, edge: 'rgba(255,214,100,0.95)', glow: 'rgba(255,190,50,0.9)' },
    volatile: { h: 8, s: 60, edge: 'rgba(255,120,70,0.95)', glow: 'rgba(255,60,20,0.95)' },
    iron: { h: 215, s: 8, edge: 'rgba(225,235,250,0.95)', glow: 'rgba(160,190,230,0.85)' },
  };

  function verts(rnd, r) {
    const n = 11 + Math.floor(rnd() * 4), v = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + (rnd() - 0.5) * 0.3, k = 0.78 + rnd() * 0.3;
      v.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
    }
    return v;
  }

  function rockDraw(type, size, variant) {
    const r = SIZE_R[size], T = TYPES[type];
    return (x) => {
      const rnd = GFX.mulberry(variant * 977 + size.charCodeAt(0) * 31 + type.length * 7);
      const v = verts(rnd, r), n = v.length;
      x.shadowColor = T.glow; x.shadowBlur = size === 'S' ? 6 : 10;
      poly(x, v);
      x.fillStyle = U.hsl(T.h, T.s, 14); x.fill();
      x.shadowBlur = 0;
      for (let i = 0; i < n; i++) {
        const a = v[i], b = v[(i + 1) % n];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, m = Math.hypot(mx, my) || 1;
        const lit = Math.max(0, -(mx / m) * LIGHT[0] * -1 + -(my / m) * LIGHT[1] * -1);
        const l = 20 + lit * 22 + rnd() * 6;
        x.fillStyle = U.hsl(T.h + rnd() * 10 - 5, T.s, l);
        x.beginPath(); x.moveTo(0, 0); x.lineTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.closePath(); x.fill();
      }
      x.strokeStyle = 'rgba(0,0,0,0.28)'; x.lineWidth = 1;
      for (let i = 0; i < n; i++) { x.beginPath(); x.moveTo(0, 0); x.lineTo(v[i][0] * 0.98, v[i][1] * 0.98); x.stroke(); }
      if (type === 'ore') {
        x.shadowColor = 'rgba(255,200,60,1)'; x.shadowBlur = 8; x.strokeStyle = '#ffe27a'; x.lineWidth = Math.max(1.4, r / 18);
        for (let k = 0; k < (size === 'S' ? 2 : 5); k++) {
          const i = Math.floor(rnd() * n), a = v[i], b = v[(i + 3) % n];
          x.beginPath(); x.moveTo(a[0] * 0.35, a[1] * 0.35); x.lineTo((a[0] + b[0]) * 0.28, (a[1] + b[1]) * 0.28); x.lineTo(b[0] * 0.5, b[1] * 0.5); x.stroke();
        }
        x.shadowBlur = 0; x.fillStyle = '#fff3b0';
        for (let k = 0; k < (size === 'S' ? 1 : 4); k++) { x.beginPath(); x.arc((rnd() - 0.5) * r, (rnd() - 0.5) * r, Math.max(1.4, r / 14), 0, TAU); x.fill(); }
      } else if (type === 'volatile') {
        x.fillStyle = rg(x, 0, 0, 0, r * 0.7, [[0, 'rgba(255,240,170,0.95)'], [0.4, 'rgba(255,110,30,0.75)'], [1, 'rgba(255,40,0,0)']]);
        x.beginPath(); x.arc(0, 0, r * 0.7, 0, TAU); x.fill();
        x.shadowColor = 'rgba(255,80,20,1)'; x.shadowBlur = 6; x.strokeStyle = '#ffb04a'; x.lineWidth = Math.max(1.2, r / 20);
        for (let k = 0; k < 5; k++) {
          const a = rnd() * TAU; x.beginPath(); x.moveTo(Math.cos(a) * r * 0.1, Math.sin(a) * r * 0.1);
          x.lineTo(Math.cos(a + 0.2) * r * 0.5, Math.sin(a + 0.2) * r * 0.5); x.lineTo(Math.cos(a - 0.1) * r * 0.85, Math.sin(a - 0.1) * r * 0.85); x.stroke();
        }
        x.shadowBlur = 0;
      } else if (type === 'iron') {
        x.strokeStyle = 'rgba(235,242,255,0.55)'; x.lineWidth = Math.max(1, r / 22);
        poly(x, v.map((p) => [p[0] * 0.66, p[1] * 0.66])); x.stroke();
        x.fillStyle = 'rgba(235,242,255,0.85)';
        for (let i = 0; i < n; i += 2) { x.beginPath(); x.arc(v[i][0] * 0.82, v[i][1] * 0.82, Math.max(1, r / 22), 0, TAU); x.fill(); }
      }
      poly(x, v);
      x.strokeStyle = T.edge; x.lineWidth = size === 'S' ? 1.4 : 2; x.stroke();
    };
  }

  const cache = {};
  A.rock = function (type, size, variant) {
    const key = type + size + variant;
    if (cache[key]) return cache[key];
    const d = Math.ceil(SIZE_R[size] * 2.6);
    const spr = mk(d, d, rockDraw(type, size, variant), size === 'L' ? 1.5 : 2);
    return (cache[key] = { spr, flash: flashOf(spr) });
  };

  /* saucers (red big one, orange small one), two light frames */
  function saucerDraw(h, f) {
    return (x) => {
      x.shadowColor = U.hsl(h, 100, 60, 0.95); x.shadowBlur = 10;
      x.fillStyle = lg(x, 0, -4, 0, 10, [[0, U.hsl(h, 90, 78)], [0.5, U.hsl(h, 80, 46)], [1, U.hsl(h, 70, 16)]]);
      x.beginPath(); x.ellipse(0, 3, 26, 9, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(h, 100, 86, 0.95); x.lineWidth = 1.4; x.stroke();
      x.fillStyle = lg(x, 0, -15, 0, 0, [[0, 'rgba(210,255,255,0.95)'], [1, 'rgba(70,200,255,0.5)']]);
      x.beginPath(); x.moveTo(-12, 0); x.quadraticCurveTo(-11, -14, 0, -14); x.quadraticCurveTo(11, -14, 12, 0); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(220,255,255,0.9)'; x.lineWidth = 1.1; x.stroke();
      x.fillStyle = '#ff5a5a'; x.beginPath(); x.ellipse(0, -5, 3, 4, 0, 0, TAU); x.fill();
      for (let i = -2; i <= 2; i++) {
        x.fillStyle = (i + (f ? 1 : 0)) % 2 ? '#fff3b0' : U.hsl(h + 180, 100, 62);
        x.shadowColor = x.fillStyle; x.shadowBlur = 5;
        x.beginPath(); x.arc(i * 9, 4 + Math.abs(i) * 0.8, 1.9, 0, TAU); x.fill();
      }
      x.shadowBlur = 0;
    };
  }

  /* cracks overlaid on damaged iron rocks */
  function crackDraw(size) {
    const r = SIZE_R[size];
    return (x) => {
      const rnd = GFX.mulberry(size.charCodeAt(0));
      x.strokeStyle = 'rgba(255,255,255,0.9)'; x.shadowColor = 'rgba(255,200,120,0.9)'; x.shadowBlur = 4; x.lineWidth = Math.max(1, r / 22);
      for (let k = 0; k < 3; k++) {
        let px = (rnd() - 0.5) * r * 0.5, py = (rnd() - 0.5) * r * 0.5, a = rnd() * TAU;
        x.beginPath(); x.moveTo(px, py);
        for (let j = 0; j < 4; j++) { a += (rnd() - 0.5) * 1.2; px += Math.cos(a) * r * 0.32; py += Math.sin(a) * r * 0.32; x.lineTo(px, py); }
        x.stroke();
      }
    };
  }

  A.init = function () {
    const s = GFX.spr;
    s.saucer = [mk(64, 40, saucerDraw(0, 0)), mk(64, 40, saucerDraw(0, 1))];
    s.saucerS = [mk(64, 40, saucerDraw(28, 0)), mk(64, 40, saucerDraw(28, 1))];
    s.saucerF = flashOf(s.saucer[0]);
    s.crack = {};
    for (const k of ['L', 'M', 'S']) s.crack[k] = mk(Math.ceil(SIZE_R[k] * 2.6), Math.ceil(SIZE_R[k] * 2.6), crackDraw(k), 2);
    for (const t of ['plain', 'ore', 'volatile', 'iron']) for (const sz of ['L', 'M', 'S']) for (let v = 0; v < 3; v++) A.rock(t, sz, v);
  };
  GFX.initArt = A.init;
})((window.SGS = window.SGS || {}));
