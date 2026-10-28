/* Alien enemy sprites. Built per world with a hue picked to contrast with that world's backdrop; all face LEFT. */
(function (G) {
  'use strict';
  const PX = G.px, GFX = G.gfx, K = PX.K, Pix = PX.Pix;
  const A = (GFX.art = GFX.art || {});
  const rp = (a) => a.map(PX.rgb);
  const STEEL = rp(['#d6def2', '#a9b6d6', '#7a88b0', '#505c88', '#303a62']);
  const METAL = rp(['#cbd5ec', '#9caacb', '#6e7ba0', '#48527a', '#2c3352']);
  const C = PX.pal({ e: '#ffe45a', E: '#ffffff', t: '#f1e8cc', r: '#ff4a3a', o: '#ffa02e', k: '#161a30' });
  const W = 36, H = 36, OX = 18, OY = 30;
  const ELLIPSE = (m, x, y, rx, ry) => m.ell(OX + x, OY + y, rx, ry, 1);
  function pm(p, ramp, cap, fn) { const m = new Pix(W, H); fn(m); p.paint(m, 0, 0, ramp, cap); }
  /* two-bone leg (knee bends toward +x), thick lines, with a foot plate pointing left */
  function limb(p, ramp, hx, hy, fx, fy, l1, l2, w, foot) {
    const mx = (hx + fx) / 2, my = (hy + fy) / 2, dx = fx - hx, dy = fy - hy, d = Math.hypot(dx, dy) || 1, a = Math.sqrt(Math.max(0, ((l1 + l2) / 2) * ((l1 + l2) / 2) - (d / 2) * (d / 2)));
    const kx = mx + dy / d * a, ky = my - dx / d * a;
    pm(p, ramp, 2, (m) => { m.line(OX + hx, OY + hy, OX + kx, OY + ky, w, 1); m.line(OX + kx, OY + ky, OX + fx, OY + fy, w, 1); if (foot) m.rect(OX + Math.round(fx) - foot, OY + Math.round(fy), foot + 1, 2, 1); });
  }
  function skinOf(hue) { return PX.ramp(hue, 62, 46); }
  const dark = (r, t) => r.map((c) => PX.mix(c, PX.rgb('#1a1030'), t));
  const legPose = (f) => { const ph = f / 4 * Math.PI * 2; return [[-Math.sin(ph) * 4.6, -1.5 - Math.max(0, Math.cos(ph)) * 3], [-Math.sin(ph + Math.PI) * 4.6, -1.5 - Math.max(0, Math.cos(ph + Math.PI)) * 3]]; };

  function grunt(skin, f) {
    const p = new Pix(W, H), L = legPose(f), bob = f % 2 ? 1 : 0, S = skin, SD = dark(skin, 0.35);
    limb(p, SD, 1, -8 + bob, L[1][0] + 1, L[1][1], 4.4, 4.6, 3, 3);
    pm(p, S, 3, (m) => { m.poly([[OX - 3, OY - 8 + bob], [OX + 4, OY - 8.5 + bob], [OX + 4.5, OY - 14 + bob], [OX - 1, OY - 16.5 + bob], [OX - 6, OY - 15.5 + bob], [OX - 5, OY - 11 + bob]], 1); });
    pm(p, STEEL, 2, (m) => m.poly([[OX - 4, OY - 11.5 + bob], [OX + 2, OY - 10.5 + bob], [OX + 3, OY - 14.5 + bob], [OX - 1, OY - 16 + bob], [OX - 5, OY - 14.5 + bob]], 1));
    p.rect(OX - 3, OY - 9 + bob, 7, 1, STEEL[4]); p.set(OX, OY - 9 + bob, C.o);
    pm(p, SD, 2, (m) => m.poly([[OX - 2, OY - 20.5 + bob], [OX + 4, OY - 22 + bob], [OX + 7, OY - 20 + bob], [OX + 2, OY - 17 + bob]], 1));
    pm(p, S, 3, (m) => { ELLIPSE(m, -6.2, -17.6 + bob, 4.4, 3.4); m.rect(OX - 11, OY - 18 + bob, 4, 3, 1); });
    p.set(OX - 10, OY - 16 + bob, C.t); p.set(OX - 8, OY - 15 + bob, C.t); p.set(OX - 6, OY - 15 + bob, SD[3]);
    p.set(OX - 8, OY - 19 + bob, C.E); p.set(OX - 7, OY - 19 + bob, C.e); p.set(OX - 5, OY - 19 + bob, C.e);
    limb(p, S, -1, -8 + bob, L[0][0] - 1, L[0][1], 4.4, 4.6, 3, 3);
    p.line(OX - 4, OY - 13 + bob, OX - 6, OY - 10 + bob, 2, S[2]); p.line(OX - 6, OY - 10 + bob, OX - 9, OY - 11 + bob, 2, S[1]);
    p.line(OX - 8, OY - 11 + bob, OX - 16, OY - 12 + bob, 2, METAL[3]); p.line(OX - 9, OY - 12 + bob, OX - 15, OY - 12 + bob, 1, METAL[0]); p.set(OX - 17, OY - 12 + bob, C.o);
    p.rect(OX - 7, OY - 10 + bob, 2, 2, METAL[4]);
    return PX.sprite(p, OX, OY);
  }
  function sniper(skin, f) {
    const p = new Pix(W, H), S = skin, SD = dark(skin, 0.35), hb = f ? 1 : 0;
    limb(p, SD, 1, -10, 2.5, -1.5, 5, 5, 3, 3);
    pm(p, S, 3, (m) => m.poly([[OX - 4, OY - 10], [OX + 4, OY - 10], [OX + 5, OY - 16], [OX, OY - 18], [OX - 5, OY - 16]], 1));
    pm(p, STEEL, 2, (m) => m.poly([[OX - 5, OY - 13], [OX + 4, OY - 12], [OX + 4, OY - 17], [OX - 1, OY - 18], [OX - 5, OY - 17]], 1));
    p.rect(OX - 4, OY - 10, 8, 1, STEEL[4]); p.set(OX, OY - 10, C.o);
    limb(p, S, -1, -10, -2.5, -1.5, 5, 5, 3, 3);
    pm(p, SD, 2, (m) => m.poly([[OX - 4, OY - 24 + hb], [OX + 3, OY - 25 + hb], [OX + 6, OY - 20 + hb], [OX + 1, OY - 19 + hb]], 1));
    pm(p, S, 3, (m) => { ELLIPSE(m, -3, -21 + hb, 4.2, 3.4); m.rect(OX - 8, OY - 22 + hb, 4, 3, 1); });
    pm(p, STEEL, 3, (m) => { m.ell(OX - 2, OY - 22.5 + hb, 4.8, 2.6, 1); });
    p.set(OX - 6, OY - 21 + hb, C.E); p.set(OX - 5, OY - 21 + hb, C.e); p.set(OX - 3, OY - 21 + hb, C.e); p.set(OX - 6, OY - 19 + hb, C.t);
    p.line(OX - 2, OY - 15, OX - 5, OY - 13, 2, S[2]);
    p.line(OX - 4, OY - 14, OX - 19, OY - 15, 2, METAL[3]); p.line(OX - 4, OY - 15, OX - 18, OY - 15, 1, METAL[0]);
    p.rect(OX - 11, OY - 18, 4, 2, METAL[4]); p.set(OX - 10, OY - 17, C.r); p.set(OX - 20, OY - 15, C.o);
    return PX.sprite(p, OX, OY);
  }
  function leaper(skin, f) {
    const p = new Pix(W, H), S = skin, SD = dark(skin, 0.35);
    if (!f) {
      pm(p, SD, 2, (m) => { ELLIPSE(m, 4, -3.5, 5, 3.5); });
      pm(p, S, 3, (m) => { ELLIPSE(m, -1, -6.5, 7, 5.2); });
      pm(p, S, 2, (m) => { m.rect(OX - 9, OY - 3, 3, 3, 1); m.rect(OX - 4, OY - 2, 3, 2, 1); });
      p.rect(OX - 12, OY - 2, 4, 2, S[2]); p.rect(OX - 8, OY - 1, 5, 1, S[3]);
    } else {
      pm(p, SD, 2, (m) => { m.line(OX + 3, OY - 7, OX + 11, OY - 2, 3, 1); m.rect(OX + 10, OY - 2, 4, 2, 1); });
      pm(p, S, 3, (m) => { ELLIPSE(m, -1, -9.5, 8, 4.4); m.line(OX - 6, OY - 7, OX - 12, OY - 4, 2, 1); });
      p.rect(OX - 15, OY - 4, 4, 2, S[2]);
    }
    const ey = f ? -11.5 : -9.5;
    p.disc(OX - 4.5, OY + ey, 2.4, C.E); p.disc(OX + 0.8, OY + ey - 1, 2, C.E); p.set(OX - 6, OY + Math.round(ey), C.k); p.set(OX - 6, OY + Math.round(ey) + 1, C.k); p.set(OX - 0, OY + Math.round(ey) - 1, C.k); p.set(OX - 0, OY + Math.round(ey), C.k);
    p.rect(OX - 8, OY + (f ? -7 : -5), 5, 1, SD[4]); p.set(OX - 8, OY + (f ? -6 : -4), C.t); p.set(OX - 6, OY + (f ? -6 : -4), C.t);
    return PX.sprite(p, OX, OY);
  }
  A.foesBuilt = {};
  A.foes = function (theme) {
    if (A.foesBuilt[theme]) return A.foesBuilt[theme];
    const hue = [318, 22, 172, 78, 356][theme], skin = skinOf(hue), F = {};
    F.grunt = [0, 1, 2, 3].map((i) => grunt(skin, i)); F.sniper = [0, 1].map((i) => sniper(skin, i)); F.leaper = [0, 1].map((i) => leaper(skin, i));
    for (const k of ['grunt', 'sniper', 'leaper']) F[k + 'F'] = F[k].map((s) => PX.flash(s));
    return (A.foesBuilt[theme] = F);
  };
})((window.SGS = window.SGS || {}));
