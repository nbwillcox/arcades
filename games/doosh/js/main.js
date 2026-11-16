// Stick Doosh - main.js (core): boot, device detection, resize, 60fps loop, adaptive quality, URL flags, test hooks.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  let canvas = null, ctx = null, last = 0, emaMs = 16, slowN = 0, fastN = 0, needRender = true, booted = false;

  function parseFlags() {
    const q = new URLSearchParams(location.search), f = {};
    for (const [k, v] of q.entries()) f[k] = v === '' ? '1' : v;
    ['boss', 'god', 'touch', 'fps', 'nomusic', 'beatall'].forEach((k) => { if (f[k] !== undefined) f[k] = f[k] !== '0'; });
    return f;
  }

  const Main = S.Main = {
    mode: 'menu', W: 800, H: C.VIEW_H, scale: 1, dpr: 1, res: 1, cssW: 800, cssH: 450,
    device: { touch: false, mobile: false, low: false }, flags: {}, qualityLow: false, frameMs: 16,
    detect() {
      const coarse = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
      const touch = !!Main.flags.touch || coarse || (navigator.maxTouchPoints > 0 && 'ontouchstart' in window && !matchMedia('(hover: hover)').matches);
      const small = Math.min(screen.width, screen.height) < 900;
      Main.device.touch = touch;
      Main.device.mobile = touch && small || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
      Main.device.low = Main.device.mobile;
    },
    resize() {
      if (!canvas) return;
      const iw = window.innerWidth || 800, ih = window.innerHeight || 450;
      const W = U.clamp(Math.round(iw / ih * C.VIEW_H), C.VIEW_W_MIN, C.VIEW_W_MAX);
      let cssH = ih, cssW = ih * W / C.VIEW_H;
      if (cssW > iw) { cssW = iw; cssH = iw * C.VIEW_H / W; }
      const q = S.Save ? S.Save.settings.video.quality : 'auto';
      let res = Main.res;
      if (q === 'low') res = 0.7; else if (q === 'high') res = 1;
      const dprCap = Main.device.touch ? 1.25 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      Main.dpr = dpr;
      const pxH = Math.max(120, Math.round(cssH * dpr * res));
      const scale = pxH / C.VIEW_H;
      canvas.style.width = Math.round(cssW) + 'px'; canvas.style.height = Math.round(cssH) + 'px';
      const pw = Math.round(W * scale);
      if (canvas.width !== pw || canvas.height !== pxH) { canvas.width = pw; canvas.height = pxH; }
      Main.W = W; Main.H = C.VIEW_H; Main.scale = scale; Main.cssW = cssW; Main.cssH = cssH;
      Main.qualityLow = q === 'low' || (q === 'auto' && res < 0.8);
      needRender = true;
    },
    // one logic frame (also the test hook: loop Main.step(1/120) when rAF is paused)
    step(dt) {
      const I = S.Input;
      I.update();
      if (Main.mode === 'play') {
        let n = dt > 0.034 ? Math.ceil(dt / 0.0167) : 1;
        const sub = dt / n;
        for (let i = 0; i < n && Main.mode === 'play'; i++) S.Game.update(sub);
      }
      I.endFrame();
    },
    render() {
      if (!ctx) return;
      ctx.setTransform(Main.scale, 0, 0, Main.scale, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if (S.Game && S.Game.level && S.Game.player && S.Game.state !== 'none') {
        try { S.Render.frame(ctx, Main.W, Main.H); } catch (e) { if (!Main._renderErr) { Main._renderErr = 1; console.error('[render]', e); } }
      } else { ctx.fillStyle = '#141018'; ctx.fillRect(0, 0, Main.W, Main.H); }
      needRender = false;
    },
    toast(msg) {
      if (S.UI && S.UI.toast) { try { S.UI.toast(msg); return; } catch (e) { /* fall through */ } }
      const t = document.getElementById('toast'); if (!t) return;
      t.textContent = msg; t.classList.add('show'); clearTimeout(Main._tt); Main._tt = setTimeout(() => t.classList.remove('show'), 2200);
    },
    boot() {
      if (booted) return; booted = true;
      canvas = document.getElementById('game'); ctx = canvas.getContext('2d', { alpha: false });
      S.Save.load();
      Main.flags = parseFlags();
      Main.detect();
      const F = Main.flags;
      if (F.beatall) { ['ice', 'fire', 'wind', 'water', 'mud', 'jungle', 'mountain', 'plains', 'fantasy', 'moon', 'retro'].forEach((k) => { S.Save.data.beaten[k] = true; }); }
      if (F.gold !== undefined && !isNaN(+F.gold)) S.Save.data.gold = +F.gold;
      S.Input.init(canvas);
      if (S.Audio && S.Audio.init) { try { S.Audio.init(); } catch (e) { console.error('[Audio.init]', e); } }
      S.Input.onCheatSeq((code) => { const m = S.Input.applyCheat(code); if (m) Main.toast(m); });
      const unlock = () => { if (S.Audio && S.Audio.unlock) S.Audio.unlock(); };
      window.addEventListener('keydown', unlock, { once: false, passive: true }); window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('resize', () => Main.resize());
      window.addEventListener('orientationchange', () => setTimeout(() => Main.resize(), 200));
      window.addEventListener('sgs:settings', () => { Main.resize(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden && Main.mode === 'play' && S.Game) S.Game.pause(); });
      Main.resize();
      if (S.UI && S.UI.init) { try { S.UI.init(); } catch (e) { console.error('[UI.init]', e); } }
      const ld = document.getElementById('loading'); if (ld) ld.classList.add('gone');
      if (F.level) S.Game.start(F.level);
      else if (!S.UI) S.Game.start('ice');
      requestAnimationFrame(frame);
    },
  };

  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < 10.5) return;
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1;
    const ms = dt * 1000;
    Main.frameMs = Main.frameMs * 0.9 + ms * 0.1;
    Main.step(dt);
    if (Main.mode === 'play' || needRender) Main.render();
    // adaptive resolution (only while playing, only when quality = auto)
    if (Main.mode === 'play' && S.Save && S.Save.settings.video.quality === 'auto') {
      emaMs = emaMs * 0.95 + ms * 0.05;
      if (emaMs > 24) { slowN++; fastN = 0; } else if (emaMs < 15) { fastN++; slowN = 0; } else { slowN = 0; fastN = 0; }
      if (slowN > 90 && Main.res > 0.55) { Main.res = Math.max(0.55, Main.res - 0.15); slowN = 0; Main.resize(); }
      else if (fastN > 900 && Main.res < 1) { Main.res = Math.min(1, Main.res + 0.15); fastN = 0; Main.resize(); }
    }
  }

  if (typeof document !== 'undefined') { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Main.boot); else Main.boot(); }
})();
