/* Procedural art: the ship, organic enemies, capsules and the stage backdrops. Sprites face right (+x) unless noted. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly, flashOf = GFX.flashOf;
  const A = {};
  GFX.art = A;

  const THEMES = [
    { h: 340, name: 'CELL WALL' }, { h: 8, name: 'ARTERY' }, { h: 275, name: 'NEURAL NET' }, { h: 95, name: 'GUT' }, { h: 205, name: 'MARROW' },
  ];
  A.THEMES = THEMES;

  function drawShip(x) {
    x.shadowColor = 'rgba(70,225,255,0.9)'; x.shadowBlur = 7;
    poly(x, [[22, 0], [6, -4], [-8, -4], [-15, -12], [-19, -10], [-13, -3], [-19, -3], [-19, 3], [-13, 3], [-19, 10], [-15, 12], [-8, 4], [6, 4]]);
    x.fillStyle = lg(x, -19, 0, 22, 0, [[0, '#22407e'], [0.55, '#8fb4ee'], [1, '#f2f8ff']]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#37e6ff'; x.lineWidth = 1.3; x.stroke();
    x.strokeStyle = '#ff5a6a'; x.lineWidth = 2; x.beginPath(); x.moveTo(-15, -9); x.lineTo(-9, -3); x.moveTo(-15, 9); x.lineTo(-9, 3); x.stroke();
    x.fillStyle = lg(x, 0, -4, 0, 4, [[0, '#e8ffff'], [0.5, '#35c8f2'], [1, '#08436f']]);
    x.beginPath(); x.ellipse(5, 0, 7, 3.2, 0, 0, TAU); x.fill();
    x.fillStyle = '#ff5a6a'; x.fillRect(-19, -1.4, 6, 2.8);
  }
  function drawOption(x) {
    x.shadowColor = 'rgba(255,170,60,0.95)'; x.shadowBlur = 8;
    x.fillStyle = rg(x, -2, -2, 0.5, 8, [[0, '#ffffff'], [0.4, '#ffd27a'], [1, '#c2410a']]);
    x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.fill();
  }
  function drawBolt(x) {
    x.shadowColor = 'rgba(60,225,255,1)'; x.shadowBlur = 8;
    x.fillStyle = lg(x, -10, 0, 10, 0, [[0, '#27c6ee'], [0.5, '#ffffff'], [1, '#9af3ff']]);
    x.beginPath(); x.ellipse(0, 0, 10, 2.8, 0, 0, TAU); x.fill();
  }
  function drawMissile(x) {
    x.shadowColor = 'rgba(255,170,60,1)'; x.shadowBlur = 7;
    poly(x, [[9, 0], [-3, -3.4], [-8, -3], [-8, 3], [-3, 3.4]]);
    x.fillStyle = lg(x, -8, 0, 9, 0, [[0, '#a8400a'], [0.6, '#ffb060'], [1, '#ffffff']]); x.fill();
  }
  function drawSpore(x) {
    x.fillStyle = rg(x, 0, 0, 0, 9, [[0, '#ffffff'], [0.3, '#e8ff7a'], [0.7, '#7adc2a'], [1, 'rgba(120,220,40,0)']]);
    x.beginPath(); x.arc(0, 0, 9, 0, TAU); x.fill();
  }

  /* ---- organic enemies ---- */
  function drawCell(h, ring) {
    return (x) => {
      x.shadowColor = U.hsl(h, 100, 60, 0.9); x.shadowBlur = 7;
      x.fillStyle = rg(x, -3, -3, 1, 15, [[0, U.hsl(h, 90, 82)], [0.5, U.hsl(h, 85, 55)], [1, U.hsl(h, 70, 22)]]);
      x.beginPath(); x.arc(0, 0, 12.5, 0, TAU); x.fill();
      x.shadowBlur = 0; x.strokeStyle = U.hsl(h, 100, 82, 0.9); x.lineWidth = 1.4; x.stroke();
      x.fillStyle = U.hsl(h + 30, 60, 18); x.beginPath(); x.arc(2, 1, 4.6, 0, TAU); x.fill();
      x.fillStyle = 'rgba(255,255,255,0.85)'; x.beginPath(); x.arc(0.5, -0.5, 1.6, 0, TAU); x.fill();
      if (ring) { x.strokeStyle = 'rgba(255,230,120,0.95)'; x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 15.5, 0, TAU); x.stroke(); }
    };
  }
  function drawDarter(x) {
    x.shadowColor = 'rgba(60,255,200,0.95)'; x.shadowBlur = 7;
    poly(x, [[14, 0], [2, -5], [-3, -11], [-6, -4], [-12, 0], [-6, 4], [-3, 11], [2, 5]]);
    x.fillStyle = lg(x, -12, 0, 14, 0, [[0, '#0a5a48'], [0.6, '#38e8b8'], [1, '#e8fff8']]); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#b8fff0'; x.lineWidth = 1.2; x.stroke();
    x.fillStyle = '#ff3b6a'; x.beginPath(); x.arc(4, 0, 2, 0, TAU); x.fill();
  }
  function drawLarva(x) {
    x.shadowColor = 'rgba(200,255,60,0.9)'; x.shadowBlur = 6;
    x.fillStyle = rg(x, 2, -2, 1, 10, [[0, '#f6ffc0'], [0.5, '#b4e63a'], [1, '#3a6a0a']]);
    x.beginPath(); x.ellipse(0, 0, 9, 6, 0, 0, TAU); x.fill();
    x.shadowBlur = 0; x.beginPath(); x.ellipse(-8, 0, 4, 3, 0, 0, TAU); x.fillStyle = '#6aa81a'; x.fill();
    x.fillStyle = '#2a0a0a'; x.beginPath(); x.arc(5, -1.5, 1.4, 0, TAU); x.arc(5, 1.5, 1.4, 0, TAU); x.fill();
  }
  function drawSpitter(x) {
    x.shadowColor = 'rgba(140,255,80,0.9)'; x.shadowBlur = 8;
    x.fillStyle = rg(x, -3, -3, 2, 18, [[0, '#e8ffc8'], [0.45, '#5ed23a'], [1, '#1a4a0a']]);
    x.beginPath(); x.arc(0, 0, 16, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#c8ff9a'; x.lineWidth = 1.5; x.stroke();
    x.fillStyle = '#2a0a14'; x.beginPath(); x.ellipse(8, 0, 6, 8, 0, 0, TAU); x.fill();
    x.fillStyle = '#ff7a9a'; x.beginPath(); x.ellipse(9, 0, 3, 4.5, 0, 0, TAU); x.fill();
    x.fillStyle = '#ffec6a'; x.beginPath(); x.arc(-4, -6, 2, 0, TAU); x.arc(-4, 6, 2, 0, TAU); x.fill();
  }
  function drawTurret(x) {   // base only, pointing up; the barrel is drawn live
    x.shadowColor = 'rgba(255,120,90,0.9)'; x.shadowBlur = 6;
    x.fillStyle = lg(x, 0, -10, 0, 12, [[0, '#d88a7a'], [0.5, '#8a3a3a'], [1, '#3a1010']]);
    x.beginPath(); x.moveTo(-14, 12); x.quadraticCurveTo(-14, -8, 0, -10); x.quadraticCurveTo(14, -8, 14, 12); x.closePath(); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffb0a0'; x.lineWidth = 1.4; x.stroke();
    x.fillStyle = '#ffe27a'; x.beginPath(); x.arc(0, -1, 4, 0, TAU); x.fill(); x.fillStyle = '#3a0a0a'; x.beginPath(); x.arc(0, -1, 1.8, 0, TAU); x.fill();
  }
  function drawHive(x) {
    x.shadowColor = 'rgba(255,60,160,0.95)'; x.shadowBlur = 12;
    x.strokeStyle = '#ff9ad0'; x.lineWidth = 3;
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; x.beginPath(); x.moveTo(Math.cos(a) * 36, Math.sin(a) * 36); x.lineTo(Math.cos(a) * 52, Math.sin(a) * 52); x.stroke(); }
    x.fillStyle = rg(x, -10, -12, 4, 46, [[0, '#ffd0ec'], [0.35, '#e8408c'], [1, '#4a0a30']]);
    x.beginPath(); x.arc(0, 0, 40, 0, TAU); x.fill();
    x.shadowBlur = 0; x.strokeStyle = '#ffc0e4'; x.lineWidth = 2; x.stroke();
    x.strokeStyle = 'rgba(70,0,40,0.6)'; x.lineWidth = 2;
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4; x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(Math.cos(a + 0.5) * 20, Math.sin(a + 0.5) * 20, Math.cos(a) * 36, Math.sin(a) * 36); x.stroke(); }
    x.fillStyle = '#1a0212'; x.beginPath(); x.arc(0, 0, 13, 0, TAU); x.fill();
    x.fillStyle = '#ffec6a'; x.beginPath(); x.arc(0, 0, 6, 0, TAU); x.fill(); x.fillStyle = '#2a0412'; x.beginPath(); x.ellipse(0, 0, 2, 5, 0, 0, TAU); x.fill();
  }
  const CAPS = { P: { c1: '#ffd27a', c2: '#d86a0a', hue: 35, name: 'POWER' }, B: { c1: '#a8d4ff', c2: '#1a5ac2', hue: 210, name: 'BOMB' }, U: { c1: '#ffffff', c2: '#7a8aa8', hue: 190, name: '1UP' } };
  A.CAPS = CAPS;
  function drawCap(k) {
    return (x) => {
      const P = CAPS[k];
      x.shadowColor = P.c1; x.shadowBlur = 9;
      x.beginPath(); x.moveTo(-9, -9); x.lineTo(9, -9); x.arc(9, 0, 9, -Math.PI / 2, Math.PI / 2); x.lineTo(-9, 9); x.arc(-9, 0, 9, Math.PI / 2, Math.PI * 1.5); x.closePath();
      x.fillStyle = lg(x, 0, -9, 0, 9, [[0, P.c1], [1, P.c2]]); x.fill();
      x.shadowBlur = 0; x.strokeStyle = '#ffffff'; x.lineWidth = 1.5; x.stroke();
      x.fillStyle = '#1a0a10'; x.font = '900 12px "Segoe UI", system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(k === 'U' ? '1UP' : k, 0, 1);
    };
  }
  GFX.initArt = function () {
    const s = GFX.spr = {};
    s.ship = mk(52, 36, drawShip); s.option = mk(22, 22, drawOption);
    s.bolt = mk(28, 12, drawBolt); s.missile = mk(26, 12, drawMissile); s.spore = mk(26, 26, drawSpore);
    s.cell = mk(36, 36, drawCell(335, false)); s.carrier = mk(40, 40, drawCell(20, true));
    s.darter = mk(34, 34, drawDarter); s.larva = mk(30, 22, drawLarva); s.spitter = mk(44, 44, drawSpitter);
    s.turret = mk(40, 36, drawTurret); s.hive = mk(124, 124, drawHive);
    s.cap = {}; for (const k in CAPS) s.cap[k] = mk(44, 28, drawCap(k));
    s.flash = {}; for (const k of ['cell', 'carrier', 'darter', 'larva', 'spitter', 'turret', 'hive']) s.flash[k] = flashOf(s[k]);
  };

  /* ---- seamless 1024x1024 organic backdrop tiles, two parallax layers per theme ---- */
  const tiles = {};
  A.tile = function (theme, layer) {
    const key = theme + '|' + layer;
    if (tiles[key]) return tiles[key];
    const T = THEMES[theme], N = 1024, c = document.createElement('canvas');
    c.width = c.height = N;
    const x = c.getContext('2d'), rnd = GFX.mulberry(theme * 31 + layer * 7 + 5);
    if (layer === 0) {
      x.fillStyle = U.hsl(T.h, 60, 5); x.fillRect(0, 0, N, N);
      x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 14; i++) {
        const cx = rnd() * N, cy = rnd() * N, r = 120 + rnd() * 200, h = T.h + (rnd() - 0.5) * 50;
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const px = cx + ox * N, py = cy + oy * N;
          if (px + r < 0 || px - r > N || py + r < 0 || py - r > N) continue;
          x.fillStyle = rg(x, px, py, 0, r, [[0, U.hsl(h, 80, 40, 0.16)], [1, U.hsl(h, 70, 25, 0)]]); x.fillRect(px - r, py - r, r * 2, r * 2);
        }
      }
      x.strokeStyle = U.hsl(T.h, 80, 45, 0.12); x.lineWidth = 3; x.lineCap = 'round';
      for (let i = 0; i < 9; i++) {
        const y0 = rnd() * N, a = 30 + rnd() * 70, ph = rnd() * TAU;
        x.beginPath(); for (let px = -8; px <= N + 8; px += 16) { const y = y0 + Math.sin(px / N * TAU * 2 + ph) * a; if (px < 0) x.moveTo(px, y); else x.lineTo(px, y); } x.stroke();
      }
    } else {
      for (let i = 0; i < 46; i++) {
        const cx = rnd() * N, cy = rnd() * N, r = 6 + rnd() * 26, h = T.h + (rnd() - 0.5) * 60;
        for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
          const px = cx + ox * N, py = cy + oy * N;
          if (px + r < 0 || px - r > N || py + r < 0 || py - r > N) continue;
          x.strokeStyle = U.hsl(h, 80, 55, 0.22); x.lineWidth = 1.6; x.beginPath(); x.arc(px, py, r, 0, TAU); x.stroke();
          x.fillStyle = U.hsl(h, 80, 45, 0.07); x.fill();
          x.fillStyle = U.hsl(h, 80, 60, 0.18); x.beginPath(); x.arc(px + r * 0.25, py + r * 0.1, r * 0.3, 0, TAU); x.fill();
        }
      }
    }
    return (tiles[key] = c);
  };
})((window.SGS = window.SGS || {}));
