/* World logic: doors (blue / red / green / boss), room transitions, item pickups, save pads and map terminals, plus map-cell helpers. */
(function (G) {
  'use strict';
  const RM = G.room, T = 16, W = {};
  G.world = W;
  W.ITEMS = {
    morph: { name: 'MORPH BALL', ramp: 'teal', lines: ['Curl into a ball to roll through tunnels.', 'Crouch, then press Down again.'], apply: (g) => { g.abil.morph = true; } },
    missile: { name: 'MISSILES', ramp: 'crimson', lines: ['Opens red doors and breaks missile blocks.', 'Right click or C to fire.'], apply: (g) => { g.abil.missiles = true; g.P.missileMax = Math.max(g.P.missileMax, 5); g.P.missiles = g.P.missileMax; } },
    bombs: { name: 'BOMBS', ramp: 'gold', lines: ['In ball form, Fire lays a bomb.', 'Bombs break bomb blocks and bounce you up.'], apply: (g) => { g.abil.bombs = true; } },
    charge: { name: 'CHARGE BEAM', ramp: 'cobalt', lines: ['Hold Fire to charge: release early for a partial shot,', 'at full charge for a piercing blast, or keep holding for an overcharge.'], apply: (g) => { g.abil.charge = true; } },
    iceBeam: { name: 'ICE BEAM', ramp: 'cobalt', lines: ['Freezes enemies solid for a while.', 'Frozen enemies make stepping stones. Toggle: 1'], apply: (g) => { g.abil.hasIce = true; g.abil.beams.ice = true; } },
    heatSuit: { name: 'HEAT SUIT', ramp: 'crimson', lines: ['Shrugs off extreme heat.', 'Magma will hurt far less.'], apply: (g) => { g.abil.suitHeat = true; g.P.suit = 'crimson'; } },
    spaceJump: { name: 'SPACE JUMP', ramp: 'teal', lines: ['Press Jump again in mid-air to flip higher.', 'Chain it to climb tall shafts.'], apply: (g) => { g.abil.spacejump = true; } },
    dashBoots: { name: 'DASH BOOTS', ramp: 'gold', lines: ['Tap Shift for a SUPER DASH: a burst of speed wrapped in energy.', 'It shatters cracked blocks and hurts what it touches.'], apply: (g) => { g.abil.dash = true; } },
    waveBeam: { name: 'WAVE BEAM', ramp: 'visor', lines: ['Shots ripple through walls and shatter crystal blocks.', 'Toggle: 2'], apply: (g) => { g.abil.hasWave = true; g.abil.beams.wave = true; } },
    aquaSuit: { name: 'AQUA SUIT', ramp: 'cobalt', lines: ['Swim and move freely underwater.', 'Water no longer drags you down.'], apply: (g) => { g.abil.suitAqua = true; g.P.suit = 'teal'; } },
    grapple: { name: 'GRAPPLE BEAM', ramp: 'gold', lines: ['Hold Q near a ceiling anchor to be reeled in.', 'Jump to leap from it.'], apply: (g) => { g.abil.grapple = true; } },
    superMissile: { name: 'SUPER MISSILES', ramp: 'teal', lines: ['Opens green doors; hits much harder.', 'R swaps between missile types.'], apply: (g) => { g.abil.supers = true; g.P.superMax = Math.max(g.P.superMax, 5); g.P.supers = g.P.superMax; } },
    superTank: { name: 'SUPER MISSILE EXPANSION', tank: 'super', lines: ['Super missile capacity +5.'], apply: (g) => { g.P.superMax += 5; g.P.supers = Math.min(g.P.superMax, g.P.supers + 5); } },
    spinFlip: { name: 'SPINFLIP DRIVE', ramp: 'teal', lines: ['Overcharge, run and jump, then keep Fire held:', 'flip as a weapon that cannot be hurt.'], apply: (g) => { g.abil.spinflip = true; } },
    scanVisor: { name: 'SCAN VISOR', ramp: 'teal', lines: ['Press F to switch the scan visor on or off.', 'While it is on, hidden blocks appear and turn solid.'], apply: (g) => { g.abil.scan = true; } },
    plasmaBeam: { name: 'PLASMA BEAM', ramp: 'crimson', lines: ['Burning shots pierce through enemies.', 'Toggle: 3'], apply: (g) => { g.abil.hasPlasma = true; g.abil.beams.plasma = true; } },
    energyTank: { name: 'ENERGY TANK', tank: 'energy', lines: ['Maximum energy +100.'], apply: (g) => { g.P.tanks++; g.P.en = G.player.enMax(g.P); } },
    missileTank: { name: 'MISSILE EXPANSION', tank: 'missile', lines: ['Missile capacity +5.'], apply: (g) => { g.P.missileMax += 5; g.P.missiles = Math.min(g.P.missileMax, g.P.missiles + 5); } },
  };
  W.itemTotal = function () { let n = 0; for (const id in G.rooms) n += (G.rooms[id].items || []).length; return n; };
  /* map cells (30 x 17 tiles each) a room covers */
  W.cells = function (def) { if (def.parent) return []; const cw = Math.ceil(def.map[0].length / 30), ch = Math.ceil(def.map.length / 17), out = []; for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) out.push([def.mx + x, def.my + y]); return out; };
  const dkey = (room, d) => room.id + ':' + d.id;
  /* the gold exit door of a boss arena stays locked only until that arena's boss has been beaten (rooms are rebuilt on every visit, so the flag is checked on entry) */
  W.BOSS_FLAG = { arena: 'boss1', arena2: 'boss2', arena3: 'boss3', arena4: 'boss4', heartroom: 'boss5' };
  W.bossBeaten = (g, roomId) => !!(W.BOSS_FLAG[roomId] && g.prog.flags[W.BOSS_FLAG[roomId]]);
  W.shrineDone = (g, d) => { const its = d.to && G.rooms[d.to] && G.rooms[d.to].items; return !!(its && its.length && its.every((it) => g.prog.items[it.id])); };
  W.setup = function (g, room) {
    const def = room.def;
    g.doors = (def.doors || []).map((d) => {
      const o = Object.assign({ h: 3, state: 'closed', t: 0, idle: 0, tx: d.side === 'L' ? 0 : room.w - 1 }, d);
      if (o.color === 'open') o.state = 'open';
      if (o.side === 'I' && W.shrineDone(g, o)) { o.state = 'closed'; o.shut = true; }                   /* a shrine whose items are all taken is sealed for good: the slab is only a picture (you can walk through it) and there is no transition */
      if (o.color === 'boss' && W.bossBeaten(g, room.id)) o.color = 'blue';
      if (g.prog.doors[dkey(room, d)] || (d.to && g.prog.doors[d.to + ':' + d.door])) o.unlocked = true;      /* a door opened from either side is a plain blue door from then on */
      W.applyDoor(room, o);
      return o;
    });
    g.pickups = (def.items || []).filter((it) => !g.prog.items[it.id]).map((it) => Object.assign({}, it, { x: it.tx * T + 8, y: it.ty * T + 16 + (it.dy || 0), t: Math.floor(Math.random() * 60) }));
    g.stations = (def.stations || []).map((s) => ({ type: s.type, to: s.to, back: !!s.back, x: s.tx * T + 8, y: s.ty * T + 16, t: 0 }));
    room.decor = (def.decor || []).map((d) => {
      if (d.kind === 'statue') { const img = G.sprites.statue[d.size][room.zone || 1]; return { img, x: Math.round(d.x - img.width / 2), y: Math.round(d.y - img.height), statue: d.size, cx: d.x, fy: d.y }; }
      if (d.kind === 'ship') { const f = G.sprites.ship; return { ship: true, cx: d.x, fy: d.y, x: Math.round(d.x - f.w / 2), y: Math.round(d.y - f.h) }; }
      return { img: G.sprites.wreck, x: d.x, y: d.y };
    });
    g.prog.visited[room.id] = true;
  };
  W.applyDoor = function (room, d) { for (let i = 0; i < d.h; i++) RM.set(room, d.tx, d.ty + i, d.shut ? (room.doorWet && room.doorWet.has((d.ty + i) * room.w + d.tx) ? 14 : 0) : d.state !== 'open' ? 9 : room.doorWet && room.doorWet.has((d.ty + i) * room.w + d.tx) ? 14 : 0); };      /* an open doorway in a flooded room is water, not a hole in it */
  const canOpen = (g, d, kind) => d.unlocked || d.color === 'blue' || (d.color === 'red' && (kind === 'missile' || kind === 'super')) || (d.color === 'green' && kind === 'super');
  W.shotDoor = function (g, tx, ty, kind) {
    const d = g.doors.find((q) => q.tx === tx && ty >= q.ty && ty < q.ty + q.h);
    if (!d || d.state !== 'closed' || d.color === 'open' || d.sealed) return;
    if (d.color === 'boss' || !canOpen(g, d, kind)) { G.fx.sparkBurst(tx * T + 8, ty * T + 8, '#fff', 3); G.audio.sfx('hit'); return; }
    d.state = 'opening'; d.t = 0; G.audio.sfx('door');
    if (d.color !== 'blue' && !d.unlocked) { d.unlocked = true; g.prog.doors[dkey(g.room, d)] = true; if (d.to) g.prog.doors[d.to + ':' + d.door] = true; }
  };
  /* boss fight: lock every door, then free them */
  W.sealDoors = function (g) { for (const d of g.doors) { d.sealed = true; if (d.state !== 'closed') { d.state = 'closed'; W.applyDoor(g.room, d); } } };
  W.openAll = function (g) { for (const d of g.doors) { d.sealed = false; if (d.color === 'boss') d.color = 'blue'; if (d.state === 'closed' && !d.shut) { d.state = 'opening'; d.t = 0; } } };
  W.update = function (g) {
    const p = g.P, room = g.room;
    if (g.doorGrace > 0) g.doorGrace--;
    for (const d of g.doors) {
      const cx = d.tx * T + 8, near = Math.abs(p.x - cx) < 60 && p.y > d.ty * T - 16 && p.y < (d.ty + d.h) * T + 40;
      if (d.state === 'opening') { d.t++; if (d.t >= 12) { d.state = 'open'; d.idle = 0; W.applyDoor(room, d); } }
      else if (d.state === 'open' && d.color !== 'open') {
        d.idle = near ? 0 : d.idle + 1;
        if (d.idle > 140 && Math.abs(p.x - cx) > 26 && !g.boss) { d.state = 'closing'; d.t = 0; W.applyDoor(room, Object.assign({}, d, { state: 'closed' })); }
      } else if (d.state === 'closing') { d.t++; if (d.t >= 10) d.state = 'closed'; }
      if (!g.trans && d.to && d.state === 'open' && !p.dead) {
        const inRows = p.y > d.ty * T + 1 && p.y <= (d.ty + d.h) * T + 2;
        if (d.side === 'I') { if (inRows && !g.doorGrace && Math.abs(p.x - cx) < 7 && p.vx * d.out < 0) g.trans = { t: 0, to: d.to, door: d.door, phase: 'out' }; }   /* a doorway inside the room (item shrines): walk into it */
        else if (inRows && ((d.side === 'L' && p.x < 12 && p.vx <= 0) || (d.side === 'R' && p.x > room.pw - 12 && p.vx >= 0))) g.trans = { t: 0, to: d.to, door: d.door, phase: 'out' };
      }
    }
    for (const it of g.pickups) {
      it.t++;
      if (!p.dead && Math.abs(p.x - it.x) < p.w / 2 + 8 && p.y > it.y - 24 && p.y - p.h < it.y) { it.got = true; W.collect(g, it); }
    }
    g.pickups = g.pickups.filter((i) => !i.got);
    g.near = null;
    for (const s of g.stations) {
      s.t++;
      const near = Math.abs(p.x - s.x) < 14 && Math.abs(p.y - s.y) < 4 && p.ground && p.mode === 'stand';
      if (near) { g.near = s; if (G.input.down.u && !g.banner) W.useStation(g, s); }
    }
  };
  /* fast travel: any save pad whose room has been visited is a warp target, usable from another pad (press the map key while standing on one) */
  W.padRooms = (g) => Object.keys(G.rooms).filter((id) => g.prog.visited[id] && (G.rooms[id].stations || []).some((s) => s.type === 'save'));
  W.canWarp = (g) => !!(g.near && g.near.type === 'save' && !g.saveAnim && !g.getAnim && !g.boss && !g.escape && !g.banner && !g.trans && W.padRooms(g).length >= 2);
  W.padSpot = (id) => { const s = G.rooms[id].stations.find((q) => q.type === 'save'); return { x: s.tx * T + 8, y: s.ty * T + 16 }; };
  W.warpTo = function (g, id) { const sp = W.padSpot(id); g.trans = { t: 0, to: id, door: null, phase: 'out', sx: sp.x, sy: sp.y }; G.audio.sfx('door'); };
  W.useStation = function (g, s) {
    const p = g.P;
    if (s.type === 'lift') { if (!g.liftAnim) g.liftAnim = { phase: 'out', t: 0, x: s.x, y: s.y, s, yoff: 0, hide: false, white: 0, flash: false }; return; }
    if (s.type === 'save') { if (!g.saveAnim) g.saveAnim = { t: 0, x: s.x, y: s.y, s, face: p.face }; return; }
    for (const id in G.rooms) if (G.rooms[id].zone === g.room.zone) g.prog.mapped[id] = true;
    g.toast = { txt: 'MAP DATA DOWNLOADED', t: 0 }; G.audio.sfx('save');
  };
  /* save pad sequence: the hero turns to face front, a column of light rises from the pad, the progress is written at its peak, then the light fades and play resumes */
  W.saveDo = function (g, s) {
    const p = g.P;
    p.en = G.player.enMax(p); p.missiles = p.missileMax; p.sbombs = p.sbombMax; p.supers = p.superMax;
    const rec = G.save.snapshot(g, { x: s.x, y: s.y }); g.prog.saves = rec.saves; g.saveRec = rec;
    if (g.slot !== null && g.slot !== undefined) G.save.write(g.slot, rec);
    g.toast = { txt: 'PROGRESS SAVED', t: 0 }; G.audio.sfx('save'); G.fx.ring(s.x, s.y - 10); G.fx.ring(s.x, s.y - 30);
  };
  W.saveAnimStep = function (g) {
    const a = g.saveAnim, p = g.P; a.t++;
    p.x += (a.x - p.x) * 0.3; p.vx = 0; p.vy = 0; p.dash = 0;
    const C = G.sprites.capsule, lift = C.h - C.glass[3];                                       /* how far above the floor the glass floor is */
    if (a.t < 18) { const u = a.t / 18; a.yoff = lift * (1 - (1 - u) * (1 - u)) + 9 * Math.sin(Math.PI * u); }          /* the hero hops up into the capsule */
    else if (a.t < 94) a.yoff = lift;                                                                             /* ...stands in the glass while it scans and saves... */
    else { const u = Math.min(1, (a.t - 94) / 15); a.yoff = lift * (1 - u * u); }                                    /* ...and drops back down */
    if (a.t === 1) { G.audio.sfx('jump'); G.audio.sfx('chargeStart'); }
    if (a.t === 44) W.saveDo(g, a.s);
    if (a.t === 109) { G.audio.sfx('land'); G.fx.puff(a.x, a.y, 5); }
    if (a.t >= 110) g.saveAnim = null;
  };
  /* picking up an item: the world holds still, the hero raises an arm, a fanfare plays and the item floats up in a burst of light; then the text panel opens */
  W.collect = function (g, it) {
    const def = W.ITEMS[it.type]; g.prog.items[it.id] = true; def.apply(g); G.score.item(g, def, it.x, it.y);
    g.getAnim = { t: 0, it: { type: it.type, x: it.x, y: it.y }, def, big: !def.tank };
    if (G.music && G.music.fanfare) G.music.fanfare(!def.tank); else G.audio.sfx('pickup');
    G.fx.boom(it.x, it.y - 8, def.tank ? 8 : 14);
  };
  W.getAnimStep = function (g) {
    const a = g.getAnim, p = g.P; a.t++;
    p.vx = 0; p.vy = 0; p.dash = 0; p.aim = 'up'; p.aimAng = null; p.charge = 0;
    if (a.t % 5 === 0 && a.t < (a.big ? 130 : 56)) { const m = G.player.muzzle(p); G.fx.spark(m.x + (Math.random() - 0.5) * 10, m.y - 6 - Math.random() * 14, a.big ? '#fff2a8' : '#cfeeff'); }
    if (a.t >= (a.big ? 168 : 78)) { g.getAnim = null; g.banner = { name: a.def.name, lines: a.def.lines, t: 0, type: a.it.type }; }
  };
  /* stepped glow disc behind an item (rows of 1px, so it stays pixel-art) */
  W.glow = function (ctx, x, y, r, col, a) { ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; for (let dy = -r; dy <= r; dy++) { const dx = Math.floor(Math.sqrt(r * r - dy * dy)); ctx.fillRect(x - dx, y + dy, dx * 2 + 1, 1); } };
  /* an item as it lies in a shrine: abilities are the object itself in a pulsing aura, expansions are tanks (energy E-tank, missile, super) */
  W.drawItem = function (ctx, type, x, y, t, bob) {
    const S = G.sprites, def = W.ITEMS[type], pulse = 0.5 + 0.5 * Math.sin(t * 0.09);
    if (def.tank) {
      W.glow(ctx, x, y - 12 + bob, 13, '200,240,255', (0.05 + pulse * 0.05).toFixed(3));
      { const im = S.tank[def.tank][(t >> 4) & 1]; ctx.drawImage(im, x - (im.width >> 1), y - 1 - im.height + bob); }
    } else {
      const col = def.glow || '255,244,190';
      W.glow(ctx, x, y - 13 + bob, 17, col, (0.05 + pulse * 0.05).toFixed(3)); W.glow(ctx, x, y - 13 + bob, 12, col, (0.08 + pulse * 0.08).toFixed(3));
      { const im = S.icon[type]; ctx.drawImage(im, x - (im.width >> 1), y - 2 - im.height + bob); }
      if ((t >> 2) % 7 === 0) { ctx.fillStyle = '#fff'; ctx.fillRect(x + 8, y - 24 + bob, 1, 1); ctx.fillRect(x - 9, y - 6 + bob, 1, 1); }
    }
  };
  /* the save capsule: the painted pod standing on the floor line, its lights breathing; while saving the glow swells */
  W.drawCapsule = function (ctx, g, s, time) {
    const C = G.sprites.capsule, x0 = Math.round(s.x - C.w / 2), y0 = Math.round(s.y - C.h), a = g.saveAnim && g.saveAnim.s === s ? g.saveAnim : null;
    const boost = a ? Math.min(1, a.t / 28) * (a.t > 74 ? Math.max(0, 1 - (a.t - 74) / 20) : 1) : 0, pulse = 0.5 + 0.5 * Math.sin(time * 2.2 + s.x * 0.1), fast = 0.5 + 0.5 * Math.sin(time * 9);
    const gx = x0 + (C.glass[0] + C.glass[2]) / 2, gy = y0 + (C.glass[1] + C.glass[3]) / 2;
    ctx.globalCompositeOperation = 'lighter';
    W.glow(ctx, Math.round(gx), Math.round(gy), 40, '70,200,255', (0.035 + 0.02 * pulse + 0.06 * boost).toFixed(3)); W.glow(ctx, Math.round(gx), Math.round(gy), 27, '90,230,255', (0.05 + 0.03 * pulse + 0.09 * boost).toFixed(3));
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(C.c, x0, y0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#5ae8ff'; ctx.globalAlpha = 0.07 + 0.07 * pulse + 0.18 * boost; ctx.fillRect(x0 + C.glass[0], y0 + C.glass[1], C.glass[2] - C.glass[0] + 1, C.glass[3] - C.glass[1] + 1);      /* the glass hums */
    ctx.fillStyle = '#c8fbff'; ctx.globalAlpha = 0.16 + 0.26 * pulse + 0.4 * boost * (0.6 + 0.4 * fast); for (const [px, py] of C.lights) ctx.fillRect(x0 + px, y0 + py, 1, 1);          /* every cyan light brightens together */
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  /* the elevator: a painted arch with a glowing deck. Teleporting: the hero hops onto the deck, the light climbs, he flashes faster and faster and bursts into light (out); the light then
     crashes down on the destination deck, he materialises and drops to the floor (in). Pure picture + timing: the room change happens at the white-out. */
  const LIFT_UP = 18, LIFT_OUT = 78, LIFT_IN_FALL = 36, LIFT_IN_END = 54;
  W.liftSpot = (from, to) => { const st = (G.rooms[to].stations || []).find((q) => q.type === 'lift' && (q.to === from || q.back)); return st ? { x: st.tx * T + 8, y: st.ty * T + 16, tx: st.tx, ty: st.ty } : null; };
  W.liftAnimStep = function (g) {
    const a = g.liftAnim, p = g.P, L = G.sprites.lift, lift = L.h - L.deck; a.t++;
    p.vx = 0; p.vy = 0; p.dash = 0;
    if (a.phase === 'out') {
      p.x += (a.x - p.x) * 0.3;
      if (a.t < LIFT_UP) { const u = a.t / LIFT_UP; a.yoff = lift * (1 - (1 - u) * (1 - u)) + 8 * Math.sin(Math.PI * u); } else a.yoff = lift;
      if (a.t === 1) { G.audio.sfx('jump'); G.audio.sfx('chargeStart'); }
      if (a.t === 40) G.audio.sfx('chargeFull');
      a.flash = a.t >= 40 && a.t < 70 && (Math.floor(((a.t - 40) + (a.t - 40) * (a.t - 40) / 18) / 2) & 1) === 1;                   /* the flicker speeds up */
      if (a.t === 70) { a.hide = true; a.flash = false; G.audio.sfx('boom'); G.audio.sfx('spacejump'); g.shake = Math.max(g.shake, 4); }
      a.white = a.t < 62 ? 0 : Math.min(1, (a.t - 62) / 14);
      if (a.t >= LIFT_OUT) {
        if (!a.s.to) { g.liftAnim = null; G.main.ending(g); return; }
        const spot = W.liftSpot(g.roomId, a.s.to);
        G.game.enterRoom(a.s.to, null, spot ? spot.x : undefined, spot ? spot.y : undefined);
        const ns = spot && g.stations.find((q) => q.type === 'lift' && Math.abs(q.x - spot.x) < 2);
        g.liftAnim = { phase: 'in', t: 0, x: spot ? spot.x : p.x, y: spot ? spot.y : p.y, s: ns || a.s, yoff: lift, hide: true, white: 1, flash: false, impact: false };
        p.face = 1; G.render.camera(g, true);
      }
    } else {
      p.x = a.x; p.y = a.y; p.ground = true; a.yoff = a.t < LIFT_IN_FALL ? lift : lift * (1 - Math.pow(Math.min(1, (a.t - LIFT_IN_FALL) / 14), 2));
      if (a.t === 1) G.audio.sfx('chargeStart');
      if (a.t === 16) { a.hide = false; a.impact = true; G.audio.sfx('boom'); G.audio.sfx('save'); g.shake = Math.max(g.shake, 5); G.fx.ring(a.x, a.y - lift); }
      a.flash = a.t >= 16 && a.t < 30 && (Math.floor((a.t - 16) / 2) & 1) === 0;                                                   /* materialising: white silhouette flickers into colour */
      a.white = a.t < 8 ? 1 - a.t / 8 : a.t >= 16 && a.t < 22 ? 0.55 * (1 - (a.t - 16) / 6) : 0;
      if (a.t === LIFT_IN_END - 4) { G.audio.sfx('land'); G.fx.puff(a.x, a.y, 5); }
      if (a.t >= LIFT_IN_END) { g.liftAnim = null; p.ground = true; }
    }
  };
  W.drawLift = function (ctx, g, s, time) {
    const L = G.sprites.lift, x0 = Math.round(s.x - L.w / 2), y0 = Math.round(s.y - L.h), a = g.liftAnim && g.liftAnim.s && Math.abs(g.liftAnim.s.x - s.x) < 2 && g.liftAnim.y === s.y ? g.liftAnim : null;
    const charge = a ? (a.phase === 'out' ? Math.min(1, a.t / 60) * (a.t > 70 ? Math.max(0, 1 - (a.t - 70) / 8) : 1) : (a.t < 16 ? 0.3 : Math.max(0, 1 - (a.t - 16) / 30))) : 0, pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + s.x * 0.07), fast = 0.5 + 0.5 * Math.sin(time * 11);
    const bx = x0 + (L.bay[0] + L.bay[2]) / 2, by = y0 + (L.bay[1] + L.bay[3]) / 2;
    ctx.globalCompositeOperation = 'lighter';
    W.glow(ctx, Math.round(bx), Math.round(by), 40, '70,200,255', (0.03 + 0.02 * pulse + 0.07 * charge).toFixed(3)); W.glow(ctx, Math.round(bx), Math.round(by), 26, '90,230,255', (0.04 + 0.03 * pulse + 0.1 * charge).toFixed(3));
    ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(L.c, x0, y0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = '#5ae8ff'; ctx.globalAlpha = 0.03 + 0.03 * pulse + 0.2 * charge; ctx.fillRect(x0 + L.bay[0], y0 + L.bay[1], L.bay[2] - L.bay[0] + 1, L.bay[3] - L.bay[1] + 1);              /* the bay hums */
    ctx.fillStyle = '#c8fbff'; ctx.globalAlpha = 0.16 + 0.26 * pulse + 0.45 * charge * (0.6 + 0.4 * fast); for (const [px, py] of L.lights) ctx.fillRect(x0 + px, y0 + py, 1, 1);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  W.drawBack = function (ctx, g, time) {
    for (const d of g.doors) {                                              /* doorways inside the room (they lead to item shrines): a dark arch with pulsing runes */
      if (d.side !== 'I') continue;
      const x = d.tx * T, y = d.ty * T, h = d.h * T, pulse = 0.5 + 0.5 * Math.sin(time * 3 + d.tx);
      if (d.shut) {                                                      /* sealed: a plain stone slab in a riveted frame with a dead red lamp (scenery only: no collision) */
        const lamp = (Math.floor(time * 1.5 + d.tx) & 3) === 0 ? '#ff6a4a' : '#8a2a2a';
        ctx.fillStyle = '#3a4260'; ctx.fillRect(x, y, 16, h); ctx.fillStyle = '#566486'; ctx.fillRect(x, y, 16, 1); ctx.fillRect(x, y, 1, h); ctx.fillStyle = '#242a44'; ctx.fillRect(x + 15, y, 1, h); ctx.fillRect(x, y + h - 1, 16, 1);
        ctx.fillStyle = '#2c3350'; for (let k = 1; k < d.h * 2; k++) ctx.fillRect(x + 1, y + k * 8, 14, 1);
        ctx.fillStyle = '#7a88aa'; ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + 13, y + 2, 1, 1); ctx.fillRect(x + 2, y + h - 3, 1, 1); ctx.fillRect(x + 13, y + h - 3, 1, 1);
        ctx.fillStyle = '#1a1e34'; ctx.fillRect(x + 5, y + (h >> 1) - 3, 6, 6); ctx.fillStyle = lamp; ctx.fillRect(x + 7, y + (h >> 1) - 1, 2, 2);
        continue;
      }
      if (d.h === 1) { ctx.fillStyle = 'rgba(6,8,24,0.8)'; ctx.fillRect(x + 1, y + 1, 14, 15); ctx.fillStyle = 'rgba(134,240,242,' + (0.35 + pulse * 0.4).toFixed(2) + ')'; ctx.fillRect(x, y, 16, 1); ctx.fillRect(x, y, 1, 16); ctx.fillRect(x + 15, y, 1, 16); continue; }
      ctx.fillStyle = 'rgba(6,8,24,0.85)'; ctx.fillRect(x + 1, y + 2, 14, h - 2);
      ctx.fillStyle = '#6a7ca8'; ctx.fillRect(x - 3, y - 2, 22, 4); ctx.fillRect(x - 1, y, 3, h); ctx.fillRect(x + 14, y, 3, h);
      ctx.fillStyle = '#a8bce0'; ctx.fillRect(x - 3, y - 2, 22, 1); ctx.fillRect(x - 1, y, 1, h);
      ctx.fillStyle = '#3a4a78'; ctx.fillRect(x + 16, y, 1, h); ctx.fillRect(x - 3, y + 1, 22, 1);
      ctx.fillStyle = 'rgba(134,240,242,' + (0.45 + pulse * 0.5).toFixed(2) + ')'; ctx.fillRect(x + 2, y - 1, 2, 2); ctx.fillRect(x + 7, y - 1, 2, 2); ctx.fillRect(x + 12, y - 1, 2, 2);
      for (let k = 1; k < d.h; k++) { ctx.fillRect(x - 1, y + k * 16 - 4, 1, 3); ctx.fillRect(x + 16, y + k * 16 - 4, 1, 3); }
    }
    for (const s of g.stations) { if (s.type === 'save') { W.drawCapsule(ctx, g, s, time); continue; } if (s.type === 'lift') { W.drawLift(ctx, g, s, time); continue; } const img = s.type === 'map' ? G.sprites.term[Math.floor(time * 2) & 1] : G.sprites.pad[Math.floor(time * 3) & 1]; ctx.drawImage(img, Math.round(s.x - img.width / 2), Math.round(s.y - img.height)); }
  };
  W.drawFront = function (ctx, g, time) {
    const S = G.sprites;
    for (const d of g.doors) {
      if (d.color === 'open') continue;
      const set = S.door[d.unlocked && d.color !== 'blue' && d.color !== 'boss' ? 'blue' : d.color] || S.door.blue;
      let f = 0;
      if (d.state === 'opening') f = Math.min(4, Math.floor(d.t / 3)); else if (d.state === 'open') f = 4; else if (d.state === 'closing') f = Math.max(0, 4 - Math.floor(d.t / 2.5));
      ctx.drawImage(set[f], d.tx * T, d.ty * T + (d.h - 3) * T);
    }
    for (const it of g.pickups) W.drawItem(ctx, it.type, Math.round(it.x), Math.round(it.y), it.t, Math.round(Math.sin(it.t * 0.08) * 2));
    if (g.near && !g.saveAnim) G.px.text(ctx, (g.near.type === 'lift' && g.near.back ? 'UP: ASCEND' : { save: 'UP: SAVE', map: 'UP: MAP', lift: 'UP: DESCEND' }[g.near.type]), Math.round(g.near.x + (g.near.type === 'save' ? G.sprites.capsule.w / 2 + 4 : g.near.type === 'lift' ? G.sprites.lift.w / 2 + 4 : 0)), Math.round(g.near.y - (g.near.type === 'save' || g.near.type === 'lift' ? 22 : 62)), { s: 1, c: '#f2ffff', o: '#0a0e2c', a: g.near.type === 'save' || g.near.type === 'lift' ? 'l' : 'c' });
    if (g.near && !g.saveAnim && W.canWarp(g)) G.px.text(ctx, 'M: WARP', Math.round(g.near.x + (g.near.type === 'save' ? G.sprites.capsule.w / 2 + 4 : 0)), Math.round(g.near.y - (g.near.type === 'save' ? 12 : 52)), { s: 1, c: '#86f0f2', o: '#0a0e2c', a: g.near.type === 'save' ? 'l' : 'c' });
  };
})((window.SGS = window.SGS || {}));
