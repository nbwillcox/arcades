// Stick Doosh - save.js (core): profile + settings in localStorage.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const KEY = 'stickdoosh.save.v1';

  const DEFAULT_KEYS = {
    left: ['KeyA', 'ArrowLeft'],
    right: ['KeyD', 'ArrowRight'],
    up: ['KeyW', 'ArrowUp'],
    down: ['KeyS', 'ArrowDown'],
    jump: ['Space', 'KeyK'],
    fire: ['KeyJ', 'Mouse0'],
    special: ['KeyL', 'Mouse2'],
    melee: ['KeyF', 'Mouse1'],
    cycle: ['KeyQ', 'KeyE'],
    pause: ['Escape', 'KeyP'],
  };
  // standard-mapping button indices; -1 = empty slot
  const DEFAULT_PAD = {
    left: [14, -1], right: [15, -1], up: [12, -1], down: [13, -1],
    jump: [0, -1], fire: [2, 7], special: [1, 6], melee: [3, -1], cycle: [5, 4], pause: [9, -1],
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function defaultSettings() {
    return {
      audio: { master: 0.8, music: 0.7, sfx: 0.9, voice: 0.9, background: false, cursing: 'bleep', chatter: 'some', bubbles: true },
      video: { shake: 'full', reduceFlash: false, gore: 'on', wordSize: 1, quality: 'auto', fps: false },
      input: {
        mouseLock: true, keys: clone(DEFAULT_KEYS), pad: clone(DEFAULT_PAD), deadzone: 0.25, vibrate: true,
        touch: { size: 1, opacity: 0.55, leftHanded: false, stick: 'floating', aimStick: true, aimFire: true },
        // aim: 360-degree aiming. aim = 'auto'|'mouse'|'stick'|'keys' (auto = last used device); aimAssist 'off'|'low'|'high' (stick + touch);
        // aimAssistMouse (cone assist for the mouse too); aimDead/aimSens = right-stick dead zone + response; mouseSens = locked-cursor speed;
        // padAimFire = fire while the right stick is pushed (pad; touch has touch.aimFire); kbTwin = arrows aim / WASD move; wheelCycle = wheel cycles specials.
        aim: 'auto', aimAssist: 'low', aimAssistMouse: false, aimDead: 0.2, aimSens: 1, mouseSens: 1, padAimFire: false, kbTwin: false, wheelCycle: true,
        cross: { size: 1, style: 'comic', color: 'weapon' },
      },
      game: { difficulty: 'normal', autofire: true },
    };
  }

  function defaults() {
    return {
      v: 1, gold: 0, upgrades: {}, beaten: {}, best: {},
      cheats: { infLives: false, bigHeads: false, moon: false, gore: false, pew: false },
      stats: { kills: 0, deaths: 0, gold: 0, rescues: 0 },
      settings: defaultSettings(),
    };
  }

  // fill missing keys of `dst` from `src` (deep), keep existing values
  function fill(dst, src) {
    for (const k in src) {
      if (dst[k] === undefined || dst[k] === null || typeof dst[k] !== typeof src[k]) dst[k] = clone(src[k]);
      else if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k])) fill(dst[k], src[k]);
    }
    return dst;
  }

  let timer = 0;
  const Save = S.Save = {
    KEY, DEFAULT_KEYS, DEFAULT_PAD,
    data: defaults(),
    get settings() { return Save.data.settings; },
    defaults,
    defaultSettings,
    load() {
      let d = null;
      try { const raw = window.localStorage && localStorage.getItem(KEY); if (raw) d = JSON.parse(raw); } catch (e) { d = null; }
      Save.data = fill(d && typeof d === 'object' ? d : {}, defaults());
      return Save.data;
    },
    save(now) {
      const write = () => {
        timer = 0;
        try { window.localStorage && localStorage.setItem(KEY, JSON.stringify(Save.data)); } catch (e) { /* private mode */ }
      };
      if (now || typeof setTimeout === 'undefined') { if (timer) clearTimeout(timer); write(); return; }
      if (!timer) timer = setTimeout(write, 250);
    },
    reset(keepSettings) {
      const s = Save.data.settings;
      Save.data = defaults();
      if (keepSettings) Save.data.settings = s;
      Save.save(true);
    },
    beatenCount() { return Object.keys(Save.data.beaten).filter((k) => Save.data.beaten[k] && k !== 'fortress').length; },
  };
})();
