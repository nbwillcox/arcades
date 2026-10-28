/* Canvas menus (drawing). */
(function (G) {
  'use strict';
  const PX = G.px, U = G.ui;
  const txt = (ctx, s, x, y, c, a, sz) => PX.text(ctx, s, x, y, { s: sz || 1, c: c || '#dde7fb', o: '#0a0e2c', a });
  const fmtTime = (t) => { t = Math.floor(t); return String(Math.floor(t / 3600)).padStart(2, '0') + ':' + String(Math.floor(t / 60) % 60).padStart(2, '0'); };
  function menu(ctx, list, y0, gap, big) {
    list.forEach((it, i) => {
      const on = i === U.sel, y = y0 + i * gap, sz = big ? 2 : 1, c = it.off ? '#364488' : on ? '#fff2a8' : '#a6ccff';
      U.rects.push({ i, x: 70, y: y - Math.round((gap - (big ? 14 : 8)) / 2), w: 340, h: gap });
      txt(ctx, it.t, 240, y, c, 'c', sz);
      if (on && !it.off) { ctx.fillStyle = '#fff2a8'; ctx.fillRect(240 - Math.round(PX.textW(it.t, sz) / 2) - 12, y + (big ? 4 : 1), 5, 5); }
    });
  }
  /* the title scene: the hero runs in place through a cave of the first zone's own tiles (back wall, pillars, mossy floor, hanging roots), now and then leaping and somersaulting */
  let cave = null, tb = null;
  const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
  function buildCave() {
    const TS = G.sprites.tilesets[1], T = 16, W = 480, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = 270; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
    const [far, fx] = mk(), [near, nx] = mk();
    for (let ty = 0; ty < 17; ty++) for (let tx = 0; tx < 30; tx++) { const h = hash(tx, ty); fx.drawImage(TS.wall[h % 11 === 0 ? 3 : (tx + ty * 2) % 3], tx * T, ty * T); }
    for (const [px, w] of [[40, 22], [168, 30], [296, 22], [408, 30]]) {                         /* dark pillars with a lit edge */
      fx.fillStyle = 'rgba(8,10,30,0.62)'; fx.fillRect(px, 0, w, 270); fx.fillStyle = 'rgba(120,150,190,0.12)'; fx.fillRect(px, 0, 2, 270); fx.fillStyle = 'rgba(4,6,20,0.5)'; fx.fillRect(px + w - 3, 0, 3, 270);
      fx.fillStyle = 'rgba(8,10,30,0.8)'; fx.fillRect(px - 3, 0, w + 6, 6); fx.fillRect(px - 3, 222 - 8, w + 6, 8);
    }
    const place = (x, ty, m) => { for (let tx = 0; tx < 30; tx++) { const h = hash(tx + 11 * ty, ty); x.drawImage(TS.edge[m][h % 3], tx * T, ty * T); } };
    place(nx, 14, 1); place(nx, 15, 0); place(nx, 16, 0); place(nx, 0, 0); place(nx, 1, 4);
    for (let tx = 0; tx < 30; tx++) {
      const h = hash(tx + 154, 14), r = h % 9; if (r < TS.top.length) { const [im, ox, oy] = TS.top[r]; nx.drawImage(im, tx * T + ox, 14 * T - oy); }
      const h2 = hash(tx + 22, 1); if (h2 % 4 === 0) { const [im, ox] = TS.hang[h2 % TS.hang.length]; nx.drawImage(im, tx * T + ox, 2 * T); }
    }
    cave = { far, near };
  }
  function titleBg(ctx, time) {
    if (!cave) buildCave();
    const o = Math.floor(time * 144) % 480, o1 = Math.floor(time * 44) % 480;
    ctx.drawImage(cave.far, -o1, 0); ctx.drawImage(cave.far, 480 - o1, 0);
    ctx.fillStyle = 'rgba(6,8,26,0.45)'; ctx.fillRect(0, 0, 480, 270);
    ctx.drawImage(cave.near, -o, 0); ctx.drawImage(cave.near, 480 - o, 0);
    ctx.fillStyle = 'rgba(4,6,20,0.62)'; ctx.fillRect(0, 240, 480, 30);                                    /* the footer text sits on a darkened floor */
    if (!tb || time < tb.last) tb = { next: time + 1.0 + Math.random() * 1.2, t0: -1, last: time, flip: false, T: 0.8, H: 40 };
    tb.last = time;
    if (tb.t0 < 0 && time >= tb.next) { tb.t0 = time; tb.flip = Math.random() < 0.55; tb.T = tb.flip ? 0.95 : 0.76; tb.H = tb.flip ? 50 : 38; }
    let u = -1; if (tb.t0 >= 0) { u = (time - tb.t0) / tb.T; if (u >= 1) { tb.t0 = -1; tb.next = time + 0.8 + Math.random() * 2.2; u = -1; } }
    const S = G.sprites, up = u >= 0, lift = up ? Math.round(4 * tb.H * u * (1 - u)) : 0, x = 88;
    if (up && tb.flip) { const f = S.hero.cobalt['spin' + (Math.floor(u * 16) & 7)]; ctx.drawImage(f.r, x - f.ax, 224 - lift - 22 - f.ay); }
    else {
      const leg = up ? (u < 0.38 ? 'rise' : u < 0.62 ? 'apex' : 'fall') : 'e' + (Math.floor(time * 24) % 8);
      const f = S.heroPose('cobalt', 'r12', leg, up ? 1 : 2, 0); ctx.drawImage(f.r, x - f.ax, 224 - lift - f.ay);
    }
  }
  function slots(ctx) {
    txt(ctx, U.slotMode === 'cont' ? 'CONTINUE' : 'CHOOSE A SLOT', 240, 50, '#a6ccff', 'c', 2);
    U.items.slots().forEach((it, i) => {
      const y = 96 + i * 36, on = i === U.sel;
      U.rects.push(it.k === 'back' ? { i, x: 170, y: y - 4, w: 140, h: 24 } : { i, x: 80, y, w: 320, h: 30 });
      if (it.k === 'back') { txt(ctx, 'BACK', 240, y + 6, on ? '#fff2a8' : '#8ea2d2', 'c'); return; }
      ctx.fillStyle = on ? '#2b4fa4' : '#141a46'; ctx.fillRect(80, y, 320, 30); ctx.fillStyle = on ? '#a6ccff' : '#364488'; ctx.fillRect(80, y, 320, 1); ctx.fillRect(80, y + 29, 320, 1);
      txt(ctx, 'SLOT ' + (it.n + 1), 90, y + 5, '#fff2a8');
      if (it.rec) { const sm = G.save.summary(it.rec); txt(ctx, sm.place.toUpperCase(), 90, y + 17, '#dde7fb'); txt(ctx, sm.pct + '%   ' + sm.tanks + ' TANKS   ' + fmtTime(sm.time), 390, y + 17, '#a6ccff', 'r'); }
      else txt(ctx, 'EMPTY', 90, y + 17, '#566cac');
    });
    if (U.confirm) { ctx.fillStyle = 'rgba(5,7,26,0.9)'; ctx.fillRect(100, 100, 280, 70); txt(ctx, 'OVERWRITE THIS SAVE?', 240, 112, '#ffb89c', 'c'); txt(ctx, 'NO', 200, 140, !U.confirm.yes ? '#fff2a8' : '#8ea2d2', 'c'); txt(ctx, 'YES', 280, 140, U.confirm.yes ? '#fff2a8' : '#8ea2d2', 'c'); }
  }
  function finalEnding(ctx, time, g) {
    const n = Object.keys(g.prog.items).length, tot = G.world.itemTotal(), pct = Math.round(100 * n / tot), tier = pct >= 90 ? 2 : pct >= 50 ? 1 : 0;
    ctx.fillStyle = '#05071a'; ctx.fillRect(0, 0, 480, 270);
    const sky = ctx.createLinearGradient(0, 0, 0, 160); sky.addColorStop(0, '#0a0e2c'); sky.addColorStop(1, tier === 2 ? '#d86a8a' : tier === 1 ? '#e8802c' : '#566cac'); ctx.fillStyle = sky; ctx.fillRect(0, 0, 480, 170);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = '#fff'; ctx.fillRect((i * 97) % 480, (i * 53) % 110, 1, 1); }
    ctx.fillStyle = '#1b2c66'; ctx.fillRect(0, 170, 480, 100); ctx.fillStyle = '#2b4fa4'; ctx.fillRect(0, 170, 480, 2);
    { const h = G.sprites.hero.cobalt.idle; ctx.drawImage(h.r, 167 - h.ax, 170 - h.ay); }
    const t = Math.floor(time * 2) % 2; ctx.fillStyle = '#e8ecf8'; ctx.fillRect(300, 150 - ((time * 12) % 150), 3, 14); ctx.fillStyle = '#ffd24a'; ctx.fillRect(300, 164 - ((time * 12) % 150), 3, 3 + t);
    txt(ctx, ['MISSION COMPLETE', 'VICTORY', 'PERFECT VICTORY'][tier], 240, 24, '#fff2a8', 'c', 3);
    txt(ctx, ['THE HIVE IS GONE, BUT THE GALAXY KEEPS ITS SECRETS.', 'THE HIVE FALLS SILENT. THE LONG WAY HOME BEGINS.', 'EVERY LAST SECRET RECOVERED. THE SIGNAL FADES, AT PEACE.'][tier], 240, 72, '#dde7fb', 'c');
    txt(ctx, 'ITEMS  ' + n + ' / ' + tot + '  (' + pct + '%)', 240, 184, '#fff2a8', 'c'); txt(ctx, 'TIME  ' + fmtTime(g.playTime) + '    SCORE  ' + G.score.total(g), 240, 198, '#dde7fb', 'c');
    txt(ctx, tier === 2 ? 'ENDING: STARBOUND' : tier === 1 ? 'ENDING: HOMEWARD' : 'ENDING: ADRIFT', 240, 218, '#86f0f2', 'c');
    txt(ctx, 'THANKS FOR PLAYING  -  CC BY-NC 4.0  -  GITHUB.COM/NBWILLCOX/SPACETROID', 240, 240, '#8ea2d2', 'c');
    if (Math.floor(time * 2) % 2) txt(ctx, window.TK && window.TK.on ? 'TAP TO CONTINUE' : 'PRESS JUMP', 240, 256, '#8ea2d2', 'c');
  }
  function ending(ctx, time, g) {
    if (g.room.zone === 5) { finalEnding(ctx, time, g); return; }
    ctx.fillStyle = '#05071a'; ctx.fillRect(0, 0, 480, 270);
    txt(ctx, 'ZONE ' + g.room.zone + ' COMPLETE', 240, 60, '#fff2a8', 'c', 3); txt(ctx, ['', 'THE LIFT DESCENDS INTO THE CRYO VAULTS...', 'HEAT RISES FROM BELOW. THE MAGMA FORGE AWAITS...', '', 'THE HIVE CORE PULSES IN THE DARK BELOW...'][g.room.zone], 240, 100, '#a6ccff', 'c');
    const n = Object.keys(g.prog.items).length, tot = G.world.itemTotal();
    txt(ctx, 'ITEMS  ' + n + ' / ' + tot + '  (' + Math.round(100 * n / tot) + '%)', 240, 140, '#dde7fb', 'c'); txt(ctx, 'TIME  ' + fmtTime(g.playTime), 240, 156, '#dde7fb', 'c');
    txt(ctx, 'TO BE CONTINUED', 240, 196, '#ec5c4a', 'c', 2);
    if (Math.floor(time * 2) % 2) txt(ctx, window.TK && window.TK.on ? 'TAP TO CONTINUE' : 'PRESS JUMP', 240, 240, '#8ea2d2', 'c');
  }
  U.draw = function (ctx, time, g) {
    const m = U.mode; U.rects = []; U.crects = [{ yes: false, x: 150, y: 128, w: 80, h: 28 }, { yes: true, x: 250, y: 128, w: 80, h: 28 }];
    const touch = !!(window.TK && window.TK.on);
    if (m === 'title' || m === 'slots' || ((m === 'options' || m === 'padmap') && U.from === 'title')) titleBg(ctx, time);
    else if (m !== 'end') { ctx.fillStyle = 'rgba(6,8,26,0.84)'; ctx.fillRect(0, 0, 480, 270); }
    if (m === 'title') {
      PX.text(ctx, 'SPACETROID', 240, 48, { s: 5, c: '#fff2a8', o: '#2e1a0c', a: 'c' }); txt(ctx, 'A FREE PIXEL EXPLORATION ADVENTURE', 240, 98, '#a6ccff', 'c');
      if (!G.audio.running() && Math.floor(time * 2) % 2) txt(ctx, touch ? 'TAP FOR SOUND' : 'PRESS ANY KEY OR CLICK FOR SOUND', 240, 232, '#86f0f2', 'c');
      menu(ctx, U.items.title(), 128, 26, true); txt(ctx, 'CC BY-NC 4.0  -  GITHUB.COM/NBWILLCOX/SPACETROID', 240, 254, '#8ea2d2', 'c');
    } else if (m === 'slots') slots(ctx);
    else if (m === 'padmap') { txt(ctx, 'CONTROLLER BUTTONS', 240, 40, '#a6ccff', 'c', 2); menu(ctx, U.items.padmap(), 70, 18, false); txt(ctx, U.cap ? 'PRESS THE NEW BUTTON  -  ESC CANCELS' : 'PICK A ROW, THEN PRESS A BUTTON', 240, 248, '#8ea2d2', 'c'); }
    else if (m === 'options') { txt(ctx, 'OPTIONS', 240, 40, '#a6ccff', 'c', 2); menu(ctx, U.items.options(), 80, 20, false); txt(ctx, touch ? 'TAP A ROW  -  TAP LEFT / RIGHT HALF OF A VOLUME ROW' : 'LEFT / RIGHT CHANGES A VALUE', 240, 248, '#8ea2d2', 'c'); }
    else if (m === 'pause') { txt(ctx, 'PAUSED', 240, 30, '#a6ccff', 'c', 3); menu(ctx, U.items.pause(), 76, 26, true); }
    else if (m === 'help') {
      txt(ctx, 'CONTROLS', 240, 20, '#a6ccff', 'c', 2);
      const rows = [['MOVE', 'ARROWS / WASD', 'STICK / D-PAD'], ['JUMP (AGAIN IN AIR = SPACE JUMP)', 'SPACE / Z / K', 'A'], ['FIRE (HOLD = AUTO)', 'LEFT CLICK / X / J', 'X / RT'], ['AIM', 'MOUSE (360)', 'RIGHT STICK'], ['MISSILE / SUPER (R SWAPS)', 'RIGHT CLICK / C / L', 'B (Y SWAPS)'], ['SPRINT (HOLD)  /  SUPER DASH (TAP)', 'SHIFT / V', 'RB'], ['CROUCH, THEN MORPH BALL', 'S / DOWN (TWICE)', 'STICK DOWN'], ['BOMB / SUPER BOMB (BALL)', 'FIRE / MISSILE', ''], ['GRAPPLE (NEAR CEILING ANCHOR)', 'Q', 'R3 (STICK CLICK)'], ['SCAN VISOR (TOGGLE)', 'F', 'L3 (STICK CLICK)'], ['BEAM TOGGLES', '1 2 3', ''], ['AIM LOCK', 'E', 'LB'], ['MAP / PAUSE', 'M, TAB / P, ESC', 'SELECT / START'], ['STATUS (BEAMS, RAPID / CHARGE)', 'I  (OR PAUSE MENU)', 'PAUSE MENU'], ['SAVE, ELEVATOR, MAP TERMINAL', 'STAND ON IT, PRESS UP', '']];
      if (touch) {                                                       /* on a touch screen the keyboard / gamepad columns are no use: show the touch controls instead */
        const tr = [['MOVE', 'FLOATING STICK ON THE LEFT'], ['JUMP (AGAIN IN AIR = SPACE JUMP)', 'JUMP BUTTON (HOLD = HIGHER)'], ['FIRE (HOLD = CHARGE OR AUTO)', 'FIRE PAD'], ['AIM IN ANY DIRECTION', 'DRAG FROM THE CENTRE OF THE FIRE PAD'], ['MISSILE / SUPER', 'MISSILE BUTTON, SWAP CHANGES TYPE'], ['SPRINT (HOLD)  /  SUPER DASH (TAP)', 'DASH BUTTON'], ['CROUCH, THEN MORPH BALL', 'STICK DOWN (TWICE), OR MORPH'], ['STAND UP FROM THE BALL', 'STICK UP'], ['BOMB / SUPER BOMB (BALL)', 'FIRE PAD / MISSILE BUTTON'], ['GRAPPLE (NEAR CEILING ANCHOR)', 'GRAPPLE BUTTON (HOLD)'], ['SCAN VISOR (TOGGLE)', 'SCAN BUTTON'], ['MAP / STATUS / PAUSE', 'SMALL BUTTONS AT THE TOP'], ['SAVE, ELEVATOR, MAP TERMINAL', 'STAND ON IT, STICK UP'], ['MENUS', 'TAP A ROW, OR THE D-PAD AND A / B']];
        txt(ctx, 'ACTION', 14, 42, '#8ea2d2'); txt(ctx, 'TOUCH', 236, 42, '#8ea2d2');
        tr.forEach((r, i) => { const y = 54 + i * 12; txt(ctx, r[0], 14, y, '#dde7fb'); txt(ctx, r[1], 236, y, '#fff2a8'); });
      } else {
        txt(ctx, 'ACTION', 14, 42, '#8ea2d2'); txt(ctx, 'KEYBOARD + MOUSE', 236, 42, '#8ea2d2'); txt(ctx, 'GAMEPAD', 372, 42, '#8ea2d2');
        rows.forEach((r, i) => { const y = 54 + i * 12; txt(ctx, r[0], 14, y, '#dde7fb'); txt(ctx, r[1], 236, y, '#fff2a8'); txt(ctx, r[2], 372, y, '#86f0f2'); });
      }
      txt(ctx, touch ? 'TAP TO GO BACK' : 'PRESS JUMP OR ESC TO GO BACK', 240, 252, '#8ea2d2', 'c');
    }
    else if (m === 'end') ending(ctx, time, g);
  };
})((window.SGS = window.SGS || {}));
