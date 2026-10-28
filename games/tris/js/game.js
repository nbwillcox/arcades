/* The controller: modes (marathon / sprint 40 / ultra 2:00 / versus CPU), key repeat, the countdown, effects for every game event and the results. */
(function (G) {
  'use strict';
  const C = G.C, K = G.core, GL = G.glass, S = G.settings, U = G.U;
  const Game = { state: 'title', mode: 'marathon', time: 0, fx: [null, null], pops: [], banner: null, shake: 0, flash: 0, freeze: 0, level: 1, countdown: 0, rules: { cores: false, cascade: false } };
  G.game = Game;
  const snd = (n, a) => { const au = G.audio; if (au && au.sfx && au.sfx[n]) au.sfx[n](a); };
  const newFx = () => ({ shards: [], flashes: [], rings: [], beams: [], locks: [], trails: [] });
  const col = (t) => (GL.COLORS[t] || [255, 255, 255]).join(',');
  Game.key = () => Game.mode + (Game.rules.cores ? '+c' : '') + (Game.rules.cascade ? '+s' : '');
  Game.start = function (o) {
    const mode = o.mode || 'marathon', versus = mode === 'versus';
    Game.mode = mode; Game.rules = { cores: !!o.cores && !versus, cascade: !!o.cascade && !versus }; Game.over = false; Game.result = null;
    const lvl = mode === 'sprint' ? 3 : o.level || 1;
    Game.tet = new K.Tet({ cores: Game.rules.cores, cascade: Game.rules.cascade, level: lvl, fixedLevel: mode === 'sprint' || versus });
    Game.opp = null; Game.ai = null; Game.oppInfo = null; Game.baseLevel = lvl;
    if (versus) { const info = C.OPPONENTS[o.opponent || 0]; Game.oppInfo = Object.assign({ idx: o.opponent || 0 }, info); Game.opp = new K.Tet({ level: lvl, fixedLevel: true }); Game.ai = G.ai.make(Game.opp, info); }
    Game.fx = [newFx(), versus ? newFx() : null]; Game.pops = []; Game.banner = null; Game.shake = 0; Game.flash = 0; Game.freeze = 0; Game.level = lvl;
    Game.state = 'ready'; Game.countdown = 3.4; Game.das = { dir: 0, t: 0, rep: 0 }; Game.softT = 0; Game.lastBeep = 4; Game.lastSector = Game.sector();
    if (G.audio) G.audio.music('off');
  };
  Game.sector = () => Math.min(5, Math.floor((Game.level - 1) / 3));
  Game.rect = (idx) => { const L = G.render.L; if (!L) return { x: 0, y: 0, cs: 40 }; return idx === 0 ? L.board : L.opp || L.board; };
  const pop = (text, size, color, sub) => { Game.pops.unshift({ text, sub, size, col: color, age: 0, life: 1.3 }); if (Game.pops.length > 3) Game.pops.pop(); };
  Game.pop = pop;
  /* ---------- input: DAS / ARR left-right, soft drop, one-shot actions ---------- */
  Game.handleInput = function (dt, I) {
    const t = Game.tet, d = Game.das, dir = I.held.left && !I.held.right ? -1 : I.held.right && !I.held.left ? 1 : I.held.left && I.held.right ? (d.dir || 1) : 0;
    if (dir !== d.dir) { d.dir = dir; d.t = 0; d.rep = 0; if (dir) t.move(dir); }
    else if (dir) {
      d.t += dt;
      if (d.t >= S.das) { d.rep += dt; const arr = Math.max(0, S.arr); if (arr === 0) { let n = 0; while (n++ < 12 && t.move(dir)); d.rep = 0; } else while (d.rep >= arr) { d.rep -= arr; t.move(dir); } }
    }
    if (I.held.down) { Game.softT += dt; const iv = 0.026; while (Game.softT >= iv) { Game.softT -= iv; t.softStep(); } } else Game.softT = 0;
    if (I.take('rotL')) t.rotate(-1); if (I.take('rotR')) t.rotate(1); if (I.take('hold')) t.holdPiece(); if (I.take('hard')) t.hardDrop();
  };
  /* ---------- game events -> sound and glass effects ---------- */
  Game.drain = function (tet, idx) { for (const e of tet.ev.slice()) Game.onEvent(tet, idx, e); tet.ev.length = 0; };
  Game.onEvent = function (tet, idx, e) {
    const me = idx === 0, b = Game.rect(idx), cs = b.cs, fx = Game.fx[idx], cell = (x, y) => [b.x + (x + 0.5) * cs, b.y + (y - 2 + 0.5) * cs];
    switch (e.type) {
      case 'move': if (me) snd('move'); break;
      case 'rotate': if (me) snd('rotate'); break;
      case 'hold': if (me) snd('hold'); break;
      case 'hard': if (me) { snd('hard'); Game.shake = Math.max(Game.shake, 2 + Math.min(6, e.rows * 0.3)); } break;
      case 'lock': {
        if (me) snd('lock'); if (!fx) break;
        fx.locks.push({ cells: e.cells.filter((c) => c.y >= 2), age: 0, life: 0.16 });
        if (e.cells.length) { const ys = e.cells.map((c) => c.y), xs = e.cells.map((c) => c.x); fx.trails.push({ xs: Array.from(new Set(xs)), y0: Math.max(2, Math.min.apply(null, ys) - 6), y1: Math.min.apply(null, ys), col: col(e.t), age: 0, life: 0.2 }); }
        break;
      }
      case 'clear': Game.onClear(tet, idx, e, b, cell); break;
      case 'tspin': if (me) { snd('tspin'); pop('T-SPIN', 0.8, '#d8a0ff'); } break;
      case 'chain': if (me) { snd('chain', e.n); pop('CASCADE x' + (e.n + 1), 0.8, '#7ad0ff'); } break;
      case 'pc': if (me) { snd('pc'); pop('PERFECT CLEAR', 1, '#ffe27a', '+' + U.fmt(e.pts)); Game.flash = 0.35; Game.shake = 14; } break;
      case 'level': if (me && Game.mode !== 'versus') { Game.level = e.level; snd('level'); const ns = Game.sector() !== Game.lastSector; Game.banner = { text: 'LEVEL ' + e.level, sub: ns ? 'SECTOR: ' + G.render.SECTORS[Game.sector()] : null, age: 0, life: 1.8 }; Game.lastSector = Game.sector(); if (G.audio) G.audio.music('play', Game.sector(), Game.level); } break;
      case 'attack': if (Game.opp) { const other = me ? Game.opp : Game.tet, rem = tet.cancel(e.lines); if (rem > 0) { other.addGarbage(rem); if (me) pop('SENT ' + rem, 0.6, '#ff9a9a'); } } break;
      case 'incoming': if (me && e.n > 0) snd('incoming'); break;
      case 'garbage': snd('garbage'); if (me) Game.shake = Math.max(Game.shake, 5 + e.n); break;
      case 'over': if (me) Game.finish(false, e.why); else Game.finish(true); break;
    }
  };
  Game.onClear = function (tet, idx, e, b, cell) {
    const me = idx === 0, cs = b.cs, fx = Game.fx[idx], n = e.lines, big = n === 4 || e.ts;
    if (fx) {
      fx.flashes.push({ cells: e.cells.filter((c) => c.y >= 2), age: 0, life: 0.38 });
      const sc = cs / 54, ctr = [b.x + cs * 5, b.y + cs * 10];
      for (const c of e.cells) if (c.y >= 2) { const p = cell(c.x, c.y); GL.shards(fx.shards, p[0], p[1], cs, c.t || 8, ctr[0], ctr[1], sc * (S.reduced ? 0.5 : 1)); }
      if (S.reduced) fx.shards.length = Math.min(fx.shards.length, 60);
      for (const c of e.cores) {
        if (c.type === 1) { fx.rings.push({ x: c.x, y: c.y, age: 0, life: 0.55, col: '255,150,60', size: 3.2 }); snd('bomb'); }
        else if (c.type === 2) { fx.beams.push({ type: 'col', x: c.x, age: 0, life: 0.5, col: '90,240,255' }); snd('laser'); }
        else if (c.type === 3) { snd('freeze'); fx.rings.push({ x: c.x, y: c.y, age: 0, life: 0.7, col: '200,235,255', size: 2.4 }); }
        else { for (const yy of [c.y - 1, c.y, c.y + 1]) fx.beams.push({ type: 'row', y: yy, age: 0, life: 0.55, col: '255,210,80' }); fx.rings.push({ x: c.x, y: c.y, age: 0, life: 0.7, col: '255,220,100', size: 5 }); snd('nova'); }
      }
    }
    if (!me) return;
    if (n === 4) { snd('tetris'); Game.shake = 12; Game.flash = 0.25; } else if (e.ts) snd('tspin'); else snd('clear', n);
    if (e.combo > 0) snd('combo', e.combo); if (e.b2b) snd('b2b');
    Game.shake = Math.max(Game.shake, n * 2.5);
    const name = e.ts ? 'T-SPIN ' + (e.ts === 'mini' ? 'MINI ' : '') + ['', 'SINGLE', 'DOUBLE', 'TRIPLE'][n] : ['', 'SINGLE', 'DOUBLE', 'TRIPLE', 'TETRIS'][n], subs = [];
    if (e.b2b) subs.push('BACK-TO-BACK'); if (e.combo > 0) subs.push('COMBO x' + e.combo); if (e.extra > 0) subs.push('+' + e.extra + ' CORE BLAST'); if (e.chain > 0) subs.push('CASCADE x' + (e.chain + 1));
    pop(name, big ? 0.9 : 0.7, big ? '#ffe27a' : '#ffffff', subs.join('  ·  ') || null);
  };
  /* ---------- per-frame update ---------- */
  Game.updateFx = function (dt) {
    for (const fx of Game.fx) {
      if (!fx) continue;
      for (const k of ['flashes', 'rings', 'beams', 'locks', 'trails']) { for (const f of fx[k]) f.age += dt; fx[k] = fx[k].filter((f) => f.age < f.life); }
      const cs = Game.rect(0).cs, grav = 1500 * (cs / 54);
      for (const s of fx.shards) { s.age += dt; s.vy += grav * dt; s.vx *= 1 - 0.6 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt; }
      fx.shards = fx.shards.filter((s) => s.age < s.life);
    }
    for (const p of Game.pops) p.age += dt; Game.pops = Game.pops.filter((p) => p.age < p.life);
    if (Game.banner) { Game.banner.age += dt; if (Game.banner.age > Game.banner.life) Game.banner = null; }
    if (Game.shake > 0) Game.shake = Math.max(0, Game.shake - 30 * dt); if (Game.flash > 0) Game.flash = Math.max(0, Game.flash - 1.6 * dt);
  };
  Game.update = function (dt, I) {
    Game.time += dt; Game.updateFx(dt);
    if (Game.state === 'ready') {
      Game.countdown -= dt; const n = Math.ceil(Game.countdown); if (n < Game.lastBeep && n >= 1) { Game.lastBeep = n; snd('beep', false); }
      if (Game.countdown <= 0) { Game.state = 'play'; snd('beep', true); if (G.audio) G.audio.music('play', Game.sector(), Game.level); }
      return;
    }
    if (Game.state !== 'play') return;
    const t = Game.tet; Game.handleInput(dt, I); t.update(dt); Game.drain(t, 0);
    Game.freeze = t.freezeT || 0;
    if (Game.opp && Game.state === 'play') {
      Game.ai.update(dt); Game.opp.update(dt); Game.drain(Game.opp, 1);
      const lv = Game.baseLevel + Math.floor(t.time / 40); if (lv !== Game.level) { Game.level = lv; t.level = lv; Game.opp.level = lv; }
    }
    if (Game.state !== 'play') return;
    if (Game.mode === 'sprint' && t.lines >= 40) Game.finish(true);
    else if (Game.mode === 'ultra' && t.time >= 120) Game.finish(true);
  };
  Game.fmtTime = (s) => { s = Math.max(0, s); const m = Math.floor(s / 60), r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); };
  Game.statRows = function () {
    const t = Game.tet, r = [], f = U.fmt;
    if (Game.mode === 'sprint') r.push({ l: 'LINES', v: t.lines + ' / 40', big: true }, { l: 'TIME', v: Game.fmtTime(t.time), big: true }, { l: 'SCORE', v: f(t.score) }, { l: 'PIECES/S', v: (t.pieces / Math.max(1, t.time)).toFixed(2) });
    else if (Game.mode === 'ultra') r.push({ l: 'TIME LEFT', v: Game.fmtTime(120 - t.time), big: true, c: 120 - t.time < 15 ? '#ff8a8a' : '#fff' }, { l: 'SCORE', v: f(t.score), big: true }, { l: 'LINES', v: t.lines }, { l: 'LEVEL', v: t.level });
    else if (Game.mode === 'versus') r.push({ l: 'LEVEL', v: t.level, big: true }, { l: 'LINES', v: t.lines }, { l: 'SENT', v: t.stats.sent }, { l: 'TIME', v: Game.fmtTime(t.time) });
    else r.push({ l: 'SCORE', v: f(t.score), big: true }, { l: 'LEVEL', v: t.level }, { l: 'LINES', v: t.lines }, { l: 'TIME', v: Game.fmtTime(t.time) });
    if (t.combo > 0) r.push({ l: 'COMBO', v: 'x' + t.combo, c: '#7dffb8' }); if (t.b2b) r.push({ l: 'BACK-TO-BACK', v: 'ON', c: '#ffe27a' });
    return r;
  };
  Game.finish = function (win, why) {
    if (Game.state === 'over') return; Game.state = 'over'; Game.over = true;
    const t = Game.tet, res = { mode: Game.mode, key: Game.key(), win, why, score: t.score, lines: t.lines, level: t.level, time: t.time, pieces: t.pieces, stats: t.stats, opp: Game.oppInfo };
    Game.result = res; if (G.audio) { G.audio.music('off'); G.audio.sfx[win ? 'win' : 'over'](); }
    if (G.main && G.main.onResult) G.main.onResult(res);
  };
})((window.SGS = window.SGS || {}));
