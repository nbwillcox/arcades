// Gameplay layer: gems, breakables, enemies, Wick (health), checkpoints, Elders.
import * as THREE from 'three';
import { P } from './controller.js';
import * as Props from './art/props.js';
import { GolemBoss } from './boss_golem.js';
import { Boss, BOSSES } from './boss.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

const ENEMY = {
  stroller: { speed: 2.0, hp: 1, r: 0.5, drop: [1, 1] },
  shield: { speed: 1.7, hp: 1, r: 0.55, drop: [2, 2] },
  spiked: { speed: 1.9, hp: 1, r: 0.5, drop: [2, 2] },
  hopper: { speed: 3.2, hp: 1, r: 0.45, drop: [1, 1, 2] },
  spitter: { speed: 0, hp: 1, r: 0.45, drop: [2, 2] },
  brute: { speed: 1.6, hp: 4, r: 0.95, drop: [5, 5, 10, 10] },
  thief: { speed: 5.2, hp: 1, r: 0.45, drop: [5] },
};
function needText(n, cozy) { return n.elders ? `${cozy ? Math.ceil(n.elders * 0.75) : n.elders} Elders` : n.gems ? `${n.gems} gems` : n.done ? 'Defeat the guardian' : ''; }
export const WICK_COLORS = [0x000000, 0xcfe9ff, 0xff9a3c, 0xffd860];

export class Game {
  constructor({ scene, world, spec, settings, prog, totals }) {
    this.scene = scene; this.world = world; this.spec = spec;
    this.prog = prog || { gemSlots: [], elders: [] };
    this.totals = totals || { gems: 0, elders: 0, sunstones: 0 };
    this.collected = new Set(this.prog.gemSlots || []);
    this.eldersFound = new Set(this.prog.elders || []);
    this.pending = []; this.boss = null; this.bossDefeated = false;
    this.elderCount = 0; this.finished = false; this.exitT = 0; this.safeT = 0;
    this.settings = settings || { cozy: true };
    this.group = new THREE.Group(); scene.add(this.group);
    this.events = [];
    this.time = 0;
    this.hpMax = 3;
    this.sunFound = new Set((prog && prog.sunstones) || []);
    this.startHp = this.settings.cozy ? 2 : 1;
    this.state = { sunstones: 0, sunstoneTotal: 0, gems: 0, gemsTotal: 0, hp: this.startHp, lives: this.settings.cozy ? Infinity : 3, elders: 0, eldersTotal: 0, deaths: 0, enemies: 0, kills: 0 };
    this.invuln = 1.5; this.dying = 0; this.fade = 0; this.respawnAt = 0;
    this.toastText = ''; this.toastT = 0;
    this.gems = []; this.things = []; this.bolts = [];
    this.checkpoint = { x: spec.spawn[0], y: spec.spawn[1], z: spec.spawn[2], yaw: spec.spawn[3] };
    this.safe = { x: spec.spawn[0], y: spec.spawn[1], z: spec.spawn[2], yaw: spec.spawn[3] };
    this.noLife = false;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1); this._p = new THREE.Vector3(); this._c = new THREE.Color();
    this._g = {};
    this.wick = Props.makeWick(); this.group.add(this.wick); this.wickA = 0;
    this._build();
  }

  gy(x, z, y = 999) { return this.world.groundAt(x, z, y, 0.4, this._g).y; }

  _newGem(x, y, z, v, state = 1) {
    const g = { x, y, z, v, state, vx: 0, vy: 0, vz: 0, t: 0, phase: Math.random() * TAU, slot: this.gems.length, delay: 0 };
    this.gems.push(g); this.state.gemsTotal += v;
    if (this.collected.has(g.slot)) { g.state = 0; g.saved = true; this.state.gems += v; }
    return g;
  }

  _build() {
    const ents = this.spec.entities || [];
    let cap = 0;
    for (const e of ents) cap += e.t === 'gem' ? 1 : (e.gems ? e.gems.length : 0) + (e.t === 'enemy' ? (e.drop || ENEMY[e.kind].drop).length : 0);
    this.gemMesh = Props.makeGemInstances(cap + 8); this.group.add(this.gemMesh);
    for (const e of ents) this._spawn(e);
    this.gemMesh.count = this.gems.length;
    for (const g of this.gems) { this._c.setHex(Props.GEM_COLORS[g.v] || 0xffffff); this.gemMesh.setColorAt(g.slot, this._c); }
    if (this.gemMesh.instanceColor) this.gemMesh.instanceColor.needsUpdate = true;
  }

  _spawn(e) {
    const w = this.world;
    if (e.t === 'thief') e = Object.assign({}, e, { t: 'enemy', kind: 'thief' });
    if (e.t === 'golem') { this.things.push(new GolemBoss(this, e)); return; }
    if (e.t === 'boss') { this.things.push(new Boss(this, e, BOSSES[e.boss])); return; }
    if (e.t === 'ending') { this.events.push({ type: 'ending' }); this.finished = true; return; }
    if (e.t === 'gem') { const y = e.y !== undefined ? e.y : this.gy(e.x, e.z) + 0.65; this._newGem(e.x, y, e.z, e.v || 1, 1); return; }
    const y = e.y !== undefined ? e.y : this.gy(e.x, e.z);
    const th = { kind: e.t, x: e.x, y, z: e.z, alive: true, r: 0.6, ry: e.yaw || 0, drops: [] };
    switch (e.t) {
      case 'crate': case 'vase': case 'chest':
        th.mesh = e.t === 'crate' ? Props.makeCrate() : e.t === 'vase' ? Props.makeVase() : Props.makeChest();
        th.r = e.t === 'chest' ? 0.8 : 0.6; th.hit = e.t === 'chest' ? 'charge' : 'any';
        for (const v of e.gems || []) th.drops.push(this._newGem(e.x, y + 0.5, e.z, v, 0));
        break;
      case 'enemy': {
        const d = ENEMY[e.kind]; th.ekind = e.kind; th.def = d; th.hp = d.hp; th.r = d.r;
        th.mesh = Props.makeEnemy(e.kind); th.hx = e.x; th.hz = e.z; th.patrol = e.patrol === undefined ? 5 : e.patrol;
        th.heading = Math.random() * TAU; th.timer = rnd(0.5, 2); th.vy = 0; th.cool = rnd(0.5, 2); th.stun = 0; th.hitFlame = -1; th.hitCool = 0;
        for (const v of e.drop || d.drop) th.drops.push(this._newGem(e.x, y + 0.5, e.z, v, 0));
        if (e.kind === 'thief') {
          th.sunId = e.sunstone; this.state.sunstoneTotal++;
          if (this.sunFound.has(e.sunstone)) { th.alive = false; th.mesh.visible = false; this.state.sunstones++; this.group.add(th.mesh); this.things.push(th); return; }
        } else this.state.enemies++;
        break;
      }
      case 'sunstone': {
        th.id = e.id; th.r = 1.2; th.mesh = Props.makeSunstone(); th.y = y + (e.h === undefined ? 1.1 : e.h); th.bob = Math.random() * 6;
        this.state.sunstoneTotal++;
        if (this.sunFound.has(e.id)) { th.alive = false; th.mesh.visible = false; this.state.sunstones++; }
        break;
      }
      case 'vent': th.r = e.r || 2; th.h = e.h || 12; th.power = e.power || 8; th.mesh = Props.makeVent(th.r, th.h); break;
      case 'spring': th.r = 0.95; th.power = e.power || 19; th.mesh = Props.makeSpring(); th.sq = 0; break;
      case 'barrier': {
        th.w = e.w || 3; th.hh = e.h || 3; th.d = e.d || 1.2; th.by = e.by || 'charge';
        th.r = Math.max(th.w, th.d) / 2 + 0.5;
        th.mesh = Props.makeBarrier(th.w, th.hh, th.d, th.by);
        th.box = this.world.addBox({ min: [e.x - th.w / 2, y - 0.5, e.z - th.d / 2], max: [e.x + th.w / 2, y + th.hh, e.z + th.d / 2] });
        break;
      }
      case 'brazier': th.r = 0.9; th.group = e.group || 'a'; th.lit = false; th.mesh = Props.makeBrazier(); break;
      case 'gate': {
        th.w = e.w || 4; th.hh = e.h || 3.2; th.d = e.d || 0.5; th.group = e.group || 'a'; th.open = 0; th.mesh = Props.makeGate(th.w, th.hh, th.d);
        th.box = this.world.addBox({ min: [e.x - th.w / 2, y - 0.5, e.z - th.d / 2], max: [e.x + th.w / 2, y + th.hh, e.z + th.d / 2] });
        break;
      }
      case 'gust': th.r = e.r || 6; th.h = e.h || 14; th.dx = e.dx === undefined ? 1 : e.dx; th.dz = e.dz || 0; th.force = e.force || 26; th.mesh = Props.makeGust(th.r, th.h, th.dx, th.dz); break;
      case 'spikes': { th.w = e.w || 3; th.d = e.d || 3; th.r = Math.max(th.w, th.d) / 2; th.mesh = Props.makeSpikes(th.w, th.d); th.spk = 0;
        break;

      }
      case 'moth': th.mesh = Props.makeMoth(); th.r = 0.6; th.y = y + (e.h || 1.6); th.hx = e.x; th.hz = e.z; th.hy = th.y; th.hit = 'flame'; break;
      case 'lantern': th.mesh = Props.makeLantern(); th.r = 1.3; th.lit = false; break;
      case 'exit': th.mesh = Props.makePortal(0x7ff0ff, 'Level exit'); th.r = 1.8; break;
      case 'portal': th.mesh = Props.makePortal(e.color || 0xffc86b, e.label || 'Portal', e.need ? needText(e.need, this.settings.cozy) : ''); th.r = 1.8; th.target = e.target; th.need = e.need; th.label = e.label; th.cool = 0; break;
      case 'elder': th.mesh = Props.makeElder(); th.r = 1.7; th.tip = e.tip || 'Thank you, little one!'; th.freed = false; th.idx = this.elderCount++;
        if (e.afterBoss) { th.pendingBoss = true; th.mesh.visible = false; } this.state.eldersTotal++;
        if (this.eldersFound.has(th.idx)) { th.alive = false; th.freed = true; th.t = Math.random() * 6; th.mesh.userData.crystal.visible = false; th.mesh.userData.free.visible = true; this.state.elders++; }
        break;
    }
    th.mesh.position.set(th.x, th.y, th.z); th.mesh.rotation.y = th.ry;
    this.group.add(th.mesh); this.things.push(th);
  }

  toast(text, secs = 3.5) { this.toastText = text; this.toastT = secs; }

  // ---- hurting / dying
  hurt(player, fx, fz, force = 7) {
    if (this.invuln > 0 || this.dying > 0) return;
    const dx = player.x - fx, dz = player.z - fz, d = Math.hypot(dx, dz) || 1;
    this.events.push({ type: 'hurt' });
    if (this.state.hp > 0) {
      this.state.hp--; this.invuln = 1.6;
      player.knock(dx / d * force, dz / d * force, 6.5, 0.32);
    } else this.die(player);
  }

  // Fell in water / off the world: back to the last safe spot, no hit-points lost.
  splash(player) {
    if (this.dying > 0) return;
    this.dying = 0.9; this.noLife = true; this.events.push({ type: 'fall' });
  }

  // Lava burns one heart, then returns Cinder to the last safe spot. No hearts left: a real death.
  lavaHit(player) {
    if (this.dying > 0) return;
    this.events.push({ type: 'hurt' });
    if (this.state.hp > 0) { this.state.hp--; this.dying = 0.9; this.noLife = true; this.events.push({ type: 'fall' }); }
    else this.die(player);
  }

  die(player) {
    if (this.dying > 0) return;
    this.dying = 1.3; this.state.deaths++; this.events.push({ type: 'death' });
    if (isFinite(this.state.lives)) { this.state.lives--; if (this.state.lives < 0) this.gameOver = true; }
  }

  heal() { if (this.state.hp < this.hpMax) { this.state.hp++; this.events.push({ type: 'heal' }); } }

  _releaseDrops(th, up = 5) {
    for (const g of th.drops) {
      if (g.saved) continue;
      g.state = 2; g.x = th.x; g.y = th.y + 0.6; g.z = th.z; g.delay = 0.4;
      const a = Math.random() * TAU, s = rnd(1.5, 3.2);
      g.vx = Math.cos(a) * s; g.vz = Math.sin(a) * s; g.vy = up + Math.random() * 2;
    }
    th.drops.length = 0;
  }

  _kill(th, how) {
    th.alive = false; if (th.kind !== 'chest') th.mesh.visible = false;
    this.events.push({ type: th.kind === 'enemy' ? 'kill' : th.kind === 'chest' ? 'chest' : 'break', x: th.x, y: th.y + 0.5, z: th.z, kind: th.kind === 'enemy' ? th.ekind : th.kind });
    if (th.kind === 'enemy') this.state.kills++;
    if (th.sunId !== undefined) this._dropSunstone(th);
    this._releaseDrops(th, th.kind === 'chest' ? 8 : 5);
  }

  // ---- per-step update
  update(dt, player) {
    this.time += dt;
    const S = this.state;
    this.invuln = Math.max(0, this.invuln - dt);
    if (this.toastT > 0) this.toastT -= dt;
    if (player.dead && this.dying <= 0) { this.splash(player); player.dead = false; }
    if (this.dying > 0) {
      this.dying -= dt;
      if (this.dying <= 0 && this.gameOver) { if (!this._goSent) { this._goSent = true; this.events.push({ type: 'gameover' }); } this.dying = 0.0001; }
      else if (this.dying <= 0) {
        const c = this.noLife ? this.safe : this.checkpoint;
        player.respawn(c.x, c.y, c.z, c.yaw); player.dead = false;
        if (!this.noLife) S.hp = Math.max(S.hp, this.startHp);
        this.noLife = false; this.invuln = 2; this.events.push({ type: 'respawn' });
      }
    }

    // delayed spawns (boss exit portal) and arena limit
    for (let i = this.pending.length - 1; i >= 0; i--) if (this.time >= this.pending[i].at) { const pe = this.pending[i].e; this.pending.splice(i, 1); this._spawn(pe); if (pe.t === 'exit') this.toast('The way out is open!', 3); }
    const ar = this.spec.arena;
    if (ar) {
      const ax = player.x - ar.x, az = player.z - ar.z, ad = Math.hypot(ax, az);
      if (ad > ar.r) { const k = ar.r / ad; player.x = ar.x + ax * k; player.z = ar.z + az * k; }
    }

    // safe-spot tracking and liquid hazards
    this.safeT -= dt;
    const liqY = this.world.liquid ? this.world.liquid.y : -1e9;
    if (player.onGround && this.safeT <= 0 && this.dying <= 0 && !player.groundBox) {
      const sh = (dx, dz) => this.world.sample(player.x + dx, player.z + dz).h;
      if (sh(0, 0) > liqY + 0.6 && sh(1.5, 0) > liqY + 0.4 && sh(-1.5, 0) > liqY + 0.4 && sh(0, 1.5) > liqY + 0.4 && sh(0, -1.5) > liqY + 0.4) {
        this.safe = { x: player.x, y: player.y, z: player.z, yaw: player.yaw }; this.safeT = 0.5;
      }
    }
    if (this.world.liquid && this.dying <= 0 && player.y < liqY - 0.15) {
      this.events.push({ type: 'splash', x: player.x, y: liqY, z: player.z, kind: this.world.liquid.kind });
      if (this.world.liquid.kind === 'lava') this.lavaHit(player); else this.splash(player);
    }

    const px = player.x, py = player.y, pz = player.z;
    const fxd = Math.sin(player.yaw), fzd = Math.cos(player.yaw);
    const alive = this.dying <= 0;
    const flaming = player.flameT > P.flameTime * 0.1 && alive;
    const charging = (player.chargeT > 0 || !!player.bumpFlag) && alive;

    // gems
    const magnet = S.hp > 0 ? 2.6 : 1.1;
    for (const g of this.gems) {
      if (g.state === 0) continue;
      if (g.state === 2) {
        g.vy -= 22 * dt; g.x += g.vx * dt; g.z += g.vz * dt; g.y += g.vy * dt;
        g.delay -= dt;
        const gy = this.gy(g.x, g.z, g.y + 0.6) + 0.55;
        if (g.vy < 0 && g.y <= gy) { g.y = gy; if (g.vy < -4) { g.vy = -g.vy * 0.4; g.vx *= 0.6; g.vz *= 0.6; } else { g.state = 1; } }
      }
      if (!alive || g.delay > 0) continue;
      const dx = px - g.x, dy = (py + 0.5) - g.y, dz = pz - g.z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < 0.9 * 0.9) { this._collect(g); continue; }
      if (d2 < magnet * magnet && g.state === 1) {
        const d = Math.sqrt(d2); const sp = 14 * dt;
        g.x += dx / d * sp; g.y += dy / d * sp; g.z += dz / d * sp;
      }
    }

    // things
    for (const th of this.things) {
      if (!th.alive) { if (th.kind === 'elder') this._updateElder(th, dt); continue; }
      if (th.pendingBoss) { if (this.bossDefeated) { th.pendingBoss = false; th.mesh.visible = true; this.events.push({ type: 'rescue', x: th.x, y: th.y + 1, z: th.z }); } else continue; }
      const dx = th.x - px, dz = th.z - pz, dy = th.y - py;
      const dist = Math.hypot(dx, dz);
      const fwd = dx * fxd + dz * fzd, lat = dx * fzd - dz * fxd;
      const inCone = flaming && fwd > -0.2 && fwd < 3.3 && Math.abs(lat) < fwd * 0.65 + 0.8 && Math.abs(dy) < 1.8 && !(th.flameId === player.flameId);
      const inCharge = charging && fwd > -0.5 && fwd < 1.5 + th.r && Math.abs(lat) < 0.8 + th.r && Math.abs(dy) < 1.4;
      if (th.tick) { th.tick(dt, player, inCone, inCharge, alive); continue; }
      switch (th.kind) {
        case 'crate': case 'vase':
          if (inCone || inCharge) this._kill(th, inCharge ? 'charge' : 'flame');
          break;
        case 'chest':
          // opens when Cinder runs into it (or charges / flames it)
          if (inCharge || inCone || (alive && dist < th.r + 0.5 && Math.abs(dy) < 1.4)) { th.openAt = this.time; this._kill(th, 'touch'); }
          break;
        case 'moth': this._updateMoth(th, dt, inCone, player); break;
        case 'lantern':
          if (alive && dist < th.r && Math.abs(dy) < 2 && !th.lit) this._light(th);
          if (inCone && !th.lit) this._light(th);
          th.mesh.userData.tick(this.time, th.lit, th.x);
          break;
        case 'elder': if (alive && dist < th.r && Math.abs(dy) < 2.2) this._rescue(th); break;
        case 'exit': th.mesh.userData.spin(this.time); if (alive && !this.finished && dist < th.r && Math.abs(dy) < 2.5) { this.finished = true; this.events.push({ type: 'exit' }); } break;
        case 'portal': this._updatePortal(th, dt, player, dist, dy, alive); break;
        case 'enemy': this._updateEnemy(th, dt, player, inCone, inCharge, alive); break;
        case 'sunstone': this._updateSunstone(th, dt, player, dist, dy, alive); break;
        case 'vent': {
          th.mesh.userData.spin(this.time);
          if (alive && dist < th.r && py > th.y - 0.5 && py < th.y + th.h) player.updraft = th.power * Math.min(1, (th.y + th.h - py) / 2.5);
          break;
        }
        case 'spring': {
          th.sq = Math.max(0, (th.sq || 0) - dt * 4);
          th.mesh.userData.setSquash(th.sq, this.time);
          if (alive && dist < th.r && py <= th.y + 0.9 && py >= th.y - 0.6 && player.vy <= 2) { player.bounce(th.power); th.sq = 1; this.events.push({ type: 'spring' }); }
          break;
        }
        case 'barrier': {
          const b = th.box, cx = Math.min(b.max[0], Math.max(b.min[0], px)), cz = Math.min(b.max[2], Math.max(b.min[2], pz));
          const bd = Math.hypot(px - cx, pz - cz), ahead = (th.x - px) * fxd + (th.z - pz) * fzd;
          const hitC = th.by === 'charge' && charging && bd < 1.15 && ahead > 0 && Math.abs(py - th.y) < th.hh;
          const hitF = th.by === 'flame' && flaming && bd < 3.2 && ahead > -0.5 && Math.abs(py - th.y) < th.hh + 1;
          if (hitC || hitF) { this.world.removeBox(th.box); th.alive = false; th.mesh.visible = false; this.events.push({ type: 'break', x: th.x, y: th.y + th.hh / 2, z: th.z, kind: 'barrier' }); this.toast(th.by === 'charge' ? 'Wall smashed!' : 'The ice melted!', 1.6); this._releaseDrops(th, 4); }
          else if (flaming && th.by === 'charge' && bd < 3 && ahead > 0) { if (th.flameId !== player.flameId) { th.flameId = player.flameId; this.events.push({ type: 'clink', x: th.x, y: th.y + 1, z: th.z }); } }
          break;
        }
        case 'brazier': {
          th.mesh.userData.tick(this.time, th.lit);
          if (!th.lit && inCone) this._lightBrazier(th);
          break;
        }
        case 'gate': {
          if (th.opening) {
            th.open = Math.min(1, th.open + dt / 1.3); th.mesh.userData.setOpen(th.open);
            if (th.open >= 1) { this.world.removeBox(th.box); th.alive = false; }
          }
          break;
        }
        case 'gust': {
          th.mesh.userData.spin(this.time);
          if (alive && !player.onGround && dist < th.r && py > th.y - 1 && py < th.y + th.h) { player.vx += th.dx * th.force * dt; player.vz += th.dz * th.force * dt; player.carryT = Math.max(player.carryT, 0.25); }
          break;
        }
        case 'spikes': {
          if (alive && py < th.y + 0.8 && py > th.y - 1 && Math.abs(px - th.x) < th.w / 2 + 0.2 && Math.abs(pz - th.z) < th.d / 2 + 0.2) this.hurt(player, th.x, th.z, 5);
          break;
        }
      }
      if (th.kind === 'elder') this._updateElder(th, dt);
    }

    // bolts
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      b.mesh.position.set(b.x, b.y, b.z);
      let gone = b.life <= 0 || b.y < this.gy(b.x, b.z, b.y + 0.5);
      if (!gone && alive && Math.hypot(b.x - px, b.z - pz) < 0.6 && Math.abs(b.y - (py + 0.5)) < 0.8) { this.hurt(player, b.x - b.vx, b.z - b.vz, 6); gone = true; }
      if (!gone && flaming) { const dx = b.x - px, dz = b.z - pz; const f = dx * fxd + dz * fzd; if (f > 0 && f < 2.6 && Math.abs(dx * fzd - dz * fxd) < 1.4) gone = true; }
      if (gone) { this.events.push({ type: 'zap', x: b.x, y: b.y, z: b.z }); this.group.remove(b.mesh); this.bolts.splice(i, 1); }
    }

    this._updateWick(dt, player);
  }

  _collect(g) {
    g.state = 0; this.state.gems += g.v; this.collected.add(g.slot);
    this.events.push({ type: 'gem', v: g.v, x: g.x, y: g.y, z: g.z });
  }

  // is this portal still locked (not enough Elders / gems, or the guardian is alive)?
  _portalLocked(th) {
    const need = th.need || {}, T = this.totals;
    const needE = need.elders ? Math.ceil(need.elders * (this.settings.cozy ? 0.75 : 1)) : 0;
    return needE > T.elders || (need.gems || 0) > T.gems || !!(need.done && !(T.done || []).includes(need.done));
  }

  _updatePortal(th, dt, player, dist, dy, alive) {
    if (th.need && th.mesh.userData.setLocked) { const lk = this._portalLocked(th); if (lk !== th.locked) { th.locked = lk; th.mesh.userData.setLocked(lk); } }
    th.mesh.userData.spin(this.time);
    th.cool = Math.max(0, th.cool - dt);
    if (!alive || dist > th.r || Math.abs(dy) > 2.5 || th.cool > 0) return;
    th.cool = 1.5;
    const need = th.need || {}, T = this.totals;
    const needE = need.elders ? Math.ceil(need.elders * (this.settings.cozy ? 0.75 : 1)) : 0;
    if (needE > T.elders) { const m = needE - T.elders; this.toast(`Rescue ${m} more Elder${m > 1 ? 's' : ''} to open this`, 3); this.events.push({ type: 'locked' }); return; }
    if (need.done && !(T.done || []).includes(need.done)) { this.toast('Defeat the guardian of this world first', 3); this.events.push({ type: 'locked' }); return; }
    if ((need.gems || 0) > T.gems) { this.toast(`Collect ${need.gems - T.gems} more gems to open this`, 3); this.events.push({ type: 'locked' }); return; }
    this.events.push({ type: 'portal', target: th.target });
  }

  _dropSunstone(th) {
    const st = { kind: 'sunstone', id: th.sunId, x: th.x, y: th.y + 0.9, z: th.z, alive: true, r: 1.4, drops: [], bob: 0, vy: 7, mesh: Props.makeSunstone() };
    st.mesh.position.set(st.x, st.y, st.z); this.group.add(st.mesh); this.things.push(st);
    this.toast('The thief dropped a Sunstone!', 2.5);
  }

  _updateSunstone(th, dt, player, dist, dy, alive) {
    if (th.vy !== undefined) {
      th.vy -= 22 * dt; th.y += th.vy * dt;
      const gy = this.gy(th.x, th.z, th.y + 0.5) + 1.0;
      if (th.vy < 0 && th.y <= gy) { th.y = gy; th.vy = undefined; th.base = gy; }
    } else { th.base = th.base === undefined ? th.y : th.base; th.y = th.base + Math.sin(this.time * 2.2 + th.bob) * 0.18; }
    th.mesh.position.set(th.x, th.y, th.z); th.mesh.userData.spin(this.time);
    if (alive && dist < th.r && Math.abs(dy) < 2.2) {
      th.alive = false; th.mesh.visible = false;
      this.state.sunstones++; this.sunFound.add(th.id);
      this.events.push({ type: 'sunstone', x: th.x, y: th.y, z: th.z });
      this.toast('Sunstone recovered!', 3);
    }
  }

  _lightBrazier(th) {
    th.lit = true; th.mesh.userData.setLit(true);
    this.events.push({ type: 'checkpoint' });
    const mates = this.things.filter((t) => t.kind === 'brazier' && t.group === th.group);
    if (mates.every((t) => t.lit)) {
      for (const g of this.things) if (g.kind === 'gate' && g.group === th.group && !g.opening) { g.opening = true; }
      this.toast('A gate rumbles open!', 2.5); this.events.push({ type: 'gate' });
    } else this.toast(`${mates.filter((t) => t.lit).length} / ${mates.length} braziers lit`, 1.8);
  }

  _light(th) { th.lit = true; th.mesh.userData.setLit && th.mesh.userData.setLit(true); this.checkpoint = { x: th.x + Math.sin(th.ry) * 1.5, y: th.y, z: th.z + Math.cos(th.ry) * 1.5, yaw: th.ry }; this.events.push({ type: 'checkpoint' }); this.toast('Checkpoint lit!', 1.8); }

  _rescue(th) {
    th.alive = false; th.freed = true; th.t = 0;
    this.state.elders++; this.eldersFound.add(th.idx);
    th.mesh.userData.crystal.visible = false; th.mesh.userData.free.visible = true;
    this.events.push({ type: 'rescue', x: th.x, y: th.y + 1, z: th.z });
    this.toast(th.tip, 6);
  }
  _updateElder(th, dt) {
    if (!th.freed) { th.mesh.userData.crystal.rotation.y += dt * 0.3; return; }
    th.t += dt; const f = th.mesh.userData.free; f.position.y = Math.abs(Math.sin(th.t * 4)) * 0.35; f.rotation.y += dt * 1.5;
  }

  _updateMoth(th, dt, inCone, player) {
    th.t = (th.t || 0) + dt;
    th.x = th.hx + Math.sin(th.t * 0.9) * 2.2; th.z = th.hz + Math.cos(th.t * 0.7) * 2.2; th.y = th.hy + Math.sin(th.t * 2.3) * 0.35;
    const u = th.mesh.userData, f = Math.sin(this.time * 22) * 0.9;
    u.wl.rotation.z = f; u.wr.rotation.z = -f; u.tick && u.tick(this.time, th.hx);
    th.mesh.position.set(th.x, th.y, th.z); th.mesh.rotation.y = th.t * 0.9;
    if (inCone) {
      th.alive = false; th.mesh.visible = false; this.heal();
      this.events.push({ type: 'moth', x: th.x, y: th.y, z: th.z });
    }
  }

  _updateEnemy(th, dt, player, inCone, inCharge, alive) {
    const w = this.world, d = th.def, px = player.x, pz = player.z;
    const dxp = px - th.x, dzp = pz - th.z, dp = Math.hypot(dxp, dzp);
    th.hitCool = Math.max(0, th.hitCool - dt);
    const kind = th.ekind;

    // incoming attacks
    if (inCone || inCharge) {
      const how = inCharge ? 'charge' : 'flame';
      if (how === 'flame') th.flameId = player.flameId;
      let killed = false;
      if (kind === 'shield' && how === 'flame') this.events.push({ type: 'clink', x: th.x, y: th.y + 0.6, z: th.z });
      else if (kind === 'spiked' && how === 'charge') { if (alive) { this.hurt(player, th.x, th.z, 8); player.chargeT = 0; } }
      else if (kind === 'brute') {
        if (th.hitCool <= 0) { th.hp -= how === 'charge' ? 2 : 1; th.hitCool = 0.5; th.stun = 0.5; this.events.push({ type: 'hit', x: th.x, y: th.y + 1, z: th.z }); if (how === 'charge') player.chargeT = 0.001; killed = th.hp <= 0; }
      } else killed = true;
      if (killed) { this._kill(th, how); return; }
    }

    // movement
    th.stun = Math.max(0, th.stun - dt);
    const g0 = this.gy(th.x, th.z, th.y + 0.6);
    if (kind === 'spitter') {
      th.heading = Math.atan2(dxp, dzp);
      th.cool -= dt;
      const head = th.mesh.userData.head;
      if (dp < 15 && Math.abs(th.y - player.y) < 6) {
        const wind = Math.max(0, 0.45 - th.cool);
        head.scale.setScalar(1 + wind * 0.5);
        if (th.cool <= 0) {
          th.cool = 2.6; head.scale.setScalar(1);
          const b = { x: th.x, y: th.y + 1.0, z: th.z, life: 3.2, mesh: Props.makeBolt() };
          const dy = (player.y + 0.5) - b.y, dd = Math.hypot(dxp, dzp, dy) || 1, sp = 7.5;
          b.vx = dxp / dd * sp; b.vy = dy / dd * sp; b.vz = dzp / dd * sp;
          this.group.add(b.mesh); this.bolts.push(b); this.events.push({ type: 'spit', x: th.x, y: th.y + 1, z: th.z });
        }
      } else { th.cool = Math.max(th.cool, 0.8); head.scale.setScalar(1); }
      th.mesh.rotation.y = th.heading;
    } else if (kind === 'hopper') {
      th.cool -= dt;
      if (th.onGround !== false && th.y <= g0 + 0.02 && th.vy <= 0) {
        th.y = g0; th.vy = 0; th.onGround = true;
        if (th.cool <= 0 && th.stun <= 0) {
          const tgt = dp < 11 ? Math.atan2(dxp, dzp) : th.heading + rnd(-1, 1);
          th.heading = tgt; th.vy = 7.5; th.vx = Math.sin(tgt) * 4.2; th.vz = Math.cos(tgt) * 4.2; th.onGround = false; th.cool = rnd(1.0, 1.8);
          if (Math.hypot(th.x - th.hx, th.z - th.hz) > th.patrol) th.heading = Math.atan2(th.hx - th.x, th.hz - th.z);
        }
      } else {
        th.vy -= 24 * dt; th.y += th.vy * dt;
        const nx = th.x + th.vx * dt, nz = th.z + th.vz * dt;
        const s = w.sample(nx, nz);
        if (s.h - th.y < 0.5) { th.x = nx; th.z = nz; }
        const gg = this.gy(th.x, th.z, th.y + 0.6);
        if (th.vy < 0 && th.y <= gg) { th.y = gg; th.vy = 0; th.onGround = true; th.vx = th.vz = 0; }
      }
      th.mesh.rotation.y = th.heading;
    } else {
      // walkers
      th.timer -= dt;
      const isThief = kind === 'thief';
      const chase = !isThief && dp < 9 && Math.abs(th.y - player.y) < 3 && alive;
      const flee = isThief && dp < 12 && alive;
      if (chase) th.heading += angDiff(Math.atan2(dxp, dzp), th.heading) * Math.min(1, dt * 4);
      else if (flee) th.heading += angDiff(Math.atan2(-dxp, -dzp), th.heading) * Math.min(1, dt * 6);
      else if (th.timer <= 0) { th.timer = rnd(1.5, 3.5); th.heading = Math.random() * TAU; }
      if (!chase && Math.hypot(th.x - th.hx, th.z - th.hz) > th.patrol) {
        const home = Math.atan2(th.hx - th.x, th.hz - th.z);
        if (flee) th.heading += angDiff(home, th.heading) * Math.min(1, dt * 2.5); else th.heading = home;
      }
      const sp = th.stun > 0 ? 0 : d.speed * (chase ? 1.25 : flee ? 1.1 : isThief ? 0.5 : 0.7);
      const nx = th.x + Math.sin(th.heading) * sp * dt, nz = th.z + Math.cos(th.heading) * sp * dt;
      const s = w.sample(nx, nz);
      if (s.h - th.y > 0.45 || s.ny < P.walkN) { th.heading += Math.PI * rnd(0.6, 1.2); th.timer = 1; }
      else { th.x = nx; th.z = nz; }
      const tmp = { x: th.x, y: th.y, z: th.z };
      if (w.pushOut(tmp, th.r * 0.8, 0.8, 0.4)) { th.x = tmp.x; th.z = tmp.z; }
      th.y += (this.gy(th.x, th.z, th.y + 0.5) - th.y) * Math.min(1, dt * 20);
      th.mesh.rotation.y = th.heading;
      const u = th.mesh.userData;
      if (u.legs) { const sw = Math.sin(this.time * (sp > 0.1 ? 9 : 0)) * 0.12; u.legs[0].position.z = 0.1 + sw; u.legs[1].position.z = 0.1 - sw; }
      u.body.position.y = Math.abs(Math.sin(this.time * 9 + th.x)) * (sp > 0.1 ? 0.06 : 0);
    }
    th.mesh.position.set(th.x, th.y, th.z);

    // contact damage
    if (alive && dp < th.r + 0.42 && Math.abs(player.y - th.y) < 1.1 && !player.chargeT && kind !== 'spitter' && kind !== 'thief') this.hurt(player, th.x, th.z, 7);
    // stomp bounce: nothing in this game (Cinder cannot stomp)
  }

  _updateWick(dt, player) {
    const hp = this.state.hp, w = this.wick;
    w.visible = hp > 0 && this.dying <= 0;
    if (!w.visible) return;
    this.wickA += dt * 2.6;
    const a = this.wickA;
    const tx = player.x + Math.cos(a) * 0.85, ty = player.y + 1.35 + Math.sin(a * 1.7) * 0.18, tz = player.z + Math.sin(a) * 0.85;
    w.position.x += (tx - w.position.x) * Math.min(1, dt * 9); w.position.y += (ty - w.position.y) * Math.min(1, dt * 9); w.position.z += (tz - w.position.z) * Math.min(1, dt * 9);
    const u = w.userData, col = WICK_COLORS[hp];
    u.core.material.color.setHex(col); u.halo.material.color.setHex(col);
    const f = Math.sin(this.time * 40) * 0.8; u.wl.rotation.z = f; u.wr.rotation.z = -f;
    u.halo.material.opacity = this.invuln > 0 ? 0.5 + 0.5 * Math.sin(this.time * 30) : 1;
  }

  // ---- visuals each frame
  render() {
    const gm = this.gemMesh, m = this._m, q = this._q, s = this._s, p = this._p;
    const t = this.time, UP = this._up || (this._up = new THREE.Vector3(0, 1, 0));
    for (const g of this.gems) {
      if (g.state === 0) { s.set(0, 0, 0); p.set(0, -999, 0); }
      else {
        s.set(1, 1, 1);
        const bob = g.state === 1 ? Math.sin(t * 2.4 + g.phase) * 0.08 : 0;
        p.set(g.x, g.y + bob, g.z);
        q.setFromAxisAngle(UP, t * 1.8 + g.phase);
      }
      if (g.state === 0) q.identity();
      m.compose(p, q, s); gm.setMatrixAt(g.slot, m);
    }
    gm.instanceMatrix.needsUpdate = true;
    // chest lids
    for (const th of this.things) if (th.kind === 'chest') { const k = th.alive ? 0 : Math.min(1, (this.time - (th.openAt || 0)) / 0.6); th.mesh.userData.setOpen(k, this.time); if (th.alive) th.mesh.userData.shimmer(this.time); }
  }
}
