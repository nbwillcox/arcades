/* Constants, arenas and the saved settings. */
(function (G) {
  'use strict';
  const C = {
    W: 960,
    H: 540,
    REPO: 'https://github.com/nbwillcox/SpaceJoust',
    START_LIVES: 3,
    EXTRA_LIFE: 20000,
    LAVA_Y: 500,                                              /* the surface of the lava */
    GRAB_Y: 462,                                              /* fly lower than this over the lava and the hand grabs you */
    GRAVITY: 820, MAX_FALL: 520,
    FLAP: 300, MAX_RISE: 340,                                 /* one flap adds this much upward speed, capped */
    BW: 30, BH: 40,                                           /* a rider and mount: width and height of the hit box */
    PLAT_H: 14,
    /* the arenas: platforms as [x, y, width]; they cycle by wave */
    ARENAS: [
      [[330, 455, 300], [40, 320, 200], [720, 320, 200], [350, 290, 260], [100, 160, 220], [640, 160, 220]],
      [[300, 450, 360], [0, 350, 150], [810, 350, 150], [190, 250, 200], [570, 250, 200], [380, 140, 200]],
      [[380, 455, 200], [60, 390, 200], [700, 390, 200], [250, 300, 180], [530, 300, 180], [0, 200, 180], [780, 200, 180], [390, 130, 180]],
      [[250, 455, 460], [90, 335, 160], [710, 335, 160], [350, 235, 260], [40, 140, 170], [750, 140, 170]],
      [[0, 440, 210], [260, 385, 170], [490, 325, 170], [720, 265, 170], [490, 160, 220], [90, 200, 230]],
      [[330, 455, 300], [0, 305, 270], [690, 305, 270], [330, 205, 300], [120, 110, 170], [670, 110, 170]],
    ],
    BOSS_ARENA: [[300, 455, 360], [0, 340, 190], [770, 340, 190], [370, 250, 220]],
    THEMES: [
      { rim: '#5ad0ff', glow: 'rgba(60,170,255,0.9)', hue: 215, lava: ['#ff5a1f', '#ffb347'] },
      { rim: '#ff7ad9', glow: 'rgba(255,100,210,0.9)', hue: 320, lava: ['#ff2f7a', '#ffb347'] },
      { rim: '#8dffb8', glow: 'rgba(60,255,150,0.9)', hue: 145, lava: ['#2fd36a', '#e8ff7a'] },
      { rim: '#e0a8ff', glow: 'rgba(190,90,255,0.9)', hue: 275, lava: ['#b04dff', '#ff9ad9'] },
      { rim: '#ffd27a', glow: 'rgba(255,170,40,0.9)', hue: 32, lava: ['#ff7a1f', '#fff27a'] },
      { rim: '#a0ffff', glow: 'rgba(40,230,230,0.9)', hue: 180, lava: ['#1fb0d0', '#a0ffff'] },
    ],
    TIERS: [
      { name: 'DRIFTER', col: '#ff5a5a', body: '#c0283a', pts: 500, speed: 150, flapRate: 2.4, aggr: 0.3 },
      { name: 'RAIDER', col: '#6a8cff', body: '#2a44b0', pts: 750, speed: 195, flapRate: 3.0, aggr: 0.65 },
      { name: 'WARLORD', col: '#ffd24a', body: '#8a5a10', pts: 1000, speed: 240, flapRate: 3.6, aggr: 1 },
    ],
    BOSSES: [
      { name: 'THE SKYHULK', col: '#ff5a3d' },
      { name: 'THE BROODMOTHER', col: '#ffd24a' },
      { name: 'THE STORMWING', col: '#b97aff' },
    ],
    /* the upgrade shop: id, name, description, max level, base price */
    UPGRADES: [
      { id: 'flap', name: 'STRONG WINGS', desc: 'Each flap lifts you higher', max: 4, price: 90 },
      { id: 'speed', name: 'TAILWIND', desc: 'Faster flight and running', max: 4, price: 90 },
      { id: 'lance', name: 'LONG LANCE', desc: 'Win closer jousts and ties', max: 3, price: 140 },
      { id: 'magnet', name: 'EGG MAGNET', desc: 'Pull in eggs from further away', max: 3, price: 110 },
      { id: 'timer', name: 'SLOW HATCH', desc: 'Eggs take longer to hatch', max: 3, price: 120 },
      { id: 'shield', name: 'AUTO SHIELD', desc: 'Start every wave with a shield', max: 2, price: 200 },
      { id: 'life', name: 'EXTRA RIDER', desc: 'One more life', max: 99, price: 420 },
    ],
  };

  const KEY = 'spacejoust.settings.v1';
  const defaults = { master: 0.8, music: 0.6, sfx: 0.9, bloom: true, shake: true, reduced: false };
  const S = Object.assign({}, defaults);
  let hadSaved = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { Object.assign(S, JSON.parse(raw)); hadSaved = true; }
  } catch (e) { /* storage unavailable */ }
  S.save = function () {
    try {
      const o = {};
      for (const k in defaults) o[k] = S[k];
      localStorage.setItem(KEY, JSON.stringify(o));
    } catch (e) { /* ignore */ }
  };
  if (!hadSaved && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) S.reduced = true;
  const qp = new URLSearchParams(location.search);
  G.debug = { level: parseInt(qp.get('level'), 10) || 0, god: qp.get('god') === '1' };
  G.C = C;
  G.settings = S;
})((window.SGS = window.SGS || {}));
