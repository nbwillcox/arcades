/* Procedural cartoon sprites built from boxes / balls in the oblique projection: houses, rider, cars, dogs, props, bosses. */
(function (G) {
  'use strict';
  const C = G.C, g = G.gfx, U = G.U;
  let ctx = null;
  const Sp = {};
  Sp.setCtx = (c) => { ctx = c; g.setCtx(c); };
  const hsl = g.hsl;
  const flash = (c, f) => (f > 0 ? [c[0], c[1] * 0.3, 88] : c);

  /* ---------------- houses ---------------- */
  Sp.house = function (h, time) {
    const s = h.side, WX = s * C.WALL, H = 46 + (h.style === 1 ? 6 : 0), z0 = h.z0, z1 = h.z1, zc = h.zc;
    const w = h.wall, dim = h.sub && !h.cancelled ? 0 : -6, wallC = [w[0], w[1], w[2] + dim], roofC = h.roof, trim = h.trim;
    const wob = h.happy > 0 ? Math.sin(time * 18) * 0.6 : 0;
    /* body for left houses: end wall visible */
    if (s < 0) g.poly([WX, z0, 0, WX - 60, z0, 0, WX - 60, z0, H, WX, z0, H], hsl(wallC[0], wallC[1], wallC[2] - 12), g.EDGE);
    /* facade */
    g.poly([WX, z0, 0, WX, z1, 0, WX, z1, H, WX, z0, H], hsl(wallC[0], wallC[1], wallC[2]), g.EDGE, 1.4);
    ctx.strokeStyle = 'rgba(20,10,50,0.14)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let y = 8; y < H; y += 7) { g.pr(WX, z0, y); ctx.moveTo(g.X, g.Y); g.pr(WX, z1, y); ctx.lineTo(g.X, g.Y); }
    ctx.stroke();
    g.poly([WX, z0, 0, WX, z1, 0, WX, z1, 4, WX, z0, 4], hsl(wallC[0], wallC[1] - 10, wallC[2] - 22), null);
    /* roof */
    if (h.style === 0) {
      if (s < 0) {
        g.poly([WX, z0, H, WX - 60, z0, H, WX - 30, z0, H + 17], hsl(wallC[0], wallC[1], wallC[2] - 8), g.EDGE);
        g.poly([WX + 2, z0 - 3, H - 1, WX + 2, z1 + 3, H - 1, WX - 30, z1 + 3, H + 17, WX - 30, z0 - 3, H + 17], hsl(roofC[0], roofC[1], roofC[2]), g.EDGE, 1.4);
        g.box(WX - 40, z0 + 9, H + 6, 5, 5, 12, [20, 30, 36]);
      } else {
        g.poly([WX + 1, z0 - 3, H - 2, WX + 1, z1 + 3, H - 2, WX + 1, z1 + 3, H + 15, WX + 1, z0 - 3, H + 15], hsl(roofC[0], roofC[1], roofC[2]), g.EDGE, 1.4);
        g.poly([WX + 1, z0 - 3, H + 11, WX + 1, z1 + 3, H + 11, WX + 1, z1 + 3, H + 15, WX + 1, z0 - 3, H + 15], hsl(roofC[0], roofC[1], roofC[2] + 10), null);
        g.box(WX + 6, z0 + 9, H + 4, 5, 5, 12, [20, 30, 36]);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath();
      for (let z = z0; z < z1 + 3; z += 6) { g.pr(WX + (s < 0 ? 2 : 1), z, H); ctx.moveTo(g.X, g.Y); g.pr(WX + (s < 0 ? -30 : 1), z, s < 0 ? H + 17 : H + 15); ctx.lineTo(g.X, g.Y); }
      ctx.stroke();
    } else if (h.style === 1) {
      if (s < 0) g.poly([WX, z0, H, WX - 60, z0, H, WX - 60, z1, H, WX, z1, H], hsl(roofC[0], roofC[1], roofC[2] + 6), g.EDGE);
      g.poly([WX, z0 - 1, H - 1, WX, z1 + 1, H - 1, WX, z1 + 1, H + 5, WX, z0 - 1, H + 5], hsl(trim[0], 10, 82), g.EDGE);
      g.poly([WX, z0 - 1, H + 3, WX, z1 + 1, H + 3, WX, z1 + 1, H + 5, WX, z0 - 1, H + 5], hsl(185 + Math.sin(time * 2) * 10, 95, 62), null);
      g.pr(WX + s * 22, zc, H + 5); ctx.beginPath(); ctx.ellipse(g.X, g.Y, 17, 9, 0, 0, 6.2832); ctx.fillStyle = 'rgba(120,255,235,0.45)'; ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(g.X, g.Y - 6, 17, 13, 0, Math.PI, 0); ctx.fillStyle = 'rgba(120,255,235,0.55)'; ctx.fill(); ctx.stroke();
    } else {
      g.pr(WX, z0 - 4, H); const ax = g.X, ay = g.Y; g.pr(WX, z1 + 4, H); const bx = g.X, by = g.Y; g.pr(WX, zc, H + 36); const cx = g.X, cy = g.Y;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, bx, by); ctx.closePath(); ctx.fillStyle = hsl(roofC[0], roofC[1], roofC[2] + 4); ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.beginPath(); ctx.moveTo((ax + cx) / 2, (ay + cy) / 2 + 2); ctx.quadraticCurveTo(cx, cy + 3, (bx + cx) / 2, (by + cy) / 2 + 2); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
      g.pr(WX, zc, H + 26); const tx = g.X, ty = g.Y; g.pr(WX, zc, H + 44); ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(g.X, g.Y); ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(g.X, g.Y, 3.2, 0, 6.2832); ctx.fillStyle = (Math.sin(time * 5 + h.id) > 0) ? '#ff5a5a' : '#ffd24a'; ctx.fill();
    }
    /* windows */
    for (const wd of h.windows) {
      const u0 = wd.z - wd.w / 2, u1 = wd.z + wd.w / 2;
      g.poly([WX, u0 - 1.5, wd.y0 - 1.5, WX, u1 + 1.5, wd.y0 - 1.5, WX, u1 + 1.5, wd.y1 + 1.5, WX, u0 - 1.5, wd.y1 + 1.5], hsl(trim[0], trim[1], trim[2]), g.EDGE);
      if (wd.broken) {
        g.poly([WX, u0, wd.y0, WX, u1, wd.y0, WX, u1, wd.y1, WX, u0, wd.y1], '#0a0620', null);
        ctx.fillStyle = '#bff3ff'; ctx.beginPath();
        g.pr(WX, u0, wd.y1); ctx.moveTo(g.X, g.Y); g.pr(WX, u0 + wd.w * 0.3, wd.y1 - 5); ctx.lineTo(g.X, g.Y); g.pr(WX, u0 + wd.w * 0.15, wd.y1 - 11); ctx.lineTo(g.X, g.Y); ctx.fill();
        g.pr(WX, u1, wd.y0); ctx.moveTo(g.X, g.Y); g.pr(WX, u1 - wd.w * 0.3, wd.y0 + 5); ctx.lineTo(g.X, g.Y); g.pr(WX, u1 - wd.w * 0.1, wd.y0 + 10); ctx.lineTo(g.X, g.Y); ctx.fill();
      } else {
        const lit = h.sub && !h.cancelled;
        g.poly([WX, u0, wd.y0, WX, u1, wd.y0, WX, u1, wd.y1, WX, u0, wd.y1], lit ? hsl(44, 95, 68) : hsl(205, 55, 24), null);
        g.poly([WX, u0, wd.y0 + (wd.y1 - wd.y0) * 0.55, WX, u1, wd.y0 + (wd.y1 - wd.y0) * 0.55, WX, u1, wd.y1, WX, u0, wd.y1], lit ? hsl(48, 95, 78) : hsl(210, 50, 34), null);
        ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1; ctx.beginPath(); g.pr(WX, wd.z, wd.y0); ctx.moveTo(g.X, g.Y); g.pr(WX, wd.z, wd.y1); ctx.lineTo(g.X, g.Y); g.pr(WX, u0, (wd.y0 + wd.y1) / 2); ctx.moveTo(g.X, g.Y); g.pr(WX, u1, (wd.y0 + wd.y1) / 2); ctx.lineTo(g.X, g.Y); ctx.stroke();
        if (!lit) { g.poly([WX, u0 + 1, wd.y1 - 1, WX, u0 + 5, wd.y1 - 1, WX, u0 + 2, wd.y0 + 1, WX, u0 + 1, wd.y0 + 1], 'rgba(255,255,255,0.18)', null); }
      }
    }
    /* door */
    const d = h.door, dc = [h.doorHue, 70, 46];
    g.poly([WX, d.z - 7.5, 0, WX, d.z + 7.5, 0, WX, d.z + 7.5, 29, WX, d.z - 7.5, 29], hsl(trim[0], trim[1], trim[2]), g.EDGE);
    g.poly([WX, d.z - 6, 0, WX, d.z + 6, 0, WX, d.z + 6, 27, WX, d.z - 6, 27], hsl(dc[0], dc[1], dc[2]), g.EDGE);
    g.poly([WX, d.z - 3.5, 15, WX, d.z + 3.5, 15, WX, d.z + 3.5, 23, WX, d.z - 3.5, 23], hsl(dc[0], dc[1], dc[2] - 14), null);
    g.ball(WX, d.z + 3.8, 13, 1.2, [48, 90, 62], false);
    if (d.hit) { d.hit = 0; }
    /* awning + porch light */
    g.box(s < 0 ? WX : WX - 13, zc - 10, 30, 13, 20, 2.5, [roofC[0], roofC[1], roofC[2] + 8]);
    if (h.sub && !h.cancelled) g.ball(WX, zc + 9, 24, 1.6, [50, 100, 70], false);
    /* roof status sign */
    if (h.sub) {
      const bob = Math.sin(time * 3 + h.id) * 2, col = h.cancelled ? '#ff5a5a' : h.delivered ? '#7dff9e' : '#ffe45a';
      g.pr(WX, zc, H + 36 + bob); const sx = g.X, sy = g.Y;
      ctx.fillStyle = 'rgba(12,6,40,0.78)'; ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(sx - 15, sy - 11, 30, 22, 5); ctx.fill(); ctx.stroke();
      g.text(h.cancelled ? '✕' : h.delivered ? '✓' : '★', sx, sy + 1, 17, col, 'center', false);
    }
    /* neighbour face in the window */
    if (h.face > 0) {
      const w2 = h.windows[1] || h.windows[0]; g.pr(WX, w2.z, (w2.y0 + w2.y1) / 2 + Math.sin(time * 30) * 0.8);
      ctx.beginPath(); ctx.arc(g.X, g.Y, 9, 0, 6.2832); ctx.fillStyle = h.sub ? '#ffd0a0' : '#ff7a5a'; ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(g.X - 7, g.Y - 6); ctx.lineTo(g.X - 1, g.Y - 3); ctx.moveTo(g.X + 7, g.Y - 6); ctx.lineTo(g.X + 1, g.Y - 3); ctx.stroke();
      ctx.fillStyle = '#000'; ctx.fillRect(g.X - 4, g.Y - 2, 2, 2); ctx.fillRect(g.X + 2, g.Y - 2, 2, 2);
      ctx.beginPath(); ctx.arc(g.X, g.Y + 6, 3, Math.PI, 0); ctx.stroke();
    }
    void wob;
  };

  /* lawn / porch decals drawn on the ground before entities */
  Sp.houseGround = function (h, time) {
    const s = h.side, W = C.WALL;
    g.poly([s * (C.SIDEW - 2), h.zc - 4, 0, s * (W - 44), h.zc - 4, 0, s * (W - 44), h.zc + 4, 0, s * (C.SIDEW - 2), h.zc + 4, 0], hsl(40, 12, 70), null);
    g.poly([s * (W - 44), h.zc - 22, 0, s * (W - 1), h.zc - 22, 0, s * (W - 1), h.zc + 22, 0, s * (W - 44), h.zc + 22, 0], hsl(h.sub ? 28 : 250, 18, h.sub ? 66 : 42), g.EDGE, 1);
    const pulse = h.sub && !h.delivered && !h.cancelled ? 0.5 + 0.5 * Math.sin(time * 5) : 0;
    g.poly([s * (W - 23), h.zc - 10, 0, s * (W - 5), h.zc - 10, 0, s * (W - 5), h.zc + 10, 0, s * (W - 23), h.zc + 10, 0], h.sub ? hsl(h.delivered ? 135 : 8, 70, 48 + pulse * 14) : hsl(250, 12, 34), g.EDGE, 1);
    if (h.sub && !h.cancelled) { g.pr(s * (W - 14), h.zc, 0); ctx.fillStyle = h.delivered ? '#eaffea' : 'rgba(255,255,255,' + (0.6 + pulse * 0.4).toFixed(2) + ')'; ctx.fillRect(g.X - 6, g.Y - 3, 12, 6); }
    /* driveway */
    g.poly([s * C.SIDEW, h.z1 + 3, 0, s * (W - 30), h.z1 + 3, 0, s * (W - 30), h.z1 + 20, 0, s * C.SIDEW, h.z1 + 20, 0], hsl(235, 8, 52), null);
  };

  Sp.mailbox = function (h, time) {
    const m = h.mailbox, x = m.x, z = m.z, bob = m.hit ? Math.sin(time * 40) * 0.8 : 0;
    g.shadow(x, z, 4, 0.25);
    g.box(x - 0.8, z - 0.8, 0, 1.6, 1.6, 9, [30, 25, 30]);
    const c = h.sub ? (h.cancelled ? [0, 60, 40] : [210, 70, 55]) : [270, 15, 48];
    g.box(x - 4, z - 5, 9 + bob, 8, 10, 7, c);
    g.pr(x, z, 17); ctx.beginPath(); ctx.arc(g.X, g.Y, 4.5, Math.PI, 0); ctx.fillStyle = hsl(c[0], c[1], c[2] + 8); ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.2; ctx.stroke();
    if (m.flag) g.box(x + 4, z + 1, 11, 1.4, 1.4, 8, [0, 85, 52]); else g.box(x + 4, z + 1, 11, 1.4, 1.4, 3, [0, 85, 52]);
    if (h.sub && !h.delivered && !h.cancelled) { g.pr(x, z, 26 + Math.sin(time * 5) * 2); ctx.fillStyle = '#ffe45a'; ctx.beginPath(); ctx.moveTo(g.X - 4, g.Y - 5); ctx.lineTo(g.X + 4, g.Y - 5); ctx.lineTo(g.X, g.Y + 1); ctx.fill(); }
  };

  /* ---------------- rider ---------------- */
  Sp.player = function (P, time, game) {
    const x = P.x, z = P.z, y = P.y, blink = P.inv > 0 && Math.floor(time * 14) % 2 === 0 && P.crash <= 0;
    if (blink) return;
    g.shadow(x, z, 9 - Math.min(5, y * 0.1), Math.max(0.1, 0.32 - y * 0.004));
    /* underglow */
    g.pr(x, z, y + 1); ctx.beginPath(); ctx.ellipse(g.X, g.Y + 3, 20, 9, 0, 0, 6.2832); ctx.fillStyle = 'rgba(70,235,255,' + (0.28 + 0.1 * Math.sin(time * 14)).toFixed(2) + ')'; ctx.fill();
    if (P.crash > 0) {
      const t = P.crash, sp = time * 12;
      g.box(x - 3.5 + Math.sin(sp) * 6, z - 10 + Math.cos(sp) * 8, y + 3, 7, 22, 2, [185, 70, 45]);
      g.ball(x, z, y + 9, 4.2, [28, 70, 80]);
      g.box(x - 2, z - 3, y + 1, 4, 6, 8, [350, 78, 52]);
      for (let k = 0; k < 4; k++) { const a = sp + k * 1.57; g.pr(x + Math.cos(a) * 9, z + Math.sin(a) * 7, y + 22); g.text('★', g.X, g.Y, 10, '#ffe45a', 'center', false); }
      void t; return;
    }
    const lean = P.lean * 2.2;
    g.box(x - 3.5, z - 11, y + 3, 7, 22, 2.4, [185, 72, 46]);
    g.box(x - 3.9, z + 6, y + 4, 7.8, 5, 1.6, [48, 95, 58]);
    /* legs */
    g.box(x - 1.6 + lean * 0.3, z - 5, y + 5.4, 2.4, 2.6, 6, [225, 60, 38]);
    g.box(x - 1.6 + lean * 0.3, z + 2.5, y + 5.4, 2.4, 2.6, 6, [225, 60, 38]);
    /* satchel (back) */
    g.box(x - 4, z - 9.5, y + 10, 6, 3.2, 7.5, [35, 55, 50]);
    for (let k = 0; k < 3; k++) { g.pr(x - 1 + k * 1.2, z - 11.5, y + 18 + k * 0.5); ctx.fillStyle = '#f5f0e0'; ctx.fillRect(g.X - 1.5, g.Y - 6, 3.4, 6); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 0.8; ctx.strokeRect(g.X - 1.5, g.Y - 6, 3.4, 6); }
    /* torso */
    g.box(x - 2.4 + lean * 0.6, z - 3.6, y + 11, 4.8, 7.2, 9, [352, 78, 52]);
    g.box(x - 2.4 + lean * 0.6, z - 3.6, y + 11, 4.8, 7.2, 2, [48, 90, 60]);
    /* arms */
    const th = P.throwT;
    g.pr(x + lean * 0.8, z, y + 18); const shx = g.X, shy = g.Y;
    if (th > 0) {
      const k = 1 - th / 0.28, reach = Math.sin(Math.min(1, k * 1.4) * 1.57) * 11 * P.throwSide;
      g.pr(x + reach, z + 1, y + 20 + (k < 0.5 ? 2 : 0)); ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(g.X, g.Y); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 5.5; ctx.lineCap = 'round'; ctx.stroke(); ctx.strokeStyle = '#ffd0a8'; ctx.lineWidth = 3.4; ctx.stroke(); ctx.lineCap = 'butt';
      if (k < 0.45) { ctx.fillStyle = '#fff'; ctx.fillRect(g.X - 3, g.Y - 2, 6, 4); }
    } else {
      g.pr(x + lean * 0.8 + 2.5, z + 2, y + 12); ctx.beginPath(); ctx.moveTo(shx, shy); ctx.lineTo(g.X, g.Y); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = '#ffd0a8'; ctx.lineWidth = 3; ctx.stroke();
    }
    /* head + helmet */
    g.ball(x + lean, z, y + 25, 4.2, [28, 70, 82], false);
    g.pr(x + lean, z, y + 25); const hx = g.X, hy = g.Y;
    ctx.fillStyle = '#2a1a10'; ctx.fillRect(hx + 1, hy - 2, 2.2, 2.2); ctx.fillRect(hx + 5, hy - 2, 2.2, 2.2);
    ctx.beginPath(); ctx.arc(hx + 4, hy + 2.4, 2.6, 0.1, Math.PI - 0.1); ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 1.3; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx, hy, 11.4, 0, 6.2832); ctx.fillStyle = 'rgba(150,230,255,0.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(210,245,255,0.85)'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(hx - 3, hy - 4, 4, 3.6, 4.9); ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e03a3a'; ctx.beginPath(); ctx.ellipse(hx - 1, hy - 7.5, 8, 4, -0.15, Math.PI, 0); ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#c42828'; ctx.fillRect(hx + 3, hy - 7.5, 8, 2.4);
    if (P.pw.shield > 0) { const a = P.pw.shield < 2 ? (Math.floor(time * 12) % 2 ? 0.5 : 0.15) : 0.5; g.pr(x, z, y + 14); ctx.beginPath(); ctx.arc(g.X, g.Y, 26, 0, 6.2832); ctx.fillStyle = 'rgba(90,208,255,' + (a * 0.35).toFixed(2) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(160,235,255,' + a.toFixed(2) + ')'; ctx.lineWidth = 2.5; ctx.stroke(); }
    if (P.pw.speed > 0) { for (let k = 1; k < 4; k++) { g.pr(x, z - k * 9, y + 6); ctx.strokeStyle = 'rgba(255,170,60,' + (0.5 - k * 0.12) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(g.X - 6, g.Y); ctx.lineTo(g.X + 6, g.Y - 5); ctx.stroke(); } }
    void game;
  };

  /* ---------------- traffic / creatures ---------------- */
  Sp.car = function (c, time) {
    const hue = c.hue, bodyC = [hue, 78, 52], big = c.type === 'bus', van = c.type === 'van';
    const L = c.len, Wd = c.wid, hh = big ? 11 : 6, ch = big ? 6 : van ? 7 : 6.5;
    if (c.dead && c.fly) { g.shadow(c.x, c.z, 10, 0.2); const k = c.fly; c.x += (c.cross ? 0 : 0); }
    const dy = c.dead ? Math.min(40, (c.fly || 1) * 18) : 0;
    g.shadow(c.x, c.z, Math.max(Wd, L / 2) * 0.75, 0.3);
    g.pr(c.x, c.z, 1); ctx.beginPath(); ctx.ellipse(g.X, g.Y + 2, L * 0.7, Wd * 0.65, 0, 0, 6.2832); ctx.fillStyle = 'rgba(90,240,255,0.26)'; ctx.fill();
    if (c.cross) {
      g.box(c.x - L / 2, c.z - Wd / 2, 2 + dy, L, Wd, hh, bodyC);
      g.box(c.x - L * 0.3 + (c.vx > 0 ? -2 : 2), c.z - Wd / 2 + 1, 2 + hh + dy, L * 0.55, Wd - 2, ch, [hue, 40, 80]);
      g.pr(c.x + (c.vx > 0 ? L / 2 : -L / 2), c.z, 5 + dy); ctx.fillStyle = '#fff6b0'; ctx.fillRect(g.X - 2, g.Y - 3, 4, 4);
    } else {
      g.box(c.x - Wd / 2, c.z - L / 2, 2 + dy, Wd, L, hh, bodyC);
      g.box(c.x - Wd / 2 + 1, c.z - L * 0.3, 2 + hh + dy, Wd - 2, L * (big ? 0.8 : 0.55), ch, [hue, 40, 80]);
      if (big) { ctx.strokeStyle = 'rgba(20,10,50,0.5)'; ctx.lineWidth = 1; for (let k = 0; k < 5; k++) { g.pr(c.x + Wd / 2 - 1, c.z - 14 + k * 7, 8 + dy); ctx.strokeRect(g.X - 2, g.Y - 5, 4, 5); } }
      if (c.vz < 0) { for (const sx of [-1, 1]) { g.pr(c.x + sx * Wd * 0.32, c.z - L / 2, 5 + dy); ctx.fillStyle = '#fff6b0'; ctx.fillRect(g.X - 2.2, g.Y - 2, 4.4, 3.4); } }
      else { g.pr(c.x, c.z - L / 2, 5 + dy); ctx.fillStyle = '#ff4a4a'; ctx.fillRect(g.X - 5, g.Y - 2, 10, 3); }
    }
    if (c.honk > 0) { g.pr(c.x, c.z, hh + ch + 14); g.text('HONK!', g.X, g.Y, 13, '#ffe45a', 'center'); }
    void time;
  };

  Sp.dog = function (d, time) {
    if (d.dead) return;
    const stun = d.state === 'stunned', dir = d.vz < -1 ? -1 : 1, run = d.state === 'chase' || d.state === 'return';
    const x = d.x, z = d.z, c = [d.hue, 55, 55], leg = run ? Math.sin(d.anim * 1.6) * 3 : 0;
    g.shadow(x, z, 7, 0.28);
    for (const q of [[-1.8, -4], [1.8, -4], [-1.8, 4], [1.8, 4]]) { const off = ((q[0] > 0) !== (q[1] > 0)) ? leg : -leg; g.box(x + q[0] - 0.8, z + q[1] * dir - 1 + off * 0.5, 0, 1.6, 2, 4, [c[0], c[1], c[2] - 14]); }
    g.box(x - 3, z - 6, 3.5, 6, 12, 5.5, c);
    g.box(x - 2.6, z - 3, 8.6, 5.2, 6, 1.6, [c[0], c[1], c[2] + 20]);
    const hz = z + 7 * dir, hy = 8.5 + (stun ? -1 : 0);
    g.box(x - 1.3, hz + (dir > 0 ? 1.5 : -4.5), hy - 1, 2.6, 3, 2.2, [c[0], c[1], c[2] + 12]);
    g.ball(x, hz, hy + 1.5, 3.6, c, false);
    g.box(x + 1, hz - 1, hy + 4.8, 1.4, 1.2, 2.6, [c[0], c[1], c[2] - 20]);
    g.pr(x, hz, hy + 1.5); ctx.beginPath(); ctx.arc(g.X, g.Y, 9.2, 0, 6.2832); ctx.fillStyle = 'rgba(160,230,255,0.2)'; ctx.fill(); ctx.strokeStyle = 'rgba(220,248,255,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.fillStyle = '#111'; if (stun) { ctx.font = '900 7px sans-serif'; ctx.fillText('x  x', g.X - 1, g.Y - 1); } else { ctx.fillRect(g.X + 1, g.Y - 2, 2, 2); ctx.fillRect(g.X + 4, g.Y - 2, 2, 2); }
    const tw = Math.sin(time * (run ? 24 : 6)) * 2;
    g.pr(x, z - 6 * dir, 8); ctx.beginPath(); ctx.moveTo(g.X, g.Y); ctx.lineTo(g.X + tw, g.Y - 7); ctx.strokeStyle = g.hsl(c[0], c[1], c[2] - 10); ctx.lineWidth = 2.4; ctx.stroke();
    if (d.bark > 0 || d.state === 'chase') { g.pr(x, z, 22); g.text(stun ? '' : d.bark > 0 ? 'WOOF!' : '!', g.X, g.Y, d.bark > 0 ? 12 : 16, '#ff6a5a', 'center'); }
    if (stun) { for (let k = 0; k < 3; k++) { const a = time * 7 + k * 2.1; g.pr(x + Math.cos(a) * 6, z + Math.sin(a) * 5, 17); g.text('★', g.X, g.Y, 8, '#ffe45a', 'center', false); } }
  };

  Sp.mover = function (m, time) {
    if (m.dead) return;
    if (m.t === 'skater') {
      g.shadow(m.x, m.z, 6, 0.25);
      g.box(m.x - 2.5, m.z - 6, 1.6, 5, 12, 1.4, [m.hue, 70, 50]);
      g.box(m.x - 1.5, m.z - 2, 3, 3, 4, 7, [m.hue + 120, 60, 48]);
      g.ball(m.x, m.z, 13, 3.3, [100, 50, 62]);
      g.pr(m.x, m.z, 13); ctx.fillStyle = '#111'; ctx.fillRect(g.X + 1, g.Y - 1, 1.6, 1.6); ctx.fillRect(g.X + 4, g.Y - 1, 1.6, 1.6);
      g.box(m.x - 3.4, m.z - 3.5, 15.6, 6.8, 7, 1.8, [m.hue, 70, 50]);
    } else {
      g.shadow(m.x, m.z, 10, 0.28);
      g.box(m.x - 7, m.z - 8, 2, 14, 16, 8, [m.stun > 0 ? 200 : 120, 70, 48]);
      g.box(m.x - 5, m.z - 5, 10, 10, 10, 3, [120, 40, 70]);
      g.pr(m.x, m.z, 6); ctx.save(); ctx.translate(g.X, g.Y + 4); ctx.scale(1, 0.5); ctx.rotate(time * 30); ctx.fillStyle = '#ddd'; ctx.fillRect(-14, -1.5, 28, 3); ctx.fillRect(-1.5, -14, 3, 28); ctx.restore();
      g.pr(m.x + 7, m.z, 8); ctx.fillStyle = '#ff3a3a'; ctx.fillRect(g.X - 1, g.Y - 1, 3, 3);
    }
  };

  Sp.ufo = function (u, time) {
    if (u.dead) return;
    const y = u.y + Math.sin(u.ph * 2) * 3;
    if (u.beam > 0) {
      g.pr(u.x, u.z, y); const tx = g.X, ty = g.Y; g.pr(u.x - 22, u.z, 0); const lx = g.X, ly = g.Y; g.pr(u.x + 22, u.z, 0); const rx = g.X, ry = g.Y;
      const gr = ctx.createLinearGradient(0, ty, 0, ly); gr.addColorStop(0, 'rgba(160,255,230,' + (0.5 * u.beam).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(160,255,230,' + (0.1 * u.beam).toFixed(2) + ')');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(tx - 6, ty); ctx.lineTo(tx + 6, ty); ctx.lineTo(rx + 8, ry + 2); ctx.lineTo(lx - 8, ly + 2); ctx.closePath(); ctx.fill();
      g.ring(u.x, u.z, 0, 22, 'rgba(180,255,235,0.8)', 2.5, u.beam);
    }
    g.shadow(u.x, u.z, 14, 0.18);
    g.pr(u.x, u.z, y); ctx.beginPath(); ctx.ellipse(g.X, g.Y, 30, 11, 0, 0, 6.2832); ctx.fillStyle = '#9aa6c8'; ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(g.X, g.Y - 3, 30, 8, 0, Math.PI, 0); ctx.fillStyle = '#c9d2ee'; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(g.X, g.Y - 6, 13, 11, 0, Math.PI, 0); ctx.fillStyle = 'rgba(140,255,230,0.65)'; ctx.fill(); ctx.stroke();
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.arc(g.X - 20 + k * 10, g.Y + 1.5, 2.2, 0, 6.2832); ctx.fillStyle = (Math.floor(time * 6) + k) % 2 ? '#ff5ad0' : '#ffe45a'; ctx.fill(); }
    ctx.beginPath(); ctx.arc(g.X, g.Y - 8, 3.5, 0, 6.2832); ctx.fillStyle = '#7dff4a'; ctx.fill(); ctx.stroke();
  };

  /* ---------------- props ---------------- */
  Sp.deco = function (o, time) {
    if (o.dead) return;
    switch (o.t) {
      case 'tree': {
        g.shadow(o.x, o.z, 11, 0.28); g.cyl(o.x, o.z, 0, 2, 12, [28, 45, 32]);
        const k = o.kind, hue = [165, 300, 45][k], sway = Math.sin(time * 1.4 + o.z) * 1.2;
        g.ball(o.x + sway, o.z, 24, 11, [hue, 62, 48]); g.ball(o.x + 5 + sway, o.z, 29, 6, [hue + 20, 70, 58]);
        if (k === 1) for (let q = 0; q < 4; q++) { g.pr(o.x + Math.cos(q * 1.6 + time) * 11, o.z + Math.sin(q * 1.6 + time) * 8, 24 + q * 2); ctx.fillStyle = '#fff8c0'; ctx.fillRect(g.X, g.Y, 2, 2); }
        break; }
      case 'gnome': g.shadow(o.x, o.z, 4, 0.25); g.box(o.x - 2, o.z - 2, 0, 4, 4, 5, [210, 60, 42]); g.ball(o.x, o.z, 7, 2.4, [28, 70, 80], false); g.cyl(o.x, o.z, 8, 2.4, 1.2, [0, 80, 52]); g.cyl(o.x, o.z, 9, 1.4, 4.5, [0, 85, 52]); g.pr(o.x, o.z, 7); ctx.fillStyle = '#fff'; ctx.fillRect(g.X - 2, g.Y + 1, 5, 4); break;
      case 'trash': g.shadow(o.x, o.z, 6, 0.25); g.cyl(o.x, o.z, 0, 4.4, 9, [210, 12, 52]); g.cyl(o.x, o.z, 9, 4.8, 1.6, [210, 12, 60]); break;
      case 'hydrant': g.shadow(o.x, o.z, 5, 0.25); g.cyl(o.x, o.z, 0, 2.8, 7, [0, 82, 50]); g.ball(o.x, o.z, 8, 3, [0, 82, 54], false); g.box(o.x - 4.5, o.z - 1.1, 3.5, 9, 2.2, 2, [0, 82, 48]); break;
      case 'cone': g.shadow(o.x, o.z, 4, 0.25); g.cyl(o.x, o.z, 0, 4, 1.2, [25, 90, 50]); g.cyl(o.x, o.z, 1, 2.6, 4.5, [25, 95, 55]); g.cyl(o.x, o.z, 5, 1.4, 3, [25, 95, 58]); g.pr(o.x, o.z, 4); ctx.fillStyle = '#fff'; ctx.fillRect(g.X - 3, g.Y - 1, 6, 2); break;
      case 'fence': for (let z = o.z; z < o.z1; z += 4) { g.box(o.x - 1, z, 0, 2, 2.4, 8, [40, 20, 86]); } g.box(o.x - 0.8, o.z, 5, 1.6, o.z1 - o.z, 1.6, [40, 20, 76]); break;
      case 'parked': {
        const bodyC = [o.hue, 70, 50], sh = o.hit > 0 ? Math.sin(time * 40) * 0.8 : 0;
        g.shadow(o.x, o.z, 13, 0.3); g.box(o.x - 7 + sh, o.z - 11, 2, 14, 22, 6, bodyC); g.box(o.x - 6 + sh, o.z - 6, 8, 12, 12, 6, [o.hue, 40, 80]);
        g.pr(o.x, o.z - 11, 5); ctx.fillStyle = o.hit > 0 ? '#ffe45a' : '#fff6b0'; ctx.fillRect(g.X - 5, g.Y - 2, 3, 3); ctx.fillRect(g.X + 2, g.Y - 2, 3, 3);
        if (o.hit > 0) { g.pr(o.x, o.z, 24); g.text('BEEP!', g.X, g.Y, 12, '#ffe45a', 'center'); }
        break; }
      case 'sprinkler': {
        g.disc(o.x, o.z, 0, 12, 'rgba(120,200,255,0.16)'); g.cyl(o.x, o.z, 0, 2, 2.5, [200, 20, 50]);
        ctx.strokeStyle = 'rgba(170,230,255,0.85)'; ctx.lineWidth = 1.8;
        for (let k = 0; k < 6; k++) { const a = time * 3 + o.ph + k * 1.05, r = 9 + (k % 2) * 3; g.pr(o.x, o.z, 3); ctx.beginPath(); ctx.moveTo(g.X, g.Y); g.pr(o.x + Math.cos(a) * r, o.z + Math.sin(a) * r, 2); const ex = g.X, ey = g.Y; g.pr(o.x + Math.cos(a) * r * 0.5, o.z + Math.sin(a) * r * 0.5, 9); ctx.quadraticCurveTo(g.X, g.Y, ex, ey); ctx.stroke(); }
        break; }
      case 'ramp': {
        const x0 = o.x - 11, x1 = o.x + 11, z0 = o.z - 9, z1 = o.z + 9;
        g.shadow(o.x, o.z, 12, 0.25);
        g.poly([x1, z0, 0, x1, z1, 0, x1, z1, 0.5, x1, z0, 9], hsl(30, 80, 46), g.EDGE);
        g.poly([x0, z0, 0, x1, z0, 0, x1, z0, 9, x0, z0, 9], hsl(30, 80, 38), g.EDGE);
        g.poly([x0, z0, 9, x1, z0, 9, x1, z1, 0.5, x0, z1, 0.5], hsl(30, 85, 58), g.EDGE);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 1; k < 4; k++) { g.pr(x0 + k * 5.5, z0 + 1, 8.4); ctx.moveTo(g.X, g.Y); g.pr(x0 + k * 5.5, z1 - 1, 0.8); ctx.lineTo(g.X, g.Y); } ctx.stroke();
        break; }
      case 'pothole': { g.pr(o.x, o.z, 0); ctx.beginPath(); ctx.ellipse(g.X, g.Y, o.r * 2.1, o.r * 1.05, 0, 0, 6.2832); const gr = ctx.createRadialGradient(g.X, g.Y, 1, g.X, g.Y, o.r * 2.1); gr.addColorStop(0, '#000'); gr.addColorStop(0.7, '#150838'); gr.addColorStop(1, 'rgba(120,60,200,0.7)'); ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = 'rgba(190,120,255,' + (0.5 + 0.3 * Math.sin(time * 4)).toFixed(2) + ')'; ctx.lineWidth = 1.6; ctx.stroke(); break; }
      case 'hoop': {
        g.pr(o.x, o.z, o.y); const rr = o.r * g.SC; ctx.beginPath(); ctx.ellipse(g.X, g.Y, rr * 0.75, rr * 1.0, 0, 0, 6.2832); ctx.strokeStyle = o.hit ? 'rgba(125,255,158,0.5)' : '#7dffff'; ctx.lineWidth = 5; ctx.stroke(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1; ctx.stroke();
        g.pr(o.x, o.z, 0); ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(g.X, g.Y, 14, 7, 0, 0, 6.2832); ctx.fill();
        break; }
      case 'target': {
        const s = Math.sign(o.x), x = o.x; g.shadow(x, o.z, 8, 0.2); g.box(x - 1, o.z - 1, 0, 2, 2, 12, [30, 30, 40]);
        const pts = (r) => [x, o.z - r, 22 - r, x, o.z + r, 22 - r, x, o.z + r, 22 + r, x, o.z - r, 22 + r];
        g.poly(pts(17), '#f4efe0', g.EDGE, 2);
        const cols = ['#e03a3a', '#fff', '#e03a3a', '#fff', '#e03a3a'];
        for (let k = 0; k < 5; k++) { g.pr(x, o.z, 22); const rr = (17 - k * 3.2) * g.SC; ctx.beginPath(); ctx.ellipse(g.X, g.Y, rr * 0.55, rr * 0.85, 0, 0, 6.2832); ctx.fillStyle = o.hit ? '#9aa' : cols[k]; ctx.fill(); }
        void s; break; }
      case 'bar': { g.box(-60, o.z - 1.5, 0, 3, 3, 10, [350, 80, 50]); g.box(57, o.z - 1.5, 0, 3, 3, 10, [350, 80, 50]); g.box(-58, o.z - 1.2, 8, 116, 2.4, 2.4, [48, 95, 55]); break; }
      case 'finish': {
        g.box(-62, o.z - 2, 0, 5, 5, 44, [270, 50, 40]); g.box(57, o.z - 2, 0, 5, 5, 44, [270, 50, 40]);
        for (let k = 0; k < 12; k++) for (let q = 0; q < 2; q++) g.poly([-57 + k * 9.5, o.z, 38 + q * 4, -57 + (k + 1) * 9.5, o.z, 38 + q * 4, -57 + (k + 1) * 9.5, o.z, 42 + q * 4, -57 + k * 9.5, o.z, 42 + q * 4], (k + q) % 2 ? '#fff' : '#111', null);
        g.pr(0, o.z, 52); g.text('FINISH', g.X, g.Y, 22, '#ffe45a', 'center');
        break; }
    }
  };

  Sp.pickup = function (k, time) {
    if (k.taken) return;
    const bob = Math.sin(time * 4 + k.z) * 2.5;
    g.shadow(k.x, k.z, 7, 0.25);
    if (k.t === 'bundle') {
      g.ring(k.x, k.z, 0, 10 + Math.sin(time * 5) * 1.5, 'rgba(255,255,255,0.7)', 2);
      for (let q = 0; q < 3; q++) g.cyl(k.x + (q - 1) * 3.4, k.z, 1 + (q === 1 ? 5 : 0), 2.1, 7, [45, 20, 92]);
      g.box(k.x - 5.5, k.z - 0.8, 4 + bob * 0.3, 11, 1.6, 2, [0, 80, 50]);
      g.pr(k.x, k.z, 20 + bob); g.text('+8', g.X, g.Y, 11, '#fff', 'center');
    } else if (k.t === 'up') {
      g.ball(k.x, k.z, 14 + bob, 7, [135, 75, 50]); g.pr(k.x, k.z, 14 + bob); g.text('1UP', g.X, g.Y, 11, '#fff', 'center');
    } else {
      const P = G.POWER[k.k]; const c = P.col;
      g.pr(k.x, k.z, 14 + bob); ctx.beginPath(); ctx.arc(g.X, g.Y, 13, 0, 6.2832); ctx.fillStyle = 'rgba(12,6,40,0.75)'; ctx.fill(); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.stroke();
      ctx.save(); ctx.translate(g.X, g.Y); ctx.rotate(time * 2); ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(0, 0, 18, 0, 6.2832); ctx.stroke(); ctx.restore();
      g.text(P.ico, g.X, g.Y + 1, 16, c, 'center', false);
    }
  };

  Sp.paper = function (p, time) {
    if (p.dead) return;
    g.pr(p.x, p.z, 0); const gx = g.X, gy = g.Y; const sh = Math.max(0.2, 1 - p.y / 70);
    ctx.fillStyle = 'rgba(8,4,24,0.35)'; ctx.beginPath(); ctx.ellipse(gx, gy, 4 * sh, 2 * sh, 0, 0, 6.2832); ctx.fill();
    g.pr(p.x, p.z, p.y);
    if (!p.rest && !p.settle) { ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.X, g.Y); g.pr(p.x - p.vx * 0.05, p.z - p.vz * 0.05, p.y - p.vy * 0.05); ctx.lineTo(g.X, g.Y); ctx.stroke(); g.pr(p.x, p.z, p.y); }
    ctx.save(); ctx.translate(g.X, g.Y); ctx.rotate(p.rest || p.settle ? 0.4 : p.spin);
    ctx.fillStyle = '#f7f1dc'; ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.roundRect(-4.5, -2.4, 9, 4.8, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d33'; ctx.fillRect(-1, -2.4, 2, 4.8); ctx.restore();
    void time;
  };

  Sp.haz = function (h, time) {
    if (h.t === 'meteor') {
      if (h.boom) { g.pr(h.x, h.z, 6); ctx.beginPath(); ctx.arc(g.X, g.Y, 26 * (1 - h.boom / 0.5 * 0.6) + 8, 0, 6.2832); ctx.fillStyle = 'rgba(255,170,60,' + (h.boom * 1.6).toFixed(2) + ')'; ctx.fill(); return; }
      g.ring(h.x, h.z, 0, h.r * (0.7 + 0.3 * Math.sin(time * 14)), '#ff4a3a', 3); g.disc(h.x, h.z, 0, h.r * 0.9 * (1 - h.tm / 1.3), 'rgba(255,60,40,0.25)');
      g.ball(h.x + h.tm * 40, h.z + h.tm * 30, h.tm * 150, 7, [20, 40, 36]); g.ball(h.x + h.tm * 40 + 5, h.z + h.tm * 30, h.tm * 150 + 4, 4, [28, 100, 60], false);
    } else if (h.t === 'bone' || h.t === 'parcel') {
      g.ring(h.tx, h.tz, 0, 14, '#ff4a3a', 3); g.disc(h.tx, h.tz, 0, 14 * (1 - h.tm / h.dur), 'rgba(255,60,40,0.28)');
      if (h.t === 'bone') { g.pr(h.x, h.z, h.y); ctx.save(); ctx.translate(g.X, g.Y); ctx.rotate(time * 12); ctx.fillStyle = '#fff3c0'; ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.roundRect(-9, -2.5, 18, 5, 2); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(-9, 0, 4, 0, 6.2832); ctx.arc(9, 0, 4, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.restore(); }
      else { g.box(h.x - 5, h.z - 5, h.y, 10, 10, 8, [32, 55, 52]); g.pr(h.x, h.z, h.y + 4); ctx.fillStyle = '#fff'; ctx.fillRect(g.X - 2, g.Y - 8, 4, 8); }
    } else if (h.t === 'clip') {
      const k = 1 - h.tm / h.dur; g.ring(h.tx, h.z, 0, 12, '#ff4a3a', 3);
      g.ball(h.x + (h.tx - h.x) * k, h.z, 10 + Math.sin(k * Math.PI) * 40, 5, [100, 70, 45]);
    } else if (h.t === 'blade') {
      g.shadow(h.x, h.z, 12, 0.3); g.pr(h.x, h.z, 6); ctx.save(); ctx.translate(g.X, g.Y); ctx.scale(1, 0.55); ctx.rotate(time * 25);
      ctx.fillStyle = '#d6dbe6'; ctx.strokeStyle = g.EDGE; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 12; k++) { const a = k / 12 * 6.2832, r = k % 2 ? 14 : 30; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  };

  /* ---------------- bosses ---------------- */
  Sp.boss = function (b, time) {
    const x = b.x, z = b.z, f = b.flash, dead = b.hp <= 0, jit = dead ? Math.sin(time * 60) * 1.5 : 0;
    g.shadow(x, z, b.type === 'mower' ? 26 : 22, 0.34);
    if (b.type === 'rex') {
      const run = b.state === 'charge' || b.state === 'trot' ? Math.sin(time * 14) * 4 : 0, steel = flash([215, 18, 56], f), dark = flash([220, 22, 34], f);
      for (const q of [[-9, -12, 1], [9, -12, -1], [-9, 12, -1], [9, 12, 1]]) g.box(x + q[0] - 3 + jit, z + q[1] - 3 + run * q[2] * 0.6, 0, 6, 6, 10, dark);
      g.box(x - 11 + jit, z - 20, 8, 22, 40, 16, steel);
      g.box(x - 11, z - 20, 24, 22, 40, 2.5, flash([0, 80, 52], f));
      for (let k = 0; k < 5; k++) g.box(x - 3 + jit, z - 16 + k * 8, 25, 6, 4, 6, flash([0, 0, 80], f));
      const hz = z + 22, open = b.state === 'dizzy' ? 8 : 2 + Math.sin(time * 10) * (b.state === 'trot' ? 1.5 : 0.5);
      g.box(x - 9, hz - 3, 18 + open * 0.3, 18, 16, 14, steel);
      g.box(x - 8, hz + 4, 10 - open * 0.2, 16, 14, 7, dark);
      g.box(x - 8, hz + 12, 15, 16, 4, 3, flash([0, 0, 90], f));
      g.pr(x + 9, hz + 2, 29); ctx.fillStyle = b.state === 'dizzy' ? '#ffe45a' : '#ff2a2a'; ctx.beginPath(); ctx.arc(g.X, g.Y, 4.4, 0, 6.2832); ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 1.2; ctx.stroke();
      g.pr(x - 1, hz + 2, 29); ctx.beginPath(); ctx.arc(g.X, g.Y, 4.4, 0, 6.2832); ctx.fill(); ctx.stroke();
      if (b.state === 'dizzy') for (let k = 0; k < 4; k++) { const a = time * 6 + k * 1.57; g.pr(x + Math.cos(a) * 14, hz + Math.sin(a) * 8, 40); g.text('★', g.X, g.Y, 11, '#ffe45a', 'center', false); }
      for (let k = 0; k < 4; k++) g.box(x + 9.2, hz - 1 + k * 3.4, 17, 1.4, 1.5, 4, flash([0, 0, 85], f));
      g.pr(x, z - 20, 18); ctx.fillStyle = 'rgba(255,150,40,' + (b.state === 'charge' ? 0.9 : 0.4) + ')'; ctx.beginPath(); ctx.ellipse(g.X, g.Y, 9, 14 + Math.sin(time * 40) * 3, 0, 0, 6.2832); ctx.fill();
      if (b.state === 'warn') { const a = 0.35 + 0.3 * Math.sin(time * 24); g.poly([-C.CURB, z - 8, 0.2, C.CURB, z - 8, 0.2, C.CURB, z + 8, 0.2, -C.CURB, z + 8, 0.2], 'rgba(255,50,40,' + a.toFixed(2) + ')', null); g.pr(0, z, 8); g.text('CHARGE!', g.X, g.Y, 24, '#ff5a4a', 'center'); }
    } else if (b.type === 'gorp') {
      const y = b.y + jit, hull = flash([210, 35, 58], f);
      g.pr(x, z, y); const cx = g.X, cy = g.Y;
      ctx.beginPath(); ctx.ellipse(cx, cy + 4, 48, 16, 0, 0, 6.2832); ctx.fillStyle = f > 0 ? '#fff' : '#7c8bb8'; ctx.fill(); ctx.strokeStyle = g.EDGE; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, 48, 14, 0, Math.PI, 0); ctx.fillStyle = g.hsl(hull[0], hull[1], hull[2]); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ffe45a'; ctx.font = '900 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MAIL', cx, cy + 6);
      ctx.beginPath(); ctx.ellipse(cx, cy - 8, 24, 20, 0, Math.PI, 0); ctx.fillStyle = 'rgba(160,255,230,0.5)'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy - 12, 13, 0, 6.2832); ctx.fillStyle = flash([105, 60, 56], f).length ? g.hsl(...flash([105, 60, 56], f)) : '#7ad04a'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; for (const ex of [-6, 0, 6]) { ctx.beginPath(); ctx.arc(cx + ex, cy - 15, 2.6, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#111'; ctx.fillRect(cx + ex - 0.8, cy - 16, 1.6, 2.4); ctx.fillStyle = '#fff'; }
      ctx.fillStyle = '#2a60c8'; ctx.beginPath(); ctx.ellipse(cx, cy - 22, 12, 5, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(cx + 26, cy + 8, 16, 22, 4); ctx.fillStyle = '#b08a52'; ctx.fill(); ctx.stroke();
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(cx - 20 + k * 10, cy + 14); ctx.quadraticCurveTo(cx - 24 + k * 10, cy + 30, cx - 16 + k * 10 + Math.sin(time * 5 + k) * 4, cy + 36); ctx.strokeStyle = '#7ad04a'; ctx.lineWidth = 3.5; ctx.stroke(); }
      if (b.shield) { ctx.beginPath(); ctx.arc(cx, cy - 4, 60, 0, 6.2832); ctx.fillStyle = 'rgba(120,230,255,' + (0.16 + 0.08 * Math.sin(time * 10)).toFixed(2) + ')'; ctx.fill(); ctx.strokeStyle = 'rgba(190,245,255,0.8)'; ctx.lineWidth = 3; ctx.stroke(); }
    } else {
      const body = flash([120, 55, 40], f), met = flash([210, 10, 62], f), y0 = 14 + Math.abs(Math.sin(time * 4)) * (b.state === 'walk' ? 3 : 0);
      g.box(x - 7 + jit, z - 14, 0, 10, 9, y0 + 24, met); g.box(x - 7 + jit, z + 6, 0, 10, 9, y0 + 24, met);
      g.box(x - 15, z - 20, y0 + 24, 30, 40, 26, body); g.box(x - 15, z - 20, y0 + 50, 30, 40, 3, flash([60, 90, 55], f));
      g.ball(x, z + 14, y0 + 62, 9, flash([180, 20, 70], f)); g.pr(x, z + 14, y0 + 62); ctx.fillStyle = '#7dff4a'; ctx.fillRect(g.X + 2, g.Y - 3, 5, 3); ctx.fillRect(g.X - 6, g.Y - 3, 5, 3);
      const sweepA = b.state === 'sweep' ? time * 30 : time * 4;
      g.pr(x - b.side * 18, z - 4, y0 + 38); ctx.save(); ctx.translate(g.X, g.Y); ctx.scale(1, 0.55); ctx.rotate(sweepA); ctx.fillStyle = '#e4e8f2'; ctx.strokeStyle = g.EDGE; ctx.lineWidth = 2; ctx.beginPath(); for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832; ctx.lineTo(Math.cos(a) * (k % 2 ? 12 : 26), Math.sin(a) * (k % 2 ? 12 : 26)); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      const bag = b.state === 'vent' ? flash([50, 95, 60], 0) : [100, 40, 40];
      g.box(x - 9, z - 29, y0 + 28, 18, 10, 20, bag);
      if (b.state === 'vent') { g.pr(x, z - 29, y0 + 54); g.text('WEAK SPOT!', g.X, g.Y, 14, '#ffe45a', 'center'); }
      if (b.state === 'warn') { const a = 0.35 + 0.3 * Math.sin(time * 24); g.poly([-C.CURB, z - 7, 0.2, C.CURB, z - 7, 0.2, C.CURB, z + 7, 0.2, -C.CURB, z + 7, 0.2], 'rgba(255,50,40,' + a.toFixed(2) + ')', null); g.pr(0, z, 8); g.text('JUMP THE BLADE!', g.X, g.Y, 20, '#ff5a4a', 'center'); }
    }
  };
  G.sprites = Sp;
})((window.SGS = window.SGS || {}));
