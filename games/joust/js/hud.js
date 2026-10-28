/* HUD (score, web, lives, power-up timers, boss bar) and the big banners. Glowing text is blurred once into a small cached canvas. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, Art = G.art;
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
    const th = g.theme || C.THEMES[0];
    const grad = ctx.createLinearGradient(0, 0, 0, 70);
    grad.addColorStop(0, 'rgba(2,4,18,0.75)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 70);
    if (g.demo) return;
    const p = g.p;
    txt(ctx, 'SCORE', 20, 20, 11, th.rim, 'left', 800);
    txt(ctx, U.fmt(g.score), 20, 46, 26, '#ffffff', 'left', 800, th.glow);
    txt(ctx, 'WAVE', W / 2, 18, 11, th.rim, 'center', 800);
    txt(ctx, String(g.wave), W / 2, 46, 28, '#ffffff', 'center', 800, th.glow);
    txt(ctx, 'BEST', W - 20, 20, 11, '#ffd24a', 'right', 800);
    txt(ctx, U.fmt(Math.max(g.score, G.scores.best())), W - 20, 46, 24, '#ffffff', 'right', 800, 'rgba(255,210,74,0.7)');
    /* lives, credits and power-up chips along the bottom-left of the lava */
    const by = H - 22;
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) Art.drawRiderIcon(ctx, 34 + i * 38, by, 0.9);
    txt(ctx, 'CREDITS ' + U.fmt(g.credits), W - 20, by + 4, 12, '#ffd24a', 'right', 800);
    let ix = 20 + Math.max(0, g.lives - 1) * 38 + 70;
    const chips = [];
    for (let i = 0; i < p.shield; i++) chips.push(['S', '#7dffb0', 99]);
    if (p.pu.rapid > 0) chips.push(['R', '#ff7a3d', p.pu.rapid]);
    if (p.pu.lance > 0) chips.push(['L', '#ffe45a', p.pu.lance]);
    if (p.pu.magnet > 0) chips.push(['M', '#7ee8ff', p.pu.magnet]);
    for (const c of chips) {
      ctx.fillStyle = 'rgba(8,12,30,0.85)'; ctx.strokeStyle = c[1]; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ix, by, 12, 0, U.TAU); ctx.fill(); ctx.stroke();
      if (c[2] < 98) { ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ix, by, 15.5, -Math.PI / 2, -Math.PI / 2 + U.TAU * Math.min(1, c[2] / 12)); ctx.stroke(); }
      txt(ctx, c[0], ix, by + 4, 13, '#fff', 'center', 900);
      ix += 34;
    }
    if (g.chain.t > 0 && g.chain.n > 1) txt(ctx, 'EGG CHAIN x' + g.chain.n, W / 2, by + 4, 14, '#ffe45a', 'center', 900, 'rgba(255,200,40,0.8)');
    if (g.boss && !g.boss.dead) {
      const k = Math.max(0, g.boss.hp / g.boss.max);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W / 2 - 150, 60, 300, 8);
      ctx.fillStyle = C.BOSSES[g.boss.skin].col; ctx.fillRect(W / 2 - 150, 60, 300 * k, 8);
      txt(ctx, C.BOSSES[g.boss.skin].name, W / 2, 82, 10, '#fff', 'center', 800);
    }
    if (g.bannerT > 0 && g.banner) {
      ctx.globalAlpha = Math.min(1, g.bannerT * 2.5);
      txt(ctx, g.banner, W / 2, H / 2 - 40, 38, '#ffe45a', 'center', 900, 'rgba(255,200,40,0.9)');
      if (g.phase === 'clear') txt(ctx, 'BONUS +' + U.fmt(g.clearBonus || 0), W / 2, H / 2 - 8, 18, '#7dffb0', 'center', 900);
      ctx.globalAlpha = 1;
    }
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
