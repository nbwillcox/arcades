// Flight level: Cinder flies along a ribbon path, steering inside a corridor.
// Rings to fly through, lanterns to flame, gems to collect, rocks to dodge. No fail state.
import * as THREE from 'three';
import { createDragon } from './art/dragon.js';
import { Fx } from './art/fx.js';
import * as Props from './art/props.js';
import { buildTerrainMesh } from './art/terrain.js';
import { buildDecor } from './art/decor.js';
import { vnoise, rng } from './levelgen.js';
import { Input } from './input.js';
import { Save } from './save.js';

const STEP = 1 / 120;
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Catmull-Rom path with an arc-length table.
class Path {
  constructor(pts) {
    this.curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, 'catmullrom', 0.5);
    this.N = 4000;
    this.lens = new Float32Array(this.N + 1);
    let prev = this.curve.getPoint(0), acc = 0;
    for (let i = 1; i <= this.N; i++) { const p = this.curve.getPoint(i / this.N); acc += p.distanceTo(prev); this.lens[i] = acc; prev = p; }
    this.length = acc;
    this._t = V(0, 0, 1); this._r = V(1, 0, 0); this._u = V(0, 1, 0); this._p = V(0, 0, 0);
  }
  tAt(s) { // arc length -> curve parameter
    s = Math.min(this.length, Math.max(0, s));
    let lo = 0, hi = this.N;
    while (lo < hi) { const m = (lo + hi) >> 1; if (this.lens[m] < s) lo = m + 1; else hi = m; }
    const i = Math.max(1, lo), a = this.lens[i - 1], b = this.lens[i];
    return (i - 1 + (b > a ? (s - a) / (b - a) : 0)) / this.N;
  }
  frame(s, out) {
    const t = this.tAt(s);
    this.curve.getPoint(t, out.pos); this.curve.getTangent(t, out.tan);
    out.right.crossVectors(out.tan, V(0, 1, 0)).normalize();
    out.up.crossVectors(out.right, out.tan).normalize();
    return out;
  }
}
const newFrame = () => ({ pos: V(0, 0, 0), tan: V(0, 0, 1), right: V(1, 0, 0), up: V(0, 1, 0) });

export class FlightSession {
  constructor(app, id) {
    this.app = app; this.id = id;
    const def = this.def = app.levels[id];
    this.spec = { id, name: def.name, world: def.world, kind: 'flight', theme: def.theme };
    this.time = 0; this.acc = 0; this.finished = false; this.started = 0;
    this.pending = { flamePressed: false, chargePressed: false };
    this.path = new Path(def.path);
    this.frame = newFrame(); this.tmpFrame = newFrame();
    this._build();
  }

  _build() {
    const def = this.def, th = def.theme;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(th.fog); scene.fog = new THREE.Fog(th.fog, th.fogNear, th.fogFar);
    scene.add(new THREE.HemisphereLight(th.hemiSky || 0xffffff, th.hemiGround || 0x7a8f6a, 0.9));
    const sun = new THREE.DirectionalLight(th.sun || 0xfff1d0, 1.0); sun.position.set(0.6, 1, 0.4); scene.add(sun);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(900, 24, 12), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(th.sky[0]) }, bot: { value: new THREE.Color(th.sky[1]) } },
      vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(0.0, 0.6, h)), 1.); }',
    }));
    scene.add(this.sky);

    // scenery heightfield under the path
    const pts = def.path, margin = 140;
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); z0 = Math.min(z0, p[2]); z1 = Math.max(z1, p[2]); }
    x0 -= margin; z0 -= margin; x1 += margin; z1 += margin;
    const cs = 3.5, nx = Math.ceil((x1 - x0) / cs), nz = Math.ceil((z1 - z0) / cs), n = Math.max(nx, nz);
    this.ox = x0; this.oz = z0;
    const W = n + 1, H = new Float32Array(W * W);
    const hf = def.height;
    for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) H[j * W + i] = hf(x0 + i * cs, z0 + j * cs);
    this.hf = hf;
    const wd = { n, cs, H };
    const terrain = buildTerrainMesh(wd, th); terrain.position.set(x0, 0, z0); scene.add(terrain);
    if (def.liquid) {
      const wm = new THREE.Mesh(new THREE.PlaneGeometry(n * cs * 1.5, n * cs * 1.5), new THREE.MeshLambertMaterial({ color: th.water || 0x3fb8ff, transparent: true, opacity: 0.75 }));
      wm.rotation.x = -Math.PI / 2; wm.position.set(x0 + n * cs / 2, def.liquid.y, z0 + n * cs / 2); scene.add(wm);
    }
    // decor: trees on low ground, clouds up high
    const r = rng(def.seed || 5), decor = [];
    for (let i = 0; i < 900; i++) {
      const x = x0 + r() * (x1 - x0), z = z0 + r() * (z1 - z0), h = hf(x, z);
      if (h < (def.liquid ? def.liquid.y + 0.6 : -9) || h > 14) continue;
      const g = Math.hypot(hf(x + 1, z) - hf(x - 1, z), hf(x, z + 1) - hf(x, z - 1)) / 2;
      if (g > 0.4) continue;
      decor.push({ k: r() < 0.6 ? 'tree' : r() < 0.5 ? 'roundtree' : 'rock', x, y: h, z, s: 0.9 + r() * 1.1, ry: r() * 6.28, v: r() });
    }
    scene.add(buildDecor({ decor }, th));
    this.clouds = [];
    const cm = new THREE.SpriteMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false, map: cloudTex() });
    for (let i = 0; i < 70; i++) {
      const s = new THREE.Sprite(cm); const sc = 30 + r() * 50; s.scale.set(sc * 1.8, sc, 1);
      s.position.set(x0 + r() * (x1 - x0), 70 + r() * 90, z0 + r() * (z1 - z0)); scene.add(s); this.clouds.push(s);
    }

    // course objects
    const frame = newFrame();
    const at = (s, ox = 0, oy = 0) => { this.path.frame(s, frame); return frame.pos.clone().addScaledVector(frame.right, ox).addScaledVector(frame.up, oy); };
    const ctx = { at, length: this.path.length, rng: rng((def.seed || 5) * 31 + 7), ground: hf };
    const items = def.objects(ctx);
    this.rings = []; this.targets = []; this.obstacles = []; this.gemList = [];
    for (const it of items) {
      if (it.t === 'ring') {
        const pos = at(it.s, it.ox, it.oy); this.path.frame(it.s, frame);
        const m = Props.makeFlightRing(it.r || 3.6);
        m.position.copy(pos); m.lookAt(pos.clone().add(frame.tan)); scene.add(m);
        this.rings.push({ s: it.s, pos, r: it.r || 3.6, mesh: m, done: false, missed: false });
      } else if (it.t === 'target') {
        const pos = at(it.s, it.ox, it.oy), heavy = !!it.heavy;
        const m = Props.makeFlightTarget(heavy); m.position.copy(pos); scene.add(m);
        this.targets.push({ pos, mesh: m, heavy, alive: true, t: Math.random() * 6 });
      } else if (it.t === 'rock') {
        const pos = at(it.s, it.ox, it.oy), m = Props.makeFlightRock(it.r || 2.2); m.position.copy(pos); scene.add(m);
        this.obstacles.push({ pos, r: it.r || 2.2, mesh: m });
      } else if (it.t === 'gem') {
        this.gemList.push({ pos: at(it.s, it.ox, it.oy), v: it.v || 1, on: true });
      }
    }
    this.gemMesh = Props.makeGemInstances(this.gemList.length + 8); scene.add(this.gemMesh);
    this.gemMesh.count = this.gemList.length;
    const c = new THREE.Color();
    this.gemList.forEach((g, i) => { c.setHex(Props.GEM_COLORS[g.v] || 0xffffff); this.gemMesh.setColorAt(i, c); g.i = i; });
    this.gemMesh.instanceColor.needsUpdate = true;
    this.gemTotalValue = this.gemList.reduce((a, g) => a + g.v, 0);

    this.fx = new Fx(scene);
    this.dragon = createDragon(); scene.add(this.dragon.root);

    // player state
    this.s = 0; this.vo = V(0, 0, 0); this.off = V(0, 0, 0); this.speed = 16;
    this.boost = 0; this.dash = 0; this.dashCool = 0; this.flameT = 0; this.bump = 0; this.roll = 0; this.pitch = 0; this.shake = 0;
    this.stats = { rings: 0, ringsTotal: this.rings.length, targets: 0, targetsTotal: this.targets.length, gems: 0 };
    this.pos = V(0, 0, 0); this.camPos = V(0, 0, 0); this.camLook = V(0, 0, 0); this.fov = 62; this.first = true;

    // a minimal "game" so the shared HUD keeps working
    const prog = Save.level(this.id);
    this.collected = new Set(prog.gemSlots || []);
    for (const g of this.gemList) if (this.collected.has(g.i)) { g.on = false; this.stats.gems += g.v; }
    this.game = {
      state: { gems: this.stats.gems, gemsTotal: this.gemTotalValue, hp: 0, lives: Infinity, elders: 0, eldersTotal: 1, sunstones: 0, sunstoneTotal: 0 },
      toastText: '', toastT: 0, dying: 0, events: [], toast(t, s = 3) { this.toastText = t; this.toastT = s; },
    };
    this.game.state.elders = (prog.elders || []).length;
    this.player = { x: 0, y: 0, z: 0, yaw: 0, vx: 0, vy: 0, vz: 0, speedH: 0, onGround: false };
    this.cam = { fp: false };
    this.game.toast('Fly through the rings! Flame the lanterns!', 4);
    this.ring = null;
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) { const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); }
    });
  }

  record(done) {
    const old = Save.level(this.id);
    const slots = []; for (const g of this.gemList) if (!g.on) slots.push(g.i);
    let val = 0; for (const g of this.gemList) if (!g.on) val += g.v;
    const st = this.stats, ok = st.rings >= st.ringsTotal * 0.6 && st.targets >= st.targetsTotal * 0.5;
    const elders = new Set(old.elders || []); if (done && ok) elders.add(0);
    return { gemSlots: slots, gems: val, gemsTotal: this.gemTotalValue, elders: [...elders], eldersTotal: 1, done: done || old.done, time: old.time ? Math.min(old.time, this.time) : this.time, sunstones: [],
      best: { rings: Math.max(st.rings, (old.best || {}).rings || 0), targets: Math.max(st.targets, (old.best || {}).targets || 0) } };
  }
  commit(done) { Save.commitLevel(this.id, this.record(done)); }

  // ---- stepping
  advance(dt, inp) {
    if (inp.flamePressed || (inp.flameHeld && this.flameT <= 0)) this.pending.flamePressed = true;
    if (inp.chargePressed) this.pending.chargePressed = true;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n++ < 12) { this.simStep(inp); this.acc -= STEP; }
    if (n >= 12) this.acc = 0;
    this.lastInp = inp;
  }

  simStep(inp) {
    const dt = STEP, def = this.def, P = this.path, f = this.frame;
    this.time += dt;
    if (this.game.toastT > 0) this.game.toastT -= dt;
    this.dashCool = Math.max(0, this.dashCool - dt); this.dash = Math.max(0, this.dash - dt); this.bump = Math.max(0, this.bump - dt);
    this.flameT = Math.max(0, this.flameT - dt); this.shake = Math.max(0, this.shake - dt);
    const lateralMax = def.corridor ? def.corridor[0] : 18, up = def.corridor ? def.corridor[1] : 10;

    // controls
    if (this.pending.chargePressed && this.dashCool <= 0) { this.dash = 0.41; this.dashCool = 1.2; this.app.sfx && this.app.sfx('charge'); this.fx.dust(this.pos.x, this.pos.y, this.pos.z, 8, 1.4); }
    if (this.pending.flamePressed && this.flameT <= 0) { this.flameT = 0.28; this.app.sfx && this.app.sfx('flame'); }
    this.pending.chargePressed = this.pending.flamePressed = false;
    const boosting = inp.jumpHeld;
    const target = this.dash > 0 ? 36 : boosting ? 25 : 16;
    this.speed += (target * (this.bump > 0 ? 0.55 : 1) - this.speed) * (1 - Math.exp(-4 * dt));
    this.s += this.speed * dt;

    const tx = inp.mx * 15, ty = -(-inp.my) * 9; // stick up = climb
    const wantY = inp.my * 9;
    this.vo.x += (tx - this.vo.x) * (1 - Math.exp(-5 * dt));
    this.vo.y += (wantY - this.vo.y) * (1 - Math.exp(-5 * dt));
    this.off.x += this.vo.x * dt; this.off.y += this.vo.y * dt;
    this.off.x = Math.max(-lateralMax, Math.min(lateralMax, this.off.x));
    this.off.y = Math.max(-up * 0.6, Math.min(up, this.off.y));

    P.frame(Math.min(this.s, P.length), f);
    this.pos.copy(f.pos).addScaledVector(f.right, this.off.x).addScaledVector(f.up, this.off.y);
    // terrain: never below ground
    const gh = this.hf(this.pos.x, this.pos.z) + 1.6;
    if (this.pos.y < gh) { this.off.y += gh - this.pos.y; this.pos.y = gh; this.vo.y = Math.max(0, this.vo.y); }
    this.roll += (-this.vo.x * 0.045 - this.roll) * (1 - Math.exp(-8 * dt));
    this.pitch += (this.vo.y * 0.05 - this.pitch) * (1 - Math.exp(-8 * dt));

    const px = this.pos.x, py = this.pos.y, pz = this.pos.z;
    // gems
    for (const g of this.gemList) {
      if (!g.on) continue;
      const dx = g.pos.x - px, dy = g.pos.y - py, dz = g.pos.z - pz;
      if (dx * dx + dy * dy + dz * dz < 2.9) { g.on = false; this.stats.gems += g.v; this.game.state.gems = this.stats.gems; this.fx.sparkle(g.pos.x, g.pos.y, g.pos.z, 4, 1, 0.9, 0.4); this.app.sfx && this.app.sfx('gem', { v: g.v }); Input.rumble(0.05, 0.15, 40); }
    }
    // rings
    for (const rg of this.rings) {
      if (rg.done || rg.missed) continue;
      if (this.s >= rg.s) {
        const d = rg.pos.distanceTo(this.pos);
        if (d < rg.r * 1.05) { rg.done = true; this.stats.rings++; rg.mesh.userData.hit(); this.fx.sparkle(rg.pos.x, rg.pos.y, rg.pos.z, 14, 0.4, 1, 0.8); this.app.sfx && this.app.sfx('ring'); Input.rumble(0.3, 0.5, 90); }
        else { rg.missed = true; rg.mesh.userData.miss(); }
      }
    }
    // flame cone and dash vs targets
    const fwd = f.tan;
    for (const t of this.targets) {
      if (!t.alive) continue;
      const tx_ = t.pos.x - px, ty_ = t.pos.y - py, tz_ = t.pos.z - pz;
      const along = tx_ * fwd.x + ty_ * fwd.y + tz_ * fwd.z;
      const d2 = tx_ * tx_ + ty_ * ty_ + tz_ * tz_;
      const lat2 = d2 - along * along;
      const flameHit = this.flameT > 0 && !t.heavy && along > 1 && along < 22 && lat2 < Math.pow(3.2 + along * 0.25, 2);
      const dashHit = this.dash > 0 && d2 < 7;
      const heavyFlame = this.flameT > 0 && t.heavy && along > 1 && along < 22 && lat2 < 9 && (t.heat = (t.heat || 0) + dt) > 0.28;
      if (flameHit || dashHit || heavyFlame) {
        t.alive = false; t.mesh.visible = false; this.stats.targets++;
        this.fx.sparkle(t.pos.x, t.pos.y, t.pos.z, 18, 1, 0.65, 0.2);
        this.app.sfx && this.app.sfx('kill');
        Input.rumble(0.3, 0.4, 80);
        // reward gems burst
        this.stats.gems += 2; this.game.state.gems = this.stats.gems;
      }
    }
    // obstacles
    for (const o of this.obstacles) {
      const dx = o.pos.x - px, dy = o.pos.y - py, dz = o.pos.z - pz, rr = o.r + 0.9;
      if (dx * dx + dy * dy + dz * dz < rr * rr && this.bump <= 0) {
        if (this.dash > 0) { o.mesh.visible = false; o.r = -5; this.fx.dust(o.pos.x, o.pos.y, o.pos.z, 12, 2); this.app.sfx && this.app.sfx('break'); }
        else {
          this.bump = 1.0; this.shake = 0.3; this.vo.x = (px - o.pos.x) > 0 ? 12 : -12; this.vo.y = (py - o.pos.y) > 0 ? 6 : -6;
          this.fx.sparkle(px, py, pz, 8, 1, 0.5, 0.3); this.app.sfx && this.app.sfx('hurt'); Input.rumble(0.8, 0.8, 200);
        }
      }
    }
    if (this.flameT > 0) this.fx.flame(px + fwd.x * 1.2, py + fwd.y * 1.2 - 0.1, pz + fwd.z * 1.2, fwd.x, fwd.z);

    // finish
    if (!this.finished && this.s >= P.length) { this.finished = true; this.app.onFlightDone(this); }
    // keep HUD state alive
    this.player.x = px; this.player.y = py; this.player.z = pz;
  }

  render(dt) {
    const f = this.frame, P = this.path, cam = this.app.camera;
    const t = this.time;
    const d = this.dragon;
    d.root.position.copy(this.pos);
    // orientation: face along the path with roll/pitch
    const yaw = Math.atan2(f.tan.x, f.tan.z), pitch = -Math.asin(Math.max(-1, Math.min(1, f.tan.y)));
    d.root.rotation.set(pitch * 0.6 + this.pitch * 0.5, yaw, this.roll + Math.sin(t * 2.4) * 0.03, 'YXZ');
    d.root.rotation.order = 'YXZ';
    d.update(dt, { vx: 0, vy: 0, vz: 12, onGround: false, sliding: false, gliding: true, charging: this.dash > 0, flaming: this.flameT > 0, yawRate: 0 });
    d.root.position.y -= 0.35;

    // chase camera
    const back = 7.5 + (this.speed - 16) * 0.12;
    const camTarget = V(0, 0, 0).copy(this.pos).addScaledVector(f.tan, -back).addScaledVector(f.up, 2.6 - this.off.y * 0.05).addScaledVector(f.right, this.off.x * -0.12);
    if (this.first) { this.camPos.copy(camTarget); this.first = false; }
    this.camPos.lerp(camTarget, 1 - Math.exp(-7 * dt));
    const look = V(0, 0, 0).copy(this.pos).addScaledVector(f.tan, 9).addScaledVector(f.right, this.off.x * 0.1);
    this.camLook.lerp(look, 1 - Math.exp(-9 * dt));
    cam.position.copy(this.camPos);
    if (this.shake > 0) cam.position.add(V((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4).multiplyScalar(this.shake * 3));
    cam.lookAt(this.camLook);
    const fovT = 62 + (this.speed - 16) * 0.6;
    this.fov += (fovT - this.fov) * (1 - Math.exp(-5 * dt));
    if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }

    this.fx.update(dt);
    // gems
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), up = V(0, 1, 0);
    for (const g of this.gemList) {
      if (g.on) { s.set(1, 1, 1); q.setFromAxisAngle(up, t * 2 + g.i); m.compose(g.pos, q, s); } else { s.set(0, 0, 0); m.compose(g.pos, q.identity(), s); }
      this.gemMesh.setMatrixAt(g.i, m);
    }
    this.gemMesh.instanceMatrix.needsUpdate = true;
    for (const tg of this.targets) if (tg.alive) { tg.mesh.position.y = tg.pos.y + Math.sin(t * 2 + tg.t) * 0.25; tg.mesh.userData.spin && tg.mesh.userData.spin(t); }
    for (const rg of this.rings) rg.mesh.userData.tick && rg.mesh.userData.tick(t);
    for (const c of this.clouds) { c.position.x += dt * 1.2; }
    this.sky.position.copy(cam.position);
    this.game.state.gems = this.stats.gems;
  }
}

function cloudTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 9; i++) {
    const x = 20 + Math.random() * 88, y = 22 + Math.random() * 22, r = 14 + Math.random() * 16;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 64);
  }
  return new THREE.CanvasTexture(c);
}
export { STEP };
