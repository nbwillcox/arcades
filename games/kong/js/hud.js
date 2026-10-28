/* HUD (score, web, lives, power-up timers, boss bar) and the big banners. Glowing text is blurred once into a small cached canvas. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C;
  const W = C.W, H = C.H;
  const HUD = {};
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

  const GS = 2, gcache = new Map();
  function glowEntry(s, size, color, weight, glow) {
    const key = s + '|' + size + '|' + color + '|' + weight + '|' + glow;
    let e = gcache.get(key);
    if (!e) {
      if (gcache.size > 160) gcache.clear();
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
    if (s.length > 1 && /^[0-9,.+x -]+$/.test(s)) {
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

  HUD.draw = function (ctx, g) {
    const th = C.STAGES[g.stage] || C.STAGES[0];
    const grad = ctx.createLinearGradient(0, 0, 0, 90);
    grad.addColorStop(0, 'rgba(2,4,18,0.8)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 90);
    if (g.demo) return;
    const p = g.p;
    txt(ctx, 'SCORE', 18, 22, 11, th.rim, 'left', 800);
    txt(ctx, U.fmt(g.score), 18, 52, 28, '#ffffff', 'left', 800, th.glow);
    txt(ctx, 'STAGE ' + (g.stage + 1) + ' / 4', W / 2, 22, 11, th.rim, 'center', 800);
    txt(ctx, th.name, W / 2, 48, 18, '#ffffff', 'center', 800, th.glow);
    txt(ctx, 'BEST', W - 18, 22, 11, '#ffd24a', 'right', 800);
    txt(ctx, U.fmt(Math.max(g.score, G.scores.best())), W - 18, 50, 24, '#ffffff', 'right', 800, 'rgba(255,210,74,0.7)');
    if (g.st && g.st.rivets.length) { const left = g.st.rivets.filter((r) => !r.taken).length; txt(ctx, 'RIVETS LEFT ' + left, W / 2, 72, 12, '#ffd24a', 'center', 800); }
    const ly = C.OY + C.UH * C.K + 22;
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) { ctx.fillStyle = '#f2f8ff'; ctx.strokeStyle = '#7ee8ff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(30 + i * 28, ly, 9, 0, U.TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#10305a'; ctx.beginPath(); ctx.ellipse(34 + i * 28, ly, 5, 4.5, 0, 0, U.TAU); ctx.fill(); }
    txt(ctx, 'LIVES', 18, ly + 22, 9, '#8fa6c8', 'left', 800);
    if (p && p.hammer > 0) {
      const k = Math.min(1, p.hammer / C.HAMMER_TIME);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 60, ly - 6, 120, 8); ctx.fillStyle = '#ffe45a'; ctx.fillRect(W / 2 - 60, ly - 6, 120 * k, 8);
      txt(ctx, 'HAMMER', W / 2, ly + 14, 10, '#ffe45a', 'center', 800);
    }
    if (g.bannerT > 0 && g.banner) {
      ctx.globalAlpha = Math.min(1, g.bannerT * 2.5);
      const my = C.OY + C.UH * C.K * 0.5;
      txt(ctx, g.banner, W / 2, my - 4, 34, '#ffe45a', 'center', 900, 'rgba(255,200,40,0.9)');
      if (g.banner2) txt(ctx, g.banner2, W / 2, my + 28, 15, '#ffffff', 'center', 800);
      ctx.globalAlpha = 1;
    }
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
