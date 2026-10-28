/* Points: kills (by toughness), boss kills, ability pick-ups and tanks. The running total lives in g.prog.score (so it is saved with the game); popups float up from where the points were earned. */
(function (G) {
  'use strict';
  const S = G.score = {};
  S.BOSS = { beetle: 3000, moth: 5000, wyrm: 7000, jelly: 9000, heart: 15000 };
  S.ITEM = { ability: 1000, energy: 500, missile: 250, super: 300 };
  S.add = function (g, pts, x, y, big) {
    pts = Math.round(pts); if (!(pts > 0)) return;
    g.prog.score = (g.prog.score || 0) + pts;
    if (x !== undefined) { g.popups = g.popups || []; g.popups.push({ x, y, t: 0, txt: '+' + pts, big: !!big }); }
  };
  S.kill = (g, f) => S.add(g, 50 * Math.max(1, f.hpMax || 2), f.x, f.y - f.h - 4);
  S.item = (g, def, x, y) => S.add(g, def.tank ? S.ITEM[def.tank] || 250 : S.ITEM.ability, x, y - 14, !def.tank);
  S.boss = (g, b) => S.add(g, S.BOSS[b.kind] || 3000, b.x, b.y - 40, true);
  S.update = function (g) { if (!g.popups) return; for (const q of g.popups) q.t++; g.popups = g.popups.filter((q) => q.t < 70); };
  S.draw = function (ctx, g) {
    for (const q of g.popups || []) {
      const y = Math.round(q.y - q.t * 0.35), a = q.t > 52 ? 1 - (q.t - 52) / 18 : 1; if (a <= 0) continue;
      ctx.globalAlpha = a; G.px.text(ctx, q.txt, Math.round(q.x), y, { s: 1, c: q.big ? '#ffe07a' : '#f2ffff', o: '#0a0e2c', a: 'c' }); ctx.globalAlpha = 1;
    }
  };
  S.total = (g) => (g.prog && g.prog.score) || 0;
})((window.SGS = window.SGS || {}));
