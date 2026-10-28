/* Floating space rock and crystal clusters that drift below and around the tracks, so the courses read as islands hanging in a real place. Drawn before the terrain. */
(function (G) {
  'use strict';
  const U = G.U, GFX = G.gfx, R = G.render, TAU = U.TAU;
  const Sc = { props: [], sprites: [], theme: null };
  const hsl = U.hsl;

  /* one faceted rock: dark body, lit facets, neon-edged and with a few glowing crystals */
  function rockSprite(th, seed) {
    const S = 160, c = GFX.mk(S, S), x = c.getContext('2d'), rnd = U.mulberry(seed * 53 + th.hue), h = th.hue;
    const n = 7 + ((rnd() * 3) | 0), pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU + rnd() * 0.4, r = 52 + rnd() * 26; pts.push([S / 2 + Math.cos(a) * r, S / 2 + Math.sin(a) * r * 0.82]); }
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath();
    x.fillStyle = GFX.lg(x, 30, 20, 130, 140, [[0, hsl(h, 34, 24)], [1, hsl(h + 10, 40, 6)]]); x.fill();
    x.save(); x.clip();
    for (let i = 0; i < n; i++) {                                             /* facets fanned from an off-centre point */
      const a = pts[i], b = pts[(i + 1) % n], cx = S / 2 - 8, cy = S / 2 - 10;
      x.fillStyle = 'rgba(' + (i % 2 ? '255,255,255' : '0,0,16') + ',' + (0.05 + rnd() * 0.16) + ')';
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(0,0,16,0.35)'; x.lineWidth = 1.2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(a[0], a[1]); x.stroke();
    }
    x.restore();
    x.strokeStyle = hsl(h, 90, 60, 0.8); x.lineWidth = 2.4; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < n; i++) x.lineTo(pts[i][0], pts[i][1]); x.closePath(); x.stroke();
    /* crystals */
    for (let k = 0; k < 3; k++) {
      const bx = S / 2 + (rnd() - 0.5) * 70, by = S / 2 + (rnd() - 0.5) * 40, hh = 22 + rnd() * 26, w = 6 + rnd() * 7;
      x.fillStyle = GFX.lg(x, bx - w, by, bx + w, by - hh, [[0, hsl(h + 40, 90, 40, 0.9)], [1, hsl(h + 40, 100, 78, 0.95)]]);
      x.beginPath(); x.moveTo(bx - w, by); x.lineTo(bx - w * 0.4, by - hh * 0.85); x.lineTo(bx, by - hh); x.lineTo(bx + w * 0.5, by - hh * 0.8); x.lineTo(bx + w, by); x.closePath(); x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.8)'; x.lineWidth = 1; x.stroke();
    }
    return c;
  }

  Sc.build = function (level) {
    const th = level.theme, W = level.world, rnd = U.mulberry((level.id || 1) * 977);
    Sc.theme = th; Sc.props = [];
    if (!Sc.sprites[th.hue]) Sc.sprites[th.hue] = [0, 1, 2, 3, 4].map((i) => rockSprite(th, i + 1));
    Sc.spr = Sc.sprites[th.hue];
    const path = level.path;
    for (let i = 0; i < 70; i++) {
      const p = path[(rnd() * path.length) | 0], a = rnd() * TAU, d = 7 + rnd() * 22;
      const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d;
      const gz = W.heightAt(x, y);
      if (gz > -Infinity) continue;                                            /* never inside a track */
      const near = Math.min(...path.filter((_, k) => k % 3 === 0).map((q) => Math.hypot(q.x - x, q.y - y)));
      if (near < 5) continue;
      Sc.props.push({ x, y, z: W.zmin - 3.5 - rnd() * 14 + (rnd() < 0.25 ? 12 + rnd() * 8 : 0), size: 0.5 + rnd() * 1.1, v: (rnd() * Sc.spr.length) | 0, ph: rnd() * 6, rot: (rnd() - 0.5) * 0.5, sp: 0.25 + rnd() * 0.5 });
    }
    Sc.props.sort((a, b) => (a.x + a.y) - (b.x + b.y));
  };

  Sc.draw = function (ctx, t) {
    for (const p of Sc.props) {
      const sx = R.sx(p.x, p.y), z = p.z + Math.sin(t * p.sp + p.ph) * 0.35, sy = R.sy(p.x, p.y, z), s = 150 * p.size * R.zoom;
      if (sx < -s || sx > R.W + s || sy < -s || sy > R.H + s) continue;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(p.rot + Math.sin(t * 0.2 + p.ph) * 0.05);
      ctx.drawImage(Sc.spr[p.v], -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  };

  G.scenery = Sc;
})((window.SGS = window.SGS || {}));
