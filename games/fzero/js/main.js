/* Boot, render pipeline (Mode-7 scene at a low internal resolution, stretched to the window), fixed-step loop and app modes. */
(function (G) {
  'use strict';
  const C = G.C, S = G.settings, R = G.race, I = G.input, M7 = G.m7, HUD = G.hud, U = G.U;
  const STEP = 1 / 120, params = new URLSearchParams(location.search);
  const M = { mode: 'title', time: 0 };
  G.main = M;
  const canvas = document.getElementById('game');
  M.IW = 480; M.IH = C.IH;
  function resize() {
    const w = Math.max(64, window.innerWidth), h = Math.max(64, window.innerHeight);
    const iw = Math.max(360, Math.min(960, Math.round(C.IH * (w / h) / 2) * 2));
    if (iw !== M.IW || !M7.buf) { M.IW = iw; M7.init(iw, C.IH); }
  }
  window.addEventListener('resize', resize);
  M.startRace = function (opt) {
    M.opt = opt; M.demo = false;
    R.start(opt);
    M.mode = 'race';
    if (G.ui) G.ui.hideAll();
    if (G.audio) { G.audio.resume(); G.audio.engine(true); G.audio.music('race', R.tr.world, 0); }
    I.clear();
  };
  M.startDemo = function () {
    const ti = (M.demoTrack = ((M.demoTrack === undefined ? -1 : M.demoTrack) + 1) % 5) * 1;
    R.start({ track: ti, machine: 0, mode: 'gp', diff: 1 });
    R.state = 'race'; R.time = 0; R.P.auto = true; R.P.v = 0; R.demoT = 0; M.demo = true; M.mode = 'title';
  };
  M.pause = function () {
    if (M.mode !== 'race' || R.state === 'done') return;
    M.mode = 'pause'; I.clear();
    if (G.audio) G.audio.suspend();
    if (G.ui) G.ui.show('pause');
  };
  M.resume = function () { if (M.mode !== 'pause') return; M.mode = 'race'; I.clear(); if (G.audio) G.audio.resumeAll(); if (G.ui) G.ui.hideAll(); };
  M.quit = function () { M.mode = 'title'; if (G.audio) { G.audio.resumeAll(); G.audio.engine(false); } M.startDemo(); if (G.audio) G.audio.music('title'); if (G.ui) G.ui.show('title'); };
  let last = 0, acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;                                  /* cap at about 60 fps on 90 / 120 / 144 Hz screens: the loop is fixed-step, so the extra frames only cost battery and heat */
    let dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 1 / 60; if (dt > 0.05) dt = 0.05;
    M.time += dt;
    I.poll(dt);
    if (G.ui && G.ui.isOpen()) G.ui.padNav();
    if (M.mode === 'pause') { if (I.takePause()) M.resume(); render(); return; }
    if (M.mode === 'race') {
      if (I.takePause()) { M.pause(); render(); return; }
      acc += dt;
      while (acc >= STEP) { R.update(STEP, I); acc -= STEP; if (R.state === 'done' && G.flow) { G.flow.raceDone(); break; } }
      R.updateCam(dt);
      if (G.audio) G.audio.engineUpdate(R, dt);
      for (const e of R.events) if (G.audio && G.audio.onEvent) G.audio.onEvent(e);
    } else if (M.mode === 'title' && M.demo) {
      acc += dt; R.demoT += dt;
      while (acc >= STEP) { R.update(STEP, { steer: 0, accel: 0, brake: 0, boost: 0 }); acc -= STEP; }
      R.updateCam(dt);
      if (R.demoT > 40) M.startDemo();
    }
    render();
  }
  function render() {
    if (!R.tr || !M7.buf) return;
    R.draw(M.time);
    if (M.mode === 'race' || M.mode === 'pause') HUD.draw(M7.ctx, M.IW, C.IH, M.time);
  }
  let musicOn = false;
  const kick = () => { if (!G.audio) return; G.audio.resume(); if (!musicOn && M.mode === 'title') { musicOn = true; G.audio.music('title'); } };
  window.addEventListener('pointerdown', kick); window.addEventListener('keydown', kick);
  document.addEventListener('visibilitychange', () => { if (document.hidden) M.pause(); });
  window.addEventListener('blur', () => M.pause());
  function boot() {
    resize();
    if (G.ui) G.ui.init();
    M.startDemo();
    if (G.ui) G.ui.show('title');
    const t = params.get('t');
    if (t !== null) M.startRace({ track: parseInt(t, 10) || 0, machine: parseInt(params.get('m') || '0', 10), mode: params.get('tt') ? 'tt' : 'gp', diff: parseInt(params.get('d') || '1', 10) });
    requestAnimationFrame((n) => { last = n; frame(n); });
  }
  M.boot = boot;
})((window.SGS = window.SGS || {}));
