/* Pencil-style HUD: hearts, lives, score, time, enemy bar, GO arrow and the stage banners. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, ART = G.art;
  const H = {};
  const font = (px, w) => (w || 800) + ' ' + px + 'px ' + ART.FONT;

  function label(ctx, str, x, y, px, col, align) {
    ctx.font = font(px); ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(241,233,212,0.92)'; ctx.strokeText(str, x, y);
    ctx.fillStyle = col || C.INK; ctx.fillText(str, x, y);
  }
  H.label = label;

  function plate(ctx, x, y, w, h) {
    ctx.save(); ctx.fillStyle = 'rgba(241,233,212,0.8)'; ctx.strokeStyle = 'rgba(43,42,39,0.5)'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(x + 4, y); ctx.lineTo(x + w - 4, y); ctx.quadraticCurveTo(x + w, y, x + w, y + 4); ctx.lineTo(x + w, y + h - 4); ctx.quadraticCurveTo(x + w, y + h, x + w - 4, y + h); ctx.lineTo(x + 4, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - 4); ctx.lineTo(x, y + 4); ctx.quadraticCurveTo(x, y, x + 4, y); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }
  function enemyBar(ctx, name, ratio, x, y, w) {
    plate(ctx, x - w - 6, y - 17, w + 10, 27);
    label(ctx, name, x, y - 7, 8, C.RED_D, 'right');
    ctx.fillStyle = 'rgba(40,36,30,0.14)'; ctx.fillRect(x - w, y, w, 6);
    ctx.fillStyle = C.RED; ctx.fillRect(x - w, y, w * U.clamp(ratio, 0, 1), 6);
    ART.hatch(ctx, x - w, y, w * U.clamp(ratio, 0, 1), 6, 1.6, 0.8, 0.3, '#4a0d09');
    ctx.strokeStyle = C.INK; ctx.lineWidth = 1; ctx.strokeRect(x - w, y, w, 6);
  }

  H.draw = function (ctx, g) {
    const p = g.player;
    if (!p) return;
    /* small pencil plates so the HUD stays readable over any backdrop */
    plate(ctx, 3, 3, 224, 40); plate(ctx, C.W / 2 - 56, 3, 112, 17); plate(ctx, C.W - 98, 3, 95, 21);
    /* the weapon in your hands, and how many hits it has left */
    if (p.weapon) {
      const W0 = G.fighter.WEAPON[p.weapon.type], heavy = G.fighter.HEAVY[p.weapon.type];
      plate(ctx, 3, C.H - 30, heavy ? 44 : 86, 27);
      if (p.weapon.type === 'crate') ART.crate(ctx, 20, C.H - 8, 0); else if (p.weapon.type === 'barrel') ART.barrel(ctx, 20, C.H - 8, 0);
      else {
        ART.weaponIcon(ctx, p.weapon.type, 12, C.H - 14, -90, 0.7);
        const frac = U.clamp(p.weapon.uses / W0.uses, 0, 1), bx = 38, by = C.H - 20;
        ctx.fillStyle = 'rgba(40,36,30,0.16)'; ctx.fillRect(bx, by, 44, 6);
        ctx.fillStyle = frac > 0.3 ? '#6b8f3a' : '#c62a1f'; ctx.fillRect(bx, by, 44 * frac, 6);
        ART.hatch(ctx, bx, by, 44 * frac, 6, 1.6, 0.8, 0.3, '#2b2a27');
        ctx.strokeStyle = C.INK; ctx.lineWidth = 0.9; ctx.strokeRect(bx, by, 44, 6);
      }
    }
    /* hearts */
    const hearts = Math.round(p.maxhp / C.HEART), hurt = g.hudHurt > 0 && Math.floor(g.hudHurt * 20) % 2 === 0;
    for (let i = 0; i < hearts; i++) ART.heart(ctx, 14 + i * 15, 14, hurt ? 1.18 : 1, U.clamp((p.hp - i * C.HEART) / C.HEART, 0, 1), C.RED);
    /* lives: a little blue head and a count */
    ctx.save(); ctx.translate(15, 31);
    ctx.fillStyle = C.PAPER; ctx.strokeStyle = C.BLUE; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, 6.3); ctx.fill(); ctx.stroke();
    ctx.restore();
    label(ctx, 'x ' + Math.max(0, g.lives), 24, 31, 10, C.BLUE_D);
    /* score */
    label(ctx, 'SCORE', 96, 31, 8, '#6d6a5d');
    label(ctx, U.pad(g.score, 6), 134, 31, 11, C.INK);
    const best = G.scores ? Math.max(G.scores.best(), g.score) : g.score;
    label(ctx, 'HI ' + U.pad(best, 6), C.W / 2 + 8, 12, 9, '#6d6a5d', 'center');
    /* time */
    const tl = Math.ceil(g.timeLeft), low = tl <= 30;
    label(ctx, 'TIME', C.W - 66, 12, 8, '#6d6a5d', 'right');
    label(ctx, String(tl), C.W - 14, 12, 12, low && Math.floor(g.timeLeft * 3) % 2 === 0 ? C.RED : C.INK, 'right');
    /* enemy bar: boss when one is out, else whoever was hit last */
    const be = g.bossBar && g.bossBar.hp > 0 ? g.bossBar : (g.lastHitE && g.lastHitT > 0 && g.lastHitE.hp > 0 ? g.lastHitE : null);
    if (be) enemyBar(ctx, be.def.name, be.hp / be.maxhp, C.W - 10, 42, be.def.boss ? 110 : 70);

    if (p.state === 'grabbed') label(ctx, 'MASH BUTTONS!', p.x - g.camX, p.y - 62, 10, C.RED, 'center');
    /* combo counter */
    if (g.combo && g.combo.n >= 2 && g.combo.t > 0) {
      const n = g.combo.n, sz = Math.min(18, 11 + n), jig = g.combo.pop > 0 ? 1 + g.combo.pop * 2 : 1;
      ctx.save(); ctx.translate(10, 62); ctx.rotate(-0.05); ctx.scale(jig, jig);
      label(ctx, n + ' HIT COMBO!', 0, 0, sz, n >= 5 ? C.RED : C.BLUE_D, 'left'); ctx.restore();
    }
    /* GO arrow */
    if (g.goT > 0 && Math.floor(g.goT * 2.6) % 2 === 0 && g.mode === 'play') {
      const x = C.W - 54, y = 108;
      ctx.save(); ctx.translate(x, y);
      label(ctx, 'GO', 0, -16, 20, '#c9a227', 'center');
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.INK; ctx.lineWidth = 3.2;
      ctx.fillStyle = '#e8b81f';
      ctx.beginPath(); ctx.moveTo(-26, -2); ctx.lineTo(4, -2); ctx.lineTo(4, -10); ctx.lineTo(26, 6); ctx.lineTo(4, 22); ctx.lineTo(4, 14); ctx.lineTo(-26, 14); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    /* stage banner */
    if (g.introT < 3 && g.mode === 'play') {
      const u = g.introT / 3, a = u < 0.15 ? u / 0.15 : u > 0.8 ? (1 - u) / 0.2 : 1;
      ctx.globalAlpha = U.clamp(a, 0, 1);
      plate(ctx, C.W / 2 - 124, 82, 248, 60);
      label(ctx, g.level.sub, C.W / 2, 96, 12, '#6d6a5d', 'center');
      label(ctx, g.level.name, C.W / 2, 118, 26, C.INK, 'center');
      ctx.strokeStyle = C.RED; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(C.W / 2 - 92, 134); ctx.lineTo(C.W / 2 + 92, 133); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    /* boss warning */
    if (g.curWave && (g.curWave.boss || g.curWave.mini) && g.waveActive && g.bossT < 3) {
      if (g.bossT < 2.2 && Math.floor(g.bossT * 4) % 2 === 0) label(ctx, 'WARNING!', C.W / 2, 98, 24, C.RED, 'center');
      if (g.bossT > 0.6 && g.bossBar) label(ctx, g.bossBar.def.name, C.W / 2, 124, 13, C.RED_D, 'center');
    }
    /* stage clear */
    if (g.mode === 'clear') {
      const t = g.clearT;
      label(ctx, 'STAGE CLEAR!', C.W / 2, 88, 28, C.BLUE_D, 'center');
      if (t > 1.2) { label(ctx, 'TIME BONUS', C.W / 2 - 14, 128, 11, C.INK, 'right'); label(ctx, String(Math.max(0, g.timeBonus)), C.W / 2 + 6, 128, 11, C.INK, 'left'); }
      if (t > 1.6) { label(ctx, 'HEART BONUS', C.W / 2 - 14, 148, 11, C.INK, 'right'); label(ctx, String(Math.max(0, g.lifeBonus)), C.W / 2 + 6, 148, 11, C.INK, 'left'); }
    }
    if (G.debug.on) label(ctx, 'DEBUG 1-5 spawn  0,6-9 items  G drum  H heal  E clear', 8, C.H - 8, 8, '#6d6a5d');
  };
  G.hud = H;
})((window.SGS = window.SGS || {}));
