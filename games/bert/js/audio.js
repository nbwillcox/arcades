/* All sound is synthesized live with the Web Audio API - no audio files. */
(function (G) {
  'use strict';
  const S = G.settings;
  const A = { ctx: null, ready: false, sfx: {} };
  let master, sfxBus, musicBus, noiseBuf, voices = 0;
  const last = {};

  function gate(name, ms) {
    const now = performance.now();
    if (now - (last[name] || 0) < ms) return false;
    last[name] = now;
    return true;
  }

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    const ctx = A.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.applyVolumes();
    A.ready = true;
    initMusic();
  };
  A.resume = function () {
    A.init();
    if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume();
  };
  A.applyVolumes = function () {
    if (!A.ctx) return;
    master.gain.value = S.master;
    sfxBus.gain.value = S.sfx;
    musicBus.gain.value = S.music * 0.5;
  };

  /* ---------- primitives ---------- */
  function tone(o) {
    if (!A.ready || voices > 48) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.2 : o.vol, t + (o.attack || 0.003));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t); osc.stop(t + o.dur + 0.03);
    voices++;
    osc.onended = () => { voices--; g.disconnect(); };
  }
  function noise(o) {
    if (!A.ready || voices > 48) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    if (o.q) f.Q.value = o.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.3 : o.vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t, Math.random() * 1.5, o.dur + 0.05);
    voices++;
    src.onended = () => { voices--; g.disconnect(); };
  }

  const X = A.sfx;
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
  X.hop = (n) => { if (gate('hop', 45)) tone({ type: 'square', f0: 330 + (n || 0) * 40, f1: 520 + (n || 0) * 60, dur: 0.09, vol: 0.07 }); };
  X.land = () => { if (gate('land', 30)) tone({ type: 'triangle', f0: 210, f1: 120, dur: 0.06, vol: 0.12 }); };
  X.tile = (n) => {
    if (!gate('tile', 25)) return;
    const f = 523 * Math.pow(2, SCALE[(n || 0) % 8] / 12);
    tone({ type: 'square', f0: f, f1: f * 1.02, dur: 0.1, vol: 0.075 });
    tone({ type: 'triangle', f0: f * 2, dur: 0.08, vol: 0.05, delay: 0.02 });
  };
  X.revert = () => { tone({ type: 'sawtooth', f0: 520, f1: 150, dur: 0.2, vol: 0.09 }); };
  X.enemyHop = () => { if (gate('ehop', 60)) tone({ type: 'triangle', f0: 190, f1: 140, dur: 0.06, vol: 0.05 }); };
  X.snakeHop = () => { if (gate('shop', 60)) { tone({ type: 'sawtooth', f0: 130, f1: 230, dur: 0.1, vol: 0.07 }); } };
  X.spawn = () => { if (gate('spawn', 80)) tone({ type: 'sine', f0: 900, f1: 300, dur: 0.14, vol: 0.06 }); };
  X.hatch = () => {
    tone({ type: 'sawtooth', f0: 120, f1: 520, dur: 0.3, vol: 0.12 });
    noise({ type: 'bandpass', f0: 1500, f1: 400, dur: 0.25, vol: 0.14, q: 1.5 });
    tone({ type: 'square', f0: 700, f1: 200, dur: 0.18, vol: 0.07, delay: 0.25 });
  };
  X.fall = () => { tone({ type: 'sine', f0: 900, f1: 90, dur: 0.85, vol: 0.14 }); };
  X.enemyFall = () => { if (gate('efall', 80)) tone({ type: 'sine', f0: 600, f1: 120, dur: 0.5, vol: 0.05 }); };
  X.die = () => {
    /* the cartoon curse: a burst of garbled blips and static */
    noise({ f0: 4000, f1: 200, dur: 0.5, vol: 0.28 });
    for (let i = 0; i < 9; i++) tone({ type: 'square', f0: 300 + ((i * 197) % 700), f1: 150 + ((i * 313) % 500), dur: 0.07, vol: 0.09, delay: i * 0.06 });
    tone({ type: 'sawtooth', f0: 400, f1: 45, dur: 0.9, vol: 0.12, delay: 0.5 });
  };
  X.catch = () => { [659, 880, 1175, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.09, vol: 0.09, delay: i * 0.05 })); };
  X.freeze = () => {
    tone({ type: 'sine', f0: 1800, f1: 400, dur: 0.4, vol: 0.12 });
    tone({ type: 'triangle', f0: 2400, f1: 900, dur: 0.3, vol: 0.07, delay: 0.05 });
  };
  X.snakeDie = () => {
    tone({ type: 'sawtooth', f0: 600, f1: 60, dur: 0.6, vol: 0.14 });
    [784, 988, 1319].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.08, vol: 0.08, delay: 0.3 + i * 0.06 }));
  };
  X.disc = () => {
    tone({ type: 'sine', f0: 240, f1: 1500, dur: 1.0, vol: 0.12 });
    tone({ type: 'triangle', f0: 480, f1: 2400, dur: 0.9, vol: 0.05, delay: 0.1 });
  };
  X.discLand = () => { tone({ type: 'triangle', f0: 400, f1: 150, dur: 0.14, vol: 0.14 }); tone({ type: 'square', f0: 900, dur: 0.06, vol: 0.06 }); };
  X.roundClear = () => {
    [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.13, vol: 0.1, delay: i * 0.1 }));
    tone({ type: 'triangle', f0: 262, dur: 1.0, vol: 0.14 });
  };
  X.bonus = (n) => { if (gate('bonus', 50)) tone({ type: 'square', f0: 700 + (n || 0) * 60, dur: 0.07, vol: 0.07 }); };
  X.extraLife = () => { [659, 784, 988, 1319, 988, 1319, 1568].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.12, vol: 0.1, delay: i * 0.09 })); };
  X.gameOver = () => { [440, 392, 349, 330, 294, 262, 220].forEach((f, i) => tone({ type: 'sawtooth', f0: f, f1: f * 0.97, dur: 0.22, vol: 0.12, delay: i * 0.18 })); };
  X.blip = () => tone({ type: 'square', f0: 700, f1: 800, dur: 0.04, vol: 0.07 });
  X.select = () => { tone({ type: 'square', f0: 500, dur: 0.06, vol: 0.08 }); tone({ type: 'square', f0: 900, dur: 0.1, vol: 0.08, delay: 0.06 }); };
  X.start = () => { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => tone({ type: 'square', f0: f, dur: 0.1, vol: 0.09, delay: i * 0.06 })); };
  X.ready = () => { [392, 523, 659].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, vol: 0.1, delay: i * 0.1 })); };

  /* ---------- music: a bouncy 4-bar loop ---------- */
  const M = { on: false, step: 0, next: 0, tempo: 120, mode: 'play', timer: 0, intense: 0 };
  const L = {};
  const PROG = [0, 0, 5, 7];
  const BASS = [0, -1, 12, -1, 0, -1, 7, -1, 0, -1, 12, -1, 5, -1, 7, -1];
  const ARP = [0, 7, 12, 7, 3, 10, 15, 10, 0, 7, 12, 7, 5, 12, 17, 12];
  const LEAD = [12, -1, 15, -1, 19, -1, 15, 12, -1, -1, 17, -1, 15, -1, 12, -1];
  function initMusic() { ['bass', 'arp', 'drums', 'lead'].forEach((k) => { L[k] = A.ctx.createGain(); L[k].gain.value = 1; L[k].connect(musicBus); }); }
  const freq = (root, semis) => root * Math.pow(2, semis / 12);
  function schedStep(t, s) {
    const bar = (s >> 4) & 3, st = s & 15, root = freq(55, PROG[bar] + 5), sx = 60 / M.tempo / 4;
    const play = M.mode === 'play';
    if (BASS[st] >= 0) tone({ type: 'square', f0: freq(root, BASS[st]), dur: sx * 1.6, vol: 0.17, bus: L.bass, at: t });
    if (play || st % 2 === 0) tone({ type: 'triangle', f0: freq(root * 4, ARP[st]), dur: sx * 0.9, vol: play ? 0.08 : 0.06, bus: L.arp, at: t });
    if (play && LEAD[st] >= 0 && (bar & 1)) tone({ type: 'square', f0: freq(root * 4, LEAD[st]), dur: sx * 1.8, vol: 0.045, bus: L.lead, attack: 0.01, at: t });
    if (st % 4 === 0) tone({ type: 'sine', f0: 160, f1: 42, dur: 0.14, vol: 0.5, bus: L.drums, at: t });
    if (st === 4 || st === 12) noise({ type: 'highpass', f0: 1800, dur: 0.11, vol: 0.16, bus: L.drums, at: t });
    if (st % 2 === 0) noise({ type: 'highpass', f0: 7500, dur: st % 4 === 2 ? 0.08 : 0.03, vol: 0.06, bus: L.drums, at: t });
  }
  function scheduler() {
    if (!M.on || !A.ready) return;
    const ctx = A.ctx;
    if (ctx.state !== 'running') return;
    if (M.next < ctx.currentTime - 0.25) M.next = ctx.currentTime + 0.05;
    while (M.next < ctx.currentTime + 0.14) {
      schedStep(M.next, M.step);
      M.next += 60 / M.tempo / 4;
      M.step = (M.step + 1) & 63;
    }
  }
  /** mode: 'off' | 'title' | 'play'; level raises the tempo a little */
  A.music = function (mode, level) {
    if (!A.ready) return;
    if (mode === 'off') { M.on = false; return; }
    M.mode = mode;
    M.tempo = mode === 'title' ? 100 : Math.min(144, 116 + (level || 1) * 3);
    if (!M.on) {
      M.on = true; M.step = 0; M.next = A.ctx.currentTime + 0.08;
      if (!M.timer) M.timer = setInterval(scheduler, 30);
    }
  };

  G.audio = A;
})((window.SGS = window.SGS || {}));
