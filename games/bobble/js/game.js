/* Core game: tile physics, the astronaut, bubbles, aliens, items, projectiles, hurry-up, level flow. All units are art pixels (1 tile = 8). */
(function (G) {
  'use strict';
  const C = G.C, U = G.U, TILE = C.TILE, ROWS = C.ROWS, FIELD_H = ROWS * TILE;
  const Game = { state: 'title', time: 0 };
  G.game = Game;
  const GRAV = 640, MOVE = 76, JUMP = -236, BR = 8;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const snd = (n, a, b) => { const au = G.audio; if (au && au.sfx && au.sfx[n]) au.sfx[n](a, b); };
  Game.snd = snd;

  /* ---------- tile helpers ---------- */
  Game.tile = function (tx, ty) {
    const r = this.room;
    if (tx < 0 || tx >= r.cols || ty < 0) return 1;
    if (ty >= ROWS) return 0;
    return r.tiles[ty * r.cols + tx];
  };
  Game.lowg = function (x, y) { for (const z of this.room.lowg) if (x > z.x0 && x < z.x1 && y > z.y0 && y < z.y1) return true; return false; };
  /* move a box (centre x, bottom y, size w x h) with solids and one-way platforms; returns { ground, hitX, hitHead } */
  Game.move = function (e, dt) {
    const out = { ground: false, hitX: false, hitHead: false }, w2 = e.w / 2;
    // horizontal: only solid (type 1) tiles block
    let nx = e.x + e.vx * dt;
    const top = e.y - e.h, y0 = Math.floor(top / TILE), y1 = Math.floor((e.y - 0.01) / TILE);
    const dir = Math.sign(e.vx);
    if (dir !== 0) {
      const tx = Math.floor((nx + dir * w2) / TILE);
      for (let ty = y0; ty <= y1; ty++) if (this.tile(tx, ty) === 1) { nx = dir > 0 ? tx * TILE - w2 - 0.01 : (tx + 1) * TILE + w2 + 0.01; out.hitX = true; break; }
    }
    e.x = nx;
    // vertical
    const g = e.noGrav ? 0 : GRAV * (this.lowg(e.x, e.y) ? 0.32 : 1) * (e.gm || 1);
    e.vy = Math.min(e.maxFall || 280, e.vy + g * dt);
    let ny = e.y + e.vy * dt;
    const x0 = Math.floor((e.x - w2 + 1) / TILE), x1 = Math.floor((e.x + w2 - 1) / TILE);
    if (e.vy >= 0) {
      const ta = Math.ceil((e.y - 0.01) / TILE), tb = Math.floor(ny / TILE);
      land: for (let ty = ta; ty <= tb; ty++) for (let tx = x0; tx <= x1; tx++) { const t = this.tile(tx, ty); if (e.dropRow === ty && t === 2) continue; if (t === 1 || t === 2) { ny = ty * TILE; e.vy = 0; out.ground = true; break land; } }
    } else {
      const ty = Math.floor((ny - e.h) / TILE);
      for (let tx = x0; tx <= x1; tx++) if (this.tile(tx, ty) === 1) { ny = (ty + 1) * TILE + e.h + 0.01; e.vy = 0; out.hitHead = true; break; }
    }
    e.y = ny;
    if (e.y > FIELD_H + 24 && !e.noWrap) { e.y = 20 + e.h; e.wrapped = true; }
    return out;
  };

  /* ---------- game setup ---------- */
  Game.reset = function (diff) {
    this.diff = C.DIFF[diff === undefined ? 1 : diff]; this.diffIdx = diff === undefined ? 1 : diff;
    this.score = 0; this.lives = this.diff.lives; this.conts = this.diff.cont; this.level = 1; this.extendIdx = 0; this.nextExtend = C.EXTEND_AT[0];
    this.letters = { have: [0, 0, 0, 0, 0, 0], wordsDone: 0, worldDone: false, worlds: new Array(10).fill(0) };
    this.perks = { speed: 0, rapid: 0, range: 0 };
    this.over = false; this.ending = null; this.state = 'intro';
    this.loadLevel(1);
  };
  Game.addScore = function (v, x, y) {
    this.score += v;
    if (x !== undefined) this.float(x, y, String(v), '#ffffff');
    while (this.score >= this.nextExtend) { this.lives = Math.min(9, this.lives + 1); this.extendIdx++; this.nextExtend = this.extendIdx < C.EXTEND_AT.length ? C.EXTEND_AT[this.extendIdx] : this.nextExtend + C.EXTEND_EVERY; snd('extend'); this.banner('EXTRA LIFE', 1.6); }
  };
  Game.float = function (x, y, txt, col) { this.floats.push({ x, y, txt, col: col || '#fff', t: 0 }); if (this.floats.length > 30) this.floats.shift(); };
  Game.banner = function (text, life, kind) { this.bannerO = { text, life: life || 2, t: 0, kind: kind || '' }; };
  Game.loadLevel = function (n) {
    const cols = G.main ? G.main.cols() : 40;
    if ((n - 1) % 10 === 0 && this.letters) { this.letters.worldDone = false; this.letters.have = [0, 0, 0, 0, 0, 0]; }
    this.level = n; this.cols = cols; this.rnd = G.px.rng(n * 131 + this.diffIdx * 17 + 7);
    this.room = G.levels.make(n, cols);
    this.world = this.room.world;
    this.bubbles = []; this.foes = []; this.items = []; this.shots = []; this.parts = []; this.floats = []; this.bannerO = null;
    this.timer = 0; this.hurry = 0; this.chaser = null; this.combo = 0; this.comboT = 0; this.clearT = 0; this.shake = 0; this.letterT = 6 + Math.random() * 8; this.state = 'intro'; this.introT = 2.0;
    const sp = this.room.spawn;
    this.P = { x: sp[0], y: sp[1], vx: 0, vy: 0, w: 12, h: 14, face: 1, ground: true, dead: false, deadT: 0, invuln: 2.2, blowT: 0, blowAnim: 0, anim: 0, bubbleRide: null, jumpHeld: false, spawnT: 0 };
    this.bossObj = null;
    if (this.room.boss && G.boss) G.boss.begin(this); else {
      const list = G.levels.foes(n, this.room, this.rnd);
      for (const f of list) this.spawnFoe(f.type, f.x, f.y, 0.4 + this.rnd() * 0.9);
    }
    snd('level');
    if (G.audio && G.audio.music) G.audio.music(this.room.boss ? 'boss' : 'play', G.levels.WORLDS[this.world].music);
  };
  Game.spawnFoe = function (type, x, y, delay) {
    const f = { type, x, y, vx: 0, vy: 0, w: 12, h: 12, face: Math.random() < 0.5 ? -1 : 1, state: 'spawn', t: delay || 0, angry: false, anim: Math.random() * 3, cd: 1 + Math.random() * 2, jumpT: 1 + Math.random() * 2, ground: false };
    if (type === 2 || type === 5) { f.noGrav = true; f.flying = true; f.vx = f.face * 30; f.vy = (Math.random() < 0.5 ? -1 : 1) * 24; }
    this.foes.push(f); return f;
  };

  /* ---------- the astronaut ---------- */
  Game.blow = function (P) {
    const pk = this.perks, range = pk.range > 0 ? 1.45 : 1, mine = this.bubbles.filter((b) => b.state === 'shot').length;
    if (mine >= 4) return;
    P.blowT = pk.rapid > 0 ? 0.15 : 0.3; P.blowAnim = 0.18;
    const b = { x: P.x + P.face * 10, y: P.y - 8, r: BR, vx: P.face * 196 * range, vy: -4, state: 'shot', age: 0, tShot: 0.5, enemy: null, kind: 'air', life: this.diff.trap + 2.6, bob: Math.random() * 6 };
    if (this.tile(Math.floor((b.x + P.face * 6) / TILE), Math.floor(b.y / TILE)) === 1) b.vx = 0;   // blowing straight into a wall just pops a stationary bubble
    this.bubbles.push(b); snd('blow');
  };
  /* Down + jump: sink through the one-way platform underfoot (never the floor strip, which has solid rock under it) */
  Game.dropDown = function (P) {
    const ty = Math.round(P.y / TILE);
    if (Math.abs(P.y - ty * TILE) > 0.6 || ty >= ROWS - 2) return false;
    let plat = false;
    for (let tx = Math.floor((P.x - 5) / TILE); tx <= Math.floor((P.x + 5) / TILE); tx++) { const t = this.tile(tx, ty); if (t === 1) return false; if (t === 2) plat = true; }
    if (!plat) return false;
    P.dropRow = ty; P.ground = false; P.coyote = 0; P.vy = 30; P.jumpBuf = 0; P.y += 1; snd('blip');
    return true;
  };
  Game.updatePlayer = function (dt, I) {
    const P = this.P;
    if (P.blowT > 0) P.blowT -= dt;
    if (P.blowAnim > 0) P.blowAnim -= dt;
    if (P.invuln > 0) P.invuln -= dt;
    for (const k in this.perks) if (this.perks[k] > 0) this.perks[k] -= dt;
    if (P.dead) {
      P.deadT += dt; P.vy += 300 * dt; P.y += P.vy * dt * (P.deadT < 0.4 ? 0 : 1);
      if (P.deadT > 1.6) this.afterDeath();
      return;
    }
    const spd = MOVE * (this.perks.speed > 0 ? 1.4 : 1), want = (I.r ? 1 : 0) - (I.l ? 1 : 0);
    if (want) { P.face = want; P.vx = want * spd; P.anim += dt * 9; } else { P.vx = 0; }
    if (I.takeJump()) { if (!(I.down && P.ground && !P.bubbleRide && this.dropDown(P))) P.jumpBuf = 0.1; }
    if (P.jumpBuf > 0) P.jumpBuf -= dt;
    if (P.jumpBuf > 0 && (P.ground || P.coyote > 0)) { P.vy = JUMP * (this.lowg(P.x, P.y) ? 1.25 : 1); P.ground = false; P.coyote = 0; P.jumpBuf = 0; snd('jump'); P.bubbleRide = null; }
    if (!I.jump && P.vy < -90) P.vy = -90 + (P.vy + 90) * 0.4;   // let go early for a shorter hop
    if (I.takeBlow() || (I.blow && P.blowT <= 0)) if (P.blowT <= 0) this.blow(P);
    if (P.bubbleRide) { const b = P.bubbleRide; if (!this.bubbles.includes(b) || Math.abs(P.x - b.x) > BR + 5) P.bubbleRide = null; else { P.y = b.y - BR + 2; P.vy = b.vy; P.x += b.vx * dt; P.ground = true; } }
    const mv = this.move(P, dt);
    if (!P.bubbleRide) P.ground = mv.ground; else P.coyote = 0.08;
    if (P.ground) P.coyote = 0.08; else if (P.coyote > 0) P.coyote -= dt;
    if (P.wrapped) { P.wrapped = false; }
    if (P.dropRow != null && P.y > P.dropRow * TILE + 3) P.dropRow = null;
    // touching aliens kills
    if (P.invuln <= 0) for (const f of this.foes) if ((f.state === 'walk' || f.state === 'angry') && Math.abs(f.x - P.x) < (f.w + P.w) / 2 - 2 && Math.abs((f.y - f.h / 2) - (P.y - P.h / 2)) < (f.h + P.h) / 2 - 2) { this.killPlayer(); break; }
    if (P.invuln <= 0 && !P.dead) for (const s of this.shots) if (s.harm && Math.abs(s.x - P.x) < (s.r + P.w / 2) && Math.abs(s.y - (P.y - P.h / 2)) < (s.r + P.h / 2)) { this.killPlayer(); s.dead = true; break; }
    if (P.invuln <= 0 && !P.dead && this.chaser && Math.hypot(this.chaser.x - P.x, this.chaser.y - (P.y - 7)) < 13) this.killPlayer();
  };
  Game.killPlayer = function () {
    const P = this.P;
    if (P.dead || P.invuln > 0 || (G.debug && G.debug.god)) return;
    P.dead = true; P.deadT = 0; P.vy = -140; this.shake = 6; snd('die');
    for (let i = 0; i < 10; i++) this.parts.push({ x: P.x, y: P.y - 8, vx: U.rand(-80, 80), vy: U.rand(-120, 20), t: 0, life: 0.8, c: i % 2 ? '#fff' : '#9fe8ff' });
    if (G.audio && G.audio.music) G.audio.music('off');
  };
  Game.afterDeath = function () {
    this.lives--;
    if (this.lives <= 0) { this.state = 'over'; this.over = true; snd('gameOver'); if (G.main) G.main.gameOver(this); return; }
    const sp = this.room.spawn, P = this.P;
    Object.assign(P, { x: sp[0], y: sp[1], vx: 0, vy: 0, dead: false, deadT: 0, invuln: 2.6, ground: true });
    this.perks.speed = this.perks.rapid = this.perks.range = 0;
    for (const f of this.foes) if (f.state === 'walk') f.cd = Math.max(f.cd, 1);
    if (G.audio && G.audio.music) G.audio.music(this.room.boss ? 'boss' : 'play', G.levels.WORLDS[this.world].music);
  };

  /* ---------- bubbles ---------- */
  Game.spawnBubble = function (kind, x, y, extra) {
    const b = Object.assign({ x, y, r: BR, vx: 0, vy: -20, state: 'float', age: 0, enemy: null, kind, life: 14, bob: Math.random() * 6, safe: 0 }, extra || {});
    this.bubbles.push(b); return b;
  };
  Game.popBubble = function (b, byPlayer) {
    if (b.dead) return;
    b.dead = true;
    snd('pop');
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; this.parts.push({ x: b.x, y: b.y, vx: Math.cos(a) * 55, vy: Math.sin(a) * 55, t: 0, life: 0.35, c: '#bfeaff', ring: true }); }
    if (b.enemy) { const f = b.enemy; this.comboT = 1.1; this.combo = Math.min(this.combo + 1, 6); const pts = 1000 * Math.pow(2, this.combo - 1); this.killFoe(f, pts, b.x, b.y); }
    else if (b.kind === 'letter') this.collectLetter(b);
    else if (b.kind === 'coolant' || b.kind === 'arc' || b.kind === 'plasma') this.blast(b.kind, b.x, b.y);
    else if (byPlayer) this.addScore(10);
    // chain reaction
    for (const o of this.bubbles) if (!o.dead && o !== b && !o.pending && Math.hypot(o.x - b.x, o.y - b.y) < BR * 2 + 4 && o.kind === 'air') o.pending = 0.07;
  };
  Game.killFoe = function (f, pts, x, y) {
    if (f.dead) return;
    f.dead = true; f.state = 'dead';
    this.addScore(pts, x, y - 6);
    const w = this.world, r = Math.random();
    let kind = 'snack';
    if (r < 0.07) kind = 'candy'; else if (r < 0.085) kind = 'warp';
    const it = { x, y: y + 6, vx: U.rand(-24, 24), vy: -90, kind, w: 10, h: 10, age: 0, bounce: 2, spr: Math.floor(Math.random() * 10), val: 400 + w * 120 + Math.floor(Math.random() * 3) * 100 };
    if (kind === 'candy') it.sub = ['speed', 'rapid', 'range'][Math.floor(Math.random() * 3)];
    this.items.push(it);
    for (let i = 0; i < 8; i++) this.parts.push({ x, y, vx: U.rand(-90, 90), vy: U.rand(-110, 10), t: 0, life: 0.6, c: ['#ffe27a', '#ff9a2a', '#fff'][i % 3] });
  };
  Game.collectLetter = function (b) {
    const L = this.letters, idx = b.letter;
    this.addScore(500, b.x, b.y);
    if (!L.have[idx]) L.have[idx] = 1;
    snd('letter');
    if (L.have.every(Boolean)) { L.have = [0, 0, 0, 0, 0, 0]; L.wordsDone++; L.worldDone = true; L.worlds[this.world] = 1; this.lives = Math.min(9, this.lives + 1); this.addScore(5000); snd('extend'); this.banner('EXTEND!', 2.2, 'good'); if (G.progress) { G.progress.worlds = G.progress.worlds || 0; } }
  };
  Game.blast = function (kind, x, y) {
    snd('blast');
    if (kind === 'coolant') for (const d of [-1, 1]) this.shots.push({ kind: 'wave', x, y: y + 6, vx: d * 62, vy: 0, r: 7, life: 4, t: 0, harm: false, kills: true, g: true });
    else if (kind === 'arc') for (const d of [-1, 1]) this.shots.push({ kind: 'arc', x, y, vx: d * 240, vy: 0, r: 5, life: 1.1, t: 0, harm: false, kills: true });
    else for (let i = 0; i < 4; i++) this.shots.push({ kind: 'fire', x, y, vx: U.rand(-80, 80), vy: U.rand(-150, -60), r: 5, life: 3, t: 0, harm: false, kills: true, g: true, bounce: true });
  };
  Game.updateBubbles = function (dt) {
    const P = this.P, R = this.room, ceil = 16;
    for (const b of this.bubbles) {
      if (b.dead) continue;
      b.age += dt; if (b.safe > 0) b.safe -= dt;
      if (b.pending) { b.pending -= dt; if (b.pending <= 0) { b.pending = 0; this.popBubble(b, false); continue; } }
      if (b.state === 'shot') {
        const k = Math.max(0, 1 - b.age / b.tShot); b.x += b.vx * k * dt; b.y += b.vy * dt;
        const tx = Math.floor((b.x + Math.sign(b.vx || 1) * (b.r - 1)) / TILE);
        if (this.tile(tx, Math.floor(b.y / TILE)) === 1) { b.vx = 0; b.x -= Math.sign(b.vx || 1) * 0.5; }
        if (!b.enemy && b.kind === 'air') for (const f of this.foes) if ((f.state === 'walk' || f.state === 'angry') && Math.hypot(f.x - b.x, (f.y - 6) - b.y) < b.r + 6) { b.enemy = f; f.state = 'trapped'; f.bubble = b; b.life = this.diff.trap; b.state = 'float'; b.vx *= 0.2; snd('trap'); break; }
        if (b.age >= b.tShot && b.state === 'shot') b.state = 'float';
      }
      if (b.state === 'float' || b.state === 'ceil') {
        b.bob += dt * 3;
        const targetVy = b.enemy ? -15 : -22;
        if (b.state === 'float') {
          b.vy += (targetVy - b.vy) * 3 * dt; b.vx += (Math.sin(b.bob) * 9 - b.vx) * 1.5 * dt;
          if (this.lowg(b.x, b.y)) b.vy *= 0.97;
        } else b.vy = 0;
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.y < ceil + b.r + 1) { b.y = ceil + b.r + 1; if (b.state === 'float') { b.state = 'ceil'; b.vx = (Math.random() < 0.5 ? -1 : 1) * 14; } }
        const wl = 2 * TILE + b.r, wr = (this.cols - 2) * TILE - b.r;
        if (b.x < wl) { b.x = wl; b.vx = Math.abs(b.vx) || 12; } else if (b.x > wr) { b.x = wr; b.vx = -Math.abs(b.vx) || -12; }
        // platforms hold bubbles back from drifting through the floor tiles above head: bubbles rise through platforms freely
      }
      if (b.enemy) { const f = b.enemy; f.x = b.x; f.y = b.y + 6; f.vx = f.vy = 0; }
      b.life -= dt;
      if (b.life <= 0) {
        if (b.enemy) { const f = b.enemy; b.enemy = null; f.state = 'angry'; f.angry = true; f.bubble = null; f.vy = -50; f.face = Math.random() < 0.5 ? -1 : 1; snd('free'); }
        this.popBubble(b, false); b.dead = true;
      }
    }
    // soft separation so bubbles cluster instead of stacking
    const bs = this.bubbles;
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], c = bs[j]; if (a.dead || c.dead || a.state === 'shot' || c.state === 'shot') continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0.01 && d < BR * 1.7) { const p = (BR * 1.7 - d) * 0.5; a.x -= dx / d * p * 0.4; a.y -= dy / d * p * 0.4; c.x += dx / d * p * 0.4; c.y += dy / d * p * 0.4; }
    }
    // the astronaut vs bubbles: land on top to ride, touch anywhere else to pop
    if (!P.dead) for (const b of this.bubbles) {
      if (b.dead || b.safe > 0 || (b.state === 'shot' && b.age < 0.28 && !b.enemy)) continue;
      const dx = P.x - b.x, dy = (P.y - 7) - b.y;
      if (Math.abs(dx) < b.r + 5 && Math.abs(dy) < b.r + 7) {
        if (!b.enemy && P.vy >= 0 && P.y <= b.y - b.r + 9 && P.y > b.y - b.r - 5 && b.kind === 'air') { P.bubbleRide = b; P.y = b.y - b.r + 2; }
        else this.popBubble(b, true);
      }
    }
    this.bubbles = this.bubbles.filter((b) => !b.dead);
  };

  /* ---------- aliens: 0 walker, 1 zapper (bolts), 2 drone (flyer), 3 hopper (plasma spit), 4 bomber, 5 floater, 6 charger ---------- */
  const SPEED = [34, 30, 36, 0, 28, 22, 30];
  Game.shoot = function (kind, x, y, vx, vy, extra) { this.shots.push(Object.assign({ kind, x, y, vx, vy, r: 3, life: 3, t: 0, harm: true }, extra || {})); };
  Game.walkAI = function (f, dt, speed) {
    const P = this.P, a = f.angry ? 1.9 : 1;
    f.vx = f.face * speed * a * this.diff.foe;
    const mv = this.move(f, dt);
    f.ground = mv.ground;
    if (mv.hitX) f.face = -f.face;
    if (f.ground) {
      const ax = f.x + f.face * (f.w / 2 + 3), ty = Math.floor(f.y / TILE), floorAhead = this.tile(Math.floor(ax / TILE), ty) !== 0;
      f.edgeT = (f.edgeT || 0) - dt;
      if (!floorAhead && f.edgeT <= 0) { f.edgeT = 0.5; if (Math.random() < 0.45) f.face = -f.face; }
      f.jumpT -= dt;
      if (f.jumpT <= 0) { f.jumpT = (1.2 + Math.random() * 2) / a; if (P.y < f.y - 20 && Math.abs(P.x - f.x) < 80 && !P.dead) { f.vy = -222; f.face = P.x > f.x ? 1 : -1; f.ground = false; } else if (Math.random() < 0.12) f.face = -f.face; }
    }
  };
  Game.updateFoes = function (dt) {
    const P = this.P, wl = 2 * TILE + 7, wr = (this.cols - 2) * TILE - 7;
    for (const f of this.foes) {
      if (f.dead) continue;
      f.anim += dt;
      if (f.state === 'spawn') { f.t -= dt; if (f.t <= 0) { if (!f.warp) { f.warp = true; f.t = 0.5; snd('spawn'); } else f.state = 'walk'; } continue; }
      if (f.state === 'trapped') continue;
      const a = f.angry ? 1.9 : 1, sp = SPEED[f.type] * this.diff.foe * a;
      f.cd -= dt;
      if (f.type === 0 || f.type === 6) {
        if (f.type === 6 && !P.dead && f.ground && Math.abs(P.y - f.y) < 12 && Math.abs(P.x - f.x) < 110 && Math.sign(P.x - f.x) === f.face) f.charge = 1.2;
        if (f.charge > 0) { f.charge -= dt; this.walkAI(f, dt, SPEED[6] * 3); } else this.walkAI(f, dt, SPEED[f.type]);
      } else if (f.type === 1) {
        this.walkAI(f, dt, SPEED[1]);
        if (f.cd <= 0 && !P.dead && Math.abs(P.y - f.y) < 14 && Math.sign(P.x - f.x) === f.face && Math.abs(P.x - f.x) < 150) { f.cd = 2.2 / a; this.shoot('bolt', f.x + f.face * 8, f.y - 6, f.face * 110, 0, { life: 2.2 }); snd('zap'); }
      } else if (f.type === 2 || f.type === 5) {
        const home = f.type === 5 ? 18 : 6; f.vx += Math.sign(P.x - f.x) * home * dt; f.vy += Math.sign((P.y - 8) - f.y) * home * dt;
        const m = Math.hypot(f.vx, f.vy) || 1, v = (f.type === 5 ? SPEED[5] : SPEED[2]) * this.diff.foe * a; f.vx = f.vx / m * v; f.vy = f.vy / m * v;
        f.x += f.vx * dt; f.y += f.vy * dt;
        if (f.x < wl) { f.x = wl; f.vx = Math.abs(f.vx); } else if (f.x > wr) { f.x = wr; f.vx = -Math.abs(f.vx); }
        if (f.y < 16 + f.h) { f.y = 16 + f.h; f.vy = Math.abs(f.vy); } else if (f.y > FIELD_H - 10) { f.y = FIELD_H - 10; f.vy = -Math.abs(f.vy); }
        f.face = f.vx >= 0 ? 1 : -1;
      } else if (f.type === 3) {
        const mv = this.move(f, dt); f.ground = mv.ground; if (mv.hitX) f.face = -f.face;
        if (f.ground) { f.vx = 0; f.jumpT -= dt; if (f.jumpT <= 0) { f.jumpT = (1 + Math.random() * 1.2) / a; f.vy = -208; f.face = P.x > f.x ? 1 : -1; f.vx = f.face * 48 * this.diff.foe * a; } }
        if (f.cd <= 0 && !P.dead && Math.abs(P.x - f.x) < 110 && Math.abs(P.y - f.y) < 40) { f.cd = 2.4 / a; f.face = P.x > f.x ? 1 : -1; this.shoot('ball', f.x + f.face * 7, f.y - 7, f.face * 72, -40, { g: true, life: 3 }); snd('zap'); }
      } else if (f.type === 4) {
        this.walkAI(f, dt, SPEED[4]);
        if (f.cd <= 0 && !P.dead && Math.abs(P.x - f.x) < 130) { f.cd = 2.6 / a; this.shoot('bomb', f.x + f.face * 6, f.y - 10, (P.x > f.x ? 1 : -1) * 48, -128, { g: true, r: 4, life: 4 }); snd('zap'); }
      }
    }
    this.foes = this.foes.filter((f) => !f.dead);
  };

  /* ---------- projectiles, blasts, items ---------- */
  Game.updateShots = function (dt) {
    for (const s of this.shots) {
      s.t += dt; if (s.t > s.life) { s.dead = true; if (s.kind === 'bomb') this.explode(s); continue; }
      if (s.g) s.vy += GRAV * (s.kind === 'wave' ? 0.7 : 0.45) * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const tx = Math.floor(s.x / TILE), ty = Math.floor(s.y / TILE);
      if (s.kind === 'ball' || s.kind === 'bolt') { if (this.tile(tx, ty) === 1 || (s.kind === 'ball' && s.vy > 0 && this.tile(tx, Math.floor((s.y + 3) / TILE)) !== 0)) s.dead = true; }
      else if (s.kind === 'orb' || s.kind === 'ice') { if (this.tile(tx, ty) === 1 || (s.land && s.vy > 0 && this.tile(tx, Math.floor((s.y + s.r) / TILE)) !== 0)) s.dead = true; }
      else if (s.kind === 'bomb') { if (s.vy > 0 && this.tile(tx, Math.floor((s.y + 4) / TILE)) !== 0) { s.dead = true; this.explode(s); } else if (this.tile(tx, ty) === 1) s.vx = -s.vx; }
      else if (s.kind === 'wave') {
        if (this.tile(tx, Math.floor((s.y + 4) / TILE)) !== 0 && s.vy > 0) { s.y = Math.floor((s.y + 4) / TILE) * TILE - 4; s.vy = 0; }
        if (this.tile(Math.floor((s.x + Math.sign(s.vx) * 6) / TILE), ty) === 1) s.vx = -s.vx;
        if (s.y > FIELD_H + 10) s.dead = true;
      } else if (s.kind === 'arc') { if (this.tile(tx, ty) === 1) s.dead = true; }
      else if (s.kind === 'fire') { if (s.vy > 0 && this.tile(tx, Math.floor((s.y + 4) / TILE)) !== 0) { s.y = Math.floor((s.y + 4) / TILE) * TILE - 4; s.vy = -Math.abs(s.vy) * 0.55; if (Math.abs(s.vy) < 25) s.vy = -70; } if (this.tile(Math.floor((s.x + Math.sign(s.vx || 1) * 5) / TILE), ty) === 1) s.vx = -s.vx; if (s.y > FIELD_H) s.dead = true; }
      if (s.kills) for (const f of this.foes) if (!f.dead && f.state !== 'spawn' && Math.hypot(f.x - s.x, (f.y - 6) - s.y) < s.r + 7) { if (f.bubble) f.bubble.dead = true; this.killFoe(f, 2000, f.x, f.y); }
    }
    this.shots = this.shots.filter((s) => !s.dead);
  };
  Game.explode = function (s) { snd('boom'); this.shake = 3; this.shots.push({ kind: 'boom', x: s.x, y: s.y, vx: 0, vy: 0, r: 13, life: 0.35, t: 0, harm: true }); };
  Game.updateItems = function (dt) {
    const P = this.P;
    for (const it of this.items) {
      it.age += dt; const vy0 = it.vy;
      const mv = this.move(it, dt); it.ground = mv.ground;
      if (mv.ground) { if (it.bounce > 0 && vy0 > 90) { it.vy = -vy0 * 0.42; it.bounce--; } it.vx *= 1 - 5 * dt; }
      if (!P.dead && Math.abs(it.x - P.x) < 10 && Math.abs((it.y - 5) - (P.y - 7)) < 11) { this.collect(it); it.dead = true; continue; }
      if (it.age > 12) it.dead = true;
    }
    this.items = this.items.filter((i) => !i.dead);
  };
  Game.collect = function (it) {
    if (it.kind === 'snack') { this.addScore(it.val, it.x, it.y - 6); snd('item'); }
    else if (it.kind === 'candy') { this.perks[it.sub] = 28; this.addScore(300, it.x, it.y - 6); snd('power'); this.float(this.P.x, this.P.y - 24, it.sub === 'speed' ? 'SPEED UP' : it.sub === 'rapid' ? 'RAPID FIRE' : 'LONG RANGE', '#7dffb8'); }
    else if (it.kind === 'warp') this.warp(3);
    else if (it.kind === 'life') { this.lives = Math.min(9, this.lives + 1); snd('extend'); this.banner('EXTRA LIFE', 1.5); }
  };
  Game.warp = function (n) {
    if (this.state !== 'play' || this.room.boss) return;
    const nextBoss = Math.ceil(this.level / 10) * 10, target = Math.min(this.level + n, nextBoss);
    if (target <= this.level) return;
    snd('warp'); this.banner('WARP DRIVE', 1.6, 'good');
    for (const f of this.foes) { if (f.bubble) f.bubble.dead = true; this.killFoe(f, 300, f.x, f.y); }
    this.nextLevel = target; this.state = 'clear'; this.clearT = 1.8;
  };

  /* ---------- hurry-up, letters, level flow ---------- */
  Game.updateFlow = function (dt) {
    const P = this.P, room = this.room;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    this.timer += dt;
    if (!this.bossObj) {
      if (!this.hurry && this.timer > this.diff.hurry) { this.hurry = 1; this.banner('HURRY UP!', 2.2, 'bad'); snd('hurry'); for (const f of this.foes) if (f.state !== 'trapped') f.angry = true; if (G.audio && G.audio.music) G.audio.music('hurry', G.levels.WORLDS[this.world].music); }
      if (this.hurry && !this.chaser && this.timer > this.diff.hurry + 16) { this.chaser = { x: room.cols * TILE / 2, y: 22, vx: 0, vy: 0, t: 0 }; this.banner('THE VOID MAW', 2, 'bad'); snd('maw'); }
      if (this.hurry) for (const f of this.foes) if (f.state === 'walk') f.angry = true;
      this.letterT -= dt;
      const L = this.letters, lvl = this.level - this.world * 10;
      if (this.letterT <= 0) {
        this.letterT = 11 + Math.random() * 8;
        const idx = L.have.indexOf(0);
        if (idx >= 0 && lvl < 10 && !L.worldDone && !this.bubbles.some((b) => b.kind === 'letter') && Math.random() < 0.85) this.spawnBubble('letter', (4 + Math.random() * (this.cols - 8)) * TILE, 22, { letter: idx, life: 16, vy: 14, r: 9 });
      }
      if (this.chaser) { const c = this.chaser; c.t += dt; const a = Math.atan2((P.y - 7) - c.y, P.x - c.x), sp = 30 + Math.min(34, (this.timer - this.diff.hurry - 16) * 1.2); c.vx = Math.cos(a) * sp; c.vy = Math.sin(a) * sp; c.x += c.vx * dt; c.y += c.vy * dt; }
    }
    this.giftT = (this.giftT === undefined ? 14 : this.giftT) - dt;
    if (this.giftT <= 0 && !this.bossObj) { this.giftT = 22 + Math.random() * 18; if (this.level > 4 && Math.random() < 0.7) this.spawnBubble(['coolant', 'arc', 'plasma'][Math.floor(Math.random() * 3)], (5 + Math.random() * (this.cols - 10)) * TILE, 24, { life: 14, vy: 12, r: 9 }); }
    if (!this.bossObj && this.foes.length === 0) {
      this.state = 'clear'; this.clearT = 2.8; this.nextLevel = this.level + 1; this.addScore(Math.max(0, Math.round(3000 - this.timer * 40)), P.x, P.y - 20); this.banner('ROUND CLEAR', 2.2, 'good'); snd('clear');
    }
  };
  Game.update = function (dt, I) {
    this.time += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 14 * dt);
    if (this.bannerO) { this.bannerO.t += dt; if (this.bannerO.t > this.bannerO.life) this.bannerO = null; }
    for (const p of this.parts) { p.t += dt; p.vy += (p.ring ? 0 : 220) * dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    this.parts = this.parts.filter((p) => p.t < p.life);
    for (const f of this.floats) { f.t += dt; f.y -= 16 * dt; }
    this.floats = this.floats.filter((f) => f.t < 1);
    if (this.state === 'over' || this.state === 'ending') return;
    if (this.state === 'intro') { this.introT -= dt; if (this.introT <= 0) this.state = 'play'; this.updatePlayer(dt, I); return; }
    this.updatePlayer(dt, I);
    this.updateBubbles(dt);
    this.updateFoes(dt);
    if (G.boss && this.room.boss) G.boss.update(this, dt);
    this.updateShots(dt);
    this.updateItems(dt);
    if (this.state === 'play') this.updateFlow(dt);
    else if (this.state === 'clear') {
      this.clearT -= dt;
      if (this.clearT <= 0) { if (this.nextLevel > G.levels.TOTAL) { this.state = 'ending'; if (G.main) G.main.ending(this); } else this.loadLevel(this.nextLevel); }
    }
  };
})((window.SGS = window.SGS || {}));
