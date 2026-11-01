/* Loads the AI-generated pixel art: boss portraits (overlay), and the in-game sprites and tiling textures,
   which are decoded once into pixel arrays for the software renderer. Anything missing falls back to the procedural drawing. */
(function (G) {
  'use strict';
  const A = { boss: {}, spr: {}, tex: {}, ready: false };
  const SPR = ['rider', 'car_away', 'car_toward', 'car_side', 'tree_a', 'tree_b', 'tree_c', 'mailbox', 'trash', 'cone', 'gnome', 'hydrant', 'bundle', 'ufo', 'skater', 'ramp', 'boss_rex', 'boss_gorp', 'boss_mower', 'hmail', 'htrash', 'hplant_a', 'hplant_b', 'hplant_c'];
  const TEX = ['grass', 'walk', 'road', 'siding', 'brick', 'roof', 'stone'];
  const CAR_HUES = [0, 20, 45, 120, 180, 210, 270, 320];
  const img = (src) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
  A.load = function () {
    const names = { rex: 'boss1', gorp: 'boss2', mower: 'boss3' };
    const jobs = Object.keys(names).map((k) => img('assets/' + names[k] + '.webp?v=2').then((im) => { if (im) A.boss[k] = im; }));
    for (const n of SPR) jobs.push(img('assets/spr/' + n + '.png?v=6').then((im) => { if (im) A.spr[n] = G.px.bitmap(im); }));
    for (const n of TEX) jobs.push(img('assets/tex/' + n + '.png?v=6').then((im) => { if (im) A.tex[n] = G.px.bitmap(im); }));
    return Promise.all(jobs).then(() => {
      const mb = A.spr.mailbox; if (mb) { const hh = Math.round(mb.h * 0.56); A.spr.mailbox_head = { w: mb.w, h: hh, data: mb.data.slice(0, mb.w * hh) }; }
      A.cars = {};
      for (const k of ['car_away', 'car_toward', 'car_side']) if (A.spr[k]) A.cars[k] = CAR_HUES.map((h) => ({ h, s: G.px.recolor(A.spr[k], h) }));
      A.ready = true;
    });
  };
  A.car = function (kind, hue) { const l = A.cars && A.cars[kind]; if (!l) return null; let best = l[0]; for (const e of l) if (Math.abs(e.h - hue) < Math.abs(best.h - hue)) best = e; return best.s; };
  G.art = A;
})((window.SGS = window.SGS || {}));
