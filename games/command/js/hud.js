/* HUD, banners, reticle and the decorative side panels. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C;
  const W = C.W, H = C.H, TAU = U.TAU;
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

  const WEAPON_LABEL = { std: 'STANDARD', cluster: 'CLUSTER', flak: 'FLAK', laser: 'LASER' };

  HUD.draw = function (ctx, g) {
    if (g.demo || g.state === 'shop') return;
    const st = g.st, Wp = G.weapons;
    ctx.save();
    ctx.strokeStyle = 'rgba(190,235,255,0.85)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(200, 10); ctx.lineTo(W - 200, 10); ctx.moveTo(200, 5); ctx.lineTo(200, 15); ctx.moveTo(W - 200, 5); ctx.lineTo(W - 200, 15); ctx.stroke();
    ctx.setLineDash([7, 5]); ctx.strokeStyle = 'rgba(190,235,255,0.75)';
    ctx.strokeRect(W / 2 - 110, 18, 220, 32); ctx.setLineDash([]);
    ctx.restore();
    txt(ctx, U.fmt(g.score), W / 2, 42, 22, '#ffe9c0', 'center', 800, 'rgba(255,190,110,0.8)');
    txt(ctx, 'WAVE', 20, 22, 11, '#7fd8ff', 'left', 800);
    txt(ctx, String(g.stage), 20, 46, 26, '#ffffff', 'left', 800, 'rgba(120,200,255,0.8)');
    txt(ctx, 'CREDITS', 78, 22, 11, '#7fd8ff', 'left', 800);
    txt(ctx, U.fmt(g.credits), 78, 46, 22, '#ffd24a', 'left', 800, 'rgba(255,200,60,0.6)');
    txt(ctx, 'HIGH', W - 20, 22, 11, '#7fd8ff', 'right', 800);
    txt(ctx, U.fmt(Math.max(g.hi, g.score)), W - 20, 46, 20, '#9fe8ff', 'right', 800, 'rgba(120,200,255,0.7)');
    ['std', 'cluster', 'flak', 'laser'].forEach((w, i) => {
      const x = 20 + i * 84, y = 64, on = g.weapon === w, have = Wp.available(g, w);
      ctx.fillStyle = on ? 'rgba(60,160,220,0.45)' : 'rgba(6,12,30,0.55)'; ctx.fillRect(x, y, 78, 20);
      ctx.strokeStyle = !have ? 'rgba(255,255,255,0.12)' : on ? '#9fe8ff' : 'rgba(150,200,230,0.5)'; ctx.lineWidth = on ? 2 : 1; ctx.strokeRect(x, y, 78, 20);
      txt(ctx, (i + 1) + '  ' + (have ? WEAPON_LABEL[w] : 'LOCKED'), x + 39, y + 14, 10, have ? '#ffffff' : 'rgba(255,255,255,0.3)', 'center', 800);
    });
    if (st.nukeGain > 0) {
      const k = g.nuke / 100, rdy = k >= 1;
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W - 140, 64, 120, 8);
      ctx.fillStyle = rdy ? '#ffb04a' : 'rgba(255,170,70,0.65)'; ctx.fillRect(W - 140, 64, 120 * k, 8);
      txt(ctx, rdy ? 'NUKE READY - SPACE' : 'NUKE', W - 140, 84, 10, rdy ? '#ffd9a0' : 'rgba(255,255,255,0.5)', 'left', 800);
    }
    if (st.laser) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W - 140, 92, 120, 6);
      ctx.fillStyle = g.laserLock ? '#ff6a6a' : '#7fe8ff'; ctx.fillRect(W - 140, 92, 120 * g.energy / 100, 6);
      txt(ctx, g.laserLock ? 'LASER OVERHEAT' : 'LASER', W - 140, 110, 10, 'rgba(255,255,255,0.5)', 'left', 800);
    }
    if (g.rapidT > 0) txt(ctx, 'RAPID FIRE ' + Math.ceil(g.rapidT) + 's', 20, 102, 12, '#ffe27a', 'left', 800, 'rgba(255,200,60,0.7)');
    HUD.banner(ctx, g);
  };

  HUD.reticle = function (ctx, g) {
    const I = G.input;
    if (g.demo || !I.mouseSeen || G.main.mode !== 'play' || g.state === 'clear') return;
    const x = U.clamp(I.mouseX, 0, W), y = U.clamp(I.mouseY, 0, H);
    const canFire = g.weapon === 'laser' ? !g.laserLock : !!G.weapons.nearestLauncher(g, x);
    const col = canFire ? '#bff0ff' : '#ff5a5a', p = 1 + Math.sin(g.time * 7) * 0.05;
    ctx.save();
    ctx.strokeStyle = canFire ? 'rgba(74,216,255,0.28)' : 'rgba(255,42,42,0.28)'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(x, y, 13 * p, 0, TAU); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 13 * p, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 24, y); ctx.lineTo(x - 7, y); ctx.moveTo(x + 7, y); ctx.lineTo(x + 24, y); ctx.moveTo(x, y - 24); ctx.lineTo(x, y - 7); ctx.moveTo(x, y + 7); ctx.lineTo(x, y + 24); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
    ctx.restore();
  };

  HUD.banner = function (ctx, g) {
    const b = g.banner;
    if (!b) return;
    const k = b.t / b.life;
    const a = k < 0.1 ? k / 0.1 : k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1;
    const sc = 1 + (k < 0.1 ? (0.1 - k) * 3 : 0);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(W / 2, H * 0.34);
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
      txt(ctx, b.text, 0, 0, b.text.length > 18 ? 34 : 46, '#ffffff', 'center', 900, 'rgba(90,200,255,1)');
      if (b.sub) txt(ctx, b.sub, 0, 36, 20, '#ffd24a', 'center', 800, 'rgba(255,200,60,0.9)');
    }
    ctx.restore();
  };

  const paintSides = function (ctx, v, g) {
    const sw = v.ox;
    if (sw < 150) return;
    const sc = Math.min(1.15, sw / 240), cx1 = sw / 2, cx2 = v.ox + W * v.s + sw / 2, top = v.oy + 70 * sc;
    const col = 'rgba(160,215,255,0.8)';
    ctx.save();
    txt(ctx, 'SPACECOMMAND', cx1, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(90,200,255,0.9)');
    const help = ['AIM', 'MOUSE', 'FIRE', 'LEFT CLICK', 'WEAPON', '1-4  /  Q E  /  WHEEL', 'NUKE', 'SPACE  /  RIGHT CLICK', 'PAUSE', 'P  /  ESC'];
    help.forEach((s, i) => txt(ctx, s, cx1, top + 44 * sc + i * 19 * sc, (i % 2 ? 12 : 10) * sc, i % 2 ? col : '#ff9a5d', 'center', i % 2 ? 700 : 800));
    txt(ctx, 'TOP COMMANDERS', cx2, top, 15 * sc, '#ffffff', 'center', 900, 'rgba(90,200,255,0.9)');
    G.scores.list.slice(0, 7).forEach((r, i) => txt(ctx, (i + 1) + '. ' + r.name + '  ' + U.fmt(r.score), cx2, top + 34 * sc + i * 22 * sc, 13 * sc, i === 0 ? '#ffd24a' : col, 'center', 700));
    txt(ctx, 'FREE TO PLAY & SHARE', cx2, top + 230 * sc, 10 * sc, '#ff9a5d', 'center', 800);
    txt(ctx, 'github.com/nbwillcox', cx2, top + 248 * sc, 12 * sc, col, 'center', 700);
    txt(ctx, '/SpaceCommand', cx2, top + 264 * sc, 12 * sc, col, 'center', 700);
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
