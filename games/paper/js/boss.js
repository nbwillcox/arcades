/* Weekly bosses (one per week, cycling): Rex-9000 robo-bulldog, Postmaster Gorp, Big Mower. They run / float beside the street at the rider's pace. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U;
  const B = {};
  B.NAMES = { rex: 'REX-9000', gorp: 'POSTMASTER GORP', mower: 'BIG MOWER' };
  B.TAUNT = { rex: 'Nobody delivers past me!', gorp: 'RETURN TO SENDER!', mower: 'TIME FOR A TRIM!' };
  const HP = { rex: 14, gorp: 16, mower: 20 };

  B.make = function (type, week) {
    const hp = HP[type] + (week - 1) * 3;
    return { type, hp, max: hp, side: 1, x: 130, z: 0, y: 0, state: 'enter', t: 0, deadT: 0, flash: 0, weak: false, shield: false, dir: 1, att: 0, cnt: 0, rx: 24, rz: 28, y0: 0, y1: 44, vx: 0, bob: 0, enter: 1 };
  };

  function pz(g) { return g.p.z; }
  function shadowHaz(g, b, kind, tx, tz, dur) { g.haz.push({ t: kind, x: b.x, z: b.z, sx: b.x, sz: b.z, tx, tz, tm: dur, dur, y: 30 }); }

  B.update = function (b, g, dt) {
    const P = g.p, hard = 1 + (g.week - 1) * 0.2;
    b.t += dt; b.bob += dt; b.flash = Math.max(0, b.flash - dt);
    if (b.hp <= 0) {
      b.deadT += dt;
      if (b.deadT < 2.2 && Math.random() < dt * 14) { g.burst(b.x + (Math.random() - 0.5) * 30, b.z + (Math.random() - 0.5) * 30, 10 + Math.random() * 30, 12, '#ffb43a', 100, 90); g.hit(6); if (G.audio && G.audio.sfx.boom) G.audio.sfx.boom(); }
      return;
    }
    /* stay beside the rider */
    const zOff = b.type === 'gorp' ? 36 : 22;
    b.z += (P.z + zOff + Math.sin(b.bob * 1.3) * 10 - b.z) * Math.min(1, dt * 3);
    if (b.state === 'enter') { b.x = b.side * (300 - 170 * U.easeOutCubic(Math.min(1, b.t / 1.6))); if (b.t > 1.8) { b.x = b.side * 130; b.state = 'idle'; b.t = 0; } return; }
    if (b.type === 'rex') rex(b, g, dt, hard); else if (b.type === 'gorp') gorp(b, g, dt, hard); else mower(b, g, dt, hard);
    /* touching the boss body hurts */
    if (P.crash <= 0 && P.y < b.y1 - 10 && Math.abs(P.x - b.x) < b.rx * 0.8 && Math.abs(P.z - b.z) < b.rz * 0.7 && b.type !== 'gorp') g.crash('SMOOSHED!');
  };

  function rex(b, g, dt, hard) {
    const P = g.p;
    b.weak = b.state === 'dizzy';
    if (b.state === 'idle') { b.state = 'trot'; b.t = 0; b.cnt = 0; }
    if (b.state === 'trot') {
      b.x += (b.side * 126 - b.x) * Math.min(1, dt * 4);
      b.att -= dt;
      if (b.att <= 0) { b.att = 1.5 / hard; b.cnt++; const tx = U.clamp(P.x + (Math.random() - 0.5) * 30, -70, 70); shadowHaz(g, b, 'bone', tx, P.z + P.speed * 1.1 + 10, 1.1); if (G.audio) G.audio.sfx.bark && G.audio.sfx.bark(b.cnt * 30); }
      if (b.t > 4.2 / hard) { b.state = 'warn'; b.t = 0; if (G.audio) G.audio.sfx.alarm && G.audio.sfx.alarm(); }
    } else if (b.state === 'warn') {
      b.x += (b.side * 140 - b.x) * Math.min(1, dt * 5);
      if (b.t > 0.95) { b.state = 'charge'; b.t = 0; b.dir = -b.side; }
    } else if (b.state === 'charge') {
      b.x += b.dir * 340 * dt;
      if (Math.abs(b.x) >= 130 && Math.sign(b.x) === b.dir) { b.x = b.dir * 130; b.side = b.dir; b.state = 'dizzy'; b.t = 0; g.hit(8); g.burst(b.x, b.z, 6, 24, '#fff', 100, 40); }
    } else if (b.state === 'dizzy') { if (b.t > 2.6) { b.state = 'trot'; b.t = 0; } }
  }
  function gorp(b, g, dt, hard) {
    const P = g.p;
    b.y = 34 + Math.sin(b.bob * 2) * 4; b.y0 = 18; b.y1 = 62; b.rx = 26; b.rz = 24;
    b.x += (b.side * (86 + Math.sin(b.bob * 0.8) * 22) - b.x) * Math.min(1, dt * 3);
    if (b.state === 'idle') { b.state = 'drop'; b.t = 0; }
    if (b.state === 'drop') {
      b.shield = false; b.att -= dt;
      if (b.att <= 0) { b.att = 1.0 / hard; const tx = U.clamp(P.x + (Math.random() - 0.5) * 24, -80, 80); shadowHaz(g, b, 'parcel', tx, P.z + P.speed * 1.0 + 8 + Math.random() * 20, 1.0); }
      if (b.t > 5 / hard) { b.state = 'shield'; b.t = 0; }
    } else if (b.state === 'shield') {
      b.shield = true; if (b.t > 2.4) { b.shield = false; b.side = -b.side; b.state = 'drop'; b.t = 0; }
    }
  }
  function mower(b, g, dt, hard) {
    b.y1 = 90; b.rx = 28; b.rz = 34; b.weak = b.state === 'vent';
    b.x += (b.side * 132 - b.x) * Math.min(1, dt * 4);
    if (b.state === 'idle') { b.state = 'walk'; b.t = 0; }
    if (b.state === 'walk') {
      b.att -= dt;
      if (b.att <= 0) { b.att = 1.8 / hard; g.haz.push({ t: 'clip', x: b.x, z: b.z, tx: U.clamp(g.p.x, -70, 70), tm: 1.0, dur: 1.0 }); }
      if (b.t > 4 / hard) { b.state = 'warn'; b.t = 0; if (G.audio) G.audio.sfx.alarm && G.audio.sfx.alarm(); }
    } else if (b.state === 'warn') {
      if (b.t > 0.9) { b.state = 'sweep'; b.t = 0; g.haz.push({ t: 'blade', x: b.x, z: b.z, dir: -b.side, tm: 2.2, w: 9 }); }
    } else if (b.state === 'sweep') { if (b.t > 2.2) { b.state = 'vent'; b.t = 0; } }
    else if (b.state === 'vent') { if (b.t > 3) { b.state = 'walk'; b.t = 0; b.side = -b.side; } }
  }

  B.hazard = function (h, dt) {
    const g = G.game, P = g.p;
    if (h.t === 'bone' || h.t === 'parcel') {
      h.tm -= dt; const k = 1 - Math.max(0, h.tm) / h.dur;
      h.x = h.sx + (h.tx - h.sx) * k; h.z = h.sz + (h.tz - h.sz) * k; h.y = h.t === 'bone' ? 30 + Math.sin(k * Math.PI) * 50 : 150 * (1 - k);
      h.z += P.speed * 0; /* world-fixed target */
      if (h.tm <= 0) {
        g.hit(7); g.burst(h.tx, h.tz, 4, 16, h.t === 'bone' ? '#fff3c0' : '#d8b080', 90, 70); if (G.audio) G.audio.sfx.smash && G.audio.sfx.smash();
        if (P.crash <= 0 && P.y < 12 && Math.hypot(P.x - h.tx, P.z - h.tz) < 14) g.crash(h.t === 'bone' ? 'BONED!' : 'RETURNED!');
        h.gone = 1;
      }
    } else if (h.t === 'clip') {
      h.tm -= dt; const k = 1 - Math.max(0, h.tm) / h.dur; h.px = h.x + (h.tx - h.x) * k;
      if (h.tm <= 0) { g.burst(h.tx, h.z, 4, 10, '#7dff4a', 70, 60); if (P.crash <= 0 && P.y < 10 && Math.abs(P.x - h.tx) < 12 && Math.abs(P.z - h.z) < 16) g.crash('CLIPPED!'); h.gone = 1; }
    } else if (h.t === 'blade') {
      h.tm -= dt; h.x += h.dir * 120 * dt; h.z = G.game.boss ? G.game.boss.z : h.z;
      if (P.crash <= 0 && P.y < 14 && Math.abs(P.x - h.x) < 13 && Math.abs(P.z - h.z) < 12) g.crash('SLICED!');
      if (h.tm <= 0) h.gone = 1;
    } else h.gone = 1;
  };

  B.hit = function (b, p) {
    if (b.hp <= 0 || b.state === 'enter') return false;
    if (Math.abs(p.x - b.x) > b.rx || Math.abs(p.z - b.z) > b.rz || p.y < b.y0 - 4 || p.y > b.y1 + 4) return false;
    const g = G.game;
    if (b.shield) { b.flash = 0.2; if (G.audio) G.audio.sfx.clang && G.audio.sfx.clang(); g.pop(b.x, b.z, b.y + 50, 'BLOCKED', '#9dffea'); return true; }
    const dmg = b.weak ? 2 : 1;
    b.hp -= dmg; b.flash = 0.25; g.hit(6);
    g.paperScore(p, 200 * dmg, b.x, b.z, b.y1 + 14, b.weak ? 'CRITICAL' : 'HIT', b.weak ? '#ffe45a' : '#fff');
    g.burst(b.x, b.z, b.y1 * 0.6, 10, '#ffd24a', 80, 70); if (G.audio) G.audio.sfx.clang && G.audio.sfx.clang();
    if (b.hp <= 0) { b.hp = 0; b.deadT = 0.001; g.haz.length = 0; g.hit(14); g.fx.flash = 0.7; g.addScore(5000, b.x, b.z, 90, 'DEFEATED'); if (G.audio) G.audio.sfx.fanfare && G.audio.sfx.fanfare(); }
    return true;
  };
  G.boss = B;
})((window.SGS = window.SGS || {}));
