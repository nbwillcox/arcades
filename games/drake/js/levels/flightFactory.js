// Flight level factory: a winding ribbon path over generated scenery, with rings, lanterns, gems and rocks.
import { vnoise, rng } from '../levelgen.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const TERRAIN = {
  hills: (x, z, s) => {
    let h = 7 + (vnoise(x * 0.012, z * 0.012, s) - 0.5) * 26 + (vnoise(x * 0.04, z * 0.04, s + 4) - 0.5) * 7;
    const rv = Math.abs(z - (250 + Math.sin(x * 0.011) * 90)); h -= (1 - sm(14, 44, rv)) * 12; return h;
  },
  volcanic: (x, z, s) => {
    const n = vnoise(x * 0.016, z * 0.016, s), r = 1 - Math.abs(n - 0.5) * 2;
    let h = 4 + r * r * 34 + (vnoise(x * 0.05, z * 0.05, s + 3) - 0.5) * 8;
    const rv = Math.abs(z - (260 + Math.sin(x * 0.013) * 100)); h -= (1 - sm(10, 40, rv)) * 22; return h;
  },
  clouds: (x, z, s) => -14 + vnoise(x * 0.02, z * 0.02, s) * 5 + Math.max(0, vnoise(x * 0.01, z * 0.01, s + 9) - 0.78) * 90,
  caves: (x, z, s) => {
    let h = 6 + (vnoise(x * 0.015, z * 0.015, s) - 0.5) * 22 + (vnoise(x * 0.06, z * 0.06, s + 2) - 0.5) * 6;
    h += Math.max(0, vnoise(x * 0.03, z * 0.03, s + 7) - 0.62) * 60; return h;
  },
};

export function makeFlight(o) {
  const r = rng(o.seed * 31 + 5);
  // meandering path: steps of ~100 m with bounded turning
  const pts = []; let x = 60, z = 60, ang = 0.5;
  const N = o.points || 13;
  const hf = (xx, zz) => TERRAIN[o.terrain || 'hills'](xx, zz, o.seed);
  for (let i = 0; i < N; i++) {
    const g = hf(x, z), clear = o.clearance ? o.clearance[0] + r() * (o.clearance[1] - o.clearance[0]) : 24 + r() * 14;
    pts.push([x, Math.max(g, o.liquid ? o.liquid.y : -99) + clear, z]);
    ang += (r() - 0.5) * 1.1 + Math.sin(i * 0.9) * 0.25;
    // keep inside 40..640
    if (x > 560) ang += 0.8; if (x < 120 && i > 2) ang -= 0.4;
    if (z > 560) ang -= 0.7 * Math.sign(Math.cos(ang) || 1); if (z < 80 && i > 1) ang += 0.5;
    const step = 90 + r() * 30;
    x += Math.cos(ang) * step; z += Math.sin(ang) * step;
  }
  return {
    id: o.id, name: o.name, world: o.world, kind: 'flight', seed: o.seed, music: o.music || 'flight', theme: o.theme,
    liquid: o.liquid, corridor: o.corridor || [20, 11], path: pts,
    height: (xx, zz) => hf(xx, zz),
    objects(c) {
      const out = [], L = c.length, rr = c.rng, ph = o.seed;
      const weave = (s) => [Math.sin(s * 0.021 + ph) * 10, Math.sin(s * 0.0135 + 1 + ph) * 4.2];
      let n = 0;
      for (let s = 70; s < L - 40; s += o.ringGap || 52) {
        const [ox, oy] = weave(s);
        out.push({ t: 'ring', s, ox, oy, r: 3.8 });
        for (let k = 1; k <= 8; k++) { const ss = s - (o.ringGap || 52) + k * 5.5, [gx, gy] = weave(ss); out.push({ t: 'gem', s: ss, ox: gx, oy: gy, v: (n % 6 === 5 && k === 4) ? 5 : 1 }); }
        n++;
      }
      for (let s = 95, i = 0; s < L - 60; s += 63, i++) { const [ox, oy] = weave(s); out.push({ t: 'target', s, ox: ox + (i % 2 ? 6 : -6), oy: oy + (rr() - 0.5) * 3, heavy: i % 6 === 5 }); }
      for (let s = 150; s < L - 80; s += o.rockGap || 97) { const [ox, oy] = weave(s); out.push({ t: 'rock', s, ox: -Math.sign(ox || 1) * 7, oy, r: 2.2 }); }
      for (let k = 0; k < 14; k++) { const s = L - 150 + k * 6, [gx] = weave(s); out.push({ t: 'gem', s, ox: gx, oy: 6 - k * 0.5, v: 2 }); }
      return out;
    },
  };
}
