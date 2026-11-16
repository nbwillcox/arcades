// Stick Doosh - enemies.js (cast agent): the full enemy roster on a small shared framework.
//
// Framework: SGS.Enemies.make(id,x,y,opts) builds an entity from SGS.EnemyDefs[id] on the shared Base prototype.
//   def fields (common): name hp w h speed runSpeed gun ai sight gold windup burst burstGap cooldown[a,b] range[min,max] shotSpeed shotDmg
//     alert[] look{} themed(bool: re-skinned per theme) attacks[] stationary flies grav dmgMul fireproof panics gibs deathWords[]
//   def.ai = 'soldier' | 'charger' | 'hopper' | function(e,dt) | any key of SGS.Enemies.AI.
//   hooks: def.init(e,opts) def.update(e,dt) def.onHurt(e,dmg,src,info)->false blocks / number rescales  def.beforeDie(e,info)->true cancels death
//          def.onDeath(e,info)  def.draw(ctx,e) (custom draw)  def.drawAfter(ctx,e)  def.hitTest(e,x,y,pad)
//   attack = {id, range:[min,max], windup, cooldown:[a,b], need(e,p), start(e,p), tick(e,dt,p,k), fire(e,p)}  (every attack is telegraphed:
//     the '!' burst + yell face during the windup). Gun attacks: Enemies.gunAttack().
// Fairness rule: every shot/charge has a 0.35-0.9 s wind-up; nothing but the brute has more than 3 hp (regular enemies 1-2; turrets 3; brute 6); the shield is ablative (3 chip hits, then CRACK).
// Killability rules (user feedback: 'some enemies seem indestructible'): hurtbox >= 26 px tall (chest-high shots), no immunity of any kind, skeleton reassembles once and any hit on the pile kills it,
//   flyers swoop to chest height, perched shooters stand on the near edge, nobody spawns buried or behind a stub wall, every hit flashes + pops a word, 3+ hp shows pips. tools/ttktest.js proves it.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';
  let uid = 1000;
  const HIT_MIN_H = 26; // killability: every enemy can be hit by a chest-high (muzzle ~19 px above the feet) shot, even the snakes and dogs

  // ================= helpers =================
  function sfx(n, o) { if (S.Audio && S.Audio.sfx) S.Audio.sfx(n, o); }
  function word(t, x, y, o) { return S.Comic ? S.Comic.word(t, x, y, o) : null; }
  function player() { const p = S.Game && S.Game.player; return p && !p.dead && !p.hidden ? p : null; }
  function diff() { return (S.Game && S.Game.difficulty) || { enemyRate: 1, dmgMul: 1 }; }
  function grav() { return C.GRAV * ((S.Game && S.Game.grav) || 1); }
  function say(e, text, life) { if (S.Comic) S.Comic.bubble(text, e.x, e.y - 40, { follow: e, life: life || 1, speaker: 'e' + e.uid, shout: true }); }
  function solidAt(x, y) { const T = S.Terrain; return !!(T && T.W && T.solidPx(x, y)); }
  function boxBlocked(x, y, hw, h) { return solidAt(x - hw, y - 1) || solidAt(x + hw, y - 1) || solidAt(x - hw, y - h) || solidAt(x + hw, y - h) || solidAt(x, y - h * 0.5); }
  // killability: never spawn buried in a block (the shots would never reach it)
  function unbury(e) {
    const T = S.Terrain; if (!T || !T.W) return;
    const hw = e.w / 2;
    if (!boxBlocked(e.x, e.y, hw, e.h)) return;
    for (let dy = 2; dy <= 80; dy += 2) if (!boxBlocked(e.x, e.y - dy, hw, e.h)) { e.y -= dy; return; }
  }
  // killability: nobody spawns tucked right behind a thin chest-high wall / pillar / stub (it would eat every flat shot): hop to the open side of it
  function clearFront(e) {
    const T = S.Terrain; if (!T || !T.W) return;
    const f = e.facing, hw = e.w / 2, cy = e.y - Math.min(e.h * 0.6, 20);
    const walled = (x) => solidAt(x + f * (hw + 5), cy) || solidAt(x + f * (hw + 14), cy) || solidAt(x + f * (hw + 24), cy);
    if (!walled(e.x)) return;
    for (let dx = 8; dx <= 110; dx += 4) {
      const nx = e.x + f * dx;
      if (boxBlocked(nx, e.y, hw, e.h) || !supported(nx - hw + 1, e.y) || !supported(nx + hw - 1, e.y)) continue;
      if (!walled(nx)) { e.x = nx; return; }
    }
  }
  function supported(x, y) { const T = S.Terrain, m = T.get(Math.floor(x / C.T), Math.floor((y + 2) / C.T)), P = T.PROPS[m]; return !!(P && (P.solid || P.oneway)); }
  // killability: stationary perched shooters (snipers, nests, monkeys, rock throwers) stand on the near (left) edge of their perch, so a
  // player on the ground can actually see + shoot them instead of them hiding behind the lip of a tower / wall top
  function perchToEdge(e) {
    const T = S.Terrain; if (!T || !T.W) return;
    const hw = Math.max(e.w, e.def.hitW || 0) / 2; let best = e.x;
    for (let nx = e.x - 4; nx > e.x - 300; nx -= 4) {
      if (!supported(nx - hw + 1, e.y) || boxBlocked(nx, e.y, hw, e.h)) break;
      best = nx;
    }
    e.x = best;
  }
  function inWater(x, y) {
    const T = S.Terrain; if (!T || !T.W) return false;
    const m = T.get(Math.floor(x / C.T), Math.floor(y / C.T));
    if (T.PROPS[m] && T.PROPS[m].liquid) return true;
    return !!(S.Phys && S.Phys.liquidHook && S.Phys.liquidHook({ x, y, h: 0 }));
  }
  function fc(e, col) { return e.flash > 0 ? '#ffffff' : e.frozen > 0 ? '#bfefff' : (e.burn > 0 && !e.def.fireproof) ? '#ff9a4a' : col; }
  function lobVel(x0, y0, x1, y1, tt) { const g = grav(); return { vx: (x1 - x0) / tt, vy: (y1 - y0 - 0.5 * g * tt * tt) / tt }; }

  // flying bodies: move with a box test against terrain (ghosts pass through)
  function moveFlier(e, dt) {
    const d = e.def;
    e.hitWall = 0;
    if (d.ghost || !S.Terrain || !S.Terrain.W) { e.x += e.vx * dt; e.y += e.vy * dt; return; }
    const hw = e.w / 2, h = e.h;
    let nx = e.x + e.vx * dt;
    if (boxBlocked(nx, e.y, hw, h)) { e.hitWall = e.vx >= 0 ? 1 : -1; e.vx *= -0.25; nx = e.x; }
    e.x = nx;
    let ny = e.y + e.vy * dt;
    if (boxBlocked(e.x, ny, hw, h)) { e.bonkY = e.vy >= 0 ? 1 : -1; e.vy *= -0.25; ny = e.y; } else e.bonkY = 0;
    e.y = ny;
    const T = S.Terrain;
    if (e.y > T.H * C.T + 60) e.fellOut = true;
  }
  function steer(e, tx, ty, acc, maxV, dt) {
    const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 40);
    e.vx = U.approach(e.vx, dx / d * maxV * k, acc * dt); e.vy = U.approach(e.vy, dy / d * maxV * k, acc * dt);
  }

  // ----- projectiles: plain bullets + custom lobbed things (coconuts, snowballs, boulders...) -----
  function bulletAt(e, tx, ty, o) {
    o = o || {};
    const mx = o.mx != null ? o.mx : e.muzzleX != null ? e.muzzleX : e.x + e.facing * 10, my = o.my != null ? o.my : e.muzzleY != null ? e.muzzleY : e.y - e.h * 0.6;
    const a = Math.atan2(ty - my, tx - mx) + U.rand(-1, 1) * (o.spread == null ? 0.04 : o.spread), sp = o.speed || 330;
    const s = S.Shots.spawn('bullet', mx, my, Math.cos(a) * sp, Math.sin(a) * sp, 'enemy', { dmg: o.dmg || e.shotDmg || 1, life: o.life || 1.7, tileDmg: 0.5, owner: e });
    sfx(o.sfx || 'pistol', { x: mx, vol: 0.45 });
    if (o.word !== false && Math.random() < 0.55) word(o.word || 'PEW', mx + e.facing * 8, my - 10, { size: 12, color: '#ffffff', life: 0.35 });
    e.recoil = 1; e.muzzleFlash = 1;
    return s;
  }
  function shotUpdate(s, dt) {
    const g = S.Game, T = S.Terrain;
    if (s.grav) s.vy += grav() * s.grav * dt;
    if (s.homing) {
      const tg = s.team === 'player' ? g.nearestEnemy(s.x, s.y, 'player', 380) : player();
      if (tg) { const want = Math.atan2((tg.y - (tg.h || 30) * 0.5) - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx); let da = want - cur; while (da > Math.PI) da -= U.TAU; while (da < -Math.PI) da += U.TAU; const na = cur + U.clamp(da, -s.homing * dt, s.homing * dt), v = Math.hypot(s.vx, s.vy); s.vx = Math.cos(na) * v; s.vy = Math.sin(na) * v; }
    }
    s.rot += (s.spin || 0) * dt;
    if (s.trailFx && S.FX && Math.random() < 0.5) S.FX.add({ x: s.x, y: s.y, vx: U.rand(-20, 20), vy: U.rand(-20, 20), life: 0.3, kind: s.trailFx, size: 3, grow: 6, color: s.color, drag: 2 });
    const dist = Math.hypot(s.vx, s.vy) * dt, n = Math.max(1, Math.ceil(dist / 6));
    for (let k = 0; k < n && !s.dead; k++) {
      const nx = s.x + s.vx * dt / n, ny = s.y + s.vy * dt / n;
      if (!s.ghost && T && T.W && T.solidPx(nx, ny)) {
        if (s.bounce && s.bounces < s.bounce) { s.bounces++; if (T.solidPx(nx, s.y)) s.vx *= -0.6; else { s.vy *= -0.5; s.vx *= 0.8; } sfx('bounce', { x: s.x, vol: 0.3 }); break; }
        shotBreak(s, nx, ny); break;
      }
      s.x = nx; s.y = ny;
      const list = g.hostiles(s.team);
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (e.dead || (e === s.owner && s.age < 0.2) || !U.pointIn(e, s.x, s.y, s.r)) continue;
        if (s.team === 'enemy' && e.kind !== 'player') continue;
        if (s.blast) { shotBreak(s, s.x, s.y); break; }
        const ok = g.damage(e, s.dmg, { team: s.team, owner: s.owner, kind: 'bullet', dirX: U.sign(s.vx), x: s.x, y: s.y, knock: s.knock });
        if (s.onHit) s.onHit(s, e, ok);
        s.dead = true;
        if (s.style === 'mud' && S.Game.mudPuddle && e.kind === 'player') S.Game.mudPuddle(e.x, e.y);
        if (ok === false && S.FX) S.FX.spark(s.x, s.y, 3, '#ffffff');
        if (s.splat && S.FX) { S.FX.debris(s.x, s.y, 4, s.color); if (ok !== false) word(s.splat, s.x, s.y - 12, { size: 16, color: s.color, stroke: '#ffffff' }); }
        break;
      }
    }
    if (s.life <= 0 && !s.dead) shotBreak(s, s.x, s.y);
  }
  function shotBreak(s, x, y) {
    if (s.dead) return;
    s.dead = true;
    const g = S.Game, T = S.Terrain;
    if (s.blast) { const bx = x, by = y; if (s.team === 'enemy') { const p = player(); if (p && Math.hypot(p.x - bx, (p.y - p.h / 2) - by) < s.blast) g.damage(p, s.blastDmg || 1, { team: 'enemy', owner: s.owner, kind: 'blast', blast: true, dirX: U.sign(p.x - bx) || 1, x: bx, y: by }); if (S.FX) { S.FX.explosion(bx, by, s.blast * 0.8); S.FX.shake(0.15); } if (s.word) word(s.word, bx, by - 20, { size: 18, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#ff7a1a' }); sfx('explode', { x: bx, vol: 0.5, pitch: 1.2 }); } else g.explode(bx, by, s.blast, s.blastDmg || 3, s.team, { owner: s.owner }); }
    else { if (S.FX) { S.FX.debris(x, y, 5, s.color || '#8a8ca0'); S.FX.dust(x, y, 3); } if (s.splat) word(s.splat, x, y - 10, { size: 15, color: s.color || '#ffffff', stroke: '#141018', life: 0.5 }); }
    if (s.style === 'mud' && s.team === 'enemy' && g.mudPuddle && T && T.raycast) { const h = T.raycast(x, y - 4, x, y + 70); if (h) g.mudPuddle(x, h.y); }
    if (s.tileDmg && T && T.W) T.damageTile(Math.floor(x / C.T), Math.floor(y / C.T), s.tileDmg, { team: s.team });
  }
  function shotDraw(ctx, s) {
    const r = s.r, v = Math.hypot(s.vx, s.vy) || 1, a = Math.atan2(s.vy, s.vx);
    ctx.save(); ctx.translate(s.x, s.y); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.8; ctx.strokeStyle = INK;
    const ball = (c1, c2) => { ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); ctx.fillStyle = c1; ctx.fill(); ctx.stroke(); if (c2) { ctx.fillStyle = c2; ctx.beginPath(); ctx.arc(-r * 0.3, -r * 0.3, r * 0.35, 0, U.TAU); ctx.fill(); } };
    switch (s.style) {
      case 'snow': ball('#ffffff', '#d6ecff'); break;
      case 'mud': ball('#7a5a2f', '#a07a46'); break;
      case 'coconut': ball('#7a4a22', '#a0703a'); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(-r * 0.15, 0, 0.9, 0, U.TAU); ctx.arc(r * 0.25, -r * 0.1, 0.9, 0, U.TAU); ctx.arc(r * 0.05, r * 0.35, 0.9, 0, U.TAU); ctx.fill(); break;
      case 'rock': ctx.rotate(s.rot); ctx.beginPath(); for (let i = 0; i < 7; i++) { const aa = i / 7 * U.TAU, rr = r * (0.8 + 0.25 * ((i * 37) % 3) / 2); ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.closePath(); ctx.fillStyle = '#8a8ca0'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#b4b6c8'; ctx.fillRect(-r * 0.5, -r * 0.5, r * 0.5, r * 0.3); break;
      case 'fire': ctx.rotate(a); ctx.beginPath(); ctx.moveTo(r * 1.1, 0); ctx.quadraticCurveTo(0, -r * 1.1, -r * 2.2, 0); ctx.quadraticCurveTo(0, r * 1.1, r * 1.1, 0); ctx.fillStyle = '#ff6a1a'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, U.TAU); ctx.fill(); break;
      case 'bone': ctx.rotate(s.rot); ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); for (const [bx, by] of [[-7, -2], [-7, 2], [7, -2], [7, 2]]) { ctx.beginPath(); ctx.arc(bx, by, 2.2, 0, U.TAU); ctx.fillStyle = INK; ctx.fill(); } ctx.strokeStyle = '#f5f1de'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.fillStyle = '#f5f1de'; for (const [bx, by] of [[-7, -2], [-7, 2], [7, -2], [7, 2]]) { ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, U.TAU); ctx.fill(); } break;
      case 'harpoon': ctx.rotate(a); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.strokeStyle = '#d6dae6'; ctx.lineWidth = 1.8; ctx.stroke(); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(4, -4); ctx.lineTo(4, 4); ctx.closePath(); ctx.fillStyle = '#c9cede'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke(); break;
      case 'ray': ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, 0, r * 2.1, r * 0.8, 0, 0, U.TAU); ctx.fillStyle = s.color || '#7dff6b'; ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 0.6, -1, r * 1.4, 2); break;
      case 'pixel': ctx.fillStyle = s.color || '#ff6ae0'; ctx.fillRect(-r, -r, r * 2, r * 2); ctx.strokeRect(-r, -r, r * 2, r * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(-r * 0.5, -r * 0.5, r * 0.6, r * 0.6); break;
      case 'magic': { const p = 0.7 + 0.3 * Math.sin(s.age * 18); ctx.beginPath(); ctx.arc(0, 0, r * 1.5 * p, 0, U.TAU); ctx.fillStyle = 'rgba(199,125,255,0.35)'; ctx.fill(); ball('#c77dff', '#ffffff'); break; }
      case 'leaf': ctx.rotate(s.rot); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * 0.7, 0, 0, U.TAU); ctx.fillStyle = '#6fcf4a'; ctx.fill(); ctx.stroke(); break;
      default: ball(s.color || '#ff5a2a', '#fff3b0');
    }
    ctx.restore();
  }
  // generic custom shot: o{owner,x,y,vx,vy,grav,r,dmg,life,style,color,bounce,blast,blastDmg,tileDmg,spin,homing,word,splat,ghost}
  function shot(o) {
    const s = Object.assign({ custom: true, kind: 'orb', team: 'enemy', x: 0, y: 0, vx: 0, vy: 0, grav: 0, r: 4, dmg: 1, life: 3, age: 0, dead: false, color: '#ff5a2a', tileDmg: 0, rot: 0, spin: 0, bounces: 0, update: shotUpdate, draw: shotDraw }, o);
    return S.Shots.add(s);
  }
  // lob something at a spot (ballistic arc). Returns the shot.
  function lob(e, tx, ty, o) {
    o = o || {};
    const mx = o.mx != null ? o.mx : e.x + e.facing * 9, my = o.my != null ? o.my : e.y - e.h * 0.8;
    const dist = Math.hypot(tx - mx, ty - my), tt = U.clamp(dist / (o.speed || 330), 0.5, 1.15);
    const v = lobVel(mx, my, tx, ty, tt);
    v.vx = U.clamp(v.vx, -440, 440);
    return shot(Object.assign({ owner: e, x: mx, y: my, vx: v.vx, vy: v.vy, grav: 1, life: tt + 1.8, dmg: e.shotDmg || 1 }, o));
  }
  function hurtPlayer(e, dmg, o) {
    const p = player(); if (!p) return false;
    return S.Game.damage(p, dmg, Object.assign({ team: 'enemy', owner: e, kind: 'melee', dirX: U.sign(p.x - e.x) || e.facing, x: e.x, y: e.y }, o)) !== false;
  }
  function touchPlayer(e, dmg, cd, o) {
    if (e.touchCd > 0) return false;
    const p = player(); if (!p || !U.overlap(e, p, -1)) return false;
    if (hurtPlayer(e, dmg, o)) { e.touchCd = cd || 0.7; return true; }
    return false;
  }
  function radiusHurt(e, x, y, r, dmg) {
    const p = player(); if (!p) return false;
    if (Math.hypot(p.x - x, (p.y - p.h / 2) - y) > r) return false;
    return hurtPlayer(e, dmg, { kind: 'blast', blast: true, dirX: U.sign(p.x - x) || 1 });
  }

  // ================= theme skins (hats + colours per level theme) =================
  const HATS = new Set(['cowboyHat', 'tophat', 'partyHat', 'crown', 'wizardHat', 'vikingHelmet', 'trafficCone', 'pirateHat', 'helmet', 'beanie', 'earmuffs', 'trapperHat', 'sailorHat', 'bucketHat', 'pithHelmet', 'strawHat', 'plumeHelm', 'chefHat', 'pixelCap', 'flameHair', 'propeller', 'beret', 'antenna', 'nightcap', 'fishbowl', 'horns']);
  const HAT_COLORS = ['#e8173a', '#ffb81c', '#3b8bff', '#7dff6b', '#ff4fa3', '#c77dff', '#ff7a1a'];
  const NEON = ['#ff6ae0', '#6aeaff', '#7dff6b', '#ffe14d'];
  const SKINS = {
    ice: { limbs: ['#4f86c6', '#7a6bd6', '#37a3b8'], hats: ['beanie', 'earmuffs', 'trapperHat'], extra: ['scarf'] },
    fire: { limbs: ['#c2451f', '#8a2b2b', '#d9822b'], hats: ['helmet', 'flameHair', 'trafficCone'] },
    wind: { limbs: ['#3fa98f', '#c9b83a', '#5a7ad6'], hats: ['propeller', 'partyHat', 'sailorHat'], extra: ['scarf'] },
    water: { limbs: ['#2f8fa8', '#5b6bd6', '#c28a2d'], hats: ['pirateHat', 'sailorHat', 'beanie'] },
    mud: { limbs: ['#7a5a2f', '#5d6b2b', '#8a6b3a'], hats: ['bucketHat', 'trafficCone', 'tophat'] },
    jungle: { limbs: ['#3d8a3a', '#a8782a', '#6a9a2a'], hats: ['pithHelmet', 'bucketHat', 'strawHat'] },
    mountain: { limbs: ['#8a7a6a', '#5a6a8a', '#a85a3a'], hats: ['vikingHelmet', 'trapperHat', 'beanie'] },
    plains: { limbs: ['#d9a82a', '#4a7ad6', '#c24a3a'], hats: ['strawHat', 'cowboyHat', 'chefHat'] },
    fantasy: { limbs: ['#8a6ad6', '#6a8ab8', '#b8a06a'], hats: ['plumeHelm', 'wizardHat', 'crown'] },
    moon: { limbs: ['#c9cede', '#9aa6c8', '#d6c9f0'], hats: ['fishbowl', 'antenna', 'propeller'] },
    retro: { limbs: NEON, hats: ['pixelCap'], hatColors: NEON },
    fortress: { limbs: ['#3a2a3a', '#5a1f2a', '#2a2a4a'], hats: ['helmet', 'plumeHelm', 'vikingHelmet', 'tophat'] },
  };
  function makeLook(def, themeId) {
    const base = def.look || Defs.grunt.look;
    const sk = def.themed && SKINS[themeId];
    if (!sk) return base;
    const look = Object.assign({}, base);
    look.limb = U.pick(sk.limbs);
    look.hat = U.pick(sk.hatColors || HAT_COLORS); look.band = U.pick(HAT_COLORS); look.scarfColor = U.pick(HAT_COLORS);
    look.props = (base.props || []).filter((p) => !HATS.has(p));
    look.props.push(U.pick(sk.hats));
    if (sk.extra) for (const x of sk.extra) if (look.props.indexOf(x) < 0) look.props.push(x);
    return look;
  }

  const Defs = S.EnemyDefs = S.EnemyDefs || {};

  // ================= Base prototype =================
  const Base = {
    isEnemy: true,
    canSee(p) {
      if (!p) return false;
      const d = this.def;
      const dx = p.x - this.x, dy = (p.y - 16) - (this.y - (this.h * 0.7));
      const sight = (d.sight || 360) * (this.alerted ? 1.25 : 1);
      if (Math.abs(dx) > sight || Math.abs(dy) > (d.sightY || 170)) return false;
      if (!d.allAround && !this.alerted && Math.sign(dx) !== this.facing && Math.abs(dx) > 80) return false;
      return !S.Terrain || d.xray || S.Terrain.los(this.x, this.y - this.h * 0.75, p.x, p.y - 18);
    },
    // cached line-of-sight check (the raycast is the expensive bit)
    sees(p) {
      if (!p) return false;
      if (this.t >= (this._seeAt || 0) || this._seeP !== p) { this._seeAt = this.t + 0.12; this._seeP = p; this._sees = this.canSee(p); }
      return this._sees;
    },
    face(p, force) {
      if (!p) return;
      const f = p.x >= this.x ? 1 : -1, td = this.def.turnDelay;
      if (!td || force || !this.alerted) { this.facing = f; this.turnAt = 0; return; }
      if (f === this.facing) { this.turnAt = 0; return; }
      if (!this.turnAt) this.turnAt = this.t + td;
      if (this.t >= this.turnAt) { this.facing = f; this.turnAt = 0; if (S.Comic && Math.random() < 0.5) say(this, 'HEY!', 0.6); }
    },
    ledgeAhead() {
      if (!S.Terrain) return false;
      const T = C.T;
      const fx = this.x + this.facing * (this.w / 2 + 3);
      const tx = Math.floor(fx / T), ty = Math.floor((this.y + 2) / T);
      const m = S.Terrain.get(tx, ty), P = S.Terrain.PROPS[m];
      const m2 = S.Terrain.get(tx, ty + 1), P2 = S.Terrain.PROPS[m2];
      return !(P.solid || P.oneway || P.climb) && !(P2.solid || P2.oneway);
    },
    wallAhead() { return this.facing > 0 ? this.wallR : this.wallL; },
    // killability: the hurtbox is never smaller than a chest-high shot can find (>= HIT_MIN_H tall from the feet) and never smaller than the drawn body (def.hitH / def.hitW)
    hitHeight() { return Math.max(this.h, this.def.hitH || 0, HIT_MIN_H); },
    boxHit(x, y, pad) {
      const d = this.def, hh = this.hitHeight(), hw = Math.max(this.w, d.hitW || 0);
      pad += d.hitPad || 0;
      return Math.abs(x - this.x) <= hw / 2 + pad && y <= this.y + pad && y >= this.y - hh - pad;
    },
    inHit(x, y, pad) { const d = this.def; return d.hitTest ? d.hitTest(this, x, y, pad) : this.boxHit(x, y, pad); },
    muzzle() {
      if (!S.Rig || this.def.draw) { this.muzzleX = this.x + this.facing * 14; this.muzzleY = this.y - this.h * 0.6; return; }
      const J = S.Rig.joints(this.rigState(), this.x, this.y);
      this.muzzleX = J.muzzle.x; this.muzzleY = J.muzzle.y;
    },
    rigState() {
      const st = this.st;
      st.look = this.look; st.facing = this.facing; st.t = this.anim; st.aim = this.aim; st.gun = this.gun;
      st.flash = this.flash > 0 ? 1 : 0; st.recoil = this.recoil; st.muzzleFlash = this.muzzleFlash;
      st.tint = this.frozen > 0 ? '#bfefff' : (this.burn > 0 && !this.def.fireproof) ? '#ff7a3a' : (this.tint || null);
      st.pose = this.pose; st.face = (this.burn > 0 && !this.def.fireproof) ? 'scared' : this.windT > 0 ? 'yell' : (this.faceOverride || (this.def.hurtFace && this.hp <= this.maxHp * 0.5 ? this.def.hurtFace : null));
      st.yell = this.windT > 0;
      st.swing = this.swing; st.jet = this.jet; st.glow = this.glow; st.block = this.blockT > 0 ? 1 : 0; st.meleeT = this.meleeT; st.arms = this.armsOverride || null;
      return st;
    },
    // ---- compat gun-attack helpers (bosses may use these) ----
    tryShoot(dt, p) {
      if (this.windT > 0 || this.burstLeft > 0) return false;
      this.cool -= dt * diff().enemyRate;
      if (this.cool > 0 || !p) return false;
      const dx = p.x - this.x, dy = (p.y - p.h * 0.5) - (this.y - 18);
      let aim = 'fwd';
      if (Math.abs(dy) > 46) { if (dy < 0 && Math.abs(dx) < 70 && this.def.aimUp !== false) aim = 'up'; else return false; }
      this.aim = aim; this.face(p);
      this.windT = this.def.windup || 0.5; this.windMax = this.windT;
      this.pendingBurst = this.def.burst || 1;
      return true;
    },
    shootTick(dt) {
      if (this.windT > 0 && !this.atk) {
        this.windT -= dt;
        if (this.windT <= 0) { this.burstLeft = this.pendingBurst; this.burstT = 0; }
        return true;
      }
      if (this.burstLeft > 0) {
        this.burstT -= dt;
        if (this.burstT <= 0) {
          this.burstLeft--; this.burstT = this.def.burstGap || 0.15;
          this.muzzle();
          if (S.Weapons) S.Weapons.fire(this, this.gun, 1);
          this.recoil = 1; this.muzzleFlash = 1;
          if (this.burstLeft <= 0) { const cd = this.def.cooldown || [1.3, 2]; this.cool = U.rand(cd[0], cd[1]); this.aim = 'fwd'; }
        }
        return true;
      }
      return false;
    },
    // ---- attack engine ----
    tryAttack(dt, p) {
      if (this.atk || this.burst) return false;
      this.cool -= dt * diff().enemyRate;
      if (this.cool > 0 || !p) return false;
      const list = this.def.attacks; if (!list || !list.length) return false;
      const ad = Math.abs(p.x - this.x);
      const pool = [];
      for (const a of list) { const r = a.range || [0, 9999]; if (ad >= r[0] && ad <= r[1] && (!a.need || a.need(this, p))) pool.push(a); }
      if (!pool.length) return false;
      let pick = null; for (const a of pool) if (a.prio) { pick = a; break; }
      this.beginAttack(pick || U.pick(pool), p);
      return true;
    },
    beginAttack(a, p) {
      const w = typeof a.windup === 'function' ? a.windup(this) : a.windup != null ? a.windup : (this.def.windup || 0.5);
      this.atk = a; this.windMax = w; this.atkT = w; this.windT = w;
      this.face(p, true);
      if (a.start) a.start(this, p);
      if (a.bubble && Math.random() < 0.6) say(this, U.pick(a.bubble), Math.max(0.6, w + 0.2));
      if (a.sfx) sfx(a.sfx, { x: this.x, vol: 0.5 });
    },
    tickAttack(dt, p) {
      const a = this.atk; if (!a) return false;
      this.atkT -= dt; this.windT = Math.max(0, this.atkT);
      if (a.tick) a.tick(this, dt, p, 1 - Math.max(0, this.atkT) / (this.windMax || 0.5));
      if (this.atkT <= 0) {
        this.atk = null; this.windT = 0;
        if (a.fire) a.fire(this, p);
        const cd = a.cooldown || this.def.cooldown || [1.4, 2.2];
        this.cool = U.rand(cd[0], cd[1]);
      }
      return true;
    },
    cancelAttack() { this.atk = null; this.windT = 0; this.burst = null; this.aim = 'fwd'; },
    queueBurst(n, gap, fn) { this.burst = { n, gap, t: 0, fn }; },
    tickBurst(dt) {
      const b = this.burst; if (!b) return false;
      b.t -= dt;
      if (b.t <= 0) { b.n--; b.t = b.gap; b.fn(this, b); if (b.n <= 0) { this.burst = null; this.aim = 'fwd'; } }
      return true;
    },
    update(dt) {
      const d = this.def;
      this.t += dt;
      if (this.flash > 0) this.flash -= dt;
      if (this.hitT > 0) this.hitT -= dt;
      if (this.blockT > 0) this.blockT -= dt;
      if (this.touchCd > 0) this.touchCd -= dt;
      this.recoil = Math.max(0, this.recoil - dt * 6); this.muzzleFlash = Math.max(0, this.muzzleFlash - dt * 12);
      if (this.frozen > 0) {
        this.frozen -= dt; this.vx *= 0.8;
        if (d.flies) { this.vy += 900 * dt; moveFlier(this, dt); } else S.Phys.move(this, dt);
        if (this.frozen <= 0 && S.FX) S.FX.spark(this.x, this.y - 15, 8, '#bfefff');
        return;
      }
      if (this.stun > 0) { this.stun -= dt; if (this.atk || this.burst) this.cancelAttack(); }
      if (this.burn > 0) {
        this.burn -= dt;
        if (d.fireproof) this.burn = 0;
        else {
          this.burnTick = (this.burnTick || 0) - dt;
          if (S.FX && Math.random() < 0.6) S.FX.fire(this.x + U.rand(-5, 5), this.y - U.rand(8, 30), 1);
          if (this.burnTick <= 0) { this.burnTick = 0.5; this.hurt(0.5, null, { kind: 'burn', dirX: 0, noKnock: true }); if (this.dead) return; }
        }
      }
      if (d.update) d.update(this, dt);
      if (this.dead) return;
      if (this.chute) { if (this.onGround && this.t > 0.25) { this.chute = false; if (S.FX) S.FX.dust(this.x, this.y, 4); } else if (this.vy > 85) this.vy = 85; }
      if (this.burn > 0 && d.panics !== false && !d.fireproof) {
        if (!this.panicked) { this.panicked = true; if (S.Comic) S.Comic.bubble(U.pick(['AAAAAH!', 'HOT HOT HOT!', 'I\'M ON FIRE!']), this.x, this.y - 40, { follow: this, life: 1.2, speaker: 'e' + this.uid, shout: true }); }
        if (this.atk || this.burst) this.cancelAttack();
        if (this.hitWall || (this.onGround && this.ledgeAhead())) this.facing *= -1;
        this.vx = U.approach(this.vx, this.facing * (d.runSpeed || 110) * 1.2, 900 * dt);
        this.pose = 'panic'; this.anim += dt;
      } else if (this.stun > 0) {
        this.vx *= 0.85; this.pose = 'hurt';
      } else {
        const ai = typeof d.ai === 'function' ? d.ai : Enemies.AI[d.ai || 'soldier'];
        if (ai) ai(this, dt);
      }
      if (this.dead) return;
      if (this.knockT > 0) this.knockT -= dt;
      if (d.flies) moveFlier(this, dt); else if (!d.noPhys) S.Phys.move(this, dt);
      if (this.hazard && S.Terrain && S.Terrain.PROPS[this.hazard].hazard && !d.fireproof) this.hurt(dt * 4, null, { kind: 'hazard', dirX: 0, noKnock: true });
      if (this.fellOut) { this.dead = true; this.silentDeath = true; }
    },
    hurt(dmg, src, info) {
      if (this.dead) return true;
      info = info || {};
      const d = this.def;
      if (d.onHurt) { const r = d.onHurt(this, dmg, src, info); if (r === false) return false; if (typeof r === 'number') dmg = r; }
      if (this.frozen > 0) dmg *= 2;
      this.hp -= dmg;
      this.flash = 0.12; this.hitT = 0.5; // killability: a clearly visible white flash on EVERY hit + pips shown
      if (!info.noKnock && !d.noKnock) {
        const kmul = d.knockMul == null ? 1 : d.knockMul;
        const k = (info.knock || (info.kind === 'melee' ? 220 : info.blast ? 200 : 70)) * kmul;
        this.vx = (info.dirX || (src && src.x != null ? U.sign(this.x - src.x) : 0)) * k;
        if (k > 150 && !d.flies) { this.vy = Math.min(this.vy, -180); this.onGround = false; }
        this.knockT = 0.12;
      }
      if ((info.fire || info.burn) && !d.fireproof) this.burn = Math.max(this.burn || 0, info.burn ? 1.5 : 2.2);
      if (info.frost && Math.random() < 0.25) this.frozen = 2.5;
      if (!this.alerted && S.Game && S.Game.player) { this.alerted = true; this.face(S.Game.player, true); if (this.state === 'patrol') this.state = 'attack'; }
      if (this.hp <= 0) { this.die(info); return true; }
      if (info.kind !== 'burn') { sfx(d.hitSfx || 'hit', { x: this.x, vol: 0.5 }); if (S.FX && !d.bloodless) S.FX.blood(this.x, this.y - this.h * 0.6, info.dirX || 0, 3); else if (S.FX) S.FX.spark(this.x, this.y - this.h * 0.6, 3, '#ffffff'); }
      // killability: a comic word on every hit (rate limited per enemy so streams of bullets do not flood the screen)
      if (S.Comic && info.kind !== 'burn' && this.t - (this.hurtWordT || -9) > 0.16) { this.hurtWordT = this.t; S.Comic.word(U.pick(d.hurtWords || ['OOF', 'OW!', 'ACK!', 'UGH']), this.x + U.rand(-6, 6), this.y - this.h - 10, { size: 15, color: '#ffffff', stroke: '#e8173a' }); }
      return true;
    },
    die(info) {
      if (this.dead) return;
      info = info || {};
      const d = this.def;
      if (d.beforeDie && d.beforeDie(this, info) === true) return;
      this.dead = true;
      this.cancelAttack();
      if (d.onDeath) d.onDeath(this, info);
      if (S.FX) {
        if (this.frozen > 0) { S.FX.spark(this.x, this.y - 15, 14, '#bfefff'); S.FX.debris(this.x, this.y - 15, 6, '#bfefff'); word('SHATTER!', this.x, this.y - 30, { size: 20, color: '#bfefff' }); }
        else if (d.gibs !== false) S.FX.gibs(this, this.look, info.dirX || 0);
      }
      if (this.frozen <= 0 && Math.random() < 0.6) word(U.pick(d.deathWords || ['SPLAT!', 'OOF!', 'POOF!']), this.x, this.y - this.h - 8, { size: 19, color: '#ffffff', stroke: '#e8173a', burst: Math.random() < 0.4, burstColor: '#ffe14d', life: 0.65 });
      sfx(d.dieSfx || 'gib', { x: this.x });
      const g = d.gold || [3, 6];
      let v = U.randi(g[0], g[1]);
      if (S.Game && S.Ents) {
        while (v > 0) { const c = Math.min(v, v > 30 ? 20 : 5); v -= c; S.Game.spawn(S.Ents.gold(this.x, this.y - 12, c)); }
        const luck = (S.Game.stats && S.Game.stats.luck) || 0;
        const dp = d.dropPick ? d.dropPick(this) : d.drop;
        if (dp || Math.random() < (d.dropChance || 0.03) + luck * 0.02) S.Game.spawn(S.Ents.pickup(this.x, this.y - 10, dp || U.pick(S.Ents.WEAPON_PICKS), true));
      }
      if (S.Game && S.Game.onKill) S.Game.onKill(this, info);
      if (S.Voice && d.voiceless !== true && Math.random() < 0.25) S.Voice.say('goon', 'kill', { x: this.x, y: this.y - 30 });
    },
    draw(ctx) {
      const d = this.def;
      if (d.draw) { d.draw(ctx, this); }
      else {
        const st = this.rigState();
        if (S.Rig) S.Rig.draw(ctx, this.x, this.y, st);
      }
      if (this.frozen > 0) {
        ctx.fillStyle = 'rgba(190,240,255,0.45)'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.fillRect(this.x - this.w / 2 - 5, this.y - this.h - 12, this.w + 10, this.h + 12); ctx.strokeRect(this.x - this.w / 2 - 5, this.y - this.h - 12, this.w + 10, this.h + 12);
      }
      if (this.chute && !this.onGround) drawChute(ctx, this);
      if (d.drawAfter) d.drawAfter(ctx, this);
      if (this.windT > 0 && !d.noTele) Enemies.drawTelegraph(ctx, this);
      if (!d.noPips && ((this.maxHp >= 2.5) || (this.shieldMax > 0 && !this.shieldGone))) drawPips(ctx, this);
    },
  };

  // killability: tiny HP pips over anyone with 3+ hit points (red = body, blue = shield) so the player always sees progress
  function drawPips(ctx, e) {
    const body = Math.ceil(e.maxHp - 1e-6), hp = Math.max(0, Math.ceil(e.hp - 1e-6)), sh = e.shieldGone ? 0 : Math.ceil(e.shieldMax || 0), shHp = Math.max(0, Math.ceil(e.shieldHp || 0));
    const n = body + sh, pw = 5, gap = 1.5, x0 = e.x - (n * pw + (n - 1) * gap) / 2, y = e.y - Math.max(e.h, e.def.hitH || 0) - (e.def.pipUp != null ? e.def.pipUp : 7) - (e.windT > 0 ? 12 : 0);
    ctx.save(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK;
    for (let i = 0; i < n; i++) {
      const isSh = i < sh, on = isSh ? i < shHp : (i - sh) < hp;
      ctx.fillStyle = on ? (isSh ? '#5ad1ff' : (e.hitT > 0 && (i - sh) === hp - 1 ? '#ffe14d' : '#ff3b3b')) : 'rgba(20,16,24,0.45)';
      const px = x0 + i * (pw + gap); ctx.fillRect(px, y, pw, 3.4); ctx.strokeRect(px, y, pw, 3.4);
    }
    ctx.restore();
  }

  function drawChute(ctx, e) {
    const x = e.x, y = e.y - e.h - 30, sw = Math.sin(e.t * 3) * 2;
    ctx.save(); ctx.translate(x + sw, y);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-sw, 28); ctx.moveTo(14, 0); ctx.lineTo(-sw, 28); ctx.moveTo(0, -2); ctx.lineTo(-sw, 28); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-17, 2); ctx.quadraticCurveTo(0, -26, 17, 2); ctx.quadraticCurveTo(8, 5, 0, 3); ctx.quadraticCurveTo(-8, 5, -17, 2); ctx.closePath();
    ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.fillStyle = '#e8173a'; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.quadraticCurveTo(0, -17, 6, 0); ctx.quadraticCurveTo(0, 2, -6, 0); ctx.fill();
    ctx.restore();
  }

  const Enemies = S.Enemies = {
    Base, AI: {}, SKINS, HATS, util: { bulletAt, shot, lob, lobVel, hurtPlayer, touchPlayer, radiusHurt, moveFlier, steer, say, fc, inWater, solidAt, boxBlocked, grav, player },
    make(id, x, y, opts) {
      const def = Defs[id] || Defs.grunt;
      opts = opts || {};
      // killability: difficulty may only add WHOLE hit points to the beefy ones (ultra x1.25 never makes a 2-hp grunt a 3-hit grunt)
      const hpMul = (opts.hpMul || 1), hp0 = hpMul > 1 ? def.hp + Math.floor(def.hp * (hpMul - 1) + 1e-6) : hpMul < 1 ? Math.max(1, Math.round(def.hp * hpMul)) : def.hp;
      if (!def.attacks && def.gun && def.gun !== 'none' && def.noAttacks !== true) def.attacks = [Enemies.gunAttack()];
      const e = Object.create(Base);
      Object.assign(e, {
        uid: uid++, id, def, kind: 'enemy', team: 'enemy', shootable: true,
        x, y, w: def.w || 14, h: def.h || 30, vx: 0, vy: 0, hp: hp0, maxHp: hp0,
        facing: opts.facing || (Math.random() < 0.5 ? -1 : 1), state: 'patrol', t: U.rand(0, 3), anim: U.rand(0, 3),
        aim: 'fwd', look: opts.look || makeLook(def, S.Game && S.Game.theme), gun: opts.gun || def.gun || 'none', cool: U.rand(0.6, 1.6), windT: 0, windMax: 0, burstLeft: 0, burstT: 0,
        recoil: 0, muzzleFlash: 0, flash: 0, burn: 0, frozen: 0, stun: 0, alerted: false, pose: 'idle', st: {},
        shotSpeed: def.shotSpeed, shotDmg: def.shotDmg || 1, dmgMul: def.dmgMul || 1, patrolT: U.rand(1, 3), lostT: 0, touchCd: 0,
        dead: false, atk: null, burst: null, stepUp: def.stepUp !== false && !def.flies,
      });
      if (def.grav != null) e.grav = def.grav;
      if (opts.perch) e.perch = true;
      if (opts.air) e.air = true;
      if (opts.water) e.water = true;
      e.stampede = !!(opts.charge && def.stampede);
      if (def.init) def.init(e, opts);
      if (!opts.water && !def.ghost) unbury(e);
      if (!opts.water && !def.flies && !def.ghost && !opts.perch && !opts.charge) clearFront(e);
      if (opts.perch && def.stationary) perchToEdge(e);
      return e;
    },
    gunAttack(o) {
      o = o || {};
      const dyOf = (e, p) => (p.y - p.h * 0.5) - (e.y - 18);
      return {
        id: 'gun', range: o.range, windup: o.windup, cooldown: o.cooldown, bubble: o.bubble,
        need(e, p) { const dy = dyOf(e, p); if (Math.abs(dy) <= 46) return true; return dy < 0 && Math.abs(p.x - e.x) < 70 && e.def.aimUp !== false; },
        start(e, p) { e.aim = Math.abs(dyOf(e, p)) > 46 ? 'up' : 'fwd'; },
        fire(e, p) { e.queueBurst(e.def.burst || 1, e.def.burstGap || 0.15, gunShot); },
      };
    },
    drawTelegraph(ctx, e) {
      const k = U.clamp(e.windT / (e.windMax || e.def.windup || 0.5), 0, 1);
      const x = e.x, y = e.y - e.h - (e.def.teleUp || 18);
      const s = 0.8 + (1 - k) * 0.55;
      ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
      if (S.Comic) S.Comic.burst(ctx, 0, 0, 5.5, 10, 7, 3); else { ctx.beginPath(); ctx.arc(0, 0, 8, 0, U.TAU); }
      ctx.fillStyle = Math.floor(e.windT * 16) % 2 ? '#ffe14d' : '#ff3b3b'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
      ctx.fillStyle = INK; ctx.font = '13px Bangers, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', 0, 1);
      ctx.restore();
    },
    // reinforcements by parachute (officer + friends)
    parachute(e, id, n) {
      const g = S.Game; let made = 0;
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1, x = e.x + side * (46 + (i >> 1) * 26);
        let y = e.y, chute = false;
        const T = S.Terrain;
        if (T && S.Phys.free(x, e.y - 150, 14, 32) && !T.raycast(x, e.y - 150, x, e.y - 24)) { y = e.y - 150; chute = true; }
        else if (!S.Phys.free(x, e.y, 14, 30)) continue;
        const r = g.spawnEnemy(id, x, y, { facing: -side, charge: true });
        if (r) { r.chute = chute; r.alerted = true; r.state = 'attack'; made++; if (S.FX) S.FX.ring(x, y - 14, 18, '#ffffff'); }
      }
      return made;
    },
  };
  function gunShot(e) { e.muzzle(); if (S.Weapons) S.Weapons.fire(e, e.gun, 1); e.recoil = 1; e.muzzleFlash = 1; }

  // ================= AI: soldier (patrol -> notice -> telegraphed attacks) =================
  function notice(e) {
    const d = e.def, p = player();
    e.state = 'alert'; e.alerted = true; e.alertT = d.react || 0.45; if (p) e.face(p, true); e.vx = 0;
    let said = null;
    if (S.Voice && d.voiceless !== true && Math.random() < 0.3) said = S.Voice.say('goon', 'spawn', { follow: e });
    if (!said) say(e, U.pick(d.alert || ['HUH?!']), 1);
    sfx(d.alertSfx || 'alert', { x: e.x, vol: 0.5 });
  }
  function patrolWalk(e, dt, speed) {
    e.patrolT -= dt;
    if (e.patrolT < 0) { e.patrolT = U.rand(1.5, 3.5); e.idle = Math.random() < 0.35 ? U.rand(0.6, 1.4) : 0; }
    if (e.idle > 0) { e.idle -= dt; e.vx = U.approach(e.vx, 0, 600 * dt); }
    else {
      if (e.wallAhead() || e.ledgeAhead()) e.facing *= -1;
      e.vx = U.approach(e.vx, e.facing * speed, 600 * dt);
    }
  }
  function animGround(e, dt) {
    const sp = Math.abs(e.vx);
    if (!e.onGround) e.pose = e.vy < 0 ? 'jump' : 'fall';
    else if (sp > 8) { e.pose = 'run'; e.anim += dt * U.clamp(sp / 150, 0.4, 1.2); }
    else { e.pose = 'idle'; e.anim += dt; }
  }
  Enemies.AI.soldier = function (e, dt) {
    const p = player(), d = e.def;
    const busy = e.shootTick(dt) || e.tickAttack(dt, p) || e.tickBurst(dt);
    const sees = e.sees(p);
    e.hopT = (e.hopT || 0) - dt;
    switch (e.state) {
      case 'patrol': {
        if (d.stationary) { e.vx = U.approach(e.vx, 0, 900 * dt); }
        else {
          patrolWalk(e, dt, d.speed || 48);
          if (d.bounce && e.onGround && e.hopT <= 0 && Math.abs(e.vx) > 5) { e.vy = -d.bounce; e.hopT = U.rand(0.5, 1.1); }
        }
        if (sees) notice(e);
        break;
      }
      case 'alert':
        e.alertT -= dt; e.vx = U.approach(e.vx, 0, 900 * dt); if (p) e.face(p, true);
        if (e.alertT <= 0) e.state = 'attack';
        break;
      case 'attack': {
        if (!p) { e.state = 'patrol'; break; }
        if (sees) e.lostT = 0; else e.lostT += dt;
        if (e.lostT > (d.stationary ? 6 : 3.5)) {
          e.state = 'patrol'; e.alerted = false;
          if (S.Comic && Math.random() < 0.5) say(e, U.pick(['WHERE\'D HE GO?', 'MUST\'VE BEEN THE WIND', 'HELLO?']), 1.4);
          break;
        }
        if (!busy) {
          e.face(p);
          if (!d.stationary) {
            const dist = Math.abs(p.x - e.x), r = d.range || [130, 290];
            let want = 0;
            if (dist > r[1] || !sees) want = e.facing;
            else if (dist < r[0]) want = -e.facing;
            if (want !== 0) {
              const savedF = e.facing; e.facing = want;
              const wl = e.wallAhead();
              if (wl || e.ledgeAhead()) {
                // killability: boxed in by a wall (a crater blasted under them, a pit, a tall step) while chasing: hop out instead of sitting there out of reach
                if (wl && e.onGround && want === savedF && !d.noHop) { e.stuckT = (e.stuckT || 0) + dt; if (e.stuckT > 0.45) { e.vy = -500; e.vx = want * 120; e.stuckT = -0.9; e.onGround = false; e.hopDir = want; e.hopT2 = 0.6; } } else e.stuckT = Math.min(0, e.stuckT || 0);
                want = 0;
              } else e.stuckT = Math.min(0, e.stuckT || 0);
              e.facing = savedF;
            }
            else if (e.onGround && !d.noHop && e.wallAhead() && dist > 50 && Math.abs(p.y - e.y) < 160 && !solidAt(e.x + e.facing * (e.w / 2 + 6), e.y - 95)) {
              // killability: standing in a pit / crater with a wall (<= ~4 tiles) between us and the player: climb out (hurtbox out of reach otherwise)
              e.stuckT = (e.stuckT || 0) + dt;
              if (e.stuckT > 1.1) { e.vy = -520; e.stuckT = -1.2; e.onGround = false; e.hopDir = e.facing; e.hopT2 = 0.6; }
            } else e.stuckT = Math.min(0, e.stuckT || 0);
            const toward = want === e.facing;
            e.vx = U.approach(e.vx, want * (toward ? (d.runSpeed || 105) : (d.backSpeed || d.speed || 48)), 700 * dt);
            if (e.hopT2 > 0) { e.hopT2 -= dt; e.vx = e.hopDir * 105; }
            if (d.bounce && e.onGround && e.hopT <= 0 && want !== 0) { e.vy = -d.bounce; e.hopT = U.rand(0.45, 0.9); }
          } else e.vx = U.approach(e.vx, 0, 900 * dt);
          if (sees) e.tryAttack(dt, p);
        } else e.vx = U.approach(e.vx, 0, 900 * dt);
        break;
      }
    }
    if (d.stationary) { if (e.pose !== 'crouch') e.pose = d.pose || 'idle'; e.anim += dt; if (d.pose === 'crouch') e.pose = 'crouch'; }
    else animGround(e, dt);
  };

  // ================= AI: charger (dog, penguin, gator, goat, cow, snake): wind-up -> rush -> recover =================
  Enemies.AI.charger = function (e, dt) {
    const p = player(), d = e.def, sees = e.sees(p);
    if (e.stampede) { // stampede mode: just run, trampling, until off the camera
      e.alerted = true; e.state = 'rush'; e.vx = U.approach(e.vx, e.facing * (d.rushSpeed || 260), 1200 * dt); e.pose = 'run'; e.anim += dt * 1.4;
      touchPlayer(e, d.touchDmg || 1, 0.7); if (e.hitWall && e.onGround) e.vy = -420;
      if (S.FX && Math.random() < 0.25) S.FX.dust(e.x - e.facing * 8, e.y, 1);
      const cam = S.Game && S.Game.cam; if (cam && (e.x < cam.x - 420 || e.x > cam.x + cam.w + 700)) { e.dead = true; e.silentDeath = true; }
      return;
    }
    switch (e.state) {
      case 'patrol':
        patrolWalk(e, dt, d.speed || 40);
        if (sees) { notice(e); }
        e.pose = Math.abs(e.vx) > 8 ? 'run' : 'idle'; e.anim += dt * (e.pose === 'run' ? 0.7 : 1);
        break;
      case 'alert':
        e.alertT -= dt; e.vx = U.approach(e.vx, 0, 900 * dt); if (p) e.face(p, true); e.pose = 'idle'; e.anim += dt;
        if (e.alertT <= 0) { e.state = 'attack'; e.cool = U.rand(0.1, 0.5); }
        break;
      case 'attack': {
        if (!p) { e.state = 'patrol'; break; }
        if (sees) e.lostT = 0; else e.lostT += dt;
        if (e.lostT > 3.5) { e.state = 'patrol'; e.alerted = false; break; }
        e.face(p);
        const dx = p.x - e.x, ad = Math.abs(dx), dy = p.y - e.y, rr = d.rushRange || 170;
        let want = ad > rr * 0.65 || !sees ? e.facing : 0;
        if (want) { if (e.wallAhead() || e.ledgeAhead()) want = 0; }
        e.vx = U.approach(e.vx, want * (d.chase || d.runSpeed || 90), 800 * dt);
        e.pose = Math.abs(e.vx) > 8 ? 'run' : 'idle'; e.anim += dt * 1.3;
        e.cool -= dt * diff().enemyRate;
        if (e.cool <= 0 && sees) {
          let go = null;
          if (d.leap && dy < -50 && dy > -170 && ad < (d.leapRange || 150)) go = 'leap';
          else if (ad < rr && Math.abs(dy) < 70) go = 'rush';
          if (go) {
            e.state = 'wind'; e.leap = go === 'leap'; e.windMax = d.windup || 0.45; e.windT = e.windMax; e.vx = 0;
            if (d.bubble) say(e, U.pick(d.bubble), 0.7);
            if (d.windSfx) sfx(d.windSfx, { x: e.x, vol: 0.6 });
          }
        }
        break;
      }
      case 'wind':
        e.windT -= dt; e.vx = U.approach(e.vx, 0, 1400 * dt); e.pose = 'crouch'; e.anim += dt;
        if (e.windT <= 0) {
          e.windT = 0;
          if (e.leap) { e.state = 'leap'; e.vy = -(d.leapVy || 640); e.vx = e.facing * 170; e.onGround = false; sfx(d.rushSfx || 'jump', { x: e.x, vol: 0.5 }); }
          else { e.state = 'rush'; e.rushT = d.rushDur || 0.6; e.vx = e.facing * (d.rushSpeed || 280); sfx(d.rushSfx || 'whoosh', { x: e.x, vol: 0.4 }); if (S.FX) S.FX.dust(e.x - e.facing * 8, e.y, 3); }
        }
        break;
      case 'rush': {
        e.rushT -= dt; e.vx = U.approach(e.vx, e.facing * (d.rushSpeed || 280), 3000 * dt); e.pose = 'rush'; e.anim += dt * 2;
        touchPlayer(e, d.touchDmg || 1, 0.7);
        if (S.FX && Math.random() < 0.3) S.FX.dust(e.x - e.facing * 8, e.y, 1);
        const hitW = e.hitWall !== 0 && e.hitWall !== undefined;
        e.dizzy = !!d.dizzy;
        if (hitW || (d.stopAtLedge !== false && e.onGround && e.ledgeAhead()) || e.rushT <= 0) {
          e.state = 'recover'; e.recT = hitW && d.wallStun ? d.wallStun : (d.recover || 0.6);
          if (hitW && d.wallStun) { word(U.pick(['BONK!', 'THUNK!', 'CRUNCH!']), e.x + e.facing * 14, e.y - e.h, { size: 20, color: '#ffe14d', stroke: '#141018', burst: true, burstColor: '#ff7a1a' }); if (S.FX) { S.FX.spark(e.x + e.facing * 10, e.y - e.h * 0.6, 8, '#ffe14d'); S.FX.shake(0.15); } sfx('hit_metal', { x: e.x }); e.dizzy = true; }
        }
        break;
      }
      case 'leap':
        e.pose = 'rush'; e.anim += dt; touchPlayer(e, d.touchDmg || 1, 0.7);
        if (e.onGround && e.vy >= 0 && e.t > 0) {
          e.state = 'recover'; e.recT = d.recover || 0.8; e.vx = 0;
          if (d.stomp) { word(d.stomp, e.x, e.y - e.h - 6, { size: 28, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#ffe14d', life: 0.8 }); radiusHurt(e, e.x, e.y - 6, d.stompR || 46, 1); if (S.FX) { S.FX.ring(e.x, e.y - 4, 44, '#ffffff'); S.FX.dust(e.x - 12, e.y, 4); S.FX.dust(e.x + 12, e.y, 4); S.FX.shake(0.25); } sfx('explode', { x: e.x, vol: 0.5, pitch: 0.8 }); }
        }
        break;
      case 'recover':
        e.recT -= dt; e.vx = U.approach(e.vx, 0, 1600 * dt); e.pose = e.dizzy ? 'hurt' : 'idle'; e.anim += dt;
        if (e.dizzy && S.FX && Math.random() < 0.15) S.FX.spark(e.x, e.y - e.h - 4, 1, '#ffe14d');
        if (e.recT <= 0) { e.state = 'attack'; e.dizzy = false; const cd = d.cooldown || [0.5, 1.2]; e.cool = U.rand(cd[0], cd[1]); }
        break;
    }
  };

  // ================= AI: hopper (magma blob, bouncer): small hops, then a telegraphed BIG hop =================
  Enemies.AI.hopper = function (e, dt) {
    const p = player(), d = e.def, sees = e.sees(p);
    e.pose = 'idle'; e.anim += dt;
    switch (e.state) {
      case 'patrol':
        if (e.onGround) { e.vx = U.approach(e.vx, 0, 900 * dt); e.hopT = (e.hopT || U.rand(0.5, 1.2)) - dt; if (e.hopT <= 0) { e.hopT = U.rand(0.9, 1.8); e.facing = Math.random() < 0.5 ? -1 : 1; e.vy = -(d.hop || 300); e.vx = e.facing * 50; } }
        if (sees) notice(e);
        break;
      case 'alert':
        e.alertT -= dt; e.vx = U.approach(e.vx, 0, 900 * dt); if (p) e.face(p, true);
        if (e.alertT <= 0) { e.state = 'attack'; e.hopT = 0.4; e.hops = 0; }
        break;
      case 'attack': {
        if (!p) { e.state = 'patrol'; break; }
        if (sees) e.lostT = 0; else e.lostT += dt;
        if (e.lostT > 4) { e.state = 'patrol'; e.alerted = false; break; }
        if (e.windT > 0) {
          e.windT -= dt; e.vx = 0; e.squash = 1;
          if (e.windT <= 0) { e.windT = 0; e.squash = 0; e.vy = -(d.bigHop || 520); e.vx = e.facing * (d.bigVx || 170); e.big = true; sfx(d.hopSfx || 'bounce', { x: e.x, vol: 0.6 }); }
          break;
        }
        if (e.onGround) {
          if (e.big) { e.big = false; if (d.slam) { word(d.slam, e.x, e.y - e.h - 8, { size: 24, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#ffe14d', life: 0.7 }); radiusHurt(e, e.x, e.y - 6, d.slamR || 52, d.slamDmg || 1); if (S.FX) { S.FX.ring(e.x, e.y - 4, d.slamR || 52, '#ffffff'); S.FX.dust(e.x - 14, e.y, 4); S.FX.dust(e.x + 14, e.y, 4); S.FX.shake(0.25); } sfx('explode', { x: e.x, vol: 0.45, pitch: 0.9 }); } }
          e.vx = U.approach(e.vx, 0, 1200 * dt);
          e.hopT -= dt;
          if (e.hopT <= 0) {
            e.face(p);
            e.hops = (e.hops || 0) + 1;
            if (d.bigHop && e.hops % (d.bigEvery || 3) === 0 && sees) { e.windMax = d.windup || 0.45; e.windT = e.windMax; if (d.bubble) say(e, U.pick(d.bubble), 0.7); }
            else { if (!(e.wallAhead() || e.ledgeAhead())) { e.vy = -(d.hop || 300); e.vx = e.facing * (d.hopVx || 120); } e.hopT = U.rand(0.55, 0.95); sfx(d.hopSfx || 'bounce', { x: e.x, vol: 0.3 }); }
          }
        }
        break;
      }
    }
    touchPlayer(e, d.touchDmg || 1, 0.8);
  };

  // ================= custom body drawing helpers =================
  function ink(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || 1.8; ctx.strokeStyle = INK; ctx.stroke(); }
  // generic four-legged body. s{body,dark,rx,ry,legLen,legW,head(ctx,e,hx,hy),tail(ctx,e,by,rx),spots(ctx,e,by,rx),headDx,headDy}
  function quad(ctx, e, s) {
    const f = e.facing, mv = (e.pose === 'run' || e.pose === 'rush' || e.pose === 'panic') ? 1 : 0, ph = e.anim * (e.pose === 'rush' ? 22 : 14);
    const cr = e.pose === 'crouch' ? 0.45 : 0;
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(f, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const body = fc(e, s.body), dk = fc(e, s.dark || s.body);
    const legL = s.legLen * (1 - cr), by = -(legL + s.ry * 0.8), rx = s.rx * (e.pose === 'rush' ? 1.1 : 1);
    const leg = (x, p, col) => {
      const sw = mv ? Math.sin(p) * s.legLen * 0.75 : 0, lift = mv ? Math.max(0, Math.cos(p)) * 3 : 0;
      ctx.beginPath(); ctx.moveTo(x, by + s.ry * 0.5); ctx.lineTo(x + sw, -lift); ctx.strokeStyle = INK; ctx.lineWidth = s.legW + 2.2; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = s.legW; ctx.stroke();
    };
    leg(-rx * 0.62, ph + Math.PI, dk); leg(rx * 0.6, ph, dk);
    if (s.tail) s.tail(ctx, e, by, rx);
    ctx.beginPath(); ctx.ellipse(0, by, rx, s.ry, 0, 0, U.TAU); ctx.fillStyle = body; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.stroke();
    if (s.spots) s.spots(ctx, e, by, rx);
    leg(-rx * 0.35, ph, body); leg(rx * 0.78, ph + Math.PI, body);
    s.head(ctx, e, rx * 0.85 + (s.headDx || 0), by + (s.headDy != null ? s.headDy : -s.ry * 0.5));
    ctx.restore();
  }
  function eye(ctx, x, y, r, e) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x + r * 0.3, y + (e && e.windT > 0 ? -r * 0.15 : r * 0.1), r * 0.5, 0, U.TAU); ctx.fill();
  }
  function drawDog(ctx, e) {
    const col = e.look.limb;
    quad(ctx, e, { body: col, dark: U.shade(col, -0.25), rx: 9.5, ry: 4.6, legLen: 5.5, legW: 2.4,
      tail(c, e, by, rx) { const w = Math.sin(e.t * (e.state === 'attack' ? 26 : 9)) * 3; c.beginPath(); c.moveTo(-rx * 0.8, by - 1); c.quadraticCurveTo(-rx - 5, by - 6, -rx - 6 + w, by - 9); c.strokeStyle = INK; c.lineWidth = 4.2; c.stroke(); c.strokeStyle = fc(e, col); c.lineWidth = 2.2; c.stroke(); },
      spots(c, e, by, rx) { c.fillStyle = fc(e, '#fff0d0'); c.beginPath(); c.ellipse(rx * 0.1, by + 2, rx * 0.5, 2, 0, 0, U.TAU); c.fill(); c.fillStyle = fc(e, '#e8173a'); c.fillRect(rx * 0.62, by - 4.2, 2.4, 8); },
      head(c, e, hx, hy) {
        c.beginPath(); c.ellipse(hx + 4.2, hy + 1.6, 3.8, 2.6, 0, 0, U.TAU); ink(c, fc(e, '#ffe0b0'), 1.6);
        c.beginPath(); c.arc(hx, hy, 4.8, 0, U.TAU); ink(c, fc(e, col), 1.8);
        c.fillStyle = INK; c.beginPath(); c.arc(hx + 7.6, hy + 0.6, 1.3, 0, U.TAU); c.fill();
        eye(c, hx + 2.2, hy - 1.2, 1.5, e);
        c.beginPath(); c.moveTo(hx - 3, hy - 3.4); c.lineTo(hx - 5.6, hy + 2); c.lineTo(hx - 0.6, hy - 1.6); c.closePath(); ink(c, fc(e, U.shade(col, -0.25)), 1.3);
        if (e.pose === 'crouch' || e.pose === 'rush' || e.windT > 0) { c.beginPath(); c.moveTo(hx + 3, hy + 3.4); c.lineTo(hx + 8, hy + 3.4); c.lineTo(hx + 7, hy + 6.4); c.closePath(); ink(c, '#ff6b8a', 1.2); }
      } });
  }
  function drawGoat(ctx, e) {
    const col = e.look.limb;
    quad(ctx, e, { body: col, dark: U.shade(col, -0.3), rx: 10.5, ry: 6.2, legLen: 8, legW: 2.6, headDy: -4,
      tail(c, e, by, rx) { c.beginPath(); c.moveTo(-rx + 1, by - 3); c.lineTo(-rx - 4, by - 7); c.lineTo(-rx + 1, by - 1); c.closePath(); ink(c, fc(e, col), 1.4); },
      head(c, e, hx, hy) {
        const dip = e.pose === 'crouch' ? 4 : e.pose === 'rush' ? 2 : 0;
        c.save(); c.translate(0, dip);
        c.beginPath(); c.moveTo(hx - 2, hy - 4); c.quadraticCurveTo(hx - 9, hy - 14, hx - 11, hy - 4); c.quadraticCurveTo(hx - 7, hy - 9, hx - 1, hy - 1); c.closePath(); ink(c, fc(e, '#f2e8c9'), 1.5);
        c.beginPath(); c.ellipse(hx + 3.8, hy + 1.8, 4.6, 3, 0.2, 0, U.TAU); ink(c, fc(e, '#f2e8d0'), 1.6);
        c.beginPath(); c.arc(hx, hy, 5, 0, U.TAU); ink(c, fc(e, '#f2e8d0'), 1.8);
        c.fillStyle = INK; c.beginPath(); c.arc(hx + 7.6, hy + 0.6, 1.1, 0, U.TAU); c.fill();
        c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(hx + 1.8, hy - 1.4, 1.8, 0, U.TAU); c.fill(); c.fillStyle = INK; c.fillRect(hx + 1.2, hy - 2.4, 1.2, 2);
        c.beginPath(); c.moveTo(hx + 3, hy + 4); c.lineTo(hx + 1.6, hy + 9); c.lineTo(hx + 5, hy + 4.6); c.closePath(); ink(c, fc(e, '#e8dcc0'), 1.2);
        c.restore();
      } });
  }
  function drawCow(ctx, e) {
    quad(ctx, e, { body: '#ffffff', dark: '#d9d9e4', rx: 14.5, ry: 8.4, legLen: 8.5, legW: 3.2, headDy: -3,
      tail(c, e, by, rx) { const w = Math.sin(e.t * 6) * 2; c.beginPath(); c.moveTo(-rx + 1, by - 3); c.quadraticCurveTo(-rx - 7, by + 2, -rx - 6 + w, by + 9); c.strokeStyle = INK; c.lineWidth = 3; c.stroke(); c.fillStyle = fc(e, '#2a2438'); c.beginPath(); c.arc(-rx - 6 + w, by + 10, 2.2, 0, U.TAU); c.fill(); },
      spots(c, e, by, rx) { c.fillStyle = fc(e, '#2a2438'); c.beginPath(); c.ellipse(-rx * 0.3, by - 2, 4.5, 3.4, 0.3, 0, U.TAU); c.ellipse(rx * 0.35, by + 2.4, 3.6, 2.8, -0.2, 0, U.TAU); c.ellipse(-rx * 0.62, by + 3.5, 2.6, 2, 0, 0, U.TAU); c.fill(); c.fillStyle = fc(e, '#ff9ecf'); c.beginPath(); c.ellipse(-rx * 0.1, by + e.def.h * 0.0 + 7.6, 3, 2, 0, 0, U.TAU); c.fill(); },
      head(c, e, hx, hy) {
        const dip = e.pose === 'crouch' ? 4 : e.pose === 'rush' ? 1.5 : 0;
        c.save(); c.translate(0, dip);
        c.beginPath(); c.moveTo(hx - 1, hy - 5); c.quadraticCurveTo(hx - 3, hy - 11, hx + 1, hy - 10); c.quadraticCurveTo(hx, hy - 7, hx + 2, hy - 5); c.closePath(); ink(c, fc(e, '#f2e8c9'), 1.4);
        c.beginPath(); c.arc(hx, hy, 6.4, 0, U.TAU); ink(c, fc(e, '#ffffff'), 1.9);
        c.beginPath(); c.ellipse(hx + 4.2, hy + 2.8, 4.4, 3.4, 0, 0, U.TAU); ink(c, fc(e, '#ff9ecf'), 1.6);
        c.fillStyle = INK; c.beginPath(); c.arc(hx + 5.4, hy + 2.2, 0.9, 0, U.TAU); c.arc(hx + 7.2, hy + 2.6, 0.9, 0, U.TAU); c.fill();
        eye(c, hx + 1.4, hy - 1.8, 1.9, e);
        c.beginPath(); c.moveTo(hx - 3, hy - 2); c.lineTo(hx - 8, hy + 1); c.lineTo(hx - 3, hy + 3); c.closePath(); ink(c, fc(e, '#2a2438'), 1.3);
        c.beginPath(); c.arc(hx - 1, hy + 6.4, 1.8, 0, U.TAU); ink(c, '#ffd23f', 1);
        c.restore();
      } });
  }
  function drawGator(ctx, e) {
    const open = e.pose === 'crouch' ? 1 : e.pose === 'rush' ? 0.7 : 0;
    quad(ctx, e, { body: '#4f9a3a', dark: '#3a7a2a', rx: 15.5, ry: 4.6, legLen: 3.2, legW: 3, headDy: -0.5, headDx: 4,
      tail(c, e, by, rx) { const w = Math.sin(e.t * 5) * 2.5; c.beginPath(); c.moveTo(-rx + 2, by - 3.5); c.quadraticCurveTo(-rx - 8, by - 1 + w, -rx - 17, by + 2 + w); c.quadraticCurveTo(-rx - 7, by + 5, -rx + 2, by + 4); c.closePath(); ink(c, fc(e, '#4f9a3a'), 1.8); },
      spots(c, e, by, rx) { c.fillStyle = fc(e, '#3a7a2a'); for (let i = -3; i <= 3; i++) { c.beginPath(); c.moveTo(i * 4.2 - 2, by - 4.2); c.lineTo(i * 4.2, by - 8); c.lineTo(i * 4.2 + 2, by - 4.2); c.closePath(); c.fill(); c.lineWidth = 1; c.strokeStyle = INK; c.stroke(); } c.fillStyle = fc(e, '#d9e8a0'); c.beginPath(); c.ellipse(0, by + 2.4, rx * 0.8, 1.6, 0, 0, U.TAU); c.fill(); },
      head(c, e, hx, hy) {
        const j = open * 6;
        c.beginPath(); c.moveTo(hx - 4, hy - 1); c.lineTo(hx + 11, hy - 1 - j * 0.3); c.lineTo(hx + 11, hy + 1.6 - j * 0.3); c.lineTo(hx - 4, hy + 2.5); c.closePath(); ink(c, fc(e, '#4f9a3a'), 1.8);
        c.save(); c.translate(hx, hy + 2); c.rotate(open * 0.5); c.beginPath(); c.moveTo(-4, 0); c.lineTo(11, 0.5); c.lineTo(11, 3.4); c.lineTo(-4, 3.8); c.closePath(); ink(c, fc(e, '#3a7a2a'), 1.8);
        c.fillStyle = '#ffffff'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(i * 3 + 1, 0.4); c.lineTo(i * 3 + 2.4, -2.4); c.lineTo(i * 3 + 3.6, 0.4); c.fill(); } c.restore();
        c.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(i * 3.4 + 2, 2); c.lineTo(i * 3.4 + 3.4, 4.6 + j * 0.5); c.lineTo(i * 3.4 + 4.8, 2); c.fill(); }
        c.beginPath(); c.arc(hx + 1, hy - 3, 2.6, 0, U.TAU); ink(c, fc(e, '#4f9a3a'), 1.5); eye(c, hx + 1.4, hy - 3, 1.4, e);
      } });
  }
  function drawPenguin(ctx, e) {
    const slide = e.pose === 'rush', hurt = e.pose === 'hurt';
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.facing, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (slide) { ctx.translate(0, -6); ctx.rotate(Math.PI / 2); ctx.translate(0, 6); }
    const wob = e.pose === 'run' ? Math.sin(e.anim * 14) * 0.12 : hurt ? Math.sin(e.t * 20) * 0.2 : 0;
    ctx.rotate(wob);
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(s * 3 + 1, -1, 3.6, 1.8, 0, 0, U.TAU); ink(ctx, fc(e, '#ff9a1a'), 1.4); }
    ctx.beginPath(); ctx.ellipse(0, -9.5, 6.6, 9.4, 0, 0, U.TAU); ink(ctx, fc(e, '#2a2438'), 2);
    ctx.beginPath(); ctx.ellipse(1.6, -8.4, 4.2, 7, 0, 0, U.TAU); ctx.fillStyle = fc(e, '#ffffff'); ctx.fill();
    const fl = slide ? -0.3 : Math.sin(e.t * 8) * 0.25 + (e.windT > 0 ? -1 : 0);
    ctx.save(); ctx.translate(-4, -11); ctx.rotate(0.5 + fl); ctx.beginPath(); ctx.ellipse(-1, 3, 2.2, 5.6, 0, 0, U.TAU); ink(ctx, fc(e, '#2a2438'), 1.5); ctx.restore();
    eye(ctx, 3.2, -14.4, 1.8, e); ctx.beginPath(); ctx.moveTo(5, -13.2); ctx.lineTo(10.4, -12); ctx.lineTo(5, -10.8); ctx.closePath(); ink(ctx, fc(e, '#ff9a1a'), 1.4);
    if (e.pose === 'hurt') { ctx.fillStyle = '#ffe14d'; for (let i = 0; i < 3; i++) { const a = e.t * 6 + i * 2.1; ctx.fillRect(Math.cos(a) * 7, -22 + Math.sin(a) * 2, 2, 2); } }
    ctx.restore();
  }
  function drawSnake(ctx, e) {
    const up = e.pose === 'crouch' ? 1 : 0, rush = e.pose === 'rush', moving = Math.abs(e.vx) > 6;
    const N = 11, pts = [], len = rush ? 40 : 30, t = e.anim * (moving ? 9 : 3);
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(e.facing, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = 0; i <= N; i++) {
      const k = i / N; // 0 = head, 1 = tail
      let x = len * 0.5 - k * len, y = -3 + Math.sin(t + k * 7) * (rush ? 0.6 : 2.2) * k;
      if (up) { const kk = Math.max(0, 1 - k * 2.2); x += kk * kk * -4; y -= kk * kk * 17; }
      pts.push({ x, y });
    }
    const body = fc(e, e.look.limb);
    for (const pass of [0, 1]) {
      ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = pass ? body : INK; ctx.lineWidth = pass ? 5 : 8; ctx.stroke();
    }
    ctx.strokeStyle = fc(e, '#e8e03a'); ctx.lineWidth = 1.6; ctx.setLineDash([2, 4]); ctx.beginPath(); ctx.moveTo(pts[1].x, pts[1].y); for (let i = 2; i <= N; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); ctx.setLineDash([]);
    const h = pts[0];
    ctx.beginPath(); ctx.ellipse(h.x + 2, h.y - 0.5, 5, 3.6, up ? -0.3 : 0, 0, U.TAU); ink(ctx, body, 1.8);
    eye(ctx, h.x + 3, h.y - 1.6, 1.4, e);
    if (up || Math.sin(e.t * 9) > 0.6) { ctx.strokeStyle = '#ff3b6b'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(h.x + 7, h.y); ctx.lineTo(h.x + 11, h.y); ctx.lineTo(h.x + 13, h.y - 1.5); ctx.moveTo(h.x + 11, h.y); ctx.lineTo(h.x + 13, h.y + 1.5); ctx.stroke(); }
    ctx.restore();
  }

  // ================= BASE ROSTER (DESIGN section 7) =================
  const GRUNT_LOOK = { limb: '#57506e', head: '#ffffff', headR: 7, thick: 3.1, body: 'stick', face: 'angry', band: '#e8173a', props: ['bandana', 'shades'] };
  Defs.grunt = {
    name: 'GRUNT', hp: 2, w: 14, h: 30, speed: 48, runSpeed: 105, gun: 'pistol', ai: 'soldier', sight: 360, themed: true,
    gold: [3, 6], windup: 0.5, burst: 1, burstGap: 0.16, cooldown: [1.3, 2.1], shotSpeed: 360, shotDmg: 1, range: [130, 290],
    alert: ['HUH?!', '!?', 'WHO DAT?', 'INTRUDER!'], look: GRUNT_LOOK,
  };
  Defs.shotgunner = {
    name: 'SHOTGUNNER', hp: 2, w: 15, h: 30, speed: 42, runSpeed: 90, gun: 'shotgun', ai: 'soldier', sight: 330, themed: true,
    gold: [4, 8], windup: 0.58, burst: 1, cooldown: [1.9, 2.7], shotSpeed: 560, shotDmg: 1, range: [80, 190], dropChance: 0.05,
    alert: ['DOOSH?', 'SHOTGUN TIME!', 'HOWDY, STRANGER!'], hurtWords: ['OOF!', 'MY SHOTGUN!'],
    look: { limb: '#a8602d', head: '#ffffff', headR: 7.2, thick: 3.4, body: 'stick', face: 'angry', props: ['mustache'] },
  };
  Defs.gunner = {
    name: 'GUNNER', hp: 2, w: 15, h: 30, speed: 40, runSpeed: 85, gun: 'mg', ai: 'soldier', sight: 380, themed: true,
    gold: [4, 8], windup: 0.5, burst: 4, burstGap: 0.1, cooldown: [1.7, 2.5], shotSpeed: 520, shotDmg: 1, range: [170, 320],
    alert: ['BRRRT?', 'OPEN FIRE!', 'CONTACT!'],
    look: { limb: '#4a6a4a', head: '#ffffff', headR: 7, thick: 3.2, body: 'stick', face: 'angry', props: ['helmet', 'goggles'] },
  };
  Defs.rocketeer = {
    name: 'ROCKETEER', hp: 2, w: 15, h: 30, speed: 36, runSpeed: 70, gun: 'rocket', ai: 'soldier', sight: 420, themed: true,
    gold: [5, 9], windup: 0.62, burst: 1, cooldown: [2.6, 3.6], shotSpeed: 250, shotDmg: 1, dmgMul: 0.5, range: [190, 380], dropChance: 0.06,
    alert: ['SHHH?!', 'BAZOOKA TIME!', 'DUCK!'], look: { limb: '#c0502a', head: '#ffffff', headR: 7, thick: 3.3, body: 'stick', face: 'angry', pack: '#7a8a3a', props: ['helmet', 'backpack'] },
  };
  Defs.grenadier = {
    name: 'GRENADIER', hp: 2, w: 14, h: 30, speed: 38, runSpeed: 70, backSpeed: 75, gun: 'none', ai: 'soldier', sight: 380, themed: true, noAttacks: true,
    gold: [4, 7], windup: 0.6, cooldown: [2.2, 3.0], range: [150, 310], alert: ['CATCH!', 'PINEAPPLE!', 'FIRE IN THE HOLE!'],
    look: { limb: '#6a8a3a', head: '#ffffff', headR: 7, thick: 3.2, body: 'fat', face: 'derp', props: ['helmet', 'bowtie'], tie: '#ffd23f' },
    attacks: [{
      id: 'lob', range: [90, 330], windup: 0.6, bubble: ['CATCH!', 'HOT POTATO!'], sfx: 'throw',
      start(e) { e.swing = -2.2; },
      tick(e, dt, p, k) { e.swing = -2.2 + k * 0.4; },
      fire(e, p) {
        e.swing = undefined;
        const mx = e.x + e.facing * 8, my = e.y - 28, tt = U.clamp(Math.abs(p.x - mx) / 300, 0.6, 1.1);
        const v = lobVel(mx, my, p.x + (p.vx || 0) * tt * 0.35, p.y - 6, tt);
        S.Shots.spawn('grenade', mx, my, U.clamp(v.vx, -430, 430), v.vy, 'enemy', { blast: 54, blastDmg: 2, fuse: tt + 0.3, owner: e, color: '#4f7a2a' });
        sfx('throw', { x: e.x }); word('HUP!', mx, my - 10, { size: 14, color: '#ffffff', life: 0.4 });
      },
    }],
  };
  Defs.shield = {
    name: 'SHIELD GUY', hp: 1, shield: 3, w: 16, h: 30, speed: 44, runSpeed: 78, gun: 'pistol', ai: 'soldier', sight: 330, themed: true, noAttacks: true,
    gold: [4, 8], windup: 0.55, cooldown: [1.6, 2.4], shotSpeed: 340, shotDmg: 1, range: [0, 44], turnDelay: 0.65, hitSfx: 'hit_metal',
    alert: ['NOPE!', 'HALT!', 'BACK OFF!'], look: { limb: '#4f6fa8', head: '#ffffff', headR: 7, thick: 3.5, body: 'stick', face: 'angry', shield: '#4f6fa8', props: ['helmet', 'shield'] },
    attacks: [
      { id: 'bash', range: [0, 60], windup: 0.45, bubble: ['BONK TIME!'],
        fire(e, p) { e.meleeT = undefined; if (Math.abs(p.x - e.x) < 44 && Math.abs(p.y - e.y) < 40 && Math.sign(p.x - e.x) === e.facing) { hurtPlayer(e, 1, { knock: 260 }); word('BASH!', e.x + e.facing * 20, e.y - 28, { size: 22, color: '#ffe14d', burst: true, burstColor: '#e8173a' }); sfx('punch', { x: e.x }); } else word('WHIFF', e.x + e.facing * 20, e.y - 28, { size: 13, color: '#ffffff', life: 0.4 }); } },
      Enemies.gunAttack({ range: [56, 320] }),
    ],
    init(e) { e.shieldMax = e.shieldHp = e.def.shield; },
    // killability: the shield is ablative armour (3 hit points of chip damage, then it CRACKS and breaks and he is a 1-hit grunt);
    // blasts / melee / lasers / anything from behind still hit the body directly. It never makes him immune.
    onHurt(e, dmg, src, info) {
      const k = info.kind;
      if (e.shieldHp > 0 && (k === 'bullet' || k === 'pellet' || k === 'flame')) {
        const frontal = info.dirX ? info.dirX === -e.facing : (src && src.x != null && Math.sign(src.x - e.x) === e.facing);
        if (frontal) {
          e.blockT = 0.16; e.hitT = 0.5; e.shieldHp -= dmg;
          if (S.FX) S.FX.spark(e.x + e.facing * 11, e.y - 16, 3, '#ffffff');
          if (e.shieldHp <= 0) { // BREAK: the overflow goes into the body
            const over = -e.shieldHp; e.shieldHp = 0; e.shieldGone = true; e.blockT = 0; e.stun = 0.3; e.flash = 0.14;
            e.look = Object.assign({}, e.look, { props: (e.look.props || []).filter((n) => n !== 'shield') });
            word('CRACK!', e.x + e.facing * 14, e.y - 34, { size: 26, color: '#ffffff', stroke: '#e8173a', burst: true, burstColor: '#ffe14d', life: 0.7 });
            if (S.FX) { S.FX.debris(e.x + e.facing * 11, e.y - 16, 9, '#4f6fa8'); S.FX.shake(0.12); }
            sfx('hit_metal', { x: e.x, vol: 0.7, pitch: 0.7 }); say(e, U.pick(['MY SHIELD!', 'NOOO!', 'OH NO']), 0.9);
            return over;
          }
          e.crackT = 0.25;
          if (e.t - (e.nopeT || -9) > 0.22) { e.nopeT = e.t; word(U.pick(['TINK!', 'CLANG!', 'NOPE!']), e.x + e.facing * 12, e.y - 36, { size: 17, color: '#ffffff', stroke: '#4f6fa8', burst: true, burstColor: '#141018', life: 0.45 }); sfx('hit_metal', { x: e.x, vol: 0.6 }); }
          return false;
        }
      }
    },
    drawAfter(ctx, e) { // cracks spread over the shield as it takes hits
      if (e.shieldGone || !(e.shieldHp < e.shieldMax)) return;
      const miss = e.shieldMax - e.shieldHp, cx = e.x + e.facing * 10, cy = e.y - 16;
      ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (let i = 0; i < Math.ceil(miss); i++) { const a = i * 2.1 + 0.5; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * 2, cy + Math.sin(a) * 2); ctx.lineTo(cx + Math.cos(a) * 7 + 2, cy + Math.sin(a) * 7 - 2); ctx.lineTo(cx + Math.cos(a + 0.3) * 12, cy + Math.sin(a + 0.3) * 12 + 1); ctx.stroke(); }
      ctx.restore();
    },
  };
  Defs.dog = {
    name: 'DOG', hp: 1, w: 22, h: 13, speed: 55, chase: 150, rushSpeed: 330, rushDur: 0.55, rushRange: 165, windup: 0.45, recover: 0.5, cooldown: [0.3, 0.9],
    touchDmg: 1, ai: 'charger', sight: 400, gold: [2, 4], voiceless: true, stampede: true, bloodless: true, windSfx: 'bark',
    alert: ['BARK!', 'ARF!', 'GRRR!', 'WOOF!'], bubble: ['BARK!', 'GRRR!'], deathWords: ['YIPE!', 'POOF!', 'SPLAT!'], hurtWords: ['YELP!'],
    look: { limb: '#b8803a', head: '#ffe0b0', headR: 5, thick: 3, body: 'tiny', props: [] }, draw: drawDog,
  };
  // jetpack goon: hovers over the player and drops telegraphed bombs
  function jetAI(e, dt) {
    const p = player(), d = e.def;
    e.anim += dt; e.pose = 'float'; e.jet = 0.55 + 0.45 * Math.sin(e.t * 30); e.facing = p ? (p.x >= e.x ? 1 : -1) : e.facing;
    const busy = e.tickAttack(dt, p);
    if (e.state === 'patrol') {
      e.hx = e.hx == null ? e.x : e.hx; e.hy = e.hy == null ? e.y : e.hy;
      steer(e, e.hx + Math.sin(e.t * 0.7) * 50, e.hy + Math.sin(e.t * 1.9) * 10, 300, 70, dt);
      if (e.sees(p)) notice(e);
    } else if (e.state === 'alert') {
      e.alertT -= dt; e.vx = U.approach(e.vx, 0, 500 * dt); e.vy = U.approach(e.vy, 0, 500 * dt); if (e.alertT <= 0) e.state = 'attack';
    } else if (p) {
      if (busy) { e.vx = U.approach(e.vx, 0, 360 * dt); e.vy = U.approach(e.vy, 0, 360 * dt); e.jet = 1; }
      else {
        const swoop = (e.t % 4.4) > 3.2; // killability: hovers 80 px up (an up-angled shot reaches it) and swoops to chest height for ~1 s every 4 s (a flat shot reaches it)
        steer(e, p.x + Math.sin(e.t * 0.9) * 110, p.y - (swoop ? 14 : 80) + Math.sin(e.t * 1.7) * 8, 380, 160, dt);
        e.tryAttack(dt, p);
      }
      if (!e.sees(p)) { e.lostT += dt; if (e.lostT > 5) { e.state = 'patrol'; e.alerted = false; e.lostT = 0; e.hx = e.x; e.hy = e.y; } } else e.lostT = 0;
    }
  }
  Defs.jetpack = {
    name: 'JETPACK GOON', hp: 2, w: 16, h: 30, flies: true, ai: jetAI, sight: 520, sightY: 420, allAround: true, themed: true, noAttacks: true, panics: false,
    gold: [4, 8], windup: 0.45, cooldown: [1.5, 2.4], alert: ['WHEEE!', 'BOMBS AWAY!', 'INCOMING!'], gun: 'none',
    look: { limb: '#57506e', head: '#ffffff', headR: 7, thick: 3.1, body: 'stick', face: 'derp', pack: '#d23a2a', props: ['helmet', 'jetpack'] },
    attacks: [{
      id: 'bomb', range: [0, 190], windup: 0.45, bubble: ['BOMBS AWAY!', 'HERE\'S A PRESENT!'],
      fire(e, p) {
        const b = S.Shots.spawn('grenade', e.x, e.y - 6, e.vx * 0.5 + e.facing * 20, 20, 'enemy', { blast: 46, blastDmg: 2, fuse: 1.7, impact: true, owner: e, color: '#2a2438' });
        sfx('throw', { x: e.x, vol: 0.5 }); word('PLOP', e.x, e.y + 6, { size: 12, color: '#ffffff', life: 0.35, vy: 20 }); return b;
      },
    }],
  };
  Defs.brute = {
    name: 'BRUTE', hp: 6, hurtFace: 'scared', w: 22, h: 42, speed: 28, runSpeed: 46, gun: 'mg', ai: 'soldier', sight: 400, themed: true, knockMul: 0.25,
    gold: [20, 34], windup: 0.65, burst: 9, burstGap: 0.075, cooldown: [1.8, 2.8], shotSpeed: 470, shotDmg: 1, range: [120, 300], dropChance: 0.5,
    alert: ['GRAAAH!', 'ME SMASH!', 'RAAAAH!'], deathWords: ['KA-THUD!', 'TIMBER!', 'OOF!'], hurtWords: ['GRR', 'HMPH', 'RAAH'],
    look: { limb: '#b8452a', head: '#ffd9b0', headR: 7, thick: 3.6, scale: 1.45, body: 'fat', face: 'angry', tie: '#ffd23f', props: ['bowtie', 'beanie'] },
  };
  // MG nest: sandbags + a gun that swings around to follow you
  function nestUpdate(e, dt) {
    const p = player(), d = e.def;
    const px = e.x, py = e.y - 17;
    if (e.aimA == null) e.aimA = e.facing > 0 ? 0 : Math.PI;
    if (p && e.alerted) {
      const want = Math.atan2((p.y - 14) - py, p.x - px);
      let da = want - e.aimA; while (da > Math.PI) da -= U.TAU; while (da < -Math.PI) da += U.TAU;
      e.aimA += U.clamp(da, -4.5 * dt, 4.5 * dt);
    }
    e.muzzleX = px + Math.cos(e.aimA) * 19; e.muzzleY = py + Math.sin(e.aimA) * 19;
    e.facing = Math.cos(e.aimA) >= 0 ? 1 : -1;
  }
  function drawNest(ctx, e) {
    const px = e.x, py = e.y - 17, a = e.aimA == null ? 0 : e.aimA, hurt = e.flash > 0;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // gunner head peeking behind the gun
    const hx = px - Math.cos(a) * 7, hy = py - 9 + Math.sin(a) * 1.5;
    ctx.beginPath(); ctx.arc(hx, hy, 6, 0, U.TAU); ink(ctx, fc(e, '#ffffff'), 2); ctx.beginPath(); ctx.arc(hx, hy - 1, 6.6, Math.PI, 0); ctx.closePath(); ink(ctx, fc(e, '#5f7a3a'), 1.8);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * 2.6, hy + 1, 1.1, 0, U.TAU); ctx.fill();
    // gun on a pivot
    ctx.save(); ctx.translate(px, py); ctx.rotate(a);
    ctx.fillStyle = fc(e, '#4b4f63'); ctx.fillRect(-4, -3, 22, 6); ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.strokeRect(-4, -3, 22, 6);
    ctx.fillStyle = fc(e, '#6f7488'); ctx.fillRect(18, -1.8, 7, 3.6); ctx.strokeRect(18, -1.8, 7, 3.6);
    ctx.fillStyle = fc(e, '#c9b26a'); ctx.fillRect(6, -6, 7, 3); ctx.strokeRect(6, -6, 7, 3);
    if (e.muzzleFlash > 0.2) { ctx.fillStyle = '#fff36b'; ctx.beginPath(); ctx.moveTo(25, 0); ctx.lineTo(31, -4); ctx.lineTo(29, 0); ctx.lineTo(31, 4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // sandbags
    const bag = (x, y, w, h) => { ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, U.TAU); ink(ctx, fc(e, '#c9a66a'), 2); ctx.strokeStyle = '#a07a3a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - w * 0.5, y); ctx.lineTo(x + w * 0.5, y); ctx.stroke(); };
    bag(e.x - 9, e.y - 4, 9, 4.4); bag(e.x + 9, e.y - 4, 9, 4.4); bag(e.x, e.y - 11, 9.5, 4.6); bag(e.x - 12, e.y - 11, 6.4, 4); bag(e.x + 12, e.y - 11, 6.4, 4);
    ctx.restore();
  }
  Defs.turret = {
    name: 'MG NEST', hp: 3, w: 32, h: 22, hitH: 32, stationary: true, allAround: true, sight: 440, sightY: 280, ai: 'soldier', gold: [8, 14], windup: 0.5, noKnock: true, bloodless: true,
    hitSfx: 'hit_metal', gibs: false, noAttacks: true, shotDmg: 1, alert: ['CONTACT!', 'OPEN FIRE!', 'NEST ACTIVATED!'], deathWords: ['KA-BLAM!', 'CLANK!', 'BOOM!'], hurtWords: ['CLANG', 'TINK'], gun: 'none', voiceless: true,
    look: { limb: '#c9a66a', head: '#ffffff', headR: 6, thick: 3, body: 'stick', props: [] }, update: nestUpdate, draw: drawNest,
    onDeath(e) { if (S.FX) { S.FX.explosion(e.x, e.y - 12, 28); S.FX.debris(e.x, e.y - 12, 8, '#c9a66a'); } },
    attacks: [{
      id: 'burst', range: [0, 470], windup: 0.5, cooldown: [1.7, 2.5], bubble: ['RATATAT!'],
      fire(e, p) { e.queueBurst(5, 0.09, (en) => { const pl = player(); if (pl) bulletAt(en, pl.x, pl.y - 14, { speed: 430, spread: 0.07, sfx: 'mg', word: 'BRRT' }); }); },
    }],
  };
  Defs.sniper = {
    name: 'SNIPER', hp: 2, w: 14, h: 22, stationary: true, pose: 'crouch', gun: 'sniper', ai: 'soldier', sight: 640, sightY: 320, noAttacks: true, themed: true,
    gold: [6, 10], dropChance: 0.08, shotDmg: 1.5, windup: 0.95, alert: ['GOTCHA!', 'I SEE YOU!', 'HOLD STILL...'],
    look: { limb: '#4a5a3a', head: '#ffffff', headR: 7, thick: 3.2, body: 'stick', face: 'angry', props: ['bucketHat'] },
    attacks: [{
      id: 'snipe', range: [0, 720], windup: 0.95, cooldown: [2.3, 3.2], bubble: ['HOLD STILL...', 'SAY CHEESE!'],
      tick(e, dt, p, k) { if (p && k < 0.55) { e.lockX = p.x; e.lockY = p.y - 14; e.face(p, true); } e.locked = k >= 0.55; },
      fire(e, p) {
        e.locked = false; e.muzzle();
        const mx = e.muzzleX, my = e.muzzleY, dx = e.lockX - mx, dy = e.lockY - my, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
        const far = S.Terrain ? S.Terrain.raycast(mx, my, mx + ux * 760, my + uy * 760) : null, x1 = far ? far.x : mx + ux * 760, y1 = far ? far.y : my + uy * 760;
        S.Shots.add({ kind: 'beam', x: mx, y: my, x1, y1, life: 0.14, max: 0.14, team: 'enemy', w: 4.5, dead: false });
        sfx('laser', { x: mx, vol: 0.55, pitch: 0.8 }); word('ZZZAP', (mx + x1) / 2, (my + y1) / 2 - 10, { size: 14, color: '#ff3b6b', life: 0.35 });
        e.recoil = 1; e.muzzleFlash = 1;
        const pl = player();
        if (pl) { const cx = pl.x, cy = pl.y - pl.h / 2, t = U.clamp(((cx - mx) * ux + (cy - my) * uy), 0, Math.hypot(x1 - mx, y1 - my)); if (Math.hypot(mx + ux * t - cx, my + uy * t - cy) < 11) S.Game.damage(pl, e.shotDmg, { team: 'enemy', owner: e, kind: 'laser', dirX: Math.sign(ux) || 1, x: cx, y: cy }); }
      },
    }],
    drawAfter(ctx, e) { // laser sight
      if (!e.atk || e.atk.id !== 'snipe' || e.lockX == null) return;
      e.muzzle();
      const mx = e.muzzleX, my = e.muzzleY, dx = e.lockX - mx, dy = e.lockY - my, L = Math.hypot(dx, dy) || 1;
      const far = S.Terrain ? S.Terrain.raycast(mx, my, mx + dx / L * 760, my + dy / L * 760) : null;
      const x1 = far ? far.x : mx + dx / L * 760, y1 = far ? far.y : my + dy / L * 760;
      const blink = e.locked ? Math.floor(e.t * 22) % 2 : 1;
      ctx.save(); ctx.lineCap = 'round'; ctx.globalAlpha = blink ? 0.9 : 0.35; ctx.strokeStyle = e.locked ? '#ff1a3a' : '#ff7a9a'; ctx.lineWidth = e.locked ? 1.8 : 1;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(x1, y1); ctx.stroke();
      if (e.locked) { ctx.beginPath(); ctx.arc(e.lockX, e.lockY, 6, 0, U.TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.lockX - 9, e.lockY); ctx.lineTo(e.lockX + 9, e.lockY); ctx.moveTo(e.lockX, e.lockY - 9); ctx.lineTo(e.lockX, e.lockY + 9); ctx.stroke(); }
      ctx.restore();
    },
  };
  Defs.officer = {
    name: 'OFFICER', hp: 2, w: 15, h: 30, speed: 40, runSpeed: 80, backSpeed: 72, gun: 'pistol', ai: 'soldier', sight: 400, noAttacks: true,
    gold: [8, 14], windup: 0.5, cooldown: [1.5, 2.3], shotSpeed: 340, range: [190, 340], dropChance: 1,
    alert: ['SOUND THE WHISTLE!', 'HALT!', 'HEY YOU!'], dropPick() { return U.pick(['S', 'M', 'D', 'R', 'F', 'L', 'B', 'rapid', 'heal']); },
    look: { limb: '#2f4f9a', head: '#ffffff', headR: 7, thick: 3.3, body: 'stick', face: 'angry', tie: '#ffd23f', beretColor: '#2f6fd6', props: ['beret', 'mustache', 'bowtie'] },
    init(e) { e.calls = 0; e.nextCall = 0; },
    attacks: [
      { id: 'whistle', prio: true, windup: 0.6, cooldown: [1.2, 1.8], sfx: 'whistle', bubble: ['TWEEEEET!'],
        need(e) { return e.calls < 2 && e.t >= e.nextCall; },
        fire(e, p) { e.calls++; e.nextCall = e.t + 7; word('TWEEEEET!', e.x, e.y - 52, { size: 26, color: '#ffffff', stroke: '#2f4f9a', burst: true, burstColor: '#ffe14d', life: 0.9 }); if (Enemies.parachute(e, 'grunt', 2)) say(e, 'REINFORCEMENTS!', 1.2); } },
      Enemies.gunAttack(),
    ],
  };
  // barrel roller: pushes an explosive barrel along, then SHOVES it at you (lit, rolling) and runs away screaming
  function rollBarrel(b, dir) {
    if (b.rollWrapped) return;
    b.rollWrapped = true; const upd = b.update, drw = b.draw;
    b.update = function (dt) {
      if (this.rolling && !this.dead) {
        this.rollT -= dt; this.rot = (this.rot || 0) + this.vx * dt / 9; this.vx = this.rdir * 190;
        if (this.hitWall) this.rdir = -this.rdir;
        if (S.FX && Math.random() < 0.5) S.FX.fire(this.x, this.y - 19, 1);
        const p = player();
        if (this.fuse < 0 && ((p && U.overlap(this, p, 0)) || this.rollT <= 0)) { this.rolling = false; this.hurt(99, null, { blast: true }); word('BONK!', this.x, this.y - 28, { size: 18, color: '#ffe14d', life: 0.4 }); }
      }
      upd.call(this, dt);
    };
    b.draw = function (ctx) {
      if (!this.rolling) { drw.call(this, ctx); return; }
      ctx.save(); ctx.translate(this.x, this.y - 9); ctx.rotate(this.rot || 0); ctx.translate(-this.x, -(this.y - 9)); drw.call(this, ctx); ctx.restore();
    };
  }
  function rollerAI(e, dt) {
    const p = player(), d = e.def, b = e.barrel, has = b && !b.dead && !b.rolling && b.fuse < 0, sees = e.sees(p);
    if (has) { b.x = e.x + e.facing * 17; b.y = e.y; b.vx = 0; b.vy = 0; }
    switch (e.state) {
      case 'patrol':
        if (has && solidAt(e.x + e.facing * 28, e.y - 8)) e.facing *= -1;
        patrolWalk(e, dt, d.speed || 42); animGround(e, dt);
        if (sees && has && Math.abs(p.x - e.x) < 330) { notice(e); e.state = 'alert'; }
        break;
      case 'alert':
        e.alertT -= dt; e.vx = U.approach(e.vx, 0, 900 * dt); if (p) e.face(p, true);
        if (e.alertT <= 0) { if (has) { e.state = 'wind'; e.windMax = d.windup; e.windT = d.windup; say(e, 'HEADS UP!', 0.8); } else e.state = 'flee'; e.fleeT = 3; }
        animGround(e, dt); break;
      case 'wind':
        e.windT -= dt; e.vx = 0; if (p) e.face(p, true); if (has) { b.x = e.x + e.facing * 17 + U.rand(-1, 1); }
        e.pose = 'crouch'; e.anim += dt;
        if (e.windT <= 0) {
          e.windT = 0; e.state = 'flee'; e.fleeT = 3.2;
          if (has) { rollBarrel(b); b.rolling = true; b.rdir = e.facing; b.rollT = 2.4; b.vx = e.facing * 190; b.rot = 0; word('ROLL OUT!', e.x + e.facing * 20, e.y - 36, { size: 20, color: '#ffe14d', stroke: '#e8173a', burst: true, burstColor: '#141018' }); sfx('throw', { x: e.x }); e.barrel = null; }
        }
        break;
      case 'flee': case 'attack': {
        e.fleeT -= dt;
        if (p && e.fleeT > 0) {
          const f = p.x >= e.x ? -1 : 1; e.facing = f; if (e.wallAhead() || e.ledgeAhead()) e.vx = 0; else e.vx = U.approach(e.vx, f * (d.runSpeed || 120), 900 * dt);
          if (e.fleeT > 2.9 && !e.screamed) { e.screamed = true; say(e, U.pick(['WAAAAH!', 'NOT MY BARREL!', 'RUN!']), 1.2); }
        } else { e.vx = U.approach(e.vx, 0, 900 * dt); if (e.fleeT < -3) { e.fleeT = 0; } }
        animGround(e, dt); e.pose = Math.abs(e.vx) > 8 ? 'panic' : 'idle'; break;
      }
    }
  }
  Defs.roller = {
    name: 'BARREL ROLLER', hp: 2, w: 14, h: 30, speed: 42, runSpeed: 125, ai: rollerAI, sight: 360, themed: true, gun: 'none', noAttacks: true, windup: 0.55, panics: false,
    gold: [4, 7], alert: ['HEADS UP!', 'FIRE IN THE HOLE!', 'ROLL OUT!'], look: { limb: '#d9822b', head: '#ffffff', headR: 7, thick: 3.2, body: 'stick', face: 'derp', props: ['trafficCone'] },
    init(e) { if (S.Game && S.Game.spawn && S.Ents) { e.barrel = S.Ents.barrel(e.x + e.facing * 17, e.y); S.Game.spawn(e.barrel); } },
    onDeath(e) { if (e.barrel && !e.barrel.dead && !e.barrel.rolling) { e.barrel = null; } },
  };
  Defs.barrelroller = Defs.roller;

  // ================= THEME EXTRAS =================
  // ----- ICE: snowman (lobs snowballs, EXPLODES into snowballs), penguin (belly-slider) -----
  function drawSnowman(ctx, e) {
    const x = e.x, y = e.y, bob = Math.abs(Math.sin(e.anim * 8)) * (e.pose === 'run' ? 1.4 : 0), up = e.windT > 0;
    ctx.save(); ctx.translate(x, y - bob); ctx.scale(e.facing, 1); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const sn = (cy, r) => { ctx.beginPath(); ctx.arc(0, cy, r, 0, U.TAU); ink(ctx, fc(e, '#ffffff'), 2); ctx.beginPath(); ctx.arc(-r * 0.3, cy - r * 0.3, r * 0.3, 0, U.TAU); ctx.fillStyle = fc(e, '#dcefff'); ctx.fill(); };
    sn(-9, 9.5); sn(-23, 7); sn(-33.5, 5.6);
    // stick arms
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; const aY = -24;
    ctx.beginPath(); ctx.moveTo(-5, aY); ctx.lineTo(-14, aY - 3 - (up ? 6 : 0)); ctx.moveTo(-14, aY - 3 - (up ? 6 : 0)); ctx.lineTo(-17, aY - 8 - (up ? 6 : 0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(5, aY); ctx.lineTo(up ? 12 : 14, aY - (up ? 12 : 1)); ctx.moveTo(up ? 12 : 14, aY - (up ? 12 : 1)); ctx.lineTo(up ? 14 : 18, aY - (up ? 17 : 6)); ctx.stroke();
    if (up) { ctx.beginPath(); ctx.arc(14, aY - 20, 4, 0, U.TAU); ink(ctx, '#ffffff', 1.6); }
    // face
    ctx.fillStyle = INK; for (const [ex, ey] of [[1.6, -35.2], [4.2, -35.4]]) { ctx.beginPath(); ctx.arc(ex, ey, 0.9, 0, U.TAU); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(5, -33.4); ctx.lineTo(12, -32.4); ctx.lineTo(5, -31.6); ctx.closePath(); ink(ctx, fc(e, '#ff8c1a'), 1.3);
    for (const by of [-25, -21, -17]) { ctx.beginPath(); ctx.arc(1, by, 1.1, 0, U.TAU); ctx.fillStyle = INK; ctx.fill(); }
    // hat
    ctx.fillStyle = fc(e, '#2a2438'); ctx.fillRect(-5.6, -44, 11.2, 8); ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.strokeRect(-5.6, -44, 11.2, 8);
    ctx.beginPath(); ctx.ellipse(0, -38.4, 8.6, 2, 0, 0, U.TAU); ink(ctx, fc(e, '#2a2438'), 1.6); ctx.fillStyle = fc(e, '#e8173a'); ctx.fillRect(-5.6, -41, 11.2, 2);
    ctx.restore();
  }
  Defs.snowman = {
    name: 'SNOWMAN', hp: 2, w: 18, h: 38, hitH: 46, speed: 34, runSpeed: 55, ai: 'soldier', sight: 360, noAttacks: true, gibs: false, bloodless: true, gold: [4, 7],
    windup: 0.52, range: [110, 300], alert: ['FROSTY WANTS A WORD!', 'CHILL OUT!', 'HI-YA!'], deathWords: ['FWUMP!', 'POOF!'], hurtWords: ['BRR!', 'FLUMP'],
    look: { limb: '#ffffff', head: '#ffffff', headR: 6, thick: 3, body: 'stick', props: [] }, draw: drawSnowman,
    attacks: [{
      id: 'snowball', range: [60, 330], windup: 0.52, bubble: ['SNOWBALL!', 'CATCH THIS!'],
      fire(e, p) { lob(e, p.x + (p.vx || 0) * 0.3, p.y - 12, { mx: e.x + e.facing * 12, my: e.y - 36, r: 5, style: 'snow', dmg: 1, splat: 'FWUMP!', color: '#ffffff', speed: 300 }); sfx('throw', { x: e.x, vol: 0.4 }); },
    }],
    onDeath(e) {
      if (S.FX) { S.FX.debris(e.x, e.y - 20, 12, '#ffffff'); S.FX.spark(e.x, e.y - 20, 8, '#bfefff'); }
      word('KA-FWUMP!', e.x, e.y - 40, { size: 24, color: '#ffffff', stroke: '#3b8bff', burst: true, burstColor: '#bfefff', life: 0.8 });
      for (let i = 0; i < 6; i++) shot({ owner: e, x: e.x + U.rand(-4, 4), y: e.y - 24, vx: U.rand(-190, 190), vy: U.rand(-460, -280), grav: 1, r: 4, style: 'snow', dmg: 1, life: 3, color: '#ffffff', splat: 'FWUMP!' });
    },
  };
  Defs.penguin = {
    name: 'PENGUIN', hp: 2, w: 16, h: 19, speed: 28, chase: 66, rushSpeed: 330, rushDur: 1.0, rushRange: 240, windup: 0.45, recover: 0.95, cooldown: [0.6, 1.4], dizzy: true, stopAtLedge: false,
    touchDmg: 1, ai: 'charger', sight: 400, gold: [3, 6], voiceless: true, bloodless: true, alert: ['SQUAWK!', 'NOOT NOOT!', 'HONK?!'], bubble: ['NOOT NOOT!'],
    deathWords: ['NOOT!', 'POOF!', 'SPLAT!'], hurtWords: ['SQUAWK!'], look: { limb: '#2a2438', head: '#ffffff', headR: 6, thick: 3, body: 'tiny', props: [] }, draw: drawPenguin,
  };

  // ----- FIRE: imp (fireballs), magma blob (hops, splits) -----
  Defs.imp = {
    name: 'IMP', hp: 2, w: 13, h: 26, speed: 70, runSpeed: 120, backSpeed: 90, ai: 'soldier', sight: 380, noAttacks: true, fireproof: true, panics: false, gold: [4, 7], windup: 0.45,
    range: [130, 320], alert: ['HEE HEE HEE!', 'BURN, BABY!', 'FLAME ON!'], deathWords: ['POOF!', 'SIZZLE!', 'OOF!'], hurtWords: ['YIKES!', 'HISS!'],
    look: { limb: '#e0301e', head: '#ff9a8a', headR: 6.6, thick: 3, body: 'stick', face: 'angry', tailColor: '#e0301e', props: ['horns', 'tail', 'pitchfork'] },
    attacks: [{
      id: 'fireball', range: [70, 360], windup: 0.45, bubble: ['HEE HEE!', 'HOT HOT HOT!'], sfx: 'flame',
      start(e) { e.swing = -1.7; }, tick(e, dt, p, k) { e.swing = -1.7 + k * 0.5; },
      fire(e, p) {
        e.swing = undefined;
        const mx = e.x + e.facing * 14, my = e.y - 18, a = Math.atan2(p.y - 14 - my, p.x - mx) + U.rand(-0.04, 0.04);
        shot({ owner: e, x: mx, y: my, vx: Math.cos(a) * 270, vy: Math.sin(a) * 270, grav: 0, r: 5, style: 'fire', dmg: 1, life: 2.2, color: '#ff8a1a', trailFx: 'fire', tileDmg: 0.5 });
        word('FWOOSH', mx, my - 12, { size: 14, color: '#ff8c1a', life: 0.4 }); sfx('flame', { x: mx, vol: 0.4 });
      },
    }],
  };
  function drawMagma(ctx, e) {
    const sq = e.squash ? 1 : 0, air = !e.onGround, k = e.mini ? 0.62 : 1, w = e.t * 6;
    const sx = (sq ? 1.3 : air ? 0.82 : 1 + Math.sin(w) * 0.04) * k, sy = (sq ? 0.7 : air ? 1.25 : 1 - Math.sin(w) * 0.04) * k;
    ctx.save(); ctx.translate(e.x, e.y); ctx.scale(sx * e.facing, sy); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.bezierCurveTo(-14, -12, -7, -22, 0, -22); ctx.bezierCurveTo(8, -22, 14, -12, 11, 0); ctx.bezierCurveTo(6, 2, -6, 2, -11, 0); ctx.closePath();
    ink(ctx, fc(e, '#ff5a12'), 2.4 / Math.max(0.6, k));
    ctx.beginPath(); ctx.ellipse(1, -9, 7, 6, 0, 0, U.TAU); ctx.fillStyle = fc(e, '#ffb81c'); ctx.fill();
    ctx.fillStyle = fc(e, '#c41f06'); ctx.beginPath(); ctx.arc(-6, -5, 2, 0, U.TAU); ctx.arc(7, -4, 1.6, 0, U.TAU); ctx.fill();
    // angry face
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(2.4, -12, 2.4, 0, U.TAU); ctx.arc(8, -12, 2.4, 0, U.TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(3.2, -11.6, 1.1, 0, U.TAU); ctx.arc(8.8, -11.6, 1.1, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0.4, -15.4); ctx.lineTo(4.4, -14); ctx.moveTo(10.4, -15.4); ctx.lineTo(6.6, -14); ctx.moveTo(3, -6.6); ctx.lineTo(9, -7); ctx.stroke();
    ctx.restore();
  }
  Defs.magma = {
    name: 'MAGMA BLOB', hp: 2, hitH: 26, w: 22, h: 19, ai: 'hopper', sight: 340, fireproof: true, panics: false, bloodless: true, gold: [5, 9], voiceless: true,
    hop: 330, hopVx: 130, bigHop: 560, bigVx: 175, bigEvery: 3, windup: 0.45, slam: 'SPLOOSH!', slamR: 50, touchDmg: 1, hopSfx: 'bounce',
    alert: ['BLORP!', 'GLORP?!', 'SPLORT!'], bubble: ['BLORP!'], deathWords: ['SPLORCH!', 'SIZZLE!', 'POOF!'], hurtWords: ['BLORP', 'GLOOP'],
    look: { limb: '#ff5a12', head: '#ffb81c', headR: 6, thick: 3, body: 'tiny', props: [] }, draw: drawMagma,
    init(e, opts) { if (opts && opts.mini) { e.mini = true; e.hp = e.maxHp = 1; e.w = 13; e.h = 12; } },
    update(e, dt) { if (S.FX && Math.random() < 0.07) S.FX.fire(e.x + U.rand(-5, 5), e.y - 14, 1); },
    onDeath(e) {
      if (e.mini || !S.Game) return;
      for (const s of [-1, 1]) { const m = S.Game.spawnEnemy('magma', e.x + s * 9, e.y - 6, { mini: true, facing: s }); if (m) { m.vy = -340; m.vx = s * 140; m.alerted = true; m.state = 'attack'; m.hopT = 0.6; } }
      word('SPLIT!', e.x, e.y - 30, { size: 16, color: '#ffe14d', life: 0.5 });
    },
  };

  // ----- WIND: kite goon (drifts on the gusts), fan turret (blows you back) -----
  function kiteAI(e, dt) {
    const p = player(), g = S.Game && S.Game.wind;
    e.anim += dt;
    e.facing = p ? (p.x >= e.x ? 1 : -1) : e.facing;
    const busy = e.tickAttack(dt, p) || e.tickBurst(dt);
    if (g && g.ax) e.vx += g.ax * 0.55 * dt;
    e.pose = busy ? 'jump' : 'climb';
    if (e.state === 'patrol') {
      e.hx = e.hx == null ? e.x : e.hx; e.hy = e.hy == null ? e.y : e.hy;
      steer(e, e.hx + Math.sin(e.t * 0.6) * 70, e.hy + Math.sin(e.t * 1.3) * 14, 160, 55, dt);
      if (e.sees(p)) notice(e);
    } else if (e.state === 'alert') {
      e.alertT -= dt; e.vy = U.approach(e.vy, 0, 400 * dt); if (e.alertT <= 0) e.state = 'attack';
    } else if (p) {
      if (!busy) {
        const side = Math.sin(e.t * 0.35) > 0 ? 1 : -1;
        const swoop = (e.t % 5) > 3.6; // killability: lower hover + a regular swoop to chest height
        steer(e, p.x + side * 150, p.y - (swoop ? 12 : 62) + Math.sin(e.t * 1.2) * 8, 220, 95, dt);
        e.tryAttack(dt, p);
      } else e.vy = U.approach(e.vy, 0, 300 * dt);
      if (!e.sees(p)) { e.lostT += dt; if (e.lostT > 5) { e.state = 'patrol'; e.alerted = false; e.lostT = 0; e.hx = e.x; e.hy = e.y; } } else e.lostT = 0;
    }
  }
  function drawKite(ctx, e) {
    const x = e.x, y = e.y - e.h - 40, sw = Math.sin(e.t * 2.2) * 4;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(e.x + e.facing * 2, e.y - e.h + 4); ctx.lineTo(x + sw * 0.4, y + 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + sw * 0.3, y + 14); ctx.bezierCurveTo(x - 8 - sw, y + 26, x + 8 + sw, y + 32, x - 4 + sw, y + 42); ctx.stroke();
    for (const [dx, dy, c] of [[-5 - sw * 0.6, 26, '#ff4fa3'], [4 + sw * 0.6, 32, '#ffe14d'], [-3 + sw, 40, '#3bb4ff']]) { ctx.beginPath(); ctx.moveTo(x + dx - 3, y + dy - 1.5); ctx.lineTo(x + dx + 3, y + dy + 1.5); ctx.lineTo(x + dx - 3, y + dy + 4); ctx.closePath(); ink(ctx, c, 1.2); }
    ctx.translate(x + sw * 0.3, y); ctx.rotate(sw * 0.02);
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(13, -2); ctx.lineTo(0, 15); ctx.lineTo(-13, -2); ctx.closePath(); ink(ctx, fc(e, e.look.hat || '#e8173a'), 2);
    ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(0, 15); ctx.moveTo(-13, -2); ctx.lineTo(13, -2); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = fc(e, '#ffe14d'); ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(13, -2); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  Defs.kite = {
    name: 'KITE GOON', hp: 2, w: 16, h: 30, flies: true, ai: kiteAI, sight: 540, sightY: 420, allAround: true, panics: false, noAttacks: true, gold: [4, 8], gun: 'pistol', windup: 0.5, teleUp: 56,
    alert: ['WHEEE!', 'I\'M FLYING!', 'WIND\'S WITH ME!'], look: { limb: '#c9b83a', head: '#ffffff', headR: 7, thick: 3.1, body: 'stick', face: 'derp', hat: '#e8173a', props: ['propeller', 'goggles'] },
    attacks: [{ id: 'pop', range: [0, 440], windup: 0.5, cooldown: [1.5, 2.3], bubble: ['PEW!', 'POP!'], fire(e, p) { e.muzzle(); bulletAt(e, p.x, p.y - 14, { speed: 310, spread: 0.05 }); } }],
    hitTest(e, x, y, pad) { return e.boxHit(x, y, pad) || (Math.abs(x - e.x) < 12 + pad && y > e.y - e.h - 64 - pad && y < e.y - e.h - 22 + pad); },
    drawAfter: drawKite,
  };
  function drawFan(ctx, e) {
    const x = e.x, y = e.y - 17, spin = e.gustT > 0 ? e.t * 40 : e.windT > 0 ? e.t * (10 + (1 - e.windT / (e.windMax || 0.5)) * 40) : e.t * 2.5;
    ctx.save(); ctx.translate(x, y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-9, 17); ctx.lineTo(-4, 6); ctx.lineTo(4, 6); ctx.lineTo(9, 17); ctx.closePath(); ink(ctx, fc(e, '#7a8099'), 2);
    ctx.scale(e.facing, 1);
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 15, 0, 0, U.TAU); ink(ctx, fc(e, '#c9cede'), 2.2);
    ctx.save(); for (let i = 0; i < 3; i++) { ctx.rotate(spin * 0.3 + i * U.TAU / 3); ctx.save(); ctx.scale(1, 1); ctx.beginPath(); ctx.ellipse(0, -6.6, 2.6, 6.4, 0, 0, U.TAU); ink(ctx, fc(e, '#e8173a'), 1.4); ctx.restore(); } ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, 2.8, 0, U.TAU); ink(ctx, fc(e, '#ffd23f'), 1.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(8, -9); ctx.lineTo(8, 9); ctx.moveTo(5.6, -12); ctx.lineTo(5.6, 12); ctx.stroke();
    ctx.restore();
    if (e.gustT > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; for (let i = 0; i < 6; i++) { const ph = (e.t * 3 + i * 0.37) % 1, yy = y - 30 + i * 12, xx = x + e.gustDir * (14 + ph * 230); ctx.beginPath(); ctx.moveTo(xx - e.gustDir * 22, yy); ctx.quadraticCurveTo(xx - e.gustDir * 8, yy - 4, xx, yy); ctx.stroke(); } }
  }
  Defs.fanturret = {
    name: 'FAN TURRET', hp: 3, w: 22, h: 34, stationary: true, allAround: true, sight: 420, sightY: 220, ai: 'soldier', noAttacks: true, noKnock: true, bloodless: true, gibs: false, hitSfx: 'hit_metal', voiceless: true,
    gold: [7, 12], windup: 0.55, alert: ['FWOOOOSH?!', 'WIND UP!'], deathWords: ['CLANK!', 'KA-BLAM!', 'FZZZT!'], gun: 'none',
    look: { limb: '#c9cede', head: '#ffffff', headR: 6, thick: 3, body: 'stick', props: [] }, draw: drawFan,
    attacks: [{
      id: 'gust', range: [0, 430], windup: 0.55, cooldown: [3.0, 4.0], bubble: ['SPIN UP!'],
      fire(e, p) { e.gustT = 1.5; e.gustDir = e.facing; e.shots = 0; word('FWOOOOOOSH!', e.x + e.facing * 40, e.y - 36, { size: 26, color: '#ffffff', stroke: '#3b8bff', burst: true, burstColor: '#bfefff', life: 1.1 }); sfx('flame', { x: e.x, vol: 0.5, pitch: 0.6 }); },
    }],
    update(e, dt) {
      if (e.gustT > 0) {
        e.gustT -= dt;
        const p = player();
        if (p && Math.sign(p.x - e.x) === e.gustDir && Math.abs(p.x - e.x) < 300 && Math.abs((p.y - 14) - (e.y - 17)) < 75) p.windX = (p.windX || 0) + e.gustDir * (p.onGround ? 680 : 980);
        if (S.FX && Math.random() < 0.5) S.FX.add({ x: e.x + e.gustDir * 18, y: e.y - 17 + U.rand(-22, 22), vx: e.gustDir * U.rand(300, 460), vy: U.rand(-14, 14), life: 0.5, kind: 'smoke', size: 2, grow: 4, color: '#ffffff', drag: 0.5 });
        const sh = Math.floor((1.5 - e.gustT) / 0.5);
        if (p && e.shots < sh && e.shots < 3) { e.shots++; e.muzzleX = e.x + e.gustDir * 12; e.muzzleY = e.y - 17; bulletAt(e, p.x, p.y - 14, { speed: 300, spread: 0.1, word: 'FFT' }); }
      }
    },
  };

  // ----- WATER: scuba diver (speargun), piranha (darts) -----
  function waterSurface(e) { // y of the surface above the swimmer (cached)
    if (e._surfT > e.t) return e._surf;
    let y = e.y - e.h * 0.5, k = 0; while (inWater(e.x, y - 8) && k++ < 60) y -= 8;
    e._surf = y; e._surfT = e.t + 0.3; return y;
  }
  function swimClamp(e, dt) { // never leave the water
    if (!inWater(e.x + e.vx * dt, e.y - e.h * 0.5 + e.vy * dt)) { if (!inWater(e.x, e.y - e.h * 0.5 + e.vy * dt)) e.vy = Math.max(e.vy, 20); if (!inWater(e.x + e.vx * dt, e.y - e.h * 0.5)) e.vx *= -0.4; }
  }
  function scubaAI(e, dt) {
    const p = player(), d = e.def, sees = e.sees(p);
    e.anim += dt; const busy = e.tickAttack(dt, p);
    const surf = waterSurface(e);
    if (e.state === 'patrol') {
      e.hx = e.hx == null ? e.x : e.hx; e.hy = e.hy == null ? e.y : e.hy;
      steer(e, e.hx + Math.sin(e.t * 0.5) * 60, Math.max(surf + 16, e.hy + Math.sin(e.t * 0.9) * 12), 200, 45, dt);
      e.facing = e.vx >= 0 ? 1 : -1; e.pose = 'swim';
      if (sees) notice(e);
    } else if (e.state === 'alert') {
      e.alertT -= dt; e.vx = U.approach(e.vx, 0, 300 * dt); e.vy = U.approach(e.vy, 0, 300 * dt); if (e.alertT <= 0) e.state = 'attack'; e.pose = 'swim';
    } else if (p) {
      e.facing = p.x >= e.x ? 1 : -1;
      if (!busy) {
        const dx = p.x - e.x, want = Math.abs(dx) > 240 ? 1 : Math.abs(dx) < 130 ? -1 : 0;
        steer(e, e.x + e.facing * want * 60, Math.max(surf + 16, Math.min(p.y - 12, e.y + 60)), 220, 90, dt);
        e.pose = 'swim'; e.tryAttack(dt, p);
      } else { e.vx = U.approach(e.vx, 0, 400 * dt); e.vy = U.approach(e.vy, 0, 400 * dt); e.pose = 'fall'; }
      if (!sees) { e.lostT += dt; if (e.lostT > 5) { e.state = 'patrol'; e.alerted = false; e.lostT = 0; e.hx = e.x; e.hy = e.y; } } else e.lostT = 0;
    }
    swimClamp(e, dt);
    if (S.FX && Math.random() < 0.04) S.FX.smoke(e.x + e.facing * 6, e.y - e.h, 1, '#cfeaff');
  }
  Defs.scuba = {
    name: 'SCUBA GOON', hp: 2, w: 16, h: 28, flies: true, ai: scubaAI, sight: 460, sightY: 300, allAround: true, panics: false, noAttacks: true, gold: [4, 8], gun: 'harpoon', windup: 0.5,
    alert: ['BLUB BLUB!', 'SPEARGUN, GO!', 'GLUB?!'], hurtWords: ['BLUB!', 'GLUB!'], deathWords: ['BLUUUB!', 'POOF!', 'SPLAT!'],
    look: { limb: '#2f8fa8', head: '#ffffff', headR: 6.8, thick: 3.2, body: 'stick', face: 'angry', fin: '#2fd0ff', props: ['divemask', 'scubaGear'] },
    attacks: [{
      id: 'spear', range: [70, 380], windup: 0.5, cooldown: [1.7, 2.6], bubble: ['SPEARGUN, GO!', 'BLUB!'],
      fire(e, p) {
        e.muzzle(); const mx = e.muzzleX, my = e.muzzleY, a = Math.atan2(p.y - 14 - my, p.x - mx);
        shot({ owner: e, x: mx, y: my, vx: Math.cos(a) * 310, vy: Math.sin(a) * 310, r: 4, style: 'harpoon', dmg: 1, life: 1.8, tileDmg: 0.5 });
        sfx('pistol', { x: mx, vol: 0.4, pitch: 0.6 }); word('FWIP', mx, my - 8, { size: 12, color: '#ffffff', life: 0.35 }); e.recoil = 1;
        if (S.FX) S.FX.smoke(mx, my, 3, '#cfeaff');
      },
    }],
  };
  function drawPiranha(ctx, e) {
    const open = e.state === 'wind' || e.state === 'dart' ? 1 : 0.15, wag = Math.sin(e.t * (e.state === 'dart' ? 40 : 12)) * 0.25;
    ctx.save(); ctx.translate(e.x, e.y - e.h * 0.5); ctx.scale(e.facing, 1); ctx.lineJoin = 'round';
    ctx.save(); ctx.translate(-9, 0); ctx.rotate(wag); ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-8, -6); ctx.lineTo(-6, 0); ctx.lineTo(-8, 6); ctx.closePath(); ink(ctx, fc(e, '#c4331a'), 1.8); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(0, -10); ctx.lineTo(5, -4); ctx.closePath(); ink(ctx, fc(e, '#c4331a'), 1.5);
    ctx.beginPath(); ctx.ellipse(0, 0, 10, 6.4, 0, 0, U.TAU); ink(ctx, fc(e, '#e8573a'), 2);
    ctx.beginPath(); ctx.ellipse(-1, 2.6, 7, 2.6, 0, 0, U.TAU); ctx.fillStyle = fc(e, '#ffb27a'); ctx.fill();
    ctx.save(); ctx.translate(6, 2.4); ctx.rotate(open * 0.45); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(5.4, 0.4); ctx.lineTo(3, 3.4); ctx.lineTo(0, 3); ctx.closePath(); ink(ctx, fc(e, '#c4331a'), 1.5); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 1.8 + 0.4, 0); ctx.lineTo(i * 1.8 + 1.3, -2); ctx.lineTo(i * 1.8 + 2.2, 0); ctx.fill(); } ctx.restore();
    ctx.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(i * 1.8 + 4.6, 1.6 - open); ctx.lineTo(i * 1.8 + 5.5, 3.6 - open); ctx.lineTo(i * 1.8 + 6.4, 1.6 - open); ctx.fill(); }
    eye(ctx, 3.4, -2.2, 2.2, e);
    ctx.restore();
  }
  function piranhaAI(e, dt) {
    const p = player(), d = e.def, sees = e.sees(p), surf = waterSurface(e);
    e.anim += dt;
    switch (e.state) {
      case 'patrol':
        e.hx = e.hx == null ? e.x : e.hx; e.hy = e.hy == null ? e.y : e.hy;
        steer(e, e.hx + Math.sin(e.t * 0.8) * 55, Math.max(surf + 8, e.hy + Math.sin(e.t * 1.4) * 14), 220, 50, dt);
        if (Math.abs(e.vx) > 4) e.facing = e.vx > 0 ? 1 : -1;
        if (sees) notice(e);
        break;
      case 'alert':
        e.alertT -= dt; e.vx = U.approach(e.vx, 0, 300 * dt); e.vy = U.approach(e.vy, 0, 300 * dt); if (p) e.face(p, true); if (e.alertT <= 0) { e.state = 'attack'; e.cool = U.rand(0.3, 0.9); }
        break;
      case 'attack': {
        if (!p) { e.state = 'patrol'; break; }
        e.face(p);
        steer(e, p.x - e.facing * 70, Math.max(surf + 8, p.y - 14), 260, 85, dt);
        e.cool -= dt * diff().enemyRate;
        const dist = Math.hypot(p.x - e.x, (p.y - 14) - (e.y - 6));
        if (e.cool <= 0 && dist < 190 && inWater(p.x, p.y - 14)) { e.state = 'wind'; e.windMax = d.windup; e.windT = d.windup; say(e, 'GNASH!', 0.6); sfx('splash', { x: e.x, vol: 0.4 }); }
        if (!sees) { e.lostT += dt; if (e.lostT > 5) { e.state = 'patrol'; e.alerted = false; e.lostT = 0; e.hx = e.x; e.hy = e.y; } } else e.lostT = 0;
        break;
      }
      case 'wind':
        e.windT -= dt; e.vx = U.approach(e.vx, 0, 600 * dt); e.vy = U.approach(e.vy, 0, 600 * dt); if (p) e.face(p, true);
        if (e.windT <= 0) { e.windT = 0; e.state = 'dart'; e.dartT = 0.5; const a = p ? Math.atan2(p.y - 14 - (e.y - 6), p.x - e.x) : 0; e.vx = Math.cos(a) * 340; e.vy = Math.sin(a) * 340; e.facing = e.vx >= 0 ? 1 : -1; }
        break;
      case 'dart':
        e.dartT -= dt; touchPlayer(e, 1, 0.8);
        if (S.FX && Math.random() < 0.4) S.FX.smoke(e.x, e.y - 6, 1, '#cfeaff');
        if (e.dartT <= 0 || e.hitWall) { e.state = 'recover'; e.recT = 0.8; }
        break;
      case 'recover':
        e.recT -= dt; e.vx = U.approach(e.vx, 0, 500 * dt); e.vy = U.approach(e.vy, 0, 500 * dt);
        if (e.recT <= 0) { e.state = 'attack'; e.cool = U.rand(0.8, 1.6); }
        break;
    }
    swimClamp(e, dt);
  }
  Defs.piranha = {
    name: 'PIRANHA', hp: 1, w: 20, h: 13, flies: true, ai: piranhaAI, sight: 380, sightY: 260, allAround: true, panics: false, noAttacks: true, voiceless: true, bloodless: true, gold: [2, 4], windup: 0.45,
    alert: ['GNASH!', 'CHOMP!'], deathWords: ['BLUB!', 'POOF!', 'SPLAT!'], hurtWords: ['BLUB!'], look: { limb: '#e8573a', head: '#ffffff', headR: 5, thick: 3, body: 'tiny', props: [] }, draw: drawPiranha,
  };

  // ----- MUD: mud-man (lobs mud pies), gator (snap-lunge) -----
  Defs.mudman = {
    name: 'MUD-MAN', hp: 2, w: 17, h: 32, speed: 32, runSpeed: 50, ai: 'soldier', sight: 340, noAttacks: true, bloodless: true, gold: [5, 9], windup: 0.55, range: [100, 300], gun: 'blunder',
    alert: ['SLORP?!', 'MUD PIE TIME!', 'SQUELCH!'], deathWords: ['SPLORCH!', 'SQUELCH!', 'SPLAT!'], hurtWords: ['SLORP', 'BLORP'],
    look: { limb: '#7a5a2f', head: '#9a7a4a', headR: 7.4, thick: 3.8, body: 'fat', face: 'derp', props: ['bucketHat'], hat: '#6a4a22' },
    attacks: [{
      id: 'mudpie', range: [70, 320], windup: 0.55, bubble: ['MUD PIE!', 'SQUELCH!'],
      fire(e, p) { lob(e, p.x + (p.vx || 0) * 0.3, p.y - 12, { mx: e.x + e.facing * 12, my: e.y - 26, r: 5.5, style: 'mud', dmg: 1, splat: 'SPLORCH!', color: '#7a5a2f', speed: 290 }); sfx('throw', { x: e.x, vol: 0.4, pitch: 0.7 }); },
    }],
    onDeath(e) { if (S.FX) S.FX.debris(e.x, e.y - 16, 10, '#7a5a2f'); },
  };
  Defs.gator = {
    name: 'GATOR', hp: 2, w: 32, h: 12, speed: 28, chase: 62, rushSpeed: 290, rushDur: 0.42, rushRange: 125, windup: 0.5, recover: 0.9, cooldown: [0.6, 1.4], touchDmg: 1, ai: 'charger',
    sight: 380, gold: [5, 9], voiceless: true, bloodless: true, alert: ['SNAP!', 'CHOMP!', 'HISSSS!'], bubble: ['SNAP SNAP!'], deathWords: ['SNAPPED!', 'SPLAT!', 'POOF!'], hurtWords: ['HISS!'],
    look: { limb: '#4f9a3a', head: '#9ad06a', headR: 5, thick: 3, body: 'tiny', props: [] }, draw: drawGator,
  };

  // ----- JUNGLE: monkey (coconuts), snake (rear-up strike) -----
  Defs.monkey = {
    name: 'COCONUT MONKEY', hp: 2, w: 14, h: 26, stationary: true, pose: 'idle', ai: 'soldier', sight: 440, sightY: 260, noAttacks: true, gold: [4, 8], windup: 0.5, gun: 'none', allAround: true,
    alert: ['OOK OOK!', 'EEK!', 'BANANA?!'], hurtWords: ['EEK!', 'OOK!'], deathWords: ['OOK!', 'POOF!', 'SPLAT!'], voiceless: true,
    look: { limb: '#8a5a2a', head: '#e8c9a0', headR: 7, thick: 3.2, body: 'stick', face: 'derp', hat: '#e8173a', tailColor: '#8a5a2a', props: ['ears', 'tail', 'partyHat'] },
    attacks: [{
      id: 'coconut', range: [40, 440], windup: 0.5, cooldown: [1.7, 2.5], bubble: ['OOK OOK!', 'COCONUT!'],
      start(e) { e.armsOverride = 'wave'; },
      fire(e, p) {
        e.armsOverride = null;
        lob(e, p.x + (p.vx || 0) * 0.3, p.y - 12, { mx: e.x + e.facing * 6, my: e.y - 30, r: 4.8, style: 'coconut', dmg: 1, splat: 'BONK!', color: '#7a4a22', speed: 330, spin: 8 });
        sfx('throw', { x: e.x, vol: 0.4 });
      },
    }],
    update(e) { if (!e.atk && e.armsOverride) e.armsOverride = null; if (!e.atk) e.pose = Math.sin(e.t * 1.7) > 0.8 ? 'wave' : 'idle'; },
  };
  Defs.snake = {
    name: 'SNAKE', hp: 2, w: 28, h: 10, speed: 30, chase: 58, rushSpeed: 390, rushDur: 0.24, rushRange: 105, windup: 0.45, recover: 0.7, cooldown: [0.6, 1.3], touchDmg: 1, ai: 'charger',
    sight: 340, gold: [3, 6], voiceless: true, bloodless: true, alert: ['SSSSS!', 'HISSSS!'], bubble: ['SSSSSS!'], deathWords: ['SSSPLAT!', 'POOF!'], hurtWords: ['HISS!'],
    look: { limb: '#5fb040', head: '#9ad06a', headR: 5, thick: 3, body: 'tiny', props: [] }, draw: drawSnake,
  };

  // ----- MOUNTAIN: goat (rams, bonks into walls), rock thrower (boulders) -----
  Defs.goat = {
    name: 'GOAT', hp: 2, w: 26, h: 21, speed: 44, chase: 110, rushSpeed: 320, rushDur: 1.6, rushRange: 270, windup: 0.5, recover: 0.7, wallStun: 1.4, cooldown: [0.6, 1.4], touchDmg: 1, ai: 'charger',
    sight: 420, gold: [5, 9], voiceless: true, bloodless: true, windSfx: 'baa', alert: ['BAAAH!', 'MEH!', 'BLEAT!'], bubble: ['BAAAAH!'], deathWords: ['BAH!', 'POOF!', 'SPLAT!'], hurtWords: ['MEH!'],
    look: { limb: '#e8d8b0', head: '#f2e8d0', headR: 5, thick: 3, body: 'tiny', props: [] }, draw: drawGoat,
  };
  Defs.rockthrower = {
    name: 'ROCK THROWER', hp: 2, w: 19, h: 33, stationary: true, ai: 'soldier', sight: 450, sightY: 280, noAttacks: true, gold: [6, 10], windup: 0.6, gun: 'none', allAround: true,
    alert: ['ROCK AND ROLL!', 'HEAVY!', 'UGGA BUGGA!'], hurtWords: ['UGH', 'OOF!'], deathWords: ['THUD!', 'OOF!', 'KA-THUD!'],
    look: { limb: '#8a8ca0', head: '#e8c9a0', headR: 7.6, thick: 4, body: 'muscle', face: 'angry', beard: '#7a5a3a', hat: '#8a6a4a', props: ['beard', 'trapperHat'] },
    attacks: [{
      id: 'boulder', range: [60, 450], windup: 0.6, cooldown: [2.2, 3.1], bubble: ['ROCK AND ROLL!', 'HEAVY!'],
      start(e) { e.armsOverride = 'wave'; },
      fire(e, p) {
        e.armsOverride = null;
        lob(e, p.x + (p.vx || 0) * 0.35, p.y - 10, { mx: e.x, my: e.y - e.h - 10, r: 7.5, style: 'rock', dmg: 1.5, splat: 'THUD!', color: '#8a8ca0', speed: 270, spin: 6, tileDmg: 2 });
        sfx('throw', { x: e.x, vol: 0.5, pitch: 0.6 });
      },
    }],
    update(e) { if (!e.atk && e.armsOverride) e.armsOverride = null; },
    drawAfter(ctx, e) { // the rock over his head
      if (!(e.windT > 0)) return;
      ctx.save(); ctx.translate(e.x, e.y - e.h - 12 - (1 - e.windT / (e.windMax || 0.6)) * 3); ctx.beginPath();
      for (let i = 0; i < 7; i++) { const a = i / 7 * U.TAU, r = 7.5 * (0.82 + 0.2 * ((i * 37) % 3) / 2); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      ctx.closePath(); ink(ctx, '#8a8ca0', 2); ctx.fillStyle = '#b4b6c8'; ctx.fillRect(-4, -4, 4, 2.4); ctx.restore();
    },
  };

  // ----- PLAINS: cow (charges, stampedes, launches itself), crow (dive-bombs) -----
  Defs.cow = {
    name: 'ANGRY COW', hp: 2, w: 32, h: 22, speed: 24, chase: 72, rushSpeed: 335, rushDur: 1.6, rushRange: 290, windup: 0.55, recover: 0.8, wallStun: 1.0, cooldown: [0.5, 1.2], touchDmg: 1, ai: 'charger',
    leap: true, leapRange: 165, leapVy: 610, stomp: 'KA-MOO!', stompR: 54, stampede: true, sight: 440, gold: [5, 9], voiceless: true, bloodless: true, windSfx: 'moo',
    alert: ['MOOO!', 'MOO?!', 'MOOOOO!'], bubble: ['MOOOOO!'], deathWords: ['MOO-OOF!', 'SPLAT!', 'POOF!'], hurtWords: ['MOO!', 'MOOO!'],
    look: { limb: '#ffffff', head: '#ffffff', headR: 6, thick: 3, body: 'tiny', props: [] }, draw: drawCow,
  };
  function drawCrow(ctx, e) {
    const wing = e.state === 'dive' ? -0.3 : Math.sin(e.t * (e.state === 'wind' ? 30 : 14)) * 0.9, wide = e.state === 'wind';
    ctx.save(); ctx.translate(e.x, e.y - e.h * 0.5); ctx.scale(e.facing, 1); ctx.lineJoin = 'round';
    if (e.state === 'dive') ctx.rotate(Math.atan2(e.vy, Math.abs(e.vx) + 1) * 0.8);
    ctx.save(); ctx.rotate(-wing * 0.9 - 0.4); ctx.beginPath(); ctx.moveTo(-2, -2); ctx.lineTo(-12, -(wide ? 15 : 10)); ctx.lineTo(-4, -9); ctx.lineTo(2, -3); ctx.closePath(); ink(ctx, fc(e, '#3a3548'), 1.6); ctx.restore();
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-14, 2); ctx.lineTo(-13, -3); ctx.closePath(); ink(ctx, fc(e, '#2a2438'), 1.4);
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, U.TAU); ink(ctx, fc(e, '#2a2438'), 2);
    ctx.beginPath(); ctx.arc(6, -2.4, 3.6, 0, U.TAU); ink(ctx, fc(e, '#2a2438'), 1.8);
    ctx.beginPath(); ctx.moveTo(9, -3); ctx.lineTo(15, -1.4 + (wide ? -1 : 0)); ctx.lineTo(9, -0.4); ctx.closePath(); ink(ctx, fc(e, '#ffb81c'), 1.3);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(7, -3.6, 1.3, 0, U.TAU); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(7.4, -3.5, 0.6, 0, U.TAU); ctx.fill();
    ctx.save(); ctx.rotate(wing * 0.9 + 0.5); ctx.beginPath(); ctx.moveTo(-2, -1); ctx.lineTo(-10, -(wide ? 14 : 9)); ctx.lineTo(-1, -9); ctx.lineTo(3, -2); ctx.closePath(); ink(ctx, fc(e, '#4a4558'), 1.6); ctx.restore();
    ctx.restore();
  }
  function crowAI(e, dt) {
    const p = player(), d = e.def, sees = e.sees(p);
    e.anim += dt;
    switch (e.state) {
      case 'patrol':
        e.hx = e.hx == null ? e.x : e.hx; e.hy = e.hy == null ? e.y : e.hy;
        steer(e, e.hx + Math.cos(e.t * 0.9) * 70, e.hy + Math.sin(e.t * 1.8) * 14, 260, 70, dt); if (Math.abs(e.vx) > 4) e.facing = e.vx > 0 ? 1 : -1;
        if (sees) notice(e);
        break;
      case 'alert':
        e.alertT -= dt; e.vx = U.approach(e.vx, 0, 400 * dt); e.vy = U.approach(e.vy, 0, 400 * dt); if (p) e.face(p, true); if (e.alertT <= 0) { e.state = 'attack'; e.cool = U.rand(0.6, 1.4); }
        break;
      case 'attack': {
        if (!p) { e.state = 'patrol'; break; }
        e.face(p);
        steer(e, p.x + Math.sin(e.t * 0.9) * 150, p.y - 72 + Math.sin(e.t * 2.3) * 12, 340, 140, dt);
        e.cool -= dt * diff().enemyRate;
        if (e.cool <= 0 && sees && Math.abs(p.x - e.x) < 240 && e.y < p.y - 40) { e.state = 'wind'; e.windMax = d.windup; e.windT = d.windup; e.dx = p.x; e.dy = p.y - 14; say(e, U.pick(['CAW!', 'CAW CAW!']), 0.6); sfx('crow', { x: e.x, vol: 0.5 }); }
        if (!sees) { e.lostT += dt; if (e.lostT > 5) { e.state = 'patrol'; e.alerted = false; e.lostT = 0; e.hx = e.x; e.hy = e.y; } } else e.lostT = 0;
        break;
      }
      case 'wind':
        e.windT -= dt; e.vx = U.approach(e.vx, 0, 600 * dt); e.vy = U.approach(e.vy, -30, 600 * dt); if (p) { e.dx = p.x; e.dy = p.y - 14; e.face(p, true); }
        if (e.windT <= 0) { e.windT = 0; e.state = 'dive'; e.diveT = 0.8; const a = Math.atan2(e.dy - (e.y - 6), e.dx - e.x); e.vx = Math.cos(a) * 340; e.vy = Math.sin(a) * 340; }
        break;
      case 'dive':
        e.diveT -= dt; touchPlayer(e, 1, 0.8);
        if (e.diveT <= 0 || e.hitWall || e.bonkY || (S.Terrain && e.vy > 0 && solidAt(e.x, e.y + 6))) { e.state = 'rise'; e.riseT = 0.7; }
        break;
      case 'rise':
        e.riseT -= dt; e.vx = U.approach(e.vx, e.facing * 60, 500 * dt); e.vy = U.approach(e.vy, -150, 700 * dt);
        if (e.riseT <= 0) { e.state = 'attack'; e.cool = U.rand(0.7, 1.4); }
        break;
    }
  }
  Defs.crow = {
    name: 'CROW', hp: 1, w: 16, h: 12, flies: true, ai: crowAI, sight: 560, sightY: 440, allAround: true, panics: false, noAttacks: true, voiceless: true, bloodless: true, gold: [2, 4], windup: 0.45,
    alert: ['CAW!', 'CAW CAW!'], deathWords: ['CAW-OOF!', 'POOF!', 'SPLAT!'], hurtWords: ['CAW!'], look: { limb: '#2a2438', head: '#3a3548', headR: 5, thick: 3, body: 'tiny', props: [] }, draw: drawCrow,
  };

  // ----- FANTASY: skeleton knight (falls apart, reassembles ONCE), apprentice (missiles + blinks) -----
  function drawBones(ctx, e) {
    const k = U.clamp(e.pileT / 1.8, 0, 1), jig = e.pileT < 0.6 ? Math.sin(e.t * 50) * 1.4 : 0;
    // killability: a bigger pile + a rebuild ring, so it is obvious (and easy) to finish off before it stands up again
    ctx.save(); ctx.translate(e.x, e.y - 8); ctx.beginPath(); ctx.arc(0, 0, 14, -Math.PI / 2, -Math.PI / 2 + (1 - k) * U.TAU); ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    ctx.save(); ctx.translate(e.x + jig, e.y); ctx.scale(1.35, 1.35); ctx.lineCap = 'round';
    const bone = (x0, y0, x1, y1) => { ctx.strokeStyle = INK; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.strokeStyle = fc(e, '#f5f1de'); ctx.lineWidth = 2.6; ctx.stroke(); };
    bone(-10, -2, 4, -3); bone(-6, -5, 8, -2); bone(-3, -1.5, 11, -5); bone(-8, -3, -2, -6.5);
    ctx.beginPath(); ctx.arc(11, -5, 5.4, 0, U.TAU); ink(ctx, fc(e, '#f5f1de'), 1.8);
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(12.6, -6, 1.3, 0, U.TAU); ctx.arc(9, -6, 1.1, 0, U.TAU); ctx.fill(); ctx.fillRect(8.6, -2.8, 5, 1);
    ctx.restore();
  }
  Defs.skeleton = {
    name: 'SKELETON KNIGHT', hp: 1, w: 14, h: 30, hitH: 30, speed: 40, runSpeed: 78, ai: 'soldier', sight: 360, noAttacks: true, gold: [5, 9], windup: 0.5, range: [70, 280], bloodless: true, gun: 'none', voiceless: true,
    alert: ['RATTLE RATTLE!', 'CLACKETY!', 'BONE APPETIT!'], hurtWords: ['RATTLE', 'CLACK!'], deathWords: ['CLATTER!', 'BONED!', 'CRUNCH!'], hitSfx: 'hit_metal',
    look: { limb: '#f2efe0', head: '#f2efe0', headR: 7, thick: 3.2, body: 'stick', props: ['plumeHelm', 'sword', 'skullFace'], plume: '#6b3fd6', helmet: '#8a8fa6' },
    draw(ctx, e) { if (e.pile) drawBones(ctx, e); else if (S.Rig) S.Rig.draw(ctx, e.x, e.y, e.rigState()); },
    attacks: [
      { id: 'slash', range: [0, 52], windup: 0.45, bubble: ['EN GARDE!', 'CLACK!'],
        start(e) { e.swing = -0.9; }, tick(e, dt, p, k) { e.swing = -0.9 - k * 1.3; },
        fire(e, p) { e.swing = 1.0; e.swingT = 0.16; if (Math.abs(p.x - e.x) < 46 && Math.abs(p.y - e.y) < 40 && Math.sign(p.x - e.x) === e.facing) { hurtPlayer(e, 1, { knock: 240 }); word('SLASH!', e.x + e.facing * 22, e.y - 26, { size: 22, color: '#ffe14d', burst: true, burstColor: '#e8173a' }); sfx('punch', { x: e.x }); } else word('SWISH', e.x + e.facing * 22, e.y - 26, { size: 13, color: '#ffffff', life: 0.4 }); } },
      { id: 'bone', range: [70, 300], windup: 0.55, bubble: ['FETCH!', 'BONE TO PICK!'],
        start(e) { e.swing = -2.0; }, fire(e, p) { e.swing = undefined; lob(e, p.x + (p.vx || 0) * 0.3, p.y - 12, { mx: e.x + e.facing * 8, my: e.y - 30, r: 5, style: 'bone', dmg: 1, color: '#f5f1de', speed: 320, spin: 14 }); sfx('throw', { x: e.x, vol: 0.4 }); } },
    ],
    update(e, dt) {
      if (e.swingT > 0) { e.swingT -= dt; if (e.swingT <= 0 && !e.atk) e.swing = undefined; }
      else if (!e.atk && !e.pile && e.swing != null) e.swing = undefined;
      if (e.pile) {
        e.pileT -= dt; e.stun = 1; e.vx = 0; if (e.cancelAttack) e.cancelAttack();
        if (e.pileT <= 0) { e.pile = false; e.rebuilt = true; e.hp = e.maxHp; e.h = 30; e.w = 14; e.stun = 0; e.state = 'attack'; e.alerted = true; word('REASSEMBLED!', e.x, e.y - 40, { size: 18, color: '#ffffff', stroke: '#6b3fd6', burst: true, burstColor: '#ffe14d' }); say(e, 'BONE AGAIN!', 1.1); if (S.FX) { S.FX.spark(e.x, e.y - 14, 10, '#f5f1de'); S.FX.ring(e.x, e.y - 14, 22, '#ffffff'); } sfx('hit_metal', { x: e.x }); }
      }
    },
    beforeDie(e, info) {
      if (e.rebuilt || e.pile || info.noRevive || info.blast || info.kind === 'melee') return false; // killability: explosions + melee smash the bones for good, and it only ever reassembles ONCE
      e.pile = true; e.pileT = 1.8; e.hp = 0.5; e.h = 9; e.w = 26; // killability: ANY hit on the pile kills it for good (hurtbox is the 26 px minimum, not 9) e.cancelAttack(); e.vx = 0; e.stun = 1; e.swing = undefined;
      word('CLATTER!', e.x, e.y - 34, { size: 22, color: '#f5f1de', stroke: '#141018', burst: true, burstColor: '#6b3fd6' });
      if (S.FX) S.FX.debris(e.x, e.y - 16, 10, '#f5f1de'); sfx('hit_metal', { x: e.x });
      return true;
    },
  };
  Defs.apprentice = {
    name: 'APPRENTICE', hp: 2, w: 14, h: 30, speed: 36, runSpeed: 64, backSpeed: 70, ai: 'soldier', sight: 380, noAttacks: true, gold: [5, 9], windup: 0.55, range: [140, 320], gun: 'none',
    alert: ['OOPS!', 'I READ THE MANUAL!', 'ABRACADABRA!'], hurtWords: ['OW!', 'MY HAT!'], deathWords: ['POOF!', 'OOPS!', 'KA-ZAP!'],
    look: { limb: '#6a4ac0', head: '#ffffff', headR: 7, thick: 3.1, body: 'stick', face: 'derp', hat: '#8a5ad6', orb: '#c77dff', props: ['wizardHat', 'staff'] },
    attacks: [
      { id: 'missile', range: [90, 380], windup: 0.55, bubble: ['ABRACADABRA!', 'MAGIC MISSILE!'], sfx: 'powerup',
        start(e) { e.swing = -1.35; e.glow = 0; }, tick(e, dt, p, k) { e.glow = k; e.swing = -1.35 - k * 0.2; },
        fire(e, p) { e.glow = 0; e.swing = undefined; const mx = e.x + e.facing * 14, my = e.y - 40, a = Math.atan2(p.y - 14 - my, p.x - mx); shot({ owner: e, x: mx, y: my, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 5, style: 'magic', dmg: 1, life: 2.6, homing: 1.7, color: '#c77dff', trailFx: 'smoke' }); word('ZAP!', mx, my - 10, { size: 15, color: '#c77dff', stroke: '#ffffff', life: 0.4 }); sfx('laser', { x: mx, vol: 0.4 }); } },
      { id: 'blink', range: [0, 90], windup: 0.4, bubble: ['OOPS!', 'GOTTA BLINK!'],
        start(e) { e.glow = 0.5; },
        fire(e, p) {
          e.glow = 0; const T = S.Terrain, side = e.x >= p.x ? 1 : -1;
          for (const sx of [side, -side]) { const nx = p.x + sx * 170; if (S.Phys.free(nx, e.y, 14, 30) && T && T.solidPx(nx, e.y + 3) && T.los(nx, e.y - 20, p.x, p.y - 18)) { if (S.FX) { S.FX.confetti(e.x, e.y - 14, 8); S.FX.confetti(nx, e.y - 14, 8); } e.x = nx; word('POOF!', nx, e.y - 36, { size: 20, color: '#c77dff', stroke: '#ffffff', burst: true, burstColor: '#ffe14d' }); break; }
          }
          e.cool = 0.5;
        } },
    ],
  };

  // ----- MOON: little green alien (low-grav boing, ray gun), bouncer (pogo, slams) -----
  Defs.alien = {
    name: 'LITTLE GREEN GUY', hp: 2, w: 14, h: 26, grav: 0.35, bounce: 340, speed: 55, runSpeed: 80, backSpeed: 60, ai: 'soldier', sight: 400, noAttacks: true, gold: [4, 8], windup: 0.45, range: [140, 320], gun: 'raygun',
    alert: ['ZORP?!', 'BLEEP BLOOP!', 'TAKE ME TO YOUR LEADER!'], hurtWords: ['ZORP!', 'BLEEP!'], deathWords: ['ZZZORP!', 'POOF!', 'BLEEP!'],
    look: { limb: '#6fe06f', head: '#9af59a', headR: 9, thick: 3, body: 'tiny', face: 'derp', props: ['antenna'], antenna: '#9af59a', bulb: '#ff4fa3' },
    attacks: [{
      id: 'ray', range: [60, 340], windup: 0.45, cooldown: [1.5, 2.3], bubble: ['ZAP!', 'BLEEP BLOOP!'],
      fire(e, p) { e.muzzle(); const mx = e.muzzleX, my = e.muzzleY, a = Math.atan2(p.y - 14 - my, p.x - mx) + U.rand(-0.04, 0.04); shot({ owner: e, x: mx, y: my, vx: Math.cos(a) * 350, vy: Math.sin(a) * 350, r: 4, style: 'ray', dmg: 1, life: 1.9, color: '#7dff6b', tileDmg: 0.5 }); sfx('laser', { x: mx, vol: 0.4, pitch: 1.4 }); word('PZOW', mx, my - 10, { size: 12, color: '#7dff6b', life: 0.35 }); e.recoil = 1; e.muzzleFlash = 1; },
    }],
  };
  function drawBouncer(ctx, e) {
    const sq = e.squash ? 1 : 0, air = !e.onGround, t = e.t;
    const comp = sq ? 0.45 : air ? 1.15 : 0.9 + Math.abs(Math.sin(t * 3)) * 0.1;
    ctx.save(); ctx.translate(e.x, e.y); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const sh = 9 * comp; // spring height
    ctx.strokeStyle = INK; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(0, 0);
    for (let i = 1; i <= 6; i++) ctx.lineTo((i % 2 ? -5 : 5), -sh * i / 6);
    ctx.stroke(); ctx.strokeStyle = fc(e, '#ffd23f'); ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 2.4, 0, 0, U.TAU); ink(ctx, fc(e, '#7a8099'), 1.8);
    ctx.translate(0, -sh - 9 * (sq ? 0.8 : 1));
    ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, U.TAU); ink(ctx, fc(e, '#c9cede'), 2.2);
    ctx.beginPath(); ctx.arc(0, -1, 7.4, 0, U.TAU); ctx.fillStyle = fc(e, '#2a3a5a'); ctx.fill(); ctx.stroke();
    const ex = e.facing * 2.4; ctx.fillStyle = e.windT > 0 || sq ? '#ff3b3b' : '#3df2ff'; ctx.beginPath(); ctx.arc(ex - 3, -1.4, 1.9, 0, U.TAU); ctx.arc(ex + 3, -1.4, 1.9, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(2, -16); ctx.stroke(); ctx.beginPath(); ctx.arc(2, -17, 2.2, 0, U.TAU); ink(ctx, fc(e, '#ff4fa3'), 1.2);
    ctx.restore();
  }
  Defs.bouncer = {
    name: 'BOUNCER BOT', hp: 2, w: 20, h: 32, hitH: 40, ai: 'hopper', sight: 360, grav: 0.8, voiceless: true, bloodless: true, gold: [5, 9], hop: 360, hopVx: 130, bigHop: 600, bigVx: 170, bigEvery: 3, windup: 0.45,
    slam: 'BOING!', slamR: 58, slamDmg: 1, touchDmg: 1, hopSfx: 'bounce', alert: ['BOING!', 'SPROING!', 'BZZT!'], bubble: ['SPROING!'], deathWords: ['BZZT!', 'KA-BOING!', 'POOF!'], hurtWords: ['BZZT', 'BOING'], hitSfx: 'hit_metal',
    look: { limb: '#c9cede', head: '#c9cede', headR: 8, thick: 3, body: 'tiny', props: [] }, draw: drawBouncer,
    onDeath(e) { if (S.FX) { S.FX.debris(e.x, e.y - 18, 8, '#c9cede'); S.FX.spark(e.x, e.y - 18, 8, '#3df2ff'); } },
  };

  // ----- RETRO: 8-bit goon (pixel bolts), pixel ghost (phases through walls) -----
  Defs.bitgoon = {
    name: '8-BIT GOON', hp: 2, w: 14, h: 30, speed: 50, runSpeed: 95, ai: 'soldier', sight: 360, noAttacks: true, gold: [4, 8], windup: 0.5, range: [120, 300], gun: 'pistol', themed: true,
    alert: ['PRESS START!', 'INSERT COIN!', 'GAME ON!'], hurtWords: ['-1 HP', 'BEEP!'], deathWords: ['8-BIT POOF!', 'GAME OVER!', 'BLIP!'], hitSfx: 'pixel_blip', dieSfx: 'pixel_blip',
    look: { limb: '#ff6ae0', head: '#ffffff', headR: 7, thick: 3.4, body: 'stick', face: 'angry', hat: '#6aeaff', props: ['pixelCap'] },
    attacks: [{
      id: 'pixels', range: [60, 330], windup: 0.5, cooldown: [1.5, 2.3], bubble: ['PEW PEW!', 'PRESS FIRE!'],
      fire(e, p) { e.queueBurst(3, 0.14, (en) => { const pl = player(); if (!pl) return; en.muzzle(); const a = Math.atan2(pl.y - 14 - en.muzzleY, pl.x - en.muzzleX) + U.rand(-0.05, 0.05); shot({ owner: en, x: en.muzzleX, y: en.muzzleY, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, r: 3.2, style: 'pixel', dmg: 1, life: 1.7, color: en.look.limb || '#ff6ae0', tileDmg: 0.5 }); sfx('pixel_blip', { x: en.muzzleX, vol: 0.45 }); en.recoil = 1; en.muzzleFlash = 1; }); },
    }],
    onDeath(e) { if (S.FX) { S.FX.debris(e.x, e.y - 15, 10, e.look.limb || '#ff6ae0'); S.FX.debris(e.x, e.y - 15, 6, '#ffffff'); } },
  };
  function drawGhost(ctx, e) {
    const phased = e.phased, x = e.x, y = e.y, col = e.look.limb || '#ff3b3b', bob = Math.sin(e.t * 4) * 1.4;
    ctx.save(); ctx.translate(x, y - e.h * 0.5 + bob); ctx.globalAlpha = phased ? 0.32 : 1; ctx.lineJoin = 'round';
    const px = 2.4, w = 7, h = 9; // blocky pixel ghost: round head, wavy skirt
    ctx.beginPath(); ctx.moveTo(-w * px / 2.4, h * px / 2.6);
    ctx.lineTo(-w * px / 2.4, -2); ctx.quadraticCurveTo(-w * px / 2.4, -h * px / 2.2, 0, -h * px / 2.2); ctx.quadraticCurveTo(w * px / 2.4, -h * px / 2.2, w * px / 2.4, -2); ctx.lineTo(w * px / 2.4, h * px / 2.6);
    const nT = 4, sw = (w * px / 1.2) / nT; for (let i = 0; i < nT; i++) { const sx = w * px / 2.4 - i * sw; ctx.lineTo(sx - sw * 0.5, h * px / 2.6 - (((i + Math.floor(e.t * 6)) % 2) ? 4 : 0)); ctx.lineTo(sx - sw, h * px / 2.6); }
    ctx.closePath(); ink(ctx, fc(e, col), 2);
    const p = player(), lx = p ? U.clamp((p.x - x) / 40, -1, 1) : e.facing;
    for (const sx of [-4.2, 4.2]) { ctx.fillStyle = '#ffffff'; ctx.fillRect(sx - 2.8, -6, 5.6, 7.4); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(sx - 2.8, -6, 5.6, 7.4); ctx.fillStyle = '#2a4aff'; ctx.fillRect(sx - 1.4 + lx * 1.4, -3.4, 2.8, 3.6); }
    ctx.restore();
  }
  function ghostAI(e, dt) { // killability: the ghost floats at chest height (flat shots hit it)
    const p = player(), d = e.def;
    e.anim += dt; e.phased = solidAt(e.x, e.y - e.h * 0.5);
    const sees = p && Math.abs(p.x - e.x) < d.sight && Math.abs(p.y - e.y) < d.sightY;
    const busy = e.tickAttack(dt, p);
    if (e.state === 'patrol') {
      e.hx = e.hx == null ? e.x : e.hx; e.hy = e.hy == null ? e.y : e.hy;
      steer(e, e.hx + Math.sin(e.t * 0.5) * 60, e.hy + Math.sin(e.t * 1.1) * 18, 140, 40, dt); if (Math.abs(e.vx) > 4) e.facing = e.vx > 0 ? 1 : -1;
      if (sees) notice(e);
    } else if (e.state === 'alert') {
      e.alertT -= dt; e.vx = U.approach(e.vx, 0, 300 * dt); e.vy = U.approach(e.vy, 0, 300 * dt); if (e.alertT <= 0) e.state = 'attack';
    } else if (p) {
      e.facing = p.x >= e.x ? 1 : -1;
      if (!busy) { steer(e, p.x - e.facing * 40, p.y - 8, 150, d.chase || 62, dt); if (!e.phased) e.tryAttack(dt, p); } else { e.vx = U.approach(e.vx, 0, 300 * dt); e.vy = U.approach(e.vy, 0, 300 * dt); }
      if (!e.phased) touchPlayer(e, 1, 0.9);
      if (!sees) { e.lostT += dt; if (e.lostT > 6) { e.state = 'patrol'; e.alerted = false; e.lostT = 0; e.hx = e.x; e.hy = e.y; } } else e.lostT = 0;
    }
    if (e.phased && e.atk) e.cancelAttack();
  }
  Defs.pixelghost = {
    name: 'PIXEL GHOST', hp: 2, w: 16, h: 20, flies: true, ghost: true, xray: true, ai: ghostAI, sight: 480, sightY: 380, chase: 62, allAround: true, panics: false, noAttacks: true, voiceless: true, bloodless: true, gold: [5, 9], windup: 0.5,
    alert: ['BOO!', 'WAKA WAKA?', 'BLINKY!'], deathWords: ['BLIP!', '8-BIT POOF!', 'GAME OVER!'], hurtWords: ['BOO-HOO', 'BLIP'], hitSfx: 'pixel_blip', dieSfx: 'pixel_blip', noKnock: true,
    look: { limb: '#ff3b3b', head: '#ffffff', headR: 6, thick: 3, body: 'tiny', props: [] }, draw: drawGhost,
    init(e) { e.look = Object.assign({}, e.look, { limb: U.pick(['#ff3b3b', '#ff9ecf', '#3bd9ff', '#ffb347']) }); },
    // killability: no phase-immunity any more (it was a "why can't I hurt it" trap) - a ghost sunk in a wall is simply hard to REACH (bullets stop at the wall)
    attacks: [{
      id: 'bolt', range: [40, 320], windup: 0.5, cooldown: [1.8, 2.8], bubble: ['BOO!'],
      fire(e, p) { const mx = e.x + e.facing * 8, my = e.y - e.h * 0.5, a = Math.atan2(p.y - 14 - my, p.x - mx); shot({ owner: e, x: mx, y: my, vx: Math.cos(a) * 250, vy: Math.sin(a) * 250, r: 3.6, style: 'pixel', dmg: 1, life: 2, color: '#3df2ff', tileDmg: 0.5 }); sfx('pixel_blip', { x: mx, vol: 0.4 }); },
    }],
  };

  Enemies.ids = () => Object.keys(Defs).filter((k) => k.charAt(0) !== '_');
})();
