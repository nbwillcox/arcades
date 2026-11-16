// STICK DOOSH - levelgen.js (owner: levels)
// SGS.LevelGen.build(themeId, seed?, diff?) -> level (DESIGN §13 shape + extras):
// {
//   id, theme, seed, w, h, T,                 // tiles: w x h, T px per tile
//   tiles: Uint8Array(w*h)  (tiles[ty*w+tx] = Terrain.MAT id),
//   back:  Uint8Array(w*h)  back-wall material per NON-open-air cell (ground mass, caves, pits, building interiors, tower legs,
//                           pier posts, + a 1-cell skin under wall/roof/floor tiles): drawn darkened behind everything that is
//                           not an opaque solid, no collision, so destroyed tiles reveal it instead of the sky. 0 = open air.
//   surface: Int16Array(w)  natural ground row per column (cells below it that are empty = cave),
//   spawn: {x,y},            // px, x = centre, y = FEET
//   ents: [{type,id?,x,y,...}],   // px, x = centre, y = feet. types:
//       'enemy'   {id, facing:-1, perch?, air?, water?}         ids from Themes[t].enemies
//       'crate'   {loot: null | pickup id}                       null => just gold
//       'barrel'  {}            'cage' {}       'goldbar' {}       'pickup' {id}
//       'flag'    {idx}         (same objects as level.flags)
//       'hazard'  {id, ...}     see HAZARDS below
//       'ladderTop' {}          top of each ladder (x centre of ladder column, y = top px of top ladder tile)
//   flags: [{x,y,idx}],      // checkpoint flags (also present in ents as type 'flag')
//   arena: {x0,y0,x1,y1, bossX,bossY, tx0,ty0,tx1,ty1, floorY, entryX,entryY, door:{tx,ty0,ty1,w,x,y}}
//          x0..x1/y0..y1 = interior px rect (y1 = floor surface = feet y). Door = tiles to seal (BEDROCK) on fight start.
//   water: null | {y, amp, period, x0, x1}  tide band (water theme): rest surface y px, rises `amp` px (see waterY)
//   deco:  [{id, x, y, kind?, text?, h?, flip?}]   cosmetic, drawn by SGS.Backdrops.deco() (behind terrain)
//   gravity, stats{...}
// }
// HAZARDS (type 'hazard'; px):
//   icicle    {x, y=ceiling bottom px}               hangs; falls when a player is below within ~2 tiles; 1 dmg; shatters
//   firejet   {x, y=ground top, h px, period, on, phase}  flame column shooting UP for `on` s every `period` s (0.5 s puff telegraph)
//   rockslide {x, y=feet, dir, period}               spawns a rolling boulder every period s while player within ~700 px
//   log       {x, y=feet, dir, period}               same as rockslide but a rolling log (jungle)
//   quicksand {x0, x1, y}                            MUD band: entities standing in it sink slowly / move slow
//   updraft   {x, y=bottom px, w, h}                 upward push zone (wind chasms): accel up ~1.4*GRAV inside
//   stampede  {x, y, dir:-1, count}                  trigger: when player x > x-400, spawn `count` charging 'cow' enemies off-screen right
// Also: SGS.LevelGen.analyze(level) -> {reach:Uint8Array, ok, ...}  (BFS reachability, used by tools/levelcheck.js)
//       SGS.LevelGen.waterY(level, t) -> current tide surface y px (or null)
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};

  const E = 0, DIRT = 1, ROCK = 2, STEEL = 3, WOOD = 4, PLAT = 5, LADDER = 6, SPIKES = 7, ICE = 8, BEDROCK = 9,
    LAVA = 10, WATER = 11, MUD = 12, SAND = 13, CRATE = 14, GLASS = 15;
  const SOLID = new Uint8Array(16);
  [DIRT, ROCK, STEEL, WOOD, ICE, BEDROCK, MUD, SAND, CRATE, GLASS].forEach(function (m) { SOLID[m] = 1; });
  const HAZ = new Uint8Array(16); HAZ[SPIKES] = 1; HAZ[LAVA] = 1;

  function TILE() { return (S.C && S.C.T) || 20; }

  // ---------------------------------------------------------------- rng / hash
  function rng(seed) {
    let a = seed >>> 0;
    function next() {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    return {
      next: next,
      range: function (lo, hi) { return lo + (hi - lo) * next(); },
      int: function (lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
      pick: function (arr) { return arr[Math.floor(next() * arr.length)]; },
      chance: function (p) { return next() < p; },
      wpick: function (obj) {
        let tot = 0;
        for (const k in obj) tot += Math.max(0, obj[k]);
        let v = next() * tot;
        for (const k in obj) { v -= Math.max(0, obj[k]); if (v < 0) return k; }
        for (const k in obj) if (obj[k] > 0) return k;
        return null;
      }
    };
  }
  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  const IDS = ['ice', 'fire', 'wind', 'water', 'mud', 'jungle', 'mountain', 'plains', 'fantasy', 'moon', 'retro', 'fortress'];
  const DEFAULT_SEEDS = {};
  const SALT = { water: 1 };   // picked so the very first attempt is already beatable + vertical enough (fast default build)
IDS.forEach(function (id) { DEFAULT_SEEDS[id] = hashStr('stick-doosh:' + id + ':' + (SALT[id] || 0)); });

  // ---------------------------------------------------------------- theme generation profiles
  // seg = extra/override segment weights; must = [segment, progress 0..1] forced once.
  const PROF = {
    ice: { w: 300, h: 70, surf: DIRT, soil: DIRT, deep: ROCK, pocket: ICE, pocketP: 0.16, soilDepth: 4,
      wall: ROCK, build: WOOD, floor: WOOD, bridge: WOOD, ledge: ICE, pitBot: 'spikes',
      seg: { iceField: 4 }, must: [['iceField', 0.12], ['iceField', 0.62]], tree: 'pine', dens: 1.1 },
    fire: { w: 292, h: 74, surf: DIRT, soil: DIRT, deep: ROCK, pocket: SAND, pocketP: 0.1, soilDepth: 3,
      wall: ROCK, build: STEEL, floor: WOOD, bridge: WOOD, ledge: ROCK, pitBot: 'lava',
      seg: { lavaPools: 4, lavaLake: 3 }, must: [['lavaLake', 0.3], ['lavaLake', 0.72]], tree: 'dead', dens: 1.1 },
    wind: { w: 304, h: 80, surf: DIRT, soil: DIRT, deep: ROCK, pocket: ROCK, pocketP: 0.12, soilDepth: 5,
      wall: WOOD, build: WOOD, floor: WOOD, bridge: PLAT, ledge: PLAT, pitBot: 'none', gapMax: 4,
      seg: { skyIslands: 5, ledges: 3, pit: 1 }, must: [['skyIslands', 0.22], ['skyIslands', 0.55], ['skyIslands', 0.82]],
      tree: 'round', dens: 1.0 },
    water: { w: 300, h: 66, surf: DIRT, soil: SAND, deep: ROCK, pocket: SAND, pocketP: 0.15, soilDepth: 4,
      wall: ROCK, build: WOOD, floor: WOOD, bridge: WOOD, ledge: WOOD, pitBot: 'water',
      seg: { docks: 4 }, must: [['harbour', 0.42], ['docks', 0.15], ['docks', 0.75]], tree: 'palm', dens: 1.05 },
    mud: { w: 292, h: 64, surf: DIRT, soil: DIRT, deep: ROCK, pocket: MUD, pocketP: 0.16, soilDepth: 5,
      wall: WOOD, build: WOOD, floor: WOOD, bridge: WOOD, ledge: PLAT, pitBot: 'mud',
      seg: { bog: 5 }, must: [['bog', 0.15], ['bog', 0.5], ['bog', 0.8]], tree: 'dead', dens: 1.05 },
    jungle: { w: 300, h: 76, surf: DIRT, soil: DIRT, deep: ROCK, pocket: ROCK, pocketP: 0.14, soilDepth: 4,
      wall: ROCK, build: ROCK, floor: WOOD, bridge: WOOD, ledge: PLAT, pitBot: 'spikes', beam: WOOD,
      seg: { vineCanyon: 4, temple: 2 }, must: [['vineCanyon', 0.2], ['temple', 0.45], ['vineCanyon', 0.7]],
      tree: 'jungle', dens: 1.1 },
    mountain: { w: 272, h: 90, surf: DIRT, soil: DIRT, deep: ROCK, pocket: DIRT, pocketP: 0.12, soilDepth: 3,
      wall: ROCK, build: WOOD, floor: WOOD, bridge: WOOD, ledge: ROCK, pitBot: 'none', climb: true,
      seg: { tallClimb: 5, cliffUp: 4, ledges: 3, cliffDown: 0.5, stepsDown: 0.5 },
      must: [['tallClimb', 0.25], ['tallClimb', 0.6]], tree: 'pine', dens: 1.05 },
    plains: { w: 320, h: 62, surf: DIRT, soil: DIRT, deep: ROCK, pocket: ROCK, pocketP: 0.1, soilDepth: 5,
      wall: WOOD, build: WOOD, floor: PLAT, bridge: WOOD, ledge: PLAT, pitBot: 'none',
      seg: { farm: 4, silo: 3, flat: 5 }, must: [['farm', 0.2], ['silo', 0.4], ['farm', 0.65]], tree: 'round', dens: 1.1 },
    fantasy: { w: 300, h: 80, surf: DIRT, soil: DIRT, deep: ROCK, pocket: ROCK, pocketP: 0.12, soilDepth: 4,
      wall: ROCK, build: ROCK, floor: WOOD, bridge: WOOD, ledge: ROCK, pitBot: 'water',
      seg: { castle: 4, tower: 3 }, must: [['castle', 0.3], ['castle', 0.7]], tree: 'round', dens: 1.1 },
    moon: { w: 310, h: 68, surf: DIRT, soil: DIRT, deep: ROCK, pocket: SAND, pocketP: 0.14, soilDepth: 4,
      wall: STEEL, build: STEEL, floor: PLAT, bridge: PLAT, ledge: STEEL, pitBot: 'none',
      seg: { craters: 5, moonbase: 3, tunnel: 0.6 }, must: [['moonbase', 0.3], ['craters', 0.5], ['moonbase', 0.75]],
      tree: null, dens: 1.05 },
    retro: { w: 300, h: 64, surf: DIRT, soil: DIRT, deep: ROCK, pocket: ROCK, pocketP: 0.12, soilDepth: 3,
      wall: ROCK, build: ROCK, floor: ROCK, bridge: ROCK, ledge: ROCK, pitBot: 'spikes',
      seg: { bricks: 5, pyramid: 3 }, must: [['pyramid', 0.25], ['bricks', 0.5], ['pyramid', 0.8]], tree: 'pixel', dens: 1.1 },
    fortress: { w: 340, h: 86, surf: DIRT, soil: ROCK, deep: ROCK, pocket: STEEL, pocketP: 0.14, soilDepth: 3,
      wall: STEEL, build: STEEL, floor: PLAT, bridge: PLAT, ledge: STEEL, pitBot: 'spikes', beam: STEEL,
      seg: { steelworks: 4, lavaLake: 1.5, lavaPools: 1, castle: 1, tallClimb: 1, skyIslands: 0.6, vineCanyon: 0.8, bunker: 3 },
      must: [['steelworks', 0.15], ['lavaLake', 0.35], ['castle', 0.5], ['steelworks', 0.7], ['tallClimb', 0.85]],
      tree: null, dens: 1.35 }
  };

  // common segment weights (themes add/override via PROF.seg)
  const COMMON = { flat: 3, bunker: 2, stepsUp: 2, stepsDown: 2, cliffUp: 2, cliffDown: 2, tower: 2, pit: 2,
    under: 2.2, tunnel: 2, building: 2, ledges: 1.6 };
  const ALT = { stepsUp: -1, cliffUp: -1, tallClimb: -1, stepsDown: 1, cliffDown: 1 };

  // enemy placement class: g ground, f needs a flat run, p prefers perches, a flies, w swims
  const EKIND = { grunt: 'g', shotgunner: 'g', gunner: 'g', rocketeer: 'g', grenadier: 'g', shield: 'g', dog: 'f', jetpack: 'a',
    brute: 'g', turret: 'p', sniper: 'p', officer: 'g', roller: 'f', snowman: 'g', penguin: 'f', imp: 'g', magma: 'g',
    kite: 'a', fanturret: 'p', scuba: 'w', piranha: 'w', mudman: 'g', gator: 'f', monkey: 'p', snake: 'g', goat: 'g',
    rockthrower: 'p', cow: 'f', crow: 'a', skeleton: 'g', apprentice: 'g', alien: 'g', bouncer: 'f', bitgoon: 'g',
    pixelghost: 'a' };

  // pickup ids for crate loot / free pickups (weapon ids from SGS.Weapons + power-ups)
  const LOOT = { spread: 18, mg: 16, shotgun: 12, rocket: 12, flame: 12, laser: 10, barrier: 7, rapid: 8, heal: 10, ammo: 9, gold: 6 };

  function diffMul(d) {
    if (typeof d === 'number' && isFinite(d)) return d;
    if (typeof d === 'string') return ({ baby: 0.7, easy: 0.7, normal: 1, ultra: 1.35, hard: 1.35 })[d] || 1;
    if (d && typeof d === 'object' && d.enemyRate) return d.enemyRate;
    return 1;
  }

  // ================================================================= generator
  function generate(themeId, seed, dm) {
    const P = PROF[themeId] || PROF.plains;
    const TH = (S.Themes && S.Themes[themeId]) || null;
    const T = TILE();
    const r = rng(seed), re = rng((seed ^ 0x5bd1e995) >>> 0), rl = rng((seed + 0x9e3779b9) >>> 0);
    const w = P.w, h = P.h;
    const tiles = new Uint8Array(w * h), back = new Uint8Array(w * h);
    const surf = new Int16Array(w).fill(h - 2);
    const ents = [], deco = [], spots = [], safe = [], cageSpots = [], bonus = [], gold = [], docks = [];
    const gMin = 18, gMax = h - 18;
    const PX = function (tx) { return tx * T + T / 2; };

    // ---- grid helpers
    function get(x, y) { if (y < 0) return E; if (x < 0 || x >= w || y >= h) return BEDROCK; return tiles[y * w + x]; }
    function set(x, y, m) { if (x < 2 || x >= w - 2 || y < 0 || y >= h - 2) return; tiles[y * w + x] = m; }
    function rect(x0, y0, x1, y1, m) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, m); }
    function clear(x0, y0, x1, y1) { rect(x0, y0, x1, y1, E); }
    function setBack(x0, y0, x1, y1, m) {
      for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1); y++)
        for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1); x++) back[y * w + x] = m;
    }
    function nz(x, y) {
      let v = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
      v = Math.imul(v ^ (v >>> 13), 1274126177);
      return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
    }
    function stratum(x, y, g) {
      const d = y - g;
      if (d === 0) return P.surf;
      if (d < P.soilDepth + ((nz(x, 7) * 2.5) | 0)) return P.soil;
      return nz(x >> 1, y >> 1) < P.pocketP ? P.pocket : P.deep;
    }
    function col(x, g) {
      if (x < 2 || x >= w - 2) return;
      surf[x] = g;
      for (let y = 0; y < h - 2; y++) tiles[y * w + x] = y < g ? E : stratum(x, y, g);
    }
    // pile material on top of the existing natural ground (hills, mesas)
    function raise(x0, x1, top, mat, topMat) {
      for (let x = x0; x <= x1; x++) {
        if (x < 2 || x >= w - 2 || top >= surf[x]) continue;
        for (let y = top; y < surf[x]; y++) set(x, y, y === top ? (topMat || mat || P.surf) : (mat || P.soil));
        set(x, surf[x], mat || P.soil);
        surf[x] = top;
      }
    }
    function spot(x, y, k) { spots.push({ x: x, y: y, k: k }); }
    function run(x0, x1, y, k) { for (let x = x0; x <= x1; x++) spot(x, y, k); }
    function safeRun(x0, x1, y) { for (let x = x0; x <= x1; x++) safe.push({ x: x, y: y }); }
    function hazard(id, x, y, extra) {
      const o = { type: 'hazard', id: id, x: x, y: y };
      if (extra) for (const k in extra) o[k] = extra[k];
      ents.push(o);
    }
    function decoAt(id, tx, ty, extra) {
      const o = { id: id, x: PX(tx), y: ty * T };
      if (extra) for (const k in extra) o[k] = extra[k];
      deco.push(o);
    }
    function ladder(x, yTop, yBot) {
      for (let y = yTop; y <= yBot; y++) set(x, y, LADDER);
      ents.push({ type: 'ladderTop', x: PX(x), y: yTop * T });
    }
    function goldPocket(x, y) {   // y = solid row the bar rests on; pocket cell (x, y-1)
      if (x < 3 || x >= w - 3 || y - 1 < 1 || y >= h - 2) return;
      if (!SOLID[get(x, y - 1)] || !SOLID[get(x, y)] || get(x, y) === BEDROCK) return;
      set(x, y - 1, E);
      back[(y - 1) * w + x] = P.deep;
      gold.push({ x: x, y: y, hidden: true });
    }
    function signText() {
      const list = (TH && TH.signs) || ['NO DOOSHING'];
      return rl.pick(list);
    }
    function treeAt(tx, g) {
      if (!P.tree) return;
      decoAt('tree', tx, g, { kind: P.tree, h: rl.int(4, 8) * T, flip: rl.chance(0.5) });
    }

    // ---- theme flavour on open flat runs
    function flavorFlat(x0, x1, g) {
      const len = x1 - x0 + 1;
      if (len < 6) return;
      const mid = rl.int(x0 + 2, x1 - 2);
      switch (themeId) {
        case 'ice':
          if (r.chance(0.5)) { const a = r.int(x0 + 1, Math.max(x0 + 1, x1 - 6)); for (let x = a; x <= Math.min(x1, a + r.int(4, 7)); x++) set(x, g, ICE); }
          if (rl.chance(0.4)) decoAt('crystal', mid, g, { flip: rl.chance(0.5) });
          break;
        case 'fire':
          if (r.chance(0.8)) hazard('firejet', PX(mid), g * T, { h: 5 * T, period: r.range(2.4, 3.4), on: 1.0, phase: r.range(0, 3) });
          if (rl.chance(0.3)) decoAt('skullpike', rl.int(x0, x1), g);
          break;
        case 'wind':
          if (rl.chance(0.35)) decoAt('windmill', mid, g, { h: 7 * T });
          if (r.chance(0.6) && g - 6 > 3) { const a = r.int(x0 + 1, x1 - 5), pw = r.int(4, 6); rect(a, g - 5, Math.min(x1, a + pw), g - 5, PLAT); run(a, Math.min(x1, a + pw), g - 5, 'p'); }
          break;
        case 'water':
          if (r.chance(0.45)) { const a = r.int(x0 + 1, x1 - 2); set(a, g - 1, CRATE); if (r.chance(0.5)) set(a + 1, g - 1, CRATE); }
          if (rl.chance(0.4)) decoAt('lamp', mid, g);
          break;
        case 'mud':
          if (len >= 9 && r.chance(0.55)) {
            const pw = r.int(3, 5), a = r.int(x0 + 2, x1 - pw - 1);
            rect(a, g, a + pw - 1, g + 1, MUD);
            hazard('quicksand', a * T, g * T, { x0: a * T, x1: (a + pw) * T });
          }
          if (rl.chance(0.4)) decoAt('cattail', mid, g);
          break;
        case 'jungle':
          if (len >= 10 && r.chance(0.35)) { const a = r.int(x0 + 3, x1 - 4); rect(a, g, a + 1, g, SPIKES); }
          if (rl.chance(0.45)) decoAt('bush', mid, g, { flip: rl.chance(0.5) });
          break;
        case 'mountain':
          if (rl.chance(0.4)) decoAt('rock', mid, g, { flip: rl.chance(0.5) });
          break;
        case 'plains':
          if (rl.chance(0.5)) decoAt('fence', mid, g, { w: rl.int(3, 5) * T });
          if (r.chance(0.35)) { const a = r.int(x0 + 1, x1 - 2); set(a, g - 1, SAND); set(a + 1, g - 1, SAND); }
          if (len >= 12 && r.chance(0.3)) hazard('stampede', PX(x1), g * T, { dir: -1, count: r.int(3, 5) });
          break;
        case 'fantasy':
          if (rl.chance(0.5)) decoAt(rl.chance(0.5) ? 'mushroom' : 'banner', mid, g, { flip: rl.chance(0.5) });
          break;
        case 'moon':
          if (rl.chance(0.4)) decoAt(rl.chance(0.6) ? 'antenna' : 'moonflag', mid, g);
          break;
        case 'retro':
          if (len >= 9 && r.chance(0.6)) { const a = r.int(x0 + 1, x1 - 5), bw = r.int(3, 5); rect(a, g - 4, a + bw - 1, g - 4, ROCK); bonus.push({ x: a + 1, y: g - 4 }); }
          if (rl.chance(0.4)) decoAt('pixelbush', mid, g);
          break;
        case 'fortress':
          if (len >= 10 && r.chance(0.4)) { const a = r.int(x0 + 3, x1 - 4); rect(a, g, a + 1, g, SPIKES); }
          else if (r.chance(0.4)) hazard('firejet', PX(mid), g * T, { h: 5 * T, period: r.range(2.2, 3.2), on: 1.0, phase: r.range(0, 3) });
          if (rl.chance(0.4)) decoAt(rl.chance(0.5) ? 'skullpike' : 'wire', rl.int(x0, x1), g);
          break;
      }
      if (rl.chance(0.18)) decoAt('sign', rl.int(x0, x1), g, { text: signText() });
      else if (rl.chance(0.35)) treeAt(rl.int(x0, x1), g);
    }

    function caveFlavor(x0, x1, ceilRow, floorRow) {
      // ceilRow = first empty row of the cave, floorRow = solid floor row
      if (themeId === 'ice' || (themeId === 'fortress' && r.chance(0.3))) {
        for (let x = x0 + 3; x <= x1 - 2; x += r.int(4, 7)) if (SOLID[get(x, ceilRow - 1)]) hazard('icicle', PX(x), ceilRow * T);
      } else if ((themeId === 'fire' || themeId === 'fortress') && x1 - x0 > 12 && r.chance(0.6)) {
        const a = r.int(x0 + 4, x1 - 6); rect(a, floorRow, a + 1, floorRow + 1, LAVA);
      } else if (themeId === 'water' && x1 - x0 > 10) {
        const a = r.int(x0 + 2, x1 - 8); rect(a, floorRow - 2, a + 5, floorRow - 1, WATER);
        spot(a + 2, floorRow - 1, 'w');
      } else if (themeId === 'mud' && x1 - x0 > 10) {
        const a = r.int(x0 + 2, x1 - 6); rect(a, floorRow, a + 3, floorRow + 1, MUD);
      }
    }

    // ---- segments: each fills columns [x, x+len) and returns {x: x+len, g: newGround} or null
    const SEG = {};

    SEG.flat = function (x, g, room) {
      const len = Math.min(room, r.int(10, 18));
      const H = []; for (let i = 0; i < len; i++) H.push(g);
      if (len >= 10 && r.chance(0.5)) {
        const bw = r.int(2, 4), bx = r.int(2, len - bw - 2), d = r.chance(0.6) ? -1 : 1;
        for (let i = 0; i < bw; i++) H[bx + i] = g + d;
      }
      for (let i = 0; i < len; i++) { col(x + i, H[i]); spot(x + i, H[i], 'g'); if (H[i] === g) safe.push({ x: x + i, y: g }); }
      if (r.chance(0.3)) goldPocket(x + r.int(2, len - 3), g + r.int(3, 4));
      flavorFlat(x, x + len - 1, g);
      return { x: x + len, g: g };
    };

    SEG.bunker = function (x, g, room) {
      const bw = r.int(8, 11), len = bw + 6;
      if (room < len || g - 7 < 2) return null;
      for (let i = 0; i < len; i++) col(x + i, g);
      const bx = x + 3, bx1 = bx + bw - 1, top = g - 6, M = P.wall;
      rect(bx, top, bx1, top, M);
      rect(bx, top + 1, bx, g - 1, M); rect(bx1, top + 1, bx1, g - 1, M);
      clear(bx, g - 3, bx, g - 1);             // door
      clear(bx1, g - 4, bx1, g - 2);           // window with a 1-high sill
      set(bx, top - 1, M); set(bx1, top - 1, M);
      setBack(bx + 1, top + 1, bx1 - 1, g - 1, M);
      if (themeId === 'ice') for (let ix = bx + 2; ix < bx1 - 1; ix += r.int(3, 4)) hazard('icicle', PX(ix), (top + 1) * T);
      if (r.chance(0.6)) set(bx - 2, g - 1, SAND);  // sandbag
      run(bx + 1, bx1 - 1, g, 'i');
      run(bx + 1, bx1 - 1, top, 'p');
      run(x, x + 1, g, 'g'); safeRun(x, x + 1, g);
      run(bx1 + 1, x + len - 1, g, 'g');
      if (r.chance(0.35)) cageSpots.push({ x: bx + 2, y: g, pri: 1 });
      if (rl.chance(0.3)) decoAt('sign', bx - 1, g, { text: signText() });
      return { x: x + len, g: g };
    };

    function steps(x, g, room, dir) {
      const n = r.int(2, 4);
      let xx = x, gg = g;
      for (let s = 0; s < n; s++) {
        const wd = r.int(3, 6), dh = r.int(1, 3);
        const ng = gg + dir * dh;
        if (ng < gMin || ng > gMax || xx + wd > x + room) break;
        for (let i = 0; i < wd; i++) { col(xx + i, ng); spot(xx + i, ng, 'g'); }
        if (wd >= 4) safeRun(xx + 1, xx + wd - 2, ng);
        xx += wd; gg = ng;
      }
      if (xx === x) return null;
      return { x: xx, g: gg };
    }
    SEG.stepsUp = function (x, g, room) { return steps(x, g, room, -1); };
    SEG.stepsDown = function (x, g, room) { return steps(x, g, room, 1); };

    SEG.cliffUp = function (x, g, room, big) {
      const dh = big ? r.int(8, 13) : r.int(6, 11), ng = g - dh;
      const a = r.int(3, 5), b = r.int(6, 10), len = a + b;
      if (ng < gMin || room < len) return null;
      for (let i = 0; i < a; i++) { col(x + i, g); spot(x + i, g, 'g'); }
      for (let i = 0; i < b; i++) { col(x + a + i, ng); spot(x + a + i, ng, i < 3 ? 'p' : 'g'); }
      safeRun(x + a + 2, x + len - 2, ng);
      const xw = x + a;
      if (r.chance(P.climb ? 0.3 : 0.45)) ladder(xw - 1, ng, g - 1);
      else if (dh >= 9 && r.chance(0.5)) {      // a step block halfway up
        const sh = Math.floor(dh / 2);
        rect(xw - 2, g - sh, xw - 1, g - 1, P.soil); set(xw - 2, g - sh, P.surf); set(xw - 1, g - sh, P.surf);
      }
      if (r.chance(0.4)) goldPocket(xw + 1, ng + r.int(3, 5));
      if (rl.chance(0.4)) treeAt(x + a + r.int(3, b - 2), ng);
      return { x: x + len, g: ng };
    };

    SEG.cliffDown = function (x, g, room) {
      const dh = r.int(5, 11), ng = g + dh;
      const a = r.int(4, 7), b = r.int(6, 10), len = a + b;
      if (ng > gMax || room < len) return null;
      for (let i = 0; i < a; i++) { col(x + i, g); spot(x + i, g, i >= a - 2 ? 'p' : 'g'); }
      for (let i = 0; i < b; i++) { col(x + a + i, ng); spot(x + a + i, ng, 'g'); }
      safeRun(x + a + 1, x + len - 2, ng);
      if (r.chance(0.5)) goldPocket(x + a - 2, ng - r.int(1, 3));
      flavorFlat(x + a, x + len - 1, ng);
      return { x: x + len, g: ng };
    };

    SEG.tower = function (x, g, room) {
      const len = 12;
      let n = r.int(2, 3);
      while (n > 1 && g - 4 * n - 2 < 2) n--;
      if (room < len || n < 2) return null;
      for (let i = 0; i < len; i++) col(x + i, g);
      const tx = x + 3, dT = g - 4 * n;
      const deckMat = themeId === 'fortress' || themeId === 'moon' ? STEEL : WOOD;
      for (let k = 1; k <= n; k++) rect(tx, g - 4 * k, tx + 5, g - 4 * k, k === n ? deckMat : PLAT);
      set(tx, dT - 1, deckMat); set(tx + 5, dT - 1, deckMat);
      ladder(tx + 2, dT, g - 1);
      setBack(tx, dT + 1, tx, g - 1, deckMat); setBack(tx + 5, dT + 1, tx + 5, g - 1, deckMat);
      run(tx + 3, tx + 4, dT, 'p'); spot(tx + 1, dT, 'p');
      for (let k = 1; k < n; k++) { spot(tx + 1, g - 4 * k, 'g'); spot(tx + 4, g - 4 * k, 'g'); }
      run(x, x + 2, g, 'g'); run(tx + 6, x + len - 1, g, 'g');
      safeRun(x, x + 1, g); safeRun(x + len - 3, x + len - 1, g);
      if (r.chance(0.35)) cageSpots.push({ x: tx + 3, y: dT, pri: 2 });
      else if (r.chance(0.4)) gold.push({ x: tx + 4, y: dT });
      return { x: x + len, g: g };
    };

    function pitBottom(c0, c1, bot, g) {
      const kind = P.pitBot;
      if (kind === 'spikes') rect(c0, bot - 1, c1, bot - 1, SPIKES);
      else if (kind === 'lava') rect(c0, bot - 1, c1, bot - 1, LAVA);
      else if (kind === 'water') { rect(c0, g + 2, c1, bot - 1, WATER); spot((c0 + c1) >> 1, bot - 1, 'w'); }
      else if (kind === 'mud') rect(c0, bot - 2, c1, bot - 1, MUD);
    }

    SEG.pit = function (x, g, room) {
      const pw = r.int(6, 13);
      let pd = r.int(4, 7);
      if (g + pd > h - 5) pd = h - 5 - g;
      const len = pw + 4;
      if (room < len || pd < 3) return null;
      const bot = g + pd, gapMax = P.gapMax || 5;
      col(x, g); col(x + 1, g); run(x, x + 1, g, 'g');
      const k = pw <= gapMax ? 1 : Math.ceil((pw + 2) / (gapMax + 2));
      const gapTot = pw - 2 * (k - 1), base = Math.floor(gapTot / k), extra = gapTot % k;
      let cx = x + 2;
      for (let j = 0; j < k; j++) {
        const gs = base + (j < extra ? 1 : 0);
        for (let i = 0; i < gs; i++) col(cx + i, bot);
        pitBottom(cx, cx + gs - 1, bot, g);
        cx += gs;
        if (j < k - 1) { col(cx, g); col(cx + 1, g); cx += 2; }
      }
      col(cx, g); col(cx + 1, g); run(cx, cx + 1, g, 'g'); safeRun(cx, cx + 1, g);
      for (let xx = x + 2; xx < cx; xx++) if (get(xx, g) === E) set(xx, g, P.bridge);
      if (rl.chance(0.3)) decoAt('sign', x, g, { text: signText() });
      return { x: cx + 2, g: g };
    };

    SEG.under = function (x, g, room) {
      const L = r.int(34, 48), cf = g + r.int(10, 13);
      if (room < L || cf > h - 5) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      const s0 = x + 3, e0 = x + L - 6;
      clear(s0, g, s0 + 2, cf - 1);
      clear(e0, g, e0 + 2, cf - 1);
      clear(s0, cf - 4, e0 + 2, cf - 1);
      ladder(e0 + 1, g, cf - 1);
      // cave floor bumps
      for (let i = 0; i < 2; i++) { const bx = r.int(s0 + 6, e0 - 4); set(bx, cf - 1, P.deep); set(bx + 1, cf - 1, P.deep); }
      run(s0 + 3, e0 - 1, cf, 'i');
      caveFlavor(s0, e0 + 2, cf - 4, cf);
      cageSpots.push({ x: Math.round((s0 + e0) / 2) + r.int(-3, 3), y: cf, pri: 3 });
      bonus.push({ x: e0 - 2, y: cf });
      if (r.chance(0.6)) goldPocket(s0 + r.int(4, 10), cf + 2);
      // upper route: obstacle between the shafts
      const m0 = s0 + 6, m1 = e0 - 4;
      if (m1 - m0 >= 6) {
        const kind = r.int(0, 2);
        if (kind === 0) {   // mound with a sniper perch
          const mh = r.int(3, 5);
          raise(m0, m1, g - mh); raise(m0 + 2, m1 - 2, g - mh - r.int(1, 3));
          for (let xx = m0; xx <= m1; xx++) spot(xx, surf[xx], 'p');
        } else if (kind === 1) {   // a wall with a turret
          const ww = r.int(2, 3), wx = r.int(m0, m1 - ww), wh = r.int(5, 7);
          rect(wx, g - wh, wx + ww - 1, g - 1, P.wall);
          run(wx, wx + ww - 1, g - wh, 'p');
          run(m0, wx - 1, g, 'g'); run(wx + ww, m1, g, 'g');
        } else {
          run(m0, m1, g, 'g'); safeRun(m0 + 1, m1 - 1, g);
          flavorFlat(m0, m1, g);
        }
      }
      run(x, s0 - 1, g, 'g'); run(e0 + 3, x + L - 1, g, 'g');
      safeRun(x, s0 - 1, g);
      return { x: x + L, g: g };
    };

    SEG.tunnel = function (x, g, room) {
      const L = r.int(18, 28), hh = r.int(6, 9), top = g - hh;
      if (room < L || top < 3) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      const h0 = x + 3, h1 = x + L - 4;
      const icy = themeId === 'ice';
      raise(h0, h1, top, icy && r.chance(0.5) ? ICE : P.soil, icy ? P.surf : P.surf);
      if (r.chance(0.5)) raise(h0 + 3, h1 - 3, top - r.int(1, 2));
      clear(h0, g - 4, h1, g - 1);
      run(h0 + 1, h1 - 1, g, 'i');
      for (let xx = h0; xx <= h1; xx++) spot(xx, surf[xx], xx < h0 + 3 ? 'p' : 'g');
      caveFlavor(h0, h1, g - 4, g);
      run(x, h0 - 1, g, 'g'); run(h1 + 1, x + L - 1, g, 'g');
      safeRun(x, h0 - 2, g); safeRun(h1 + 2, x + L - 1, g);
      if (r.chance(0.5)) goldPocket(r.int(h0 + 2, h1 - 2), g - 5);
      if (r.chance(0.3)) cageSpots.push({ x: r.int(h0 + 2, h1 - 2), y: g, pri: 1 });
      if (rl.chance(0.4)) treeAt(r.int(h0 + 2, h1 - 2), surf[h0 + 2]);
      return { x: x + L, g: g };
    };

    // multi-storey building: opts {bw, n, wall, floor, roof, gable, dome, hay, steel}
    function building(x, g, room, o) {
      o = o || {};
      const bw = o.bw || r.int(12, 16);
      let n = o.n || r.int(2, 4);
      while (n > 1 && g - 5 * n - (o.gable ? 4 : 1) < 2) n--;
      const len = bw + 6;
      if (room < len || n < 2) return null;
      const WALL = o.wall || P.build, FLOOR = o.floor || P.floor, ROOF = o.roof || WALL;
      for (let i = 0; i < len; i++) col(x + i, g);
      const bx = x + 3, bx1 = bx + bw - 1, roof = g - 5 * n;
      rect(bx, roof, bx1, g - 1, WALL);
      rect(bx, roof, bx1, roof, ROOF);
      for (let k = 0; k < n; k++) clear(bx + 1, g - 5 * k - 4, bx1 - 1, g - 5 * k - 1);
      for (let k = 1; k < n; k++) rect(bx + 1, g - 5 * k, bx1 - 1, g - 5 * k, FLOOR);
      clear(bx, g - 3, bx, g - 1); clear(bx1, g - 3, bx1, g - 1);
      if (o.bigDoors) { clear(bx, g - 4, bx, g - 1); clear(bx1, g - 4, bx1, g - 1); }
      for (let k = 1; k < n; k++) {
        clear(bx, g - 5 * k - 3, bx, g - 5 * k - 1);
        clear(bx1, g - 5 * k - 3, bx1, g - 5 * k - 1);
      }
      setBack(bx + 1, roof + 1, bx1 - 1, g - 1, WALL);
      for (let k = 0; k < n; k++) {
        const lx = (k % 2 === 0) ? bx + 2 : bx1 - 2;
        ladder(lx, g - 5 * (k + 1), g - 5 * k - 1);
        // cover crates (never on ladder columns)
        if (r.chance(0.55)) {
          const cx = r.int(bx + 4, bx1 - 4);
          if (get(cx, g - 5 * k - 1) === E && cx !== bx + 2 && cx !== bx1 - 2) set(cx, g - 5 * k - 1, o.hay ? SAND : CRATE);
        }
        run(bx + 1, bx1 - 1, g - 5 * k, 'i');
      }
      const topLx = ((n - 1) % 2 === 0) ? bx + 2 : bx1 - 2;   // top ladder column stays open so the roof is reachable
      if (o.gable) {
        for (let k = 1; k <= 3; k++) {
          const a = bx + 2 * k - 1, b = bx1 - 2 * k + 1;
          if (b - a < 1) break;
          for (let gx = a; gx <= b; gx++) if (gx !== topLx) set(gx, roof - k, ROOF);
        }
        for (let xx = bx; xx <= bx1; xx++) { let y = roof; while (get(xx, y - 1) !== E) y--; spot(xx, y, 'p'); }
      } else if (o.dome) {
        const cx = (bx + bx1) / 2, rr = bw / 2;
        for (let xx = bx + 1; xx <= bx1 - 1; xx++) {
          const dx = (xx + 0.5 - (cx + 0.5)) / rr;
          const hgt = Math.round(Math.sqrt(Math.max(0, 1 - dx * dx)) * rr * 0.55);
          if (hgt > 0 && xx !== topLx) rect(xx, roof - hgt, xx, roof - 1, GLASS);
          spot(xx, roof - hgt, 'p');
        }
        decoAt('antenna', bx1 - 1, roof);
      } else {
        set(bx, roof - 1, ROOF); set(bx1, roof - 1, ROOF);
        run(bx + 1, bx1 - 1, roof, 'p');
      }
      cageSpots.push({ x: r.chance(0.5) ? bx + 4 : bx1 - 4, y: g - 5 * (n - 1), pri: 3 });
      if (r.chance(0.5)) gold.push({ x: bx1 - 1, y: g - 5 * (n - 1) });
      run(x, bx - 1, g, 'g'); run(bx1 + 1, x + len - 1, g, 'g');
      safeRun(x, x + 1, g); safeRun(x + len - 2, x + len - 1, g);
      if (rl.chance(0.4)) decoAt('sign', x + 1, g, { text: signText() });
      return { x: x + len, g: g };
    }
    SEG.building = function (x, g, room) { return building(x, g, room, {}); };

    SEG.ledges = function (x, g, room) {
      const L = r.int(18, 26);
      if (room < L || g - 12 < 3) return null;
      for (let i = 0; i < L; i++) { col(x + i, g); spot(x + i, g, 'g'); }
      safeRun(x, x + L - 1, g);
      let lx = x + r.int(1, 3), ly = g - 3, best = null;
      while (lx < x + L - 4) {
        const lw = r.int(3, 5), x1 = Math.min(lx + lw - 1, x + L - 2);
        rect(lx, ly, x1, ly, P.ledge);
        run(lx, x1, ly, 'p');
        if (!best || ly < best.y) best = { x: lx + 1, y: ly };
        lx = x1 + 1 + r.int(2, 4);
        ly = Math.max(g - 11, Math.min(g - 3, ly + r.pick([-3, -3, -2, -1, 2])));
      }
      if (best) bonus.push(best);
      flavorFlat(x, x + L - 1, g);
      return { x: x + L, g: g };
    };

    // ---------------- theme specials
    SEG.iceField = function (x, g, room) {
      const L = Math.min(room, r.int(14, 22));
      if (L < 12) return null;
      for (let i = 0; i < L; i++) { col(x + i, g); if (i > 0 && i < L - 1) { set(x + i, g, ICE); set(x + i, g + 1, ICE); } }
      const dx = r.int(x + 3, x + L - 7);
      raise(dx, dx + 3, g - 1, DIRT, DIRT); raise(dx + 1, dx + 2, g - 2, DIRT, DIRT);
      for (let i = 0; i < L; i++) spot(x + i, surf[x + i], 'g');
      safeRun(x, dx - 1, g);
      decoAt('crystal', r.int(x + 1, x + L - 2), g, { flip: rl.chance(0.5) });
      if (r.chance(0.5)) goldPocket(x + r.int(2, L - 3), g + 3);
      return { x: x + L, g: g };
    };

    SEG.lavaPools = function (x, g, room) {
      const L = Math.min(room, r.int(16, 24));
      if (L < 14) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      let px = x + r.int(3, 5);
      while (px < x + L - 6) {
        const pw = r.int(2, 4);
        rect(px, g, px + pw - 1, g + 1, LAVA);
        const jx = px + pw + 1;
        if (jx < x + L - 2 && r.chance(0.6)) hazard('firejet', PX(jx), g * T, { h: 5 * T, period: r.range(2.4, 3.4), on: 1.0, phase: r.range(0, 3) });
        px += pw + r.int(4, 6);
      }
      for (let i = 0; i < L; i++) spot(x + i, g, 'g');
      safeRun(x, x + 2, g);
      return { x: x + L, g: g };
    };

    SEG.lavaLake = function (x, g, room) {
      const lw = r.int(11, 17), L = lw + 4;
      if (room < L || g + 4 > h - 4) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      const a = x + 2, edge = a + lw;
      rect(a, g, edge - 1, g + 2, LAVA);
      let cur = a;
      while (edge - cur > 4) {
        const rem = edge - cur;
        let gap = r.int(2, 4);
        if (rem - gap - 2 < 0) gap = Math.max(2, rem - 2);
        const sx = cur + gap;
        if (sx + 1 >= edge) break;
        rect(sx, g - 1, sx + 1, g + 3, themeId === 'fortress' ? STEEL : ROCK);
        spot(sx, g - 1, 'g'); spot(sx + 1, g - 1, 'g');
        cur = sx + 2;
      }
      run(x, x + 1, g, 'g'); run(edge, x + L - 1, g, 'g');
      safeRun(x, x + 1, g); safeRun(edge, x + L - 1, g);
      if (rl.chance(0.6)) decoAt('sign', x, g, { text: themeId === 'fire' ? 'LAVA: DO NOT LICK' : signText() });
      return { x: x + L, g: g };
    };

    SEG.skyIslands = function (x, g, room) {
      const cw = r.int(20, 32), L = cw + 4;
      if (room < L) return null;
      const gm = P.gapMax || 4;
      col(x, g); col(x + 1, g); run(x, x + 1, g, 'g');
      const deep = h - 3;
      for (let i = 0; i < cw; i++) col(x + 2 + i, deep);
      // islands: n islands, n+1 gaps of 2..gm
      let n = 1, gaps = [], widths = [];
      for (n = 1; n < 12; n++) {
        gaps = []; let sg = 0;
        for (let i = 0; i <= n; i++) { const v = r.int(2, gm); gaps.push(v); sg += v; }
        const rem = cw - sg;
        if (rem >= 3 * n && rem <= 7 * n) {
          widths = []; const base = Math.floor(rem / n); let ex = rem - base * n;
          for (let i = 0; i < n; i++) { widths.push(base + (ex > 0 ? 1 : 0)); ex--; }
          break;
        }
      }
      if (!widths.length) return null;
      let cx = x + 2, cy = g;
      for (let i = 0; i < n; i++) {
        cx += gaps[i];
        const iw = widths[i];
        const top = Math.max(g - 5, Math.min(g + 3, cy + r.int(-2, 2)));
        rect(cx, top, cx + iw - 1, top + 2, P.deep);
        rect(cx, top, cx + iw - 1, top, P.surf);
        if (iw >= 4) rect(cx + 1, top + 3, cx + iw - 2, top + 3, P.deep);
        if (iw >= 6) rect(cx + 2, top + 4, cx + iw - 3, top + 4, P.deep);
        run(cx, cx + iw - 1, top, 'g');
        if (iw >= 5 && rl.chance(0.35)) decoAt('windmill', cx + (iw >> 1), top, { h: 6 * T });
        if (i === n - 1 && r.chance(0.5)) gold.push({ x: cx + iw - 1, y: top });
        // updraft under the gap before this island
        if (themeId === 'wind') hazard('updraft', PX(cx - Math.ceil(gaps[i] / 2)), deep * T, { w: gaps[i] * T, h: (deep - g + 3) * T });
        cx += iw; cy = top;
      }
      const ng = Math.max(gMin, Math.min(gMax, cy + r.int(-1, 1)));
      col(x + 2 + cw, ng); col(x + 3 + cw, ng); run(x + 2 + cw, x + 3 + cw, ng, 'g'); safeRun(x + 2 + cw, x + 3 + cw, ng);
      ladder(x + 2, g, deep - 1);   // a way back up if you fall in
      return { x: x + L, g: ng };
    };

    function makeDocks(x, g, room, big) {
      const bw = big ? r.int(32, 42) : r.int(18, 26);
      let dep = r.int(6, 8);
      if (g + dep > h - 4) dep = h - 4 - g;
      const L = bw + 6;
      if (room < L || dep < 5) return null;
      for (let i = 0; i < 3; i++) col(x + i, g);
      const b0 = x + 3, b1 = b0 + bw - 1;
      for (let xx = b0; xx <= b1; xx++) col(xx, g + dep);
      for (let i = b1 + 1; i < x + L; i++) col(i, g);
      rect(b0, g + 1, b1, g + dep - 1, WATER);
      run(x, x + 2, g, 'g'); safeRun(x, x + 1, g);
      run(b1 + 1, x + L - 1, g, 'g'); safeRun(b1 + 2, x + L - 1, g);
      // piers / boats across with gaps of 2..4 water
      let cx = b0, boat = false;
      while (b1 + 1 - cx > 4) {
        const remain = b1 + 1 - cx;
        const gap = cx === b0 ? r.int(0, 2) : r.int(2, 4);
        const sx = cx + gap;
        if (!boat && remain > 14 && r.chance(0.5)) {
          const bwid = r.int(7, 9), bx1 = Math.min(b1, sx + bwid - 1);
          rect(sx, g, bx1, g, WOOD); rect(sx + 1, g + 1, bx1 - 1, g + 1, WOOD); rect(sx + 2, g + 2, bx1 - 2, g + 2, WOOD);
          const mx = (sx + bx1) >> 1, nest = g - 8;
          rect(mx - 1, nest, mx + 1, nest, PLAT);
          ladder(mx, nest, g - 1);
          spot(mx - 1, nest, 'p'); spot(mx + 1, nest, 'p');
          run(sx, bx1, g, 'g');
          decoAt('sail', mx, g, { h: 7 * T });
          boat = true; cx = bx1 + 1;
        } else {
          const pw = Math.min(r.int(5, 9), b1 - sx + 1);
          if (pw < 2) break;
          rect(sx, g, sx + pw - 1, g, WOOD);
          for (let px = sx + 1; px < sx + pw; px += 3) setBack(px, g + 1, px, g + dep - 1, WOOD);
          run(sx, sx + pw - 1, g, 'g');
          if (pw >= 6 && rl.chance(0.5)) decoAt('lamp', sx + pw - 2, g);
          cx = sx + pw;
        }
        for (let wx = Math.max(b0, sx - gap); wx < sx; wx++) spot(wx, g + dep - 3, 'w');
      }
      for (let xx = b0 + 2; xx < b1; xx += r.int(5, 8)) spot(xx, g + dep - 2, 'w');
      if (r.chance(0.6)) goldPocket(b0 + r.int(1, bw - 2), g + dep + 2);
      docks.push({ x0: b0 * T, x1: (b1 + 1) * T, y: (g + 1) * T, bw: bw });
      if (rl.chance(0.5)) decoAt('sign', x + 1, g, { text: signText() });
      return { x: x + L, g: g };
    }
    SEG.docks = function (x, g, room) { return makeDocks(x, g, room, false); };
    SEG.harbour = function (x, g, room) { return makeDocks(x, g, room, true); };

    SEG.bog = function (x, g, room) {
      const L = Math.min(room, r.int(16, 24));
      if (L < 14) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      let px = x + r.int(2, 4);
      while (px < x + L - 6) {
        const pw = r.int(3, 6);
        rect(px, g, px + pw - 1, g + 1, MUD);
        hazard('quicksand', px * T, g * T, { x0: px * T, x1: (px + pw) * T });
        px += pw + r.int(3, 5);
      }
      for (let i = 0; i < L; i++) spot(x + i, g, 'g');
      const tx = r.int(x + 3, x + L - 4);
      decoAt('tree', tx, g, { kind: 'dead', h: 7 * T, flip: rl.chance(0.5) });
      rect(tx - 2, g - 4, tx + 1, g - 4, PLAT);
      run(tx - 2, tx + 1, g - 4, 'p');
      safeRun(x, x + 1, g);
      return { x: x + L, g: g };
    };

    SEG.vineCanyon = function (x, g, room) {
      const pw = r.int(8, 12);
      let pd = r.int(5, 7);
      if (g + pd > h - 5) pd = h - 5 - g;
      const L = pw + 6;
      if (room < L || g - 7 < 2 || pd < 3) return null;
      const bot = g + pd, p0 = x + 3, p1 = p0 + pw - 1;
      for (let i = 0; i < 3; i++) col(x + i, g);
      for (let xx = p0; xx <= p1; xx++) col(xx, bot);
      for (let i = p1 + 1; i < x + L; i++) col(i, g);
      if (P.pitBot === 'spikes' || themeId === 'jungle') rect(p0, bot - 1, p1, bot - 1, SPIKES);
      else pitBottom(p0, p1, bot, g);
      // stone pillars (jump route)
      const np = pw <= 9 ? 1 : 2;
      for (let j = 1; j <= np; j++) {
        const px = p0 + Math.round(j * pw / (np + 1)) - 1;
        rect(px, g, px, bot - 1, ROCK); set(px, g, P.surf);
      }
      // canopy beam + vines (climb route)
      const bY = g - 6, beam = P.beam || WOOD;
      rect(x + 1, bY, x + L - 2, bY, beam);
      ladder(x + 2, bY, g - 1);
      ladder(p1 + 2, bY, g - 1);
      const mv = (p0 + p1) >> 1;
      if (get(mv, g) === E) for (let y = bY; y <= g + 2; y++) if (get(mv, y) === E || y === bY) set(mv, y, LADDER);
      run(x + 1, x + L - 2, bY, 'p');
      run(x, x + 2, g, 'g'); run(p1 + 1, x + L - 1, g, 'g');
      safeRun(x, x + 1, g);
      if (rl.chance(0.5)) decoAt('sign', x, g, { text: signText() });
      bonus.push({ x: mv + 2, y: bY });
      return { x: x + L, g: g };
    };

    SEG.temple = function (x, g, room) {
      const base = r.int(16, 22), L = base + 4;
      let th = r.int(8, 10);
      if (g - th - 2 < 2) th = g - 4;
      if (room < L || th < 6) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      const t0 = x + 2;
      for (let i = 0; i < base; i++) {
        const lvl = Math.floor(Math.min(i, base - 1 - i) / 2);
        const hgt = Math.min(th, (lvl + 1) * 2);
        raise(t0 + i, t0 + i, g - hgt, ROCK, ROCK);
      }
      const cx = t0 + (base >> 1), topY = surf[cx];
      // hidden chamber with ladder down from the summit
      const ch0 = cx - 3, ch1 = cx + 2;
      clear(ch0, g - 5, ch1, g - 2);
      setBack(ch0, g - 5, ch1, g - 2, ROCK);
      if (topY < g - 6) ladder(cx, topY, g - 2); else ladder(cx, g - 6, g - 2);
      cageSpots.push({ x: ch0 + 1, y: g - 1, pri: 4 });
      gold.push({ x: ch1, y: g - 1 });
      for (let xx = t0; xx < t0 + base; xx++) spot(xx, surf[xx], surf[xx] <= topY + 1 ? 'p' : 'g');
      hazard('log', PX(cx - 2), topY * T, { dir: -1, period: r.range(4.5, 6.5) });
      run(x, t0 - 1, g, 'g'); run(t0 + base, x + L - 1, g, 'g');
      safeRun(x, x + 1, g);
      decoAt('sign', x, g, { text: 'TEMPLE: KNOCK FIRST' });
      return { x: x + L, g: g };
    };

    SEG.tallClimb = function (x, g, room) {
      const tiers = r.int(2, 4);
      let xx = x, gg = g, any = false;
      for (let t = 0; t < tiers; t++) {
        const tw = r.int(4, 6), rise = r.int(5, 9), ng = gg - rise;
        if (ng < gMin - 4 || xx + tw + 4 > x + room || ng < 4) break;
        for (let i = 0; i < tw; i++) { col(xx + i, gg); spot(xx + i, gg, 'g'); }
        if (r.chance(0.35)) ladder(xx + tw - 1, ng, gg - 1);
        xx += tw; gg = ng; any = true;
      }
      if (!any) return null;
      const topW = Math.min(r.int(6, 9), x + room - xx);
      if (topW < 4) return null;
      for (let i = 0; i < topW; i++) { col(xx + i, gg); spot(xx + i, gg, i < 3 ? 'p' : 'g'); }
      safeRun(xx + 2, xx + topW - 1, gg);
      hazard(themeId === 'jungle' ? 'log' : 'rockslide', PX(xx + 1), gg * T, { dir: -1, period: r.range(4.5, 6.5) });
      if (rl.chance(0.6)) treeAt(xx + topW - 2, gg);
      if (r.chance(0.5)) bonus.push({ x: xx + topW - 2, y: gg });
      return { x: xx + topW, g: gg };
    };

    SEG.farm = function (x, g, room) {
      const res = building(x, g, room, { bw: r.int(14, 18), n: 2, wall: WOOD, floor: PLAT, roof: WOOD, gable: true, hay: true, bigDoors: true });
      if (res) {
        decoAt('fence', x + 1, g, { w: 3 * T });
        if (r.chance(0.6)) hazard('stampede', PX(res.x - 1), g * T, { dir: -1, count: r.int(3, 5) });
      }
      return res;
    };

    SEG.silo = function (x, g, room) {
      const sh = r.int(10, 14), L = 12;
      if (room < L || g - sh - 2 < 2) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      const sx = x + 4;
      rect(sx, g - sh, sx + 3, g - 1, STEEL);
      rect(sx + 1, g - sh - 1, sx + 2, g - sh - 1, STEEL);
      clear(sx, g - 3, sx + 3, g - 1);
      setBack(sx, g - 3, sx + 3, g - 1, STEEL);
      ladder(sx - 1, g - sh, g - 1);
      spot(sx, g - sh, 'p'); spot(sx + 3, g - sh, 'p'); spot(sx + 1, g - sh - 1, 'p');
      run(x, sx - 2, g, 'g'); run(sx + 4, x + L - 1, g, 'g');
      safeRun(x, x + 1, g); safeRun(x + L - 3, x + L - 1, g);
      if (r.chance(0.5)) gold.push({ x: sx + 2, y: g - sh - 1 });
      else cageSpots.push({ x: sx + 2, y: g - sh - 1, pri: 2 });
      decoAt('hay', x + L - 2, g);
      return { x: x + L, g: g };
    };

    SEG.castle = function (x, g, room) {
      const mw = r.int(4, 5), wh = r.int(9, 12), cy = r.int(5, 8), tb = 7;
      const L = 2 + mw + 1 + 3 + cy + tb + 6;
      if (room < L || g - wh - 2 < 2 || g + 5 > h - 4) return null;
      const stone = themeId === 'fortress' ? STEEL : ROCK;
      col(x, g); col(x + 1, g); run(x, x + 1, g, 'g'); safeRun(x, x + 1, g);
      const m0 = x + 2, m1 = m0 + mw - 1;
      for (let xx = m0; xx <= m1; xx++) col(xx, g + 5);
      if (themeId === 'fortress') rect(m0, g + 4, m1, g + 4, SPIKES); else rect(m0, g + 2, m1, g + 4, WATER);
      rect(m0, g, m1, g, WOOD);                      // drawbridge
      run(m0, m1, g, 'g');
      const bank = m1 + 1;
      col(bank, g); spot(bank, g, 'g');
      const W0 = bank + 1;
      for (let xx = W0; xx < W0 + 3; xx++) col(xx, g);
      rect(W0, g - wh, W0 + 2, g - 1, stone);
      set(W0, g - wh - 1, stone); set(W0 + 2, g - wh - 1, stone);
      clear(W0, g - 4, W0 + 2, g - 1);              // gate
      setBack(W0, g - 4, W0 + 2, g - 1, STEEL);
      spot(W0 + 1, g - wh, 'p');
      decoAt('torch', bank, g - 3); decoAt('banner', W0 + 1, g - wh + 4);
      const c0 = W0 + 3;
      for (let i = 0; i < cy; i++) { col(c0 + i, g); spot(c0 + i, g, 'g'); }
      safeRun(c0 + 1, c0 + cy - 2, g);
      const res = building(c0 + cy - 3, g, room - (c0 + cy - 3 - x), { bw: tb, n: 3, wall: stone, floor: WOOD });
      if (!res) {
        for (let i = c0 + cy; i < x + L; i++) col(i, g);
        return { x: x + L, g: g };
      }
      return res;
    };

    SEG.craters = function (x, g, room) {
      const L = Math.min(room, r.int(20, 30));
      if (L < 16) return null;
      const H = []; for (let i = 0; i < L; i++) H.push(g);
      let cx = r.int(2, 4);
      while (cx < L - 9) {
        const cw = r.int(7, 12), cd = r.int(2, 4);
        if (cx + cw + 1 >= L) break;
        for (let i = 0; i < cw; i++) { const t = (i + 0.5) / cw * 2 - 1; H[cx + i] = g + Math.round(cd * (1 - t * t)); }
        if (cx - 1 >= 0) H[cx - 1] = g - 1;
        H[cx + cw] = g - 1;
        cx += cw + r.int(3, 6);
      }
      for (let i = 0; i < L; i++) { col(x + i, H[i]); spot(x + i, H[i], 'g'); if (H[i] === g) safe.push({ x: x + i, y: g }); }
      flavorFlat(x, x + L - 1, g);
      if (r.chance(0.5)) goldPocket(x + r.int(3, L - 4), g + 4);
      return { x: x + L, g: g };
    };

    SEG.moonbase = function (x, g, room) {
      return building(x, g, room, { bw: r.int(12, 16), n: r.int(2, 3), wall: STEEL, floor: PLAT, roof: STEEL, dome: true });
    };

    SEG.bricks = function (x, g, room) {
      const L = Math.min(room, r.int(18, 26));
      if (L < 14) return null;
      const H = []; for (let i = 0; i < L; i++) H.push(g);
      let px = r.int(4, 6);
      while (px < L - 8) { const pw = r.int(2, 4); for (let i = 0; i < pw; i++) H[px + i] = Math.min(h - 4, g + r.int(4, 6)); px += pw + r.int(5, 8); }
      for (let i = 0; i < L; i++) { col(x + i, H[i]); spot(x + i, H[i], 'g'); }
      for (let i = 0; i < L; i++) if (H[i] > g) { set(x + i, H[i] - 1, SPIKES); }
      let bx = x + r.int(1, 3);
      while (bx < x + L - 5) {
        const bw = r.int(3, 5);
        if (H[bx - x] === g && H[bx - x + bw - 1] === g) {
          rect(bx, g - 4, bx + bw - 1, g - 4, ROCK); run(bx, bx + bw - 1, g - 4, 'p');
          if (r.chance(0.4)) { rect(bx + 1, g - 8, bx + bw - 2, g - 8, ROCK); bonus.push({ x: bx + 1, y: g - 8 }); }
        }
        bx += bw + r.int(3, 5);
      }
      for (let i = 0; i < L; i++) if (H[i] === g) safe.push({ x: x + i, y: g });
      if (rl.chance(0.4)) decoAt('pixeltree', x + r.int(1, L - 2), g);
      return { x: x + L, g: g };
    };

    SEG.pyramid = function (x, g, room) {
      const up = r.int(4, 6), top = r.int(2, 3), L = up * 2 + top + 4;
      if (room < L || g - up - 2 < 2) return null;
      for (let i = 0; i < L; i++) col(x + i, g);
      for (let i = 0; i < up; i++) {
        raise(x + 2 + i, x + 2 + i, g - i - 1, ROCK, ROCK);
        raise(x + 2 + up * 2 + top - 1 - i, x + 2 + up * 2 + top - 1 - i, g - i - 1, ROCK, ROCK);
      }
      raise(x + 2 + up, x + 1 + up + top, g - up, ROCK, ROCK);
      for (let i = 0; i < L; i++) spot(x + i, surf[x + i], i >= 2 + up && i < 2 + up + top ? 'p' : 'g');
      bonus.push({ x: x + 2 + up, y: g - up });
      safeRun(x, x + 1, g); safeRun(x + L - 2, x + L - 1, g);
      return { x: x + L, g: g };
    };

    SEG.steelworks = function (x, g, room) {
      const res = building(x, g, room, { bw: r.int(14, 18), n: r.int(2, 3), wall: STEEL, floor: PLAT, roof: STEEL });
      if (res) {
        const fx = r.int(x + 6, res.x - 6);
        if (get(fx, g) !== E) hazard('firejet', PX(fx), g * T, { h: 4 * T, period: r.range(2.4, 3.2), on: 0.9, phase: r.range(0, 3) });
        decoAt('sign', x + 1, g, { text: signText() });
      }
      return res;
    };

    // ================================================================ director
    const STACKED = { under: 1, tunnel: 1, building: 1, tower: 1, temple: 1, castle: 1, farm: 1, silo: 1, moonbase: 1, steelworks: 1, docks: 1, harbour: 1, skyIslands: 1, ledges: 1, vineCanyon: 1 };
    const SEGW = {};
    for (const k in COMMON) SEGW[k] = COMMON[k];
    if (P.seg) for (const k in P.seg) SEGW[k] = P.seg[k];
    const MINLEN = { flat: 10, bunker: 14, stepsUp: 6, stepsDown: 6, cliffUp: 9, cliffDown: 10, tower: 12, pit: 10, under: 34,
      tunnel: 18, building: 18, ledges: 18, iceField: 14, lavaPools: 14, lavaLake: 15, skyIslands: 24, docks: 24, harbour: 38,
      bog: 14, vineCanyon: 14, temple: 20, tallClimb: 14, farm: 20, silo: 12, castle: 30, craters: 16, moonbase: 18,
      bricks: 14, pyramid: 14, steelworks: 20 };

    // altitude plan
    const ARENA_IN = 44, ARENA_H = 20;
    const ax1 = w - 5, ax0 = ax1 - ARENA_IN + 1;      // interior tile columns
    const LEAD = 16;
    const xStart = 2, xEnd = ax0 - 2 - LEAD;
    const per = r.range(85, 120), ph = r.range(0, Math.PI * 2);
    const gMid = (gMin + gMax) / 2, amp = (gMax - gMin) * 0.5;
    function tgt(xx) {
      const p = (xx - xStart) / (xEnd - xStart);
      if (themeId === 'mountain') return gMax - (gMax - gMin - 6) * p + Math.sin(ph + xx / 40) * 4;
      return gMid + amp * Math.sin(ph + (xx / per) * Math.PI * 2);
    }

    let x = xStart, g = Math.round(Math.max(gMin + 4, Math.min(gMax, tgt(x))));
    if (themeId === 'mountain') g = gMax;
    // spawn pad
    const PAD = 12;
    for (let i = 0; i < PAD; i++) col(x + i, g);
    const spawnTx = x + 4;
    safeRun(x + 1, x + PAD - 2, g);
    decoAt('sign', x + 8, g, { text: 'NO DOOSHING' });
    x += PAD;

    const GEN_MUST = [['under', 0.3], ['building', 0.52], ['tunnel', 0.78]];   // every theme gets some stacked routes
    const mustList = (P.must || []).concat(GEN_MUST).map(function (m) { return { seg: m[0], at: xStart + m[1] * (xEnd - xStart), done: false }; });
    let last = '', guard = 0;
    while (xEnd - x > 8 && guard++ < 200) {
      const room = xEnd - x;
      let res = null, name = null;
      for (let mi = 0; mi < mustList.length; mi++) {
        const m = mustList[mi];
        if (!m.done && x >= m.at) {
          m.done = true;
          if ((MINLEN[m.seg] || 10) <= room) { res = SEG[m.seg](x, g, room); if (res) { name = m.seg; break; } }
        }
      }
      if (!res) {
        const want = tgt(x) - g;   // >0 => should go down
        for (let tries = 0; tries < 8 && !res; tries++) {
          const opts = {};
          for (const k in SEGW) {
            if (!SEG[k] || (MINLEN[k] || 10) > room) continue;
            let wgt = SEGW[k];
            if (k === last) wgt *= 0.12;
            const d = ALT[k] || 0;
            if (d !== 0) { if (want * d > 3) wgt *= 9; else if (want * d < -3) wgt *= 0.05; }
            else if (Math.abs(want) > 5 && themeId !== 'mountain' && !STACKED[k]) wgt *= 0.12;   // steer: neutral segments are rare when far off the altitude plan
            if (k === 'harbour') wgt = 0;
            opts[k] = wgt;
          }
          name = r.wpick(opts);
          if (!name) break;
          res = SEG[name](x, g, room);
        }
      }
      if (!res) { name = 'flat'; res = SEG.flat(x, g, Math.min(room, 10)); }
      last = name;
      x = res.x; g = res.g;
    }
    // approach: settle to the arena floor level
    const af = Math.max(26, Math.min(gMax, g));
    while (x < ax0 - 2) {
      if (g !== af && x < ax0 - 10) {
        const d = Math.sign(af - g) * Math.min(3, Math.abs(af - g));
        g += d;
        for (let i = 0; i < 3; i++) { col(x + i, g); spot(x + i, g, 'g'); }
        x += 3;
      } else { g = af; col(x, g); x++; }
    }
    safeRun(ax0 - 2 - LEAD + 4, ax0 - 5, af);

    // ================================================================ arena
    const ay0 = af - ARENA_H, ceil0 = ay0 - 2;
    for (let xx = ax0 - 2; xx <= ax1 + 2; xx++) {
      col(xx, af);
      for (let y = ceil0; y < h - 2; y++) {
        if (y >= af && y <= af + 1) set(xx, y, BEDROCK);
        else if (y < ay0) set(xx, y, BEDROCK);
        else if (xx < ax0 || xx > ax1) set(xx, y, BEDROCK);
        else if (y < af) set(xx, y, E);
      }
      surf[xx] = ceil0;
    }
    rect(ax0 - 2, ceil0 - 1, ax1 + 2, ceil0 - 1, P.surf);   // a crust on the roof
    for (let xx = ax0 - 2; xx <= ax1 + 2; xx++) surf[xx] = ceil0 - 1;
    setBack(ax0, ay0, ax1, af - 1, BEDROCK);
    const doorTy0 = af - 4, doorTy1 = af - 1;
    clear(ax0 - 2, doorTy0, ax0 - 1, doorTy1);
    rect(ax0 + 6, af - 4, ax0 + 10, af - 4, PLAT);
    rect(ax1 - 10, af - 4, ax1 - 6, af - 4, PLAT);
    decoAt('sign', ax0 - 6, af, { text: themeId === 'fortress' ? 'DOOSHINATOR AHEAD' : 'BOSS AHEAD ->' });
    if (themeId === 'fortress') { decoAt('skullpike', ax0 - 9, af); decoAt('skullpike', ax0 - 3, af); }

    // extra hidden gold alcoves (dig for 'em): top up to 6 pockets spread over the level
    for (let tries = 0; tries < 90 && gold.length < 6; tries++) {
      const gx = r.int(spawnTx + 12, ax0 - 12);
      const gy = surf[gx] + r.int(3, 6);
      if (gy < h - 6 && get(gx, gy) !== LADDER && get(gx, gy - 1) !== E) goldPocket(gx, gy);
    }

    // ================================================================ borders + back walls
    for (let y = 0; y < h; y++) { tiles[y * w] = BEDROCK; tiles[y * w + 1] = BEDROCK; tiles[y * w + w - 1] = BEDROCK; tiles[y * w + w - 2] = BEDROCK; }
    for (let xx = 0; xx < w; xx++) { tiles[(h - 1) * w + xx] = BEDROCK; tiles[(h - 2) * w + xx] = BEDROCK; }
    buildBackWalls();

    // ---- back walls (v2): every cell that is NOT open air carries a back-wall material in `back` -- under solid tiles
    // too, so tiles destroyed later reveal a dark back wall instead of the sky.
    //   R1 ground mass: row >= natural surface row of the column          -> soil / deep stratum
    //   R2 pits:        narrow shaft with natural-ground walls (>=2 rows above the cell) on both sides within 10 cols
    //   R3 rooms:       solid/floor above+below within 14 and solid walls left+right within 12 (structures, ruins)
    //   R4 sealed:      empty cells the sky flood-fill never reaches
    //   R5 wall skin:   solid tiles 4-adjacent to an interior cell (walls, roofs, floors) -> their own material
    // Open-air cells (above the surface, outside structures) stay 0 = parallax backdrop. Existing setBack() cells win.
    function buildBackWalls() {
      const SOLM = function (m) { return SOLID[m] === 1 && m !== GLASS; };
      const N = w * h, openAir = new Uint8Array(N), inner = new Uint8Array(N), stack = [];
      const bs = function (x, y, g) { return (y - g) < P.soilDepth + ((nz(x, 7) * 2.5) | 0) ? P.soil : P.deep; };
      // R4 pre-pass: flood the sky through every non-opaque cell
      for (let x = 0; x < w; x++) if (!SOLM(tiles[x])) { openAir[x] = 1; stack.push(x); }
      while (stack.length) {
        const i = stack.pop(), x = i % w, y = (i / w) | 0;
        const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
        for (let k = 0; k < 4; k++) { const j = nb[k]; if (j >= 0 && !openAir[j] && !SOLM(tiles[j])) { openAir[j] = 1; stack.push(j); } }
      }
      const hit = function (x, y, dx, dy, max, floorOk) {   // distance to the first solid (or one-way floor) cell, 0 = none
        for (let k = 1; k <= max; k++) {
          const xx = x + dx * k, yy = y + dy * k;
          if (yy < 0) return 0;
          if (xx < 0 || xx >= w || yy >= h) return k;
          const m = tiles[yy * w + xx];
          if (SOLM(m) || (floorOk && m === PLAT)) return k;
        }
        return 0;
      };
      for (let x = 2; x < w - 2; x++) {
        const g = surf[x];
        for (let y = 0; y < h - 2; y++) {
          const i = y * w + x, m = tiles[i];
          if (back[i]) { inner[i] = 1; continue; }
          if (y >= g) { back[i] = bs(x, y, g); inner[i] = 1; continue; }            // R1
          if (SOLM(m)) continue;
          let mat = 0;
          // R2: pit between natural-ground walls
          let xl = 0, xr = 0;
          for (let k = 1; k <= 10 && !xl; k++) { const q = x - k; if (q < 2) break; if (SOLM(tiles[y * w + q])) xl = q; }
          for (let k = 1; k <= 10 && !xr; k++) { const q = x + k; if (q >= w - 2) break; if (SOLM(tiles[y * w + q])) xr = q; }
          if (xl && xr && surf[xl] <= y - 2 && surf[xr] <= y - 2) mat = bs(xl, y, surf[xl]);
          // R3: room (box enclosed within ~12-14 cells)
          if (!mat) {
            const l = hit(x, y, -1, 0, 12), r = hit(x, y, 1, 0, 12);
            if (l && r && hit(x, y, 0, -1, 14, true) && hit(x, y, 0, 1, 14, true)) {
              const lm = tiles[y * w + x - l], rm = tiles[y * w + x + r];
              mat = SOLM(lm) && lm !== BEDROCK ? lm : SOLM(rm) && rm !== BEDROCK ? rm : P.wall;
              if (mat === STEEL && P.wall !== STEEL && P.build !== STEEL) mat = P.wall;
            }
          }
          // R4: sealed cavity
          if (!mat && !openAir[i]) mat = P.wall;
          if (mat) { back[i] = mat; inner[i] = 1; }
        }
      }
      // R5: wall skin (one cell deep) so destroyed walls / roofs / floors show the back wall
      for (let x = 2; x < w - 2; x++) for (let y = 1; y < h - 2; y++) {
        const i = y * w + x, m = tiles[i];
        if (back[i] || !SOLM(m) || m === BEDROCK) continue;
        if ((inner[i - 1] && !SOLM(tiles[i - 1])) || (inner[i + 1] && !SOLM(tiles[i + 1])) ||
          (inner[i - w] && !SOLM(tiles[i - w])) || (inner[i + w] && !SOLM(tiles[i + w]))) back[i] = m;
      }
    }

    // ================================================================ placement
    // everything we place must be reachable from the spawn: run the same BFS the checker uses on the finished grid
    const reach = analyze({ w: w, h: h, tiles: tiles, T: T, spawn: { x: PX(spawnTx), y: surf[spawnTx] * T },
      arena: { y1: af * T, tx0: ax0, door: { tx: ax0 - 2 } } }).reach;
    const reachable = function (tx, ty) { return ty >= 1 && reach[(ty - 1) * w + tx] === 1; };
    const used = new Set();
    const key = function (tx, ty) { return ty * w + tx; };
    function free(tx, ty) { const m = get(tx, ty); return !SOLID[m] && !HAZ[m]; }
    function standable(tx, ty) {   // ty = solid row under the feet
      const m = get(tx, ty);
      return (SOLID[m] || m === PLAT) && free(tx, ty - 1) && free(tx, ty - 2) && get(tx, ty - 1) !== WATER && get(tx, ty - 1) !== LADDER;
    }
    function flatRun(tx, ty, rad) {
      for (let d = -rad; d <= rad; d++) if (!standable(tx + d, ty)) return false;
      return true;
    }
    function skyAbove(tx, ty, n) { for (let k = 1; k <= n; k++) if (!free(tx, ty - k)) return false; return true; }
    const inArena = function (tx) { return tx >= ax0 - 3; };

    const flags = [];
    function addFlag(tx, ty) {
      const f = { type: 'flag', x: PX(tx), y: ty * T, idx: flags.length };
      flags.push(f); ents.push(f);
      for (let d = -2; d <= 2; d++) used.add(key(tx + d, ty));
    }
    const safeOK = safe.filter(function (s) { return !inArena(s.x) && standable(s.x, s.y) && skyAbove(s.x, s.y, 4) && reachable(s.x, s.y); });
    {
      let tgtX = spawnTx + r.int(62, 72);
      while (tgtX < ax0 - 34) {
        let best = null, bd = 1e9;
        for (const s of safeOK) { const d = Math.abs(s.x - tgtX); if (d < bd && d <= 20) { bd = d; best = s; } }
        if (best) { addFlag(best.x, best.y); tgtX = best.x + r.int(60, 76); } else tgtX += 10;
      }
      addFlag(ax0 - 9, af);
    }
    const nearFlag = function (tx) { for (const f of flags) if (Math.abs(f.x / T - tx) < 5) return true; return false; };

    // cages: 2-4, spread across thirds
    const span = ax0 - spawnTx;
    const cands = cageSpots.filter(function (c) { return standable(c.x, c.y) && free(c.x, c.y - 3) && !inArena(c.x) && c.x > spawnTx + 20 && reachable(c.x, c.y); });
    const nCages = Math.max(2, Math.min(4, Math.round(2 + dm)));
    const cages = [];
    for (let part = 0; part < nCages; part++) {
      const a = spawnTx + span * part / nCages, b = spawnTx + span * (part + 1) / nCages;
      let pool = cands.filter(function (c) { return c.x >= a && c.x < b && !used.has(key(c.x, c.y)); });
      if (!pool.length) pool = spots.filter(function (s) {
        return s.x >= a && s.x < b && (s.k === 'g' || s.k === 'i') && standable(s.x, s.y) && free(s.x, s.y - 3) &&
          !inArena(s.x) && s.x > spawnTx + 20 && reachable(s.x, s.y) && !used.has(key(s.x, s.y));
      });
      if (!pool.length) continue;
      pool.sort(function (p, q) { return (q.pri || 0) - (p.pri || 0); });
      const top = pool.filter(function (p) { return (p.pri || 0) === (pool[0].pri || 0); });
      const c = top[r.int(0, top.length - 1)];
      const e = { type: 'cage', x: PX(c.x), y: c.y * T };
      cages.push(e); ents.push(e);
      for (let d = -1; d <= 1; d++) used.add(key(c.x + d, c.y));
    }

    // enemies
    const weights = (TH && TH.enemies) || { grunt: 6, shotgunner: 2, gunner: 2, rocketeer: 1, grenadier: 1, dog: 1, sniper: 1, turret: 1 };
    const okSpots = spots.filter(function (s) {
      if (inArena(s.x) || s.x < spawnTx + 18 || nearFlag(s.x)) return false;
      if (s.k === 'w') return get(s.x, s.y) === WATER && get(s.x, s.y - 1) === WATER;
      return standable(s.x, s.y) && reachable(s.x, s.y);
    });
    okSpots.sort(function (a, b) { return a.x - b.x; });
    function pickEnemy(spot) {
      const opts = {};
      for (const id in weights) {
        const k = EKIND[id] || 'g', wv = weights[id];
        if (!(wv > 0)) continue;
        if (spot.k === 'w') { if (k === 'w') opts[id] = wv; continue; }
        if (k === 'w') continue;
        if (k === 'p') { if (spot.k === 'p') opts[id] = wv * 3; else if (spot.k === 'i' && id === 'turret') opts[id] = wv * 0.5; continue; }
        if (k === 'f') { if (spot.k !== 'p' && flatRun(spot.x, spot.y, 2)) opts[id] = wv; continue; }
        if (k === 'a') { if (spot.k === 'g' && skyAbove(spot.x, spot.y, 9)) opts[id] = wv; continue; }
        opts[id] = spot.k === 'p' ? wv * 0.5 : wv;
      }
      return re.wpick(opts);
    }
    const enemies = [];
    const x0e = spawnTx + 18, x1e = ax0 - 4, WIN = 10;
    let acc = 0.4;
    for (let wx = x0e; wx < x1e; wx += WIN) {
      const p = (wx - x0e) / (x1e - x0e);
      acc += 2.4 * (P.dens || 1) * dm * (0.55 + 0.95 * p);
      const pool = okSpots.filter(function (s) { return s.x >= wx && s.x < wx + WIN && !used.has(key(s.x, s.y)); });
      // perches first so towers get their turret/sniper
      pool.sort(function (a, b) { return (b.k === 'p') - (a.k === 'p') || re.next() - 0.5; });
      let placed = 0;
      while (acc >= 1 && pool.length) {
        const s = pool.shift();
        if (used.has(key(s.x, s.y))) continue;
        const id = pickEnemy(s);
        if (!id) continue;
        const kind = EKIND[id] || 'g';
        const e = { type: 'enemy', id: id, x: PX(s.x), y: s.y * T, facing: -1 };
        if (s.k === 'w') { e.y = (s.y + 1) * T; e.water = true; }
        else if (kind === 'a') { e.y = (s.y - re.int(5, 8)) * T; e.air = true; }
        else if (s.k === 'p') e.perch = true;
        enemies.push(e); ents.push(e);
        for (let d = -2; d <= 2; d++) used.add(key(s.x + d, s.y));
        acc -= 1; placed++;
        if (placed >= 5) break;
      }
      if (!pool.length) acc = Math.min(acc, 2.5);
    }

    // killability: drop any ground/perch enemy that has no clear line from ANY reachable standing spot (walled-in nooks); no rng used
    {
      // walk/jump reachability identical to tools/ttktest.js reachableCells (the same standing-cell BFS the killability sweep uses)
      const standAt = function (tx, ty) { const m = get(tx, ty); return (SOLID[m] || m === PLAT) && !SOLID[get(tx, ty - 1)] && !SOLID[get(tx, ty - 2)] && !HAZ[get(tx, ty - 1)]; };
      const cols = [], seenS = new Set(), cellsS = new Set();
      for (let x = 0; x < w; x++) { const c = []; for (let y = 3; y < h - 1; y++) if (standAt(x, y)) c.push(y); cols.push(c); }
      {
        const sy0 = Math.round(surf[spawnTx]); let start = null, bd = 1e9;
        for (let x = Math.max(0, spawnTx - 3); x <= Math.min(w - 1, spawnTx + 3); x++) for (const y of cols[x]) { const d = Math.abs(y - sy0) + Math.abs(x - spawnTx); if (d < bd) { bd = d; start = [x, y]; } }
        const q = start ? [start] : []; if (start) seenS.add(start[0] * 4096 + start[1]);
        while (q.length) {
          const cur = q.pop(), x = cur[0], y = cur[1]; cellsS.add(x * 4096 + y);
          for (let nx = Math.max(0, x - 7); nx <= Math.min(w - 1, x + 7); nx++) {
            const c = cols[nx], adx = Math.abs(nx - x);
            for (let i = 0; i < c.length; i++) {
              const ny = c[i], up = y - ny;
              if (up > 4 && !(up <= 12 && adx <= 2)) continue;
              if (up < -24) continue;
              const k = nx * 4096 + ny; if (seenS.has(k)) continue;
              seenS.add(k); q.push([nx, ny]);
            }
          }
        }
      }
      const reachS = { has: function (cx, ty) { return cellsS.has(cx * 4096 + ty); } };
      const clearLine = function (x0, y0, x1, y1) {
        const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 1.5);
        for (let i = 1; i < n; i++) { const f = i / n; if (SOLID[get(Math.floor((x0 + (x1 - x0) * f) / T), Math.floor((y0 + (y1 - y0) * f) / T))]) return false; }
        return true;
      };
      const seeable = function (e) {
        const etx = Math.floor(e.x / T), ety = Math.round(e.y / T), R = 16, V = 13;
        for (let cx = Math.max(1, etx - R); cx <= Math.min(w - 2, etx + R); cx++) {
          if (Math.abs(cx - etx) < 2) continue;
          for (let cy = Math.max(2, ety - V); cy <= Math.min(h - 2, ety + V); cy++) {
            if (!reachS.has(cx, cy + 1)) continue;
            const mx = (cx + 0.5) * T, my = (cy + 1) * T - 20;
            if (clearLine(mx, my, e.x, e.y - 8) || clearLine(mx, my, e.x, e.y - 4)) return true;
          }
        }
        return false;
      };
      // Enemies.make slides a wall-facing ground enemy up to 110 px forward (clearFront); do that slide here so the check sees the real spot
      const solidPx = function (x, y) { return SOLID[get(Math.floor(x / T), Math.floor(y / T))] === 1; };
      const walledAt = function (x, y, f) { for (const cy of [y - 6, y - 20]) for (const o of [12, 21, 31]) if (solidPx(x + f * o, cy)) return true; return false; };
      const boxOk = function (x, y) { for (let yy = y - 30; yy < y; yy += 6) for (let xx = x - 7; xx <= x + 7; xx += 7) if (solidPx(xx, yy)) return false; return solidPx(x - 6, y + 2) && solidPx(x + 6, y + 2); };
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        if (!e.air && !e.water && !e.perch && walledAt(e.x, e.y, e.facing)) {
          let nx = null;
          for (let dx = 8; dx <= 110; dx += 4) { const cx = e.x + e.facing * dx; if (boxOk(cx, e.y) && !walledAt(cx, e.y, e.facing)) { nx = cx; break; } }
          if (nx == null) { enemies.splice(i, 1); const j = ents.indexOf(e); if (j >= 0) ents.splice(j, 1); continue; }
          e.x = nx;
        }
        if (e.air || e.water || seeable(e)) continue;
        enemies.splice(i, 1); const j = ents.indexOf(e); if (j >= 0) ents.splice(j, 1);
      }
    }

    // explosive barrel clusters next to some enemies (+ always next to rollers)
    let barrels = 0;
    for (const e of enemies) {
      if (e.air || e.water) continue;
      if (e.id !== 'roller' && !re.chance(0.4)) continue;
      const tx = Math.floor(e.x / T), ty = Math.round(e.y / T);
      const dir0 = re.chance(0.5) ? 1 : -1, n = re.int(2, 3);
      for (let pass = 0; pass < 2; pass++) {
        const dir = pass ? -dir0 : dir0;
        let ok = true;
        for (let i = 0; i < n; i++) { const bx = tx + dir * (3 + i); if (!standable(bx, ty) || used.has(key(bx, ty))) { ok = false; break; } }
        if (!ok) continue;
        for (let i = 0; i < n; i++) { const bx = tx + dir * (3 + i); ents.push({ type: 'barrel', x: PX(bx), y: ty * T }); used.add(key(bx, ty)); barrels++; }
        break;
      }
    }
    // a few free-standing clusters on open ground so every level has some boom
    for (let tries = 0; tries < 60 && barrels < 10; tries++) {
      const s = okSpots[re.int(0, okSpots.length - 1)];
      if (!s || s.k === 'w' || used.has(key(s.x, s.y)) || !flatRun(s.x, s.y, 1)) continue;
      for (let i = -1; i <= 0; i++) { ents.push({ type: 'barrel', x: PX(s.x + i), y: s.y * T }); used.add(key(s.x + i, s.y)); barrels++; }
    }

    // loot crates
    const crateN = Math.round(w / 22);
    const crateSpots = okSpots.filter(function (s) { return s.k !== 'w' && standable(s.x, s.y); });
    let crates = 0;
    const crateX = [];
    for (let i = crateSpots.length - 1; i > 0; i--) { const j = rl.int(0, i), tmp = crateSpots[i]; crateSpots[i] = crateSpots[j]; crateSpots[j] = tmp; }
    for (let spacing = 7; spacing >= 2 && crates < crateN; spacing -= 2) {
      for (let i = 0; i < crateSpots.length && crates < crateN; i++) {
        const s = crateSpots[i];
        if (crateX.some(function (q) { return Math.abs(q - s.x) < spacing; })) continue;
        if (spacing > 3 ? used.has(key(s.x, s.y)) : ents.some(function (e) { return e.type !== 'hazard' && e.type !== 'ladderTop' && Math.abs(e.x - PX(s.x)) < T && Math.abs(e.y - s.y * T) < 2; })) continue;
        const loot = rl.chance(0.38) ? rl.wpick(LOOT) : null;
        ents.push({ type: 'crate', x: PX(s.x), y: s.y * T, loot: loot });
        used.add(key(s.x, s.y)); crates++; crateX.push(s.x);
      }
    }
    // a guaranteed early weapon crate near the start
    {
      const s = okSpots.find(function (q) { return q.x > spawnTx + 20 && q.k === 'g' && !used.has(key(q.x, q.y)); });
      if (s) { ents.push({ type: 'crate', x: PX(s.x), y: s.y * T, loot: rl.pick(['spread', 'mg', 'shotgun', 'rocket']) }); used.add(key(s.x, s.y)); crates++; }
    }

    // gold bars: hidden pockets + bonus spots
    let goldN = 0;
    for (const gb of gold) {
      if (inArena(gb.x) || used.has(key(gb.x, gb.y))) continue;
      const m = get(gb.x, gb.y);
      if (!(SOLID[m] || m === PLAT) || !free(gb.x, gb.y - 1)) continue;
      if (!gb.hidden && !reachable(gb.x, gb.y)) continue;
      ents.push({ type: 'goldbar', x: PX(gb.x), y: gb.y * T, hidden: !!gb.hidden }); used.add(key(gb.x, gb.y)); goldN++;
    }
    // top up gold on high perches / ledges when the level had no diggable ground (sky islands, etc.)
    for (let tries = 0; tries < 80 && goldN < 4; tries++) {
      const s = okSpots[rl.int(0, okSpots.length - 1)];
      if (!s || s.k === 'w' || used.has(key(s.x, s.y)) || !standable(s.x, s.y)) continue;
      if (s.k !== 'p' && tries < 40) continue;
      ents.push({ type: 'goldbar', x: PX(s.x), y: s.y * T }); used.add(key(s.x, s.y)); goldN++;
    }
    // free-floating pickups at bonus spots (secret-ish rewards)
    let pickups = 0;
    for (const b of bonus) {
      if (pickups >= 4 || inArena(b.x) || used.has(key(b.x, b.y)) || !standable(b.x, b.y) || !reachable(b.x, b.y)) continue;
      if (rl.chance(0.55)) { ents.push({ type: 'pickup', id: rl.wpick(LOOT), x: PX(b.x), y: b.y * T }); pickups++; }
      else { ents.push({ type: 'goldbar', x: PX(b.x), y: b.y * T }); goldN++; }
      used.add(key(b.x, b.y));
    }

    // tide band (water theme): biggest dock basin
    let water = null;
    if (docks.length && TH && TH.water) {
      let best = docks[0];
      for (const d of docks) if (d.bw > best.bw) best = d;
      water = { y: best.y, x0: best.x0, x1: best.x1, amp: (TH.water.amp || 2) * T, period: TH.water.period || 16 };
    }

    const arena = {
      tx0: ax0, ty0: ay0, tx1: ax1, ty1: af - 1,
      x0: ax0 * T, y0: ay0 * T, x1: (ax1 + 1) * T, y1: af * T, floorY: af * T,
      bossX: (ax0 + Math.round(ARENA_IN * 0.72)) * T + T / 2, bossY: af * T,
      entryX: (ax0 + 2) * T + T / 2, entryY: af * T,
      door: { tx: ax0 - 2, ty0: doorTy0, ty1: doorTy1, w: 2, x: (ax0 - 2) * T, y: af * T }
    };

    return {
      id: themeId, theme: themeId, seed: seed, w: w, h: h, T: T,
      tiles: tiles, back: back, surface: surf,
      spawn: { x: PX(spawnTx), y: surf[spawnTx] * T },
      ents: ents, flags: flags, arena: arena, water: water, deco: deco,
      gravity: TH ? TH.gravity : 1,
      stats: { enemies: enemies.length, cages: cages.length, crates: crates, barrels: barrels, gold: goldN, pickups: pickups,
        flags: flags.length, hazards: ents.filter(function (e) { return e.type === 'hazard'; }).length }
    };
  }

  // ================================================================= reachability (simplified movement model)
  // Player = 1x2 cells. Walk, fall (with half-speed air drift), jump (up to 4 tiles, 6/5/4/3 across at height 1/2/3/4),
  // wall-climb any solid wall face, vault onto ledges, ladders + water (move any direction, jump from them),
  // drop through PLAT. SPIKES/LAVA cells are never entered. Returns reach[i]=1 for reachable feet cells.
  const JUMPX = [0, 6, 5, 4, 3];
  function analyze(lv, opts) {
    const JX = opts && opts.strict ? [0, 5, 4, 3, 2] : JUMPX, drift = !(opts && opts.strict);
    const w = lv.w, h = lv.h, t = lv.tiles, T = lv.T || TILE();
    const cell = function (x, y) { return (x < 0 || x >= w || y >= h) ? BEDROCK : (y < 0 ? E : t[y * w + x]); };
    const solid = function (x, y) { return SOLID[cell(x, y)] === 1; };
    const free = function (x, y) { const m = cell(x, y); return !SOLID[m] && !HAZ[m]; };
    const fits = function (x, y) { return y >= 1 && free(x, y) && free(x, y - 1); };
    const reach = new Uint8Array(w * h);
    const q = new Int32Array(w * h);
    let qh = 0, qt = 0;
    function push(x, y) {
      if (x < 0 || x >= w || y < 1 || y >= h) return;
      const i = y * w + x;
      if (reach[i] || !fits(x, y)) return;
      reach[i] = 1; q[qt++] = i;
    }
    const sx = Math.floor(lv.spawn.x / T), sy = Math.round(lv.spawn.y / T) - 1;
    push(sx, sy);
    while (qh < qt) {
      const i = q[qh++], x = i % w, y = (i / w) | 0;
      const below = cell(x, y + 1);
      const grounded = SOLID[below] || below === PLAT || below === LADDER;
      const ladder = cell(x, y) === LADDER || cell(x, y - 1) === LADDER;
      const wet = cell(x, y) === WATER || cell(x, y - 1) === WATER;
      const anchored = grounded || ladder || wet;
      if (anchored) {
        push(x - 1, y); push(x + 1, y);
        for (let k = 1; k <= 4; k++) {
          if (!fits(x, y - k)) break;
          push(x, y - k);
          for (let d = -1; d <= 1; d += 2) for (let s = 1; s <= JX[k]; s++) { if (!fits(x + d * s, y - k)) break; push(x + d * s, y - k); }
        }
        if (below === PLAT || below === LADDER) push(x, y + 1);
      }
      if (ladder || wet) { push(x, y - 1); push(x, y + 1); }
      for (let d = -1; d <= 1; d += 2) {
        if (solid(x + d, y) || solid(x + d, y - 1)) {
          if (fits(x, y - 1) && (solid(x + d, y - 1) || solid(x + d, y - 2))) push(x, y - 1);   // climb
          if (solid(x + d, y) && fits(x + d, y - 1)) push(x + d, y - 1);                         // vault
          if (!grounded) for (let k = 0; k <= 2; k++) {                                          // wall-jump away
            if (!fits(x, y - k)) break;
            for (let s = 1; s <= 3; s++) { if (!fits(x - d * s, y - k)) break; push(x - d * s, y - k); }
          }
        }
      }
      if (!anchored) {
        if (HAZ[below]) continue;            // landing on spikes/lava = death; nothing further
        push(x, y + 1);
        if (drift && (y & 1) === 0) { if (fits(x - 1, y)) push(x - 1, y + 1); if (fits(x + 1, y)) push(x + 1, y + 1); }
      }
    }
    const A = lv.arena;
    const goalI = (Math.round(A.y1 / T) - 1) * w + (A.tx0 + 2);
    const doorI = (Math.round(A.y1 / T) - 1) * w + (A.door.tx);
    const at = function (px, py) { const tx = Math.floor(px / T), ty = Math.round(py / T) - 1; return ty >= 0 && reach[ty * w + tx] === 1; };
    return { reach: reach, ok: reach[goalI] === 1 && reach[doorI] === 1, goal: reach[goalI] === 1, door: reach[doorI] === 1, count: qt, at: at };
  }

  // ================================================================= public
  function build(themeId, seed, diff) {
    const id = PROF[themeId] ? themeId : 'plains';
    const dm = diffMul(diff);
    const base = (seed == null || seed === '' || !isFinite(+seed)) ? DEFAULT_SEEDS[id] : (+seed >>> 0);
    // retry a few derived seeds until the level is beatable AND has enough vertical variety (deterministic per base seed)
    let lv = null, best = null, bestScore = -1;
    for (let attempt = 0; attempt < 8; attempt++) {
      lv = generate(id, (base + attempt * 7919) >>> 0, dm);
      const a = analyze(lv);
      lv.reachable = a.ok;
      let lo = 1e9, hi = -1e9;
      for (let x = 12; x < lv.arena.tx0 - 6; x++) { if (lv.surface[x] < lo) lo = lv.surface[x]; if (lv.surface[x] > hi) hi = lv.surface[x]; }
      lv.vertical = hi - lo; lv.attempts = attempt + 1;
      const score = (a.ok ? 1000 : 0) + Math.min(lv.vertical, 16);
      if (score > bestScore) { bestScore = score; best = lv; }
      if (a.ok && lv.vertical >= 16) break;
    }
    lv = best;
    lv.baseSeed = base;
    return lv;
  }

  // tide: surface y (px) at time t; rises from rest y by amp and back over `period` seconds. null if no tide.
  function waterY(lv, t) {
    const W = lv && lv.water;
    if (!W) return null;
    return W.y - W.amp * (0.5 - 0.5 * Math.cos((t / W.period) * Math.PI * 2));
  }

  S.LevelGen = {
    build: build, analyze: analyze, waterY: waterY, rng: rng, diffMul: diffMul,
    PROF: PROF, DEFAULT_SEEDS: DEFAULT_SEEDS, IDS: IDS, EKIND: EKIND, LOOT: LOOT, SOLID: SOLID, HAZ: HAZ,
    MAT: { EMPTY: E, DIRT: DIRT, ROCK: ROCK, STEEL: STEEL, WOOD: WOOD, PLAT: PLAT, LADDER: LADDER, SPIKES: SPIKES, ICE: ICE,
      BEDROCK: BEDROCK, LAVA: LAVA, WATER: WATER, MUD: MUD, SAND: SAND, CRATE: CRATE, GLASS: GLASS }
  };
})();
