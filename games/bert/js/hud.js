/* HUD, banners and the decorative side panels. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const W = C.W, H = C.H;
  const HUD = {};
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

  const GS = 2, gcache = new Map();
  /* a glowing string is blurred once into a small canvas and cached; numbers (the score changes with every kill) are drawn digit by digit from that cache, so a new value never costs a new blur */
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


  HUD.sides = function () { /* portrait playfield: nothing decorative on the sides */ };

  HUD.draw = function (ctx, g) {
    if (g.demo) return;
    const grad = ctx.createLinearGradient(0, 0, 0, 120);
    grad.addColorStop(0, 'rgba(2,4,18,0.85)'); grad.addColorStop(1, 'rgba(2,4,18,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 120);
    txt(ctx, 'SCORE', 18, 20, 11, '#ff9a3d', 'left', 800);
    txt(ctx, U.fmt(g.score), 18, 46, 26, '#ffffff', 'left', 800, 'rgba(255,190,120,0.8)');
    const hx = window.TK && window.TK.on ? W - 70 : W - 18;           /* the touch pause button sits in the corner */
    txt(ctx, 'HIGH SCORE', hx, 20, 11, '#ff9a3d', 'right', 800);
    txt(ctx, U.fmt(Math.max(g.hi, g.score)), hx, 46, 26, '#9fe8ff', 'right', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'LEVEL ' + g.level + '  ROUND ' + g.round, W / 2, 20, 12, '#9fe8ff', 'center', 800);
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) G.art.heroIcon(ctx, W / 2 - (Math.max(0, g.lives - 2)) * 14 + i * 28, 56, 0.55);
    /* the colour sequence the cubes have to be hopped through */
    const A = G.art, pal = g.pal, m = g.mode;
    txt(ctx, m === 'toggle' ? 'HOP ON, HOP OFF' : m === 'cycle' ? 'KEEP CYCLING' : 'CHANGE TO', 18, 82, 11, '#7f95b8', 'left', 800);
    const seq = m === 'one' ? [0, 1] : m === 'toggle' ? [0, 1] : [0, 1, 2];
    seq.forEach((s, i) => {
      const x = 28 + i * 44, y = 104;
      A.miniCube(ctx, x, y, pal[s], s === g.n - 1);
      if (i < seq.length - 1) txt(ctx, m === 'toggle' ? '\u21C4' : '\u2192', x + 22, y + 5, 15, '#8fa6c8', 'center', 800);
    });
    if (m === 'cycle') txt(ctx, '\u21BB', 28 + seq.length * 44 - 10, 109, 16, '#8fa6c8', 'center', 800);

    if (g.msg) {
      const m2 = g.msg, k = m2.t / m2.dur, a = k < 0.12 ? k / 0.12 : k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1;
      ctx.globalAlpha = a;
      const slide = (1 - Math.min(1, k / 0.12)) * 30;
      txt(ctx, m2.title, W / 2, 150 + slide, m2.title.length > 12 ? 34 : 44, '#ffffff', 'center', 900, 'rgba(255,170,90,0.95)');
      if (m2.sub) txt(ctx, m2.sub, W / 2, 190 + slide, 22, '#ffd24a', 'center', 800, 'rgba(255,210,74,0.8)');
      ctx.globalAlpha = 1;
    }
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
