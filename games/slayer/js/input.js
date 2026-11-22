/* input: rebindable keyboard, mouse/touch (virtual-resolution coords), gamepad with rebindable buttons, floating/fixed touch stick, haptics */
(function () {
  var W = CS.W, H = CS.H;
  var In = CS.In = { keys: {}, held: {}, p: {}, mx: -1, my: -1, taps: [], joy: { on: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 }, joyEnabled: false, pad: null, padPrev: [], lastDev: 'kb', canvas: null, listen: null, map: {}, noJoy: [],
    touch: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0), fixedBase: { x: 120, y: H - 120 } };

  /* ---------- bindings ---------- */
  In.ACTIONS = [['up', 'MOVE UP'], ['down', 'MOVE DOWN'], ['left', 'MOVE LEFT'], ['right', 'MOVE RIGHT'], ['confirm', 'CONFIRM'], ['back', 'BACK'], ['pause', 'PAUSE / MENU'], ['reroll', 'REROLL CARDS'], ['dash', 'DASH']];
  In.DEF_KEYS = { up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'], confirm: ['Enter', 'Space'], back: ['Backspace', ''], pause: ['Escape', 'KeyP'], reroll: ['KeyR', ''], dash: ['ShiftLeft', 'Space'] };
  In.DEF_PAD = { confirm: 0, back: 1, pause: 9, reroll: 3, dash: 2 };
  In.PAD_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START', 'L3', 'R3', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'HOME'];
  In.keyName = function (c) {
    if (!c) return '-- NONE --'; if (c.indexOf('Key') === 0) return c.slice(3); if (c.indexOf('Digit') === 0) return c.slice(5); if (c.indexOf('Arrow') === 0) return c.slice(5).toUpperCase();
    return ({ Space: 'SPACE', Enter: 'ENTER', Escape: 'ESC', Backspace: 'BKSP', ShiftLeft: 'L-SHIFT', ShiftRight: 'R-SHIFT', Tab: 'TAB', Slash: '/', Period: '.', Comma: ',', Semicolon: ';', Quote: "'", ControlLeft: 'L-CTRL', AltLeft: 'L-ALT' })[c] || c.toUpperCase();
  };
  In.keyb = null; In.padb = null;
  In.loadBindings = function () {
    var s = CS.save.d.set, k, a;
    s.keys = s.keys || {}; s.pad = s.pad || {}; In.keyb = {}; In.padb = {};
    for (a in In.DEF_KEYS) In.keyb[a] = (s.keys[a] && s.keys[a].length === 2) ? s.keys[a].slice() : In.DEF_KEYS[a].slice();
    for (a in In.DEF_PAD) In.padb[a] = s.pad[a] !== undefined ? s.pad[a] : In.DEF_PAD[a];
    In.map = {}; for (a in In.keyb) In.keyb[a].forEach(function (c) { if (c) (In.map[c] = In.map[c] || []).push(a); });
    // always-available fallbacks so nobody can lock themselves out of the menus
    function add(c, a) { var l = In.map[c] = In.map[c] || []; if (l.indexOf(a) < 0) l.push(a); }
    add('ArrowUp', 'up'); add('ArrowDown', 'down'); add('ArrowLeft', 'left'); add('ArrowRight', 'right'); add('Enter', 'confirm'); add('Escape', 'pause'); add('Escape', 'back'); add('Tab', 'pause');
  };
  In.saveBindings = function () { var s = CS.save.d.set; s.keys = {}; for (var a in In.keyb) s.keys[a] = In.keyb[a].slice(); s.pad = {}; for (var b in In.padb) s.pad[b] = In.padb[b]; CS.save.store(); In.loadBindings(); };
  In.setKey = function (action, slot, code) {
    var pair = { pause: 'back', back: 'pause' };
    for (var a in In.keyb) { if (a === action || a === pair[action]) continue; for (var i = 0; i < 2; i++) if (In.keyb[a][i] === code) In.keyb[a][i] = ''; }
    In.keyb[action][slot] = code; In.saveBindings();
  };
  In.setPad = function (action, idx) { for (var a in In.padb) if (a !== action && In.padb[a] === idx && !(a === 'back' || action === 'back')) In.padb[a] = -1; In.padb[action] = idx; In.saveBindings(); };
  In.resetKeys = function () { CS.save.d.set.keys = {}; In.loadBindings(); CS.save.store(); };
  In.resetPad = function () { CS.save.d.set.pad = {}; In.loadBindings(); CS.save.store(); };

  window.addEventListener('keydown', function (e) {
    if (In.listen && In.listen.kind === 'key') { e.preventDefault(); var f = In.listen.cb; In.listen = null; f(e.code); return; }
    if (e.code === 'Space' || e.code.indexOf('Arrow') === 0 || e.code === 'Tab') e.preventDefault();
    In.lastDev = 'kb'; In.keys[e.code] = true;
    var acts = In.map[e.code]; if (acts) acts.forEach(function (a) { In.p[a] = true; In.held[a] = true; });
    if (e.code === 'Digit1') In.p.d1 = true; if (e.code === 'Digit2') In.p.d2 = true; if (e.code === 'Digit3') In.p.d3 = true;
  });
  window.addEventListener('keyup', function (e) { In.keys[e.code] = false; var acts = In.map[e.code]; if (acts) acts.forEach(function (a) { In.held[a] = false; }); });
  window.addEventListener('blur', function () { In.keys = {}; In.held = {}; In.p.blur = true; });

  In.attach = function (canvas) {
    In.canvas = canvas;
    function pos(e) { var r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; }
    canvas.addEventListener('pointermove', function (e) {
      var q = pos(e); In.mx = q.x; In.my = q.y; if (e.pointerType === 'mouse') In.lastDev = 'mouse';
      if (In.joy.on && e.pointerId === In.joy.id) { In.joy.x = q.x - In.joy.ox; In.joy.y = q.y - In.joy.oy; }
    });
    canvas.addEventListener('pointerdown', function (e) {
      var q = pos(e); In.mx = q.x; In.my = q.y; In.lastDev = e.pointerType === 'mouse' ? 'mouse' : 'touch';
      try { canvas.setPointerCapture(e.pointerId); } catch (_) { }
      var inNo = In.noJoy.some(function (nj) { return q.x >= nj.x && q.x < nj.x + nj.w && q.y >= nj.y && q.y < nj.y + nj.h; }), fixed = CS.save.d.set.stick === 'fixed';
      if (In.joyEnabled && e.pointerType !== 'mouse' && !In.joy.on && !inNo && (!fixed || q.x < W * 0.55)) {
        In.joy.on = true; In.joy.id = e.pointerId;
        if (fixed) { In.joy.ox = In.fixedBase.x; In.joy.oy = In.fixedBase.y; In.joy.x = q.x - In.joy.ox; In.joy.y = q.y - In.joy.oy; } else { In.joy.ox = q.x; In.joy.oy = q.y; In.joy.x = 0; In.joy.y = 0; }
      } else In.taps.push({ x: q.x, y: q.y });
      e.preventDefault();
    });
    function up(e) { if (In.joy.on && e.pointerId === In.joy.id) { In.joy.on = false; In.joy.x = In.joy.y = 0; } }
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  function dz(v) { var d = CS.save.d.set.deadzone || 0.2; return Math.abs(v) < d ? 0 : v; }
  In.poll = function () {
    var gps = navigator.getGamepads ? navigator.getGamepads() : [], g = null, i;
    for (i = 0; i < gps.length; i++) if (gps[i] && gps[i].connected) { g = gps[i]; break; }
    In.pad = g; if (!g) return;
    var b = g.buttons, prev = In.padPrev, any = false, pb = In.padb || In.DEF_PAD;
    function edge(idx) { return idx >= 0 && b[idx] && b[idx].pressed && !prev[idx]; }
    if (In.listen && In.listen.kind === 'pad') { for (i = 0; i < b.length; i++) if (edge(i)) { var f = In.listen.cb; In.listen = null; f(i); break; } for (i = 0; i < b.length; i++) prev[i] = b[i].pressed; return; }
    if (edge(pb.confirm)) In.p.confirm = true; if (edge(pb.back)) In.p.back = true; if (edge(pb.pause)) In.p.pause = true; if (edge(pb.reroll)) In.p.reroll = true; if (edge(pb.dash) || edge(5)) In.p.dash = true;
    if (edge(12)) In.p.up = true; if (edge(13)) In.p.down = true; if (edge(14)) In.p.left = true; if (edge(15)) In.p.right = true;
    if (edge(4)) In.p.d1 = true;
    var ax = g.axes[0] || 0, ay = g.axes[1] || 0, sx = Math.abs(ax) > 0.6 ? Math.sign(ax) : 0, sy = Math.abs(ay) > 0.6 ? Math.sign(ay) : 0;
    if (sx !== (prev.sx || 0) && sx) In.p[sx > 0 ? 'right' : 'left'] = true;
    if (sy !== (prev.sy || 0) && sy) In.p[sy > 0 ? 'down' : 'up'] = true;
    prev.sx = sx; prev.sy = sy;
    for (i = 0; i < b.length; i++) { prev[i] = b[i].pressed; if (b[i].pressed) any = true; }
    if (any || Math.abs(ax) > 0.3 || Math.abs(ay) > 0.3) In.lastDev = 'pad';
  };
  In.move = function () {
    var x = 0, y = 0, k = In.keys, h = In.held;
    if (h.left || k.ArrowLeft) x -= 1; if (h.right || k.ArrowRight) x += 1; if (h.up || k.ArrowUp) y -= 1; if (h.down || k.ArrowDown) y += 1;
    if (In.pad) { x += dz(In.pad.axes[0] || 0); y += dz(In.pad.axes[1] || 0); var b = In.pad.buttons; if (b[14] && b[14].pressed) x -= 1; if (b[15] && b[15].pressed) x += 1; if (b[12] && b[12].pressed) y -= 1; if (b[13] && b[13].pressed) y += 1; }
    if (In.joy.on) { x += In.joy.x / 45; y += In.joy.y / 45; }
    var l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
    return { x: x, y: y };
  };
  /* haptics: phone vibration + gamepad rumble */
  In.rumble = function (ms, strength) {
    if (CS.save.d.set.haptics === false) return;
    try { if (In.lastDev === 'touch' && navigator.vibrate) navigator.vibrate(ms);
      else if (In.pad && In.pad.vibrationActuator && In.pad.vibrationActuator.playEffect) In.pad.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength || 0.5, weakMagnitude: (strength || 0.5) * 0.6 }); } catch (e) { }
  };
  In.endFrame = function () { In.p = {}; In.taps.length = 0; };
})();
