/* Enemy roster and AI. Every enemy is a red stick figure with its own prop. Attack tokens keep it to two attackers at a time; the rest circle at a distance. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, F = G.fighter;
  const RED = { col: C.RED, core: C.RED_D, team: 'e' };
  const look = (o) => Object.assign({ scale: 1, line: 2.5 }, RED, o);

  const DEFS = {
    thug: { kind: 'thug', comboLen: 2, name: 'THUG', team: 'e', speed: 36, hp: 14, score: 300, reach: 25, cool: [0.9, 1.7], attacks: [['e_jab', 3], ['e_kick', 1]], grabs: 0.22, food: 0.08, weapons: 0.4, look: look({ props: ['band'], bandCol: '#e8b81f' }) },
    masked: { kind: 'masked', comboLen: 3, name: 'BANDIT', team: 'e', speed: 50, hp: 14, score: 400, reach: 25, cool: [0.6, 1.2], attacks: [['e_quick', 3], ['e_kick', 1]], grabs: 0.15, food: 0.08, weapons: 0.35, look: look({ props: ['mask'] }) },
    ninja: { kind: 'ninja', comboLen: 3, name: 'NINJA', team: 'e', speed: 58, hp: 18, score: 500, reach: 26, cool: [0.8, 1.5], attacks: [['e_kick', 2], ['e_jab', 2]], hop: 0.45, food: 0.1, weapons: 0.2, armType: 'knife', look: look({ props: ['band', 'tails', 'wrap'], bandCol: '#1d1c1a' }) },
    brute: { kind: 'brute', comboLen: 3, name: 'BIG BRUTE', team: 'e', speed: 26, hp: 90, score: 2000, reach: 38, cool: [1.0, 1.8], attacks: [['e_hook', 3], ['e_jab', 1], ['e_slam', 2]], armor: 3, noGrab: true, stunMul: 0.6, food: 1, boss: 'mini', look: look({ scale: 1.3, line: 2.9, props: ['mohawk', 'vest', 'scar'], hawkCol: '#1d1c1a' }) },
    boss: { kind: 'boss', name: 'THE CHIEF', team: 'e', speed: 34, hp: 150, score: 5000, reach: 38, cool: [0.9, 1.7], attacks: [['e_hook', 3], ['e_kick', 2], ['e_slam', 1]], hop: 0.35, rush: { move: 'e_charge', min: 70, max: 190 }, armor: 4, noGrab: true, stunMul: 0.5, food: 0, boss: 'big', look: look({ scale: 1.45, line: 3, props: ['hat', 'scar', 'beard', 'vest'], hatBand: '#c9a227' }) },
  };

  const more = {
    bruiser: { kind: 'bruiser', comboLen: 2, name: 'BRUISER', team: 'e', speed: 30, hp: 34, score: 700, reach: 36, cool: [1.0, 1.8], attacks: [['e_hook', 2], ['e_jab', 1]], armor: 2, grabs: 0.1, stunMul: 0.8, food: 0.12, weapons: 0.3, look: look({ scale: 1.12, line: 2.7, props: ['hardhat', 'belt'] }) },
    boxer: { kind: 'boxer', comboLen: 3, name: 'THE BOXER', team: 'e', speed: 46, hp: 80, score: 2200, reach: 28, cool: [0.4, 0.9], attacks: [['e_quick', 5], ['e_hook', 1], ['e_kick', 1]], armor: 3, noGrab: true, stunMul: 0.6, food: 1, boss: 'mini', look: look({ scale: 1.15, line: 2.8, props: ['gloves', 'band'], bandCol: '#1d1c1a' }) },
    foreman: { kind: 'foreman', name: 'THE FOREMAN', team: 'e', speed: 32, hp: 170, score: 5500, reach: 38, cool: [0.9, 1.6], attacks: [['e_hook', 3], ['e_slam', 2], ['e_kick', 1]], rush: { move: 'e_charge', min: 70, max: 190 }, armor: 4, noGrab: true, stunMul: 0.5, boss: 'big', look: look({ scale: 1.45, line: 3, props: ['hardhat', 'beard', 'vest', 'scar'] }) },
    karateka: { kind: 'karateka', comboLen: 3, name: 'KARATEKA', team: 'e', speed: 56, hp: 22, score: 600, reach: 26, cool: [0.6, 1.2], attacks: [['e_quick', 3], ['e_spin', 1], ['e_kick', 2]], hop: 0.25, food: 0.1, weapons: 0.2, armType: 'nunchaku', look: look({ props: ['band', 'belt'], bandCol: '#f4f1e6' }) },
    shadow: { kind: 'shadow', comboLen: 3, name: 'TWIN SHADOW', team: 'e', speed: 64, hp: 50, score: 1500, reach: 27, cool: [0.5, 1.0], attacks: [['e_kick', 2], ['e_spin', 2], ['e_quick', 2]], hop: 0.6, armor: 2, noGrab: true, stunMul: 0.7, food: 0.5, boss: 'mini', look: look({ scale: 1.08, props: ['band', 'tails', 'wrap'], bandCol: '#1d1c1a' }) },
    sensei: { kind: 'sensei', name: 'THE SENSEI', team: 'e', speed: 48, hp: 160, score: 6000, reach: 30, cool: [0.6, 1.2], attacks: [['e_spin', 3], ['e_kick', 3], ['e_hook', 2]], hop: 0.5, rush: { move: 'e_charge', min: 70, max: 190 }, armor: 3, noGrab: true, stunMul: 0.5, boss: 'big', look: look({ scale: 1.3, line: 2.8, props: ['band', 'beard', 'scar', 'belt'], bandCol: '#f4f1e6' }) },
    sailor: { kind: 'sailor', comboLen: 2, name: 'SAILOR', team: 'e', speed: 38, hp: 26, score: 450, reach: 26, cool: [0.9, 1.6], attacks: [['e_jab', 3], ['e_kick', 1]], grabs: 0.2, food: 0.1, weapons: 0.6, armType: 'bat', look: look({ props: ['cap'] }) },
    skipper: { kind: 'skipper', comboLen: 3, name: 'THE SKIPPER', team: 'e', speed: 28, hp: 100, score: 2500, reach: 38, cool: [1.0, 1.8], attacks: [['e_hook', 2], ['e_slam', 2], ['e_jab', 1]], armor: 3, noGrab: true, stunMul: 0.6, food: 1, boss: 'mini', look: look({ scale: 1.3, line: 2.9, props: ['cap', 'beard', 'vest'] }) },
    harbor: { kind: 'harbor', name: 'HARBORMASTER', team: 'e', speed: 34, hp: 180, score: 6500, reach: 38, cool: [0.8, 1.5], attacks: [['e_hook', 3], ['e_slam', 2], ['e_kick', 1]], hop: 0.3, rush: { move: 'e_charge', min: 70, max: 190 }, armor: 4, noGrab: true, stunMul: 0.5, boss: 'big', look: look({ scale: 1.45, line: 3, props: ['hat', 'beard', 'scar', 'vest'], hatBand: '#2f62e8' }) },
    agent: { kind: 'agent', comboLen: 3, name: 'AGENT', team: 'e', speed: 60, hp: 24, score: 650, reach: 26, cool: [0.5, 1.1], attacks: [['e_quick', 3], ['e_kick', 2]], hop: 0.2, startKnife: 0.55, food: 0.1, look: look({ props: ['bowler', 'shades'] }) },
    bodyguard: { kind: 'bodyguard', comboLen: 3, name: 'BODYGUARD', team: 'e', speed: 30, hp: 120, score: 3000, reach: 38, cool: [0.9, 1.6], attacks: [['e_hook', 3], ['e_slam', 1], ['e_kick', 2]], armor: 3, noGrab: true, stunMul: 0.6, food: 1, boss: 'mini', look: look({ scale: 1.3, line: 2.9, props: ['bowler', 'shades', 'vest'] }) },
    kingpin: { kind: 'kingpin', name: 'THE KINGPIN', team: 'e', speed: 38, hp: 240, score: 9000, reach: 38, cool: [0.7, 1.3], attacks: [['e_hook', 3], ['e_slam', 2], ['e_kick', 2], ['e_spin', 2]], hop: 0.4, rush: { move: 'e_charge', min: 70, max: 190 }, armor: 5, noGrab: true, stunMul: 0.45, summon: ['agent', 'agent'], boss: 'big', look: look({ scale: 1.5, line: 3.1, props: ['crown', 'shades', 'beard', 'scar', 'vest'] }) },
  };
  Object.assign(DEFS, more);

  /* clothes, so each type reads at a glance even before you see its head */
  const BLK = '#1d1c1a', WHT = '#f4f1e6', ORG = '#e86a1f', NAVY = '#25324a', GRY = '#4a4f55';
  const OUTFITS = {
    thug: { top: '#2b2a27' }, masked: { top: '#2b2a27', pants: '#2b2a27' }, ninja: { top: BLK, pants: BLK },
    brute: { pants: GRY }, boss: { top: '#2b2a27', coat: '#2b2a27' },
    bruiser: { top: ORG }, boxer: { pants: WHT }, foreman: { top: ORG, pants: GRY },
    karateka: { top: WHT, pants: WHT }, shadow: { top: BLK, pants: BLK }, sensei: { top: WHT, pants: WHT, coat: WHT },
    sailor: { top: WHT, stripes: NAVY }, skipper: { top: NAVY }, harbor: { top: NAVY, coat: NAVY },
    agent: { top: BLK, pants: BLK, tie: '#c62a1f' }, bodyguard: { top: BLK, pants: BLK, tie: BLK }, kingpin: { top: BLK, pants: BLK, coat: BLK, tie: '#d9b21f' },
  };

  function weightedPick(list) {
    let tot = 0; for (const a of list) tot += a[1];
    let r = Math.random() * tot;
    for (const a of list) { r -= a[1]; if (r <= 0) return a[0]; }
    return list[0][0];
  }

  function release(e) {
    const ai = e.ai;
    if (ai.tok) { ai.tok = false; e.g.tokens.delete(e); }
    ai.attacking = false;
  }

  function create(g, kind, x, y) {
    const def = DEFS[kind], e = new F.Fighter(g, def, x, y);
    e.hp = e.maxhp = def.hp;
    e.ai = { side: Math.random() < 0.5 ? -1 : 1, tok: false, tokT: 0, cd: U.rand(0.3, 1.3), attacking: false, yoff: U.rand(-16, 16), wantsWeapon: Math.random() < (def.weapons || 0), ringR: 62 + Math.random() * 22, retarget: 0 };
    e.kind = kind;
    if (OUTFITS[kind]) e.look.outfit = OUTFITS[kind];
    if (def.startKnife && Math.random() < def.startKnife) e.weapon = { type: 'knife', uses: 6 };
    return e;
  }

  function reachOf(e) {
    if (e.weapon) { if (F.HEAVY[e.weapon.type]) return 110; const m = F.MOVES[F.WEAPON[e.weapon.type].emv]; return m.reach; }
    return e.def.reach;
  }

  function think(e, g, dt) {
    const I = e.intent, ai = e.ai, p = g.player;
    I.dx = I.dy = 0; I.face = 0; I.jump = false; I.punch = false; I.kick = false;
    if (e.state !== 'idle' && e.state !== 'walk') {
      if (e.state === 'hurt' || e.down || e.state === 'grabbed') release(e);
      return;
    }
    if (ai.attacking) { release(e); ai.attacking = false; }
    ai.cd -= dt;
    if (e.def.boss && !ai.enraged && e.hp > 0 && e.hp < e.maxhp * 0.5) {
      ai.enraged = true; e.speedMul = 1.3; ai.cdMul = 0.65;
      if (e.def.summon) for (const k of e.def.summon) g.summon(k);
      G.audio.sfx.warn(); G.fx.addShake(5); G.fx.text(e.x, e.y - 74 * (e.look.scale || 1), 'ENRAGED!', '#c62a1f', 10);
    }
    const onScreen = e.x > g.camX - 4 && e.x < g.camX + C.W + 4;
    if (!p || p.state === 'dead' || p.hp <= 0) { release(e); return; }
    const dxp = p.x - e.x, dyp = p.y - e.y, adx = Math.abs(dxp), ady = Math.abs(dyp);
    I.face = U.sign(dxp) || e.face;
    if (!ai.inited) { ai.inited = true; ai.side = U.sign(e.x - p.x) || ai.side; ai.retarget = U.rand(1, 2.2); }
    /* low on health, some run away for a few seconds */
    if (!ai.fled && !e.def.boss && e.hp <= e.maxhp * 0.3) { ai.fled = true; if (Math.random() < 0.6) ai.flee = 2.6; }
    if (ai.flee > 0) { ai.flee -= dt; release(e); I.dx = -U.sign(dxp) || 1; I.dy = 0; if (ai.flee <= 0) ai.cd = Math.max(ai.cd, 0.8); return; }
    const pDown = p.down || p.inv > 0.9 || p.state === 'dead';
    const reach = reachOf(e);

    /* going for a weapon on the floor */
    if (ai.wantsWeapon && !e.weapon && !ai.tok) {
      const it = g.nearestWeapon(e.x, e.y, 130);
      if (it) {
        const wx = it.x - e.x, wy = it.y - e.y;
        if (Math.abs(wx) < 7 && Math.abs(wy) < 5) { I.punch = true; }
        else { I.dx = Math.abs(wx) > 3 ? U.sign(wx) : 0; I.dy = Math.abs(wy) > 2 ? U.sign(wy) : 0; }
        return;
      }
    }
    /* token handling */
    if (ai.tok) { ai.tokT -= dt; if (ai.tokT <= 0 || pDown) { release(e); ai.cd = Math.max(ai.cd, 0.5); } }
    else if (!pDown && onScreen && ai.cd <= 0 && adx < 170 && g.tokenFree(e)) { ai.tok = true; ai.tokT = 3.2; g.tokens.add(e); }

    /* spread out: if two or more mates crowd my side and the other side is empty, go around */
    ai.retarget -= dt;
    if (ai.retarget <= 0 && !ai.tok) {
      ai.retarget = U.rand(1.5, 2.8);
      let same = 0, other = 0;
      for (const m of g.enemies) if (m !== e && m.hp > 0 && m.state !== 'dead') { if (U.sign(m.x - p.x) === ai.side) same++; else other++; }
      if (same >= 1 && other === 0) ai.side = -ai.side;
    }
    const side = ai.side;
    let gx, gy;
    if (ai.tok) { gx = p.x + side * reach * 0.8; gy = p.y; }
    else if (pDown) { gx = p.x + side * 90; gy = p.y + ai.yoff; }
    else { gx = p.x + side * ai.ringR; gy = p.y + ai.yoff; }
    const ddx = gx - e.x, ddy = gy - e.y;
    const tolX = ai.tok ? 3 : 8;
    I.dx = Math.abs(ddx) > tolX ? U.sign(ddx) : 0;
    I.dy = Math.abs(ddy) > 2.5 ? U.sign(ddy) : 0;
    /* a fighter that is too close and has no token backs off a little */
    if (!ai.tok && e.entered && adx < ai.ringR - 14) I.dx = -U.sign(dxp) || I.dx;

    if (ai.tok && ai.cd <= 0) {
      if (e.weapon && e.weapon.type === 'knife' && ady < 7 && adx > 90 && adx < 190 && Math.random() < 0.03) { I.act = 'throwW'; ai.attacking = true; ai.cd = U.rand(e.def.cool[0], e.def.cool[1]); return; }
      if (e.def.grabs && adx <= 17 && ady < 6 && (p.state === 'idle' || p.state === 'walk') && p.z === 0 && Math.random() < e.def.grabs * 0.1) { I.act = 'grab'; ai.attacking = true; ai.cd = U.rand(e.def.cool[0], e.def.cool[1]); I.dx = I.dy = 0; return; }
      if (e.def.rush && adx > e.def.rush.min && adx < e.def.rush.max && ady < 9 && Math.random() < 0.025 + dt * 0.5) { I.act = e.def.rush.move; ai.attacking = true; ai.cd = U.rand(e.def.cool[0], e.def.cool[1]) * (ai.cdMul || 1); return; }
      if (e.def.hop && adx > 55 && adx < 140 && ady < 14 && Math.random() < 0.02 + dt * 0.6 * e.def.hop && !e.weapon) { I.act = 'hop'; ai.attacking = true; ai.cd = U.rand(e.def.cool[0], e.def.cool[1]); return; }
      if (adx <= reach && ady < 7 && U.sign(dxp) === e.face * 1 || (adx <= reach && ady < 7)) {
        if (e.weapon && Math.random() < 0.8) I.act = 'weapon';
        else {
          let a = weightedPick(e.def.attacks);
          if (e.def.boss !== 'big') { if (a === 'e_jab') a = 'ep1'; else if (a === 'e_quick') a = 'ep1f'; else if (a === 'e_kick') a = 'ek1'; }
          I.act = a;
        }
        ai.attacking = true;
        ai.cd = U.rand(e.def.cool[0], e.def.cool[1]) * (ai.cdMul || 1);
        I.dx = I.dy = 0;
      }
    }
  }

  G.enemies = { DEFS, create, think, release };
})((window.SGS = window.SGS || {}));
