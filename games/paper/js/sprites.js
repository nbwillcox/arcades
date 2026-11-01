/* Pixel-art sprites for the 480x270 buffer: houses, rider, cars, dogs, props. Built from shaded iso boxes / balls / pixel details (5-tone hue-shifted ramps, 1px outlines, dither). */
(function (G) {
  'use strict';
  const C = G.C, g = G.gfx, px = G.px;
  const Sp = {};
  Sp.setCtx = () => {};
  const R = px.ramp, hsl = px.hsl;
  const OUT = hsl(250, 45, 10), BLACK = px.rgb(10, 6, 30);
  const flash = (h, s, l, f) => (f > 0 ? R(h, 8, 86) : R(h, s, l));
  const plane = (x, zc, yc, rz, ry, n, rot) => { const a = []; for (let i = 0; i < n; i++) { const t = (i / n) * 6.2832 + (rot || 0); a.push(x, zc + Math.cos(t) * rz, yc + Math.sin(t) * ry); } return a; };
  const stone = R(228, 10, 52), stone2 = R(228, 8, 62);

  /* ---------------- houses ---------------- */
  Sp.house = function (h, time) {
    const WX = -C.WALL, z0 = h.z0, z1 = h.z1, zc = h.zc, H = 46 + (h.style === 1 ? 4 : 0), lit = h.sub && !h.cancelled;
    const w = h.wall, wall = R(w[0], w[1] * (lit ? 1 : 0.8), w[2] + (lit ? 0 : -4)), roof = R(h.roof[0], h.roof[1], h.roof[2]), trim = R(h.trim[0], h.trim[1], h.trim[2]);
    px.blendPoly(g.sp([WX + 1, z0 - 2, 0, WX + 18, z0 + 10, 0, WX + 18, z1 + 12, 0, WX + 1, z1 + 2, 0]), BLACK, 0.26);
    /* end wall (-z side) */
    g.pf([WX, z0, 0, WX - 60, z0, 0, WX - 60, z0, H, WX, z0, H], wall.b);
    const sd = px.mix(wall.b, wall.a, 0.55);
    for (let v = 5; v < H; v += 3.4) g.ln(WX, z0, v, WX - 60, z0, v, sd);
    /* roof (behind the facade for the dome) */
    if (h.style === 2) {
      const pts = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI; pts.push(WX - 4, zc - 38 * Math.cos(a), H + 26 * Math.sin(a)); }
      g.pf(pts, roof.c); g.pf(plane(WX - 4, zc, H + 3, 0, 0, 3), roof.c);
      const hi = []; for (let i = 3; i <= 9; i++) { const a = i / 14 * Math.PI; hi.push(WX - 4, zc - 34 * Math.cos(a), H + 22 * Math.sin(a)); } for (let i = 9; i >= 3; i--) { const a = i / 14 * Math.PI; hi.push(WX - 4, zc - 28 * Math.cos(a), H + 17 * Math.sin(a)); }
      g.pf(hi, roof.d, roof.e, 1);
      for (let i = 0; i < 14; i++) g.ln(pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2], pts[i * 3 + 3], pts[i * 3 + 4], pts[i * 3 + 5], roof.a);
      g.ln(WX - 4, zc, H + 26, WX - 4, zc, H + 40, hsl(220, 10, 80));
      g.pr(WX - 4, zc, H + 41); px.rect(g.X - 1, g.Y - 1, 3, 3, (Math.floor(time * 3 + h.id) % 2) ? hsl(0, 90, 60) : hsl(50, 95, 62));
    }
    /* facade */
    g.pf([WX, z0, 0, WX, z1, 0, WX, z1, H, WX, z0, H], wall.c);
    const sc = px.mix(wall.c, wall.b, 0.5);
    for (let v = 5; v < H; v += 3.4) g.ln(WX, z0, v, WX, z1, v, sc);
    g.pf([WX, z0, 0, WX, z1, 0, WX, z1, 4.5, WX, z0, 4.5], stone.c, stone.b, 1);
    g.ln(WX, z0, 4.5, WX, z1, 4.5, stone.a);
    g.ln(WX, z0, 0, WX, z0, H, wall.d); g.ln(WX, z1, 0, WX, z1, H, wall.b);
    g.po([WX, z0, 0, WX, z1, 0, WX, z1, H, WX, z0, H], wall.a);
    if (h.style === 0) {
      g.pf([WX + 3, z0 - 3, H - 1, WX + 3, z1 + 3, H - 1, WX - 30, z1 + 3, H + 18, WX - 30, z0 - 3, H + 18], roof.c);
      for (let k = 1; k < 7; k++) { const t = k / 7; g.ln(WX + 3 - 33 * t, z0 - 3, H - 1 + 19 * t, WX + 3 - 33 * t, z1 + 3, H - 1 + 19 * t, k % 2 ? roof.b : roof.d); }
      g.po([WX + 3, z0 - 3, H - 1, WX + 3, z1 + 3, H - 1, WX - 30, z1 + 3, H + 18, WX - 30, z0 - 3, H + 18], roof.a);
      g.ln(WX + 3, z0 - 3, H - 1, WX + 3, z1 + 3, H - 1, roof.e);
      g.pf([WX, z0, H, WX - 60, z0, H, WX - 30, z0, H + 18], wall.b); g.po([WX, z0, H, WX - 60, z0, H, WX - 30, z0, H + 18], roof.a);
      g.box(WX - 44, z0 + 12, H + 3, 6, 6, 16, R(12, 45, 34));
      g.pr(WX - 41, z0 + 15, H + 22); for (let k = 0; k < 4; k++) px.ell(g.X + Math.sin(time * 2 + k) * 2 + k, g.Y - k * 4 - ((time * 8) % 4), 2 + k * 0.5, 1.5 + k * 0.4, hsl(250, 10, 78 - k * 6), hsl(250, 10, 60), 1);
    } else if (h.style === 1) {
      g.pf([WX, z0, H, WX - 60, z0, H, WX - 60, z1, H, WX, z1, H], roof.d);
      g.pf([WX, z0, H, WX, z1, H, WX, z1, H + 4, WX, z0, H + 4], wall.d); g.po([WX, z0, H, WX, z1, H, WX, z1, H + 4, WX, z0, H + 4], wall.a);
      g.ln(WX, z0, H + 3.5, WX, z1, H + 3.5, hsl(185 + Math.sin(time * 2) * 12, 95, 62));
      g.pf([WX - 6, z0 + 6, H, WX - 24, z0 + 6, H, WX - 24, z0 + 26, H, WX - 6, z0 + 26, H], hsl(218, 70, 32)); g.ln(WX - 15, z0 + 6, H, WX - 15, z0 + 26, H, hsl(218, 60, 52));
      g.pr(WX - 38, zc + 14, H + 2); px.blendEll(g.X, g.Y - 3, 11, 8, hsl(170, 80, 70), 0.55); px.ring(g.X, g.Y - 3, 11, 8, hsl(170, 60, 86)); px.line(g.X - 4, g.Y - 7, g.X - 1, g.Y - 9, hsl(170, 50, 96));
    }
    /* windows */
    for (const wd of h.windows) {
      const u0 = wd.z - wd.w / 2, u1 = wd.z + wd.w / 2, y0 = wd.y0, y1 = wd.y1, ym = y0 + (y1 - y0) * 0.55;
      if (h.style !== 1 && !wd.high) { const sh = R(h.roof[0], h.roof[1] - 10, h.roof[2] - 4); g.pf([WX, u0 - 4.5, y0, WX, u0 - 1.5, y0, WX, u0 - 1.5, y1, WX, u0 - 4.5, y1], sh.c); g.pf([WX, u1 + 1.5, y0, WX, u1 + 4.5, y0, WX, u1 + 4.5, y1, WX, u1 + 1.5, y1], sh.c); g.po([WX, u0 - 4.5, y0, WX, u0 - 1.5, y0, WX, u0 - 1.5, y1, WX, u0 - 4.5, y1], sh.a); g.po([WX, u1 + 1.5, y0, WX, u1 + 4.5, y0, WX, u1 + 4.5, y1, WX, u1 + 1.5, y1], sh.a); }
      g.pf([WX, u0 - 1.4, y0 - 1.4, WX, u1 + 1.4, y0 - 1.4, WX, u1 + 1.4, y1 + 1.4, WX, u0 - 1.4, y1 + 1.4], trim.d); g.po([WX, u0 - 1.4, y0 - 1.4, WX, u1 + 1.4, y0 - 1.4, WX, u1 + 1.4, y1 + 1.4, WX, u0 - 1.4, y1 + 1.4], trim.a);
      if (wd.broken) {
        g.pf([WX, u0, y0, WX, u1, y0, WX, u1, y1, WX, u0, y1], hsl(250, 40, 7));
        const sh = hsl(190, 60, 88);
        g.pf([WX, u0, y1, WX, u0 + wd.w * 0.3, y1, WX, u0 + wd.w * 0.12, y1 - 6], sh); g.pf([WX, u1, y0, WX, u1 - wd.w * 0.3, y0, WX, u1 - wd.w * 0.12, y0 + 6], sh);
        g.pf([WX, u0, y0, WX, u0 + 3, y0, WX, u0, y0 + 5], sh);
      } else if (lit) {
        g.pf([WX, u0, y0, WX, u1, y0, WX, u1, ym, WX, u0, ym], hsl(38, 90, 52)); g.pf([WX, u0, ym, WX, u1, ym, WX, u1, y1, WX, u0, y1], hsl(47, 95, 74));
        g.pf([WX, u0, ym - 3, WX, u0 + 3, ym - 3, WX, u0 + 3, y1, WX, u0, y1], hsl(350, 55, 58)); g.pf([WX, u1 - 3, ym - 3, WX, u1, ym - 3, WX, u1, y1, WX, u1 - 3, y1], hsl(350, 55, 58));
        g.ln(WX, wd.z, y0, WX, wd.z, y1, trim.b); g.ln(WX, u0, ym, WX, u1, ym, trim.b);
        g.pf([WX, wd.z - 2, y0 - 3, WX, wd.z + 2, y0 - 3, WX, wd.z + 2, y0 - 1.4, WX, wd.z - 2, y0 - 1.4], hsl(330, 70, 60));
      } else {
        g.pf([WX, u0, y0, WX, u1, y0, WX, u1, y1, WX, u0, y1], hsl(205, 55, 20)); g.pf([WX, u0, ym, WX, u1, ym, WX, u1, y1, WX, u0, y1], hsl(210, 50, 30));
        g.ln(WX, wd.z, y0, WX, wd.z, y1, trim.b); g.ln(WX, u0, ym, WX, u1, ym, trim.b);
        g.ln(WX, u0 + 2, y0 + 2, WX, u0 + 5, y1 - 3, hsl(195, 60, 62)); g.ln(WX, u0 + 3.5, y0 + 2, WX, u0 + 6.5, y1 - 5, hsl(195, 60, 46));
      }
    }
    /* porch + door */
    const d = h.door, dc = R(h.doorHue, 62, 44);
    g.pf([WX, d.z - 8, 0, WX, d.z + 8, 0, WX, d.z + 8, 30, WX, d.z - 8, 30], trim.d); g.po([WX, d.z - 8, 0, WX, d.z + 8, 0, WX, d.z + 8, 30, WX, d.z - 8, 30], trim.a);
    g.pf([WX, d.z - 6.5, 0, WX, d.z + 6.5, 0, WX, d.z + 6.5, 28, WX, d.z - 6.5, 28], dc.c); g.po([WX, d.z - 6.5, 0, WX, d.z + 6.5, 0, WX, d.z + 6.5, 28, WX, d.z - 6.5, 28], dc.a);
    g.pf([WX, d.z - 4.5, 4, WX, d.z + 4.5, 4, WX, d.z + 4.5, 13, WX, d.z - 4.5, 13], dc.b); g.pf([WX, d.z - 4.5, 16, WX, d.z + 4.5, 16, WX, d.z + 4.5, 25, WX, d.z - 4.5, 25], hsl(195, 55, 70), hsl(195, 55, 52), 2);
    g.ln(WX, d.z - 6.5, 28, WX, d.z + 6.5, 28, dc.e); g.dot(WX, d.z + 4.2, 14, hsl(48, 95, 66));
    g.box(WX, d.z - 11, 0, 15, 22, 3, stone); g.box(WX + 15, d.z - 6, 0, 4, 12, 1.6, stone2);
    g.box(WX + 11, d.z - 11, 3, 1.6, 1.6, 28, trim); g.box(WX + 11, d.z + 9.4, 3, 1.6, 1.6, 28, trim);
    g.box(WX, d.z - 12.5, 31, 15, 25, 2.5, roof);
    if (lit) { g.ball(WX + 1, d.z + 12, 26, 1.7, R(50, 100, 70)); g.pr(WX + 1, d.z + 12, 26); px.blendEll(g.X, g.Y + 2, 5, 3, hsl(50, 100, 70), 0.3); }
    /* status sign */
    if (h.sub) {
      const bob = Math.round(Math.sin(time * 3 + h.id) * 1.5), col = h.cancelled ? hsl(0, 85, 62) : h.delivered ? hsl(140, 80, 62) : hsl(50, 95, 62);
      g.pr(WX, zc, H + (h.style === 0 ? 30 : h.style === 2 ? 46 : 22) + bob); const sx = g.X, sy = g.Y;
      px.rect(sx - 9, sy - 7, 19, 14, col); px.rect(sx - 8, sy - 6, 17, 12, hsl(250, 55, 14));
      px.text(h.cancelled ? '~' : h.delivered ? '^' : '★', sx - 2, sy - 3, 1, col, 'left', null);
      px.rect(sx - 1, sy + 7, 3, 2, col);
    }
    if (h.face > 0) {
      const w2 = h.windows[1] || h.windows[0]; g.pr(WX, w2.z, (w2.y0 + w2.y1) / 2);
      px.ell(g.X, g.Y, 5, 5, hsl(h.sub ? 28 : 8, 70, h.sub ? 80 : 62), OUT, 0); px.ring(g.X, g.Y, 5, 5, OUT);
      px.rect(g.X - 3, g.Y - 1, 2, 2, OUT); px.rect(g.X + 1, g.Y - 1, 2, 2, OUT); px.line(g.X - 4, g.Y - 3, g.X - 1, g.Y - 2, OUT); px.line(g.X + 4, g.Y - 3, g.X + 1, g.Y - 2, OUT); px.line(g.X - 2, g.Y + 3, g.X + 2, g.Y + 3, OUT);
    }
  };

  Sp.houseGround = function (h, time) {
    const WX = -C.WALL, SD = -C.SIDEW;
    g.pf([SD + 2, h.zc - 4, 0, WX + 20, h.zc - 4, 0, WX + 20, h.zc + 4, 0, SD + 2, h.zc + 4, 0], stone2.c, stone2.b, 1);
    for (let x = SD + 2; x > WX + 20; x -= 8) g.ln(x, h.zc - 4, 0, x, h.zc + 4, 0, stone2.b);
    g.pf([WX, h.zc - 22, 0, WX + 40, h.zc - 22, 0, WX + 40, h.zc + 22, 0, WX, h.zc + 22, 0], h.sub ? stone2.d : stone.b, h.sub ? stone2.c : stone.a, 1);
    g.po([WX, h.zc - 22, 0, WX + 40, h.zc - 22, 0, WX + 40, h.zc + 22, 0, WX, h.zc + 22, 0], h.sub ? stone2.b : stone.a);
    const pulse = h.sub && !h.delivered && !h.cancelled ? 0.5 + 0.5 * Math.sin(time * 5) : 0;
    const mat = h.sub ? (h.delivered ? R(135, 60, 44) : R(5, 70, 46 + pulse * 14)) : R(250, 10, 30);
    g.pf([WX + 6, h.zc - 10, 0, WX + 24, h.zc - 10, 0, WX + 24, h.zc + 10, 0, WX + 6, h.zc + 10, 0], mat.c); g.po([WX + 6, h.zc - 10, 0, WX + 24, h.zc - 10, 0, WX + 24, h.zc + 10, 0, WX + 6, h.zc + 10, 0], mat.a);
    g.pf([WX + 9, h.zc - 7, 0, WX + 21, h.zc - 7, 0, WX + 21, h.zc + 7, 0, WX + 9, h.zc + 7, 0], mat.d, mat.c, 2);
    g.pr(WX + 15, h.zc, 0); if (h.sub && !h.cancelled) { px.rect(g.X - 2, g.Y - 1, 5, 3, h.delivered ? hsl(120, 60, 90) : hsl(0, 0, 88 + pulse * 8)); }
    g.pf([SD, h.z1 + 3, 0, WX + 30, h.z1 + 3, 0, WX + 30, h.z1 + 20, 0, SD, h.z1 + 20, 0], hsl(235, 8, 50), hsl(235, 8, 44), 1);
  };

  Sp.mailbox = function (h, time) {
    const m = h.mailbox, x = m.x, z = m.z, bob = m.hit ? Math.round(Math.sin(time * 40)) * 0.8 : 0;
    g.shadow(x, z, 4, 0.6);
    g.box(x - 0.8, z - 0.8, 0, 1.6, 1.6, 9, R(30, 25, 30));
    const c = h.sub ? (h.cancelled ? R(0, 55, 40) : R(210, 70, 52)) : R(270, 15, 46);
    g.box(x - 4, z - 5, 9 + bob, 8, 10, 6, c);
    g.pr(x, z, 15 + bob); px.ell(g.X, g.Y, 5, 3, c.a); px.ell(g.X, g.Y, 4, 2.4, c.d); px.line(g.X - 3, g.Y - 1, g.X + 2, g.Y - 1, c.e);
    const f = R(0, 85, 52); if (m.flag) g.box(x + 4, z + 1, 11, 1.4, 1.4, 8, f); else g.box(x + 4, z + 1, 11, 1.4, 1.4, 3, f);
    if (h.sub && !h.delivered && !h.cancelled) { g.pr(x, z, 24 + Math.round(Math.sin(time * 5) * 2)); px.poly([g.X - 3, g.Y - 3, g.X + 3, g.Y - 3, g.X, g.Y + 2], hsl(50, 95, 62)); px.outline([g.X - 3, g.Y - 3, g.X + 3, g.Y - 3, g.X, g.Y + 2], OUT); }
  };

  /* ---------------- rider ---------------- */
  Sp.player = function (P, time) {
    const x = P.x, z = P.z, y = P.y;
    if (P.inv > 0 && Math.floor(time * 14) % 2 === 0 && P.crash <= 0) return;
    g.shadow(x, z, 9 - Math.min(5, y * 0.1), y > 12 ? 0.8 : 0.62);
    g.pr(x, z, y + 1); px.blendEll(g.X, g.Y + 2, 11, 5, hsl(185, 100, 66), 0.3 + 0.1 * Math.sin(time * 14));
    const board = R(185, 72, 44), skin = R(26, 60, 74), shirt = R(352, 78, 50), pants = R(225, 55, 38);
    if (P.crash > 0) {
      const sp = time * 12; g.box(x - 3.5 + Math.sin(sp) * 6, z - 10 + Math.cos(sp) * 8, y + 3, 7, 22, 2, board);
      g.ball(x, z, y + 9, 4.2, skin); g.box(x - 2, z - 3, y + 1, 4, 6, 8, shirt);
      for (let k = 0; k < 4; k++) { const a = sp + k * 1.57; g.pr(x + Math.cos(a) * 9, z + Math.sin(a) * 7, y + 22); px.text('*', g.X - 3, g.Y - 3, 1, hsl(50, 95, 64), 'left', OUT); }
      return;
    }
    const lean = P.lean * 2.2, th = P.throwT;
    g.box(x - 3.5, z - 11, y + 3, 7, 22, 2.4, board);
    g.box(x - 3.9, z + 6, y + 4, 7.8, 5, 1.6, R(48, 95, 58));
    g.pr(x, z - 11, y + 4); const fl = (Math.floor(time * 30) % 2) ? 3 : 2; px.rect(g.X - 1, g.Y + 1, 2, fl, hsl(190, 100, 74)); px.rect(g.X, g.Y + 1, 1, fl + 1, hsl(30, 100, 70));
    g.box(x - 1.6 + lean * 0.3, z - 5, y + 5.4, 2.4, 2.6, 6, pants); g.box(x - 1.6 + lean * 0.3, z + 2.5, y + 5.4, 2.4, 2.6, 6, pants);
    g.box(x - 2.2 + lean * 0.3, z - 5.5, y + 4.6, 3.4, 3.4, 1.4, R(28, 55, 30)); g.box(x - 2.2 + lean * 0.3, z + 2, y + 4.6, 3.4, 3.4, 1.4, R(28, 55, 30));
    g.box(x - 4, z - 9.5, y + 10, 6, 3.2, 7.5, R(35, 55, 48));
    for (let k = 0; k < 3; k++) { g.pr(x - 1 + k * 1.4, z - 11.5, y + 18 + k * 0.5); px.rect(g.X - 1, g.Y - 4, 3, 4, hsl(48, 30, 92)); px.rect(g.X, g.Y - 4, 1, 4, hsl(0, 75, 52)); }
    g.box(x - 2.4 + lean * 0.6, z - 3.6, y + 11, 4.8, 7.2, 9, shirt); g.box(x - 2.4 + lean * 0.6, z - 3.6, y + 11, 4.8, 7.2, 1.8, R(48, 90, 58));
    g.pr(x + lean * 0.8, z, y + 18); const shx = g.X, shy = g.Y;
    const arm = (ex, ey) => { px.line(shx, shy, ex, ey, OUT); px.line(shx, shy + 1, ex, ey + 1, OUT); px.line(shx, shy, ex, ey, skin.c); };
    if (th > 0) {
      const k = 1 - th / 0.28, reach = Math.sin(Math.min(1, k * 1.4) * 1.57) * 11 * P.throwSide; g.pr(x + reach, z + 1, y + 20); arm(g.X, g.Y);
      if (k < 0.45) { px.rect(g.X - 1, g.Y - 1, 4, 3, hsl(48, 30, 94)); px.rect(g.X, g.Y - 1, 1, 3, hsl(0, 75, 52)); }
    } else { g.pr(x + lean * 0.8 + 2.5, z + 2, y + 12); arm(g.X, g.Y); }
    g.ball(x + lean, z, y + 25, 4.2, skin); g.pr(x + lean, z, y + 25); const hx = g.X, hy = g.Y;
    px.rect(hx + 1, hy - 1, 1, 2, OUT); px.rect(hx + 3, hy - 1, 1, 2, OUT); px.line(hx + 1, hy + 2, hx + 3, hy + 2, OUT);
    px.ring(hx, hy, 7, 7, hsl(190, 70, 86)); px.pix(hx - 4, hy - 4, hsl(0, 0, 100)); px.pix(hx - 3, hy - 5, hsl(0, 0, 100)); px.pix(hx - 5, hy - 3, hsl(0, 0, 100));
    px.ell(hx, hy - 3, 5, 3, hsl(0, 78, 46)); px.ell(hx - 1, hy - 4, 3, 1.5, hsl(0, 80, 62)); px.rect(hx + 1, hy - 2, 7, 2, hsl(0, 78, 36)); px.rect(hx - 4, hy - 1, 9, 1, hsl(0, 78, 30));
    if (P.pw.shield > 0) { const a = P.pw.shield < 2 ? (Math.floor(time * 12) % 2 ? 0.45 : 0.1) : 0.4; g.pr(x, z, y + 14); px.blendEll(g.X, g.Y, 17, 17, hsl(195, 90, 68), a * 0.6); px.ring(g.X, g.Y, 17, 17, hsl(190, 90, 84), 1); }
    if (P.pw.speed > 0) for (let k = 1; k < 4; k++) { g.pr(x, z - k * 9, y + 6); px.line(g.X - 5, g.Y, g.X + 5, g.Y - 3, hsl(30, 100, 78 - k * 8)); }
  };

  /* ---------------- traffic / creatures ---------------- */
  Sp.car = function (c, time) {
    const big = c.type === 'bus', van = c.type === 'van', L = c.len, Wd = c.wid, hh = big ? 11 : 6, ch = big ? 6 : van ? 7 : 6.5;
    const body = R(c.hue, 78, 50), glass = R(205, 55, 52), dy = c.dead ? Math.min(40, (c.fly || 1) * 18) : 0, dark = R(250, 20, 18);
    g.shadow(c.x, c.z, Math.max(Wd, L / 2) * 0.8, 0.6);
    g.pr(c.x, c.z, 1); px.blendEll(g.X, g.Y + 2, L * 0.3, Wd * 0.34, hsl(185, 100, 68), 0.34);
    if (c.cross) {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(c.x + sx * L * 0.32 - 2, c.z + sz * Wd / 2 - (sz > 0 ? 1 : 0), 0.5 + dy, 4, 1.6, 3, dark);
      g.box(c.x - L / 2, c.z - Wd / 2, 2 + dy, L, Wd, hh, body);
      g.box(c.x - L * 0.3 + (c.vx > 0 ? -2 : 2), c.z - Wd / 2 + 1, 2 + hh + dy, L * 0.55, Wd - 2, ch, glass);
      g.pr(c.x + (c.vx > 0 ? L / 2 : -L / 2), c.z, 5 + dy); px.rect(g.X - 1, g.Y - 2, 3, 3, hsl(55, 100, 80));
    } else {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.box(c.x + sx * Wd / 2 - (sx > 0 ? 1 : 0), c.z + sz * L * 0.3 - 2, 0.5 + dy, 1.6, 4, 3, dark);
      g.box(c.x - Wd / 2, c.z - L / 2, 2 + dy, Wd, L, hh, body);
      g.box(c.x - Wd / 2 + 1, c.z - L * 0.3, 2 + hh + dy, Wd - 2, L * (big ? 0.8 : 0.55), ch, glass);
      g.ln(c.x + Wd / 2, c.z - L / 2, 2 + hh * 0.6 + dy, c.x + Wd / 2, c.z + L / 2, 2 + hh * 0.6 + dy, body.e);
      if (big) for (let k = 0; k < 4; k++) g.pf([c.x + Wd / 2, c.z - 14 + k * 8, 7 + dy, c.x + Wd / 2, c.z - 10 + k * 8, 7 + dy, c.x + Wd / 2, c.z - 10 + k * 8, 11 + dy, c.x + Wd / 2, c.z - 14 + k * 8, 11 + dy], glass.d);
      if (c.vz < 0) { for (const sx of [-1, 1]) { g.pr(c.x + sx * Wd * 0.3, c.z - L / 2, 5 + dy); px.rect(g.X - 1, g.Y - 1, 3, 2, hsl(55, 100, 82)); } }
      else { g.pr(c.x, c.z - L / 2, 5 + dy); px.rect(g.X - 3, g.Y - 1, 7, 2, hsl(0, 90, 56)); }
    }
    if (c.honk > 0) { g.pr(c.x, c.z, hh + ch + 14); px.text('HONK!', g.X, g.Y - 3, 1, hsl(50, 95, 64), 'center', OUT); }
    void time;
  };

  Sp.dog = function (d, time) {
    if (d.dead) return;
    const stun = d.state === 'stunned', dir = d.vz < -1 ? -1 : 1, run = d.state === 'chase' || d.state === 'return';
    const x = d.x, z = d.z, c = R(d.hue, 55, 52), leg = run ? Math.sin(d.anim * 1.6) * 3 : 0;
    g.shadow(x, z, 7, 0.6);
    for (const q of [[-1.8, -4], [1.8, -4], [-1.8, 4], [1.8, 4]]) { const off = ((q[0] > 0) !== (q[1] > 0)) ? leg : -leg; g.box(x + q[0] - 0.8, z + q[1] * dir - 1 + off * 0.5, 0, 1.6, 2, 4, R(d.hue, 50, 34)); }
    g.box(x - 3, z - 6, 3.5, 6, 12, 5.5, c); g.box(x - 2.6, z - 3, 8.6, 5.2, 6, 1.6, R(d.hue, 40, 74));
    const hz = z + 7 * dir, hy = 8.5 + (stun ? -1 : 0);
    g.box(x - 1.3, hz + (dir > 0 ? 1.5 : -4.5), hy - 1, 2.6, 3, 2.2, R(d.hue, 40, 66)); g.ball(x, hz, hy + 1.5, 3.6, c); g.box(x + 1, hz - 1, hy + 4.8, 1.4, 1.2, 2.6, R(d.hue, 55, 30));
    g.pr(x, hz, hy + 1.5); px.ring(g.X, g.Y, 6, 6, hsl(195, 60, 86)); px.pix(g.X - 3, g.Y - 3, hsl(0, 0, 100)); px.pix(g.X - 2, g.Y - 4, hsl(0, 0, 100));
    if (stun) { px.text('X', g.X + 1, g.Y - 3, 1, OUT); px.text('X', g.X + 6, g.Y - 3, 1, OUT); } else { px.rect(g.X + 1, g.Y - 1, 2, 2, OUT); px.rect(g.X + 4, g.Y - 1, 2, 2, OUT); }
    g.pr(x, z - 6 * dir, 8); const tw = Math.round(Math.sin(time * (run ? 24 : 6)) * 2); px.line(g.X, g.Y, g.X + tw, g.Y - 6, OUT); px.line(g.X, g.Y - 1, g.X + tw, g.Y - 6, c.c);
    if (d.bark > 0 || d.state === 'chase') { g.pr(x, z, 24); px.text(stun ? '' : d.bark > 0 ? 'WOOF!' : '!', g.X, g.Y - 3, 1, hsl(5, 90, 62), 'center', OUT); }
    if (stun) for (let k = 0; k < 3; k++) { const a = time * 7 + k * 2.1; g.pr(x + Math.cos(a) * 6, z + Math.sin(a) * 5, 17); px.rect(g.X, g.Y, 2, 2, hsl(50, 95, 64)); }
  };

  Sp.mover = function (m, time) {
    if (m.dead) return;
    if (m.t === 'skater') {
      const sk = R(m.hue, 70, 48);
      g.shadow(m.x, m.z, 6, 0.6); g.box(m.x - 2.5, m.z - 6, 1.6, 5, 12, 1.4, sk); g.box(m.x - 1.5, m.z - 2, 3, 3, 4, 7, R(m.hue + 120, 60, 46)); g.ball(m.x, m.z, 13, 3.3, R(26, 55, 74)); g.box(m.x - 3.4, m.z - 3.5, 15.6, 6.8, 7, 1.8, sk);
      g.pr(m.x, m.z, 13); px.rect(g.X + 1, g.Y, 1, 2, OUT); px.rect(g.X + 3, g.Y, 1, 2, OUT);
    } else {
      g.shadow(m.x, m.z, 10, 0.6); g.box(m.x - 7, m.z - 8, 2, 14, 16, 8, R(m.stun > 0 ? 200 : 120, 70, 44)); g.box(m.x - 5, m.z - 5, 10, 10, 10, 3, R(120, 40, 66));
      g.pr(m.x, m.z, 6); const a = time * 30; for (let k = 0; k < 2; k++) { px.line(g.X - Math.cos(a + k * 1.57) * 10, g.Y + 3 - Math.sin(a + k * 1.57) * 5, g.X + Math.cos(a + k * 1.57) * 10, g.Y + 3 + Math.sin(a + k * 1.57) * 5, hsl(220, 10, 86)); }
      g.pr(m.x + 7, m.z, 8); px.rect(g.X, g.Y, 2, 2, hsl(0, 90, 58));
    }
  };

  Sp.ufo = function (u, time) {
    if (u.dead) return;
    const y = u.y + Math.sin(u.ph * 2) * 3;
    if (u.beam > 0) {
      g.pr(u.x, u.z, y); const tx = g.X, ty = g.Y; g.pr(u.x - 22, u.z, 0); const lx = g.X, ly = g.Y; g.pr(u.x + 22, u.z, 0); const rx = g.X, ry = g.Y;
      px.blendPoly([tx - 3, ty, tx + 3, ty, rx + 2, ry + 1, lx - 2, ly + 1], hsl(165, 100, 78), 0.36 * u.beam, (Math.floor(time * 10) % 2) ? 0 : 0);
      g.ring(u.x, u.z, 0, 22, hsl(165, 100, 82), 1);
    }
    g.shadow(u.x, u.z, 14, 0.78);
    g.pr(u.x, u.z, y); const cx = g.X, cy = g.Y, hull = R(225, 22, 62);
    px.ell(cx, cy + 1, 17, 6, hull.a); px.ell(cx, cy, 16, 5, hull.c); px.ell(cx, cy + 2, 14, 2.5, hull.b); px.ell(cx - 3, cy - 1, 10, 2, hull.d);
    px.ell(cx, cy - 4, 8, 6, hsl(170, 70, 70)); px.ring(cx, cy - 4, 8, 6, hull.a); px.pix(cx - 3, cy - 7, hsl(170, 50, 96)); px.rect(cx - 1, cy - 5, 3, 3, hsl(100, 80, 55));
    for (let k = 0; k < 5; k++) px.rect(cx - 10 + k * 5, cy + 1, 2, 1, (Math.floor(time * 6) + k) % 2 ? hsl(320, 90, 64) : hsl(50, 95, 64));
  };

  /* ---------------- props ---------------- */
  Sp.deco = function (o, time) {
    if (o.dead) return;
    switch (o.t) {
      case 'tree': {
        const k = o.kind, hue = [160, 300, 45][k], cr = R(hue, 58, 46), sway = Math.round(Math.sin(time * 1.4 + o.z));
        g.shadow(o.x, o.z, 11, 0.62); g.cyl(o.x, o.z, 0, 2, 13, R(28, 45, 30));
        g.ball(o.x - 4 + sway, o.z, 22, 7, R(hue + 10, 55, 42)); g.ball(o.x + 5 + sway, o.z, 21, 7, R(hue - 6, 60, 44)); g.ball(o.x + sway, o.z, 29, 9, cr); g.ball(o.x + 3 + sway, o.z, 35, 5, R(hue + 18, 66, 54));
        if (k === 1) for (let q = 0; q < 5; q++) { g.pr(o.x + Math.cos(q * 1.3 + time) * 9, o.z + Math.sin(q * 1.3 + time) * 7, 26 + q * 2); px.rect(g.X, g.Y, 1, 1, hsl(55, 100, 85)); }
        break; }
      case 'gnome': g.shadow(o.x, o.z, 4, 0.6); g.box(o.x - 2, o.z - 2, 0, 4, 4, 5, R(210, 60, 40)); g.ball(o.x, o.z, 7, 2.4, R(28, 60, 76)); g.cyl(o.x, o.z, 8, 2.4, 1.2, R(0, 80, 48)); g.cyl(o.x, o.z, 9, 1.4, 4.5, R(0, 85, 50)); g.pr(o.x, o.z, 6.4); px.rect(g.X - 1, g.Y, 3, 2, hsl(0, 0, 96)); break;
      case 'trash': g.shadow(o.x, o.z, 6, 0.6); g.cyl(o.x, o.z, 0, 4.4, 9, R(215, 14, 50)); g.cyl(o.x, o.z, 9, 4.8, 1.6, R(215, 14, 62)); g.pr(o.x, o.z, 5); px.line(g.X - 2, g.Y - 2, g.X - 2, g.Y + 1, R(215, 14, 30).a); px.line(g.X + 1, g.Y - 2, g.X + 1, g.Y + 1, R(215, 14, 30).a); break;
      case 'hydrant': g.shadow(o.x, o.z, 5, 0.6); g.cyl(o.x, o.z, 0, 2.8, 7, R(0, 82, 48)); g.ball(o.x, o.z, 8, 3, R(0, 82, 52)); g.box(o.x - 4.5, o.z - 1.1, 3.5, 9, 2.2, 2, R(0, 82, 46)); break;
      case 'cone': g.shadow(o.x, o.z, 4, 0.6); g.cyl(o.x, o.z, 0, 4, 1.2, R(25, 90, 48)); g.cyl(o.x, o.z, 1, 2.6, 4.5, R(25, 95, 54)); g.cyl(o.x, o.z, 5, 1.4, 3, R(25, 95, 58)); g.pr(o.x, o.z, 4); px.rect(g.X - 2, g.Y - 1, 5, 1, hsl(0, 0, 96)); break;
      case 'fence': { const f = R(40, 20, 86); for (let z = o.z; z < o.z1; z += 4) g.box(o.x - 1, z, 0, 2, 2.4, 8, f); g.box(o.x - 0.8, o.z, 5, 1.6, o.z1 - o.z, 1.6, R(40, 20, 76)); break; }
      case 'parked': { const sh = o.hit > 0 ? Math.sin(time * 40) * 0.8 : 0, b = R(o.hue, 70, 48), gl = R(205, 55, 52);
        g.shadow(o.x, o.z, 13, 0.62); g.box(o.x - 7 + sh, o.z - 11, 2, 14, 22, 6, b); g.box(o.x - 6 + sh, o.z - 6, 8, 12, 12, 6, gl);
        g.pr(o.x, o.z - 11, 5); px.rect(g.X - 4, g.Y - 1, 3, 2, o.hit > 0 ? hsl(50, 100, 70) : hsl(55, 100, 82)); px.rect(g.X + 2, g.Y - 1, 3, 2, o.hit > 0 ? hsl(50, 100, 70) : hsl(55, 100, 82));
        if (o.hit > 0) { g.pr(o.x, o.z, 24); px.text('BEEP!', g.X, g.Y - 3, 1, hsl(50, 95, 64), 'center', OUT); }
        break; }
      case 'sprinkler': {
        g.disc(o.x, o.z, 0, 12, hsl(200, 80, 70), 0.18); g.cyl(o.x, o.z, 0, 2, 2.5, R(200, 20, 48));
        for (let k = 0; k < 6; k++) { const a = time * 3 + o.ph + k * 1.05, r = 9 + (k % 2) * 3; for (let s = 1; s <= 4; s++) { const t = s / 4; g.pr(o.x + Math.cos(a) * r * t, o.z + Math.sin(a) * r * t, 3 + Math.sin(t * 3.14) * 6); px.pix(g.X, g.Y, hsl(195, 90, 82)); } }
        break; }
      case 'ramp': {
        const x0 = o.x - 11, x1 = o.x + 11, z0 = o.z - 9, z1 = o.z + 9, rp = R(30, 80, 48);
        g.shadow(o.x, o.z, 12, 0.62);
        g.pf([x1, z0, 0, x1, z1, 0, x1, z1, 9, x1, z0, 0.5], rp.b); g.pf([x0, z0, 0.5, x1, z0, 0.5, x1, z1, 9, x0, z1, 9], rp.d, rp.c, 1);
        g.po([x0, z0, 0.5, x1, z0, 0.5, x1, z1, 9, x0, z1, 9], rp.a); g.ln(x1, z0, 0, x1, z1, 0, rp.a); g.ln(x1, z0, 0, x1, z0, 0.5, rp.a); g.ln(x1, z1, 0, x1, z1, 9, rp.a); g.ln(x0, z1, 9, x1, z1, 9, rp.e);
        for (let k = 1; k < 4; k++) g.ln(x0 + k * 5.5, z0 + 1, 1.2, x0 + k * 5.5, z1 - 1, 8.4, hsl(0, 0, 96));
        break; }
      case 'pothole': g.pr(o.x, o.z, 0); px.ell(g.X, g.Y, o.r * 1.1 + 2, o.r * 0.5 + 1, hsl(275, 60, 40), hsl(275, 60, 28), 1); px.ell(g.X, g.Y, o.r * 1.0, o.r * 0.44, hsl(255, 60, 6)); px.ring(g.X, g.Y, o.r * 1.1 + 2, o.r * 0.5 + 1, hsl(285, 80, 66 + Math.sin(time * 4) * 10), 1); break;
      case 'hoop': {
        g.pr(o.x, o.z, o.y); const cx = g.X, cy = g.Y, c = o.hit ? hsl(140, 60, 50) : hsl(185, 95, 66);
        px.ring(cx, cy, 7, 16, c); px.ring(cx, cy, 8, 17, o.hit ? hsl(140, 50, 30) : hsl(200, 80, 38)); px.ring(cx, cy, 6, 15, o.hit ? hsl(140, 50, 30) : hsl(200, 80, 50), 1);
        g.shadow(o.x, o.z, 8, 0.78);
        break; }
      case 'target': {
        const x = o.x; g.shadow(x, o.z, 8, 0.7); g.box(x - 1, o.z - 1, 0, 2, 2, 12, R(30, 20, 28));
        g.pf(plane(x, o.z, 22, 18, 18, 16), hsl(40, 25, 92)); g.po(plane(x, o.z, 22, 18, 18, 16), OUT);
        const cols = [hsl(0, 78, 50), hsl(40, 25, 94), hsl(0, 78, 50), hsl(40, 25, 94), hsl(0, 78, 50)];
        for (let k = 1; k < 5; k++) g.pf(plane(x, o.z, 22, 18 - k * 3.4, 18 - k * 3.4, 14), o.hit ? hsl(220, 8, 60 - k * 3) : cols[k]);
        break; }
      case 'bar': { const rp = R(350, 80, 48); g.box(-60, o.z - 1.5, 0, 3, 3, 10, rp); g.box(57, o.z - 1.5, 0, 3, 3, 10, rp); for (let k = 0; k < 8; k++) g.box(-58 + k * 14.5, o.z - 1.2, 8, 14.5, 2.4, 2.4, R(k % 2 ? 350 : 50, 85, k % 2 ? 48 : 60)); break; }
      case 'finish': {
        const rp = R(270, 50, 40); g.box(-62, o.z - 2, 0, 5, 5, 44, rp); g.box(57, o.z - 2, 0, 5, 5, 44, rp);
        for (let k = 0; k < 12; k++) for (let q = 0; q < 2; q++) g.pf([-57 + k * 9.5, o.z, 38 + q * 4, -57 + (k + 1) * 9.5, o.z, 38 + q * 4, -57 + (k + 1) * 9.5, o.z, 42 + q * 4, -57 + k * 9.5, o.z, 42 + q * 4], (k + q) % 2 ? hsl(0, 0, 96) : hsl(250, 30, 10));
        g.pr(0, o.z, 52); px.text('FINISH', g.X, g.Y - 6, 2, hsl(50, 95, 64), 'center', OUT);
        break; }
    }
  };

  Sp.pickup = function (k, time) {
    if (k.taken) return;
    const bob = Math.round(Math.sin(time * 4 + k.z) * 2);
    g.shadow(k.x, k.z, 7, 0.6);
    if (k.t === 'bundle') {
      g.ring(k.x, k.z, 0, 10 + Math.sin(time * 5) * 1.5, hsl(0, 0, 92));
      for (let q = 0; q < 3; q++) g.cyl(k.x + (q - 1) * 3.4, k.z, 1 + (q === 1 ? 5 : 0), 2.1, 7, R(48, 25, 90));
      g.box(k.x - 5.5, k.z - 0.8, 4 + bob * 0.3, 11, 1.6, 2, R(0, 80, 48));
      g.pr(k.x, k.z, 22 + bob); px.text('+8', g.X, g.Y - 3, 1, hsl(0, 0, 100), 'center', OUT);
    } else if (k.t === 'up') {
      g.ball(k.x, k.z, 14 + bob, 6, R(135, 75, 48)); g.pr(k.x, k.z, 14 + bob); px.text('1UP', g.X, g.Y - 3, 1, hsl(0, 0, 100), 'center', OUT);
    } else {
      const P = G.POWER[k.k], col = parseInt(P.col.slice(1), 16), c = px.rgb((col >> 16) & 255, (col >> 8) & 255, col & 255);
      g.pr(k.x, k.z, 14 + bob); px.ell(g.X, g.Y, 9, 9, c); px.ell(g.X, g.Y, 7, 7, hsl(250, 55, 14)); px.ring(g.X, g.Y, 11, 11, c, Math.floor(time * 6) % 2 ? 1 : 5);
      px.text(P.ico, g.X - 2, g.Y - 3, 1, c, 'left', null);
    }
  };

  Sp.paper = function (p) {
    if (p.dead) return;
    g.pr(p.x, p.z, 0); const gx = g.X, gy = g.Y, sh = p.y > 40 ? 0.85 : 0.6; px.darkEll(gx, gy, 3, 1.5, sh);
    g.pr(p.x, p.z, p.y); const x = g.X, y = g.Y;
    if (!p.rest && !p.settle) { g.pr(p.x - p.vx * 0.06, p.z - p.vz * 0.06, p.y - p.vy * 0.06); px.line(x, y, g.X, g.Y, hsl(0, 0, 90)); }
    const f = Math.floor(p.spin * 2) % 2 === 0;
    if (f) { px.rect(x - 3, y - 1, 6, 3, OUT); px.rect(x - 2, y - 1, 4, 2, hsl(48, 30, 94)); px.rect(x, y - 1, 1, 2, hsl(0, 78, 50)); }
    else { px.rect(x - 2, y - 2, 3, 6, OUT); px.rect(x - 1, y - 2, 2, 5, hsl(48, 30, 94)); px.rect(x - 1, y, 2, 1, hsl(0, 78, 50)); }
  };

  Sp.haz = function (h, time) {
    if (h.t === 'meteor') {
      if (h.boom) { g.pr(h.x, h.z, 6); const r = 26 * (1 - h.boom / 0.5 * 0.6) + 8; px.blendEll(g.X, g.Y, r * 0.6, r * 0.35, hsl(30, 100, 62), Math.min(1, h.boom * 1.6)); px.ring(g.X, g.Y, r * 0.6, r * 0.35, hsl(50, 100, 80)); return; }
      g.ring(h.x, h.z, 0, h.r * (0.7 + 0.3 * Math.sin(time * 14)), hsl(5, 90, 58)); g.disc(h.x, h.z, 0, h.r * 0.9 * (1 - h.tm / 1.3), hsl(5, 90, 50), 0.35);
      g.ball(h.x + h.tm * 40, h.z + h.tm * 30, h.tm * 150, 6, R(20, 40, 34)); g.ball(h.x + h.tm * 40 + 4, h.z + h.tm * 30, h.tm * 150 + 3, 3, R(28, 100, 58));
    } else if (h.t === 'bone' || h.t === 'parcel') {
      g.ring(h.tx, h.tz, 0, 14, hsl(5, 90, 58)); g.disc(h.tx, h.tz, 0, 14 * (1 - h.tm / h.dur), hsl(5, 90, 50), 0.3);
      if (h.t === 'bone') { g.pr(h.x, h.z, h.y); const a = time * 12, dx = Math.round(Math.cos(a) * 8), dy = Math.round(Math.sin(a) * 4); px.line(g.X - dx, g.Y - dy, g.X + dx, g.Y + dy, OUT); px.line(g.X - dx, g.Y - dy - 1, g.X + dx, g.Y + dy - 1, hsl(48, 60, 90)); px.ell(g.X - dx, g.Y - dy, 2.5, 2.5, hsl(48, 60, 90)); px.ell(g.X + dx, g.Y + dy, 2.5, 2.5, hsl(48, 60, 90)); }
      else { g.box(h.x - 5, h.z - 5, h.y, 10, 10, 8, R(32, 55, 50)); g.pr(h.x, h.z, h.y + 4); px.rect(g.X - 1, g.Y - 4, 2, 5, hsl(0, 0, 94)); }
    } else if (h.t === 'clip') {
      const k = 1 - h.tm / h.dur; g.ring(h.tx, h.z, 0, 12, hsl(5, 90, 58)); g.ball(h.x + (h.tx - h.x) * k, h.z, 10 + Math.sin(k * Math.PI) * 40, 4.5, R(100, 70, 42));
    } else if (h.t === 'blade') {
      g.shadow(h.x, h.z, 12, 0.7); g.pr(h.x, h.z, 6); const cx = g.X, cy = g.Y, a0 = time * 25;
      const pts = []; for (let k = 0; k < 12; k++) { const a = a0 + k / 12 * 6.2832, r = k % 2 ? 7 : 16; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.55); }
      px.poly(pts, hsl(220, 14, 84)); px.outline(pts, OUT);
    }
  };

  /* ---------------- bosses ---------------- */
  Sp.boss = function (b, time) {
    const x = b.x, z = b.z, f = b.flash, dead = b.hp <= 0, jit = dead ? Math.round(Math.sin(time * 60)) * 1.5 : 0;
    g.shadow(x, z, b.type === 'mower' ? 26 : 22, 0.62);
    if (b.type === 'rex') {
      const run = b.state === 'charge' || b.state === 'trot' ? Math.sin(time * 14) * 4 : 0, steel = flash(215, 18, 56, f), dark = flash(220, 22, 34, f), red = flash(0, 80, 50, f), white = flash(0, 0, 82, f);
      for (const q of [[-9, -12, 1], [9, -12, -1], [-9, 12, -1], [9, 12, 1]]) g.box(x + q[0] - 3 + jit, z + q[1] - 3 + run * q[2] * 0.6, 0, 6, 6, 10, dark);
      g.box(x - 11 + jit, z - 20, 8, 22, 40, 16, steel); g.box(x - 11, z - 20, 24, 22, 40, 2.5, red);
      for (let k = 0; k < 5; k++) g.box(x - 3 + jit, z - 16 + k * 8, 25, 6, 4, 6, white);
      const hz = z + 22, open = b.state === 'dizzy' ? 8 : 2 + Math.sin(time * 10) * (b.state === 'trot' ? 1.5 : 0.5);
      g.box(x - 9, hz - 3, 18 + open * 0.3, 18, 16, 14, steel); g.box(x - 8, hz + 4, 10 - open * 0.2, 16, 14, 7, dark); g.box(x - 8, hz + 12, 15, 16, 4, 3, white);
      g.pr(x + 9, hz + 2, 29); const ec = b.state === 'dizzy' ? hsl(50, 100, 62) : hsl(0, 95, 56); px.ell(g.X, g.Y, 3, 3, ec, ec, 0); px.ring(g.X, g.Y, 3, 3, OUT);
      g.pr(x - 1, hz + 2, 29); px.ell(g.X, g.Y, 3, 3, ec); px.ring(g.X, g.Y, 3, 3, OUT);
      if (b.state === 'dizzy') for (let k = 0; k < 4; k++) { const a = time * 6 + k * 1.57; g.pr(x + Math.cos(a) * 14, hz + Math.sin(a) * 8, 40); px.text('*', g.X - 2, g.Y - 3, 1, hsl(50, 95, 64), 'left', OUT); }
      g.pr(x, z - 20, 18); px.blendEll(g.X, g.Y, 6, 9 + Math.sin(time * 40) * 2, hsl(30, 100, 64), b.state === 'charge' ? 0.9 : 0.4);
      if (b.state === 'warn') { const a = 0.4 + 0.3 * Math.sin(time * 24); px.blendPoly(g.sp([-C.CURB, z - 8, 0, C.CURB, z - 8, 0, C.CURB, z + 8, 0, -C.CURB, z + 8, 0]), hsl(0, 95, 56), a); g.pr(0, z, 8); px.text('CHARGE!', g.X, g.Y - 8, 2, hsl(5, 95, 66), 'center', OUT); }
    } else if (b.type === 'gorp') {
      const y = b.y + jit; g.pr(x, z, y); const cx = g.X, cy = g.Y, hull = flash(215, 30, 56, f), cab = flash(210, 40, 44, f);
      px.ell(cx, cy + 3, 34, 10, hull.a); px.ell(cx, cy + 2, 33, 9, hull.b); px.ell(cx, cy, 33, 8, hull.c); px.ell(cx - 5, cy - 2, 22, 4, hull.d);
      px.rect(cx - 9, cy - 1, 19, 7, cab.c); px.text('MAIL', cx - 10, cy - 1, 1, hsl(50, 95, 62), 'left', null);
      px.ell(cx, cy - 8, 16, 14, hsl(170, 60, 66)); px.ring(cx, cy - 8, 16, 14, OUT);
      px.ell(cx, cy - 10, 9, 9, f > 0 ? hsl(0, 0, 90) : hsl(105, 60, 52)); px.ring(cx, cy - 10, 9, 9, OUT);
      for (const ex of [-4, 0, 4]) { px.ell(cx + ex, cy - 12, 2, 2, hsl(0, 0, 98)); px.rect(cx + ex, cy - 12, 1, 2, OUT); }
      px.ell(cx, cy - 18, 8, 3, hsl(215, 70, 40)); px.rect(cx - 8, cy - 17, 16, 2, hsl(215, 70, 30));
      px.rect(cx + 24, cy + 4, 10, 14, hsl(32, 40, 56)); px.ring(cx + 29, cy + 4, 5, 3, OUT); px.outline([cx + 24, cy + 4, cx + 34, cy + 4, cx + 34, cy + 18, cx + 24, cy + 18], OUT);
      for (let k = 0; k < 3; k++) px.line(cx - 14 + k * 7, cy + 9, cx - 16 + k * 7 + Math.round(Math.sin(time * 5 + k) * 3), cy + 18, hsl(105, 60, 46));
      if (b.shield) { px.blendEll(cx, cy - 2, 40, 34, hsl(190, 90, 72), 0.18 + 0.08 * Math.sin(time * 10)); px.ring(cx, cy - 2, 40, 34, hsl(190, 90, 86), 1); }
    } else {
      const body = flash(120, 55, 40, f), met = flash(210, 10, 62, f), y0 = 14 + Math.abs(Math.sin(time * 4)) * (b.state === 'walk' ? 3 : 0);
      g.box(x - 7 + jit, z - 14, 0, 10, 9, y0 + 24, met); g.box(x - 7 + jit, z + 6, 0, 10, 9, y0 + 24, met);
      g.box(x - 15, z - 20, y0 + 24, 30, 40, 26, body); g.box(x - 15, z - 20, y0 + 50, 30, 40, 3, flash(60, 90, 52, f));
      g.ball(x, z + 14, y0 + 62, 9, flash(180, 20, 70, f)); g.pr(x, z + 14, y0 + 62); px.rect(g.X + 1, g.Y - 2, 4, 3, hsl(110, 100, 60)); px.rect(g.X - 6, g.Y - 2, 4, 3, hsl(110, 100, 60));
      const sweepA = b.state === 'sweep' ? time * 30 : time * 4; g.pr(x - b.side * 18, z - 4, y0 + 38);
      const pts = []; for (let k = 0; k < 8; k++) { const a = sweepA + k / 8 * 6.2832, r = k % 2 ? 6 : 14; pts.push(g.X + Math.cos(a) * r, g.Y + Math.sin(a) * r * 0.55); } px.poly(pts, hsl(220, 14, 88)); px.outline(pts, OUT);
      g.box(x - 9, z - 29, y0 + 28, 18, 10, 20, b.state === 'vent' ? R(50, 95, 58) : R(100, 40, 38));
      if (b.state === 'vent') { g.pr(x, z - 29, y0 + 54); px.text('WEAK SPOT!', g.X, g.Y - 6, 1, hsl(50, 95, 64), 'center', OUT); }
      if (b.state === 'warn') { const a = 0.4 + 0.3 * Math.sin(time * 24); px.blendPoly(g.sp([-C.CURB, z - 7, 0, C.CURB, z - 7, 0, C.CURB, z + 7, 0, -C.CURB, z + 7, 0]), hsl(0, 95, 56), a); g.pr(0, z, 8); px.text('JUMP THE BLADE!', g.X, g.Y - 8, 1, hsl(5, 95, 66), 'center', OUT); }
    }
  };
  G.sprites = Sp;
})((window.SGS = window.SGS || {}));
