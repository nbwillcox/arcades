/* The simulation: marble physics on the tile world, traps, enemies, pickups, timer. DOM-free (the game layer turns the events it emits into sound and effects). */
(function (G) {
  'use strict';
  const C = G.C, S = C.S, U = G.U, TAU = U.TAU, BIT = G.World.BIT;
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  const clamp = U.clamp;
  const isFrag = (s) => s === S.CRUMBLE || s === S.GLASS;                       /* tiles that crack and fall: crumbling slabs and fragile glass */

  function Sim(level, opts) {
    opts = opts || {};
    this.level = level;
    this.world = level.world;
    this.god = !!opts.god;
    this.events = [];
    this.t = 0;
    this.limit = level.time + (opts.bonusTime || 0);
    this.time = this.limit;
    this.state = 'ready';                                       /* ready -> play -> finish | timeup */
    this.score = 0;
    this.deaths = 0; this.falls = 0; this.kills = 0;
    this.pi = 0; this.best = 0;                                 /* path progress */
    this.path = level.path;
    this.posts = [];
    this.bolts = [];
    const st = level.start;
    this.m = {
      x: st.x, y: st.y, z: this.world.heightAt(st.x, st.y), vx: 0, vy: 0, vz: 0, r: C.R, grounded: true, rate: 0,
      integ: 1, dead: false, deadT: 0, falling: false, inv: 1.2, onSurf: 0, spin: 0, rollx: 0, rolly: 0, hitCd: 0, air: 0, stuck: 0, finishT: 0, trail: [],
    };
    this.m.z = this.world.heightAt(st.x, st.y);
    this.foes = [];
    this.hz = [];
    this.gems = level.gems.map((g) => Object.assign({ z: this.world.heightAt(g.x, g.y) + 0.45, taken: false, t: Math.random() * 6 }, g));
    for (const f of level.foes) this.addFoe(f);
    for (const h of level.haz) this.addHaz(h);
    this.in = { wx: 0, wy: 0 };
  }
  const P = Sim.prototype;
  P.emit = function (type, d) { this.events.push(Object.assign({ type }, d)); };
  P.start = function () { this.state = 'play'; this.emit('go', {}); };

  /* ================= setup ================= */
  P.addFoe = function (f) {
    const W = this.world, z = W.heightAt(f.x, f.y);
    const e = { type: f.type, x: f.x, y: f.y, z: isFinite(z) ? z : 0, vx: 0, vy: 0, vz: 0, r: 0.3, alive: true, grounded: true, rate: 0, t: Math.random() * 6, patrol: f.patrol || null, pi: 0, dir: 1, face: 0, cd: 0, hp: 1, home: { x: f.x, y: f.y }, range: f.range || 7, spawn: 0 };
    if (f.type === 'orb') { e.r = 0.3; }
    else if (f.type === 'muncher') { e.r = 0.36; e.speed = f.speed || 1.9; }
    else if (f.type === 'coil') { e.r = 0.34; e.speed = f.speed || 1.5; }
    else if (f.type === 'vacuum') { e.r = 0.42; e.speed = f.speed || 1.0; e.suck = f.suck || 2.7; }
    this.foes.push(e);
  };
  P.addHaz = function (d) {
    const W = this.world, h = Object.assign({ t: 0, phase: 0 }, d);
    if (d.type === 'post' || d.type === 'bumper') this.posts.push({ x: d.x, y: d.y, r: d.r || 0.4, z0: W.heightAt(d.x, d.y), h: d.h || 1.2, bump: d.type === 'bumper', pulse: 0 });
    else {
      if (d.type === 'laser') { h.z = (d.z !== undefined ? d.z : W.heightAt(d.x, d.y)) + 0.4; h.period = d.period || 3; h.on = d.on || 1.3; h.warn = 0.55; }
      else if (d.type === 'crusher') { h.w = d.w || 2; h.h = d.h || 2; h.gz = W.heightAt(d.x + h.w / 2, d.y + h.h / 2); h.top = 3.2; h.hz = h.top; h.period = d.period || 3.4; h.pstate = 0; }
      else if (d.type === 'spikes') { h.cells = d.cells; h.period = d.period || 3; h.out = 0; h.state = 0; }
      else if (d.type === 'sweeper') { h.z = W.heightAt(d.x, d.y); h.len = d.len || 2.2; h.speed = d.speed || 1.6; h.ang = d.phase || 0; h.arms = d.arms || 1; }
      else if (d.type === 'gate' || d.type === 'lift') { h.base = d.cells.map(([cx, cy]) => W.idx(cx, cy)); h.k = 0; h.period = d.period || 4; }
      else if (d.type === 'turret') { h.period = d.period || 2.4; h.cd = (d.phase || 0) % h.period; h.z = W.heightAt(d.x, d.y) + 0.35; h.speed = d.speed || 5.5; }
      else if (d.type === 'mine') { h.z = (d.z !== undefined ? d.z : W.heightAt(d.x, d.y)) + 0.5; h.gone = false; }
      this.hz.push(h);
    }
  };

  /* ================= helpers ================= */
  P.hurt = function (amount, cause) {
    const m = this.m;
    if (m.dead || this.god || m.inv > 0 || this.state === 'finish') return;
    m.integ -= amount; m.inv = 0.55;
    if (m.integ <= 0.001) { this.shatter(cause); return; }
    this.emit('crack', { stage: m.integ < 0.34 ? 2 : m.integ < 0.67 ? 1 : 0, cause, x: m.x, y: m.y, z: m.z, integ: m.integ });
  };
  P.shatter = function (cause) {
    const m = this.m;
    if (m.dead || this.god) return;
    m.dead = true; m.deadT = 0; m.integ = 0; this.deaths++;
    this.emit('shatter', { cause, x: m.x, y: m.y, z: m.z + C.R, vx: m.vx, vy: m.vy });
  };
  P.respawn = function () {
    const m = this.m, W = this.world;
    let i = Math.max(0, this.pi - 3);
    for (; i > 0; i--) { const p = this.path[i]; if (p.safe && !p.air && isFinite(W.heightAt(p.x, p.y)) && !isFrag(W.surf[W.idx(Math.floor(p.x), Math.floor(p.y))])) break; }
    const p = this.path[i] || this.level.start;
    m.x = p.x; m.y = p.y; m.z = W.heightAt(p.x, p.y); m.vx = m.vy = m.vz = 0; m.grounded = true; m.rate = 0;
    m.integ = 1; m.dead = false; m.falling = false; m.inv = 1.6; m.trail.length = 0;
    this.pi = i;
    for (const e of this.foes) if (e.alive && Math.hypot(e.x - m.x, e.y - m.y) < 2.5) { const a = Math.atan2(e.y - m.y, e.x - m.x); e.x = m.x + Math.cos(a) * 3; e.y = m.y + Math.sin(a) * 3; }
    this.emit('respawn', { x: m.x, y: m.y, z: m.z });
  };

  /* ================= per-tick ================= */
  P.step = function (dt, inp) {
    this.events.length = 0;
    this.in = inp || this.in;
    const n = Math.max(1, Math.ceil(dt / (1 / 200)));
    for (let k = 0; k < n; k++) this.sub(dt / n);
  };

  P.sub = function (dt) {
    const m = this.m, W = this.world;
    this.t += dt; this.dt = dt;
    if (this.state === 'play') {
      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this.state = 'timeup'; this.emit('timeup', {}); }
    }
    m.inv = Math.max(0, m.inv - dt); m.hitCd = Math.max(0, m.hitCd - dt);
    this.updateHazards(dt);
    this.updateCrumble(dt);
    if (m.dead) {
      m.deadT += dt;
      if (m.deadT > 1.7 && this.state === 'play') this.respawn();
      this.updateFoes(dt);
      return;
    }
    if (m.falling) {
      m.vz -= C.G_AIR * dt; m.z += m.vz * dt; m.x += m.vx * dt; m.y += m.vy * dt;
      m.deadT += dt;
      if (m.deadT > 1.5 && this.state === 'play') { this.falls++; this.respawn(); }
      return;
    }
    let wx = 0, wy = 0;
    if (this.state === 'play') {
      if (this.bot || (G.debug && G.debug.bot)) { const b = this.botInput(); wx = b.wx; wy = b.wy; } else { wx = this.in.wx; wy = this.in.wy; }
    }
    const mag = Math.hypot(wx, wy);
    if (mag > 1) { wx /= mag; wy /= mag; }
    this.moveBody(m, dt, wx, wy, true);
    if (this.state === 'finish') {
      m.finishT += dt;
      m.vx *= Math.exp(-3.2 * dt); m.vy *= Math.exp(-3.2 * dt);
    }
    this.trackPath();
    this.checkGoal();
    this.updatePickups(dt);
    this.updateFoes(dt);
    if (m.z < W.zmin - 9 && !m.falling) this.fall();
  };

  P.fall = function () {
    const m = this.m;
    if (m.falling || m.dead) return;
    m.falling = true; m.deadT = 0;
    this.emit('fall', { x: m.x, y: m.y, z: m.z });
  };

  /* ================= marble & ball physics ================= */
  /* ax, ay: steering in -1..1 for the marble, raw acceleration (units/s^2) for enemies. */
  P.moveBody = function (b, dt, ax, ay, isMarble) {
    const W = this.world, R = b.r;
    let k = C.FRIC, steer = 1, extraX = 0, extraY = 0, surf = S.NORMAL;
    if (isMarble) { ax *= C.ACC; ay *= C.ACC; }
    if (b.grounded) {
      const ci = W.idx(Math.floor(b.x), Math.floor(b.y));
      if (ci >= 0 && W.kind[ci] === 1) {
        surf = W.surf[ci];
        extraX = -C.G_SLOPE * W.sx[ci]; extraY = -C.G_SLOPE * W.sy[ci];
        if (surf === S.ICE) { k = 0.1; steer = 0.5; }
        else if (surf === S.GOO) { k = 5.2; steer = 0.9; }
        else if (surf === S.ACID) { k = 2.4; steer = 0.8; }
        else if (surf === S.BOOST) { const d = DIRS[W.aux[ci] & 3]; extraX += d[0] * 24; extraY += d[1] * 24; }
        else if (surf === S.CONVEY) { const d = DIRS[W.aux[ci] & 3]; extraX += d[0] * 8.5; extraY += d[1] * 8.5; }
        else if (surf === S.GLASS) { k = 0.7; }
        if (isMarble) b.onSurf = surf;
      }
      ax = ax * steer + extraX; ay = ay * steer + extraY;
      b.vx += ax * dt; b.vy += ay * dt;
      const f = Math.exp(-k * dt); b.vx *= f; b.vy *= f;
    } else {
      b.vx += ax * C.AIR_CTL * dt; b.vy += ay * C.AIR_CTL * dt;
      const f = Math.exp(-0.05 * dt); b.vx *= f; b.vy *= f;
    }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > C.MAXV) { b.vx *= C.MAXV / sp; b.vy *= C.MAXV / sp; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    this.collide(b, isMarble);

    /* vertical */
    const g = W.heightAt(b.x, b.y);
    const ci = W.idx(Math.floor(b.x), Math.floor(b.y));
    const rateNew = ci >= 0 && g > -Infinity ? b.vx * W.sx[ci] + b.vy * W.sy[ci] : 0;
    if (b.grounded) {
      if (g === -Infinity) { b.grounded = false; b.vz = b.rate; }
      else {
        const dz = g - b.z;
        if (dz >= -1e-4) {
          if (b.rate - rateNew > C.LAUNCH && dz < 0.1) { b.grounded = false; b.vz = b.rate; if (isMarble) this.emit('launch', { x: b.x, y: b.y, z: b.z, v: sp }); }
          else { b.z = g; b.rate = rateNew; }
        } else {
          const tol = Math.max(Math.abs(rateNew), Math.abs(b.rate)) * dt * 1.4 + 0.03;
          if (-dz <= tol) { b.z = g; b.rate = rateNew; }
          else { b.grounded = false; b.vz = b.rate; }
        }
      }
    }
    if (!b.grounded) {
      b.vz -= C.G_AIR * dt; b.z += b.vz * dt;
      b.air = (b.air || 0) + dt;
      if (g > -Infinity && b.z <= g) {
        const rel = rateNew - b.vz;
        b.z = g; b.air = 0;
        if (isMarble) this.landed(b, rel, ci);
        if (rel > 3.2) { b.vz = rateNew + rel * (isMarble ? 0.26 : 0.2); b.grounded = false; b.rate = rateNew; }
        else { b.grounded = true; b.vz = 0; b.rate = rateNew; }
        if (b.grounded && isMarble) this.touchSurface(b, ci);
      }
    } else if (isMarble) this.touchSurface(b, ci);
    b.rollx = (b.rollx || 0) + b.vx * dt / R; b.rolly = (b.rolly || 0) + b.vy * dt / R;
  };

  P.landed = function (b, rel, ci) {
    if (rel < C.HIT_SOFT * 0.55) return;
    const W = this.world, e = { rel, x: b.x, y: b.y, z: b.z, surf: ci >= 0 ? W.surf[ci] : 0 };
    if (ci >= 0 && isFrag(W.surf[ci])) { W.crack[ci] = Math.min(1, W.crack[ci] + (W.surf[ci] === S.GLASS ? clamp((rel - 3) / 6, 0.35, 1) : clamp((rel - 4) / 10, 0.15, 1))); this.emit('tilehit', { i: ci, rel, x: b.x, y: b.y, z: b.z, glass: W.surf[ci] === S.GLASS }); }
    if (rel >= C.HIT_BREAK) { this.emit('land', Object.assign({ level: 3 }, e)); this.shatter('impact'); }
    else if (rel >= C.HIT_HARD) { this.emit('land', Object.assign({ level: 2 }, e)); this.hurt(0.34, 'impact'); }
    else if (rel >= C.HIT_SOFT) this.emit('land', Object.assign({ level: 1 }, e));
    else this.emit('land', Object.assign({ level: 0 }, e));
  };

  P.touchSurface = function (b, ci) {
    if (ci < 0) return;
    const W = this.world, s = W.surf[ci];
    if (s === S.BOUNCE && b.grounded) { b.grounded = false; b.vz = 10.2; this.emit('bounce', { x: b.x, y: b.y, z: b.z }); }
    else if (s === S.ACID && !this.god) { b.integ -= 0.2 * this.dt; if (b.integ <= 0.001) this.shatter('acid'); else if (Math.random() < 0.06) this.emit('acid', { x: b.x, y: b.y, z: b.z }); }
  };

  /* terrain walls, guard rails and posts push the ball out */
  P.collide = function (b, isMarble) {
    const W = this.world, R = b.r;
    const cx = Math.floor(b.x), cy = Math.floor(b.y);
    let worst = 0, nxw = 0, nyw = 0, kind = 0;
    const bounce = (nx, ny, e, what) => {
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) { b.vx -= (1 + e) * vn * nx; b.vy -= (1 + e) * vn * ny; if (-vn > worst) { worst = -vn; nxw = nx; nyw = ny; kind = what; } }
    };
    for (let j = cy - 1; j <= cy + 1; j++) for (let i = cx - 1; i <= cx + 1; i++) {
      const ci = W.idx(i, j);
      if (ci < 0 || W.kind[ci] !== 1) continue;
      /* a raised neighbour is a wall */
      if (!(i === cx && j === cy)) {
        const qx = clamp(b.x, i, i + 1), qy = clamp(b.y, j, j + 1), dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
        if (d2 < R * R) {
          const gp = W.hz[ci] + W.sx[ci] * (qx - i) + W.sy[ci] * (qy - j) + W.dz[ci];
          if (gp > b.z + C.STEPH) {
            const d = Math.sqrt(d2) || 1e-6, nx = d2 > 1e-10 ? dx / d : 0, ny = d2 > 1e-10 ? dy / d : 0;
            if (d2 > 1e-10) { b.x += nx * (R - d); b.y += ny * (R - d); bounce(nx, ny, 0.32, 1); }
          }
        }
      }
      /* guard rails of this cell */
      const rm = W.rail[ci];
      if (rm) {
        const plane = (px, py) => W.hz[ci] + W.sx[ci] * (px - i) + W.sy[ci] * (py - j) + W.dz[ci];
        for (let bit = 1; bit <= 8; bit <<= 1) {
          if (!(rm & bit)) continue;
          let x0 = i, x1 = i + 1, y0 = j, y1 = j + 1;
          if (bit === BIT.N) y1 = j + C.RAIL_T; else if (bit === BIT.S) y0 = j + 1 - C.RAIL_T; else if (bit === BIT.E) x0 = i + 1 - C.RAIL_T; else x1 = i + C.RAIL_T;
          const qx = clamp(b.x, x0, x1), qy = clamp(b.y, y0, y1), dx = b.x - qx, dy = b.y - qy, d2 = dx * dx + dy * dy;
          if (d2 >= R * R) continue;
          if (b.z + R * 0.45 > plane(qx, qy) + C.RAIL_H) continue;                  /* sailing over the top */
          let nx, ny, d;
          if (d2 > 1e-10) { d = Math.sqrt(d2); nx = dx / d; ny = dy / d; }
          else { nx = bit === BIT.E ? -1 : bit === BIT.W ? 1 : 0; ny = bit === BIT.S ? -1 : bit === BIT.N ? 1 : 0; d = 0; if (bit === BIT.E || bit === BIT.W) nx = b.x > (x0 + x1) / 2 ? 1 : -1; else ny = b.y > (y0 + y1) / 2 ? 1 : -1; }
          b.x += nx * (R - d); b.y += ny * (R - d);
          bounce(nx, ny, 0.4, 2);
        }
      }
    }
    for (const p of this.posts) {
      const dx = b.x - p.x, dy = b.y - p.y, d2 = dx * dx + dy * dy, rr = R + p.r;
      if (d2 < rr * rr && b.z < p.z0 + p.h && b.z + 2 * R > p.z0) {
        const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
        b.x += nx * (rr - d); b.y += ny * (rr - d);
        if (p.bump) {
          const vn = b.vx * nx + b.vy * ny, kick = Math.max(7.5, -vn * 1.15 + 4);
          b.vx += (kick - vn) * nx; b.vy += (kick - vn) * ny; p.pulse = 1;
          if (isMarble) this.emit('bumper', { x: p.x, y: p.y, z: b.z, strength: kick });
        } else bounce(nx, ny, 0.45, 3);
      }
    }
    if (isMarble && worst > 2.2) {
      this.emit('bump', { speed: worst, x: b.x, y: b.y, z: b.z, nx: nxw, ny: nyw, kind });
      if (worst > 11.5) this.hurt(0.3, 'bump');
    }
  };

  /* ================= tiles that crumble ================= */
  P.updateCrumble = function (dt) {
    const W = this.world, m = this.m;
    if (!this.hasCrumble) { this.hasCrumble = (W.surf.includes(S.CRUMBLE) || W.surf.includes(S.GLASS)) ? 1 : 2; }
    if (this.hasCrumble === 2) return;
    if (m.grounded && !m.dead && !m.falling) {
      const i = W.idx(Math.floor(m.x), Math.floor(m.y));
      if (i >= 0 && W.kind[i] === 1 && isFrag(W.surf[i])) {
        const before = W.crack[i], sp = Math.hypot(m.vx, m.vy), glass = W.surf[i] === S.GLASS;
        W.crack[i] = Math.min(1, W.crack[i] + dt * (glass ? (sp > 6.8 ? 3.2 : 0.04) : 0.8 + sp * 0.03));          /* glass takes a gentle roll but shatters under speed */
        if (Math.floor(before * 4) !== Math.floor(W.crack[i] * 4)) this.emit('tilecrack', { i, k: W.crack[i], x: m.x, y: m.y, z: m.z, glass });
      }
    }
    if (this.crumbleActive === undefined || this.t - this.crumbleScan > 0.12) {
      this.crumbleScan = this.t;
      this.crumbleList = [];
      for (let i = 0; i < W.surf.length; i++) if (isFrag(W.surf[i]) && (W.crack[i] > 0 || W.regrow[i] > 0)) this.crumbleList.push(i);
      this.crumbleActive = true;
    }
    for (const i of this.crumbleList) {
      if (W.kind[i] === 1) {
        if (W.crack[i] >= 1) {
          W.kind[i] = 0; W.regrow[i] = W.surf[i] === S.GLASS ? 8.5 : 7.5;
          const x = i % W.w, y = (i / W.w) | 0;
          this.emit('tilebreak', { i, x: x + 0.5, y: y + 0.5, z: W.hz[i] + W.sx[i] * 0.5 + W.sy[i] * 0.5, glass: W.surf[i] === S.GLASS });
          for (const [dx, dy] of DIRS) { const j = W.idx(x + dx, y + dy); if (j >= 0 && W.kind[j] === 1 && isFrag(W.surf[j])) W.crack[j] = Math.max(W.crack[j], W.surf[j] === S.GLASS ? 0.4 : 0.55); }
          this.crumbleScan = -9;
        }
      } else if (W.regrow[i] > 0) {
        W.regrow[i] -= dt;
        if (W.regrow[i] <= 0) {
          const x = i % W.w, y = (i / W.w) | 0, m2 = this.m;
          if (!(Math.abs(m2.x - x - 0.5) < 0.9 && Math.abs(m2.y - y - 0.5) < 0.9 && !m2.dead)) { W.kind[i] = 1; W.crack[i] = 0; W.regrow[i] = 0; this.emit('tileform', { i, x: x + 0.5, y: y + 0.5, z: W.hz[i] }); }
          else W.regrow[i] = 0.4;
        }
      }
    }
  };

  /* ================= traps ================= */
  P.updateHazards = function (dt) {
    const m = this.m, W = this.world, t = this.t, alive = !m.dead && !m.falling && this.state !== 'finish';
    for (const p of this.posts) p.pulse = Math.max(0, p.pulse - dt * 4);
    for (const h of this.hz) {
      h.t += dt;
      const ph = h.t + h.phase;
      if (h.type === 'laser') {
        const c = ph % h.period;
        const was = h.state;
        h.state = c < h.on ? 2 : c > h.period - h.warn ? 1 : 0;
        if (h.state === 2 && was !== 2) this.emit('laser', { x: (h.x + h.x2) / 2, y: (h.y + h.y2) / 2, z: h.z });
        if (h.state === 2 && alive && segDist(m.x, m.y, h.x, h.y, h.x2, h.y2) < m.r + 0.07 && m.z < h.z + 0.25 && m.z + 2 * m.r > h.z - 0.25) this.shatter('laser');
      } else if (h.type === 'crusher') {
        const c = ph % h.period, up = h.period - 1.35;
        let z, st;
        if (c < up) { z = h.top; st = c > up - 0.7 ? 1 : 0; }                                        /* hovering, then warning */
        else if (c < up + 0.1) { z = h.top - (h.top - h.gz) * ((c - up) / 0.1); st = 2; }               /* slam */
        else if (c < up + 0.55) { z = h.gz; st = 3; }                                                 /* pressed */
        else { z = h.gz + (h.top - h.gz) * ((c - up - 0.55) / 0.8); st = 4; }                         /* rising */
        if (st === 2 && h.pstate !== 2) { /* arriving */ }
        if (st === 3 && h.pstate !== 3) this.emit('slam', { x: h.x + h.w / 2, y: h.y + h.h / 2, z: h.gz, w: h.w, h: h.h });
        h.pstate = st; h.hz = z;
        if (alive && m.x > h.x - 0.1 && m.x < h.x + h.w + 0.1 && m.y > h.y - 0.1 && m.y < h.y + h.h + 0.1 && z < m.z + 2 * m.r + 0.35 && z > m.z - 0.5 && (st === 2 || st === 3)) this.shatter('crushed');
      } else if (h.type === 'spikes') {
        const c = ph % h.period, o = c < 0.9 ? 1 : c < 1.2 ? 0 : 0;
        const ext = c < 0.9 ? 1 : 0, warn = c > h.period - 0.55;
        const pe = h.out;
        h.out = ext ? Math.min(1, h.out + dt * 9) : Math.max(0, h.out - dt * 4);
        h.warnOn = warn;
        if (pe < 0.5 && h.out >= 0.5) this.emit('spike', { x: h.x, y: h.y, z: W.heightAt(h.x, h.y) });
        if (h.out > 0.55 && alive && m.z < W.heightAt(m.x, m.y) + 0.5) for (const [cx, cy] of h.cells) if (Math.floor(m.x) === cx && Math.floor(m.y) === cy) this.shatter('spiked');
      } else if (h.type === 'sweeper') {
        h.ang += h.speed * dt;
        const arms = h.arms;
        for (let a = 0; a < arms; a++) {
          const an = h.ang + a * Math.PI;
          for (let s = 0.5; s <= h.len + 0.01; s += 0.34) {
            const px = h.x + Math.cos(an) * s, py = h.y + Math.sin(an) * s;
            const dx = m.x - px, dy = m.y - py, d2 = dx * dx + dy * dy, rr = m.r + 0.2;
            if (alive && d2 < rr * rr && m.z < h.z + 0.9 && m.z + 2 * m.r > h.z) {
              const d = Math.sqrt(d2) || 1e-6, nx = dx / d, ny = dy / d;
              m.x += nx * (rr - d); m.y += ny * (rr - d);
              const tvx = -Math.sin(an) * h.speed * s, tvy = Math.cos(an) * h.speed * s;
              m.vx = m.vx * 0.3 + tvx * 1.05 + nx * 3.5; m.vy = m.vy * 0.3 + tvy * 1.05 + ny * 3.5;
              if (m.hitCd <= 0) { m.hitCd = 0.25; this.emit('sweep', { x: m.x, y: m.y, z: m.z, speed: h.speed * s }); this.hurt(0.2, 'sweeper'); }
            }
          }
        }
      } else if (h.type === 'gate' || h.type === 'lift') {
        let target;
        if (h.type === 'gate') {
          const open = (ph % h.period) < h.period * (h.openFrac || 0.5);
          let blocked = false;
          if (!open) for (const i of h.base) if (i >= 0) { const gx = i % W.w, gy = (i / W.w) | 0; if (m.x > gx - 0.4 && m.x < gx + 1.4 && m.y > gy - 0.4 && m.y < gy + 1.4 && !m.dead) blocked = true; }
          target = open || blocked ? 0 : (h.rise || 1.5);
          if (h.k !== target && Math.abs(target - h.k) > 0.01 && (target > 0) !== (h.lastT > 0)) this.emit(target > 0 ? 'gateclose' : 'gateopen', { x: h.cells[0][0] + 0.5, y: h.cells[0][1] + 0.5, z: W.heightAt(h.cells[0][0] + 0.5, h.cells[0][1] + 0.5) });
          h.lastT = target;
          h.k += clamp(target - h.k, -dt * 7, dt * 7);
        } else {
          h.k = (h.amp || 1.6) * (0.5 - 0.5 * Math.cos(ph / h.period * TAU));
        }
        for (const i of h.base) if (i >= 0) W.dz[i] = h.k;
      } else if (h.type === 'turret') {
        h.cd -= dt;
        if (h.cd <= 0) {
          h.cd += h.period;
          const d = DIRS[h.dir || 0];
          this.bolts.push({ x: h.x + d[0] * 0.6, y: h.y + d[1] * 0.6, vx: d[0] * h.speed, vy: d[1] * h.speed, z: h.z, life: 4.5, rr: 0.2 });
          this.emit('shoot', { x: h.x, y: h.y, z: h.z });
        }
      } else if (h.type === 'mine') {
        if (!h.gone && alive && Math.hypot(m.x - h.x, m.y - h.y) < m.r + 0.42 && Math.abs(m.z + m.r - h.z) < 0.9) {
          h.gone = true; this.emit('mine', { x: h.x, y: h.y, z: h.z }); this.shatter('mine');
        }
      }
    }
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      const g = W.heightAt(b.x, b.y);
      b.z += ((g === -Infinity ? b.z : g + 0.35) - b.z) * Math.min(1, dt * 6);
      let dead = b.life <= 0;
      if (!dead && g > -Infinity) { const ci = W.idx(Math.floor(b.x), Math.floor(b.y)); if (W.rail[ci] && false) dead = true; }
      if (!dead && alive && Math.hypot(m.x - b.x, m.y - b.y) < m.r + b.rr && Math.abs(m.z + m.r - b.z) < 0.7) { dead = true; m.vx += b.vx * 0.5; m.vy += b.vy * 0.5; this.emit('boltHit', { x: b.x, y: b.y, z: b.z }); this.hurt(0.5, 'bolt'); }
      if (dead) this.bolts.splice(i, 1);
    }
  };
  function segDist(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy;
    let t = l2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
  }

  /* ================= enemies ================= */
  P.updateFoes = function (dt) {
    const m = this.m, W = this.world;
    for (const e of this.foes) {
      if (!e.alive) continue;
      e.t += dt; e.cd = Math.max(0, e.cd - dt);
      const dxm = m.x - e.x, dym = m.y - e.y, dm = Math.hypot(dxm, dym);
      const hunting = !m.dead && !m.falling && dm < e.range && Math.abs(m.z - e.z) < 1.4 && this.state === 'play';
      if (e.type === 'orb') {
        let ax = 0, ay = 0;
        if (hunting && dm > 0.01) { ax = dxm / dm * 7.2; ay = dym / dm * 7.2; }
        const was = e.grounded;
        this.moveBody(e, dt, ax, ay, false);
        if (e.z < W.zmin - 6) { e.alive = false; this.emit('foeFell', { type: e.type, x: e.x, y: e.y, z: e.z }); continue; }
        if (!m.dead && !m.falling) this.ballHit(e, dm);
      } else {
        let tx = e.x, ty = e.y, sp = 0;
        if (e.type === 'muncher' || e.type === 'vacuum') {
          if (hunting && e.type === 'muncher') { tx = m.x; ty = m.y; sp = e.speed; }
          else if (e.patrol) { const p = e.patrol[e.pi % e.patrol.length]; tx = p.x; ty = p.y; sp = e.speed * 0.7; if (Math.hypot(tx - e.x, ty - e.y) < 0.25) e.pi++; }
          else if (e.type === 'vacuum') sp = 0;
        } else if (e.type === 'coil') {
          if (e.patrol) { const p = e.patrol[e.pi % e.patrol.length]; tx = p.x; ty = p.y; sp = e.speed; if (Math.hypot(tx - e.x, ty - e.y) < 0.25) e.pi++; }
        }
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
        if (sp > 0 && d > 0.02) {
          const nx = e.x + dx / d * sp * dt, ny = e.y + dy / d * sp * dt, g0 = W.heightAt(e.x, e.y), g1 = W.heightAt(nx, ny);
          if (g1 > -Infinity && Math.abs(g1 - g0) < 0.45 && !isFrag(W.surf[W.idx(Math.floor(nx), Math.floor(ny))])) { e.x = nx; e.y = ny; e.face = Math.atan2(dy, dx); } else if (e.patrol) e.pi++;
        }
        const g = W.heightAt(e.x, e.y); e.z = g > -Infinity ? g : e.z - 5 * dt;
        if (e.z < W.zmin - 6) { e.alive = false; continue; }
        if (!m.dead && !m.falling && this.state !== 'finish') this.creatureHit(e, dm, dxm, dym);
      }
    }
  };

  /* steel orb vs marble: a proper two-ball bounce */
  P.ballHit = function (e, d) {
    const m = this.m, rr = m.r + e.r;
    if (d >= rr || Math.abs(m.z - e.z) > 0.65) return;
    const nx = (m.x - e.x) / (d || 1e-6), ny = (m.y - e.y) / (d || 1e-6);
    const over = rr - d;
    m.x += nx * over * 0.45; m.y += ny * over * 0.45; e.x -= nx * over * 0.55; e.y -= ny * over * 0.55;
    const vn = (m.vx - e.vx) * nx + (m.vy - e.vy) * ny;
    if (vn < 0) {
      const j = -(1 + 0.8) * vn / (1 / 1 + 1 / 1.5);
      m.vx += j * nx; m.vy += j * ny; e.vx -= j / 1.5 * nx; e.vy -= j / 1.5 * ny;
      const sp = -vn;
      this.emit('orbHit', { x: (m.x + e.x) / 2, y: (m.y + e.y) / 2, z: m.z + C.R, speed: sp });
      if (sp > 8.5) { e.alive = false; this.score += 500; this.kills++; this.emit('foeDie', { type: 'orb', x: e.x, y: e.y, z: e.z, points: 500 }); }
      else if (sp > 3.2 && m.hitCd <= 0) { m.hitCd = 0.3; this.hurt(0.34, 'orb'); }
    }
  };

  P.creatureHit = function (e, d, dxm, dym) {
    const m = this.m, W = this.world;
    if (e.type === 'vacuum') {
      if (d < e.suck && Math.abs(m.z - e.z) < 1.0) {
        const pull = (1 - d / e.suck), k = pull * pull * 15 * this.dt;                 /* a suction that grows sharply as you get close */
        m.vx += (e.x - m.x) / (d || 1) * k; m.vy += (e.y - m.y) / (d || 1) * k;
        e.pull = pull;
      } else e.pull = 0;
      if (d < m.r + e.r * 0.8 && Math.abs(m.z - e.z) < 0.9) { this.emit('slurp', { x: e.x, y: e.y, z: e.z }); this.shatter('eaten'); }
      return;
    }
    if (d >= m.r + e.r || Math.abs(m.z - e.z) > 0.8) return;
    const sp = Math.hypot(m.vx, m.vy);
    if (e.type === 'muncher') {
      if (sp > 6.8) { e.alive = false; this.score += 750; this.kills++; this.emit('foeDie', { type: 'muncher', x: e.x, y: e.y, z: e.z, points: 750 }); const n = Math.hypot(dxm, dym) || 1; m.vx -= m.vx * 0.25; m.vy -= m.vy * 0.25; return; }
      if (e.cd <= 0) {
        e.cd = 1.4; const n = d || 1;
        m.vx += dxm / n * 5.5; m.vy += dym / n * 5.5;
        this.emit('chomp', { x: e.x, y: e.y, z: e.z });
        this.hurt(0.5, 'chomp');
      }
    } else if (e.type === 'coil') {
      m.corr = (m.corr || 0) + 1;
      m.vx *= 0.985; m.vy *= 0.985;
      if (e.cd <= 0) { e.cd = 0.5; this.emit('sizzle', { x: m.x, y: m.y, z: m.z }); }
      if (!this.god && !m.dead && m.inv <= 0) { m.integ -= 0.9 * (1 / 200); m.integ = Math.max(m.integ, 0.0005); if (m.integ <= 0.0006) this.shatter('acid'); else if (e.cd > 0.45) this.hurt(0.01, 'acid'); }
    }
  };

  /* ================= pickups, progress, goal ================= */
  P.updatePickups = function (dt) {
    const m = this.m;
    for (const g of this.gems) {
      g.t += dt;
      if (g.taken) continue;
      if (Math.hypot(m.x - g.x, m.y - g.y) < m.r + 0.42 && Math.abs(m.z + m.r - g.z) < 1.0) {
        g.taken = true;
        if (g.type === 'time') { this.time += g.secs || C.TIME_CRYSTAL; this.limit += g.secs || C.TIME_CRYSTAL; this.emit('timeGem', { x: g.x, y: g.y, z: g.z, secs: g.secs || C.TIME_CRYSTAL }); this.score += 100; }
        else { this.score += 250; this.emit('gem', { x: g.x, y: g.y, z: g.z, points: 250 }); }
      }
    }
  };
  P.trackPath = function () {
    const m = this.m, p = this.path;
    if (!m.grounded && m.air > 0.9) return;
    let bi = -1, bd = 1e9;
    for (let i = Math.max(0, this.pi - 4); i < Math.min(p.length, this.pi + 14); i++) {
      const d = Math.hypot(p[i].x - m.x, p[i].y - m.y) + Math.abs(p[i].z - m.z) * 0.8;
      if (d < bd) { bd = d; bi = i; }
    }
    if (bi >= 0 && bd < 5) { this.pi = bi; if (bi > this.best) this.best = bi; }
  };
  P.checkGoal = function () {
    const m = this.m, W = this.world;
    if (this.state !== 'play' || !m.grounded) return;
    const i = W.idx(Math.floor(m.x), Math.floor(m.y));
    if (i >= 0 && W.surf[i] === S.GOAL && W.kind[i] === 1) {
      this.state = 'finish'; m.finishT = 0;
      this.emit('finish', { x: m.x, y: m.y, z: m.z, timeLeft: this.time });
    }
  };

  /* ================= autopilot (demo mode and level tests) ================= */
  P.botInput = function () {
    const m = this.m, p = this.path;
    let look = 3;
    const tgt = p[Math.min(p.length - 1, this.pi + look)];
    let dx = tgt.x - m.x, dy = tgt.y - m.y;
    const d = Math.hypot(dx, dy) || 1;
    dx /= d; dy /= d;
    /* slow for sharp corners ahead, full speed before gaps */
    let vmax = 9.5;
    for (let k = 1; k <= 8; k++) {
      const a = p[Math.min(p.length - 1, this.pi + k)], b = p[Math.min(p.length - 1, this.pi + k + 2)];
      if (a.air || b.air) { vmax = 15; break; }
    }
    const nx = p[Math.min(p.length - 1, this.pi + 6)];
    const cx = nx.x - tgt.x, cy = nx.y - tgt.y, cl = Math.hypot(cx, cy) || 1;
    const turn = 1 - (dx * cx / cl + dy * cy / cl);
    if (turn > 0.5 && vmax < 15) vmax = Math.max(4.2, vmax - turn * 5);
    const W = this.world, ci = W.idx(Math.floor(m.x), Math.floor(m.y));
    if (ci >= 0 && W.surf[ci] === S.ICE) vmax = Math.min(vmax, 6);
    for (let k = 0; k <= 3; k++) { const q = p[Math.min(p.length - 1, this.pi + k)], qi = W.idx(Math.floor(q.x), Math.floor(q.y)); if (qi >= 0 && W.surf[qi] === S.GLASS) { vmax = Math.min(vmax, 5.2); break; } }
    /* wait for the safe moment before a trap */
    for (const h of this.hz) {
      if (h.type !== 'laser' && h.type !== 'crusher' && h.type !== 'spikes') continue;
      if (h.pidx === undefined) h.pidx = this.nearestPath(h);
      const d = h.pidx - this.pi;
      if (d < -1 || d > 9) continue;
      if (!this.hazSafe(h, (Math.max(0, d) + 3.2) / 5.2)) vmax = d <= 2.6 ? (d < 1 ? vmax : 0) : Math.min(vmax, (d - 2.6) * 1.4 + 0.6);
    }
    const wvx = dx * vmax, wvy = dy * vmax;
    let ax = (wvx - m.vx) * 0.9, ay = (wvy - m.vy) * 0.9;
    /* keep clear of things that eat or dissolve marbles */
    for (const e of this.foes) {
      if (!e.alive || (e.type !== 'vacuum' && e.type !== 'coil')) continue;
      const ex = m.x - e.x, ey = m.y - e.y, ed = Math.hypot(ex, ey), rr = e.type === 'vacuum' ? 3.8 : 1.7;
      if (ed < rr && ed > 0.01) { const push = (rr - ed) / rr * (e.type === 'vacuum' ? 26 : 14); ax += ex / ed * push; ay += ey / ed * push; }
    }
    return { wx: ax, wy: ay };
  };
  P.nearestPath = function (h) {
    const cx = h.type === 'laser' ? (h.x + h.x2) / 2 : h.type === 'crusher' ? h.x + h.w / 2 : h.type === 'spikes' ? h.cells[0][0] + 0.5 : h.x;
    const cy = h.type === 'laser' ? (h.y + h.y2) / 2 : h.type === 'crusher' ? h.y + h.h / 2 : h.type === 'spikes' ? h.cells[0][1] + 0.5 : h.y;
    let bi = 0, bd = 1e9;
    for (let i = 0; i < this.path.length; i++) { const d = Math.hypot(this.path[i].x - cx, this.path[i].y - cy); if (d < bd) { bd = d; bi = i; } }
    return bi;
  };
  /* will this trap stay harmless for the next `dur` seconds? */
  P.hazSafe = function (h, dur) {
    const c = (h.t + h.phase) % h.period;
    const clash = (a0, a1) => { for (let k = 0; k < 2; k++) { const s0 = a0 + k * h.period, s1 = a1 + k * h.period; if (c < s1 && c + dur > s0) return true; } return false; };
    if (h.type === 'laser') return !clash(-0.12, h.on + 0.05);
    if (h.type === 'crusher') { const up = h.period - 1.35; return !clash(up - 0.15, up + 0.65); }
    if (h.type === 'spikes') return !clash(-0.2, 1.05);
    return true;
  };

  G.Sim = Sim;
})((typeof window !== 'undefined' ? (window.SGS = window.SGS || {}) : (global.SGS = global.SGS || {})));
