/* Procedural art: the neon cubes (cached sprites), the hero, the enemies and the transport discs, all drawn with canvas vector calls. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, TAU = U.TAU, HW = C.HW, HH = C.HH, D = C.D;
  const ART = {};
  const SS = 2, SW = 2 * HW + 4, SH = 2 * HH + D + 4;
  const cubes = new Map();

  function rgb(hex) { const v = parseInt(hex.slice(1), 16); return [v >> 16, (v >> 8) & 255, v & 255]; }
  function mix(hex, k, to) { const a = rgb(hex), t = to || 0; return 'rgb(' + a.map((v) => Math.round(v + (t - v) * k)).join(',') + ')'; }
  function hueHex(h) {
    const f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (0.5 - 0.5 * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    return '#' + [f(0), f(8), f(4)].map((v) => v.toString(16).padStart(2, '0')).join('');
  }
  ART.mix = mix;

  ART.cubeSprite = function (color) {
    let s = cubes.get(color);
    if (s) return s;
    const c = document.createElement('canvas');
    c.width = SW * SS; c.height = SH * SS;
    const x = c.getContext('2d');
    x.scale(SS, SS); x.lineJoin = 'round';
    const cx = SW / 2, ty = 2, cy = ty + HH;                         /* top vertex, diamond centre */
    const poly = (pts) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); };
    const L = [[cx - HW, cy], [cx, cy + HH], [cx, cy + HH + D], [cx - HW, cy + D]];
    const Rr = [[cx, cy + HH], [cx + HW, cy], [cx + HW, cy + D], [cx, cy + HH + D]];
    const T = [[cx, ty], [cx + HW, cy], [cx, cy + HH], [cx - HW, cy]];
    let g = x.createLinearGradient(0, cy, 0, cy + D); g.addColorStop(0, mix(color, 0.5)); g.addColorStop(1, mix(color, 0.8));
    poly(L); x.fillStyle = g; x.fill();
    g = x.createLinearGradient(0, cy, 0, cy + D); g.addColorStop(0, mix(color, 0.68)); g.addColorStop(1, mix(color, 0.9));
    poly(Rr); x.fillStyle = g; x.fill();
    g = x.createLinearGradient(cx - HW, ty, cx + HW, cy + HH); g.addColorStop(0, mix(color, 0.35, 255)); g.addColorStop(0.5, color); g.addColorStop(1, mix(color, 0.18));
    poly(T); x.fillStyle = g; x.fill();
    /* inner diamond: a faint panel line */
    x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 1;
    poly([[cx, ty + 6], [cx + HW - 11, cy], [cx, cy + HH - 6], [cx - HW + 11, cy]]); x.stroke();
    /* neon edges */
    x.strokeStyle = mix(color, 0.45, 255); x.lineWidth = 1.6;
    poly(T); x.stroke();
    x.strokeStyle = mix(color, 0.2, 255); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(L[0][0], L[0][1]); x.lineTo(L[3][0], L[3][1]); x.lineTo(L[2][0], L[2][1]); x.lineTo(Rr[2][0], Rr[2][1]); x.lineTo(Rr[1][0], Rr[1][1]); x.moveTo(cx, cy + HH); x.lineTo(cx, cy + HH + D); x.stroke();
    s = { c, cx, cy };
    cubes.set(color, s);
    return s;
  };
  ART.drawCube = function (ctx, px, py, color) {
    const s = ART.cubeSprite(color);
    ctx.drawImage(s.c, px - s.cx, py - s.cy, SW, SH);
  };
  ART.miniCube = function (ctx, x, y, color, target) {
    const k = 0.34, s = ART.cubeSprite(color);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    if (target) { ctx.globalAlpha = 0.45; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, 10, 54, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
    ctx.drawImage(s.c, -s.cx, -s.cy, SW, SH);
    ctx.restore();
  };

  function shadow(ctx, x, y, z, a) {
    ctx.save();
    ctx.globalAlpha = (a === undefined ? 0.4 : a) * (1 - Math.min(0.6, z / 70));
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(x, y + 2, 15 * (1 - Math.min(0.4, z / 90)), 6.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- the hero: a round neon-orange alien with a snout and two glowing antennae ---------- */
  function hero(ctx, x, y, face, sqy, sqx, t, alpha) {
    const sx = face === 'DL' || face === 'UL' ? -1 : 1, front = face[0] === 'D';
    ctx.save();
    ctx.globalAlpha = alpha === undefined ? 1 : alpha;
    ctx.translate(x, y); ctx.scale(sx * sqx, sqy);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = '#c74a10';                                        /* feet */
    ctx.beginPath(); ctx.ellipse(-8, -3, 6.5, 4.5, 0, 0, TAU); ctx.ellipse(8, -3, 6.5, 4.5, 0, 0, TAU); ctx.fill();
    const wob = Math.sin(t * 6) * 1.5;                                /* antennae */
    ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, -33); ctx.quadraticCurveTo(-10, -42, -12 + wob, -49); ctx.moveTo(6, -33); ctx.quadraticCurveTo(10, -42, 12 - wob, -49); ctx.stroke();
    ctx.fillStyle = '#37e6ff';
    ctx.beginPath(); ctx.arc(-12 + wob, -50, 3, 0, TAU); ctx.arc(12 - wob, -50, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(-12.8 + wob, -50.8, 1, 0, TAU); ctx.arc(11.2 - wob, -50.8, 1, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-5, -29, 2, 0, -21, 20);       /* body */
    g.addColorStop(0, '#ffd69a'); g.addColorStop(0.35, '#ff9a3d'); g.addColorStop(1, '#c43c08');
    ctx.fillStyle = g; ctx.strokeStyle = '#ff5a14'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, -20, 17, 16, 0, 0, TAU); ctx.fill(); ctx.stroke();
    if (front) {
      ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 9;                 /* snout */
      ctx.beginPath(); ctx.moveTo(6, -15); ctx.lineTo(21, -12); ctx.stroke();
      ctx.strokeStyle = '#ffb066'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(7, -17); ctx.lineTo(20, -14.5); ctx.stroke();
      ctx.fillStyle = '#3a0d02';
      ctx.beginPath(); ctx.ellipse(24, -11.5, 2.5, 4.4, 0.1, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff';                                         /* eyes */
      ctx.beginPath(); ctx.ellipse(-3, -27, 5.2, 6, 0, 0, TAU); ctx.ellipse(8, -27, 5.2, 6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#10142a';
      ctx.beginPath(); ctx.arc(-1.5, -26, 2.4, 0, TAU); ctx.arc(9.5, -26, 2.4, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(120,30,0,0.35)';                          /* back view: a darker shell patch */
      ctx.beginPath(); ctx.ellipse(-2, -19, 11, 10, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ff7a1a'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.moveTo(10, -22); ctx.lineTo(16, -23); ctx.stroke();
    }
    ctx.restore();
  }
  ART.heroIcon = function (ctx, x, y, k) { ctx.save(); ctx.translate(x, y); ctx.scale(k, k); hero(ctx, 0, 0, 'DR', 1, 1, 0, 1); ctx.restore(); };

  /* ---------- enemies (drawn with their feet at 0,0) ---------- */
  function orb(ctx, cy, r, c0, c1, c2, edge) {
    const g = ctx.createRadialGradient(-r * 0.3, cy - r * 0.35, 1, 0, cy, r);
    g.addColorStop(0, c0); g.addColorStop(0.4, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.strokeStyle = edge; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(0, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
  }
  function redBall(ctx, e, t) {
    ctx.save(); ctx.translate(0, -14); ctx.rotate(t * 3);
    ctx.fillStyle = '#ff3a3a'; ctx.strokeStyle = '#ffa0a0'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU, r = i % 2 ? 10 : 15; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    orb(ctx, -14, 10, '#ffd0d0', '#ff4a4a', '#a00a18', 'rgba(255,200,200,0.6)');
  }
  function greenBall(ctx, e, t) {
    orb(ctx, -14, 13, '#e0ffe0', '#37ff7a', '#0a8a3a', '#b8ffcc');
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, -14, 17 + Math.sin(t * 8) * 1.5, 0, TAU); ctx.stroke();
  }
  function egg(ctx, e, t) {
    ctx.save(); ctx.translate(0, -15);
    const g = ctx.createRadialGradient(-4, -6, 1, 0, 0, 15); g.addColorStop(0, '#f0d8ff'); g.addColorStop(0.45, '#b45aff'); g.addColorStop(1, '#4a1296');
    ctx.fillStyle = g; ctx.strokeStyle = '#e0b8ff'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(0, 0, 11.5, 14, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.arc(-4, -6, 1.8, 0, TAU); ctx.arc(4, 3, 1.4, 0, TAU); ctx.arc(-2, 6, 1.2, 0, TAU); ctx.fill();
    ctx.restore();
  }
  function snake(ctx, e, t, st) {
    const sway = Math.sin(t * 5) * 1.5;
    ctx.lineJoin = 'round';
    const seg = (cx, cy, r, c1, c2) => {
      const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, 1, cx, cy, r);
      g.addColorStop(0, c1); g.addColorStop(1, c2);
      ctx.fillStyle = g; ctx.strokeStyle = '#e8c8ff'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill(); ctx.stroke();
    };
    seg(0, -10, 11.5, '#d8a8ff', '#5a14b0');
    seg(sway * 0.5, -23 * st, 10.5, '#d8a8ff', '#6a1cc0');
    seg(sway, -37 * st, 12.5, '#ecc8ff', '#7a24d4');
    const hy = -37 * st;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(sway - 5, hy - 3, 4.2, 5, 0, 0, TAU); ctx.ellipse(sway + 5, hy - 3, 4.2, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath(); ctx.arc(sway - 5, hy - 2.5, 2.1, 0, TAU); ctx.arc(sway + 5, hy - 2.5, 2.1, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a0850'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sway - 6, hy + 5); ctx.quadraticCurveTo(sway, hy + 9, sway + 6, hy + 5); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.moveTo(sway - 4, hy + 5.5); ctx.lineTo(sway - 2.5, hy + 9); ctx.lineTo(sway - 1, hy + 6.4); ctx.moveTo(sway + 4, hy + 5.5); ctx.lineTo(sway + 2.5, hy + 9); ctx.lineTo(sway + 1, hy + 6.4); ctx.fill();
    if (Math.sin(t * 9) > 0.4) {
      ctx.strokeStyle = '#ff4a8a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sway, hy + 7); ctx.lineTo(sway, hy + 14); ctx.moveTo(sway, hy + 14); ctx.lineTo(sway - 2.5, hy + 17); ctx.moveTo(sway, hy + 14); ctx.lineTo(sway + 2.5, hy + 17); ctx.stroke();
    }
  }
  function slick(ctx, e, t) {
    const sam = e.flip > 0;
    const c1 = sam ? '#5af0ff' : '#7dff6a', c2 = sam ? '#0a6a9a' : '#1a8a2a';
    ctx.save(); ctx.translate(0, -15);
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(-6, 14, 5, 3.5, 0, 0, TAU); ctx.ellipse(6, 14, 5, 3.5, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(-4, -5, 1, 0, 0, 14); g.addColorStop(0, '#fff'); g.addColorStop(0.35, c1); g.addColorStop(1, c2);
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.ellipse(0, 0, 12, 13, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0a0a18';                                         /* sunglasses */
    ctx.fillRect(-10, -6, 20, 6);
    ctx.fillStyle = 'rgba(160,230,255,0.8)'; ctx.fillRect(-9, -5, 5, 1.5); ctx.fillRect(2, -5, 5, 1.5);
    ctx.strokeStyle = '#0a0a18'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-3, 6); ctx.quadraticCurveTo(0, 9, 3, 6); ctx.stroke();
    ctx.restore();
  }
  function ugg(ctx, e, t, left) {
    const col = left ? '#c46aff' : '#ff8a3a', dk = left ? '#4a1496' : '#a03a08';
    ctx.save(); ctx.translate(0, -13); ctx.scale(left ? 1 : -1, 1);
    ctx.strokeStyle = dk; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) { const w = Math.sin(t * 12 + i) * 2; ctx.beginPath(); ctx.moveTo(-8 + i * 8, 7); ctx.lineTo(-10 + i * 8, 13 + w); ctx.stroke(); }
    const g = ctx.createLinearGradient(0, -12, 0, 10); g.addColorStop(0, '#fff'); g.addColorStop(0.2, col); g.addColorStop(1, dk);
    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-14, 8); ctx.lineTo(-14, -4); ctx.quadraticCurveTo(-14, -12, -6, -12); ctx.lineTo(8, -12); ctx.quadraticCurveTo(15, -12, 15, -4); ctx.lineTo(15, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(5, -4, 4.4, 5.2, 0, 0, TAU); ctx.ellipse(-4, -4, 4.4, 5.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.arc(6.5, -3.5, 2, 0, TAU); ctx.arc(-2.5, -3.5, 2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function drawEnemy(ctx, e, g) {
    const x = e.x, y = e.y - e.z, t = e.age + (e.flip > 0 ? 0 : 0.5);
    const k = e.state === 'hop' ? Math.sin(Math.PI * Math.min(1, e.t / e.dur)) : 0;
    const frozen = g.freeze > 0 && e.state !== 'fall';
    if (e.state !== 'fall') shadow(ctx, e.x, e.y, e.z);
    let alpha = 1;
    if ((e.kind === 'ugg' || e.kind === 'wrong') && e.state === 'wait' && e.age < 0.7) alpha = Math.sin(e.age * 40) > 0 ? 1 : 0.35;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    if (e.kind === 'coily') ctx.scale(e.face[1] === 'L' ? -1 : 1, 1);
    else ctx.scale(1 - 0.07 * k, 1 + 0.12 * k);
    if (e.state === 'fall' && e.tag === 'snakeFall') ctx.rotate(e.age * 6);
    switch (e.kind) {
      case 'red': redBall(ctx, e, t); break;
      case 'green': greenBall(ctx, e, t); break;
      case 'egg': egg(ctx, e, t); break;
      case 'coily': snake(ctx, e, t, e.state === 'hop' ? 1 + 0.15 * k : e.state === 'hatch' ? 0.4 + 0.6 * (1 - e.hatchT / 0.5) : 1); break;
      case 'slick': slick(ctx, e, t); break;
      case 'ugg': ugg(ctx, e, t, true); break;
      case 'wrong': ugg(ctx, e, t, false); break;
    }
    ctx.restore();
    if (frozen) {
      ctx.save(); ctx.globalAlpha = 0.5 + 0.2 * Math.sin(g.t * 20); ctx.strokeStyle = '#9fe8ff'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y - 20, 22, 0, TAU); ctx.stroke(); ctx.restore();
    }
  }

  function drawDisc(ctx, d, t) {
    const x = d.x, y = d.y - (d.used ? 6 : 0);
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 7, 24, 9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a1030'; ctx.beginPath(); ctx.ellipse(0, 3, 24, 9.5, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * TAU + t * 5, a1 = ((i + 1) / 12) * TAU + t * 5;
      ctx.fillStyle = 'hsl(' + Math.round((i * 30 + t * 240) % 360) + ',100%,' + (i % 2 ? 62 : 48) + '%)';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.ellipse(0, 0, 21, 8, 0, a0, a1); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(0, 0, 21, 8, 0, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#05071a'; ctx.beginPath(); ctx.ellipse(0, 0, 8, 3.2, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }

  function bubble(ctx, x, y, t) {
    ctx.save(); ctx.translate(x, y - 64);
    const s = Math.min(1, t / 0.15), w = 78, h = 34;
    ctx.scale(s, s);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#10142a'; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, 10); else ctx.rect(-w / 2, -h / 2, w, h);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, h / 2 - 1); ctx.lineTo(-14, h / 2 + 12); ctx.lineTo(4, h / 2 - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(-9, h / 2 - 3, 12, 4);
    ctx.fillStyle = '#d4202a'; ctx.font = '900 22px "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('@!#?*', 0, 2);
    ctx.restore();
  }

  ART.draw = function (ctx, g) {
    const R = C.ROWS, h = g.hero, P = g.P, t = g.t;
    const clear = g.phase === 'clear';
    const seqIdx = Math.floor(g.flashT * 16);
    for (let r = 0; r < R; r++) {
      for (let c = 0; c <= r; c++) {
        const p = P(r, c);
        const col = clear ? hueHex(((seqIdx + r * 2 + c) % 12) * 30) : g.pal[g.tiles[r][c]];
        ART.drawCube(ctx, p.x, p.y, col);
        const pl = g.pulse[r][c];
        if (pl > 0) {
          ctx.globalAlpha = Math.min(0.7, pl * 3);
          ctx.fillStyle = '#fff';
          ctx.beginPath(); ctx.moveTo(p.x, p.y - HH); ctx.lineTo(p.x + HW, p.y); ctx.lineTo(p.x, p.y + HH); ctx.lineTo(p.x - HW, p.y); ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
    for (const d of g.discs) if (!d.used) drawDisc(ctx, d, t);
    if (g.ride) drawDisc(ctx, { x: g.ride.disc.x, y: g.ride.disc.y - h.z + 10, used: false }, t);
    /* hero and enemies, back to front */
    const list = g.enemies.slice();
    list.push({ hero: true, y: h.y });
    list.sort((a, b) => a.y - b.y);
    for (const e of list) {
      if (!e.hero) { drawEnemy(ctx, e, g); continue; }
      if (h.state !== 'fall' && h.state !== 'ride') shadow(ctx, h.x, h.y, h.z);
      const k = h.state === 'hop' ? Math.sin(Math.PI * Math.min(1, h.t / h.dur)) : 0;
      let sqy = 1 + 0.12 * k - (h.sq > 0 ? h.sq * 1.1 : 0), sqx = 1 - 0.06 * k + (h.sq > 0 ? h.sq * 0.9 : 0);
      let hy = h.y - h.z;
      const cursing = h.state === 'dead' && !h.nocurse;
      if (cursing) sqy = 0.9;
      if (g.phase === 'clear' && h.state === 'idle') hy -= Math.abs(Math.sin(h.cheer * 9)) * 14;
      hero(ctx, h.x, hy, h.face, sqy, sqx, t, 1);
      if (cursing) bubble(ctx, h.x, hy, g.phaseT);
    }
  };

  G.art = ART;
})((window.SGS = window.SGS || {}));
