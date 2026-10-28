/* Stage definitions: odd stages are free-flight looping worlds with hives, even stages are forced upward scrolls through an organic corridor. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, TAU = U.TAU;
  const St = {};
  G.stage = St;
  const WW = C.WW;

  St.kind = (n) => (n % 2 === 1 ? 'free' : 'forced');
  St.themeIdx = (n) => Math.floor((n - 1) / 2) % 5;
  St.difficulty = (n) => Math.ceil(n / 2);       // 1,1,2,2,3,3...

  St.setup = function (g, n) {
    const rnd = G.gfx.mulberry(n * 104729 + 3);
    g.tr = { ph: Array.from({ length: 8 }, () => rnd() * TAU) };
  };
  /* ---- free-flight terrain (periodic over the world width) ---- */
  St.floorY = (g, x) => {
    const p = g.tr.ph, k = TAU * x / WW;
    return 456 + 18 * Math.sin(k * 2 + p[0]) + 11 * Math.sin(k * 5 + p[1]) + 7 * Math.sin(k * 9 + p[2]);
  };
  St.ceilY = (g, x) => {
    const p = g.tr.ph, k = TAU * x / WW;
    return 58 + 8 * Math.sin(k * 3 + p[3]) + 6 * Math.sin(k * 8 + p[4]);
  };
  /* ---- forced-scroll corridor (centre line and half width as functions of world y) ---- */
  St.hw = (g, y) => 235 + 55 * Math.sin(y * 0.0047 + g.tr.ph[2]) + 20 * Math.sin(y * 0.013 + g.tr.ph[5]);
  St.cx = (g, y) => {
    const h = St.hw(g, y), c = 480 + 120 * Math.sin(y * 0.0031 + g.tr.ph[0]) + 55 * Math.sin(y * 0.0083 + g.tr.ph[1]);
    return U.clamp(c, h + 34, C.W - h - 34);
  };

  /* ---- forced-scroll script: spawn events keyed to the camera's world y (it runs from len down to 0) ---- */
  St.script = function (g, n) {
    const rnd = G.gfx.mulberry(n * 7727 + 11), d = St.difficulty(n);
    const len = 3000 + 240 * Math.min(8, d);
    const ev = [];
    let y = len - 520, i = 0;
    while (y > 360) {
      const r = rnd(), cap = i % 4 === 2;
      let kind = cap ? 'carrierLine' : r < 0.26 ? 'cells' : r < 0.45 ? 'darters' : r < 0.62 ? 'turrets' : r < 0.78 ? 'tentacle' : d >= 2 ? 'spitter' : 'cells';
      ev.push({ at: y, kind, side: rnd() < 0.5 ? -1 : 1, rnd: rnd() });
      y -= 150 + rnd() * 90 - Math.min(40, d * 4); i++;
    }
    return { len, events: ev };
  };
})((window.SGS = window.SGS || {}));
