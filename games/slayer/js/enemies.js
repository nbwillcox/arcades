/* enemy AI, mid-bosses, sector bosses (data-driven pattern engine) */
(function () {
  var U = CS.U, fx = CS.fx, AU = CS.audio, G = CS.G, E = CS.E = {};
  var BULLET_COL = '#ff2a9a';

  /* ---------------- regular enemy update ---------------- */
  E.update = function (dt) {
    var p = G.p, a = G.en.a, n = G.en.n, i, e, dx, dy, d, sp, ux, uy, odd = G.frame & 1, ex = Math.exp(-9 * dt), j, o, nb, cnt;
    for (i = 0; i < n; i++) {
      e = a[i]; if (e.dead) continue;
      dx = p.x - e.x; dy = p.y - e.y; d = Math.sqrt(dx * dx + dy * dy) || 1; ux = dx / d; uy = dy / d;
      if (e.flash > 0) e.flash--; if (e.buff > 0) e.buff -= dt; if (e.slow > 0) e.slow -= dt; if (e.shred > 0) e.shred -= dt; if (e.stun > 0) e.stun -= dt; if (e.cd > 0) e.cd -= dt; if (e.inv > 0) e.inv -= dt;
      if (e.burn > 0) { e.burn -= dt; e.tick -= dt; if (e.tick <= 0) { e.tick = 0.5; G.hit(e, e.burnD * 0.5, { src: e.last || '', type: 'fire', noCrit: true, quiet: true }); if (e.dead) continue; } }
      sp = e.spd * (e.buff > 0 ? 1.5 : 1) * (e.slow > 0 ? 0.55 : 1) * (e.stun > 0 ? 0 : 1);
      var mvx = 0, mvy = 0;
      if (e.boss) { bossAI(e, dt, d, ux, uy); }
      else switch (e.type) {
        case 'skeleton': case 'golem': mvx = ux * sp; mvy = uy * sp; break;
        case 'ghost':
          if (d > 140) { mvx = ux * sp; mvy = uy * sp; } else if (d < 100) { mvx = -ux * sp * 0.7; mvy = -uy * sp * 0.7; } else { mvx = -uy * sp * 0.8; mvy = ux * sp * 0.8; }
          e.t1 -= dt; if (e.t1 <= 0 && d < 300 && e.stun <= 0) { e.t1 = 2.6 + Math.random(); G.ebullet(e.x, e.y, Math.atan2(dy, dx), 105, 6 * G.dmgScale(), { r: 4 }); }
          break;
        case 'hound':
          if (e.st === 0) { mvx = ux * sp; mvy = uy * sp; e.t1 -= dt; if (d < 220 && e.t1 <= 0 && e.stun <= 0) { e.st = 1; e.t2 = 0.65; e.ang = Math.atan2(dy, dx); } }
          else if (e.st === 1) { e.t2 -= dt; if (e.stun <= 0 && e.t2 <= 0) { e.st = 2; e.t2 = 0.7; } }
          else if (e.st === 2) { mvx = Math.cos(e.ang) * 320; mvy = Math.sin(e.ang) * 320; e.t2 -= dt; if (e.t2 <= 0) { e.st = 3; e.t2 = 0.8; } }
          else { e.t2 -= dt; if (e.t2 <= 0) { e.st = 0; e.t1 = 1.2 + Math.random() * 1.5; } }
          break;
        case 'lich':
          if (d > 170) { mvx = ux * sp; mvy = uy * sp; } else if (d < 120) { mvx = -ux * sp * 0.8; mvy = -uy * sp * 0.8; } else { mvx = -uy * sp * 0.6; mvy = ux * sp * 0.6; }
          e.t2 -= dt; if (e.t2 <= 0 && e.stun <= 0) { e.t2 = 3; cnt = G.near(e.x, e.y, 100); for (j = 0; j < cnt; j++) G.tmp[j].buff = 2.6; fx.v('ring', e.x, e.y, { r: 6, r2: 100, c: '#8a1aff', w: 2, life: 0.4 }); }
          e.t1 -= dt; if (e.t1 <= 0 && d < 320 && e.stun <= 0) { e.t1 = 4.5 + Math.random(); G.ebullet(e.x, e.y, Math.atan2(dy, dx), 95, 7 * G.dmgScale(), { r: 5, col: '#8a1aff' }); }
          break;
        case 'banshee':
          if (d > 135) { mvx = ux * sp; mvy = uy * sp; } else { mvx = -uy * sp * 0.9; mvy = ux * sp * 0.9; }
          if (d < 75) p.staticT = 0.3; break;
      }
      // separation (half the swarm each frame)
      if (((i & 1) === odd) && !e.boss) {
        nb = G.grid.near(e.x, e.y, e.r * 1.2, G.tmp, 5);
        for (j = 0; j < nb; j++) { o = G.tmp[j]; if (o === e) continue; var sx = e.x - o.x, sy = e.y - o.y, sd = Math.sqrt(sx * sx + sy * sy) || 0.5; mvx += sx / sd * 30; mvy += sy / sd * 30; }
      }
      e.x += (mvx + e.kx) * dt; e.y += (mvy + e.ky) * dt; e.kx *= ex; e.ky *= ex;
      if (Math.abs(dx) > 3) e.face = dx > 0 ? 1 : -1;
      // contact damage
      if (d < e.r + p.r + 2 && e.cd <= 0 && e.stun <= 0 && !(e.st === 1)) { e.cd = 0.6; G.hurtPlayer(e.dmg * (e.boss ? 1.3 : 1), e.x, e.y, 'contact'); }
    }
  };

  /* ---------------- bosses ---------------- */
  E.spawnMid = function (idx) {
    var def = CS.MIDBOSSES[idx % CS.MIDBOSSES.length], e = mkBoss(def, true, idx % CS.MIDBOSSES.length);
    G.banner = { t: 3, text: 'WARNING: MID-BOSS DETECTED', sub: def.n, c: '#ff4a4a' }; AU.sfx('warning'); G.sirenT = 2; fx.shake(0.4);
  };
  E.spawnStageBoss = function () {
    var def = G.def.boss, e = mkBoss(def, false, G.stage);
    G.banner = { t: 3.5, text: 'SECTOR BOSS', sub: def.n, c: '#ffd35a' }; AU.sfx('warning'); AU.sfx('boss'); fx.shake(0.6);
  };
  function mkBoss(def, mid, idx) {
    var p = G.p, a = Math.random() * 6.283, e = G.spawnEnemy('golem', p.x + Math.cos(a) * 380, p.y + Math.sin(a) * 280, null); if (!e) return null;
    e.boss = true; e.mid = mid; e.name = def.n; e.spr = mid ? 'mb_' + idx : 'boss_' + G.stage; e.def = def;
    var S = G.power(), hp = mid ? def.hp * (0.5 + S / 8) * (1 + 0.3 * (G.t / 480)) * (1 + 0.2 * G.stage) : def.hp * (G.blitz ? 0.75 : 1) * (0.6 + 0.4 * (0.5 + S / 8));
    e.mhp = e.hp = Math.round(hp); e.r = mid ? 30 : (G.stage === 9 ? 52 : 44); e.spd = mid ? 54 : 46; e.dmg = (mid ? 18 : 26) * G.dmgScale(); e.armor = (mid ? 3 : 6) + G.stage + (mid ? 0.2 : 0.12) * S; e.kbr = 0.96; e.xp = mid ? 60 + 10 * G.stage : 300; e.gold = 0; e.tag = 'demon';
    e.pats = def.pat.slice(); e.pi = 0; e.gap = 1.4; e.act = null; e.phase = 0; e.big = 1; e.elite = false;
    G.bossOn = e; if (!mid) G.stageBoss = true; return e;
  }
  E.onBossDeath = function (e) {
    G.stats.bosses++; fx.stop(40); fx.shake(0.8); fx.flash = 0.25; fx.flashC = '#fff'; AU.sfx('boom'); AU.sfx('boom', 1, 0.7);
    for (var i = 0; i < 4; i++) fx.v('ring', e.x + U.rr(-24, 24), e.y + U.rr(-24, 24), { r: 6, r2: 80 + i * 20, c: i % 2 ? '#ffe44d' : '#fff', w: 4, life: 0.4 + i * 0.1 });
    fx.burst(e.x, e.y, 60, '#ffe44d', 300, 0.9, 3);
    // clear hostile bullets
    G.eb.clear(); G.wn.clear(); G.bm.clear();
    if (e.mid) { G.drop('chest', e.x, e.y, 0); G.drop('hp', e.x + 14, e.y, 0); G.bossOn = null; }
    else { G.won = true; G.bossOn = null; G.drop('coin', e.x, e.y, 200); }
  };

  function aim(e) { return Math.atan2(G.p.y - e.y, G.p.x - e.x); }
  function fire(e, ang, spd, mul, r) { G.ebullet(e.x, e.y, ang, spd, 8 * (mul || 1) * G.dmgScale(), { r: r || 4, col: BULLET_COL, boss: true, life: 6 }); }
  function ringShot(e, n, off, spd) { for (var i = 0; i < n; i++) fire(e, off + i * 6.283 / n, spd || 120, 0.9); AU.sfx('plasma'); }
  var PAT = {
    orbs: function (e, dt) { var a = e.act; a.t += dt; if (a.t > 0.5 + a.s * 0.25 && a.s < 3) { a.s++; var b = aim(e); for (var i = -1; i <= 1; i++) fire(e, b + i * 0.2, 150, 1); AU.sfx('plasma'); } return a.t > 1.5; },
    fan: function (e, dt) { var a = e.act; a.t += dt; if (a.s === 0 && a.t > 0.6) { a.s = 1; var b = aim(e); for (var i = -4; i <= 4; i++) fire(e, b + i * 0.19, 160, 0.9); AU.sfx('plasma'); } if (a.s === 1 && a.t > 1.1) { a.s = 2; b = aim(e); for (i = -3; i <= 4; i++) fire(e, b + (i - 0.5) * 0.19, 140, 0.9); AU.sfx('plasma'); } return a.t > 1.6; },
    ring: function (e, dt) { var a = e.act; a.t += dt; a.still = true; if (a.s === 0 && a.t > 0.6) { a.s = 1; ringShot(e, 18, 0, 125); } if (a.s === 1 && a.t > 1.2) { a.s = 2; ringShot(e, 18, 0.17, 105); } return a.t > 1.8; },
    spiral: function (e, dt) { var a = e.act; a.t += dt; a.still = true; if (a.t > 0.3 && a.t < 2.6) { a.acc = (a.acc || 0) + dt; while (a.acc > 0.08) { a.acc -= 0.08; a.ang = (a.ang || 0) + 0.46; fire(e, a.ang, 130, 0.8); fire(e, a.ang + 3.1416, 130, 0.8); } AU.sfx('plasma'); } return a.t > 2.9; },
    summon: function (e, dt) { var a = e.act; a.t += dt; a.still = true; if (a.s === 0 && a.t > 0.6) { a.s = 1; var ty = ['skeleton', 'ghost', 'hound', 'lich', 'banshee'][Math.min(4, Math.floor(Math.random() * (2 + G.stage / 3)))]; for (var i = 0; i < 8; i++) { var an = i / 8 * 6.283; G.spawnEnemy(ty, e.x + Math.cos(an) * 50, e.y + Math.sin(an) * 50, null); } AU.sfx('summon'); fx.v('ring', e.x, e.y, { r: 10, r2: 70, c: '#b54cff', w: 3, life: 0.4 }); } return a.t > 1.3; },
    slam: function (e, dt) { var a = e.act; a.t += dt; a.still = true; if (a.s === 0) { a.s = 1; G.warn(e.x, e.y, 125, 0.9, 20 * G.dmgScale(), { c: '#ff7a1a' }); AU.sfx('telegraph'); } if (a.s === 1 && a.t > 0.95) { a.s = 2; AU.sfx('slam'); fx.shake(0.6); ringShot(e, 14, 0, 140); } return a.t > 1.6; },
    charge: function (e, dt) {
      var a = e.act; a.t += dt; if (a.t < 0.45) a.ang = aim(e);
      if (a.s === 0) { a.s = 1; G.beam({ x: e.x, y: e.y, ang: aim(e), len: 330, w: 12, tele: 0.7, life: 0.01, dmg: 0, c: '#ff7a1a', own: e }); AU.sfx('telegraph'); a.still = true; }
      if (a.t >= 0.7 && a.t < 1.35) { e.x += Math.cos(a.ang) * 380 * dt; e.y += Math.sin(a.ang) * 380 * dt; a.dash = true; e.cd = Math.min(e.cd, 0); } else a.dash = false;
      if (a.s === 1 && a.t >= 0.7) { a.s = 2; AU.sfx('boom'); fx.shake(0.3); }
      return a.t > 1.7;
    },
    lasers: function (e, dt) { var a = e.act; a.t += dt; a.still = true; if (a.s === 0) { a.s = 1; var nb = e.def.n === 'DEUS EX NECROS' ? 4 : 3, b0 = aim(e); for (var i = 0; i < nb; i++) G.beam({ x: e.x, y: e.y, ang: b0 + i * 6.283 / nb, len: 520, w: 7, tele: 0.8, life: 2.2, dmg: 12 * G.dmgScale(), own: e, rot: 0.85, c: '#ff4a4a' }); AU.sfx('laser'); } return a.t > 3.2; },
    blink: function (e, dt) {
      var a = e.act; a.t += dt; a.still = true; if (a.t < 0.5) e.inv = 0.1; else if (a.s === 0) { a.s = 1; var an = Math.random() * 6.283; fx.v('flash', e.x, e.y, { r: 30, c: '#fff', life: 0.2 }); e.x = G.p.x + Math.cos(an) * 120; e.y = G.p.y + Math.sin(an) * 90; e.inv = 0; fx.v('flash', e.x, e.y, { r: 30, c: '#fff', life: 0.2 }); G.warn(e.x, e.y, 85, 0.6, 20 * G.dmgScale(), { c: '#ff3c5a' }); AU.sfx('telegraph'); }
      if (a.s === 1 && a.t > 1.15) { a.s = 2; ringShot(e, 10, 0, 135); } return a.t > 1.4;
    },
    sweep: function (e, dt) { var a = e.act; a.t += dt; a.still = true; if (a.s === 0) { a.s = 1; G.warn(e.x, e.y, 90, 0.6, 20 * G.dmgScale(), { c: '#ff3c5a' }); AU.sfx('telegraph'); } if (a.s === 1 && a.t > 0.65) { a.s = 2; ringShot(e, 8, 0.3, 140); fx.shake(0.3); } return a.t > 1.2; },
    rain: function (e, dt) { var a = e.act; a.t += dt; if (a.t > 0.3 + a.s * 0.2 && a.s < 8) { a.s++; var p = G.p; G.warn(p.x + U.rr(-130, 130), p.y + U.rr(-100, 100), 40, 0.9, 16 * G.dmgScale(), { beam: true, c: e.def.c || G.def.pal[2] }); AU.sfx('telegraph'); } return a.t > 2.6; }
  };
  function bossAI(e, dt, d, ux, uy) {
    var p = G.p, ratio = e.hp / e.mhp;
    if (e.def.phases) { var ph = ratio < 0.34 ? 2 : ratio < 0.67 ? 1 : 0; if (ph !== e.phase) { e.phase = ph; G.banner = { t: 2.4, text: 'PHASE ' + (ph + 1), sub: e.name, c: '#ff4a4a' }; fx.shake(0.7); AU.sfx('boss'); e.act = null; e.gap = 1; } }
    var pats = e.def.phases ? e.pats.slice(0, 4 + e.phase * 3) : e.pats;
    var moving = true;
    if (e.act) { var a = e.act; if (a.still) moving = false; if (a.dash) moving = false; if (PAT[a.name](e, dt)) { e.act = null; e.gap = Math.max(0.5, (e.mid ? 1.5 : 1.3) - 0.25 * e.phase - (ratio < 0.5 ? 0.25 : 0)); } }
    else { e.gap -= dt; if (e.gap <= 0) { var nm = pats[e.pi++ % pats.length]; e.act = { name: nm, t: 0, s: 0 }; } }
    if (moving && e.stun <= 0) { var tgt = 180; if (d > tgt + 30) { e.x += ux * e.spd * dt; e.y += uy * e.spd * dt; } else if (d < tgt - 60) { e.x -= ux * e.spd * 0.6 * dt; e.y -= uy * e.spd * 0.6 * dt; } else { e.x += -uy * e.spd * 0.5 * dt; e.y += ux * e.spd * 0.5 * dt; } }
    if (e.act && e.act.dash && d < e.r + p.r + 4 && e.cd <= 0) { e.cd = 0.5; G.hurtPlayer(e.dmg * 1.5, e.x, e.y, 'charge'); }
  }
})();
