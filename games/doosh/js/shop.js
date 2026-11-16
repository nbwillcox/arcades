/* STICK DOOSH - shop.js (owner: ui)
   SGS.Shop: permanent-upgrade catalogue, pricing (DESIGN §9) and the stats() contract (DESIGN §13).
   No DOM access. Loads in Node with a tiny window stub. Reads/writes SGS.Save.data {gold, upgrades, beaten}.

   stats() semantics (what the core should do with each key):
     maxHp       +N max HP hearts (base 3)                    armor      +N armor pips
     regen       HP regenerated per second (float)            extraLives +N extra respawns per level (Bro Insurance)
     secondWind  N lethal hits survived at 1 HP per level      dmgMul     damage multiplier (1 = normal)
     rateMul     fire-rate multiplier (1 = normal)            specials   +N specials per life (base 3)
     blastMul    explosion radius multiplier (1 = normal)     crit       crit chance 0..1 (crit = x2 dmg + KAPOW!)
     ricochet    N wall bounces per bullet                    superAmmo  +N boss-super ammo (max + start)
     speedMul    run-speed multiplier                         jumpMul    jump-velocity multiplier
     doubleJump  bool                                         climbMul   climb-speed multiplier
     airDash     bool (dash in air: double-tap / special dir) stomp      bool (down+jump in air = butt slam)
     magnet      gold pickup pull radius in px (0 = none)     goldMul    gold multiplier
     luck        0..1 extra crate-loot / power-up chance      discount   0..1 shop discount (used by Shop itself)
     partyHats bay bigHeads kazoo loudWords   cosmetic bools (owned AND toggled on)
     keepPowerup 0..1 chance the next bro inherits the dead bro's power-up
     startPowerup 0 none / 1 random power-up at level start / 2 random MEGA power-up
     megaPickups 0..1 chance a weapon pickup is already MEGA
     legendaries (bool unless noted): frostRounds burnRounds hover sharkDrone dmgReduce(0..1 fraction)
       bananaMines charge cowBuddy dragonShells moonBoots extraDude(int, +N team size) bigDoosh goldenGun
*/
(function () {
  'use strict';
  const S = (window.SGS = window.SGS || {});

  const TIERS = {
    common:    { name: 'Common',    growth: 1.55, color: '#7fd34e' },
    rare:      { name: 'Rare',      growth: 1.7,  color: '#3fa9ff' },
    epic:      { name: 'Epic',      growth: 1.8,  color: '#c35bff' },
    legendary: { name: 'LEGENDARY', growth: 1,    color: '#ffb400' }
  };

  const CATS = [
    { id: 'vitals',    name: 'Vitals',     blurb: 'Stay un-dooshed longer.' },
    { id: 'firepower', name: 'Firepower',  blurb: 'More PEW per pew.' },
    { id: 'mobility',  name: 'Mobility',   blurb: 'Go fast. Go up. Go sideways.' },
    { id: 'economy',   name: 'Economy',    blurb: 'Money makes money. Allegedly.' },
    { id: 'perks',     name: 'Power-Ups',  blurb: 'Better toys, longer.' },
    { id: 'silly',     name: 'Silly',      blurb: 'Zero tactical value. Infinite style.' },
    { id: 'legendary', name: 'LEGENDARY',  blurb: 'Loot from beaten bosses.' }
  ];

  // Fallback boss names for lock text (live names come from SGS.BossDefs when loaded).
  const BOSS_NAMES = {
    ice: 'Frosty McChillface', fire: 'Captain Combustion', wind: 'Gustav Blowhard', water: 'Admiral Soggybottom',
    mud: 'Sir Sludgington', jungle: 'Chimpanzilla', mountain: 'Billy the Kidd', plains: 'Colonel Cornhusk',
    fantasy: 'Wizard Wizzlebeard', moon: 'Emperor Zorp', retro: 'GL1TCH.EXE', fortress: 'General Doom-Doosh'
  };
  const MAIN_THEMES = ['ice', 'fire', 'wind', 'water', 'mud', 'jungle', 'mountain', 'plains', 'fantasy', 'moon', 'retro'];

  // id, name, desc, cat, tier, base, max, stat, per, [unlock], [icon]
  // unlock: {item:id, lvl:n} | {boss:themeId} | {bosses:n}
  // per: number added per level, or true (boolean stat), or a 'set' value via {set:n}
  function I(id, name, desc, cat, tier, base, max, stat, per, unlock, icon) {
    return { id, name, desc, cat, tier, base, growth: TIERS[tier].growth, maxLevel: max, stat, per,
      unlock: unlock || null, icon: icon || '' };
  }

  const items = [
    // ---------------- VITALS ----------------
    I('tougher',     'Tougher Sticks',      'Twigs -> branches -> LOGS. +1 max heart.',                          'vitals', 'rare',   400, 3, 'maxHp', 1, null, 'heart'),
    I('cardboard',   'Cardboard Armor',     'It\'s a box. With arm holes. +1 armor pip.',                        'vitals', 'common',  60, 1, 'armor', 1, null, 'shield'),
    I('kevlar',      'Kevlar Vest',         'Bulletproof-ish. Mostly the -ish. +1 armor pip.',                   'vitals', 'rare',   500, 2, 'armor', 1, { item: 'cardboard', lvl: 1 }, 'shield'),
    I('plotarmor',   'Plot Armor',          'The main character can\'t die. Probably. +1 armor pip.',            'vitals', 'epic',  2600, 1, 'armor', 1, { item: 'kevlar', lvl: 2 }, 'shield'),
    I('bandaid',     'Band-Aid Regen',      'Slap one on. Walk it off. Slowly heals hearts.',                    'vitals', 'common',  90, 4, 'regen', 0.02, null, 'plus'),
    I('chickensoup', 'Grandma\'s Soup',     'Heals the soul AND the hearts. Faster regen.',                     'vitals', 'epic',  2200, 2, 'regen', 0.03, { item: 'bandaid', lvl: 4 }, 'plus'),
    I('insurance',   'Extra Bro Insurance', 'Fine print covers acts of Doosh. +1 respawn per level.',           'vitals', 'rare',   700, 2, 'extraLives', 1, null, 'bro'),
    I('secondwind',  'Second Wind',         '"Not today." Survive a lethal hit at 1 heart, once per level.',    'vitals', 'epic',  2000, 2, 'secondWind', 1, { bosses: 1 }, 'wind'),

    // ---------------- FIREPOWER ----------------
    I('bigbullets',  'Bigger Bullets',      'Same gun. Larger feelings. +8% damage.',                            'firepower', 'common',  50, 6, 'dmgMul', 0.08, null, 'bullet'),
    I('spicylead',   'Spicy Lead',          'Bullets marinated overnight in hot sauce. +15% damage.',            'firepower', 'epic',  2400, 2, 'dmgMul', 0.15, { item: 'bigbullets', lvl: 6 }, 'bullet'),
    I('twitchy',     'Twitchy Trigger Finger', 'Seven coffees. Zero regrets. +6% fire rate.',                    'firepower', 'common',  60, 6, 'rateMul', 0.06, null, 'bolt'),
    I('caffeineiv',  'Caffeine IV Drip',    'Coffee, but directly. +12% fire rate.',                             'firepower', 'epic',  2600, 2, 'rateMul', 0.12, { item: 'twitchy', lvl: 6 }, 'bolt'),
    I('pockets',     'Extra Pockets',       'Cargo shorts: the tactical choice. +1 special per life.',           'firepower', 'rare',   450, 3, 'specials', 1, null, 'bag'),
    I('boomjuice',   'Boom Juice',          'Explosions, now with 10% more explosion.',                          'firepower', 'common',  70, 5, 'blastMul', 0.10, null, 'boom'),
    I('nitrosmoothie','Nitro Smoothie',     'Do NOT shake before drinking. +20% blast radius.',                  'firepower', 'rare',   650, 2, 'blastMul', 0.20, { item: 'boomjuice', lvl: 5 }, 'boom'),
    I('kapow',       'KAPOW Crits',         'Hit \'em so hard the word gets bigger. +5% crit chance.',           'firepower', 'rare',   350, 4, 'crit', 0.05, null, 'star'),
    I('ricochet',    'Ricochet Rounds',     'Bullets with a second opinion. +1 wall bounce.',                    'firepower', 'epic',  1800, 2, 'ricochet', 1, { bosses: 2 }, 'bounce'),
    I('bossbattery', 'Boss Battery',        'Double-A for doomsday devices. +4 super ammo.',                     'firepower', 'rare',   300, 4, 'superAmmo', 4, { bosses: 1 }, 'battery'),

    // ---------------- MOBILITY ----------------
    I('sneakers',    'Greased Sneakers',    'Now with 40% more grease. Do not lick. +5% run speed.',             'mobility', 'common',  40, 5, 'speedMul', 0.05, null, 'shoe'),
    I('rocketskates','Rocket Skates',       'Mostly legal. Extremely loud. +10% run speed.',                     'mobility', 'epic',  1900, 1, 'speedMul', 0.10, { item: 'sneakers', lvl: 5 }, 'shoe'),
    I('springy',     'Springy Knees',       'Boing. Boing. Medically boing. +5% jump height.',                   'mobility', 'common',  45, 4, 'jumpMul', 0.05, null, 'spring'),
    I('doublejump',  'Double Jump',         'Jump. Then, crucially, jump again.',                                'mobility', 'rare',   900, 1, 'doubleJump', true, null, 'wing'),
    I('sticky',      'Sticky Hands',        'Lick your palms first. Trust us. +15% climb speed.',                'mobility', 'common',  35, 4, 'climbMul', 0.15, null, 'hand'),
    I('airdash',     'Air Dash',            'Physics called. We hung up. Dash mid-air.',                         'mobility', 'rare',  1100, 1, 'airDash', true, { item: 'doublejump', lvl: 1 }, 'dash'),
    I('buttstomp',   'Butt Stomp',          'Weaponized sitting. Down + jump in the air to SLAM.',               'mobility', 'rare',   750, 1, 'stomp', true, null, 'butt'),

    // ---------------- ECONOMY ----------------
    I('magnet',      'Gold Magnet',         'Coins simply cannot resist your personality.',                      'economy', 'common',  30, 5, 'magnet', 40, null, 'magnet'),
    I('greedy',      'Greedy Pockets',      'More gold per gold. Economics! +8% gold.',                          'economy', 'common',  80, 6, 'goldMul', 0.08, null, 'coin'),
    I('goldtoilet',  'Golden Toilet',       'An investment. In a toilet. +20% gold.',                            'economy', 'epic',  3000, 2, 'goldMul', 0.20, { item: 'greedy', lvl: 6 }, 'coin'),
    I('lucky',       'Lucky Crates',        'More loot, fewer spiders. +6% crate luck.',                          'economy', 'common',  55, 5, 'luck', 0.06, null, 'crate'),
    I('loyalty',     'Loyalty Card',        'Buy 9 upgrades, the 10th is... slightly cheaper. -4% prices.',      'economy', 'rare',   400, 5, 'discount', 0.04, null, 'card'),

    // ---------------- POWER-UP PERKS ----------------
    I('warranty',    'Weapon Warranty',     'Bro died? His gun is still under warranty. 50% keep chance.',       'perks', 'rare',   600, 2, 'keepPowerup', 0.5, null, 'wrench'),
    I('starterkit',  'Starter Kit',         'A little something from the gun drawer at level start. Lv2 = MEGA.', 'perks', 'rare',  800, 2, 'startPowerup', 1, null, 'gift'),
    I('overwhelming','Power Overwhelming',  'Pickups sometimes arrive pre-MEGA\'d. +15% chance.',                'perks', 'epic',  2000, 3, 'megaPickups', 0.15, { bosses: 3 }, 'mega'),

    // ---------------- SILLY (cosmetic toggles) ----------------
    I('partyhats',   'Party Hats',          'Every enemy is at a party. It\'s their own funeral.',               'silly', 'common',  25, 1, 'partyHats', true, null, 'hat'),
    I('bigheads',    'Big Head Mode',       'Science has gone too far. Wonderful.',                              'silly', 'common',  75, 1, 'bigHeads', true, null, 'head'),
    I('kazoo',       'Kazoo Fanfare',       'Every kill gets a tiny, triumphant kazoo.',                         'silly', 'common',  50, 1, 'kazoo', true, null, 'kazoo'),
    I('loudmouth',   'Loud Mouth',          'COMIC WORDS. BUT LOUDER.',                                          'silly', 'common',  60, 1, 'loudWords', true, null, 'mouth'),
    I('michaelbay',  'Michael Bay Mode',    'Every explosion gets a second, slightly bigger explosion.',         'silly', 'common', 150, 1, 'bay', true, null, 'boom'),

    // ---------------- LEGENDARY (beat a boss) ----------------
    I('frostbite',   'Frostbite Rounds',    'Bullets sometimes turn goons into popsicles.',                      'legendary', 'legendary',  9000, 1, 'frostRounds', true, { boss: 'ice' }, 'ice'),
    I('napalmrounds','Napalm Rounds',       'Everything you shoot is now also on fire. You\'re welcome.',        'legendary', 'legendary',  9000, 1, 'burnRounds', true, { boss: 'fire' }, 'fire'),
    I('jetboots',    'Jet Boots',           'Hold jump to hover. Smells faintly of leaf blower.',                'legendary', 'legendary', 12000, 1, 'hover', true, { boss: 'wind' }, 'wind'),
    I('sharkdrone',  'Pet Shark Drone',     'A flying shark that shoots stuff. His name is Gary.',               'legendary', 'legendary', 15000, 1, 'sharkDrone', true, { boss: 'water' }, 'shark'),
    I('mudskin',     'Mudskin',             'A crust of bog. Take 25% less damage. Smell 300% worse.',           'legendary', 'legendary', 15000, 1, 'dmgReduce', 0.25, { boss: 'mud' }, 'mud'),
    I('bananamines', 'Banana Mines',        'Melee drops a banana. Goons slip. Then it explodes.',               'legendary', 'legendary', 12000, 1, 'bananaMines', true, { boss: 'jungle' }, 'banana'),
    I('avalanche',   'Avalanche Charge',    'Hold melee, release, become a boulder.',                            'legendary', 'legendary', 18000, 1, 'charge', true, { boss: 'mountain' }, 'rock'),
    I('cowbuddy',    'Cow Companion',       'A loyal cow follows you. Moos at danger. Headbutts it.',            'legendary', 'legendary', 20000, 1, 'cowBuddy', true, { boss: 'plains' }, 'cow'),
    I('dragonshells','Dragon\'s Breath Shells', 'Your DOOSH now breathes fire. Every shotgun. Always.',          'legendary', 'legendary', 22000, 1, 'dragonShells', true, { boss: 'fantasy' }, 'dragon'),
    I('moonboots',   'Moon Boots',          'Floaty low-grav jumps. One small step for bro.',                    'legendary', 'legendary', 18000, 1, 'moonBoots', true, { boss: 'moon' }, 'moon'),
    I('extralife8',  '8-Bit Extra Life',    'A sixth bro, made of pixels. He goes "bloop".',                     'legendary', 'legendary', 25000, 1, 'extraDude', 1, { boss: 'retro' }, 'pixel'),
    I('bigdoosh',    'THE BIG DOOSH',       'A shotgun so big it has its own weather.',                          'legendary', 'legendary', 40000, 1, 'bigDoosh', true, { bosses: 11 }, 'doosh'),
    I('goldengun',   'Golden Gun',          'One shot. One kill. One extremely shiny gun.',                      'legendary', 'legendary', 50000, 1, 'goldenGun', true, { boss: 'fortress' }, 'gold')
  ];

  const byId = {};
  for (const it of items) byId[it.id] = it;

  // Every key from DESIGN §13. Multipliers start at 1, everything else 0/false.
  const MUL_KEYS = ['dmgMul', 'rateMul', 'blastMul', 'speedMul', 'jumpMul', 'climbMul', 'goldMul'];
  const BOOL_KEYS = ['doubleJump', 'airDash', 'stomp', 'partyHats', 'bay', 'bigHeads', 'kazoo', 'loudWords',
    'frostRounds', 'burnRounds', 'hover', 'sharkDrone', 'bananaMines', 'charge', 'cowBuddy', 'dragonShells',
    'moonBoots', 'bigDoosh', 'goldenGun'];
  const NUM_KEYS = ['maxHp', 'armor', 'regen', 'extraLives', 'secondWind', 'specials', 'crit', 'ricochet', 'superAmmo',
    'magnet', 'luck', 'discount', 'keepPowerup', 'startPowerup', 'megaPickups', 'dmgReduce', 'extraDude'];
  const KEYS = NUM_KEYS.concat(MUL_KEYS, BOOL_KEYS);
  const CAPS = { crit: 0.6, luck: 0.6, discount: 0.3, keepPowerup: 1, megaPickups: 0.6, dmgReduce: 0.6 };

  // ---------- save access (guarded so the module works without SGS.Save, e.g. in Node) ----------
  const mem = { gold: 0, upgrades: {}, beaten: {}, shopOff: {} };
  function data() {
    const sv = S.Save && S.Save.data;
    const d = sv || mem;
    if (!d.upgrades || typeof d.upgrades !== 'object') d.upgrades = {};
    if (!d.beaten || typeof d.beaten !== 'object') d.beaten = {};
    if (typeof d.gold !== 'number' || !isFinite(d.gold)) d.gold = 0;
    return d;
  }
  // Cosmetic toggles live inside upgrades under a reserved key so they persist with the profile
  // even if Save.load() only keeps known top-level keys.
  function offMap() {
    const up = data().upgrades;
    if (!up._off || typeof up._off !== 'object') up._off = {};
    return up._off;
  }
  function persist() { if (S.Save && typeof S.Save.save === 'function') { try { S.Save.save(); } catch (e) { /* ignore */ } } }

  function round5(x) { return Math.max(5, Math.round(x / 5) * 5); }
  function get(id) { return byId[id] || null; }
  function level(id) {
    const v = data().upgrades[id];
    return (typeof v === 'number' && v > 0) ? Math.floor(v) : 0;
  }
  function maxed(id) { const it = byId[id]; return !it || level(id) >= it.maxLevel; }
  function bossesBeaten() { const b = data().beaten; let n = 0; for (const t of MAIN_THEMES) if (b[t]) n++; return n; }
  function bossName(themeId) {
    const d = S.BossDefs && S.BossDefs[themeId];
    return (d && d.name) || BOSS_NAMES[themeId] || themeId;
  }

  function unlocked(id) {
    const it = byId[id]; if (!it) return false;
    const u = it.unlock; if (!u) return true;
    if (level(id) > 0) return true; // already owned stays unlocked
    if (u.item) return level(u.item) >= (u.lvl || 1);
    if (u.boss) return !!data().beaten[u.boss];
    if (u.bosses) return bossesBeaten() >= u.bosses;
    return true;
  }
  function lockText(id) {
    const it = byId[id]; if (!it || unlocked(id)) return '';
    const u = it.unlock;
    if (u.item) { const r = byId[u.item]; return 'Needs ' + (r ? r.name : u.item) + (r && r.maxLevel > 1 ? ' Lv ' + u.lvl : ''); }
    if (u.boss) return 'Beat ' + bossName(u.boss) + ' to unlock';
    if (u.bosses >= 11) return 'Beat all 11 bosses to unlock';
    if (u.bosses) return 'Beat ' + u.bosses + ' boss' + (u.bosses > 1 ? 'es' : '') + ' to unlock';
    return 'Locked';
  }

  function discountNow() { return Math.min(CAPS.discount, level('loyalty') * byId.loyalty.per); }
  // Price of the NEXT level (DESIGN §9: round5(base * growth^n)), then Loyalty Card discount.
  function basePrice(id, lvl) {
    const it = byId[id]; if (!it) return Infinity;
    const n = (lvl == null) ? level(id) : lvl;
    const raw = it.tier === 'legendary' ? it.base : it.base * Math.pow(it.growth, n);
    return round5(raw);
  }
  function price(id, lvl) {
    const p = basePrice(id, lvl);
    if (!isFinite(p)) return p;
    const d = discountNow();
    return d > 0 ? round5(p * (1 - d)) : p;
  }
  function whyNot(id) {
    const it = byId[id]; if (!it) return 'unknown';
    if (maxed(id)) return 'maxed';
    if (!unlocked(id)) return 'locked';
    if (data().gold < price(id)) return 'gold';
    return null;
  }
  function canBuy(id) { return whyNot(id) === null; }
  function buy(id) {
    if (!canBuy(id)) return false;
    const d = data(), p = price(id);
    d.gold = Math.max(0, d.gold - p);
    d.upgrades[id] = level(id) + 1;
    if (d.stats && typeof d.stats === 'object') d.stats.spent = (d.stats.spent || 0) + p;
    persist();
    return true;
  }
  function isToggle(id) { const it = byId[id]; return !!(it && it.cat === 'silly'); }
  function enabled(id) { return level(id) > 0 && !offMap()[id]; }
  function setEnabled(id, on) {
    if (!isToggle(id) || level(id) <= 0) return false;
    const m = offMap(); if (on) delete m[id]; else m[id] = true;
    persist();
    return true;
  }
  function toggle(id) { return setEnabled(id, !enabled(id)) && enabled(id); }

  function blank() {
    const o = {};
    for (const k of NUM_KEYS) o[k] = 0;
    for (const k of MUL_KEYS) o[k] = 1;
    for (const k of BOOL_KEYS) o[k] = false;
    return o;
  }
  function stats() {
    const o = blank();
    let d; try { d = data(); } catch (e) { return o; }
    if (!d) return o;
    const off = offMap();
    for (const it of items) {
      const n = level(it.id); if (n <= 0) continue;
      if (it.cat === 'silly' && off[it.id]) continue;
      const k = it.stat;
      if (it.per === true) o[k] = true;
      else o[k] = Math.round((o[k] + it.per * Math.min(n, it.maxLevel)) * 1000) / 1000;
    }
    for (const k in CAPS) if (typeof o[k] === 'number') o[k] = Math.min(CAPS[k], o[k]);
    return o;
  }

  // Human readable "what the next level does" for cards.
  const FMT = {
    maxHp: v => '+' + v + ' heart', armor: v => '+' + v + ' armor', regen: v => '+' + (v * 60).toFixed(1) + ' hp/min',
    extraLives: v => '+' + v + ' respawn', secondWind: v => '+' + v + ' save', specials: v => '+' + v + ' special',
    crit: v => '+' + Math.round(v * 100) + '% crit', ricochet: v => '+' + v + ' bounce', superAmmo: v => '+' + v + ' ammo',
    magnet: v => '+' + v + 'px pull', luck: v => '+' + Math.round(v * 100) + '% luck', discount: v => '-' + Math.round(v * 100) + '% prices',
    keepPowerup: v => '+' + Math.round(v * 100) + '% keep', startPowerup: v => 'tier +' + v, megaPickups: v => '+' + Math.round(v * 100) + '% MEGA',
    dmgReduce: v => '-' + Math.round(v * 100) + '% damage taken', extraDude: v => '+' + v + ' bro'
  };
  function effectText(id) {
    const it = byId[id]; if (!it) return '';
    if (it.per === true) return it.cat === 'silly' ? 'Cosmetic (toggle)' : 'Unlocks ability';
    if (MUL_KEYS.indexOf(it.stat) >= 0) return '+' + Math.round(it.per * 100) + '% per level';
    const f = FMT[it.stat];
    return f ? f(it.per) + (it.maxLevel > 1 ? ' per level' : '') : '';
  }
  function totalTo(id, upTo) { // total cost from current level to upTo (for tests / UI)
    let s = 0; const it = byId[id]; if (!it) return 0;
    for (let n = level(id); n < Math.min(upTo, it.maxLevel); n++) s += price(id, n);
    return s;
  }
  function byCat(cat) { return items.filter(it => it.cat === cat); }
  function ownedCount() { let n = 0; for (const it of items) if (level(it.id) > 0) n++; return n; }

  S.Shop = {
    items, CATS, TIERS, KEYS, BOSS_NAMES,
    get, level, maxed, unlocked, lockText, price, basePrice, canBuy, whyNot, buy, stats,
    isToggle, enabled, setEnabled, toggle, effectText, byCat, ownedCount, bossesBeaten, totalTo, round5,
    gold: () => data().gold
  };
})();
