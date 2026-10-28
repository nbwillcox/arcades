/* The six races. Each `build` lays its track with the turtle builder and returns a frozen level (world + path + traps + enemies). Times were set from a bot run (tests/run.js) with slack for a human. */
(function (G) {
  'use strict';
  const C = G.C, S = C.S, Builder = G.Builder;
  const L = [];

  /* ---- shared pieces ---- */
  function goalPad(b, len, w) {
    b.strip(len || 4, { w: w || 5, surf: S.GOAL, capEnd: true, mat: 1 });
    for (const c of b.segCells(0, b.seg.len, -20, 20)) b.goalCells.push(c);
  }
  function startPad(b, len, w) {
    b.strip(len, { w, surf: S.START, capStart: true, mat: 1 });
    b.start = b.on(Math.min(len - 1.5, len * 0.6), 0);
    b.start.z = b.seg.z0;
  }
  const at = (b, t, c) => b.on(t, c || 0);
  const timeGem = (b, t, c, secs) => { const p = at(b, t, c); b.gem('time', p.x, p.y, secs ? { secs } : {}); };
  const gem = (b, t, c) => { const p = at(b, t, c); b.gem('gem', p.x, p.y); };
  const orb = (b, t, c) => { const p = at(b, t, c); b.foe('orb', p.x, p.y); };
  const patrolAlong = (b, t0, t1, c) => [at(b, t0, c), at(b, t1, c)].map((p) => ({ x: p.x, y: p.y }));
  const muncher = (b, t, c, t0, t1, o) => { const p = at(b, t, c); b.foe('muncher', p.x, p.y, Object.assign({ patrol: t0 === undefined ? null : patrolAlong(b, t0, t1, c), range: 6 }, o)); };
  const coil = (b, t, c, t0, t1, o) => { const p = at(b, t, c); b.foe('coil', p.x, p.y, Object.assign({ patrol: patrolAlong(b, t0, t1, c) }, o)); };
  const vacuum = (b, t, c, t0, t1, o) => { const p = at(b, t, c); b.foe('vacuum', p.x, p.y, Object.assign({ patrol: t0 === undefined ? null : patrolAlong(b, t0, t1, c) }, o)); };
  function laserGate(b, t, o) { const s = b.seg, half = s.w / 2 - 0.3, p1 = at(b, t, -half), p2 = at(b, t, half); b.h('laser', Object.assign({ x: p1.x, y: p1.y, x2: p2.x, y2: p2.y, z: p1.z }, o)); }
  function crusher(b, t, len, o) { const s = b.seg, r = b.rect(t, t + len, -s.w / 2, s.w / 2); b.h('crusher', Object.assign({ x: r.x, y: r.y, w: r.w, h: r.h }, o)); }
  function spikes(b, t, len, o) { b.h('spikes', Object.assign({ cells: b.segCells(t, t + len) }, o)); }
  function bumper(b, t, c) { const p = at(b, t, c); b.h('bumper', { x: p.x, y: p.y, r: 0.42 }); }
  function mine(b, t, c) { const p = at(b, t, c); b.h('mine', { x: p.x, y: p.y }); }
  function sweeper(b, t, c, o) { const p = at(b, t, c); b.h('sweeper', Object.assign({ x: p.x, y: p.y }, o)); }
  function turret(b, t, c, dir, o) { const p = at(b, t, c); b.h('turret', Object.assign({ x: p.x, y: p.y, dir }, o)); }
  function gate(b, t0, t1, o) { b.paint(t0, t1, -20, 20, { mat: 3 }); b.h('gate', Object.assign({ cells: b.segCells(t0, t1) }, o)); }
  function lift(b, t0, t1, c0, c1, o) { b.paint(t0, t1, c0, c1, { mat: 4 }); b.h('lift', Object.assign({ cells: b.segCells(t0, t1, c0, c1) }, o)); }

  /* ======================================================================== 1. PRACTICE RACE */
  L.push({
    id: 1, name: 'PRACTICE RACE', sub: 'Launch Deck', time: 60, par: 26, seed: 11, music: 0,
    theme: { hue: 212, accent: '#37b6ff', accent2: '#ff3dd0', lamp: '#8fe4ff' },
    build() {
      const b = new Builder(this.theme);
      b.setPos(0, 0.5, 0, 11);
      startPad(b, 6, 5);
      b.width(3);
      b.ramp(8, -2.2);
      b.flat(3);
      b.right();
      b.flat(4);
      b.ramp(7, -2.2);
      timeGem(b, 3.5, 0);
      b.flat(2);
      b.left();
      b.flat(3);
      /* the wide hairpin */
      b.width(5);
      b.flat(5); gem(b, 2.5, 0);
      b.right(); b.flat(2); b.right();
      b.flat(5);
      b.width(3);
      b.ramp(6, -1.6);
      b.flat(3);
      /* a hill: the marble carries its speed up the far side */
      b.ramp(8, -2.4);
      b.ramp(5, 0.9);
      b.flat(3); gem(b, 1.5, 0);
      /* a narrow lane with rails */
      b.width(2);
      b.flat(9); gem(b, 4.5, 0);
      b.width(3);
      b.stairs(4, 0.4, 3);
      b.flat(2);
      b.left();
      b.flat(3);
      b.right();
      b.flat(3);
      b.left();
      b.flat(2);
      b.ramp(8, -1.6);
      timeGem(b, 4, 0);
      b.flat(3);
      b.width(5);
      goalPad(b, 5, 5);
      return b.finish(this);
    },
  });

  /* ======================================================================== 2. BEGINNER RACE */
  L.push({
    id: 2, name: 'BEGINNER RACE', sub: 'Crystal Reach', time: 70, par: 34, seed: 23, music: 1,
    theme: { hue: 285, accent: '#c06aff', accent2: '#37e6ff', lamp: '#e2a8ff' },
    build() {
      const b = new Builder(this.theme);
      b.setPos(0, 0.5, 0, 12);
      startPad(b, 6, 5);
      b.width(3);
      b.ramp(10, -3.0);
      b.flat(3);
      b.right();
      b.flat(7); orb(b, 5, 0);
      b.ramp(6, -1.5);
      timeGem(b, 3, 0);
      b.left();
      b.flat(3);
      /* collapsing floor */
      b.strip(8, { surf: S.CRUMBLE });
      gem(b, 4, 0);
      b.flat(2);
      /* the first jump: speed down the ramp, leap the gap */
      b.ramp(10, -3.0);
      b.flat(2);
      b.ramp(3, 1.2);
      b.gap(3, -0.6);
      b.strip(6, { capStart: false });
      b.right();
      b.width(2);
      b.flat(10, { rails: false }); gem(b, 5, 0);
      b.width(5);
      b.flat(4);
      /* bumper field */
      b.flat(8); bumper(b, 2.5, -1.2); bumper(b, 4.5, 1.2); bumper(b, 6.5, -1.2);
      timeGem(b, 7.5, 0);
      b.width(3);
      b.flat(2);
      b.left();
      b.flat(4); orb(b, 3, 0);
      b.stairs(3, 0.45, 3);
      b.ramp(6, -1.5);
      b.flat(2);
      b.right();
      b.ramp(8, -1.8);
      b.flat(2);
      /* a muncher guards the second half: hit it fast to flatten it */
      b.width(5);
      b.flat(8); muncher(b, 5, 0, 3, 7);
      b.width(3);
      b.flat(2);
      b.left();
      b.strip(7, { surf: S.ICE }); gem(b, 3, 0);
      b.flat(2);
      b.ramp(11, -3.4);
      b.flat(2);
      b.ramp(3, 1.2);
      b.gap(3, -0.6);
      b.strip(5);
      b.right();
      b.flat(2);
      b.ramp(8, -1.8);
      timeGem(b, 4, 0);
      b.flat(3);
      b.width(5);
      goalPad(b, 5, 5);
      return b.finish(this);
    },
  });

  /* ======================================================================== 3. INTERMEDIATE RACE */
  L.push({
    id: 3, name: 'INTERMEDIATE RACE', sub: 'Frost Foundry', time: 95, par: 52, seed: 37, music: 2,
    theme: { hue: 172, accent: '#35f0d0', accent2: '#ffd24a', lamp: '#a8fff0' },
    build() {
      const b = new Builder(this.theme);
      b.setPos(0, 0.5, 0, 13);
      startPad(b, 6, 5);
      b.width(3);
      b.ramp(10, -3.2);
      b.flat(3);
      b.right();
      /* sheet ice before a corner */
      b.strip(9, { surf: S.ICE });
      b.flat(3);
      b.left();
      b.flat(5); muncher(b, 3, 0, 1.5, 4);
      timeGem(b, 4, 0);
      b.ramp(7, -1.6);
      b.flat(3);
      /* laser gates */
      b.flat(9); laserGate(b, 3, { period: 3.2, on: 1.1, phase: 0 }); laserGate(b, 7, { period: 3.2, on: 1.1, phase: 1.6 });
      b.flat(2);
      b.right();
      b.width(5);
      b.flat(8);
      /* acid pool across the middle with a side lane */
      b.paint(2, 7, -1.5, 1.5, { surf: S.ACID }); gem(b, 4.5, -2);
      b.width(3);
      b.flat(2);
      b.left();
      b.flat(3);
      b.stairs(4, 0.45, 3);
      b.flat(2);
      /* a glass bridge: roll gently, speed shatters it */
      b.strip(8, { surf: S.GLASS }); gem(b, 4, 0);
      b.flat(2);
      /* the press */
      b.flat(8); crusher(b, 3, 2, { period: 3.6, phase: 0 });
      b.flat(2);
      b.right();
      b.flat(4); muncher(b, 2.5, 0);
      b.strip(7, { surf: S.ICE });
      timeGem(b, 3, 0);
      b.flat(2);
      b.left();
      b.ramp(7, -2.0);
      b.flat(3);
      /* spikes */
      b.flat(8); spikes(b, 3, 2, { period: 3, phase: 0 });
      b.flat(2);
      b.right();
      b.ramp(7, -1.8);
      b.flat(3);
      b.width(5);
      b.flat(6); coil(b, 3, 0, 1, 5);
      b.width(3);
      b.flat(2);
      b.left();
      b.ramp(7, -1.6);
      b.flat(3);
      b.width(5);
      goalPad(b, 5, 5);
      return b.finish(this);
    },
  });

  /* ======================================================================== 4. AERIAL RACE */
  L.push({
    id: 4, name: 'AERIAL RACE', sub: 'Skyrail', time: 80, par: 40, seed: 41, music: 3,
    theme: { hue: 132, accent: '#6dff7a', accent2: '#ff9a3d', lamp: '#b8ffbd' },
    build() {
      const b = new Builder(this.theme);
      b.setPos(0, 0.5, 0, 16);
      startPad(b, 6, 5);
      b.width(3);
      b.ramp(12, -4.2);
      b.flat(2);
      b.ramp(3, 1.2);
      b.gap(3, -0.8);
      b.strip(6);
      b.right();
      /* narrow rail with a turret */
      b.width(2);
      b.flat(12, { rails: false }); turret(b, 6, 0, 0, { period: 2.6 });
      b.width(3);
      b.flat(3); timeGem(b, 1.5, 0);
      b.ramp(10, -3.6);
      b.flat(2);
      b.ramp(3, 1.5);
      b.gap(4, -1.0);
      b.strip(5);
      b.left();
      b.width(7);
      b.flat(9); vacuum(b, 5, 0, 1.5, 7.5);
      b.width(3);
      b.flat(2);
      b.right();
      b.flat(3);
      b.width(5);
      b.flat(9); mine(b, 3, -1.4); mine(b, 5.5, 1.4); mine(b, 7.8, -1.4);
      b.width(3);
      b.flat(3);
      /* a glass runway */
      b.strip(8, { surf: S.GLASS }); gem(b, 4, 0);
      b.flat(2);
      b.ramp(12, -4.6);
      b.flat(2);
      b.ramp(3, 1.8);
      b.gap(5, -1.5);
      b.strip(5, { w: 5 });
      b.left();
      b.flat(2); b.ramp(6, -1.6);
      b.flat(2);
      b.width(5);
      goalPad(b, 5, 5);
      return b.finish(this);
    },
  });

  /* ======================================================================== 5. SILLY RACE */
  L.push({
    id: 5, name: 'SILLY RACE', sub: 'Pinball Garden', time: 75, par: 36, seed: 53, music: 4,
    theme: { hue: 38, accent: '#ffb347', accent2: '#ff3dd0', lamp: '#ffe0a8' },
    build() {
      const b = new Builder(this.theme);
      b.setPos(0, 0.5, 0, 14);
      startPad(b, 6, 5);
      b.width(3);
      b.ramp(9, -2.6);
      b.flat(2);
      /* conveyor against you, then with you */
      b.strip(8, { surf: S.CONVEY, aux: 2 });
      b.flat(2);
      b.right();
      b.strip(7, { surf: S.CONVEY });
      timeGem(b, 3, 0);
      b.left();
      /* sticky goo, then a pinball field */
      b.flat(3);
      b.paint(0, 3, -20, 20, { surf: S.GOO });
      b.width(5);
      b.flat(8); bumper(b, 2, -1.5); bumper(b, 4, 1.5); bumper(b, 6, -1.5);
      b.width(3);
      b.flat(2);
      b.right();
      b.flat(3);
      /* sweeper platform */
      b.width(7);
      b.flat(9); sweeper(b, 4.5, 0, { len: 2.5, speed: 1.5, arms: 2 });
      b.width(3);
      b.flat(2);
      b.left();
      b.ramp(8, -2.4);
      b.flat(2);
      /* opening and closing gates */
      b.flat(9); gate(b, 3, 4, { period: 3.4, phase: 0, openFrac: 0.55 }); gate(b, 6, 7, { period: 3.4, phase: 1.7, openFrac: 0.55 });
      b.flat(2);
      b.right();
      b.ramp(6, -1.8);
      b.flat(3);
      b.paint(0, 3, -20, 20, { surf: S.GOO });
      b.strip(5, { surf: S.BOOST });
      b.flat(4);
      b.stairs(3, 0.45, 3);
      b.left();
      b.flat(2);
      /* a trampoline: the pad throws you over a crumbling stretch */
      b.strip(2, { surf: S.BOUNCE });
      b.strip(6, { surf: S.CRUMBLE }); gem(b, 3, 0);
      b.flat(3);
      b.ramp(7, -1.4);
      b.flat(3);
      b.width(5);
      b.flat(6); bumper(b, 1.6, -1.4); bumper(b, 3.2, 1.4); bumper(b, 4.8, -1.4);
      b.width(3);
      b.flat(2);
      b.right();
      b.ramp(6, -1.4);
      b.flat(2);
      b.width(5);
      goalPad(b, 5, 5);
      return b.finish(this);
    },
  });

  /* ======================================================================== 6. ULTIMATE RACE */
  L.push({
    id: 6, name: 'ULTIMATE RACE', sub: 'Event Horizon', time: 110, par: 62, seed: 67, music: 5,
    theme: { hue: 335, accent: '#ff4a8d', accent2: '#37e6ff', lamp: '#ffb0cf' },
    build() {
      const b = new Builder(this.theme);
      b.setPos(0, 0.5, 0, 18);
      startPad(b, 6, 5);
      b.width(3);
      b.ramp(11, -3.6);
      b.flat(2);
      b.strip(8, { surf: S.CRUMBLE }); orb(b, 5, 0);
      b.flat(3);
      b.right();
      b.flat(9); laserGate(b, 3, { period: 2.8, on: 1.0, phase: 0 }); crusher(b, 6.5, 2, { period: 3.2, phase: 0.8 });
      b.flat(2);
      b.left();
      b.width(2);
      b.flat(9, { rails: false }); turret(b, 6, 0, 0, { period: 2.2 });
      b.width(5);
      b.flat(8); mine(b, 2.5, -1.4); mine(b, 4.5, 1.4); mine(b, 6.5, -1.4);
      b.width(3);
      b.flat(3);
      b.ramp(11, -3.8);
      b.flat(2);
      b.ramp(3, 1.5);
      b.gap(4, -1.0);
      b.strip(5, { w: 5 });
      b.right();
      b.width(5);
      b.flat(8); vacuum(b, 4, 0, 1.5, 6.5);
      b.width(3);
      b.strip(6, { surf: S.ICE }); spikes(b, 2, 2, { period: 2.6, phase: 1 });
      b.flat(2);
      b.left();
      b.flat(8); crusher(b, 2, 2, { period: 3.0, phase: 0 }); crusher(b, 5.5, 2, { period: 3.0, phase: 1.5 });
      b.flat(2);
      /* glass again, with an orb on it */
      b.strip(7, { surf: S.GLASS }); orb(b, 3, 0);
      b.flat(2);
      b.ramp(12, -4.4);
      b.flat(2);
      b.ramp(3, 1.8);
      b.gap(5, -1.5);
      b.strip(4);
      b.right();
      b.flat(9); coil(b, 4.5, 0, 2, 7);
      b.flat(3);
      b.ramp(8, -2.0);
      b.flat(2);
      b.width(5);
      goalPad(b, 5, 5);
      return b.finish(this);
    },
  });

  G.LEVELS = L;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));
