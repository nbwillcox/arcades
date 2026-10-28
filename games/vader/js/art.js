/* Invader-world art: invaders (3 row types + Bomber + Commander), armor plating, flyby mothership. All procedural. */
(function (G) {
  'use strict';
  const U = G.U, GFX = G.gfx, TAU = U.TAU;
  const mk = GFX.mk, lg = GFX.lg, rg = GFX.rg, poly = GFX.poly, mirror = GFX.mirror, flashOf = GFX.flashOf;
  const A = {};
  GFX.art = A;

  function body(x, h, gx, gy, r) {
    return rg(x, gx - r * 0.25, gy - r * 0.3, 1, r * 1.3, [[0, U.hsl(h, 90, 82)], [0.45, U.hsl(h, 85, 52)], [1, U.hsl(h + 20, 75, 18)]]);
  }
  function eyes(x, h, ex, ey, rx, ry, hot) {
    const c = hot || U.hsl(h + 170, 100, 62);
    x.fillStyle = c; x.shadowColor = c; x.shadowBlur = 7;
    x.beginPath(); x.ellipse(-ex, ey, rx, ry, 0, 0, TAU); x.ellipse(ex, ey, rx, ry, 0, 0, TAU); x.fill();
    x.shadowBlur = 0;
    x.fillStyle = '#fff'; x.beginPath(); x.arc(-ex, ey - 0.5, rx * 0.35, 0, TAU); x.arc(ex, ey - 0.5, rx * 0.35, 0, TAU); x.fill();
  }

  /* Scout: antenna dome, one wide eye, skittering legs */
  function scout(h, f, big) {
    return (x) => {
      if (big) x.scale(1.22, 1.22);
      x.shadowColor = U.hsl(h, 100, 60, 0.95); x.shadowBlur = 8;
      x.strokeStyle = U.hsl(h, 80, 72); x.lineWidth = 2;
      mirror(x, (c) => {
        c.beginPath(); c.moveTo(4, -10); c.lineTo(9, -16); c.stroke();
        c.beginPath(); c.moveTo(7, 6); c.lineTo(11 + (f ? 3 : -1), 12); c.lineTo(13 + (f ? 4 : 0), 14); c.stroke();
        c.beginPath(); c.moveTo(3, 8); c.lineTo(5 + (f ? -2 : 2), 14); c.stroke();
      });
      x.fillStyle = U.hsl(h, 90, 70); x.beginPath(); x.arc(-9, -16, 1.8, 0, TAU); x.arc(9, -16, 1.8, 0, TAU); x.fill();
      x.fillStyle = body(x, h, 0, -2, 12);
      x.beginPath(); x.moveTo(-10, 9); x.quadraticCurveTo(-13, -12, 0, -12); x.quadraticCurveTo(13, -12, 10, 9); x.closePath(); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(h, 100, 85, 0.9); x.lineWidth = 1.3; x.stroke();
      eyes(x, h, 0, -2, 6, 3.6, null);
      x.fillStyle = 'rgba(0,10,25,0.55)'; x.fillRect(-7, 5, 14, 2.4);
    };
  }
  /* Raider: wide crab body with working claws */
  function raider(h, f, bomber) {
    return (x) => {
      x.shadowColor = U.hsl(h, 100, 60, 0.95); x.shadowBlur = 8;
      x.strokeStyle = U.hsl(h, 80, 72); x.lineWidth = 2.6;
      mirror(x, (c) => {
        c.beginPath(); c.moveTo(11, -1); c.lineTo(17, -3 - (f ? 6 : 0)); c.lineTo(19, -9 - (f ? 6 : 0)); c.stroke();
        c.beginPath(); c.moveTo(17, -3 - (f ? 6 : 0)); c.lineTo(21, -6 - (f ? 6 : 0)); c.stroke();
        c.lineWidth = 2; c.beginPath(); c.moveTo(6, 7); c.lineTo(9 + (f ? 2 : -2), 13); c.stroke();
      });
      x.fillStyle = body(x, h, 0, 0, 14);
      x.beginPath(); x.ellipse(0, 0, 14, 9.5, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(h, 100, 85, 0.9); x.lineWidth = 1.3; x.stroke();
      eyes(x, h, 5, -4, 2.6, 3, null);
      x.strokeStyle = 'rgba(0,10,25,0.5)'; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(-8, 3); x.quadraticCurveTo(0, 8, 8, 3); x.stroke();
      if (bomber) {
        x.fillStyle = rg(x, 0, 5, 0, 8, [[0, '#fff3c0'], [0.5, '#ff8a1a'], [1, 'rgba(255,60,0,0)']]);
        x.beginPath(); x.arc(0, 5, 8, 0, TAU); x.fill();
        x.fillStyle = '#2b1200'; x.fillRect(-4, 3, 8, 3);
      }
    };
  }
  /* Brute: round octopus dome with wavy tentacles */
  function brute(h, f) {
    return (x) => {
      x.shadowColor = U.hsl(h, 100, 60, 0.95); x.shadowBlur = 8;
      x.strokeStyle = U.hsl(h, 80, 70); x.lineWidth = 2.6;
      for (let i = -3; i <= 3; i += 2) {
        const w = (f ? 1 : -1) * (i > 0 ? 1 : -1) * 2.4;
        x.beginPath(); x.moveTo(i * 3.5, 7); x.quadraticCurveTo(i * 3.5 + w, 12, i * 4.2 - w, 15); x.stroke();
      }
      x.fillStyle = body(x, h, 0, -3, 15);
      x.beginPath(); x.moveTo(-15, 8); x.quadraticCurveTo(-17, -14, 0, -14); x.quadraticCurveTo(17, -14, 15, 8); x.closePath(); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = U.hsl(h, 100, 85, 0.9); x.lineWidth = 1.3; x.stroke();
      eyes(x, h, 6, -3, 3, 3.6, null);
      x.strokeStyle = 'rgba(0,10,25,0.5)'; x.lineWidth = 1.3;
      x.beginPath(); x.moveTo(-6, 4); x.lineTo(-3, 6); x.lineTo(0, 4); x.lineTo(3, 6); x.lineTo(6, 4); x.stroke();
    };
  }
  /* Commander: tall scout with a golden crown and a shield emblem */
  function commander(h, f) {
    return (x) => {
      scout(h, f, true)(x);
      x.shadowColor = '#ffd24a'; x.shadowBlur = 8;
      x.fillStyle = '#ffd24a';
      poly(x, [[-9, -15], [-7, -22], [-3, -16], [0, -24], [3, -16], [7, -22], [9, -15]]); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#fff3b0'; x.lineWidth = 1; x.stroke();
    };
  }

  const cache = {};
  A.inv = function (hue) {
    if (cache[hue]) return cache[hue];
    const hs = hue % 360, hr = (hue + 60) % 360, hb = (hue + 120) % 360;
    const t = {
      scout: [mk(48, 44, scout(hs, 0)), mk(48, 44, scout(hs, 1))],
      raider: [mk(52, 44, raider(hr, 0)), mk(52, 44, raider(hr, 1))],
      brute: [mk(48, 44, brute(hb, 0)), mk(48, 44, brute(hb, 1))],
      bomber: [mk(52, 44, raider(25, 0, true)), mk(52, 44, raider(25, 1, true))],
      cmd: [mk(56, 52, commander(48, 0)), mk(56, 52, commander(48, 1))],
    };
    t.F = {};
    for (const k in t) if (k !== 'F') t.F[k] = t[k].map(flashOf);
    return (cache[hue] = t);
  };

  /* armor plating overlay: intact (2+ hits left) and cracked (last hit) */
  function armorDraw(cracked) {
    return (x) => {
      const hex = [];
      for (let i = 0; i < 6; i++) hex.push([Math.cos(i / 6 * TAU) * 21, Math.sin(i / 6 * TAU) * 15]);
      poly(x, hex);
      x.fillStyle = cracked ? 'rgba(120,130,150,0.18)' : 'rgba(210,225,255,0.22)'; x.fill();
      x.shadowColor = '#ffd24a'; x.shadowBlur = cracked ? 3 : 7;
      x.strokeStyle = cracked ? 'rgba(255,190,90,0.85)' : '#ffe27a'; x.lineWidth = cracked ? 1.4 : 2; x.stroke();
      x.shadowBlur = 0;
      if (cracked) {
        x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 1.2;
        x.beginPath(); x.moveTo(-6, -14); x.lineTo(-2, -6); x.lineTo(-7, 0); x.lineTo(-3, 7); x.moveTo(8, 12); x.lineTo(5, 5); x.lineTo(11, 0); x.stroke();
      } else {
        x.fillStyle = '#fff7c8';
        for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(hex[i][0] * 0.9, hex[i][1] * 0.9, 1.3, 0, TAU); x.fill(); }
      }
    };
  }

  /* flyby mothership */
  function ufoDraw(f) {
    return (x) => {
      x.shadowColor = 'rgba(255,60,200,0.95)'; x.shadowBlur = 12;
      x.fillStyle = lg(x, 0, -6, 0, 12, [[0, '#ffb0f0'], [0.5, '#c02aa8'], [1, '#4a0a52']]);
      x.beginPath(); x.ellipse(0, 4, 36, 11, 0, 0, TAU); x.fill();
      x.shadowBlur = 0;
      x.strokeStyle = '#ffd0f6'; x.lineWidth = 1.4; x.stroke();
      x.fillStyle = lg(x, 0, -18, 0, 0, [[0, 'rgba(200,255,255,0.95)'], [1, 'rgba(70,200,255,0.55)']]);
      x.beginPath(); x.moveTo(-17, 0); x.quadraticCurveTo(-15, -18, 0, -18); x.quadraticCurveTo(15, -18, 17, 0); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(220,255,255,0.9)'; x.lineWidth = 1.2; x.stroke();
      x.fillStyle = '#7dffd8'; x.beginPath(); x.ellipse(0, -6, 3.5, 4.5, 0, 0, TAU); x.fill();
      for (let i = -3; i <= 3; i++) {
        x.fillStyle = (i + (f ? 1 : 0)) % 2 ? '#fff3b0' : '#ff5ad8';
        x.shadowColor = x.fillStyle; x.shadowBlur = 6;
        x.beginPath(); x.arc(i * 9.5, 5 + Math.abs(i) * 0.9, 2.2, 0, TAU); x.fill();
      }
      x.shadowBlur = 0;
    };
  }

  A.init = function () {
    const s = GFX.spr;
    s.armor = [mk(48, 36, armorDraw(true)), mk(48, 36, armorDraw(false))];
    s.ufo = [mk(84, 48, ufoDraw(0)), mk(84, 48, ufoDraw(1))];
    s.ufoF = s.ufo.map(flashOf);
    if (G.divers) G.divers.art();
  };
  GFX.initArt = A.init;
})((window.SGS = window.SGS || {}));
