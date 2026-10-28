// Sprite particle pool: flame, dust, sparkle.
import * as THREE from 'three';

function tex() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.7)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}

export class Fx {
  constructor(scene, count = 900) {
    this.t = tex();
    this.list = [];
    this.free = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.SpriteMaterial({ map: this.t, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const s = new THREE.Sprite(m); s.visible = false; scene.add(s);
      const p = { s, life: 0, max: 1, vx: 0, vy: 0, vz: 0, g: 0, s0: 1, s1: 0, drag: 0, r: 1, gc: 1, b: 1, add: true, active: false };
      this.list.push(p); this.free.push(p);
    }
  }

  emit(o) {
    const p = this.free.pop(); if (!p) return;
    p.active = true; p.life = p.max = o.life || 0.5;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0; p.g = o.g || 0; p.drag = o.drag || 0;
    p.s0 = o.s0 === undefined ? 0.4 : o.s0; p.s1 = o.s1 === undefined ? 0 : o.s1;
    p.r = o.r === undefined ? 1 : o.r; p.gc = o.gc === undefined ? 1 : o.gc; p.b = o.b === undefined ? 1 : o.b;
    const s = p.s; s.position.set(o.x, o.y, o.z); s.visible = true;
    s.material.blending = o.add === false ? THREE.NormalBlending : THREE.AdditiveBlending;
    s.material.opacity = 1; s.scale.setScalar(p.s0);
  }

  flame(x, y, z, dx, dz) {
    // hot white-yellow core streaming forward, orange body that billows wider, red tongues, rising smoke and embers
    const px = -dz, pz = dx; // sideways
    for (let i = 0; i < 2; i++) {
      const sp = 13 + Math.random() * 5;
      this.emit({ x, y, z, vx: dx * sp, vy: 0.2 + Math.random() * 0.4, vz: dz * sp, life: 0.3 + Math.random() * 0.1, s0: 0.22, s1: 0.6, r: 0.35, gc: 0.3, b: 0.05, drag: 1.2 });
    }
    for (let i = 0; i < 4; i++) {
      const sp = 9 + Math.random() * 6, w = (Math.random() - 0.5) * 3.2;
      this.emit({ x, y, z, vx: dx * sp + px * w, vy: (Math.random() - 0.3) * 1.6 + 0.5, vz: dz * sp + pz * w,
        life: 0.4 + Math.random() * 0.25, s0: 0.25, s1: 1.2, r: 1, gc: 0.35 + Math.random() * 0.3, b: 0.05, drag: 1.1, add: false });
    }
    this.emit({ x, y, z, vx: dx * 5 + (Math.random() - 0.5) * 2, vy: 1.4, vz: dz * 5 + (Math.random() - 0.5) * 2, life: 0.55, s0: 0.5, s1: 1.7, r: 0.85, gc: 0.18, b: 0.05, drag: 1.8 });
    if (Math.random() < 0.7) this.emit({ x: x + dx * 2, y, z: z + dz * 2, vx: dx * 4, vy: 2 + Math.random(), vz: dz * 4, life: 0.8, s0: 0.5, s1: 1.8, r: 0.4, gc: 0.38, b: 0.38, add: false, drag: 1.5 });
    if (Math.random() < 0.5) this.emit({ x, y, z, vx: dx * 8 + (Math.random() - 0.5) * 4, vy: 1 + Math.random() * 2, vz: dz * 8 + (Math.random() - 0.5) * 4, life: 0.6, s0: 0.14, s1: 0, r: 1, gc: 0.8, b: 0.3, g: 5, drag: 0.8 });
  }
  dust(x, y, z, n = 5, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283;
      this.emit({ x, y: y + 0.05, z, vx: Math.cos(a) * 1.5 * power, vy: 0.6 + Math.random() * 0.8, vz: Math.sin(a) * 1.5 * power,
        life: 0.4 + Math.random() * 0.2, s0: 0.25, s1: 0.7, r: 0.8, gc: 0.8, b: 0.7, add: false, drag: 3 });
    }
  }
  sparkle(x, y, z, n = 8, r = 1, g = 0.9, b = 0.4) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.283, e = Math.random() * 3.14 - 1.57;
      const sp = 2 + Math.random() * 3;
      this.emit({ x, y, z, vx: Math.cos(a) * Math.cos(e) * sp, vy: Math.sin(e) * sp + 1, vz: Math.sin(a) * Math.cos(e) * sp,
        life: 0.5 + Math.random() * 0.3, s0: 0.3, s1: 0, r, gc: g, b, g: 6, drag: 1 });
    }
  }

  update(dt) {
    for (const p of this.list) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; p.s.visible = false; this.free.push(p); continue; }
      const k = 1 - p.life / p.max;
      const d = Math.exp(-p.drag * dt);
      p.vx *= d; p.vz *= d; p.vy = p.vy * d - p.g * dt;
      const s = p.s; s.position.x += p.vx * dt; s.position.y += p.vy * dt; s.position.z += p.vz * dt;
      s.scale.setScalar(p.s0 + (p.s1 - p.s0) * k);
      s.material.color.setRGB(p.r, p.gc, p.b);
      s.material.opacity = 1 - k * k;
    }
  }
}
