/* Draws a frame of the game (room, aliens, bubbles, astronaut, effects) onto the internal canvas. */
(function (G) {
  'use strict';
  const PX = G.px, S = G.sprites, TILE = G.C.TILE;
  const R = {};
  G.render = R;
  const flipDraw = (ctx, c, x, y, ax, ay, f) => {
    x = Math.round(x); y = Math.round(y);
    if (f < 0) { ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(c, -ax, -ay); ctx.restore(); } else ctx.drawImage(c, x - ax, y - ay);
  };
  const orb = (ctx, x, y, r, c1, c2) => { x = Math.round(x); y = Math.round(y); ctx.fillStyle = c1; ctx.fillRect(x - r, y - r + 1, 2 * r, 2 * r - 2); ctx.fillRect(x - r + 1, y - r, 2 * r - 2, 2 * r); ctx.fillStyle = c2; ctx.fillRect(x - 1, y - 1, 2, 2); };
  let baked = null, bakedKey = '';
  R.draw = function (ctx, g, iw, time) {
    const room = g.room; if (!room) return;
    const key = g.level + '|' + iw + '|' + room.cols;
    if (key !== bakedKey) { baked = G.tiles.bake(room, iw); bakedKey = key; }
    const ox = baked.ox, world = g.world, F = S.foes(world), shake = G.settings.shake && !G.settings.reduced ? g.shake : 0;
    ctx.save();
    if (shake > 0.2) ctx.translate(Math.round((Math.random() - 0.5) * shake), Math.round((Math.random() - 0.5) * shake));
    ctx.drawImage(baked, 0, 0);
    ctx.translate(ox, 0);
    // low-gravity pockets
    for (const z of room.lowg) {
      ctx.fillStyle = 'rgba(120,160,255,0.08)'; ctx.fillRect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0);
      ctx.fillStyle = 'rgba(190,220,255,0.5)'; for (let i = 0; i < 14; i++) { const px = z.x0 + ((i * 37 + time * (6 + (i % 3) * 3)) % (z.x1 - z.x0)), py = z.y1 - ((i * 53 + time * (10 + (i % 4) * 4)) % (z.y1 - z.y0)); ctx.fillRect(Math.round(px), Math.round(py), 1, 1); }
    }
    if (G.boss && room.boss && g.bossObj) G.boss.draw(ctx, g, time);
    // items
    for (const it of g.items) {
      if (it.age > 9 && Math.floor(time * 12) % 2) continue;
      const spr = it.kind === 'snack' ? S.snack[it.spr] : it.kind === 'candy' ? S.candy[it.sub] : it.kind === 'warp' ? S.warp : S.life;
      ctx.drawImage(spr, Math.round(it.x - spr.width / 2), Math.round(it.y - spr.height + 1 + (it.kind === 'warp' ? Math.sin(time * 5) * 1.5 : 0)));
    }
    // aliens (trapped ones are drawn inside their bubbles)
    for (const f of g.foes) {
      if (f.dead || f.state === 'trapped') continue;
      if (f.state === 'spawn') { if (f.warp) { const k = 1 - f.t / 0.5, r = 14 * (1 - k) + 2; ctx.fillStyle = '#bff4ff'; for (let i = 0; i < 8; i++) { const an = i * 0.785 + k * 2; ctx.fillRect(Math.round(f.x + Math.cos(an) * r), Math.round(f.y - 6 + Math.sin(an) * r), 2, 2); } if (k > 0.6) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(f.x) - 3, Math.round(f.y) - 6, 6, 1); ctx.fillRect(Math.round(f.x), Math.round(f.y) - 9, 1, 6); } } continue; }
      const spr = F[f.type][f.angry ? 1 : 0][Math.floor(f.anim * (f.angry ? 10 : 6)) & 1];
      flipDraw(ctx, spr, f.x, f.y, 8, 15, f.face >= 0 ? 1 : -1);
    }
    // bubbles
    for (const b of g.bubbles) {
      if (b.life < 1.4 && Math.floor(time * 14) % 2) continue;
      if (b.enemy) { const f = b.enemy, spr = F[f.type][f.angry ? 1 : 0][Math.floor(time * 4) & 1]; ctx.globalAlpha = 0.92; flipDraw(ctx, spr, b.x, b.y + 6, 8, 15, f.face >= 0 ? 1 : -1); ctx.globalAlpha = 1; }
      const spr = b.kind === 'letter' ? S.bub.letter[b.letter] : S.bub.big[b.kind] || S.bub.air[Math.floor(b.bob * 1.1) & 1];
      ctx.drawImage(spr, Math.round(b.x - spr.width / 2), Math.round(b.y - spr.height / 2));
    }
    // astronaut
    const P = g.P, H = S.hero;
    if (!(P.invuln > 0 && !P.dead && Math.floor(time * 18) % 2)) {
      let spr;
      if (P.dead) spr = H.die[Math.floor(P.deadT * 10) % 4];
      else if (P.blowAnim > 0) spr = P.ground ? H.blow : H.blowAir;
      else if (!P.ground) spr = P.vy < 0 ? H.up : H.down;
      else if (P.vx !== 0) spr = H.run[Math.floor(P.anim) & 3];
      else spr = H.stand[0];
      flipDraw(ctx, spr, P.x, P.y + 1, 9, 17, P.face >= 0 ? 1 : -1);
    }
    // shots
    for (const s of g.shots) {
      if (s.kind === 'bolt') { ctx.fillStyle = '#fff6a0'; ctx.fillRect(Math.round(s.x) - 4, Math.round(s.y) - 1, 8, 2); ctx.fillStyle = '#ffd24a'; ctx.fillRect(Math.round(s.x) - 6 * Math.sign(s.vx), Math.round(s.y), 3, 1); }
      else if (s.kind === 'orb') orb(ctx, s.x, s.y, s.r, s.col, s.col2);
      else if (s.kind === 'ball') orb(ctx, s.x, s.y, 3, '#ff5ad0', '#fff');
      else if (s.kind === 'bomb') { orb(ctx, s.x, s.y, 4, '#2a2a40', '#7a7a9a'); ctx.fillStyle = Math.floor(time * 20) & 1 ? '#ffe27a' : '#ff7a2a'; ctx.fillRect(Math.round(s.x), Math.round(s.y) - 6, 1, 2); }
      else if (s.kind === 'boom') { const k = s.t / s.life, r = 6 + k * 10; ctx.fillStyle = k < 0.5 ? '#fff6a0' : '#ff7a2a'; for (let a = 0; a < 12; a++) ctx.fillRect(Math.round(s.x + Math.cos(a * 0.52) * r), Math.round(s.y + Math.sin(a * 0.52) * r), 2, 2); orb(ctx, s.x, s.y, Math.max(2, Math.round(6 - k * 5)), '#ffa22a', '#fff'); }
      else if (s.kind === 'wave') { ctx.fillStyle = '#5aa0ff'; ctx.fillRect(Math.round(s.x) - 6, Math.round(s.y) - 4, 12, 6); ctx.fillStyle = '#bfeaff'; ctx.fillRect(Math.round(s.x) - 6, Math.round(s.y) - 4, 12, 1); ctx.fillRect(Math.round(s.x) - 3, Math.round(s.y) - 6, 3, 2); }
      else if (s.kind === 'arc') { ctx.fillStyle = '#fff6a0'; for (let i = 0; i < 8; i++) ctx.fillRect(Math.round(s.x - Math.sign(s.vx) * i * 5), Math.round(s.y + (i & 1 ? 2 : -2)), 5, 2); }
      else if (s.kind === 'fire') orb(ctx, s.x, s.y, 4, Math.floor(time * 16) & 1 ? '#ff7a2a' : '#ffb040', '#fff6a0');
      else if (s.kind === 'ice') orb(ctx, s.x, s.y, 3, '#7ad8ff', '#ffffff');
    }
    if (g.chaser) { const c = g.chaser; ctx.globalAlpha = 0.95; ctx.drawImage(S.maw, Math.round(c.x - 10 + Math.sin(time * 9)), Math.round(c.y - 10)); ctx.globalAlpha = 1; }
    for (const p of g.parts) { ctx.fillStyle = p.c; const a = 1 - p.t / p.life; if (a < 0.3 && Math.floor(p.t * 30) & 1) continue; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.ring ? 1 : 2, p.ring ? 1 : 2); }
    for (const f of g.floats) PX.text(ctx, f.txt, Math.round(f.x), Math.round(f.y - 4), { s: 1, c: f.col, o: '#0b0d1a', a: 'c' });
    ctx.restore();
  };
})((window.SGS = window.SGS || {}));
