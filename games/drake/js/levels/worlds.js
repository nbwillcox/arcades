// Worlds 2-6: option tables for the level factory (seeds were chosen with tools/seedsearch.js).
import { makeLevel } from './factory.js';
import { makeHub } from './hubFactory.js';
import { makeFlight } from './flightFactory.js';
import { makeBossArena } from './bossFactory.js';
import { THEMES, SCATTER } from './themes.js';

const T = THEMES, S = SCATTER;
const poolsTheme = { ...T.forge, grass: 0x6a7a8a, grass2: 0x7a8a9a, rock: 0x5a6a7a, water: 0x4ab8ff, sky: [0x3a3a5e, 0xffa86a], fog: 0xe8a07a, palette: { ...T.forge.palette, crystal: 0x7fe8ff, crystal2: 0xffffff } };

const E = {
  forge: [['stroller', 4, { where: 'any' }], ['spiked', 3], ['hopper', 3], ['spitter', 2], ['brute', 1], ['shield', 2]],
  sky: [['shield', 3], ['hopper', 3], ['spitter', 2], ['stroller', 3], ['spiked', 2]],
  crystal: [['stroller', 4], ['spiked', 3], ['shield', 3], ['hopper', 3], ['spitter', 2], ['brute', 1]],
  night: [['spiked', 4], ['shield', 4], ['spitter', 3], ['stroller', 3], ['hopper', 2], ['brute', 1]],
  keep: [['brute', 2], ['shield', 4], ['spiked', 4], ['spitter', 3], ['hopper', 3]],
};
const L = (id, name, world, theme, scatter, music, enemies, o) => ({ id, name, world, theme, scatter, music, enemies, seed: 1, style: 'sprawl', count: 9, ...o });

// ---- ground levels (opts); `seed` values come from the seed search
export const GROUND = {
  b1_slag: L('b1_slag', 'Slag Row', 'brightforge', T.forge, S.forge, 'forge', E.forge, { seed: 1, style: 'sprawl', count: 9, liquid: { kind: 'lava', y: -0.4 }, ferryChance: 0.3, spikes: 2 }),
  b2_gears: L('b2_gears', 'Gear Works', 'brightforge', T.forge, S.forge, 'forge', E.forge, { seed: 2, style: 'canyon', count: 10, liquid: { kind: 'lava', y: -0.4 }, ferryChance: 0.35, spikes: 3 }),
  b3_terraces: L('b3_terraces', 'Ember Terraces', 'brightforge', T.forge, S.forge, 'forge', E.forge, { seed: 1, style: 'climb', count: 9, radius: 62, maxH: 22, spikes: 2, thief: true }),
  b4_pools: L('b4_pools', 'Cooling Pools', 'brightforge', poolsTheme, S.forge, 'forge', E.forge, { seed: 1, style: 'sprawl', count: 9, liquid: { kind: 'water', y: -0.4 }, ferryChance: 0.3 }),
  c1_skybridge: L('c1_skybridge', 'Skybridge', 'mistral', T.sky, S.sky, 'gale', E.sky, { seed: 2, style: 'isles', count: 10, gusts: 2, density: 0.8 }),
  c2_windward: L('c2_windward', 'Windward Isles', 'mistral', T.sky, S.sky, 'gale', E.sky, { seed: 2, style: 'isles', count: 11, gusts: 3, density: 0.8, thief: true }),
  c3_library: L('c3_library', 'Sunken Library', 'mistral', T.sky, S.sky, 'mist', E.sky, { seed: 4, style: 'sprawl', count: 9, spikes: 2 }),
  c4_spires: L('c4_spires', 'Storm Spires', 'mistral', T.sky, S.sky, 'gale', E.sky, { seed: 1, style: 'climb', count: 10, radius: 60, maxH: 26, gusts: 0 }),
  d1_mushroom: L('d1_mushroom', 'Mushroom Hollow', 'glimmerdeep', T.crystal, S.crystal, 'crystal', E.crystal, { seed: 1, style: 'sprawl', count: 9, liquid: { kind: 'water', y: -0.4 }, ferryChance: 0.25 }),
  d2_prism: L('d2_prism', 'Prism Caves', 'glimmerdeep', T.crystal, S.crystal, 'crystal', E.crystal, { seed: 1, style: 'climb', count: 9, radius: 62, maxH: 20, thief: true }),
  d3_tide: L('d3_tide', 'Tide Chambers', 'glimmerdeep', T.crystal, S.crystal, 'crystal', E.crystal, { seed: 1, style: 'sprawl', count: 9, liquid: { kind: 'water', y: -0.4 }, ferryChance: 0.35 }),
  d4_echo: L('d4_echo', 'Echo Tunnels', 'glimmerdeep', T.crystal, S.crystal, 'crystal', E.crystal, { seed: 2, style: 'canyon', count: 10, spikes: 2 }),
  e1_rooftop: L('e1_rooftop', 'Rooftop Run', 'duskmarket', T.night, S.night, 'night', E.night, { seed: 2, style: 'canyon', count: 11, spikes: 2 }),
  e2_alleys: L('e2_alleys', 'Back Alleys', 'duskmarket', T.night, S.night, 'night', E.night, { seed: 4, style: 'sprawl', count: 9, spikes: 2, thief: true }),
  e3_clock: L('e3_clock', 'Clock Tower', 'duskmarket', T.night, S.night, 'night', E.night, { seed: 2, style: 'climb', count: 10, radius: 60, maxH: 28 }),
  e4_bazaar: L('e4_bazaar', 'Bazaar Maze', 'duskmarket', T.night, S.night, 'night', E.night, { seed: 4, style: 'sprawl', count: 10, spikes: 3 }),
  f1_wall: L('f1_wall', 'Outer Wall', 'keep', T.keep, S.keep, 'keep', E.keep, { seed: 2, style: 'canyon', count: 10, spikes: 3 }),
  f2_stairs: L('f2_stairs', 'Dungeon Stairs', 'keep', T.keep, S.keep, 'keep', E.keep, { seed: 1, style: 'climb', count: 10, radius: 62, maxH: 26, spikes: 2, thief: true }),
  f3_spire: L('f3_spire', 'Throne Spire', 'keep', T.keep, S.keep, 'keep', E.keep, { seed: 2, style: 'isles', count: 10, gusts: 2, density: 0.8 }),
};

// ---- hubs
const PORTAL = { a: 0x6ff58a, b: 0xb39bff, c: 0xffb35c, d: 0xff8f8f, flight: 0x6fd8ff, boss: 0xff6fb0, next: 0xffd23e, prev: 0x9aa8c8 };
const hubPortals = (levels, flight, boss, next, prev, needs) => [
  ...levels.map(([id, label], i) => ({ target: id, label, color: Object.values(PORTAL)[i] })),
  { target: flight[0], label: flight[1], need: { elders: needs.flight }, color: PORTAL.flight },
  { target: boss[0], label: boss[1], need: { elders: needs.boss }, color: PORTAL.boss },
  ...(next ? [{ target: next[0], label: next[1], need: { done: boss[0] }, color: PORTAL.next }] : []),
  { target: prev[0], label: prev[1], color: PORTAL.prev },
];

export const HUB_OPTS = {
  b_hub: { id: 'b_hub', name: 'The Great Anvil', world: 'brightforge', seed: 71, theme: T.forge, themeKey: 'forge', music: 'hub', landmark: 'anvil', liquid: { kind: 'lava', y: -0.5 },
    portals: hubPortals([['b1_slag', 'Slag Row'], ['b2_gears', 'Gear Works'], ['b3_terraces', 'Ember Terraces'], ['b4_pools', 'Cooling Pools']], ['b5_smoke', 'Smoke Run'], ['b6_smith', 'Cinder Smith'], ['c_hub', 'Mistral Heights'], ['m_hub', 'Mossgate Meadows'], { flight: 15, boss: 22 }),
    tips: ['Lava burns! Stay on the platforms.', 'Rescue Elders to open the Smoke Run and the Smith.'] },
  c_hub: { id: 'c_hub', name: 'Cloud Landing', world: 'mistral', seed: 72, theme: T.sky, themeKey: 'sky', music: 'hub', landmark: 'wind', liquid: { kind: 'water', y: -2 },
    portals: hubPortals([['c1_skybridge', 'Skybridge'], ['c2_windward', 'Windward Isles'], ['c3_library', 'Sunken Library'], ['c4_spires', 'Storm Spires']], ['c5_gale', 'Gale Run'], ['c6_roc', 'Storm Roc'], ['d_hub', 'Glimmerdeep'], ['b_hub', 'Brightforge Vale'], { flight: 28, boss: 35 }),
    tips: ['Updrafts lift you. Glide from the top!', 'Wind pushes you while you glide.'] },
  d_hub: { id: 'd_hub', name: 'Crystal Lake', world: 'glimmerdeep', seed: 73, theme: T.crystal, themeKey: 'crystal', music: 'hub', landmark: 'obelisk',
    portals: hubPortals([['d1_mushroom', 'Mushroom Hollow'], ['d2_prism', 'Prism Caves'], ['d3_tide', 'Tide Chambers'], ['d4_echo', 'Echo Tunnels']], ['d5_glow', 'Glow Dive'], ['d6_glowmaw', 'Glowmaw'], ['e_hub', 'Duskmarket'], ['c_hub', 'Mistral Heights'], { flight: 41, boss: 48 }),
    tips: ['Crystals glow in the dark. Follow the light.', 'Look for the glowing mushrooms.'] },
  e_hub: { id: 'e_hub', name: 'Lantern Square', world: 'duskmarket', seed: 74, theme: T.night, themeKey: 'night', music: 'hub', landmark: 'clock', liquid: { kind: 'water', y: -0.5 },
    portals: hubPortals([['e1_rooftop', 'Rooftop Run'], ['e2_alleys', 'Back Alleys'], ['e3_clock', 'Clock Tower'], ['e4_bazaar', 'Bazaar Maze']], ['e5_moon', 'Moonlit Run'], ['e6_queen', 'Lantern Queen'], ['f_hub', "Gloam's Keep"], ['d_hub', 'Glimmerdeep'], { flight: 54, boss: 61 }),
    tips: ['The market never sleeps. Neither do the thieves.', 'Lanterns show the safe way.'] },
  f_hub: { id: 'f_hub', name: 'Black Gate', world: 'keep', seed: 75, theme: T.keep, themeKey: 'keep', music: 'keep', landmark: 'gate', liquid: { kind: 'lava', y: -0.5 },
    portals: [
      { target: 'f1_wall', label: 'Outer Wall', color: PORTAL.a }, { target: 'f2_stairs', label: 'Dungeon Stairs', color: PORTAL.b }, { target: 'f3_spire', label: 'Throne Spire', color: PORTAL.c },
      { target: 'f6_gloam', label: 'Warlord Gloam', need: { elders: 68 }, color: PORTAL.boss }, { target: 'e_hub', label: 'Duskmarket', color: PORTAL.prev },
    ],
    tips: ['Warlord Gloam waits beyond the gate.', 'You have come so far. Be brave!'] },
};

// ---- flights
export const FLIGHT_OPTS = {
  b5_smoke: { id: 'b5_smoke', name: 'Smoke Run', world: 'brightforge', seed: 5, theme: T.forge, terrain: 'volcanic', liquid: { y: 2.5 }, clearance: [24, 42] },
  c5_gale: { id: 'c5_gale', name: 'Gale Run', world: 'mistral', seed: 6, theme: T.sky, terrain: 'clouds', clearance: [34, 52], music: 'flight' },
  d5_glow: { id: 'd5_glow', name: 'Glow Dive', world: 'glimmerdeep', seed: 7, theme: T.crystal, terrain: 'caves', clearance: [20, 34] },
  e5_moon: { id: 'e5_moon', name: 'Moonlit Run', world: 'duskmarket', seed: 8, theme: T.night, terrain: 'hills', clearance: [22, 38] },
};

// ---- bosses
export const BOSS_OPTS = {
  b6_smith: { id: 'b6_smith', name: 'Cinder Smith', world: 'brightforge', seed: 81, theme: T.forge, themeKey: 'forge', boss: 'smith', island: false, liquid: { kind: 'lava', y: -0.5 }, tip: 'You beat the Smith! Mistral Heights awaits.' },
  c6_roc: { id: 'c6_roc', name: 'Storm Roc', world: 'mistral', seed: 82, theme: T.sky, themeKey: 'sky', boss: 'roc', island: true, radius: 28, tip: 'You tamed the storm! Glimmerdeep is next.' },
  d6_glowmaw: { id: 'd6_glowmaw', name: 'Glowmaw', world: 'glimmerdeep', seed: 83, theme: T.crystal, themeKey: 'crystal', boss: 'glowmaw', liquid: { kind: 'water', y: -0.5 }, ringKind: 'crystal', tip: 'The deep is calm again. On to Duskmarket!' },
  e6_queen: { id: 'e6_queen', name: 'Lantern Queen', world: 'duskmarket', seed: 84, theme: T.night, themeKey: 'night', boss: 'queen', radius: 26, ringKind: 'lamppost', tip: 'The market is safe. Only the Keep remains.' },
  f6_gloam: { id: 'f6_gloam', name: 'Warlord Gloam', world: 'keep', seed: 85, theme: T.keep, themeKey: 'keep', boss: 'gloam', liquid: { kind: 'lava', y: -0.5 }, radius: 28, final: true, winTitle: 'Warlord Gloam defeated!', music: 'boss' },
};

export function buildWorlds() {
  const defs = {};
  for (const [id, o] of Object.entries(GROUND)) defs[id] = makeLevel(o);
  for (const [id, o] of Object.entries(HUB_OPTS)) defs[id] = makeHub(o);
  for (const [id, o] of Object.entries(FLIGHT_OPTS)) defs[id] = makeFlight(o);
  for (const [id, o] of Object.entries(BOSS_OPTS)) defs[id] = makeBossArena(o);
  return defs;
}
