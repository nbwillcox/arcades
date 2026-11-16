// Stick Doosh - bosses.js (bosses agent): the 12 bosses (SGS.BossDefs, SGS.Bosses.make, SGS.Bosses.deathSequence).
// Framework: every boss is an entity {kind:'boss', team:'enemy', x, y(feet), w, h, hp, maxHp, update, draw, hurt, inHit} built on one shared
// prototype. A boss IMPL (Impl[themeId]) supplies size, look (draw), patterns[] (telegraph -> act -> recover), idle movement and phase-2 hooks;
// the prototype runs the scheduler (bag of patterns), weakness (x4 on the matching super, stagger, WEAK! word), phase 2 at 50% hp, hit flash,
// contact damage, voice lines and the death hand-off to SGS.Game.onBossDying (generic FF6 flash-crash / burn / EXPLODE).
// Helpers: proj() enemy projectiles (deflectable by melee), zone() telegraphed hazards / shockwaves, lobV(), P.* pattern factories.
//
// ============================== BOSS FAIRNESS RULES (enforced in code, proven by tools/dodgetest.js) ==============================
// "Unavoidable damage is never ok." Every boss attack must be dodgeable by a human with a 0.25 s reaction time.
//  1. TELEGRAPH: every damaging attack has a visible + audible wind-up (>= 0.8 s heavy: charges, slams, columns, big zones; >= 0.5 s light).
//     Hit areas are PRE-DRAWN (red hatched zone / lane arrow / aim rays) and the drawn area == the area that hurts. zone() refuses
//     to arm a damaging zone sooner than 0.5 s after it appears unless it is flagged `pre` (it sits inside an already-drawn marker).
//  2. SAFE OPTION: every attack leaves a reachable safe option from ANY arena position within the telegraph: ground waves / rams / beams
//     are <= 40 px tall and short-lived (jump apex is 83 px, airtime 0.65 s); column strikes keep >= 70 px gaps between columns and walls
//     (spacedXs); aimed fans keep >= 70 px gaps (step >= 0.4 rad) and are locked 0.5 s BEFORE firing with their rays drawn; homing things
//     are slow (<= 130 px/s); the wall climb (hold toward a wall) is always an escape from anything that stays on the floor.
//  3. CHARGES / RAMPAGE: speed <= 380 px/s (enraged <= 450), lane + direction LOCKED at the start of the telegraph (>= 0.9 s), only the
//     front RAM box hurts (<= 42 px tall: jumpable with >= 0.15 s margin), the boss stops dizzy at the wall (the reward), >= 1.2 s between
//     attacks. Rampage = slow, jumpable stomps >= 1.5 s apart.
//  4. CONTACT: the boss body hurts on touch ONLY while an attack animation is active (ram / dive); hit boxes are smaller than the sprite and
//     the player's hurtbox is shrunk (Bosses.hitRect / Bosses.hitBall: 10 x 28 px body).
//  5. GRACE: hurt => 1.5 s invulnerability (C.INV_TIME) AND the boss may not START an attack for 0.9 s; arena entry and every enrage roar
//     are followed by >= 2 s with no attack starting; enrage clears bullets and zones; a freshly respawned player gets 1 s of peace.
//     Nothing spawns damage ON the player: zones are telegraphed, projectiles refuse to spawn within 120 px of the player.
//  6. PROJECTILES: <= 330 px/s (enraged <= 420), >= 12 px, bright + outlined, lifetime-limited, deflectable with melee.
//  7. MINIONS spawn at the far side of the arena (>= 250 px from the player) under a 0.8 s spawn-in warning ring.
//  8. PHASE 2 is denser / faster but every rule above still holds (the boss clock no longer speeds up; telegraphs stay real-time).
// Bosses.audit (set Bosses.audit.on = true) records every zone/projectile spawn so a test can assert these rules.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018', TAU = Math.PI * 2;
  const Defs = S.BossDefs = S.BossDefs || {};
  const Impl = {};
  const Bosses = S.Bosses = S.Bosses || {};
  Bosses.Impl = Impl;
  // fairness rule 5: 1.5 s of invulnerability after any hit (was 1.0 s). bosses.js loads before player.js, which reads C.INV_TIME on every hurt().
  C.INV_TIME = Math.max(C.INV_TIME || 0, 1.5);
  const FAIR = Bosses.FAIR = { teleHeavy: 0.8, teleLight: 0.5, zoneMinTele: 0.5, hurtGrace: 0.9, startGrace: 2.0, projMinDist: 120, projMax: 330, projMaxP2: 420, columnGap: 130, edge: 92 };
  const audit = Bosses.audit = { on: false, log: [] };
  // shrunk player hurtbox shared by the game and the test bot (feet at p.y, centre p.x)
  Bosses.hitRect = (p, x0, y0, x1, y1) => p.x + 5 > x0 && p.x - 5 < x1 && p.y > y0 + 2 && p.y - 30 < y1;
  Bosses.hitBall = (p, x, y, r) => Math.abs(p.x - x) < 5 + r && y > p.y - 30 - r && y < p.y - 2 + r;

  const sfx = (n, o) => { if (S.Audio && S.Audio.sfx) { try { S.Audio.sfx(n, o); } catch (e) { /* audio is optional */ } } };
  const word = (t, x, y, o) => { if (S.Comic) return S.Comic.word(t, x, y, o); return null; };
  const plr = () => { const p = S.Game && S.Game.player; return p && !p.dead && !p.hidden ? p : null; };
  const sgn = (v) => (v < 0 ? -1 : 1);
  const say = (b, ev, force) => { try { if (S.Voice && S.Voice.say) S.Voice.say('boss_' + b.id, ev, { x: b.x, y: b.y - b.h, force: !!force }); } catch (e) { /* voice is optional */ } };

  function arenaOf(b) {
    const g = S.Game, a = g && g.level && g.level.arena;
    if (a) return a;
    return (b && b._arena) || { x0: 0, x1: 880, y0: -400, y1: 0 };
  }
  const floorOf = (b) => arenaOf(b).y1;
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  // ------------------------------------------------------------------ drawing helpers (flash-aware)
  let FL = false;
  const K = (c) => (FL ? '#ffffff' : c);
  function ink(ctx, w) { ctx.lineWidth = w || 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; }
  function fs(ctx, fill, lw) { ctx.fillStyle = K(fill); ctx.fill(); if (lw !== 0) { ink(ctx, lw == null ? 3 : lw); ctx.stroke(); } }
  function ell(ctx, x, y, rx, ry, fill, lw, rot) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, TAU); fs(ctx, fill, lw); }
  function circ(ctx, x, y, r, fill, lw) { ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); fs(ctx, fill, lw); }
  function rrect(ctx, x, y, w, h, r, fill, lw) {
    if (S.Comic && S.Comic.roundRect) S.Comic.roundRect(ctx, x, y, w, h, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)); else { ctx.beginPath(); ctx.rect(x, y, w, h); }
    fs(ctx, fill, lw);
  }
  function poly(ctx, pts, fill, lw) { ctx.beginPath(); for (let i = 0; i < pts.length; i++) { if (i) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]); } ctx.closePath(); fs(ctx, fill, lw); }
  function limb(ctx, pts, w, col) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i < pts.length; i++) { if (i) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]); }
    ctx.strokeStyle = INK; ctx.lineWidth = w + 4.6; ctx.stroke();
    ctx.strokeStyle = K(col); ctx.lineWidth = w; ctx.stroke();
  }
  function line(ctx, x0, y0, x1, y1, w, col) { limb(ctx, [[x0, y0], [x1, y1]], w, col); }
  function inkLine(ctx, pts, w) { ctx.beginPath(); for (let i = 0; i < pts.length; i++) { if (i) ctx.lineTo(pts[i][0], pts[i][1]); else ctx.moveTo(pts[i][0], pts[i][1]); } ink(ctx, w || 2); ctx.stroke(); }
  function googly(ctx, x, y, r, dx, dy) {
    circ(ctx, x, y, r, '#ffffff', 2.4);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + (dx || 0) * r * 0.42, y + (dy || 0) * r * 0.42, r * 0.46, 0, TAU); ctx.fill();
  }
  function halftone(ctx, color, dot, gap, pathFn) {
    if (FL || !S.Comic || !S.Comic.pattern) return;
    ctx.save(); pathFn(); ctx.clip(); ctx.fillStyle = S.Comic.pattern(ctx, color, dot, gap); ctx.fillRect(-400, -500, 800, 600); ctx.restore();
  }
  function txt(ctx, s, x, y, size, fill, align) {
    ctx.font = 'italic ' + Math.round(size) + 'px Bangers, Impact, "Arial Black", sans-serif';
    ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.2); ctx.strokeStyle = INK; ctx.strokeText(s, x, y);
    ctx.fillStyle = K(fill || '#ffffff'); ctx.fillText(s, x, y);
  }
  function flame(ctx, x, y, r, t, c1, c2, c3) { // animated teardrop flame, tip up
    const w = Math.sin(t * 13 + x * 0.3) * r * 0.25;
    ctx.beginPath(); ctx.moveTo(x + w, y - r * 2.1); ctx.quadraticCurveTo(x + r * 1.25, y - r * 0.4, x, y + r * 0.7); ctx.quadraticCurveTo(x - r * 1.25, y - r * 0.4, x + w, y - r * 2.1);
    fs(ctx, c1 || '#ff5a1a', 2);
    ctx.beginPath(); ctx.moveTo(x + w * 0.6, y - r * 1.4); ctx.quadraticCurveTo(x + r * 0.7, y - r * 0.25, x, y + r * 0.45); ctx.quadraticCurveTo(x - r * 0.7, y - r * 0.25, x + w * 0.6, y - r * 1.4);
    ctx.fillStyle = K(c2 || '#ffb81c'); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y - r * 0.15, r * 0.3, r * 0.45, 0, 0, TAU); ctx.fillStyle = K(c3 || '#fff6b0'); ctx.fill();
  }
  function star(ctx, x, y, r, fill, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); fs(ctx, fill, 1.8); ctx.restore();
  }

  // ------------------------------------------------------------------ enemy projectiles (custom Shots: deflectable by melee)
  function lobV(x0, y0, tx, ty, speed, gm) {
    const g = C.GRAV * (gm == null ? 1 : gm) * ((S.Game && S.Game.grav) || 1);
    const dx = U.clamp(tx - x0, -360, 360), dy = U.clamp(ty - y0, -150, 220); // lobs fall short of very distant targets: launch speed stays <= 330 (rule 6)
    let T = U.clamp(Math.abs(dx) / (speed || 240), 0.8, 1.5), v = { vx: dx / T, vy: (dy - 0.5 * g * T * T) / T };
    for (let k = 0; k < 8 && Math.hypot(v.vx, v.vy) > 315; k++) { T += 0.1; v = { vx: dx / T, vy: (dy - 0.5 * g * T * T) / T }; } // slower, floatier arc if the launch would be too fast
    return v;
  }
  // damage routed to the player. `src` is the boss/zone/shot (the test bot reads src.kind / bossFx to attribute hits)
  function hurtP(p, dmg, src, info) {
    const ok = p.hurt(dmg, src, info);
    if (ok !== false && S.Game && S.Game.boss) S.Game.boss.noStartT = Math.max(S.Game.boss.noStartT || 0, FAIR.hurtGrace);
    return ok;
  }
  function proj(o) {
    const pl = plr();
    // fairness rule 5/6: never spawn a projectile on top of the player (<120 px): the boss simply cannot shoot point-blank
    if (pl && !o.close && Math.hypot(pl.x - o.x, (pl.y - 16) - o.y) < Math.max(FAIR.projMinDist, 0.55 * Math.hypot(o.vx || 0, o.vy || 0))) { if (audit.on) audit.log.push({ k: 'projSuppressed' }); return null; } // never spawn closer than 0.55 s of flight (>= 120 px)
    if (audit.on) { const sp = Math.hypot(o.vx || 0, o.vy || 0); audit.log.push({ k: 'proj', speed: sp, falling: !!o.falling, r: o.r || 6, dist: pl ? Math.hypot(pl.x - o.x, (pl.y - 16) - o.y) : 999, enraged: !!(S.Game && S.Game.boss && S.Game.boss.enraged) }); }
    return S.Shots.spawn('bossshot', o.x, o.y, o.vx || 0, o.vy || 0, 'enemy', {
      custom: true, bossShot: true, update: projUpdate, draw: projDraw,
      r: o.r || 6, dmg: o.dmg == null ? 1 : o.dmg, life: o.life || 4, grav: o.grav || 0, shape: o.shape || 'orb',
      color: o.color || '#ff5a2a', color2: o.color2 || '#fff3b0', spin: o.spin || 0, rot: o.rot || 0, noTerrain: !!o.noTerrain,
      bounce: o.bounce || 0, homing: o.homing || 0, homeT: o.homeT || 99, fuse: o.fuse, sine: o.sine || null, onEnd: o.onEnd || null, size: o.size || o.r || 6,
      owner: o.owner || null, flip: o.flip || 1, falling: !!o.falling, burst: o.burst || null,
    });
  }
  function projEnd(s, why) {
    if (s.dead) return;
    s.dead = true;
    if (s.onEnd) { try { s.onEnd(s, why); return; } catch (e) { console.error('[boss proj end]', e); } }
    if (S.FX) S.FX.spark(s.x, s.y, 5, s.color);
  }
  function projUpdate(s, dt) {
    const g = S.Game, T = S.Terrain;
    if (!g || s.dead) return;
    if (s.life <= 0) { projEnd(s, 'life'); return; }
    if (s.fuse != null) { s.fuse -= dt; if (s.fuse <= 0) { projEnd(s, 'fuse'); return; } }
    if (s.homing && s.team === 'enemy' && s.age < s.homeT) { // seekers only steer for homeT seconds, then fly straight
      const p = plr();
      if (p) {
        const want = Math.atan2(p.y - 16 - s.y, p.x - s.x), cur = Math.atan2(s.vy, s.vx);
        let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        const na = cur + U.clamp(da, -s.homing * dt, s.homing * dt), v = Math.hypot(s.vx, s.vy);
        s.vx = Math.cos(na) * v; s.vy = Math.sin(na) * v;
      }
    }
    if (s.grav) s.vy += C.GRAV * s.grav * (g.grav || 1) * dt;
    s.rot += (s.spin || 0) * dt;
    const n = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / 7));
    for (let k = 0; k < n; k++) {
      const nx = s.x + s.vx * dt / n, ny = s.y + s.vy * dt / n;
      if (!s.noTerrain && T && T.W && T.solidPx(nx, ny)) {
        if (s.bounce > 0) {
          s.bounce--;
          if (T.solidPx(nx, s.y)) s.vx = -s.vx * 0.85; else { s.vy = -Math.max(120, Math.abs(s.vy) * 0.62); s.vx *= 0.92; }
          sfx('boing', { vol: 0.25, x: s.x });
          break;
        }
        s.x = nx; s.y = ny; projEnd(s, 'land'); return;
      }
      s.x = nx; s.y = ny;
      if (s.team === 'enemy') {
        const p = plr();
        if (p && Bosses.hitBall(p, s.x, s.y, s.r * 0.85)) {
          if (p.barrier > 0) { projEnd(s, 'hit'); return; }
          const ok = hurtP(p, s.dmg, s, { dirX: U.sign(s.vx) || U.sign(p.x - s.x) || 1, kind: 'boss' });
          if (ok !== false) { projEnd(s, 'hit'); return; }
        }
      } else {
        for (const e of g.hostiles('player')) {
          if (e.dead || e.noHurt || (e.kind !== 'boss' && e.kind !== 'enemy')) continue;
          if (e.inHit ? !e.inHit(s.x, s.y, s.r) : !U.pointIn(e, s.x, s.y, s.r)) continue;
          g.damage(e, s.dmg * 2, { team: 'player', owner: g.player, kind: 'deflect', dirX: U.sign(s.vx), x: s.x, y: s.y });
          word('REFLECTED!', s.x, s.y - 14, { size: 16, color: '#ffffff', stroke: '#3bb4ff' });
          projEnd(s, 'hit'); return;
        }
      }
    }
    if (s.sine) s.y = s.sine.y0 + Math.sin(s.age * s.sine.f + (s.sine.ph || 0)) * s.sine.a;
    const A = g.level && g.level.arena;
    if (A && (s.x < A.x0 - 60 || s.x > A.x1 + 60 || s.y < A.y0 - 120 || s.y > A.y1 + 80)) s.dead = true;
  }
  function projDraw(ctx, s) {
    const r = s.size, a = Math.atan2(s.vy, s.vx);
    ctx.save(); ctx.translate(s.x, s.y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (s.team === 'player') { ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.4; ctx.stroke(); }
    switch (s.shape) {
      case 'snow': ctx.rotate(s.rot); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.fillStyle = '#bfe4ff'; ctx.beginPath(); ctx.arc(-r * 0.3, r * 0.25, r * 0.3, 0, TAU); ctx.arc(r * 0.35, -r * 0.3, r * 0.2, 0, TAU); ctx.fill(); break;
      case 'ice': ctx.rotate(a - Math.PI / 2); ctx.beginPath(); ctx.moveTo(-r * 0.7, -r * 1.4); ctx.lineTo(r * 0.7, -r * 1.4); ctx.lineTo(0, r * 1.7); ctx.closePath(); ctx.fillStyle = '#aee8ff'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.25, -r); ctx.lineTo(-r * 0.05, r * 0.6); ctx.stroke(); break;
      case 'fire': { const t = (s.age || 0) * 14; ctx.rotate(a + Math.PI / 2); flame(ctx, 0, r * 0.2, r, t, '#ff5a1a', '#ffb81c', '#fff6b0'); break; }
      case 'rock': ctx.rotate(s.rot); ctx.beginPath(); ctx.moveTo(-r, -r * 0.3); ctx.lineTo(-r * 0.4, -r); ctx.lineTo(r * 0.6, -r * 0.8); ctx.lineTo(r, 0.1 * r); ctx.lineTo(r * 0.5, r * 0.9); ctx.lineTo(-r * 0.6, r * 0.8); ctx.closePath(); ctx.fillStyle = '#a49bb0'; ctx.fill(); ink(ctx, 2.6); ctx.stroke(); ctx.strokeStyle = '#6b6478'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.3, -r * 0.2); ctx.lineTo(r * 0.2, r * 0.3); ctx.stroke(); break;
      case 'leaf': ctx.rotate(a + s.rot * 0.4); ctx.beginPath(); ctx.moveTo(-r * 1.3, 0); ctx.quadraticCurveTo(0, -r * 1.1, r * 1.3, 0); ctx.quadraticCurveTo(0, r * 1.1, -r * 1.3, 0); ctx.fillStyle = s.color; ctx.fill(); ink(ctx, 2.2); ctx.stroke(); ctx.strokeStyle = '#2b6b22'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-r * 1.1, 0); ctx.lineTo(r * 1.1, 0); ctx.stroke(); break;
      case 'bolt': ctx.rotate(a); ctx.beginPath(); ctx.moveTo(-r * 1.6, 0); ctx.lineTo(-r * 0.4, -r * 0.8); ctx.lineTo(-r * 0.1, r * 0.1); ctx.lineTo(r * 1.5, -r * 0.2); ctx.lineTo(0, r * 0.9); ctx.lineTo(-r * 0.4, 0.1 * r); ctx.closePath(); ctx.fillStyle = '#ffe14d'; ctx.fill(); ink(ctx, 2); ctx.stroke(); break;
      case 'cannon': ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#34304a'; ctx.fill(); ink(ctx, 2.6); ctx.stroke(); ctx.fillStyle = '#8a86a8'; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.28, 0, TAU); ctx.fill(); break;
      case 'duck': { const hot = s.fuse != null && s.fuse < 0.7 && Math.floor(s.fuse * 14) % 2; ctx.scale(s.vx >= 0 ? 1 : -1, 1); ctx.rotate(Math.sin(s.age * 9) * 0.25); ctx.beginPath(); ctx.ellipse(0, 2, r * 1.15, r * 0.85, 0, 0, TAU); ctx.fillStyle = hot ? '#ff5a3a' : '#ffe14d'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.beginPath(); ctx.arc(r * 0.7, -r * 0.7, r * 0.6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff8c1a'; ctx.beginPath(); ctx.moveTo(r * 1.2, -r * 0.8); ctx.lineTo(r * 1.9, -r * 0.55); ctx.lineTo(r * 1.2, -r * 0.4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(r * 0.85, -r * 0.85, 1.4, 0, TAU); ctx.fill(); break; }
      case 'mud': ctx.rotate(s.rot); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#7d5a38'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.fillStyle = '#5a3f24'; ctx.beginPath(); ctx.arc(r * 0.3, r * 0.2, r * 0.35, 0, TAU); ctx.fill(); ctx.fillStyle = '#a07c52'; ctx.beginPath(); ctx.arc(-r * 0.35, -r * 0.3, r * 0.25, 0, TAU); ctx.fill(); break;
      case 'coconut': ctx.rotate(s.rot); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#7a4a22'; ctx.fill(); ink(ctx, 2.6); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.2, 1.6, 0, TAU); ctx.arc(r * 0.3, -r * 0.2, 1.6, 0, TAU); ctx.arc(0, r * 0.25, 1.6, 0, TAU); ctx.fill(); break;
      case 'bomb': ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = '#2d2a44'; ctx.fill(); ink(ctx, 2.6); ctx.stroke(); ctx.strokeStyle = '#c9a050'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.7, -r * 1.5, r * 0.4, -r * 1.9); ctx.stroke(); if (Math.floor(s.age * 20) % 2) { ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(r * 0.4, -r * 1.9, 2.4, 0, TAU); ctx.fill(); } break;
      case 'corn': ctx.rotate(s.rot); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.5, r * 0.8, 0, 0, TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.strokeStyle = '#e09b1a'; ctx.lineWidth = 1; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * r * 0.5, -r * 0.7); ctx.lineTo(i * r * 0.5, r * 0.7); ctx.stroke(); } ctx.fillStyle = '#4fae3a'; ctx.beginPath(); ctx.moveTo(-r * 1.4, 0); ctx.lineTo(-r * 2.1, -r * 0.7); ctx.lineTo(-r * 1.9, r * 0.5); ctx.closePath(); ctx.fill(); ink(ctx, 1.6); ctx.stroke(); break;
      case 'crow': { ctx.scale(s.vx >= 0 ? 1 : -1, 1); const fl = Math.sin(s.age * 18); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.3, r * 0.8, 0, 0, TAU); ctx.fillStyle = '#2b2740'; ctx.fill(); ink(ctx, 2.2); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.3); ctx.lineTo(-r * 1.1, -r * (1.6 + fl)); ctx.lineTo(r * 0.5, -r * 0.3); ctx.closePath(); ctx.fillStyle = '#3d3858'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffb81c'; ctx.beginPath(); ctx.moveTo(r * 1.2, -r * 0.2); ctx.lineTo(r * 2, 0); ctx.lineTo(r * 1.2, r * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(r * 0.8, -r * 0.2, 1.6, 0, TAU); ctx.fill(); break; }
      case 'star': star(ctx, 0, 0, r * 1.2, s.color || '#ffe14d', s.rot); break;
      case 'plasma': { const pu = 1 + Math.sin(s.age * 16) * 0.12; ctx.beginPath(); ctx.arc(0, 0, r * pu, 0, TAU); ctx.fillStyle = '#7dff6b'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.fillStyle = '#eaffd8'; ctx.beginPath(); ctx.arc(-r * 0.25, -r * 0.25, r * 0.38, 0, TAU); ctx.fill(); break; }
      case 'missile': ctx.rotate(a); ctx.fillStyle = '#ffb81c'; ctx.beginPath(); ctx.moveTo(-r * 1.2, -r * 0.4); ctx.lineTo(-r * (2 + Math.random()), 0); ctx.lineTo(-r * 1.2, r * 0.4); ctx.fill(); ctx.beginPath(); ctx.moveTo(-r * 1.3, -r * 0.7); ctx.lineTo(r * 0.9, -r * 0.7); ctx.lineTo(r * 1.7, 0); ctx.lineTo(r * 0.9, r * 0.7); ctx.lineTo(-r * 1.3, r * 0.7); ctx.closePath(); ctx.fillStyle = '#e8173a'; ctx.fill(); ink(ctx, 2.2); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 0.2, -r * 0.7, r * 0.5, r * 1.4); break;
      case 'pixel': ctx.rotate(s.rot); ctx.fillStyle = s.color; ctx.fillRect(-r, -r, r * 2, r * 2); ink(ctx, 2); ctx.strokeRect(-r, -r, r * 2, r * 2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(-r, -r, r * 0.8, r * 0.8); break;
      case 'ball': default: ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = s.color; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.fillStyle = s.color2; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, TAU); ctx.fill(); break;
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ hazard zones (telegraph -> active), markers, shockwaves
  // o: {x, y(bottom), w, h, tele, life, dmg, style, color, color2, vx, vy, noHit, sign, onStart(z), onEnd(z), slow, dir}
  function zone(o) {
    const dmgN = o.dmg == null ? 1 : o.dmg;
    // fairness rule 1: a damaging zone is never armed sooner than 0.5 s after it appears, unless it sits inside an already-drawn marker (`pre`)
    const tele = (!o.noHit && dmgN > 0 && !o.pre) ? Math.max(o.tele || 0, FAIR.zoneMinTele) : (o.tele || 0);
    const z = {
      kind: 'hazard', team: 'neutral', bossFx: true, always: true, dead: false, t: 0, started: false, pre: !!o.pre, thr: o.thr || null,
      x: o.x, y: o.y, w: o.w || 40, h: o.h || 40, vx: o.vx || 0, vy: o.vy || 0, tele, life: o.life == null ? 0.5 : o.life,
      dmg: dmgN, style: o.style || 'fire', color: o.color, color2: o.color2, noHit: !!o.noHit, sign: o.sign, slow: o.slow || 0, rays: o.rays || null,
      onStart: o.onStart || null, onEnd: o.onEnd || null, onTick: o.onTick || null, dir: o.dir || (o.vx ? U.sign(o.vx) : 1), warn: o.warn || 'box', rot: 0, uid: Math.floor(Math.random() * 1e9),
      update(dt) {
        this.t += dt;
        if (this.t < this.tele) return;
        if (!this.started) { this.started = true; if (this.onStart) this.onStart(this); }
        this.x += this.vx * dt; this.y += this.vy * dt; this.rot += this.vx * dt / 14;
        if (this.onTick) this.onTick(this, dt);
        const p = plr();
        if (p && !this.noHit && Bosses.hitRect(p, this.x - this.w / 2, this.y - this.h, this.x + this.w / 2, this.y)) {
          if (this.slow) { p.slow = this.slow; p._slowUntil = (S.Game.time || 0) + 0.15; }
          if (this.dmg > 0) hurtP(p, this.dmg, this, { dirX: U.sign(p.x - this.x) || 1, kind: 'hazard' });
        } else if (p && this.slow && p.slow === this.slow && (p._slowUntil || 0) < S.Game.time) p.slow = 0;
        if (this.t >= this.tele + this.life) { this.dead = true; if (this.slow && p && p.slow === this.slow) p.slow = 0; if (this.onEnd) this.onEnd(this); }
      },
      draw(ctx) { zoneDraw(ctx, this); },
    };
    if (audit.on && !z.noHit && z.dmg > 0) { const pl = plr(); audit.log.push({ k: 'zone', tele: z.tele, pre: z.pre, style: z.style, w: z.w, h: z.h, vx: z.vx, dist: pl ? Math.abs(pl.x - z.x) : 999, onPlayer: pl ? Bosses.hitRect(pl, z.x - z.w / 2, z.y - z.h, z.x + z.w / 2, z.y) : false, t: S.Game.time }); }
    return S.Game.spawn(z);
  }
  // flat floor warning (hatched, no damage) that can fire a callback when it ends and publishes the hazard it announces via o.thr(rem, out)
  function marker(x, y, tele, o) {
    o = o || {};
    return zone({ x, y, w: o.w || 44, h: o.h || 10, tele, life: 0, noHit: true, onEnd: o.onEnd, color: o.color, sign: o.sign, warn: o.warn || 'box', style: 'marker', thr: o.thr, dir: o.dir });
  }
  function zoneDraw(ctx, z) {
    const t = z.t;
    if (t < z.tele) { // warning: red hatched area == the area that will hurt (rule 1)
      const k = t / z.tele, pul = 0.5 + 0.5 * Math.sin(t * 26);
      ctx.save();
      if (z.warn === 'rays') { // locked aim rays of a fan: every dashed line is a bullet path
        ctx.lineCap = 'round'; ctx.setLineDash([10, 7]);
        for (const a of z.rays || []) { ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(a) * 900, z.y + Math.sin(a) * 900); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.globalAlpha = 0.5; ctx.stroke(); ctx.strokeStyle = z.color || '#ff3b3b'; ctx.lineWidth = 2.6; ctx.globalAlpha = 0.55 + 0.4 * pul; ctx.stroke(); }
        ctx.restore(); return;
      }
      ctx.globalAlpha = 0.22 + 0.26 * pul;
      ctx.fillStyle = z.color || '#ff3b3b';
      const circ_ = z.warn === 'circle', rx = z.w / 2, ry = Math.max(5, z.h / 2);
      if (circ_) { ctx.beginPath(); ctx.ellipse(z.x, z.y - 3, rx, ry, 0, 0, TAU); ctx.fill(); }
      else ctx.fillRect(z.x - z.w / 2, z.y - z.h, z.w, z.h);
      // diagonal hatching clipped to the zone
      ctx.save(); ctx.beginPath(); if (circ_) ctx.ellipse(z.x, z.y - 3, rx, ry, 0, 0, TAU); else ctx.rect(z.x - z.w / 2, z.y - z.h, z.w, z.h); ctx.clip();
      ctx.globalAlpha = 0.55; ctx.strokeStyle = z.color || '#ff3b3b'; ctx.lineWidth = 2.2; ctx.beginPath();
      const hx0 = z.x - z.w / 2 - z.h, hx1 = z.x + z.w / 2 + z.h; for (let hx = hx0 + ((t * 30) % 12); hx < hx1; hx += 12) { ctx.moveTo(hx, z.y); ctx.lineTo(hx + z.h, z.y - z.h); }
      ctx.stroke(); ctx.restore();
      ctx.globalAlpha = 0.9; ink(ctx, 2); ctx.setLineDash([6, 5]);
      if (circ_) { ctx.beginPath(); ctx.ellipse(z.x, z.y - 3, rx, ry, 0, 0, TAU); ctx.stroke(); } else ctx.strokeRect(z.x - z.w / 2, z.y - z.h, z.w, z.h);
      ctx.setLineDash([]);
      if (z.warn === 'lane' || z.vx) { // travel arrows so the direction of a ram / wave is readable
        const d = z.warn === 'lane' ? z.dir : U.sign(z.vx), n = Math.max(1, Math.min(8, Math.floor(z.w / 70)));
        ctx.fillStyle = INK; ctx.globalAlpha = 0.55 + 0.3 * pul;
        for (let i = 0; i < n; i++) { const ax = z.warn === 'lane' ? z.x + d * ((((i + (t * 1.6) % 1) / n) - 0.5) * z.w * 0.9) : z.x + d * (i - (n - 1) / 2) * 24, ay = z.y - z.h / 2, s = Math.min(9, Math.max(5, z.h / 3)); ctx.beginPath(); ctx.moveTo(ax + d * s, ay); ctx.lineTo(ax - d * s * 0.6, ay - s); ctx.lineTo(ax - d * s * 0.6, ay + s); ctx.closePath(); ctx.fill(); }
        ctx.globalAlpha = 0.9;
      }
      if (z.sign !== false && z.warn !== 'lane') { const sy = z.y - Math.min(z.h, 60) - 14 - (1 - k) * 8, sc = 0.8 + 0.3 * pul; ctx.translate(z.x, sy); ctx.scale(sc, sc); ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(10, 8); ctx.lineTo(-10, 8); ctx.closePath(); ctx.fillStyle = Math.floor(t * 14) % 2 ? '#ffe14d' : '#ff3b3b'; ctx.fill(); ink(ctx, 2.2); ctx.stroke(); ctx.fillStyle = INK; ctx.font = '12px Bangers, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 2); }
      ctx.restore();
      return;
    }
    if (z.style === 'marker') return;
    const a = t - z.tele, k = Math.min(1, a / Math.max(0.05, z.life)), x = z.x, y = z.y, w = z.w, h = z.h;
    ctx.save();
    switch (z.style) {
      case 'fire': { const n = Math.max(2, Math.round(h / 22)), c1 = z.color || '#ff5a1a'; for (let i = 0; i < n; i++) { const yy = y - i * (h / n) * 0.78, sc = 1 - i / (n + 1) * 0.5; flame(ctx, x + Math.sin(t * 15 + i * 1.7) * w * 0.12, yy, w * 0.42 * sc, t + i, c1, z.color2 || '#ffb81c', '#fff6b0'); } break; }
      case 'geyser': { const c = z.color || '#3bb4ff', hh = h * Math.min(1, a * 9) * (1 - Math.max(0, k - 0.7) * 2.5); ctx.beginPath(); ctx.moveTo(x - w * 0.4, y); ctx.quadraticCurveTo(x - w * 0.5, y - hh * 0.6, x - w * 0.28, y - hh); ctx.quadraticCurveTo(x, y - hh - 14, x + w * 0.28, y - hh); ctx.quadraticCurveTo(x + w * 0.5, y - hh * 0.6, x + w * 0.4, y); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ink(ctx, 2.8); ctx.stroke(); ctx.fillStyle = z.color2 || 'rgba(255,255,255,0.7)'; ctx.fillRect(x - w * 0.12, y - hh * 0.9, w * 0.14, hh * 0.8); for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * w * 0.3, y - hh - 6 + Math.sin(t * 20 + i) * 3, 7, 0, TAU); ctx.fillStyle = c; ctx.fill(); ink(ctx, 2); ctx.stroke(); } break; }
      case 'spikes': { const n = Math.max(2, Math.round(w / 16)), c = z.color || '#aee8ff', hh = h * Math.min(1, a * 10); for (let i = 0; i < n; i++) { const xx = x - w / 2 + (i + 0.5) * w / n, th = hh * (0.7 + 0.3 * ((i * 7) % 3) / 2); ctx.beginPath(); ctx.moveTo(xx - w / n * 0.5, y); ctx.lineTo(xx, y - th); ctx.lineTo(xx + w / n * 0.5, y); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ink(ctx, 2.2); ctx.stroke(); } break; }
      case 'jet': { // horizontal flame breath (fire boss), tip travelling along z.dir
        const n = Math.max(3, Math.round(w / 34)), d = z.dir;
        for (let i = 0; i < n; i++) { const f = i / (n - 1), xx = x - d * w / 2 + d * w * f, sc = (0.6 + 0.55 * (1 - Math.abs(f - 0.5) * 1.4)) * (h / 26); ctx.save(); ctx.translate(xx, y - h * 0.5); ctx.rotate(d > 0 ? Math.PI / 2 : -Math.PI / 2); flame(ctx, 0, 0, 13 * sc, t + i * 0.7, z.color || '#ff5a1a', z.color2 || '#ffb81c', '#fff6b0'); ctx.restore(); }
        break; }
      case 'beam': { const al = 1 - Math.max(0, k - 0.6) * 2.5; ctx.globalAlpha = Math.max(0, al); ctx.fillStyle = INK; ctx.fillRect(x - w / 2 - 3, y - h - 3, w + 6, h + 6); ctx.fillStyle = z.color || '#ff3b6b'; ctx.fillRect(x - w / 2, y - h, w, h); ctx.fillStyle = '#ffffff'; ctx.fillRect(x - w / 2, y - h * 0.65, w, h * 0.3); break; }
      case 'bolt': { const al = 1 - Math.max(0, k - 0.5) * 2; ctx.globalAlpha = Math.max(0, al); const pts = [[x, y - h]]; for (let i = 1; i < 8; i++) pts.push([x + (i % 2 ? 1 : -1) * (6 + (i * 37 % 9)), y - h + h * i / 8]); pts.push([x, y]); inkLine(ctx, pts, 13); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 7; ctx.beginPath(); pts.forEach((p, i) => { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); }); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4; ctx.stroke(); break; }
      case 'twister': { const n = 7; for (let i = 0; i < n; i++) { const f = i / (n - 1), yy = y - f * h, ww = w * (0.35 + f * 0.65), ox = Math.sin(t * 9 + i * 1.3) * w * 0.12; ctx.beginPath(); ctx.ellipse(x + ox, yy, ww / 2, 7, 0, 0, TAU); ctx.fillStyle = i % 2 ? '#e9fbff' : '#a9e8d6'; ctx.fill(); ink(ctx, 2.2); ctx.stroke(); } break; }
      case 'wave': { // crest travelling along the floor
        const d = z.dir, c = z.color || '#3bb4ff';
        ctx.beginPath(); ctx.moveTo(x - d * w / 2, y); ctx.quadraticCurveTo(x - d * w * 0.1, y - h * 0.15, x + d * w * 0.05, y - h); ctx.quadraticCurveTo(x + d * w * 0.55, y - h * 0.95, x + d * w * 0.5, y - h * 0.5); ctx.quadraticCurveTo(x + d * w * 0.3, y - h * 0.55, x + d * w * 0.3, y - h * 0.3); ctx.lineTo(x + d * w * 0.5, y); ctx.closePath();
        ctx.fillStyle = c; ctx.fill(); ink(ctx, 2.8); ctx.stroke(); ctx.fillStyle = z.color2 || 'rgba(255,255,255,0.75)'; ctx.beginPath(); ctx.arc(x + d * w * 0.15, y - h * 0.72, h * 0.12, 0, TAU); ctx.arc(x - d * w * 0.05, y - h * 0.42, h * 0.08, 0, TAU); ctx.fill(); break; }
      case 'quake': { const n = Math.max(2, Math.round(w / 18)), hh = h * Math.min(1, a * 12) * (1 - Math.max(0, k - 0.75) * 4); for (let i = 0; i < n; i++) { const xx = x - w / 2 + (i + 0.5) * w / n, th = hh * (0.6 + 0.4 * ((i * 5) % 3) / 2); ctx.beginPath(); ctx.moveTo(xx - w / n * 0.55, y); ctx.lineTo(xx + (i % 2 ? 3 : -3), y - th); ctx.lineTo(xx + w / n * 0.55, y); ctx.closePath(); ctx.fillStyle = z.color || '#a49bb0'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); } break; }
      case 'snowball': case 'bale': case 'rollball': { const r = h / 2; ctx.translate(x, y - r); ctx.rotate(z.rot); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = z.color || '#ffffff'; ctx.fill(); ink(ctx, 3); ctx.stroke(); ctx.strokeStyle = z.color2 || '#bfe4ff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(0, 0, r * 0.6, 0.3, 2.6); ctx.moveTo(r * 0.2, -r * 0.2); ctx.lineTo(r * 0.7, -r * 0.5); ctx.stroke(); if (z.style === 'bale') { ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(-r, i * r * 0.35); ctx.lineTo(r, i * r * 0.35); } ctx.strokeStyle = '#a8761a'; ctx.stroke(); } break; }
      case 'burst': { const r = Math.max(w, h) / 2 * (0.6 + 0.5 * Math.min(1, a * 6)); ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.4) * 1.6); if (S.Comic) { S.Comic.burst(ctx, x, y - h / 2, r * 0.7, r, 11, z.uid); ctx.fillStyle = z.color || '#ff7a1a'; ctx.fill(); ink(ctx, 3); ctx.stroke(); S.Comic.burst(ctx, x, y - h / 2, r * 0.35, r * 0.6, 9, z.uid + 4); ctx.fillStyle = z.color2 || '#fff6b0'; ctx.fill(); } break; }
      case 'beard': { const d = z.dir, len = w * Math.min(1, a / 0.1), x0 = x - d * w / 2; ctx.globalAlpha = Math.max(0, 1 - Math.max(0, k - 0.6) * 2.5); ctx.beginPath(); for (let i = 0; i <= 16; i++) { const f = i / 16; const px = x0 + d * len * f, py = y - h / 2 + Math.sin(f * 9 + a * 30) * 5 * f; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.strokeStyle = INK; ctx.lineWidth = h + 5; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = '#f2f2f2'; ctx.lineWidth = h - 1; ctx.stroke(); break; }
      case 'blocks': { const n = Math.max(2, Math.round(w / 12)), m = Math.max(1, Math.round(h / 12)); for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { if (((i * 13 + j * 7 + Math.floor(t * 18)) % 5) === 0) continue; ctx.fillStyle = (i + j) % 2 ? (z.color || '#ff6ae0') : (z.color2 || '#6aeaff'); ctx.fillRect(x - w / 2 + i * 12, y - h + j * 12, 11, 11); } ink(ctx, 2); ctx.strokeRect(x - w / 2, y - h, w, h); break; }
      case 'bsod': { ctx.fillStyle = '#1a3bd8'; ctx.fillRect(x - w / 2, y - h, w, h); ink(ctx, 3); ctx.strokeRect(x - w / 2, y - h, w, h); ctx.fillStyle = '#ffffff'; ctx.font = 'bold 22px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(':(', x, y - h / 2 - 4); ctx.font = '8px monospace'; ctx.fillText('FATAL ERR 0x0D00', x, y - h / 2 + 12); break; }
      case 'puddle': { ctx.beginPath(); ctx.ellipse(x, y - 3, w / 2, 6, 0, 0, TAU); ctx.fillStyle = z.color || '#7d5a38'; ctx.fill(); ink(ctx, 2.4); ctx.stroke(); ctx.fillStyle = z.color2 || '#a07c52'; ctx.beginPath(); ctx.ellipse(x - w * 0.15, y - 4, w * 0.12, 2.5, 0, 0, TAU); ctx.fill(); if (Math.sin(t * 5 + z.uid) > 0.8) { ctx.beginPath(); ctx.arc(x + w * 0.1, y - 9, 3, 0, TAU); ctx.fillStyle = z.color || '#7d5a38'; ctx.fill(); ink(ctx, 1.6); ctx.stroke(); } break; }
      default: ctx.fillStyle = z.color || '#ff3b3b'; ctx.fillRect(x - w / 2, y - h, w, h);
    }
    ctx.restore();
  }
  // shockwave pair along the floor from (x,floor): two crests heading both ways
  function shockPair(x, y, o) {
    o = o || {};
    // crests are <= 34 px tall, <= 240 px/s: jumpable with >= 0.2 s of margin. They spawn `pre`: the slam marker already showed this area.
    for (const d of [-1, 1]) zone({ x: x + d * 20, y, w: o.w || 46, h: Math.min(o.h || 34, 36), vx: d * Math.min(o.speed || 220, 240), life: o.life || 1.7, dmg: o.dmg == null ? 1 : o.dmg, style: o.style || 'wave', color: o.color || '#ffe14d', color2: o.color2, dir: d, pre: true });
  }
  function puff(x, y, n, color) { if (S.FX) { S.FX.dust(x, y, n || 5); if (color) S.FX.debris(x, y - 4, Math.max(2, (n || 5) >> 1), color); } }

  // ------------------------------------------------------------------ boss prototype
  function arenaBounds(b) {
    const A = arenaOf(b), hw = (b.hw || b.w / 2);
    return { l: A.x0 + hw + 6, r: A.x1 - hw - 6, top: A.y0 + 8, floor: A.y1 };
  }
  function boxes(b) {
    const im = b.impl;
    if (im.boxes) return im.boxes(b);
    return [{ x0: b.x - b.w / 2, x1: b.x + b.w / 2, y0: b.y - b.h, y1: b.y }];
  }
  // local box (dx0..dx1 forward-relative to facing, dy0..dy1 with 0 = feet, negative up) -> world rect
  function lbox(b, dx0, dy0, dx1, dy1) {
    const a = b.x + b.face * dx0, c = b.x + b.face * dx1;
    return { x0: Math.min(a, c), x1: Math.max(a, c), y0: b.y + Math.min(dy0, dy1), y1: b.y + Math.max(dy0, dy1) };
  }
  function fall(b, dt, gm) { // simple gravity for jumpers; returns true on the frame it lands
    const fl = floorOf(b);
    b.vy += C.GRAV * (gm == null ? 1 : gm) * dt; b.y += b.vy * dt;
    if (b.y >= fl) { const was = b.vy; b.y = fl; b.vy = 0; return was > 60; }
    return false;
  }

  const Proto = {
    toRest(t) {
      this.mode = 'rest'; this.pat = null; this.tele = 0; this.ps = {};
      this.mt = t != null ? t : U.rand(0.9, 1.5) * (this.enraged ? 0.7 : 1) * this.restMul;
    },
    interrupt(mode, t) {
      if (this.mode === 'act' && this.pat && this.pat.end) { try { this.pat.end(this); } catch (e) { console.error('[boss pat end]', e); } }
      this.pat = null; this.tele = 0; this.vx = 0; this.mode = mode; this.mt = t; this.ps = {}; this.dizzyNow = false;
    },
    eligible() {
      return this.impl.patterns.filter((p) => (!p.p2 || this.enraged) && (!p.p1 || !this.enraged));
    },
    pick(p) {
      let guard = 0, pat = null;
      while (guard++ < 12) {
        if (!this.bag.length) this.bag = shuffle(this.eligible());
        const c = this.bag.shift();
        if (!c) break;
        if (c.can && !c.can(this, p)) continue;
        if (c.id === this.lastPat && this.bag.length) { this.bag.push(c); continue; }
        pat = c; break;
      }
      if (!pat) { this.toRest(0.5); return; }
      this.startPattern(pat, p);
    },
    startPattern(pat, p) {
      this.lastPat = pat.id; this.pat = pat; this.mode = 'tele'; this.mt = 0; this.ps = {}; this.vx = 0; this.patN = (this.patN || 0) + 1;
      this.patLog[pat.id] = (this.patLog[pat.id] || 0) + 1;
      if (audit.on) audit.log.push({ k: 'pattern', id: pat.id, tele: pat.tele, t: S.Game.time, enraged: this.enraged });
      sfx('alarm', { x: this.x, vol: 0.3 }); // audible wind-up (rule 1)
      if (pat.begin) pat.begin(this, p);
    },
    // test hook (tools/dodgetest.js): start a specific pattern now
    forcePattern(id) {
      const pat = this.impl.patterns.find((q) => q.id === id);
      if (!pat) return false;
      this.interrupt('rest', 99); this.startPattern(pat, plr());
      return true;
    },
    endPattern() {
      const pt = this.pat;
      if (pt && pt.end) pt.end(this);
      this.mode = 'recover'; this.vx = 0;
      this.mt = this.ps && this.ps.rec != null ? this.ps.rec : (pt && pt.rec != null ? pt.rec : 0.5);
      this.dizzyNow = !!(this.ps && this.ps.dizzy);
      this.pat = null; this.ps = {};
    },
    run(dt, p) {
      const im = this.impl;
      const dtReal = dt;
      dt *= this.rate;
      switch (this.mode) {
        case 'enter':
          this.mt += dt;
          if (im.enter) im.enter(this, dt, this.mt);
          if (this.mt >= (im.enterT || 1.5)) this.toRest(FAIR.startGrace); // rule 5: 2 s of peace after the boss appears
          break;
        case 'rest':
          this.mt -= dt;
          if (p) this.face = sgn(p.x - this.x);
          if (im.idle) im.idle(this, dt, p);
          if (this.mt <= 0 && !(this.noStartT > 0) && !S.Shots.list.some((q) => q.bossShot && q.homing && !q.dead)) this.pick(p); // rule 5: no new attack for 0.9 s after a hit, and never stack a new attack on live seekers
          break;
        case 'tele': {
          const pt = this.pat; this.mt += dtReal; // telegraphs run in REAL seconds (rule 1/8): difficulty never shortens them
          this.tele = U.clamp(this.mt / pt.tele, 0, 1);
          if (!pt.lock && p) this.face = sgn(p.x - this.x);
          if (pt.teleTick) pt.teleTick(this, dt, this.tele, p);
          if (this.mt >= pt.tele) { this.tele = 0; this.mode = 'act'; this.mt = 0; if (pt.start) pt.start(this, p); }
          break;
        }
        case 'act': {
          const pt = this.pat; this.mt += dt;
          if (pt.tick) pt.tick(this, dt, Math.min(1, this.mt / pt.dur), this.mt, p);
          if (this.mt >= pt.dur || this.ps.done) this.endPattern();
          break;
        }
        case 'recover':
          this.mt -= dt;
          if (im.idle && !this.dizzyNow) im.idle(this, dt, p);
          if (this.mt <= 0) { this.dizzyNow = false; this.toRest(); }
          break;
        case 'stagger':
          this.mt -= dt; this.vx *= 0.9;
          if (this.mt <= 0) this.toRest(0.4);
          break;
        case 'roar':
          this.mt -= dt; this.roar = U.clamp(1 - this.mt / 1.2, 0, 1);
          if (this.mt <= 0) { this.roar = 0; this.toRest(FAIR.startGrace); }
          break;
        default: this.toRest(0.5);
      }
    },
    update(dt) {
      const g = S.Game;
      if (!g || this.dead) return;
      if (this._dying || this.dying) { this.dyingUpdate(dt); return; }
      if (g.state === 'bossdeath') return;
      if (this.flash > 0) this.flash -= dt;
      if (this.vcd > 0) this.vcd -= dt;
      if (this.wcd > 0) this.wcd -= dt;
      if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slowMul = 1; }
      if (this.glitchT > 0) this.glitchT -= dt;
      const real = dt;
      dt *= (this.mode === 'tele' || this.mode === 'act') ? 1 : this.slowMul; // freeze/mud/gravity supers slow a boss's walking and resting, never its telegraphed attacks (marker timings must stay true)
      this.t += dt; this.anim += dt;
      const p = plr();
      if (p) { // rule 5: peace after a hit and after a respawn
        if (this._pl !== p) { this._pl = p; this.noStartT = Math.max(this.noStartT || 0, 1.0); }
        if (p.hurtT > 0) this.noStartT = Math.max(this.noStartT || 0, FAIR.hurtGrace);
      }
      if (this.noStartT > 0) this.noStartT -= dt;
      this.run(dt, p);
      this.x += this.vx * dt * this.rate;
      if (this.impl.update) this.impl.update(this, dt, p);
      const bd = arenaBounds(this);
      if (!isFinite(this.x)) this.x = (bd.l + bd.r) / 2;
      if (!isFinite(this.y)) this.y = bd.floor;
      if (this.x < bd.l) { this.x = bd.l; this.hitWall = -1; } else if (this.x > bd.r) { this.x = bd.r; this.hitWall = 1; } else this.hitWall = 0;
      if (this.impl.contact && p) {
        const cb = this.impl.contact(this);
        if (cb) for (const r of cb) if (Bosses.hitRect(p, r.x0, r.y0, r.x1, r.y1)) { hurtP(p, r.dmg || 1, this, { dirX: U.sign(p.x - this.x) || 1, kind: 'boss' }); break; }
      }
      void real;
    },
    dyingUpdate(dt) {
      this.anim += dt;
      this.shx = U.rand(-2, 2) * (this._burn ? 1.4 : 0.6); this.shy = U.rand(-1.5, 1.5) * (this._burn ? 1.4 : 0.6);
      if (this.impl.dyingTick) this.impl.dyingTick(this, dt);
    },
    inHit(x, y, pad) {
      pad = pad || 0;
      for (const r of boxes(this)) if (x >= r.x0 - pad && x <= r.x1 + pad && y >= r.y0 - pad && y <= r.y1 + pad) return true;
      return false;
    },
    hurt(dmg, src, info) {
      if (this.dead || this.noHurt || this.dying || this._dying) return true;
      info = info || {};
      const def = this.def;
      if (this.invuln) {
        if (S.FX) S.FX.spark(info.x || this.x, info.y || this.y - this.h / 2, 3, '#ffffff');
        if (this.wcd <= 0 && S.Comic) { this.wcd = 0.4; word('TINK', info.x || this.x, (info.y || this.y - this.h / 2) - 10, { size: 14, color: '#ffffff' }); }
        return false;
      }
      let mul = 1, weak = false;
      if (info.superId && info.superId === def.weakTo) { mul = 4; weak = true; }
      else if (def.weakTo === 'doosh' && (info.kind === 'pellet' || info.superId === 'doosh')) { mul = 3; weak = true; }
      dmg *= mul;
      this.hp -= dmg; this.flash = 0.07;
      const hx = info.x || this.x, hy = info.y || (this.y - this.h * 0.55);
      if (S.FX) S.FX.spark(hx, hy, 3, '#ffffff');
      if (weak) {
        if (this.wcd <= 0) {
          this.wcd = 0.55;
          word('WEAK!', this.x, this.y - this.h - 26, { size: 34, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff3b3b', life: 0.9, vy: -30 });
          sfx('boss_flash', { x: this.x }); if (S.FX) { S.FX.shake(0.22); S.FX.hitstop(0.05); }
        }
        if (this.mode !== 'enter' && this.stagger <= 0) { this.stagger = 1; this.interrupt('stagger', 1.0); }
      } else if (Math.random() < 0.16 && this.wcd <= 0) {
        word(pick(this.impl.hitWords || ['OOF!', 'UGH!', 'OW!', 'HEY!']), hx, hy - 16, { size: 15, color: '#ffffff' });
      }
      if (this.stagger > 0) this.stagger -= 0.2;
      sfx(this.impl.metal ? 'hit_metal' : 'hit', { x: this.x, vol: 0.45 });
      if (this.vcd <= 0 && Math.random() < 0.3) { this.vcd = 3.5; say(this, 'boss_hurt'); }
      if (this.hp <= 0) { this.die(); return true; }
      if (!this.enraged && this.hp <= this.maxHp * 0.5) this.goEnraged();
      return true;
    },
    goEnraged() {
      if (audit.on) audit.log.push({ k: 'enrage', t: S.Game.time });
      this.enraged = true; this.phase = 2; this.rate = this.baseRate; // phase 2 is denser, not faster-clocked (telegraphs stay real-time)
      this.interrupt('roar', 1.2); this.bag = [];
      // rule 5: the roar is followed by a clean 2 s: wipe bullets, zones and pending timers
      this.timers = [];
      for (const e of S.Game.ents) if (e.bossFx) e.dead = true;
      for (const s of S.Shots.list) if (s.bossShot) s.dead = true;
      word(this.impl.enrageWord || 'ENRAGED!', this.x, this.y - this.h - 30, { size: 36, color: '#ff3b3b', stroke: '#ffffff', burst: true, burstColor: '#ffe14d', life: 1.3 });
      if (S.FX) { S.FX.flash('#ff3b3b', 0.18); S.FX.shake(0.6); S.FX.hitstop(0.08); }
      sfx('alarm', { x: this.x, vol: 0.5 }); sfx('boss_crash', { x: this.x });
      say(this, 'boss_enrage', true);
      if (this.impl.enrage) this.impl.enrage(this);
    },
    die() {
      if (this.dying || this._dying) return;
      this.hp = 0; this.dying = true;
      this.interrupt('roar', 99);
      S.Game.onBossDying(this);
    },
    draw(ctx) {
      FL = this.flash > 0 || !!this._white;
      ctx.save();
      ctx.translate(this.x + (this.shx || 0), this.y + (this.shy || 0));
      try { this.impl.draw(ctx, this); } catch (e) { if (!this._drawErr) { this._drawErr = 1; console.error('[boss draw]', this.id, e); } }
      ctx.restore();
      FL = false;
      if (!this.dying && !this._dying) {
        if (this.tele > 0 && this.mode === 'tele') this.drawBang(ctx);
        if (this.stagger > 0 || this.mode === 'stagger' || this.dizzyNow) this.drawStars(ctx);
      }
    },
    drawBang(ctx) {
      const x = this.x, y = this.y - this.h - 26 - Math.sin(this.t * 20) * 3;
      ctx.save(); ctx.translate(x, y); const s = 1 + (1 - this.tele) * 0.4; ctx.scale(s, s);
      if (S.Comic) S.Comic.burst(ctx, 0, 0, 12, 20, 8, 5); else { ctx.beginPath(); ctx.arc(0, 0, 16, 0, TAU); }
      ctx.fillStyle = Math.floor(this.t * 16) % 2 ? '#ffe14d' : '#ff3b3b'; ctx.fill(); ink(ctx, 3); ctx.stroke();
      ctx.fillStyle = INK; ctx.font = '22px Bangers, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 2);
      ctx.restore();
    },
    drawStars(ctx) {
      const x = this.x, y = this.y - this.h - 10;
      for (let i = 0; i < 3; i++) { const a = this.t * 5 + i * TAU / 3; star(ctx, x + Math.cos(a) * 26, y + Math.sin(a) * 6, 7, '#ffe14d', a); }
    },
  };

  // ------------------------------------------------------------------ pattern factories (fairness-checked)
  const P = Bosses.P = {};

  // ---- threats: everything a human can SEE that will hurt, in absolute px, times in seconds from now (used by tools/dodgetest.js)
  //   {k:'rect', x0,y0,x1,y1, vx,vy, t0,t1}   box that hurts during [t0,t1], drifting at (vx,vy) from t0 on
  //   {k:'ball', x,y,vx,vy, g, r, t0,t1, hom, sine, burst:{w,h,life}}  projectile (ballistic; hom = turn rate rad/s toward the player)
  //   {k:'wind', src, mag, t0,t1}              horizontal push on the player (mag>0 away from src, <0 toward it)
  let tidc = 1;
  const GR = () => C.GRAV * ((S.Game && S.Game.grav) || 1);
  function thBall(x, y, vx, vy, gm, r, t0, life, ex) { return Object.assign({ k: 'ball', x, y, vx, vy, g: GR() * gm, r: r * 0.85, t0, t1: t0 + life }, ex || {}); }
  function thRect(x0, y0, x1, y1, vx, t0, t1, ex) { return Object.assign({ k: 'rect', x0, y0, x1, y1, vx: vx || 0, vy: 0, t0, t1 }, ex || {}); }
  function shockThr(out, x, y, rem, o) { // the two crests shockPair() will send out of x
    o = o || {}; const w = o.w || 46, h = Math.min(o.h || 34, 36), sp = Math.min(o.speed || 220, 240), life = o.life || 1.7;
    for (const d of [-1, 1]) out.push(thRect(x + d * 20 - w / 2, y - h, x + d * 20 + w / 2, y, d * sp, rem, rem + life));
  }
  Proto.threats = function () {
    const out = [], g = S.Game; if (!g) return out;
    const push = (prefix, fn) => { const tmp = []; fn(tmp); let i = 0; for (const r of tmp) { r.id = r.id ? prefix + '#' + r.id : prefix + ':' + (i++); out.push(r); } }; // ids stay stable frame to frame (the bot tracks when it first SAW each threat)
    for (const e of g.ents) {
      if (!e.bossFx || e.dead) continue;
      const rem = Math.max(0, e.tele - e.t);
      if (e.noHit) { if (e.thr) push('m' + e.uid, (tmp) => e.thr(rem, tmp)); continue; }
      if (!(e.dmg > 0)) continue;
      out.push({ id: 'z' + e.uid, k: 'rect', x0: e.x - e.w / 2, y0: e.y - e.h, x1: e.x + e.w / 2, y1: e.y, vx: e.vx, vy: e.vy, t0: rem, t1: rem + Math.max(0, e.life - Math.max(0, e.t - e.tele)), tele: e.t < e.tele, pre: e.pre });
    }
    for (const s of S.Shots.list) {
      if (!s.bossShot || s.dead || s.team !== 'enemy') continue;
      s._tid = s._tid || ('s' + (tidc++));
      const life = Math.min(s.life, s.fuse != null ? s.fuse : 99);
      const r = { id: s._tid, k: 'ball', x: s.x, y: s.y, vx: s.vx, vy: s.vy, g: s.grav ? GR() * s.grav : 0, r: s.r * 0.85, t0: 0, t1: life, hom: s.homing || 0, homeT: Math.max(0, s.homeT - s.age), noTerrain: !!s.noTerrain, pre: !!s.falling };
      if (s.burst) r.burst = s.burst;
      if (s.sine) r.sine = { y0: s.sine.y0, a: s.sine.a, f: s.sine.f, ph: s.sine.ph || 0, age: s.age || 0 };
      out.push(r);
    }
    if (this.pat && this.pat.thr && (this.mode === 'tele' || this.mode === 'act')) push('p' + this.uid + '.' + (this.patN || 0), (tmp) => this.pat.thr(this, tmp));
    if (this.impl.thr) push('i' + this.uid, (tmp) => this.impl.thr(this, tmp));
    return out;
  };

  // ---- tiny scheduler tied to the boss clock (fires cb after sec of game time; cancelled if the boss dies / enrages)
  function setTimeoutSafe(b, sec, cb) {
    if (sec <= 0) { cb(); return; }
    (b.timers = b.timers || []).push({ t: sec, cb });
  }
  Proto.tickTimers = function (dt) {
    const tl = this.timers; if (!tl || !tl.length) return;
    for (let i = tl.length - 1; i >= 0; i--) { tl[i].t -= dt; if (tl[i].t <= 0) { const cb = tl[i].cb; tl.splice(i, 1); try { cb(); } catch (e) { console.error('[boss timer]', e); } } }
  };
  const _update = Proto.update;
  Proto.update = function (dt) { if (!this.dying && !this._dying && !this.dead && S.Game && S.Game.state !== 'bossdeath') this.tickTimers(dt); _update.call(this, dt); };

  const spdCap = (b, v) => Math.min(v, b.enraged ? FAIR.projMaxP2 : FAIR.projMax);
  // x positions (>= columnGap apart, >= edge from the walls) for column strikes; the first one is aimed at the player (it still has a full telegraph)
  function spacedXs(b, p, n, o) {
    o = o || {};
    const A = arenaOf(b), lo = A.x0 + (o.edge || FAIR.edge), hi = A.x1 - (o.edge || FAIR.edge), gapMin = o.gap || FAIR.columnGap, xs = [];
    const ok = (x) => xs.every((q) => Math.abs(q - x) >= gapMin) && (o.avoidX == null || Math.abs(x - o.avoidX) >= (o.avoidR || 140));
    if (o.aimed !== false && p) { const x = U.clamp(p.x, lo, hi); if (ok(x)) xs.push(x); }
    for (let tries = 0; xs.length < n && tries < 120; tries++) { const x = U.rand(lo, hi); if (ok(x)) xs.push(x); }
    return xs;
  }
  // marker (hatched column, o.tele s) -> falling object. o {shape,r,dmg,color,color2,spin,onEnd,fallV,gm,mw,mcolor,gap,tele,burst:{w,h,life}}
  function columns(b, xs, o) {
    const A = arenaOf(b), tele = o.tele || 0.75, gm = o.gm == null ? 0.8 : o.gm, fv = o.fallV || 160, r = o.r || 9, life = 3;
    xs.forEach((x, i) => {
      setTimeoutSafe(b, i * (o.gap == null ? 0.22 : o.gap), () => {
        marker(x, A.y1, tele, { w: o.mw || 44, color: o.mcolor,
          thr: (rem, out) => out.push(thBall(x, A.y0 + 12, 0, fv, gm, r, rem, life, o.burst ? { burst: o.burst } : null)),
          onEnd: () => proj({ x, y: A.y0 + 12, vx: 0, vy: fv, grav: gm, shape: o.shape || 'rock', r, dmg: o.dmg, color: o.color, color2: o.color2, spin: o.spin || 0, life, onEnd: o.onEnd, size: o.size, falling: true, close: true, burst: o.burst }) });
      });
    });
  }

  // aimed lobs (arc, flight >= 0.55 s, aimed at where the player IS at launch: no lead): o {id,w,tele,count,gap,speed,grav,spread,muzzle,word,shape,r,dmg,color,onEnd,p2,p1}
  P.lob = function (o) {
    const gap = o.gap || 0.5, maxN = o.maxCount || (typeof o.count === 'number' ? o.count : 3);
    const cntOf = (b) => (typeof o.count === 'function' ? o.count(b) : (o.count || 3));
    return Object.assign({
      id: o.id || 'lob', w: o.w || 1, tele: Math.max(o.tele || 0.8, FAIR.teleHeavy), dur: 0.35 + maxN * gap, rec: 0.6,
      // floaty arcs (grav 0.14): flight 0.8-1.5 s, launch speed <= 330 px/s
      begin(b) { if (o.word) word(o.word, b.x, b.y - b.h - 54, { size: 20, color: '#ffffff', stroke: '#e8173a', life: 0.8 }); },
      start(b) { b.ps.n = 0; b.ps.nt = 0; },
      tick(b, dt) {
        b.ps.nt -= dt;
        const count = cntOf(b);
        if (b.ps.n >= count && b.ps.nt <= -0.25) b.ps.done = true;
        if (b.ps.n < count && b.ps.nt <= 0) {
          b.ps.nt = gap; b.ps.n++;
          const m = o.muzzle(b), p = plr();
          const tx = (p ? p.x : m.x - b.face * 300) + U.rand(-(o.spread || 24), o.spread || 24), ty = p ? p.y - 12 : floorOf(b) - 10;
          const gm = o.grav == null ? 0.14 : o.grav, v = lobV(m.x, m.y, tx, ty, Math.min(o.speed || 240, 250), gm);
          proj({ x: m.x, y: m.y, vx: v.vx, vy: v.vy, grav: gm, shape: o.shape || 'ball', r: o.r || 8, dmg: o.dmg, color: o.color, color2: o.color2, spin: o.spin || 0, life: 4, onEnd: o.onEnd, size: o.size });
          sfx(o.sfx || 'grenade_throw', { x: m.x, vol: 0.5 });
          if (o.onFire) o.onFire(b, m);
        }
      },
    }, { p2: !!o.p2, p1: !!o.p1 }, o.extra || {});
  };

  // aimed fan: each volley LOCKS its aim 0.5 s before firing and draws the rays (a dashed line per bullet = the bullet's path), bullets are
  // >= 0.4 rad apart (>= 70 px gaps once the player is >= 200 px away), speed <= 330 (enraged 420). o {count,step,volleys,gap,speed,muzzle,shape,r,dmg,color,word,homing,life,shout}
  P.fan = function (o) {
    const vol = o.volleys || 2, gap = Math.max(o.gap || 1.0, 0.9), LOCK = 0.5, n = o.count || 3, step = Math.max(o.step || 0.4, 0.4), minDist = o.minDist || 200;
    const pat = {
      id: o.id || 'fan', w: o.w || 1, tele: Math.max(o.tele || 0.9, FAIR.teleHeavy), dur: 0.2 + (vol - 1) * gap + 0.4, rec: 0.6,
      can(b, p) { if (!p) return true; const m = o.muzzle(b); return Math.hypot(p.x - m.x, p.y - 16 - m.y) >= minDist; },
      begin(b) { b.ps.lk = []; b.ps.fired = []; if (o.word) word(o.word, b.x, b.y - b.h - 54, { size: 20, color: '#ffffff', stroke: '#e8173a', life: 0.8 }); },
      lockV(b, p, v) {
        const m = o.muzzle(b), base = p ? Math.atan2((p.y - 16) - m.y, p.x - m.x) : (b.face > 0 ? 0 : Math.PI), ang = [];
        // the closer the player, the wider the fan, so the gaps stay >= 70 px at the player's range (capped at 0.95 rad)
        const dist = p ? Math.hypot(p.x - m.x, p.y - 16 - m.y) : 400, st = Math.min(0.95, Math.max(step, (70 + 2 * (o.r || 6) + 8) / Math.max(dist, 60)));
        for (let i = 0; i < n; i++) ang.push(base + (i - (n - 1) / 2) * st);
        b.ps.lk[v] = { ang, m };
        zone({ x: m.x, y: m.y, w: 1, h: 1, tele: LOCK, life: 0, noHit: true, warn: 'rays', rays: ang, color: o.color || '#ff3b3b', sign: false });
        sfx('beep', { x: m.x, vol: 0.25 });
      },
      teleTick(b, dt, k, p) { if (!b.ps.lk[0] && b.mt >= pat.tele - LOCK) pat.lockV(b, p, 0); },
      start(b, p) { if (!b.ps.lk[0]) pat.lockV(b, p, 0); },
      tick(b, dt, k, t, p) {
        for (let v = 0; v < vol; v++) {
          if (!b.ps.lk[v] && t >= v * gap - LOCK) pat.lockV(b, p, v);
          if (b.ps.lk[v] && !b.ps.fired[v] && t >= v * gap) {
            b.ps.fired[v] = true;
            const L = b.ps.lk[v], sp = spdCap(b, o.speed || 300);
            for (const a of L.ang) proj({ x: L.m.x, y: L.m.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, shape: o.shape || 'ball', r: o.r || 6, dmg: o.dmg, color: o.color, color2: o.color2, spin: o.spin || 0, life: o.life || 3.2, homing: o.homing || 0, homeT: o.homeT, noTerrain: o.noTerrain, onEnd: o.onEnd });
            sfx(o.sfx || 'shotgun', { x: L.m.x, vol: 0.5 });
            if (o.fx) o.fx(b, L.m);
            if (o.shout) word(pick(o.shout), L.m.x + b.face * 20, L.m.y - 24, { size: 26, color: o.color || '#ffe14d', stroke: '#141018', burst: true, burstColor: '#ff7a1a', life: 0.55 });
          }
        }
        if (o.during) o.during(b, dt, p);
        if (b.ps.fired.length >= vol && b.ps.fired.every(Boolean) && t > (vol - 1) * gap + 0.35) b.ps.done = true;
      },
      thr(b, out) { // bullets that are locked but not fired yet
        const tNow = b.mode === 'tele' ? -(pat.tele - b.mt) : b.mt, sp = spdCap(b, o.speed || 300);
        for (let v = 0; v < vol; v++) {
          const L = b.ps.lk && b.ps.lk[v]; if (!L || (b.ps.fired && b.ps.fired[v])) continue;
          const tf = Math.max(0, v * gap - tNow);
          L.ang.forEach((a, i) => out.push(thBall(L.m.x, L.m.y, Math.cos(a) * sp, Math.sin(a) * sp, 0, o.r || 6, tf, o.life || 3.2, Object.assign({ id: 'f' + v + '_' + i }, o.homing ? { hom: o.homing, homeT: o.homeT || 99 } : null))));
        }
        if (o.wind && b.mode === 'act') out.push({ k: 'wind', src: b.x, mag: o.wind, t0: 0, t1: pat.dur - b.mt });
      },
    };
    return Object.assign(pat, { p2: !!o.p2, p1: !!o.p1 }, o.extra || {});
  };

  // column strikes from the ceiling (marker 0.75 s -> falling object); columns are >= 130 px apart, >= 92 px from the walls
  P.rain = function (o) {
    return Object.assign({
      id: o.id || 'rain', w: o.w || 1, tele: Math.max(o.tele || 0.8, FAIR.teleHeavy), dur: 0.3 + (typeof o.n === 'number' ? o.n : (o.maxN || 5)) * 0.22 + 1.9, rec: 0.7,
      begin(b) { if (o.word) word(o.word, b.x, b.y - b.h - 54, { size: 20, color: '#ffffff', stroke: '#e8173a', life: 0.8 }); },
      start(b, p) {
        const n = typeof o.n === 'function' ? o.n(b) : (o.n || 5);
        columns(b, spacedXs(b, p, n), { shape: o.shape, r: o.r, dmg: o.dmg, color: o.color, color2: o.color2, spin: o.spin, onEnd: o.onEnd, size: o.size, mcolor: o.mcolor, burst: o.burst, tele: o.tele2 || 0.75, gm: o.gm });
      },
    }, { p2: !!o.p2, p1: !!o.p1 }, o.extra || {});
  };

  // charge: lane + direction locked when the wind-up STARTS (hatched lane + arrows drawn to the wall), only the front RAM box hurts
  // (o.ram {dx0,dx1,h} relative to the boss, facing-forward), speed <= 380 (enraged <= 450), dizzy at the wall = the reward for dodging.
  P.charge = function (o) {
    const ram = o.ram, sp0 = Math.min(o.speed || 340, 380), sp2 = Math.min(o.speedP2 || sp0 * 1.15, 450);
    const spd = (b) => (b.enraged ? sp2 : sp0);
    const pat = {
      id: o.id || 'charge', w: o.w || 1, tele: Math.max(o.tele || 1.1, 0.9), dur: 6, rec: 0.5, lock: true,
      begin(b, p) {
        b.ps = {}; const A = arenaOf(b);
        const dir = p ? sgn(p.x - b.x) : -1;
        b.charge = { dir, k: 0 }; b.face = dir;
        const wall = dir > 0 ? A.x1 : A.x0, xa = b.x + dir * ram.dx0, lx0 = Math.min(xa, wall), lx1 = Math.max(xa, wall);
        zone({ x: (lx0 + lx1) / 2, y: A.y1, w: Math.max(40, lx1 - lx0), h: ram.h, tele: pat.tele, life: 0, noHit: true, warn: 'lane', dir, sign: false });
        if (o.word) word(o.word, b.x, b.y - b.h - 54, { size: 22, color: '#ffffff', stroke: '#e8173a', life: 0.9 });
        sfx(o.sfxTele || 'alarm', { x: b.x, vol: 0.4 });
      },
      teleTick(b, dt, k) { b.charge.k = k; b.revving = true; if (o.teleFx) o.teleFx(b, dt, k); },
      start(b) { b.revving = false; b.charging = true; b.vx = b.charge.dir * spd(b); sfx(o.sfxGo || 'whoosh', { x: b.x }); b.ps.t0 = 0; },
      tick(b, dt) {
        const bd = arenaBounds(b);
        if (o.goFx) o.goFx(b, dt);
        if ((b.charge.dir > 0 && b.x >= bd.r - 1) || (b.charge.dir < 0 && b.x <= bd.l + 1)) {
          b.vx = 0; b.ps.done = true; b.ps.dizzy = true; b.ps.rec = o.dizzy || 1.8;
          word(o.crashWord || 'KRAKOOM!', b.x + b.charge.dir * b.w / 2, b.y - 40, { size: 34, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.9 });
          if (S.FX) { S.FX.shake(0.7); S.FX.hitstop(0.06); S.FX.debris(b.x + b.charge.dir * b.w / 2, b.y - 30, 10, o.debris || '#c9c5da'); }
          sfx('explode', { x: b.x, vol: 0.7 });
          if (o.onCrash) o.onCrash(b);
        }
      },
      end(b) { b.charging = false; b.revving = false; b.vx = 0; },
      thr(b, out) {
        const c = b.charge; if (!c) return;
        const A = arenaOf(b), bd = arenaBounds(b), sp = spd(b), rem = b.mode === 'tele' ? Math.max(0, pat.tele - b.mt) : 0;
        const dist = c.dir > 0 ? bd.r - b.x : b.x - bd.l, tt = Math.max(0, dist) / sp;
        const rx0 = c.dir > 0 ? b.x + ram.dx0 : b.x - ram.dx1, rx1 = c.dir > 0 ? b.x + ram.dx1 : b.x - ram.dx0;
        out.push(thRect(rx0, A.y1 - ram.h, rx1, A.y1, c.dir * sp, rem, rem + tt + 0.05, { body: true }));
      },
    };
    return Object.assign(pat, { p2: !!o.p2, p1: !!o.p1 }, o.extra || {});
  };

  // leap: ballistic jump to a floor marker locked when the wind-up starts; the crests (jumpable) leave the landing point. o.shock = shockPair opts
  P.leap = function (o) {
    const sh = Object.assign({ w: 46, h: 34, speed: 220, life: 1.7 }, o.shock || {}), T = 0.85;
    sh.h = Math.min(sh.h, 36); sh.speed = Math.min(sh.speed, 240);
    const pat = {
      id: o.id || 'leap', w: o.w || 1, tele: Math.max(o.tele || 1.0, 0.9), dur: 3, rec: 0.9, lock: false,
      begin(b, p) {
        const A = arenaOf(b); b.ps.tx = U.clamp(p ? p.x : b.x - 200, A.x0 + b.w / 2 + 10, A.x1 - b.w / 2 - 10);
        const tx = b.ps.tx;
        marker(tx, A.y1, pat.tele + T, { w: 2 * (20 + sh.w / 2), h: 14, warn: 'circle', thr: (rem, out) => shockThr(out, tx, A.y1, rem, sh) });
        if (o.word) word(o.word, b.x, b.y - b.h - 54, { size: 20, color: '#ffffff', stroke: '#e8173a', life: 0.8 });
      },
      teleTick(b, dt, k) { b.crouch = k; },
      start(b) {
        b.crouch = 0; b.ps.T = T; b.vx = 0; b.vy = -C.GRAV * T / 2; b.ps.air = true; b.ps.vx = (b.ps.tx - b.x) / T; b.airborne = true; sfx('boing', { x: b.x });
      },
      tick(b, dt) {
        if (b.ps.air) {
          b.x += b.ps.vx * dt;
          if (fall(b, dt)) {
            b.ps.air = false; b.airborne = false; b.ps.done = true;
            const A = arenaOf(b);
            word(o.slamWord || 'THOOM!', b.x, b.y - 30, { size: 34, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.8 });
            if (S.FX) { S.FX.shake(0.6); S.FX.hitstop(0.05); S.FX.dust(b.x - 30, b.y, 6); S.FX.dust(b.x + 30, b.y, 6); }
            sfx('thoom', { x: b.x });
            shockPair(b.x, A.y1, sh);
            if (o.onSlam) o.onSlam(b);
          }
        }
      },
      end(b) { b.airborne = false; b.crouch = 0; b.y = floorOf(b); b.vy = 0; },
    };
    return Object.assign(pat, { p2: !!o.p2, p1: !!o.p1 }, o.extra || {});
  };

  // minion summons: spawn at the FAR side of the arena (>= 250 px from the player) under a 0.8 s spawn-in warning ring (rule 7)
  function minionId(list) {
    const ok = list.filter((id) => S.EnemyDefs && S.EnemyDefs[id]);
    return ok.length ? pick(ok) : 'grunt';
  }
  function countMinions(b) { b.minions = (b.minions || []).filter((e) => !e.dead); return b.minions.length; }
  P.summon = function (o) {
    const spotsFor = (b, p, n) => {
      const A = arenaOf(b), side = p ? (p.x - A.x0 > A.x1 - p.x ? -1 : 1) : 1, out = [];
      for (let i = 0; i < n; i++) out.push({ x: side < 0 ? A.x0 + 56 + i * 58 : A.x1 - 56 - i * 58, side });
      return out;
    };
    return Object.assign({
      id: o.id || 'summon', w: o.w || 0.8, tele: Math.max(o.tele || 0.9, FAIR.teleHeavy), dur: 0.6, rec: 0.9,
      can(b) { return countMinions(b) < (o.max || 3); },
      begin(b, p) {
        word(o.word || 'GET HIM, BOYS!', b.x, b.y - b.h - 54, { size: 20, color: '#ffffff', stroke: '#e8173a', life: 0.9 }); if (o.whistle !== false) sfx('whistle', { x: b.x });
        const A = arenaOf(b), n = Math.min(o.n || 2, (o.max || 3) - countMinions(b));
        b.ps.spots = spotsFor(b, p, n);
        for (const s of b.ps.spots) marker(s.x, A.y1, b.pat.tele, { w: 40, h: 14, warn: 'circle', color: '#6bff9a', sign: false });
      },
      start(b, p) {
        const A = arenaOf(b);
        for (const s of b.ps.spots || []) {
          let x = s.x;
          if (p && Math.abs(p.x - x) < 250) x = U.clamp(p.x + (p.x > (A.x0 + A.x1) / 2 ? -1 : 1) * 300, A.x0 + 40, A.x1 - 40); // player walked into the spawn: use the other side
          if (audit.on) audit.log.push({ k: 'minion', dist: p ? Math.abs(p.x - x) : 999, warn: Math.max(0.8, FAIR.teleHeavy) });
          const e = S.Game.spawnEnemy(minionId(o.ids || ['grunt']), x, A.y1, { facing: -s.side, charge: true });
          (b.minions = b.minions || []).push(e);
          if (S.FX) { S.FX.ring(x, A.y1 - 14, 26, '#ffffff'); S.FX.dust(x, A.y1, 4); }
        }
      },
    }, { p2: !!o.p2, p1: !!o.p1 }, o.extra || {});
  };


  // ------------------------------------------------------------------ factory
  Bosses.make = function (themeId, x, y) {
    const impl = Impl[themeId], def = Defs[themeId];
    if (!impl || !def) return null;
    const g = S.Game, dk = (g && g.diffKey) || 'normal';
    const hpMul = dk === 'ultra' ? 1.25 : dk === 'baby' ? 0.8 : 1;
    const hp = Math.round(def.hp * hpMul);
    const b = Object.create(Proto);
    Object.assign(b, {
      uid: Math.floor(Math.random() * 1e9), kind: 'boss', team: 'enemy', id: themeId, name: def.name, def, impl, shootable: true,
      x, y, w: impl.w, h: impl.h, hw: impl.hw || impl.w / 2, vx: 0, vy: 0, face: -1, t: 0, anim: 0, flash: 0, hp, maxHp: hp, phase: 1, enraged: false,
      mode: 'enter', mt: 0, pat: null, ps: {}, bag: [], lastPat: '', patLog: {}, tele: 0, stagger: 0, slowMul: 1, slowT: 0, wcd: 0, vcd: 0,
      rate: (dk === 'baby' ? 0.88 : dk === 'ultra' ? 1.1 : 1), restMul: (dk === 'baby' ? 1.25 : dk === 'ultra' ? 0.85 : 1), minions: [], timers: [],
      dead: false, noHurt: false, invuln: false, always: true, hitWall: 0, roar: 0, dizzyNow: false, dying: false,
    });
    b.baseRate = b.rate;
    // the wind THEME's own gust would stack on the boss's (unmodelled, un-telegraphed push): switch it off for the fight (restored in deathSequence / by the next Game.start)
    if (g && g.themeObj && g.themeObj.wind) { b._themeObj = g.themeObj; g.themeObj = Object.assign({}, g.themeObj, { wind: null }); }
    if (!(g && g.level && g.level.arena)) b._arena = { x0: x - 650, x1: x + 230, y0: y - 400, y1: y };
    if (impl.init) impl.init(b);
    if (audit.on) audit.log.push({ k: 'spawn', t: g.time });
    word(impl.introWord || 'HERE I COME!', x, y - impl.h - 40, { size: 26, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#141018', life: 1.3 });
    if (S.FX) S.FX.shake(0.3);
    if (Bosses.preload) Bosses.preload(themeId);
    say(b, 'boss_intro', true);
    return b;
  };
  // flavour before the generic FF6 death (flash-crash x2, burn, EXPLODE, gold, chopper) which core plays via playBossDeath
  Bosses.deathSequence = function (boss) {
    const g = S.Game;
    if (boss._themeObj) { g.themeObj = boss._themeObj; boss._themeObj = null; }
    for (const e of g.ents) if (e.bossFx) e.dead = true;
    for (const s of S.Shots.list) if (s.bossShot) s.dead = true;
    if (boss.minions) for (const m of boss.minions) if (m && !m.dead) m.dead = true;
    say(boss, 'boss_die', true);
    if (boss.impl.dying) boss.impl.dying(boss);
    g.playBossDeath(boss);
  };
  Bosses.H = { K, ink, fs, ell, circ, rrect, poly, limb, line, inkLine, googly, halftone, txt, flame, star, proj, zone, marker, shockPair, lobV, lbox, fall, arenaOf, floorOf, plr, word, sfx, say, puff, setTimeoutSafe, minionId, countMinions, arenaBounds, sgn, pick, shuffle };

  // ------------------------------------------------------------------ boss implementations (below)

  // ---- shared helpers for the impls
  function keep(b, dt, p, min, max, sp) { // walk to hold a distance band from the player
    let v = 0;
    if (p) { const dx = p.x - b.x, ad = Math.abs(dx); if (ad > max) v = sgn(dx) * sp; else if (ad < min) v = -sgn(dx) * sp; }
    b.vx = U.approach(b.vx, v, sp * 5 * dt);
  }
  function clipZone(z) { const a = arenaOf(); if (z.x < a.x0 + 8 || z.x > a.x1 - 8) { z.dead = true; puff(z.x, z.y, 4); } }
  function tuft(ctx, x, y, a, len, w, fill) {
    const c = Math.cos(a), s = Math.sin(a);
    poly(ctx, [[x - s * w, y + c * w], [x + c * len, y + s * len], [x + s * w, y - c * w]], fill, 2.2);
  }
  function shout(b, text, o) { word(text, b.x, b.y - b.h - 56, Object.assign({ size: 20, color: '#ffffff', stroke: '#e8173a', life: 0.9 }, o || {})); }
  function ceilY(b) { return arenaOf(b).y0; }

  // ============================================================================================ ATTACK PATTERNS (all fairness-checked, see header)
  // Safe-by-construction vocabulary: ground crests (<=36 px, <=240 px/s, jump them), hatched column strikes (>=130 px apart, 0.75 s marker),
  // aimed fans with locked rays, slow lobs, locked-lane rams, 0.9 s floor beams. Every pattern lists what it threatens through zones / shots /
  // pat.thr() so tools/dodgetest.js can read it like a human reads the screen.
  const PAT = {};
  const RAM = Bosses.RAM = { ice: { dx0: -6, dx1: 84, h: 40 }, plains: { dx0: 46, dx1: 140, h: 42 } };
  const SHOCK = { w: 46, h: 34, speed: 220, life: 1.7 };
  const groundY = (s) => Math.floor(s.y / C.T) * C.T;

  // ---- ICE
  function fIce(s, why) {
    if (S.FX) { S.FX.spark(s.x, s.y, 8, '#bfefff'); S.FX.debris(s.x, s.y, 5, '#bfefff'); }
    sfx('glass', { x: s.x, vol: 0.4 });
    if (why === 'land') zone({ x: s.x, y: groundY(s), w: 30, h: 30, tele: 0, pre: true, life: 0.3, dmg: 1, style: 'spikes' });
  }
  const ICECOL = { shape: 'ice', r: 8, onEnd: fIce, burst: { w: 30, h: 30, life: 0.3 } };
  PAT.ice = [
    P.charge({ id: 'charge', w: 1.2, word: 'VROOOOM!', speed: 340, speedP2: 410, tele: 1.1, dizzy: 1.8, crashWord: 'WIPEOUT!', debris: '#aee8ff', ram: RAM.ice,
      onCrash(b) { const p = plr(); columns(b, spacedXs(b, p, 2, { aimed: false, avoidX: p ? p.x : null }), Object.assign({ tele: 0.75 }, ICECOL)); } }),
    P.lob({ id: 'snowballs', count: (b) => (b.enraged ? 4 : 3), maxCount: 4, gap: 0.5, speed: 300, shape: 'snow', r: 9, spin: 8, word: 'SNOWBALL FIGHT!',
      muzzle: (b) => ({ x: b.x + b.face * 44, y: b.y - 122 }), onEnd(s) { puff(s.x, s.y, 5, '#ffffff'); if (S.FX) S.FX.spark(s.x, s.y, 5, '#bfe4ff'); } }),
    P.rain(Object.assign({ id: 'icicles', n: (b) => (b.enraged ? 5 : 4), word: 'ICICLE STORM!' }, ICECOL)),
    { id: 'bigball', p2: true, w: 1.3, tele: 1.0, dur: 3.4, rec: 0.8,
      begin(b) { shout(b, 'BIG SNOWBALL!'); },
      start(b) {
        const A = arenaOf(b), dir = b.face, x0 = b.x + dir * 70;
        for (let i = 0; i < 2; i++) setTimeoutSafe(b, i * 1.4, () => zone({ x: x0, y: A.y1, w: 40, h: 40, vx: dir * 200, tele: 0.7, life: 6, dmg: 1, style: 'snowball', onTick: clipZone }));
      } },
    P.fan({ id: 'blizzard', p2: true, w: 1.2, count: 3, step: 0.42, volleys: 3, gap: 1.0, speed: 280, shape: 'snow', r: 8, spin: 6, word: 'BLIZZARD!', tele: 1.0, wind: 260,
      muzzle: (b) => ({ x: b.x + b.face * 44, y: b.y - 122 }),
      during(b, dt, p) { if (p) p.windX += sgn(p.x - b.x) * 260; if (Math.random() < 0.8 && S.FX) S.FX.add({ x: b.x + U.rand(-480, 480), y: floorOf(b) - U.rand(0, 300), vx: sgn(p ? p.x - b.x : 1) * 380, vy: 20, life: 0.5, kind: 'spark', color: '#ffffff', len: 18 }); } }),
  ];

  // ---- FIRE
  PAT.fire = [
    { id: 'breath', w: 1.3, tele: 0.95, dur: 3.2, rec: 0.7, lock: true,
      begin(b) {
        shout(b, 'FIRE BREATH!'); b.hose = 0.7; b.aimA = 0.1;
        const A = arenaOf(b), dir = b.face, len = 270, x = b.x + dir * (34 + len / 2);
        b.ps.jet = () => zone({ x, y: A.y1, w: len, h: 30, tele: 0.75, life: 0.3, dmg: 1, style: 'jet', dir, onStart: () => sfx('flame', { x: b.x, vol: 0.6 }) });
        zone({ x, y: A.y1, w: len, h: 30, tele: 0.95, life: 0.3, dmg: 1, style: 'jet', dir, onStart: () => sfx('flame', { x: b.x, vol: 0.6 }) });
      },
      teleTick(b, dt, k) { b.hose = 0.5 + k * 0.5; b.aimA = U.lerp(0.4, 0.05, k); },
      start(b) { const jet = b.ps.jet; setTimeoutSafe(b, 0.5, jet); setTimeoutSafe(b, 1.7, jet); },
      tick(b) { b.hose = 1; b.aimA = 0.05; },
      end(b) { b.hose = 0; } },
    { id: 'pillars', w: 1.2, tele: 0.9, dur: 2.8, rec: 0.7,
      begin(b) { shout(b, 'FIRE PILLARS!'); },
      start(b, p) {
        const A = arenaOf(b), n = b.enraged ? 5 : 4;
        const line = (dir) => { const xs = []; for (let i = 0; i < n; i++) { const x = b.x + dir * (120 + i * FAIR.columnGap); if (x < A.x0 + FAIR.edge || x > A.x1 - FAIR.edge) break; xs.push(x); } return xs; };
        let dir = p ? sgn(p.x - b.x) : -1, xs = line(dir); if (xs.length < 2) { dir = -dir; xs = line(dir); }
        xs.forEach((x, i) => setTimeoutSafe(b, i * 0.25, () => zone({ x, y: A.y1, w: 38, h: 100, tele: 0.75, life: 0.5, dmg: 1, style: 'fire' })));
      } },
    P.leap({ id: 'leap', word: 'CANNONBALL!', slamWord: 'KA-FWOOSH!', shock: { style: 'wave', color: '#ff7a1a', color2: '#ffe14d', speed: 230, h: 34, w: 46 } }),
    P.fan({ id: 'fireballs', count: 3, step: 0.42, volleys: 2, gap: 1.0, speed: 320, shape: 'fire', r: 8, word: 'FIREBALLS!', muzzle: hoseTip, sfx: 'flame' }),
    P.rain({ id: 'inferno', p2: true, n: 5, shape: 'fire', r: 9, word: 'INFERNO!', mcolor: '#ff7a1a', burst: { w: 34, h: 44, life: 0.55 },
      onEnd(s, why) { if (S.FX) S.FX.fire(s.x, s.y, 4); if (why === 'land') zone({ x: s.x, y: groundY(s), w: 34, h: 44, tele: 0, pre: true, life: 0.55, dmg: 1, style: 'fire' }); } }),
  ];

  // ---- WIND
  PAT.wind = [
    { id: 'gust', w: 1.4, tele: 1.1, dur: 4.4, rec: 0.8, lock: true,
      begin(b) { shout(b, 'INHALE...'); sfx('wind', { x: b.x, vol: 0.5 }); },
      teleTick(b, dt, k) { b.lung = 0.15 + k * 0.85; },
      start(b) { b.ps.nt = 0; b.ps.n = 0; word('WHOOOOOSH!', b.x + b.face * 80, b.y - 100, { size: 30, color: '#e9fbff', stroke: '#3bb4ff', burst: true, burstColor: '#a9e8d6', life: 1 }); },
      tick(b, dt, k, t, p) {
        b.lung = Math.max(0, 1 - t * 1.4);
        if (p) p.windX += sgn(p.x - b.x) * 240; // a steady blow AWAY from the boss
        const N = b.enraged ? 5 : 4;
        b.ps.nt -= dt;
        if (b.ps.nt <= 0 && b.ps.n < N) { // one leaf per 0.8-0.9 s, low (jump it) or high (stay low): never a wall of leaves
          b.ps.nt = b.enraged ? 0.8 : 0.9; b.ps.n++;
          const A = arenaOf(b), hi = b.ps.n % 3 === 0 || (b.ps.n > 1 && Math.random() < 0.35);
          proj({ x: b.x + b.face * 70, y: A.y1 - (hi ? 62 : 12), vx: b.face * (b.enraged ? 300 : 270), vy: 0, shape: 'leaf', r: 9, color: pick(['#6fcf4a', '#d9a441', '#e07a2f']), spin: 6, life: 3.4, noTerrain: true });
        }
        if (S.FX && Math.random() < 0.7) S.FX.add({ x: b.x + b.face * U.rand(60, 400), y: floorOf(b) - U.rand(0, 160), vx: b.face * 520, vy: 0, life: 0.35, kind: 'spark', color: '#ffffff', len: 20 });
        if (b.ps.n >= N && b.ps.nt <= -0.8) b.ps.done = true;
      },
      thr(b, out) { if (b.mode === 'act') out.push({ k: 'wind', src: b.x, mag: 240, t0: 0, t1: Math.max(0, this.dur - b.mt) }); } },
    { id: 'twisters', w: 1.1, tele: 1.0, dur: 3.8, rec: 0.8,
      begin(b) { shout(b, 'MINI TORNADOES!'); },
      start(b) {
        const A = arenaOf(b), dir = b.face, x0 = b.x + dir * 60, n = b.enraged ? 3 : 2;
        for (let i = 0; i < n; i++) setTimeoutSafe(b, i * 1.4, () => zone({ x: x0, y: A.y1, w: 34, h: 40, vx: dir * 190, tele: 0.7, life: 5, dmg: 1, style: 'twister', onTick: clipZone }));
      } },
    P.fan({ id: 'leafblower', count: 3, step: 0.42, volleys: 2, gap: 1.0, speed: 300, shape: 'leaf', r: 8, color: '#6fcf4a', word: 'LEAF BLOWER!', spin: 5, sfx: 'wind',
      muzzle: (b) => ({ x: b.x + b.face * 84, y: b.y - 92 }) }),
    { id: 'thunder', w: 1.2, tele: 1.0, dur: 2.8, rec: 0.7,
      begin(b) { shout(b, 'THUNDER!'); b.stormy = 1; },
      start(b, p) {
        const A = arenaOf(b), n = b.enraged ? 5 : 4;
        spacedXs(b, p, n).forEach((x, i) => setTimeoutSafe(b, i * 0.28, () => zone({ x, y: A.y1, w: 40, h: A.y1 - A.y0, tele: 0.8, life: 0.25, dmg: 1, style: 'bolt', onStart: () => { sfx('zap', { x }); if (S.FX) { S.FX.shake(0.25); S.FX.spark(x, A.y1, 8, '#ffe14d'); } } })));
      },
      end(b) { b.stormy = 0; } },
    P.leap({ id: 'cloudslam', p2: true, word: 'CLOUD SLAM!', slamWord: 'KA-BOOMCLOUD!', shock: { style: 'wave', color: '#e9fbff', color2: '#a9e8d6', speed: 230, h: 34, w: 46 } }),
  ];

  // ---- WATER
  function fDuckLand(s, why) {
    sfx('squeak', { x: s.x });
    if (why !== 'land') return;
    const x = s.x, y = groundY(s);
    marker(x, y, 0.9, { w: 84, h: 14, warn: 'circle', color: '#ffe14d', thr: (rem, out) => out.push(thRect(x - 42, y - 48, x + 42, y, 0, rem, rem + 0.22)),
      onEnd: () => {
        sfx('squeak', { x }); sfx('explode', { x, vol: 0.5 });
        word('SQUEAK-BOOM!', x, y - 40, { size: 22, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.7 });
        if (S.FX) { S.FX.explosion(x, y - 20, 30); S.FX.confetti(x, y - 20, 6); }
        zone({ x, y, w: 84, h: 48, tele: 0, pre: true, life: 0.22, dmg: 1, style: 'burst', color: '#ffe14d', color2: '#ffffff' });
      } });
  }
  PAT.water = [
    P.lob({ id: 'cannon', count: (b) => (b.enraged ? 4 : 3), maxCount: 4, gap: 0.55, speed: 320, shape: 'cannon', r: 9, word: 'FIRE THE CANNON!',
      muzzle: (b) => ({ x: b.x + b.face * 84, y: b.y - 50 }), onFire(b) { b.recoil = 1; if (S.FX) S.FX.smoke(b.x + b.face * 90, b.y - 50, 3); },
      onEnd(s) { if (S.FX) { S.FX.debris(s.x, s.y, 5, '#3bb4ff'); S.FX.dust(s.x, s.y, 4); } word('SPLOOSH!', s.x, s.y - 14, { size: 16, color: '#bdeaff' }); } }),
    { id: 'tidal', w: 1.3, tele: 1.1, dur: 4.0, rec: 0.7, lock: true,
      begin(b) { shout(b, 'SPLISH SPLASH!'); },
      start(b) {
        const A = arenaOf(b), n = b.enraged ? 3 : 2, sp = b.enraged ? 240 : 225, dir = b.face, x0 = b.x + dir * 80;
        sfx('splash', { x: b.x });
        for (let i = 0; i < n; i++) setTimeoutSafe(b, i * 1.3, () => zone({ x: x0, y: A.y1, w: 46, h: 34, vx: dir * sp, tele: 0.7, life: 4, dmg: 1, style: 'wave', color: '#3bb4ff', onTick: clipZone, onStart: () => sfx('splash', { x: b.x, vol: 0.5 }) }));
      } },
    { id: 'ducks', w: 1.1, tele: 0.9, dur: 2.8, rec: 0.9,
      begin(b) { shout(b, 'QUACK ATTACK!'); },
      start(b) {
        for (let i = 0; i < 3; i++) setTimeoutSafe(b, i * 0.8, () => {
          const p = plr(), tx = (p ? p.x : b.x - 200) + U.rand(-30, 30), ox = b.x + b.face * 40, oy = b.y - 100, v = lobV(ox, oy, tx, floorOf(b) - 8, 240, 0.14);
          proj({ x: ox, y: oy, vx: v.vx, vy: v.vy, grav: 0.14, shape: 'duck', r: 10, life: 4, onEnd: fDuckLand });
          sfx('squeak', { x: b.x });
        });
      } },
    { id: 'drain', p2: true, w: 1.5, tele: 1.0, dur: 2.4, rec: 0.8,
      begin(b) { shout(b, 'PULL THE PLUG!'); },
      start(b, p) {
        const A = arenaOf(b);
        spacedXs(b, p, 3).forEach((x, i) => setTimeoutSafe(b, i * 0.35, () => zone({ x, y: A.y1, w: 60, h: 130, tele: 1.0, life: 0.55, dmg: 1, style: 'geyser', onStart: () => { sfx('splash', { x }); if (S.FX) S.FX.shake(0.4); } })));
      } },
  ];

  // ---- MUD
  function fMud(s, why) {
    if (S.FX) { S.FX.debris(s.x, s.y, 5, '#7d5a38'); S.FX.dust(s.x, s.y, 3); }
    word('SPLORCH', s.x, s.y - 12, { size: 14, color: '#c9a070' });
    if (why === 'land') zone({ x: s.x, y: groundY(s), w: 56, h: 10, tele: 0, life: 2.5, dmg: 0, slow: 0.8, style: 'puddle' }); // mild slow, no damage
  }
  PAT.mud = [
    { id: 'slam', w: 1.3, tele: 1.0, dur: 1.2, rec: 0.7, lock: true,
      begin(b) {
        shout(b, 'MUD SLAM!'); const A = arenaOf(b), fx = b.x + b.face * 80; b.ps.fx = fx;
        marker(fx, A.y1, 1.0, { w: 86, h: 14, warn: 'circle', color: '#a07c52', thr: (rem, out) => shockThr(out, fx, A.y1, rem, { w: 46, h: 34, speed: 215 }) });
      },
      teleTick(b, dt, k) { b.fist = k; },
      start(b) {
        b.fist = -0.4; const A = arenaOf(b), fx = b.ps.fx;
        word('SPLOOOORCH!', fx, b.y - 40, { size: 32, color: '#c9a070', stroke: '#141018', burst: true, burstColor: '#7d5a38', life: 0.9 });
        if (S.FX) { S.FX.shake(0.6); S.FX.hitstop(0.05); S.FX.debris(fx, b.y - 10, 14, '#7d5a38'); }
        sfx('thoom', { x: b.x });
        shockPair(fx, A.y1, { style: 'wave', color: '#7d5a38', color2: '#a07c52', speed: 215, h: 34, w: 46 });
      },
      end(b) { b.fist = 0; } },
    P.lob({ id: 'spit', count: (b) => (b.enraged ? 4 : 3), maxCount: 4, gap: 0.5, speed: 300, shape: 'mud', r: 9, spin: 6, word: 'SPLORCH!',
      muzzle: (b) => ({ x: b.x + b.face * 28, y: b.y - 152 }), onEnd: fMud }),
    { id: 'sinkhop', w: 1.2, tele: 0.9, dur: 2.2, rec: 0.9,
      begin(b, p) {
        shout(b, 'GLUB GLUB...'); const A = arenaOf(b);
        const tx = b.ps.tx = U.clamp(p ? p.x : b.x - 250, A.x0 + 70, A.x1 - 70);
        marker(tx, A.y1, 0.9 + 1.3, { w: 84, h: 14, warn: 'circle', color: '#7d5a38', sign: true, thr: (rem, out) => out.push(thRect(tx - 40, A.y1 - 130, tx + 40, A.y1, 0, rem, rem + 0.4)) });
      },
      teleTick(b, dt, k) { b.sink = k; b.invuln = k > 0.6; },
      start(b) { b.sink = 1; b.invuln = true; b.ps.up = false; },
      tick(b, dt, k, t) {
        if (t < 1.3) { b.sink = 1; if (S.FX && Math.random() < 0.4) S.FX.dust(b.ps.tx + U.rand(-30, 30), floorOf(b), 1); return; }
        if (!b.ps.up) {
          b.ps.up = true; b.x = b.ps.tx; b.invuln = false;
          zone({ x: b.x, y: floorOf(b), w: 80, h: 130, tele: 0, pre: true, life: 0.4, dmg: 1, style: 'geyser', color: '#7d5a38', color2: '#a07c52' });
          word('BLORRRP!', b.x, b.y - 80, { size: 28, color: '#c9a070', stroke: '#141018', burst: true, burstColor: '#7d5a38', life: 0.8 });
          if (S.FX) { S.FX.shake(0.4); S.FX.debris(b.x, b.y - 20, 8, '#7d5a38'); }
        }
        b.sink = Math.max(0, 1 - (t - 1.3) * 2.8);
      },
      end(b) { b.sink = 0; b.invuln = false; } },
    P.summon({ id: 'mudmen', p2: true, w: 1.2, ids: ['mudman', 'grunt'], n: 2, max: 3, word: 'MUD MEN, ASSEMBLE!', whistle: false }),
  ];

  // ---- JUNGLE
  PAT.jungle = [
    { id: 'pound', w: 1.3, tele: 1.2, dur: 2.4, rec: 0.8, lock: true,
      begin(b) {
        shout(b, 'CHEST DRUM!'); const A = arenaOf(b), x = b.ps.x = b.x;
        marker(x, A.y1, 1.2, { w: 86, h: 14, warn: 'circle', color: '#ff8c1a', thr: (rem, out) => shockThr(out, x, A.y1, rem, SHOCK) });
        marker(x, A.y1, 2.3, { w: 86, h: 14, warn: 'circle', color: '#ff8c1a', sign: false, thr: (rem, out) => shockThr(out, x, A.y1, rem, SHOCK) });
      },
      teleTick(b, dt, k) { b.pound = Math.sin(k * 36) > 0 ? 1 : 0; if (Math.floor(k * 36 / Math.PI) !== b.ps.lastBeat) { b.ps.lastBeat = Math.floor(k * 36 / Math.PI); if (b.pound) { sfx('thoom', { x: b.x, vol: 0.35 }); word('BOM', b.x + U.rand(-20, 20), b.y - 150, { size: 16, color: '#ffffff', life: 0.35 }); } } },
      start(b) {
        const A = arenaOf(b), x = b.ps.x; b.pound = 0;
        const slam = () => { shockPair(x, A.y1, Object.assign({ style: 'wave', color: '#ffe14d', color2: '#ff8c1a' }, SHOCK)); if (S.FX) { S.FX.shake(0.5); S.FX.dust(x - 40, A.y1, 5); S.FX.dust(x + 40, A.y1, 5); } sfx('thoom', { x }); word('BOOOM!', x, b.y - 60, { size: 30, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.7 }); };
        slam(); setTimeoutSafe(b, 1.1, slam);
      } },
    P.leap({ id: 'leap', word: 'OOK SMASH!', slamWord: 'SMASH!', shock: { style: 'wave', color: '#ffe14d', color2: '#ff8c1a', speed: 225, h: 34, w: 46 } }),
    P.rain({ id: 'coconuts', n: (b) => (b.enraged ? 5 : 4), shape: 'coconut', r: 11, spin: 6, word: 'COCONUT RAIN!', onEnd: coconutSplat }),
    P.lob({ id: 'toss', count: 3, gap: 0.5, speed: 300, shape: 'coconut', r: 11, spin: 8, word: 'COCONUT TOSS!',
      muzzle: (b) => ({ x: b.x + b.face * 50, y: b.y - 150 }), onEnd: coconutSplat }),
    { id: 'rampage', p2: true, w: 1.4, tele: 1.2, dur: 5.0, rec: 1.2, lock: true,
      begin(b, p) { // three slow, jumpable stomps >= 1.5 s apart, walking toward where the player stood; every stomp site is hatched from the start
        shout(b, 'OOK OOK OOK!'); const A = arenaOf(b), bd = arenaBounds(b), dir = p ? sgn(p.x - b.x) : -1;
        b.face = dir; b.ps.xs = [0, 1, 2].map((k) => U.clamp(b.x + dir * 120 * k, bd.l, bd.r)); b.ps.k = 0;
        b.ps.xs.forEach((x, k) => marker(x, A.y1, 1.2 + 0.35 + k * 1.5, { w: 86, h: 14, warn: 'circle', color: '#ff8c1a', sign: k === 0, thr: (rem, out) => shockThr(out, x, A.y1, rem, SHOCK) }));
      },
      teleTick(b, dt, k) { b.pound = Math.sin(k * 30) > 0 ? 1 : 0; },
      tick(b, dt, k, t) {
        const A = arenaOf(b), xs = b.ps.xs, kk = b.ps.k;
        if (kk < 3) {
          const ts = 0.35 + kk * 1.5;
          if (t >= ts) {
            b.x = xs[kk]; b.vx = 0; b.ps.k++; b.pound = 1;
            shockPair(b.x, A.y1, Object.assign({ style: 'wave', color: '#ffe14d', color2: '#ff8c1a' }, SHOCK));
            if (S.FX) { S.FX.shake(0.5); S.FX.dust(b.x - 40, A.y1, 5); S.FX.dust(b.x + 40, A.y1, 5); }
            sfx('thoom', { x: b.x }); word('STOMP!', b.x, b.y - 60, { size: 28, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.6 });
          } else if (kk > 0 && t > 0.35 + (kk - 1) * 1.5 + 0.4) { b.pound = 0; b.vx = (xs[kk] - b.x) / Math.max(0.1, ts - t); } // stride to the next site (<= 160 px/s)
        } else if (t > 0.35 + 2 * 1.5 + 0.6) { b.ps.done = true; b.ps.dizzy = true; b.ps.rec = 1.2; }
      },
      end(b) { b.vx = 0; b.pound = 0; } },
  ];

  // ---- MOUNTAIN
  function fRock(s, why) {
    if (S.FX) { S.FX.debris(s.x, s.y, 8, '#a49bb0'); S.FX.dust(s.x, s.y, 4); }
    sfx('tile_break', { x: s.x });
    if (why === 'land') zone({ x: s.x, y: groundY(s), w: 30, h: 30, tele: 0, pre: true, life: 0.3, dmg: 1, style: 'quake' });
  }
  const ROCKCOL = { shape: 'rock', r: 12, spin: 5, onEnd: fRock, burst: { w: 30, h: 30, life: 0.3 } };
  function fBomb(s) {
    sfx('explode', { x: s.x, vol: 0.6 });
    word(pick(['BAA-BOOM!', 'KA-BAAM!']), s.x, s.y - 26, { size: 22, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.7 });
    if (S.FX) { S.FX.explosion(s.x, s.y, 34); S.FX.shake(0.25); }
    zone({ x: s.x, y: groundY(s), w: 84, h: 48, tele: 0, pre: true, life: 0.22, dmg: 1, style: 'burst' });
  }
  PAT.mountain = [
    { id: 'dive', w: 1.4, tele: 1.3, dur: 3.2, rec: 1.0, lock: true,
      begin(b, p) {
        shout(b, 'DIVE BOMB!'); const A = arenaOf(b), bd = arenaBounds(b);
        const tx = b.ps.tx = U.clamp(p ? p.x : b.x - 200, bd.l, bd.r); b.ty = A.y0 + 90;
        // the boss hovers over the marker, then drops straight down it: the hatched circle is the whole danger column
        marker(tx, A.y1, 1.3 + 0.55, { w: 80, h: 14, warn: 'circle', thr: (rem, out) => {
          out.push(thRect(tx - 36, A.y0 + 90 - 70, tx + 38, A.y0 + 90, 0, rem, rem + 0.6, { vy: 560, body: true }));
          shockThr(out, tx, A.y1, rem + (A.y1 - (A.y0 + 90)) / 560, { w: 44, h: 34, speed: 225 });
        } });
      },
      teleTick(b, dt, k) { b.y += (b.ty - b.y) * Math.min(1, dt * 6); b.x = U.approach(b.x, b.ps.tx, 650 * dt); b.face = sgn(b.ps.tx - b.x) || b.face; },
      start(b) { b.x = b.ps.tx; b.vx = 0; b.ps.vy = 560; b.diving = true; sfx('rocket_launch', { x: b.x }); word('BAAAAAAA!', b.x, b.y - 60, { size: 24, color: '#ffffff', stroke: '#141018', life: 0.7 }); },
      tick(b, dt) {
        b.vx = 0; b.y += b.ps.vy * dt;
        if (b.y >= floorOf(b)) {
          b.y = floorOf(b); b.diving = false; b.ps.done = true; b.ps.dizzy = true; b.ps.rec = 1.4;
          const A = arenaOf(b);
          word('KA-BAAAM!', b.x, b.y - 40, { size: 34, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.9 });
          if (S.FX) { S.FX.shake(0.6); S.FX.hitstop(0.05); S.FX.debris(b.x, b.y - 10, 10, '#a49bb0'); }
          sfx('explode', { x: b.x });
          shockPair(b.x, A.y1, { style: 'wave', color: '#c9bfb2', color2: '#ffffff', speed: 225, h: 34, w: 44 });
        }
      },
      end(b) { b.diving = false; b.vx = 0; } },
    P.rain(Object.assign({ id: 'rocks', n: (b) => (b.enraged ? 5 : 4), word: 'ROCKSLIDE!' }, ROCKCOL)),
    P.fan({ id: 'baablast', count: 5, step: 0.4, volleys: 2, gap: 1.0, speed: 320, shape: 'ball', color: '#ffe14d', color2: '#ffffff', r: 7, shout: ['BAAA!', 'BLEAT!'], sfx: 'baa', word: 'BAAA-BLAST!',
      muzzle: (b) => ({ x: b.x + b.face * 40, y: b.y - 96 }) }),
    { id: 'bombs', w: 1.2, tele: 1.0, dur: 7.0, rec: 0.9, lock: true,
      begin(b) { shout(b, 'BOMBS AWAY!'); const A = arenaOf(b); b.ps.dir = b.x > (A.x0 + A.x1) / 2 ? -1 : 1; b.face = b.ps.dir; b.ty = A.y0 + 80; },
      teleTick(b, dt) { b.y += (b.ty - b.y) * Math.min(1, dt * 5); },
      start(b) { b.ps.nt = 0; b.ps.n = 0; },
      tick(b, dt) {
        const sp = b.enraged ? 215 : 190, N = b.enraged ? 5 : 4, iv = b.enraged ? 0.75 : 0.9, A = arenaOf(b), bd = arenaBounds(b);
        b.y += (b.ty - b.y) * Math.min(1, dt * 5); b.vx = b.ps.dir * sp;
        b.ps.nt -= dt;
        if (b.ps.n < N && b.ps.nt <= 0) { // hatched drop circle appears 0.85 s BEFORE the boss gets there; the bomb falls when it arrives
          b.ps.nt = iv; b.ps.n++;
          const ux = b.x + b.ps.dir * sp * 0.85, mx = U.clamp(ux, bd.l + 40, bd.r - 40), by = b.ty - 10;
          if (Math.abs(ux - mx) > 1) { b.ps.n = N; return; } // ran out of arena: never stack drops at the wall (keeps the 87 px gaps)
          marker(mx, A.y1, 0.85, { w: 84, h: 14, warn: 'circle', thr: (rem, out) => out.push(thBall(mx, by, 0, 20, 1, 9, rem, 4, { burst: { w: 84, h: 48, life: 0.22 } })),
            onEnd: () => { proj({ x: mx, y: by, vx: 0, vy: 20, grav: 1, shape: 'bomb', r: 9, life: 4, onEnd: fBomb, falling: true, close: true, burst: { w: 84, h: 48, life: 0.22 } }); sfx('grenade_throw', { x: mx, vol: 0.4 }); } });
        }
        if (b.ps.n >= N && b.ps.nt <= -1.0) b.ps.done = true;
      },
      end(b) { b.vx = 0; } },
    P.summon({ id: 'goatsquad', p2: true, w: 1.2, ids: ['goat', 'dog'], n: 2, max: 3, word: 'GOAT SQUAD!', whistle: false }),
  ];

  // ---- PLAINS
  PAT.plains = [
    P.charge({ id: 'harvest', w: 1.3, word: 'HARVEST TIME!', speed: 380, speedP2: 440, tele: 1.1, dizzy: 1.8, crashWord: 'KA-THRESH!', debris: '#e8c040', ram: RAM.plains,
      onCrash(b) { if (S.FX) S.FX.confetti(b.x + b.charge.dir * 100, b.y - 40, 10); } }),
    P.lob({ id: 'corncannon', count: (b) => (b.enraged ? 4 : 3), maxCount: 4, gap: 0.55, speed: 300, shape: 'corn', r: 9, spin: 7, word: 'CORN CANNON!',
      muzzle: (b) => ({ x: b.x + b.face * 24, y: b.y - 158 }), onEnd(s) { word('POP POP', s.x, s.y - 14, { size: 14, color: '#fff6b0' }); if (S.FX) S.FX.confetti(s.x, s.y, 5); } }),
    { id: 'crows', w: 1.1, tele: 0.9, dur: 4.4, rec: 0.8,
      begin(b) { shout(b, 'CAW CAW CAW!'); },
      start(b) {
        const A = arenaOf(b), hs = b.enraged ? [22, 90, 22, 90, 22] : [22, 90, 22], dir = b.face, x0 = b.x + dir * 60;
        hs.forEach((h, i) => setTimeoutSafe(b, i * 0.9, () => { const y0 = A.y1 - h; proj({ x: x0, y: y0, vx: dir * 235, vy: 0, shape: 'crow', r: 11, life: 5, noTerrain: true, sine: { y0, a: 12, f: 6, ph: i } }); sfx('squeak', { x: b.x, vol: 0.3 }); }));
      } },
    P.fan({ id: 'kernels', count: 5, step: 0.4, volleys: 2, gap: 1.0, speed: 290, shape: 'ball', color: '#ffd23f', color2: '#ffffff', r: 6, shout: ['POP POP!'], sfx: 'pistol', word: 'KERNEL BLAST!', muzzle: (b) => ({ x: b.x + b.face * 30, y: b.y - 150 }) }),
    { id: 'bales', p2: true, w: 1.3, tele: 1.0, dur: 3.4, rec: 0.7,
      begin(b) { shout(b, 'HAY BALES!'); },
      start(b) { const A = arenaOf(b), dir = b.face, x0 = b.x + dir * 120; for (let i = 0; i < 2; i++) setTimeoutSafe(b, i * 1.4, () => zone({ x: x0, y: A.y1, w: 40, h: 40, vx: dir * 200, tele: 0.7, life: 6, dmg: 1, style: 'bale', color: '#e8c040', color2: '#a8761a', onTick: clipZone })); } },
  ];

  // ---- FANTASY
  PAT.fantasy = [
    P.fan({ id: 'bolts', count: 3, step: 0.5, volleys: 2, gap: 1.2, speed: 125, shape: 'ball', color: '#c77dff', color2: '#ffffff', r: 8, word: 'ZAPPITY ZAP!', homing: 1.1, homeT: 1.3, life: 3.4, sfx: 'zap', minDist: 220,
      muzzle: (b) => ({ x: b.x + b.face * 40, y: b.y - 150 }), fx: (b) => { b.staffFlash = 1; } }),
    { id: 'beard', w: 1.3, tele: 1.05, dur: 1.2, rec: 0.9, lock: true,
      begin(b) {
        shout(b, 'BEARD WHIP!'); const A = arenaOf(b), len = 520, dir = b.face;
        zone({ x: b.x + dir * (len / 2 + 14), y: A.y1, w: len, h: 24, tele: 1.05, life: 0.25, dmg: 1, style: 'beard', dir, onStart: () => { sfx('whoosh', { x: b.x, vol: 0.8 }); word('THWIP!', b.x + dir * 120, b.y - 30, { size: 30, color: '#ffffff', stroke: '#141018', burst: true, burstColor: '#c77dff', life: 0.7 }); } });
      },
      teleTick(b, dt, k) { b.beard = k * 0.5; },
      start(b) { b.beard = 1; },
      end(b) { b.beard = 0; } },
    P.summon({ id: 'skeletons', w: 1, ids: ['skeleton', 'apprentice', 'grunt'], n: 2, max: 3, word: 'RISE, MY MINIONS!', whistle: false }),
    P.rain({ id: 'meteors', n: (b) => (b.enraged ? 6 : 5), shape: 'star', color: '#ffe14d', r: 11, spin: 6, word: 'METEOR SHOWER!', burst: { w: 36, h: 40, life: 0.3 },
      onEnd(s, why) { sfx('explode', { x: s.x, vol: 0.4 }); if (S.FX) { S.FX.explosion(s.x, s.y, 24); S.FX.confetti(s.x, s.y, 5); } if (why === 'land') zone({ x: s.x, y: groundY(s), w: 36, h: 40, tele: 0, pre: true, life: 0.3, dmg: 1, style: 'burst', color: '#ffe14d' }); } }),
    { id: 'blink', w: 1, tele: 0.6, dur: 1.0, rec: 0.7, lock: true,
      begin(b, p) { // the destination is hatched while he fades: the ring of orbs leaves THERE, >= 300 px from where the player was
        shout(b, 'POOF!'); const A = arenaOf(b), side = p ? (p.x > (A.x0 + A.x1) / 2 ? -1 : 1) : 1;
        const dest = b.ps.dest = U.clamp((p ? p.x : b.x) + side * U.rand(300, 420), A.x0 + 70, A.x1 - 70), off = b.ps.off = U.rand(0, TAU);
        marker(dest, A.y1, 0.6, { w: 70, h: 14, warn: 'circle', color: '#c77dff', thr: (rem, out) => { for (let i = 0; i < 10; i++) { const a = off + i * TAU / 10; out.push(thBall(dest, b.y - 100, Math.cos(a) * 220, Math.sin(a) * 220, 0, 7, rem, 3)); } } });
      },
      teleTick(b, dt, k) { b.vis = 1 - k; },
      start(b) {
        poof(b.x, b.y - 80); b.x = b.ps.dest; b.vis = 0.2; poof(b.x, b.y - 80);
        const sp = b.enraged ? 240 : 220;
        for (let i = 0; i < 10; i++) { const a = b.ps.off + i * TAU / 10; proj({ x: b.x, y: b.y - 100, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, shape: 'ball', color: '#c77dff', color2: '#ffffff', r: 7, life: 3 }); }
      },
      tick(b, dt, k) { b.vis = Math.min(1, 0.2 + k * 1.2); } },
  ];

  // ---- MOON
  PAT.moon = [
    { id: 'tractor', w: 1.3, tele: 1.0, dur: 3.6, rec: 0.8, lock: true,
      begin(b) { shout(b, 'ABDUCTION BEAM!'); sfx('zap', { x: b.x, vol: 0.4 }); },
      teleTick(b, dt, k) { b.vbeam = -k; },
      start(b, p) {
        const A = arenaOf(b), n = b.enraged ? 4 : 3; b.vbeam = 0;
        spacedXs(b, p, n).forEach((x, i) => setTimeoutSafe(b, i * 0.5, () => zone({ x, y: A.y1, w: 52, h: A.y1 - (b.y - 4), tele: 0.8, life: 0.7, dmg: 1, style: 'beam', color: '#7dff6b', onStart: () => { b.x = x; b.vbeam = 1; sfx('laser', { x }); } })));
      },
      tick(b, dt, k, t) { if (t > 3.0) b.vbeam = Math.max(0, b.vbeam - dt * 3); },
      end(b) { b.vbeam = 0; } },
    { id: 'claw', w: 1.3, tele: 0.9, dur: 1.6, rec: 0.9, lock: true,
      begin(b, p) {
        shout(b, 'MECH CLAW!'); const A = arenaOf(b), tx = b.ps.tx = U.clamp(p ? p.x : b.x, A.x0 + 60, A.x1 - 60);
        marker(tx, A.y1, 0.9 + 0.4, { w: 60, h: 14, warn: 'circle', thr: (rem, out) => out.push(thRect(tx - 30, A.y1 - 46, tx + 30, A.y1, 0, rem, rem + 0.4)) }); b.claw = { x: tx, k: 0 };
      },
      teleTick(b, dt, k) { b.claw.k = k * 0.3; },
      tick(b, dt, k, t) {
        if (t < 0.4) b.claw.k = 0.3 + t / 0.4 * 0.7;
        else if (!b.ps.hit) {
          b.ps.hit = true; b.claw.k = 1; const A = arenaOf(b);
          zone({ x: b.ps.tx, y: A.y1, w: 60, h: 46, tele: 0, pre: true, life: 0.4, dmg: 1, style: 'quake', color: '#8f96d8' });
          word('KRAK-ZONK!', b.ps.tx, A.y1 - 50, { size: 26, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#8f96d8', life: 0.7 });
          if (S.FX) { S.FX.shake(0.5); S.FX.debris(b.ps.tx, A.y1 - 10, 8, '#8f96d8'); } sfx('thoom', { x: b.ps.tx });
        } else if (t > 1.0) b.claw.k = Math.max(0, 1 - (t - 1.0) / 0.4);
      },
      end(b) { b.claw = null; } },
    { id: 'plasmaring', w: 1.1, tele: 0.9, dur: 3.4, rec: 0.8, lock: true,
      begin(b, p) { // the UFO glides to a firing spot >= 280 px from the player, then fires 3 rings of 10 (gaps >= 100 px at that range)
        shout(b, 'PLASMA RING!'); const A = arenaOf(b), bd = arenaBounds(b), side = p ? (p.x > (A.x0 + A.x1) / 2 ? -1 : 1) : 1;
        b.ps.dest = U.clamp((p ? p.x : b.x) + side * U.rand(280, 420), bd.l, bd.r); b.ps.off = U.rand(0, TAU); b.ps.n = 0; b.ps.nt = 0.0;
      },
      teleTick(b, dt) { b.x += U.clamp(b.ps.dest - b.x, -520 * dt, 520 * dt); },
      start(b) { b.ps.nt = 0; b.ps.n = 0; },
      tick(b, dt) {
        b.ps.nt -= dt;
        if (b.ps.n < 3 && b.ps.nt <= 0) {
          b.ps.nt = 0.9; const off = b.ps.off + (b.ps.n % 2) * 0.31, sp = b.enraged ? 240 : 205; b.ps.n++;
          for (let i = 0; i < 10; i++) { const a = off + i * TAU / 10; proj({ x: b.x, y: b.y - 50, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, shape: 'plasma', r: 7, life: 4 }); }
          sfx('zap', { x: b.x, vol: 0.5 });
        }
        if (b.ps.n >= 3 && b.ps.nt <= -0.6) b.ps.done = true;
      },
      thr(b, out) {
        const sp = b.enraged ? 240 : 205, inTele = b.mode === 'tele', x = inTele ? b.ps.dest : b.x, n0 = b.ps.n || 0;
        const first = inTele ? Math.max(0, this.tele - b.mt) : Math.max(0, b.ps.nt);
        for (let k = n0; k < 3; k++) for (let i = 0; i < 10; i++) { const a = b.ps.off + (k % 2) * 0.31 + i * TAU / 10; out.push(thBall(x, b.y - 50, Math.cos(a) * sp, Math.sin(a) * sp, 0, 7, first + (k - n0) * 0.9, 4, { id: 'r' + k + '_' + i })); }
      } },
    P.summon({ id: 'aliens', w: 1, ids: ['alien', 'bouncer'], n: 2, max: 3, word: 'ALIENS, ATTACK!', whistle: false }),
    P.fan({ id: 'missiles', p2: true, w: 1.4, count: 3, step: 0.5, volleys: 2, gap: 1.2, speed: 125, shape: 'missile', r: 8, homing: 1.4, homeT: 1.3, life: 4.5, word: 'MECH MISSILES!', sfx: 'rocket_launch', minDist: 220,
      muzzle: (b) => ({ x: b.x + b.face * 80, y: b.y - 40 }) }),
  ];

  // ---- RETRO
  function bsodXs(A, n, w) { // n boxes of width w with >= 76 px of safe floor between each other and the walls
    const L = A.x1 - A.x0, minGap = 76, extra = L - n * w - (n + 1) * minGap; if (extra < 0) return null;
    const cuts = []; let sum = 0; for (let i = 0; i < n + 1; i++) { const c = Math.random() + 0.15; cuts.push(c); sum += c; }
    let x = A.x0; const xs = [];
    for (let i = 0; i < n; i++) { x += minGap + extra * cuts[i] / sum; xs.push(x + w / 2); x += w; }
    return xs;
  }
  PAT.retro = [
    P.rain({ id: 'pixelrain', n: (b) => (b.enraged ? 6 : 5), shape: 'pixel', color: '#ff6ae0', r: 9, spin: 3, word: 'PIXEL RAIN!', mcolor: '#6aeaff', burst: { w: 36, h: 36, life: 0.3 },
      onEnd(s, why) { if (S.FX) S.FX.debris(s.x, s.y, 6, '#ff6ae0'); sfx('pixel_blip', { x: s.x }); if (why === 'land') zone({ x: s.x, y: groundY(s), w: 36, h: 36, tele: 0, pre: true, life: 0.3, dmg: 1, style: 'blocks' }); } }),
    { id: 'rowbeams', w: 1.4, tele: 0.9, dur: 4.6, rec: 0.9, lock: true,
      begin(b) { shout(b, 'LASER ROWS!'); },
      start(b) {
        const A = arenaOf(b), seq = b.enraged ? ['lo', 'hi', 'lo', 'hi'] : ['lo', 'hi', 'lo'];
        seq.forEach((k, i) => setTimeoutSafe(b, i * 1.25, () => {
          const bot = k === 'lo' ? A.y1 : A.y1 - 52, hh = k === 'lo' ? 22 : 20;
          zone({ x: (A.x0 + A.x1) / 2, y: bot, w: A.x1 - A.x0 - 12, h: hh, tele: 0.9, life: 0.25, dmg: 1, style: 'beam', color: k === 'lo' ? '#6aeaff' : '#ff6ae0', sign: false, color2: '#ffffff', onStart: () => sfx('laser', { x: b.x, vol: 0.5 }) });
          word(k === 'lo' ? 'JUMP!' : 'STAY LOW!', A.x0 + 70, bot - 70, { size: 20, color: k === 'lo' ? '#6aeaff' : '#ff6ae0', stroke: '#141018', life: 0.9, vy: 0 });
        }));
      } },
    { id: 'glitchtp', w: 1.1, tele: 0.7, dur: 1.0, rec: 0.7, lock: true,
      begin(b, p) {
        shout(b, 'GL1TCH!'); b.glitchT = 1; const A = arenaOf(b), side = p ? (p.x > (A.x0 + A.x1) / 2 ? -1 : 1) : 1;
        const dest = b.ps.dest = U.clamp((p ? p.x : b.x) + side * U.rand(300, 420), A.x0 + 80, A.x1 - 80), off = b.ps.off = U.rand(0, TAU);
        marker(dest, A.y1, 0.7, { w: 70, h: 14, warn: 'circle', color: '#6aeaff', thr: (rem, out) => { for (let i = 0; i < 8; i++) { const a = off + i * TAU / 8; out.push(thBall(dest, A.y1 - 110, Math.cos(a) * 240, Math.sin(a) * 240, 0, 7, rem, 3)); } } });
      },
      teleTick(b, dt, k) { b.vis = 1 - k * 0.8; b.glitchT = 0.3; },
      start(b) {
        if (S.FX) S.FX.debris(b.x, b.y - 100, 8, '#6aeaff');
        b.x = b.ps.dest; b.vis = 0.6; b.glitchT = 0.6;
        for (let i = 0; i < 8; i++) { const a = b.ps.off + i * TAU / 8; proj({ x: b.x, y: b.y - 110, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, shape: 'pixel', color: i % 2 ? '#6aeaff' : '#ff6ae0', r: 7, spin: 4, life: 3 }); }
        sfx('pixel_blip', { x: b.x });
      },
      tick(b, dt, k) { b.vis = Math.min(1, 0.6 + k * 0.6); b.glitchT = 0.3; } },
    { id: 'bsod', w: 1.3, tele: 1.0, dur: 2.4, rec: 0.8, lock: true,
      begin(b) { shout(b, 'BLUE SCREEN!'); },
      start(b) {
        const A = arenaOf(b), n = b.enraged ? 4 : 3, xs = bsodXs(A, n, 110) || bsodXs(A, 3, 110);
        xs.forEach((x, i) => setTimeoutSafe(b, i * 0.2, () => zone({ x, y: A.y1, w: 110, h: 120, tele: 0.9, life: 0.7, dmg: 1, style: 'bsod', onStart: () => { sfx('alarm', { x, vol: 0.3 }); if (S.FX) S.FX.shake(0.3); } })));
      } },
    P.summon({ id: 'sprites', p2: true, w: 1.1, ids: ['pixelghost', 'bitgoon'], n: 2, max: 3, word: 'SPRITE SPAWN!', whistle: false }),
  ];

  // ---- FORTRESS
  function fMissile(s, why) {
    sfx('explode', { x: s.x, vol: 0.4 }); if (S.FX) S.FX.explosion(s.x, s.y, 26);
    if (why === 'land') zone({ x: s.x, y: groundY(s), w: 64, h: 48, tele: 0, pre: true, life: 0.2, dmg: 1, style: 'burst' });
  }
  PAT.fortress = [
    P.fan({ id: 'doosh', count: 5, step: 0.4, volleys: 2, gap: 1.0, speed: 320, shape: 'ball', color: '#ff8c1a', color2: '#fff36b', r: 6, shout: ['DOOM-DOOSH!', 'KA-DOOSH!'], sfx: 'shotgun', tele: 0.95, minDist: 240,
      muzzle: dooshTip, fx: (b) => { b.recoil = 1; if (S.FX) S.FX.shake(0.3); }, word: 'LOCK AND LOAD!' }),
    { id: 'missiles', w: 1.3, tele: 1.0, dur: 3.0, rec: 0.9, lock: true,
      begin(b) { shout(b, 'MISSILE PODS!'); },
      teleTick(b, dt, k) { b.pod = k; },
      start(b, p) {
        b.pod = 1; sfx('rocket_launch', { x: b.x, vol: 0.6 });
        columns(b, spacedXs(b, p, b.enraged ? 5 : 4), { shape: 'missile', r: 8, fallV: 200, gm: 0.6, tele: 0.8, onEnd: fMissile, burst: { w: 64, h: 48, life: 0.2 }, mw: 64, gap: 0.3 });
      } },
    P.leap({ id: 'stomp', w: 1.2, word: 'DOOM STOMP!', slamWord: 'KA-THOOOM!', shock: { style: 'wave', color: '#a49bb0', color2: '#ffffff', speed: 235, h: 34, w: 46 },
      onSlam(b) { const p = plr(); columns(b, spacedXs(b, p, 2, { aimed: false, avoidX: p ? p.x : null }), Object.assign({ tele: 0.8 }, ROCKCOL)); } }),
    P.summon({ id: 'reinforce', p2: true, w: 1.3, ids: ['shotgunner', 'grunt', 'gunner'], n: 2, max: 3, word: 'DOOSH-BOYS, MOVE OUT!' }),
    P.fan({ id: 'megadoosh', p2: true, w: 1.4, count: 5, step: 0.4, volleys: 2, gap: 1.0, speed: 400, shape: 'ball', color: '#ff3b3b', color2: '#fff36b', r: 6, shout: ['MEGA DOOM-DOOSH!!'], sfx: 'shotgun', tele: 0.85, minDist: 240,
      muzzle: dooshTip, fx: (b) => { b.recoil = 1; if (S.FX) S.FX.shake(0.4); }, word: 'MAXIMUM DOOSH!' }),
  ];


  // ============================================================================================ ICE: Frosty McChillface
  Impl.ice = {
    w: 150, h: 162, hw: 76, enterT: 1.7, introWord: 'BRRR-RING IT!', enrageWord: 'ICE-COLD FURY!', hitWords: ['BRRR!', 'MY FUR!', 'CHILL!', 'HEY!', 'NOT COOL!'],
    init(b) { b.revving = false; b.charging = false; },
    enter(b, dt, t) { b.revving = t < 1.4; },
    idle(b, dt, p) { keep(b, dt, p, 250, 430, 72); },
    boxes(b) { return [lbox(b, -42, -164, 54, -46), lbox(b, -68, -48, 86, 0)]; },
    contact(b) { return b.charging ? [Object.assign(lbox(b, RAM.ice.dx0, -RAM.ice.h, RAM.ice.dx1, 0), { dmg: 1 })] : null; }, // rule 4: only the 90x40 front ram hurts
    update(b, dt) {
      if ((b.revving || b.charging) && Math.random() < 0.5 && S.FX) S.FX.dust(b.x - b.face * 74, b.y - 28, 1);
      if (b.charging && Math.random() < 0.5 && S.FX) S.FX.add({ x: b.x - b.face * 40, y: b.y - 4, vx: -b.face * 40, vy: -20, life: 0.4, kind: 'smoke', size: 4, grow: 8, color: '#ffffff', drag: 2 });
    },
    patterns: PAT.ice,
    draw(ctx, b) {
      const t = b.anim, rage = b.enraged;
      ctx.scale(b.face, 1);
      const shake = (b.revving || b.charging) ? Math.sin(t * 70) * 1.4 : 0;
      ctx.translate(0, shake); if (b.charging) ctx.rotate(-0.05);
      // exhaust + track + wheels
      rrect(ctx, -86, -46, 24, 8, 3, '#8a86a8', 2.4);
      rrect(ctx, -66, -30, 80, 30, 15, '#2f2c44', 3);
      for (let i = 0; i < 6; i++) { const tx = -58 + (((i * 13 + b.x * 0.6) % 78) + 78) % 78; ctx.fillStyle = K('#5a5678'); ctx.fillRect(tx, -28, 3, 5); ctx.fillRect(tx, -7, 3, 5); }
      circ(ctx, -48, -15, 8, '#bfc6dc', 2.4); circ(ctx, -18, -15, 8, '#bfc6dc', 2.4); circ(ctx, 4, -15, 6, '#bfc6dc', 2.4);
      // ski
      ctx.beginPath(); ctx.moveTo(-50, 3); ctx.lineTo(58, 3); ctx.quadraticCurveTo(92, 3, 94, -17); ctx.lineTo(85, -15); ctx.quadraticCurveTo(76, -7, 58, -7); ctx.lineTo(-50, -7); ctx.closePath(); fs(ctx, '#c8d2e8', 3);
      line(ctx, 40, -8, 40, -22, 5, '#8a86a8');
      // hood
      poly(ctx, [[-50, -22], [-30, -50], [34, -50], [66, -32], [72, -14], [-50, -14]], '#ff6a3a', 3.2);
      rrect(ctx, -44, -38, 92, 7, 3, '#ffffff', 2);
      poly(ctx, [[22, -50], [40, -50], [48, -66], [32, -66]], 'rgba(190,240,255,0.85)', 2.4);
      circ(ctx, 68, -26, 6.5, '#fff36b', 2.4);
      if (b.revving) { ctx.fillStyle = 'rgba(255,243,107,' + (0.35 + 0.3 * Math.sin(t * 40)) + ')'; ctx.beginPath(); ctx.moveTo(70, -26); ctx.lineTo(150, -52); ctx.lineTo(150, 0); ctx.closePath(); ctx.fill(); }
      // yeti legs + torso
      limb(ctx, [[-14, -56], [20, -54], [40, -36]], 18, '#dcecf8'); circ(ctx, 45, -34, 9, '#8fb8d8', 2.4);
      ell(ctx, -10, -90, 39, 45, '#eaf6ff', 3.4);
      halftone(ctx, 'rgba(110,160,215,0.55)', 3, 7, () => { ctx.beginPath(); ctx.ellipse(-10, -90, 39, 45, 0, 0, TAU); });
      for (let i = 0; i < 6; i++) tuft(ctx, -46 + i * 3 + (i % 2) * 2, -112 + i * 11, Math.PI * 0.9 + (i % 2) * 0.25, 13, 6, '#eaf6ff');
      for (let i = 0; i < 4; i++) tuft(ctx, -30 + i * 14, -48, Math.PI / 2 + (i % 2 ? 0.2 : -0.2), 12, 6, '#eaf6ff');
      // arm to handlebar
      limb(ctx, [[14, -108], [48, -100], [58, -70]], 18, '#eaf6ff'); circ(ctx, 60, -66, 10.5, '#8fb8d8', 2.4);
      line(ctx, 54, -72, 68, -60, 5, '#2f2c44');
      // head
      const nod = b.stagger > 0 ? Math.sin(t * 18) * 3 : 0;
      ctx.save(); ctx.translate(18, -132 + nod);
      for (const [tx, ty, a] of [[-14, -22, -1.9], [-2, -26, -1.55], [12, -24, -1.25]]) tuft(ctx, tx, ty, a, 15, 6, '#eaf6ff');
      ell(ctx, 0, 0, 28, 26, '#eaf6ff', 3.4);
      ell(ctx, 8, 3, 18, 15, rage ? '#ffb3a8' : '#9fd0f0', 0);
      googly(ctx, 3, -5, 6, 0.6, 0.3); googly(ctx, 20, -5, 6.5, 0.6, 0.3);
      line(ctx, -6, -14, 10, -9, 4, '#2f2c44'); line(ctx, 14, -9, 30, -14, 4, '#2f2c44');
      ctx.beginPath(); ctx.moveTo(-2, 8); ctx.quadraticCurveTo(14, 26, 32, 7); ctx.quadraticCurveTo(14, 12, -2, 8); fs(ctx, '#5a2a3a', 2.6);
      poly(ctx, [[2, 10], [6, 20], [10, 12]], '#ffffff', 1.6); poly(ctx, [[20, 12], [25, 21], [28, 9]], '#ffffff', 1.6);
      if (rage) { ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-8, -24, 3, 7); ctx.fillRect(-2, -26, 3, 9); }
      ctx.restore();
      // tiny scarf (comically small)
      rrect(ctx, 6, -110, 16, 6, 3, '#e8173a', 2.2); poly(ctx, [[8, -105], [-4, -98 + Math.sin(t * 12) * 3], [0, -94 + Math.sin(t * 12) * 3], [11, -101]], '#e8173a', 1.8);
    },
  };

  // ============================================================================================ FIRE: Captain Combustion
  Impl.fire = {
    w: 78, h: 156, hw: 44, enterT: 1.5, introWord: 'THIS IS FINE!', enrageWord: 'EXTRA CRISPY!', hitWords: ['HOT!', 'OW!', 'HOSE!', 'FINE!'],
    init(b) { b.aimA = 0; b.hose = 0; },
    idle(b, dt, p) { keep(b, dt, p, 220, 360, 95); },
    boxes(b) { return [lbox(b, -34, -158, 40, 0)]; },
    update(b, dt) {
      if (S.FX && Math.random() < (b.enraged ? 0.6 : 0.3)) S.FX.fire(b.x + U.rand(-14, 14), b.y - U.rand(70, 150), 1);
      if (!b.airborne && b.impl.keepFloor !== false && b.mode !== 'act') b.y = floorOf(b);
    },
    patterns: PAT.fire,
    draw(ctx, b) {
      const t = b.anim, rage = b.enraged, mv = Math.min(1, Math.abs(b.vx) / 70), ph = t * 12, air = !!b.airborne;
      ctx.scale(b.face, 1);
      const crouch = (b.crouch || 0) * 14; ctx.translate(0, crouch);
      const sw = Math.sin(ph) * 18 * mv, fsz = rage ? 1.4 : 1;
      // pack + hose line
      rrect(ctx, -36, -112, 17, 42, 5, '#c8200e', 2.8);
      // legs
      if (air) { limb(ctx, [[0, -60], [-6, -38], [-18, -26]], 12, '#2d3a8c'); limb(ctx, [[0, -60], [14, -40], [22, -22]], 12, '#2d3a8c'); }
      else { limb(ctx, [[0, -60], [-8 + sw * 0.5, -32], [-14 + sw, -4]], 12, '#2d3a8c'); limb(ctx, [[0, -60], [8 - sw * 0.5, -32], [14 - sw, -4]], 12, '#2d3a8c'); rrect(ctx, -22 + sw, -10, 18, 10, 4, '#222034', 2.4); rrect(ctx, 8 - sw, -10, 20, 10, 4, '#222034', 2.4); }
      // torso
      poly(ctx, [[-24, -114], [18, -114], [24, -62], [-22, -58]], '#ffcf26', 3.2);
      line(ctx, -22, -92, 20, -92, 5, '#e8e8f0'); line(ctx, -22, -80, 21, -80, 5, '#e8e8f0');
      rrect(ctx, -24, -66, 48, 7, 2, '#7a4a24', 2.2);
      // back arm
      limb(ctx, [[-14, -108], [-24 + sw * 0.6, -90], [-20 - sw * 0.6, -72]], 10, '#ffcf26'); circ(ctx, -20 - sw * 0.6, -70, 5.5, '#222034', 2);
      // front arm + hose
      const a = b.aimA || 0, sx = 8, sy = -108, hx = sx + Math.cos(a) * 34, hy = sy + 8 + Math.sin(a) * 34;
      limb(ctx, [[sx, sy], [(sx + hx) / 2 + 2, (sy + hy) / 2 + 6], [hx, hy]], 10, '#ffcf26');
      ctx.beginPath(); ctx.moveTo(-26, -96); ctx.bezierCurveTo(-34, -60, 10, -50, hx - 4, hy + 6); ink(ctx, 6.5); ctx.stroke(); ctx.strokeStyle = K('#c9a050'); ctx.lineWidth = 3.4; ctx.stroke();
      ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); rrect(ctx, -2, -5, 30, 10, 3, '#8a86a8', 2.6); rrect(ctx, 26, -6, 8, 12, 2, '#ffb81c', 2.2); ctx.restore();
      if (b.hose > 0.5) { const tip = hoseTip(b); void tip; }
      // head
      ell(ctx, 3, -132, 17, 18, '#ffc9a0', 3);
      ctx.fillStyle = K('rgba(40,30,40,0.35)'); if (!FL) { ctx.beginPath(); ctx.ellipse(-4, -126, 5, 3, 0.3, 0, TAU); ctx.ellipse(12, -122, 4, 3, 0, 0, TAU); ctx.fill(); }
      googly(ctx, 3, -134, 6, 0.5, 0.2); googly(ctx, 16, -134, 6, 0.5, 0.2);
      ctx.beginPath(); ctx.arc(10, -120, 7, 0.1, Math.PI - 0.1); fs(ctx, '#ffffff', 2.4); // big nervous grin
      ctx.fillStyle = K('#7fd4ff'); if (!FL) { ctx.beginPath(); ctx.arc(-12, -138 + (t * 30 % 14), 2.2, 0, TAU); ctx.fill(); }
      // helmet
      ctx.beginPath(); ctx.arc(3, -138, 20, Math.PI, 0); ctx.closePath(); fs(ctx, '#e0281e', 3);
      rrect(ctx, -22, -140, 52, 7, 3, '#e0281e', 2.8);
      poly(ctx, [[-4, -152], [10, -152], [10, -140], [3, -134], [-4, -140]], '#ffcf26', 2);
      // flames (he is ON FIRE)
      flame(ctx, 3, -154, 11 * fsz, t, '#ff5a1a', '#ffb81c', '#fff6b0');
      flame(ctx, -16, -146, 8 * fsz, t + 1, '#ff5a1a', '#ffb81c', '#fff6b0');
      flame(ctx, -22, -112, 8 * fsz, t + 2, '#ff5a1a', '#ffb81c', '#fff6b0');
      flame(ctx, 24, -108, 7 * fsz, t + 3, '#ff5a1a', '#ffb81c', '#fff6b0');
      flame(ctx, -26, -84, 8 * fsz, t + 4, '#ff5a1a', '#ffb81c', '#fff6b0');
    },
  };
  function hoseTip(b) { const a = b.aimA || 0; return { x: b.x + b.face * (8 + Math.cos(a) * 34 + Math.cos(a) * 34), y: b.y - 100 + Math.sin(a) * 68 }; }

  // ============================================================================================ WIND: Gustav Blowhard
  Impl.wind = {
    w: 170, h: 176, hw: 84, enterT: 1.6, introWord: 'HOOOOO!', enrageWord: 'MAX LEAF BLOWER!', hitWords: ['PFFF!', 'WHEW!', 'HEY!', 'MY GUST!'],
    init(b) { b.lung = 0; b.hoverY = floorOf(b) - 34; b.y = b.hoverY - 120; b.wob = 0; },
    enter(b, dt, t) { b.y = U.lerp(b.y, b.hoverY, Math.min(1, dt * 3)); },
    idle(b, dt, p) { keep(b, dt, p, 250, 470, 90); },
    boxes(b) { return [lbox(b, -66, -176, 62, 34)]; },
    update(b, dt) {
      b.lung = Math.max(0, b.lung - dt * 0.6);
      if (!b.airborne) b.y += ((b.hoverY + Math.sin(b.t * 2) * 7) - b.y) * Math.min(1, dt * 5);
      b.cloudShake = b.charging ? 1 : 0;
    },
    patterns: PAT.wind,
    draw(ctx, b) {
      const t = b.anim, lung = b.lung, rage = b.enraged, f = b.face;
      ctx.scale(f, 1);
      const infl = 1 + lung * 0.38;
      // dangling legs (below the cloud)
      limb(ctx, [[-16, -4], [-18, 14], [-14 + Math.sin(t * 3) * 3, 30]], 9, '#3b3a58'); limb(ctx, [[14, -4], [16, 14], [12 - Math.sin(t * 3) * 3, 30]], 9, '#3b3a58');
      rrect(ctx, -26 + Math.sin(t * 3) * 3, 26, 20, 8, 4, '#c8200e', 2.2); rrect(ctx, 2 - Math.sin(t * 3) * 3, 26, 20, 8, 4, '#c8200e', 2.2);
      // torso (huge lungs)
      ctx.save(); ctx.translate(0, -66); ctx.scale(infl, infl);
      ell(ctx, 0, 0, 46, 48, '#4fc3d8', 3.4);
      halftone(ctx, 'rgba(20,90,140,0.5)', 3, 7, () => { ctx.beginPath(); ctx.ellipse(0, 0, 46, 48, 0, 0, TAU); });
      ell(ctx, 4, -6, 26, 26, '#ffffff', 0); ctx.restore();
      ctx.save(); ctx.translate(0, -66); ctx.scale(infl, infl); ctx.fillStyle = K('rgba(255,255,255,0.35)'); if (!FL) { ctx.beginPath(); ctx.ellipse(-14, -18, 10, 16, 0.4, 0, TAU); ctx.fill(); } ctx.restore();
      // arm + leaf blower
      limb(ctx, [[18, -100], [46, -86], [66, -92]], 13, '#4fc3d8'); circ(ctx, 68, -92, 7, '#ffd1a8', 2.2);
      ctx.save(); ctx.translate(66, -94); ctx.rotate(-0.08);
      rrect(ctx, -6, -9, 44, 18, 6, '#3fae3a', 2.8); rrect(ctx, 34, -7, 34, 14, 4, '#8a86a8', 2.6); rrect(ctx, 64, -9, 8, 18, 2, '#4a4666', 2.4);
      rrect(ctx, -10, -22, 14, 30, 4, '#e8173a', 2.4);
      if (lung < 0.2 && b.mode === 'act' && b.pat && b.pat.id !== 'thunder') { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; for (let i = 0; i < 3; i++) { const o = ((t * 5 + i / 3) % 1) * 50; ctx.beginPath(); ctx.moveTo(74 + o, -8 + i * 8); ctx.lineTo(96 + o, -8 + i * 8); ctx.stroke(); } }
      ctx.restore();
      // head
      const hy = -130 - lung * 8;
      ell(ctx, 6, hy, 18, 17, '#ffd1a8', 3);
      googly(ctx, 2, hy - 3, 5.2, 0.7, 0.1); googly(ctx, 15, hy - 3, 5.2, 0.7, 0.1);
      circ(ctx, 14 + lung * 4, hy + 8, 6 + lung * 9, '#ffb48a', 2.4); circ(ctx, -4 - lung * 2, hy + 8, 6 + lung * 7, '#ffb48a', 2.4);
      ell(ctx, 8, hy + 8, 3 + lung * 2, 2.6 + lung * 3, '#7a2a2a', 1.6);
      line(ctx, -2, hy - 11, 8, hy - 8, 3.4, '#6a4a2a'); line(ctx, 12, hy - 8, 22, hy - 11, 3.4, '#6a4a2a');
      // propeller beanie
      ctx.beginPath(); ctx.arc(6, hy - 8, 15, Math.PI, 0); ctx.closePath(); fs(ctx, rage ? '#ff3b3b' : '#ffcf26', 2.8);
      line(ctx, 6, hy - 22, 6, hy - 28, 3, '#4a4666');
      ctx.save(); ctx.translate(6, hy - 30); ctx.scale(Math.cos(t * 30), 1); ell(ctx, 0, 0, 16, 3.4, '#e8173a', 2.2); ctx.restore();
      // cloud base
      const dk = b.stormy ? '#8a96b8' : '#f4fbff', mid = b.stormy ? '#6c789c' : '#dcecf8';
      for (const [cx, cy, r] of [[-64, -6, 24], [-34, 2, 28], [2, 6, 30], [36, 2, 28], [66, -6, 24], [-8, -16, 24], [40, -14, 22], [-44, -14, 20]]) circ(ctx, cx + Math.sin(t * 2 + cx) * (b.cloudShake ? 2 : 1), cy, r, dk, 3);
      ell(ctx, 0, 14, 60, 8, mid, 0);
      if (b.stormy && Math.floor(t * 12) % 4 === 0) { ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-20, 10); ctx.lineTo(-10, 24); ctx.lineTo(-18, 24); ctx.lineTo(-6, 38); ctx.stroke(); }
    },
  };

  // ============================================================================================ WATER: Admiral Soggybottom
  Impl.water = {
    w: 156, h: 138, hw: 78, enterT: 1.5, introWord: 'ARRR! BATH TIME!', enrageWord: 'TUB OF RAGE!', hitWords: ['ARRR!', 'BLUB!', 'SHIVER!', 'HEY!'],
    init(b) { b.tilt = 0; b.recoil = 0; },
    idle(b, dt, p) { keep(b, dt, p, 270, 440, 78); },
    boxes(b) { return [lbox(b, -76, -140, 78, 0)]; },
    update(b, dt) { b.recoil = Math.max(0, b.recoil - dt * 4); b.tilt += (((b.mode === 'tele' && b.pat && b.pat.id === 'tidal') ? 1 : 0) - b.tilt) * Math.min(1, dt * 8); if (!b.airborne) b.y = floorOf(b); },
    patterns: PAT.water,
    draw(ctx, b) {
      const t = b.anim, f = b.face, mv = Math.min(1, Math.abs(b.vx) / 60);
      ctx.scale(f, 1);
      ctx.translate(0, -Math.abs(Math.sin(t * 7)) * 3 * mv);
      ctx.rotate(b.tilt * 0.12);
      // claw feet
      for (const fx of [-56, -22, 22, 56]) { const lift = Math.max(0, Math.sin(t * 7 + fx * 0.1)) * 5 * mv; ell(ctx, fx, -5 - lift, 11, 6, '#ffcf26', 2.6); }
      // tub
      ctx.beginPath(); ctx.moveTo(-74, -66); ctx.lineTo(74, -66); ctx.quadraticCurveTo(78, -20, 52, -10); ctx.lineTo(-52, -10); ctx.quadraticCurveTo(-78, -20, -74, -66); ctx.closePath(); fs(ctx, '#f4f0e6', 3.4);
      halftone(ctx, 'rgba(120,150,200,0.45)', 3, 7, () => { ctx.beginPath(); ctx.moveTo(-74, -50); ctx.lineTo(74, -50); ctx.lineTo(60, -10); ctx.lineTo(-60, -10); ctx.closePath(); });
      rrect(ctx, -80, -76, 160, 14, 7, '#ffcf26', 3);
      for (const [px, py, r] of [[-50, -82, 9], [-30, -90, 11], [-8, -84, 8], [12, -92, 10], [36, -84, 9], [54, -90, 8]]) circ(ctx, px, py + Math.sin(t * 3 + px) * 2, r, 'rgba(255,255,255,0.92)', 2.2);
      line(ctx, -66, -76, -66, -104, 7, '#ffcf26'); rrect(ctx, -72, -112, 14, 8, 3, '#e8173a', 2.2);
      // pirate
      rrect(ctx, -22, -112, 44, 36, 12, '#ffffff', 3); for (let i = 0; i < 4; i++) line(ctx, -20 + i * 11, -106, -20 + i * 11, -80, 5, '#e8173a');
      limb(ctx, [[18, -102], [44, -112], [52, -134]], 9, '#ffffff'); poly(ctx, [[50, -132], [60, -142], [66, -132], [60, -124]], '#d8d4e8', 2.4); line(ctx, 60, -124, 60, -116, 3.6, '#d8d4e8');
      limb(ctx, [[-18, -102], [-40, -96], [-38, -76]], 9, '#ffffff'); circ(ctx, -38, -74, 6, '#ffd1a8', 2);
      ell(ctx, 4, -126, 18, 17, '#ffd1a8', 3);
      googly(ctx, 12, -129, 5.2, 0.7, 0.2); ell(ctx, -3, -129, 6.5, 6, '#141018', 0); ink(ctx, 2); line(ctx, -9, -134, 20, -118, 1.4, '#141018');
      ctx.beginPath(); ctx.moveTo(-12, -118); ctx.quadraticCurveTo(0, -92, 18, -112); ctx.quadraticCurveTo(26, -116, 20, -118); ctx.quadraticCurveTo(4, -112, -12, -118); fs(ctx, '#2a2438', 2.6);
      ctx.beginPath(); ctx.arc(20, -119, 8, 0.2, Math.PI - 0.2); fs(ctx, '#ffffff', 2); ctx.beginPath(); ctx.moveTo(-6, -113); ctx.lineTo(18, -114); ink(ctx, 2); ctx.stroke();
      poly(ctx, [[-22, -138], [4, -150], [30, -138], [24, -132], [-18, -132]], '#2a2438', 3);
      rrect(ctx, -20, -136, 42, 5, 2, '#ffcf26', 1.6);
      circ(ctx, 4, -147, 7, '#ffe14d', 2.2); poly(ctx, [[8, -149], [16, -146], [8, -144]], '#ff8c1a', 1.6);
      // cannon
      const rc = b.recoil * 10;
      ctx.save(); ctx.translate(66 - rc, -50); rrect(ctx, 0, -9, 34, 18, 6, '#c9a050', 3); rrect(ctx, 30, -11, 8, 22, 3, '#a8822a', 2.6); circ(ctx, 6, 10, 10, '#6a4a22', 2.6); circ(ctx, 6, 10, 4, '#c9a050', 1.6); ctx.restore();
      if (b.recoil > 0.5) { ctx.save(); ctx.translate(108, -50); if (S.Comic) S.Comic.burst(ctx, 0, 0, 8, 18, 8, 3); ctx.fillStyle = '#fff36b'; ctx.fill(); ink(ctx, 2); ctx.stroke(); ctx.restore(); }
    },
  };

  // ============================================================================================ MUD: Sir Sludgington
  Impl.mud = {
    w: 130, h: 198, hw: 66, enterT: 1.6, introWord: 'SQUELCH!', enrageWord: 'FILTHY RAGE!', hitWords: ['SQUELCH!', 'RUDE!', 'I SAY!', 'BLORP!'],
    init(b) { b.sink = 0; b.fist = 0; },
    idle(b, dt, p) { keep(b, dt, p, 230, 380, 58); },
    boxes(b) { return b.sink > 0.5 ? [] : [lbox(b, -64, -198, 64, 0)]; },
    update(b) { b.y = floorOf(b); },
    patterns: PAT.mud,
    draw(ctx, b) {
      const t = b.anim, sink = b.sink;
      ctx.save(); ctx.beginPath(); ctx.rect(-300, -500, 600, 500); ctx.clip();
      ctx.scale(b.face, 1); ctx.translate(0, sink * 200);
      const wob = Math.sin(t * 3) * 2;
      // body
      ctx.beginPath(); ctx.moveTo(-66, 0); ctx.bezierCurveTo(-76, -58, -50, -104, -26, -120); ctx.lineTo(26, -120); ctx.bezierCurveTo(52, -104, 76, -58, 66, 0); ctx.closePath(); fs(ctx, '#7d5a38', 3.4);
      halftone(ctx, 'rgba(60,38,18,0.55)', 3, 7, () => { ctx.beginPath(); ctx.moveTo(-66, 0); ctx.bezierCurveTo(-76, -58, -50, -104, -26, -120); ctx.lineTo(0, -120); ctx.lineTo(0, 0); ctx.closePath(); });
      for (const [dx, dy, r] of [[-52, -6, 10], [-20, -2, 8], [16, -4, 11], [50, -8, 9]]) circ(ctx, dx, dy + Math.sin(t * 4 + dx) * 1.5, r, '#7d5a38', 3);
      for (const [dx, dy, r] of [[-30, -60, 7], [20, -80, 5], [38, -40, 6]]) { circ(ctx, dx, dy, r + Math.sin(t * 5 + dx) * 1.2, '#a07c52', 1.8); }
      // back arm
      limb(ctx, [[-40, -112], [-70, -86 + wob], [-62, -44]], 20, '#7d5a38'); circ(ctx, -62, -38, 15, '#7d5a38', 3);
      // front arm (slam)
      const fk = b.fist, ay = -100 - fk * 70, hx = 60 + (fk < 0 ? 30 : 0), hy = fk < 0 ? -8 : -56 - fk * 120;
      limb(ctx, [[34, -112], [66, ay + 10], [hx, hy]], 22, '#7d5a38'); circ(ctx, hx, hy, 18, '#8f6a42', 3);
      // head
      ell(ctx, 4, -142, 23, 21, '#8f6a42', 3.2);
      googly(ctx, -4, -146, 6.4, 0.6, 0.3); googly(ctx, 15, -146, 6.4, 0.6, 0.3);
      circ(ctx, 15, -146, 9.4, 'rgba(255,255,255,0.2)', 0); ctx.beginPath(); ctx.arc(15, -146, 9.4, 0, TAU); ctx.strokeStyle = K('#ffcf26'); ctx.lineWidth = 2.4; ctx.stroke(); ctx.beginPath(); ctx.moveTo(15, -137); ctx.quadraticCurveTo(12, -120, 22, -112); ctx.stroke();
      line(ctx, -10, -156, 4, -151, 3.6, '#3e2a14'); line(ctx, 10, -151, 24, -156, 3.6, '#3e2a14');
      ell(ctx, -2, -131, 8, 4.4, '#3e2a14', 2); ell(ctx, 16, -131, 8, 4.4, '#3e2a14', 2); // moustache
      ctx.beginPath(); ctx.moveTo(-2, -124); ctx.quadraticCurveTo(7, -120, 16, -124); ink(ctx, 2.2); ctx.stroke();
      // top hat
      ell(ctx, 4, -161, 32, 6.5, '#26222f', 3); rrect(ctx, -14, -196, 36, 38, 4, '#26222f', 3); rrect(ctx, -14, -172, 36, 8, 1, '#e8173a', 2);
      ctx.restore();
    },
  };

  // ============================================================================================ JUNGLE: Chimpanzilla
  function coconutSplat(s) {
    if (S.FX) { S.FX.debris(s.x, s.y, 6, '#7a4a22'); S.FX.dust(s.x, s.y, 3); }
    word('KONK!', s.x, s.y - 12, { size: 15, color: '#e8c9a0' });
  }
  Impl.jungle = {
    w: 176, h: 200, hw: 88, enterT: 1.7, introWord: 'OOK OOK OOOK!', enrageWord: 'ANGRY MONKE!', hitWords: ['OOK!', 'AAH!', 'EEK!', 'HEY!'],
    init(b) { b.pound = 0; b.charging = false; },
    enter(b, dt, t) { b.pound = (Math.sin(t * 14) > 0) ? 1 : 0; if (t < 1.3 && S.FX && Math.random() < 0.06) S.FX.shake(0.15); },
    idle(b, dt, p) { keep(b, dt, p, 240, 400, 80); },
    boxes(b) { return [lbox(b, -66, -204, 70, 0)]; },
        update(b) { if (!b.airborne) b.y = floorOf(b); if (b.mode !== 'tele') b.pound = b.mode === 'rest' ? 0 : b.pound; },
    patterns: PAT.jungle,
    draw(ctx, b) {
      const t = b.anim, pound = b.pound, rage = b.enraged, mv = Math.min(1, Math.abs(b.vx) / 70), sw = Math.sin(t * 10) * 7 * mv;
      ctx.scale(b.face, 1);
      const squash = (b.crouch || 0) * 16; ctx.translate(0, squash);
      const fur = '#4a4658', fur2 = '#6b6680';
      // legs
      ell(ctx, -30 - sw, -16, 21, 17, fur, 3.2); ell(ctx, 32 + sw, -16, 23, 17, fur, 3.2);
      // back arm
      limb(ctx, [[-52, -140], [-80, -96], [-70 + sw, -24]], 24, fur2); circ(ctx, -70 + sw, -18, 16, fur, 3);
      // torso
      ell(ctx, 0, -104, 62, 72, fur, 3.4);
      ell(ctx, 6, -96, 40, 50, fur2, 0);
      halftone(ctx, 'rgba(20,18,30,0.55)', 3, 7, () => { ctx.beginPath(); ctx.ellipse(0, -104, 62, 72, 0, 0, TAU); });
      for (let i = 0; i < 5; i++) tuft(ctx, -58 + i * 3, -80 - i * 14, Math.PI * 0.95, 14, 6, fur);
      // tank top
      poly(ctx, [[-34, -146], [-22, -146], [-18, -118], [26, -118], [30, -146], [40, -146], [46, -86], [-40, -86]], '#f4f0e6', 3);
      line(ctx, -30, -112, 40, -112, 4, '#d8d4e8'); line(ctx, -34, -100, 42, -100, 4, '#d8d4e8');
      ctx.fillStyle = K('rgba(110,80,40,0.35)'); if (!FL) { ctx.beginPath(); ctx.ellipse(10, -92, 16, 7, 0.2, 0, TAU); ctx.fill(); }
      // front arm (pounds the chest or hangs)
      const ax = pound ? 24 : 66, ay = pound ? -112 : -30;
      limb(ctx, [[52, -142], [pound ? 70 : 84, pound ? -122 : -92], [ax, ay]], 25, fur2); circ(ctx, ax, ay, 17, fur, 3);
      // head
      ell(ctx, 22, -170 + (pound ? 3 : 0), 31, 27, fur, 3.4);
      ell(ctx, 30, -164, 21, 19, '#c9a07a', 2.4);
      googly(ctx, 18, -176, 6.2, 0.7, 0.3); googly(ctx, 36, -176, 6.2, 0.7, 0.3);
      line(ctx, 8, -186, 26, -179, 5.5, '#2a2638'); line(ctx, 30, -179, 46, -186, 5.5, '#2a2638');
      circ(ctx, 28, -166, 2.4, '#2a2638', 0); circ(ctx, 36, -166, 2.4, '#2a2638', 0);
      ctx.beginPath(); ctx.moveTo(14, -156); ctx.quadraticCurveTo(30, -138 - (pound ? 4 : 0), 48, -156); ctx.quadraticCurveTo(30, -150, 14, -156); fs(ctx, '#5a2a3a', 2.4);
      for (const x of [20, 28, 36, 43]) poly(ctx, [[x - 2, -154], [x, -146], [x + 2, -154]], '#ffffff', 1.4);
      circ(ctx, -6, -170, 8, fur, 2.6);
      if (rage) { ctx.fillStyle = K('#ff3b3b'); if (!FL) { ctx.fillRect(14, -184, 3, 8); ctx.fillRect(40, -184, 3, 8); } }
      // front foot (draw over arm base)
    },
  };

  // ============================================================================================ MOUNTAIN: Billy the Kidd (jetpack goat)
  Impl.mountain = {
    w: 100, h: 126, hw: 50, enterT: 1.6, introWord: 'BAAAAA!', enrageWord: 'JETPACK MAX!', hitWords: ['BAA!', 'MY HORNS!', 'BLEAT!', 'HEY!'],
    init(b) { b.ty = floorOf(b) - 96; b.y = b.ty - 160; b.diving = false; },
    enter(b, dt) { b.y += (b.ty - b.y) * Math.min(1, dt * 3); },
    idle(b, dt, p) { keep(b, dt, p, 200, 380, 120); b.ty = floorOf(b) - 96; },
    boxes(b) { return [lbox(b, -40, -128, 42, 6)]; },
    contact(b) { return b.diving ? [Object.assign(lbox(b, -36, -70, 38, 0), { dmg: 1 })] : null; },
    update(b, dt) {
      if (b.mode === 'act' && b.pat && b.pat.id === 'dive') return;
      const target = b.dizzyNow ? floorOf(b) : (b.ty + Math.sin(b.t * 2.4) * 8);
      b.y += (target - b.y) * Math.min(1, dt * (b.dizzyNow ? 9 : 4));
      if (S.FX && !b.dizzyNow && Math.random() < 0.5) S.FX.add({ x: b.x - b.face * 30 + U.rand(-4, 4), y: b.y - 18, vx: U.rand(-20, 20), vy: 70, life: 0.35, kind: 'fire', size: 5, grow: -9 });
    },
    patterns: PAT.mountain,
    draw(ctx, b) {
      const t = b.anim;
      ctx.scale(b.face, 1);
      const dive = b.diving;
      if (dive) ctx.rotate(0.9);
      // cape
      poly(ctx, [[-14, -96], [-46 - Math.sin(t * 10) * 4, -70], [-58 - Math.sin(t * 9) * 5, -30], [-24, -34], [-10, -60]], '#e8173a', 3);
      line(ctx, -46, -66, -22, -34, 4, '#ffffff');
      // jetpack + flames
      rrect(ctx, -34, -90, 13, 38, 5, '#8a86a8', 2.8); rrect(ctx, -22, -90, 13, 38, 5, '#c8200e', 2.8);
      for (const fx of [-28, -15]) { ctx.save(); ctx.translate(fx, -50); ctx.scale(1, -1); flame(ctx, 0, 0, 8 + Math.sin(t * 25) * 1.5, t, '#ff5a1a', '#ffb81c', '#fff6b0'); ctx.restore(); }
      // legs
      limb(ctx, [[-4, -36], [-8, -20], [-4 + Math.sin(t * 5) * 3, -4]], 9, '#efe6d2'); limb(ctx, [[8, -36], [14, -20], [10 - Math.sin(t * 5) * 3, -4]], 9, '#efe6d2');
      ell(ctx, -3, -2, 6, 4, '#3d3754', 2); ell(ctx, 11, -2, 6, 4, '#3d3754', 2);
      // torso
      ell(ctx, 2, -62, 25, 34, '#efe6d2', 3.2);
      halftone(ctx, 'rgba(150,120,80,0.45)', 3, 7, () => { ctx.beginPath(); ctx.ellipse(2, -62, 25, 34, 0, 0, TAU); });
      // arms
      limb(ctx, [[14, -84], [32, -76], [44, -92]], 10, '#efe6d2'); circ(ctx, 46, -94, 6.5, '#efe6d2', 2.4);
      limb(ctx, [[-8, -82], [-22, -70], [-24, -52]], 10, '#efe6d2');
      // head
      ell(ctx, 14, -112, 20, 18, '#efe6d2', 3);
      ell(ctx, 26, -108, 11, 9, '#d9cdb4', 2.4);
      googly(ctx, 12, -116, 5, 0.7, 0.3); googly(ctx, 24, -117, 5, 0.7, 0.3);
      line(ctx, 6, -124, 16, -120, 3.4, '#3d3754'); line(ctx, 20, -120, 30, -124, 3.4, '#3d3754');
      poly(ctx, [[10, -98], [18, -78 + Math.sin(t * 6) * 2], [24, -98]], '#d9cdb4', 2.4);
      ctx.beginPath(); ctx.moveTo(18, -103); ctx.quadraticCurveTo(26, -97, 34, -103); ink(ctx, 2); ctx.stroke();
      // horns + crown
      for (const sx of [0, 1]) { const hx = sx ? 22 : 4; ctx.beginPath(); ctx.moveTo(hx, -124); ctx.bezierCurveTo(hx + (sx ? 18 : -16), -150, hx + (sx ? 40 : -34), -140, hx + (sx ? 36 : -30), -118); ctx.lineTo(hx + (sx ? 24 : -20), -124); ctx.closePath(); fs(ctx, '#c9bfb2', 2.8); }
      poly(ctx, [[4, -128], [8, -144], [13, -132], [18, -146], [23, -132], [28, -144], [30, -128]], '#ffcf26', 2.6);
      ctx.beginPath(); ctx.moveTo(30, -118); ctx.lineTo(40, -126); ctx.lineTo(36, -112); ctx.closePath(); fs(ctx, '#d9cdb4', 2);
    },
  };

  // ============================================================================================ PLAINS: Colonel Cornhusk (combine harvester)
  Impl.plains = {
    w: 232, h: 166, hw: 116, enterT: 1.7, introWord: 'HOWDY, VARMINT!', enrageWord: 'STUFFED WITH RAGE!', hitWords: ['DAGNABBIT!', 'MY CORN!', 'YEE-OW!', 'HEY!'],
    init(b) { b.spin = 0; b.revving = false; b.charging = false; },
    enter(b, dt, t) { b.revving = t < 1.3; },
    idle(b, dt, p) { keep(b, dt, p, 270, 440, 66); },
    boxes(b) { return [lbox(b, -104, -166, 60, -30), lbox(b, -112, -44, 142, 0)]; },
    contact(b) { return b.charging ? [Object.assign(lbox(b, RAM.plains.dx0, -RAM.plains.h, RAM.plains.dx1, 0), { dmg: 1 })] : null; }, // rule 4: only the cutter bar hurts
    update(b, dt) {
      b.spin += dt * (b.charging ? 22 : b.revving ? 16 : 5);
      b.y = floorOf(b);
      if ((b.charging || b.revving) && S.FX && Math.random() < 0.5) S.FX.dust(b.x - b.face * 110, b.y - 4, 1);
      if (S.FX && Math.random() < 0.15) S.FX.add({ x: b.x - b.face * 80, y: b.y - 150, vx: U.rand(-10, 10), vy: -50, life: 0.7, kind: 'smoke', size: 5, grow: 9, color: '#8a86a8', drag: 1 });
    },
    patterns: PAT.plains,
    draw(ctx, b) {
      const t = b.anim, rage = b.enraged;
      ctx.scale(b.face, 1);
      const shake = (b.revving || b.charging) ? Math.sin(t * 60) * 1.3 : Math.sin(t * 6) * 0.4;
      ctx.translate(0, shake);
      // wheels
      ctx.save(); ctx.translate(-62, -36); ctx.rotate(b.x * 0.02); circ(ctx, 0, 0, 36, '#2a2640', 3.4); circ(ctx, 0, 0, 18, '#c8200e', 2.6); for (let i = 0; i < 8; i++) { const a = i * TAU / 8; line(ctx, Math.cos(a) * 28, Math.sin(a) * 28, Math.cos(a) * 36, Math.sin(a) * 36, 3, '#46405e'); } ctx.restore();
      ctx.save(); ctx.translate(32, -24); ctx.rotate(b.x * 0.03); circ(ctx, 0, 0, 24, '#2a2640', 3.2); circ(ctx, 0, 0, 11, '#c8200e', 2.4); ctx.restore();
      // chassis + body
      rrect(ctx, -100, -92, 164, 56, 8, '#e8a820', 3.4);
      halftone(ctx, 'rgba(150,90,10,0.45)', 3, 7, () => { ctx.beginPath(); ctx.rect(-100, -60, 164, 24); });
      rrect(ctx, -100, -70, 164, 8, 2, '#c8200e', 2);
      // grain tank + chute
      rrect(ctx, -104, -124, 78, 36, 8, '#e8a820', 3.4); for (let i = 0; i < 4; i++) line(ctx, -92 + i * 18, -120, -92 + i * 18, -92, 3, '#c28a14');
      line(ctx, -80, -124, -80, -152, 9, '#8a86a8'); rrect(ctx, -88, -160, 16, 8, 2, '#4a4666', 2.4);
      // cab with scarecrow
      rrect(ctx, -18, -148, 70, 60, 8, 'rgba(160,230,255,0.55)', 3.4);
      rrect(ctx, -6, -100, 40, 14, 4, '#6a4a2a', 2.2);
      rrect(ctx, 0, -104, 26, 22, 4, '#c8200e', 2.2); line(ctx, 8, -104, 8, -82, 3, '#8a1a10'); line(ctx, 18, -104, 18, -82, 3, '#8a1a10'); // plaid shirt
      limb(ctx, [[24, -98], [40, -92], [46, -82]], 7, '#c8200e'); circ(ctx, 47, -80, 5, '#d9b97a', 2);
      ell(ctx, 14, -122, 15, 15, '#d9b97a', 2.8);
      circ(ctx, 9, -125, 3.4, '#2a2438', 0); circ(ctx, 20, -125, 3.4, '#2a2438', 0);
      ctx.beginPath(); ctx.moveTo(6, -116); ctx.quadraticCurveTo(14, -110, 22, -116); ink(ctx, 2); ctx.stroke(); for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(8 + i * 4, -118); ctx.lineTo(8 + i * 4, -113); ctx.stroke(); }
      ell(ctx, 14, -136, 24, 5, '#e8c040', 2.8); poly(ctx, [[0, -138], [6, -156], [22, -156], [28, -138]], '#e8c040', 2.8); line(ctx, 6, -138, 24, -138, 3, '#8a1a10');
      for (let i = 0; i < 4; i++) line(ctx, -4 + i * 4, -132, -10 + i * 4 - 3, -128, 2.2, '#e8c040');
      // header + reel
      rrect(ctx, 58, -64, 66, 40, 6, '#c8200e', 3.4);
      for (let i = 0; i < 9; i++) poly(ctx, [[62 + i * 8, -22], [66 + i * 8, -8], [70 + i * 8, -22]], '#d8d4e8', 1.8);
      ctx.save(); ctx.translate(108, -50); ctx.rotate(b.spin);
      for (let i = 0; i < 5; i++) { ctx.save(); ctx.rotate(i * TAU / 5); rrect(ctx, 0, -5, 38, 10, 3, i % 2 ? '#ffffff' : '#c8200e', 2.6); ctx.restore(); }
      circ(ctx, 0, 0, 9, '#4a4666', 2.8); ctx.restore();
      if (b.revving) { ctx.fillStyle = 'rgba(255,243,107,' + (0.3 + 0.3 * Math.sin(t * 40)) + ')'; ctx.beginPath(); ctx.moveTo(126, -30); ctx.lineTo(190, -60); ctx.lineTo(190, 0); ctx.closePath(); ctx.fill(); }
      if (rage) { ctx.fillStyle = K('#ff3b3b'); if (!FL) { ctx.fillRect(7, -128, 3, 7); ctx.fillRect(18, -128, 3, 7); } }
    },
  };

  // ============================================================================================ FANTASY: Wizard Wizzlebeard
  function poof(x, y) { if (S.FX) { S.FX.smoke(x, y, 6, '#e6d8ff'); S.FX.confetti(x, y, 8); S.FX.ring(x, y, 40, '#c77dff'); } sfx('powerup', { x, vol: 0.4 }); }
  Impl.fantasy = {
    w: 104, h: 176, hw: 52, enterT: 1.6, introWord: 'BEHOLD MY BEARD!', enrageWord: 'TINY DRAGON TIME!', hitWords: ['MY BEARD!', 'EGAD!', 'FIE!', 'HEY!'],
    init(b) { b.vis = 0; b.hoverY = floorOf(b) - 34; b.beard = 0; b.drag = { a: 0, t: 1.5, flash: 0 }; b.staffFlash = 0; },
    enter(b, dt, t) { b.vis = Math.min(1, t / 0.8); if (!b.ps.pooffed && t > 0.1) { b.ps.pooffed = true; poof(b.x, b.y - 80); } },
    idle(b, dt, p) { keep(b, dt, p, 260, 440, 70); },
    boxes(b) { return b.vis < 0.4 ? [] : [lbox(b, -42, -178, 46, 28)]; },
    update(b, dt, p) {
      if (b.mode !== 'enter' && b.mode !== 'act') b.vis = Math.min(1, b.vis + dt * 3);
      b.y += ((b.hoverY + Math.sin(b.t * 2) * 8) - b.y) * Math.min(1, dt * 5);
      b.staffFlash = Math.max(0, b.staffFlash - dt * 3);
      b.invuln = b.vis < 0.4;
      if (b.enraged && !b.dying) {
        const d = b.drag; d.a += dt * 1.3; d.flash = Math.max(0, d.flash - dt * 3); d.t -= dt;
        const dx = Math.cos(d.a) * 130 * b.face, dy = -150 + Math.sin(d.a * 1.7) * 26;
        if (d.t <= 0.5 && d.flash <= 0 && d.t > 0) d.flash = 1;
        if (d.t <= 0 && p) {
          const sx = b.x + dx, sy = b.y + dy, a = Math.atan2((p.y - 16) - sy, p.x - sx);
          if (Math.hypot(p.x - sx, p.y - 16 - sy) < 220) d.t = 0.6; // rule 6: never fire point-blank, try again shortly (the flash telegraphs it again)
          else { d.t = 2.4; proj({ x: sx, y: sy, vx: Math.cos(a) * 240, vy: Math.sin(a) * 240, shape: 'fire', r: 7, life: 3.2 }); sfx('flame', { x: sx, vol: 0.4 }); }
        }
      }
    },
    patterns: PAT.fantasy,
    draw(ctx, b) {
      const t = b.anim;
      ctx.globalAlpha = Math.max(0.15, b.vis); ctx.scale(b.face, 1);
      // beard lash visual (coiled forward)
      const bl = b.beard;
      // staff
      limb(ctx, [[34, -40], [36, -100], [34, -156]], 5, '#8a5a2a');
      const fl = b.staffFlash; circ(ctx, 34, -162, 10 + fl * 5, fl > 0.2 ? '#ffffff' : '#ff4fa3', 2.8); circ(ctx, 31, -165, 3, '#ffffff', 0);
      // robe
      poly(ctx, [[-14, -112], [18, -112], [44, -14], [-40, -14]], '#6a3fc4', 3.4);
      halftone(ctx, 'rgba(30,10,90,0.5)', 3, 7, () => { ctx.beginPath(); ctx.moveTo(-14, -112); ctx.lineTo(-4, -112); ctx.lineTo(-10, -14); ctx.lineTo(-40, -14); ctx.closePath(); });
      for (const [sx, sy, r] of [[-12, -60, 6], [14, -80, 5], [22, -38, 6], [-24, -30, 4]]) star(ctx, sx, sy, r, '#ffe14d', t * 0.5 + sx);
      rrect(ctx, -20, -76, 42, 6, 2, '#ffcf26', 2);
      // sleeves/arms
      limb(ctx, [[14, -104], [30, -86], [34, -60]], 11, '#6a3fc4'); circ(ctx, 34, -56, 6, '#ffd1a8', 2.2);
      limb(ctx, [[-10, -104], [-28, -84], [-30, -62]], 11, '#6a3fc4'); circ(ctx, -30, -58, 6, '#ffd1a8', 2.2);
      // BEARD (absurd)
      const sw = Math.sin(t * 2.4) * 4;
      ctx.beginPath(); ctx.moveTo(-14, -110); ctx.bezierCurveTo(-46 + sw, -70, -40, -10 + sw, -24, 30); ctx.bezierCurveTo(-14, 52, 6 + sw, 44, 8, 30); ctx.bezierCurveTo(16, 50, 38 + sw, 46, 34, 22); ctx.bezierCurveTo(44, -40, 30, -92, 14, -110); ctx.closePath(); fs(ctx, '#f2f2f2', 3.4);
      ctx.strokeStyle = K('#c9c9d8'); ctx.lineWidth = 2; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-6 + i * 7, -96); ctx.quadraticCurveTo(-12 + i * 9 + sw, -40, -8 + i * 9, 24); } ctx.stroke();
      if (bl > 0.01) { // beard tip curling forward along the floor
        const len = 120 + bl * 380; ctx.beginPath(); ctx.moveTo(8, 26); ctx.bezierCurveTo(60, 30, len * 0.5, 20 + Math.sin(t * 20) * 6, len, 26); ctx.lineTo(len, 36); ctx.bezierCurveTo(len * 0.5, 40, 60, 44, 8, 40); ctx.closePath(); fs(ctx, '#f2f2f2', 3);
      }
      // head
      ell(ctx, 4, -126, 17, 16, '#ffd1a8', 3);
      googly(ctx, 2, -130, 4.4, 0.6, 0.2); googly(ctx, 14, -130, 4.4, 0.6, 0.2);
      ell(ctx, 18, -122, 5, 4.4, '#ffb48a', 2);
      line(ctx, -4, -138, 6, -135, 3, '#f2f2f2'); line(ctx, 10, -135, 20, -138, 3, '#f2f2f2');
      // hat
      ell(ctx, 4, -138, 30, 6, '#6a3fc4', 3);
      ctx.beginPath(); ctx.moveTo(-16, -140); ctx.quadraticCurveTo(-4, -176, 6, -184); ctx.quadraticCurveTo(14, -192 + Math.sin(t * 3) * 3, 26, -180); ctx.quadraticCurveTo(14, -170, 22, -140); ctx.closePath(); fs(ctx, '#6a3fc4', 3.2);
      star(ctx, 2, -158, 5, '#ffe14d', 0.3); star(ctx, 12, -170, 4, '#ffe14d', 0.8);
      // tiny dragon (phase 2)
      if (b.enraged) {
        const d = b.drag, dx = Math.cos(d.a) * 130, dy = -150 + Math.sin(d.a * 1.7) * 26, fl2 = Math.sin(t * 18) * 8;
        ctx.save(); ctx.translate(dx, dy); if (Math.sin(d.a) < 0) ctx.scale(-1, 1);
        poly(ctx, [[-6, -2], [-14, -16 + fl2], [-2, -8]], '#7dff6b', 2); poly(ctx, [[2, -2], [10, -16 - fl2], [8, -6]], '#4fd35f', 2);
        ell(ctx, 0, 0, 12, 7, d.flash > 0.3 ? '#ff8c1a' : '#4fd35f', 2.4); circ(ctx, 13, -3, 6, d.flash > 0.3 ? '#ff8c1a' : '#4fd35f', 2.4); circ(ctx, 15, -5, 1.4, '#141018', 0); poly(ctx, [[-10, 2], [-24, 8], [-12, 5]], '#4fd35f', 2);
        if (d.flash > 0.3) flame(ctx, 22, -2, 5, t, '#ff5a1a', '#ffb81c', '#fff6b0');
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  };

  // ============================================================================================ MOON: Emperor Zorp
  Impl.moon = {
    w: 188, h: 104, hw: 94, enterT: 1.7, introWord: 'BOW TO ZORP!', enrageWord: 'ALL MECH ARMS!', hitWords: ['BZZT!', 'MY UFO!', 'OUCH!', 'HEY!'],
    init(b) { b.hoverY = floorOf(b) - 86; b.y = b.hoverY - 150; b.vbeam = 0; b.claw = null; b.armSway = 0; },
    enter(b, dt) { b.y += (b.hoverY - b.y) * Math.min(1, dt * 3); },
    idle(b, dt, p) { keep(b, dt, p, 250, 440, 100); },
    boxes(b) { return [lbox(b, -94, -106, 94, -6)]; },
    update(b, dt) { b.y += ((b.hoverY + Math.sin(b.t * 2.2) * 6) - b.y) * Math.min(1, dt * 5); },
    patterns: PAT.moon,
    draw(ctx, b) {
      const t = b.anim, rage = b.enraged;
      ctx.scale(b.face, 1);
      const sway = Math.sin(t * 2.4) * 5;
      // mech arms
      const armCol = '#6b7aa8', claws = b.claw;
      const arm = (sx, front) => {
        let ex = sx * 1.25 + sway * sx * 0.1, ey = -2 + (front ? 22 : 18), hx = sx * 1.5, hy = 40 + Math.sin(t * 2 + sx) * 4;
        if (front && claws) { hx = (claws.x - b.x) * b.face; hy = (floorOf(b) - b.y) * claws.k + (1 - claws.k) * 10; ex = (sx + hx) / 2; ey = hy * 0.4; }
        limb(ctx, [[sx, -26], [ex, ey], [hx, hy]], 11, armCol); circ(ctx, ex, ey, 7, '#8a86a8', 2.4);
        ctx.save(); ctx.translate(hx, hy); const open = claws && front ? (claws.k >= 1 ? -0.1 : 0.5) : 0.5; for (const sg of [-1, 1]) { ctx.save(); ctx.rotate(sg * (0.35 + open)); rrect(ctx, -3, 0, 6, 17, 2, '#c9c5da', 2.2); ctx.restore(); } circ(ctx, 0, 0, 7, '#8a86a8', 2.4); ctx.restore();
      };
      arm(-70, false); arm(70, true);
      // saucer
      ell(ctx, 0, -30, 84, 20, '#b8c0d8', 3.4);
      halftone(ctx, 'rgba(60,70,120,0.5)', 3, 7, () => { ctx.beginPath(); ctx.ellipse(0, -22, 84, 12, 0, 0, TAU); });
      ell(ctx, 0, -46, 44, 14, '#d4d9ea', 3);
      for (let i = 0; i < 9; i++) { const lx = -66 + i * 16.5, on = Math.floor(t * 6 + i) % 3; circ(ctx, lx, -28 + Math.abs(lx) * 0.05, 3.6, on === 0 ? '#ff4fa3' : on === 1 ? '#ffe14d' : '#6aeaff', 1.6); }
      // dome + alien
      ctx.beginPath(); ctx.arc(0, -50, 32, Math.PI, 0); ctx.closePath(); ctx.fillStyle = 'rgba(150,230,255,0.4)'; ctx.fill(); ink(ctx, 3); ctx.stroke();
      ell(ctx, 0, -60, 14, 17, rage ? '#b8ff5a' : '#7dff6b', 2.6);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-6, -62, 5.4, 3.4, -0.4, 0, TAU); ctx.ellipse(6, -62, 5.4, 3.4, 0.4, 0, TAU); ctx.fill();
      ctx.fillStyle = K('#ffffff'); if (!FL) { ctx.beginPath(); ctx.arc(-7, -63, 1.4, 0, TAU); ctx.arc(5, -63, 1.4, 0, TAU); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-4, -53); ctx.quadraticCurveTo(0, -50 - (b.mode === 'tele' ? 2 : 0), 4, -53); ink(ctx, 1.8); ctx.stroke();
      line(ctx, -6, -74, -12, -88, 2.2, '#7dff6b'); circ(ctx, -12, -89, 3.6, '#ff4fa3', 1.8); line(ctx, 6, -74, 12, -88, 2.2, '#7dff6b'); circ(ctx, 12, -89, 3.6, '#ff4fa3', 1.8);
      poly(ctx, [[-14, -78], [-6, -92], [0, -80], [6, -92], [14, -78]], '#ffcf26', 2.2); // tiny crown
      // beam emitter + tractor beam
      rrect(ctx, -12, -14, 24, 10, 3, '#8a86a8', 2.6);
      const bv = b.vbeam;
      if (bv < 0) { ctx.strokeStyle = 'rgba(234,255,216,' + (0.3 + 0.5 * -bv) + ')'; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, floorOf(b) - b.y); ctx.stroke(); ctx.setLineDash([]); circ(ctx, 0, -8, 5 - bv * 8, '#eaffd8', 1.5); }
      else if (bv > 0) {
        const H2 = floorOf(b) - b.y, w2 = 22 + Math.sin(t * 30) * 2;
        ctx.beginPath(); ctx.moveTo(-9, -6); ctx.lineTo(-w2, H2); ctx.lineTo(w2, H2); ctx.lineTo(9, -6); ctx.closePath(); ctx.fillStyle = 'rgba(180,255,120,0.55)'; ctx.fill(); ink(ctx, 2.4); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.lineTo(-9, H2); ctx.lineTo(9, H2); ctx.lineTo(4, -6); ctx.closePath(); ctx.fill();
      }
    },
  };

  // ============================================================================================ RETRO: GL1TCH.EXE
  const PX = 12;
  Impl.retro = {
    w: 150, h: 218, hw: 70, enterT: 1.7, introWord: 'PRESS START TO DIE!', enrageWord: 'FATAL ERROR!', hitWords: ['ERROR!', 'LAG!', 'BZZT!', '404!'],
    init(b) { b.vis = 1; b.glitchT = 1.2; },
    enter(b, dt, t) { b.glitchT = Math.max(b.glitchT, 0.2); b.vis = t < 0.3 ? 0.4 : 1; },
    idle(b, dt, p) { keep(b, dt, p, 260, 440, 85); },
    boxes(b) { return b.vis < 0.5 ? [] : [lbox(b, -46, -220, 46, 0)]; },
    update(b, dt) { b.y = floorOf(b); b.invuln = b.vis < 0.5; if (b.mode !== 'tele' && b.mode !== 'act') b.vis = Math.min(1, b.vis + dt * 4); if (b.enraged && Math.random() < 0.01) b.glitchT = Math.max(b.glitchT, 0.25); },
    patterns: PAT.retro,
    draw(ctx, b) {
      const t = b.anim, f = b.face, rage = b.enraged, gl = b.glitchT > 0 || (rage && Math.floor(t * 9) % 11 === 0);
      ctx.globalAlpha = Math.max(0.2, b.vis);
      const col = FL ? '#ffffff' : (rage ? '#ff4f6a' : '#ff6ae0'), col2 = FL ? '#ffffff' : '#6aeaff';
      const frame = Math.floor(t * (Math.abs(b.vx) > 20 ? 8 : 2)) % 2, walk = Math.abs(b.vx) > 20;
      const arms = b.mode === 'tele' ? 1 : (b.mode === 'act' ? 2 : 0);
      const cells = []; // [cx, cy(0 = feet row), color]
      const add = (x0, x1, y0, y1, c) => { for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) cells.push([x, y, c]); };
      add(-2, 2, 13, 17, col);                                             // head
      cells.push([-1, 15, '#ffffff'], [1, 15, '#ffffff'], [-1, 15, INK], [1, 15, INK]); // eyes (white then ink pupils)
      add(-1, 1, 14, 14, rage ? '#ffffff' : INK);                          // mouth line
      add(-1, 1, 6, 12, col2);                                             // torso
      add(-6, -2, arms === 1 ? 12 : 10, arms === 1 ? 12 : 11, col); add(2, 6, arms === 2 ? 13 : 10, arms === 2 ? 14 : 11, col); // arms
      if (walk && frame) { add(-3, -2, 0, 5, col); add(2, 3, 0, 3, col); add(1, 4, 0, 0, col); } else { add(-3, -2, 0, 5, col); add(2, 3, 0, 5, col); }
      add(-4, -2, 0, 0, col2); add(2, 4, 0, 0, col2);                       // feet
      const jitter = (row) => (gl && U.hash(row, Math.floor(t * 14), 5) > 0.72 ? Math.round((U.hash(row, Math.floor(t * 14), 9) - 0.5) * 6) * PX : 0);
      ctx.scale(f, 1);
      if (gl) { ctx.globalAlpha = Math.max(0.2, b.vis) * 0.5; ctx.fillStyle = '#ff2255'; for (const c of cells) ctx.fillRect(c[0] * PX - 6 - 6, -(c[1] + 1) * PX, PX, PX); ctx.fillStyle = '#22ddff'; for (const c of cells) ctx.fillRect(c[0] * PX - 6 + 6, -(c[1] + 1) * PX, PX, PX); ctx.globalAlpha = Math.max(0.2, b.vis); }
      for (const c of cells) {
        const x = c[0] * PX - 6 + jitter(c[1]), y = -(c[1] + 1) * PX;
        ctx.fillStyle = c[2] === INK ? INK : (FL ? '#ffffff' : c[2]);
        if (c[2] === '#ffffff' && !FL) ctx.fillStyle = '#ffffff';
        ctx.fillRect(x, y, PX, PX);
      }
      // outline blocks
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6; for (const c of cells) { if (c[2] === INK || c[2] === '#ffffff') continue; ctx.strokeRect(c[0] * PX - 6 + jitter(c[1]), -(c[1] + 1) * PX, PX, PX); }
      if (gl) { for (let i = 0; i < 6; i++) { const nx = (U.hash(i, Math.floor(t * 12), 2) - 0.5) * 150, ny = -U.hash(i, Math.floor(t * 12), 3) * 220; ctx.fillStyle = i % 2 ? '#6aeaff' : '#ff6ae0'; ctx.fillRect(nx, ny, PX * (1 + i % 3), PX / 2); } }
      ctx.globalAlpha = 1;
    },
  };

  // ============================================================================================ FORTRESS: General Doom-Doosh in the DOOSHINATOR
  function dooshTip(b) { return { x: b.x + b.face * 128, y: b.y - 138 + (b.aimA || 0) * 20 }; }
  Impl.fortress = {
    w: 210, h: 246, hw: 104, metal: true, enterT: 2.0, introWord: 'DOOM-DOOSH!', enrageWord: 'MAXIMUM DOOSH!', hitWords: ['CLANG!', 'DAMN!', 'IMPOSSIBLE!', 'HEY!'],
    init(b) { b.aimA = 0; b.pod = 0; b.recoil = 0; },
    enter(b, dt, t) { b.pod = Math.min(1, t / 1.2); },
    idle(b, dt, p) { keep(b, dt, p, 300, 470, 55); },
    boxes(b) { return [lbox(b, -74, -246, 76, -88), lbox(b, -62, -92, 62, 0)]; },
    update(b, dt) {
      if (!b.airborne) b.y = floorOf(b);
      b.recoil = Math.max(0, b.recoil - dt * 4);
      if (b.mode !== 'tele' && b.mode !== 'act') b.pod = Math.max(0, b.pod - dt * 2);
      if (b.enraged && S.FX && Math.random() < 0.12) S.FX.spark(b.x + U.rand(-60, 60), b.y - U.rand(100, 220), 3, '#ffb81c');
      if (b.enraged && S.FX && Math.random() < 0.1) S.FX.smoke(b.x + b.face * U.rand(-50, 50), b.y - 200, 1, '#4a4666');
    },
    patterns: PAT.fortress,
    draw(ctx, b) {
      const t = b.anim, rage = b.enraged, f = b.face, mv = Math.min(1, Math.abs(b.vx) / 60), ph = (b.x * 0.05), air = !!b.airborne;
      ctx.scale(f, 1);
      const steel = '#4b4f63', steel2 = '#6b7090', hi = '#8a90ad';
      const crouch = (b.crouch || 0) * 16; ctx.translate(0, crouch);
      // legs
      for (const [lx, sg] of [[-34, 1], [34, -1]]) {
        const sw = air ? 0 : Math.sin(ph + sg * 1.6) * 10 * mv;
        limb(ctx, [[lx, -96], [lx + sw * 0.6, -62], [lx + sw, -26]], 22, steel); circ(ctx, lx + sw * 0.6, -62, 11, steel2, 3);
        rrect(ctx, lx + sw - 22, -22, 52, 22, 6, steel2, 3.2); rrect(ctx, lx + sw - 22, -8, 52, 8, 3, '#2d2a44', 2);
      }
      // back arm (missile pods)
      ctx.save(); ctx.translate(-62, -150);
      rrect(ctx, -44, -30, 52, 60, 6, steel2, 3.2); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { circ(ctx, -34 + j * 24, -14 + i * 26, 9, b.pod > 0.4 ? '#ff3b3b' : '#2d2a44', 2.6); }
      if (b.pod > 0.4) { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) circ(ctx, -34 + j * 24, -14 + i * 26, 4, '#ffe14d', 0); }
      ctx.restore();
      // torso
      rrect(ctx, -76, -176, 152, 90, 10, steel, 3.6);
      halftone(ctx, 'rgba(15,15,35,0.5)', 3, 7, () => { ctx.beginPath(); ctx.rect(-76, -120, 152, 34); });
      rrect(ctx, -60, -166, 120, 36, 6, '#2d2a44', 2.6);
      ctx.save(); ctx.scale(f, 1); txt(ctx, 'DOOSHINATOR', 0, -148, 16, rage ? '#ff4f4f' : '#ffe14d'); ctx.restore();
      for (const rx of [-66, -40, 40, 66]) circ(ctx, rx, -94, 3, hi, 1.4);
      line(ctx, -50, -108, 50, -108, 4, '#2d2a44');
      // exhaust stacks
      for (const sx of [-50, 50]) { rrect(ctx, sx - 7, -198, 14, 26, 3, '#2d2a44', 2.6); }
      // cockpit
      ctx.beginPath(); ctx.arc(8, -176, 38, Math.PI, 0); ctx.closePath(); ctx.fillStyle = 'rgba(255,120,120,0.35)'; ctx.fill(); ink(ctx, 3.4); ctx.stroke();
      // the general
      ell(ctx, 8, -192, 15, 15, '#ffc9a0', 2.8);
      ctx.beginPath(); ctx.moveTo(-6, -200); ctx.quadraticCurveTo(-12, -222, 12, -226); ctx.quadraticCurveTo(34, -230, 30, -206); ctx.quadraticCurveTo(22, -214, 8, -206); ctx.closePath(); fs(ctx, '#1a1a1a', 2.6); // pompadour
      ctx.fillStyle = INK; ctx.fillRect(10, -197, 22, 7); ctx.fillStyle = K('#ffffff'); if (!FL) ctx.fillRect(12, -196, 3, 2); // aviators
      line(ctx, 2, -200, 16, -197, 3, '#1a1a1a');
      poly(ctx, [[8, -182], [20, -182], [14, -170]], '#1a1a1a', 2); // evil goatee
      ctx.beginPath(); ctx.moveTo(8, -184); ctx.lineTo(20, -186); ink(ctx, 2); ctx.stroke();
      if (rage) { ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -202); ctx.lineTo(-2, -190); ctx.lineTo(-8, -176); ctx.moveTo(30, -180); ctx.lineTo(22, -170); ctx.stroke(); }
      // front arm: DOOSH shotgun cannon
      const rc = b.recoil * 14;
      ctx.save(); ctx.translate(54, -138); ctx.rotate((b.aimA || 0) * 0.3);
      rrect(ctx, -20 - rc, -24, 40, 48, 8, steel2, 3.2); rrect(ctx, 14 - rc, -13, 96, 14, 4, '#3a3d52', 3); rrect(ctx, 14 - rc, 2, 90, 11, 4, '#3a3d52', 3);
      rrect(ctx, -34 - rc, -14, 20, 30, 6, '#a0622d', 3); rrect(ctx, 100 - rc, -15, 10, 30, 2, '#2d2a44', 2.4);
      if (b.recoil > 0.5) { ctx.save(); ctx.translate(124 - rc, -4); if (S.Comic) S.Comic.burst(ctx, 0, 0, 14, 28, 9, 3); ctx.fillStyle = '#fff36b'; ctx.fill(); ink(ctx, 2.6); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      if (rage) { for (let i = 0; i < 3; i++) flame(ctx, -50 + i * 50, -188, 6, t + i, '#ff5a1a', '#ffb81c', '#fff6b0'); }
    },
  };

  // ============================================================================================ defs (S.BossDefs)
  function D(id, name, title, hp, weakTo, sup, intro) {
    Defs[id] = { themeId: id, id, name, title, hp, weakTo, super: sup, music: id === 'fortress' ? 'final' : 'boss', arena: { w: 880, h: 400 }, intro };
  }
  D('ice', 'Frosty McChillface', 'Yeti. Snowmobile. Tiny Scarf.', 380, 'napalm', 'freeze', 'Whoa. Chill out, little dude. Literally. I brought a snowmobile.');
  D('fire', 'Captain Combustion', 'A Fireman Who Is ON FIRE', 360, 'tidal', 'napalm', 'Hello! Don\'t mind the flames! I\'m professionally on fire!');
  D('wind', 'Gustav Blowhard', 'Lungs Of Steel, Head Of Air', 330, 'boulder', 'tornado', 'Hear that? That\'s my mighty lungs! Time to clear the air!');
  D('water', 'Admiral Soggybottom', 'Terror Of The Seven Bathtubs', 380, 'gravity', 'tidal', 'Arrr! Me bathtub be mighty, and me bottom be soggy!');
  D('mud', 'Sir Sludgington', 'A Gentleman Of Pure Filth', 410, 'tornado', 'mudbomb', 'I say. You\'ve tracked mud on my carpet. Which is me.');
  D('jungle', 'Chimpanzilla', 'Big. Hairy. Tank Top.', 440, 'mudbomb', 'banana', 'OOK OOK! CHIMPANZILLA SMASH TINY STICK!');
  D('mountain', 'Billy the Kidd', 'Goat King With A Jetpack', 300, 'cow', 'boulder', 'Baaa! I\'m Billy the Kidd, king of the mountain, and the G.O.A.T.!');
  D('plains', 'Colonel Cornhusk', 'Scarecrow. Combine. Grudge.', 430, 'freeze', 'cow', 'Howdy, varmint. I\'m gonna harvest ya like corn.');
  D('fantasy', 'Wizard Wizzlebeard', 'Beard Of Infinite Length', 320, 'banana', 'magic', 'Behold! My beard is mightier than your gun!');
  D('moon', 'Emperor Zorp', 'Tiny UFO, Enormous Ego', 330, 'pixel', 'gravity', 'Greetings, Earth stick. Resistance is futile. Also, a little bit funny.');
  D('retro', 'GL1TCH.EXE', 'PRESS START TO DIE', 430, 'magic', 'pixel', 'ERROR. PLAYER DETECTED. PRESS START TO DIE.');
  D('fortress', 'General Doom-Doosh', 'Your Evil Twin (Goatee Edition)', 640, 'doosh', null, 'At last, we meet. I am General Doom-Doosh. My goatee is evil.');
  Bosses.preload = function (themeId) { try { if (S.Voice && S.Voice.preload) S.Voice.preload(['boss_' + themeId]); } catch (e) { /* optional */ } };
})();
