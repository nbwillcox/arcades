/* HUD: time, score, hull, race progress, and the big banners. Glowing text is blurred once into a small cached canvas. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C;
  const HUD = {};
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

  const GS = 2, gcache = new Map();
  function glowEntry(s, size, color, weight, glow) {
    const key = s + '|' + size + '|' + color + '|' + weight + '|' + glow;
    let e = gcache.get(key);
    if (!e) {
      if (gcache.size > 220) gcache.clear();
      const f = weight + ' ' + (size * GS) + 'px ' + FONT, c = document.createElement('canvas'), cx = c.getContext('2d');
      cx.font = f;
      const tw = cx.measureText(s).width, pad = 16 * GS;
      c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(size * GS * 1.5 + pad * 2);
      cx.font = f; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
      cx.shadowColor = glow; cx.shadowBlur = 10 * GS; cx.fillStyle = color; cx.fillText(s, pad, pad + size * GS);
      e = { c, tw: tw / GS, pad: pad / GS, by: pad / GS + size };
      gcache.set(key, e);
    }
    return e;
  }
  function glowText(ctx, s, x, y, size, color, align, weight, glow) {
    if (s.length > 1 && /^[0-9,.+x: -]+$/.test(s)) {
      const gl = []; let tw = 0;
      for (const ch of s) { const e = glowEntry(ch, size, color, weight, glow); gl.push(e); tw += e.tw; }
      let pen = x + (align === 'center' ? -tw / 2 : align === 'right' ? -tw : 0);
      for (const e of gl) { ctx.drawImage(e.c, pen - e.pad, y - e.by, e.c.width / GS, e.c.height / GS); pen += e.tw; }
      return;
    }
    const e = glowEntry(s, size, color, weight, glow), ox = align === 'center' ? -e.tw / 2 : align === 'right' ? -e.tw : 0;
    ctx.drawImage(e.c, x + ox - e.pad, y - e.by, e.c.width / GS, e.c.height / GS);
  }
  function txt(ctx, s, x, y, size, color, align, weight, glow) {
    weight = weight || 800;
    if (glow) { glowText(ctx, s, x, y, size, color, align, weight, glow); return; }
    ctx.font = weight + ' ' + size + 'px ' + FONT;
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  HUD.txt = txt;

  HUD.draw = function (ctx, g, W, H) {
    const th = g.level ? g.level.theme : { accent: '#37e6ff' };
    const u = U.clamp(Math.min(W, H * 1.1) / 560, 0.72, 1.3);
    const grad = ctx.createLinearGradient(0, 0, 0, 110 * u);
    grad.addColorStop(0, 'rgba(2,4,18,0.78)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 110 * u);
    if (g.demo || !g.sim) return;
    const sim = g.sim, m = sim.m, safe = (window.TK && window.TK.safe) || { t: 0, l: 0, r: 0 };
    const top = (safe.t || 0) + 4;
    const lo = Math.max(14, (safe.l || 0) + 12), ro = W - Math.max(14, (safe.r || 0) + 12);
    /* time */
    const t = Math.max(0, sim.time), low = t < 10 && sim.state === 'play';
    const pulse = low ? 0.65 + 0.35 * Math.sin(g.clock * 12) : 1;
    ctx.globalAlpha = pulse;
    txt(ctx, 'TIME', W / 2, top + 18 * u, 11 * u, low ? '#ff7a6a' : th.accent, 'center', 800);
    txt(ctx, t.toFixed(1), W / 2, top + 58 * u, 42 * u, low ? '#ff6a5a' : '#ffffff', 'center', 900, low ? 'rgba(255,60,40,0.95)' : 'rgba(' + hex(th.accent) + ',0.8)');
    ctx.globalAlpha = 1;
    if (g.timePop > 0) { ctx.globalAlpha = Math.min(1, g.timePop * 2); txt(ctx, '+' + g.timePopV + ' SEC', W / 2, top + 84 * u, 16 * u, '#8dffd0', 'center', 900, 'rgba(60,255,170,0.9)'); ctx.globalAlpha = 1; }
    /* score + race name */
    txt(ctx, 'SCORE', lo, top + 18 * u, 11 * u, th.accent, 'left', 800);
    txt(ctx, U.fmt(g.score + (sim.state === 'finish' ? 0 : sim.score)), lo, top + 48 * u, 26 * u, '#ffffff', 'left', 800, 'rgba(' + hex(th.accent) + ',0.7)');
    txt(ctx, 'RACE ' + g.level.id + ' / ' + C.TOTAL_LEVELS, ro, top + 18 * u, 11 * u, th.accent, 'right', 800);
    txt(ctx, g.level.name, ro, top + 44 * u, 15 * u, '#ffffff', 'right', 800);
    /* hull */
    const hy = top + 70 * u, hull = Math.max(0, m.integ);
    txt(ctx, 'HULL', lo, hy + 3 * u, 10 * u, '#9fb7d8', 'left', 800);
    for (let i = 0; i < 3; i++) {
      const on = hull > (2 - i) / 3 + 0.001 - 0.0, ok = hull > i / 3;
      const full = m.integ > (i) / 3 + 0.001;
      const x0 = lo + 38 * u + i * 22 * u;
      ctx.fillStyle = full ? (m.integ < 0.34 ? '#ff5a4a' : m.integ < 0.67 ? '#ffc94a' : '#46e8ff') : 'rgba(255,255,255,0.14)';
      ctx.fillRect(x0, hy - 6 * u, 18 * u, 9 * u);
    }
    /* course progress */
    const pw = Math.min(W * 0.34, 220 * u), px = W / 2 - pw / 2, py = top + 96 * u, pn = Math.max(1, sim.path.length - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(px, py, pw, 3);
    ctx.fillStyle = th.accent; ctx.fillRect(px, py, pw * Math.min(1, sim.pi / pn), 3);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px + pw * Math.min(1, sim.pi / pn), py + 1.5, 4.5 * u, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(px + pw - 2, py - 4, 3, 11);
    /* banners */
    if (g.bannerT > 0 && g.banner) {
      ctx.globalAlpha = Math.min(1, g.bannerT * 2.5);
      const my = H * 0.4, sc = 1 + Math.max(0, g.bannerT - (g.bannerMax || 1) + 0.25) * 1.6;
      txt(ctx, g.banner, W / 2, my, (g.bannerSize || 46) * u * sc, g.bannerColor || '#ffe45a', 'center', 900, g.bannerGlow || 'rgba(255,200,40,0.9)');
      if (g.banner2) txt(ctx, g.banner2, W / 2, my + 34 * u, 16 * u, '#ffffff', 'center', 800);
      ctx.globalAlpha = 1;
    }
    if (g.hint && g.hintT > 0) {
      ctx.globalAlpha = Math.min(1, g.hintT);
      txt(ctx, g.hint, W / 2, H - Math.max(26, (safe.b || 0) + 22) * u, 14 * u, '#cfe8ff', 'center', 700);
      ctx.globalAlpha = 1;
    }
  };
  function hex(h) { const n = parseInt(h.slice(1), 16); return (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255); }

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
