/* DOM menus (title, difficulty, cups, machine select, track select, intro, results, records, settings, pause) in the pixel font. */
(function (G) {
  'use strict';
  const PX = G.px, S = G.settings, REC = G.records, T = G.tracks, SH = G.ships, R = G.race, A = () => G.audio;
  const UI = { cur: null, stack: [] };
  G.ui = UI;
  const OL = '#0b0d1a';
  const $ = (id) => document.getElementById(id);
  function h(tag, cls, kids, attrs) {
    const e = document.createElement(tag); if (cls) e.className = cls;
    for (const k of [].concat(kids || [])) if (k !== null && k !== undefined) e.append(k);
    if (attrs) for (const a in attrs) e.setAttribute(a, attrs[a]);
    return e;
  }
  const pimg = (txt, o, cls) => { const c = PX.textImage(txt, o); c.className = cls || ''; c.setAttribute('aria-hidden', 'true'); return c; };
  function btn(label, onClick, o) {
    o = o || {};
    const b = h('button', (o.primary ? 'primary ' : '') + (o.cls || ''), [pimg(label, { s: o.s || 2, c: o.primary ? '#ffe9d0' : '#cfe4ff', o: OL }, 'off'), pimg(label, { s: o.s || 2, c: '#ffffff', o: o.primary ? '#7a2a0a' : '#1a3a8a' }, 'on')], { 'aria-label': label });
    b.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select && A().sfx.select(); } onClick(); });
    return b;
  }
  const heading = (txt, over) => h('h2', '', [pimg(txt, { s: 4, c: '#ffffff', g: over ? ['#ffe0e0', '#ff5a5a'] : ['#ffffff', '#ffb36a'], o: OL, sh: over ? '#6a0a0a' : '#7a2a0a' }, 'ph')], { 'aria-label': txt });
  const screen = (id, kids) => { const s = h('section', 'screen hidden', kids, { id }); $('ui').append(s); return s; };
  const menu = (kids) => h('div', 'menu', kids);
  UI.pending = {};
  const goBack = () => { const prev = UI.stack.pop(); UI.show(prev || 'title', true); if (A()) A().sfx.back(); };
  const nav = (to) => { UI.stack.push(UI.cur); UI.show(to, true); };

  function build() {
    // title
    const logo = h('h1', 'logo', [PX.logoImage('FSPACE', 5, ['#ffffff', '#dce8ff', '#b0c4f0', '#86a0dc', '#6280c4', '#46629e', '#2e4478'], 2, '#141c44'), PX.logoImage('ZERO', 10, ['#d8fbff', '#7aeaff', '#3ab4ff', '#d04ad8', '#a022b8', '#701a98', '#40106a'], 2, '#1a0a38')], { 'aria-label': 'FSpaceZero' });
    logo.querySelectorAll('canvas').forEach((c) => { c.className = 'plogo'; });
    screen('title', [logo, h('p', 'tag', 'Hover. Boost. Win.'), menu([btn('GRAND PRIX', () => nav('diff'), { primary: true }), btn('TIME TRIAL', () => { UI.pending = { mode: 'tt' }; nav('tracks'); }), btn('RECORDS', () => nav('records')), btn('SETTINGS', () => nav('settings'))]),
      h('p', 'hint', [h('b', '', 'Arrows/WASD'), ' steer  ', h('b', '', 'Up/Z'), ' accelerate  ', h('b', '', 'X/Space'), ' boost  ', h('b', '', 'Q / E'), ' side-slide  ', h('b', '', 'Down'), ' brake  ', h('b', '', 'P'), ' pause  ', ' (gamepads work too)']),
      h('footer', 'credit', ['Free to play and share · ', h('a', '', 'github.com/nbwillcox/FSpaceZero', { href: G.C.REPO, target: '_blank', rel: 'noopener' }), ' · ', h('a', '', 'CC BY-NC 4.0', { href: 'https://creativecommons.org/licenses/by-nc/4.0/', target: '_blank', rel: 'noopener' })])]);
    // difficulty
    const dif = G.race.DIFF.map((d, i) => btn(d.name, () => { UI.pending = { mode: 'gp', diff: i }; nav('cups'); }, { primary: i === 1 }));
    screen('diff', [heading('DIFFICULTY'), menu(dif), h('p', 'hint', 'NOVICE: finish top 10 to advance  ·  STANDARD: top 8  ·  EXPERT: top 6'), menu([btn('BACK', goBack)])]);
    // cups
    const cupBtns = T.CUPS.map((c, i) => { const b = btn(c.name, () => { UI.pending.cup = i; nav('machines'); }, { primary: i === 0 }); return b; });
    screen('cups', [heading('CHOOSE A CUP'), h('div', 'cups', T.CUPS.map((c, i) => h('div', 'cupcol', [cupBtns[i], h('ul', 'tracklist', [0, 1, 2, 3, 4].map((k) => h('li', '', T.list[i * 5 + k].name))), h('p', 'cupbest', null, { 'data-cup': i })]))), menu([btn('BACK', goBack)])]);
    // machine select
    const cards = SH.TYPES.map((m, i) => {
      const cv = document.createElement('canvas'); cv.width = 48; cv.height = 30; cv.getContext('2d').drawImage(SH.set(i, m.hue)[1][0], 0, 0); cv.className = 'shipimg';
      const stats = ['SPEED', 'GRIP', 'BODY', 'BOOST'].map((n, k) => h('div', 'stat', [h('span', '', n), h('i', '', [0, 1, 2, 3, 4].map((q) => h('b', q < m.stats[k] ? 'pip' : ''))) ]));
      const c = h('button', 'card', [cv, h('div', 'cname', m.name), h('div', 'cblurb', m.blurb), h('div', 'stats', stats)], { 'aria-label': m.name });
      c.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select(); } UI.pickMachine(i); });
      return c;
    });
    screen('machines', [heading('CHOOSE YOUR MACHINE'), h('div', 'cards', cards), menu([btn('BACK', goBack)])]);
    // track select (time trial)
    const tcols = T.CUPS.map((c, ci) => h('div', 'cupcol', [h('div', 'cupname', c.name)].concat([0, 1, 2, 3, 4].map((k) => { const tr = T.list[ci * 5 + k], b = h('button', 'trk', [h('span', 'tn', tr.name), h('span', 'tb', null, { 'data-t': tr.id }), h('span', 'tw', T.WORLDS[tr.world].name)]); b.addEventListener('click', () => { if (A()) { A().resume(); A().sfx.select(); } UI.pending.track = tr.id; nav('machines'); }); return b; }))));
    screen('tracks', [heading('TIME TRIAL'), h('div', 'cups', tcols), menu([btn('BACK', goBack)])]);
    buildMore();
  }
  const fmt = (t) => R.fmt(t);
  function preview(id) {
    const tr = T.build(id), c = document.createElement('canvas'); c.width = c.height = 120; c.className = 'trackprev'; const x = c.getContext('2d');
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let s = 0; s < tr.N; s++) { x0 = Math.min(x0, tr.x[s]); x1 = Math.max(x1, tr.x[s]); y0 = Math.min(y0, tr.y[s]); y1 = Math.max(y1, tr.y[s]); }
    const sc = 100 / Math.max(x1 - x0, y1 - y0), ox = (120 - (x1 - x0) * sc) / 2, oy = (120 - (y1 - y0) * sc) / 2;
    for (const [w, col] of [[7, '#0b0d1a'], [4, '#8ea2d2']]) { x.lineWidth = w; x.strokeStyle = col; x.lineJoin = 'round'; x.beginPath(); for (let s = 0; s < tr.N; s += 2) { const px = ox + (tr.x[s] - x0) * sc, py = oy + (tr.y[s] - y0) * sc; s ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.stroke(); }
    const p = tr.at(0, 0); x.fillStyle = '#fff'; x.fillRect(ox + (p.x - x0) * sc - 3, oy + (p.y - y0) * sc - 3, 6, 6);
    return c;
  }
  function table(rows, cols) {
    const t = h('table', 'tbl');
    t.append(h('tr', '', cols.map((c) => h('th', '', c.h))));
    for (const r of rows) t.append(h('tr', r.isP ? 'me' : '', cols.map((c) => h('td', c.cls || '', String(c.f(r))))));
    return h('div', 'tblwrap', [t]);
  }
  function buildMore() {
    screen('intro', [h('div', 'introbox', [h('div', 'itag', ''), h('div', 'iname', ''), h('div', 'iworld', ''), h('div', 'iprev', ''), h('div', 'iinfo', '')]), menu([btn('START', () => UI.introGo && UI.introGo(), { primary: true }), btn('QUIT', () => { if (G.main) G.main.quit(); })])]);
    screen('results', [heading('RESULTS'), h('div', 'rmsg', ''), h('div', 'rbody', ''), h('div', 'menu', '', { id: 'rbtns' })]);
    screen('records', [heading('RECORDS'), h('div', 'rbody', '', { id: 'recbody' }), menu([btn('BACK', goBack)])]);
    screen('pause', [heading('PAUSED'), menu([btn('RESUME', () => G.main.resume(), { primary: true }), btn('RESTART RACE', () => { G.main.resume(); if (G.flow.gp || G.flow.tt) G.flow.retry(); }), btn('SETTINGS', () => nav('settings')), btn('QUIT TO TITLE', () => G.main.quit())])]);
    const sl = (id, label) => h('label', '', [label, h('input', '', null, { id, type: 'range', min: 0, max: 1, step: 0.05 })]);
    const ck = (id, label) => h('label', 'check', [h('input', '', null, { id, type: 'checkbox' }), ' ' + label]);
    screen('settings', [heading('SETTINGS'), h('div', 'panel', [sl('setMaster', 'Master volume'), sl('setMusic', 'Music volume'), sl('setSfx', 'Effects volume'), ck('setShake', 'Screen shake'), ck('setReduced', 'Reduced motion'), ck('setPad', 'Use gamepad')]), menu([btn('BACK', goBack, { primary: true })])]);
    const bind = (id, key, num) => { const e = $(id); if (num) { e.value = S[key]; e.addEventListener('input', () => { S[key] = parseFloat(e.value); S.save(); if (A()) A().applyVolumes(); }); e.addEventListener('change', () => A() && A().sfx.blip()); } else { e.checked = !!S[key]; e.addEventListener('change', () => { S[key] = e.checked; S.save(); if (A()) A().sfx.blip(); }); } };
    bind('setMaster', 'master', 1); bind('setMusic', 'music', 1); bind('setSfx', 'sfx', 1); bind('setShake', 'shake'); bind('setReduced', 'reduced'); bind('setPad', 'gamepad');
  }
  UI.pickMachine = function (i) { const p = UI.pending; UI.stack = []; if (p.mode === 'gp') G.flow.startGP(p.cup, p.diff, i); else G.flow.startTT(p.track, i); };
  UI.showIntro = function (info) {
    const s = $('intro');
    s.querySelector('.itag').textContent = info.title; s.querySelector('.iname').textContent = info.track.name; s.querySelector('.iworld').textContent = info.world;
    const pv = s.querySelector('.iprev'); pv.textContent = ''; pv.append(preview(info.track.id));
    s.querySelector('.iinfo').textContent = info.diff + '  ·  FINISH TOP ' + info.cut + '  ·  MACHINES LEFT ' + info.lives;
    UI.introGo = info.go; UI.show('intro');
    if (A() && A().ready) A().music('title');
  };
  const tag = (txt, cls) => h('div', 'rtag ' + (cls || ''), txt);
  function resultsBase() { const s = $('results'); const msg = s.querySelector('.rmsg'), body = s.querySelector('.rbody'), btns = $('rbtns'); msg.textContent = ''; body.textContent = ''; btns.textContent = ''; btns.className = 'menu'; return { msg, body, btns }; }
  UI.showGPResults = function (i) {
    const { msg, body, btns } = resultsBase();
    const head = i.status === 'cup' ? 'CUP COMPLETE' : i.ok ? 'QUALIFIED' : i.status === 'over' ? 'GAME OVER' : 'DID NOT QUALIFY';
    msg.append(tag(head, i.ok ? 'good' : 'bad'), h('div', 'rsub', i.track.name + '  ·  YOU FINISHED ' + i.rank + (i.ok ? '' : '  (NEED TOP ' + i.cut + ')')));
    if (i.status === 'cup') {
      msg.append(h('div', 'rsub', i.cup.name + ' · ' + i.cup.diff + ' · FINAL RANK ' + i.cup.rank + ' / 20 · ' + i.cup.pts + ' PTS' + (i.cup.newBest ? '  NEW BEST!' : '')));
      body.append(table(i.standings.map((r, k) => Object.assign({ pos: k + 1 }, r)), [{ h: 'POS', f: (r) => r.pos }, { h: 'RACER', f: (r) => r.name }, { h: 'POINTS', f: (r) => r.pts, cls: 'r' }]));
    } else body.append(table(i.rows, [{ h: 'POS', f: (r) => r.rank }, { h: 'RACER', f: (r) => r.name }, { h: 'TIME', f: (r) => (r.time === null ? 'DNF' : fmt(r.time)), cls: 'r' }, { h: 'PTS', f: (r) => (r.add ? '+' + r.add : ''), cls: 'r' }, { h: 'TOTAL', f: (r) => r.total, cls: 'r' }]));
    if (i.status === 'next') btns.append(btn('NEXT RACE', () => G.flow.advance(), { primary: true }), btn('QUIT TO TITLE', () => G.main.quit()));
    else if (i.status === 'retry') btns.append(h('div', 'rsub', 'MACHINES LEFT: ' + i.lives), btn('RETRY RACE', () => G.flow.retry(), { primary: true }), btn('QUIT TO TITLE', () => G.main.quit()));
    else btns.append(btn('TITLE', () => G.main.quit(), { primary: true }));
    UI.show('results');
    const row = body.querySelector('tr.me'); if (row && row.scrollIntoView) row.scrollIntoView({ block: 'center' });
  };
  UI.showTTResults = function (i) {
    const { msg, body, btns } = resultsBase();
    msg.append(tag(i.finished ? 'FINISHED' : 'MACHINE DESTROYED', i.finished ? 'good' : 'bad'), h('div', 'rsub', i.track.name));
    if (i.finished) {
      body.append(table(i.laps.map((t, k) => ({ lap: 'LAP ' + (k + 1), t })), [{ h: 'LAP', f: (r) => r.lap }, { h: 'TIME', f: (r) => fmt(r.t), cls: 'r' }]), h('div', 'rsub', 'TOTAL ' + fmt(i.total) + (i.newRace ? '   NEW RECORD!' : '   (BEST ' + fmt(i.prev.race) + ')')), h('div', 'rsub', 'BEST LAP ' + fmt(i.lap) + (i.newLap ? '   NEW RECORD!' : '   (BEST ' + fmt(i.prev.lap) + ')')));
      if (i.ghost) body.append(h('div', 'rsub', 'GHOST SAVED - RACE IT NEXT TIME'));
    }
    btns.append(btn('RETRY', () => G.flow.retry(), { primary: true }), btn('TRACK SELECT', () => { G.main.quit(); UI.pending = { mode: 'tt' }; UI.stack = ['title']; UI.show('tracks', true); }), btn('QUIT TO TITLE', () => G.main.quit()));
    UI.show('results');
  };
  function fillRecords() {
    const body = $('recbody'); body.textContent = '';
    const rows = T.list.map((t) => { const r = REC.tracks[t.id]; return { name: t.name, cup: T.CUPS[t.cup].name, race: r ? r.race : null, lap: r ? r.lap : null }; });
    body.append(table(rows, [{ h: 'TRACK', f: (r) => r.name }, { h: 'CUP', f: (r) => r.cup }, { h: 'BEST RACE', f: (r) => fmt(r.race), cls: 'r' }, { h: 'BEST LAP', f: (r) => fmt(r.lap), cls: 'r' }]));
    const cups = []; T.CUPS.forEach((c, ci) => R.DIFF.forEach((d, di) => { const r = REC.cups[ci + ':' + di]; if (r) cups.push({ name: c.name + ' · ' + d.name, pts: r.pts, rank: r.rank }); }));
    if (cups.length) body.append(table(cups, [{ h: 'CUP', f: (r) => r.name }, { h: 'POINTS', f: (r) => r.pts, cls: 'r' }, { h: 'RANK', f: (r) => r.rank + '/20', cls: 'r' }]));
  }
  UI.show = function (name, keepStack) {
    document.querySelectorAll('#ui .screen').forEach((e) => e.classList.toggle('hidden', e.id !== name));
    UI.cur = name; document.body.classList.toggle('menu-open', !!name);
    if (!keepStack && name === 'title') UI.stack = [];
    if (name === 'cups') document.querySelectorAll('.cupbest').forEach((e) => { const ci = +e.dataset.cup, d = R.DIFF.map((dd, di) => { const r = REC.cups[ci + ':' + di]; return r ? dd.name[0] + ' ' + r.rank + '/20' : null; }).filter(Boolean); e.textContent = d.length ? 'BEST ' + d.join(' · ') : ''; });
    if (name === 'tracks') document.querySelectorAll('.tb').forEach((e) => { const r = REC.tracks[+e.dataset.t]; e.textContent = r && r.race ? fmt(r.race) : '--'; });
    if (name === 'records') fillRecords();
    setTimeout(() => { const sec = $(name); if (!sec || sec.classList.contains('hidden')) return; const el = sec.querySelector('button.primary') || sec.querySelector('button'); if (el) el.focus(); }, 0);
  };
  UI.hideAll = function () { document.querySelectorAll('#ui .screen').forEach((e) => e.classList.add('hidden')); UI.cur = null; document.body.classList.remove('menu-open'); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); };
  UI.isOpen = () => UI.cur !== null;
  /* gamepad menu navigation: d-pad / stick moves focus, A presses, B goes back */
  const padPrev = {};
  UI.padNav = function () {
    if (!UI.cur || !S.gamepad || !navigator.getGamepads) return;
    const g = [...navigator.getGamepads()].find((x) => x && x.connected); if (!g) return;
    const b = (i) => !!(g.buttons[i] && g.buttons[i].pressed), ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    const st = { up: b(12) || ay < -0.6, down: b(13) || ay > 0.6, left: b(14) || ax < -0.6, right: b(15) || ax > 0.6, a: b(0), b: b(1) };
    const edge = (k) => st[k] && !padPrev[k];
    const btns = [...document.querySelectorAll('#' + UI.cur + ' button')];
    const mv = edge('down') || edge('right') ? 1 : edge('up') || edge('left') ? -1 : 0;
    if (mv && btns.length) { const i = btns.indexOf(document.activeElement); btns[(i + mv + btns.length) % btns.length].focus(); if (A()) A().sfx.blip(); }
    if (edge('a') && document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.click();
    if (edge('b') && ['diff', 'cups', 'machines', 'tracks', 'records', 'settings'].indexOf(UI.cur) >= 0) goBack();
    Object.assign(padPrev, st);
  };
  UI.init = function () {
    build();
    window.addEventListener('keydown', (e) => {
      if (!UI.cur) return;
      if (e.key === 'Escape' && ['diff', 'cups', 'machines', 'tracks', 'records', 'settings'].indexOf(UI.cur) >= 0) { goBack(); return; }
      const dirs = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      if (!(e.key in dirs) || (e.target && e.target.type === 'range')) return;
      const btns = [...document.querySelectorAll('#' + UI.cur + ' button')]; if (!btns.length) return;
      const i = btns.indexOf(document.activeElement); btns[(i + dirs[e.key] + btns.length) % btns.length].focus(); e.preventDefault();
      if (A()) A().sfx.blip();
    });
    document.addEventListener('pointerdown', () => A() && A().resume(), { passive: true });
    document.addEventListener('keydown', () => A() && A().resume());
  };
})((window.SGS = window.SGS || {}));
