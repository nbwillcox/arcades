/* Back-wall dressing: every room gets its own look from a seeded mix of styles (pillars, beams, panels, pipes, streaks, glow, veins, cracks) drawn over the plain wall tiles. */
(function (G) {
  'use strict';
  const W = {};
  G.walldeco = W;
  const strHash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  /* accent colour per zone (lights, veins, streaks) and the style pool rooms of that zone draw from */
  const ACCENT = { 1: '#7fc060', 2: '#a8e8ff', 3: '#ff8a3a', 4: '#4adccc', 5: '#e8509a' };
  const POOLS = {
    1: [['pillars'], ['beams', 'streaks'], ['panels'], ['cracks', 'streaks'], ['pillars', 'cracks'], ['glow']],
    2: [['streaks'], ['pillars', 'streaks'], ['glow'], ['beams'], ['cracks', 'glow'], ['panels']],
    3: [['pipes'], ['beams', 'glow'], ['panels', 'glow'], ['pipes', 'beams'], ['pillars', 'glow'], ['glow']],
    4: [['pipes'], ['panels', 'pipes'], ['beams', 'streaks'], ['pillars', 'pipes'], ['glow', 'streaks'], ['panels']],
    5: [['veins'], ['veins', 'glow'], ['cracks', 'veins'], ['streaks', 'glow'], ['veins', 'beams'], ['glow']],
  };
  const avgColor = (tile) => {
    const c = tile.wall[0], d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    return n ? [r / n, g / n, b / n] : [40, 50, 80];
  };
  const shade = (c, f, a) => 'rgba(' + Math.min(255, Math.round(c[0] * f)) + ',' + Math.min(255, Math.round(c[1] * f)) + ',' + Math.min(255, Math.round(c[2] * f)) + ',' + (a === undefined ? 1 : a) + ')';
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (a, o) => 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + o + ')';
  const disc = (x, cx, cy, r) => { for (let dy = -r; dy <= r; dy++) { const dx = Math.floor(Math.sqrt(r * r - dy * dy)); x.fillRect(cx - dx, cy + dy, dx * 2 + 1, 1); } };
  const STY = {
    pillars(x, w, h, c, R) {
      const per = 5 + Math.floor(R() * 3), off = Math.floor(R() * per), wd = 24 + Math.floor(R() * 2) * 8;
      for (let tx = off; tx * 16 < w; tx += per) {
        const px = tx * 16;
        x.fillStyle = shade(c, 0.55, 0.9); x.fillRect(px, 0, wd, h);
        x.fillStyle = shade(c, 1.35, 0.8); x.fillRect(px, 0, 2, h); x.fillRect(px + wd - 6, 0, 1, h);
        x.fillStyle = shade(c, 0.3, 0.8); x.fillRect(px + wd - 2, 0, 2, h);
        for (let y = 24; y < h; y += 80) { x.fillStyle = shade(c, 1.15, 0.9); x.fillRect(px - 3, y, wd + 6, 5); x.fillStyle = shade(c, 0.35, 0.9); x.fillRect(px - 3, y + 5, wd + 6, 2); }
      }
    },
    beams(x, w, h, c, R) {
      const per = 4 + Math.floor(R() * 3), off = Math.floor(R() * per);
      for (let ty = off; ty * 16 < h; ty += per) {
        const py = ty * 16 + 4;
        x.fillStyle = shade(c, 0.6, 0.9); x.fillRect(0, py, w, 7); x.fillStyle = shade(c, 1.3, 0.8); x.fillRect(0, py, w, 1); x.fillStyle = shade(c, 0.3, 0.9); x.fillRect(0, py + 6, w, 1);
        x.fillStyle = shade(c, 1.4, 0.8); for (let px = 6; px < w; px += 24) x.fillRect(px, py + 3, 2, 2);
      }
    },
    panels(x, w, h, c, R) {
      const pw = 48 + Math.floor(R() * 2) * 16, ph = 48, ox = Math.floor(R() * pw), oy = Math.floor(R() * ph);
      for (let py = -oy; py < h; py += ph) for (let px = -ox; px < w; px += pw) {
        x.fillStyle = shade(c, 0.82, 0.55); x.fillRect(px + 3, py + 3, pw - 6, ph - 6);
        x.fillStyle = shade(c, 1.3, 0.5); x.fillRect(px + 3, py + 3, pw - 6, 1); x.fillRect(px + 3, py + 3, 1, ph - 6);
        x.fillStyle = shade(c, 0.35, 0.6); x.fillRect(px + 3, py + ph - 4, pw - 6, 1); x.fillRect(px + pw - 4, py + 3, 1, ph - 6);
      }
    },
    pipes(x, w, h, c, R) {
      const n = 2 + Math.floor(w / 480), xs = []; for (let i = 0; i < n; i++) xs.push(Math.floor(R() * (w - 30)) + 6);
      for (const px of xs) {
        x.fillStyle = shade(c, 0.5, 0.95); x.fillRect(px, 0, 7, h); x.fillStyle = shade(c, 1.4, 0.9); x.fillRect(px + 1, 0, 1, h); x.fillStyle = shade(c, 0.25, 0.95); x.fillRect(px + 5, 0, 2, h);
        for (let y = 20; y < h; y += 56) { x.fillStyle = shade(c, 0.9, 0.95); x.fillRect(px - 2, y, 11, 5); x.fillStyle = shade(c, 1.4, 0.9); x.fillRect(px - 2, y, 11, 1); }
      }
      for (let i = 0; i < 3; i++) {
        const py = 24 + Math.floor(R() * (h / 16 - 3)) * 16, a = xs[Math.floor(R() * xs.length)], b = xs[Math.floor(R() * xs.length)];
        if (a === b) continue;
        const x0 = Math.min(a, b), x1 = Math.max(a, b); x.fillStyle = shade(c, 0.55, 0.95); x.fillRect(x0, py, x1 - x0, 6); x.fillStyle = shade(c, 1.4, 0.9); x.fillRect(x0, py, x1 - x0, 1);
      }
    },
    streaks(x, w, h, c, R, acc) {
      const n = Math.floor(w / 20);
      for (let i = 0; i < n; i++) {
        const px = Math.floor(R() * w), wd = 1 + Math.floor(R() * 3), y0 = Math.floor(R() * h * 0.6), len = 30 + Math.floor(R() * 90);
        x.fillStyle = rgba(acc, 0.2); x.fillRect(px, y0, wd, len);
        x.fillStyle = rgba(acc, 0.34); x.fillRect(px, y0 + len - 6, wd, 6);
      }
    },
    glow(x, w, h, c, R, acc) {
      const n = 3 + Math.floor(w / 300);
      for (let i = 0; i < n; i++) {
        const cx = Math.floor(R() * w), cy = Math.floor(h * (0.25 + R() * 0.55));
        for (const [r, a] of [[56, 0.05], [40, 0.07], [26, 0.09], [14, 0.14]]) { x.fillStyle = rgba(acc, a); disc(x, cx, cy, r); }
        x.fillStyle = rgba(acc, 0.5); x.fillRect(cx - 1, cy - 1, 3, 3);
      }
    },
    veins(x, w, h, c, R, acc) {
      const n = 5 + Math.floor(w / 120);
      for (let i = 0; i < n; i++) {
        let px = Math.floor(R() * w), py = Math.floor(R() * h), dx = R() < 0.5 ? -1 : 1, dy = R() < 0.5 ? -1 : 1;
        for (let s = 0; s < 70; s++) {
          x.fillStyle = rgba(acc, s % 9 === 0 ? 0.55 : 0.28); x.fillRect(px, py, s % 5 === 0 ? 2 : 1, s % 5 === 0 ? 2 : 1);
          const r = R(); if (r < 0.3) dx = -dx; else if (r < 0.55) dy = -dy; px += R() < 0.7 ? dx : 0; py += R() < 0.7 ? dy : 0;
          if (R() < 0.03) { x.fillStyle = rgba(acc, 0.5); disc(x, px, py, 2); }
        }
      }
    },
    cracks(x, w, h, c, R) {
      const n = 4 + Math.floor(w / 140);
      for (let i = 0; i < n; i++) {
        let px = Math.floor(R() * w), py = Math.floor(R() * h);
        for (let s = 0; s < 40; s++) { x.fillStyle = shade(c, 0.28, 0.7); x.fillRect(px, py, 1, 1); const r = R(); if (r < 0.4) px += R() < 0.5 ? -1 : 1; if (r > 0.3) py += 1; }
      }
    },
  };
  /* style names for a room: the room's own list when it has one, else a seeded pick from its zone pool */
  W.styleOf = function (def) {
    if (def.style) return def.style;
    const pool = POOLS[def.zone || 1] || POOLS[1];
    return pool[strHash(def.id) % pool.length];
  };
  /* decorate the wall pixels already drawn on canvas x (size pw x ph); only existing wall pixels are touched */
  W.apply = function (x, room, tile) {
    const def = room.def, w = room.pw, h = room.ph, zone = room.zone || 1, R = rng(strHash(def.id) ^ 0x9e3779b9);
    const c = tile.wallAvg || (tile.wallAvg = avgColor(tile)), acc = hex(ACCENT[zone] || ACCENT[1]);
    const t = document.createElement('canvas'); t.width = w; t.height = h;
    const tx = t.getContext('2d'); tx.imageSmoothingEnabled = false;
    for (const name of W.styleOf(def)) if (STY[name]) STY[name](tx, w, h, c, R, acc);
    const tone = def.tone !== undefined ? def.tone : [0.78, 0.9, 1, 1.12][strHash(def.id + 't') & 3];
    x.save(); x.globalCompositeOperation = 'source-atop'; x.drawImage(t, 0, 0);
    if (tone < 1) { x.fillStyle = 'rgba(2,4,14,' + (1 - tone).toFixed(2) + ')'; x.fillRect(0, 0, w, h); } else if (tone > 1) { x.fillStyle = 'rgba(255,255,255,' + ((tone - 1) * 0.5).toFixed(2) + ')'; x.fillRect(0, 0, w, h); }
    x.restore();
  };
})((window.SGS = window.SGS || {}));
