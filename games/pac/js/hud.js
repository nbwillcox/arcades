/* HUD (score, level, lives, collected gems) and the big banners. Glowing text is blurred once into a small cached canvas. */
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
    if (s.length > 1 && /^[0-9,.+x -]+$/.test(s)) {                              /* numbers change all the time: draw them digit by digit from the cache */
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
    const th = g.mz ? g.mz.theme : C.THEMES[0];
    const grad = ctx.createLinearGradient(0, 0, 0, 84);
    grad.addColorStop(0, 'rgba(2,4,18,0.8)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 84);
    if (!g.demo) {
      txt(ctx, 'SCORE', 18, 22, 11, '#d8ff7a', 'left', 800);
      txt(ctx, U.fmt(g.score), 18, 50, 28, '#ffffff', 'left', 800, 'rgba(190,255,60,0.75)');
      txt(ctx, th.name, W / 2, 22, 11, th.wall, 'center', 800);
      txt(ctx, 'LEVEL ' + g.level, W / 2, 48, 22, '#ffffff', 'center', 800, th.glow);
      txt(ctx, 'BEST', W - 18, 22, 11, '#ffd24a', 'right', 800);
      txt(ctx, U.fmt(Math.max(g.score, G.scores.best())), W - 18, 50, 24, '#ffffff', 'right', 800, 'rgba(255,210,74,0.7)');
      if (g.fright > 0) {                                                        /* power-cell timer */
        const k = g.fright / (g.frightMax || 1);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W / 2 - 60, 60, 120, 5);
        ctx.fillStyle = k < 0.3 ? '#ff7ad9' : '#8fb4ff'; ctx.fillRect(W / 2 - 60, 60, 120 * k, 5);
      }
      /* bottom strip: lives on the left, gems collected on the right */
      const by = C.MY + C.ROWS * C.T + 30;
      for (let i = 0; i < Math.max(0, g.lives - 1); i++) Art.drawHero(ctx, 36 + i * 30, by, 4, 0, false, false, 0.85);
      txt(ctx, 'LIVES', 18, by + 30, 9, '#8fa6c8', 'left', 800);
      const n = g.gemsGot.length;
      for (let i = 0; i < n; i++) Art.drawGem(ctx, C.GEMS[g.gemsGot[i]], W - 30 - (n - 1 - i) * 30, by, 0, false);
      if (n) txt(ctx, 'GEMS', W - 18, by + 30, 9, '#8fa6c8', 'right', 800);
      if (g.phase === 'ready' && g.banner) {
        const a = Math.min(1, g.bannerT * 3);
        ctx.globalAlpha = a;
        txt(ctx, g.banner, W / 2, C.MY + 13.9 * C.T, 30, '#ffe45a', 'center', 900, 'rgba(255,200,40,0.9)');
        if (g.levelBanner > 0 && g.level > 0) txt(ctx, 'LEVEL ' + g.level + ' - ' + th.name, W / 2, C.MY + 8.9 * C.T, 13, '#ffffff', 'center', 800);
        ctx.globalAlpha = 1;
      }
      if (g.phase === 'clear' && g.phaseT < 2.0) {
        txt(ctx, 'LEVEL CLEAR', W / 2, C.MY + 12.3 * C.T, 34, '#7dffb0', 'center', 900, 'rgba(100,255,170,0.9)');
      }
    }
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
