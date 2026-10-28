/* Warden AI + drawing (state machine). Needs js/bosses.js. */
(function (G) {
  'use strict';
  const U = G.U, B = G.bosses;
  B.updateBeetle = function (g) {
    const b = g.boss, p = g.P;
    if (!b) { B.updateRocks(g); return; }
    b.t++; b.flash = Math.max(0, b.flash - 1); b.anim += 0.1;
    const lo = B.PAD + 14, hi = g.room.pw - B.PAD - 14, sp = [0, 0.55, 0.75, 0.95][b.phase];
    const faceP = () => { b.face = p.x >= b.x ? 1 : -1; }, faceP2 = () => { b.face = -Math.sign(b.vxs || 1) || 1; };
    if (b.floor === undefined) b.floor = b.y;
    if (b.state === 'wait') { if (p.x > 150) { b.state = 'intro'; b.t = 0; G.world.sealDoors(g); } }
    else if (b.state === 'intro') { faceP(); g.shake = Math.max(g.shake, 2); if (b.t === 20) G.audio.sfx('boom'); if (b.t > 90) { b.state = 'walk'; b.t = 0; } }
    else if (b.state === 'walk') {
      faceP(); b.x = U.clamp(b.x + b.face * sp, lo, hi);
      if (b.t > 100 - b.phase * 14) {
        const r = Math.random(); b.since = (b.since || 0) + 1; b.rico = false;
        if (b.since >= 3) b.state = 'tele';                                                                         /* never more than two non-charge attacks in a row: the weak spot is always coming */
        else if (b.phase === 1) b.state = r < 0.55 ? 'tele' : 'volley';
        else if (r < 0.30) b.state = 'leap';                                                                         /* a jumping slam with shockwaves (he is stuck in the floor afterwards) */
        else if (r < 0.50) b.state = 'roots';                                                                        /* roots spear up round you */
        else b.state = r < 0.86 ? 'tele' : 'volley';
        if (b.state === 'tele') { b.willRico = b.phase >= 3 && Math.random() < 0.35; }
        b.t = 0;
      }
    } else if (b.state === 'volley') { if (b.t === 24) B.volley(g, b); if (b.t > 52) { b.state = 'walk'; b.t = 0; } }
    else if (b.state === 'tele') {
      faceP(); if (b.t % 12 === 0) G.fx.puff(b.x - b.face * 40, b.y, 3);
      if (b.t > 48) { b.state = 'charge'; b.t = 0; b.vx = b.face * [0, 3.6, 4.1, 4.8][b.phase]; G.audio.sfx('missile'); }
    } else if (b.state === 'leap') {
      faceP();
      if (b.t < 22) { if (b.t % 6 === 0) G.fx.puff(b.x, b.y, 3); b.fy = 0; }                                              /* crouches, dust */
      else if (b.t === 22) { b.vy = -9.4; b.vx = U.clamp((p.x - b.x) / 36, -4.2, 4.2); b.air = true; G.audio.sfx('missile'); }
      else if (b.air) {
        b.y += b.vy; b.vy += 0.52; b.x = U.clamp(b.x + b.vx, lo, hi);
        if (b.y >= b.floor && b.vy > 0) {
          b.y = b.floor; b.air = false; b.vx = 0; b.state = 'stun'; b.stunLen = 100; b.since = 0; b.t = 0; g.shake = 11; G.audio.sfx('boom'); G.fx.debris(b.x - 30, b.y - 4, ['#52627a', '#7f8c96']); G.fx.debris(b.x + 30, b.y - 4, ['#52627a', '#7f8c96']);
          const sp = [0, 2.1, 2.5, 3.0][b.phase]; g.waves.push({ x: b.x - 40, y: b.y, vx: -sp, t: 0 }, { x: b.x + 40, y: b.y, vx: sp, t: 0 });
          if (b.phase >= 3) B.rocks(g, 3);
          if (!p.dead && Math.abs(p.x - b.x) < 44 && p.y > b.y - 12 && G.player.hurt(g, p, 22, b.x)) G.audio.sfx('hurt');          /* landing on him hurts */
        }
      }
    } else if (b.state === 'recover') { if (b.t > 46) { b.state = 'walk'; b.t = 0; } }
    else if (b.state === 'roots') {
      faceP();
      if (b.t === 1) G.audio.sfx('chargeStart');
      if (b.t === 20) {                                                                                              /* cracks open under and around where you stand now, outer ones first so they close in */
        const n = b.phase >= 3 ? 4 : 3; for (let k = n; k >= 0; k--) for (const sgn of k ? [-1, 1] : [1]) g.roots.push({ x: U.clamp(p.x + sgn * k * 38, lo, hi), y: b.floor, t: 0, delay: (n - k) * 14 });
      }
      if (b.t > 118) { b.state = 'walk'; b.t = 0; }
    } else if (b.state === 'ricochet') {
      faceP2(); b.vx = 0; if (b.t % 5 === 0) G.fx.puff(b.x + b.face * 30, b.y, 2);
      if (b.t > 22) { b.state = 'charge'; b.t = 0; b.vx = -b.vxs; b.face = b.vx >= 0 ? 1 : -1; G.audio.sfx('missile'); }
    } else if (b.state === 'charge') {
      b.x += b.vx; if (b.t % 4 === 0) G.fx.puff(b.x - Math.sign(b.vx) * 40, b.y, 2);
      if ((b.x <= lo || b.x >= hi) && b.willRico && !b.rico) {                                                    /* later phases: he bounces off the wall and charges back, so the stun has to be earned twice over */
        b.x = U.clamp(b.x, lo, hi); b.rico = true; b.vxs = b.vx; b.state = 'ricochet'; b.t = 0; g.shake = 7; G.audio.sfx('boom'); G.fx.debris(b.x + Math.sign(b.vx) * 44, b.y - 30, ['#52627a', '#7f8c96']); B.rocks(g, 2);
      } else if (b.x <= lo || b.x >= hi) {
        b.x = U.clamp(b.x, lo, hi); b.state = 'stun'; b.t = 0; b.vx = 0; g.shake = 12; G.audio.sfx('boom'); b.since = 0; b.stunLen = b.rico ? 190 : b.phase === 3 ? 135 : 160; b.willRico = false;
        G.fx.debris(b.x + b.face * 44, b.y - 30, ['#52627a', '#7f8c96', '#33405e']);
        if (b.phase >= 2) B.rocks(g, b.phase === 3 ? 6 : 4);
        B.dropItems(g);
      }
    } else if (b.state === 'stun') {
      if (b.phase === 3 && b.t % 70 === 0) B.rocks(g, 2);
      if (b.t > (b.stunLen || 150)) { b.state = 'walk'; b.t = 0; b.rico = false; }
    } else if (b.state === 'dying') {
      if (b.t % 6 === 0) G.fx.boom(b.x + (Math.random() - 0.5) * 90, b.y - 10 - Math.random() * 50, 9);
      g.shake = 5; if (b.t === 140) B.finish(g, b);
    }
    if (!g.boss) { B.updateRocks(g); return; }
    if (!p.dead && b.state !== 'wait' && !b.dead && Math.abs(p.x - b.x) < (p.w + b.w) / 2 - 4 && p.y > b.y - b.h + 12 && p.y - p.h < b.y - 4) { if (G.player.hurt(g, p, b.state === 'charge' ? 24 : 15, b.x)) G.audio.sfx('hurt'); }
    if (!b.dead) for (const s of g.shots) {
      if (s.dead) continue;
      const near = Math.abs(s.x - b.x) < b.w / 2 + 4 && s.y > b.y - b.h - 20 && s.y < b.y;
      if (!near) continue;
      const hitCore = B.vulnerable(b) && B.inCore(b, s.x, s.y);
      if (s.kind === 'missile' || s.kind === 'super') { s.dead = true; G.fx.boom(s.x, s.y, 10); if (hitCore) B.damage(g, b, s.dmg); else G.audio.sfx('hit'); }
      else if (hitCore) { B.hitBoss(g, b, s); if (!s.pierce) s.dead = true; G.fx.sparkBurst(s.x, s.y, '#f2ffff', 5); }
      else if (!s.hit.has(b)) { s.hit.add(b); if (!s.pierce) s.dead = true; G.fx.sparkBurst(s.x, s.y, '#fff', 3); G.audio.sfx('hit'); }
    }
    B.updateRocks(g);
  };
  const whites = new Map();
  const whiteOf = (c) => { let w = whites.get(c); if (!w) { w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const x = w.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height); whites.set(c, w); } return w; };
  B.drawRocks = function (ctx, g) {
    for (const r of g.roots || []) {
      const x = Math.round(r.x), y = Math.round(r.y), t0 = r.t - r.delay - 38;
      if (r.t > r.delay && t0 < 0) { ctx.fillStyle = '#1a2208'; ctx.fillRect(x - 8, y - 2, 16, 2); ctx.fillStyle = '#8ec050'; ctx.fillRect(x - 5 + ((r.t >> 2) & 1), y - 3, 3, 1); ctx.fillRect(x + 2 - ((r.t >> 2) & 1), y - 3, 3, 1); }   /* the cracks */
      else if (t0 >= 0) { const h = t0 < 6 ? 6 + t0 * 3.5 : t0 > 34 ? Math.max(2, 27 - (t0 - 34) * 4) : 27; ctx.fillStyle = '#26361a'; ctx.fillRect(x - 6, y - h, 12, h); ctx.fillStyle = '#4a7a30'; ctx.fillRect(x - 5, y - h, 7, h); ctx.fillStyle = '#8ec050'; ctx.fillRect(x - 4, y - h, 2, h - 2); ctx.fillStyle = '#d6f08a'; ctx.fillRect(x - 3, y - h - 2, 3, 3); ctx.fillStyle = '#26361a'; ctx.fillRect(x + 3, y - h + 4, 3, 2); }
    }
    for (const w of g.waves || []) { const x = Math.round(w.x), y = Math.round(w.y), d = Math.sign(w.vx); ctx.fillStyle = '#33405e'; ctx.fillRect(x - 6, y - 12, 12, 12); ctx.fillStyle = '#7f8c96'; ctx.fillRect(x - 4 - d * 2, y - 10, 6, 3); ctx.fillStyle = '#d4dcc8'; ctx.fillRect(x - 3 - d * 3, y - 9, 2, 1); ctx.fillStyle = '#6a7a4a'; ctx.fillRect(x - 8 + (w.t & 3), y - 2, 6, 2); }
    for (const r of g.rocks || []) {
      const x = Math.round(r.x), y = Math.round(r.y);
      if (r.ice) { ctx.fillStyle = '#6e9fd0'; ctx.fillRect(x - 3, y - 14, 6, 10); ctx.fillRect(x - 2, y - 4, 4, 4); ctx.fillStyle = '#dff4fc'; ctx.fillRect(x - 3, y - 14, 2, 10); ctx.fillStyle = '#3a64a0'; ctx.fillRect(x + 1, y - 12, 2, 8); ctx.fillRect(x - 1, y, 2, 3); continue; }
      ctx.fillStyle = '#33405e'; ctx.fillRect(x - 6, y - 12, 12, 12); ctx.fillStyle = '#7f8c96'; ctx.fillRect(x - 5, y - 11, 5, 3); ctx.fillStyle = '#1f2744'; ctx.fillRect(x + 2, y - 5, 4, 5);
    }
  };
  B.drawBeetle = function (ctx, g) {
    const b = g.boss; if (!b) return;
    const SP = G.sprites.boss; let fr;
    if (b.state === 'wait' || b.state === 'walk') fr = SP.walk[Math.floor(b.anim * 1.4) & 3];
    else if (b.state === 'intro' || b.state === 'volley' || b.state === 'roots' || b.state === 'ricochet' || (b.state === 'leap' && !b.air)) fr = SP.rear;
    else if (b.state === 'leap' || b.state === 'recover') fr = SP.charge[(b.t >> 2) & 1];
    else if (b.state === 'tele') fr = SP.tele[(b.t >> 2) & 1];
    else if (b.state === 'charge') fr = SP.charge[(b.t >> 2) & 1];
    else fr = SP.stun[(b.t >> 3) & 1];
    const c = b.face >= 0 ? fr.r : fr.l, ax = b.face >= 0 ? fr.ax : fr.w - 1 - fr.ax, x = Math.round(b.x - ax), y = Math.round(b.y - fr.ay);
    ctx.drawImage(c, x + (b.state === 'dying' ? Math.round((Math.random() - 0.5) * 3) : 0), y);
    if (b.flash > 0) { ctx.globalAlpha = 0.6; ctx.drawImage(whiteOf(c), x, y); ctx.globalAlpha = 1; }
  };
})((window.SGS = window.SGS || {}));
