/* Permanent upgrade tracks bought in the between-wave shop. */
(function (G) {
  'use strict';
  const Up = {};
  G.up = Up;

  Up.DEFS = [
    { id: 'blast', name: 'Blast Radius', desc: 'Bigger interceptor explosions.', max: 5, costs: [40, 80, 140, 220, 320] },
    { id: 'speed', name: 'Missile Speed', desc: 'Interceptors fly faster.', max: 5, costs: [35, 70, 120, 190, 280] },
    { id: 'ammo', name: 'Ammo Capacity', desc: 'More interceptors per launcher.', max: 5, costs: [30, 60, 100, 160, 240] },
    { id: 'rate', name: 'Fire Rate', desc: 'Shorter delay between shots.', max: 5, costs: [40, 90, 150, 230, 330] },
    { id: 'cluster', name: 'Cluster Warheads', desc: 'Weapon 2: bursts into 3 / 5 / 7 blasts.', max: 3, costs: [90, 150, 240] },
    { id: 'flak', name: 'Flak Fields', desc: 'Weapon 3: blasts that linger 3 / 4.5 / 6 s.', max: 3, costs: [80, 140, 230] },
    { id: 'laser', name: 'Beam Laser', desc: 'Weapon 4: hold to sweep a beam; uses energy, not ammo.', max: 3, costs: [150, 250, 380] },
    { id: 'nuke', name: 'Ultimate Nuke', desc: 'Charges as you score; Space / right-click fires it.', max: 3, costs: [200, 320, 480] },
    { id: 'shield', name: 'Dome Shields', desc: 'Cities and launchers absorb 1 / 2 / 3 hits per wave.', max: 3, costs: [60, 120, 200] },
    { id: 'auto', name: 'Auto-Turrets', desc: 'Launchers shoot down threats on their own.', max: 4, costs: [90, 150, 230, 330] },
  ];

  Up.fresh = () => { const o = {}; for (const d of Up.DEFS) o[d.id] = 0; return o; };
  Up.def = (id) => Up.DEFS.find((d) => d.id === id);

  Up.stats = function (up) {
    return {
      blastR: 36 + 7 * up.blast,
      speed: 470 * (1 + 0.14 * up.speed),
      ammoMax: [10, 12, 14, 17, 20, 24][up.ammo],
      cooldown: [0.3, 0.22, 0.16, 0.12, 0.09, 0.07][up.rate],
      clusterN: [0, 3, 5, 7][up.cluster],
      flakTime: [0, 3, 4.5, 6][up.flak],
      laser: up.laser > 0,
      laserDrain: 42 - 5 * up.laser,
      nukeGain: up.nuke > 0 ? 1.4 + 0.5 * up.nuke : 0,
      shieldHits: up.shield,
      autoEvery: [0, 6, 4.5, 3, 2][up.auto],
    };
  };

  Up.cost = function (g, id) {
    const d = Up.def(id), lv = g.up[id];
    return lv >= d.max ? null : d.costs[lv];
  };

  Up.buy = function (g, id) {
    const c = Up.cost(g, id);
    if (c === null || g.credits < c) return false;
    g.credits -= c;
    g.up[id]++;
    const st = Up.stats(g.up);
    if (id === 'ammo') for (const l of g.launchers) if (l.alive) l.ammo = st.ammoMax;
    if (id === 'shield') for (const s of g.launchers.concat(g.cities)) if (s.alive) s.shield = st.shieldHits;
    if (id === 'nuke' && g.up.nuke === 1) g.nuke = Math.max(g.nuke, 40);
    return true;
  };
})((window.SGS = window.SGS || {}));
