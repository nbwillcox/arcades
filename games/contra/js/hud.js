/* HUD, banners and the decorative side panels, all in the 5x7 pixel font. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, PX = G.px, K = PX.K;
  const H = C.H;
  const HUD = {};
  const OL = '#0b0d1a', ORG = '#ff8a3d', WHT = '#ffffff';
  const T = (ctx, s, x, y, c, sz, a, extra) => PX.text(ctx, s, x, y, Object.assign({ s: sz || K, c, o: OL, a: a || 'l' }, extra || {}));

  let lifeIcon = null;
  function mkLife() {
    const p = new PX.Pix(12, 12), S = ['#ffffff', '#e8effd', '#c6d3f0', '#8ea2d2', '#5d6eaa'].map(PX.rgb), V = ['#dffcff', '#5bd6f6', '#1c88d2', '#0f4f96', '#0a2c5e'].map(PX.rgb);
    const m = new PX.Pix(12, 12); m.disc(6, 6.5, 5, 1); p.paint(m, 0, 0, S, 3);
    const v = new PX.Pix(12, 12); v.ell(8, 6.4, 3.2, 2.6, 1); p.paint(v, 0, 0, [V[3], V[3], V[3], V[4], V[4]], 3); p.set(7, 5, PX.rgb('#eaffff')); p.set(8, 4, PX.rgb('#eaffff'));
    p.rect(2, 10, 8, 1, PX.rgb('#ff8a1f'));
    return PX.sprite(p, 6, 6);
  }
  const bar = (ctx, x, y, w, h, k, col, back) => {
    ctx.fillStyle = OL; ctx.fillRect(x - K, y - K, w + 2 * K, h + 2 * K);
    ctx.fillStyle = back || '#2a2f4a'; ctx.fillRect(x, y, w, h);
    const n = Math.floor(w * U.clamp(k, 0, 1) / (K * 3)) * (K * 3);
    ctx.fillStyle = col; ctx.fillRect(x, y, n, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, n, K);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let q = K * 3; q < w; q += K * 3) ctx.fillRect(x + q - K, y, K, h);
  };

  HUD.draw = function (ctx, g) {
    if (g.demo) return;
    const P = g.player, st = g.st, inf = G.cheat.inf, A = GFX.art, sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    if (!lifeIcon) lifeIcon = mkLife();
    ctx.fillStyle = 'rgba(8,10,28,0.5)'; ctx.fillRect(0, 0, C.W, 60);
    ctx.fillStyle = OL; ctx.fillRect(0, 60, C.W, 2); ctx.fillStyle = '#ff6a3d'; ctx.fillRect(0, 62, C.W, 2); ctx.fillStyle = '#a03a1a'; ctx.fillRect(0, 64, C.W, 2);
    T(ctx, 'SCORE', 16, 8, ORG); T(ctx, U.fmt(g.score), 16, 28, WHT, 3, 'l', { sh: '#3a3f66' });
    if (!g.boss) { T(ctx, 'HI-SCORE', C.W / 2, 8, ORG, K, 'c'); T(ctx, U.fmt(Math.max(g.hi, g.score)), C.W / 2, 26, '#9fe8ff', K, 'c'); }
    T(ctx, 'STAGE ' + g.stageNo, C.W - 16, 8, ORG, K, 'r'); T(ctx, G.stage.THEMES[st.theme].name, C.W - 16, 28, WHT, K, 'r');
    for (let i = 0; i < Math.min(inf ? 1 : g.lives, 6); i++) PX.draw(ctx, lifeIcon, 228 + i * 26, 33, 1);
    if (inf) T(ctx, '∞', 258, 27, '#ffd24a', 3); else if (g.lives > 6) T(ctx, 'x' + g.lives, 228 + 6 * 26, 27, WHT);
    if (!g.boss) {
      const k = U.clamp(g.cam.x / (st.arenaX - Math.max(0, C.W - 960)), 0, 1), bx = C.W / 2 - 96, by = 46;
      ctx.fillStyle = OL; ctx.fillRect(bx - K, by - K, 192 + 2 * K, 8 + 2 * K); ctx.fillStyle = '#2a2f4a'; ctx.fillRect(bx, by, 192, 6);
      ctx.fillStyle = '#ff6a3d'; ctx.fillRect(bx, by, Math.floor(192 * k / 6) * 6, 6); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx, by, Math.floor(192 * k / 6) * 6, 2);
      ctx.fillStyle = WHT; ctx.fillRect(bx + Math.floor(192 * k / 2) * 2 - 2, by - 4, 4, 14);
    }
    // weapon row
    const own = g.owned(P);
    let ry = 82;
    if (!own.length) T(ctx, 'RIFLE', 16, ry - 6, '#d8e4ff');
    else own.forEach((wl, i) => { if (i) ry += 26; PX.draw(ctx, A.fl.cap[wl], 34, ry, 1); T(ctx, A.CAPS[wl].name, 66, ry - 6, A.CAPS[wl].c); });
    if (P.rapid) { ry += 26; PX.draw(ctx, A.fl.cap.R, 34, ry, 1); T(ctx, 'RAPID FIRE', 66, ry - 6, '#d8e8ff'); }
    if (P.shield > 0) { ry += 26; PX.draw(ctx, A.fl.cap.B, 34, ry, 1); T(ctx, 'BARRIER', 66, ry - 6, '#c88aff'); bar(ctx, 66, ry + 10, 84, 4, P.shield / 12, '#c88aff'); }
    if (g.boss) {
      const b = g.boss, k = U.clamp(b.core.hp / b.core.maxhp, 0, 1);
      T(ctx, b.name, C.W / 2, 8, '#ffb0a0', K, 'c');
      bar(ctx, C.W / 2 - 150, 30, 300, 10, k, '#ff4a3a', '#3a1620');
    }
    HUD.banner(ctx, g);
    ctx.imageSmoothingEnabled = sm;
  };

  HUD.banner = function (ctx, g) {
    const b = g.banner;
    if (!b) return;
    const k = b.t / b.life, a = k < 0.1 ? k / 0.1 : k > 0.82 ? Math.max(0, (1 - k) / 0.18) : 1, drop = k < 0.12 ? Math.round((0.12 - k) / 0.12 * 6) * K * 2 : 0, y0 = Math.round(H * 0.34);
    ctx.save(); ctx.globalAlpha = a;
    if (b.warn) {
      const flick = Math.floor(b.t * 4) % 2;
      for (let y = -48; y < 52; y += 4) { const f = 1 - Math.abs(y) / 52; ctx.fillStyle = 'rgba(255,40,40,' + (f * (flick ? 0.55 : 0.32)).toFixed(2) + ')'; ctx.fillRect(0, y0 + y, C.W, 4); }
      T(ctx, 'WARNING', C.W / 2, y0 - 28 - drop, flick ? '#ff6a6a' : '#ffffff', 8, 'c', { sh: '#7a0a0a' });
      T(ctx, b.sub, C.W / 2, y0 + 44, '#ffd0d0', 3, 'c');
    } else if (b.small) T(ctx, b.text, C.W / 2, y0 - 10 - drop, '#7dffb8', 4, 'c', { sh: '#1a5a3a' });
    else {
      T(ctx, b.text, C.W / 2, y0 - 24 - drop, WHT, b.text.length > 14 ? 5 : 7, 'c', { g: ['#ffffff', '#ffb36a'], sh: '#7a2a0a' });
      if (b.sub) T(ctx, b.sub, C.W / 2, y0 + 30, '#ffd24a', 3, 'c', { sh: '#6a4a0a' });
    }
    ctx.restore();
  };

  /* decorative panels on wide windows; coords are screen pixels */
  const paintSides = function (ctx, v, g) {
    const sw = v.ox;
    if (sw < 150) return;
    const sc = Math.min(1.15, sw / 240), cx1 = sw / 2, cx2 = v.ox + C.W * v.s + sw / 2, top = v.oy + 70 * sc, s2 = sc < 0.85 ? 1 : 2, s3 = sc < 0.85 ? 2 : 3, col = '#a8d4ff';
    ctx.save(); ctx.imageSmoothingEnabled = false;
    const t = (str, x, y, c, s, a) => PX.text(ctx, str, Math.round(x), Math.round(y), { s, c, o: OL, a: a || 'c' });
    t('SPACE', cx1, top - 40 * sc, '#ffffff', s3); t('CONTRA', cx1, top - 16 * sc, '#ff8a3d', s3);
    const help = ['RUN / AIM', 'ARROWS / WASD', 'FIRE', 'X / J / CLICK', 'JUMP', 'SPACE / Z / K', 'DROP DOWN', 'DOWN + JUMP', 'PAUSE', 'P / ESC'];
    help.forEach((s, i) => t(s, cx1, top + 30 * sc + i * 21 * sc, i % 2 ? col : '#ff8a3d', s2));
    t('TOP SOLDIERS', cx2, top - 16 * sc, '#ffffff', s3);
    G.scores.list.slice(0, 7).forEach((r, i) => t((i + 1) + '. ' + r.name + ' ' + U.fmt(r.score), cx2, top + 24 * sc + i * 24 * sc, i === 0 ? '#ffd24a' : col, s2));
    t('CAPSULES', cx2, top + 210 * sc, '#ff8a3d', s2);
    t('S SPREAD  M MACHINE', cx2, top + 232 * sc, col, s2); t('L LASER  F FLAME', cx2, top + 254 * sc, col, s2); t('R RAPID  B BARRIER', cx2, top + 276 * sc, col, s2);
    t('FREE TO PLAY & SHARE', cx2, top + 312 * sc, '#ff8a3d', s2); t('GITHUB.COM/NBWILLCOX', cx2, top + 334 * sc, col, s2); t('/SPACECONTRA', cx2, top + 354 * sc, col, s2);
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
