/* World map screen and the HUD minimap. Rooms cover 30x17-tile cells; visited rooms are lit, map-station rooms are outlined, doors and uncollected items are marked. */
(function (G) {
  'use strict';
  const PX = G.px, M = {};
  G.map = M;
  const DOOR = { blue: '#4cb0ff', red: '#ec5c4a', green: '#4cd2b8', boss: '#efba42', open: '#8ea2d2' };
  const zoneCol = ['#2b4fa4', '#2b4fa4'];
  /* a shrine room has no map cells of its own: it sits at the doorway of its parent room */
  const doorOf = (pd, id) => (pd.doors || []).find((q) => q.id === id);
  const where = (g) => { const rd = g.room.def; if (!rd.parent) return { rd, px: g.P.x, py: g.P.y - 8 }; const pd = G.rooms[rd.parent], dr = doorOf(pd, rd.doors[0].door); return { rd: pd, px: dr.tx * 16 + 8, py: dr.ty * 16 }; };
  const known = (g, id) => g.prog.visited[id] || g.prog.mapped[id];
  /* draw all known rooms at cell size cw x ch with origin (ox, oy); returns nothing */
  M.drawWorld = function (ctx, g, ox, oy, cw, ch, time, detail) {
    const cells = new Map();
    for (const id in G.rooms) { const d = G.rooms[id]; if (!known(g, id)) continue; for (const [x, y] of G.world.cells(d)) cells.set(x + ',' + y, id); }
    for (const [k, id] of cells) {
      const [x, y] = k.split(',').map(Number), vis = g.prog.visited[id], px = ox + x * cw, py = oy + y * ch;
      ctx.fillStyle = vis ? (id === g.roomId ? '#5688dc' : '#2b4fa4') : '#1b2c66'; ctx.fillRect(px, py, cw, ch);
      ctx.fillStyle = vis ? '#a6ccff' : '#2b4fa4';
      const same = (dx, dy) => cells.get((x + dx) + ',' + (y + dy)) === id;
      if (!same(0, -1)) ctx.fillRect(px, py, cw, 1); if (!same(0, 1)) ctx.fillRect(px, py + ch - 1, cw, 1);
      if (!same(-1, 0)) ctx.fillRect(px, py, 1, ch); if (!same(1, 0)) ctx.fillRect(px + cw - 1, py, 1, ch);
    }
    if (!detail) return;
    ctx.fillStyle = '#5a78c8';                                              /* elevator shafts between zones: a dotted line from each lift room down to where it lands */
    for (const id in G.rooms) {
      const d = G.rooms[id]; if (!known(g, id)) continue;
      for (const s of d.stations || []) {
        if (s.type !== 'lift' || s.back || !s.to || !G.rooms[s.to] || !known(g, s.to)) continue;
        const e = G.rooms[s.to], x0 = ox + (d.mx + 0.5) * cw, y0 = oy + (d.my + 1) * ch, x1 = ox + (e.mx + 0.5) * cw, y1 = oy + e.my * ch;
        for (let t = 0; t <= 1; t += 2 / Math.max(4, Math.abs(y1 - y0) + Math.abs(x1 - x0))) ctx.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), 1, 1);
      }
    }
    for (const id in G.rooms) {
      if (!known(g, id)) continue;
      if (G.rooms[id].parent) {
        const sd = G.rooms[id], pd = G.rooms[sd.parent], dr = pd && doorOf(pd, sd.doors[0].door); if (!dr) continue;
        const pw = Math.ceil(pd.map[0].length / 30) * cw, ph = Math.ceil(pd.map.length / 17) * ch;
        for (const it of sd.items || []) if (!g.prog.items[it.id] && g.prog.mapped[id]) { ctx.fillStyle = Math.floor(time * 3) & 1 ? '#fff2a8' : '#efba42'; ctx.fillRect(ox + pd.mx * cw + Math.round(dr.tx / pd.map[0].length * pw) - 1, oy + pd.my * ch + Math.round(dr.ty / pd.map.length * ph) - 1, 3, 3); }
        continue;
      }
      const d = G.rooms[id], w = Math.ceil(d.map[0].length / 30) * cw, h = Math.ceil(d.map.length / 17) * ch, rx = ox + d.mx * cw, ry = oy + d.my * ch;
      for (const dr of d.doors || []) {
        if (dr.color === 'open') continue;
        const live = g.roomId === id && g.doors ? g.doors.find((q) => q.id === dr.id) : null;
        const col = dr.color === 'boss' && G.world.bossBeaten(g, id) ? DOOR.blue : ((g.prog.doors[id + ':' + dr.id] || g.prog.doors[dr.to + ':' + dr.door]) && dr.color !== 'boss' ? DOOR.blue : DOOR[dr.color]);
        const yy = ry + Math.round((dr.ty + 1) / d.map.length * h) - 2, xx = dr.side === 'L' ? rx - 1 : rx + w - 2;
        ctx.fillStyle = col; ctx.fillRect(xx, yy, 3, 5);
      }
      for (const it of d.items || []) if (!g.prog.items[it.id] && g.prog.mapped[id]) { ctx.fillStyle = Math.floor(time * 3) & 1 ? '#fff2a8' : '#efba42'; ctx.fillRect(rx + Math.round(it.tx / d.map[0].length * w) - 1, ry + Math.round(it.ty / d.map.length * h) - 1, 3, 3); }
      for (const s of d.stations || []) { ctx.fillStyle = s.type === 'save' ? '#86f0f2' : s.type === 'map' ? '#b878ff' : '#fff'; ctx.fillRect(rx + Math.round(s.tx / d.map[0].length * w) - 2, ry + Math.round(s.ty / d.map.length * h) - 2, 4, 4); }
    }
    const wh = where(g), rd = wh.rd, cx = ox + (rd.mx + wh.px / 16 / 30) * cw, cy = oy + (rd.my + wh.py / 16 / 17) * ch;
    if (Math.floor(time * 4) & 1) { ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(cx) - 2, Math.round(cy) - 2, 5, 5); ctx.fillStyle = '#ec5c4a'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy) - 1, 3, 3); }
  };
  M.drawScreen = function (ctx, g, time) {
    ctx.fillStyle = 'rgba(6,8,26,0.94)'; ctx.fillRect(0, 0, 480, 270);
    const wp = G.main.warp;
    PX.text(ctx, wp ? 'WARP: ' + G.rooms[wp.list[wp.idx]].name.toUpperCase() : 'MAP', 240, 10, { s: 2, c: wp ? '#86f0f2' : '#a6ccff', o: '#0a0e2c', a: 'c' });
    let cols = 1, rows = 1;
    for (const id in G.rooms) for (const [x, y] of G.world.cells(G.rooms[id])) { cols = Math.max(cols, x + 1); rows = Math.max(rows, y + 1); }
    const cw = Math.min(28, Math.floor(450 / cols)), ch = Math.min(22, Math.floor(170 / rows)), ox = Math.round((480 - cols * cw) / 2), oy = 38;
    ctx.fillStyle = '#10142e'; ctx.fillRect(ox - 4, oy - 4, cols * cw + 8, rows * ch + 8);
    M.drawWorld(ctx, g, ox, oy, cw, ch, time, true);
    if (wp) for (let i = 0; i < wp.list.length; i++) {                      /* warp targets: a ring on every known save pad, the chosen one blinks */
      const id = wp.list[i], d = G.rooms[id], sp = G.world.padSpot(id), w = Math.ceil(d.map[0].length / 30) * cw, h = Math.ceil(d.map.length / 17) * ch;
      const x = ox + d.mx * cw + Math.round(sp.x / 16 / d.map[0].length * w), y = oy + d.my * ch + Math.round(sp.y / 16 / d.map.length * h) - 2, sel = i === wp.idx;
      ctx.fillStyle = sel ? (Math.floor(time * 4) & 1 ? '#ffffff' : '#86f0f2') : '#3c8c9c'; ctx.fillRect(x - (sel ? 3 : 2), y - (sel ? 3 : 2), sel ? 7 : 5, sel ? 7 : 5);
      ctx.fillStyle = '#0a0e2c'; ctx.fillRect(x - 1, y - 1, 3, 3);
    }
    const n = Object.keys(g.prog.items).length, tot = G.world.itemTotal(), ly = oy + rows * ch + 12;
    PX.text(ctx, 'ITEMS ' + n + '/' + tot, 240, ly, { s: 1, c: '#efba42', o: '#0a0e2c', a: 'c' });
    const lg = [['BLUE', DOOR.blue, 'SHOT'], ['RED', DOOR.red, 'MISSILE'], ['GREEN', DOOR.green, 'SUPER'], ['GOLD', DOOR.boss, 'BOSS KEY']];
    lg.forEach((l, i) => { ctx.fillStyle = l[1]; ctx.fillRect(98 + i * 78, ly + 20, 5, 8); PX.text(ctx, l[2], 108 + i * 78, ly + 21, { s: 1, c: '#c8d4f0', o: '#0a0e2c' }); });
    ctx.fillStyle = '#86f0f2'; ctx.fillRect(110, ly + 40, 4, 4); PX.text(ctx, 'SAVE', 120, ly + 39, { s: 1, c: '#c8d4f0', o: '#0a0e2c' });
    ctx.fillStyle = '#b878ff'; ctx.fillRect(170, ly + 40, 4, 4); PX.text(ctx, 'MAP', 180, ly + 39, { s: 1, c: '#c8d4f0', o: '#0a0e2c' });
    ctx.fillStyle = '#efba42'; ctx.fillRect(220, ly + 40, 3, 3); PX.text(ctx, 'ITEM (MAPPED ROOMS)', 230, ly + 39, { s: 1, c: '#c8d4f0', o: '#0a0e2c' });
    PX.text(ctx, wp ? 'LEFT / RIGHT: CHOOSE PAD    JUMP: WARP    M OR ESC: CANCEL' : 'M OR ESC: CLOSE', 240, 25, { s: 1, c: wp ? '#86f0f2' : '#8ea2d2', o: '#0a0e2c', a: 'c' });
  };
  /* minimap in the top-right corner: a window of cells around the current one */
  M.mini = function (ctx, g, time) {
    const wh = where(g), rd = wh.rd, cx = Math.floor(rd.mx + wh.px / 16 / 30), cy = Math.floor(rd.my + wh.py / 16 / 17), cw = 9, ch = 7, W = 7, H = 5, ox = 480 - 4 - W * cw, oy = 4;
    ctx.fillStyle = 'rgba(10,14,44,0.6)'; ctx.fillRect(ox - 2, oy - 2, W * cw + 4, H * ch + 4);
    ctx.save(); ctx.beginPath(); ctx.rect(ox, oy, W * cw, H * ch); ctx.clip();
    M.drawWorld(ctx, g, ox - (cx - 3) * cw, oy - (cy - 2) * ch, cw, ch, time, false);
    if (Math.floor(time * 3) & 1) { ctx.fillStyle = '#fff'; ctx.fillRect(ox + 3 * cw + 3, oy + 2 * ch + 2, 3, 3); }
    ctx.restore();
  };
})((window.SGS = window.SGS || {}));
