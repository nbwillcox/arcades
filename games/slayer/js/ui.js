/* immediate-mode canvas UI toolkit + HUD + card rendering. Mouse / touch / keyboard / gamepad navigation. */
(function () {
  var U = CS.U, A = CS.art, In = CS.In, AU = CS.audio, SV = CS.save, W = CS.W, H = CS.H;
  var ui = CS.ui = { btns: [], prev: [], focus: '', ctx: null, lastMx: -1, lastMy: -1, t: 0 };

  ui.begin = function (ctx, dt) {
    ui.ctx = ctx; ui.t += dt; ui.prev = ui.btns; ui.btns = []; ui.act = null; ui.hitX = null;
    var pv = ui.prev, i, b, p = In.p, dir = p.up ? 'up' : p.down ? 'down' : p.left ? 'left' : p.right ? 'right' : null;
    if (In.mx !== ui.lastMx || In.my !== ui.lastMy) { ui.lastMx = In.mx; ui.lastMy = In.my; if (In.lastDev === 'mouse') for (i = 0; i < pv.length; i++) { b = pv[i]; if (!b.dis && In.mx >= b.x && In.mx < b.x + b.w && In.my >= b.y && In.my < b.y + b.h) { ui.focus = b.id; break; } } }
    var cur = null; for (i = 0; i < pv.length; i++) if (pv[i].id === ui.focus) cur = pv[i];
    if (!cur && pv.length) { for (i = 0; i < pv.length; i++) if (!pv[i].dis) { cur = pv[i]; break; } if (cur) ui.focus = cur.id; }
    if (dir && cur) {
      var best = null, bs = 1e9, cx = cur.x + cur.w / 2, cy = cur.y + cur.h / 2;
      for (i = 0; i < pv.length; i++) {
        b = pv[i]; if (b === cur || b.dis) continue; var dx = b.x + b.w / 2 - cx, dy = b.y + b.h / 2 - cy, ok = dir === 'up' ? dy < -4 && Math.abs(dy) >= Math.abs(dx) * 0.5 : dir === 'down' ? dy > 4 && Math.abs(dy) >= Math.abs(dx) * 0.5 : dir === 'left' ? dx < -4 && Math.abs(dx) >= Math.abs(dy) * 0.5 : dx > 4 && Math.abs(dx) >= Math.abs(dy) * 0.5;
        if (!ok) continue; var sc = (dir === 'up' || dir === 'down') ? Math.abs(dy) + Math.abs(dx) * 2 : Math.abs(dx) + Math.abs(dy) * 2; if (sc < bs) { bs = sc; best = b; }
      }
      if (best) { ui.focus = best.id; AU.sfx('move'); }
    }
    ui.confirm = !!p.confirm; ui.taps = In.taps.slice();
  };

  ui.panel = function (x, y, w, h, border, fill, a) {
    var c = ui.ctx; c.globalAlpha = a === undefined ? 0.92 : a; c.fillStyle = fill || '#0a0e1c'; c.fillRect(x, y, w, h); c.globalAlpha = 1;
    c.fillStyle = border || '#27e6ff'; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
    c.fillStyle = A.hex(border && border[0] === '#' && border.length === 7 ? border : '#27e6ff', 0.4); c.fillRect(x + 1, y + 1, w - 2, 1);
  };
  ui.text = function (s, x, y, col, sc, al, sh) { A.text(ui.ctx, s, x, y, col || '#fff', sc || 1, al, sh === undefined ? true : sh); };
  ui.bar = function (x, y, w, h, f, col, bg, bord) {
    var c = ui.ctx; c.fillStyle = bord || '#000'; c.fillRect(x - 1, y - 1, w + 2, h + 2); c.fillStyle = bg || '#1a1f33'; c.fillRect(x, y, w, h); f = U.clamp(f, 0, 1);
    c.fillStyle = col; c.fillRect(x, y, Math.round(w * f), h); c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(x, y, Math.round(w * f), 1);
  };
  ui.wrap = function (s, maxC) {
    var words = ('' + s).toUpperCase().split(' '), lines = [], cur = '';
    words.forEach(function (w) { if ((cur + ' ' + w).trim().length > maxC) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if (cur) lines.push(cur); return lines;
  };
  /* button: returns true when activated this frame */
  ui.btn = function (id, x, y, w, h, label, o) {
    o = o || {}; var c = ui.ctx, foc = ui.focus === id, dis = !!o.dis, col = o.c || '#27e6ff', hit = false, i;
    ui.btns.push({ id: id, x: x, y: y, w: w, h: h, dis: dis });
    var sl = In.lastDev === 'touch' ? 5 : 0;
    for (i = 0; i < ui.taps.length; i++) { var t = ui.taps[i]; if (t.x >= x - sl && t.x < x + w + sl && t.y >= y - sl && t.y < y + h + sl) { hit = true; ui.focus = id; ui.hitX = t.x; } }
    if (foc && ui.confirm) hit = true;
    var fill = dis ? '#10131f' : foc ? A.hex(col, 0.32) : '#0a0e1c';
    ui.panel(x, y, w, h, dis ? '#3a4058' : foc ? '#ffffff' : A.hex(col, 0.75), fill, 0.95);
    if (foc && !dis) { c.fillStyle = col; c.fillRect(x + 1, y + 1, 3, h - 2); c.fillRect(x + w - 4, y + 1, 3, h - 2); }
    var sc = o.sc || 1;
    if (label) { var ty = o.sub ? y + (h >> 1) - 9 * sc : y + ((h - 7 * sc) >> 1); ui.text(label, x + (o.left ? 10 : w >> 1), ty, dis ? '#667' : foc ? '#fff' : (o.tc || '#dff'), sc, o.left ? 'left' : 'center'); }
    if (o.sub) ui.text(o.sub, x + (o.left ? 10 : w >> 1), y + (h >> 1) + 3, dis ? '#556' : (o.sc2 || '#8fb4d0'), 1, o.left ? 'left' : 'center');
    if (hit && !dis) { AU.sfx('click'); return true; }
    if (hit && dis) { AU.sfx('deny'); }
    return false;
  };

  /* ---------- backdrop for menus ---------- */
  ui.backdrop = function (ctx, pal) {
    pal = pal || ['#070a16', '#142040', '#27e6ff'];
    ctx.fillStyle = pal[0]; ctx.fillRect(0, 0, W, H); var t = ui.t * 24, i;
    ctx.fillStyle = pal[1]; for (i = 0; i < W; i += 48) ctx.fillRect(i, 0, 1, H); for (i = -((t % 48) | 0); i < H; i += 48) ctx.fillRect(0, i, W, 1);
    ctx.globalAlpha = 0.5; ctx.fillStyle = pal[2]; for (i = 0; i < 40; i++) { var x = (i * 97 + Math.floor(t * (0.3 + (i % 5) * 0.12))) % W, y = (i * 53) % H; ctx.fillRect(x, y, 2, 2); } ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; for (i = 0; i < H; i += 4) ctx.fillRect(0, i, W, 1);
  };
  ui.title = function (s, y, col, sc) { ui.text(s, W >> 1, y, col || '#27e6ff', sc || 3, 'center'); };
  ui.link = function (id, x, y, w, label, url) { if (ui.btn(id, x, y, w, 20, label, { c: '#7a8aa8', tc: '#9fb4d0' })) window.open(url, '_blank', 'noopener'); };

  /* ---------- upgrade card ---------- */
  ui.card = function (card, x, y, w, h, id, o) {
    o = o || {}; var c = ui.ctx, R = CS.RAR[card.rar], info = CS.WP.cardInfo(card), foc = ui.focus === id, hit = false, i;
    if (id) { ui.btns.push({ id: id, x: x, y: y, w: w, h: h, dis: false }); for (i = 0; i < ui.taps.length; i++) { var t = ui.taps[i]; if (t.x >= x && t.x < x + w && t.y >= y && t.y < y + h) { hit = true; ui.focus = id; } } if (foc && ui.confirm) hit = true; }
    var glow = card.rar >= 3 ? 0.5 + 0.5 * Math.sin(ui.t * 6) : 0;
    if (info.awak) { var ga = 0.2 + 0.1 * Math.sin(ui.t * 3), gc = info.c || '#ffe44d'; for (i = 1; i <= 5; i++) { c.globalAlpha = ga / i; c.fillStyle = gc; c.fillRect(x - i * 3, y - i * 3, w + i * 6, h + i * 6); } c.globalAlpha = 1; }
    ui.panel(x, y, w, h, R.c, foc ? A.hex(R.c, 0.3) : '#0a0e1c', 0.97);
    c.fillStyle = R.c; c.fillRect(x, y, w, 3); c.fillRect(x + 1, y + h - 3, w - 2, 2); if (foc || glow) { c.globalAlpha = foc ? 0.9 : glow * 0.7; c.strokeStyle = R.t; c.lineWidth = 2; c.strokeRect(x + 2, y + 2, w - 4, h - 4); c.globalAlpha = 1; }
    ui.text(R.n, x + w / 2, y + 9, R.t, 1, 'center');
    if (card.kind === 'item') { c.fillStyle = '#05070f'; c.fillRect(x + w / 2 - 28, y + 22, 56, 56); c.fillStyle = R.c; c.fillRect(x + w / 2 - 29, y + 21, 58, 1); c.fillRect(x + w / 2 - 29, y + 78, 58, 1); c.fillRect(x + w / 2 - 29, y + 21, 1, 58); c.fillRect(x + w / 2 + 28, y + 21, 1, 58); if (info.awak) { var rg = c.createRadialGradient(x + w / 2, y + 50, 4, x + w / 2, y + 50, 46); rg.addColorStop(0, 'rgba(255,255,255,' + (0.35 + 0.15 * Math.sin(ui.t * 4)) + ')'); rg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rg; c.fillRect(x + w / 2 - 46, y + 4, 92, 92); } A.drawIcon(c, card.id, x + w / 2 - 24, y + 26, 2); }
    else { c.fillStyle = info.c; c.fillRect(x + w / 2 - 20, y + 34, 40, 32); }
    var ny = y + 86, nl = ui.wrap(info.name, Math.floor((w - 12) / 6)); nl.forEach(function (l, i) { ui.text(l, x + w / 2, ny + i * 10, '#fff', 1, 'center'); }); ny += nl.length * 10 + 4;
    ui.text(info.lv, x + w / 2, ny, info.awak ? '#ffe44d' : '#7df3ff', 1, 'center'); ny += 14;
    ui.wrap(info.desc, Math.floor((w - 16) / 6)).forEach(function (l, i) { ui.text(l, x + 8, ny + i * 9, '#b8c4dc', 1, 'left', false); }); ny += ui.wrap(info.desc, Math.floor((w - 16) / 6)).length * 9 + 5;
    if (info.bonus) { ui.text('+BONUS', x + w / 2, ny, '#ffd700', 1, 'center'); ui.wrap(info.bonus, Math.floor((w - 16) / 6)).forEach(function (l, i) { ui.text(l, x + w / 2, ny + 10 + i * 9, '#ffe44d', 1, 'center'); }); }
    if (card.kind === 'item' && !card.isNew) ui.text(CS.ITEMS[card.id].cls ? 'CLASS EXCLUSIVE' : CS.ITEMS[card.id].cat.toUpperCase(), x + w / 2, y + h - 12, CS.ITEMS[card.id].cls ? '#ffd700' : '#5a6a88', 1, 'center');
    else if (card.isNew) ui.text(CS.ITEMS[card.id].cls ? 'NEW - CLASS EXCLUSIVE' : 'NEW', x + w / 2, y + h - 12, '#5cff8a', 1, 'center');
    if (hit) { AU.sfx('click'); return true; } return false;
  };

  /* controller / keyboard prompts along the bottom edge */
  ui.hints = function (kind) {
    if (In.lastDev === 'touch') return; var pad = In.lastDev === 'pad', pb = In.padb || In.DEF_PAD, kb = In.keyb || In.DEF_KEYS, s;
    function pn(a) { return In.PAD_NAMES[pb[a]] || '?'; }
    if (pad) s = pn('confirm') + ' SELECT   ' + pn('back') + ' BACK' + (kind === 'draft' ? '   ' + pn('reroll') + ' REROLL   LB/RB PICK 1/3' : '');
    else s = In.keyName(kb.confirm[0]) + ' SELECT   ' + In.keyName(kb.back[0] || 'Escape') + ' BACK' + (kind === 'draft' ? '   ' + In.keyName(kb.reroll[0]) + ' REROLL   1/2/3 PICK' : '');
    ui.text(s, W >> 1, H - 11, '#5a6a88', 1, 'center', false);
  };

  /* ---------- combat HUD ---------- */
  ui.hud = function (ctx) {
    var G = CS.G, p = G.p, i, id, it, X;
    // XP bar (instant)
    var f = p.xp / p.need; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, 9); ctx.fillStyle = '#10243a'; ctx.fillRect(1, 1, W - 2, 7); ctx.fillStyle = '#27e6ff'; ctx.fillRect(1, 1, Math.round((W - 2) * f), 7); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(1, 1, Math.round((W - 2) * f), 2);
    CS.fx.xpTarget.x = Math.max(8, Math.round((W - 2) * f)); CS.fx.xpTarget.y = 5;
    ui.text('LV ' + p.lv, 6, 12, '#7df3ff', 1);
    // HP + shield
    ui.bar(8, 26, 170, 12, p.hp / p.maxHp, p.hp < p.maxHp * 0.3 ? '#ff3b4a' : '#e8344e', '#2a0c14'); ui.text(Math.ceil(p.hp) + '/' + p.maxHp, 12, 29, '#fff', 1);
    ui.bar(8, 43, 170, 7, p.shieldMax > 0 ? p.shield / p.shieldMax : 0, '#48a8ff', '#0c1830'); if (p.shieldMax > 0) ui.text('SHIELD ' + Math.ceil(p.shield), 12, 52, '#9fd0ff', 1, 'left', true);
    if (p.holy > 0) ui.bar(8, 43, 170, 3, p.holy / (p.maxHp * 0.35), '#ffe44d', 'rgba(0,0,0,0)');
    var dr = 1 - U.clamp(p.mdCd / p.mdMax, 0, 1); ui.bar(8, 55, 70, 4, dr, dr >= 1 ? '#9fefff' : '#4a6a88', '#0c1830'); ui.text(dr >= 1 ? 'DASH READY' : 'DASH', 82, 54, dr >= 1 ? '#9fefff' : '#5a6a88', 1, 'left', false);
    // top right: gold / kills / minions
    ui.text(U.num(p.gold) + ' G', W - 8, 14, '#ffd700', 2, 'right'); ui.text('KILLS ' + G.stats.kills, W - 8, 34, '#c9d6ff', 1, 'right'); var fz = p.items.fusion ? CS.WP.fusionInfo(p.items.fusion) : null; ui.text('MINIONS ' + G.mn.n + '/' + CS.WP.minionCap() + (fz ? '  GIANTS ' + fz.giants + '/' + fz.maxG : ''), W - 8, 46, '#ffb347', 1, 'right'); if (fz) ui.text(fz.giants >= fz.maxG ? 'FUSION: GIANT ACTIVE' : 'FUSION IN ' + Math.max(0, Math.ceil(fz.interval - p.items.fusion.t)) + 'S', W - 8, 58, '#ff4fd8', 1, 'right');
    // timer
    var left = G.dur - G.t; ui.text(G.stageBoss ? 'SECTOR BOSS' : U.fmt(G.t), W >> 1, 14, G.stageBoss ? '#ff4a4a' : '#fff', 2, 'center'); if (!G.stageBoss) ui.text('BOSS AT ' + U.fmt(G.dur), W >> 1, 32, '#7a8aa8', 1, 'center');
    // boss bar
    var b = G.bossOn; if (b && !b.dead) { var bw = 340, bx = (W - bw) >> 1; ui.bar(bx, 52, bw, 9, b.hp / b.mhp, b.mid ? '#ff7a3a' : '#ff2a5a', '#2a0c14'); ui.text(b.name, W >> 1, 64, '#ffd7d7', 1, 'center'); }
    // item grid (weapons row + defense row)
    var off = [], def = []; p.order.forEach(function (id) { (CS.ITEMS[id].cat === 'defense' ? def : off).push(id); });
    function row(list, y) { list.forEach(function (id, i) { var it = p.items[id], x = 8 + i * 27, R = CS.RAR[it.rar]; if (it.lv >= 5) { var gl = it.lv >= 10 ? '#ffd700' : CS.ITEMS[id].c, ga = (it.lv >= 10 ? 0.4 : 0.28) + 0.12 * Math.sin(G.t * 3 + i); for (var q = 1; q <= 3; q++) { ctx.globalAlpha = ga / q; ctx.fillStyle = gl; ctx.fillRect(x - 1 - q * 2, y - 1 - q * 2, 26 + q * 4, 26 + q * 4); } ctx.globalAlpha = 1; } ctx.fillStyle = R.c; ctx.fillRect(x - 1, y - 1, 26, 26); ctx.fillStyle = '#000'; ctx.fillRect(x, y, 24, 24); A.drawIcon(ctx, id, x, y, 1); ui.text('' + it.lv, x + 23, y + 17, it.lv >= 10 ? '#ffd700' : '#fff', 1, 'right'); if (id === 'fusion') { var fi = CS.WP.fusionInfo(it), full = fi.giants >= fi.maxG; ctx.fillStyle = '#000'; ctx.fillRect(x, y + 25, 24, 6); ctx.fillStyle = full ? '#ffd700' : '#ff4fd8'; ctx.fillRect(x, y + 26, full ? 24 : Math.round(24 * Math.min(1, it.t / fi.interval)), 4); } if (it.lv >= 10) { ctx.fillStyle = '#ffd700'; ctx.fillRect(x, y, 24, 1); } }); }
    row(off, H - 62); row(def, H - 34);
    ui.text('WEAPONS & MINIONS', 8, H - 72, '#5a6a88', 1); ui.text('DEFENSE', 8, H - 44, '#5a6a88', 1, 'left', false);
    // banner
    if (G.banner) { var bn = G.banner, a = Math.min(1, bn.t * 2); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(0, 100, W, 56); ui.text(bn.text, W >> 1, 108, bn.c, 3, 'center'); if (bn.sub) ui.text(bn.sub, W >> 1, 138, '#fff', 1, 'center'); ctx.globalAlpha = 1; }
    if (G.sirenT > 0 && CS.save.d.set.flash !== false) { ctx.fillStyle = 'rgba(255,0,0,' + (0.12 * (0.5 + 0.5 * Math.sin(G.t * 12))) + ')'; ctx.fillRect(0, 0, W, H); }
    if (p.magnetT > 0) ui.text('MAGNET ' + Math.ceil(p.magnetT), W >> 1, 74, '#ff5a7a', 1, 'center');
    if (p.staticT > 0) ui.text('STATIC INTERFERENCE', W >> 1, 84, '#d48bff', 1, 'center');
    // pause icon for touch
    if (In.touch || In.lastDev === 'touch') { var dcx = W - 56, dcy = H - 62, rdy = p.mdCd <= 0; ctx.fillStyle = rdy ? 'rgba(40,120,160,.55)' : 'rgba(10,14,28,.55)'; ctx.beginPath(); ctx.arc(dcx, dcy, 34, 0, 6.283); ctx.fill(); ctx.strokeStyle = rdy ? '#9fefff' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 2; ctx.stroke(); ui.text('DASH', dcx, dcy - 3, '#fff', 1, 'center'); }
    if (In.touch || In.lastDev === 'touch') { ctx.fillStyle = 'rgba(10,14,28,.6)'; ctx.fillRect(W - 50, 58, 40, 40); ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1; ctx.strokeRect(W - 49.5, 58.5, 39, 39); ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(W - 39, 68, 6, 20); ctx.fillRect(W - 27, 68, 6, 20); if (CS.save.d.set.stick === 'fixed' && !In.joy.on) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(In.fixedBase.x, In.fixedBase.y, 45, 0, 6.283); ctx.stroke(); } }
    var j = In.joy; if (j.on) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(j.ox, j.oy, 45, 0, 6.283); ctx.stroke(); ctx.fillStyle = 'rgba(255,255,255,.4)'; var l = Math.min(45, Math.hypot(j.x, j.y)), an = Math.atan2(j.y, j.x); ctx.beginPath(); ctx.arc(j.ox + Math.cos(an) * l, j.oy + Math.sin(an) * l, 14, 0, 6.283); ctx.fill(); }
    if (CS.fx.flash > 0 && CS.save.d.set.flash !== false) { ctx.globalAlpha = Math.min(0.5, CS.fx.flash * 3); ctx.fillStyle = CS.fx.flashC; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    if (p.hp < p.maxHp * 0.25 && CS.save.d.set.flash !== false) { ctx.fillStyle = 'rgba(255,0,30,' + (0.1 + 0.07 * Math.sin(G.t * 8)) + ')'; ctx.fillRect(0, 0, W, 6); ctx.fillRect(0, H - 6, W, 6); ctx.fillRect(0, 0, 6, H); ctx.fillRect(W - 6, 0, 6, H); }
  };
})();
