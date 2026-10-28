/* Layout and drawing: the nebula backdrop, glass wells, boards, hold / next, HUD text, effects and touch buttons. Everything is in device pixels. */
(function (G) {
  'use strict';
  const C = G.C, GL = G.glass, K = G.core, S = G.settings, U = G.U;
  const R = { bg: null, bx: null, S: 1, L: null, sector: { a: 0, b: 0, mix: 0 } };
  G.render = R;
  const FONT = '"Segoe UI", "Helvetica Neue", Arial, system-ui, sans-serif';
  R.text = function (ctx, s, x, y, size, col, align, weight, glow) {
    ctx.font = (weight || 600) + ' ' + Math.round(size) + 'px ' + FONT; ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = Math.round(size * 0.1) + 'px';
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = size * 0.5; }
    ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); ctx.shadowBlur = 0;
  };
  R.panel = function (ctx, x, y, w, h, tint) {
    const r = Math.min(w, h) * 0.06, [cr, cg, cb] = tint || [90, 200, 255];
    ctx.save(); GL.rr(ctx, x, y, w, h, r); ctx.fillStyle = 'rgba(8,14,34,0.42)'; ctx.fill();
    let gr = ctx.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, 'rgba(255,255,255,0.12)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.02)'); gr.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0.10)'); ctx.fillStyle = gr; ctx.fill();
    gr = ctx.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,255,255,0.75)'); gr.addColorStop(0.5, 'rgba(' + cr + ',' + cg + ',' + cb + ',0.35)'); gr.addColorStop(1, 'rgba(' + cr + ',' + cg + ',' + cb + ',0.7)');
    ctx.strokeStyle = gr; ctx.lineWidth = Math.max(1, R.S * 1.4); ctx.stroke(); ctx.restore();
  };
  /* ---------- layout ---------- */
  R.layout = function (W, H, versus, touch) {
    const s = R.S, portrait = W / H < 1.05, L = { W, H, portrait, touch };
    const tH = touch ? Math.min(H * (portrait ? 0.3 : 0.34), 330 * s) : 0, availH = H - tH, gap = 14 * s;
    let cs, bx, by, hold, next, stats, opp = null, ocs = 0;
    if (!versus) {
      if (!portrait) { cs = Math.floor(Math.min((availH - 28 * s) / 20, (W - gap * 4) / 21)); bx = Math.round((W - cs * 10) / 2); by = Math.round((availH - cs * 20) / 2); hold = { x: bx - cs * 5 - gap, y: by, w: cs * 4.6, h: cs * 3.4 }; next = { x: bx + cs * 10 + gap, y: by, w: cs * 4.6, h: cs * 12.4 }; stats = { x: hold.x, y: by + cs * 3.9, w: cs * 4.6, h: cs * 8 }; }
      else { cs = Math.floor(Math.min((availH - 24 * s) / 22.9, (W - gap * 2) / 10)); bx = Math.round((W - cs * 10) / 2); by = Math.round(availH - cs * 20 - 8 * s); hold = { x: bx, y: by - cs * 2.7 - 4 * s, w: cs * 2.2, h: cs * 2.4 }; next = { x: bx + cs * 2.4, y: by - cs * 2.7 - 4 * s, w: cs * 4.5, h: cs * 2.4, row: true }; stats = { x: bx + cs * 7.1, y: by - cs * 2.7 - 4 * s, w: cs * 2.9, h: cs * 2.4, compact: true }; }
    } else if (!portrait) {
      cs = Math.floor(Math.min((availH - 28 * s) / 20, (W - gap * 5) / 30)); const tot = cs * 29 + gap * 3, x0 = Math.round((W - tot) / 2); by = Math.round((availH - cs * 20) / 2);
      hold = { x: x0, y: by, w: cs * 4, h: cs * 3.2 }; bx = x0 + cs * 4 + gap; next = { x: bx + cs * 10.6 + gap * 0.3, y: by, w: cs * 4, h: cs * 9.4 };
      ocs = cs; opp = { x: bx + cs * 10.6 + gap * 0.3 + cs * 4 + gap, y: by, cs }; stats = { x: hold.x, y: by + cs * 3.6, w: cs * 4, h: cs * 8 };
    } else {
      cs = Math.floor(Math.min((availH - 24 * s) / 22.9, (W - gap * 2) / 10.2)); bx = Math.round((W - cs * 10) / 2); by = Math.round(availH - cs * 20 - 8 * s);
      hold = { x: bx, y: by - cs * 2.7 - 4 * s, w: cs * 2.2, h: cs * 2.4 }; next = { x: bx + cs * 2.4, y: by - cs * 2.7 - 4 * s, w: cs * 4.5, h: cs * 2.4, row: true };
      ocs = Math.floor(cs * 0.46); opp = { x: bx + cs * 10 - ocs * 10, y: by - cs * 2.8 - 4 * s + 2, cs: ocs, over: true }; stats = { x: bx + cs * 7.1, y: by - cs * 2.7 - 4 * s, w: cs * 2.9, h: cs * 2.4, compact: true };
    }
    L.cs = cs; L.board = { x: bx, y: by, cs }; L.hold = hold; L.next = next; L.stats = stats; L.opp = opp;
    if (touch) L.btns = R.touchLayout(W, H, tH, s, portrait);
    return L;
  };
  R.touchLayout = function (W, H, tH, s) {
    const pad = 8 * s, bh = tH * 0.36, bw = (W - pad * 6) / 5, yb = H - bh - pad, big = tH - bh - pad * 3, out = [];
    const add = (id, x, y, w, h, label) => out.push({ id, x, y, w, h, label });
    ['left', 'right', 'hold', 'rotL', 'rotR'].forEach((id, i) => add(id, pad + i * (bw + pad), yb, bw, bh, { left: '◀', right: '▶', hold: 'HOLD', rotL: '⟲', rotR: '⟳' }[id]));
    add('down', pad, H - tH + pad, (W - pad * 3) / 2, big, '▼'); add('hard', pad * 2 + (W - pad * 3) / 2, H - tH + pad, (W - pad * 3) / 2, big, 'DROP');
    return out;
  };
  /* ---------- a board: well, stack, falling piece, ghost ---------- */
  R.drawWellBack = function (bx, b, glow) {   // onto the backdrop canvas, so the glass refracts it
    const w = b.cs * 10, h = b.cs * 20;
    bx.fillStyle = 'rgba(4,8,22,0.5)'; bx.fillRect(b.x, b.y, w, h);
    const gr = bx.createLinearGradient(0, b.y, 0, b.y + h); gr.addColorStop(0, 'rgba(60,120,255,0.10)'); gr.addColorStop(1, 'rgba(120,60,255,0.16)'); bx.fillStyle = gr; bx.fillRect(b.x, b.y, w, h);
  };
  R.drawBoard = function (ctx, g, tet, fx, b, time, danger) {
    const cs = b.cs, x0 = b.x, y0 = b.y, w = cs * 10, h = cs * 20, bg = R.bg, ox = x0 + w / 2, oy = y0 + h / 2;
    ctx.save();
    // grid and frame
    ctx.strokeStyle = 'rgba(140,210,255,0.07)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 1; i < 10; i++) { ctx.moveTo(x0 + i * cs, y0); ctx.lineTo(x0 + i * cs, y0 + h); } for (let i = 1; i < 20; i++) { ctx.moveTo(x0, y0 + i * cs); ctx.lineTo(x0 + w, y0 + i * cs); } ctx.stroke();
    const dz = danger ? 0.5 + 0.5 * Math.sin(time * 7) : 0;
    const gr = ctx.createLinearGradient(x0, y0, x0 + w, y0 + h); gr.addColorStop(0, 'rgba(255,255,255,0.8)'); gr.addColorStop(0.5, danger ? 'rgba(255,90,90,' + (0.5 + dz * 0.5) + ')' : 'rgba(110,210,255,0.55)'); gr.addColorStop(1, danger ? 'rgba(255,60,60,0.9)' : 'rgba(170,110,255,0.8)');
    ctx.shadowColor = danger ? 'rgba(255,60,60,0.9)' : 'rgba(90,190,255,0.8)'; ctx.shadowBlur = cs * (0.5 + dz * 0.6); GL.rr(ctx, x0 - cs * 0.12, y0 - cs * 0.12, w + cs * 0.24, h + cs * 0.24, cs * 0.18); ctx.strokeStyle = gr; ctx.lineWidth = Math.max(2, cs * 0.1); ctx.stroke(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1; GL.rr(ctx, x0 - cs * 0.02, y0 - cs * 0.02, w + cs * 0.04, h + cs * 0.04, cs * 0.1); ctx.stroke();
    // clip to the well so nothing escapes
    ctx.beginPath(); ctx.rect(x0, y0, w, h); ctx.clip();
    const clearing = tet.state === 'clear' && tet.clearing ? tet.clearing.rm : null, moves = tet.state === 'fall' && tet.moves ? tet.moves : null, mv = new Set();
    if (moves) for (const m of moves) mv.add(m.y1 * 10 + m.x);
    for (let y = 2; y < 22; y++) for (let x = 0; x < 10; x++) {
      const i = y * 10 + x, v = tet.grid[i]; if (!v) continue; if (clearing && clearing.has(i)) continue; if (mv.has(i)) continue;
      const px = x0 + x * cs, py = y0 + (y - 2) * cs; GL.cell(ctx, bg, px, py, cs, v, time, ox, oy); if (tet.core[i]) GL.core(ctx, px, py, cs, tet.core[i], time);
    }
    if (moves) { const p = 1 - Math.max(0, Math.min(1, tet.clearT / (tet.fallDur || 0.14))), e = p * p; for (const m of moves) { const yy = m.y0 + (m.y1 - m.y0) * e; if (yy < 1.5) continue; const px = x0 + m.x * cs, py = y0 + (yy - 2) * cs; GL.cell(ctx, bg, px, py, cs, m.t, time, ox, oy); if (m.core) GL.core(ctx, px, py, cs, m.core, time); } }
    const p = tet.cur;
    if (p && tet.state === 'play') {
      if (S.ghost) { const gy = tet.ghostY(); if (gy > p.y) for (const [x, y] of K.SHAPES[p.t][p.r].map((c) => [p.x + c[0], gy + c[1]])) if (y >= 2) GL.ghost(ctx, x0 + x * cs, y0 + (y - 2) * cs, cs, p.t); }
      const cc = tet.coreCell(p), glow = GL.COLORS[p.t];
      ctx.globalCompositeOperation = 'lighter';
      for (const [x, y] of tet.cells(p)) if (y >= 2) { const px = x0 + x * cs, py = y0 + (y - 2) * cs, gg = ctx.createRadialGradient(px + cs / 2, py + cs / 2, 0, px + cs / 2, py + cs / 2, cs * 1.1); gg.addColorStop(0, 'rgba(' + glow + ',0.22)'); gg.addColorStop(1, 'rgba(' + glow + ',0)'); ctx.fillStyle = gg; ctx.fillRect(px - cs, py - cs, cs * 3, cs * 3); }
      ctx.globalCompositeOperation = 'source-over';
      for (const [x, y] of tet.cells(p)) if (y >= 2) { const px = x0 + x * cs, py = y0 + (y - 2) * cs; GL.cell(ctx, bg, px, py, cs, p.t, time, ox, oy); if (cc && cc[0] === x && cc[1] === y) GL.core(ctx, px, py, cs, p.core.type, time); }
    }
    R.drawFx(ctx, fx, b, time);
    ctx.restore();
    // incoming garbage meter beside the well
    const pend = tet.pendingTotal ? tet.pendingTotal() : 0;
    if (pend > 0) { const mh = Math.min(20, pend) * cs; ctx.fillStyle = 'rgba(255,60,70,0.85)'; ctx.shadowColor = 'rgba(255,60,70,0.9)'; ctx.shadowBlur = cs * 0.4; ctx.fillRect(x0 - cs * 0.42, y0 + h - mh, cs * 0.22, mh); ctx.shadowBlur = 0; }
  };
  /* ---------- effects drawn inside a board ---------- */
  R.drawFx = function (ctx, fx, b, time) {
    if (!fx) return; const cs = b.cs, X = (x) => b.x + x * cs, Y = (y) => b.y + (y - 2) * cs;
    ctx.globalCompositeOperation = 'lighter';
    for (const f of fx.flashes) { const k = f.age / f.life, a = (1 - k) * 0.8; ctx.fillStyle = 'rgba(' + (f.col || '255,255,255') + ',' + a.toFixed(2) + ')'; for (const c of f.cells) { const e = cs * (0.5 + k * 0.5); ctx.fillRect(X(c.x) + cs / 2 - e, Y(c.y) + cs / 2 - e, e * 2, e * 2); } }
    for (const l of fx.locks) { const a = (1 - l.age / l.life) * 0.7; ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(2) + ')'; for (const c of l.cells) ctx.fillRect(X(c.x), Y(c.y), cs, cs); }
    for (const t of fx.trails) { const a = (1 - t.age / t.life) * 0.35, gr = ctx.createLinearGradient(0, Y(t.y0), 0, Y(t.y1)); gr.addColorStop(0, 'rgba(' + t.col + ',0)'); gr.addColorStop(1, 'rgba(' + t.col + ',' + a.toFixed(2) + ')'); ctx.fillStyle = gr; for (const x of t.xs) ctx.fillRect(X(x) + cs * 0.1, Y(t.y0), cs * 0.8, Y(t.y1) - Y(t.y0)); }
    for (const e of fx.beams) {
      const k = e.age / e.life, a = Math.sin(k * 3.14) * 0.9;
      if (e.type === 'col') { const gr = ctx.createLinearGradient(X(e.x - 1), 0, X(e.x + 2), 0); gr.addColorStop(0, 'rgba(' + e.col + ',0)'); gr.addColorStop(0.5, 'rgba(255,255,255,' + a.toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + e.col + ',0)'); ctx.fillStyle = gr; ctx.fillRect(X(e.x - 1), b.y, cs * 3, cs * 20); }
      else { const gr = ctx.createLinearGradient(0, Y(e.y - 1), 0, Y(e.y + 2)); gr.addColorStop(0, 'rgba(' + e.col + ',0)'); gr.addColorStop(0.5, 'rgba(255,255,255,' + a.toFixed(2) + ')'); gr.addColorStop(1, 'rgba(' + e.col + ',0)'); ctx.fillStyle = gr; ctx.fillRect(b.x, Y(e.y - 1), cs * 10, cs * 3); }
    }
    for (const r of fx.rings) { const k = r.age / r.life; ctx.strokeStyle = 'rgba(' + r.col + ',' + ((1 - k) * 0.9).toFixed(2) + ')'; ctx.lineWidth = cs * (0.5 - k * 0.35); ctx.beginPath(); ctx.arc(X(r.x) + cs / 2, Y(r.y) + cs / 2, cs * (0.5 + k * r.size), 0, 6.2832); ctx.stroke(); }
    ctx.globalCompositeOperation = 'source-over';
    for (const s of fx.shards) GL.drawShard(ctx, s);
  };
  R.popup = function (ctx, g, b, time) {
    let y = b.y + b.cs * 6;
    for (const p of g.pops) { const k = p.age / p.life, a = k < 0.12 ? k / 0.12 : k > 0.7 ? (1 - k) / 0.3 : 1; ctx.globalAlpha = Math.max(0, a); R.text(ctx, p.text, b.x + b.cs * 5, y - k * b.cs * 0.8, b.cs * p.size, p.col, 'center', 800, p.glow || p.col); if (p.sub) R.text(ctx, p.sub, b.x + b.cs * 5, y + b.cs * 0.8 - k * b.cs * 0.8, b.cs * 0.55, '#cfe8ff', 'center', 600); ctx.globalAlpha = 1; y += b.cs * (p.sub ? 2.2 : 1.5); }
  };
  /* ---------- previews (hold / next) ---------- */
  R.preview = function (ctx, item, x, y, w, h, cs, time) {
    if (!item) return; const sh = K.SHAPES[item.t][0]; let x0 = 9, x1 = -9, y0 = 9, y1 = -9; for (const c of sh) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); }
    const ox = x + w / 2 - (x1 - x0 + 1) * cs / 2, oy = y + h / 2 - (y1 - y0 + 1) * cs / 2;
    sh.forEach((c, i) => { const px = ox + (c[0] - x0) * cs, py = oy + (c[1] - y0) * cs; GL.cell(ctx, R.bg, px, py, cs, item.t, time, x + w / 2, y + h / 2); if (item.core && item.core.idx === i) GL.core(ctx, px, py, cs, item.core.type, time); });
  };
  R.hud = function (ctx, g, L, time) {
    const t = g.tet, cs = L.cs, s = R.S, lab = (str, x, y) => R.text(ctx, str, x, y, Math.max(9 * s, cs * 0.3), '#8fc8ff', 'left', 700);
    R.panel(ctx, L.hold.x, L.hold.y, L.hold.w, L.hold.h); const hc = L.portrait ? cs * 0.5 : cs * 0.62;
    if (!L.portrait) lab('HOLD', L.hold.x + cs * 0.3, L.hold.y + cs * 0.55); ctx.globalAlpha = t.canHold ? 1 : 0.4; R.preview(ctx, t.hold, L.hold.x, L.hold.y + (L.portrait ? 0 : cs * 0.5), L.hold.w, L.hold.h - (L.portrait ? 0 : cs * 0.5), hc, time); ctx.globalAlpha = 1;
    R.panel(ctx, L.next.x, L.next.y, L.next.w, L.next.h);
    if (L.next.row) { for (let i = 0; i < 3; i++) R.preview(ctx, t.queue[i], L.next.x + i * (L.next.w / 3), L.next.y, L.next.w / 3, L.next.h, hc * (i ? 0.8 : 1), time); }
    else { lab('NEXT', L.next.x + cs * 0.3, L.next.y + cs * 0.55); const n = g.mode === 'versus' ? 4 : 5; for (let i = 0; i < n; i++) R.preview(ctx, t.queue[i], L.next.x, L.next.y + cs * 0.7 + i * cs * 2.15, L.next.w, cs * 2.1, hc * (i ? 0.82 : 1), time); }
    if (L.stats.compact) {
      R.panel(ctx, L.stats.x, L.stats.y, L.stats.w, L.stats.h); const rows = g.statRows().slice(0, 3);
      rows.forEach((r, i) => { const yy = L.stats.y + cs * (0.42 + i * 0.78); R.text(ctx, r.l, L.stats.x + L.stats.w / 2, yy, cs * 0.24, '#8fc8ff', 'center', 700); R.text(ctx, String(r.v), L.stats.x + L.stats.w / 2, yy + cs * 0.4, cs * 0.38, r.c || '#fff', 'center', 700); });
    } else {
      R.panel(ctx, L.stats.x, L.stats.y, L.stats.w, L.stats.h); const rows = g.statRows(); let y = L.stats.y + cs * 0.62;
      for (const r of rows) { lab(r.l, L.stats.x + cs * 0.3, y); R.text(ctx, r.v, L.stats.x + L.stats.w - cs * 0.3, y + cs * 0.78, cs * (r.big ? 0.82 : 0.66), r.c || '#fff', 'right', 700); y += cs * (r.big ? 1.75 : 1.5); }
    }
    if (g.rules && (g.rules.cores || g.rules.cascade) && !L.portrait) { let yy = L.next.y + L.next.h + cs * 0.7; for (const [k, c] of [['POWER CORES', g.rules.cores], ['CASCADE GRAVITY', g.rules.cascade]]) if (c) { R.text(ctx, k, L.next.x, yy, cs * 0.3, '#ffd24a', 'left', 700); yy += cs * 0.6; } }
  };
  R.drawTouch = function (ctx, L, I, time) {
    const pressed = new Set(I.ptr.values());
    for (const b of L.btns) { const on = pressed.has(b.id); ctx.save(); GL.rr(ctx, b.x, b.y, b.w, b.h, Math.min(b.w, b.h) * 0.22); ctx.fillStyle = on ? 'rgba(120,200,255,0.4)' : 'rgba(255,255,255,0.08)'; ctx.fill(); ctx.strokeStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(150,210,255,0.5)'; ctx.lineWidth = Math.max(1.5, R.S * 1.6); ctx.stroke(); ctx.restore(); R.text(ctx, b.label, b.x + b.w / 2, b.y + b.h / 2 + Math.min(b.w, b.h) * 0.14, Math.min(b.w, b.h) * (b.label.length > 2 ? 0.28 : 0.42), '#e8f6ff', 'center', 700); }
  };
  R.SECTORS = ['NEBULA ALPHA', 'VIOLET RIFT', 'EMBER BELT', 'VERDANT CLOUD', 'MAGENTA VOID', 'GOLD CORONA'];
  R.resize = function (cv) {
    R.S = Math.max(0.5, Math.min(window.devicePixelRatio || 1, window.TK && window.TK.on ? 1.5 : 2) * (S.quality || 1));                /* phones: at most 1.5x */
    const W = Math.max(200, Math.round(window.innerWidth * R.S)), H = Math.max(200, Math.round(window.innerHeight * R.S));
    cv.width = W; cv.height = H; R.bg = GL.cv(W, H); R.bx = R.bg.getContext('2d'); R.L = null;
  };
  R.wantTouch = () => S.touch === 'on' || (S.touch === 'auto' && (G.input.lastDevice === 'touch' || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && G.input.lastDevice !== 'kbd' && G.input.lastDevice !== 'pad')));
  R.draw = function (ctx, g, time, dt) {
    const cv = ctx.canvas, W = cv.width, H = cv.height, I = G.input; if (!R.bg || R.bg.width !== W || R.bg.height !== H) R.resize(cv);
    const versus = g.mode === 'versus', touch = R.wantTouch(), key = W + 'x' + H + (versus ? 'v' : 's') + (touch ? 't' : '');
    if (!R.L || R.Lkey !== key) { R.L = R.layout(W, H, versus, touch); R.Lkey = key; GL.build(R.L.cs); I.touchBtns = (R.L.btns || []).map((b) => ({ id: b.id, x: b.x / R.S, y: b.y / R.S, w: b.w / R.S, h: b.h / R.S })); }
    const L = R.L, t = g.tet, sec = R.sector, target = Math.min(5, Math.floor((g.level - 1) / 3));
    if (sec.target !== target) { if (sec.target === undefined) { sec.a = sec.b = target; sec.mix = 0; } else { sec.a = sec.mix > 0.5 ? sec.b : sec.a; sec.b = target; sec.mix = 0.001; } sec.target = target; }
    if (sec.mix > 0) { sec.mix += (dt || 0.016) / 2.2; if (sec.mix >= 1) { sec.a = sec.b; sec.mix = 0; } }
    GL.backdrop(R.bx, W, H, time, sec, g.level);
    R.drawWellBack(R.bx, L.board); if (L.opp) R.drawWellBack(R.bx, L.opp);
    ctx.drawImage(R.bg, 0, 0);
    ctx.save();
    if (g.shake > 0 && S.shake && !S.reduced) ctx.translate((Math.random() - 0.5) * g.shake * R.S, (Math.random() - 0.5) * g.shake * R.S);
    R.hud(ctx, g, L, time);
    let top = 99; for (let y = 2; y < 22 && top === 99; y++) for (let x = 0; x < 10; x++) if (t.grid[y * 10 + x]) { top = y; break; }
    R.drawBoard(ctx, g, t, g.fx[0], L.board, time, top < 8);
    if (g.opp && L.opp) {
      let ot = 99; for (let y = 2; y < 22 && ot === 99; y++) for (let x = 0; x < 10; x++) if (g.opp.grid[y * 10 + x]) { ot = y; break; }
      R.drawBoard(ctx, g, g.opp, g.fx[1], L.opp, time, ot < 8);
      R.text(ctx, g.oppInfo.name, L.opp.x + L.opp.cs * 5, L.opp.y - L.opp.cs * 0.45, Math.max(10 * R.S, L.opp.cs * 0.5), '#ff9a9a', 'center', 700);
    }
    R.popup(ctx, g, L.board, time);
    if (g.banner) { const k = g.banner.age / g.banner.life, a = k < 0.1 ? k / 0.1 : k > 0.75 ? (1 - k) / 0.25 : 1; ctx.globalAlpha = Math.max(0, a); R.text(ctx, g.banner.text, L.board.x + L.cs * 5, L.board.y + L.cs * 9.2, L.cs * 1.25, '#fff', 'center', 800, '#7ad0ff'); if (g.banner.sub) R.text(ctx, g.banner.sub, L.board.x + L.cs * 5, L.board.y + L.cs * 10.6, L.cs * 0.6, '#cfe8ff', 'center', 600); ctx.globalAlpha = 1; }
    if (g.countdown > 0) { const n = Math.ceil(g.countdown), k = g.countdown - Math.floor(g.countdown); ctx.globalAlpha = Math.min(1, k * 2 + 0.2); R.text(ctx, String(n), L.board.x + L.cs * 5, L.board.y + L.cs * 11, L.cs * (3 + k * 0.8), '#fff', 'center', 800, '#7ad0ff'); ctx.globalAlpha = 1; }
    if (g.freeze > 0) { ctx.globalCompositeOperation = 'lighter'; const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.2, W / 2, H / 2, H * 0.85); gr.addColorStop(0, 'rgba(160,220,255,0)'); gr.addColorStop(1, 'rgba(160,220,255,' + Math.min(0.35, g.freeze * 0.2).toFixed(2) + ')'); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
    ctx.restore();
    if (g.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, g.flash).toFixed(2) + ')'; ctx.fillRect(0, 0, W, H); }
    if (touch && L.btns) R.drawTouch(ctx, L, I, time);
  };
})((window.SGS = window.SGS || {}));
