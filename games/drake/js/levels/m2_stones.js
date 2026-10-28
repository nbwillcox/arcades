// Mossgate Meadows, level 2: Standing Stones. Mist, stone circles, brazier-gate puzzle, an updraft to a spire, a hidden vault.
import { elder, chest, lantern } from './helpers.js';

const THEME = {
  grass: 0x4fb78a, grass2: 0x72cfa4, rock: 0x8f8cae, sand: 0xd7cfae, sandBelow: -0.3,
  sky: [0x5a74ff, 0xd8c8ff], fog: 0xcfc4ff, fogNear: 45, fogFar: 150,
  water: 0x5aa7ff, hemiSky: 0xe8e0ff, hemiGround: 0x6a7a8a,
  palette: { leaf: 0x2a9a76, leaf2: 0x3cb88f, trunk: 0x6f5a48, crystal: 0xa7e8ff, crystal2: 0xd0a8ff, stone: 0xb7b4cc, stone2: 0xd0cde2 },
};

export default {
  id: 'm2_stones', name: 'Standing Stones', world: 'mossgate', seed: 23,
  size: 200, theme: THEME, music: 'mist',
  low: { h: 0.3, amp: 0.5, scale: 0.05 },
  rim: 16, rimH: 16,
  nodes: {
    start: { x: 28, z: 100, r: 10, h: 0.3 },
    circle: { x: 78, z: 100, r: 15, h: 2 },
    ridgeN: { x: 78, z: 48, r: 10, h: 6 },
    ridgeS: { x: 78, z: 152, r: 10, h: 6 },
    tableE: { x: 130, z: 100, r: 12, h: 8.5 },
    sanctum: { x: 160, z: 150, r: 9, h: 3 },
    spire: { x: 112, z: 52, r: 5, h: 15 },
    hollow: { x: 152, z: 46, r: 11, h: 0.3 },
    vault: { x: 34, z: 36, r: 6, h: 0.3, noFill: true },
  },
  links: [
    { a: 'start', b: 'circle', type: 'ramp', w: 7 },
    { a: 'circle', b: 'ridgeN', type: 'ramp', w: 5 },
    { a: 'circle', b: 'ridgeS', type: 'ramp', w: 5 },
    { a: 'circle', b: 'tableE', type: 'ramp', w: 6 },
    { a: 'tableE', b: 'sanctum', type: 'ramp', w: 5 },
    { a: 'tableE', b: 'hollow', type: 'ramp', w: 5 },
    { a: 'ridgeN', b: 'spire', type: 'gap', vent: { x: 86, z: 50, h: 13 } },
    { a: 'start', b: 'vault', type: 'ramp', w: 4 },
  ],
  spawn: 'start', spawnYaw: Math.PI / 2,
  entities: (c) => [
    lantern(...c.at('circle', 180, 6), Math.PI / 2), lantern(...c.at('tableE', 90, 6), 0), lantern(...c.at('hollow', 180, 5), 0),
    elder(...c.at('circle', 90, 5), 'Braziers can open gates. Flame them all!'),
    elder(...c.at('sanctum', 90, 3), 'You opened the gate. Well done!'),
    elder(...c.at('vault', 0, 2), 'Charge into cracked walls to find secrets.'),
    chest(...c.at('spire', 0, 1.6), [10, 10, 25, 25], 0),
    // brazier + gate puzzle (group a): gate seals the ramp to the sanctum
    { t: 'brazier', group: 'a', x: c.at('ridgeN', 270, 6)[0], z: c.at('ridgeN', 270, 6)[1] },
    { t: 'brazier', group: 'a', x: c.at('ridgeS', 90, 6)[0], z: c.at('ridgeS', 90, 6)[1] },
    { t: 'gate', group: 'a', x: 145, z: 125, w: 8, h: 3.4, d: 0.6 },
    // cracked wall hiding the vault
    { t: 'barrier', by: 'charge', x: 31, z: 66, w: 5.2, h: 3.2, d: 1.2 },
    { t: 'thief', x: c.at('hollow')[0], z: c.at('hollow')[1] + 4, patrol: 15, sunstone: 0 },
    { t: 'spikes', x: 118, z: 112, w: 3, d: 3 },
    { t: 'exit', x: c.at('hollow', 90, 6)[0], z: c.at('hollow', 90, 6)[1] },
  ],
  decor: (c) => {
    const o = [], n = c.node('circle');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; o.push({ k: 'pillar', x: n.x + Math.cos(a) * 13, z: n.z + Math.sin(a) * 13, s: 1.1, ry: a, solid: 1.0, solidH: 3 }); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.52, t = c.node('tableE'); o.push({ k: 'pillar', x: t.x + Math.cos(a) * 9, z: t.z + Math.sin(a) * 9, s: 1.3, ry: a, solid: 1.1, solidH: 3 }); }
    return o;
  },
  fill: [
    { t: 'pile', n: 22, v: 1, where: 'low', count: 6 }, { t: 'pile', n: 8, v: 2, where: 'high', count: 5 }, { t: 'ring', n: 5, v: 1, count: 10, r: 2.4 },
    { t: 'pile', n: 5, v: 5, where: 'high', count: 4 },
    { t: 'crate', n: 10, gems: [1, 1, 2], where: 'low' }, { t: 'vase', n: 9, gems: [1, 2], where: 'low' }, { t: 'crate', n: 4, gems: [5, 5], where: 'high' },
    { t: 'enemy', kind: 'stroller', n: 5, where: 'low', patrol: 6 }, { t: 'enemy', kind: 'shield', n: 4, node: 'tableE', patrol: 5 },
    { t: 'enemy', kind: 'spiked', n: 3, node: 'ridgeS', patrol: 5 }, { t: 'enemy', kind: 'hopper', n: 4, node: 'circle', patrol: 7 },
    { t: 'enemy', kind: 'spitter', n: 2, node: 'ridgeN', patrol: 0 }, { t: 'enemy', kind: 'brute', n: 1, node: 'sanctum', patrol: 4 },
    { t: 'moth', n: 7 },
  ],
  trails: 1,
  scatter: [
    { k: 'tree', n: 40, where: 'low', solid: 0.7, spacing: 8, maxSlope: 0.22 },
    { k: 'crystal', n: 45, where: 'any', spacing: 10, maxSlope: 0.3, s0: 0.9, s1: 1.8 },
    { k: 'mushroom', n: 50, where: 'low', s0: 0.8, s1: 1.4 },
    { k: 'rock', n: 35, where: 'any', solid: 0.9, spacing: 7 },
    { k: 'tuft', n: 280, where: 'any', s0: 0.8, s1: 1.5 }, { k: 'flower', n: 120, where: 'low' },
    { k: 'tree', n: 60, where: 'any', minH: 14, s0: 1.4, s1: 2.2 },
  ],
};
