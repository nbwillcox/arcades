/* Draws a frame: parallax, baked room tiles (autotiled, with hash-placed decor), entities, shots, effects. 480x270 internal canvas. */
(function (G) {
  'use strict';
  const S = G.sprites, RM = G.room, T = 16, U = G.U, W = G.world;
  const R = {};
  G.render = R;
  const solidAny = (room, tx, ty) => { const k = RM.at(room, tx, ty); return k === 1 || k === 3 || k === 4 || k === 5 || k === 6 || k === 7 || k === 9 || k === 10 || k === 12 || k === 13 || k === 17; };
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  /* bake the static layers of a room into one canvas (re-run when blocks break) */
  R.bake = function (room) {
    const TS = S.tilesets[room.zone || 1], tile = TS, deco = TS.deco;
    const doorCell = (tx, ty) => (room.def.doors || []).some((d) => d.side !== 'I' && ty >= d.ty && ty < d.ty + d.h && tx === (d.side === 'L' ? 0 : room.w - 1));
    const solidish = (rm, tx, ty) => solidAny(rm, tx, ty) || doorCell(tx, ty);                  /* a doorway always counts as rock for the tiles around it, so the sill and lintel look the same whether the door is open or shut */
    const c = room.baked && room.baked.width === room.pw && room.baked.height === room.ph ? room.baked : document.createElement('canvas');
    c.width = room.pw; c.height = room.ph;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, c.width, c.height);
    if (!room.wallLayer) {                                                  /* the back wall (tiles plus this room's own dressing) is built once per room entry */
      const wl = document.createElement('canvas'); wl.width = room.pw; wl.height = room.ph;
      const wx = wl.getContext('2d'); wx.imageSmoothingEnabled = false;
      if (!room.def.sky) for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) if (room.wall[ty * room.w + tx] || room.t[ty * room.w + tx] !== 1) {      /* layering: black space, then the room's back wall in EVERY non-rock cell (no gaps), then everything else on top */
        const h = hash(tx, ty), v = h % 11 === 0 ? 3 : (tx + ty * 2) % 3;
        wx.drawImage(tile.wall[v], tx * T, ty * T);
      }
      if (G.walldeco && !room.def.sky) G.walldeco.apply(wx, room, TS);
      room.wallLayer = wl;
    }
    x.drawImage(room.wallLayer, 0, 0);
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      const k = RM.at(room, tx, ty), h = hash(tx, ty), px = tx * T, py = ty * T;
      if (room.def.sky && ty === 0) continue;                                 /* the hidden ceiling of an open-sky room */
      if (k === 1) {
        const m = (!solidish(room, tx, ty - 1) ? 1 : 0) | (!solidish(room, tx + 1, ty) && tx + 1 < room.w ? 2 : 0) | (!solidish(room, tx, ty + 1) && ty + 1 < room.h ? 4 : 0) | (!solidish(room, tx - 1, ty) && tx > 0 ? 8 : 0);
        let img;
        if (m) img = tile.edge[m][h % 3];
        else {
          const d = (!solidish(room, tx - 1, ty - 1) ? 1 : 0) | (!solidish(room, tx + 1, ty - 1) ? 2 : 0) | (!solidish(room, tx + 1, ty + 1) ? 4 : 0) | (!solidish(room, tx - 1, ty + 1) ? 8 : 0);
          img = d ? tile.diag[d] : tile.edge[0][h % 3];
        }
        x.drawImage(img, px, py);
        if ((m & 1) && !(m & 8) && !(m & 2)) { const r = h % 9; if (r < tile.top.length) { const [im, ox, oy] = tile.top[r]; x.drawImage(im, px + ox, py - oy); } }
        if ((m & 4) && !(m & 8) && !(m & 2) && h % 7 === 0) { const [im, ox] = tile.hang[h % tile.hang.length]; x.drawImage(im, px + ox, py + 16); }
      } else if (k === 3) x.drawImage(tile.slopeR, px, py);
      else if (k === 4) x.drawImage(tile.slopeL, px, py);
      else if (k === 2) { x.drawImage(tile.edge[1][h % 3], 0, 6, 16, 6, px, py + 5, 16, 6); x.drawImage(tile.ledge, px, py); }      /* one-way ledge: a thin slab of the zone's own brick under the pale cap */
      else if (k === 5) x.drawImage(tile.shot, px, py);
      else if (k === 6) x.drawImage(tile.bomb, px, py);
      else if (k === 7) x.drawImage(tile.missile, px, py);
      else if (k === 8) x.drawImage(tile.spikes, px, py);
      else if (k === 10) x.drawImage(tile.ice, px, py);
      else if (k === 12) x.drawImage(tile.wave, px, py);
      else if (k === 13) x.drawImage(tile.dashblock, px, py);
      else if (k === 17) x.drawImage(tile.mega, px, py);
    }
    room.baked = c; room.dirty = false; room.wetLayer = null;
  };
  /* the light that rises from a save pad: stepped bands that grow upward, rising sparkles and a bright base; front = the thin inner beam drawn over the hero */
  R.saveLight = function (ctx, a, front) {
    const t = a.t, fade = Math.min(1, t / 14) * (t > 74 ? Math.max(0, 1 - (t - 74) / 20) : 1), yo = a.yoff || 0; if (fade <= 0) return;
    const C = S.capsule, gl = C.glass, gx = Math.round(a.x - C.w / 2) + gl[0], gy = Math.round(a.y - C.h) + gl[1], gw = gl[2] - gl[0] + 1, gh = gl[3] - gl[1] + 1, reach = 46;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (!front) {                                                           /* behind the hero: scan lines sweep the glass up and down, flashing; sparks rise inside */
      for (let k = 0; k < 4; k++) {
        const ph = (t * (1.7 + 0.35 * k) + k * 23) % (gh * 2), y = ph < gh ? ph : gh * 2 - ph, flash = ((t + k * 3) >> 1) & 1 ? 1 : 0.4;
        ctx.fillStyle = k & 1 ? '#c8fbff' : '#7cefff'; ctx.globalAlpha = fade * flash * 0.55; ctx.fillRect(gx - 2, Math.round(gy + gh - 1 - y), gw + 4, 1);
        ctx.globalAlpha = fade * flash * 0.2; ctx.fillRect(gx - 2, Math.round(gy + gh - 2 - y), gw + 4, 3);
      }
      for (let i = 0; i < 12; i++) { const ph = (t * 1.3 + i * 17) % gh; ctx.fillStyle = '#f2ffff'; ctx.globalAlpha = fade * (0.9 - ph / gh * 0.7); ctx.fillRect(gx + 2 + ((i * 37) % (gw - 4)), Math.round(gy + gh - 1 - ph), 1, 1); }
      if (t > 38 && t < 54) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5 * (1 - Math.abs(t - 46) / 8) * fade; ctx.fillRect(gx, gy, gw, gh); }       /* the save itself: the whole window flashes */
    } else {                                                                /* over the hero: two thin bands scan the body, up then down */
      for (let k = 0; k < 2; k++) {
        const ph = (t * (2.2 + 0.5 * k) + k * 31) % (reach * 2), y = ph < reach ? ph : reach * 2 - ph, flash = ((t + k * 2) >> 1) & 1 ? 1 : 0.5;
        ctx.fillStyle = '#d8fcff'; ctx.globalAlpha = fade * flash * 0.5; ctx.fillRect(Math.round(a.x - 13), Math.round(a.y - yo - 2 - y), 26, 1);
        ctx.fillStyle = '#7cefff'; ctx.globalAlpha = fade * flash * 0.18; ctx.fillRect(Math.round(a.x - 13), Math.round(a.y - yo - 3 - y), 26, 3);
      }
    }
    ctx.restore();
  };
  /* the teleport light show. out: converging motes and rising bands while the hero charges, then a burst (rays, a beam up and a flat ring); in: a beam crashes down onto the deck,
     a shockwave ring spreads and sparks fly, and the hero materialises. back = behind the hero, front = over him. */
  R.liftFx = function (ctx, g, front) {
    const a = g.liftAnim; if (!a) return;
    const L = S.lift, lift = L.h - L.deck, t = a.t, cx = Math.round(a.x), deckY = Math.round(a.y - lift), cy = deckY - 22, camTop = Math.round(g.cam.y);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (a.phase === 'out') {
      const charge = Math.max(0, Math.min(1, (t - 14) / 50));
      if (!front && t > 14 && t < 70) {
        for (let k = 0; k < 3; k++) { const ph = (t * (2.4 + 0.6 * k) + k * 19) % 52, fl = ((t + k * 3) >> 1) & 1 ? 1 : 0.45; ctx.fillStyle = k & 1 ? '#c8fbff' : '#7cefff'; ctx.globalAlpha = 0.5 * charge * fl; ctx.fillRect(cx - 14, deckY - Math.round(ph), 28, 1); ctx.globalAlpha = 0.16 * charge * fl; ctx.fillRect(cx - 14, deckY - Math.round(ph) - 1, 28, 3); }
        for (let i = 0; i < 18; i++) { const ph = ((t * 1.4 + i * 9) % 34) / 34, ang = i * 2.399, r = (1 - ph) * 36; ctx.fillStyle = i & 1 ? '#ffffff' : '#7cefff'; ctx.globalAlpha = charge * (0.2 + 0.7 * ph); const sz = i % 3 === 0 ? 2 : 1; ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r * 0.9), sz, sz); }
      }
      if (front && t >= 40 && t < 70) { const w = ((t - 40) / 30); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.18 + 0.3 * w; ctx.fillRect(cx - 12, cy - 22, 24, 44); }                               /* the body starts to blow out */
      if (!front && t >= 70) {
        const u = Math.min(1, (t - 70) / 18), fade = 1 - u, w = Math.max(2, Math.round(14 * (1 - u * 0.7)));
        ctx.fillStyle = '#7cefff'; ctx.globalAlpha = 0.3 * fade; ctx.fillRect(cx - w, camTop, w * 2, deckY - camTop); ctx.fillStyle = '#f2ffff'; ctx.globalAlpha = 0.85 * fade; ctx.fillRect(cx - (w >> 1), camTop, w, deckY - camTop);
        for (let i = 0; i < 14; i++) { const ang = i * 6.2832 / 14 + 0.2, r0 = 4 + u * 10, r1 = 8 + u * 54; ctx.fillStyle = i & 1 ? '#ffffff' : '#9af2ff'; ctx.globalAlpha = 0.9 * fade; for (let r = r0; r < r1; r += 2) ctx.fillRect(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), 1, 1); }
        ctx.strokeStyle = '#d8fcff'; ctx.globalAlpha = 0.8 * fade; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, deckY - 1, 6 + u * 40, 2 + u * 10, 0, 0, 6.2832); ctx.stroke();
      }
    } else if (!front) {
      if (t < 16) {
        const u = t / 16, head = camTop + (deckY - camTop) * (u * u);                               /* a falling streak of light */
        for (let k = 0; k < 28; k++) { const y = Math.round(head - k * 3); if (y < camTop - 3) break; const al = 0.95 * (1 - k / 28); ctx.fillStyle = '#7cefff'; ctx.globalAlpha = al * 0.4; ctx.fillRect(cx - 5, y, 10, 3); ctx.fillStyle = '#f2ffff'; ctx.globalAlpha = al; ctx.fillRect(cx - 2, y, 4, 3); }
        ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(cx, Math.round(head), 7, 0, 6.2832); ctx.fill();
      } else if (t < 40) {
        const v = (t - 16) / 24, fade = 1 - v;
        for (let k = 0; k < 2; k++) { ctx.strokeStyle = k ? '#7cefff' : '#f2ffff'; ctx.globalAlpha = 0.85 * fade; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(cx, deckY - 1, 4 + v * 36 + k * 7, 1.5 + v * 9 + k * 2, 0, 0, 6.2832); ctx.stroke(); }
        for (let i = 0; i < 16; i++) { const dx = (i - 7.5) * v * 5, y = deckY - v * (24 + (i % 4) * 9) + v * v * 26; ctx.fillStyle = i & 1 ? '#ffffff' : '#9af2ff'; ctx.globalAlpha = 0.95 * fade; ctx.fillRect(Math.round(cx + dx), Math.round(y), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1); }
        ctx.fillStyle = '#7cefff'; ctx.globalAlpha = 0.3 * fade; ctx.fillRect(cx - 6, camTop, 12, deckY - camTop); ctx.fillStyle = '#f2ffff'; ctx.globalAlpha = 0.6 * fade; ctx.fillRect(cx - 2, camTop, 4, deckY - camTop);     /* the column fades */
      }
    }
    ctx.restore();
  };
  /* the super dash look: the armour is wrapped in a pulsing rim of energy (the beam's colours), afterimages hang behind him, speed streaks and sparks peel off, a white core flickers over the suit.
     back (drawn under the hero) = afterimages, streaks and the outer glow; front (over him) = the flicker and the bright rim. */
  const tints = new Map();
  const tintOf = (cv, col) => { const key = col; let m = tints.get(cv); if (!m) { m = {}; tints.set(cv, m); } let t = m[key]; if (!t) { t = document.createElement('canvas'); t.width = cv.width; t.height = cv.height; const x = t.getContext('2d'); x.drawImage(cv, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, t.width, t.height); m[key] = t; } return t; };
  const rims = new Map();
  const rimOf = (cv, col) => { let m = rims.get(cv); if (!m) { m = {}; rims.set(cv, m); } let t = m[col]; if (!t) { t = document.createElement('canvas'); t.width = cv.width + 2; t.height = cv.height + 2; const x = t.getContext('2d'), tt = tintOf(cv, col); for (const [ox, oy] of [[0, 1], [2, 1], [1, 0], [1, 2]]) x.drawImage(tt, ox, oy); x.globalCompositeOperation = 'destination-out'; x.drawImage(cv, 1, 1); m[col] = t; } return t; };      /* only the one-pixel ring around the silhouette */
  R.dashAura = function (ctx, g, p, c0, hx, hy, time, front) {
    const B = G.weapons.beam(g.abil), c1 = B.col[0], c2 = B.col[1], dir = p.dashDir || p.face, tick = Math.floor(time * 60), on = p.dash > 0 && g.abil.dash;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    if (!front) {
      const tr = g.dashTrail || [];
      for (let i = tr.length - 1; i >= 0; i--) { const q = tr[i]; if (Math.abs(q.x - p.x) < 7) continue; const right = q.face >= 0, cc = right ? q.fr.r : q.fr.l, qx = Math.round(q.x - (right ? q.fr.ax : q.fr.axl)), qy = Math.round(q.y - q.fr.ay); ctx.globalAlpha = 0.3 * (1 - i / (tr.length + 1)); ctx.drawImage(tintOf(cc, c1), qx, qy); }
      if (on) {
        const cx = Math.round(p.x), cy = Math.round(p.y - 22);
        for (let k = 0; k < 9; k++) { const len = 12 + ((tick * 7 + k * 13) % 30), oy = ((k * 11 + (tick >> 1) * 5) % 40) - 20, ox = ((tick * 3 + k * 17) % 8); ctx.fillStyle = k & 1 ? c2 : c1; ctx.globalAlpha = 0.55 - (k % 3) * 0.12; ctx.fillRect(dir > 0 ? cx - 8 - ox - len : cx + 8 + ox, cy + oy, len, 1); }
        ctx.globalAlpha = 0.07 + 0.03 * Math.sin(tick * 0.8); ctx.fillStyle = c1; for (let r = 20; r > 12; r -= 4) { ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.8, r * 1.25, 0, 0, 6.2832); ctx.fill(); }
      }
    } else if (on) {
      const pulse = 0.5 + 0.5 * Math.sin(tick * 0.9);
      ctx.globalAlpha = 0.7 + 0.3 * pulse; ctx.drawImage(rimOf(c0, c2), hx - 1, hy - 1);                              /* a one-pixel rim of energy all round the armour */
      ctx.globalAlpha = 0.06 + 0.12 * pulse; ctx.drawImage(tintOf(c0, '#ffffff'), hx, hy);                                                                                     /* the suit flickers white-hot */
      for (let i = 0; i < 6; i++) { const a = (tick * 0.5 + i * 1.05) % 6.2832, rx = Math.round(p.x + Math.cos(a) * 11), ry = Math.round(p.y - 22 + Math.sin(a) * 19); ctx.fillStyle = i & 1 ? '#ffffff' : c2; ctx.globalAlpha = 0.9; ctx.fillRect(rx, ry, 1, 2); }  /* sparks orbit the body */
    }
    ctx.restore();
  };
  /* the item-get moment: light rays from the raised cannon, the item floating up with a glow, and a quick white flash */
  R.getFx = function (ctx, g, time) {
    const a = g.getAnim, p = g.P, m = G.player.muzzle(p), t = a.t, big = a.big, fade = t > (big ? 140 : 62) ? Math.max(0, 1 - (t - (big ? 140 : 62)) / 24) : 1;
    const rise = Math.min(big ? 26 : 18, t * 0.5), cx = Math.round(m.x), cy = Math.round(m.y - 6 - rise);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const rays = big ? 12 : 8;
    for (let i = 0; i < rays; i++) {
      const ang = (i / rays) * 6.283 + t * 0.015, len = Math.min(big ? 46 : 26, t * 1.2) * (0.6 + 0.4 * Math.sin(t * 0.2 + i));
      for (let d = 6; d < len; d += 2) { const al = fade * (0.5 - d / (big ? 110 : 70)); if (al <= 0) break; ctx.fillStyle = 'rgba(255,240,170,' + al.toFixed(3) + ')'; ctx.fillRect(Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d), 2, 2); }
    }
    ctx.restore();
    ctx.globalAlpha = fade; W.drawItem(ctx, a.it.type, cx, cy + 14, t, Math.round(Math.sin(t * 0.12) * 2)); ctx.globalAlpha = 1;
  };
  /* a soft shaft of light falling on a shrine statue: stepped additive bands, with a few motes drifting up through it */
  R.shaft = function (ctx, d, room, time) {
    const big = d.statue === 'big', top = 32, bot = d.fy, h = bot - top, w0 = big ? 22 : 14, w1 = big ? 78 : 44;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let y = top; y < bot; y += 2) {
      const k = (y - top) / h, w = Math.round(w0 + (w1 - w0) * k), al = (0.085 - k * 0.05) * (0.8 + 0.2 * Math.sin(time * 1.3 + y * 0.05));
      if (al <= 0) continue; ctx.fillStyle = 'rgba(255,238,190,' + al.toFixed(3) + ')'; ctx.fillRect(Math.round(d.cx - w / 2), y, w, 2);
    }
    for (let i = 0; i < 7; i++) {
      const ph = (time * 14 + i * 37) % h, x = Math.round(d.cx + Math.sin(i * 2.7 + time * 0.6) * (w0 + (w1 - w0) * (ph / h)) * 0.4), y = Math.round(bot - ph);
      ctx.fillStyle = 'rgba(255,248,210,' + (0.55 * (1 - ph / h)).toFixed(3) + ')'; ctx.fillRect(x, y, 1, 1);
    }
    ctx.restore();
  };
  R.camera = function (g, snap) {
    const p = g.P, room = g.room, cam = g.cam, W = 480, H = 270;
    const tx = p.x + p.face * 22 - W / 2, ty = p.y - 36 - H / 2 - 24;
    if (snap) { cam.x = tx; cam.y = ty; } else { cam.x += (tx - cam.x) * 0.1; cam.y += (ty - cam.y) * 0.12; }
    cam.x = room.pw <= W ? (room.pw - W) / 2 : U.clamp(cam.x, 0, room.pw - W);
    cam.y = room.ph <= H ? (room.ph - H) / 2 : U.clamp(cam.y, 0, room.ph - H);
  };
  /* the open sky of the landing site: stepped night gradient, drifting stars, a ringed planet and two ridges of distant mountains (parallax by camera x) */
  const skyHash = (i, s) => { let h = (Math.imul(i + 1, 374761393) + Math.imul(s, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let skyBG = null;
  R.sky = function (ctx, cam, time) {
    if (!skyBG) {
      skyBG = document.createElement('canvas'); skyBG.width = 480; skyBG.height = 270; const c = skyBG.getContext('2d'); c.imageSmoothingEnabled = false;
      const bands = ['#04051a', '#060822', '#080b2a', '#0b1034', '#0e163f', '#131e4e', '#19285e', '#20336e', '#2a417c', '#365288', '#456593', '#5a7a9c'];
      bands.forEach((col, i) => { c.fillStyle = col; c.fillRect(0, Math.round(i * 270 / bands.length * 0.86), 480, 270); });
      skyBG.ready = true;
    }
    ctx.drawImage(skyBG, 0, 0);
    const cx = cam.x;
    for (let i = 0; i < 110; i++) {                                          /* stars: far ones barely move */
      const sx = Math.floor(skyHash(i, 1) * 640 - cx * (0.04 + skyHash(i, 4) * 0.06) + 960) % 480, sy = Math.floor(skyHash(i, 2) * 175), tw = Math.sin(time * (1 + skyHash(i, 3) * 2) + i) > 0.55;
      ctx.fillStyle = tw ? '#ffffff' : skyHash(i, 5) > 0.7 ? '#9fc4ff' : '#6e82b8'; ctx.fillRect(sx < 0 ? sx + 480 : sx, sy, skyHash(i, 6) > 0.93 ? 2 : 1, skyHash(i, 6) > 0.93 ? 2 : 1);
    }
    const px = 352 - cx * 0.07, py = 70;                                      /* a ringed planet */
    ctx.fillStyle = '#2a3260'; for (let dy = -30; dy <= 30; dy++) { const w = Math.floor(Math.sqrt(900 - dy * dy)); ctx.fillRect(Math.round(px - w), py + dy, w * 2, 1); }
    ctx.fillStyle = '#4a5a96'; for (let dy = -28; dy <= 16; dy++) { const w = Math.floor(Math.sqrt(784 - dy * dy)) - 3; ctx.fillRect(Math.round(px - w - 3), py + dy, w * 2 - 6, 1); }
    ctx.fillStyle = '#8fa4de'; for (let dy = -24; dy <= -6; dy++) { const w = Math.floor(Math.sqrt(580 - dy * dy)) - 8; ctx.fillRect(Math.round(px - w - 8), py + dy, Math.max(0, w * 1.3), 1); }
    ctx.fillStyle = '#c0a8e8'; for (let a = 0; a < 6.2832; a += 0.02) { const rx = Math.cos(a) * 52, ry = Math.sin(a) * 9; if (ry > 0 || Math.abs(rx) > 31) ctx.fillRect(Math.round(px + rx), Math.round(py + 4 + ry - rx * 0.12), 1, 1); }
    for (const [par, base, amp, col, seed] of [[0.18, 168, 46, '#101a44', 1], [0.34, 190, 30, '#0b1236', 2]]) {   /* two ridges */
      ctx.fillStyle = col; const off = cx * par;
      for (let x = 0; x < 480; x++) { const wx = x + off, h = base - amp * (0.55 * Math.sin(wx * 0.013 + seed) + 0.3 * Math.sin(wx * 0.037 + seed * 2.1) + 0.15 * Math.sin(wx * 0.09 + seed * 4)) - amp * 0.4; ctx.fillRect(x, Math.round(h), 1, 270); }
    }
    ctx.fillStyle = 'rgba(120,150,210,0.10)'; ctx.fillRect(0, 150, 480, 40);      /* horizon haze */
  };
  R.draw = function (ctx, g, time) {
    const room = g.room, cam = g.cam, p = g.P;
    if (!room.baked || room.dirty) R.bake(room);
    ctx.save();
    const sh = G.settings.shake && !G.settings.reduced ? g.shake : 0;
    let ox = Math.round(cam.x), oy = Math.round(cam.y);
    if (sh > 0.3) { ox += Math.round((Math.random() - 0.5) * sh); oy += Math.round((Math.random() - 0.5) * sh); }
    /* parallax (horizontal only) */
    if (room.def.sky) R.sky(ctx, cam, time); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 480, 270); }                     /* the black universe behind everything (or the open sky of the landing site) */
    ctx.translate(-ox, -oy);
    ctx.drawImage(room.baked, 0, 0);
    for (const d of room.decor || []) {
      if (d.ship) {                                                          /* the landed ship: one still hull; its orange lamps and engine pods pulse, the cyan lamps flicker, a warm glow washes the pad */
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ff9a4a'; ctx.globalAlpha = 0.06 + 0.03 * Math.sin(time * 2.2); for (let i = 0; i < 4; i++) ctx.fillRect(d.cx - 66 + i * 6, d.fy - 3 - i, 132 - i * 12, 3 + i); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.drawImage(S.ship.c, d.x, d.y);
        ctx.globalCompositeOperation = 'lighter';
        S.ship.lights.forEach((l, i) => {
          const orange = l.k === 'orange', pulse = orange ? (i === 0 ? (Math.sin(time * 5) > 0.2 ? 1 : 0.25) : 0.5 + 0.5 * Math.sin(time * 2.6 + i * 1.3)) : (Math.sin(time * 11 + i * 3) > 0 ? 1 : 0.35), lx = d.x + l.cx, ly = d.y + l.cy;
          ctx.fillStyle = orange ? '#ff8a24' : '#7ae0ff'; ctx.globalAlpha = 0.07 + 0.1 * pulse; ctx.beginPath(); ctx.arc(lx, ly, orange ? 8 : 5, 0, 6.2832); ctx.fill();      /* soft halo */
          ctx.globalAlpha = 0.14 + 0.2 * pulse; ctx.beginPath(); ctx.arc(lx, ly, orange ? 4 : 2.5, 0, 6.2832); ctx.fill();
          ctx.fillStyle = orange ? '#ffd890' : '#d8f8ff'; ctx.globalAlpha = 0.22 + 0.55 * pulse; for (const [px, py] of l.px) ctx.fillRect(d.x + px, d.y + py, 1, 1);     /* the lamp pixels themselves brighten */
        });
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; continue;
      }
      if (d.statue) R.shaft(ctx, d, room, time);
      ctx.drawImage(d.img, d.x, d.y);
      if (d.statue) {                                              /* the statue's magenta visor and cyan chest jewel glow, slowly breathing */
        ctx.globalCompositeOperation = 'lighter';
        (d.statue === 'big' ? S.statue.lights : S.statue.lightsSmall).forEach((l, i) => {
          const visor = l.k === 'visor', pulse = 0.5 + 0.5 * Math.sin(time * (visor ? 2.4 : 1.7) + i * 1.9), lx = d.x + l.cx, ly = d.y + l.cy, z = d.statue === 'big' ? 1 : 0.62;
          ctx.fillStyle = visor ? '#ff3ad0' : '#58e8ff'; ctx.globalAlpha = 0.07 + 0.1 * pulse; ctx.beginPath(); ctx.arc(lx, ly, (visor ? 9 : 8) * z, 0, 6.2832); ctx.fill();
          ctx.globalAlpha = 0.14 + 0.2 * pulse; ctx.beginPath(); ctx.arc(lx, ly, (visor ? 5 : 4) * z, 0, 6.2832); ctx.fill();
          ctx.fillStyle = visor ? '#ffc4f4' : '#e0fcff'; ctx.globalAlpha = 0.25 + 0.6 * pulse; for (const [px, py] of l.px) ctx.fillRect(d.x + px, d.y + py, 1, 1);
        });
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      }
    }
    if (G.atmos) G.atmos.draw(ctx, g, 0, time);
    G.world.drawBack(ctx, g, time);
    G.enemies.draw(ctx, g, time); G.score.draw(ctx, g);
    G.bosses.draw(ctx, g, time);
    const TS3 = S.tilesets[room.zone || 1], lf = Math.floor(time * 6) & 3;
    const lavaPass = () => { for (const l of room.lava) { const lx = l.tx * T, ly = l.ty * T; if (lx + 16 < ox || lx > ox + 480 || ly + 16 < oy || ly > oy + 270) continue; ctx.drawImage((l.top ? TS3.lavaTop : TS3.lava)[(lf + l.tx) & 3], lx, ly); } };
    if (room.lava.length) { lavaPass(); if (G.atmos) G.atmos.lavaGlow(ctx, room, ox, oy); }
    if (room.water.length && !room.wetLayer) {                              /* ledges and ramps standing in the water are tinted too, so they read as submerged rather than dry */
      const wl = document.createElement('canvas'); wl.width = room.pw; wl.height = room.ph; const wx = wl.getContext('2d'), tc = document.createElement('canvas'); tc.width = tc.height = T; const tx_ = tc.getContext('2d');
      for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
        const k = room.t[ty * room.w + tx]; if (k !== 2 && k !== 3 && k !== 4) continue;
        const wet = (x, y) => x >= 0 && x < room.w && y >= 0 && room.t[y * room.w + x] === 14;
        if (!(wet(tx, ty - 1) || wet(tx - 1, ty) || wet(tx + 1, ty))) continue;
        tx_.clearRect(0, 0, T, T); tx_.globalCompositeOperation = 'source-over'; tx_.drawImage(room.baked, tx * T, ty * T, T, T, 0, 0, T, T);
        tx_.globalCompositeOperation = 'source-atop'; tx_.fillStyle = '#2a78c8'; tx_.fillRect(0, 0, T, T); wx.drawImage(tc, tx * T, ty * T);
      }
      room.wetLayer = wl;
    }
    const waterPass = (a) => { ctx.globalAlpha = a; if (room.wetLayer) ctx.drawImage(room.wetLayer, 0, 0); for (const w of room.water) { const wx = w.tx * T, wy = w.ty * T; if (wx + 16 < ox || wx > ox + 480 || wy + 16 < oy || wy > oy + 270) continue; ctx.fillStyle = '#2a78c8'; ctx.fillRect(wx, wy, 16, 16); if (w.top) { ctx.fillStyle = '#c8f0ff'; ctx.fillRect(wx, wy + (Math.floor(time * 3 + w.tx) & 1), 16, 1); } else if ((w.tx * 7 + w.ty * 13 + Math.floor(time * 2)) % 9 === 0) { ctx.fillStyle = '#a8e8ff'; ctx.fillRect(wx + 5, wy + 6, 2, 2); } } ctx.globalAlpha = 1; };
    if (room.water.length) waterPass(0.26);
    if (room.scanTiles === undefined) { room.scanTiles = []; for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) if (room.t[y * room.w + x] === 16) room.scanTiles.push([x, y]); }
    for (const [sx, sy] of room.scanTiles) {                          /* hidden scan blocks: solid and visible only while scanning; a faint shimmer hints at them */
      const px = sx * T, py = sy * T;
      if (g.abil.scan && room.scanOn) { ctx.fillStyle = '#10305a'; ctx.fillRect(px, py, 16, 16); ctx.fillStyle = '#38c0b0'; ctx.fillRect(px, py, 16, 1); ctx.fillRect(px, py + 15, 16, 1); ctx.fillRect(px, py, 1, 16); ctx.fillRect(px + 15, py, 1, 16); ctx.fillStyle = '#86f0f2'; ctx.fillRect(px + 3, py + 3, 10, 1); ctx.fillRect(px + 3, py + 3, 1, 10); ctx.fillStyle = '#244850'; ctx.fillRect(px + 5, py + 6, 6, 5); }
      else if (g.abil.scan && (sx * 5 + sy * 3 + Math.floor(time * 2)) % 11 === 0) { ctx.fillStyle = 'rgba(134,240,242,0.45)'; ctx.fillRect(px + 2 + (sx % 3) * 4, py + 1 + (sy % 3) * 4, 1, 1); }
    }
    if (room.megaTiles === undefined) { room.megaTiles = []; for (let y = 0; y < room.h; y++) for (let x = 0; x < room.w; x++) if (room.t[y * room.w + x] === 17) room.megaTiles.push([x, y]); }
    for (const [mx, my] of room.megaTiles) {                              /* overcharge walls pulse softly, so they are worth a second look */
      if (room.t[my * room.w + mx] !== 17) continue;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.1 + 0.08 * Math.sin(time * 3 + mx + my); ctx.fillStyle = '#7ae0ff'; ctx.fillRect(mx * T + 1, my * T + 1, 14, 14); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if ((mx * 7 + my * 5 + Math.floor(time * 4)) % 13 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(mx * T + 3 + (mx * 5 + my * 3) % 9, my * T + 3 + (mx * 3 + my * 7) % 9, 1, 1); }
    }
    G.movers.draw(ctx, g); G.world.drawFront(ctx, g, time);
    for (const b of g.bombs) {
      const fl = Math.floor(b.t / (b.t > 30 ? 3 : 6)) & 1, r = b.big ? 7 : 4, bx = Math.round(b.x), by = Math.round(b.y);
      ctx.fillStyle = b.big ? '#6b3d14' : '#2e3452'; ctx.fillRect(bx - r, by - r + 1, r * 2, r * 2 - 2); ctx.fillRect(bx - r + 1, by - r, r * 2 - 2, r * 2);
      ctx.fillStyle = b.big ? '#efba42' : '#5a658a'; ctx.fillRect(bx - r + 1, by - r + 1, r - 1, 2);
      ctx.fillStyle = fl ? '#fff2a8' : '#ef7a2a'; ctx.fillRect(bx, by - r - 2, 2, 2);
    }
    if (g.saveAnim) R.saveLight(ctx, g.saveAnim, false);
    if (g.liftAnim) R.liftFx(ctx, g, false);
    /* hero */
    const dying = p.dead > 0 && p.dead < 16;                                 /* a short white-flash collapse before the explosion */
    if (!(g.liftAnim && g.liftAnim.hide) && (dying || (!p.dead && !(p.inv > 0 && Math.floor(time * 20) % 2 && p.hurt === 0)))) {
      const fr = G.player.frame(p), ball = p.mode === 'ball' && !g.getAnim, right = p.face >= 0 || ball, c0 = right ? fr.r : fr.l, c = dying && (p.dead & 2) ? S.whiteOf(c0) : c0;
      const spin = p.spinning && !p.ground && !g.getAnim, hx = Math.round(p.x - (right ? fr.ax : fr.axl)), hy = Math.round(p.y - (spin ? 22 : 0) - fr.ay - ((g.saveAnim || g.liftAnim || {}).yoff || 0));
      if (p.spinAtk) R.spinAura(ctx, g, p, time, false);
      if (g.dashTrail && g.dashTrail.length) R.dashAura(ctx, g, p, c0, hx, hy, time, false);
      ctx.drawImage(c, hx, hy);
      if (p.dash > 0 && g.abil.dash) R.dashAura(ctx, g, p, c0, hx, hy, time, true);
      if (g.liftAnim && g.liftAnim.flash) { ctx.globalAlpha = 0.95; ctx.drawImage(S.whiteOf(c0), hx, hy); ctx.globalAlpha = 1; }                          /* teleport flicker: the silhouette flashes white */
      if (p.spinAtk) R.spinAura(ctx, g, p, time, true);
      if (g.saveAnim && g.saveAnim.t > 34 && g.saveAnim.t < 58) { ctx.globalAlpha = 0.75 * (1 - Math.abs(g.saveAnim.t - 46) / 12); ctx.drawImage(S.whiteOf(c0), hx, hy); ctx.globalAlpha = 1; }
      R.chargeFx(ctx, g, p, time);
    }
    if (g.saveAnim) R.saveLight(ctx, g.saveAnim, true);
    if (g.liftAnim) R.liftFx(ctx, g, true);
    if (g.getAnim) R.getFx(ctx, g, time);
    if (room.lava.length) { ctx.globalAlpha = 0.5; lavaPass(); ctx.globalAlpha = 1; }
    if (room.water.length) waterPass(0.2);
    G.grapple.draw(ctx, g, time);
    for (const s of g.shots) R.shot(ctx, s, time);
    G.fx.draw(ctx);
    if (G.atmos) G.atmos.draw(ctx, g, 1, time);
    ctx.restore();
    if (g.getAnim && g.getAnim.t < 12) { ctx.globalAlpha = (g.getAnim.big ? 0.55 : 0.3) * (1 - g.getAnim.t / 12); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 480, 270); ctx.globalAlpha = 1; }
    if (G.atmos) G.atmos.vignette(ctx);
  };
  /* ---- beam art. Every beam type has its own look at every stage (build-up orb, normal / partial / full / overcharge shot):
     base = gold pulse (round, star flare, pulse rings) | ice = cyan crystal (diamond core, snowflake spikes, frost) | wave = violet ripple (rings, sine ribbons, crescents) | plasma = fire (flame tongues, embers, smoke).
     When several beams are switched on the highest one (plasma > wave > ice > base) sets the shape and each lower beam adds a small accent in its colour. ---- */
  const STY = {
    base: { c0: '#ffd24a', c1: '#fff6a0', dk: '#a8741a', hot: ['#ffffff', '#ffe9a0', '#ffd24a', '#fff6a0'] },
    ice: { c0: '#7ad8ff', c1: '#ffffff', dk: '#2a78c8', hot: ['#ffffff', '#d8f6ff', '#7ad8ff', '#b8ecff'] },
    wave: { c0: '#b878ff', c1: '#f2e0ff', dk: '#6a38b8', hot: ['#ffffff', '#f2e0ff', '#ff7ad8', '#7ae0ff'] },
    plasma: { c0: '#ff7a2a', c1: '#fff6a0', dk: '#a02808', hot: ['#ffffff', '#fff6a0', '#ffb040', '#ff5a20'] },
  };
  const disc = (ctx, x, y, r) => { for (let dy = -r; dy <= r; dy++) { const w = Math.floor(Math.sqrt(r * r + r - dy * dy + 0.25)); ctx.fillRect(x - w, y + dy, 2 * w + 1, 1); } };
  const ringPx = (ctx, x, y, r) => { const n = Math.max(12, r * 6); for (let i = 0; i < n; i++) { const a = i / n * 6.2832; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1); } };
  const arcPx = (ctx, x, y, r, a0, a1) => { const n = Math.max(8, Math.round(r * Math.abs(a1 - a0) * 1.4)); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r), 1, 1); } };
  const flare = (ctx, x, y, L, diag) => {
    ctx.fillRect(x - L, y, 2 * L + 1, 1); ctx.fillRect(x, y - L, 1, 2 * L + 1);
    if (diag) for (let i = 1; i <= diag; i++) { ctx.fillRect(x + i, y + i, 1, 1); ctx.fillRect(x - i, y + i, 1, 1); ctx.fillRect(x + i, y - i, 1, 1); ctx.fillRect(x - i, y - i, 1, 1); }
  };
  const rhombus = (ctx, cx, cy, ux, uy, L, Wd) => {                               /* a diamond with its long axis along (ux, uy) */
    const R = Math.ceil(Math.max(L, Wd)) + 1, x0 = Math.round(cx), y0 = Math.round(cy);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const a = dx * ux + dy * uy, b = -dx * uy + dy * ux; if (Math.abs(a) / L + Math.abs(b) / Wd <= 1) ctx.fillRect(x0 + dx, y0 + dy, 1, 1); }
  };
  const spike = (ctx, x, y, a, l0, l1) => { const c = Math.cos(a), s = Math.sin(a); for (let i = l0; i <= l1; i++) ctx.fillRect(Math.round(x + c * i), Math.round(y + s * i), 1, 1); };
  const snow = (ctx, x, y, a0, l, barbs) => { for (let k = 0; k < 6; k++) { const a = a0 + k * 1.0472; spike(ctx, x, y, a, 1, l); if (barbs) for (const sgn of [-1, 1]) { const bx = x + Math.cos(a) * l * 0.62, by = y + Math.sin(a) * l * 0.62; spike(ctx, bx, by, a + sgn * 0.8, 1, Math.max(1, Math.round(l * 0.3))); } } };
  const ribbon = (ctx, x, y, ux, uy, len, amp, k, ph, th) => { for (let i = 1; i <= len; i++) { const off = amp * Math.sin(i * k + ph) * (1 - i / len * 0.35); ctx.globalAlpha = Math.max(0, 0.9 * (1 - i / len)); ctx.fillRect(Math.round(x - ux * i - uy * off), Math.round(y - uy * i + ux * off), th, th); } ctx.globalAlpha = 1; };
  const tongues = (ctx, x, y, r, n, t, long, st) => {                             /* flickering flame tongues around a point */
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.2832 + t * 0.09 + Math.sin(k * 2.3) * 0.4, fl = 0.55 + 0.45 * Math.sin(t * 0.8 + k * 1.9), L = Math.round((r + long) * fl);
      for (let j = 0; j <= L; j++) { const q = j / Math.max(1, L); ctx.fillStyle = q < 0.4 ? st.c1 : q < 0.75 ? st.c0 : st.dk; ctx.fillRect(Math.round(x + Math.cos(a) * (r * 0.5 + j)), Math.round(y + Math.sin(a) * (r * 0.5 + j)), q < 0.5 ? 2 : 1, q < 0.5 ? 2 : 1); }
    }
  };
  const styleOf = (A) => { const b = A.beams || {}; return b.plasma ? 'plasma' : b.wave ? 'wave' : b.ice ? 'ice' : 'base'; };
  const modsOf = (A, style) => { const b = A.beams || {}, m = []; if (b.ice && style !== 'ice') m.push('ice'); if (b.wave && style !== 'wave') m.push('wave'); return m; };
  /* the small accents a lower beam adds to the shape of the beam on top */
  const accents = (ctx, x, y, r, mods, t, tier) => {
    for (const m of mods) {
      if (m === 'ice') { ctx.fillStyle = '#d8f6ff'; for (let i = 0; i < 3; i++) { const a = -t * 0.12 + i * 2.094; rhombus(ctx, x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4), 1, 0, 2 + tier * 0.5, 1.5); } }
      else if (m === 'wave') { ctx.fillStyle = '#d8b0ff'; ringPx(ctx, x, y, r + 3 + ((t >> 1) % 4)); }
    }
  };
  /* the build-up orb at the muzzle, one per beam type; tier 0 = just started, 1 = partial, 2 = full, 3 = overcharge */
  const ORB = {
    base(ctx, mx, my, tier, f, r, t, st) {
      ctx.fillStyle = tier === 3 ? st.hot[(t >> 1) & 3] : st.c0; disc(ctx, mx, my, r);
      if (r >= 3) { ctx.fillStyle = tier === 3 ? '#ffffff' : st.c1; disc(ctx, mx, my, Math.max(1, r - 2)); }
      if (tier >= 2) {
        ctx.fillStyle = '#ffffff'; disc(ctx, mx, my, tier === 3 ? 3 : 2);
        ctx.fillStyle = st.c1; ctx.globalAlpha = 0.85; flare(ctx, mx, my, r + 3 + ((t >> 1) & 1) * 2, tier === 3 ? r + 2 : 0);
        ctx.globalAlpha = 0.45; ringPx(ctx, mx, my, r + 2 + ((t >> 1) % 7)); ctx.globalAlpha = 1;                        /* pulse rings */
        const k = tier === 3 ? 7 : 3; for (let i = 0; i < k; i++) { const a = t * (tier === 3 ? 0.3 : 0.2) + i * 6.2832 / k; ctx.fillStyle = tier === 3 && (i & 1) ? '#ffffff' : st.c1; ctx.fillRect(Math.round(mx + Math.cos(a) * (r + 5)) - 1, Math.round(my + Math.sin(a) * (r + 5)) - 1, tier === 3 ? 3 : 2, tier === 3 ? 3 : 2); }
      }
    },
    ice(ctx, mx, my, tier, f, r, t, st) {                                                                             /* a crystal: two crossed diamonds inside a snowflake */
      const a = tier >= 2 ? t * 0.035 : 0.4, ux = Math.cos(a), uy = Math.sin(a), L = r + 2, Wd = Math.max(1.2, r * 0.62);
      ctx.fillStyle = tier === 3 ? st.hot[(t >> 2) & 3] : st.c0; rhombus(ctx, mx, my, ux, uy, L, Wd); rhombus(ctx, mx, my, -uy, ux, L, Wd);
      ctx.fillStyle = st.c1; rhombus(ctx, mx, my, ux, uy, L * 0.6, Wd * 0.6); if (tier >= 2) { ctx.fillStyle = '#ffffff'; disc(ctx, mx, my, tier === 3 ? 3 : 2); }
      if (tier >= 1) { ctx.fillStyle = st.c1; ctx.globalAlpha = 0.9; snow(ctx, mx, my, -a * 1.6, r + 3 + tier * 2, tier === 3); ctx.globalAlpha = 1; }
      if (tier >= 2) { const k = tier === 3 ? 6 : 3; for (let i = 0; i < k; i++) { const b = -t * 0.12 + i * 6.2832 / k; ctx.fillStyle = i & 1 ? '#ffffff' : st.c0; rhombus(ctx, mx + Math.cos(b) * (r + 7), my + Math.sin(b) * (r + 7), Math.cos(b + 1.57), Math.sin(b + 1.57), 3, 1.6); } }
    },
    wave(ctx, mx, my, tier, f, r, t, st) {                                                                            /* a core that keeps sending out ripples */
      const span = 12 + tier * 5, nR = 1 + tier;
      for (let i = 0; i < nR; i++) { const q = ((t * 0.32 + i * span / nR) % span) / span; ctx.globalAlpha = 0.9 * (1 - q); ctx.fillStyle = i & 1 ? st.c1 : st.c0; ringPx(ctx, mx, my, Math.round(r + 1 + q * span)); if (tier === 3) { ctx.fillStyle = '#ff7ad8'; ringPx(ctx, mx + 1, my, Math.round(r + 1 + q * span)); ctx.fillStyle = '#7ae0ff'; ringPx(ctx, mx - 1, my, Math.round(r + 1 + q * span)); } }
      ctx.globalAlpha = 1; ctx.fillStyle = tier === 3 ? st.hot[(t >> 1) & 3] : st.c0; disc(ctx, mx, my, r);
      if (r >= 3) { ctx.fillStyle = st.c1; disc(ctx, mx, my, Math.max(1, r - 2)); }
      if (tier >= 2) { ctx.fillStyle = '#ffffff'; disc(ctx, mx, my, tier === 3 ? 3 : 2); const k = tier === 3 ? 6 : 3; for (let i = 0; i < k; i++) { const a = t * 0.22 + i * 6.2832 / k, w = Math.sin(t * 0.4 + i * 2) * 2; ctx.fillStyle = i & 1 ? '#ffffff' : st.c1; ctx.fillRect(Math.round(mx + Math.cos(a) * (r + 5 + w)) - 1, Math.round(my + Math.sin(a) * (r + 5 + w)) - 1, 2, 2); } }
    },
    plasma(ctx, mx, my, tier, f, r, t, st) {                                                                          /* a fireball with licking flames */
      tongues(ctx, mx, my, r, 5 + tier * 2, t, 3 + tier * 3, st);
      ctx.fillStyle = st.dk; ctx.globalAlpha = 0.85; disc(ctx, mx, my, r + 1); ctx.globalAlpha = 1;
      ctx.fillStyle = tier === 3 ? st.hot[3 - ((t >> 1) & 1)] : st.c0; disc(ctx, mx, my, r);
      if (r >= 2) { ctx.fillStyle = '#ffb040'; disc(ctx, mx, my, Math.max(1, r - 1)); }
      if (r >= 3) { ctx.fillStyle = st.c1; disc(ctx, mx, my, Math.max(1, r - 3)); }
      if (tier >= 2) { ctx.fillStyle = '#ffffff'; disc(ctx, mx, my, tier === 3 ? 3 : 2); }
      const nE = 3 + tier * 2; for (let i = 0; i < nE; i++) { const q = ((t * 0.9 + i * 11) % 30) / 30; ctx.globalAlpha = 1 - q; ctx.fillStyle = q < 0.4 ? st.c1 : q < 0.75 ? st.c0 : st.dk; ctx.fillRect(Math.round(mx + Math.sin(i * 3.1 + t * 0.06) * (r + 3)), Math.round(my - r - q * (10 + tier * 6)), 1, 1); }
      ctx.globalAlpha = 1;
    },
  };
  /* the spinflip attack aura, one look per beam: gold star + rings | ice snowflake + shards | wave ripples | plasma fire. back = behind the hero (glow, afterimages, the beam's shape), front = sparks and accents over it */
  R.spinAura = function (ctx, g, p, time, front) {
    const S = G.sprites, sty = styleOf(g.abil), st = STY[sty], mods = modsOf(g.abil, sty), t = Math.floor(time * 60), cx = Math.round(p.x), cy = Math.round(p.y - 22);
    ctx.save();
    if (front) {
      const k = 7; for (let i = 0; i < k; i++) { const a = t * 0.42 + i * 6.2832 / k, d = 20 + Math.sin(t * 0.3 + i) * 2; ctx.fillStyle = i & 1 ? '#ffffff' : st.c1; ctx.fillRect(Math.round(cx + Math.cos(a) * d) - 1, Math.round(cy + Math.sin(a) * d) - 1, 3, 3); }
      accents(ctx, cx, cy, 15, mods, t, 3); ctx.restore(); return;
    }
    const tr = g.spinTrail || [];
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i < tr.length; i++) { const gh = tr[i], fr = gh.fr, c = gh.face >= 0 ? fr.r : fr.l; ctx.globalAlpha = 0.3 * (1 - i / 6); ctx.drawImage(S.whiteOf(c), Math.round(gh.x - (gh.face >= 0 ? fr.ax : fr.axl)), Math.round(gh.y - 22 - fr.ay)); }
    ctx.fillStyle = st.c0; ctx.globalAlpha = 0.2 + 0.07 * Math.sin(t * 0.5); disc(ctx, cx, cy, 23); ctx.globalAlpha = 0.18; disc(ctx, cx, cy, 17);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (sty === 'base') {
      ctx.fillStyle = st.c1; ctx.globalAlpha = 0.7; for (let k = 0; k < 4; k++) spike(ctx, cx, cy, t * 0.1 + k * 0.7854, 13, 25);
      for (let i = 0; i < 2; i++) { const q = ((t * 0.5 + i * 7) % 14) / 14; ctx.globalAlpha = 0.7 * (1 - q); ringPx(ctx, cx, cy, Math.round(15 + q * 13)); }
    } else if (sty === 'ice') {
      ctx.fillStyle = st.c1; ctx.globalAlpha = 0.85; snow(ctx, cx, cy, t * 0.07, 24, true); ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) { const a = -t * 0.2 + i * 1.5708; ctx.fillStyle = i & 1 ? '#ffffff' : st.c0; rhombus(ctx, cx + Math.cos(a) * 19, cy + Math.sin(a) * 19, Math.cos(a + 1.57), Math.sin(a + 1.57), 4, 1.8); }
    } else if (sty === 'wave') {
      for (let i = 0; i < 3; i++) { const q = ((t * 0.55 + i * 9) % 27) / 27; ctx.globalAlpha = 0.9 * (1 - q); ctx.fillStyle = i & 1 ? st.c1 : st.c0; ringPx(ctx, cx, cy, Math.round(14 + q * 26)); ctx.fillStyle = '#ff7ad8'; ringPx(ctx, cx + 1, cy, Math.round(14 + q * 26)); ctx.fillStyle = '#7ae0ff'; ringPx(ctx, cx - 1, cy, Math.round(14 + q * 26)); }
    } else {
      tongues(ctx, cx, cy, 15, 11, t, 13, st);
      for (let i = 0; i < 8; i++) { const q = ((t * 1.1 + i * 5) % 26) / 26; ctx.globalAlpha = 1 - q; ctx.fillStyle = q < 0.35 ? st.c1 : q < 0.7 ? st.c0 : st.dk; ctx.fillRect(Math.round(cx + Math.sin(i * 2.9 + t * 0.1) * 18), Math.round(cy + 10 - q * 40), 1, 1); }
    }
    ctx.restore();
  };
  R.chargeFx = function (ctx, g, p, time) {
    const ch = p.charge; if (!(ch > 0) || p.spinAtk) return;
    const CH = G.weapons.CHARGE, m = G.player.muzzle(p), mx = Math.round(m.x), my = Math.round(m.y), sty = styleOf(g.abil), st = STY[sty], mods = modsOf(g.abil, sty), t = Math.floor(time * 60);
    const tier = ch >= CH.mega ? 3 : ch >= CH.full ? 2 : ch >= CH.min ? 1 : 0, f = Math.min(1, ch / CH.full), pul = Math.sin(t * 0.55);
    ctx.save();
    if (tier >= 2) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = st.c0; ctx.globalAlpha = (tier === 3 ? 0.2 : 0.11) + 0.05 * pul; disc(ctx, Math.round(p.x), Math.round(p.y - 32), 13); disc(ctx, Math.round(p.x), Math.round(p.y - 14), 13); ctx.globalCompositeOperation = 'source-over'; }   /* the hero glows once the shot is ready */
    if (sty === 'base' || sty === 'ice') {                                                                            /* energy (or frost) streaming in toward the muzzle */
      const n = tier === 0 ? 2 : tier === 1 ? 4 : tier === 2 ? 6 : 9, slow = sty === 'ice' ? 28 : 20;
      for (let i = 0; i < n; i++) { const ph = ((t + i * 5) % slow) / slow, a = i * 2.399 + t * 0.07, d = (1 - ph) * (9 + tier * 6); ctx.fillStyle = ph > 0.65 ? st.c1 : st.c0; ctx.globalAlpha = 0.35 + 0.65 * ph; ctx.fillRect(Math.round(mx + Math.cos(a) * d), Math.round(my + Math.sin(a) * d), sty === 'ice' && (i & 1) ? 2 : 1, sty === 'ice' && (i & 1) ? 2 : 1); }
      ctx.globalAlpha = 1;
    }
    const r = tier === 0 ? 1 : tier === 1 ? 2 + Math.round(f * 3) : tier === 2 ? 6 : 9 + (pul > 0 ? 1 : 0);
    if (tier >= 1) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = st.c0; ctx.globalAlpha = 0.16 + 0.05 * tier; disc(ctx, mx, my, r + 3 + tier); ctx.globalAlpha = 0.22; disc(ctx, mx, my, r + 1); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; }
    ORB[sty](ctx, mx, my, tier, f, r, t, st);
    if (tier >= 1) accents(ctx, mx, my, r, mods, t, tier);
    if (tier >= 2 && t % 3 === 0) { ctx.fillStyle = '#ffffff'; let ax = mx, ay = my; const a = Math.random() * 6.28, L = 8 + Math.random() * 8; for (let i = 0; i < L; i++) { ax += Math.cos(a) + (Math.random() - 0.5) * 1.6; ay += Math.sin(a) + (Math.random() - 0.5) * 1.6; ctx.fillRect(Math.round(ax), Math.round(ay), 1, 1); } }    /* arcs */
    for (const th of [CH.full, CH.mega]) if (ch >= th && ch < th + 9) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 1 - (ch - th) / 9; ringPx(ctx, mx, my, 6 + (ch - th) * 3); ringPx(ctx, mx, my, 5 + (ch - th) * 3); ctx.globalAlpha = 1; }   /* a ring bursts out as each level is reached */
    ctx.restore();
  };
  /* the fired shots, one per beam type, tier 1 = partial, 2 = full, 3 = overcharge. Each draws from (x, y) = shot centre along the unit direction (ux, uy) */
  const glow = (ctx, x, y, r, col, a) => { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; ctx.globalAlpha = a; disc(ctx, x, y, r); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; };
  const SHOT = {
    base(ctx, s, st, x, y, ux, uy, t, tier) {
      const nT = tier === 1 ? 5 : tier === 2 ? 8 : 13, gap = tier === 1 ? 2.6 : tier === 2 ? 3 : 3.4;
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = st.c0;
      for (let i = nT; i >= 1; i--) { const k = 1 - i / (nT + 1); ctx.globalAlpha = 0.5 * k; disc(ctx, Math.round(s.x - ux * i * gap), Math.round(s.y - uy * i * gap), Math.max(1, Math.round(s.r * k * 0.95))); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; glow(ctx, x, y, s.r + 3 + tier, st.c0, 0.2 + (tier === 3 ? 0.08 * Math.sin(t * 0.6) : 0));
      ctx.fillStyle = tier === 3 ? st.hot[(t >> 1) & 3] : st.c0; disc(ctx, x, y, s.r); ctx.fillStyle = tier === 3 ? '#ffffff' : st.c1; disc(ctx, x, y, Math.max(1, s.r - 2));
      if (tier >= 2) { ctx.fillStyle = '#ffffff'; disc(ctx, x, y, tier === 3 ? 4 : 2); ctx.fillStyle = st.c1; flare(ctx, x, y, s.r + 3 + (t & 1) * 2, tier === 3 ? s.r + 1 : 0); }
      if (tier >= 2) { ctx.fillStyle = st.c1; for (let i = 1; i <= (tier === 3 ? 4 : 2); i++) { ctx.globalAlpha = 0.5 / i; ringPx(ctx, Math.round(s.x - ux * i * (6 + tier)), Math.round(s.y - uy * i * (6 + tier)), Math.round(s.r * (0.9 + i * 0.12))); } ctx.globalAlpha = 1; }   /* pulse rings left behind */
      if (tier === 3) for (let i = 0; i < 6; i++) { const a = t * 0.34 + i * 1.0472, d = s.r + 4 + Math.sin(t * 0.5 + i) * 1.5; ctx.fillStyle = i & 1 ? '#ffffff' : st.c1; ctx.fillRect(Math.round(x + Math.cos(a) * d) - 1, Math.round(y + Math.sin(a) * d) - 1, 3, 3); }
    },
    ice(ctx, s, st, x, y, ux, uy, t, tier) {
      const L = [0, 5 + s.f * 3, 10, 18][tier], Wd = [0, 2.6 + s.f, 5, 6.8][tier], px = -uy, py = ux;
      const nM = tier === 1 ? 0 : tier === 2 ? 4 : 8;                                                                  /* mist */
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = st.c0;
      for (let i = 1; i <= nM; i++) { ctx.globalAlpha = 0.2 * (1 - i / (nM + 1)); disc(ctx, Math.round(s.x - ux * (L * 0.5 + i * 4)), Math.round(s.y - uy * (L * 0.5 + i * 4)), Math.round(2 + i * 0.7 + tier)); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; glow(ctx, x, y, Math.round(Wd + 3), st.c0, 0.2);
      for (let i = 1; i <= 8 + tier * 2; i++) { const d = L * 0.6 + i * 2.1 + ((t * 0.7 + i * 3) % 3), o = Math.sin(i * 2.4 + t * 0.4) * (1.5 + tier), q = i / (9 + tier * 2); ctx.globalAlpha = 1 - q; ctx.fillStyle = i & 1 ? st.c1 : st.c0; ctx.fillRect(Math.round(s.x - ux * d + px * o), Math.round(s.y - uy * d + py * o + q * 3), 1, 1); }   /* frost dust drifting down behind */
      ctx.globalAlpha = 1;
      if (tier >= 2) { ctx.fillStyle = st.c0; const k = tier === 3 ? 3 : 2; for (let i = 0; i < k; i++) for (const sg of [-1, 1]) rhombus(ctx, s.x - ux * (3 + i * 5) + px * sg * (Wd + 2 + i), s.y - uy * (3 + i * 5) + py * sg * (Wd + 2 + i), ux, uy, 3.2 - i * 0.5, 1.6); }   /* shards flanking the crystal */
      ctx.fillStyle = st.dk; rhombus(ctx, s.x, s.y, ux, uy, L + 1.4, Wd + 1.2); ctx.fillStyle = tier === 3 ? st.hot[(t >> 2) & 3] : st.c0; rhombus(ctx, s.x, s.y, ux, uy, L, Wd);
      ctx.fillStyle = st.c1; rhombus(ctx, s.x, s.y, ux, uy, L * (tier === 3 ? 0.5 : 0.62), Wd * (tier === 3 ? 0.42 : 0.55)); ctx.fillStyle = '#ffffff'; rhombus(ctx, s.x, s.y, ux, uy, L * (tier === 3 ? 0.24 : 0.3), Wd * (tier === 3 ? 0.2 : 0.3));
      if (tier >= 2) { ctx.fillStyle = '#ffffff'; const n = Math.round(L * 1.4); for (let i = -n / 2; i < n / 2; i++) ctx.fillRect(Math.round(s.x + ux * i), Math.round(s.y + uy * i), 1, 1); }
      if (tier === 3) { ctx.fillStyle = st.c1; ctx.globalAlpha = 0.85; snow(ctx, x + Math.round(ux * L * 0.5), y + Math.round(uy * L * 0.5), t * 0.05, 9, true); ctx.globalAlpha = 1; for (let i = 0; i < 6; i++) { const a = -t * 0.18 + i * 1.0472; ctx.fillStyle = i & 1 ? '#ffffff' : st.c0; rhombus(ctx, x + Math.cos(a) * (Wd + 6), y + Math.sin(a) * (Wd + 6), Math.cos(a + 1.57), Math.sin(a + 1.57), 2.6, 1.3); } }
    },
    wave(ctx, s, st, x, y, ux, uy, t, tier) {
      const ang = Math.atan2(uy, ux), ph = -t * 0.55;
      glow(ctx, x, y, s.r + 4, st.c0, 0.2);
      ctx.fillStyle = st.dk; ribbon(ctx, s.x, s.y, ux, uy, [0, 20, 28, 36][tier], [0, 3, 4.5, 6.5][tier], 0.5, ph, 3);                    /* the ribbon the shot leaves in its wake */
      ctx.fillStyle = st.c0; ribbon(ctx, s.x, s.y, ux, uy, [0, 20, 28, 36][tier], [0, 3, 4.5, 6.5][tier], 0.5, ph, 2);
      if (tier >= 2) { ctx.fillStyle = st.c1; ribbon(ctx, s.x, s.y, ux, uy, [0, 0, 28, 36][tier], [0, 0, 4.5, 6.5][tier], 0.5, ph + 3.14, 2); }
      if (tier === 3) { ctx.fillStyle = '#ff7ad8'; ribbon(ctx, s.x + 0, s.y - 1, ux, uy, 30, 6, 0.5, ph + 1.5, 1); ctx.fillStyle = '#7ae0ff'; ribbon(ctx, s.x, s.y + 1, ux, uy, 30, 6, 0.5, ph - 1.5, 1); }
      if (tier === 1) { ctx.fillStyle = st.c0; ringPx(ctx, x, y, s.r); ringPx(ctx, x, y, s.r - 1); ctx.fillStyle = st.c1; disc(ctx, x, y, 1); }
      else {
        ctx.fillStyle = tier === 3 ? st.hot[(t >> 1) & 3] : st.c0; disc(ctx, x, y, s.r - (tier === 3 ? 1 : 1)); ctx.fillStyle = st.c1; disc(ctx, x, y, Math.max(1, s.r - 3)); ctx.fillStyle = '#ffffff'; disc(ctx, x, y, tier === 3 ? 3 : 1);
        ctx.fillStyle = st.c1; ringPx(ctx, x, y, s.r + 1);
      }
      if (tier === 3) for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? '#ffffff' : st.c1; ctx.globalAlpha = 1 - i * 0.28; arcPx(ctx, x, y, s.r + 4 + i * 4 + (t % 4 < 2 ? 1 : 0), ang - 1.0, ang + 1.0); arcPx(ctx, x, y, s.r + 5 + i * 4 + (t % 4 < 2 ? 1 : 0), ang - 0.95, ang + 0.95); } ctx.globalAlpha = 1;   /* crescent wave fronts racing ahead */
      if (tier === 2) { ctx.fillStyle = st.c1; ctx.globalAlpha = 0.7; arcPx(ctx, x, y, s.r + 4, ang - 0.9, ang + 0.9); ctx.globalAlpha = 1; }
    },
    plasma(ctx, s, st, x, y, ux, uy, t, tier) {
      const px = -uy, py = ux, nT = [0, 7, 10, 15][tier];
      glow(ctx, x, y, s.r + 4 + tier, st.c0, 0.22);
      for (let i = nT; i >= 1; i--) { const q = i / nT, o = Math.sin(t * 0.7 + i * 1.7) * (1 + tier * 0.7) * q; ctx.fillStyle = q < 0.3 ? st.c0 : q < 0.65 ? st.dk : '#4a2018'; ctx.globalAlpha = (q < 0.65 ? 0.9 : 0.5) * (1 - q * 0.6); disc(ctx, Math.round(s.x - ux * i * (2.2 + tier * 0.5) + px * o), Math.round(s.y - uy * i * (2.2 + tier * 0.5) + py * o), Math.max(1, Math.round(s.r * (1 - q) * 0.9))); } ctx.globalAlpha = 1;   /* a flickering fire tail that cools to smoke */
      if (tier >= 2) tongues(ctx, x, y, s.r, tier === 3 ? 9 : 6, t, tier === 3 ? 9 : 5, st);
      ctx.fillStyle = st.dk; ctx.globalAlpha = 0.8; disc(ctx, x, y, s.r + (tier === 3 ? 2 : 1)); ctx.globalAlpha = 1;
      ctx.fillStyle = tier === 3 ? st.hot[3 - ((t >> 1) & 1)] : st.c0; disc(ctx, x, y, s.r); ctx.fillStyle = '#ffb040'; disc(ctx, x, y, Math.max(1, s.r - 2)); ctx.fillStyle = st.c1; disc(ctx, x, y, Math.max(1, s.r - 4 + (tier === 1 ? 1 : 0)));
      if (tier >= 2) { ctx.fillStyle = '#ffffff'; disc(ctx, x, y, tier === 3 ? 3 : 1); }
      for (let i = 0; i < 2 + tier * 2; i++) { const q = ((t * 1.1 + i * 7) % 24) / 24, d = s.r + q * (10 + tier * 5), o = Math.sin(i * 4.3 + t * 0.1) * (s.r + 1); ctx.globalAlpha = 1 - q; ctx.fillStyle = q < 0.35 ? st.c1 : q < 0.7 ? st.c0 : st.dk; ctx.fillRect(Math.round(s.x - ux * d + px * o), Math.round(s.y - uy * d + py * o), 1, 1); } ctx.globalAlpha = 1;   /* embers */
    },
  };
  R.chargedShot = function (ctx, s, time) {
    const x = Math.round(s.x), y = Math.round(s.y), sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp, sty = s.style || 'base';
    ctx.save(); SHOT[sty](ctx, s, STY[sty], x, y, ux, uy, s.t, s.tier); accents(ctx, x, y, s.r, s.mods || [], s.t, s.tier); ctx.restore();
  };
  /* the ordinary quick shot, also one look per beam */
  R.plainShot = function (ctx, s) {
    const sty = s.style || 'base', st = STY[sty], sp = Math.hypot(s.vx, s.vy) || 1, ux = s.vx / sp, uy = s.vy / sp, px = -uy, py = ux, t = s.t;
    for (let i = 5; i >= 0; i--) {
      let o = 0; if (sty === 'wave') o = Math.sin(t * 0.7 - i * 0.9) * 1.5;
      const x = Math.round(s.x - ux * i * 1.8 + px * o), y = Math.round(s.y - uy * i * 1.8 + py * o);
      ctx.fillStyle = i === 0 ? st.c1 : sty === 'plasma' && i > 3 ? st.dk : st.c0; ctx.globalAlpha = i > 3 ? 0.55 : 1;
      const big = i === 0 ? 3 : 2; if (sty === 'ice' && i === 0) { ctx.fillRect(x - 1, y - 1, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); } else ctx.fillRect(x - 1, y - 1, big, big);
    }
    ctx.globalAlpha = 1;
    if (sty === 'ice' && t % 2 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(s.x - ux * (4 + t % 6) + px * ((t * 5) % 5 - 2)), Math.round(s.y - uy * (4 + t % 6) + py * ((t * 5) % 5 - 2) + 1), 1, 1); }
    if (sty === 'plasma' && t % 2 === 0) { ctx.fillStyle = t & 2 ? st.c1 : st.c0; ctx.fillRect(Math.round(s.x - ux * (6 + t % 5) + px * ((t * 3) % 5 - 2)), Math.round(s.y - uy * (6 + t % 5) + py * ((t * 3) % 5 - 2) - 1), 1, 1); }
    if (s.mods && s.mods.length) accents(ctx, Math.round(s.x), Math.round(s.y), 1, s.mods, t, 0);
  };
  R.shot = function (ctx, s, time) {
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.kind === 'beam') {
      if (s.tier >= 1) return R.chargedShot(ctx, s, time);
      return R.plainShot(ctx, s);
    } else {
      const sup = s.kind === 'super', dx = s.dx, dy = s.dy;
      ctx.fillStyle = sup ? '#6cf08a' : '#e8ecf8';
      const len = 5; for (let i = 0; i < len; i++) ctx.fillRect(Math.round(s.x - dx * i * 1.2) - 1, Math.round(s.y - dy * i * 1.2) - 1, 3, 3);
      ctx.fillStyle = sup ? '#2a8a4a' : '#ec5c4a'; ctx.fillRect(Math.round(s.x + dx * 3) - 1, Math.round(s.y + dy * 3) - 1, 3, 3);
      ctx.fillStyle = '#ffd24a'; ctx.fillRect(Math.round(s.x - dx * 6) - 1, Math.round(s.y - dy * 6) - 1, 2, 2);
    }
  };
})((window.SGS = window.SGS || {}));
