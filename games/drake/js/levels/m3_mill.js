// Mossgate Meadows, level 3: Clockwork Mill. A wide river, ferries, a mill with a spring-launched roof, an ice-sealed cellar.
import { elder, chest, lantern } from './helpers.js';

const THEME = {
  grass: 0x86c75a, grass2: 0xa6da6e, rock: 0xb09a88, sand: 0xe8d9a4, sandBelow: -0.2,
  sky: [0x5e9bff, 0xffe6bd], fog: 0xffe9c9, fogNear: 70, fogFar: 190,
  water: 0x4ab0e8, hemiSky: 0xfff0d8, hemiGround: 0x8a7a5a, sun: 0xffd9a0,
  palette: { leaf: 0x4e9a3a, leaf2: 0x6fb44a, trunk: 0x7a5a3a },
};
const riverX = 108;

export default {
  id: 'm3_mill', name: 'Clockwork Mill', world: 'mossgate', seed: 37,
  size: 200, theme: THEME, music: 'mill',
  low: { h: 0.5, amp: 0.3, scale: 0.05 },
  liquid: { kind: 'water', y: -0.4 },
  rim: 16, rimH: 16,
  shape(x, z, h) {
    const d = Math.abs(x - riverX - Math.sin(z * 0.04) * 3);
    const t = 1 - Math.min(1, Math.max(0, (d - 15) / 3.5));
    return h + (-3.2 - h) * (t * t * (3 - 2 * t));
  },
  nodes: {
    start: { x: 28, z: 100, r: 10, h: 0.5 },
    bankW: { x: 70, z: 100, r: 12, h: 0.5 },
    isleM: { x: 108, z: 100, r: 5, h: 0.5, edge: 1.4 },
    bankE: { x: 146, z: 100, r: 12, h: 0.5 },
    millBase: { x: 176, z: 100, r: 9, h: 0.5 },
    loft: { x: 178, z: 66, r: 6, h: 5.5 },
    millTop: { x: 168, z: 40, r: 8, h: 10 },
    exitPad: { x: 146, z: 40, r: 8, h: 0.8 },
    orchard: { x: 66, z: 46, r: 12, h: 2.5 },
    cellar: { x: 60, z: 152, r: 7, h: 0.5, noFill: true },
    isleN: { x: 108, z: 52, r: 4.5, h: 0.5, edge: 1.4 },
  },
  links: [
    { a: 'start', b: 'bankW', type: 'ramp', w: 7 },
    { a: 'bankW', b: 'isleM', type: 'ferry', w: 4.2, period: 10 },
    { a: 'isleM', b: 'bankE', type: 'ferry', w: 4.2, period: 12 },
    { a: 'bankE', b: 'millBase', type: 'ramp', w: 6 },
    { a: 'millBase', b: 'loft', type: 'ramp', w: 5 },
    { a: 'loft', b: 'millTop', type: 'gap', spring: { x: 176, z: 60, power: 22 } },
    { a: 'millTop', b: 'exitPad', type: 'gap', oneWay: true },
    { a: 'bankW', b: 'orchard', type: 'ramp', w: 6 },
    { a: 'orchard', b: 'isleN', type: 'ferry', w: 4.2, period: 9 },
    { a: 'isleN', b: 'exitPad', type: 'ferry', w: 4.2, period: 9 },
    { a: 'bankE', b: 'exitPad', type: 'ramp', w: 6 },
    { a: 'bankW', b: 'cellar', type: 'ramp', w: 5 },
  ],
  spawn: 'start', spawnYaw: Math.PI / 2,
  entities: (c) => [
    lantern(...c.at('bankW', 180, 6), Math.PI / 2), lantern(...c.at('bankE', 90, 6), 0), lantern(...c.at('millBase', 270, 5), 0),
    elder(...c.at('millTop', 90, 3), 'Springs launch you high. Glide to the far platforms!'),
    elder(...c.at('cellar', 0, 2), 'Ice melts when you breathe fire on it.'),
    elder(...c.at('orchard', 180, 4), 'Moving platforms: time your jump, little dragon.'),
    chest(...c.at('millTop', 270, 2.5), [10, 10, 25, 25, 25], 0),
    { t: 'barrier', by: 'flame', x: 60, z: 128, w: 6, h: 3.4, d: 1.4 },
    { t: 'brazier', group: 'b', x: c.at('orchard', 0, 6)[0], z: c.at('orchard', 0, 6)[1] },
    { t: 'brazier', group: 'b', x: c.at('exitPad', 180, 6)[0], z: c.at('exitPad', 180, 6)[1] },
    { t: 'gate', group: 'b', x: 176, z: 82, w: 7, h: 3.4, d: 0.6 },
    { t: 'spikes', x: 150, z: 80, w: 3, d: 3 }, { t: 'spikes', x: 144, z: 70, w: 3, d: 3 },
    { t: 'exit', x: c.at('exitPad')[0], z: c.at('exitPad')[1] },
  ],
  decor: () => [{ k: 'millhouse', x: 179, y: 0.5, z: 112, s: 1, ry: 0, v: 0.5 }, { k: 'millhouse_anim', x: 179, y: 0.5, z: 112, s: 1, ry: 0, v: 0.5 }],
  boxes: () => [{ min: [172, -1, 108], max: [186, 5.5, 116], hidden: true }],
  fill: [
    { t: 'pile', n: 22, v: 1, where: 'low', count: 6 }, { t: 'pile', n: 7, v: 2, where: 'low', count: 5 }, { t: 'ring', n: 5, v: 1, count: 10, r: 2.4 },
    { t: 'pile', n: 5, v: 5, where: 'high', count: 4 },
    { t: 'crate', n: 11, gems: [1, 1, 2], where: 'low' }, { t: 'vase', n: 8, gems: [1, 2], where: 'low' }, { t: 'crate', n: 4, gems: [5, 5], where: 'high' },
    { t: 'enemy', kind: 'stroller', n: 6, where: 'low', patrol: 6 }, { t: 'enemy', kind: 'hopper', n: 4, node: 'bankE', patrol: 7 },
    { t: 'enemy', kind: 'shield', n: 3, node: 'orchard', patrol: 5 }, { t: 'enemy', kind: 'spiked', n: 3, node: 'bankW', patrol: 5 },
    { t: 'enemy', kind: 'spitter', n: 2, node: 'millBase', patrol: 0 }, { t: 'moth', n: 6 },
  ],
  trails: 1,
  scatter: [
    { k: 'tree', n: 40, where: 'low', solid: 0.7, spacing: 8, maxSlope: 0.22 },
    { k: 'roundtree', n: 40, where: 'low', solid: 0.7, spacing: 8, maxSlope: 0.22 },
    { k: 'tree', n: 70, where: 'any', minH: 14, s0: 1.4, s1: 2.2 },
    { k: 'rock', n: 30, where: 'any', solid: 0.9, spacing: 7 },
    { k: 'flower', n: 220, where: 'low' }, { k: 'tuft', n: 300, where: 'any', s0: 0.8, s1: 1.5 }, { k: 'lamppost', n: 8, where: 'low', spacing: 18 },
  ],
};
