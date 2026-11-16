// Stick Doosh - fx.js (core): particles, giblets, explosions visuals, shake, flash, hitstop, slowmo.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U;
  const INK = '#141018';
  const BLOOD = '#e8173a';
  const parts = [];
  const pool = [];

  function cap() {
    const mob = S.Main && S.Main.device && S.Main.device.mobile;
    let c = mob ? S.C.PARTICLES_MOBILE : S.C.PARTICLES_DESK;
    if (S.Main && S.Main.qualityLow) c = Math.round(c * 0.6);
    return c;
  }
  function gore() {
    if (S.Save && S.Save.data.cheats.gore) return 'max';
    return S.Save ? S.Save.settings.video.gore : 'on';
  }
  function grav() { return (S.Game && S.Game.grav) || 1; }

  function add(o) {
    if (parts.length >= cap()) { // recycle the oldest non-decal
      const old = parts.shift(); pool.push(old);
    }
    const p = pool.pop() || {};
    p.x = o.x; p.y = o.y; p.vx = o.vx || 0; p.vy = o.vy || 0;
    p.life = o.life || 0.6; p.max = p.life; p.size = o.size || 3; p.color = o.color || '#fff';
    p.kind = o.kind || 'spark'; p.rot = o.rot || 0; p.vr = o.vr || 0; p.g = o.g == null ? 0 : o.g;
    p.drag = o.drag == null ? 0 : o.drag; p.bounce = !!o.bounce; p.len = o.len || 6; p.color2 = o.color2 || null;
    p.grow = o.grow || 0; p.seed = (Math.random() * 1000) | 0; p.rest = false; p.data = o.data || null;
    parts.push(p);
    return p;
  }

  const FX = S.FX = {
    parts,
    shakeAmt: 0, shakeX: 0, shakeY: 0,
    flashA: 0, flashColor: '#fff', flashT: 0, flashMax: 0,
    stopT: 0, slowT: 0, slowScale: 1,
    clear() { while (parts.length) pool.push(parts.pop()); FX.shakeAmt = 0; FX.flashA = 0; FX.stopT = 0; FX.slowT = 0; FX.slowScale = 1; },
    add,
    spark(x, y, n, color) {
      for (let i = 0; i < (n || 6); i++) {
        const a = Math.random() * U.TAU, sp = U.rand(80, 320);
        add({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: U.rand(0.12, 0.3), kind: 'spark', color: color || '#ffe14d', len: U.rand(4, 9), drag: 3 });
      }
    },
    smoke(x, y, n, color) {
      for (let i = 0; i < (n || 4); i++) add({ x: x + U.rand(-8, 8), y: y + U.rand(-8, 8), vx: U.rand(-30, 30), vy: U.rand(-60, -15), life: U.rand(0.5, 1.1), kind: 'smoke', size: U.rand(5, 10), grow: 14, color: color || '#e9e4f0', drag: 1.5 });
    },
    dust(x, y, n) {
      for (let i = 0; i < (n || 5); i++) add({ x: x + U.rand(-6, 6), y, vx: U.rand(-70, 70), vy: U.rand(-50, -5), life: U.rand(0.25, 0.5), kind: 'smoke', size: U.rand(2.5, 5), grow: 8, color: '#f3ead8', drag: 4 });
    },
    debris(x, y, n, color) {
      for (let i = 0; i < (n || 5); i++) add({ x: x + U.rand(-7, 7), y: y + U.rand(-7, 7), vx: U.rand(-160, 160), vy: U.rand(-320, -60), life: U.rand(0.6, 1.2), kind: 'chunk', size: U.rand(3, 6), color: color || '#8a5a3b', g: 1, rot: Math.random() * 6, vr: U.rand(-12, 12), bounce: true });
    },
    fire(x, y, n) {
      for (let i = 0; i < (n || 3); i++) add({ x: x + U.rand(-5, 5), y: y + U.rand(-5, 5), vx: U.rand(-30, 30), vy: U.rand(-110, -40), life: U.rand(0.25, 0.5), kind: 'fire', size: U.rand(4, 8), grow: -6, drag: 1 });
    },
    ring(x, y, r, color) { add({ x, y, life: 0.35, kind: 'ring', size: r, color: color || '#ffffff' }); },
    explosion(x, y, r) {
      r = r || 50;
      add({ x, y, life: 0.42, kind: 'boom', size: r, seed: 0 });
      FX.ring(x, y, r * 1.3, '#fff3b0');
      FX.smoke(x, y, Math.round(4 + r / 12), '#d8d2e2');
      FX.spark(x, y, Math.round(8 + r / 6), '#ffb81c');
      for (let i = 0; i < 5; i++) add({ x, y, vx: U.rand(-260, 260), vy: U.rand(-380, -120), life: U.rand(0.5, 0.9), kind: 'ember', size: U.rand(2, 4), g: 0.8, color: '#ffd23f' });
    },
    blood(x, y, dx, n) {
      if (gore() === 'off') { FX.spark(x, y, n || 4, '#ffffff'); return; }
      const m = gore() === 'max' ? 2 : 1;
      for (let i = 0; i < (n || 6) * m; i++) add({ x, y, vx: (dx || 0) * U.rand(60, 220) + U.rand(-90, 90), vy: U.rand(-260, -40), life: U.rand(0.4, 0.8), kind: 'drop', size: U.rand(1.8, 3.4), color: BLOOD, g: 1, bounce: false });
    },
    splat(x, y) {
      if (gore() === 'off') return;
      add({ x, y, life: 6, kind: 'splat', size: U.rand(7, 13), color: BLOOD });
    },
    confetti(x, y, n) {
      const cols = ['#ff3b3b', '#ffe14d', '#3bb4ff', '#5fd35f', '#ff4fa3', '#c77dff'];
      for (let i = 0; i < (n || 18); i++) add({ x, y, vx: U.rand(-200, 200), vy: U.rand(-360, -120), life: U.rand(0.8, 1.6), kind: 'confetti', size: U.rand(3, 5), color: U.pick(cols), g: 0.45, drag: 1.6, rot: Math.random() * 6, vr: U.rand(-14, 14) });
      for (let i = 0; i < 4; i++) add({ x, y, vx: U.rand(-140, 140), vy: U.rand(-220, -80), life: U.rand(0.6, 1), kind: 'star', size: U.rand(5, 8), color: '#ffe14d', g: 0.3, drag: 1, rot: Math.random() * 6, vr: U.rand(-6, 6) });
    },
    shell(x, y, dir) {
      add({ x, y, vx: -dir * U.rand(40, 110), vy: U.rand(-220, -140), life: 0.9, kind: 'shell', size: 2.5, color: '#ffcf4a', g: 1, rot: 0, vr: U.rand(-20, 20), bounce: true });
    },
    // giblets: ent has x,y,h; look = rig look; dirX = push direction
    gibs(ent, look, dirX) {
      const gm = gore();
      const x = ent.x, y = ent.y - (ent.h || 30) * 0.5;
      dirX = dirX || 0;
      if (gm === 'off') {
        FX.confetti(x, y, 22);
        if (S.Comic) S.Comic.word('POOF', x, y - 10, { size: 22, color: '#ffffff', stroke: '#ff4fa3' });
        return;
      }
      const limb = (look && look.limb) || '#ff3b3b';
      const sc = (look && look.scale) || 1;
      const pieces = gm === 'max' ? 8 : 4;
      for (let i = 0; i < pieces; i++) {
        add({ x: x + U.rand(-6, 6), y: y + U.rand(-8, 8), vx: dirX * U.rand(80, 260) + U.rand(-150, 150), vy: U.rand(-460, -180), life: U.rand(1.6, 2.6), kind: 'limb', len: (gm === 'max' ? 6 : 10) * sc, size: ((look && look.thick) || 3.2) * sc, color: limb, g: 1, rot: Math.random() * 6, vr: U.rand(-16, 16), bounce: true });
      }
      add({ x, y: y - 12, vx: dirX * U.rand(60, 200) + U.rand(-60, 60), vy: U.rand(-520, -300), life: 2.4, kind: 'head', size: ((look && look.headR) || 7) * sc, color: (look && look.head) || '#ffffff', g: 1, rot: 0, vr: U.rand(-10, 10), bounce: true });
      FX.blood(x, y, dirX, 10);
      for (let i = 0; i < (gm === 'max' ? 4 : 2); i++) FX.splat(x + U.rand(-16, 16), ent.y - U.rand(0, 3));
      if (gm === 'max') {
        for (let i = 0; i < 2; i++) add({ x, y: y - 10, vx: U.rand(-220, 220), vy: U.rand(-500, -250), life: 2.2, kind: 'eye', size: 3.5, color: '#fff', g: 1, bounce: true, rot: 0, vr: 0 });
        if (S.Comic && Math.random() < 0.6) S.Comic.word(U.pick(['SPLAT!', 'SPLORCH!', 'SQUELCH!']), x, y - 14, { size: 22, color: BLOOD, stroke: '#ffffff' });
      } else if (S.Comic && Math.random() < 0.35) S.Comic.word('SPLAT', x, y - 12, { size: 18, color: BLOOD });
      FX.ring(x, y, 22, '#ffffff');
    },
    shake(amt) {
      const s = S.Save ? S.Save.settings.video.shake : 'full';
      const m = s === 'off' ? 0 : s === 'min' ? 0.25 : 1;
      FX.shakeAmt = Math.min(1.2, FX.shakeAmt + amt * m);
    },
    flash(color, sec) {
      const red = S.Save && S.Save.settings.video.reduceFlash;
      FX.flashColor = color || '#ffffff';
      FX.flashMax = red ? 0.14 : 0.85;
      FX.flashT = FX.flashMaxT = red ? Math.max(0.35, sec || 0.1) : (sec || 0.1);
    },
    hitstop(sec) { FX.stopT = Math.max(FX.stopT, sec); },
    slowmo(scale, sec) { FX.slowScale = scale; FX.slowT = sec; },
    // real-time timers (called by Game even during hitstop)
    tick(dt) {
      FX.shakeAmt = Math.max(0, FX.shakeAmt - dt * 1.8);
      const s = FX.shakeAmt * FX.shakeAmt * 14;
      FX.shakeX = s ? U.rand(-s, s) : 0; FX.shakeY = s ? U.rand(-s, s) : 0;
      if (FX.flashT > 0) FX.flashT -= dt;
      if (FX.stopT > 0) FX.stopT -= dt;
      if (FX.slowT > 0) { FX.slowT -= dt; if (FX.slowT <= 0) FX.slowScale = 1; }
    },
    update(dt) {
      const T = S.Terrain, gv = (S.C.GRAV * grav());
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); pool.push(p); continue; }
        if (p.rest) continue;
        if (p.g) p.vy += gv * p.g * dt;
        if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vy *= d; }
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (p.bounce && T && T.W) {
          if (T.solidPx(nx, ny)) {
            if (!T.solidPx(p.x, ny)) { p.vx *= -0.45; }
            else { p.vy *= -0.38; p.vx *= 0.7; p.vr *= 0.6; if (Math.abs(p.vy) < 40 && (p.kind === 'limb' || p.kind === 'head' || p.kind === 'chunk' || p.kind === 'shell' || p.kind === 'eye')) { p.vy = 0; p.vx *= 0.5; if (Math.abs(p.vx) < 10) p.rest = true; } }
            if (p.kind === 'limb' && gore() !== 'off' && Math.random() < 0.3) FX.splat(p.x, p.y);
          } else { p.x = nx; p.y = ny; }
        } else { p.x = nx; p.y = ny; }
        p.rot += p.vr * dt;
        if (p.grow) p.size = Math.max(0.5, p.size + p.grow * dt);
      }
    },
    draw(ctx, cam) {
      const x0 = cam.x - 40, x1 = cam.x + cam.w + 40, y0 = cam.y - 60, y1 = cam.y + cam.h + 60;
      for (const p of parts) {
        if (p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
        const a = Math.min(1, p.life / (p.max * 0.35));
        drawP(ctx, p, a);
      }
      ctx.globalAlpha = 1;
    },
    // screen-space overlays (flash) - called by Render after world
    drawTop(ctx, W, H) {
      if (FX.flashT > 0) {
        const red = S.Save && S.Save.settings.video.reduceFlash;
        const k = red ? Math.sin(Math.PI * (1 - FX.flashT / (FX.flashMaxT || 0.1))) : FX.flashT / (FX.flashMaxT || 0.1);
        ctx.globalAlpha = Math.max(0, FX.flashMax * k);
        ctx.fillStyle = FX.flashColor; ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }
    },
  };

  function drawP(ctx, p, a) {
    ctx.globalAlpha = a;
    switch (p.kind) {
      case 'spark': {
        const l = p.len / Math.max(1, Math.hypot(p.vx, p.vy));
        ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * l, p.y - p.vy * l); ctx.stroke();
        break;
      }
      case 'smoke':
        ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill(); ctx.globalAlpha = a * 0.6; ctx.stroke();
        break;
      case 'fire': {
        const t = p.life / p.max;
        ctx.fillStyle = t > 0.6 ? '#fff3a0' : t > 0.3 ? '#ffb81c' : '#ff4a1a';
        ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, U.TAU); ctx.fill();
        break;
      }
      case 'ember':
        ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        break;
      case 'chunk':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        break;
      case 'ring': {
        const t = 1 - p.life / p.max;
        ctx.strokeStyle = p.color; ctx.lineWidth = 3 * (1 - t) + 0.5;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.3 + t * 0.9), 0, U.TAU); ctx.stroke();
        break;
      }
      case 'boom': {
        const t = 1 - p.life / p.max;
        const r = p.size * (0.45 + U.easeOutCubic(Math.min(1, t * 2.2)) * 0.75);
        ctx.globalAlpha = t > 0.6 ? Math.max(0, (1 - t) / 0.4) : 1;
        if (S.Comic) {
          S.Comic.burst(ctx, p.x, p.y, r * 0.7, r, 12, p.seed); ctx.fillStyle = '#ff3b1a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
          S.Comic.burst(ctx, p.x, p.y, r * 0.45, r * 0.72, 10, p.seed + 5); ctx.fillStyle = '#ffb81c'; ctx.fill();
          S.Comic.burst(ctx, p.x, p.y, r * 0.22, r * 0.42, 8, p.seed + 9); ctx.fillStyle = '#fff6b0'; ctx.fill();
        } else { ctx.fillStyle = '#ffb81c'; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, U.TAU); ctx.fill(); }
        break;
      }
      case 'drop':
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill();
        break;
      case 'splat': {
        ctx.globalAlpha = Math.min(1, p.life / 1.5);
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.ellipse(p.x, p.y - 1, p.size, p.size * 0.35, 0, 0, U.TAU); ctx.fill();
        for (let i = 0; i < 3; i++) { const r = U.hash(p.seed, i); ctx.beginPath(); ctx.arc(p.x + (r - 0.5) * p.size * 2.4, p.y - 1 - r * 3, 1.5 + r * 2, 0, U.TAU); ctx.fill(); }
        break;
      }
      case 'confetti':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, Math.cos(p.rot * 2));
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
        break;
      case 'star':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        starPath(ctx, p.size); ctx.fillStyle = p.color; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
        ctx.restore();
        break;
      case 'shell':
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-2.5, -1.2, 5, 2.4); ctx.strokeStyle = INK; ctx.lineWidth = 0.8; ctx.strokeRect(-2.5, -1.2, 5, 2.4);
        ctx.restore();
        break;
      case 'limb': {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.lineCap = 'round';
        ctx.strokeStyle = INK; ctx.lineWidth = p.size + 2.6;
        ctx.beginPath(); ctx.moveTo(-p.len / 2, 0); ctx.lineTo(p.len / 2, 0); ctx.stroke();
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size;
        ctx.beginPath(); ctx.moveTo(-p.len / 2, 0); ctx.lineTo(p.len / 2, 0); ctx.stroke();
        ctx.fillStyle = BLOOD; ctx.beginPath(); ctx.arc(p.len / 2, 0, p.size * 0.55, 0, U.TAU); ctx.fill();
        ctx.restore();
        break;
      }
      case 'head': {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, p.size, 0, U.TAU); ctx.fill(); ctx.stroke();
        // X_X eyes
        ctx.lineWidth = 1.4; const e = p.size * 0.32;
        for (const ex of [-p.size * 0.35, p.size * 0.35]) { ctx.beginPath(); ctx.moveTo(ex - e, -e - 1); ctx.lineTo(ex + e, e - 1); ctx.moveTo(ex + e, -e - 1); ctx.lineTo(ex - e, e - 1); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0, p.size * 0.45, p.size * 0.22, 0, U.TAU); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'eye': {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill(); ctx.stroke();
        const wob = Math.sin(p.life * 30) * 1.2;
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x + wob, p.y + 1, p.size * 0.5, 0, U.TAU); ctx.fill();
        break;
      }
      default:
        ctx.fillStyle = p.color; ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
  }
  function starPath(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath();
  }
  FX.starPath = starPath;
})();
