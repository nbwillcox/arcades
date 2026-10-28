/* The CPU opponent: scores every landing spot for the current piece (and the held one) with a classic stack heuristic, then "presses keys" at a human-ish pace. */
(function (G) {
  'use strict';
  const K = G.core, A = {};
  G.ai = A;
  const W = { h: -0.51, lines: 0.76, holes: -0.36, bump: -0.18 };
  function evaluate(grid, cols, rows, t, r, x) {
    const sh = K.SHAPES[t][r];
    // drop
    let y = 0; const ok = (yy) => { for (let i = 0; i < 4; i++) { const cx = x + sh[i][0], cy = yy + sh[i][1]; if (cx < 0 || cx >= cols || cy >= rows || (cy >= 0 && grid[cy * cols + cx])) return false; } return true; };
    if (!ok(0)) return null;
    while (ok(y + 1)) y++;
    const g = grid.slice(); for (let i = 0; i < 4; i++) g[(y + sh[i][1]) * cols + x + sh[i][0]] = 1;
    let lines = 0;
    for (let yy = rows - 1; yy >= 0; yy--) { let f = true; for (let xx = 0; xx < cols; xx++) if (!g[yy * cols + xx]) { f = false; break; } if (f) { lines++; g.copyWithin(cols, 0, yy * cols); g.fill(0, 0, cols); yy++; } }
    const hts = []; let holes = 0, agg = 0, maxH = 0;
    for (let xx = 0; xx < cols; xx++) { let top = rows; for (let yy = 0; yy < rows; yy++) if (g[yy * cols + xx]) { top = yy; break; } const h = rows - top; hts.push(h); agg += h; maxH = Math.max(maxH, h); for (let yy = top; yy < rows; yy++) if (!g[yy * cols + xx]) holes++; }
    let bump = 0; for (let i = 0; i < cols - 1; i++) bump += Math.abs(hts[i] - hts[i + 1]);
    const lineW = lines >= 4 ? 1.9 : lines;
    return W.h * agg + W.lines * lineW + W.holes * holes + W.bump * bump - (maxH > 14 ? (maxH - 14) * 0.7 : 0) - (maxH > 17 ? 3 : 0);
  }
  /* list of {score, r, x} for a piece type */
  function options(t, tet) {
    const out = [];
    for (let r = 0; r < (t === 2 ? 1 : t === 1 || t === 4 || t === 5 ? 2 : 4); r++) for (let x = -2; x < tet.cols; x++) { const s = evaluate(tet.grid, tet.cols, tet.rows, t, r, x); if (s !== null) out.push({ s, r, x }); }
    return out;
  }
  A.make = function (tet, opp) {
    const me = { tet, opp, t: 0, plan: null, wait: 0.5 };
    me.replan = function () {
      const p = tet.cur; if (!p) return null;
      let best = null; const cand = options(p.t, tet).sort((a, b) => b.s - a.s);
      if (cand.length) { const n = Math.min(cand.length, 1 + (Math.random() < opp.err * 2 ? 3 : 0)); best = cand[Math.floor(Math.random() * n)]; if (Math.random() < opp.err * 0.5) best = cand[Math.floor(Math.random() * cand.length)]; }
      let useHold = false;
      if (opp.hold && tet.canHold) {
        const alt = tet.hold ? tet.hold.t : tet.queue[0].t, ac = options(alt, tet).sort((a, b) => b.s - a.s);
        if (ac.length && (!best || ac[0].s > best.s + 0.6)) { useHold = true; best = ac[0]; }
      }
      me.plan = best ? { r: best.r, x: best.x, hold: useHold, p } : { r: 0, x: p.x, hold: false, p };
    };
    me.update = function (dt) {
      if (tet.state !== 'play' || !tet.cur) { me.plan = null; return; }
      me.wait -= dt; if (me.wait > 0) return;
      me.wait = 1 / (opp.pps * 6.5) * (0.8 + Math.random() * 0.4);
      if (!me.plan || me.plan.p !== tet.cur) { if (me.plan && me.plan.hold && me.plan.done) { /* held: plan for new piece */ } me.replan(); }
      const pl = me.plan, p = tet.cur;
      if (pl.hold) { pl.hold = false; pl.done = true; tet.holdPiece(); me.plan = null; return; }
      if (p.r !== pl.r) { const d = (pl.r - p.r + 4) % 4; if (!tet.rotate(d === 3 ? -1 : 1)) { tet.rotate(1); } return; }
      if (p.x < pl.x) { if (!tet.move(1)) pl.x = p.x; return; }
      if (p.x > pl.x) { if (!tet.move(-1)) pl.x = p.x; return; }
      tet.hardDrop(); me.plan = null;
    };
    return me;
  };
})(typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {}));
