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
    const th = g.picInfo || C.PICS[0];
    const grad = ctx.createLinearGradient(0, 0, 0, 90);
    grad.addColorStop(0, 'rgba(2,4,18,0.8)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 90);
    if (g.demo) return;
    const p = g.p, pct = g.percent();
    txt(ctx, 'SCORE', 18, 20, 11, th.rim, 'left', 800);
    txt(ctx, U.fmt(g.score), 18, 46, 26, '#ffffff', 'left', 800, th.glow);
    txt(ctx, th.name, W / 2, 20, 11, th.rim, 'center', 800);
    txt(ctx, 'LEVEL ' + g.level, W / 2, 44, 22, '#ffffff', 'center', 800, th.glow);
    txt(ctx, 'BEST', W - 18, 20, 11, '#ffd24a', 'right', 800);
    txt(ctx, U.fmt(Math.max(g.score, G.scores.best())), W - 18, 46, 24, '#ffffff', 'right', 800, 'rgba(255,210,74,0.7)');
    /* progress to the target */
    const bx = C.PX, bw = C.FW, by = 62;
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(bx, by, bw, 12);
    ctx.fillStyle = th.rim; ctx.fillRect(bx, by, bw * Math.min(1, pct / 100), 12);
    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(bx + bw * g.target / 100 - 1, by - 3, 2, 18);
    txt(ctx, Math.floor(pct) + '%', bx + 4, by + 10, 10, pct > 8 ? '#05071a' : '#fff', 'left', 900);
    txt(ctx, 'TARGET ' + g.target + '%', bx + bw, by + 28, 10, '#fff', 'right', 800);
    if (g.isBoss && g.boss) txt(ctx, C.BOSSES[g.boss.skin].name, bx, by + 28, 10, C.BOSSES[g.boss.skin].col, 'left', 900);
    /* bottom strip */
    const ly = C.PY + C.FH + 38;
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) { ctx.save(); ctx.translate(30 + i * 28, ly); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#fff'; ctx.fillRect(-6, -6, 12, 12); ctx.restore(); }
    txt(ctx, 'LIVES', 18, ly + 22, 9, '#8fa6c8', 'left', 800);
    let ix = W - 22;
    const chips = [];
    for (let i = 0; i < p.shield; i++) chips.push(['H', '#7dffb0', 99]);
    if (p.speedT > 0) chips.push(['S', '#ffd24a', p.speedT]);
    for (const c of chips) {
      ctx.fillStyle = 'rgba(8,12,30,0.8)'; ctx.strokeStyle = c[1]; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ix - 12, ly - 2, 12, 0, U.TAU); ctx.fill(); ctx.stroke();
      if (c[2] < 98) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ix - 12, ly - 2, 15.5, -Math.PI / 2, -Math.PI / 2 + U.TAU * Math.min(1, c[2] / 12)); ctx.stroke(); }
      txt(ctx, c[0], ix - 12, ly + 3, 13, '#fff', 'center', 900);
      ix -= 34;
    }
    if (p.drawing) txt(ctx, p.mode === 2 ? 'SLOW DRAW  x2' : 'FAST DRAW', W / 2, ly + 4, 12, p.mode === 2 ? '#ffd24a' : '#7ee8ff', 'center', 900);
    else txt(ctx, 'HOLD SLOW WHEN YOU LEAVE THE EDGE FOR x2', W / 2, ly + 4, 9, '#8fa6c8', 'center', 800);
    if (g.bannerT > 0 && g.banner) {
      ctx.globalAlpha = Math.min(1, g.bannerT * 2.5);
      const my = C.PY + C.FH / 2;
      txt(ctx, g.banner, W / 2, my - 4, 32, '#ffe45a', 'center', 900, 'rgba(255,200,40,0.9)');
      if (g.phase === 'ready') txt(ctx, 'CLAIM ' + g.target + '% OF THE FIELD', W / 2, my + 26, 14, '#ffffff', 'center', 800);
      if (g.phase === 'clear') txt(ctx, 'BONUS +' + U.fmt(g.clearBonus || 0), W / 2, my + 28, 18, '#7dffb0', 'center', 900);
      ctx.globalAlpha = 1;
    }
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
