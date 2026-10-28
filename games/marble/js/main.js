/* Boot, render pipeline (space backdrop -> scene -> bloom -> HUD), fixed-step loop and app modes. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, GFX = G.gfx, A = G.audio, I = G.input, Game = G.game, UI = G.ui, HUD = G.hud, R = G.render;
  const STEP = 1 / 120;
  const mk = () => document.createElement('canvas');
  const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
  const scene = mk(), sctx = scene.getContext('2d');
  const b1 = mk(), b2 = mk(), b3 = mk();
  const bctx = [b1.getContext('2d'), b2.getContext('2d'), b3.getContext('2d')];
  const view = (G.view = { w: 0, h: 0, dpr: 1, ps: 1, rs: 1 });
  const bg = { stars: [], t: 0 };
  const M = { mode: 'title' };
  G.main = M;

  function initStars() {
    const n = U.clamp(Math.round(view.w * view.h / 5200), 100, 520);
    bg.stars = [];
    for (let i = 0; i < n; i++) bg.stars.push({ x: Math.random(), y: Math.random(), z: Math.random(), tw: Math.random() * 6 });
  }
  /* adaptive resolution: if frames run long the canvas renders at a lower internal resolution and bloom drops out; both recover when there is headroom */
  let qual = 1, ema = 1 / 60, qT = 0;
  function setSize(c, w, h) { w = Math.max(8, w); h = Math.max(8, h); if (c.width !== w) c.width = w; if (c.height !== h) c.height = h; }
  function sizeScene() {
    view.rs = view.dpr * Math.max(0.6, qual);
    setSize(canvas, Math.round(view.w * view.rs), Math.round(view.h * view.rs));
    view.ps = Math.min(view.rs, 1.5);
    setSize(scene, Math.round(view.w * view.ps), Math.round(view.h * view.ps));
    setSize(b1, scene.width >> 1, scene.height >> 1);
    setSize(b2, scene.width >> 2, scene.height >> 2);
    setSize(b3, scene.width >> 3, scene.height >> 3);
  }
  function adapt(dt) {
    if (dt >= 0.09) return;
    ema += (dt - ema) * 0.04; qT += dt;
    if (qT < 1.2) return;
    qT = 0;
    if (ema > 0.027 && qual > 0.55) { qual = Math.max(0.55, qual - 0.15); sizeScene(); }
    else if (ema < 0.019 && qual < 1) { qual = Math.min(1, qual + 0.05); sizeScene(); }
    M.bloomOn = !(qual <= 0.6 && ema > 0.03);
  }
  M.quality = () => ({ qual: +qual.toFixed(2), ema: +ema.toFixed(4), rs: +view.rs.toFixed(2), canvas: canvas.width + 'x' + canvas.height, bloom: M.bloomOn !== false });
  const BGK = 0.5;
  const bgc = mk(), bgx = bgc.getContext('2d'), bgt = { hue: -1, pa: null, planet: null, level: null };
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, window.TK && window.TK.on ? 1.25 : 1.5), w = Math.max(64, window.innerWidth), h = Math.max(64, window.innerHeight);
    view.w = w; view.h = h; view.dpr = dpr;
    sizeScene();
    setSize(bgc, Math.ceil(w * BGK), Math.ceil(h * BGK)); bgt.hue = -1;
    initStars();
  }
  window.addEventListener('resize', resize);

  function bgTile(src, k) {
    const c = mk(); c.width = Math.round(src.width * k); c.height = Math.round(src.height * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  /* the backdrop drifts with the camera at a fraction of its speed, so the tracks feel like they float in front of it */
  function drawBackground(dt) {
    const w = view.w, h = view.h, lv = Game.level;
    const hue = lv ? lv.theme.hue : 200;
    if (hue !== bgt.hue || bgt.level !== lv) {
      bgt.hue = hue; bgt.level = lv;
      bgt.pa = bgx.createPattern(bgTile(GFX.nebula(hue), BGK), 'repeat');
      bgt.pb = bgx.createPattern(bgTile(GFX.nebula(hue + 50), BGK * 1.6), 'repeat');
      bgt.planet = GFX.planet(hue + 20, (lv ? lv.id : 1));
      bgt.px = 0.18 + Math.random() * 0.5;
    }
    const c = Game.cam, camX = (c.x - c.y) * 0.9, camY = (c.x + c.y) * 0.45 - c.z * 0.6;
    bgx.setTransform(1, 0, 0, 1, 0, 0);
    bgx.save(); bgx.translate(((-camX * 0.05 * BGK) % 512 + 512) % 512, ((-camY * 0.05 * BGK) % 512 + 512) % 512 - 512 * BGK * 0); bgx.fillStyle = bgt.pa; bgx.fillRect(-512, -512, bgc.width + 1024, bgc.height + 1024); bgx.restore();
    bgx.save(); bgx.globalCompositeOperation = 'lighter'; bgx.globalAlpha = 0.5; bgx.translate(((-camX * 0.1 * BGK) % 820 + 820) % 820, ((-camY * 0.1 * BGK) % 820 + 820) % 820); bgx.fillStyle = bgt.pb; bgx.fillRect(-820, -820, bgc.width + 1640, bgc.height + 1640); bgx.restore();
    ctx.setTransform(view.rs, 0, 0, view.rs, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(bgc, 0, 0, w, h);
    /* planet */
    if (bgt.planet) {
      const s = Math.min(w, h) * 0.55, px = w * bgt.px - camX * 0.03, py = h * 0.2 - camY * 0.03;
      ctx.globalAlpha = 0.9; ctx.drawImage(bgt.planet, px - s / 2, py - s / 2, s, s); ctx.globalAlpha = 1;
    }
    bg.t += dt * (S.reduced ? 0.3 : 1);
    for (const st of bg.stars) {
      const par = 0.02 + st.z * st.z * 0.12;
      let x = ((st.x * w - camX * par) % w + w) % w, y = ((st.y * h - camY * par) % h + h) % h;
      const tw = 0.65 + 0.35 * Math.sin(st.tw + bg.t * (1 + st.z));
      ctx.globalAlpha = (0.25 + st.z * 0.75) * tw;
      ctx.fillStyle = st.z > 0.85 ? '#bfe6ff' : st.z > 0.5 ? '#ffffff' : '#9db4e6';
      const sz = 0.7 + st.z * 1.9;
      ctx.fillRect(x, y, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  function render(dt) {
    if (scene.width < 16 || scene.height < 16) { resize(); return; }
    drawBackground(dt);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(0, 0, scene.width, scene.height);
    sctx.setTransform(view.ps, 0, 0, view.ps, 0, 0);
    sctx.imageSmoothingEnabled = true;
    Game.render(sctx, view.w, view.h, view.ps);
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.setTransform(view.rs, 0, 0, view.rs, 0, 0);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
    ctx.drawImage(scene, 0, 0, view.w, view.h);
    if (S.bloom && M.bloomOn !== false) {
      bctx[0].clearRect(0, 0, b1.width, b1.height); bctx[0].drawImage(scene, 0, 0, b1.width, b1.height);
      bctx[1].clearRect(0, 0, b2.width, b2.height); bctx[1].drawImage(b1, 0, 0, b2.width, b2.height);
      bctx[2].clearRect(0, 0, b3.width, b3.height); bctx[2].drawImage(b2, 0, 0, b3.width, b3.height);
      bctx[1].globalCompositeOperation = 'lighter'; bctx[1].globalAlpha = 0.85; bctx[1].drawImage(b3, 0, 0, b2.width, b2.height);
      bctx[1].globalAlpha = 1; bctx[1].globalCompositeOperation = 'source-over';
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.4; ctx.drawImage(b2, 0, 0, view.w, view.h);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    /* vignette keeps the eye on the middle */
    const vg = ctx.createRadialGradient(view.w / 2, view.h / 2, Math.min(view.w, view.h) * 0.35, view.w / 2, view.h / 2, Math.max(view.w, view.h) * 0.75);
    vg.addColorStop(0, 'rgba(2,3,12,0)'); vg.addColorStop(1, 'rgba(2,3,12,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, view.w, view.h);
    HUD.draw(ctx, Game, view.w, view.h);
    if (FX.flash > 0) { ctx.fillStyle = 'rgba(' + FX.flashColor + ',' + Math.min(0.75, FX.flash * 0.7) + ')'; ctx.fillRect(0, 0, view.w, view.h); }
  }

  /* ---------- app modes ---------- */
  M.afterStart = function () { A.resume(); I.clear(); M.mode = 'play'; UI.hideAll(); updateRecenter(); };
  M.startRace = function (i) {
    I.requestTilt();
    A.resume();
    Game.startRace(i);
    wire();
    M.afterStart();
  };
  function wire() {
    Game.onOver = (v) => { M.mode = 'over'; A.music(null); UI.showGameOver(Game.score, Game.level.id, v); };
    Game.onLevelEnd = (r) => { M.mode = 'levelend'; UI.showLevelEnd(r); };
  }
  M.nextRace = function () {
    if (!Game.result || Game.result.last) { Game.onOver && Game.onOver(true); return; }
    Game.nextLevel(); wire(); M.afterStart();
  };
  M.replayRace = function () { Game.score = Game.scoreAtStart; Game.carry = Game.carryAtStart; Game.loadLevel(Game.idx, Game.carry); Game.beginRace(); wire(); M.afterStart(); };
  M.restartRace = function () { Game.restartRace(); wire(); M.afterStart(); };
  M.toTitle = function () {
    Game.onOver = null; Game.onLevelEnd = null;
    Game.reset(true);
    M.mode = 'title';
    UI.lastIdx = -1;
    UI.show('title');
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
    A.silenceRoll();
    A.music('title');
  };
  M.pause = function () {
    if (M.mode !== 'play') return;
    M.mode = 'pause';
    I.clear();
    A.silenceRoll();
    if (A.ctx) A.ctx.suspend();
    UI.show('pause');
  };
  M.resume = function () {
    if (M.mode !== 'pause') return;
    M.mode = 'play';
    I.resync();
    UI.hideAll();
    if (A.ctx) A.ctx.resume();
    updateRecenter();
  };
  function updateRecenter() {
    const show = M.mode === 'play' && !Game.demo && I.usingTilt();
    document.getElementById('recenter').classList.toggle('hidden', !show);
  }

  let last = 0, acc = 0, musicKicked = false;
  M._render = (dt) => render(dt);
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;                                  /* cap at about 60 fps on fast screens: the loop is fixed-step, so extra frames only cost battery */
    let dt = (now - last) / 1000;
    last = now;
    if (!(dt > 0)) dt = 1 / 60;
    if (dt > 0.1) dt = 0.1;
    adapt(dt);
    if (dt > 0.05) dt = 0.05;
    I.poll();
    if (!musicKicked && A.ready && M.mode === 'title') { musicKicked = true; A.music('title'); }
    if (M.mode === 'pause') { if (I.takePause()) M.resume(); }
    else {
      if (M.mode === 'play' && I.takePause()) { M.pause(); acc = 0; }
      else {
        if (M.mode === 'play' && I.takeRestart() && !Game.demo) M.restartRace();
        I.takeRestart();
        acc += dt;
        while (acc >= STEP) {
          if (M.mode !== 'play') I.takePause();
          Game.update(STEP);
          acc -= STEP;
        }
      }
    }
    if (M.mode === 'play' && (frameN++ & 15) === 0) updateRecenter();
    render(dt);
  }
  let frameN = 0;

  document.addEventListener('visibilitychange', () => { if (document.hidden) M.pause(); });
  window.addEventListener('blur', () => M.pause());

  I.bind(canvas);
  function boot() {
    GFX.init();
    UI.init(M);
    resize();
    Game.reset(true);
    UI.show('title');
    if (G.debug.level) { M.startRace(G.debug.level - 1); }
    requestAnimationFrame((t) => { last = t; frame(t); });
  }
  boot();
})((window.SGS = window.SGS || {}));
