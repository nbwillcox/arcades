/* Boot, fixed-step loop, attract-mode demo behind the title, pause / restart / results flow and adaptive render quality. */
(function (G) {
  'use strict';
  const S = G.settings, I = G.input, Game = G.game, R = G.render, STEP = 1 / 120;
  const M = { mode: 'title', time: 0 };
  G.main = M;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d'), params = new URLSearchParams(location.search);
  function resize() { R.resize(canvas); R.Lkey = null; }
  window.addEventListener('resize', resize);
  M.rebuild = resize;
  M.start = function (opts) {
    if (G.audio) G.audio.resume();
    I.clear(); M.demo = false; M.opts = opts; Game.start(opts); M.mode = 'play'; if (G.ui) G.ui.hideAll();
  };
  M.restart = function () { if (M.opts) M.start(M.opts); };
  M.startDemo = function () {
    M.demo = true; Game.start({ mode: 'marathon', level: 1 + Math.floor(Math.random() * 6) }); Game.countdown = 0.1; M.demoAi = G.ai.make(Game.tet, { pps: 2.4, err: 0.03, hold: true }); M.demoT = 0; M.mode = 'title';
  };
  M.pause = function () { if (M.mode !== 'play' || Game.state === 'over') return; M.mode = 'pause'; I.clear(); if (G.audio) G.audio.suspend(); if (G.ui) G.ui.show('pause'); };
  M.resume = function () { if (M.mode !== 'pause') return; M.mode = 'play'; I.clear(); if (G.audio) G.audio.resumeAll(); if (G.ui) G.ui.hideAll(); };
  M.quit = function () { if (G.audio) { G.audio.resumeAll(); G.audio.music('title'); } M.startDemo(); if (G.ui) G.ui.show('title'); };
  M.onResult = function (res) { M.mode = 'over'; setTimeout(() => { if (M.mode === 'over' && G.ui) G.ui.showResults(res); }, res.win ? 900 : 1100); };
  let last = 0, acc = 0, musicOn = false, slow = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;                                  /* cap at about 60 fps on 90 / 120 / 144 Hz screens: the loop is fixed-step, so the extra frames only cost battery and heat */
    let dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 1 / 60; if (dt > 0.05) dt = 0.05;
    M.time += dt; I.poll();
    if (G.ui && G.ui.isOpen()) G.ui.padNav();
    if (M.mode === 'play') {
      if (I.take('pause')) M.pause(); else if (I.take('restart')) M.restart();
      else { acc += dt; while (acc >= STEP) { Game.update(STEP, I); acc -= STEP; if (M.mode !== 'play') break; } }
    } else if (M.mode === 'pause') { if (I.take('pause')) M.resume(); }
    else if (M.mode === 'over') { acc += dt; while (acc >= STEP) { Game.update(STEP, I); acc -= STEP; } }
    else if (M.mode === 'title' && M.demo) {
      acc += dt; M.demoT += dt;
      while (acc >= STEP) { M.demoAi.update(STEP); Game.update(STEP, { held: {}, take: () => false }); acc -= STEP; }
      if (Game.state === 'over' || M.demoT > 90) M.startDemo();
    }
    const t0 = performance.now(); R.draw(ctx, Game, M.time, dt); const ft = performance.now() - t0;
    slow = ft > 20 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 90 && S.quality > 0.6) { S.quality = Math.max(0.6, S.quality - 0.1); slow = 0; resize(); }
  }
  const kick = () => { if (!G.audio) return; G.audio.resume(); if (!musicOn && M.mode === 'title') { musicOn = true; G.audio.music('title'); } };
  window.addEventListener('pointerdown', kick); window.addEventListener('keydown', kick);
  document.addEventListener('visibilitychange', () => { if (document.hidden) M.pause(); });
  window.addEventListener('blur', () => M.pause());
  M.boot = function () {
    resize(); if (G.ui) G.ui.init();
    M.startDemo(); if (G.ui) G.ui.show('title');
    if (params.get('play')) { const mode = params.get('play'); M.start({ mode, cores: params.get('cores') === '1', cascade: params.get('cascade') === '1', level: parseInt(params.get('level'), 10) || 1, opponent: parseInt(params.get('opp'), 10) || 0 }); }
    requestAnimationFrame((t) => { last = t; frame(t); });
  };
})((window.SGS = window.SGS || {}));
