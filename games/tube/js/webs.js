/* The webs: sixteen tube cross-sections (closed loops and open flat ones), each a polygon of rim vertices. Lanes run between neighbouring vertices; a position in the tube is (u, d) with u the lane position
   along the rim (lane i spans u = i .. i+1) and d the depth: 0 at the far end, 1 at the rim. Everything is projected with a simple perspective. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, TAU = U.TAU;
  const Wb = {};

  function subdiv(pts, subs, closed) {
    const out = [], n = pts.length, edges = closed ? n : n - 1;
    for (let i = 0; i < edges; i++) {
      const a = pts[i], b = pts[(i + 1) % n], k = Array.isArray(subs) ? subs[i] : subs;
      for (let j = 0; j < k; j++) out.push([a[0] + (b[0] - a[0]) * j / k, a[1] + (b[1] - a[1]) * j / k]);
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  const param = (n, fn) => { const o = []; for (let i = 0; i < n; i++) o.push(fn(i / n * TAU)); return o; };
  const line = (n, fn) => { const o = []; for (let i = 0; i < n; i++) o.push(fn(-1 + 2 * i / (n - 1))); return o; };

  const DEFS = [
    { name: 'CIRCLE', closed: true, pts: () => param(16, (a) => [Math.cos(a), Math.sin(a)]) },
    { name: 'SQUARE', closed: true, pts: () => subdiv([[-1, -1], [1, -1], [1, 1], [-1, 1]], 4, true) },
    { name: 'PLUS', closed: true, pts: () => subdiv([[-0.34, -1], [0.34, -1], [0.34, -0.34], [1, -0.34], [1, 0.34], [0.34, 0.34], [0.34, 1], [-0.34, 1], [-0.34, 0.34], [-1, 0.34], [-1, -0.34], [-0.34, -0.34]], 1, true) },
    { name: 'BOWTIE', closed: true, pts: () => subdiv([[-1, -0.7], [0, -0.15], [1, -0.7], [1, 0.7], [0, 0.15], [-1, 0.7]], [2, 2, 3, 2, 2, 3], true) },
    { name: 'STAR', closed: true, pts: () => param(10, (a) => { const k = Math.round(a / TAU * 10), r = k % 2 ? 0.46 : 1; return [Math.sin(a) * r, -Math.cos(a) * r]; }) },
    { name: 'TRIANGLE', closed: true, pts: () => subdiv([[0, -1], [0.95, 0.8], [-0.95, 0.8]], 5, true) },
    { name: 'HEART', closed: true, pts: () => param(16, (a) => [16 * Math.pow(Math.sin(a), 3) / 17, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 17]) },
    { name: 'INFINITY', closed: true, pts: () => param(16, (a) => { const s = 1 + Math.sin(a) * Math.sin(a); return [Math.cos(a) / s, Math.sin(a) * Math.cos(a) / s * 1.4]; }) },
    { name: 'FLOWER', closed: true, pts: () => param(16, (a) => { const r = 0.72 + 0.28 * Math.cos(a * 4); return [Math.cos(a) * r, Math.sin(a) * r]; }) },
    { name: 'HEXAGON', closed: true, pts: () => subdiv(param(6, (a) => [Math.sin(a), -Math.cos(a)]), 3, true) },
    { name: 'OVAL', closed: true, pts: () => param(16, (a) => [Math.cos(a), Math.sin(a) * 0.55]) },
    { name: 'FLAT', closed: false, pts: () => line(15, (x) => [x, 0.82]) },
    { name: 'VEE', closed: false, pts: () => subdiv([[-1, -0.35], [0, 0.85], [1, -0.35]], 7, false) },
    { name: 'BOWL', closed: false, pts: () => line(15, (x) => [x, -0.5 + 1.35 * x * x]) },
    { name: 'STEPS', closed: false, pts: () => subdiv([[-1, 0.85], [-0.5, 0.85], [-0.5, 0.45], [0, 0.45], [0, 0.05], [0.5, 0.05], [0.5, -0.35], [1, -0.35]], [2, 1, 2, 1, 2, 1, 2], false) },
    { name: 'ZIGZAG', closed: false, pts: () => subdiv([[-1, 0.55], [-0.5, -0.45], [0, 0.55], [0.5, -0.45], [1, 0.55]], 3, false) },
  ];
  Wb.COUNT = DEFS.length;

  const cache = {};
  function build(idx) {
    if (cache[idx]) return cache[idx];
    const d = DEFS[idx];
    let pts = d.pts();
    if (d.closed) {                                              /* put the vanishing point at the centre of mass and fill the frame */
      let cx = 0, cy = 0;
      pts.forEach((p) => { cx += p[0]; cy += p[1]; });
      cx /= pts.length; cy /= pts.length;
      pts = pts.map((p) => [p[0] - cx, p[1] - cy]);
    }
    const mx = pts.reduce((m, p) => Math.max(m, Math.abs(p[0]), Math.abs(p[1])), 0);
    const V = pts.map((p) => ({ x: p[0] / mx, y: p[1] / mx }));
    const n = V.length, lanes = d.closed ? n : n - 1, mid = [];
    for (let l = 0; l < lanes; l++) {
      const a = V[l], b = V[(l + 1) % n];
      mid.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    }
    return (cache[idx] = { idx, name: d.name, closed: d.closed, V, n, lanes, mid });
  }

  const SC = 1 / C.K0 - 1;
  const scale = (d) => 1 / (1 + SC * (1 - U.clamp(d, 0, 1)));
  Wb.scale = scale;

  Wb.make = function (level) {
    const w = Object.assign({}, build((level - 1) % DEFS.length));
    w.level = level;
    w.theme = C.THEMES[Math.floor((level - 1) / 1) % C.THEMES.length];
    w.wrap = (u) => (w.closed ? ((u % w.lanes) + w.lanes) % w.lanes : U.clamp(u, 0, w.lanes));
    /* signed shortest lane distance from a to b */
    w.delta = (a, b) => { let d = b - a; if (w.closed) { const L = w.lanes; d = ((d % L) + L) % L; if (d > L / 2) d -= L; } return d; };
    /* the rim point (normalized coordinates) at lane position u */
    w.rim = (u, out) => {
      let i = Math.floor(u), f = u - i;
      if (w.closed) i = ((i % w.n) + w.n) % w.n; else if (i < 0) { i = 0; f = 0; } else if (i >= w.lanes) { i = w.lanes - 1; f = 1; }
      const a = w.V[i], b = w.V[(i + 1) % w.n];
      out.x = a.x + (b.x - a.x) * f; out.y = a.y + (b.y - a.y) * f;
      return out;
    };
    const tmp = { x: 0, y: 0 };
    /* screen position at (u, d) */
    w.at = (u, d, out) => {
      w.rim(u, tmp);
      const s = scale(d);
      out.x = C.CX + tmp.x * C.R * s; out.y = C.CY + tmp.y * C.R * s;
      out.s = s;
      return out;
    };
    /* unit tangent of lane l (along the rim) in screen space, and the lane's width in pixels at depth d */
    w.tangent = (l, out) => {
      l = w.closed ? ((Math.floor(l) % w.n) + w.n) % w.n : U.clamp(Math.floor(l), 0, w.lanes - 1);
      const a = w.V[l], b = w.V[(l + 1) % w.n], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      out.x = dx / len; out.y = dy / len; out.len = len * C.R;
      return out;
    };
    /* the lane whose rim midpoint is closest to a pointer in logical canvas coordinates */
    w.laneAtPoint = (px, py) => {
      let best = 0;
      if (w.closed) {
        const a = Math.atan2(py - C.CY, px - C.CX);
        let bd = 1e9;
        for (let l = 0; l < w.lanes; l++) {
          const m = w.mid[l], da = Math.abs(Math.atan2(Math.sin(Math.atan2(m.y, m.x) - a), Math.cos(Math.atan2(m.y, m.x) - a)));
          if (da < bd) { bd = da; best = l; }
        }
      } else {
        let bd = 1e9;
        for (let l = 0; l < w.lanes; l++) {
          const m = w.mid[l], d = Math.abs(C.CX + m.x * C.R - px);
          if (d < bd) { bd = d; best = l; }
        }
      }
      return best;
    };
    return w;
  };

  G.webs = Wb;
})((window.SGS = window.SGS || {}));
