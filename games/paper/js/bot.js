/* ?bot=1 autopilot: steers to a throwing lane for the next house / target, dodges obstacles, throws, hops. Used for testing. */
(function (G) {
  'use strict';
  const C = G.C, I = G.input;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  G.bot = {
    drive(game) {
      const P = game.p, R = game.route, tl = 0.84; let tx = 0, thr = 0; if (game.t < (this.last || 0)) { this.last = 0; this.cd = 0; }
      const aim = P.z + P.speed * tl;
      if (R.kind === 'route') {
        for (const h of R.houses) { if (h.z1 < P.z - 20) continue; if (h.z0 > P.z + 120) break; if (h.cancelled) continue; if (h.sub && !h.delivered) { tx = h.side * 6; if (Math.abs(h.zc - aim) < 4) { thr = h.side; } break; } }
        if (!thr && !R.houses.some((q) => q.sub && !q.delivered && !q.cancelled && q.zc > P.z - 10 && q.zc < aim + 30)) for (const h of R.houses) { if (h.sub || h.z0 > P.z + 70 || h.z1 < P.z) continue; const w = h.windows[0]; if (w && !w.broken && Math.abs(w.z - aim) < 5 && P.papers > 6) { tx = h.side * 30; thr = h.side; break; } }
      } else if (R.kind === 'course') {
        for (const o of R.deco) { if (o.t === 'target' && !o.hit && o.z > P.z - 10 && o.z < P.z + 110) { tx = 0; if (Math.abs(o.z - aim) < 6) thr = o.side; break; } }
        for (const o of R.deco) { if (o.t === 'ramp' && !o.used && o.z > P.z && o.z < P.z + 80) { tx = o.x; break; } }
        for (const o of R.deco) { if (o.t === 'bar' && Math.abs(o.z - P.z - 12) < 8) I._hop = 1; }
      } else if (game.boss) {
        const b = game.boss; tx = -Math.sign(b.x) * 30; if (b.state !== 'enter' && !this.cd2) { thr = Math.sign(b.x) || 1; } if (b.state === 'charge' || b.state === 'warn') tx = 0;
      }
      let thrt = null;
      const look = (x, z, r) => { const dz = z - P.z; if (dz > -6 && dz < 70 && Math.abs(x - P.x) < r) thrt = x; };
      for (const c of game.cars) if (!c.cross) look(c.x, c.z - (c.vz < 0 ? 12 : 0), 20); else if (c.z - P.z > -10 && c.z - P.z < 50 && Math.abs(c.x) < 90) thrt = 0;
      for (const o of R.deco) { if (o.z > P.z + 70) break; if (o.solid || o.t === 'pothole') look(o.x, o.z, 14); }
      for (const d of R.dogs) if (d.state === 'chase') look(d.x, d.z, 22);
      for (const m of R.movers) look(m.x, m.z, 16);
      if (thrt !== null) { let dir = P.x >= thrt ? 1 : -1; if (Math.abs(P.x + dir * 28) > 52) dir = -dir; tx = P.x + dir * 28; }
      for (const h of game.haz) if (h.tx !== undefined && Math.hypot(h.tx - P.x, h.tz - P.z) < 30) tx = P.x + (P.x > h.tx ? 30 : -30);
      I.script = { ax: clamp((tx - P.x) / 24, -1, 1), ay: 0 };
      if (thr && P.crash <= 0 && (game.t - (this.last || 0) > 0.3)) { this.last = game.t; this.cd = game.t; if (thr > 0) I._tr = 1; else I._tl = 1; }
      if (game.boss && game.boss.state === 'sweep') I._hop = 1;
    },
  };
})((window.SGS = window.SGS || {}));
