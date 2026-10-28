/* Procedural art: the astronaut frog, space traffic, drifting platforms, hazards and the lane backdrops. Everything is cached. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly, flashOf = GFX.flashOf;
  const A = {};
  GFX.art = A;
  const T = C.TILE;

  const ZONES = [{ h: 200, name: 'ASTEROID BELT' }, { h: 272, name: 'ION STORM' }, { h: 318, name: 'NEON NEBULA' }, { h: 24, name: 'EMBER RIFT' }, { h: 140, name: 'GREEN DRIFT' }];
  A.ZONES = ZONES;
  function rrect(x, x0, y0, w, h, r) {
    x.beginPath(); x.moveTo(x0 + r, y0); x.lineTo(x0 + w - r, y0); x.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); x.lineTo(x0 + w, y0 + h - r);
    x.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); x.lineTo(x0 + r, y0 + h); x.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); x.lineTo(x0, y0 + r); x.quadraticCurveTo(x0, y0, x0 + r, y0); x.closePath();
  }
  A.rrect = rrect;

  /* ---- the frog (facing up) ---- */
  function drawFrog(x) {
    x.shadowColor = 'rgba(120,255,110,0.9)'; x.shadowBlur = 7;
    x.fillStyle = lg(x, 0, -14, 0, 16, [[0, '#c8ff9a'], [0.5, '#5fe04a'], [1, '#1d7a2a']]);
    x.beginPath(); x.ellipse(-12, 9, 6, 9, -0.4, 0, TAU); x.ellipse(12, 9, 6, 9, 0.4, 0, TAU); x.fill();
    x.beginPath(); x.ellipse(-10, -8, 4, 7, 0.5, 0, TAU); x.ellipse(10, -8, 4, 7, -0.5, 0, TAU); x.fill();
    x.beginPath(); x.ellipse(0, 2, 11, 15, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#d6ffbf'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#eaffd8'; x.beginPath(); x.arc(-6, -11, 5, 0, TAU); x.arc(6, -11, 5, 0, TAU); x.fill();
    x.fillStyle = '#10261a'; x.beginPath(); x.arc(-6, -12, 2.4, 0, TAU); x.arc(6, -12, 2.4, 0, TAU); x.fill();
    x.fillStyle = 'rgba(40,120,50,0.7)'; x.beginPath(); x.arc(-3, 9, 1.6, 0, TAU); x.arc(3, 5, 1.6, 0, TAU); x.arc(-2, 2, 1.2, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(160,235,255,0.9)'; x.lineWidth = 1.6; x.beginPath(); x.arc(0, -3, 17, 0, TAU); x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.ellipse(-8, -12, 3, 6, 0.7, 0, TAU); x.fill();
  }
  function drawFriend(x) {
    x.shadowColor = 'rgba(255,150,230,0.9)'; x.shadowBlur = 6;
    x.fillStyle = lg(x, 0, -9, 0, 10, [[0, '#ffd0f0'], [0.5, '#ff7ad0'], [1, '#8a1f6a']]);
    x.beginPath(); x.ellipse(-8, 6, 4, 6, -0.4, 0, TAU); x.ellipse(8, 6, 4, 6, 0.4, 0, TAU); x.ellipse(0, 1, 7, 10, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.fillStyle = '#fff'; x.beginPath(); x.arc(-4, -7, 3.2, 0, TAU); x.arc(4, -7, 3.2, 0, TAU); x.fill();
    x.fillStyle = '#2a0a22'; x.beginPath(); x.arc(-4, -7.5, 1.5, 0, TAU); x.arc(4, -7.5, 1.5, 0, TAU); x.fill();
    x.fillStyle = '#ffec6a'; x.beginPath(); x.moveTo(-2, -12); x.lineTo(0, -16); x.lineTo(2, -12); x.fill();
  }
  function drawBug(x) {
    x.shadowColor = 'rgba(255,240,100,0.95)'; x.shadowBlur = 9;
    x.fillStyle = rg(x, -1, -1, 0.5, 8, [[0, '#ffffff'], [0.4, '#fff08a'], [1, '#d89a0a']]);
    x.beginPath(); x.ellipse(0, 1, 5, 7, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.fillStyle = 'rgba(190,240,255,0.8)'; x.beginPath(); x.ellipse(-6, -2, 5, 3, -0.5, 0, TAU); x.ellipse(6, -2, 5, 3, 0.5, 0, TAU); x.fill();
  }
  function drawPickup(kind) {
    return (x) => {
      const col = { shield: '#8fd4ff', slow: '#ffd27a', super: '#9bffb0' }[kind];
      x.shadowColor = col; x.shadowBlur = 9;
      const hex = []; for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU) * 15, Math.sin(i / 6 * TAU) * 15]);
      poly(x, hex); x.fillStyle = 'rgba(10,18,44,0.85)'; x.fill(); x.shadowBlur = 0; x.strokeStyle = col; x.lineWidth = 2; x.stroke();
      x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 2; x.lineCap = 'round';
      if (kind === 'shield') { x.beginPath(); x.moveTo(0, -8); x.lineTo(7, -5); x.lineTo(7, 1); x.quadraticCurveTo(7, 7, 0, 9); x.quadraticCurveTo(-7, 7, -7, 1); x.lineTo(-7, -5); x.closePath(); x.stroke(); }
      else if (kind === 'slow') { x.beginPath(); x.arc(0, 0, 8, 0, TAU); x.stroke(); x.beginPath(); x.moveTo(0, -5); x.lineTo(0, 0); x.lineTo(4, 3); x.stroke(); }
      else { for (let i = 0; i < 2; i++) { x.beginPath(); x.moveTo(-6, 6 - i * 7); x.lineTo(0, -1 - i * 7); x.lineTo(6, 6 - i * 7); x.stroke(); } }
    };
  }
  A.POWER = { shield: { name: 'SHIELD', col: '#8fd4ff' }, slow: { name: 'SLOW TIME', col: '#ffd27a' }, super: { name: 'SUPER HOP', col: '#9bffb0' } };

  /* ---- traffic (right-facing; drawn mirrored for left-moving lanes) ---- */
  function drawVehicle(x, kind, w, hue) {
    const h = 30, x0 = -w / 2, y0 = -h / 2, c1 = U.hsl(hue, 90, 62), c2 = U.hsl(hue, 80, 26);
    x.shadowColor = U.hsl(hue, 100, 60, 0.9); x.shadowBlur = 8;
    if (kind === 'skimmer' || kind === 'racer') {
      const tip = kind === 'racer' ? 6 : 12;
      x.beginPath(); x.moveTo(x0 + 4, -h / 2 + 3); x.lineTo(w / 2 - tip, -h / 2); x.quadraticCurveTo(w / 2, -2, w / 2, 0); x.quadraticCurveTo(w / 2, 2, w / 2 - tip, h / 2); x.lineTo(x0 + 4, h / 2 - 3); x.quadraticCurveTo(x0, 0, x0 + 4, -h / 2 + 3); x.closePath();
      x.fillStyle = lg(x, 0, -h / 2, 0, h / 2, [[0, c1], [1, c2]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 100, 82, 0.95); x.lineWidth = 1.6; x.stroke();
      x.fillStyle = 'rgba(190,245,255,0.9)'; rrect(x, w * 0.02, -6, w * 0.28, 12, 5); x.fill();
      x.fillStyle = '#ff6a3d'; x.fillRect(x0 - 3, -4, 6, 8);
    } else if (kind === 'pod') {
      x.fillStyle = rg(x, -3, -4, 2, 20, [[0, '#ffffff'], [0.35, c1], [1, c2]]);
      x.beginPath(); x.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 100, 82, 0.95); x.lineWidth = 1.6; x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.stroke();
    } else {                                           // hauler / freighter: a cab pulling cargo containers
      const cab = 34, n = Math.max(1, Math.round((w - cab) / (T - 4)));
      for (let i = 0; i < n; i++) {
        const cx0 = x0 + i * ((w - cab) / n) + 1, cw = (w - cab) / n - 3;
        rrect(x, cx0, y0 + 2, cw, h - 4, 4); x.fillStyle = lg(x, 0, -h / 2, 0, h / 2, [[0, U.hsl(hue + 30 * (i % 2), 40, 52)], [1, U.hsl(hue, 45, 20)]]); x.fill();
        x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 80, 70, 0.9); x.lineWidth = 1.2; x.stroke(); x.shadowBlur = 8;
        x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(cx0 + 4, y0 + 6, cw - 8, 3);
      }
      rrect(x, w / 2 - cab, y0, cab, h, 7); x.fillStyle = lg(x, 0, -h / 2, 0, h / 2, [[0, c1], [1, c2]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 100, 82, 0.95); x.lineWidth = 1.6; x.stroke();
      x.fillStyle = 'rgba(190,245,255,0.9)'; rrect(x, w / 2 - 22, -8, 16, 16, 5); x.fill();
      x.fillStyle = '#ff6a3d'; x.fillRect(x0 - 3, -4, 5, 8);
    }
  }
  const vcache = new Map();
  A.vehicle = function (kind, len, hue) {
    hue = ((Math.round(hue / 15) * 15) % 360 + 360) % 360;
    const key = kind + '|' + len + '|' + hue;
    let s = vcache.get(key);
    if (!s) { const w = len * T - 8; s = mk(w + 18, 42, (x) => drawVehicle(x, kind, w, hue)); vcache.set(key, s); }
    return s;
  };

  /* ---- drifting platforms for the void river ---- */
  function drawPlatform(x, kind, w, hue) {
    const h = 30, x0 = -w / 2, y0 = -h / 2;
    if (kind === 'hull') {
      x.shadowColor = U.hsl(hue, 100, 60, 0.8); x.shadowBlur = 7;
      rrect(x, x0, y0, w, h, 6); x.fillStyle = lg(x, 0, y0, 0, y0 + h, [[0, '#b8c4dc'], [0.5, '#5d6a88'], [1, '#262e44']]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 100, 72, 0.95); x.lineWidth = 1.8; x.stroke();
      x.strokeStyle = 'rgba(15,20,36,0.6)'; x.lineWidth = 1.4;
      for (let px = x0 + 22; px < w / 2 - 10; px += 26) { x.beginPath(); x.moveTo(px, y0 + 3); x.lineTo(px, y0 + h - 3); x.stroke(); }
      x.fillStyle = U.hsl(hue, 100, 70); for (let px = x0 + 11; px < w / 2 - 6; px += 26) { x.beginPath(); x.arc(px, 0, 2.2, 0, TAU); x.fill(); }
    } else if (kind === 'rock') {
      const rnd = GFX.mulberry(Math.round(w) * 13 + hue), pts = [], n = 12;
      for (let i = 0; i < n; i++) { const a = i / n * TAU, k = 0.82 + rnd() * 0.22; pts.push([Math.cos(a) * w / 2 * k, Math.sin(a) * h / 2 * (0.9 + rnd() * 0.15) * 1.02]); }
      x.shadowColor = U.hsl(hue, 100, 60, 0.7); x.shadowBlur = 7;
      poly(x, pts); x.fillStyle = lg(x, -w / 3, y0, w / 3, y0 + h, [[0, U.hsl(hue, 25, 55)], [1, U.hsl(hue, 30, 16)]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(hue, 90, 72, 0.9); x.lineWidth = 1.6; x.stroke();
      x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(x0 + w * (0.2 + 0.2 * i), (i % 2 ? 5 : -5), 5, 3.4, 0, 0, TAU); x.fill(); }
    } else {                                            // jelly
      x.shadowColor = 'rgba(120,255,220,0.9)'; x.shadowBlur = 9;
      for (let k = 0; k < w / 22; k++) {
        const jx = x0 + 12 + k * (w - 24) / Math.max(1, Math.ceil(w / 22) - 1 || 1);
        x.fillStyle = rg(x, jx, -3, 1, 15, [[0, 'rgba(230,255,248,0.95)'], [0.5, 'rgba(90,230,200,0.85)'], [1, 'rgba(20,120,120,0.6)']]);
        x.beginPath(); x.arc(jx, 0, 12, Math.PI, 0); x.lineTo(jx + 12, 6); x.quadraticCurveTo(jx, 12, jx - 12, 6); x.closePath(); x.fill();
      }
      x.shadowBlur = 0; x.strokeStyle = 'rgba(180,255,240,0.9)'; x.lineWidth = 1.4;
      for (let px = x0 + 8; px < w / 2 - 6; px += 7) { x.beginPath(); x.moveTo(px, 6); x.quadraticCurveTo(px + 3, 12, px, 14); x.stroke(); }
    }
  }
  const pcache = new Map();
  A.platform = function (kind, len, hue) {
    hue = ((Math.round(hue / 15) * 15) % 360 + 360) % 360;
    const key = kind + '|' + len + '|' + hue;
    let s = pcache.get(key);
    if (!s) { const w = len * T - 6; s = mk(w + 20, 44, (x) => drawPlatform(x, kind, w, hue)); pcache.set(key, s); }
    return s;
  };

  GFX.initArt = function () {
    const s = GFX.spr = {};
    s.frog = mk(44, 44, drawFrog); s.friend = mk(30, 30, drawFriend); s.bug = mk(28, 28, drawBug);
    s.pick = { shield: mk(40, 40, drawPickup('shield')), slow: mk(40, 40, drawPickup('slow')), super: mk(40, 40, drawPickup('super')) };
    s.flash = { frog: flashOf(s.frog) };
  };

  /* ---- lane strips (540x45) per zone, cached ---- */
  const strips = {};
  A.strip = function (zone, kind) {
    zone = ((zone % ZONES.length) + ZONES.length) % ZONES.length;
    const key = zone + '|' + kind;
    if (strips[key]) return strips[key];
    const h = ZONES[zone].h, SC = 1.5, W = C.W, c = document.createElement('canvas');
    c.width = Math.round(W * SC); c.height = Math.round(T * SC);
    const x = c.getContext('2d'); x.scale(SC, SC);
    const rnd = GFX.mulberry(zone * 17 + kind.length * 5 + 3);
    if (kind === 'road') {
      x.fillStyle = lg(x, 0, 0, 0, T, [[0, U.hsl(h, 22, 9)], [1, U.hsl(h, 22, 5)]]); x.fillRect(0, 0, W, T);
      x.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 30; i++) x.fillRect(rnd() * W, rnd() * T, 2, 2);
      x.strokeStyle = U.hsl(h, 90, 60, 0.55); x.lineWidth = 2; x.setLineDash([16, 14]); x.beginPath(); x.moveTo(0, T - 1); x.lineTo(W, T - 1); x.stroke(); x.setLineDash([]);
    } else if (kind === 'river') {
      x.fillStyle = lg(x, 0, 0, 0, T, [[0, U.hsl(h + 20, 70, 11)], [1, U.hsl(h + 30, 75, 6)]]); x.fillRect(0, 0, W, T);
      x.fillStyle = rg(x, W / 2, T / 2, 10, W * 0.7, [[0, U.hsl(h + 30, 90, 40, 0.1)], [1, U.hsl(h + 30, 90, 40, 0)]]); x.fillRect(0, 0, W, T);
      x.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 22; i++) x.fillRect(rnd() * W, rnd() * T, 1.4, 1.4);
    } else if (kind === 'bay') {
      x.fillStyle = lg(x, 0, 0, 0, T, [[0, U.hsl(h, 30, 16)], [1, U.hsl(h, 30, 8)]]); x.fillRect(0, 0, W, T);
      x.strokeStyle = 'rgba(255,255,255,0.08)'; x.lineWidth = 1; for (let gx = 0; gx < W; gx += 45) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, T); x.stroke(); }
      for (const bx of C.BAY_X) {
        rrect(x, bx - 36, 2, 72, T - 2, 8); x.fillStyle = U.hsl(h + 20, 70, 6); x.fill();
        x.shadowColor = U.hsl(h, 100, 60, 0.9); x.shadowBlur = 8; x.strokeStyle = U.hsl(h, 100, 72, 0.95); x.lineWidth = 2; x.stroke(); x.shadowBlur = 0;
        x.fillStyle = U.hsl(h, 100, 70, 0.25); rrect(x, bx - 28, T - 9, 56, 5, 2); x.fill();
      }
    } else {                                              // 'safe' and 'start'
      x.fillStyle = lg(x, 0, 0, 0, T, [[0, U.hsl(h, 32, 17)], [1, U.hsl(h, 32, 9)]]); x.fillRect(0, 0, W, T);
      x.strokeStyle = 'rgba(255,255,255,0.09)'; x.lineWidth = 1; for (let gx = 0; gx <= W; gx += 45) { x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, T); x.stroke(); }
      x.fillStyle = 'rgba(255,255,255,0.18)'; for (let gx = 4; gx < W; gx += 45) { x.beginPath(); x.arc(gx, 4, 1.3, 0, TAU); x.arc(gx, T - 4, 1.3, 0, TAU); x.fill(); }
      if (kind === 'start') { x.strokeStyle = U.hsl(h, 90, 62, 0.28); x.lineWidth = 2.4; x.lineCap = 'round'; for (let gx = 22; gx < W; gx += 90) { x.beginPath(); x.moveTo(gx - 7, T / 2 + 5); x.lineTo(gx, T / 2 - 5); x.lineTo(gx + 7, T / 2 + 5); x.stroke(); } }
    }
    x.fillStyle = U.hsl(h, 100, 70, 0.4); x.fillRect(0, 0, W, 1.2);
    return (strips[key] = c);
  };
})((window.SGS = window.SGS || {}));
