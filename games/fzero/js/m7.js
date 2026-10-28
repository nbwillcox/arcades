/* Mode-7 style renderer: the track is a flat texture seen through a perspective camera, row by row; sprites are projected and scaled on top. */
(function (G) {
  'use strict';
  const C = G.C, MAP = C.MAP, TAU = Math.PI * 2;
  const M7 = { FOG0: 500, FOG1: 3300 };
  G.m7 = M7;
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  M7.init = function (iw, ih) {
    M7.IW = iw; M7.IH = ih; M7.yh = Math.round(ih * 0.4); M7.F = ih * 0.7;
    if (!M7.cv) { M7.cv = document.getElementById('game') || document.createElement('canvas'); }
    M7.cv.width = iw; M7.cv.height = ih;
    M7.ctx = M7.cv.getContext('2d');
    M7.ctx.imageSmoothingEnabled = false;
    M7.img = M7.ctx.createImageData(iw, ih);
    M7.buf = new Uint32Array(M7.img.data.buffer);
    M7.d = new Float32Array(ih); M7.lvl = new Uint8Array(ih);
  };
  M7.setTrack = function (tex, fog, voidCol) { M7.tex = tex; M7.fog = fog; M7.void = voidCol; };
  /* sky panorama (PW = TAU * F wide) behind the horizon */
  M7.drawSky = function (cam, pano) {
    const ctx = M7.ctx, pw = pano.width, shift = (((cam.ang * (pw / TAU)) % pw) + pw) % pw, x0 = Math.round(M7.IW / 2 - shift);
    for (let x = x0 - pw; x < M7.IW; x += pw) ctx.drawImage(pano, x, M7.yh + 1 - pano.height);
  };
  M7.drawGround = function (cam) {
    const IW = M7.IW, IH = M7.IH, yh = M7.yh, F = M7.F, buf = M7.buf, tex = M7.tex, fog = M7.fog, vd = M7.void;
    const ca = Math.cos(cam.ang), sa = Math.sin(cam.ang), half = IW >> 1, ch = cam.h * F, span = M7.FOG1 - M7.FOG0;
    for (let y = yh + 1; y < IH; y++) {
      const dy = y - yh, d = ch / dy, o = y * IW;
      let lv = Math.floor((d - M7.FOG0) / span * 17); lv = lv < 0 ? 0 : lv > 16 ? 16 : lv;
      if (lv >= 16) { buf.fill(fog, o, o + IW); continue; }
      const sx = -sa * d / F, sy = ca * d / F;
      let u = camX(cam) + ca * d - sx * half, v = camY(cam) + sa * d - sy * half;
      const row = (y & 3) << 2;
      for (let x = 0; x < IW; x++, u += sx, v += sy) {
        if (lv > BAY[row | (x & 3)]) { buf[o + x] = fog; continue; }
        const ui = u | 0, vi = v | 0;
        buf[o + x] = ((ui | vi) >>> 0) < MAP && u >= 0 && v >= 0 ? tex[(vi << 11) + ui] : vd;
      }
    }
    M7.ctx.putImageData(M7.img, 0, 0, 0, yh + 1, IW, IH - yh - 1);
  };
  function camX(c) { return c.x; } function camY(c) { return c.y; }
  /* world -> screen; z is height above the ground. returns null when behind the camera */
  M7.project = function (cam, x, y, z) {
    const dx = x - cam.x, dy = y - cam.y, ca = Math.cos(cam.ang), sa = Math.sin(cam.ang), depth = dx * ca + dy * sa;
    if (depth < 12) return null;
    const lat = -dx * sa + dy * ca, k = M7.F / depth;
    return { sx: M7.IW / 2 + lat * k, sy: M7.yh + (cam.h - z) * k, k, depth };
  };
  /* draw a sprite whose world width is wu (units), standing on the ground at (x, y) at height z */
  M7.sprite = function (cam, img, x, y, z, wu, alpha) {
    const p = M7.project(cam, x, y, z || 0);
    if (!p) return;
    const w = Math.max(1, Math.round(wu * p.k)), h = Math.max(1, Math.round(w * img.height / img.width)), ctx = M7.ctx;
    if (p.sx + w / 2 < 0 || p.sx - w / 2 > M7.IW || p.sy < 0) return;
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = alpha;
    ctx.drawImage(img, Math.round(p.sx - w / 2), Math.round(p.sy - h), w, h);
    if (alpha !== undefined && alpha !== 1) ctx.globalAlpha = 1;
  };
})((window.SGS = window.SGS || {}));
