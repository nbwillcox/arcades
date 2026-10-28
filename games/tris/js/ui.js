/* DOM menus in the glass style: title, mode setup, scores, how to play, settings, pause, results with initials entry. */
(function (G) {
  'use strict';
  const S = G.settings, C = G.C, A = () => G.audio, U = G.U;
  const UI = { cur: null, stack: [], setup: { mode: 'marathon', cores: false, cascade: false, level: 1, opponent: 0 }, keyIdx: 0 };
  G.ui = UI;
  const $ = (id) => document.getElementById(id);
  try { const raw = localStorage.getItem('spacetris.setup.v1'); if (raw) Object.assign(UI.setup, JSON.parse(raw)); } catch (e) { /* ignore */ }
  const saveSetup = () => { try { localStorage.setItem('spacetris.setup.v1', JSON.stringify(UI.setup)); } catch (e) { /* ignore */ } };
  function h(tag, cls, kids, attrs) {
    const e = document.createElement(tag); if (cls) e.className = cls;
    for (const k of [].concat(kids === undefined || kids === null ? [] : kids)) if (k !== null && k !== undefined) e.append(k);
    if (attrs) for (const a in attrs) e.setAttribute(a, attrs[a]);
    return e;
  }
  function btn(label, onClick, o) {
    o = o || {}; const b = h('button', (o.primary ? 'primary ' : '') + (o.cls || ''), label);
    b.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select(); } onClick(b); }); return b;
  }
  const screen = (id, kids) => { const s = h('section', 'screen hidden', kids, { id }); $('ui').append(s); return s; };
  const menu = (kids, attrs) => h('div', 'menu', kids, attrs);
  const heading = (t, id) => h('h2', '', t, id ? { id } : null);
  const nav = (to) => { UI.stack.push(UI.cur); UI.show(to, true); };
  const goBack = () => { const prev = UI.stack.pop(); UI.show(prev || 'title', true); if (A()) A().sfx.back(); };
  const MODES = { marathon: ['MARATHON', 'Classic endless play. Clear lines, level up, chase the high score.'], sprint: ['SPRINT 40', 'Clear 40 lines as fast as you can.'], ultra: ['ULTRA 2:00', 'Two minutes on the clock. Score as much as you can.'], versus: ['VERSUS CPU', 'Send garbage to a CPU opponent. Last board standing wins.'] };
  UI.open = function (mode) { UI.setup.mode = mode; fillSetup(); nav('setup'); };
  function fillSetup() {
    const m = UI.setup.mode, s = UI.setup, v = m === 'versus';
    $('setupTitle').textContent = MODES[m][0]; $('setupDesc').textContent = MODES[m][1];
    $('rowCores').classList.toggle('hidden', v); $('rowCascade').classList.toggle('hidden', v); $('rowLevel').classList.toggle('hidden', m === 'sprint'); $('rowOpp').classList.toggle('hidden', !v);
    $('optCores').checked = s.cores; $('optCascade').checked = s.cascade; $('optLevel').value = s.level; $('optLevelV').textContent = s.level;
    document.querySelectorAll('#oppChips .chip').forEach((c, i) => c.classList.toggle('on', i === s.opponent));
  }
  UI.begin = function () { saveSetup(); const s = UI.setup; UI.lastOpts = { mode: s.mode, cores: s.cores, cascade: s.cascade, level: s.level, opponent: s.opponent }; G.main.start(UI.lastOpts); };
  function build() {
    const logo = h('h1', 'logo', ['SPACETRIS', h('small', '', 'GLASS · GRAVITY · GALAXY')]);
    screen('title', [logo, menu([btn('MARATHON', () => UI.open('marathon'), { primary: true }), btn('SPRINT 40', () => UI.open('sprint')), btn('ULTRA 2:00', () => UI.open('ultra')), btn('VERSUS CPU', () => UI.open('versus')), btn('HIGH SCORES', () => nav('scores')), btn('HOW TO PLAY', () => nav('help')), btn('SETTINGS', () => nav('settings'))]),
      h('p', 'hint', [h('b', '', '← →'), ' move  ', h('b', '', '↓'), ' soft drop  ', h('b', '', '↑ / Space'), ' hard drop  ', h('b', '', 'A / D'), ' rotate  ', h('b', '', 'S / Shift'), ' hold  ', h('b', '', 'P'), ' pause']),
      h('div', 'credit', ['Free to play and share · ', h('a', '', 'github.com/nbwillcox/SpaceTris', { href: C.REPO, target: '_blank', rel: 'noopener' }), ' · ', h('a', '', 'CC BY-NC 4.0', { href: 'https://creativecommons.org/licenses/by-nc/4.0/', target: '_blank', rel: 'noopener' })])]);
    const ck = (id, label, sub) => h('label', '', [h('span', '', [label, h('br'), h('small', '', sub)]), h('input', '', null, { id, type: 'checkbox' })]);
    const chips = h('div', 'chips', C.OPPONENTS.map((o, i) => btn(o.name, () => { UI.setup.opponent = i; fillSetup(); }, { cls: 'chip small' })), { id: 'oppChips' });
    screen('setup', [heading('', 'setupTitle'), h('p', 'hint', '', { id: 'setupDesc' }), h('div', 'panel', [
      h('div', '', ck('optCores', 'Power cores', 'Glowing core cells fire when their line clears: BOMB, LASER, FREEZE, NOVA.'), { id: 'rowCores' }), h('div', '', ck('optCascade', 'Cascade gravity', 'Loose glass shards fall after every clear and can chain.'), { id: 'rowCascade' }),
      h('label', '', [h('span', '', ['Start level ', h('b', '', '1', { id: 'optLevelV' })]), h('input', '', null, { id: 'optLevel', type: 'range', min: 1, max: 12, step: 1 })], { id: 'rowLevel' }), h('div', '', [h('p', 'hint', 'CHOOSE YOUR OPPONENT'), chips], { id: 'rowOpp' })]),
      menu([btn('START', () => UI.begin(), { primary: true }), btn('BACK', goBack)])]);
    $('optCores').addEventListener('change', (e) => { UI.setup.cores = e.target.checked; }); $('optCascade').addEventListener('change', (e) => { UI.setup.cascade = e.target.checked; });
    $('optLevel').addEventListener('input', (e) => { UI.setup.level = parseInt(e.target.value, 10); $('optLevelV').textContent = UI.setup.level; });
  }
  const KEYS = ['marathon', 'marathon+c', 'marathon+s', 'marathon+c+s', 'sprint', 'sprint+c', 'sprint+s', 'sprint+c+s', 'ultra', 'ultra+c', 'ultra+s', 'ultra+c+s'];
  const keyLabel = (k) => k.split('+')[0].toUpperCase() + (k.indexOf('+c') > 0 ? ' · CORES' : '') + (k.indexOf('+s') > 0 ? ' · CASCADE' : '') + (k.indexOf('+') < 0 ? ' · CLASSIC' : '');
  const cycleKey = (d) => { UI.keyIdx = (UI.keyIdx + d + KEYS.length) % KEYS.length; fillScores(); };
  function fillScores() {
    const k = KEYS[UI.keyIdx], body = $('scoreBody'); body.textContent = ''; $('keyName').textContent = keyLabel(k);
    const t = h('table', 'tbl'), time = G.scores.isTime(k); t.append(h('tr', '', ['#', 'NAME', time ? 'TIME' : 'SCORE'].map((c) => h('th', c === 'NAME' || c === '#' ? '' : 'r', c))));
    G.scores.list(k).forEach((r, i) => t.append(h('tr', i === UI.lastIdx && k === UI.lastKey ? 'me' : '', [h('td', '', String(i + 1)), h('td', '', r[0]), h('td', 'r', time ? G.game.fmtTime(r[1]) : U.fmt(r[1]))])));
    body.append(t);
    const w = G.progress.vsWins; body.append(h('p', 'hint', 'VERSUS WINS · ' + C.OPPONENTS.map((o, i) => o.name.split(' ')[1] + ' ' + w[i]).join(' · ')));
  }
  function build2() {
    screen('scores', [heading('HIGH SCORES'), h('div', 'row', [btn('◀', () => cycleKey(-1), { cls: 'small' }), h('p', 'hint', '', { id: 'keyName' }), btn('▶', () => cycleKey(1), { cls: 'small' })]), h('div', 'panel', '', { id: 'scoreBody' }), menu([btn('BACK', goBack, { primary: true })])]);
    const li = (a, b) => h('p', 'hint', [h('b', '', a + '  '), b]);
    screen('help', [heading('HOW TO PLAY'), h('div', 'panel', [li('MOVE', '← → arrows (hold to slide)'), li('DROP', '↓ soft drop · ↑ or Space hard drop'), li('ROTATE', 'A turns the piece left · D turns it right (Z / X also work)'), li('HOLD', 'S, Shift or C'),
      li('TOUCH', 'on-screen buttons appear on touch devices'), li('POWER CORES', 'a glowing orb inside a piece fires when its line clears: BOMB 3x3, LASER column, FREEZE time, NOVA rows'), li('CASCADE', 'after a clear every column packs down; new lines chain for bonus'), li('SCORING', 'T-spins, tetrises, back-to-back, combos and perfect clears pay extra; in Versus they send garbage')]), menu([btn('BACK', goBack, { primary: true })])]);
    const sl = (id, label, min, max, step) => h('label', '', [label, h('input', '', null, { id, type: 'range', min, max, step })]);
    const ck = (id, label) => h('label', '', [label, h('input', '', null, { id, type: 'checkbox' })]);
    screen('settings', [heading('SETTINGS'), h('div', 'panel', [sl('setMaster', 'Master volume', 0, 1, 0.05), sl('setMusic', 'Music volume', 0, 1, 0.05), sl('setSfx', 'Effects volume', 0, 1, 0.05), sl('setDas', 'Key delay (DAS)', 0.06, 0.3, 0.01), sl('setArr', 'Key repeat (ARR)', 0, 0.1, 0.005), ck('setGhost', 'Ghost piece'), ck('setShake', 'Screen shake'), ck('setReduced', 'Reduced motion'), ck('setPad', 'Use gamepad'),
      h('label', '', ['Touch controls', h('button', 'small', S.touch.toUpperCase(), { id: 'setTouch' })]), sl('setQuality', 'Render quality', 0.5, 1, 0.1)]), menu([btn('BACK', goBack, { primary: true })])]);
    const bind = (id, key, num) => { const e = $(id); if (num) { e.value = S[key]; e.addEventListener('input', () => { S[key] = parseFloat(e.value); S.save(); if (A()) A().applyVolumes(); if (key === 'quality' && G.main.rebuild) G.main.rebuild(); }); } else { e.checked = !!S[key]; e.addEventListener('change', () => { S[key] = e.checked; S.save(); if (A()) A().sfx.blip(); }); } };
    bind('setMaster', 'master', 1); bind('setMusic', 'music', 1); bind('setSfx', 'sfx', 1); bind('setDas', 'das', 1); bind('setArr', 'arr', 1); bind('setQuality', 'quality', 1); bind('setGhost', 'ghost'); bind('setShake', 'shake'); bind('setReduced', 'reduced'); bind('setPad', 'gamepad');
    $('setTouch').addEventListener('click', () => { S.touch = S.touch === 'auto' ? 'on' : S.touch === 'on' ? 'off' : 'auto'; $('setTouch').textContent = S.touch.toUpperCase(); S.save(); G.render.Lkey = null; if (A()) A().sfx.blip(); });
    screen('pause', [heading('PAUSED'), menu([btn('RESUME', () => G.main.resume(), { primary: true }), btn('RESTART', () => G.main.restart()), btn('SETTINGS', () => nav('settings')), btn('QUIT TO MENU', () => G.main.quit())])]);
    screen('results', [heading('', 'resTitle'), h('p', 'big', '', { id: 'resBig' }), h('div', 'panel stats', '', { id: 'resStats' }),
      h('div', 'entry hidden', [h('p', 'newhs', 'NEW HIGH SCORE! Enter your initials'), h('input', '', null, { id: 'goName', type: 'text', maxlength: 3, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your initials' }), menu([btn('SAVE', () => UI.saveScore(), { primary: true })])], { id: 'goEntry' }),
      menu([btn('PLAY AGAIN', () => G.main.restart(), { primary: true }), btn('MENU', () => G.main.quit())], { id: 'goButtons' })]);
    $('goName').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); });
    $('goName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); UI.saveScore(); } });
    $('ui').append(h('div', 'toast hidden', '', { id: 'toast' }));
  }
  UI.showResults = function (res) {
    const m = res.mode, st = res.stats, F = G.game.fmtTime; let title, big;
    if (m === 'versus') { title = res.win ? 'VICTORY' : 'DEFEATED'; big = res.win ? 'YOU WIN' : 'YOU LOSE'; if (res.win) { G.progress.vsWins[res.opp.idx]++; G.progress.save(); } }
    else if (m === 'sprint') { title = res.win ? 'SPRINT COMPLETE' : 'GAME OVER'; big = res.win ? F(res.time) : res.lines + ' / 40'; }
    else if (m === 'ultra') { title = 'TIME UP'; big = U.fmt(res.score); } else { title = 'GAME OVER'; big = U.fmt(res.score); }
    $('resTitle').textContent = title; $('resBig').textContent = big;
    const rows = [['Score', U.fmt(res.score)], ['Lines', res.lines], ['Level', res.level], ['Time', F(res.time)], ['Pieces', res.pieces], ['Pieces / sec', (res.pieces / Math.max(1, res.time)).toFixed(2)], ['Tetrises', st.tetris], ['T-spins', st.tspin], ['Best combo', 'x' + st.maxCombo], ['Perfect clears', st.pc]];
    if (res.key.indexOf('+s') > 0) rows.push(['Best cascade', 'x' + (st.cascade + 1)]); if (res.key.indexOf('+c') > 0) rows.push(['Cores fired', st.cores]); if (m === 'versus') rows.push(['Lines sent', st.sent]);
    const box = $('resStats'); box.textContent = ''; for (const r of rows) { box.append(h('span', '', r[0]), h('span', '', String(r[1]))); }
    const time = G.scores.isTime(res.key), v = time ? (res.win ? res.time : 0) : res.score, q = m !== 'versus' && G.scores.qualifies(res.key, v);
    UI.pending = q ? { key: res.key, v } : null; UI.lastKey = res.key;
    $('goEntry').classList.toggle('hidden', !q); $('goButtons').classList.toggle('hidden', q); $('goName').value = G.scores.lastName || '';
    UI.show('results');
  };
  UI.saveScore = function () {
    if (!UI.pending) return;
    const name = ($('goName').value || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AAA';
    UI.lastIdx = G.scores.add(UI.pending.key, name, UI.pending.v); UI.keyIdx = Math.max(0, KEYS.indexOf(UI.pending.key)); UI.pending = null; if (A()) A().sfx.select();
    UI.stack = ['title']; UI.show('scores', true);
  };
  UI.toast = function (msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.add('hidden'), 3000); };
  UI.show = function (name, keepStack) {
    document.querySelectorAll('#ui .screen').forEach((e) => e.classList.toggle('hidden', e.id !== name));
    UI.cur = name; document.body.classList.toggle('menu-open', !!name);
    if (!keepStack && name === 'title') { UI.stack = []; UI.lastIdx = -1; }
    if (name === 'scores') fillScores();
    setTimeout(() => { const sec = $(name); if (!sec || sec.classList.contains('hidden')) return; const el = name === 'results' && !$('goEntry').classList.contains('hidden') ? $('goName') : sec.querySelector('button.primary') || sec.querySelector('button'); if (el) { el.focus(); if (el.select) el.select(); } }, 0);
  };
  UI.hideAll = function () { document.querySelectorAll('#ui .screen').forEach((e) => e.classList.add('hidden')); UI.cur = null; document.body.classList.remove('menu-open'); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  UI.isOpen = () => UI.cur !== null;
  const padPrev = {}, BACKABLE = ['setup', 'scores', 'help', 'settings'];
  UI.padNav = function () {
    if (!UI.cur || !S.gamepad || !navigator.getGamepads) return;
    const g = [...navigator.getGamepads()].find((x) => x && x.connected); if (!g) return;
    const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    const st = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6, a: b(0), b: b(1) };
    const edge = (k) => st[k] && !padPrev[k], btns = [...document.querySelectorAll('#' + UI.cur + ' button')], mv = edge('down') || edge('right') ? 1 : edge('up') || edge('left') ? -1 : 0;
    if (mv && btns.length) { const i = btns.indexOf(document.activeElement); btns[(i + mv + btns.length) % btns.length].focus(); if (A()) A().sfx.blip(); }
    if (edge('a') && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.click();
    if (edge('b') && BACKABLE.indexOf(UI.cur) >= 0) goBack();
    Object.assign(padPrev, st);
  };
  UI.init = function () {
    build(); build2();
    window.addEventListener('keydown', (e) => {
      if (!UI.cur) return;
      if (e.key === 'Escape' && BACKABLE.indexOf(UI.cur) >= 0) { goBack(); return; }
      const dirs = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in dirs) || (e.target && (e.target.type === 'range' || e.target.type === 'text'))) return;
      const btns = [...document.querySelectorAll('#' + UI.cur + ' button')]; if (!btns.length) return;
      const i = btns.indexOf(document.activeElement); btns[(i + dirs[e.key] + btns.length) % btns.length].focus(); e.preventDefault(); if (A()) A().sfx.blip();
    });
    document.addEventListener('pointerdown', () => A() && A().resume(), { passive: true });
    document.addEventListener('keydown', () => A() && A().resume());
  };
})((window.SGS = window.SGS || {}));
