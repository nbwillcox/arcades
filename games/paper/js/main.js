/* Boot, canvas sizing, fixed-step loop and app modes. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, A = G.audio, I = G.input, Game = G.game, UI = G.ui, Art = G.art;
  const W = C.W, H = C.H, STEP = 1 / 120;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const view = (G.view = { ox: 0, oy: 0, s: 1, w: 0, h: 0, dpr: 1, rs: 1 });
  const params = new URLSearchParams(location.search);
  G.debug = { day: parseInt(params.get('day'), 10) || 0, week: parseInt(params.get('week'), 10) || 0, bot: params.get('bot') === '1', god: params.get('god') === '1', phase: params.get('phase') || '', skip: params.get('skip') === '1' };
  const M = { mode: 'loading', time: 0 };
  G.main = M;

  let qual = 1, ema = 1 / 60, qT = 0;
  function setSize(c, w, h) { w = Math.max(8, w); h = Math.max(8, h); if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; }
  function sizeCanvas() { view.rs = view.dpr * Math.max(0.6, qual); setSize(canvas, Math.round(view.w * view.rs), Math.round(view.h * view.rs)); }
  function adapt(dt) {
    if (dt >= 0.09) return;
    ema += (dt - ema) * 0.04; qT += dt;
    if (qT < 1.2) return;
    qT = 0;
    if (ema > 0.027 && qual > 0.55) { qual = Math.max(0.55, qual - 0.15); sizeCanvas(); }
    else if (ema < 0.019 && qual < 1) { qual = Math.min(1, qual + 0.05); sizeCanvas(); }
  }
  M.quality = () => ({ qual: +qual.toFixed(2), ema: +ema.toFixed(4), canvas: canvas.width + 'x' + canvas.height });
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5), w = Math.max(64, window.innerWidth), h = Math.max(64, window.innerHeight);
    const s = Math.min(w / W, h / H);
    view.w = w; view.h = h; view.dpr = dpr; view.s = s; view.ox = (w - W * s) / 2; view.oy = (h - H * s) / 2;
    if (window.TK) window.TK.layout(view, W, H);
    sizeCanvas();
  }
  window.addEventListener('resize', resize);

  function render() {
    if (canvas.width < 16) { resize(); return; }
    const rs = view.rs;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#090420'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(rs * view.s, 0, 0, rs * view.s, view.ox * rs, view.oy * rs);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    ctx.imageSmoothingEnabled = true;
    G.render.scene(ctx, M.time);
    G.render.hud(ctx, M.time);
    G.render.overlay(ctx, M.time);
    ctx.restore();
    ctx.setTransform(rs, 0, 0, rs, 0, 0);
    ctx.strokeStyle = 'rgba(160,140,255,0.45)'; ctx.lineWidth = 1.5; ctx.strokeRect(view.ox, view.oy, W * view.s, H * view.s);
  }
  M._render = render;

  M.startGame = function () {
    if (M.mode === 'loading') return;
    A.resume(); I.clear();
    Game.onOver = () => { M.mode = 'over'; A.music('stop'); UI.showGameOver(Game.score, Game.week); };
    Game.start({ day: G.debug.day || 1, week: G.debug.week || 1, bot: G.debug.bot, god: G.debug.god, skip: G.debug.skip, phase: G.debug.phase });
    M.mode = 'play'; UI.hideAll(); A.sfx.start();
  };
  M.toTitle = function () {
    Game.onOver = null; A.music('stop');
    Game.reset(true); M.mode = 'title'; UI.lastIdx = -1; UI.show('title');
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    A.music('title');
  };
  M.pause = function () {
    if (M.mode !== 'play' || Game.phase === 'over') return;
    M.mode = 'pause'; I.clear();
    if (A.ctx) A.ctx.suspend();
    UI.show('pause');
  };
  M.resume = function () {
    if (M.mode !== 'pause') return;
    M.mode = 'play'; I.clear(); UI.hideAll();
    if (A.ctx) A.ctx.resume();
  };

  let last = 0, acc = 0, musicKicked = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (M.mode === 'loading') return;
    if (now - last < 10.5) return;
    let dt = (now - last) / 1000; last = now;
    if (!(dt > 0)) dt = 1 / 60;
    if (dt > 0.1) dt = 0.1;
    adapt(dt);
    if (dt > 0.05) dt = 0.05;
    if (!musicKicked && A.ready && M.mode === 'title') { musicKicked = true; A.music('title'); }
    if (M.mode === 'pause') { if (I.takePause()) M.resume(); }
    else {
      acc += dt;
      while (acc >= STEP) {
        if (M.mode === 'play' && I.takePause()) { M.pause(); acc = 0; break; }
        if (M.mode !== 'play') { I.takePause(); I.takeAny(); I._tl = I._tr = I._ta = I._hop = 0; }
        Game.update(STEP); M.time += STEP; acc -= STEP;
      }
    }
    render();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) M.pause(); });
  window.addEventListener('blur', () => M.pause());
  I.bind(canvas);

  function boot() {
    resize();
    const hero = 'assets/hero.webp?v=1', over = 'assets/over.webp?v=1';
    document.getElementById('heroImg').src = hero; document.getElementById('overImg').src = over;
    Art.load().then(() => {
      Game.reset(true); M.mode = 'title'; UI.show('title');
      if (G.debug.day || G.debug.phase || G.debug.bot || G.debug.skip) M.startGame();
    });
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
  boot();
})((window.SGS = window.SGS || {}));
