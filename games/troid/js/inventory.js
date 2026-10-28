/* The status screen: what the hero carries (beams, suits, boots, tools, supplies), score, time, and the two things the player can change here: which beams are switched on and whether
   the gun is a charge shot or rapid fire. Opens with I (or from the pause menu); Up / Down pick a choice, Jump / Fire toggles it, I / Esc closes. */
(function (G) {
  'use strict';
  const PX = G.px, V = G.inv = { sel: 0 };
  const T = (ctx, s, x, y, c, a, sz) => PX.text(ctx, s, x, y, { s: sz || 1, c: c || '#dde7fb', o: '#05071a', a });
  const fmtTime = (t) => { t = Math.floor(t); const h = Math.floor(t / 3600), m = Math.floor(t / 60) % 60, s = t % 60; return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':'); };
  const rows = (g) => {
    const A = g.abil, B = A.beams || {};
    return {
      beams: [{ t: 'CHARGE', own: A.charge, c: '#ffd24a' }, { t: 'ICE', own: A.hasIce, on: B.ice, c: '#7ad8ff', k: 'ice' }, { t: 'WAVE', own: A.hasWave, on: B.wave, c: '#c88aff', k: 'wave' }, { t: 'PLASMA', own: A.hasPlasma, on: B.plasma, c: '#ff8a3a', k: 'plasma' }],
      suit: [{ t: 'HEAT SUIT', own: A.suitHeat, c: '#ff6a4a' }, { t: 'AQUA SUIT', own: A.suitAqua, c: '#4ad2e8' }, { t: 'DASH BOOTS', own: A.dash, c: '#efba42' }, { t: 'SPACE JUMP', own: A.spacejump, c: '#6ae8c0' }],
      misc: [{ t: 'MORPH BALL', own: A.morph, c: '#6ae8c0' }, { t: 'BOMBS', own: A.bombs, c: '#efba42' }, { t: 'SPINFLIP DRIVE', own: A.spinflip, c: '#86f0f2' }, { t: 'SCAN VISOR', own: A.scan, c: '#ff6ad0' }, { t: 'GRAPPLE BEAM', own: A.grapple, c: '#efba42' }],
    };
  };
  /* the choices the player can make, in order: fire mode, then the beams they own */
  const choices = (g) => { const out = [{ k: 'fire', v: 'charge', own: !!g.abil.charge }, { k: 'fire', v: 'rapid', own: true }]; for (const k of ['ice', 'wave', 'plasma']) out.push({ k: 'beam', v: k, own: !!g.abil['has' + k[0].toUpperCase() + k.slice(1)] }); return out.filter((c) => c.own); };
  V.open = function (g) { V.sel = Math.max(0, choices(g).findIndex((c) => c.k === 'fire' && c.v === (G.weapons.usesCharge(g) ? 'charge' : 'rapid'))); };
  V.update = function (g) {
    const D = G.input.down, M = G.main, list = choices(g);
    if (D.inv || D.pause || D.map) { M.closeInv(); return; }
    if (D.d || D.r) V.sel = (V.sel + 1) % list.length;
    if (D.u || D.l) V.sel = (V.sel + list.length - 1) % list.length;
    if (D.jump || D.fire || D.start) {
      const c = list[V.sel]; if (!c) return;
      if (c.k === 'fire') { G.settings.fireMode = c.v; G.settings.save(); G.audio.sfx('pickup'); }
      else { g.abil.beams[c.v] = !g.abil.beams[c.v]; G.audio.sfx('hit'); }
    }
  };
  function panel(ctx, x, y, w, h, title) {
    ctx.fillStyle = 'rgba(14,18,52,0.92)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#566cac'; ctx.fillRect(x + 2, y, w - 4, 1); ctx.fillRect(x + 2, y + h - 1, w - 4, 1); ctx.fillRect(x, y + 2, 1, h - 4); ctx.fillRect(x + w - 1, y + 2, 1, h - 4);
    ctx.fillStyle = '#8ea2d2'; ctx.fillRect(x + 1, y + 1, 1, 1); ctx.fillRect(x + w - 2, y + 1, 1, 1); ctx.fillRect(x + 1, y + h - 2, 1, 1); ctx.fillRect(x + w - 2, y + h - 2, 1, 1);
    if (title) { const tw = PX.textW(title, 1) + 8; ctx.fillStyle = '#070a1e'; ctx.fillRect(x + Math.round((w - tw) / 2), y - 2, tw, 5); T(ctx, title, x + Math.round(w / 2), y - 3, '#fff2a8', 'c'); }
  }
  function row(ctx, r, x, y, w, sel, time) {
    const own = !!r.own;
    if (sel) { ctx.fillStyle = 'rgba(134,240,242,0.16)'; ctx.fillRect(x - 3, y - 2, w + 6, 11); ctx.fillStyle = Math.floor(time * 4) & 1 ? '#fff2a8' : '#efba42'; ctx.fillRect(x - 7, y + 1, 3, 5); }
    ctx.fillStyle = own ? r.c : '#242c5c'; ctx.fillRect(x, y + 1, 5, 5); if (own) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1, y + 2, 1, 1); } else { ctx.fillStyle = '#0c1030'; ctx.fillRect(x + 1, y + 2, 3, 3); }
    T(ctx, own ? r.t : '- - - - -', x + 9, y, own ? '#fff2a8' : '#364488');
    if (own && r.on !== undefined) T(ctx, r.on ? 'ON' : 'OFF', x + w, y, r.on ? '#86f0a8' : '#8a5a5a', 'r');
  }
  V.draw = function (ctx, g, time) {
    const p = g.P, R = rows(g), list = choices(g), cur = list[V.sel], A = g.abil;
    ctx.fillStyle = '#05071a'; ctx.fillRect(0, 0, 480, 270);
    ctx.fillStyle = '#10163c'; for (let y = 6; y < 270; y += 8) for (let x = 6; x < 480; x += 8) ctx.fillRect(x, y, 1, 1);
    T(ctx, 'STATUS', 240, 8, '#a6ccff', 'c', 2); ctx.fillStyle = '#566cac'; ctx.fillRect(20, 16, 160, 1); ctx.fillRect(300, 16, 160, 1);
    /* left: items %, supply, time, score */
    const n = Object.keys(g.prog.items).length, tot = G.world.itemTotal(), pct = Math.round(100 * n / Math.max(1, tot));
    panel(ctx, 14, 34, 136, 34, 'ITEMS'); T(ctx, String(pct).padStart(3, '0') + '%', 82, 40, '#ffffff', 'c', 2); T(ctx, n + ' / ' + tot, 82, 58, '#8ea2d2', 'c');
    panel(ctx, 14, 78, 136, 74, 'SUPPLY');
    T(ctx, 'ENERGY', 22, 88, '#86f0f2'); T(ctx, String(Math.ceil(p.en)).padStart(3, '0') + ' / ' + G.player.enMax(p), 142, 88, '#ffffff', 'r');
    for (let i = 0; i < p.tanks; i++) { const x = 22 + i * 9; ctx.fillStyle = i < Math.floor(p.en / 100) ? '#2c6ad8' : '#162050'; ctx.fillRect(x, 98, 7, 6); ctx.fillStyle = i < Math.floor(p.en / 100) ? '#f2ffff' : '#2a3050'; ctx.fillRect(x + 1, 99, 5, 1); }
    if (!p.tanks) T(ctx, 'NO ENERGY TANKS', 22, 98, '#364488');
    T(ctx, 'MISSILES', 22, 110, '#efba42'); T(ctx, A.missiles ? String(p.missiles).padStart(2, '0') + ' / ' + String(p.missileMax).padStart(2, '0') : '-- / --', 142, 110, A.missiles ? '#ffffff' : '#364488', 'r');
    T(ctx, 'SUPERS', 22, 122, '#6cf08a'); T(ctx, A.supers ? String(p.supers).padStart(2, '0') + ' / ' + String(p.superMax).padStart(2, '0') : '-- / --', 142, 122, A.supers ? '#ffffff' : '#364488', 'r');
    T(ctx, 'SUPER BOMBS', 22, 134, '#ffb070'); T(ctx, A.sbombs ? String(p.sbombs).padStart(2, '0') + ' / ' + String(p.sbombMax).padStart(2, '0') : '-- / --', 142, 134, A.sbombs ? '#ffffff' : '#364488', 'r');
    panel(ctx, 14, 162, 136, 30, 'SCORE'); T(ctx, String(G.score.total(g)).padStart(7, '0'), 82, 175, '#ffe07a', 'c', 2);
    panel(ctx, 14, 200, 136, 28, 'TIME'); T(ctx, fmtTime(g.playTime || 0), 82, 212, '#ffffff', 'c', 2);
    /* centre: the hero */
    const suit = p.suit || 'cobalt', pt = G.sprites.portrait[suit], px = 240 - Math.round(pt.width / 2), py = 28;
    ctx.fillStyle = 'rgba(40,70,140,0.25)'; for (let r = 92; r > 22; r -= 14) { ctx.beginPath(); ctx.ellipse(240, 116, r * 0.78, r * 1.3, 0, 0, 6.2832); ctx.fill(); }
    ctx.drawImage(pt, px, py);
    ctx.fillStyle = '#566cac'; ctx.fillRect(196, 198, 88, 1); T(ctx, ({ cobalt: 'STANDARD SUIT', crimson: 'HEAT SUIT', teal: 'AQUA SUIT' })[suit] || 'SUIT', 240, 204, '#a6ccff', 'c');
    /* right: beams, suit + boots, tools */
    const bw = 126, bx = 340; let y = 34;
    panel(ctx, bx - 6, y, bw + 12, 56, 'BEAM'); R.beams.forEach((r, i) => row(ctx, r, bx, y + 9 + i * 11, bw, cur && cur.k === 'beam' && r.k === cur.v, time)); y += 64;
    panel(ctx, bx - 6, y, bw + 12, 56, 'SUIT / BOOTS'); R.suit.forEach((r, i) => row(ctx, r, bx, y + 9 + i * 11, bw, false, time)); y += 64;
    panel(ctx, bx - 6, y, bw + 12, 67, 'MISC.'); R.misc.forEach((r, i) => row(ctx, r, bx, y + 9 + i * 11, bw, false, time));
    /* centre-bottom: fire mode choice */
    const rapid = !G.weapons.usesCharge(g); panel(ctx, 168, 228, 144, 30, 'FIRE MODE');
    const frow = (v, label, x, own) => { const on = (v === 'rapid') === rapid, sel = cur && cur.k === 'fire' && cur.v === v; if (sel) { ctx.fillStyle = 'rgba(134,240,242,0.18)'; ctx.fillRect(x - 3, 237, 65, 14); } ctx.fillStyle = own ? (on ? '#efba42' : '#242c5c') : '#161c44'; ctx.fillRect(x, 241, 5, 5); T(ctx, label, x + 8, 241, own ? (on ? '#fff2a8' : '#8ea2d2') : '#364488'); };
    frow('charge', A.charge ? 'CHARGE' : 'LOCKED', 176, !!A.charge); frow('rapid', 'RAPID', 246, true);
    T(ctx, 'UP / DOWN  SELECT     JUMP / FIRE  CHOOSE     I / ESC  CLOSE', 240, 262, '#566cac', 'c');
  };
})((window.SGS = window.SGS || {}));
