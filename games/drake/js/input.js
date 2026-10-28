// Keyboard, mouse and gamepad -> one action state. Gamepad-first.
const KEY = {
  up: ['KeyW'], down: ['KeyS'], left: ['KeyA'], right: ['KeyD'],
  jump: ['Space'], flame: ['KeyJ'], charge: ['KeyK'], look: ['KeyE'], recenter: ['KeyQ'], pause: ['Escape', 'KeyP'],
  camL: ['ArrowLeft'], camR: ['ArrowRight'], camU: ['ArrowUp'], camD: ['ArrowDown'],
  confirm: ['Enter'], menuUp: ['ArrowUp'], menuDown: ['ArrowDown'], menuLeft: ['ArrowLeft'], menuRight: ['ArrowRight'],
};

export const KEYMAP = KEY;
export const KEY_DEFAULTS = JSON.parse(JSON.stringify(KEY));
export const ACTION_LABELS = {
  up: 'Move forward', down: 'Move back', left: 'Move left', right: 'Move right', jump: 'Jump / glide', flame: 'Flame', charge: 'Charge',
  look: 'Look around', recenter: 'Re-centre camera', pause: 'Pause', camL: 'Camera left', camR: 'Camera right', camU: 'Camera up', camD: 'Camera down',
};

const held = new Set();
let mdx = 0, mdy = 0;
const mouse = { 0: false, 2: false };
let locked = false;

const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };

const state = {
  mx: 0, my: 0,             // move stick, my>0 = forward
  csx: 0, csy: 0,           // camera stick (-1..1), csx>0 = look right, csy>0 = look down
  cdx: 0, cdy: 0,           // mouse delta px this frame
  jumpHeld: false, jumpPressed: false,
  flameHeld: false, flamePressed: false,
  chargeHeld: false, chargePressed: false,
  lookHeld: false, recenterPressed: false, pausePressed: false,
  confirmPressed: false, backPressed: false, navX: 0, navY: 0,
  usingPad: false, padName: '', padIndex: -1, axes: [], buttons: [], locked: false,
};
const prev = { jump: false, flame: false, charge: false, recenter: false, pause: false, confirm: false, back: false, navU: false, navD: false, navL: false, navR: false };
let nav = { x: 0, y: 0 };
let rumbleOK = true;

const isDown = (list) => list.some((c) => held.has(c));

function dz(x, y, d = 0.2) {
  const m = Math.hypot(x, y);
  if (m < d) return [0, 0];
  const s = Math.min(1, (m - d) / (1 - d)) / m;
  return [x * s, y * s];
}

export const Input = {
  state,
  init(canvas) {
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      held.add(e.code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      state.usingPad = false;
    });
    addEventListener('keyup', (e) => held.delete(e.code));
    addEventListener('blur', () => { held.clear(); mouse[0] = mouse[2] = false; });
    canvas.addEventListener('mousedown', (e) => {
      if (!locked && e.button === 0) { canvas.requestPointerLock && canvas.requestPointerLock(); return; }
      mouse[e.button] = true; state.usingPad = false;
    });
    addEventListener('mouseup', (e) => { mouse[e.button] = false; });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => { if (locked) { mdx += e.movementX; mdy += e.movementY; } });
    document.addEventListener('pointerlockchange', () => {
      locked = document.pointerLockElement === canvas;
      state.locked = locked;
      if (!locked) { mouse[0] = mouse[2] = false; Input.onUnlock && Input.onUnlock(); }
    });
    addEventListener('gamepadconnected', (e) => { state.usingPad = true; state.padName = e.gamepad.id; });
  },

  poll() {
    const s = state;
    // keyboard + mouse
    let kx = (isDown(KEY.right) ? 1 : 0) - (isDown(KEY.left) ? 1 : 0);
    let ky = (isDown(KEY.up) ? 1 : 0) - (isDown(KEY.down) ? 1 : 0);
    let ksx = (isDown(KEY.camR) ? 1 : 0) - (isDown(KEY.camL) ? 1 : 0);
    let ksy = (isDown(KEY.camD) ? 1 : 0) - (isDown(KEY.camU) ? 1 : 0);
    let jump = isDown(KEY.jump), flame = isDown(KEY.flame) || mouse[0], charge = isDown(KEY.charge) || mouse[2];
    let look = isDown(KEY.look), recenter = isDown(KEY.recenter), pause = isDown(KEY.pause);
    let confirm = isDown(KEY.confirm), back = held.has('Escape') || held.has('Backspace');
    let navU = isDown(KEY.menuUp) || held.has('KeyW'), navD = isDown(KEY.menuDown) || held.has('KeyS');
    let navL = isDown(KEY.menuLeft) || held.has('KeyA'), navR = isDown(KEY.menuRight) || held.has('KeyD');
    let cx = 0, cy = 0;
    s.cdx = mdx; s.cdy = mdy; mdx = mdy = 0;

    // gamepad
    const pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    let pad = null;
    for (const p of pads) if (p && p.connected) { pad = p; if (p.mapping === 'standard') break; }
    s.axes.length = 0; s.buttons.length = 0;
    if (pad) {
      s.padName = pad.id; s.padIndex = pad.index;
      const a = pad.axes, b = pad.buttons;
      const bt = (i) => !!(b[i] && (b[i].pressed || b[i].value > 0.5));
      const [lx, ly] = dz(a[0] || 0, a[1] || 0, 0.22);
      const [rx, ry] = dz(a[2] || 0, a[3] || 0, 0.2);
      for (let i = 0; i < a.length; i++) s.axes.push(a[i]);
      for (let i = 0; i < b.length; i++) s.buttons.push(bt(i) ? 1 : 0);
      let any = Math.abs(lx) + Math.abs(ly) + Math.abs(rx) + Math.abs(ry) > 0.01;
      for (let i = 0; i < b.length; i++) if (bt(i)) any = true;
      if (any) s.usingPad = true;
      cx += lx; cy += -ly; ksx += rx; ksy += ry;
      jump = jump || bt(BTN.A);
      flame = flame || bt(BTN.X) || bt(BTN.RT);
      charge = charge || bt(BTN.B) || bt(BTN.RB);
      look = look || bt(BTN.R3);
      recenter = recenter || bt(BTN.LT) || bt(BTN.LB);
      pause = pause || bt(BTN.START);
      confirm = confirm || bt(BTN.A);
      back = back || bt(BTN.B);
      navU = navU || bt(BTN.UP) || ly < -0.6; navD = navD || bt(BTN.DOWN) || ly > 0.6;
      navL = navL || bt(BTN.LEFT) || lx < -0.6; navR = navR || bt(BTN.RIGHT) || lx > 0.6;
    } else { s.padName = ''; s.padIndex = -1; }

    // combine move: keyboard digital + pad analog
    let mx = kx + cx, my = ky + cy;
    const m = Math.hypot(mx, my); if (m > 1) { mx /= m; my /= m; }
    s.mx = mx; s.my = my;
    s.csx = Math.max(-1, Math.min(1, ksx)); s.csy = Math.max(-1, Math.min(1, ksy));

    s.jumpPressed = jump && !prev.jump; s.jumpHeld = jump;
    s.flamePressed = flame && !prev.flame; s.flameHeld = flame;
    s.chargePressed = charge && !prev.charge; s.chargeHeld = charge;
    s.recenterPressed = recenter && !prev.recenter;
    s.pausePressed = pause && !prev.pause;
    s.confirmPressed = confirm && !prev.confirm;
    s.backPressed = back && !prev.back;
    s.lookHeld = look;
    s.navUp = navU && !prev.navU; s.navDown = navD && !prev.navD;
    s.navLeft = navL && !prev.navL; s.navRight = navR && !prev.navR;
    prev.jump = jump; prev.flame = flame; prev.charge = charge; prev.recenter = recenter; prev.pause = pause;
    prev.confirm = confirm; prev.back = back; prev.navU = navU; prev.navD = navD; prev.navL = navL; prev.navR = navR;
    return s;
  },

  rumbleOn: true,
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (!rumbleOK || !Input.rumbleOn || state.padIndex < 0) return;
    const p = navigator.getGamepads()[state.padIndex];
    const a = p && p.vibrationActuator;
    if (!a || !a.playEffect) return;
    a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => { rumbleOK = false; });
  },
};
