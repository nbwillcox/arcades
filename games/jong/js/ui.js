/* DOM menus in the glass style (title, board gallery, scores, help, settings, pause, results) plus the in-game HUD and helper buttons. */
(function (G) {
  'use strict';
  const S = G.settings, C = G.C, A = () => G.audio, U = G.U, g = G.game;
  const UI = { cur: null, stack: [], mode: 'zen', scoreIdx: 0 };
  G.ui = UI;
  const $ = (id) => document.getElementById(id);
  try { const raw = localStorage.getItem('spacejong.setup.v1'); if (raw) Object.assign(UI, JSON.parse(raw)); } catch (e) { /* ignore */ }
  const saveSetup = () => { try { localStorage.setItem('spacejong.setup.v1', JSON.stringify({ mode: UI.mode })); } catch (e) { /* ignore */ } };
  function h(tag, cls, kids, attrs) {
    const e = document.createElement(tag); if (cls) e.className = cls;
    for (const k of [].concat(kids === undefined || kids === null ? [] : kids)) if (k !== null && k !== undefined) e.append(k);
    if (attrs) for (const a in attrs) e.setAttribute(a, attrs[a]);
    return e;
  }
  function btn(label, onClick, o) {
    o = o || {}; const b = h('button', (o.primary ? 'primary ' : '') + (o.cls || ''), label, { type: 'button' });
    b.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select(); } onClick(b); }); return b;
  }
  const screen = (id, kids) => { const s = h('section', 'screen hidden', kids, { id }); $('ui').append(s); return s; };
  const menu = (kids, attrs) => h('div', 'menu', kids, attrs);
  const heading = (t, id) => h('h2', '', t, id ? { id } : null);
  const nav = (to) => { UI.stack.push(UI.cur); UI.show(to, true); };
  const goBack = () => { const prev = UI.stack.pop(); UI.show(prev || 'title', true); if (A()) A().sfx.back(); };
  UI.toast = function (msg) { const t = $('toast'); t.textContent = msg; t.classList.remove('hidden'); clearTimeout(UI._tt); UI._tt = setTimeout(() => t.classList.add('hidden'), 3200); };
  /* ---------- layout thumbnails ---------- */
  function thumb(cv, lay) {
    const x = cv.getContext('2d'), W = cv.width, H = cv.height, hue = [205, 285, 22, 150, 330, 48][lay.hue % 6]; x.clearRect(0, 0, W, H);
    const sc = Math.min((W - 10) / (lay.w + lay.zmax * 0.6 + 0.8), (H - 10) / (lay.h * 1.25 + lay.zmax * 0.6 + 0.8)), tw = 2 * sc, th = 2 * sc * 1.25, t = sc * 0.3;
    const ox = (W - lay.w * sc - lay.zmax * t) / 2 + lay.zmax * t, oy = (H - lay.h * sc * 1.25 - lay.zmax * t) / 2 + lay.zmax * t;
    const ord = lay.tiles.map((q, i) => i).sort((a, b) => lay.tiles[a][2] - lay.tiles[b][2] || lay.tiles[a][0] - lay.tiles[b][0] || lay.tiles[a][1] - lay.tiles[b][1]);
    for (const i of ord) {
      const q = lay.tiles[i], px = ox + q[0] * sc - q[2] * t, py = oy + q[1] * sc * 1.25 - q[2] * t;
      x.fillStyle = 'hsl(' + hue + ',60%,' + (14 + q[2] * 3) + '%)'; x.fillRect(px + t * 0.6, py + t * 0.6, tw, th);
      const gr = x.createLinearGradient(px, py, px + tw, py + th); gr.addColorStop(0, 'hsl(' + hue + ',85%,' + (70 + q[2] * 4) + '%)'); gr.addColorStop(1, 'hsl(' + (hue + 40) + ',80%,' + (38 + q[2] * 5) + '%)');
      x.fillStyle = gr; x.beginPath(); x.roundRect(px, py, tw, th, tw * 0.14); x.fill(); x.strokeStyle = 'rgba(255,255,255,0.7)'; x.lineWidth = 1; x.stroke();
    }
  }
  function fillGallery() {
    const grid = $('cards'); grid.textContent = ''; const zen = UI.mode === 'zen';
    $('galTitle').textContent = zen ? 'ZEN  -  CHOOSE A BOARD' : 'TIMED  -  CHOOSE A BOARD';
    $('galDesc').textContent = zen ? 'No clock, no penalties, unlimited help. Boards reshuffle themselves if you get stuck.' : 'Beat the clock: every match adds time, but hints, undo and shuffle cost seconds. Clear it for a score.';
    document.querySelectorAll('#modeChips .chip').forEach((c) => c.classList.toggle('on', c.dataset.m === UI.mode));
    for (const lay of G.layouts) {
      const cv = h('canvas', '', null, { width: 200, height: 124 }), cleared = G.progress[UI.mode][lay.id];
      const info = zen ? (cleared !== undefined ? 'CLEARED  ' + U.time(cleared) : lay.n + ' TILES') : 'BEST  ' + U.fmt(G.scores.best(lay.id));
      const b = h('button', 'card' + (cleared !== undefined ? ' done' : ''), [cv, h('b', '', lay.name), h('small', '', (cleared !== undefined ? '✓ ' : '') + info + (cleared !== undefined || !zen ? '  ·  ' + lay.n : ''))], { type: 'button' });
      b.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select(); } UI.play(lay.id); }); grid.append(b); thumb(cv, lay);
    }
    const rnd = h('button', 'card rand', [h('div', 'dice', '?'), h('b', '', 'RANDOM BOARD'), h('small', '', 'SURPRISE ME')], { type: 'button' });
    rnd.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select(); } UI.play(U.pick(G.layouts).id); }); grid.append(rnd);
  }
  UI.play = function (id) { saveSetup(); UI.lastLayout = id; G.main.start({ layout: id, mode: UI.mode }); };
  UI.openGallery = function (mode) { UI.mode = mode; saveSetup(); fillGallery(); nav('layouts'); };
  function fillScores() {
    const lay = G.layouts[UI.scoreIdx], body = $('scoreBody'); body.textContent = ''; $('keyName').textContent = lay.name.toUpperCase();
    const t = h('table', 'tbl'); t.append(h('tr', '', ['#', 'TIMED SCORE', ''].map((c, i) => h('th', i === 1 ? 'r' : '', c))));
    G.scores.list(lay.id).forEach((r, i) => t.append(h('tr', i === UI.lastIdx && lay.id === UI.lastKey ? 'me' : '', [h('td', '', String(i + 1)), h('td', 'r', r[0] + '   ' + U.fmt(r[1])), h('td', '', '')])));
    body.append(t); const z = G.progress.zen[lay.id];
    body.append(h('p', 'hint', 'ZEN  ' + (z !== undefined ? 'cleared in ' + U.time(z) : 'not cleared yet')));
  }
  function build() {
    const logo = h('h1', 'logo', ['SPACEJONG', h('small', '', 'GLASS · TILES · GALAXY')]);
    screen('title', [logo, menu([btn('ZEN MODE', () => UI.openGallery('zen'), { primary: true }), btn('TIMED MODE', () => UI.openGallery('timed')), btn('HIGH SCORES', () => { fillScores(); nav('scores'); }), btn('HOW TO PLAY', () => nav('help')), btn('SETTINGS', () => nav('settings'))]),
      h('p', 'hint', [h('b', '', 'Click'), ' pick tiles  ', h('b', '', 'H'), ' hint  ', h('b', '', 'U'), ' undo  ', h('b', '', 'S'), ' shuffle  ', h('b', '', 'P'), ' pause']),
      h('div', 'credit', ['Free to play and share · ', h('a', '', 'github.com/nbwillcox/spacejong', { href: C.REPO, target: '_blank', rel: 'noopener' }), ' · ', h('a', '', 'CC BY-NC 4.0', { href: 'https://creativecommons.org/licenses/by-nc/4.0/', target: '_blank', rel: 'noopener' })])]);
    const chips = h('div', 'chips', [['zen', 'ZEN'], ['timed', 'TIMED']].map((m) => { const b = btn(m[1], () => { UI.mode = m[0]; saveSetup(); fillGallery(); }, { cls: 'chip small' }); b.dataset.m = m[0]; return b; }), { id: 'modeChips' });
    screen('layouts', [heading('', 'galTitle'), chips, h('p', 'hint', '', { id: 'galDesc' }), h('div', 'cards', '', { id: 'cards' }), menu([btn('BACK', goBack)])]);
  }
  function build2() {
    screen('scores', [heading('HIGH SCORES'), h('div', 'row', [btn('◀', () => { UI.scoreIdx = (UI.scoreIdx + G.layouts.length - 1) % G.layouts.length; fillScores(); }, { cls: 'small' }), h('p', 'hint boardname', '', { id: 'keyName' }), btn('▶', () => { UI.scoreIdx = (UI.scoreIdx + 1) % G.layouts.length; fillScores(); }, { cls: 'small' })]), h('div', 'panel', '', { id: 'scoreBody' }), menu([btn('BACK', goBack, { primary: true })])]);
    const li = (a, b) => h('p', 'hint left', [h('b', '', a + '  '), b]);
    screen('help', [heading('HOW TO PLAY'), h('div', 'panel', [li('GOAL', 'Clear the board by matching pairs of identical free tiles.'), li('FREE TILE', 'Nothing on top of it, and its left OR right side is open. Blocked tiles are dimmed.'), li('FLOWERS & SEASONS', 'Any nebula flower matches any other flower; any season matches any season (gold rims).'),
      li('MOUSE / TOUCH', 'Tap a free tile, then its twin. Right-click or tap empty space to drop a selection.'), li('KEYBOARD', 'Arrows hop between free tiles · Enter / Space pick · H hint · U undo · S shuffle · P pause'), li('GAMEPAD', 'D-pad / stick hop · A pick · B drop · X hint · Y undo · RB shuffle · Start pause'),
      li('COMBOS', 'Matches within 3.6 seconds chain a combo that multiplies points up to x8.'), li('TIMED', 'Matches add seconds. Hint -10s, undo -8s, shuffle -15s. Clear the board to bank leftover seconds as score.'), li('ZEN', 'Relax: no clock, no penalties. Every deal is solvable, and stuck boards reshuffle themselves.')]), menu([btn('BACK', goBack, { primary: true })])]);
    const sl = (id, label, min, max, step) => h('label', '', [label, h('input', '', null, { id, type: 'range', min, max, step })]);
    const ck = (id, label) => h('label', '', [label, h('input', '', null, { id, type: 'checkbox' })]);
    screen('settings', [heading('SETTINGS'), h('div', 'panel', [sl('setMaster', 'Master volume', 0, 1, 0.05), sl('setMusic', 'Music volume', 0, 1, 0.05), sl('setSfx', 'Effects volume', 0, 1, 0.05), ck('setTilt', 'Parallax tilt'), ck('setShake', 'Screen shake'), ck('setDim', 'Dim blocked tiles'), ck('setReduced', 'Reduced motion'), ck('setPad', 'Use gamepad'),
      h('label', '', ['Glass quality', h('button', 'small', S.glass.toUpperCase(), { id: 'setGlass', type: 'button' })]), sl('setQuality', 'Render resolution', 0.5, 1, 0.1)]), menu([btn('BACK', goBack, { primary: true })])]);
    const bind = (id, key, num) => { const e = $(id); if (num) { e.value = S[key]; e.addEventListener('input', () => { S[key] = parseFloat(e.value); S.save(); if (A()) A().applyVolumes(); if (key === 'quality' && G.main.rebuild) G.main.rebuild(); }); } else { e.checked = !!S[key]; e.addEventListener('change', () => { S[key] = e.checked; S.save(); if (A()) A().sfx.blip(); }); } };
    bind('setMaster', 'master', 1); bind('setMusic', 'music', 1); bind('setSfx', 'sfx', 1); bind('setQuality', 'quality', 1); bind('setTilt', 'tilt'); bind('setShake', 'shake'); bind('setDim', 'dim'); bind('setReduced', 'reduced'); bind('setPad', 'gamepad');
    $('setGlass').addEventListener('click', () => { S.glass = S.glass === 'high' ? 'low' : 'high'; $('setGlass').textContent = S.glass.toUpperCase(); S.save(); if (A()) A().sfx.blip(); });
    screen('pause', [heading('PAUSED'), menu([btn('RESUME', () => G.main.resume(), { primary: true }), btn('NEW DEAL', () => G.main.restart()), btn('CHOOSE BOARD', () => { G.main.quit('layouts'); UI.stack = ['title']; fillGallery(); }), btn('SETTINGS', () => nav('settings')), btn('QUIT TO MENU', () => G.main.quit())])]);
    screen('results', [heading('', 'resTitle'), h('p', 'big', '', { id: 'resBig' }), h('div', 'panel stats', '', { id: 'resStats' }),
      h('div', 'entry hidden', [h('p', 'newhs', 'NEW HIGH SCORE! Enter your initials'), h('input', '', null, { id: 'goName', type: 'text', maxlength: 3, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your initials' }), menu([btn('SAVE', () => UI.saveScore(), { primary: true })])], { id: 'goEntry' }),
      menu([btn('PLAY AGAIN', () => G.main.restart(), { primary: true }), btn('NEXT BOARD', () => UI.next(), { cls: 'nextBtn' }), btn('CHOOSE BOARD', () => { G.main.quit('layouts'); fillGallery(); UI.stack = ['title']; }), btn('MENU', () => G.main.quit())], { id: 'goButtons' })]);
    $('goName').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); });
    $('goName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); UI.saveScore(); } });
    $('ui').append(h('div', 'toast hidden', '', { id: 'toast' }));
  }
  UI.next = function () { const i = G.layouts.findIndex((l) => l.id === g.layout.id); UI.play(G.layouts[(i + 1) % G.layouts.length].id); };
  UI.showResults = function (res) {
    const timed = res.mode === 'timed'; $('resTitle').textContent = res.win ? 'BOARD CLEARED' : timed && res.left <= 0 ? 'TIME UP' : 'GAME OVER';
    $('resBig').textContent = res.win ? (timed ? U.fmt(res.score) : U.time(res.time)) : res.tilesLeft + ' TILES LEFT';
    const rows = [['Board', res.layout.name], ['Mode', timed ? 'Timed' : 'Zen'], ['Time', U.time(res.time)], ['Matches', res.matches], ['Best combo', 'x' + Math.max(1, res.maxCombo)], ['Hints', res.hints], ['Undos', res.undos], ['Shuffles', res.shuffles]];
    if (timed) { rows.splice(2, 0, ['Score', U.fmt(res.score)]); if (res.win) rows.push(['Time bonus', '+' + U.fmt(res.bonus)]); rows.push(['Penalties', res.penalty + 's']); }
    const box = $('resStats'); box.textContent = ''; for (const r of rows) box.append(h('span', '', r[0]), h('span', '', String(r[1])));
    const q = timed && res.win && G.scores.qualifies(res.layout.id, res.score); UI.pending = q ? { id: res.layout.id, v: res.score } : null; UI.lastKey = res.layout.id;
    $('goEntry').classList.toggle('hidden', !q); $('goButtons').classList.toggle('hidden', q); $('goName').value = G.scores.lastName || '';
    document.querySelector('#results .nextBtn').classList.toggle('hidden', !res.win);
    UI.show('results');
  };
  UI.saveScore = function () {
    if (!UI.pending) return;
    const name = ($('goName').value || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AAA';
    UI.lastIdx = G.scores.add(UI.pending.id, name, UI.pending.v); UI.scoreIdx = Math.max(0, G.layouts.findIndex((l) => l.id === UI.pending.id)); UI.pending = null;
    if (A()) A().sfx.select(); G.main.quit('scores'); fillScores(); UI.stack = ['title'];
  };
  UI.show = function (name, keepStack) {
    document.querySelectorAll('#ui .screen').forEach((e) => e.classList.toggle('hidden', e.id !== name));
    UI.cur = name; document.body.classList.toggle('menu-open', !!name);
    if (!keepStack && name === 'title') { UI.stack = []; UI.lastIdx = -1; }
    if (name === 'scores') fillScores();
    setTimeout(() => { const sec = $(name); if (!sec || sec.classList.contains('hidden')) return; const el = name === 'results' && !$('goEntry').classList.contains('hidden') ? $('goName') : sec.querySelector('button.primary') || sec.querySelector('button.on') || sec.querySelector('button'); if (el) { el.focus({ preventScroll: true }); if (el.select) el.select(); } }, 0);
  };
  UI.hideAll = function () { document.querySelectorAll('#ui .screen').forEach((e) => e.classList.add('hidden')); UI.cur = null; document.body.classList.remove('menu-open'); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  UI.isOpen = () => UI.cur !== null;
  /* spatial focus: jump to the nearest button in the pressed direction */
  function focusMove(dx, dy) {
    const sec = $(UI.cur); if (!sec) return; const els = [...sec.querySelectorAll('button')].filter((b) => b.offsetParent !== null); if (!els.length) return;
    const ae = document.activeElement, from = els.indexOf(ae); if (from < 0) { els[0].focus(); return; }
    const r0 = ae.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2; let best = null, bc = 1e9;
    for (const b of els) { if (b === ae) continue; const r = b.getBoundingClientRect(), vx = r.left + r.width / 2 - cx, vy = r.top + r.height / 2 - cy, along = vx * dx + vy * dy, perp = Math.abs(vx * dy - vy * dx); if (along <= 4) continue; const c = along + perp * 2.4; if (c < bc) { bc = c; best = b; } }
    if (best) { best.focus({ preventScroll: true }); best.scrollIntoView({ block: 'nearest', inline: 'nearest' }); if (A()) A().sfx.blip(); }
  }
  const prev = {}, rep = { t: 0, d: '' }, BACKABLE = ['layouts', 'scores', 'help', 'settings'];
  UI.padNav = function (dt) {
    if (!UI.cur || !S.gamepad || !navigator.getGamepads) return;
    const p = [...navigator.getGamepads()].find((x) => x && x.connected); if (!p) return;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0, ay = p.axes[1] || 0;
    const st = { a: b(0), b: b(1), start: b(9) }, edge = (k) => st[k] && !prev[k];
    let dir = ''; if (b(14) || ax < -0.6) dir = 'l'; else if (b(15) || ax > 0.6) dir = 'r'; else if (b(12) || ay < -0.6) dir = 'u'; else if (b(13) || ay > 0.6) dir = 'd';
    const mv = () => focusMove(dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dir === 'u' ? -1 : dir === 'd' ? 1 : 0);
    if (dir && dir !== rep.d) { rep.d = dir; rep.t = 0.35; mv(); } else if (dir) { rep.t -= dt; if (rep.t <= 0) { rep.t = 0.14; mv(); } } else rep.d = '';
    if (edge('a') && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.click();
    if (edge('b') && BACKABLE.indexOf(UI.cur) >= 0) goBack();
    if (edge('start')) { if (UI.cur === 'pause') G.main.resume(); else if (UI.cur === 'title') { const f = document.querySelector('#title button.primary'); if (f) f.click(); } }
    Object.assign(prev, st);
  };
  UI.init = function () {
    build(); build2();
    window.addEventListener('keydown', (e) => {
      if (!UI.cur) return;
      if ((e.key === 'Escape' || e.key === 'Backspace') && BACKABLE.indexOf(UI.cur) >= 0 && !(e.target && e.target.type === 'text')) { goBack(); e.preventDefault(); return; }
      if (e.key === 'Escape' && UI.cur === 'pause') { G.main.resume(); return; }
      const dirs = { ArrowDown: [0, 1], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowLeft: [-1, 0] }, d = dirs[e.key];
      if (!d || (e.target && (e.target.type === 'text' || (e.target.type === 'range' && d[0] !== 0)))) return;
      focusMove(d[0], d[1]); e.preventDefault();
    });
    document.addEventListener('pointerdown', () => A() && A().resume(), { passive: true });
  };
  /* ---------- in-game HUD ---------- */
  const HUD = { };
  G.hud = HUD;
  HUD.init = function () {
    const act = (fn) => (e) => { if (A()) A().resume(); fn(); e.currentTarget.blur(); };
    $('hPause').addEventListener('click', act(() => G.main.pause())); $('bHint').addEventListener('click', act(() => g.useHint())); $('bUndo').addEventListener('click', act(() => g.undo())); $('bShuf').addEventListener('click', act(() => g.shuffle(false)));
  };
  HUD.setup = function (game) {
    const timed = game.mode === 'timed'; $('hName').textContent = game.layout.name.toUpperCase(); $('hMode').textContent = timed ? 'TIMED' : 'ZEN';
    $('hMovesBox').classList.toggle('hidden', timed); document.querySelectorAll('#bar small').forEach((s) => s.classList.toggle('hidden', !timed));
    $('bHint').querySelector('small').textContent = '-' + g.COST.hint + 's'; $('bUndo').querySelector('small').textContent = '-' + g.COST.undo + 's'; $('bShuf').querySelector('small').textContent = '-' + g.COST.shuffle + 's';
    HUD.lastMoves = -1; HUD.update(game);
  };
  let sig = '';
  HUD.update = function (game) {
    if (!game.L) return; const timed = game.mode === 'timed', t = timed ? game.clock : game.time;
    const moves = game.state === 'play' ? game.movesLeft() : 0, s = [Math.floor(game.score), Math.floor(t), game.left, moves, game.combo, game.stack.length, game.state === 'play'].join('|');
    if (s === sig) { $('comboFill').style.width = Math.max(0, Math.min(100, game.comboT / C.COMBO_WIN * 100)) + '%'; return; } sig = s;
    $('hScore').textContent = U.fmt(game.score); $('hTime').textContent = U.time(t); $('hTime').classList.toggle('low', timed && game.clock < 15); $('hTiles').textContent = game.left; $('hMoves').textContent = moves;
    $('hCombo').textContent = game.combo > 1 ? 'x' + Math.min(8, game.combo) : ''; $('bUndo').disabled = !game.stack.length;
    $('comboFill').style.width = Math.max(0, Math.min(100, game.comboT / C.COMBO_WIN * 100)) + '%';
  };
})((window.SGS = window.SGS || {}));
