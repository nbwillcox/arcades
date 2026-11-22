/* CYBER SLAYER SURVIVOR - config & balance tables. Free for non-commercial use: link back to https://nictools.dev or the GitHub repo. */
var CS = window.CS = { W: 960, H: 540, VER: '0.0.31',
  LINKS: { site: 'https://nictools.dev', repo: 'https://github.com/nbwillcox/CyberSlayerSurvivor' } };

/* ---------- rarity (5 tiers) ---------- */
CS.RAR = [
  { id: 'basic',     n: 'BASIC',     c: '#9E9E9E', t: '#cfcfcf', m: 1.0,  w: 50 },
  { id: 'enhanced',  n: 'ENHANCED',  c: '#4CAF50', t: '#7dff85', m: 1.35, w: 25 },
  { id: 'superior',  n: 'SUPERIOR',  c: '#2196F3', t: '#6cc3ff', m: 1.75, w: 15 },
  { id: 'epic',      n: 'EPIC',      c: '#9C27B0', t: '#e07bff', m: 2.25, w: 7 },
  { id: 'legendary', n: 'LEGENDARY', c: '#FFD700', t: '#ffe44d', m: 3.0,  w: 3 }
];

/* ---------- classes ---------- */
CS.CLASSES = {
  gunner: { id: 'gunner', n: 'THE GUNNER', sub: 'HEAVY BALLISTICS', c: '#ffb347', c2: '#27e6ff',
    hp: 120, armor: 5, spd: 165, crit: 0.10, pick: 180, primary: 'slug', innate: 'vanguard',
    d: 'Cyber-mercenary. Heavy slug pistol plus a squad of troopers that grows on Bio-Scrap.',
    mn: { vanguard: 'CYBER-TROOPER', sniper: 'RAIL-GHOST', aegis: 'AEGIS BEARER', detonator: 'MICRO-BOMBER', fusion: 'ELITE MECH FUSION' } },
  engineer: { id: 'engineer', n: 'THE ENGINEER', sub: 'DRONE TECH-SWARM', c: '#4dffb0', c2: '#ffcc33',
    hp: 100, armor: 8, spd: 175, crit: 0.05, pick: 220, primary: 'drone', innate: 'sniper',
    d: 'Exosuit tinkerer. Assault drone plus a hive of specialized swarm drones.',
    mn: { vanguard: 'BUILDER DRONE', sniper: 'TESLA DRONE', aegis: 'SHIELD DRONE', detonator: 'KAMIKAZE DRONE', fusion: 'ORBITAL DREADNOUGHT' } },
  priest: { id: 'priest', n: 'THE HOLY PRIEST', sub: 'TECHNOMANCER', c: '#ffe44d', c2: '#27e6ff',
    hp: 110, armor: 4, spd: 170, crit: 0.08, pick: 200, primary: 'bolt', innate: 'aegis',
    d: 'Neo-gothic technomancer. Holy Cyber Bolts and hard-light seraph constructs.',
    mn: { vanguard: 'CYBER-PALADIN', sniper: 'RAIL-SERAPH', aegis: 'HOLO-CHERUB', detonator: 'RADIANT RELIQUARY', fusion: 'ARCHANGEL FUSION' } }
};

/* ---------- enemies ---------- */
CS.ENEMIES = {
  skeleton: { n: 'CYBER-SKELETON', hp: 12, spd: 62, dmg: 5,  r: 8,  xp: 1,  armor: 0, gold: 0.05, tag: 'undead', kbr: 0 },
  ghost:    { n: 'DRONE-GHOST',    hp: 16, spd: 46, dmg: 4,  r: 8,  xp: 2,  armor: 0, gold: 0.07, tag: 'undead', kbr: 0.1 },
  hound:    { n: 'NECRO-HOUND',    hp: 26, spd: 72, dmg: 9,  r: 9,  xp: 3,  armor: 1, gold: 0.08, tag: 'undead', kbr: 0.2 },
  lich:     { n: 'TECHNO-LICH',    hp: 46, spd: 40, dmg: 5,  r: 9,  xp: 5,  armor: 1, gold: 0.15, tag: 'demon',  kbr: 0.3 },
  golem:    { n: 'DREAD-MECH',     hp: 180, spd: 27, dmg: 16, r: 15, xp: 14, armor: 6, gold: 0.6, scrap: 1, tag: 'demon', kbr: 0.75 },
  banshee:  { n: 'VOID-WRAITH',    hp: 34, spd: 50, dmg: 4,  r: 8,  xp: 4,  armor: 0, gold: 0.1,  tag: 'undead', kbr: 0.2 }
};

/* ---------- stages ---------- */
CS.STAGES = [
  { n: 'NEON CATACOMBS',     sub: 'SECTOR 01', pal: ['#0b0618', '#2b1a55', '#b54cff', '#27e6ff'], hz: [],                    bias: { skeleton: 3 },                      boss: { n: 'WARDEN NECRO-BOT',      st: 'mech',  hp: 2800, pat: ['orbs', 'charge', 'summon'] },        bpm: 120, root: 55 },
  { n: 'RUST-WASTE FOUNDRY', sub: 'SECTOR 02', pal: ['#1c0d05', '#4a2410', '#ff7a1a', '#ffd35a'], hz: ['slag', 'conveyor'],  bias: { golem: 1, hound: 1.4 },             boss: { n: 'MOLTEN BONE-FORGE',     st: 'beast', hp: 3600, pat: ['slam', 'ring', 'rain'] },            bpm: 108, root: 49 },
  { n: 'ASTRAL DATA-SPIRE',  sub: 'SECTOR 03', pal: ['#050f24', '#10306a', '#4dd2ff', '#ffffff'], hz: ['storm'],             bias: { ghost: 2.5, banshee: 1 },           boss: { n: 'SPECTER-OS',            st: 'lich',  hp: 4200, pat: ['spiral', 'blink', 'lasers'] },       bpm: 132, root: 62 },
  { n: 'BIO-MECH OSSUARY',   sub: 'SECTOR 04', pal: ['#1a0510', '#4a1530', '#ff4f7a', '#ffb0c8'], hz: ['slag'],              bias: { hound: 2, golem: 0.8 },             boss: { n: 'ABOMINATION UNIT-09',   st: 'beast', hp: 5000, pat: ['charge', 'fan', 'summon', 'slam'] }, bpm: 116, root: 52 },
  { n: 'ORBITAL GRAVEYARD',  sub: 'SECTOR 05', pal: ['#04060d', '#16213d', '#9fb4ff', '#ff4f4f'], hz: ['lasers', 'zerog'],    bias: { ghost: 1.6, lich: 1.2 },            boss: { n: 'DREADNOUGHT CAPT. VANE', st: 'mech', hp: 5800, pat: ['fan', 'lasers', 'rain', 'ring'] },   bpm: 124, root: 58 },
  { n: 'CYBER-BASILICA',     sub: 'SECTOR 06', pal: ['#14091f', '#46206f', '#ffd35a', '#ff6bd6'], hz: ['storm'],             bias: { lich: 2, banshee: 1 },              boss: { n: 'FALLEN CYBER-ARCHANGEL', st: 'angel', hp: 6600, pat: ['spiral', 'rain', 'fan', 'blink'] }, bpm: 112, root: 57 },
  { n: 'TOXIC SYNTH-SWAMP',  sub: 'SECTOR 07', pal: ['#06150a', '#124a1c', '#6bff3c', '#e8ff7a'], hz: ['acid'],              bias: { ghost: 3, golem: 0.8 },             boss: { n: 'HYDRA-CORE 7',          st: 'beast', hp: 7400, pat: ['ring', 'summon', 'charge', 'spiral'] }, bpm: 118, root: 50 },
  { n: 'CRYO-STASIS VAULT',  sub: 'SECTOR 08', pal: ['#04141a', '#14485a', '#7ae8ff', '#ffffff'], hz: ['ice'],               bias: { banshee: 2, ghost: 1.5 },           boss: { n: 'SUB-ZERO LICH',         st: 'lich',  hp: 8200, pat: ['rain', 'fan', 'lasers', 'blink'] },  bpm: 104, root: 53 },
  { n: 'VOID REACTOR CORE',  sub: 'SECTOR 09', pal: ['#12040a', '#3b0f2a', '#ff3c8a', '#ffe44d'], hz: ['rings'],             bias: { golem: 1.6, lich: 1.5, hound: 1.5 }, boss: { n: 'CHRONO-REAPER',         st: 'angel', hp: 9200, pat: ['blink', 'rain', 'ring', 'lasers', 'fan'] }, bpm: 136, root: 48 },
  { n: 'THE OMEGA CITADEL',  sub: 'FINAL SECTOR', pal: ['#1a0a05', '#5a1a12', '#ffcc33', '#ff3030'], hz: ['lasers', 'rings'], bias: { golem: 1.2, lich: 1.2, hound: 1.2, ghost: 1.2, banshee: 1.2 },
    boss: { n: 'DEUS EX NECROS', st: 'core', hp: 16000, pat: ['orbs', 'fan', 'charge', 'summon', 'spiral', 'rain', 'ring', 'lasers', 'slam', 'blink'], phases: 3 }, bpm: 140, root: 46 }
];

CS.MIDBOSSES = [
  { n: 'ARCH-LICH MAINFRAME',         st: 'lich',  c: '#b54cff', hp: 900,  pat: ['orbs', 'summon', 'ring'] },
  { n: 'GOLIATH BONE-CRUSHER MK.IV',  st: 'beast', c: '#ff7a1a', hp: 1400, pat: ['charge', 'slam', 'fan'] },
  { n: 'SERAPHIM CORRUPTED AI',       st: 'angel', c: '#ffd35a', hp: 1100, pat: ['spiral', 'lasers', 'orbs'] },
  { n: 'CYBER-REAPER PRIME',          st: 'mech',  c: '#ff3c5a', hp: 1000, pat: ['blink', 'sweep', 'fan'] }
];

/* ---------- items (all cap at level 10) ---------- */
CS.ITEMS = {
  slug:    { n: 'CYBER-SLUG PISTOL', cat: 'primary', cls: 'gunner', ico: 'P', c: '#ffb347', bal: 1, d: 'Fires a heavy slug at the nearest foe every second. Big knockback.', u: '+DMG, FASTER, PIERCE', a5: 'RICOCHET ROUNDS', t5: 'Slugs ricochet to a fresh target.', a10: 'RAILGUN BARRAGE', t10: 'Volleys of piercing rail beams.' },
  drone:   { n: 'ASSAULT DRONE', cat: 'primary', cls: 'engineer', ico: 'D', c: '#4dffb0', d: 'Orbiting drone rapid-fires plasma bolts at the closest enemy.', u: '+DMG, +BOLTS, FASTER', a5: 'DUAL BARRELS', t5: 'Drone fires from two barrels.', a10: 'TWIN-LASER VALKYRIE', t10: 'Two drones sear foes with beams.' },
  bolt:    { n: 'HOLY CYBER BOLT', cat: 'primary', cls: 'priest', ico: 'H', c: '#ffe44d', d: 'Hard-light bolt arcs between foes. Purge: extra damage to undead and demons.', u: '+DMG, +CHAIN, FASTER', a5: 'TRINITY ARCS', t5: 'Splits into 3 homing arcs.', a10: 'ORBITAL JUDGMENT', t10: 'Judgment beams fall from orbit.' },
  grenade: { n: 'PLASMA GRENADE LAUNCHER', cat: 'spell', ico: 'G', c: '#ff7a1a', bal: 1, d: 'Lobs explosive plasma shells at enemy clusters.', u: '+DMG, +RADIUS, +SHELLS', a5: 'CLUSTER SHELLS', t5: 'Shells burst into bomblets.', a10: 'CARPET BOMBARDMENT', t10: 'Line of shells leaving napalm.' },
  tesla:   { n: 'ARC-TESLA COIL', cat: 'spell', ico: 'T', c: '#27e6ff', d: 'Chain lightning leaps between the nearest enemies.', u: '+DMG, +JUMPS, FASTER', a5: 'STATIC STUN', t5: 'Chain stuns every foe it hits.', a10: 'STORM LORD', t10: 'Double discharge, 12 jumps.' },
  nova:    { n: 'CYBER-EXORCISM NOVA', cat: 'spell', ico: 'N', c: '#fff08a', d: 'Expanding ring of holy-tech fire burns and shoves foes.', u: '+DMG, +RADIUS, FASTER', a5: 'ECHO RING', t5: 'A second ring follows the first.', a10: 'PERPETUAL PYRE', t10: 'Triple rings, constant firestorm.' },
  orbital: { n: 'ION ORBITAL STRIKE', cat: 'spell', ico: 'I', c: '#ff4fd8', d: 'Vertical ion beam smites elite targets after a short telegraph.', u: '+DMG, +RADIUS, FASTER', a5: 'TRIPLE LANCE', t5: 'Three beams per strike.', a10: 'ORBITAL BARRAGE', t10: 'Eight-beam saturation fire.' },
  nanite:  { n: 'NANITE SWARM CLOUD', cat: 'spell', ico: 'S', c: '#6bff3c', d: 'Corrosive cloud: damage over time, slows and melts armor.', u: '+DOT, +SIZE, +CLOUDS', a5: 'HUNTER SWARM', t5: 'Clouds drift toward prey.', a10: 'PLAGUE STORM', t10: 'Huge clouds; kills seed new ones.' },
  saw:     { n: 'RICOCHET SAWBLADES', cat: 'spell', ico: 'R', c: '#c9d6ff', bal: 1, d: 'Neon-steel discs bounce around the arena.', u: '+DMG, +BLADES, +LIFE', a5: 'SPLIT EDGE', t5: 'Blades pierce and split on bounce.', a10: 'BLADE STORM', t10: 'Orbiting ring plus flung blades.' },
  turret:    { n: 'AUTO-TURRET NESTS', cat: 'spell', cls: 'gunner', ico: 'U', c: '#ffb347', bal: 1, d: 'Deploys auto-turrets that gun down nearby foes, then self-destruct.', u: '+TURRETS, +DMG, +LIFE', a5: 'TWIN GATLING', t5: 'Turrets fire twin barrels faster.', a10: 'GATLING FORTRESS', t10: 'Big turrets with rocket salvos.' },
  stim:      { n: 'KILL-RUSH STIMS', cat: 'spell', cls: 'gunner', ico: 'Y', c: '#ff6a4a', d: 'Every kill stacks haste: faster fire and movement that fades quickly.', u: '+STACKS, +HASTE', a5: 'BLOOD RUSH', t5: 'Rush kills heal you.', a10: 'OVERDRIVE', t10: 'Full stacks trigger berserk damage.' },
  gunship:   { n: 'GUNSHIP STRAFING RUN', cat: 'spell', cls: 'gunner', ico: 'J', c: '#ffd35a', bal: 1, d: 'Calls a gunship to strafe a line of foes with heavy fire.', u: '+DMG, +BLAST, FASTER', a5: 'TWIN RUNS', t5: 'Two parallel strafing lines.', a10: 'CARPET OF STEEL', t10: 'Three wide lines of blasts.' },
  dronebay:  { n: 'DRONE BAY', cat: 'spell', cls: 'engineer', ico: 'E', c: '#4dffb0', d: 'Launches extra combat drones. They can be shot down and rebuilt.', u: '+DRONES, +DMG', a5: 'LINKED ARCS', t5: 'Drone bolts chain between foes.', a10: 'HIVE SWARM', t10: 'A rapid-fire swarm of drones.' },
  emp:       { n: 'OVERCHARGE EMP', cat: 'spell', cls: 'engineer', ico: 'O', c: '#7df3ff', d: 'Periodic EMP pulse damages and stuns nearby foes.', u: '+DMG, +RADIUS, FASTER', a5: 'ARC SURGE', t5: 'Pulse also chains lightning.', a10: 'SYSTEM SHUTDOWN', t10: 'Huge pulse freezes foes for 3s.' },
  fabricator:{ n: 'KAMIKAZE FABRICATOR', cat: 'spell', cls: 'engineer', ico: 'C', c: '#ff7a3c', d: 'Fabricates waves of one-shot kamikaze drones.', u: '+DRONES, +BLAST, FASTER', a5: 'CLUSTER CORES', t5: 'Drones burst into bomblets.', a10: 'SWARM FACTORY', t10: 'Massive waves, huge blasts.' },
  sanctum:   { n: 'CONSECRATED GROUND', cat: 'spell', cls: 'priest', ico: 'L', c: '#fff08a', d: 'Holy aura burns foes near you and mends your wounds.', u: '+DMG, +RADIUS, +MEND', a5: 'BINDING LIGHT', t5: 'Aura slows every foe inside.', a10: 'RADIANT CATHEDRAL', t10: 'Vast purging aura that ignites foes.' },
  litany:    { n: 'BATTLE LITANY', cat: 'spell', cls: 'priest', ico: '*', c: '#c9a3ff', d: 'Periodic prayer: bonus damage and mends your constructs.', u: '+DMG BUFF, FASTER', a5: 'SWIFT PRAYER', t5: 'Prayer also grants speed.', a10: 'DIVINE SHIELD', t10: 'Prayer grants brief invulnerability.' },
  wings:     { n: 'SERAPH WINGS', cat: 'spell', cls: 'priest', ico: '^', c: '#9fefff', d: 'Launches homing feathers of hard light.', u: '+FEATHERS, +DMG, FASTER', a5: 'PURGING PLUMES', t5: 'Feathers pierce foes.', a10: 'ARCHANGEL FLIGHT', t10: 'Double feather storm.' },
  vanguard:  { n: 'VANGUARD SQUAD', cat: 'minion', ico: 'V', c: '#ff9a3c', d: 'Melee frontline interceptors that charge nearby enemies.', u: '+UNITS, +HP, +DMG', a5: 'SHIELD BASH', t5: 'Strikes knock enemies back hard.', a10: 'TITAN VANGUARD', t10: 'Huge cleaving titans.' },
  sniper:    { n: 'SNIPER SQUAD', cat: 'minion', ico: 'Q', c: '#4dd2ff', d: 'Ranged backline units that shoot the nearest foe.', u: '+UNITS, +DMG, FASTER', a5: 'DOUBLE TAP', t5: 'Fires two shots per volley.', a10: 'RAIL GHOSTS', t10: 'Piercing shots that crit hard.' },
  aegis:     { n: 'AEGIS ORBITERS', cat: 'minion', ico: 'A', c: '#ffe44d', d: 'Orbit you, block enemy projectiles, pulse heals.', u: '+UNITS, +HEAL, +BLOCK', a5: 'MIRROR PLATES', t5: 'Blocked shots are reflected.', a10: 'HOLO-SERAPHS', t10: 'Wide halo, fast heals, burn aura.' },
  detonator: { n: 'DETONATOR BOTS', cat: 'minion', ico: 'B', c: '#ff5050', d: 'Fast suicide units that explode on contact, then respawn.', u: '+UNITS, +DMG, +BLAST', a5: 'CHAIN BLAST', t5: 'Blasts trigger bomblets.', a10: 'NUCLEAR MICRO-BOTS', t10: 'Gigantic detonations.' },
  fusion:    { n: 'MINION FUSION', cat: 'minion', ico: 'F', c: '#ff4fd8', d: 'Merges three minions into a giant boss minion.', u: '+GIANTS, +POWER, FASTER', a5: 'OVERCLOCK PROTOCOL', t5: 'All minions attack 35% faster.', a10: 'APEX TITANS', t10: 'Giants stomp and fuse constantly.' },
  plating:   { n: 'TITANIUM ARMOR', cat: 'defense', ico: 'M', c: '#c0c8d8', d: 'Sub-dermal plating: flat damage reduction plus mitigation.', u: '+ARMOR', a5: 'REACTIVE PLATES', t5: 'Taking a hit emits a shockwave.', a10: 'AEGIS PROTOCOL', t10: 'Low HP triggers invulnerability.' },
  regen:     { n: 'NANO-WEAVE', cat: 'defense', ico: 'W', c: '#5cff8a', d: 'HP regeneration plus an emergency heal under 25% HP.', u: '+REGEN, +BURST', a5: 'PURGING BURST', t5: 'Emergency heal also stuns foes.', a10: 'PHOENIX PROTOCOL', t10: 'Revive once per run.' },
  deflector: { n: 'KINETIC DEFLECTOR', cat: 'defense', ico: 'K', c: '#48a8ff', d: 'Rechargeable energy barrier. Hits shove attackers back.', u: '+SHIELD, +RECHARGE', a5: 'BREAK BLAST', t5: 'Breaking the shield blasts foes.', a10: 'PERFECT MIRROR', t10: 'Reflects shots, blazing recharge.' },
  thrusters: { n: 'PHASE-SHIFT THRUSTERS', cat: 'defense', ico: 'Z', c: '#d48bff', d: 'Move speed plus evasion chance to dodge a hit.', u: '+SPEED, +DODGE', a5: 'PHASE DASH', t5: 'Auto-dash away when hit.', a10: 'AFTERIMAGE', t10: 'Leaves a damaging neon trail.' },
  graviton:  { n: 'GRAVITON MODULE', cat: 'defense', ico: 'X', c: '#ffd35a', d: 'Higher crit damage and gold drops.', u: '+CRIT DMG, +GOLD', a5: 'CRIT BLAST', t5: 'Crits explode.', a10: 'SINGULARITY', t10: 'Periodic black hole.' }
};
CS.ITEM_ORDER = ['slug', 'drone', 'bolt', 'grenade', 'tesla', 'nova', 'orbital', 'nanite', 'saw', 'turret', 'stim', 'gunship', 'dronebay', 'emp', 'fabricator', 'sanctum', 'litany', 'wings', 'vanguard', 'sniper', 'aegis', 'detonator', 'fusion', 'plating', 'regen', 'deflector', 'thrusters', 'graviton'];
CS.MAX_OFFENSE = 6;   // primary + spells + minion squads

CS.itemName = function (id, cls) {
  var c = CS.CLASSES[cls];
  if (c && c.mn[id]) return c.mn[id];
  return CS.ITEMS[id].n;
};

/* ---------- Armory (meta shop). base cost; cost(rank) = base * 1.45^rank ---------- */
CS.SHOP = {
  shared: [
    { id: 'chassis', n: 'REINFORCED CHASSIS', d: '+8% MAX HP PER RANK', base: 90 },
    { id: 'plating', n: 'SUB-DERMAL PLATING', d: '+1 ARMOR PER RANK', base: 90 },
    { id: 'neural',  n: 'NEURAL ACCELERATOR', d: '+6% XP GAIN PER RANK', base: 110 },
    { id: 'magnet',  n: 'MAGNET CORE', d: '+8% PICKUP RANGE, +6% PULL SPEED', base: 80 },
    { id: 'greed',   n: 'GREED PROTOCOL', d: '+8% GOLD DROPS PER RANK', base: 120 }
  ],
  gunner: [
    { id: 'overbore', n: 'CALIBER OVERBORE', d: '+8% PISTOL DMG, +1 PIERCE EVERY 3 RANKS', base: 130 },
    { id: 'barracks', n: 'SQUAD BARRACKS', d: 'START WITH +1..+4 TROOPERS', base: 150 },
    { id: 'hollow',   n: 'HOLLOW-POINT TECH', d: '+1.5% CRIT, +8% CRIT KNOCKBACK', base: 130 },
    { id: 'reload',   n: 'TACTICAL RELOAD', d: '-3% BALLISTIC COOLDOWNS', base: 140 }
  ],
  engineer: [
    { id: 'motherboard', n: 'SWARM MOTHERBOARD', d: '+2 MINION CAP, +1 PER UNIT TYPE', base: 150 },
    { id: 'capacitor',   n: 'OVERCHARGED CAPACITORS', d: 'DRONE FIRES +4% FASTER, CHAIN ARCS', base: 130 },
    { id: 'nanites',     n: 'AUTO-REPAIR NANITES', d: 'MINIONS REGEN, HEAL YOU EVERY 5S', base: 130 },
    { id: 'recycler',    n: 'SCRAP RECYCLER', d: '+15% GOLD FROM MINION/DRONE KILLS', base: 120 }
  ],
  priest: [
    { id: 'conduit',  n: 'SANCTIFIED CONDUIT', d: 'HOLY BOLT CHAINS +1 TARGET', base: 160 },
    { id: 'choir',    n: 'ANGELIC CHOIR', d: 'START WITH +1..+5 HOLO-CHERUBS', base: 150 },
    { id: 'blessing', n: 'TECHNO-BLESSING', d: 'MORE EPIC & LEGENDARY CARDS', base: 140 },
    { id: 'martyr',   n: "MARTYR'S AEGIS", d: 'OVERHEAL BECOMES HOLY SHIELD', base: 140 }
  ]
};
CS.shopCost = function (def, rank) { return Math.round(def.base * Math.pow(1.45, rank) / 5) * 5; };

/* ---------- misc balance ---------- */
CS.BAL = {
  maxEnemies: 520, stageSec: function (i, blitz) { return blitz ? 300 : 480 + 15 * i; },
  midInterval: 90, loot: { accel: 600, maxSpeed: 520 },
  xpNeed: function (L) { return Math.round(4 + L * 5 + Math.pow(L, 1.6) * 1.1); }
};
