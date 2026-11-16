// Stick Doosh - render.js (core): world drawing, fallback backdrop, ambient particles, retro pixel filter.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';
  let low = null, lowW = 0, lowH = 0;
  let bgCache = null, bgKey = '';

  function skyGrad(g, th, H) {
    const sk = (th && th.sky) || ['#7fd4ff', '#d9f4ff'];
    const gr = g.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, sk[0]); gr.addColorStop(1, sk[1]);
    return gr;
  }

  // very cheap parallax fallback (used when SGS.Backdrops[theme] is missing)
  function fallbackBackdrop(g, cam, t, W, H, th) {
    const ink = INK;
    const cols = (th && th.accent) ? [th.accent, U.shade(th.accent, -0.2)] : ['#8ac96a', '#5aa04a'];
    for (let layer = 0; layer < 2; layer++) {
      const par = 0.12 + layer * 0.18, off = cam.x * par, base = H * (0.62 + layer * 0.14) - cam.y * 0.05 * (layer + 1);
      g.beginPath(); g.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) g.lineTo(x, base - (Math.sin((x + off) * 0.011 + layer * 2) * 22 + Math.sin((x + off) * 0.027) * 8));
      g.lineTo(W, H); g.closePath();
      g.fillStyle = cols[layer]; g.fill(); g.lineWidth = 2.5; g.strokeStyle = ink; g.stroke();
    }
    // clouds
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.strokeStyle = ink; g.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const cx = ((i * 260 + t * 8 - cam.x * 0.06) % (W + 200) + W + 200) % (W + 200) - 100, cy = 40 + (i * 53) % 110;
      g.beginPath(); g.ellipse(cx, cy, 34, 12, 0, 0, U.TAU); g.ellipse(cx + 20, cy - 8, 22, 12, 0, 0, U.TAU); g.ellipse(cx - 20, cy - 5, 18, 10, 0, 0, U.TAU);
      g.fill(); g.stroke();
    }
  }

  function ambient(g, cam, t, W, H, th) {
    const kind = th && th.ambient; if (!kind) return;
    const mob = S.Main && S.Main.device && S.Main.device.mobile;
    const N = (mob || (S.Main && S.Main.qualityLow)) ? 26 : 48;
    g.save();
    for (let i = 0; i < N; i++) {
      const hx = U.hash(i, 1, 9), hy = U.hash(i, 2, 9), hz = U.hash(i, 3, 9);
      let vx = 0, vy = 0, size = 2, color = '#fff';
      switch (kind) {
        case 'snow': vx = -14; vy = 38 + hz * 30; size = 1.5 + hz * 2.2; color = '#ffffff'; break;
        case 'ash': vx = -10; vy = 22 + hz * 20; size = 1.2 + hz * 1.8; color = i % 3 ? '#4d4458' : '#ffb347'; break;
        case 'leaves': vx = -50 - hz * 30; vy = 22 + hz * 14; size = 2.5 + hz * 2; color = i % 2 ? '#6fcf4a' : '#d9a441'; break;
        case 'bubbles': vx = 0; vy = -26 - hz * 18; size = 1.5 + hz * 3; color = 'rgba(220,245,255,0.8)'; break;
        case 'dust': vx = -22 - hz * 20; vy = 4; size = 1 + hz * 1.4; color = 'rgba(240,225,190,0.7)'; break;
        case 'stars': vx = 0; vy = 0; size = 0.8 + hz * 1.6; color = i % 4 ? '#ffffff' : '#ffe14d'; break;
        case 'pixels': vx = -20; vy = 30 + hz * 20; size = 3; color = i % 2 ? '#ff6ae0' : '#6aeaff'; break;
        default: break;
      }
      const par = 0.6 + hz * 0.6;
      let x = ((hx * W + vx * t - cam.x * par * 0.5) % W + W) % W;
      let y = ((hy * H + vy * t) % H + H) % H;
      if (kind === 'leaves') y += Math.sin(t * 2 + i) * 6;
      if (kind === 'stars') { g.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + i * 3); }
      g.fillStyle = color;
      if (kind === 'pixels' || kind === 'dust') g.fillRect(Math.round(x), Math.round(y), size, size);
      else { g.beginPath(); g.arc(x, y, size, 0, U.TAU); g.fill(); }
      g.globalAlpha = 1;
    }
    g.restore();
  }

  function waterBand(g, cam) {
    const G = S.Game, lv = G.level, w = lv.water;
    if (!w || !S.LevelGen || !S.LevelGen.waterY) return;
    const wy = S.LevelGen.waterY(lv, G.time);
    const x0 = Math.max(cam.x, w.x0), x1 = Math.min(cam.x + cam.w, w.x1);
    if (x1 <= x0) return;
    const bottom = cam.y + cam.h + 10;
    if (wy > bottom) return;
    const ws = S.Terrain.style(S.Terrain.MAT.WATER);
    g.save();
    g.beginPath(); g.moveTo(x0, bottom);
    for (let x = x0; x <= x1; x += 8) g.lineTo(x, wy + Math.sin(x * 0.05 + G.time * 2.2) * 2.4);
    g.lineTo(x1, bottom); g.closePath();
    g.fillStyle = U.rgba(ws.base, 0.42); g.fill();
    g.strokeStyle = INK; g.lineWidth = 2; g.beginPath();
    for (let x = x0; x <= x1; x += 8) { const yy = wy + Math.sin(x * 0.05 + G.time * 2.2) * 2.4; if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy); }
    g.stroke();
    g.restore();
  }

  function windStreaks(g, W, H) {
    const w = S.Game.wind; if (!w || w.phase !== 'gust' || !w.k) return;
    const t = S.Game.time;
    g.save(); g.strokeStyle = 'rgba(255,255,255,' + (0.5 * w.k) + ')'; g.lineWidth = 2; g.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const y = U.hash(i, 5, 2) * H, ph = (t * 1.6 + U.hash(i, 6, 2)) % 1, x = (w.dir > 0 ? ph : 1 - ph) * (W + 160) - 80, l = 50 + U.hash(i, 7, 2) * 60;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - w.dir * l, y + Math.sin(i) * 3); g.stroke();
    }
    g.restore();
  }

  function drawWorld(g, cam, W, H, retro) {
    const G = S.Game, th = G.themeObj, t = G.time;
    g.fillStyle = skyGrad(g, th, H); g.fillRect(0, 0, W, H);
    const bd = S.Backdrops && (S.Backdrops[th.id] || S.Backdrops.default);
    if (typeof bd === 'function') { try { bd(g, cam, t, W, H); } catch (e) { fallbackBackdrop(g, cam, t, W, H, th); if (!bd._warned) { bd._warned = 1; console.error('[Backdrop]', e); } } }
    else fallbackBackdrop(g, cam, t, W, H, th);
    const sx = retro ? 3 : 1;
    const cx = Math.round((cam.x - S.FX.shakeX) / sx) * sx, cy = Math.round((cam.y - S.FX.shakeY) / sx) * sx;
    g.save();
    g.translate(-cx, -cy);
    S.Terrain.draw(g, cam, 'back');   // back walls first, so deco (torches, banners, lamps) sits on top of them
    if (S.Backdrops && S.Backdrops.deco && G.level.deco) { try { S.Backdrops.deco(g, G.level, cam, t); } catch (e) { /* ignore */ } }
    S.Terrain.draw(g, cam, 'front');
    waterBand(g, cam);
    G.drawEntities(g);
    S.Shots.draw(g, cam);
    S.FX.draw(g, cam);
    if (S.Comic) S.Comic.draw(g, cam);
    g.restore();
  }

  const Render = S.Render = {
    frame(ctx, W, H) {
      const G = S.Game;
      if (!G.level || !G.player) { ctx.fillStyle = '#141018'; ctx.fillRect(0, 0, W, H); return; }
      const th = G.themeObj, cam = G.cam;
      const retro = !!th.retro;
      cam.w = W; cam.h = H;
      if (retro) {
        const lw = Math.ceil(W / 3), lh = Math.ceil(H / 3);
        if (!low || lowW !== lw || lowH !== lh) { low = document.createElement('canvas'); low.width = lowW = lw; low.height = lowH = lh; }
        const g = low.getContext('2d');
        g.setTransform(1 / 3, 0, 0, 1 / 3, 0, 0); g.imageSmoothingEnabled = false;
        S.Terrain.setScale(1, 1 / 3);
        drawWorld(g, cam, W, H, true);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(low, 0, 0, lw, lh, 0, 0, lw * 3, lh * 3);
        ctx.imageSmoothingEnabled = true;
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let y = 0; y < H; y += 3) ctx.fillRect(0, y + 2, W, 1);
      } else {
        S.Terrain.setScale(Math.min(1.5, (S.Main && S.Main.scale) || 1), 0);
        drawWorld(ctx, cam, W, H, false);
      }
      ambient(ctx, cam, G.time, W, H, th);
      windStreaks(ctx, W, H);
      S.FX.drawTop(ctx, W, H);
      if (S.HUD) S.HUD.draw(ctx, W, H);
      if (S.HUD && S.HUD.drawAim) S.HUD.drawAim(ctx, W, H); // aim: crosshair / aim arrow
      if (S.Input) S.Input.drawTouch(ctx, W, H);
    },
  };
})();
