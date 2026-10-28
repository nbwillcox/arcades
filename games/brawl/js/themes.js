/* Backdrop themes beyond the street: warehouse, dojo, docks, rooftop. Each returns { far, near, f } like art.buildBackdrop (two parallax layers sketched once per scale). */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, A = G.art;
  const INK = '#3f3d37';
  const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };
  const g = (x, pts, w, a) => A.graphite(x, pts, w || 1.2, a === undefined ? 0.9 : a, INK);
  const rect = (x, x0, y0, w, h, lw, a) => g(x, [x0, y0, x0 + w, y0, x0 + w, y0 + h, x0, y0 + h, x0, y0], lw || 1.3, a);
  const BASE = 168;
  const TH = {};

  function layers(level, f, farMul) {
    const W = level.width;
    return { far: mk((W * farMul + C.W) * f, C.H * f), near: mk(W * f, C.H * f), W };
  }
  function floorLines(x, W, r, o) {
    g(x, [0, BASE, W, BASE], 2.2, 1);
    A.hatch(x, 0, BASE, W, 8, 3, 0.8, o.hz || 0.18);
    g(x, [0, BASE + 8, W, BASE + 8], 1, 0.5);
    for (let i = 0; i < W / 55; i++) {
      const cx = r() * W, cy = 186 + r() * 80, n = 3 + Math.floor(r() * 3), pts = [cx, cy];
      let ax = cx, ay = cy;
      for (let k = 0; k < n; k++) { ax += (r() - 0.35) * 16; ay += (r() - 0.5) * 6; pts.push(ax, ay); }
      g(x, pts, 0.9, 0.28);
    }
    for (let i = 0; i < W / 240; i++) {
      const cx = 60 + r() * (W - 120), cy = 228 + r() * 22;
      x.save(); x.translate(cx, cy); x.scale(1, 0.32); x.strokeStyle = INK; x.globalAlpha = 0.4; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 12, 0, 6.3); x.stroke(); x.beginPath(); x.arc(0, 0, 7, 0, 6.3); x.stroke(); x.restore();
    }
  }

  /* ---------- warehouse ---------- */
  TH.warehouse = function (level, f) {
    const L = layers(level, f, 0.5), W = L.W; let x = L.far.getContext('2d'), r = U.rng(21);
    x.scale(f, f); A._f = f;
    A.fillPaper(x, 0, 0, L.far.width / f, C.H); A.wash(x, 0, 0, L.far.width / f, 60, 'rgba(60,52,40,0.2)', 'rgba(60,52,40,0)');
    g(x, [0, 26, W * 0.5 + C.W, 26], 1.6, 0.4); g(x, [0, 34, W * 0.5 + C.W, 34], 1, 0.3);
    for (let px = 0; px < W * 0.5 + C.W; px += 46) { g(x, [px, 34, px + 23, 8, px + 46, 34], 1, 0.35); g(x, [px + 23, 8, px + 23, 34], 0.8, 0.3); }
    for (let px = 20; px < W * 0.5 + C.W; px += 110 + r() * 60) {                      /* far shelving */
      const w = 70 + r() * 40, h = 40 + r() * 30;
      A.fillPaper(x, px, BASE - h, w, h); rect(x, px, BASE - h, w, h, 1, 0.35);
      for (let sy = BASE - h + 12; sy < BASE; sy += 14) g(x, [px, sy, px + w, sy], 0.8, 0.3);
      for (let k = 0; k < 4; k++) rect(x, px + 4 + r() * (w - 18), BASE - h + 2 + Math.floor(r() * 3) * 14, 10, 10, 0.7, 0.3);
    }
    x = L.near.getContext('2d'); r = U.rng(22); x.scale(f, f);
    /* brick back wall */
    A.fillPaper(x, 0, 40, W, BASE - 40);
    g(x, [0, 40, W, 40], 1.6, 0.9);
    for (let row = 0; row < 16; row++) {
      const y = 44 + row * 8;
      g(x, [0, y, W, y], 0.7, 0.28);
      for (let bx = (row % 2) * 7; bx < W; bx += 14) g(x, [bx, y, bx, y + 8], 0.6, 0.22);
    }
    A.hatch(x, 0, 40, W, BASE - 40, 6, 0.9, 0.06);
    /* roller doors */
    for (let px = 150; px < W - 120; px += 380 + r() * 200) {
      const w = 96, h = 86, by = BASE - h;
      A.fillPaper(x, px, by, w, h); rect(x, px, by, w, h, 1.6, 0.95);
      for (let sy = by + 5; sy < BASE; sy += 6) g(x, [px + 2, sy, px + w - 2, sy], 0.8, 0.5);
      A.hatch(x, px + w - 22, by, 22, h, 3, -0.9, 0.2);
      g(x, [px - 3, by - 3, px + w + 3, by - 3], 2, 0.9);
      g(x, [px + w / 2, by + h - 14, px + w / 2, by + h - 6], 2.2, 0.9);
    }
    /* steel pillars */
    for (let px = 90; px < W; px += 210 + r() * 40) {
      g(x, [px, 20, px, BASE], 1.6, 0.95); g(x, [px + 9, 20, px + 9, BASE], 1.6, 0.95);
      A.hatch(x, px, 20, 9, BASE - 20, 3, 0.8, 0.25);
      g(x, [px - 4, 20, px + 13, 20], 2.2, 0.9); g(x, [px - 5, BASE - 3, px + 14, BASE - 3], 2.4, 0.9);
      for (let ry = 34; ry < BASE; ry += 22) { x.fillStyle = INK; x.globalAlpha = 0.6; x.fillRect(px + 3, ry, 1.6, 1.6); x.fillRect(px + 6, ry, 1.6, 1.6); x.globalAlpha = 1; }
    }
    /* racks with crates */
    for (let px = 40; px < W - 140; px += 300 + r() * 160) {
      const w = 110, h = 74, by = BASE - h;
      for (const sx of [px, px + w]) g(x, [sx, BASE, sx, by], 1.4, 0.95);
      for (let sy = by; sy <= BASE; sy += 24) g(x, [px, sy, px + w, sy], 1.3, 0.9);
      for (let sy = by + 24; sy <= BASE; sy += 24) for (let cx = px + 4; cx < px + w - 16; cx += 22 + r() * 10) if (r() < 0.8) {
        const s = 14 + r() * 6; A.fillPaper(x, cx, sy - s, s, s); rect(x, cx, sy - s, s, s, 1, 0.85); g(x, [cx, sy - s, cx + s, sy, cx + s, sy - s, cx, sy], 0.7, 0.4);
      }
    }
    /* hanging lamps */
    for (let px = 60; px < W; px += 160 + r() * 60) {
      g(x, [px, 0, px, 26], 1, 0.7); g(x, [px - 9, 36, px - 4, 26, px + 4, 26, px + 9, 36, px - 9, 36], 1.2, 0.9);
      A.hatch(x, px - 22, 36, 44, 120, 7, 1.2, 0.035);
    }
    /* floor: hazard stripe, lane paint */
    floorLines(x, W, r, { hz: 0.3 });
    for (let sx = 0; sx < W; sx += 26) g(x, [sx, BASE + 1, sx + 10, BASE + 7], 2.4, 0.5);
    for (let sx = 20; sx < W; sx += 64) g(x, [sx, 214, sx + 30, 214], 2.2, 0.5, '#8a6d12');
    A.groundShade(x, W);
    return { far: L.far, near: L.near, f };
  };

  /* ---------- dojo ---------- */
  TH.dojo = function (level, f) {
    const L = layers(level, f, 0.5), W = L.W; let x = L.far.getContext('2d'), r = U.rng(31);
    x.scale(f, f); A._f = f;
    A.fillPaper(x, 0, 0, L.far.width / f, C.H); A.skyWash(x, L.far.width / f, 'rgba(225,165,120,0.26)');
    const FW = W * 0.5 + C.W;
    x.strokeStyle = INK; x.globalAlpha = 0.4; x.lineWidth = 1.5; x.beginPath(); x.arc(FW * 0.35, 70, 34, 0, 6.3); x.stroke(); x.globalAlpha = 1;
    A.hatch(x, FW * 0.35 - 34, 36, 68, 68, 4, 0.8, 0.05);
    for (let px = -20; px < FW; px += 90 + r() * 70) {                                    /* mountain ranges */
      const w = 150 + r() * 120, h = 50 + r() * 60;
      g(x, [px, BASE - 20, px + w * 0.45, BASE - 20 - h, px + w * 0.55, BASE - 14 - h * 0.9, px + w, BASE - 20], 1.2, 0.4);
      A.hatch(x, px + w * 0.45, BASE - 20 - h, w * 0.55, h, 5, 1.1, 0.06);
    }
    for (let px = 40; px < FW; px += 190 + r() * 120) {                                  /* blossom branches */
      const by = 20 + r() * 40; let bx = px, byy = by; const pts = [bx, byy];
      for (let i = 0; i < 5; i++) { bx += 16 + r() * 14; byy += (r() - 0.35) * 14; pts.push(bx, byy); }
      g(x, pts, 1.4, 0.45);
      for (let i = 2; i < pts.length; i += 2) for (let k = 0; k < 3; k++) { x.strokeStyle = '#c9607a'; x.globalAlpha = 0.5; x.lineWidth = 1; x.beginPath(); x.arc(pts[i] + (r() - 0.5) * 12, pts[i + 1] + (r() - 0.5) * 12, 2 + r() * 1.5, 0, 6.3); x.stroke(); }
      x.globalAlpha = 1;
    }
    x = L.near.getContext('2d'); r = U.rng(32); x.scale(f, f);
    /* back wall: wooden frame with shoji screens */
    g(x, [0, 24, W, 24], 2.4, 0.95); g(x, [0, 30, W, 30], 1.2, 0.6);
    g(x, [0, BASE - 6, W, BASE - 6], 2, 0.9);
    A.hatch(x, 0, 24, W, 6, 2.2, 0.8, 0.4);
    for (let px = 0; px < W; px += 100) {
      const sw = 100;
      for (let col = 0; col < 2; col++) {
        const cx = px + col * 50, y0 = 38, h = BASE - 44;
        const art = ((cx / 50) * 7 + 3) % 5 === 0;
        A.fillPaper(x, cx + 3, y0, 44, h);
        rect(x, cx + 3, y0, 44, h, 1, 0.7);
        if (art) {                                                                     /* a framed ink painting instead of a blank screen */
          A.fillPaper(x, cx + 7, y0 + 6, 36, h - 12);
          rect(x, cx + 7, y0 + 6, 36, h - 12, 1.2, 0.8);
          g(x, [cx + 9, y0 + h * 0.62, cx + 19, y0 + h * 0.4, cx + 27, y0 + h * 0.56, cx + 34, y0 + h * 0.44, cx + 41, y0 + h * 0.6], 1.3, 0.7);
          x.strokeStyle = INK; x.globalAlpha = 0.6; x.lineWidth = 1.3; x.beginPath(); x.arc(cx + 33, y0 + h * 0.24, 5, 0, 6.3); x.stroke(); x.globalAlpha = 1;
          A.hatch(x, cx + 9, y0 + h * 0.62, 32, h * 0.26, 3, 0.8, 0.12);
        }
        for (let k = 1; k < 4; k++) g(x, [cx + 3, y0 + (h / 4) * k, cx + 47, y0 + (h / 4) * k], 0.7, 0.5);
        g(x, [cx + 25, y0, cx + 25, y0 + h], 0.7, 0.5);
        if (r() < 0.12) { g(x, [cx + 8, y0 + 12, cx + 30, y0 + 30, cx + 18, y0 + 36], 1.2, 0.6); }          /* torn paper scribble */
      }
      g(x, [px, 24, px, BASE - 6], 3.2, 0.95);
      A.hatch(x, px - 2, 24, 4, BASE - 30, 2, 0.8, 0.35);
    }
    /* hanging scrolls, lanterns, weapon racks */
    for (let px = 70; px < W - 60; px += 210 + r() * 120) {
      const k = r();
      if (k < 0.4) {
        A.fillPaper(x, px, 44, 26, 74); rect(x, px, 44, 26, 74, 1.4, 0.95); A.hatch(x, px, 44, 26, 74, 8, 0.9, 0.06);
        g(x, [px + 7, 58, px + 13, 70, px + 8, 84, px + 17, 96, px + 11, 108], 2.4, 0.7);
        g(x, [px - 3, 44, px + 29, 44], 2.2, 0.95);
      } else if (k < 0.7) {
        g(x, [px, 24, px, 44], 0.9, 0.7);
        x.save(); x.translate(px, 58); x.scale(0.72, 1); x.strokeStyle = INK; x.globalAlpha = 0.8; x.lineWidth = 1.3; x.fillStyle = 'rgba(210,90,60,0.35)'; x.beginPath(); x.arc(0, 0, 14, 0, 6.3); x.fill(); x.stroke(); for (let j = -9; j <= 9; j += 6) { x.beginPath(); x.moveTo(-Math.sqrt(196 - j * j), j); x.lineTo(Math.sqrt(196 - j * j), j); x.stroke(); } x.restore();
      } else {
        rect(x, px, 82, 80, 6, 1.3, 0.9); g(x, [px + 6, 88, px + 6, BASE - 6, px + 74, BASE - 6, px + 74, 88], 1.2, 0.8);
        for (let k2 = 0; k2 < 4; k2++) g(x, [px + 14 + k2 * 16, 60, px + 14 + k2 * 16, 82], 2.2, 0.8);
      }
    }
    /* wooden floor: planks */
    g(x, [0, BASE, W, BASE], 2.2, 1);
    for (let y = BASE + 9; y < C.H; y += 9) { g(x, [0, y, W, y], 0.8, 0.3); for (let px = (y * 7) % 90; px < W; px += 90 + (y % 5) * 9) g(x, [px, y - 9, px, y], 0.7, 0.25); }
    A.hatch(x, 0, BASE, W, 9, 3, 0.8, 0.12);
    for (let px = 40; px < W; px += 260 + r() * 140) {                              /* floor mats */
      x.save(); x.translate(px, 232); x.strokeStyle = INK; x.globalAlpha = 0.4; x.lineWidth = 1.3;
      x.strokeRect(0, 0, 64, 26); x.strokeRect(5, 4, 54, 18); x.restore();
    }
    A.groundShade(x, W);
    return { far: L.far, near: L.near, f };
  };

  /* ---------- docks ---------- */
  TH.docks = function (level, f) {
    const L = layers(level, f, 0.5), W = L.W; let x = L.far.getContext('2d'), r = U.rng(41);
    x.scale(f, f); A._f = f;
    A.fillPaper(x, 0, 0, L.far.width / f, C.H); A.skyWash(x, L.far.width / f, 'rgba(95,125,175,0.28)'); A.wash(x, 0, 118, L.far.width / f, 52, 'rgba(95,125,175,0.2)', 'rgba(95,125,175,0.05)');
    const FW = W * 0.5 + C.W;
    x.strokeStyle = INK; x.globalAlpha = 0.45; x.lineWidth = 1.4; x.beginPath(); x.arc(FW * 0.7, 52, 22, 0, 6.3); x.stroke(); x.globalAlpha = 1;
    g(x, [0, 118, FW, 118], 1.4, 0.5);
    for (let i = 0; i < FW / 18; i++) { const wx = r() * FW, wy = 124 + r() * 40; g(x, [wx, wy, wx + 8, wy - 2, wx + 16, wy], 0.9, 0.3); }
    for (let px = 30; px < FW; px += 200 + r() * 140) {                                     /* cranes and ships */
      const h = 60 + r() * 30;
      g(x, [px, 118, px + 6, 118 - h, px + 12, 118], 1.3, 0.5); g(x, [px - 16, 118 - h, px + 52, 118 - h], 1.5, 0.5); g(x, [px + 46, 118 - h, px + 46, 118 - h + 22], 0.9, 0.5);
      for (let k = 1; k < 5; k++) g(x, [px + 3, 118 - k * h / 5, px + 9, 118 - k * h / 5 + 6], 0.8, 0.3);
    }
    for (let px = 60; px < FW; px += 330 + r() * 120) { g(x, [px, 118, px + 6, 128, px + 90, 128, px + 100, 118], 1.2, 0.45); rect(x, px + 40, 100, 30, 18, 1, 0.4); }
    x = L.near.getContext('2d'); r = U.rng(42); x.scale(f, f);
    /* container stacks along the back */
    for (let px = -10; px < W; ) {
      const w = 76 + Math.floor(r() * 2) * 20, stack = r() < 0.55 ? 2 : 1;
      for (let s = 0; s < stack; s++) {
        const h = 40, by = BASE - 8 - s * h;
        A.fillPaper(x, px, by - h, w, h);
        rect(x, px, by - h, w, h, 1.5, 0.95);
        for (let rx = px + 5; rx < px + w - 3; rx += 7) g(x, [rx, by - h + 3, rx, by - 3], 0.8, 0.45);
        A.hatch(x, px + w - 18, by - h, 18, h, 3, -0.8, 0.18);
        g(x, [px + 4, by - h + 8, px + w - 4, by - h + 8], 0.9, 0.5);
        x.fillStyle = INK; x.globalAlpha = 0.6; x.font = '700 6px ' + A.FONT; x.fillText(U.pick(['MAERSK', 'EVER', 'CMA', 'HAPAG', 'ONE', 'COSCO']), px + 8, by - h + 20); x.globalAlpha = 1;
      }
      px += w + 3 + (r() < 0.3 ? 40 : 0);
    }
    /* mooring posts, ropes, barrels, lamp */
    for (let px = 80; px < W - 40; px += 150 + r() * 100) {
      const k = r();
      if (k < 0.4) { g(x, [px - 5, BASE + 14, px - 4, BASE, px + 4, BASE, px + 5, BASE + 14], 1.4, 0.95); g(x, [px - 7, BASE, px + 7, BASE], 1.8, 0.95); A.hatch(x, px - 4, BASE, 8, 14, 2, 0.8, 0.4); }
      else if (k < 0.7) { g(x, [px, BASE + 16, px, BASE - 70, px + 14, BASE - 76], 1.7, 0.95); g(x, [px + 10, BASE - 77, px + 22, BASE - 77, px + 20, BASE - 72, px + 12, BASE - 72, px + 10, BASE - 77], 1.2, 0.9); }
      else { A.contact(x, px + 12, BASE + 14, 17); A.fillPaper(x, px, BASE - 14, 24, 28); rect(x, px, BASE - 14, 24, 28, 1.4, 0.95); g(x, [px, BASE - 6, px + 24, BASE - 6], 1, 0.7); g(x, [px, BASE + 4, px + 24, BASE + 4], 1, 0.7); A.hatch(x, px + 14, BASE - 14, 10, 28, 2.5, -0.8, 0.25); }
    }
    /* plank pier floor */
    g(x, [0, BASE + 14, W, BASE + 14], 2.2, 1);
    for (let y = BASE + 24; y < C.H; y += 12) { g(x, [0, y, W, y], 1, 0.4); for (let px = (y * 11) % 60; px < W; px += 52 + (y % 7) * 6) { g(x, [px, y - 12, px, y], 0.8, 0.3); g(x, [px + 3, y - 8, px + 6, y - 8], 0.7, 0.3); } }
    A.hatch(x, 0, BASE + 14, W, 10, 3, 0.8, 0.14);
    for (let i = 0; i < W / 140; i++) { const cx = 40 + r() * (W - 80), cy = 200 + r() * 50; x.save(); x.translate(cx, cy); x.scale(1, 0.3); x.strokeStyle = INK; x.globalAlpha = 0.4; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 10, 0, 6.3); x.stroke(); x.restore(); }
    A.groundShade(x, W);
    return { far: L.far, near: L.near, f };
  };

  /* ---------- rooftop ---------- */
  TH.roof = function (level, f) {
    const L = layers(level, f, 0.45), W = L.W; let x = L.far.getContext('2d'), r = U.rng(51);
    x.scale(f, f); A._f = f;
    A.fillPaper(x, 0, 0, L.far.width / f, C.H); A.skyWash(x, L.far.width / f, 'rgba(105,135,185,0.28)');
    const FW = W * 0.45 + C.W;
    for (let i = 0; i < FW / 120; i++) {                                                    /* clouds */
      const cx = r() * FW, cy = 18 + r() * 60; x.strokeStyle = INK; x.globalAlpha = 0.25; x.lineWidth = 1.2; x.beginPath(); x.arc(cx, cy, 11, 3.1, 0.4); x.arc(cx + 14, cy - 4, 14, 3.4, 0.2); x.arc(cx + 30, cy, 10, 3.6, 0.1); x.stroke(); x.globalAlpha = 1;
    }
    for (let px = -10, layer = 0; px < FW; layer++) {
      const w = 50 + r() * 60, h = 70 + r() * 90, by = BASE - 10 - h;
      A.fillPaper(x, px, by, w, BASE - 10 - by);
      g(x, [px, BASE - 10, px, by, px + w, by, px + w, BASE - 10], 1.2, 0.42);
      A.hatch(x, px, by, w, h, 5, 0.9, 0.07);
      for (let wy = by + 8; wy < BASE - 16; wy += 12) for (let wx = px + 6; wx < px + w - 8; wx += 10) if (r() < 0.6) g(x, [wx, wy, wx + 4, wy, wx + 4, wy + 6, wx, wy + 6, wx, wy], 0.7, 0.3);
      if (r() < 0.3) g(x, [px + w * 0.5, by, px + w * 0.5, by - 22], 1, 0.4);
      px += w + 2;
    }
    x = L.near.getContext('2d'); r = U.rng(52); x.scale(f, f);
    /* parapet wall along the back */
    A.fillPaper(x, -4, 126, W + 8, 42);
    rect(x, -4, 126, W + 8, 42, 1.8, 0.95);
    for (let row = 0; row < 5; row++) { const y = 132 + row * 8; g(x, [0, y, W, y], 0.7, 0.3); for (let bx = (row % 2) * 8; bx < W; bx += 16) g(x, [bx, y, bx, y + 8], 0.6, 0.22); }
    A.hatch(x, 0, 126, W, 42, 5, 0.9, 0.07);
    g(x, [-4, 124, W + 4, 124], 3, 0.95); g(x, [-4, 120, W + 4, 120], 1.4, 0.6);
    /* roof structures */
    for (let px = 70; px < W - 60; px += 200 + r() * 150) {
      const k = r();
      if (k < 0.3) {                                                                                    /* water tower */
        for (const lx of [px, px + 38]) g(x, [lx, 126, lx + (lx === px ? -4 : 4), 44], 1.5, 0.95);
        g(x, [px - 4, 90, px + 42, 90], 1.2, 0.8);
        A.fillPaper(x, px - 8, 44, 54, 46);
        rect(x, px - 8, 44, 54, 46, 1.6, 0.95); g(x, [px - 8, 44, px + 19, 28, px + 46, 44], 1.6, 0.95);
        for (const hy of [56, 68, 80]) g(x, [px - 8, hy, px + 46, hy], 0.9, 0.55);
        A.hatch(x, px + 28, 44, 18, 46, 3, -0.8, 0.22);
      } else if (k < 0.65) {                                                                           /* AC units and vents */
        for (let i = 0; i < 2; i++) { const ax = px + i * 56; A.fillPaper(x, ax, 98, 46, 28); rect(x, ax, 98, 46, 28, 1.5, 0.95); for (let s = 0; s < 5; s++) g(x, [ax + 6, 104 + s * 4, ax + 28, 104 + s * 4], 0.8, 0.6); x.strokeStyle = INK; x.globalAlpha = 0.7; x.lineWidth = 1.2; x.beginPath(); x.arc(ax + 36, 112, 6, 0, 6.3); x.stroke(); x.globalAlpha = 1; }
      } else {                                                                                         /* antenna mast */
        g(x, [px, 126, px, 20], 1.4, 0.9); for (let ay = 36; ay < 120; ay += 22) { g(x, [px - 11 + ay % 5, ay, px + 11, ay], 1, 0.7); g(x, [px, ay, px - 9, ay + 18], 0.7, 0.4); }
        g(x, [px, 30, px + 120, 126], 0.8, 0.4);
      }
    }
    /* stairwell door and chimneys */
    for (let px = 300; px < W - 100; px += 520 + r() * 200) { A.fillPaper(x, px, 66, 54, 60); rect(x, px, 66, 54, 60, 1.6, 0.95); rect(x, px + 16, 86, 22, 40, 1.4, 0.95); A.hatch(x, px + 18, 88, 18, 38, 3, 0.8, 0.3); g(x, [px - 3, 66, px + 57, 66], 2.4, 0.9); }
    /* the roof surface: gravel and tar seams */
    g(x, [0, BASE, W, BASE], 2.2, 1);
    A.hatch(x, 0, BASE, W, 10, 3, 0.8, 0.14);
    for (let i = 0; i < W / 2.4; i++) { x.fillStyle = INK; x.globalAlpha = 0.18 + r() * 0.2; x.fillRect(r() * W, BASE + 8 + r() * 94, 1 + r() * 1.2, 1); } x.globalAlpha = 1;
    for (let sx = 40; sx < W; sx += 130) g(x, [sx, BASE + 10, sx + 6, C.H], 0.9, 0.25);
    for (let sy = 200; sy < C.H; sy += 36) g(x, [0, sy, W, sy], 0.8, 0.2);
    for (let i = 0; i < W / 160; i++) { const cx = 40 + r() * (W - 80), cy = 205 + r() * 45; x.save(); x.translate(cx, cy); x.scale(1, 0.3); x.strokeStyle = INK; x.globalAlpha = 0.4; x.lineWidth = 1.2; x.beginPath(); x.arc(0, 0, 14, 0, 6.3); x.stroke(); x.beginPath(); x.arc(0, 0, 8, 0, 6.3); x.stroke(); x.restore(); }
    A.groundShade(x, W);
    return { far: L.far, near: L.near, f };
  };

  A.themes = TH;
})((window.SGS = window.SGS || {}));
