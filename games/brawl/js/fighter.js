/* The shared fighter: poses, the move table and the state machine used by the player and every enemy.
   Space: x along the street, y = depth (where the feet are on the ground), z = height above the ground. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, A = G.audio, FX = G.fx, D = U.DEG;

  /* ---------- poses (degrees; 0 = straight down, + = toward the facing side) ---------- */
  const B = { lean: 0, hipH: null, rot: 0, head: 0, sx: 1, aF: [20, 30], aB: [10, 30], lF: [0, 0], lB: [0, 0], wRot: 0, wSwA: 0 };
  const P = (o) => Object.assign({}, B, o);
  const POSES = {
    idle: P({ lean: 6, aF: [42, 100], aB: [22, 108], lF: [16, 20], lB: [-20, 16] }),
    hurt: P({ lean: -16, head: -14, aF: [-28, 50], aB: [-44, 70], lF: [8, 26], lB: [-24, 22] }),
    jump: P({ lean: 4, aF: [100, 50], aB: [-40, 70], lF: [60, 95], lB: [-14, 45], hipH: 16 }),
    fall2: P({ lean: 2, aF: [60, 40], aB: [-20, 60], lF: [28, 34], lB: [-24, 30] }),
    jk: P({ lean: -22, aF: [-55, 50], aB: [-80, 60], lF: [80, 4], lB: [-6, 75], hipH: 14 }),
    spin: P({ lean: 0, aF: [88, 6], aB: [-88, 6], lF: [84, 4], lB: [-84, 4], hipH: 15 }),
    fall: P({ rot: -48, hipH: 17, lean: -6, aF: [-70, 40], aB: [-40, 50], lF: [34, 60], lB: [-14, 50] }),
    lie: P({ rot: -90, hipH: 4.6, lean: 0, aF: [-8, 20], aB: [-24, 24], lF: [10, 16], lB: [-4, 14] }),
    getup: P({ lean: 30, hipH: 11, aF: [40, 40], aB: [18, 50], lF: [62, 102], lB: [-30, 100] }),
    land: P({ lean: 22, hipH: 15, aF: [40, 50], aB: [10, 50], lF: [40, 70], lB: [-30, 66] }),
    grab: P({ lean: 12, aF: [78, 32], aB: [68, 44], lF: [28, 26], lB: [-30, 16] }),
    grabbed: P({ lean: -10, head: -12, aF: [-20, 60], aB: [-40, 60], lF: [6, 22], lB: [-18, 20] }),
    knee: P({ lean: 8, aF: [78, 32], aB: [68, 44], lF: [84, 106], lB: [-4, 6] }),
    throw: P({ lean: -14, aF: [160, 10], aB: [150, 14], lF: [22, 20], lB: [-22, 18] }),
    pickup: P({ lean: 34, hipH: 13, aF: [30, 10], aB: [10, 10], lF: [48, 82], lB: [-26, 66] }),
    p1w: P({ lean: -2, aF: [18, 130], aB: [24, 108], lF: [16, 20], lB: [-20, 16] }),
    p1s: P({ lean: 16, aF: [88, 4], aB: [26, 118], lF: [34, 30], lB: [-28, 12] }),
    p2w: P({ lean: 2, aF: [40, 100], aB: [8, 128], lF: [18, 20], lB: [-20, 16] }),
    p2s: P({ lean: 12, aF: [34, 114], aB: [88, 4], lF: [18, 22], lB: [-36, 14] }),
    p3w: P({ lean: -12, aF: [6, 140], aB: [34, 100], lF: [8, 30], lB: [-32, 22] }),
    p3s: P({ lean: 26, aF: [104, 2], aB: [-40, 70], lF: [50, 36], lB: [-40, 8] }),
    kickw: P({ lean: -6, aF: [56, 64], aB: [-24, 64], lF: [58, 104], lB: [-12, 14] }),
    kicks: P({ lean: -16, aF: [60, 50], aB: [-46, 60], lF: [88, 2], lB: [-12, 14] }),
    k2w: P({ lean: -2, aF: [50, 70], aB: [-10, 70], lF: [16, 20], lB: [40, 104] }),
    k2s: P({ lean: -12, aF: [58, 50], aB: [-40, 60], lF: [14, 20], lB: [86, 2] }),
    batI: P({ lean: 8, aF: [30, 128], aB: [22, 106], lF: [16, 20], lB: [-20, 16], wRot: 8 }),
    batw: P({ lean: -10, aF: [150, 30], aB: [128, 34], lF: [12, 24], lB: [-26, 18], wRot: 40 }),
    bats: P({ lean: 24, aF: [72, 14], aB: [60, 40], lF: [44, 30], lB: [-34, 10], wRot: 6 }),
    knI: P({ lean: 8, aF: [46, 76], aB: [20, 110], lF: [16, 20], lB: [-20, 16], wRot: -32 }),
    knw: P({ lean: -4, aF: [20, 100], aB: [26, 104], lF: [16, 20], lB: [-20, 16], wRot: -20 }),
    kns: P({ lean: 18, aF: [90, 6], aB: [24, 118], lF: [36, 30], lB: [-30, 12], wRot: -6 }),
    nuI: P({ lean: 8, aF: [44, 96], aB: [22, 108], lF: [16, 20], lB: [-20, 16], wSwA: 0 }),
    nu1w: P({ lean: -4, aF: [30, 150], aB: [26, 108], lF: [16, 22], lB: [-22, 16], wSwA: 250 }),
    nu1s: P({ lean: 16, aF: [86, 10], aB: [28, 118], lF: [34, 30], lB: [-28, 12], wSwA: 92 }),
    nu2w: P({ lean: 4, aF: [96, 70], aB: [40, 108], lF: [20, 24], lB: [-26, 16], wSwA: 20 }),
    nu2s: P({ lean: 20, aF: [60, 24], aB: [36, 118], lF: [40, 30], lB: [-34, 12], wSwA: 270 }),
    slamS: P({ lean: 34, hipH: 12, aF: [40, 10], aB: [34, 14], lF: [40, 60], lB: [-30, 56] }),
    cheer: P({ lean: -6, aF: [168, 12], aB: [158, 16], lF: [14, 22], lB: [-16, 20] }),
    carry: P({ lean: -4, aF: [168, 10], aB: [160, 14], lF: [16, 20], lB: [-20, 16] }),
    hopw: P({ lean: 10, hipH: 14, aF: [60, 80], aB: [30, 90], lF: [50, 100], lB: [-30, 80] }),
  };
  const ext = (l) => 10.5 * Math.cos(l[0] * D) + 10.5 * Math.cos((l[0] - l[1]) * D);
  const lerpA = (a, b, t) => [U.lerp(a[0], b[0], t), U.lerp(a[1], b[1], t)];
  function lerpPose(a, b, t) {
    const o = {};
    for (const k in B) {
      const va = a[k], vb = b[k];
      if (Array.isArray(B[k])) o[k] = lerpA(va, vb, t);
      else if (k === 'hipH') o[k] = va == null && vb == null ? null : U.lerp(va == null ? Math.max(ext(a.lF), ext(a.lB)) : va, vb == null ? Math.max(ext(b.lF), ext(b.lB)) : vb, t);
      else o[k] = U.lerp(va, vb, t);
    }
    return o;
  }
  function walkPose(ph, base) {
    const s = Math.sin(ph), c = Math.cos(ph), o = Object.assign({}, base);
    o.lean = base.lean + 2;
    o.lF = [30 * s, 8 + 40 * Math.max(0, c)];
    o.lB = [-30 * s, 8 + 40 * Math.max(0, -c)];
    o.aF = [base.aF[0] - 8 * s, base.aF[1]];
    o.aB = [base.aB[0] + 8 * s, base.aB[1]];
    return o;
  }

  /* ---------- moves ---------- */
  const MOVES = {
    punch1: { s: 0.04, a: 0.07, r: 0.11, dmg: 2, stun: 0.3, reach: 25, pw: 'p1w', ps: 'p1s', lunge: 38, next: 'punch2', snd: 'punch', hs: 0.04, sh: 1.2 },
    punch2: { s: 0.04, a: 0.07, r: 0.11, dmg: 2, stun: 0.3, reach: 25, pw: 'p2w', ps: 'p2s', lunge: 38, next: 'punch3', snd: 'punch', hs: 0.04, sh: 1.2 },
    punch3: { s: 0.06, a: 0.08, r: 0.22, dmg: 3, kd: true, kdv: 78, reach: 29, pw: 'p3w', ps: 'p3s', lunge: 64, snd: 'punchH', hs: 0.085, sh: 3.5 },
    kick1: { s: 0.06, a: 0.08, r: 0.14, dmg: 3, stun: 0.3, reach: 31, pw: 'kickw', ps: 'kicks', lunge: 26, next: 'kick2', nextBtn: 'kick', snd: 'kick', hs: 0.05, sh: 1.6 },
    kick2: { s: 0.05, a: 0.08, r: 0.14, dmg: 3, stun: 0.3, reach: 31, pw: 'k2w', ps: 'k2s', lunge: 26, next: 'kick3', nextBtn: 'kick', snd: 'kick', hs: 0.05, sh: 1.6 },
    kick3: { s: 0.05, a: 0.08, r: 0.14, dmg: 3, stun: 0.3, reach: 31, pw: 'kickw', ps: 'kicks', lunge: 26, next: 'kick', nextBtn: 'kick', snd: 'kick', hs: 0.05, sh: 1.6 },
    kick: { s: 0.07, a: 0.1, r: 0.22, dmg: 5, kd: true, kdv: 90, reach: 33, pw: 'kickw', ps: 'kicks', lunge: 28, snd: 'kick', hs: 0.085, sh: 3.5 },
    bat: { s: 0.10, a: 0.11, r: 0.28, dmg: 7, kd: true, kdv: 105, reach: 41, pw: 'batw', ps: 'bats', lunge: 34, snd: 'bat', swing: 'swing', wep: 'bat', hs: 0.11, sh: 5 },
    nun1: { s: 0.05, a: 0.07, r: 0.12, dmg: 3, stun: 0.32, reach: 33, pw: 'nu1w', ps: 'nu1s', lunge: 22, next: 'nun2', snd: 'punch', swing: 'whoosh', wep: 'nunchaku', hs: 0.05, sh: 1.6 },
    nun2: { s: 0.04, a: 0.08, r: 0.16, dmg: 3, kd: true, kdv: 70, reach: 35, pw: 'nu2w', ps: 'nu2s', lunge: 30, snd: 'punchH', swing: 'whoosh', wep: 'nunchaku', hs: 0.07, sh: 2.4 },
    knife: { s: 0.05, a: 0.07, r: 0.13, dmg: 5, stun: 0.4, reach: 26, pw: 'knw', ps: 'kns', lunge: 30, snd: 'stab', swing: 'whoosh', wep: 'knife', hs: 0.06, sh: 1.8 },
    throwW: { s: 0.06, a: 0.02, r: 0.16, dmg: 0, reach: 0, pw: 'p3w', ps: 'p3s', lunge: 0, special: 'throwW' },
    /* enemy versions: slower wind-ups so there is something to read */
    /* enemy combos: a telegraphed opener, then follow-ups that only come if the one before landed; the last hit knocks down (like the player's) */
    ep1: { s: 0.28, a: 0.07, r: 0.12, dmg: 2, stun: 0.34, reach: 25, pw: 'p1w', ps: 'p1s', lunge: 34, next: 'ep2', next2: 'ep3', snd: 'punch', hs: 0.04, sh: 1.2 },
    ep1f: { s: 0.16, a: 0.07, r: 0.1, dmg: 2, stun: 0.34, reach: 25, pw: 'p1w', ps: 'p1s', lunge: 36, next: 'ep2', next2: 'ep3', snd: 'punch', hs: 0.04, sh: 1.2 },
    ep2: { s: 0.1, a: 0.07, r: 0.1, dmg: 2, stun: 0.34, reach: 26, pw: 'p2w', ps: 'p2s', lunge: 34, next: 'ep3', snd: 'punch', hs: 0.04, sh: 1.2 },
    ep3: { s: 0.12, a: 0.08, r: 0.4, dmg: 3, kd: true, kdv: 78, reach: 29, pw: 'p3w', ps: 'p3s', lunge: 56, snd: 'punchH', hs: 0.085, sh: 3.5 },
    ek1: { s: 0.32, a: 0.08, r: 0.12, dmg: 2, stun: 0.34, reach: 31, pw: 'kickw', ps: 'kicks', lunge: 26, next: 'ek2', next2: 'ekH', snd: 'kick', hs: 0.05, sh: 1.6 },
    ek2: { s: 0.1, a: 0.08, r: 0.12, dmg: 2, stun: 0.34, reach: 31, pw: 'k2w', ps: 'k2s', lunge: 26, next: 'ekH', snd: 'kick', hs: 0.05, sh: 1.6 },
    ekH: { s: 0.12, a: 0.1, r: 0.42, dmg: 4, kd: true, kdv: 88, reach: 33, pw: 'kickw', ps: 'kicks', lunge: 28, snd: 'kick', hs: 0.08, sh: 3.5 },
    e_jab: { s: 0.3, a: 0.08, r: 0.38, dmg: 2, stun: 0.32, reach: 25, pw: 'p1w', ps: 'p1s', lunge: 34, snd: 'punch', hs: 0.04, sh: 1.2 },
    e_kick: { s: 0.36, a: 0.1, r: 0.44, dmg: 3, kd: true, kdv: 80, reach: 33, pw: 'kickw', ps: 'kicks', lunge: 24, snd: 'kick', hs: 0.07, sh: 3 },
    e_quick: { s: 0.18, a: 0.07, r: 0.3, dmg: 2, stun: 0.28, reach: 25, pw: 'p2w', ps: 'p2s', lunge: 40, snd: 'punch', hs: 0.04, sh: 1.2 },
    e_hook: { s: 0.5, a: 0.12, r: 0.6, dmg: 6, kd: true, kdv: 100, reach: 38, pw: 'p3w', ps: 'p3s', lunge: 70, snd: 'punchH', hs: 0.1, sh: 5 },
    e_slam: { s: 0.6, a: 0.12, r: 0.7, dmg: 5, kd: true, kdv: 95, reach: 52, both: true, pw: 'throw', ps: 'slamS', lunge: 0, snd: 'thud', fx: 'slam', hs: 0.1, sh: 6 },
    e_charge: { s: 0.42, a: 0.34, r: 0.5, dmg: 5, kd: true, kdv: 100, reach: 30, pw: 'p3w', ps: 'p3s', lunge: 0, drive: 215, snd: 'punchH', swing: 'swing', hs: 0.1, sh: 5 },
    e_spin: { s: 0.4, a: 0.3, r: 0.42, dmg: 4, kd: true, kdv: 90, reach: 30, both: true, spin: true, pw: 'kickw', ps: 'spin', lunge: 0, drive: 70, snd: 'kick', swing: 'swing', hs: 0.08, sh: 3.5 },
    e_bat: { s: 0.4, a: 0.11, r: 0.5, dmg: 6, kd: true, kdv: 95, reach: 41, pw: 'batw', ps: 'bats', lunge: 30, snd: 'bat', swing: 'swing', wep: 'bat', hs: 0.1, sh: 4.5 },
    e_nun: { s: 0.3, a: 0.09, r: 0.4, dmg: 3, stun: 0.32, reach: 33, pw: 'nu1w', ps: 'nu1s', lunge: 24, snd: 'punch', swing: 'whoosh', wep: 'nunchaku', hs: 0.05, sh: 1.8 },
    e_knife: { s: 0.28, a: 0.08, r: 0.42, dmg: 4, stun: 0.38, reach: 26, pw: 'knw', ps: 'kns', lunge: 30, snd: 'stab', swing: 'whoosh', wep: 'knife', hs: 0.06, sh: 1.8 },
    /* air moves (damage windows run for the whole flight) */
    jk: { air: true, dmg: 5, kd: true, kdv: 95, reach: 27, snd: 'kick', hs: 0.085, sh: 4 },
    spin: { air: true, dmg: 4, kd: true, kdv: 85, reach: 29, both: true, snd: 'kick', hs: 0.08, sh: 3.5 },
    e_hop: { air: true, dmg: 3, kd: true, kdv: 80, reach: 26, snd: 'kick', hs: 0.07, sh: 3 },
    e_gknee: { dmg: 1, reach: 20, snd: 'knee', hs: 0.05, sh: 2 },
    knee: { dmg: 3, reach: 20, snd: 'knee', hs: 0.06, sh: 2 },
  };
  const HEAVY = { crate: 1, barrel: 1 };
  const WEAPON = { crate: { uses: 1, mv: 'throwW', emv: 'throwW' }, barrel: { uses: 1, mv: 'throwW', emv: 'throwW' }, bat: { uses: 9, mv: 'bat', emv: 'e_bat' }, nunchaku: { uses: 16, mv: 'nun1', emv: 'e_nun' }, knife: { uses: 8, mv: 'knife', emv: 'e_knife' } };
  const WEAPON_POSE = { crate: 'carry', barrel: 'carry', bat: 'batI', knife: 'knI', nunchaku: 'nuI' };

  const PLAYER = {
    name: 'YOU', team: 'p', speed: 76, hp: C.PLAYER_HP, canGrab: true,
    look: { col: C.BLUE, core: C.BLUE_D, team: 'p', props: ['hair'], scale: 1, line: 2.6, scarf: '#e8b81f', shoe: '#142f86', wrist: '#e8b81f', outfit: { pants: '#142f86' } },
  };

  class Fighter {
    constructor(g, def, x, y) {
      this.g = g; this.def = def; this.team = def.team;
      this.x = x; this.y = y; this.z = 0; this.vx = 0; this.vy = 0; this.vz = 0;
      this.face = def.team === 'p' ? 1 : -1;
      this.maxhp = def.hp; this.hp = def.hp;
      this.look = Object.assign({}, def.look);
      this.state = 'idle'; this.t = 0; this.clock = Math.random() * 6; this.tailV = 0;
      this.move = null; this.hitSet = new Set(); this.connected = false; this.air = null; this.airT = 0;
      this.stun = 0; this.lieT = 0; this.inv = 0; this.flash = 0; this.phase = 0;
      this.weapon = null; this.grab = null; this.grabber = null; this.grabT = 0; this.knees = 0; this.contactT = 0;
      this.dying = false; this.thrownBy = null; this.kdv = 80; this.deadT = 0; this.armorHits = 0; this.armorT = 0;
      this.hurtChain = 0; this.chainT = 0; this.landRec = 0; this.dir = 1; this.pickItem = null; this.id = Fighter.n = (Fighter.n || 0) + 1;
      this.intent = { dx: 0, dy: 0, face: 0, jump: false, punch: false, kick: false, act: null, use(k) { this[k] = false; } };
    }
    get alive() { return this.hp > 0 && this.state !== 'dead'; }
    get busy() { return this.state === 'atk' || this.state === 'jump' || this.state === 'hurt' || this.state === 'fall' || this.state === 'lie' || this.state === 'getup' || this.state === 'grab' || this.state === 'grabbed' || this.state === 'pick' || this.state === 'land' || this.state === 'dead'; }
    get down() { return this.state === 'fall' || this.state === 'lie' || this.state === 'getup' || this.state === 'dead'; }
    to(state) { this.state = state; this.t = 0; }

    /* ---------- actions ---------- */
    startMove(id) {
      const mv = MOVES[id];
      this.move = mv; this.moveId = id; this.hitSet.clear(); this.connected = false; this.to('atk');
      this.vx = this.face * (mv.lunge || 0); this.vy = 0; this.swung = false; this.thrown = false; this.thrownDone = false;
    }
    weaponMove() { const w = WEAPON[this.weapon.type]; return this.team === 'p' ? w.mv : w.emv; }
    startJump() {
      const I = this.intent;
      this.to('jump'); this.vz = 200; this.air = null; this.airT = 0;
      this.vx = I.dx * this.def.speed * 0.9; this.vy = 0;
      if (this.team === 'p') this.vy = I.dy * 26;
      I.use('jump'); A.sfx.jump();
      FX.dust(this.x, this.y, 3);
    }
    startHop() { this.to('jump'); this.vz = 150; this.vx = this.face * 120; this.vy = 0; this.air = 'e_hop'; this.airT = 0; this.hitSet.clear(); this.connected = false; A.sfx.whoosh(); }
    airAttack(kind) {
      this.air = kind; this.airT = 0; this.hitSet.clear(); this.connected = false;
      if (kind === 'jk') { this.vx = this.face * Math.max(Math.abs(this.vx), 70); A.sfx.whoosh(); }
      else { this.vx = this.vx * 0.5; this.vz = Math.max(this.vz, 60); A.sfx.swing(); }
    }
    startGrab(target) {
      this.to('grab'); this.grab = target; this.grabT = 0; this.knees = 0; this.vx = this.vy = 0;
      target.to('grabbed'); target.grabber = this; target.vx = target.vy = 0; target.face = -this.face;
      A.sfx.grab(); FX.freeze(0.03);
    }
    releaseGrab(stun) {
      const t = this.grab;
      if (t && t.state === 'grabbed') { t.grabber = null; t.to('hurt'); t.stun = stun === undefined ? 0.25 : stun; t.vx = this.face * 30; }
      this.grab = null;
      if (this.state === 'grab') this.to('idle');
    }
    doThrow(dir) {
      const t = this.grab;
      if (!t) return;
      this.grab = null; t.grabber = null;
      t.dir = dir; t.thrownBy = this; t.hitSet = new Set();
      t.takeDamage(this.team === 'p' ? 5 : 3, this);
      if (t.hp <= 0) t.dying = true;
      t.to('fall'); t.vx = dir * 150; t.vz = 85; t.z = 6; t.kdv = 0;
      t.x = this.x + dir * 12;
      this.face = dir; this.to('atk'); this.move = MOVES.throwW; this.moveId = 'throwG'; this.t = 0.09; this.hitSet.clear(); this.thrownDone = true;
      A.sfx.throw(); FX.addShake(3); FX.freeze(0.05);
      this.g.scoreFor(this, 100);
    }
    dropWeapon() {
      if (!this.weapon) return;
      this.g.dropItem(this.weapon, this.x + this.face * 6, this.y, this.z + 14, this.face);
      this.weapon = null;
    }
    takeDamage(n, att) {
      if (G.debug.god && this.team === 'p') return;
      this.hp = Math.max(0, this.hp - n);
      this.lastHit = att; this.hitFlashT = 0;
      this.flash = 0.1;
    }
    takeHit(att, mv, g, over) {
      const dmg = (over && over.dmg !== undefined) ? over.dmg : mv.dmg;
      const dirAway = (att.x === this.x) ? att.face : U.sign(this.x - att.x) || att.face;
      const heavy = !!(mv.kd || dmg >= 5);
      /* one hurt-boost on tough guys: they shrug off light hits until they take a few in a row */
      const armored = this.def.armor && !mv.kd && this.state !== 'hurt';
      if (this.grab && this.state === 'grab') this.releaseGrab(0.1);
      if (this.state === 'grabbed' && !mv.kd) { this.takeDamage(dmg, att); }
      else this.takeDamage(dmg, att);
      g.onHit(att, this, mv, dmg, heavy, over);
      if (this.hp <= 0) { this.dying = true; this.knock(dirAway, (mv.kdv || 85) * 1.1, att); return; }
      if (mv.kd) { this.knock(dirAway, mv.kdv || 85, att); return; }
      if (armored) {
        this.armorT = 1.2; this.armorHits++;
        if (this.armorHits >= (this.def.armor)) { this.armorHits = 0; this.stunMe(mv.stun || 0.3, dirAway, att); }
        else { this.x += dirAway * 1.6; }
        return;
      }
      this.stunMe(mv.stun || 0.3, dirAway, att);
    }
    stunMe(t, dirAway, att) {
      if (this.state === 'grabbed') return;
      if (this.move && this.state === 'atk') this.move = null;
      this.dropWeaponIfDown = false;
      this.to('hurt'); this.stun = t * (this.def.stunMul || 1); this.vx = dirAway * 46; this.vy = 0;
      if (att && this.team === 'e') this.face = -dirAway;
      this.hurtChain++; this.chainT = 0.6;
    }
    knock(dirAway, v, att) {
      if (this.grabber) { this.grabber.grab = null; this.grabber.to('idle'); this.grabber = null; }
      this.dropWeapon();
      if (this.team === 'e') this.face = -dirAway;
      this.to('fall'); this.vz = 100 + v * 0.35; this.vx = dirAway * v; this.z = Math.max(this.z, 1); this.vy = 0; this.air = null; this.thrownBy = null;
      this.hurtChain = 0;
      this.g.noteKnock(this);
    }

    /* ---------- per-frame ---------- */
    update(dt, g) {
      this.clock += dt; this.t += dt;
      if (this.inv > 0) this.inv -= dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.chainT > 0) { this.chainT -= dt; if (this.chainT <= 0) this.hurtChain = 0; }
      if (this.armorT > 0) { this.armorT -= dt; if (this.armorT <= 0) this.armorHits = 0; }
      const I = this.intent;
      switch (this.state) {
        case 'idle': case 'walk': this.groundUpdate(dt, g, I); break;
        case 'atk': this.atkUpdate(dt, g, I); break;
        case 'jump': this.jumpUpdate(dt, g, I); break;
        case 'land': if (this.t >= this.landRec || (this.team === 'p' && (I.punch || I.kick || I.jump))) this.to('idle'); this.vx *= 0.8; break;
        case 'hurt': {
          this.x += this.vx * dt; this.vx *= Math.pow(0.02, dt);
          if (this.t >= this.stun) this.to('idle');
          break;
        }
        case 'fall': this.fallUpdate(dt, g); break;
        case 'lie': {
          if (this.dying) { if (this.t > 0.5) { this.to('dead'); FX.stars(this.x, this.y, 10, 4); FX.dust(this.x, this.y, 4, true); } break; }
          if (this.t >= this.lieT) { this.to('getup'); this.inv = 0.7; }
          break;
        }
        case 'getup': if (this.t >= (this.team === 'p' ? 0.24 : 0.32)) this.to('idle'); break;
        case 'dead': this.deadT += dt; break;
        case 'grab': if (this.team === 'p') this.grabUpdate(dt, g, I); else this.grabUpdateE(dt, g); break;
        case 'grabbed': {
          const gr = this.grabber;
          if (!gr || gr.state !== 'grab' && gr.state !== 'atk') { this.grabber = null; this.to('idle'); break; }
          this.x = gr.x + gr.face * 13; this.y = gr.y; this.face = -gr.face;
          /* a grabbed player shakes the enemy off by mashing buttons */
          if (this.team === 'p') {
            if (I.punch || I.kick || I.jump) { I.use('punch'); I.use('kick'); I.use('jump'); this.mash = (this.mash || 0) + 1; this.x += this.face * 1.2; if (this.mash >= 4) { this.mash = 0; gr.releaseGrab(0.4); this.inv = 0.5; A.sfx.snap(); FX.addShake(2); } }
          }
          break;
        }
        case 'pick': {
          if (this.t >= 0.12 && this.pickItem) { g.takeWeapon(this, this.pickItem); this.pickItem = null; }
          if (this.t >= 0.26) this.to('idle');
          break;
        }
      }
      if (this.state !== 'dead') g.clampFighter(this);
    }

    groundUpdate(dt, g, I) {
      const sp = this.def.speed * (this.speedMul || 1) * (this.weapon && HEAVY[this.weapon.type] ? 0.85 : 1);
      /* actions first */
      if (I.act) {
        const a = I.act; I.act = null;
        if (a === 'hop') { this.startHop(); return; }
        if (a === 'grab') {
          const t = g.player;
          if (t && (t.state === 'idle' || t.state === 'walk') && t.z === 0 && Math.abs(t.x - this.x) < 19 && Math.abs(t.y - this.y) < 8) { t.mash = 0; this.startGrab(t); }
          return;
        }
        if (a === 'weapon' && this.weapon) { this.startMove(this.weaponMove()); return; }
        if (MOVES[a]) { this.startMove(a); return; }
      }
      if (I.jump && this.def.canJump !== false) { this.startJump(); return; }
      if (I.punch) {
        const it = g.nearWeapon(this);
        if (!this.weapon && it) { I.use('punch'); this.pickItem = it; it.taken = true; this.to('pick'); this.vx = 0; A.sfx.pickup(); return; }
        I.use('punch');
        if (this.weapon) this.startMove(this.weaponMove()); else this.startMove('punch1');
        return;
      }
      if (I.kick) {
        I.use('kick');
        if (this.weapon) this.startMove('throwW'); else this.startMove('kick1');
        return;
      }
      let dx = I.dx, dy = I.dy;
      if (dx && dy) { dx *= 0.82; dy *= 0.82; }
      this.vx = dx * sp; this.vy = dy * sp * 0.62;
      this.x += this.vx * dt; this.y += this.vy * dt;
      if (I.face) this.face = I.face; else if (dx) this.face = dx > 0 ? 1 : -1;
      const moving = dx !== 0 || dy !== 0;
      if (moving) { this.phase += dt * 11 * (sp / 76) * (I.face && dx && I.face !== U.sign(dx) ? -1 : 1); if (this.state !== 'walk') this.to('walk'); }
      else if (this.state !== 'idle') this.to('idle');
      if (this.def.canGrab) this.tryGrab(dt, g, I, dx);
      this.tailV = U.clamp(-this.vx * this.face * 0.03, -2, 2);
    }

    tryGrab(dt, g, I, dx) {
      let hit = null;
      if (dx && !this.weapon) {
        for (const e of g.enemies) {
          if (!e.alive || e.def.noGrab || e.z > 3) continue;
          if (e.state !== 'idle' && e.state !== 'walk' && e.state !== 'hurt') continue;
          const rel = (e.x - this.x) * this.face;
          if (rel > 0 && rel < 15 && Math.abs(e.y - this.y) < 8) { hit = e; break; }
        }
      }
      if (hit) { this.contactT += dt; if (this.contactT > 0.1) { this.contactT = 0; this.startGrab(hit); } }
      else this.contactT = 0;
    }

    atkUpdate(dt, g, I) {
      const mv = this.move;
      if (!mv) { this.to('idle'); return; }
      this.x += this.vx * dt; this.vx *= Math.pow(0.004, dt);
      if (this.team === 'p') this.t += dt * (C.ATK_SPEED - 1);          /* the player's attacks run a little faster than the table says */
      const t = this.t;
      if (this.thrownDone) { if (t >= 0.3) { this.thrownDone = false; this.to('idle'); } return; }
      if (mv.special === 'throwW') {
        if (t >= mv.s && !this.thrown) { this.thrown = true; if (this.weapon) g.throwWeapon(this); }
        if (t >= mv.s + mv.a + mv.r) { this.thrown = false; this.to('idle'); }
        return;
      }
      if (t >= mv.s && t < mv.s + mv.a) {
        if (mv.drive) this.vx = this.face * mv.drive;
        if (!this.swung) {
          this.swung = true; const s = mv.swing || 'whoosh'; if (A.sfx[s]) A.sfx[s]();
          if (mv.fx === 'slam') { FX.dust(this.x - 18, this.y, 4, true); FX.dust(this.x + 18, this.y, 4, true); FX.addShake(5); FX.ring(this.x, this.y, 8, 56, 0.4); }
        }
        g.hitCheck(this, mv);
      }
      /* chain into the next hit */
      const rec = mv.s + mv.a;
      const nb = mv.nextBtn || 'punch';
      let nxt = mv.next;
      if (this.team === 'e' && mv.next2 && (this.def.comboLen || 2) < 3) nxt = mv.next2;
      if (nxt && t >= rec + mv.r * 0.05 && (this.team === 'p' ? I[nb] : true) && this.connected) {
        if (this.team === 'p') I.use(nb);
        this.swung = false; this.startMove(nxt); return;
      }
      /* player cancels: jump out of any recovery, kick out of a punch that landed, walk away from the tail end */
      if (this.team === 'p' && t >= rec) {
        if (I.jump && this.def.canJump !== false) { this.swung = false; this.startJump(); return; }
        if (I.kick && this.connected && !mv.wep && mv.pw.charAt(0) === 'p' && t >= rec + mv.r * 0.1) { I.use('kick'); this.swung = false; this.startMove('kick1'); return; }
        if ((I.dx || I.dy) && t >= rec + mv.r * 0.55) { this.swung = false; this.to('idle'); return; }
      }
      if (t >= mv.s + mv.a + mv.r) { this.swung = false; this.to('idle'); }
    }

    jumpUpdate(dt, g, I) {
      this.airT += dt;
      this.vz -= C.GRAV * dt; this.z += this.vz * dt; this.x += this.vx * dt; this.y += this.vy * dt;
      if (!this.air) {
        if (I.punch) { I.use('punch'); this.airAttack('spin'); }
        else if (I.kick) { I.use('kick'); this.airAttack('jk'); }
      }
      if (this.air) g.hitCheck(this, MOVES[this.air]);
      if (this.z <= 0 && this.vz <= 0) {
        this.z = 0; this.vz = 0;
        FX.dust(this.x, this.y, 4); A.sfx.land();
        if (this.air) { this.air = null; this.landRec = 0.05; this.to('land'); } else { this.landRec = 0.02; this.to('land'); }
        this.vx = 0; this.vy = 0;
      }
    }

    fallUpdate(dt, g) {
      this.vz -= C.GRAV * dt; this.z += this.vz * dt; this.x += this.vx * dt;
      if (this.thrownBy) g.thrownHit(this);
      if (this.z <= 0 && this.vz < 0) {
        this.z = 0;
        if (this.vz < -90 && !this.bounced && !this.dying) { this.bounced = true; this.vz = -this.vz * 0.28; this.vx *= 0.55; FX.dust(this.x, this.y, 5, true); A.sfx.thud(); FX.addShake(2.5); return; }
        this.bounced = false; this.vz = 0; this.vx = 0; this.thrownBy = null;
        FX.dust(this.x, this.y, 6, true); if (!(this.bounced)) { A.sfx.thud(); FX.addShake(this.dying ? 3.5 : 2.5); }
        this.lieT = this.dying ? 0.6 : (this.team === 'p' ? 0.42 : 0.8 + Math.random() * 0.35);
        this.to('lie');
      }
    }

    /* an enemy that has grabbed the player: three knees, then a throw, unless the player mashes free */
    grabUpdateE(dt, g) {
      const t = this.grab;
      this.grabT += dt;
      if (!t || t.state !== 'grabbed') { this.grab = null; this.kneeing = false; this.to('idle'); return; }
      if (this.kneeT > 0) { this.kneeT -= dt; if (this.kneeT <= 0) this.kneeing = false; }
      const due = 0.55 * (this.knees + 1);
      if (this.grabT >= due && !this.kneeing) {
        this.kneeing = true; this.kneeT = 0.22; this.kneeStart = this.clock; this.knees++;
        t.takeHit(this, MOVES.e_gknee, g);
        if (this.knees >= 3 && t.state === 'grabbed') this.doThrow(this.face);
      }
    }

    grabUpdate(dt, g, I) {
      const t = this.grab;
      this.grabT += dt;
      if (!t || t.state !== 'grabbed') { this.grab = null; this.to('idle'); return; }
      if (this.grabT > 2.6) { this.releaseGrab(0.2); return; }
      if (this.kneeT > 0) { this.kneeT -= dt; if (this.kneeT <= 0) { this.kneeing = false; } }
      if (I.kick || (I.punch && I.dx !== 0 && I.dx !== this.face)) {
        I.use('kick'); I.use('punch');
        this.doThrow(I.dx !== 0 ? I.dx : this.face);
        return;
      }
      if (I.punch && !this.kneeing) {
        I.use('punch');
        this.kneeing = true; this.kneeT = 0.22; this.kneeHitT = 0.06; this.knees++;
        A.sfx.whoosh();
        this.kneeStart = this.clock;
      }
      if (this.kneeing && this.kneeHitT > 0) {
        this.kneeHitT -= dt;
        if (this.kneeHitT <= 0) {
          t.takeHit(this, MOVES.knee, g);
          if (this.knees >= 3 && t.state === 'grabbed') this.doThrow(this.face);
        }
      }
    }

    /* ---------- pose ---------- */
    pose() {
      if (this.poseOverride) return POSES[this.poseOverride];
      let p;
      const ws = this.weapon ? WEAPON_POSE[this.weapon.type] : null;
      const idle = () => POSES[ws || 'idle'];
      switch (this.state) {
        case 'idle': {
          p = Object.assign({}, idle());
          const br = Math.sin(this.clock * 3.2);
          p.lean += br * 0.8; p.aF = [p.aF[0], p.aF[1] + br * 2]; p.lF = [p.lF[0], p.lF[1] + br];
          break;
        }
        case 'walk': p = walkPose(this.phase, idle()); break;
        case 'atk': {
          const mv = this.move;
          if (!mv) { p = POSES.idle; break; }
          if (this.thrownDone) { p = lerpPose(POSES.throw, POSES.idle, U.clamp((this.t - 0.09) / 0.2, 0, 1)); break; }
          if (mv.spin && this.t >= mv.s && this.t < mv.s + mv.a) { p = Object.assign({}, POSES.spin); p.sx = Math.cos((this.t - mv.s) * U.TAU * 3); break; }
          const a = POSES[mv.pw], b = POSES[mv.ps], base = idle(), t = this.t;
          const start = (this.def.team === 'e' && !ws) ? POSES.idle : base;
          if (t < mv.s) p = lerpPose(start, a, U.easeOut(U.clamp(t / mv.s, 0, 1)));
          else if (t < mv.s + mv.a) p = lerpPose(a, b, U.clamp((t - mv.s) / (mv.a * 0.55), 0, 1));
          else p = lerpPose(b, base, U.easeInOut(U.clamp((t - mv.s - mv.a) / mv.r, 0, 1)));
          break;
        }
        case 'jump': {
          if (this.air === 'jk' || this.air === 'e_hop') p = lerpPose(POSES.jump, POSES.jk, U.clamp(this.airT / 0.06, 0, 1));
          else if (this.air === 'spin') { p = Object.assign({}, POSES.spin); p.sx = Math.cos(this.airT * U.TAU * 2.2); }
          else p = this.vz > 40 ? POSES.jump : lerpPose(POSES.jump, POSES.fall2, U.clamp((40 - this.vz) / 160, 0, 1));
          break;
        }
        case 'land': p = lerpPose(POSES.land, POSES.idle, U.clamp(this.t / Math.max(0.05, this.landRec), 0, 1)); break;
        case 'hurt': p = POSES.hurt; break;
        case 'fall': { p = Object.assign({}, POSES.fall); p.rot = -20 - 70 * U.clamp(this.t / 0.5, 0, 1); break; }
        case 'lie': case 'dead': p = POSES.lie; break;
        case 'getup': p = lerpPose(POSES.lie, POSES.getup, U.easeOut(U.clamp(this.t / 0.2, 0, 1))); if (this.t > 0.2) p = lerpPose(POSES.getup, POSES.idle, U.clamp((this.t - 0.2) / 0.12, 0, 1)); break;
        case 'grab': {
          if (this.kneeing) { const u = U.clamp(this.t, 0, 1); p = lerpPose(POSES.grab, POSES.knee, U.clamp((this.clock - this.kneeStart) / 0.07, 0, 1)); if (this.kneeT < 0.08) p = lerpPose(POSES.knee, POSES.grab, 1 - this.kneeT / 0.08); }
          else p = POSES.grab;
          break;
        }
        case 'grabbed': p = POSES.grabbed; break;
        case 'pick': p = lerpPose(POSES.idle, POSES.pickup, U.clamp(this.t / 0.1, 0, 1)); break;
        default: p = POSES.idle;
      }
      if (this.weapon && this.weapon.type === 'nunchaku') {
        p = Object.assign({}, p);
        const idleSway = (this.state === 'idle' || this.state === 'walk') ? Math.sin(this.clock * 5) * 18 : 0;
        const fa = p.aF[0] + p.aF[1] + p.wRot;
        p.wSw = (p.wSwA + idleSway) - fa;
      }
      return p;
    }
  }

  G.fighter = { Fighter, MOVES, WEAPON, HEAVY, PLAYER, POSES, lerpPose };
})((window.SGS = window.SGS || {}));
