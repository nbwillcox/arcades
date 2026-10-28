/* The rules: the claw, shots, five kinds of climbers, spikes, power-up capsules, bosses, the warp between webs and the upgrade shop. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, A = G.audio, I = G.input, Wb = G.webs, Art = G.art;
  const G0 = G.debug || {};
  const pt = { x: 0, y: 0, s: 1 };

  const Game = {
    demo: true, phase: 'demo', time: 0, level: 1, score: 0, credits: 0, creditAcc: 0, lives: 3, web: null, p: null, enemies: [], bullets: [], caps: [], spikes: [], bolts: [], boss: null,
    queue: [], levelT: 0, nextLife: C.EXTRA_LIFE, up: {}, onOver: null, onShop: null, banner: '', bannerT: 0, warpT: 0, phaseT: 0, demoT: 0,
  };

  /* ---------- upgrades ---------- */
  const U_ = (id) => Game.up[id] || 0;
  const fireInt = () => [0.16, 0.145, 0.13, 0.115, 0.1, 0.088][U_('rate')] * (Game.p.pu.rapid > 0 ? 0.55 : 1);
  const maxShots = () => 4 + U_('shots') + (Game.p.pu.rapid > 0 ? 2 : 0);
  const moveInt = () => [0.085, 0.072, 0.062, 0.054, 0.047][U_('speed')];
  const pierceChance = () => [0, 0.15, 0.3, 0.5][U_('pierce')];
  const puDur = () => 12 + 4 * U_('power');
  const sl = () => Math.min(2.3, 1 + 0.05 * (Game.level - 1));

  Game.shopItems = function () {
    return C.UPGRADES.map((u) => {
      const lvl = U_(u.id), bought = Game.bought || 0;
      const price = u.id === 'life' ? u.price + 130 * (Game.lifeBought || 0) : Math.round(u.price * (1 + lvl * 0.9) / 10) * 10;
      return { id: u.id, name: u.name, desc: u.desc, have: u.id === 'life' ? Game.lives : lvl, max: u.id === 'life' ? 9 : u.max, price, life: u.id === 'life' };
    });
  };
  Game.buy = function (id) {
    const it = Game.shopItems().find((x) => x.id === id);
    if (!it || it.have >= it.max || Game.credits < it.price) return false;
    Game.credits -= it.price; Game.creditAcc = Math.min(Game.creditAcc, Game.credits);
    if (id === 'life') { Game.lives++; Game.lifeBought = (Game.lifeBought || 0) + 1; } else Game.up[id] = U_(id) + 1;
    A.sfx.buy();
    return true;
  };

  /* ---------- setup ---------- */
  Game.reset = function (demo) {
    Game.demo = !!demo; Game.score = 0; Game.credits = 0; Game.creditAcc = 0; Game.lives = C.START_LIVES; Game.up = {}; Game.lifeBought = 0; Game.nextLife = C.EXTRA_LIFE;
    Game.time = 0; Game.demoT = 0; FX.reset();
    Game.startLevel(demo ? 1 : (G0.level || 1));
    Game.phase = demo ? 'demo' : 'ready';
  };

  Game.startLevel = function (level) {
    Game.level = level;
    Game.web = Wb.make(level);
    const w = Game.web;
    Game.enemies = []; Game.bullets = []; Game.caps = []; Game.bolts = []; Game.boss = null;
    Game.spikes = new Array(w.lanes).fill(0);
    Game.levelT = 0; Game.warpT = 0;
    const keep = Game.p;
    Game.p = { lane: Math.floor(w.lanes / 2), pos: Math.floor(w.lanes / 2), moveT: 0, fireT: 0, inv: 1.2, shield: U_('shield'), zaps: U_('zap'), pu: { rapid: 0, spread: 0, pierce: 0 }, dead: false, tx: 0 };
    if (keep && !Game.demo) { Game.p.pu = { rapid: 0, spread: 0, pierce: 0 }; }
    Game.queue = buildQueue(level);
    if (level % 5 === 0 && !Game.demo) Game.spawnBoss();
    Game.phase = Game.demo ? 'demo' : 'ready'; Game.phaseT = 1.9;
    Game.banner = Game.boss ? 'BOSS: ' + Art.BOSS[Game.boss.skin].name : 'WEB ' + level; Game.bannerT = 1.9;
    if (!Game.demo) A.sfx.ready();
  };

  function buildQueue(level) {
    const boss = level % 5 === 0 && !Game.demo;
    const nf = Math.min(24, 6 + 2 * level) * (boss ? 0.3 : 1), nt = level >= 2 ? Math.min(7, 1 + Math.floor(level / 2)) : 0, ns = level >= 3 ? Math.min(4, 1 + Math.floor((level - 3) / 4)) : 0;
    const np = level >= 5 ? Math.min(5, 1 + Math.floor((level - 5) / 3)) : 0, nu = level >= 7 ? Math.min(4, 1 + Math.floor((level - 7) / 3)) : 0;
    const list = [];
    const add = (t, n) => { for (let i = 0; i < n; i++) list.push(t); };
    add('flip', Math.round(nf)); add('tank', boss ? 0 : nt); add('spike', boss ? 0 : ns); add('puls', boss ? 0 : np); add('fuse', boss ? 0 : nu);
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    const gap = Math.max(0.55, 1.5 - 0.035 * level);
    let t = 1.2;
    return list.map((type) => { t += gap * U.rand(0.6, 1.4); return { t, type }; });
  }

  /* ---------- helpers ---------- */
  const wrapLane = (l) => Game.web.wrap(l);
  const laneOK = (l) => (Game.web.closed ? ((l % Game.web.lanes) + Game.web.lanes) % Game.web.lanes : U.clamp(l, 0, Game.web.lanes - 1));
  function pos(u, d) { Game.web.at(u, d, pt); return pt; }

  Game.addScore = function (n) {
    Game.score += n; Game.creditAcc += n / 4; Game.credits = Math.floor(Game.creditAcc);
    while (Game.score >= Game.nextLife) { Game.nextLife += C.EXTRA_LIFE; Game.lives++; A.sfx.extra(); FX.text(C.CX, C.CY + 130, '1UP', '#7dffb0', 24); }
  };

  /* ---------- spawning ---------- */
  Game.spawn = function (type, lane, d) {
    const w = Game.web, L = lane === undefined ? Math.floor(Math.random() * w.lanes) : laneOK(lane);
    const e = { type, lane: L, u: L + 0.5, d: d || 0, dead: false, ph: Math.random() * 6, t: 0, state: 'climb' };
    if (type === 'flip') { e.flipT = U.rand(0.5, 1.3); e.flipDir = 0; e.flipF = 0; e.spin = 0; }
    else if (type === 'spike') { e.stopD = U.rand(0.4, 0.85); }
    else if (type === 'fuse') { e.u = L; e.uT = L; e.hopT = U.rand(0.3, 0.9); }
    else if (type === 'puls') { e.pcd = U.rand(1.2, 2.4); e.tele = 0; e.pt = 0; e.hit = false; }
    Game.enemies.push(e);
    return e;
  };

  const SPEED = { flip: 0.12, tank: 0.085, spike: 0.1, fuse: 0.11, puls: 0.09 };

  /* ---------- the boss ---------- */
  Game.spawnBoss = function () {
    const w = Game.web, n = w.lanes;
    const skin = (Game.level / 5 - 1) % 3;
    Game.boss = { skin: ((skin % 3) + 3) % 3, hp: 24 + Game.level * 3, max: 24 + Game.level * 3, plates: new Array(n).fill(3 + Math.floor(Game.level / 10)), hitF: new Array(n).fill(0), hitCore: 0, plateD: 0.03, arrive: 0, spawnT: 3, boltT: 3.2, regenT: 7, dead: false };
  };
  function bossUpdate(dt) {
    const b = Game.boss, w = Game.web;
    if (!b || b.dead) return;
    b.arrive = Math.min(1, b.arrive + dt / 1.8); b.plateD = 0.03 + 0.65 * U.easeOutCubic(b.arrive);
    for (let l = 0; l < b.hitF.length; l++) if (b.hitF[l] > 0) b.hitF[l] -= dt * 5;
    if (b.hitCore > 0) b.hitCore -= dt * 5;
    if (b.arrive < 1) return;
    b.spawnT -= dt;
    if (b.spawnT <= 0) {
      b.spawnT = Math.max(2, 4 - Game.level * 0.05);
      if (Game.enemies.length < 9) Game.spawn(b.skin === 1 ? 'tank' : b.skin === 2 ? 'puls' : 'flip', undefined, b.plateD + 0.02);
    }
    b.boltT -= dt;
    if (b.boltT <= 0) {
      b.boltT = Math.max(2.6, 4.6 - Game.level * 0.06);
      const lanes = [Math.random() < 0.7 ? Game.p.lane : Math.floor(Math.random() * w.lanes)];
      if (b.skin === 2) lanes.push(Math.floor(Math.random() * w.lanes));
      lanes.forEach((l) => Game.bolts.push({ lane: l, tele: 0.85, d: b.plateD }));
      A.sfx.bolt();
    }
    b.regenT -= dt;
    if (b.regenT <= 0) {
      b.regenT = 7;
      const dead = []; b.plates.forEach((h, i) => { if (h <= 0) dead.push(i); });
      if (dead.length) { const i = dead[Math.floor(Math.random() * dead.length)]; b.plates[i] = 2; }
    }
  }
  function boltsUpdate(dt) {
    for (const bo of Game.bolts) {
      if (bo.tele > 0) { bo.tele -= dt; continue; }
      bo.d += 1.7 * dt;
      if (bo.d >= 1) { bo.dead = true; if (!Game.p.dead && Game.p.lane === bo.lane && Game.phase === 'play') Game.killPlayer(); }
    }
    Game.bolts = Game.bolts.filter((b) => !b.dead);
  }

  /* ---------- power-ups ---------- */
  function drop(e, chance) {
    if (Math.random() > chance) return;
    const r = Math.random() * 86;
    const type = r < 22 ? 'R' : r < 42 ? 'S' : r < 56 ? 'P' : r < 70 ? 'H' : r < 82 ? 'Z' : 'L';
    Game.caps.push({ type, lane: Math.floor(e.u + (e.type === 'fuse' ? 0 : 0)) % Game.web.lanes, d: Math.min(0.98, e.d), t: 0, rest: 6 });
  }
  function capsUpdate(dt) {
    const p = Game.p;
    for (const c of Game.caps) {
      c.t += dt;
      if (c.d < 1) c.d = Math.min(1, c.d + 0.26 * dt); else c.rest -= dt;
      if (c.d >= 0.96 && !p.dead && p.lane === c.lane) { collect(c); c.dead = true; }
      else if (c.rest <= 0) c.dead = true;
    }
    Game.caps = Game.caps.filter((c) => !c.dead);
  }
  function collect(c) {
    const p = Game.p, dur = puDur(), w = pos(c.lane + 0.5, 1), x = w.x, y = w.y;
    const names = { R: 'RAPID FIRE', S: 'SPREAD SHOT', P: 'PIERCING', H: 'SHIELD', Z: 'ZAPPER', L: '1UP' };
    if (c.type === 'R') p.pu.rapid = dur; else if (c.type === 'S') p.pu.spread = dur; else if (c.type === 'P') p.pu.pierce = dur;
    else if (c.type === 'H') p.shield = Math.min(3, p.shield + 1); else if (c.type === 'Z') p.zaps = Math.min(3, p.zaps + 1); else Game.lives = Math.min(9, Game.lives + 1);
    Game.addScore(500);
    FX.text(x, y - 30, names[c.type], Art.CAP[c.type][0], 15);
    FX.ring(x, y, 6, 36, Art.CAP[c.type][0], 0.45, 2.5);
    A.sfx.power();
  }

  /* ---------- hits ---------- */
  function fxAt(u, d, color, size) {
    const q = pos(u, d);
    FX.explosion(q.x, q.y, size || 1, color);
    return q;
  }
  function killEnemy(e, zapped) {
    if (e.dead) return;
    e.dead = true;
    const mul = zapped ? 0.6 : 1;
    let pts = 0, hue = 0, ch = 0.04;
    switch (e.type) {
      case 'flip': pts = 150; hue = 355; ch = 0.05; break;
      case 'tank': pts = 100; hue = 280; ch = 1; break;
      case 'spike': pts = 50; hue = 135; ch = 0.08; break;
      case 'fuse': pts = 250; hue = 50; ch = 0.12; break;
      case 'puls': pts = 200; hue = 185; ch = 0.15; break;
    }
    const q = fxAt(e.u, e.d, hue, e.d > 0.6 ? 1.3 : 0.9);
    pts = Math.round(pts * mul);
    Game.addScore(pts);
    if (e.d > 0.3) FX.text(q.x, q.y - 6, String(pts), '#fff', 13);
    A.sfx.kill(e.type);
    if (e.type === 'tank') {
      const L = Math.floor(e.u);
      for (const dl of [-1, 1]) {
        if (!Game.web.closed && (L + dl < 0 || L + dl >= Game.web.lanes)) continue;
        const f = Game.spawn('flip', L + dl, e.d); f.flipT = 0.15;
      }
    }
    if (!zapped) drop(e, ch);
  }

  function enemyTol(e) { return e.type === 'fuse' ? 0.62 : 0.5; }
  function bulletsUpdate(dt) {
    const w = Game.web, b0 = Game.boss;
    for (const b of Game.bullets) {
      const prev = b.d; b.d -= C.BULLET_V * dt;
      let hit = false;
      for (const e of Game.enemies) {
        if (e.dead || e.d > prev + 0.03 || e.d < b.d - 0.03) continue;
        if (Math.abs(w.delta(b.u, e.u)) > enemyTol(e)) continue;
        killEnemy(e, false);
        if (b.pierce > 0) b.pierce--; else { hit = true; break; }
      }
      if (hit) { b.dead = true; continue; }
      const tip = Game.spikes[b.lane];
      if (tip > 0.02 && prev >= tip && b.d <= tip + 0.02) {
        Game.spikes[b.lane] = Math.max(0, tip - 0.085);
        const q = pos(b.lane + 0.5, tip); FX.sparks(q.x, q.y, 6, 90, 'rgba(120,255,160,1)', 0.35); A.sfx.spikeHit();
        Game.addScore(1);
        if (b.pierce > 0) b.pierce--; else { b.dead = true; continue; }
      }
      if (b0 && !b0.dead && b0.arrive >= 1) {
        if (b0.plates[b.lane] > 0 && prev >= b0.plateD && b.d < b0.plateD) {
          b0.plates[b.lane]--; b0.hitF[b.lane] = 1;
          const q = pos(b.lane + 0.5, b0.plateD); FX.sparks(q.x, q.y, 7, 120, 'rgba(255,255,255,1)', 0.35);
          if (b0.plates[b.lane] <= 0) { fxAt(b.lane + 0.5, b0.plateD, 40, 1.1); Game.addScore(100); A.sfx.kill('flip'); } else A.sfx.plate();
          if (b.pierce > 0) b.pierce--; else { b.dead = true; continue; }
        } else if (b0.plates[b.lane] <= 0 && b.d <= b0.plateD - 0.12 && prev > b0.plateD - 0.12) {
          Game.hitCore(1);
          b.dead = true; continue;
        }
      }
      if (b.d <= 0) b.dead = true;
    }
    Game.bullets = Game.bullets.filter((b) => !b.dead);
  }
  Game.hitCore = function (n) {
    const b = Game.boss;
    if (!b || b.dead) return;
    b.hp -= n; b.hitCore = 1; Game.addScore(10);
    FX.sparks(C.CX, C.CY, 8, 140, Art.BOSS[b.skin].glow, 0.4); A.sfx.core();
    if (b.hp <= 0) {
      b.dead = true;
      const bonus = 4000 + Game.level * 300;
      Game.addScore(bonus);
      FX.explosion(C.CX, C.CY, 4, 30); FX.doFlash(0.6, '255,230,160'); FX.addShake(5);
      for (let i = 0; i < 6; i++) FX.explosion(C.CX + U.rand(-60, 60), C.CY + U.rand(-60, 60), 2, 20 + i * 40);
      FX.text(C.CX, C.CY - 70, 'BOSS DOWN +' + bonus, '#ffe45a', 24);
      for (const e of Game.enemies) killEnemy(e, true);
      Game.bolts = [];
      A.sfx.bossDie();
    }
  };

  Game.zap = function () {
    const p = Game.p;
    if (p.zaps <= 0 || Game.phase !== 'play') return;
    p.zaps--;
    FX.doFlash(0.7, '255,250,200'); FX.addShake(4); A.sfx.zap();
    for (const e of Game.enemies) killEnemy(e, true);
    Game.spikes.fill(0); Game.bolts = [];
    const b = Game.boss;
    if (b && !b.dead && b.arrive >= 1) {
      b.plates = b.plates.map((h) => Math.max(0, h - 2));
      Game.hitCore(5);
    }
    FX.ring(C.CX, C.CY, 20, 330, 'rgba(255,250,200,0.9)', 0.6, 5);
  };

  /* ---------- the claw ---------- */
  Game.killPlayer = function () {
    const p = Game.p;
    if (p.dead || p.inv > 0 || Game.phase !== 'play' || Game.demo) return;
    if (G0.god) return;
    if (p.shield > 0) { p.shield--; p.inv = 1.4; FX.ring(pos(p.lane + 0.5, 1).x, pt.y, 10, 60, 'rgba(120,230,255,1)', 0.5, 3); A.sfx.shield(); return; }
    p.dead = true; Game.phase = 'dying'; Game.phaseT = 1.7;
    const q = pos(p.lane + 0.5, 1);
    FX.explosion(q.x, q.y, 2.4, 50); FX.doFlash(0.35, '255,200,120'); FX.addShake(5);
    A.sfx.die();
  };

  function movePlayer(dt) {
    const p = Game.p, w = Game.web;
    p.moveT -= dt;
    let step = 0;
    const pend = I.takePend();
    if (pend && Math.abs(pend)) p.q = (p.q || 0) + pend;
    if (p.moveT <= 0) {
      if (p.q) { step = Math.sign(p.q); p.q -= step; }
      else if (I.left !== I.right && (I.left || I.right)) step = I.right ? 1 : -1;
      else if (I.mouseActive && S.mouseSteer !== false) {
        const tl = w.laneAtPoint(I.px, I.py), dl = w.delta(p.lane + 0, tl);
        if (Math.abs(dl) >= 1) step = Math.sign(dl);
      }
      if (step) { p.lane = Game.web.closed ? ((p.lane + step) % w.lanes + w.lanes) % w.lanes : U.clamp(p.lane + step, 0, w.lanes - 1); p.moveT = moveInt() * (S.sens ? 1 / S.sens : 1); if (!Game.demo) A.sfx.move(); }
    }
    const d = w.delta(p.pos, p.lane);
    p.pos += U.clamp(d, -dt * 26, dt * 26);
    if (w.closed) p.pos = ((p.pos % w.lanes) + w.lanes) % w.lanes;
  }

  function shoot(dt) {
    const p = Game.p, w = Game.web;
    p.fireT -= dt;
    if (!(I.fire || Game.demo && Game.autoFire) || p.fireT > 0) return;
    if (Game.bullets.length >= maxShots()) return;
    p.fireT = fireInt();
    const lanes = [p.lane];
    if (p.pu.spread > 0) { lanes.push(laneOK(p.lane - 1)); lanes.push(laneOK(p.lane + 1)); if (!w.closed) { if (p.lane === 0) lanes.splice(1, 1); else if (p.lane === w.lanes - 1) lanes.splice(2, 1); } }
    for (const l of lanes) {
      const pierce = p.pu.pierce > 0 || Math.random() < pierceChance() ? 3 : 0;
      const b = { lane: l, u: l + 0.5, d: 1, pierce, dead: false };
      Game.bullets.push(b);
      for (const e of Game.enemies) {                                  /* anything already sitting on the rim in that lane */
        if (e.dead || e.d < 0.96 || Math.abs(w.delta(b.u, e.u)) > enemyTol(e)) continue;
        killEnemy(e, false); if (b.pierce > 0) b.pierce--; else { b.dead = true; break; }
      }
    }
    A.sfx.shoot();
  }

  /* ---------- enemies ---------- */
  function enemiesUpdate(dt) {
    const w = Game.web, p = Game.p, k = sl();
    for (const e of Game.enemies) {
      if (e.dead) continue;
      e.t += dt;
      const sp = SPEED[e.type] * k;
      switch (e.type) {
        case 'flip': {
          if (e.state === 'climb') {
            e.d += sp * dt;
            if (e.flipDir) {
              e.flipF += dt / 0.28;
              const f = U.smooth(Math.min(1, e.flipF));
              e.u = e.lane + 0.5 + e.flipDir * f; e.spin = e.flipDir * Math.PI * f;
              if (e.flipF >= 1) { e.lane = laneOK(e.lane + e.flipDir); e.u = e.lane + 0.5; e.flipDir = 0; e.spin = 0; e.flipT = U.rand(0.5, 1.4); }
            } else {
              e.flipT -= dt;
              if (e.flipT <= 0) {
                let dir = Math.random() < 0.55 ? Math.sign(w.delta(e.lane, p.lane)) || (Math.random() < 0.5 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
                if (!w.closed && (e.lane + dir < 0 || e.lane + dir >= w.lanes)) dir = -dir;
                e.flipDir = dir; e.flipF = 0;
              }
            }
            if (e.d >= 1) { e.d = 1; e.state = 'rim'; e.flipDir = 0; e.spin = 0; e.lane = laneOK(Math.floor(e.u)); e.u = e.lane + 0.5; }
          } else {
            const du = w.delta(e.u, p.lane + 0.5), st = 3.2 * k * dt;
            e.u = w.wrap(e.u + Math.sign(du) * Math.min(Math.abs(du), st));
            e.lane = laneOK(Math.floor(e.u)); e.spin = Math.sin(e.t * 18) * 0.5;
            if (Math.abs(w.delta(e.u, p.lane + 0.5)) < 0.3) Game.killPlayer();
          }
          break;
        }
        case 'tank':
          e.d += sp * dt;
          if (e.d >= 0.9) { e.dead = true; const L = Math.floor(e.u); for (const dl of [-1, 1]) { if (!w.closed && (L + dl < 0 || L + dl >= w.lanes)) continue; const f = Game.spawn('flip', L + dl, e.d); f.flipT = 0.15; } FX.ring(pos(e.u, e.d).x, pt.y, 4, 30, 'rgba(210,150,255,0.9)', 0.4, 2); }
          break;
        case 'spike':
          if (e.state === 'climb') { e.d += sp * dt; Game.spikes[e.lane] = Math.max(Game.spikes[e.lane], e.d); if (e.d >= e.stopD) e.state = 'down'; }
          else { e.d -= sp * 1.5 * dt; if (e.d <= 0.02) e.dead = true; }
          break;
        case 'fuse':
          if (e.state === 'climb') {
            e.d += sp * dt;
            e.hopT -= dt;
            if (e.hopT <= 0) { e.hopT = U.rand(0.4, 1.0); let t2 = e.uT + (Math.random() < 0.5 ? -1 : 1); if (!w.closed) t2 = U.clamp(t2, 0, w.lanes); e.uT = t2; }
            if (e.d >= 1) { e.d = 1; e.state = 'rim'; }
          } else {
            e.hopT -= dt;
            if (e.hopT <= 0) { e.hopT = U.rand(0.25, 0.6); const du = w.delta(e.uT, p.lane + 0.5); let t2 = e.uT + (Math.random() < 0.6 ? Math.sign(du) : -Math.sign(du)); if (!w.closed) t2 = U.clamp(t2, 0, w.lanes); e.uT = t2; }
            if (Math.abs(w.delta(e.u, p.lane + 0.5)) < 0.56) Game.killPlayer();
          }
          e.u += U.clamp(w.delta(e.u, e.uT), -dt * 6, dt * 6);
          if (w.closed) e.u = w.wrap(e.u);
          e.lane = laneOK(Math.floor(e.u));
          break;
        case 'puls':
          if (e.state === 'climb') { e.d += sp * dt; if (e.d >= 1) { e.d = 1; e.state = 'rim'; } }
          if (e.pt > 0) {
            e.pt -= dt;
            if (!e.hit && p.lane === e.lane && Game.phase === 'play') { e.hit = true; Game.killPlayer(); }
          } else if (e.tele > 0) { e.tele -= dt; if (e.tele <= 0) { e.pt = 0.75; e.hit = false; A.sfx.pulse(); } }
          else { e.pcd -= dt; if (e.pcd <= 0) { e.tele = 0.5; e.pcd = U.rand(2.1, 3); } }
          break;
      }
    }
    Game.enemies = Game.enemies.filter((e) => !e.dead);
  }

  /* ---------- phases ---------- */
  function demoPilot(dt) {
    Game.demoT += dt;
    const p = Game.p, w = Game.web;
    let best = null, bd = 9;
    for (const e of Game.enemies) { const dl = Math.abs(w.delta(p.lane + 0.5, e.u)); const sc = dl + (1 - e.d) * 0.5; if (sc < bd) { bd = sc; best = e; } }
    Game.demoDir = 0;
    if (best) { const dl = w.delta(p.lane + 0.5, best.u); if (Math.abs(dl) > 0.5) Game.demoDir = dl > 0 ? 1 : -1; }
    Game.autoFire = !!best;
    if (Game.demoDir && p.moveT <= 0) { p.q = (p.q || 0) + Game.demoDir * 1; }
    if (Game.demoT > 14) { Game.demoT = 0; Game.startLevel((Game.level % Wb.COUNT) + 1); Game.phase = 'demo'; }
    /* the demo spawns its own traffic */
    Game.levelT += dt;
    while (Game.queue.length && Game.queue[0].t <= Game.levelT) Game.spawn(Game.queue.shift().type);
    if (!Game.queue.length && Game.levelT > 5) Game.queue = buildQueue(Math.min(8, Game.level + 3)).map((q) => ({ t: q.t + Game.levelT, type: q.type }));
  }

  Game.update = function (dt) {
    Game.time += dt;
    FX.update(dt);
    const ph = Game.phase;
    if (Game.demo) {
      demoPilot(dt);
      movePlayer(dt); shoot(dt); bulletsUpdate(dt); enemiesUpdate(dt); capsUpdate(dt);
      for (const e of Game.enemies) if (e.state === 'rim') e.dead = true;
      return;
    }
    if (Game.bannerT > 0) Game.bannerT -= dt;
    const p = Game.p;
    if (p.inv > 0) p.inv -= dt;
    for (const k in p.pu) if (p.pu[k] > 0) p.pu[k] -= dt;
    if (ph === 'ready') {
      Game.phaseT -= dt; movePlayer(dt);
      if (Game.phaseT <= 0) Game.phase = 'play';
      return;
    }
    if (ph === 'dying') {
      Game.phaseT -= dt;
      for (const e of Game.enemies) { if (e.state === 'rim') e.u += 0; }
      if (Game.phaseT <= 0) {
        Game.lives--;
        if (Game.lives <= 0) { Game.phase = 'over'; if (Game.onOver) Game.onOver(); return; }
        for (const e of Game.enemies) { e.d = Math.min(e.d, U.rand(0.25, 0.55)); if (e.type === 'flip') { e.state = 'climb'; e.flipDir = 0; e.spin = 0; e.u = e.lane + 0.5; } if (e.type === 'fuse') e.state = 'climb'; if (e.type === 'puls') { e.state = 'climb'; e.pt = 0; e.tele = 0; } }
        Game.bolts = []; Game.bullets = [];
        p.dead = false; p.inv = 2.2; p.pu = { rapid: 0, spread: 0, pierce: 0 };
        if (Game.warpKill) { Game.warpKill = false; Game.finishWarp(); } else { Game.phase = 'ready'; Game.phaseT = 0.9; Game.banner = 'READY'; Game.bannerT = 0.9; }
      }
      return;
    }
    if (ph === 'clear') { Game.phaseT -= dt; movePlayer(dt); bulletsUpdate(dt); capsUpdate(dt); if (Game.phaseT <= 0) { Game.phase = 'warp'; Game.warpT = 0; Game.bullets = []; A.sfx.warp(); } return; }
    if (ph === 'warp') {
      Game.warpT += dt; movePlayer(dt);
      if (Game.warpT >= 2.0) {
        if (Game.spikes[p.lane] > 0.02 && !G0.god) {
          if (p.shield > 0) { p.shield--; p.inv = 1.4; FX.text(C.CX, C.CY, 'SHIELD SAVED YOU', '#7ee8ff', 18); Game.finishWarp(); }
          else { p.dead = true; Game.phase = 'dying'; Game.phaseT = 1.4; Game.warpKill = true; const q = pos(p.lane + 0.5, 1); FX.explosion(q.x, q.y, 2.2, 120); FX.addShake(5); A.sfx.die(); }
        } else Game.finishWarp();
      }
      return;
    }
    if (ph !== 'play') return;
    if (I.takeZap()) Game.zap();
    movePlayer(dt); shoot(dt);
    Game.levelT += dt;
    while (Game.queue.length && Game.queue[0].t <= Game.levelT) { const q = Game.queue.shift(); Game.spawn(q.type); }
    bossUpdate(dt); boltsUpdate(dt);
    enemiesUpdate(dt); bulletsUpdate(dt); capsUpdate(dt);
    if (Game.phase !== 'play') return;
    const bossDone = !Game.boss || Game.boss.dead;
    if (!Game.queue.length && !Game.enemies.length && bossDone) {
      Game.phase = 'clear'; Game.phaseT = 0.8;
      Game.addScore(Game.level * 100); Game.creditAcc += 20 + Game.level * 6; Game.credits = Math.floor(Game.creditAcc);
      Game.banner = 'WEB CLEAR'; Game.bannerT = 1.6;
    }
    A.siren && A.siren(Game.enemies.length);
  };

  Game.finishWarp = function () {
    Game.phase = 'shop';
    if (Game.onShop) Game.onShop(); else Game.leaveShop();
  };
  Game.leaveShop = function () { Game.startLevel(Game.level + 1); };

  /* ---------- drawing ---------- */
  Game.render = function (ctx) {
    const w = Game.web;
    if (!w) return;
    const t = Game.time, ph = Game.phase, p = Game.p;
    const warp = ph === 'warp' ? Game.warpT / 2.0 : 0;
    Art.drawWeb(ctx, w, { lane: ph === 'play' || ph === 'ready' || ph === 'warp' || ph === 'clear' ? p.lane : (Game.demo ? p.lane : -1), t, shift: warp ? (warp * 14) % 1 : (t * 0.35) % 1 });
    ctx.globalCompositeOperation = 'lighter';
    for (let l = 0; l < w.lanes; l++) Art.drawSpike(ctx, w, l, Game.spikes[l], w.theme);
    for (const bo of Game.bolts) {
      if (bo.tele > 0) { if (Math.floor(t * 18) % 2) Art.drawZap(ctx, w, bo.lane, bo.d, t, 'rgba(255,120,90,0.7)'); }
      else Art.drawZap(ctx, w, bo.lane, bo.d, t, 'rgba(255,255,200,0.95)');
    }
    for (const e of Game.enemies) if (e.type === 'puls' && e.pt > 0) Art.drawZap(ctx, w, e.lane, e.d, t, 'rgba(255,250,150,0.9)');
    ctx.globalCompositeOperation = 'source-over';
    if (Game.boss && !Game.boss.dead) Art.drawBoss(ctx, w, Game.boss, t);
    for (const c of Game.caps) Art.drawCapsule(ctx, w, c.lane + 0.5, c.d, c.type, t);
    for (const e of Game.enemies) {
      switch (e.type) {
        case 'flip': Art.drawFlipper(ctx, w, e, t); break;
        case 'tank': Art.drawTanker(ctx, w, e, t); break;
        case 'spike': Art.drawSpiker(ctx, w, e, t); break;
        case 'fuse': Art.drawFuse(ctx, w, e, t); break;
        case 'puls': Art.drawPulsar(ctx, w, e, t); break;
      }
    }
    for (const b of Game.bullets) Art.drawBullet(ctx, w, b.u, b.d, b.pierce > 0);
    if (!p.dead && (Game.demo || ph !== 'over')) Art.drawClaw(ctx, w, p.pos, t, { inv: ph === 'play' || ph === 'ready' ? p.inv : 0, shield: p.shield });
    ctx.globalCompositeOperation = 'lighter'; FX.drawAdd(ctx); ctx.globalCompositeOperation = 'source-over';
    FX.drawNorm(ctx); FX.drawText(ctx);
  };

  G.game = Game;
})((window.SGS = window.SGS || {}));
