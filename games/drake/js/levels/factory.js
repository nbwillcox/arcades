// Level factory: layout generator + standard entity placement -> a def for levelgen.buildSpec.
import { genLayout } from '../layouts.js';
import { elder, chest, lantern } from './helpers.js';
import { nodeRadius } from '../levelgen.js';

export const TIPS = [
  'Gems hide in crates and vases. Charge or flame them open!',
  'Hold jump in mid-air to glide. Steer with the stick.',
  'Charge helps you glide even farther.',
  'Flame lights lanterns and melts ice.',
  'Updrafts carry you up. Glide off the top!',
  'Springs launch you high. Glide to the far platforms!',
  'Look around with the right stick. Secrets hide in corners.',
  'Thieves run fast, but your charge is faster.',
  'Cracked walls break when you charge into them.',
  'Lanterns save your place. Light them as you go.',
  'The Wick firefly heals when you flame the glowmoths.',
  'You are doing great, little one!',
];

const at = (c, id, ang, rad) => c.at(id, ang, rad);

function gateAndBarrier(L, c, o) {
  const out = [];
  const nodes = L.nodes;
  const ramps = L.branches.map((b) => L.links.find((l) => l.b === b && (l.type === 'ramp' || l.type === 'steps'))).filter(Boolean);
  const place = (link, kind, extra) => {
    const A = nodes[link.a], B = nodes[link.b];
    let dx = B.x - A.x, dz = B.z - A.z; const len = Math.hypot(dx, dz); dx /= len; dz /= len;
    const ra = nodeRadius(A) * 0.9, rb = nodeRadius(B) * 0.9, run = len - ra - rb;
    const s = ra + run * 0.55, x = A.x + dx * s, z = A.z + dz * s;
    const wide = (link.w || 5) + 3.6, horiz = Math.abs(dx) >= Math.abs(dz);
    const y = c.height(x, z);
    return Object.assign({ x, z, h: 3.4 }, horiz ? { w: kind === 'gate' ? 0.6 : 1.2, d: wide } : { w: wide, d: kind === 'gate' ? 0.6 : 1.2 }, { y }, extra);
  };
  if (ramps[0] && L.chain.length >= 5) {
    const g = place(ramps[0], 'gate', { t: 'gate', group: 'a' });
    delete g.y; out.push(g);
    const cand = L.chain.filter((id) => id !== L.spawn && id !== L.exit && id !== ramps[0].a && id !== ramps[0].b);
    for (const id of cand.slice(0, 2)) { const [x, z] = at(c, id, 130, nodeRadius(L.nodes[id]) * 0.55); out.push({ t: 'brazier', group: 'a', x, z }); }
  }
  if (ramps[1]) { const b = place(ramps[1], 'barrier', { t: 'barrier', by: o.barrierBy || 'charge' }); delete b.y; out.push(b); }
  return out;
}

function entitiesFor(c, L, o) {
  const e = [];
  const rad = (id, f) => nodeRadius(L.nodes[id]) * f;
  L.roles.lanterns.forEach((id, i) => e.push(lantern(...at(c, id, 200 + i * 40, rad(id, 0.55)), 0)));
  const tips = o.tips || TIPS;
  L.roles.elders.forEach((id, i) => e.push(elder(...at(c, id, 90 + i * 70, id === L.exit ? 3 : rad(id, 0.3)), tips[(o.seed + i * 3) % tips.length])));
  e.push(chest(...at(c, L.roles.chest, 270, rad(L.roles.chest, 0.45)), [10, 10, 25, 25, 25]));
  if (o.thief && L.chain.length > 3) { const id = L.chain[Math.floor(L.chain.length / 2)]; const [x, z] = at(c, id, 0, 0); e.push({ t: 'thief', x, z, patrol: Math.min(16, nodeRadius(L.nodes[id]) + 6), sunstone: 0 }); }
  if (o.spikes) for (let i = 0; i < o.spikes; i++) { const id = L.chain[2 + (i * 2) % Math.max(1, L.chain.length - 3)]; if (!id || id === L.exit) continue; const [x, z] = at(c, id, 60 + i * 90, rad(id, 0.5)); e.push({ t: 'spikes', x, z, w: 3, d: 3 }); }
  if (o.gusts) for (let i = 0; i < o.gusts; i++) { const l = L.links.filter((k) => k.type === 'gap')[i]; if (!l) break; const A = L.nodes[l.a], B = L.nodes[l.b]; const mx = (A.x + B.x) / 2, mz = (A.z + B.z) / 2; const dx = B.x - A.x, dz = B.z - A.z, dl = Math.hypot(dx, dz) || 1; e.push({ t: 'gust', x: mx, z: mz, y: Math.min(A.h, B.h) - 2, r: 7, h: 16, dx: -dz / dl, dz: dx / dl, force: 22 }); }
  e.push(...gateAndBarrier(L, c, o));
  const ex = at(c, L.exit, 0, 0); e.push({ t: 'exit', x: ex[0], z: ex[1] });
  if (o.extra) e.push(...o.extra(c, L));
  return e;
}

export function fillFor(o) {
  const d = o.density === undefined ? 1 : o.density;
  const flat = o.style === 'isles' || !!o.liquid;
  const lowW = flat ? 'any' : 'low', hiW = flat ? 'any' : 'high';
  const f = [
    { t: 'pile', n: Math.round(20 * d), v: 1, where: lowW, count: 6 }, { t: 'pile', n: Math.round(8 * d), v: 2, where: hiW, count: 5 },
    { t: 'ring', n: Math.round(5 * d), v: 1, count: 10, r: 2.4 }, { t: 'pile', n: Math.round(5 * d), v: 5, where: hiW, count: 4 },
    { t: 'crate', n: Math.round(9 * d), gems: [1, 1, 2], where: lowW }, { t: 'vase', n: Math.round(7 * d), gems: [1, 2], where: lowW }, { t: 'crate', n: Math.round(4 * d), gems: [5, 5], where: hiW },
    { t: 'moth', n: 6 },
  ];
  for (const [kind, n, extra] of o.enemies || []) f.push(Object.assign({ t: 'enemy', kind, n, patrol: kind === 'spitter' ? 0 : 6 }, extra || {}));
  return f;
}

export function makeLevel(o) {
  const L = genLayout(o);
  const A = L.nodes[L.spawn], B = L.nodes[L.chain[1] || L.spawn];
  const void_ = o.style === 'isles';
  return {
    id: o.id, name: o.name, world: o.world, seed: o.seed, size: 200, theme: o.theme, music: o.music,
    low: o.low || (void_ ? { h: -30, amp: 1.2, scale: 0.03 } : o.liquid ? { h: o.liquid.y - 2.8, amp: 0.5, scale: 0.05 } : { h: 0.5, amp: 0.35, scale: 0.05 }),
    liquid: o.liquid || (void_ ? { kind: 'cloud', y: -26.5 } : undefined), shape: o.shape, rim: 16, rimH: void_ ? 0 : (o.rimH === undefined ? (o.liquid ? 14 : 16) : o.rimH),
    nodes: L.nodes, links: L.links, spawn: L.spawn, spawnYaw: Math.atan2(B.x - A.x, B.z - A.z),
    entities: (c) => entitiesFor(c, L, o), fill: o.fillRules || fillFor(o), trails: 1,
    scatter: o.scatter || [], boxes: o.boxes, decor: o.decor, bridgeColor: o.bridgeColor, ferryColor: o.ferryColor, layout: L, opts: o,
  };
}
