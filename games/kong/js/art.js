/* Neon vector art in arcade units (the context is already scaled): girders, ladders, the great ape, the climber, Nova and every hazard. No image files. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const Art = {};
  const hexA = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };
  const glow = (ctx, col, x, y, r, a) => GFX.drawGlow(ctx, col, x, y, r, a);
  const rr = (ctx, x, y, w, h, r) => { if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); } else { ctx.beginPath(); ctx.rect(x, y, w, h); } };

  /* ---------- backdrop: a skyline far behind the structure, steel columns and a floor glow ---------- */
  let sky = null, skyKey = '';
  function buildSky(th) {
    const c = document.createElement('canvas'), K = 3; c.width = C.UW * K; c.height = C.UH * K;
    const x = c.getContext('2d'); x.scale(K, K);
    const g = x.createLinearGradient(0, 0, 0, C.UH);
    g.addColorStop(0, 'rgba(4,6,20,0.85)'); g.addColorStop(0.7, hexA(th.rim, 0.07)); g.addColorStop(1, hexA(th.rim, 0.16));
    x.fillStyle = g; x.fillRect(0, 0, C.UW, C.UH);
    const rnd = G.gfx.mulberry(th.hue * 31 + 7);
    for (let i = 0; i < 70; i++) { x.fillStyle = 'rgba(255,255,255,' + (0.15 + rnd() * 0.5) + ')'; x.fillRect(rnd() * C.UW, rnd() * C.UH * 0.6, 0.5 + rnd() * 0.7, 0.5 + rnd() * 0.7); }
    /* two layers of towers */
    for (let layer = 0; layer < 2; layer++) {
      let bx = -5;
      while (bx < C.UW) {
        const w = 12 + rnd() * 20, h = (layer ? 36 : 60) + rnd() * (layer ? 40 : 70);
        x.fillStyle = layer ? 'rgba(8,10,30,0.8)' : 'rgba(14,16,42,0.8)'; x.fillRect(bx, C.UH - h, w, h);
        x.strokeStyle = hexA(th.rim, layer ? 0.1 : 0.18); x.lineWidth = 0.4; x.strokeRect(bx, C.UH - h, w, h);
        x.fillStyle = hexA(th.rim, layer ? 0.18 : 0.3);
        for (let wy = C.UH - h + 4; wy < C.UH - 4; wy += 5) for (let wx = bx + 2; wx < bx + w - 2; wx += 4) if (rnd() > 0.55) x.fillRect(wx, wy, 1.6, 1.8);
        bx += w + 1 + rnd() * 3;
      }
    }
    /* steel columns at the sides */
    for (const cx of [3, C.UW - 6]) {
      const cg = x.createLinearGradient(cx, 0, cx + 3, 0); cg.addColorStop(0, 'rgba(30,34,70,0.9)'); cg.addColorStop(0.5, hexA(th.rim, 0.25)); cg.addColorStop(1, 'rgba(20,22,50,0.9)');
      x.fillStyle = cg; x.fillRect(cx, 0, 3, C.UH);
      x.strokeStyle = hexA(th.rim, 0.25); x.lineWidth = 0.4; for (let y = 6; y < C.UH; y += 12) { x.beginPath(); x.moveTo(cx, y); x.lineTo(cx + 3, y + 6); x.stroke(); }
    }
    return c;
  }
  Art.drawBackdrop = function (ctx, st, th, t) {
    const key = th.name;
    if (key !== skyKey) { sky = buildSky(th); skyKey = key; }
    ctx.drawImage(sky, 0, 0, C.UW, C.UH);
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(0, 0, C.UW, C.UH);
    const fg = ctx.createLinearGradient(0, C.UH - 40, 0, C.UH); fg.addColorStop(0, hexA(th.rim, 0)); fg.addColorStop(1, hexA(th.rim, 0.22));
    ctx.fillStyle = fg; ctx.fillRect(0, C.UH - 40, C.UW, 40);
    ctx.strokeStyle = hexA(th.rim, 0.55); ctx.lineWidth = 0.8; ctx.strokeRect(0.4, 0.4, C.UW - 0.8, C.UH - 0.8);
  };

  /* ---------- structure ---------- */
  Art.drawGirder = function (ctx, g, th, t) {
    const x1 = g.x1, x2 = g.x2, T = 7;
    const y1 = g.lift ? g.y : g.y1, y2 = g.lift ? g.y : g.y2;
    const yat = (x) => y1 + (y2 - y1) * ((x - x1) / ((x2 - x1) || 1));
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    /* underglow */
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 + T;
    if (!g.lift) glow(ctx, hexA(th.rim, 1), mx, my, Math.min(110, (x2 - x1) * 0.5 + 24), 0.07);
    /* body */
    const bg = ctx.createLinearGradient(0, Math.min(y1, y2), 0, Math.max(y1, y2) + T);
    bg.addColorStop(0, '#3a1a3c'); bg.addColorStop(0.35, '#1c0c24'); bg.addColorStop(1, '#0c0614');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 + T); ctx.lineTo(x1, y1 + T); ctx.closePath(); ctx.fill();
    /* truss */
    ctx.strokeStyle = hexA(th.rim, 0.5); ctx.lineWidth = 0.6;
    ctx.beginPath();
    for (let x = x1; x < x2 - 2; x += 7) {
      const bx = Math.min(x2, x + 7);
      ctx.moveTo(x, yat(x) + 1); ctx.lineTo(bx, yat(bx) + T - 1); ctx.moveTo(x, yat(x) + T - 1); ctx.lineTo(bx, yat(bx) + 1);
    }
    ctx.stroke();
    ctx.strokeStyle = hexA(th.rim, 0.28); ctx.lineWidth = 0.5; ctx.beginPath();
    for (let x = x1; x <= x2; x += 7) { ctx.moveTo(x, yat(x) + 0.5); ctx.lineTo(x, yat(x) + T - 0.5); } ctx.stroke();
    /* the walking surface: a bright plate with highlight dashes */
    const col = g.kind === 'belt' ? '#ffd24a' : g.kind === 'lift' ? '#7dffb0' : th.rim;
    ctx.strokeStyle = hexA(col, 0.35); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x1, y1 + 0.5); ctx.lineTo(x2, y2 + 0.5); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.45; ctx.beginPath();
    for (let x = x1 + 3; x < x2 - 4; x += 14) { ctx.moveTo(x, yat(x) - 0.2); ctx.lineTo(x + 5, yat(x + 5) - 0.2); } ctx.stroke();
    ctx.strokeStyle = hexA(col, 0.55); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x1, y1 + T); ctx.lineTo(x2, y2 + T); ctx.stroke();
    /* rivet heads along the face */
    ctx.fillStyle = hexA(col, 0.85);
    for (let x = x1 + 4; x < x2 - 2; x += 14) { ctx.beginPath(); ctx.arc(x, yat(x) + 3.5, 0.7, 0, TAU); ctx.fill(); }
    /* end caps */
    ctx.fillStyle = '#1c0c24'; ctx.strokeStyle = col; ctx.lineWidth = 0.7;
    for (const ex of [x1, x2]) { const ey = yat(ex); rr(ctx, ex - 1.4, ey - 0.6, 2.8, T + 1.2, 1); ctx.fill(); ctx.stroke(); }
    if (g.kind === 'belt') {                                                      /* rollers and moving chevrons */
      ctx.strokeStyle = 'rgba(255,210,74,0.85)'; ctx.lineWidth = 0.8; const off = ((t * g.v) % 8 + 8) % 8, s = Math.sign(g.v);
      ctx.beginPath(); for (let x = x1 + 3 + off; x < x2 - 4; x += 8) { ctx.moveTo(x - 1.6 * s, y1 + 1.2); ctx.lineTo(x, y1 + 3.5); ctx.lineTo(x - 1.6 * s, y1 + 5.8); } ctx.stroke();
      for (const ex of [x1, x2]) {
        ctx.fillStyle = '#2a1a08'; ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ex, y1 + 3.5, 4.2, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(ex, y1 + 3.5); ctx.rotate(t * g.v * 0.3); ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 0.7; ctx.beginPath(); for (let k = 0; k < 3; k++) { const a = k * TAU / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * 3.4, Math.sin(a) * 3.4); } ctx.stroke(); ctx.restore();
      }
    }
    if (g.lift) {
      const cx = (x1 + x2) / 2;
      glow(ctx, 'rgba(125,255,176,1)', cx, y1, 18, 0.4);
      ctx.strokeStyle = 'rgba(125,255,176,0.9)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(cx - 3, y1 + 5.4); ctx.lineTo(cx, y1 + 2.4); ctx.lineTo(cx + 3, y1 + 5.4); ctx.stroke();
      /* a thruster flicker underneath */
      ctx.fillStyle = 'rgba(160,255,200,' + (0.4 + 0.3 * Math.sin(t * 30 + cx)) + ')'; ctx.beginPath(); ctx.moveTo(cx - 3, y1 + T); ctx.lineTo(cx, y1 + T + 5 + 2 * Math.sin(t * 25)); ctx.lineTo(cx + 3, y1 + T); ctx.fill();
    }
    ctx.restore();
  };

  Art.drawLadder = function (ctx, L, th) {
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(126,232,255,0.22)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L.x - 3, L.yt); ctx.lineTo(L.x - 3, L.yb); ctx.moveTo(L.x + 3, L.yt); ctx.lineTo(L.x + 3, L.yb); ctx.stroke();
    ctx.strokeStyle = '#9af0ff'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(L.x - 3, L.yt); ctx.lineTo(L.x - 3, L.yb); ctx.moveTo(L.x + 3, L.yt); ctx.lineTo(L.x + 3, L.yb); ctx.stroke();
    ctx.strokeStyle = '#7ee8ff'; ctx.lineWidth = 0.9;
    ctx.beginPath(); for (let y = L.yt + 2; y < L.yb; y += 4) { ctx.moveTo(L.x - 3, y); ctx.lineTo(L.x + 3, y); } ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.4;
    ctx.beginPath(); ctx.moveTo(L.x - 3.3, L.yt); ctx.lineTo(L.x - 3.3, L.yb); ctx.stroke();
    ctx.restore();
  };
  Art.drawRivet = function (ctx, r, t) {
    const y = r.g.at(r.x) - 2.5;
    glow(ctx, 'rgba(255,215,90,1)', r.x, y, 12, 0.6 + 0.25 * Math.sin(t * 6));
    const g = ctx.createRadialGradient(r.x - 0.8, y - 0.8, 0.3, r.x, y, 3.2); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.6, '#ffd24a'); g.addColorStop(1, '#a06a10');
    ctx.fillStyle = g; ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 0.4; ctx.beginPath(); ctx.arc(r.x, y, 3, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(t * 7)) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(r.x - 4.5, y); ctx.lineTo(r.x + 4.5, y); ctx.moveTo(r.x, y - 4.5); ctx.lineTo(r.x, y + 4.5); ctx.stroke();
  };
  Art.drawDrum = function (ctx, d, t) {
    const y = d.g.at(d.x);
    ctx.save(); ctx.translate(d.x, y);
    const gr = ctx.createLinearGradient(-7, 0, 7, 0); gr.addColorStop(0, '#0e2060'); gr.addColorStop(0.45, '#2a56c8'); gr.addColorStop(1, '#0a1850');
    ctx.fillStyle = gr; ctx.strokeStyle = '#7ee8ff'; ctx.lineWidth = 0.9;
    rr(ctx, -7, -16, 14, 16, 1.5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#9af0ff'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-7, -11); ctx.lineTo(7, -11); ctx.moveTo(-7, -5); ctx.lineTo(7, -5); ctx.stroke();
    ctx.fillStyle = '#e8f4ff'; ctx.font = '800 4px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('OIL', 0, -7);
    glow(ctx, 'rgba(255,140,40,1)', 0, -21, 22, 0.7);
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#ff4a1f', '#ff8a2a', '#ffe27a'][layer];
      for (let i = 0; i < 3; i++) { const fx = -4 + i * 4, h = (6 - layer * 1.6) + 3.4 * Math.abs(Math.sin(t * (9 + layer * 2) + i * 2)); ctx.beginPath(); ctx.moveTo(fx - 2.4 + layer * 0.6, -16); ctx.quadraticCurveTo(fx + Math.sin(t * 11 + i) * 0.8, -16 - h, fx + 2.4 - layer * 0.6, -16); ctx.fill(); }
    }
    ctx.restore();
  };

  /* ---------- characters ---------- */
  Art.drawPrincess = function (ctx, pr, t, happy) {
    const y = pr.g.at(pr.x);
    ctx.save(); ctx.translate(pr.x, y);
    glow(ctx, 'rgba(255,140,210,1)', 0, -8, 26, 0.55 + 0.15 * Math.sin(t * 3));
    const wave = Math.sin(t * 6), sway = Math.sin(t * 2.2);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    /* hair behind */
    ctx.fillStyle = '#7a3dff'; ctx.beginPath(); ctx.moveTo(-3.6, -14); ctx.quadraticCurveTo(-6.5 - sway, -8, -4.4 - sway * 1.5, -3.5); ctx.lineTo(-1.5, -9); ctx.closePath(); ctx.fill();
    /* gown */
    const gg = ctx.createLinearGradient(0, -10, 0, 0); gg.addColorStop(0, '#ff9ae0'); gg.addColorStop(1, '#c43aa0');
    ctx.fillStyle = gg; ctx.strokeStyle = '#ffd0f0'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-2.4, -9.5); ctx.lineTo(2.4, -9.5); ctx.quadraticCurveTo(4, -4, 6, 0); ctx.lineTo(-6, 0); ctx.quadraticCurveTo(-4, -4, -2.4, -9.5); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(-5, -1); ctx.quadraticCurveTo(0, -3 + sway * 0.4, 5, -1); ctx.stroke();
    /* arms */
    ctx.strokeStyle = '#ffe8d8'; ctx.lineWidth = 1.2; const aw = happy ? 3.2 : 1.6;
    ctx.beginPath(); ctx.moveTo(-2, -8.6); ctx.lineTo(-5.4, -12.4 - wave * aw); ctx.moveTo(2, -8.6); ctx.lineTo(5.4, -12.4 + wave * aw); ctx.stroke();
    /* head, face, hair, little crown */
    ctx.fillStyle = '#ffe8d0'; ctx.beginPath(); ctx.arc(0, -12, 3, 0, TAU); ctx.fill();
    ctx.fillStyle = '#7a3dff'; ctx.beginPath(); ctx.arc(0, -13, 3.5, Math.PI * 1.05, TAU * 0.98); ctx.fill();
    ctx.fillStyle = '#10142a'; ctx.fillRect(-1.5, -12.3, 0.8, 0.9); ctx.fillRect(0.8, -12.3, 0.8, 0.9);
    ctx.fillStyle = '#ff7a9a'; ctx.fillRect(-0.7, -10.7, 1.4, 0.5);
    ctx.fillStyle = '#ffe45a'; ctx.beginPath(); ctx.moveTo(-2, -16); ctx.lineTo(-1, -17.6); ctx.lineTo(0, -16.3); ctx.lineTo(1, -17.6); ctx.lineTo(2, -16); ctx.closePath(); ctx.fill();
    if (!happy && Math.floor(t * 0.8) % 3 === 0) {
      ctx.fillStyle = 'rgba(8,12,34,0.85)'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.4; rr(ctx, -9, -26.5, 18, 6.5, 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = '800 4.6px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('HELP!', 0, -21.8);
    }
    if (happy) { ctx.fillStyle = '#ff7ad9'; for (let i = 0; i < 4; i++) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 5 + i); ctx.fillText('♥', -9 + i * 6, -20 - ((t * 12 + i * 5) % 12)); } ctx.globalAlpha = 1; }
    ctx.restore();
  };

  Art.drawKong = function (ctx, dk, t, phase, collapse) {
    const y = dk.g.at(dk.x);
    ctx.save(); ctx.translate(dk.x, y);
    if (phase === 'collapse' || phase === 'victory') { ctx.translate(0, collapse * collapse * 40); ctx.rotate(Math.min(1.2, collapse * 0.6)); }
    const a = dk.anim || 0, beat = Math.sin(a * 5), breathe = 1 + 0.018 * Math.sin(a * 2.4), thr = dk.throwing > 0 ? 1 : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    glow(ctx, 'rgba(255,80,140,1)', 0, -18, 46, 0.32);
    /* ground shadow */
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(0, 0.6, 20, 2.4, 0, 0, TAU); ctx.fill();
    ctx.scale(1, breathe);
    const fur = (x, y, rx, ry, rot) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, TAU); };
    const furG = ctx.createLinearGradient(0, -36, 0, -2); furG.addColorStop(0, '#7a3a8c'); furG.addColorStop(0.5, '#4a2058'); furG.addColorStop(1, '#241030');
    ctx.strokeStyle = '#ff8ab8'; ctx.lineWidth = 0.8;
    /* legs and feet */
    ctx.fillStyle = '#241030'; fur(-8, -4, 6.5, 4.4); ctx.fill(); ctx.stroke(); fur(8, -4, 6.5, 4.4); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#c47a8a'; ctx.lineWidth = 0.6; for (const fx of [-8, 8]) for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(fx + k * 2.6 + 2, -2.2); ctx.lineTo(fx + k * 2.6 + 2, 0); ctx.stroke(); }
    /* torso */
    ctx.fillStyle = furG; ctx.strokeStyle = '#ff8ab8'; ctx.lineWidth = 0.9; fur(0, -17, 16, 14); ctx.fill(); ctx.stroke();
    /* fur tufts on the outline */
    ctx.strokeStyle = 'rgba(255,138,184,0.6)'; ctx.lineWidth = 0.6; ctx.beginPath();
    for (let k = 0; k < 14; k++) { const ang = Math.PI * 0.95 + k * (Math.PI * 1.1 / 13), px = Math.cos(ang) * 16, py = -17 + Math.sin(ang) * 14; ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(ang) * 2.4, py + Math.sin(ang) * 2.4 - 0.4); }
    ctx.stroke();
    /* chest plate with a glowing core */
    const cg = ctx.createRadialGradient(0, -15, 1, 0, -14, 10); cg.addColorStop(0, '#e8a8b8'); cg.addColorStop(1, '#8a4a68');
    ctx.fillStyle = cg; ctx.strokeStyle = '#ffb0c8'; ctx.lineWidth = 0.6; fur(0, -14, 9.4, 8.2); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(80,20,50,0.7)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(0, -8); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(-4, -11, 0, -12); ctx.moveTo(8, -14); ctx.quadraticCurveTo(4, -11, 0, -12); ctx.stroke();
    glow(ctx, 'rgba(255,90,140,1)', 0, -14, 9, 0.5 + 0.3 * Math.sin(a * 4));
    ctx.fillStyle = '#ff6a9a'; ctx.beginPath(); ctx.arc(0, -14, 1.7, 0, TAU); ctx.fill();
    /* arms */
    const arm = (side, up) => {
      ctx.save(); ctx.scale(side, 1);
      ctx.fillStyle = '#4a2058'; ctx.strokeStyle = '#ff8ab8'; ctx.lineWidth = 0.9;
      if (up) { ctx.beginPath(); ctx.moveTo(12, -24); ctx.quadraticCurveTo(24, -36, 15, -42); ctx.lineTo(19, -43); ctx.quadraticCurveTo(28, -34, 17, -20); ctx.closePath(); ctx.fill(); ctx.stroke(); fur(17, -43, 3.6, 3.2); ctx.fill(); ctx.stroke(); }
      else { const sw = beat * (side > 0 ? 1 : -1); ctx.beginPath(); ctx.moveTo(12, -24); ctx.quadraticCurveTo(25, -16 + sw * 2, 22, -3); ctx.lineTo(16.5, -3); ctx.quadraticCurveTo(18, -13, 9, -17); ctx.closePath(); ctx.fill(); ctx.stroke(); fur(19.5, -2.5, 4, 3.4); ctx.fill(); ctx.stroke(); }
      ctx.restore();
    };
    arm(-1, false); arm(1, thr);
    if (thr) {                                                                     /* the drum held overhead */
      ctx.save(); ctx.translate(17, -50); ctx.fillStyle = '#ff9a3d'; ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 0.8; rr(ctx, -6.5, -5.5, 13, 11, 2); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#7a3a10'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6.5, -1.5); ctx.lineTo(6.5, -1.5); ctx.moveTo(-6.5, 2.2); ctx.lineTo(6.5, 2.2); ctx.stroke(); ctx.restore();
    }
    /* head */
    ctx.fillStyle = furG; ctx.strokeStyle = '#ff8ab8'; ctx.lineWidth = 0.9; fur(0, -32, 11, 9.4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c47a8a'; fur(0, -29.4, 7.4, 5.8); ctx.fill();
    ctx.fillStyle = '#241030'; ctx.beginPath(); ctx.moveTo(-10, -36); ctx.lineTo(0, -32.4); ctx.lineTo(10, -36); ctx.lineTo(9, -39); ctx.quadraticCurveTo(0, -41, -9, -39); ctx.closePath(); ctx.fill();
    /* glowing eyes under a heavy brow, nostrils, jaw */
    glow(ctx, 'rgba(255,50,80,1)', -3.8, -33.4, 8, 0.7); glow(ctx, 'rgba(255,50,80,1)', 3.8, -33.4, 8, 0.7);
    ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(-3.8, -33.4, 1.8, 0, TAU); ctx.arc(3.8, -33.4, 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(-4.4, -34, 0.9, 0.9); ctx.fillRect(3.2, -34, 0.9, 0.9);
    ctx.fillStyle = '#5a2a3a'; ctx.fillRect(-2.4, -30.6, 1, 1.2); ctx.fillRect(1.4, -30.6, 1, 1.2);
    ctx.fillStyle = '#10142a'; ctx.beginPath(); ctx.ellipse(0, -26.2, 4.8, thr ? 3 : 1.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff'; for (let k = -2; k <= 2; k++) ctx.fillRect(k * 1.7 - 0.5, thr ? -28.2 : -27.4, 1, thr ? 1.5 : 1.1);
    ctx.restore();
  };

  /* ---------- the climber ---------- */
  Art.drawClimber = function (ctx, p, t, phase) {
    if (p.dead) {                                                                   /* spinning away */
      ctx.save(); ctx.translate(p.x, p.y - 7); ctx.rotate(t * 14); ctx.scale(0.9, 0.9); ctx.translate(0, 7); body(ctx, p, t, 'air'); ctx.restore(); return;
    }
    if (p.inv > 0 && Math.floor(t * 14) % 2 && phase !== 'ready') return;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 0.4, 4.6, 1, 0, 0, TAU); ctx.fill();
    ctx.scale(p.face, 1);
    body(ctx, p, t, p.state);
    ctx.restore();
  };
  function body(ctx, p, t, state) {
    const run = state === 'ground' && p.moving ? Math.sin(p.anim * 16) : 0, climbing = state === 'ladder';
    const cl = climbing ? (p.moving ? Math.sin(p.anim * 14) : 0) : 0, bob = state === 'ground' && p.moving ? Math.abs(Math.sin(p.anim * 16)) * 0.5 : 0;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (p.hammer > 0) glow(ctx, 'rgba(255,230,90,1)', 0, -8, 26, 0.55); else glow(ctx, 'rgba(126,232,255,1)', 0, -7, 18, 0.32);
    ctx.save(); ctx.translate(0, -bob);
    /* jetpack with a flame when airborne */
    ctx.fillStyle = '#3a5a8a'; ctx.strokeStyle = '#9ac8ff'; ctx.lineWidth = 0.4; rr(ctx, -5.6, -11.4, 3, 7, 1); ctx.fill(); ctx.stroke();
    if (state === 'air' && p.vy < 40) { const fl = 2 + Math.random() * 2; ctx.fillStyle = 'rgba(255,200,90,0.9)'; ctx.beginPath(); ctx.moveTo(-5.2, -4.4); ctx.lineTo(-4.1, -4.4 + fl + 1); ctx.lineTo(-3, -4.4); ctx.fill(); glow(ctx, 'rgba(255,170,60,1)', -4.1, -3, 7, 0.5); }
    /* legs and boots */
    ctx.strokeStyle = '#3a78b0'; ctx.lineWidth = 2.3;
    if (state === 'air') { ctx.beginPath(); ctx.moveTo(-1.5, -4.5); ctx.lineTo(-4.2, -1.2); ctx.moveTo(1.5, -4.5); ctx.lineTo(4.5, -2.8); ctx.stroke(); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-4.4, -1); ctx.lineTo(-3.2, -0.8); ctx.moveTo(4.2, -2.6); ctx.lineTo(5.6, -2.2); ctx.stroke(); }
    else if (climbing) { ctx.beginPath(); ctx.moveTo(-1.5, -4.5); ctx.lineTo(-2 + cl * 1.5, -0.5 - cl); ctx.moveTo(1.5, -4.5); ctx.lineTo(2 - cl * 1.5, -0.5 + cl); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(-1.5, -4.5); ctx.lineTo(-1.5 - run * 2.6, -0.4); ctx.moveTo(1.5, -4.5); ctx.lineTo(1.5 + run * 2.6, -0.4); ctx.stroke(); ctx.strokeStyle = '#ffd24a'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-1.5 - run * 2.6, -0.2); ctx.lineTo(-0.2 - run * 2.6, -0.2); ctx.moveTo(1.5 + run * 2.6, -0.2); ctx.lineTo(2.8 + run * 2.6, -0.2); ctx.stroke(); }
    /* torso */
    const tg = ctx.createLinearGradient(-3, -12, 3, -4); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#8aaed0');
    ctx.fillStyle = tg; ctx.strokeStyle = '#7ee8ff'; ctx.lineWidth = 0.55; rr(ctx, -3.1, -11.6, 6.2, 7.6, 1.7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(-1.3, -9.4, 2.6, 1.5);
    ctx.fillStyle = Math.floor(t * 3) % 2 ? '#7dffb0' : '#2a6a4a'; ctx.fillRect(-1.3, -7.3, 1, 0.9); ctx.fillStyle = '#7ee8ff'; ctx.fillRect(0.4, -7.3, 1, 0.9);
    /* arms */
    ctx.strokeStyle = '#e8f4ff'; ctx.lineWidth = 1.9;
    if (p.hammer > 0) {
      const s = Math.sin(p.swing);
      ctx.beginPath(); ctx.moveTo(1, -9.8); ctx.lineTo(4.5, -10.2 - s * 2); ctx.stroke();
      ctx.save(); ctx.translate(4.5, -10.2 - s * 2); ctx.rotate(-0.6 + s * 1.1);
      ctx.strokeStyle = '#b08a50'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke();
      const hg = ctx.createLinearGradient(-4, -13, 4, -8); hg.addColorStop(0, '#fff6c8'); hg.addColorStop(1, '#e0a020');
      ctx.fillStyle = hg; ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 0.5; rr(ctx, -4.2, -13.2, 8.4, 5.2, 0.8); ctx.fill(); ctx.stroke();
      glow(ctx, 'rgba(255,230,90,1)', 0, -10.5, 10, 0.5);
      ctx.restore();
    } else if (climbing) { ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(-3 - cl, -14 + cl); ctx.moveTo(2, -10); ctx.lineTo(3 + cl, -14 - cl); ctx.stroke(); }
    else if (state === 'air') { ctx.beginPath(); ctx.moveTo(1, -10); ctx.lineTo(4.8, -13.6); ctx.moveTo(-1, -10); ctx.lineTo(-3.6, -13.4); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(1, -10); ctx.lineTo(3 + run * 1.4, -7); ctx.moveTo(-1, -10); ctx.lineTo(-3 - run * 1.4, -7); ctx.stroke(); }
    /* helmet with a glossy visor and an antenna */
    ctx.strokeStyle = '#9ac8ff'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-1, -18); ctx.lineTo(-2, -21); ctx.stroke(); ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.arc(-2, -21.2, 0.8, 0, TAU); ctx.fill();
    const hg2 = ctx.createRadialGradient(-1, -16, 0.5, 0.4, -14.2, 4.4); hg2.addColorStop(0, '#ffffff'); hg2.addColorStop(1, '#bcd4ee');
    ctx.fillStyle = hg2; ctx.strokeStyle = '#7ee8ff'; ctx.lineWidth = 0.55; ctx.beginPath(); ctx.arc(0.4, -14.2, 4, 0, TAU); ctx.fill(); ctx.stroke();
    const vg = ctx.createLinearGradient(0, -16, 4, -12); vg.addColorStop(0, '#2a78c8'); vg.addColorStop(1, '#0a2050');
    ctx.fillStyle = vg; ctx.beginPath(); ctx.ellipse(1.9, -14.2, 2.5, 2.1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.ellipse(1.2, -15, 1.1, 0.6, -0.4, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------- hazards and pickups ---------- */
  Art.drawBarrel = function (ctx, b, t) {
    ctx.save(); ctx.translate(b.x, b.y);
    glow(ctx, 'rgba(255,150,50,1)', 0, 0, 13, 0.4);
    ctx.rotate(b.rot);
    const gr = ctx.createRadialGradient(-1.5, -1.5, 0.5, 0, 0, 5.4); gr.addColorStop(0, '#ffcf80'); gr.addColorStop(0.6, '#ff9a3d'); gr.addColorStop(1, '#a04a10');
    ctx.fillStyle = gr; ctx.strokeStyle = '#ffe0a0'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7a3a10'; ctx.lineWidth = 0.6; ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = k * TAU / 8; ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5); ctx.lineTo(-Math.cos(a) * 5, -Math.sin(a) * 5); } ctx.stroke();
    ctx.strokeStyle = '#d8d8f0'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, 0, 3.4, 0, TAU); ctx.stroke();
    ctx.fillStyle = '#ffe9b0'; ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.fill();
    ctx.restore();
  };
  Art.drawFire = function (ctx, f, t) {
    ctx.save(); ctx.translate(f.x, f.y);
    const cold = f.frozen > 0;
    glow(ctx, cold ? 'rgba(130,200,255,1)' : 'rgba(255,100,40,1)', 0, 0, 20, 0.65);
    const s = 1 + 0.12 * Math.sin(t * 14 + f.t);
    ctx.scale(s, 1 / s * (1 + 0.1 * Math.sin(t * 9 + f.t * 2)));
    const layers = cold ? ['#5aa8e8', '#9ad0ff', '#e0f4ff'] : ['#d02a10', '#ff5a1f', '#ffb347'];
    ctx.fillStyle = layers[0]; ctx.beginPath(); ctx.moveTo(0, -10); ctx.quadraticCurveTo(8, -3, 5.6, 3); ctx.quadraticCurveTo(0, 7.4, -5.6, 3); ctx.quadraticCurveTo(-8, -3, 0, -10); ctx.fill();
    ctx.fillStyle = layers[1]; ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(6, -2, 4.4, 3); ctx.quadraticCurveTo(0, 6, -4.4, 3); ctx.quadraticCurveTo(-6, -2, 0, -7); ctx.fill();
    ctx.fillStyle = layers[2]; ctx.beginPath(); ctx.moveTo(0, -3); ctx.quadraticCurveTo(3.4, 0, 2.4, 3); ctx.quadraticCurveTo(0, 4.6, -2.4, 3); ctx.quadraticCurveTo(-3.4, 0, 0, -3); ctx.fill();
    /* flickering side tongues */
    ctx.fillStyle = layers[0]; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sd * 4.6, 0); ctx.quadraticCurveTo(sd * 7.6, -5 + Math.sin(t * 18 + sd) * 1.5, sd * 5.8, -8 + Math.sin(t * 15 + sd * 2) * 1.5); ctx.quadraticCurveTo(sd * 4.6, -4, sd * 3.2, -2); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.fillRect(-2.8 + f.dir * 0.7, -1.4, 1.7, 2.2); ctx.fillRect(1 + f.dir * 0.7, -1.4, 1.7, 2.2);
    ctx.fillStyle = '#10142a'; ctx.fillRect(-2.3 + f.dir * 1.1, -0.8, 0.8, 1.4); ctx.fillRect(1.5 + f.dir * 1.1, -0.8, 0.8, 1.4);
    ctx.restore();
  };
  Art.drawPie = function (ctx, pi, t) {
    ctx.save(); ctx.translate(pi.x, pi.y);
    glow(ctx, 'rgba(255,120,200,1)', 0, -1, 12, 0.35);
    const tg = ctx.createLinearGradient(0, -1, 0, 3); tg.addColorStop(0, '#f0f0ff'); tg.addColorStop(1, '#8a8aa8');
    ctx.fillStyle = tg; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.ellipse(0, 1.4, 7.6, 2.4, 0, 0, TAU); ctx.fill(); ctx.stroke();
    const pg = ctx.createLinearGradient(0, -5, 0, 1); pg.addColorStop(0, '#ff9ae0'); pg.addColorStop(1, '#d83ea8');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.moveTo(-6, 0.8); ctx.quadraticCurveTo(-4.4, -5.6, 0, -5); ctx.quadraticCurveTo(4.4, -5.6, 6, 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff0f8'; ctx.beginPath(); ctx.arc(-1.8, -3, 1, 0, TAU); ctx.arc(2.2, -2, 0.8, 0, TAU); ctx.arc(0, -4.4, 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(0, -5.4, 0.9, 0, TAU); ctx.fill();
    ctx.restore();
  };
  Art.drawSpring = function (ctx, sp, t) {
    ctx.save(); ctx.translate(sp.x, sp.y);
    glow(ctx, 'rgba(125,255,176,1)', 0, 0, 14, 0.45);
    const sq = U.clamp(1 - Math.abs(sp.vy) / 400, 0.55, 1), h = 8 * sq;
    ctx.strokeStyle = 'rgba(125,255,176,0.35)'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(-4, 4); for (let i = 0; i < 6; i++) ctx.lineTo(i % 2 ? 4 : -4, 4 - h * (i + 1) / 6 * 1.4); ctx.stroke();
    ctx.strokeStyle = '#7dffb0'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-4, 4); for (let i = 0; i < 6; i++) ctx.lineTo(i % 2 ? 4 : -4, 4 - h * (i + 1) / 6 * 1.4); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-5.2, 4.4); ctx.lineTo(5.2, 4.4); ctx.moveTo(-5.2, 4 - h * 1.4 - 0.4); ctx.lineTo(5.2, 4 - h * 1.4 - 0.4); ctx.stroke();
    ctx.restore();
  };
  Art.drawHammerItem = function (ctx, h, t) {
    ctx.save(); ctx.translate(h.x, h.y);
    glow(ctx, 'rgba(255,230,90,1)', 0, -7, 18, 0.55 + 0.2 * Math.sin(t * 6));
    ctx.rotate(Math.sin(t * 3) * 0.12);
    ctx.strokeStyle = '#b08a50'; ctx.lineWidth = 1.3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -9); ctx.stroke();
    const hg = ctx.createLinearGradient(-4, -13, 4, -8); hg.addColorStop(0, '#fff6c8'); hg.addColorStop(1, '#e0a020');
    ctx.fillStyle = hg; ctx.strokeStyle = '#fff6c8'; ctx.lineWidth = 0.5; rr(ctx, -4.4, -13.4, 8.8, 5.4, 0.9); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.4 + 0.4 * Math.sin(t * 8)) + ')'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-7, -14); ctx.lineTo(-5, -12); ctx.moveTo(-6, -15.5); ctx.lineTo(-6, -11.5); ctx.stroke();
    ctx.restore();
  };
  Art.drawItem = function (ctx, it, t) {
    ctx.save(); ctx.translate(it.x, it.y);
    const col = it.type === 'hat' ? '#7ee8ff' : it.type === 'purse' ? '#ff7ad9' : '#ffd24a';
    glow(ctx, hexA(col, 1), 0, -5, 15, 0.5 + 0.15 * Math.sin(t * 5 + it.x));
    ctx.translate(0, Math.sin(t * 3 + it.x) * 0.6);
    const g = ctx.createLinearGradient(0, -12, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, col); g.addColorStop(1, hexA(col, 0.6));
    ctx.fillStyle = g; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5; ctx.lineJoin = 'round';
    if (it.type === 'hat') { ctx.beginPath(); ctx.arc(0, -4, 4.8, Math.PI, TAU); ctx.lineTo(6.8, -4); ctx.lineTo(-6.8, -4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.ellipse(-1.5, -6.6, 1.6, 0.8, -0.5, 0, TAU); ctx.fill(); }
    else if (it.type === 'purse') { rr(ctx, -4.8, -6.4, 9.6, 6.4, 1.2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(0, -6.4, 2.8, Math.PI, TAU); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fillRect(-0.8, -4.6, 1.6, 1.4); }
    else { ctx.beginPath(); ctx.moveTo(-6.4, -6); ctx.quadraticCurveTo(0, -14, 6.4, -6); ctx.quadraticCurveTo(3, -7.6, 0, -6); ctx.quadraticCurveTo(-3, -7.6, -6.4, -6); ctx.fill(); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(0, -9.6); ctx.lineTo(0, -0.5); ctx.stroke(); }
    ctx.restore();
  };

  G.art = Art;
})((window.SGS = window.SGS || {}));
