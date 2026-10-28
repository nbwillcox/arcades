/* Procedural neon art: the web, the claw, every enemy, shots, capsules and the boss. All drawn with canvas strokes, no images. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, Wb = G.webs, TAU = U.TAU;
  const Art = {};
  const P = { x: 0, y: 0, s: 1 }, Q = { x: 0, y: 0, s: 1 }, TG = { x: 0, y: 0, len: 0 };
  const RINGS = 9;

  function hexA(hex, a) { const n = parseInt(hex.replace('#', ''), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /* ---------- the web ---------- */
  Art.drawWeb = function (ctx, web, o) {
    const th = web.theme, V = web.V, n = web.n, shift = o.shift || 0, alpha = o.alpha === undefined ? 1 : o.alpha;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    /* the lane the claw is in glows */
    if (o.lane !== undefined && o.lane >= 0) {
      const a = V[o.lane], b = V[(o.lane + 1) % n];
      ctx.fillStyle = hexA(th.rim, 0.14 + 0.05 * Math.sin(o.t * 8));
      ctx.beginPath();
      ctx.moveTo(C.CX + a.x * C.R * Wb.scale(0), C.CY + a.y * C.R * Wb.scale(0)); ctx.lineTo(C.CX + b.x * C.R * Wb.scale(0), C.CY + b.y * C.R * Wb.scale(0));
      ctx.lineTo(C.CX + b.x * C.R, C.CY + b.y * C.R); ctx.lineTo(C.CX + a.x * C.R, C.CY + a.y * C.R); ctx.closePath(); ctx.fill();
    }
    /* depth rings */
    ctx.strokeStyle = hexA(th.spoke, 0.55); ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let j = 0; j < RINGS; j++) {
      const d = (j + shift) / RINGS;
      if (d <= 0.02 || d >= 1) continue;
      const s = Wb.scale(d);
      for (let i = 0; i < n; i++) { const x = C.CX + V[i].x * C.R * s, y = C.CY + V[i].y * C.R * s; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      if (web.closed) ctx.closePath();
    }
    ctx.stroke();
    /* spokes */
    const s0 = Wb.scale(0);
    ctx.strokeStyle = th.spoke; ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { ctx.moveTo(C.CX + V[i].x * C.R * s0, C.CY + V[i].y * C.R * s0); ctx.lineTo(C.CX + V[i].x * C.R, C.CY + V[i].y * C.R); }
    ctx.stroke();
    /* the rim, bright */
    ctx.strokeStyle = th.rim; ctx.lineWidth = 3.2;
    ctx.beginPath();
    for (let i = 0; i < n; i++) { const x = C.CX + V[i].x * C.R, y = C.CY + V[i].y * C.R; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    if (web.closed) ctx.closePath();
    ctx.stroke();
    ctx.restore();
  };

  /* an electrified lane (pulsar blast or boss bolt) */
  Art.drawZap = function (ctx, web, lane, d0, t, color) {
    const a = web.at(lane + 0.5, d0, P), steps = 9;
    web.at(lane + 0.5, 1, Q);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const k = i / steps, jx = (i && i < steps ? Math.sin(t * 60 + i * 2.1) * 7 : 0), jy = (i && i < steps ? Math.cos(t * 53 + i * 1.7) * 7 : 0);
      const x = a.x + (Q.x - a.x) * k + jx, y = a.y + (Q.y - a.y) * k + jy;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.lineWidth = 8; ctx.globalAlpha = 0.25; ctx.stroke();
    ctx.restore();
  };

  Art.drawSpike = function (ctx, web, lane, tip, th) {
    if (tip < 0.02) return;
    web.at(lane + 0.5, 0.02, P); web.at(lane + 0.5, tip, Q);
    ctx.strokeStyle = '#46ff7a'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
    ctx.fillStyle = '#c8ffd8'; ctx.beginPath(); ctx.arc(Q.x, Q.y, 2 + 3 * Q.s, 0, TAU); ctx.fill();
    GFX.drawGlow(ctx, 'rgba(70,255,120,1)', Q.x, Q.y, 6 + 12 * Q.s, 0.5);
  };

  /* ---------- local frames ---------- */
  /* Puts the context in the lane's frame at (u, d): x along the rim, y pointing out of the tube. Returns the lane width in px (already scaled for depth). */
  function frame(ctx, web, u, d, lane) {
    web.at(u, d, P);
    web.tangent(lane === undefined ? Math.floor(u) : lane, TG);
    let ang = Math.atan2(TG.y, TG.x);
    const nx = -TG.y, ny = TG.x, ox = P.x - C.CX, oy = P.y - C.CY;
    ctx.translate(P.x, P.y); ctx.rotate(ang);
    if (nx * ox + ny * oy < 0) ctx.scale(1, -1);                                 /* make +y point away from the vanishing point */
    return TG.len * P.s;
  }
  Art.frame = frame;
  const minSize = (w) => U.clamp(w, 5, 64);

  /* ---------- the claw ---------- */
  Art.drawClaw = function (ctx, web, pos, t, o) {
    ctx.save();
    const lw = frame(ctx, web, pos + 0.5, 1, Math.round(pos));
    const w = U.clamp(lw * 0.96, 34, 74), blink = o.inv > 0 && Math.floor(t * 14) % 2;
    if (blink) { ctx.restore(); return; }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    GFX.drawGlow(ctx, 'rgba(255,225,70,1)', 0, 8, w * 0.7, 0.45);
    ctx.strokeStyle = '#ffe45a'; ctx.fillStyle = 'rgba(255,200,40,0.25)'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0); ctx.lineTo(-w * 0.42, 15); ctx.lineTo(-w * 0.22, 8); ctx.lineTo(-w * 0.12, 21);
    ctx.lineTo(0, 12); ctx.lineTo(w * 0.12, 21); ctx.lineTo(w * 0.22, 8); ctx.lineTo(w * 0.42, 15); ctx.lineTo(w / 2, 0);
    ctx.lineTo(w * 0.25, 5); ctx.lineTo(0, 1); ctx.lineTo(-w * 0.25, 5); ctx.closePath();
    ctx.fill(); ctx.stroke();
    if (o.shield > 0) {
      ctx.strokeStyle = 'rgba(120,230,255,' + (0.5 + 0.3 * Math.sin(t * 10)) + ')'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(0, 9, w * 0.62, 20, 0, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  };
  Art.drawClawIcon = function (ctx, x, y, sc) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    ctx.strokeStyle = '#ffe45a'; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-10, 4); ctx.lineTo(-8, -6); ctx.lineTo(-4, -1); ctx.lineTo(-2, -9); ctx.lineTo(0, -3); ctx.lineTo(2, -9); ctx.lineTo(4, -1); ctx.lineTo(8, -6); ctx.lineTo(10, 4); ctx.stroke();
    ctx.restore();
  };

  /* ---------- shots and capsules ---------- */
  Art.drawBullet = function (ctx, web, u, d, big) {
    web.at(u, d, P); web.at(u, Math.min(1, d + 0.045), Q);
    ctx.strokeStyle = '#eaffff'; ctx.lineWidth = (big ? 4 : 2.6) * Math.max(0.6, P.s * 1.3); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(Q.x, Q.y); ctx.stroke();
    GFX.drawGlow(ctx, 'rgba(120,230,255,1)', P.x, P.y, 7 + 10 * P.s, 0.6);
  };

  const CAP = { R: ['#ff7a3d', 'R'], S: ['#7dffb0', 'S'], P: ['#ff7ad9', 'P'], H: ['#7ee8ff', 'H'], Z: ['#fff27a', 'Z'], L: ['#ffffff', '1UP'] };
  Art.CAP = CAP;
  Art.drawCapsule = function (ctx, web, u, d, type, t) {
    const c = CAP[type];
    ctx.save();
    const w = frame(ctx, web, u, d);
    const r = U.clamp(w * 0.34, 7, 17);
    GFX.drawGlow(ctx, hexA(c[0], 1), 0, 0, r * 2.4, 0.55);
    ctx.strokeStyle = c[0]; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(8,12,30,0.8)';
    ctx.rotate(t * 2);
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-t * 2);
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.round(r * (type === 'L' ? 0.9 : 1.2)) + 'px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c[1], 0, 1);
    ctx.restore();
  };

  /* ---------- enemies ---------- */
  Art.drawFlipper = function (ctx, web, e, t) {
    ctx.save();
    const lw = frame(ctx, web, e.u, e.d, e.lane), w = minSize(lw * 0.86), hs = w * 0.42;
    if (e.spin) ctx.rotate(e.spin);
    ctx.translate(0, hs * 0.2);
    GFX.drawGlow(ctx, 'rgba(255,60,80,1)', 0, 0, w * 0.9, 0.4);
    ctx.fillStyle = '#ff3d4a'; ctx.strokeStyle = '#ffb0b8'; ctx.lineWidth = Math.max(1.2, w * 0.05); ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -hs); ctx.lineTo(0, -hs * 0.12); ctx.lineTo(w / 2, -hs); ctx.lineTo(w / 2, hs); ctx.lineTo(0, hs * 0.12); ctx.lineTo(-w / 2, hs); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, Math.max(1.2, w * 0.07), 0, TAU); ctx.fill();
    ctx.restore();
  };
  Art.drawTanker = function (ctx, web, e, t) {
    ctx.save();
    const lw = frame(ctx, web, e.u, e.d, e.lane), w = minSize(lw * 0.9), hs = w * 0.5;
    GFX.drawGlow(ctx, 'rgba(190,90,255,1)', 0, 0, w * 1.0, 0.45);
    ctx.fillStyle = '#5a1f9a'; ctx.strokeStyle = '#d9a8ff'; ctx.lineWidth = Math.max(1.4, w * 0.06); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(0, -hs); ctx.lineTo(w / 2, 0); ctx.lineTo(0, hs); ctx.lineTo(-w / 2, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    const k = 0.45 + 0.1 * Math.sin(t * 8);
    ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-w * k * 0.5, 0); ctx.lineTo(w * k * 0.5, 0); ctx.moveTo(0, -hs * k); ctx.lineTo(0, hs * k); ctx.stroke();
    ctx.restore();
  };
  Art.drawSpiker = function (ctx, web, e, t) {
    ctx.save();
    const lw = frame(ctx, web, e.u, e.d, e.lane), w = minSize(lw * 0.8), r = w * 0.5;
    GFX.drawGlow(ctx, 'rgba(70,255,120,1)', 0, 0, w, 0.4);
    ctx.strokeStyle = '#46ff7a'; ctx.lineWidth = Math.max(1.6, w * 0.08); ctx.lineCap = 'round';
    ctx.rotate(t * 7 + e.ph);
    for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(r * 0.15, 0); ctx.quadraticCurveTo(r * 0.6, r * 0.55, r, r * 0.2); ctx.stroke(); }
    ctx.fillStyle = '#d6ffe0'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill();
    ctx.restore();
  };
  Art.drawFuse = function (ctx, web, e, t) {
    ctx.save();
    const lw = frame(ctx, web, e.u, e.d, Math.floor(e.u)), w = minSize(lw * 0.8), r = w * 0.55;
    GFX.drawGlow(ctx, 'rgba(255,230,90,1)', 0, 0, w * 1.2, 0.55);
    ctx.strokeStyle = '#ffe45a'; ctx.lineWidth = Math.max(1.4, w * 0.07); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i * TAU / 9 + t * 5, rr = r * (0.55 + 0.5 * Math.abs(Math.sin(t * 31 + i * 2.3)));
      ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * rr * 0.5 + Math.sin(t * 40 + i) * r * 0.12, Math.sin(a) * rr * 0.5); ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fill();
    ctx.restore();
  };
  Art.drawPulsar = function (ctx, web, e, t) {
    ctx.save();
    const lw = frame(ctx, web, e.u, e.d, e.lane), w = minSize(lw * 0.9), hs = w * 0.3;
    const hot = e.pt > 0 ? 1 : e.tele > 0 ? (Math.floor(t * 20) % 2) : 0;
    GFX.drawGlow(ctx, hot ? 'rgba(255,255,160,1)' : 'rgba(60,230,255,1)', 0, 0, w, hot ? 0.8 : 0.45);
    ctx.strokeStyle = hot ? '#fffbb0' : '#37e6ff'; ctx.lineWidth = Math.max(1.6, w * 0.07); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i <= 8; i++) { const x = -w / 2 + w * i / 8, y = (i % 2 ? hs : -hs) * (hot ? 1.5 : 1); if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.restore();
  };

  /* ---------- the boss ---------- */
  const BOSS = [
    { name: 'THE MAW', col: '#ff5a3d', glow: 'rgba(255,90,60,1)' },
    { name: 'THE HIVE', col: '#ffd24a', glow: 'rgba(255,210,70,1)' },
    { name: 'THE PRISM', col: '#b97aff', glow: 'rgba(185,120,255,1)' },
  ];
  Art.BOSS = BOSS;
  Art.drawBoss = function (ctx, web, b, t) {
    const sk = BOSS[b.skin], dp = b.plateD;
    ctx.save();
    /* plates */
    for (let l = 0; l < web.lanes; l++) {
      const hp = b.plates[l];
      if (hp <= 0) continue;
      const a0 = web.at(l + 0.04, dp - 0.035, P), a1 = { x: P.x, y: P.y }, b1 = web.at(l + 0.96, dp - 0.035, P), b0 = { x: P.x, y: P.y };
      const c1 = web.at(l + 0.96, dp + 0.035, P), c0 = { x: P.x, y: P.y }, d1 = web.at(l + 0.04, dp + 0.035, P), d0 = { x: P.x, y: P.y };
      ctx.fillStyle = 'rgba(12,16,40,0.9)'; ctx.strokeStyle = hexA(sk.col, 0.55 + 0.15 * hp); ctx.lineWidth = 1.5 + hp * 0.7;
      ctx.beginPath(); ctx.moveTo(a1.x, a1.y); ctx.lineTo(b0.x, b0.y); ctx.lineTo(c0.x, c0.y); ctx.lineTo(d0.x, d0.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (b.hitF[l] > 0) { ctx.fillStyle = 'rgba(255,255,255,' + b.hitF[l] * 1.4 + ')'; ctx.fill(); }
    }
    /* core */
    const cs = Wb.scale(Math.max(0.05, dp - 0.12)), r = 6 + 70 * cs * 0.26 + 2 * Math.sin(t * 6), pulse = b.hitCore > 0 ? 1 : 0;
    GFX.drawGlow(ctx, sk.glow, C.CX, C.CY, 40 + r * 2.2, 0.55);
    ctx.fillStyle = pulse ? '#fff' : sk.col;
    ctx.beginPath(); ctx.arc(C.CX, C.CY, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.save(); ctx.translate(C.CX, C.CY); ctx.rotate(t * 1.6);
    for (let i = 0; i < 6; i++) { ctx.rotate(TAU / 6); ctx.beginPath(); ctx.moveTo(r + 3, 0); ctx.lineTo(r + 11 + (b.skin === 2 ? 8 : 0), 0); ctx.stroke(); }
    ctx.restore();
    ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.arc(C.CX, C.CY, r * 0.38, 0, TAU); ctx.fill();
    ctx.restore();
  };

  G.art = Art;
})((window.SGS = window.SGS || {}));
