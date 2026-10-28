/* Layered, procedurally painted backdrops: sky, synthwave grid, sun/moon, mountains, skyline, palms, water, ground. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, GFX = G.gfx, TAU = U.TAU;
  const W = C.W, H = C.H;
  const A = {};
  GFX.art = A;
  const SHORE = 432, GROUND_TOP = 488, SC = 1.5;
  A.SHORE = SHORE; A.GROUND_TOP = GROUND_TOP;

  const THEMES = [
    { name: 'Neon Sunset', sky: ['#120628', '#3a0f5e', '#8a2a8f', '#e0508c', '#ff9a55'], grid: '255,120,200', sun: [660, 318, 74, ['#fff1b8', '#ffb347', '#ff5a8a']], mtn: ['#3a1260', '#240a40'], city: '#150433', win: '255,170,220', water: ['#3b1470', '#0a0526'], accent: '#ff7ad0', palm: '#08021a', hue: 320 },
    { name: 'Midnight Bay', sky: ['#040b22', '#0a2150', '#0f5a86', '#1aa0b8', '#7fe8e0'], grid: '90,220,255', sun: [300, 300, 54, ['#ffffff', '#cfe9ff', '#7ac7ff']], mtn: ['#0b3a63', '#07264a'], city: '#041634', win: '170,240,255', water: ['#0a4a78', '#03122c'], accent: '#5ae6ff', palm: '#020a1a', hue: 195 },
    { name: 'Amber Dusk', sky: ['#160c2a', '#4a1c3c', '#a8402c', '#f08a38', '#ffd27a'], grid: '255,190,90', sun: [520, 316, 82, ['#fffbe0', '#ffd27a', '#ff8a3a']], mtn: ['#5a2230', '#381424'], city: '#210c20', win: '255,210,120', water: ['#6a2a30', '#1a0a18'], accent: '#ffb347', palm: '#0e0410', hue: 28 },
    { name: 'Magenta Metropolis', sky: ['#0e0220', '#3a0a58', '#8a1480', '#ff3db0', '#ffb0e0'], grid: '255,90,210', sun: [760, 312, 60, ['#ffffff', '#ffc0f0', '#ff4fd8']], mtn: ['#4a0f6a', '#2a0646'], city: '#1a0430', win: '255,120,230', water: ['#5a1070', '#12041e'], accent: '#ff4fd8', palm: '#07010f', hue: 305 },
    { name: 'Aurora Frost', sky: ['#020814', '#08283a', '#0a5a58', '#1fb08a', '#9affc8'], grid: '110,255,190', sun: [240, 306, 46, ['#ffffff', '#d8fff0', '#9affc8']], mtn: ['#0b4a4e', '#06303a'], city: '#031a24', win: '190,255,220', water: ['#0a5a5a', '#021218'], accent: '#7dffb8', palm: '#02100f', hue: 150 },
  ];
  A.THEMES = THEMES;

  function mountainPath(x, rnd, base, amp, step, color, rim) {
    x.beginPath(); x.moveTo(0, base);
    let y = base - amp * 0.5;
    for (let px = 0; px <= W + step; px += step) {
      y = U.clamp(y + (rnd() - 0.5) * amp * 0.9, base - amp, base - amp * 0.15);
      x.lineTo(px, y);
    }
    x.lineTo(W, base); x.closePath();
    x.fillStyle = color; x.fill();
    x.strokeStyle = rim; x.lineWidth = 1.2; x.stroke();
  }

  function palm(x, px, base, h, color, rnd) {
    const lean = (rnd() - 0.5) * 40, tx = px + lean, ty = base - h;
    x.strokeStyle = color; x.lineWidth = 4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(px, base); x.quadraticCurveTo(px + lean * 0.2, base - h * 0.6, tx, ty); x.stroke();
    x.lineWidth = 2.6;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI - Math.PI, len = 26 + rnd() * 14;
      x.beginPath(); x.moveTo(tx, ty);
      x.quadraticCurveTo(tx + Math.cos(a) * len * 0.6, ty + Math.sin(a) * len * 0.5 - 8, tx + Math.cos(a) * len, ty + Math.sin(a) * len * 0.5 + 10);
      x.stroke();
    }
  }
  A._mountain = mountainPath; A._palm = palm; A._SC = SC;

  const cache = [];
  A.backdrop = function (idx) {
    idx = ((idx % THEMES.length) + THEMES.length) % THEMES.length;
    if (cache[idx]) return cache[idx];
    const T = THEMES[idx], c = document.createElement('canvas');
    c.width = W * SC; c.height = H * SC;
    const x = c.getContext('2d');
    x.scale(SC, SC);
    const rnd = GFX.mulberry(idx * 4099 + 31);
    const sky = x.createLinearGradient(0, 0, 0, SHORE);
    T.sky.forEach((col, i) => sky.addColorStop(i / (T.sky.length - 1), col));
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 150; i++) {
      x.fillStyle = 'rgba(255,255,255,' + (0.25 + rnd() * 0.6) + ')';
      x.fillRect(rnd() * W, rnd() * SHORE * 0.65, 1 + rnd() * 1.2, 1 + rnd() * 1.2);
    }
    x.lineWidth = 1;
    for (let gy = SHORE - 24; gy > 30; gy -= 30) {
      x.strokeStyle = 'rgba(' + T.grid + ',' + (0.05 + 0.2 * (gy / SHORE)) + ')';
      x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke();
    }
    for (let gx = 0; gx <= W; gx += 40) {
      const g2 = x.createLinearGradient(0, 30, 0, SHORE);
      g2.addColorStop(0, 'rgba(' + T.grid + ',0)'); g2.addColorStop(1, 'rgba(' + T.grid + ',0.22)');
      x.strokeStyle = g2; x.beginPath(); x.moveTo(gx, 30); x.lineTo(gx, SHORE); x.stroke();
    }
    const sx = T.sun[0], sy = T.sun[1], sr = T.sun[2], sc = T.sun[3];
    const halo = x.createRadialGradient(sx, sy, sr * 0.4, sx, sy, sr * 3);
    halo.addColorStop(0, 'rgba(' + T.grid + ',0.45)'); halo.addColorStop(1, 'rgba(' + T.grid + ',0)');
    x.fillStyle = halo; x.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
    const sun = x.createLinearGradient(0, sy - sr, 0, sy + sr);
    sun.addColorStop(0, sc[0]); sun.addColorStop(0.5, sc[1]); sun.addColorStop(1, sc[2]);
    x.fillStyle = sun; x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill();
    x.fillStyle = T.sky[3];
    for (let i = 0; i < 6; i++) x.fillRect(sx - sr, sy + sr * 0.05 + i * sr * 0.17, sr * 2, 1.2 + i * 0.9);
    mountainPath(x, rnd, SHORE, 120, 26, T.mtn[0], 'rgba(' + T.grid + ',0.45)');
    mountainPath(x, rnd, SHORE, 70, 20, T.mtn[1], 'rgba(' + T.grid + ',0.3)');
    x.fillStyle = T.city;
    for (let px = 0; px < W; px += 12 + rnd() * 26) {
      const bw = 14 + rnd() * 30, bh = 18 + rnd() * rnd() * 90;
      x.fillStyle = T.city; x.fillRect(px, SHORE - bh, bw, bh + 2);
      for (let wy = SHORE - bh + 5; wy < SHORE - 4; wy += 8) {
        for (let wx = px + 3; wx < px + bw - 3; wx += 6) {
          if (rnd() < 0.18) { x.fillStyle = 'rgba(' + T.win + ',' + (0.35 + rnd() * 0.5) + ')'; x.fillRect(wx, wy, 2.2, 3); }
        }
      }
    }
    for (let i = 0; i < 9; i++) palm(x, 30 + i * 112 + rnd() * 50, SHORE + 3, 55 + rnd() * 55, T.palm, rnd);
    const water = x.createLinearGradient(0, SHORE, 0, GROUND_TOP);
    water.addColorStop(0, T.water[0]); water.addColorStop(1, T.water[1]);
    x.fillStyle = water; x.fillRect(0, SHORE, W, GROUND_TOP - SHORE);
    const refl = x.createLinearGradient(0, SHORE, 0, GROUND_TOP);
    refl.addColorStop(0, sc[1]); refl.addColorStop(1, T.water[1]);
    x.globalAlpha = 0.3; x.fillStyle = refl; x.fillRect(sx - sr * 0.8, SHORE, sr * 1.6, GROUND_TOP - SHORE); x.globalAlpha = 1;
    const gr = x.createLinearGradient(0, GROUND_TOP, 0, H);
    gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#03060f');
    x.fillStyle = gr; x.fillRect(0, GROUND_TOP, W, H - GROUND_TOP);
    x.shadowColor = T.accent; x.shadowBlur = 12; x.strokeStyle = T.accent; x.lineWidth = 2;
    x.beginPath(); x.moveTo(0, GROUND_TOP); x.lineTo(W, GROUND_TOP); x.stroke();
    x.shadowBlur = 0;
    return (cache[idx] = c);
  };

  /* animated bits over the backdrop: shimmering water, twinkling stars, aurora on the last theme */
  A.overlay = function (ctx, t, idx) {
    const T = THEMES[idx % THEMES.length];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const y = SHORE + 6 + (i / 26) * (GROUND_TOP - SHORE - 8), ph = t * (0.7 + (i % 5) * 0.15) + i * 1.7;
      const x0 = (i * 211.3) % W + Math.sin(ph) * 14, len = 30 + (i % 4) * 22;
      ctx.strokeStyle = 'rgba(' + T.grid + ',' + (0.1 + 0.08 * Math.sin(ph)) + ')'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + len, y); ctx.stroke();
    }
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.4 * Math.sin(t * 2 + i * 3.1)) + ')';
      ctx.fillRect((i * 197.7) % W, 18 + ((i * 53.3) % (SHORE * 0.5)), 1.8, 1.8);
    }
    if (idx % THEMES.length === 4) {
      for (let b = 0; b < 3; b++) {
        ctx.strokeStyle = 'rgba(' + (b === 1 ? '120,255,200' : '90,220,255') + ',0.16)'; ctx.lineWidth = 16 - b * 3;
        ctx.beginPath();
        for (let px = 0; px <= W; px += 20) { const y = 80 + b * 34 + Math.sin(px * 0.01 + t * 0.5 + b) * 26; if (px) ctx.lineTo(px, y); else ctx.moveTo(px, y); }
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  A.init = function () { for (let i = 0; i < THEMES.length; i++) A.backdrop(i); };
  GFX.initArt = A.init;
})((window.SGS = window.SGS || {}));
