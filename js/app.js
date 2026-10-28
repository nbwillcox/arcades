/* Nic's Arcade - launcher shell. Hub (tiles + spotlight), game stage (iframe) and in-game arcade menu.
   Input: gamepad, keyboard, mouse, touch. Games run unmodified in a same-origin iframe. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const GAMES = window.ARCADE_GAMES, GENRES = window.ARCADE_GENRES;
  const byId = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  const GENRE_NAME = { shoot: 'Shooter', action: 'Action', puzzle: 'Puzzle & Maze', race: 'Racing & Driving' };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('arcades.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('arcades.' + k, JSON.stringify(v)); } catch (e) {} },
  };
  let favs = new Set(store.get('favs', []));
  let filter = store.get('filter', 'all');
  let list = [], sel = 0, mode = 'hub', cur = null, pauseSel = 0, savedPads = null;
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch) document.body.classList.add('touch');

  const grid = $('grid'), frame = $('frame'), toastEl = $('toast');

  /* ---------- helpers ---------- */
  let toastT = 0;
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 1800); }
  const sfx = (n) => window.ARC_SFX.play(n);
  const cover = (g) => 'covers/' + g.id + '.webp';

  /* ---------- hub ---------- */
  function renderTabs() {
    $('tabs').innerHTML = '';
    GENRES.forEach((t) => {
      const b = document.createElement('button');
      b.className = 'tab' + (t.id === filter ? ' on' : ''); b.textContent = t.name; b.setAttribute('role', 'tab');
      b.onclick = () => { sfx('tab'); setFilter(t.id); };
      $('tabs').appendChild(b);
    });
  }
  function setFilter(id, keepSel) {
    filter = id; store.set('filter', id);
    const prev = list[sel] && list[sel].id;
    list = GAMES.filter((g) => id === 'all' || (id === 'fav' ? favs.has(g.id) : g.genre === id));
    sel = Math.max(0, list.findIndex((g) => g.id === prev));
    renderTabs(); renderGrid(); select(sel, true);
    $('count').textContent = list.length;
  }
  function renderGrid() {
    grid.innerHTML = '';
    if (!list.length) { grid.innerHTML = '<div class="empty">NO CABINETS HERE YET<br><small>Press Y or ★ on a game to add it</small></div>'; return; }
    list.forEach((g, i) => {
      const b = document.createElement('button');
      b.className = 'tile' + (favs.has(g.id) ? ' fav' : ''); b.style.setProperty('--h', g.hue); b.setAttribute('role', 'option');
      b.innerHTML = '<div class="ph"></div><img loading="lazy" alt="" src="' + cover(g) + '"><span class="star">★</span><div class="cap">' + g.name + '</div>';
      b.querySelector('img').onerror = function () { this.remove(); };
      b.onmouseenter = () => { if (mode === 'hub' && sel !== i) select(i, false, true); };
      b.onclick = () => { sel = i; launch(g.id); };
      b.oncontextmenu = (e) => { e.preventDefault(); sel = i; toggleFav(); };
      grid.appendChild(b);
    });
  }
  function select(i, scroll, quiet) {
    if (!list.length) { $('spot').style.visibility = 'hidden'; return; }
    $('spot').style.visibility = '';
    sel = (i + list.length) % list.length;
    const g = list[sel];
    [...grid.children].forEach((t, k) => t.classList.toggle('sel', k === sel));
    const t = grid.children[sel];
    if (t && !quiet) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    $('spot').style.setProperty('--h', g.hue);
    $('spImg').src = cover(g); $('spImg').onerror = function () { this.removeAttribute('src'); };
    $('spGenre').textContent = GENRE_NAME[g.genre];
    $('spName').textContent = g.name; $('spTag').textContent = g.tag;
    $('spKeys').innerHTML = g.keys.map((k) => '<b>' + k[0] + '</b><span>' + k[1] + '</span>').join('');
    $('spBadges').innerHTML = ['KEYBOARD', g.mouse ? 'MOUSE' : '', 'GAMEPAD', g.t ? 'TOUCH' : 'NO TOUCH']
      .filter(Boolean).map((b) => '<span class="' + (b === 'NO TOUCH' ? '' : 'y') + '">' + b + '</span>').join('');
    window.ARC_STARS.hue(g.hue);
    if (!quiet && !scroll) sfx('move');
  }
  function move(dx, dy) {
    const t = [...grid.children].filter((e) => e.classList.contains('tile'));
    if (!t.length) return;
    const r = t.map((e) => e.getBoundingClientRect()), a = r[sel];
    const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    let best = -1, bs = 1e9;
    r.forEach((q, i) => {
      if (i === sel) return;
      const ex = q.left + q.width / 2 - ax, ey = q.top + q.height / 2 - ay;
      const along = ex * dx + ey * dy, across = Math.abs(dx ? ey : ex);
      if (along < 8) return;
      const s = along + across * 2.4;
      if (s < bs) { bs = s; best = i; }
    });
    if (best >= 0) select(best);
  }
  function toggleFav() {
    const g = list[sel]; if (!g) return;
    if (favs.has(g.id)) favs.delete(g.id); else favs.add(g.id);
    store.set('favs', [...favs]); sfx('fav');
    toast((favs.has(g.id) ? 'Added to favorites: ' : 'Removed: ') + g.name);
    if (filter === 'fav') setFilter('fav'); else grid.children[sel].classList.toggle('fav', favs.has(g.id));
  }
  function cycleTab(d) {
    const i = GENRES.findIndex((t) => t.id === filter);
    sfx('tab'); setFilter(GENRES[(i + d + GENRES.length) % GENRES.length].id);
  }
  function randomGame() { if (list.length) { select(Math.floor(Math.random() * list.length)); sfx('ok'); } }

  /* ---------- launching a game ---------- */
  let loadT = 0;
  function launch(id, fromHash) {
    const g = byId[id]; if (!g || mode !== 'hub') return;
    mode = 'launch'; cur = g; sfx('launch'); store.set('last', id);
    $('lName').textContent = g.name; $('launch').hidden = false;
    $('launch').querySelector('i').style.width = '0'; requestAnimationFrame(() => requestAnimationFrame(() => ($('launch').querySelector('i').style.width = '100%')));
    window.ARC_STARS.warp(true); window.ARC_STARS.hue(g.hue);
    if (!fromHash) history.pushState({ g: id }, '', '#' + id);
    waitRelease();
    setTimeout(() => {
      if (mode !== 'launch') return;
      $('stage').hidden = false; frame.classList.remove('ready');
      frame.onload = onFrameLoad; frame.src = 'games/' + id + '/index.html';
      loadT = setTimeout(onFrameLoad, 9000);
    }, 650);
  }
  function onFrameLoad() {
    clearTimeout(loadT);
    if (mode !== 'launch') return;
    frame.onload = null;
    let cw = null; try { cw = frame.contentWindow; cw.addEventListener('keydown', frameKey, true); } catch (e) {}
    setTimeout(() => {
      if (mode !== 'launch') return;
      mode = 'game'; $('launch').hidden = true; frame.classList.add('ready'); window.ARC_STARS.warp(false);
      $('hub').style.visibility = 'hidden';
      focusGame(); showTab();
    }, 450);
  }
  function frameKey(e) { if (e.code === 'Backquote' && !e.repeat) { e.preventDefault(); e.stopPropagation(); openPause(); } }
  function focusGame() { try { frame.focus(); frame.contentWindow.focus(); } catch (e) {} }
  function exitGame(fromPop) {
    if (mode === 'hub') return;
    closePauseUI(); clearTimeout(loadT);
    frame.onload = null; frame.src = 'about:blank'; frame.classList.remove('ready');
    $('stage').hidden = true; $('launch').hidden = true; $('hub').style.visibility = '';
    window.ARC_STARS.warp(false); mode = 'hub'; sfx('back'); waitRelease();
    if (!fromPop && location.hash) history.back();
    if (document.fullscreenElement && false) document.exitFullscreen();
    cur && setFilter(filter);
    const i = list.findIndex((g) => cur && g.id === cur.id); if (i >= 0) select(i, true, true);
    try { window.focus(); document.body.focus(); } catch (e) {}
  }

  /* ---------- in-game arcade menu ---------- */
  const PAUSE_ITEMS = [
    ['Resume', () => closePause()],
    ['Restart game', () => { closePause(); frame.contentWindow.location.reload(); frame.onload = () => { frame.onload = null; try { frame.contentWindow.addEventListener('keydown', frameKey, true); } catch (e) {} focusGame(); }; }],
    ['Full screen', () => { toggleFS(); closePause(); }],
    ['Sound: ', () => { window.ARC_SFX.setMuted(!window.ARC_SFX.muted); renderPause(); sndLabel(); }],
    ['Back to arcade', () => exitGame()],
  ];
  function openPause() {
    if (mode !== 'game') return;
    mode = 'pause'; pauseSel = 0; $('pName').textContent = cur.name; $('pause').hidden = false;
    try {
      const n = frame.contentWindow.navigator;
      savedPads = Object.getOwnPropertyDescriptor(n, 'getGamepads') || null;
      Object.defineProperty(n, 'getGamepads', { value: () => [], configurable: true, writable: true });
      frame.contentWindow.dispatchEvent(new Event('blur'));
    } catch (e) {}
    renderPause(); sfx('ok'); waitRelease();
    try { frame.blur(); window.focus(); } catch (e) {}
  }
  function closePauseUI() {
    if (mode === 'pause') mode = 'game';
    $('pause').hidden = true;
    try {
      const n = frame.contentWindow.navigator; delete n.getGamepads;
      if (savedPads) Object.defineProperty(n, 'getGamepads', savedPads); savedPads = null;
    } catch (e) {}
  }
  function closePause() { if (mode !== 'pause') return; closePauseUI(); sfx('back'); waitRelease(); focusGame(); showTab(); }
  function sndLabel() { PAUSE_ITEMS[3][0] = 'Sound: ' + (window.ARC_SFX.muted ? 'off' : 'on'); }
  function renderPause() {
    sndLabel(); const m = $('pMenu'); m.innerHTML = '';
    PAUSE_ITEMS.forEach((it, i) => {
      const b = document.createElement('button'); b.textContent = it[0]; b.className = i === pauseSel ? 'sel' : '';
      b.onmouseenter = () => { pauseSel = i; [...m.children].forEach((c, k) => c.classList.toggle('sel', k === i)); };
      b.onclick = () => it[1](); m.appendChild(b);
    });
  }
  function pauseMove(d) {
    pauseSel = (pauseSel + d + PAUSE_ITEMS.length) % PAUSE_ITEMS.length; sfx('move');
    [...$('pMenu').children].forEach((c, k) => c.classList.toggle('sel', k === pauseSel));
  }
  let tabT = 0;
  function showTab() { const t = $('tab'); t.classList.remove('fade'); clearTimeout(tabT); if (!touch) tabT = setTimeout(() => t.classList.add('fade'), 3000); }
  $('tab').onclick = openPause;
  addEventListener('pointermove', (e) => { if (mode === 'game' && e.clientY < 70) showTab(); });

  /* ---------- fullscreen ---------- */
  function toggleFS() {
    const d = document;
    if (d.fullscreenElement || d.webkitFullscreenElement) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { const e = d.documentElement; (e.requestFullscreen || e.webkitRequestFullscreen || (() => toast('Full screen not supported here'))).call(e); }
  }
  $('fsBtn').onclick = () => { sfx('ok'); toggleFS(); };
  if (!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen)) $('fsBtn').hidden = true;
  function muteChip() { $('muteBtn').classList.toggle('live', !window.ARC_SFX.muted); }
  $('muteBtn').onclick = () => { window.ARC_SFX.setMuted(!window.ARC_SFX.muted); muteChip(); sfx('ok'); };
  $('spPlay').onclick = () => list[sel] && launch(list[sel].id);

  /* ---------- keyboard ---------- */
  addEventListener('keydown', (e) => {
    window.ARC_SFX.unlock();
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (mode === 'pause') {
      if (k === 'ArrowUp' || k === 'w') pauseMove(-1); else if (k === 'ArrowDown' || k === 's') pauseMove(1);
      else if (k === 'Enter' || k === ' ') PAUSE_ITEMS[pauseSel][1]();
      else if (k === 'Escape' || e.code === 'Backquote') closePause(); else return;
      e.preventDefault(); return;
    }
    if (mode === 'game') { if (e.code === 'Backquote') { e.preventDefault(); openPause(); } return; }
    if (mode !== 'hub') return;
    const lk = k.toLowerCase();
    if (k === 'ArrowRight') move(1, 0); else if (k === 'ArrowLeft') move(-1, 0);
    else if (k === 'ArrowDown') move(0, 1); else if (k === 'ArrowUp') move(0, -1);
    else if (k === 'Enter' || k === ' ') { if (list[sel]) launch(list[sel].id); }
    else if (k === 'Tab' || k === ']' || lk === 'e' || k === 'PageDown') cycleTab(e.shiftKey ? -1 : 1);
    else if (k === '[' || lk === 'q' || k === 'PageUp') cycleTab(-1);
    else if (lk === 'f') toggleFav(); else if (lk === 'r') randomGame(); else if (lk === 'm') { $('muteBtn').click(); }
    else if (lk === 'g') toggleFS();
    else return;
    e.preventDefault();
  });

  /* ---------- gamepad ---------- */
  const rep = {}; let armed = true, holdT = 0, padActive = false, lastBtns = [];
  function waitRelease() { armed = false; }
  function anyHeld(p) { return p.buttons.some((b) => b.pressed) || Math.abs(p.axes[0] || 0) > .5 || Math.abs(p.axes[1] || 0) > .5; }
  function pollPads(now) {
    requestAnimationFrame(pollPads);
    const pads = (navigator.getGamepads ? navigator.getGamepads() : []) || [];
    let any = false; const down = {}, held = {};
    for (const p of pads) {
      if (!p || !p.connected) continue;
      any = true;
      const B = (i) => !!(p.buttons[i] && p.buttons[i].pressed), ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      const set = (n, v) => { if (v) held[n] = true; };
      set('up', B(12) || ay < -.55); set('down', B(13) || ay > .55); set('left', B(14) || ax < -.55); set('right', B(15) || ax > .55);
      set('a', B(0)); set('b', B(1)); set('x', B(2)); set('y', B(3)); set('lb', B(4)); set('rb', B(5)); set('sel', B(8)); set('start', B(9)); set('guide', B(16));
    }
    if (any !== padActive) { padActive = any; $('padChip').classList.toggle('live', any); if (any) toast('Controller connected'); }
    if (!any) { lastBtns = {}; return; }
    for (const n in held) { if (!lastBtns[n]) { down[n] = true; rep[n] = now + 380; } else if ((n === 'up' || n === 'down' || n === 'left' || n === 'right') && now > rep[n]) { down[n] = true; rep[n] = now + 115; } }
    lastBtns = held;
    if (!armed) { if (!Object.keys(held).length) armed = true; return; }
    if (Object.keys(down).length || Object.keys(held).length) window.ARC_SFX.unlock();

    if (mode === 'hub') {
      if (down.left) move(-1, 0); if (down.right) move(1, 0); if (down.up) move(0, -1); if (down.down) move(0, 1);
      if (down.a || down.start) { if (list[sel]) launch(list[sel].id); }
      if (down.lb) cycleTab(-1); if (down.rb) cycleTab(1); if (down.y) toggleFav(); if (down.x) randomGame();
    } else if (mode === 'pause') {
      if (down.up) pauseMove(-1); if (down.down) pauseMove(1);
      if (down.a) PAUSE_ITEMS[pauseSel][1](); if (down.b || down.start || down.guide) closePause();
    } else if (mode === 'game') {
      if (down.guide) { openPause(); return; }
      if (held.sel && held.start) { if (!holdT) holdT = now; if (now - holdT > 650) { holdT = 0; openPause(); } } else holdT = 0;
    }
  }
  addEventListener('gamepadconnected', () => window.ARC_SFX.unlock());

  /* ---------- history / deep links ---------- */
  addEventListener('popstate', () => {
    const id = location.hash.slice(1);
    if (!id && mode !== 'hub') exitGame(true);
    else if (id && byId[id] && mode === 'hub') launch(id, true);
  });
  addEventListener('visibilitychange', () => { if (document.hidden && mode === 'game') { /* games pause themselves on blur */ } });

  /* ---------- boot ---------- */
  muteChip();
  setFilter(GENRES.some((t) => t.id === filter) ? filter : 'all');
  const last = store.get('last', null), li = list.findIndex((g) => g.id === last); if (li >= 0) select(li, true, true);
  requestAnimationFrame(pollPads);
  const h = location.hash.slice(1);
  if (h && byId[h]) { history.replaceState(null, '', location.pathname); history.pushState({ g: h }, '', '#' + h); setTimeout(() => launch(h, true), 100); }
  else if (h) history.replaceState(null, '', location.pathname);
  window.ARCADE = { launch, exitGame, openPause, get mode() { return mode; } };
})();
