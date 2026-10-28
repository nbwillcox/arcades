/* Stage generation: a floor of varied segments (plain, spike strips, flame jets, falling spikes) joined by gaps (plain jumps, stepping stones, moving / crumbling / blinking platforms, lifts, spring pads), scripted enemy groups, capsule pods and a boss arena. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C;
  const St = {};
  G.stage = St;
  const FL = C.FLOOR;
  St.THEMES = [{ h: 125, name: 'JUNGLE RIDGE' }, { h: 195, name: 'ICE CAVERNS' }, { h: 22, name: 'MAGMA FIELDS' }, { h: 318, name: 'HIVE WORLD' }, { h: 215, name: 'STEEL FORTRESS' }];
  St.themeIdx = (n) => (n - 1) % 5;
  St.bossIdx = (n) => (n - 1) % 4;
  St.cycle = (n) => Math.floor((n - 1) / 4);

  /* what each world likes to throw at you */
  const WEIGHTS = [
    { seg: { ground: 5, spikes: 3, flames: 0, drops: 2 }, gap: { plain: 2, stones: 3, move: 4, crumble: 3, blink: 0, spring: 2, lift: 1 } },
    { seg: { ground: 5, spikes: 2, flames: 0, drops: 4 }, gap: { plain: 2, stones: 3, move: 2, crumble: 5, blink: 0, spring: 2, lift: 2 } },
    { seg: { ground: 4, spikes: 2, flames: 5, drops: 2 }, gap: { plain: 1, stones: 2, move: 4, crumble: 4, blink: 0, spring: 2, lift: 2 } },
    { seg: { ground: 4, spikes: 3, flames: 0, drops: 3 }, gap: { plain: 1, stones: 2, move: 3, crumble: 1, blink: 5, spring: 3, lift: 1 } },
    { seg: { ground: 4, spikes: 3, flames: 4, drops: 0 }, gap: { plain: 1, stones: 1, move: 4, crumble: 0, blink: 4, spring: 2, lift: 4 } },
  ];
  const pickW = (rnd, o) => { let t = 0, k; for (k in o) t += o[k]; let r = rnd() * t; for (k in o) { r -= o[k]; if (r <= 0) return k; } return 'plain'; };

  St.gen = function (n) {
    const rnd = G.gfx.mulberry(n * 7717 + 3), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1)), d = Math.min(3.2, 1 + (n - 1) * 0.16), th = St.themeIdx(n), WT = WEIGHTS[th];
    const len = 6000 + 350 * Math.min(6, n), arenaX = len - 900, plats = [], events = [], traps = [];
    let x = 0, seg = 0, podX = 700;
    const letters = ['S', 'S', 'S', 'M', 'M', 'L', 'L', 'F', 'F', 'R', 'R', 'B'];
    const ledge = (x0, x1, y) => { const p = { x0, x1, y, solid: false }; plats.push(p); return p; };
    while (x < arenaX - 700) {
      const kind = seg === 0 ? 'ground' : pickW(rnd, WT.seg);
      const L = seg === 0 ? 1000 : kind === 'ground' ? ri(480, 900) : kind === 'spikes' ? ri(580, 820) : kind === 'flames' ? ri(660, 880) : ri(640, 900);
      plats.push({ x0: x, x1: x + L, y: FL, solid: true });
      const zones = [];
      if (kind === 'spikes') {
        let cx = x + 250, cnt = L > 760 ? 3 : L > 660 ? 2 : 1;
        for (let i = 0; i < cnt; i++) { const w = 16 * ri(4, 7); if (cx + w > x + L - 180) break; traps.push({ k: 'spikes', x0: cx, x1: cx + w, y: FL }); zones.push([cx - 40, cx + w + 40]); cx += w + ri(190, 270); }
      } else if (kind === 'flames') {
        const cnt = L > 760 ? 3 : 2, span = L - 440;
        for (let i = 0; i < cnt; i++) { const fx = x + 250 + (i + 0.15 + rnd() * 0.5) * (span / cnt), per = 3.1 + rnd() * 0.6; traps.push({ k: 'flame', x: fx, y: FL, per, ph: rnd() * per, warn: 0.55, on: 1.0 }); zones.push([fx - 50, fx + 50]); }
      } else if (kind === 'drops') {
        let cx = x + 300;
        while (cx < x + L - 140) { traps.push({ k: 'drop', x: cx, y0: 66, st: 0, t: 0, vy: 0, dy: 0, th: rnd() }); cx += ri(140, 220); }
      }
      const ledges = [];
      if (seg > 0 && rnd() < 0.75) { const w = ri(190, 330), lx = x + ri(60, Math.max(61, L - w - 40)); ledges.push(ledge(lx, lx + w, FL - 100)); if (rnd() < 0.5) { const w2 = ri(150, 260), x2 = lx + ri(20, Math.max(21, w - 100)); ledges.push(ledge(x2, x2 + w2, FL - 200)); } }
      const groups = Math.max(1, Math.floor((L - 200) / (300 / Math.sqrt(d)) * (kind === 'ground' ? 1 : 0.6)));
      const clear = (px) => !zones.some((z) => px > z[0] && px < z[1]);
      for (let i = 0; i < groups; i++) {
        const ex = x + 220 + (L - 360) * (i + rnd() * 0.5) / groups;
        if (seg === 0 && ex < 560) continue;
        const r = rnd(), onLedge = ledges.length && rnd() < 0.5, lp = onLedge ? U.pick(ledges) : null, ey = lp ? lp.y : FL, exx = lp ? U.clamp(ex, lp.x0 + 30, lp.x1 - 30) : ex;
        if (r < 0.28) events.push({ x: ex, type: 'runners', n: ri(2, 2 + Math.floor(d)), y: FL });
        else if (r < 0.88 && !lp && !clear(exx)) continue;
        else if (r < 0.46) events.push({ x: exx, type: 'sniper', y: ey, lo: lp ? lp.x0 + 30 : undefined, hi: lp ? lp.x1 - 30 : undefined });
        else if (r < 0.60) events.push({ x: exx, type: 'turret', y: ey, lo: lp ? lp.x0 + 30 : undefined, hi: lp ? lp.x1 - 30 : undefined });
        else if (r < 0.74) events.push({ x: exx, type: 'pillbox', y: ey, cap: rnd() < 0.55 ? U.pick(letters) : null, lo: lp ? lp.x0 + 30 : undefined, hi: lp ? lp.x1 - 30 : undefined });
        else if (r < 0.88) events.push({ x: ex, type: 'flyers', n: ri(3, 4 + Math.floor(d)) });
        else events.push({ x: ex, type: 'leaper', y: FL });
      }
      while (podX < x + L) { events.push({ x: podX, type: 'pod', letter: n >= 2 && rnd() < 0.05 ? '1UP' : U.pick(letters) }); podX += ri(900, 1300); }
      x += L;
      if (x < arenaX - 700) x += St.gap(rnd, ri, plats, traps, x, pickW(rnd, WT.gap), th);
      seg++;
    }
    plats.push({ x0: x - 40, x1: arenaX + 1700, y: FL, solid: true });
    plats.push({ x0: arenaX + 130, x1: arenaX + 340, y: FL - 190, solid: false }, { x0: arenaX + 380, x1: arenaX + 620, y: FL - 100, solid: false });
    St.spread(events);
    events.sort((a, b) => a.x - b.x);
    return { n, len, arenaX, endX: arenaX + 1500, plats, events, traps, theme: th, boss: St.bossIdx(n) };
  };

  /* snipers, turrets and pillboxes never share a spot: two groups on one ledge could both clamp to the same end and stack (a pillbox with a turret inside it). A later one is moved along its own
     ledge / floor stretch to the nearest free spot, or dropped when there is no room. Runs after generation, so the random sequence (and every other stage layout) is untouched. */
  St.spread = function (events) {
    const GAP = 120, isE = (e) => e.type === 'sniper' || e.type === 'turret' || e.type === 'pillbox', placed = [];
    const free = (x, y) => !placed.some((q) => Math.abs(q.x - x) < GAP && Math.abs(q.y - y) < 8);
    for (let i = 0; i < events.length; i++) {
      const e = events[i]; if (!isE(e)) continue;
      if (!free(e.x, e.y)) {
        let nx = null;
        for (let k = 1; k <= 8 && nx === null; k++) for (const sgn of [1, -1]) { const c = e.x + sgn * k * 40; if (c >= e.lo && c <= e.hi && free(c, e.y)) { nx = c; break; } }
        if (nx === null) { events.splice(i--, 1); continue; }
        e.x = nx;
      }
      placed.push(e);
    }
  };

  /* a gap between two ground segments; returns its width. Every crossing stays well inside what a jump can do (a plain hop is 120 px at most; jump range is ~165 px). */
  St.gap = function (rnd, ri, plats, traps, x, kind, th) {
    const P = (o) => { o.solid = false; o.bx0 = o.x0; o.bx1 = o.x1; o.by = o.y; o.o = 0; o.dx = 0; o.dy = 0; plats.push(o); return o; };
    const fit = (G, w, kmax) => { let k = Math.min(kmax, Math.ceil((G - 70) / (w + 70)) + (rnd() < 0.4 ? 1 : 0)); while (k > 1 && (G - k * w) / (k + 1) < 20) k--; return k; };
    if (kind === 'stones') {
      const G = ri(210, 290);
      plats.push({ x0: x + G * 0.33 - 45, x1: x + G * 0.33 + 45, y: FL - 30, solid: false }, { x0: x + G * 0.66 - 45, x1: x + G * 0.66 + 45, y: FL - 30, solid: false });
      return G;
    }
    if (kind === 'move') {
      const G = ri(250, 340);
      if (G <= 300) P({ x0: x + G / 2 - 50, x1: x + G / 2 + 50, y: FL - 24, t: 'move', mv: { ax: 'x', r: (G - 140) / 2, per: 3.4 + rnd() * 0.9, ph: rnd() * 6.28 } });
      else {
        const per = 3.6 + rnd() * 0.8, ph = rnd() * 6.28;
        P({ x0: x + G * 0.3 - 45, x1: x + G * 0.3 + 45, y: FL - 24, t: 'move', mv: { ax: 'x', r: 38, per, ph } });
        P({ x0: x + G * 0.7 - 45, x1: x + G * 0.7 + 45, y: FL - 62, t: 'move', mv: { ax: 'x', r: 38, per, ph: ph + Math.PI } });
      }
      return G;
    }
    if (kind === 'crumble' || kind === 'blink') {
      const G = ri(250, 340), w = kind === 'crumble' ? 76 : 84, k = fit(G, w, 4), sp = (G - k * w) / (k + 1), per = 2.7 + rnd() * 0.4;
      for (let i = 0; i < k; i++) {
        const x0 = x + sp * (i + 1) + w * i, y = FL - (i % 2 ? 50 : 28);
        if (kind === 'crumble') P({ x0, x1: x0 + w, y, t: 'crumble', cr: { s: 0, tm: 0, vy: 0 } });
        else P({ x0, x1: x0 + w, y, t: 'blink', bl: { per, on: 0.62, ph: i * per * 0.4 }, off: false });
      }
      return G;
    }
    if (kind === 'spring') {
      const G = ri(300, 350);
      traps.push({ k: 'spring', x0: x - 64, x1: x - 20, y: FL, cd: 0, t: 0 });
      P({ x0: x - 40, x1: x + G + 50, y: FL - 200, t: 'high' });
      return G;
    }
    if (kind === 'lift') {
      const G = ri(230, 270);
      P({ x0: x + G / 2 - 48, x1: x + G / 2 + 48, y: FL - 70, t: 'move', mv: { ax: 'y', r: 46, per: 3.6 + rnd() * 0.6, ph: rnd() * 6.28 } });
      return G;
    }
    return ri(88, 118);
  };
})((window.SGS = window.SGS || {}));
