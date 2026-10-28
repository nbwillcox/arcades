/* SpaceMarble - https://github.com/nbwillcox/SpaceMarble - CC BY-NC 4.0 */
(function (G) {
  'use strict';
  const U = {};
  U.TAU = Math.PI * 2;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
  U.easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  U.easeInOutSine = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
  U.smooth = (t) => t * t * (3 - 2 * t);
  U.hsl = (h, s, l, a) => `hsla(${Math.round(h)},${s}%,${l}%,${a === undefined ? 1 : a})`;
  U.pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
  U.fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
  U.clock = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60), s = Math.floor(t % 60), c = Math.floor((t * 100) % 100); return m + ':' + U.pad(s, 2) + '.' + U.pad(c, 2); };

  /* small seeded generator so a level and its tile cracks are identical every run */
  U.mulberry = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  G.U = U;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));
