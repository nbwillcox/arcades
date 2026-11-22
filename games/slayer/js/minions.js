/* minion AI: vanguard / sniper / aegis / detonator / fused giants. Separation steering keeps them from stacking. */
(function () {
  var U = CS.U, fx = CS.fx, AU = CS.audio, SV = CS.save, G = CS.G, WP = CS.WP, MN = CS.MN = {};

  MN.clear = function () { };
  MN.spawn = function (kind, x, y, it) {
    var m = G.mn.spawn(); if (!m) return null; var k = it ? it.pw : 1, lv = it ? it.lv : 1, hp;
    m.kind = kind; m.item = it ? it.id : ''; m.x = x; m.y = y; m.vx = m.vy = 0; m.dead = false; m.flash = 0; m.t = Math.random() * 6; m.hurt = 0; m.cd = 0.5; m.giant = kind === 'giant'; m.life = 0; m.aux = 0; m.sz = 1; m.tgt = null; m.face = 1;
    if (kind === 'vanguard') { hp = 45 * (1 + 0.3 * (k - 1)); m.r = 6; if (lv >= 10) { hp *= 2.2; m.r = 9; m.sz = 1.5; } }
    else if (kind === 'sniper') { hp = 28 * (1 + 0.3 * (k - 1)); m.r = 5; }
    else if (kind === 'aegis') { hp = 40 * (1 + 0.3 * (k - 1)); m.r = 6; }
    else if (kind === 'detonator') { hp = 14; m.r = 5; }
    else { hp = 200 + 70 * k; m.r = 12; m.sz = 1; }
    m.mhp = m.hp = Math.round(hp); m.spr = 'mn_' + (kind === 'giant' ? 'fusion' : kind) + '_' + G.cls; return m;
  };
  var KINDS = ['vanguard', 'sniper', 'aegis', 'detonator'];
  var counts = { vanguard: 0, sniper: 0, aegis: 0, detonator: 0, giant: 0 };
  function countAll() { var i, m; for (var k in counts) counts[k] = 0; for (i = 0; i < G.mn.n; i++) { m = G.mn.a[i]; if (m.life > 0) continue; counts[m.kind]++; } }
  MN.fillAll = function () {
    var p = G.p; countAll();
    KINDS.forEach(function (id) { var it = p.items[id]; if (!it) return; var tg = WP.minionTarget(id); while (counts[id] < tg && G.mn.n < WP.minionCap()) { var a = Math.random() * 6.283; if (MN.spawn(id, p.x + Math.cos(a) * 30, p.y + Math.sin(a) * 30, it)) counts[id]++; else break; } });
  };
  MN.healAll = function () { for (var i = 0; i < G.mn.n; i++) G.mn.a[i].hp = G.mn.a[i].mhp; };
  MN.fuse = function (it) {
    var p = G.p, cand = [], i, m, maxG = 1 + Math.floor(it.lv / 3) + (it.bon.proj || 0); countAll(); if (counts.giant >= maxG || G.mn.n >= 60) return false;
    for (i = 0; i < G.mn.n; i++) { m = G.mn.a[i]; if (!m.giant && !m.dead && m.life <= 0) cand.push(m); }
    cand.sort(function (a, b) { return Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y); }); cand = cand.slice(0, 3);
    var cx = p.x + p.face * 26, cy = p.y - 6, hp = 0;
    cand.forEach(function (c) { hp += c.hp; fx.v('line', c.x, c.y, { x2: cx, y2: cy, c: '#ff4fd8', w: 3, life: 0.35 }); fx.burst(c.x, c.y, 8, '#ff4fd8', 90, 0.4, 2); c.dead = true; c.hp = 0; });
    var g = MN.spawn('giant', cx, cy, it); if (!g) return false; g.mhp = g.hp = Math.round(g.mhp + hp * 0.6); if (it.lv >= 10) { g.mhp = g.hp = Math.round(g.mhp * 1.8); g.sz = 1.6; g.r = 16; }
    g.cd = 0.4; fx.v('ring', cx, cy, { r: 8, r2: 90, c: '#ff4fd8', w: 4, life: 0.45 }); fx.v('flash', cx, cy, { r: 34, c: '#ffffff', life: 0.22 }); fx.v('fireball', cx, cy, { r: 90, c: '#ff4fd8', life: 0.45, rot: 0 });
    AU.sfx('summon'); AU.sfx('levelup', 0.6); fx.num(cx, cy - 30, 'FUSION!', '#ff4fd8', 2); fx.num(cx, cy - 16, CS.CLASSES[G.cls].mn.fusion, '#ffffff', 1); fx.shake(0.3);
    return true;
  };

  function sep(m, i, strength) {
    var a = G.mn.a, n = G.mn.n, j, o, dx, dy, d, min;
    for (j = 0; j < n; j++) { if (j === i) continue; o = a[j]; dx = m.x - o.x; dy = m.y - o.y; min = (m.r + o.r) * 1.5; d = dx * dx + dy * dy; if (d < min * min && d > 0.01) { d = Math.sqrt(d); m.vx += dx / d * strength; m.vy += dy / d * strength; } }
  }
  function steer(m, tx, ty, spd, dt, k) { var dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy) || 1, f = Math.min(1, dt * (k || 7)); var want = d > 4 ? spd : 0; m.vx += (dx / d * want - m.vx) * f; m.vy += (dy / d * want - m.vy) * f; }

  MN.update = function (dt) {
    var p = G.p, a = G.mn, i, m, t, k, it, atkMul = p.mAtk, ci = { vanguard: 0, sniper: 0, aegis: 0, detonator: 0, giant: 0 }, nr = G.cls === 'engineer' ? SV.classRank('engineer', 'nanites') : 0;
    countAll();
    // maintain counts: respawn missing units on a timer
    var cap = WP.minionCap();
    for (k = 0; k < 4; k++) { var id = KINDS[k], itm = p.items[id]; if (!itm) continue; var tg = WP.minionTarget(id); itm.spT -= dt; if (counts[id] < tg && a.n < cap && itm.spT <= 0) { var an = Math.random() * 6.283; if (MN.spawn(id, p.x + Math.cos(an) * 24, p.y + Math.sin(an) * 24, itm)) { counts[id]++; fx.v('ring', p.x, p.y, { r: 4, r2: 20, c: '#ffffff', w: 1, life: 0.2 }); AU.sfx('spawn'); } itm.spT = id === 'detonator' ? 1.4 : 2.6; } }
    var tot = { vanguard: counts.vanguard, sniper: counts.sniper, aegis: counts.aegis, detonator: counts.detonator, giant: counts.giant };
    for (i = a.n - 1; i >= 0; i--) {
      m = a.a[i]; it = p.items[m.item] || p.items.fusion || { pw: 1, lv: 1, bon: {} };
      if (m.hp <= 0 || m.dead) { if (!m.dead || m.hp <= 0) { fx.burst(m.x, m.y, 10, '#ff9a3c', 100, 0.4, 2); } a.kill(i); continue; }
      var idx = ci[m.kind]++, n = tot[m.kind] || 1, k2 = it.pw, lv = it.lv; m.t += dt; m.cd -= dt; if (m.life > 0) { m.life -= dt; if (m.life <= 0) { MN.boom(m, it); m.dead = true; m.hp = 0; continue; } } if (m.flash > 0) m.flash--;
      if (nr > 0 && m.hp < m.mhp) m.hp = Math.min(m.mhp, m.hp + m.mhp * 0.012 * nr * dt);
      // contact damage taken from enemies
      m.hurt -= dt; if (m.hurt <= 0 && m.kind !== 'detonator') { var ne = G.nearest(m.x, m.y, m.r + 3); if (ne) { m.hp -= Math.max(1, ne.dmg * 0.5 * (m.giant ? 0.5 : 1)); m.hurt = 0.5; m.flash = 2; } }
      var dmgBase = 10 * (1 + 0.3 * (k2 - 1)) * atkMul;
      if (m.kind === 'vanguard') {
        t = G.nearest(m.x, m.y, 230); if (t && Math.hypot(t.x - p.x, t.y - p.y) > 330) t = null;
        if (t) { steer(m, t.x, t.y, 120 + 6 * k2, dt); var dx = t.x - m.x, dy = t.y - m.y, d = Math.hypot(dx, dy); if (d < m.r + t.r + 5 && m.cd <= 0) { m.cd = 0.55 / (1 + (it.bon.aspd || 0)) / atkMul; var ang = Math.atan2(dy, dx); G.hit(t, dmgBase, { src: 'vanguard', kb: lv >= 5 ? 360 : 150, dx: Math.cos(ang), dy: Math.sin(ang), type: 'phys' }); if (lv >= 10) G.explode(t.x, t.y, 40, dmgBase * 0.7, { src: 'vanguard', quiet: true, kb: 200 }); fx.burst(t.x, t.y, 3, '#ffb347', 90, 0.2, 2); AU.sfx('hit'); } }
        else { var fa = idx / n * 6.283 + G.t * 0.25; steer(m, p.x + Math.cos(fa) * 48, p.y + Math.sin(fa) * 38, 140, dt); }
      } else if (m.kind === 'sniper') {
        var sa = idx / n * 6.283 + G.t * 0.5; steer(m, p.x + Math.cos(sa) * 58, p.y + Math.sin(sa) * 46, 150, dt);
        if (m.cd <= 0) { t = G.nearest(m.x, m.y, 280); if (t) { m.cd = 1.4 * Math.pow(0.93, k2 - 1) / (1 + (it.bon.aspd || 0)) / atkMul; var a2 = Math.atan2(t.y - m.y, t.x - m.x), sh = (lv >= 5 ? 2 : 1), q; for (q = 0; q < sh; q++) G.shot(m.x - Math.sin(a2) * (q * 4 - (sh - 1) * 2), m.y + Math.cos(a2) * (q * 4 - (sh - 1) * 2), a2, 520, 14 * (1 + 0.3 * (k2 - 1)) * atkMul, { src: 'sniper', pierce: lv >= 10 ? 3 : 0, crit: lv >= 10 ? 0.25 : 0, spr: 'shot_plasma', kb: 120, life: 0.7, type: lv >= 10 ? 'energy' : 'phys', chain: G.cls === 'engineer' ? Math.ceil(SV.classRank('engineer', 'capacitor') / 3) : 0 }); AU.sfx('plasma'); } else m.cd = 0.15; }
      } else if (m.kind === 'aegis') {
        var R = lv >= 10 ? 56 : 42, oa = idx / n * 6.283 + G.t * (2 + 0.08 * k2); m.x += (p.x + Math.cos(oa) * R - m.x) * Math.min(1, dt * 12); m.y += (p.y + Math.sin(oa) * R * 0.8 - m.y) * Math.min(1, dt * 12); m.vx = m.vy = 0;
        m.aux -= dt; if (m.aux <= 0) { m.aux = lv >= 10 ? 4 : 8; if (p.hp < p.maxHp) { G.heal(3 + k2 * 1.2); fx.v('ring', m.x, m.y, { r: 4, r2: 26, c: '#5cff8a', w: 2, life: 0.3 }); } }
        if (m.cd <= 0) { var ne2 = G.nearest(m.x, m.y, m.r + 8); if (ne2) { m.cd = 0.5; var ag = Math.atan2(ne2.y - m.y, ne2.x - m.x); G.hit(ne2, 4 * (1 + 0.3 * (k2 - 1)) * (lv >= 10 ? 2.5 : 1), { src: 'aegis', type: 'holy', kb: 120, dx: Math.cos(ag), dy: Math.sin(ag), noCrit: true, quiet: true }); if (lv >= 10) ne2.burn = 2, ne2.burnD = 6 * k2; } }
      } else if (m.kind === 'detonator') {
        t = G.nearest(p.x, p.y, 300);
        if (t) { steer(m, t.x, t.y, 215, dt, 10); if (Math.hypot(t.x - m.x, t.y - m.y) < m.r + t.r + 2) { MN.boom(m, it); m.dead = true; m.hp = 0; } }
        else { var da = idx / n * 6.283 + G.t * 1.5; steer(m, p.x + Math.cos(da) * 28, p.y + Math.sin(da) * 28, 170, dt); }
      } else if (m.kind === 'giant') {
        var gl = it.lv >= 10; t = G.nearest(m.x, m.y, 260);
        if (t) { var dd = Math.hypot(t.x - m.x, t.y - m.y); if (dd > 100) steer(m, t.x, t.y, 85, dt); else { m.vx *= 0.9; m.vy *= 0.9; } }
        else { var ga = idx / n * 6.283 + G.t * 0.2; steer(m, p.x + Math.cos(ga) * 70, p.y + Math.sin(ga) * 55, 110, dt); }
        var fit = p.items.fusion || it;
        if (m.cd <= 0 && t) { m.cd = 1.5 / atkMul; var ag2 = Math.atan2(t.y - m.y, t.x - m.x); AU.sfx('slug'); G.shot(m.x, m.y, ag2, 330, 40 * (1 + 0.3 * (fit.pw - 1)) * 1.4 * atkMul, { src: 'fusion', spr: 'shot_orb', boom: gl ? 62 : 44, kb: 200, r: 6, life: 1.2, type: 'explosive' }); }
        m.aux -= dt; if (m.aux <= 0) { var ns = G.nearest(m.x, m.y, 44); if (ns) { m.aux = 1.3 / atkMul; G.explode(m.x, m.y, gl ? 78 : 52, 28 * (1 + 0.3 * (fit.pw - 1)) * (gl ? 2.4 : 1), { src: 'fusion', kb: 260, col: '#ff4fd8' }); } else m.aux = 0.2; }
      }
      sep(m, i, 240 * dt);
      m.x += m.vx * dt; m.y += m.vy * dt; if (Math.abs(m.vx) > 8) m.face = m.vx > 0 ? 1 : -1;
      var far = Math.hypot(m.x - p.x, m.y - p.y); if (far > 520) { var ta = Math.atan2(m.y - p.y, m.x - p.x); m.x = p.x + Math.cos(ta) * 60; m.y = p.y + Math.sin(ta) * 60; }
    }
  };
  MN.boom = function (m, it) {
    var k = it.pw, lv = it.lv, R = (40 + 3 * k) * (lv >= 10 ? 2.2 : 1), dmg = 38 * (1 + 0.3 * (k - 1)) * G.p.mAtk;
    var sr = m.item === 'fabricator' ? 'fabricator' : 'detonator'; G.explode(m.x, m.y, R, dmg, { src: sr, col: '#ff5050', kb: 260 });
    if (lv >= 5) for (var i = 0; i < 3; i++) { var a = Math.random() * 6.283, d = R * 0.9; G.explode(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d, 26, dmg * 0.4, { src: sr, col: '#ffb347', quiet: i > 0 }); }
    if (lv >= 10) fx.shake(0.4);
  };

  MN.draw = function (ctx, cx, cy, mode) {
    var A = CS.art, a = G.mn, i, m, X, Y, sp, hh, ww, py = G.p.y;
    for (i = 0; i < a.n; i++) {
      m = a.a[i]; if (mode === 'back' ? m.y >= py : m.y < py) continue; X = m.x - cx; Y = m.y - cy; if (X < -80 || X > CS.W + 80 || Y < -80 || Y > CS.H + 80) continue;
      sp = A.spr[m.spr]; hh = sp ? sp.dh * m.sz : m.r * 2; ww = sp ? sp.dw * m.sz : m.r * 2;
      ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(Math.round(X), Math.round(Y + hh / 2 - 3), ww * 0.32, 3, 0, 0, 6.283); ctx.fill();
      if (m.kind === 'aegis') { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45; ctx.drawImage(A.glow('#ffe44d'), Math.round(X - ww * 0.7), Math.round(Y - ww * 0.7), Math.round(ww * 1.4), Math.round(ww * 1.4)); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
      var hover = (m.kind === 'aegis' || m.kind === 'detonator' || /^mn_(sniper|detonator|aegis)_engineer/.test(m.spr)) ? Math.sin(m.t * 5) * 2 - 3 : -Math.abs(Math.sin(m.t * 8)) * 1.5;
      A.draw(ctx, m.spr, X, Y + hover, m.face < 0, m.flash > 0, m.sz);
      if (m.hp < m.mhp) { var w = Math.max(14, ww * 0.6); ctx.fillStyle = '#000'; ctx.fillRect(Math.round(X - w / 2), Math.round(Y - hh / 2 - 6), w, 2); ctx.fillStyle = '#5cff8a'; ctx.fillRect(Math.round(X - w / 2), Math.round(Y - hh / 2 - 6), Math.max(1, Math.round(w * m.hp / m.mhp)), 2); }
    }
  };
})();
