/* Art registry: capsule definitions and the one-time sprite build. The pieces live in astro.js (player), foes.js / foes2.js (aliens, hardware, shots), world.js (backdrops, terrain) and bossart.js. */
(function (G) {
  'use strict';
  const GFX = G.gfx, PX = G.px;
  const A = (GFX.art = GFX.art || {});
  A.CAPS = { S: { c: '#ff5a5a', name: 'SPREAD' }, M: { c: '#ffb347', name: 'MACHINE GUN' }, L: { c: '#5ab4ff', name: 'LASER' }, F: { c: '#ffd24a', name: 'FLAME' }, R: { c: '#d8e8ff', name: 'RAPID' }, B: { c: '#c88aff', name: 'BARRIER' }, '1UP': { c: '#7dff8a', name: '1UP' } };
  GFX.initArt = function () {
    A.initAstro();
    A.initFoes2();
    A.initBoss();
    if (A.initFx) A.initFx();
  };
})((window.SGS = window.SGS || {}));
