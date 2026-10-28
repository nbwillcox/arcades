/* The tile world: typed arrays for every cell plus the height / surface queries that physics and rendering share. DOM-free so it can run in Node. */
(function (G) {
  'use strict';
  const C = G.C;
  const N = 1, E = 2, S = 4, Wb = 8;                                     /* rail edge bits: north = y-, east = x+, south = y+, west = x- */

  function World(w, d) {
    this.w = w; this.d = d;
    const n = w * d;
    this.kind = new Uint8Array(n);                                      /* 0 = empty space, 1 = tile */
    this.hz = new Float32Array(n);                                      /* height at the cell's (x, y) corner */
    this.sx = new Float32Array(n);                                      /* height gained per unit in +x */
    this.sy = new Float32Array(n);
    this.surf = new Uint8Array(n);
    this.aux = new Uint8Array(n);                                       /* direction for boost / conveyor strips (0 +x, 1 +y, 2 -x, 3 -y) */
    this.rail = new Uint8Array(n);
    this.mat = new Uint8Array(n);                                       /* material variant for the texture */
    this.seed = new Uint8Array(n);
    this.dz = new Float32Array(n);                                      /* live height offset (lifts, gates, pistons) */
    this.crack = new Float32Array(n);                                   /* crumble progress 0..1 */
    this.regrow = new Float32Array(n);                                  /* seconds until a broken crumble tile re-forms */
    this.shake = new Float32Array(n);                                   /* crumble tile tremor (render) */
    this.zmin = 0; this.zmax = 0;
  }
  const P = World.prototype;
  P.idx = function (ix, iy) { return (ix < 0 || iy < 0 || ix >= this.w || iy >= this.d) ? -1 : iy * this.w + ix; };
  P.solid = function (ix, iy) { const i = this.idx(ix, iy); return i >= 0 && this.kind[i] === 1; };
  /* surface height under a point; -Infinity where there is no tile */
  P.heightAt = function (x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    if (ix < 0 || iy < 0 || ix >= this.w || iy >= this.d) return -Infinity;
    const i = iy * this.w + ix;
    if (this.kind[i] !== 1) return -Infinity;
    return this.hz[i] + this.sx[i] * (x - ix) + this.sy[i] * (y - iy) + this.dz[i];
  };
  /* height of one corner of a cell (cx, cy in {0, 1}) */
  P.corner = function (i, cx, cy) { return this.hz[i] + this.sx[i] * cx + this.sy[i] * cy + this.dz[i]; };
  P.cellMax = function (i) { return this.hz[i] + this.dz[i] + Math.max(0, this.sx[i]) + Math.max(0, this.sy[i]); };
  P.cellMin = function (i) { return this.hz[i] + this.dz[i] + Math.min(0, this.sx[i]) + Math.min(0, this.sy[i]); };
  P.bounds = function () {
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < this.kind.length; i++) if (this.kind[i] === 1) { lo = Math.min(lo, this.cellMin(i)); hi = Math.max(hi, this.cellMax(i)); }
    this.zmin = isFinite(lo) ? lo : 0; this.zmax = isFinite(hi) ? hi : 0;
  };
  World.BIT = { N, E, S, W: Wb };
  G.World = World;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));
