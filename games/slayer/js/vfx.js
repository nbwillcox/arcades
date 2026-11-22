/* AAA-style spell VFX: additive multi-layer glow, textured fireballs / lightning / rings (ComfyUI fx_* textures, procedural fallbacks),
   trails, flares, shockwaves, debris. Everything is cached sprites + additive blits so it stays cheap. */
(function () {
  var A = CS.art, fx = CS.fx, U = CS.U, V = CS.V = {};
  var TINT = {}, FB = {}, TAU = 6.2832;

  /* ---------- procedural fallbacks (used when assets/sprites/fx_*.png is missing) ---------- */
  function mk(sz, fn) { var c = document.createElement('canvas'); c.width = c.height = sz; fn(c.getContext('2d'), sz); return c; }
  function fallback(key) {
    if (FB[key]) return FB[key];
    var c;
    if (key === 'fx_ring' || key === 'fx_circle') c = mk(128, function (g, s) { var rg = g.createRadialGradient(s / 2, s / 2, s * 0.34, s / 2, s / 2, s * 0.5); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.55, 'rgba(255,255,255,0.95)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, s, s); });
    else if (key === 'fx_burst') c = mk(128, function (g, s) { var rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); rg.addColorStop(0, '#fff'); rg.addColorStop(0.2, 'rgba(255,255,255,.6)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(0, s / 2 - 1, s, 2); g.fillRect(s / 2 - 1, 0, 2, s); });
    else if (key === 'fx_beam') c = mk(64, function (g, s) { var lg = g.createLinearGradient(0, 0, s, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, '#fff'); lg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = lg; g.fillRect(0, 0, s, s); });
    else c = mk(128, function (g, s) { var rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); rg.addColorStop(0, '#fff'); rg.addColorStop(0.35, 'rgba(255,255,255,.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, s, s); });
    return (FB[key] = c);
  }
  /* base texture: the generated PNG when present, otherwise the fallback */
  function base(key) { var s = A.spr[key]; return s && !s.proc ? s.c : fallback(key); }
  /* tinted copy: grayscale luminance multiplied by colour, with a white-hot core added back */
  V.tex = function (key, col) {
    var b = base(key); if (!col) return b; var k = key + col, t = TINT[k]; if (t) return t;
    t = document.createElement('canvas'); t.width = b.width; t.height = b.height; var g = t.getContext('2d');
    var real = A.spr[key] && !A.spr[key].proc;
    if (real) { // opaque black-background texture: luminance x colour, additive-ready
      if (typeof g.filter === 'string') g.filter = 'grayscale(1) brightness(1.6) contrast(1.15)'; g.drawImage(b, 0, 0); g.filter = 'none';
      g.globalCompositeOperation = 'multiply'; g.fillStyle = col; g.fillRect(0, 0, t.width, t.height);
    } else { g.drawImage(b, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = col; g.fillRect(0, 0, t.width, t.height); }
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35; g.drawImage(b, 0, 0); TINT[k] = t; return t;
  };
  /* additive blit centred at (x,y), w x h, rotation, alpha */
  V.add = function (ctx, key, col, x, y, w, h, rot, a) {
    var t = V.tex(key, col); ctx.globalAlpha = a; x = Math.round(x); y = Math.round(y);
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(t, -w / 2, -h / 2, w, h); ctx.restore(); }
    else ctx.drawImage(t, x - w / 2, y - h / 2, w, h);
  };

  /* ---------- effect spawners (all go through fx.v pools) ---------- */
  var capN = function () { return fx.vfx.n > 85; };
  V.explosion = function (x, y, r, col, o) {
    o = o || {}; if (capN()) { fx.v('ring', x, y, { r: 4, r2: r, c: col, w: 3, life: 0.25 }); return; }
    var big = r > 70;
    fx.v('fireball', x, y, { r: r * 2.5, c: col, life: big ? 0.55 : 0.4, rot: Math.random() * TAU });
    fx.v('flash', x, y, { r: r * 0.9, c: '#ffffff', life: 0.12 });
    fx.v('shock', x, y, { r: r * 0.3, r2: r * 1.25, c: col, w: big ? 6 : 4, life: big ? 0.45 : 0.32 });
    fx.v('flare', x, y, { r: r * 1.6, c: '#fff4d0', life: 0.2, rot: Math.random() * 3 });
    var n = Math.min(26, 8 + (r >> 2)), i, a, s;
    for (i = 0; i < n; i++) { a = Math.random() * TAU; s = (90 + Math.random() * 190) * (0.6 + r / 120); fx.spark(x, y, Math.cos(a) * s, Math.sin(a) * s - 30, 0.35 + Math.random() * 0.55, i % 3 ? col : '#ffffff', 2 + (i % 3 === 0), 260); }
    if (big) fx.v('smoke', x, y, { r: r * 1.1, life: 0.9, c: '#1a1424' });
  };
  V.muzzle = function (x, y, ang, col, size) { fx.v('flare', x, y, { r: size || 16, c: col || '#ffe9b0', life: 0.09, rot: ang }); fx.v('flash', x, y, { r: (size || 16) * 0.45, c: '#ffffff', life: 0.06 }); };
  V.impact = function (x, y, col, crit) { if (fx.vfx.n > 60) return; fx.v('flare', x, y, { r: crit ? 26 : 12, c: crit ? '#fff0a0' : col || '#ffffff', life: crit ? 0.16 : 0.09, rot: Math.random() * 3 }); if (crit) fx.v('ring', x, y, { r: 4, r2: 26, c: '#ffe44d', w: 2, life: 0.2 }); };
  V.column = function (x, y, w, col, life) { fx.v('beam', x, y + 8, { w: w, c: col, life: life || 0.28, h: 420 }); fx.v('flash', x, y, { r: w * 1.8, c: '#ffffff', life: 0.14 }); fx.v('shock', x, y, { r: 6, r2: w * 2.6, c: col, w: 4, life: 0.35 }); fx.v('flare', x, y, { r: w * 3, c: col, life: 0.22, rot: 0.4 }); for (var i = 0; i < 12; i++) fx.spark(x + U.rr(-w, w), y, U.rr(-30, 30), U.rr(-220, -60), 0.5 + Math.random() * 0.4, i % 2 ? col : '#fff', 2, 120); };

  /* ---------- the vfx renderer (replaces the basic one in fx.js) ---------- */
  fx.drawVfx = function (ctx, cx, cy) {
    var a = fx.vfx, i, v, t, X, Y, k;
    // dark smoke first (normal blend)
    for (i = 0; i < a.n; i++) { v = a.a[i]; if (v.kind !== 'smoke') continue; t = 1 - v.life / v.max; X = v.x - cx; Y = v.y - cy - t * 26; ctx.globalAlpha = (1 - t) * 0.5; ctx.fillStyle = v.c; ctx.beginPath(); ctx.arc(X, Y, v.r * (0.5 + t * 0.7), 0, TAU); ctx.fill(); }
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < a.n; i++) {
      v = a.a[i]; t = 1 - v.life / v.max; X = v.x - cx; Y = v.y - cy; var fade = Math.min(1, (1 - t) * 1.6), rr;
      switch (v.kind) {
        case 'ring': case 'shock':
          rr = v.r + (v.r2 - v.r) * (1 - Math.pow(1 - t, 2)); V.add(ctx, 'fx_ring', v.c, X, Y, rr * 2.3 + 6, rr * 2.3 + 6, 0, fade * 0.9);
          ctx.globalAlpha = fade; ctx.strokeStyle = v.c; ctx.lineWidth = Math.max(1, v.w * (1 - t * 0.7)); ctx.beginPath(); ctx.arc(X, Y, rr, 0, TAU); ctx.stroke();
          if (v.kind === 'shock') { ctx.globalAlpha = fade * 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(X, Y, rr * 0.97, 0, TAU); ctx.stroke(); }
          break;
        case 'flash': V.add(ctx, 'fx_burst', v.c, X, Y, v.r * 2.4 * (0.6 + t * 0.6), v.r * 2.4 * (0.6 + t * 0.6), 0, fade * 0.7); break;
        case 'flare': V.add(ctx, 'fx_burst', v.c, X, Y, v.r * 2.2, v.r * 2.2, v.rot || 0, fade * 0.95); break;
        case 'fireball': rr = v.r * (0.45 + 0.55 * (1 - Math.pow(1 - t, 3))); V.add(ctx, 'fx_fireball', v.c, X, Y, rr, rr, (v.rot || 0) + t * 0.6, fade); V.add(ctx, 'fx_orb', '#ffffff', X, Y, rr * 0.3 * (1 - t), rr * 0.3 * (1 - t), 0, fade * 0.45); break;
        case 'line': lightning(ctx, v, X, Y, cx, cy, t); break;
        case 'beam': {
          var w = v.w * (1 - t * 0.5), h = v.h; ctx.globalAlpha = fade;
          V.add(ctx, 'fx_beam', v.c, X, Y - h / 2, w * 4, h, 0, fade * 0.9);
          var lg = ctx.createLinearGradient(X - w, 0, X + w, 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(0.5, '#ffffff'); lg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = fade; ctx.fillStyle = lg; ctx.fillRect(Math.round(X - w), Math.round(Y - h), Math.round(w * 2), h);
          break; }
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  /* branching, multi-pass lightning */
  function lightning(ctx, v, X, Y, cx, cy, t) {
    var x2 = v.x2 - cx, y2 = v.y2 - cy, dx = x2 - X, dy = y2 - Y, l = Math.hypot(dx, dy) || 1, n = Math.max(3, Math.floor(l / 12)), px = -dy / l, py = dx / l, pts = [[X, Y]], k, j = Math.min(9, 3 + l / 22);
    for (k = 1; k < n; k++) pts.push([X + dx * k / n + px * (Math.random() * 2 - 1) * j, Y + dy * k / n + py * (Math.random() * 2 - 1) * j]);
    pts.push([x2, y2]); var fade = Math.min(1, (1 - t) * 1.8);
    function path() { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (var q = 1; q < pts.length; q++) ctx.lineTo(pts[q][0], pts[q][1]); ctx.stroke(); }
    ctx.lineJoin = 'round'; ctx.strokeStyle = v.c; ctx.globalAlpha = fade * 0.22; ctx.lineWidth = v.w * 5 + 4; path(); ctx.globalAlpha = fade * 0.5; ctx.lineWidth = v.w * 2.4; path();
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = fade; ctx.lineWidth = Math.max(1, v.w * 0.8); path();
    if (l > 60 && Math.random() < 0.7) { var b = pts[Math.floor(pts.length / 2)], ba = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.8, bl = 14 + Math.random() * 22; ctx.strokeStyle = v.c; ctx.globalAlpha = fade * 0.7; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + Math.cos(ba) * bl * 0.5 + (Math.random() - 0.5) * 6, b[1] + Math.sin(ba) * bl * 0.5 + (Math.random() - 0.5) * 6); ctx.lineTo(b[0] + Math.cos(ba) * bl, b[1] + Math.sin(ba) * bl); ctx.stroke(); }
    V.add(ctx, 'fx_burst', v.c, X, Y, 22, 22, 0, fade * 0.7); V.add(ctx, 'fx_burst', v.c, x2, y2, 30, 30, Math.random() * 3, fade);
  }

  /* ---------- projectile rendering with trails ---------- */
  var SCOL = { shot_slug: '#ffb347', shot_plasma: '#4dffb0', shot_bolt: '#ffe44d', shot_saw: '#27e6ff', shot_orb: '#ff4fd8' };
  V.drawShots = function (ctx, cx, cy) {
    var G = CS.G, a = G.sh, i, s, X, Y, col, sp, nx, ny, L, g;
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < a.n; i++) {
      s = a.a[i]; X = s.x - cx; Y = s.y - cy; if (X < -30 || X > CS.W + 30 || Y < -30 || Y > CS.H + 30) continue;
      col = SCOL[s.spr] || '#ffffff'; sp = Math.hypot(s.vx, s.vy) || 1; nx = s.vx / sp; ny = s.vy / sp;
      if (s.saw) { V.add(ctx, 'fx_ring', col, X, Y, 34, 34, 0, 0.8); V.add(ctx, 'fx_burst', col, X, Y, 26, 26, s.rot * 0.5, 0.7); continue; }
      L = s.spr === 'shot_slug' ? 34 : s.spr === 'shot_bolt' ? 22 : 26;
      g = ctx.createLinearGradient(X, Y, X - nx * L, Y - ny * L); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = 0.85; ctx.strokeStyle = g; ctx.lineWidth = s.spr === 'shot_slug' ? 5 : 3.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - nx * L, Y - ny * L); ctx.stroke();
      V.add(ctx, 'fx_orb', col, X, Y, 22 * s.big, 22 * s.big, 0, 0.8);
      ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - nx * L * 0.35, Y - ny * L * 0.35); ctx.stroke();
    }
    for (i = 0; i < G.eb.n; i++) { s = G.eb.a[i]; X = s.x - cx; Y = s.y - cy; if (X < -30 || X > CS.W + 30 || Y < -30 || Y > CS.H + 30) continue; col = s.col || '#ff2a9a'; sp = Math.hypot(s.vx, s.vy) || 1;
      g = ctx.createLinearGradient(X, Y, X - s.vx / sp * 18, Y - s.vy / sp * 18); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.7; ctx.strokeStyle = g; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - s.vx / sp * 18, Y - s.vy / sp * 18); ctx.stroke();
      V.add(ctx, 'fx_orb', col, X, Y, 22 + Math.sin(CS.G.t * 12 + i) * 3, 22 + Math.sin(CS.G.t * 12 + i) * 3, 0, 0.85); V.add(ctx, 'fx_orb', '#ffffff', X, Y, 9, 9, 0, 0.9); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    // solid cores (sprites) on top: saw blades keep their real sprite
    for (i = 0; i < a.n; i++) { s = a.a[i]; if (s.saw) A.draw(ctx, 'shot_saw', s.x - cx, s.y - cy, false, false, s.big * 1.1, s.rot); }
  };

  /* ---------- ground / area effects ---------- */
  V.cloud = function (ctx, X, Y, r, T, i) { ctx.globalCompositeOperation = 'lighter'; V.add(ctx, 'fx_cloud', '#6bff3c', X, Y, r * 2.5, r * 2.5, T * 0.35 + i, 0.55); V.add(ctx, 'fx_cloud', '#b8ff6a', X, Y, r * 1.6, r * 1.6, -T * 0.5 + i, 0.35); V.add(ctx, 'fx_orb', '#4dd02a', X, Y, r * 1.8, r * 1.8, 0, 0.25); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; };
  V.napalm = function (ctx, X, Y, r, T, i, life) { ctx.globalCompositeOperation = 'lighter'; V.add(ctx, 'fx_orb', '#ff6a1a', X, Y, r * 2.6, r * 2.6, 0, 0.5); for (var k = 0; k < 4; k++) { var a = k * 1.9 + i, d = r * 0.55 * ((k * 0.37 + 0.2) % 1), h = r * (0.9 + 0.4 * Math.sin(T * 9 + k * 2 + i)); V.add(ctx, 'fx_flame', '#ff8a2a', X + Math.cos(a) * d, Y + Math.sin(a) * d * 0.7 - h * 0.35, h * 0.8, h, 0, Math.min(1, life) * 0.85); } ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; };
  V.nova = function (ctx, X, Y, r, max) {
    ctx.globalCompositeOperation = 'lighter'; var f = Math.max(0.15, 1 - r / max);
    V.add(ctx, 'fx_ring', '#ffb040', X, Y, r * 2.35 + 14, r * 2.35 + 14, 0, 0.9 * f + 0.1); V.add(ctx, 'fx_ring', '#fff3c0', X, Y, r * 2.1, r * 2.1, 0, 0.6 * f);
    ctx.globalAlpha = f; ctx.strokeStyle = '#fff3c0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.stroke();
    var n = Math.min(16, 6 + (r >> 4)), i, a; for (i = 0; i < n; i++) { a = i * TAU / n + r * 0.02; V.add(ctx, 'fx_flame', '#ff9a3c', X + Math.cos(a) * r, Y + Math.sin(a) * r, 16 + 10 * f, 22 + 14 * f, 0, 0.75 * f); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };
  V.judg = function (ctx, X, Y, r, T) {
    ctx.globalCompositeOperation = 'lighter'; V.add(ctx, 'fx_circle', '#ffe44d', X, Y, r * 2.6, r * 1.6, 0, 0.8); V.add(ctx, 'fx_beam', '#ffe9a0', X, Y - 190, r * 2.6, 380, 0, 0.85);
    var lg = ctx.createLinearGradient(X - r * 0.4, 0, X + r * 0.4, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, '#fff'); lg.addColorStop(1, 'rgba(255,255,255,0)'); ctx.globalAlpha = 0.95; ctx.fillStyle = lg; ctx.fillRect(Math.round(X - r * 0.4), Y - 380, Math.round(r * 0.8), 380);
    V.add(ctx, 'fx_burst', '#fff0a0', X, Y, r * 2.2, r * 1.2, T, 0.8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };
  V.hole = function (ctx, X, Y, T) {
    ctx.globalCompositeOperation = 'lighter'; V.add(ctx, 'fx_swirl', '#9a6aff', X, Y, 120, 120, T * 2.2, 0.85); V.add(ctx, 'fx_swirl', '#4dd2ff', X, Y, 80, 80, -T * 3, 0.7); V.add(ctx, 'fx_ring', '#c9a3ff', X, Y, 64, 64, 0, 0.9);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(X, Y, 15, 0, TAU); ctx.fill();
  };
  V.ering = function (ctx, X, Y, r, col) { ctx.globalCompositeOperation = 'lighter'; V.add(ctx, 'fx_ring', col, X, Y, r * 2.4 + 12, r * 2.4 + 12, 0, 0.95); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; };
  V.telegraph = function (ctx, X, Y, r, f, col, T) {
    ctx.globalCompositeOperation = 'lighter'; V.add(ctx, 'fx_circle', col, X, Y, r * 2.3, r * 2.3, T * 0.8, 0.35 + 0.5 * f); V.add(ctx, 'fx_ring', col, X, Y, r * 2.3 * (1.5 - 0.5 * f), r * 2.3 * (1.5 - 0.5 * f), 0, 0.9 * f);
    ctx.globalAlpha = 0.18 + 0.3 * f; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X, Y, r, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };
  V.laser = function (ctx, x1, y1, x2, y2, w, col, active) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    if (!active) { ctx.globalAlpha = 0.35 + 0.3 * Math.sin(CS.G.t * 30); ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
    else { ctx.strokeStyle = col; ctx.globalAlpha = 0.2; ctx.lineWidth = w * 4; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.globalAlpha = 0.6; ctx.lineWidth = w * 2; ctx.stroke(); ctx.globalAlpha = 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(1.5, w * 0.7); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };
})();
