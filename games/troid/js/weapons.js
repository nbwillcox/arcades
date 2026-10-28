/* Beam shots (base / ice / wave / plasma, chargeable), missiles, super missiles, morph-ball bombs, and what they do to blocks and enemies. */
(function (G) {
  'use strict';
  const RM = G.room, PH = G.phys, P = G.player, U = G.U, T = 16;
  const W = {};
  G.weapons = W;
  W.beam = function (A) {
    const b = A.beams || {}, col = b.plasma ? ['#ff7a2a', '#fff6a0'] : b.wave ? ['#b878ff', '#f2e0ff'] : b.ice ? ['#7ad8ff', '#ffffff'] : ['#ffd24a', '#fff6a0'];
    const style = b.plasma ? 'plasma' : b.wave ? 'wave' : b.ice ? 'ice' : 'base', mods = []; if (b.ice && style !== 'ice') mods.push('ice'); if (b.wave && style !== 'wave') mods.push('wave');
    return { style, mods, dmg: 1 + (b.wave ? 1 : 0) + (b.plasma ? 2 : 0), cdmg: 1 + (b.wave ? 1 : 0) + (b.ice ? 1 : 0) + (b.plasma ? 2 : 0), ice: !!b.ice, wave: !!b.wave, pierce: !!b.plasma, col };
  };
  /* charge beam: hold Fire past a short delay and p.charge climbs. Release early for a partial shot (tier 1, 1.5x to 3x), at CH.full for a full piercing shot (tier 2, 4x), at CH.mega for an overcharge (tier 3, 10x, huge and piercing) */
  const CH = { min: 12, full: 60, mega: 110, max: 120 };
  W.CHARGE = CH;
  const tierOf = (c) => (c >= CH.mega ? 3 : c >= CH.full ? 2 : c >= CH.min ? 1 : 0);
  function shoot(g, p, tier, ch) {
    const m = P.muzzle(p), v = P.aimVec(p), B = W.beam(g.abil), f = tier === 1 ? (ch - CH.min) / (CH.full - CH.min) : 1;
    const mult = [1, 1.5 + 1.5 * f, 4, 10][tier], sp = [6, 6.2, 7, 8.5][tier], r = [2, 3 + Math.round(f * 2), 5, 9][tier];
    g.shots.push({ kind: 'beam', x: m.x, y: m.y, vx: v.x * sp, vy: v.y * sp, life: [90, 85, 80, 110][tier], dmg: tier === 3 ? B.cdmg * 20 : B.dmg * mult, r, ice: B.ice, wave: B.wave, pierce: B.pierce || tier >= 2, col: B.col, style: B.style, mods: B.mods, big: tier >= 2, tier, f, t: 0, hit: new Set() });
    if (tier < 2) G.fx.flash(m.x, m.y, B.col[1], 3); else G.fx.sparkBurst(m.x, m.y, B.col[1], tier === 3 ? 14 : 7);
    if (tier === 3) { G.fx.ring(m.x, m.y); g.shake = Math.max(g.shake, 4); }
    G.audio.sfx(tier === 3 ? 'mega' : tier ? 'charged' : 'shot');
  }
  function missile(g, p) {
    const sup = p.sel === 1 && g.abil.supers && p.supers > 0;
    if (sup) p.supers--; else if (p.missiles > 0 && g.abil.missiles) p.missiles--; else return;
    const m = P.muzzle(p), v = P.aimVec(p);
    g.shots.push({ kind: sup ? 'super' : 'missile', x: m.x, y: m.y, vx: v.x * 2, vy: v.y * 2, dx: v.x, dy: v.y, spd: 2, life: 130, dmg: sup ? 24 : 8, r: 3, t: 0, hit: new Set() });
    p.missCd = 12; G.audio.sfx(sup ? 'super' : 'missile');                                   /* missiles have their own cooldown, so the beam keeps firing while they launch */
  }
  function bomb(g, p) {
    let small = 0; for (const b of g.bombs) if (!b.big) small++;
    if (small >= 3) return;
    g.bombs.push({ x: p.x, y: p.y - 7, t: 0, fuse: 48 }); p.bombCd = 12; G.audio.sfx('bomb');
  }
  function superBomb(g, p) {
    if (p.sbombs <= 0 || g.bombs.some((b) => b.big)) { p.bombCd = 10; return; }
    p.sbombs--; g.bombs.push({ x: p.x, y: p.y - 8, t: 0, fuse: 70, big: true }); p.bombCd = 20; G.audio.sfx('bomb');
  }
  W.usesCharge = (g) => !!g.abil.charge && G.settings.fireMode !== 'rapid';
  W.playerFire = function (g, p, I, D) {
    const A = g.abil;
    if (p.hurt > 0 || p.dead) { p.charge = 0; p.held = 0; return; }
    if (p.mode === 'ball') { if (D.fire && A.bombs && p.bombCd === 0) bomb(g, p); else if (D.missile && A.sbombs && p.bombCd === 0) superBomb(g, p); p.charge = 0; return; }
    const useCharge = G.weapons.usesCharge(g);                                               /* the charge beam is used only if it is owned AND chosen in the status screen (otherwise rapid fire) */
    if (!useCharge) { if (I.fire && p.fireCd === 0) { shoot(g, p, 0, 0); p.fireCd = A.charge ? 6 : 9; } p.charge = 0; p.held = 0; }
    else {
    if (D.fire && p.fireCd === 0) { shoot(g, p, 0, 0); p.fireCd = 8; p.held = 0; }
    if (I.fire) {
      p.held++;
      if (p.held > 14) {
        const c0 = p.charge; p.charge = Math.min(CH.max, p.held - 14); if (p.charge === 1) G.audio.sfx('chargeStart');
        if (c0 < CH.full && p.charge >= CH.full) G.audio.sfx('chargeFull');
        if (c0 < CH.mega && p.charge >= CH.mega) { G.audio.sfx('chargeMega'); g.shake = Math.max(g.shake, 2); }
        if (p.charge >= CH.mega && p.held % 4 === 0) g.shake = Math.max(g.shake, 0.8);
      }
    } else { if (p.charge >= CH.min) { const t = tierOf(p.charge); shoot(g, p, t, p.charge); p.fireCd = t === 3 ? 22 : 14; } p.charge = 0; p.held = 0; }
    }
    if (D.missile && (p.missCd || 0) === 0 && p.mode !== 'ball' && !(useCharge && p.charge > 0)) missile(g, p);          /* missiles and beam together, unless a charge is building */
    if (D.swap && A.supers) p.sel = 1 - p.sel;
    if (D.b1) A.beams.ice = !A.beams.ice && A.hasIce; if (D.b2) A.beams.wave = !A.beams.wave && A.hasWave; if (D.b3) A.beams.plasma = !A.beams.plasma && A.hasPlasma;
  };
  W.breakAt = function (g, tx, ty, kind) {
    const k = RM.at(g.room, tx, ty);
    const ok = k === 5 || (k === 17 && (kind === 'mega' || kind === 'megawave')) || (k === 12 && (kind === 'wave' || kind === 'megawave')) || (k === 6 && (kind === 'bomb')) || (k === 7 && (kind === 'missile' || kind === 'super' || kind === 'bomb2'));
    if (!ok) return false;
    if (k === 17) { const q = [[tx, ty]]; while (q.length) { const [x, y] = q.pop(); if (RM.at(g.room, x, y) !== 17) continue; RM.set(g.room, x, y, 0); G.fx.debris(x * T + 8, y * T + 8, ['#8ad8f0', '#d8f6ff', '#52627a']); q.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); } G.audio.sfx('break'); G.audio.sfx('boom'); g.shake = Math.max(g.shake, 4); return true; }
    RM.set(g.room, tx, ty, 0); G.fx.debris(tx * T + 8, ty * T + 8, k === 5 ? ['#8a5a40', '#b88454', '#5c3a34'] : ['#52627a', '#7f8c96', '#33405e']); G.audio.sfx('break');
    return true;
  };
  function explode(g, x, y, r, dmg, kind) {
    G.fx.boom(x, y, r);
    for (let ty = Math.floor((y - r) / T); ty <= Math.floor((y + r) / T); ty++) for (let tx = Math.floor((x - r) / T); tx <= Math.floor((x + r) / T); tx++) if (U.dist2(tx * T + 8, ty * T + 8, x, y) <= (r + 6) * (r + 6)) W.breakAt(g, tx, ty, kind);
    for (const f of g.foes) if (!f.dead && U.dist2(f.x, f.y - f.h / 2, x, y) <= (r + f.w / 2) * (r + f.w / 2)) G.enemies.damage(g, f, dmg, kind);
    if (G.bosses) G.bosses.blast(g, x, y, r, kind);
    g.shake = Math.max(g.shake, r > 20 ? 3 : 1.5);
  }
  /* spinflip attack: while the hero is overcharged and flipping through the air (see player_update) the whole body is a weapon. Every enemy it touches takes the overcharge damage (20 per beam upgrade, 100 with ice + wave + plasma),
     it breaks shot blocks and overcharge walls (wave blocks too with the wave beam), and ice freezes what it hits. Per enemy a hit lands every 8 ticks; bosses take at most 40 every 30 ticks. */
  W.spinAttack = function (g) {
    const p = g.P;
    if (!p.spinAtk) { p.spinAtkT = 0; g.spinTrail = null; return; }
    p.spinAtkT = (p.spinAtkT || 0) + 1;
    const B = W.beam(g.abil), dmg = B.cdmg * 20, now = g.time, x0 = p.x - 15, x1 = p.x + 15, y0 = p.y - 42, y1 = p.y + 2;
    const fake = { ice: B.ice, wave: B.wave, pierce: true, kind: 'beam', dmg, tier: 3, col: B.col, hit: new Set() };
    if (p.spinAtkT === 1) { G.audio.sfx('spinStart'); G.fx.ring(p.x, p.y - 20); g.shake = Math.max(g.shake, 2); }
    else if (p.spinAtkT % 12 === 0) G.audio.sfx('spinLoop');
    for (const f of g.foes) {
      if (f.dead || f.ghost) continue;
      if (x1 > f.x - f.w / 2 && x0 < f.x + f.w / 2 && y1 > f.y - f.h && y0 < f.y && now - (f.spinHit === undefined ? -99 : f.spinHit) >= 8) {
        f.spinHit = now; G.enemies.damage(g, f, dmg, 'beam', fake); G.fx.sparkBurst(f.x, f.y - f.h / 2, B.col[1], 7); g.shake = Math.max(g.shake, 1.5);
      }
    }
    if (G.bosses && G.bosses.spinHit && g.boss) G.bosses.spinHit(g, dmg);
    const kind = B.wave ? 'megawave' : 'mega';
    for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) { const k = RM.at(g.room, tx, ty); if (k === 5 || k === 17 || (k === 12 && B.wave)) W.breakAt(g, tx, ty, kind); }
    if (p.spinAtkT % 2 === 0) G.fx.spark(p.x + (Math.random() - 0.5) * 34, p.y - 20 + (Math.random() - 0.5) * 44, B.col[Math.random() < 0.5 ? 0 : 1]);
    const tr = g.spinTrail = g.spinTrail || []; tr.unshift({ x: p.x, y: p.y, fr: G.player.frame(p), face: p.face }); if (tr.length > 6) tr.pop();
  };
  /* the super dash: while the dash burst runs the hero is wrapped in energy. It shatters dash blocks and shot blocks in its path and hurts every enemy it touches (a hit per enemy every 8 ticks; damage 6 plus 3 per beam upgrade),
     a stunned boss's weak point too. The energy also armours him (see P.hurt). */
  W.dashAttack = function (g) {
    const p = g.P;
    if (!(p.dash > 0) || !g.abil.dash) { if (g.dashTrail && g.dashTrail.length) g.dashTrail.pop(); return; }
    const dir = p.dashDir || p.face, B = W.beam(g.abil), dmg = 6 + 3 * B.dmg, now = g.time, x0 = Math.min(p.x - 12, p.x + dir * 22), x1 = Math.max(p.x + 12, p.x + dir * 22), y0 = p.y - 42, y1 = p.y + 1;
    const fake = { ice: false, wave: false, pierce: true, kind: 'beam', dmg, tier: 2, col: B.col, hit: new Set() };
    for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++) for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) {
      const k = RM.at(g.room, tx, ty);
      if (k === 13) { RM.set(g.room, tx, ty, 0); G.fx.debris(tx * T + 8, ty * T + 8, ['#efba42', '#946a78', '#46283a']); G.audio.sfx('break'); g.shake = Math.max(g.shake, 2); }
      else if (k === 5) W.breakAt(g, tx, ty, 'shot');
    }
    for (const f of g.foes) {
      if (f.dead || f.ghost) continue;
      if (x1 > f.x - f.w / 2 && x0 < f.x + f.w / 2 && y1 > f.y - f.h && y0 < f.y && now - (f.dashHit === undefined ? -99 : f.dashHit) >= 8) {
        f.dashHit = now; G.enemies.damage(g, f, dmg, 'beam', fake); G.fx.sparkBurst(f.x, f.y - f.h / 2, B.col[1], 8); g.shake = Math.max(g.shake, 2); G.audio.sfx('hit');
      }
    }
    if (G.bosses && G.bosses.spinHit && g.boss) G.bosses.spinHit(g, Math.min(dmg, 12));
    const tr = g.dashTrail = g.dashTrail || []; tr.unshift({ x: p.x, y: p.y, fr: G.player.frame(p), face: p.face, t: 0 }); if (tr.length > 7) tr.pop();
  };
  W.update = function (g) {
    const room = g.room, p = g.P;
    W.spinAttack(g); W.dashAttack(g);
    for (const s of g.shots) {
      s.t++;
      if (s.kind === 'missile' || s.kind === 'super') { s.spd = Math.min(s.kind === 'super' ? 5 : 5.5, s.spd + 0.18); s.vx = s.dx * s.spd; s.vy = s.dy * s.spd; if (s.t % 2 === 0) G.fx.spark(s.x - s.dx * 3, s.y - s.dy * 3, '#ffd2a0'); }
      if (s.wave) s.y += Math.sin(s.t * 0.7) * 1.4;
      s.x += s.vx; s.y += s.vy; s.life--;
      const tx = Math.floor(s.x / T), ty = Math.floor(s.y / T), k = RM.at(room, tx, ty);
      if (RM.isSolid(k) || ((k === 3 || k === 4) && s.y >= RM.surface(k, ty, Math.floor(s.x) - tx * T))) {
        const brk = W.breakAt(g, tx, ty, s.kind === 'beam' ? (s.tier === 3 ? (s.wave ? 'megawave' : 'mega') : s.wave ? 'wave' : 'shot') : s.kind);
        if (k === 9) G.world.shotDoor(g, tx, ty, s.kind === 'beam' ? 'shot' : s.kind);
        if (k === 5 && s.kind === 'beam') { s.dead = true; G.fx.spark(s.x, s.y, '#fff'); }
        else if (s.wave && s.kind === 'beam') { /* wave passes walls */ }
        else { s.dead = true; if (s.kind === 'missile' || s.kind === 'super') explode(g, s.x - s.vx * 0.5, s.y - s.vy * 0.5, s.kind === 'super' ? 30 : 18, s.dmg * 0.4, s.kind); else if (s.tier === 3) { explode(g, s.x - s.vx * 0.5, s.y - s.vy * 0.5, 24, s.dmg * 0.3, 'beam'); G.fx.sparkBurst(s.x, s.y, s.col[1], 12); } else G.fx.sparkBurst(s.x, s.y, s.col ? s.col[1] : '#fff', s.tier ? 8 : 4); }
        if (brk && s.kind === 'beam') s.dead = true;
      }
      if (s.life <= 0) s.dead = true;
      if (s.dead) continue;
      for (const f of g.foes) {
        if (f.dead || s.hit.has(f) || f.ghost) continue;
        if (Math.abs(s.x - f.x) < f.w / 2 + s.r && s.y > f.y - f.h - s.r - 3 && s.y < f.y + s.r + 2) {
          s.hit.add(f); G.enemies.damage(g, f, s.dmg, s.kind, s);
          if (s.kind === 'missile' || s.kind === 'super') { s.dead = true; explode(g, s.x, s.y, s.kind === 'super' ? 30 : 18, 0, s.kind); }
          else if (!s.pierce) { s.dead = true; G.fx.sparkBurst(s.x, s.y, s.col[1], s.tier ? 9 : 5); }
          else if (s.tier >= 2) { G.fx.sparkBurst(s.x, s.y, s.col[1], s.tier === 3 ? 10 : 6); if (s.tier === 3) g.shake = Math.max(g.shake, 2); }
          break;
        }
      }
    }
    g.shots = g.shots.filter((s) => !s.dead);
    for (const b of g.bombs) {
      b.t++;
      if (b.t >= b.fuse) {
        b.dead = true; if (b.big) explode(g, b.x, b.y, 56, 30, 'bomb2'); else explode(g, b.x, b.y, 26, 6, 'bomb');
        const dx = p.x - b.x, dy = (p.y - p.h / 2) - b.y;
        if (!b.big && p.mode === 'ball' && dx * dx + dy * dy < 30 * 30) { p.vy = -4.6; p.vx += Math.sign(dx || 1) * 1.3; p.ground = false; }
        G.audio.sfx('boom');
      }
    }
    g.bombs = g.bombs.filter((b) => !b.dead);
  };
})((window.SGS = window.SGS || {}));
