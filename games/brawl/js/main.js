/* Boot, the paper-and-pencil render pipeline, the fixed-step loop and the app modes. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, A = G.audio, I = G.input, Game = G.game, UI = G.ui, HUD = G.hud, ART = G.art, F = G.fighter, E = G.enemies;
  const W = C.W, H = C.H, STEP = 1 / 60;
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const view = (G.view = { ox: 0, oy: 0, s: 1, w: 0, h: 0, dpr: 1, k: 1 });
  const M = { mode: 'title' };
  G.main = M;
  let paper = null, paperF = 0, paperPat = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = Math.max(64, window.innerWidth), h = Math.max(64, window.innerHeight);
    const s = Math.min(w / W, h / H);
    view.w = w; view.h = h; view.dpr = dpr; view.s = s;
    view.ox = (w - W * s) / 2; view.oy = (h - H * s) / 2;
    if (window.TK) window.TK.layout(view, W, H);                           /* touch layout: phones get a lower pixel ratio */
    view.k = s * view.dpr;
    canvas.width = Math.round(w * view.dpr); canvas.height = Math.round(h * view.dpr);
    const f = U.clamp(Math.ceil(view.k), 1, 3);
    if (f !== paperF) { paperF = f; paper = ART.paperTile(f); paperPat = ctx.createPattern(paper, 'repeat'); }
    Game.ensureBackdrop(f);
  }
  window.addEventListener('resize', resize);

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = paperPat || C.PAPER; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const k = view.k;
    ctx.setTransform(k, 0, 0, k, view.ox * view.dpr, view.oy * view.dpr);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    if (FX.shake > 0) ctx.translate(U.rand(-FX.shake, FX.shake), U.rand(-FX.shake, FX.shake) * 0.6);
    Game.render(ctx);
    ctx.restore();
    /* soft paper vignette and the pencil frame */
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
    g.addColorStop(0, 'rgba(120,95,50,0)'); g.addColorStop(1, 'rgba(120,95,50,0.2)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (M.mode === 'play' || M.mode === 'pause') HUD.draw(ctx, Game);
    ctx.restore();
    ART.graphite(ctx, [1, 1, W - 1, 1, W - 1, H - 1, 1, H - 1, 1, 1], 2, 0.9);
  }

  M.render = render;                                    /* dev: lets a test harness step the game by hand when rAF is throttled */

  /* ---------- app modes ---------- */
  M.startGame = function () {
    A.resume(); I.clear();
    G.debug.lab = G.debug.lab && true;
    Game.stage = Math.min(G.debug.level || 0, G.level.list.length - 1);
    Game.reset(false);
    Game.onOver = (v) => { M.mode = 'over'; A.stopMusic(); UI.showGameOver(Game.score, Game.stage + 1, v); };
    M.mode = 'play'; A.demo = false;
    UI.hideAll();
    A.music(Game.level.music);
    A.sfx.start();
    resize();
  };
  M.toTitle = function () {
    Game.onOver = null;
    Game.reset(true);
    titleScene();
    M.mode = 'title'; A.demo = true;
    UI.lastIdx = -1;
    UI.show('title');
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    A.music('title');
    resize();
  };
  /* a fixed little scene behind the title menu: the hero squaring up to a thug and a masked bandit */
  function titleScene() {
    const p = Game.player;
    p.x = 170; p.y = 222; p.face = 1;
    const a = E.create(Game, 'thug', 330, 214), b = E.create(Game, 'masked', 372, 238);
    a.face = b.face = -1; a.entered = b.entered = true;
    Game.enemies.push(a, b);
    Game.camX = 0;
  }
  /* the end-of-game picture behind the score screen: a cheering hero or a flattened one */
  let tabT = 0;
  M.tableau = function (win) {
    Game.enemies.length = 0; Game.projs.length = 0; Game.items.length = 0; Game.props.length = 0;
    const p = Game.player; p.x = Game.camX + 86; p.y = 236; p.face = 1; p.weapon = null; p.z = 0;
    Game.tab = win ? 'win' : 'lose'; tabT = 0;
    if (win) { p.state = 'idle'; p.poseOverride = 'cheer'; p.hp = p.maxhp; p.inv = 0; }
    else { p.state = 'dead'; p.deadT = 0; }
  };
  function tableauTick(dt) {
    tabT += dt; const p = Game.player; p.clock += dt;
    if (Game.tab === 'win') { p.z = Math.abs(Math.sin(tabT * 5)) * 7; if (Math.random() < dt * 8) FX.stars(p.x + U.rand(-50, 50), p.y, 30 + U.rand(0, 40), 1); }
    else if (Game.tab === 'lose' && Math.random() < dt * 1.6) FX.stars(p.x, p.y, 10, 1);
  }
  M.pause = function () {
    if (M.mode !== 'play') return;
    M.mode = 'pause'; I.clear();
    if (A.ctx) A.ctx.suspend();
    UI.show('pause');
  };
  M.resume = function () {
    if (M.mode !== 'pause') return;
    M.mode = 'play'; I.resync(); UI.hideAll();
    if (A.ctx) A.ctx.resume();
  };

  let last = 0, acc = 0, musicKicked = false;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 1 / 60;
    if (dt > 0.1) dt = 0.1;
    I.poll();
    if (!musicKicked && A.ready && M.mode === 'title') { musicKicked = true; A.music('title'); }
    if (M.mode === 'pause') { if (I.takePause()) M.resume(); }
    else if (M.mode === 'play') {
      acc += dt;
      while (acc >= STEP) {
        if (I.takePause()) { M.pause(); acc = 0; break; }
        Game.update(STEP);
        acc -= STEP;
      }
    } else if (M.mode === 'title') { I.takePause(); acc += dt; while (acc >= STEP) { Game.demoUpdate(STEP); acc -= STEP; } }
    else { I.takePause(); acc = 0; if (M.mode === 'over') { FX.update(dt); tableauTick(dt); } }
    render();
  }

  document.addEventListener('visibilitychange', () => { if (document.hidden) M.pause(); });
  window.addEventListener('blur', () => M.pause());
  I.bind(canvas);

  function boot() {
    UI.init(M); A.demo = true;
    Game.reset(true);
    titleScene();
    resize();
    UI.show('title');
    if (G.debug.lab || new URLSearchParams(location.search).get('play') === '1') { M.startGame(); }
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
  boot();
  G.dev = { Game, M, F, E };
})((window.SGS = window.SGS || {}));
