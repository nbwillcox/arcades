/* Zone 4 enemies: reactor jelly (drifts, bobs, creeps toward you), coolant drone (patrols and fires straight bolts), reactor turret, electric arc (timed hazard). */
(function (G) {
  'use strict';
  const N = G.enemies, PH = G.phys;
  Object.assign(N.DEF, {
    jelly: { w: 18, h: 26, hp: 3, dmg: 10, ax: 12, ay: 28 },
    drone: { w: 28, h: 24, hp: 8, dmg: 12, ax: 17, ay: 27 },
    rturret: { w: 16, h: 32, hp: 8, dmg: 12, ax: 10, ay: 33 },
    arc: { w: 10, h: 48, hp: 999, dmg: 14, ax: 5, ay: 48 },
  });
  N.step.jelly = function (g, f) {
    const p = g.P; f.t++; f.anim += 0.08;
    const near = Math.abs(p.x - f.x) < 150 && Math.abs(p.y - 20 - f.y) < 110;
    const tx = near ? p.x : f.home.x + Math.sin(f.t * 0.02) * 20, ty = (near ? p.y - 30 : f.home.y) + Math.sin(f.t * 0.045) * 8;
    const nx = f.x + Math.max(-0.5, Math.min(0.5, (tx - f.x) * 0.02)), ny = f.y + Math.max(-0.45, Math.min(0.45, (ty - f.y) * 0.03));
    if (!PH.boxSolid(g.room, nx - f.w / 2, f.y - f.h, nx + f.w / 2, f.y)) f.x = nx;
    if (!PH.boxSolid(g.room, f.x - f.w / 2, ny - f.h, f.x + f.w / 2, ny)) f.y = ny;
  };
  N.step.drone = function (g, f) {
    const p = g.P; f.spd = 0.55; N.walk(g, f);
    if (Math.abs(p.y - f.y) < 40 && Math.abs(p.x - f.x) < 220 && Math.sign(p.x - f.x) === f.face && f.t % 100 === 60) { g.spores.push({ kind: 'bolt', x: f.x + f.face * 18, y: f.y - 14, vx: f.face * 3, vy: 0, t: 0 }); G.audio.sfx('spit'); }
    f.t++;
  };
  N.step.rturret = function (g, f) {
    const p = g.P, dx = p.x - f.x, near = Math.abs(dx) < 240 && Math.abs(p.y - f.y) < 100;
    f.face = dx >= 0 ? 1 : -1; f.t++; f.open = near && f.t % 90 > 60 ? 1 : 0;
    if (near && f.t % 90 === 80) { g.spores.push({ kind: 'bolt', x: f.x + f.face * 10, y: f.y - 26, vx: f.face * 3.2, vy: 0, t: 0 }); G.audio.sfx('spit'); }
  };
  N.step.arc = function (g, f) {
    f.t++; const c = f.t % 120; f.on = c < 70; f.warn = c >= 54 && c < 70 ? 1 : 0; f.ghost = !f.on;
  };
  N.frame.jelly = (f, set) => set[Math.floor(f.anim) % 3];
  N.frame.drone = (f, set) => set[Math.floor(f.anim * 2.4) & 3];
  N.frame.rturret = (f, set) => set[f.open ? 1 : 0];
  N.drawArc = function (ctx, f, time) {
    if (f.t % 120 >= 70 && f.t % 120 < 84 && (f.t & 2)) { ctx.fillStyle = '#244850'; ctx.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 48, 2, 48); }
    if (!f.on) { ctx.fillStyle = '#6a9aa0'; ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 49, 6, 3); ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 2, 6, 3); return; }
    const x0 = Math.round(f.x), y0 = Math.round(f.y);
    ctx.fillStyle = '#6a9aa0'; ctx.fillRect(x0 - 3, y0 - 49, 6, 3); ctx.fillRect(x0 - 3, y0 - 2, 6, 3);
    for (let pass = 0; pass < 2; pass++) { let px = x0; for (let y = y0 - 46; y < y0 - 2; y += 3) { px = x0 + ((y * 7 + f.t * 3 + pass * 5) % 7) - 3; ctx.fillStyle = pass ? '#f2ffff' : '#38c0b0'; ctx.fillRect(px - (pass ? 0 : 1), y, pass ? 1 : 3, 3); } }
    if (f.warn) { ctx.fillStyle = '#f2ffff'; ctx.fillRect(x0 - 1, y0 - 48, 2, 46); }
  };
})((window.SGS = window.SGS || {}));
