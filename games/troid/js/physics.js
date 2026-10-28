/* Tile collision for boxes (x = centre, y = feet): pixel-stepped axis moves, one-way ledges, 45-degree slopes followed by the foot centre. */
(function (G) {
  'use strict';
  const T = 16, RM = G.room, E = 0.001;
  const P = {};
  G.phys = P;
  const fl = Math.floor;
  P.boxSolid = function (room, l, t, r, b) {
    for (let ty = fl(t / T); ty <= fl((b - E) / T); ty++) for (let tx = fl(l / T); tx <= fl((r - E) / T); tx++) if (RM.solidAt(room, tx, ty)) return true;
    return false;
  };
  P.boxTiles = function (room, l, t, r, b, kind) {
    for (let ty = fl(t / T); ty <= fl((b - E) / T); ty++) for (let tx = fl(l / T); tx <= fl((r - E) / T); tx++) if (RM.at(room, tx, ty) === kind) return true;
    return false;
  };
  /* highest walkable surface y within [yA, yB] under the body; slopes sample the centre column only */
  P.support = function (room, b, yA, yB, drop, slopesOnly) {
    let best = null;
    const l = b.x - b.w / 2, r = b.x + b.w / 2, cx = fl(b.x);
    for (let ty = fl(yA / T); ty <= fl(yB / T); ty++) {
      for (let tx = fl(l / T); tx <= fl((r - E) / T); tx++) {
        const k = RM.at(room, tx, ty);
        if (!k || k === 8 || k === 11 || k === 14 || k === 15 || (k === 16 && !room.scanOn)) continue;
        let s;
        if (k === 3 || k === 4) {
          /* feet are narrower than the body on slopes: sample the foot columns centre +-3 and rest on the highest one */
          s = null;
          for (let fx = cx - 3; fx <= cx + 3; fx++) if (fl(fx / T) === tx) { const v = RM.surface(k, ty, fx - tx * T); if (s === null || v < s) s = v; }
          if (s === null) continue;
        }
        else { if (slopesOnly) continue; if (k === 2 && drop) continue; s = ty * T; }
        if (s >= yA - E && s <= yB + E && (best === null || s < best)) best = s;
      }
    }
    /* frozen enemies act as one-way platforms */
    if (room.dyn && !drop) for (const q of room.dyn) if (l < q.x1 && r > q.x0 && q.y >= yA - E && q.y <= yB + E && (best === null || q.y < best)) best = q.y;
    return best;
  };
  P.onGround = (room, b, drop) => P.support(room, b, b.y - E, b.y + 1, drop) !== null;
  /* stay glued to slopes when walking up or down them */
  P.follow = function (room, b) {
    const s = P.support(room, b, b.y - 4, b.y + 9, true, true);
    b.onSlope = s !== null;
    if (s !== null) { b.y = s; return true; }
    return false;
  };
  P.moveX = function (room, b, dx) {
    let hit = false;
    while (dx !== 0) {
      const st = Math.abs(dx) < 1 ? dx : Math.sign(dx);
      const nx = b.x + st;
      if (P.boxSolid(room, nx - b.w / 2, b.y - b.h, nx + b.w / 2, b.y - E)) {
        /* standing on a slope, the leading corner reaches the next step before the centre foot has climbed: lift up to 8px */
        let u = 0;
        if (b.ground && b.onSlope) for (let k = 1; k <= 8; k++) if (!P.boxSolid(room, nx - b.w / 2, b.y - k - b.h, nx + b.w / 2, b.y - k - E)) { u = k; break; }
        if (u) { b.y -= u; b.x = nx; dx -= st; continue; }
        b.vx = 0; hit = true; break;
      }
      b.x = nx; dx -= st;
      if (b.ground) P.follow(room, b);
    }
    return hit;
  };
  P.moveY = function (room, b, dy, drop) {
    b.bump = false;
    const moved = dy !== 0;
    while (dy !== 0) {
      const st = Math.abs(dy) < 1 ? dy : Math.sign(dy);
      if (st > 0) {
        const s = P.support(room, b, b.y, b.y + st, drop);
        if (s !== null) { b.y = s; b.vy = 0; b.ground = true; return; }
        b.y += st;
      } else {
        if (P.boxSolid(room, b.x - b.w / 2, b.y - b.h + st, b.x + b.w / 2, b.y - b.h)) { b.vy = 0; b.bump = true; return; }
        b.y += st;
      }
      dy -= st;
    }
    if (moved) b.ground = false;
  };
})((window.SGS = window.SGS || {}));
