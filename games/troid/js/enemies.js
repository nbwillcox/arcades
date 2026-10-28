/* Enemies (zone 1: shell crawler, glow-moth, spore pod), their drops, and damage handling. Foe boxes: x = centre, y = feet. */
(function (G) {
  'use strict';
  const PH = G.phys, U = G.U, E = 0.001;
  const N = {};
  G.enemies = N;
  N.step = {}; N.frame = {};
  const DEF = N.DEF = {
    crawler: { w: 28, h: 24, hp: 6, dmg: 10, ax: 17, ay: 27 },
    moth: { w: 14, h: 12, hp: 2, dmg: 6, ax: 10, ay: 11 },
    pod: { w: 14, h: 24, hp: 5, dmg: 10, ax: 8, ay: 23 },
  };
  N.spawn = function (g, type, x, y, face) {
    const d = DEF[type];
    const f = { type, x, y, w: d.w, h: d.h, hp: d.hp, hpMax: d.hp, dmg: d.dmg, armor: d.armor, vx: 0, vy: 0, face: face || -1, t: Math.floor(Math.random() * 60), anim: 0, flash: 0, frozen: 0, ground: false, home: { x, y }, dead: false, open: 0 };
    g.foes.push(f); return f;
  };
  const drop = (g, f) => {
    const r = Math.random();
    if (r < 0.5) g.items.push({ kind: 'en', x: f.x, y: f.y - 8, vy: -2, t: 0, life: 560 });
    else if (r < 0.72 && g.abil.missiles) g.items.push({ kind: 'missile', x: f.x, y: f.y - 8, vy: -2, t: 0, life: 560 });
    else if (r < 0.80 && g.abil.sbombs) g.items.push({ kind: 'sbomb', x: f.x, y: f.y - 8, vy: -2, t: 0, life: 560 });
  };
  N.damage = function (g, f, dmg, kind, shot) {
    if (f.dead) return;
    if (shot && shot.ice && f.type !== 'icicle') { f.frozen = 300; G.fx.sparkBurst(f.x, f.y - f.h / 2, '#d4f0fa', 6); }
    if (f.armor && kind === 'beam' && !(shot && shot.tier >= 2)) { dmg *= f.armor; G.fx.spark(f.x, f.y - f.h / 2, '#ffffff'); }       /* armoured: plain beam shots barely scratch it */
    f.hp -= dmg; f.flash = 4; G.audio.sfx('hit');
    if (f.frozen) f.vx = 0;
    if (f.hp <= 0 && !f.scored) { f.scored = true; G.score.kill(g, f); }
    if (f.hp <= 0 && N.die && N.die[f.type] && f.state !== 'boom') { N.die[f.type](g, f); return; }
    if (f.hp <= 0) { f.dead = true; G.fx.boom(f.x, f.y - f.h / 2, 7); G.audio.sfx('die'); drop(g, f); g.kills = (g.kills || 0) + 1; }
  };
  function walkCrawler(g, f) {
    const room = g.room;
    f.vy = Math.min(5, f.vy + 0.3); PH.moveY(room, f, f.vy, false);
    const ahead = f.x + f.face * (f.w / 2 + 1);
    const wall = PH.boxSolid(room, ahead - 1, f.y - f.h, ahead + 1, f.y - E);
    const floor = PH.support(room, { x: ahead, w: 2 }, f.y - 2, f.y + 6, false) !== null;
    if (f.ground && (wall || !floor)) f.face = -f.face;
    PH.moveX(room, f, f.face * (f.spd || 0.38));
    f.anim += 0.07;
  }
  function flyMoth(g, f) {
    const p = g.P, near = Math.abs(p.x - f.x) < 150 && Math.abs((p.y - 20) - (f.y - 6)) < 110;
    f.anim += 0.22; f.t++;
    let tx = f.home.x + Math.sin(f.t * 0.02) * 30, ty = f.home.y + Math.sin(f.t * 0.05) * 6;
    if (near) { tx = p.x + Math.sin(f.t * 0.06) * 40; ty = p.y - 34 + Math.sin(f.t * 0.11) * 14; }
    const sp = near ? 0.85 : 0.35, dx = tx - f.x, dy = ty - f.y;
    f.vx = U.clamp(dx * 0.03, -sp, sp); f.vy = U.clamp(dy * 0.03, -sp, sp);
    f.face = f.vx >= 0 ? 1 : -1;
    const nx = f.x + f.vx, ny = f.y + f.vy;
    if (!PH.boxSolid(g.room, nx - f.w / 2, f.y - f.h, nx + f.w / 2, f.y)) f.x = nx;
    if (!PH.boxSolid(g.room, f.x - f.w / 2, ny - f.h, f.x + f.w / 2, ny)) f.y = ny;
  }
  function pod(g, f) {
    const p = g.P, dx = p.x - f.x, near = Math.abs(dx) < 190 && Math.abs(p.y - f.y) < 120;
    f.face = dx >= 0 ? 1 : -1; f.t++;
    f.open = near ? Math.min(1, f.open + 0.05) : Math.max(0, f.open - 0.03);
    if (near && f.open >= 1 && f.t % 105 === 0) {
      const sx = f.x + f.face * 2, sy = f.y - 20, v = U.clamp(dx / 60, -2.2, 2.2);
      g.spores.push({ x: sx, y: sy, vx: v, vy: -3.4, t: 0 }); G.audio.sfx('spit');
    }
  }
  function foeStep(g, f) {
    f.flash = Math.max(0, f.flash - 1);
    if (f.frozen > 0) { f.frozen--; return; }
    if (N.step[f.type]) N.step[f.type](g, f); else if (f.type === 'crawler') walkCrawler(g, f); else if (f.type === 'moth') flyMoth(g, f); else if (f.type === 'pod') pod(g, f);
  }
  N.walk = walkCrawler; N.fly = flyMoth; N.pod = pod;
  N.update = function (g) {
    const p = g.P;
    for (const f of g.foes) {
      if (f.dead) continue;
      foeStep(g, f);
      if (f.type === 'arc' && !f.on) continue;
      if (!p.dead && !f.ghost && Math.abs(p.x - f.x) < (p.w + f.w) / 2 - 1 && p.y > f.y - f.h + 2 && p.y - p.h < f.y - 2) {
        if (f.frozen > 0 || !(f.dmg > 0)) continue;
        if (G.player.hurt(g, p, f.dmg, f.x)) G.audio.sfx('hurt');
      }
    }
    g.foes = g.foes.filter((f) => !f.dead);
    g.frozenRects = g.foes.filter((f) => f.frozen > 0 && f.type !== 'icicle').map((f) => ({ x0: f.x - f.w / 2 - 4, x1: f.x + f.w / 2 + 4, y: f.y - f.h }));
    for (const s of g.spores) {
      s.t++; if (s.kind !== 'shard' && s.kind !== 'bolt') s.vy += 0.13; s.x += s.vx; s.y += s.vy;
      if (PH.boxSolid(g.room, s.x - 1, s.y - 1, s.x + 1, s.y + 1) || s.t > 200) s.dead = true;
      if (!p.dead && Math.abs(p.x - s.x) < p.w / 2 + 2 && s.y > p.y - p.h && s.y < p.y) { s.dead = true; if (G.player.hurt(g, p, s.dmg || 8, s.x)) G.audio.sfx('hurt'); }
      for (const sh of g.shots) if (!sh.dead && Math.abs(sh.x - s.x) < 5 && Math.abs(sh.y - s.y) < 5) { s.dead = true; if (!sh.pierce) sh.dead = true; G.fx.sparkBurst(s.x, s.y, '#ff7ac6', 4); }
      if (s.dead) G.fx.sparkBurst(s.x, s.y, '#ec5c4a', 3);
    }
    g.spores = g.spores.filter((s) => !s.dead);
    for (const it of g.items) {
      it.t++; it.vy = Math.min(3, it.vy + 0.15); const ny = it.y + it.vy;
      if (PH.boxSolid(g.room, it.x - 3, ny, it.x + 3, ny + 4)) it.vy = 0; else it.y = ny;
      if (!p.dead && Math.abs(p.x - it.x) < p.w / 2 + 5 && it.y > p.y - p.h - 4 && it.y < p.y + 4) {
        it.dead = true; G.audio.sfx('pickup');
        if (it.kind === 'en') p.en = Math.min(G.player.enMax(p), p.en + 5);
        else if (it.kind === 'missile') p.missiles = Math.min(p.missileMax, p.missiles + 2);
        else if (it.kind === 'sbomb') p.sbombs = Math.min(p.sbombMax, p.sbombs + 1);
        else if (it.kind === 'super') p.supers = Math.min(p.superMax, p.supers + 1);
      }
      if (it.t > it.life) it.dead = true;
    }
    g.items = g.items.filter((i) => !i.dead);
  };
  /* the frozen look: the sprite re-coloured with an icy ramp (shading kept), a pale rim on lit edges, hoar-frost tufts on top and a few drips below. Cached per sprite. */
  const ICE = new Map(), hs = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  N.iceOf = function (c) {
    let r = ICE.get(c); if (r) return r;
    const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data, out = document.createElement('canvas'); out.width = w; out.height = h + 6;
    const x = out.getContext('2d'), im = x.createImageData(w, h + 6), o = im.data, op = (px, py) => px >= 0 && py >= 0 && px < w && py < h && src[(py * w + px) * 4 + 3] > 0;
    const put = (px, py, r_, g_, b_) => { if (px < 0 || px >= w || py < 0 || py >= h + 6) return; const i = (py * w + px) * 4; o[i] = r_; o[i + 1] = g_; o[i + 2] = b_; o[i + 3] = 255; };
    const lerp = (a, b, t) => a + (b - a) * t;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      if (!op(px, py)) continue;
      const i = (py * w + px) * 4, lum = Math.pow((0.3 * src[i] + 0.59 * src[i + 1] + 0.11 * src[i + 2]) / 255, 0.8);
      let R, Gc, B; if (lum < 0.55) { const t = lum / 0.55; R = lerp(18, 64, t); Gc = lerp(58, 150, t); B = lerp(112, 214, t); } else { const t = (lum - 0.55) / 0.45; R = lerp(64, 176, t); Gc = lerp(150, 232, t); B = lerp(214, 252, t); }
      if (!op(px, py - 1) || !op(px - 1, py)) { R = 230; Gc = 251; B = 255; } else if (!op(px + 1, py) || !op(px, py + 1)) { R = 47; Gc = 110; B = 160; }
      put(px, py + 3, R, Gc, B);
    }
    for (let px = 0; px < w; px++) {
      let top = -1; for (let py = 0; py < h; py++) if (op(px, py)) { top = py; break; }
      if (top >= 0) { const q = hs(px, 3) % 6; if (q === 0) { put(px, top + 2, 214, 246, 255); if (hs(px, 5) & 1) put(px, top + 1, 170, 226, 252); } }
      let bot = -1; for (let py = h - 1; py >= 0; py--) if (op(px, py)) { bot = py; break; }
      if (bot >= 0 && bot < h - 1 && hs(px, 9) % 6 === 0) { put(px, bot + 4, 122, 216, 245); put(px, bot + 5, 230, 251, 255); }
    }
    x.putImageData(im, 0, 0); ICE.set(c, out); return out;
  };
  N.draw = function (ctx, g, time) {
    const SP = G.sprites.foe;
    for (const f of g.foes) {
      if (f.type === 'arc') { N.drawArc(ctx, f, time); continue; }
      if (f.type === 'magmite' && f.ghost) continue;
      const d = DEF[f.type], set = SP[f.type];
      const fr = N.frame[f.type] ? N.frame[f.type](f, set) : f.type === 'crawler' ? set[Math.floor(f.anim * 2.4) & 3] : f.type === 'moth' ? set[Math.floor(f.anim) & 3] : set[f.open > 0.6 ? 1 : 0];
      const c = f.face >= 0 ? fr.r : fr.l;
      const ax = f.face >= 0 ? d.ax : fr.w - 1 - d.ax;
      const ice = f.frozen > 0 && !(f.frozen < 45 && (f.frozen >> 2) & 1) ? N.iceOf(c) : null;               /* frozen: the creature itself turns to frosted glass (it flickers back to colour just before it thaws) */
      if (ice) ctx.drawImage(ice, Math.round(f.x - ax), Math.round(f.y - d.ay) - 3); else ctx.drawImage(c, Math.round(f.x - ax), Math.round(f.y - d.ay));
      ctx.globalAlpha = 1;
      if (f.flash > 0) { ctx.globalAlpha = 0.45 + 0.1 * f.flash; if (ice) ctx.drawImage(G.sprites.whiteOf(ice), Math.round(f.x - ax), Math.round(f.y - d.ay) - 3); else ctx.drawImage(G.sprites.whiteOf(c), Math.round(f.x - ax), Math.round(f.y - d.ay)); ctx.globalAlpha = 1; }      /* a hit flashes the creature's own silhouette, not a box */
      if (f.frozen > 0) {                                                  /* a few twinkles on the frost, and a slow cold mist drifting off it */
        const bx = Math.round(f.x - f.w / 2), by = Math.round(f.y - f.h), k = f.frozen >> 3;
        for (let n = 0; n < 3; n++) { const ph = (f.frozen + n * 7) & 15; if (ph > 3) continue; const sx = bx + ((k * 7 + n * 11) % Math.max(4, f.w - 2)) + 1, sy = by + ((k * 5 + n * 13) % Math.max(4, f.h - 2)) + 1; ctx.fillStyle = ph < 2 ? '#ffffff' : '#bdeeff'; ctx.fillRect(sx, sy, 1, 1); if (ph < 2) { ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3); } }
        if (f.frozen % 11 === 0) { const mx = bx + ((f.frozen * 3) % Math.max(4, f.w)), my = by + f.h - 2; ctx.fillStyle = '#9fe4ff'; ctx.globalAlpha = 0.6; ctx.fillRect(mx, my, 1, 2); ctx.globalAlpha = 1; }
      }
    }
    for (const s of g.spores) { if (s.kind === 'bolt') { const x = Math.round(s.x), y = Math.round(s.y); ctx.fillStyle = '#38c0b0'; ctx.fillRect(x - 4, y - 1, 9, 3); ctx.fillStyle = '#f2ffff'; ctx.fillRect(x - 3, y, 7, 1); continue; } if (s.kind === 'fire') { const x = Math.round(s.x), y = Math.round(s.y); ctx.fillStyle = '#c04418'; ctx.fillRect(x - 3, y - 3, 7, 7); ctx.fillRect(x - 4, y - 1, 9, 3); ctx.fillStyle = '#ee8428'; ctx.fillRect(x - 2, y - 2, 5, 5); ctx.fillStyle = '#ffc450'; ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#fff2b0'; ctx.fillRect(x, y - 1, 1, 1); continue; } if (s.kind === 'shard') { const x = Math.round(s.x), y = Math.round(s.y); ctx.fillStyle = '#146e94'; ctx.fillRect(x - 3, y - 1, 7, 3); ctx.fillRect(x - 1, y - 3, 3, 7); ctx.fillStyle = '#86f0f2'; ctx.fillRect(x - 2, y - 1, 5, 1); ctx.fillStyle = '#f2ffff'; ctx.fillRect(x - 1, y - 1, 2, 1); continue; } ctx.fillStyle = '#ec5c4a'; ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 1, 4, 3); ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 2, 2, 5); ctx.fillStyle = '#ffb89c'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 1, 1); }
    for (const it of g.items) {
      if (it.t > it.life - 120 && Math.floor(time * 12) % 2) continue;
      const x = Math.round(it.x), y = Math.round(it.y), b = Math.floor(time * 6) & 1;
      const set = G.sprites.drop[it.kind === 'en' ? 'en' : it.kind] || G.sprites.drop.missile, im = set[b], bob = Math.round(Math.sin(it.t * 0.12) * 1);
      ctx.drawImage(im, x - (im.width >> 1), y - im.height + 4 + bob);
    }
  };
})((window.SGS = window.SGS || {}));
