/* Boot, integer-scale letterboxing, app modes (title / play / pause / map / end) and the fixed 60 Hz loop. */
(function (G) {
  'use strict';
  const M = { mode: 'title', time: 0, paused: false }, I = G.input, Game = G.game, UI = G.ui;
  G.main = M;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d'), params = new URLSearchParams(location.search);
  canvas.width = 480; canvas.height = 270; ctx.imageSmoothingEnabled = false;
  G.debug = { all: params.get('abil') === 'all' };
  function resize() {
    const tk = window.TK && window.TK.on ? window.TK : null, sf = tk ? tk.safe : { t: 0, r: 0, b: 0, l: 0 };                 /* touch: fractional scale (a phone needs every pixel), clear of the notch */
    const w = window.innerWidth - sf.l - sf.r, h = window.innerHeight - sf.t - sf.b, k = Math.min(w / 480, h / 270), sc = k >= 1 && !tk ? Math.floor(k) : k, st = canvas.style;
    st.width = Math.round(480 * sc) + 'px'; st.height = Math.round(270 * sc) + 'px';
  }
  window.addEventListener('resize', resize); resize();
  G.sprites.build();
  M.startSlot = function (n, fresh) { I.clear(); Game.begin(n, fresh ? null : G.save.read(n), false); if (fresh) { /* new game: write the opening state so the slot exists */ } M.mode = 'play'; };
  M.startDebug = function (room) { const rec = G.save.fresh(); rec.room = room || 'crash'; I.clear(); Game.debugAll = true; Game.begin(null, rec, true); M.mode = 'play'; };
  M.pause = function () { if (M.mode !== 'play') return; M.mode = 'pause'; I.clear(); UI.open('pause', 'pause'); };
  M.resume = function () { M.mode = 'play'; I.clear(); };
  M.openMap = function () {
    if (M.mode === 'pause' || M.mode === 'play') {
      M.fromPause = M.mode === 'pause'; M.warp = null;
      if (M.mode === 'play' && G.world.canWarp(Game)) { const list = G.world.padRooms(Game); M.warp = { list, idx: Math.max(0, list.indexOf(Game.roomId)) }; }
      M.mode = 'map'; I.clear();
    }
  };
  M.openInv = function () { if (M.mode === 'pause' || M.mode === 'play') { M.fromPause = M.mode === 'pause'; M.mode = 'inv'; I.clear(); G.inv.open(Game); } };
  M.closeInv = function () { M.mode = M.fromPause ? 'pause' : 'play'; I.clear(); };
  M.toTitle = function () { M.mode = 'title'; I.clear(); UI.open('title'); G.music.play('title'); };
  M.ending = function () { M.mode = 'end'; I.clear(); UI.open('end'); G.music.play('ending'); };
  function update() {
    if (M.mode === 'play') {
      if (I.down.pause) { M.pause(); return; }
      if (I.down.map && !Game.banner && !Game.trans && !Game.saveAnim && !Game.liftAnim) { M.openMap(); return; }
      if (I.down.inv && !Game.banner && !Game.trans && !Game.saveAnim && !Game.liftAnim && !Game.getAnim) { M.openInv(); return; }
      Game.step();
    } else if (M.mode === 'inv') { G.inv.update(Game);
    } else if (M.mode === 'map') {
      const w = M.warp, close = () => { M.mode = M.fromPause ? 'pause' : 'play'; M.warp = null; I.clear(); };
      if (w) {
        if (I.down.l) w.idx = (w.idx + w.list.length - 1) % w.list.length; if (I.down.r) w.idx = (w.idx + 1) % w.list.length;
        if (I.down.jump || I.down.start || I.down.fire) { const id = w.list[w.idx]; close(); if (id !== Game.roomId) G.world.warpTo(Game, id); }
        else if (I.down.map || I.down.pause) close();
      } else if (I.down.map || I.down.pause || I.down.jump || I.down.start) close();
    }
    else UI.update();
  }
  M.render = function () {
    const t = M.time;
    canvas.style.cursor = M.mode === 'play' && G.settings.mouseAim && Game.room && !Game.banner ? 'none' : 'default';
    if (M.mode === 'title') { UI.draw(ctx, t, Game.P && Game.room ? Game : null); return; }
    if (M.mode === 'end') { UI.draw(ctx, t, Game); return; }
    if (!Game.room) return;
    if (M.mode === 'play') G.music.forRoom(Game);
    G.render.draw(ctx, Game, Game.time / 60); G.hud.draw(ctx, Game, Game.time / 60); G.hud.overlay(ctx, Game, Game.time / 60);
    if (M.mode === 'pause') UI.draw(ctx, t, Game);
    if (M.mode === 'map') G.map.drawScreen(ctx, Game, t);
    if (M.mode === 'inv') G.inv.draw(ctx, Game, t);
  };
  let last = 0, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;                                  /* cap at about 60 fps on 90 / 120 / 144 Hz screens: the loop is fixed-step, so the extra frames only cost battery and heat */
    let dt = (now - last) / 1000; last = now; if (!(dt > 0)) dt = 1 / 60; if (dt > 0.1) dt = 0.1;
    M.time += dt;
    if (!M.paused) { acc += dt; while (acc >= 1 / 60) { I.poll(); update(); acc -= 1 / 60; } }
    M.render();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { I.clear(); if (M.mode === 'play') M.pause(); } });
  /* test hook: advance n steps with the given held keys, then draw (the pane does not run rAF while hidden) */
  M.run = function (n, held) { for (let i = 0; i < n; i++) { const nk = Object.assign({}, held || {}); for (const a in nk) if (!I.k[a]) I.lt[a] = true; I.k = nk; I.poll(); update(); } M.time += n / 60; M.render(); };
  UI.open('title'); G.music.play('title');
  { const boot = document.getElementById('boot'); if (boot) boot.remove(); }                                  /* the loading text shown while the scripts and sprites build */
  if (params.get('room')) M.startDebug(params.get('room'));
  requestAnimationFrame(frame);
})((window.SGS = window.SGS || {}));
