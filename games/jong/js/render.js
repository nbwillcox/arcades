/* Layout and drawing: nebula backdrop, glass slabs with live refraction, parallax tilt, selection / hint rings and every effect. Everything is in device pixels. */
(function (G) {
  'use strict';
  const GL = G.glass, F = G.faces, S = G.settings, U = G.U;
  const R = { dpr: 1, W: 1, H: 1, tilt: { x: 0, y: 0, tx: 0, ty: 0 }, inset: { t: 8, b: 8 }, layout: null, order: [], ex: 0, ey: 0 };
  G.render = R;
  const FONT = '"Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif';
  R.text = function (ctx, s, x, y, size, col, align, weight, glow) {
    ctx.font = (weight || 700) + ' ' + Math.round(size) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size * 0.08) + 'px';
    if (glow) { ctx.strokeStyle = glow; ctx.lineWidth = size * 0.16; ctx.lineJoin = 'round'; ctx.globalAlpha *= 0.5; ctx.strokeText(s, x, y); ctx.globalAlpha /= 0.5; }
    ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y);
  };
  R.resize = function (canvas) {
    const raw = window.devicePixelRatio || 1, touch = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    R.dpr = Math.max(0.6, Math.min(touch ? 1.25 : 1.5, raw) * S.quality);
    R.W = canvas.width = Math.max(2, Math.round(window.innerWidth * R.dpr)); R.H = canvas.height = Math.max(2, Math.round(window.innerHeight * R.dpr));
    R.bgc = GL.cv(R.W >> 1, R.H >> 1); R.bgx = R.bgc.getContext('2d'); R.bgFrame = 0;
    if (R.layout) R.setLayout(R.layout);
  };
  R.setInsets = function (t, b) { R.inset.t = t; R.inset.b = b; if (R.layout) R.setLayout(R.layout); };
  /* fit a layout into the free area; builds the glass sprites for that tile size */
  R.setLayout = function (lay) {
    R.layout = lay; const d = R.dpr, W = R.W, H = R.H, pad = 10 * d, aw = W - pad * 2, ah = H - (R.inset.t + R.inset.b) * d - pad * 2, zk = (lay.zmax + 1) * 0.15 * 1.5, asp = 1.3;
    let tw = Math.min(aw / (lay.w / 2 + zk), ah / (asp * lay.h / 2 + zk), 118 * d);
    tw = Math.max(14, Math.floor(tw)); R.tw = tw; R.th = Math.round(tw * asp); R.ux = tw / 2; R.uy = R.th / 2; R.t = tw * 0.15;
    const totW = lay.w * R.ux + (lay.zmax + 1) * R.t * 1.5, totH = lay.h * R.uy + (lay.zmax + 1) * R.t * 1.5;
    R.ox = Math.round((W - totW) / 2 + lay.zmax * R.t * 1.5); R.oy = Math.round(R.inset.t * d + pad + (ah - totH) / 2 + lay.zmax * R.t * 1.5);
    R.bw = totW; R.bh = totH; R.bx = R.ox - lay.zmax * R.t * 1.5;
    R.order = lay.tiles.map((t, i) => i).sort((a, b) => lay.tiles[a][2] - lay.tiles[b][2] || lay.tiles[a][0] - lay.tiles[b][0] || lay.tiles[a][1] - lay.tiles[b][1]);
    GL.build(R.tw, R.th); R.sec = { a: lay.hue, b: lay.hue, mix: 0 };
  };
  R.setPointer = function (nx, ny) { R.tilt.tx = nx; R.tilt.ty = ny; };
  const px = (g, i) => R.ox + g.L.x[i] * R.ux - g.L.z[i] * R.ex, py = (g, i) => R.oy + g.L.y[i] * R.uy - g.L.z[i] * R.ey;
  R.pos = (g, i, o) => { o = o || {}; o.x = px(g, i); o.y = py(g, i); o.w = R.tw; o.h = R.th; return o; };
  R.center = (g, i, o) => { o = o || {}; o.x = px(g, i) + R.tw / 2; o.y = py(g, i) + R.th / 2; return o; };
  /* top-most live tile under a device-pixel point, or -1 */
  R.hit = function (g, x, y) {
    if (!g.L) return -1;
    for (let k = R.order.length - 1; k >= 0; k--) {
      const i = R.order[k]; if (!g.alive[i] || g.introT < g.delay[i] + 0.35) continue;
      const tx = px(g, i), ty = py(g, i); if (x >= tx && x <= tx + R.tw && y >= ty && y <= ty + R.th) return i;
    }
    return -1;
  };
  function ring(ctx, x, y, w, h, rad, c, a, lw) {
    ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    GL.rr(ctx, x, y, w, h, rad); ctx.strokeStyle = 'rgba(' + c + ',' + (a * 0.28) + ')'; ctx.lineWidth = lw * 3.4; ctx.stroke();
    ctx.strokeStyle = 'rgba(' + c + ',' + a + ')'; ctx.lineWidth = lw; ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
  }
  /* ---------- the frame ---------- */
  R.draw = function (ctx, g, time, dt) {
    const W = R.W, H = R.H, d = R.dpr, L = g.L, lay = R.layout;
    // backdrop at half resolution, refreshed every frame (every other frame on slow machines)
    R.bgFrame++; if (S.quality >= 0.8 || R.bgFrame % 2 === 0 || !R.bgReady) { GL.backdrop(R.bgx, R.bgc.width, R.bgc.height, time, R.sec || { a: 0, b: 0, mix: 0 }, 1 + g.combo * 0.6); R.bgReady = true; }
    ctx.drawImage(R.bgc, 0, 0, W, H);
    if (!L || !lay) return;
    // parallax tilt: pointer on desktop, slow drift otherwise
    const T = R.tilt, drift = !S.tilt || S.reduced ? 0 : 1;
    T.x += (T.tx * drift - T.x) * Math.min(1, dt * 4); T.y += (T.ty * drift - T.y) * Math.min(1, dt * 4);
    const sx = drift ? T.x + Math.sin(time * 0.31) * 0.12 : 0, sy = drift ? T.y + Math.cos(time * 0.27) * 0.1 : 0;
    R.ex = R.t * (1.05 + 0.5 * sx); R.ey = R.t * (1.05 + 0.5 * sy);
    ctx.save();
    if (g.shakeA > 0.2 && S.shake && !S.reduced) ctx.translate((Math.random() - 0.5) * g.shakeA * d, (Math.random() - 0.5) * g.shakeA * d);
    // soft glow pool and drop shadow under the board
    const bx = R.bx, by = R.oy - lay.zmax * R.t * 1.5, cx = bx + R.bw / 2, cy = by + R.bh / 2, hue = GL.HUES[lay.hue % 6], pc = GL.hsl(hue + 20, 80, 55).map(Math.round).join(',');
    let gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, R.bw * 0.62); gr.addColorStop(0, 'rgba(' + pc + ',' + (0.2 + g.pulse * 0.3) + ')'); gr.addColorStop(1, 'rgba(' + pc + ',0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = gr; ctx.fillRect(cx - R.bw * 0.65, cy - R.bh * 0.9, R.bw * 1.3, R.bh * 1.8); ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(2,3,12,0.34)'; const tw = R.tw, th = R.th, sdx = R.ex * 2.6, sdy = R.ey * 2.6;
    for (const i of R.order) { if (L.z[i] !== 0 || !g.alive[i]) continue; const u = (g.introT - g.delay[i]) / 0.6; if (u <= 0.3) continue; ctx.beginPath(); ctx.roundRect(px(g, i) + sdx, py(g, i) + sdy, tw, th, GL.rad); ctx.fill(); }
    // tiles, bottom layer first
    const hq = S.glass === 'high', free = g.freeSet, rad = GL.rad, ex = R.ex, ey = R.ey, bg = R.bgc, bs = 0.5, act = g.active;
    const selCol = '255,226,122', hitCol = '160,230,255';
    for (const i of R.order) {
      if (!g.alive[i]) continue;
      let u = (g.introT - g.delay[i]) / 0.6; if (u <= 0) continue; u = u > 1 ? 1 : u;
      const z = L.z[i], f = g.faces[i], col = F.tint(f), lift = g.lift[i];
      let x = px(g, i), y = py(g, i), al = u < 1 ? Math.min(1, u * 4) : 1;
      if (lift) { x -= lift * R.t * 0.8; y -= lift * R.t * 1.1; }
      if (u < 1) y -= (1 - U.bounce(u)) * H * 0.7;
      if (g.shuf) { const k = Math.sin(U.clamp(g.shuf.t, 0, 1) * Math.PI); x += (cx - tw / 2 - x) * k * 0.92; y += (cy - th / 2 - y) * k * 0.92 + Math.sin(time * 30 + i) * k * 4 * d; al *= 1 - k * 0.35; }
      if (g.shk[i] > 0) x += Math.sin(g.shk[i] * 70) * g.shk[i] * R.t * 1.6;
      if (g.appear[i] > 0) { const ap = 1 - g.appear[i] / 0.5; al *= ap; y -= (1 - ap) * th * 0.5; }
      if (al < 1) ctx.globalAlpha = al;
      // glass thickness: right and bottom sides
      ctx.fillStyle = 'rgba(' + Math.round(col[0] * 0.36) + ',' + Math.round(col[1] * 0.4) + ',' + Math.round(60 + col[2] * 0.4) + ',0.94)';
      ctx.beginPath(); ctx.moveTo(x + tw, y + rad); ctx.lineTo(x + tw + ex, y + ey + rad); ctx.lineTo(x + tw + ex, y + th + ey); ctx.lineTo(x + tw, y + th); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(' + Math.round(40 + col[0] * 0.5) + ',' + Math.round(40 + col[1] * 0.5) + ',' + Math.round(70 + col[2] * 0.5) + ',0.94)';
      ctx.beginPath(); ctx.moveTo(x + rad, y + th); ctx.lineTo(x + ex + rad, y + th + ey); ctx.lineTo(x + tw + ex, y + th + ey); ctx.lineTo(x + tw, y + th); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.55)'; ctx.lineWidth = Math.max(1, d);
      ctx.beginPath(); ctx.moveTo(x + tw + ex, y + ey + rad); ctx.lineTo(x + tw + ex, y + th + ey); ctx.lineTo(x + ex + rad, y + th + ey); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
      // refracted nebula inside the face
      if (hq) {
        const mag = 1.7 + z * 0.12, sw = tw / mag * bs, sh = th / mag * bs, lx = x + tw / 2 + (x - cx) * 0.1, ly = y + th / 2 + (y - cy) * 0.1 + Math.sin(time * 0.9 + x * 0.013) * th * 0.03;
        ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, tw, th, rad); ctx.clip();
        ctx.drawImage(bg, Math.max(0, Math.min(bg.width - sw, lx * bs - sw / 2)), Math.max(0, Math.min(bg.height - sh, ly * bs - sh / 2)), sw, sh, x, y, tw, th);
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, tw, th); ctx.restore();
      } else { ctx.fillStyle = 'rgba(' + Math.round(col[0] * 0.25) + ',' + Math.round(col[1] * 0.25) + ',' + Math.round(40 + col[2] * 0.3) + ',0.8)'; ctx.beginPath(); ctx.roundRect(x, y, tw, th, rad); ctx.fill(); }
      ctx.drawImage(GL.spr[f], x, y, tw, th);
      // blocked tiles sink into shadow
      const isFree = free[i];
      if (!isFree && S.dim) { ctx.globalAlpha = al * (g.state === 'lost' ? 0.7 : 0.4); ctx.drawImage(GL.shade, x, y, tw, th); ctx.globalAlpha = al; }
      else if (isFree) { const sh = Math.sin((x + y) * 0.011 / (tw / 70) - time * 1.6) - 0.82; if (sh > 0) { ctx.globalAlpha = al * Math.min(1, sh * 3.5) * 0.5; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(GL.sheen, x, y, tw, th); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = al; } }
      // state rings
      const lw = Math.max(1.5, d * 2);
      if (i === g.sel) ring(ctx, x, y, tw, th, rad, selCol, 0.75 + Math.sin(time * 6) * 0.25, lw * 1.2);
      else if (i === act && isFree) ring(ctx, x, y, tw, th, rad, g.sel >= 0 && G.core.match(g.faces[g.sel], f) ? '120,255,170' : hitCol, 0.85, lw);
      if (g.hint && (i === g.hint.a || i === g.hint.b)) ring(ctx, x, y, tw, th, rad, '255,214,90', 0.4 + 0.6 * Math.abs(Math.sin(time * 5)), lw * 1.3);
      if (g.flash[i] > 0) ring(ctx, x, y, tw, th, rad, '255,80,90', Math.min(1, g.flash[i] * 3), lw * 1.2);
      if (g.sel >= 0 && i !== g.sel && isFree && G.core.match(g.faces[g.sel], f) && g.showMatches) ring(ctx, x, y, tw, th, rad, '255,255,255', 0.3 + 0.2 * Math.sin(time * 5), lw);
      ctx.globalAlpha = 1;
    }
    // effects
    ctx.globalCompositeOperation = 'lighter';
    for (const r of g.rings) { const k = r.age / r.life, rr = r.r0 + (r.r1 - r.r0) * U.easeOutCubic(k); ctx.strokeStyle = 'rgba(' + r.col + ',' + (1 - k) * 0.9 + ')'; ctx.lineWidth = Math.max(1, d * 4 * (1 - k)); ctx.beginPath(); ctx.arc(r.x, r.y, rr, 0, U.TAU); ctx.stroke(); }
    for (const b of g.beams) {
      const k = 1 - b.age / b.life; if (k <= 0) continue; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (let p = 0; p < 3; p++) { ctx.strokeStyle = p === 0 ? 'rgba(' + b.col + ',' + k * 0.22 + ')' : p === 1 ? 'rgba(' + b.col + ',' + k * 0.6 + ')' : 'rgba(255,255,255,' + k + ')'; ctx.lineWidth = d * (p === 0 ? 12 : p === 1 ? 5 : 1.8) * (0.6 + k * 0.6); ctx.beginPath(); b.pts.forEach((q, j) => (j ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]))); ctx.stroke(); }
    }
    for (const s of g.sparks) { const k = 1 - s.age / s.life; ctx.fillStyle = 'rgba(' + s.col + ',' + k + ')'; const r = s.r * (0.4 + k * 0.6); ctx.fillRect(s.x - r, s.y - r, r * 2, r * 2); }
    ctx.globalCompositeOperation = 'source-over';
    for (const s of g.shards) GL.drawShard(ctx, s);
    for (const p of g.pops) { const k = p.age / p.life; ctx.globalAlpha = Math.min(1, (1 - k) * 2); R.text(ctx, p.text, p.x, p.y - k * 60 * d, p.size * d * (1 + Math.min(0.3, (1 - k) * 0.3)), '#fff', 'center', 800, 'rgb(' + p.col + ')'); }
    ctx.globalAlpha = 1;
    ctx.restore();
    // banners and flash on top (not shaken)
    for (const b of g.banners) {
      const k = b.age / b.life, sc = k < 0.15 ? U.easeOutBack(k / 0.15) : 1, a = k > 0.75 ? (1 - k) / 0.25 : 1; ctx.save(); ctx.translate(W / 2, b.y !== undefined ? b.y : H * 0.46); ctx.scale(sc, sc); ctx.globalAlpha = Math.max(0, a);
      R.text(ctx, b.text, 0, 0, b.size * d, b.col || '#fff', 'center', 900, b.glow || 'rgb(80,180,255)'); ctx.restore();
    }
    if (g.flashA > 0.01) { ctx.fillStyle = 'rgba(255,255,255,' + g.flashA + ')'; ctx.fillRect(0, 0, W, H); }
    if (g.state === 'lost') { ctx.fillStyle = 'rgba(40,0,10,' + Math.min(0.5, g.endT * 0.4) + ')'; ctx.fillRect(0, 0, W, H); }
  };
})((window.SGS = window.SGS || {}));
