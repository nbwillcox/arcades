/* utilities: math, pools, spatial hash */
(function () {
  var U = CS.U = {};
  U.rr = function (a, b) { return a + Math.random() * (b - a); };
  U.ri = function (a, b) { return Math.floor(a + Math.random() * (b - a + 1)); };
  U.pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };
  U.clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  U.lerp = function (a, b, t) { return a + (b - a) * t; };
  U.hash = function (x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  U.fmt = function (s) { s = Math.max(0, Math.floor(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
  U.num = function (n) { n = Math.floor(n); return n >= 10000 ? (n / 1000).toFixed(1) + 'K' : '' + n; };
  U.weighted = function (ws) { var t = 0, i; for (i = 0; i < ws.length; i++) t += ws[i]; var r = Math.random() * t; for (i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) return i; } return ws.length - 1; };
  U.angTo = function (x1, y1, x2, y2) { return Math.atan2(y2 - y1, x2 - x1); };

  /* fixed-size object pool with swap-remove. Iterate backwards. */
  U.Pool = function (max, make) { this.max = max; this.n = 0; this.a = new Array(max); for (var i = 0; i < max; i++) this.a[i] = make(); };
  U.Pool.prototype.spawn = function () { return this.n >= this.max ? null : this.a[this.n++]; };
  U.Pool.prototype.kill = function (i) { if (i >= this.n) return; var o = this.a[i]; this.a[i] = this.a[--this.n]; this.a[this.n] = o; };
  U.Pool.prototype.clear = function () { this.n = 0; };

  /* spatial hash over a pool of entities (wrapping 64x64 table, 48px cells) */
  var CELL = 48, TB = 64;
  U.Grid = function (pool) { this.pool = pool; this.head = new Int32Array(TB * TB); this.next = new Int32Array(pool.max); };
  U.Grid.prototype.build = function () {
    var h = this.head, nx = this.next, a = this.pool.a, n = this.pool.n, i, e;
    h.fill(-1);
    for (i = 0; i < n; i++) { e = a[i]; if (e.dead) continue; var c = ((Math.floor(e.x / CELL) & 63) << 6) | (Math.floor(e.y / CELL) & 63); nx[i] = h[c]; h[c] = i; }
  };
  /* fill out[] with live entities within r of (x,y); returns count */
  U.Grid.prototype.near = function (x, y, r, out, max) {
    var cnt = 0, x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL), a = this.pool.a, h = this.head, nx = this.next, cx, cy, i, e, dx, dy, rr;
    max = max || 9999;
    for (cx = x0; cx <= x1; cx++) for (cy = y0; cy <= y1; cy++) {
      for (i = h[((cx & 63) << 6) | (cy & 63)]; i >= 0; i = nx[i]) {
        e = a[i]; if (e.dead) continue; dx = e.x - x; dy = e.y - y; rr = r + e.r;
        if (dx * dx + dy * dy <= rr * rr) { out[cnt++] = e; if (cnt >= max) return cnt; }
      }
    }
    return cnt;
  };
  /* nearest live entity within r (optionally excluding stamp) */
  U.Grid.prototype.nearest = function (x, y, r, skip) {
    var best = null, bd = r * r, x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), y0 = Math.floor((y - r) / CELL), y1 = Math.floor((y + r) / CELL), a = this.pool.a, h = this.head, nx = this.next, cx, cy, i, e, dx, dy, d;
    for (cx = x0; cx <= x1; cx++) for (cy = y0; cy <= y1; cy++) {
      for (i = h[((cx & 63) << 6) | (cy & 63)]; i >= 0; i = nx[i]) {
        e = a[i]; if (e.dead || e === skip) continue; dx = e.x - x; dy = e.y - y; d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = e; }
      }
    }
    return best;
  };
})();
