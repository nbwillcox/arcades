// Moss Golem: 3-phase boss. Slam -> dizzy (hit it) ; phase 2 adds falling boulders ; phase 3 adds a spin sweep.
// Teaches: jump over shockwaves, charge a dizzy enemy, dodge telegraphed attacks. No instant kills.
import * as THREE from 'three';
import { buildGolemArt } from './art/bosses.js';

const TAU = Math.PI * 2;
const M = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c, flatShading: true }, o));
const B = (c, o = {}) => new THREE.MeshBasicMaterial(Object.assign({ color: c }, o));
const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const rnd = (a, b) => a + Math.random() * (b - a);

export class GolemBoss {
  constructor(game, e) {
    this.game = game; this.world = game.world;
    this.kind = 'golem'; this.alive = true; this.drops = [];
    this.x = e.x; this.z = e.z; this.y = game.gy(e.x, e.z);
    this.r = 3.0; this.hpMax = 9; this.hp = 9; this.phase = 1;
    this.state = 'sleep'; this.t = 0; this.cool = 0; this.faceYaw = 0; this.flames = 0; this.flameId = -1; this.hitCool = 0;
    this.rocks = []; this.wave = null; this.spinA = 0; this.defeated = false;
    this.arena = e.arena || { x: e.x, z: e.z, r: 24 };
    this.gemDrops = []; for (const v of e.gems || []) this.gemDrops.push(game._newGem(e.x, this.y + 1, e.z, v, 0));
    this._build();
    this.mesh = this.root;
  }

  _build() {
    const art = buildGolemArt();
    const root = this.root = art.root;
    this.body = art.body; this.head = art.head; this.core = art.core; this.halo = art.halo; this.arms = art.arms;
    // telegraph ring + shock ring (flat)
    this.shock = mesh(new THREE.TorusGeometry(1, 0.28, 6, 40).rotateX(Math.PI / 2), B(0xffe27a), 0, 0.2, 0); this.shock.visible = false; this.game.group.add(this.shock);
    this.tel = mesh(new THREE.RingGeometry(0.2, 1, 36).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }), 0, 0.12, 0); this.tel.visible = false; this.game.group.add(this.tel);
    root.position.set(this.x, this.y, this.z);
    this.game.group.add(root);
  }

  setState(s, t) { this.state = s; this.t = t; }

  hitBoss(game, how) {
    if (this.hitCool > 0 || this.state !== 'dizzy') return;
    this.hitCool = 0.7; this.hp--; this.t = Math.max(this.t, 2.2);
    game.events.push({ type: 'hit', x: this.x, y: this.y + 3, z: this.z });
    game.events.push({ type: 'bosshit' });
    if (this.hp <= 0) { this.defeat(game); return; }
    const np = this.hp > 6 ? 1 : this.hp > 3 ? 2 : 3;
    if (np !== this.phase) {
      this.phase = np; this.rocks.length = 0;
      game.toast(np === 2 ? 'The Golem is furious!' : 'The Golem goes wild!', 2.5);
      this.setState('roar', 1.6);
      if (np === 2) this._minions(game, 2); else this._minions(game, 3);
    } else game.toast(`${this.hp} hit${this.hp > 1 ? 's' : ''} left!`, 1.4);
  }

  _minions(game, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random(), r = 12;
      game._spawn({ t: 'enemy', kind: 'stroller', x: this.arena.x + Math.cos(a) * r, z: this.arena.z + Math.sin(a) * r, patrol: 20, drop: [1, 1] });
    }
  }

  defeat(game) {
    this.defeated = true; this.setState('dead', 0);
    game.events.push({ type: 'bossdead', x: this.x, y: this.y + 3, z: this.z });
    game.toast('The Moss Golem crumbles!', 4);
    for (const g of this.gemDrops) { if (g.saved) continue; g.state = 2; g.x = this.x; g.y = this.y + 2; g.z = this.z; g.delay = 0.6; const a = Math.random() * TAU, s = rnd(2, 6); g.vx = Math.cos(a) * s; g.vz = Math.sin(a) * s; g.vy = rnd(6, 11); }
    game.bossDefeated = true; game.boss = null;
    game.pending.push({ at: game.time + 3.5, e: { t: 'exit', x: this.arena.x, z: this.arena.z + 9 } });
    this.shock.visible = false; this.tel.visible = false;
  }

  tick(dt, player, inCone, inCharge, alive) {
    const game = this.game;
    this.t -= dt; this.hitCool = Math.max(0, this.hitCool - dt); this.cool = Math.max(0, this.cool - dt);
    const dx = player.x - this.x, dz = player.z - this.z, dist = Math.hypot(dx, dz);
    const body = this.body, root = this.root, time = game.time;
    if (this.state !== 'dead') game.boss = { name: 'Moss Golem', hp: this.hp, max: this.hpMax };

    // face the player (not while spinning / dizzy / dead)
    if (['idle', 'slam_tel', 'rocks', 'roar'].includes(this.state)) {
      const want = Math.atan2(dx, dz); let d = want - this.faceYaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      this.faceYaw += d * Math.min(1, dt * 3);
    }
    root.rotation.y = this.faceYaw;

    // keep the player out of the golem's body
    if (this.state !== 'dead' && dist < this.r + 0.35 && Math.abs(player.y - this.y) < 4) {
      const k = (this.r + 0.35) / (dist || 1); player.x = this.x + dx * k; player.z = this.z + dz * k;
    }
    const fwx = Math.sin(player.yaw), fwz = Math.cos(player.yaw);
    const facing = (-dx * fwx - dz * fwz) / (dist || 1);
    inCone = player.flameT > 0.04 && facing > 0.55 && dist - this.r < 3.6 && Math.abs(player.y - this.y) < 5;

    // player attacks
    if (this.alive && this.state !== 'dead') {
      const inBody = dist < this.r + 0.9 && Math.abs(player.y - this.y) < 4;
      if (this.state === 'dizzy') {
        if ((inCharge && inBody) || (player.bumpFlag && inBody)) this.hitBoss(game, 'charge');
        if (inCone && this.flameId !== player.flameId && dist < this.r + 3.2) {
          this.flameId = player.flameId; this.flames++;
          game.events.push({ type: 'hit', x: this.x, y: this.y + 3, z: this.z });
          if (this.flames >= 3) { this.flames = 0; this.hitBoss(game, 'flame'); }
        }
      } else if (inBody && (inCharge || player.bumpFlag) && this.hitCool <= 0) {
        this.hitCool = 0.6; game.events.push({ type: 'clink', x: this.x, y: this.y + 3, z: this.z });
        if (!game.invuln) player.knock(-Math.sin(player.yaw) * 7, -Math.cos(player.yaw) * 7, 5, 0.25);
      } else if (alive && dist < this.r + 0.6 && Math.abs(player.y - this.y) < 2.5 && this.state !== 'roar') game.hurt(player, this.x, this.z, 8);
    }

    switch (this.state) {
      case 'sleep': {
        body.position.y = Math.sin(time * 1.5) * 0.05;
        if (alive && dist < 18) { this.setState('roar', 2.2); game.toast('The Moss Golem awakens!', 3); game.events.push({ type: 'roar' }); }
        break;
      }
      case 'roar': {
        body.position.y = Math.sin(time * 30) * 0.06;
        this.head.rotation.x = -0.5; this.arms.forEach((a) => { a.rotation.x = -1.2 + Math.sin(time * 8) * 0.2; });
        if (this.t <= 0) { this.head.rotation.x = 0; this.setState('idle', 1.0); }
        break;
      }
      case 'idle': {
        body.position.y = Math.sin(time * 2) * 0.08; this.arms.forEach((a) => { a.rotation.x += (0 - a.rotation.x) * Math.min(1, dt * 6); });
        if (this.t <= 0) this._pickAttack(game, player);
        break;
      }
      case 'slam_tel': {
        const k = 1 - Math.max(0, this.t) / 1.1;
        this.arms.forEach((a) => { a.rotation.x = -2.6 * k; });
        body.position.y = k * 0.4;
        this.tel.visible = true; this.tel.position.set(this.x, this.y + 0.12, this.z); this.tel.scale.setScalar(3.5 + k * 3); this.tel.material.opacity = 0.2 + k * 0.4;
        if (this.t <= 0) {
          this.tel.visible = false;
          this.arms.forEach((a) => { a.rotation.x = 0.2; });
          this.wave = { r: 3.2, v: this.phase === 3 ? 12 : 9.5, hit: false };
          game.events.push({ type: 'slam', x: this.x, y: this.y, z: this.z });
          this.setState('slam_rec', 0.6);
        }
        break;
      }
      case 'slam_rec': {
        body.position.y = 0;
        if (this.t <= 0) {
          if (this.slamsLeft > 1) { this.slamsLeft--; this.setState('slam_tel', 0.85); }
          else this.setState('wait_wave', 0);
        }
        break;
      }
      case 'wait_wave': {
        if (!this.wave) { this.setState('dizzy', this.phase === 1 ? 4.5 : this.phase === 2 ? 4.0 : 3.6); game.toast('Charge the Golem while it is dizzy!', 2.2); }
        break;
      }
      case 'rocks': {
        const k = 1 - Math.max(0, this.t) / 2.6;
        this.arms.forEach((a, i) => { a.rotation.x = -2.2 + Math.sin(time * 10 + i * 3) * 0.3; });
        if (this.rockCount > 0 && this.cool <= 0) {
          this.cool = 0.6; this.rockCount--;
          // aim near the player with a little spread
          const rx = player.x + rnd(-2.5, 2.5), rz = player.z + rnd(-2.5, 2.5);
          this._rock(game, rx, rz);
        }
        if (this.t <= 0) { this.setState('idle', 0.6); this.arms.forEach((a) => { a.rotation.x = 0; }); }
        break;
      }
      case 'spin': {
        this.spinA += dt * (3.2 + (3 - this.t) * 0.5);
        root.rotation.y = this.spinA;
        this.arms.forEach((a, i) => { a.rotation.z = (i ? -1 : 1) * 1.45; a.rotation.x = 0; });
        // sweep arms: damage in a thin bar through the body at the spin angle
        if (alive && Math.abs(player.y - this.y) < 1.5) {
          const pa = Math.atan2(dx, dz);
          for (const off of [Math.PI / 2, -Math.PI / 2]) {
            let d = pa - (this.spinA + off); d = Math.atan2(Math.sin(d), Math.cos(d));
            if (Math.abs(d) < 0.32 && dist > 2 && dist < 7.4) game.hurt(player, this.x, this.z, 9);
          }
        }
        this.tel.visible = true; this.tel.position.set(this.x, this.y + 0.1, this.z); this.tel.scale.setScalar(7.4); this.tel.material.opacity = 0.18;
        if (this.t <= 0) {
          this.arms.forEach((a) => { a.rotation.z = 0; }); this.tel.visible = false; this.faceYaw = this.spinA;
          this.setState('dizzy', 3.6); game.toast('Dizzy! Charge it!', 2);
        }
        break;
      }
      case 'dizzy': {
        const k = Math.min(1, (this.t + 4) * 0.5);
        body.position.y = -0.6; this.head.rotation.x = 0.5 + Math.sin(time * 4) * 0.1;
        this.arms.forEach((a, i) => { a.rotation.x = 0.4 + Math.sin(time * 5 + i) * 0.08; });
        this.core.scale.setScalar(1.2 + Math.sin(time * 12) * 0.2); this.halo.scale.setScalar(1.6 + Math.sin(time * 12) * 0.3);
        if (this.t <= 0) { this.head.rotation.x = 0; this.core.scale.setScalar(1); this.halo.scale.setScalar(1); body.position.y = 0; this.setState('idle', 0.8); }
        break;
      }
      case 'dead': {
        this.t2 = (this.t2 || 0) + dt;
        body.position.y = -this.t2 * 0.5; body.rotation.x = Math.min(0.5, this.t2 * 0.3);
        root.scale.setScalar(Math.max(0.01, 1 - this.t2 * 0.18));
        if (Math.random() < dt * 20) game.events.push({ type: 'break', x: this.x + rnd(-2, 2), y: this.y + rnd(1, 4), z: this.z + rnd(-2, 2), kind: 'rock' });
        if (this.t2 > 4.5) { root.visible = false; this.alive = false; }
        break;
      }
    }

    if (this.state !== 'dizzy') { this.core.scale.setScalar(1 + Math.sin(time * 4) * 0.05); this.halo.scale.setScalar(1); }

    // shockwave
    if (this.wave) {
      const w = this.wave;
      w.r += w.v * dt; this.shock.visible = true;
      this.shock.position.set(this.x, this.y + 0.2, this.z); this.shock.scale.set(w.r, 1, w.r); this.shock.material.opacity = 1;
      const gy = this.game.gy(player.x, player.z, player.y + 0.6);
      if (alive && Math.abs(dist - w.r) < 1.1 && player.y < gy + 0.65 && !w.hit) { w.hit = true; game.hurt(player, this.x, this.z, 9); }
      if (w.r > this.arena.r + 4) { this.wave = null; this.shock.visible = false; }
    }

    // boulders
    for (let i = this.rocks.length - 1; i >= 0; i--) {
      const rk = this.rocks[i];
      rk.t += dt;
      const k = Math.min(1, rk.t / rk.fall);
      rk.mark.material.opacity = 0.25 + 0.4 * k; rk.mark.scale.setScalar(2.6 * (0.5 + 0.5 * k));
      rk.mesh.position.set(rk.x, rk.gy + 16 * (1 - k * k), rk.z); rk.mesh.rotation.x += dt * 4;
      if (k >= 1) {
        game.events.push({ type: 'break', x: rk.x, y: rk.gy + 0.5, z: rk.z, kind: 'rock' });
        if (alive && Math.hypot(player.x - rk.x, player.z - rk.z) < 2.6 && player.y < rk.gy + 1.6) game.hurt(player, rk.x, rk.z, 8);
        game.group.remove(rk.mesh); game.group.remove(rk.mark); this.rocks.splice(i, 1);
      }
    }
  }

  _rock(game, x, z) {
    const gy = game.gy(x, z);
    const m = mesh(ico(1.0, 1), M(0x8b919e), x, gy + 16, z); game.group.add(m);
    const mark = mesh(new THREE.RingGeometry(0.4, 1, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }), x, gy + 0.15, z);
    game.group.add(mark);
    this.rocks.push({ x, z, gy, t: 0, fall: 1.15, mesh: m, mark });
  }

  _pickAttack(game, player) {
    const ph = this.phase, r = Math.random();
    if (ph === 1) { this.slamsLeft = 1; this.setState('slam_tel', 1.1); }
    else if (ph === 2) {
      if (this.last === 'slam' || r < 0.4) { this.rockCount = 4; this.setState('rocks', 2.6); this.last = 'rocks'; }
      else { this.slamsLeft = 1; this.setState('slam_tel', 0.95); this.last = 'slam'; }
    } else {
      if (this.last === 'slam') { this.setState('spin', 3.0); this.spinA = this.faceYaw; this.last = 'spin'; }
      else if (this.last === 'spin') { this.rockCount = 5; this.setState('rocks', 2.8); this.last = 'rocks'; }
      else { this.slamsLeft = 2; this.setState('slam_tel', 0.85); this.last = 'slam'; }
    }
  }
}
