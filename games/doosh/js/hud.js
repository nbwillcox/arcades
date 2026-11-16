// Stick Doosh - hud.js (core): comic-panel HUD - team portraits, hearts/armor, gold, weapon, specials, boss bar, FPS.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';

  function panel(ctx, x, y, w, h, fill, rot) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot || 0);
    ctx.fillStyle = INK; ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w, h);
    ctx.fillStyle = fill || '#fffbe8'; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }
  function heart(ctx, x, y, s, fill, half) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(0, 5); ctx.bezierCurveTo(-9, -1, -5, -8, 0, -3); ctx.bezierCurveTo(5, -8, 9, -1, 0, 5); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 1.8 / s; ctx.strokeStyle = INK; ctx.stroke();
    if (fill !== '#e8173a' && half !== true) { /* empty */ }
    ctx.restore();
  }
  function text(ctx, t, x, y, size, color, align, stroke) {
    ctx.font = Math.round(size) + 'px Bangers, Impact, "Arial Black", sans-serif';
    ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.5, size * 0.2); ctx.strokeStyle = stroke || INK; ctx.strokeText(t, x, y);
    ctx.fillStyle = color || '#fff'; ctx.fillText(t, x, y);
  }
  let fpsAcc = 0, fpsN = 0, fpsShow = 0;
  const CROSS_COL = { white: '#ffffff', red: '#ff4040', green: '#7dff6b', cyan: '#3df2ff', yellow: '#ffe14d' }, CROSS_DEF = { size: 1, style: 'comic', color: 'weapon' };

  const HUD = S.HUD = {
    draw(ctx, W, H) {
      const G = S.Game, p = G.player; if (!p) return;
      ctx.save();
      const mob = S.Main && S.Main.device && S.Main.device.touch;
      const pad = 10;
      // ---- team portraits ----
      let x = pad;
      const y0 = pad;
      for (let i = 0; i < G.team.length; i++) {
        const m = G.team[i], cur = i === G.teamIdx && !p.dead, dd = S.Dudes[m.id];
        const w = cur ? 40 : 28, h = cur ? 40 : 28;
        panel(ctx, x, y0 + (cur ? 0 : 6), w, h, cur ? '#ffe14d' : '#fffbe8', cur ? -0.03 : 0.02);
        ctx.save(); ctx.beginPath(); ctx.rect(x + 1, y0 + (cur ? 0 : 6) + 1, w - 2, h - 2); ctx.clip();
        if (S.Rig && dd) S.Rig.drawHead(ctx, x + w / 2, y0 + (cur ? 0 : 6) + h * 0.52, dd.look, cur ? 1.25 : 0.88, m.dead ? 'dead' : null);
        ctx.restore();
        if (m.dead) {
          ctx.fillStyle = 'rgba(40,30,50,0.55)'; ctx.fillRect(x, y0 + 6, w, h);
          ctx.strokeStyle = '#e8173a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 4, y0 + 10); ctx.lineTo(x + w - 4, y0 + h + 2); ctx.moveTo(x + w - 4, y0 + 10); ctx.lineTo(x + 4, y0 + h + 2); ctx.stroke();
        }
        x += w + 5;
      }
      if (S.Save && S.Save.data.cheats.infLives) text(ctx, '∞', x + 4, y0 + 22, 30, '#7dff6b', 'left');
      // ---- hearts + armor ----
      let hy = y0 + 54;
      const full = Math.floor(p.hp + 1e-6), halves = p.hp - full > 0.25;
      for (let i = 0; i < Math.ceil(p.maxHp); i++) {
        const hx = pad + 9 + i * 19;
        heart(ctx, hx, hy, 1.15, i < full ? '#e8173a' : (i === full && halves ? '#ff9ab0' : '#5c5970'));
      }
      for (let i = 0; i < Math.ceil(p.armor); i++) {
        const ax = pad + 9 + i * 17;
        ctx.save(); ctx.translate(ax, hy + 17); ctx.beginPath(); ctx.moveTo(-6, -6); ctx.lineTo(6, -6); ctx.lineTo(6, 1); ctx.quadraticCurveTo(0, 8, -6, 1); ctx.closePath();
        ctx.fillStyle = '#bfe1ff'; ctx.fill(); ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.stroke(); ctx.restore();
      }
      // ---- weapon / specials (below hearts) ----
      const wy = hy + (p.maxArmor > 0 ? 38 : 22);
      const gd = S.Weapons[p.gun];
      if (gd) text(ctx, gd.name + (p.mega ? ' MEGA!' : ''), pad, wy, 15, p.mega ? '#ffe14d' : '#ffffff');
      const sel = S.Player.selectables(), cur = sel.length ? sel[p.selected % sel.length] : null;
      if (cur) {
        const sy = wy + 20;
        const n = cur.super ? Math.floor(p.superAmmo) : p.specials;
        panel(ctx, pad, sy - 9, 18, 18, cur.color || (cur.super ? '#c77dff' : '#ffb81c'), -0.05);
        text(ctx, String(cur.icon || '*').slice(0, 1), pad + 9, sy + 1, 13, '#ffffff', 'center');
        text(ctx, cur.name + '  x' + n, pad + 24, sy, 13, n > 0 ? '#ffffff' : '#9a96b0');
        if (sel.length > 1) text(ctx, '[' + (S.Input && S.Input.keyName((S.Save.settings.input.keys.cycle || [])[0])) + '] SWITCH', pad + 24, sy + 14, 10, '#ffe14d');
      }
      // ---- gold + time (top right) ----
      const gx = W - pad - 4 - (mob ? 54 : 0);
      panel(ctx, gx - 112, y0, 116, 24, '#fffbe8', 0.02);
      ctx.beginPath(); ctx.arc(gx - 100, y0 + 12, 7, 0, U.TAU); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
      text(ctx, '$' + G.gold, gx - 2, y0 + 13, 17, '#ffd23f', 'right');
      const tm = Math.floor(G.time), ts = Math.floor(tm / 60) + ':' + ('0' + (tm % 60)).slice(-2);
      text(ctx, ts, gx - 2, y0 + 36, 13, '#ffffff', 'right');
      if (G.rescues) text(ctx, 'RESCUED ' + G.rescues, gx - 2, y0 + 50, 12, '#7dff6b', 'right');
      if (mob) { /* pause button is drawn by touch overlay */ }
      // ---- boss bar ----
      const b = G.boss;
      if (b && !b.dead && b.maxHp && (G.state === 'boss' || G.state === 'bossdeath' || G.state === 'bossintro')) {
        // fairness: the bar lives at the TOP (it used to sit on the floor line and hid every ground telegraph: rams, crests, floor markers)
        const bw = Math.max(170, Math.min(320, W - 480)), bx = (W - bw) / 2, by = 40;
        const name = ((S.BossDefs && S.BossDefs[G.levelId] && S.BossDefs[G.levelId].name) || b.name || (b.def && b.def.name) || 'BOSS').toUpperCase();
        panel(ctx, bx - 6, by - 20, bw + 12, 36, '#fffbe8', -0.01);
        text(ctx, name, W / 2, by - 8, 14, '#e8173a', 'center', '#ffffff');
        ctx.fillStyle = '#3d3754'; ctx.fillRect(bx, by, bw, 10);
        const k = U.clamp(b.hp / b.maxHp, 0, 1);
        ctx.fillStyle = k > 0.5 ? '#e8173a' : '#ff7a1a'; ctx.fillRect(bx, by, bw * k, 10);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx, by, bw * k, 3);
        ctx.lineWidth = 2.2; ctx.strokeStyle = INK; ctx.strokeRect(bx, by, bw, 10);
        if (b.enraged || k < 0.5) text(ctx, 'ENRAGED', bx + bw, by - 8, 10, '#ff7a1a', 'right');
      }
      // ---- low hp pulse ----
      if (!p.dead && p.hp <= 1 && p.maxHp > 1 && !(S.Save && S.Save.settings.video.reduceFlash)) {
        const a = 0.12 + 0.08 * Math.sin(G.time * 6);
        const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85);
        gr.addColorStop(0, 'rgba(232,23,58,0)'); gr.addColorStop(1, 'rgba(232,23,58,' + a * 2 + ')');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
      }
      // ---- fps ----
      if ((S.Save && S.Save.settings.video.fps) || (S.Main && S.Main.flags && S.Main.flags.fps)) {
        fpsAcc += S.Main.frameMs || 16; fpsN++;
        if (fpsN >= 20) { fpsShow = Math.round(1000 / (fpsAcc / fpsN)); fpsAcc = 0; fpsN = 0; }
        text(ctx, fpsShow + ' FPS' + (S.Main.qualityLow ? ' (LOW)' : ''), W / 2, 12, 12, '#7dff6b', 'center');
      }
      ctx.restore();
    },
    // aim: comic crosshair (screen space). mouse = at the cursor, stick/touch = 140 px out along the aim, keys = small arrow by the dude.
    drawAim(ctx, W, H) {
      const G = S.Game, p = G && G.player, I = S.Input;
      if (!p || p.dead || p.hidden || !I || !I.cfg || G.paused) return;
      if (G.state === 'intro' || G.state === 'clear' || G.state === 'fail' || G.state === 'chopper') return;
      const cs = I.cfg('cross') || CROSS_DEF, style = cs.style || 'comic';
      if (style === 'off') return;
      const mode = p.aimMode, cam = G.cam, d = p.aimDir;
      const k = Math.max(0.5, Math.min(2, Number(cs.size) || 1));
      const wd = S.Weapons && S.Weapons[p.gun];
      const col = CROSS_COL[cs.color] || (wd && wd.color) || '#ffffff';
      const py = p.y - S.Rig.shoulderH(p.look), pop = p.crossPop || 0;
      ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (mode === 'keys') { // small arrow pointing along the aim, hovering next to the dude
        ctx.translate(p.x - cam.x + d.x * 40, py - cam.y + d.y * 40); ctx.rotate(p.aimAng);
        const s = k * (1 + pop * 0.3);
        ctx.beginPath(); ctx.moveTo(-6 * s, -5 * s); ctx.lineTo(3 * s, 0); ctx.lineTo(-6 * s, 5 * s); ctx.lineTo(-3 * s, 0); ctx.closePath();
        ctx.lineWidth = 3.4; ctx.strokeStyle = INK; ctx.stroke(); ctx.fillStyle = col; ctx.fill();
        ctx.restore(); return;
      }
      let x, y;
      if (mode === 'mouse') { x = I.mouse.x; y = I.mouse.y; }
      else { x = U.clamp(p.x - cam.x + d.x * 140, 10, W - 10); y = U.clamp(py - cam.y + d.y * 140, 10, H - 10); }
      ctx.translate(x, y);
      const sc = k * (1 + pop * 0.35); ctx.scale(sc, sc);
      if (pop > 0) ctx.rotate((Math.random() - 0.5) * 0.5 * pop);
      if (style === 'dot') {
        ctx.beginPath(); ctx.arc(0, 0, 4.2, 0, U.TAU); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
      } else if (style === 'cross') {
        ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(-3, 0); ctx.moveTo(11, 0); ctx.lineTo(3, 0); ctx.moveTo(0, -11); ctx.lineTo(0, -3); ctx.moveTo(0, 11); ctx.lineTo(0, 3);
        ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.2; ctx.strokeStyle = col; ctx.stroke();
      } else { // comic: thick ink ring + dot + 4 ticks
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, U.TAU);
        ctx.lineWidth = 5.4; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2.4; ctx.strokeStyle = col; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -12.5); ctx.lineTo(0, -17.5); ctx.moveTo(0, 12.5); ctx.lineTo(0, 17.5); ctx.moveTo(-12.5, 0); ctx.lineTo(-17.5, 0); ctx.moveTo(12.5, 0); ctx.lineTo(17.5, 0);
        ctx.lineWidth = 4.6; ctx.strokeStyle = INK; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 2.7, 0, U.TAU); ctx.fillStyle = INK; ctx.fill();
        ctx.beginPath(); ctx.arc(0, 0, 1.4, 0, U.TAU); ctx.fillStyle = col; ctx.fill();
      }
      ctx.restore();
    },
  };
})();
