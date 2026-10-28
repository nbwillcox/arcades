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
    const th = g.web ? g.web.theme : C.THEMES[0];
    const grad = ctx.createLinearGradient(0, 0, 0, 84);
    grad.addColorStop(0, 'rgba(2,4,18,0.8)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 84);
    if (g.demo) return;
    const p = g.p;
    txt(ctx, 'SCORE', 18, 22, 11, th.rim, 'left', 800);
    txt(ctx, U.fmt(g.score), 18, 50, 28, '#ffffff', 'left', 800, th.glow);
    txt(ctx, g.web.name, W / 2, 22, 11, th.rim, 'center', 800);
    txt(ctx, 'WEB ' + g.level, W / 2, 48, 22, '#ffffff', 'center', 800, th.glow);
    txt(ctx, 'BEST', W - 18, 22, 11, '#ffd24a', 'right', 800);
    txt(ctx, U.fmt(Math.max(g.score, G.scores.best())), W - 18, 50, 24, '#ffffff', 'right', 800, 'rgba(255,210,74,0.7)');
    /* bottom strip */
    const by = H - 36;
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) Art.drawClawIcon(ctx, 34 + i * 30, by, 1.1);
    txt(ctx, 'LIVES', 18, by + 22, 9, '#8fa6c8', 'left', 800);
    let ix = W - 18;
    const chips = [];
    if (p.pu.rapid > 0) chips.push(['R', '#ff7a3d', p.pu.rapid]);
    if (p.pu.spread > 0) chips.push(['S', '#7dffb0', p.pu.spread]);
    if (p.pu.pierce > 0) chips.push(['P', '#ff7ad9', p.pu.pierce]);
    for (let i = 0; i < p.shield; i++) chips.push(['H', '#7ee8ff', 99]);
    for (let i = 0; i < p.zaps; i++) chips.push(['Z', '#fff27a', 99]);
    for (const c of chips) {
      ctx.fillStyle = 'rgba(8,12,30,0.8)'; ctx.strokeStyle = c[1]; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(ix - 12, by - 2, 12, 0, U.TAU); ctx.fill(); ctx.stroke();
      if (c[2] < 98) { ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ix - 12, by - 2, 15.5, -Math.PI / 2, -Math.PI / 2 + U.TAU * Math.min(1, c[2] / 16)); ctx.stroke(); }
      txt(ctx, c[0], ix - 12, by + 3, 13, '#fff', 'center', 900);
      ix -= 34;
    }
    txt(ctx, 'CREDITS ' + U.fmt(g.credits), W / 2, by + 22, 11, '#ffd24a', 'center', 800);
    if (g.boss && !g.boss.dead) {
      const k = Math.max(0, g.boss.hp / g.boss.max);
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W / 2 - 100, 62, 200, 7);
      ctx.fillStyle = Art.BOSS[g.boss.skin].col; ctx.fillRect(W / 2 - 100, 62, 200 * k, 7);
      txt(ctx, Art.BOSS[g.boss.skin].name, W / 2, 80, 10, '#fff', 'center', 800);
    }
    if (g.bannerT > 0 && g.banner) {
      ctx.globalAlpha = Math.min(1, g.bannerT * 2.5);
      txt(ctx, g.banner, W / 2, C.CY - 6, 34, '#ffe45a', 'center', 900, 'rgba(255,200,40,0.9)');
      ctx.globalAlpha = 1;
    }
    if (g.phase === 'warp') txt(ctx, 'WARP', W / 2, C.CY - 6, 34, '#ffffff', 'center', 900, th.glow);
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
