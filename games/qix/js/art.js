/* Neon drawing for the prowlers, crawlers, trail, marker, items and bolts. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const Art = {};
  const hexA = (hex, a) => { const n = parseInt(hex.replace('#', ''), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; };

  Art.ITEM = { F: ['#7ee8ff', 'F'], H: ['#7dffb0', 'H'], S: ['#ffd24a', 'S'], B: ['#ff7ad9', 'B'], L: ['#ffffff', '1UP'] };

  /* a faint dot grid over the open area */
  Art.drawGrid = function (ctx, t, info) {
    ctx.fillStyle = hexA(info.rim, 0.12);
    ctx.beginPath();
    for (let y = 0; y <= C.NY; y += 6) for (let x = 0; x <= C.NX; x += 6) ctx.rect(C.PX + x * C.CELL - 0.6, C.PY + y * C.CELL - 0.6, 1.2, 1.2);
    ctx.fill();
  };

  /* the prowler: a chaotic line (or three) with a strobing trail of ghosts */
  Art.drawProwler = function (ctx, pr, t, bossCol) {
    const lines = pr.lines, n = pr.hist.length;
    ctx.lineCap = 'round';
    const draw = (x, y, rot, eff, alpha, hue, w) => {
      const h = pr.len * 0.5 * eff;
      for (let l = 0; l < lines; l++) {
        const a = rot + l * TAU / lines, dx = Math.cos(a) * h, dy = Math.sin(a) * h;
        ctx.strokeStyle = bossCol ? hexA(bossCol, alpha) : 'hsla(' + hue + ',100%,62%,' + alpha + ')'; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(x - dx, y - dy); ctx.lineTo(x + dx, y + dy); ctx.stroke();
      }
    };
    for (let i = 0; i < n; i++) { const g = pr.hist[i], k = (i + 1) / (n + 1); draw(g.x, g.y, g.rot, g.eff, 0.1 + 0.35 * k, pr.hue + t * 90 + i * 28, 1.4 + k * 1.4); }
    draw(pr.x, pr.y, pr.rot, pr.eff, 0.95, pr.hue + t * 90, pr.boss ? 3.6 : 2.6);
    GFX.drawGlow(ctx, bossCol ? hexA(bossCol, 1) : 'hsla(' + Math.round((pr.hue + t * 90) % 360 / 10) * 10 + ',100%,60%,1)', pr.x, pr.y, pr.len * (pr.boss ? 0.9 : 0.7), 0.35);
    if (pr.frozen > 0) { ctx.strokeStyle = 'rgba(160,230,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.len * 0.55, 0, TAU); ctx.stroke(); }
  };

  Art.drawCrawler = function (ctx, x, y, c, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(t * 6 + c.ph);
    GFX.drawGlow(ctx, 'rgba(255,160,40,1)', 0, 0, 14, c.frozen > 0 ? 0.2 : 0.55);
    ctx.fillStyle = c.frozen > 0 ? '#a8e6ff' : '#ffb340'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
    ctx.beginPath(); for (let i = 0; i < 8; i++) { const a = i * TAU / 8, r = i % 2 ? 3.2 : 7; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  Art.drawTrail = function (ctx, F, p, fuse, t) {
    const col = p.mode === 2 ? '#ffd24a' : '#7ee8ff', tr = F.trail;
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    tr.forEach((v, i) => { const x = C.PX + v[0] * C.CELL, y = C.PY + v[1] * C.CELL; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.strokeStyle = hexA(col, 0.3); ctx.lineWidth = 8; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.stroke();
    if (fuse) {
      const i = Math.min(tr.length - 1, Math.floor(fuse.i)), v = tr[i], x = C.PX + v[0] * C.CELL, y = C.PY + v[1] * C.CELL;
      GFX.drawGlow(ctx, 'rgba(255,120,40,1)', x, y, 22, 0.9);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3 + Math.sin(t * 40), 0, TAU); ctx.fill();
    }
    ctx.restore();
  };

  Art.drawMarker = function (ctx, x, y, p, t) {
    const blink = p.inv > 0 && Math.floor(t * 14) % 2;
    if (blink) return;
    const col = p.drawing ? (p.mode === 2 ? '#ffd24a' : '#7ee8ff') : '#ffffff';
    GFX.drawGlow(ctx, p.mode === 2 && p.drawing ? 'rgba(255,210,70,1)' : 'rgba(120,230,255,1)', x, y, 20, 0.7);
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = col; ctx.strokeStyle = '#0a1030'; ctx.lineWidth = 1.5;
    ctx.fillRect(-5, -5, 10, 10); ctx.strokeRect(-5, -5, 10, 10);
    ctx.restore();
    if (p.shield > 0) { ctx.strokeStyle = 'rgba(125,255,176,' + (0.5 + 0.3 * Math.sin(t * 10)) + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 11, 0, TAU); ctx.stroke(); }
    if (p.speedT > 0) { ctx.strokeStyle = 'rgba(255,210,74,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 14 + Math.sin(t * 20), 0, TAU); ctx.stroke(); }
  };

  Art.drawItem = function (ctx, x, y, it, t) {
    const c = Art.ITEM[it.type];
    GFX.drawGlow(ctx, hexA(c[0], 1), x, y, 20, 0.5 + 0.2 * Math.sin(t * 5 + it.cx));
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = c[0]; ctx.lineWidth = 2; ctx.fillStyle = 'rgba(6,10,28,0.85)';
    ctx.rotate(t * 1.4); ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; ctx.lineTo(Math.cos(a) * 11, Math.sin(a) * 11); } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.rotate(-t * 1.4);
    ctx.fillStyle = '#fff'; ctx.font = '900 ' + (it.type === 'L' ? 9 : 12) + 'px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(c[1], 0, 1);
    ctx.restore();
  };

  Art.drawBolt = function (ctx, b, t) {
    GFX.drawGlow(ctx, 'rgba(255,170,90,1)', b.x, b.y, 16, 0.7);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(b.x, b.y, 3.2, 0, TAU); ctx.fill();
  };

  G.art = Art;
})((window.SGS = window.SGS || {}));
