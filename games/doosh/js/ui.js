/* STICK DOOSH - ui.js (owner: ui)
   SGS.UI: comic-book DOM screens (title, level select, VS splash, shop, settings, pause, results, how-to, credits, toast).
   No DOM access at load time; everything happens in UI.init(). All calls into other modules are guarded.

   Core integration (see DESIGN §13):
     boot:      UI.init()  -> shows the title (skipped when the URL has ?level=)
     level:     UI picks a level -> VS splash 2 s -> SGS.Game.start(themeId)   (UI hides its screens first)
     pausing:   core calls SGS.Game.pause() -> UI.onPause()  (UI owns un-pausing: Esc/P/Start/B or Resume button
                -> SGS.Game.resume() fires on key/button RELEASE so the core never sees a fresh pause press)
     boss:      UI.onBossIntro(bossDefOrThemeId, cb) -> ~2 s comic VS overlay -> cb()
     results:   UI.onLevelClear(result) / UI.onLevelFail(result); result = {theme,time,kills,gold,rescues,bossBeaten,newSuper,firstClear}
                (core has ALREADY banked gold / beaten / best in SGS.Save; for a fail `gold` = the amount actually kept)
     UI.isOpen() -> true while any menu is up (core can ignore gameplay input then)
*/
(function () {
  'use strict';
  const S = (window.SGS = window.SGS || {});

  // ------------------------------------------------------------------ static data (DESIGN §6)
  const ORDER = ['ice', 'fire', 'wind', 'water', 'mud', 'jungle', 'mountain', 'plains', 'fantasy', 'moon', 'retro', 'fortress'];
  const MAIN = ORDER.slice(0, 11);
  const INFO = {
    ice:      { name: 'Brrr-zerker Glacier', boss: 'Frosty McChillface', title: 'Yeti. Snowmobile. Tiny Scarf.', c: '#7fdcff', d: '#1d5f9e', sup: 'freeze', weak: 'napalm' },
    fire:     { name: 'Mount Ka-Blammo', boss: 'Captain Combustion', title: 'A Fireman Who Is ON FIRE', c: '#ff7a2e', d: '#9e1d1d', sup: 'napalm', weak: 'tidal' },
    wind:     { name: 'Gustbuster Skyway', boss: 'Gustav Blowhard', title: 'Lungs Of Steel, Head Of Air', c: '#9ff0d0', d: '#2e8f9e', sup: 'tornado', weak: 'boulder' },
    water:    { name: 'Soggy Bottom Docks', boss: 'Admiral Soggybottom', title: 'Terror Of The Seven Bathtubs', c: '#3fa0ff', d: '#123a8f', sup: 'tidal', weak: 'gravity' },
    mud:      { name: 'Sludge Bog', boss: 'Sir Sludgington', title: 'A Gentleman Of Pure Filth', c: '#b07a43', d: '#3e2a14', sup: 'mudbomb', weak: 'tornado' },
    jungle:   { name: 'Bananarama Temple', boss: 'Chimpanzilla', title: 'Big. Hairy. Tank Top.', c: '#4cd964', d: '#14632a', sup: 'banana', weak: 'mudbomb' },
    mountain: { name: 'Mount Doosh-more', boss: 'Billy the Kidd', title: 'Goat King With A Jetpack', c: '#c9bfb2', d: '#5b5048', sup: 'boulder', weak: 'cow' },
    plains:   { name: 'Cornfed Plains', boss: 'Colonel Cornhusk', title: 'Scarecrow. Combine. Grudge.', c: '#ffd84a', d: '#9e6a12', sup: 'cow', weak: 'freeze' },
    fantasy:  { name: 'Castle Wizzlebeard', boss: 'Wizard Wizzlebeard', title: 'Beard Of Infinite Length', c: '#c08cff', d: '#4a1a8f', sup: 'magic', weak: 'banana' },
    moon:     { name: 'Moon Base Bonkers', boss: 'Emperor Zorp', title: 'Tiny UFO, Enormous Ego', c: '#8f96d8', d: '#1e2150', sup: 'gravity', weak: 'pixel' },
    retro:    { name: '8-Bit Bonanza', boss: 'GL1TCH.EXE', title: 'PRESS START TO DIE', c: '#ff6ae0', d: '#3a0f6e', sup: 'pixel', weak: 'magic' },
    fortress: { name: 'DOOSH FORTRESS', boss: 'General Doom-Doosh', title: 'Your Evil Twin (Goatee Edition)', c: '#ff4655', d: '#3b0710', sup: null, weak: 'doosh' }
  };
  const SUPERS = {
    freeze: ['Freeze Grenade', 'ice'], napalm: ['Napalm Strike', 'fire'], tornado: ['Tornado', 'wind'], tidal: ['Tidal Wave', 'water'],
    mudbomb: ['Mud Bomb', 'mud'], banana: ['Banana Boomerang', 'jungle'], boulder: ['Boulder', 'mountain'], cow: ['Cow Launcher', 'plains'],
    magic: ['Magic Missiles', 'fantasy'], gravity: ['Gravity Bomb', 'moon'], pixel: ['Pixel Bomb', 'retro'], doosh: ['The Shotgun (DOOSH)', null]
  };
  const ACTIONS = [['left', 'Move Left'], ['right', 'Move Right'], ['up', 'Aim Up / Climb'], ['down', 'Aim Down / Drop'], ['jump', 'Jump'],
    ['fire', 'Fire'], ['special', 'Special'], ['melee', 'Melee'], ['cycle', 'Cycle Super'], ['pause', 'Pause']];
  const PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L-STICK', 'R-STICK', 'D-UP', 'D-DOWN', 'D-LEFT', 'D-RIGHT', 'HOME'];
  const CHEATS = {
    DOOSHFOREVER: ['infLives', 'INFINITE LIVES'], BIGHEADS: ['bigHeads', 'BIG HEADS'], MOONWALK: ['moon', 'MOON GRAVITY EVERYWHERE'],
    GIBLETS: ['gore', 'MAXIMUM GIBLETS'], PEWPEWPEW: ['pew', 'EVERYBODY GETS DUAL PISTOLS']
  };
  const DEF_SETTINGS = {
    audio: { master: 0.8, music: 0.7, sfx: 0.9, voice: 0.9, background: false, cursing: 'bleep', chatter: 'some', bubbles: true },
    video: { shake: 'full', reduceFlash: false, gore: 'on', wordSize: 1, quality: 'auto', fps: false },
    input: { mouseLock: true, keys: {}, pad: {}, deadzone: 0.25, vibrate: true, touch: { size: 1, opacity: 0.55, leftHanded: false, stick: 'floating', aimStick: true, aimFire: true },
      // aim: 360-degree aiming (mirrors save.js)
      aim: 'auto', aimAssist: 'low', aimAssistMouse: false, aimDead: 0.2, aimSens: 1, mouseSens: 1, padAimFire: false, kbTwin: false, wheelCycle: true, cross: { size: 1, style: 'comic', color: 'weapon' } },
    game: { difficulty: 'normal', autofire: true }
  };
  const QUIPS = ['No refunds. No questions. No pants.', 'Everything here is legal in at least one country.', 'Buy something or get DOOSHED.',
    'Ooh, shiny gold! Gimme.', 'Upgrades! Get yer upgrades! Slightly used!', 'I also sell hats. Mostly hats.', 'Credit? HA. HAHAHA. No.'];
  const SOLD = ['KA-CHING!', 'SOLD!', 'DOOSHED IT!', 'CHA-CHING!', 'BOUGHT IT!'];
  const KONAMI = ['u', 'u', 'd', 'd', 'l', 'r', 'l', 'r', 'b', 'a'];
  const IDS = { title: 'title', select: 'select', vs: 'vs', shop: 'shop', settings: 'settings', pause: 'pause', results: 'results',
    howto: 'howto', credits: 'credits', loadout: 'loadout', confirm: 'sd-confirm', capture: 'sd-capture' };
  const BASE = ['title', 'select', 'vs', 'shop', 'results', 'howto', 'credits'];
  const MODAL = ['confirm', 'capture']; // drawn on top of the screen below (which stays visible)

  // ------------------------------------------------------------------ state
  const UI = {};
  let built = false, stack = [], gameRunning = false, lastTheme = null;
  const lastKey = {};
  let shopCat = 'vitals', shopFrom = 'select', setTab = 'controls', ctlSub = 'kb';
  let vsTimer = 0, vsShownAt = 0, vsDone = null;
  let resultCount = null, pauseShownAt = 0, pendingResume = null, capturing = null, confirmOpts = null;
  let keyActAt = 0, seq = [], lastKonami = 0, swallowConfirmUntil = 0;
  let padPrev = {}, padLatch = false, padDir = null, padNext = 0, rotateOn = false, toastBox = null, rotateEl = null;
  let titleGold = null, titleBadges = null;

  // ------------------------------------------------------------------ helpers
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function ensure(id) { let e = document.getElementById(id); if (!e) { e = el('div'); e.id = id; document.body.appendChild(e); } return e; }
  function node(name) { return ensure(IDS[name] || name); }
  function now() { return (window.performance && performance.now()) || Date.now(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function fmtNum(n) { n = Math.round(Number(n) || 0); return n.toLocaleString ? n.toLocaleString('en-US') : String(n); }
  function fmtTime(sec) { sec = Math.max(0, Math.round(Number(sec) || 0)); const m = Math.floor(sec / 60), s = sec % 60; return m + ':' + (s < 10 ? '0' : '') + s; }
  function pct(v) { return Math.round(v * 100) + '%'; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function sfx(name, o) { try { if (S.Audio && S.Audio.sfx) S.Audio.sfx(name, o || {}); } catch (e) { /* ignore */ } }
  function music(id) {
    try { if (S.Music && S.Music.play && S.Music.current !== id) S.Music.play(id, { fade: 0.6 }); } catch (e) { /* ignore */ }
  }
  function save() { try { if (S.Save && S.Save.save) S.Save.save(); } catch (e) { /* ignore */ } }
  let memData = null;
  function D() {
    if (S.Save && S.Save.data) return S.Save.data;
    if (!memData) memData = { v: 1, gold: 0, upgrades: {}, beaten: {}, best: {}, cheats: {}, stats: {}, settings: clone(DEF_SETTINGS) };
    return memData;
  }
  function sub(obj, key) { if (!obj[key] || typeof obj[key] !== 'object') obj[key] = {}; return obj[key]; }
  function settings() { const d = D(); if (!d.settings || typeof d.settings !== 'object') d.settings = clone(DEF_SETTINGS); return d.settings; }
  function getS(path) {
    const parts = path.split('.'); let o = settings(), dflt = DEF_SETTINGS;
    for (const p of parts) { o = (o && typeof o === 'object') ? o[p] : undefined; dflt = (dflt && typeof dflt === 'object') ? dflt[p] : undefined; }
    return o === undefined ? dflt : o;
  }
  function setS(path, v, noSave) {
    const parts = path.split('.'); let o = settings();
    for (let i = 0; i < parts.length - 1; i++) o = sub(o, parts[i]);
    o[parts[parts.length - 1]] = v;
    if (!noSave) save();
    applySetting(path, v);
  }
  function applySetting(path, v) {
    try {
      if (path.indexOf('audio.') === 0 && S.Audio && S.Audio.setVolumes) S.Audio.setVolumes();
      if (path === 'video.reduceFlash') document.body.classList.toggle('sd-calm', !!v);
      window.dispatchEvent(new CustomEvent('sgs:settings', { detail: { path, value: v } }));
    } catch (e) { /* ignore */ }
  }
  function cheats() { return sub(D(), 'cheats'); }
  function beaten(id) { return !!sub(D(), 'beaten')[id]; }
  function beatenCount() { let n = 0; for (const t of MAIN) if (beaten(t)) n++; return n; }
  function fortressOpen() { return beatenCount() >= MAIN.length; }
  function gold() { return Math.floor(Number(D().gold) || 0); }
  function isTouch() {
    if (S.Main && S.Main.device && typeof S.Main.device.touch === 'boolean') return S.Main.device.touch;
    if (/[?&]touch=1/.test(location.search)) return true;
    return ('ontouchstart' in window) || ((navigator.maxTouchPoints || 0) > 0 && window.matchMedia && matchMedia('(pointer: coarse)').matches);
  }
  function info(id) {
    const f = INFO[id] || { name: String(id), boss: '???', title: '', c: '#ccc', d: '#555', sup: null, weak: null };
    const bd = S.BossDefs && S.BossDefs[id], th = S.Themes && S.Themes[id];
    let intro = '';
    if (bd && bd.intro) intro = typeof bd.intro === 'string' ? bd.intro : (bd.intro.taunt || bd.intro.line || bd.intro.text || '');
    return {
      id, name: (th && th.name) || f.name, boss: (bd && bd.name) || f.boss, title: (bd && bd.title) || f.title, c: f.c, d: f.d,
      sup: (bd && bd.super) || f.sup, weak: (bd && bd.weakTo) || f.weak, intro: typeof intro === 'string' ? intro : ''
    };
  }
  function superName(id) {
    if (!id) return '';
    if (S.Supers && S.Supers[id] && S.Supers[id].name) return S.Supers[id].name;
    if (SUPERS[id]) return SUPERS[id][0];
    return String(id);
  }
  function superOwned(id) { const s = SUPERS[id]; return !!(s && s[1] && beaten(s[1])); }
  function keyName(code) {
    if (code == null || code === '' || code === -1) return '---';
    if (S.Input && S.Input.keyName) { try { const n = S.Input.keyName(code); if (n) return String(n).toUpperCase(); } catch (e) { /* ignore */ } }
    code = String(code);
    const map = { ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', ArrowUp: 'UP', ArrowDown: 'DOWN', Space: 'SPACE', Escape: 'ESC', Enter: 'ENTER',
      ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT',
      Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=',
      Backquote: '`', Tab: 'TAB', Backspace: 'BKSP', Mouse0: 'L-CLICK', Mouse1: 'M-CLICK', Mouse2: 'R-CLICK' };
    if (map[code]) return map[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad/.test(code)) return 'NUM ' + code.slice(6).toUpperCase();
    return code.toUpperCase();
  }
  function padName(b) {
    if (b == null || b === '' || b < 0) return '---';
    if (S.Input && S.Input.padName) { try { const n = S.Input.padName(b); if (n) return String(n).toUpperCase(); } catch (e) { /* ignore */ } }
    return PAD_NAMES[b] || ('BTN ' + b);
  }
  function binds(kind, action) {
    const cfg = sub(sub(settings(), 'input'), kind === 'pad' ? 'pad' : 'keys');
    let a = cfg[action];
    if (!Array.isArray(a)) {
      const dfl = S.Input && S.Input.defaults && S.Input.defaults[kind === 'pad' ? 'pad' : 'keys'];
      a = (dfl && Array.isArray(dfl[action])) ? dfl[action] : [];
    }
    return a;
  }
  function bindLabel(kind, action) {
    const a = binds(kind, action).filter(v => v != null && v !== '' && v !== -1);
    return a.length ? a.map(kind === 'pad' ? padName : keyName).join(' / ') : '---';
  }
  function keyChip(text) { return '<span class="sd-key">' + esc(text) + '</span>'; }

  // ------------------------------------------------------------------ buttons + focus
  function btn(label, cls, fn, k) {
    const b = el('button', 'sd-btn' + (cls ? ' ' + cls : ''));
    b.type = 'button';
    if (label && label.nodeType) b.appendChild(label); else b.textContent = label;
    if (k) b.dataset.k = k;
    b.addEventListener('click', (e) => {
      if (e.isTrusted && e.detail === 0 && now() - keyActAt < 500) { e.preventDefault(); return; } // native repeat of a key activation
      if (fn) fn(e, b);
    });
    return b;
  }
  function screenEl(name) { return name ? node(name) : null; }
  function top() { return stack[stack.length - 1] || null; }
  function visible(e) { return !!(e && e.getClientRects().length && !e.disabled && !e.closest('[hidden]')); }
  function focusables(root) {
    if (!root) return [];
    return Array.prototype.filter.call(root.querySelectorAll('button, input, [data-nav]'), visible);
  }
  function focusEl(e) {
    if (!e) return;
    try { e.focus({ preventScroll: true }); } catch (x) { e.focus(); }
    try { e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (x) { /* ignore */ }
  }
  function focusFirst(name) {
    const root = screenEl(name); if (!root) return;
    const list = focusables(root); if (!list.length) return;
    const k = lastKey[name];
    const want = (k && root.querySelector('[data-k="' + k + '"]')) || root.querySelector('[data-autofocus]') || list[0];
    focusEl(visible(want) ? want : list[0]);
  }
  function rememberFocus(name) {
    const a = document.activeElement, root = screenEl(name);
    if (a && root && root.contains(a) && a.dataset && a.dataset.k) lastKey[name] = a.dataset.k;
  }
  function nav(dx, dy) {
    const root = screenEl(top()); if (!root) return;
    const list = focusables(root); if (!list.length) return;
    const a = document.activeElement;
    if (!a || !root.contains(a) || list.indexOf(a) < 0) { focusFirst(top()); return; }
    const r0 = a.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let best = null, bc = Infinity, far = null, fc = -Infinity;
    for (const b of list) {
      if (b === a) continue;
      const r = b.getBoundingClientRect(), vx = r.left + r.width / 2 - cx, vy = r.top + r.height / 2 - cy;
      const along = vx * dx + vy * dy, perp = Math.abs(vx * dy - vy * dx);
      if (along > 4) { const c = along + perp * 2.4; if (c < bc) { bc = c; best = b; } }
      else if (along < -4) { const c = -along - perp * 3; if (c > fc) { fc = c; far = b; } }
    }
    const tgt = best || far; // wrap around when nothing lies in that direction
    if (tgt) { focusEl(tgt); sfx('menu_move', { vol: 0.35 }); }
  }
  function activate(e) {
    if (!e) return;
    if (e.tagName === 'INPUT') { if (e.type === 'text') e.focus(); return; }
    keyActAt = now();
    e.click();
  }
  function adjustRange(inp, dir) {
    const step = Number(inp.step) || 0.05, min = Number(inp.min), max = Number(inp.max);
    const v = Math.min(max, Math.max(min, Math.round((Number(inp.value) + dir * step) / step) * step));
    inp.value = String(Math.round(v * 1000) / 1000);
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ------------------------------------------------------------------ screen stack
  function showEl(name) { const e = node(name); e.hidden = false; e.style.display = 'flex'; }
  function hideEl(name) { const e = node(name); e.hidden = true; e.style.display = 'none'; }
  function show(name, opts) {
    if (!built) UI.init();
    if (!IDS[name]) name = String(name);
    opts = opts || {};
    const wasEmpty = !stack.length;
    if (BASE.indexOf(name) >= 0) {
      for (const n of stack) { rememberFocus(n); if (n !== name) hideEl(n); }
      stack = [];
    } else if (MODAL.indexOf(name) < 0) {
      const t = top(); if (t && t !== name) { rememberFocus(t); hideEl(t); }
    }
    stack = stack.filter(n => n !== name);
    stack.push(name);
    if (wasEmpty) padLatch = true; // ignore pad buttons still held from gameplay
    render(name, opts);
    showEl(name);
    if (name !== 'vs') focusFirst(name);
    if (name === 'title') music('title');
    else if (name === 'select' || name === 'shop') music('select');
    updateRotate();
  }
  function pop() {
    const t = stack.pop(); if (t) hideEl(t);
    const prev = top();
    if (prev) {
      if (node(prev).hidden) { render(prev, { restore: true }); showEl(prev); }
      focusFirst(prev);
    }
    updateRotate();
  }
  function hide(name) {
    if (stack.indexOf(name) >= 0) {
      if (top() === name) { pop(); return; }
      stack = stack.filter(n => n !== name);
    }
    hideEl(name); updateRotate();
  }
  function hideAll() {
    for (const n of Object.keys(IDS)) { const e = document.getElementById(IDS[n]); if (e) { e.hidden = true; e.style.display = 'none'; } }
    stack = []; pendingResume = null;
    clearTimeout(vsTimer); vsTimer = 0;
    updateRotate();
  }
  function back() {
    const t = top(); if (!t) return;
    switch (t) {
      case 'title': return;
      case 'select': sfx('menu_back'); return show('title');
      case 'shop': sfx('menu_back'); return shopDone();
      case 'settings': sfx('menu_back'); if (stack.length > 1) return pop(); return show('title');
      case 'pause': pendingResume = { now: true }; return doResume();
      case 'results': return resultsContinue();
      case 'howto': case 'credits': sfx('menu_back'); return show('title');
      case 'confirm': return answer(false);
      case 'capture': if (capturing) capturing.done(null); return;
      default: return;
    }
  }
  function render(name, opts) {
    switch (name) {
      case 'title': return refreshTitle();
      case 'select': return renderSelect();
      case 'vs': return renderVS(opts);
      case 'shop': return renderShop(opts);
      case 'settings': return renderSettings(opts);
      case 'pause': return renderPause();
      case 'results': return opts.restore ? null : renderResults(opts);
      case 'howto': return renderHowto();
      case 'credits': return renderCredits();
      case 'loadout': return renderLoadout();
      case 'confirm': return renderConfirm(opts);
      case 'capture': return renderCapture(opts);
      default: return null;
    }
  }
  function goldChip(n) {
    const g = el('div', 'sd-gold'); g.innerHTML = '<span class="sd-coin">$</span><span class="n">' + fmtNum(n == null ? gold() : n) + '</span>';
    return g;
  }
  function bumpGold(root) {
    const g = (root || document).querySelectorAll('.sd-gold');
    g.forEach(x => { const n = x.querySelector('.n'); if (n) n.textContent = fmtNum(gold()); x.classList.remove('bump'); void x.offsetWidth; x.classList.add('bump'); });
  }
  function header(root, title, backFn, backLabel, extra) {
    const h = el('div', 'sd-head');
    const left = el('div', 'end');
    if (backFn) left.appendChild(btn(backLabel || '< BACK', 'small', () => backFn(), 'back'));
    const mid = el('div', 'mid'); const cap = el('span', 'sd-cap', title); mid.appendChild(cap);
    const right = el('div', 'end');
    if (extra) extra.forEach(x => right.appendChild(x));
    h.append(left, mid, right);
    root.appendChild(h);
    return h;
  }

  // ------------------------------------------------------------------ stick-dude SVG (logo + VS)
  const DUDES = [
    { c: '#ff2e3e', p: 'pomp' }, { c: '#ff8a1f', p: 'cowboy' }, { c: '#9b4dff', p: 'mohawk' }, { c: '#2b9c5a', p: 'bowl' }, { c: '#9a9aa8', p: 'cap' }
  ];
  function dudeSVG(color, prop, flip) {
    const L = 'M30 32 L30 62 M30 40 L16 52 L10 44 M30 40 L44 50 L54 46 M30 62 L19 80 L14 96 M30 62 L41 80 L47 96';
    let pr = '';
    if (prop === 'pomp') pr = '<path d="M17 12 Q24 -2 40 6 Q46 10 42 14 Q30 8 19 16 Z" fill="#ffd60a" stroke="#141018" stroke-width="3"/><rect x="25" y="17" width="16" height="5" rx="2" fill="#141018"/>';
    else if (prop === 'cowboy') pr = '<path d="M4 14 Q30 22 56 14 Q50 18 44 16 L40 -2 Q30 -6 20 -2 L16 16 Q10 18 4 14 Z" fill="#8a5a2b" stroke="#141018" stroke-width="3"/><path d="M22 30 Q30 24 38 30" stroke="#141018" stroke-width="3" fill="none"/>';
    else if (prop === 'mohawk') pr = '<path d="M24 10 L27 -4 L30 9 L33 -6 L36 10 Z" fill="#ff4fb4" stroke="#141018" stroke-width="2.5"/>';
    else if (prop === 'bowl') pr = '<circle cx="30" cy="20" r="18" fill="rgba(180,230,255,.35)" stroke="#141018" stroke-width="3"/><circle cx="35" cy="19" r="3.5" fill="none" stroke="#141018" stroke-width="2"/>';
    else if (prop === 'cap') pr = '<path d="M19 14 Q30 -6 44 12 Q48 2 52 6" fill="#3a5bd9" stroke="#141018" stroke-width="3"/><path d="M22 28 Q30 48 38 28 Z" fill="#fff" stroke="#141018" stroke-width="2.5"/>';
    const gun = '<rect x="44" y="42" width="16" height="6" rx="1" fill="#141018"/>';
    return '<svg viewBox="-2 -8 64 108" xmlns="http://www.w3.org/2000/svg"' + (flip ? ' style="transform:scaleX(-1)"' : '') + '>' +
      '<path d="' + L + '" stroke="#141018" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
      '<path d="' + L + '" stroke="' + color + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' + gun +
      '<circle cx="30" cy="20" r="11" fill="#fff" stroke="#141018" stroke-width="3.5"/>' +
      '<circle cx="34" cy="18" r="1.8" fill="#141018"/><path d="M29 25 Q34 28 38 24" stroke="#141018" stroke-width="2" fill="none"/>' + pr + '</svg>';
  }

  // ------------------------------------------------------------------ boss mugshots (art with procedural fallback)
  const artState = {};
  function mug(id) {
    const wrap = el('div', 'sd-mug sd-mug-' + id);
    const f = el('div', 'sd-face');
    f.innerHTML = '<i class="prop2"></i><i class="head"><b class="brow l"></b><b class="brow r"></b><b class="eye l"></b><b class="eye r"></b><b class="mouth"></b></i><i class="prop"></i><i class="prop3"></i>';
    wrap.appendChild(f);
    const src = 'assets/art/boss_' + id + '.webp';
    if (artState[src] !== false) {
      const img = new Image(); img.alt = ''; img.className = 'sd-mugimg'; img.decoding = 'async'; img.draggable = false;
      img.onload = () => { artState[src] = true; wrap.classList.add('has-art'); };
      img.onerror = () => { artState[src] = false; img.remove(); };
      if (artState[src] === true) wrap.classList.add('has-art');
      img.src = src; wrap.appendChild(img);
    }
    return wrap;
  }

  // ------------------------------------------------------------------ TITLE
  function buildTitle() {
    const root = node('title');
    root.classList.add('sd-screen', 'sd-sunburst', 'sd-title');
    let menu = root.querySelector('.menu');
    if (menu) menu.remove(); // keep the element (and anything injected into it); re-attached below
    else menu = el('div', 'menu');
    menu.classList.add('sd-menu');
    const items = [
      ['PLAY', 'primary', () => show('select'), 'play'],
      ['SHOP', '', () => show('shop', { from: 'title' }), 'shop'],
      ['SETTINGS', '', () => show('settings'), 'settings'],
      ['HOW TO PLAY', '', () => show('howto'), 'howto'],
      ['CREDITS', '', () => show('credits'), 'credits']
    ];
    const first = menu.firstChild;
    items.forEach(([lab, cls, fn, k], i) => {
      const b = btn(lab, cls, () => { if (now() < swallowConfirmUntil) return; sfx('menu_ok'); fn(); }, k);
      if (i === 0) b.setAttribute('data-autofocus', '');
      menu.insertBefore(b, first);
    });
    // style anything injected later (e.g. the arcade's Back button)
    const fix = () => menu.querySelectorAll('button').forEach(b => { if (!b.classList.contains('sd-btn')) b.classList.add('sd-btn'); });
    fix();
    try { new MutationObserver(fix).observe(menu, { childList: true }); } catch (e) { /* ignore */ }

    const art = el('div', 'sd-title-art');
    const img = new Image();
    img.onload = () => { art.style.backgroundImage = 'url("assets/art/title.webp")'; art.classList.add('ok'); };
    img.src = 'assets/art/title.webp';
    const main = el('div', 'sd-title-main');
    const logo = el('div', 'sd-logo');
    logo.innerHTML = '<div class="sd-logo-burst"></div><span class="l1">STICK</span><span class="l2">DOOSH</span>' +
      '<span class="dude">' + dudeSVG('#ff2e3e', 'pomp') + '</span>';
    const tag = el('div', 'sd-cap white sd-tagline');
    tag.innerHTML = 'A Very Serious War Game*<small>*it is not</small>';
    const foot = el('div', 'sd-title-foot');
    const left = el('div'); titleGold = goldChip(); left.appendChild(titleGold);
    titleBadges = el('div'); titleBadges.style.cssText = 'display:flex;gap:6px;margin-top:6px;flex-wrap:wrap';
    left.appendChild(titleBadges);
    const ver = el('div', 'sd-ver', 'v1 - CC BY-NC 4.0 - press ENTER / A / tap');
    foot.append(left, ver);
    main.append(logo, tag, menu);
    root.append(art, main, foot);
  }
  function refreshTitle() {
    if (titleGold) { titleGold.querySelector('.n').textContent = fmtNum(gold()); titleGold.style.visibility = gold() > 0 ? '' : 'hidden'; }
    if (titleBadges) {
      titleBadges.innerHTML = '';
      const c = cheats();
      for (const code in CHEATS) if (c[CHEATS[code][0]]) titleBadges.appendChild(el('span', 'sd-cap cheat sd-cheat-badge', CHEATS[code][1]));
      titleBadges.querySelectorAll('.sd-cap').forEach(x => { x.style.fontSize = '14px'; });
    }
  }
  function konami() {
    const t = now(); if (t - lastKonami < 1500) return; lastKonami = t;
    if (top() !== 'title') return;
    cheats().infLives = true; save();
    swallowConfirmUntil = t + 350;
    sfx('cheat'); sfx('powerup');
    toast('INFINITE LIVES!', { good: true });
    refreshTitle();
  }
  function seqPush(tok) {
    if (top() !== 'title') { seq = []; return false; }
    seq.push(tok); if (seq.length > KONAMI.length) seq.shift();
    if (seq.length === KONAMI.length && seq.every((v, i) => v === KONAMI[i])) { seq = []; konami(); return true; }
    return false;
  }

  // ------------------------------------------------------------------ LEVEL SELECT
  function renderSelect() {
    const root = node('select');
    root.className = 'sd-screen sd-halftone-blue sd-select';
    root.innerHTML = '';
    const bc = el('span', 'sd-cap white tilt-r sd-bc', 'BOSSES DOOSHED ' + beatenCount() + '/11'); bc.style.fontSize = '16px';
    header(root, 'SELECT YOUR VICTIM', back, '< TITLE', [
      bc, goldChip(),
      btn('SHOP', 'small', () => { sfx('menu_ok'); show('shop', { from: 'select' }); }, 'shop'),
      btn('LOADOUT', 'small', () => { sfx('menu_ok'); show('loadout'); }, 'loadout'),
      btn('SETTINGS', 'small', () => { sfx('menu_ok'); show('settings'); }, 'settings')
    ]);
    const grid = el('div', 'sd-grid');
    const best = sub(D(), 'best');
    let firstOpen = null;
    ORDER.forEach((id, i) => {
      const inf = info(id), isF = id === 'fortress', locked = isF && !fortressOpen(), won = beaten(id);
      const p = el('button', 'sd-panel' + (isF ? ' fortress' : '') + (locked ? ' locked' : '') + (won ? ' beaten' : ''));
      p.type = 'button'; p.dataset.k = id; p.dataset.theme = id;
      p.style.setProperty('--c', inf.c); p.style.setProperty('--d', inf.d);
      p.style.setProperty('--tilt', (((i * 37) % 5) - 2) * 0.7 + 'deg'); p.style.setProperty('--i', i);
      p.setAttribute('aria-label', inf.boss + ' - ' + inf.name + (won ? ' (beaten)' : '') + (locked ? ' (locked)' : ''));
      p.appendChild(mug(id));
      p.appendChild(el('div', 'sd-pstage', inf.name));
      p.appendChild(el('div', 'sd-pname', inf.boss));
      if (won) p.appendChild(el('div', 'sd-stamp', 'DOOSHED!'));
      if (won && best[id]) p.appendChild(el('div', 'sd-best', 'BEST ' + fmtTime(best[id])));
      if (locked) { const l = el('div', 'sd-lock'); l.innerHTML = 'LOCKED<small>beat all 11 bosses</small>'; p.appendChild(l); }
      p.addEventListener('click', (e) => { if (e.isTrusted && e.detail === 0 && now() - keyActAt < 500) return; chooseLevel(id, p); });
      p.addEventListener('focus', () => selectDetail(id));
      p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') selectDetail(id); });
      if (!firstOpen && !won && !locked) firstOpen = id;
      grid.appendChild(p);
    });
    root.appendChild(grid);
    const det = el('div', 'sd-detail'); det.id = 'sd-detail'; root.appendChild(det);
    if (!lastKey.select) lastKey.select = firstOpen || 'ice';
    selectDetail(lastKey.select);
  }
  function selectDetail(id) {
    const det = document.getElementById('sd-detail'); if (!det) return;
    const inf = info(id), won = beaten(id);
    let h = '<span><b>' + esc(inf.boss) + '</b></span><span>' + esc(inf.title) + '</span><i>' + esc(inf.name) + '</i>';
    if (id === 'fortress') h += '<i>' + (fortressOpen() ? 'Weak to: the shotgun. Obviously.' : 'Beat all 11 bosses to open the gates.') + '</i>';
    else {
      h += '<i>Weak to: ' + esc(superOwned(inf.weak) ? superName(inf.weak) : '???') + '</i>';
      h += '<i>' + (won ? 'Super owned: ' + esc(superName(inf.sup)) : 'Beat to steal: ' + esc(superName(inf.sup))) + '</i>';
    }
    det.innerHTML = h;
  }
  function chooseLevel(id, p) {
    if (id === 'fortress' && !fortressOpen()) {
      sfx('nope'); toast('The FORTRESS is locked. Beat all 11 bosses!');
      if (p) { p.classList.remove('sd-shake'); void p.offsetWidth; p.classList.add('sd-shake'); }
      return;
    }
    sfx('menu_ok');
    lastKey.select = id;
    showVS(id);
  }

  // ------------------------------------------------------------------ VS splash
  function renderVS(o) {
    const root = node('vs');
    root.className = 'sd-screen sd-vs' + (o.overlay ? ' overlay' : '');
    root.innerHTML = '';
    const id = o.theme, inf = info(id);
    const l = el('div', 'sd-vs-side l sd-halftone');
    const bros = el('div', 'sd-vs-bros');
    bros.innerHTML = DUDES.map(d => dudeSVG(d.c, d.p)).join('');
    l.append(el('span', 'sd-cap red sd-vs-name', 'THE DOOSH SQUAD'), bros, el('span', 'sd-cap white sd-vs-title', o.overlay ? 'BOSS FIGHT!' : inf.name));
    const r = el('div', 'sd-vs-side r');
    r.style.setProperty('--c', inf.c); r.style.setProperty('--d', inf.d);
    r.append(mug(id), el('span', 'sd-cap sd-vs-name', o.name || inf.boss), el('span', 'sd-cap white tilt-r sd-vs-title', o.title || inf.title));
    const taunt = o.taunt || (o.overlay ? inf.intro : '');
    if (taunt) r.appendChild(el('div', 'sd-vs-taunt', taunt));
    root.append(l, r, el('div', 'sd-vs-word', 'VS'));
  }
  function showVS(id) {
    show('vs', { theme: id });
    sfx('vs'); vsShownAt = now();
    clearTimeout(vsTimer);
    vsDone = () => startLevel(id);
    vsTimer = setTimeout(() => { const f = vsDone; vsDone = null; f && f(); }, 2000);
  }
  function skipVS() { if (now() - vsShownAt < 600 || !vsDone) return; clearTimeout(vsTimer); const f = vsDone; vsDone = null; f(); }
  function startLevel(id) {
    hideAll();
    lastTheme = id; gameRunning = true;
    let ok = false;
    try { if (S.Game && S.Game.start) { S.Game.start(id); ok = true; } } catch (e) { console.error('[UI] Game.start failed', e); }
    if (!ok) { gameRunning = false; show('select'); toast('The level fell over. Try again?'); }
    updateRotate();
  }

  // ------------------------------------------------------------------ SHOP
  function renderShop(o) {
    if (o && o.from) shopFrom = o.from;
    const root = node('shop');
    root.className = 'sd-screen sd-halftone-pink sd-shop';
    root.innerHTML = '';
    const Sh = S.Shop;
    const keep = el('div', 'sd-shopkeep');
    const ki = new Image(); ki.alt = ''; ki.onerror = () => ki.remove(); ki.src = 'assets/art/shopkeeper.webp';
    keep.append(ki, el('div', 'sd-quip', pick(QUIPS)));
    const h = header(root, 'DOOSH DEPOT', null, null, [goldChip(), btn(shopFrom === 'title' ? 'DONE' : 'DONE >', 'small primary', () => { sfx('menu_back'); shopDone(); }, 'done')]);
    h.insertBefore(keep, h.firstChild);
    if (!Sh) { root.appendChild(el('div', 'sd-cap white', 'The shop is closed (shop.js missing).')); return; }
    const tabs = el('div', 'sd-tabs'); tabs.id = 'sd-shop-tabs';
    root.appendChild(tabs);
    const body = el('div', 'sd-shop-body sd-scroll'); body.id = 'sd-shop-body';
    root.appendChild(body);
    root.appendChild(el('div', 'sd-hint', 'Q / E or LB / RB switch tabs. Upgrades are permanent. Silly stuff can be toggled once owned.'));
    fillShop();
  }
  function fillShop(keepFocus, effect) {
    const Sh = S.Shop; const tabs = document.getElementById('sd-shop-tabs'), body = document.getElementById('sd-shop-body');
    if (!Sh || !tabs || !body) return;
    const scroll = body.scrollTop;
    tabs.innerHTML = '';
    for (const c of Sh.CATS) {
      const list = Sh.byCat(c.id), own = list.filter(it => Sh.level(it.id) > 0).length;
      const t = btn('', 'small sd-tab' + (c.id === shopCat ? ' on' : ''), () => { if (shopCat !== c.id) { shopCat = c.id; sfx('menu_move'); fillShop('tab:' + c.id); } }, 'tab:' + c.id);
      t.innerHTML = esc(c.name) + '<span class="cnt">' + own + '/' + list.length + '</span>';
      tabs.appendChild(t);
    }
    body.innerHTML = '';
    const cat = Sh.CATS.find(c => c.id === shopCat) || Sh.CATS[0];
    body.appendChild(el('p', 'sd-catblurb', cat.blurb));
    const grid = el('div', 'sd-shop-grid' + (keepFocus && keepFocus.indexOf('tab:') !== 0 ? ' noanim' : ''));
    Sh.byCat(cat.id).forEach((it, i) => { const c = card(it, i, effect && effect.id === it.id ? effect.cls : ''); if (i === 0) c.setAttribute('data-autofocus', ''); grid.appendChild(c); });
    body.appendChild(grid);
    body.scrollTop = scroll;
    if (keepFocus) { const f = document.querySelector('#shop [data-k="' + keepFocus + '"]'); if (f) focusEl(f); }
  }
  function card(it, i, extra) {
    const Sh = S.Shop, lvl = Sh.level(it.id), mx = Sh.maxed(it.id), un = Sh.unlocked(it.id), pr = Sh.price(it.id);
    const c = el('button', 'sd-card tier-' + it.tier + (un ? '' : ' locked') + (mx ? ' maxed' : '') + (!mx && un && gold() < pr ? ' poor' : '') + (extra ? ' ' + extra : ''));
    c.type = 'button'; c.dataset.k = it.id; c.style.setProperty('--i', i);
    if (extra) c.style.animationDelay = '0s';
    let h = '<span class="tier">' + esc(Sh.TIERS[it.tier].name) + '</span><span class="nm">' + esc(it.name) + '</span>' +
      '<span class="desc">' + esc(it.desc) + '</span><span class="eff">' + esc(Sh.effectText(it.id)) + '</span><span class="row">';
    if (it.maxLevel > 1) { h += '<span class="sd-pips">'; for (let n = 0; n < it.maxLevel; n++) h += '<i' + (n < lvl ? ' class="on"' : '') + '></i>'; h += '</span>'; }
    else h += '<span></span>';
    if (!un) h += '<span class="lockt">' + esc(Sh.lockText(it.id)) + '</span>';
    else if (mx && Sh.isToggle(it.id)) h += '<span class="tog' + (Sh.enabled(it.id) ? ' on' : '') + '">' + (Sh.enabled(it.id) ? 'ON' : 'OFF') + '</span>';
    else if (mx) h += '<span class="maxed">' + (it.maxLevel > 1 ? 'MAXED' : 'OWNED') + '</span>';
    else h += '<span class="price"><span class="sd-coin">$</span>' + fmtNum(pr) + '</span>';
    h += '</span>';
    c.innerHTML = h;
    c.setAttribute('aria-label', it.name + '. ' + it.desc);
    c.addEventListener('click', (e) => { if (e.isTrusted && e.detail === 0 && now() - keyActAt < 500) return; tryBuy(it.id, c); });
    return c;
  }
  function tryBuy(id, c) {
    const Sh = S.Shop; if (!Sh) return;
    const it = Sh.get(id); if (!it) return;
    if (Sh.isToggle(id) && Sh.maxed(id) && Sh.unlocked(id)) {
      const on = Sh.toggle(id); sfx('menu_ok');
      toast(it.name + (on ? ': ON' : ': OFF'));
      fillShop(id); return;
    }
    const why = Sh.whyNot(id);
    if (why === null) {
      const p = Sh.price(id);
      if (Sh.buy(id)) {
        sfx('buy');
        const lv = Sh.level(id);
        toast(pick(SOLD) + ' ' + it.name + (it.maxLevel > 1 ? ' Lv ' + lv : '') + '  (-' + fmtNum(p) + ')', { good: true });
        fillShop(id, { id, cls: 'bought' });
        bumpGold(node('shop'));
        return;
      }
    }
    sfx('nope');
    if (c) { c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope'); }
    if (why === 'gold') toast('Need ' + fmtNum(Sh.price(id) - gold()) + ' more gold, broke bro!');
    else if (why === 'maxed') toast('Already maxed. Calm down.');
    else toast(Sh.lockText(id) || 'Locked!');
  }
  function shopTab(dir) {
    const Sh = S.Shop; if (!Sh) return;
    const i = Sh.CATS.findIndex(c => c.id === shopCat);
    shopCat = Sh.CATS[(i + dir + Sh.CATS.length) % Sh.CATS.length].id;
    sfx('menu_move'); fillShop('tab:' + shopCat);
  }
  function shopDone() { show(shopFrom === 'title' ? 'title' : 'select'); }

  // ------------------------------------------------------------------ SETTINGS
  const SET_TABS = [['controls', 'Controls'], ['video', 'Video'], ['audio', 'Audio'], ['game', 'Gameplay'], ['cheats', 'Cheats'], ['data', 'Save']];
  function renderSettings(o) {
    const root = node('settings');
    root.className = 'sd-screen sd-halftone sd-settings';
    root.innerHTML = '';
    header(root, 'SETTINGS', back, '< BACK', []);
    const tabs = el('div', 'sd-tabs'); tabs.id = 'sd-set-tabs'; root.appendChild(tabs);
    const box = el('div', 'sd-panelbox sd-scroll'); box.id = 'sd-set-body'; root.appendChild(box);
    root.appendChild(el('div', 'sd-hint', 'Everything saves instantly. Q / E or LB / RB switch tabs.'));
    fillSettings(o && o.restore ? null : 'tab:' + setTab);
  }
  function fillSettings(focusK) {
    const tabs = document.getElementById('sd-set-tabs'), body = document.getElementById('sd-set-body');
    if (!tabs || !body) return;
    tabs.innerHTML = '';
    for (const [id, name] of SET_TABS) {
      const tb = btn(name, 'small sd-tab' + (id === setTab ? ' on' : ''), () => { if (setTab !== id) { setTab = id; sfx('menu_move'); fillSettings('tab:' + id); } }, 'tab:' + id);
      if (id === setTab) tb.setAttribute('data-autofocus', '');
      tabs.appendChild(tb);
    }
    const scroll = body.scrollTop;
    body.innerHTML = '';
    const fn = { controls: setControls, video: setVideo, audio: setAudio, game: setGame, cheats: setCheats, data: setData }[setTab] || setControls;
    fn(body);
    if (focusK && focusK.indexOf('tab:') !== 0) body.scrollTop = scroll; else body.scrollTop = 0;
    if (focusK) { const f = document.querySelector('#settings [data-k="' + focusK + '"]'); if (f) focusEl(f); }
  }
  function setTabCycle(dir) {
    const i = SET_TABS.findIndex(t => t[0] === setTab);
    setTab = SET_TABS[(i + dir + SET_TABS.length) % SET_TABS.length][0];
    sfx('menu_move'); fillSettings('tab:' + setTab);
  }
  function row(parent, label, hint) {
    const r = el('div', 'sd-row'), lab = el('div', 'lab', label);
    if (hint) lab.appendChild(el('small', null, hint));
    const ctl = el('div', 'ctl'); r.append(lab, ctl); parent.appendChild(r);
    return ctl;
  }
  function sec(parent, title) { parent.appendChild(el('div', 'sd-sec', title)); }
  function same(a, b) { return a === b || (typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-6); }
  function rowChoice(parent, label, hint, path, options, after) {
    const ctl = row(parent, label, hint), cur = getS(path);
    const bs = options.map(([v, lab]) => {
      const b = btn(lab, 'small sd-opt' + (same(cur, v) ? ' on' : ''), () => {
        setS(path, v); sfx('menu_ok');
        bs.forEach((x, i) => { const on = same(options[i][0], v); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); });
        if (after) after(v);
      }, path + '=' + v);
      b.setAttribute('aria-pressed', same(cur, v));
      ctl.appendChild(b); return b;
    });
  }
  function rowToggle(parent, label, hint, path, after) { rowChoice(parent, label, hint, path, [[true, 'On'], [false, 'Off']], after); }
  function rowSlider(parent, label, hint, path, min, max, step, fmt, after) {
    const ctl = row(parent, label, hint);
    const inp = el('input', 'sd-range'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.dataset.k = path;
    inp.setAttribute('aria-label', label);
    let v = Number(getS(path)); if (!isFinite(v)) v = min; inp.value = v;
    const val = el('span', 'sd-val');
    const paint = () => { inp.style.setProperty('--p', ((Number(inp.value) - min) / (max - min) * 100) + '%'); val.textContent = fmt(Number(inp.value)); };
    inp.addEventListener('input', () => { setS(path, Number(inp.value), true); paint(); if (after) after(Number(inp.value), false); });
    inp.addEventListener('change', () => { save(); if (after) after(Number(inp.value), true); });
    paint(); ctl.append(inp, val);
  }
  function rowBtn(parent, label, hint, blabel, fn, k, cls) { const ctl = row(parent, label, hint); ctl.appendChild(btn(blabel, 'small ' + (cls || ''), fn, k)); }

  function setControls(b) {
    const subs = el('div', 'sd-sub');
    [['kb', 'Keyboard + Mouse'], ['pad', 'Controller'], ['touch', 'Touch'], ['aim', 'Aiming']].forEach(([id, name]) => { // aim: 'Aiming' sub-tab
      subs.appendChild(btn(name, 'small sd-opt' + (ctlSub === id ? ' on' : ''), () => { ctlSub = id; sfx('menu_move'); fillSettings('sub:' + id); }, 'sub:' + id));
    });
    b.appendChild(subs);
    if (ctlSub === 'kb') {
      sec(b, 'Keyboard');
      b.appendChild(el('p', 'sd-note', 'Two slots per action. Click a slot, then press the new key (Esc cancels).'));
      for (const [a, name] of ACTIONS) {
        const ctl = row(b, name, null), cur = binds('keys', a);
        for (let s = 0; s < 2; s++) ctl.appendChild(btn(keyName(cur[s]), 'small sd-bind', () => startCapture('key', a, s), 'key:' + a + ':' + s));
      }
      rowBtn(b, 'Reset keyboard', 'Back to the factory DOOSH layout.', 'RESET KEYS', () => resetBinds('keys'), 'resetkeys');
      sec(b, 'Mouse');
      rowToggle(b, 'Lock mouse to window', 'Pointer lock while playing. Esc releases it and pauses.', 'input.mouseLock');
      // aim: mouse aim = the cursor is your aim. Left click fires, right click special, middle click melee.
      rowSlider(b, 'Mouse sensitivity', 'Cursor speed while the mouse is locked to the window.', 'input.mouseSens', 0.3, 3, 0.1, (v) => v.toFixed(1) + 'x');
      rowToggle(b, 'Wheel cycles supers', 'Scroll the mouse wheel to switch special / super.', 'input.wheelCycle');
    } else if (ctlSub === 'pad') {
      sec(b, 'Controller');
      const pads = navigator.getGamepads ? Array.prototype.filter.call(navigator.getGamepads(), p => p && p.connected) : [];
      b.appendChild(el('p', 'sd-note', pads.length ? 'Connected: ' + pads[0].id.slice(0, 60) : 'No controller detected. Plug one in and press any button.'));
      for (const [a, name] of ACTIONS) {
        const ctl = row(b, name, null), cur = binds('pad', a);
        for (let s = 0; s < 2; s++) ctl.appendChild(btn(padName(cur[s]), 'small sd-bind', () => startCapture('pad', a, s), 'pad:' + a + ':' + s));
      }
      rowBtn(b, 'Reset controller', 'Back to the default button layout.', 'RESET PAD', () => resetBinds('pad'), 'resetpad');
      rowSlider(b, 'Stick dead zone', 'Bigger = less drift, less twitch.', 'input.deadzone', 0.05, 0.6, 0.05, pct);
      // aim: dual stick - left stick moves, right stick aims 360. No right stick? The left stick / D-pad aims in 8 directions.
      sec(b, 'Aim stick (right stick)');
      rowSlider(b, 'Aim dead zone', 'Right stick dead zone.', 'input.aimDead', 0.05, 0.6, 0.05, pct);
      rowSlider(b, 'Aim response', 'Higher = the gun snaps to the stick faster.', 'input.aimSens', 0.5, 2, 0.1, (v) => v.toFixed(1) + 'x');
      rowToggle(b, 'Fire when aim stick pushed', 'Twin-stick style: push the right stick = shoot. Off = use RT / X.', 'input.padAimFire');
      rowToggle(b, 'Vibration', 'Rumble on explosions and hits.', 'input.vibrate', (v) => { if (v && S.Input && S.Input.vibrate) try { S.Input.vibrate(180, 0.8); } catch (e) { /* ignore */ } });
    } else if (ctlSub === 'touch') {
      sec(b, 'Touch controls');
      rowSlider(b, 'Button size', null, 'input.touch.size', 0.6, 1.6, 0.05, pct);
      rowSlider(b, 'Opacity', null, 'input.touch.opacity', 0.15, 1, 0.05, pct);
      rowToggle(b, 'Left-handed', 'Swap the sticks and the buttons.', 'input.touch.leftHanded');
      rowChoice(b, 'Move stick', 'Floating appears where your thumb lands.', 'input.touch.stick', [['floating', 'Floating'], ['fixed', 'Fixed']]);
      // aim: right-side floating aim stick
      rowToggle(b, 'Aim stick', 'Second thumb aims 360 degrees. Off = 8-way aim from the move stick.', 'input.touch.aimStick');
      rowToggle(b, 'Fire when aim stick pushed', 'Hold the aim stick = shoot. Off = use the FIRE button.', 'input.touch.aimFire');
    } else {
      // aim: Aiming tab
      const dev = S.Input && S.Input.aimDevice, mode = S.Input && S.Input.aimMode ? S.Input.aimMode() : 'keys';
      sec(b, '360-degree aiming');
      b.appendChild(el('p', 'sd-note', 'Aiming with: ' + ({ mouse: 'MOUSE', pad: 'CONTROLLER', touch: 'TOUCH', keys: 'KEYBOARD' }[dev] || 'KEYBOARD') + ' (' + ({ mouse: 'cursor', stick: 'aim stick', keys: '8-way' }[mode] || mode) + ')'));
      rowChoice(b, 'Aim mode', 'Auto = whatever you touched last. Mouse = cursor. Stick = right stick / touch aim stick. 8-Way = keys / d-pad.', 'input.aim', [['auto', 'Auto'], ['mouse', 'Mouse'], ['stick', 'Stick'], ['keys', '8-Way']]);
      rowChoice(b, 'Aim assist', 'Gently bends stick + touch aim toward the nearest baddie.', 'input.aimAssist', [['off', 'Off'], ['low', 'Low'], ['high', 'High']]);
      rowToggle(b, 'Mouse aim assist', 'Same gentle pull for the mouse (off by default).', 'input.aimAssistMouse');
      rowToggle(b, 'Twin-stick keyboard', 'Arrow keys aim, WASD moves. Fire with J or click.', 'input.kbTwin');
      sec(b, 'Crosshair');
      rowChoice(b, 'Style', null, 'input.cross.style', [['comic', 'Comic'], ['dot', 'Dot'], ['cross', 'Plus'], ['off', 'Off']]);
      rowChoice(b, 'Color', 'Weapon = matches your gun.', 'input.cross.color', [['weapon', 'Weapon'], ['white', 'White'], ['red', 'Red'], ['green', 'Green'], ['cyan', 'Cyan']]);
      rowSlider(b, 'Size', null, 'input.cross.size', 0.7, 1.6, 0.05, pct);
    }
  }
  function setVideo(b) {
    rowChoice(b, 'Screen shake', null, 'video.shake', [['full', 'Full'], ['min', 'Minimal'], ['off', 'Off']]);
    rowToggle(b, 'Reduce flashing', 'Softer flashes, calmer boss deaths.', 'video.reduceFlash');
    rowChoice(b, 'Gore', 'Stick people are full of confetti. Mostly.', 'video.gore', [['off', 'Off'], ['on', 'Giblets'], ['max', 'MAXIMUM GIBLETS']]);
    rowSlider(b, 'Comic word size', 'How big PEW gets.', 'video.wordSize', 0.6, 1.6, 0.05, pct);
    rowChoice(b, 'Quality', 'Auto drops resolution when frames get choppy.', 'video.quality', [['auto', 'Auto'], ['high', 'High'], ['low', 'Low']]);
    rowToggle(b, 'Show FPS', null, 'video.fps');
  }
  let lastTest = 0;
  function setAudio(b) {
    const test = (name) => (v, done) => { const t = now(); if (done || t - lastTest > 160) { lastTest = t; sfx(name, { vol: 0.8 }); } };
    rowSlider(b, 'Master', null, 'audio.master', 0, 1, 0.05, pct, test('pew'));
    rowSlider(b, 'Music', null, 'audio.music', 0, 1, 0.05, pct);
    rowSlider(b, 'Sound FX', null, 'audio.sfx', 0, 1, 0.05, pct, test('pew'));
    rowSlider(b, 'Voices', null, 'audio.voice', 0, 1, 0.05, pct, (v, done) => { if (done) try { S.Voice && S.Voice.say && S.Voice.say('sgt', 'test', { force: true }); } catch (e) { /* ignore */ } });
    rowToggle(b, 'Play audio in background', 'Off = mute when the tab is hidden.', 'audio.background');
    rowChoice(b, 'Cursing', 'Bleeped = beep + @#$%!', 'audio.cursing', [['bleep', 'Bleeped'], ['raw', 'Uncensored']]);
    rowChoice(b, 'Commentary', 'How much the bros talk.', 'audio.chatter', [['off', 'Off'], ['some', 'Some'], ['lots', 'Constant']]);
    rowToggle(b, 'Speech bubbles', null, 'audio.bubbles');
  }
  function setGame(b) {
    rowChoice(b, 'Difficulty', 'Applies from the next level.', 'game.difficulty', [['baby', 'Baby Doosh'], ['normal', 'Doosh'], ['ultra', 'ULTRA DOOSH']], (v) => {
      toast(v === 'baby' ? 'Baby Doosh: goo goo, pew pew.' : v === 'ultra' ? 'ULTRA DOOSH: may God have mercy.' : 'Doosh: the way it was meant to be.');
    });
    rowToggle(b, 'Hold to autofire', 'Keep the trigger down to keep shooting.', 'game.autofire');
  }
  function setCheats(b) {
    b.appendChild(el('p', 'sd-note', 'Enter a code. Entering an active code again turns it off. (Psst: there is also one on the title screen.)'));
    const ctl = row(b, 'Code', null);
    const inp = el('input', 'sd-textin'); inp.type = 'text'; inp.maxLength = 20; inp.autocomplete = 'off'; inp.spellcheck = false;
    inp.setAttribute('autocapitalize', 'characters'); inp.placeholder = 'TYPE CODE'; inp.dataset.k = 'cheatcode'; inp.style.userSelect = 'text';
    const go = () => { const r = enterCheat(inp.value); inp.value = ''; if (r) fillSettings('cheatcode'); };
    inp._onEnter = go;
    ctl.append(inp, btn('ENTER', 'small primary', go, 'cheatgo'));
    sec(b, 'Active cheats');
    const list = el('div', 'sd-cheatlist'), c = cheats();
    let any = false;
    for (const code in CHEATS) {
      const [key, name] = CHEATS[code];
      if (!c[key]) continue; any = true;
      list.appendChild(btn(name + ': ON  (turn off)', 'small sd-opt on', () => { c[key] = false; save(); sfx('menu_back'); toast(name + ' off'); fillSettings('cheatcode'); }, 'cheat:' + key));
    }
    if (!any) list.appendChild(el('p', 'sd-note', 'None. You are playing it straight. Respect.'));
    b.appendChild(list);
  }
  function enterCheat(raw) {
    const code = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return false;
    const ch = CHEATS[code];
    if (!ch) { sfx('nope'); toast(pick(['NICE TRY, NERD.', 'NOPE.', 'That is not a code. That is a cry for help.'])); return false; }
    const c = cheats(); c[ch[0]] = !c[ch[0]]; save();
    sfx(c[ch[0]] ? 'powerup' : 'menu_back');
    toast(ch[1] + (c[ch[0]] ? '!' : ' off'), { good: !!c[ch[0]] });
    return true;
  }
  function setData(b) {
    const st = sub(D(), 'stats'), Sh = S.Shop;
    sec(b, 'Career stats');
    const g = el('div', 'sd-statgrid');
    const add = (k, v) => { const d = el('div'); d.innerHTML = esc(k) + '<b>' + esc(v) + '</b>'; g.appendChild(d); };
    add('Gold now', fmtNum(gold())); add('Gold earned', fmtNum(st.gold || 0)); add('Kills', fmtNum(st.kills || 0));
    add('Bros lost', fmtNum(st.deaths || 0)); add('Rescues', fmtNum(st.rescues || 0)); add('Bosses dooshed', beatenCount() + (beaten('fortress') ? ' + FORTRESS' : '') + ' / 11');
    if (Sh) add('Upgrades owned', Sh.ownedCount() + ' / ' + Sh.items.length);
    b.appendChild(g);
    sec(b, 'Danger zone');
    rowBtn(b, 'Reset save', 'Deletes gold, upgrades, bosses, best times and cheats. Settings are kept.', 'RESET SAVE', () => {
      confirmBox('RESET SAVE?', 'All gold, upgrades and bosses get DOOSHED forever. This cannot be undone.', 'YES, DOOSH IT', 'NO WAIT', () => {
        const keepSet = clone(settings());
        try { if (S.Save && S.Save.reset) S.Save.reset(); else memData = null; } catch (e) { /* ignore */ }
        try { const s2 = settings(); for (const k in keepSet) s2[k] = keepSet[k]; } catch (e) { /* ignore */ }
        save(); sfx('explode');
        toast('Save DOOSHED. Fresh start!');
        lastKey.select = null;
        fillSettings('resetsave');
      });
    }, 'resetsave', 'primary');
  }
  function resetBinds(kind) {
    const dfl = S.Input && S.Input.defaults && S.Input.defaults[kind];
    const inp = sub(settings(), 'input');
    if (dfl) {
      inp[kind] = clone(dfl);
      try {
        for (const a in dfl) for (let s = 0; s < 2; s++) {
          if (kind === 'keys' && S.Input.bindKey) S.Input.bindKey(a, s, dfl[a][s]);
          if (kind === 'pad' && S.Input.bindPad) S.Input.bindPad(a, s, dfl[a][s]);
        }
      } catch (e) { /* ignore */ }
    } else inp[kind] = {};
    save(); sfx('menu_ok'); toast(kind === 'pad' ? 'Controller reset.' : 'Keyboard reset.');
    fillSettings(kind === 'pad' ? 'resetpad' : 'resetkeys');
  }

  // ------------------------------------------------------------------ rebinding capture
  function startCapture(kind, action, slot) {
    sfx('menu_ok');
    const tok = { kind, action, slot, armed: false, timer: 0 };
    tok.done = (code) => {
      if (capturing !== tok) return;
      capturing = null; clearTimeout(tok.timer);
      try { if (S.Input && S.Input.cancelCapture) S.Input.cancelCapture(); } catch (e) { /* ignore */ }
      if (top() === 'capture') pop();
      const k = (kind === 'pad' ? 'pad:' : 'key:') + action + ':' + slot;
      if (code == null || code === '' || (kind === 'key' && code === 'Escape' && action !== 'pause')) { toast('Cancelled.'); fillSettings(k); return; }
      if (kind === 'key') {
        let ok = false; try { if (S.Input && S.Input.bindKey) { S.Input.bindKey(action, slot, code); ok = true; } } catch (e) { /* ignore */ }
        const a = sub(sub(settings(), 'input'), 'keys'); if (!Array.isArray(a[action])) a[action] = binds('keys', action).slice(0, 2);
        if (!ok || a[action][slot] !== code) a[action][slot] = code;
        toast(ACTIONS.find(x => x[0] === action)[1] + ' = ' + keyName(code), { good: true });
      } else {
        let ok = false; try { if (S.Input && S.Input.bindPad) { S.Input.bindPad(action, slot, code); ok = true; } } catch (e) { /* ignore */ }
        const a = sub(sub(settings(), 'input'), 'pad'); if (!Array.isArray(a[action])) a[action] = binds('pad', action).slice(0, 2);
        if (!ok || a[action][slot] !== code) a[action][slot] = code;
        toast(ACTIONS.find(x => x[0] === action)[1] + ' = ' + padName(code), { good: true });
      }
      save(); sfx('powerup'); fillSettings(k);
    };
    capturing = tok;
    show('capture', { kind, action });
    tok.timer = setTimeout(() => tok.done(null), kind === 'pad' ? 7000 : 9000);
    // Input's own capture is armed a beat later so the Enter/A press that opened this is not captured.
    if (kind === 'key') setTimeout(() => { if (capturing === tok && S.Input && S.Input.captureKey) try { S.Input.captureKey(tok.done); } catch (e) { /* ignore */ } }, 160);
  }
  function renderCapture(o) {
    const root = node('capture');
    root.className = 'sd-screen sd-dim';
    root.innerHTML = '';
    const box = el('div', 'sd-box');
    const nm = (ACTIONS.find(x => x[0] === o.action) || [0, o.action])[1];
    box.append(el('h2', null, o.kind === 'pad' ? 'PRESS A BUTTON' : 'PRESS A KEY'), el('div', 'sub', 'for ' + nm),
      el('p', null, o.kind === 'pad' ? 'Waiting for the controller... (Esc / wait to cancel)' : 'Esc cancels.'));
    const bs = el('div', 'btns'); bs.appendChild(btn('CANCEL', 'small', () => { if (capturing) capturing.done(null); }, 'cancel'));
    box.appendChild(bs); root.appendChild(box);
  }

  // ------------------------------------------------------------------ CONFIRM
  function confirmBox(title, text, yes, no, onYes, onNo) { show('confirm', { title, text, yes, no, onYes, onNo }); }
  function renderConfirm(o) {
    confirmOpts = o;
    const root = node('confirm');
    root.className = 'sd-screen sd-dim';
    root.innerHTML = '';
    const box = el('div', 'sd-box');
    box.append(el('h2', null, o.title || 'SURE?'));
    if (o.text) box.appendChild(el('p', null, o.text));
    const bs = el('div', 'btns');
    const nb = btn(o.no || 'NO', 'small', () => answer(false), 'no'); nb.setAttribute('data-autofocus', '');
    bs.append(nb, btn(o.yes || 'YES', 'small primary', () => answer(true), 'yes'));
    box.appendChild(bs); root.appendChild(box);
  }
  function answer(yes) {
    const o = confirmOpts; confirmOpts = null;
    if (top() === 'confirm') pop();
    sfx(yes ? 'menu_ok' : 'menu_back');
    if (o) { if (yes && o.onYes) o.onYes(); else if (!yes && o.onNo) o.onNo(); }
  }

  // ------------------------------------------------------------------ PAUSE
  function currentTheme() {
    if (lastTheme) return lastTheme;
    const G = S.Game; if (!G) return null;
    if (typeof G.levelId === 'string') return G.levelId;
    if (typeof G.theme === 'string') return G.theme;
    if (G.theme && G.theme.id) return G.theme.id;
    const m = /[?&]level=([a-z]+)/.exec(location.search); return m ? m[1] : null;
  }
  function renderPause() {
    const root = node('pause');
    root.className = 'sd-screen';
    root.innerHTML = '';
    const box = el('div', 'sd-box');
    const th = currentTheme(), inf = th ? info(th) : null;
    box.append(el('h2', null, 'PAUSED'));
    if (inf) box.appendChild(el('div', 'sub', inf.name + ' - vs ' + inf.boss));
    const r = btn('RESUME', 'primary', () => { pendingResume = { now: true }; doResume(); }, 'resume'); r.setAttribute('data-autofocus', '');
    box.append(r,
      btn('RESTART LEVEL', '', () => confirmBox('RESTART?', 'Start this level over from the top.', 'RESTART', 'NO', () => restartLevel()), 'restart'),
      btn('SUPER LOADOUT', '', () => { sfx('menu_ok'); show('loadout'); }, 'loadout'),
      btn('SETTINGS', '', () => { sfx('menu_ok'); show('settings'); }, 'settings'),
      btn('QUIT TO LEVEL SELECT', '', () => confirmBox('BAIL OUT?', 'Leave this level and head back to the map.', 'QUIT', 'STAY', () => quitLevel()), 'quit'));
    box.appendChild(el('p', null, 'Esc / P / Start to resume'));
    root.appendChild(box);
  }
  function doResume() {
    pendingResume = null;
    hideAll();
    sfx('menu_back');
    try { if (S.Game && S.Game.resume) S.Game.resume(); } catch (e) { console.error('[UI] resume failed', e); }
  }
  function restartLevel() {
    const th = currentTheme();
    hideAll();
    if (!th) { show('select'); return; }
    startLevel(th);
  }
  function quitLevel() {
    hideAll(); gameRunning = false;
    try { if (S.Game && S.Game.quit) S.Game.quit(); } catch (e) { console.error('[UI] quit failed', e); }
    show('select');
  }

  // dude portrait (assets/art/dude_<id>.webp); the <img> removes itself when the file is missing so the layout falls back to text only
  function dudePortrait(id, cls) {
    const w = el('div', 'sd-portrait ' + (cls || ''));
    const img = document.createElement('img');
    img.alt = ''; img.decoding = 'async'; img.draggable = false;
    img.onerror = () => { w.remove(); };
    img.src = 'assets/art/dude_' + id + '.webp';
    w.appendChild(img);
    return w;
  }
  // ------------------------------------------------------------------ RESULTS
  function renderResults(o) {
    const r = o.result || {}, fail = !!o.fail;
    const th = typeof r.theme === 'string' ? r.theme : (r.theme && r.theme.id) || currentTheme();
    const inf = th ? info(th) : null;
    const root = node('results');
    root.className = 'sd-screen sd-results ' + (fail ? 'fail sd-halftone-ink' : 'sd-halftone');
    root.innerHTML = '';
    root.appendChild(el('div', 'sd-res-word', fail ? 'YOU GOT DOOSHED' : (r.bossBeaten ? 'LEVEL DOOSHED!' : 'LEVEL CLEAR!')));
    const col = el('div', 'sd-res-row');
    if (inf) col.appendChild(el('span', 'sd-cap ' + (fail ? 'red' : 'white'), fail ? inf.boss + ' wins this round' : inf.name + (r.bossBeaten ? ' - ' + inf.boss + ' got DOOSHED' : '')));
    const dId = r.dude || (S.Game && S.Game.player && S.Game.player.dude) || null, dd = dId && S.Dudes && S.Dudes[dId];
    if (dd) { const dw = el('div', 'sd-res-dude'); dw.appendChild(dudePortrait(dId, 'lg')); dw.appendChild(el('span', 'sd-cap ' + (fail ? 'red' : 'white'), (fail ? 'DOOSHED: ' : 'FINISHED BY: ') + String(dd.name))); col.appendChild(dw); }
    const tally = el('div', 'sd-tally');
    const rows = [];
    const addRow = (k, v, cls, fmt) => {
      const d = el('div', 'sd-trow ' + (cls || ''));
      d.innerHTML = '<span class="k">' + esc(k) + '</span><span class="dots"></span><span class="v">' + esc(fmt ? fmt(0) : '0') + '</span>';
      tally.appendChild(d); rows.push({ e: d.querySelector('.v'), to: Number(v) || 0, fmt: fmt || fmtNum });
    };
    addRow('TIME', r.time || 0, '', fmtTime);
    addRow('KILLS', r.kills || 0);
    addRow('RESCUES', r.rescues || 0);
    addRow(fail ? 'GOLD KEPT (50%)' : 'GOLD', r.gold || 0, 'gold', (v) => '+' + fmtNum(v));
    if (r.newBest) { const nb = el('div', 'sd-trow sub'); nb.textContent = 'NEW BEST TIME!'; tally.appendChild(nb); }
    if (fail) { const s = el('div', 'sd-trow sub'); s.textContent = 'Half your loot fell out of your pockets. Rescue more bros next time!'; tally.appendChild(s); }
    if (r.firstClear && !fail) tally.appendChild(el('div', 'sd-firstclear', 'FIRST CLEAR!'));
    col.appendChild(tally);
    if (r.newSuper && !fail) col.appendChild(el('div', 'sd-newsuper', 'NEW SUPER: ' + superName(r.newSuper).toUpperCase() + '!'));
    const bs = el('div', 'sd-foot');
    const cont = btn('CONTINUE >', 'primary', () => resultsContinue(), 'continue'); cont.setAttribute('data-autofocus', '');
    if (fail && th) bs.appendChild(btn('RETRY', '', () => { if (finishCount()) return; sfx('menu_ok'); startLevel(th); }, 'retry'));
    bs.appendChild(cont);
    col.appendChild(bs);
    root.appendChild(col);
    startCount(rows);
    if (r.firstClear && !fail) setTimeout(() => sfx('stamp'), 1200);
  }
  function startCount(rows) {
    finishCount(true);
    const t0 = now(), dur = 1300;
    let lastTick = 0;
    const step = () => {
      if (!resultCount) return;
      const k = Math.min(1, (now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      for (const r of rows) r.e.textContent = r.fmt(Math.round(r.to * e));
      if (k < 1 && now() - lastTick > 85 && rows[3] && rows[3].to > 0) { lastTick = now(); sfx('coin', { vol: 0.25, pitch: 0.8 + k * 0.6 }); }
      if (k >= 1) { resultCount = null; return; }
      resultCount.t = setTimeout(step, 30);
    };
    resultCount = { rows, t: 0 };
    step();
  }
  function finishCount(silent) {
    if (!resultCount) return false;
    clearTimeout(resultCount.t);
    for (const r of resultCount.rows) r.e.textContent = r.fmt(r.to);
    resultCount = null;
    if (!silent) sfx('coin');
    return !silent;
  }
  function resultsContinue() {
    if (finishCount()) return;
    sfx('menu_ok');
    show('shop', { from: 'results' });
  }

  // ------------------------------------------------------------------ HOW TO / CREDITS
  function renderHowto() {
    const root = node('howto');
    root.className = 'sd-screen sd-halftone sd-howto';
    root.innerHTML = '';
    header(root, 'HOW TO DOOSH', back, '< BACK', []);
    const box = el('div', 'sd-panelbox sd-scroll');
    const g = el('div', 'sd-howgrid');
    const kb = (a) => bindLabel('keys', a).split(' / ').map(keyChip).join(' ');
    const panels = [
      ['MOVE + SHOOT', '<ul><li>Move ' + kb('left') + ' ' + kb('right') + '</li><li>Jump ' + kb('jump') + ' (hold = higher)</li><li>Fire ' + kb('fire') +
        '</li><li>Special ' + kb('special') + ' &nbsp; Melee ' + kb('melee') + '</li><li>Cycle super ' + kb('cycle') + ' &nbsp; Pause ' + kb('pause') + '</li></ul>'],
      ['CONTROLLER', '<ul><li>Left stick moves, <b>right stick aims 360</b> (no right stick? left stick / D-pad aims 8-way)</li><li>' + keyChip('A') + ' jump &nbsp;' + keyChip('X') + keyChip('RT') + ' fire</li><li>' + keyChip('B') + keyChip('LT') +
        ' special &nbsp;' + keyChip('Y') + ' melee</li><li>' + keyChip('LB') + keyChip('RB') + ' cycle super &nbsp;' + keyChip('START') + ' pause</li></ul>'],
      ['PHONE', '<p>Left half = floating move stick. Right half = floating <b>aim stick</b>: drag to aim 360, hold to shoot. FIRE fires at your current aim; JUMP, SPEC, WHAP, CYCLE sit at the edge. Pause is up top. Play in landscape.</p>'],
      ['AIMING', '<p><b>Mouse:</b> the crosshair is your aim, click to shoot. <b>Dual stick pad:</b> right stick aims anywhere. <b>Keyboard:</b> hold <b>UP</b> (+ left/right) to aim up and diagonally, hold <b>DOWN</b> in the air to aim down. Shoot the floor and dig. Mess with it in Settings &gt; Controls &gt; Aiming.</p>'],
      ['THE BROS = LIVES', '<p>Your team of 5 bros are your lives. One dies, the next drops in at the last checkpoint flag. Smash cages to free prisoners and get dead bros back.</p>'],
      ['CLIMB EVERYTHING', '<p>Hold toward a wall in the air to climb it. Jump off walls. Down + jump drops through thin platforms.</p>'],
      ['BLOW IT ALL UP', '<p>The ground is destructible. Explosions dig holes, barrels chain-react, melee breaks blocks. Make your own shortcut.</p>'],
      ['POWER-UPS', '<p><span class="sd-badge">S</span> spread <span class="sd-badge">M</span> machine gun <span class="sd-badge">D</span> DOOSH <span class="sd-badge">R</span> rockets <span class="sd-badge">F</span> flame <span class="sd-badge">L</span> laser <span class="sd-badge">B</span> barrier <span class="sd-badge">+</span> heal <span class="sd-badge">$</span> gold. Grab the same letter twice for MEGA.</p>'],
      ['BOSSES', '<p>Beat a boss, steal its SUPER. Every boss is weak to another boss\'s super (x4 damage). Beat all 11 to open the DOOSH FORTRESS.</p>'],
      ['GET TO THE CHOPPA!', '<p>After the boss blows up, a helicopter drops a ladder. Grab it. Collect gold, then spend it in the shop on permanent upgrades.</p>']
    ];
    panels.forEach(([t, h], i) => { const p = el('div', 'sd-how'); p.style.setProperty('--i', i); p.innerHTML = '<h3>' + esc(t) + '</h3>' + h; g.appendChild(p); });
    if (S.Dudes && S.Dudes.order) {
      const rp = el('div', 'sd-how sd-roster'); rp.style.setProperty('--i', panels.length);
      rp.appendChild(el('h3', '', 'THE BROS'));
      const list = el('div', 'sd-roster-list');
      for (const id of S.Dudes.order) {
        const d = S.Dudes[id]; if (!d) continue;
        const c = el('div', 'sd-roster-card');
        c.appendChild(dudePortrait(id, 'sm'));
        const t = el('div', 'sd-roster-txt'); t.appendChild(el('b', '', String(d.name || id))); t.appendChild(el('span', '', String(d.blurb || '')));
        c.appendChild(t); list.appendChild(c);
      }
      rp.appendChild(list); g.appendChild(rp);
    }
    box.appendChild(g); root.appendChild(box);
  }
  // ------------------------------------------------------------------ super loadout (carry up to 3 boss supers)
  function equipList() { return (S.Player && S.Player.equipped) ? S.Player.equipped() : []; }
  function setLoadout(arr) { D().loadout = arr.slice(0, 3); save(); }
  function renderLoadout() {
    const root = node('loadout');
    root.className = 'sd-screen sd-halftone-blue sd-loadout';
    root.innerHTML = '';
    header(root, 'SUPER LOADOUT', back, '< BACK');
    const eq = equipList();
    root.appendChild(el('p', 'sd-lo-help', 'Carry up to 3 boss supers into a level. In the game: [Q] / LB-RB / mouse wheel cycles, or press 1-4 to pick one directly (slot 1 is your own dude special).'));
    const slots = el('div', 'sd-lo-slots');
    for (let i = 0; i < 3; i++) {
      const id = eq[i], lab = el('span');
      lab.innerHTML = id ? '<b>' + esc(superName(id)) + '</b><small>tap to remove</small>' : '<b>EMPTY SLOT</b><small>pick a super below</small>';
      slots.appendChild(btn(lab, 'sd-lo-slot' + (id ? ' full' : ''), () => {
        if (!id) { toast('Pick an unlocked super below', {}); return; }
        setLoadout(eq.filter(x => x !== id)); sfx('menu_back'); renderLoadout(); refocus('slot' + i);
      }, 'slot' + i));
    }
    root.appendChild(slots);
    const grid = el('div', 'sd-lo-grid');
    Object.keys(SUPERS).filter(id => SUPERS[id][1]).forEach(id => {
      const th = SUPERS[id][1], inf = info(th), own = superOwned(id), on = eq.indexOf(id) >= 0;
      const lab = el('span');
      lab.innerHTML = '<b>' + esc(superName(id)) + '</b><small>' + (own ? (on ? 'EQUIPPED - tap to remove' : 'tap to equip') : 'LOCKED - beat ' + esc(inf.boss)) + '</small><i>from ' + esc(inf.boss) + '</i>';
      const b = btn(lab, 'sd-lo-sup' + (own ? '' : ' locked') + (on ? ' on' : ''), () => {
        if (!own) { toast('Beat ' + inf.boss + ' to unlock ' + superName(id), {}); sfx('nope'); return; }
        if (on) setLoadout(eq.filter(x => x !== id));
        else if (eq.length >= 3) { toast('Slots full - tap a slot above to remove one', {}); sfx('nope'); return; }
        else setLoadout(eq.concat([id]));
        sfx(on ? 'menu_back' : 'menu_ok'); renderLoadout(); refocus(id);
      }, id);
      b.style.setProperty('--c', inf.c);
      grid.appendChild(b);
    });
    root.appendChild(grid);
  }
  function refocus(k) { const e = node('loadout').querySelector('[data-k="' + k + '"]'); if (e) focusEl(e); }

  function renderCredits() {
    const root = node('credits');
    root.className = 'sd-screen sd-halftone-blue sd-credits';
    root.innerHTML = '';
    header(root, 'CREDITS', back, '< BACK', []);
    const box = el('div', 'sd-panelbox sd-scroll');
    const list = [
      ['A game about', 'Sticks. Exploding.'], ['Directed by', 'A Very Angry Stick'], ['Explosions consultant', "Michael Bay's cousin, Gary"],
      ['Shotgun choreography', 'Sgt. Doosh (and his hair)'], ['Head of physics', 'Gravity (currently on the Moon)'], ['Catering', "Grandpappy Fwoosh's dentures"],
      ['Legal department', 'We did not check'], ['Font', 'Bangers by Vernon Adams (SIL OFL)'], ['Voices', 'Kokoro TTS, doing its best'],
      ['Music', 'Heavy metal summoned by robots'], ['Inspired by', 'Broforce, Mega Man X, Contra and every stick figure ever doodled in a math notebook'],
      ['Production', 'A NicTools.dev joint'], ['License', 'CC BY-NC 4.0']
    ];
    for (const [role, who] of list) { const c = el('div', 'sd-credit'); c.innerHTML = '<div class="role">' + esc(role) + '</div><div class="who">' + esc(who) + '</div>'; box.appendChild(c); }
    box.appendChild(el('p', 'sd-note', 'No sticks were harmed in the making of this game. OK, several. Thousands, actually.'));
    root.appendChild(box);
  }

  // ------------------------------------------------------------------ TOAST + ROTATE
  function makeToastBox() { const t = el('div', 'sd-toast'); t.id = 'sd-toast'; t.setAttribute('aria-live', 'polite'); document.body.appendChild(t); return t; }
  function toast(msg, o) {
    if (!toastBox) toastBox = makeToastBox();
    const b = el('div', 'sd-toast-b' + (o && o.good ? ' good' : ''), String(msg));
    toastBox.appendChild(b);
    while (toastBox.children.length > 3) toastBox.removeChild(toastBox.firstChild);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 330); }, (o && o.ms) || 2200);
  }
  function updateRotate() {
    if (!rotateEl) return;
    const t = top();
    const inGame = gameRunning && (!t || t === 'pause' || t === 'settings' && stack[0] === 'pause');
    const on = inGame && isTouch() && window.innerHeight > window.innerWidth * 1.05;
    if (on !== rotateOn) {
      rotateOn = on; rotateEl.classList.toggle('on', on);
      if (on && !t) { try { if (S.Game && S.Game.pause) S.Game.pause(); } catch (e) { /* ignore */ } }
    }
  }

  // ------------------------------------------------------------------ keyboard
  function isPauseKey(code) { return code === 'Escape' || code === 'KeyP' || binds('keys', 'pause').indexOf(code) >= 0; }
  function onKey(e) {
    if (!stack.length) return; // gameplay owns the keyboard
    const code = e.code;
    if (capturing) {
      if (capturing.kind === 'key') {
        if (e.repeat) { e.preventDefault(); return; }
        if (code && code !== 'Unidentified') { e.preventDefault(); capturing.done(code); }
      } else if (code === 'Escape') { e.preventDefault(); e.stopPropagation(); capturing.done(null); }
      return;
    }
    const t = top(), tg = e.target;
    const typing = tg && tg.tagName === 'INPUT' && tg.type === 'text';
    if (t === 'pause' && !typing && isPauseKey(code)) {
      e.preventDefault(); e.stopPropagation();
      if (!e.repeat && e.timeStamp >= pauseShownAt) pendingResume = { key: code };
      return;
    }
    if (t === 'vs') { if (!e.repeat && (code === 'Enter' || code === 'Space' || code === 'Escape')) { e.preventDefault(); skipVS(); } return; }
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    let dir = null;
    if (typing) {
      if (code === 'Enter' || code === 'NumpadEnter') { e.preventDefault(); if (tg._onEnter) tg._onEnter(); return; }
      if (code === 'Escape') { e.preventDefault(); tg.blur(); focusFirst(top()); return; }
      if (code === 'ArrowUp') dir = [0, -1]; else if (code === 'ArrowDown') dir = [0, 1]; else return;
    } else {
      if (code === 'ArrowUp') { dir = [0, -1]; seqPush('u'); } else if (code === 'ArrowDown') { dir = [0, 1]; seqPush('d'); }
      else if (code === 'ArrowLeft') { dir = [-1, 0]; seqPush('l'); } else if (code === 'ArrowRight') { dir = [1, 0]; seqPush('r'); }
      else if (code === 'KeyW') dir = [0, -1]; else if (code === 'KeyS') dir = [0, 1];
      else if (code === 'KeyA') { if (seqPush('a')) { e.preventDefault(); return; } dir = [-1, 0]; }
      else if (code === 'KeyD') dir = [1, 0];
      else if (code === 'KeyB') seqPush('b');
    }
    const a = document.activeElement;
    if (dir) {
      e.preventDefault();
      if (a && a.type === 'range' && dir[1] === 0) adjustRange(a, dir[0]);
      else nav(dir[0], dir[1]);
      return;
    }
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      const root = screenEl(t);
      if (a && root && root.contains(a) && a !== document.body) activate(a); else focusFirst(t);
      return;
    }
    if (code === 'Escape' || code === 'Backspace') { e.preventDefault(); if (!e.repeat) back(); return; }
    if (code === 'KeyQ' || code === 'PageUp' || code === 'KeyE' || code === 'PageDown') {
      const d = (code === 'KeyQ' || code === 'PageUp') ? -1 : 1;
      if (t === 'shop') { e.preventDefault(); shopTab(d); } else if (t === 'settings') { e.preventDefault(); setTabCycle(d); }
    }
  }
  function onKeyUp(e) {
    if (pendingResume && pendingResume.key && pendingResume.key === e.code) { e.preventDefault(); e.stopPropagation(); doResume(); }
  }

  // ------------------------------------------------------------------ gamepad (own light poll; menus only)
  function readPads() {
    const st = { b: [], x: 0, y: 0, any: false };
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p || !p.connected) continue;
      p.buttons.forEach((bt, i) => { const v = typeof bt === 'object' ? (bt.pressed || bt.value > 0.5) : bt > 0.5; if (v) { st.b[i] = true; st.any = true; } });
      const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
      if (Math.abs(ax) > Math.abs(st.x)) st.x = ax; if (Math.abs(ay) > Math.abs(st.y)) st.y = ay;
    }
    if (Math.abs(st.x) > 0.5 || Math.abs(st.y) > 0.5) st.any = true;
    return st;
  }
  function pollPad() {
    const cur = readPads();
    const prev = padPrev; padPrev = cur;
    const P = (i) => !!cur.b[i] && !(prev.b && prev.b[i]);
    if (!stack.length) { padLatch = false; return; }
    if (capturing && capturing.kind === 'pad') {
      if (!capturing.armed) { if (!cur.any) capturing.armed = true; return; }
      for (let i = 0; i < cur.b.length; i++) if (cur.b[i] && !(prev.b && prev.b[i])) { capturing.done(i); return; }
      return;
    }
    if (capturing) return;
    if (padLatch) { if (cur.any) return; padLatch = false; }
    if (pendingResume && pendingResume.pad != null) { if (!cur.b[pendingResume.pad]) doResume(); return; }
    const t = top();
    let dir = null;
    if (cur.b[12] || cur.y < -0.5) dir = 'u'; else if (cur.b[13] || cur.y > 0.5) dir = 'd';
    else if (cur.b[14] || cur.x < -0.5) dir = 'l'; else if (cur.b[15] || cur.x > 0.5) dir = 'r';
    const tn = now();
    if (dir !== padDir) {
      padDir = dir;
      if (dir) { padNext = tn + 380; padMove(dir, true); }
    } else if (dir && tn >= padNext) { padNext = tn + 110; padMove(dir, false); }
    if (t === 'pause' && (P(9) || P(1))) { pendingResume = { pad: P(9) ? 9 : 1 }; return; }
    if (t === 'vs') { if (P(0) || P(9)) skipVS(); return; }
    if (P(1)) { if (top() === 'title') seqPush('b'); else { back(); return; } }
    if (P(0) || P(9) || (P(2) && t !== 'title')) {
      if (P(0) && seqPush('a')) return;
      if (now() < swallowConfirmUntil) return;
      const a = document.activeElement, root = screenEl(top());
      if (a && root && root.contains(a) && a !== document.body) activate(a); else focusFirst(top());
      return;
    }
    if (P(4) || P(5)) { const d = P(4) ? -1 : 1; if (t === 'shop') shopTab(d); else if (t === 'settings') setTabCycle(d); }
  }
  function padMove(dir, first) {
    if (first) seqPush(dir);
    const a = document.activeElement;
    const dx = dir === 'l' ? -1 : dir === 'r' ? 1 : 0, dy = dir === 'u' ? -1 : dir === 'd' ? 1 : 0;
    if (a && a.type === 'range' && dx) adjustRange(a, dx); else nav(dx, dy);
  }
  function loop() {
    try { pollPad(); } catch (e) { /* ignore */ }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ public API
  UI.init = function () {
    if (built) return UI;
    built = true;
    if (!document.querySelector('link[href*="Bangers"]')) {
      const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=Bangers&display=swap';
      document.head.appendChild(l);
    }
    for (const n in IDS) { const e = node(n); e.classList.add('sd-screen'); e.hidden = true; e.style.display = 'none'; }
    document.body.classList.add('sd-ui');
    toastBox = makeToastBox();
    rotateEl = el('div', 'sd-rotate sd-halftone-ink');
    rotateEl.innerHTML = '<div class="phone"></div><div>ROTATE YOUR PHONE</div><small>Stick Doosh is a sideways kind of game.</small>';
    document.body.appendChild(rotateEl);
    buildTitle();
    if (getS('video.reduceFlash')) document.body.classList.add('sd-calm');
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('resize', updateRotate);
    window.addEventListener('orientationchange', () => setTimeout(updateRotate, 200));
    // mouse hover moves the focus highlight so mouse + keyboard + pad agree
    document.addEventListener('pointerover', (e) => {
      if (e.pointerType !== 'mouse' || !stack.length) return;
      const b = e.target && e.target.closest && e.target.closest('button, input[type=range]');
      const root = screenEl(top());
      if (b && root && root.contains(b) && document.activeElement !== b && visible(b)) { try { b.focus({ preventScroll: true }); } catch (x) { /* ignore */ } }
    });
    const unlock = () => {
      try { if (S.Audio && S.Audio.unlock) S.Audio.unlock(); } catch (e) { /* ignore */ }
      const t = top(); if (t === 'title') music('title'); else if (t === 'select' || t === 'shop') music('select');
    };
    window.addEventListener('pointerdown', unlock, { capture: true, once: true });
    window.addEventListener('keydown', unlock, { capture: true, once: true });
    try { if (S.Input && S.Input.onCheatSeq) S.Input.onCheatSeq((c) => { if (c === 'KONAMI' || c === undefined) konami(); else if (top() === 'title' && CHEATS[c]) { enterCheat(c); refreshTitle(); } }); } catch (e) { /* ignore */ }
    requestAnimationFrame(loop);
    if (/[?&]level=/.test(location.search)) { gameRunning = true; lastTheme = (/[?&]level=([a-z]+)/.exec(location.search) || [])[1] || null; }
    else show('title');
    return UI;
  };
  UI.show = function (id, opts) { show(id, opts); };
  UI.hide = function (id) { if (!built) return; if (id === 'toast') { if (toastBox) toastBox.innerHTML = ''; return; } hide(id); };
  UI.hideAll = function () { if (built) hideAll(); };
  UI.toast = function (msg, o) { if (!built) UI.init(); toast(msg, o); };
  UI.back = back;
  UI.top = top;
  UI.isOpen = function () { return stack.length > 0; };
  UI.onPause = function () {
    if (!built) UI.init();
    gameRunning = true; pauseShownAt = now(); pendingResume = null; delete lastKey.pause;
    show('pause');
  };
  UI.resume = function () { if (top() === 'pause' || stack.indexOf('pause') >= 0) doResume(); };
  UI.onLevelClear = function (result) { gameRunning = false; if (result && result.theme && typeof result.theme === 'string') lastTheme = result.theme; show('results', { result: result || {}, fail: false }); };
  UI.onLevelFail = function (result) { gameRunning = false; if (result && result.theme && typeof result.theme === 'string') lastTheme = result.theme; show('results', { result: result || {}, fail: true }); };
  UI.onBossIntro = function (def, cb) {
    if (!built) UI.init();
    let id = null, o = { overlay: true };
    if (typeof def === 'string') id = def;
    else if (def) {
      id = def.themeId || def.theme || def.id || currentTheme();
      if (def.name) o.name = def.name; if (def.title) o.title = def.title;
      const it = def.intro; o.taunt = typeof it === 'string' ? it : (it && (it.taunt || it.line || it.text)) || '';
    }
    o.theme = INFO[id] ? id : (currentTheme() || 'fortress');
    show('vs', o);
    sfx('vs'); vsShownAt = now();
    clearTimeout(vsTimer);
    vsDone = () => { hideAll(); if (typeof cb === 'function') { try { cb(); } catch (e) { console.error('[UI] boss intro cb', e); } } };
    vsTimer = setTimeout(() => { const f = vsDone; vsDone = null; f && f(); }, 2000);
  };
  UI.startLevel = function (id) { startLevel(id); };
  UI.chooseLevel = function (id) { chooseLevel(id); };
  UI.enterCheat = enterCheat;
  UI.refresh = function () { const t = top(); if (t) render(t, { restore: true }); };
  UI.info = info;
  UI.THEMES = ORDER;
  UI.MAIN = MAIN;
  S.UI = UI;
})();
