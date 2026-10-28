/* HUD in the 5x7 pixel font: score, high score, round, lives, EXTEND letters, banners. */
(function (G) {
  'use strict';
  const PX = G.px, U = G.U, S = G.sprites;
  const HUD = {};
  G.hud = HUD;
  const OL = '#0b0d1a', ORG = '#ff9a3d', WHT = '#ffffff';
  const T = (ctx, s, x, y, c, sz, a, extra) => PX.text(ctx, s, x, y, Object.assign({ s: sz || 1, c, o: OL, a: a || 'l' }, extra || {}));
  HUD.draw = function (ctx, g, iw, time, demo) {
    if (!g.room) return;
    const ox = Math.floor((iw - g.cols * 8) / 2);
    if (!demo) {
      ctx.fillStyle = 'rgba(8,10,26,0.82)'; ctx.fillRect(ox, 0, g.cols * 8, 18); ctx.fillStyle = '#2a3a66'; ctx.fillRect(ox, 18, g.cols * 8, 1);
      T(ctx, '1UP', ox + 20, 1, ORG); T(ctx, U.fmt(g.score), ox + 20, 9, WHT);
      T(ctx, 'HIGH SCORE', iw / 2, 1, ORG, 1, 'c'); T(ctx, U.fmt(Math.max(G.scores.best(), g.score)), iw / 2, 9, '#9fe8ff', 1, 'c');
      T(ctx, 'ROUND ' + g.level, iw - ox - 20, 1, ORG, 1, 'r'); T(ctx, G.levels.WORLDS[g.world].name, iw - ox - 20, 9, '#a8c0e8', 1, 'r');
      // lives and EXTEND letters on the floor strip
      for (let i = 0; i < Math.max(0, g.lives - 1) && i < 8; i++) ctx.drawImage(S.life, ox + 20 + i * 10, 231, 9, 9);
      const L = g.letters.have, c0 = iw / 2 - 17;
      for (let i = 0; i < 6; i++) T(ctx, 'EXTEND'[i], c0 + i * 6, 232, L[i] ? '#ffd24a' : '#4a4a6a', 1, 'l', { o: L[i] ? OL : '' });
      let px = iw - ox - 20;
      for (const [k, col, n] of [['speed', '#3a8aff', 'SPD'], ['rapid', '#ff4ad8', 'RPD'], ['range', '#ffd24a', 'RNG']]) if (g.perks[k] > 0) { px -= 20; T(ctx, n, px, 232, g.perks[k] < 4 && Math.floor(time * 6) % 2 ? '#555' : col); }
    }
    if (g.state === 'intro' && !demo) {
      const w = G.levels.WORLDS[g.world], boss = g.room.boss;
      T(ctx, boss ? 'WARNING' : 'ROUND ' + g.level, iw / 2, 84, boss ? '#ff6a6a' : WHT, 3, 'c', { g: boss ? ['#ffd0d0', '#ff4a4a'] : ['#ffffff', '#ffb36a'], sh: '#3a1a6a' });
      T(ctx, boss ? w.boss : w.name, iw / 2, 114, '#9fe8ff', 1, 'c');
      if (g.level % 10 === 1) T(ctx, 'WORLD ' + (g.world + 1), iw / 2, 70, ORG, 1, 'c');
    }
    const b = g.bannerO;
    if (b && !demo) {
      const k = b.t / b.life, a = k < 0.1 ? k / 0.1 : k > 0.8 ? Math.max(0, (1 - k) / 0.2) : 1, col = b.kind === 'bad' ? '#ff6a6a' : b.kind === 'good' ? '#7dffb8' : WHT;
      ctx.save(); ctx.globalAlpha = a; T(ctx, b.text, iw / 2, 96, col, 2, 'c', { sh: '#2a1a4a' }); ctx.restore();
    }
  };
})((window.SGS = window.SGS || {}));
