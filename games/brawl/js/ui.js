/* DOM menus: title, pause, settings, high scores, game over / initials entry. */
(function (G) {
  'use strict';
  const S = G.settings, A = G.audio, U = G.U;
  const $ = (id) => document.getElementById(id);
  const UI = { cur: 'title', back: 'title', lastIdx: -1 };
  const NAMES = ['title', 'pause', 'settings', 'controls', 'scores', 'gameover'];
  const ACTIONS = [['left', 'Move left'], ['right', 'Move right'], ['up', 'Move up'], ['down', 'Move down'], ['punch', 'Punch'], ['kick', 'Kick'], ['jump', 'Jump'], ['pause', 'Pause']];
  const NICE = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'SPACE', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Enter: 'ENTER', Backspace: 'BACKSPACE' };
  const RESERVED = { Escape: 1, Tab: 1, MetaLeft: 1, MetaRight: 1, ContextMenu: 1, F5: 1, F11: 1, F12: 1 };
  UI.keyName = function (c) {
    if (NICE[c]) return NICE[c];
    if (c === 'Mouse0') return 'LEFT CLICK';
    if (c === 'Mouse1') return 'MIDDLE CLICK';
    if (c === 'Mouse2') return 'RIGHT CLICK';
    if (/^Mouse/.test(c)) return 'MOUSE ' + c.slice(5);
    if (/^Key/.test(c)) return c.slice(3);
    if (/^Digit/.test(c)) return c.slice(5);
    if (/^Numpad/.test(c)) return 'NUM ' + c.slice(6).toUpperCase();
    return c.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
  };
  UI.updateHints = function () {
    const k = S.keys, n = UI.keyName;
    $('titleHint').innerHTML = '<b>' + n(k.left) + ' ' + n(k.right) + ' ' + n(k.up) + ' ' + n(k.down) + '</b>: move &nbsp; <b>' + n(k.punch) + '</b>: punch &nbsp; <b>' + n(k.kick) + '</b>: kick &nbsp; <b>' + n(k.jump) + '</b>: jump (then punch or kick in the air) &nbsp; walk into a stunned enemy to grab him &nbsp; <b>' + n(k.pause) + '</b> / <b>Esc</b>: pause';
  };
  const PAD_ACTIONS = [['punch', 'Punch'], ['kick', 'Kick'], ['jump', 'Jump'], ['pause', 'Pause']];
  const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L-STICK', 'R-STICK'];
  UI.padName = (i) => PAD_NAMES[i] || 'BUTTON ' + i;
  UI.renderKeys = function () {
    const ul = $('keyList'); ul.innerHTML = '';
    for (const [a, label] of ACTIONS) {
      const li = document.createElement('li'), nm = document.createElement('span'), b = document.createElement('button');
      nm.textContent = label; b.textContent = UI.keyName(S.keys[a]); b.dataset.action = a;
      b.addEventListener('click', () => UI.listen(a, b));
      li.append(nm, b); ul.appendChild(li);
    }
    const hd = document.createElement('li'); hd.className = 'sep'; hd.textContent = 'Gamepad (d-pad / left stick always move)'; ul.appendChild(hd);
    for (const [a, label] of PAD_ACTIONS) {
      const li = document.createElement('li'), nm = document.createElement('span'), b = document.createElement('button');
      nm.textContent = label; b.textContent = UI.padName(S.pad[a]); b.dataset.pad = a;
      b.addEventListener('click', () => UI.listenPad(a, b));
      li.append(nm, b); ul.appendChild(li);
    }
  };
  /* press a gamepad button to bind it; any keyboard key or click cancels. The d-pad buttons are reserved for movement. */
  UI.listenPad = function (action, btn) {
    A.resume(); A.sfx.select();
    UI.renderKeys();
    const b2 = $('keyList').querySelector('[data-pad="' + action + '"]'); b2.classList.add('listening'); b2.textContent = 'PRESS A BUTTON...';
    G.input.capture = () => { G.input.capture = null; G.input.padCapture = null; UI.renderKeys(); };
    G.input.padCapture = (i) => {
      G.input.capture = null;
      if (i >= 12 && i <= 15) { UI.renderKeys(); const bb = $('keyList').querySelector('[data-pad="' + action + '"]'); bb.classList.add('clash'); bb.textContent = 'D-PAD IS MOVE'; setTimeout(UI.renderKeys, 900); return; }
      for (const a in S.pad) if (a !== action && S.pad[a] === i) S.pad[a] = S.pad[action];
      S.pad[action] = i; S.save(); UI.renderKeys(); A.sfx.pickup();
    };
  };
  /* click an action, press a key: the key is swapped with whichever action had it so nothing is ever left unbound */
  UI.listen = function (action, btn) {
    A.resume(); A.sfx.select();
    const old = G.input.capture; if (old) G.input.capture = null;
    for (const b of $('keyList').querySelectorAll('button')) { b.classList.remove('listening', 'clash'); b.textContent = UI.keyName(S.keys[b.dataset.action]); }
    btn.classList.add('listening'); btn.textContent = 'PRESS A KEY...';
    G.input.capture = (code) => {
      G.input.capture = null;
      if (code === 'Escape') { UI.renderKeys(); return; }
      if (RESERVED[code]) { UI.renderKeys(); const bb = $('keyList').querySelector('[data-action="' + action + '"]'); bb.classList.add('clash'); bb.textContent = 'NOT ALLOWED'; setTimeout(UI.renderKeys, 900); return; }
      for (const a in S.keys) if (a !== action && S.keys[a] === code) S.keys[a] = S.keys[action];
      S.keys[action] = code; S.save(); G.input.rebuild(); UI.renderKeys(); UI.updateHints(); A.sfx.pickup();
    };
  };

  UI.show = function (name) {
    NAMES.forEach((n) => $(n).classList.toggle('hidden', n !== name));
    UI.cur = name;
    document.body.classList.toggle('menu-open', !!name);
    if (name === 'scores') UI.renderScores();
    if (name === 'settings') UI.loadSettings();
    if (name === 'controls') UI.renderKeys();
    if (G.input.capture) G.input.capture = null;
    G.input.padCapture = null;
    setTimeout(() => {
      const sec = $(name);
      if (!sec || sec.classList.contains('hidden')) return;
      const el = name === 'gameover' && !$('goEntry').classList.contains('hidden') ? $('goName') : sec.querySelector('button.primary') || sec.querySelector('button');
      if (el) { el.focus(); if (el.select) el.select(); }
    }, 0);
  };
  UI.hideAll = function () {
    NAMES.forEach((n) => $(n).classList.add('hidden'));
    UI.cur = null;
    document.body.classList.remove('menu-open');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };
  UI.isOpen = () => UI.cur !== null;
  /* menu navigation with the keyboard (up / down) and a gamepad (d-pad + A, see input.js) */
  UI.nav = function (d) {
    const sec = UI.cur && $(UI.cur); if (!sec) return;
    const els = [...sec.querySelectorAll('button:not(:disabled), input')].filter((el) => el.offsetParent !== null);
    if (!els.length) return;
    let i = els.indexOf(document.activeElement); i = i < 0 ? 0 : (i + d + els.length) % els.length;
    els[i].focus(); if (A.sfx.tick) A.sfx.tick();
  };
  UI.navKey = function (code) {
    if (!UI.isOpen() || G.input.capture || G.input.padCapture) return false;
    if (code === 'ArrowDown' || code === 'ArrowUp') { UI.nav(code === 'ArrowDown' ? 1 : -1); return true; }
    return false;
  };
  UI.padPress = function (which) {
    if (which === 'a') { const el = document.activeElement; if (el && el.tagName === 'BUTTON') el.click(); }
    else UI.nav(which === 'down' ? 1 : -1);
  };

  UI.renderScores = function () {
    const ol = $('scoreList');
    ol.innerHTML = '';
    G.scores.list.forEach((r, i) => {
      const li = document.createElement('li');
      if (i === UI.lastIdx) li.className = 'me';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
      const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = U.fmt(r.score);
      const st = document.createElement('span'); st.className = 'st'; st.textContent = 'LEVEL ' + (r.stage || 1);
      li.append(nm, sc, st);
      ol.appendChild(li);
    });
  };

  UI.showGameOver = function (score, level, victory) {
    $('goTitle').textContent = victory ? 'YOU WIN!' : 'GAME OVER';
    $('goSub').textContent = victory ? 'The Kingpin is down and the streets are quiet again.' : ''; $('goTitle').className = victory ? 'win' : 'over';
    $('goScore').textContent = U.fmt(score);
    $('goStage').textContent = level;
    const q = G.scores.qualifies(score);
    $('goEntry').classList.toggle('hidden', !q);
    $('goButtons').classList.toggle('hidden', q);
    $('goName').value = G.scores.lastName || '';
    UI.pending = { score, level };
    if (G.main && G.main.tableau) G.main.tableau(!!victory);
    UI.show('gameover');
  };



  UI.loadSettings = function () {
    $('setMaster').value = S.master; $('setMusic').value = S.music; $('setSfx').value = S.sfx;
    $('setShake').checked = !!S.shake; $('setHitstop').checked = !!S.hitstop;
  };
  function bindSettings() {
    const num = (id, key) => $(id).addEventListener('input', () => { S[key] = parseFloat($(id).value); S.save(); A.applyVolumes(); });
    const chk = (id, key) => $(id).addEventListener('change', () => { S[key] = $(id).checked; S.save(); });
    num('setMaster', 'master'); num('setMusic', 'music'); num('setSfx', 'sfx');
    chk('setShake', 'shake'); chk('setHitstop', 'hitstop');
  }

  UI.init = function (M) {
    bindSettings();
    UI.updateHints();
    const click = (id, fn) => $(id).addEventListener('click', () => { A.resume(); A.sfx.select(); fn(); });
    click('btnStart', () => M.startGame());
    click('btnScores', () => { UI.back = 'title'; UI.show('scores'); });
    click('btnSettings', () => { UI.back = 'title'; UI.show('settings'); });
    click('btnResume', () => M.resume());
    click('btnPauseSettings', () => { UI.back = 'pause'; UI.show('settings'); });
    click('btnQuit', () => M.toTitle());
    click('btnSettingsBack', () => UI.show(UI.back || 'title'));
    click('btnControls', () => { UI.ctlBack = 'settings'; UI.show('controls'); });
    click('btnPauseControls', () => { UI.back = 'pause'; UI.ctlBack = 'pause'; UI.show('controls'); });
    click('btnKeysBack', () => UI.show(UI.ctlBack || 'settings'));
    click('btnKeysReset', () => { S.keys = Object.assign({}, G.C.KEYS); S.pad = Object.assign({}, G.C.PAD); S.save(); G.input.rebuild(); UI.renderKeys(); UI.updateHints(); });
    click('btnScoresPlay', () => M.startGame());
    click('btnScoresBack', () => UI.show('title'));
    click('btnRetry', () => M.startGame());
    click('btnGoTitle', () => M.toTitle());
    const save = () => {
      const p = UI.pending || { score: 0, level: 1 };
      UI.lastIdx = G.scores.add($('goName').value, p.score, p.level);
      UI.show('scores'); UI.back = 'title';
    };
    click('btnSaveScore', save);
    $('goName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } e.stopPropagation(); });
    $('goName').addEventListener('input', () => { $('goName').value = $('goName').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  };

  G.ui = UI;
})((window.SGS = window.SGS || {}));
