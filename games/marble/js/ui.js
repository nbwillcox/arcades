/* DOM menus: title, race select, pause, settings, high scores, race complete, game over / initials entry. */
(function (G) {
  'use strict';
  const S = G.settings, A = G.audio, U = G.U, I = G.input;
  const $ = (id) => document.getElementById(id);
  const UI = { cur: 'title', back: 'title', lastIdx: -1 };
  const NAMES = ['title', 'select', 'pause', 'settings', 'scores', 'levelend', 'gameover'];

  UI.show = function (name) {
    NAMES.forEach((n) => $(n).classList.toggle('hidden', n !== name));
    UI.cur = name;
    document.body.classList.toggle('menu-open', !!name);
    $('recenter').classList.add('hidden');
    if (name === 'scores') UI.renderScores();
    if (name === 'settings') UI.loadSettings();
    if (name === 'select') UI.renderRaces();
    setTimeout(() => {
      const sec = $(name);
      if (!sec || sec.classList.contains('hidden')) return;
      const el = name === 'gameover' && !$('goEntry').classList.contains('hidden') ? $('goName') : sec.querySelector('button.primary') || sec.querySelector('button');
      if (el && !(window.TK && window.TK.on)) { el.focus(); if (el.select) el.select(); }
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
      const st = document.createElement('span'); st.className = 'st'; st.textContent = 'RACE ' + (r.stage || 1);
      li.append(nm, sc, st);
      ol.appendChild(li);
    });
  };

  UI.renderRaces = function () {
    const box = $('raceList'), un = G.scores.prog.unlocked;
    box.innerHTML = '';
    G.LEVELS.forEach((lv, i) => {
      const b = document.createElement('button'), ok = lv.id <= un;
      b.disabled = !ok; b.className = 'race' + (ok ? '' : ' locked');
      const best = G.scores.prog.best[lv.id];
      b.innerHTML = '<span class="rn">' + lv.id + '</span><span class="rt"><b>' + lv.name + '</b><i>' + lv.sub + '</i></span><span class="rb">' + (ok ? (best !== undefined ? 'BEST ' + best.toFixed(1) + 's left' : 'NEW') : 'LOCKED') + '</span>';
      b.style.setProperty('--rc', lv.theme.accent);
      b.addEventListener('click', () => { A.resume(); A.sfx.select(); UI.onPick(i); });
      box.appendChild(b);
    });
  };

  UI.showGameOver = function (score, level, victory) {
    $('goTitle').textContent = victory ? 'ALL RACES WON!' : 'GAME OVER'; $('goTitle').className = victory ? 'win' : 'over';
    $('goScore').textContent = U.fmt(score);
    $('goStage').textContent = level;
    const q = G.scores.qualifies(score);
    $('goEntry').classList.toggle('hidden', !q);
    $('goButtons').classList.toggle('hidden', q);
    $('goName').value = G.scores.lastName || '';
    UI.pending = { score, level };
    UI.show('gameover');
  };

  UI.showLevelEnd = function (r) {
    $('leTitle').textContent = r.last ? 'FINAL RACE COMPLETE' : 'RACE ' + r.id + ' COMPLETE';
    const row = (a, b, cls) => '<div class="row ' + (cls || '') + '"><span>' + a + '</span><b>' + b + '</b></div>';
    $('leStats').innerHTML = row(r.name, '') + row('Time left', r.timeLeft.toFixed(1) + ' s' + (r.best ? '  ★ BEST' : '')) + row('Time bonus', '+' + U.fmt(r.timeBonus)) + row('Pickups &amp; smashes', '+' + U.fmt(r.gems)) + row('Race bonus', '+' + U.fmt(r.raceBonus)) +
      row('Race score', U.fmt(r.total), 'tot') + (r.last ? '' : row('Bonus time carried over', '+' + r.carry + ' s')) + row('Marbles shattered', String(r.deaths));
    $('btnNext').textContent = r.last ? 'FINISH' : 'NEXT RACE';
    UI.show('levelend');
  };

  UI.loadSettings = function () {
    $('setMaster').value = S.master; $('setMusic').value = S.music; $('setSfx').value = S.sfx;
    $('setControl').value = S.control; $('setTilt').value = S.tiltSens; $('setInvert').checked = !!S.tiltInvert; $('setMouse').checked = !!S.mouseSteer; $('setTrail').checked = !!S.trail;
    $('setBloom').checked = !!S.bloom; $('setShake').checked = !!S.shake; $('setReduced').checked = !!S.reduced;
  };
  function bindSettings() {
    const num = (id, key) => $(id).addEventListener('input', () => { S[key] = parseFloat($(id).value); S.save(); A.applyVolumes(); });
    const chk = (id, key) => $(id).addEventListener('change', () => { S[key] = $(id).checked; S.save(); });
    num('setMaster', 'master'); num('setMusic', 'music'); num('setSfx', 'sfx'); num('setTilt', 'tiltSens');
    chk('setInvert', 'tiltInvert'); chk('setMouse', 'mouseSteer'); chk('setTrail', 'trail'); chk('setBloom', 'bloom'); chk('setShake', 'shake'); chk('setReduced', 'reduced');
    $('setControl').addEventListener('change', () => { S.control = $('setControl').value; S.save(); if (S.control !== 'stick') I.requestTilt(); });
  }

  UI.init = function (M) {
    bindSettings();
    const click = (id, fn) => $(id).addEventListener('click', () => { A.resume(); A.sfx.select(); fn(); });
    UI.onPick = (i) => M.startRace(i);
    click('btnStart', () => M.startRace(0));
    click('btnSelect', () => { UI.back = 'title'; UI.show('select'); });
    click('btnSelectBack', () => UI.show('title'));
    click('btnScores', () => { UI.back = 'title'; UI.show('scores'); });
    click('btnSettings', () => { UI.back = 'title'; UI.show('settings'); });
    click('btnResume', () => M.resume());
    click('btnRestart', () => M.restartRace());
    click('btnRecal', () => { I.calibrate(); M.resume(); });
    click('btnPauseSettings', () => { UI.back = 'pause'; UI.show('settings'); });
    click('btnQuit', () => M.toTitle());
    click('btnSettingsBack', () => UI.show(UI.back || 'title'));
    click('btnScoresPlay', () => M.startRace(0));
    click('btnScoresBack', () => UI.show('title'));
    click('btnNext', () => M.nextRace());
    click('btnReplay', () => M.replayRace());
    click('btnRetry', () => M.startRace(Math.max(0, (G.game.level ? G.game.level.id : 1) - 1)));
    click('btnGoTitle', () => M.toTitle());
    $('recenter').addEventListener('click', () => { I.calibrate(); A.sfx.select(); });
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
