/* Zone 1 boss: the Mossback Warden. Pattern: walk, spore volley, telegraphed charge into the wall, stun (core exposed, only then vulnerable), rocks fall in later phases. */
(function (G) {
  'use strict';
  const U = G.U, B = {};
  G.bosses = B;
  const PAD = 46;
  B.setup = function (g, room) {
    g.rocks = []; g.waves = []; g.roots = [];
    const s = room.spawns.find((q) => q.ch === 'K');
    if (room.id === 'arena' && !g.prog.flags.boss1) g.boss = { kind: 'beetle', flag: 'boss1', name: 'MOSSBACK WARDEN', x: s.x, y: s.y, w: 88, h: 56, hp: 130, hpMax: 130, state: 'wait', t: 0, face: -1, vx: 0, anim: 0, flash: 0, phase: 1, dead: false };
    else if (room.id === 'heartroom' && !g.prog.flags.boss5) { B.setupHeart(g, room); }
    else if (room.id === 'arena4' && !g.prog.flags.boss4) g.boss = { kind: 'jelly', flag: 'boss4', name: 'ABYSSAL JELLY', x: s.x, y: -50, w: 100, h: 70, hp: 170, hpMax: 170, state: 'wait', t: 0, face: 1, vx: 0, vy: 0, anim: 0, flash: 0, phase: 1, dead: false, open: false };
    else if (room.id === 'arena3' && !g.prog.flags.boss3) g.boss = { kind: 'wyrm', flag: 'boss3', name: 'CINDER WYRM', x: s.x, y: 224, w: 60, h: 48, hp: 150, hpMax: 150, state: 'wait', t: 0, face: -1, vx: 0, anim: 0, flash: 0, phase: 1, dead: false, open: false, H: 80 };
    else if (room.id === 'arena2' && !g.prog.flags.boss2) g.boss = { kind: 'moth', flag: 'boss2', name: 'RIMEWING SOVEREIGN', x: s.x, y: -60, w: 60, h: 90, hp: 220, hpMax: 220, state: 'wait', t: 0, face: 1, vx: 0, vy: 0, anim: 0, flash: 0, phase: 1, dead: false, volleys: 0 };
    else return;
    room.spawns = room.spawns.filter((q) => q.ch !== 'K');
  };
  const core = (b) => (b.kind === 'heart' ? { x: b.x, y: b.y } : b.kind === 'jelly' ? { x: b.x, y: b.y + 2 } : b.kind === 'wyrm' ? { x: b.x, y: b.y } : b.kind === 'moth' ? { x: b.x, y: b.y + 6 } : { x: b.x - b.face * G.sprites.boss.core.dx, y: b.y - G.sprites.boss.core.dy });
  const vulnerable = (b) => (b.kind === 'heart' ? !!b.open && (b.phase === 2 || b.phase === 4) : b.kind === 'jelly' ? !!b.open : b.kind === 'wyrm' ? !!b.open && b.state === 'attack' : b.state === 'stun');
  const inCore = (b, x, y) => { const c = core(b); return b.kind === 'heart' ? Math.abs(x - c.x) < 40 && Math.abs(y - c.y) < 40 : b.kind === 'jelly' ? Math.abs(x - c.x) < 30 && Math.abs(y - c.y) < 26 : b.kind === 'wyrm' ? Math.abs(x - c.x) < 34 && Math.abs(y - c.y) < 28 : b.kind === 'moth' ? Math.abs(x - c.x) < 24 && Math.abs(y - c.y) < 26 : Math.abs(x - c.x) < 30 && y > b.y - 76 && y < b.y - 28; };
  const CAP = { beetle: 12, moth: 12, wyrm: 14, jelly: 16, heart: 50 };
  B.damage = function (g, b, dmg) {
    if (!vulnerable(b) || b.dead) return false;
    dmg = Math.min(dmg, CAP[b.kind] || 12);                              /* no single hit takes more than the boss's cap (the heart's armoured core 50), so a charge shot or an overcharge cannot end a fight in a few hits */
    b.hp -= dmg; b.flash = 4; G.audio.sfx('hit');
    if (b.kind === 'heart') { if (b.phase === 2 && b.hp <= b.hpMax * 0.6) { b.phase = 3; b.reshield = true; b.open = false; } }
    else { if (b.hp <= b.hpMax * 0.6 && b.phase < 2) b.phase = 2; if (b.hp <= b.hpMax * 0.28 && b.phase < 3) b.phase = 3; }
    if (b.hp <= 0) { b.dead = true; b.state = 'dying'; b.t = 0; G.audio.sfx('boom'); g.shake = 10; }
    return true;
  };
  /* a shot hurts a boss once: a piercing charge shot flying through it deals its one big hit, not a hit every frame it overlaps */
  B.hitBoss = function (g, b, s) { s.bossHit = s.bossHit || new Set(); if (s.bossHit.has(b)) return false; s.bossHit.add(b); return B.damage(g, b, s.dmg); };
  B.blast = function (g, x, y, r, kind) {
    const b = g.boss; if (!b || b.dead || !vulnerable(b)) return;
    const c = core(b);
    if (U.dist2(x, y, c.x, c.y) < (r + 26) * (r + 26)) B.damage(g, b, kind === 'super' ? 24 : kind === 'bomb2' ? 20 : kind === 'bomb' ? 4 : 8);
  };
  /* the spinflip attack against a boss: only its weak point counts, so it has to be exposed; 40 at most per hit and one hit every 30 ticks */
  B.spinHit = function (g, dmg) {
    const b = g.boss, p = g.P; if (!b || b.dead || b.state === 'wait' || b.state === 'dying' || g.time - (b.spinHit || -99) < 30) return;
    if (![[p.x, p.y - 20], [p.x - 12, p.y - 20], [p.x + 12, p.y - 20], [p.x, p.y - 34]].some(([x, y]) => inCore(b, x, y))) return;
    b.spinHit = g.time; if (B.damage(g, b, Math.min(dmg, 40))) G.fx.sparkBurst(b.x, b.y, '#ffffff', 8);
  };
  function rocks(g, n) { const ice = g.boss && g.boss.kind === 'moth'; for (let i = 0; i < n; i++) g.rocks.push({ x: 40 + Math.random() * (g.room.pw - 80), y: 20 - Math.random() * 60, vy: 0, t: 0, ice }); }
  function volley(g, b) {
    const n = b.phase >= 2 ? 5 : 3;
    for (let i = 0; i < n; i++) g.spores.push({ x: b.x + b.face * 50, y: b.y - 54, vx: b.face * (1 + i * 0.75) + (Math.random() - 0.5) * 0.4, vy: -4.6 - Math.random(), t: 0 });
    G.audio.sfx('spit'); G.fx.puff(b.x + b.face * 50, b.y - 54, 5);
  }
  function dropItems(g) { for (let i = 0; i < 2; i++) g.items.push({ kind: i ? 'missile' : 'en', x: 120 + Math.random() * (g.room.pw - 240), y: 40, vy: 0, t: 0, life: 700 }); }
  function finish(g, b) {
    g.prog.flags[b.flag] = true; g.boss = null; G.world.openAll(g); G.score.boss(g, b);
    g.toast = { txt: b.name + ' DEFEATED', t: 0 };
    if (b.kind === 'heart') { G.game.startEscape(g); return; } G.audio.sfx('save');
    for (let i = 0; i < 3; i++) g.items.push({ kind: i === 1 ? 'missile' : 'en', x: b.x + (i - 1) * 24, y: b.y - 40, vy: -2, t: 0, life: 900 });
  }
  function updateRocks(g) {
    const p = g.P; hazards(g);
    for (const r of g.rocks || []) {
      r.t++; r.vy = Math.min(7, r.vy + 0.25); r.y += r.vy;
      if (!p.dead && Math.abs(p.x - r.x) < p.w / 2 + 6 && r.y > p.y - p.h && r.y - 12 < p.y) { r.dead = true; G.fx.debris(r.x, r.y, ['#52627a', '#7f8c96']); if (G.player.hurt(g, p, 12, r.x)) G.audio.sfx('hurt'); }
      if (G.phys.boxSolid(g.room, r.x - 6, r.y - 12, r.x + 6, r.y)) { r.dead = true; G.fx.debris(r.x, r.y, ['#52627a', '#7f8c96', '#33405e']); G.audio.sfx('break'); }
    }
    if (g.rocks) g.rocks = g.rocks.filter((r) => !r.dead);
  }
  /* the Warden's ground attacks: shockwaves that race along the floor (jump them) and roots that crack the floor, then spear up (be somewhere else, or high) */
  function hazards(g) {
    const p = g.P;
    for (const w of g.waves || []) {
      w.t++; w.x += w.vx; if (w.t % 3 === 0) G.fx.puff(w.x, w.y, 2);
      if (!p.dead && Math.abs(p.x - w.x) < 10 && p.y > w.y - 13 && G.player.hurt(g, p, 14, w.x)) G.audio.sfx('hurt');
      if (w.x < B.PAD || w.x > g.room.pw - B.PAD || w.t > 140) w.dead = true;
    }
    for (const r of g.roots || []) {
      r.t++;
      if (r.t === r.delay + 38) { G.audio.sfx('break'); G.fx.debris(r.x, r.y - 6, ['#4a7a30', '#8ec050', '#33405e']); g.shake = Math.max(g.shake, 2); }
      const up = r.t >= r.delay + 38 && r.t < r.delay + 38 + 40;
      if (up && !p.dead && Math.abs(p.x - r.x) < 9 && p.y > r.y - 26 && G.player.hurt(g, p, 16, r.x)) G.audio.sfx('hurt');
      if (r.t > r.delay + 38 + 40 + 10) r.dead = true;
      if (r.t > r.delay && r.t < r.delay + 38 && r.t % 6 === 0) G.fx.puff(r.x + (Math.random() - 0.5) * 8, r.y - 1, 1);       /* dust shivers out of the crack */
    }
    if (g.waves) g.waves = g.waves.filter((w) => !w.dead); if (g.roots) g.roots = g.roots.filter((r) => !r.dead);
  }
  B.hazards = hazards; B.updateRocks = updateRocks; B.dropItems = dropItems; B.volley = volley; B.rocks = rocks; B.finish = finish; B.core = core; B.inCore = inCore; B.vulnerable = vulnerable; B.PAD = PAD;
})((window.SGS = window.SGS || {}));
