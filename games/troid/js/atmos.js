/* Atmosphere: ambient particles per zone (motes, snow, embers, bubbles, spores), a soft screen vignette and a warm glow over lava. Cosmetic only. */
(function (G) {
  'use strict';
  const A = {};
  G.atmos = A;
  const KIND = { 1: 'motes', 2: 'snow', 3: 'embers', 4: 'bubbles', 5: 'spores' };
  const W = 480, H = 270;
  let parts = [], kind = 'motes', vig = null, seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const spawn = (p, cam, anywhere) => {
    p.x = cam.x - 20 + rnd() * (W + 40); p.y = cam.y - 20 + rnd() * (H + 40);
    if (!anywhere) { if (kind === 'snow') p.y = cam.y - 8; else if (kind === 'embers' || kind === 'bubbles') p.y = cam.y + H + 8; }
    p.near = rnd() < 0.4; p.ph = rnd() * 6.28; p.sp = 0.5 + rnd(); p.a = 0.4 + rnd() * 0.6;
    p.c = kind === 'embers' ? ['#ffb040', '#ff7a28', '#ffd870', '#ff5a20'][(rnd() * 4) | 0] : kind === 'spores' ? ['#f070b0', '#a0f0a0', '#f0a0d8'][(rnd() * 3) | 0] : kind === 'motes' ? ['#f0f0a0', '#b8e890', '#fff4c0'][(rnd() * 3) | 0] : kind === 'snow' ? '#eaf8ff' : '#bfe8ff';
  };
  A.reset = function (g) {
    kind = KIND[g.room.zone || 1] || 'motes';
    const wet = g.room.water && g.room.water.length > 8;
    const n = kind === 'bubbles' ? (wet ? 36 : 10) : kind === 'snow' ? 70 : kind === 'embers' ? 46 : 34;
    parts = []; for (let i = 0; i < n; i++) { const p = {}; spawn(p, g.cam, true); parts.push(p); }
  };
  A.update = function (g) {
    const cam = g.cam, t = g.time * 0.03;
    for (const p of parts) {
      if (kind === 'snow') { p.y += 0.35 + p.sp * 0.4; p.x += Math.sin(t * 2 + p.ph) * 0.35 - 0.1; }
      else if (kind === 'embers') { p.y -= 0.25 + p.sp * 0.45; p.x += Math.sin(t * 3 + p.ph) * 0.3; }
      else if (kind === 'bubbles') { p.y -= 0.3 + p.sp * 0.3; p.x += Math.sin(t * 4 + p.ph) * 0.25; }
      else { p.x += Math.sin(t + p.ph) * 0.25; p.y += Math.cos(t * 0.8 + p.ph * 1.3) * 0.2 - (kind === 'spores' ? 0.04 : 0); }
      if (p.x < cam.x - 24 || p.x > cam.x + W + 24 || p.y < cam.y - 24 || p.y > cam.y + H + 24) spawn(p, cam, false);
    }
  };
  A.draw = function (ctx, g, layer, time) {
    const room = g.room, RM = G.room;
    for (const p of parts) {
      if ((p.near ? 1 : 0) !== layer) continue;
      const tx = Math.floor(p.x / 16), ty = Math.floor(p.y / 16);
      if (RM.at(room, tx, ty) === 1) continue;                                   /* not inside solid rock */
      const x = Math.round(p.x), y = Math.round(p.y), s = p.near ? 2 : 1;
      let a = p.a * (p.near ? 0.9 : 0.55);
      if (kind === 'motes' || kind === 'spores') a *= 0.5 + 0.5 * Math.sin(time * 2.2 + p.ph);
      ctx.globalAlpha = Math.max(0, Math.min(1, a)); ctx.fillStyle = p.c;
      if (kind === 'bubbles') { ctx.fillRect(x, y, 1, 1); if (p.near) { ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x, y + 2, 1, 1); } }
      else ctx.fillRect(x, y, s, s);
    }
    ctx.globalAlpha = 1;
  };
  /* soft dark edges, pre-rendered once as stepped rings so the pixel look is kept */
  A.vignette = function (ctx) {
    if (!vig) {
      vig = document.createElement('canvas'); vig.width = W; vig.height = H; const x = vig.getContext('2d');
      for (let i = 0; i < 8; i++) { const a = 0.07 * (8 - i) / 8; x.fillStyle = 'rgba(2,3,14,' + a.toFixed(3) + ')'; const d = i * 7; x.fillRect(0, d, W, 7); x.fillRect(0, H - d - 7, W, 7); x.fillRect(d, 0, 7, H); x.fillRect(W - d - 7, 0, 7, H); }
    }
    ctx.drawImage(vig, 0, 0);
  };
  /* warm light spilling up from lava surface tiles (additive, stepped) */
  A.lavaGlow = function (ctx, room, ox, oy) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const l of room.lava) {
      if (!l.top) continue;
      const lx = l.tx * 16, ly = l.ty * 16; if (lx + 16 < ox || lx > ox + W || ly < oy - 8 || ly > oy + H + 24) continue;
      ctx.fillStyle = 'rgba(255,110,30,0.10)'; ctx.fillRect(lx - 2, ly - 8, 20, 8);
      ctx.fillStyle = 'rgba(255,110,30,0.06)'; ctx.fillRect(lx - 4, ly - 18, 24, 10);
      ctx.fillStyle = 'rgba(255,110,30,0.03)'; ctx.fillRect(lx - 6, ly - 30, 28, 12);
    }
    ctx.restore();
  };
})((window.SGS = window.SGS || {}));
