// Boss arena factory: a ring of stones around a raised plateau, one boss, health moths, a few crates.
import { elder } from './helpers.js';
import { SCATTER } from './themes.js';

const CX = 70, CZ = 70;

export function makeBossArena(o) {
  const R = o.radius || 25;
  const void_ = !!o.island;
  return {
    id: o.id, name: o.name, world: o.world, kind: 'boss', seed: o.seed, winTitle: o.winTitle || `${o.name} defeated!`,
    size: 140, theme: o.theme, music: o.music || 'boss',
    low: void_ ? { h: -10, amp: 0.6, scale: 0.03 } : o.liquid ? { h: o.liquid.y - 2.8, amp: 0.4, scale: 0.05 } : { h: 0.4, amp: 0.2, scale: 0.05 },
    liquid: o.liquid || (void_ ? { kind: 'cloud', y: -7 } : undefined), rim: 16, rimH: void_ ? 0 : 14,
    arena: { x: CX, z: CZ, r: R },
    nodes: { arena: { x: CX, z: CZ, r: R + 3, h: 1.6, edge: 3, bump: 0.05 } }, links: [],
    spawn: 'arena', spawnOff: [0, R - 8], spawnYaw: Math.PI,
    entities: () => {
      const out = [{ t: 'boss', boss: o.boss, x: CX, z: CZ, arena: { x: CX, z: CZ, r: R }, gems: o.gems || [10, 10, 10, 10, 10, 5, 5, 5, 5, 5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2] }];
      if (!o.final) out.push({ ...elder(CX, CZ - R + 8, o.tip || 'Well fought!', 0), afterBoss: true });
      out.push({ t: 'moth', x: CX - 16, z: CZ + 10, h: 1.4 }, { t: 'moth', x: CX + 16, z: CZ + 10, h: 1.4 }, { t: 'moth', x: CX, z: CZ + 20, h: 1.4 });
      return out;
    },
    decor: () => {
      const d = [], n = Math.round(R * 1.45);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; d.push({ k: o.ringKind || 'pillar', x: CX + Math.cos(a) * (R + 1.5), z: CZ + Math.sin(a) * (R + 1.5), s: 1.4, ry: a, solid: 1.4, solidH: 3 }); }
      return d;
    },
    fill: [{ t: 'crate', n: 5, gems: [1, 1, 2], where: 'any' }, { t: 'vase', n: 5, gems: [1, 2], where: 'any' }],
    scatter: (o.scatter || SCATTER[o.themeKey] || []).filter((s) => s.k !== 'tree'),
  };
}
