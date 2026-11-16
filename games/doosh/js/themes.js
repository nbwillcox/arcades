// STICK DOOSH - themes.js (owner: levels)
// SGS.Themes[id] = { id, name, boss, music, sky:[top,bot], ink, mats{matId:{base,dark,light,top,pattern,cap,alpha?,glow?}},
//   gravity (multiplier, 1 = normal), wind (null | gust config), enemies{id:weight}, extras[], ambient, retro, water }
// Extra (non-contract) fields: bossName, tagline, hazards[], accent, panel, deco[], signs[].
//
// mats pattern vocabulary (terrain renderer decides how to draw; 'none' = flat colour):
//   none speckle dots cracks glowcracks rivets planks rungs vine spikes shine blocks bricks bubbles waves crate pixel stripes
// cap = style of the top cap drawn on a tile whose upper neighbour is empty, coloured `top`:
//   grass snow moss ash sand vines frost pixel dust (null/absent = no cap). glow:true = emissive (lava, glowing cracks).
// Helpers (non-enumerable): SGS.Themes.get(id), .ids, .MAT, .gust(themeOrId, t) -> {ax, dir, k, phase, warn}
// (NOTE: SGS.Themes.wind is the wind THEME; the gust helper is .gust).
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};

  // Terrain.MAT ids (DESIGN §13). Kept local so this file loads before/without terrain.js.
  const M = { EMPTY: 0, DIRT: 1, ROCK: 2, STEEL: 3, WOOD: 4, PLAT: 5, LADDER: 6, SPIKES: 7, ICE: 8, BEDROCK: 9,
    LAVA: 10, WATER: 11, MUD: 12, SAND: 13, CRATE: 14, GLASS: 15 };
  const NAMES = ['EMPTY', 'DIRT', 'ROCK', 'STEEL', 'WOOD', 'PLAT', 'LADDER', 'SPIKES', 'ICE', 'BEDROCK', 'LAVA', 'WATER',
    'MUD', 'SAND', 'CRATE', 'GLASS'];

  function mat(base, dark, light, top, pattern, extra) {
    const o = { base: base, dark: dark, light: light, top: top || null, pattern: pattern || 'none' };
    if (extra) for (const k in extra) o[k] = extra[k];
    return o;
  }

  // Generic comic palette; each theme overrides what it needs.
  const DEF = {
    1: mat('#b0602c', '#6e3714', '#dc8a4a', '#55d43a', 'speckle', { cap: 'grass' }),      // DIRT
    2: mat('#8a8ca0', '#55576a', '#b8bacb', null, 'cracks'),                               // ROCK
    3: mat('#9fb2c6', '#5d7086', '#e2ecf6', null, 'rivets'),                               // STEEL
    4: mat('#c9843a', '#86511d', '#efb26a', null, 'planks'),                               // WOOD
    5: mat('#e0a548', '#94621e', '#ffd283', null, 'planks'),                               // PLAT (one-way)
    6: mat('#e8b860', '#9a6a24', '#ffe2a0', null, 'rungs'),                                // LADDER
    7: mat('#d6dbe4', '#646b7a', '#ffffff', null, 'spikes'),                               // SPIKES
    8: mat('#9ae6ff', '#46a9de', '#eafcff', '#ffffff', 'shine', { cap: 'frost' }),         // ICE
    9: mat('#3b3448', '#211c2a', '#5d5370', null, 'blocks'),                               // BEDROCK
    10: mat('#ff5a1a', '#c42808', '#ffd43a', '#fff27a', 'bubbles', { glow: true }),       // LAVA
    11: mat('#2ea6ff', '#176bd0', '#bdf0ff', '#e8fbff', 'waves', { alpha: 0.72 }),         // WATER
    12: mat('#7a5428', '#4c3212', '#a87a44', '#8a6a3a', 'bubbles'),                        // MUD
    13: mat('#f4d06a', '#c79c38', '#fff2b4', null, 'dots'),                                // SAND
    14: mat('#d9973f', '#8c561a', '#f6c77c', null, 'crate'),                               // CRATE
    15: mat('#bdf3ff', '#6cc4e0', '#ffffff', null, 'shine', { alpha: 0.55 })               // GLASS
  };

  // Map my descriptive pattern names onto the vocabulary terrain.js actually draws
  // (solid: dirt stone brick metal wood crate ice mud hatch pixel plain; soft: plank ladder spikes lava water glass vine).
  function terrainPattern(id, p) {
    switch (p) {
      case 'speckle': case 'dots': return 'dirt';
      case 'cracks': case 'glowcracks': return 'stone';
      case 'rivets': return 'metal';
      case 'planks': return id === 5 ? 'plank' : 'wood';
      case 'rungs': return 'ladder';
      case 'shine': return id === 15 ? 'glass' : 'ice';
      case 'blocks': case 'stripes': return 'hatch';
      case 'bricks': return 'brick';
      case 'bubbles': return id === 10 ? 'lava' : 'mud';
      case 'waves': return 'water';
      case 'none': return id === 1 || id === 13 ? 'dirt' : 'plain';
      default: return p;
    }
  }

  function mats(over) {
    const out = {};
    for (let i = 1; i <= 15; i++) {
      const src = (over && over[i]) || DEF[i];
      const o = {};
      for (const k in DEF[i]) o[k] = DEF[i][k];
      for (const k in src) o[k] = src[k];
      o.name = NAMES[i];
      o.pattern = terrainPattern(i, o.pattern);
      out[i] = o;
    }
    return out;
  }

  // Base roster weights (DESIGN §7), tweaked per theme below.
  function roster(extra, mul) {
    const base = { grunt: 6, shotgunner: 2.2, gunner: 2, rocketeer: 1.2, grenadier: 1.4, shield: 1.2, dog: 1.2, jetpack: 0.9,
      brute: 0.45, turret: 1, sniper: 1, officer: 0.8, roller: 0.6 };
    if (mul) for (const k in mul) base[k] = (base[k] || 0) * mul[k];
    if (extra) for (const k in extra) base[k] = extra[k];
    return base;
  }

  // Gust config for the wind theme: the gust cycle is a pure function of time (see Themes.wind()).
  const WIND = { strength: 430, cycle: 7.5, calm: 3.9, warn: 0.9, ramp: 0.45, airMul: 1, groundMul: 0.45, bias: 0 };

  const T = {};

  T.ice = {
    name: 'Brrr-zerker Glacier', bossName: 'Frosty McChillface', tagline: 'Slippery when dooshed.',
    sky: ['#2f2a86', '#86e0ff'], ink: '#141018', accent: '#7fe8ff', panel: '#2a6fd6',
    mats: mats({
      1: mat('#e9f5ff', '#a5c3e6', '#ffffff', '#ffffff', 'dots', { cap: 'snow' }),           // packed snow
      2: mat('#6f8db8', '#3f5583', '#a3bde0', '#ffffff', 'cracks', { cap: 'snow' }),         // blue rock w/ snow
      4: mat('#a8703c', '#6a4220', '#d49a5e', '#ffffff', 'planks', { cap: 'snow' }),
      5: mat('#b98048', '#73491f', '#e0ad73', '#ffffff', 'planks', { cap: 'snow' }),
      8: mat('#8ee6ff', '#3ba2dc', '#e8fdff', '#ffffff', 'shine', { cap: 'frost' }),
      9: mat('#2b3a6e', '#18214a', '#46589a', null, 'blocks'),
      13: mat('#f4fbff', '#c4dcf2', '#ffffff', '#ffffff', 'dots', { cap: 'snow' }),
      7: mat('#c9f2ff', '#4fa6d6', '#ffffff', null, 'spikes')
    }),
    gravity: 1, wind: null,
    enemies: roster({ snowman: 3, penguin: 3 }, { dog: 0.7 }), extras: ['snowman', 'penguin'],
    ambient: 'snow', retro: false, water: null,
    hazards: ['ice', 'icicle', 'drift'], deco: ['pine', 'crystal', 'sign'],
    signs: ['SLIPPERY WHEN DOOSHED', 'NO DOOSHING', 'BRRR', 'YETI XING', 'THIN ICE (PROBABLY)']
  };

  T.fire = {
    name: 'Mount Ka-Blammo', bossName: 'Captain Combustion', tagline: 'The floor is literally lava.',
    sky: ['#2a0718', '#ff6a1a'], ink: '#141018', accent: '#ff8a1f', panel: '#d63a1a',
    mats: mats({
      1: mat('#5b3a3c', '#341f22', '#8a5a52', '#9a8a86', 'speckle', { cap: 'ash' }),         // ash soil
      2: mat('#3a2e3c', '#1e1722', '#ff7a1f', '#9a8a86', 'glowcracks', { cap: 'ash', glow: true }), // basalt w/ glowing cracks
      3: mat('#9a6a5a', '#5a3830', '#d79a7a', null, 'rivets'),                                // rusty steel
      4: mat('#7a4a2a', '#3e2414', '#b0703e', '#ff9a3a', 'planks'),                           // scorched wood
      5: mat('#8a5530', '#4a2a14', '#c27a44', null, 'planks'),
      9: mat('#241626', '#120a14', '#4a2c44', null, 'blocks'),                                // obsidian
      10: mat('#ff5a12', '#c41f06', '#ffe03a', '#fff38a', 'bubbles', { glow: true }),
      13: mat('#8a7a76', '#5a4c4a', '#b8aaa4', null, 'dots'),                                 // ash drift
      7: mat('#ffb43a', '#a0400e', '#fff2a0', null, 'spikes')
    }),
    gravity: 1, wind: null,
    enemies: roster({ imp: 3, magma: 2.5 }, { dog: 0.6 }), extras: ['imp', 'magma'],
    ambient: 'ash', retro: false, water: null,
    hazards: ['lava', 'firejet'], deco: ['skullpike', 'deadtree', 'sign'],
    signs: ['LAVA: DO NOT LICK', 'HOT HOT HOT', 'NO DOOSHING', 'FLOOR IS LAVA (REALLY)', 'SMORES ZONE']
  };

  T.wind = {
    name: 'Gustbuster Skyway', bossName: 'Gustav Blowhard', tagline: 'Hold onto your hats. And your dudes.',
    sky: ['#2b86ff', '#c4f2ff'], ink: '#141018', accent: '#7ff0c8', panel: '#36b0e8',
    mats: mats({
      1: mat('#c07a3e', '#7a4820', '#e8a666', '#62e03a', 'speckle', { cap: 'grass' }),
      2: mat('#a596c8', '#685a90', '#d2c8ee', '#62e03a', 'cracks', { cap: 'grass' }),         // floating island rock
      4: mat('#e0a040', '#9a6418', '#ffd07a', null, 'planks'),
      5: mat('#f0f4ff', '#a8b4d8', '#ffffff', null, 'planks'),                                // cloud-white planks
      9: mat('#55507a', '#33304e', '#7a74a6', null, 'blocks')
    }),
    gravity: 1, wind: WIND,
    enemies: roster({ kite: 3, fanturret: 2 }, { jetpack: 1.6, dog: 0.5, turret: 0.6 }), extras: ['kite', 'fanturret'],
    ambient: 'leaves', retro: false, water: null,
    hazards: ['gust', 'updraft', 'chasm'], deco: ['windmill', 'fence', 'sign'],
    signs: ['CAUTION: BLOWY', 'HOLD YOUR HAT', 'NO DOOSHING', 'SKYWAY ->', 'WIND: YES']
  };

  T.water = {
    name: 'Soggy Bottom Docks', bossName: 'Admiral Soggybottom', tagline: 'Tide comes in. Dudes go out.',
    sky: ['#ff6f5a', '#ffd88a'], ink: '#141018', accent: '#2ea6ff', panel: '#1f7ad6',
    mats: mats({
      1: mat('#b8864a', '#7a5428', '#e0b070', '#f4d77e', 'speckle', { cap: 'sand' }),
      2: mat('#7f93a8', '#4c5e74', '#b2c4d6', '#5fc95a', 'blocks', { cap: 'moss' }),         // sea wall
      3: mat('#6d8f9a', '#3d5a66', '#a8ccd6', null, 'rivets'),
      4: mat('#a8743e', '#674220', '#d3a26a', null, 'planks'),                                // weathered pier
      5: mat('#b8844a', '#704a22', '#e0b27a', null, 'planks'),
      11: mat('#1fa0ff', '#0d5fc8', '#b8f0ff', '#effcff', 'waves', { alpha: 0.7 }),
      13: mat('#ffe08a', '#d4ae4c', '#fff6c8', null, 'dots'),
      9: mat('#2c3a58', '#18223a', '#4a5a80', null, 'blocks')
    }),
    gravity: 1, wind: null,
    enemies: roster({ scuba: 2.5, piranha: 2.5 }, { dog: 0.6, jetpack: 0.6 }), extras: ['scuba', 'piranha'],
    ambient: 'bubbles', retro: false,
    water: { amp: 2.2, period: 17 },   // tide: rises amp TILES above rest level over a period (s); see LevelGen.waterY
    hazards: ['water', 'tide'], deco: ['lamp', 'anchor', 'sign'],
    signs: ['NO SWIMMING (OR DO)', 'FRESH-ISH FISH', 'NO DOOSHING', 'MIND THE TIDE', 'PIER PRESSURE']
  };

  T.mud = {
    name: 'Sludge Bog', bossName: 'Sir Sludgington', tagline: 'Squelch responsibly.',
    sky: ['#34402a', '#b6c25e'], ink: '#141018', accent: '#a8c43a', panel: '#6b7a2a',
    mats: mats({
      1: mat('#6b5032', '#3f2c18', '#957250', '#7fae3a', 'speckle', { cap: 'moss' }),
      2: mat('#5f6a50', '#3a422e', '#8a9878', '#7fae3a', 'cracks', { cap: 'moss' }),
      4: mat('#7a5a34', '#463018', '#a8825a', '#7fae3a', 'planks', { cap: 'moss' }),          // rotten wood
      5: mat('#8a6a3c', '#523a1a', '#b8925e', null, 'planks'),
      12: mat('#5e4220', '#36240e', '#8a6438', '#7a5a2e', 'bubbles'),
      11: mat('#5a7a3a', '#344a1e', '#9ab86a', '#b8d080', 'waves', { alpha: 0.8 }),         // swamp water
      9: mat('#2e2a1e', '#1a170f', '#4a4430', null, 'blocks')
    }),
    gravity: 1, wind: null,
    enemies: roster({ mudman: 3, gator: 2.5 }, { jetpack: 0.6 }), extras: ['mudman', 'gator'],
    ambient: 'dust', retro: false, water: null,
    hazards: ['mud', 'quicksand'], deco: ['deadtree', 'cattail', 'sign'],
    signs: ['QUICKSAND? QUICK-SAND!', 'BOG OFF', 'NO DOOSHING', 'SMELLS FINE', 'GATOR CROSSING']
  };

  T.jungle = {
    name: 'Bananarama Temple', bossName: 'Chimpanzilla', tagline: 'It is bananas in there.',
    sky: ['#18b4d8', '#d4ff9a'], ink: '#141018', accent: '#ffe23a', panel: '#2a9a3a',
    mats: mats({
      1: mat('#8a4f22', '#55300f', '#b8743e', '#36c83a', 'speckle', { cap: 'vines' }),       // grass + vines
      2: mat('#a3ad7a', '#6a744a', '#cdd6a4', '#4fd04a', 'blocks', { cap: 'moss' }),          // temple stone
      4: mat('#a0662a', '#5e3a12', '#cc9050', '#4fd04a', 'planks', { cap: 'moss' }),
      5: mat('#7ab83a', '#467a1a', '#a8e060', null, 'planks'),                                // leafy branch
      6: mat('#3fbf3f', '#1f7a22', '#8cf06a', null, 'vine'),                                  // vines
      7: mat('#c8c0a0', '#6a6450', '#fffbe0', null, 'spikes'),                                // bone/wood spikes
      9: mat('#2c3a22', '#182212', '#4a5a38', null, 'blocks')
    }),
    gravity: 1, wind: null,
    enemies: roster({ monkey: 3, snake: 2.5 }, { jetpack: 0.5 }), extras: ['monkey', 'snake'],
    ambient: 'leaves', retro: false, water: null,
    hazards: ['spikes', 'log', 'vines'], deco: ['palm', 'bush', 'sign'],
    signs: ['BEWARE OF MONKE', 'BANANA ZONE', 'NO DOOSHING', 'TEMPLE: KNOCK FIRST', 'VINES: GRAB EM']
  };

  T.mountain = {
    name: 'Mount Doosh-more', bossName: 'Billy the Kidd', tagline: 'Up. Then up some more.',
    sky: ['#1a62de', '#b2e8ff'], ink: '#141018', accent: '#ffffff', panel: '#5a6a8a',
    mats: mats({
      1: mat('#8f6a4a', '#57402a', '#bb9472', '#5fc24a', 'speckle', { cap: 'grass' }),
      2: mat('#8a8a9e', '#55556a', '#babacc', '#f4f8ff', 'cracks', { cap: 'snow' }),         // granite, snowy top
      4: mat('#b07a40', '#6c4a20', '#d8a46a', null, 'planks'),
      9: mat('#3a3a4c', '#22222e', '#5a5a70', null, 'blocks')
    }),
    gravity: 1, wind: null,
    enemies: roster({ goat: 3, rockthrower: 2.5 }, { dog: 0.6, sniper: 1.5 }), extras: ['goat', 'rockthrower'],
    ambient: 'dust', retro: false, water: null,
    hazards: ['rockslide', 'climb'], deco: ['pine', 'rock', 'sign'],
    signs: ['GOATS ONLY', 'FALLING ROCKS (DUH)', 'NO DOOSHING', 'SUMMIT: UP', 'YODEL-FREE ZONE']
  };

  T.plains = {
    name: 'Cornfed Plains', bossName: 'Colonel Cornhusk', tagline: 'Mooo-ve it or lose it.',
    sky: ['#38b4ff', '#fff4a6'], ink: '#141018', accent: '#ffd23a', panel: '#d6a21a',
    mats: mats({
      1: mat('#a05e2a', '#643812', '#cc8a4e', '#7ee23a', 'speckle', { cap: 'grass' }),
      4: mat('#d6382a', '#8a1a14', '#ff7a5a', null, 'planks'),                                // red barn boards
      5: mat('#e6b04a', '#9a6e1e', '#ffd88a', null, 'planks'),                                // hayloft
      3: mat('#c6ced8', '#7a8494', '#f2f6fa', null, 'rivets'),                                // silo
      13: mat('#ffd84a', '#d4a418', '#fff2a8', null, 'dots'),                                 // hay
      9: mat('#4a3424', '#2c1e14', '#6a4c36', null, 'blocks')
    }),
    gravity: 1, wind: null,
    enemies: roster({ cow: 3, crow: 2.5 }, { dog: 1.3 }), extras: ['cow', 'crow'],
    ambient: 'leaves', retro: false, water: null,
    hazards: ['stampede', 'ufo'], deco: ['fence', 'hay', 'windmill', 'sign'],
    signs: ['FRESH COWS', 'BEWARE OF UFO', 'NO DOOSHING', 'CORN: YES', 'HAY IS FOR DUDES']
  };

  T.fantasy = {
    name: 'Castle Wizzlebeard', bossName: 'Wizard Wizzlebeard', tagline: 'Magic missiles at the ready.',
    sky: ['#46207a', '#ff9ad2'], ink: '#141018', accent: '#c87aff', panel: '#7a3ad6',
    mats: mats({
      1: mat('#7a5a3a', '#4a341e', '#a8825c', '#4fd46a', 'speckle', { cap: 'grass' }),
      2: mat('#a39bb8', '#696180', '#d2cce4', '#4fd46a', 'bricks', { cap: 'moss' }),         // castle stone
      3: mat('#7f8ab0', '#4c5578', '#b8c2e4', null, 'rivets'),
      4: mat('#9a6a3a', '#5c3c1c', '#c89660', null, 'planks'),                                // drawbridge
      11: mat('#3a7aff', '#1e4ac8', '#a8c8ff', '#e0ecff', 'waves', { alpha: 0.72 }),          // moat
      9: mat('#3a2f5a', '#221a3a', '#5c4c86', null, 'blocks')
    }),
    gravity: 1, wind: null,
    enemies: roster({ skeleton: 3.5, apprentice: 2.5 }, { dog: 0.6, jetpack: 0.5 }), extras: ['skeleton', 'apprentice'],
    ambient: 'stars', retro: false, water: null,
    hazards: ['moat', 'drawbridge'], deco: ['banner', 'torch', 'mushroom', 'sign'],
    signs: ['WIZARD PARKING ONLY', 'NO DOOSHING', 'BEWARE: BEARD', 'DRAGONS: PROBABLY', 'MOAT FOR SALE']
  };

  T.moon = {
    name: 'Moon Base Bonkers', bossName: 'Emperor Zorp', tagline: 'One small doosh for a dude.',
    sky: ['#04030e', '#211a4a'], ink: '#141018', accent: '#7aff6a', panel: '#3a3a6a',
    mats: mats({
      1: mat('#a8a8bc', '#6c6c82', '#d6d6e6', '#e4e4f2', 'dots', { cap: 'dust' }),            // regolith
      2: mat('#6f6f84', '#43435a', '#9c9cb4', '#c8c8d8', 'cracks', { cap: 'dust' }),
      3: mat('#b8c6dc', '#6e7c98', '#eef4ff', null, 'rivets'),
      13: mat('#c8c8d6', '#8a8aa0', '#ececf6', null, 'dots'),
      15: mat('#9ff0ff', '#4ab8d6', '#ffffff', null, 'shine', { alpha: 0.5 }),
      9: mat('#2a2a3c', '#16161f', '#46465e', null, 'blocks'),
      5: mat('#c8d0e0', '#7c869c', '#ffffff', null, 'rivets')
    }),
    gravity: 0.35, wind: null,
    enemies: roster({ alien: 4, bouncer: 2.5 }, { dog: 0.3, jetpack: 1.3 }), extras: ['alien', 'bouncer'],
    ambient: 'dust', retro: false, water: null,
    hazards: ['lowgrav', 'crater'], deco: ['antenna', 'moonflag', 'sign'],
    signs: ['1/6 G AHEAD', 'NO DOOSHING IN SPACE', 'BOUNCE ZONE', 'AIR: BYO', 'EARTH: THAT WAY']
  };

  // Retro: 4-colour Game-Boy-ish palette. c0 darkest .. c3 lightest.
  const GB = ['#0f380f', '#306230', '#8bac0f', '#9bbc0f'];
  T.retro = {
    name: '8-Bit Bonanza', bossName: 'GL1TCH.EXE', tagline: 'PRESS START TO DOOSH.',
    sky: [GB[3], GB[2]], ink: GB[0], accent: GB[3], panel: GB[1], palette: GB,
    mats: mats({
      1: mat(GB[1], GB[0], GB[2], GB[3], 'pixel', { cap: 'pixel' }),
      2: mat(GB[2], GB[0], GB[3], null, 'bricks'),
      3: mat(GB[1], GB[0], GB[2], null, 'rivets'),
      4: mat(GB[2], GB[0], GB[3], null, 'planks'),
      5: mat(GB[2], GB[0], GB[3], null, 'planks'),
      6: mat(GB[3], GB[0], GB[2], null, 'rungs'),
      7: mat(GB[3], GB[0], GB[2], null, 'spikes'),
      8: mat(GB[3], GB[1], GB[2], GB[3], 'pixel'),
      9: mat(GB[0], GB[0], GB[1], null, 'blocks'),
      10: mat(GB[3], GB[1], GB[2], GB[3], 'pixel', { glow: true }),
      11: mat(GB[2], GB[1], GB[3], GB[3], 'waves', { alpha: 0.8 }),
      12: mat(GB[1], GB[0], GB[2], null, 'pixel'),
      13: mat(GB[3], GB[1], GB[2], null, 'dots'),
      14: mat(GB[2], GB[0], GB[3], null, 'crate'),
      15: mat(GB[3], GB[2], GB[3], null, 'shine', { alpha: 0.6 })
    }),
    gravity: 1, wind: null,
    enemies: roster({ bitgoon: 4, pixelghost: 2.5 }, { brute: 0.8 }), extras: ['bitgoon', 'pixelghost'],
    ambient: 'pixels', retro: true, water: null,
    hazards: ['spikes', 'pits'], deco: ['pixelbush', 'pixeltree', 'sign'],
    signs: ['PRESS START', 'INSERT COIN (NO)', 'NO DOOSHING', 'HI SCORE: YOU', 'LOADING...']
  };

  T.fortress = {
    name: 'DOOSH FORTRESS', bossName: 'General Doom-Doosh', tagline: 'Everything. All at once.',
    sky: ['#14040c', '#8c1224'], ink: '#141018', accent: '#ff2a3a', panel: '#5a0a14',
    mats: mats({
      1: mat('#4a3530', '#2a1c18', '#6e5048', '#8a7a6a', 'speckle', { cap: 'ash' }),
      2: mat('#4c3e48', '#2a2028', '#74626e', null, 'cracks'),
      3: mat('#5c6474', '#343a48', '#8e98ac', null, 'rivets'),                                // gunmetal
      4: mat('#6a4a32', '#3a2618', '#946a4a', null, 'planks'),
      5: mat('#ffcc1a', '#2a2228', '#fff07a', null, 'stripes'),                               // hazard-stripe catwalks
      7: mat('#c8ccd6', '#5a5e6a', '#ffffff', null, 'spikes'),
      9: mat('#1c1418', '#0c080a', '#3a2a32', null, 'blocks'),
      10: mat('#ff4a12', '#b81c06', '#ffd43a', '#fff38a', 'bubbles', { glow: true })
    }),
    gravity: 1, wind: null,
    enemies: roster({ snowman: 0.3, imp: 0.4, kite: 0.3, scuba: 0, mudman: 0.3, monkey: 0.3, goat: 0.3, cow: 0.3,
      skeleton: 0.4, alien: 0.4, bitgoon: 0.4 }, { brute: 2.2, turret: 2, officer: 1.5, shield: 1.6, rocketeer: 1.4 }),
    extras: ['skeleton', 'alien', 'bitgoon', 'imp'],
    ambient: 'ash', retro: false, water: null,
    hazards: ['spikes', 'lava', 'firejet', 'rockslide', 'icicle'], deco: ['skullpike', 'wire', 'sign'],
    signs: ['DOOSHINATOR WAS HERE', 'NO GOOD DOOSHING', 'EVIL: THIS WAY', 'TRESPASSERS WILL BE DOOSHED', 'KEEP OUT (PLS)']
  };

  const IDS = ['ice', 'fire', 'wind', 'water', 'mud', 'jungle', 'mountain', 'plains', 'fantasy', 'moon', 'retro', 'fortress'];
  for (const id of IDS) {
    const th = T[id];
    th.id = id;
    th.boss = id;
    th.music = id === 'fortress' ? 'title' : id;
    if (th.gravity == null) th.gravity = 1;
  }

  // ---- helpers ----
  function hash1(n) {
    let x = (n | 0) * 374761393 + 668265263;
    x = Math.imul(x ^ (x >>> 13), 1274126177);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  // Wind gust state at time t (seconds). Pure function so any system can query it.
  // Returns { ax: px/s^2 horizontal push at full strength (multiply by airMul/groundMul as you see fit),
  //           dir: -1|1 (direction of the current/next gust), k: 0..1 gust intensity,
  //           phase: 'calm'|'warn'|'gust', warn: 0..1 telegraph progress (show streaks/leaves before the gust) }
  function gust(theme, t) {
    const th = typeof theme === 'string' ? T[theme] : theme;
    const W = th && th.wind;
    if (!W) return { ax: 0, dir: 0, k: 0, phase: 'calm', warn: 0 };
    const cyc = Math.floor(t / W.cycle);
    const ph = t - cyc * W.cycle;
    const dir = hash1(cyc * 7 + 3) < 0.5 + (W.bias || 0) ? -1 : 1;
    const gustLen = W.cycle - W.calm - W.warn;
    if (ph < W.calm) return { ax: 0, dir: dir, k: 0, phase: 'calm', warn: 0 };
    if (ph < W.calm + W.warn) return { ax: 0, dir: dir, k: 0, phase: 'warn', warn: (ph - W.calm) / W.warn };
    const g = ph - W.calm - W.warn;
    const k = Math.min(1, g / W.ramp, (gustLen - g) / W.ramp);
    return { ax: dir * W.strength * k, dir: dir, k: k, phase: 'gust', warn: 1 };
  }

  const Themes = S.Themes = S.Themes || {};
  for (const id of IDS) Themes[id] = T[id];
  Object.defineProperty(Themes, 'ids', { value: IDS.slice(), enumerable: false });
  Object.defineProperty(Themes, 'MAT', { value: M, enumerable: false });
  Object.defineProperty(Themes, 'get', { value: function (id) { return T[id] || T.plains; }, enumerable: false });
  Object.defineProperty(Themes, 'gust', { value: gust, enumerable: false });
})();
