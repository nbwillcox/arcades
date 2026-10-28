/* Zone 2 enemies: frost wisp (hovering; freeze it with the ice beam to make a stepping stone), frostling (hopper), shard turret, falling icicle. */
(function (G) {
  'use strict';
  const N = G.enemies, PH = G.phys, U = G.U, E = 0.001;
  Object.assign(N.DEF, {
    wisp: { w: 14, h: 16, hp: 2, dmg: 6, ax: 10, ay: 17 },
    frostling: { w: 26, h: 22, hp: 5, dmg: 10, ax: 15, ay: 25 },
    turret: { w: 16, h: 32, hp: 6, dmg: 10, ax: 10, ay: 33 },
    icicle: { w: 8, h: 22, hp: 1, dmg: 12, ax: 4, ay: 23 },
  });
  N.step.wisp = function (g, f) {
    f.t++; f.anim += 0.12;
    f.x = f.home.x + Math.sin(f.t * 0.028) * 14; f.y = f.home.y + Math.sin(f.t * 0.047) * 5;
    f.face = Math.cos(f.t * 0.028) >= 0 ? 1 : -1;
  };
  N.step.frostling = function (g, f) {
    const p = g.P, room = g.room;
    f.vy = Math.min(5.5, f.vy + 0.3); PH.moveY(room, f, f.vy, false);
    f.t++;
    if (f.ground) {
      f.vx = Math.abs(f.vx) < 0.15 ? 0 : f.vx * 0.8; f.face = p.x >= f.x ? 1 : -1;
      if (f.t > 60 && f.t < 74) f.pose = 1;
      else if (f.t >= 74) { f.t = 0; f.pose = 2; if (Math.abs(p.x - f.x) < 220) { f.vx = f.face * 1.7; f.vy = -5; f.ground = false; G.audio.sfx('jump'); } }
      else f.pose = 0;
    } else f.pose = 2;
    PH.moveX(room, f, f.vx);
  };
  N.step.turret = function (g, f) {
    const p = g.P, dx = p.x - f.x, near = Math.abs(dx) < 230 && Math.abs(p.y - f.y) < 130;
    f.face = dx >= 0 ? 1 : -1; f.t++;
    f.open = near && f.t % 120 > 84 ? 1 : 0;
    if (near && f.t % 120 === 108) {
      const sx = f.x, sy = f.y - 28, a0 = Math.atan2((p.y - 20) - sy, dx);
      for (const da of [-0.3, 0, 0.3]) g.spores.push({ kind: 'shard', x: sx, y: sy, vx: Math.cos(a0 + da) * 2.4, vy: Math.sin(a0 + da) * 2.4, t: 0 });
      G.audio.sfx('spit');
    }
  };
  N.step.icicle = function (g, f) {
    const p = g.P;
    if (f.state === undefined) { f.state = 'hang'; f.t = 0; }
    f.t++;
    if (f.state === 'hang') { if (!p.dead && Math.abs(p.x - f.x) < 24 && p.y > f.y && p.y - f.y < 260) { f.state = 'shake'; f.t = 0; } }
    else if (f.state === 'shake') { f.sx = (f.t & 2) ? 1 : -1; if (f.t > 26) { f.state = 'fall'; f.vy = 0; f.sx = 0; } }
    else if (f.state === 'fall') {
      f.vy = Math.min(7, f.vy + 0.3); f.y += f.vy;
      if (PH.boxSolid(g.room, f.x - 3, f.y - 4, f.x + 3, f.y + 1)) { f.dead = true; G.fx.debris(f.x, f.y - 6, ['#dff4fc', '#a8d4ee', '#6e9fd0']); G.audio.sfx('break'); }
    }
  };
  N.frame.wisp = (f, set) => set[Math.floor(f.anim) % 3];
  N.frame.frostling = (f, set) => set[f.pose || 0];
  N.frame.turret = (f, set) => set[f.open ? 1 : 0];
  N.frame.icicle = (f, set) => set[0];
})((window.SGS = window.SGS || {}));
