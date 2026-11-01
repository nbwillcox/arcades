/* Scene assembly (depth-sorted) into the pixel buffer, HUD and full-screen overlays (newspaper, tallies, banners) in the same buffer. */
(function (G) {
  'use strict';
  const C = G.C, g = G.gfx, px = G.px, S = G.settings, Sp = G.sprites, U = G.U;
  const Game = G.game, P = Game.p;
  const R_ = {};
  const items = [];
  const OUT = px.hsl(250, 45, 10), WHITE = px.hsl(0, 0, 98);
  const HEAD = ['MOON LIGHTS OUT: RESIDENTS DEMAND NIGHT-LIGHT', 'CAT BEATS MAYOR IN COSMIC ELECTION', 'UFO PARKING TICKETS ISSUED TO CLOUD', 'METEOR SHOWER FORECAST: BRING AN UMBRELLA', 'LOCAL ROBO-DOG DEMANDS BETTER BONES', 'GNOME CONVENTION CAUSES TRAFFIC JAM', 'GIANT MOWER SPOTTED: LAWNS PANIC!'];
  const col = (hex) => { const v = parseInt(hex.slice(1), 16); return px.rgb((v >> 16) & 255, (v >> 8) & 255, v & 255); };
  const push = (k, t, o) => items.push({ k, t, o });
  let time = 0;

  R_.scene = function (t) {
    time = t;
    const R = Game.route; if (!R) return;
    const cam = Game.cam;
    cam.z += ((P.z + 34) - cam.z) * Math.min(1, 0.25);
    cam.x += ((P.x * 0.2 - 45) - cam.x) * 0.12;
    g.camX = cam.x; g.camZ = cam.z;
    const sk = Game.fx.shake * (S.shake && !S.reduced ? 0.5 : 0);
    g.shx = sk ? Math.round((Math.random() - 0.5) * sk) : 0; g.shy = sk ? Math.round((Math.random() - 0.5) * sk) : 0;
    const zA = cam.z - 110, zB = cam.z + 360;
    g.backdrop(t);
    g.ground(R, zA, zB, t);
    for (const h of R.houses) { if (h.z1 < zA) continue; if (h.z0 > zB) break; Sp.houseGround(h, t); }
    for (const o of R.deco) { if (o.z > zB) break; if ((o.z < zA && !(o.z1 > zA)) || o.dead) continue; if (o.t === 'pothole' || o.t === 'sprinkler') Sp.deco(o, t); }
    if (S.guide && (Game.phase === 'ride' || Game.phase === 'course' || Game.phase === 'boss') && P.crash <= 0) guide();
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
    for (const p of Game.fx.parts) { g.pr(p.x, p.z, p.y); const a = 1 - p.t / p.life, sz = p.sz > 2.6 ? 2 : 1; px.rect(g.X, g.Y, sz, sz, a > 0.35 ? col(p.col.length === 7 ? p.col : '#ffffff') : px.hsl(40, 30, 70)); }
    for (const p of Game.fx.pops) { g.pr(p.x, p.z, p.y + p.t * 22); if (p.t < 1.2 || Math.floor(p.t * 20) % 2) px.text(p.txt, g.X, g.Y - 3, 1, p.col.length === 7 ? col(p.col) : WHITE, 'center', OUT); }
    if (Game.fx.flash > 0) px.dim(1 - Math.min(0.5, Game.fx.flash), 255);
    g.shx = g.shy = 0;
  };

  function guide() {
    const y0 = 14 + P.y, vy = C.TVY + P.y * 0.2, tl = (vy + Math.sqrt(vy * vy + 2 * C.G * y0)) / C.G;
    for (const side of [-1, 1]) {
      const lx = P.x + side * C.TV * tl, lz = P.z + P.speed * tl;
      g.ring(Math.max(-C.WALL + 2, Math.min(C.EDGE_R - 2, lx)), lz, 0, 6, px.hsl(0, 0, 96), Math.floor(time * 8) % 2 ? 1 : 0);
      if (Math.abs(lx) <= C.WALL) { g.pr(lx, lz, 0); px.pix(g.X, g.Y, WHITE); }
    }
  }

  /* ---------------- HUD ---------------- */
  const panel = (x, y, w, h, a) => { px.rect(x, y, w, h, px.hsl(250, 50, 8)); px.rect(x + 1, y + 1, w - 2, h - 2, px.hsl(250, 45, 16)); px.rect(x + 2, y + 2, w - 4, 1, px.hsl(250, 40, 24)); px.outline([x, y, x + w - 1, y, x + w - 1, y + h - 1, x, y + h - 1], px.hsl(255, 40, 40)); void a; };
  function houseIcon(x, y, c) { px.rect(x - 3, y, 7, 5, OUT); px.rect(x - 2, y, 5, 4, c); px.poly([x - 5, y + 1, x + 6, y + 1, x + 0.5, y - 5], OUT); px.poly([x - 4, y, x + 5, y, x + 0.5, y - 4], c); px.pix(x, y + 3, OUT); }

  R_.hud = function (t) {
    time = t;
    const R = Game.route, ph = Game.phase; if (!R) return;
    if (ph === 'idle' || ph === 'over') return;
    panel(4, 4, 86, 28);
    px.text(U.fmt(Game.score), 9, 8, 2, WHITE, 'left', null);
    px.text(Game.mult() > 1 ? 'COMBO X' + Game.mult() : 'SCORE', 9, 23, 1, Game.mult() > 1 ? px.hsl(50, 95, 66) : px.hsl(255, 40, 70), 'left', null);
    for (let i = 0; i < Math.min(Game.lives, 7); i++) { const x = 10 + i * 10; px.ell(x, 41, 4, 4, OUT); px.ell(x, 41, 3, 3, px.hsl(26, 60, 76)); px.ell(x, 39.5, 3, 2, px.hsl(0, 78, 48)); px.rect(x, 40, 4, 1, px.hsl(0, 78, 36)); }
    panel(396, 4, 80, 28);
    px.poly([404, 14, 418, 10, 420, 17, 406, 21], OUT); px.poly([405, 14.5, 417, 11.5, 418.5, 16.5, 407, 19.5], px.hsl(48, 30, 94)); px.rect(411, 13, 2, 6, px.hsl(0, 78, 50));
    px.text(P.pw.inf > 0 ? '@' : String(P.papers), 471, 11, 2, P.pw.inf > 0 ? px.hsl(140, 80, 66) : P.papers <= 3 ? px.hsl(5, 90, 64) : WHITE, 'right', null);
    let py = 50;
    for (const k in P.pw) if (P.pw[k] > 0) { const pw = G.POWER[k], max = { speed: 8, double: 12, omni: 12, shield: 10, inf: 12 }[k], c = col(pw.col); panel(4, py, 78, 13); px.rect(6, py + 2, Math.round(74 * Math.min(1, P.pw[k] / max)), 9, c); px.text(pw.name, 8, py + 3, 1, WHITE, 'left', OUT); py += 15; }
    const cx = 240;
    if (R.kind === 'route') {
      const subs = R.houses.filter((h) => h.sub), n = subs.length, wd = Math.min(150, n * 11 + 14);
      panel(cx - wd / 2, 4, wd, 26);
      subs.forEach((h, i) => houseIcon(cx - wd / 2 + 11 + i * 11, 14, h.cancelled ? px.hsl(0, 85, 58) : h.delivered ? px.hsl(140, 75, 56) : px.hsl(48, 95, 60)));
      px.text(C.DAYS[Game.day - 1].slice(0, 3) + ' WEEK ' + Game.week, cx, 22, 1, px.hsl(255, 40, 78), 'center', null);
      const prog = U.clamp(P.z / R.end, 0, 1); px.rect(cx - 60, 32, 120, 3, px.hsl(250, 50, 10)); px.rect(cx - 60, 32, Math.round(120 * prog), 3, px.hsl(185, 90, 62));
    } else if (R.kind === 'course') {
      const cs = Game.cs; panel(cx - 90, 4, 180, 16); px.text('ACADEMY  TARGETS ' + cs.targets + '/' + R.targets + '  HOOPS ' + cs.hoops + '/' + R.hoops, cx, 9, 1, WHITE, 'center', null);
    } else if (R.kind === 'boss' && Game.boss) {
      const b = Game.boss; panel(cx - 90, 4, 180, 24);
      px.text(G.boss.NAMES[b.type], cx, 8, 1, px.hsl(50, 95, 66), 'center', null);
      px.rect(cx - 80, 18, 160, 6, px.hsl(250, 50, 6)); px.rect(cx - 79, 19, Math.round(158 * Math.max(0, b.hp) / b.max), 4, b.shield ? px.hsl(195, 90, 62) : b.weak ? px.hsl(50, 95, 62) : px.hsl(355, 85, 56));
    }
    if (ph === 'ride' && Game.t < 1.4) px.text(Game.t < 0.8 ? 'GET READY' : 'GO!', cx, 120, 4, WHITE, 'center', OUT);
    if (P.crash > 0 && ph !== 'dead') px.dim(1 - Math.min(0.22, P.crash * 0.15), 0);
    if (Game.bot) px.text('AUTOPILOT', cx, 262, 1, px.hsl(185, 90, 70), 'center', OUT);
  };

  /* ---------------- overlays ---------------- */
  function wrap(s, maxW, sc) { const words = s.split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (px.textW(t, sc) > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } lines.push(cur); return lines; }
  function hint(s) { if (Math.floor(time * 2.5) % 2) px.text(s, 240, 250, 1, WHITE, 'center', OUT); }

  R_.overlay = function (t) {
    time = t;
    const ph = Game.phase, R = Game.route; if (!R) return;
    const cx = 240;
    if (ph === 'intro') {
      px.dim(0.45); const k = U.easeOutCubic(Math.min(1, Game.t / 0.6)), oy = Math.round((1 - k) * 260);
      const paper = px.hsl(44, 40, 88), ink = px.hsl(250, 45, 14);
      px.rect(66, 18 + oy, 348, 226, ink); px.rect(68, 20 + oy, 344, 222, paper); px.rect(68, 20 + oy, 344, 3, px.hsl(44, 40, 96));
      px.text('THE DAILY NEBULA', cx, 28 + oy, 3, ink, 'center', null); px.rect(76, 54 + oy, 328, 2, ink); px.rect(76, 58 + oy, 328, 1, ink);
      px.text(C.DAYS[Game.day - 1] + '  WEEK ' + Game.week + '  ORBITAL EDITION', cx, 64 + oy, 1, ink, 'center', null);
      const lines = wrap(HEAD[(Game.day - 1 + (Game.week - 1) * 3) % 7], 320, 2); lines.forEach((l, i) => px.text(l, cx, 80 + oy + i * 17, 2, ink, 'center', null));
      px.rect(80, 132 + oy, 90, 56, px.hsl(44, 20, 70)); px.ell(125, 156 + oy, 14, 14, ink); px.rect(100, 176 + oy, 50, 6, ink);
      for (let i = 0; i < 6; i++) px.rect(180, 134 + oy + i * 9, 150 + (i % 3) * 20, 3, px.hsl(44, 15, 52));
      px.text('ROUTE: ' + R.houses.length + ' HOUSES   SUBSCRIBERS: ' + R.subCount + '   PAPERS: ' + P.papers, 80, 198 + oy, 1, ink, 'left', null);
      px.text('GLOWING HOUSES: DELIVER.  GRUMPY ONES: SMASH WINDOWS!', 80, 214 + oy, 1, px.hsl(0, 70, 40), 'left', null);
      if (Game.t > 0.5) hint('PRESS ANY KEY TO START YOUR ROUTE');
    } else if (ph === 'coursein') {
      px.dim(0.5); px.text('HOVER ACADEMY', cx, 80, 4, px.hsl(185, 95, 70), 'center', OUT); px.text('BONUS TRAINING COURSE', cx, 120, 2, WHITE, 'center', OUT);
      px.text('HIT THE TARGETS, JUMP THE RAMPS, FLY THROUGH THE HOOPS.', cx, 150, 1, px.hsl(50, 95, 66), 'center', OUT); px.text('PAPERS ARE UNLIMITED. CRASHES ONLY COST TIME.', cx, 164, 1, px.hsl(50, 95, 66), 'center', OUT); hint('PRESS ANY KEY');
    } else if (ph === 'bossin') {
      px.dim(0.35); const b = Game.boss;
      px.text('WEEK ' + Game.week + ' BOSS', 340, 70, 2, px.hsl(5, 90, 68), 'center', OUT); px.text(G.boss.NAMES[b.type], 340, 100, 3, px.hsl(50, 95, 66), 'center', OUT);
      px.text('"' + G.boss.TAUNT[b.type] + '"', 340, 140, 1, WHITE, 'center', OUT);
      const tip = b.type === 'rex' ? 'DODGE THE CHARGE. HIT HIM WHILE DIZZY FOR DOUBLE!' : b.type === 'gorp' ? 'WAIT OUT THE SHIELD, THEN PELT HIM WITH PAPERS!' : 'HOP THE BLADE. HIT THE GLOWING GRASS BAG!';
      px.text(tip, 340, 160, 1, px.hsl(255, 40, 80), 'center', OUT); hint('PRESS ANY KEY');
    } else if (ph === 'routeend' || ph === 'courseend' || ph === 'bossend' || ph === 'weekend') {
      px.dim(0.4); const T = Game.tally; if (!T) return;
      const k = Math.min(1, Game.t / 0.3), h = Math.round(196 * k); panel(cx - 165, 135 - h / 2, 330, h);
      if (k < 1) return;
      px.text(T.title, cx, 50, 2, px.hsl(50, 95, 66), 'center', OUT);
      T.lines.forEach((l, i) => { if (Game.t < 0.35 + i * 0.18) return; px.text(l[0], cx - 155, 76 + i * 16, 1, px.hsl(255, 40, 76), 'left', null); px.text(l[1], cx + 155, 76 + i * 16, 1, WHITE, 'right', null); });
      if (Game.t > 1.5) px.text('BONUS +' + U.fmt(T.bonus), cx, 190, 2, px.hsl(140, 80, 66), 'center', OUT);
      if (Game.t > 1.2) hint('PRESS ANY KEY');
    } else if (ph === 'dead') { px.dim(1 - Math.min(0.6, Game.t * 0.5)); px.text('ROUTE OVER', cx, 120, 4, px.hsl(0, 90, 66), 'center', OUT); }
  };

  /* portrait drawn on the real canvas after the buffer is scaled up */
  R_.post = function (ctx, art) {
    if (Game.phase !== 'bossin') return;
    const img = art && art.boss && art.boss[Game.route.boss]; if (!img || !img.complete || !img.naturalWidth) return;
    const k = U.easeOutCubic(Math.min(1, Game.t / 0.7)), sc = Math.min(340 / img.naturalWidth, 340 / img.naturalHeight), w = img.naturalWidth * sc, h = img.naturalHeight * sc;
    ctx.imageSmoothingEnabled = false; ctx.drawImage(img, 60 - (1 - k) * 320, 270 - h / 2, w, h);
  };
  G.render = R_;
})((window.SGS = window.SGS || {}));
