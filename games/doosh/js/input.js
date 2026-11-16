// Stick Doosh - input.js (core): keyboard / mouse / gamepad / touch -> actions, rebinding, pointer lock, cheats.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const ACTIONS = ['left', 'right', 'up', 'down', 'jump', 'fire', 'special', 'melee', 'cycle', 'pause', 'confirm', 'back'];
  const MENU_KEYS = { confirm: ['Enter', 'NumpadEnter', 'Space'], back: ['Escape', 'Backspace'] };
  const GAME_KEYS = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab']);

  const keysDown = new Set();
  const pressQ = new Set();      // codes pressed since last endFrame (catches sub-frame taps)
  const held = {}, prev = {}, sim = {};
  const padBtn = [], padPrev = [];
  const padAxes = [0, 0, 0, 0];
  let lastDevice = 'kb';
  let canvas = null;
  let captureK = null, captureP = null;
  const cheatCbs = [];
  let seq = [], typed = '';

  // ---------------- touch ----------------
  const touch = {
    used: false, stickId: null, sx: 0, sy: 0, dx: 0, dy: 0, // stick in logical px
    aimId: null, ax0: 0, ay0: 0, adx: 0, ady: 0, t: 0,       // aim: the right-side aim stick (floating) + time of the last touch
    btn: {}, ids: {}, // pointerId -> button name
  };
  ACTIONS.forEach((a) => { held[a] = false; prev[a] = false; });

  // ---------------- aim state (360-degree aiming; player.js turns this into aimAng) ----------------
  // mouse = virtual/real cursor in LOGICAL screen px; aimStick = right stick / touch aim stick (unit dir + dead-zoned magnitude)
  const mouse = { x: 0, y: 0, has: false, t: 0, locked: false };
  const aimStick = { x: 1, y: 0, mag: 0, active: false, src: 'pad' };
  const kbAim = { x: 0, y: 0 };
  const ARROWS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const AIM_DEF = { aim: 'auto', aimAssist: 'low', aimAssistMouse: false, aimDead: 0.2, aimSens: 1, mouseSens: 1, padAimFire: false, kbTwin: false, wheelCycle: true };
  let aimDev = 'keys';          // 'mouse' | 'pad' | 'touch' | 'keys': the device used most recently for aiming
  let padRSeen = false, padAnyPrev = false, rsx = 0, rsy = 0, aimFireNow = false, cursorHidden = false, lastWheel = 0;
  function nowMs() { return (window.performance && performance.now()) || Date.now(); }

  function settings() { return S.Save ? S.Save.settings.input : null; }
  function cfgv(k) { const s = settings(); return s && s[k] !== undefined ? s[k] : AIM_DEF[k]; }
  function twinKeys() { return !!cfgv('kbTwin'); }
  function binds(a) { const s = settings(); return (s && s.keys[a]) || (S.Save && S.Save.DEFAULT_KEYS[a]) || []; }
  function pbinds(a) { const s = settings(); return (s && s.pad[a]) || (S.Save && S.Save.DEFAULT_PAD[a]) || []; }

  function isTyping(e) {
    const t = e && e.target;
    return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
  }

  function onKeyDown(e) {
    if (isTyping(e)) return;
    lastDevice = 'kb';
    if (captureK) { e.preventDefault(); const cb = captureK; captureK = null; cb(e.code === 'Escape' ? null : e.code); return; }
    if (GAME_KEYS.has(e.code) || (S.Main && S.Main.mode === 'play' && isBound(e.code))) e.preventDefault();
    // aim: keyboard takes over from pad/touch; from a (idle) mouse only when an aim/fire key is pressed
    if (aimDev === 'pad' || aimDev === 'touch') aimDev = 'keys';
    else if (aimDev === 'mouse' && nowMs() - mouse.t > 1500 && isAimKey(e.code)) aimDev = 'keys';
    if (e.repeat) return;
    keysDown.add(e.code); pressQ.add(e.code);
    seqKey(e.code);
  }
  function onKeyUp(e) { keysDown.delete(e.code); }
  function isBound(code) { for (const a of ACTIONS) if (binds(a).indexOf(code) >= 0) return true; return false; }

  function isAimKey(code) {
    if (/^Mouse/.test(code)) return false;
    for (const a of ['fire', 'up', 'down']) if (binds(a).indexOf(code) >= 0) return true;
    return ARROWS.has(code) && twinKeys();
  }

  // aim: virtual cursor (logical px). Pointer lock feeds relative movement, otherwise the real cursor position is used.
  function setCursor(x, y) {
    const M = S.Main, W = M ? M.W : 800, H = M ? M.H : 450;
    x = x < 0 ? 0 : x > W ? W : x; y = y < 0 ? 0 : y > H ? H : y;
    const moved = Math.abs(x - mouse.x) + Math.abs(y - mouse.y);
    mouse.x = x; mouse.y = y; mouse.has = true;
    if (moved > 0.4 && nowMs() - touch.t > 800) { mouse.t = nowMs(); aimDev = 'mouse'; lastDevice = 'kb'; }
  }
  function cursorMove(dx, dy) { // relative (pointer-lock) movement in logical px, scaled by the mouse sensitivity setting
    const k = Number(cfgv('mouseSens')) || 1;
    setCursor(mouse.x + dx * k, mouse.y + dy * k);
  }
  function onMouseMove(e) {
    if (e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
    if (canvas && document.pointerLockElement === canvas) {
      mouse.locked = true;
      const r = canvas.getBoundingClientRect(), M = S.Main;
      if (r.width > 0 && M) cursorMove((e.movementX || 0) * M.W / r.width, (e.movementY || 0) * M.H / r.height);
    } else { mouse.locked = false; const p = toLogical(e.clientX, e.clientY); setCursor(p.x, p.y); }
  }
  function onWheel(e) {
    if (!S.Main || S.Main.mode !== 'play' || cfgv('wheelCycle') === false) return;
    e.preventDefault();
    const t = nowMs(); if (t - lastWheel < 140) return; lastWheel = t;
    Input.tap('cycle');
  }

  function onMouseDown(e) {
    lastDevice = 'kb';
    const code = 'Mouse' + e.button;
    if (captureK) { e.preventDefault(); const cb = captureK; captureK = null; cb(code); return; }
    if (!(canvas && document.pointerLockElement === canvas) && nowMs() - touch.t > 800) { const p = toLogical(e.clientX, e.clientY); setCursor(p.x, p.y); aimDev = 'mouse'; mouse.t = nowMs(); }
    keysDown.add(code); pressQ.add(code);
    if (S.Audio && S.Audio.unlock) S.Audio.unlock();
  }
  function onMouseUp(e) { keysDown.delete('Mouse' + e.button); }

  // ---------------- cheats ----------------
  const KONAMI = 'UUDDLRLRBA';
  const TEXT_CODES = ['DOOSHFOREVER', 'BIGHEADS', 'MOONWALK', 'GIBLETS', 'PEWPEWPEW'];
  function seqTok(t) {
    seq.push(t); if (seq.length > 10) seq.shift();
    if (seq.join('') === KONAMI) { seq = []; fireCheat('KONAMI'); }
  }
  function seqKey(code) {
    const m = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', KeyW: 'U', KeyS: 'D', KeyD: 'R', KeyB: 'B', KeyA: 'A' }[code];
    if (m) seqTok(m);
    if (/^Key[A-Z]$/.test(code)) {
      typed = (typed + code[3]).slice(-16);
      for (const c of TEXT_CODES) if (typed.endsWith(c)) { typed = ''; fireCheat(c); }
    }
  }
  function fireCheat(c) { cheatCbs.forEach((cb) => { try { cb(c); } catch (err) { console.error(err); } }); }

  // ---------------- pointer (touch) ----------------
  function toLogical(cx, cy) {
    if (!canvas || !S.Main) return { x: cx, y: cy };
    const r = canvas.getBoundingClientRect();
    return { x: (cx - r.left) / r.width * S.Main.W, y: (cy - r.top) / r.height * S.Main.H };
  }
  // aim: layout is cached (it is queried every frame by drawTouch/touchHeld). With the aim stick on, the buttons move to a
  // compact strip on the far side so the thumb zone next to it stays free: sticks left half, aim stick right half.
  let layC = null, layKey = '';
  function touchLayout(W, H) {
    const s = settings() ? settings().touch : { size: 1, leftHanded: false, stick: 'floating' };
    const k = s.size || 1, L = !!s.leftHanded, aimOn = s.aimStick !== false;
    const key = W + '|' + H + '|' + k + '|' + L + '|' + aimOn + '|' + (s.stick === 'fixed');
    if (layC && key === layKey) return layC;
    layKey = key;
    const X = (x) => (L ? W - x : x);
    if (aimOn) {
      layC = {
        aimOn: true,
        fire: { x: X(W - 142 * k), y: H - 100 * k, r: 32 * k, label: 'FIRE', color: '#ff3b3b' },
        jump: { x: X(W - 58 * k), y: H - 58 * k, r: 40 * k, label: 'JUMP', color: '#3bb4ff' },
        special: { x: X(W - 58 * k), y: H - 218 * k, r: 28 * k, label: 'SPEC', color: '#ffb81c' },
        melee: { x: X(W - 58 * k), y: H - 148 * k, r: 28 * k, label: 'WHAP', color: '#5fd35f' },
        cycle: { x: X(W - 142 * k), y: H - 172 * k, r: 22 * k, label: '↻', color: '#c77dff' },
        pause: { x: X(W - 34), y: 34, r: 22, label: 'II', color: '#ffffff' },
        stickZone: { x0: L ? W * 0.5 : 0, x1: L ? W : W * 0.5 },
        aimZone: { x0: L ? 0 : W * 0.5, x1: L ? W * 0.5 : W },
        fixed: { x: X(112 * k), y: H - 112 * k },
        aimFixed: { x: X(W - 112 * k), y: H - 112 * k },
        stickR: 58 * k,
      };
    } else {
      layC = {
        aimOn: false,
        fire: { x: X(W - 92 * k), y: H - 92 * k, r: 50 * k, label: 'FIRE', color: '#ff3b3b' },
        jump: { x: X(W - 202 * k), y: H - 58 * k, r: 40 * k, label: 'JUMP', color: '#3bb4ff' },
        special: { x: X(W - 64 * k), y: H - 204 * k, r: 34 * k, label: 'SPEC', color: '#ffb81c' },
        melee: { x: X(W - 186 * k), y: H - 166 * k, r: 31 * k, label: 'WHAP', color: '#5fd35f' },
        cycle: { x: X(W - 282 * k), y: H - 40 * k, r: 23 * k, label: '↻', color: '#c77dff' },
        pause: { x: X(W - 34), y: 34, r: 22, label: 'II', color: '#ffffff' },
        stickZone: { x0: L ? W * 0.55 : 0, x1: L ? W : W * 0.45 },
        aimZone: { x0: 0, x1: 0 },
        fixed: { x: X(112 * k), y: H - 112 * k },
        aimFixed: { x: 0, y: 0 },
        stickR: 58 * k,
      };
    }
    return layC;
  }
  const BTN_NAMES = ['fire', 'jump', 'special', 'melee', 'cycle', 'pause'];
  function hitButton(p) {
    if (!S.Main) return null;
    const lay = touchLayout(S.Main.W, S.Main.H);
    for (const n of BTN_NAMES) {
      const b = lay[n];
      if (Math.hypot(p.x - b.x, p.y - b.y) <= b.r * 1.25) return n;
    }
    return null;
  }
  function onPointerDown(e) {
    if (e.pointerType === 'mouse') return;
    if (S.Audio && S.Audio.unlock) S.Audio.unlock();
    touch.used = true; lastDevice = 'touch'; touch.t = nowMs(); aimDev = 'touch';
    if (!S.Main || S.Main.mode !== 'play') return;
    e.preventDefault();
    const p = toLogical(e.clientX, e.clientY);
    const b = hitButton(p);
    if (b) { touch.ids[e.pointerId] = b; touch.btn[b] = true; pressQ.add('Touch' + b); return; }
    const lay = touchLayout(S.Main.W, S.Main.H);
    if (touch.stickId === null && p.x >= lay.stickZone.x0 && p.x <= lay.stickZone.x1) {
      touch.stickId = e.pointerId;
      const fixed = settings() && settings().touch.stick === 'fixed';
      touch.sx = fixed ? lay.fixed.x : p.x; touch.sy = fixed ? lay.fixed.y : p.y;
      touch.dx = fixed ? p.x - touch.sx : 0; touch.dy = fixed ? p.y - touch.sy : 0;
    } else if (lay.aimOn && touch.aimId === null && p.x >= lay.aimZone.x0 && p.x <= lay.aimZone.x1) {
      touch.aimId = e.pointerId; touch.ax0 = p.x; touch.ay0 = p.y; touch.adx = 0; touch.ady = 0;
    }
  }
  function dragStick(p, id) { // shared floating-stick drag: returns nothing, updates touch.(s|a)x / d(x|y)
    const lay = touchLayout(S.Main.W, S.Main.H), R = lay.stickR;
    const aim = id === touch.aimId;
    let dx = p.x - (aim ? touch.ax0 : touch.sx), dy = p.y - (aim ? touch.ay0 : touch.sy);
    const d = Math.hypot(dx, dy);
    if (d > R) { // drag the floating base along
      if (aim) { touch.ax0 += dx * (1 - R / d); touch.ay0 += dy * (1 - R / d); }
      else if (!(settings() && settings().touch.stick === 'fixed')) { touch.sx += dx * (1 - R / d); touch.sy += dy * (1 - R / d); }
      dx = dx / d * R; dy = dy / d * R;
    }
    if (aim) { touch.adx = dx; touch.ady = dy; } else { touch.dx = dx; touch.dy = dy; }
  }
  function onPointerMove(e) {
    if (e.pointerType === 'mouse') return;
    if (e.pointerId === touch.stickId || e.pointerId === touch.aimId) {
      touch.t = nowMs();
      dragStick(toLogical(e.clientX, e.clientY), e.pointerId);
    } else if (touch.ids[e.pointerId]) {
      // slide between buttons
      const p = toLogical(e.clientX, e.clientY);
      const b = hitButton(p), old = touch.ids[e.pointerId];
      if (b && b !== old && b !== 'pause') { touch.btn[old] = false; touch.btn[b] = true; touch.ids[e.pointerId] = b; pressQ.add('Touch' + b); }
    }
  }
  function onPointerUp(e) {
    if (e.pointerType === 'mouse') return;
    touch.t = nowMs();
    if (e.pointerId === touch.stickId) { touch.stickId = null; touch.dx = touch.dy = 0; }
    if (e.pointerId === touch.aimId) { touch.aimId = null; touch.adx = touch.ady = 0; }
    const b = touch.ids[e.pointerId];
    if (b) { touch.btn[b] = false; delete touch.ids[e.pointerId]; }
  }

  // ---------------- gamepad ----------------
  function getPad() {
    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    for (const p of pads) if (p && p.connected) return p;
    return null;
  }
  function pollPad() {
    const p = getPad();
    for (let i = 0; i < 17; i++) padPrev[i] = padBtn[i];
    if (!p) { padAxes[0] = padAxes[1] = padAxes[2] = padAxes[3] = 0; rsx = rsy = 0; for (let i = 0; i < 17; i++) padBtn[i] = false; return; }
    for (let i = 0; i < 17; i++) {
      const b = p.buttons[i];
      padBtn[i] = !!(b && (b.pressed || b.value > 0.45));
    }
    const dz = settings() ? settings().deadzone : 0.25;
    // left stick: per-axis dead zone (movement + 8-way aim); right stick (axes 2,3): radial dead zone for 360-degree aim
    padAxes[0] = Math.abs(p.axes[0] || 0) < dz ? 0 : p.axes[0]; padAxes[1] = Math.abs(p.axes[1] || 0) < dz ? 0 : p.axes[1];
    padAxes[2] = p.axes[2] || 0; padAxes[3] = p.axes[3] || 0;
    rsx = padAxes[2]; rsy = padAxes[3];
    let any = padAxes[0] !== 0 || padAxes[1] !== 0;
    const rm = Math.hypot(rsx, rsy), ad = cfgv('aimDead');
    let edge = false;
    if (rm > Math.max(0.12, ad)) { padRSeen = true; any = true; aimDev = 'pad'; }
    for (let i = 0; i < 17; i++) {
      if (padBtn[i]) any = true;
      if (padBtn[i] && !padPrev[i]) {
        edge = true;
        if (captureP) { const cb = captureP; captureP = null; cb(i); }
        const m = { 12: 'U', 13: 'D', 14: 'L', 15: 'R', 1: 'B', 0: 'A' }[i];
        if (m) seqTok(m);
      }
    }
    if (any) lastDevice = 'pad';
    if ((any && !padAnyPrev) || edge) aimDev = 'pad'; // aim: pad takes over on a new press / stick push (not every frame, so pad-move + mouse-aim works)
    padAnyPrev = any;
  }

  function padHeld(a) {
    const bl = pbinds(a);
    for (const b of bl) if (b >= 0 && padBtn[b]) return true;
    if (a === 'left') return padAxes[0] < -0.35;
    if (a === 'right') return padAxes[0] > 0.35;
    if (a === 'up') return padAxes[1] < -0.55;
    if (a === 'down') return padAxes[1] > 0.55;
    if (a === 'confirm') return padBtn[0];
    if (a === 'back') return padBtn[1];
    return false;
  }
  function touchHeld(a) {
    if (!touch.used) return false;
    if (touch.btn[a]) return true;
    const R = S.Main ? touchLayout(S.Main.W, S.Main.H).stickR : 58;
    if (a === 'left') return touch.dx < -R * 0.3;
    if (a === 'right') return touch.dx > R * 0.3;
    if (a === 'up') return touch.dy < -R * 0.55;
    if (a === 'down') return touch.dy > R * 0.55;
    return false;
  }
  function kbHeld(a) {
    if (a === 'confirm' || a === 'back') return MENU_KEYS[a].some((c) => keysDown.has(c));
    const tw = twinKeys();
    return binds(a).some((c) => c && keysDown.has(c) && !(tw && ARROWS.has(c)));
  }
  function kbPressedQ(a) {
    if (a === 'confirm' || a === 'back') return MENU_KEYS[a].some((c) => pressQ.has(c));
    if (pressQ.has('Touch' + a)) return true;
    const tw = twinKeys();
    return binds(a).some((c) => c && pressQ.has(c) && !(tw && ARROWS.has(c)));
  }

  // ---------------- aim helpers ----------------
  function touchAimOn() { const t = settings() && settings().touch; return !t || t.aimStick !== false; }
  // which aim scheme is live: 'mouse' | 'stick' (right stick / touch aim stick) | 'keys' (8-way from move keys, left stick, d-pad or arrows)
  function aimMode() {
    const a = cfgv('aim');
    if (a === 'mouse' || a === 'keys' || a === 'stick') return a;
    if (aimDev === 'mouse') return 'mouse';
    if (aimDev === 'touch') return touchAimOn() ? 'stick' : 'keys';
    if (aimDev === 'pad') return padRSeen ? 'stick' : 'keys';
    return 'keys';
  }
  function computeAim() {
    aimStick.active = false;
    const M = S.Main;
    if (touch.used && touch.aimId !== null && M) {
      const R = touchLayout(M.W, M.H).stickR, m = Math.hypot(touch.adx, touch.ady) / R;
      if (m > 0.18) { aimStick.x = touch.adx / (m * R); aimStick.y = touch.ady / (m * R); aimStick.mag = Math.min(1, (m - 0.18) / 0.82); aimStick.active = true; aimStick.src = 'touch'; }
    }
    if (!aimStick.active) {
      const m = Math.hypot(rsx, rsy), dz = Math.max(0.1, Number(cfgv('aimDead')) || 0.2);
      if (m > dz) { aimStick.x = rsx / m; aimStick.y = rsy / m; aimStick.mag = Math.min(1, (m - dz) / (1 - dz)); aimStick.active = true; aimStick.src = 'pad'; }
    }
    kbAim.x = (keysDown.has('ArrowRight') ? 1 : 0) - (keysDown.has('ArrowLeft') ? 1 : 0);
    kbAim.y = (keysDown.has('ArrowDown') ? 1 : 0) - (keysDown.has('ArrowUp') ? 1 : 0);
    aimFireNow = false; // 'fire when the aim stick is pushed' (pad: off by default, touch: on)
    if (aimStick.active && aimStick.mag > 0.3 && aimMode() === 'stick') {
      aimFireNow = aimStick.src === 'touch' ? !(settings() && settings().touch.aimFire === false) : !!cfgv('padAimFire');
    }
  }
  function syncCursor() { // hide the system cursor only while playing with mouse aim (the crosshair replaces it)
    const M = S.Main;
    const want = !!(M && M.mode === 'play' && aimMode() === 'mouse' && !(touch.used && aimDev === 'touch'));
    if (want !== cursorHidden) { cursorHidden = want; if (document.body) document.body.classList.toggle('sd-nocursor', want); }
  }

  const Input = S.Input = {
    ACTIONS,
    get defaults() { return { keys: S.Save.DEFAULT_KEYS, pad: S.Save.DEFAULT_PAD }; },
    get touchOn() { return !!(touch.used || (S.Main && S.Main.flags && S.Main.flags.touch)); },
    touch, mouse, aimStick, kbAim, aimMode, setCursor, cursorMove, cfg: cfgv,
    get aimDevice() { return aimDev; },
    get kbTwin() { return twinKeys(); },
    get padRSeen() { return padRSeen; },
    get aimFiring() { return aimFireNow; },
    // aim assist cone half-angle in radians (0 = off); the mouse only gets it when aimAssistMouse is on
    assistCone() { if (aimMode() === 'mouse' && !cfgv('aimAssistMouse')) return 0; const a = cfgv('aimAssist'); return a === 'high' ? 0.384 : a === 'low' ? 0.209 : 0; },
    init(cv) {
      canvas = cv;
      window.addEventListener('keydown', onKeyDown, { passive: false });
      window.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', () => { keysDown.clear(); for (const k in touch.btn) touch.btn[k] = false; });
      cv.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      cv.addEventListener('wheel', onWheel, { passive: false });
      cv.addEventListener('contextmenu', (e) => e.preventDefault());
      cv.addEventListener('pointerdown', onPointerDown, { passive: false });
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
      window.addEventListener('gamepadconnected', () => { if (S.UI && S.UI.toast) S.UI.toast('CONTROLLER CONNECTED - LET\'S DOOSH'); });
      document.addEventListener('pointerlockchange', () => {
        mouse.locked = !!document.pointerLockElement;
        if (!document.pointerLockElement && S.Main && S.Main.mode === 'play' && S.Game && S.Game.pause) S.Game.pause();
      });
    },
    update() {
      pollPad();
      computeAim();
      for (const a of ACTIONS) {
        prev[a] = held[a];
        held[a] = !!(sim[a] || kbHeld(a) || padHeld(a) || touchHeld(a) || (a === 'fire' && aimFireNow));
      }
      syncCursor();
    },
    endFrame() { pressQ.clear(); for (const a of ACTIONS) Input._edge[a] = false; },
    _edge: {},
    down(a) { return !!held[a]; },
    pressed(a) { return (held[a] && !prev[a]) || kbPressedQ(a) || !!Input._edge[a]; },
    released(a) { return !held[a] && prev[a]; },
    axisX() {
      if (touch.used && touch.stickId !== null && S.Main) { const R = touchLayout(S.Main.W, S.Main.H).stickR; if (Math.abs(touch.dx) > R * 0.3) return S.U.clamp(touch.dx / R, -1, 1); }
      if (Math.abs(padAxes[0]) > 0.35) return padAxes[0];
      return (held.right ? 1 : 0) - (held.left ? 1 : 0);
    },
    device() { return lastDevice; },
    // test hook: hold/release an action programmatically, or pulse a press
    setSim(a, on) { sim[a] = !!on; },
    tap(a) { Input._edge[a] = true; held[a] = true; },
    clearSim() { for (const k in sim) sim[k] = false; },
    bindKey(action, slot, code) {
      const s = settings(); if (!s) return;
      // swap away duplicates so one key never does two jobs
      for (const a of ACTIONS) { const arr = s.keys[a]; if (!arr) continue; for (let i = 0; i < arr.length; i++) if (arr[i] === code && !(a === action && i === slot)) arr[i] = (s.keys[action] || [])[slot] || ''; }
      if (!s.keys[action]) s.keys[action] = ['', ''];
      s.keys[action][slot] = code;
      S.Save.save();
    },
    bindPad(action, slot, btn) {
      const s = settings(); if (!s) return;
      for (const a of ACTIONS) { const arr = s.pad[a]; if (!arr) continue; for (let i = 0; i < arr.length; i++) if (arr[i] === btn && !(a === action && i === slot)) arr[i] = (s.pad[action] || [])[slot] ?? -1; }
      if (!s.pad[action]) s.pad[action] = [-1, -1];
      s.pad[action][slot] = btn;
      S.Save.save();
    },
    captureKey(cb) { captureK = cb; },
    capturePad(cb) { captureP = cb; },
    cancelCapture() { captureK = captureP = null; },
    lockMouse(on) {
      try {
        if (on) {
          const s = settings();
          if (s && s.mouseLock && s.aim !== 'stick' && s.aim !== 'keys' && canvas && canvas.requestPointerLock && !(S.Main && S.Main.device.touch) && !document.pointerLockElement) {
            const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {});
          }
        } else if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock();
      } catch (e) { /* ignore */ }
    },
    vibrate(ms, strength) {
      const s = settings(); if (s && !s.vibrate) return;
      const p = getPad();
      const st = strength == null ? 0.6 : strength;
      try {
        if (p && p.vibrationActuator && p.vibrationActuator.playEffect) p.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: st, weakMagnitude: st * 0.7 });
        else if (lastDevice === 'touch' && navigator.vibrate) navigator.vibrate(Math.min(ms, 60));
      } catch (e) { /* ignore */ }
    },
    onCheatSeq(cb) { cheatCbs.push(cb); },
    // Applies a cheat code ('KONAMI' or a text code). Returns a toast string, or null if unknown.
    applyCheat(code) {
      if (!S.Save) return null;
      const c = S.Save.data.cheats; code = String(code || '').toUpperCase().replace(/\s+/g, '');
      let msg = null;
      if (code === 'KONAMI' || code === 'DOOSHFOREVER') { c.infLives = !c.infLives; msg = c.infLives ? 'INFINITE DUDES! (cheater)' : 'INFINITE DUDES OFF'; }
      else if (code === 'BIGHEADS') { c.bigHeads = !c.bigHeads; msg = c.bigHeads ? 'BIG HEAD MODE!' : 'NORMAL HEADS (boring)'; }
      else if (code === 'MOONWALK') { c.moon = !c.moon; msg = c.moon ? 'MOON GRAVITY EVERYWHERE!' : 'GRAVITY RESTORED'; }
      else if (code === 'GIBLETS') { c.gore = !c.gore; msg = c.gore ? 'MAXIMUM GIBLETS!' : 'GIBLETS: NORMAL'; }
      else if (code === 'PEWPEWPEW') { c.pew = !c.pew; msg = c.pew ? 'EVERYBODY GETS DUAL PISTOLS!' : 'PEW MODE OFF'; }
      if (msg) { S.Save.save(); if (S.Audio && S.Audio.sfx) S.Audio.sfx('powerup'); }
      return msg;
    },
    keyName(code) {
      if (!code) return '---';
      const special = { Space: 'SPACE', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Mouse0: 'L-CLICK', Mouse1: 'M-CLICK', Mouse2: 'R-CLICK', Mouse3: 'MOUSE4', Mouse4: 'MOUSE5', Escape: 'ESC', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', ControlLeft: 'L-CTRL', ControlRight: 'R-CTRL', AltLeft: 'L-ALT', AltRight: 'R-ALT', Enter: 'ENTER', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Backquote: '`', Tab: 'TAB', Backspace: 'BKSP' };
      if (special[code]) return special[code];
      if (/^Key[A-Z]$/.test(code)) return code[3];
      if (/^Digit\d$/.test(code)) return code[5];
      if (/^Numpad/.test(code)) return 'NUM ' + code.slice(6);
      return code.toUpperCase();
    },
    padName(btn) {
      return ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'BACK', 'START', 'L3', 'R3', 'D↑', 'D↓', 'D←', 'D→', 'HOME'][btn] || (btn >= 0 ? 'B' + btn : '---');
    },
    padConnected() { return !!getPad(); },
    layout: touchLayout,
    toLogical,
    drawTouch(ctx, W, H) {
      if (!Input.touchOn) return;
      const st = settings() ? settings().touch : { opacity: 0.55, stick: 'floating' };
      const lay = touchLayout(W, H);
      const ink = (S.C && S.C.INK) || '#141018';
      ctx.save();
      ctx.globalAlpha = st.opacity == null ? 0.55 : st.opacity;
      ctx.lineWidth = 4;
      // move stick
      const fixed = st.stick === 'fixed';
      const active = touch.stickId !== null;
      if (active || fixed) {
        const bx = active ? touch.sx : lay.fixed.x, by = active ? touch.sy : lay.fixed.y;
        ctx.beginPath(); ctx.arc(bx, by, lay.stickR, 0, S.U.TAU);
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
        ctx.beginPath(); ctx.arc(bx + (active ? touch.dx : 0), by + (active ? touch.dy : 0), lay.stickR * 0.45, 0, S.U.TAU);
        ctx.fillStyle = '#ffe14d'; ctx.fill(); ctx.stroke();
      } else {
        ctx.font = '16px Bangers, Impact, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
        ctx.fillText('DRAG TO MOVE', (lay.stickZone.x0 + lay.stickZone.x1) / 2, H - 40);
      }
      // aim: right-side aim stick (floating, red) + hint text while idle
      if (lay.aimOn) {
        const aon = touch.aimId !== null;
        if (aon) {
          ctx.beginPath(); ctx.arc(touch.ax0, touch.ay0, lay.stickR, 0, S.U.TAU);
          ctx.fillStyle = 'rgba(255,80,80,0.18)'; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
          ctx.beginPath(); ctx.arc(touch.ax0 + touch.adx, touch.ay0 + touch.ady, lay.stickR * 0.45, 0, S.U.TAU);
          ctx.fillStyle = aimStick.active && aimFireNow ? '#ffffff' : '#ff7a7a'; ctx.fill(); ctx.stroke();
        } else {
          ctx.font = '16px Bangers, Impact, sans-serif'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
          const k = st.size || 1, cx = (lay.aimZone.x0 + lay.aimZone.x1) / 2 + (lay.fire.x > W / 2 ? -70 * k : 70 * k);
          ctx.fillText(st.aimFire === false ? 'DRAG TO AIM' : 'DRAG TO AIM + FIRE', cx, H - 40);
        }
      }
      for (const n of BTN_NAMES) {
        const b = lay[n];
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, S.U.TAU);
        ctx.fillStyle = touch.btn[n] ? '#ffffff' : b.color; ctx.fill(); ctx.strokeStyle = ink; ctx.stroke();
        ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = Math.round(b.r * 0.55) + 'px Bangers, Impact, sans-serif';
        ctx.fillText(b.label, b.x, b.y + 1);
      }
      ctx.restore();
    },
  };
})();
