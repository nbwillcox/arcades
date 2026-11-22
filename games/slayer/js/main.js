/* core engine: fixed-timestep loop (60Hz logic, decoupled rAF render), integer pixel scaling, state machine
   TITLE -> CLASS -> LEVEL_SELECT -> COMBAT -> LEVEL_UP_DRAFT / CHEST_REWARD / PAUSE -> RESULT -> ARMORY */
(function () {
  var U = CS.U, In = CS.In, AU = CS.audio, SV = CS.save, ui = CS.ui, fx = CS.fx, G = CS.G, SC = CS.screens, W = CS.W, H = CS.H;
  var M = CS.main = { state: 'title', sel: 0, msg: '', msgT: 0, cards: [], res: null, prev: 'title', prevShop: null };
  var canvas, ctx, last = 0, acc = 0, STEP = 1 / 60, q = {};
  location.search.replace(/[?&]([^=&]+)=([^&]*)/g, function (_, k, v) { q[k] = decodeURIComponent(v); });

  function resize() {
    var dpr = window.devicePixelRatio || 1, vw = window.innerWidth * dpr, vh = window.innerHeight * dpr, s = Math.min(vw / W, vh / H), si = Math.floor(s);
    // pixel-perfect integer scale when it nearly fills the window (or when forced in Settings); otherwise fill the screen
    if (si >= 1 && (SV.d.set.intscale || s / si < 1.15)) s = si;
    canvas.style.width = (W * s / dpr) + 'px'; canvas.style.height = (H * s / dpr) + 'px';
  }

  M.go = function (st) {
    if (st === 'title' || st === 'levels' || st === 'class' || st === 'shop' || st === 'settings') { AU.music('menu'); In.joyEnabled = false; }
    if (st === 'combat') In.joyEnabled = true; else In.joyEnabled = false;
    M.state = st; ui.focus = ''; In.p = {}; In.taps.length = 0;
  };
  M.startRun = function (stage) {
    AU.init(); G.start(stage, SV.d.cls, { blitz: SV.d.blitz, time: q.time ? +q.time : 0, god: q.god === '1' });
    if (q.boost) debugBoost();
    AU.music(stage); M.go('combat'); G.banner = { t: 2.4, text: CS.STAGES[stage].sub, sub: CS.STAGES[stage].n, c: CS.STAGES[stage].pal[2] };
  };
  function debugBoost() { var p = G.p; CS.ITEM_ORDER.forEach(function (id) { var d = CS.ITEMS[id]; if (d.cls && d.cls !== G.cls) return; if (d.cat !== 'defense' && !p.items[id] && CS.WP.offenseCount() >= CS.MAX_OFFENSE) return; var it = p.items[id] || CS.WP.addItem(id, 4); it.lv = +q.boost; it.pw = 1 + (it.lv - 1) * 2; }); CS.WP.recalc(); CS.MN.fillAll(); p.hp = p.maxHp; }
  M.pick = function (i) {
    var c = M.cards[i]; if (!c) return; CS.WP.apply(c); AU.sfx(c.rar >= 3 ? 'levelup' : 'pick'); fx.shake(0.1); G.pendingLv--; if (G.pendingLv > 0) M.openDraft(); else M.go('combat');
  };
  M.openDraft = function () { M.cards = CS.WP.rollCards(3); M.state = 'draft'; ui.focus = 'c0'; AU.sfx('levelup'); In.joyEnabled = false; In.joy.on = false; };
  M.endChest = function () { G.chest = null; M.go('combat'); };

  M.finish = function () {
    var p = G.p, won = G.won, d = SV.d, st = G.stage, gold = G.stats.gold, bonus = won ? Math.round((300 + 120 * st) * (G.blitz ? 0.7 : 1)) : 0, lost = won ? 0 : Math.round(gold * 0.4), banked = gold + bonus - lost, keyGain = false, um = '';
    d.gold += banked; d.runs++; d.kills += G.stats.kills;
    if (won) {
      var n = st + 1; if (!d.cleared[n]) { d.cleared[n] = true; if (n < 10) { d.keys++; keyGain = true; } if (n === 1) um = 'NEURAL STAGE SELECT GRID UNLOCKED!'; }
      if (!d.best[n] || G.t < d.best[n]) d.best[n] = Math.floor(G.t); d.unlocked[n] = true;
      var all = true; for (var i = 1; i <= 9; i++) if (!d.cleared[i]) all = false; if (all && n !== 10 && !d.cleared[10]) um = 'THE OMEGA CITADEL IS OPEN!';
    }
    SV.store(); AU.stopMusic(); AU.sfx(won ? 'victory' : 'defeat');
    M.res = { won: won, stage: st, time: G.t, level: p.lv, kills: G.stats.kills, bosses: G.stats.bosses, gold: gold, bonus: bonus, lost: lost, banked: banked, keyGain: keyGain, unlockMsg: um };
    M.sel = Math.min(9, won && st < 8 ? st + 1 : st); M.go('result'); AU.music('menu');
  };

  var bl, blc, ema = 0.0167, slow = 0, bloomOff = false;
  function bloom(ctx) {
    if (SV.d.set.bloom === false || bloomOff) return;
    if (!bl) { bl = document.createElement('canvas'); bl.width = 240; bl.height = 135; blc = bl.getContext('2d'); }
    if (typeof blc.filter === 'string') blc.filter = 'brightness(0.85) contrast(1.7)';
    blc.globalCompositeOperation = 'copy'; blc.drawImage(canvas, 0, 0, 240, 135);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4; ctx.imageSmoothingEnabled = true; ctx.drawImage(bl, 0, 0, W, H); ctx.restore(); ctx.imageSmoothingEnabled = false;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var rdt = Math.min(0.1, (now - last) / 1000 || 0); last = now; acc += rdt;
    if (M.state === 'combat' && rdt > 0) { ema += (rdt - ema) * 0.05; if (ema > 0.026) { if (++slow > 240) bloomOff = true; } else slow = 0; }
    var steps = 0;
    while (acc >= STEP && steps < 5) { acc -= STEP; steps++; tick(STEP, rdt); }
    if (steps === 0 && acc > 1) acc = 0;
    render();
    if (fx.hitstop > 0) fx.hitstop -= rdt * 1000;
  }
  var ticked = false;
  function portrait() { return window.matchMedia && window.matchMedia('(orientation: portrait) and (pointer: coarse)').matches; }
  function tick(dt, rdt) {
    In.poll();
    if (M.state === 'combat') {
      In.noJoy = [{ x: W - 56, y: 50, w: 56, h: 56 }, { x: W - 110, y: H - 120, w: 110, h: 120 }];
      if (In.p.pause || (In.p.blur && SV.d.set.autopause) || portrait()) { M.go('pause'); }
      else if (fx.hitstop <= 0) {
        G.update(dt);
        if (G.over) M.finish();
        else if (G.pendingLv > 0) M.openDraft();
        else if (G.chest) { M.state = 'chest'; ui.focus = ''; In.joyEnabled = false; In.joy.on = false; }
      }
      if (In.taps.length && M.state === 'combat') { for (var i = 0; i < In.taps.length; i++) { var t = In.taps[i]; if (t.x > W - 56 && t.y > 50 && t.y < 106) M.go('pause'); else if (t.x > W - 110 && t.y > H - 120) In.p.dash = true; } }
    }
    ticked = true;
  }
  function render() {
    ctx.imageSmoothingEnabled = false; var dt = 1 / 60;
    if (!CS.G.p || M.state === 'title' || M.state === 'levels' || M.state === 'class' || M.state === 'shop' || M.state === 'result') CS.t = performance.now() / 1000;
    ui.begin(ctx, dt);
    switch (M.state) {
      case 'title': SC.title(ctx); break; case 'class': SC.class(ctx); break; case 'levels': SC.levels(ctx); break; case 'shop': SC.shop(ctx); break; case 'result': SC.result(ctx, M); break;
      case 'combat': G.draw(ctx); bloom(ctx); ctx.drawImage(CS.art.vignette(), 0, 0); ui.hud(ctx); fx.drawXp(ctx); break;
      case 'settings': SC.settings(ctx, M); break; case 'draft': SC.draft(ctx, M); break; case 'chest': SC.chest(ctx, M); break; case 'pause': SC.pause(ctx, M); break;
    }
    if (M.state !== 'combat') { ui.hints(M.state); In.endFrame(); } else if (ticked) { In.p = {}; In.taps.length = 0; ticked = false; }
  }

  M.resize = function () { resize(); };
  function lockEsc() { try { var k = (window.parent !== window ? window.parent : window).navigator.keyboard; if (k && k.lock && (document.fullscreenElement || (window.parent !== window && window.parent.document.fullscreenElement))) k.lock(['Escape']); } catch (e) { } }
  function boot() {
    canvas = document.getElementById('game'); canvas.width = W; canvas.height = H; ctx = canvas.getContext('2d', { alpha: false }); ctx.imageSmoothingEnabled = false;
    In.attach(canvas); SV.load(); In.loadBindings(); CS.art.init(); G.init(); resize(); window.addEventListener('resize', resize);
    var fsDone = false, framed = false; try { framed = window.parent !== window && !!window.parent.ARCADE; } catch (e) { }
    var unlock = function () { AU.init(); if (!fsDone && !framed && SV.d.set.autofs !== false && document.documentElement.requestFullscreen && !window.matchMedia('(display-mode: fullscreen)').matches) { fsDone = true; document.documentElement.requestFullscreen().catch(function () { }); } lockEsc(); };
    ['pointerdown', 'keydown'].forEach(function (e) { window.addEventListener(e, unlock); });
    document.addEventListener('fullscreenchange', function () { lockEsc(); resize(); });
    try { if (framed) window.parent.document.addEventListener('fullscreenchange', lockEsc); } catch (e) { }
    if (q.cls && CS.CLASSES[q.cls]) SV.d.cls = q.cls;
    CS.art.load();
    if (q.go) { SV.d.intro = true; M.startRun(Math.max(0, (+q.stage || 1) - 1)); } else M.go('title');
    if (q.gold) SV.d.gold = +q.gold;
    requestAnimationFrame(function (t) { last = t; frame(t); });
  }
  window.addEventListener('load', boot);
})();
