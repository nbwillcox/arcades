/* Zone 5 enemies: hive moth (flyer), carapace guard (tough crawler), spore pod, egg spawner (hatches moths while you are near). */
(function (G) {
  'use strict';
  const N = G.enemies;
  Object.assign(N.DEF, {
    hmoth: { w: 14, h: 12, hp: 3, dmg: 8, ax: 10, ay: 11 },
    guard: { w: 28, h: 24, hp: 10, dmg: 14, ax: 17, ay: 27 },
    hpod: { w: 14, h: 24, hp: 7, dmg: 12, ax: 8, ay: 23 },
    egg: { w: 20, h: 30, hp: 7, dmg: 0, ax: 13, ay: 31 },
  });
  N.step.hmoth = function (g, f) { N.fly(g, f); };
  N.step.guard = function (g, f) { f.spd = 0.6; N.walk(g, f); };
  N.step.hpod = function (g, f) { N.pod(g, f); };
  N.step.egg = function (g, f) {
    const p = g.P; f.t++;
    const near = Math.abs(p.x - f.x) < 280 && Math.abs(p.y - f.y) < 140, kids = g.foes.filter((q) => q.owner === f && !q.dead).length;
    f.open = near && f.t % 200 > 140 ? 1 : 0;
    if (near && kids < 2 && f.t % 200 === 180) { const h = N.spawn(g, 'hmoth', f.x, f.y - 12, -1); h.owner = f; G.fx.sparkBurst(f.x, f.y - 14, '#f4ffc0', 8); G.audio.sfx('spit'); }
  };
  N.frame.hmoth = (f, set) => set[Math.floor(f.anim) & 3];
  N.frame.guard = (f, set) => set[Math.floor(f.anim * 2.4) & 3];
  N.frame.hpod = (f, set) => set[f.open > 0.6 ? 1 : 0];
  N.frame.egg = (f, set) => set[f.open ? 1 : 0];
})((window.SGS = window.SGS || {}));
