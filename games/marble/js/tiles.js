/* Tile art: a 128 x 128 texture for every material / surface, built once per theme, plus the animated overlays (arrows, shimmer, bubbles, cracks) that draw in tile space. */
(function (G) {
  'use strict';
  const U = G.U, GFX = G.gfx, C = G.C, S = C.S, TAU = U.TAU, hsl = U.hsl;
  const T = 128;
  const Tiles = {};

  function newTex() { const c = GFX.mk(T, T); return [c, c.getContext('2d')]; }

  function bevel(x, h, strong) {
    const k = strong ? 1 : 0.7;
    x.fillStyle = hsl(h, 80, 80, 0.16 * k); x.fillRect(0, 0, T, 3); x.fillRect(0, 0, 3, T);
    x.fillStyle = 'rgba(0,0,12,' + 0.4 * k + ')'; x.fillRect(0, T - 3, T, 3); x.fillRect(T - 3, 0, 3, T);
  }
  function seam(x, h, a, w) {
    x.strokeStyle = hsl(h, 95, 62, a); x.lineWidth = w || 2;
    x.strokeRect(1.5, 1.5, T - 3, T - 3);
  }
  function rivets(x, h) {
    for (const [px, py] of [[11, 11], [T - 11, 11], [11, T - 11], [T - 11, T - 11]]) {
      x.fillStyle = 'rgba(0,0,10,0.55)'; x.beginPath(); x.arc(px + 1, py + 1.5, 3.4, 0, TAU); x.fill();
      x.fillStyle = hsl(h, 30, 62); x.beginPath(); x.arc(px, py, 3.2, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.7)'; x.beginPath(); x.arc(px - 1, py - 1, 1.1, 0, TAU); x.fill();
    }
  }
  function speckle(x, rnd, n) {
    for (let i = 0; i < n; i++) { x.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,10,0.09)'; x.fillRect(rnd() * T, rnd() * T, 1 + rnd() * 2, 1 + rnd() * 2); }
  }
  function traces(x, h, rnd, count, alpha) {
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (let i = 0; i < count; i++) {
      let px = 16 + ((rnd() * 5) | 0) * 24, py = 16 + ((rnd() * 5) | 0) * 24;
      x.strokeStyle = hsl(h + 15, 95, 60, alpha); x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(px, py);
      let dir = (rnd() * 4) | 0;
      for (let s = 0; s < 3; s++) {
        const l = 12 + ((rnd() * 3) | 0) * 12;
        px = U.clamp(px + [1, 0, -1, 0][dir] * l, 10, T - 10); py = U.clamp(py + [0, 1, 0, -1][dir] * l, 10, T - 10);
        x.lineTo(px, py);
        dir = (dir + (rnd() < 0.5 ? 1 : 3)) & 3;
      }
      x.stroke();
      x.fillStyle = hsl(h + 15, 100, 75, alpha + 0.2); x.beginPath(); x.arc(px, py, 3, 0, TAU); x.fill();
    }
  }

  /* the standard floor plate. mat 0 = plain plate, 1 = bright pad, 2 = striped trim, 3 = gate barrier, 4 = lift deck */
  function panel(th, mat, variant) {
    const [c, x] = newTex(), h = th.hue, rnd = U.mulberry(variant * 131 + mat * 17 + Math.round(h));
    const light = mat === 1 ? 24 : 15;
    x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, hsl(h, 40, light + 5)], [1, hsl(h + 8, 46, light - 4)]]); x.fillRect(0, 0, T, T);
    speckle(x, rnd, 150);
    /* inset plate */
    x.fillStyle = hsl(h, 36, light - 1.5); x.fillRect(8, 8, T - 16, T - 16);
    x.strokeStyle = hsl(h, 70, 42, 0.45); x.lineWidth = 1.5; x.strokeRect(8.5, 8.5, T - 17, T - 17);
    x.fillStyle = 'rgba(0,0,12,0.28)'; x.fillRect(8, T - 11, T - 16, 3); x.fillRect(T - 11, 8, 3, T - 16);
    if (mat === 0) {
      if (variant === 1) { x.strokeStyle = hsl(h, 80, 55, 0.22); x.lineWidth = 3; for (let i = -2; i < 6; i++) { x.beginPath(); x.moveTo(i * 26, T); x.lineTo(i * 26 + T, 0); x.stroke(); } }
      else if (variant === 2) { x.strokeStyle = hsl(h, 85, 62, 0.4); x.lineWidth = 2; x.beginPath(); x.arc(64, 64, 24, 0, TAU); x.stroke(); x.beginPath(); x.arc(64, 64, 11, 0, TAU); x.stroke(); }
      else if (variant === 3) traces(x, h, rnd, 4, 0.5);
      else { x.strokeStyle = hsl(h, 70, 50, 0.26); x.lineWidth = 2; x.beginPath(); x.moveTo(64, 14); x.lineTo(64, 114); x.moveTo(14, 64); x.lineTo(114, 64); x.stroke(); traces(x, h, rnd, 1, 0.35); }
    } else if (mat === 1) {
      x.strokeStyle = hsl(h, 95, 66, 0.55); x.lineWidth = 3;
      x.beginPath(); x.arc(64, 64, 38, 0, TAU); x.stroke();
      x.fillStyle = hsl(h, 95, 66, 0.18); x.beginPath(); x.arc(64, 64, 38, 0, TAU); x.fill();
      x.strokeStyle = hsl(h + 140, 95, 66, 0.6); x.beginPath(); x.arc(64, 64, 20, 0, TAU); x.stroke();
    } else if (mat === 2) {
      x.fillStyle = hsl(h, 90, 60, 0.35);
      for (let i = -1; i < 7; i++) { x.beginPath(); x.moveTo(i * 24, 8); x.lineTo(i * 24 + 12, 8); x.lineTo(i * 24 - 12 + 0, 120); x.lineTo(i * 24 - 24, 120); x.closePath(); x.fill(); }
    } else if (mat === 3) {
      x.fillStyle = '#12100a'; x.fillRect(8, 8, T - 16, T - 16);
      x.fillStyle = 'rgba(255,200,40,0.95)';
      for (let i = -2; i < 8; i++) { x.beginPath(); x.moveTo(i * 28 - 4, T); x.lineTo(i * 28 + 14 - 4, T); x.lineTo(i * 28 + 14 - 4 + T, 0); x.lineTo(i * 28 - 4 + T, 0); x.closePath(); x.fill(); }
      x.fillStyle = 'rgba(8,8,16,0.35)'; x.fillRect(8, 8, T - 16, T - 16);
    } else if (mat === 4) {
      x.strokeStyle = hsl(h + 40, 95, 62, 0.65); x.lineWidth = 3;
      for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(34, 50 + i * 22); x.lineTo(64, 26 + i * 22); x.lineTo(94, 50 + i * 22); x.stroke(); }
    }
    rivets(x, h); bevel(x, h, mat === 1); seam(x, h, 0.6, 2.5);
    return c;
  }

  function surface(th, kind, variant) {
    const [c, x] = newTex(), h = th.hue, rnd = U.mulberry(variant * 97 + kind * 13 + 5);
    if (kind === S.ICE) {
      x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, '#cdf5ff'], [0.5, '#7cc7f2'], [1, '#3b82c8']]); x.fillRect(0, 0, T, T);
      x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1.4; x.lineCap = 'round';
      for (let i = 0; i < 12; i++) { let px = rnd() * T, py = rnd() * T; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 3; s++) { px += (rnd() - 0.5) * 50; py += (rnd() - 0.5) * 50; x.lineTo(px, py); } x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,0.25)'; x.beginPath(); x.moveTo(0, 60); x.lineTo(60, 0); x.lineTo(90, 0); x.lineTo(0, 90); x.fill();
      x.fillStyle = 'rgba(10,50,110,0.25)'; x.fillRect(0, T - 10, T, 10);
      seam(x, 195, 0.7, 3);
    } else if (kind === S.GOO) {
      x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, '#0c3a1c'], [1, '#04200e']]); x.fillRect(0, 0, T, T);
      for (let i = 0; i < 9; i++) { const px = rnd() * T, py = rnd() * T, r = 8 + rnd() * 20; x.fillStyle = GFX.rg(x, px - r * 0.3, py - r * 0.3, 1, r, [[0, 'rgba(160,255,120,0.7)'], [0.5, 'rgba(60,200,70,0.4)'], [1, 'rgba(10,80,30,0)']]); x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
      seam(x, 125, 0.45, 2.5);
    } else if (kind === S.ACID) {
      x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, '#103a05'], [1, '#2c0a3a']]); x.fillRect(0, 0, T, T);
      for (let i = 0; i < 8; i++) { const px = rnd() * T, py = rnd() * T, r = 10 + rnd() * 22; x.fillStyle = GFX.rg(x, px, py, 1, r, [[0, 'rgba(190,255,60,0.65)'], [0.6, 'rgba(120,255,40,0.25)'], [1, 'rgba(255,40,200,0)']]); x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
      x.strokeStyle = 'rgba(255,60,210,0.55)'; x.lineWidth = 2.5; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(rnd() * T, rnd() * T, 14 + rnd() * 18, 0, TAU); x.stroke(); }
      seam(x, 100, 0.8, 3);
    } else if (kind === S.CRUMBLE) {
      x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, '#5a3a24'], [1, '#2c1810']]); x.fillRect(0, 0, T, T);
      speckle(x, rnd, 260);
      x.fillStyle = 'rgba(255,170,90,0.12)'; x.fillRect(8, 8, T - 16, T - 16);
      x.strokeStyle = 'rgba(255,150,60,0.55)'; x.lineWidth = 2; x.lineCap = 'round';
      for (let i = 0; i < 4; i++) { let px = rnd() * T, py = rnd() * T; x.beginPath(); x.moveTo(px, py); for (let s = 0; s < 4; s++) { px += (rnd() - 0.5) * 44; py += (rnd() - 0.5) * 44; x.lineTo(px, py); } x.stroke(); }
      rivets(x, 25); bevel(x, 25, true); seam(x, 28, 0.7, 3);
    } else if (kind === S.BOOST || kind === S.CONVEY) {
      const hh = kind === S.BOOST ? 95 : 190;
      x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, hsl(hh, 50, 14)], [1, hsl(hh, 60, 8)]]); x.fillRect(0, 0, T, T);
      x.fillStyle = hsl(hh, 70, 40, 0.12); x.fillRect(10, 10, T - 20, T - 20);
      rivets(x, hh); bevel(x, hh, true); seam(x, hh, 0.9, 3);
    } else if (kind === S.GLASS) {
      /* a pane of fragile glass: see-through, framed in bright light, with a few specular streaks */
      x.clearRect(0, 0, T, T);
      x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, 'rgba(150,235,255,0.26)'], [0.5, 'rgba(90,190,240,0.14)'], [1, 'rgba(60,150,230,0.24)']]); x.fillRect(0, 0, T, T);
      x.fillStyle = 'rgba(255,255,255,0.22)'; x.beginPath(); x.moveTo(10, 62); x.lineTo(62, 10); x.lineTo(82, 10); x.lineTo(10, 82); x.fill();
      x.beginPath(); x.moveTo(60, 118); x.lineTo(118, 60); x.lineTo(118, 74); x.lineTo(74, 118); x.fill();
      x.strokeStyle = 'rgba(190,248,255,0.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(T / 2, 8); x.lineTo(T / 2, T - 8); x.moveTo(8, T / 2); x.lineTo(T - 8, T / 2); x.stroke();
      x.strokeStyle = 'rgba(200,250,255,0.95)'; x.lineWidth = 5; x.strokeRect(2.5, 2.5, T - 5, T - 5);
      x.strokeStyle = 'rgba(255,255,255,0.95)'; x.lineWidth = 2; x.strokeRect(7, 7, T - 14, T - 14);
      for (const [px, py] of [[7, 7], [T - 7, 7], [7, T - 7], [T - 7, T - 7]]) { x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 4, 0, TAU); x.fill(); }    } else if (kind === S.BOUNCE) {
      x.fillStyle = GFX.lg(x, 0, 0, T, T, [[0, '#3a1050'], [1, '#14041c']]); x.fillRect(0, 0, T, T);
      x.strokeStyle = 'rgba(255,90,230,0.8)'; x.lineWidth = 4; for (const r of [20, 36, 52]) { x.beginPath(); x.arc(64, 64, r, 0, TAU); x.stroke(); }
      x.fillStyle = 'rgba(255,90,230,0.5)'; x.beginPath(); x.arc(64, 64, 10, 0, TAU); x.fill();
      rivets(x, 300); bevel(x, 300, true); seam(x, 305, 0.9, 3);
    } else if (kind === S.GOAL) {
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.fillStyle = (i + j) & 1 ? '#0a0c1c' : '#e8f6ff'; x.fillRect(i * 32, j * 32, 32, 32); }
      x.fillStyle = hsl(th.hue, 100, 60, 0.15); x.fillRect(0, 0, T, T);
      seam(x, th.hue, 0.9, 3);
    } else if (kind === S.START) {
      const p = panel(th, 1, variant); x.drawImage(p, 0, 0);
      x.strokeStyle = hsl(h + 140, 100, 70, 0.8); x.lineWidth = 3;
      for (const r of [14, 28, 44]) { x.beginPath(); x.arc(64, 64, r, 0, TAU); x.stroke(); }
    } else { return panel(th, 0, variant); }
    return c;
  }

  Tiles.build = function (th) {
    const t = { th, panel: [], surf: {} };
    for (let m = 0; m < 5; m++) { t.panel[m] = []; for (let v = 0; v < (m === 0 ? 4 : 1); v++) t.panel[m][v] = panel(th, m, v); }
    for (const k of [S.ICE, S.GOO, S.ACID, S.CRUMBLE, S.GLASS, S.BOOST, S.CONVEY, S.BOUNCE, S.GOAL, S.START]) { t.surf[k] = []; for (let v = 0; v < (k === S.CRUMBLE || k === S.ICE ? 3 : 1); v++) t.surf[k][v] = surface(th, k, v); }
    const h = th.hue;
    t.sideA = hsl(h, 45, 7); t.sideB = hsl(h, 45, 11); t.trim = hsl(h, 95, 62, 0.85); t.trimDim = hsl(h, 80, 50, 0.4);
    t.railTop = hsl(h, 80, 62); t.railX = hsl(h, 60, 30); t.railY = hsl(h, 60, 19); t.railLamp = th.lamp || hsl(h, 100, 70);
    t.panelRgb = hsl(h, 40, 15);
    t.lampRgba = hsl(h, 100, 72, 1).replace('hsla', 'hsla');
    return t;
  };
  Tiles.texFor = function (t, world, i) {
    const s = world.surf[i], v = world.seed[i] & 3;
    if (s === S.NORMAL) { const m = world.mat[i]; return t.panel[m] ? t.panel[m][m === 0 ? v : 0] : t.panel[0][v]; }
    if (t.surf[s]) { const a = t.surf[s]; return a[v % a.length]; }
    return t.panel[0][v];
  };

  /* ---- animated overlays, drawn in 128 x 128 tile space on top of the texture ---- */
  function chevrons(x, dir, off, col, n) {
    x.save(); x.translate(64, 64); x.rotate(dir * Math.PI / 2);                    /* dir 0 = +x (texture u), 1 = +y (texture v) */
    x.strokeStyle = col; x.lineWidth = 9; x.lineCap = 'round'; x.lineJoin = 'round';
    for (let i = -1; i < n; i++) {
      const px = -60 + ((i * 44 + off) % (44 * (n + 1)));
      const a = 1 - Math.abs(px) / 70;
      if (a <= 0) continue;
      x.globalAlpha = Math.min(1, a * 1.4);
      x.beginPath(); x.moveTo(px - 14, -30); x.lineTo(px + 8, 0); x.lineTo(px - 14, 30); x.stroke();
    }
    x.restore(); x.globalAlpha = 1;
  }
  Tiles.overlay = function (x, surf, aux, t, seed, crack, regrow) {
    if (surf === S.BOOST) chevrons(x, aux, (t * 150) % 220, 'rgba(190,255,70,0.95)', 3);
    else if (surf === S.CONVEY) { chevrons(x, aux, (t * 62) % 220, 'rgba(90,220,255,0.85)', 3); }
    else if (surf === S.ICE) {
      const k = (t * 0.35 + (seed & 7) * 0.13) % 1.6;
      x.fillStyle = 'rgba(255,255,255,0.34)'; x.beginPath(); const o = (k - 0.3) * 190; x.moveTo(o, 0); x.lineTo(o + 26, 0); x.lineTo(o - 60 + 26, T); x.lineTo(o - 60, T); x.fill();
    } else if (surf === S.GOAL) {
      x.fillStyle = 'rgba(120,230,255,' + (0.1 + 0.1 * Math.sin(t * 5)) + ')'; x.fillRect(0, 0, T, T);
    } else if (surf === S.BOUNCE) {
      const k = (t * 1.3) % 1; x.strokeStyle = 'rgba(255,140,240,' + (1 - k) + ')'; x.lineWidth = 6 * (1 - k) + 1; x.beginPath(); x.arc(64, 64, 10 + k * 50, 0, TAU); x.stroke();
    } else if (surf === S.ACID || surf === S.GOO) {
      const col = surf === S.ACID ? '200,255,90' : '150,255,130';
      for (let i = 0; i < 3; i++) {
        const k = (t * 0.5 + i * 0.33 + (seed & 15) * 0.07) % 1, px = 20 + ((seed * (i + 3) * 37) % 90), py = 110 - k * 100;
        x.fillStyle = 'rgba(' + col + ',' + (0.65 * Math.sin(k * 3.14)) + ')'; x.beginPath(); x.arc(px, py, 4 + k * 7, 0, TAU); x.fill();
        x.strokeStyle = 'rgba(255,255,255,' + (0.5 * Math.sin(k * 3.14)) + ')'; x.lineWidth = 1.5; x.stroke();
      }
    } else if (surf === S.GLASS) {
      const k = (t * 0.45 + (seed & 7) * 0.2) % 2;
      x.fillStyle = 'rgba(255,255,255,0.28)'; const o = (k - 0.4) * 160; x.beginPath(); x.moveTo(o, 0); x.lineTo(o + 18, 0); x.lineTo(o - 50 + 18, T); x.lineTo(o - 50, T); x.fill();
      if (crack > 0) {
        const lines = 3 + Math.floor(crack * 7);
        x.lineCap = 'round'; x.lineJoin = 'round';
        for (let pass = 0; pass < 2; pass++) {
          const r2 = U.mulberry((seed + 3) * 911);
          for (let i = 0; i < lines; i++) {
            let px = 64 + (r2() - 0.5) * 24, py = 64 + (r2() - 0.5) * 24, a = r2() * TAU; const len = 34 + crack * 70;
            x.beginPath(); x.moveTo(px, py);
            for (let s = 0; s < 5; s++) { a += (r2() - 0.5) * 1.1; px += Math.cos(a) * len / 5; py += Math.sin(a) * len / 5; x.lineTo(px, py); }
            x.strokeStyle = pass === 0 ? 'rgba(0,30,60,0.8)' : 'rgba(235,252,255,' + (0.7 + crack * 0.3) + ')'; x.lineWidth = pass === 0 ? 5 : 2; x.stroke();
          }
        }
      }    } else if (surf === S.CRUMBLE && crack > 0) {
      /* fissures grow with damage; the deeper ones glow white-hot */
      const rnd = U.mulberry((seed + 1) * 773);
      const lines = 3 + Math.floor(crack * 6);
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        const r2 = U.mulberry((seed + 1) * 773);
        for (let i = 0; i < lines; i++) {
          let px = 64 + (r2() - 0.5) * 30, py = 64 + (r2() - 0.5) * 30, a = r2() * TAU;
          const len = 30 + crack * 60;
          x.beginPath(); x.moveTo(px, py);
          for (let s = 0; s < 5; s++) { a += (r2() - 0.5) * 1.3; px += Math.cos(a) * len / 5; py += Math.sin(a) * len / 5; x.lineTo(px, py); }
          x.strokeStyle = pass === 0 ? 'rgba(10,0,0,0.9)' : 'rgba(255,' + (150 + crack * 100) + ',' + (60 + crack * 120) + ',' + (0.55 + crack * 0.45) + ')';
          x.lineWidth = pass === 0 ? 7 : 2.6 + crack * 2;
          x.stroke();
        }
      }
      if (crack > 0.55) { x.fillStyle = 'rgba(255,170,90,' + ((crack - 0.55) * 0.5) + ')'; x.fillRect(0, 0, T, T); }
    }
    if (regrow > 0) { x.fillStyle = 'rgba(120,230,255,' + Math.min(0.6, regrow) + ')'; x.fillRect(0, 0, T, T); }
  };

  Tiles.T = T;
  G.tiles = Tiles;
})((window.SGS = window.SGS || {}));
