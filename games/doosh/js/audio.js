/* Stick Doosh - SGS.Audio
 * WebAudio context (created on first user gesture), buses master > music / sfx / voice,
 * sample playback from SGS.AUDIO_FILES.sfx with a punchy PROCEDURAL synth fallback for every name,
 * continuous loops, 1 kHz bleeps, and "mute when the tab is hidden".
 * No DOM / AudioContext work at load time (Node-loadable with a window stub). */
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};

  const DEF = { master: 0.8, music: 0.7, sfx: 0.9, voice: 0.9, background: false };
  function aset() {
    const sv = S.Save;
    const st = sv && (sv.settings || (sv.data && sv.data.settings));
    return (st && st.audio) || DEF;
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rnd = (a, b) => a + Math.random() * (b - a);
  const vcurve = (v) => { v = clamp(+v || 0, 0, 1); return v * v; };

  // other names people might call -> canonical synth names
  const ALIAS = {
    dual: 'pistol', pew: 'pistol', rocket: 'rocket_launch', missile: 'rocket_launch', grenade: 'grenade_throw',
    throw: 'grenade_throw', melee: 'punch', whap: 'punch', bonk: 'punch', explosion: 'explode', boom: 'explode',
    blast: 'explode', kaboom: 'explode_big', coin: 'gold', cash: 'gold', ricochet: 'metal_ping', cage: 'cage_break',
    menu: 'select', move: 'select', ok: 'confirm', accept: 'confirm', cancel: 'back', error: 'deny', bleep: 'beep',
    chopper: 'heli', helicopter: 'heli', cow: 'moo', goat: 'baa', ice: 'freeze', water: 'splash', electric: 'zap',
    blip: 'pixel_blip', siren: 'alarm', crate_break: 'tile_break', wood: 'tile_break', mg_loop: 'mg',
    flame_loop: 'flame', heli_loop: 'heli', machinegun: 'mg', minigun: 'mg', flamethrower: 'flame', fire: 'flame',
    gibs: 'gib', blood: 'splat', step: 'land', wall: 'land', death: 'die', ouch: 'hurt', oof: 'hurt',
    superget: 'powerup', '1up': 'rescue', oneup: 'rescue', checkpoint: 'flag', weak: 'boss_flash'
  };
  // simultaneous voices per name (oldest is cut)
  const LIMIT = { mg: 6, pistol: 6, hit: 6, splat: 5, gib: 5, explode: 5, explode_big: 3, tile_break: 6, dirt_break: 6,
    metal_ping: 4, gold: 6, land: 3, jump: 3, bounce: 4, boss_explode: 2, beep: 4, select: 3 };
  // random pitch spread per name (default 0.05)
  const VAR = { beep: 0, select: 0, confirm: 0, back: 0, buy: 0, deny: 0, rescue: 0, flag: 0, powerup: 0,
    pickup: 0.01, alarm: 0, boss_flash: 0, boss_crash: 0.01, mg: 0.08, pistol: 0.07, gib: 0.12, splat: 0.1,
    hit: 0.1, tile_break: 0.12, dirt_break: 0.12, kazoo: 0.02, pixel_blip: 0 };
  // fetched + decoded right after unlock (if files exist); everything else is lazy
  const PRELOAD = ['pistol', 'shotgun', 'mg', 'explode', 'hit', 'jump', 'land', 'punch', 'hurt', 'die', 'pickup',
    'gold', 'select', 'confirm', 'back', 'tile_break', 'dirt_break', 'rocket_launch', 'flame', 'gib', 'splat',
    'mg2', 'mg3', 'mg4', 'mg5', 'flame_loop', 'rocket_loop', 'dual', 'spread', 'fuse', 'bounce'];

  const A = S.Audio = {
    ctx: null, bus: null, unlocked: false, enabled: true, inited: false, hiddenMuted: false,
    _buf: {}, _load: {}, _urlBuf: {}, _urlLoad: {}, _active: {}, _loops: {}, _last: {},
    _noise: null, _noise8: null, _curves: {}, _timer: 0, _sus: 0
  };

  function files() { return (S.AUDIO_FILES && S.AUDIO_FILES.sfx) || {}; }

  /* ---------------- lifecycle ---------------- */
  A.init = function () {
    if (A.inited) return A;
    A.inited = true;
    if (typeof window.addEventListener !== 'function') return A;
    const go = () => A.unlock();
    ['pointerdown', 'mousedown', 'touchstart', 'touchend', 'keydown', 'click'].forEach((ev) => {
      window.addEventListener(ev, go, { capture: true, passive: true });
    });
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', () => A._vis());
    }
    return A;
  };

  A._create = function () {
    if (A.ctx || !A.enabled) return A.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { A.enabled = false; return null; }
    let c = null;
    try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { try { c = new AC(); } catch (e2) { c = null; } }
    if (!c) { A.enabled = false; return null; }
    A.ctx = c;
    const master = c.createGain();
    const lim = c.createDynamicsCompressor();
    lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 10; lim.attack.value = 0.002; lim.release.value = 0.18;
    // soft-clip stage after the limiter: peaks above 0 dBFS get rounded instead of hard-clipped
    const pre = c.createGain(); pre.gain.value = 0.75;
    const sat = c.createWaveShaper(); sat.curve = curve(1.3);
    master.connect(lim); lim.connect(pre); pre.connect(sat); sat.connect(c.destination);
    const mk = () => { const g = c.createGain(); g.connect(master); return g; };
    A.bus = { master, music: mk(), sfx: mk(), voice: mk(), limiter: lim };
    A._noise = makeNoise(c, 2, false);
    A._noise8 = makeNoise(c, 1, true);
    A.setVolumes(true);
    return c;
  };

  A.unlock = function () {
    if (!A.inited) A.init();
    const c = A._create();
    if (!c) return false;
    if (c.state === 'suspended' && !A.hiddenMuted) { try { c.resume(); } catch (e) { /* ignore */ } }
    if (!A.unlocked) {
      A.unlocked = true;
      try { // iOS: play one silent sample inside the gesture
        const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource();
        s.buffer = b; s.connect(c.destination); s.start(0);
      } catch (e) { /* ignore */ }
      if (S.Music && S.Music._onUnlock) S.Music._onUnlock();
      setTimeout(() => A.preload(PRELOAD.concat(Object.keys(files()).filter((k) => /_v\d+$/.test(k)))), 1200);
    }
    return true;
  };

  A.ready = function () { return !!(A.ctx && A.ctx.state === 'running' && !A.hiddenMuted); };

  A.setVolumes = function (instant) {
    if (!A.ctx || !A.bus) return;
    const a = aset(); const t = A.ctx.currentTime;
    const set = (g, v) => {
      if (instant) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(v, t); } else g.gain.setTargetAtTime(v, t, 0.03);
    };
    set(A.bus.master, vcurve(a.master == null ? DEF.master : a.master) * (A.hiddenMuted ? 0 : 1));
    set(A.bus.music, vcurve(a.music == null ? DEF.music : a.music));
    set(A.bus.sfx, vcurve(a.sfx == null ? DEF.sfx : a.sfx));
    set(A.bus.voice, vcurve(a.voice == null ? DEF.voice : a.voice) * 1.15);
  };

  // tab hidden + "play audio in background" off => fade master out, suspend; restore on return
  A._vis = function () {
    if (!A.ctx) return;
    const hidden = !!(typeof document !== 'undefined' && document.hidden);
    const c = A.ctx; const t = c.currentTime;
    if (hidden && !aset().background) {
      if (A.hiddenMuted) return;
      A.hiddenMuted = true;
      A.bus.master.gain.cancelScheduledValues(t);
      A.bus.master.gain.setTargetAtTime(0, t, 0.04);
      clearTimeout(A._sus);
      A._sus = setTimeout(() => { if (A.hiddenMuted && c.state === 'running') { try { c.suspend(); } catch (e) { /* */ } } }, 300);
      if (S.Music && S.Music._visibility) S.Music._visibility(true);
    } else if (!hidden && A.hiddenMuted) {
      A.hiddenMuted = false;
      clearTimeout(A._sus);
      try { c.resume(); } catch (e) { /* ignore */ }
      A.setVolumes();
      if (S.Music && S.Music._visibility) S.Music._visibility(false);
    }
  };

  /* ---------------- sample loading ---------------- */
  function decode(c, ab) {
    return new Promise((res, rej) => {
      try { const p = c.decodeAudioData(ab, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); }
    });
  }
  // fetch + decode any url (cached); resolves AudioBuffer or null
  A.loadUrl = function (url) {
    if (!url) return Promise.resolve(null);
    if (A._urlBuf[url]) return Promise.resolve(A._urlBuf[url]);
    if (A._urlLoad[url]) return A._urlLoad[url];
    if (!A.ctx || typeof fetch !== 'function') return Promise.resolve(null);
    const c = A.ctx;
    const p = fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then((ab) => decode(c, ab))
      .then((b) => { A._urlBuf[url] = b; return b; })
      .catch(() => { A._urlBuf[url] = null; return null; });
    A._urlLoad[url] = p;
    return p;
  };
  A.cached = function (url) { return A._urlBuf[url] || null; };
  A.load = function (name) {
    const src = files()[name];
    if (!src) return Promise.resolve(null);
    if (!A._load[name]) A._load[name] = A.loadUrl(src).then((b) => { A._buf[name] = b; return b; });
    return A._load[name];
  };
  A.preload = function (names) {
    if (!A.ctx) return;
    const list = (names || Object.keys(files())).filter((n) => files()[n] && !A._load[n]);
    let i = 0;
    const next = () => { if (i >= list.length) return; A.load(list[i++]).then(() => setTimeout(next, 30)); };
    next(); next();
  };
  function bufferFor(name) {
    if (!files()[name]) return null;
    if (A._buf[name]) return A._buf[name];
    if (!A._load[name]) A.load(name);
    return null;
  }

  /* ---------------- helpers ---------------- */
  function makeNoise(c, sec, chip) {
    const n = Math.floor(c.sampleRate * sec);
    const b = c.createBuffer(1, n, c.sampleRate); const d = b.getChannelData(0);
    if (!chip) { for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } else {
      let v = 0; const hold = Math.max(2, Math.floor(c.sampleRate / 7000));
      for (let i = 0; i < n; i++) { if (i % hold === 0) v = Math.round((Math.random() * 2 - 1) * 7) / 7; d[i] = v; }
    }
    return b;
  }
  function curve(k) {
    const key = 'd' + k;
    if (A._curves[key]) return A._curves[key];
    const n = 1024; const cv = new Float32Array(n); const den = Math.tanh(k);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; cv[i] = Math.tanh(k * x) / den; }
    A._curves[key] = cv; return cv;
  }
  A.curve = curve;
  function env(p, t, a, v, dur, hold) {
    v = Math.max(0.0002, v); hold = hold || 0;
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(v, t + a);
    if (hold) p.setValueAtTime(v, t + a + hold);
    p.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, a + hold + 0.01));
  }
  function glide(param, t, o, dur) {
    if (o.pts) { for (const pt of o.pts) param.exponentialRampToValueAtTime(Math.max(1, pt[0]), t + pt[1]); } else if (o.f2) {
      const gt = t + (o.glide || dur);
      if (o.lin) param.linearRampToValueAtTime(Math.max(1, o.f2), gt); else param.exponentialRampToValueAtTime(Math.max(1, o.f2), gt);
    }
  }
  function filt(c, type, f, q) { const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; if (q) fl.Q.value = q; return fl; }
  // tone: {type,f,f2,glide,lin,pts,dur,vol,a,hold,det,vib:[rate,depthHz],lp,hp,bp,q,dist,to}
  function T(c, out, t, o) {
    const osc = c.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(1, o.f), t);
    glide(osc.frequency, t, o, o.dur);
    if (o.det) osc.detune.setValueAtTime(o.det, t);
    const end = t + o.dur + 0.05;
    if (o.vib) {
      const l = c.createOscillator(); const lg = c.createGain();
      l.frequency.value = o.vib[0]; lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(end);
    }
    let head = osc;
    if (o.lp) { const f = filt(c, 'lowpass', o.lp, o.q); head.connect(f); head = f; }
    if (o.hp) { const f = filt(c, 'highpass', o.hp, o.q); head.connect(f); head = f; }
    if (o.bp) { const f = filt(c, 'bandpass', o.bp, o.q || 1); head.connect(f); head = f; }
    if (o.dist) { const sh = c.createWaveShaper(); sh.curve = curve(o.dist); head.connect(sh); head = sh; }
    const g = c.createGain(); env(g.gain, t, o.a || 0.002, o.vol == null ? 0.3 : o.vol, o.dur, o.hold);
    head.connect(g); g.connect(o.to || out);
    osc.start(t); osc.stop(end);
    return osc;
  }
  // noise: {type:'lowpass'|'highpass'|'bandpass', f,f2,glide,pts,q,dur,vol,a,hold,dist,chip,rate,to}
  function N(c, out, t, o) {
    const src = c.createBufferSource();
    src.buffer = o.chip ? A._noise8 : A._noise; src.loop = true;
    if (o.rate) src.playbackRate.value = o.rate;
    let head = src;
    if (o.type) {
      const fl = filt(c, o.type, o.f, o.q);
      fl.frequency.setValueAtTime(o.f, t); glide(fl.frequency, t, o, o.dur);
      head.connect(fl); head = fl;
    }
    if (o.dist) { const sh = c.createWaveShaper(); sh.curve = curve(o.dist); head.connect(sh); head = sh; }
    const g = c.createGain(); env(g.gain, t, o.a || 0.001, o.vol == null ? 0.3 : o.vol, o.dur, o.hold);
    head.connect(g); g.connect(o.to || out);
    src.start(t, Math.random() * 1.2); src.stop(t + o.dur + 0.05);
    return src;
  }
  function bell(c, out, t, freqs, dur, vol) {
    freqs.forEach((f, i) => T(c, out, t, { type: 'sine', f, dur: dur * (1 - i * 0.12), vol: vol / (1 + i * 0.3), a: 0.001 }));
  }
  function notes(c, out, t, list, o) { // list of [freq, at, dur]
    for (const n of list) T(c, out, t + n[1], Object.assign({}, o, { f: n[0], dur: n[2] }));
  }
  function boom(c, out, t, p, s) { // s = size 1..3
    N(c, out, t, { type: 'lowpass', f: 2600 * s * 0.6 + 900, f2: 90, glide: 0.5 * s, dur: 0.75 * s, vol: 0.7, dist: 3 });
    T(c, out, t, { type: 'sine', f: 120 * p, f2: 26, glide: 0.45 * s, dur: 0.55 * s, vol: 0.8 });
    N(c, out, t, { type: 'highpass', f: 3500, dur: 0.07, vol: 0.45 });
    if (s > 1.4) N(c, out, t + 0.05, { type: 'lowpass', f: 260, dur: 1.1 * s, vol: 0.55, a: 0.04 });
  }

  /* ---------------- procedural SFX (fn(ctx, out, t, pitch) -> duration) ---------------- */
  const SYN = {
    pistol(c, o, t, p) { // PEW
      N(c, o, t, { type: 'highpass', f: 2400, dur: 0.045, vol: 0.45 });
      T(c, o, t, { type: 'square', f: 1500 * p, f2: 230 * p, dur: 0.12, vol: 0.16, lp: 4200 });
      T(c, o, t, { type: 'sine', f: 190 * p, f2: 60, dur: 0.08, vol: 0.5 });
      return 0.14;
    },
    shotgun(c, o, t, p) { // DOOSH + pump
      N(c, o, t, { type: 'lowpass', f: 5000, f2: 260, glide: 0.35, dur: 0.42, vol: 0.75, dist: 4 });
      T(c, o, t, { type: 'sine', f: 150 * p, f2: 34, glide: 0.3, dur: 0.36, vol: 0.8 });
      N(c, o, t, { type: 'highpass', f: 2800, dur: 0.06, vol: 0.6 });
      N(c, o, t + 0.3, { type: 'bandpass', f: 2600, q: 3, dur: 0.035, vol: 0.32 });
      N(c, o, t + 0.39, { type: 'bandpass', f: 1700, q: 3, dur: 0.05, vol: 0.38 });
      T(c, o, t + 0.39, { type: 'square', f: 260, dur: 0.03, vol: 0.06 });
      return 0.5;
    },
    mg(c, o, t, p) { // one BRRT round
      N(c, o, t, { type: 'bandpass', f: 1700 * p, q: 0.7, dur: 0.05, vol: 0.6, dist: 2 });
      T(c, o, t, { type: 'square', f: 230 * p, f2: 80, dur: 0.045, vol: 0.18, lp: 2000 });
      T(c, o, t, { type: 'sine', f: 130 * p, f2: 50, dur: 0.06, vol: 0.45 });
      return 0.07;
    },
    spread(c, o, t, p) {
      for (let i = 0; i < 3; i++) T(c, o, t + i * 0.012, { type: 'square', f: (1300 + i * 260) * p, f2: 260 * p, dur: 0.11, vol: 0.09, lp: 4000 });
      N(c, o, t, { type: 'highpass', f: 2000, dur: 0.05, vol: 0.4 });
      T(c, o, t, { type: 'sine', f: 170 * p, f2: 55, dur: 0.08, vol: 0.45 });
      return 0.14;
    },
    rocket_launch(c, o, t, p) { // SHHHH
      N(c, o, t, { type: 'bandpass', f: 300, f2: 2600, glide: 0.35, q: 1.2, dur: 0.55, vol: 0.75, a: 0.015 });
      T(c, o, t, { type: 'sine', f: 95 * p, f2: 38, dur: 0.25, vol: 0.8 });
      N(c, o, t + 0.05, { type: 'highpass', f: 1600, dur: 0.6, vol: 0.22, a: 0.1 });
      return 0.65;
    },
    rocket_loop(c, o, t, p) {
      N(c, o, t, { type: 'highpass', f: 1800 * p, dur: 0.8, vol: 0.3, a: 0.05, hold: 0.5 });
      N(c, o, t, { type: 'bandpass', f: 800, q: 2, dur: 0.8, vol: 0.2, a: 0.05, hold: 0.5 });
      return 0.8;
    },
    flame(c, o, t, p) { // FWOOSH
      N(c, o, t, { type: 'lowpass', f: 500, f2: 1400 * p, glide: 0.1, dur: 0.45, vol: 0.7, a: 0.03, dist: 2 });
      N(c, o, t, { type: 'bandpass', f: 380, q: 1, dur: 0.45, vol: 0.5, a: 0.04 });
      for (let i = 0; i < 4; i++) N(c, o, t + rnd(0.02, 0.35), { type: 'bandpass', f: rnd(1800, 4000), q: 4, dur: 0.02, vol: 0.25 });
      return 0.5;
    },
    laser(c, o, t, p) { // BZZZT
      T(c, o, t, { type: 'sawtooth', f: 110 * p, dur: 0.3, vol: 0.28, bp: 1700, q: 3, dist: 3, hold: 0.18, vib: [32, 40] });
      T(c, o, t, { type: 'square', f: 2800 * p, f2: 700, dur: 0.14, vol: 0.08 });
      T(c, o, t, { type: 'sawtooth', f: 113 * p, dur: 0.3, vol: 0.14, lp: 900, hold: 0.18 });
      return 0.32;
    },
    explode(c, o, t, p) { boom(c, o, t, p, 1); return 0.9; },
    explode_big(c, o, t, p) {
      boom(c, o, t, p, 1.8);
      boom(c, o, t + 0.12, p * 0.8, 1.3);
      for (let i = 0; i < 6; i++) N(c, o, t + rnd(0.2, 1.2), { type: 'bandpass', f: rnd(600, 2500), q: 3, dur: 0.03, vol: 0.2 });
      return 1.7;
    },
    thoom(c, o, t, p) { // ground pound
      T(c, o, t, { type: 'sine', f: 90 * p, f2: 22, dur: 0.7, vol: 1 });
      N(c, o, t, { type: 'lowpass', f: 900, f2: 80, dur: 0.6, vol: 0.9, dist: 3 });
      N(c, o, t + 0.04, { type: 'bandpass', f: 400, q: 1, dur: 0.5, vol: 0.4 });
      return 0.75;
    },
    grenade_throw(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 500, f2: 1700, q: 2, dur: 0.22, vol: 0.4, a: 0.03 });
      T(c, o, t, { type: 'sine', f: 3100 * p, dur: 0.05, vol: 0.12 });
      return 0.24;
    },
    bounce(c, o, t, p) {
      T(c, o, t, { type: 'triangle', f: 560 * p, f2: 380 * p, dur: 0.1, vol: 0.45 });
      N(c, o, t, { type: 'bandpass', f: 1500, q: 2, dur: 0.02, vol: 0.2 });
      return 0.12;
    },
    hit(c, o, t, p) {
      N(c, o, t, { type: 'lowpass', f: 1900, dur: 0.07, vol: 0.6 });
      T(c, o, t, { type: 'sine', f: 230 * p, f2: 70, dur: 0.09, vol: 0.55 });
      return 0.1;
    },
    hit_metal(c, o, t, p) {
      bell(c, o, t, [620 * p, 1137 * p, 1708 * p, 2390 * p, 3250 * p], 0.38, 0.22);
      N(c, o, t, { type: 'highpass', f: 3000, dur: 0.03, vol: 0.4 });
      return 0.4;
    },
    punch(c, o, t, p) { // WHAP
      N(c, o, t, { type: 'lowpass', f: 1300, dur: 0.09, vol: 0.9 });
      T(c, o, t, { type: 'sine', f: 170 * p, f2: 45, dur: 0.14, vol: 0.9 });
      N(c, o, t, { type: 'bandpass', f: 3200, q: 1.5, dur: 0.025, vol: 0.35 });
      return 0.16;
    },
    jump(c, o, t, p) {
      T(c, o, t, { type: 'square', f: 250 * p, f2: 620 * p, dur: 0.12, vol: 0.07, lp: 2500 });
      T(c, o, t, { type: 'sine', f: 250 * p, f2: 620 * p, dur: 0.12, vol: 0.16 });
      return 0.13;
    },
    land(c, o, t, p) {
      N(c, o, t, { type: 'lowpass', f: 520, dur: 0.08, vol: 0.45 });
      T(c, o, t, { type: 'sine', f: 120 * p, f2: 50, dur: 0.06, vol: 0.3 });
      return 0.09;
    },
    hurt(c, o, t, p) { // cartoon OOF
      T(c, o, t, { type: 'sawtooth', f: 430 * p, f2: 150 * p, dur: 0.2, vol: 0.3, bp: 750, q: 2 });
      T(c, o, t, { type: 'square', f: 300 * p, f2: 110 * p, dur: 0.16, vol: 0.06 });
      N(c, o, t, { type: 'lowpass', f: 1500, dur: 0.06, vol: 0.5 });
      return 0.22;
    },
    die(c, o, t, p) { // slide-whistle down
      T(c, o, t, { type: 'sine', f: 1500 * p, f2: 180 * p, lin: true, dur: 0.75, vol: 0.32, vib: [9, 28], a: 0.02 });
      T(c, o, t, { type: 'triangle', f: 750 * p, f2: 90 * p, lin: true, dur: 0.75, vol: 0.12 });
      N(c, o, t, { type: 'lowpass', f: 1200, dur: 0.06, vol: 0.5 });
      return 0.8;
    },
    gib(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 900 * p, f2: 260, q: 2, dur: 0.25, vol: 0.85 });
      N(c, o, t, { type: 'lowpass', f: 420, dur: 0.16, vol: 0.5 });
      for (let i = 0; i < 3; i++) T(c, o, t + rnd(0, 0.15), { type: 'sine', f: rnd(300, 700) * p, f2: 80, dur: 0.06, vol: 0.28 });
      return 0.3;
    },
    splat(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 1500 * p, f2: 240, q: 1.5, dur: 0.22, vol: 0.8 });
      T(c, o, t, { type: 'sine', f: 210 * p, f2: 60, dur: 0.1, vol: 0.45 });
      return 0.24;
    },
    pickup(c, o, t, p) {
      const f = [523, 659, 784, 1047].map((x) => x * p);
      notes(c, o, t, f.map((x, i) => [x, i * 0.055, 0.09]), { type: 'square', vol: 0.09, lp: 5000 });
      notes(c, o, t, f.map((x, i) => [x, i * 0.055, 0.1]), { type: 'triangle', vol: 0.18 });
      return 0.32;
    },
    powerup(c, o, t, p) {
      const f = [392, 440, 523, 587, 659, 784, 880, 1047].map((x) => x * p);
      notes(c, o, t, f.map((x, i) => [x, i * 0.045, 0.1]), { type: 'square', vol: 0.08, lp: 4500 });
      notes(c, o, t, f.map((x, i) => [x * 2, i * 0.045, 0.08]), { type: 'triangle', vol: 0.1 });
      T(c, o, t + 0.36, { type: 'sine', f: 2093 * p, dur: 0.45, vol: 0.1, vib: [7, 20] });
      T(c, o, t + 0.36, { type: 'sine', f: 2637 * p, dur: 0.45, vol: 0.08, vib: [7, 25] });
      return 0.85;
    },
    gold(c, o, t, p) { // coin
      T(c, o, t, { type: 'square', f: 988 * p, dur: 0.07, vol: 0.1, lp: 6000 });
      T(c, o, t + 0.07, { type: 'square', f: 1319 * p, dur: 0.32, vol: 0.1, lp: 6000, hold: 0.05 });
      return 0.4;
    },
    cage_break(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 1500, q: 0.8, dur: 0.15, vol: 0.6 });
      bell(c, o, t, [400 * p, 950 * p, 1600 * p], 0.4, 0.15);
      N(c, o, t + 0.02, { type: 'lowpass', f: 700, dur: 0.2, vol: 0.45 });
      return 0.45;
    },
    rescue(c, o, t, p) {
      const seq = [[523, 0, 0.12], [659, 0.08, 0.12], [784, 0.16, 0.12], [659, 0.26, 0.1], [784, 0.34, 0.1], [1047, 0.42, 0.4]];
      notes(c, o, t, seq.map((n) => [n[0] * p, n[1], n[2]]), { type: 'triangle', vol: 0.22 });
      notes(c, o, t, seq.map((n) => [n[0] * p / 2, n[1], n[2]]), { type: 'square', vol: 0.05, lp: 2500 });
      return 0.9;
    },
    flag(c, o, t, p) { // fanfare
      const seq = [[392, 0, 0.11], [523, 0.12, 0.11], [659, 0.24, 0.11], [784, 0.36, 0.5]];
      notes(c, o, t, seq.map((n) => [n[0] * p, n[1], n[2]]), { type: 'sawtooth', vol: 0.13, lp: 2400, a: 0.01 });
      notes(c, o, t, seq.map((n) => [n[0] * p * 1.5, n[1], n[2]]), { type: 'sawtooth', vol: 0.06, lp: 2400, a: 0.01 });
      return 0.9;
    },
    tile_break(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 1100 * p, q: 0.9, dur: 0.12, vol: 0.55 });
      N(c, o, t, { type: 'lowpass', f: 300, dur: 0.1, vol: 0.45 });
      for (let i = 0; i < 3; i++) N(c, o, t + rnd(0.03, 0.16), { type: 'highpass', f: 3000, dur: 0.015, vol: 0.2 });
      return 0.2;
    },
    dirt_break(c, o, t, p) {
      N(c, o, t, { type: 'lowpass', f: 750 * p, f2: 200, dur: 0.18, vol: 0.6 });
      T(c, o, t, { type: 'sine', f: 95 * p, f2: 40, dur: 0.1, vol: 0.38 });
      return 0.2;
    },
    metal_ping(c, o, t, p) { // ricochet PTWING
      T(c, o, t, { type: 'sine', f: 3300 * p, f2: 1700 * p, dur: 0.35, vol: 0.22 });
      T(c, o, t, { type: 'sine', f: 4600 * p, f2: 2600 * p, dur: 0.2, vol: 0.07 });
      N(c, o, t, { type: 'highpass', f: 5000, dur: 0.02, vol: 0.3 });
      return 0.38;
    },
    glass(c, o, t, p) {
      N(c, o, t, { type: 'highpass', f: 3500, dur: 0.35, vol: 0.42 });
      for (let i = 0; i < 8; i++) T(c, o, t + rnd(0, 0.15), { type: 'sine', f: rnd(2500, 6500) * p, dur: rnd(0.08, 0.22), vol: 0.07 });
      return 0.45;
    },
    boss_flash(c, o, t, p) { // FF-style flash "shing"
      N(c, o, t, { type: 'highpass', f: 6000, dur: 0.4, vol: 0.5 });
      bell(c, o, t, [1760 * p, 2637 * p, 3520 * p], 0.55, 0.16);
      T(c, o, t, { type: 'sawtooth', f: 220 * p, f2: 880 * p, dur: 0.25, vol: 0.08, lp: 3000 });
      return 0.6;
    },
    boss_crash(c, o, t, p) {
      N(c, o, t, { type: 'lowpass', f: 6000, f2: 200, glide: 0.8, dur: 1.0, vol: 1, dist: 3 });
      N(c, o, t, { type: 'highpass', f: 5000, dur: 1.2, vol: 0.45 });
      T(c, o, t, { type: 'sine', f: 75 * p, f2: 25, dur: 0.8, vol: 1 });
      T(c, o, t, { type: 'square', f: 145 * p, f2: 35, dur: 0.3, vol: 0.2, lp: 1200 });
      return 1.25;
    },
    boss_burn(c, o, t, p) {
      N(c, o, t, { type: 'lowpass', f: 600 * p, dur: 1.25, vol: 0.5, a: 0.2, hold: 0.6 });
      for (let i = 0; i < 14; i++) N(c, o, t + rnd(0, 1.15), { type: 'bandpass', f: rnd(1500, 4200), q: 3, dur: rnd(0.015, 0.035), vol: 0.35 });
      [0.1, 0.5, 0.9].forEach((d) => T(c, o, t + d, { type: 'sine', f: 105 * p, f2: 40, dur: 0.2, vol: 0.5 }));
      return 1.3;
    },
    boss_explode(c, o, t, p) {
      boom(c, o, t, p, 2.2);
      boom(c, o, t + 0.25, p * 0.85, 1.5);
      boom(c, o, t + 0.6, p * 0.7, 1.2);
      T(c, o, t, { type: 'sine', f: 62 * p, f2: 18, dur: 2.6, vol: 1, a: 0.01 });
      N(c, o, t, { type: 'lowpass', f: 1600, f2: 60, glide: 2.6, dur: 3.0, vol: 0.75, a: 0.02 });
      for (let i = 0; i < 16; i++) N(c, o, t + rnd(0.6, 2.8), { type: 'bandpass', f: rnd(800, 3500), q: 3, dur: 0.025, vol: 0.18 });
      return 3.2;
    },
    alarm(c, o, t, p) {
      notes(c, o, t, [[660, 0, 0.22], [880, 0.22, 0.22], [660, 0.44, 0.22], [880, 0.66, 0.22]].map((n) => [n[0] * p, n[1], n[2]]),
        { type: 'square', vol: 0.12, lp: 2600, hold: 0.17, a: 0.005 });
      return 0.9;
    },
    whistle(c, o, t, p) { // tweet-TWEEEET
      T(c, o, t, { type: 'sine', f: 2750 * p, dur: 0.13, vol: 0.22, vib: [34, 130], a: 0.01, hold: 0.08 });
      T(c, o, t + 0.2, { type: 'sine', f: 2850 * p, dur: 0.55, vol: 0.25, vib: [34, 140], a: 0.02, hold: 0.42 });
      N(c, o, t + 0.2, { type: 'bandpass', f: 2850, q: 3, dur: 0.55, vol: 0.08, hold: 0.4 });
      return 0.78;
    },
    select(c, o, t, p) {
      T(c, o, t, { type: 'square', f: 880 * p, dur: 0.04, vol: 0.07, lp: 5000 });
      T(c, o, t, { type: 'triangle', f: 1760 * p, dur: 0.03, vol: 0.08 });
      return 0.06;
    },
    confirm(c, o, t, p) {
      T(c, o, t, { type: 'square', f: 660 * p, dur: 0.05, vol: 0.09, lp: 5000 });
      T(c, o, t + 0.05, { type: 'square', f: 990 * p, dur: 0.11, vol: 0.09, lp: 5000 });
      return 0.17;
    },
    back(c, o, t, p) {
      T(c, o, t, { type: 'square', f: 660 * p, dur: 0.05, vol: 0.08, lp: 4000 });
      T(c, o, t + 0.05, { type: 'square', f: 440 * p, dur: 0.1, vol: 0.08, lp: 4000 });
      return 0.16;
    },
    buy(c, o, t, p) { // ka-ching
      N(c, o, t, { type: 'highpass', f: 4000, dur: 0.05, vol: 0.35 });
      bell(c, o, t + 0.06, [2093 * p, 2637 * p, 3136 * p], 0.5, 0.14);
      T(c, o, t + 0.06, { type: 'square', f: 1047 * p, dur: 0.08, vol: 0.05 });
      return 0.6;
    },
    deny(c, o, t, p) {
      T(c, o, t, { type: 'sawtooth', f: 110 * p, dur: 0.28, vol: 0.18, lp: 1500, hold: 0.2 });
      T(c, o, t, { type: 'sawtooth', f: 117 * p, dur: 0.28, vol: 0.14, lp: 1500, hold: 0.2 });
      return 0.3;
    },
    heli(c, o, t, p) {
      for (let i = 0; i < 12; i++) {
        N(c, o, t + i * 0.085, { type: 'lowpass', f: 420 * p, dur: 0.065, vol: 0.55 });
        T(c, o, t + i * 0.085, { type: 'sine', f: 72 * p, f2: 50, dur: 0.06, vol: 0.25 });
      }
      T(c, o, t, { type: 'sawtooth', f: 1250 * p, dur: 1.0, vol: 0.012, lp: 3000, hold: 0.8 });
      return 1.05;
    },
    moo(c, o, t, p) {
      [125, 126.5].forEach((f, i) => T(c, o, t, {
        type: 'sawtooth', f: f * 1.15 * p, f2: f * 0.88 * p, lin: true, dur: 1.0, vol: 0.32 - i * 0.08,
        a: 0.08, hold: 0.55, bp: 520, q: 2.5, vib: [5, 3]
      }));
      N(c, o, t, { type: 'bandpass', f: 600, q: 3, dur: 0.9, vol: 0.05, a: 0.1, hold: 0.5 });
      return 1.0;
    },
    squeak(c, o, t, p) {
      T(c, o, t, { type: 'sine', f: 1600 * p, pts: [[2600 * p, 0.06], [1500 * p, 0.16]], dur: 0.18, vol: 0.18, vib: [40, 80] });
      return 0.2;
    },
    baa(c, o, t, p) {
      T(c, o, t, { type: 'sawtooth', f: 330 * p, f2: 300 * p, dur: 0.7, vol: 0.32, a: 0.03, hold: 0.4, bp: 1100, q: 1.6, vib: [9, 22] });
      T(c, o, t, { type: 'sawtooth', f: 331 * p, f2: 301 * p, dur: 0.7, vol: 0.12, a: 0.03, hold: 0.4, bp: 2500, q: 3, vib: [9, 22] });
      return 0.72;
    },
    freeze(c, o, t, p) {
      for (let i = 0; i < 10; i++) T(c, o, t + rnd(0, 0.4), { type: 'sine', f: rnd(2000, 5200) * p, dur: 0.25, vol: 0.07 });
      N(c, o, t, { type: 'highpass', f: 6000, f2: 1800, dur: 0.5, vol: 0.25 });
      for (let i = 0; i < 6; i++) N(c, o, t + rnd(0, 0.35), { type: 'bandpass', f: rnd(2500, 6000), q: 5, dur: 0.02, vol: 0.2 });
      return 0.6;
    },
    splash(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 2600 * p, f2: 500, q: 0.8, dur: 0.45, vol: 0.7 });
      T(c, o, t, { type: 'sine', f: 300 * p, f2: 900 * p, dur: 0.08, vol: 0.18 });
      for (let i = 0; i < 5; i++) T(c, o, t + rnd(0.1, 0.4), { type: 'sine', f: rnd(900, 1800) * p, f2: rnd(1900, 2600), dur: 0.05, vol: 0.08 });
      return 0.55;
    },
    wind(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 300 * p, pts: [[1000 * p, 0.6], [350 * p, 1.4]], q: 1.5, dur: 1.4, vol: 0.45, a: 0.4 });
      return 1.4;
    },
    zap(c, o, t, p) {
      T(c, o, t, { type: 'sawtooth', f: 90 * p, dur: 0.25, vol: 0.3, dist: 5, lp: 3000, vib: [60, 30] });
      T(c, o, t, { type: 'square', f: 1800 * p, f2: 400, dur: 0.15, vol: 0.08 });
      N(c, o, t, { type: 'highpass', f: 3000, dur: 0.2, vol: 0.22 });
      return 0.3;
    },
    pixel_blip(c, o, t, p) {
      T(c, o, t, { type: 'square', f: 988 * p, dur: 0.04, vol: 0.09 });
      T(c, o, t + 0.04, { type: 'square', f: 1319 * p, dur: 0.06, vol: 0.09 });
      return 0.1;
    },
    kazoo(c, o, t, p) {
      T(c, o, t, { type: 'sawtooth', f: 330 * p, dur: 0.38, vol: 0.4, a: 0.02, hold: 0.25, bp: 1150, q: 1.5, dist: 2, vib: [6, 7] });
      T(c, o, t, { type: 'sawtooth', f: 331 * p, dur: 0.38, vol: 0.12, a: 0.02, hold: 0.25, bp: 2500, q: 3, vib: [6, 7] });
      return 0.4;
    },
    beep(c, o, t, p) {
      T(c, o, t, { type: 'sine', f: 1000 * p, dur: 0.25, vol: 0.3, a: 0.004, hold: 0.22 });
      return 0.26;
    },
    empty(c, o, t, p) {
      N(c, o, t, { type: 'highpass', f: 3000, dur: 0.02, vol: 0.3 });
      T(c, o, t, { type: 'square', f: 1900 * p, dur: 0.015, vol: 0.05 });
      return 0.04;
    },
    reload(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 2200 * p, q: 3, dur: 0.04, vol: 0.3 });
      N(c, o, t + 0.12, { type: 'bandpass', f: 1500 * p, q: 3, dur: 0.05, vol: 0.35 });
      return 0.2;
    },
    teeth(c, o, t, p) { // denture chatter
      for (let i = 0; i < 6; i++) T(c, o, t + i * 0.06, { type: 'square', f: 1500 * p, dur: 0.018, vol: 0.08, hp: 900 });
      return 0.38;
    },
    boing(c, o, t, p) {
      T(c, o, t, { type: 'sine', f: 180 * p, f2: 620 * p, dur: 0.35, vol: 0.3, vib: [14, 40] });
      return 0.36;
    },
    shield(c, o, t, p) {
      T(c, o, t, { type: 'sine', f: 300 * p, f2: 1200 * p, dur: 0.4, vol: 0.18, vib: [12, 30] });
      T(c, o, t, { type: 'triangle', f: 450 * p, f2: 1800 * p, dur: 0.4, vol: 0.1 });
      return 0.42;
    },
    bubble(c, o, t, p) {
      T(c, o, t, { type: 'sine', f: 400 * p, f2: 1200 * p, dur: 0.07, vol: 0.18 });
      return 0.08;
    },
    tornado(c, o, t, p) {
      N(c, o, t, { type: 'bandpass', f: 200, pts: [[1400 * p, 0.5], [500, 1.2]], q: 3, dur: 1.2, vol: 0.6, a: 0.2 });
      return 1.2;
    },
    super(c, o, t, p) {
      SYN.boss_flash(c, o, t, p * 0.8);
      SYN.powerup(c, o, t + 0.05, p);
      return 0.9;
    }
  };
  A.SYN = SYN;
  A.NAMES = Object.keys(SYN);

  function hashName(n) { let h = 7; for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return h; }
  function genericSyn(name) { // unknown name: a short comic "bonk" tuned by the name
    const h = hashName(name);
    const f = 260 + (h % 900);
    return function (c, o, t, p) {
      T(c, o, t, { type: h & 1 ? 'square' : 'triangle', f: f * p, f2: f * p * (h & 2 ? 1.6 : 0.5), dur: 0.12, vol: 0.12, lp: 4000 });
      N(c, o, t, { type: 'lowpass', f: 900, dur: 0.06, vol: 0.35 });
      return 0.14;
    };
  }
  function synFor(name) { return SYN[name] || genericSyn(name); }

  /* ---------------- playback ---------------- */
  function camPan(x) {
    const cam = S.Game && S.Game.cam;
    if (x == null || !cam || !cam.w) return { pan: 0, att: 1 };
    const d = (x - (cam.x + cam.w / 2)) / (cam.w / 2);
    const ad = Math.abs(d);
    return { pan: clamp(d * 0.6, -0.8, 0.8), att: ad > 1.15 ? clamp(1 - (ad - 1.15) * 0.55, 0.12, 1) : 1 };
  }
  A.camPan = camPan;
  function outNode(c, vol, pan, dest) {
    const g = c.createGain(); g.gain.value = vol;
    if (pan && c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(dest); } else g.connect(dest);
    return g;
  }
  function kill(v, t) {
    try {
      v.out.gain.cancelScheduledValues(t); v.out.gain.setTargetAtTime(0, t, 0.012);
      if (v.src) v.src.stop(t + 0.08);
      setTimeout(() => { try { v.out.disconnect(); } catch (e) { /* */ } }, 140);
    } catch (e) { /* ignore */ }
  }

  // sfx(name,{vol,pitch,x,pan,bus,exact,when}) -> handle|null
  // variants: files name, name_v2, name_v3... -> random pick each play (breaks up repetition)
  function pickVariant(name) {
    const f = files();
    if (!f[name + '_v2']) return name;
    let n = 2; while (f[name + '_v' + (n + 1)]) n++;
    const k = Math.floor(Math.random() * n);
    return k === 0 ? name : name + '_v' + (k + 1);
  }
  A.sfx = function (name, o) {
    if (!A.inited) A.init();
    if (!A.ready() || !name) return null;
    o = o || {};
    const c = A.ctx; const now = c.currentTime;
    name = files()[name] ? name : (ALIAS[name] || name);
    const t = o.when != null ? Math.max(now, o.when) : now;
    if (o.when == null) { // same sound twice in the same instant = louder, not doubled
      if (now - (A._last[name] || -1) < 0.012) return null;
      A._last[name] = now;
    }
    const cp = camPan(o.x);
    let vol = (o.vol == null ? 1 : o.vol) * cp.att;
    if (vol <= 0.002) return null;
    const pan = o.pan != null ? o.pan : cp.pan;
    const spread = VAR[name] != null ? VAR[name] : 0.05;
    const pitch = (o.pitch || 1) * (o.exact ? 1 : 1 + (Math.random() * 2 - 1) * spread);
    const act = A._active[name] || (A._active[name] = []);
    for (let i = act.length - 1; i >= 0; i--) if (act[i].end < now) act.splice(i, 1);
    const lim = LIMIT[name] || 4;
    while (act.length >= lim) kill(act.shift(), now);
    const dest = (o.bus && A.bus[o.bus]) || A.bus.sfx;
    const out = outNode(c, vol, pan, dest);
    const v = { name, out, src: null, end: 0 };
    const buf = bufferFor(pickVariant(name));
    let dur;
    if (buf) {
      const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = pitch;
      s.connect(out); s.start(t); v.src = s; dur = buf.duration / pitch;
    } else {
      dur = synFor(name)(c, out, t, pitch) || 0.5;
    }
    v.end = t + dur;
    act.push(v);
    setTimeout(() => { try { out.disconnect(); } catch (e) { /* */ } }, (t - now + dur) * 1000 + 400);
    return v;
  };
  A.stopSfx = function (h) { if (h && A.ctx) kill(h, A.ctx.currentTime); };

  // play an AudioBuffer on a bus: {bus,vol,pan,when,rate} -> {src,out,t,end}
  A.playBuffer = function (buf, o) {
    if (!A.ready() || !buf) return null;
    o = o || {};
    const c = A.ctx; const t = Math.max(c.currentTime, o.when || 0);
    const out = outNode(c, o.vol == null ? 1 : o.vol, o.pan || 0, A.bus[o.bus || 'sfx'] || A.bus.sfx);
    const s = c.createBufferSource(); s.buffer = buf; if (o.rate) s.playbackRate.value = o.rate;
    s.connect(out); s.start(t);
    const end = t + buf.duration / (o.rate || 1);
    s.onended = () => { try { out.disconnect(); } catch (e) { /* */ } };
    return { src: s, out, t, end };
  };

  // 1 kHz censor beep (or any tone): beep(dur,{when,bus,vol,f})
  A.beep = function (dur, o) {
    if (!A.inited) A.init();
    if (!A.ready()) return null;
    o = o || {};
    const c = A.ctx; const t = o.when != null ? Math.max(o.when, c.currentTime) : c.currentTime;
    dur = Math.max(0.05, dur || 0.25);
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = o.f || 1000;
    const g = c.createGain(); const v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
    g.gain.setValueAtTime(v, t + dur - 0.008); g.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(g); g.connect(A.bus[o.bus || 'sfx'] || A.bus.sfx);
    osc.start(t); osc.stop(t + dur + 0.02);
    osc.onended = () => { try { g.disconnect(); } catch (e) { /* */ } };
    return { osc, g, t, end: t + dur };
  };
  A.cancelBeep = function (b) {
    if (!b || !A.ctx) return;
    const now = A.ctx.currentTime;
    try { b.g.gain.cancelScheduledValues(now); b.g.gain.setTargetAtTime(0, now, 0.005); b.osc.stop(now + 0.03); } catch (e) { /* */ }
  };

  /* ---------------- loops ---------------- */
  // continuous procedural loops: fn(ctx,out,t,pitch) -> stop(t)
  function noiseSrc(c) { const s = c.createBufferSource(); s.buffer = A._noise; s.loop = true; return s; }
  function lfo(c, rate, depth, param, type, t) {
    const l = c.createOscillator(); l.type = type || 'sine'; l.frequency.value = rate;
    const g = c.createGain(); g.gain.value = depth; l.connect(g); g.connect(param); l.start(t); return l;
  }
  const LOOP = {
    flame(c, out, t, p) {
      const s = noiseSrc(c); const lp = filt(c, 'lowpass', 900 * p, 0.8); const bp = filt(c, 'bandpass', 380, 0.9);
      const g1 = c.createGain(); g1.gain.value = 0.55; const g2 = c.createGain(); g2.gain.value = 0.5;
      const sh = c.createWaveShaper(); sh.curve = curve(2);
      s.connect(lp); lp.connect(sh); sh.connect(g1); g1.connect(out); s.connect(bp); bp.connect(g2); g2.connect(out);
      const l1 = lfo(c, 7, 350, lp.frequency, 'sine', t); const l2 = lfo(c, 11, 0.18, g1.gain, 'triangle', t);
      const saw = c.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = 55 * p;
      const sl = filt(c, 'lowpass', 220); const sg = c.createGain(); sg.gain.value = 0.12;
      saw.connect(sl); sl.connect(sg); sg.connect(out);
      s.start(t, Math.random()); saw.start(t);
      return (tt) => { [s, l1, l2, saw].forEach((n) => n.stop(tt)); };
    },
    rocket_loop(c, out, t, p) {
      const s = noiseSrc(c); const hp = filt(c, 'highpass', 1800 * p); const bp = filt(c, 'bandpass', 850 * p, 2);
      const g = c.createGain(); g.gain.value = 0.32; const g2 = c.createGain(); g2.gain.value = 0.22;
      s.connect(hp); hp.connect(g); g.connect(out); s.connect(bp); bp.connect(g2); g2.connect(out);
      const l = lfo(c, 17, 0.12, g.gain, 'sine', t);
      s.start(t, Math.random());
      return (tt) => { s.stop(tt); l.stop(tt); };
    },
    heli(c, out, t, p) {
      const s = noiseSrc(c); const lp = filt(c, 'lowpass', 520 * p, 1.2);
      const g = c.createGain(); g.gain.value = 0.45; s.connect(lp); lp.connect(g); g.connect(out);
      const l = lfo(c, 11.5 * p, -0.45, g.gain, 'sawtooth', t); // falling saw = whup whup
      const eng = c.createOscillator(); eng.type = 'square'; eng.frequency.value = 66 * p;
      const el = filt(c, 'lowpass', 260); const eg = c.createGain(); eg.gain.value = 0.06;
      eng.connect(el); el.connect(eg); eg.connect(out);
      const wh = c.createOscillator(); wh.type = 'sawtooth'; wh.frequency.value = 1250 * p;
      const wl = filt(c, 'lowpass', 3000); const wg = c.createGain(); wg.gain.value = 0.01;
      wh.connect(wl); wl.connect(wg); wg.connect(out);
      s.start(t, Math.random()); eng.start(t); wh.start(t);
      return (tt) => { [s, l, eng, wh].forEach((n) => n.stop(tt)); };
    },
    wind(c, out, t, p) {
      const s = noiseSrc(c); const bp = filt(c, 'bandpass', 600 * p, 1.2);
      const g = c.createGain(); g.gain.value = 0.42; s.connect(bp); bp.connect(g); g.connect(out);
      const l1 = lfo(c, 0.23, 330, bp.frequency, 'sine', t); const l2 = lfo(c, 0.17, 0.22, g.gain, 'sine', t);
      s.start(t, Math.random());
      return (tt) => { [s, l1, l2].forEach((n) => n.stop(tt)); };
    },
    alarm(c, out, t, p) {
      const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 770 * p;
      const lp = filt(c, 'lowpass', 2600); const g = c.createGain(); g.gain.value = 0.11;
      o.connect(lp); lp.connect(g); g.connect(out);
      const l = lfo(c, 2.2, 110 * p, o.frequency, 'square', t);
      o.start(t);
      return (tt) => { o.stop(tt); l.stop(tt); };
    },
    laser(c, out, t, p) {
      const a = c.createOscillator(); a.type = 'sawtooth'; a.frequency.value = 110 * p;
      const b = c.createOscillator(); b.type = 'sawtooth'; b.frequency.value = 166 * p;
      const bp = filt(c, 'bandpass', 1600, 3); const sh = c.createWaveShaper(); sh.curve = curve(3);
      const g = c.createGain(); g.gain.value = 0.16;
      a.connect(bp); b.connect(bp); bp.connect(sh); sh.connect(g); g.connect(out);
      const l = lfo(c, 9, 600, bp.frequency, 'sine', t);
      const hi = c.createOscillator(); hi.type = 'sine'; hi.frequency.value = 2400 * p;
      const hg = c.createGain(); hg.gain.value = 0.03; hi.connect(hg); hg.connect(out);
      const l2 = lfo(c, 30, 0.03, hg.gain, 'square', t);
      a.start(t); b.start(t); hi.start(t);
      return (tt) => { [a, b, hi, l, l2].forEach((n) => n.stop(tt)); };
    }
  };
  LOOP.mg_spin = function (c, out, t, p) { // minigun barrel whir
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(60 * p, t);
    o.frequency.exponentialRampToValueAtTime(190 * p, t + 0.5);
    const lp = filt(c, 'lowpass', 900); const g = c.createGain(); g.gain.value = 0.07;
    o.connect(lp); lp.connect(g); g.connect(out); o.start(t);
    return (tt) => o.stop(tt);
  };
  const RETRIG = { mg: 0.068, pistol: 0.14, spread: 0.16, shotgun: 0.45, teeth: 0.38, beep: 0.3, select: 0.08, pixel_blip: 0.11, gold: 0.09 };
  const SAMPLE_LOOPS = { flame: 1, rocket_loop: 1, heli: 1, wind: 1, alarm: 1, laser: 1, mg_spin: 1 };

  function loopTick() {
    if (!A.ctx) return;
    const c = A.ctx; const now = c.currentTime; const wall = Date.now() / 1000;
    let any = false;
    for (const k in A._loops) {
      const L = A._loops[k]; any = true;
      if (L.ttl && wall - L.touch > L.ttl) { A.stopLoop(k); continue; }
      if (!L.retrig) continue;
      const ahead = (typeof document !== 'undefined' && document.hidden) ? 1.2 : 0.1;
      while (L.next < now + ahead) {
        if (L.next < now - 0.2) L.next = now;
        const pr = L.pitch * (1 + (Math.random() * 2 - 1) * 0.05);
        if (L.buf) {
          const s = c.createBufferSource(); s.buffer = L.buf; s.playbackRate.value = pr; s.connect(L.out); s.start(L.next);
        } else synFor(L.name)(c, L.out, L.next, pr);
        L.next += L.retrig;
      }
    }
    if (!any) { clearInterval(A._timer); A._timer = 0; }
  }

  // loop(name,key,{vol,x,pitch,ttl}) starts or refreshes a continuous sound; returns handle
  A.loop = function (name, key, o) {
    if (!A.inited) A.init();
    if (!A.ready() || !name) return null;
    o = o || {};
    key = key || name;
    const c = A.ctx; const now = c.currentTime;
    name = files()[name] ? name : (ALIAS[name] && !LOOP[name] ? ALIAS[name] : name);
    const cp = camPan(o.x);
    const vol = (o.vol == null ? 1 : o.vol) * cp.att;
    const pan = o.pan != null ? o.pan : cp.pan;
    let L = A._loops[key];
    if (L && L.name === name) {
      L.touch = Date.now() / 1000;
      if (o.ttl != null) L.ttl = o.ttl;
      L.out.gain.setTargetAtTime(vol, now, 0.04);
      if (L.pan) L.pan.pan.setTargetAtTime(pan, now, 0.05);
      return L;
    }
    if (L) A.stopLoop(key);
    const out = c.createGain(); out.gain.setValueAtTime(0.0001, now); out.gain.setTargetAtTime(vol, now, 0.03);
    let pn = null;
    if (c.createStereoPanner) { pn = c.createStereoPanner(); pn.pan.value = pan; out.connect(pn); pn.connect(A.bus.sfx); } else out.connect(A.bus.sfx);
    L = { name, key, out, pan: pn, stop: null, retrig: 0, next: now + 0.01, pitch: o.pitch || 1, touch: Date.now() / 1000, ttl: o.ttl || 0, buf: null };
    const buf = bufferFor(name);
    if (RETRIG[name] && !SAMPLE_LOOPS[name]) { L.retrig = RETRIG[name] / L.pitch; L.buf = buf; } else if (buf) {
      const s = c.createBufferSource(); s.buffer = buf; s.loop = true; s.playbackRate.value = L.pitch; s.connect(out); s.start(now);
      L.stop = (tt) => s.stop(tt);
    } else if (LOOP[name]) {
      L.stop = LOOP[name](c, out, now, L.pitch);
    } else {
      const probe = c.createGain(); // measure the one-shot length by running it silently once
      const d = synFor(name)(c, probe, now, L.pitch) || 0.3;
      L.retrig = Math.max(0.06, d * 0.9);
    }
    A._loops[key] = L;
    if (!A._timer) A._timer = setInterval(loopTick, 25);
    loopTick();
    return L;
  };
  A.stopLoop = function (key, fade) {
    const L = A._loops[key];
    if (!L || !A.ctx) return;
    delete A._loops[key];
    const t = A.ctx.currentTime; const f = fade == null ? 0.08 : fade;
    L.out.gain.cancelScheduledValues(t); L.out.gain.setTargetAtTime(0, t, f / 3 + 0.001);
    if (L.stop) { try { L.stop(t + f + 0.1); } catch (e) { /* */ } }
    setTimeout(() => { try { L.out.disconnect(); } catch (e) { /* */ } }, (f + 0.3) * 1000);
  };
  A.isLooping = function (key) { return !!A._loops[key]; };
  A.stopAll = function () {
    for (const k in A._loops) A.stopLoop(k, 0.05);
    if (!A.ctx) return;
    const t = A.ctx.currentTime;
    for (const n in A._active) { A._active[n].forEach((v) => kill(v, t)); A._active[n] = []; }
  };
})();
