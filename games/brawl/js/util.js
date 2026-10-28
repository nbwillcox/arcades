/* StickBrawl - CC BY-NC 4.0 */
(function (G) {
  'use strict';
  const U = {};
  U.TAU = Math.PI * 2;
  U.DEG = Math.PI / 180;
  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  U.lerp = (a, b, t) => a + (b - a) * t;
  U.rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  U.randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  U.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  U.chance = (p) => Math.random() < p;
  U.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  U.easeOut = (t) => 1 - (1 - t) * (1 - t);
  U.easeInOut = (t) => t * t * (3 - 2 * t);
  U.pad = (n, len) => String(Math.max(0, Math.floor(n))).padStart(len, '0');
  U.fmt = (n) => Math.max(0, Math.floor(n)).toLocaleString('en-US');
  /* small seeded PRNG so the sketched backdrop is the same every load */
  U.rng = (seed) => {
    let s = seed >>> 0 || 1;
    return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  G.U = U;
})((window.SGS = window.SGS || {}));
