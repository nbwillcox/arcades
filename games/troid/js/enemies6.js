/* New enemies from the monster art pass. Zone 1: thorn tick (lobs thorns), shardbat (swoops). Zone 2: glacipede (slow, tough), permafrost mine (arms, then bursts into ice shards).
   Zone 3: lava leaper (long hops), ash scarab (armoured: plain beam shots barely scratch it). Zone 4: tide skimmer (patrols, then darts), volt eel pod (an eel strikes out of a pod).
   Zone 5: brood stinger (hovers, aims, dives), husk bloom (opens and spits orbs). Boxes: x = centre, y = feet; the sprite anchors come from the art file. */
(function (G) {
  'use strict';
  const N = G.enemies, PH = G.phys, U = G.U, MI = G.art.monimg;
  const def = (type, o, centred) => { N.DEF[type] = Object.assign({ ax: MI[type].ax, ay: MI[type].ay + (centred ? Math.round(o.h / 2) : 0) }, o); };
  def('thorn', { w: 28, h: 22, hp: 7, dmg: 12 });
  def('shardbat', { w: 16, h: 14, hp: 3, dmg: 8 }, true);
  def('glacipede', { w: 34, h: 18, hp: 10, dmg: 12 });
  def('mine', { w: 16, h: 16, hp: 2, dmg: 8 }, true);
  def('leaper', { w: 26, h: 20, hp: 6, dmg: 12 });
  def('scarab', { w: 28, h: 22, hp: 10, dmg: 14, armor: 0.34 });
  def('skimmer', { w: 26, h: 12, hp: 4, dmg: 10 }, true);
  def('eel', { w: 16, h: 14, hp: 8, dmg: 0 });
  def('stinger', { w: 16, h: 16, hp: 4, dmg: 12 }, true);
  def('bloom', { w: 18, h: 28, hp: 6, dmg: 10 });
  N.LETTER = { T: 'thorn', H: 'shardbat', C: 'glacipede', N: 'mine', J: 'leaper', R: 'scarab', F: 'skimmer', E: 'eel', U: 'stinger', Q: 'bloom' };   // room-map spawn letters
  N.FLYER = { shardbat: 1, mine: 1, skimmer: 1, stinger: 1 };
  const free = (g, f, nx, ny) => !PH.boxSolid(g.room, nx - f.w / 2, ny - f.h, nx + f.w / 2, ny);
  const moveTo = (g, f, tx, ty, sp) => {                                                  /* fly toward a point, sliding along walls */
    const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy) || 1, vx = dx / d * Math.min(sp, d), vy = dy / d * Math.min(sp, d);
    if (free(g, f, f.x + vx, f.y)) f.x += vx; if (free(g, f, f.x, f.y + vy)) f.y += vy; f.face = vx >= 0 ? 1 : -1; return d;
  };
  const near = (g, f, rx, ry) => !g.P.dead && Math.abs(g.P.x - f.x) < rx && Math.abs((g.P.y - 20) - (f.y - f.h / 2)) < ry;
  /* ---- zone 1 */
  N.step.thorn = function (g, f) {
    const p = g.P; f.spd = 0.5; N.walk(g, f); f.t++;
    if (f.t % 150 === 100 && Math.abs(p.x - f.x) < 180 && Math.abs(p.y - f.y) < 100) { for (const k of [-0.5, 0.5]) g.spores.push({ x: f.x + f.face * 8, y: f.y - 20, vx: U.clamp((p.x - f.x) / 70, -2.2, 2.2) + k, vy: -3.6, t: 0 }); G.audio.sfx('spit'); }
  };
  N.step.shardbat = function (g, f) {
    f.t++; f.anim += f.state === 'swoop' ? 0.34 : 0.18;
    if (f.state === undefined) f.state = 'hang';
    if (f.state === 'hang') { moveTo(g, f, f.home.x + Math.sin(f.t * 0.03) * 10, f.home.y + Math.sin(f.t * 0.06) * 4, 0.5); if (f.t > 50 && near(g, f, 150, 170)) { f.state = 'swoop'; f.t = 0; f.tx = g.P.x; f.ty = g.P.y - 22; G.audio.sfx('spit'); } }
    else if (f.state === 'swoop') { const d = moveTo(g, f, f.tx, f.ty, 2.6); if (d < 4 || f.t > 55) { f.state = 'retreat'; f.t = 0; } }
    else if (moveTo(g, f, f.home.x, f.home.y, 1.2) < 3 || f.t > 120) { f.state = 'hang'; f.t = 0; }
  };
  /* ---- zone 2 */
  N.step.glacipede = function (g, f) { f.spd = 0.36; N.walk(g, f); };
  N.step.mine = function (g, f) {
    const p = g.P; f.t++;
    if (f.state === undefined) f.state = 'idle';
    if (f.state === 'idle') { f.x = f.home.x + Math.sin(f.t * 0.03) * 3; f.y = f.home.y + Math.sin(f.t * 0.05) * 3; if (near(g, f, 66, 56)) { f.state = 'arm'; f.t = 0; G.audio.sfx('chargeStart'); } }
    else if (f.state === 'arm') { if (f.t > 38) N.die.mine(g, f); }
    else if (f.state === 'boom') { f.dmg = 0; if (f.t > 10) f.dead = true; }
  };
  N.die = N.die || {};
  N.die.mine = function (g, f) {                                                         /* the burst: ice shards fly out and anything close is hurt */
    if (f.state === 'boom') return;
    f.state = 'boom'; f.t = 0; f.dead = false; f.hp = 99; f.dmg = 0; G.audio.sfx('boom'); G.fx.sparkBurst(f.x, f.y - 8, '#bff4ff', 14);
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + 0.2; g.spores.push({ kind: 'shard', x: f.x, y: f.y - 8, vx: Math.cos(a) * 1.9, vy: Math.sin(a) * 1.9, t: 0 }); }
    const p = g.P; if (!p.dead && Math.hypot(p.x - f.x, (p.y - 20) - (f.y - 8)) < 34 && G.player.hurt(g, p, 14, f.x)) G.audio.sfx('hurt');
  };
  /* ---- zone 3 */
  N.step.leaper = function (g, f) {
    const p = g.P, room = g.room; f.vy = Math.min(5.5, f.vy + 0.3); PH.moveY(room, f, f.vy, false); f.t++;
    if (f.ground) {
      if (f.pose === 2 || f.pose === 1) { f.pose = 3; f.t = 0; f.vx = 0; }
      f.vx = Math.abs(f.vx) < 0.15 ? 0 : f.vx * 0.8; f.face = p.x >= f.x ? 1 : -1;
      if (f.pose === 3 && f.t > 10) f.pose = 0;
      if (f.t > 80 && f.pose === 0 && Math.abs(p.x - f.x) < 260) { f.t = 0; f.pose = 1; f.vx = f.face * 2.3; f.vy = -6.8; f.ground = false; G.audio.sfx('jump'); }
    } else f.pose = f.vy < 0 ? 1 : 2;
    PH.moveX(room, f, f.vx);
  };
  N.step.scarab = function (g, f) { f.spd = 0.45; N.walk(g, f); };
  /* ---- zone 4 */
  N.step.skimmer = function (g, f) {
    f.t++; f.anim += 0.16; if (f.state === undefined) f.state = 'patrol';
    if (f.state === 'patrol') { const tx = f.home.x + Math.sin(f.t * 0.018) * 110; moveTo(g, f, tx, f.home.y + Math.sin(f.t * 0.05) * 6, 1.1); if (f.t > 90 && near(g, f, 140, 60)) { f.state = 'dash'; f.t = 0; f.tx = g.P.x; f.ty = g.P.y - 18; G.audio.sfx('spit'); } }
    else if (f.state === 'dash') { const d = moveTo(g, f, f.tx + Math.sign(f.tx - f.x) * 40, f.ty, 2.6); if (f.t > 34 || d < 4) { f.state = 'patrol'; f.t = 0; } }
  };
  N.step.eel = function (g, f) {
    const p = g.P; f.t++; if (f.state === undefined) { f.state = 'idle'; f.t = 40; }
    f.face = p.x >= f.x ? 1 : -1;
    if (f.state === 'idle') { f.h = 14; f.w = 16; f.dmg = 0; if (f.t > 70 && near(g, f, 130, 100)) { f.state = 'rise'; f.t = 0; G.audio.sfx('chargeStart'); } }
    else if (f.state === 'rise') { f.h = 28; f.dmg = 8; if (f.t > 22) { f.state = 'strike'; f.t = 0; g.spores.push({ kind: 'bolt', x: f.x + f.face * 12, y: f.y - 30, vx: f.face * 3.2, vy: 0, t: 0 }); G.audio.sfx('spit'); } }
    else if (f.state === 'strike') { f.h = 42; f.w = 24; f.dmg = 14; if (f.t > 28) { f.state = 'retreat'; f.t = 0; } }
    else if (f.state === 'retreat') { f.h = 20; f.w = 16; f.dmg = 0; if (f.t > 18) { f.state = 'idle'; f.t = 0; } }
  };
  /* ---- zone 5 */
  N.step.stinger = function (g, f) {
    f.t++; f.anim += f.state === 'dive' ? 0.4 : 0.22; if (f.state === undefined) f.state = 'hover';
    const p = g.P;
    if (f.state === 'hover') { moveTo(g, f, f.home.x + Math.sin(f.t * 0.035) * 22, f.home.y + Math.sin(f.t * 0.07) * 6, 0.6); if (f.t > 70 && near(g, f, 180, 170)) { f.state = 'aim'; f.t = 0; } }
    else if (f.state === 'aim') { f.face = p.x >= f.x ? 1 : -1; f.x += (f.t & 2) ? 0.6 : -0.6; if (f.t > 22) { f.state = 'dive'; f.t = 0; f.tx = p.x; f.ty = p.y - 18; G.audio.sfx('spit'); } }
    else if (f.state === 'dive') { const d = moveTo(g, f, f.tx + Math.sign(f.tx - f.x) * 30, f.ty + (f.ty - f.y) * 0.4, 3.3); if (f.t > 30 || d < 4) { f.state = 'recover'; f.t = 0; } }
    else if (moveTo(g, f, f.home.x, f.home.y, 1.4) < 3 || f.t > 100) { f.state = 'hover'; f.t = 0; }
  };
  N.step.bloom = function (g, f) {
    const p = g.P; f.t++; if (f.state === undefined) { f.state = 'closed'; f.t = 40; } f.face = p.x >= f.x ? 1 : -1;
    if (f.state === 'closed') { if (f.t > 50 && near(g, f, 220, 140)) { f.state = 'opening'; f.t = 0; } }
    else if (f.state === 'opening') { if (f.t > 22) { f.state = 'open'; f.t = 0; } }
    else if (f.state === 'open') { if (f.t > 28) { f.state = 'spit'; f.t = 0; const a0 = Math.atan2((p.y - 22) - (f.y - 22), p.x - f.x); for (const da of [-0.28, 0, 0.28]) g.spores.push({ kind: 'shard', x: f.x + f.face * 8, y: f.y - 22, vx: Math.cos(a0 + da) * 1.8, vy: Math.sin(a0 + da) * 1.8, t: 0 }); G.audio.sfx('spit'); } }
    else if (f.state === 'spit') { if (f.t > 20) { f.state = 'closing'; f.t = 0; } }
    else if (f.state === 'closing') { if (f.t > 40) { f.state = 'closed'; f.t = 0; } }
  };
  const walk = (f, set) => set[Math.floor(f.anim * 2.4) & 3];
  N.frame.thorn = walk; N.frame.glacipede = walk; N.frame.scarab = walk;
  N.frame.shardbat = (f, set) => set[Math.floor(f.anim) & 3];
  N.frame.skimmer = (f, set) => set[Math.floor(f.anim) & 3];
  N.frame.stinger = (f, set) => set[Math.floor(f.anim) & 3];
  N.frame.leaper = (f, set) => set[f.pose || 0];
  N.frame.mine = (f, set) => set[f.state === 'boom' ? 3 : Math.floor(f.t / (f.state === 'arm' ? 4 : 14)) % 3];
  N.frame.eel = (f, set) => set[{ idle: 0, rise: 1, strike: 2, retreat: 3 }[f.state] || 0];
  N.frame.bloom = (f, set) => set[{ closed: 0, opening: 1, open: 2, spit: 3, closing: 1 }[f.state] || 0];
})((window.SGS = window.SGS || {}));
