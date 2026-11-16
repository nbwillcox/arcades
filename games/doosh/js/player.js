// Stick Doosh - player.js (core): the active dude. Broforce feel: fast run, variable jump, coyote/buffer, wall-climb,
// wall-jump, ladders, swimming, drop-through, melee, specials + boss supers, power-ups, hearts/armor, swap-on-death.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';
  const PICK2GUN = { S: 'spread', M: 'mg', D: 'shotgun', R: 'rocket', F: 'flame', L: 'laser' };
  let uid = 1;
  function sfx(n, o) { if (S.Audio && S.Audio.sfx) S.Audio.sfx(n, o); }
  function word(t, x, y, o) { if (S.Comic) S.Comic.word(t, x, y, o); }
  function stats() { return (S.Game && S.Game.stats) || {}; }
  // ---------------- aim: 360-degree aiming ----------------
  const PI = Math.PI, HALF_PI = Math.PI / 2, UP_CONE = 35 * Math.PI / 180, ASSIST_R = 420;
  function angDiff(a, b) { let d = a - b; while (d > PI) d -= U.TAU; while (d < -PI) d += U.TAU; return d; }
  // aim assist: the nearest hostile inside the cone pulls the aim toward it (cone = half angle in radians); big deliberate changes are untouched
  function assistPull(px, py, ang, cone) {
    const G = S.Game, list = G.hostiles('player');
    let best = 0, bd2 = ASSIST_R * ASSIST_R + 1, bestAbs = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || (e.kind !== 'enemy' && e.kind !== 'boss')) continue;
      const dx = e.x - px, dy = (e.y - (e.h || 20) * 0.5) - py;
      if (dx > ASSIST_R || dx < -ASSIST_R || dy > ASSIST_R || dy < -ASSIST_R) continue;
      const d2 = dx * dx + dy * dy;
      if (d2 > bd2 || d2 < 400) continue;
      const diff = angDiff(Math.atan2(dy, dx), ang);
      if (Math.abs(diff) > cone) continue;
      bd2 = d2; best = diff; bestAbs = Math.abs(diff);
    }
    if (bd2 > ASSIST_R * ASSIST_R) return 0;
    return best * (cone > 0.3 ? 0.8 : 0.55) * (1 - 0.4 * bestAbs / cone);
  }

  const Player = S.Player = {
    // member = team entry {id, dead, weapon, lvl, rapid}
    make(member, x, y) {
      const dd = S.Dudes[member.id] || S.Dudes.sgt;
      const st = stats(), G = S.Game;
      const maxHp = C.BASE_HP + (st.maxHp || 0) + ((G && G.difficulty.hpBonus) || 0);
      const p = Object.assign(Object.create(Player.proto), {
        uid: uid++, kind: 'player', team: 'player', member, dude: member.id, def: dd, look: dd.look,
        x, y, w: C.PLAYER_W, h: C.PLAYER_H, vx: 0, vy: 0, facing: 1, aim: 'fwd', aimAng: 0, aimRaw: 0, aimDir: { x: 1, y: 0 }, aimMode: 'keys', aimIdle: 9, crossPop: 0, hp: maxHp, maxHp, armor: st.armor || 0, maxArmor: st.armor || 0,
        baseGun: S.Save && S.Save.data.cheats.pew ? 'dual' : dd.gun, weapon: member.weapon || null, lvl: member.lvl || 1,
        rapid: !!member.rapid, rateMul: st.rateMul || 1, dmgMul: st.dmgMul || 1, crit: st.crit || 0, ricochet: st.ricochet || 0,
        frostRounds: !!st.frostRounds, burnRounds: !!st.burnRounds, dragonShells: !!st.dragonShells, blastMul: st.blastMul || 1,
        specials: C.BASE_SPECIALS + (st.specials || 0), superAmmo: Math.min(C.SUPER_AMMO + (st.superAmmo || 0), C.SUPER_AMMO + (st.superAmmo || 0)),
        selected: 0, cd: 0, inv: 2.2, barrier: 0, coyote: 0, jumpBuf: 0, jumped: false, airJumps: 0, climbing: false, wallT: 0,
        meleeT: -1, meleeHit: false, hurtT: 0, flash: 0, anim: 0, t: 0, recoil: 0, muzzleFlash: 0, windX: 0, dash: 0, secondWind: st.secondWind || 0,
        vaultT: 0, dead: false, hidden: false, stepUp: true, st: {}, dropT: 0, landV: 0, slam: false, charge: 0, regenAcc: 0, firing: false,
        pose: 'idle', face: null, shotsFired: 0,
      });
      if (member.startBuff) { p.applyPickup(member.startBuff, true); member.startBuff = null; }
      return p;
    },
    proto: {
      get gun() { return (S.Save && S.Save.data.cheats.pew && !this.weapon) ? 'dual' : (this.weapon || this.baseGun); },
      speedMul() { return (this.def.speed || 1) * (stats().speedMul || 1) * (this.inLiquid ? 0.72 : 1) * (this.slow ? this.slow : 1); },
      heal(n) {
        if (this.dead) return;
        this.hp = Math.min(this.maxHp, this.hp + n);
        if (S.FX) S.FX.confetti(this.x, this.y - 20, 6);
        word('+' + n, this.x, this.y - 44, { size: 18, color: '#ff6b8a' });
      },
      applyPickup(id, quiet) {
        const G = S.Game;
        if (PICK2GUN[id]) {
          const g = PICK2GUN[id];
          if (this.gun === g && !this.mega) { this.lvl = 2; this.mega = true; word('MEGA ' + S.Weapons[g].name.split(' ')[0] + '!', this.x, this.y - 58, { size: 24, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#ffe14d' }); }
          else if (this.weapon !== g) { this.weapon = g; this.lvl = 1; this.mega = false; if (Math.random() < (stats().megaPickups || 0)) { this.lvl = 2; this.mega = true; } }
          this.member.weapon = this.weapon; this.member.lvl = this.lvl;
        } else if (id === 'B') this.barrier = 10;
        else if (id === 'rapid') { this.rapid = true; this.member.rapid = true; }
        else if (id === 'heal') this.heal(1);
        else if (id === 'gold') { if (G) G.addGold(25, this.x, this.y - 20); }
        else if (id === '1UP') { if (G && G.reviveOne) G.reviveOne(); }
        else if (id === 'ammo') this.superAmmo = Math.min(C.SUPER_AMMO + (stats().superAmmo || 0), this.superAmmo + 10);
        if (!quiet && S.Voice) S.Voice.say(this.dude, 'pickup', { follow: this });
      },
      hurt(dmg, src, info) {
        if (this.dead || this.inv > 0 || this.barrier > 0 || (S.Game && S.Game.godMode)) return false;
        info = info || {};
        const G = S.Game;
        dmg = dmg * (G ? G.difficulty.dmgMul : 1) * (1 - (stats().dmgReduce || 0));
        if (this.armor > 0) { const a = Math.min(this.armor, dmg); this.armor -= a; dmg -= a; word('CLANG!', this.x, this.y - 44, { size: 16, color: '#bfefff' }); }
        this.inv = C.INV_TIME; this.hurtT = 0.28; this.flash = 0.12;
        const dirX = info.dirX != null ? info.dirX : (src && src.x != null ? U.sign(this.x - src.x) : -this.facing);
        this.vx = (dirX || -this.facing) * 210; this.vy = Math.min(this.vy, -230); this.onGround = false; this.climbing = false;
        if (S.FX) { S.FX.blood(this.x, this.y - 18, dirX, 6); S.FX.shake(0.35); S.FX.hitstop(0.05); }
        sfx('hurt', { x: this.x });
        if (S.Input) S.Input.vibrate(120, 0.7);
        if (dmg > 0) this.hp -= dmg;
        if (this.hp <= 0) {
          if (this.secondWind > 0) { this.secondWind--; this.hp = 1; word('SECOND WIND!', this.x, this.y - 60, { size: 22, color: '#7dff6b', burst: true, burstColor: '#141018' }); return true; }
          this.die(info); return true;
        }
        word(U.pick(['OOF!', 'OW!', 'YOWCH!', 'MY BUTT!']), this.x, this.y - 46, { size: 20, color: '#ff3b3b' });
        if (S.Voice) S.Voice.say(this.dude, 'hurt', { follow: this });
        return true;
      },
      die(info) {
        if (this.dead) return;
        this.dead = true; this.hidden = true;
        const inherit = Math.random() < (stats().keepPowerup || 0);
        this.member.weapon = inherit ? this.weapon : null; this.member.lvl = inherit ? this.lvl : 1; this.member.rapid = inherit ? this.rapid : false;
        if (S.FX) { S.FX.gibs(this, this.look, (info && info.dirX) || -this.facing); S.FX.shake(0.6); S.FX.hitstop(0.1); }
        word(U.pick(['BLEEEARGH!', 'NOOOOO!', 'WILHELM!', 'DEAD DUDE!']), this.x, this.y - 50, { size: 24, color: '#ff3b3b', burst: true, burstColor: '#ffffff', life: 1 });
        sfx('die', { x: this.x });
        if (S.Voice) S.Voice.say(this.dude, 'die', { x: this.x, y: this.y - 30, force: true });
        if (S.Input) S.Input.vibrate(260, 1);
        if (S.Comic) S.Comic.endStream('gun' + this.uid);
        if (S.Game) S.Game.onPlayerDead(this);
      },
      cycleSelected() {
        const list = Player.selectables(), n = list.length;
        if (n < 2) return;
        this.selected = (this.selected + 1) % n;
        const it = list[this.selected];
        word(it.name + '!', this.x, this.y - 54, { size: 16, color: '#ffffff' });
        sfx('menu_move', { vol: 0.5 });
      },
      useSpecial() {
        const list = Player.selectables(), it = list[this.selected % list.length] || list[0];
        if (!it) return;
        this.syncMuzzle();
        if (it.super) {
          const sp = it.def;
          const cost = sp.ammoCost || 4;
          if (this.superAmmo < cost) { word('NO AMMO', this.x, this.y - 44, { size: 14, color: '#ffffff' }); sfx('empty', { x: this.x }); return; }
          this.superAmmo -= cost;
          sp.use(this);
        } else {
          if (this.specials <= 0) { word('NO SPECIALS', this.x, this.y - 44, { size: 14, color: '#ffffff' }); sfx('empty', { x: this.x }); return; }
          if (it.def.use(this) !== false) this.specials--;
        }
        this.cd = Math.max(this.cd, 0.25);
        if (S.Voice) S.Voice.say(this.dude, 'special', { follow: this, force: true });
      },
      joints() { return S.Rig.joints(this.rigState(), this.x, this.y); },
      rigState() {
        const s = this.st;
        s.look = this.look; s.facing = this.facing; s.t = this.anim; s.aim = this.aim; s.aimAng = this.aimAng; s.gun = this.gun; s.pose = this.pose;
        s.recoil = this.recoil; s.muzzleFlash = this.muzzleFlash; s.flash = this.flash > 0 ? 1 : 0; s.meleeT = this.meleeT >= 0 ? this.meleeT : null;
        s.face = this.pose === 'hurt' ? 'scared' : this.face; s.yell = this.firing; s.bigHead = !!(S.Game && S.Game.bigHeads);
        s.tint = this.hover ? null : null;
        return s;
      },
      update(dt) {
        if (this.dead) return;
        const I = S.Input, G = S.Game, st = stats();
        this.t += dt;
        if (this.inv > 0) this.inv -= dt;
        if (this.flash > 0) this.flash -= dt;
        if (this.hurtT > 0) this.hurtT -= dt;
        if (this.barrier > 0) this.barrier -= dt;
        if (this.cd > 0) this.cd -= dt;
        this.recoil = Math.max(0, this.recoil - dt * 7); this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 14); this.crossPop = Math.max(0, this.crossPop - dt * 9);
        if (this.meleeT >= 0) { this.meleeT += dt; if (this.meleeT > 0.32) this.meleeT = -1; }
        const lockedIn = G && (G.state === 'intro' || G.state === 'chopper' || G.state === 'bossdeath' && false);
        if (st.regen && this.hp < this.maxHp) { this.regenAcc += st.regen * dt; if (this.regenAcc >= 1) { this.regenAcc -= 1; this.hp = Math.min(this.maxHp, this.hp + 1); } }

        // ---------- input ----------
        // chopper state must NOT freeze input: the player has to walk to the ladder (bug fix 2026-11-17)
        const frozen = G && (G.state === 'intro' || G.state === 'clear');
        let ax = frozen ? 0 : I.axisX();
        const up = !frozen && I.down('up'), down = !frozen && I.down('down');
        const jumpPress = !frozen && I.pressed('jump'), jumpHeld = !frozen && I.down('jump');
        const firePress = !frozen && I.pressed('fire'), fireHeld = !frozen && I.down('fire');
        if (this.hurtT > 0) ax = 0;
        this.wantDown = down;
        // ---------- aim ---------- (aim: 360 degrees -> aimAng/aimDir; keeps compat facing + aim 'fwd'|'up'|'down')
        this.aimStep(dt, ax, up, down, frozen);

        // ---------- ladder / climb ----------
        const wasClimb = this.climbing;
        if (this.ladder && !this.climbing && (up || (down && this.ladderBelow && !this.onGround)) && this.hurtT <= 0 && !jumpHeld) { this.climbing = true; this.x = (Math.floor(this.x / C.T) + 0.5) * C.T; this.vx = 0; this.vy = 0; }
        if (this.climbing) {
          if (!this.ladder || this.inLiquid) this.climbing = false;
          else {
            this.noGrav = true;
            const cm = (C.CLIMB * (st.climbMul || 1));
            this.vy = ((down ? 1 : 0) - (up ? 1 : 0)) * cm; this.vx = ax * 90;
            if (this.onGround && down) this.climbing = false;
            if (jumpPress) { this.climbing = false; this.vy = C.JUMP * 0.85 * (st.jumpMul || 1) * (this.def.jump || 1); this.vx = ax * C.RUN; this.coyote = 0; sfx('jump', { x: this.x, vol: 0.5 }); }
          }
        }
        if (!this.climbing) this.noGrav = !!this.hoverActive;

        if (!this.climbing) {
          // ---------- horizontal ----------
          const maxV = C.RUN * this.speedMul();
          if (this.dash > 0) { this.dash -= dt; this.vx = (this.dashDir || this.facing) * C.RUN * 2.3; this.vy = 0; this.noGrav = true; }
          else if (this.hurtT <= 0) {
            const acc = this.onGround ? (this.slippery ? 520 : C.ACCEL_GROUND) : C.ACCEL_AIR;
            if (ax !== 0) this.vx = U.approach(this.vx, ax * maxV, acc * dt * (Math.abs(ax) > 0.5 ? 1 : 0.7));
            else this.vx = U.approach(this.vx, 0, (this.onGround ? (this.slippery ? 160 : C.FRICTION) : 350) * dt);
            if (this.slow && this.onGround && Math.abs(this.vx) > maxV) this.vx = Math.sign(this.vx) * maxV;
          }
          if (this.windX) { this.vx += this.windX * dt; }
          // ---------- jump ----------
          if (this.onGround) { this.coyote = C.COYOTE; this.airJumps = 0; this.jumped = false; if (this.landV > 380) this.land(); this.landV = 0; }
          else { this.coyote -= dt; this.landV = Math.max(this.landV, this.vy); }
          if (jumpPress) this.jumpBuf = C.JUMP_BUF; else this.jumpBuf -= dt;
          const jv = C.JUMP * (st.jumpMul || 1) * (this.def.jump || 1) * (this.zoneT > 0 && this.zoneJump ? this.zoneJump : 1);
          if (this.jumpBuf > 0 && this.hurtT <= 0) {
            if (this.inLiquid) { this.vy = -250; this.jumpBuf = 0; sfx('splash', { x: this.x, vol: 0.3 }); }
            else if (this.onGround && down && this.standingOneWay()) { this.dropT = 0.22; this.y += 2; this.onGround = false; this.jumpBuf = 0; this.coyote = 0; }
            else if (this.coyote > 0) { this.vy = jv; this.jumpBuf = 0; this.coyote = 0; this.jumped = true; this.onGround = false; sfx('jump', { x: this.x, vol: 0.5 }); if (S.FX) S.FX.dust(this.x, this.y, 4); }
            else if (this.wall && !this.onGround) { this.vy = jv * 0.92; this.vx = -this.wall * C.RUN * 0.95; this.facing = -this.wall; this.jumpBuf = 0; this.wallT = 0; this.airJumps = Math.max(0, this.airJumps); sfx('jump', { x: this.x, vol: 0.5 }); if (S.FX) S.FX.dust(this.x + this.wall * 7, this.y - 16, 4); }
            else if (st.stomp && down && !this.onGround) { this.vy = 900; this.slam = true; this.jumpBuf = 0; word('SLAM!', this.x, this.y - 40, { size: 16, color: '#ffffff' }); }
            else if (st.doubleJump && this.airJumps < 1) { this.airJumps++; this.vy = jv * 0.9; this.jumpBuf = 0; word('HUP!', this.x, this.y - 30, { size: 13, color: '#ffffff' }); if (S.FX) S.FX.ring(this.x, this.y, 18, '#ffffff'); sfx('jump', { x: this.x, vol: 0.4, pitch: 1.25 }); }
            else if (st.airDash && !this.onGround && this.dash <= 0 && this.dashCd <= 0) { this.dash = 0.16; this.dashDir = ax !== 0 ? (ax > 0 ? 1 : -1) : this.facing; this.dashCd = 0.8; this.jumpBuf = 0; word('ZOOM', this.x - this.dashDir * 12, this.y - 20, { size: 15, color: '#c77dff' }); }
          }
          this.dashCd = (this.dashCd || 0) - dt;
          if (this.hoverActive !== undefined) this.hoverActive = false;
          if (st.hover && !this.onGround && jumpHeld && this.vy > 0 && !this.inLiquid) { this.vy = Math.min(this.vy, 60); }
          if (st.moonBoots && !this.onGround && jumpHeld && this.vy > 0) this.vy *= 0.97;
          // variable jump height: release early => cut
          if (!jumpHeld && this.vy < jv * 0.38 && this.jumped && !this.inLiquid && this.dash <= 0) this.vy *= 0.5;
          if (this.vy >= 0) this.jumped = this.jumped && !this.onGround ? this.jumped : false;
          // ---------- wall climb ----------
          const pushWall = this.wall !== 0 && ax !== 0 && Math.sign(ax) === this.wall;
          if (pushWall && this.onGround) this.pushT = (this.pushT || 0) + dt; else if (!pushWall) this.pushT = 0;
          if (pushWall && (!this.onGround && !this.climbingLadder || this.pushT > 0.1) && this.hurtT <= 0 && !this.inLiquid) {
            this.wallT += dt;
            this.vy = -C.CLIMB * (st.climbMul || 1) * 1.15; this.vx = this.wall * 20; this.wallClimb = true; this.climbDir = this.wall;
            if (Math.random() < 0.25 && S.FX) S.FX.dust(this.x + this.wall * 6, this.y - 12, 1);
          } else this.wallClimb = false;
          if (!pushWall && this.wallClimbPrev && !this.wall && this.vy < 0) { this.vaultT = 0.14; }
          this.wallClimbPrev = this.wallClimb;
          if (this.vaultT > 0) { this.vaultT -= dt; this.vx = (this.climbDir || this.facing) * C.RUN * 0.9; if (this.vy > 0 && this.vaultT > 0.02) this.vy = -60; }
          if (this.wall && !this.onGround && !pushWall && this.vy > 70 && !this.inLiquid) this.vy = 70; // wall slide
          if (this.slam && this.onGround) { this.slam = false; S.Game.explode(this.x, this.y - 2, 48, 3, 'player', { player: true, owner: this, small: true }); }
        }
        // ---------- drop-through timer ----------
        this.drop = this.dropT > 0; if (this.dropT > 0) this.dropT -= dt;

        // ---------- fire ----------
        this.firing = false;
        const gun = this.gun, wdef = S.Weapons[gun];
        if (G && G.state !== 'bossdeath' && !frozen && wdef && this.hurtT <= 0) {
          let rate = S.Weapons.rateOf(gun, this.lvl, this);
          if (gun === 'mg' && this.def.spinUp) { // minigun spin-up: 40% -> 100% fire rate over 0.8 s of held fire, resets after 0.3 s idle
            if (fireHeld) { this.spinIdle = 0; this.spin = Math.min(1, (this.spin || 0) + dt / 0.8); }
            else { this.spinIdle = (this.spinIdle || 0) + dt; if (this.spinIdle > 0.3) this.spin = 0; }
            rate *= 0.4 + 0.6 * (this.spin || 0);
          } else this.spin = 0;
          const auto = wdef.auto || (S.Save && S.Save.settings.game.autofire);
          if (this.fireT > 0) this.fireT -= dt; else this.fireT = 0;
          const want = (auto && fireHeld) || firePress;
          if (want && this.fireT <= 0 && this.meleeT < 0) {
            this.fireT = 1 / rate;
            this.shoot(gun);
          }
          if (fireHeld && (wdef.auto || wdef.stream)) this.firing = true;
        }
        if (!this.firing && S.Comic) { /* stream ends itself via idle timeout */ }
        // ---------- melee / special / cycle ----------
        if (!frozen && I.pressed('melee') && this.meleeT < 0 && this.hurtT <= 0) { this.meleeT = 0; this.meleeHit = false; sfx('whoosh', { x: this.x }); }
        if (this.meleeT >= 0 && !this.meleeHit && this.meleeT > 0.09) this.doMelee();
        if (!frozen && I.pressed('special') && this.hurtT <= 0 && this.cd <= 0) this.useSpecial();
        if (!frozen && I.pressed('cycle')) this.cycleSelected();

        // ---------- physics ----------
        const wasG = this.onGround;
        S.Phys.move(this, dt);
        this.windX = 0;
        if (this.onGround && !wasG) { if (this.onLandCb) { const cb = this.onLandCb; this.onLandCb = null; cb(this); } }
        if (this.onLandCb && this.vy > 800 && this.onGround) { const cb = this.onLandCb; this.onLandCb = null; cb(this); }
        if (this.wasLiquid !== this.inLiquid) { if (S.FX) S.FX.dust(this.x, this.y - 14, 8); sfx('splash', { x: this.x, vol: 0.5 }); this.wasLiquid = this.inLiquid; }
        // hazards
        if (this.hazard) {
          const lava = this.hazard === S.Terrain.MAT.LAVA;
          if (this.inv <= 0 && !this.barrier) { this.hurt(lava ? 2 : 1, null, { dirX: -this.facing, kind: 'hazard' }); this.vy = -380; }
        }
        if (this.fellOut) { this.hp = 0; this.die({}); return; }
        // ---------- animation / pose ----------
        if (this.hurtT > 0) this.pose = 'hurt';
        else if (this.meleeT >= 0) this.pose = 'melee';
        else if (this.climbing) { this.pose = 'climb'; this.anim += Math.abs(this.vy) / 170 * dt; }
        else if (this.wallClimb) { this.pose = 'wall'; this.anim += dt; }
        else if (this.inLiquid) { this.pose = 'swim'; this.anim += dt; }
        else if (!this.onGround) { this.pose = this.vy < 0 ? 'jump' : 'fall'; this.anim += dt; }
        else if (Math.abs(this.vx) > 12) { this.pose = 'run'; this.anim += dt * U.clamp(Math.abs(this.vx) / C.RUN, 0.45, 1.3); }
        else if (down) { this.pose = 'crouch'; this.anim += dt; }
        else { this.pose = 'idle'; this.anim += dt; }
        this.face = this.hp <= 1 && this.maxHp > 1 ? 'scared' : null;
        // melee-range stomp trail etc skipped
      },
      // aim: turns the active device into aimAng (world radians, 0 = right, up = -PI/2) + unit aimDir, then syncs compat
      // facing (-1/1 from aimDir.x with hysteresis; follows the move direction when there is no explicit aim) and aim ('up'|'down' within 35 deg).
      aimStep(dt, ax, up, down, frozen) {
        const I = S.Input, G = S.Game, cam = G.cam;
        if (frozen) return;
        const mode = I.aimMode();
        this.aimMode = mode;
        const px = this.x, py = this.y - S.Rig.shoulderH(this.look);
        let want = this.aimRaw, rate = 0, explicit = false, snap = false;
        const canTurn = this.hurtT <= 0;
        if (mode === 'mouse') {
          const m = I.mouse;
          if (!m.has) { m.x = px - cam.x + this.facing * 120; m.y = py - cam.y; m.has = true; }
          const dx = cam.x + m.x - px, dy = cam.y + m.y - py;
          if (dx * dx + dy * dy > 64) want = Math.atan2(dy, dx);
          explicit = true;
        } else if (mode === 'stick') {
          const a = I.aimStick;
          if (a.active) { want = Math.atan2(a.y, a.x); explicit = true; this.aimIdle = 0; rate = 22 * (Number(I.cfg('aimSens')) || 1); }
          else {
            this.aimIdle += dt;
            if (ax !== 0 && this.aimIdle > 0.35 && canTurn) { this.facing = ax > 0 ? 1 : -1; want = this.facing > 0 ? 0 : PI; snap = true; } // running with the stick released: face the run
            else explicit = true; // remember the last aim while standing still
          }
        } else { // 'keys': 8-way (up / down + left/right); arrows aim when twin-stick keyboard is on
          let kx = 0, ky = 0;
          if (I.kbTwin && (I.kbAim.x !== 0 || I.kbAim.y !== 0)) { kx = I.kbAim.x; ky = I.kbAim.y; explicit = true; }
          else {
            if (ax !== 0 && canTurn && !this.climbing) this.facing = ax > 0 ? 1 : -1;
            const hx = ax > 0.35 ? 1 : ax < -0.35 ? -1 : 0;
            if (up && (this.climbing || !this.wall || this.onGround)) { ky = -1; kx = hx; }
            else if (down && !this.climbing && !this.inLiquid && (!this.onGround || hx !== 0)) { ky = 1; kx = hx; }
            if (ky === 0) kx = this.facing;
          }
          want = Math.atan2(ky, kx);
          if (kx === 0 && ky === 0) want = this.facing > 0 ? 0 : PI;
          snap = true;
        }
        this.aimRaw = want;
        let tgt = want;
        if (explicit && mode !== 'keys') { const cone = I.assistCone(); if (cone > 0 && (mode !== 'stick' || I.aimStick.active)) tgt = want + assistPull(px, py, want, cone); }
        if (rate <= 0 || snap) this.aimAng = tgt;
        else this.aimAng += angDiff(tgt, this.aimAng) * (1 - Math.exp(-rate * dt));
        if (this.aimAng > PI) this.aimAng -= U.TAU; else if (this.aimAng < -PI) this.aimAng += U.TAU;
        const c = Math.cos(this.aimAng);
        this.aimDir.x = c; this.aimDir.y = Math.sin(this.aimAng);
        if (explicit && canTurn && !this.wallClimb && (c > 0.15 || c < -0.15)) this.facing = c > 0 ? 1 : -1;
        this.aim = Math.abs(angDiff(this.aimAng, -HALF_PI)) < UP_CONE ? 'up' : Math.abs(angDiff(this.aimAng, HALF_PI)) < UP_CONE ? 'down' : 'fwd';
        // camera look-ahead follows the aim (smoothed; game.js reads camLeadX/Y): mouse -> toward the cursor, stick -> along the stick, keys -> facing
        let lx = this.facing * 55, ly = 0;
        if (mode === 'mouse') { const m = I.mouse; lx = U.clamp((cam.x + m.x - px) * 0.28, -110, 110); ly = U.clamp((cam.y + m.y - py) * 0.22, -70, 70); }
        else if (mode === 'stick' && I.aimStick.active) { lx = this.aimDir.x * 95; ly = this.aimDir.y * 55; }
        const kc = Math.min(1, dt * 4);
        this.camLeadX = this.camLeadX == null ? lx : this.camLeadX + (lx - this.camLeadX) * kc;
        this.camLeadY = this.camLeadY == null ? ly : this.camLeadY + (ly - this.camLeadY) * kc;
      },
      land() {
        if (S.FX) S.FX.dust(this.x, this.y, 6);
        sfx('land', { x: this.x, vol: 0.4 });
      },
      standingOneWay() {
        const T = S.Terrain, C2 = C.T;
        const m = T.get(Math.floor(this.x / C2), Math.floor((this.y + 1) / C2));
        return T.PROPS[m].oneway || T.PROPS[m].climb;
      },
      // aim: muzzle follows the rig's gun angle (also fresh for thrown specials); gun hidden (climb / swim) -> from the shoulder
      syncMuzzle() {
        const j = this.joints(), d = this.aimDir;
        if (j.showGun) { this.muzzleX = j.muzzle.x; this.muzzleY = j.muzzle.y; }
        else { this.muzzleX = this.x + d.x * 16; this.muzzleY = this.y - S.Rig.shoulderH(this.look) + d.y * 16; }
      },
      shoot(gun) {
        const d = this.aimDir;
        this.syncMuzzle();
        this.uid = this.uid; // stream key
        S.Weapons.fire(this, gun, this.lvl);
        this.recoil = S.Weapons[gun].recoil || 0.3; this.muzzleFlash = 1; this.crossPop = 1;
        this.shotsFired++;
        if (S.Weapons[gun].knock || S.Weapons[gun].push) {
          const push = S.Weapons[gun].push || 0;
          this.vx -= d.x * push * 0.5; // aim: kick opposite to the aim
          if (!this.onGround && d.y > 0.35) this.vy = Math.min(this.vy, -220 * Math.min(1, d.y * 1.15)); // blasting downwards in the air hops you up
        }
        if (S.Voice && Math.random() < 0.02) S.Voice.say(this.dude, 'fire', { follow: this });
      },
      doMelee() {
        this.meleeHit = true;
        const f = this.facing, T = S.Terrain, ad = this.aimDir;
        const hx = this.x + f * (10 + 8 * Math.abs(ad.x)), hy = this.y - 18 + ad.y * 16; // aim: swing toward the aim side (up / down too)
        let hit = 0;
        const dmg = 3 * (this.dmgMul || 1);
        for (const e of S.Game.hostiles('player')) {
          if (e.dead) continue;
          if (Math.abs(e.x - hx) < e.w / 2 + 16 && Math.abs((e.y - e.h / 2) - hy) < e.h / 2 + 18) {
            const ok = S.Game.damage(e, dmg, { team: 'player', owner: this, kind: 'melee', dirX: f, knock: 240 });
            if (ok !== false) hit++;
          }
        }
        // break a tile in front (also catches thin walls)
        if (T) {
          const tx = Math.floor((this.x + (Math.abs(ad.y) > 0.8 ? 0 : f * 16)) / C.T), oy = ad.y * 18;
          T.damageTile(tx, Math.floor((this.y - 14 + oy) / C.T), 2, { melee: true }); T.damageTile(tx, Math.floor((this.y - 28 + oy) / C.T), 1, { melee: true });
        }
        // deflect enemy bullets
        for (const s of S.Shots.list) {
          if (s.team !== 'player' && !s.dead && s.kind !== 'beam' && Math.abs(s.x - hx) < 22 && Math.abs(s.y - hy) < 22) { s.team = 'player'; s.vx = -s.vx * 1.2; s.vy = -s.vy * 1.2; s.dmg = (s.dmg || 1) * 2; hit++; word('NOPE!', s.x, s.y - 10, { size: 14, color: '#ffffff' }); }
        }
        if (hit) { word(U.pick(['WHAP!', 'BONK!', 'THWACK!']), hx, hy - 14, { size: 26, color: '#ffe14d', burst: true, burstColor: '#e8173a' }); sfx('melee', { x: hx }); S.FX.hitstop(0.06); S.FX.shake(0.18); }
        else S.FX.spark(hx, hy, 3, '#ffffff');
      },
      draw(ctx) {
        if (this.hidden) return;
        if (this.inv > 0 && this.hurtT <= 0 && Math.floor(this.inv * 14) % 2) { ctx.globalAlpha = 0.45; }
        if (S.Rig) {
          const J = S.Rig.draw(ctx, this.x, this.y, this.rigState());
          this._J = J;
        }
        ctx.globalAlpha = 1;
        if (this.barrier > 0) {
          const bl = this.barrier < 2 && Math.floor(this.barrier * 10) % 2;
          if (!bl) {
            ctx.save(); ctx.translate(this.x, this.y - 16);
            ctx.beginPath(); ctx.ellipse(0, 0, 18, 24, 0, 0, U.TAU); ctx.fillStyle = 'rgba(190,240,255,0.25)'; ctx.fill();
            ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
            ctx.restore();
          }
        }
        if (this.dash > 0 && S.FX) S.FX.add({ x: this.x - (this.dashDir || this.facing) * 8, y: this.y - 14, life: 0.2, kind: 'ring', size: 14, color: '#c77dff' });
      },
    },
    // the list the cycle button walks: [{name, def, super:bool, id}]
    selectables() {
      const p = S.Game && S.Game.player, out = [];
      const d = p ? p.def : S.Dudes.sgt;
      const sp = S.Specials && S.Specials[d.special];
      if (sp) out.push({ id: d.special, name: sp.name, def: sp, super: false, icon: sp.icon || '*' });
      if (S.Supers && S.Save) {
        // LOADOUT: only equipped supers (Save.data.loadout, max 3) are in the cycle; no saved loadout yet = first 3 unlocked
        for (const id of Player.equipped()) {
          const sd = S.Supers[id];
          out.push({ id, name: sd.name || id, def: sd, super: true, icon: sd.icon || '*', color: sd.color });
        }
      }
      return out;
    },
    SLOTS: 3,
    owned() { // unlocked super ids (boss beaten), in catalogue order
      const out = [];
      if (S.Supers && S.Save) for (const id in S.Supers) { const sd = S.Supers[id]; if (sd && typeof sd.use === 'function' && S.Save.data.beaten[sd.themeId || id]) out.push(id); }
      return out;
    },
    equipped() {
      const own = Player.owned(); let lo = S.Save && S.Save.data.loadout;
      if (!Array.isArray(lo)) return own.slice(0, Player.SLOTS);
      return lo.filter((id, i) => own.indexOf(id) >= 0 && lo.indexOf(id) === i).slice(0, Player.SLOTS);
    },
  };
  Player.PICK2GUN = PICK2GUN;
  // number keys 1-4 pick a special/super slot directly (slot 1 = the dude's own special)
  if (typeof window !== 'undefined' && window.addEventListener && !window.__sdSlotKeys) {
    window.__sdSlotKeys = 1;
    window.addEventListener('keydown', (e) => {
      const m = /^(?:Digit|Numpad)([1-4])$/.exec(e.code || ''); if (!m) return;
      const G = S.Game, p = G && G.player; if (!p || p.dead || (S.UI && S.UI.isOpen && S.UI.isOpen())) return;
      const list = Player.selectables(), k = +m[1] - 1; if (k >= list.length) return;
      p.selected = k; word(list[k].name + '!', p.x, p.y - 54, { size: 16, color: '#ffffff' }); sfx('menu_move', { vol: 0.5 });
    });
  }
})();
