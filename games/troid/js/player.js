/* The hero: movement state machine (stand / crouch / morph ball), jump + space jump + dash, aim, damage. Positions: x = centre, y = feet. */
(function (G) {
  'use strict';
  const PH = G.phys, U = G.U, E = 0.001;
  const P = {};
  G.player = P;
  const SZ = { stand: [14, 42], crouch: [14, 26], ball: [16, 15] };
  const K = { walk: 1.7, run: 2.5, acc: 0.22, dec: 0.38, airAcc: 0.16, airDec: 0.04, g: 0.3, fall: 6.6, jump: 6.1, cut: 2.2, airJump: 5.0, dash: 4.4, ball: 1.9 };
  P.K = K;
  P.create = function (x, y) {
    return { x, y, w: 14, h: 42, vx: 0, vy: 0, ground: false, face: 1, mode: 'stand', anim: 0, aim: 'fwd', coyote: 0, jbuf: 0, airJumps: 1, dash: 0, dashCd: 0, dashAir: true, inv: 0, hurt: 0, en: 99, tanks: 0, missiles: 5, missileMax: 5, sbombs: 0, sbombMax: 0, supers: 0, superMax: 0, sel: 0, charge: 0, fireCd: 0, held: 0, bombCd: 0, crouchT: 0, dead: 0, spin: 0, drop: false, landT: 0, suit: 'cobalt' };
  };
  P.enMax = (p) => 99 + 100 * p.tanks;
  P.fits = (g, p, mode) => { const [w, h] = SZ[mode]; return !PH.boxSolid(g.room, p.x - w / 2, p.y - h, p.x + w / 2, p.y - E); };
  P.setMode = function (g, p, mode) {
    if (p.mode === mode) return true;
    if (!P.fits(g, p, mode)) {
      /* squeezed against a wall (a 16px ball beside a 14px body): slide up to 4px sideways to find room */
      const x0 = p.x; let ok = false;
      for (const d of [1, -1, 2, -2, 3, -3, 4, -4]) { p.x = x0 + d; if (P.fits(g, p, mode) && !PH.boxSolid(g.room, p.x - SZ[p.mode][0] / 2, p.y - SZ[p.mode][1], p.x + SZ[p.mode][0] / 2, p.y - E)) { ok = true; break; } p.x = x0; }
      if (!ok) { p.x = x0; return false; }
    }
    p.mode = mode; p.w = SZ[mode][0]; p.h = SZ[mode][1]; p.crouchT = 0;
    return true;
  };
  /* pose: a painted torso (chosen by the aim angle) on a leg pose (chosen by what the legs are doing), plus a small torso offset (lean, breathing).
     Shared by drawing and the muzzle, so the shot always leaves the cannon tip. e = aim elevation in degrees (up positive) */
  const AIM = []; for (let i = 0; i < 25; i++) AIM.push(['r' + i, 90 - 7.5 * i]);                  /* the cannon arm at 25 angles, 90 down to -90 */
  const nearest = (list, e) => { let n = list[0][0], bd = 1e9; for (const [k, a] of list) { const d = Math.abs(a - e); if (d < bd) { bd = d; n = k; } } return n; };
  P.elev = function (p) {
    let e = p.aim === 'up' ? 90 : p.aim === 'diagUp' ? 45 : p.aim === 'diagDown' ? -45 : 0;
    if (p.aimAng !== null && p.aimAng !== undefined) e = Math.atan2(-Math.sin(p.aimAng), Math.abs(Math.cos(p.aimAng))) * 180 / Math.PI;
    return e;
  };
  P.pose = function (p) {
    if (G.game && G.game.getAnim) return { tor: 'r0', leg: 'idle', ox: 0, oy: 0 };                      /* victory stance: cannon arm raised */
    const e = P.elev(p), sp = Math.abs(p.vx), t = G.game ? G.game.time : 0, tor = nearest(AIM, e);
    if (p.mode === 'crouch') return { tor, leg: 'crouch', ox: 2, oy: 0 };
    if (p.hurt > 0 && !p.dead) return p.ground ? { tor, leg: 'skid', ox: -2, oy: 0 } : { tor, leg: 'fall', ox: -1, oy: 0 };       /* knocked back */
    if (!p.ground) return { tor, leg: p.vy < -3.5 ? 'rise' : p.vy < 1.2 ? 'apex' : 'fall', ox: p.vx ? p.face * Math.sign(p.vx) : 0, oy: p.vy < -3.5 ? -1 : 0 };
    if (p.landT > 0) return { tor, leg: p.landT > 4 ? 'land2' : p.landT > 2 ? 'land1' : 'idle', ox: 1, oy: 0 };
    if (sp > 0.25) {
      if (Math.sign(p.vx) !== p.face && sp > 1.0 && !p.back) return { tor, leg: 'skid', ox: -2, oy: 0 };          /* skidding round */
      const i = p.back ? (8 - Math.floor(p.anim * 1.6) % 8) % 8 : Math.floor(p.anim * 1.6) % 8;                   /* walking backwards (facing the aim, moving the other way): the stride plays in reverse */
      return { tor, leg: (sp < 0.7 ? 'a' : sp < 1.1 ? 'b' : sp < 1.5 ? 'c' : sp < 2.1 ? 'd' : 'e') + i, ox: p.back ? 0 : sp > 2.1 ? 2 : 1, oy: 0 };
    }
    if (p.anim > 0) return { tor, leg: 's' + (p.settle > 4 ? 3 : p.settle > 2 ? 2 : 1) + '_' + (p.settleI || 0), ox: p.settle > 4 ? 0 : 1, oy: 0 };      /* the feet glide in to the stand */
    return { tor, leg: 'idle', ox: 0, oy: Math.floor(t / 50) & 1 };                                      /* breathing moves the torso only */
  };
  P.muzzle = function (p) {
    const f = p.face;
    if (p.mode === 'ball') return { x: p.x + 17 * f, y: p.y - 8 };
    if (p.spinning && !p.ground) return { x: p.x + 14 * f, y: p.y - 22 };
    const q = P.pose(p), SP = G.sprites.heroSpec, T = SP['tor_' + q.tor], g = SP['leg_' + q.leg].g;
    return { x: p.x + f * (T.tx + q.ox), y: p.y + T.ty + q.oy - g };
  };
  P.aimVec = function (p) {
    if (p.aimAng !== null && p.aimAng !== undefined) return { x: Math.cos(p.aimAng), y: Math.sin(p.aimAng) };
    const f = p.face, r = Math.SQRT1_2;
    return p.aim === 'up' ? { x: 0, y: -1 } : p.aim === 'diagUp' ? { x: f * r, y: -r } : p.aim === 'diagDown' ? { x: f * r, y: r } : { x: f, y: 0 };
  };
  P.hurt = function (g, p, dmg, fromX) {
    if (p.inv > 0 || p.dead || p.spinAtk || p.dash > 0) return false;                       /* the spinflip and the dash are armoured by their own energy */
    if (G.settings.hard) dmg = Math.round(dmg * 1.6);
    p.en -= dmg; p.inv = 75; p.hurt = 14; p.charge = 0;
    const d = p.x >= fromX ? 1 : -1;
    p.vx = 2.4 * d; p.vy = -3; p.ground = false; p.dash = 0;
    g.shake = Math.max(g.shake, 5); g.hitStop = 5;
    if (p.en <= 0) { p.en = 0; p.dead = 1; p.vx = 0; }
    return true;
  };
  /* which sprite frame to draw */
  P.frame = function (p) {
    const H = G.sprites.hero[p.suit || 'cobalt'];
    if (G.game && G.game.getAnim) return G.sprites.heroPose(p.suit || 'cobalt', 'r0', 'idle', 0, 0);
    if (p.mode === 'ball') return H['ball' + ((Math.floor(p.ballRot || 0) % 8 + 8) % 8)];          /* spins the way it rolls (the sprite is never mirrored) */
    if (p.spinning && !p.ground) return H['spin' + (Math.floor(p.spinT / 2.4) & 7)];
    if (G.game && (G.game.saveAnim || G.game.liftAnim)) return H.front;
    const q = P.pose(p); return G.sprites.heroPose(p.suit || 'cobalt', q.tor, q.leg, q.ox, q.oy);
  };
})((window.SGS = window.SGS || {}));
