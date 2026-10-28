/* DOM menus: title, pause, settings, high scores, game over / initials entry. */
(function (G) {
  'use strict';
  const S = G.settings, A = G.audio, U = G.U;
  const $ = (id) => document.getElementById(id);
  const UI = { cur: 'title', back: 'title', lastIdx: -1 };
  const NAMES = ['title', 'pause', 'settings', 'scores', 'gameover'];

  UI.show = function (name) {
    NAMES.forEach((n) => $(n).classList.toggle('hidden', n !== name));
    UI.cur = name;
    document.body.classList.toggle('menu-open', !!name);
    if (name === 'scores') UI.renderScores();
    if (name === 'settings') UI.loadSettings();
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

  UI.renderScores = function () {
    const ol = $('scoreList');
    ol.innerHTML = '';
    G.scores.list.forEach((r, i) => {
      const li = document.createElement('li');
      if (i === UI.lastIdx) li.className = 'me';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = r.name;
      const sc = document.createElement('span'); sc.className = 'sc'; sc.textContent = U.fmt(r.score);
      const st = document.createElement('span'); st.className = 'st'; st.textContent = 'STAGE ' + (r.stage || 1);
      li.append(nm, sc, st);
      ol.appendChild(li);
    });
  };

  UI.showGameOver = function (score, level, victory) {
    $('goTitle').textContent = victory ? 'VICTORY!' : 'GAME OVER'; $('goTitle').className = victory ? 'win' : 'over';
    $('goScore').textContent = U.fmt(score);
    $('goStage').textContent = level;
    const q = G.scores.qualifies(score);
    $('goEntry').classList.toggle('hidden', !q);
    $('goButtons').classList.toggle('hidden', q);
    $('goName').value = G.scores.lastName || '';
    UI.pending = { score, level };
    UI.show('gameover');
  };



  UI.loadSettings = function () {
    $('setMaster').value = S.master; $('setMusic').value = S.music; $('setSfx').value = S.sfx;
    $('setBloom').checked = !!S.bloom; $('setShake').checked = !!S.shake; $('setReduced').checked = !!S.reduced;
  };
  function bindSettings() {
    const num = (id, key) => $(id).addEventListener('input', () => { S[key] = parseFloat($(id).value); S.save(); A.applyVolumes(); });
    const chk = (id, key) => $(id).addEventListener('change', () => { S[key] = $(id).checked; S.save(); });
    num('setMaster', 'master'); num('setMusic', 'music'); num('setSfx', 'sfx');
    chk('setBloom', 'bloom'); chk('setShake', 'shake'); chk('setReduced', 'reduced');
  }

  UI.init = function (M) {
    bindSettings();
    const click = (id, fn) => $(id).addEventListener('click', () => { A.resume(); A.sfx.select(); fn(); });
    click('btnStart', () => M.startGame());
    click('btnScores', () => { UI.back = 'title'; UI.show('scores'); });
    click('btnSettings', () => { UI.back = 'title'; UI.show('settings'); });
    click('btnResume', () => M.resume());
    click('btnPauseSettings', () => { UI.back = 'pause'; UI.show('settings'); });
    click('btnQuit', () => M.toTitle());
    click('btnSettingsBack', () => UI.show(UI.back || 'title'));
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
