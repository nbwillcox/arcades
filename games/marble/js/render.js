/* Isometric renderer: camera + projection, the tile terrain (textured tops, side walls, guard rails), shadows and decals. Entities live in js/ents.js. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U, GFX = G.gfx, TL = G.tiles, FX = G.fx, S = C.S, TAU = U.TAU, BIT = G.World.BIT;
  const R = { zoom: 1, hw: 32, hh: 16, zs: C.ZS, ox: 0, oy: 0, W: 0, H: 0, ps: 1, fx: 0, fy: 0, fz: 0, t: 0, level: null, world: null, tiles: null };
  G.render = R;

  /* focus world point (fx, fy, fz) sits at the screen centre */
  R.set = function (w, h, zoom, fx, fy, fz, ps, shx, shy) {
    R.W = w; R.H = h; R.zoom = zoom; R.ps = ps;
    R.hw = C.TW / 2 * zoom; R.hh = C.TH / 2 * zoom; R.zs = C.ZS * zoom;
    R.fx = fx; R.fy = fy; R.fz = fz;
    R.ox = w / 2 - (fx - fy) * R.hw + (shx || 0);
    R.oy = h / 2 - ((fx + fy) * R.hh - fz * R.zs) + (shy || 0);
  };
  R.sx = (x, y) => R.ox + (x - y) * R.hw;
  R.sy = (x, y, z) => R.oy + (x + y) * R.hh - z * R.zs;

  R.load = function (level) {
    R.level = level; R.world = level.world;
    R.tiles = TL.build(level.theme);
    R.theme = level.theme;
    const gc = level.goal;
    if (gc && gc.length) {
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [x, y] of gc) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      R.goalBox = { x0, y0, x1: x1 + 1, y1: y1 + 1, cx: (x0 + x1 + 1) / 2, cy: (y0 + y1 + 1) / 2 };
      R.goalBox.z = level.world.heightAt(R.goalBox.cx, R.goalBox.cy);
    } else R.goalBox = null;
  };

  /* ---------------- path helpers ---------------- */
  function quad(ctx, a, b, c, d, e, f, g, h) { ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d); ctx.lineTo(e, f); ctx.lineTo(g, h); ctx.closePath(); }

  /* ---------------- visible range ---------------- */
  function visibleBox(W) {
    const hw = R.hw, hh = R.hh, zs = R.zs, zlo = W.zmin - 1.5, zhi = W.zmax + 3;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const m = 90;
    for (const [px, py] of [[-m, -m], [R.W + m, -m], [-m, R.H + m], [R.W + m, R.H + m]]) {
      for (const z of [zlo, zhi]) {
        const a = (px - R.ox) / hw, b = (py - R.oy + z * zs) / hh, x = (a + b) / 2, y = (b - a) / 2;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    return { x0: Math.max(0, Math.floor(x0) - 1), y0: Math.max(0, Math.floor(y0) - 1), x1: Math.min(W.w - 1, Math.ceil(x1) + 1), y1: Math.min(W.d - 1, Math.ceil(y1) + 1) };
  }

  /* ---------------- one tile: sides, top, trim, rails ---------------- */
  const LIGHT = (() => { const l = [-0.55, -0.45, 0.7], n = Math.hypot(l[0], l[1], l[2]); return [l[0] / n, l[1] / n, l[2] / n]; })();
  const FLAT_L = LIGHT[2];

  function cellGeom(W, i, ix, iy, jx, jy) {
    const hz = W.hz[i] + W.dz[i], sxv = W.sx[i], syv = W.sy[i];
    const hw = R.hw, hh = R.hh, zs = R.zs, x0 = R.ox + (ix - iy) * hw + jx, base = R.oy + (ix + iy) * hh + jy;
    return {
      hA: hz, hB: hz + sxv, hC: hz + sxv + syv, hD: hz + syv,
      ax: x0, ay: base - hz * zs,
      bx: x0 + hw, by: base + hh - (hz + sxv) * zs,
      cx: x0, cy: base + 2 * hh - (hz + sxv + syv) * zs,
      dx: x0 - hw, dy: base + hh - (hz + syv) * zs,
    };
  }

  function sideFace(ctx, W, i, ix, iy, which) {
    const hw = R.hw, hh = R.hh, zs = R.zs, t = R.tiles;
    const hz = W.hz[i] + W.dz[i], sxv = W.sx[i], syv = W.sy[i];
    let hA, hB, j, nA, nB, ex0, ey0;
    if (which === 0) { /* +x edge */ j = W.idx(ix + 1, iy); hA = hz + sxv; hB = hz + sxv + syv; ex0 = ix + 1; ey0 = iy; if (j >= 0 && W.kind[j]) { nA = W.hz[j] + W.dz[j]; nB = nA + W.sy[j]; } }
    else { /* +y edge */ j = W.idx(ix, iy + 1); hA = hz + syv; hB = hz + sxv + syv; ex0 = ix; ey0 = iy + 1; if (j >= 0 && W.kind[j]) { nA = W.hz[j] + W.dz[j]; nB = nA + W.sx[j]; } }
    const void_ = nA === undefined;
    const glass = W.surf[i] === S.GLASS, DEPTH = glass ? 0.2 : 1.15;
    let bA, bB;
    if (void_) { bA = hA - DEPTH; bB = hB - DEPTH; } else { bA = Math.min(hA, nA); bB = Math.min(hB, nB); if (hA - bA < 0.02 && hB - bB < 0.02) return; }
    const exA = ex0, eyA = ey0, exB = which === 0 ? ex0 : ex0 + 1, eyB = which === 0 ? ey0 + 1 : ey0;
    const ax = R.ox + (exA - eyA) * hw, bx = R.ox + (exB - eyB) * hw;
    const ayT = R.oy + (exA + eyA) * hh - hA * zs, byT = R.oy + (exB + eyB) * hh - hB * zs;
    const ayB = R.oy + (exA + eyA) * hh - bA * zs, byB = R.oy + (exB + eyB) * hh - bB * zs;
    const col = glass ? 'rgba(110,205,245,0.42)' : (which === 0 ? t.sideB : t.sideA);
    if (void_) {
      /* a thick slab that fades into the dark: three bands */
      const bands = [[0, 0.38, 1], [0.38, 0.74, 0.6], [0.74, 1, 0.28]];
      for (const [f0, f1, a] of bands) {
        const y0a = ayT + (ayB - ayT) * f0, y0b = byT + (byB - byT) * f0, y1a = ayT + (ayB - ayT) * f1, y1b = byT + (byB - byT) * f1;
        ctx.globalAlpha = a; ctx.fillStyle = col; quad(ctx, ax, y0a, bx, y0b, bx, y1b, ax, y1a); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else { ctx.fillStyle = col; quad(ctx, ax, ayT, bx, byT, bx, byB, ax, ayB); ctx.fill(); }
    /* panel lines */
    const hgt = Math.max(hA - bA, hB - bB);
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.moveTo(ax, ayT); ctx.lineTo(ax, ayB); ctx.moveTo(bx, byT); ctx.lineTo(bx, byB);
    if (hgt > 0.9) { const m = 0.5; ctx.moveTo(ax, ayT + (ayB - ayT) * m); ctx.lineTo(bx, byT + (byB - byT) * m); }
    ctx.stroke();
    /* neon trim along the top edge */
    ctx.strokeStyle = t.trim; ctx.lineWidth = Math.max(1, 1.6 * R.zoom);
    ctx.beginPath(); ctx.moveTo(ax, ayT); ctx.lineTo(bx, byT); ctx.stroke();
    if (void_) { ctx.strokeStyle = t.trimDim; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(ax, ayT + (ayB - ayT) * 0.38); ctx.lineTo(bx, byT + (byB - byT) * 0.38); ctx.stroke(); }
  }

  function drawTop(ctx, W, i, ix, iy, g, t) {
    const ps = R.ps, T = TL.T, tex = TL.texFor(R.tiles, W, i);
    const ux = g.bx - g.ax, uy = g.by - g.ay, vx = g.dx - g.ax, vy = g.dy - g.ay, k = 1 / T, pad = 0.012;
    ctx.setTransform(ux * k * ps * (1 + pad * 2), uy * k * ps * (1 + pad * 2), vx * k * ps * (1 + pad * 2), vy * k * ps * (1 + pad * 2), (g.ax - (ux + vx) * pad) * ps, (g.ay - (uy + vy) * pad) * ps);
    ctx.drawImage(tex, 0, 0);
    const s = W.surf[i];
    if (s !== S.NORMAL) {
      const crack = (s === S.CRUMBLE || s === S.GLASS) ? W.crack[i] : 0;
      if (s === S.BOOST || s === S.CONVEY || s === S.ICE || s === S.BOUNCE || s === S.ACID || s === S.GOO || s === S.GOAL || s === S.GLASS || crack > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, T, T); ctx.clip();
        TL.overlay(ctx, s, W.aux[i], t, W.seed[i], crack, 0);
        ctx.restore();
      }
    }
    ctx.setTransform(ps, 0, 0, ps, 0, 0);
    /* slope shading */
    const sxv = W.sx[i], syv = W.sy[i];
    if (sxv !== 0 || syv !== 0) {
      const nl = 1 / Math.sqrt(sxv * sxv + syv * syv + 1);
      const d = (-sxv * LIGHT[0] - syv * LIGHT[1] + LIGHT[2]) * nl - FLAT_L;
      if (d > 0.025) { ctx.fillStyle = 'rgba(210,235,255,' + Math.min(0.5, d * 1.5) + ')'; quad(ctx, g.ax, g.ay, g.bx, g.by, g.cx, g.cy, g.dx, g.dy); ctx.fill(); }
      else if (d < -0.025) { ctx.fillStyle = 'rgba(0,0,16,' + Math.min(0.62, -d * 1.7) + ')'; quad(ctx, g.ax, g.ay, g.bx, g.by, g.cx, g.cy, g.dx, g.dy); ctx.fill(); }
    }
  }

  /* neon edge where the floor meets open space (and no rail stands there) */
  function drawTrim(ctx, W, i, ix, iy, g) {
    const t = R.tiles, rm = W.rail[i];
    let started = false;
    ctx.strokeStyle = t.trim; ctx.lineWidth = Math.max(1, 1.5 * R.zoom);
    const edge = (bit, dx, dy, x0, y0, x1, y1) => {
      if (rm & bit) return;
      const j = W.idx(ix + dx, iy + dy);
      if (j >= 0 && W.kind[j]) return;
      if (!started) { ctx.beginPath(); started = true; }
      ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    };
    edge(BIT.N, 0, -1, g.ax, g.ay, g.bx, g.by);
    edge(BIT.E, 1, 0, g.bx, g.by, g.cx, g.cy);
    edge(BIT.S, 0, 1, g.dx, g.dy, g.cx, g.cy);
    edge(BIT.W, -1, 0, g.ax, g.ay, g.dx, g.dy);
    if (started) ctx.stroke();
  }

  /* ---------------- guard rails ---------------- */
  function drawRails(ctx, W, i, ix, iy, mask, jx, jy) {
    const t = R.tiles, hw = R.hw, hh = R.hh, zs = R.zs, rh = C.RAIL_H, th = C.RAIL_T;
    const hz = W.hz[i] + W.dz[i], sxv = W.sx[i], syv = W.sy[i];
    const base = (px, py) => hz + sxv * (px - ix) + syv * (py - iy);
    const X = (x, y) => R.ox + (x - y) * hw + jx, Y = (x, y, z) => R.oy + (x + y) * hh - z * zs + jy;
    for (let bit = 1; bit <= 8; bit <<= 1) {
      if (!(mask & bit)) continue;
      let x0 = ix, x1 = ix + 1, y0 = iy, y1 = iy + 1;
      if (bit === BIT.N) y1 = iy + th; else if (bit === BIT.S) y0 = iy + 1 - th; else if (bit === BIT.E) x0 = ix + 1 - th; else x1 = ix + th;
      const b00 = base(x0, y0), b10 = base(x1, y0), b11 = base(x1, y1), b01 = base(x0, y1);
      /* +y face (down-left) then +x face (down-right) then top */
      ctx.fillStyle = t.railY; quad(ctx, X(x0, y1), Y(x0, y1, b01 + rh), X(x1, y1), Y(x1, y1, b11 + rh), X(x1, y1), Y(x1, y1, b11), X(x0, y1), Y(x0, y1, b01)); ctx.fill();
      ctx.fillStyle = t.railX; quad(ctx, X(x1, y0), Y(x1, y0, b10 + rh), X(x1, y1), Y(x1, y1, b11 + rh), X(x1, y1), Y(x1, y1, b11), X(x1, y0), Y(x1, y0, b10)); ctx.fill();
      ctx.fillStyle = t.railTop; quad(ctx, X(x0, y0), Y(x0, y0, b00 + rh), X(x1, y0), Y(x1, y0, b10 + rh), X(x1, y1), Y(x1, y1, b11 + rh), X(x0, y1), Y(x0, y1, b01 + rh)); ctx.fill();
      /* glowing core line */
      const mx0 = (x0 + x1) / 2, my0 = (y0 + y1) / 2;
      let ax, ay, bx, by, za, zb;
      if (bit === BIT.N || bit === BIT.S) { ax = ix + 0.04; bx = ix + 0.96; ay = by = my0; } else { ay = iy + 0.04; by = iy + 0.96; ax = bx = mx0; }
      za = base(ax, ay) + rh; zb = base(bx, by) + rh;
      ctx.strokeStyle = t.railLamp; ctx.lineWidth = Math.max(1, 1.5 * R.zoom); ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(X(ax, ay), Y(ax, ay, za)); ctx.lineTo(X(bx, by), Y(bx, by, zb)); ctx.stroke(); ctx.globalAlpha = 1;
      /* a lamp glows on every few rails */
      if ((((ix * 5 + iy * 3 + bit) & 3) === 0) && R.zoom > 0.45) {
        const mx = (ax + bx) / 2, my = (ay + by) / 2, lz = (za + zb) / 2;
        ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, t.lampRgba, X(mx, my), Y(mx, my, lz + 0.05), 17 * R.zoom, 0.85); ctx.globalCompositeOperation = 'source-over';
      }
    }
  }

  R.drawCell = function (ctx, W, i, ix, iy, t, sides, top, rails) {
    let jx = 0, jy = 0;
    if ((W.surf[i] === S.CRUMBLE || W.surf[i] === S.GLASS) && W.crack[i] > 0.05) { const a = W.crack[i] * 1.6 * R.zoom; jx = Math.sin(t * 61 + i) * a; jy = Math.cos(t * 53 + i * 3) * a * 0.6; }
    if (sides) { sideFace(ctx, W, i, ix, iy, 0); sideFace(ctx, W, i, ix, iy, 1); }
    if (top) { const g = cellGeom(W, i, ix, iy, jx, jy); drawTop(ctx, W, i, ix, iy, g, t); drawTrim(ctx, W, i, ix, iy, g); }
    if (rails && W.rail[i]) drawRails(ctx, W, i, ix, iy, rails === true ? W.rail[i] : (W.rail[i] & rails), jx, jy);
  };

  /* ---------------- terrain pass ---------------- */
  R.drawTerrain = function (ctx, t) {
    const W = R.world, box = visibleBox(W), hw = R.hw, hh = R.hh, zs = R.zs;
    ctx.setTransform(R.ps, 0, 0, R.ps, 0, 0);
    ctx.lineJoin = 'round';
    const d0 = box.x0 + box.y0, d1 = box.x1 + box.y1;
    const m = hw * 1.4, wmax = R.W + m, hmax = R.H + 90 * 1;
    R.cellCount = 0;
    for (let d = d0; d <= d1; d++) {
      const xa = Math.max(box.x0, d - box.y1), xb = Math.min(box.x1, d - box.y0);
      for (let x = xa; x <= xb; x++) {
        const y = d - x, i = y * W.w + x;
        const sxp = R.ox + (x - y) * hw, syp = R.oy + (x + y) * hh;
        if (sxp < -m || sxp > wmax) continue;
        if (W.kind[i] !== 1) { if (W.regrow[i] > 0) ghostTile(ctx, W, i, x, y, t); continue; }
        const zt = W.hz[i] + W.dz[i] + Math.max(0, W.sx[i]) + Math.max(0, W.sy[i]);
        if (syp - zt * zs - C.RAIL_H * zs - 12 > R.H || syp + 2 * hh - (W.hz[i] + W.dz[i]) * zs + 1.2 * zs < -10) continue;
        R.cellCount++;
        R.drawCell(ctx, W, i, x, y, t, true, true, true);
      }
    }
  };
  function ghostTile(ctx, W, i, ix, iy, t) {
    const g = cellGeom(W, i, ix, iy, 0, 0), a = 0.25 + 0.2 * Math.sin(t * 9 + i);
    ctx.strokeStyle = 'rgba(120,230,255,' + a + ')'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    quad(ctx, g.ax, g.ay, g.bx, g.by, g.cx, g.cy, g.dx, g.dy); ctx.stroke(); ctx.setLineDash([]);
  }

  /* things standing in front of an entity are drawn again on top of it: rails and anything taller than the entity */
  R.redrawFront = function (ctx, ex, ey, ez, t, pad) {
    const W = R.world, mx = Math.floor(ex), my = Math.floor(ey), dm = mx + my, hw = R.hw, hh = R.hh, zs = R.zs;
    const bx0 = R.ox + (ex - ey) * hw - 28 * R.zoom - (pad || 0), bx1 = bx0 + 56 * R.zoom + (pad || 0) * 2;
    const by1 = R.oy + (ex + ey) * hh - ez * zs + 14 * R.zoom, by0 = by1 - 72 * R.zoom - (pad || 0);
    for (let j = my - 1; j <= my + 3; j++) for (let i = mx - 1; i <= mx + 3; i++) {
      const ci = W.idx(i, j);
      if (ci < 0 || W.kind[ci] !== 1) continue;
      const d = i + j, own = i === mx && j === my;
      if (d < dm || (d === dm && !own)) continue;
      const sxp = R.ox + (i - j) * hw, syp = R.oy + (i + j) * hh;
      if (sxp + hw < bx0 || sxp - hw > bx1) continue;
      const top = W.hz[ci] + W.dz[ci], zhi = W.hz[ci] + W.dz[ci] + Math.max(0, W.sx[ci]) + Math.max(0, W.sy[ci]);
      if (syp + 2 * hh - top * zs < by0 - 30 || syp - zhi * zs - C.RAIL_H * zs > by1) continue;
      const tall = zhi > ez + 0.5 && !own;
      const rm = own ? (W.rail[ci] & (BIT.S | BIT.E)) : W.rail[ci];
      if (!tall && !rm) continue;
      R.drawCell(ctx, W, ci, i, j, t, tall, tall, rm || false);
    }
  };

  /* ---------------- shadows and decals ---------------- */
  R.shadow = function (ctx, x, y, zGround, z, rad, alpha) {
    if (zGround === -Infinity) return;
    const h = Math.max(0, z - zGround), k = 1 / (1 + h * 0.45);
    ctx.save();
    ctx.globalAlpha = alpha * k;
    ctx.fillStyle = 'rgba(0,0,10,1)';
    ctx.beginPath(); ctx.ellipse(R.sx(x, y), R.sy(x, y, zGround), rad * (0.7 + 0.3 * k), rad * (0.7 + 0.3 * k) * 0.5, 0, 0, TAU); ctx.fill();
    ctx.restore();
  };

  R.drawDecals = function (ctx) {
    for (const d of FX.decals) {
      const k = d.t / d.life, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, rnd = U.mulberry(d.seed);
      const n = 7;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let pass = 0; pass < 2; pass++) {
        const r2 = U.mulberry(d.seed);
        ctx.strokeStyle = pass === 0 ? 'rgba(0,0,12,' + 0.8 * a + ')' : 'rgba(255,200,140,' + 0.85 * a + ')';
        ctx.lineWidth = (pass === 0 ? 3.6 : 1.4) * R.zoom;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          let ang = d.rot + (i / n) * TAU + r2() * 0.5, len = d.size * (0.55 + r2() * 0.6), px = d.x, py = d.y;
          ctx.moveTo(R.sx(px, py), R.sy(px, py, d.z));
          for (let s = 0; s < 4; s++) { ang += (r2() - 0.5) * 0.9; px += Math.cos(ang) * len / 4; py += Math.sin(ang) * len / 4; ctx.lineTo(R.sx(px, py), R.sy(px, py, d.z)); }
        }
        ctx.stroke();
      }
    }
  };
})((window.SGS = window.SGS || {}));
