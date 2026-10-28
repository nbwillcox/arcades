/* Everything that stands on the tiles: the marble, enemies, traps, pickups, particles. Sorted back to front and re-occluded by whatever stands in front. */
(function (G) {
  'use strict';
  const C = G.C, U = G.U, GFX = G.gfx, FX = G.fx, S = C.S, TAU = U.TAU, R = G.render;

  const gz = (x, y) => R.world.heightAt(x, y);
  const px = (x, y) => R.sx(x, y);
  const py = (x, y, z) => R.sy(x, y, z);
  const add = (ctx, fn) => { ctx.globalCompositeOperation = 'lighter'; fn(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; };

  function cylinder(ctx, x, y, z0, z1, r, side, top, rim) {
    const cx = px(x, y), y0 = py(x, y, z0), y1 = py(x, y, z1), rx = r * 1.414 * R.hw, ry = rx * 0.5;
    ctx.fillStyle = side;
    ctx.beginPath(); ctx.moveTo(cx - rx, y1); ctx.lineTo(cx - rx, y0); ctx.ellipse(cx, y0, rx, ry, 0, Math.PI, 0, true); ctx.lineTo(cx + rx, y1); ctx.ellipse(cx, y1, rx, ry, 0, 0, Math.PI, true); ctx.closePath(); ctx.fill();
    ctx.fillStyle = top; ctx.beginPath(); ctx.ellipse(cx, y1, rx, ry, 0, 0, TAU); ctx.fill();
    if (rim) { ctx.strokeStyle = rim; ctx.lineWidth = Math.max(1, 1.5 * R.zoom); ctx.beginPath(); ctx.ellipse(cx, y1, rx, ry, 0, 0, TAU); ctx.stroke(); }
  }
  function box(ctx, x0, y0, x1, y1, zb, zt, cTop, cX, cY, edge) {
    const X = (x, y) => px(x, y), Y = (x, y, z) => py(x, y, z);
    ctx.fillStyle = cY; ctx.beginPath(); ctx.moveTo(X(x0, y1), Y(x0, y1, zt)); ctx.lineTo(X(x1, y1), Y(x1, y1, zt)); ctx.lineTo(X(x1, y1), Y(x1, y1, zb)); ctx.lineTo(X(x0, y1), Y(x0, y1, zb)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cX; ctx.beginPath(); ctx.moveTo(X(x1, y0), Y(x1, y0, zt)); ctx.lineTo(X(x1, y1), Y(x1, y1, zt)); ctx.lineTo(X(x1, y1), Y(x1, y1, zb)); ctx.lineTo(X(x1, y0), Y(x1, y0, zb)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cTop; ctx.beginPath(); ctx.moveTo(X(x0, y0), Y(x0, y0, zt)); ctx.lineTo(X(x1, y0), Y(x1, y0, zt)); ctx.lineTo(X(x1, y1), Y(x1, y1, zt)); ctx.lineTo(X(x0, y1), Y(x0, y1, zt)); ctx.closePath(); ctx.fill();
    if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = Math.max(1, 1.4 * R.zoom); ctx.stroke(); }
  }

  /* ---------------- balls: the marble and the steel orbs ---------------- */
  function drawSphere(ctx, cx, cy, rad, kind, offx, offy, rim) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU); ctx.clip();
    const tex = GFX.marbleTex(kind), tw = rad * 3.6, u = ((offx % tw) + tw) % tw, v = ((offy % tw) + tw) % tw;
    const x0 = cx - rad - tw + u, y0 = cy - rad - tw + v;
    for (let a = 0; a < 3; a++) { const xx = x0 + a * tw; if (xx > cx + rad || xx + tw < cx - rad) continue; for (let b = 0; b < 3; b++) { const yy = y0 + b * tw; if (yy > cy + rad || yy + tw < cy - rad) continue; ctx.drawImage(tex, xx, yy, tw + 0.6, tw + 0.6); } }
    ctx.restore();
    ctx.drawImage(GFX.sphereShade(rim), cx - rad, cy - rad, rad * 2, rad * 2);
  }

  function marbleTint(m) { return m.integ < 0.34 ? 'rgba(255,90,60,1)' : m.integ < 0.67 ? 'rgba(255,200,70,1)' : 'rgba(80,225,255,1)'; }

  function drawMarble(ctx, sim, t) {
    const m = sim.m;
    if (m.dead) return;
    const rad = m.r * R.hw * 1.414 * 1.3, cx = px(m.x, m.y), cy = py(m.x, m.y, m.z + m.r), g = gz(m.x, m.y);
    const fade = m.falling ? Math.max(0, 1 - m.deadT / 1.1) : 1;
    if (fade <= 0) return;
    const tint = marbleTint(m);
    /* trail */
    if (G.settings.trail && m.trail.length) {
      add(ctx, () => { for (let i = 0; i < m.trail.length; i++) { const p = m.trail[i], k = 1 - (t - p.t) / 0.45; if (k <= 0) continue; GFX.drawGlow(ctx, tint.replace('1)', '0.5)'), px(p.x, p.y), py(p.x, p.y, p.z + m.r), rad * (0.7 + k * 0.6), k * 0.45 * fade); } });
    }
    if (g > -Infinity && !m.falling) R.shadow(ctx, m.x, m.y, g, m.z, rad * 0.95, 0.5);
    add(ctx, () => GFX.drawGlow(ctx, tint, cx, cy, rad * 2.3, 0.42 * fade));
    const blink = m.inv > 0 && m.inv < 1.5 && ((t * 24) | 0) % 2 === 0;
    ctx.globalAlpha = fade * (blink ? 0.45 : 1);
    const offx = (m.rollx - m.rolly) * m.r * R.hw, offy = (m.rollx + m.rolly) * m.r * R.hh;
    const sq = G.game ? G.game.sq || 0 : 0;                                           /* squash on a hard landing */
    if (sq > 0.01) { const qx = 1 + sq * 0.32, qy = 1 - sq * 0.36; ctx.save(); ctx.translate(cx, cy + rad * (1 - qy)); ctx.scale(qx, qy); ctx.translate(-cx, -cy); }
    drawSphere(ctx, cx, cy, rad, 'glass', offx * 1.1, offy * 1.1, tint);
    const stage = m.integ < 0.34 ? 2 : m.integ < 0.67 ? 1 : 0;
    if (stage > 0) {
      const spr = GFX.marbleCracks(stage);
      ctx.drawImage(spr, cx - rad, cy - rad, rad * 2, rad * 2);
      add(ctx, () => { ctx.globalAlpha = (stage === 2 ? 0.55 : 0.3) * (0.7 + 0.3 * Math.sin(t * 14)) * fade; ctx.drawImage(spr, cx - rad, cy - rad, rad * 2, rad * 2); });
    }
    if (sq > 0.01) ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawOrb(ctx, e, t) {
    const rad = e.r * R.hw * 1.414 * 1.3, cx = px(e.x, e.y), cy = py(e.x, e.y, e.z + e.r), g = gz(e.x, e.y);
    if (g > -Infinity) R.shadow(ctx, e.x, e.y, g, e.z, rad * 0.95, 0.5);
    add(ctx, () => GFX.drawGlow(ctx, 'rgba(255,60,60,1)', cx, cy, rad * 1.9, 0.28 + 0.12 * Math.sin(t * 9 + e.t)));
    drawSphere(ctx, cx, cy, rad, 'steel', ((e.rollx || 0) - (e.rolly || 0)) * e.r * R.hw, ((e.rollx || 0) + (e.rolly || 0)) * e.r * R.hh, 'rgba(255,90,90,1)');
  }

  /* ---------------- creatures ---------------- */
  function drawMuncher(ctx, e, t, sim) {
    const u = R.hw / 32, cx = px(e.x, e.y), z = e.z, cy = py(e.x, e.y, z);
    R.shadow(ctx, e.x, e.y, z, z, 17 * u, 0.5);
    const hunting = Math.hypot(sim.m.x - e.x, sim.m.y - e.y) < e.range, chew = e.cd > 1.0 ? 1 : 0;
    const open = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * (hunting ? 13 : 5) + e.t)) * (chew ? 1.3 : 1);
    const bob = Math.abs(Math.sin(t * 7 + e.t)) * 3 * u;
    const by = cy - bob;
    add(ctx, () => GFX.drawGlow(ctx, 'rgba(90,255,120,1)', cx, by - 10 * u, 30 * u, 0.3));
    /* body */
    ctx.fillStyle = GFX.lg(ctx, cx - 16 * u, by - 26 * u, cx + 16 * u, by, [[0, '#7dff8f'], [0.55, '#25b84a'], [1, '#07531f']]);
    ctx.beginPath(); ctx.ellipse(cx, by - 11 * u, 16 * u, 14 * u, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(190,255,200,0.85)'; ctx.lineWidth = 1.4; ctx.stroke();
    /* mouth */
    const mw = 11 * u, mh = open * 8 * u;
    ctx.fillStyle = '#3a0716'; ctx.beginPath(); ctx.ellipse(cx, by - 6 * u, mw, mh, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) { const tx = cx + i * 4.2 * u; ctx.beginPath(); ctx.moveTo(tx - 1.8 * u, by - 6 * u - mh * 0.8); ctx.lineTo(tx + 1.8 * u, by - 6 * u - mh * 0.8); ctx.lineTo(tx, by - 6 * u - mh * 0.8 + 4.5 * u); ctx.fill(); ctx.beginPath(); ctx.moveTo(tx - 1.8 * u, by - 6 * u + mh * 0.8); ctx.lineTo(tx + 1.8 * u, by - 6 * u + mh * 0.8); ctx.lineTo(tx, by - 6 * u + mh * 0.8 - 4.5 * u); ctx.fill(); }
    /* eyes */
    const ex = U.clamp((sim.m.x - e.x) - (sim.m.y - e.y), -1, 1) * 1.6 * u;
    for (const s of [-1, 1]) { ctx.fillStyle = '#f5ff4a'; ctx.beginPath(); ctx.ellipse(cx + s * 6 * u, by - 18 * u, 4 * u, 4.6 * u, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#220'; ctx.beginPath(); ctx.arc(cx + s * 6 * u + ex, by - 17.5 * u, 1.9 * u, 0, TAU); ctx.fill(); }
  }
  function drawCoil(ctx, e, t) {
    const u = R.hw / 32, cx = px(e.x, e.y), z = e.z;
    R.shadow(ctx, e.x, e.y, z, z, 15 * u, 0.45);
    const turns = 8, h = 20 * u * (0.85 + 0.15 * Math.sin(t * 6 + e.t)), sway = Math.sin(t * 5 + e.t) * 5 * u;
    add(ctx, () => GFX.drawGlow(ctx, 'rgba(160,255,40,1)', cx + sway * 0.5, py(e.x, e.y, z) - h * 0.5, 30 * u, 0.3));
    for (let i = 0; i < turns; i++) {
      const k = i / (turns - 1), yy = py(e.x, e.y, z) - 3 * u - k * h, xx = cx + sway * k * k * 2, rx = (13 - k * 4) * u;
      ctx.strokeStyle = i % 2 ? '#9cff2a' : '#4dd114'; ctx.lineWidth = 3.2 * u;
      ctx.beginPath(); ctx.ellipse(xx, yy, rx, rx * 0.46, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,255,170,0.55)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(xx, yy - 1, rx, rx * 0.46, 0, Math.PI * 1.1, Math.PI * 1.7); ctx.stroke();
    }
  }
  function drawVacuum(ctx, e, t, sim) {
    const u = R.hw / 32, cx = px(e.x, e.y), z = e.z, cy = py(e.x, e.y, z);
    R.shadow(ctx, e.x, e.y, z, z, 20 * u, 0.55);
    const ang = Math.atan2(sim.m.y - e.y, sim.m.x - e.x), mdx = Math.cos(ang), mdy = Math.sin(ang);
    const mx = px(e.x + mdx * 0.5, e.y + mdy * 0.5), my = py(e.x + mdx * 0.5, e.y + mdy * 0.5, z + 0.5);
    ctx.fillStyle = GFX.lg(ctx, cx - 20 * u, cy - 36 * u, cx + 20 * u, cy, [[0, '#4a4f6e'], [0.5, '#14162a'], [1, '#05050c']]);
    ctx.beginPath(); ctx.ellipse(cx, cy - 14 * u, 19 * u, 17 * u, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(190,120,255,0.8)'; ctx.lineWidth = 1.6; ctx.stroke();
    /* funnel mouth towards the marble */
    ctx.fillStyle = '#05030c'; ctx.beginPath(); ctx.ellipse(mx, my - 4 * u, 14 * u, 8 * u, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(220,120,255,0.9)'; ctx.lineWidth = 2.2; ctx.stroke();
    add(ctx, () => {
      GFX.drawGlow(ctx, 'rgba(190,60,255,1)', cx, cy - 14 * u, 36 * u, 0.28);
      const pull = e.pull || 0;
      ctx.strokeStyle = 'rgba(210,120,255,' + (0.35 + pull * 0.5) + ')'; ctx.lineWidth = 1.6;
      for (let i = 0; i < 6; i++) { const k = ((t * 1.7 + i / 6) % 1), rr = (1 - k) * (e.suck || 2.7) * 0.9; const sx2 = e.x + mdx * (0.5 + rr), sy2 = e.y + mdy * (0.5 + rr), sx3 = e.x + mdx * (0.5 + rr * 0.8), sy3 = e.y + mdy * (0.5 + rr * 0.8); ctx.globalAlpha = k * (0.4 + pull); ctx.beginPath(); ctx.moveTo(px(sx2, sy2), py(sx2, sy2, z + 0.5)); ctx.lineTo(px(sx3, sy3), py(sx3, sy3, z + 0.5)); ctx.stroke(); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,60,200,' + (0.5 + 0.4 * Math.sin(t * 8)) + ')'; ctx.beginPath(); ctx.arc(cx - 6 * u, cy - 22 * u, 2.4 * u, 0, TAU); ctx.arc(cx + 6 * u, cy - 22 * u, 2.4 * u, 0, TAU); ctx.fill();
    });
  }

  /* ---------------- traps and props ---------------- */
  function drawPost(ctx, p, t) {
    const z = p.z0 === -Infinity ? 0 : p.z0;
    R.shadow(ctx, p.x, p.y, z, z, p.r * 50 * R.zoom, 0.4);
    if (p.bump) {
      const k = p.pulse;
      cylinder(ctx, p.x, p.y, z, z + 0.7, p.r, '#3a1050', '#ff49d8', 'rgba(255,200,250,0.9)');
      cylinder(ctx, p.x, p.y, z + 0.7, z + 0.82 + k * 0.1, p.r * 0.7, '#7a2090', '#ffd0f8', 'rgba(255,255,255,0.9)');
      add(ctx, () => { GFX.drawGlow(ctx, 'rgba(255,60,220,1)', px(p.x, p.y), py(p.x, p.y, z + 0.5), 38 * R.zoom * (1 + k * 0.5), 0.3 + k * 0.6); });
    } else {
      cylinder(ctx, p.x, p.y, z, z + p.h, p.r, '#1b2238', '#4d5c86', 'rgba(140,200,255,0.8)');
      ctx.strokeStyle = 'rgba(120,200,255,0.5)'; ctx.lineWidth = 1;
      for (let k = 1; k < 3; k++) { const yy = py(p.x, p.y, z + p.h * k / 3), rx = p.r * 1.414 * R.hw; ctx.beginPath(); ctx.ellipse(px(p.x, p.y), yy, rx, rx * 0.5, 0, 0, Math.PI); ctx.stroke(); }
    }
  }
  function drawEmitter(ctx, x, y, z, t, on, warn) {
    const gzv = gz(x, y);
    cylinder(ctx, x, y, gzv, gzv + 0.15, 0.3, '#1a1a28', '#323650', null);
    cylinder(ctx, x, y, gzv + 0.15, z + 0.28, 0.14, '#2a2d44', '#6a7090', null);
    cylinder(ctx, x, y, z - 0.08, z + 0.28, 0.2, '#242438', on ? '#ff5a7a' : '#4a4a66', on ? 'rgba(255,200,210,0.9)' : null);
    if (on || warn) add(ctx, () => GFX.drawGlow(ctx, 'rgba(255,50,90,1)', px(x, y), py(x, y, z), 24 * R.zoom, on ? 0.9 : 0.3 + 0.3 * Math.sin(t * 40)));
  }
  function drawLaserBeam(ctx, h, t) {
    if (h.state === 0) return;
    const ax = px(h.x, h.y), ay = py(h.x, h.y, h.z), bx = px(h.x2, h.y2), by = py(h.x2, h.y2, h.z);
    add(ctx, () => {
      if (h.state === 1) { ctx.strokeStyle = 'rgba(255,80,110,' + (0.25 + 0.25 * Math.sin(t * 50)) + ')'; ctx.lineWidth = 1.5 * R.zoom; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke(); return; }
      for (const [w, a, c] of [[10, 0.22, '255,40,90'], [5, 0.5, '255,90,130'], [2.2, 1, '255,235,240']]) {
        ctx.strokeStyle = 'rgba(' + c + ',' + a + ')'; ctx.lineWidth = w * R.zoom; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      }
      const n = 7;
      for (let i = 0; i < n; i++) { const k = ((t * 3 + i / n) % 1), xx = ax + (bx - ax) * k, yy = ay + (by - ay) * k; GFX.drawGlow(ctx, 'rgba(255,120,150,1)', xx, yy, 9 * R.zoom, 0.8); }
    });
  }
  function drawCrusher(ctx, h, t) {
    const z = h.hz, zg = h.gz, x0 = h.x, y0 = h.y, x1 = h.x + h.w, y1 = h.y + h.h, th = 1.0;
    /* the press hovers above the marble's head: see-through while the marble is under or beside it */
    const mm = R.sim && R.sim.m, ghost = mm && !mm.dead && mm.x > x0 - 1.2 && mm.x < x1 + 1.2 && mm.y > y0 - 1.2 && mm.y < y1 + 1.2 && z > mm.z + 0.6;
    if (ghost) ctx.globalAlpha = 0.34;
    box(ctx, x0 + 0.04, y0 + 0.04, x1 - 0.04, y1 - 0.04, z, z + th, '#59607c', '#2c3148', '#1b1f33', 'rgba(255,190,60,0.9)');
    /* hazard stripes on the face */
    ctx.save();
    ctx.beginPath(); ctx.moveTo(px(x1 - 0.04, y0 + 0.04), py(x1 - 0.04, y0 + 0.04, z + th)); ctx.lineTo(px(x1 - 0.04, y1 - 0.04), py(x1 - 0.04, y1 - 0.04, z + th)); ctx.lineTo(px(x1 - 0.04, y1 - 0.04), py(x1 - 0.04, y1 - 0.04, z)); ctx.lineTo(px(x1 - 0.04, y0 + 0.04), py(x1 - 0.04, y0 + 0.04, z)); ctx.closePath(); ctx.clip();
    ctx.fillStyle = 'rgba(255,200,40,0.9)';
    for (let i = 0; i < 8; i++) { const sx0 = px(x1, y0) + (i - 1) * 16 * R.zoom; ctx.beginPath(); ctx.moveTo(sx0, py(x1, y0, z + th) - 30); ctx.lineTo(sx0 + 8 * R.zoom, py(x1, y0, z + th) - 30); ctx.lineTo(sx0 + 8 * R.zoom - 30 * R.zoom, py(x1, y0, z) + 70); ctx.lineTo(sx0 - 30 * R.zoom, py(x1, y0, z) + 70); ctx.fill(); }
    ctx.restore();
    /* pistons */
    for (const [ox, oy] of [[0.5, 0.5], [h.w - 0.5, 0.5], [0.5, h.h - 0.5], [h.w - 0.5, h.h - 0.5]]) {
      cylinder(ctx, x0 + ox, y0 + oy, z + th, h.top + th + 3.2, 0.13, '#7d86a8', '#b8c4e8', null);
      cylinder(ctx, x0 + ox, y0 + oy, z + th, z + th + 0.5, 0.24, '#3b4262', '#6a76a6', 'rgba(255,200,90,0.8)');
    }
    /* a glowing underside and a chevron so the danger reads from a distance */
    add(ctx, () => { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; GFX.drawGlow(ctx, 'rgba(255,170,50,1)', px(cx, cy), py(cx, cy, z + th * 0.4), 54 * R.zoom, 0.25 + (h.pstate === 1 ? 0.25 * Math.sin(t * 40) : 0)); });
    if (h.pstate === 1) add(ctx, () => { const a = 0.4 + 0.4 * Math.sin(t * 40); for (const [ox, oy] of [[0.2, 0.2], [h.w - 0.2, 0.2], [0.2, h.h - 0.2], [h.w - 0.2, h.h - 0.2]]) GFX.drawGlow(ctx, 'rgba(255,60,40,1)', px(x0 + ox, y0 + oy), py(x0 + ox, y0 + oy, z + th * 0.5), 12 * R.zoom, a); });
  }
  function crusherMark(ctx, h, t) {
    /* warning square on the floor under the press; it darkens as the press comes down */
    const k = U.clamp(1 - (h.hz - h.gz) / (h.top - h.gz), 0, 1), z = h.gz + 0.02;
    ctx.fillStyle = 'rgba(255,190,30,' + (0.12 + k * 0.28 + (h.pstate === 1 ? 0.2 * Math.sin(t * 40) : 0)) + ')';
    ctx.beginPath(); ctx.moveTo(px(h.x, h.y), py(h.x, h.y, z)); ctx.lineTo(px(h.x + h.w, h.y), py(h.x + h.w, h.y, z)); ctx.lineTo(px(h.x + h.w, h.y + h.h), py(h.x + h.w, h.y + h.h, z)); ctx.lineTo(px(h.x, h.y + h.h), py(h.x, h.y + h.h, z)); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,200,50,' + (0.4 + k * 0.5) + ')'; ctx.lineWidth = Math.max(1, 2 * R.zoom); ctx.stroke();
  }
  function drawSpikes(ctx, h, t) {
    for (const [cx, cy] of h.cells) {
      const z = gz(cx + 0.5, cy + 0.5);
      if (z === -Infinity) continue;
      const k = h.out, warn = h.warnOn && k < 0.2;
      for (const [ox, oy] of [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75], [0.5, 0.5]]) {
        const x = cx + ox, y = cy + oy, base = px(x, y), by = py(x, y, z), tip = by - 0.62 * R.zs * k - 3 * R.zoom;
        const w = 5.5 * R.zoom;
        ctx.fillStyle = warn ? 'rgba(255,80,60,0.7)' : '#cdd6f0';
        if (k > 0.03 || warn) { ctx.beginPath(); ctx.moveTo(base - w, by); ctx.lineTo(base + w, by); ctx.lineTo(base, tip); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(base, by); ctx.lineTo(base + w, by); ctx.lineTo(base, tip); ctx.fill(); }
        ctx.fillStyle = '#10121e'; ctx.beginPath(); ctx.ellipse(base, by, w * 1.1, w * 0.55, 0, 0, TAU); ctx.fill();
      }
      if (warn) add(ctx, () => GFX.drawGlow(ctx, 'rgba(255,70,50,1)', px(cx + 0.5, cy + 0.5), py(cx + 0.5, cy + 0.5, z), 40 * R.zoom, 0.25 + 0.2 * Math.sin(t * 36)));
    }
  }
  function drawSweeper(ctx, h, t) {
    const z = h.z + 0.4;
    cylinder(ctx, h.x, h.y, h.z, z + 0.2, 0.2, '#2a2f4a', '#8d98c8', 'rgba(170,230,255,0.9)');
    for (let a = 0; a < h.arms; a++) {
      const an = h.ang + a * Math.PI, ex = h.x + Math.cos(an) * h.len, ey = h.y + Math.sin(an) * h.len;
      ctx.strokeStyle = '#8f9bc8'; ctx.lineWidth = 6 * R.zoom; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(px(h.x, h.y), py(h.x, h.y, z)); ctx.lineTo(px(ex, ey), py(ex, ey, z)); ctx.stroke();
      ctx.strokeStyle = '#e8f2ff'; ctx.lineWidth = 2 * R.zoom; ctx.stroke();
      add(ctx, () => GFX.drawGlow(ctx, 'rgba(255,170,60,1)', px(ex, ey), py(ex, ey, z), 20 * R.zoom, 0.7));
      ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(px(ex, ey), py(ex, ey, z), 6 * R.zoom, 0, TAU); ctx.fill();
    }
    cylinder(ctx, h.x, h.y, z + 0.2, z + 0.34, 0.12, '#444a6a', '#d5defa', null);
  }
  function drawMine(ctx, h, t) {
    if (h.gone) return;
    const bob = Math.sin(t * 3 + h.x) * 0.08, z = h.z + bob, x = px(h.x, h.y), y = py(h.x, h.y, z), r = 11 * R.zoom;
    R.shadow(ctx, h.x, h.y, gz(h.x, h.y), z, r * 0.9, 0.35);
    ctx.strokeStyle = '#8b94b8'; ctx.lineWidth = 2.2 * R.zoom; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + t * 0.4; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r * 0.9); ctx.lineTo(x + Math.cos(a) * r * 1.65, y + Math.sin(a) * r * 1.5); ctx.stroke(); }
    ctx.fillStyle = GFX.rg(ctx, x - r * 0.3, y - r * 0.3, 1, r * 1.1, [[0, '#9aa4c8'], [0.6, '#363c5c'], [1, '#0e101c']]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    const on = ((t * 2.2 + h.x) % 1) < 0.5;
    add(ctx, () => GFX.drawGlow(ctx, on ? 'rgba(255,40,40,1)' : 'rgba(120,10,10,1)', x, y, r * 2, on ? 0.9 : 0.3));
  }
  function drawTurret(ctx, h, t) {
    const z = gz(h.x, h.y), d = G.DIRS[h.dir || 0], bx = h.x + d[0] * 0.35, by = h.y + d[1] * 0.35;
    cylinder(ctx, h.x, h.y, z, z + 0.3, 0.32, '#232842', '#3b4268', 'rgba(120,200,255,0.7)');
    ctx.strokeStyle = '#a9b6e8'; ctx.lineWidth = 7 * R.zoom; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(px(h.x, h.y), py(h.x, h.y, z + 0.4)); ctx.lineTo(px(bx + d[0] * 0.3, by + d[1] * 0.3), py(bx + d[0] * 0.3, by + d[1] * 0.3, z + 0.4)); ctx.stroke();
    const charge = U.clamp(1 - h.cd / 0.7, 0, 1);
    add(ctx, () => GFX.drawGlow(ctx, 'rgba(255,120,60,1)', px(h.x + d[0] * 0.7, h.y + d[1] * 0.7), py(h.x + d[0] * 0.7, h.y + d[1] * 0.7, z + 0.4), 16 * R.zoom, charge * 0.9));
  }
  function drawGem(ctx, g, t) {
    if (g.taken) return;
    const bob = Math.sin(t * 3 + g.t) * 0.1, z = g.z + bob, x = px(g.x, g.y), y = py(g.x, g.y, z);
    const big = g.type === 'time', s = (big ? 11 : 8) * R.zoom, col = big ? '120,255,200' : '255,210,80';
    R.shadow(ctx, g.x, g.y, gz(g.x, g.y), z, s, 0.3);
    const sq = Math.abs(Math.cos(t * 2.2 + g.t));
    ctx.fillStyle = 'rgba(' + col + ',0.9)';
    ctx.beginPath(); ctx.moveTo(x, y - s * 1.4); ctx.lineTo(x + s * (0.2 + sq * 0.7), y); ctx.lineTo(x, y + s * 1.4); ctx.lineTo(x - s * (0.2 + sq * 0.7), y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(x, y - s * 1.4); ctx.lineTo(x + s * (0.2 + sq * 0.7), y); ctx.lineTo(x, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2; ctx.stroke();
    add(ctx, () => GFX.drawGlow(ctx, 'rgba(' + col + ',1)', x, y, s * 3.4, 0.55));
    if (big) { ctx.fillStyle = '#04201a'; ctx.font = '800 ' + (8 * R.zoom) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('+' + (g.secs || C.TIME_CRYSTAL), x, y + 0.5); }
  }
  function drawBolt(ctx, b, t) { add(ctx, () => { GFX.drawGlow(ctx, 'rgba(255,130,50,1)', px(b.x, b.y), py(b.x, b.y, b.z), 20 * R.zoom, 0.95); GFX.drawGlow(ctx, 'rgba(255,255,220,1)', px(b.x, b.y), py(b.x, b.y, b.z), 8 * R.zoom, 1); }); }

  function drawGoal(ctx, t, sim) {
    const gb = R.goalBox;
    if (!gb) return;
    const x = px(gb.cx, gb.cy), baseY = py(gb.cx, gb.cy, gb.z);
    add(ctx, () => {
      const hgt = 7 * R.zs, grd = ctx.createLinearGradient(0, baseY, 0, baseY - hgt);
      const done = sim.state === 'finish';
      grd.addColorStop(0, 'rgba(120,230,255,' + (done ? 0.7 : 0.38) + ')'); grd.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = grd; ctx.fillRect(x - 26 * R.zoom, baseY - hgt, 52 * R.zoom, hgt);
      const rr = (1.7 + 0.15 * Math.sin(t * 2)) * R.hw, zz = gb.z + 3.2;
      ctx.strokeStyle = 'rgba(140,240,255,0.85)'; ctx.lineWidth = 3 * R.zoom;
      ctx.beginPath(); ctx.ellipse(x, py(gb.cx, gb.cy, zz), rr, rr * 0.5, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,90,220,0.7)'; ctx.beginPath(); ctx.ellipse(x, py(gb.cx, gb.cy, zz + 0.5), rr * 0.8, rr * 0.4, 0, 0, TAU); ctx.stroke();
    });
    if (G.hud && G.hud.txt) G.hud.txt(ctx, 'FINISH', x, baseY - 4.3 * R.zs, 22 * Math.max(0.8, R.zoom), '#ffffff', 'center', 900, 'rgba(120,230,255,0.95)');
  }

  /* ---------------- particles ---------------- */
  function drawAddFx(ctx, t) {
    ctx.globalCompositeOperation = 'lighter';
    const list = FX.list;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p.add) continue;
      const k = p.t / p.life, x = px(p.x, p.y), y = py(p.x, p.y, p.z);
      if (p.kind === 'spark') {
        ctx.globalAlpha = (1 - k); ctx.strokeStyle = p.color; ctx.lineWidth = p.size * Math.max(0.7, R.zoom);
        const sxv = (p.vx - p.vy) * R.hw, syv = (p.vx + p.vy) * R.hh - p.vz * R.zs;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - sxv * 0.045, y - syv * 0.045); ctx.stroke();
      } else if (p.kind === 'glow') {
        const r = Math.max(1, p.size * (1 + p.grow * k)) * R.zoom;
        ctx.globalAlpha = (1 - k) * (1 - k * 0.5); ctx.drawImage(GFX.glow(p.color), x - r, y - r, r * 2, r * 2);
      } else if (p.kind === 'ring') {
        const r = (p.size + (p.r1 - p.size) * U.easeOutCubic(k)) * R.hw * 1.414;
        ctx.globalAlpha = 1 - k; ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(0.8, p.lw * (1 - k * 0.6) * R.zoom);
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU); ctx.stroke();
      } else if (p.kind === 'beam') {
        const h = p.size * R.zs, w = p.r1 * R.zoom * (1 - k * 0.5);
        ctx.globalAlpha = (1 - k); const g = ctx.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, p.color); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(x - w / 2, y - h, w, h);
      }
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  function drawNormFx(ctx, t) {
    const list = FX.list;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (p.add) continue;
      const k = p.t / p.life, x = px(p.x, p.y), y = py(p.x, p.y, p.z);
      if (p.kind === 'smoke') {
        ctx.globalAlpha = 0.34 * (1 - k); ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(x, y, p.size * (1 + p.grow * k) * R.zoom, 0, TAU); ctx.fill();
      } else if (p.kind === 'shard' && p.pts) {
        const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.scale(R.zoom, R.zoom);
        ctx.globalAlpha = a * 0.9;
        ctx.fillStyle = 'hsla(' + (p.color || 195) + ',95%,58%,0.72)'; ctx.strokeStyle = 'rgba(240,254,255,1)'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); for (let j = 1; j < p.pts.length; j++) ctx.lineTo(p.pts[j][0], p.pts[j][1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.globalAlpha = a * 0.7; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); ctx.lineTo(p.pts[1][0] * 0.6, p.pts[1][1] * 0.6); ctx.lineTo(0, 0); ctx.fill();
        ctx.restore();
      } else if (p.kind === 'chunk' && p.pts) {
        const a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot * 0.35); ctx.scale(R.zoom, R.zoom); ctx.globalAlpha = a;
        ctx.fillStyle = '#3a2619'; ctx.strokeStyle = 'rgba(255,150,70,0.95)'; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]); for (let j = 1; j < p.pts.length; j++) ctx.lineTo(p.pts[j][0], p.pts[j][1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#26160e'; ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1] + 5); for (let j = 1; j < p.pts.length; j++) ctx.lineTo(p.pts[j][0], p.pts[j][1] + 5); ctx.lineTo(p.pts[p.pts.length - 1][0], p.pts[p.pts.length - 1][1]); ctx.lineTo(p.pts[0][0], p.pts[0][1]); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawTexts(ctx) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const t of FX.texts) {
      const k = t.t / t.life, x = px(t.x, t.y), y = py(t.x, t.y, t.z);
      ctx.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      ctx.font = '900 ' + (t.size * Math.max(0.8, R.zoom)) + 'px "Segoe UI", system-ui, sans-serif';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,20,0.85)'; ctx.strokeText(t.str, x, y);
      ctx.fillStyle = t.color; ctx.fillText(t.str, x, y);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- the whole scene ---------------- */
  R.drawScene = function (ctx, sim, t) {
    const m = sim.m, W = R.world;
    R.t = t; R.sim = sim;
    ctx.setTransform(R.ps, 0, 0, R.ps, 0, 0);
    if (G.scenery) G.scenery.draw(ctx, t);
    R.drawTerrain(ctx, t);
    ctx.setTransform(R.ps, 0, 0, R.ps, 0, 0);
    /* light pool under the marble */
    if (!m.dead) {
      const g0 = gz(m.x, m.y);
      add(ctx, () => { const gx = px(m.x, m.y), gy = py(m.x, m.y, g0 > -Infinity ? g0 : m.z); ctx.save(); ctx.translate(gx, gy); ctx.scale(1, 0.5); GFX.drawGlow(ctx, R.theme.accent.replace('#', '') ? hexA(R.theme.accent, 0.5) : 'rgba(80,200,255,0.5)', 0, 0, 170 * R.zoom, 0.34); ctx.restore(); });
    }
    R.drawDecals(ctx);
    for (const h of sim.hz) if (h.type === 'crusher') crusherMark(ctx, h, t);
    /* entity list, sorted by depth */
    const items = [];
    const it = (k, fn, occ) => items.push({ k, fn, occ });
    if (!m.dead) it(m.x + m.y + 0.0004 * m.z, () => drawMarble(ctx, sim, t), { x: m.x, y: m.y, z: m.z });
    for (const e of sim.foes) {
      if (!e.alive) continue;
      const k = e.x + e.y;
      if (e.type === 'orb') it(k, () => drawOrb(ctx, e, t), { x: e.x, y: e.y, z: e.z });
      else if (e.type === 'muncher') it(k, () => drawMuncher(ctx, e, t, sim), { x: e.x, y: e.y, z: e.z });
      else if (e.type === 'coil') it(k, () => drawCoil(ctx, e, t), { x: e.x, y: e.y, z: e.z });
      else if (e.type === 'vacuum') it(k, () => drawVacuum(ctx, e, t, sim), { x: e.x, y: e.y, z: e.z });
    }
    for (const p of sim.posts) it(p.x + p.y, () => drawPost(ctx, p, t), null);
    for (const g of sim.gems) if (!g.taken) it(g.x + g.y, () => drawGem(ctx, g, t), null);
    for (const b of sim.bolts) it(b.x + b.y, () => drawBolt(ctx, b, t), null);
    for (const h of sim.hz) {
      if (h.type === 'laser') { it(h.x + h.y - 0.1, () => drawEmitter(ctx, h.x, h.y, h.z, t, h.state === 2, h.state === 1), null); it(h.x2 + h.y2 - 0.1, () => drawEmitter(ctx, h.x2, h.y2, h.z, t, h.state === 2, h.state === 1), null); it((h.x + h.x2 + h.y + h.y2) / 2, () => drawLaserBeam(ctx, h, t), null); }
      else if (h.type === 'crusher') it(h.x + h.w + h.y + h.h - 0.5, () => drawCrusher(ctx, h, t), null);
      else if (h.type === 'spikes') it(h.x + h.y - 0.2, () => drawSpikes(ctx, h, t), null);
      else if (h.type === 'sweeper') it(h.x + h.y, () => drawSweeper(ctx, h, t), null);
      else if (h.type === 'mine') it(h.x + h.y, () => drawMine(ctx, h, t), null);
      else if (h.type === 'turret') it(h.x + h.y, () => drawTurret(ctx, h, t), null);
    }
    if (R.goalBox) it(R.goalBox.cx + R.goalBox.cy, () => drawGoal(ctx, t, sim), null);
    items.sort((a, b) => a.k - b.k);
    for (const o of items) {
      o.fn();
      ctx.globalAlpha = 1;
      if (o.occ) { R.redrawFront(ctx, o.occ.x, o.occ.y, o.occ.z, t); ctx.setTransform(R.ps, 0, 0, R.ps, 0, 0); }
    }
    drawNormFx(ctx, t);
    drawAddFx(ctx, t);
    drawTexts(ctx);
  };
  function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
})((window.SGS = window.SGS || {}));

