// Stick Doosh - entities.js (core): gold, power-up badges, flying capsules, barrels, cages, flags, chopper, hazards.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';
  let uid = 1;
  function sfx(n, o) { if (S.Audio && S.Audio.sfx) S.Audio.sfx(n, o); }
  function word(t, x, y, o) { if (S.Comic) S.Comic.word(t, x, y, o); }
  function player() { return S.Game && S.Game.player && !S.Game.player.dead ? S.Game.player : null; }

  const PICK = {
    S: { name: 'SPREAD!', color: '#ff3b3b', letter: 'S' },
    M: { name: 'MACHINE GUN!', color: '#3b8bff', letter: 'M' },
    D: { name: 'DOOSH TIME!', color: '#ff8c1a', letter: 'D' },
    R: { name: 'ROCKETS!', color: '#5fd35f', letter: 'R' },
    F: { name: 'FLAMETHROWER!', color: '#ff5a1a', letter: 'F' },
    L: { name: 'LASER!', color: '#3df2ff', letter: 'L' },
    B: { name: 'BARRIER!', color: '#ffffff', letter: 'B' },
    rapid: { name: 'RAPID FIRE!', color: '#c77dff', letter: '⚡' },
    heal: { name: 'HEALTH!', color: '#ff6b8a', letter: '+' },
    gold: { name: 'CASH MONEY!', color: '#ffd23f', letter: '$' },
    '1UP': { name: 'EXTRA DUDE!', color: '#7dff6b', letter: '1UP' },
    ammo: { name: 'SUPER AMMO!', color: '#ffe14d', letter: 'A' },
  };
  const WEAPON_PICKS = ['S', 'M', 'D', 'R', 'F', 'L'];
  const LOOT2PICK = { spread: 'S', mg: 'M', shotgun: 'D', rocket: 'R', flame: 'F', laser: 'L', barrier: 'B', rapid: 'rapid', heal: 'heal', ammo: 'ammo', gold: 'gold', '1up': '1UP' };

  function base(o) {
    return Object.assign({ uid: uid++, kind: 'pickup', team: 'neutral', x: 0, y: 0, w: 10, h: 10, vx: 0, vy: 0, hp: 1, maxHp: 1, dead: false, t: 0 }, o);
  }

  function drawBadge(ctx, x, y, id, t, sc) {
    const d = PICK[id] || PICK.S;
    sc = sc || 1;
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 3) * 0.15); ctx.scale(sc, sc);
    if (S.Comic) S.Comic.burst(ctx, 0, 0, 8, 12.5, 8, 11); else { ctx.beginPath(); ctx.arc(0, 0, 11, 0, U.TAU); }
    ctx.fillStyle = d.color; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, U.TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = (d.letter.length > 1 ? 7 : 11) + 'px Bangers, Impact, sans-serif';
    ctx.fillText(d.letter, 0, 1);
    ctx.restore();
  }

  const Ents = S.Ents = {
    PICK, WEAPON_PICKS, drawBadge,
    gold(x, y, value, vx, vy) {
      const big = value >= 40;
      return base({
        kind: 'pickup', x, y, w: big ? 14 : 8, h: big ? 8 : 8, vx: vx == null ? U.rand(-80, 80) : vx, vy: vy == null ? U.rand(-260, -120) : vy,
        value, big, life: 30,
        update(dt) {
          this.t += dt; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
          const p = player();
          if (this.hiddenBar && S.Terrain.solidPx(this.x, this.y - 4)) return;
          if (p && this.t > 0.25) {
            const mr = 46 + ((S.Game.stats && S.Game.stats.magnet) || 0) * 34;
            const dx = p.x - this.x, dy = (p.y - 14) - (this.y - 4), d = Math.hypot(dx, dy);
            if (d < mr) { this.noGrav = true; this.vx = dx / d * 420; this.vy = dy / d * 420; this.noTerrain = true; }
            if (d < 14) { this.dead = true; S.Game.addGold(this.value, this.x, this.y - 8); sfx('gold', { vol: 0.5, x: this.x }); return; }
          }
          if (S.Phys) S.Phys.move(this, dt);
          if (this.onGround) this.vx *= 0.85;
          if (this.fellOut) this.dead = true;
        },
        draw(ctx) {
          const blink = this.life < 4 && Math.floor(this.life * 8) % 2;
          if (blink || (this.hiddenBar && S.Terrain.solidPx(this.x, this.y - 4))) return;
          if (this.big) {
            ctx.save(); ctx.translate(this.x, this.y - 4);
            ctx.fillStyle = '#ffd23f'; ctx.strokeStyle = INK; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(-7, 4); ctx.lineTo(-5, -4); ctx.lineTo(5, -4); ctx.lineTo(7, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.lineTo(2, -2); ctx.stroke();
            ctx.restore();
          } else {
            const sq = Math.abs(Math.cos(this.t * 6));
            ctx.save(); ctx.translate(this.x, this.y - 4); ctx.scale(Math.max(0.2, sq), 1);
            ctx.beginPath(); ctx.arc(0, 0, 4, 0, U.TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 1.3; ctx.strokeStyle = INK; ctx.stroke();
            ctx.fillStyle = '#b8860b'; ctx.fillRect(-0.8, -2, 1.6, 4);
            ctx.restore();
          }
        },
      });
    },
    goldbar(x, y) { return Ents.gold(x, y, 50, 0, -60); },
    norm(id) { return LOOT2PICK[String(id).toLowerCase()] || (PICK[id] ? id : (WEAPON_PICKS.indexOf(String(id).toUpperCase()) >= 0 ? String(id).toUpperCase() : id)); },
    crate(x, y, loot) {
      return base({
        kind: 'prop', team: 'neutral', shootable: true, crate: true, x, y, w: 18, h: 18, hp: 2, maxHp: 2, loot, flash: 0,
        update(dt) { this.t += dt; if (this.flash > 0) this.flash -= dt; if (S.Phys) S.Phys.move(this, dt); if (this.fellOut) this.dead = true; },
        hurt(dmg, src, info) {
          if (this.dead) return true;
          if (src && src.team === 'enemy') return true;
          this.hp -= dmg; this.flash = 0.08;
          if (this.hp <= 0) {
            this.dead = true;
            if (S.FX) { S.FX.debris(this.x, this.y - 9, 8, '#d9973f'); S.FX.dust(this.x, this.y - 4, 4); }
            word(U.pick(['CRACK!', 'SPLINTER!', 'KRAK!']), this.x, this.y - 22, { size: 16, color: '#ffe14d' });
            sfx('wood', { x: this.x });
            const lt = Ents.norm(this.loot || 'gold');
            if (this.loot && lt !== 'gold') S.Game.spawn(Ents.pickup(this.x, this.y - 6, lt, true));
            else { const n = U.randi(2, 4); for (let i = 0; i < n; i++) S.Game.spawn(Ents.gold(this.x, this.y - 10, U.randi(3, 8))); }
          } else { word('TOK', this.x, this.y - 22, { size: 12, color: '#ffffff', life: 0.3 }); if (S.FX) S.FX.debris(this.x, this.y - 9, 2, '#d9973f'); }
          return true;
        },
        draw(ctx) {
          ctx.save(); ctx.translate(this.x, this.y);
          ctx.fillStyle = this.flash > 0 ? '#ffffff' : '#d9973f'; ctx.strokeStyle = INK; ctx.lineWidth = 2.2;
          ctx.fillRect(-9, -18, 18, 18); ctx.strokeRect(-9, -18, 18, 18);
          ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-8, -17); ctx.lineTo(8, -1); ctx.moveTo(8, -17); ctx.lineTo(-8, -1); ctx.stroke();
          ctx.fillStyle = '#8c561a'; ctx.fillRect(-9, -18, 18, 3);
          if (this.loot) { ctx.fillStyle = INK; ctx.font = '9px Bangers, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', 0, -6); }
          ctx.restore();
        },
      });
    },
    // floating power-up badge
    pickup(x, y, id, pop) {
      id = Ents.norm(id);
      return base({
        kind: 'pickup', id, x, y, w: 18, h: 18, vx: pop ? U.rand(-40, 40) : 0, vy: pop ? -260 : 0, baseY: y, life: 25,
        update(dt) {
          this.t += dt; this.life -= dt; if (this.life <= 0) { this.dead = true; return; }
          // power-ups must come down to player ground level (bug fix: they used to freeze in mid-air)
          if (!this.landed) {
            if (!pop && !this._snap) { this._snap = true; const g = S.Terrain && S.Terrain.groundBelow ? S.Terrain.groundBelow(this.x, this.y, 1400) : null; if (g != null) { this.y = g; this.baseY = g; this.landed = true; } }
            if (!this.landed) {
              this.vx *= Math.pow(0.02, dt); S.Phys && S.Phys.move(this, dt);
              if (this.onGround || this.t > 4) { this.landed = true; this.vx = 0; this.vy = 0; this.baseY = this.y; }
            }
          } else this.y = this.baseY - (1 + Math.sin(this.t * 3)) * 1.5;
          const p = player();
          if (p && U.overlap(this, p, 4)) {
            this.dead = true;
            if (p.applyPickup) p.applyPickup(this.id);
            const d = PICK[this.id];
            word(d ? d.name : this.id, this.x, this.y - 22, { size: 22, color: d ? d.color : '#fff', burst: true, burstColor: '#141018', life: 0.9 });
            sfx('powerup', { x: this.x });
            if (S.FX) S.FX.ring(this.x, this.y - 9, 26, '#ffffff');
          }
        },
        draw(ctx) {
          if (this.life < 4 && Math.floor(this.life * 8) % 2) return;
          drawBadge(ctx, this.x, this.y - 9, this.id, this.t, 1);
        },
      });
    },
    // Contra-style flying capsule: shoot it to drop a badge
    capsule(x, y, dir, id) {
      return base({
        kind: 'prop', team: 'neutral', shootable: true, x, y, w: 22, h: 14, hp: 1, dir: dir || -1, y0: y, id: id || U.pick(WEAPON_PICKS.concat(['B', 'rapid'])),
        always: true, life: 14,
        update(dt) {
          this.t += dt; this.life -= dt; if (this.life <= 0) this.dead = true;
          this.x += this.dir * 130 * dt; this.y = this.y0 + Math.sin(this.t * 2.6) * 40;
        },
        hurt() {
          if (this.dead) return true;
          this.dead = true;
          S.Game.spawn(Ents.pickup(this.x, this.y - 4, this.id, true));
          if (S.FX) { S.FX.explosion(this.x, this.y - 7, 18); }
          word('POP!', this.x, this.y - 18, { size: 18, color: '#ffffff' });
          sfx('pop', { x: this.x });
          return true;
        },
        draw(ctx) {
          ctx.save(); ctx.translate(this.x, this.y - 7);
          ctx.fillStyle = '#cfd6e0'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
          ctx.beginPath(); ctx.ellipse(0, 0, 13, 7, 0, 0, U.TAU); ctx.fill(); ctx.stroke();
          const fl = Math.sin(this.t * 30) > 0 ? 10 : 6;
          ctx.fillStyle = '#ffb81c'; ctx.beginPath(); ctx.moveTo(-this.dir * 11, -3); ctx.lineTo(-this.dir * (11 + fl), 0); ctx.lineTo(-this.dir * 11, 3); ctx.fill();
          ctx.beginPath(); ctx.moveTo(-6, -11); ctx.lineTo(0, -6); ctx.lineTo(6, -11); ctx.lineTo(4, -6); ctx.lineTo(-4, -6); ctx.closePath(); ctx.fillStyle = '#e8173a'; ctx.fill(); ctx.stroke();
          ctx.restore();
          drawBadge(ctx, this.x, this.y - 7, this.id, this.t, 0.55);
        },
      });
    },
    barrel(x, y) {
      return base({
        kind: 'prop', team: 'neutral', shootable: true, barrel: true, x, y, w: 14, h: 18, hp: 2, maxHp: 2, fuse: -1,
        update(dt) {
          this.t += dt;
          if (S.Phys) S.Phys.move(this, dt);
          if (this.fellOut) this.dead = true;
          if (this.fuse >= 0) {
            this.fuse -= dt;
            if (S.FX && Math.random() < 0.7) S.FX.fire(this.x, this.y - 18, 1);
            if (this.fuse < 0) this.boom();
          }
        },
        hurt(dmg, src, info) {
          if (this.dead || this.fuse >= 0) return true;
          this.hp -= dmg;
          if (this.hp <= 0) {
            this.fuse = info && info.blast ? 0.12 : 0.35;
            word('HISSSS', this.x, this.y - 26, { size: 14, color: '#ffb81c', life: 0.4 });
            sfx('fuse', { x: this.x, vol: 0.5 });
          }
          return true;
        },
        boom() {
          if (this.dead) return;
          this.dead = true;
          S.Game.explode(this.x, this.y - 9, 72, 7, 'neutral', { barrel: true });
        },
        draw(ctx) {
          const flash = this.fuse >= 0 && Math.floor(this.t * 20) % 2;
          ctx.save(); ctx.translate(this.x, this.y);
          ctx.fillStyle = flash ? '#ffffff' : '#e8173a'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-7.5, -18); ctx.lineTo(7.5, -18); ctx.lineTo(7, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(-7.3, -6); ctx.lineTo(7.3, -6); ctx.moveTo(-7.4, -12.5); ctx.lineTo(7.4, -12.5); ctx.stroke();
          ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.moveTo(-2.5, -7.5); ctx.lineTo(0, -11.5); ctx.lineTo(2.5, -7.5); ctx.closePath(); ctx.fill(); ctx.lineWidth = 0.9; ctx.stroke();
          ctx.restore();
        },
      });
    },
    cage(x, y, look) {
      const dudes = S.Dudes && S.Dudes.order ? S.Dudes.order : null;
      const lk = look || (dudes && S.Dudes[U.pick(dudes)] ? S.Dudes[U.pick(dudes)].look : { limb: '#ffffff' });
      return base({
        kind: 'prop', team: 'neutral', shootable: true, cage: true, x, y, w: 24, h: 34, hp: 3, maxHp: 3, look: lk, helpT: U.rand(1, 3),
        hurt(dmg, src, info) {
          if (this.dead) return true;
          if (src && src.team === 'enemy') return false; // enemies can't free prisoners
          this.hp -= dmg; this.flash = 0.1;
          if (this.hp <= 0) this.free();
          return true;
        },
        free() {
          this.dead = true;
          if (S.FX) { S.FX.debris(this.x, this.y - 16, 6, '#9ea3b8'); S.FX.confetti(this.x, this.y - 20, 14); }
          word('FREEDOM!', this.x, this.y - 44, { size: 24, color: '#7dff6b', burst: true, burstColor: '#141018' });
          sfx('cage', { x: this.x });
          S.Game.spawn(Ents.prisoner(this.x, this.y, this.look));
          if (S.Game.rescue) S.Game.rescue(this);
        },
        update(dt) {
          this.t += dt; if (this.flash > 0) this.flash -= dt;
          const p = player();
          this.helpT -= dt;
          if (p && this.helpT <= 0 && Math.abs(p.x - this.x) < 260) { this.helpT = U.rand(3, 6); if (S.Comic) S.Comic.bubble(U.pick(['HELP!', 'GET ME OUTTA HERE!', 'SHOOT THE CAGE, DUMMY!', 'I NEED A WIZZ', 'BRO! BRO! BRO!']), this.x, this.y - 40, { follow: this, life: 1.6, speaker: 'cage' + this.uid }); }
        },
        draw(ctx) {
          if (S.Rig) S.Rig.draw(ctx, this.x, this.y - 2, { look: this.look, facing: -1, pose: 'wave', t: this.t, face: 'scared' });
          ctx.save(); ctx.translate(this.x, this.y);
          ctx.strokeStyle = INK; ctx.lineWidth = 2.8;
          ctx.strokeRect(-12, -34, 24, 34);
          ctx.strokeStyle = this.flash > 0 ? '#ffffff' : '#7d8899'; ctx.lineWidth = 1.8;
          ctx.beginPath(); for (let i = -8; i <= 8; i += 4) { ctx.moveTo(i, -33); ctx.lineTo(i, -1); } ctx.stroke();
          ctx.fillStyle = '#5c5970'; ctx.fillRect(-13, -37, 26, 4); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(-13, -37, 26, 4);
          ctx.restore();
        },
      });
    },
    prisoner(x, y, look) {
      return base({
        kind: 'npc', team: 'neutral', x, y, w: 12, h: 30, vx: 0, vy: -320, look, life: 1.4, facing: 1,
        update(dt) {
          this.t += dt; this.life -= dt;
          const p = player();
          if (p) { this.facing = p.x > this.x ? 1 : -1; this.vx = this.facing * 160; }
          S.Phys && S.Phys.move(this, dt);
          if (this.life <= 0) { this.dead = true; if (S.FX) S.FX.confetti(this.x, this.y - 16, 10); }
        },
        draw(ctx) { if (S.Rig) S.Rig.draw(ctx, this.x, this.y, { look: this.look, facing: this.facing, pose: this.onGround ? 'run' : 'jump', t: this.t, face: 'grin' }); },
      });
    },
    flag(x, y) {
      return base({
        kind: 'prop', team: 'neutral', flag: true, x, y, w: 16, h: 64, raised: false, rise: 0,
        update(dt) {
          this.t += dt;
          if (this.raised) { this.rise = Math.min(1, this.rise + dt * 1.8); return; }
          const p = player();
          if (p && Math.abs(p.x - this.x) < 18 && p.y > this.y - 70 && p.y - p.h < this.y + 4) {
            this.raised = true;
            S.Game.checkpoint = { x: this.x, y: this.y };
            word('CHECKPOINT!', this.x, this.y - 74, { size: 24, color: '#ffe14d', burst: true, burstColor: '#e8173a' });
            sfx('flag', { x: this.x });
            if (p.heal) p.heal(1);
            if (S.Voice) S.Voice.say(p.dude, 'flag', { follow: p });
            if (S.FX) S.FX.confetti(this.x, this.y - 60, 16);
          }
        },
        draw(ctx) {
          ctx.save(); ctx.translate(this.x, this.y);
          ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -64); ctx.stroke();
          ctx.strokeStyle = '#d3dbe6'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -64); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, -65, 2.6, 0, U.TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.stroke();
          const fy = U.lerp(-14, -62, this.raised ? U.easeOutBack(this.rise) : 0);
          const w = Math.sin(this.t * 7) * 2;
          ctx.beginPath(); ctx.moveTo(1, fy); ctx.quadraticCurveTo(10, fy - 2 + w, 20, fy + w); ctx.lineTo(20, fy + 13 + w); ctx.quadraticCurveTo(10, fy + 11 - w, 1, fy + 13); ctx.closePath();
          ctx.fillStyle = this.raised ? '#e8173a' : '#5c5970'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
          if (S.FX) { ctx.save(); ctx.translate(10.5, fy + 6.5 + w * 0.5); S.FX.starPath(ctx, 4.2); ctx.fillStyle = this.raised ? '#ffe14d' : '#9ea3b8'; ctx.fill(); ctx.lineWidth = 1; ctx.stroke(); ctx.restore(); }
          ctx.restore();
        },
      });
    },
    chopper(hoverX, hoverY) {
      return base({
        kind: 'npc', team: 'neutral', chopper: true, always: true, x: hoverX + 600, y: hoverY - 260, hx: hoverX, hy: hoverY, w: 70, h: 30,
        state: 'in', ladder: 0, ladderMax: 120, grabbed: false,
        update(dt) {
          this.t += dt;
          if (this.state === 'in') {
            this.x = U.lerp(this.x, this.hx, Math.min(1, dt * 1.8)); this.y = U.lerp(this.y, this.hy, Math.min(1, dt * 1.8));
            if (Math.abs(this.x - this.hx) < 6) {
              this.state = 'hover';
              const gy = this.floorY || (S.Terrain ? S.Terrain.groundBelow(this.hx, this.hy + 10, 600) : null);
              this.ladderMax = gy ? Math.max(40, gy - this.hy - 28) : 160;
              if (S.Comic) S.Comic.bubble('GET TO THE CHOPPA!', this.x, this.y - 30, { follow: this, life: 2.5, speaker: 'chopper', shout: true });
            }
          } else if (this.state === 'hover') {
            this.x = this.hx + Math.sin(this.t * 1.4) * 6; this.y = this.hy + Math.sin(this.t * 2.1) * 4;
            this.ladder = Math.min(this.ladderMax, this.ladder + dt * 160);
            const p = player();
            if (p && !this.grabbed && this.ladder > 30 && Math.abs(p.x - this.x) < 14 && p.y - p.h < this.y + this.ladder && p.y > this.y + 10) {
              this.grabbed = true; this.state = 'out';
              if (S.Game.chopperGrab) S.Game.chopperGrab(this);
            }
          } else if (this.state === 'out') {
            this.x += dt * 260; this.y -= dt * 150;
            const p = S.Game.player; if (p) { p.x = this.x; p.y = this.y + this.ladder * 0.7; p.vx = 0; p.vy = 0; }
          }
          sfx('heli', { vol: 0.15, x: this.x, throttle: 0.4 });
        },
        draw(ctx) {
          const x = this.x, y = this.y;
          // ladder
          if (this.ladder > 0) {
            ctx.strokeStyle = INK; ctx.lineWidth = 3.5;
            ctx.beginPath(); ctx.moveTo(x - 5, y + 10); ctx.lineTo(x - 5, y + 10 + this.ladder); ctx.moveTo(x + 5, y + 10); ctx.lineTo(x + 5, y + 10 + this.ladder);
            for (let r = 18; r < this.ladder; r += 9) { ctx.moveTo(x - 5, y + 10 + r); ctx.lineTo(x + 5, y + 10 + r); } ctx.stroke();
            ctx.strokeStyle = '#d6974f'; ctx.lineWidth = 1.6; ctx.stroke();
          }
          ctx.save(); ctx.translate(x, y);
          ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.lineJoin = 'round';
          // tail
          ctx.fillStyle = '#5f7a3a'; ctx.beginPath(); ctx.moveTo(18, -6); ctx.lineTo(62, -10); ctx.lineTo(64, -2); ctx.lineTo(18, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(64, -9, 3, 9 + Math.sin(this.t * 50) * 3, 0, 0, U.TAU); ctx.stroke();
          // body
          ctx.beginPath(); ctx.ellipse(0, 0, 26, 14, 0, 0, U.TAU); ctx.fillStyle = '#6f8a3a'; ctx.fill(); ctx.stroke();
          ctx.beginPath(); ctx.ellipse(-12, -3, 11, 8, 0, 0, U.TAU); ctx.fillStyle = '#bfefff'; ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#ffe14d'; ctx.font = '9px Bangers, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('DOOSH AIR', 9, 6);
          ctx.beginPath(); ctx.moveTo(-14, 14); ctx.lineTo(16, 14); ctx.moveTo(-8, 10); ctx.lineTo(-10, 14); ctx.moveTo(10, 10); ctx.lineTo(12, 14); ctx.stroke();
          // rotor
          ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -14); ctx.lineTo(0, -19); ctx.stroke();
          const rw = 46 * Math.abs(Math.cos(this.t * 40));
          ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-rw, -20); ctx.lineTo(rw, -20); ctx.stroke();
          ctx.globalAlpha = 0.35; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -20, 48, 4, 0, 0, U.TAU); ctx.fill(); ctx.globalAlpha = 1;
          ctx.restore();
        },
      });
    },
  };

  // ---------------- hazards registry (levels agent may add more: SGS.Hazards[id] = (spec) => entity) ----------------
  const Hazards = S.Hazards = S.Hazards || {};
  Hazards.icicle = (sp) => base({
    kind: 'hazard', team: 'neutral', shootable: true, x: sp.x, y: sp.y, w: 10, h: 18, hp: 1, state: 'hang', shakeT: 0, noGrav: true, noTerrain: true,
    update(dt) {
      this.t += dt;
      const p = player();
      if (this.state === 'hang' && p && Math.abs(p.x - this.x) < 34 && p.y > this.y) { this.state = 'shake'; this.shakeT = 0.6; /* fairness audit: >= 0.5 s of cracking + shaking before the drop */ sfx('crack', { x: this.x, vol: 0.4 }); }
      if (this.state === 'shake') { this.shakeT -= dt; if (this.shakeT <= 0) { this.state = 'fall'; this.noGrav = false; } }
      if (this.state === 'fall') {
        this.vy = Math.min(800, this.vy + C.GRAV * dt * ((S.Game && S.Game.grav) || 1)); this.y += this.vy * dt;
        if (p && U.overlap(this, p, 0)) { p.hurt && p.hurt(1, this, { dirX: 0, kind: 'hazard' }); this.shatter(); }
        if (S.Terrain && S.Terrain.solidPx(this.x, this.y)) this.shatter();
        if (this.y > S.Terrain.H * C.T + 50) this.dead = true;
      }
    },
    hurt() { if (this.state === 'hang') { this.state = 'fall'; this.noGrav = false; } return true; },
    shatter() { this.dead = true; S.FX && S.FX.spark(this.x, this.y - 6, 10, '#bfefff'); word('KRSSH', this.x, this.y - 12, { size: 16, color: '#bfefff' }); sfx('glass', { x: this.x, vol: 0.5 }); },
    draw(ctx) {
      const jx = this.state === 'shake' ? U.rand(-1.5, 1.5) : 0;
      ctx.beginPath(); ctx.moveTo(this.x - 5 + jx, this.y - 18); ctx.lineTo(this.x + 5 + jx, this.y - 18); ctx.lineTo(this.x + jx, this.y); ctx.closePath();
      ctx.fillStyle = '#bfefff'; ctx.fill(); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.stroke();
    },
  });
  Hazards.firejet = (sp) => base({
    kind: 'hazard', team: 'neutral', x: sp.x, y: sp.y, w: 16, h: 70, period: sp.period || 3, phase: sp.phase || 0,
    update(dt) {
      this.t += dt;
      const c = ((this.t + this.phase) % this.period) / this.period;
      this.on = c > 0.5;
      this.warn = !this.on && c > 0.5 - 0.6 / this.period; // fairness audit: 0.6 s of sputtering + red glow before every blast
      if (this.on) {
        if (S.FX && Math.random() < 0.9) S.FX.fire(this.x, this.y - U.rand(4, 60), 1);
        const p = player();
        if (p && Math.abs(p.x - this.x) < 12 && p.y > this.y - 70 && p.y - p.h < this.y) p.hurt && p.hurt(1, this, { dirX: U.sign(p.x - this.x) || 1, kind: 'fire', fire: true });
        if (S.Game) for (const e of S.Game.ents) if (e.team === 'enemy' && !e.dead && Math.abs(e.x - this.x) < 12 && e.y > this.y - 70 && e.y - e.h < this.y) S.Game.damage(e, dt * 3, { team: 'neutral', kind: 'fire', fire: true });
      }
    },
    draw(ctx) {
      ctx.fillStyle = '#5c5970'; ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
      ctx.fillRect(this.x - 7, this.y - 6, 14, 6); ctx.strokeRect(this.x - 7, this.y - 6, 14, 6);
      if (this.warn) { // telegraph: hatched danger column + a flickering pilot flame
        ctx.save(); ctx.globalAlpha = 0.18 + 0.2 * Math.abs(Math.sin(this.t * 22)); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(this.x - 8, this.y - 76, 16, 70);
        ctx.globalAlpha = 0.7; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 1.6; ctx.setLineDash([5, 4]); ctx.strokeRect(this.x - 8, this.y - 76, 16, 70); ctx.setLineDash([]);
        ctx.globalAlpha = 1; ctx.fillStyle = '#ffb81c'; ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(this.x - 4, this.y - 6); ctx.lineTo(this.x, this.y - 12 - Math.abs(Math.sin(this.t * 30)) * 8); ctx.lineTo(this.x + 4, this.y - 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      if (this.on) {
        ctx.fillStyle = '#ffb81c'; ctx.beginPath(); ctx.moveTo(this.x - 7, this.y - 6);
        for (let k = 0; k <= 6; k++) ctx.lineTo(this.x - 7 + k * 14 / 6 + Math.sin(this.t * 30 + k) * 2, this.y - 6 - (k % 2 ? 60 : 44) - Math.sin(this.t * 20 + k) * 6);
        ctx.lineTo(this.x + 7, this.y - 6); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke();
      }
    },
  });
  Hazards.gust = (sp) => base({
    kind: 'hazard', team: 'neutral', x: sp.x, y: sp.y, w: sp.w || 200, h: sp.h || 160, force: sp.force || 420, dir: sp.dir || 1,
    update(dt) {
      this.t += dt;
      const p = player();
      if (p && U.overlap(this, p, 0)) { p.windX = (p.windX || 0) + this.dir * this.force; }
    },
    draw(ctx) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
      for (let i = 0; i < 6; i++) {
        const yy = this.y - this.h + (i + 0.5) * this.h / 6;
        const ph = ((this.t * 1.4 + i * 0.37) % 1);
        const xx = this.x - this.w / 2 + (this.dir > 0 ? ph : 1 - ph) * this.w;
        ctx.beginPath(); ctx.moveTo(xx - this.dir * 18, yy); ctx.quadraticCurveTo(xx - this.dir * 6, yy - 4, xx, yy); ctx.stroke();
      }
    },
  });
})();
