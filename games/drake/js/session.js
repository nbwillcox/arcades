// A loaded ground level (also used for hubs): world, meshes, player, game logic, camera.
import * as THREE from 'three';
import { Player } from './controller.js';
import { FollowCam } from './camera.js';
import { buildSpec } from './levelgen.js';
import { makeWorld } from './levelfill.js';
import { buildTerrainMesh, buildBoxMeshes } from './art/terrain.js';
import { buildDecor } from './art/decor.js';
import { buildBridges } from './art/bridges.js';
import { createDragon } from './art/dragon.js';
import { Fx } from './art/fx.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { Save } from './save.js';
import { LEVELS } from './levels/index.js';

const STEP = 1 / 120;

export class Session {
  constructor(app, id, opts = {}) {
    this.app = app; this.id = id; this.opts = opts;
    const def = LEVELS[id];
    if (!def) throw new Error('unknown level ' + id);
    this.def = def;
    this.spec = buildSpec(def);
    this.world = makeWorld(this.spec);
    this.kind = this.spec.kind;
    this.time = 0; this.acc = 0;
    this.pending = { jumpPressed: false, flamePressed: false, chargePressed: false };
    this.finished = false;
    this._build();
  }

  _build() {
    const { spec, world } = this;
    const th = spec.theme;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(th.fog);
    scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
    scene.add(new THREE.HemisphereLight(th.hemiSky || 0xffffff, th.hemiGround || 0x7a8f6a, th.hemi === undefined ? 0.85 : th.hemi));
    const sun = new THREE.DirectionalLight(th.sun || 0xfff1d0, th.sunI === undefined ? 1.0 : th.sunI); sun.position.set(0.6, 1, 0.4); scene.add(sun);

    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(th.sky[0]) }, bot: { value: new THREE.Color(th.sky[1]) } },
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(0.0, 0.7, h)), 1.); }',
    }));
    sky.renderOrder = -1; scene.add(sky); this.sky = sky;

    this.terrain = buildTerrainMesh(world, th); scene.add(this.terrain);
    this.boxGroup = new THREE.Group(); scene.add(this.boxGroup); buildBoxMeshes(world, this.boxGroup);
    this.decor = buildDecor(spec, th); scene.add(this.decor);
    scene.add(buildBridges(spec, spec.def.bridgeColor));
    if (spec.liquid) {
      const cloud = spec.liquid.kind === 'cloud';
      const lc = spec.liquid.kind === 'lava' ? 0xff6a2a : cloud ? 0xf4f8ff : (th.water || 0x3fb8ff);
      const wm = new THREE.Mesh(new THREE.PlaneGeometry(spec.size * 6, spec.size * 6), new THREE.MeshLambertMaterial({ color: lc, transparent: true, opacity: spec.liquid.kind === 'lava' ? 0.95 : cloud ? 0.97 : 0.74, emissive: spec.liquid.kind === 'lava' ? 0xaa3300 : cloud ? 0x8a9ab8 : 0x0a2a44 }));
      wm.rotation.x = -Math.PI / 2; wm.position.set(spec.size / 2, spec.liquid.y, spec.size / 2); scene.add(wm); this.water = wm;
    }

    const prog = Save.level(this.id);
    this.game = new Game({ scene, world, spec, settings: Save.cur ? Save.cur.settings : { cozy: true }, prog, totals: Save.totals() });
    this.fx = new Fx(scene);

    // spawn: normal start, or beside the portal we arrived from (hubs)
    let sp = spec.spawn.slice();
    if (this.opts.fromLevel) {
      const por = spec.entities.find((e) => e.t === 'portal' && e.target === this.opts.fromLevel);
      if (por) { const a = por.yaw !== undefined ? por.yaw : 0; sp = [por.x + Math.sin(a) * 3.2, 0, por.z + Math.cos(a) * 3.2, a]; sp[1] = world.groundAt(sp[0], sp[2], 999, 0).y + 0.15; }
    }
    this.player = new Player(world, sp[0], sp[1], sp[2], sp[3]);
    this.game.checkpoint = { x: sp[0], y: sp[1], z: sp[2], yaw: sp[3] };
    this.game.safe = { ...this.game.checkpoint };
    this.dragon = createDragon(); scene.add(this.dragon.root);
    this.shadow = new THREE.Mesh(new THREE.CircleGeometry(0.5, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
    this.shadow.rotation.x = -Math.PI / 2; scene.add(this.shadow);
    this.cam = new FollowCam(this.app.camera); this.cam.snapTo(sp[3]);
    if (spec.kind === 'hub' && Save.cur) Save.cur.hub = this.id;
    this._gg = {};
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); }
    });
  }

  // ---- progress
  record(done) {
    const g = this.game, S = g.state;
    let val = 0; const slots = [];
    for (const gem of g.gems) if (gem.state === 0 && g.collected.has(gem.slot)) { val += gem.v; slots.push(gem.slot); }
    const old = Save.level(this.id);
    return { gemSlots: slots, gems: val, gemsTotal: S.gemsTotal, elders: [...g.eldersFound], eldersTotal: S.eldersTotal, done: done || old.done, time: old.time ? Math.min(old.time, this.time) : this.time, sunstones: [...g.sunFound] };
  }
  commit(done) { Save.commitLevel(this.id, this.record(done)); }

  // ---- stepping
  advance(dt, inp) {
    if (inp.flamePressed) this.pending.flamePressed = true;
    if (inp.jumpPressed) this.pending.jumpPressed = true;
    if (inp.chargePressed) this.pending.chargePressed = true;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n++ < 12) { this.simStep(inp); this.acc -= STEP; }
    if (n >= 12) this.acc = 0;
    this.lastInp = inp;
  }

  simStep(inp) {
    const { cam, player, game, world, pending } = this;
    let held = inp.jumpHeld;
    if (Save.settings.glideToggle) {
      this.latchT = Math.max(0, (this.latchT || 0) - STEP);
      if (this.latch && (player.onGround || (pending.jumpPressed && this.latchT <= 0))) this.latch = false;
      else if (!this.latch && player.gliding) { this.latch = true; this.latchT = 0.3; }
      held = held || this.latch;
    }
    const yaw = cam.fp ? 0 : cam.yaw;
    const fx_ = Math.sin(yaw), fz_ = Math.cos(yaw), rx = -Math.cos(yaw), rz = Math.sin(yaw);
    const move = {
      mx: fx_ * inp.my + rx * inp.mx, mz: fz_ * inp.my + rz * inp.mx,
      jumpPressed: pending.jumpPressed, jumpHeld: held,
      flamePressed: pending.flamePressed, flameHeld: inp.flameHeld, chargePressed: pending.chargePressed, frozen: inp.lookHeld || game.dying > 0 || this.finished,
    };
    pending.jumpPressed = pending.flamePressed = pending.chargePressed = false;
    world.updateBoxes(STEP);
    const prevYaw = player.yaw;
    player.step(STEP, move);
    player.yawRate = Math.atan2(Math.sin(player.yaw - prevYaw), Math.cos(player.yaw - prevYaw)) / STEP;
    for (const e of player.events) this.onPlayerEvent(e);
    game.update(STEP, player);
    for (const e of game.events) this.onGameEvent(e);
    game.events.length = 0;
    if (player.flameT > 0) {
      const nx = Math.sin(player.yaw), nz = Math.cos(player.yaw);
      this.fx.flame(player.x + nx * 0.8, player.y + 0.62, player.z + nz * 0.8, nx, nz);
    }
    this.time += STEP;
  }

  onPlayerEvent(e) {
    const { fx, player, dragon } = this;
    switch (e.type) {
      case 'jump': dragon.pulse('jump'); fx.dust(player.x, player.y, player.z, 4, 0.8); Input.rumble(0.1, 0.2, 50); break;
      case 'land': dragon.pulse('land'); fx.dust(player.x, player.y, player.z, Math.min(10, 4 + (e.impact | 0)), 1 + e.impact * 0.05); Input.rumble(Math.min(0.6, e.impact * 0.03), 0.3, 80); break;
      case 'charge': fx.dust(player.x, player.y, player.z, 8, 1.3); Input.rumble(0.3, 0.6, 120); break;
      case 'bump': fx.sparkle(player.x + Math.sin(player.yaw) * 0.6, player.y + 0.5, player.z + Math.cos(player.yaw) * 0.6, 12, 1, 0.9, 0.4); Input.rumble(0.8, 0.8, 160); break;
      case 'flame': { const nx = Math.sin(player.yaw), nz = Math.cos(player.yaw); for (let i = 0; i < 4; i++) fx.flame(player.x + nx * 0.8, player.y + 0.62, player.z + nz * 0.8, nx, nz); Input.rumble(0.0, 0.4, 110); break; }
    }
    this.app.sfx && this.app.sfx(e.type, e, this);
  }

  onGameEvent(e) {
    const { fx, player, game } = this;
    switch (e.type) {
      case 'gem': fx.sparkle(e.x, e.y, e.z, 4, ...(e.v >= 10 ? [1, 0.8, 0.3] : e.v >= 5 ? [0.4, 0.7, 1] : e.v >= 2 ? [0.4, 1, 0.55] : [1, 0.4, 0.5])); Input.rumble(0.05, 0.12, 40); break;
      case 'break': fx.dust(e.x, e.y - 0.3, e.z, 10, 1.5); fx.sparkle(e.x, e.y, e.z, 6, 1, 0.7, 0.3); Input.rumble(0.3, 0.3, 70); break;
      case 'chest': fx.sparkle(e.x, e.y + 0.4, e.z, 30, 1, 0.85, 0.3); fx.sparkle(e.x, e.y + 0.8, e.z, 14, 1, 1, 0.8); fx.dust(e.x, e.y - 0.3, e.z, 6, 1.2); Input.rumble(0.4, 0.6, 200); break;
      case 'kill': fx.sparkle(e.x, e.y, e.z, 14, 1, 0.55, 0.25); fx.dust(e.x, e.y - 0.4, e.z, 6, 1.2); Input.rumble(0.4, 0.5, 100); break;
      case 'hurt': fx.sparkle(player.x, player.y + 0.6, player.z, 10, 1, 0.3, 0.3); Input.rumble(0.9, 0.9, 220); break;
      case 'heal': fx.sparkle(player.x, player.y + 1.2, player.z, 12, 1, 0.9, 0.4); break;
      case 'moth': fx.sparkle(e.x, e.y, e.z, 10, 0.5, 1, 1); break;
      case 'rescue': fx.sparkle(e.x, e.y, e.z, 40, 0.5, 0.95, 1); fx.sparkle(e.x, e.y, e.z, 20, 1, 0.85, 0.4); Input.rumble(0.5, 0.8, 300); break;
      case 'checkpoint': fx.sparkle(player.x, player.y + 1, player.z, 16, 1, 0.85, 0.4); break;
      case 'zap': fx.sparkle(e.x, e.y, e.z, 5, 1, 0.4, 0.7); break;
      case 'clink': fx.sparkle(e.x, e.y, e.z, 5, 0.9, 0.9, 1); break;
      case 'hit': fx.sparkle(e.x, e.y, e.z, 8, 1, 0.8, 0.3); break;
      case 'splash': fx.dust(e.x, e.y, e.z, 14, 2); fx.sparkle(e.x, e.y + 0.3, e.z, 10, 0.5, 0.8, 1); break;
      case 'respawn': this.cam.snapTo(game.checkpoint.yaw); break;
      case 'exit': this.finished = true; this.app.onExit(this); break;
      case 'gameover': this.app.onGameOver(this); break;
      case 'ending': this.finished = true; this.app.onEnding(this); break;
      case 'portal': this.app.onPortal(this, e.target); break;
    }
    this.app.sfx && this.app.sfx(e.type, e, this);
  }

  // ---- drawing
  render(dt, alpha) {
    const { player, dragon, world, game, cam, shadow, fx } = this;
    const lerp = (a, b) => a + (b - a) * alpha;
    const rx = lerp(player.px, player.x), ry = lerp(player.py, player.y), rz = lerp(player.pz, player.z);
    let dy = player.yaw - player.pyaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    const ryaw = player.pyaw + dy * alpha;
    dragon.root.position.set(rx, ry, rz); dragon.root.rotation.y = ryaw;
    dragon.update(dt, {
      vx: player.vx, vy: player.vy, vz: player.vz, onGround: player.onGround, sliding: player.sliding,
      gliding: player.gliding, charging: player.charging, flaming: player.flameT > 0, yawRate: player.yawRate || 0,
    });
    const gnd = world.groundAt(rx, rz, ry + 0.5, 0.6, this._gg);
    shadow.position.set(rx, gnd.y + 0.04, rz);
    const hh = Math.max(0, ry - gnd.y);
    shadow.scale.setScalar(Math.max(0.35, 1 - hh * 0.06));
    shadow.material.opacity = Math.max(0.1, 0.38 - hh * 0.02);
    for (const b of world.moving) b.mesh.position.set((b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, (b.min[2] + b.max[2]) / 2);
    const inp = this.lastInp || Input.state;
    cam.update(dt, { x: rx, y: ry, z: rz, yaw: ryaw, vx: player.vx, vz: player.vz, onGround: player.onGround }, this.app.camLocked ? { ...inp, csx: 0, csy: 0, cdx: 0, cdy: 0, lookHeld: false } : inp, world);
    fx.update(dt);
    if (this.decor.userData.update) this.decor.userData.update(this.time);
    game.render();
    const cam3 = this.app.camera;
    if (this.freeCam) { cam3.position.set(...this.freeCam.pos); cam3.lookAt(...this.freeCam.look); }
    this.sky.position.copy(cam3.position);
    if (this.water) { this.water.material.opacity = (this.spec.liquid.kind === 'lava' ? 0.93 : 0.7) + Math.sin(this.time * 1.5) * 0.03; }
  }
}
export { STEP };
