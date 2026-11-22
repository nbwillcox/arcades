/* juice: particles, floating damage numbers, XP arcs, trauma shake, hit-stop, vector effects */
(function () {
  var U = CS.U, fx = CS.fx = {
    parts: new U.Pool(900, function () { return { x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, c: '#fff', s: 2, g: 0 }; }),
    nums: new U.Pool(200, function () { return { x: 0, y: 0, vy: 0, life: 0, max: 1, t: '', c: '#fff', sc: 1 }; }),
    xps: new U.Pool(140, function () { return { x: 0, y: 0, t: 0, d: 1, sx: 0, sy: 0, cx: 0, cy: 0 }; }),
    vfx: new U.Pool(160, function () { return {}; }),
    trauma: 0, kx: 0, kz: 0, ox: 0, oy: 0, hitstop: 0, flash: 0, flashC: '#fff', xpTarget: { x: 60, y: 22 }
  };
  fx.reset = function () { fx.parts.clear(); fx.nums.clear(); fx.xps.clear(); fx.vfx.clear(); fx.trauma = 0; fx.hitstop = 0; fx.flash = 0; };

  fx.spark = function (x, y, vx, vy, life, c, s, g) { var p = fx.parts.spawn(); if (!p) return; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.c = c; p.s = s || 2; p.g = g || 0; };
  fx.burst = function (x, y, n, c, spd, life, s) { for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = spd * (0.3 + Math.random() * 0.7); fx.spark(x, y, Math.cos(a) * v, Math.sin(a) * v, life * (0.5 + Math.random() * 0.5), c, s); } };
  fx.num = function (x, y, text, c, sc) { if (CS.save.d.set.dmgnums === false && c !== '#ff4a5a') return; if (fx.nums.n > 70 && !(sc > 1)) return; var n = fx.nums.spawn(); if (!n) return; n.x = x + (Math.random() * 8 - 4); n.y = y - 8; n.vy = -34 - Math.random() * 14; n.life = n.max = sc > 1 ? 0.8 : 0.6; n.t = '' + text; n.c = c; n.sc = sc || 1; };
  fx.xp = function (wx, wy) { // XP arc: credited instantly, this is only the flying visual
    var G = CS.G; if (fx.xps.n > 90) return; var p = fx.xps.spawn(); if (!p) return;
    p.sx = wx - G.cam.x; p.sy = wy - G.cam.y; p.t = 0; p.d = 0.45 + Math.random() * 0.15; p.cx = p.sx + (Math.random() * 80 - 40); p.cy = p.sy - 40 - Math.random() * 40;
  };
  /* kinds: ring {x,y,r,r2,c,w} | line {x,y,x2,y2,c,w} (lightning) | flash {x,y,r,c} | beam {x,y,w,c,h} vertical column */
  fx.v = function (kind, x, y, o) { var v = fx.vfx.spawn(); if (!v) return null; v.kind = kind; v.x = x; v.y = y; v.r = 0; v.r2 = 0; v.x2 = 0; v.y2 = 0; v.c = '#fff'; v.w = 2; v.life = v.max = 0.3; v.h = 400; for (var k in o) v[k] = o[k]; v.max = v.life; return v; };
  fx.shake = function (amt, dx, dy) { var s = CS.save.d.set.shake; fx.trauma = Math.min(1, fx.trauma + amt * s); if (dx || dy) { fx.kx += dx * amt * 6 * s; fx.kz += dy * amt * 6 * s; } };
  fx.stop = function (ms) { if (ms > fx.hitstop) fx.hitstop = ms; };

  fx.update = function (dt) {
    var i, p, a;
    for (a = fx.parts, i = a.n - 1; i >= 0; i--) { p = a.a[i]; p.life -= dt; if (p.life <= 0) { a.kill(i); continue; } p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.vx *= 0.985; }
    for (a = fx.nums, i = a.n - 1; i >= 0; i--) { p = a.a[i]; p.life -= dt; if (p.life <= 0) { a.kill(i); continue; } p.y += p.vy * dt; p.vy *= 0.94; }
    for (a = fx.vfx, i = a.n - 1; i >= 0; i--) { p = a.a[i]; p.life -= dt; if (p.life <= 0) a.kill(i); }
    var tg = fx.xpTarget;
    for (a = fx.xps, i = a.n - 1; i >= 0; i--) { p = a.a[i]; p.t += dt / p.d; if (p.t >= 1) a.kill(i); }
    fx.trauma = Math.max(0, fx.trauma - dt * 1.6); fx.kx *= Math.pow(0.001, dt); fx.kz *= Math.pow(0.001, dt);
    var m = fx.trauma * fx.trauma * 12;
    fx.ox = Math.round((Math.random() * 2 - 1) * m + fx.kx); fx.oy = Math.round((Math.random() * 2 - 1) * m + fx.kz);
    if (fx.flash > 0) fx.flash -= dt;
  };

  fx.drawWorld = function (ctx, cx, cy) { // sparks (additive-ish look via bright colours)
    var a = fx.parts, i, p; ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < a.n; i++) { p = a.a[i]; ctx.globalAlpha = Math.min(1, p.life / p.max * 1.5); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - cx), Math.round(p.y - cy), p.s, p.s); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  fx.drawVfx = function (ctx, cx, cy) {
    var a = fx.vfx, i, v, t, X, Y; ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < a.n; i++) {
      v = a.a[i]; t = 1 - v.life / v.max; X = v.x - cx; Y = v.y - cy; ctx.globalAlpha = Math.min(1, (1 - t) * 1.6);
      if (v.kind === 'ring') { ctx.strokeStyle = v.c; ctx.lineWidth = v.w * (1 - t * 0.6); ctx.beginPath(); ctx.arc(X, Y, v.r + (v.r2 - v.r) * t, 0, 6.283); ctx.stroke(); }
      else if (v.kind === 'flash') { ctx.fillStyle = v.c; ctx.beginPath(); ctx.arc(X, Y, v.r * (0.6 + t * 0.6), 0, 6.283); ctx.fill(); }
      else if (v.kind === 'line') { // jagged lightning
        var x2 = v.x2 - cx, y2 = v.y2 - cy, n = Math.max(2, Math.floor(Math.hypot(x2 - X, y2 - Y) / 14)), k, px = X, py = Y, nx, ny, dx = (x2 - X), dy = (y2 - Y), l = Math.hypot(dx, dy) || 1;
        ctx.strokeStyle = v.c; ctx.lineWidth = v.w; ctx.beginPath(); ctx.moveTo(X, Y);
        for (k = 1; k < n; k++) { nx = X + dx * k / n + (-dy / l) * (Math.random() * 10 - 5); ny = Y + dy * k / n + (dx / l) * (Math.random() * 10 - 5); ctx.lineTo(nx, ny); }
        ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(x2, y2); ctx.stroke();
      } else if (v.kind === 'beam') { var w = v.w * (1 - t * 0.5); ctx.fillStyle = v.c; ctx.fillRect(Math.round(X - w), Math.round(Y - v.h), Math.round(w * 2), v.h); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(X - w / 3), Math.round(Y - v.h), Math.round(w / 1.5), v.h); }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  };
  fx.drawNums = function (ctx, cx, cy) {
    var a = fx.nums, i, n, A = CS.art;
    for (i = 0; i < a.n; i++) { n = a.a[i]; ctx.globalAlpha = Math.min(1, n.life / n.max * 2); A.text(ctx, n.t, n.x - cx, n.y - cy, n.c, n.sc, 'center', true); }
    ctx.globalAlpha = 1;
  };
  fx.drawXp = function (ctx) { // screen-space arcs flying into the HUD XP bar
    var a = fx.xps, i, p, t, u, x, y, tg = fx.xpTarget;
    for (i = 0; i < a.n; i++) { p = a.a[i]; t = p.t; u = 1 - t; x = u * u * p.sx + 2 * u * t * p.cx + t * t * tg.x; y = u * u * p.sy + 2 * u * t * p.cy + t * t * tg.y; ctx.fillStyle = '#27e6ff'; ctx.fillRect(Math.round(x), Math.round(y), 2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
  };
})();
