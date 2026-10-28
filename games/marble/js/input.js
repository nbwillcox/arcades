/* Input: keyboard, gamepad, mouse steering, a floating touch stick, and device tilt. Everything ends up as one analog screen-space vector (I.ix right, I.iy down, length <= 1). */
(function (G) {
  'use strict';
  const U = G.U, S = G.settings;
  const I = { ix: 0, iy: 0, left: false, right: false, up: false, down: false, _pause: false, _any: false, _restart: false, pad: false, tilt: { ok: false, on: false, x: 0, y: 0, nx: 0, ny: 0, bx: 0, by: 0, has: false, perm: 'unknown' }, stick: { on: false, x: 0, y: 0 }, mouse: { down: false, x: 0, y: 0 }, ref: { x: 0, y: 0 } };
  const typing = (t) => { const n = t && t.tagName; return n === 'INPUT' || n === 'TEXTAREA' || n === 'SELECT'; };
  const MAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };

  window.addEventListener('keydown', (e) => {
    if (typing(e.target)) return;
    if (!e.repeat && !e.metaKey && !e.ctrlKey && e.key !== 'Shift' && e.key !== 'Alt') I._any = true;          /* any key skips the fly-over */
    const m = MAP[e.code];
    if (m) I[m] = true;
    else if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) I._pause = true;
    else if (e.code === 'KeyR' && !e.repeat) I._restart = true;
    else if (e.code === 'KeyC' && !e.repeat) I.calibrate();
    else return;
    if (e.target.tagName !== 'BUTTON') e.preventDefault();
    if (!e.repeat) I._any = true;
  });
  window.addEventListener('keyup', (e) => { const m = MAP[e.code]; if (m) I[m] = false; });
  window.addEventListener('blur', () => { I.left = I.right = I.up = I.down = false; I.mouse.down = false; });

  /* ---------- mouse: hold a button and the marble rolls towards the pointer ---------- */
  I.bind = function (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') { if (e.button === 0) { I.mouse.down = true; I.mouse.x = e.clientX; I.mouse.y = e.clientY; } I._any = true; e.preventDefault(); }
      else touchDown(e);
    });
    window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { I.mouse.x = e.clientX; I.mouse.y = e.clientY; } else touchMove(e); });
    window.addEventListener('pointerup', (e) => { if (e.pointerType === 'mouse') I.mouse.down = false; else touchUp(e); });
    window.addEventListener('pointercancel', (e) => { if (e.pointerType !== 'mouse') touchUp(e); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  };

  /* ---------- floating thumb stick (used when the device has no tilt sensor, or by choice) ---------- */
  let stickId = null, sx0 = 0, sy0 = 0, stickEl = null, knobEl = null;
  function stickUi() {
    if (stickEl) return;
    stickEl = document.createElement('div'); stickEl.className = 'mstick'; knobEl = document.createElement('div'); knobEl.className = 'mknob'; stickEl.appendChild(knobEl);
    document.body.appendChild(stickEl);
  }
  function touchDown(e) {
    I._any = true;
    if (!I.useStick() || stickId !== null) return;
    stickUi();
    stickId = e.pointerId; sx0 = e.clientX; sy0 = e.clientY; I.stick.on = true; I.stick.x = I.stick.y = 0;
    stickEl.style.display = 'block'; stickEl.style.left = sx0 + 'px'; stickEl.style.top = sy0 + 'px'; knobEl.style.transform = 'translate(-50%,-50%)';
    e.preventDefault();
  }
  function touchMove(e) {
    if (e.pointerId !== stickId) return;
    const R = 62, dx = e.clientX - sx0, dy = e.clientY - sy0, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / R);
    I.stick.x = dx / d * k; I.stick.y = dy / d * k;
    if (d > R * 1.6) { const f = (d - R * 1.6) / d; sx0 += dx * f; sy0 += dy * f; stickEl.style.left = sx0 + 'px'; stickEl.style.top = sy0 + 'px'; }      /* the stick follows a thumb that drifts */
    knobEl.style.transform = 'translate(calc(-50% + ' + (I.stick.x * R) + 'px), calc(-50% + ' + (I.stick.y * R) + 'px))';
    e.preventDefault();
  }
  function touchUp(e) {
    if (e.pointerId !== stickId) return;
    stickId = null; I.stick.on = false; I.stick.x = I.stick.y = 0;
    if (stickEl) stickEl.style.display = 'none';
  }
  I.hideStick = () => { stickId = null; I.stick.on = false; I.stick.x = I.stick.y = 0; if (stickEl) stickEl.style.display = 'none'; };

  /* ---------- tilt ---------- */
  const T = I.tilt;
  function angle() {
    let a = 0;
    try { a = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (typeof window.orientation === 'number' ? window.orientation : 0); } catch (e) { a = 0; }
    return ((a % 360) + 360) % 360;
  }
  function onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    const a = angle(), b = e.beta, g = e.gamma;
    let x, y;
    if (a === 90) { x = b; y = -g; } else if (a === 270) { x = -b; y = g; } else if (a === 180) { x = -g; y = -b; } else { x = g; y = b; }
    if (!T.has) { T.has = true; T.nx = x; T.ny = y; T.x = x; T.y = y; T.ok = true; }
    T.x += (x - T.x) * 0.35; T.y += (y - T.y) * 0.35;               /* light smoothing */
    T.raw = [e.beta, e.gamma];
  }
  I.calibrate = function () { if (T.has) { T.nx = T.x; T.ny = T.y; } };
  /* iOS asks for permission, and only inside a tap */
  I.requestTilt = function () {
    if (T.on || typeof window.DeviceOrientationEvent === 'undefined') return Promise.resolve(false);
    const start = () => { window.addEventListener('deviceorientation', onOrient, true); T.on = true; T.perm = 'granted'; return true; };
    const DOE = window.DeviceOrientationEvent;
    if (typeof DOE.requestPermission === 'function') {
      return DOE.requestPermission().then((r) => (r === 'granted' ? start() : ((T.perm = 'denied'), false)), () => { T.perm = 'denied'; return false; });
    }
    return Promise.resolve(start());
  };
  window.addEventListener('orientationchange', () => { setTimeout(() => { if (T.has) { T.has = false; } }, 250); });          /* axes swap: re-learn the neutral pose */

  I.touchDevice = () => !!(window.TK && window.TK.on);
  I.useStick = () => {
    if (!I.touchDevice() && S.control !== 'stick') return false;
    if (S.control === 'stick') return true;
    if (S.control === 'tilt') return !T.has;
    return !T.has || T.perm === 'denied';                               /* auto: tilt when the sensor answers, stick otherwise */
  };
  I.usingTilt = () => I.touchDevice() && T.has && !I.useStick();

  /* ---------- gamepad ---------- */
  let padStart = false, padB = false, padX = false;
  I.padX = 0; I.padY = 0;
  I.poll = function () {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    I.padX = I.padY = 0;
    for (const p of pads) {
      if (!p || !p.connected) continue;
      const b = p.buttons, ax = p.axes;
      let x = ax.length ? ax[0] : 0, y = ax.length > 1 ? ax[1] : 0;
      if (b[14] && b[14].pressed) x = -1; else if (b[15] && b[15].pressed) x = 1;
      if (b[12] && b[12].pressed) y = -1; else if (b[13] && b[13].pressed) y = 1;
      const m = Math.hypot(x, y);
      if (m > 0.14) { const k = Math.min(1, (m - 0.14) / 0.8) / m; I.padX = x * k; I.padY = y * k; I.pad = true; }
      const st = !!(b[9] && b[9].pressed);
      if (st && !padStart) { I._pause = true; I._any = true; }
      padStart = st;
      const bb = !!(b[2] && b[2].pressed);
      if (bb && !padB) I.calibrate();
      padB = bb;
      const xx = !!(b[3] && b[3].pressed);
      if (xx && !padX) I._restart = true;
      padX = xx;
      break;
    }
  };

  /* the combined steering vector for this frame */
  I.update = function () {
    let x = (I.right ? 1 : 0) - (I.left ? 1 : 0), y = (I.down ? 1 : 0) - (I.up ? 1 : 0);
    if (x && y) { x *= 0.7071; y *= 0.7071; }
    x += I.padX; y += I.padY;
    if (I.stick.on && I.useStick()) { x += I.stick.x; y += I.stick.y; }
    if (I.usingTilt()) {
      const range = 24 / U.clamp(S.tiltSens || 1, 0.4, 2.5), dead = 1.4;
      let tx = (T.x - T.nx) * (S.tiltInvert ? -1 : 1), ty = (T.y - T.ny) * (S.tiltInvert ? -1 : 1);
      const m = Math.hypot(tx, ty);
      if (m > dead) { const k = Math.min(1, (m - dead) / (range - dead)) / m; tx *= k; ty *= k; } else tx = ty = 0;
      T.x2 = tx; T.y2 = ty;
      x += tx; y += ty;
    }
    if (I.mouse.down && S.mouseSteer) {
      const dx = I.mouse.x - I.ref.x, dy = I.mouse.y - I.ref.y, d = Math.hypot(dx, dy);
      if (d > 8) { const k = Math.min(1, (d - 8) / 150) / d; x += dx * k; y += dy * k; }
    }
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    I.ix = x; I.iy = y;
  };
  I.takePause = () => { const b = I._pause; I._pause = false; return b; };
  I.takeRestart = () => { const b = I._restart; I._restart = false; return b; };
  I.clear = () => { I.left = I.right = I.up = I.down = false; I.ix = I.iy = 0; I._pause = false; I._any = false; I._restart = false; I.mouse.down = false; I.hideStick(); };
  I.resync = () => { I._pause = false; };

  G.input = I;
})((window.SGS = window.SGS || {}));
