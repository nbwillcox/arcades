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

  HUD.draw = function (ctx, g) {
    if (g.demo) return;
    const P = g.player, spr = GFX.spr;
    const grad = ctx.createLinearGradient(0, 0, 0, 62);
    grad.addColorStop(0, 'rgba(2,4,18,0.9)'); grad.addColorStop(1, 'rgba(2,4,18,0.1)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 62);
    txt(ctx, 'SCORE', 16, 15, 11, '#ffb347', 'left', 800);
    txt(ctx, U.fmt(g.score), 16, 38, 22, '#ffffff', 'left', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'HIGH SCORE', W / 2, 15, 11, '#ffb347', 'center', 800);
    txt(ctx, U.fmt(Math.max(g.hi, g.score)), W / 2, 38, 22, '#9fe8ff', 'center', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'LEVEL', W - 16, 15, 11, '#ffb347', 'right', 800);
    txt(ctx, String(g.level), W - 16, 38, 22, '#ffffff', 'right', 800, 'rgba(120,200,255,0.8)');
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) GFX.draw(ctx, spr.miner, 26 + i * 26, 53, 0, 0.5, 0.5);
    if (g.boss) txt(ctx, 'FIND AND POP THE QUEEN', W / 2, 55, 11, 'rgba(255,150,200,0.95)', 'center', 800);
    else if (g.hatchOpen) txt(ctx, 'RETURN TO THE SURFACE', W / 2, 55, 12, Math.floor(g.time * 4) % 2 ? '#ffe27a' : '#ffffff', 'center', 800);
    else {
      const n = Math.min(g.minerals, g.quota);
      txt(ctx, 'MINERALS', W / 2 - 28, 55, 10, 'rgba(160,215,255,0.85)', 'center', 800);
      for (let i = 0; i < g.quota; i++) { ctx.fillStyle = i < n ? '#ffd24a' : 'rgba(255,255,255,0.18)'; ctx.fillRect(W / 2 + 6 + i * 13, 48, 9, 9); }
    }
    const fx = [['drill', P.drill, '#ffb347'], ['hose', P.longHose, '#9bffb0'], ['scan', P.scan, '#ff9af0']].filter((e) => e[1] > 0);
    if (P.shield) fx.push(['shield', 1, '#8fd4ff']);
    fx.forEach((e, i) => { const x = W - 22 - i * 34; GFX.draw(ctx, spr.crate[e[0]], x, 52, 0, 0.5, 0.5); if (e[0] !== 'shield') { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 10, 60, 20, 2.5); ctx.fillStyle = e[2]; ctx.fillRect(x - 10, 60, 20 * Math.min(1, e[1] / (C.FX_T + 6)), 2.5); } });
    HUD.banner(ctx, g);
  };

  HUD.banner = function (ctx, g) {
    const b = g.banner;
    if (!b) return;
    const k = b.t / b.life;
    const a = k < 0.1 ? k / 0.1 : k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1;
    const sc = 1 + (k < 0.1 ? (0.1 - k) * 3 : 0);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * 0.36);
    if (b.warn) {
      const flick = Math.floor(b.t * 4) % 2;
      const g2 = ctx.createLinearGradient(0, -50, 0, 50);
      g2.addColorStop(0, 'rgba(255,40,40,0)'); g2.addColorStop(0.5, 'rgba(255,40,40,' + (flick ? 0.5 : 0.28) + ')'); g2.addColorStop(1, 'rgba(255,40,40,0)');
      ctx.fillStyle = g2; ctx.fillRect(-W / 2, -50, W, 100);
      ctx.scale(sc, sc);
      txt(ctx, 'WARNING', 0, 12, 56, flick ? '#ff6a6a' : '#ffffff', 'center', 900, 'rgba(255,40,40,1)');
      txt(ctx, b.sub, 0, 44, 15, '#ffd0d0', 'center', 700);
    } else if (b.small) {
      txt(ctx, b.text, 0, 0, 26, '#7dffb8', 'center', 900, 'rgba(60,255,160,0.9)');
    } else {
      ctx.scale(sc, sc);
      txt(ctx, b.text, 0, 0, b.text.length > 18 ? 30 : 46, '#ffffff', 'center', 900, 'rgba(255,190,90,1)');
      if (b.sub) txt(ctx, b.sub, 0, 36, 22, '#ffd24a', 'center', 800, 'rgba(255,200,60,0.9)');
    }
    ctx.restore();
  };

  /* decorative panels on wide windows; coords are screen pixels */
  const paintSides = function (ctx, v, g) {
    const sw = v.ox;
    if (sw < 150) return;
    const sc = Math.min(1.15, sw / 240), cx1 = sw / 2, cx2 = v.ox + W * v.s + sw / 2, top = v.oy + 70 * sc;
    const col = 'rgba(160,215,255,0.8)';
    ctx.save();
    txt(ctx, 'SPACE DUG', cx1, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(255,190,90,0.9)');
    const help = ['DIG / MOVE', 'ARROWS  /  W A S D', 'PUMP THE ALIENS', 'HOLD SPACE', 'PAUSE', 'P  /  ESC'];
    help.forEach((s, i) => txt(ctx, s, cx1, top + 44 * sc + i * 19 * sc, (i % 2 ? 12 : 10) * sc, i % 2 ? col : '#ffb347', 'center', i % 2 ? 700 : 800));
    txt(ctx, 'MINERALS', cx1, top + 176 * sc, 11 * sc, '#ffb347', 'center', 800);
    GFX.art.TIERS.forEach((t, i) => txt(ctx, t.name, cx1, top + 196 * sc + i * 17 * sc, 11 * sc, t.c1, 'center', 700));
    txt(ctx, 'TOP MINERS', cx2, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(255,190,90,0.9)');
    G.scores.list.slice(0, 7).forEach((r, i) => txt(ctx, (i + 1) + '. ' + r.name + '  ' + U.fmt(r.score), cx2, top + 34 * sc + i * 22 * sc, 13 * sc, i === 0 ? '#ffd24a' : col, 'center', 700));
    txt(ctx, 'FREE TO PLAY & SHARE', cx2, top + 230 * sc, 10 * sc, '#ffb347', 'center', 800);
    txt(ctx, 'github.com/nbwillcox', cx2, top + 248 * sc, 12 * sc, col, 'center', 700);
    txt(ctx, '/SpaceDug', cx2, top + 264 * sc, 12 * sc, col, 'center', 700);
    ctx.restore();
  };

  let sideCache = null, sideKey = '';
  HUD.sides = function (ctx, v, g) {
    if (v.ox < 150) return;
    const key = [v.w, v.h, v.rs.toFixed(2), Math.round(v.ox), Math.round(v.oy), v.s.toFixed(3), G.scores.list.slice(0, 7).map((r) => r.name + r.score).join(',')].join('|');
    if (key !== sideKey || !sideCache) {
      sideKey = key;
      const pw = Math.round(v.ox * v.rs), ph = Math.round(v.h * v.rs);
      const full = document.createElement('canvas');
      full.width = Math.round(v.w * v.rs); full.height = ph;
      const x = full.getContext('2d');
      x.scale(v.rs, v.rs);
      paintSides(x, v, g);
      const strip = (sx) => { const c = document.createElement('canvas'); c.width = pw; c.height = ph; c.getContext('2d').drawImage(full, sx, 0, pw, ph, 0, 0, pw, ph); return c; };
      sideCache = { l: strip(0), r: strip(full.width - pw) };
    }
    ctx.drawImage(sideCache.l, 0, 0, v.ox, v.h);
    ctx.drawImage(sideCache.r, v.w - v.ox, 0, v.ox, v.h);
  };

  G.hud = HUD;
})((window.SGS = window.SGS || {}));
