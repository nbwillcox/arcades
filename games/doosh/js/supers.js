// Stick Doosh - supers.js (bosses agent): the 11 boss supers (Mega Man X style special weapons).
// SGS.Supers[id] = {name, themeId, icon, color, ammoCost, use(owner)}. A super is listed in the cycle menu once Save.data.beaten[themeId] is set.
// Every super is built from custom SGS.Shots (team 'player', drawn on top of entities) and damages through SGS.Game.damage / hurtArea / explode so
// terrain carving, kill credit and boss WEAKNESS work: every hit carries {superId:id}; a boss whose def.weakTo === id takes x4 + stagger + WEAK!.
// Regular enemies get silly status effects: ice blocks (freeze), burning (napalm), tornado flings, tidal soak, mud slow, gravity float + pop,
// pixel 8-bit glitch + shatter. A small status "driver" shot (re-created per level) applies / draws those effects.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018', TAU = Math.PI * 2;
  const Sp = S.Supers = S.Supers || {};
  const G = () => S.Game;
  const sfx = (n, o) => { if (S.Audio && S.Audio.sfx) { try { S.Audio.sfx(n, o); } catch (e) { /* optional */ } } };
  const word = (t, x, y, o) => { if (S.Comic) S.Comic.word(t, x, y, o); };
  const FX = () => S.FX;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ------------------------------------------------------------------ helpers
  function dirOf(o) { const a = o.aim || 'fwd', f = o.facing || 1; return a === 'up' ? { x: 0, y: -1 } : a === 'down' ? { x: 0, y: 1 } : { x: f, y: 0 }; }
  function muz(o) { const d = dirOf(o); return { x: o.x + d.x * 14, y: o.y - 20 + (d.y < 0 ? -18 : d.y > 0 ? 6 : 0) }; }
  function reach(e, x, y, r) { // distance from a point to the entity's box <= r
    const dx = Math.max(Math.abs(x - e.x) - e.w / 2, 0), dy = Math.max((e.y - e.h) - y, y - e.y, 0);
    return Math.hypot(dx, dy) <= r;
  }
  function hitBox(e, x, y, pad) { return e.inHit ? e.inHit(x, y, pad) : U.pointIn(e, x, y, pad); }
  function tickOnce(e, key, sec) { const g = G(), k = '_sc_' + key; if ((e[k] || 0) > g.time) return false; e[k] = g.time + sec; return true; }
  function hit(o, e, dmg, superId, extra) {
    return G().damage(e, dmg * ((o && o.dmgMul) || 1), Object.assign({ team: 'player', owner: o, kind: 'super', superId, dirX: U.sign(e.x - (o ? o.x : 0)) || 1, x: e.x, y: e.y - e.h / 2 }, extra || {}));
  }
  function def(id, o) { Sp[id] = Object.assign({ id, ammoCost: 4 }, o); }
  function superShot(o, x, y, vx, vy, props) {
    return S.Shots.spawn('super', x, y, vx, vy, 'player', Object.assign({ custom: true, superShot: true, owner: o, life: 5, r: 5, rot: 0, seen: new Set() }, props));
  }
  function foes(fn) { const list = G().hostiles('player').slice(); for (const e of list) if (!e.dead) fn(e); }
  function enemyShots(fn) { for (const s of S.Shots.list) if (s.team === 'enemy' && !s.dead && !s.superShot && s.kind !== 'beam') fn(s); }
  function ground(x, y, up, down) { const T = S.Terrain; const g = T && T.groundBelow ? T.groundBelow(x, y - (up == null ? 40 : up), down || 260) : null; return g == null ? y : g; }
  const isBoss = (e) => e.kind === 'boss';
  const isFoe = (e) => e.kind === 'enemy';

  // ------------------------------------------------------------------ status driver (slow / pixel / float overlays + mud platform timers)
  const Status = [], mudTiles = [];
  let driver = null;
  function ensureDriver() {
    const L = S.Shots.list;
    if (driver && !driver.dead && L.indexOf(driver) >= 0) return;
    Status.length = 0; mudTiles.length = 0;
    driver = S.Shots.spawn('superdrv', 0, 0, 0, 0, 'player', { custom: true, superShot: true, driver: true, life: 1e9, update: driverUpdate, draw: driverDraw });
  }
  function addStatus(st) {
    ensureDriver();
    const ex = Status.find((q) => q.e === st.e && q.type === st.type);
    if (ex) { Object.assign(ex, st); return ex; }
    st.age = 0; Status.push(st); return st;
  }
  function cubes(x, y, n) {
    const F = FX(); if (!F) return;
    for (let i = 0; i < n; i++) F.add({ x: x + U.rand(-8, 8), y: y + U.rand(-14, 14), vx: U.rand(-220, 220), vy: U.rand(-420, -80), life: U.rand(0.9, 1.5), kind: 'chunk', size: U.rand(4, 7), color: pick(['#ff6ae0', '#6aeaff', '#ffffff', '#ffe14d']), g: 1, rot: Math.random() * 6, vr: U.rand(-10, 10), bounce: true });
  }
  function driverUpdate(s, dt) {
    const g = G(); if (!g || !g.cam) return;
    s.x = g.cam.x + g.cam.w / 2; s.y = g.cam.y + g.cam.h / 2; s.life = 1e9;
    const T = S.Terrain;
    for (let i = mudTiles.length - 1; i >= 0; i--) {
      const m = mudTiles[i]; m.t -= dt;
      if (m.t <= 0) { if (T && T.get(m.tx, m.ty) === T.MAT.MUD) T.set(m.tx, m.ty, 0); if (S.FX) S.FX.dust((m.tx + 0.5) * C.T, (m.ty + 1) * C.T, 2); mudTiles.splice(i, 1); }
    }
    for (let i = Status.length - 1; i >= 0; i--) {
      const st = Status[i], e = st.e;
      if (e.dead) { if (st.type === 'float') e.noGrav = st.prevNoGrav; Status.splice(i, 1); continue; }
      st.age += dt; st.t -= dt;
      if (st.type === 'slow') {
        if (st.px != null) e.x = st.px + (e.x - st.px) * st.k;
        st.px = e.x;
        if (st.t <= 0) Status.splice(i, 1);
      } else if (st.type === 'pixel') {
        e.x = st.x0; if (e.stun !== undefined) e.stun = Math.max(e.stun || 0, 0.3); e.vx = 0; if (e.vy < 0) e.vy = 0;
        if (st.t <= 0) {
          Status.splice(i, 1);
          cubes(e.x, e.y - e.h / 2, 16); sfx('pixel_blip', { x: e.x }); word(pick(['8-BIT!', 'SHATTER!', 'GAME OVER!']), e.x, e.y - e.h - 8, { size: 18, color: '#ff6ae0', stroke: '#6aeaff', life: 0.7 });
          g.damage(e, 999, { team: 'player', owner: st.owner, kind: 'pixel', superId: 'pixel', noKnock: true, dirX: 0 });
        }
      } else if (st.type === 'bosspix') {
        st.tt = (st.tt || 0) - dt;
        if (st.tt <= 0 && st.n > 0) { st.n--; st.tt = 0.5; hit(st.owner, e, 2, 'pixel', { noKnock: true }); cubes(e.x + U.rand(-30, 30), e.y - e.h * U.rand(0.2, 0.9), 4); sfx('pixel_blip', { x: e.x, vol: 0.4 }); }
        if (st.n <= 0 || st.t <= 0) Status.splice(i, 1);
      } else if (st.type === 'float') {
        const w = st.well;
        e.noGrav = true; if (e.stun !== undefined) e.stun = Math.max(e.stun || 0, 0.3);
        e.vy = -(50 + st.age * 40); e.vx = w ? (w.x - e.x) * 0.9 : 0; e.onGround = false;
        if (st.t <= 0 || (w && e.y < w.y - 170)) {
          Status.splice(i, 1); e.noGrav = st.prevNoGrav;
          if (!e.dead) { word(pick(['POP!', 'BYE BYE!', 'FLOATED AWAY!']), e.x, e.y - e.h - 6, { size: 18, color: '#c9b8ff', stroke: '#141018', life: 0.7 }); if (FX()) FX().confetti(e.x, e.y - e.h / 2, 10); g.damage(e, 999, { team: 'player', owner: st.owner, kind: 'gravity', superId: 'gravity', noKnock: true, dirX: 0 }); }
        }
      } else Status.splice(i, 1);
    }
  }
  function driverDraw(ctx) {
    const g = G(); if (!g) return;
    for (const st of Status) {
      const e = st.e; if (e.dead) continue;
      const x0 = e.x - e.w / 2 - 3, y0 = e.y - e.h - 3, w = e.w + 6, h = e.h + 6;
      if (st.type === 'slow') {
        ctx.save(); ctx.fillStyle = 'rgba(125,90,56,0.8)'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        for (let i = 0; i < 4; i++) { const px = e.x + (i - 1.5) * e.w * 0.35, py = e.y - e.h * (0.2 + 0.22 * i) + Math.sin(st.age * 3 + i) * 1.5; ctx.beginPath(); ctx.ellipse(px, py, 5 + (i % 2) * 2, 4, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(px, py + 3); ctx.lineTo(px, py + 7 + ((st.age * 12 + i * 5) % 8)); ctx.lineWidth = 2.2; ctx.stroke(); ctx.lineWidth = 1.6; }
        ctx.beginPath(); ctx.ellipse(e.x, e.y - 2, e.w * 0.9, 4, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
      } else if (st.type === 'pixel') {
        ctx.save(); const cs = 6, nx = Math.ceil(w / cs), ny = Math.ceil(h / cs), fr = Math.floor(st.age * 16);
        for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const hsh = U.hash(i, j, fr); if (hsh < 0.35) continue; ctx.globalAlpha = 0.45 + hsh * 0.4; ctx.fillStyle = hsh > 0.8 ? '#ffffff' : hsh > 0.55 ? '#6aeaff' : '#ff6ae0'; ctx.fillRect(x0 + i * cs, y0 + j * cs, cs - 1, cs - 1); }
        ctx.globalAlpha = 1; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, w, h); ctx.restore();
      } else if (st.type === 'float') {
        ctx.save(); for (let i = 0; i < 3; i++) { const a = st.age * 3 + i * TAU / 3; FXstar(ctx, e.x + Math.cos(a) * (e.w + 6), e.y - e.h / 2 + Math.sin(a) * 10, 4, '#c9b8ff', a); } ctx.restore();
      }
    }
  }
  function FXstar(ctx, x, y, r, fill, rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore(); }

  // ------------------------------------------------------------------ generic lobbed bomb (freeze / mud / gravity / pixel / cow)
  function lobUpdate(s, dt) {
    const g = G(), T = S.Terrain;
    if (!g) { s.dead = true; return; }
    s.vy += C.GRAV * (s.grav == null ? 1 : s.grav) * (g.grav || 1) * dt; s.rot += dt * (s.spin || 10);
    if (s.tick) s.tick(s, dt);
    const n = Math.max(1, Math.ceil(Math.hypot(s.vx, s.vy) * dt / 7));
    for (let k = 0; k < n; k++) {
      const px = s.x, py = s.y, nx = s.x + s.vx * dt / n, ny = s.y + s.vy * dt / n;
      if (T && T.W && T.solidPx(nx, ny)) { s.x = px; s.y = py; s.dead = true; s.burst(s); return; }
      s.x = nx; s.y = ny;
      for (const e of g.hostiles('player')) { if (e.dead || e.kind === 'pickup') continue; if (hitBox(e, s.x, s.y, s.r)) { s.dead = true; s.burst(s); return; } }
    }
    if (s.life <= 0) { s.dead = true; s.burst(s); }
  }
  function drawBomb(ctx, s) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.lineJoin = 'round';
    ctx.fillStyle = s.gcolor || '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 2.4;
    if (s.gshape === 'square') { ctx.fillRect(-6, -6, 12, 12); ctx.strokeRect(-6, -6, 12, 12); ctx.fillStyle = '#6aeaff'; ctx.fillRect(-6, -6, 6, 6); ctx.fillRect(0, 0, 6, 6); }
    else if (s.gshape === 'hex') { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(-2, -2, 2.4, 0, TAU); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, 0, 7, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-2.4, -2.4, 2.4, 0, TAU); ctx.fill(); if (s.gshape === 'grav') { ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0.5, 0, TAU); ctx.stroke(); } }
    ctx.restore();
  }
  function bigWord(t, x, y, c, bc, size) { word(t, x, y, { size: size || 30, color: c, stroke: INK, burst: true, burstColor: bc, life: 0.9, vy: -30 }); }
  function nameWord(o, t, c, bc) { word(t, o.x, o.y - 56, { size: 22, color: c, stroke: INK, burst: true, burstColor: bc, life: 0.9, vy: -40 }); }

  // ============================================================================================ FREEZE GRENADE (ice)
  def('freeze', {
    name: 'FREEZE GRENADE', themeId: 'ice', icon: 'F', color: '#7fdcff',
    use(o) {
      const m = muz(o), d = dirOf(o);
      superShot(o, m.x, m.y, d.x * 330 + (o.vx || 0) * 0.4, d.y < 0 ? -580 : d.y > 0 ? 120 : -250, { id: 'freeze', grav: 1, life: 1.4, r: 6, burst: freezeBurst, update: lobUpdate, draw: drawBomb, gcolor: '#9fe8ff', gshape: 'hex' });
      nameWord(o, 'FREEZE GRENADE!', '#e9fbff', '#3bb4ff'); sfx('throw', { x: o.x });
    },
  });
  function freezeBurst(s) {
    const o = s.owner, g = G(), R = 120 * (o.blastMul || 1), x = s.x, y = s.y, F = FX(), T = S.Terrain;
    if (F) { F.ring(x, y, R, '#bfefff'); F.ring(x, y, R * 0.6, '#ffffff'); F.spark(x, y, 18, '#bfefff'); F.debris(x, y, 10, '#bfefff'); F.shake(0.3); F.hitstop(0.04); }
    bigWord('FREEZE!', x, y - 30, '#e9fbff', '#7fdcff'); sfx('freeze', { x }); sfx('glass', { x, vol: 0.5 });
    foes((e) => {
      if (!reach(e, x, y, R)) return;
      if (isBoss(e)) { hit(o, e, 6, 'freeze'); e.slowMul = Math.min(e.slowMul || 1, 0.65); e.slowT = 4; word('CHILLY!', e.x, e.y - e.h - 10, { size: 16, color: '#bfefff', stroke: INK }); }
      else if (isFoe(e)) { hit(o, e, 1, 'freeze', { noKnock: true }); if (!e.dead) { e.frozen = Math.max(e.frozen || 0, 5); if (e.stun !== undefined) e.stun = Math.max(e.stun || 0, 5); e.vx = 0; word('FROZEN!', e.x, e.y - e.h - 8, { size: 14, color: '#e9fbff', stroke: '#3bb4ff', life: 0.7 }); } }
      else hit(o, e, 2, 'freeze');
    });
    enemyShots((sh) => { if (Math.hypot(sh.x - x, sh.y - y) < R) { sh.dead = true; if (F) F.debris(sh.x, sh.y, 2, '#bfefff'); } });
    if (T && T.W) { const tr = Math.ceil(R * 0.8 / C.T), tx0 = Math.floor(x / C.T), ty0 = Math.floor(y / C.T); for (let ty = ty0 - tr; ty <= ty0 + tr; ty++) for (let tx = tx0 - tr; tx <= tx0 + tr; tx++) { if (Math.hypot((tx + 0.5) * C.T - x, (ty + 0.5) * C.T - y) > R * 0.8) continue; const mt = T.get(tx, ty); if (mt === T.MAT.WATER) T.set(tx, ty, T.MAT.ICE); else if (mt === T.MAT.LAVA) T.set(tx, ty, T.MAT.ROCK); } }
  }

  // ============================================================================================ NAPALM STRIKE (fire)
  def('napalm', {
    name: 'NAPALM STRIKE', themeId: 'fire', icon: 'N', color: '#ff7a1a',
    use(o) {
      const f = o.facing || 1, sx = o.x + f * 30;
      superShot(o, o.x, o.y, 0, 0, { id: 'napalm', life: 1.2, sx, f, i: 0, nt: 0, update: napalmSpawner, draw: () => {} });
      nameWord(o, 'NAPALM STRIKE!', '#ffe14d', '#e8173a'); sfx('flame', { x: o.x }); sfx('whoosh', { x: o.x });
      word('FWOOOOOOSH', o.x + f * 130, o.y - 24, { size: 26, color: '#ff8c1a', stroke: INK, life: 1.0, vy: -10 });
    },
  });
  function napalmSpawner(s, dt) {
    const o = s.owner, T = S.Terrain; s.nt -= dt;
    while (s.nt <= 0 && s.i < 10) {
      s.nt += 0.07; const x = s.sx + s.f * s.i * 34; s.i++;
      if (T && T.solidPx(x, o.y - 16)) { s.i = 99; break; }
      const gy = ground(x, o.y, 50, 200);
      if (Math.abs(gy - o.y) > 70) continue;
      superShot(o, x, gy, 0, 0, { id: 'napalm', life: 4.5, update: patchUpdate, draw: patchDraw, patch: 'fire', burnT: 0 });
      if (FX()) FX().fire(x, gy - 8, 3);
    }
    if (s.i >= 10) s.dead = true;
  }
  function patchUpdate(s, dt) {
    const g = G(), o = s.owner, T = S.Terrain;
    s.burnT -= dt;
    if (s.burnT <= 0) { s.burnT = 1; if (T) { const tx = Math.floor(s.x / C.T), ty = Math.floor(s.y / C.T); T.damageTile(tx, ty, 1, { fire: true }); T.damageTile(tx, ty - 1, 1, { fire: true }); } }
    if (FX() && Math.random() < 0.25) FX().fire(s.x + U.rand(-10, 10), s.y - 4, 1);
    foes((e) => {
      if (Math.abs(e.x - s.x) > e.w / 2 + 24 || e.y < s.y - 44 || e.y - e.h > s.y + 6 || e.kind === 'pickup') return;
      if (tickOnce(e, 'napalm', 0.3)) hit(o, e, isBoss(e) ? 0.6 : 0.8, 'napalm', { fire: true, noKnock: true, kind: 'burn' });
    });
  }
  function patchDraw(ctx, s) {
    const t = s.age * 12, k = Math.min(1, s.life / 0.8);
    ctx.save(); ctx.globalAlpha = k;
    for (let i = -1; i <= 1; i++) { const r = 9 + Math.sin(t + i * 2 + s.x) * 2.5, yy = s.y + 2 - (i === 0 ? 4 : 0); const px = s.x + i * 11;
      ctx.beginPath(); ctx.moveTo(px, yy - r * 2.2); ctx.quadraticCurveTo(px + r * 1.2, yy - r * 0.4, px, yy + 2); ctx.quadraticCurveTo(px - r * 1.2, yy - r * 0.4, px, yy - r * 2.2); ctx.fillStyle = '#ff5a1a'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px, yy - r * 1.4); ctx.quadraticCurveTo(px + r * 0.6, yy - r * 0.3, px, yy); ctx.quadraticCurveTo(px - r * 0.6, yy - r * 0.3, px, yy - r * 1.4); ctx.fillStyle = '#ffd23f'; ctx.fill(); }
    ctx.restore();
  }

  // ============================================================================================ TORNADO (wind)
  def('tornado', {
    name: 'TORNADO', themeId: 'wind', icon: 'T', color: '#9ff0d0',
    use(o) {
      const f = o.facing || 1, x = o.x + f * 36, y = ground(x, o.y, 40, 200);
      superShot(o, x, y, f * 125, 0, { id: 'tornado', life: 4.2, f, update: tornadoUpdate, draw: tornadoDraw, r: 40 });
      nameWord(o, 'TORNADO!', '#e9fbff', '#2e8f9e'); sfx('tornado', { x: o.x }); sfx('wind', { x: o.x });
    },
  });
  function tornadoUpdate(s, dt) {
    const g = G(), o = s.owner, T = S.Terrain, f = s.f;
    if (T && T.solidPx(s.x + f * 24, s.y - 26)) { if (FX()) FX().debris(s.x, s.y - 20, 6, '#d8d4e8'); s.dead = true; return; }
    s.x += s.vx * dt;
    const gy = ground(s.x, s.y, 70, 240); s.y += (gy - s.y) * Math.min(1, dt * 10);
    if (FX() && Math.random() < 0.5) FX().add({ x: s.x + U.rand(-30, 30), y: s.y - U.rand(0, 120), vx: -f * 60, vy: U.rand(-60, 20), life: 0.4, kind: 'spark', color: '#ffffff', len: 10 });
    foes((e) => {
      if (e.kind === 'pickup') return;
      const near = Math.abs(e.x - s.x) < 80 && e.y > s.y - 170 && e.y - e.h < s.y + 20;
      if (!near) return;
      if (isBoss(e)) { if (Math.abs(e.x - s.x) < e.w / 2 + 34 && tickOnce(e, 'tor', 0.35)) hit(o, e, 1.6, 'tornado', { noKnock: true }); return; }
      if (!isFoe(e)) return;
      if (e.stun !== undefined) e.stun = Math.max(e.stun || 0, 0.25);
      e.vx = (s.x - e.x) * 5; e.vy = Math.min(e.vy || 0, -90); e.onGround = false;
      if (Math.abs(e.x - s.x) < 18 && tickOnce(e, 'torf', 0.8)) {
        hit(o, e, 3, 'tornado', { noKnock: true });
        if (!e.dead) { e.vx = (Math.random() < 0.5 ? -1 : 1) * U.rand(280, 420); e.vy = -520; if (e.stun !== undefined) e.stun = 0.9; word(pick(['WHEEEEE!', 'AAAAH!', 'SPIN CYCLE!']), e.x, e.y - e.h - 6, { size: 16, color: '#e9fbff', stroke: INK, life: 0.7 }); }
      }
    });
    enemyShots((sh) => { if (Math.abs(sh.x - s.x) < 70 && sh.y > s.y - 170 && sh.y < s.y + 10) { sh.team = 'player'; sh.vx = f * 340; sh.vy = -80; word('NOPE!', sh.x, sh.y - 10, { size: 12, color: '#ffffff', life: 0.4 }); } });
  }
  function tornadoDraw(ctx, s) {
    const t = s.age, n = 8, H = 130;
    ctx.save(); ctx.lineJoin = 'round';
    for (let i = 0; i < n; i++) {
      const f = i / (n - 1), yy = s.y - f * H, ww = 22 + f * 70, ox = Math.sin(t * 10 + i * 1.2) * (6 + f * 8);
      ctx.beginPath(); ctx.ellipse(s.x + ox, yy, ww / 2, 8, 0, 0, TAU); ctx.fillStyle = i % 2 ? '#e9fbff' : '#a9e8d6'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    }
    ctx.fillStyle = '#6b6478'; for (let i = 0; i < 5; i++) { const a = t * 8 + i * 1.3, f = (i * 0.2 + t * 0.5) % 1; ctx.fillRect(s.x + Math.cos(a) * (30 + f * 30) - 2, s.y - f * H - 2, 5, 5); }
    ctx.restore();
  }

  // ============================================================================================ TIDAL WAVE (water)
  def('tidal', {
    name: 'TIDAL WAVE', themeId: 'water', icon: 'W', color: '#3fa0ff',
    use(o) {
      const f = o.facing || 1, x = o.x + f * 36, y = ground(x, o.y, 40, 200);
      superShot(o, x, y, f * 340, 0, { id: 'tidal', life: 2.7, f, update: tidalUpdate, draw: tidalDraw, r: 40 });
      nameWord(o, 'TIDAL WAVE!', '#e9fbff', '#1f6fd0'); sfx('splash', { x: o.x }); sfx('splash', { x: o.x, pitch: 0.6 });
      word('SPLOOOOSH!', o.x + f * 80, o.y - 30, { size: 28, color: '#bdeaff', stroke: INK, life: 0.9 });
    },
  });
  function tidalUpdate(s, dt) {
    const g = G(), o = s.owner, T = S.Terrain, f = s.f, F = FX();
    if (T && T.solidPx(s.x + f * 36, s.y - 30)) { if (F) F.debris(s.x, s.y - 30, 8, '#3bb4ff'); word('SPLASH!', s.x, s.y - 40, { size: 20, color: '#bdeaff', life: 0.6 }); s.dead = true; return; }
    s.x += s.vx * dt; const gy = ground(s.x, s.y, 70, 240); s.y += (gy - s.y) * Math.min(1, dt * 10);
    if (F && Math.random() < 0.7) F.add({ x: s.x + U.rand(-30, 30), y: s.y - U.rand(10, 80), vx: f * U.rand(40, 200), vy: U.rand(-220, -60), life: 0.5, kind: 'drop', size: U.rand(2, 4), color: '#bdeaff', g: 1 });
    foes((e) => {
      if (e.kind === 'pickup' || s.seen.has(e)) return;
      if (Math.abs(e.x - s.x) > e.w / 2 + 42 || e.y < s.y - 84 || e.y - e.h > s.y + 8) return;
      s.seen.add(e);
      if (isBoss(e)) { hit(o, e, 9, 'tidal', { noKnock: true }); word('SOAKED!', e.x, e.y - e.h - 10, { size: 18, color: '#bdeaff', stroke: INK }); if (F) F.shake(0.3); return; }
      hit(o, e, isFoe(e) ? 2.5 : 3, 'tidal', { noKnock: true });
      if (!e.dead && isFoe(e)) { e.vx = f * 320; e.vy = -280; e.onGround = false; if (e.stun !== undefined) e.stun = 0.9; e.burn = 0; word(pick(['GLUB!', 'SOGGY!', 'BLUB BLUB!']), e.x, e.y - e.h - 6, { size: 14, color: '#bdeaff', stroke: INK, life: 0.6 }); }
    });
    enemyShots((sh) => { if (Math.abs(sh.x - s.x) < 50 && sh.y > s.y - 90 && sh.y < s.y + 10) { sh.dead = true; if (F) F.debris(sh.x, sh.y, 2, '#3bb4ff'); } });
  }
  function tidalDraw(ctx, s) {
    const d = s.f, x = s.x, y = s.y, w = 96, h = 84, t = s.age, a = Math.min(1, s.life / 0.5);
    ctx.save(); ctx.globalAlpha = a; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x - d * w / 2, y); ctx.quadraticCurveTo(x - d * w * 0.15, y - h * 0.2, x + d * w * 0.05, y - h); ctx.quadraticCurveTo(x + d * w * 0.6, y - h * 0.98, x + d * w * 0.52, y - h * 0.5); ctx.quadraticCurveTo(x + d * w * 0.32, y - h * 0.58, x + d * w * 0.32, y - h * 0.3); ctx.lineTo(x + d * w * 0.5, y); ctx.closePath();
    ctx.fillStyle = '#3fa0ff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3.2; ctx.stroke();
    ctx.fillStyle = '#bdeaff'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x + d * (w * 0.15 - i * 14) + Math.sin(t * 9 + i) * 2, y - h * (0.7 - i * 0.12), 4 + (i % 2) * 2, 0, TAU); ctx.fill(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x - d * w * 0.3, y - 10); ctx.quadraticCurveTo(x - d * w * 0.1, y - h * 0.4, x + d * w * 0.1, y - h * 0.75); ctx.stroke();
    ctx.restore();
  }

  // ============================================================================================ MUD BOMB (mud)
  def('mudbomb', {
    name: 'MUD BOMB', themeId: 'mud', icon: 'M', color: '#a0703a',
    use(o) {
      const m = muz(o), d = dirOf(o);
      superShot(o, m.x, m.y, d.x * 310 + (o.vx || 0) * 0.4, d.y < 0 ? -560 : d.y > 0 ? 100 : -230, { id: 'mudbomb', grav: 1, life: 1.5, r: 6, burst: mudBurst, update: lobUpdate, draw: drawBomb, gcolor: '#7d5a38' });
      nameWord(o, 'MUD BOMB!', '#c9a070', '#4f3820'); sfx('throw', { x: o.x });
    },
  });
  function mudBurst(s) {
    const o = s.owner, g = G(), R = 95 * (o.blastMul || 1), x = s.x, y = s.y, F = FX(), T = S.Terrain;
    if (F) { F.debris(x, y, 12, '#7d5a38'); F.ring(x, y, R, '#a07c52'); F.shake(0.25); F.dust(x, y, 6); }
    bigWord('SPLORCH!', x, y - 28, '#c9a070', '#7d5a38'); sfx('splat', { x }); sfx('thoom', { x, vol: 0.4 });
    foes((e) => {
      if (!reach(e, x, y, R)) return;
      if (isBoss(e)) { hit(o, e, 6, 'mudbomb'); e.slowMul = Math.min(e.slowMul || 1, 0.6); e.slowT = 4; word('STUCK!', e.x, e.y - e.h - 10, { size: 16, color: '#c9a070', stroke: INK }); }
      else { hit(o, e, 1.5, 'mudbomb', { noKnock: true }); if (isFoe(e) && !e.dead) addStatus({ type: 'slow', e, k: 0.5, t: 4.5 }); }
    });
    superShot(o, x, ground(x, y, 10, 160), 0, 0, { id: 'mudbomb', life: 6, update: mudPuddleUpdate, draw: mudPuddleDraw });
    // mud platform: a little stepped mound of MUD tiles that dries up after a while
    if (T && T.W) {
      const p = g.player, tx0 = Math.floor(x / C.T); let ty = Math.floor(y / C.T), n = 0;
      while (n++ < 10 && !T.solid(tx0, ty + 1)) ty++;
      const rows = [[ty, 2], [ty - 1, 1]];
      for (const [row, half] of rows) for (let tx = tx0 - half; tx <= tx0 + half; tx++) {
        if (T.get(tx, row) !== 0 || T.solid(tx, row)) continue;
        const px = (tx + 0.5) * C.T;
        if (p && !p.dead && Math.abs(p.x - px) < 18 && p.y > row * C.T && p.y - 32 < (row + 1) * C.T) continue;
        let blocked = false; for (const e of g.ents) if (e.kind === 'enemy' && !e.dead && Math.abs(e.x - px) < e.w / 2 + 10 && e.y > row * C.T && e.y - e.h < (row + 1) * C.T) { blocked = true; break; }
        if (blocked) continue;
        T.set(tx, row, T.MAT.MUD); mudTiles.push({ tx, ty: row, t: 12 }); ensureDriver();
      }
    }
  }
  function mudPuddleUpdate(s, dt) {
    foes((e) => { if (isFoe(e) && Math.abs(e.x - s.x) < e.w / 2 + 40 && e.y > s.y - 10 && e.y - e.h < s.y + 8) addStatus({ type: 'slow', e, k: 0.5, t: 1.2 }); });
  }
  function mudPuddleDraw(ctx, s) {
    const a = Math.min(1, s.life / 0.8); ctx.save(); ctx.globalAlpha = a;
    ctx.beginPath(); ctx.ellipse(s.x, s.y - 3, 46, 6, 0, 0, TAU); ctx.fillStyle = '#7d5a38'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    ctx.fillStyle = '#a07c52'; ctx.beginPath(); ctx.ellipse(s.x - 12, s.y - 4, 10, 2.5, 0, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ============================================================================================ BANANA BOOMERANG (jungle)
  def('banana', {
    name: 'BANANA BOOMERANG', themeId: 'jungle', icon: 'B', color: '#ffe14d',
    use(o) {
      const m = muz(o), d = dirOf(o);
      superShot(o, m.x, m.y, d.x * 580, d.y * 580, { id: 'banana', life: 6, phase: 0, pt: 0, update: bananaUpdate, draw: bananaDraw, r: 10 });
      nameWord(o, 'BANANA BOOMERANG!', '#fff36b', '#a8761a'); sfx('whoosh', { x: o.x });
    },
  });
  function bananaUpdate(s, dt) {
    const g = G(), o = s.owner, T = S.Terrain;
    if (!g.player || g.player.dead || o.dead) { s.dead = true; return; }
    s.rot += dt * 18; s.pt += dt;
    if (s.phase === 0) { if (s.pt > 0.42 || (T && T.solidPx(s.x + s.vx * dt * 2, s.y + s.vy * dt * 2))) { s.phase = 1; s.seen.clear(); } }
    else {
      const tx = o.x, ty = o.y - 18, d = Math.hypot(tx - s.x, ty - s.y) || 1, sp = 640;
      s.vx += ((tx - s.x) / d * sp - s.vx) * Math.min(1, dt * 9); s.vy += ((ty - s.y) / d * sp - s.vy) * Math.min(1, dt * 9);
      if (d < 22) { s.dead = true; word('CATCH!', o.x, o.y - 50, { size: 16, color: '#fff36b', stroke: INK, life: 0.6 }); return; }
    }
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (FX() && Math.random() < 0.3) FX().add({ x: s.x, y: s.y, vx: 0, vy: 0, life: 0.25, kind: 'spark', color: '#fff36b', len: 4 });
    foes((e) => {
      if (e.kind === 'pickup' || s.seen.has(e) || !hitBox(e, s.x, s.y, 10)) return;
      s.seen.add(e);
      hit(o, e, isBoss(e) ? 3 : 2.2, 'banana', { noKnock: isBoss(e), knock: 200, dirX: U.sign(s.vx) || 1 });
      word(pick(['BONK!', 'THWACK!', 'BANANARANG!']), s.x, s.y - 14, { size: 16, color: '#fff36b', stroke: INK, life: 0.5 }); sfx('melee', { x: s.x, vol: 0.5 });
    });
    enemyShots((sh) => { if (Math.hypot(sh.x - s.x, sh.y - s.y) < 16) { sh.team = 'player'; sh.vx = -sh.vx * 1.2; sh.vy = -sh.vy * 1.2; } });
  }
  function bananaDraw(ctx, s) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-13, 6); ctx.quadraticCurveTo(0, -16, 13, 6); ctx.quadraticCurveTo(0, -5, -13, 6); ctx.closePath(); ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.fillStyle = '#6a4a22'; ctx.beginPath(); ctx.arc(-13, 6, 2.6, 0, TAU); ctx.arc(13, 6, 2.6, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ============================================================================================ BOULDER (mountain)
  def('boulder', {
    name: 'BOULDER', themeId: 'mountain', icon: 'R', color: '#c9bfb2',
    use(o) {
      const f = o.facing || 1;
      superShot(o, o.x + f * 30, o.y, f * 250, 0, { id: 'boulder', life: 5, f, w: 36, h: 36, grav: 1, stuck: 0, update: boulderUpdate, draw: boulderDraw, r: 18 });
      nameWord(o, 'BOULDER!', '#e9e1d6', '#5b5048'); sfx('thoom', { x: o.x }); word('RUMBLE RUMBLE', o.x + f * 60, o.y - 30, { size: 18, color: '#c9bfb2', stroke: INK, life: 0.9 });
    },
  });
  function boulderUpdate(s, dt) {
    const g = G(), o = s.owner, T = S.Terrain, f = s.f;
    const vx0 = f * 250 + (s.onGround ? 0 : 0);
    s.vx = vx0; S.Phys.move(s, dt);
    s.rot += f * 250 * dt / 18;
    if (s.fellOut) { s.dead = true; return; }
    if (FX() && s.onGround && Math.random() < 0.4) FX().dust(s.x - f * 14, s.y, 1);
    if (s.hitWall || (T && T.solidPx(s.x + f * 22, s.y - 18))) {
      let broke = false;
      for (let yy = s.y - 34; yy <= s.y - 4; yy += 10) { const tx = Math.floor((s.x + f * 22) / C.T), ty = Math.floor(yy / C.T); if (T.damageTile(tx, ty, 3, { boulder: true })) broke = true; }
      if (T.solidPx(s.x + f * 22, s.y - 18)) { s.stuck += dt; if (s.stuck > 0.3) { boulderBurst(s); return; } } else s.stuck = 0;
      void broke;
    } else s.stuck = 0;
    foes((e) => {
      if (e.kind === 'pickup' || s.seen.has(e)) return;
      if (Math.abs(e.x - s.x) > e.w / 2 + 20 || e.y < s.y - 40 || e.y - e.h > s.y + 4) return;
      s.seen.add(e);
      if (isBoss(e)) { hit(o, e, 7, 'boulder', { noKnock: true }); boulderBurst(s); return; }
      hit(o, e, isFoe(e) ? 6 : 4, 'boulder', { knock: 320, dirX: f, kind: 'blast' });
      word(pick(['SQUISH!', 'CRUNCH!', 'ROCK ON!']), e.x, e.y - e.h - 6, { size: 18, color: '#e9e1d6', stroke: INK, life: 0.6 }); if (FX()) { FX().shake(0.25); FX().hitstop(0.04); }
    });
    if (s.life <= 0) boulderBurst(s);
  }
  function boulderBurst(s) {
    if (s.dead) return; s.dead = true;
    const o = s.owner;
    if (FX()) FX().debris(s.x, s.y - 18, 14, '#a49bb0');
    G().explode(s.x, s.y - 18, 56 * (o.blastMul || 1), 3 * (o.dmgMul || 1), 'player', { owner: o, superId: 'boulder' });
  }
  function boulderDraw(ctx, s) {
    ctx.save(); ctx.translate(s.x, s.y - 18); ctx.rotate(s.rot); ctx.lineJoin = 'round';
    ctx.beginPath(); for (let i = 0; i < 9; i++) { const a = i * TAU / 9, r = 19 + ((i * 7) % 3) * 1.6; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = '#a49bb0'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = '#5c5970'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-10, -4); ctx.lineTo(0, 4); ctx.lineTo(8, -2); ctx.moveTo(0, 4); ctx.lineTo(2, 13); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(-8, -9, 5, 3, -0.5, 0, TAU); ctx.fill(); ctx.restore();
  }

  // ============================================================================================ COW LAUNCHER (plains)
  def('cow', {
    name: 'COW LAUNCHER', themeId: 'plains', icon: 'C', color: '#ffffff',
    use(o) {
      const m = muz(o), d = dirOf(o), f = o.facing || 1;
      superShot(o, m.x, m.y, d.x * 540 + (d.y ? f * 140 : 0), d.y < 0 ? -640 : d.y > 0 ? 160 : -380, { id: 'cow', grav: 0.55, life: 2.6, r: 34, moo: 0, f, burst: cowBurst, update: lobUpdate, draw: cowDraw, spin: 0, tick: (s, dt) => { s.moo -= dt; if (s.moo <= 0) { s.moo = 0.11; word(pick(['MOO', 'MOOO', 'MOOOO']), s.x - s.f * 16, s.y - 10, { size: 15, color: '#ffffff', stroke: INK, life: 0.5, vy: -10 }); } } });
      nameWord(o, 'MOOOOOOO!', '#ffffff', '#e8173a'); sfx('moo', { x: o.x }); sfx('rocket_launch', { x: o.x, vol: 0.5 });
    },
  });
  function cowBurst(s) {
    const o = s.owner, F = FX(), x = s.x, y = s.y;
    G().explode(x, y, 78 * (o.blastMul || 1), 10 * (o.dmgMul || 1), 'player', { owner: o, superId: 'cow', quiet: true });
    word('KA-MOO!!', x, y - 30, { size: 46, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#ffe14d', life: 1.2, vy: -20 });
    sfx('explode_big', { x }); sfx('moo', { x, pitch: 0.7 });
    if (F) { F.shake(0.55); F.hitstop(0.06); F.confetti(x, y, 10); for (let i = 0; i < 14; i++) F.add({ x, y, vx: U.rand(-260, 260), vy: U.rand(-380, -80), life: U.rand(0.5, 1), kind: 'drop', size: U.rand(2, 4), color: '#ffffff', g: 1 }); }
  }
  function cowDraw(ctx, s) {
    const f = s.vx >= 0 ? 1 : -1, t = s.age * 16;
    ctx.save(); ctx.translate(s.x, s.y); ctx.scale(f, 1); ctx.rotate(Math.atan2(s.vy, Math.abs(s.vx)) * 0.5); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 6; for (const [lx, ph] of [[-8, 0], [-3, 2], [4, 1], [9, 3]]) { ctx.beginPath(); ctx.moveTo(lx, 5); ctx.lineTo(lx + Math.sin(t + ph) * 5, 14 + Math.cos(t + ph) * 3); ctx.stroke(); }
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; for (const [lx, ph] of [[-8, 0], [-3, 2], [4, 1], [9, 3]]) { ctx.beginPath(); ctx.moveTo(lx, 5); ctx.lineTo(lx + Math.sin(t + ph) * 5, 14 + Math.cos(t + ph) * 3); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 10, 0, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(-5, -3, 5, 3.4, 0.3, 0, TAU); ctx.ellipse(5, 3, 4, 3, -0.2, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-16, -2); ctx.quadraticCurveTo(-22, -8, -20, -14); ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(18, -3, 8, 7, 0, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(22, 0, 5, 3.4, 0, 0, TAU); ctx.fillStyle = '#ff9ecf'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(16, -9); ctx.lineTo(14, -15); ctx.lineTo(19, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(17, -5, 2.4, 0, TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(18, -5, 1.2, 0, TAU); ctx.fill();
    ctx.restore();
  }

  // ============================================================================================ MAGIC MISSILES (fantasy)
  def('magic', {
    name: 'MAGIC MISSILES', themeId: 'fantasy', icon: 'Z', color: '#c08cff',
    use(o) {
      const m = muz(o), d = dirOf(o), base = Math.atan2(d.y || -0.5, d.x);
      for (let i = 0; i < 3; i++) {
        const a = base + (i - 1) * 0.6 + (d.y === 0 ? -0.3 : 0), sp = 320;
        superShot(o, m.x, m.y, Math.cos(a) * sp, Math.sin(a) * sp, { id: 'magic', life: 2.6, r: 7, trail: [], tt: 0, update: magicUpdate, draw: magicDraw });
      }
      nameWord(o, 'ABRA-KA-DOOSH!', '#e7d4ff', '#6a3fc4'); sfx('zap', { x: o.x });
    },
  });
  function magicUpdate(s, dt) {
    const g = G(), o = s.owner, T = S.Terrain;
    const tg = g.nearestEnemy(s.x, s.y, 'player', 700);
    let sp = Math.min(470, Math.hypot(s.vx, s.vy) + 500 * dt);
    if (tg && s.age > 0.12) {
      const want = Math.atan2(tg.y - tg.h / 2 - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx);
      let da = want - cur; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
      const na = cur + U.clamp(da, -6 * dt, 6 * dt); s.vx = Math.cos(na) * sp; s.vy = Math.sin(na) * sp;
    } else { const k = sp / (Math.hypot(s.vx, s.vy) || 1); s.vx *= k; s.vy *= k; }
    s.x += s.vx * dt; s.y += s.vy * dt;
    s.tt -= dt; if (s.tt <= 0) { s.tt = 0.03; s.trail.push({ x: s.x, y: s.y, a: 1 }); if (s.trail.length > 12) s.trail.shift(); }
    for (const q of s.trail) q.a -= dt * 3;
    const end = (hitE) => { s.dead = true; if (FX()) { FX().spark(s.x, s.y, 10, '#d9b8ff'); FX().ring(s.x, s.y, 24, '#c08cff'); FX().confetti(s.x, s.y, 3); } sfx('zap', { x: s.x, vol: 0.4 }); if (hitE) word(pick(['ZAP!', 'ZING!', 'POOF!']), s.x, s.y - 14, { size: 16, color: '#e7d4ff', stroke: '#6a3fc4', life: 0.5 }); };
    for (const e of g.hostiles('player')) {
      if (e.dead || e.kind === 'pickup') continue;
      if (hitBox(e, s.x, s.y, 8)) { hit(o, e, 2.7, 'magic', { noKnock: isBoss(e) }); end(true); return; }
    }
    if (T && T.solidPx(s.x, s.y)) end(false);
  }
  function magicDraw(ctx, s) {
    ctx.save();
    for (let i = 0; i < s.trail.length; i++) { const q = s.trail[i]; if (q.a <= 0) continue; ctx.globalAlpha = Math.min(1, q.a); FXstar(ctx, q.x, q.y, 3 + i * 0.3, i % 2 ? '#ffe14d' : '#d9b8ff', i); }
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, TAU); ctx.fillStyle = '#c08cff'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke();
    FXstar(ctx, s.x, s.y, 6, '#ffffff', s.age * 8); ctx.restore();
  }

  // ============================================================================================ GRAVITY BOMB (moon)
  def('gravity', {
    name: 'GRAVITY BOMB', themeId: 'moon', icon: 'G', color: '#8f96d8',
    use(o) {
      const m = muz(o), d = dirOf(o);
      superShot(o, m.x, m.y, d.x * 320 + (o.vx || 0) * 0.4, d.y < 0 ? -560 : d.y > 0 ? 100 : -240, { id: 'gravity', grav: 1, life: 1.4, r: 6, burst: gravBurst, update: lobUpdate, draw: drawBomb, gcolor: '#6a5fd0', gshape: 'grav' });
      nameWord(o, 'GRAVITY BOMB!', '#e0d8ff', '#3b3a90'); sfx('throw', { x: o.x });
    },
  });
  function gravBurst(s) {
    const o = s.owner, R = 135 * (o.blastMul || 1);
    bigWord('WHUMMMM!', s.x, s.y - 30, '#e0d8ff', '#6a5fd0'); sfx('boing', { x: s.x, pitch: 0.5 }); sfx('super', { x: s.x, vol: 0.5 });
    if (FX()) { FX().ring(s.x, s.y, R, '#c9b8ff'); FX().shake(0.3); }
    superShot(o, s.x, s.y, 0, 0, { id: 'gravity', life: 3.4, R, update: wellUpdate, draw: wellDraw });
  }
  function wellUpdate(s, dt) {
    const o = s.owner, R = s.R;
    foes((e) => {
      if (e.kind === 'pickup' || !reach(e, s.x, s.y, R)) return;
      if (isBoss(e)) { e.slowMul = Math.min(e.slowMul || 1, 0.55); e.slowT = Math.max(e.slowT || 0, 0.3); if (tickOnce(e, 'grav', 0.4)) hit(o, e, 1.0, 'gravity', { noKnock: true }); }
      else if (isFoe(e)) { if (!Status.find((q) => q.e === e && q.type === 'float')) { addStatus({ type: 'float', e, t: 2.4, well: s, owner: o, prevNoGrav: !!e.noGrav }); word(pick(['WHEEEE!', 'I\'M FLOATING!', 'MOM?!']), e.x, e.y - e.h - 6, { size: 16, color: '#e0d8ff', stroke: '#3b3a90', life: 0.8 }); } }
    });
    enemyShots((sh) => { const d = Math.hypot(sh.x - s.x, sh.y - s.y); if (d < R) { sh.vx *= 1 - dt * 3; sh.vy *= 1 - dt * 3; sh.x += (s.x - sh.x) * dt * 2; sh.y += (s.y - sh.y) * dt * 2; } });
  }
  function wellDraw(ctx, s) {
    const R = s.R, t = s.age, a = Math.min(1, s.life / 0.6, s.age / 0.2);
    ctx.save(); ctx.globalAlpha = a * 0.9; ctx.translate(s.x, s.y);
    const gr = ctx.createRadialGradient(0, 0, 4, 0, 0, R); gr.addColorStop(0, 'rgba(40,20,90,0.55)'); gr.addColorStop(1, 'rgba(120,100,230,0.05)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9b8ff'; ctx.lineWidth = 2.4; ctx.setLineDash([10, 8]); for (let i = 0; i < 3; i++) { ctx.lineDashOffset = -t * (30 + i * 18) * (i % 2 ? -1 : 1); ctx.beginPath(); ctx.arc(0, 0, R * (0.35 + i * 0.28), 0, TAU); ctx.stroke(); }
    ctx.setLineDash([]); for (let i = 0; i < 6; i++) { const f = ((t * 0.6 + i / 6) % 1), a2 = i * 1.1 + t * 2; FXstar(ctx, Math.cos(a2) * R * (1 - f), Math.sin(a2) * R * (1 - f) * 0.8, 4, '#ffffff', a2); }
    ctx.restore();
  }

  // ============================================================================================ PIXEL BOMB (retro)
  def('pixel', {
    name: 'PIXEL BOMB', themeId: 'retro', icon: 'P', color: '#ff6ae0',
    use(o) {
      const m = muz(o), d = dirOf(o);
      superShot(o, m.x, m.y, d.x * 320 + (o.vx || 0) * 0.4, d.y < 0 ? -560 : d.y > 0 ? 100 : -240, { id: 'pixel', grav: 1, life: 1.3, r: 6, burst: pixelBurst, update: lobUpdate, draw: drawBomb, gcolor: '#ff6ae0', gshape: 'square' });
      nameWord(o, 'PIXEL BOMB!', '#ffffff', '#ff6ae0'); sfx('pixel_blip', { x: o.x });
    },
  });
  function pixelBurst(s) {
    const o = s.owner, R = 125 * (o.blastMul || 1), x = s.x, y = s.y;
    bigWord('8-BIT!', x, y - 28, '#ffffff', '#ff6ae0'); sfx('pixel_blip', { x }); sfx('super', { x, vol: 0.5, pitch: 1.4 });
    if (FX()) { FX().shake(0.25); FX().ring(x, y, R, '#6aeaff'); }
    cubes(x, y, 12);
    superShot(o, x, y, 0, 0, { id: 'pixel', life: 0.55, R, update: () => {}, draw: pixelRingDraw });
    foes((e) => {
      if (e.kind === 'pickup' || !reach(e, x, y, R)) return;
      if (isBoss(e)) { hit(o, e, 3, 'pixel', { noKnock: true }); e.glitchT = 3; e.slowMul = Math.min(e.slowMul || 1, 0.85); e.slowT = 3; addStatus({ type: 'bosspix', e, owner: o, n: 3, t: 2, tt: 0.5 }); word('GLITCHED!', e.x, e.y - e.h - 10, { size: 18, color: '#ff6ae0', stroke: INK }); }
      else if (isFoe(e)) addStatus({ type: 'pixel', e, owner: o, t: 1.25, x0: e.x });
      else hit(o, e, 3, 'pixel');
    });
    enemyShots((sh) => { if (Math.hypot(sh.x - x, sh.y - y) < R) { sh.dead = true; cubes(sh.x, sh.y, 3); } });
  }
  function pixelRingDraw(ctx, s) {
    const k = 1 - s.life / 0.55, R = s.R * Math.min(1, k * 1.6), cs = 12; ctx.save(); ctx.globalAlpha = 1 - k;
    for (let a = 0; a < 40; a++) { const ang = a * TAU / 40, gx = Math.round((s.x + Math.cos(ang) * R) / cs) * cs, gy = Math.round((s.y + Math.sin(ang) * R) / cs) * cs; ctx.fillStyle = a % 3 ? '#ff6ae0' : '#6aeaff'; ctx.fillRect(gx - cs / 2, gy - cs / 2, cs - 1, cs - 1); }
    ctx.restore();
  }

  S.Supers._status = Status;
})();
