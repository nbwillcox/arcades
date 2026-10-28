/* Zone 3 enemies: cinder crawler (fast, tough), ember hopper (frostling hop, recoloured), ember turret (lobs fireballs), magmite (leaps out of lava). */
(function (G) {
  'use strict';
  const N = G.enemies;
  Object.assign(N.DEF, {
    cinder: { w: 28, h: 24, hp: 8, dmg: 12, ax: 17, ay: 27 },
    hopper: { w: 26, h: 22, hp: 6, dmg: 12, ax: 15, ay: 25 },
    ember: { w: 16, h: 32, hp: 7, dmg: 12, ax: 10, ay: 33 },
    magmite: { w: 12, h: 16, hp: 3, dmg: 14, ax: 8, ay: 21 },
  });
  N.step.cinder = function (g, f) { f.spd = 0.85; N.walk(g, f); };
  N.step.hopper = function (g, f) { N.step.frostling(g, f); };
  N.step.ember = function (g, f) {
    const p = g.P, dx = p.x - f.x, near = Math.abs(dx) < 240 && Math.abs(p.y - f.y) < 140;
    f.face = dx >= 0 ? 1 : -1; f.t++;
    f.open = near && f.t % 130 > 90 ? 1 : 0;
    if (near && f.t % 130 === 112) {
      const sx = f.x, sy = f.y - 28, v = Math.max(-3, Math.min(3, dx / 55));
      g.spores.push({ kind: 'fire', x: sx, y: sy, vx: v, vy: -4.4, t: 0 }); G.audio.sfx('spit');
    }
  };
  N.step.magmite = function (g, f) {
    const p = g.P; f.t++;
    if (f.state === undefined) { f.state = 'hide'; f.t = Math.floor(Math.random() * 60); f.ghost = true; }
    if (f.state === 'hide') { f.ghost = true; f.y = f.home.y + 6; if (f.t > 100 && Math.abs(p.x - f.x) < 170) { f.state = 'warn'; f.t = 0; } }
    else if (f.state === 'warn') { if (f.t % 4 === 0) G.fx.sparkBurst(f.x, f.home.y - 2, '#ffc450', 3); if (f.t > 26) { f.state = 'leap'; f.vy = -8.2; f.ghost = false; G.audio.sfx('missile'); } }
    else if (f.state === 'leap') {
      f.vy += 0.3; f.y += f.vy; f.face = p.x >= f.x ? 1 : -1; f.x += Math.sign(p.x - f.x) * 0.35; f.anim = f.vy < 0 ? 1 : 0;
      if (f.vy > 0 && f.y >= f.home.y) { f.state = 'hide'; f.t = 0; G.fx.sparkBurst(f.x, f.home.y, '#ffc450', 6); }
    }
  };
  N.frame.cinder = (f, set) => set[Math.floor(f.anim * 2.4) & 3];
  N.frame.hopper = (f, set) => set[f.pose || 0];
  N.frame.ember = (f, set) => set[f.open ? 1 : 0];
  N.frame.magmite = (f, set) => set[f.anim ? 1 : 0];
})((window.SGS = window.SGS || {}));
