// Stick Doosh - dudes.js (cast agent): the 5 playable dudes (looks, guns, speed/jump quirks, blurbs) + their specials.
// Specials all go through Game.explode / Game.hurtArea so terrain carving, barrel chain reactions and score all work.
// owner (o) = the player entity: x,y(feet),facing,aim,vx,vy,onGround,dmgMul,blastMul,dude.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';
  function sfx(n, o) { if (S.Audio && S.Audio.sfx) S.Audio.sfx(n, o); }
  function word(t, x, y, o) { if (S.Comic) return S.Comic.word(t, x, y, o); }
  function G() { return S.Game; }

  S.Dudes = {
    order: ['sgt', 'pete', 'brenda', 'major', 'gramps'],
    sgt: {
      name: 'SGT. DOOSH', gun: 'shotgun', special: 'dooshnade', voice: 'sgt', speed: 1, jump: 1,
      blurb: 'Pompadour. Aviators. One shotgun. Zero chill.',
      quirk: 'Balanced. The shotgun knocks him back a bit (and everything else further).',
      look: { limb: '#ff3b3b', head: '#ffffff', headR: 7.2, thick: 3.6, body: 'stick', face: 'grin', band: '#3b8bff', props: ['pompadour', 'headbandDoosh', 'aviators'] },
    },
    pete: {
      name: 'PEW PEW PETE', gun: 'dual', special: 'pewstorm', voice: 'pete', speed: 1.1, jump: 1.07,
      blurb: 'Tiny man. Enormous hat. Two pistols. PEW PEW.',
      quirk: 'Fast and bouncy. Fits through everything (except hat jokes).',
      look: { limb: '#ffb81c', head: '#ffffff', headR: 7.6, thick: 3.1, body: 'tiny', face: 'grin', hat: '#b0672f', scarfColor: '#e8173a', props: ['cowboyHat', 'handlebar', 'scarf'] },
    },
    brenda: {
      name: 'BRENDA BRRRT', gun: 'mg', spinUp: true, special: 'groundpound', voice: 'brenda', speed: 0.95, jump: 0.97,
      blurb: 'Balloon biceps. Pink mohawk. BRRBRBRRRBRR.',
      quirk: 'Heavy hitter, heavy feet. Ground Pound stuns everything on the floor.',
      look: { limb: '#c77dff', head: '#ffffff', headR: 7, thick: 3.5, body: 'muscle', face: 'angry', hair: '#ff4fa3', props: ['mohawk', 'eyeblack'] },
    },
    major: {
      name: 'MAJOR SHHH', gun: 'rocket', special: 'airstrike', voice: 'major', speed: 0.98, jump: 1,
      blurb: 'Fishbowl helmet. Monocle inside it. Rockets go SHHHHH.',
      quirk: 'Posh and precise. His airstrike marks the target with a smoke flare first.',
      look: { limb: '#3bb4ff', head: '#ffffff', headR: 7, thick: 3.2, body: 'stick', face: 'grin', tie: '#e8173a', props: ['bowtie', 'mustache', 'monocle', 'fishbowl'] },
    },
    gramps: {
      name: 'GRANDPAPPY FWOOSH', gun: 'flame', special: 'dentures', voice: 'gramps', speed: 0.88, jump: 0.95,
      blurb: 'Beard to the knees. Nightcap. Flamethrower. Get off his lawn.',
      quirk: 'Slow, cranky and hunched. Burns everything. Slippers are fireproof.',
      look: { limb: '#9ea3b8', head: '#ffffff', headR: 7, thick: 3, body: 'hunch', face: 'old', beard: '#f2f2f2', cap: '#5aa0ff', slipper: '#ff9ecf', props: ['beard', 'nightcap', 'slippers'] },
    },
  };

  // taunts per special / event (the voice agent may also add these as TTS lines: speaker = dude id)
  const BARKS = S.Dudes.barks = {
    sgt: { special: ['DOOSHNADE, BABY!', 'FIRE IN THE DOOSH!', 'SAY HELLO TO MY LITTLE FRIEND!'] },
    pete: { special: ['PEW PEW PEW PEW!', 'FULL OF PEW!', 'THIS HAT HAS A FAN CLUB!'] },
    brenda: { special: ['GROUND POUND, BABY!', 'FEEL THE BURN!', 'LEG DAY!'] },
    major: { special: ['TALLY HO, CHAPS!', 'SHHH... INCOMING.', 'RAIN CHECK, OLD BEAN!'] },
    gramps: { special: ['GO GET EM, CHOMPERS!', 'FETCH, MY TEETH!', 'BITE HIS ANKLES!'] },
  };

  // dude taunt: voice line (mp3 + bubble) when the Voice module exists, else a plain comic bubble. Respects Commentary Off.
  function say(o, text) {
    const st = S.Save && S.Save.settings && S.Save.settings.audio;
    if (st && st.chatter === 'off') return;
    if (S.Voice && S.Voice.line) { try { S.Voice.line(o.dude || 'sgt', text, { follow: o }); return; } catch (e) { /* fall back */ } }
    if (S.Comic) S.Comic.bubble(text, o.x, o.y - 40, { follow: o, life: 1.5, speaker: o.dude || 'sgt' });
  }
  S.Dudes.say = say;
  function bark(o, k) { const b = BARKS[o.dude] || BARKS.sgt; say(o, U.pick(b[k || 'special'])); }

  // tiny scheduler: fx entity that ticks with the game (pauses with hit-stop / pause)
  function later(sec, fn) {
    const g = G(); if (!g || !g.spawn) return;
    g.spawn({ kind: 'fx', team: 'neutral', always: true, x: 0, y: 0, w: 1, h: 1, t: 0, dead: false, update(dt) { this.t += dt; if (this.t >= sec) { this.dead = true; try { fn(); } catch (err) { console.error('[later]', err); } } }, draw() {} });
  }
  // fx entity that runs fn(dt) each frame until it returns true (or the owner dies)
  function watch(o, fn) {
    const g = G(); if (!g || !g.spawn) return;
    g.spawn({ kind: 'fx', team: 'neutral', always: true, x: 0, y: 0, w: 1, h: 1, t: 0, dead: false, update(dt) { this.t += dt; if (o.dead || this.t > 3 || fn(dt, this.t)) this.dead = true; }, draw() {} });
  }

  // ---------------- specials ----------------
  const Sp = S.Specials = {};

  // ----- DOOSHNADE: bouncing fat grenade, fuse 1 s, KRAKOOM + a cluster of little DOOSHes around it -----
  Sp.dooshnade = {
    name: 'DOOSHNADE', icon: 'G',
    use(o) {
      const lv = S.Weapons.lob(o, 350, -340, 640); // aim: lobbed along the aim angle
      const sh = S.Shots.add({
        custom: true, kind: 'grenade', team: 'player', owner: o, x: o.muzzleX || o.x + o.facing * 8, y: (o.muzzleY || o.y - 20) - 2,
        vx: lv.vx, vy: lv.vy, life: 1.0, r: 5, age: 0, dead: false, bounces: 0,
        update(s, dt) {
          const T = S.Terrain, g = G();
          s.vy += C.GRAV * ((g && g.grav) || 1) * dt;
          const dist = Math.hypot(s.vx, s.vy) * dt, n = Math.max(1, Math.ceil(dist / 6));
          for (let k = 0; k < n && !s.dead; k++) {
            const nx = s.x + s.vx * dt / n, ny = s.y + s.vy * dt / n;
            if (T && T.W && T.solidPx(nx, ny)) {
              if (T.solidPx(nx, s.y)) s.vx *= -0.5; else { s.vy *= -0.42; s.vx *= 0.75; }
              if (Math.abs(s.vy) > 60) sfx('bounce', { vol: 0.35, x: s.x });
              break;
            }
            s.x = nx; s.y = ny;
            for (const e of g.hostiles('player')) { if (!e.dead && (e.kind === 'enemy' || e.kind === 'boss') && U.pointIn(e, s.x, s.y, 5)) { s.life = 0; break; } }
          }
          if (S.FX && Math.random() < 0.5) S.FX.add({ x: s.x, y: s.y - 6, vx: U.rand(-20, 20), vy: -40, life: 0.25, kind: 'spark', color: s.life < 0.35 && Math.floor(s.life * 14) % 2 ? '#ffffff' : '#ffe14d', len: 3 });
          if (s.life <= 0 && !s.dead) { s.dead = true; Sp.dooshnade.boom(s.x, s.y, o); }
        },
        draw(ctx, s) {
          const k = s.life < 0.35 && Math.floor(s.life * 16) % 2;
          ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.age * 9);
          ctx.beginPath(); ctx.arc(0, 0, 5.4, 0, U.TAU); ctx.fillStyle = k ? '#ffffff' : '#ff3b3b'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
          ctx.fillStyle = '#ffe14d'; ctx.font = 'italic 8px Bangers, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('D', 0, 0.5);
          ctx.fillRect(-1.2, -8.4, 2.4, 3); ctx.strokeRect(-1.2, -8.4, 2.4, 3);
          ctx.restore();
        },
      });
      word('DOOSHNADE!', o.x, o.y - 50, { size: 22, color: '#ff3b3b', burst: true, burstColor: '#ffe14d' });
      sfx('throw', { x: o.x });
      bark(o);
      return !!sh;
    },
    boom(x, y, o) {
      const g = G(), bm = o.blastMul || 1, dm = o.dmgMul || 1;
      g.explode(x, y, 92 * bm, 11 * dm, 'player', { owner: o, player: true });
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * (0.1 + i * 0.16), d = 36 + i * 9, px = x + Math.cos(a) * d * (i % 2 ? 1 : -1) * 1.4, py = y + Math.sin(a) * d * 0.7;
        later(0.07 + i * 0.07, () => {
          g.explode(px, py, 38 * bm, 3.5 * dm, 'player', { owner: o, player: true, quiet: true });
          word(U.pick(['DOOSH!', 'DOOSH', 'DOOSH!!']), px, py - 18, { size: 17, color: '#ff8c1a', stroke: '#141018', burst: true, burstColor: '#fff36b', life: 0.5 });
          sfx('explode', { x: px, vol: 0.4, pitch: 1.2 });
        });
      }
    },
  };

  // ----- PEW STORM: 3 volleys of an 8-way star, each rotated half a step, PEWs everywhere -----
  Sp.pewstorm = {
    name: 'PEW STORM', icon: 'P',
    use(o) {
      const fire = (rot) => {
        const cx = o.x, cy = o.y - 18;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * U.TAU + rot;
          S.Shots.spawn('bullet', cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, Math.cos(a) * 720, Math.sin(a) * 720, 'player', { dmg: 1.5 * (o.dmgMul || 1), life: 0.62, tileDmg: 1, owner: o });
        }
        for (let i = 0; i < 3; i++) word(U.pick(['PEW', 'PEW!', 'PEW PEW']), cx + U.rand(-46, 46), cy + U.rand(-38, 18), { size: U.rand(13, 19), color: '#ffe14d', life: 0.45 });
        sfx('spread', { x: cx, vol: 0.7 }); sfx('pistol', { x: cx, pitch: 1.35, vol: 0.6 });
        if (S.FX) { S.FX.shake(0.16); S.FX.ring(cx, cy, 30, '#ffe14d'); }
      };
      fire(0);
      later(0.12, () => { if (!o.dead) fire(Math.PI / 8); });
      later(0.24, () => { if (!o.dead) fire(Math.PI / 16); });
      word('PEW STORM!', o.x, o.y - 52, { size: 28, color: '#ffb81c', burst: true, burstColor: '#141018' });
      bark(o);
      return true;
    },
  };

  // ----- GROUND POUND: hop, SLAM, THOOM. Stuns the floor, shockwave rolls out both ways -----
  Sp.groundpound = {
    name: 'GROUND POUND', icon: 'T',
    use(o) {
      if (o.onGround) { o.vy = -420; o.onGround = false; o.vx *= 0.3; } else { o.vy = Math.max(o.vy, 300); }
      word('HNNNG!', o.x, o.y - 46, { size: 17, color: '#ffffff' });
      bark(o);
      o.slamming = true;
      watch(o, (dt, t) => {
        if (!o.onGround && o.vy >= 0) o.vy = Math.min(1100, Math.max(o.vy, 520) + 1800 * dt);
        if (o.onGround && t > 0.08) { Sp.groundpound.boom(o); return true; }
        return false;
      });
      return true;
    },
    boom(o) {
      const g = G(), bm = o.blastMul || 1, dm = o.dmgMul || 1, bx = o.x, by = o.y;
      o.slamming = false;
      g.explode(bx, by - 6, 54 * bm, 5 * dm, 'player', { owner: o, player: true, quiet: true });
      word('THOOM!', bx, by - 34, { size: 38, color: '#c77dff', stroke: '#141018', burst: true, burstColor: '#ffe14d', life: 0.9 });
      sfx('explode_big', { x: bx, pitch: 0.8 });
      if (S.FX) { S.FX.ring(bx, by - 4, 110, '#ffffff'); S.FX.ring(bx, by - 4, 70, '#c77dff'); S.FX.dust(bx - 30, by, 8); S.FX.dust(bx + 30, by, 8); S.FX.shake(0.6); S.FX.hitstop(0.07); }
      if (S.Input) S.Input.vibrate(180, 0.9);
      for (const e of g.hostiles('player')) { if (!e.dead && e.kind === 'enemy' && Math.abs(e.x - bx) < 170 && Math.abs(e.y - by) < 60) e.stun = Math.max(e.stun || 0, 1.1); }
      const T = S.Terrain;
      for (let i = 1; i <= 6; i++) {
        later(i * 0.05, () => {
          for (const sd of [-1, 1]) {
            const x = bx + sd * i * 32;
            g.hurtArea(x, by - 8, 30, 2.5 * dm, 'player', { owner: o, kind: 'blast', knock: 220 });
            if (T && T.W) T.damageTile(Math.floor(x / C.T), Math.floor((by + 2) / C.T), 2, { blast: true });
            if (S.FX) { S.FX.dust(x, by, 2); if (i % 2 === 0) S.FX.ring(x, by - 2, 16, '#c77dff'); }
          }
          if (i === 3) word('RUMBLE', bx + U.rand(-60, 60), by - 10, { size: 15, color: '#ffffff', life: 0.5 });
        });
      }
    },
  };

  // ----- AIRSTRIKE: smoke flare at the target, then 3 missiles come screaming down (SHHHHH trails) -----
  Sp.airstrike = {
    name: 'AIRSTRIKE', icon: 'A',
    use(o) {
      const g = G(), T = S.Terrain, cam = g.cam, dir = o.facing || 1, dm = o.dmgMul || 1, bm = o.blastMul || 1;
      let tx = o.x + dir * 150;
      const tg = g.nearestEnemy(o.x + dir * 160, o.y - 20, 'player', 420);
      if (tg && Math.sign(tg.x - o.x) === dir) tx = tg.x;
      let ty = o.y; // flare lands on the floor in that column
      if (T && T.W) { const gb = T.groundBelow(tx, o.y - 120, 600); if (gb != null) ty = gb; }
      // flare
      word('FLARE!', tx, ty - 22, { size: 16, color: '#ff5a5a', life: 0.7 });
      if (S.FX) { for (let i = 0; i < 3; i++) S.FX.smoke(tx + U.rand(-6, 6), ty - 6, 2, '#ff6b6b'); S.FX.ring(tx, ty - 4, 26, '#ff5a5a'); }
      word('AIRSTRIKE!', o.x, o.y - 52, { size: 25, color: '#3bb4ff', burst: true, burstColor: '#ffffff' });
      bark(o);
      sfx('rocket', { x: o.x, pitch: 0.8 });
      for (let i = 0; i < 3; i++) {
        later(0.45 + i * 0.22, () => {
          const x = tx + (i - 1) * 62 + U.rand(-10, 10);
          let y = Math.min(ty - 40, o.y - 60);
          if (T && T.W) { let k = 0; while (y > cam.y - 40 && !T.solidPx(x, y - 16) && k++ < 80) y -= 20; }
          y = Math.max(y, cam.y - 40);
          const sh = S.Shots.spawn('rocket', x, y, U.rand(-30, 30), 620, 'player', { dmg: 3, life: 3, blast: 64 * bm, blastDmg: 7 * dm, owner: o, maxSpeed: 920, tileDmg: 0 });
          sh.trail = [];
          if (S.Comic) S.Comic.word('SHHHHH', x, y + 24, { size: 14, color: '#e9fbff', life: 0.35, vy: 60 });
          sfx('rocket', { x, vol: 0.5, pitch: 1.2 });
        });
      }
      return true;
    },
  };

  // ----- DENTURE GRENADE: lobbed teeth that chatter, hop after the nearest baddie, then go off -----
  Sp.dentures = {
    name: 'DENTURE GRENADE', icon: 'D',
    use(o) {
      const up = o.aim === 'up';
      G().spawn(teeth(o, up));
      word('CHOMP!', o.x + o.facing * 14, o.y - 40, { size: 20, color: '#ff8fb0', stroke: '#ffffff', burst: true, burstColor: '#141018' });
      sfx('throw', { x: o.x });
      bark(o);
      return true;
    },
  };

  function teeth(o, up) {
    const lv = S.Weapons.lob(o, 230, -300, 520); // aim: tossed along the aim angle
    return {
      kind: 'npc', team: 'player', x: o.x + o.facing * 10, y: o.y - 12, w: 12, h: 9, vx: lv.vx, vy: lv.vy, t: 0, hops: 0, life: 3.4, facing: o.facing, dead: false, owner: o, chat: 0,
      update(dt) {
        this.t += dt; this.life -= dt; this.chat -= dt;
        const g = G(), tg = g.nearestEnemy(this.x, this.y, 'player', 340);
        if (tg) this.facing = tg.x > this.x ? 1 : -1;
        S.Phys.move(this, dt);
        if (this.onGround) {
          this.hops++; this.vy = -300 - (this.hitWall ? 140 : 0); this.vx = this.facing * 210;
          word(U.pick(['CLACK', 'CHATTER', 'CLICK-CLACK']), this.x, this.y - 16, { size: 13, color: '#ffffff', life: 0.35 });
          sfx('clack', { x: this.x, vol: 0.5 });
        } else if (this.hitWall) { this.vy = Math.min(this.vy, -320); this.vx = this.facing * 200; }
        const touching = tg && Math.abs(tg.x - this.x) < (tg.w / 2 + 10) && this.y > tg.y - tg.h - 8 && this.y - 8 < tg.y;
        if (this.life <= 0 || this.hops > 5 || touching || this.fellOut) {
          this.dead = true;
          const bm = o.blastMul || 1;
          g.explode(this.x, this.y - 4, 78 * bm, 8 * (o.dmgMul || 1), 'player', { player: true, owner: o });
          word('CHOMP! KA-BLAM!', this.x, this.y - 40, { size: 22, color: '#ff8fb0', stroke: '#ffffff', burst: true, burstColor: '#ff7a1a', life: 0.8 });
          if (S.FX) for (let i = 0; i < 7; i++) S.FX.add({ x: this.x, y: this.y - 6, vx: U.rand(-220, 220), vy: U.rand(-420, -140), life: 1.4, kind: 'limb', len: 3, size: 2.4, color: '#ffffff', g: 1, rot: Math.random() * 6, vr: U.rand(-16, 16), bounce: true });
        }
      },
      draw(ctx) {
        const op = (Math.abs(Math.sin(this.t * 22)) * 0.5 + (this.onGround ? 0 : 0.5)) * 4.5;
        ctx.save(); ctx.translate(this.x, this.y - 4.5); ctx.scale(this.facing, 1);
        ctx.fillStyle = '#ff8fb0'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(0, -op / 2 - 2.4, 7, 3.6, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(0, op / 2 + 2.4, 7, 3.6, 0, 0, Math.PI); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#ffffff';
        for (let i = -5; i <= 3.5; i += 2.5) { ctx.fillRect(i, -op / 2 - 2.6, 2.1, 3); ctx.fillRect(i, op / 2 - 0.4, 2.1, 3); }
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(4, -op / 2 - 5.6, 2, 0, U.TAU); ctx.fill(); ctx.lineWidth = 1; ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(4.5 + Math.sin(this.t * 14) * 0.5, -op / 2 - 5.4, 0.8, 0, U.TAU); ctx.fill();
        ctx.restore();
      },
    };
  }
})();
