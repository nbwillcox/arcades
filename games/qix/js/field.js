/* The playfield as a grid of cells. The claimed area is a set of cells; the player walks along the lattice lines (vertices) that separate claimed from unclaimed cells, or draws a trail through the open
   interior. Closing a trail splits the open area; every piece that holds no prowler is claimed. Directions: 1 up (-y), 2 left (-x), 3 down (+y), 4 right (+x). Pure logic, no drawing. */
(function (G) {
  'use strict';
  const DX = [0, 0, -1, 0, 1], DY = [0, -1, 0, 1, 0], OPP = [0, 3, 4, 1, 2];

  function Field(nx, ny) {
    this.nx = nx; this.ny = ny;
    this.claimed = new Uint8Array(nx * ny);           /* 0 open, 1 claimed, 2 claimed by a slow draw */
    this.wallH = new Uint8Array(nx * (ny + 1));       /* permanent lines inside the open area, between two open cells: edge from vertex (x,y) to (x+1,y) */
    this.wallV = new Uint8Array((nx + 1) * ny);       /* edge from vertex (x,y) to (x,y+1) */
    this.trailH = new Uint8Array(nx * (ny + 1));
    this.trailV = new Uint8Array((nx + 1) * ny);
    this.trailVert = new Uint8Array((nx + 1) * (ny + 1));
    this.trailCell = new Uint8Array(nx * ny);         /* cells touching the trail: the prowler dies if it touches these */
    this.trail = [];
    this.region = new Int16Array(nx * ny);
    this.regionArea = [0];
    this.claimedCount = 0;
    this.relabel();
  }
  const P = Field.prototype;
  P.reset = function () {
    this.claimed.fill(0); this.wallH.fill(0); this.wallV.fill(0); this.clearTrail(); this.claimedCount = 0; this.relabel();
  };
  P.inside = function (x, y) { return x >= 0 && y >= 0 && x < this.nx && y < this.ny; };
  P.cellClaimed = function (x, y) { return this.inside(x, y) ? this.claimed[y * this.nx + x] !== 0 : true; };
  P.cellOpen = function (x, y) { return this.inside(x, y) && this.claimed[y * this.nx + x] === 0; };

  /* edges are safe (walkable when not drawing) if claimed meets open, or if a permanent wall sits there */
  P.safeH = function (x, y) {                         /* horizontal edge (x,y)-(x+1,y) */
    if (x < 0 || x >= this.nx || y < 0 || y > this.ny) return false;
    return this.cellClaimed(x, y - 1) !== this.cellClaimed(x, y) || this.wallH[y * this.nx + x] === 1;
  };
  P.safeV = function (x, y) {                         /* vertical edge (x,y)-(x,y+1) */
    if (x < 0 || x > this.nx || y < 0 || y >= this.ny) return false;
    return this.cellClaimed(x - 1, y) !== this.cellClaimed(x, y) || this.wallV[y * (this.nx + 1) + x] === 1;
  };
  /* the edge leaving vertex (x,y) in direction d */
  P.edgeSafe = function (x, y, d) {
    switch (d) {
      case 1: return this.safeV(x, y - 1);
      case 3: return this.safeV(x, y);
      case 2: return this.safeH(x - 1, y);
      default: return this.safeH(x, y);
    }
  };
  /* a free edge runs between two open cells with no wall: the only kind a trail can use */
  P.edgeFree = function (x, y, d) {
    switch (d) {
      case 1: return y > 0 && x > 0 && x < this.nx && this.cellOpen(x - 1, y - 1) && this.cellOpen(x, y - 1) && !this.wallV[(y - 1) * (this.nx + 1) + x];
      case 3: return y < this.ny && x > 0 && x < this.nx && this.cellOpen(x - 1, y) && this.cellOpen(x, y) && !this.wallV[y * (this.nx + 1) + x];
      case 2: return x > 0 && y > 0 && y < this.ny && this.cellOpen(x - 1, y - 1) && this.cellOpen(x - 1, y) && !this.wallH[y * this.nx + x - 1];
      default: return x < this.nx && y > 0 && y < this.ny && this.cellOpen(x, y - 1) && this.cellOpen(x, y) && !this.wallH[y * this.nx + x];
    }
  };
  P.onBorder = function (x, y) { return this.edgeSafe(x, y, 1) || this.edgeSafe(x, y, 2) || this.edgeSafe(x, y, 3) || this.edgeSafe(x, y, 4); };
  P.vi = function (x, y) { return y * (this.nx + 1) + x; };

  /* ---------- trail ---------- */
  P.clearTrail = function () {
    for (const v of this.trail) this.trailVert[this.vi(v[0], v[1])] = 0;
    this.trail.length = 0;
    this.trailH.fill(0); this.trailV.fill(0); this.trailCell.fill(0);
  };
  const edgeIdx = function (f, x, y, d) {               /* index of the edge leaving (x,y) in direction d, and which array */
    if (d === 4) return { h: true, i: y * f.nx + x };
    if (d === 2) return { h: true, i: y * f.nx + x - 1 };
    if (d === 3) return { h: false, i: y * (f.nx + 1) + x };
    return { h: false, i: (y - 1) * (f.nx + 1) + x };
  };
  P.markCells = function (x, y) {
    for (let cy = y - 1; cy <= y; cy++) for (let cx = x - 1; cx <= x; cx++) if (this.inside(cx, cy)) this.trailCell[cy * this.nx + cx] = 1;
  };
  P.beginTrail = function (x, y) { this.trail.length = 0; this.trail.push([x, y]); this.trailVert[this.vi(x, y)] = 1; this.markCells(x, y); };
  /* extend the trail from its tip in direction d */
  P.extendTrail = function (d) {
    const t = this.trail[this.trail.length - 1], e = edgeIdx(this, t[0], t[1], d), nx = t[0] + DX[d], ny = t[1] + DY[d];
    (e.h ? this.trailH : this.trailV)[e.i] = 1;
    this.trail.push([nx, ny]); this.trailVert[this.vi(nx, ny)] = 1; this.markCells(nx, ny);
  };
  P.onTrail = function (x, y) { return this.trailVert[this.vi(x, y)] === 1; };

  /* ---------- regions ---------- */
  /* label connected open cells; barriers are the permanent walls (and, while closing a trail, the trail) */
  P.label = function (withTrail, out) {
    const nx = this.nx, ny = this.ny, lab = out, stack = [], areas = [0];
    lab.fill(0);
    let id = 0;
    const blockedR = (x, y) => this.wallV[y * (nx + 1) + x + 1] || (withTrail && this.trailV[y * (nx + 1) + x + 1]);          /* between (x,y) and (x+1,y) */
    const blockedD = (x, y) => this.wallH[(y + 1) * nx + x] || (withTrail && this.trailH[(y + 1) * nx + x]);                  /* between (x,y) and (x,y+1) */
    for (let s = 0; s < nx * ny; s++) {
      if (this.claimed[s] || lab[s]) continue;
      id++; let area = 0;
      stack.push(s); lab[s] = id;
      while (stack.length) {
        const c = stack.pop(), x = c % nx, y = (c / nx) | 0;
        area++;
        if (x + 1 < nx && !this.claimed[c + 1] && !lab[c + 1] && !blockedR(x, y)) { lab[c + 1] = id; stack.push(c + 1); }
        if (x > 0 && !this.claimed[c - 1] && !lab[c - 1] && !blockedR(x - 1, y)) { lab[c - 1] = id; stack.push(c - 1); }
        if (y + 1 < ny && !this.claimed[c + nx] && !lab[c + nx] && !blockedD(x, y)) { lab[c + nx] = id; stack.push(c + nx); }
        if (y > 0 && !this.claimed[c - nx] && !lab[c - nx] && !blockedD(x, y - 1)) { lab[c - nx] = id; stack.push(c - nx); }
      }
      areas.push(area);
    }
    return areas;
  };
  P.relabel = function () { this.regionArea = this.label(false, this.region); };

  /* Close the trail. cells = [[cx, cy], ...] of every prowler sample point. Claims each piece with no prowler in it. Returns the claimed cell indices (or an empty list). */
  P.finish = function (cells, mode) {
    const nx = this.nx, lab = new Int16Array(nx * this.ny), areas = this.label(true, lab);
    const has = new Uint8Array(areas.length);
    for (const c of cells) { if (!this.inside(c[0], c[1])) continue; const l = lab[c[1] * nx + c[0]]; if (l) has[l] = 1; }
    const taken = [];
    for (let i = 0; i < lab.length; i++) { const l = lab[i]; if (l && !has[l]) { this.claimed[i] = mode; taken.push(i); } }
    this.claimedCount += taken.length;
    /* trail pieces that still separate two open pieces become permanent walls */
    for (let y = 0; y <= this.ny; y++) for (let x = 0; x < nx; x++) {
      const i = y * nx + x;
      if (this.trailH[i] && this.cellOpen(x, y - 1) && this.cellOpen(x, y)) this.wallH[i] = 1;
    }
    for (let y = 0; y < this.ny; y++) for (let x = 0; x <= nx; x++) {
      const i = y * (nx + 1) + x;
      if (this.trailV[i] && this.cellOpen(x - 1, y) && this.cellOpen(x, y)) this.wallV[i] = 1;
    }
    this.clearTrail();
    this.relabel();
    return taken;
  };

  P.percent = function () { return this.claimedCount / (this.nx * this.ny); };
  P.regionAt = function (cx, cy) { return this.inside(cx, cy) ? this.region[cy * this.nx + cx] : 0; };

  /* a random open vertex, for placing power-ups: the centre of an open cell far from the border */
  P.randomOpenCell = function (rnd, margin) {
    for (let t = 0; t < 200; t++) {
      const x = margin + Math.floor(rnd() * (this.nx - 2 * margin)), y = margin + Math.floor(rnd() * (this.ny - 2 * margin));
      if (this.cellOpen(x, y)) return [x, y];
    }
    return null;
  };

  Field.DX = DX; Field.DY = DY; Field.OPP = OPP;
  G.Field = Field;
})((window.SGS = window.SGS || {}));
