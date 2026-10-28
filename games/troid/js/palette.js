/* The master palette: 5-step ramps (dark -> light) with hue-shifted shadows (cool) and highlights (warm), plus the letter keys used by every hand-authored sprite grid. */
(function (G) {
  'use strict';
  const P = {};
  G.pal = P;
  P.ramps = {
    cobalt: ['#10142e', '#1b2c66', '#2b4fa4', '#5688dc', '#a6ccff'],
    crimson: ['#2a0812', '#6a1224', '#b02a34', '#ec5c4a', '#ffb89c'],
    teal: ['#062a2e', '#0e5a62', '#1a948c', '#4cd2b8', '#b8ffe6'],
    gold: ['#2e1a0c', '#6b3d14', '#b87c1e', '#efba42', '#fff2a8'],
    visor: ['#2a0832', '#7a1472', '#d42c98', '#ff7ac6', '#ffe2f4'],
    under: ['#0a0c1c', '#181c36', '#2a3158', '#444f82', '#6672a8'],
    metal: ['#14172c', '#2e3452', '#5a658a', '#98a6ca', '#dde7fb'],
    energy: ['#06304c', '#146e94', '#2cbad8', '#86f0f2', '#f2ffff'],
  };
  /* zone-1 world ramps (Crash Site): cool violet stone, warm-lit moss, earth, dusk-fog sky */
  P.ramps.stone = ['#10142a', '#1f2744', '#33405e', '#52627a', '#7f8c96', '#b4b8ae'];
  P.ramps.moss = ['#0a2216', '#124028', '#1f6a34', '#4a9a3c', '#8cc84e', '#d4ee86'];
  P.ramps.earth = ['#1c1220', '#38202a', '#5c3a34', '#8a5a40', '#b88454'];
  P.ramps.fog = ['#0a0e2c', '#141a46', '#222c68', '#364488', '#566cac', '#8ea2d2'];
  P.ramps.dusk = ['#ffd9a0', '#f4a67c', '#d8688a'];
  /* world letters: stone 0-5, moss A-F, earth p q r t u, fog H I J K Q R, dusk W X Z, plus the sprite letters (gold, energy, metal, ...) */
  /* zone 2 (Cryo Vaults): icy blue stone, snow instead of moss, aurora sky */
  P.ramps.icestone = ['#0c1630', '#1a2a52', '#2e4678', '#4f72a6', '#86a8cc', '#c8e0ee'];
  P.ramps.snow = ['#1c3a68', '#3a64a0', '#6e9fd0', '#a8d4ee', '#dff4fc', '#ffffff'];
  P.ramps.iceearth = ['#101a38', '#22305c', '#3c5084', '#5a74a8', '#86a0c8'];
  P.ramps.aurora = ['#04122a', '#082444', '#0e3c5e', '#165a74', '#2a8a8a', '#58c8b0'];
  P.ramps.auroralight = ['#b6ffd8', '#60e0b8', '#b878ff'];
  /* zone 3 (Magma Forge): basalt, ember glow instead of moss, furnace sky */
  P.ramps.basalt = ['#140a12', '#2a1622', '#46283a', '#6a4056', '#946a78', '#c8a4a8'];
  P.ramps.ember = ['#3a0c10', '#7a2012', '#c04418', '#ee8428', '#ffc450', '#fff2b0'];
  P.ramps.slagearth = ['#1c0c12', '#3a1a20', '#5c2c2c', '#844030', '#b06a40'];
  P.ramps.furnace = ['#0e0410', '#240818', '#401020', '#681c1c', '#9a3a1a', '#d86a24'];
  P.ramps.smoke = ['#ffd890', '#f09040', '#c04830'];
  /* zone 4 (Drowned Reactor): teal steel, coolant glow instead of moss, deep-sea sky */
  P.ramps.reactor = ['#0a1418', '#142a30', '#244850', '#3c6c74', '#6a9aa0', '#aee0e0'];
  P.ramps.coolant = ['#082830', '#105058', '#1c8488', '#38c0b0', '#80f0d0', '#d8fff0'];
  P.ramps.reactorearth = ['#0c1820', '#1c3038', '#305058', '#4c7478', '#78a4a8'];
  P.ramps.deepsea = ['#020a14', '#04182a', '#08304a', '#104c6c', '#1a7090', '#3aa4b8'];
  P.ramps.biolight = ['#c8fff0', '#58e8c8', '#38a0e8'];
  /* zone 5 (Hive Core): chitin and flesh, bioluminescent green-yellow instead of moss, throbbing magenta sky */
  P.ramps.chitin = ['#180816', '#321430', '#58244a', '#80386a', '#b05c90', '#e0a0c0'];
  P.ramps.biogreen = ['#142a10', '#2a5a1c', '#4c9a2c', '#88d04a', '#c8f078', '#f4ffc0'];
  P.ramps.hiveearth = ['#1c0818', '#3a1230', '#5c2250', '#80386c', '#a85c8c'];
  P.ramps.hivefog = ['#10040e', '#240a1c', '#40102c', '#661a40', '#922858', '#c83c74'];
  P.ramps.hivelight = ['#ffd0f0', '#ff80c8', '#a860ff'];
  const ZONE_RAMPS = { 5: ['biogreen', 'chitin', 'hiveearth', 'hivefog', 'hivelight'], 1: ['moss', 'stone', 'earth', 'fog', 'dusk'], 2: ['snow', 'icestone', 'iceearth', 'aurora', 'auroralight'], 3: ['ember', 'basalt', 'slagearth', 'furnace', 'smoke'], 4: ['coolant', 'reactor', 'reactorearth', 'deepsea', 'biolight'] };
  P.worldKeys = function (zone) {
    const R = P.ramps, k = P.keys('cobalt'), Z = ZONE_RAMPS[zone || 1];
    'ABCDEF'.split('').forEach((c, i) => { k[c] = R[Z[0]][i]; });
    '012345'.split('').forEach((c, i) => { k[c] = R[Z[1]][i]; });
    'pqrtu'.split('').forEach((c, i) => { k[c] = R[Z[2]][i]; });
    'HIJKQR'.split('').forEach((c, i) => { k[c] = R[Z[3]][i]; });
    const d = R[Z[4]]; k.W = d[0]; k.X = d[1]; k.Z = d[2];
    return k;
  };
  /* letter -> hex for sprite grids ('.' is transparent) */
  P.keys = function (armor) {
    if (armor === 'world') return P.worldKeys(1);
    if (armor === 'world2') return P.worldKeys(2);
    if (armor === 'world3') return P.worldKeys(3);
    if (armor === 'world4') return P.worldKeys(4);
    if (armor === 'world5') return P.worldKeys(5);
    const R = P.ramps, A = R[armor || 'cobalt'], k = {};
    k.o = A[0]; k['1'] = A[1]; k['2'] = A[2]; k['3'] = A[3]; k['4'] = A[4];
    k.s = R.gold[0]; k.k = R.gold[1]; k.y = R.gold[2]; k.Y = R.gold[3]; k.w = R.gold[4];
    k.x = R.visor[1]; k.v = R.visor[2]; k.V = R.visor[3]; k.W = R.visor[4]; k.q = R.visor[0];
    k.U = R.under[1]; k.u = R.under[2]; k.n = R.under[3]; k.N = R.under[4]; k.b = R.under[0];
    k.z = R.metal[0]; k.M = R.metal[1]; k.m = R.metal[2]; k.l = R.metal[3]; k.L = R.metal[4];
    k.d = R.energy[0]; k.g = R.energy[1]; k.e = R.energy[2]; k.E = R.energy[3]; k.h = R.energy[4];
    'ABCDF'.split('').forEach((c, i) => { k[c] = R.moss[i < 4 ? i : 5]; });   /* moss greens for creature sprites; E stays the energy glow */
    return k;
  };
})((window.SGS = window.SGS || {}));
