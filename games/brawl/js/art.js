/* Pencil-on-paper drawing: paper texture, the sketched backdrop, stick figures (posed from joint angles), props, weapons and items. All lines are steady - no wobble. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, D = U.DEG;
  const A = {};
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };
  const FONT = '"Segoe Print","Bradley Hand","Chalkboard SE","Comic Sans MS","Marker Felt",cursive';
  A.FONT = FONT;

  /* ---------- pencil line helpers ---------- */
  /* one coloured-pencil stroke: soft wide pass, solid pass, thin dark core offset a hair for the graphite edge */
  A.pencil = function (ctx, pts, col, core, w, alpha) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const a = alpha === undefined ? 1 : alpha;
    const path = (dx, dy) => { ctx.beginPath(); ctx.moveTo(pts[0] + dx, pts[1] + dy); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + dx, pts[i + 1] + dy); ctx.stroke(); };
    ctx.strokeStyle = col; ctx.globalAlpha = 0.4 * a; ctx.lineWidth = w + 1; path(0, 0);
    ctx.globalAlpha = 0.92 * a; ctx.lineWidth = w; path(0, 0);
    ctx.strokeStyle = core; ctx.globalAlpha = 0.5 * a; ctx.lineWidth = Math.max(0.5, w * 0.34); path(0.3, 0.25);
    ctx.globalAlpha = 1;
  };
  /* graphite line (backdrop and hud): grey double stroke */
  A.graphite = function (ctx, pts, w, alpha, col) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const path = (dx, dy) => { ctx.beginPath(); ctx.moveTo(pts[0] + dx, pts[1] + dy); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + dx, pts[i + 1] + dy); ctx.stroke(); };
    ctx.strokeStyle = col || C.INK;
    ctx.globalAlpha = 0.55 * alpha; ctx.lineWidth = w; path(0, 0);
    ctx.globalAlpha = 0.35 * alpha; ctx.lineWidth = w * 0.6; path(0.45, 0.35);
    ctx.globalAlpha = 1;
  };
  /* near-layer walls are filled with (nearly opaque) paper so the far parallax layer does not show through them */
  const _pat = {};
  A.fillPaper = function (ctx, x, y, w, h) {
    const f = A._f || 1;
    if (!_pat[f]) { _pat[f] = ctx.createPattern(A.paperTile(f), 'repeat'); if (_pat[f].setTransform) _pat[f].setTransform(new DOMMatrix([1 / f, 0, 0, 1 / f, 0, 0])); }
    ctx.fillStyle = _pat[f]; ctx.fillRect(x, y, w, h);
  };
  /* a soft vertical colour wash (sky, floor shading) */
  A.wash = function (ctx, x, y, w, h, c0, c1) {
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
  /* darker where the wall meets the floor, then a gentle fall-off toward the bottom of the screen */
  A.groundShade = function (ctx, W) {
    A.wash(ctx, 0, 168, W, 14, 'rgba(70,58,38,0.16)', 'rgba(70,58,38,0)');
    A.wash(ctx, 0, 196, W, 74, 'rgba(70,58,38,0)', 'rgba(70,58,38,0.12)');
  };
  A.contact = function (ctx, cx, y, rx) {
    ctx.save(); ctx.translate(cx, y); ctx.scale(1, 0.28);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, 'rgba(50,42,30,0.28)'); g.addColorStop(1, 'rgba(50,42,30,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.3); ctx.fill(); ctx.restore();
  };
  A.skyWash = function (ctx, w, c) { A.wash(ctx, 0, 0, w, 130, c || 'rgba(110,140,185,0.24)', 'rgba(110,140,185,0)'); };
  A.hatch = function (ctx, x, y, w, h, gap, angle, alpha, col) {
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.strokeStyle = col || C.INK; ctx.globalAlpha = alpha; ctx.lineWidth = 0.7; ctx.lineCap = 'round';
    const dx = Math.cos(angle), dy = Math.sin(angle), len = Math.hypot(w, h), cx = x + w / 2, cy = y + h / 2;
    const nx = -dy, ny = dx;
    ctx.beginPath();
    for (let o = -len; o <= len; o += gap) { ctx.moveTo(cx + nx * o - dx * len, cy + ny * o - dy * len); ctx.lineTo(cx + nx * o + dx * len, cy + ny * o + dy * len); }
    ctx.stroke();
    ctx.restore();
  };

  /* ---------- paper ---------- */
  A.paperTile = function (f) {
    const s = Math.round(200 * f), c = mk(s, s), x = c.getContext('2d'), r = U.rng(7);
    x.fillStyle = C.PAPER; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? 'rgba(120,100,60,' + (0.03 + r() * 0.05) + ')' : 'rgba(255,255,255,' + (0.05 + r() * 0.12) + ')'; const z = (0.6 + r() * 1.4) * f; x.fillRect(r() * s, r() * s, z, z); }
    x.lineWidth = 0.6 * f;
    for (let i = 0; i < 90; i++) { x.strokeStyle = 'rgba(110,90,55,' + (0.04 + r() * 0.05) + ')'; const px = r() * s, py = r() * s, a = r() * 6.28, l = (4 + r() * 10) * f; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
    return c;
  };

  /* ---------- the sketched backdrop (rendered once per scale into two parallax layers) ---------- */
  const INK = '#3f3d37';
  function building(x, bx, by, w, h, r, kind) {
    A.fillPaper(x, bx, by, w, h);
    /* outline */
    A.graphite(x, [bx, by + h, bx, by, bx + w, by, bx + w, by + h], 1.5, 0.95, INK);
    A.hatch(x, bx, by, w, h, 5, 0.9, 0.07);
    A.hatch(x, bx + w - 14, by, 14, h, 3, -0.9, 0.18);                       /* shaded right edge */
    A.graphite(x, [bx - 2, by, bx + w + 2, by], 2, 0.9, INK);
    /* windows */
    const cols = Math.max(2, Math.floor((w - 16) / 26)), rows = Math.max(1, Math.floor((h - 52) / 30));
    const gx = (w - 16) / cols;
    for (let ry = 0; ry < rows; ry++) {
      for (let cx = 0; cx < cols; cx++) {
        const wx = bx + 8 + cx * gx + 4, wy = by + 10 + ry * 30, ww = gx - 8, wh = 20;
        A.fillPaper(x, wx, wy, ww, wh);
        A.graphite(x, [wx, wy, wx + ww, wy, wx + ww, wy + wh, wx, wy + wh, wx, wy], 1.1, 0.85, INK);
        A.graphite(x, [wx + ww / 2, wy, wx + ww / 2, wy + wh], 0.8, 0.6, INK);
        if (r() < 0.45) A.hatch(x, wx, wy, ww, wh, 2.6, 0.7, 0.35);
        else if (r() < 0.25) A.hatch(x, wx, wy, ww / 2, wh, 2.6, -0.7, 0.3);
        A.graphite(x, [wx - 2, wy + wh + 1, wx + ww + 2, wy + wh + 1], 1.2, 0.8, INK);
      }
    }
    /* shop front on the ground floor */
    const sy = by + h - 40;
    if (kind === 'shop') {
      const dw = 26, dx = bx + 18 + r() * (w - 70);
      A.fillPaper(x, dx, sy + 6, dw, by + h - sy - 6);
      A.graphite(x, [dx, by + h, dx, sy + 6, dx + dw, sy + 6, dx + dw, by + h], 1.4, 0.95, INK);
      A.hatch(x, dx + 2, sy + 8, dw - 4, 32, 3, 0.8, 0.28);
      x.fillStyle = INK; x.beginPath(); x.arc(dx + dw - 5, sy + 24, 1.2, 0, 6.3); x.fill();
      const sx0 = bx + 6, sw = Math.max(40, w - dw - 40);
      A.fillPaper(x, sx0, sy, sw, 14);
      A.graphite(x, [sx0, sy, sx0 + sw, sy, sx0 + sw, sy + 14, sx0, sy + 14, sx0, sy], 1.3, 0.9, INK);
      x.fillStyle = INK; x.globalAlpha = 0.8; x.font = '700 10px ' + FONT; x.textBaseline = 'middle';
      x.fillText(U.pick(['PIZZA', 'BAR', 'HOTEL', 'DINER', 'PAWN', 'VIDEO', 'NOODLES', 'LIQUOR']), sx0 + 5, sy + 8); x.globalAlpha = 1;
      for (let i = 0; i < 6; i++) A.graphite(x, [sx0 + i * (sw / 6), sy + 14, sx0 + i * (sw / 6) + sw / 12, sy + 20, sx0 + (i + 1) * (sw / 6), sy + 14], 1, 0.7, INK);
    } else {
      const dx = bx + 14 + r() * (w - 50);
      A.fillPaper(x, dx, sy + 4, 22, by + h - sy - 4);
      A.graphite(x, [dx, by + h, dx, sy + 4, dx + 22, sy + 4, dx + 22, by + h], 1.4, 0.95, INK);
      A.graphite(x, [dx + 11, sy + 4, dx + 11, by + h], 1, 0.7, INK);
      A.hatch(x, dx + 2, sy + 6, 7, 30, 2.6, 0.8, 0.3);
    }
  }
  function lamp(x, px, base) {
    A.contact(x, px, base, 9);
    A.graphite(x, [px, base, px, base - 72, px + 14, base - 78], 1.7, 0.95, INK);
    A.graphite(x, [px + 10, base - 79, px + 22, base - 79, px + 20, base - 74, px + 12, base - 74, px + 10, base - 79], 1.2, 0.9, INK);
    A.hatch(x, px + 11, base - 78, 10, 4, 2, 0.8, 0.5);
    A.graphite(x, [px - 4, base, px + 4, base], 2, 0.9, INK);
  }
  function hydrant(x, px, base) {
    A.contact(x, px, base, 11); A.fillPaper(x, px - 5, base - 16, 10, 16);
    A.graphite(x, [px - 5, base, px - 5, base - 12, px - 3, base - 16, px + 3, base - 16, px + 5, base - 12, px + 5, base], 1.4, 0.95, INK);
    A.graphite(x, [px - 8, base - 9, px + 8, base - 9], 1.4, 0.9, INK);
    A.hatch(x, px - 4, base - 15, 8, 14, 2.4, 0.8, 0.4);
  }
  function crate(x, px, base, s) {
    A.contact(x, px + s / 2, base, s * 0.8); A.fillPaper(x, px, base - s, s, s);
    A.graphite(x, [px, base, px, base - s, px + s, base - s, px + s, base, px, base], 1.5, 0.95, INK);
    A.graphite(x, [px, base - s, px + s, base, px + s, base - s, px, base], 1, 0.7, INK);
    A.hatch(x, px, base - s, s, s, 3, 0.6, 0.12);
  }
  function dumpster(x, px, base) {
    A.contact(x, px + 23, base, 30); A.fillPaper(x, px - 2, base - 30, 50, 30);
    A.graphite(x, [px, base, px + 2, base - 26, px + 44, base - 26, px + 46, base, px, base], 1.6, 0.95, INK);
    A.graphite(x, [px - 2, base - 26, px + 48, base - 26, px + 48, base - 30, px - 2, base - 30, px - 2, base - 26], 1.4, 0.9, INK);
    A.hatch(x, px + 2, base - 24, 42, 24, 3, 0.7, 0.3);
    A.hatch(x, px + 36, base - 24, 10, 24, 2, -0.8, 0.3);
  }
  A.buildBackdrop = function (level, f) {
    A._f = f;
    if (level.theme && A.themes && A.themes[level.theme]) return A.themes[level.theme](level, f);
    const W = level.width, H = C.H, far = mk((W * 0.5 + C.W) * f, H * f), near = mk(W * f, H * f);
    /* far skyline */
    let x = far.getContext('2d'), r = U.rng(level.seed || 3);
    x.scale(f, f);
    A.fillPaper(x, 0, 0, far.width / f, H); A.skyWash(x, far.width / f);
    let px = -10;
    while (px < W * 0.5 + C.W) {
      const w = 40 + r() * 70, h = 40 + r() * 70, by = 168 - h;
      A.fillPaper(x, px, by, w, 168 - by);
      A.graphite(x, [px, 168, px, by, px + w, by, px + w, 168], 1.1, 0.4, INK);
      A.hatch(x, px, by, w, h, 6, 0.9 + r() * 0.3, 0.08);
      for (let wy = by + 8; wy < 150; wy += 14) for (let wx = px + 7; wx < px + w - 8; wx += 12) if (r() < 0.55) A.graphite(x, [wx, wy, wx + 5, wy, wx + 5, wy + 7, wx, wy + 7, wx, wy], 0.8, 0.28, INK);
      if (r() < 0.2) A.graphite(x, [px + w * 0.3, by, px + w * 0.3, by - 14, px + w * 0.3 + 6, by - 14], 1, 0.35, INK);
      px += w + 4 + r() * 6;
    }
    /* near layer */
    x = near.getContext('2d'); r = U.rng((level.seed || 3) + 11);
    x.scale(f, f);
    px = -20;
    const base = 168;
    while (px < W + 20) {
      const w = 130 + r() * 90, h = 100 + r() * 36;
      building(x, px, base - h, w, h, r, r() < 0.65 ? 'shop' : 'door');
      px += w;
    }
    /* sidewalk and street */
    A.graphite(x, [0, base, W, base], 2.2, 1, INK);
    A.hatch(x, 0, base, W, 22, 7, 0.5, 0.07);
    for (let sx = 0; sx < W; sx += 38 + (sx * 7) % 17) A.graphite(x, [sx, base + 2, sx - 6, base + 22], 0.9, 0.35, INK);
    A.graphite(x, [0, base + 24, W, base + 24], 1.8, 0.9, INK);
    A.graphite(x, [0, base + 28, W, base + 28], 1, 0.45, INK);
    A.hatch(x, 0, base + 24, W, 4, 2, 0.8, 0.4);
    /* road marks and grime */
    for (let sx = 20; sx < W; sx += 70) A.graphite(x, [sx, 212, sx + 34, 212], 2, 0.5, INK);
    for (let i = 0; i < W / 60; i++) {
      const cx = r() * W, cy = 190 + r() * 75, n = 3 + Math.floor(r() * 3), pts = [cx, cy];
      let ax = cx, ay = cy;
      for (let k = 0; k < n; k++) { ax += (r() - 0.35) * 16; ay += (r() - 0.5) * 7; pts.push(ax, ay); }
      A.graphite(x, pts, 0.9, 0.3, INK);
    }
    for (let i = 0; i < W / 220; i++) {
      const cx = 60 + r() * (W - 120), cy = 228 + r() * 22;
      x.save(); x.translate(cx, cy); x.scale(1, 0.32); x.strokeStyle = INK; x.globalAlpha = 0.45; x.lineWidth = 1.3; x.beginPath(); x.arc(0, 0, 13, 0, 6.3); x.stroke(); x.beginPath(); x.arc(0, 0, 8, 0, 6.3); x.stroke(); x.restore();
    }
    /* street furniture on the sidewalk */
    for (let sx = 90; sx < W - 40; sx += 150 + r() * 90) {
      const k = r();
      if (k < 0.3) lamp(x, sx, base + 18); else if (k < 0.5) hydrant(x, sx, base + 18); else if (k < 0.75) crate(x, sx, base + 18, 14 + r() * 8); else dumpster(x, sx, base + 20);
    }
    A.groundShade(x, W);
    return { far, near, f };
  };

  /* ---------- stick figure ---------- */
  const TH = 10.5, SH = 10.5, UA = 7.5, FA = 7.5, TORSO = 14, HEADR = 5.4;
  function legExtent(l) { return TH * Math.cos(l[0] * D) + SH * Math.cos((l[0] - l[1]) * D); }
  function head(ctx, hx, hy, look, col, core, f) {
    ctx.fillStyle = C.PAPER; ctx.beginPath(); ctx.arc(hx, hy, HEADR, 0, 6.3); ctx.fill();
    ctx.lineCap = 'round'; ctx.strokeStyle = col; ctx.globalAlpha = 0.4; ctx.lineWidth = 3.1; ctx.beginPath(); ctx.arc(hx, hy, HEADR, 0, 6.3); ctx.stroke();
    ctx.globalAlpha = 0.92; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(hx, hy, HEADR, 0, 6.3); ctx.stroke();
    ctx.strokeStyle = core; ctx.globalAlpha = 0.5; ctx.lineWidth = 0.75; ctx.beginPath(); ctx.arc(hx + 0.3, hy + 0.25, HEADR, 0, 6.3); ctx.stroke();
    ctx.globalAlpha = 1;
    const P = look.props || [];
    const has = (k) => P.indexOf(k) >= 0;
    /* face: eyes and mouth react to what the fighter is doing */
    const st = f.state, strike = f.move && st === 'atk' && f.t >= f.move.s && f.t < f.move.s + f.move.a + 0.08;
    const down = st === 'lie' || st === 'dead' || st === 'fall', pain = st === 'hurt' || st === 'grabbed';
    ctx.fillStyle = C.INK; ctx.strokeStyle = C.INK; ctx.lineWidth = 0.9; ctx.lineCap = 'round';
    const ex = hx + 2.5, ey = hy - 0.4;
    if (!has('mask')) {
      if (down) { ctx.beginPath(); ctx.moveTo(ex - 1.3, ey - 1.3); ctx.lineTo(ex + 1.3, ey + 1.3); ctx.moveTo(ex + 1.3, ey - 1.3); ctx.lineTo(ex - 1.3, ey + 1.3); ctx.stroke(); }
      else if (pain) { ctx.beginPath(); ctx.moveTo(ex - 1.4, ey - 1.4); ctx.lineTo(ex + 0.9, ey); ctx.lineTo(ex - 1.4, ey + 1.4); ctx.stroke(); }
      else { ctx.beginPath(); ctx.arc(ex, ey, 0.9, 0, 6.3); ctx.fill(); }
      if (look.team === 'e' && !down && !pain) { ctx.beginPath(); ctx.moveTo(hx + 0.8, hy - 2.6); ctx.lineTo(hx + 4.2, hy - 1.5); ctx.stroke(); }
    }
    {
      const mx = hx + 2.6, my = hy + 2.7;
      if (pain || st === 'fall') { ctx.beginPath(); ctx.ellipse(mx, my, 1.1, 1.5, 0, 0, 6.3); ctx.stroke(); }
      else if (strike) { ctx.beginPath(); ctx.ellipse(mx, my, 1.5, 1.2, 0, 0, 6.3); ctx.fill(); }
      else if (down) { ctx.beginPath(); ctx.moveTo(mx - 1, my); ctx.lineTo(mx + 1.2, my + 0.3); ctx.stroke(); }
      else if (look.team === 'p') { ctx.beginPath(); ctx.arc(mx, my - 0.8, 1.5, 0.25, 2.9); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(mx - 1.3, my + 0.2); ctx.lineTo(mx + 1.5, my - 0.1); ctx.stroke(); }
    }
    if (has('hair')) { ctx.strokeStyle = core; ctx.lineWidth = 1.5; ctx.lineCap = 'round'; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = (-150 + i * 30) * D; ctx.moveTo(hx + Math.cos(a) * 4.6, hy + Math.sin(a) * 4.6); ctx.lineTo(hx + Math.cos(a) * 8.2 - 0.8, hy + Math.sin(a) * 8.2 - 0.4); } ctx.stroke(); }
    if (has('mask')) {
      ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, HEADR + 0.2, 0, 6.3); ctx.clip();
      ctx.fillStyle = '#1d1c1a'; ctx.fillRect(hx - 7, hy - 3.2, 14, 4.6);
      ctx.fillStyle = '#fff'; ctx.fillRect(hx + 1.6, hy - 1.7, 2.6, 1.1); ctx.fillRect(hx - 2.6, hy - 1.7, 2.2, 1.1);
      ctx.restore();
    }
    if (has('band')) {
      const bc = look.bandCol || '#e8b81f';
      ctx.strokeStyle = bc; ctx.lineWidth = 2.1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx - 5.2, hy - 2.6); ctx.lineTo(hx + 5.3, hy - 3.4); ctx.stroke();
      ctx.strokeStyle = C.INK; ctx.lineWidth = 0.6; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(hx - 5.2, hy - 2.0); ctx.lineTo(hx + 5.3, hy - 2.8); ctx.stroke(); ctx.globalAlpha = 1;
      const sway = Math.sin((f.clock || 0) * 11) * 1.4 + (f.tailV || 0);
      ctx.strokeStyle = bc; ctx.lineWidth = 1.7;
      ctx.beginPath(); ctx.moveTo(hx - 5, hy - 2.6); ctx.quadraticCurveTo(hx - 10, hy - 2 + sway, hx - (has('tails') ? 18 : 12), hy - 0.5 + sway * 1.6 + 1); ctx.stroke();
      if (has('tails')) { ctx.beginPath(); ctx.moveTo(hx - 5, hy - 2.4); ctx.quadraticCurveTo(hx - 11, hy - 3.6 - sway * 0.6, hx - 17, hy - 4 - sway * 1.2); ctx.stroke(); }
    }
    if (has('wrap')) {
      ctx.save(); ctx.beginPath(); ctx.arc(hx, hy, HEADR + 0.2, 0, 6.3); ctx.clip();
      ctx.fillStyle = '#1d1c1a'; ctx.fillRect(hx - 7, hy + 1.3, 14, 6); ctx.restore();
    }
    if (has('mohawk')) {
      ctx.fillStyle = look.hawkCol || '#1d1c1a';
      for (let i = 0; i < 5; i++) { const a = (-150 + i * 30) * D, bx = hx + Math.cos(a) * 4.8, by = hy + Math.sin(a) * 4.8; ctx.beginPath(); ctx.moveTo(bx - 1.6, by + 0.8); ctx.lineTo(hx + Math.cos(a) * 10.5 - 1.2, hy + Math.sin(a) * 10.5 - 0.8); ctx.lineTo(bx + 1.6, by - 0.4); ctx.closePath(); ctx.fill(); }
    }
    if (has('hat')) {
      ctx.fillStyle = '#1d1c1a'; ctx.fillRect(hx - 4.8, hy - 14.5, 9.6, 9); ctx.fillRect(hx - 8, hy - 6, 16, 1.9);
      ctx.fillStyle = look.hatBand || '#c9a227'; ctx.fillRect(hx - 4.8, hy - 8.6, 9.6, 2);
    }
    if (has('scar')) { ctx.strokeStyle = C.INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx + 2, hy + 0.8); ctx.lineTo(hx + 4.6, hy + 3.4); ctx.moveTo(hx + 4.4, hy + 0.9); ctx.lineTo(hx + 2.2, hy + 3.3); ctx.stroke(); }
    if (has('beard')) { ctx.strokeStyle = C.INK; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = 0; i < 5; i++) { ctx.moveTo(hx + 1 + i * 0.9, hy + 4.2); ctx.lineTo(hx + 2 + i * 1.1, hy + 7.2); } ctx.stroke(); }
    if (has('hardhat')) { ctx.fillStyle = '#e8b81f'; ctx.strokeStyle = C.INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(hx, hy - 1.2, HEADR + 0.9, 3.14, 6.28); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillRect(hx - 1.2, hy - HEADR - 1.2, 2.4, 2.6); ctx.beginPath(); ctx.moveTo(hx - 7, hy - 1); ctx.lineTo(hx + 8, hy - 1); ctx.lineWidth = 1.6; ctx.stroke(); }
    if (has('cap')) { ctx.fillStyle = '#f4f1e6'; ctx.strokeStyle = C.INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(hx, hy - 1.6, HEADR + 0.7, 3.14, 6.28); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#1d1c1a'; ctx.fillRect(hx - HEADR - 0.7, hy - 2.4, HEADR * 2 + 1.4, 1.7); ctx.fillRect(hx + 1, hy - 2.4, 6.5, 1.1); }
    if (has('bowler')) { ctx.fillStyle = '#1d1c1a'; ctx.beginPath(); ctx.arc(hx, hy - 2.2, HEADR - 0.4, 3.14, 6.28); ctx.closePath(); ctx.fill(); ctx.fillRect(hx - 8, hy - 2.6, 16, 1.6); }
    if (has('crown')) { ctx.fillStyle = '#d9b21f'; ctx.strokeStyle = C.INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(hx - 5, hy - 5); ctx.lineTo(hx - 5.6, hy - 11); ctx.lineTo(hx - 2.4, hy - 8); ctx.lineTo(hx, hy - 12.4); ctx.lineTo(hx + 2.4, hy - 8); ctx.lineTo(hx + 5.6, hy - 11); ctx.lineTo(hx + 5, hy - 5); ctx.closePath(); ctx.fill(); ctx.stroke(); }
    if (has('shades')) { ctx.fillStyle = '#1d1c1a'; ctx.fillRect(hx - 0.6, hy - 2.6, 6.2, 2.6); ctx.fillRect(hx - 5.4, hy - 2.2, 5, 0.9); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(hx + 0.6, hy - 2, 1.5, 0.8); }
  }

  /* ---------- weapons, crates, barrels and drums ---------- */
  const OL = '#3a210c';
  function nStick(ctx, x0, y0, x1, y1, wood, dark) {
    ctx.lineCap = 'round';
    ctx.strokeStyle = OL; ctx.lineWidth = 3.9; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = wood; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    ctx.strokeStyle = dark; ctx.globalAlpha = 0.55; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x0 - nx * 0.7, y0 - ny * 0.7); ctx.lineTo(x1 - nx * 0.7, y1 - ny * 0.7); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#1d1c1a'; ctx.lineWidth = 0.8;                                  /* grip wraps */
    for (let k = 0.18; k < 0.5; k += 0.13) { const px = x0 + dx * k, py = y0 + dy * k; ctx.beginPath(); ctx.moveTo(px + nx * 1.3, py + ny * 1.3); ctx.lineTo(px - nx * 1.3, py - ny * 1.3); ctx.stroke(); }
    ctx.fillStyle = '#9aa0a6'; ctx.beginPath(); ctx.arc(x1, y1, 1.5, 0, 6.3); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.6; ctx.stroke();
  }
  function weaponShape(ctx, type, f, pose) {
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (type === 'bat') {
      const wood = '#bb8344', dark = '#7d4d20';
      ctx.beginPath(); ctx.moveTo(-0.9, -4); ctx.lineTo(0.9, -4); ctx.lineTo(1.0, 8); ctx.quadraticCurveTo(2.4, 16, 2.9, 24); ctx.quadraticCurveTo(3.3, 29.6, 0, 30.6); ctx.quadraticCurveTo(-3.3, 29.6, -2.9, 24); ctx.quadraticCurveTo(-2.4, 16, -1.0, 8); ctx.closePath();
      ctx.fillStyle = wood; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = dark; ctx.globalAlpha = 0.42; ctx.fillRect(0.5, -5, 4, 40); ctx.restore();
      ctx.strokeStyle = OL; ctx.lineWidth = 0.95; ctx.stroke();
      ctx.strokeStyle = '#1d1c1a'; ctx.lineWidth = 0.9;                                    /* taped grip */
      for (let y = -3; y < 7; y += 2.2) { ctx.beginPath(); ctx.moveTo(-1, y); ctx.lineTo(1, y + 1.1); ctx.stroke(); }
      ctx.fillStyle = wood; ctx.beginPath(); ctx.arc(0, -4.7, 1.7, 0, 6.3); ctx.fill(); ctx.strokeStyle = OL; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = 'rgba(255,242,215,0.75)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(-1.5, 14); ctx.lineTo(-2.0, 26); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,55,20,0.5)'; ctx.lineWidth = 0.5; ctx.beginPath(); ctx.moveTo(-0.4, 12); ctx.lineTo(-0.7, 20); ctx.moveTo(0.9, 18); ctx.lineTo(1.1, 27); ctx.stroke();
    } else if (type === 'knife') {
      ctx.fillStyle = '#5a3a1c'; ctx.strokeStyle = '#2b2a27'; ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.rect(-1.4, -4, 2.8, 6.4); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d9c9a0'; ctx.beginPath(); ctx.arc(0, -2.3, 0.5, 0, 6.3); ctx.arc(0, 0.3, 0.5, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#2b2a27'; ctx.fillRect(-3.1, 2.2, 6.2, 1.4);
      ctx.beginPath(); ctx.moveTo(-1.9, 3.6); ctx.lineTo(1.9, 3.6); ctx.lineTo(1.6, 11.2); ctx.lineTo(0.2, 14.6); ctx.lineTo(-1.9, 10); ctx.closePath();
      ctx.fillStyle = '#e4eaee'; ctx.fill();
      ctx.save(); ctx.clip(); ctx.fillStyle = '#8c98a0'; ctx.globalAlpha = 0.5; ctx.fillRect(0.4, 3, 3, 13); ctx.restore();
      ctx.strokeStyle = '#2b2a27'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(-0.7, 5); ctx.lineTo(-0.7, 9.4); ctx.stroke();
    } else if (type === 'nunchaku') {
      const b = (pose.wSw || 0) * D, wood = '#b88040', dark = '#6e431a';
      nStick(ctx, 0, 9, 0, -3, wood, dark);
      const jx = 0, jy = 9, cx = jx + Math.sin(b) * 5.2, cy = jy + Math.cos(b) * 5.2, ex = cx + Math.sin(b) * 11, ey = cy + Math.cos(b) * 11;
      ctx.strokeStyle = '#6b7075'; ctx.lineWidth = 0.9;                                    /* chain links */
      for (let k = 0.2; k < 1; k += 0.3) { ctx.beginPath(); ctx.ellipse(jx + (cx - jx) * k, jy + (cy - jy) * k, 1.3, 0.8, -b, 0, 6.3); ctx.stroke(); }
      nStick(ctx, cx, cy, ex, ey, wood, dark);
    } else if (type === 'crate') {
      boxShape(ctx, 0, 1, 16);
    } else if (type === 'barrel') {
      barrelShape(ctx, 0, 1, 14, 17);
    }
  }

  /* a wooden crate with its base at (x, y); used on the floor, overhead, and in the air */
  function boxShape(ctx, cx, y0, s) {
    const x0 = cx - s / 2;
    ctx.fillStyle = '#cf9f5e'; ctx.fillRect(x0, y0, s, s);
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, s, s); ctx.clip();
    ctx.fillStyle = 'rgba(110,70,25,0.32)'; ctx.fillRect(x0 + s * 0.62, y0, s * 0.4, s);                    /* shaded side */
    ctx.strokeStyle = 'rgba(90,55,20,0.55)'; ctx.lineWidth = 0.6;                                          /* plank seams + grain */
    for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x0, y0 + s * k / 4); ctx.lineTo(x0 + s, y0 + s * k / 4); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#4a2c10'; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 1.4, y0 + 1.4, s - 2.8, s - 2.8);    /* frame */
    ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x0 + 1.6, y0 + 1.6); ctx.lineTo(x0 + s - 1.6, y0 + s - 1.6); ctx.stroke();   /* brace */
    ctx.strokeStyle = OL; ctx.lineWidth = 1.2; ctx.strokeRect(x0, y0, s, s);
    ctx.fillStyle = '#2b2a27';                                                                             /* nails */
    for (const [nx, ny] of [[2.4, 2.4], [s - 2.4, 2.4], [2.4, s - 2.4], [s - 2.4, s - 2.4]]) { ctx.beginPath(); ctx.arc(x0 + nx, y0 + ny, 0.6, 0, 6.3); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,240,205,0.7)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(x0 + 1, y0 + 0.8); ctx.lineTo(x0 + s * 0.5, y0 + 0.8); ctx.stroke();
  }
  function barrelShape(ctx, cx, y0, w, h) {
    const l = cx - w / 2, r = cx + w / 2;
    const body = () => { ctx.beginPath(); ctx.moveTo(l + 1, y0); ctx.quadraticCurveTo(l - 2.2, y0 + h / 2, l + 1, y0 + h); ctx.lineTo(r - 1, y0 + h); ctx.quadraticCurveTo(r + 2.2, y0 + h / 2, r - 1, y0); ctx.closePath(); };
    body(); ctx.fillStyle = '#ac773b'; ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = 'rgba(90,55,20,0.34)'; ctx.fillRect(cx + w * 0.16, y0 - 1, w, h + 2);
    ctx.strokeStyle = 'rgba(70,40,15,0.6)'; ctx.lineWidth = 0.6;
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(cx + k * w * 0.2, y0); ctx.quadraticCurveTo(cx + k * w * 0.27, y0 + h / 2, cx + k * w * 0.2, y0 + h); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = '#4b5057'; ctx.lineWidth = 1.5;
    for (const k of [0.2, 0.8]) { const y = y0 + h * k; ctx.beginPath(); ctx.moveTo(l - 1.2, y); ctx.quadraticCurveTo(cx, y + 1.8, r + 1.2, y); ctx.stroke(); }
    ctx.strokeStyle = OL; ctx.lineWidth = 1.1; body(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,205,0.65)'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(l + 1.8, y0 + 2); ctx.lineTo(l + 1.4, y0 + h - 2); ctx.stroke();
  }
  A.crate = function (ctx, x, y, rot) {
    ctx.save(); ctx.translate(x, y - 8); ctx.rotate((rot || 0) * D); boxShape(ctx, 0, -8, 16); ctx.restore();
  };
  A.barrel = function (ctx, x, y, rot) {
    ctx.save(); ctx.translate(x, y - 8.5); ctx.rotate((rot || 0) * D); barrelShape(ctx, 0, -8.5, 14, 17); ctx.restore();
  };
  /* an oil drum that can be smashed; dmg 0..1 shows dents, rust and splits as it takes hits */
  A.drum = function (ctx, x, y, hit, dmg) {
    dmg = dmg || 0;
    ctx.save(); ctx.translate(x + (hit > 0 ? (Math.random() - 0.5) * 1.6 : 0), y);
    ctx.fillStyle = 'rgba(50,42,30,0.0)';
    A.contact(ctx, 0, 1, 12);
    const body = () => { ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(-8.6, -20); ctx.quadraticCurveTo(0, -23.4, 8.6, -20); ctx.lineTo(8, 0); ctx.quadraticCurveTo(0, 3, -8, 0); ctx.closePath(); };
    body(); ctx.fillStyle = hit > 0 ? '#c9d6de' : '#7f95a3'; ctx.fill();
    ctx.save(); body(); ctx.clip();
    ctx.fillStyle = 'rgba(20,32,40,0.38)'; ctx.fillRect(2.5, -24, 8, 28);                                  /* shaded side */
    ctx.fillStyle = '#d9d2c0'; ctx.fillRect(-9, -15, 18, 5);                                               /* hazard band */
    ctx.strokeStyle = '#c62a1f'; ctx.lineWidth = 1.7; for (let k = -10; k < 10; k += 4) { ctx.beginPath(); ctx.moveTo(k, -10); ctx.lineTo(k + 4, -15); ctx.stroke(); }
    if (dmg > 0.2) { ctx.fillStyle = 'rgba(130,70,30,0.45)'; ctx.beginPath(); ctx.ellipse(-3.5, -4, 3.4, 2.4, 0.4, 0, 6.3); ctx.fill(); }    /* rust */
    ctx.restore();
    ctx.strokeStyle = '#26323a'; ctx.lineWidth = 1.3; body(); ctx.stroke();
    ctx.fillStyle = '#9db0bc'; ctx.beginPath(); ctx.ellipse(0, -20, 8.6, 3, 0, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-8.4, -7); ctx.quadraticCurveTo(0, -4, 8.4, -7); ctx.moveTo(-8.5, -17); ctx.quadraticCurveTo(0, -14, 8.5, -17); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6.2, -18); ctx.lineTo(-6.6, -2); ctx.stroke();
    ctx.strokeStyle = '#1b262c'; ctx.lineWidth = 0.9;                                                      /* dents and splits */
    if (dmg > 0.25) { ctx.beginPath(); ctx.moveTo(-2, -9); ctx.lineTo(1, -6); ctx.lineTo(0, -3); ctx.stroke(); }
    if (dmg > 0.5) { ctx.beginPath(); ctx.moveTo(3, -19); ctx.lineTo(1.5, -14); ctx.lineTo(4.4, -10); ctx.lineTo(3, -6); ctx.stroke(); ctx.beginPath(); ctx.arc(-4.5, -12, 2, 0.4, 3.6); ctx.stroke(); }
    if (dmg > 0.75) { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-6, -19); ctx.lineTo(-3.4, -12); ctx.lineTo(-5.4, -6); ctx.lineTo(-3, -1); ctx.stroke(); }
    ctx.restore();
  };
  /* a little twinkle that marks something you can pick up */
  A.sparkle = function (ctx, x, y, t) {
    const s = 2.4 + 1.6 * (0.5 + 0.5 * Math.sin(t * 6)), a = 0.55 + 0.45 * Math.sin(t * 6 + 1);
    ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a; ctx.lineCap = 'round';
    ctx.strokeStyle = C.INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(s, 0); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.stroke();
    ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.lineWidth = 0.9; ctx.strokeStyle = '#e8b81f'; ctx.beginPath(); ctx.moveTo(-s * 0.55, -s * 0.55); ctx.lineTo(s * 0.55, s * 0.55); ctx.moveTo(-s * 0.55, s * 0.55); ctx.lineTo(s * 0.55, -s * 0.55); ctx.stroke();
    ctx.restore();
  };

  /* draw a figure: f = fighter (x, y, z, face, look), pose = joint angles. Origin of the drawing is the feet. */
  A.figure = function (ctx, f, camX, pose) {
    const look = f.look, S = look.scale || 1, col = look.col, core = look.core;
    let sxs = pose.sx === undefined ? 1 : pose.sx;
    if (Math.abs(sxs) < 0.1) sxs = sxs < 0 ? -0.1 : 0.1;
    const hipH = pose.hipH == null ? Math.max(legExtent(pose.lF), legExtent(pose.lB)) : pose.hipH;
    ctx.save();
    ctx.translate(Math.round((f.x - camX) * 2) / 2, f.y - f.z);
    ctx.scale(f.face * S * sxs, S);
    ctx.translate(0, -hipH);
    if (pose.rot) ctx.rotate(pose.rot * D);
    const lean = pose.lean * D, hx = 0, hy = 0;
    const tx = hx + Math.sin(lean) * TORSO, ty = hy - Math.cos(lean) * TORSO;
    const shx = hx + Math.sin(lean) * (TORSO - 1.6), shy = hy - Math.cos(lean) * (TORSO - 1.6);
    const ha = (pose.lean + (pose.head || 0)) * D, hdx = tx + Math.sin(ha) * (HEADR + 0.6), hdy = ty - Math.cos(ha) * (HEADR + 0.6);
    const arm = (a) => { const s1 = a[0] * D, s2 = (a[0] + a[1]) * D, ex = shx + Math.sin(s1) * UA, ey = shy + Math.cos(s1) * UA; return [shx, shy, ex, ey, ex + Math.sin(s2) * FA, ey + Math.cos(s2) * FA, (a[0] + a[1])]; };
    const leg = (l) => { const t1 = l[0] * D, t2 = (l[0] - l[1]) * D, kx = hx + Math.sin(t1) * TH, ky = hy + Math.cos(t1) * TH; return [hx, hy, kx, ky, kx + Math.sin(t2) * SH, ky + Math.cos(t2) * SH]; };
    const w = look.line || 2.5;
    const aB = arm(pose.aB), aF = arm(pose.aF), lB = leg(pose.lB), lF = leg(pose.lF);
    f.tailV = (f.tailV || 0) * 0.9;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.PAPER; ctx.globalAlpha = 0.78; ctx.lineWidth = w + 3.6;
    for (const seg of [aB.slice(0, 6), lB, [hx, hy, tx, ty], lF, aF.slice(0, 6)]) { ctx.beginPath(); ctx.moveTo(seg[0], seg[1]); for (let i = 2; i < seg.length; i += 2) ctx.lineTo(seg[i], seg[i + 1]); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(hdx, hdy, HEADR + 1.4, 0, 6.3); ctx.stroke();
    ctx.globalAlpha = 1;
    const OF = look.outfit || {}, sway = Math.sin((f.clock || 0) * 7) * 1.1 + (f.tailV || 0) * 2;
    const cloth = (seg, c, lw) => { ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.globalAlpha = 0.96; ctx.beginPath(); ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]); ctx.stroke(); ctx.globalAlpha = 1; };
    const foot = (leg2) => { ctx.strokeStyle = look.shoe || C.INK; ctx.lineWidth = 2.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(leg2[4], leg2[5]); ctx.lineTo(leg2[4] + 3.5, leg2[5] + 0.4); ctx.stroke(); };
    const band = (a) => { if (!look.wrist) return; const bx = a[2] + (a[4] - a[2]) * 0.62, by = a[3] + (a[5] - a[3]) * 0.62; cloth([bx, by, a[4], a[5]], look.wrist, w + 1.1); };
    if (OF.coat) {                                                               /* coat tails flap behind the legs */
      ctx.fillStyle = OF.coat; ctx.strokeStyle = C.INK; ctx.lineWidth = 0.6;
      ctx.beginPath(); ctx.moveTo(hx - 0.5, hy - 6); ctx.lineTo(hx - 6.5 - sway, hy + 10); ctx.lineTo(hx - 2.2, hy + 11.5); ctx.lineTo(hx + 1.8, hy + 9); ctx.lineTo(hx + 1.2, hy - 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    A.pencil(ctx, aB.slice(0, 6), col, core, w, 0.9); band(aB);
    A.pencil(ctx, lB, col, core, w); foot(lB);
    if (OF.pants) cloth(lB.slice(0, 4), OF.pants, w + 1.2);
    A.pencil(ctx, [hx, hy, tx, ty], col, core, w + 0.5);
    if (OF.top) {
      cloth([hx + Math.sin(lean) * 2.5, hy - Math.cos(lean) * 2.5, hx + Math.sin(lean) * 11.4, hy - Math.cos(lean) * 11.4], OF.top, w + 1.7);
      if (OF.stripes) { ctx.strokeStyle = OF.stripes; ctx.lineWidth = 0.9; ctx.beginPath(); for (let k = 4.5; k < 11; k += 2.6) { const px = hx + Math.sin(lean) * k, py = hy - Math.cos(lean) * k; ctx.moveTo(px - 2.2, py); ctx.lineTo(px + 2.2, py); } ctx.stroke(); }
      if (OF.tie) { ctx.strokeStyle = OF.tie; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(hx + Math.sin(lean) * 11.6, hy - Math.cos(lean) * 11.6); ctx.lineTo(hx + Math.sin(lean) * 6.6 + 0.6, hy - Math.cos(lean) * 6.6); ctx.stroke(); }
    }
    if (look.scarf) {                                                           /* the hero's scarf streams out behind him */
      ctx.strokeStyle = look.scarf; ctx.lineWidth = 2.1; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(tx, ty - 1.2); ctx.quadraticCurveTo(tx - 5, ty + 0.4 + sway * 0.6, tx - 11, ty + 2 + sway * 1.5); ctx.stroke();
      ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(tx, ty - 0.6); ctx.quadraticCurveTo(tx - 5, ty - 1.4 - sway * 0.4, tx - 10, ty - 0.4 - sway); ctx.stroke();
    }
    if (look.props && look.props.indexOf('vest') >= 0) {
      ctx.strokeStyle = '#1d1c1a'; ctx.lineWidth = 4.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx + Math.sin(lean) * 3, hy - Math.cos(lean) * 3); ctx.lineTo(hx + Math.sin(lean) * 11, hy - Math.cos(lean) * 11); ctx.stroke();
      ctx.fillStyle = '#1d1c1a'; ctx.beginPath(); ctx.moveTo(shx - 3.5, shy - 0.5); ctx.lineTo(shx - 0.5, shy - 4); ctx.lineTo(shx + 3.5, shy - 0.5); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#d9d2c0'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(hx + Math.sin(lean) * 4, hy - Math.cos(lean) * 4); ctx.lineTo(hx + Math.sin(lean) * 10, hy - Math.cos(lean) * 10); ctx.stroke();
    }
    if (look.props && look.props.indexOf('belt') >= 0) { ctx.strokeStyle = '#1d1c1a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx - 2.4, hy - 1.2); ctx.lineTo(hx + 2.4, hy - 1.2); ctx.stroke(); }
    A.pencil(ctx, lF, col, core, w); foot(lF);
    if (OF.pants) cloth(lF.slice(0, 4), OF.pants, w + 1.2);
    head(ctx, hdx, hdy, look, col, core, f);
    A.pencil(ctx, aF.slice(0, 6), col, core, w); band(aF);
    if (f.weapon) {
      ctx.save(); ctx.translate(aF[4], aF[5]); ctx.rotate(-((aF[6] + (pose.wRot || 0)) * D));
      weaponShape(ctx, f.weapon.type, f, pose);
      ctx.restore();
    }
    /* grabbed/grabbing hand dot and fists */
    const glove = look.props && look.props.indexOf('gloves') >= 0, gr = glove ? 3.4 : 1.45;
    ctx.fillStyle = glove ? '#8a1c14' : col; ctx.beginPath(); ctx.arc(aF[4], aF[5], gr, 0, 6.3); ctx.fill();
    ctx.beginPath(); ctx.arc(aB[4], aB[5], gr, 0, 6.3); ctx.fill();
    if (glove) { ctx.strokeStyle = C.INK; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(aF[4], aF[5], gr, 0, 6.3); ctx.stroke(); ctx.beginPath(); ctx.arc(aB[4], aB[5], gr, 0, 6.3); ctx.stroke(); }
    ctx.restore();
  };

  /* a pencil swoosh behind a swinging fist, foot or weapon: kind 'punch' | 'kick' | 'bat' | 'spin', u = 0..1 through the swing */
  A.swish = function (ctx, f, camX, kind, reach, u) {
    const S = f.look.scale || 1, dir = f.face, cx = f.x - camX + dir * 3, cy = f.y - f.z - (kind === 'kick' ? 13 : kind === 'bat' ? 32 : 24) * S;
    let a0, a1, r = reach * 0.86;
    if (kind === 'punch') { a0 = -50; a1 = 22; r *= 0.9; } else if (kind === 'kick') { a0 = 62; a1 = -30; } else if (kind === 'bat') { a0 = -150; a1 = 30; r *= 0.95; } else { a0 = 0; a1 = 360; r = reach * 0.75; }
    const k = U.clamp(u * 1.4, 0, 1), fade = U.clamp(1.6 - u, 0, 1);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(dir, 1); ctx.lineCap = 'round'; ctx.strokeStyle = C.INK;
    for (let i = 0; i < 3; i++) {
      const rr = r - i * 2.4, s0 = a0 + (a1 - a0) * Math.max(0, k - 0.5 - i * 0.08), s1 = a0 + (a1 - a0) * k;
      ctx.globalAlpha = (0.5 - i * 0.14) * fade; ctx.lineWidth = 2 - i * 0.5;
      ctx.beginPath(); ctx.arc(0, 0, rr, s0 * D, s1 * D, a1 < a0); ctx.stroke();
    }
    ctx.restore(); ctx.globalAlpha = 1;
  };
  /* three little stars circling a stunned head */
  A.dizzy = function (ctx, x, y, t) {
    for (let i = 0; i < 3; i++) {
      const a = t * 7 + i * 2.094, px = x + Math.cos(a) * 7, py = y + Math.sin(a) * 2.2;
      ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = C.INK; ctx.lineWidth = 0.7; ctx.beginPath();
      for (let k = 0; k < 10; k++) { const rr = k % 2 ? 1.2 : 2.8, aa = k * Math.PI / 5; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  };

  A.shadow = function (ctx, f, camX) {
    const k = U.clamp(1 - f.z / 90, 0.35, 1), rx = 11 * (f.look.scale || 1) * k, ry = 3.1 * (f.look.scale || 1) * k, sx = f.x - camX;
    ctx.save(); ctx.translate(sx, f.y + 0.5); ctx.scale(1, ry / rx);
    ctx.globalAlpha = 0.2 * k; ctx.fillStyle = C.INK; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 6.3); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.3 * k; ctx.strokeStyle = C.INK; ctx.lineWidth = 0.7; ctx.beginPath();
    for (let i = -2; i <= 2; i++) { ctx.moveTo(sx + i * rx * 0.3 - 2, f.y + ry * 0.7); ctx.lineTo(sx + i * rx * 0.3 + 2, f.y - ry * 0.7); }
    ctx.stroke(); ctx.restore();
  };

  /* ---------- floor items, thrown weapons and hud icons ---------- */
  A.weaponIcon = function (ctx, type, x, y, rotDeg, sc) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotDeg * D); ctx.scale(sc || 1, sc || 1);
    ctx.translate(0, -8);
    weaponShape(ctx, type, { t: 0 }, { wSw: 40 });
    ctx.restore();
  };
  A.food = function (ctx, type, x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (type === 'chicken') {
      ctx.strokeStyle = '#4a2c0f'; ctx.fillStyle = '#d88a3a'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.ellipse(-1, -6, 7, 5, -0.5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#efe6cf'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(9, -13); ctx.stroke();
      ctx.fillStyle = '#efe6cf'; ctx.beginPath(); ctx.arc(9.5, -13.6, 1.8, 0, 6.3); ctx.arc(11.3, -11.8, 1.5, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(-3, -8, 2.6, 3.6, 5), ctx.stroke();
    } else {
      ctx.fillStyle = '#e04a3a'; ctx.strokeStyle = '#6b1810'; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(0, -5, 5, 0, 6.3); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#3d2a14'; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(1, -13); ctx.stroke();
      ctx.fillStyle = '#4f9a3d'; ctx.beginPath(); ctx.ellipse(3, -12, 2.6, 1.3, -0.5, 0, 6.3); ctx.fill();
    }
    ctx.restore();
  };
  A.heart = function (ctx, x, y, s, fill, col, outline) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const path = () => { ctx.beginPath(); ctx.moveTo(0, 4.4); ctx.bezierCurveTo(-7.4, -0.8, -4.6, -6.4, 0, -2.4); ctx.bezierCurveTo(4.6, -6.4, 7.4, -0.8, 0, 4.4); ctx.closePath(); };
    ctx.fillStyle = 'rgba(40,36,30,0.12)'; path(); ctx.fill();
    if (fill > 0) { ctx.save(); path(); ctx.clip(); ctx.fillStyle = col; ctx.fillRect(-8, -8, 16 * fill, 16); A.hatch(ctx, -8, -8, 16 * fill, 16, 1.6, 0.8, 0.28, '#4a0d09'); ctx.restore(); }
    ctx.strokeStyle = outline || C.INK; ctx.lineWidth = 1; ctx.lineJoin = 'round'; path(); ctx.stroke();
    ctx.restore();
  };

  G.art = A;
})((window.SGS = window.SGS || {}));
