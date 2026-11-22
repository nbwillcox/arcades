/* combat world: pools, player, damage model, loot vacuum, zones, hazards, spawn director, rendering */
(function () {
  var U = CS.U, fx = CS.fx, A = CS.art, AU = CS.audio, SV = CS.save, In = CS.In;
  var G = CS.G = {}, W = CS.W, H = CS.H;

  function mkE() { return { x: 0, y: 0, vx: 0, vy: 0, kx: 0, ky: 0, type: '', hp: 1, mhp: 1, r: 8, spd: 0, dmg: 0, armor: 0, xp: 0, gold: 0, kbr: 0, flash: 0, dead: false, uid: 0, tag: '', spr: '', boss: false, mid: false, elite: false, st: 0, t1: 0, t2: 0, t3: 0, buff: 0, slow: 0, shred: 0, burn: 0, burnD: 0, stun: 0, face: 1, ang: 0, act: null, sawCd: 0, novaId: 0, name: '', def: null, pats: null, pi: 0, gap: 0, phase: 0, inv: 0, last: '', big: 1, dx: 0, dy: 0, cd: 0, tick: 0, burnT: 0 }; }
  function mkShot() { return { x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 0, life: 0, pierce: 0, kb: 0, src: '', spr: '', bounce: 0, home: 0, hit: [], rot: 0, saw: false, split: 0, spin: 0, grav: 0, tx: 0, ty: 0, boom: 0, col: '#fff', crit: 0, big: 1, ang: 0, fuse: 0, bomb: 0 }; }
  function mkB() { return { x: 0, y: 0, vx: 0, vy: 0, r: 4, dmg: 0, life: 0, spr: 'shot_orb', col: '#ff2a9a', ref: false, boss: false }; }
  function mkL() { return { type: '', x: 0, y: 0, vx: 0, vy: 0, v: 0, pull: false, t: 0, sp: 0 }; }
  function mkZ() { return { kind: '', x: 0, y: 0, r: 0, life: 0, max: 1, t: 0, tt: 0, dps: 0, dmg: 0, spd: 0, id: 0, follow: false, burn: 0, c: '#fff', src: '', seed: false, max2: 0, n: 0 }; }
  function mkWn() { return { x: 0, y: 0, r: 0, t: 0, delay: 1, dmg: 0, fr: false, c: '#f55', src: '', beam: false, ring: false, done: false }; }
  function mkBm() { return { x: 0, y: 0, ang: 0, len: 600, w: 6, tele: 0.8, life: 1, t: 0, dmg: 10, own: null, rot: 0, tick: 0, sym: false, c: '#f55' }; }
  function mkM() { return { kind: '', item: '', x: 0, y: 0, vx: 0, vy: 0, hp: 1, mhp: 1, r: 6, cd: 0, slot: 0, ang: 0, dead: false, flash: 0, t: 0, hurt: 0, giant: false, spr: '', tgt: null, face: 1, aux: 0, sz: 1 }; }

  G.init = function () {
    G.en = new U.Pool(CS.BAL.maxEnemies + 24, mkE); G.grid = new U.Grid(G.en);
    G.sh = new U.Pool(220, mkShot); G.eb = new U.Pool(360, mkB); G.loot = new U.Pool(320, mkL); G.zn = new U.Pool(140, mkZ);
    G.wn = new U.Pool(80, mkWn); G.bm = new U.Pool(40, mkBm); G.mn = new U.Pool(64, mkM);
    G.tmp = new Array(256); G.cam = { x: 0, y: 0 };
  };

  /* ---------------- run setup ---------------- */
  G.start = function (stage, cls, opt) {
    opt = opt || {}; var C = CS.CLASSES[cls];
    if (!G.en) G.init();
    G.stage = stage; G.cls = cls; G.def = CS.STAGES[stage]; G.C = C; G.blitz = !!opt.blitz; G.dur = opt.time || CS.BAL.stageSec(stage, G.blitz);
    G.t = 0; G.frame = 0; G.over = false; G.won = false; G.uid = 1; G.novaId = 1; G.pendingLv = 0; G.chest = null; G.bossT = 0; G.midN = 0; G.bossOn = null; G.swarmT = 40; G.spawnAcc = 0; G.god = !!opt.god; G.sirenT = 0; G.banner = null; G.stageBoss = false;
    [G.en, G.sh, G.eb, G.loot, G.zn, G.wn, G.bm, G.mn].forEach(function (p) { p.clear(); });
    fx.reset(); G.hz = { storm: 1.5, laser: 5, ring: 7 }; G.stats = { kills: 0, gold: 0, dmg: {}, taken: 0, bosses: 0, crits: 0, healed: 0 };
    G.hitstopT = 0; G.critStop = 0;
    G.p = { x: 0, y: 0, vx: 0, vy: 0, r: 7, face: 1, hp: 1, maxHp: 1, armor: 0, spd: 0, crit: 0, critMul: 1.5, pick: 0, xp: 0, lv: 1, need: CS.BAL.xpNeed(1), gold: 0, scrap: 0, shield: 0, shieldMax: 0, shieldT: 0, inv: 0, dead: false,
      items: {}, order: [], dodge: 0, regen: 0, dmgMul: 1, cdMul: 1, xpMul: 1, goldMul: 1, magnetT: 0, staticT: 0, flash: 0, bob: 0, extra: {}, revived: false, aegisT: 0, aegisCd: 0, burstCd: 0, dashCd: 0, trailT: 0, holeCd: 0, slide: false, dashT: 0, mdCd: 0, mdMax: 1.7, ddx: 0, ddy: 0, ovl: 1, mAtk: 1, pickMul: 1, rerolls: 2, kills: 0, tookHit: 0, healT: 0, pulseT: 0, hurtT: 0, lsAcc: 0 };
    CS.WP.setupRun(C);
    G.p.hp = G.p.maxHp; G.p.shield = G.p.shieldMax;
    G.cam.x = -W / 2; G.cam.y = -H / 2;
    for (var i = 0; i < 12; i++) G.spawnRing('skeleton', 1);
  };

  /* ---------------- nearest / queries ---------------- */
  G.nearest = function (x, y, r, skip) { return G.grid.nearest(x, y, r, skip); };
  G.near = function (x, y, r, max) { return G.grid.near(x, y, r, G.tmp, max || 255); };
  G.nearList = function (x, y, r) { var n = G.grid.near(x, y, r, G.tmp, 255), o = new Array(n), i; for (i = 0; i < n; i++) o[i] = G.tmp[i]; return o; };
  /* player power S: sum of item power (offense full, defense half). Start of a run is ~2. */
  G.power = function () { var p = G.p, s = 0, id; for (id in p.items) s += p.items[id].pw * (CS.ITEMS[id].cat === 'defense' ? 0.5 : 1); return s; };
  G.hpMul = function () { var m = G.t / 60; return (1 + 0.14 * m + 0.012 * m * m) * (1 + 0.1 * G.stage) * (1 + 0.02 * Math.max(0, G.power() - 2)); };
  G.dmgScale = function () { return (1 + 0.075 * G.t / 60) * (1 + 0.07 * G.stage) * 1.5; };

  /* ---------------- enemies ---------------- */
  G.spawnEnemy = function (type, x, y, o) {
    var D = CS.ENEMIES[type], e = G.en.spawn(); if (!e) return null; o = o || {};
    var hm = G.hpMul() * (o.hpMul || 1);
    e.type = type; e.x = x; e.y = y; e.vx = e.vy = e.kx = e.ky = 0; e.mhp = e.hp = Math.ceil(D.hp * hm * (o.elite ? 4 : 1)); e.r = D.r * (o.elite ? 1.25 : 1); e.spd = D.spd * (o.elite ? 1.1 : 1) * (0.92 + Math.random() * 0.16); e.dmg = D.dmg * G.dmgScale() * (o.elite ? 1.3 : 1);
    e.armor = D.armor * (1 + 0.12 * G.stage); e.xp = D.xp * (o.elite ? 4 : 1) * (1 + 0.06 * G.stage); e.gold = D.gold * (o.elite ? 5 : 1); e.kbr = D.kbr; e.tag = D.tag; e.spr = type; e.flash = 0; e.dead = false; e.uid = G.uid++; e.boss = false; e.mid = false; e.elite = !!o.elite;
    e.st = 0; e.t1 = Math.random() * 2; e.t2 = 0; e.t3 = 0; e.buff = e.slow = e.shred = e.burn = e.stun = 0; e.act = null; e.sawCd = 0; e.novaId = 0; e.def = null; e.pats = null; e.big = 1; e.inv = 0; e.last = ''; e.cd = 0; e.tick = 0; e.scrap = D.scrap || 0;
    return e;
  };
  G.spawnRing = function (type, n, dist, o) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, d = (dist || 560) + Math.random() * 60; G.spawnEnemy(type, G.p.x + Math.cos(a) * d, G.p.y + Math.sin(a) * d * 0.7, o); }
  };

  /* ---------------- damage model ---------------- */
  var TCOL = { phys: '#ffffff', energy: '#7df3ff', holy: '#ffe44d', fire: '#ff9a3c', poison: '#7dff5a', tesla: '#c9a3ff', explosive: '#ffb347' };
  G.hit = function (e, dmg, o) {
    if (e.dead || e.inv > 0) return 0; o = o || {}; var p = G.p, it = o.src ? p.items[o.src] : null, crit = false, cc = p.crit + (o.critAdd || 0) + (it && it.bon.crit ? it.bon.crit : 0);
    if (!o.noCrit && Math.random() < cc) { crit = true; dmg *= p.critMul * (o.critMul || 1); G.stats.crits++; }
    dmg *= p.dmgMul * (o.mul || 1);
    if (o.purge) dmg *= e.tag === 'demon' ? 1.5 : e.tag === 'undead' ? 1.25 : 1;
    var ar = e.shred > 0 ? 0 : e.armor; dmg = Math.max(dmg * 0.2, dmg - ar);
    if (e.boss && e.act && e.act.name === 'blink' && e.act.t < 0.4) dmg *= 0.3;
    e.hp -= dmg; e.flash = 3; e.last = o.src || '';
    var st = G.stats.dmg; if (o.src) st[o.src] = (st[o.src] || 0) + dmg;
    if (o.kb) { var f = o.kb * (1 - e.kbr) * (crit && p.items.slug === undefined ? 1 : 1) * (1 + (o.src === 'slug' && crit ? (G.C.id === 'gunner' ? SV.classRank('gunner', 'hollow') * 0.08 : 0) : 0)); e.kx += (o.dx || 0) * f; e.ky += (o.dy || 0) * f; }
    var tcol = TCOL[o.type || 'phys'];
    fx.num(e.x, e.y - e.r, Math.max(1, Math.round(dmg)), crit ? (it ? CS.RAR[it.rar].t : '#ffe44d') : tcol, crit ? 2 : 1);
    if (!o.quiet) { if (crit || Math.random() < 0.35) CS.V.impact(e.x, e.y, tcol, crit); AU.sfx(crit ? 'crit' : 'hit'); if (Math.random() < 0.4) fx.spark(e.x, e.y, (Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120, 0.25, crit ? '#ffe44d' : '#fff', 2); }
    if (crit) { if (G.critStop <= 0) { fx.stop(20); G.critStop = 0.12; } fx.shake(0.12, o.dx || 0, o.dy || 0); if (p.items.graviton && p.items.graviton.lv >= 5 && !o.noChain) G.explode(e.x, e.y, 42, dmg * 0.5, { src: 'graviton', noCrit: true, noChain: true, quiet: true, type: 'explosive' }); }
    if (it) {
      if (it.bon.ls) { p.lsAcc += dmg * it.bon.ls; if (p.lsAcc >= 1) { G.heal(Math.floor(p.lsAcc)); p.lsAcc %= 1; } }
      if (it.bon.chain && !o.noChain) G.chain(e, dmg * 0.4, it.bon.chain, 90, { src: o.src, noCrit: true, noChain: true, quiet: true, type: 'tesla' });
    }
    if (e.hp <= 0) G.kill(e, o.src || '');
    return dmg;
  };

  G.explode = function (x, y, r, dmg, o) {
    o = o || {}; var n = G.near(x, y, r), i, e, a, d, list = [];
    for (i = 0; i < n; i++) list.push(G.tmp[i]);
    for (i = 0; i < list.length; i++) {
      e = list[i]; a = Math.atan2(e.y - y, e.x - x);
      var o2 = { src: o.src, noCrit: o.noCrit, noChain: o.noChain, quiet: true, type: o.type || 'explosive', kb: o.kb === undefined ? 190 : o.kb, dx: Math.cos(a), dy: Math.sin(a), mul: o.mul, purge: o.purge };
      G.hit(e, dmg, o2); if (o.burn && !e.dead) { e.burn = 3; e.burnD = o.burn; } if (o.stun && !e.dead) e.stun = o.stun;
    }
    if (!o.quiet) { CS.V.explosion(x, y, r, o.col || '#ffb347'); fx.shake(Math.min(0.5, r / 260)); AU.sfx(r > 70 ? 'boom' : 'smallboom'); }
    return list.length;
  };

  G.chain = function (e0, dmg, jumps, range, o) {
    var cur = e0, seen = [e0.uid], k, nx, cand, best, bd, i, n, lines = [];
    for (k = 0; k < jumps; k++) {
      n = G.near(cur.x, cur.y, range); best = null; bd = 1e9;
      for (i = 0; i < n; i++) { cand = G.tmp[i]; if (seen.indexOf(cand.uid) >= 0) continue; var d = (cand.x - cur.x) * (cand.x - cur.x) + (cand.y - cur.y) * (cand.y - cur.y); if (d < bd) { bd = d; best = cand; } }
      if (!best) break; seen.push(best.uid);
      fx.v('line', cur.x, cur.y, { x2: best.x, y2: best.y, c: o.col || '#7df3ff', w: 2, life: 0.14 });
      var a = Math.atan2(best.y - cur.y, best.x - cur.x);
      G.hit(best, dmg * Math.pow(0.9, k), { src: o.src, type: o.type || 'tesla', noCrit: o.noCrit, noChain: o.noChain, quiet: o.quiet, kb: o.kb || 40, dx: Math.cos(a), dy: Math.sin(a), purge: o.purge });
      if (o.stun) best.stun = o.stun;
      cur = best;
    }
    return seen.length - 1;
  };

  function segDist(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = l2 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0; t = t < 0 ? 0 : t > 1 ? 1 : t;
    var cx = x1 + dx * t - px, cy = y1 + dy * t - py; return Math.sqrt(cx * cx + cy * cy);
  }
  G.segDist = segDist;
  G.seg = function (x1, y1, x2, y2, w, dmg, o) { // pierce everything along a segment
    o = o || {}; var a = G.en.a, i, e, hits = 0, ang = Math.atan2(y2 - y1, x2 - x1), list = [];
    for (i = 0; i < G.en.n; i++) { e = a[i]; if (e.dead) continue; if (segDist(e.x, e.y, x1, y1, x2, y2) <= w + e.r) list.push(e); }
    for (i = 0; i < list.length; i++) { G.hit(list[i], dmg, { src: o.src, type: o.type || 'energy', kb: o.kb || 0, dx: Math.cos(ang), dy: Math.sin(ang), noCrit: o.noCrit, quiet: o.quiet, purge: o.purge, noChain: o.noChain }); hits++; }
    return hits;
  };

  G.shot = function (x, y, ang, spd, dmg, o) {
    var s = G.sh.spawn(); if (!s) return null; o = o || {};
    s.x = x; s.y = y; s.vx = Math.cos(ang) * spd; s.vy = Math.sin(ang) * spd; s.ang = ang; s.dmg = dmg; s.r = o.r || 4; s.life = o.life || 1.4; s.pierce = o.pierce || 0; s.kb = o.kb || 0; s.src = o.src || ''; s.spr = o.spr || 'shot_slug';
    s.bounce = o.bounce || 0; s.home = o.home || 0; s.hit.length = 0; s.saw = !!o.saw; s.split = o.split || 0; s.rot = 0; s.spin = o.spin || 0; s.grav = 0; s.boom = o.boom || 0; s.big = o.big || 1; s.crit = o.crit || 0; s.type = o.type || 'phys'; s.chain = o.chain || 0; s.purge = o.purge || false; s.bomb = 0;
    return s;
  };
  G.ebullet = function (x, y, ang, spd, dmg, o) {
    var b = G.eb.spawn(); if (!b) return null; o = o || {};
    b.x = x; b.y = y; b.vx = Math.cos(ang) * spd; b.vy = Math.sin(ang) * spd; b.r = o.r || 4; b.dmg = dmg; b.life = o.life || 5; b.spr = o.spr || 'shot_orb'; b.col = o.col || '#ff2a9a'; b.ref = false; b.boss = !!o.boss;
    return b;
  };
  G.zone = function (kind, x, y, o) {
    var z = G.zn.spawn(); if (!z) return null; z.kind = kind; z.x = x; z.y = y; z.r = 30; z.life = z.max = 2; z.t = 0; z.tt = 0; z.dps = 0; z.dmg = 0; z.spd = 0; z.id = 0; z.follow = false; z.burn = 0; z.c = '#fff'; z.src = ''; z.seed = false; z.n = 0; z.max2 = 0;
    for (var k in o) z[k] = o[k]; z.max = z.life; return z;
  };
  G.warn = function (x, y, r, delay, dmg, o) {
    var w = G.wn.spawn(); if (!w) return null; o = o || {}; w.x = x; w.y = y; w.r = r; w.t = 0; w.delay = delay; w.dmg = dmg; w.fr = !!o.fr; w.c = o.c || '#ff4a4a'; w.src = o.src || ''; w.beam = !!o.beam; w.ring = !!o.ring; w.done = false; w.stun = o.stun || 0; w.burn = o.burn || 0; return w;
  };
  G.beam = function (o) {
    var b = G.bm.spawn(); if (!b) return null; b.x = o.x || 0; b.y = o.y || 0; b.ang = o.ang || 0; b.len = o.len || 600; b.w = o.w || 6; b.tele = o.tele === undefined ? 0.8 : o.tele; b.life = o.life || 1; b.t = 0; b.dmg = o.dmg || 10; b.own = o.own || null; b.rot = o.rot || 0; b.tick = 0; b.sym = !!o.sym; b.c = o.c || '#ff4a4a'; return b;
  };

  G.addGold = function (n) { G.p.gold += n; G.stats.gold += n; };
  G.addXp = function (n) {
    var p = G.p; p.xp += n * p.xpMul;
    while (p.xp >= p.need) { p.xp -= p.need; p.lv++; p.need = CS.BAL.xpNeed(p.lv); G.pendingLv++; }
  };
  G.heal = function (n, quiet) {
    var p = G.p; if (p.dead) return; var room = p.maxHp - p.hp, got = Math.min(room, n); p.hp += got; G.stats.healed += got;
    var over = n - got, mr = SV.classRank('priest', 'martyr');
    if (over > 0 && G.cls === 'priest' && mr > 0) { p.shieldMax = Math.max(p.shieldMax, 0); var cap = p.maxHp * (0.1 + 0.05 * mr); p.holy = Math.min(cap, (p.holy || 0) + over * (0.3 + 0.07 * mr)); }
    if (!quiet && got > 0) fx.num(p.x, p.y - 14, '+' + Math.round(got), '#5cff8a', 1);
  };

  /* ---------------- loot ---------------- */
  G.drop = function (type, x, y, v) {
    var l = G.loot.spawn();
    if (!l) { if (type === 'coin') G.addGold(v); return; }
    l.type = type; l.x = x; l.y = y; var a = Math.random() * 6.283, s = 40 + Math.random() * 70; l.vx = Math.cos(a) * s; l.vy = Math.sin(a) * s; l.v = v; l.pull = false; l.t = 0; l.sp = 0;
  };
  G.kill = function (e, src) {
    if (e.dead) return; e.dead = true; var p = G.p; G.stats.kills++; p.kills++;
    G.addXp(e.xp); fx.xp(e.x, e.y); AU.sfx('kill'); if (p.items.stim) CS.WP.onKill();
    var gm = p.goldMul * (src === 'sniper' || src === 'drone' || src === 'detonator' || src === 'vanguard' || src === 'aegis' || src === 'fusion' ? 1 + 0.15 * SV.classRank('engineer', 'recycler') * (G.cls === 'engineer' ? 1 : 0) : 1);
    if (Math.random() < e.gold) { var v = Math.max(1, Math.round((e.elite ? 6 : e.type === 'golem' ? 8 : 2) * (1 + 0.15 * G.stage) * gm)); G.drop('coin', e.x, e.y, v); }
    if (e.scrap) G.drop('scrap', e.x, e.y, 3 + G.stage); else if (Math.random() < 0.05) G.drop('scrap', e.x, e.y, 1);
    if (Math.random() < 0.006 || (e.elite && Math.random() < 0.25)) G.drop('hp', e.x, e.y, 0);
    if (Math.random() < 0.0018 || (e.elite && Math.random() < 0.05)) G.drop('mag', e.x, e.y, 0);
    fx.burst(e.x, e.y, e.boss ? 40 : 6, e.boss ? '#ffe44d' : (e.tag === 'demon' ? '#ff9a3c' : '#cfd6e6'), e.boss ? 260 : 120, 0.5, 2);
    if (src === 'nanite' && p.items.nanite && p.items.nanite.lv >= 10 && G.zn.n < 40) G.zone('cloud', e.x, e.y, { r: 46, life: 3, dps: 6 * p.items.nanite.pw, src: 'nanite', follow: true, c: '#6bff3c' });
    if (e.boss) CS.E.onBossDeath(e);
  };

  /* ---------------- player damage ---------------- */
  G.hurtPlayer = function (dmg, sx, sy, kind) {
    var p = G.p; if (p.dead || p.inv > 0 || G.god) return; var it = p.items, k;
    if (p.dodge > 0 && Math.random() < p.dodge) { fx.num(p.x, p.y - 14, 'DODGE', '#d48bff', 1); AU.sfx('dodge'); p.inv = 0.25; if (it.thrusters && it.thrusters.lv >= 5) CS.WP.phaseDash(sx, sy); return; }
    if (p.holy > 0) { var ab = Math.min(p.holy, dmg); p.holy -= ab; dmg -= ab; p.shieldT = 3.5; if (dmg <= 0) { p.inv = 0.3; AU.sfx('shield'); return; } }
    if (p.shield > 0) {
      var ab2 = Math.min(p.shield, dmg); p.shield -= ab2; dmg -= ab2; p.shieldT = Math.max(1.5, 4.2 - (it.deflector ? it.deflector.pw * 0.18 : 0)) * (it.deflector && it.deflector.lv >= 10 ? 0.4 : 1);
      AU.sfx('shield'); fx.v('ring', p.x, p.y, { r: 10, r2: 24, c: '#48a8ff', w: 2, life: 0.2 }); CS.WP.deflectPush(false);
      if (p.shield <= 0) { AU.sfx('shieldbreak'); CS.WP.deflectPush(true); }
      if (dmg <= 0) { p.inv = 0.3; return; }
    }
    var flat = p.armor * 0.5, mit = p.armor / (p.armor + 80); dmg = Math.max(dmg * 0.15, (dmg - flat)) * (1 - mit); dmg = Math.max(1, Math.round(dmg));
    p.hp -= dmg; p.inv = 0.36; p.flash = 6; p.hurtT = 0.3; G.stats.taken += dmg; fx.num(p.x, p.y - 14, '-' + dmg, '#ff4a5a', 1); AU.sfx('hurt'); fx.shake(0.35, p.x - sx, p.y - sy); fx.flash = 0.12; fx.flashC = '#ff2040'; In.rumble(90, 0.6);
    if (it.plating && it.plating.lv >= 5) CS.WP.reactive();
    CS.WP.onHurt();
    if (p.hp <= 0) CS.WP.tryDeath();
  };

  /* ---------------- hazards ---------------- */
  var CELL = 360;
  function poolAt(x, y, kind) {
    var cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), i, j, r = null;
    for (i = -1; i <= 1; i++) for (j = -1; j <= 1; j++) {
      var gx = cx + i, gy = cy + j, h = U.hash(gx, gy + (kind === 'acid' ? 99 : 0));
      if (h > 0.5) continue; var px = gx * CELL + 40 + U.hash(gy, gx) * 280, py = gy * CELL + 40 + U.hash(gx + 5, gy + 9) * 280, rr = 36 + U.hash(gx + 3, gy + 1) * 40;
      if (px * px + py * py < 220 * 220) continue;
      if ((x - px) * (x - px) + (y - py) * (y - py) < rr * rr) return { x: px, y: py, r: rr };
    }
    return r;
  }
  G.poolsVisible = function (cb) {
    var x0 = Math.floor((G.cam.x - 90) / CELL), x1 = Math.floor((G.cam.x + W + 90) / CELL), y0 = Math.floor((G.cam.y - 90) / CELL), y1 = Math.floor((G.cam.y + H + 90) / CELL), gx, gy;
    for (gx = x0; gx <= x1; gx++) for (gy = y0; gy <= y1; gy++) {
      var h = U.hash(gx, gy + (G.def.hz.indexOf('acid') >= 0 ? 99 : 0)); if (h > 0.5) continue;
      var px = gx * CELL + 40 + U.hash(gy, gx) * 280, py = gy * CELL + 40 + U.hash(gx + 5, gy + 9) * 280, rr = 36 + U.hash(gx + 3, gy + 1) * 40; if (px * px + py * py < 220 * 220) continue; cb(px, py, rr);
    }
  };
  function bandAt(y) { var by = Math.floor(y / 320), h = U.hash(by, 7); if (h > 0.4) return 0; var off = y - by * 320; if (off < 120 || off > 200) return 0; return h < 0.2 ? 1 : -1; }
  G.bandVisible = function (cb) { var y0 = Math.floor(G.cam.y / 320) - 1, y1 = Math.floor((G.cam.y + H) / 320) + 1; for (var by = y0; by <= y1; by++) { var h = U.hash(by, 7); if (h <= 0.4) cb(by * 320 + 120, h < 0.2 ? 1 : -1); } };

  function hazards(dt) {
    var p = G.p, hz = G.def.hz, h = G.hz, st = G.def.pal, i;
    p.slide = hz.indexOf('ice') >= 0 || hz.indexOf('zerog') >= 0; p.inPool = 0;
    if (hz.indexOf('slag') >= 0 || hz.indexOf('acid') >= 0) {
      var kind = hz.indexOf('acid') >= 0 ? 'acid' : 'slag', pl = poolAt(p.x, p.y, kind);
      if (pl) { p.inPool = kind === 'acid' ? 2 : 1; h.pt = (h.pt || 0) - dt; if (h.pt <= 0) { h.pt = 0.5; G.hurtPlayer((kind === 'acid' ? 4 : 7) * G.dmgScale(), pl.x, pl.y, 'hazard'); } }
    }
    if (hz.indexOf('conveyor') >= 0) { var b = bandAt(p.y); if (b) p.vx += b * 140 * dt; }
    if (hz.indexOf('storm') >= 0) { h.storm -= dt; if (h.storm <= 0) { h.storm = Math.max(0.7, 1.7 - G.t / 400); var a = Math.random() * 6.283, d = Math.random() * 170; G.warn(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 34, 0.9, 13 * G.dmgScale(), { beam: true, c: G.def.pal[2] }); } }
    if (hz.indexOf('lasers') >= 0) {
      h.laser -= dt;
      if (h.laser <= 0) { h.laser = 9; var bx = Math.round(p.x / 170) * 170, by = Math.round(p.y / 170) * 170; for (i = -2; i <= 2; i++) { G.beam({ x: bx + i * 170, y: p.y, ang: 1.5708, len: 700, w: 6, tele: 1.1, life: 0.6, dmg: 16 * G.dmgScale(), sym: true, c: '#ff4a4a' }); G.beam({ x: p.x, y: by + i * 170, ang: 0, len: 900, w: 6, tele: 1.1, life: 0.6, dmg: 16 * G.dmgScale(), sym: true, c: '#ff4a4a' }); } AU.sfx('telegraph'); }
    }
    if (hz.indexOf('rings') >= 0) { h.ring -= dt; if (h.ring <= 0) { h.ring = 8; var a2 = Math.random() * 6.283; G.zone('ering', p.x + Math.cos(a2) * 200, p.y + Math.sin(a2) * 150, { r: 4, life: 3.5, dmg: 15 * G.dmgScale(), spd: 120, max2: 300, c: st[2] }); AU.sfx('telegraph'); } }
  }

  /* ---------------- spawn director ---------------- */
  function weights() {
    var t = G.t, b = G.def.bias, w = [100 * (b.skeleton || 1), t > 35 ? 28 * (b.ghost || 1) : 0, t > 70 ? 24 * (b.hound || 1) : 0, t > 110 ? 12 * (b.lich || 1) : 0, t > 95 ? 6 * (b.golem || 1) : 0, t > 140 ? 9 * (b.banshee || 1) : 0];
    if (G.stage >= 3) for (var i = 1; i < 6; i++) if (w[i]) w[i] *= 1.4;
    return w;
  }
  var TYPES = ['skeleton', 'ghost', 'hound', 'lich', 'golem', 'banshee'];
  function director(dt) {
    var t = G.t, p = G.p, m = t / 60;
    if (G.stageBoss && G.bossOn && !G.bossOn.dead) { /* during the sector boss fight keep light pressure */ }
    var rate = 1.15 * (2.6 + 1.5 * m + 0.14 * m * m) * (1 + 0.04 * G.stage) * (1 + 0.008 * Math.max(0, G.power() - 2)) * (G.stageBoss ? 0.45 : 1);
    var cap = CS.BAL.maxEnemies * Math.min(1, 0.35 + t / 300); if (G.stageBoss) cap *= 0.5;
    G.spawnAcc += rate * dt; var w = weights();
    while (G.spawnAcc >= 1) { G.spawnAcc--; if (G.en.n >= cap) break; var ty = TYPES[U.weighted(w)]; G.spawnRing(ty, 1, 540, { elite: t > (G.stage >= 8 ? 60 : 150) && Math.random() < Math.min(0.05, (t - 60) / 4000) * (G.stage >= 8 ? 3 : 1) }); }
    G.swarmT -= dt; if (G.swarmT <= 0) { G.swarmT = 50 - Math.min(20, m * 3); var n = Math.min(70, 26 + m * 6), ty2 = Math.random() < 0.7 ? 'skeleton' : TYPES[U.weighted(w)]; for (var i = 0; i < n && G.en.n < CS.BAL.maxEnemies; i++) { var a = i / n * 6.283; G.spawnEnemy(ty2, p.x + Math.cos(a) * 500, p.y + Math.sin(a) * 340, null); } G.banner = { t: 2.2, text: 'SWARM INCOMING', c: '#ff9a3c' }; AU.sfx('spawn'); }
    // mid-boss every 90s
    var nextMid = CS.BAL.midInterval * (G.midN + 1);
    if (!G.stageBoss && t >= nextMid && nextMid < G.dur - 25) { G.midN++; CS.E.spawnMid(G.midN - 1); }
    if (!G.stageBoss && t >= G.dur) { G.stageBoss = true; CS.E.spawnStageBoss(); }
    if (G.sirenT > 0) { G.sirenT -= dt; }
    if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
    // far enemies teleport back to the ring so the swarm stays dense
    var a2 = G.en.a, i2, e;
    for (i2 = 0; i2 < G.en.n; i2++) { e = a2[i2]; if (!e.boss && !e.dead && ((e.x - p.x) * (e.x - p.x) + (e.y - p.y) * (e.y - p.y)) > 820 * 820) { var ang = Math.random() * 6.283; e.x = p.x + Math.cos(ang) * 560; e.y = p.y + Math.sin(ang) * 400; } }
  }

  /* ---------------- sub-updates ---------------- */
  function updateShots(dt) {
    var a = G.sh, i, s, n, k, e, j;
    for (i = a.n - 1; i >= 0; i--) {
      if (i >= a.n) continue; s = a.a[i]; s.life -= dt; if (s.life <= 0) { if (s.boom) G.explode(s.x, s.y, s.boom, s.dmg, { src: s.src, col: '#ff9a3c' }); a.kill(i); continue; }
      if (s.home > 0) { var tg = G.nearest(s.x, s.y, 220); if (tg) { var want = Math.atan2(tg.y - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx), df = Math.atan2(Math.sin(want - cur), Math.cos(want - cur)), sp = Math.hypot(s.vx, s.vy); cur += U.clamp(df, -s.home * dt, s.home * dt); s.vx = Math.cos(cur) * sp; s.vy = Math.sin(cur) * sp; } }
      s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.spin * dt;
      if (s.saw) { // bounce off the visible arena bounds
        var L = G.cam.x + 20, R = G.cam.x + W - 20, T = G.cam.y + 20, B = G.cam.y + H - 20, bounced = false;
        if (s.x < L) { s.x = L; s.vx = Math.abs(s.vx); bounced = true; } else if (s.x > R) { s.x = R; s.vx = -Math.abs(s.vx); bounced = true; }
        if (s.y < T) { s.y = T; s.vy = Math.abs(s.vy); bounced = true; } else if (s.y > B) { s.y = B; s.vy = -Math.abs(s.vy); bounced = true; }
        if (bounced && s.split > 0 && G.sh.n < 200) { s.split--; var an = Math.atan2(s.vy, s.vx) + 0.6, sp2 = Math.hypot(s.vx, s.vy), c2 = G.shot(s.x, s.y, an, sp2, s.dmg * 0.7, { src: s.src, r: s.r, life: Math.min(1.5, s.life), saw: true, spr: 'shot_saw', spin: 14, pierce: 99, type: 'phys' }); }
      }
      var lst = G.nearList(s.x, s.y, s.r); n = lst.length;
      for (k = 0; k < n; k++) {
        e = lst[k]; if (e.dead || s.hit.indexOf(e.uid) >= 0) continue;
        if (s.saw) { if (e.sawCd > 0) continue; e.sawCd = 0.28; }
        s.hit.push(e.uid); var ang = Math.atan2(s.vy, s.vx);
        G.hit(e, s.dmg, { src: s.src, kb: s.kb, dx: Math.cos(ang), dy: Math.sin(ang), type: s.type, purge: s.purge, critAdd: s.crit });
        if (s.chain && !e.dead) G.chain(e, s.dmg * 0.5, s.chain, 100, { src: s.src, noCrit: true, noChain: true, col: '#4dffb0' });
        if (s.boom) G.explode(s.x, s.y, s.boom, s.dmg * 0.7, { src: s.src, col: '#ff9a3c' });
        if (s.pierce > 0) { s.pierce--; }
        else if (s.bounce > 0) { // ricochet to a fresh target
          s.bounce--; var nt = null, bd = 240 * 240, q; for (q = 0; q < 12; q++) { var c = G.nearest(s.x + (Math.random() * 200 - 100), s.y + (Math.random() * 200 - 100), 130); if (c && s.hit.indexOf(c.uid) < 0) { nt = c; break; } }
          if (nt) { var sp3 = Math.hypot(s.vx, s.vy), a3 = Math.atan2(nt.y - s.y, nt.x - s.x); s.vx = Math.cos(a3) * sp3; s.vy = Math.sin(a3) * sp3; fx.v('line', s.x, s.y, { x2: nt.x, y2: nt.y, c: '#ffb347', w: 1, life: 0.1 }); } else { a.kill(i); break; }
        } else if (!s.saw) { a.kill(i); break; }
        if (s.saw) break;
      }
    }
  }
  function updateEBullets(dt) {
    var a = G.eb, i, b, p = G.p, d, m, j, mm;
    for (i = a.n - 1; i >= 0; i--) {
      b = a.a[i]; b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y) > 900 * 900) { a.kill(i); continue; }
      var blocked = false;
      for (j = 0; j < G.mn.n; j++) { mm = G.mn.a[j]; if (mm.kind !== 'aegis' || mm.dead) continue; if ((mm.x - b.x) * (mm.x - b.x) + (mm.y - b.y) * (mm.y - b.y) < (mm.r + b.r + 3) * (mm.r + b.r + 3)) { blocked = true; fx.burst(b.x, b.y, 4, '#ffe44d', 90, 0.25, 2); AU.sfx('shield'); if (CS.WP.aegisReflect()) { G.shot(b.x, b.y, Math.atan2(-b.vy, -b.vx), 300, b.dmg * 2 + 10, { src: 'aegis', spr: 'shot_bolt', life: 1.2, type: 'holy' }); } break; } }
      var dr = p.items.drone;
      if (!blocked && dr) for (j = 0; j < dr.dr.length; j++) { var dd = dr.dr[j]; if (dd.rt > 0) continue; if ((dd.x - b.x) * (dd.x - b.x) + (dd.y - b.y) * (dd.y - b.y) < (b.r + 6) * (b.r + 6)) { dd.hp -= b.dmg; dd.flash = 3; blocked = true; fx.burst(b.x, b.y, 3, '#4dffb0', 80, 0.2, 2); break; } }
      if (blocked) { a.kill(i); continue; }
      d = (b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y);
      if (d < (b.r + p.r) * (b.r + p.r)) {
        if (p.items.deflector && p.items.deflector.lv >= 10 && p.shield > 0) { G.shot(b.x, b.y, Math.atan2(-b.vy, -b.vx), 340, b.dmg * 3, { src: 'deflector', spr: 'shot_orb', life: 1.4, type: 'energy' }); }
        G.hurtPlayer(b.dmg, b.x, b.y, 'bullet'); a.kill(i);
      }
    }
  }
  function updateLoot(dt) {
    var a = G.loot, i, l, p = G.p, dx, dy, d, pr = p.pick * p.pickMul * (p.magnetT > 0 ? 40 : 1), L = CS.BAL.loot, ms = L.maxSpeed * (1 + 0.06 * SV.sharedRank('magnet'));
    for (i = a.n - 1; i >= 0; i--) {
      l = a.a[i]; l.t += dt; dx = p.x - l.x; dy = p.y - l.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
      var rad = l.type === 'chest' ? 9999 : pr;
      if (!l.pull && d < rad) { l.pull = true; if (l.type !== 'chest') AU.sfx('whoosh'); }
      if (l.pull) { l.sp = Math.min(ms * (l.type === 'chest' ? 0.7 : 1) + 80, l.sp + L.accel * dt * (1 + 0.06 * SV.sharedRank('magnet')) * (l.type === 'chest' ? 0.7 : 1)); l.vx = dx / d * l.sp; l.vy = dy / d * l.sp; }
      else { l.vx *= 0.93; l.vy *= 0.93; }
      l.x += l.vx * dt; l.y += l.vy * dt;
      if (d < 10 + (l.type === 'chest' ? 8 : 0)) { collect(l); a.kill(i); }
    }
  }
  function collect(l) {
    var p = G.p;
    if (l.type === 'coin') { G.addGold(l.v); AU.sfx('coin'); fx.spark(p.x, p.y - 6, 0, -30, 0.3, '#ffd700', 2); }
    else if (l.type === 'scrap') { p.scrap += l.v; AU.sfx('scrap'); CS.WP.scrapCheck(); }
    else if (l.type === 'hp') { G.heal(p.maxHp * 0.25); AU.sfx('heal'); fx.burst(p.x, p.y, 8, '#5cff8a', 80, 0.5, 2); }
    else if (l.type === 'mag') { p.magnetT = 7; AU.sfx('pick'); fx.num(p.x, p.y - 20, 'MAGNET!', '#ff5a7a', 1); fx.shake(0.1); }
    else if (l.type === 'chest') { G.chest = CS.WP.openChest(); AU.sfx('chest'); }
  }
  function updateZones(dt) {
    var a = G.zn, i, z, n, k, e, p = G.p;
    for (i = a.n - 1; i >= 0; i--) {
      if (i >= a.n) continue; z = a.a[i]; z.life -= dt; z.t += dt;
      if (z.life <= 0) { if (z.kind === 'hole') { G.explode(z.x, z.y, z.r, z.dmg, { src: 'graviton', type: 'energy', col: '#c9a3ff', noCrit: true }); } a.kill(i); continue; }
      switch (z.kind) {
        case 'cloud': case 'napalm': case 'judg': case 'trail':
          if (z.follow && z.kind === 'cloud') { var tg = G.nearest(z.x, z.y, 280); if (tg) { var an = Math.atan2(tg.y - z.y, tg.x - z.x); z.x += Math.cos(an) * 34 * dt; z.y += Math.sin(an) * 34 * dt; } }
          z.tt -= dt; if (z.tt <= 0) {
            z.tt = z.kind === 'judg' ? 0.12 : 0.25; var lz = G.nearList(z.x, z.y, z.r); n = lz.length;
            for (k = 0; k < n; k++) { e = lz[k]; if (e.dead) continue; var dmg = z.dps * z.tt; if (z.kind === 'cloud') { e.slow = 0.6; e.shred = 0.6; G.hit(e, dmg, { src: z.src, type: 'poison', noCrit: true, quiet: true }); } else if (z.kind === 'judg') { G.hit(e, dmg, { src: z.src, type: 'holy', purge: true, kb: -30, dx: Math.sign(z.x - e.x), dy: Math.sign(z.y - e.y), quiet: true, noCrit: false }); } else { e.burn = 2; e.burnD = z.dps * 0.5; G.hit(e, dmg, { src: z.src, type: 'fire', noCrit: true, quiet: true }); } }
          } break;
        case 'nova':
          z.r += z.spd * dt; var ln = G.nearList(z.x, z.y, z.r + 10); n = ln.length;
          for (k = 0; k < n; k++) { e = ln[k]; if (e.dead || e.novaId === z.id) continue; var dd = Math.hypot(e.x - z.x, e.y - z.y); if (dd < z.r - 14 - e.r) continue; e.novaId = z.id; var an2 = Math.atan2(e.y - z.y, e.x - z.x); G.hit(e, z.dmg, { src: 'nova', type: 'holy', kb: 230, dx: Math.cos(an2), dy: Math.sin(an2), purge: true }); if (!e.dead) { e.burn = 3; e.burnD = z.dmg * 0.18; } }
          if (z.r >= z.max2) a.kill(i); break;
        case 'hole':
          n = G.near(z.x, z.y, z.r + 60); for (k = 0; k < n; k++) { e = G.tmp[k]; if (e.boss) continue; var dx = z.x - e.x, dy = z.y - e.y, dl = Math.hypot(dx, dy) || 1; e.x += dx / dl * 130 * dt; e.y += dy / dl * 130 * dt; }
          break;
        case 'ering':
          z.r += z.spd * dt; var pd = Math.hypot(p.x - z.x, p.y - z.y); if (!z.hitP && Math.abs(pd - z.r) < 9 + p.r) { z.hitP = true; G.hurtPlayer(z.dmg, z.x, z.y, 'ring'); }
          if (z.r >= z.max2) a.kill(i); break;
        case 'ice': break;
      }
    }
  }
  function updateWarn(dt) {
    var a = G.wn, i, w, p = G.p;
    for (i = a.n - 1; i >= 0; i--) {
      if (i >= a.n) continue; w = a.a[i]; w.t += dt; if (w.t < w.delay) continue;
      if (w.fr) { G.explode(w.x, w.y, w.r, w.dmg, { src: w.src, type: 'energy', col: w.c, burn: w.burn, stun: w.stun }); CS.V.column(w.x, w.y, w.r * 0.55, w.c, 0.3); if (w.beam) AU.sfx('beam'); fx.shake(0.25); }
      else {
        if ((p.x - w.x) * (p.x - w.x) + (p.y - w.y) * (p.y - w.y) < (w.r + p.r) * (w.r + p.r)) G.hurtPlayer(w.dmg, w.x, w.y, 'strike');
        if (w.beam) CS.V.column(w.x, w.y, w.r * 0.5, w.c, 0.26); else CS.V.explosion(w.x, w.y, w.r, w.c); AU.sfx(w.r > 60 ? 'boom' : 'smallboom'); fx.shake(w.r > 60 ? 0.35 : 0.1);
      }
      a.kill(i);
    }
  }
  function updateBeams(dt) {
    var a = G.bm, i, b, p = G.p, x1, y1, x2, y2, ca, sa;
    for (i = a.n - 1; i >= 0; i--) {
      if (i >= a.n) continue; b = a.a[i]; if (b.own) { if (b.own.dead) { a.kill(i); continue; } b.x = b.own.x; b.y = b.own.y; }
      b.t += dt; if (b.rot) b.ang += b.rot * dt; if (b.t >= b.tele + b.life) { a.kill(i); continue; }
      if (b.t < b.tele) continue;
      b.tick -= dt; if (b.tick <= 0) {
        b.tick = 0.3; ca = Math.cos(b.ang); sa = Math.sin(b.ang); x1 = b.sym ? b.x - ca * b.len : b.x; y1 = b.sym ? b.y - sa * b.len : b.y; x2 = b.x + ca * b.len; y2 = b.y + sa * b.len;
        if (b.dmg > 0 && segDist(p.x, p.y, x1, y1, x2, y2) < b.w + p.r) G.hurtPlayer(b.dmg, b.x, b.y, 'beam');
      }
    }
  }

  /* ---------------- main update ---------------- */
  G.update = function (dt) {
    var p = G.p, i, e, a;
    G.t += dt; G.frame++; CS.t = G.t; if (G.critStop > 0) G.critStop -= dt;
    // reap
    a = G.en; for (i = a.n - 1; i >= 0; i--) if (a.a[i].dead) a.kill(i);
    G.grid.build();
    for (i = 0; i < G.en.n; i++) { e = G.en.a[i]; if (e.sawCd > 0) e.sawCd -= dt; }
    director(dt); hazards(dt);
    // player movement
    var mv = In.move(), spd = p.spd * (p.spdMul || 1) * (p.inPool === 2 ? 0.6 : 1), k = p.slide ? 2.4 : 15, f = 1 - Math.exp(-k * dt), thr = p.items.thrusters;
    p.mdMax = 1.7 * (1 - Math.min(0.4, 0.04 * (thr ? thr.pw : 0))); if (p.mdCd > 0) p.mdCd -= dt;
    if (In.p.dash && p.mdCd <= 0 && p.dashT <= 0) { var dl = Math.hypot(mv.x, mv.y); p.ddx = dl > 0.1 ? mv.x / dl : p.face; p.ddy = dl > 0.1 ? mv.y / dl : 0; p.dashT = 0.17; p.mdCd = p.mdMax; p.inv = Math.max(p.inv, 0.3); AU.sfx('dodge'); In.rumble(35, 0.3); fx.v('flash', p.x, p.y, { r: 16, c: '#9fefff', life: 0.18 }); }
    if (p.dashT > 0) { p.dashT -= dt; p.vx = p.ddx * 580; p.vy = p.ddy * 580; fx.spark(p.x + (Math.random() - 0.5) * 8, p.y + (Math.random() - 0.5) * 10, -p.ddx * 40, -p.ddy * 40, 0.3, Math.random() < 0.5 ? '#9fefff' : '#ffffff', 3); p.x += p.vx * dt; p.y += p.vy * dt; }
    else { p.vx += (mv.x * spd - p.vx) * f; p.vy += (mv.y * spd - p.vy) * f; p.x += p.vx * dt; p.y += p.vy * dt; }
    if (Math.abs(mv.x) > 0.1) p.face = mv.x > 0 ? 1 : -1; p.bob += dt * (Math.hypot(p.vx, p.vy) > 20 ? 12 : 3);
    if (p.dead) { G.over = true; G.won = false; return; }
    // status timers
    if (p.inv > 0) p.inv -= dt; if (p.flash > 0) p.flash--; if (p.hurtT > 0) p.hurtT -= dt; if (p.magnetT > 0) p.magnetT -= dt; p.staticT = Math.max(0, p.staticT - dt);
    CS.WP.updatePlayer(dt);
    // items, minions
    for (i = 0; i < p.order.length; i++) { var it = p.items[p.order[i]]; CS.WP.update(it, dt); }
    CS.MN.update(dt);
    CS.E.update(dt);
    updateShots(dt); updateEBullets(dt); updateZones(dt); updateWarn(dt); updateBeams(dt); updateLoot(dt);
    fx.update(dt);
    G.cam.x = Math.round(p.x - W / 2); G.cam.y = Math.round(p.y - H / 2);
    if (p.hp <= 0 && !p.dead) CS.WP.tryDeath();
    if (p.dead) { G.over = true; G.won = false; }
    if (G.won) G.over = true;
  };

  /* ---------------- rendering ---------------- */
  function drawFloor(ctx) {
    var t = A.tile(G.stage), cx = G.cam.x, cy = G.cam.y, ox = -(((cx % 256) + 256) % 256), oy = -(((cy % 256) + 256) % 256), x, y, pal = G.def.pal;
    for (x = ox; x < W; x += 256) for (y = oy; y < H; y += 256) ctx.drawImage(t, x, y);
    var T = G.t;
    if (G.def.hz.indexOf('slag') >= 0 || G.def.hz.indexOf('acid') >= 0) {
      var acid = G.def.hz.indexOf('acid') >= 0;
      G.poolsVisible(function (px, py, rr) {
        var X = px - cx, Y = py - cy; ctx.fillStyle = A.hex(pal[2], 0.3); ctx.beginPath(); ctx.ellipse(X, Y, rr + 4, rr * 0.8 + 4, 0, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 0.75; ctx.fillStyle = acid ? '#3fd02a' : pal[2]; ctx.beginPath(); ctx.ellipse(X, Y, rr, rr * 0.8, 0, 0, 6.283); ctx.fill();
        ctx.globalAlpha = 1; ctx.fillStyle = acid ? '#b8ff6a' : pal[3]; for (var b = 0; b < 4; b++) { var ph = (T * 0.8 + b * 0.27 + px * 0.01) % 1; ctx.fillRect(Math.round(X + Math.cos(b * 2 + px) * rr * 0.5), Math.round(Y - ph * 10 + Math.sin(b * 3) * rr * 0.3), 2, 2); }
      });
    }
    if (G.def.hz.indexOf('conveyor') >= 0) {
      G.bandVisible(function (by, dir) { var Y = by - cy; ctx.fillStyle = 'rgba(255,160,40,.12)'; ctx.fillRect(0, Y, W, 80); ctx.fillStyle = 'rgba(255,200,80,.55)'; var off = (T * 40 * dir) % 24; for (var x2 = -24; x2 < W + 24; x2 += 24) { var xx = x2 + off - (cx % 24); ctx.fillRect(Math.round(xx), Y + 6, 3, 3); ctx.fillRect(Math.round(xx + 6 * dir), Y + 14, 3, 3); ctx.fillRect(Math.round(xx), Y + 40, 3, 3); ctx.fillRect(Math.round(xx), Y + 66, 3, 3); } ctx.fillStyle = pal[2]; ctx.fillRect(0, Y, W, 2); ctx.fillRect(0, Y + 78, W, 2); });
    }
  }
  function drawLoot(ctx, cx, cy) {
    var a = G.loot, i, l, bob;
    for (i = 0; i < a.n; i++) {
      l = a.a[i]; bob = Math.sin(l.t * 5 + i) * 1.5; var X = l.x - cx, Y = l.y - cy + bob; if (X < -20 || X > W + 20 || Y < -20 || Y > H + 20) continue;
      if (l.type === 'chest') { ctx.fillStyle = 'rgba(255,215,0,' + (0.25 + 0.2 * Math.sin(l.t * 8)) + ')'; ctx.beginPath(); ctx.arc(X, Y, 22, 0, 6.283); ctx.fill(); }
      A.draw(ctx, l.type === 'hp' ? 'health' : l.type === 'mag' ? 'magnet' : l.type, X, Y);
    }
  }
  function drawZones(ctx, cx, cy, over) {
    var a = G.zn, i, z, X, Y, T = G.t, V = CS.V;
    for (i = 0; i < a.n; i++) {
      z = a.a[i]; X = z.x - cx; Y = z.y - cy; var air = z.kind === 'judg' || z.kind === 'ering' || z.kind === 'nova' || z.kind === 'hole'; if (air !== over) continue;
      if (X < -z.r - 120 || X > W + z.r + 120 || Y < -z.r - 400 || Y > H + z.r + 120) continue;
      if (z.kind === 'cloud') V.cloud(ctx, X, Y, z.r, T, i);
      else if (z.kind === 'napalm') V.napalm(ctx, X, Y, z.r, T, i, z.life);
      else if (z.kind === 'trail') { ctx.globalCompositeOperation = 'lighter'; V.add(ctx, 'fx_orb', '#d48bff', X, Y, 22, 22, 0, z.life / z.max * 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      else if (z.kind === 'hole') V.hole(ctx, X, Y, T);
      else if (z.kind === 'judg') V.judg(ctx, X, Y, z.r, T);
      else if (z.kind === 'nova') V.nova(ctx, X, Y, z.r, z.max2);
      else if (z.kind === 'ering') V.ering(ctx, X, Y, z.r, z.c);
    }
  }
  function drawWarn(ctx, cx, cy) {
    var a = G.wn, i, w, f, V = CS.V;
    for (i = 0; i < a.n; i++) { w = a.a[i]; f = U.clamp(w.t / w.delay, 0, 1); V.telegraph(ctx, w.x - cx, w.y - cy, w.r, f, w.c, G.t); }
    a = G.bm;
    for (i = 0; i < a.n; i++) {
      var b = a.a[i], ca = Math.cos(b.ang), sa = Math.sin(b.ang), x1 = b.sym ? b.x - ca * b.len : b.x, y1 = b.sym ? b.y - sa * b.len : b.y, x2 = b.x + ca * b.len, y2 = b.y + sa * b.len;
      V.laser(ctx, x1 - cx, y1 - cy, x2 - cx, y2 - cy, b.w, b.c, b.t >= b.tele);
    }
  }
  function drawShots(ctx, cx, cy) { CS.V.drawShots(ctx, cx, cy); }
  G.draw = function (ctx) {
    var p = G.p, cx = G.cam.x, cy = G.cam.y, i, e, X, Y;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(fx.ox, fx.oy);
    drawFloor(ctx); drawZones(ctx, cx, cy, false); drawLoot(ctx, cx, cy);
    var a = G.en.a, n = G.en.n;
    for (i = 0; i < n; i++) {
      e = a[i]; if (e.dead) continue; X = e.x - cx; Y = e.y - cy; if (X < -80 || X > W + 80 || Y < -80 || Y > H + 80) continue;
      if (e.elite) { ctx.strokeStyle = '#ff4fd8'; ctx.globalAlpha = 0.6 + 0.3 * Math.sin(G.t * 8); ctx.beginPath(); ctx.arc(Math.round(X), Math.round(Y + 2), e.r + 4, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
      if (e.type === 'banshee') { ctx.globalAlpha = 0.14 + 0.06 * Math.sin(G.t * 12 + e.uid); ctx.fillStyle = '#d48bff'; ctx.beginPath(); ctx.arc(X, Y, 70, 0, 6.283); ctx.fill(); ctx.globalAlpha = 0.5; ctx.strokeStyle = '#d48bff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X, Y, 70, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
      if (e.stun > 0 || e.slow > 0 || e.shred > 0) { ctx.fillStyle = e.stun > 0 ? '#c9a3ff' : '#6bff3c'; ctx.fillRect(Math.round(X - 2), Math.round(Y - e.r - 6), 4, 2); }
      if (e.type === 'hound' && e.st === 1) { var ddx = Math.cos(e.ang), ddy = Math.sin(e.ang); ctx.strokeStyle = '#ff4a4a'; ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + ddx * 190, Y + ddy * 190); ctx.stroke(); ctx.globalAlpha = 1; }
      A.draw(ctx, e.spr, X, Y - (e.type === 'ghost' ? 3 + Math.sin(G.t * 4 + e.uid) * 2 : Math.abs(Math.sin(G.t * 9 + e.uid)) * 1.5), e.face < 0, e.flash > 0, e.big * (e.elite ? 1.25 : 1));
    }
    CS.MN.draw(ctx, cx, cy);
    // player
    X = p.x - cx; Y = p.y - cy;
    var psp = A.spr[G.cls], foot = psp ? psp.dh / 2 - 3 : 10; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(Math.round(X), Math.round(Y + foot), 10, 3, 0, 0, 6.283); ctx.fill();
    if (p.shield > 0 || p.holy > 0) { ctx.globalAlpha = 0.25 + 0.15 * Math.sin(G.t * 6); ctx.strokeStyle = p.holy > 0 && p.shield <= 0 ? '#ffe44d' : '#48a8ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 18, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
    if (p.aegisT > 0) { ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffd35a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, 20 + Math.sin(G.t * 20), 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
    if (!(p.inv > 0 && Math.floor(G.t * 20) % 2 && p.aegisT <= 0)) A.draw(ctx, G.cls, X, Y - Math.abs(Math.sin(p.bob)) * 2, p.face < 0, p.flash > 0);
    CS.WP.drawPlayerFx(ctx, cx, cy);
    drawShots(ctx, cx, cy);
    drawZones(ctx, cx, cy, true); drawWarn(ctx, cx, cy);
    fx.drawWorld(ctx, cx, cy); fx.drawVfx(ctx, cx, cy); fx.drawNums(ctx, cx, cy);
    ctx.restore();
  };
})();
