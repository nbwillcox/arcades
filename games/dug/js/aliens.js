/* Aliens: tunnel chasers with ghost-phasing, fire-breathing drakes, rock-eating burrowers, spitters and the queen boss. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, FX = G.fx, GFX = G.gfx, A = G.audio, L = G.level, TAU = U.TAU;
  const Al = {};
  G.aliens = Al;
  const CELL = C.CELL, COLS = C.COLS, ROWS = C.ROWS;
  const cx = (c) => c * CELL + CELL / 2, cy = (r) => C.GY0 + r * CELL + CELL / 2;
  Al.cx = cx; Al.cy = cy;
  const cc = (x) => Math.floor(x / CELL), cr = (y) => Math.floor((y - C.GY0) / CELL);
  Al.cc = cc; Al.cr = cr;
  const BASE = { blob: 62, drake: 58, burrower: 54, spitter: 48 };
  const PTS = { blob: 1, drake: 1.5, burrower: 1.3, spitter: 1.3 };
  Al.PTS = PTS;
  let nextId = 1;

  Al.spawn = function (g, type, c, r) {
    const e = { id: nextId++, type, x: cx(c), y: cy(r), c, r, mv: null, dir: Math.random() < 0.5 ? 'l' : 'r', pump: 0, attached: false, ghost: false, ghostT: 0, ghostCd: U.rand(6, 11), stuck: 0, rp: U.rand(0, 0.3), step: null, cd: U.rand(1, 3), flame: null, digT: 0, flash: 0, t: 0, dead: false, boss: false, r0: 13 };
    g.al.push(e);
    return e;
  };
  Al.spawnQueen = function (g, c, r) {
    const e = Al.spawn(g, 'queen', c, r);
    Object.assign(e, { boss: true, r0: 52, popAt: 16, spawnCd: 6, spitCd: 4, px: 0, dirx: 1 });
    return e;
  };
  Al.speed = (g, e) => {
    const alive = g.al.filter((a) => !a.dead && !a.boss).length;
    return (BASE[e.type] || 40) * Math.min(1.9, 1 + 0.035 * (g.level - 1)) * (alive === 1 && !g.boss ? 1.4 : 1);
  };

  /* breadth-first search over open cells from an alien to the player; returns the first step or null */
  const seen = new Int16Array(COLS * ROWS), qc = new Int16Array(COLS * ROWS), qr = new Int16Array(COLS * ROWS), par = new Int16Array(COLS * ROWS);
  let stamp = 0;
  const seenS = new Int32Array(COLS * ROWS);
  Al.step = function (g, c0, r0, c1, r1) {
    if (c0 === c1 && r0 === r1) return null;
    stamp++;
    let h = 0, t = 0;
    qc[t] = c0; qr[t] = r0; t++; seenS[r0 * COLS + c0] = stamp; par[r0 * COLS + c0] = -1;
    const D = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    while (h < t) {
      const c = qc[h], r = qr[h]; h++;
      for (const d of D) {
        const nc = c + d[0], nr = r + d[1], i = nr * COLS + nc;
        if (nc < 0 || nr < 0 || nc >= COLS || nr >= ROWS || seenS[i] === stamp) continue;
        if (!g.open(nc, nr) && !(nc === c1 && nr === r1)) continue;
        seenS[i] = stamp; par[i] = r * COLS + c; qc[t] = nc; qr[t] = nr; t++;
        if (nc === c1 && nr === r1) {
          let k = i, prev = i;
          while (par[k] !== -1) { prev = k; k = par[k]; }
          return { c: prev % COLS, r: Math.floor(prev / COLS) };
        }
      }
    }
    return null;
  };

  function clearLine(g, c0, c1, r) { const a = Math.min(c0, c1), b = Math.max(c0, c1); for (let c = a + 1; c < b; c++) if (!g.open(c, r)) return false; return true; }
  function clearCol(g, r0, r1, c) { const a = Math.min(r0, r1), b = Math.max(r0, r1); for (let r = a + 1; r < b; r++) if (!g.open(c, r)) return false; return true; }
  function walk(e, sp, dt) {
    const m = e.mv, dx = m.tx - e.x, dy = m.ty - e.y, d = Math.hypot(dx, dy), s = sp * dt;
    if (d <= s) { e.x = m.tx; e.y = m.ty; e.c = cc(e.x); e.r = cr(e.y); e.mv = null; } else { e.x += dx / d * s; e.y += dy / d * s; }
  }
  const DIRN = (dc, dr) => (dc > 0 ? 'r' : dc < 0 ? 'l' : dr > 0 ? 'd' : 'u');

  Al.update = function (g, dt) {
    const p = g.player, pc = g.pc, alive = p.alive;
    for (const e of g.al) {
      if (e.dead) continue;
      e.t += dt; if (e.flash > 0) e.flash -= dt;
      if (e.boss) { updateQueen(g, e, dt); continue; }
      if (e.pump > 0) { if (!e.attached) { e.pump = Math.max(0, e.pump - dt / 0.55); } e.flame = null; continue; }
      const sp = Al.speed(g, e);
      if (e.ghost) {
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        e.x += dx / d * sp * 1.2 * dt; e.y += dy / d * sp * 1.2 * dt; e.ghostT += dt;
        if (e.ghostT > 1.0 && g.open(cc(e.x), cr(e.y))) { e.c = cc(e.x); e.r = cr(e.y); e.x = cx(e.c); e.y = cy(e.r); e.ghost = false; e.ghostCd = U.rand(8, 13); e.stuck = 0; }
        continue;
      }
      if (e.type === 'drake' && e.flame) {
        const f = e.flame; f.t += dt;
        if (f.state === 'wind' && f.t > 0.5) { f.state = 'burn'; f.t = 0; A.sfx.flame(); }
        else if (f.state === 'burn') {
          let reach = 0; const step = e.dir === 'r' ? 1 : -1;
          while (reach < 3 && g.open(e.c + step * (reach + 1), e.r)) reach++;
          f.reach = reach; f.step = step;
          if (alive && Math.abs(p.y - e.y) < 14 && (p.x - e.x) * step > 6 && (p.x - e.x) * step < reach * CELL + 18) g.killPlayer('flame');
          if (f.t > 0.45) { e.flame = null; e.cd = U.rand(2.6, 4); }
        }
        continue;
      }
      e.cd -= dt;
      if (!e.mv) {
        if (e.type === 'drake' && e.cd <= 0 && alive && e.r === pc.r && Math.abs(pc.c - e.c) <= 3 && Math.abs(pc.c - e.c) >= 1 && clearLine(g, e.c, pc.c, e.r)) { e.dir = pc.c > e.c ? 'r' : 'l'; e.flame = { state: 'wind', t: 0 }; continue; }
        if (e.type === 'spitter' && alive) {
          const alignR = e.r === pc.r && clearLine(g, e.c, pc.c, e.r), alignC = e.c === pc.c && clearCol(g, e.r, pc.r, e.c), dist = Math.abs(pc.c - e.c) + Math.abs(pc.r - e.r);
          if ((alignR || alignC) && dist >= 2 && dist <= 8) {
            e.dir = alignR ? (pc.c > e.c ? 'r' : 'l') : (pc.r > e.r ? 'd' : 'u');
            if (e.cd <= 0) { e.cd = 2.3; const vx = alignR ? (pc.c > e.c ? 1 : -1) : 0, vy = alignC ? (pc.r > e.r ? 1 : -1) : 0; g.projs.push({ x: e.x, y: e.y, vx: vx * 170, vy: vy * 170, life: 3, kind: 'spit' }); A.sfx.enemyShot(); }
            continue;
          }
        }
        e.ghostCd -= dt;
        const nxt = Al.step(g, e.c, e.r, pc.c, pc.r);
        if (nxt) { e.mv = { tx: cx(nxt.c), ty: cy(nxt.r) }; e.dir = DIRN(nxt.c - e.c, nxt.r - e.r); e.stuck = 0; }
        else if (e.type === 'burrower') {
          const dc = pc.c - e.c, dr = pc.r - e.r, horiz = Math.abs(dc) >= Math.abs(dr), nc = e.c + (horiz ? Math.sign(dc) : 0), nr = e.r + (horiz ? 0 : Math.sign(dr));
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && (nc !== e.c || nr !== e.r) && g.kind[L.idx(nc, nr)] !== L.KIND.LAVA && !g.rockAt(nc, nr)) {
            e.dir = DIRN(nc - e.c, nr - e.r); e.digT += dt;
            if (e.digT > 0.55) { e.digT = 0; g.digCell(nc, nr, false); e.mv = { tx: cx(nc), ty: cy(nr) }; }
          }
        } else { e.stuck += dt; if (e.stuck > 1.1 && alive) { e.ghost = true; e.ghostT = 0; } }
        if (e.ghostCd <= 0 && !e.mv && alive && Math.abs(pc.c - e.c) + Math.abs(pc.r - e.r) > 5 && e.type !== 'burrower') { e.ghost = true; e.ghostT = 0; }
      }
      if (e.mv) walk(e, e.type === 'burrower' && !g.open(cc(e.mv.tx), cr(e.mv.ty)) ? sp * 0.8 : sp, dt);
    }
    // touching an alien that is not inflated is fatal
    if (alive) for (const e of g.al) { if (e.dead || e.pump > 0) continue; if (Math.hypot(e.x - p.x, e.y - p.y) < (e.boss ? e.r0 : 18) + 4) { g.killPlayer('alien'); break; } }
    g.al = g.al.filter((e) => !e.dead);
  };

  function updateQueen(g, e, dt) {
    if (e.pump > 0) { if (!e.attached) e.pump = Math.max(0, e.pump - dt / 1.0); return; }
    const lo = cx(4) + 60, hi = cx(13) - 60;
    e.x += e.dirx * 38 * dt; if (e.x > hi) e.dirx = -1; else if (e.x < lo) e.dirx = 1;
    e.y = cy(16) + Math.sin(e.t * 1.2) * 14;
    e.spitCd -= dt; e.spawnCd -= dt;
    const p = g.player;
    if (e.spitCd <= 0 && p.alive) {
      e.spitCd = 4.2; const a0 = Math.atan2(p.y - e.y, p.x - e.x);
      for (let k = -1; k <= 1; k++) g.projs.push({ x: e.x, y: e.y + 20, vx: Math.cos(a0 + k * 0.38) * 150, vy: Math.sin(a0 + k * 0.38) * 150, life: 4, kind: 'acid' });
      A.sfx.enemyShot();
    }
    if (e.spawnCd <= 0) { e.spawnCd = 8; if (g.al.filter((a) => a.type === 'blob' && !a.dead).length < 3) { const b = Al.spawn(g, 'blob', cc(e.x), cr(e.y + 40)); b.ghost = false; A.sfx.spawnBot(); FX.ring(e.x, e.y + 40, 6, 40, 'hsla(320,100%,70%,1)', 0.4, 2); } }
  }

  Al.updateProjs = function (g, dt) {
    const p = g.player;
    for (const b of g.projs) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      const c = cc(b.x), r = cr(b.y);
      if (b.life <= 0 || c < 0 || r < 0 || c >= COLS || r >= ROWS || (b.kind === 'spit' && !g.open(c, r)) || (b.kind === 'acid' && g.dirt[L.idx(c, r)] && !g.open(c, r) && r > 0)) { b.dead = true; continue; }
      if (p.alive && Math.hypot(b.x - p.x, b.y - p.y) < 14) { b.dead = true; g.killPlayer('spit'); }
    }
    g.projs = g.projs.filter((b) => !b.dead);
  };

  /* ---------- inflating and popping ---------- */
  Al.pump = function (g, e) {
    e.pump += 1; e.flash = 0.08; A.sfx.pump(e.pump);
    FX.sparks(e.x, e.y, 3, 90, 'hsla(190,100%,75%,1)', 0.2, 1.2);
    if (e.pump >= (e.popAt || C.PUMP_STAGES)) Al.pop(g, e, false);
  };
  Al.pop = function (g, e, crushed) {
    if (e.dead) return;
    e.dead = true; e.attached = false;
    const layer = L.layerOf(Math.max(1, cr(e.y)));
    FX.explosion(e.x, e.y, e.boss ? 4 : 1.1, e.type === 'drake' ? 110 : e.type === 'burrower' ? 28 : e.type === 'spitter' ? 170 : 320);
    A.sfx.pop();
    if (e.boss) { g.award(10000 + g.level * 500, e.x, e.y); FX.doFlash(0.5, '255,230,230'); FX.addShake(10); A.sfx.boom(); }
    else if (!crushed) g.award(Math.round([200, 300, 400, 500][layer] * (PTS[e.type] || 1)), e.x, e.y);
    g.onAlienDown(e);
  };

  /* ---------- drawing ---------- */
  function drawQueen(ctx, e) {
    const x = e.x, y = e.y, s = 1 + 0.3 * (e.pump / (e.popAt || 16)) + Math.sin(e.t * 3) * 0.015, fl = e.flash > 0;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.fillStyle = GFX.rg(ctx, -14, -18, 6, 70, fl ? [[0, '#ffffff'], [1, '#ffd0ec']] : [[0, '#ffd0f4'], [0.4, '#e0409c'], [1, '#3a0830']]);
    ctx.beginPath(); ctx.ellipse(0, 0, 58, 46, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,150,220,0.9)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = 'rgba(60,0,40,0.5)'; ctx.lineWidth = 2; for (let i = -3; i <= 3; i++) { ctx.beginPath(); ctx.moveTo(i * 14, -34); ctx.quadraticCurveTo(i * 18, 0, i * 14, 34); ctx.stroke(); }
    ctx.fillStyle = '#ffd24a'; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 18 - 6, -42); ctx.lineTo(i * 18, -58 + Math.abs(i) * 4); ctx.lineTo(i * 18 + 6, -42); ctx.fill(); }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-20, -6, 13, 11, 0, 0, TAU); ctx.ellipse(20, -6, 13, 11, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a0828'; ctx.beginPath(); ctx.arc(-17, -5, 6, 0, TAU); ctx.arc(23, -5, 6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a0212'; ctx.beginPath(); ctx.ellipse(0, 22, 20, 8, 0, 0, TAU); ctx.fill();
    ctx.restore();
    const k = e.pump / (e.popAt || 16); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 40, y - 74, 80, 6); ctx.fillStyle = '#7dffe0'; ctx.fillRect(x - 40, y - 74, 80 * Math.min(1, k), 6);
  }
  Al.draw = function (ctx, g) {
    const spr = GFX.spr;
    for (const e of g.al) {
      if (e.boss) { drawQueen(ctx, e); continue; }
      if (e.dir === 'l') e.fx = -1; else if (e.dir === 'r') e.fx = 1;
      const s = spr[e.type], inf = 1 + 0.3 * e.pump, wob = e.pump > 0 ? Math.sin(e.t * 22) * 0.04 : 0;
      if (e.ghost) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(300,100%,65%,1)', e.x, e.y, 22, 0.45); ctx.globalCompositeOperation = 'source-over'; }
      GFX.draw(ctx, e.flash > 0 ? spr.flash[e.type] : s, e.x, e.y, 0, (e.fx || 1) * (inf + wob), inf - wob, e.ghost ? 0.5 : 1);
      if (e.flame) {
        const f = e.flame, st = e.dir === 'r' ? 1 : -1;
        if (f.state === 'wind') { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(25,100%,60%,1)', e.x + st * 18, e.y, 12 + f.t * 20, 0.4 + f.t); ctx.globalCompositeOperation = 'source-over'; }
        else {
          const len = (f.reach || 0) * CELL + 14;
          ctx.globalCompositeOperation = 'lighter';
          for (const [w, c] of [[24, 'rgba(255,90,20,0.45)'], [13, 'rgba(255,200,60,0.85)'], [5, 'rgba(255,255,230,0.95)']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(e.x + st * 14, e.y); ctx.lineTo(e.x + st * (14 + len), e.y + Math.sin(e.t * 40) * 2); ctx.stroke(); }
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    }
    for (const b of g.projs) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, b.kind === 'acid' ? 'hsla(320,100%,60%,1)' : 'hsla(160,100%,60%,1)', b.x, b.y, 14, 0.5); ctx.globalCompositeOperation = 'source-over'; GFX.draw(ctx, spr.spit, b.x, b.y, 0, 1, 1); }
  };
})((window.SGS = window.SGS || {}));
