/* Zone 3 boss: the Cinder Wyrm. It surfaces from the lava at one of three vents, lobs fireballs or lunges, and is only hurt while its maw is open. */
(function (G) {
  'use strict';
  const U = G.U, B = G.bosses, LAVA_Y = 224;
  const vents = (g) => [208, 424];   /* centres of the two lava gaps */
  function volley(g, b, n) {
    const p = g.P, a0 = Math.atan2((p.y - 24) - b.y, p.x - b.x);
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * 0.28; g.spores.push({ kind: 'fire', x: b.x + b.face * 34, y: b.y + 6, vx: Math.cos(a) * 2.6, vy: Math.sin(a) * 2.6 - 0.8, t: 0 }); }
    G.audio.sfx('spit'); G.fx.sparkBurst(b.x + b.face * 36, b.y + 6, '#ffc450', 5);
  }
  B.updateWyrm = function (g) {
    const b = g.boss, p = g.P, V = vents(g);
    b.t++; b.flash = Math.max(0, b.flash - 1); b.anim += 0.15;
    const faceP = () => { b.face = p.x >= b.x ? 1 : -1; };
    if (b.state === 'wait') { if (p.x > 150) { b.state = 'intro'; b.t = 0; G.world.sealDoors(g); } b.y = LAVA_Y + 40; }
    else if (b.state === 'intro') { b.y = LAVA_Y + 40; if (b.t % 5 === 0) G.fx.sparkBurst(U.pick(V), LAVA_Y, '#ffc450', 3); g.shake = Math.max(g.shake, 1.5); if (b.t > 80) { b.state = 'idle'; b.t = 0; } }
    else if (b.state === 'idle') {
      b.y = LAVA_Y + 40;
      if (b.t > 60 - b.phase * 8) {
        const near = V.slice().sort((a, c) => Math.abs(a - p.x) - Math.abs(c - p.x));
        b.x = Math.random() < 0.6 ? near[0] : U.pick(V); b.state = 'warn'; b.t = 0; b.lunge = b.phase >= 2 && Math.random() < 0.4; b.H = 64 + Math.floor(Math.random() * 56); b.open = false;
      }
    } else if (b.state === 'warn') {
      b.y = LAVA_Y + 40; if (b.t % 3 === 0) G.fx.sparkBurst(b.x + (Math.random() - 0.5) * 30, LAVA_Y, '#ee8428', 2);
      if (b.t > 34) { b.state = 'rise'; b.t = 0; G.audio.sfx('boom'); g.shake = Math.max(g.shake, 4); }
    } else if (b.state === 'rise') {
      faceP(); const k = Math.min(1, b.t / 22), H = b.lunge ? 38 : b.H; b.y = U.lerp(LAVA_Y + 40, LAVA_Y - H, U.easeOutCubic(k));
      if (k >= 1) { b.state = 'attack'; b.t = 0; b.open = false; b.shots = 0; }
    } else if (b.state === 'attack') {
      faceP();
      if (b.lunge) { b.open = b.t > 6; if (b.t > 8) b.x += U.clamp((p.x - b.x) * 0.05, -3.4, 3.4); if (b.t > 70) { b.state = 'sink'; b.t = 0; b.open = false; } }
      else {
        b.open = b.t > 14 && b.t < 84; const n = [0, 3, 5, 7][b.phase];
        if (b.open && (b.t - 14) % 26 === 0 && b.shots < 3) { volley(g, b, n); b.shots++; }
        if (b.phase === 3 && b.t === 50) B.rocks(g, 3);
        if (b.t > 96) { b.state = 'sink'; b.t = 0; b.open = false; }
      }
    } else if (b.state === 'sink') {
      b.open = false; b.y = U.lerp(b.y, LAVA_Y + 40, 0.12);
      if (b.t > 24) { b.state = 'idle'; b.t = 0; G.fx.sparkBurst(b.x, LAVA_Y, '#ffc450', 8); }
    } else if (b.state === 'dying') {
      if (b.t % 6 === 0) G.fx.boom(b.x + (Math.random() - 0.5) * 60, b.y + (Math.random() - 0.5) * 50, 9);
      g.shake = 5; b.y = Math.min(b.y + 0.3, LAVA_Y - 20); if (b.t === 140) B.finish(g, b);
    }
    if (!g.boss) { B.updateRocks(g); return; }
    const up = b.y < LAVA_Y + 20 && b.state !== 'wait' && b.state !== 'intro';
    if (!p.dead && up && !b.dead) {
      const head = Math.abs(p.x - b.x) < (p.w + 56) / 2 && p.y > b.y - 24 && p.y - p.h < b.y + 24;
      const neck = Math.abs(p.x - b.x) < (p.w + 22) / 2 && p.y > b.y + 24 && p.y - p.h < LAVA_Y;
      if ((head || neck) && G.player.hurt(g, p, head && b.lunge ? 26 : 18, b.x)) G.audio.sfx('hurt');
    }
    if (up && !b.dead) for (const s of g.shots) {
      if (s.dead || Math.abs(s.x - b.x) > 42 || Math.abs(s.y - b.y) > 34) continue;
      const hit = B.vulnerable(b);
      if (s.kind === 'missile' || s.kind === 'super') { s.dead = true; G.fx.boom(s.x, s.y, 10); if (hit) B.damage(g, b, s.dmg); else G.audio.sfx('hit'); }
      else if (hit) { B.hitBoss(g, b, s); if (!s.pierce) s.dead = true; G.fx.sparkBurst(s.x, s.y, '#fff2b0', 5); }
      else if (!s.hit.has(b)) { s.hit.add(b); if (!s.pierce) s.dead = true; G.fx.sparkBurst(s.x, s.y, '#fff', 3); G.audio.sfx('hit'); }
    }
    B.updateRocks(g);
  };
  B.drawWyrm = function (ctx, g) {
    const b = g.boss, S = G.sprites.wyrm; if (b.y > LAVA_Y + 20 && b.state !== 'warn') return;
    const x = Math.round(b.x), up = b.y < LAVA_Y + 20;
    if (up) {
      const top = Math.round(b.y) + 22;
      for (let y = LAVA_Y - 6; y > top - 6; y -= 11) ctx.drawImage(S.neck, x - S.neck.ax + Math.round(Math.sin(y * 0.05 + b.anim) * 2), y - S.neck.ay - 1);
      const fr = S.head[b.open ? 1 : 0], c = b.face >= 0 ? fr.r : fr.l, ax = b.face >= 0 ? fr.ax : fr.w - 1 - fr.ax, hx = x - ax, hy = Math.round(b.y) - fr.ay;
      ctx.drawImage(c, hx, hy);
      if (b.flash > 0) { ctx.globalAlpha = 0.6; ctx.drawImage(G.sprites.whiteOf(c), hx, hy); ctx.globalAlpha = 1; }
    }
    { const sp = S.splash[Math.floor(b.anim) % 3]; ctx.drawImage(sp, x - sp.ax, LAVA_Y + 4 - sp.ay); }
  };
})((window.SGS = window.SGS || {}));
