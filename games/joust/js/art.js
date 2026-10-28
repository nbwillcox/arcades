/* Neon vector art: platforms, lava and the grabbing hand, riders on their space-birds, eggs, the wraith, bosses and capsules. No image files. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const Art = {};
  const hexA = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

  Art.drawPlatform = function (ctx, p, th, t) {
    const r = 6;
    ctx.save();
    ctx.fillStyle = '#0a1230';
    ctx.beginPath();
    ctx.moveTo(p.x + r, p.y); ctx.lineTo(p.x + p.w - r, p.y); ctx.quadraticCurveTo(p.x + p.w, p.y, p.x + p.w, p.y + r);
    ctx.lineTo(p.x + p.w, p.y + p.h - r); ctx.quadraticCurveTo(p.x + p.w, p.y + p.h, p.x + p.w - r, p.y + p.h);
    ctx.lineTo(p.x + r, p.y + p.h); ctx.quadraticCurveTo(p.x, p.y + p.h, p.x, p.y + p.h - r); ctx.lineTo(p.x, p.y + r); ctx.quadraticCurveTo(p.x, p.y, p.x + r, p.y);
    ctx.fill();
    ctx.strokeStyle = hexA(th.rim, 0.35); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.strokeStyle = th.rim; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(p.x + 3, p.y + 0.5); ctx.lineTo(p.x + p.w - 3, p.y + 0.5); ctx.stroke();
    ctx.fillStyle = hexA(th.rim, 0.25);
    for (let x = p.x + 14; x < p.x + p.w - 8; x += 22) ctx.fillRect(x, p.y + 5, 10, 3);
    ctx.restore();
  };
  Art.platformGlow = function (ctx, p, th) {
    GFX.drawGlow(ctx, hexA(th.rim, 1), p.x + p.w / 2, p.y, Math.max(40, p.w * 0.5), 0.14);
  };

  Art.drawLava = function (ctx, t, th) {
    const y0 = C.LAVA_Y, W = C.W, H = C.H;
    const g = ctx.createLinearGradient(0, y0 - 6, 0, H);
    g.addColorStop(0, th.lava[1]); g.addColorStop(0.25, th.lava[0]); g.addColorStop(1, '#2a0508');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) ctx.lineTo(x, y0 + 3 * Math.sin(x * 0.03 + t * 2) + 2.4 * Math.sin(x * 0.07 - t * 3.1));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    const gg = ctx.createLinearGradient(0, y0 - 40, 0, y0 + 6);
    gg.addColorStop(0, 'rgba(255,120,40,0)'); gg.addColorStop(1, hexA(th.lava[0], 0.35));
    ctx.fillStyle = gg; ctx.fillRect(0, y0 - 40, W, 46);
    ctx.fillStyle = hexA(th.lava[1], 0.55);
    for (let i = 0; i < 14; i++) { const bx = (i * 83 + t * 24) % W, by = y0 + 8 + ((i * 37 + t * 30) % 30); ctx.beginPath(); ctx.arc(bx, by, 2 + (i % 3), 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'source-over';
  };

  /* the grabbing hand: an arm rising out of the lava to hold on to y */
  Art.drawHand = function (ctx, x, y, t, th) {
    ctx.save();
    ctx.strokeStyle = '#ff6a3a'; ctx.fillStyle = '#4a0a0a'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.rect(x - 7, y, 14, C.LAVA_Y - y + 6); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x, y, 11, 8, 0, 0, TAU); ctx.fill(); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * 4, y - 3); ctx.quadraticCurveTo(x + i * 6 + Math.sin(t * 9 + i) * 2, y - 14, x + i * 3.2, y - 17 - (i === 0 ? 3 : 0)); ctx.stroke(); }
    GFX.drawGlow(ctx, 'rgba(255,90,40,1)', x, y, 24, 0.5);
    ctx.restore();
  };

  /* ---------- riders ---------- */
  const PAL = {
    player: { body: '#1c5f8f', dark: '#0a2a48', hi: '#7ee8ff', wing: '#5ad0ff', armor: '#ffd24a', armor2: '#b8892a', plume: '#ffffff', lance: '#ffe45a', cape: '#2fd0ff' },
  };
  const TIERPAL = [
    { body: '#b02a3a', dark: '#4a0a14', hi: '#ff8a8a', wing: '#ff5a5a', armor: '#c8c8d8', armor2: '#7a7a90', plume: '#ff5a5a', lance: '#ffeaea', cape: '#d03a4a' },
    { body: '#2a44b0', dark: '#0a1448', hi: '#9ab0ff', wing: '#6a8cff', armor: '#9ad0ff', armor2: '#4a6aa0', plume: '#7ee8ff', lance: '#e8f0ff', cape: '#4a68e0' },
    { body: '#7a4a08', dark: '#2a1404', hi: '#ffe27a', wing: '#ffc83d', armor: '#ffd24a', armor2: '#a06a10', plume: '#ff7a1f', lance: '#fff6c8', cape: '#b97aff' },
  ];
  /* a fan of feathers hinged at the shoulder; w is the flap state, -1 (down) to 1 (up) */
  function featherWing(ctx, pal, w, near) {
    const n = 6, rx = near ? -1 : -3, ry = near ? 4 : 3;
    for (let k = 0; k < n; k++) {
      const f = k / (n - 1), ang = 2.55 - f * 0.9 + (near ? 0 : 0.12) + w * (0.55 + f * 0.25), len = (near ? 27 : 23) - f * 8;
      const ax = Math.cos(ang), ay = -Math.sin(ang);
      const tx = rx + ax * len, ty = ry + ay * len + 4 + (1 - w) * 2;
      const nx = -ay * 3.4, ny = ax * 3.4;
      const g = ctx.createLinearGradient(rx, ry, tx, ty);
      g.addColorStop(0, hexA(pal.body, near ? 0.95 : 0.6)); g.addColorStop(0.6, hexA(pal.wing, near ? 0.8 : 0.45)); g.addColorStop(1, hexA(pal.hi, near ? 0.9 : 0.5));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(rx + nx * 0.5, ry + ny * 0.5); ctx.quadraticCurveTo((rx + tx) / 2 + nx, (ry + ty) / 2 + ny, tx, ty); ctx.quadraticCurveTo((rx + tx) / 2 - nx, (ry + ty) / 2 - ny, rx - nx * 0.5, ry - ny * 0.5); ctx.closePath(); ctx.fill();
      if (near) { ctx.strokeStyle = hexA(pal.hi, 0.9); ctx.lineWidth = 1; ctx.stroke(); }
    }
  }
  Art.drawRider = function (ctx, e, t, o) {
    const player = e.tier === undefined, tier = player ? -1 : e.tier, pal = player ? PAL.player : TIERPAL[e.tier];
    if (o && o.blink) return;
    const big = (e.scale || 1) * 1.14;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(e.face * big, big);
    const tilt = U.clamp((e.vy || 0) / 1000, -0.32, 0.32) * (e.ground ? 0 : 1);
    ctx.rotate(tilt);
    const fa = e.flapA || 0, w = e.flapping > 0 ? Math.sin(fa) : (e.ground ? 0.1 : 0.25 + Math.sin(t * 2.4 + e.x * 0.02) * 0.12);
    const ground = e.ground, sway = Math.sin(t * 9 + e.x * 0.05) * 2 + Math.min(10, Math.abs(e.vx) * 0.04);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    GFX.drawGlow(ctx, hexA(pal.hi, 1), 0, 2, tier === 2 ? 44 : 32, tier === 2 ? 0.5 : 0.3);
    /* tail feathers */
    for (let k = 0; k < 3; k++) {
      const a = 3.4 + k * 0.22 + Math.sin(t * 6 + k) * 0.05 + (ground ? 0 : 0.1), l = 15 - k * 1.5;
      ctx.strokeStyle = k === 1 ? pal.hi : pal.wing; ctx.lineWidth = 3.2 - k * 0.6;
      ctx.beginPath(); ctx.moveTo(-11, 6 + k); ctx.quadraticCurveTo(-11 + Math.cos(a) * l * 0.5, 6 + k + Math.sin(a) * l * 0.5 + 2, -11 + Math.cos(a) * l, 6 + k + Math.sin(a) * l + 3); ctx.stroke();
    }
    featherWing(ctx, pal, w, false);
    /* legs and talons */
    ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2;
    const run = ground ? Math.sin(e.run || 0) * 4 : 0, lift = ground ? 0 : -3;
    for (const lx of [-3, 5]) {
      const k = lx < 0 ? run : -run;
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(lx, 11); ctx.lineTo(lx + k * 0.5, 16 + lift); ctx.lineTo(lx + k, 19 + lift); ctx.stroke();
      ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(lx + k, 19 + lift); ctx.lineTo(lx + k + 4, 20 + lift); ctx.moveTo(lx + k, 19 + lift); ctx.lineTo(lx + k - 3, 20.5 + lift); ctx.moveTo(lx + k, 19 + lift); ctx.lineTo(lx + k + 1, 21.5 + lift); ctx.stroke();
    }
    /* body */
    const bg = ctx.createLinearGradient(0, -2, 0, 16);
    bg.addColorStop(0, pal.hi); bg.addColorStop(0.35, pal.body); bg.addColorStop(1, pal.dark);
    ctx.fillStyle = bg; ctx.strokeStyle = pal.hi; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(0, 7, 15, 8.5, -0.06, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = hexA(pal.hi, 0.55); ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(7 - k * 5, 9, 4, 0.2, Math.PI - 0.2); ctx.stroke(); }
    /* neck and head */
    ctx.strokeStyle = pal.body; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(9, 4); ctx.quadraticCurveTo(16, 1, 16, -5); ctx.stroke();
    ctx.strokeStyle = pal.hi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(9, 1.5); ctx.quadraticCurveTo(16, -1, 18.5, -5.5); ctx.stroke();
    ctx.fillStyle = pal.body; ctx.strokeStyle = pal.hi; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(17, -7, 5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = pal.hi; ctx.beginPath(); ctx.moveTo(14, -11); ctx.lineTo(8, -16 + Math.sin(t * 7) * 0.8); ctx.lineTo(13, -8.5); ctx.moveTo(15.5, -11.5); ctx.lineTo(11, -19); ctx.lineTo(17, -11); ctx.fill();
    const bk = ctx.createLinearGradient(21, -9, 29, -5); bk.addColorStop(0, '#ffe27a'); bk.addColorStop(1, '#ff9a1f');
    ctx.fillStyle = bk; ctx.beginPath(); ctx.moveTo(20.5, -9.5); ctx.quadraticCurveTo(28, -8.5, 29, -4.5); ctx.quadraticCurveTo(24, -6, 20.5, -4.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(18.6, -8, 1.9, 0, TAU); ctx.fill(); ctx.fillStyle = tier === 2 ? '#ff3d5a' : '#10142a'; ctx.beginPath(); ctx.arc(19.2, -8, 1, 0, TAU); ctx.fill();
    /* the cape, flowing behind */
    ctx.fillStyle = hexA(pal.cape, 0.8); ctx.strokeStyle = hexA(pal.hi, 0.7); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-3, -13); ctx.quadraticCurveTo(-12 - sway, -12, -21 - sway * 1.4, -4 + sway * 0.5); ctx.quadraticCurveTo(-13 - sway * 0.4, -2, -3, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
    /* the rider: torso armor, pauldron, helmet and plume */
    const ag = ctx.createLinearGradient(-5, -14, 4, -1); ag.addColorStop(0, pal.armor); ag.addColorStop(1, pal.armor2);
    ctx.fillStyle = ag; ctx.strokeStyle = '#10142a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-5, -14); ctx.lineTo(4, -14); ctx.lineTo(5, -2); ctx.lineTo(-5, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-3, -12, 2, 8);
    ctx.fillStyle = pal.armor; ctx.strokeStyle = '#10142a'; ctx.beginPath(); ctx.arc(3, -12, 4.2, 0, TAU); ctx.fill(); ctx.stroke();
    if (tier === 2) { ctx.fillStyle = pal.armor2; ctx.beginPath(); ctx.moveTo(1, -15); ctx.lineTo(3, -22); ctx.lineTo(5.5, -14.5); ctx.fill(); }
    if (tier === 1) { ctx.strokeStyle = pal.hi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(3, -12, 5.6, -2.6, 0.2); ctx.stroke(); }
    const hg = ctx.createLinearGradient(0, -26, 0, -16); hg.addColorStop(0, pal.armor); hg.addColorStop(1, pal.armor2);
    ctx.fillStyle = hg; ctx.strokeStyle = '#10142a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(-0.5, -19, 5.2, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10142a'; ctx.fillRect(0.4, -20.2, 5, 1.8);
    ctx.fillStyle = tier === 2 ? '#ff7a1f' : '#7ee8ff'; ctx.fillRect(1.6, -20, 3, 1.2);
    ctx.strokeStyle = pal.plume; ctx.lineWidth = 2.6;
    const pl = tier === 2 ? 12 : tier === 1 ? 9 : 7;
    ctx.beginPath(); ctx.moveTo(-3, -23.5); ctx.quadraticCurveTo(-9 - sway * 0.6, -24 - pl * 0.5, -14 - sway, -19 - pl * 0.4 + sway * 0.4); ctx.stroke();
    if (tier === 1) { ctx.fillStyle = pal.armor; ctx.beginPath(); ctx.moveTo(-5, -22); ctx.lineTo(-8, -28); ctx.lineTo(-3, -23.5); ctx.moveTo(2.5, -23.5); ctx.lineTo(5, -29); ctx.lineTo(3.8, -22); ctx.fill(); }
    if (tier === 2) { ctx.strokeStyle = '#ff7a1f'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-1 + k * 1.2, -24); ctx.quadraticCurveTo(-2 + k * 2 + Math.sin(t * 12 + k) * 2, -31 - k * 2, -3 + k * 3 + Math.sin(t * 9 + k) * 2, -35 - k * 2); ctx.stroke(); } }
    /* the lance: shaft, pennant and a bright head */
    const L = e.lance || 34;
    const sg = ctx.createLinearGradient(2, -10, 2 + L, -15); sg.addColorStop(0, '#8a6a30'); sg.addColorStop(1, pal.lance);
    ctx.strokeStyle = sg; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(1, -9.5); ctx.lineTo(2 + L - 6, -14.2); ctx.stroke();
    ctx.fillStyle = pal.lance; ctx.beginPath(); ctx.moveTo(2 + L - 7, -16.4); ctx.lineTo(2 + L + 3, -15); ctx.lineTo(2 + L - 7, -12.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = hexA(pal.plume, 0.9); ctx.beginPath(); const px = 2 + L * 0.5; ctx.moveTo(px, -12.2); ctx.lineTo(px - 9 - sway * 0.5, -9.5 + Math.sin(t * 14) * 1.5); ctx.lineTo(px - 2, -8.2); ctx.closePath(); ctx.fill();
    GFX.drawGlow(ctx, 'rgba(255,240,170,1)', 2 + L + 1, -15, tier === 2 ? 16 : 12, 0.75);
    ctx.strokeStyle = pal.armor2; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(2, -9); ctx.lineTo(7, -9.8); ctx.stroke();
    featherWing(ctx, pal, w, true);
    if (o && o.shield) { ctx.strokeStyle = 'rgba(125,255,176,' + (0.55 + 0.3 * Math.sin(t * 10)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(2, -2, 28, 30, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = 'rgba(125,255,176,0.07)'; ctx.fill(); }
    if (o && o.big) { ctx.strokeStyle = 'rgba(255,240,120,0.85)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(2 + L + 1, -15, 10 + Math.sin(t * 14), 0, TAU); ctx.stroke(); }
    ctx.restore();
  };

  Art.drawEgg = function (ctx, g, t) {
    const hatch = g.hatching > 0, wob = hatch ? Math.sin(t * 40) * 0.25 : Math.sin(t * 3 + g.x) * 0.05;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(wob);
    const col = C.TIERS[g.tier].col;
    GFX.drawGlow(ctx, hexA(col, 1), 0, 0, hatch ? 30 : 20, hatch ? 0.8 : 0.45);
    const gr = ctx.createRadialGradient(-2, -3, 1, 0, 0, 11);
    gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, hatch && Math.floor(t * 12) % 2 ? '#fff' : col); gr.addColorStop(1, hexA(col, 0.4));
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(0, 0, 8, 10.5, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; for (const q of [[-3, -4, 1.3], [3, 2, 1.1], [-2, 5, 0.9], [4, -5, 0.8]]) { ctx.beginPath(); ctx.arc(q[0], q[1], q[2], 0, TAU); ctx.fill(); }
    ctx.strokeStyle = hexA(col, 0.5 + 0.3 * Math.sin(t * 5)); ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(0, 0, 11.5, 14, 0, 0, TAU); ctx.stroke();
    if (hatch) { ctx.beginPath(); ctx.moveTo(-5, -2); ctx.lineTo(-1, 1); ctx.lineTo(2, -3); ctx.lineTo(6, 1); ctx.stroke(); }
    ctx.restore();
  };

  Art.drawWraith = function (ctx, w, t) {
    ctx.save(); ctx.translate(w.x, w.y); ctx.scale(w.face, 1);
    const f = Math.sin(t * 12);
    GFX.drawGlow(ctx, 'rgba(170,120,255,1)', 0, 0, 56, 0.45);
    ctx.fillStyle = 'rgba(30,16,60,0.9)'; ctx.strokeStyle = '#c9a0ff'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-30, -2 - f * 14); ctx.quadraticCurveTo(-8, -10, 14, -4); ctx.lineTo(14, 8); ctx.quadraticCurveTo(-8, 12, -30, 6 + f * 14); ctx.quadraticCurveTo(-18, 2, -30, -2 - f * 14); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, -9); ctx.lineTo(32, -2); ctx.lineTo(10, 1); ctx.closePath(); ctx.fillStyle = 'rgba(30,16,60,0.9)'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(10, 9); ctx.lineTo(30, 4); ctx.lineTo(10, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(8, -5, 2.6, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(14, 1); ctx.lineTo(30, 1); ctx.stroke();
    ctx.restore();
  };

  Art.drawBoss = function (ctx, b, t) {
    const sk = C.BOSSES[b.skin];
    ctx.save(); ctx.translate(b.x, b.y); ctx.scale(b.face, 1);
    const f = Math.sin(t * 5), hit = b.flash > 0;
    GFX.drawGlow(ctx, hexA(sk.col, 1), 0, 0, 120, 0.4);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.fillStyle = hexA(sk.col, 0.25); ctx.strokeStyle = sk.col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-10, -4); ctx.quadraticCurveTo(-60, -50 - f * 30, -110, -10 - f * 40); ctx.quadraticCurveTo(-60, 10, -10, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = hit ? '#fff' : '#161a3a'; ctx.beginPath(); ctx.ellipse(0, 4, 56, 30, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(40, -6); ctx.quadraticCurveTo(66, -16, 68, -34); ctx.stroke();
    ctx.fillStyle = hit ? '#fff' : '#161a3a'; ctx.beginPath(); ctx.arc(70, -36, 15, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd24a'; ctx.beginPath(); ctx.moveTo(82, -42); ctx.lineTo(108, -32); ctx.lineTo(82, -26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(74, -40, 3.4, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) { ctx.strokeStyle = sk.col; ctx.beginPath(); ctx.moveTo(-30 + i * 18, -22); ctx.lineTo(-24 + i * 18, -34 - (i % 2) * 5); ctx.stroke(); }
    /* the weak spot on its back */
    const pu = 0.6 + 0.4 * Math.sin(t * 8);
    GFX.drawGlow(ctx, 'rgba(255,255,160,1)', 0, -26, 30, 0.8 * pu);
    ctx.fillStyle = '#fff6a8'; ctx.beginPath(); ctx.arc(0, -26, 8 + pu * 2, 0, TAU); ctx.fill();
    ctx.restore();
  };

  const CAP = { S: ['#7dffb0', 'S'], R: ['#ff7a3d', 'R'], L: ['#ffe45a', 'L'], M: ['#7ee8ff', 'M'], U: ['#ffffff', '1UP'] };
  Art.CAP = CAP;
  Art.drawCapsule = function (ctx, c, t) {
    const col = CAP[c.type];
    ctx.save(); ctx.translate(c.x, c.y);
    GFX.drawGlow(ctx, hexA(col[0], 1), 0, 0, 24, 0.55);
    ctx.rotate(t * 2); ctx.strokeStyle = col[0]; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(8,12,30,0.85)';
    ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.rotate(-t * 2);
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + (c.type === 'U' ? 9 : 12) + 'px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(col[1], 0, 1);
    ctx.restore();
  };

  Art.drawPad = function (ctx, x, y, k, th) {
    ctx.save(); ctx.strokeStyle = th.rim; ctx.globalAlpha = 0.9 * (1 - k); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x, y - 4, 40 * (1 - k * 0.7), 18 * (1 - k * 0.7), 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.5 * (1 - k); ctx.beginPath(); ctx.ellipse(x, y - 4, 22 * (1 - k * 0.7), 9 * (1 - k * 0.7), 0, 0, TAU); ctx.stroke();
    ctx.restore();
  };

  Art.drawBolt = function (ctx, b, t) {
    GFX.drawGlow(ctx, 'rgba(190,120,255,1)', b.x, b.y, 18, 0.8);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, TAU); ctx.fill();
  };

  Art.drawRiderIcon = function (ctx, x, y, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = '#7ee8ff'; ctx.beginPath(); ctx.ellipse(0, 5, 11, 6, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8f4ff'; ctx.beginPath(); ctx.arc(0, -5, 4, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#ffe45a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(3, -2); ctx.lineTo(16, -6); ctx.stroke();
    ctx.restore();
  };

  G.art = Art;
})((window.SGS = window.SGS || {}));
