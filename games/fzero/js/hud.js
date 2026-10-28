/* Race HUD in the pixel font: rank, lap, times, speed, energy, minimap, banners and the countdown lights. */
(function (G) {
  'use strict';
  const C = G.C, PX = G.px, R = G.race, U = G.U;
  const HUD = {};
  G.hud = HUD;
  const OL = '#0b0d1a', ORG = '#ff8a3d', WHT = '#ffffff';
  const T = (ctx, s, x, y, c, sz, a, extra) => PX.text(ctx, s, x, y, Object.assign({ s: sz || 1, c, o: OL, a: a || 'l' }, extra || {}));
  let mini = null, miniFor = -1;
  const MS = 72;
  function buildMini(tr) {
    const c = document.createElement('canvas'); c.width = c.height = MS; const x = c.getContext('2d'), k = (MS - 8) / C.MAP;
    x.fillStyle = 'rgba(8,10,28,0.55)'; x.fillRect(0, 0, MS, MS);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let s = 0; s < tr.N; s++) { x0 = Math.min(x0, tr.x[s]); x1 = Math.max(x1, tr.x[s]); y0 = Math.min(y0, tr.y[s]); y1 = Math.max(y1, tr.y[s]); }
    const sc = (MS - 10) / Math.max(x1 - x0, y1 - y0), ox = (MS - (x1 - x0) * sc) / 2, oy = (MS - (y1 - y0) * sc) / 2;
    tr.mm = { sc, ox, oy, x0, y0 };
    for (const [w, col] of [[4, '#0b0d1a'], [2, '#8ea2d2']]) { x.lineWidth = w; x.strokeStyle = col; x.beginPath(); for (let s = 0; s < tr.N; s += 2) { const px = ox + (tr.x[s] - x0) * sc, py = oy + (tr.y[s] - y0) * sc; s ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.stroke(); }
    const p = tr.at(0, 0); x.fillStyle = '#ffffff'; x.fillRect(Math.round(ox + (p.x - x0) * sc) - 1, Math.round(oy + (p.y - y0) * sc) - 1, 3, 3);
    return c;
  }
  const bar = (ctx, x, y, w, h, k, col, back) => {
    ctx.fillStyle = OL; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = back || '#2a2f4a'; ctx.fillRect(x, y, w, h);
    const n = Math.floor(w * U.clamp(k, 0, 1) / 3) * 3; ctx.fillStyle = col; ctx.fillRect(x, y, n, h); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x, y, n, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; for (let q = 3; q < w; q += 3) ctx.fillRect(x + q - 1, y, 1, h);
  };
  HUD.draw = function (ctx, iw, ih, time) {
    const P = R.P, tr = R.tr, st = R.state;
    if (!P || !tr) return;
    if (!mini || miniFor !== tr.id) { mini = buildMini(tr); miniFor = tr.id; }
    const racing = st === 'race' || st === 'finish' || st === 'countdown';
    ctx.fillStyle = 'rgba(8,10,28,0.5)'; ctx.fillRect(0, 0, iw, 22); ctx.fillStyle = OL; ctx.fillRect(0, 22, iw, 1); ctx.fillStyle = '#ff6a3d'; ctx.fillRect(0, 23, iw, 1);
    const lap = Math.min(R.laps, Math.max(1, Math.floor(P.prog / tr.L) + 1));
    T(ctx, 'LAP', 6, 4, ORG); T(ctx, lap + '/' + R.laps, 6, 12, WHT);
    T(ctx, 'TIME', 44, 4, ORG); T(ctx, R.fmt(st === 'countdown' ? 0 : P.finished ? P.finishT : R.time), 44, 12, WHT);
    if (!R.tt) { T(ctx, 'RANK', iw / 2, 3, ORG, 1, 'c'); T(ctx, P.rank + '/' + R.racers.length, iw / 2, 11, P.rank <= 3 ? '#ffd24a' : WHT, 1, 'c'); }
    else { T(ctx, 'BEST LAP', iw / 2, 3, ORG, 1, 'c'); T(ctx, R.fmt(G.records.tracks[tr.id] ? G.records.tracks[tr.id].lap : null), iw / 2, 11, '#9fe8ff', 1, 'c'); }
    T(ctx, tr.name, iw - 6, 3, ORG, 1, 'r'); T(ctx, G.tracks.WORLDS[tr.world].name, iw - 6, 11, '#a8c0e8', 1, 'r');
    if (P.boostOn && st === 'race') {
      ctx.fillStyle = 'rgba(190,240,255,0.75)'; const cx = iw / 2, cy = G.m7.yh + 40;
      for (let i = 0; i < 26; i++) { const a = i * 2.399 + Math.floor(time * 14) * 0.7, f = ((time * 2.6 + i * 0.173) % 1), r0 = 46 + f * 190, len = 6 + f * 26, ca = Math.cos(a), sa = Math.sin(a) * 0.62; for (let q = 0; q < len; q += 2) ctx.fillRect(Math.round(cx + ca * (r0 + q)), Math.round(cy + sa * (r0 + q)), 1, 1); }
    }
    // lap times
    for (let i = 0; i < P.lapTimes.length; i++) T(ctx, 'L' + (i + 1) + ' ' + R.fmt(P.lapTimes[i]), 6, 28 + i * 8, i === P.lapTimes.indexOf(Math.min.apply(null, P.lapTimes)) ? '#9fffb0' : '#c8d4f0');
    // minimap
    const mx = iw - MS - 4, my = 28; ctx.drawImage(mini, mx, my);
    const mm = tr.mm, dot = (q, c, s) => { ctx.fillStyle = c; ctx.fillRect(mx + Math.round(mm.ox + (q.x - mm.x0) * mm.sc) - (s >> 1), my + Math.round(mm.oy + (q.y - mm.y0) * mm.sc) - (s >> 1), s, s); };
    for (const q of R.racers) if (!q.isP) dot(q, PX.css(PX.hsl(q.hue, 80, 60)), 2);
    dot(P, Math.floor(time * 8) & 1 ? '#ffffff' : '#ffd24a', 4);
    // speed + energy
    const kmh = Math.round(P.spdShow * 3.4);
    T(ctx, String(kmh), 8, ih - 24, WHT, 3, 'l', { sh: '#3a3f66' }); T(ctx, 'KM/H', 8, ih - 33, ORG);
    const ex = iw - 108, ey = ih - 16, low = P.energy < 25 && (Math.floor(time * 6) & 1);
    T(ctx, 'ENERGY', ex, ey - 11, ORG); bar(ctx, ex, ey, 100, 7, P.energy / 100, low ? '#ff4a3a' : P.energy < 50 ? '#ffd24a' : '#3aff9a', '#2a2f4a');
    if (P.boostOn) T(ctx, 'BOOST', ex + 100, ey - 11, '#6ae8ff', 1, 'r');
    // banners and countdown
    if (st === 'countdown') {
      const n = Math.ceil(R.cd - 0.9);
      for (let i = 0; i < 3; i++) { const on = n <= 3 - i && n > 0 || n <= 0; const cx = iw / 2 + (i - 1) * 26; ctx.fillStyle = OL; ctx.fillRect(cx - 9, 60, 18, 18); ctx.fillStyle = on ? (n <= 1 ? '#3aff6a' : '#ff3a3a') : '#3a2a3a'; ctx.fillRect(cx - 7, 62, 14, 14); }
      if (n > 0) T(ctx, String(n), iw / 2, 90, WHT, 5, 'c', { g: ['#ffffff', '#ffb36a'], sh: '#7a2a0a' });
    }
    const b = R.banner;
    if (b) {
      const k = b.t / b.life, a = k < 0.08 ? k / 0.08 : k > 0.8 ? Math.max(0, (1 - k) / 0.2) : 1, col = b.kind === 'dead' ? '#ff6a6a' : b.kind === 'up' ? '#7dffb8' : b.kind === 'down' ? '#ffb36a' : WHT;
      ctx.save(); ctx.globalAlpha = a;
      const sz = b.kind === 'go' || b.kind === 'fin' ? 6 : b.kind === 'lap' ? 4 : 2, y = b.kind === 'go' || b.kind === 'fin' ? 60 : b.kind === 'lap' ? 54 : 52;
      T(ctx, b.text, iw / 2, y, col, sz, 'c', { g: b.kind ? [col, col === WHT ? '#ffb36a' : col] : null, sh: '#2a1a4a' });
      ctx.restore();
    }
    if (P.wrong > 1.2) T(ctx, 'WRONG WAY', iw / 2, 100, '#ff6a6a', 2, 'c');
  };
})((window.SGS = window.SGS || {}));
