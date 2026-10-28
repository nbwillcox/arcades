/* The sci-fi tile faces, drawn as glowing etched light: orbs, energy rods, alien numerals, compass winds, three guardian sigils, nebula flowers and seasons.
   F.draw(ctx, id, cx, cy, w, h) paints one glyph inside a w x h plate (called once per face when sprites are built). */
(function (G) {
  'use strict';
  const F = {};
  G.faces = F;
  const T = Math.PI * 2, rgba = (c, a, k) => 'rgba(' + Math.round(c[0] * (k || 1)) + ',' + Math.round(c[1] * (k || 1)) + ',' + Math.round(c[2] * (k || 1)) + ',' + a + ')';
  const CY = [70, 225, 255], BL = [120, 150, 255], MG = [255, 110, 220], LM = [120, 255, 150], EM = [60, 230, 190], GD = [255, 214, 90], VI = [190, 120, 255], IC = [175, 205, 255], RD = [255, 90, 90], GN = [90, 255, 140], WH = [235, 245, 255];
  F.tint = function (id) {
    if (id < 9) return CY; if (id < 18) return LM; if (id < 27) return VI; if (id < 31) return IC;
    if (id === 31) return RD; if (id === 32) return GN; if (id === 33) return WH; return GD;
  };
  F.group = (id) => (id < 9 ? 0 : id < 18 ? 1 : id < 27 ? 2 : id < 31 ? 3 : id < 34 ? 4 : id < 38 ? 5 : 6);
  const PIPS = [
    [[0, 0]], [[0, -0.5], [0, 0.5]], [[-0.55, -0.62], [0, 0], [0.55, 0.62]], [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
    [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]], [[-0.5, -0.64], [0.5, -0.64], [-0.5, 0], [0.5, 0], [-0.5, 0.64], [0.5, 0.64]],
    [[-0.52, -0.74], [0, -0.58], [0.52, -0.42], [-0.5, 0.3], [0.5, 0.3], [-0.5, 0.8], [0.5, 0.8]],
    [[-0.5, -0.78], [0.5, -0.78], [-0.5, -0.26], [0.5, -0.26], [-0.5, 0.26], [0.5, 0.26], [-0.5, 0.78], [0.5, 0.78]],
    [[-0.62, -0.7], [0, -0.7], [0.62, -0.7], [-0.62, 0], [0, 0], [0.62, 0], [-0.62, 0.7], [0, 0.7], [0.62, 0.7]]];
  const PR = [0.62, 0.4, 0.33, 0.33, 0.3, 0.28, 0.25, 0.24, 0.22];
  const RODS = [null, [[0, -0.48], [0, 0.48]], [[0, -0.5], [-0.5, 0.5], [0.5, 0.5]], [[-0.45, -0.5], [0.45, -0.5], [-0.45, 0.5], [0.45, 0.5]],
    [[-0.5, -0.5], [0.5, -0.5], [0, 0], [-0.5, 0.5], [0.5, 0.5]], [[-0.5, -0.62], [0.5, -0.62], [-0.5, 0], [0.5, 0], [-0.5, 0.62], [0.5, 0.62]],
    [[0, -0.8], [-0.5, -0.28], [0.5, -0.28], [-0.5, 0.14], [0.5, 0.14], [-0.5, 0.56], [0.5, 0.56]],
    [[-0.45, -0.78], [0.45, -0.78], [-0.45, -0.26], [0.45, -0.26], [-0.45, 0.26], [0.45, 0.26], [-0.45, 0.78], [0.45, 0.78]],
    [[-0.62, -0.64], [0, -0.64], [0.62, -0.64], [-0.62, 0], [0, 0], [0.62, 0], [-0.62, 0.64], [0, 0.64], [0.62, 0.64]]];
  const RL = [0, 0.8, 0.5, 0.42, 0.4, 0.33, 0.27, 0.2, 0.22];
  function glow(ctx, c, blur, fn) { ctx.save(); ctx.shadowColor = rgba(c, 0.95); ctx.shadowBlur = blur; fn(); ctx.restore(); }
  function orb(ctx, x, y, r, c) {
    glow(ctx, c, r * 0.9, () => { ctx.fillStyle = rgba(c, 0.9); ctx.beginPath(); ctx.arc(x, y, r, 0, T); ctx.fill(); });
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.28, rgba(c, 0.95, 1.1)); g.addColorStop(0.8, rgba(c, 0.9, 0.45)); g.addColorStop(1, rgba(c, 1, 0.22));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, T); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, r * 0.1); ctx.beginPath(); ctx.arc(x, y, r * 0.95, 0, T); ctx.stroke();
  }
  function rod(ctx, x, y, hl, w, c) {
    glow(ctx, c, w * 1.4, () => { ctx.fillStyle = rgba(c, 0.8); ctx.beginPath(); ctx.roundRect(x - w / 2, y - hl, w, hl * 2, w / 2); ctx.fill(); });
    const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, rgba(c, 1, 0.35)); g.addColorStop(0.42, 'rgba(255,255,255,0.95)'); g.addColorStop(0.62, rgba(c, 1, 1.05)); g.addColorStop(1, rgba(c, 1, 0.3));
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x - w / 2, y - hl, w, hl * 2, w / 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, w * 0.1); ctx.stroke();
    ctx.fillStyle = 'rgba(0,20,30,0.45)'; ctx.fillRect(x - w / 2, y - hl * 0.18, w, Math.max(1, hl * 0.07)); // joint band
  }
  const poly = (ctx, pts) => { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); };
  const star = (ctx, cx, cy, n, ro, ri, rot) => { const p = []; for (let i = 0; i < n * 2; i++) { const a = rot + i * Math.PI / n, r = i & 1 ? ri : ro; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; };
  function stroke(ctx, c, lw, fn) { glow(ctx, c, lw * 3, () => { ctx.strokeStyle = rgba(c, 0.95); ctx.lineWidth = lw; ctx.lineCap = ctx.lineJoin = 'round'; fn(); ctx.stroke(); }); ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = lw * 0.38; fn(); ctx.stroke(); }
  function glowFill(ctx, c, blur, fn) { glow(ctx, c, blur, () => { ctx.fillStyle = rgba(c, 0.92); fn(); ctx.fill(); }); }

  F.draw = function (ctx, id, cx, cy, w, h) {
    const m = Math.min(w, h) / 2, c = F.tint(id);
    ctx.save(); ctx.translate(cx, cy);
    if (id < 9) {
      const n = id + 1, P = PIPS[id], r = m * PR[id];
      if (n === 1) { stroke(ctx, MG, m * 0.07, () => { ctx.beginPath(); ctx.ellipse(0, 0, m * 0.98, m * 0.34, -0.5, 0, T); }); orb(ctx, 0, 0, m * 0.55, CY); ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(m * 0.18, -m * 0.2, m * 0.1, 0, T); ctx.fill(); }
      else P.forEach((p, i) => orb(ctx, p[0] * w * 0.44, p[1] * h * 0.43, r * 1.32, [CY, BL, MG][(i + (n >> 1)) % 3]));
    } else if (id < 18) {
      const n = id - 8, cs = [LM, EM, GD][0];
      if (n === 1) { stroke(ctx, GD, m * 0.1, () => { ctx.beginPath(); ctx.moveTo(-m * 0.55, m * 0.8); ctx.quadraticCurveTo(0, m * 0.2, m * 0.5, -m * 0.7); }); glowFill(ctx, GD, m * 0.4, () => { ctx.beginPath(); ctx.arc(m * 0.5, -m * 0.7, m * 0.26, 0, T); }); stroke(ctx, LM, m * 0.07, () => { ctx.beginPath(); ctx.moveTo(-m * 0.1, m * 0.75); ctx.quadraticCurveTo(m * 0.25, m * 0.2, m * 0.2, -m * 0.55); }); }
      else RODS[n - 1].forEach((p, i) => rod(ctx, p[0] * w * 0.44, p[1] * h * 0.43, RL[n - 1] * h * 0.52, Math.min(w * 0.2, RL[n - 1] * h * 0.5), [LM, EM, cs][(i + (n >> 1)) % 3]));
    } else if (id < 27) {
      const n = id - 17, sz = m * 1.25;
      stroke(ctx, VI, m * 0.06, () => poly(ctx, star(ctx, 0, 0, 6, m * 0.98, m * 0.98, Math.PI / 6)));
      ctx.font = '900 ' + sz + 'px "Segoe UI", "Helvetica Neue", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const g = ctx.createLinearGradient(0, -sz / 2, 0, sz / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#e6c8ff'); g.addColorStop(1, '#b070ff');
      glow(ctx, MG, m * 0.5, () => { ctx.fillStyle = g; ctx.fillText(String(n), 0, m * 0.04); });
      ctx.lineWidth = m * 0.05; ctx.strokeStyle = 'rgba(60,10,110,0.7)'; ctx.strokeText(String(n), 0, m * 0.04); ctx.fillStyle = g; ctx.fillText(String(n), 0, m * 0.04);
      for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.32; ctx.fillStyle = rgba(MG, 0.95); ctx.beginPath(); ctx.arc(Math.cos(a) * m * 1.0 * 0.0 + (i - (n - 1) / 2) * m * 0.17, m * 0.86, m * 0.045, 0, T); ctx.fill(); }
    } else if (id < 31) {
      const d = id - 27, L = ['N', 'E', 'S', 'W'][d], ang = [-Math.PI / 2, 0, Math.PI / 2, Math.PI][d];
      stroke(ctx, IC, m * 0.05, () => { ctx.beginPath(); ctx.arc(0, 0, m * 0.62, 0, T); });
      for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + i * Math.PI / 2, on = i === d, ro = on ? m * 1.0 : m * 0.8; ctx.save(); ctx.rotate(a); ctx.fillStyle = on ? 'rgba(255,255,255,0.97)' : rgba(IC, 0.5); if (on) { ctx.shadowColor = '#fff'; ctx.shadowBlur = m * 0.5; } ctx.beginPath(); ctx.moveTo(ro, 0); ctx.lineTo(m * 0.3, -m * 0.2); ctx.lineTo(m * 0.3, m * 0.2); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.font = '900 ' + m * 0.62 + 'px "Segoe UI", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; glow(ctx, IC, m * 0.4, () => { ctx.fillStyle = '#fff'; ctx.fillText(L, 0, m * 0.04); }); void ang;
    } else if (id === 31) { // Nova: burst star with a hot core
      glowFill(ctx, RD, m * 0.7, () => poly(ctx, star(ctx, 0, 0, 8, m * 1.0, m * 0.42, -Math.PI / 8)));
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, m * 0.55); g.addColorStop(0, '#fff'); g.addColorStop(0.4, '#ffd070'); g.addColorStop(1, 'rgba(255,60,60,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, m * 0.55, 0, T); ctx.fill();
      stroke(ctx, [255, 200, 120], m * 0.04, () => poly(ctx, star(ctx, 0, 0, 8, m * 1.0, m * 0.42, -Math.PI / 8)));
    } else if (id === 32) { // Bio: hex cell lattice
      const hx = (r, rot) => { const p = []; for (let i = 0; i < 6; i++) p.push([Math.cos(rot + i * T / 6) * r, Math.sin(rot + i * T / 6) * r]); return p; };
      glowFill(ctx, GN, m * 0.5, () => poly(ctx, hx(m * 0.3, 0)));
      stroke(ctx, GN, m * 0.07, () => poly(ctx, hx(m * 0.95, Math.PI / 6)));
      stroke(ctx, [140, 255, 190], m * 0.05, () => { poly(ctx, hx(m * 0.58, 0)); ctx.moveTo(0, 0); });
      stroke(ctx, GN, m * 0.04, () => { ctx.beginPath(); for (let i = 0; i < 6; i++) { ctx.moveTo(Math.cos(i * T / 6) * m * 0.3, Math.sin(i * T / 6) * m * 0.3); ctx.lineTo(Math.cos(i * T / 6) * m * 0.58, Math.sin(i * T / 6) * m * 0.58); } });
    } else if (id === 33) { // Void: nested portal frames
      for (let i = 0; i < 4; i++) { const s = m * (0.95 - i * 0.22); stroke(ctx, i & 1 ? IC : WH, m * (0.06 - i * 0.008), () => { ctx.beginPath(); ctx.roundRect(-s * 0.8, -s, s * 1.6, s * 2, s * 0.25); }); }
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0, 0, m * 0.1, 0, T); ctx.fill();
    } else if (id < 38) { // flowers: rosettes
      const n = id - 34, pc = [[255, 140, 190], [255, 170, 80], [190, 130, 255], [90, 225, 255]][n], petals = [4, 5, 6, 8][n];
      for (let i = 0; i < petals; i++) { ctx.save(); ctx.rotate(i * T / petals + n * 0.2); glowFill(ctx, pc, m * 0.3, () => { ctx.beginPath(); ctx.ellipse(m * 0.5, 0, m * 0.5, m * (petals > 6 ? 0.2 : 0.3), 0, 0, T); }); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = m * 0.04; ctx.stroke(); ctx.restore(); }
      orb(ctx, 0, 0, m * 0.22, GD);
      ctx.fillStyle = rgba(GD, 0.95); for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.arc((i - n / 2) * m * 0.2, m * 0.92, m * 0.05, 0, T); ctx.fill(); }
    } else { // seasons: sun, snow, storm, terra
      const n = id - 38;
      if (n === 0) { glowFill(ctx, [255, 170, 60], m * 0.8, () => poly(ctx, star(ctx, 0, 0, 12, m, m * 0.62, 0))); orb(ctx, 0, 0, m * 0.46, [255, 210, 80]); }
      else if (n === 1) { stroke(ctx, [160, 235, 255], m * 0.07, () => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * T / 6 - Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); ctx.moveTo(0, 0); ctx.lineTo(ca * m, sa * m); for (const s of [0.55, 0.8]) { const px = ca * m * s, py = sa * m * s, b = m * (s === 0.55 ? 0.3 : 0.2); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a + 0.9) * b, py + Math.sin(a + 0.9) * b); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a - 0.9) * b, py + Math.sin(a - 0.9) * b); } } }); }
      else if (n === 2) { stroke(ctx, [255, 235, 110], m * 0.09, () => { ctx.beginPath(); ctx.moveTo(m * 0.22, -m); ctx.lineTo(-m * 0.38, m * 0.08); ctx.lineTo(m * 0.06, m * 0.08); ctx.lineTo(-m * 0.28, m); ctx.lineTo(m * 0.52, -m * 0.2); ctx.lineTo(m * 0.06, -m * 0.2); ctx.closePath(); }); stroke(ctx, [140, 120, 255], m * 0.04, () => { ctx.beginPath(); ctx.arc(0, 0, m * 0.92, 0.3, 1.8); ctx.moveTo(-m * 0.92, 0); ctx.arc(0, 0, m * 0.92, 3.4, 4.9); }); }
      else { orb(ctx, 0, 0, m * 0.6, [90, 200, 130]); stroke(ctx, [140, 255, 180], m * 0.05, () => { ctx.beginPath(); ctx.ellipse(0, 0, m * 0.95, m * 0.3, 0.4, 0, T); }); ctx.fillStyle = 'rgba(40,120,200,0.55)'; ctx.beginPath(); ctx.ellipse(-m * 0.1, m * 0.1, m * 0.3, m * 0.18, 0.5, 0, T); ctx.fill(); }
      ctx.fillStyle = rgba(GD, 0.95); ctx.beginPath(); ctx.moveTo(0, m * 0.8); ctx.lineTo(m * 0.1, m * 0.9); ctx.lineTo(0, m * 1.0); ctx.lineTo(-m * 0.1, m * 0.9); ctx.fill(); void c;
    }
    ctx.restore();
  };
})((window.SGS = window.SGS || {}));
