// Mossgate Meadows, level 1: Brookside. A gentle meadow, a brook, a hill, a stone hop, a tower to glide from.
import { elder, chest, lantern } from './helpers.js';

const THEME = {
  grass: 0x58c76a, grass2: 0x7ad98a, rock: 0x9aa2b5, sand: 0xe6d79b, sandBelow: -0.3,
  sky: [0x3b8fff, 0xbfeaff], fog: 0xc4ecff, fogNear: 70, fogFar: 190,
  water: 0x3fb8ff, palette: { leaf: 0x2fae5a, leaf2: 0x46c870, trunk: 0x8a5a33 },
};

const riverX = (z) => 105 + Math.sin((z - 100) * 0.05) * 8;

export default {
  id: 'm1_brookside', name: 'Brookside', world: 'mossgate', seed: 11,
  size: 200, theme: THEME, music: 'meadow',
  low: { h: 0.5, amp: 0.3, scale: 0.05 },
  liquid: { kind: 'water', y: -0.4 },
  rim: 16, rimH: 16,
  shape(x, z, h) {
    const d = Math.abs(x - riverX(z));
    const t = (1 - Math.min(1, Math.max(0, (d - 5) / 3))) * Math.min(1, Math.max(0, (z - 62) / 20));
    return h + (-3.2 - h) * (t * t * (3 - 2 * t));
  },
  nodes: {
    start: { x: 28, z: 100, r: 12, h: 0.5 },
    meadow: { x: 68, z: 100, r: 14, h: 0.6 },
    bankW: { x: 92, z: 100, r: 5, h: 0.6, edge: 1.4 },
    bankE: { x: 118, z: 100, r: 5, h: 0.6, edge: 1.4 },
    east1: { x: 146, z: 100, r: 14, h: 0.6 },
    hillA: { x: 58, z: 48, r: 12, h: 4 },
    stoneB: { x: 82, z: 44, r: 6.5, h: 4.8, edge: 1.6 },
    towerC: { x: 118, z: 42, r: 8, h: 9.5 },
    east2: { x: 152, z: 56, r: 12, h: 0.6 },
    exitPad: { x: 172, z: 126, r: 9, h: 2.2, noFill: true },
    cove: { x: 40, z: 150, r: 9, h: 0.6 },
  },
  links: [
    { a: 'start', b: 'meadow', type: 'ramp', w: 8 },
    { a: 'meadow', b: 'bankW', type: 'ramp', w: 5 },
    { a: 'bankW', b: 'bankE', type: 'bridge', w: 3.6 },
    { a: 'bankE', b: 'east1', type: 'ramp', w: 5 },
    { a: 'meadow', b: 'hillA', type: 'ramp', w: 6 },
    { a: 'hillA', b: 'stoneB', type: 'gap' },
    { a: 'stoneB', b: 'towerC', type: 'ramp', w: 4 },
    { a: 'towerC', b: 'east2', type: 'gap', oneWay: true },
    { a: 'east2', b: 'east1', type: 'ramp', w: 7 },
    { a: 'east1', b: 'exitPad', type: 'ramp', w: 6 },
    { a: 'start', b: 'cove', type: 'ramp', w: 6 },
  ],
  spawn: 'start', spawnYaw: Math.PI / 2,
  entities: (c) => [
    ...lanterns(c),
    elder(...c.at('hillA', 100, 6), 'Gems hide in crates and vases. Charge or flame them open!'),
    elder(...c.at('towerC', 200, 4), 'Hold jump in mid-air to glide. Steer with the stick.'),
    elder(...c.at('cove', 90, 4), 'Nice find! Check the corners of every area.'),
    chest(...c.at('stoneB', 0, 2.5), [5, 5, 10, 10, 25], 0),
    { t: 'exit', x: c.node('exitPad').x, z: c.node('exitPad').z },
  ],
  fill: [
    { t: 'pile', n: 22, v: 1, where: 'low', count: 6 },
    { t: 'pile', n: 6, v: 2, where: 'low', count: 5 },
    { t: 'ring', n: 5, v: 1, count: 10, r: 2.4 },
    { t: 'pile', n: 4, v: 5, where: 'high', count: 4 },
    { t: 'crate', n: 10, gems: [1, 1, 2], where: 'low' }, { t: 'vase', n: 8, gems: [1, 2], where: 'low' }, { t: 'crate', n: 3, gems: [5, 5], where: 'high' },
    { t: 'enemy', kind: 'stroller', n: 7, where: 'low', patrol: 6 }, { t: 'enemy', kind: 'stroller', n: 2, where: 'high', patrol: 4 },
    { t: 'enemy', kind: 'shield', n: 3, node: 'east1', patrol: 5 }, { t: 'enemy', kind: 'spiked', n: 2, node: 'east2', patrol: 5 },
    { t: 'enemy', kind: 'hopper', n: 3, node: 'meadow', patrol: 6 }, { t: 'enemy', kind: 'spitter', n: 1, node: 'east2', patrol: 0 },
    { t: 'moth', n: 6 },
  ],
  trails: 1,
  scatter: [
    { k: 'tree', n: 55, where: 'low', solid: 0.7, spacing: 7, maxSlope: 0.22 },
    { k: 'roundtree', n: 35, where: 'low', solid: 0.7, spacing: 7, maxSlope: 0.22 },
    { k: 'tree', n: 70, where: 'any', minH: 14, s0: 1.4, s1: 2.2 },
    { k: 'rock', n: 40, where: 'any', solid: 0.9, spacing: 6 },
    { k: 'flower', n: 260, where: 'low', s0: 0.8, s1: 1.4 },
    { k: 'tuft', n: 300, where: 'any', s0: 0.8, s1: 1.5 },
  ],
};

function lanterns(c) {
  return [
    lantern(...c.at('meadow', 180, 5), Math.PI / 2),
    lantern(...c.at('hillA', 90, 5), 0),
    lantern(...c.at('east1', 0, 5), 0),
    lantern(...c.at('towerC', 90, 5), 0),
  ];
}
