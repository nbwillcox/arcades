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

  const SLOT_COL = ['#7dffb8', '#ffb06a', '#9fd0ff', '#ff7a8a', '#ffd24a', '#8fe0ff'];
  function radar(ctx, g) {
    const rx = 250, ry = 7, rw = 460, rh = 46, WW = C.WW, St = G.stage, free = g.mode === 'free';
    ctx.fillStyle = 'rgba(2,6,20,0.72)'; ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeStyle = 'rgba(255,90,106,0.7)'; ctx.lineWidth = 1.4; ctx.strokeRect(rx, ry, rw, rh);
    if (!free) {
      const k = 1 - g.cam.y / Math.max(1, g.len);
      txt(ctx, 'ADVANCING', rx + rw / 2, ry + 18, 11, 'rgba(160,215,255,0.85)', 'center', 700);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(rx + 20, ry + 26, rw - 40, 8);
      ctx.fillStyle = '#ff5a6a'; ctx.fillRect(rx + 20, ry + 26, (rw - 40) * U.clamp(k, 0, 1), 8);
      txt(ctx, 'BOSS', rx + rw - 20, ry + 42, 10, '#ffb0b0', 'right', 800);
      return;
    }
    ctx.save(); ctx.beginPath(); ctx.rect(rx, ry, rw, rh); ctx.clip();
    ctx.strokeStyle = 'rgba(255,150,160,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let i = 0; i <= 92; i++) { const x = i / 92 * WW, px = rx + i / 92 * rw, py = ry + rh * 0.8 + (St.floorY(g, x) - 456) * 0.18; if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
    const vw = W / WW * rw, vx = rx + (U.wrap(g.cam.x - W / 2, WW) / WW) * rw;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.2; ctx.strokeRect(vx, ry + 2, vw, rh - 4); ctx.strokeRect(vx - rw, ry + 2, vw, rh - 4); ctx.strokeRect(vx + rw, ry + 2, vw, rh - 4);
    const dot = (x, y, r, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(rx + x / WW * rw, ry + 5 + (y - 60) / 440 * (rh - 10), r, 0, TAU); ctx.fill(); };
    for (const e of g.en) { if (e.type === 'hive') dot(e.x, e.y, 3.6 + Math.sin(g.time * 6) * 0.6, '#ff5ab0'); else if (e.type === 'carrier') dot(e.x, e.y, 2, '#ffe27a'); else if (e.type !== 'turret' && e.type !== 'tentacle') dot(e.x, e.y, 1.5, '#ff7a6a'); }
    for (const c of g.caps) dot(c.x, c.y, 1.8, '#ffb040');
    if (g.boss && g.boss.state !== 'done') dot(g.boss.x, g.boss.y, 4.5, '#ff3030');
    if (g.player.alive) dot(g.player.x, g.player.y, 2.4, '#ffffff');
    ctx.restore();
  }
  function meter(ctx, g) {
    const P = g.player, bw = 98, gap = 6, x0 = W / 2 - (6 * bw + 5 * gap) / 2, y0 = H - 32;
    const lv = [P.speedLv, P.missile, P.dbl, P.laser, P.opt, P.shield];
    g.SLOTS.forEach((nm, i) => {
      const x = x0 + i * (bw + gap), on = P.meter === i + 1, col = SLOT_COL[i];
      ctx.fillStyle = on ? 'rgba(' + (Math.floor(g.time * 8) % 2 ? '255,255,255,0.28' : '255,210,120,0.22') + ')' : 'rgba(6,10,30,0.72)'; ctx.fillRect(x, y0, bw, 24);
      ctx.strokeStyle = on ? '#ffffff' : col; ctx.globalAlpha = on ? 1 : 0.45; ctx.lineWidth = on ? 2.4 : 1.2; ctx.strokeRect(x, y0, bw, 24); ctx.globalAlpha = 1;
      txt(ctx, on ? nm : nm, x + bw / 2, y0 + 12, 11, on ? '#ffffff' : col, 'center', 800);
      for (let k = 0; k < lv[i]; k++) { ctx.fillStyle = col; ctx.fillRect(x + 6 + k * 8, y0 + 18, 6, 3); }
    });
    if (P.meter) txt(ctx, 'PRESS E', W / 2, y0 - 6, 11, 'rgba(255,230,160,0.9)', 'center', 800);
  }
  HUD.draw = function (ctx, g) {
    if (g.demo) return;
    const P = g.player, spr = GFX.spr;
    const grad = ctx.createLinearGradient(0, 0, 0, 60);
    grad.addColorStop(0, 'rgba(2,4,18,0.88)'); grad.addColorStop(1, 'rgba(2,4,18,0.15)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, 60);
    txt(ctx, 'SCORE', 18, 15, 11, '#ff5a6a', 'left', 800);
    txt(ctx, U.fmt(g.score), 18, 38, 24, '#ffffff', 'left', 800, 'rgba(120,200,255,0.8)');
    for (let i = 0; i < Math.max(0, g.lives - 1); i++) GFX.draw(ctx, spr.ship, 30 + i * 30, 52, 0, 0.55, 0.55);
    for (let i = 0; i < g.bombs; i++) { ctx.fillStyle = '#ffb06a'; ctx.beginPath(); ctx.arc(190 + i * 10, 52, 3.4, 0, TAU); ctx.fill(); }
    radar(ctx, g);
    txt(ctx, 'HIGH SCORE', W - 18, 15, 11, '#ff5a6a', 'right', 800);
    txt(ctx, U.fmt(Math.max(g.hi, g.score)), W - 18, 38, 22, '#9fe8ff', 'right', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'STAGE ' + g.stageNo + (g.mode === 'free' ? '' : '  FORCED'), W - 18, 54, 11, 'rgba(160,215,255,0.9)', 'right', 700);
    meter(ctx, g);
    if (g.mode === 'free' && g.hives.length && !g.bossState) txt(ctx, 'HIVES ' + g.en.filter((e) => e.type === 'hive').length, 18, 70 + 6, 11, 'rgba(255,150,200,0.9)', 'left', 800);
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
      txt(ctx, b.text, 0, 0, b.text.length > 18 ? 30 : 46, '#ffffff', 'center', 900, 'rgba(255,110,130,1)');
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
    txt(ctx, 'SPACE SIDE PEWS', cx1, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(255,110,130,0.9)');
    const help = ['FLY', 'W A S D', 'FIRE', 'SPACE  /  CLICK', 'REVERSE', 'SHIFT', 'POWER-UP', 'E', 'SMART BOMB', 'B  /  RIGHT CLICK', 'HYPERSPACE', 'H', 'PAUSE', 'P  /  ESC'];
    help.forEach((s, i) => txt(ctx, s, cx1, top + 44 * sc + i * 19 * sc, (i % 2 ? 12 : 10) * sc, i % 2 ? col : '#ff5a6a', 'center', i % 2 ? 700 : 800));
    txt(ctx, 'TOP PILOTS', cx2, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(255,110,130,0.9)');
    G.scores.list.slice(0, 7).forEach((r, i) => txt(ctx, (i + 1) + '. ' + r.name + '  ' + U.fmt(r.score), cx2, top + 34 * sc + i * 22 * sc, 13 * sc, i === 0 ? '#ffd24a' : col, 'center', 700));
    txt(ctx, 'CAPSULES FILL THE METER', cx2, top + 210 * sc, 10 * sc, '#ff5a6a', 'center', 800);
    txt(ctx, 'SPEED MISSILE DOUBLE', cx2, top + 228 * sc, 11 * sc, col, 'center', 700);
    txt(ctx, 'LASER OPTION SHIELD', cx2, top + 244 * sc, 11 * sc, col, 'center', 700);
    txt(ctx, 'FREE TO PLAY & SHARE', cx2, top + 276 * sc, 10 * sc, '#ff5a6a', 'center', 800);
    txt(ctx, 'github.com/nbwillcox/SpaceSidePews', cx2, top + 294 * sc, 11 * sc, col, 'center', 700);
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
