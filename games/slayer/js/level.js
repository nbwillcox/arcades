/* per-sector level design: barriers (obstacles), floor traps, weather and mood.
   Obstacle + trap placement is deterministic from world cells (infinite map, no storage). */
(function () {
  var U = CS.U, A = CS.art, fx = CS.fx, AU = CS.audio, LV = CS.LV = {}, W = CS.W, H = CS.H, TAU = 6.2832;

  /* stage index -> design: obs = barrier density per 240px cell, trap = floor trap type, wx = weather, tint = mood overlay */
  LV.DEF = [
    { obs: 0.26, on: 'TOMBSTONES', trap: 'spikes', tn: 'SPIKE TRAPS', wx: 'fog', wn: 'CRYPT FOG', tint: 'rgba(40,10,70,0.10)', tc: '#b54cff' },
    { obs: 0.30, on: 'SCRAP CRATES', trap: 'vent', tn: 'FIRE VENTS', wx: 'embers', wn: 'RISING EMBERS', tint: 'rgba(90,30,0,0.12)', tc: '#ff7a1a' },
    { obs: 0.22, on: 'GLASS SERVERS', trap: null, tn: '', wx: 'digital', wn: 'DATA RAIN', tint: 'rgba(0,40,90,0.10)', tc: '#4dd2ff', flash: 9 },
    { obs: 0.28, on: 'BONE PILES', trap: 'spikes', tn: 'BONE SPIKES', wx: 'spores', wn: 'DRIFTING SPORES', tint: 'rgba(80,0,30,0.12)', tc: '#ff4f7a' },
    { obs: 0.26, on: 'WRECKAGE', trap: null, tn: '', wx: 'debris', wn: 'ZERO-G DEBRIS', tint: 'rgba(0,0,10,0.12)', tc: '#9fb4ff' },
    { obs: 0.24, on: 'STATUES', trap: 'spikes', tn: 'HOLY SPIKES', wx: 'dust', wn: 'SUN BEAMS', tint: 'rgba(60,30,0,0.08)', tc: '#ffd35a', flash: 12 },
    { obs: 0.30, on: 'DEAD TREES', trap: 'vent', tn: 'TOXIC VENTS', wx: 'rain', wn: 'ACID RAIN', tint: 'rgba(0,50,10,0.14)', tc: '#6bff3c', flash: 8 },
    { obs: 0.30, on: 'ICE SPIRES', trap: 'spikes', tn: 'ICE SPIKES', wx: 'snow', wn: 'BLIZZARD', tint: 'rgba(0,40,70,0.10)', tc: '#7ae8ff' },
    { obs: 0.26, on: 'REACTOR PYLONS', trap: 'vent', tn: 'PLASMA VENTS', wx: 'plasma', wn: 'PLASMA MOTES', tint: 'rgba(80,0,40,0.14)', tc: '#ff3c8a', flash: 7 },
    { obs: 0.24, on: 'OBELISKS', trap: 'both', tn: 'SPIKES + VENTS', wx: 'ash', wn: 'GOLDEN ASH', tint: 'rgba(70,20,0,0.12)', tc: '#ffcc33' }
  ];
  var CELL = 240, TC = 300, st = 0, d = null, parts = [], flashT = 5, flashA = 0, seed = 0;

  LV.reset = function (stage) {
    st = stage; d = LV.DEF[stage]; seed = stage * 131 + 7; parts.length = 0; flashT = 4 + Math.random() * 6; flashA = 0;
    var n = d.wx === 'fog' ? 7 : d.wx === 'dust' ? 40 : 130, i;
    for (i = 0; i < n; i++) parts.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random(), a: Math.random() * TAU });
  };

  /* ---------- obstacles ---------- */
  function obsAt(gx, gy) {
    var h = U.hash(gx + seed, gy * 3 + 1); if (h > d.obs) return null;
    var px = gx * CELL + 70 + U.hash(gy, gx + seed) * 100, py = gy * CELL + 70 + U.hash(gx + 9, gy + seed) * 100;
    if (px * px + py * py < 190 * 190) return null;
    return { x: px, y: py, r: 15, v: U.hash(gx * 7, gy * 5) };
  }
  LV.push = function (e) { // push an entity (x,y,r) out of the barrier in its own cell
    if (!d) return; var o = obsAt(Math.floor(e.x / CELL), Math.floor(e.y / CELL)); if (!o) return;
    var dx = e.x - o.x, dy = e.y - o.y, m = o.r + (e.r || 7) * 0.8, l2 = dx * dx + dy * dy;
    if (l2 < m * m) { var l = Math.sqrt(l2) || 0.01; e.x = o.x + dx / l * m; e.y = o.y + dy / l * m; if (e.vx !== undefined) { var dot = e.vx * dx / l + e.vy * dy / l; if (dot < 0) { e.vx -= dot * dx / l; e.vy -= dot * dy / l; } } }
  };

  /* ---------- traps ---------- */
  function trapAt(gx, gy) {
    if (!d.trap) return null; var h = U.hash(gx * 3 + seed, gy + 11); if (h > 0.38) return null;
    var px = gx * TC + 40 + U.hash(gy + 5, gx) * (TC - 80), py = gy * TC + 40 + U.hash(gx, gy + 5) * (TC - 80);
    if (px * px + py * py < 170 * 170) return null;
    var kind = d.trap === 'both' ? (h < 0.19 ? 'spikes' : 'vent') : d.trap;
    return { x: px, y: py, kind: kind, ph: U.hash(gx + 3, gy + 3) * 3.6 };
  }
  var CYC = 3.6;
  function phase(t, T) { var c = (T + t.ph) % CYC; return c < 2.1 ? 0 : c < 2.7 ? 1 : c < 3.3 ? 2 : 0; } // 0 idle, 1 warning, 2 active
  LV.update = function (dt) {
    var G = CS.G, p = G.p, i, o, gx, gy;
    // traps hurt the player (and enemies) while active
    gx = Math.floor(p.x / TC); gy = Math.floor(p.y / TC);
    for (var ox = -1; ox <= 1; ox++) for (var oy = -1; oy <= 1; oy++) {
      var t = trapAt(gx + ox, gy + oy); if (!t) continue; var ph = phase(t, G.t); if (ph !== 2) continue;
      var dx = p.x - t.x, dy = p.y - t.y, rr = t.kind === 'vent' ? 22 : 18;
      if (dx * dx + dy * dy < (rr + p.r) * (rr + p.r)) G.hurtPlayer((t.kind === 'vent' ? 13 : 11) * G.dmgScale(), t.x, t.y, 'trap');
    }
    var ex = G.frame % 6; if (ex === 0) { // enemies near the player also get scorched
      var l = G.nearList(p.x, p.y, 420), q; for (q = 0; q < l.length; q++) { var e = l[q]; if (e.dead || e.boss) continue; var t2 = trapAt(Math.floor(e.x / TC), Math.floor(e.y / TC)); if (!t2 || phase(t2, G.t) !== 2) continue; var ddx = e.x - t2.x, ddy = e.y - t2.y; if (ddx * ddx + ddy * ddy < 26 * 26) G.hit(e, 14 + 4 * st, { src: 'trap', type: 'fire', noCrit: true, quiet: true, kb: 120, dx: Math.sign(ddx), dy: Math.sign(ddy) }); }
    }
    // weather
    var T = G.t, k, pt, vx = -p.vx * dt * 0.35, vy = -p.vy * dt * 0.35;
    for (k = 0; k < parts.length; k++) {
      pt = parts[k]; pt.x += vx; pt.y += vy;
      switch (d.wx) {
        case 'rain': pt.y += (520 + pt.s * 260) * dt; pt.x -= 90 * dt; break;
        case 'digital': pt.y += (260 + pt.s * 300) * dt; break;
        case 'snow': pt.y += (40 + pt.s * 50) * dt; pt.x += Math.sin(T * 1.2 + pt.a) * 30 * dt - 20 * dt; break;
        case 'embers': pt.y -= (30 + pt.s * 60) * dt; pt.x += Math.sin(T * 2 + pt.a) * 25 * dt; break;
        case 'spores': pt.y -= (8 + pt.s * 14) * dt; pt.x += Math.sin(T * 0.8 + pt.a) * 20 * dt; break;
        case 'debris': pt.x -= (20 + pt.s * 50) * dt; pt.y += (6 + pt.s * 12) * dt; break;
        case 'dust': pt.x += Math.sin(T * 0.5 + pt.a) * 10 * dt; pt.y -= (6 + pt.s * 10) * dt; break;
        case 'plasma': pt.y -= (40 + pt.s * 80) * dt; pt.x += Math.sin(T * 3 + pt.a) * 30 * dt; break;
        case 'ash': pt.y += (22 + pt.s * 30) * dt; pt.x += Math.sin(T + pt.a) * 14 * dt; break;
        case 'fog': pt.x += (6 + pt.s * 10) * dt; break;
      }
      if (pt.x < -40) pt.x += W + 80; else if (pt.x > W + 40) pt.x -= W + 80; if (pt.y < -40) pt.y += H + 80; else if (pt.y > H + 40) pt.y -= H + 80;
    }
    if (d.flash && !CS.save.d.set.safe) { flashT -= dt; if (flashT <= 0) { flashT = d.flash * (0.6 + Math.random() * 0.8); flashA = 0.35; AU.sfx('zap', 0.5); } if (flashA > 0) flashA -= dt * 1.4; }
  };

  /* ---------- drawing: ground layer (traps, barriers) ---------- */
  function spr(key) { var s = A.spr[key]; return s && !s.proc ? s : null; }
  LV.drawGround = function (ctx, cx, cy) {
    var G = CS.G, T = G.t, x0 = Math.floor(cx / TC) - 1, x1 = Math.floor((cx + W) / TC) + 1, y0 = Math.floor(cy / TC) - 1, y1 = Math.floor((cy + H) / TC) + 1, gx, gy, t, X, Y;
    if (d.trap) for (gx = x0; gx <= x1; gx++) for (gy = y0; gy <= y1; gy++) {
      t = trapAt(gx, gy); if (!t) continue; X = Math.round(t.x - cx); Y = Math.round(t.y - cy); var ph = phase(t, T), s1 = spr('trap_plate'), s2 = spr('trap_spikes'), s3 = spr('trap_vent'), col = d.tc;
      if (t.kind === 'spikes') {
        if (ph === 2 && s2) A.draw(ctx, 'trap_spikes', X, Y); else if (s1) A.draw(ctx, 'trap_plate', X, Y);
        else { ctx.fillStyle = '#2a2f40'; ctx.fillRect(X - 14, Y - 10, 28, 20); ctx.fillStyle = '#10131f'; for (var q = 0; q < 6; q++) ctx.fillRect(X - 11 + (q % 3) * 9, Y - 6 + (q >> 1) * 6 - (ph === 2 ? 5 : 0), 3, ph === 2 ? 11 : 3); if (ph === 2) { ctx.fillStyle = '#e8eeff'; for (q = 0; q < 6; q++) ctx.fillRect(X - 11 + (q % 3) * 9, Y - 11 + (q >> 1) * 6, 3, 4); } }
      } else {
        if (s3) A.draw(ctx, 'trap_vent', X, Y); else { ctx.fillStyle = '#2a2f40'; ctx.fillRect(X - 15, Y - 11, 30, 22); ctx.fillStyle = '#0a0c14'; for (q = 0; q < 4; q++) ctx.fillRect(X - 11 + q * 6, Y - 7, 3, 14); }
        if (ph === 2) { ctx.globalCompositeOperation = 'lighter'; var h = 34 + 10 * Math.sin(T * 25), vc = d.wx === 'rain' ? '#6bff3c' : d.wx === 'plasma' ? '#ff3c8a' : '#ff8a2a'; CS.V.add(ctx, 'fx_flame', vc, X, Y - h * 0.45, h * 0.9, h, 0, 0.95); CS.V.add(ctx, 'fx_orb', vc, X, Y, 46, 46, 0, 0.55); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
      }
      if (ph === 1) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + 0.4 * Math.sin(T * 30); ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(X, Y, 18, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    }
    // barriers
    x0 = Math.floor(cx / CELL) - 1; x1 = Math.floor((cx + W) / CELL) + 1; y0 = Math.floor(cy / CELL) - 1; y1 = Math.floor((cy + H) / CELL) + 2;
    var key = 'obs_' + st, sp = spr(key), list = [], o;
    for (gx = x0; gx <= x1; gx++) for (gy = y0; gy <= y1; gy++) { o = obsAt(gx, gy); if (o) list.push(o); }
    list.sort(function (a, b) { return a.y - b.y; });
    for (var i = 0; i < list.length; i++) {
      o = list[i]; X = Math.round(o.x - cx); Y = Math.round(o.y - cy);
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(X, Y + 10, 20, 6, 0, 0, TAU); ctx.fill();
      if (sp) A.draw(ctx, key, X, Y - sp.dh / 2 + 14, o.v > 0.5);
      else { ctx.fillStyle = '#1c2236'; ctx.fillRect(X - 14, Y - 26, 28, 38); ctx.fillStyle = d.tc; ctx.fillRect(X - 14, Y - 26, 28, 3); ctx.fillRect(X - 14, Y - 26, 3, 38); ctx.globalAlpha = 0.6; ctx.fillRect(X - 5, Y - 14, 10, 16); ctx.globalAlpha = 1; }
    }
  };

  /* ---------- screen-space weather + mood ---------- */
  LV.drawWeather = function (ctx) {
    if (!d) return; var T = CS.G.t, k, pt, w = d.wx;
    ctx.fillStyle = d.tint; ctx.fillRect(0, 0, W, H);
    if (w === 'fog') { ctx.globalCompositeOperation = 'lighter'; for (k = 0; k < parts.length; k++) { pt = parts[k]; ctx.globalAlpha = 0.07; ctx.drawImage(A.glow('#8a6aff'), Math.round(pt.x - 160), Math.round(pt.y - 100), 320, 200); } ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return; }
    if (w === 'dust') { ctx.globalCompositeOperation = 'lighter'; for (k = 0; k < 3; k++) { var bx = ((k * 330 + T * 14) % (W + 300)) - 150; var lg = ctx.createLinearGradient(bx, 0, bx + 160, H); lg.addColorStop(0, 'rgba(255,220,140,0)'); lg.addColorStop(0.5, 'rgba(255,220,140,.07)'); lg.addColorStop(1, 'rgba(255,220,140,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.moveTo(bx, 0); ctx.lineTo(bx + 90, 0); ctx.lineTo(bx + 330, H); ctx.lineTo(bx + 200, H); ctx.fill(); } ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalCompositeOperation = 'lighter';
    for (k = 0; k < parts.length; k++) {
      pt = parts[k]; var x = Math.round(pt.x), y = Math.round(pt.y);
      switch (w) {
        case 'rain': ctx.fillStyle = 'rgba(140,255,110,' + (0.25 + pt.s * 0.3) + ')'; ctx.fillRect(x, y, 1, 7 + (pt.s * 6 | 0)); break;
        case 'digital': ctx.fillStyle = 'rgba(80,220,255,' + (0.2 + pt.s * 0.4) + ')'; ctx.fillRect(x, y, 2, 6 + (pt.s * 14 | 0)); ctx.fillStyle = 'rgba(220,255,255,.7)'; ctx.fillRect(x, y + 6 + (pt.s * 14 | 0), 2, 2); break;
        case 'snow': ctx.fillStyle = 'rgba(235,248,255,' + (0.4 + pt.s * 0.5) + ')'; ctx.fillRect(x, y, 2 + (pt.s > 0.7 ? 1 : 0), 2 + (pt.s > 0.7 ? 1 : 0)); break;
        case 'embers': ctx.fillStyle = pt.s > 0.5 ? 'rgba(255,170,60,.85)' : 'rgba(255,90,20,.7)'; ctx.fillRect(x, y, 2, 2); break;
        case 'spores': ctx.fillStyle = 'rgba(255,120,170,' + (0.2 + 0.3 * Math.sin(T * 2 + pt.a) ** 2) + ')'; ctx.fillRect(x, y, 3, 3); break;
        case 'debris': ctx.fillStyle = 'rgba(190,205,255,' + (0.3 + pt.s * 0.4) + ')'; ctx.fillRect(x, y, 1 + (pt.s > 0.8 ? 1 : 0), 1); break;
        case 'dust': ctx.fillStyle = 'rgba(255,225,150,' + (0.25 + 0.3 * Math.sin(T + pt.a) ** 2) + ')'; ctx.fillRect(x, y, 2, 2); break;
        case 'plasma': ctx.fillStyle = pt.s > 0.5 ? 'rgba(255,70,150,.7)' : 'rgba(170,90,255,.7)'; ctx.fillRect(x, y, 2, 2); break;
        case 'ash': ctx.fillStyle = pt.s > 0.6 ? 'rgba(255,205,80,.8)' : 'rgba(255,90,60,.6)'; ctx.fillRect(x, y, 2, 2); break;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    if (flashA > 0) { ctx.globalAlpha = flashA; ctx.fillStyle = d.tc; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  };
})();
