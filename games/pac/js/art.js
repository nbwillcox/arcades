/* Procedural art: the neon maze (drawn once per level into a cache), the hero, the four drones and the bonus gems. No image files. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const W = C.COLS, H = C.ROWS, T = C.T;
  const Art = { cur: null };
  const DIRV = [null, [0, -1], [-1, 0], [0, 1], [1, 0]];

  const DRONE = {
    stalker: { c: '#ff3d5a', dark: '#7a1226', glow: 'rgba(255,61,90,1)' },
    ambusher: { c: '#ff7ad9', dark: '#7a2468', glow: 'rgba(255,122,217,1)' },
    flanker: { c: '#37e6ff', dark: '#115a70', glow: 'rgba(55,230,255,1)' },
    wisp: { c: '#ffc83d', dark: '#7a5a10', glow: 'rgba(255,200,61,1)' },
  };
  Art.DRONE = DRONE;

  function hexA(hex, a) { const n = parseInt(hex.replace('#', ''), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /* ---------- the maze ---------- */
  Art.buildMaze = function (mz) {
    const c = document.createElement('canvas'), K = 2;
    c.width = W * T * K; c.height = H * T * K;
    const x = c.getContext('2d'), th = mz.theme, t = mz.t;
    x.scale(K, K);
    x.fillStyle = 'rgba(2,4,16,0.52)'; x.fillRect(0, 0, W * T, H * T);
    x.fillStyle = hexA(th.wall, 0.07);
    for (let i = 0; i < t.length; i++) if (t[i] === 2) x.fillRect((i % W) * T, ((i / W) | 0) * T, T, T);
    const wall = (cx, cy) => cx >= 0 && cx < W && cy >= 0 && cy < H && t[cy * W + cx] === 1;
    const path = new Path2D();
    for (let cy = 0; cy < H; cy++) for (let cx = 0; cx < W; cx++) {
      if (!wall(cx, cy)) continue;
      const mx = (cx + 0.5) * T, my = (cy + 0.5) * T;
      let any = false;
      if (wall(cx + 1, cy)) { path.moveTo(mx, my); path.lineTo(mx + T, my); any = true; }
      if (wall(cx, cy + 1)) { path.moveTo(mx, my); path.lineTo(mx, my + T); any = true; }
      if (wall(cx - 1, cy) || wall(cx, cy - 1)) any = true;
      if (!any) { path.moveTo(mx + (T - 5) / 2, my); path.arc(mx, my, (T - 5) / 2, 0, TAU); }
    }
    x.lineCap = 'round'; x.lineJoin = 'round';
    x.shadowColor = th.glow; x.shadowBlur = 12; x.strokeStyle = th.wall; x.lineWidth = T - 5; x.stroke(path);
    x.stroke(path);
    x.shadowBlur = 0; x.strokeStyle = '#04061a'; x.lineWidth = T - 10; x.stroke(path);
    x.strokeStyle = hexA(th.wall, 0.2); x.lineWidth = 2; x.stroke(path);
    /* the hub door */
    x.strokeStyle = '#ff7ad9'; x.lineWidth = 3; x.shadowColor = 'rgba(255,122,217,0.9)'; x.shadowBlur = 8;
    x.beginPath(); x.moveTo(10 * T + 3, 10.5 * T); x.lineTo(11 * T - 3, 10.5 * T); x.stroke();
    x.shadowBlur = 0;
    Art.cur = c;
  };
  Art.drawMaze = function (ctx) { if (Art.cur) ctx.drawImage(Art.cur, C.MX, C.MY, W * T, H * T); };

  /* ---------- power cell ---------- */
  Art.drawPower = function (ctx, x, y, t, blink) {
    GFX.drawGlow(ctx, 'rgba(170,215,255,1)', x, y, 15, 0.55 * blink);
    ctx.fillStyle = '#eaf6ff';
    ctx.beginPath(); ctx.arc(x, y, 5.2 * (0.85 + 0.15 * blink), 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(120,190,255,0.9)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x, y, 7.4 + Math.sin(t * 6) * 0.6, 0, TAU); ctx.stroke();
  };

  /* ---------- hero ---------- */
  Art.drawHero = function (ctx, x, y, face, t, moving, power, scale) {
    const d = DIRV[face || 2], r = 9.6;
    ctx.save();
    ctx.translate(x, y);
    if (scale && scale !== 1) ctx.scale(scale, scale);
    GFX.drawGlow(ctx, 'rgba(190,255,60,1)', 0, 0, power ? 30 : 22, power ? 0.7 : 0.5);
    if (moving) {                                                                /* thruster puffs behind */
      const f = 4 + Math.sin(t * 50) * 1.5;
      ctx.fillStyle = 'rgba(255,214,90,0.9)';
      ctx.beginPath(); ctx.moveTo(-d[0] * 8 - d[1] * 4, -d[1] * 8 - d[0] * 4); ctx.lineTo(-d[0] * (11 + f), -d[1] * (11 + f)); ctx.lineTo(-d[0] * 8 + d[1] * 4, -d[1] * 8 + d[0] * 4); ctx.closePath(); ctx.fill();
    }
    const g = ctx.createRadialGradient(-2.5, -3, 1, 0, 0, r);
    g.addColorStop(0, '#f8ffd0'); g.addColorStop(0.45, '#b9f322'); g.addColorStop(1, '#5a9d00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(d[0] * 3.6, d[1] * 3.6 - 0.5, 4.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.arc(d[0] * 5.2, d[1] * 5.2 - 0.5, 2.3, 0, TAU); ctx.fill();
    if (power) { ctx.strokeStyle = 'rgba(160,210,255,' + (0.4 + 0.3 * Math.sin(t * 12)) + ')'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, r + 3.5, 0, TAU); ctx.stroke(); }
    ctx.restore();
  };
  Art.drawHeroDeath = function (ctx, x, y, p) {
    const k = Math.max(0, 1 - p / 0.7);
    if (k <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(p * 12);
    GFX.drawGlow(ctx, 'rgba(190,255,60,1)', 0, 0, 24 * k + 6, 0.5 * k);
    ctx.scale(k, 1 + (1 - k) * 0.8);
    const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 9.6);
    g.addColorStop(0, '#f8ffd0'); g.addColorStop(0.5, '#b9f322'); g.addColorStop(1, '#5a9d00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 9.6, 0, TAU); ctx.fill();
    ctx.restore();
  };

  /* ---------- drones ---------- */
  Art.drawDrone = function (ctx, d, x, y, t, flash, dying) {
    const k = DRONE[d.kind], dv = DIRV[d.dir || 2] || [0, 1], i = d.i;
    ctx.save();
    ctx.translate(x, y);
    if (dying) ctx.globalAlpha = 0.7;
    if (d.state === 'eyes' || d.state === 'enter') {
      GFX.drawGlow(ctx, k.glow, 0, 0, 14, 0.45);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 4.8, 0, TAU); ctx.fill();
      ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.arc(dv[0] * 2, dv[1] * 2, 2.2, 0, TAU); ctx.fill();
      ctx.restore();
      return;
    }
    const bob = d.state === 'house' ? Math.sin(t * 5 + i * 1.7) * 2.2 : Math.sin(t * 9 + i) * 0.9;
    const col = d.fr ? (flash ? '#ffffff' : '#3556ff') : k.c, dark = d.fr ? (flash ? '#9aa8ff' : '#16206e') : k.dark;
    GFX.drawGlow(ctx, d.fr ? 'rgba(80,110,255,1)' : k.glow, 0, 1, 21, d.fr ? 0.35 : 0.42);
    ctx.translate(0, bob);
    /* the kind's own mark */
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 1.6;
    if (d.kind === 'stalker') { ctx.beginPath(); ctx.moveTo(-3, -7); ctx.lineTo(0, -13); ctx.lineTo(3, -7); ctx.closePath(); ctx.fill(); }
    else if (d.kind === 'ambusher') { ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, -11); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -12, 2, 0, TAU); ctx.fill(); }
    else if (d.kind === 'flanker') { ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(-14, -3); ctx.lineTo(-11, 5); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(9, 1); ctx.lineTo(14, -3); ctx.lineTo(11, 5); ctx.closePath(); ctx.fill(); }
    else { ctx.globalAlpha *= 0.55 + 0.45 * Math.sin(t * 22 + i); ctx.beginPath(); ctx.moveTo(-6, 8); ctx.lineTo(-3, 13); ctx.lineTo(0, 8); ctx.lineTo(3, 13); ctx.lineTo(6, 8); ctx.stroke(); ctx.globalAlpha = dying ? 0.7 : 1; }
    /* hull */
    const hg = ctx.createLinearGradient(0, -2, 0, 9);
    hg.addColorStop(0, col); hg.addColorStop(1, dark);
    ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 3.5, 11.5, 6.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = hexA(col.length === 7 ? col : '#ffffff', 0.9);
    ctx.beginPath(); ctx.arc(0, 3, 8.6, Math.PI, TAU); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let n = -1; n <= 1; n++) { ctx.beginPath(); ctx.arc(n * 5.5, 6.6, 1.1, 0, TAU); ctx.fill(); }
    if (d.fr) {                                                                      /* stunned: a frightened zigzag mouth */
      ctx.strokeStyle = flash ? '#3556ff' : '#fff'; ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(-5, 1); for (let n = 0; n < 5; n++) ctx.lineTo(-5 + n * 2.5 + 1.25, n % 2 ? 1 : 3.5);
      ctx.stroke();
      ctx.fillStyle = flash ? '#3556ff' : '#fff'; ctx.fillRect(-4.5, -3, 2.4, 2.4); ctx.fillRect(2.1, -3, 2.4, 2.4);
    } else {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(dv[0] * 2, -1 + dv[1] * 1.2, 5, 4.4, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.arc(dv[0] * 4, -1 + dv[1] * 2.4, 2.1, 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  /* ---------- gems ---------- */
  Art.drawGem = function (ctx, def, x, y, t, hide) {
    if (hide) return;
    const c = def.color, b = Math.sin(t * 5) * 1.2;
    ctx.save(); ctx.translate(x, y + b);
    GFX.drawGlow(ctx, hexA(c, 1), 0, 0, 20, 0.55);
    ctx.fillStyle = c; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
    switch (def.shape) {
      case 'diamond': ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 0); ctx.lineTo(0, 9); ctx.lineTo(-7, 0); ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'ring': ctx.lineWidth = 3.4; ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -6, 2, 0, TAU); ctx.fill(); break;
      case 'orb': { const g = ctx.createRadialGradient(-2, -2, 1, 0, 0, 8); g.addColorStop(0, '#fff'); g.addColorStop(1, c); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); break; }
      case 'star': ctx.beginPath(); for (let n = 0; n < 10; n++) { const a = n * Math.PI / 5 - Math.PI / 2, r = n % 2 ? 4 : 9; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); break;
      case 'comet': ctx.beginPath(); ctx.arc(3, 3, 5, 0, TAU); ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 2.5; for (let n = 0; n < 3; n++) { ctx.beginPath(); ctx.moveTo(-1 - n, -1 - n * 0.4); ctx.lineTo(-9, -9 + n * 3); ctx.stroke(); } break;
      case 'moon': ctx.beginPath(); ctx.arc(0, 0, 8, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(4, -2, 6.6, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
      case 'sun': ctx.strokeStyle = c; ctx.lineWidth = 2; for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 6.5, Math.sin(a) * 6.5); ctx.lineTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, TAU); ctx.fill(); break;
      default: ctx.lineWidth = 3; ctx.strokeStyle = c; ctx.beginPath(); ctx.arc(-4, -3, 4, 0, TAU); ctx.moveTo(-1, 0); ctx.lineTo(8, 8); ctx.moveTo(4, 4); ctx.lineTo(7, 1); ctx.stroke();
    }
    ctx.restore();
  };

  G.art = Art;
})((window.SGS = window.SGS || {}));
