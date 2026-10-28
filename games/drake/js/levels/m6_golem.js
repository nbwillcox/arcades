// Mossgate Meadows boss: the Moss Golem, in a ring of standing stones.
import { elder } from './helpers.js';

const THEME = {
  grass: 0x5db37a, grass2: 0x7fcf96, rock: 0x8f93a8, sand: 0xd7cfae, sandBelow: -0.3,
  sky: [0x4a6fff, 0xe6d0ff], fog: 0xd7c9ff, fogNear: 50, fogFar: 150, hemiSky: 0xf0e8ff,
  palette: { stone: 0xb0adc6, stone2: 0xcac7de, leaf: 0x2a9a76 },
};
const CX = 70, CZ = 70, R = 25;

export default {
  id: 'm6_golem', name: 'Moss Golem', world: 'mossgate', kind: 'boss', seed: 61, winTitle: 'Moss Golem defeated!',
  size: 140, theme: THEME, music: 'boss',
  low: { h: 0.4, amp: 0.2, scale: 0.05 },
  rim: 16, rimH: 18,
  arena: { x: CX, z: CZ, r: R },
  nodes: { arena: { x: CX, z: CZ, r: 28, h: 1.6, edge: 3, bump: 0.05 } },
  links: [],
  spawn: 'arena', spawnOff: [0, 18], spawnYaw: Math.PI,
  entities: () => [
    { t: 'golem', x: CX, z: CZ, arena: { x: CX, z: CZ, r: R }, gems: [10, 10, 10, 10, 10, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] },
    elder(CX, CZ - 15, 'You beat the Golem! Brightforge Vale awaits.', 0),
    { t: 'moth', x: CX - 16, z: CZ + 10, h: 1.4 }, { t: 'moth', x: CX + 16, z: CZ + 10, h: 1.4 }, { t: 'moth', x: CX, z: CZ + 20, h: 1.4 },
  ].map((e) => (e.t === 'elder' ? { ...e, afterBoss: true } : e)),
  decor: () => {
    const o = [];
    for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; o.push({ k: 'pillar', x: CX + Math.cos(a) * (R + 1.5), z: CZ + Math.sin(a) * (R + 1.5), s: 1.4, ry: a, solid: 1.4, solidH: 3 }); }
    return o;
  },
  fill: [
    { t: 'crate', n: 5, gems: [1, 1, 2], where: 'any' }, { t: 'vase', n: 5, gems: [1, 2] },
  ],
  scatter: [
    { k: 'crystal', n: 30, where: 'any', spacing: 8, maxSlope: 0.3, s0: 0.9, s1: 1.6 },
    { k: 'tuft', n: 200, where: 'any', s0: 0.8, s1: 1.5 }, { k: 'mushroom', n: 25, where: 'low' },
    { k: 'tree', n: 50, where: 'any', minH: 14, s0: 1.4, s1: 2.2 },
  ],
};
