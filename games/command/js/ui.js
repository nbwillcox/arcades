/* DOM menus: title, pause, settings, high scores, game over / initials entry. */
(function (G) {
  'use strict';
  const S = G.settings, A = G.audio, U = G.U;
  const $ = (id) => document.getElementById(id);
  const UI = { cur: 'title', back: 'title', lastIdx: -1 };
  const NAMES = ['title', 'pause', 'settings', 'scores', 'gameover', 'shop'];

  UI.show = function (name) {
    NAMES.forEach((n) => $(n).classList.toggle('hidden', n !== name));
    UI.cur = name;
    document.body.classList.toggle('menu-open', !!name);
    if (name === 'scores') UI.renderScores();
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

  UI.showGameOver = function (score, stage) {
    $('goScore').textContent = U.fmt(score);
    $('goStage').textContent = stage;
    const q = G.scores.qualifies(score);
    $('goEntry').classList.toggle('hidden', !q);
    $('goButtons').classList.toggle('hidden', q);
    $('goName').value = G.scores.lastName || '';
    UI.pending = { score, stage };
    UI.show('gameover');
  };

  /* ---------- between-wave upgrade shop ---------- */
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const UNLOCKS = ['cluster', 'flak', 'laser', 'nuke', 'shield', 'auto'];
  UI.showShop = function (g) { UI.shopGame = g; UI.renderShop(); UI.show('shop'); };
  function rebuildBtn(g, label, cost, fn) {
    const b = el('button', 'card rebuild', label + '  ' + cost);
    if (g.credits < cost) b.classList.add('poor');
    b.addEventListener('click', () => { if (fn()) A.sfx.buy(); else A.sfx.deny(); UI.renderShop(); });
    return b;
  }
  UI.renderShop = function () {
    const g = UI.shopGame, Up = G.up;
    $('shopCredits').textContent = U.fmt(g.credits);
    $('shopWave').textContent = 'Wave ' + g.stage + ' defended. Next: wave ' + (g.stage + 1) + (((g.stage + 1) % G.C.BOSS_EVERY) === 0 ? ' (BOSS)' : '');
    const grid = $('shopGrid');
    grid.innerHTML = '';
    for (const d of Up.DEFS) {
      const lv = g.up[d.id], cost = Up.cost(g, d.id), card = el('button', 'card');
      if (cost === null) card.classList.add('maxed'); else if (g.credits < cost) card.classList.add('poor');
      const pips = el('span', 'pips');
      for (let i = 0; i < d.max; i++) pips.appendChild(el('i', i < lv ? 'on' : ''));
      const verb = lv === 0 && UNLOCKS.indexOf(d.id) >= 0 ? 'UNLOCK  ' : 'UPGRADE  ';
      card.append(el('span', 'cname', d.name), el('span', 'cdesc', d.desc), pips, el('span', 'cprice', cost === null ? 'MAX' : verb + cost));
      card.addEventListener('click', () => { if (Up.buy(g, d.id)) A.sfx.buy(); else A.sfx.deny(); UI.renderShop(); });
      grid.appendChild(card);
    }
    const rb = $('shopRebuild');
    rb.innerHTML = '';
    g.cities.forEach((c, i) => { if (!c.alive) rb.appendChild(rebuildBtn(g, 'REBUILD CITY ' + (i + 1), G.C.REBUILD_CITY, () => g.rebuild('city', i))); });
    g.launchers.forEach((l, i) => { if (!l.alive) rb.appendChild(rebuildBtn(g, 'REBUILD LAUNCHER ' + (i + 1), G.C.REBUILD_LAUNCHER, () => g.rebuild('launcher', i))); });
    $('shopRebuildWrap').classList.toggle('hidden', !rb.children.length);
    $('btnNextWave').textContent = 'START WAVE ' + (g.stage + 1);
  };

  function saveScore() {
    if (!UI.pending) return;
    const name = ($('goName').value || 'AAA').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'AAA';
    UI.lastIdx = G.scores.add(name, UI.pending.score, UI.pending.stage);
    UI.pending = null;
    A.sfx.select();
    UI.back = 'title';
    UI.show('scores');
  }

  function bind() {
    const on = (id, fn) => $(id).addEventListener('click', () => { A.resume(); A.sfx.select(); fn(); });
    on('btnStart', () => G.main.startGame());
    on('btnScores', () => { UI.back = 'title'; UI.lastIdx = -1; UI.show('scores'); });
    on('btnSettings', () => { UI.back = 'title'; UI.show('settings'); });
    on('btnResume', () => G.main.resume());
    on('btnPauseSettings', () => { UI.back = 'pause'; UI.show('settings'); });
    on('btnQuit', () => G.main.toTitle());
    on('btnSettingsBack', () => UI.show(UI.back));
    on('btnScoresPlay', () => G.main.startGame());
    on('btnScoresBack', () => G.main.toTitle());
    on('btnRetry', () => G.main.startGame());
    on('btnGoTitle', () => G.main.toTitle());
    on('btnSaveScore', saveScore);
    $('btnNextWave').addEventListener('click', () => { A.resume(); A.sfx.select(); G.main.nextWave(); });
    $('goName').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3); });
    $('goName').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); saveScore(); } });

    const sliders = { setMaster: 'master', setMusic: 'music', setSfx: 'sfx' };
    for (const id in sliders) {
      $(id).value = S[sliders[id]];
      $(id).addEventListener('input', (e) => { S[sliders[id]] = parseFloat(e.target.value); S.save(); A.applyVolumes(); });
      $(id).addEventListener('change', () => A.sfx.blip());
    }
    const checks = { setBloom: 'bloom', setShake: 'shake', setReduced: 'reduced' };
    for (const id in checks) {
      $(id).checked = !!S[checks[id]];
      $(id).addEventListener('change', (e) => { S[checks[id]] = e.target.checked; S.save(); A.sfx.blip(); });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (UI.cur === 'settings') UI.show(UI.back);
      else if (UI.cur === 'scores') G.main.toTitle();
    });
    document.addEventListener('pointerdown', () => A.resume(), { passive: true });
    document.addEventListener('keydown', () => A.resume());
  }

  G.ui = UI;
  bind();
})((window.SGS = window.SGS || {}));
