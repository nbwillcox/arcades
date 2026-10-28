/* Pure rules: free-tile test, solvable dealing (built backwards so every deal can be cleared), reshuffle and move finding. No DOM, so Node can test it. */
(function (G) {
  'use strict';
  const K = {};
  G.core = K;
  /* face ids: 0-8 orbs, 9-17 rods, 18-26 numerals, 27-30 winds, 31-33 dragons, 34-37 flowers (match any flower), 38-41 seasons (match any season) */
  K.NFACE = 42;
  K.key = (f) => (f >= 38 ? 101 : f >= 34 ? 100 : f);
  K.match = (a, b) => K.key(a) === K.key(b);
  K.build = function (tiles) {
    const n = tiles.length, x = [], y = [], z = [], above = [], left = [], right = [];
    for (const t of tiles) { x.push(t[0]); y.push(t[1]); z.push(t[2]); }
    for (let i = 0; i < n; i++) {
      above.push([]); left.push([]); right.push([]);
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const dx = x[j] - x[i], dy = y[j] - y[i];
        if (z[j] > z[i] && Math.abs(dx) < 2 && Math.abs(dy) < 2) above[i].push(j);
        else if (z[j] === z[i] && Math.abs(dy) < 2) { if (dx === -2) left[i].push(j); else if (dx === 2) right[i].push(j); }
      }
    }
    return { n, x, y, z, above, left, right };
  };
  K.free = function (L, alive, i) {
    if (!alive[i]) return false;
    const a = L.above[i]; for (let k = 0; k < a.length; k++) if (alive[a[k]]) return false;
    let l = true, ls = L.left[i]; for (let k = 0; k < ls.length; k++) if (alive[ls[k]]) { l = false; break; }
    if (l) return true;
    const rs = L.right[i]; for (let k = 0; k < rs.length; k++) if (alive[rs[k]]) return false;
    return true;
  };
  K.freeList = function (L, alive) { const o = []; for (let i = 0; i < L.n; i++) if (K.free(L, alive, i)) o.push(i); return o; };
  /* which tiles stop tile i from being free right now (for the red "blocked by" flash) */
  K.blockers = function (L, alive, i) {
    const o = []; for (const j of L.above[i]) if (alive[j]) o.push(j);
    if (o.length) return o;
    const lb = L.left[i].filter((j) => alive[j]), rb = L.right[i].filter((j) => alive[j]);
    return lb.length && rb.length ? lb.concat(rb) : o;
  };
  K.moves = function (L, alive, faces) {
    const f = K.freeList(L, alive), out = [];
    for (let a = 0; a < f.length; a++) for (let b = a + 1; b < f.length; b++) if (K.match(faces[f[a]], faces[f[b]])) out.push([f[a], f[b]]);
    return out;
  };
  K.deckPairs = function (npairs, rng) {
    rng = rng || Math.random;
    const kinds = [];
    for (let k = 0; k < 34; k++) kinds.push([[k, k], [k, k]]);
    const fl = G.U.shuffle([34, 35, 36, 37], rng), se = G.U.shuffle([38, 39, 40, 41], rng);
    kinds.push([[fl[0], fl[1]], [fl[2], fl[3]]], [[se[0], se[1]], [se[2], se[3]]]);
    G.U.shuffle(kinds, rng);
    const pairs = [];
    for (const k of kinds) for (const p of k) if (pairs.length < npairs) pairs.push(p);
    return pairs;
  };
  /* place the pairs in order onto positions that are free at that moment; replaying the order clears the board */
  K.assign = function (L, positions, pairs, rng) {
    rng = rng || Math.random;
    const alive = new Array(L.n).fill(false), faces = new Array(L.n).fill(0), order = [];
    for (const i of positions) alive[i] = true;
    for (const p of pairs) {
      const f = K.freeList(L, alive);
      if (f.length < 2) return null;
      const ai = Math.floor(rng() * f.length); let bi = Math.floor(rng() * (f.length - 1)); if (bi >= ai) bi++;
      const a = f[ai], b = f[bi];
      faces[a] = p[0]; faces[b] = p[1]; alive[a] = alive[b] = false; order.push([a, b]);
    }
    return { faces, order };
  };
  K.deal = function (L, rng) {
    rng = rng || Math.random;
    const pos = []; for (let i = 0; i < L.n; i++) pos.push(i);
    for (let t = 0; t < 600; t++) {
      const r = K.assign(L, pos, G.U.shuffle(K.deckPairs(L.n >> 1, rng), rng), rng);
      if (r) return r;
    }
    return null;
  };
  /* new faces for the tiles still on the board, same multiset, still solvable */
  K.reshuffle = function (L, alive, faces, rng) {
    rng = rng || Math.random;
    const pos = [], groups = {};
    for (let i = 0; i < L.n; i++) if (alive[i]) { pos.push(i); (groups[K.key(faces[i])] = groups[K.key(faces[i])] || []).push(faces[i]); }
    const pairs = [];
    for (const k in groups) { const g = G.U.shuffle(groups[k].slice(), rng); for (let i = 0; i + 1 < g.length; i += 2) pairs.push([g[i], g[i + 1]]); }
    for (let t = 0; t < 600; t++) {
      const r = K.assign(L, pos, G.U.shuffle(pairs.slice(), rng), rng);
      if (r) { const out = faces.slice(); for (const i of pos) out[i] = r.faces[i]; return { faces: out, order: r.order }; }
    }
    return null;
  };
  if (typeof module !== 'undefined') module.exports = K;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));
