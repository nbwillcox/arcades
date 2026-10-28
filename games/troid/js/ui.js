/* Canvas menus (logic): title, save slots, options, pause, end screen. Up/Down move, Left/Right change values, Jump / Fire / Enter select, Esc / P go back. */
(function (G) {
  'use strict';
  const S = G.settings, U = { mode: 'title', sel: 0, from: 'title', confirm: null, slotMode: 'new' };
  G.ui = U;
  const bar = (v) => '[' + '#'.repeat(Math.round(v * 10)) + '-'.repeat(10 - Math.round(v * 10)) + ']';
  const PADACT = [['jump', 'JUMP', 0], ['fire', 'FIRE / CHARGE', 2], ['missile', 'MISSILE', 1], ['swap', 'SWAP MISSILE', 3], ['dash', 'DASH', 5], ['aim', 'AIM LOCK', 4]];
  const PADN = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L-STICK', 'R-STICK', 'UP', 'DOWN', 'LEFT', 'RIGHT'];
  const padName = (i) => PADN[i] || 'BTN ' + i;
  const padIdx = (a, d) => ((S.padmap || {})[a] === undefined ? d : S.padmap[a]);
  const anySave = () => [0, 1, 2].some((n) => G.save.read(n));
  U.items = {
    title: () => [{ k: 'new', t: 'NEW GAME' }, { k: 'cont', t: 'CONTINUE', off: !anySave() }, { k: 'opt', t: 'OPTIONS' }].concat(window.parent !== window && window.parent.ARCADE ? [{ k: 'arcade', t: 'BACK TO ARCADE' }] : []),
    pause: () => [{ k: 'resume', t: 'RESUME' }, { k: 'map', t: 'MAP' }, { k: 'inv', t: 'STATUS' }, { k: 'help', t: 'CONTROLS' }, { k: 'opt', t: 'OPTIONS' }, { k: 'quit', t: 'QUIT TO TITLE' }],
    options: () => [{ k: 'sfx', t: 'SOUND VOLUME  ' + bar(S.sfx) }, { k: 'music', t: 'MUSIC VOLUME  ' + bar(S.music) }, { k: 'mouse', t: 'MOUSE AIM  ' + (S.mouseAim ? 'ON' : 'OFF') }, { k: 'hard', t: 'DIFFICULTY  ' + (S.hard ? 'HARD' : 'NORMAL') }, { k: 'shake', t: 'SCREEN SHAKE  ' + (S.shake ? 'ON' : 'OFF') }, { k: 'reduced', t: 'REDUCED EFFECTS  ' + (S.reduced ? 'ON' : 'OFF') }, { k: 'pad', t: 'GAMEPAD  ' + (S.gamepad ? 'ON' : 'OFF') }, { k: 'padmap', t: 'CONTROLLER BUTTONS' }, { k: 'back', t: 'BACK' }],
    padmap: () => PADACT.map((a) => ({ k: 'pm', a: a[0], t: a[1] + '  ' + (U.cap === a[0] ? 'PRESS A BUTTON...' : '[' + padName(padIdx(a[0], a[2])) + ']') })).concat([{ k: 'pmreset', t: 'RESET BUTTONS' }, { k: 'back', t: 'BACK' }]),
    slots: () => [0, 1, 2].map((n) => ({ k: 'slot', n, rec: G.save.read(n) })).concat([{ k: 'back', t: 'BACK' }]),
  };
  U.open = function (mode, from) {
    U.mode = mode; U.sel = 0; U.confirm = null; if (from) U.from = from;
    if (mode === 'slots' && U.slotMode === 'cont') U.sel = Math.max(0, [0, 1, 2].findIndex((n) => G.save.read(n)));
  };
  U.back = function () { if (U.mode === 'padmap') { U.cap = null; U.open('options', U.from); } else if (U.mode === 'options') U.open(U.from === 'pause' ? 'pause' : 'title'); else if (U.mode === 'slots') U.open('title'); };
  U.update = function () {
    const D = G.input.down, M = G.main, list = U.items[U.mode] ? U.items[U.mode]() : [], raw = D.jump || D.fire || D.start, tap = G.input.takeTap && G.input.takeTap();
    let go = raw;
    if (U.mode === 'end') { if (go || D.pause) M.toTitle(); return; }
    if (U.mode === 'padmap' && U.cap) {                                  /* waiting for a controller button: the pad is muted in input.poll while this is set */
      if (D.pause) { U.cap = null; return; }
      const b = G.input.newBtn;
      if (b >= 0) {
        S.padmap = S.padmap || {};
        const old = padIdx(U.cap, PADACT.find((x) => x[0] === U.cap)[2]);
        for (const x of PADACT) if (x[0] !== U.cap && padIdx(x[0], x[2]) === b) S.padmap[x[0]] = old;        /* swap with whoever had it */
        S.padmap[U.cap] = b; S.save(); U.cap = null;
      }
      return;
    }
    if (U.mode === 'help') { if (go || D.pause) U.open('pause'); return; }
    if (tap && D.fire && !D.jump && !D.start) {                          /* a click or tap: it picks the row (or NO / YES) under it and does nothing anywhere else */
      go = false;
      const hit = (r) => tap.x >= r.x && tap.x <= r.x + r.w && tap.y >= r.y && tap.y <= r.y + r.h;
      if (U.confirm) { const r = (U.crects || []).find(hit); if (r) { U.confirm.yes = r.yes; go = true; } }
      else { const r = (U.rects || []).find(hit); if (r) { U.sel = r.i; go = true; if (U.mode === 'options' && (list[r.i].k === 'sfx' || list[r.i].k === 'music')) { D.l = tap.x < 240; D.r = !D.l; go = false; } } }
    }
    if (U.confirm) {
      if (D.l || D.r || D.u || D.d) U.confirm.yes = !U.confirm.yes;
      if (go) { if (U.confirm.yes) M.startSlot(U.confirm.n, true); U.confirm = null; } else if (D.pause) U.confirm = null;
      return;
    }
    if (D.d) U.sel = (U.sel + 1) % list.length;
    if (D.u) U.sel = (U.sel + list.length - 1) % list.length;
    const it = list[U.sel]; if (!it) return;
    if (U.mode === 'options' && (D.l || D.r)) {
      const d = D.r ? 0.1 : -0.1, cl = (v) => Math.max(0, Math.min(1, Math.round((v + d) * 10) / 10));
      if (it.k === 'sfx') { S.sfx = cl(S.sfx); G.audio.sfx('pickup'); } else if (it.k === 'music') S.music = cl(S.music);
      else if (it.k === 'mouse') S.mouseAim = !S.mouseAim; else if (it.k === 'hard') S.hard = !S.hard; else if (it.k === 'shake') S.shake = !S.shake; else if (it.k === 'reduced') S.reduced = !S.reduced; else if (it.k === 'pad') S.gamepad = !S.gamepad;
      S.save();
    }
    if (D.pause && U.mode !== 'title') { if (U.mode === 'pause') M.resume(); else U.back(); return; }
    if (!go || it.off) return;
    switch (it.k) {
      case 'new': U.slotMode = 'new'; U.open('slots'); break;
      case 'cont': U.slotMode = 'cont'; U.open('slots'); break;
      case 'opt': U.open('options', U.mode); break;
      case 'slot': if (U.slotMode === 'cont') { if (it.rec) M.startSlot(it.n, false); } else if (it.rec) U.confirm = { n: it.n, yes: false }; else M.startSlot(it.n, true); break;
      case 'resume': M.resume(); break;
      case 'map': M.openMap(); break;
      case 'inv': M.openInv(); break;
      case 'help': U.open('help'); break;
      case 'quit': M.toTitle(); break;
      case 'arcade': window.parent.ARCADE.exitGame(); break;
      case 'mouse': S.mouseAim = !S.mouseAim; S.save(); break;
      case 'hard': S.hard = !S.hard; S.save(); break;
      case 'shake': S.shake = !S.shake; S.save(); break;
      case 'reduced': S.reduced = !S.reduced; S.save(); break;
      case 'pad': S.gamepad = !S.gamepad; S.save(); break;
      case 'padmap': U.open('padmap', U.from); break;
      case 'pm': U.cap = it.a; break;
      case 'pmreset': S.padmap = {}; S.save(); break;
      case 'back': U.back(); break;
      default: break;
    }
  };
})((window.SGS = window.SGS || {}));
