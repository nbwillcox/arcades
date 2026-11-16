// Stick Doosh - weapons.js (core): weapon defs + SGS.Shots projectiles (bullets, pellets, rockets, flames, lasers, grenades).
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';

  const W = S.Weapons = {
    pistol: { id: 'pistol', name: 'PISTOL', word: 'PEW', wordSize: 16, color: '#ffe14d', rate: 5, auto: false, dmg: 1, speed: 900, life: 0.55, count: 1, spread: 0.03, kind: 'bullet', tileDmg: 1, recoil: 0.35, shake: 0.03, sfx: 'pistol' },
    dual: { id: 'dual', name: 'DUAL PISTOLS', word: 'PEW', wordSize: 15, color: '#ffe14d', rate: 9, auto: false, dmg: 1, speed: 940, life: 0.55, count: 1, spread: 0.05, kind: 'bullet', tileDmg: 1, recoil: 0.3, shake: 0.03, sfx: 'pistol' },
    shotgun: { id: 'shotgun', name: 'DOOSH SHOTGUN', word: 'DOOSH', wordSize: 34, color: '#ff8c1a', burst: true, burstColor: '#fff36b', rate: 1.7, auto: false, dmg: 1, speed: 820, life: 0.3, count: 6, spread: 0.3, kind: 'pellet', tileDmg: 1, recoil: 1, shake: 0.32, knock: 260, push: 170, sfx: 'shotgun' },
    mg: { id: 'mg', name: 'MACHINE GUN', word: 'BRRBRBRRRBRR', wordSize: 19, color: '#ff4040', stream: true, rate: 14, auto: true, dmg: 0.5, speed: 1000, life: 0.5, count: 1, spread: 0.1, kind: 'bullet', tileDmg: 0.5, recoil: 0.25, shake: 0.04, sfx: 'mg' },
    rocket: { id: 'rocket', name: 'ROCKET LAUNCHER', word: 'SHHHHHHH', wordSize: 15, color: '#e9fbff', rate: 1.25, auto: false, dmg: 2, speed: 380, maxSpeed: 820, life: 2.2, count: 1, spread: 0, kind: 'rocket', tileDmg: 0, blast: 54, blastDmg: 5, recoil: 0.9, shake: 0.12, sfx: 'rocket' },
    flame: { id: 'flame', name: 'FLAMETHROWER', word: 'FWOOOOSH', wordSize: 19, color: '#ff8c1a', stream: true, rate: 28, auto: true, dmg: 0.22, speed: 400, life: 0.38, count: 1, spread: 0.14, kind: 'flame', tileDmg: 0.35, pierce: true, recoil: 0.1, shake: 0.01, sfx: 'flame' },
    laser: { id: 'laser', name: 'LASER', word: 'BZZZZT', wordSize: 20, color: '#3df2ff', rate: 3.2, auto: false, dmg: 2.2, range: 900, kind: 'laser', tileDmg: 2, pierce: true, recoil: 0.5, shake: 0.08, sfx: 'laser' },
    spread: { id: 'spread', name: 'SPREAD GUN', word: 'PEWPEWPEW', wordSize: 18, color: '#ffb81c', rate: 4, auto: false, dmg: 1, speed: 820, life: 0.55, count: 5, fan: 0.55, kind: 'bullet', tileDmg: 1, recoil: 0.45, shake: 0.06, sfx: 'spread' },
    grenade: { id: 'grenade', name: 'GRENADE', word: 'KA-BLAM', kind: 'grenade', speed: 330, up: -330, fuse: 1.2, blast: 62, blastDmg: 7, dmg: 0, sfx: 'throw' },
  };
  const LIST = ['pistol', 'dual', 'shotgun', 'mg', 'rocket', 'flame', 'laser', 'spread'];
  W.LIST = LIST;

  const shots = [];
  const Shots = S.Shots = { list: shots };

  const DIR_UP = { x: 0, y: -1 }, DIR_DOWN = { x: 0, y: 1 }, DIR_F = [{ x: -1, y: 0 }, { x: 1, y: 0 }];
  function dirOf(owner) {
    if (owner.aimDir && owner.aimAng != null) return owner.aimDir; // aim: 360-degree owners (the player) carry a unit aimDir
    const a = owner.aim || 'fwd', f = owner.facing || 1;
    return a === 'up' ? DIR_UP : a === 'down' ? DIR_DOWN : DIR_F[f < 0 ? 0 : 1];
  }
  // aim: lob velocity along the owner's aim (grenades / thrown specials). sx = horizontal speed, vyFwd = lob when aiming flat (negative = up),
  // vyUp = speed straight up/down. Returns a shared {vx,vy} (read it right away).
  const lobV = { vx: 0, vy: 0 };
  W.lob = (o, sx, vyFwd, vyUp) => {
    const d = dirOf(o), ay = Math.abs(d.y);
    lobV.vx = d.x * sx + (o.vx || 0) * 0.4;
    lobV.vy = d.y * (vyUp == null ? 640 : vyUp) + (1 - ay) * (vyFwd == null ? -340 : vyFwd);
    return lobV;
  };
  W.dirOf = dirOf;
  function sfx(n, o) { if (S.Audio && S.Audio.sfx) S.Audio.sfx(n, o); }

  W.rateOf = (id, lvl, owner) => {
    const d = W[id]; if (!d) return 4;
    let r = d.rate * (lvl >= 2 ? 1.2 : 1);
    if (owner) { r *= owner.rateMul || 1; if (owner.rapid) r *= 1.6; }
    return r;
  };

  // fire a weapon from an owner {x,y,facing,aim,team,muzzleX,muzzleY,dmgMul,crit,ricochet,...}
  W.fire = (owner, id, lvl) => {
    const d = W[id]; if (!d) return;
    lvl = lvl || 1;
    const enemy = owner.team !== 'player';
    const dir = dirOf(owner);
    const mx = owner.muzzleX != null ? owner.muzzleX : owner.x + (owner.facing || 1) * 14;
    const my = owner.muzzleY != null ? owner.muzzleY : owner.y - 18;
    const mega = lvl >= 2;
    const dmgMul = (owner.dmgMul || 1) * (mega ? 1.35 : 1);
    const spMul = enemy ? (owner.shotSpeed ? owner.shotSpeed / d.speed : 0.42) : 1;
    const base = Math.atan2(dir.y, dir.x);
    const crit = !enemy && owner.crit && Math.random() < owner.crit;
    const common = { team: owner.team, owner, ricochet: !enemy && owner.ricochet ? 1 : 0, crit, frost: !enemy && owner.frostRounds, burn: !enemy && owner.burnRounds, dragon: !enemy && owner.dragonShells && id === 'shotgun' };
    if (d.kind === 'laser') {
      laser(owner, mx, my, dir, d, dmgMul * (crit ? 2 : 1), mega, enemy);
    } else if (d.kind === 'grenade') {
      const lv = W.lob(owner, d.speed, d.up, 600); // aim: lob along the aim angle
      Shots.spawn('grenade', mx, my, lv.vx, lv.vy, owner.team, Object.assign({}, common, { blast: d.blast, blastDmg: d.blastDmg * dmgMul, fuse: d.fuse }));
    } else {
      let n = d.count || 1;
      if (mega && (id === 'shotgun' || id === 'spread')) n += id === 'shotgun' ? 3 : 2;
      for (let i = 0; i < n; i++) {
        let a = base;
        if (d.fan) a += n > 1 ? U.lerp(-d.fan / 2, d.fan / 2, i / (n - 1)) * (mega ? 1.2 : 1) : 0;
        if (d.spread) a += U.rand(-d.spread / 2, d.spread / 2) * (enemy ? 0.6 : 1) * (id === 'mg' && owner.spin != null ? 1.7 - 0.9 * owner.spin : 1);
        const sp = d.speed * spMul * (d.kind === 'pellet' ? U.rand(0.8, 1.12) : 1);
        let ox = 0, oy = 0;
        if (id === 'dual' && owner.dualAlt) { ox = -dir.x * 4 - dir.y * 3; oy = -dir.y * 4 + dir.x * 3; } // aim: second pistol sits behind + below the aim line
        const s = Shots.spawn(d.kind, mx + ox, my + oy, Math.cos(a) * sp, Math.sin(a) * sp, owner.team, Object.assign({}, common, {
          dmg: (enemy ? (owner.shotDmg || 1) : d.dmg * dmgMul) * (crit ? 2 : 1),
          life: d.life * (d.kind === 'pellet' ? U.rand(0.85, 1.15) : 1) * (enemy ? 1.9 : 1),
          tileDmg: d.tileDmg, blast: d.blast, blastDmg: (d.blastDmg || 0) * dmgMul, knock: d.knock || 0,
          homing: d.kind === 'rocket' && (mega || owner.homing), maxSpeed: d.maxSpeed ? d.maxSpeed * (enemy ? 0.55 : 1) : 0,
          pierce: d.pierce, fire: d.kind === 'flame', mega,
        }));
        if (d.kind === 'rocket') s.trail = [];
      }
      if (id === 'dual') owner.dualAlt = !owner.dualAlt;
    }
    // juice
    let ws = (d.wordSize || 18) * (enemy ? 0.72 : 1) * (mega ? 1.2 : 1);
    let sword = d.word;
    if (id === 'mg' && !enemy && owner.def && owner.def.spinUp) { const sp = owner.spin || 0; sword = sp < 0.25 ? 'brr' : sp < 0.5 ? 'BRRBR' : sp < 0.8 ? 'BRRBRBRR' : 'BRRBRBRRRBRR'; ws *= 0.7 + 0.45 * sp; }
    if (d.stream) {
      if (S.Comic) S.Comic.stream('gun' + (owner.uid || 0), sword, mx, my, { dir: dir.x || owner.facing || 1, size: ws, color: d.color, max: id === 'flame' ? 9 : 14, rate: id === 'flame' ? 14 : 24 });
    } else if (d.word && S.Comic && (!enemy || Math.random() < 0.5)) {
      let txt = d.word;
      if (id === 'dual' && Math.random() < 0.3) txt = 'PEW PEW';
      if (mega && id === 'shotgun') txt = 'MEGA DOOSH';
      S.Comic.word(txt, mx + dir.x * 10, my - 8 + dir.y * 10, { size: ws, color: d.color, burst: d.burst && !enemy, burstColor: d.burstColor, vy: -50, life: d.burst ? 0.55 : 0.42 });
    }
    if (crit && S.Comic) S.Comic.word('KAPOW!', mx, my - 26, { size: 24, color: '#ff4fa3', burst: true, burstColor: '#ffffff' });
    // vocal gun sounds: mg cycles 5 pitch variants (kid mouth-gun), flame uses a seamless loop, dual sometimes "pew pew"
    if ((id === 'flame' || id === 'mg') && S.Audio && S.Audio.loop) {
      // held-fire stream sounds: flame = fwoosh loop, machine gun = a guy saying 'brrrrrr' (mg_loop)
      S.Audio.loop(id + '_loop', 'gl' + id + (owner.uid || 0), { vol: enemy ? 0.35 : 0.7, x: mx, ttl: 0.14 });
    } else {
      let sn = d.sfx || id;
      if (id === 'mg') { owner._mgn = ((owner._mgn || 0) + 1) % 5; sn = owner._mgn ? 'mg' + (owner._mgn + 1) : 'mg'; }
      else if (id === 'dual' && Math.random() < 0.3) sn = 'dual';
      sfx(sn, { vol: enemy ? 0.45 : 0.8, x: mx });
    }
    if (!enemy) {
      if (d.shake && S.FX) S.FX.shake(d.shake);
      if (d.kind === 'bullet' || d.kind === 'pellet') S.FX && S.FX.shell(mx - dir.x * 9, my - dir.y * 9, dir.x < -0.05 ? -1 : dir.x > 0.05 ? 1 : (owner.facing || 1)); // aim: eject from the gun body
      if (S.Input && d.shake > 0.1) S.Input.vibrate(70, Math.min(1, d.shake * 2));
    }
    return d;
  };

  function laser(owner, mx, my, dir, d, dmg, mega, enemy) {
    const range = d.range * (enemy ? 0.7 : 1);
    const ex = mx + dir.x * range, ey = my + dir.y * range;
    const hit = S.Terrain ? S.Terrain.raycast(mx, my, ex, ey) : null;
    const x1 = hit ? hit.x : ex, y1 = hit ? hit.y : ey;
    if (hit && S.Terrain) { S.Terrain.damageTile(hit.tx, hit.ty, d.tileDmg * (mega ? 2 : 1)); S.FX && S.FX.spark(x1, y1, 6, '#3df2ff'); }
    // pierce everything along the beam
    const targets = S.Game ? S.Game.hostiles(owner.team) : [];
    const len = Math.hypot(x1 - mx, y1 - my);
    for (const e of targets) {
      // distance from segment to entity centre box
      const eh = e.hitHeight ? e.hitHeight() : e.h; // killability: enemies' hurtbox is never shorter than a chest-high beam
      const cx = e.x, cy = e.y - eh / 2;
      const t = U.clamp(((cx - mx) * dir.x + (cy - my) * dir.y), 0, len);
      const px = mx + dir.x * t, py = my + dir.y * t;
      if (Math.abs(px - cx) <= e.w / 2 + 3 && Math.abs(py - cy) <= eh / 2 + 3) {
        S.Game.damage(e, enemy ? (owner.shotDmg || 1) : dmg, { team: owner.team, owner, kind: 'laser', dirX: dir.x, x: px, y: py });
      }
    }
    shots.push({ kind: 'beam', x: mx, y: my, x1, y1, life: 0.12, max: 0.12, team: owner.team, w: mega ? 7 : 4.5, dead: false });
    if (S.Comic && !enemy) S.Comic.word('BZZZZT', (mx + x1) / 2, (my + y1) / 2 - 12, { size: 18 * (mega ? 1.2 : 1), color: '#3df2ff', angle: U.rand(-0.1, 0.1), life: 0.4 });
  }

  // generic spawn: kind = bullet|pellet|rocket|flame|grenade|orb|custom
  Shots.spawn = (kind, x, y, vx, vy, team, o) => {
    const s = Object.assign({ kind, x, y, vx, vy, team, dmg: 1, life: 1, tileDmg: 1, grav: 0, hit: null, bounces: 0, age: 0, dead: false, r: 3 }, o || {});
    if (kind === 'grenade') { s.grav = 1; s.life = s.fuse || 1.2; s.r = 4; }
    if (kind === 'flame') s.r = 5;
    if (kind === 'rocket') s.r = 4;
    if (s.pierce) s.hit = new Set();
    if (shots.length > 500) shots.shift();
    shots.push(s);
    return s;
  };
  Shots.add = (s) => { if (!s.hit && s.pierce) s.hit = new Set(); shots.push(s); return s; };
  Shots.clear = () => { shots.length = 0; };

  function explodeShot(s) {
    if (s.dead) return;
    s.dead = true;
    if (S.Game) S.Game.explode(s.x, s.y, s.blast || 50, s.blastDmg || 4, s.team, { owner: s.owner, superId: s.superId, player: s.team === 'player' });
  }

  function hitEntities(s, pad) {
    const targets = S.Game ? S.Game.hostiles(s.team) : [];
    for (const e of targets) {
      if (e.dead) continue;
      if (s.hit && s.hit.has(e)) continue;
      if (e.inHit ? !e.inHit(s.x, s.y, pad) : !U.pointIn(e, s.x, s.y, pad + (e.hitPad || 0))) continue;
      if (s.kind === 'rocket' || (s.kind === 'grenade' && s.impact)) { explodeShot(s); return true; }
      const ok = S.Game.damage(e, s.dmg, { team: s.team, owner: s.owner, kind: s.kind, dirX: U.sign(s.vx), x: s.x, y: s.y, knock: s.knock, fire: s.fire, frost: s.frost, burn: s.burn, superId: s.superId, crit: s.crit, shot: s });
      if (s.dragon && S.Game) S.Game.explode(s.x, s.y, 22, 1, s.team, { small: true, player: true, quiet: true });
      if (s.pierce) { s.hit.add(e); if (ok === false) { s.dead = true; return true; } continue; }
      if (ok === false && S.FX) { S.FX.spark(s.x, s.y, 4, '#ffffff'); if (S.Comic && Math.random() < 0.4) S.Comic.word('TINK', s.x, s.y - 8, { size: 13, color: '#ffffff' }); }
      s.dead = true;
      return true;
    }
    return false;
  }

  Shots.update = (dt) => {
    const T = S.Terrain;
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      if (s.dead) { shots.splice(i, 1); continue; }
      s.age += dt; s.life -= dt;
      if (s.kind === 'beam') { if (s.life <= 0) shots.splice(i, 1); continue; }
      if (s.custom && s.update) { s.update(s, dt); if (s.dead || s.life <= 0) shots.splice(i, 1); continue; }
      if (s.life <= 0) {
        if (s.kind === 'grenade' || s.kind === 'rocket') explodeShot(s);
        shots.splice(i, 1); continue;
      }
      // rockets accelerate / home
      if (s.kind === 'rocket') {
        const sp = Math.hypot(s.vx, s.vy);
        if (s.maxSpeed && sp < s.maxSpeed) { const k = Math.min(s.maxSpeed, sp + 900 * dt) / sp; s.vx *= k; s.vy *= k; }
        if (s.homing && S.Game) {
          const tg = S.Game.nearestEnemy(s.x, s.y, s.team, 420);
          if (tg) {
            const want = Math.atan2(tg.y - tg.h / 2 - s.y, tg.x - s.x), cur = Math.atan2(s.vy, s.vx);
            let da = want - cur; while (da > Math.PI) da -= U.TAU; while (da < -Math.PI) da += U.TAU;
            const na = cur + U.clamp(da, -4 * dt, 4 * dt), v = Math.hypot(s.vx, s.vy);
            s.vx = Math.cos(na) * v; s.vy = Math.sin(na) * v;
          }
        }
        s.trailD = (s.trailD || 0) + Math.hypot(s.vx, s.vy) * dt;
        if (s.trail && s.trailD > 13) { s.trailD = 0; s.trail.push({ x: s.x, y: s.y, t: s.age }); if (s.trail.length > 11) s.trail.splice(1, 1); }
        if (S.FX && Math.random() < 0.6) S.FX.add({ x: s.x - s.vx * 0.02, y: s.y - s.vy * 0.02, vx: U.rand(-20, 20), vy: U.rand(-20, 20), life: 0.45, kind: 'smoke', size: 3, grow: 9, color: '#efeaf5', drag: 2 });
      }
      if (s.kind === 'flame') { s.vx *= Math.max(0, 1 - 1.6 * dt); s.vy = s.vy * Math.max(0, 1 - 1.6 * dt) - 60 * dt; s.r = 5 + s.age * 22; }
      if (s.grav) s.vy += C.GRAV * s.grav * ((S.Game && S.Game.grav) || 1) * dt;
      if (s.drag) { s.vx *= 1 - s.drag * dt; s.vy *= 1 - s.drag * dt; }
      // substep movement
      const dist = Math.hypot(s.vx, s.vy) * dt;
      const n = Math.max(1, Math.ceil(dist / 7));
      const sx = s.vx * dt / n, sy = s.vy * dt / n;
      for (let k = 0; k < n && !s.dead; k++) {
        const nx = s.x + sx, ny = s.y + sy;
        if (T && T.W && !s.noTerrain && T.solidPx(nx, ny)) {
          const tx = Math.floor(nx / C.T), ty = Math.floor(ny / C.T);
          if (s.kind === 'grenade') {
            if (T.solidPx(nx, s.y)) s.vx *= -0.5; else { s.vy *= -0.42; s.vx *= 0.75; }
            if (Math.abs(s.vy) > 60) sfx('bounce', { vol: 0.3, x: s.x });
            break;
          }
          if (s.kind === 'rocket') { s.x = nx; s.y = ny; explodeShot(s); break; }
          if (s.tileDmg) T.damageTile(tx, ty, s.tileDmg, { fire: s.fire, team: s.team });
          if (s.kind === 'flame') { s.vx *= 0.2; s.vy *= 0.2; s.life = Math.min(s.life, 0.12); break; }
          if (s.ricochet > 0) {
            s.ricochet--;
            if (T.solidPx(nx, s.y)) s.vx = -s.vx; else s.vy = -s.vy;
            S.FX && S.FX.spark(s.x, s.y, 3, '#ffffff');
            break;
          }
          S.FX && S.FX.spark(nx, ny, s.kind === 'pellet' ? 2 : 3, s.team === 'player' ? '#ffe14d' : '#ff7a3a');
          s.dead = true; break;
        }
        s.x = nx; s.y = ny;
        if (hitEntities(s, s.kind === 'flame' ? s.r * 0.6 : s.r)) break;
      }
      if (s.kind === 'grenade' && s.age > 0.05 && Math.random() < 0.5 && S.FX) S.FX.add({ x: s.x, y: s.y - 4, vx: 0, vy: -30, life: 0.2, kind: 'spark', color: '#ffe14d', len: 3 });
      if (s.dead) shots.splice(i, 1);
    }
  };

  Shots.draw = (ctx, cam) => {
    const x0 = cam.x - 60, x1 = cam.x + cam.w + 60;
    ctx.lineCap = 'round';
    for (const s of shots) {
      if (s.kind !== 'beam' && (s.x < x0 || s.x > x1)) continue;
      if (s.custom && s.draw) { s.draw(ctx, s); continue; }
      const enemy = s.team !== 'player';
      switch (s.kind) {
        case 'bullet': case 'pellet': {
          if (enemy) {
            ctx.beginPath(); ctx.arc(s.x, s.y, 3.6, 0, U.TAU); ctx.fillStyle = '#ff5a2a'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
            ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(s.x - 1, s.y - 1, 1.3, 0, U.TAU); ctx.fill();
          } else {
            const v = Math.hypot(s.vx, s.vy) || 1, l = s.kind === 'pellet' ? 6 : 11;
            const tx = s.x - s.vx / v * l, ty = s.y - s.vy / v * l;
            ctx.strokeStyle = INK; ctx.lineWidth = s.kind === 'pellet' ? 5 : 5.2;
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
            ctx.strokeStyle = s.crit ? '#ff4fa3' : s.mega ? '#ffffff' : '#ffe14d'; ctx.lineWidth = s.kind === 'pellet' ? 2.6 : 2.6;
            ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(s.x, s.y); ctx.stroke();
          }
          break;
        }
        case 'rocket': {
          if (S.Comic && !enemy) S.Comic.drawTrail(ctx, s);
          const a = Math.atan2(s.vy, s.vx);
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
          ctx.fillStyle = '#ffb81c'; ctx.beginPath(); ctx.moveTo(-8, -2.5); ctx.lineTo(-14 - Math.random() * 6, 0); ctx.lineTo(-8, 2.5); ctx.fill();
          ctx.fillStyle = enemy ? '#c0392b' : '#dfe6ee'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(4, -3); ctx.lineTo(9, 0); ctx.lineTo(4, 3); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#e8173a'; ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-11, -6); ctx.lineTo(-5, -3); ctx.moveTo(-8, 3); ctx.lineTo(-11, 6); ctx.lineTo(-5, 3); ctx.fill();
          ctx.restore();
          break;
        }
        case 'flame': {
          const t = s.age / (s.age + s.life);
          ctx.fillStyle = t < 0.25 ? '#fff6b0' : t < 0.55 ? '#ffb81c' : t < 0.8 ? '#ff6a1a' : 'rgba(200,60,30,0.6)';
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r * 0.75, 0, U.TAU); ctx.fill();
          break;
        }
        case 'beam': {
          const a = s.life / s.max;
          ctx.globalAlpha = a;
          ctx.strokeStyle = INK; ctx.lineWidth = s.w + 3; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x1, s.y1); ctx.stroke();
          ctx.strokeStyle = s.team === 'player' ? '#3df2ff' : '#ff3b6b'; ctx.lineWidth = s.w; ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s.w * 0.35; ctx.stroke();
          ctx.globalAlpha = 1;
          break;
        }
        case 'grenade': {
          ctx.beginPath(); ctx.arc(s.x, s.y, 4.2, 0, U.TAU); ctx.fillStyle = s.color || '#4f7a2a'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = '#ffe14d'; ctx.fillRect(s.x - 1, s.y - 6, 2, 2);
          break;
        }
        case 'orb': default: {
          ctx.beginPath(); ctx.arc(s.x, s.y, s.r || 4, 0, U.TAU); ctx.fillStyle = s.color || '#ff5a2a'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
        }
      }
    }
  };
})();
