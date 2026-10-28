/* Game controller: race flow (fly-over, countdown, play, finish), the camera, and the turn from simulation events into sound and effects. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U, S = G.settings, A = G.audio, FX = G.fx, R = G.render, I = G.input, Sc = G.scores, TAU = U.TAU;
  const SQ = Math.SQRT1_2;
  const Game = { level: null, sim: null, idx: 0, score: 0, demo: true, phase: 'title', phaseT: 0, clock: 0, ts: 1, slow: 0, banner: '', bannerT: 0, timePop: 0, timePopV: 0, hint: '', hintT: 0, carry: 0, scoreAtStart: 0, carryAtStart: 0, trailT: 0, result: null, onOver: null, onLevelEnd: null, cam: { x: 0, y: 0, z: 0 }, kick: 0, lastTick: -1, W: 800, H: 600 };

  Game.say = function (text, secs, color, glow, size, sub) {
    Game.banner = text; Game.bannerT = Game.bannerMax = secs || 1.2; Game.bannerColor = color || '#ffe45a'; Game.bannerGlow = glow || 'rgba(255,200,40,0.9)'; Game.bannerSize = size || 46; Game.banner2 = sub || '';
  };
  Game.tip = function (text, secs) { Game.hint = text; Game.hintT = secs || 3; };

  /* ---------------- levels ---------------- */
  Game.loadLevel = function (idx, bonus) {
    const def = G.LEVELS[Math.max(0, Math.min(G.LEVELS.length - 1, idx))];
    Game.idx = G.LEVELS.indexOf(def);
    const lv = def.build();
    lv.name = def.name; lv.id = def.id; lv.sub = def.sub; lv.par = def.par;
    Game.level = lv;
    Game.sim = new G.Sim(lv, { god: G.debug.god, bonusTime: bonus || 0 });
    if (G.debug.time) { Game.sim.time = Game.sim.limit = G.debug.time; }
    Game.sim.bot = Game.demo;
    R.load(lv);
    if (G.scenery) G.scenery.build(lv);
    FX.reset(); FX.world = lv.world;
    const st = lv.start;
    Game.cam = { x: st.x, y: st.y, z: Game.sim.m.z };
    Game.phase = Game.demo ? 'play' : 'intro'; Game.phaseT = 0; Game.count = 4;
    if (Game.demo) Game.sim.start();
    Game.banner = ''; Game.bannerT = 0; Game.hint = ''; Game.hintT = 0; Game.timePop = 0; Game.result = null; Game.lastTick = -1;
    A.music(Game.demo ? 'title' : (def.music !== undefined ? 'l' + def.id : 'l1'));
  };

  Game.reset = function (demo) {
    Game.demo = !!demo;
    Game.score = 0; Game.carry = 0; Game.scoreAtStart = 0;
    const start = demo ? Math.floor(Math.random() * 3) : Math.max(0, (G.debug.level || 1) - 1);
    Game.startIdx = start;
    Game.loadLevel(start, 0);
    if (!demo) { Game.beginRace(); }
  };
  Game.startRace = function (idx) {
    Game.demo = false; Game.score = 0; Game.carry = 0;
    Game.loadLevel(idx, 0);
    Game.beginRace();
  };
  Game.beginRace = function () {
    Game.scoreAtStart = Game.score; Game.carryAtStart = Game.carry;
    Game.phase = 'intro'; Game.phaseT = 0;
    if (G.debug.at >= 0 && !Game.usedAt) {                                  /* ?at=0.4 drops the marble 40% along the course (for looking at a section) */
      Game.usedAt = true;
      const sim = Game.sim, p = sim.path[Math.min(sim.path.length - 1, Math.floor(G.debug.at * (sim.path.length - 1)))], m = sim.m;
      m.x = p.x; m.y = p.y; m.z = sim.world.heightAt(p.x, p.y); sim.pi = Math.floor(G.debug.at * (sim.path.length - 1));
      Game.cam = { x: m.x, y: m.y, z: m.z }; sim.start(); Game.phase = 'play'; Game.demo = false; sim.bot = !!G.debug.bot;
      return;
    }
    Game.say('RACE ' + Game.level.id, 2.2, '#ffffff', 'rgba(' + hex(Game.level.theme.accent) + ',0.95)', 56, Game.level.name + '  -  ' + Game.level.sub);
    A.sfx.start();
  };
  Game.restartRace = function () {
    Game.score = Game.scoreAtStart; Game.carry = Game.carryAtStart;
    Game.loadLevel(Game.idx, Game.carry);
    Game.beginRace();
  };
  Game.nextLevel = function () {
    if (Game.idx + 1 >= G.LEVELS.length) return false;
    Game.loadLevel(Game.idx + 1, Game.carry);
    Game.beginRace();
    return true;
  };
  function hexA(h) { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',1)'; }
  function hex(h) { const n = parseInt(h.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }

  /* ---------------- per-frame update ---------------- */
  Game.update = function (dtReal) {
    let dt = dtReal;
    Game.clock += dtReal;
    if (Game.slow > 0) { Game.slow -= dtReal; Game.ts = 0.28; } else Game.ts += (1 - Game.ts) * Math.min(1, dtReal * 6);
    dt *= Game.ts;
    Game.bannerT = Math.max(0, Game.bannerT - dtReal); Game.timePop = Math.max(0, Game.timePop - dtReal); Game.hintT = Math.max(0, Game.hintT - dtReal);
    Game.kick *= Math.max(0, 1 - 6 * dtReal); Game.sq = Math.max(0, (Game.sq || 0) - dtReal * 6);
    FX.update(dt);
    Game.moteT = (Game.moteT || 0) - dtReal;
    if (Game.moteT <= 0 && !S.reduced && Game.level) { Game.moteT = 0.09; const c = Game.cam; FX.mote(c.x + U.rand(-9, 9), c.y + U.rand(-9, 9), c.z + U.rand(-2, 4), Game.level.theme.accent.replace('#', '') ? hexA(Game.level.theme.accent) : 'rgba(120,230,255,0.9)'); }
    const sim = Game.sim, m = sim.m;
    I.update();
    I.ref.x = R.sx(m.x, m.y); I.ref.y = R.sy(m.x, m.y, m.z);
    if (Game.demo) { sim.step(dt, { wx: 0, wy: 0 }); Game.handle(sim.events); Game.followCam(dtReal, 1); Game.audioRoll(); Game.demoWatch(dtReal); return; }

    Game.phaseT += dtReal;
    const ph = Game.phase;
    if (ph === 'intro') {
      const dur = 2.6, u = U.smooth(Math.min(1, Game.phaseT / dur)), p = sim.path, k = (1 - u) * (p.length - 1), a = p[Math.floor(k)], b = p[Math.min(p.length - 1, Math.floor(k) + 1)], f = k - Math.floor(k);
      Game.cam.x += ((a.x + (b.x - a.x) * f) - Game.cam.x) * Math.min(1, dtReal * 9); Game.cam.y += ((a.y + (b.y - a.y) * f) - Game.cam.y) * Math.min(1, dtReal * 9); Game.cam.z += ((a.z + (b.z - a.z) * f) - Game.cam.z) * Math.min(1, dtReal * 9);
      sim.step(dt, { wx: 0, wy: 0 });
      if (Game.phaseT >= dur || (I._any && Game.phaseT > 0.6)) { Game.phase = 'ready'; Game.phaseT = 0; Game.count = 4; I.calibrate(); I._any = false; }
    } else if (ph === 'ready') {
      Game.followCam(dtReal, 1);
      sim.step(dt, { wx: 0, wy: 0 });
      const n = 3 - Math.floor(Game.phaseT / 0.8);
      if (n !== Game.count) {
        Game.count = n;
        if (n > 0) { Game.say(String(n), 0.8, '#ffffff', 'rgba(120,230,255,0.95)', 90); A.sfx.beep(false); }
        else { Game.say('GO!', 0.9, '#8dffd0', 'rgba(60,255,170,0.95)', 100); A.sfx.beep(true); sim.start(); Game.phase = 'play'; Game.phaseT = 0; if (Game.level.id === 1 && Sc.prog.unlocked <= 1) Game.tip(I.usingTilt() ? 'Tilt your device to roll - reach the finish line before time runs out' : (I.useStick() ? 'Drag on the screen to roll - reach the finish line before time runs out' : 'Arrow keys / WASD, or hold the mouse button to roll - reach the finish before time runs out'), 5); }
      }
    } else if (ph === 'play' || ph === 'finish' || ph === 'timeup') {
      let wx = 0, wy = 0;
      if (ph === 'play') { wx = (I.ix + I.iy) * SQ; wy = (I.iy - I.ix) * SQ; }
      sim.step(dt, { wx, wy });
      Game.handle(sim.events);
      Game.followCam(dtReal, ph === 'finish' ? 1.25 : 1);
      Game.audioRoll();
      if (ph === 'play') {
        const tl = Math.ceil(sim.time);
        if (sim.time < 10.2 && tl !== Game.lastTick && sim.time > 0) { Game.lastTick = tl; A.sfx.tick(); }
        Game.trailT -= dtReal;
        if (Game.trailT <= 0 && !m.dead && !m.falling) { Game.trailT = 0.03; m.trail.push({ x: m.x, y: m.y, z: m.z, t: Game.clock }); if (m.trail.length > 14) m.trail.shift(); }
        if (m.trail.length && Game.clock - m.trail[0].t > 0.5) m.trail.shift();
        if (sim.state === 'finish') { Game.phase = 'finish'; Game.phaseT = 0; }
        else if (sim.state === 'timeup') { Game.phase = 'timeup'; Game.phaseT = 0; }
      } else if (ph === 'finish') {
        if (Game.phaseT > 2.7 && !Game.endShown) { Game.endShown = true; if (Game.onLevelEnd) Game.onLevelEnd(Game.result); }
      } else if (ph === 'timeup') {
        if (Game.phaseT > 2.4 && !Game.endShown) { Game.endShown = true; if (Game.onOver) Game.onOver(false); }
      }
    }
  };

  /* title-screen attract mode: the bot races, then another race starts */
  Game.demoWatch = function (dt) {
    const sim = Game.sim;
    Game.demoT = (Game.demoT || 0) + dt;
    if (sim.state === 'finish' || sim.state === 'timeup' || Game.demoT > 70 || sim.deaths > 2) {
      Game.demoEnd = (Game.demoEnd || 0) + dt;
      if (Game.demoEnd > 1.6 || Game.demoT > 70) { Game.demoEnd = 0; Game.demoT = 0; Game.loadLevel((Game.idx + 1) % 3, 0); }
    }
  };

  Game.audioRoll = function () {
    const m = Game.sim.m, W = Game.sim.world;
    if (m.dead || m.falling) { A.roll(0, false, 0); return; }
    A.roll(Math.hypot(m.vx, m.vy) / 11, m.grounded, m.onSurf);
  };

  Game.followCam = function (dtReal, tight) {
    const m = Game.sim.m, c = Game.cam;
    let tx = m.x + m.vx * 0.2, ty = m.y + m.vy * 0.2, tz = m.falling ? c.z : m.z;
    if (m.dead) { tx = m.x; ty = m.y; }
    const k = 1 - Math.exp(-5.5 * dtReal * tight), kz = 1 - Math.exp(-3.2 * dtReal);
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k; c.z += (tz - c.z) * kz;
  };

  /* ---------------- drawing ---------------- */
  Game.zoomFor = function (W, H) {
    let z = Math.min(W / (C.TW * (W < H * 0.8 ? 8.4 : 10)), H / (C.TH * 19));
    z = U.clamp(z, 0.5, 1.45) * G.debug.zoom;
    return z * (1 + Game.kick * 0.05) * (Game.phase === 'finish' ? 1 + Math.min(0.14, Game.phaseT * 0.07) : 1);
  };
  Game.render = function (ctx, W, H, ps) {
    Game.W = W; Game.H = H;
    const c = Game.cam, sh = FX.shake;
    R.set(W, H, Game.zoomFor(W, H), c.x, c.y, c.z, ps, sh ? U.rand(-sh, sh) : 0, sh ? U.rand(-sh, sh) : 0);
    R.drawScene(ctx, Game.sim, Game.clock);
  };

  /* ---------------- events -> effects ---------------- */
  const CY = 'rgba(120,230,255,1)', WH = 'rgba(255,255,255,1)';
  Game.handle = function (events) {
    const sim = Game.sim, m = sim.m;
    for (const e of events) {
      switch (e.type) {
        case 'land': {
          if (e.level >= 1) { FX.dust(e.x, e.y, e.z, 4 + e.level * 3, 6 + e.level * 2); FX.sparks(e.x, e.y, e.z, 5 + e.level * 5, 4 + e.level * 2, 'rgba(160,230,255,1)', 0.4, 1.4); FX.ring(e.x, e.y, e.z, 0.1, 0.9 + e.level * 0.5, 'rgba(160,230,255,1)', 0.4, 2); }
          if (e.level >= 2) { FX.decal(e.x, e.y, e.z + 0.01, 0.9 + 0.2 * (e.rel - C.HIT_HARD), 7); FX.addShake(5 + e.level * 2); Game.kick = 1; FX.doFlash(0.15, '255,255,255'); }
          if (e.level >= 1) Game.sq = Math.min(1, 0.3 + e.rel * 0.05);
          A.sfx.land(e.level); break;
        }
        case 'bump': FX.sparks(e.x + e.nx * -m.r, e.y + e.ny * -m.r, e.z + m.r, 6 + Math.min(12, e.speed), 3 + e.speed * 0.5, e.kind === 2 ? 'rgba(255,230,160,1)' : 'rgba(180,235,255,1)', 0.35, 1.5); if (e.speed > 7) FX.addShake(e.speed * 0.25); A.sfx.bump(e.speed); break;
        case 'launch': A.sfx.launch(); FX.ring(e.x, e.y, e.z, 0.1, 0.8, CY, 0.35, 2); break;
        case 'crack': Game.crackFx(e); break;
        case 'shatter': Game.shatterFx(e); break;
        case 'fall': A.sfx.fall(); Game.tip('Off the edge!', 1.4); FX.addShake(2); break;
        case 'respawn': FX.ring(e.x, e.y, e.z, 0.1, 1.6, CY, 0.7, 3); FX.beam(e.x, e.y, e.z, 3.2, 'rgba(120,230,255,0.9)', 0.7, 22); FX.sparks(e.x, e.y, e.z + 0.3, 18, 4, CY, 0.6, 1.5, 1.2); A.sfx.respawn(); break;
        case 'tilecrack': if (e.glass) { A.sfx.glassCrack(e.k); FX.sparks(e.x, e.y, e.z, 7, 4, 'rgba(220,250,255,1)', 0.4, 1.4); FX.shards(e.x, e.y, e.z, 2, 2.4, 195, 0, 0); } else { A.sfx.tilecrack(e.k); FX.dust(e.x, e.y, e.z, 2, 5, '#8a6a4e'); FX.sparks(e.x, e.y, e.z, 4, 2.6, 'rgba(255,170,90,1)', 0.35, 1.3); } break;
        case 'tilehit': FX.decal(e.x, e.y, e.z + 0.01, 1.2, 5); if (e.glass) FX.shards(e.x, e.y, e.z, 4, 3, 195, 0, 0); else FX.dust(e.x, e.y, e.z, 5, 7, '#8a6a4e'); break;
        case 'tilebreak': if (e.glass) { FX.shards(e.x, e.y, e.z, 16, 4.5, 190, 0, 0); FX.sparks(e.x, e.y, e.z, 20, 6, 'rgba(220,250,255,1)', 0.6, 1.7); FX.ring(e.x, e.y, e.z, 0.2, 1.5, 'rgba(180,240,255,1)', 0.45, 3); FX.glowPop(e.x, e.y, e.z, 40, 'rgba(160,235,255,1)', 0.3); FX.addShake(4); A.sfx.glassBreak(); break; } FX.chunks(e.x, e.y, e.z, 12, 3.2); FX.dust(e.x, e.y, e.z, 8, 9, '#8a6a4e'); FX.sparks(e.x, e.y, e.z, 14, 5, 'rgba(255,170,90,1)', 0.6, 1.6); FX.ring(e.x, e.y, e.z, 0.2, 1.4, 'rgba(255,170,90,1)', 0.45, 3); FX.addShake(4); A.sfx.tilebreak(); break;
        case 'tileform': FX.ring(e.x, e.y, e.z, 0.1, 0.9, CY, 0.4, 2); A.sfx.tileform(); break;
        case 'laser': A.sfx.laser(); break;
        case 'slam': for (let k = 0; k < 4; k++) FX.decal(e.x + U.rand(-e.w, e.w) * 0.35, e.y + U.rand(-e.h, e.h) * 0.35, e.z + 0.01, 1.1, 7); FX.dust(e.x, e.y, e.z, 14, 11); FX.sparks(e.x, e.y, e.z, 18, 6, 'rgba(255,200,110,1)', 0.5, 1.8); FX.ring(e.x, e.y, e.z, 0.5, Math.max(e.w, e.h) * 1.1, 'rgba(255,190,90,1)', 0.5, 4); FX.addShake(7); A.sfx.slam(); break;
        case 'spike': A.sfx.spike(); break;
        case 'sweep': FX.sparks(e.x, e.y, e.z + 0.3, 12, 6, 'rgba(255,190,90,1)', 0.45, 1.8); FX.addShake(4); A.sfx.sweep(); break;
        case 'bumper': FX.sparks(e.x, e.y, e.z + 0.3, 14, 7, 'rgba(255,120,230,1)', 0.5, 1.8); FX.ring(e.x, e.y, e.z, 0.3, 1.2, 'rgba(255,120,230,1)', 0.35, 3); FX.glowPop(e.x, e.y, e.z + 0.3, 40, 'rgba(255,60,220,1)', 0.25); A.sfx.bumper(e.strength); break;
        case 'bounce': FX.ring(e.x, e.y, e.z, 0.2, 1.3, 'rgba(255,120,230,1)', 0.45, 3); FX.sparks(e.x, e.y, e.z, 10, 5, 'rgba(255,150,240,1)', 0.5, 1.6, 1.4); A.sfx.bounce(); break;
        case 'timeGem': Game.timePop = 1.3; Game.timePopV = e.secs; FX.text(e.x, e.y, e.z + 0.8, '+' + e.secs + 's', '#8dffd0', 22); FX.sparks(e.x, e.y, e.z, 16, 5, 'rgba(120,255,200,1)', 0.6, 1.6, 1.2); FX.ring(e.x, e.y, e.z, 0.1, 1, 'rgba(120,255,200,1)', 0.5, 3); A.sfx.timeGem(); break;
        case 'gem': FX.text(e.x, e.y, e.z + 0.8, '+' + e.points, '#ffd24a', 18); FX.sparks(e.x, e.y, e.z, 10, 4, 'rgba(255,210,80,1)', 0.5, 1.5, 1.2); A.sfx.gem(); break;
        case 'orbHit': FX.sparks(e.x, e.y, e.z, 12, 6, 'rgba(255,200,170,1)', 0.35, 1.6); FX.addShake(3 + e.speed * 0.3); A.sfx.orbHit(); break;
        case 'foeDie': FX.glowPop(e.x, e.y, e.z + 0.3, 56, e.type === 'orb' ? 'rgba(255,120,80,1)' : 'rgba(120,255,140,1)', 0.35); FX.sparks(e.x, e.y, e.z + 0.3, 24, 7, e.type === 'orb' ? 'rgba(255,190,140,1)' : 'rgba(150,255,170,1)', 0.6, 1.8); FX.ring(e.x, e.y, e.z, 0.2, 1.5, e.type === 'orb' ? 'rgba(255,150,100,1)' : 'rgba(130,255,160,1)', 0.45, 3); FX.smoke(e.x, e.y, e.z + 0.2, 4, 10); FX.text(e.x, e.y, e.z + 1, '+' + e.points, '#ffd24a', 22); FX.addShake(5); A.sfx.foeDie(); break;
        case 'foeFell': break;
        case 'chomp': FX.sparks(e.x, e.y, e.z + 0.4, 10, 5, 'rgba(200,255,120,1)', 0.4, 1.6); FX.addShake(5); A.sfx.chomp(); break;
        case 'sizzle': FX.sparks(e.x, e.y, e.z, 6, 3, 'rgba(180,255,60,1)', 0.4, 1.4, 1.6); FX.smoke(e.x, e.y, e.z, 2, 6, '#3c5a1e'); A.sfx.sizzle(); break;
        case 'acid': FX.sparks(e.x, e.y, e.z, 3, 2.5, 'rgba(180,255,60,1)', 0.4, 1.3, 1.6); break;
        case 'slurp': A.sfx.slurp(); break;
        case 'mine': FX.glowPop(e.x, e.y, e.z, 110, 'rgba(255,150,60,1)', 0.5); FX.glowPop(e.x, e.y, e.z, 50, WH, 0.25); FX.sparks(e.x, e.y, e.z, 34, 9, 'rgba(255,200,120,1)', 0.7, 2); FX.ring(e.x, e.y, e.z, 0.3, 2.6, 'rgba(255,170,80,1)', 0.55, 4); FX.smoke(e.x, e.y, e.z, 8, 14); FX.addShake(9); A.sfx.mine(); break;
        case 'shoot': A.sfx.shoot(); break;
        case 'boltHit': FX.sparks(e.x, e.y, e.z, 14, 6, 'rgba(255,170,90,1)', 0.45, 1.7); FX.addShake(4); A.sfx.boltHit(); break;
        case 'gateclose': case 'gateopen': A.sfx.gate(); FX.dust(e.x, e.y, e.z, 4, 6); break;
        case 'finish': Game.finishFx(e); break;
        case 'timeup': Game.say('TIME UP', 2.4, '#ff7a6a', 'rgba(255,60,40,0.95)', 64); A.sfx.timeup(); FX.doFlash(0.3, '255,60,40'); A.roll(0, false, 0); break;
        default: break;
      }
    }
  };

  Game.crackFx = function (e) {
    FX.shards(e.x, e.y, e.z + C.R, 7, 4, 195, 0, 0);
    FX.sparks(e.x, e.y, e.z + C.R, 16, 7, 'rgba(210,248,255,1)', 0.5, 1.8);
    FX.glowPop(e.x, e.y, e.z + C.R, 38, 'rgba(180,240,255,1)', 0.26);
    FX.ring(e.x, e.y, e.z, 0.15, 1.1, 'rgba(200,245,255,1)', 0.4, 3);
    FX.doFlash(0.14, '210,245,255'); FX.addShake(7); Game.kick = 1; Game.slow = Math.max(Game.slow, 0.12);
    A.sfx.crack(e.stage);
    Game.tip(e.stage >= 2 ? 'Hull critical - one more hit and it shatters!' : 'Hull cracked!', 2);
  };
  Game.shatterFx = function (e) {
    const x = e.x, y = e.y, z = e.z;
    FX.shards(x, y, z, 30, 7.5, 195, e.vx, e.vy); FX.shards(x, y, z, 12, 4.5, 280, e.vx, e.vy);
    FX.glowPop(x, y, z, 62, 'rgba(120,230,255,1)', 0.45); FX.glowPop(x, y, z, 26, WH, 0.2);
    FX.ring(x, y, z - C.R, 0.2, 2.8, 'rgba(160,242,255,1)', 0.65, 4); FX.ring(x, y, z - C.R, 0.1, 1.6, WH, 0.4, 2);
    FX.sparks(x, y, z, 30, 9, 'rgba(200,248,255,1)', 0.75, 1.9); FX.sparks(x, y, z, 14, 5, WH, 0.5, 1.4);
    FX.decal(x, y, z - C.R + 0.01, 1.5, 6);
    FX.doFlash(0.26, '200,245,255'); FX.addShake(12); Game.kick = 1.4; Game.slow = 0.42;
    A.sfx.shatter(); A.roll(0, false, 0);
    const cause = e.cause;
    if (cause === 'laser') { FX.sparks(x, y, z, 20, 9, 'rgba(255,80,120,1)', 0.6, 2); Game.tip('Sliced by a laser gate', 2); }
    else if (cause === 'crushed') { FX.dust(x, y, z - C.R, 14, 12); FX.ring(x, y, z - C.R, 0.3, 2.2, 'rgba(255,190,90,1)', 0.5, 4); Game.tip('Crushed!', 2); }
    else if (cause === 'impact') Game.tip('Too hard a landing - mind the drops', 2.4);
    else if (cause === 'eaten') { FX.sparks(x, y, z, 20, 7, 'rgba(210,100,255,1)', 0.6, 2); Game.tip('Sucked up by a Void Vacuum', 2.4); }
    else if (cause === 'acid') { FX.smoke(x, y, z, 8, 12, '#3c5a1e'); FX.sparks(x, y, z, 16, 5, 'rgba(180,255,60,1)', 0.6, 1.8); Game.tip('Dissolved in acid', 2.4); }
    else if (cause === 'spiked') Game.tip('Spiked!', 2);
    else if (cause === 'chomp' || cause === 'orb') Game.tip('Smashed!', 2);
    else if (cause === 'mine') Game.tip('Mine!', 2);
  };
  Game.finishFx = function (e) {
    const sim = Game.sim, left = Math.max(0, e.timeLeft), timeBonus = Math.floor(left) * C.START_TIME_BONUS, raceBonus = 1000 * Game.level.id;
    const total = sim.score + timeBonus + raceBonus;
    const isBest = Sc.raceDone(Game.level.id, left);
    Game.score += total;
    Game.carry = Math.min(C.EXTRA_TIME_CAP, Math.floor(left));
    Game.result = { id: Game.level.id, name: Game.level.name, timeLeft: left, timeBonus, raceBonus, gems: sim.score, total, carry: Game.carry, kills: sim.kills, deaths: sim.deaths, best: isBest, last: Game.idx + 1 >= G.LEVELS.length };
    Game.endShown = false;
    Game.say('FINISH!', 2.6, '#ffffff', 'rgba(120,230,255,0.98)', 78, '+' + U.fmt(total) + ' points');
    const gb = R.goalBox;
    for (let i = 0; i < 4; i++) FX.ring(e.x, e.y, e.z, 0.2 + i * 0.1, 2.5 + i, i % 2 ? 'rgba(255,90,220,1)' : CY, 0.8 + i * 0.15, 3);
    FX.beam(e.x, e.y, e.z, 8, 'rgba(160,240,255,0.8)', 1.2, 36); FX.sparks(e.x, e.y, e.z + 0.5, 70, 11, 'rgba(255,230,160,1)', 1.2, 2, 1.4); FX.sparks(e.x, e.y, e.z + 0.5, 50, 8, 'rgba(120,240,255,1)', 1.2, 2, 1.4);
    FX.doFlash(0.35, '160,240,255');
    A.sfx.finish(); A.roll(0, false, 0);
  };

  G.game = Game;
})((window.SGS = window.SGS || {}));
