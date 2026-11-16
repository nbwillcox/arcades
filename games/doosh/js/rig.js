// Stick Doosh - rig.js (core): procedural comic stick figures, poses, PROPS + GUNS registries.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U;
  const INK = '#141018';
  const DEFAULT_LOOK = { limb: '#ff3b3b', head: '#ffffff', ink: INK, scale: 1, headR: 7, thick: 3.2, body: 'stick', face: 'grin', props: [] };
  const TWO_HANDED = { shotgun: 1, mg: 1, rocket: 1, flame: 1, laser: 1, spread: 1 };
  const GUN_LEN = { pistol: 10, dual: 10, shotgun: 17, mg: 19, rocket: 15, flame: 15, laser: 16, spread: 15, none: 4 };
  const darkCache = {};

  function P(a, L) { return { x: Math.sin(a) * L, y: Math.cos(a) * L }; }
  function dark(c) { return darkCache[c] || (darkCache[c] = U.shade(c, -0.28)); }

  function aimAngle(aim) { return aim === 'up' ? Math.PI * 0.97 : aim === 'down' ? 0.06 : Math.PI / 2; }
  function aimDir(aim, f) { return aim === 'up' ? { x: 0, y: -1 } : aim === 'down' ? { x: 0, y: 1 } : { x: f, y: 0 }; }
  // aim: shoulder height above the feet (idle pose) - the pivot the 360-degree aim is measured from
  function shoulderH(look) { const s = (look && look.scale) || 1; return ((look && look.body === 'tiny') ? 18.6 : 24.4) * s; }

  function poseParams(st, groundY) {
    const t = st.t || 0, pose = st.pose || 'idle';
    const p = { lean: 0, bob: 0, aF: 0.12, bF: 0.1, aB: -0.12, bB: 0.1, arms: 'aim', air: false, swing: 0 };
    switch (pose) {
      case 'idle': p.bob = Math.sin(t * 3) * 0.6; break;
      case 'run': {
        const ph = t * 14;
        p.aF = Math.sin(ph) * 0.85; p.aB = -Math.sin(ph) * 0.85;
        p.bF = 0.25 + Math.max(0, Math.cos(ph)) * 1.25; p.bB = 0.25 + Math.max(0, -Math.cos(ph)) * 1.25;
        p.lean = 0.16; p.bob = -Math.abs(Math.sin(ph)) * 1.6; p.swing = Math.sin(ph);
        break;
      }
      case 'jump': p.aF = 0.75; p.bF = 1.35; p.aB = -0.15; p.bB = 1.0; p.lean = 0.05; p.air = true; break;
      case 'fall': p.aF = 0.3 + Math.sin(t * 16) * 0.15; p.bF = 0.5; p.aB = -0.4; p.bB = 0.35; p.air = true; break;
      case 'crouch': p.aF = 0.95; p.bF = 1.95; p.aB = -0.25; p.bB = 1.6; p.lean = 0.28; break;
      case 'climb': { const ph = t * 10; p.aF = 0.35 + Math.sin(ph) * 0.35; p.bF = 0.9 + Math.sin(ph) * 0.5; p.aB = 0.35 - Math.sin(ph) * 0.35; p.bB = 0.9 - Math.sin(ph) * 0.5; p.arms = 'climb'; p.air = true; break; }
      case 'wall': { const ph = t * 18; p.aF = 0.8 + Math.sin(ph) * 0.5; p.bF = 1.4; p.aB = 0.5 - Math.sin(ph) * 0.5; p.bB = 1.2; p.arms = 'wall'; p.lean = 0.15; p.air = true; break; }
      case 'hurt': p.lean = -0.45; p.aF = 0.5; p.bF = 0.6; p.aB = -0.5; p.bB = 0.4; p.arms = 'flail'; break;
      case 'melee': p.lean = 0.25; p.aF = 0.5; p.bF = 0.35; p.aB = -0.5; p.bB = 0.25; p.arms = 'melee'; break;
      case 'swim': { const ph = t * 8; p.lean = 0.95; p.aF = Math.sin(ph) * 0.5 - 0.3; p.bF = 0.3; p.aB = -Math.sin(ph) * 0.5 - 0.3; p.bB = 0.3; p.arms = 'swim'; p.air = true; break; }
      case 'wave': p.bob = Math.sin(t * 6) * 1.2; p.arms = 'wave'; break;
      case 'float': p.aF = 0.4 + Math.sin(t * 2) * 0.3; p.bF = 0.6; p.aB = -0.3 + Math.sin(t * 2.3) * 0.3; p.bB = 0.5; p.arms = 'float'; p.air = true; break;
      case 'panic': { const ph = t * 18; p.aF = Math.sin(ph) * 0.9; p.aB = -Math.sin(ph) * 0.9; p.bF = 0.3 + Math.max(0, Math.cos(ph)) * 1.2; p.bB = 0.3 + Math.max(0, -Math.cos(ph)) * 1.2; p.lean = 0.1; p.arms = 'flail'; p.bob = -Math.abs(Math.sin(ph)) * 2; break; }
      case 'dead': p.arms = 'flail'; break;
      default: break;
    }
    if (st.arms) p.arms = st.arms;
    return p;
  }

  // two-bone IK: returns elbow position; bends "down" (positive y) by default
  function ik(sx, sy, tx, ty, l1, l2, bend) {
    let dx = tx - sx, dy = ty - sy;
    let d = Math.hypot(dx, dy);
    const maxd = l1 + l2 - 0.01;
    if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
    if (d < 0.01) d = 0.01;
    const a = Math.acos(U.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const base = Math.atan2(dy, dx);
    const ang = base + (bend || 1) * a;
    return { x: sx + Math.cos(ang) * l1, y: sy + Math.sin(ang) * l1, hx: sx + dx, hy: sy + dy };
  }

  function joints(st, x, y) {
    x = x || 0; y = y || 0;
    const L = st.look || DEFAULT_LOOK;
    const s = L.scale || 1;
    const f = st.facing || 1;
    const body = L.body || 'stick';
    const t = st.t || 0;
    let thigh = 7.5 * s, shin = 7.5 * s, torso = 12 * s, upper = 6.5 * s, fore = 6.5 * s;
    if (body === 'tiny') { thigh = shin = 5.8 * s; torso = 9.5 * s; upper = fore = 5.5 * s; }
    if (body === 'fat') { torso = 11 * s; }
    const big = st.bigHead || (S.Game && S.Game.bigHeads);
    const headR = (L.headR || 7) * s * (big ? 1.75 : 1);
    const p = poseParams(st);
    let lean = p.lean + (body === 'hunch' ? 0.38 : 0);
    if (st.recoil) lean -= st.recoil * 0.18;
    // aim: st.aimAng (world radians, 0 = right, up = -PI/2) -> local arm angle (from straight down, local +x = forward); legacy st.aim for enemies
    let aimLx = 1, aimLy = 0, aimWx = f, aimWy = 0, gunAng0 = null;
    if (st.aimAng != null) {
      aimWx = Math.cos(st.aimAng); aimWy = Math.sin(st.aimAng); aimLx = aimWx * f; aimLy = aimWy;
      gunAng0 = Math.atan2(aimLx, aimLy);
      if (p.arms === 'aim') lean += aimLy * 0.14; // lean back when aiming up, forward when aiming down
    } else { const ad0 = aimDir(st.aim, f); aimWx = ad0.x; aimWy = ad0.y; aimLx = ad0.x * f; aimLy = ad0.y; }
    // legs in local space (x forward), hip at origin
    const leg = (a, b) => { const k = P(a, thigh); const ft = P(a - b, shin); return { k, f: { x: k.x + ft.x, y: k.y + ft.y } }; };
    const lF = leg(p.aF, p.bF), lB = leg(p.aB, p.bB);
    const hipY = p.air ? -(thigh + shin) * 0.92 : -Math.max(lF.f.y, lB.f.y);
    const hip = { x: 0, y: hipY + p.bob * s };
    const neck = { x: hip.x + Math.sin(lean) * torso, y: hip.y - Math.cos(lean) * torso };
    const head = { x: neck.x + Math.sin(lean) * (headR + 1), y: neck.y - Math.cos(lean) * (headR + 1), r: headR };
    const sh = { x: neck.x - Math.sin(lean) * 2.5 * s, y: neck.y + Math.cos(lean) * 2.5 * s };
    // arms
    let elF, hF, elB, hB, gunAng = gunAng0 != null ? gunAng0 : aimAngle(st.aim), showGun = !!st.gun && st.gun !== 'none';
    const twoH = TWO_HANDED[st.gun];
    const arm = (a1, a2) => { const e = P(a1, upper); const h = P(a2, fore); return { e: { x: sh.x + e.x, y: sh.y + e.y }, h: { x: sh.x + e.x + h.x, y: sh.y + e.y + h.y } }; };
    const rec = (st.recoil || 0) * 3.5 * s;
    switch (p.arms) {
      case 'aim': case 'melee': {
        let a = gunAng;
        if (p.arms === 'melee') { const m = st.meleeT == null ? 0.5 : st.meleeT; a = U.lerp(0.9, 1.75, Math.min(1, m * 2.2)); gunAng = a; }
        const r1 = arm(a - 0.3, a + 0.04);
        const d = P(a, 1);
        elF = r1.e; hF = { x: r1.h.x - d.x * rec, y: r1.h.y - d.y * rec };
        if (twoH || st.gun === 'dual') {
          const grip = st.gun === 'dual' ? 0 : (st.gun === 'rocket' ? -2 : 7) * s;
          const tx = hF.x + d.x * grip + (st.gun === 'dual' ? -2 * s : 0), ty = hF.y + d.y * grip + (st.gun === 'dual' ? 2 * s : 0);
          const k = ik(sh.x - 1.5 * s, sh.y + 0.5 * s, tx, ty, upper, fore, 1);
          elB = { x: k.x, y: k.y }; hB = { x: k.hx, y: k.hy };
        } else {
          const r2 = arm(0.25 - p.swing * 0.7, 0.55 - p.swing * 0.5); elB = r2.e; hB = r2.h;
        }
        break;
      }
      case 'climb': { const w = Math.sin(t * 10) * 0.35; const r1 = arm(Math.PI * 0.85 + w, Math.PI * 0.95 + w); const r2 = arm(Math.PI * 0.85 - w, Math.PI * 0.95 - w); elF = r1.e; hF = r1.h; elB = r2.e; hB = r2.h; showGun = false; break; }
      case 'wall': { const w = Math.sin(t * 18) * 0.3; const r1 = arm(2.1 + w, 2.5 + w); const r2 = arm(2.2 - w, 2.7 - w); elF = r1.e; hF = r1.h; elB = r2.e; hB = r2.h; showGun = false; break; }
      case 'flail': { const w = Math.sin(t * 22) * 0.5; const r1 = arm(2.5 + w, 2.9 + w); const r2 = arm(-2.4 - w, -2.9 - w); elF = r1.e; hF = r1.h; elB = r2.e; hB = r2.h; showGun = showGun && st.pose !== 'dead'; break; }
      case 'swim': { const w = t * 8; const r1 = arm(1.6 + Math.sin(w) * 0.9, 1.7 + Math.sin(w) * 0.9); const r2 = arm(1.6 - Math.sin(w) * 0.9, 1.7 - Math.sin(w) * 0.9); elF = r1.e; hF = r1.h; elB = r2.e; hB = r2.h; showGun = false; break; }
      case 'wave': { const w = Math.sin(t * 12) * 0.35; const r1 = arm(2.6, 2.9 + w); const r2 = arm(-2.5, -2.8 - w); elF = r1.e; hF = r1.h; elB = r2.e; hB = r2.h; showGun = false; break; }
      case 'float': { const w = Math.sin(t * 2) * 0.3; const r1 = arm(1.9 + w, 2.3 + w); const r2 = arm(-1.9 - w, -2.3 - w); elF = r1.e; hF = r1.h; elB = r2.e; hB = r2.h; break; }
      default: { const r1 = arm(0.2, 0.3); const r2 = arm(-0.2, -0.1); elF = r1.e; hF = r1.h; elB = r2.e; hB = r2.h; }
    }
    // muzzle
    const gl = (GUN_LEN[st.gun] || 10) * s;
    const ad = P(gunAng, 1);
    // the barrel sits slightly on the gun's "top" side (perpendicular to the aim; flips when the gun points backwards)
    const topK = (ad.x < -0.02 ? -1 : 1) * (st.gun === 'rocket' ? 2 * s : 1 * s);
    const muzzle = { x: hF.x + ad.x * gl + Math.cos(gunAng) * topK, y: hF.y + ad.y * gl - Math.sin(gunAng) * topK };
    // to world space with facing
    const W = (pt) => ({ x: x + pt.x * f, y: y + pt.y });
    const J = {
      f, s, t, lean, body, look: L, st,
      hip: W(hip), neck: W(neck), sh: W(sh),
      head: { x: x + head.x * f, y: y + head.y, r: headR },
      kneeF: W({ x: hip.x + lF.k.x, y: hip.y + lF.k.y }), footF: W({ x: hip.x + lF.f.x, y: hip.y + lF.f.y }),
      kneeB: W({ x: hip.x + lB.k.x, y: hip.y + lB.k.y }), footB: W({ x: hip.x + lB.f.x, y: hip.y + lB.f.y }),
      elbowF: W(elF), handF: W(hF), elbowB: W(elB), handB: W(hB),
      muzzle: W(muzzle), gunAng, showGun, arms: p.arms, aimDir: { x: aimWx, y: aimWy }, lookX: aimLx, lookY: aimLy,
    };
    return J;
  }

  function seg(ctx, pts, w, color) {
    ctx.strokeStyle = color; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  function drawFace(ctx, J, face) {
    const h0 = J.head, r = h0.r, f = J.f;
    // aim: head looks along the aim (face slides up/down a little, tilts back when aiming up)
    const lk = J.lookY || 0, hx = h0.x - f * Math.max(0, -lk) * r * 0.16, hy = h0.y + lk * r * 0.2;
    const ex1 = hx + f * r * 0.22, ex2 = hx + f * r * 0.62, ey = hy - r * 0.15;
    ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineCap = 'round';
    const lw = Math.max(1, r * 0.16);
    ctx.lineWidth = lw;
    if (face === 'dead') {
      const e = r * 0.16;
      ctx.beginPath();
      for (const ex of [ex1, ex2]) { ctx.moveTo(ex - e, ey - e); ctx.lineTo(ex + e, ey + e); ctx.moveTo(ex + e, ey - e); ctx.lineTo(ex - e, ey + e); }
      ctx.stroke(); return;
    }
    if (face === 'scared') {
      ctx.fillStyle = '#fff';
      for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.arc(ex, ey, r * 0.2, 0, U.TAU); ctx.fill(); ctx.stroke(); }
      ctx.fillStyle = INK; for (const ex of [ex1, ex2]) { ctx.beginPath(); ctx.arc(ex + f * r * 0.04, ey, r * 0.08, 0, U.TAU); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(hx + f * r * 0.45, hy + r * 0.45, r * 0.15, r * 0.2, 0, 0, U.TAU); ctx.fill();
      return;
    }
    if (face === 'old') {
      ctx.beginPath(); for (const ex of [ex1, ex2]) { ctx.moveTo(ex - r * 0.13, ey); ctx.lineTo(ex + r * 0.13, ey); } ctx.stroke();
    } else if (face === 'derp') {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex1, ey, r * 0.22, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(ex2, ey - r * 0.05, r * 0.14, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(ex1 + f * r * 0.06, ey + r * 0.06, r * 0.09, 0, U.TAU); ctx.arc(ex2 - f * r * 0.03, ey - r * 0.08, r * 0.06, 0, U.TAU); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(ex1, ey, r * 0.11, 0, U.TAU); ctx.arc(ex2, ey, r * 0.11, 0, U.TAU); ctx.fill();
    }
    if (face === 'angry') {
      ctx.beginPath();
      ctx.moveTo(ex1 - f * r * 0.15, ey - r * 0.32); ctx.lineTo(ex1 + f * r * 0.15, ey - r * 0.2);
      ctx.moveTo(ex2 - f * r * 0.12, ey - r * 0.2); ctx.lineTo(ex2 + f * r * 0.18, ey - r * 0.36);
      ctx.stroke();
    }
    // mouth
    const mx = hx + f * r * 0.45, my = hy + r * 0.38;
    if (J.st.yell || face === 'yell') {
      ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(mx, my, r * 0.2, r * 0.17, 0, 0, U.TAU); ctx.fill();
      ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.ellipse(mx, my + r * 0.07, r * 0.11, r * 0.07, 0, 0, U.TAU); ctx.fill();
    } else if (face === 'angry') {
      ctx.beginPath(); ctx.moveTo(mx - r * 0.22, my + r * 0.05); ctx.lineTo(mx + r * 0.22, my - r * 0.03); ctx.stroke();
    } else if (face === 'derp') {
      ctx.beginPath(); ctx.arc(mx, my - r * 0.05, r * 0.22, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#ff6b8a'; ctx.beginPath(); ctx.ellipse(mx + f * r * 0.08, my + r * 0.18, r * 0.09, r * 0.13, 0, 0, U.TAU); ctx.fill(); ctx.lineWidth = 1; ctx.stroke();
    } else if (face === 'old') {
      ctx.beginPath(); ctx.moveTo(mx - r * 0.22, my); ctx.quadraticCurveTo(mx, my - r * 0.1, mx + r * 0.22, my); ctx.stroke();
    } else { // grin
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.moveTo(mx - r * 0.25, my - r * 0.06); ctx.quadraticCurveTo(mx, my + r * 0.34, mx + r * 0.27, my - r * 0.1); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
  }

  function drawGun(ctx, J, gun, hand, alt) {
    const fn = Rig.GUNS[gun]; if (!fn) return;
    ctx.save();
    ctx.translate(hand.x, hand.y);
    const a = J.gunAng; // aim: angle from straight down (local space, forward = PI/2); barrel direction = (sin a, cos a)
    ctx.scale(J.f, 1);
    ctx.rotate(Math.PI / 2 - a);
    if (Math.sin(a) < -0.02) ctx.scale(1, -1); // gun pointing behind the dude: keep the top of the gun up
    ctx.scale(J.s, J.s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    fn(ctx, J, J.st, alt);
    ctx.restore();
  }

  function draw(ctx, x, y, st) {
    const L = st.look || DEFAULT_LOOK;
    if (st.pose === 'dead') {
      ctx.save(); ctx.translate(x, y - 3); ctx.rotate(-Math.PI / 2 * (st.facing || 1)); ctx.translate(-x, -(y - 3));
    }
    const J = joints(st, x, y);
    const s = J.s;
    const thick = (L.thick || 3.2) * s;
    const inkW = thick + 2.6 * s;
    const white = st.flash > 0.5;
    const limb = white ? '#ffffff' : (st.tint || L.limb);
    const limbD = white ? '#ffffff' : dark(st.tint || L.limb);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const props = L.props || [];
    // back-layer props
    for (const n of props) { const pr = Rig.PROPS[n]; if (pr && pr.back) pr.back(ctx, J, L, st); }
    // back arm + back leg
    seg(ctx, [J.sh, J.elbowB, J.handB], inkW, INK); seg(ctx, [J.sh, J.elbowB, J.handB], thick, limbD);
    seg(ctx, [J.hip, J.kneeB, J.footB], inkW, INK); seg(ctx, [J.hip, J.kneeB, J.footB], thick, limbD);
    // torso
    const tw = L.body === 'muscle' ? thick * 1.9 : thick * 1.15;
    if (L.body === 'fat') {
      const cx = (J.hip.x + J.neck.x) / 2 + J.f * 2 * s, cy = (J.hip.y + J.neck.y) / 2 + 1;
      ctx.beginPath(); ctx.ellipse(cx, cy, 8 * s, 8.5 * s, J.lean * J.f, 0, U.TAU);
      ctx.fillStyle = limb; ctx.fill(); ctx.lineWidth = 2.4 * s; ctx.strokeStyle = INK; ctx.stroke();
    } else {
      seg(ctx, [J.hip, J.neck], tw + 2.6 * s, INK); seg(ctx, [J.hip, J.neck], tw, limb);
    }
    // front leg
    seg(ctx, [J.hip, J.kneeF, J.footF], inkW, INK); seg(ctx, [J.hip, J.kneeF, J.footF], thick, limb);
    // head
    const hd = J.head;
    ctx.beginPath(); ctx.arc(hd.x, hd.y, hd.r, 0, U.TAU);
    ctx.fillStyle = white ? '#ffffff' : (L.head || '#fff'); ctx.fill();
    ctx.lineWidth = Math.max(1.6, 2.1 * s); ctx.strokeStyle = INK; ctx.stroke();
    if (!white) drawFace(ctx, J, st.face || (st.pose === 'hurt' ? 'scared' : L.face));
    // head props
    for (const n of props) { const pr = Rig.PROPS[n]; if (typeof pr === 'function') pr(ctx, J, L, st); else if (pr && pr.front) pr.front(ctx, J, L, st); }
    if (S.Game && S.Game.partyHats && props.indexOf('partyHat') < 0 && Rig.PROPS.partyHat) Rig.PROPS.partyHat(ctx, J, L, st);
    // dual: second pistol in back hand
    if (J.showGun && st.gun === 'dual') drawGun(ctx, J, 'pistol', J.handB, true);
    // front arm + gun
    if (J.showGun && st.gun === 'rocket') drawGun(ctx, J, st.gun, J.handF);
    seg(ctx, [J.sh, J.elbowF, J.handF], inkW, INK); seg(ctx, [J.sh, J.elbowF, J.handF], thick, limb);
    if (L.body === 'muscle') { // balloon biceps
      for (const [a, b, c] of [[J.sh, J.elbowF, limb], [J.sh, J.elbowB, limbD]]) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.beginPath(); ctx.arc(mx, my, 3.6 * s, 0, U.TAU); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.6 * s; ctx.strokeStyle = INK; ctx.stroke();
      }
    }
    if (J.showGun && st.gun !== 'rocket') drawGun(ctx, J, st.gun === 'dual' ? 'pistol' : st.gun, J.handF);
    // muzzle flash
    if (J.showGun && st.muzzleFlash > 0) {
      const m = J.muzzle, d = J.aimDir, r = (st.gun === 'shotgun' ? 9 : 6) * s * (0.6 + st.muzzleFlash * 0.6);
      ctx.save(); ctx.translate(m.x + d.x * r * 0.6, m.y + d.y * r * 0.6);
      if (S.Comic) S.Comic.burst(ctx, 0, 0, r * 0.45, r, 7, (st.t * 60) | 0); else { ctx.beginPath(); ctx.arc(0, 0, r, 0, U.TAU); }
      ctx.fillStyle = '#fff36b'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = '#ff7a1a'; ctx.stroke();
      ctx.restore();
    }
    if (st.pose === 'dead') ctx.restore();
    return J;
  }

  // head-only portrait (HUD / menus)
  function drawHead(ctx, x, y, look, scale, face) {
    const L = look || DEFAULT_LOOK;
    const st = { look: Object.assign({}, L, { scale: (L.scale || 1) * (scale || 1) }), facing: 1, t: (S.Game && S.Game.time) || 0, pose: 'idle', face };
    const s = st.look.scale;
    const r = (L.headR || 7) * s;
    const J = { f: 1, s, t: st.t, lean: 0, body: L.body, look: st.look, st, portrait: true,
      head: { x, y, r }, neck: { x, y: y + r + 1 }, sh: { x, y: y + r + 3 }, hip: { x, y: y + r + 14 * s },
      footF: { x: x + 3, y: y + r + 28 * s }, footB: { x: x - 3, y: y + r + 28 * s }, handF: { x: x + 6, y: y + r + 10 }, handB: { x: x - 6, y: y + r + 10 } };
    const props = L.props || [];
    for (const n of props) { const pr = Rig.PROPS[n]; if (pr && pr.back) pr.back(ctx, J, st.look, st); }
    ctx.beginPath(); ctx.arc(x, y, r, 0, U.TAU);
    ctx.fillStyle = L.head || '#fff'; ctx.fill(); ctx.lineWidth = Math.max(1.6, 2.1 * s); ctx.strokeStyle = INK; ctx.stroke();
    drawFace(ctx, J, face || L.face);
    for (const n of props) { const pr = Rig.PROPS[n]; if (typeof pr === 'function') pr(ctx, J, st.look, st); else if (pr && pr.front) pr.front(ctx, J, st.look, st); }
  }

  const Rig = S.Rig = { DEFAULT_LOOK, TWO_HANDED, GUN_LEN, PROPS: {}, GUNS: {}, shoulderH, joints, draw, drawHead, drawFace, ik, seg };

  // ---------------- GUNS (local: +x = barrel direction, grip at 0,0) ----------------
  function box(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(x, y, w, h); }
  Rig.GUNS.pistol = (ctx) => { box(ctx, -1, -3.5, 10, 3.5, '#6f7488'); box(ctx, -1, -1, 3, 4.5, '#3d3754'); ctx.fillStyle = '#c9cede'; ctx.fillRect(1, -3, 7, 1); };
  Rig.GUNS.shotgun = (ctx) => {
    box(ctx, -8, -2, 8, 4, '#a0622d'); box(ctx, -1, -3.5, 18, 3, '#4b4f63'); box(ctx, 4, -0.8, 7, 2.6, '#c47a3a');
    ctx.fillStyle = '#9ea3b8'; ctx.fillRect(0, -3, 16, 0.9);
  };
  Rig.GUNS.mg = (ctx, J, st) => {
    box(ctx, -5, -4, 15, 6, '#3f4356'); box(ctx, 9, -2.8, 10, 2.6, '#6f7488');
    ctx.beginPath(); ctx.arc(3, 4, 3.6, 0, U.TAU); ctx.fillStyle = '#7a8a3a'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
    const spin = (st.t || 0) * 40;
    ctx.strokeStyle = '#c9cede'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(10, -2 + Math.sin(spin) * 0.8); ctx.lineTo(19, -2 + Math.sin(spin) * 0.8); ctx.stroke();
  };
  Rig.GUNS.rocket = (ctx) => {
    box(ctx, -10, -7, 26, 6.5, '#6f8a3a');
    box(ctx, 16, -7.8, 3, 8, '#d23a2a'); box(ctx, -12, -7.8, 3, 8, '#3d3754');
    box(ctx, 2, -11, 4, 3.5, '#3d3754');
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(-4, -6, 3, 4);
  };
  Rig.GUNS.flame = (ctx, J, st) => {
    box(ctx, -4, -3.5, 16, 4, '#c0392b'); box(ctx, -1, 0, 3, 4, '#3d3754'); box(ctx, 3, 0.5, 5, 3, '#ffb81c');
    const fl = 1 + Math.sin((st.t || 0) * 30) * 0.4;
    ctx.fillStyle = '#4fc3ff'; ctx.beginPath(); ctx.arc(14, -1.5, 1.6 * fl, 0, U.TAU); ctx.fill();
  };
  Rig.GUNS.laser = (ctx, J, st) => {
    box(ctx, -3, -4, 16, 4.5, '#e9f2ff'); box(ctx, -1, 0, 3, 4, '#3d3754');
    ctx.fillStyle = '#3df2ff'; ctx.fillRect(2, -3, 9 * (0.6 + 0.4 * Math.abs(Math.sin((st.t || 0) * 8))), 2);
    box(ctx, 13, -3.2, 3, 3, '#3df2ff');
  };
  Rig.GUNS.spread = (ctx) => {
    box(ctx, -3, -5, 13, 7, '#ff8c1a'); for (const yy of [-5, -2, 1]) box(ctx, 10, yy + 0.3, 5, 2, '#6f7488');
    box(ctx, -1, 1.5, 3, 3.5, '#3d3754');
  };
  Rig.GUNS.dual = Rig.GUNS.pistol;
  Rig.GUNS.none = () => {};

  // ---------------- PROPS (head relative; J.head{x,y,r}, J.f facing) ----------------
  const PR = Rig.PROPS;
  function inkFill(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || 1.6; ctx.strokeStyle = INK; ctx.stroke(); }
  PR.pompadour = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath();
    ctx.moveTo(h.x - f * r * 0.95, h.y - r * 0.1);
    ctx.quadraticCurveTo(h.x - f * r * 1.2, h.y - r * 1.5, h.x + f * r * 0.2, h.y - r * 1.75);
    ctx.quadraticCurveTo(h.x + f * r * 1.7, h.y - r * 1.9, h.x + f * r * 1.55, h.y - r * 0.95);
    ctx.quadraticCurveTo(h.x + f * r * 1.1, h.y - r * 1.25, h.x + f * r * 0.7, h.y - r * 0.65);
    ctx.quadraticCurveTo(h.x, h.y - r * 0.85, h.x - f * r * 0.95, h.y - r * 0.1);
    inkFill(ctx, '#ffd23f', 1.6);
    ctx.strokeStyle = '#e09b1a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(h.x - f * r * 0.3, h.y - r * 1.2); ctx.quadraticCurveTo(h.x + f * r * 0.6, h.y - r * 1.6, h.x + f * r * 1.2, h.y - r * 1.2); ctx.stroke();
  };
  PR.aviators = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.fillStyle = '#141018';
    ctx.beginPath(); ctx.ellipse(h.x + f * r * 0.22, h.y - r * 0.12, r * 0.24, r * 0.2, 0, 0, U.TAU); ctx.ellipse(h.x + f * r * 0.68, h.y - r * 0.12, r * 0.24, r * 0.2, 0, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(h.x - f * r * 0.9, h.y - r * 0.25); ctx.lineTo(h.x + f * r * 0.1, h.y - r * 0.2); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x + f * r * 0.12 - 0.5, h.y - r * 0.25, 1.4, 1.2); ctx.fillRect(h.x + f * r * 0.58 - 0.5, h.y - r * 0.25, 1.4, 1.2);
  };
  PR.shades = PR.aviators;
  PR.headband = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, t = J.t;
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.42 + 2; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.98, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    ctx.strokeStyle = L.band || '#e8173a'; ctx.lineWidth = r * 0.42;
    ctx.beginPath(); ctx.arc(h.x, h.y, r * 0.98, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
    // flappy tails behind
    const bx = h.x - f * r * 0.9, by = h.y - r * 0.45, w = Math.sin(t * 14) * 2;
    ctx.lineCap = 'round';
    for (const k of [0, 1]) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3.4;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - f * 5, by + 1 + w + k * 2, bx - f * 9, by + 3 + k * 3 - w); ctx.stroke();
      ctx.strokeStyle = L.band || '#e8173a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - f * 5, by + 1 + w + k * 2, bx - f * 9, by + 3 + k * 3 - w); ctx.stroke();
    }
  };
  PR.bandana = PR.headband;
  PR.cowboyHat = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    const c = L.hat || '#b0672f';
    ctx.beginPath(); ctx.ellipse(h.x + f * r * 0.1, h.y - r * 0.7, r * 2.3, r * 0.42, -f * 0.08, 0, U.TAU); inkFill(ctx, c, 1.8);
    ctx.beginPath();
    ctx.moveTo(h.x - f * r * 0.95, h.y - r * 0.8); ctx.lineTo(h.x - f * r * 0.85, h.y - r * 2.4);
    ctx.quadraticCurveTo(h.x + f * r * 0.1, h.y - r * 2.0, h.x + f * r * 1.0, h.y - r * 2.4);
    ctx.lineTo(h.x + f * r * 1.15, h.y - r * 0.8); ctx.closePath(); inkFill(ctx, c, 1.8);
    ctx.fillStyle = '#5a2f12'; ctx.fillRect(h.x - r * 1.05, h.y - r * 1.1, r * 2.2, r * 0.32);
  };
  PR.mustache = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f, x = h.x + f * r * 0.5, y = h.y + r * 0.2;
    ctx.beginPath(); ctx.ellipse(x - f * r * 0.12, y, r * 0.25, r * 0.12, 0, 0, U.TAU); ctx.ellipse(x + f * r * 0.15, y, r * 0.25, r * 0.12, 0, 0, U.TAU); inkFill(ctx, '#3d2a1a', 1);
  };
  PR.handlebar = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f, x = h.x + f * r * 0.48, y = h.y + r * 0.22;
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.36; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.32); ctx.quadraticCurveTo(x - r * 0.35, y + r * 0.15, x, y); ctx.quadraticCurveTo(x + r * 0.35, y + r * 0.15, x + r * 0.55, y - r * 0.32); ctx.stroke();
    ctx.strokeStyle = '#4a2c14'; ctx.lineWidth = r * 0.2;
    ctx.beginPath(); ctx.moveTo(x - r * 0.55, y - r * 0.32); ctx.quadraticCurveTo(x - r * 0.35, y + r * 0.15, x, y); ctx.quadraticCurveTo(x + r * 0.35, y + r * 0.15, x + r * 0.55, y - r * 0.32); ctx.stroke();
  };
  PR.mohawk = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath();
    for (let i = 0; i <= 4; i++) {
      const a = Math.PI * (1.15 + i * 0.175);
      const bx = h.x + Math.cos(a) * r * 0.95 * f, by = h.y + Math.sin(a) * r * 0.95;
      const tx = h.x + Math.cos(a) * r * 1.9 * f, ty = h.y + Math.sin(a) * r * 1.9;
      if (i === 0) ctx.moveTo(bx, by); else ctx.lineTo(bx, by);
      ctx.lineTo(tx, ty);
    }
    ctx.lineTo(h.x + Math.cos(Math.PI * 1.85) * r * 0.95 * f, h.y + Math.sin(Math.PI * 1.85) * r * 0.95);
    ctx.closePath(); inkFill(ctx, L.hair || '#ff4fa3', 1.5);
  };
  PR.eyeblack = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.fillStyle = INK;
    ctx.fillRect(h.x + f * r * 0.22 - r * 0.14, h.y + r * 0.05, r * 0.28, r * 0.12);
    ctx.fillRect(h.x + f * r * 0.62 - r * 0.14, h.y + r * 0.05, r * 0.28, r * 0.12);
  };
  PR.fishbowl = { front: (ctx, J) => {
    const h = J.head, r = h.r;
    ctx.beginPath(); ctx.arc(h.x, h.y, r * 1.75, 0, U.TAU);
    ctx.fillStyle = 'rgba(190,240,255,0.28)'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(h.x, h.y, r * 1.4, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(h.x, h.y + r * 1.62, r * 1.05, r * 0.32, 0, 0, U.TAU); inkFill(ctx, '#9ea3b8', 1.4);
  } };
  PR.monocle = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f, x = h.x + f * r * 0.62, y = h.y - r * 0.15;
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, r * 0.3, 0, U.TAU); ctx.stroke();
    ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, U.TAU); ctx.stroke();
    ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y + r * 0.3); ctx.quadraticCurveTo(x - f * r * 0.2, y + r * 0.9, x - f * r * 0.5, y + r * 0.7); ctx.stroke();
  };
  PR.beard = { back: null, front: (ctx, J, L, st) => {
    const h = J.head, r = h.r, f = J.f;
    const len = J.portrait ? r * 1.8 : Math.max(r * 2, (J.hip.y - h.y) + r * 0.6);
    const sway = Math.sin(J.t * 4) * 1.5 * f;
    ctx.beginPath();
    ctx.moveTo(h.x - f * r * 0.35, h.y + r * 0.3);
    ctx.quadraticCurveTo(h.x + f * r * 0.1, h.y + r * 0.95, h.x + f * r * 0.95, h.y + r * 0.25);
    ctx.quadraticCurveTo(h.x + f * r * 1.2 + sway, h.y + len * 0.6, h.x + f * r * 0.5 + sway * 2, h.y + len);
    ctx.quadraticCurveTo(h.x - f * r * 0.1 + sway, h.y + len * 0.7, h.x - f * r * 0.35, h.y + r * 0.3);
    inkFill(ctx, L.beard || '#eeeeee', 1.5);
    ctx.strokeStyle = '#bbbbbb'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(h.x + f * r * 0.4, h.y + r); ctx.lineTo(h.x + f * r * 0.55 + sway, h.y + len * 0.8); ctx.stroke();
  } };
  PR.nightcap = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, w = Math.sin(J.t * 5) * 2;
    ctx.beginPath();
    ctx.moveTo(h.x - f * r * 1.0, h.y - r * 0.3);
    ctx.quadraticCurveTo(h.x - f * r * 0.2, h.y - r * 2.3, h.x - f * r * 2.0, h.y - r * 0.6 + w);
    ctx.quadraticCurveTo(h.x + f * r * 0.1, h.y - r * 1.4, h.x + f * r * 0.95, h.y - r * 0.45);
    ctx.closePath(); inkFill(ctx, L.cap || '#5aa0ff', 1.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x - r * 1.05, h.y - r * 0.55, r * 2.1, r * 0.3);
    ctx.beginPath(); ctx.arc(h.x - f * r * 2.1, h.y - r * 0.5 + w, r * 0.35, 0, U.TAU); inkFill(ctx, '#ffffff', 1.2);
  };
  PR.slippers = (ctx, J, L) => {
    if (J.portrait) return;
    for (const ft of [J.footB, J.footF]) { ctx.beginPath(); ctx.ellipse(ft.x + J.f * 1.5, ft.y - 1, 4.2 * J.s, 2.6 * J.s, 0, 0, U.TAU); inkFill(ctx, L.slipper || '#ff9ecf', 1.2); }
  };
  PR.helmet = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.15, r * 1.12, Math.PI, 0);
    ctx.lineTo(h.x + r * 1.12 + (f > 0 ? r * 0.35 : 0), h.y - r * 0.1); ctx.lineTo(h.x - r * 1.12 - (f < 0 ? r * 0.35 : 0), h.y - r * 0.1);
    ctx.closePath(); inkFill(ctx, L.helmet || '#5f7a3a', 1.6);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(h.x - r * 0.3, h.y - r * 1.1); ctx.lineTo(h.x - r * 0.2, h.y - r * 0.4); ctx.stroke();
  };
  PR.partyHat = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    const bx = h.x + f * r * 0.15, by = h.y - r * 0.85;
    ctx.beginPath(); ctx.moveTo(bx - r * 0.7, by + r * 0.15); ctx.lineTo(bx + f * r * 0.3, by - r * 1.8); ctx.lineTo(bx + r * 0.75, by + r * 0.05); ctx.closePath();
    inkFill(ctx, '#ff4fa3', 1.4);
    ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx - r * 0.45, by - r * 0.3); ctx.lineTo(bx + r * 0.5, by - r * 0.45); ctx.moveTo(bx - r * 0.15, by - r * 0.95); ctx.lineTo(bx + r * 0.35, by - r * 1.05); ctx.stroke();
    ctx.beginPath(); ctx.arc(bx + f * r * 0.3, by - r * 1.85, r * 0.3, 0, U.TAU); inkFill(ctx, '#ffe14d', 1.2);
  };
  PR.beret = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath(); ctx.ellipse(h.x - f * r * 0.15, h.y - r * 0.85, r * 1.2, r * 0.5, -f * 0.25, 0, U.TAU); inkFill(ctx, L.beretColor || '#c0392b', 1.4);
  };
  PR.scarf = (ctx, J, L) => {
    const n = J.neck, f = J.f, w = Math.sin(J.t * 12) * 2;
    ctx.beginPath(); ctx.ellipse(n.x, n.y + 1, 5 * J.s, 2.5 * J.s, 0, 0, U.TAU); inkFill(ctx, L.scarfColor || '#e8173a', 1.3);
    ctx.beginPath(); ctx.moveTo(n.x - f * 3, n.y + 1); ctx.lineTo(n.x - f * 11, n.y + 3 + w); ctx.lineTo(n.x - f * 10, n.y + 6 + w); ctx.lineTo(n.x - f * 2, n.y + 3); ctx.closePath(); inkFill(ctx, L.scarfColor || '#e8173a', 1.3);
  };
  PR.brows = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.strokeStyle = INK; ctx.lineWidth = r * 0.22; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(h.x + f * r * 0.05, h.y - r * 0.5); ctx.lineTo(h.x + f * r * 0.85, h.y - r * 0.3); ctx.stroke();
  };
})();
