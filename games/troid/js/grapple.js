/* Grapple beam: press Q near a ceiling anchor (tile G) to be reeled in and hang; Jump leaps from it, releasing Q drops you. */
(function (G) {
  'use strict';
  const PH = G.phys, GR = {};
  G.grapple = GR;
  const RANGE = 160;
  const clear = (room, x0, y0, x1, y1) => { for (let i = 1; i < 8; i++) { const x = x0 + (x1 - x0) * i / 8, y = y0 + (y1 - y0) * i / 8; if (G.room.solidAt(room, Math.floor(x / 16), Math.floor(y / 16))) return false; } return true; };
  GR.find = function (room, p) {
    let best = null, bd = 1e9;
    for (const a of room.anchors) {
      const dx = a.x - p.x, dy = a.y - (p.y - p.h * 0.7), d = Math.hypot(dx, dy);
      if (dy < -36 && d < RANGE && d < bd && clear(room, p.x, p.y - p.h * 0.7, a.x, a.y)) { best = a; bd = d; }
    }
    return best;
  };
  GR.update = function (g) {
    const p = g.P, A = g.abil, I = G.input.held, D = G.input.down, room = g.room;
    if (!A.grapple || p.dead || p.mode !== 'stand' || p.hurt > 0) { p.grap = null; return false; }
    if (p.grap) {
      if (!I.grapple || D.jump) { if (D.jump) { p.vy = -4.8; p.jumping = true; p.airJumps = A.spacejump ? 1 : 0; } p.grap = null; return false; }
      const hx = p.grap.x, hy = p.grap.y + 8 + p.h * 0.88, dx = hx - p.x, dy = hy - p.y, d = Math.hypot(dx, dy);
      p.vx = p.vy = 0; p.ground = false; p.dash = 0; p.spinning = false;
      if (d > 3) {
        const k = Math.min(6, d) / d, bx = p.x, by = p.y;
        PH.moveX(room, p, dx * k); PH.moveY(room, p, dy * k, true);
        if (Math.abs(p.x - bx) + Math.abs(p.y - by) < 0.5) { p.grap = null; return false; }
      } else { p.x = hx; p.y = hy; }
      p.face = I.l ? -1 : I.r ? 1 : p.face; return true;
    }
    if (D.grapple) { const a = GR.find(room, p); if (a) { p.grap = a; G.audio.sfx('door'); } }
    return !!p.grap;
  };
  GR.draw = function (ctx, g, time) {
    for (const a of g.room.anchors || []) {
      const x = Math.round(a.x), y = Math.round(a.y), f = Math.floor(time * 3) & 1;
      ctx.fillStyle = '#2e3452'; ctx.fillRect(x - 4, y - 4, 8, 8); ctx.fillStyle = '#98a6ca'; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = '#10142e'; ctx.fillRect(x - 1, y - 1, 3, 3);
      ctx.fillStyle = f ? '#86f0f2' : '#2cbad8'; ctx.fillRect(x - 1, y + 4, 3, 2); ctx.fillRect(x - 5, y - 1, 1, 3); ctx.fillRect(x + 5, y - 1, 1, 3);
    }
    const p = g.P; if (!p.grap) return;
    const x0 = p.x + p.face * 3, y0 = p.y - p.h + 6, x1 = p.grap.x, y1 = p.grap.y + 6, n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
    for (let i = 0; i <= n; i++) { ctx.fillStyle = i % 4 < 2 ? '#86f0f2' : '#f2ffff'; ctx.fillRect(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), 2, 2); }
  };
})((window.SGS = window.SGS || {}));
