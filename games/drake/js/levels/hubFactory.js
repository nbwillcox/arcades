// Hub factory: a plaza ringed by up to 8 portal pads, a landmark hill, a pond. Same shape for every world.
import { elder, lantern } from './helpers.js';
import { SCATTER } from './themes.js';

const PADS = ['padA', 'padB', 'padC', 'padD', 'padE', 'padF', 'padG', 'padH'];
const CX = 100, CZ = 100, PR = 56;

// Landmark: a decor mesh (see art/landmarks.js) plus simple hidden collision boxes. Offsets are relative to the hill centre.
const LANDMARKS = {
  anvil: { k: 'anvil', anim: 'anvil_anim', s: 1, boxes: [[-4.6, -3.3, 4.6, 3.3, 6], [-7.4, -2.9, -5.0, -0.7, 12]] },
  wind: { k: 'windtower', anim: 'windtower_anim', s: 1, boxes: [[-2.8, -2.8, 2.8, 2.8, 11]] },
  obelisk: { k: 'obeliskhub', anim: 'obeliskhub_anim', s: 1, boxes: [[-2.3, -2.3, 2.3, 2.3, 12]] },
  clock: { k: 'clocktower', anim: 'clocktower_anim', s: 1, boxes: [[-3.7, -3.7, 3.7, 3.7, 17]] },
  gate: { k: 'archgate', s: 1.6, boxes: [[-8.5, -1.6, -5.9, 1.6, 12], [5.9, -1.6, 8.5, 1.6, 12]] },
};
function landmark(kind, n) {
  const L = LANDMARKS[kind];
  return {
    boxes: L.boxes.map(([x0, z0, x1, z1, h]) => ({ min: [n.x + x0, n.h - 0.5, n.z + z0], max: [n.x + x1, n.h + h, n.z + z1], hidden: true })),
    decor: [{ k: L.k, x: n.x, y: n.h, z: n.z, s: L.s, ry: 0, v: 0.5 }, ...(L.anim ? [{ k: L.anim, x: n.x, y: n.h, z: n.z, s: L.s, ry: 0, v: 0.5 }] : [])],
  };
}

export function makeHub(o) {
  const nodes = { plaza: { x: CX, z: CZ, r: 20, h: 0.4 }, landHill: { x: 100, z: 38, r: 11, h: 6.5 } };
  const links = [{ a: 'plaza', b: 'landHill', type: 'ramp', w: 7 }];
  const pads = [];
  o.portals.forEach((p, i) => {
    const a = Math.PI + (i / 8) * Math.PI * 2 + Math.PI / 8, id = PADS[i];
    nodes[id] = { x: CX + Math.cos(a) * PR, z: CZ + Math.sin(a) * PR, r: 8, h: 0.5, keepClear: 1 };
    links.push({ a: 'plaza', b: id, type: 'ramp', w: 6 });
    pads.push(id);
  });
  // landmark hill sits at the north edge: keep pads away from it (pad angles skip the north)
  return {
    id: o.id, name: o.name, world: o.world, kind: 'hub', seed: o.seed, size: 200, theme: o.theme, music: o.music || 'hub',
    low: { h: 0.4, amp: 0.35, scale: 0.05 }, liquid: o.liquid || { kind: 'water', y: -0.5 }, rim: 16, rimH: 16,
    shape(x, z, h) { const d = Math.hypot(x - 38, z - 40); const t = 1 - Math.min(1, Math.max(0, (d - 9) / 4)); return h + (-3 - h) * (t * t * (3 - 2 * t)); },
    nodes, links, spawn: 'plaza', spawnOff: [0, 8], spawnYaw: Math.PI,
    entities: (c) => {
      const out = [];
      o.portals.forEach((p, i) => { const id = pads[i], n = nodes[id]; out.push({ t: 'portal', x: n.x, z: n.z, target: p.target, label: p.label, need: p.need || null, color: p.color || 0xffc86b, yaw: Math.atan2(CX - n.x, CZ - n.z) }); });
      out.push(lantern(...c.at('plaza', 90, 14), Math.PI));
      out.push(elder(...c.at('landHill', 270, 3), o.tips ? o.tips[0] : 'This is a hub. Every portal is a new adventure!'));
      out.push(elder(38, 52, o.tips ? o.tips[1] : 'Gems you find stay yours. Come back anytime to get the rest.'));
      out.push({ t: 'sunstone', id: 0, x: nodes.landHill.x, z: nodes.landHill.z + 4, h: 1.4 });
      return out;
    },
    boxes: () => landmark(o.landmark, nodes.landHill).boxes,
    fill: [
      { t: 'pile', n: 14, v: 1, where: 'any', count: 6 }, { t: 'pile', n: 5, v: 2, where: 'any', count: 5 }, { t: 'ring', n: 3, v: 1, count: 10, r: 2.4 },
      { t: 'crate', n: 5, gems: [1, 1, 2], where: 'any' }, { t: 'vase', n: 5, gems: [1, 2], where: 'any' }, { t: 'moth', n: 5 },
    ],
    decor: () => landmark(o.landmark, nodes.landHill).decor,
    trails: 1, scatter: o.scatter || SCATTER[o.themeKey] || [],
  };
}
