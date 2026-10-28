/* HUD, banners and the decorative side panels. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const W = C.W, H = C.H;
  const HUD = {};
  const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, sans-serif';

  const GS = 2, gcache = new Map();
  function glowText(ctx, s, x, y, size, color, align, weight, glow) {
    const key = s + '|' + size + '|' + color + '|' + weight + '|' + glow;
    let e = gcache.get(key);
    if (!e) {
      if (gcache.size > 120) gcache.clear();
      const f = weight + ' ' + (size * GS) + 'px ' + FONT, c = document.createElement('canvas'), cx = c.getContext('2d');
      cx.font = f;
      const tw = cx.measureText(s).width, pad = 16 * GS;
      c.width = Math.ceil(tw + pad * 2); c.height = Math.ceil(size * GS * 1.5 + pad * 2);
      cx.font = f; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
      cx.shadowColor = glow; cx.shadowBlur = 10 * GS; cx.fillStyle = color; cx.fillText(s, pad, pad + size * GS);
      e = { c, tw: tw / GS, pad: pad / GS, by: pad / GS + size };
      gcache.set(key, e);
    }
    const ox = align === 'center' ? -e.tw / 2 : align === 'right' ? -e.tw : 0;
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
    const I = G.input;
    if (g.demo) { I.buttons = {}; return; }
    const F = g.frog, spr = GFX.spr, lh = !!G.settings.left, classic = g.mode === 'classic';
    let grad = ctx.createLinearGradient(0, 0, 0, 52);
    grad.addColorStop(0, 'rgba(2,4,18,0.9)'); grad.addColorStop(1, 'rgba(2,4,18,0.1)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 52);
    grad = ctx.createLinearGradient(0, H - 92, 0, H);
    grad.addColorStop(0, 'rgba(2,4,18,0.15)'); grad.addColorStop(0.35, 'rgba(2,4,18,0.88)'); grad.addColorStop(1, 'rgba(2,4,18,0.95)');
    ctx.fillStyle = grad; ctx.fillRect(0, H - 92, W, 92);
    txt(ctx, 'SCORE', 16, 15, 11, '#7dff6a', 'left', 800);
    txt(ctx, U.fmt(g.score), 16, 38, 22, '#ffffff', 'left', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'HIGH SCORE', W / 2 - 18, 15, 11, '#7dff6a', 'center', 800);
    txt(ctx, U.fmt(Math.max(g.hi, g.score)), W / 2 - 18, 38, 22, '#9fe8ff', 'center', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, classic ? 'LEVEL' : 'DISTANCE', W - 62, 15, 11, '#7dff6a', 'right', 800);
    txt(ctx, String(classic ? g.level : g.maxRow), W - 62, 38, 22, '#ffffff', 'right', 800, 'rgba(120,200,255,0.8)');
    I.buttons.pause = { x: W - 48, y: 4, w: 44, h: 44 };
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(W - 34, 15, 5, 18); ctx.fillRect(W - 24, 15, 5, 18);
    // bottom: lives (or the void warning), timer bar and the power-up button
    const bx = lh ? 12 : W - 96, sx0 = lh ? W - 14 : 14;
    if (classic) {
      for (let i = 0; i < Math.max(0, g.lives - 1); i++) GFX.draw(ctx, spr.frog, lh ? sx0 - 16 - i * 34 : sx0 + 16 + i * 34, H - 44, 0, 0.62, 0.62);
      const tx = lh ? 110 : 112, tw = W - 224, k = U.clamp(F.time / C.TIMER, 0, 1), lowT = F.time < 8;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(tx, H - 36, tw, 14);
      ctx.fillStyle = lowT ? (Math.floor(g.time * 6) % 2 ? '#ff5a5a' : '#ffb04a') : '#7dff6a'; ctx.fillRect(tx, H - 36, tw * k, 14);
      txt(ctx, 'TIME', tx + tw / 2, H - 42, 10, 'rgba(220,240,255,0.8)', 'center', 800);
    } else {
      txt(ctx, 'STAY AHEAD OF THE VOID', W / 2, H - 28, 11, 'rgba(255,170,190,0.85)', 'center', 800);
    }
    if (g.slow > 0) txt(ctx, 'SLOW TIME ' + Math.ceil(g.slow), W / 2, H - 62, 12, '#ffd27a', 'center', 800);
    I.buttons.pow = { x: bx, y: H - 90, w: 84, h: 84 };
    const cx = bx + 42, cy = H - 48, has = !!g.inv;
    ctx.fillStyle = 'rgba(10,18,44,0.8)'; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, TAU); ctx.fill();
    ctx.strokeStyle = has ? GFX.art.POWER[g.inv].col : 'rgba(255,255,255,0.22)'; ctx.lineWidth = has ? 3 : 1.6; ctx.stroke();
    if (has) { ctx.globalCompositeOperation = 'lighter'; GFX.drawGlow(ctx, 'hsla(195,100%,60%,1)', cx, cy, 42, 0.3 + 0.12 * Math.sin(g.time * 6)); ctx.globalCompositeOperation = 'source-over'; GFX.draw(ctx, spr.pick[g.inv], cx, cy - 4, 0, 1.2, 1.2); txt(ctx, 'USE', cx, cy + 26, 10, '#ffffff', 'center', 800); }
    else txt(ctx, 'POWER', cx, cy + 4, 10, 'rgba(255,255,255,0.35)', 'center', 800);
    if (!g.moved && g.state === 'play' && !g.banner) txt(ctx, 'SWIPE OR TAP TO HOP', W / 2, H - 118, 14, 'rgba(210,240,255,0.9)', 'center', 800, 'rgba(120,255,140,0.5)');
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
      txt(ctx, b.text, 0, 0, b.text.length > 18 ? 30 : 46, '#ffffff', 'center', 900, 'rgba(130,255,120,1)');
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
    txt(ctx, 'SPACE FROGGER', cx1, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(130,255,120,0.9)');
    const help = ['HOP', 'ARROWS  /  W A S D', 'USE POWER-UP', 'SPACE  /  E', 'PAUSE', 'P  /  ESC', 'ON A PHONE', 'SWIPE = HOP   TAP = FORWARD'];
    help.forEach((s, i) => txt(ctx, s, cx1, top + 44 * sc + i * 19 * sc, (i % 2 ? 12 : 10) * sc, i % 2 ? col : '#7dff6a', 'center', i % 2 ? 700 : 800));
    txt(ctx, G.scores.mode === 'endless' ? 'TOP RUNNERS' : 'TOP PILOTS', cx2, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(130,255,120,0.9)');
    G.scores.list.slice(0, 7).forEach((r, i) => txt(ctx, (i + 1) + '. ' + r.name + '  ' + U.fmt(r.score), cx2, top + 34 * sc + i * 22 * sc, 13 * sc, i === 0 ? '#ffd24a' : col, 'center', 700));
    txt(ctx, 'FREE TO PLAY & SHARE', cx2, top + 230 * sc, 10 * sc, '#7dff6a', 'center', 800);
    txt(ctx, 'github.com/nbwillcox', cx2, top + 248 * sc, 12 * sc, col, 'center', 700);
    txt(ctx, '/SpaceFrogger', cx2, top + 264 * sc, 12 * sc, col, 'center', 700);
    ctx.restore();
  };

  let sideCache = null, sideKey = '';
  HUD.sides = function (ctx, v, g) {
    if (v.ox < 150) return;
    const key = [v.w, v.h, v.rs.toFixed(2), Math.round(v.ox), Math.round(v.oy), v.s.toFixed(3), G.scores.mode, G.scores.list.slice(0, 7).map((r) => r.name + r.score).join(',')].join('|');
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
