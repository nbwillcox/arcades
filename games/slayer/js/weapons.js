/* items: stats, rarity rolls, upgrades (Lv1-10), every weapon / spell / defense behaviour */
(function () {
  var U = CS.U, fx = CS.fx, AU = CS.audio, SV = CS.save, G = CS.G, WP = CS.WP = {};
  var MINION = { vanguard: 1, sniper: 1, aegis: 1, detonator: 1 };

  function cls() { return G.cls; }
  function cd(it, base, dec, min) {
    var p = G.p, v = base * Math.pow(1 - dec, it.pw - 1); v = Math.max(min || base * 0.35, v); v /= (1 + (it.bon.aspd || 0));
    v *= p.cdMul * (CS.ITEMS[it.id].bal ? p.balMul : 1) * (p.staticT > 0 ? 1.4 : 1); return v;
  }
  function sc(it, per) { return 1 + (per || 0.3) * (it.pw - 1); }
  function pp(it) { return it.bon.proj || 0; }

  /* ---------------- stats / recalc ---------------- */
  WP.recalc = function () {
    var p = G.p, C = G.C, it = p.items, sh = SV.sharedRank, oldMax = p.maxHp, k, hpb = 0, id;
    for (id in it) if (it[id].bon.hp) hpb += 0.15 * it[id].bon.hp;
    p.maxHp = Math.round(C.hp * (1 + 0.08 * sh('chassis')) * (1 + hpb));
    p.armor = C.armor + sh('plating') + (it.plating ? 2 * it.plating.pw : 0);
    p.spd = C.spd * (1 + (it.thrusters ? Math.min(0.5, 0.04 * it.thrusters.pw) : 0));
    p.dodge = it.thrusters ? Math.min(0.3, 0.03 * it.thrusters.pw) : 0;
    p.pick = C.pick * (1 + 0.08 * sh('magnet'));
    p.xpMul = 1 + 0.06 * sh('neural');
    p.goldMul = 1 + 0.08 * sh('greed') + (it.graviton ? 0.06 * it.graviton.pw : 0);
    p.crit = C.crit + (G.cls === 'gunner' ? 0.015 * SV.classRank('gunner', 'hollow') : 0);
    p.critMul = 1.5 + (it.graviton ? 0.25 * it.graviton.pw : 0);
    p.balMul = 1 - (G.cls === 'gunner' ? 0.03 * SV.classRank('gunner', 'reload') : 0);
    p.regen = it.regen ? 0.4 * it.regen.pw + (it.regen.bon.reg || 0) : 0;
    p.shieldMax = it.deflector ? 20 + 12 * it.deflector.pw : 0;
    p.mAtk = (it.fusion && it.fusion.lv >= 5) ? 1.35 : 1;
    if (p.shield > p.shieldMax) p.shield = p.shieldMax;
    if (p.maxHp > oldMax && oldMax > 1) p.hp += p.maxHp - oldMax;
    if (p.hp > p.maxHp) p.hp = p.maxHp;
  };

  WP.minionTarget = function (id) {
    var p = G.p, it = p.items[id]; if (!it) return 0; var k = it.pw, n;
    if (id === 'vanguard') n = 1 + Math.floor((k - 1) * 0.55); else if (id === 'sniper') n = 1 + Math.floor((k - 1) * 0.45); else if (id === 'aegis') n = 1 + Math.floor((k - 1) * 0.45); else n = 2 + Math.floor((k - 1) * 0.7);
    n += pp(it);
    if (G.cls === 'gunner' && id === 'vanguard') n += Math.ceil(SV.classRank('gunner', 'barracks') * 0.4) + (p.extra.raise || 0);
    if (G.cls === 'priest' && id === 'aegis') n += Math.ceil(SV.classRank('priest', 'choir') / 2);
    if (G.cls === 'engineer') n += SV.classRank('engineer', 'motherboard');
    return n;
  };
  WP.minionCap = function () { return 14 + (G.cls === 'engineer' ? 2 * SV.classRank('engineer', 'motherboard') : 0); };

  /* ---------------- run setup ---------------- */
  WP.setupRun = function (C) {
    var p = G.p; p.items = {}; p.order = [];
    WP.addItem(C.primary, 0, true); WP.addItem(C.innate, 0, true);
    p.maxHp = 1; WP.recalc(); p.hp = p.maxHp; p.shield = p.shieldMax; p.holy = 0;
    CS.MN.clear(); CS.MN.fillAll();
  };
  WP.addItem = function (id, rar) {
    var p = G.p, it = { id: id, lv: 1, pw: CS.RAR[rar].m, rar: rar, bon: {}, cd: 0.4, t: 0, t2: 0, n: 0, q: [], sh: [], dr: [], orb: [], spT: 0 };
    p.items[id] = it; p.order.push(id); return it;
  };
  WP.offenseCount = function () { var n = 0, p = G.p; p.order.forEach(function (id) { var c = CS.ITEMS[id].cat; if (c !== 'defense') n++; }); return n; };

  /* ---------------- rarity / cards ---------------- */
  WP.rollRar = function (min) {
    var ws = CS.RAR.map(function (r) { return r.w; }), br = G.cls === 'priest' ? SV.classRank('priest', 'blessing') : 0, i;
    ws[0] *= Math.max(0.4, 1 - 0.04 * br); ws[2] *= 1 + 0.1 * br; ws[3] *= 1 + 0.2 * br; ws[4] *= 1 + 0.25 * br;
    for (i = 0; i < (min || 0); i++) ws[i] = 0;
    return U.weighted(ws);
  };
  var BONS = { proj: '+1 PROJECTILE / UNIT', aspd: '+20% ATTACK SPEED', chain: 'CHAIN LIGHTNING', ls: '2% LIFESTEAL', hp: '+15% MAX HP', reg: '+1 HP/S REGEN' };
  WP.bonusText = function (k) { return BONS[k]; };
  function candidates() {
    var p = G.p, out = [], off = WP.offenseCount();
    CS.ITEM_ORDER.forEach(function (id) {
      var d = CS.ITEMS[id], it = p.items[id];
      if (d.cls && d.cls !== G.cls) return;
      if (it) { if (it.lv < 10) out.push({ id: id, isNew: false, w: d.cls ? 1.8 : 1.4 }); }
      else if (d.cat === 'defense' || off < CS.MAX_OFFENSE) { if (d.cat !== 'primary') out.push({ id: id, isNew: true, w: d.cat === 'defense' ? 0.9 : d.cls ? 1.5 : 1 }); }
    });
    return out;
  }
  function mkCard(c, minRar) {
    var d = CS.ITEMS[c.id], r = WP.rollRar(minRar), card = { kind: 'item', id: c.id, rar: r, isNew: c.isNew };
    if (r === 4) { var opts = d.cat === 'defense' ? ['hp', 'reg'] : ['proj', 'aspd', 'chain', 'ls']; card.bon = U.pick(opts); }
    return card;
  }
  WP.hasUpgrades = function () { return candidates().length > 0; };
  WP.rollCards = function (n) {
    var cs = candidates(), cards = [], pick;
    while (cards.length < n && cs.length) { var i = U.weighted(cs.map(function (c) { return c.w; })); cards.push(mkCard(cs[i], 0)); cs.splice(i, 1); }
    if (!cards.length) cards.push({ kind: 'heal', rar: 0 });
    if (cards.length < n && cards[0].kind !== 'heal') cards.push({ kind: 'gold', rar: 0, v: 100 + G.stage * 25 });
    return cards;
  };
  WP.apply = function (card) {
    var p = G.p;
    if (card.kind === 'heal') { G.heal(p.maxHp * 0.5); return; }
    if (card.kind === 'gold') { G.addGold(card.v); return; }
    var it = p.items[card.id], m = CS.RAR[card.rar].m;
    card.from = it ? it.lv : 0;
    if (!it) { it = WP.addItem(card.id, card.rar); }
    else { it.lv++; it.pw += m * (it.lv > 5 ? 1.35 : 1); if (card.rar > it.rar) it.rar = card.rar; }
    if (card.dbl && it.lv < 10) { it.lv++; it.pw += m * (it.lv > 5 ? 1.35 : 1); }   // duplicate roll: doubled upgrade
    if (card.dbl) it.pw += m * 0.5;
    card.to = it.lv;
    if (card.bon) it.bon[card.bon] = (it.bon[card.bon] || 0) + (card.bon === 'aspd' ? 0.2 : card.bon === 'ls' ? 0.02 : 1);
    WP.recalc(); CS.MN.fillAll();
  };
  WP.cardInfo = function (card) {
    if (card.kind === 'heal') return { name: 'REPAIR KIT', lv: 'RESTORE 50% HP', desc: 'NO UPGRADES AVAILABLE. PATCH UP.', c: '#5cff8a' };
    if (card.kind === 'gold') return { name: 'GOLD CACHE', lv: '+' + card.v + ' GOLD', desc: 'NO UPGRADES AVAILABLE.', c: '#ffd700' };
    var d = CS.ITEMS[card.id], it = G.p.items[card.id], nl = card.to !== undefined ? card.to : (it ? it.lv + 1 : 1), fl = card.from !== undefined ? card.from : nl - 1, desc, list = null;
    if (nl === 1) desc = d.d; else if (nl === 5) desc = 'AWAKENING: ' + d.a5 + ' - ' + d.t5; else if (nl === 10) desc = 'APEX: ' + d.a10 + ' - ' + d.t10; else { desc = ''; list = d.u.split(',').map(function (t) { return t.trim().replace(/^\+/, ''); }); }
    return { name: CS.itemName(card.id, G.cls), lv: (card.dbl ? 'DOUBLE! ' : '') + (fl === 0 ? 'NEW  LV ' + nl : 'LV ' + fl + ' > LV ' + nl), desc: desc, list: list, mult: list ? CS.RAR[card.rar].m : 0, c: d.c, bonus: card.bon ? BONS[card.bon] : null, cat: d.cat, awak: nl === 5 || nl === 10 || !!card.dbl };
  };
  WP.openChest = function () {
    var gold = Math.round((250 + G.stage * 83) * (0.9 + Math.random() * 0.2) * (1 + 0.08 * SV.sharedRank('greed')));
    G.addGold(gold); var n = U.ri(1, 3), cards = [], cs, picked = {};
    for (var i = 0; i < n; i++) {
      cs = candidates().filter(function (c) { return !picked[c.id]; });
      if (cs.length) { var pk = cs[U.weighted(cs.map(function (c) { return c.w; }))], card = mkCard(pk, 2); picked[pk.id] = card; cards.push(card); WP.apply(card); continue; }
      var ids = Object.keys(picked);   // nothing new left: would duplicate -> boost an existing reward instead
      if (ids.length && picked[ids[0]]) { var ex = picked[U.pick(ids)]; if (!ex.dbl) { ex.dbl = true; var it2 = G.p.items[ex.id]; if (it2 && it2.lv < 10) { it2.lv++; it2.pw += CS.RAR[ex.rar].m * (it2.lv > 5 ? 1.35 : 1); } if (it2) { it2.pw += CS.RAR[ex.rar].m * 0.5; ex.to = it2.lv; } WP.recalc(); CS.MN.fillAll(); continue; } }
      G.addGold(5000); cards.push({ kind: 'gold', rar: 3, v: 5000 });
    }
    return { gold: gold, cards: cards, t: 0 };
  };

  /* ---------------- player-level systems ---------------- */
  WP.updatePlayer = function (dt) {
    var p = G.p, it = p.items, i;
    p.spdMul = 1; if (!it.stim) p.cdMul = 1; if (p.litanyT > 0) { p.litanyT -= dt; if (it.litany && it.litany.lv >= 5) p.spdMul += 0.15; }
    p.dmgMul = (it.stim && it.stim.lv >= 10 && (it.stim.fr || 0) >= 0.9 ? 1.4 : 1) * (p.litanyT > 0 ? p.litanyMul : 1);
    if (p.regen > 0 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
    if (p.dashCd > 0) p.dashCd -= dt; if (p.burstCd > 0) p.burstCd -= dt; if (p.aegisCd > 0) p.aegisCd -= dt;
    if (p.aegisT > 0) { p.aegisT -= dt; p.inv = Math.max(p.inv, 0.1); }
    if (G.cls === 'engineer' && SV.classRank('engineer', 'nanites') > 0) { p.pulseT -= dt; if (p.pulseT <= 0) { p.pulseT = 5; var rk = SV.classRank('engineer', 'nanites'); G.heal(1 + rk * 1.5, true); fx.v('ring', p.x, p.y, { r: 6, r2: 40, c: '#4dffb0', w: 2, life: 0.4 }); } }
    if (p.shieldMax > 0 && p.shield < p.shieldMax) { p.shieldT -= dt; if (p.shieldT <= 0) { var rate = 8 + 3 * it.deflector.pw; if (it.deflector.lv >= 10) rate *= 2.5; p.shield = Math.min(p.shieldMax, p.shield + rate * dt); } }
    var mr = G.cls === 'priest' ? SV.classRank('priest', 'martyr') : 0;
    if (mr > 0 && p.holy > 0) { var cap = p.maxHp * (0.1 + 0.05 * mr); if (p.holy < cap && p.shieldT <= 0) p.holy = Math.min(cap, p.holy + mr * 0.6 * dt); if (p.holy > cap) p.holy = cap; }
    if (p.shieldT > 0 && p.shieldMax <= 0) p.shieldT -= dt;
    if (it.thrusters && it.thrusters.lv >= 10 && (Math.abs(p.vx) + Math.abs(p.vy)) > 30) { p.trailT -= dt; if (p.trailT <= 0) { p.trailT = 0.09; G.zone('trail', p.x, p.y, { r: 13, life: 0.9, dps: 26 * it.thrusters.pw, src: 'thrusters', c: '#d48bff' }); } }
    if (it.graviton && it.graviton.lv >= 10) { p.holeCd -= dt; if (p.holeCd <= 0) { p.holeCd = 13; var t = G.nearest(p.x, p.y, 300); var hx = t ? t.x : p.x + p.face * 90, hy = t ? t.y : p.y; G.zone('hole', hx, hy, { r: 70, life: 3, dmg: 70 * it.graviton.pw, src: 'graviton' }); AU.sfx('beam'); } }
  };
  WP.onHurt = function () {
    var p = G.p, it = p.items;
    if (it.plating && it.plating.lv >= 10 && p.hp < p.maxHp * 0.35 && p.aegisCd <= 0) { p.aegisT = 3; p.aegisCd = 45; p.inv = 3; AU.sfx('shield'); fx.v('ring', p.x, p.y, { r: 10, r2: 90, c: '#ffd35a', w: 4, life: 0.5 }); fx.num(p.x, p.y - 24, 'AEGIS PROTOCOL', '#ffd35a', 1); }
    if (it.regen && p.hp < p.maxHp * 0.25 && p.burstCd <= 0 && p.hp > 0) {
      p.burstCd = Math.max(20, 46 - 2 * it.regen.pw); G.heal(p.maxHp * (0.3 + 0.02 * it.regen.pw)); AU.sfx('heal'); fx.v('ring', p.x, p.y, { r: 8, r2: 80, c: '#5cff8a', w: 3, life: 0.4 }); fx.num(p.x, p.y - 24, 'EMERGENCY HEAL', '#5cff8a', 1);
      if (it.regen.lv >= 5) G.explode(p.x, p.y, 110, 20 * it.regen.pw, { src: 'regen', stun: 1.6, kb: 260, type: 'holy', col: '#5cff8a' });
    }
    if (it.thrusters && it.thrusters.lv >= 5) WP.phaseDash();
  };
  WP.tryDeath = function () {
    var p = G.p, it = p.items;
    if (it.regen && it.regen.lv >= 10 && !p.revived) { p.revived = true; p.hp = p.maxHp * 0.6; p.inv = 3; G.explode(p.x, p.y, 180, 120 * it.regen.pw, { src: 'regen', kb: 400, type: 'fire', col: '#ffb347' }); fx.num(p.x, p.y - 24, 'PHOENIX REVIVE', '#ffb347', 2); AU.sfx('levelup'); fx.shake(0.6); return; }
    p.hp = 0; p.dead = true;
  };
  WP.phaseDash = function (sx, sy) {
    var p = G.p; if (p.dashCd > 0) return; p.dashCd = 4;
    if (sx === undefined) { var t = G.nearest(p.x, p.y, 200); sx = t ? t.x : p.x; sy = t ? t.y : p.y; }
    var a = Math.atan2(p.y - sy, p.x - sx) || 0; fx.v('flash', p.x, p.y, { r: 14, c: '#d48bff', life: 0.25 });
    p.x += Math.cos(a) * 70; p.y += Math.sin(a) * 70; p.inv = Math.max(p.inv, 0.5); fx.v('flash', p.x, p.y, { r: 14, c: '#d48bff', life: 0.25 }); AU.sfx('dodge');
  };
  WP.deflectPush = function (broke) {
    var p = G.p, d = p.items.deflector, n = G.near(p.x, p.y, 70), i, e, a; if (!d) return;
    for (i = 0; i < n; i++) { e = G.tmp[i]; a = Math.atan2(e.y - p.y, e.x - p.x); e.kx += Math.cos(a) * 280 * (1 - e.kbr); e.ky += Math.sin(a) * 280 * (1 - e.kbr); }
    if (broke && d.lv >= 5) G.explode(p.x, p.y, 130 + (d.lv >= 10 ? 60 : 0), 36 * d.pw, { src: 'deflector', kb: 320, type: 'energy', col: '#48a8ff' });
  };
  WP.reactive = function () {
    var p = G.p, it = p.items.plating; if (!it || (p.rxT && G.t < p.rxT)) return; p.rxT = G.t + 1.5;
    G.explode(p.x, p.y, 80 + 4 * it.lv, 24 * it.pw, { src: 'plating', kb: 300, type: 'phys', col: '#c0c8d8' });
  };
  WP.aegisReflect = function () { var it = G.p.items.aegis; return it && it.lv >= 5; };
  WP.scrapCheck = function () {
    var p = G.p; if (p.scrap < 30) return; p.scrap -= 30; CS.MN.healAll();
    if (G.cls === 'gunner' && (p.extra.raise || 0) < 6 && p.items.vanguard) { p.extra.raise = (p.extra.raise || 0) + 1; fx.num(p.x, p.y - 24, 'SQUAD RAISED', '#ffb347', 1); CS.MN.fillAll(); AU.sfx('pick'); }
  };

  /* ---------------- weapon behaviours ---------------- */
  var UP = WP.U = {};
  /* where shots leave the hero: gun barrel / staff tip, not the body centre */
  WP.mz = function () { var p = G.p, f = p.face, c = G.cls; return c === 'gunner' ? { x: p.x - f * 18, y: p.y - 21 } : c === 'priest' ? { x: p.x - f * 19, y: p.y - 29 } : { x: p.x + f * 6, y: p.y - 10 }; };
  function target(r) { var p = G.p; return G.nearest(p.x, p.y, r); }
  function muzzle(x, y, c) { CS.V.muzzle(x, y, Math.random() * 3, c || '#fff3b0', 20); }

  UP.slug = function (it, dt) {
    var p = G.p; it.cd -= dt; if (it.cd > 0) return; var tg = target(340); if (!tg) { it.cd = 0.08; return; }
    var k = it.pw, lv = it.lv, over = G.cls === 'gunner' ? SV.classRank('gunner', 'overbore') : 0, dmg = 18 * sc(it) * (1 + 0.08 * over), pierce = (lv >= 3 ? 1 : 0) + (lv >= 7 ? 1 : 0) + Math.floor(over / 3);
    it.cd = cd(it, 1.0, 0.07); var mz = WP.mz(), ang = Math.atan2(tg.y - mz.y, tg.x - mz.x), i, n;
    if (lv >= 10) {
      n = 3 + pp(it); AU.sfx('laser');
      for (i = 0; i < n; i++) { var a = ang + (i - (n - 1) / 2) * 0.24, x2 = mz.x + Math.cos(a) * 560, y2 = mz.y + Math.sin(a) * 560; G.seg(mz.x, mz.y, x2, y2, 5, dmg * 2.3, { src: 'slug', kb: 260, type: 'energy' }); fx.v('line', mz.x, mz.y, { x2: x2, y2: y2, c: '#ffd35a', w: 3, life: 0.22 }); }
      fx.shake(0.3, Math.cos(ang), Math.sin(ang)); muzzle(mz.x + Math.cos(ang) * 6, mz.y + Math.sin(ang) * 6, '#ffd35a'); return;
    }
    n = 1 + pp(it);
    for (i = 0; i < n; i++) G.shot(mz.x, mz.y, ang + (i - (n - 1) / 2) * 0.12, 540, dmg, { src: 'slug', pierce: pierce, kb: 340, bounce: lv >= 5 ? (lv >= 8 ? 2 : 1) : 0, spr: 'shot_slug', life: 0.9 });
    muzzle(mz.x + Math.cos(ang) * 6, mz.y + Math.sin(ang) * 6); AU.sfx('slug'); fx.shake(0.1, -Math.cos(ang), -Math.sin(ang)); p.vx -= Math.cos(ang) * 14; p.vy -= Math.sin(ang) * 14;
  };

  UP.drone = function (it, dt) {
    var p = G.p, lv = it.lv, nd = lv >= 10 ? 2 : 1, i, d, cap = G.cls === 'engineer' ? SV.classRank('engineer', 'capacitor') : 0;
    while (it.dr.length < nd) it.dr.push({ x: p.x, y: p.y, a: it.dr.length * 3.14, cd: 0, burst: 0, bt: 0, hp: 1, mhp: 1, rt: 0, hurt: 0, flash: 0, spawn: 0 });
    var tg = target(250);
    for (i = 0; i < nd; i++) {
      d = it.dr[i]; d.mhp = Math.round(30 * sc(it) * (lv >= 10 ? 1.6 : 1));
      if (d.rt > 0) { d.rt -= dt; if (d.rt <= 0) { d.hp = d.mhp; d.x = p.x; d.y = p.y; d.spawn = 0.5; fx.v('ring', p.x, p.y, { r: 4, r2: 24, c: '#4dffb0', w: 2, life: 0.25 }); AU.sfx('spawn'); } continue; }
      if (!d.init) { d.init = 1; d.hp = d.mhp; d.lm = d.mhp; } else if (d.mhp !== d.lm) { d.hp += d.mhp - d.lm; d.lm = d.mhp; }
      if (d.spawn > 0) d.spawn -= dt; if (d.flash > 0) d.flash--;
      d.hurt -= dt; if (d.hurt <= 0) { var ne = G.nearest(d.x, d.y, 9); if (ne) { d.hp -= Math.max(1, ne.dmg * 0.6); d.hurt = 0.5; d.flash = 3; } }
      if (d.hp <= 0) { d.rt = 3.5; fx.burst(d.x, d.y, 12, '#4dffb0', 120, 0.4, 2); fx.v('flash', d.x, d.y, { r: 12, c: '#fff', life: 0.15 }); AU.sfx('smallboom'); fx.num(d.x, d.y - 10, 'DRONE DOWN', '#ff7a7a', 1); d.burst = 0; continue; }
      d.a += dt * (lv >= 10 ? 1.6 : 2.2); var tx = p.x + Math.cos(d.a) * (lv >= 10 ? 38 : 32), ty = p.y + Math.sin(d.a) * (lv >= 10 ? 38 : 32) - 6;
      d.x += (tx - d.x) * Math.min(1, dt * 10); d.y += (ty - d.y) * Math.min(1, dt * 10);
      var dmg = 6.5 * sc(it);
      if (lv >= 10) { // twin-laser valkyrie: continuous beams
        d.bt -= dt; if (tg && d.bt <= 0) { d.bt = 0.1 / (1 + (it.bon.aspd || 0)) / (1 + 0.04 * cap); var ang = Math.atan2(tg.y - d.y, tg.x - d.x); G.seg(d.x, d.y, d.x + Math.cos(ang) * 270, d.y + Math.sin(ang) * 270, 3, 3.8 * sc(it), { src: 'drone', type: 'energy', quiet: true, kb: 20 }); d.beamT = 0.12; d.ba = ang; if (Math.random() < 0.3) AU.sfx('plasma'); }
        continue;
      }
      d.cd -= dt;
      if (d.burst > 0) { d.bt -= dt; if (d.bt <= 0) { d.bt = 0.08; d.burst--; if (tg && !tg.dead) { var a2 = Math.atan2(tg.y - d.y, tg.x - d.x), br = lv >= 5 ? 2 : 1, b; for (b = 0; b < br; b++) { var off = (b - (br - 1) / 2) * 5; G.shot(d.x - Math.sin(a2) * off, d.y + Math.cos(a2) * off, a2 + (Math.random() - 0.5) * 0.06, 430, dmg, { src: 'drone', spr: 'shot_plasma', life: 0.65, kb: 70, type: 'energy', chain: cap > 0 ? Math.ceil(cap / 3) : 0 }); } AU.sfx('plasma'); } } }
      else if (d.cd <= 0 && tg) { d.cd = cd(it, 1.0, 0.06, 0.4) / (1 + 0.04 * cap); d.burst = 3 + Math.floor(k(it) / 3) + pp(it); d.bt = 0; }
    }
  };
  function k(it) { return it.pw; }

  UP.bolt = function (it, dt) {
    var p = G.p; it.cd -= dt; if (it.cd > 0) return; var n = G.near(p.x, p.y, 300); if (!n) { it.cd = 0.08; return; }
    var list = []; for (var i = 0; i < n; i++) list.push(G.tmp[i]); list.sort(function (a, b) { return (a.x - p.x) * (a.x - p.x) + (a.y - p.y) * (a.y - p.y) - ((b.x - p.x) * (b.x - p.x) + (b.y - p.y) * (b.y - p.y)); });
    it.cd = cd(it, 1.0, 0.07); var lv = it.lv, arcs = lv >= 5 ? 3 : 1, jumps = 2 + Math.floor(lv / 3) + (it.bon.chain || 0) + (G.cls === 'priest' ? SV.classRank('priest', 'conduit') : 0), dmg = 22 * sc(it), a;
    for (var q = 0; q < Math.min(arcs, list.length); q++) {
      var e = list[q]; a = Math.atan2(e.y - p.y, e.x - p.x);
      var mz = WP.mz(); fx.v('line', mz.x, mz.y, { x2: e.x, y2: e.y, c: '#ffe44d', w: lv >= 5 ? 3 : 2, life: 0.18 }); fx.v('flash', mz.x, mz.y, { r: 10, c: '#fff6a0', life: 0.1 }); fx.v('flash', e.x, e.y, { r: 9, c: '#fff6a0', life: 0.12 });
      G.hit(e, dmg, { src: 'bolt', type: 'holy', purge: true, kb: 70, dx: Math.cos(a), dy: Math.sin(a), noChain: true });
      G.chain(e, dmg * 0.85, jumps, 115, { src: 'bolt', type: 'holy', purge: true, noChain: true, col: q ? '#27e6ff' : '#ffe44d' });
    }
    AU.sfx('bolt'); fx.shake(0.06);
    if (lv >= 10) { it.n++; if (it.n % 2 === 0) { var t = list[0]; G.zone('judg', t.x, t.y, { r: 44, life: 1.1, dps: dmg * 2.4, src: 'bolt' }); AU.sfx('beam'); fx.shake(0.3); } }
  };

  function cluster(x, y) { // helper: centre of a nearby enemy cluster
    var n = G.near(x, y, 60), sx = 0, sy = 0, i; if (!n) return { x: x, y: y }; for (i = 0; i < n; i++) { sx += G.tmp[i].x; sy += G.tmp[i].y; } return { x: sx / n, y: sy / n };
  }
  UP.grenade = function (it, dt) {
    var p = G.p, i, s, ar = it.sh; it.cd -= dt;
    for (i = ar.length - 1; i >= 0; i--) { s = ar[i]; s.t += dt; if (s.t >= s.dur) { WP.land(it, s); ar.splice(i, 1); } }
    if (it.cd > 0) return; var tg = target(380); if (!tg) { it.cd = 0.1; return; }
    it.cd = cd(it, 2.6, 0.06, 1.0); var lv = it.lv, n = lv >= 10 ? 6 : 1 + Math.floor(lv / 4) + pp(it), c = cluster(tg.x, tg.y), ang = Math.atan2(c.y - p.y, c.x - p.x), dist = Math.hypot(c.x - p.x, c.y - p.y);
    for (i = 0; i < n; i++) {
      var tx, ty; if (lv >= 10) { var dd = Math.min(420, dist + 60) * (0.25 + 0.75 * i / (n - 1)); tx = p.x + Math.cos(ang) * dd; ty = p.y + Math.sin(ang) * dd; } else { tx = c.x + (i ? U.rr(-34, 34) : 0); ty = c.y + (i ? U.rr(-34, 34) : 0); }
      ar.push({ x0: WP.mz().x, y0: WP.mz().y, x: tx, y: ty, t: -i * 0.09, dur: 0.6 + (lv >= 10 ? i * 0.06 : 0), dmg: 40 * sc(it, 0.32), r: 56 * (1 + 0.06 * (it.pw - 1)) });
    }
    AU.sfx('slug'); muzzle(WP.mz().x, WP.mz().y, '#ff9a3c');
  };
  WP.land = function (it, s) {
    var lv = it.lv; G.explode(s.x, s.y, s.r, s.dmg, { src: 'grenade', col: '#ff9a3c' });
    if (lv >= 5 && lv < 10) for (var i = 0; i < 4; i++) { var a = i * 1.571 + 0.7, bx = s.x + Math.cos(a) * 26, by = s.y + Math.sin(a) * 26; G.explode(bx, by, 28, s.dmg * 0.45, { src: 'grenade', col: '#ffd35a', quiet: i > 0 }); fx.v('line', s.x, s.y, { x2: bx, y2: by, c: '#ffd35a', w: 1, life: 0.12 }); }
    if (lv >= 10) G.zone('napalm', s.x, s.y, { r: s.r * 0.7, life: 3, dps: s.dmg * 0.35, src: 'grenade', c: '#ff6a1a' });
  };

  UP.tesla = function (it, dt) {
    var p = G.p; it.cd -= dt;
    if (it.q.length) { it.q[0] -= dt; if (it.q[0] <= 0) { it.q.shift(); discharge(it); } }
    if (it.cd > 0) return; var tg = target(270); if (!tg) { it.cd = 0.1; return; }
    it.cd = cd(it, 2.0, 0.06, 0.7); discharge(it); if (it.lv >= 10) it.q.push(0.28);
  };
  function discharge(it) {
    var p = G.p, tg = target(280); if (!tg) return; var jumps = Math.min(12, 4 + Math.floor(it.pw * 0.9) + (it.bon.chain || 0)), dmg = 16 * sc(it); if (it.lv >= 10) jumps = 12;
    var mz = WP.mz(); fx.v('line', mz.x, mz.y, { x2: tg.x, y2: tg.y, c: '#27e6ff', w: 3, life: 0.2 }); var a = Math.atan2(tg.y - p.y, tg.x - p.x);
    G.hit(tg, dmg, { src: 'tesla', type: 'tesla', kb: 50, dx: Math.cos(a), dy: Math.sin(a), noChain: true }); if (it.lv >= 5 && !tg.dead) tg.stun = 0.6;
    G.chain(tg, dmg, jumps - 1, 105, { src: 'tesla', type: 'tesla', noChain: true, stun: it.lv >= 5 ? 0.6 : 0, col: '#7df3ff' }); AU.sfx('zap'); fx.shake(0.08);
  }

  UP.nova = function (it, dt) {
    var p = G.p, lv = it.lv; it.cd -= dt;
    for (var i = it.q.length - 1; i >= 0; i--) { it.q[i].t -= dt; if (it.q[i].t <= 0) { ring(it, it.q[i].s); it.q.splice(i, 1); } }
    if (it.cd > 0) return; if (!G.nearest(p.x, p.y, 200)) { it.cd = 0.15; return; }
    it.cd = lv >= 10 ? cd(it, 2.2, 0.0, 1.2) : cd(it, 4.0, 0.06, 1.3); ring(it, 1);
    if (lv >= 5) it.q.push({ t: 0.35, s: 1.25 }); if (lv >= 10) it.q.push({ t: 0.7, s: 1.5 });
  };
  function ring(it, s) { var p = G.p; G.zone('nova', p.x, p.y, { r: 8, spd: 230, max2: (105 + 9 * it.pw) * s, dmg: 30 * sc(it) * (s > 1 ? 0.8 : 1), id: G.novaId++, src: 'nova' }); AU.sfx('nova'); fx.shake(0.15); }

  UP.orbital = function (it, dt) {
    var p = G.p; it.cd -= dt; if (it.cd > 0) return;
    var best = null, bs = -1, a = G.en.a, i, e, n = G.near(p.x, p.y, 420);
    for (i = 0; i < n; i++) { e = G.tmp[i]; var s = (e.boss ? 100 : e.elite ? 60 : (e.type === 'golem' || e.type === 'lich') ? 30 : 5) + Math.random() * 8; if (s > bs) { bs = s; best = e; } }
    if (!best) { it.cd = 0.15; return; }
    it.cd = cd(it, 4.5, 0.06, 1.8); var lv = it.lv, cnt = lv >= 10 ? 8 : lv >= 5 ? 3 : 1, r = 34 + 3 * it.pw, dmg = 90 * sc(it, 0.35);
    for (i = 0; i < cnt; i++) { var ox = i ? U.rr(-90, 90) : 0, oy = i ? U.rr(-70, 70) : 0; G.warn(best.x + ox, best.y + oy, r, 0.8 + i * (lv >= 10 ? 0.14 : 0.2), dmg, { fr: true, beam: true, c: '#ff4fd8', src: 'orbital', burn: lv >= 10 ? dmg * 0.1 : 0 }); }
    AU.sfx('telegraph');
  };

  UP.nanite = function (it, dt) {
    var p = G.p; it.cd -= dt; if (it.cd > 0) return; var tg = target(300); if (!tg) { it.cd = 0.15; return; }
    it.cd = cd(it, 5.0, 0.05, 2.2); var lv = it.lv, n = 1 + Math.floor(lv / 3) + pp(it), i;
    for (i = 0; i < n; i++) { var t = i ? (G.nearest(p.x + U.rr(-200, 200), p.y + U.rr(-150, 150), 120) || tg) : tg; G.zone('cloud', t.x, t.y, { r: (46 + 4 * it.pw) * (lv >= 10 ? 1.8 : 1), life: 4 + 0.3 * it.pw, dps: 11 * sc(it), follow: lv >= 5, src: 'nanite' }); }
    AU.sfx('spawn');
  };

  UP.saw = function (it, dt) {
    var p = G.p, lv = it.lv, i; it.cd -= dt;
    it.t2 = (it.t2 || 0) + dt; var phase = it.t2 % 9, ringOn = lv >= 10 && phase < 5; it.orb.length = ringOn ? it.orb.length : 0;
    if (ringOn) { // orbiting blade ring: 5s on / 4s off
      it.t += dt * 3.2; var no = 4;
      for (i = 0; i < no; i++) { var a = it.t + i * 6.283 / no, bx = p.x + Math.cos(a) * 54, by = p.y + Math.sin(a) * 54, n = G.nearList(bx, by, 9), j; for (j = 0; j < n.length; j++) { var e = n[j]; if (e.dead || e.sawCd > 0) continue; e.sawCd = 0.25; G.hit(e, 14 * sc(it), { src: 'saw', type: 'phys', kb: 140, dx: Math.cos(a), dy: Math.sin(a) }); } it.orb[i] = { x: bx, y: by }; }
    }
    if (it.cd > 0) return; var tg = target(380); if (!tg) { it.cd = 0.15; return; }
    it.cd = cd(it, 3.2, 0.05, 1.4); var n2 = 1 + Math.floor(it.pw / 2.2) + pp(it) + (lv >= 5 ? 1 : 0); if (lv >= 10) n2 *= 2;
    var base = Math.atan2(tg.y - p.y, tg.x - p.x);
    for (i = 0; i < n2; i++) G.shot(p.x, p.y, base + (i - (n2 - 1) / 2) * (6.283 / Math.max(3, n2)) * 0.6 + U.rr(-0.1, 0.1), 235, 14 * sc(it), { src: 'saw', saw: true, spr: 'shot_saw', spin: 14, pierce: 99, life: lv >= 10 ? 4.5 : Math.min(3.5, 2.6 + 0.1 * it.pw), split: lv >= 5 ? (lv >= 8 ? 2 : 1) : 0, kb: 100, r: 9, type: 'phys' });
    AU.sfx('saw');
  };


  /* ---------------- class-exclusive upgrades ---------------- */
  UP.turret = function (it, dt) {
    var p = G.p, i, t, lv = it.lv, ar = it.sh; it.cd -= dt;
    for (i = ar.length - 1; i >= 0; i--) {
      t = ar[i]; t.life -= dt; if (t.life <= 0) { fx.burst(t.x, t.y, 8, '#ffb347', 100, 0.3, 2); ar.splice(i, 1); continue; }
      t.cd -= dt; t.rk -= dt; var tg = G.nearest(t.x, t.y, 230);
      if (tg) {
        t.ang = Math.atan2(tg.y - t.y, tg.x - t.x);
        if (t.cd <= 0) { t.cd = (lv >= 5 ? 0.28 : 0.45) / (1 + (it.bon.aspd || 0)) * p.balMul; var b = lv >= 5 ? 2 : 1, q; for (q = 0; q < b; q++) G.shot(t.x, t.y - 4, t.ang + (Math.random() - 0.5) * 0.12, 440, 6 * sc(it) * (lv >= 10 ? 1.6 : 1), { src: 'turret', spr: 'shot_slug', life: 0.55, kb: 60 }); AU.sfx('plasma'); }
        if (lv >= 10 && t.rk <= 0) { t.rk = 2.2; G.explode(tg.x, tg.y, 40, 26 * sc(it), { src: 'turret', col: '#ff9a3c' }); fx.v('line', t.x, t.y, { x2: tg.x, y2: tg.y, c: '#ffd35a', w: 2, life: 0.12 }); }
      }
    }
    if (it.cd > 0) return; if (!G.nearest(p.x, p.y, 260)) { it.cd = 0.3; return; }
    it.cd = cd(it, 7, 0.05, 3); var n = 1 + Math.floor(lv / 3) + pp(it), cap = 3 + Math.floor(lv / 2), k;
    for (k = 0; k < n && ar.length < cap; k++) { var a = Math.random() * 6.283; ar.push({ x: p.x + Math.cos(a) * 34, y: p.y + Math.sin(a) * 28, life: 9 + 0.4 * it.pw, cd: 0.3, rk: 1, ang: 0 }); fx.v('ring', p.x + Math.cos(a) * 34, p.y + Math.sin(a) * 28, { r: 3, r2: 16, c: '#ffb347', w: 2, life: 0.2 }); }
    AU.sfx('spawn');
  };
  UP.stim = function (it, dt) {
    var p = G.p, mx = 10 + 2 * it.lv; it.stk = it.stk || 0; it.dec = (it.dec || 0) - dt;
    if (it.dec <= 0 && it.stk > 0) { it.stk = Math.max(0, it.stk - 1); it.dec = 0.35; }
    var fr = it.stk / mx; p.cdMul = 1 - Math.min(0.5, 0.3 * fr * (1 + 0.06 * it.lv)); it.fr = fr; p.spdMul = (p.spdMul || 1) + 0.18 * fr;
  };
  WP.onKill = function () {
    var it = G.p.items.stim; if (!it) return; var mx = 10 + 2 * it.lv; it.stk = Math.min(mx, (it.stk || 0) + 1); it.dec = 2.6 + 0.1 * it.lv;
    if (it.lv >= 5 && it.stk >= mx / 2 && Math.random() < 0.5) G.heal(1, true);
  };
  UP.gunship = function (it, dt) {
    var p = G.p, lv = it.lv, i; it.cd -= dt;
    for (i = it.q.length - 1; i >= 0; i--) { var e = it.q[i]; e.t -= dt; if (e.t <= 0) { G.explode(e.x, e.y, lv >= 10 ? 44 : 32 + it.pw, 24 * sc(it, 0.32), { src: 'gunship', col: '#ffb347', kb: 160 }); it.q.splice(i, 1); } }
    if (it.cd > 0) return; var tg = G.nearest(p.x, p.y, 380); if (!tg) { it.cd = 0.2; return; }
    it.cd = cd(it, 10, 0.05, 4.5); var lines = lv >= 10 ? 3 : lv >= 5 ? 2 : 1, ang = Math.atan2(tg.y - p.y, tg.x - p.x) + (Math.random() < 0.5 ? 1.5708 : 0), ca = Math.cos(ang), sa = Math.sin(ang), l, j;
    for (l = 0; l < lines; l++) { var off = (l - (lines - 1) / 2) * 52, sx = tg.x - ca * 260 - sa * off, sy = tg.y - sa * 260 + ca * off; fx.v('line', sx, sy, { x2: sx + ca * 520, y2: sy + sa * 520, c: '#ffd35a', w: 2, life: 0.9 }); for (j = 0; j < 9; j++) it.q.push({ t: 0.35 + j * 0.09, x: sx + ca * j * 60, y: sy + sa * j * 60 }); }
    AU.sfx('laser');
  };
  function bayLife(d, it, dt, mhp) {
    if (!d.init) { d.init = 1; d.hp = d.mhp = mhp; d.rt = 0; d.hurt = 0; d.cd = Math.random(); }
    if (d.rt > 0) { d.rt -= dt; if (d.rt <= 0) { d.hp = d.mhp; d.x = G.p.x; d.y = G.p.y; d.sp = 0.5; AU.sfx('spawn'); } return false; }
    if (d.mhp !== mhp) { d.hp += mhp - d.mhp; d.mhp = mhp; }
    if (d.sp > 0) d.sp -= dt; if (d.flash > 0) d.flash--;
    d.hurt -= dt; if (d.hurt <= 0) { var ne = G.nearest(d.x, d.y, 9); if (ne) { d.hp -= Math.max(1, ne.dmg * 0.6); d.hurt = 0.5; d.flash = 3; } }
    if (d.hp <= 0) { d.rt = 3.5; fx.burst(d.x, d.y, 10, '#4dffb0', 110, 0.35, 2); AU.sfx('smallboom'); return false; }
    return true;
  }
  UP.dronebay = function (it, dt) {
    var p = G.p, lv = it.lv, n = Math.min(10, 1 + Math.floor(lv / 2) + pp(it) + (lv >= 10 ? 3 : 0)), i, d, cap = G.cls === 'engineer' ? SV.classRank('engineer', 'capacitor') : 0;
    while (it.dr.length < n) it.dr.push({ x: p.x, y: p.y, a: it.dr.length * 6.283 / n, init: 0 });
    for (i = 0; i < it.dr.length; i++) {
      d = it.dr[i]; if (!bayLife(d, it, dt, Math.round(22 * sc(it)))) continue;
      d.a += dt * 1.5; var R = 54 + (i % 2) * 14, tx = p.x + Math.cos(d.a + i) * R, ty = p.y + Math.sin(d.a + i) * R * 0.8; d.x += (tx - d.x) * Math.min(1, dt * 8); d.y += (ty - d.y) * Math.min(1, dt * 8);
      d.cd -= dt; if (d.cd <= 0) { var tg = G.nearest(d.x, d.y, 240); if (tg) { d.cd = (lv >= 10 ? 0.45 : 1.2) * Math.pow(0.95, it.pw - 1) / (1 + (it.bon.aspd || 0)) / (1 + 0.04 * cap); G.shot(d.x, d.y, Math.atan2(tg.y - d.y, tg.x - d.x), 420, 5 * sc(it), { src: 'dronebay', spr: 'shot_plasma', life: 0.6, kb: 50, type: 'energy', chain: lv >= 5 ? 1 + (lv >= 8 ? 1 : 0) : 0 }); AU.sfx('plasma'); } else d.cd = 0.15; }
    }
  };
  UP.emp = function (it, dt) {
    var p = G.p, lv = it.lv; it.cd -= dt; if (it.cd > 0) return; if (G.near(p.x, p.y, 120) < 2) { it.cd = 0.25; return; }
    it.cd = cd(it, 8, 0.06, 3.5); var R = (100 + 8 * it.pw) * (lv >= 10 ? 1.6 : 1), dmg = 20 * sc(it);
    G.explode(p.x, p.y, R, dmg, { src: 'emp', stun: lv >= 10 ? 3 : 1.2, kb: 120, type: 'tesla', col: '#7df3ff' });
    if (lv >= 5) { var l = G.nearList(p.x, p.y, R), k; for (k = 0; k < Math.min(3, l.length); k++) if (!l[k].dead) G.chain(l[k], dmg * 0.6, 3, 100, { src: 'emp', type: 'tesla', noChain: true, col: '#7df3ff' }); }
    fx.shake(0.25);
  };
  UP.fabricator = function (it, dt) {
    var p = G.p, lv = it.lv; it.cd -= dt; if (it.cd > 0) return; if (!G.nearest(p.x, p.y, 300)) { it.cd = 0.3; return; }
    it.cd = cd(it, 12, 0.05, 5); var n = 3 + Math.floor(lv * 0.7) + pp(it), i; if (lv >= 10) n += 4;
    for (i = 0; i < n && G.mn.n < 60; i++) { var a = i / n * 6.283, m = CS.MN.spawn('detonator', p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, it); if (m) { m.item = 'fabricator'; m.life = 8; m.spr = 'mn_detonator_' + G.cls; } }
    AU.sfx('summon'); fx.v('ring', p.x, p.y, { r: 6, r2: 40, c: '#ff7a3c', w: 2, life: 0.3 });
  };
  UP.sanctum = function (it, dt) {
    var p = G.p, lv = it.lv; it.t -= dt; if (it.t > 0) return; it.t = 0.4;
    var R = (70 + 6 * it.pw) * (lv >= 10 ? 1.6 : 1), l = G.nearList(p.x, p.y, R), i, e; it.r = R;
    for (i = 0; i < l.length; i++) { e = l[i]; if (e.dead) continue; if (lv >= 5) e.slow = 0.6; if (lv >= 10) { e.burn = 1.5; e.burnD = 6 * it.pw; } G.hit(e, 6 * sc(it), { src: 'sanctum', type: 'holy', purge: true, noCrit: true, quiet: true }); }
    it.pulse = 1; for (i = 0; i < l.length; i++) { e = l[i]; if (e.dead) continue; for (var q = 0; q < 2; q++) fx.spark(e.x + U.rr(-5, 5), e.y + U.rr(-3, 5), U.rr(-15, 15), U.rr(-60, -25), 0.55, q ? '#ffe9a0' : '#ff8a2a', 2, -20); }
    it.sf = (it.sf || 0) - 0.4; if (l.length && it.sf <= 0) { it.sf = 1.6; AU.sfx('nova', 0.35); }
    if (l.length && p.hp < p.maxHp) G.heal((0.25 + 0.08 * it.pw) * Math.min(3, l.length), true);
  };
  UP.litany = function (it, dt) {
    var p = G.p, lv = it.lv; it.cd -= dt; if (it.cd > 0) return; if (!G.nearest(p.x, p.y, 320)) { it.cd = 0.5; return; }
    it.cd = cd(it, 17, 0.04, 8); p.litanyT = 6; p.litanyMul = 1.25 + 0.03 * it.pw; CS.MN.healAll(); if (lv >= 10) p.inv = Math.max(p.inv, 2);
    fx.v('ring', p.x, p.y, { r: 8, r2: 110, c: '#c9a3ff', w: 3, life: 0.5 }); fx.num(p.x, p.y - 26, 'BATTLE LITANY', '#c9a3ff', 1); AU.sfx('levelup');
  };
  UP.wings = function (it, dt) {
    var p = G.p, lv = it.lv; it.cd -= dt; if (it.cd > 0) return; var tg = G.nearest(p.x, p.y, 300); if (!tg) { it.cd = 0.15; return; }
    it.cd = cd(it, 2.2, 0.06, 0.9); var n = 3 + Math.floor(lv * 0.8) + pp(it); if (lv >= 10) n *= 2; var base = Math.atan2(tg.y - p.y, tg.x - p.x), i;
    for (i = 0; i < n; i++) G.shot(WP.mz().x, WP.mz().y, base + (i - (n - 1) / 2) * 0.22 + U.rr(-0.08, 0.08), 290, 8 * sc(it), { src: 'wings', spr: 'shot_bolt', home: 7, life: 1.6, kb: 40, type: 'holy', purge: true, pierce: lv >= 5 ? (lv >= 10 ? 2 : 1) : 0 });
    AU.sfx('bolt');
  };

  /* minion items: spawning handled by MN; fusion has its own timer */
  ['vanguard', 'sniper', 'aegis', 'detonator'].forEach(function (id) { UP[id] = function (it, dt) { /* maintained in MN.update */ }; });
  WP.fusionInfo = function (it) { var g = 0, i; for (i = 0; i < G.mn.n; i++) if (G.mn.a[i].giant) g++; return { interval: Math.max(6, 14 - 0.8 * it.pw) * (it.lv >= 10 ? 0.6 : 1), giants: g, maxG: 1 + Math.floor(it.lv / 3) + (it.bon.proj || 0) }; };
  UP.fusion = function (it, dt) { var fi = WP.fusionInfo(it), interval = fi.interval; if (fi.giants >= fi.maxG) { it.t = 0; return; } it.t += dt; if (it.t >= interval) { if (CS.MN.fuse(it)) it.t = 0; else it.t = interval - 1.5; } };
  ['plating', 'regen', 'deflector', 'thrusters', 'graviton'].forEach(function (id) { UP[id] = function () { }; });
  WP.update = function (it, dt) { UP[it.id](it, dt); };

  /* consecrated ground: ground glow, rotating rune rings, flickering holy flames, pulse on every burn tick */
  WP.drawSanctum = function (ctx, cx, cy, it, p) {
    var sr = it.r, X = Math.round(p.x - cx), Y = Math.round(p.y - cy), T = G.t, i, a, n, big = it.lv >= 10;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var gg = ctx.createRadialGradient(X, Y, sr * 0.1, X, Y, sr); gg.addColorStop(0, 'rgba(255,210,90,0.20)'); gg.addColorStop(0.75, 'rgba(255,120,30,0.13)'); gg.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(X, Y, sr, 0, 6.283); ctx.fill();
    ctx.strokeStyle = 'rgba(255,214,120,0.75)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X, Y, sr * 0.95, 0, 6.283); ctx.stroke();
    ctx.beginPath(); ctx.arc(X, Y, sr * 0.62, 0, 6.283); ctx.globalAlpha = 0.4; ctx.stroke(); ctx.globalAlpha = 1;
    // rune marks on two counter-rotating rings
    for (i = 0; i < 24; i++) { a = i * 0.2618 + T * 0.5; ctx.fillStyle = i % 3 ? 'rgba(255,200,90,.8)' : 'rgba(255,255,255,.95)'; var rr = i % 3 ? 2 : 4; ctx.fillRect(Math.round(X + Math.cos(a) * sr * 0.95 - 1), Math.round(Y + Math.sin(a) * sr * 0.95 - rr / 2), 2, rr); }
    for (i = 0; i < 12; i++) { a = -i * 0.5236 - T * 0.8; ctx.fillStyle = 'rgba(255,160,60,.7)'; ctx.fillRect(Math.round(X + Math.cos(a) * sr * 0.62 - 1), Math.round(Y + Math.sin(a) * sr * 0.62 - 1), 3, 3); }
    // holy flames licking up around the rim and scattered inside
    n = big ? 26 : 18;
    for (i = 0; i < n; i++) { a = i * 6.283 / n + Math.sin(T * 0.7) * 0.1; flame(ctx, X + Math.cos(a) * sr * 0.88, Y + Math.sin(a) * sr * 0.88 + 3, (big ? 20 : 15) + 8 * Math.sin(T * 9 + i * 1.7) + 3 * Math.sin(T * 17 + i), i); }
    var inner = big ? 14 : 9;
    for (i = 0; i < inner; i++) { a = i * 2.399 + Math.sin(T * 0.3 + i) * 0.3; var d = sr * (0.2 + 0.55 * ((i * 0.618) % 1)); flame(ctx, X + Math.cos(a + T * 0.15) * d, Y + Math.sin(a + T * 0.15) * d, 6 + 4 * Math.sin(T * 8 + i * 2.3), i + 30); }
    if (it.pulse > 0) { ctx.globalAlpha = it.pulse; ctx.strokeStyle = '#fff3c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, sr * (1 - it.pulse * 0.9), 0, 6.283); ctx.stroke(); ctx.fillStyle = 'rgba(255,170,50,' + (it.pulse * 0.18) + ')'; ctx.beginPath(); ctx.arc(X, Y, sr, 0, 6.283); ctx.fill(); it.pulse -= 0.06; }
    ctx.restore();
  };
  function flame(ctx, x, y, h, k) {
    x = Math.round(x); y = Math.round(y); h = Math.max(3, h); var w = Math.max(2, h * 0.32);
    ctx.fillStyle = 'rgba(255,90,20,.55)'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.4, y - h * 0.6, x + Math.sin(G.t * 11 + k) * 1.5, y - h); ctx.quadraticCurveTo(x + w * 0.4, y - h * 0.6, x + w, y); ctx.fill();
    ctx.fillStyle = 'rgba(255,200,70,.75)'; ctx.beginPath(); ctx.moveTo(x - w * 0.55, y); ctx.quadraticCurveTo(x - w * 0.2, y - h * 0.5, x, y - h * 0.72); ctx.quadraticCurveTo(x + w * 0.2, y - h * 0.5, x + w * 0.55, y); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,230,.8)'; ctx.fillRect(x - 1, y - Math.round(h * 0.3), 2, Math.round(h * 0.3));
  }

  /* ---------------- drawing of weapon-owned visuals ---------------- */
  WP.drawPlayerFx = function (ctx, cx, cy) {
    var p = G.p, it = p.items, A = CS.art, i, d;
    if (it.drone) { it.drone.dr.forEach(function (d, i) { if (d.rt > 0) return; A.draw(ctx, 'drone', d.x - cx, d.y - cy + Math.sin(G.t * 8 + i) * 1.5, false, d.flash > 0, 1, 0, d.spawn > 0 ? 0.5 : 1); if (d.hp < d.mhp) { ctx.fillStyle = '#000'; ctx.fillRect(Math.round(d.x - cx - 8), Math.round(d.y - cy - 12), 16, 2); ctx.fillStyle = '#4dffb0'; ctx.fillRect(Math.round(d.x - cx - 8), Math.round(d.y - cy - 12), Math.max(1, Math.round(16 * d.hp / d.mhp)), 2); } if (d.beamT > 0) { d.beamT -= 0.016; ctx.strokeStyle = '#4dffb0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x - cx, d.y - cy); ctx.lineTo(d.x - cx + Math.cos(d.ba) * 270, d.y - cy + Math.sin(d.ba) * 270); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke(); } }); }
    if (it.grenade) it.grenade.sh.forEach(function (s) { if (s.t < 0) return; var u = s.t / s.dur, x = s.x0 + (s.x - s.x0) * u, y = s.y0 + (s.y - s.y0) * u - Math.sin(u * 3.1416) * 60; ctx.globalCompositeOperation = 'lighter'; CS.V.add(ctx, 'fx_orb', '#ff9a3c', x - cx, y - cy, 26, 26, 0, 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; if (Math.random() < 0.6) fx.spark(x, y, U.rr(-20, 20), U.rr(-20, 20), 0.4, '#ffb347', 2, -10); ctx.fillStyle = '#ff9a3c'; ctx.fillRect(Math.round(x - cx - 2), Math.round(y - cy - 2), 5, 5); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x - cx - 1), Math.round(y - cy - 1), 2, 2); ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff9a3c'; ctx.beginPath(); ctx.arc(s.x - cx, s.y - cy, s.r, 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; });
    if (it.turret) it.turret.sh.forEach(function (t) { var X = Math.round(t.x - cx), Y = Math.round(t.y - cy); ctx.fillStyle = '#2a2f40'; ctx.fillRect(X - 5, Y - 3, 10, 7); ctx.fillStyle = '#ffb347'; ctx.fillRect(X - 4, Y - 2, 8, 2); ctx.strokeStyle = '#c0c8d8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y - 3); ctx.lineTo(X + Math.cos(t.ang) * 9, Y - 3 + Math.sin(t.ang) * 9); ctx.stroke(); if (t.life < 2) { ctx.fillStyle = '#f55'; ctx.fillRect(X - 1, Y - 8, 2, 2); } });
    if (it.dronebay) it.dronebay.dr.forEach(function (d, i) { if (d.rt > 0 || !d.init) return; A.draw(ctx, 'drone', d.x - cx, d.y - cy + Math.sin(G.t * 8 + i) * 1.5, false, d.flash > 0, 0.8, 0, d.sp > 0 ? 0.5 : 1); if (d.hp < d.mhp) { ctx.fillStyle = '#000'; ctx.fillRect(Math.round(d.x - cx - 7), Math.round(d.y - cy - 10), 14, 2); ctx.fillStyle = '#4dffb0'; ctx.fillRect(Math.round(d.x - cx - 7), Math.round(d.y - cy - 10), Math.max(1, Math.round(14 * d.hp / d.mhp)), 2); } });
    if (it.sanctum && it.sanctum.r) WP.drawSanctum(ctx, cx, cy, it.sanctum, p);
    if (p.litanyT > 0) { ctx.strokeStyle = '#c9a3ff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(p.x - cx, p.y - cy, 15 + Math.sin(G.t * 10) * 2, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }

    if (it.saw && it.saw.lv >= 10) it.saw.orb.forEach(function (o) { A.draw(ctx, 'shot_saw', o.x - cx, o.y - cy, false, false, 1.3, G.t * 14); });
  };
})();
