/* Game state + simulation: rider, papers, scoring, traffic, dogs, hazards, pickups, day / course / boss flow. Rendering lives in render.js. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U, S = G.settings, I = G.input, W = G.world;
  const A = () => G.audio;
  const Game = { phase: 'idle', t: 0, score: 0, lives: 3, week: 1, day: 1, subs: 6, streak: 0, bot: false, god: false, route: null, fx: { pops: [], parts: [], shake: 0, flash: 0 }, cam: { x: 0, z: 0 }, over: null };
  G.game = Game;
  const P = (Game.p = {});
  const dmOf = () => ({ cozy: 0.7, normal: 1, hard: 1.35 }[S.difficulty] || 1);
  const sfx = (n, a, b) => { const au = G.audio; if (au && au.sfx && au.sfx[n]) au.sfx[n](a, b); };

  Game.mult = () => 1 + Math.min(4, Math.floor(Game.streak / 3));
  Game.addScore = function (n, x, z, y, txt, col) {
    const v = Math.round(n * Game.mult());
    const before = Game.score; Game.score += v;
    if (Math.floor(Game.score / 40000) > Math.floor(before / 40000) || (before < 15000 && Game.score >= 15000)) { Game.lives = Math.min(9, Game.lives + 1); Game.pop(P.x, P.z, 40, '1UP!', '#7dff9e'); sfx('oneup'); }
    if (x !== undefined) Game.pop(x, z, y || 20, (txt ? txt + ' ' : '') + '+' + v, col || '#ffe45a');
    return v;
  };
  Game.pop = (x, z, y, txt, col) => { if (Game.fx.pops.length < 40) Game.fx.pops.push({ x, z, y, txt, col: col || '#fff', t: 0 }); };
  Game.burst = function (x, z, y, n, col, spd, up) {
    const a = Game.fx.parts, k = S.reduced ? 0.4 : 1;
    for (let i = 0; i < n * k && a.length < 260; i++) { const an = Math.random() * 6.283, s = (0.3 + Math.random()) * (spd || 60); a.push({ x, z, y, vx: Math.cos(an) * s, vz: Math.sin(an) * s, vy: (up || 50) * (0.4 + Math.random()), t: 0, life: 0.5 + Math.random() * 0.5, col: col || '#fff', sz: 1.5 + Math.random() * 2 }); }
  };
  Game.hit = (m) => { Game.fx.shake = Math.max(Game.fx.shake, m); };

  /* ---------- run / day setup ---------- */
  Game.reset = function (idle) {
    Game.score = 0; Game.lives = S.difficulty === 'cozy' ? 5 : 3; Game.week = 1; Game.day = 1; Game.subs = 6; Game.streak = 0; Game.stats = { delivered: 0, windows: 0 };
    Game.over = null; Game.tally = null;
    if (idle) { Game.phase = 'idle'; Game.setRoute(W.route(1, 1, 8, { diff: S.difficulty })); Game.spawnPlayer(); Game.cam.z = 30; return; }
  };
  Game.spawnPlayer = function () {
    Object.assign(P, { x: 0, z: Game.route.start, y: 0, vy: 0, vx: 0, speed: C.CRUISE, crash: 0, inv: 0, lean: 0, throwT: 0, throwSide: 1, hopT: 0, slip: 0, papers: Game.route.papers || 12, pw: { speed: 0, omni: 0, shield: 0, inf: 0 }, air: 0, stun: 0, anim: 0, abduct: 0, ramps: 0, dying: false, ramp: 0 });
    Game.cars = []; Game.papersL = []; Game.haz = []; Game.crossT = {}; Game.meteorT = 3; Game.fx.pops.length = 0; Game.fx.parts.length = 0; Game.boss = null; Game.cd = 0;
  };
  Game.setRoute = function (R) {
    Game.route = R;
    for (const a of ['houses', 'deco', 'pickups', 'dogs', 'movers', 'ufos']) R[a].forEach((o) => { o.dead = o.dead || 0; });
    R.pickups.forEach((p) => { p.taken = 0; });
  };
  Game.beginDay = function (skipIntro) {
    const R = W.route(Game.day, Game.week, Game.subs, { diff: S.difficulty });
    Game.setRoute(R); Game.spawnPlayer();
    Game.dayStats = { delivered: 0, cancelled: 0, windows: 0, start: Game.score };
    Game.phase = skipIntro ? 'ride' : 'intro'; Game.t = 0;
    Game.cam.z = P.z + 30; Game.cam.x = 0;
    if (!skipIntro) G.audio && G.audio.music && G.audio.music('intro');
  };
  Game.beginCourse = function () {
    Game.setRoute(W.course(Game.day, Game.week)); Game.spawnPlayer();
    Game.cs = { targets: 0, hoops: 0, pts: 0, crashes: 0 };
    Game.phase = 'coursein'; Game.t = 0; Game.cam.z = P.z + 30;
    G.audio && G.audio.music && G.audio.music('course');
  };
  Game.beginBoss = function () {
    Game.setRoute(W.arena(Game.day, Game.week)); Game.spawnPlayer();
    P.papers = 99; Game.phase = 'bossin'; Game.t = 0; Game.cam.z = P.z + 30;
    Game.boss = G.boss.make(Game.route.boss, Game.week);
    G.audio && G.audio.music && G.audio.music('boss');
  };
  Game.start = function (opts) {
    opts = opts || {};
    Game.reset(false);
    Game.day = opts.day || 1; Game.week = opts.week || 1; Game.god = !!opts.god; Game.bot = !!opts.bot;
    Game.beginDay(!!opts.skip);
    if (opts.phase === 'course') Game.beginCourse();
    if (opts.phase === 'boss') Game.beginBoss();
    if (opts.phase === 'ride') { Game.phase = 'ride'; }
  };

  /* ---------- scoring helpers ---------- */
  function houseDeliver(h, kind, pts, x, z, y, label) {
    if (h.cancelled) return;
    if (kind === 'mail') { if (h.mailHit) return; h.mailHit = true; h.mailbox.flag = true; } else { if (h.porchHit) return; h.porchHit = true; }
    const first = !h.delivered; h.delivered = true; h.happy = 2.2;
    Game.addScore(pts, x, z, y, label, '#7dff9e');
    if (first) { Game.dayStats.delivered++; Game.stats.delivered++; Game.pop(h.zc ? h.side * C.WALL : x, h.zc, 60, 'DELIVERED!', '#7dff9e'); sfx('deliver'); }
    return true;
  }
  function cancelHouse(h, why) {
    if (h.cancelled) return;
    h.cancelled = true; h.mood = 2.5; Game.dayStats.cancelled++;
    Game.score = Math.max(0, Game.score - 250);
    Game.pop(h.side * C.WALL, h.zc, 62, why || 'CANCELLED! -250', '#ff5a5a'); sfx('cancel'); Game.streak = 0;
  }

  /* ---------- throwing ---------- */
  function throwPaper(side) {
    if (P.crash > 0 || P.stun > 0) return;
    if (P.papers <= 0 && !(P.pw.inf > 0)) { sfx('empty'); return; }
    if (!(P.pw.inf > 0)) P.papers--;
    P.throwT = 0.28; P.throwSide = side || 1; sfx('throw');
    const batch = { n: 0, scored: false, side };
    const mk = (ang, dz, spd, vyk) => {
      const vx = Math.cos(ang) * C.TV * spd, vz = Math.sin(ang) * C.TV * spd;  /* straight out to the side: no forward carry */
      Game.papersL.push({ x: P.x, z: P.z + dz, y: 14 + P.y, vx, vz, vy: C.TVY * (vyk || 1) + P.y * 0.2, spin: Math.random() * 6, life: 4, batch, dead: 0, bounce: 0 });
      batch.n++;
    };
    if (P.pw.omni > 0) { for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; mk(a, 0, a % Math.PI === 0 ? 1 : 0.75); } }
    else {
      const a = side > 0 ? 0 : Math.PI;
      mk(a, 0, 1);
    }
    Game.batches = (Game.batches || []); Game.batches.push(batch);
  }
  Game.autoSide = function () {
    const R = Game.route; let best = 0, bd = 1e9;
    for (const h of R.houses) {
      if (!h.sub || h.delivered || h.cancelled) continue;
      const dz = h.zc - P.z; if (dz < -30 || dz > 60) continue;
      const d = Math.abs(dz); if (d < bd) { bd = d; best = h.side; }
    }
    if (!best) {
      for (const h of R.houses) { if (h.sub) continue; const dz = h.zc - P.z; if (dz < -20 || dz > 100) continue; const d = Math.abs(dz); if (d < bd) { bd = d; best = h.side; } }
    }
    if (!best && Game.route.kind === 'course') { for (const o of Game.route.deco) if (o.t === 'target' && !o.hit && o.z > P.z - 20 && o.z < P.z + 120) { best = o.side; break; } }
    return best || (P.x > 0 ? -1 : 1);
  };

  /* ---------- crash ---------- */
  Game.crash = function (why, soft) {
    if (P.crash > 0 || P.inv > 0 || Game.god) return;
    if (P.pw.shield > 0) return;
    P.crash = soft ? 0.9 : 1.5; P.speed = 0; P.vy = 90; P.y = Math.max(P.y, 0.1); P.lean = 0; Game.streak = 0;
    Game.hit(8); sfx('crash'); Game.burst(P.x, P.z, 10, 14, '#ffd24a', 80, 80);
    Game.pop(P.x, P.z, 40, why || 'OUCH!', '#ff7a5a');
    if (Game.route.kind === 'course' || soft) { Game.cs && Game.cs.crashes++; return; }
    Game.lives--; P.dying = Game.lives <= 0;
  };

  /* ---------- paper update ---------- */
  function endPaper(p) { p.dead = 1; const b = p.batch; if (b) { b.n--; if (b.n <= 0 && !b.scored) { Game.streak = 0; } } }
  function paperScore(p, pts, x, z, y, txt, col) { p.batch.scored = true; Game.streak++; return Game.addScore(pts, x, z, y, txt, col); }
  Game.paperScore = paperScore;

  function updatePaper(p, dt) {
    const R = Game.route, ox = p.x, oz = p.z, oy = p.y;
    p.life -= dt; p.spin += dt * 14;
    p.vy -= C.G * dt; p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt;
    if (p.life <= 0) return endPaper(p);
    /* houses + mailboxes + doors + windows */
    for (const h of R.houses) {
      if (h.z0 - 60 > p.z) break;
      if (h.z1 + 60 < p.z) continue;
      if (Math.sign(p.x) !== h.side && Math.abs(p.x) > 6) continue;
      const mb = h.mailbox;
      if (!mb.hit2 && Math.abs(p.x - mb.x) < 8 && Math.abs(p.z - mb.z) < 9 && p.y < 26 && p.y > 0) {
        mb.hit = 1; mb.hit2 = 1;
        if (h.sub && !h.cancelled) { if (houseDeliver(h, 'mail', C.SCORE.mailbox, mb.x, mb.z, 24, 'MAILBOX')) { paperScore(p, 0); sfx('mail'); } }
        else if (!h.sub) { paperScore(p, C.SCORE.nsMail, mb.x, mb.z, 24, 'DING'); sfx('mail'); }
        endPaper(p); return;
      }
      const wx = h.side * C.WALL;
      if ((ox - wx) * (p.x - wx) <= 0 && Math.abs(ox) <= Math.abs(wx) && p.z >= h.z0 && p.z <= h.z1) {
        let done = false;
        for (const w of h.windows) {
          if (w.broken || Math.abs(p.z - w.z) > w.w / 2 + 3 || p.y < w.y0 - 2 || p.y > w.y1 + 2) continue;
          w.broken = 1; done = true; sfx('glass'); Game.hit(5); Game.burst(wx, w.z, (w.y0 + w.y1) / 2, 18, '#bff3ff', 70, 60);
          Game.dayStats.windows++; Game.stats.windows++;
          if (h.sub) { cancelHouse(h, 'OOPS! CANCELLED -250'); h.face = 2.5; }
          else { paperScore(p, C.SCORE.window, wx, w.z, w.y1 + 6, 'SMASH'); h.face = 2.2; h.mood = 0; }
          break;
        }
        if (!done && Math.abs(p.z - h.door.z) < 8 && p.y < 32) {
          h.door.hit = 1; done = true; sfx('knock');
          if (h.sub && !h.cancelled) { if (houseDeliver(h, 'porch', 150, wx, h.door.z, 30, 'DOOR')) paperScore(p, 0); }
          else if (!h.sub) paperScore(p, C.SCORE.door, wx, h.door.z, 30, 'KNOCK');
        }
        endPaper(p); if (!done) { sfx('thud'); } return;
      }
    }
    /* creatures + props */
    for (const dg of R.dogs) {
      if (dg.dead || Math.abs(dg.z - p.z) > 12) continue;
      if (Math.abs(dg.x - p.x) < 10 && p.y < 18) { dg.stun = 3.2; dg.state = 'stunned'; paperScore(p, C.SCORE.dog, dg.x, dg.z, 22, 'BONK'); sfx('yelp'); Game.burst(dg.x, dg.z, 10, 8, '#ffe45a', 50, 50); endPaper(p); return; }
    }
    for (const o of R.deco) {
      if (o.z > p.z + 30) break;
      if (o.dead || Math.abs(o.z - p.z) > 26) continue;
      if (o.t === 'gnome' && Math.abs(o.x - p.x) < 9 && Math.abs(o.z - p.z) < 9 && p.y < 16) { o.dead = 1; Game.burst(o.x, o.z, 8, 14, '#ff6a4a', 70, 60); paperScore(p, C.SCORE.gnome, o.x, o.z, 14, 'GNOME'); sfx('smash'); endPaper(p); return; }
      if (o.t === 'parked' && Math.abs(o.x - p.x) < 14 && Math.abs(o.z - p.z) < 20 && p.y < 14) { o.hit = 1.2; paperScore(p, C.SCORE.car, o.x, o.z, 14, 'HONK'); sfx('honk'); endPaper(p); return; }
      if (o.t === 'target' && !o.hit && (ox - o.x) * (p.x - o.x) <= 0 && Math.abs(p.z - o.z) < o.r) {
        const d = Math.hypot(p.z - o.z, p.y - 20); if (d < o.r + 3) {
          o.hit = 1; const pts = d < 5 ? 300 : d < 10 ? 200 : 100; Game.cs.targets++; Game.cs.pts += pts; paperScore(p, pts, o.x, o.z, 36, d < 5 ? 'BULLSEYE' : 'HIT'); sfx('target'); Game.burst(o.x, o.z, 20, 10, '#ffe45a', 60, 50); endPaper(p); return;
        }
      }
    }
    for (const m of R.movers) {
      if (m.dead || Math.abs(m.z - p.z) > 14) continue;
      if (Math.abs(m.x - p.x) < 10 && p.y < 18) { m.dead = 1; if (m.t === 'skater') { paperScore(p, C.SCORE.kid, m.x, m.z, 20, 'TUMBLE'); sfx('yelp'); } else { m.dead = 0; m.stun = 2; paperScore(p, 25, m.x, m.z, 20, 'CLANG'); } Game.burst(m.x, m.z, 10, 8, '#fff', 60, 50); endPaper(p); return; }
    }
    for (const u of R.ufos) {
      if (u.dead) continue;
      if (Math.abs(u.x - p.x) < 20 && Math.abs(u.z - p.z) < 20 && p.y > 26 && p.y < 82) { u.dead = 1; Game.burst(u.x, u.z, u.y, 30, '#9dffea', 110, 90); Game.hit(8); paperScore(p, C.SCORE.ufo, u.x, u.z, u.y + 16, 'UFO DOWN'); sfx('boom'); endPaper(p); return; }
    }
    for (const c of Game.cars) {
      if (c.dead) continue;
      const hx = c.cross ? c.len / 2 : c.wid / 2, hz = c.cross ? c.wid / 2 : c.len / 2;
      if (Math.abs(p.x - c.x) < hx + 2 && Math.abs(p.z - c.z) < hz + 2 && p.y < c.h + 2) { c.honk = 0.8; sfx('honk'); paperScore(p, C.SCORE.car, c.x, c.z, 14, 'BOINK'); p.vx *= -0.3; p.vz *= 0.3; p.vy = 20; p.bounce = 9; p.life = Math.min(p.life, 0.6); return; }
    }
    if (Game.boss && G.boss.hit(Game.boss, p)) { endPaper(p); return; }
    /* ground */
    if (p.y <= 0 && p.vy < 0) {
      p.y = 0; let scored = false;
      for (const h of R.houses) {
        if (!h.sub || h.cancelled || Math.abs(h.zc - p.z) > 30 || Math.sign(p.x) !== h.side) continue;
        const ax = Math.abs(p.x), dz = Math.abs(p.z - h.zc);
        if (ax > C.WALL - 24 && ax < C.WALL - 4 && dz < 11) { if (houseDeliver(h, 'porch', C.SCORE.porch, p.x, p.z, 8, 'WELCOME MAT')) paperScore(p, 0); scored = true; sfx('mat'); }
        else if (ax > C.WALL - 44 && ax < C.WALL - 1 && dz < 26) { if (houseDeliver(h, 'porch', C.SCORE.patio, p.x, p.z, 8, 'PATIO')) paperScore(p, 0); scored = true; sfx('mat'); }
        if (!scored && Math.abs(p.x - h.mailbox.x) < 10 && Math.abs(p.z - h.mailbox.z) < 10) { if (houseDeliver(h, 'mail', C.SCORE.mailbox, p.x, p.z, 8, 'MAILBOX')) paperScore(p, 0); scored = true; }
        if (scored) break;
      }
      if (!scored) {
        for (const h of R.houses) { if (h.sub || Math.abs(h.mailbox.z - p.z) > 12) continue; if (Math.abs(p.x - h.mailbox.x) < 9 && Math.abs(p.z - h.mailbox.z) < 9) { paperScore(p, C.SCORE.nsMail, p.x, p.z, 8, 'DING'); scored = true; break; } }
      }
      if (Game.boss === null && R.kind === 'course') {
        for (const o of R.deco) if (o.t === 'hoop') {/* nothing */}
      }
      if (!scored && p.vy < -40 && !p.landed) { p.landed = 1; p.vy *= -0.25; p.vx *= 0.4; p.vz *= 0.5; sfx('thud'); return; }
      p.rest = 1.2; p.vx = p.vz = p.vy = 0; if (!p.batchDone) { p.batchDone = 1; endPaper(p); p.dead = 0; p.settle = 1.0; }
      return;
    }
    if (p.rest) { p.rest -= dt; if (p.rest <= 0) p.dead = 1; }
  }

  /* ---------- traffic, hazards ---------- */
  function spawnTraffic(dt) {
    const R = Game.route; if (R.kind !== 'route') return;
    const rate = (0.22 + R.d * 0.07) * dmOf();
    Game.carT = (Game.carT || 0) - dt;
    if (Game.carT <= 0) {
      Game.carT = (1.2 + Math.random() * 2.0) / rate;
      const oncoming = Math.random() < 0.55;
      const type = Math.random() < 0.18 ? 'bus' : Math.random() < 0.3 ? 'van' : 'car';
      const c = { x: oncoming ? -(5 + Math.random() * 36) : (5 + Math.random() * 36), z: P.z + 540, vz: oncoming ? -(55 + Math.random() * 25 + R.d * 4) : 26 + Math.random() * 16, wid: type === 'bus' ? 17 : 13, len: type === 'bus' ? 38 : type === 'van' ? 26 : 22, h: type === 'bus' ? 16 : 10, hue: U.pick([0, 20, 45, 120, 180, 210, 270, 320]), type, honk: 0, dead: 0 };
      if (!oncoming) c.z = P.z - 70;
      if (oncoming || c.vz < P.speed) Game.cars.push(c);
    }
    for (const o of R.deco) {
      if (o.t !== 'crossroad' || o.z > P.z + 420 || o.z1 < P.z - 40) continue;
      const k = o.z; Game.crossT[k] = (Game.crossT[k] || 0) - dt;
      if (Game.crossT[k] <= 0) { Game.crossT[k] = (1.1 + Math.random() * 1.6) / (0.8 + R.d * 0.12) / dmOf(); const dir = Math.random() < 0.5 ? 1 : -1; Game.cars.push({ cross: true, x: -dir * 250, z: o.z + 22 + Math.random() * 56, vx: dir * (120 + Math.random() * 40), vz: 0, wid: 13, len: 24, h: 10, hue: U.pick([0, 45, 120, 210, 320]), type: 'car', honk: 0, dead: 0 }); }
    }
  }
  function updateCars(dt) {
    for (const c of Game.cars) {
      if (c.cross) c.x += c.vx * dt; else c.z += c.vz * dt;
      c.honk = Math.max(0, c.honk - dt);
      if (!c.honked && Math.abs(c.z - P.z) < 90 && Math.abs(c.x - P.x) < 30 && !c.cross && c.vz < 0) { c.honked = 1; c.honk = 0.6; sfx('honk'); }
      if (c.dead) continue;
      if (P.crash <= 0 && P.inv <= 0 && P.y < c.h) {
        const hx = c.cross ? c.len / 2 : c.wid / 2, hz = c.cross ? c.wid / 2 : c.len / 2;
        if (Math.abs(P.x - c.x) < hx + 4 && Math.abs(P.z - c.z) < hz + 4) {
          if (P.pw.shield > 0) { c.dead = 1; c.fly = 1; Game.addScore(200, c.x, c.z, 20, 'SMASH'); sfx('boom'); Game.hit(7); Game.burst(c.x, c.z, 10, 18, '#ffd24a', 90, 80); }
          else Game.crash('CRASH!');
        }
      }
    }
    Game.cars = Game.cars.filter((c) => (c.cross ? Math.abs(c.x) < 300 : c.z > P.z - 160 && c.z < P.z + 700) && !(c.dead && (c.fly = (c.fly || 1) + dt) > 2.5));
  }

  function nearSolid(o, r) { return Math.abs(P.x - o.x) < o.r + r && Math.abs(P.z - o.z) < o.r + r; }
  function updateWorld(dt) {
    const R = Game.route;
    /* lawn / street decorations hitting the rider */
    for (const o of R.deco) {
      if (o.z > P.z + 40) break;
      if (o.z < P.z - 40 && !(o.z1 && o.z1 > P.z - 20)) continue;
      if (o.dead) continue;
      switch (o.t) {
        case 'tree': case 'trash': case 'hydrant': case 'cone': case 'gnome':
          if (P.y < 10 && nearSolid(o, 4) && P.crash <= 0) {
            if (P.pw.shield > 0 || (P.pw.speed > 0)) { o.dead = 1; Game.addScore(50, o.x, o.z, 14, 'SMASH'); sfx('smash'); Game.burst(o.x, o.z, 8, 12, '#ffd24a', 70, 60); }
            else if (R.kind === 'course') { o.dead = 1; Game.crash('TRIP!', true); } else Game.crash(o.t === 'gnome' ? 'GNOMED!' : 'CRASH!');
          }
          break;
        case 'fence': if (P.y < 12 && Math.abs(P.x - o.x) < 7 && P.z > o.z - 4 && P.z < o.z1 + 4) { P.x = o.x + Math.sign(P.x - o.x || 1) * 8; P.speed *= 0.7; } break;
        case 'parked': if (P.y < 12 && Math.abs(P.x - o.x) < 16 && Math.abs(P.z - o.z) < 19 && P.crash <= 0) { if (P.pw.shield > 0) { o.dead = 1; Game.burst(o.x, o.z, 10, 14, '#ffd24a', 80, 70); Game.addScore(200, o.x, o.z, 14, 'SMASH'); sfx('boom'); } else Game.crash('CRASH!'); } break;
        case 'pothole': if (P.y < 6 && P.crash <= 0 && Math.abs(P.x - o.x) < o.r - 1 && Math.abs(P.z - o.z) < o.r - 1) { P.speed *= 0.4; Game.crash('BLACK HOLE!', true); } break;
        case 'sprinkler': if (Math.abs(P.x - o.x) < o.r && Math.abs(P.z - o.z) < o.r) P.slip = 0.6; break;
        case 'ramp': if (!o.used && P.y < 4 && Math.abs(P.x - o.x) < o.r && Math.abs(P.z - o.z) < 10) { o.used = 1; P.vy = 150; P.air = 1; P.ramp = 1; Game.addScore(C.SCORE.ramp, o.x, o.z, 30, 'STUNT'); sfx('ramp'); } break;
        case 'bar': if (P.y < 11 && Math.abs(P.z - o.z) < 4 && P.crash <= 0) { Game.crash('BONK!', true); o.z -= 99999; } break;
        case 'hoop': if (!o.hit && Math.abs(P.z - o.z) < 7 && Math.abs(P.x - o.x) < o.r - 3 && Math.abs(P.y + 8 - o.y) < 18) { o.hit = 1; Game.cs.hoops++; Game.cs.pts += C.SCORE.hoop; Game.streak += 2; Game.addScore(C.SCORE.hoop, o.x, o.z, o.y + 10, 'HOOP'); sfx('hoop'); Game.burst(o.x, o.z, o.y, 16, '#7dffff', 70, 70); } break;
      }
    }
    for (const dg of R.dogs) updateDog(dg, dt);
    for (const m of R.movers) updateMover(m, dt);
    for (const u of R.ufos) updateUfo(u, dt);
    for (const o of R.deco) { if (o.hit > 0) o.hit = Math.max(0, o.hit - dt); }
    for (const h of R.houses) { h.happy = Math.max(0, h.happy - dt); h.mood = Math.max(0, h.mood - dt); h.face = Math.max(0, h.face - dt); }
    /* meteors */
    if (R.kind === 'route' && (R.day >= 5 || R.week > 1)) {
      Game.meteorT -= dt;
      if (Game.meteorT <= 0) { Game.meteorT = (5.5 - Math.min(2, R.d * 0.3)) / dmOf() + Math.random() * 3; Game.haz.push({ t: 'meteor', x: (Math.random() - 0.5) * 150, z: P.z + 60 + Math.random() * 190, r: 15, tm: 1.3, y: 0 }); }
    }
    for (const hz of Game.haz) updateHaz(hz, dt);
    Game.haz = Game.haz.filter((h) => !h.gone);
    /* pickups */
    for (const k of R.pickups) {
      if (k.taken || Math.abs(k.z - P.z) > 14 || Math.abs(k.x - P.x) > 14 || P.y > 18 || P.crash > 0) continue;
      k.taken = 1; sfx('pickup');
      if (k.t === 'bundle') { P.papers = Math.min(60, P.papers + k.n); Game.pop(k.x, k.z, 24, '+' + k.n + ' PAPERS', '#fff'); Game.addScore(C.SCORE.bundle); }
      else if (k.t === 'up') { Game.lives = Math.min(9, Game.lives + 1); Game.pop(k.x, k.z, 30, '1UP!', '#7dff9e'); sfx('oneup'); }
      else { P.pw[k.k] = ({ speed: 8, omni: 12, shield: 10, inf: 12 }[k.k]) * (S.difficulty === 'cozy' ? 1.4 : 1); Game.pop(k.x, k.z, 30, G.POWER[k.k].name, G.POWER[k.k].col); sfx('power'); Game.addScore(100); }
      Game.burst(k.x, k.z, 12, 10, '#fff', 60, 60);
    }
  }
  G.POWER = { speed: { name: 'SUPER SPEED', col: '#ff9a3d', ico: 'S' }, omni: { name: 'OMNI TOSS', col: '#ff5ad0', ico: 'O' }, shield: { name: 'INVINCIBLE', col: '#5ad0ff', ico: 'I' }, inf: { name: 'INFINITE PAPERS', col: '#7dff9e', ico: '8' } };

  function updateDog(d, dt) {
    if (d.dead) return;
    d.anim += dt * 10; d.bark = Math.max(0, d.bark - dt);
    const dzp = d.z - P.z;
    if (d.state === 'stunned') { d.stun -= dt; if (d.stun <= 0) d.state = 'return'; return; }
    if (d.cool > 0) d.cool -= dt;
    if (d.state === 'idle') { if (d.cool > 0) return; if (dzp < 110 && dzp > -20 && Math.abs(P.x - d.x) < 120 && P.crash <= 0) { d.state = 'chase'; d.bark = 0.5; sfx('bark', d.hue); } return; }
    const R = Game.route, sp = (44 + R.d * 8) * (S.difficulty === 'cozy' ? 0.8 : S.difficulty === 'hard' ? 1.2 : 1);
    let tx, tz;
    if (d.state === 'chase') { tx = P.x; tz = P.z; d.chaseT = (d.chaseT || 0) + dt; if (dzp < -35 || P.crash > 0 || d.chaseT > 4 || Math.abs(P.x - d.x) > 150) { d.state = 'return'; d.chaseT = 0; d.cool = 3; } }
    if (d.state === 'return') { tx = d.hx; tz = d.hz; if (Math.hypot(d.x - tx, d.z - tz) < 6) { d.state = 'idle'; } }
    const dx = tx - d.x, dz = tz - d.z, m = Math.hypot(dx, dz) || 1, s2 = d.state === 'chase' ? sp : 55;
    d.vx = dx / m * s2; d.vz = dz / m * s2; d.x += d.vx * dt; d.z += d.vz * dt;
    if (d.state === 'chase' && P.crash <= 0 && Math.abs(P.x - d.x) < 9 && Math.abs(P.z - d.z) < 9 && P.y < 10) {
      if (P.pw.shield > 0) { d.state = 'stunned'; d.stun = 3; Game.addScore(150, d.x, d.z, 20, 'ZOOM'); } else Game.crash('CHOMP!');
    }
  }
  function updateMover(m, dt) {
    if (m.dead) return; m.anim += dt * 8;
    if (m.stun > 0) { m.stun -= dt; return; }
    if (m.t === 'skater') { m.z += m.vz * dt; if (m.z < m.lo || m.z > m.hi) m.vz = -m.vz; }
    else { m.x += m.vx * dt; if (Math.abs(m.x) < m.lo || Math.abs(m.x) > m.hi) m.vx = -m.vx; }
    if (P.crash <= 0 && P.y < 10 && Math.abs(P.x - m.x) < m.r + 5 && Math.abs(P.z - m.z) < m.r + 5) {
      if (P.pw.shield > 0) { m.dead = 1; Game.addScore(150, m.x, m.z, 16, 'WHAM'); sfx('boom'); } else Game.crash(m.t === 'skater' ? 'SKATED!' : 'MOWED!');
    }
  }
  function updateUfo(u, dt) {
    if (u.dead) return; u.ph += dt;
    const dz = u.z - P.z; u.beam = dz < 150 && dz > -40 ? Math.min(1, u.beam + dt * 2) : Math.max(0, u.beam - dt * 2);
    if (u.beam > 0.9 && Math.abs(dz) < 26 && Math.abs(P.x - u.x) < 24 && P.y < 20 && P.crash <= 0) {
      P.x += Math.sign(u.x - P.x) * 38 * dt; P.abduct += dt; if (P.abduct > 1.5 && P.pw.shield <= 0) { P.abduct = 0; Game.crash('ABDUCTED!'); }
    } else if (P.abduct > 0) P.abduct = Math.max(0, P.abduct - dt);
  }
  function updateHaz(h, dt) {
    if (h.t === 'meteor') {
      h.tm -= dt;
      if (h.tm <= 0 && !h.boom) {
        h.boom = 0.5; Game.hit(10); sfx('boom'); Game.burst(h.x, h.z, 6, 24, '#ff9a3d', 110, 80);
        if (P.crash <= 0 && P.y < 14 && Math.hypot(P.x - h.x, P.z - h.z) < h.r + 4) Game.crash('METEOR!');
      }
      if (h.boom) { h.boom -= dt; if (h.boom <= 0) h.gone = 1; }
    } else if (G.boss) G.boss.hazard(h, dt);
  }

  /* ---------- frame update ---------- */
  Game.update = function (dt) {
    const F = Game.fx;
    for (const p of F.pops) p.t += dt; F.pops = F.pops.filter((p) => p.t < 1.4);
    for (const p of F.parts) { p.t += dt; p.x += p.vx * dt; p.z += p.vz * dt; p.vy -= 260 * dt; p.y += p.vy * dt; if (p.y < 0) { p.y = 0; p.vy *= -0.3; } } F.parts = F.parts.filter((p) => p.t < p.life);
    F.shake = Math.max(0, F.shake - dt * 30); F.flash = Math.max(0, F.flash - dt * 2);
    Game.t += dt;
    const ph = Game.phase;
    if (ph === 'idle') { P.z += 40 * dt; if (P.z > Game.route.end - 220) P.z = 40; P.x = Math.sin(Game.t * 0.6) * 30; P.vx = Math.cos(Game.t * 0.6) * 18; P.lean = P.vx / 128; P.speed = 40; Game.cam.z = P.z + 38; P.anim += dt; return; }
    if (ph === 'intro' || ph === 'coursein' || ph === 'bossin') {
      if (Game.t > 0.5 && (I.takeAny() || Game.bot || Game.t > 6)) { Game.phase = ph === 'intro' ? 'ride' : ph === 'coursein' ? 'course' : 'boss'; Game.t = 0; I.clear(); G.audio && G.audio.music && G.audio.music(ph === 'intro' ? 'route' : ph === 'coursein' ? 'course' : 'boss'); }
      return;
    }
    if (ph === 'routeend' || ph === 'courseend' || ph === 'bossend' || ph === 'weekend') { P.anim += dt; if (Game.t > 1.2 && (I.takeAny() || Game.bot && Game.t > 2.5)) Game.advance(); return; }
    if (ph === 'dead') { Game.tickPlayer(dt); if (Game.t > 2.2) { Game.phase = 'over'; if (Game.onOver) Game.onOver(); } return; }
    if (ph !== 'ride' && ph !== 'course' && ph !== 'boss') return;
    I.poll();
    if (Game.bot) G.bot && G.bot.drive(Game);
    Game.tickPlayer(dt);
    const R = Game.route;
    /* throws */
    if (I.take('_tl')) throwPaper(-1);
    if (I.take('_tr')) throwPaper(1);
    if (I.take('_ta')) throwPaper(Game.autoSide());
    for (const p of Game.papersL) if (!p.dead) { if (p.rest) { p.rest -= dt; if (p.rest <= 0) p.dead = 1; } else if (p.settle) { p.settle -= dt; if (p.settle <= 0) p.dead = 1; } else updatePaper(p, dt); }
    Game.papersL = Game.papersL.filter((p) => !p.dead);
    spawnTraffic(dt); updateCars(dt); updateWorld(dt);
    if (Game.boss) G.boss.update(Game.boss, Game, dt);
    /* end conditions */
    if (ph === 'dead') return;
    if (P.dying && P.crash < 0.9) { Game.phase = 'dead'; Game.t = 0; sfx('over'); return; }
    if (ph === 'ride' && P.z >= R.end) Game.endRoute();
    else if (ph === 'course' && P.z >= R.end) Game.endCourse();
    else if (ph === 'boss' && Game.boss && Game.boss.hp <= 0 && Game.boss.deadT > 2.4) Game.endBoss();
  };

  Game.tickPlayer = function (dt) {
    const R = Game.route; P.anim += dt;
    for (const k in P.pw) if (P.pw[k] > 0) P.pw[k] = Math.max(0, P.pw[k] - dt);
    P.throwT = Math.max(0, P.throwT - dt); P.inv = Math.max(0, P.inv - dt); P.slip = Math.max(0, P.slip - dt); P.stun = Math.max(0, P.stun - dt);
    if (P.crash > 0) {
      P.crash -= dt; P.vy -= 420 * dt; P.y += P.vy * dt; if (P.y < 0) { P.y = 0; P.vy = 0; }
      if (P.crash <= 0 && !P.dying) { /* get back up in a safe spot */
        P.inv = 2.2; P.speed = C.CRUISE * 0.7; P.x = U.clamp(P.x, -50, 50); P.vx = 0;
        Game.cars = Game.cars.filter((c) => c.cross || Math.abs(c.z - P.z) > 70 || Math.abs(c.x - P.x) > 30);
        for (const dg of R.dogs) if (dg.state === 'chase' && Math.abs(dg.z - P.z) < 80) dg.state = 'return';
      }
      return;
    }
    if (Game.phase === 'dead') return;
    const slow = I.ay < 0 ? C.SLOW : C.CRUISE, fastV = P.pw.speed > 0 ? C.SUPER : C.FAST;
    let target = I.ay > 0 ? C.CRUISE + (fastV - C.CRUISE) * I.ay : I.ay < 0 ? C.CRUISE + (C.SLOW - C.CRUISE) * -I.ay : C.CRUISE;
    if (P.pw.speed > 0) target = Math.max(target, C.SUPER * (I.ay < 0 ? 0.75 : 1));
    void slow;
    P.speed += (target - P.speed) * Math.min(1, dt * (P.pw.speed > 0 ? 3 : 2.4));
    const tvx = I.ax * 128 * (P.slip > 0 ? 0.3 : 1);
    P.vx += (tvx - P.vx) * Math.min(1, dt * (P.slip > 0 ? 2 : 9));
    P.x = U.clamp(P.x + P.vx * dt, -C.RIDE_MAX, C.RIDE_R);
    P.lean += (P.vx / 128 - P.lean) * Math.min(1, dt * 10);
    P.z += P.speed * dt;
    /* hop */
    if (I.take('_hop') && P.y <= 0.5 && Game.phase !== 'dead') { P.vy = 165; P.air = 0.01; sfx('hop'); }
    if (P.y > 0 || P.vy > 0) {
      P.vy -= (P.ramp ? 300 : 440) * dt; P.y += P.vy * dt; P.air += dt;
      if (P.y <= 0) { P.y = 0; P.vy = 0; if (P.air > 0.55 && R.kind !== 'idle') { sfx('land'); Game.burst(P.x, P.z, 0, 8, '#cfe', 40, 20); } P.air = 0; P.ramp = 0; }
    }
    if (P.y > 0) P.hopT += dt;
    /* house walls and platform bounds */
    for (const h of R.houses) { if (h.z0 - 10 > P.z) break; if (P.z > h.z0 - 4 && P.z < h.z1 + 4 && Math.abs(P.x) > C.WALL - 40 && Math.sign(P.x) === h.side) { P.x = h.side * (C.WALL - 40); P.vx = 0; } }
  };

  /* ---------- end of segments ---------- */
  Game.endRoute = function () {
    const R = Game.route; let missed = 0, ok = 0, cancelled = 0;
    for (const h of R.houses) { if (!h.sub) continue; if (h.cancelled) cancelled++; else if (h.delivered) ok++; else { missed++; h.cancelled = true; } }
    const total = R.subCount, perfect = ok === total;
    const bonus = ok * 100 + (perfect ? C.SCORE.perfect : 0) + Math.floor(P.papers * 10);
    Game.score += bonus;
    const winsDelta = perfect ? 2 : 0, newSubs = Math.max(2, ok + winsDelta + (missed || cancelled ? 0 : 0));
    Game.subs = newSubs;
    Game.tally = { title: C.DAYS[Game.day - 1] + ' ROUTE ' + (perfect ? 'PERFECT!' : 'COMPLETE'), lines: [['Delivered', ok + ' / ' + total], ['Cancelled (missed or smashed)', String(missed + cancelled)], ['Windows smashed', String(Game.dayStats.windows)], ['Papers left x10', String(Math.floor(P.papers * 10))], perfect ? ['PERFECT ROUTE', '+' + C.SCORE.perfect] : ['Delivery bonus', '+' + (ok * 100)], ['Subscribers tomorrow', String(newSubs) + (perfect ? '  (+2 new!)' : '')]], bonus };
    if (ok === 0) { Game.subs = 0; }
    Game.phase = 'routeend'; Game.t = 0; sfx(perfect ? 'fanfare' : 'jingle'); G.audio && G.audio.music && G.audio.music('stop');
    Game.fx.flash = 0.6;
  };
  Game.endCourse = function () {
    const cs = Game.cs, R = Game.route, all = cs.targets >= R.targets && cs.hoops >= R.hoops;
    const bonus = cs.pts * 0 + (all ? 2000 : 0) + (cs.crashes === 0 ? 500 : 0);
    Game.score += bonus;
    Game.tally = { title: 'TRAINING COURSE', lines: [['Targets hit', cs.targets + ' / ' + R.targets], ['Hoops cleared', cs.hoops + ' / ' + R.hoops], ['Course points', String(cs.pts)], ['Clean run bonus', cs.crashes === 0 ? '+500' : 'none'], all ? ['PERFECT COURSE', '+2000'] : ['Perfect course', 'miss one']], bonus };
    Game.phase = 'courseend'; Game.t = 0; sfx(all ? 'fanfare' : 'jingle'); G.audio && G.audio.music && G.audio.music('stop');
  };
  Game.endBoss = function () {
    const bonus = 5000 + Game.subs * 500 + Game.week * 1000;
    Game.score += bonus;
    Game.tally = { title: 'WEEK ' + Game.week + ' COMPLETE!', lines: [['Boss defeated', G.boss.NAMES[Game.route.boss]], ['Week bonus', '+5000'], ['Subscribers x500', '+' + Game.subs * 500], ['Week clear', '+' + Game.week * 1000], ['Next week', 'gets harder']], bonus };
    Game.phase = 'weekend'; Game.t = 0; sfx('fanfare'); Game.fx.flash = 0.8; G.audio && G.audio.music && G.audio.music('stop');
  };
  Game.advance = function () {
    I.clear();
    const ph = Game.phase;
    if (ph === 'routeend') {
      if (Game.subs <= 0) { Game.lives = 0; Game.phase = 'over'; Game.fired = true; if (Game.onOver) Game.onOver(); return; }
      if (Game.day === 7) Game.beginBoss(); else Game.beginCourse();
    } else if (ph === 'courseend') { Game.day++; Game.beginDay(); }
    else if (ph === 'bossend' || ph === 'weekend') { Game.week++; Game.day = 1; Game.subs = Math.max(6, Game.subs); Game.beginDay(); }
  };
})((window.SGS = window.SGS || {}));
