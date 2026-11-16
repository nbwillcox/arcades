// Stick Doosh - util.js (core): namespace + math helpers. No DOM access at load time.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U = {};
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a, b) => a + Math.random() * (b - a);
  U.randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  U.approach = (v, t, d) => (v < t ? Math.min(v + d, t) : Math.max(v - d, t));
  U.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  U.easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInCubic = (t) => t * t * t;
  // deterministic 2D hash -> [0,1)
  U.hash = (x, y, s) => {
    let h = (x * 374761393 + y * 668265263 + (s || 0) * 2246822519) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  // mulberry32 seeded rng
  U.rng = (seed) => {
    let s = (seed >>> 0) || 1;
    const next = () => {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      range: (a, b) => a + next() * (b - a),
      int: (a, b) => Math.floor(a + next() * (b - a + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
    };
  };
  // entity AABB helpers (x = center, y = feet)
  U.left = (e) => e.x - e.w / 2;
  U.top = (e) => e.y - e.h;
  U.overlap = (a, b, pad) => {
    pad = pad || 0;
    return Math.abs(a.x - b.x) < (a.w + b.w) / 2 + pad && a.y - a.h - pad < b.y && b.y - b.h - pad < a.y;
  };
  U.pointIn = (e, px, py, pad) => {
    pad = pad || 0;
    return Math.abs(px - e.x) <= e.w / 2 + pad && py <= e.y + pad && py >= e.y - e.h - pad;
  };
  U.shade = (hex, amt) => { // amt -1..1 darken/lighten
    const c = U.hexRgb(hex);
    const f = amt < 0 ? (v) => v * (1 + amt) : (v) => v + (255 - v) * amt;
    return 'rgb(' + (f(c[0]) | 0) + ',' + (f(c[1]) | 0) + ',' + (f(c[2]) | 0) + ')';
  };
  const _rgbCache = {};
  U.hexRgb = (hex) => {
    if (_rgbCache[hex]) return _rgbCache[hex];
    let h = String(hex).replace('#', '');
    if (h.startsWith('rgb')) {
      const m = String(hex).match(/\d+/g) || [0, 0, 0];
      return (_rgbCache[hex] = [+m[0], +m[1], +m[2]]);
    }
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16) || 0;
    return (_rgbCache[hex] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
  };
  U.rgba = (hex, a) => { const c = U.hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
  U.now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
})();
