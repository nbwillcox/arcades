/* DOM menus in the pixel font: title, difficulty, high scores, settings, pause, continue, game over / initials, ending. */
(function (G) {
  'use strict';
  const PX = G.px, S = G.settings, C = G.C, A = () => G.audio, U = G.U;
  const UI = { cur: null, stack: [] };
  G.ui = UI;
  const OL = '#0b0d1a', $ = (id) => document.getElementById(id);
  function h(tag, cls, kids, attrs) {
    const e = document.createElement(tag); if (cls) e.className = cls;
    for (const k of [].concat(kids || [])) if (k !== null && k !== undefined) e.append(k);
    if (attrs) for (const a in attrs) e.setAttribute(a, attrs[a]);
    return e;
  }
  const pimg = (txt, o, cls) => { const c = PX.textImage(txt, o); c.className = cls || ''; c.setAttribute('aria-hidden', 'true'); return c; };
  function btn(label, onClick, o) {
    o = o || {};
    const b = h('button', o.primary ? 'primary' : '', [pimg(label, { s: 2, c: o.primary ? '#ffe9d0' : '#cfe4ff', o: OL }, 'off'), pimg(label, { s: 2, c: '#ffffff', o: o.primary ? '#7a2a0a' : '#1a3a8a' }, 'on')], { 'aria-label': label });
    b.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select(); } onClick(); });
    if (o.hint) { const on = () => { $('diffhint').textContent = o.hint; }; b.addEventListener('focus', on); b.addEventListener('mouseenter', on); }
    return b;
  }
  const heading = (txt, over) => h('h2', '', [pimg(txt, { s: 4, c: '#ffffff', g: over ? ['#ffe0e0', '#ff5a5a'] : ['#ffffff', '#9fe8ff'], o: OL, sh: over ? '#6a0a0a' : '#1a3a7a' }, 'ph')], { 'aria-label': txt });
  const screen = (id, kids) => { const s = h('section', 'screen hidden', kids, { id }); $('ui').append(s); return s; };
  const menu = (kids, attrs) => h('div', 'menu', kids, attrs);
  const nav = (to) => { UI.stack.push(UI.cur); UI.show(to, true); };
  const goBack = () => { const prev = UI.stack.pop(); UI.show(prev || 'title', true); if (A()) A().sfx.back(); };
  function build() {
    const logo = h('h1', 'logo', [PX.logoImage('SPACE', 5, ['#ffffff', '#dce8ff', '#b0c4f0', '#86a0dc', '#6280c4', '#46629e', '#2e4478'], 2, '#141c44'), PX.logoImage('BOBBLE', 10, ['#e8fbff', '#9ae8ff', '#4ac8ff', '#2a8ae8', '#2a5ad0', '#4a2ab8', '#2a1a78'], 2, '#0a0a38')], { 'aria-label': 'SpaceBobble' });
    logo.querySelectorAll('canvas').forEach((c) => { c.className = 'plogo'; });
    screen('title', [logo, h('p', 'tag', 'Blow bubbles. Pop aliens. Save the station.'), menu([btn('PLAY', () => nav('diff'), { primary: true }), btn('HIGH SCORES', () => nav('scores')), btn('SETTINGS', () => nav('settings'))]),
      h('p', 'hint', [h('b', '', 'Arrows/WASD'), ' move  ', h('b', '', 'Space/Z/Up'), ' jump  ', h('b', '', 'Down+jump'), ' drop  ', h('b', '', 'X/J/click'), ' blow a bubble  ', h('b', '', 'P'), ' pause  (gamepads work too)']),
      h('footer', 'credit', ['Free to play and share · ', h('a', '', 'github.com/nbwillcox/SpaceBobble', { href: C.REPO, target: '_blank', rel: 'noopener' }), ' · ', h('a', '', 'CC BY-NC 4.0', { href: 'https://creativecommons.org/licenses/by-nc/4.0/', target: '_blank', rel: 'noopener' })])]);
    screen('diff', [heading('DIFFICULTY'), menu(C.DIFF.map((d, i) => btn(d.name, () => G.main.startGame(i), { primary: i === 1, hint: d.hint }))), h('p', 'hint', 'Normal is the classic balance.', { id: 'diffhint' }), menu([btn('BACK', goBack)])]);
    screen('scores', [heading('HIGH SCORES'), h('div', 'rbody', '', { id: 'scorebody' }), menu([btn('BACK', goBack, { primary: true })])]);
    const sl = (id, label) => h('label', '', [label, h('input', '', null, { id, type: 'range', min: 0, max: 1, step: 0.05 })]);
    const ck = (id, label) => h('label', 'check', [h('input', '', null, { id, type: 'checkbox' }), ' ' + label]);
    screen('settings', [heading('SETTINGS'), h('div', 'panel', [sl('setMaster', 'Master volume'), sl('setMusic', 'Music volume'), sl('setSfx', 'Effects volume'), ck('setShake', 'Screen shake'), ck('setReduced', 'Reduced motion'), ck('setPad', 'Use gamepad')]), menu([btn('BACK', goBack, { primary: true })])]);
    const bind = (id, key, num) => { const e = $(id); if (num) { e.value = S[key]; e.addEventListener('input', () => { S[key] = parseFloat(e.value); S.save(); if (A()) A().applyVolumes(); }); e.addEventListener('change', () => A() && A().sfx.blip()); } else { e.checked = !!S[key]; e.addEventListener('change', () => { S[key] = e.checked; S.save(); if (A()) A().sfx.blip(); }); } };
    bind('setMaster', 'master', 1); bind('setMusic', 'music', 1); bind('setSfx', 'sfx', 1); bind('setShake', 'shake'); bind('setReduced', 'reduced'); bind('setPad', 'gamepad');
    screen('pause', [heading('PAUSED'), menu([btn('RESUME', () => G.main.resume(), { primary: true }), btn('SETTINGS', () => nav('settings')), btn('QUIT TO TITLE', () => G.main.quit())])]);
    screen('continue', [heading('CONTINUE?', true), h('p', 'final', '', { id: 'continfo' }), menu([btn('CONTINUE', () => G.main.continueGame(), { primary: true }), btn('GIVE UP', () => UI.finalOver())])]);
    screen('gameover', [heading('GAME OVER', true), h('p', 'final', '', { id: 'goinfo' }),
      h('div', 'entry hidden', [h('p', 'newhs', 'NEW HIGH SCORE! Enter your initials'), h('input', '', null, { id: 'goName', type: 'text', maxlength: 3, autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your initials' }), menu([btn('SAVE SCORE', () => UI.saveScore(), { primary: true })])], { id: 'goEntry' }),
      menu([btn('PLAY AGAIN', () => { UI.stack = ['title']; UI.show('diff', true); }, { primary: true }), btn('TITLE', () => G.main.quit())], { id: 'goButtons' })]);
    screen('ending', [heading('THE END'), h('div', 'story', '', { id: 'story' }), menu([btn('CONTINUE', () => UI.finalOver(true), { primary: true })])]);
    $('goName').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); });
    $('goName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); UI.saveScore(); } });
  }
  UI.showGameOver = function (g) {
    UI.g = g;
    if (g.conts > 0 && !g.ended) { $('continfo').textContent = 'CONTINUES LEFT: ' + g.conts + '   ROUND ' + g.level + '   SCORE ' + U.fmt(g.score); UI.show('continue'); }
    else UI.finalOver();
  };
  UI.finalOver = function () {
    const g = UI.g || G.game; g.ended = true;
    if (A()) A().music('off');
    $('goinfo').textContent = 'SCORE ' + U.fmt(g.score) + '   ROUND ' + g.level;
    const q = G.scores.qualifies(g.score);
    $('goEntry').classList.toggle('hidden', !q); $('goButtons').classList.toggle('hidden', q);
    $('goName').value = G.scores.lastName || '';
    UI.pending = { score: g.score, level: g.level };
    UI.show('gameover');
  };
  UI.saveScore = function () {
    if (!UI.pending) return;
    const name = ($('goName').value || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AAA';
    UI.lastIdx = G.scores.add(name, UI.pending.score, UI.pending.level); UI.pending = null; if (A()) A().sfx.select();
    UI.stack = ['title']; UI.show('scores', true);
  };
  UI.showEnding = function (g, trueEnd) {
    UI.g = g; g.ended = true;
    const st = $('story'); st.textContent = '';
    const lines = trueEnd
      ? ['EVERY OXYGEN FARM IS BLOOMING AGAIN.', 'YOU COLLECTED EXTEND IN ALL TEN WORLDS,', 'AND THE SINGULARITY BURST INTO STARS.', '', 'TRUE ENDING!', 'FINAL SCORE ' + U.fmt(g.score)]
      : ['THE VOID MAW IS GONE AND THE STATION IS SAFE.', 'THE ALIENS HAVE DRIFTED HOME.', '', 'CONGRATULATIONS, ASTRONAUT!', 'FINAL SCORE ' + U.fmt(g.score), '', 'COLLECT EXTEND IN EVERY WORLD', 'FOR THE TRUE ENDING...'];
    for (const l of lines) st.append(h('div', l.indexOf('TRUE') === 0 ? 'rtag good' : 'rsub', l || ' '));
    UI.show('ending');
  };
  function fillScores() {
    const body = $('scorebody'); body.textContent = '';
    const t = h('table', 'tbl'); t.append(h('tr', '', ['#', 'NAME', 'SCORE', 'ROUND'].map((c) => h('th', c === 'SCORE' ? 'r' : '', c))));
    G.scores.list.forEach((r, i) => t.append(h('tr', i === UI.lastIdx ? 'me' : '', [h('td', '', String(i + 1)), h('td', '', r[0]), h('td', 'r', U.fmt(r[1])), h('td', '', String(r[2]))])));
    body.append(h('div', 'tblwrap', [t]));
  }
  UI.show = function (name, keepStack) {
    document.querySelectorAll('#ui .screen').forEach((e) => e.classList.toggle('hidden', e.id !== name));
    UI.cur = name; document.body.classList.toggle('menu-open', !!name);
    if (!keepStack && name === 'title') { UI.stack = []; UI.lastIdx = -1; }
    if (name === 'scores') fillScores();
    setTimeout(() => { const sec = $(name); if (!sec || sec.classList.contains('hidden')) return; const el = name === 'gameover' && !$('goEntry').classList.contains('hidden') ? $('goName') : sec.querySelector('button.primary') || sec.querySelector('button'); if (el) { el.focus(); if (el.select) el.select(); } }, 0);
  };
  UI.hideAll = function () { document.querySelectorAll('#ui .screen').forEach((e) => e.classList.add('hidden')); UI.cur = null; document.body.classList.remove('menu-open'); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  UI.isOpen = () => UI.cur !== null;
  const padPrev = {};
  UI.padNav = function () {
    if (!UI.cur || !S.gamepad || !navigator.getGamepads) return;
    const g = [...navigator.getGamepads()].find((x) => x && x.connected); if (!g) return;
    const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    const st = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6, a: b(0), b: b(1) };
    const edge = (k) => st[k] && !padPrev[k], btns = [...document.querySelectorAll('#' + UI.cur + ' button')], mv = edge('down') || edge('right') ? 1 : edge('up') || edge('left') ? -1 : 0;
    if (mv && btns.length) { const i = btns.indexOf(document.activeElement); btns[(i + mv + btns.length) % btns.length].focus(); if (A()) A().sfx.blip(); }
    if (edge('a') && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.click();
    if (edge('b') && ['diff', 'scores', 'settings'].indexOf(UI.cur) >= 0) goBack();
    Object.assign(padPrev, st);
  };
  UI.init = function () {
    build();
    window.addEventListener('keydown', (e) => {
      if (!UI.cur) return;
      if (e.key === 'Escape' && ['diff', 'scores', 'settings'].indexOf(UI.cur) >= 0) { goBack(); return; }
      const dirs = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in dirs) || (e.target && (e.target.type === 'range' || e.target.type === 'text'))) return;
      const btns = [...document.querySelectorAll('#' + UI.cur + ' button')]; if (!btns.length) return;
      const i = btns.indexOf(document.activeElement); btns[(i + dirs[e.key] + btns.length) % btns.length].focus(); e.preventDefault();
      if (A()) A().sfx.blip();
    });
    document.addEventListener('pointerdown', () => A() && A().resume(), { passive: true });
    document.addEventListener('keydown', () => A() && A().resume());
  };
})((window.SGS = window.SGS || {}));
