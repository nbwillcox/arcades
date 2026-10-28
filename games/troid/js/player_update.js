/* Per-step hero update: input -> mode changes, aim, run/jump/dash, collision, then weapons. */
(function (G) {
  'use strict';
  const P = G.player, PH = G.phys, K = P.K, E = 0.001;
  const approach = (v, t, r) => (v < t ? Math.min(t, v + r) : Math.max(t, v - r));
  function aimFrom(g, p, I) {
    const S = G.settings, M = G.input.mouse;
    p.aimTarget = null;
    const st = G.input.stick;
    if (st) {                                           /* right stick: free 360-degree aim */
      p.aimTarget = { dx: st.x, dy: st.y }; if (Math.abs(st.x) > 0.2) p.face = st.x > 0 ? 1 : -1;
      const ang = Math.atan2(-st.y, Math.abs(st.x));
      return ang > 1.15 ? 'up' : ang > 0.4 ? 'diagUp' : ang < -0.4 ? 'diagDown' : 'fwd';
    }
    const mouseOn = !!(S.mouseAim && M.on && g.cam);                  /* with a mouse the cannon follows the pointer: the Up key no longer aims (it still does with no mouse, as the keyboard fallback) */
    if (mouseOn && !(I.aim && I.d) && (M.fire || performance.now() - M.t < 2500)) {
      const ox = M.x + g.cam.x - p.x, oy = M.y + g.cam.y - (p.y - 28), ang = Math.atan2(-oy, Math.abs(ox));
      if (Math.abs(ox) > 3) p.face = ox > 0 ? 1 : -1;
      p.aimTarget = { wx: M.x + g.cam.x, wy: M.y + g.cam.y };
      return ang > 1.15 ? 'up' : ang > 0.4 ? 'diagUp' : ang < -0.4 ? 'diagDown' : 'fwd';
    }
    if (I.u && !mouseOn) return (I.l || I.r) ? 'diagUp' : 'up';
    if (I.d && !p.ground && (I.l || I.r)) return 'diagDown';
    if (I.aim && I.d) return 'diagDown';
    return 'fwd';
  }
  P.update = function (g) {
    const p = g.P, I = G.input.held, D = G.input.down, room = g.room, A = g.abil;
    if (p.dead) { if (p.dead === 14) { G.fx.boom(p.x, p.y - 20, 26); G.fx.sparkBurst(p.x, p.y - 20, '#ffffff', 14); G.audio.sfx('die'); g.shake = Math.max(g.shake, 9); } p.dead++; return; }
    p.inv = Math.max(0, p.inv - 1); p.hurt = Math.max(0, p.hurt - 1); p.fireCd = Math.max(0, p.fireCd - 1); p.missCd = Math.max(0, (p.missCd || 0) - 1); p.bombCd = Math.max(0, p.bombCd - 1); p.dashCd = Math.max(0, p.dashCd - 1); p.landT = Math.max(0, p.landT - 1); p.spin = Math.max(0, p.spin - 1);
    if (G.grapple.update(g)) { p.anim += 0; G.weapons.playerFire(g, p, G.input.held, G.input.down); return; }
    if (A.scan && D.scan) { p.scanning = !p.scanning; G.audio.sfx(p.scanning ? 'pickup' : 'hit'); }          /* the scan visor is a toggle, not a hold */
    room.scanOn = !!(A.scan && p.scanning);
    const lock = p.hurt > 0, oc = !!(A.spinflip && I.fire && p.charge >= G.weapons.CHARGE.mega);
    const dir = lock ? 0 : (I.r ? 1 : 0) - (I.l ? 1 : 0);
    if (D.jump) p.jbuf = 7; else p.jbuf = Math.max(0, p.jbuf - 1);
    if (p.ground) { p.coyote = 5; p.airJumps = A.spacejump ? 1 : 0; p.dashAir = true; } else p.coyote = Math.max(0, p.coyote - 1);
    /* ---- mode changes: Down crouches, Down again morphs, Up / jump / moving stands ---- */
    p.crouchT++;
    if (!lock && p.mode !== 'ball') {
      if (p.mode === 'stand' && p.ground && D.d && !I.aim) P.setMode(g, p, 'crouch');
      else if (p.mode === 'crouch' && D.d && p.crouchT > 6 && A.morph) P.setMode(g, p, 'ball');
      else if (p.mode === 'crouch' && (D.u || p.jbuf > 0 || dir || !p.ground)) P.setMode(g, p, 'stand');
    } else if (!lock && p.mode === 'ball' && (D.u || (p.jbuf > 0 && p.ground)) && P.fits(g, p, 'stand')) { P.setMode(g, p, 'stand'); p.jbuf = 0; }
    const ball = p.mode === 'ball';
    /* ---- aim + facing ---- */
    p.aim = ball ? 'fwd' : aimFrom(g, p, I);
    p.aimAng = null;                                         /* exact aim angle (mouse / stick); the sprite snaps to the nearest pose */
    if (!ball && p.aimTarget) { const m = P.muzzle(p), t = p.aimTarget; const dx = t.wx !== undefined ? t.wx - m.x : t.dx, dy = t.wy !== undefined ? t.wy - m.y : t.dy; if (Math.hypot(dx, dy) > 6) p.aimAng = Math.atan2(dy, dx); }
    /* facing: with a mouse or stick aim the body faces the aim side (the cannon arm always points where the shot goes) and may walk the other way, legs backpedalling;
       with the keyboard alone it faces the way it moves, like Super Metroid */
    const aimed = !ball && p.aimAng !== null;
    if (aimed) { if (Math.abs(Math.cos(p.aimAng)) > 0.05) p.face = Math.cos(p.aimAng) > 0 ? 1 : -1; }
    else if (dir && !(I.aim && !ball)) p.face = dir; else if (I.aim && !ball && (I.l || I.r)) p.face = I.r ? 1 : -1;
    p.back = !!(aimed && dir && dir !== p.face && !(I.aim && !ball));
    /* ---- horizontal ---- */
    const moving = dir && !(I.aim && !ball);
    const sprint = I.dash && p.ground && p.mode === 'stand';   /* holding Shift always sprints; the tap-dash burst is the gated upgrade */
    const wet = G.room.at(room, Math.floor(p.x / 16), Math.floor((p.y - p.h * 0.4) / 16)) === 14, aqua = !!A.suitAqua;
    if (wet && !p.wasWet) { G.fx.puff(p.x, p.y - 10, 5); G.audio.sfx('land'); } p.wasWet = wet;
    if (wet && room.def.pressure && !aqua) { p.pt = (p.pt || 0) + 1; if (p.pt === 1 && !g.toast) g.toast = { txt: 'CRUSHING PRESSURE: AQUA SUIT NEEDED', t: 0 }; if (p.pt % 30 === 0) { p.en -= 4; G.audio.sfx('hurt'); if (p.en <= 0) { p.en = 0; p.dead = 1; } } } else p.pt = 0;
    let top = ball ? K.ball : sprint ? K.run : K.walk; if (wet) top *= aqua ? 0.92 : 0.55;
    const slick = p.ground && G.room.at(room, Math.floor(p.x / 16), Math.floor((p.y + 1) / 16)) === 10;   /* ice floor: slow to start, slow to stop */
    if (p.dash > 0) { p.dash--; p.vx = (p.dashDir || p.face) * K.dash; p.vy = 0; if (!p.dash) p.dashCd = 22; }
    else if (moving) p.vx = approach(p.vx, dir * top, p.ground ? (Math.sign(p.vx) === -dir ? K.dec : K.acc) * (slick ? 0.3 : 1) : (Math.abs(p.vx) > top && Math.sign(p.vx) === dir ? 0.02 : K.airAcc));
    else p.vx = approach(p.vx, 0, p.ground ? K.dec * (slick ? 0.12 : 1) : K.airDec);
    if (A.dash && D.dash && p.dashCd === 0 && p.mode === 'stand' && !lock && p.dash === 0 && !I.d && (p.ground || p.dashAir)) { p.dash = 11; p.dashDir = dir || p.face; if (!p.ground) p.dashAir = false; G.fx.puff(p.x - p.dashDir * 6, p.y - 4, 4); }
    /* ---- jump (coyote + buffer), space jump, variable height, drop through ledges ---- */
    if (!lock && p.mode === 'stand' && p.jbuf > 0) {
      if (p.dash > 0 && (p.coyote > 0 || (p.airJumps > 0 && A.spacejump))) { p.vx = (p.dashDir || p.face) * K.dash; p.dash = 0; p.dashCd = 10; }
      if (p.ground && I.d && PH.support(room, p, p.y - E, p.y + 1, true) === null) { p.drop = true; p.ground = false; p.y += 1; p.jbuf = 0; p.coyote = 0; }
      else if (p.coyote > 0) {
        if (p.dash > 0) { p.vx = (p.dashDir || p.face) * K.dash; p.dash = 0; p.dashCd = 10; }
        p.vy = -K.jump; p.jbuf = 0; p.coyote = 0; p.ground = false; G.audio.sfx('jump'); p.jumping = true;
        p.spinning = (Math.abs(p.vx) > 0.8 || dir !== 0) && !I.u && (!I.fire || oc); p.spinT = 0; p.noSpin = false;
      }
      else if (!p.ground && p.airJumps > 0 && A.spacejump) { p.vy = -K.airJump; p.airJumps--; p.jbuf = 0; p.spin = 16; p.jumping = true; if (!p.noSpin) { p.spinning = true; p.spinT = 0; } G.fx.ring(p.x, p.y - 16); G.audio.sfx('spacejump'); }
    }
    if (p.ground || p.vy >= 0) p.jumping = false;
    if (!I.jump && p.jumping && p.vy < -K.cut && !p.dash && !lock) p.vy = -K.cut;
    if (p.ground || ball || lock || p.mode !== 'stand') { p.spinning = false; p.noSpin = false; }
    else if (p.spinning && ((I.fire && !oc) || I.u || D.missile)) { p.spinning = false; p.noSpin = true; }
    p.spinAtk = !!(p.spinning && oc && !p.ground && p.mode === 'stand' && !lock);            /* overcharged and flipping with Fire held: the spinflip attack */
    if (p.spinning) p.spinT += p.spinAtk ? 1.8 : 1;
    /* ---- gravity + collision ---- */
    if (wet && D.jump && p.swimCd === 0 && !ball && !lock) { p.vy = aqua ? -4.4 : -2.6; p.swimCd = aqua ? 9 : 15; p.jbuf = 0; p.ground = false; G.fx.puff(p.x, p.y - 20, 2); }
    p.swimCd = Math.max(0, (p.swimCd || 0) - 1);
    if (!p.dash) p.vy = Math.min(wet ? (aqua ? 3 : 1.8) : K.fall, p.vy + (wet ? (aqua ? 0.2 : 0.12) : K.g));
    const wasAir = !p.ground, vyBefore = p.vy;
    PH.moveX(room, p, p.vx);
    p.ground = p.ground && PH.onGround(room, p, p.drop);
    PH.moveY(room, p, p.vy, p.drop);
    if (p.ground && wasAir && vyBefore > 2) { p.landT = 6; G.fx.puff(p.x, p.y, 3); }
    if (p.ground || (p.drop && PH.support(room, p, p.y - 10, p.y + 2, false) === null && p.vy > 1)) p.drop = false;
    const an0 = Math.floor(p.anim * 0.4); p.anim += Math.abs(p.vx) * (ball ? 0.16 : 0.12); if (ball) p.ballRot = (p.ballRot || 0) + p.vx * 0.32;      /* the ball turns with the ground: 8 frames per half turn, 22.5 degrees each, clockwise when rolling right */
    if (p.ground && !ball && Math.abs(p.vx) > 0.6 && Math.floor(p.anim * 0.4) !== an0 && p.mode === 'stand') G.audio.sfx('step');
    if (p.ground && !ball && Math.abs(p.vx) < 0.25 && p.anim > 0) {          /* stopping: the feet glide from wherever the stride stopped to the stand over six ticks (and every run starts from the same stride) */
      p.settle = (p.settle || 0) + 1; if (p.settle === 1) p.settleI = Math.floor(p.anim * 1.6) % 8;
      if (p.settle > 6) { p.anim = 0; p.settle = 0; }
    } else p.settle = 0;
    /* lava: with the heat suit it is a slow, swimmable fluid; without it, it burns and throws you out */
    if (PH.boxTiles(room, p.x - p.w / 2, p.y - Math.min(p.h, 12), p.x + p.w / 2, p.y - 0.01, 11)) {
      if (A.suitHeat) { p.inLava = true; p.vx *= 0.9; p.vy = Math.min(p.vy, 1.6); if (I.jump && !lock) p.vy = -2.2; }
      else if (P.hurt(g, p, 30, p.x + (Math.random() - 0.5))) { p.vy = -6.5; G.audio.sfx('hurt'); }
    } else p.inLava = false;
    G.weapons.playerFire(g, p, I, D);
  };
})((window.SGS = window.SGS || {}));
