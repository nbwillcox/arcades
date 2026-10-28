/* Boot, frame loop, attract-mode demo behind the title, pause / restart / results flow and adaptive render quality. */
(function (G) {
  'use strict';
  const S = G.settings, g = G.game, R = G.render, I = G.input, U = G.U;
  const M = { mode: 'title', time: 0, opts: null };
  G.main = M;
  const $ = (id) => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d'), params = new URLSearchParams(location.search);
  function insets() {
    const hud = document.body.classList.contains('in-game'), t = hud ? $('hud').offsetHeight + 4 : 8, b = hud ? $('bar').offsetHeight + 6 : 8;
    R.inset.t = t; R.inset.b = b;
  }
  function resize() { insets(); R.resize(canvas); }
  window.addEventListener('resize', resize);
  M.rebuild = resize;
  const setHud = (on) => { document.body.classList.toggle('in-game', on); insets(); if (R.layout) R.setLayout(R.layout); };
  M.start = function (opts) {
    if (G.audio) G.audio.resume();
    M.opts = opts; M.mode = 'play'; if (G.ui) G.ui.hideAll(); setHud(true); I.last = 'mouse';
    g.start(opts); G.hud.setup(g);
    if (matchMedia && matchMedia('(pointer: coarse)').matches && window.innerHeight > window.innerWidth * 1.2 && !M.hinted) { M.hinted = true; if (G.ui) G.ui.toast('Tiles are bigger in landscape - rotate your phone'); }
  };
  M.restart = function () { if (M.opts) M.start(M.opts); };
  M.startDemo = function () {
    if (M.mode !== 'title') return;
    setHud(false); const l = G.layouts[Math.floor(Math.random() * G.layouts.length)]; g.start({ layout: l.id, mode: 'zen', demo: true });
  };
  M.pause = function () { if (M.mode !== 'play' || g.state === 'won' || g.state === 'lost') return; M.mode = 'pause'; if (G.audio) G.audio.suspend(); if (G.ui) G.ui.show('pause'); };
  M.resume = function () { if (M.mode !== 'pause') return; M.mode = 'play'; if (G.audio) G.audio.resumeAll(); if (G.ui) G.ui.hideAll(); };
  M.quit = function (to) {
    if (G.audio) { G.audio.resumeAll(); G.audio.music('title'); }
    M.mode = 'title'; M.startDemo(); if (G.ui) { G.ui.stack = []; G.ui.show(to || 'title'); }
  };
  M.onResult = function (res) {
    M.mode = 'over'; if (G.audio) G.audio.music('title');
    if (res.win) { G.progress.clear(res.mode, res.layout.id, res.time); }
    if (G.ui) G.ui.showResults(res);
  };
  let last = 0, slow = 0, musicOn = false, hudT = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;
    let dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 1 / 60; if (dt > 0.05) dt = 0.05;
    M.time += dt;
    if (M.mode === 'play') { I.poll(dt); g.update(dt); } else if (M.mode === 'over' || M.mode === 'title') g.update(dt);
    if (G.ui && G.ui.isOpen()) G.ui.padNav(dt);
    const t0 = performance.now(); R.draw(ctx, g, M.time, dt); const ft = performance.now() - t0;
    slow = ft > 22 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 80 && S.quality > 0.6) { S.quality = Math.max(0.6, S.quality - 0.1); slow = 0; resize(); }
    hudT -= dt; if (hudT <= 0 && document.body.classList.contains('in-game')) { hudT = 0.1; G.hud.update(g); }
  }
  const kick = () => { if (!G.audio) return; G.audio.resume(); if (!musicOn) { musicOn = true; G.audio.music(M.mode === 'play' ? 'play' : 'title'); } };
  window.addEventListener('pointerdown', kick); window.addEventListener('keydown', kick);
  document.addEventListener('visibilitychange', () => { if (document.hidden) M.pause(); });
  window.addEventListener('blur', () => M.pause());
  M.boot = function () {
    resize(); if (G.ui) G.ui.init(); G.hud.init();
    M.startDemo(); if (G.ui) G.ui.show('title');
    const p = params.get('play');
    if (p) M.start({ layout: p, mode: params.get('mode') === 'timed' ? 'timed' : 'zen' });
    requestAnimationFrame((t) => { last = t; frame(t); });
  };
})((window.SGS = window.SGS || {}));
