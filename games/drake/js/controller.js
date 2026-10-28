// Character controller (pure, no three.js). Fixed-step kinematic movement over a World.
// Units: metres, seconds. Forward vector of yaw a is (sin a, 0, cos a).

export const P = {
  radius: 0.42, height: 0.9,
  runSpeed: 8, groundRate: 16, airRate: 5,
  gravity: 32, maxFall: -38,
  jumpV: 11.2, jumpCut: 0.42, coyote: 0.12, buffer: 0.14,
  glideFall: -2.1, glideSpeed: 9.5, glideRate: 4, glideMinVy: 3,
  chargeSpeed: 19, chargeTime: 0.675, chargeTurn: 2.2, chargeCool: 0.45, chargeAirGrav: 0.3, carryTime: 1.1,
  flameTime: 0.28, flameCool: 0.3, flameSlow: 0.85,
  stepUp: 0.5, snapDown: 0.45, walkN: 0.64, slideSpeed: 9,
  bumpTime: 0.35, margin: 0.4,
};

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export class Player {
  constructor(world, x = 0, y = 0, z = 0, yaw = 0) {
    this.w = world;
    this.events = [];
    this._g = {}; this._wall = { nx: 0, nz: 0 };
    this.respawn(x, y, z, yaw);
  }

  respawn(x, y, z, yaw = 0) {
    this.x = x; this.y = y; this.z = z; this.yaw = yaw;
    this.px = x; this.py = y; this.pz = z; this.pyaw = yaw;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.onGround = false; this.sliding = false; this.gliding = false; this.jumping = false;
    this.coyote = 0; this.jumpBuf = 0;
    this.chargeT = 0; this.chargeCool = 0; this.chargeYaw = yaw; this.carryT = 0; this.bumpT = 0;
    this.flameT = 0; this.flameCool = 0; this.flameId = 0; this.stunT = 0;
    this.slideNx = 0; this.slideNz = 0; this.groundBox = null;
    this.airTime = 0; this.dead = false; this.updraft = 0; this.bumpFlag = null;
  }

  get speedH() { return Math.hypot(this.vx, this.vz); }
  get charging() { return this.chargeT > 0; }

  // inp: { mx, mz (world-space move vector, |.|<=1), jumpPressed, jumpHeld, flamePressed, chargePressed, frozen }
  step(dt, inp) {
    const w = this.w;
    this.px = this.x; this.py = this.y; this.pz = this.z; this.pyaw = this.yaw;
    this.events.length = 0;
    this.bumpFlag = null;

    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuf = Math.max(0, this.jumpBuf - dt);
    this.chargeCool = Math.max(0, this.chargeCool - dt);
    this.flameCool = Math.max(0, this.flameCool - dt);
    this.flameT = Math.max(0, this.flameT - dt);
    this.carryT = Math.max(0, this.carryT - dt);
    this.bumpT = Math.max(0, this.bumpT - dt);
    this.stunT = Math.max(0, this.stunT - dt);
    if (this.stunT > 0) inp = Object.assign({}, inp, { frozen: true, jumpPressed: false });
    if (inp.jumpPressed) this.jumpBuf = P.buffer;
    if (this.onGround) this.coyote = P.coyote;

    let mx = inp.frozen ? 0 : inp.mx, mz = inp.frozen ? 0 : inp.mz;
    const mag = Math.hypot(mx, mz);
    if (mag > 1) { mx /= mag; mz /= mag; }
    const hasIn = mag > 0.12;

    // ---- charge / flame start
    if (inp.chargePressed && !inp.frozen && this.chargeT <= 0 && this.chargeCool <= 0 && this.bumpT <= 0 && !this.sliding) {
      this.chargeT = P.chargeTime;
      this.chargeYaw = hasIn ? Math.atan2(mx, mz) : this.yaw;
      this.gliding = false;
      this.events.push({ type: 'charge' });
    }
    // press = instant flame; holding the button keeps breathing the moment the cooldown ends
    if ((inp.flamePressed || inp.flameHeld) && !inp.frozen && this.flameCool <= 0 && this.chargeT <= 0) {
      this.flameT = P.flameTime; this.flameCool = P.flameCool; this.flameId++;
      this.events.push({ type: 'flame' });
    }

    // ride a moving platform
    const gb = this.groundBox;
    if (gb && this.onGround && gb.move) { this.x += gb.dx; this.y += gb.dy; this.z += gb.dz; }

    // ---- horizontal velocity
    if (this.chargeT > 0) {
      this.chargeT -= dt;
      if (hasIn) {
        const want = Math.atan2(mx, mz);
        this.chargeYaw += clamp(angDiff(want, this.chargeYaw), -P.chargeTurn * dt, P.chargeTurn * dt);
      }
      this.vx = Math.sin(this.chargeYaw) * P.chargeSpeed;
      this.vz = Math.cos(this.chargeYaw) * P.chargeSpeed;
      this.yaw = this.chargeYaw;
      if (this.chargeT <= 0) this._endCharge(false);
    } else {
      let tx = 0, tz = 0, rate;
      const slow = this.flameT > 0 ? P.flameSlow : 1;
      if (this.sliding) {
        tx = this.slideNx * P.slideSpeed + mx * P.runSpeed * 0.3;
        tz = this.slideNz * P.slideSpeed + mz * P.runSpeed * 0.3;
        rate = 3;
      } else if (this.onGround) {
        tx = mx * P.runSpeed * slow; tz = mz * P.runSpeed * slow; rate = P.groundRate;
      } else if (this.gliding) {
        if (hasIn) { tx = mx * P.glideSpeed; tz = mz * P.glideSpeed; }
        else { tx = Math.sin(this.yaw) * P.glideSpeed * 0.55; tz = Math.cos(this.yaw) * P.glideSpeed * 0.55; }
        rate = this.carryT > 0 ? 1.1 : P.glideRate;
      } else {
        tx = mx * P.runSpeed * slow; tz = mz * P.runSpeed * slow;
        rate = this.carryT > 0 ? 1.0 : P.airRate;
      }
      const k = 1 - Math.exp(-rate * dt);
      if (this.stunT <= 0) { this.vx += (tx - this.vx) * k; this.vz += (tz - this.vz) * k; }
      if (this.speedH > 0.6 && !this.sliding && this.stunT <= 0) {
        const want = Math.atan2(this.vx, this.vz);
        this.yaw = this.onGround ? want : this.yaw + angDiff(want, this.yaw) * (1 - Math.exp(-14 * dt));
      } else if (this.sliding) {
        this.yaw = Math.atan2(-this.slideNx, -this.slideNz);
      }
    }

    // ---- jump / glide
    if (this.jumpBuf > 0 && (this.onGround || this.coyote > 0) && !this.sliding && !inp.frozen) {
      this.vy = P.jumpV; this.onGround = false; this.coyote = 0; this.jumpBuf = 0;
      this.jumping = true; this.groundBox = null;
      this.events.push({ type: 'jump' });
    } else if (inp.jumpPressed && !this.onGround && this.coyote <= 0 && this.vy < P.glideMinVy && !this.gliding && !inp.frozen) {
      this.gliding = true; this.jumpBuf = 0; this.chargeT > 0 && (this.chargeT = 0);
      this.events.push({ type: 'glide' });
    }
    if (this.jumping && !inp.jumpHeld && this.vy > 0) { this.vy *= P.jumpCut; this.jumping = false; }
    if (this.gliding && !inp.jumpHeld) { this.gliding = false; this.events.push({ type: 'glideEnd' }); }

    // ---- vertical velocity
    if (this.updraft > 0) {
      this.vy += (this.updraft - this.vy) * (1 - Math.exp(-4 * dt));
      if (this.onGround) { this.onGround = false; this.y += 0.02; }
      this.groundBox = null; this.updraft = 0;
    } else if (!this.onGround) {
      if (this.gliding) {
        this.vy += (P.glideFall - this.vy) * (1 - Math.exp(-6 * dt));
      } else {
        const g = this.chargeT > 0 ? P.gravity * P.chargeAirGrav : P.gravity;
        this.vy = Math.max(P.maxFall, this.vy - g * dt);
      }
      this.airTime += dt;
    } else { this.airTime = 0; }

    // ---- move
    const ox = this.x, oz = this.z;
    this._moveH(this.vx * dt, this.vz * dt);
    if (this.chargeT > 0) {
      const wanted = P.chargeSpeed * dt, got = Math.hypot(this.x - ox, this.z - oz);
      if (got < wanted * 0.35) {
        this.events.push({ type: 'bump', nx: this._wall.nx, nz: this._wall.nz });
        this.bumpFlag = { yaw: this.chargeYaw };
        this._endCharge(true);
      }
    }
    this._moveV(dt);

    // ---- bounds / kill
    const lim = P.radius;
    this.x = clamp(this.x, lim, w.size - lim); this.z = clamp(this.z, lim, w.size - lim);
    if (this.y < w.killY) { this.dead = true; this.events.push({ type: 'fall' }); }
  }

  // Spring pads and the like.
  bounce(vy) {
    this.vy = vy; this.onGround = false; this.sliding = false; this.gliding = false; this.jumping = false; this.groundBox = null; this.y += 0.05;
    this.events.push({ type: 'spring' });
  }

  // Knockback from a hit.
  knock(vx, vz, vy = 5, stun = 0.3) {
    this.vx = vx; this.vz = vz; this.vy = vy; this.onGround = false; this.sliding = false; this.gliding = false;
    this.chargeT = 0; this.stunT = stun; this.groundBox = null; this.jumping = false;
  }

  _endCharge(bumped) {
    this.chargeT = 0; this.chargeCool = P.chargeCool;
    if (bumped) {
      this.bumpT = P.bumpTime; this.vx = this._wall.nx * 4; this.vz = this._wall.nz * 4;
      if (this.vy < 4) this.vy = 4; this.onGround = false;
    } else if (!this.onGround) this.carryT = P.carryTime;
  }

  _moveH(dx, dz) {
    const w = this.w, r = P.radius;
    const len = Math.hypot(dx, dz);
    if (len < 1e-9) return;
    const ux = dx / len, uz = dz / len;
    const feet = this.y;
    for (let pass = 0; pass < 2; pass++) {
      const nx = this.x + dx, nz = this.z + dz;
      // terrain at the leading edge
      const s = w.sample(nx + ux * r, nz + uz * r);
      const up = s.h - feet;
      const steepBlock = s.ny < P.walkN && up > 0.25 * len;
      if (up > P.stepUp || steepBlock) {
        const gl = Math.hypot(s.gx, s.gz) || 1;
        const gxn = s.gx / gl, gzn = s.gz / gl;
        const dot = dx * gxn + dz * gzn;
        this._wall.nx = -gxn; this._wall.nz = -gzn;
        if (dot > 0) { dx -= dot * gxn; dz -= dot * gzn; }
        continue;
      }
      break;
    }
    // re-check once after sliding along the face
    {
      const nx = this.x + dx, nz = this.z + dz;
      const l2 = Math.hypot(dx, dz);
      if (l2 > 1e-9) {
        const s = w.sample(nx + dx / l2 * r, nz + dz / l2 * r);
        if (s.h - feet > P.stepUp || (s.ny < P.walkN && s.h - feet > 0.25 * l2)) { dx = 0; dz = 0; }
      }
    }
    this.x += dx; this.z += dz;
    const hit = w.pushOut(this, r, P.height, P.stepUp, this._wall);
    if (hit) { /* wall normal already written */ }
  }

  _moveV(dt) {
    const w = this.w, oldY = this.y;
    const was = this.onGround;
    let ny = oldY + this.vy * dt;
    const g = w.groundAt(this.x, this.z, oldY, P.stepUp, this._g);
    const snap = (was || this.sliding) && this.vy <= 0 ? P.snapDown : 0;

    if (this.vy > 0) {
      const c = w.ceilingAt(this.x, this.z, P.radius, oldY + P.height - 0.01, ny + P.height);
      if (c < Infinity) { ny = c - P.height; this.vy = 0; this.jumping = false; }
    }

    if (this.vy <= 0 && ny <= g.y + snap) {
      const impact = -this.vy;
      this.y = g.y;
      if (g.ny >= P.walkN) {
        this.onGround = true; this.sliding = false; this.vy = 0; this.gliding = false; this.jumping = false;
        this.groundBox = g.box;
        if (!was && impact > 4) this.events.push({ type: 'land', impact });
        if (!was && this.chargeT <= 0) this.carryT = Math.min(this.carryT, 0.2);
      } else {
        // steep: slide down the slope
        this.onGround = false; this.sliding = true; this.vy = 0; this.gliding = false;
        const l = Math.hypot(g.nx, g.nz) || 1;
        this.slideNx = g.nx / l; this.slideNz = g.nz / l;
      }
    } else {
      this.y = ny; this.onGround = false; this.sliding = false; this.groundBox = null;
    }
  }
}
