/* Zone 4 boss: the Abyssal Jelly. It drifts above you in the flooded chamber; its bell opens to release a ring of shock orbs (and exposes its core), or it zips across the room and is left exhausted. Only an open bell can be hurt. */
(function (G) {
  'use strict';
  const U = G.U, B = G.bosses;
  function ring(g, b, n, spd) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + b.t * 0.01; g.spores.push({ kind: 'shard', x: b.x, y: b.y + 8, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, t: 0 }); } G.audio.sfx('spit'); G.fx.ring(b.x, b.y + 8); }
  B.updateJelly = function (g) {
    const b = g.boss, p = g.P, lo = 96, hi = g.room.pw - 96;
    b.t++; b.flash = Math.max(0, b.flash - 1); b.anim += 0.09;
    if (b.state === 'wait') { if (p.x > 150) { b.state = 'intro'; b.t = 0; G.world.sealDoors(g); } }
    else if (b.state === 'intro') { b.x = U.clamp(p.x, lo, hi); b.y = U.lerp(b.y, 70, 0.04); g.shake = Math.max(g.shake, 1.5); if (b.t > 100) { b.state = 'drift'; b.t = 0; b.cycle = 0; } }
    else if (b.state === 'drift') {
      b.open = false; const tx = U.clamp(p.x + Math.sin(b.t * 0.025) * 120, lo, hi);
      b.x += U.clamp((tx - b.x) * 0.02, -1.4, 1.4); b.y = 78 + Math.sin(b.t * 0.05) * 14;
      if (b.t > 100 - b.phase * 10) { b.t = 0; b.cycle++; b.state = b.cycle % 2 ? 'pulse' : 'telegraph'; }
    } else if (b.state === 'pulse') {
      b.open = b.t > 20 && b.t < 100; if (b.t === 44) ring(g, b, 8 + b.phase * 2, 1.5 + b.phase * 0.2); if (b.phase >= 2 && b.t === 70) ring(g, b, 10, 1.9);
      if (b.t > 112) { b.state = 'drift'; b.t = 0; b.open = false; }
    } else if (b.state === 'telegraph') {
      b.open = false; if (b.t < 30) { b.tx = U.clamp(p.x, lo, hi); b.ty = Math.min(p.y - 50, 190); } b.x += (b.tx - b.x) * 0.04;
      if (b.t % 8 === 0) G.fx.sparkBurst(b.x, b.y + 30, '#d8fff0', 4);
      if (b.t > 40) { b.state = 'zip'; b.t = 0; G.audio.sfx('missile'); const a = Math.atan2(b.ty - b.y, b.tx - b.x); b.vx = Math.cos(a) * (4.4 + b.phase * 0.6); b.vy = Math.sin(a) * (4.4 + b.phase * 0.6); }
    } else if (b.state === 'zip') {
      b.x = U.clamp(b.x + b.vx, lo, hi); b.y = U.clamp(b.y + b.vy, 56, 196); if (b.t > 34 || b.x <= lo || b.x >= hi || b.y >= 196) { b.state = 'tired'; b.t = 0; g.shake = 6; G.audio.sfx('boom'); B.dropItems(g); if (b.phase >= 2) B.rocks(g, 3); }
    } else if (b.state === 'tired') {
      b.open = true; b.y = U.lerp(b.y, 150, 0.05); if (b.t > (b.phase === 3 ? 130 : 160)) { b.state = 'drift'; b.t = 0; b.open = false; }
    } else if (b.state === 'dying') {
      if (b.t % 6 === 0) G.fx.boom(b.x + (Math.random() - 0.5) * 90, b.y + (Math.random() - 0.5) * 60, 9);
      g.shake = 5; b.open = true; if (b.t === 140) B.finish(g, b);
    }
    if (!g.boss) { B.updateRocks(g); return; }
    if (!p.dead && b.state !== 'wait' && !b.dead) {
      const bell = Math.abs(p.x - b.x) < (p.w + 90) / 2 && p.y > b.y - 34 && p.y - p.h < b.y + 20;
      const tent = Math.abs(p.x - b.x) < (p.w + 60) / 2 && p.y > b.y + 20 && p.y - p.h < b.y + 70;
      if ((bell || tent) && G.player.hurt(g, p, b.state === 'zip' ? 22 : bell ? 14 : 8, b.x)) G.audio.sfx('hurt');
    }
    if (!b.dead) for (const s of g.shots) {
      if (s.dead || Math.abs(s.x - b.x) > 54 || s.y < b.y - 40 || s.y > b.y + 24) continue;
      const hit = B.vulnerable(b) && B.inCore(b, s.x, s.y);
      if (s.kind === 'missile' || s.kind === 'super') { s.dead = true; G.fx.boom(s.x, s.y, 10); if (hit) B.damage(g, b, s.dmg); else G.audio.sfx('hit'); }
      else if (hit) { B.hitBoss(g, b, s); if (!s.pierce) s.dead = true; G.fx.sparkBurst(s.x, s.y, '#f2ffff', 5); }
      else if (!s.hit.has(b)) { s.hit.add(b); if (!s.pierce) s.dead = true; G.fx.sparkBurst(s.x, s.y, '#fff', 3); G.audio.sfx('hit'); }
    }
    B.updateRocks(g);
  };
  B.drawJelly = function (ctx, g) {
    const b = g.boss, S = G.sprites.jellyBoss, x = Math.round(b.x), y = Math.round(b.y), c = S[b.open ? 1 : 0];
    for (let k = -3; k <= 3; k++) {                                          // barbed tentacles: tapering beaded whips that sway under the skirt, each ending in a glowing stinger
      let sx = 0, sy = 0;
      for (let i = 0; i < 14; i++) {
        sx = x + k * 14 + Math.round(Math.sin(i * 0.5 + b.anim * 2 + k) * (2 + i * 0.45)); sy = y + 20 + Math.round(i * 4.5);
        const w = Math.max(2, 6 - (i >> 2));
        ctx.fillStyle = '#0c3a44'; ctx.fillRect(sx - (w >> 1) - 1, sy - 1, w + 2, 7);
        ctx.fillStyle = i < 8 ? '#1c8488' : '#38c0b0'; ctx.fillRect(sx - (w >> 1), sy, w, 5);
        ctx.fillStyle = '#80f0d0'; ctx.fillRect(sx - (w >> 1), sy, 1, 4);
        if (i % 3 === 1) { ctx.fillStyle = '#d8fff0'; ctx.fillRect(sx + (w >> 1) + 1, sy + 1, 3, 1); ctx.fillRect(sx - (w >> 1) - 3, sy + 3, 3, 1); }
      }
      ctx.fillStyle = '#ff7ac6'; ctx.fillRect(sx - 2, sy + 4, 5, 4); ctx.fillStyle = '#ffe2f4'; ctx.fillRect(sx - 1, sy + 5, 2, 2);
    }
    ctx.drawImage(c, x - c.ax, y - c.ay);
    if (b.flash > 0) { ctx.globalAlpha = 0.6; ctx.drawImage(G.sprites.whiteOf(c), x - c.ax, y - c.ay); ctx.globalAlpha = 1; }
  };
})((window.SGS = window.SGS || {}));
