/* Moving platforms (one-way tops). A mover: { x, y, w, axis: 'x' | 'y', a, b, speed }, x = centre, y = top surface; it travels between a and b along its axis. Riders are carried. */
(function (G) {
  'use strict';
  const M = {};
  G.movers = M;
  M.setup = function (g, def) {
    g.movers = (def.movers || []).map((m) => Object.assign({ dir: 1, wait: 0, dx: 0, dy: 0, t: 0 }, m, { x: m.axis === 'x' ? m.a : m.x, y: m.axis === 'y' ? m.a : m.y }));
  };
  M.rects = (g) => (g.movers || []).map((m) => ({ x0: m.x - m.w / 2, x1: m.x + m.w / 2, y: m.y, mover: m }));
  M.update = function (g) {
    const p = g.P;
    for (const m of g.movers || []) {
      const ride = !p.dead && p.ground && Math.abs(p.y - m.y) <= 1.5 && p.x + p.w / 2 > m.x - m.w / 2 && p.x - p.w / 2 < m.x + m.w / 2;
      m.t++;
      if (m.wait > 0) { m.wait--; m.dx = m.dy = 0; continue; }
      const px = m.x, py = m.y, k = m.axis === 'x' ? 'x' : 'y';
      m[k] += m.dir * m.speed;
      if ((m.dir > 0 && m[k] >= m.b) || (m.dir < 0 && m[k] <= m.a)) { m[k] = m.dir > 0 ? m.b : m.a; m.dir = -m.dir; m.wait = 40; }
      m.dx = m.x - px; m.dy = m.y - py;
      if (ride) { p.x += m.dx; p.y += m.dy; }
    }
  };
  M.draw = function (ctx, g) {
    for (const m of g.movers || []) {
      const x = Math.round(m.x - m.w / 2), y = Math.round(m.y), w = m.w;
      ctx.fillStyle = '#46283a'; ctx.fillRect(x, y + 2, w, 7); ctx.fillStyle = '#946454'; ctx.fillRect(x, y, w, 3); ctx.fillStyle = '#c8a08a'; ctx.fillRect(x + 1, y, w - 2, 1);
      ctx.fillStyle = '#140c14'; ctx.fillRect(x, y + 8, w, 1); for (let i = 4; i < w - 3; i += 8) { ctx.fillStyle = Math.floor(m.t / 8 + i) % 2 ? '#ffc858' : '#ee8a2c'; ctx.fillRect(x + i, y + 4, 3, 2); }
      ctx.fillStyle = '#2a1822'; ctx.fillRect(x + 2, y + 9, w - 4, 2);
    }
  };
})((window.SGS = window.SGS || {}));
