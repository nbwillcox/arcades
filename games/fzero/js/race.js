/* The race itself: starting grid and countdown, the player's hover physics, 19 AI rivals with rubber-banding, hazards, laps, energy, finish. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U, PX = G.px, TAU = Math.PI * 2, STEP = 1 / 120;
  const R = {};
  G.race = R;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const angDiff = (a, b) => { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return d; };
  R.DIFF = [{ name: 'NOVICE', ai: 0.96, rubber: 0.10, cut: 10 }, { name: 'STANDARD', ai: 1.06, rubber: 0.09, cut: 8 }, { name: 'EXPERT', ai: 1.16, rubber: 0.08, cut: 6 }];
  R.BASE = 190;
  R.POINTS = [20, 17, 15, 13, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0];
  const NAMES = ['RAZOR', 'NOVA', 'ZEPHYR', 'KAIJU', 'ORION', 'VIPER', 'COMET', 'BLAZE', 'TITAN', 'ECHO', 'FURY', 'GHOST', 'HELIX', 'JOLT', 'KRAKEN', 'LYNX', 'MAKO', 'NEXUS', 'ONYX', 'SABER'];
  R.NAMES = NAMES;
  const A = () => G.audio;
  const snd = (n, a, b) => { const au = A(); if (au && au.sfx && au.sfx[n]) au.sfx[n](a, b); };

  /* opt: { track, machine, mode: 'gp' | 'tt', diff, order (array of ids for grid slots, 'P' = player) } */
  R.start = function (opt) {
    const tr = G.tracks.build(opt.track), M = G.ships.TYPES[opt.machine];
    R.opt = opt; R.tr = tr; R.mach = M; R.diff = R.DIFF[opt.diff || 1]; R.tt = opt.mode === 'tt';
    R.laps = tr.laps; R.time = 0; R.state = 'loading'; R.cd = 0; R.shake = 0; R.banner = null; R.events = [];
    R.paint = G.trackgen.paint(tr);
    G.m7.setTrack(R.paint.tex, PX.rgb(R.paint.world.fog), PX.rgb(R.paint.world.void));
    R.pano = G.sky.build(tr.world, G.m7.F, G.m7.yh + 1);
    R.plantProps();
    // racers
    const order = opt.order || ['P'].concat(Array.from({ length: 19 }, (_, i) => i)), rnd = PX.rng(opt.track * 977 + (opt.diff || 1) * 31 + 5), skills = [];
    for (let i = 0; i < 19; i++) skills.push(1 - (i / 18) * 0.15 + (rnd() - 0.5) * 0.012);
    for (let i = skills.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [skills[i], skills[j]] = [skills[j], skills[i]]; }
    R.racers = [];
    const slots = R.tt ? ['P'] : order;
    slots.forEach((id, k) => {
      const sl = G.tracks.slot(tr, k), isP = id === 'P', ai = isP ? null : id, type = isP ? opt.machine : (ai * 3 + 1) % 4;
      const q = { id, isP, name: isP ? 'YOU' : NAMES[ai], type, hue: isP ? M.hue : (ai * 47 + 20) % 360, prog: sl.s, d: sl.d, v: 0, lap: 1, finished: false, finishT: 0, lapStart: 0, lapTimes: [], x: 0, y: 0, ang: 0, bank: 1, skill: isP ? 1 : skills[ai], dT: sl.d, laneT: 2 + rnd() * 3, lean: 0 };
      q.set = G.ships.set(q.type, q.hue);
      const p = tr.at(q.prog, q.d); q.x = p.x; q.y = p.y; q.ang = p.ang;
      R.racers.push(q);
    });
    R.P = R.racers.find((q) => q.isP);
    const P = R.P;
    Object.assign(P, { vx: 0, vy: 0, z: 0, vz: 0, energy: 100, boostT: 0, dashCd: 0, mineCd: 0, hint: -1, s: ((P.prog % tr.L) + tr.L) % tr.L, lastS: ((P.prog % tr.L) + tr.L) % tr.L, dd: P.d, wrong: 0, dead: false, deadT: 0, auto: false, slideT: 0, crossed: false, rank: R.racers.length, spdShow: 0, boostOn: false, wallT: 0 });
    R.cam = { x: P.x, y: P.y, ang: P.ang, h: 36, swing: 0 };
    R.ghost = R.tt ? R.loadGhost() : null;
    R.rec = []; R.recT = 0; R.ghostT = -1; R.bestLap = null;
    R.state = 'countdown'; R.cd = 3.9; R.lastCd = 4; R.done = false; R.retired = false; R.newGhost = false; R.fin = 0; R.camT = 0; R.rankAll();
    snd('countdown', 0);
  };
  R.plantProps = function () {
    const tr = R.tr, set = G.props.set(tr.world), rnd = PX.rng(tr.id * 313 + 17); R.props = [];
    for (let s = 90; s < tr.L - 40; s += 64 + rnd() * 70) for (const side of [-1, 1]) {
      if (rnd() < 0.3) continue;
      const k = Math.floor(rnd() * set.length), dd = side * (tr.half + 22 + rnd() * 46), p = tr.at(s + rnd() * 30, dd);
      R.props.push({ x: p.x, y: p.y, k, spr: set[k] });
    }
  };
  R.loadGhost = function () { const g = G.records.ghosts[R.tr.id]; return g && g.d ? g : null; };
  R.ev = (name, data) => R.events.push({ name, data });

  /* feature interaction: returns the ground effects at the player's spot */
  function features(P, tr, dt) {
    const fx = { rough: false, ice: false };
    if (P.dashCd > 0) P.dashCd -= dt;
    if (P.mineCd > 0) P.mineCd -= dt;
    for (const f of tr.feats) {
      let ds = P.s - (f.s + f.l / 2); if (ds > tr.L / 2) ds -= tr.L; else if (ds < -tr.L / 2) ds += tr.L;
      if (Math.abs(ds) > f.l / 2 + 6) continue;
      const dd = P.d - f.d;
      if (Math.abs(dd) > f.w / 2 + 4) continue;
      if (f.k === 'dash') { if (P.dashCd <= 0 && P.z <= 0) { P.dashCd = 0.5; P.boostT = Math.max(P.boostT, 1.2); const sp = P.vx * Math.cos(P.ang) + P.vy * Math.sin(P.ang), tgt = R.mach.vmax * 1.3; if (sp < tgt) { P.vx += Math.cos(P.ang) * (tgt - sp); P.vy += Math.sin(P.ang) * (tgt - sp); } snd('dash'); R.ev('dash'); } }
      else if (f.k === 'jump') { if (P.z <= 0 && P.vz <= 0 && P.vx * Math.cos(P.ang) + P.vy * Math.sin(P.ang) > 60) { P.vz = 130 + 0.28 * Math.hypot(P.vx, P.vy); P.z = 0.01; snd('jump'); R.ev('jump'); } }
      else if (f.k === 'mine') { if (P.mineCd <= 0 && P.z <= 2) { P.mineCd = 1.2; P.energy -= 12; P.vx *= 0.45; P.vy *= 0.45; P.ang += (Math.random() < 0.5 ? -1 : 1) * 0.6; R.shake = Math.max(R.shake, 9); snd('mine'); R.ev('mine'); } }
      else if (f.k === 'rough') fx.rough = true;
      else if (f.k === 'ice') fx.ice = true;
      else if (f.k === 'rec') { if (P.energy < 100) { P.energy = Math.min(100, P.energy + 55 * dt); R.ev('rec'); } }
    }
    return fx;
  }
  R.updatePlayer = function (dt, inp) {
    const P = R.P, M = R.mach, tr = R.tr, racing = R.state === 'race';
    if (P.dead) { P.deadT += dt; return; }
    const grounded = P.z <= 0 && P.vz <= 0, fxs = features(P, tr, dt);
    const c = Math.cos(P.ang), s = Math.sin(P.ang);
    let vf = P.vx * c + P.vy * s, vl = -P.vx * s + P.vy * c;
    const wantBoost = racing && inp.boost && P.energy > 6 && vf > 20;
    if (wantBoost) { P.energy = Math.max(5, P.energy - 15 * dt); P.boostT = Math.max(P.boostT, 0.2); }
    P.boostOn = P.boostT > 0;
    if (P.boostT > 0) P.boostT -= dt;
    const vmax = M.vmax * (P.boostT > 0 ? 1.36 : 1);
    if (racing && inp.accel) vf += M.acc * 1.9 * (P.boostT > 0 ? 2.2 : 1) * clamp(1 - vf / vmax, 0, 1) * dt; else vf -= vf * 0.3 * dt;
    if (vf > vmax) vf -= (vf - vmax) * 1.8 * dt;
    if (racing && inp.brake) vf = Math.max(-45, vf - (vf > 0 ? 260 : 100) * dt);
    if (fxs.rough) vf -= vf * 1.9 * dt;
    // steering and side-slide
    const sp = clamp(Math.abs(vf) / M.vmax, 0, 1.4), slide = (racing ? (inp.slideR ? 1 : 0) - (inp.slideL ? 1 : 0) : 0);
    let turn = (racing ? inp.steer : 0) * M.turn * 1.45 * (0.4 + 1.0 * sp) * (1.15 - 0.45 * sp * sp);
    if (slide && grounded) turn += slide * M.turn * 1.0 * (0.4 + sp);
    if (!grounded) turn *= 0.3;
    if (fxs.ice) turn *= 0.75;
    P.ang += turn * dt * (vf >= -5 ? 1 : -1);
    P.slideT = slide && grounded && sp > 0.35 ? P.slideT + dt : 0;
    const grip = M.grip * (slide ? 0.32 : 1) * (fxs.ice ? 0.14 : 1) * (grounded ? 1 : 0.05);
    vl *= Math.exp(-grip * dt);
    const c2 = Math.cos(P.ang), s2 = Math.sin(P.ang);
    P.vx = c2 * vf - s2 * vl; P.vy = s2 * vf + c2 * vl;
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (P.z > 0 || P.vz > 0) { P.vz -= 520 * dt; P.z += P.vz * dt; if (P.z <= 0) { P.z = 0; P.vz = 0; snd('land'); R.shake = Math.max(R.shake, 4); } }
    // track relation, rails
    const n = tr.nearest(P.x, P.y, P.hint); P.hint = n.i; P.s = n.s; P.d = n.d;
    let ds = n.s - P.lastS; if (ds > tr.L / 2) ds -= tr.L; else if (ds < -tr.L / 2) ds += tr.L;
    P.lastS = n.s; const prev = P.prog; P.prog += ds;
    const lim = tr.half - 5.5;
    if (Math.abs(P.d) > lim) {
      const sg = Math.sign(P.d), nx = tr.nx[n.i] * sg, ny = tr.ny[n.i] * sg, over = Math.abs(P.d) - lim;
      P.x -= nx * over; P.y -= ny * over; P.d = sg * lim;
      const vn = P.vx * nx + P.vy * ny;
      if (vn > 0) {
        P.vx -= 1.45 * vn * nx; P.vy -= 1.45 * vn * ny; P.vx *= 0.9; P.vy *= 0.9;
        if (vn > 12 && P.wallT <= 0) { P.energy -= vn * 0.1 / M.body; P.wallT = 0.25; R.shake = Math.max(R.shake, Math.min(10, vn * 0.05)); snd('wall', Math.min(1, vn / 100)); R.ev('wall', { vn }); }
      }
      P.vx *= 1 - 0.7 * dt; P.vy *= 1 - 0.7 * dt;
    }
    if (P.wallT > 0) P.wallT -= dt;
    // heading against the track
    const tang = Math.atan2(tr.ty[n.i], tr.tx[n.i]);
    P.wrong = Math.abs(angDiff(P.ang, tang)) > 2.2 && Math.hypot(P.vx, P.vy) > 25 ? P.wrong + dt : 0;
    P.spdShow = Math.hypot(P.vx, P.vy);
    if (P.energy <= 0 && racing) { P.dead = true; P.deadT = 0; R.shake = 16; snd('boom'); R.ev('dead'); }
    return { prev, now: P.prog };
  };

  /* ---------- rivals ---------- */
  R.updateAI = function (q, dt) {
    const tr = R.tr, L = tr.L, racing = R.state === 'race' || R.state === 'finish', s = ((q.prog % L) + L) % L;
    let kappa = 0; for (let k = 1; k <= 4; k++) kappa = Math.max(kappa, Math.abs(tr.curv(s + k * 35)));
    const gap = R.P.prog - q.prog;
    let rb = 1; if (gap > 300) rb += Math.min(R.diff.rubber, 0.02 + (gap - 300) / 9000); else if (gap < -450) rb -= Math.min(R.diff.rubber * 1.4, (-gap - 450) / 7000);
    let vt = R.BASE * R.diff.ai * q.skill * (1 - clamp(kappa * 10, 0, 0.4)) * rb;
    if (q.isP) vt = 105; else if (q.finished) vt = 130;
    if (!racing) vt = 0;
    q.v += (vt - q.v) * Math.min(1, dt * (vt > q.v ? 1.5 : 2.4));
    q.prog += q.v * dt;
    q.laneT -= dt;
    if (q.laneT <= 0) { q.laneT = 2.5 + Math.random() * 3; q.dT = (Math.random() * 2 - 1) * (tr.half - 16) * 0.8; }
    for (const o of R.racers) { if (o === q) continue; const ahead = o.prog - q.prog; if (ahead > 0 && ahead < 55 && Math.abs(o.d - q.d) < 16) q.dT = clamp(q.d + (o.d > q.d ? -1 : 1) * 20, -(tr.half - 12), tr.half - 12); }
    q.d += clamp(q.dT - q.d, -42 * dt, 42 * dt);
    q.d = clamp(q.d, -(tr.half - 9), tr.half - 9);
    const p = tr.at(q.prog, q.d), lat = q.dT - q.d;
    q.x = p.x; q.y = p.y; q.ang = p.ang + clamp(lat * 0.02, -0.25, 0.25); q.bank = lat > 5 ? 2 : lat < -5 ? 0 : 1;
  };
  function cross(q, prev, now) {
    const L = R.tr.L, k0 = Math.floor(prev / L), k1 = Math.floor(now / L);
    for (let k = k0 + 1; k <= k1; k++) {
      if (k === 0) { q.lapStart = R.time; if (q.isP) R.lapBegin(); continue; }
      if (q.finished) continue;
      q.lap = Math.min(R.laps, k + 1);
      if (q.isP) R.lapDone(k);
      if (k >= R.laps) R.finishRacer(q);
    }
  }
  R.lapBegin = function () { R.rec = []; R.recT = 0; R.ghostT = 0; };
  R.lapDone = function (k) {
    const P = R.P, t = R.time - P.lapStart; P.lapStart = R.time; P.lapTimes.push(t);
    if (R.bestLap === null || t < R.bestLap) R.bestLap = t;
    if (R.tt && R.rec.length > 20) { const old = G.records.ghosts[R.tr.id]; if (!old || t < old.t) { G.records.ghosts[R.tr.id] = { t, d: R.rec }; G.records.save(); R.newGhost = true; } }
    R.rec = []; R.recT = 0; R.ghostT = 0;
    if (k < R.laps) { R.setBanner(k === R.laps - 1 ? 'FINAL LAP' : 'LAP ' + (k + 1), 1.6, 'lap'); snd(k === R.laps - 1 ? 'finalLap' : 'lap'); R.ev('lap', { k }); }
  };
  R.finishRacer = function (q) {
    q.finished = true; q.finishT = R.time;
    if (q.isP) { R.state = 'finish'; R.fin = 0; q.auto = true; q.v = Math.hypot(q.vx, q.vy); q.d = q.d; q.dT = q.d * 0.5; q.lapTimes.length === R.laps || 0; R.setBanner('FINISH!', 3, 'fin'); snd('finish'); R.ev('finish'); }
  };
  R.setBanner = function (text, life, kind) { R.banner = { text, life, t: 0, kind: kind || '' }; };
  R.rankAll = function () {
    const arr = R.racers.slice().sort((a, b) => (b.finished - a.finished) || (a.finished ? a.finishT - b.finishT : b.prog - a.prog));
    arr.forEach((q, i) => { q.rank = i + 1; });
    R.order = arr;
    return arr;
  };
  function collide(dt) {
    const P = R.P, tr = R.tr;
    if (P.dead || P.auto) return;
    for (const q of R.racers) {
      if (q === P) continue;
      const dx = P.x - q.x, dy = P.y - q.y, dd = dx * dx + dy * dy;
      if (dd > 196 || dd < 1e-4) continue;
      const dist = Math.sqrt(dd), nx = dx / dist, ny = dy / dist, over = 14 - dist;
      P.x += nx * over * 0.7; P.y += ny * over * 0.7;
      const side = (-(q.x - P.x) * Math.sin(q.ang) + (q.y - P.y) * Math.cos(q.ang)) > 0 ? 1 : -1;
      q.d = clamp(q.d + side * over * 0.6, -(tr.half - 9), tr.half - 9); q.dT = q.d;
      if (!q.bumpCd || q.bumpCd <= 0) { q.bumpCd = 0.4; const rel = Math.abs(Math.hypot(P.vx, P.vy) - q.v); P.energy -= 1.1 * clamp(rel / 90, 0.4, 2) / R.mach.body; P.vx *= 0.97; P.vy *= 0.97; q.v *= 0.92; R.shake = Math.max(R.shake, 3); snd('bump'); R.ev('bump'); }
    }
    for (const q of R.racers) if (q.bumpCd > 0) q.bumpCd -= dt;
  }
  R.inp = { steer: 0, accel: 0, brake: 0, boost: 0, slideL: 0, slideR: 0 };
  R.update = function (dt, inp0) {
    const inp = R.inp; inp.steer = +inp0.steer || 0; inp.accel = inp0.accel ? 1 : 0; inp.brake = inp0.brake ? 1 : 0; inp.boost = inp0.boost ? 1 : 0; inp.slideL = inp0.slideL ? 1 : 0; inp.slideR = inp0.slideR ? 1 : 0;
    R.events.length = 0;
    if (R.banner) { R.banner.t += dt; if (R.banner.t > R.banner.life) R.banner = null; }
    if (R.shake > 0) R.shake = Math.max(0, R.shake - 28 * dt);
    const P = R.P;
    if (R.state === 'countdown') {
      R.cd -= dt;
      const n = Math.ceil(R.cd - 0.9);
      if (n !== R.lastCd) { R.lastCd = n; if (n > 0) snd('countdown', n); }
      if (n <= 0) { R.state = 'race'; R.time = 0; R.setBanner('GO!', 1.0, 'go'); snd('go'); R.ev('go'); }
      R.updatePlayer(dt, inp);
      for (const q of R.racers) if (!q.isP) R.updateAI(q, dt);
    } else if (R.state === 'race' || R.state === 'finish') {
      R.time += dt;
      if (!P.auto) { const r = R.updatePlayer(dt, R.state === 'race' ? inp : {}); if (r && R.state === 'race') cross(P, r.prev, r.now); }
      else { const prev = P.prog; R.updateAI(P, dt); P.vx = Math.cos(P.ang) * P.v; P.vy = Math.sin(P.ang) * P.v; P.z = 0; }
      for (const q of R.racers) { if (q.isP) continue; const prev = q.prog; R.updateAI(q, dt); cross(q, prev, q.prog); }
      collide(dt);
      if (R.state === 'race') {
        if (P.dead && P.deadT > 0.01 && !R.retired) { R.retired = true; R.state = 'finish'; R.fin = 0; R.setBanner('MACHINE DESTROYED', 3, 'dead'); }
        R.recT += dt; while (R.recT >= 1 / 30) { R.recT -= 1 / 30; if (R.ghostT >= 0 && !P.dead) R.rec.push([Math.round(P.x), Math.round(P.y), Math.round(P.ang * 40)]); }
        if (R.ghostT >= 0) R.ghostT += dt;
        P.rankT = (P.rankT || 0) - dt; const old = P.rank; R.rankAll(); if (!R.tt && old !== P.rank && P.rankT <= 0 && R.time > 3) { P.rankT = 1.6; R.ev(P.rank < old ? 'rankUp' : 'rankDown'); R.setBanner((P.rank < old ? 'RANK UP  ' : 'RANK DOWN  ') + P.rank + ' / ' + R.racers.length, 1.2, P.rank < old ? 'up' : 'down'); snd(P.rank < old ? 'rankUp' : 'rankDown'); }
        if (P.wrong > 1.2 && !R.banner) R.setBanner('WRONG WAY', 1.2, 'dead');
      } else {
        R.fin += dt; R.rankAll();
        if (R.fin > (R.retired ? 3 : 8) && !R.done) { R.done = true; R.state = 'done'; }
      }
    }
    R.rankAll();
  };
  R.fmt = (t) => { if (t === null || t === undefined) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };

  /* ---------- camera and drawing ---------- */
  R.updateCam = function (dt) {
    const P = R.P, cam = R.cam;
    if (R.state !== 'countdown' && R.state !== 'race' && (P.auto || P.dead)) {
      R.camT += dt;
      const sw = Math.sin(R.camT * 0.6) * 1.0, a = P.ang + sw, dist = Math.min(130, 62 + R.camT * 7);
      cam.x += (P.x - Math.cos(a) * dist - cam.x) * Math.min(1, 3 * dt); cam.y += (P.y - Math.sin(a) * dist - cam.y) * Math.min(1, 3 * dt);
      cam.h += (46 + Math.min(R.camT * 6, 40) - cam.h) * Math.min(1, 2 * dt);
      const want = Math.atan2(P.y - cam.y, P.x - cam.x); cam.ang += angDiff(want, cam.ang) * Math.min(1, 6 * dt);
      return;
    }
    cam.ang += angDiff(P.ang, cam.ang) * Math.min(1, 9 * dt);
    const dist = 56 + (P.boostT > 0 ? 7 : 0);
    cam.x = P.x - Math.cos(cam.ang) * dist; cam.y = P.y - Math.sin(cam.ang) * dist;
    cam.h = 36 + (P.z || 0) * 0.55;
  };
  const list = [];
  R.draw = function (time) {
    const m7 = G.m7, P = R.P, SH = G.ships, sk = G.settings.shake && !G.settings.reduced ? R.shake : 0;
    const cam = sk > 0 ? { x: R.cam.x + (Math.random() - 0.5) * sk * 0.35, y: R.cam.y + (Math.random() - 0.5) * sk * 0.35, ang: R.cam.ang + (Math.random() - 0.5) * sk * 0.004, h: R.cam.h + (Math.random() - 0.5) * sk * 0.3 } : R.cam;
    m7.drawSky(cam, R.pano); m7.drawGround(cam);
    list.length = 0;
    for (const p of R.props) { const j = m7.project(cam, p.x, p.y, 0); if (j && j.depth < 2600 && j.sx > -60 && j.sx < m7.IW + 60) list.push({ depth: j.depth, prop: p }); }
    for (const q of R.racers) { const j = m7.project(cam, q.x, q.y, q.z || 0); if (j) list.push({ depth: j.depth, racer: q }); }
    if (R.ghost && R.ghostT >= 0 && R.state === 'race') { const gs = R.ghost.d, i = Math.floor(R.ghostT * 30); if (i < gs.length) { const g = gs[i]; list.push({ depth: m7.project(cam, g[0], g[1], 0) ? m7.project(cam, g[0], g[1], 0).depth : 0, ghost: g }); } }
    list.sort((a, b) => b.depth - a.depth);
    const flick = Math.floor(time * 18) & 1;
    for (const it of list) {
      if (it.prop) { const a = 1 - clamp((it.depth - 1500) / 1100, 0, 1); m7.sprite(cam, it.prop.spr.c, it.prop.x, it.prop.y, 0, it.prop.spr.wu, a); }
      else if (it.ghost) { m7.sprite(cam, G.ships.set(R.opt.machine, 200)[1][flick], it.ghost[0], it.ghost[1], 0, 14, 0.45); }
      else {
        const q = it.racer;
        if (q.z > 1) m7.sprite(cam, SH.shadow, q.x, q.y, 0, 15, 1);
        if (q.isP && q.dead) { if (q.deadT < 0.1) m7.sprite(cam, q.set[1][flick], q.x, q.y, q.z, 14); m7.sprite(cam, SH.boom[Math.min(7, Math.floor(q.deadT * 11))], q.x, q.y, 3, 38, q.deadT > 0.75 ? 0 : 1); continue; }
        const bank = q.isP ? (R.state === 'race' || R.state === 'countdown' ? (G.input.steer < -0.3 ? 0 : G.input.steer > 0.3 ? 2 : 1) : 1) : q.bank;
        m7.sprite(cam, q.set[bank][flick], q.x, q.y, q.z || 0, 14, q.finished && !q.isP ? 0.85 : 1);
      }
    }
  };
})((window.SGS = window.SGS || {}));
