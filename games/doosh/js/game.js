// Stick Doosh - game.js (core): level session, camera, spawning, damage routing, state machine, boss flow, results.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';
  const LOOT2PICK = { spread: 'S', mg: 'M', shotgun: 'D', rocket: 'R', flame: 'F', laser: 'L', barrier: 'B', rapid: 'rapid', heal: 'heal', ammo: 'ammo', gold: 'gold', '1up': '1UP' };
  const DEFAULT_THEME = { id: 'default', name: 'TEST ZONE', sky: ['#7fd4ff', '#d9f4ff'], ink: INK, mats: {}, gravity: 1, wind: null, enemies: { grunt: 1 }, ambient: null, retro: false, music: 'title' };
  function sfx(n, o) { if (S.Audio && S.Audio.sfx) S.Audio.sfx(n, o); }
  function word(t, x, y, o) { if (S.Comic) S.Comic.word(t, x, y, o); }
  function ui(fn, a, b) { try { if (S.UI && S.UI[fn]) return S.UI[fn](a, b); } catch (e) { console.error('[UI] ' + fn, e); } }
  function stats() { return (S.Shop && S.Shop.stats) ? S.Shop.stats() : {}; }

  const G = S.Game = {
    state: 'none', level: null, theme: null, themeObj: null, levelId: null, player: null, team: [], ents: [], cam: { x: 0, y: 0, w: 800, h: 450 },
    time: 0, gold: 0, kills: 0, rescues: 0, checkpoint: { x: 0, y: 0 }, grav: 1, stats: {}, difficulty: C.DIFF.normal,
    boss: null, bossStarted: false, godMode: false, bigHeads: false, partyHats: false, goldMul: 1, paused: false,
    pending: null, stateT: 0, respawnT: 0, bonusLives: 0, capT: 25, wind: null, flags: {},

    // ---------------- lifecycle ----------------
    start(levelId, opts) {
      opts = opts || {};
      const fl = Object.assign({}, (S.Main && S.Main.flags) || {}, opts);
      G.flags = fl;
      G.levelId = levelId; G.stats = stats(); G.state = 'loading';
      const save = S.Save ? S.Save.data : { cheats: {}, beaten: {}, settings: { game: { difficulty: 'normal' } } };
      const dk = save.settings.game.difficulty || 'normal';
      G.difficulty = C.DIFF[dk] || C.DIFF.normal; G.diffKey = dk;
      G.themeObj = (S.Themes && S.Themes[levelId]) || DEFAULT_THEME;
      G.theme = levelId;
      G.godMode = !!fl.god; G.bigHeads = !!(G.stats.bigHeads || save.cheats.bigHeads); G.partyHats = !!G.stats.partyHats;
      G.grav = (G.themeObj.gravity == null ? 1 : G.themeObj.gravity) * (save.cheats.moon ? 0.35 : 1) * (G.stats.moonBoots ? 0.9 : 1);
      G.goldMul = (G.stats.goldMul || 1) * (1 + 0.25 * (S.Save ? S.Save.beatenCount() : 0));
      let lv = null;
      try { if (S.LevelGen && S.LevelGen.build) lv = S.LevelGen.build(levelId, fl.seed ? +fl.seed : undefined, dk); } catch (e) { console.error('[LevelGen]', e); }
      if (!lv) lv = testLevel();
      G.level = lv;
      if (S.FX) S.FX.clear(); if (S.Comic) S.Comic.clear(); if (S.Shots) S.Shots.clear();
      S.Terrain.load(lv, G.themeObj);
      S.Terrain.setScale(1, 0);
      S.Phys.liquidHook = lv.water && S.LevelGen && S.LevelGen.waterY ? (e) => {
        const w = lv.water; if (e.x < w.x0 || e.x > w.x1) return false;
        return (e.y - e.h * 0.45) > S.LevelGen.waterY(lv, G.time);
      } : null;
      G.ents = []; G._hostile = { player: [], enemy: [], neutral: [] };
      G.time = 0; G.gold = 0; G.kills = 0; G.rescues = 0; G.boss = null; G.bossStarted = false; G.bossDeath = null; G.pending = null; G.finished = false; G.bossGold = 0; // finished reset: levels after the first never finished (freeze bug)
      G.checkpoint = { x: lv.spawn.x, y: lv.spawn.y }; G.capT = U.rand(14, 24); G.killT = 0; G.killChain = 0; G.goldPop = null;
      G.bonusLives = G.stats.extraLives || 0; G.chopper = null; G.sealed = false; G.paused = false; G.hitFlag = {};
      // team
      const order = S.Dudes.order.slice();
      let extra = G.stats.extraDude || 0;
      for (let i = 0; i < extra; i++) order.push(order[i % 5]);
      if (fl.dude && S.Dudes[fl.dude]) { const k = order.indexOf(fl.dude); if (k > 0) { order.splice(k, 1); order.unshift(fl.dude); } }
      G.team = order.map((id) => ({ id, dead: false, weapon: null, lvl: 1, rapid: false, startBuff: null }));
      const sp = G.stats.startPowerup | 0;
      if (sp) { const pk = U.pick(S.Ents.WEAPON_PICKS); G.team.forEach((m) => { m.weapon = S.Player.PICK2GUN[pk]; m.lvl = sp >= 2 ? 2 : 1; }); G.team.forEach((m) => { m.mega = sp >= 2; }); }
      if (fl.weapon && S.Weapons[fl.weapon]) G.team.forEach((m) => { m.weapon = fl.weapon; });
      G.teamIdx = 0;
      // entities
      for (const spec of lv.ents) { try { spawnSpec(spec); } catch (err) { console.error('[spawn]', spec.type, err); } }
      G.spawnPlayer(G.teamIdx, lv.spawn.x, lv.spawn.y, false);
      if (fl.boss && lv.arena) { const p = G.player; p.x = lv.arena.entryX; p.y = lv.arena.entryY; G.checkpoint = { x: p.x, y: p.y }; }
      G.snapCamera();
      G.state = 'intro'; G.stateT = 1.0;
      if (S.Main) { S.Main.mode = 'play'; S.Main.qualityLow = false; }
      if (S.Music && !fl.nomusic) S.Music.play(G.themeObj.id === 'fortress' ? 'title' : (G.themeObj.music || levelId), { fade: 0.4 });
      if (S.Input) { S.Input.lockMouse(true); S.Input.clearSim(); }
      if (S.Comic) S.Comic.word((G.themeObj.name || levelId).toUpperCase(), G.cam.w / 2, 120, { size: 38, color: '#ffe14d', burst: true, burstColor: '#e8173a', life: 1.3, vy: 0, angle: -0.05, screen: true, pop: true });
      if (S.Voice) S.Voice.say(G.player.dude, 'start', { follow: G.player });
      G.timeStart = U.now();
    },
    spawnPlayer(idx, x, y, drop) {
      const m = G.team[idx]; G.teamIdx = idx;
      if (drop && S.Terrain) { // drop in from above if the column is clear
        let dy = 0; while (dy < 320 && S.Phys.free(x, y - 40 - dy - 8, 14, 32)) dy += 20; y = y - Math.max(0, dy - 20) - 0;
      }
      const p = S.Player.make(m, x, y);
      if (m.startBuff) { p.applyPickup(m.startBuff, true); m.startBuff = null; }
      if (m.mega) { p.lvl = 2; p.mega = true; }
      G.player = p; G.spawn(p); G.respawnT = 0;
      if (drop) { word(S.Dudes[m.id].name + ' DROPS IN!', x, y - 70, { size: 20, color: '#ffffff', stroke: '#3bb4ff' }); if (S.FX) S.FX.ring(x, y - 16, 36, '#ffffff'); sfx('powerup'); }
      return p;
    },
    pause() {
      if (!S.Main || S.Main.mode !== 'play' || G.state === 'clear' || G.state === 'fail') return;
      S.Main.mode = 'pause'; G.paused = true;
      if (S.Input) { S.Input.lockMouse(false); S.Input.clearSim(); }
      ui('onPause');
    },
    resume() {
      if (!S.Main) return;
      S.Main.mode = 'play'; G.paused = false;
      if (S.Input) { S.Input.lockMouse(true); S.Input.clearSim(); }
    },
    quit() {
      G.state = 'none'; G.player = null; G.ents = []; G.boss = null;
      if (S.Shots) S.Shots.clear(); if (S.FX) S.FX.clear(); if (S.Comic) S.Comic.clear();
      if (S.Main) S.Main.mode = 'menu';
      if (S.Input) S.Input.lockMouse(false);
      if (S.Music) S.Music.play('select', { fade: 0.4 });
    },
    snapCamera() {
      const c = G.cam, p = G.player; if (!p) return;
      c.w = S.Main ? S.Main.W : 800; c.h = C.VIEW_H;
      c.x = p.x - c.w / 2; c.y = p.y - 80 - c.h / 2;
      G.clampCam();
    },
    clampCam() {
      const c = G.cam, lv = G.level, T = C.T;
      let x0 = 0, x1 = lv.w * T, y0 = 0, y1 = lv.h * T;
      if (G.bossStarted && lv.arena) { x0 = lv.arena.x0 - 16; x1 = lv.arena.x1 + 16; y0 = Math.max(0, lv.arena.y0 - 40); y1 = lv.arena.y1 + 30; }
      if (x1 - x0 <= c.w) c.x = (x0 + x1 - c.w) / 2; else c.x = U.clamp(c.x, x0, x1 - c.w);
      if (y1 - y0 <= c.h) c.y = (y0 + y1 - c.h) / 2; else c.y = U.clamp(c.y, y0, y1 - c.h);
    },

    // ---------------- entity API ----------------
    spawn(e) {
      if (!e.uid) e.uid = Math.floor(Math.random() * 1e9);
      G.ents.push(e);
      if (e.kind === 'enemy' || e.kind === 'boss' || e.shootable) { G._hostile.player.push(e); G._hostile.neutral.push(e); }
      if (e.kind === 'player') { G._hostile.enemy.push(e); G._hostile.neutral.push(e); }
      return e;
    },
    spawnEnemy(id, x, y, opts) {
      opts = opts || {};
      const hpMul = (opts.hpMul || 1) * (G.diffKey === 'ultra' ? 1.25 : 1);
      const e = S.Enemies.make(id, x, y, Object.assign({}, opts, { hpMul }));
      if (opts.vx) e.vx = opts.vx;
      if (opts.charge) { e.state = 'attack'; e.alerted = true; }
      return G.spawn(e);
    },
    isPlayerTeam(e) { return e && e.team === 'player'; },
    hostiles(team) {
      const h = G._hostile; return team === 'player' ? h.player : team === 'enemy' ? h.enemy : h.neutral;
    },
    _rebuildHostile() {
      const h = G._hostile; h.player.length = 0; h.enemy.length = 0; h.neutral.length = 0;
      for (const e of G.ents) {
        if (e.dead) continue;
        if (e.kind === 'enemy' || e.kind === 'boss' || e.shootable) { h.player.push(e); h.neutral.push(e); }
        if (e.kind === 'player' && !e.hidden) { h.enemy.push(e); h.neutral.push(e); }
      }
    },
    nearestEnemy(x, y, team, range) {
      let best = null, bd = (range || 400);
      for (const e of G.hostiles(team)) {
        if (e.dead || (e.kind !== 'enemy' && e.kind !== 'boss')) continue;
        const d = Math.hypot(e.x - x, (e.y - e.h / 2) - y);
        if (d < bd) { bd = d; best = e; }
      }
      return best;
    },
    // returns false if the target was immune / blocked
    damage(target, dmg, src) {
      if (!target || target.dead) return true;
      src = src || {};
      if (src.team && target.team === src.team && src.team !== 'neutral') return true;
      if (target.kind === 'player' && src.team === 'player') return true;
      if (!target.hurt) return true;
      return target.hurt(dmg, src.owner || src, src);
    },
    hurtArea(x, y, r, dmg, team, src) {
      src = src || {};
      for (const e of G.hostiles(team).slice()) {
        if (e.dead) continue;
        if (e.kind === 'player' && team === 'player') continue;
        const cx = e.x, cy = e.y - e.h / 2;
        const d = Math.hypot(cx - x, cy - y) - Math.min(e.w, e.h) / 3;
        if (d > r) continue;
        const f = U.clamp(1 - d / r * 0.55, 0.45, 1);
        G.damage(e, dmg * f, Object.assign({ team, blast: true, dirX: U.sign(cx - x) || 1, x, y, kind: 'blast' }, src));
      }
    },
    explode(x, y, r, dmg, team, o) {
      o = o || {};
      const st = G.stats;
      if (team === 'player') r *= (st.blastMul || 1);
      if (S.FX) {
        S.FX.explosion(x, y, r);
        if (!o.quiet) { S.FX.shake(Math.min(0.7, 0.1 + r / 200)); S.FX.hitstop(r > 60 ? 0.05 : 0.02); if (r > 80 && !(S.Save && S.Save.settings.video.reduceFlash)) S.FX.flash('#fff6c0', 0.08); }
      }
      if (!o.quiet) {
        const w = r >= 90 ? 'KRAKOOM!' : r >= 62 ? U.pick(['KA-BLAM!', 'BOOM!']) : U.pick(['POP!', 'BLAM!', 'BOOM']);
        word(w, x, y - r * 0.5, { size: Math.min(46, 18 + r * 0.3), color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 0.8, vy: -30 });
        sfx('explode', { x, vol: Math.min(1, 0.55 + r / 150) });
      }
      if (S.Terrain) S.Terrain.explode(x, y, r * 0.9, Math.max(2, Math.ceil(dmg * 0.9)));
      G.hurtArea(x, y, r, dmg, team, { owner: o.owner, superId: o.superId, fire: o.fire });
      if (S.Input && !o.quiet && r > 55) S.Input.vibrate(120, 0.7);
    },
    addGold(n, x, y) {
      n = Math.round(n * G.goldMul);
      G.gold += n;
      const pop = G.goldPop;
      if (pop && pop.t > 0 && S.Comic && S.Comic.words.indexOf(pop.w) >= 0) { pop.n += n; pop.w.text = '+$' + pop.n; pop.w.t = 0.1; pop.t = 0.5; }
      else if (S.Comic) { G.goldPop = { n, t: 0.5, w: S.Comic.word('+$' + n, x, y, { size: 14, color: '#ffd23f', life: 0.9, pop: false, angle: 0 }) }; }
    },
    rescue(cage) {
      G.rescues++;
      const dead = G.team.findIndex((m) => m.dead);
      if (dead >= 0) G.reviveOne(); else { G.addGold(25, cage.x, cage.y - 40); if (G.player) G.player.heal(1); }
      if (S.Voice) S.Voice.say(G.player ? G.player.dude : 'sgt', 'rescue', { follow: G.player });
    },
    reviveOne() {
      const i = G.team.findIndex((m) => m.dead);
      if (i < 0) { if (G.player) G.addGold(50, G.player.x, G.player.y - 30); return false; }
      G.team[i].dead = false;
      const nm = S.Dudes[G.team[i].id].name;
      if (G.player) word(nm + ' IS BACK!', G.player.x, G.player.y - 70, { size: 22, color: '#7dff6b', burst: true, burstColor: '#141018', life: 1.2 });
      sfx('powerup');
      return true;
    },
    onKill(e, info) {
      G.kills++;
      if (S.Save) S.Save.data.stats.kills++;
      G.killChain = G.killT > 0 ? G.killChain + 1 : 1; G.killT = 1.1;
      if (G.killChain >= 3 && G.player) {
        word(['TRIPLE DOOSH!', 'QUAD DOOSH!', 'MEGA DOOSH!', 'ULTRA DOOSH!', 'MONSTER DOOSH!'][Math.min(4, G.killChain - 3)], G.player.x, G.player.y - 80, { size: 24 + G.killChain, color: '#ff4fa3', stroke: '#ffffff', burst: true, burstColor: '#ffe14d', life: 0.9 });
        if (S.Voice) S.Voice.say(G.player.dude, 'multikill', { follow: G.player });
      } else if (G.player && Math.random() < 0.07 && S.Voice) S.Voice.say(G.player.dude, 'kill', { follow: G.player });
    },
    onPlayerDead(p) {
      if (S.Save) S.Save.data.stats.deaths++;
      const inf = S.Save && S.Save.data.cheats.infLives;
      if (!inf) p.member.dead = true;
      G.respawnT = 1.4;
      G.player = p; // keep ref for camera
    },
    // ---------------- boss ----------------
    startBoss() {
      const lv = G.level, a = lv.arena;
      G.bossStarted = true; G.state = 'bossintro'; G.stateT = 0;
      if (a && a.door) {
        const d = a.door;
        for (let ty = d.ty0; ty <= d.ty1; ty++) for (let tx = d.tx; tx < d.tx + (d.w || 2); tx++) S.Terrain.set(tx, ty, S.Terrain.MAT.BEDROCK);
        word('DOOR SLAM!', d.x + 20, d.y - 80, { size: 28, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#141018' });
        if (S.FX) S.FX.shake(0.5);
        sfx('slam');
      }
      for (const e of G.ents) if ((e.kind === 'enemy') && !e.dead) e.dead = true; // clear leftovers
      G.pending = true;
      if (S.Bosses && S.Bosses.preload) S.Bosses.preload(G.levelId); // bosses agent hook: queue this boss's voice mp3s on arena entry
      const def = (S.BossDefs && S.BossDefs[G.levelId]) || { name: (G.themeObj.bossName || G.themeObj.boss || 'THE BOSS'), themeId: G.levelId };
      if (S.UI && S.UI.onBossIntro) ui('onBossIntro', def.name ? Object.assign({ themeId: G.levelId }, def) : G.levelId, () => G.beginBoss());
      else G.beginBoss();
    },
    beginBoss() {
      if (G.state !== 'bossintro') return;
      const a = G.level.arena;
      let b = null;
      try { if (S.Bosses && S.Bosses.make) b = S.Bosses.make(G.levelId, a.bossX, a.bossY); } catch (e) { console.error('[Bosses.make]', e); }
      if (!b) b = fallbackBoss(a.bossX, a.bossY);
      G.boss = b; b.isBoss = true; G.spawn(b);
      G.state = 'boss'; G.pending = null;
      if (S.Music) S.Music.play(G.levelId === 'fortress' ? 'final' : 'boss', { fade: 0.2 });
      if (S.Voice) S.Voice.say('announcer', 'boss', { force: true });
    },
    // called by a boss entity when hp reaches 0 (generic FF6 sequence unless S.Bosses.deathSequence handles it)
    onBossDying(boss) {
      if (G.bossDeath) return;
      G.state = 'bossdeath'; G.stateT = 0;
      for (const e of G.ents) if (e !== boss && e.kind === 'enemy' && !e.dead) { e.dead = true; S.FX.gibs(e, e.look, 0); }
      if (G.player) G.player.inv = 99;
      if (S.Music) S.Music.stop(0.15);
      for (const s of S.Shots.list) if (s.team !== 'player') s.dead = true;
      if (S.Bosses && S.Bosses.deathSequence) { try { S.Bosses.deathSequence(boss); return; } catch (e) { console.error(e); } }
      G.playBossDeath(boss);
    },
    playBossDeath(boss) {
      boss._dying = true; boss.dead = false; boss.noHurt = true;
      G.bossDeath = { boss, t: 0, stage: 0, nextBoom: 0 };
    },
    onBossDead(boss) {
      G.bossDeath = null; boss.dead = true; boss._dying = false;
      if (S.Save && S.Save.data) { /* banked at finish */ }
      const bonus = 400 + 150 * (S.Save ? S.Save.beatenCount() : 0);
      G.bossGold = bonus;
      for (let i = 0; i < 18; i++) S.Game.spawn(S.Ents.gold(boss.x + U.rand(-30, 30), boss.y - boss.h / 2, i % 4 === 0 ? 20 : 5, U.rand(-160, 160), U.rand(-480, -200)));
      G.state = 'chopper'; G.stateT = 0;
      if (G.player) G.player.inv = 99;
      const a = G.level.arena;
      const hy = a.y1 - 190, px = G.player ? G.player.x : a.bossX;
      let hx = Math.min(a.x1 - 60, Math.max(a.x0 + 60, px + 40));
      for (let k = 0; k < 24; k++) { // prefer a column that is open all the way down to the arena floor
        const cx = Math.min(a.x1 - 60, Math.max(a.x0 + 60, px + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 40));
        const g = S.Terrain.groundBelow(cx, hy + 10, 900);
        if (g != null && g >= a.y1 - 4) { hx = cx; break; }
      }
      G.chopper = S.Ents.chopper(hx, hy); G.chopper.floorY = a.y1;
      G.spawn(G.chopper);
      if (S.Music) S.Music.play(G.themeObj.id === 'fortress' ? 'title' : (G.themeObj.music || G.levelId), { fade: 0.4 });
      if (S.Voice) S.Voice.say('announcer', 'bossdead', { force: true });
    },
    chopperGrab() {
      G.state = 'clear'; G.stateT = 0;
      word('GET TO THE CHOPPA!', G.cam.w / 2, 130, { size: 34, color: '#ffe14d', burst: true, burstColor: '#e8173a', life: 1.6, screen: true, vy: 0 });
    },
    finish(win) {
      if (G.finished) return; G.finished = true;
      const save = S.Save.data, id = G.levelId;
      const time = G.time;
      let earned = G.gold + (win ? (G.bossGold || 0) : 0), kept = earned;
      let newBest = false, firstClear = false, newSuper = null;
      if (win) {
        const par = 420; const bonus = 200 + Math.max(0, Math.round((par - time) * 1.5));
        earned += bonus; kept = earned;
        firstClear = !save.beaten[id]; save.beaten[id] = true;
        if (!save.best[id] || time < save.best[id]) { save.best[id] = Math.round(time * 10) / 10; newBest = true; }
        if (firstClear && S.Supers) for (const k in S.Supers) { const sd = S.Supers[k]; if (sd && (sd.themeId || k) === id) newSuper = k; }
        if (newSuper && Array.isArray(save.loadout) && save.loadout.length < 3 && save.loadout.indexOf(newSuper) < 0) save.loadout.push(newSuper); // auto-equip into a free slot
      } else kept = Math.floor(earned * 0.5);
      save.gold += kept; save.stats.gold += kept; save.stats.rescues += G.rescues;
      S.Save.save(true);
      const result = { dude: G.player && G.player.dude || null, theme: id, time, kills: G.kills, gold: kept, rescues: G.rescues, bossBeaten: !!win, newSuper, firstClear, newBest, earned };
      if (S.Main) S.Main.mode = 'menu';
      if (S.Input) S.Input.lockMouse(false);
      ui(win ? 'onLevelClear' : 'onLevelFail', result);
      if (S.Music) S.Music.play('select', { fade: 0.5 });
    },

    // ---------------- main update ----------------
    update(dt) {
      const FX = S.FX;
      FX.tick(dt);
      if (FX.stopT > 0) { if (S.Comic) S.Comic.update(dt * 0.1); return; }
      dt *= FX.slowScale;
      if (S.UI && S.UI.isOpen && S.UI.isOpen()) return;
      const I = S.Input;
      G.time += dt; G.stateT += dt;
      if (G.killT > 0) G.killT -= dt; if (G.goldPop && G.goldPop.t > 0) G.goldPop.t -= dt;
      if (G.state === 'intro' && G.stateT > 0.9) G.state = 'play';
      if (I.pressed('pause') && (G.state === 'play' || G.state === 'boss' || G.state === 'chopper' || G.state === 'intro')) { G.pause(); return; }
      if (G.state === 'bossintro' || G.state === 'none' || G.state === 'loading') { if (S.Comic) S.Comic.update(dt); return; }
      const p = G.player, lv = G.level;
      G._rebuildHostile();
      // wind (theme gust helper)
      G.wind = null;
      if (S.Themes && S.Themes.gust && G.themeObj.wind && p && !p.dead) {
        const g = S.Themes.gust(G.themeObj, G.time); G.wind = g;
        if (g.ax) p.windX += g.ax * (p.onGround ? 0.45 : 1);
        if (g.phase === 'warn' && !G._warned) { G._warned = true; word('GUST INCOMING!', G.cam.w / 2, 90, { size: 20, color: '#ffffff', screen: true, vy: 0, life: 1 }); }
        if (g.phase !== 'warn') G._warned = false;
      }
      // boss trigger
      if (lv.arena && !G.bossStarted && p && !p.dead && p.x > lv.arena.x0 + 90 && p.y > lv.arena.y0 && G.state === 'play') G.startBoss();
      // update entities
      const c = G.cam, cx = c.x + c.w / 2, cy = c.y + c.h / 2;
      const ax = C.ACTIVE_X + c.w / 2, ay = C.ACTIVE_Y + c.h / 2;
      const list = G.ents;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.dead || !e.update) continue;
        if (!e.always && e.kind !== 'player' && (Math.abs(e.x - cx) > ax || Math.abs(e.y - cy) > ay)) continue;
        try { e.update(dt); } catch (err) { console.error('[ent update]', e.id || e.kind, err); e.dead = true; }
      }
      // remove the dead (keep dead player until respawn)
      let w = 0;
      for (let i = 0; i < list.length; i++) { const e = list[i]; if (!e.dead || (e.kind === 'player' && e === G.player && !e.hidden)) list[w++] = e; else if (e.kind === 'player' && e.hidden) { /* dropped */ } }
      list.length = w;
      if (G.bossDeath) G.updateBossDeath(dt);
      S.Shots.update(dt); FX.update(dt); if (S.Comic) S.Comic.update(dt);
      if (S.Voice && S.Voice.update) S.Voice.update(dt);
      // respawn / fail
      if (G.player && G.player.dead && G.state !== 'clear' && G.state !== 'fail') {
        G.respawnT -= dt;
        if (G.respawnT <= 0) {
          let next = -1;
          for (let k = 1; k <= G.team.length; k++) { const j = (G.teamIdx + k) % G.team.length; if (!G.team[j].dead) { next = j; break; } }
          if (S.Save.data.cheats.infLives && next < 0) next = G.teamIdx;
          if (next < 0 && G.bonusLives > 0) { G.bonusLives--; const d = G.team.findIndex((m) => m.dead); G.team[d].dead = false; next = d; word('BRO INSURANCE!', G.cam.w / 2, 120, { size: 26, color: '#7dff6b', screen: true, vy: 0, life: 1.4, burst: true, burstColor: '#141018' }); }
          if (next >= 0) {
            const cp = G.state === 'boss' || G.bossStarted ? { x: lv.arena.entryX, y: lv.arena.entryY } : G.checkpoint;
            G.spawnPlayer(next, cp.x, cp.y, !(G.bossStarted));
            G.snapCamera();
          } else if (G.state !== 'fail') { G.state = 'fail'; G.stateT = 0; word('ALL DUDES DOWN!', G.cam.w / 2, 140, { size: 36, color: '#ff3b3b', screen: true, vy: 0, life: 2, burst: true, burstColor: '#ffffff' }); if (S.Music) S.Music.stop(0.4); }
        }
      }
      if (G.state === 'fail' && G.stateT > 2.2) G.finish(false);
      if (G.state === 'clear' && G.stateT > 2.0) G.finish(true);
      // capsules
      if ((G.state === 'play') && G.player && !G.player.dead) {
        G.capT -= dt;
        if (G.capT <= 0) { G.capT = U.rand(26, 40); const fromR = Math.random() < 0.6; G.spawn(S.Ents.capsule(fromR ? c.x + c.w + 30 : c.x - 30, c.y + U.rand(80, 170), fromR ? -1 : 1)); }
      }
      G.updateCamera(dt);
    },
    updateCamera(dt) {
      const c = G.cam, p = G.player; if (!p) return;
      c.w = S.Main ? S.Main.W : c.w; c.h = C.VIEW_H;
      if (G.state === 'bossdeath' && G.bossDeath) { /* hold */ }
      let tx = p.x + (p.dead ? 0 : (p.camLeadX != null ? p.camLeadX : p.facing * 55) + (p.vx || 0) * 0.15) - c.w / 2; // aim: camLeadX follows the 360-degree aim
      let ty = c.y;
      const py = p.y - 40;
      const mid = c.y + c.h * 0.55, dz = 46;
      if (py < mid - dz) ty = py - (c.h * 0.55 - dz); else if (py > mid + dz) ty = py - (c.h * 0.55 + dz);
      if (!p.dead) ty += (p.camLeadY != null && p.aimMode !== 'keys' ? p.camLeadY : (p.aim === 'up' ? -40 : 0)); // aim: look toward where you aim
      const bs = G.boss;
      if (G.bossStarted && bs && !bs.dead && (G.state === 'boss' || G.state === 'bossdeath')) {
        tx = U.clamp((p.x + bs.x) / 2 - c.w / 2, p.x - c.w + 110, p.x - 110);
        const by = (p.y + bs.y) / 2 - 90; ty = Math.min(ty, by);
      }
      const kx = Math.min(1, dt * 5.5), ky = Math.min(1, dt * (p.onGround ? 3.5 : 6));
      c.x += (tx - c.x) * kx; c.y += (ty - c.y) * ky;
      G.clampCam();
    },
    updateBossDeath(dt) {
      const d = G.bossDeath, b = d.boss; d.t += dt;
      const t = d.t, FX = S.FX;
      const bx = b.x, by = b.y - b.h / 2;
      if (d.stage === 0 && t >= 0) { d.stage = 1; d.fl = 0; }
      // FLASH-CRASH x2 (0..0.9), BURN BURN (0.9..3.3), EXPLODE (3.3)
      if (t < 0.9) {
        const k = Math.floor(t / 0.45);
        if (k >= d.fl) { d.fl = k + 1; FX.flash('#ffffff', 0.12); FX.shake(0.5); FX.hitstop(0.04); sfx('crash', { x: bx }); word('KRAAASH!', bx + U.rand(-30, 30), by + U.rand(-30, 10), { size: 28, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a' }); }
        b._white = (t % 0.45) < 0.14 ? 1 : 0; b._burn = 0;
      } else if (t < 3.3) {
        b._white = 0; b._burn = Math.min(1, (t - 0.9) / 0.5); b._dissolve = U.clamp((t - 1.3) / 1.9, 0, 1);
        d.nextBoom -= dt;
        if (d.nextBoom <= 0) {
          d.nextBoom = 0.11;
          const ex = bx + U.rand(-b.w / 2, b.w / 2), ey = b.y - b.h * (1 - b._dissolve) * U.rand(0.1, 1);
          FX.explosion(ex, ey, U.rand(22, 38)); FX.shake(0.2); sfx('explode', { x: ex, vol: 0.5, pitch: U.rand(0.9, 1.3) });
          if (Math.random() < 0.3) word(U.pick(['BOOM', 'KRAK', 'FWOOSH', 'BLAM']), ex, ey - 16, { size: 20, color: '#ffe14d', stroke: '#e8173a' });
          FX.fire(ex, ey, 3);
        }
      } else if (d.stage < 3) {
        d.stage = 3;
        b._dissolve = 1; b._white = 0;
        for (let i = 0; i < 5; i++) FX.explosion(bx + U.rand(-40, 40), by + U.rand(-40, 40), U.rand(50, 90));
        FX.flash('#ffffff', 0.25); FX.shake(1); FX.slowmo(0.35, 0.7); FX.hitstop(0.08);
        word('KA-DOOOOSH!!!', bx, by - 20, { size: 54, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a', life: 1.6, vy: -20 });
        sfx('bigboom', { x: bx });
        FX.gibs(b, b.look, 0);
        if (S.Input) S.Input.vibrate(500, 1);
      } else if (t > 4.4) G.onBossDead(b);
    },

    // ---------------- drawing ----------------
    drawEntities(ctx) {
      const c = G.cam, x0 = c.x - 120, x1 = c.x + c.w + 120, y0 = c.y - 140, y1 = c.y + c.h + 140;
      const layers = [[], [], [], []];
      for (const e of G.ents) {
        if (e.dead && !(e._dying)) continue;
        if (!e.always && (e.x < x0 || e.x > x1 || e.y < y0 || e.y > y1 + 120)) continue;
        if (!e.draw) continue;
        const l = e.kind === 'player' ? 3 : (e.kind === 'enemy' || e.kind === 'boss') ? 2 : (e.kind === 'npc') ? 1 : 0;
        layers[l].push(e);
      }
      for (const L of layers) for (const e of L) {
        try {
          if (e._dying) drawDying(ctx, e);
          else if (e.sinkY > 0.5 && e.sinkSurf != null) { ctx.save(); ctx.beginPath(); ctx.rect(e.x - 120, e.y - 400, 240, e.sinkSurf - (e.y - 400)); ctx.clip(); ctx.translate(0, e.sinkY); e.draw(ctx); ctx.restore(); }
          else e.draw(ctx);
        } catch (err) { console.error('[ent draw]', e.id || e.kind, err); e.dead = true; }
      }
    },
  };

  // draws a dying boss through a scratch canvas: white flash, burn tint, scanline dissolve (FF6 style)
  let scratch = null;
  function drawDying(ctx, e) {
    if (!scratch) { scratch = document.createElement('canvas'); scratch.width = 640; scratch.height = 560; }
    const g = scratch.getContext('2d'), W = 640, H = 560;
    const ox = e.x - W / 2, oy = e.y - H + 80;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    g.setTransform(1, 0, 0, 1, -ox, -oy);
    e.draw(g);
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (e._burn > 0 || e._white) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = e._white ? '#ffffff' : 'rgba(255,' + Math.round(120 - e._burn * 70) + ',20,' + (0.35 + e._burn * 0.4) + ')';
      g.fillRect(0, 0, W, H);
      g.globalCompositeOperation = 'source-over';
    }
    let top = 0;
    if (e._dissolve > 0) { // dissolve from the top down with scanline stripes
      const cutY = (e.y - e.h - 20 - oy) + (e.h + 40) * e._dissolve;
      g.globalCompositeOperation = 'destination-out';
      g.fillRect(0, 0, W, Math.max(0, cutY));
      for (let yy = cutY; yy < cutY + 26; yy += 4) g.fillRect(0, yy, W, 2);
      g.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(scratch, ox, oy);
  }

  function fallbackBoss(x, y) {
    const def = Object.assign({}, S.EnemyDefs.grunt, { name: 'BIG BOSS', hp: 40, w: 28, h: 58, burst: 3, burstGap: 0.12, windup: 0.4, cooldown: [0.9, 1.5], shotDmg: 1, gold: [0, 0], panics: false, sight: 900, range: [200, 420] });
    const look = Object.assign({}, S.EnemyDefs.grunt.look, { scale: 1.9, limb: '#e8173a' });
    S.EnemyDefs._fallbackBoss = def;
    const e = S.Enemies.make('_fallbackBoss', x, y, { look });
    e.kind = 'boss'; e.team = 'enemy'; e.alerted = true; e.state = 'attack';
    e.hurt = function (dmg, src, info) {
      if (this.dead || this.noHurt) return true;
      this.hp -= dmg; this.flash = 0.08;
      if (S.FX) S.FX.spark(this.x, this.y - 30, 3, '#ffffff');
      if (this.hp <= 0 && !this._dying) { this.maxHp = this.maxHp; G.onBossDying(this); }
      return true;
    };
    e.die = function () { if (!this._dying) G.onBossDying(this); };
    return e;
  }

  // ---------------- level spawning ----------------
  function spawnSpec(sp) {
    const E = S.Ents;
    switch (sp.type) {
      case 'enemy': {
        const id = S.EnemyDefs[sp.id] ? sp.id : 'grunt';
        G.spawnEnemy(id, sp.x, sp.y, { facing: sp.facing || -1, perch: sp.perch, air: sp.air, water: sp.water, srcId: sp.id });
        break;
      }
      case 'crate': G.spawn(E.crate(sp.x, sp.y, sp.loot)); break;
      case 'barrel': G.spawn(E.barrel(sp.x, sp.y)); break;
      case 'cage': G.spawn(E.cage(sp.x, sp.y)); break;
      case 'flag': G.spawn(E.flag(sp.x, sp.y)); break;
      case 'goldbar': { const g = E.goldbar(sp.x, sp.y); g.vx = 0; g.vy = 0; g.noGrav = true; g.noTerrain = true; g.hiddenBar = !!sp.hidden; g.life = 1e9; G.spawn(g); break; }
      case 'pickup': G.spawn(E.pickup(sp.x, sp.y, sp.id)); break;
      case 'hazard': { const h = makeHazard(sp); if (h) G.spawn(h); break; }
      default: break;
    }
  }

  function makeHazard(sp) {
    const H = S.Hazards || {}, E = S.Ents;
    const id = sp.id;
    if (id === 'icicle' && H.icicle) return H.icicle({ x: sp.x, y: sp.y + 18 });
    if (id === 'firejet' && H.firejet) return H.firejet({ x: sp.x, y: sp.y, period: sp.period, phase: sp.phase });
    if (id === 'rockslide' || id === 'log') return rollerSpawner(sp, id);
    if (id === 'updraft') return zoneEntity(sp, (p, dt) => { p.vy -= C.GRAV * 1.4 * dt * (G.grav); if (p.vy < -330) p.vy = -330; p.onGround = false; });
    if (id === 'stampede') return stampede(sp);
    if (id === 'quicksand') return quicksand(sp);
    if (typeof H[id] === 'function') return H[id](sp);
    return null;
  }
  // quicksand: a band over MUD tiles. Everything standing in it moves at 0.6x, jumps at 0.8x and visibly sinks (up to 14 px, tiles stay solid so it is never lethal)
  function quicksand(sp) {
    const x0 = sp.x0 != null ? sp.x0 : sp.x, x1 = sp.x1 != null ? sp.x1 : sp.x + 4 * C.T, sy = sp.y;
    function grab(e, dt, me) {
      const inside = !e.dead && e.x > x0 && e.x < x1 && Math.abs(e.y - sy) < 4 && e.onGround;
      if (inside) { e.zoneSlow = 0.6; e.zoneJump = 0.8; e.zoneT = 0.15; e.sinkY = Math.min(14, (e.sinkY || 0) + 25 * dt); e.sinkSurf = sy; e.sinkOwner = me; return true; }
      if (e.sinkY > 0 && e.sinkOwner === me) e.sinkY = Math.max(0, e.sinkY - 70 * dt);
      return false;
    }
    return { kind: 'hazard', id: 'quicksand', team: 'neutral', x: (x0 + x1) / 2, y: sy, w: x1 - x0, h: 2 * C.T, t: 0, gloop: U.rand(1, 3), dead: false,
      update(dt) {
        this.t += dt; const p = G.player;
        const list = [p]; for (const e of G.ents) if (e.kind === 'enemy' && !e.isBoss && !e.dead && Math.abs(e.x - this.x) < this.w / 2 + 40) list.push(e);
        let any = false;
        for (const e of list) { if (e && grab(e, dt, this)) any = true; }
        if (any && (this.gloop -= dt) <= 0) { this.gloop = U.rand(1.4, 3); if (S.Comic && p) S.Comic.word('GLOOP', p.x + U.rand(-30, 30), sy - 18, { size: 15, color: '#c9a070', stroke: '#2a1a0a', life: 0.6 }); }
      },
      draw(ctx) {
        const t = this.t, h = C.T * 2;
        ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#3a2410'; ctx.fillRect(x0, sy, x1 - x0, h); ctx.globalAlpha = 1;
        ctx.fillStyle = '#5a3d1c'; ctx.fillRect(x0, sy, x1 - x0, 3);
        ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.fillStyle = '#7a5428';
        const n = Math.max(2, Math.round((x1 - x0) / 22));
        for (let i = 0; i < n; i++) { const ph = (t * 0.7 + i * 0.37) % 1, bx = x0 + (i + 0.5) * (x1 - x0) / n, by = sy + 4 + ph * 10, r = 2 + ph * 3; ctx.globalAlpha = 1 - ph * 0.6; ctx.beginPath(); ctx.arc(bx, by, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
        ctx.restore();
      } };
  }
  // mud puddle: left by mud-man pies. Non-damaging, slows the player to 0.5x while they stand in it for ~2.5 s
  function mudPuddle(x, y) {
    let n = 0; for (const e of G.ents) if (e.id === 'mudpuddle' && !e.dead) { n++; if (n >= 5) { e.dead = true; } }
    return G.spawn({ kind: 'hazard', id: 'mudpuddle', team: 'neutral', x, y, w: 56, h: 8, t: 0, life: 2.5, dead: false,
      update(dt) {
        this.t += dt; if (this.t >= this.life) { this.dead = true; return; }
        const p = G.player; if (!p || p.dead) return;
        if (Math.abs(p.x - this.x) < this.w / 2 + 4 && Math.abs(p.y - this.y) < 8) { p.zoneSlow = 0.5; p.zoneJump = 1; p.zoneT = 0.15; }
      },
      draw(ctx) {
        const k = this.t / this.life, w = this.w * Math.min(1, this.t * 6) * (1 - Math.max(0, k - 0.8) * 2.5), x = this.x, y = this.y;
        ctx.beginPath(); ctx.ellipse(x, y - 2, w / 2, 5, 0, 0, Math.PI * 2); ctx.fillStyle = '#7a5a2f'; ctx.fill(); ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#a07a46'; ctx.beginPath(); ctx.ellipse(x - w * 0.15, y - 3, w * 0.12, 2, 0, 0, Math.PI * 2); ctx.fill();
        if (Math.sin(this.t * 6) > 0.7) { ctx.beginPath(); ctx.arc(x + w * 0.1, y - 7, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#7a5a2f'; ctx.fill(); ctx.stroke(); }
      } });
  }
  G.mudPuddle = mudPuddle;
  function zoneEntity(sp, fn) {
    return { kind: 'hazard', team: 'neutral', x: sp.x, y: sp.y, w: sp.w || 60, h: sp.h || 200, t: 0, always: false, dead: false,
      update(dt) { this.t += dt; const p = G.player; if (p && !p.dead && U.overlap(this, p, 0)) fn(p, dt); },
      draw(ctx) {
        ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) { const ph = (this.t * 0.9 + i * 0.21) % 1, xx = this.x - this.w / 2 + (i + 0.5) * this.w / 5, yy = this.y - ph * this.h; ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, yy - 14); ctx.stroke(); }
      } };
  }
  function rollerSpawner(sp, id) {
    return { kind: 'hazard', team: 'neutral', x: sp.x, y: sp.y, w: 4, h: 4, t: U.rand(0, 2), dead: false, period: sp.period || 4, dir: sp.dir || -1,
      update(dt) {
        this.t += dt;
        const p = G.player;
        if (!p || p.dead || Math.abs(p.x - this.x) > 700) return;
        // fairness audit: a roller never appears right in front of the player (needs >= 120 px = 0.7 s of visible approach); a dust puff warns 0.5 s ahead
        if (this.period - this.t < 0.5 && !this.warned) { this.warned = true; if (S.FX) S.FX.dust(this.x, this.y, 5); }
        if (this.t >= this.period) { if ((p.x - this.x) * this.dir > 0 && Math.abs(p.x - this.x) < 120) { this.t = this.period - 0.3; return; } this.t = 0; this.warned = false; G.spawn(roller(this.x, this.y - 12, this.dir, id === 'log')); }
      }, draw() {} };
  }
  function roller(x, y, dir, log) {
    return { kind: 'hazard', team: 'neutral', x, y, w: 22, h: 22, vx: dir * 150, vy: 0, t: 0, rot: 0, dead: false, life: 9, noStep: true,
      update(dt) {
        this.t += dt; this.life -= dt; this.rot += this.vx * dt / 11;
        S.Phys.move(this, dt);
        if (this.onGround) this.vx = U.approach(this.vx, dir * 170, 200 * dt);
        if (this.hitWall || this.life <= 0 || this.fellOut) { this.dead = true; if (S.FX) { S.FX.debris(this.x, this.y - 10, 6, log ? '#8b5a2b' : '#8a8ca0'); S.FX.dust(this.x, this.y, 5); } return; }
        const p = G.player;
        if (p && !p.dead && U.overlap(this, p, -2)) p.hurt(1, this, { dirX: U.sign(p.x - this.x) || 1, kind: 'hazard' });
        for (const e of G.hostiles('neutral')) if (e.team === 'enemy' && !e.dead && U.overlap(this, e, -2)) G.damage(e, 2, { team: 'neutral', dirX: U.sign(this.vx), kind: 'hazard' });
      },
      draw(ctx) {
        ctx.save(); ctx.translate(this.x, this.y - 11); ctx.rotate(this.rot);
        ctx.beginPath(); ctx.arc(0, 0, 11, 0, U.TAU); ctx.fillStyle = log ? '#b0672f' : '#9a96b0'; ctx.fill(); ctx.lineWidth = 2.4; ctx.strokeStyle = INK; ctx.stroke();
        ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(6, 3); ctx.moveTo(-2, 6); ctx.lineTo(4, -6); ctx.stroke();
        ctx.restore();
      } };
  }
  function stampede(sp) {
    return { kind: 'hazard', team: 'neutral', x: sp.x, y: sp.y, w: 4, h: 4, dead: false, fired: false,
      update() {
        const p = G.player;
        if (this.fired || !p || p.dead || p.x < this.x - 400) return;
        this.fired = true; this.dead = true;
        const id = S.EnemyDefs.cow ? 'cow' : 'dog';
        const c = G.cam;
        for (let i = 0; i < (sp.count || 4); i++) G.spawnEnemy(S.EnemyDefs[id] ? id : 'grunt', c.x + c.w + 40 + i * 140, sp.y, { facing: -1, charge: true, vx: -260 }); // fairness audit: 140 px apart (was 50) so every cow is its own jump
        word('STAMPEDE!', c.x + c.w - 120, sp.y - 70, { size: 30, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#ffe14d' });
      }, draw() {} };
  }

  function testLevel() {
    const w = 170, h = 36, tiles = new Uint8Array(w * h), T = C.T, M = S.Terrain.MAT;
    for (let x = 0; x < w; x++) for (let y = 28; y < h; y++) tiles[y * w + x] = y === 28 ? M.DIRT : M.DIRT;
    for (let y = 0; y < h; y++) { tiles[y * w] = M.BEDROCK; tiles[y * w + w - 1] = M.BEDROCK; }
    for (let x = 30; x < 36; x++) for (let y = 22; y < 28; y++) tiles[y * w + x] = M.DIRT;
    for (let x = 50; x < 58; x++) tiles[24 * w + x] = M.PLAT;
    for (let y = 18; y < 28; y++) tiles[y * w + 70] = M.ROCK;
    const ents = [{ type: 'enemy', id: 'grunt', x: 600, y: 28 * T }, { type: 'enemy', id: 'grunt', x: 900, y: 28 * T }, { type: 'barrel', x: 520, y: 28 * T }, { type: 'cage', x: 1200, y: 28 * T }, { type: 'flag', x: 800, y: 28 * T }, { type: 'crate', x: 400, y: 28 * T, loot: 'spread' }];
    return { id: 'default', theme: 'default', w, h, T, tiles, spawn: { x: 120, y: 28 * T }, ents, flags: [], arena: null, water: null, gravity: 1 };
  }
})();
