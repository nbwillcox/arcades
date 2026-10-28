// Third-person follow camera with collision, auto-follow, and first-person look.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

export const camSettings = { sens: 1.0, invertY: false, mouseSens: 0.0022 };

export class FollowCam {
  constructor(camera) {
    this.cam = camera;
    this.yaw = 0; this.pitch = 0.38; this.dist = 6.2; this.curDist = 6.2;
    this.idle = 0; this.target = new THREE.Vector3(); this.fp = false;
    this.fpYaw = 0; this.fpPitch = 0; this.first = true;
    this._pos = new THREE.Vector3();
  }

  snapTo(yaw) { this.yaw = yaw; this.pitch = 0.38; this.curDist = this.dist; this.idle = 0; this.first = true; }

  // p: { x,y,z, yaw, vx, vz, speedH, onGround }
  update(dt, p, inp, world) {
    const cs = camSettings;
    const wantFP = inp.lookHeld;
    if (wantFP && !this.fp) { this.fp = true; this.fpYaw = p.yaw; this.fpPitch = 0; }
    if (!wantFP && this.fp) { this.fp = false; this.yaw = this.fpYaw; this.idle = 0; }

    const iy = cs.invertY ? -1 : 1;
    let dyaw = -inp.csx * 2.6 * cs.sens * dt - inp.cdx * cs.mouseSens * cs.sens;
    let dpit = inp.csy * 1.8 * cs.sens * dt * iy + inp.cdy * cs.mouseSens * cs.sens * iy;

    if (this.fp) {
      this.fpYaw += dyaw; this.fpPitch = clamp(this.fpPitch + dpit, -1.2, 1.2);
      const cam = this.cam;
      cam.position.set(p.x - Math.sin(this.fpYaw) * 0.05, p.y + 0.85, p.z - Math.cos(this.fpYaw) * 0.05);
      const dir = new THREE.Vector3(Math.sin(this.fpYaw) * Math.cos(this.fpPitch), -Math.sin(this.fpPitch), Math.cos(this.fpYaw) * Math.cos(this.fpPitch));
      cam.lookAt(cam.position.clone().add(dir));
      return;
    }

    if (dyaw !== 0 || dpit !== 0) this.idle = 0; else this.idle += dt;
    this.yaw += dyaw;
    this.pitch = clamp(this.pitch + dpit, -0.15, 1.15);

    // re-centre on demand
    if (inp.recenterPressed) { this.yaw = p.yaw; this.idle = 0; this.pitch = 0.38; }

    // auto-follow behind the direction of travel
    const sp = Math.hypot(p.vx, p.vz);
    if (this.idle > 0.6 && sp > 2) {
      const want = Math.atan2(p.vx, p.vz);
      const d = angDiff(want, this.yaw);
      if (Math.abs(d) < 2.2) {
        const k = Math.min(1, sp / 8) * (p.onGround ? 1.5 : 0.9);
        this.yaw += d * (1 - Math.exp(-k * dt));
      }
    }
    // ease pitch toward a comfortable angle when not being controlled
    if (this.idle > 1.2) this.pitch += (0.38 - this.pitch) * (1 - Math.exp(-0.8 * dt));

    // target follows with a little vertical smoothing
    const ty = p.y + 0.9;
    if (this.first) { this.target.set(p.x, ty, p.z); this.first = false; }
    this.target.x = p.x; this.target.z = p.z;
    this.target.y += (ty - this.target.y) * (1 - Math.exp(-(p.onGround ? 7 : 4) * dt));
    if (Math.abs(this.target.y - ty) > 5) this.target.y = ty;

    const cp = Math.cos(this.pitch), sp2 = Math.sin(this.pitch);
    const dirx = Math.sin(this.yaw) * cp, diry = -sp2, dirz = Math.cos(this.yaw) * cp;
    const T = this.target;
    const wantDist = this.dist + sp * 0.04;
    const ex = T.x - dirx * wantDist, ey = T.y - diry * wantDist, ez = T.z - dirz * wantDist;
    const t = world.raycast(T.x, T.y, T.z, ex, ey, ez, 0.35);
    const allowed = Math.max(1.2, wantDist * t - 0.2);
    // pull in fast, ease out slowly
    if (allowed < this.curDist) this.curDist = allowed; else this.curDist += (allowed - this.curDist) * (1 - Math.exp(-3 * dt));
    const cam = this.cam;
    cam.position.set(T.x - dirx * this.curDist, T.y - diry * this.curDist, T.z - dirz * this.curDist);
    // never below ground
    const gh = world.sample(cam.position.x, cam.position.z).h + 0.3;
    if (cam.position.y < gh) cam.position.y = gh;
    cam.lookAt(T.x, T.y + 0.15, T.z);
  }
}
