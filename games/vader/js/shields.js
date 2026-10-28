/* Pixel-erosion bunkers: shots, bombs and marching invaders chip them away cell by cell. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx;
  const Sh = {};
  G.shields = Sh;
  const COLS = 15, ROWS = 11, CELL = 3.4, PX = 3;

  function shape(i, j) {
    if (i + j < 3 || (COLS - 1 - i) + j < 3) return false; // chamfered top corners
    if (j >= ROWS - 4 && i >= 5 && i <= 9) return false; // arch
    return true;
  }

  function make(cx) {
    const b = { x: cx - COLS * CELL / 2, y: C.BUNKER_Y, w: COLS * CELL, h: ROWS * CELL, cells: new Uint8Array(COLS * ROWS), tone: new Float32Array(COLS * ROWS), rev: 0, dirty: true };
    for (let j = 0; j < ROWS; j++) for (let i = 0; i < COLS; i++) { b.cells[j * COLS + i] = shape(i, j) ? 1 : 0; b.tone[j * COLS + i] = Math.random(); }
    b.canvas = document.createElement('canvas');
    b.canvas.width = Math.ceil(b.w * PX); b.canvas.height = Math.ceil(b.h * PX);
    return b;
  }

  Sh.build = function (g) {
    g.bunkers = [0.125, 0.375, 0.625, 0.875].map((f) => make(C.W * f));
  };

  function redraw(b) {
    const x = b.canvas.getContext('2d');
    x.clearRect(0, 0, b.canvas.width, b.canvas.height);
    x.scale(1, 1);
    const reveal = Math.floor(b.rev * ROWS);
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        if (!b.cells[j * COLS + i] || j > reveal) continue;
        const t = b.tone[j * COLS + i], top = j === 0 || !b.cells[(j - 1) * COLS + i];
        const l = 46 + (1 - j / ROWS) * 18 + t * 8 + (top ? 12 : 0);
        x.fillStyle = 'hsl(' + (192 + t * 14) + ',85%,' + l + '%)';
        x.fillRect(i * CELL * PX + 0.6, j * CELL * PX + 0.6, CELL * PX - 1.2, CELL * PX - 1.2);
      }
    }
    b.dirty = false;
  }

  Sh.update = function (g, dt) {
    for (const b of g.bunkers) if (b.rev < 1) { b.rev = Math.min(1, b.rev + dt * 1.6); b.dirty = true; }
  };

  function erode(b, ci, cj, R, ragged) {
    let n = 0;
    const r = Math.ceil(R + 1);
    for (let j = cj - r; j <= cj + r; j++) {
      for (let i = ci - r; i <= ci + r; i++) {
        if (i < 0 || j < 0 || i >= COLS || j >= ROWS || !b.cells[j * COLS + i]) continue;
        const d = Math.hypot(i - ci, j - cj);
        if (d <= R + (ragged ? U.rand(-0.5, 0.45) : 0)) { b.cells[j * COLS + i] = 0; n++; }
      }
    }
    if (n) {
      b.dirty = true;
      FX.sparks(b.x + (ci + 0.5) * CELL, b.y + (cj + 0.5) * CELL, Math.min(5, n), 90, 'hsla(190,100%,70%,1)', 0.3, 1.2);
    }
    return n;
  }

  /* returns true if the projectile struck a bunker (and erodes it) */
  Sh.hit = function (x, y, r, power) {
    const bunkers = G.game.bunkers;
    for (const b of bunkers) {
      if (b.rev < 1 || x < b.x - r - 2 || x > b.x + b.w + r + 2 || y < b.y - r - 2 || y > b.y + b.h + r + 2) continue;
      const ci = Math.floor((x - b.x) / CELL), cj = Math.floor((y - b.y) / CELL);
      for (let dj = -1; dj <= 1; dj++) {
        for (let di = -1; di <= 1; di++) {
          const i = ci + di, j = cj + dj;
          if (i < 0 || j < 0 || i >= COLS || j >= ROWS || !b.cells[j * COLS + i]) continue;
          const cx = b.x + (i + 0.5) * CELL, cy = b.y + (j + 0.5) * CELL;
          if (Math.abs(x - cx) < CELL / 2 + r && Math.abs(y - cy) < CELL / 2 + r) { erode(b, i, j, power, true); return true; }
        }
      }
    }
    return false;
  };

  /* an invader (or boss) body wipes out every cell it overlaps */
  Sh.crush = function (x0, y0, x1, y1) {
    for (const b of G.game.bunkers) {
      if (x1 < b.x || x0 > b.x + b.w || y1 < b.y || y0 > b.y + b.h) continue;
      let n = 0;
      for (let j = 0; j < ROWS; j++) {
        for (let i = 0; i < COLS; i++) {
          if (!b.cells[j * COLS + i]) continue;
          const cx = b.x + (i + 0.5) * CELL, cy = b.y + (j + 0.5) * CELL;
          if (cx > x0 && cx < x1 && cy > y0 && cy < y1) { b.cells[j * COLS + i] = 0; n++; }
        }
      }
      if (n) { b.dirty = true; FX.sparks((x0 + x1) / 2, Math.min(y1, b.y + b.h), Math.min(8, n), 120, 'hsla(190,100%,70%,1)', 0.35); }
    }
  };

  Sh.draw = function (ctx, g) {
    for (const b of g.bunkers) {
      if (b.dirty) redraw(b);
      ctx.drawImage(b.canvas, b.x, b.y, b.w, b.h);
    }
  };
})((window.SGS = window.SGS || {}));
