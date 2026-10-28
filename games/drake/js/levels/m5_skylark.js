// Mossgate Meadows flight level: Skylark Run. Fly the ribbon, loop the rings, flame the lanterns.
import { vnoise } from '../levelgen.js';

const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export default {
  id: 'm5_skylark', name: 'Skylark Run', world: 'mossgate', kind: 'flight', seed: 51, music: 'flight',
  theme: {
    grass: 0x5fcf72, grass2: 0x86e096, rock: 0x9aa2b5, sand: 0xe6d79b, sandBelow: 1.2,
    sky: [0x2f86ff, 0xcdeeff], fog: 0xd2f0ff, fogNear: 120, fogFar: 520, water: 0x3fb8ff,
    palette: { leaf: 0x2fae5a, leaf2: 0x46c870, trunk: 0x8a5a33 },
  },
  liquid: { y: 1.4 },
  corridor: [20, 11],
  path: [[60, 34, 60], [160, 40, 70], [260, 46, 110], [330, 40, 190], [300, 34, 280], [210, 42, 330], [130, 52, 400], [160, 44, 490], [260, 38, 520], [370, 48, 500], [470, 42, 430], [540, 52, 350], [610, 44, 250]],
  height(x, z) {
    let h = 7 + (vnoise(x * 0.012, z * 0.012, 5) - 0.5) * 26 + (vnoise(x * 0.04, z * 0.04, 9) - 0.5) * 7;
    const rv = Math.abs(z - (250 + Math.sin(x * 0.011) * 90)); // a winding river valley
    h -= (1 - sm(14, 44, rv)) * 12;
    return h;
  },
  objects(c) {
    const out = [], L = c.length, r = c.rng;
    const weave = (s) => [Math.sin(s * 0.021) * 10, Math.sin(s * 0.0135 + 1) * 4.2];
    let n = 0;
    for (let s = 70; s < L - 40; s += 52) {
      const [ox, oy] = weave(s);
      out.push({ t: 'ring', s, ox, oy, r: 3.8 });
      // gem arc leading to the ring
      for (let k = 1; k <= 8; k++) { const ss = s - 52 + k * 5.5, [gx, gy] = weave(ss); out.push({ t: 'gem', s: ss, ox: gx, oy: gy, v: (n % 6 === 5 && k === 4) ? 5 : 1 }); }
      n++;
    }
    // lanterns left and right of the line
    for (let s = 95, i = 0; s < L - 60; s += 63, i++) {
      const [ox, oy] = weave(s);
      out.push({ t: 'target', s, ox: ox + (i % 2 ? 6 : -6), oy: oy + (r() - 0.5) * 3, heavy: i % 6 === 5 });
    }
    // rocks to dodge, on the opposite side of the weave
    for (let s = 150; s < L - 80; s += 97) { const [ox, oy] = weave(s); out.push({ t: 'rock', s, ox: -Math.sign(ox || 1) * 7, oy, r: 2.2 }); }
    // a diving gem trail near the end
    for (let k = 0; k < 14; k++) { const s = L - 150 + k * 6, [gx] = weave(s); out.push({ t: 'gem', s, ox: gx, oy: 6 - k * 0.5, v: 2 }); }
    return out;
  },
};
