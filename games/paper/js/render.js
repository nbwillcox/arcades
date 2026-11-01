/* Scene assembly (depth-sorted), HUD and full-screen overlays (newspaper, tallies, banners). */
(function (G) {
  'use strict';
  const C = G.C, g = G.gfx, S = G.settings, Sp = G.sprites, U = G.U;
  const Game = G.game, P = Game.p;
  const R_ = {};
  const items = [];
  let ctx = null, time = 0;
  const HEAD = ['MOON LIGHTS OUT: RESIDENTS DEMAND NIGHT-LIGHT', 'CAT BEATS MAYOR IN COSMIC ELECTION', 'UFO PARKING TICKETS ISSUED TO CLOUD', 'METEOR SHOWER FORECAST: BRING AN UMBRELLA', 'LOCAL ROBO-DOG DEMANDS BETTER BONES', 'GNOME CONVENTION CAUSES TRAFFIC JAM', 'GIANT MOWER SPOTTED: LAWNS PANIC!'];

  function push(k, t, o) { items.push({ k, t, o }); }
  function onScreen(x, z, y) { g.pr(x, z, y || 0); return g.X > -140 && g.X < 1100 && g.Y > -220 && g.Y < 720; }

  R_.scene = function (c, t) {
    ctx = c; time = t; Sp.setCtx(c);
    const R = Game.route; if (!R) return;
    const cam = Game.cam;
    cam.z += ((P.z + 38) - cam.z) * Math.min(1, 0.25);
    cam.x += ((P.x * 0.45) - cam.x) * 0.12;
    g.camX = cam.x; g.camZ = cam.z;
    const sk = Game.fx.shake * (S.shake && !S.reduced ? 1 : 0);
    g.shx = sk ? (Math.random() - 0.5) * sk : 0; g.shy = sk ? (Math.random() - 0.5) * sk : 0;
    const zA = cam.z - 150, zB = cam.z + 560;
    g.backdrop(t);
    g.ground(R, zA, zB, t);
    /* ground decals */
    for (const h of R.houses) { if (h.z1 < zA) continue; if (h.z0 > zB) break; Sp.houseGround(h, t); }
    for (const o of R.deco) { if (o.z > zB) break; if ((o.z < zA && !(o.z1 > zA)) || o.dead) continue; if (o.t === 'pothole' || o.t === 'sprinkler') Sp.deco(o, t); }
    for (const h of Game.haz) { if (h.t === 'meteor' || h.t === 'bone' || h.t === 'parcel' || h.t === 'clip') { /* warning rings are in the sprite */ } }
    if (S.guide && (Game.phase === 'ride' || Game.phase === 'course' || Game.phase === 'boss') && P.crash <= 0) guide();
    /* depth-sorted items */
    items.length = 0;
    for (const h of R.houses) { if (h.z1 < zA - 20) continue; if (h.z0 > zB) break; push(g.key(h.side * C.WALL, h.z0 + 8), 'house', h); push(g.key(h.mailbox.x, h.mailbox.z), 'mail', h); }
    for (const o of R.deco) { if (o.z > zB) break; if ((o.z < zA && !(o.z1 > zA)) || o.dead || o.t === 'pothole' || o.t === 'sprinkler' || o.t === 'crossroad') continue; push(g.key(o.x, o.z), 'deco', o); }
    for (const k of R.pickups) if (!k.taken && k.z > zA && k.z < zB) push(g.key(k.x, k.z), 'pick', k);
    for (const d of R.dogs) if (!d.dead && d.z > zA && d.z < zB) push(g.key(d.x, d.z), 'dog', d);
    for (const m of R.movers) if (!m.dead && m.z > zA && m.z < zB) push(g.key(m.x, m.z), 'mover', m);
    for (const u of R.ufos) if (!u.dead && u.z > zA && u.z < zB) push(g.key(u.x, u.z) + 0.01, 'ufo', u);
    for (const c2 of Game.cars) push(g.key(c2.x, c2.z), 'car', c2);
    for (const p of Game.papersL) push(g.key(p.x, p.z) + 0.5, 'paper', p);
    for (const h of Game.haz) push(g.key(h.x || 0, h.z || 0), 'haz', h);
    if (Game.boss) push(g.key(Game.boss.x, Game.boss.z), 'boss', Game.boss);
    push(g.key(P.x, P.z) + 0.2, 'player', P);
    items.sort((a, b) => a.k - b.k);
    for (const it of items) {
      const o = it.o;
      switch (it.t) {
        case 'house': Sp.house(o, t); break; case 'mail': Sp.mailbox(o, t); break; case 'deco': Sp.deco(o, t); break;
        case 'pick': Sp.pickup(o, t); break; case 'dog': Sp.dog(o, t); break; case 'mover': Sp.mover(o, t); break;
        case 'ufo': Sp.ufo(o, t); break; case 'car': Sp.car(o, t); break; case 'paper': Sp.paper(o, t); break;
        case 'haz': Sp.haz(o, t); break; case 'boss': Sp.boss(o, t); break; case 'player': Sp.player(o, t, Game); break;
      }
    }
    /* particles + popups on top */
    for (const p of Game.fx.parts) { g.pr(p.x, p.z, p.y); const a = 1 - p.t / p.life; ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.fillRect(g.X - p.sz / 2, g.Y - p.sz / 2, p.sz, p.sz); }
    ctx.globalAlpha = 1;
    for (const p of Game.fx.pops) { g.pr(p.x, p.z, p.y + p.t * 28); ctx.globalAlpha = Math.min(1, (1.4 - p.t) * 2); g.text(p.txt, g.X, g.Y, 17, p.col, 'center'); }
    ctx.globalAlpha = 1;
    if (Game.fx.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.7, Game.fx.flash).toFixed(2) + ')'; ctx.fillRect(0, 0, C.W, C.H); }
    g.shx = g.shy = 0;
  };

  /* where would a paper land if thrown now? */
  function guide() {
    const y0 = 14 + P.y, vy = C.TVY + P.y * 0.2, tl = (vy + Math.sqrt(vy * vy + 2 * C.G * y0)) / C.G;
    for (const side of [-1, 1]) {
      const lx = P.x + side * C.TV * tl, lz = P.z + P.speed * tl;
      const wall = side * C.WALL; const hitsWall = Math.abs(lx) > C.WALL;
      void wall; void hitsWall;
      g.ring(Math.max(-C.WALL + 2, Math.min(C.WALL - 2, lx)), lz, 0, 6, 'rgba(255,255,255,0.8)', 2, 0.55 + 0.25 * Math.sin(time * 8));
      g.pr(lx, lz, 0); const X = g.X, Y = g.Y;
      if (Math.abs(lx) <= C.WALL) { ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(X - 1, Y - 1, 2, 2); }
    }
  }

  /* ---------------- HUD ---------------- */
  const panel = (x, y, w, h, a) => { ctx.fillStyle = 'rgba(10,5,36,' + (a || 0.62) + ')'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill(); ctx.strokeStyle = 'rgba(160,140,255,0.45)'; ctx.lineWidth = 1.5; ctx.stroke(); };
  function houseIcon(x, y, col) { ctx.fillStyle = col; ctx.strokeStyle = 'rgba(10,5,30,0.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 7, y + 6); ctx.lineTo(x - 7, y - 1); ctx.lineTo(x, y - 8); ctx.lineTo(x + 7, y - 1); ctx.lineTo(x + 7, y + 6); ctx.closePath(); ctx.fill(); ctx.stroke(); }

  R_.hud = function (c, t) {
    ctx = c; time = t;
    const R = Game.route, ph = Game.phase; if (!R) return;
    if (ph === 'idle' || ph === 'over') return;
    /* score */
    panel(10, 10, 190, 50);
    g.text(U.fmt(Game.score), 22, 29, 25, '#fff'); ctx.font = '800 11px sans-serif';
    g.text(Game.mult() > 1 ? 'COMBO x' + Game.mult() : 'SCORE', 22, 49, 11, Game.mult() > 1 ? '#ffe45a' : '#a79bd8', 'left', false);
    /* lives */
    for (let i = 0; i < Math.min(Game.lives, 7); i++) { ctx.beginPath(); ctx.arc(32 + i * 20, 76, 7, 0, 6.2832); ctx.fillStyle = '#ffd0a8'; ctx.fill(); ctx.strokeStyle = 'rgba(10,5,30,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.fillStyle = '#e03a3a'; ctx.beginPath(); ctx.arc(32 + i * 20, 74, 7, Math.PI, 0); ctx.fill(); ctx.stroke(); }
    /* papers */
    panel(C.W - 150, 10, 140, 50);
    ctx.save(); ctx.translate(C.W - 128, 35); ctx.rotate(-0.5); ctx.fillStyle = '#f7f1dc'; ctx.strokeStyle = 'rgba(10,5,30,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.roundRect(-14, -6, 28, 12, 4); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#d33'; ctx.fillRect(-3, -6, 5, 12); ctx.restore();
    g.text(P.pw.inf > 0 ? '∞' : String(P.papers), C.W - 18, 33, 30, P.pw.inf > 0 ? '#7dff9e' : P.papers <= 3 ? '#ff7a6a' : '#fff', 'right');
    /* power-up timers */
    let py = 100;
    for (const k in P.pw) if (P.pw[k] > 0) { const pw = G.POWER[k], max = { speed: 8, double: 12, omni: 12, shield: 10, inf: 12 }[k]; panel(10, py, 150, 22, 0.55); ctx.fillStyle = pw.col; ctx.globalAlpha = 0.85; ctx.fillRect(14, py + 4, 142 * Math.min(1, P.pw[k] / max), 14); ctx.globalAlpha = 1; g.text(pw.name, 18, py + 11, 11, '#fff', 'left'); py += 26; }
    /* centre: day + subscribers / course / boss */
    const cx = C.W / 2;
    if (R.kind === 'route') {
      const subs = R.houses.filter((h) => h.sub), n = subs.length, wd = Math.min(280, n * 18 + 20);
      panel(cx - wd / 2, 8, wd, 44, 0.6);
      subs.forEach((h, i) => houseIcon(cx - wd / 2 + 19 + i * 18 + (wd - 20 - n * 18) / 2, 26, h.cancelled ? '#ff5a5a' : h.delivered ? '#7dff9e' : '#ffe45a'));
      g.text(C.DAYS[Game.day - 1] + '  ·  WEEK ' + Game.week, cx, 44, 11, '#cdbfff', 'center', false);
      const prog = U.clamp(P.z / R.end, 0, 1); ctx.fillStyle = 'rgba(10,5,36,0.6)'; ctx.fillRect(cx - 120, 56, 240, 5); ctx.fillStyle = '#7dffff'; ctx.fillRect(cx - 120, 56, 240 * prog, 5);
    } else if (R.kind === 'course') {
      panel(cx - 130, 8, 260, 36, 0.6); const cs = Game.cs; g.text('HOVER ACADEMY   TARGETS ' + cs.targets + '/' + R.targets + '   HOOPS ' + cs.hoops + '/' + R.hoops, cx, 26, 13, '#fff', 'center', false);
    } else if (R.kind === 'boss' && Game.boss) {
      const b = Game.boss; panel(cx - 170, 8, 340, 42, 0.62);
      g.text(G.boss.NAMES[b.type], cx, 21, 15, '#ffe45a', 'center', false);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(cx - 150, 33, 300, 11); ctx.fillStyle = b.shield ? '#6ad0ff' : b.weak ? '#ffe45a' : '#ff4a5a'; ctx.fillRect(cx - 150, 33, 300 * Math.max(0, b.hp) / b.max, 11);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 150, 33, 300, 11);
    }
    if (ph === 'ride' && Game.t < 1.4) { ctx.globalAlpha = Math.max(0, 1 - Game.t / 1.4); g.text(Game.t < 0.8 ? 'GET READY' : 'GO!', cx, 240, 54, '#fff', 'center'); ctx.globalAlpha = 1; }
    if (P.crash > 0 && ph !== 'dead') { ctx.fillStyle = 'rgba(255,40,40,' + Math.min(0.28, P.crash * 0.2).toFixed(2) + ')'; ctx.fillRect(0, 0, C.W, C.H); }
    if (Game.bot) g.text('AUTOPILOT', cx, 520, 12, '#7dffff', 'center', false);
  };

  /* ---------------- overlays ---------------- */
  function wrap(s, w, size) { ctx.font = '900 ' + size + 'px "Georgia","Times New Roman",serif'; const words = s.split(' '), lines = []; let cur = ''; for (const wd of words) { const t = cur ? cur + ' ' + wd : wd; if (ctx.measureText(t).width > w && cur) { lines.push(cur); cur = wd; } else cur = t; } lines.push(cur); return lines; }
  const dim = (a) => { ctx.fillStyle = 'rgba(6,3,22,' + a + ')'; ctx.fillRect(0, 0, C.W, C.H); };
  function hint(s) { ctx.globalAlpha = 0.55 + 0.45 * Math.sin(time * 5); g.text(s, C.W / 2, 505, 15, '#fff', 'center'); ctx.globalAlpha = 1; }

  R_.overlay = function (c, t) {
    ctx = c; time = t;
    const ph = Game.phase, R = Game.route; if (!R) return;
    const cx = C.W / 2;
    if (ph === 'intro') {
      dim(0.55); const k = U.easeOutCubic(Math.min(1, Game.t / 0.6));
      ctx.save(); ctx.translate(cx, 270 + (1 - k) * 420); ctx.rotate(-0.05 + (1 - k) * 0.5); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
      ctx.fillStyle = '#f2ead2'; ctx.strokeStyle = '#1a1030'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(-290, -215, 580, 430, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1a1030'; ctx.font = '900 54px "Georgia","Times New Roman",serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('The Daily Nebula', 0, -168);
      ctx.fillRect(-270, -136, 540, 3); ctx.fillRect(-270, -130, 540, 1);
      ctx.font = '700 14px "Georgia",serif'; ctx.fillText(C.DAYS[Game.day - 1] + '  •  WEEK ' + Game.week + '  •  ORBITAL EDITION  •  2 CREDITS', 0, -116);
      const lines = wrap(HEAD[(Game.day - 1 + (Game.week - 1) * 3) % 7], 520, 38); ctx.font = '900 38px "Georgia","Times New Roman",serif'; ctx.textAlign = 'center';
      lines.forEach((l, i) => ctx.fillText(l, 0, -70 + i * 42));
      ctx.fillStyle = '#c9c0a4'; ctx.fillRect(-270, 36, 160, 100); ctx.fillStyle = '#1a1030';
      ctx.beginPath(); ctx.arc(-190, 80, 22, 0, 6.2832); ctx.fill(); ctx.fillRect(-250, 110, 120, 12);
      for (let i = 0; i < 7; i++) { ctx.fillStyle = '#6b6350'; ctx.fillRect(-90, 40 + i * 14, 150 + (i % 3) * 30, 5); }
      ctx.fillStyle = '#1a1030'; ctx.font = '800 18px sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('ROUTE: ' + R.houses.length + ' houses   SUBSCRIBERS: ' + R.subCount + '   PAPERS: ' + P.papers, -270, 168);
      ctx.fillStyle = '#c33'; ctx.font = '900 16px sans-serif'; ctx.fillText('Glowing houses: deliver. Grumpy ones: smash windows!', -270, 192);
      ctx.restore(); if (Game.t > 0.5) hint('PRESS ANY KEY TO START YOUR ROUTE');
    } else if (ph === 'coursein') {
      dim(0.5); g.text('HOVER ACADEMY', cx, 190, 64, '#7dffff', 'center'); g.text('BONUS TRAINING COURSE', cx, 245, 26, '#fff', 'center');
      g.text('Hit the targets, jump the ramps, fly through the hoops. Crashes only cost time.', cx, 295, 17, '#ffe45a', 'center'); g.text('Papers are unlimited here.', cx, 322, 17, '#ffe45a', 'center'); hint('PRESS ANY KEY');
    } else if (ph === 'bossin') {
      dim(0.6); const b = Game.boss, img = G.art && G.art.boss && G.art.boss[Game.route.boss];
      if (img && img.complete && img.naturalWidth) { const sc = Math.min(330 / img.naturalWidth, 330 / img.naturalHeight), w = img.naturalWidth * sc, h = img.naturalHeight * sc; const k = U.easeOutCubic(Math.min(1, Game.t / 0.7)); ctx.drawImage(img, 70 - (1 - k) * 300, 270 - h / 2, w, h); }
      g.text('WEEK ' + Game.week + ' BOSS', 660, 150, 24, '#ff7a6a', 'center'); g.text(G.boss.NAMES[b.type], 660, 215, 52, '#ffe45a', 'center'); g.text('"' + G.boss.TAUNT[b.type] + '"', 660, 275, 24, '#fff', 'center');
      g.text(b.type === 'rex' ? 'Dodge the charge. Hit him while he is dizzy for double damage!' : b.type === 'gorp' ? 'Wait out the shield, then pelt him with papers!' : 'Hop over the blade. Hit the glowing grass bag!', 660, 335, 16, '#cdbfff', 'center', false);
      hint('PRESS ANY KEY');
    } else if (ph === 'routeend' || ph === 'courseend' || ph === 'bossend' || ph === 'weekend') {
      dim(0.62); const T = Game.tally; if (!T) return;
      const k = U.easeOutCubic(Math.min(1, Game.t / 0.4)); ctx.save(); ctx.translate(cx, 270); ctx.scale(k, k);
      panel(-250, -190, 500, 380, 0.9); g.text(T.title, 0, -150, 30, '#ffe45a', 'center');
      T.lines.forEach((l, i) => { if (Game.t < 0.25 + i * 0.18) return; g.text(l[0], -220, -92 + i * 36, 17, '#cdbfff', 'left', false); g.text(l[1], 220, -92 + i * 36, 19, '#fff', 'right', false); });
      if (Game.t > 1.4) g.text('BONUS  +' + U.fmt(T.bonus), 0, 150, 28, '#7dff9e', 'center');
      ctx.restore(); if (Game.t > 1.2) hint('PRESS ANY KEY');
    } else if (ph === 'dead') { dim(Math.min(0.7, Game.t * 0.6)); g.text('ROUTE OVER', cx, 250, 56, '#ff6a6a', 'center'); }
  };

  G.render = R_;
})((window.SGS = window.SGS || {}));
