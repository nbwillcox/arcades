/* All sound is synthesized live with Web Audio: sound effects and a small step-sequencer for the music. No audio files. */
(function (G) {
  'use strict';
  const S = G.settings;
  const A = { ctx: null, ready: false, sfx: {} };
  let master, sfxBus, musicBus, noiseBuf, voices = 0;
  const last = {};
  const R = Math.random;
  const gate = (n, ms) => { const now = performance.now(); if (now - (last[n] || 0) < ms) return false; last[n] = now; return true; };

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    const ctx = A.ctx, comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 5;
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = R() * 2 - 1;
    A.applyVolumes(); A.ready = true;
  };
  A.resume = function () { A.init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.applyVolumes = function () { if (!A.ctx) return; master.gain.value = S.master * 1.6; sfxBus.gain.value = S.sfx; musicBus.gain.value = S.music * 0.45; };

  function tone(o) {
    if (!A.ready || voices > 70) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = o.type || 'square'; osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.2 : o.vol, t + (o.attack || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.bus || sfxBus); osc.start(t); osc.stop(t + o.dur + 0.03); voices++; osc.onended = () => { voices--; };
  }
  function noise(o) {
    if (!A.ready || voices > 70) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = noiseBuf; src.loop = true; f.type = o.ftype || 'bandpass'; f.frequency.setValueAtTime(o.f0 || 1500, t); if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f1), t + o.dur); f.Q.value = o.q || 0.8;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.2 : o.vol, t + (o.attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus); src.start(t, R()); src.stop(t + o.dur + 0.03); voices++; src.onended = () => { voices--; };
  }
  const seq = (arr, step, o) => arr.forEach((f, i) => tone(Object.assign({ f0: f, dur: step * 1.4, delay: i * step }, o)));
  const X = A.sfx;
  X.select = () => { if (gate('sel', 40)) tone({ f0: 660, f1: 990, dur: 0.1, vol: 0.14 }); };
  X.blip = () => { if (gate('blip', 40)) tone({ f0: 520, dur: 0.05, vol: 0.1 }); };
  X.start = () => seq([392, 523, 659, 784], 0.07, { type: 'square', vol: 0.14 });
  X.throw = () => { if (!gate('thr', 40)) return; noise({ f0: 900, f1: 3800, dur: 0.14, vol: 0.13, q: 1.5 }); tone({ f0: 300, f1: 700, dur: 0.1, type: 'triangle', vol: 0.08 }); };
  X.empty = () => { if (gate('emp', 150)) tone({ f0: 160, f1: 120, dur: 0.12, type: 'sawtooth', vol: 0.1 }); };
  X.thud = () => { if (gate('thud', 50)) { tone({ f0: 140, f1: 60, dur: 0.12, type: 'sine', vol: 0.22 }); noise({ f0: 500, dur: 0.06, vol: 0.08 }); } };
  X.mat = () => { tone({ f0: 523, dur: 0.08, vol: 0.13 }); tone({ f0: 784, dur: 0.14, vol: 0.13, delay: 0.07 }); };
  X.mail = () => { tone({ f0: 1568, dur: 0.18, type: 'sine', vol: 0.16 }); tone({ f0: 2093, dur: 0.22, type: 'sine', vol: 0.1, delay: 0.05 }); };
  X.deliver = () => seq([659, 784, 988, 1319], 0.05, { type: 'triangle', vol: 0.14 });
  X.cancel = () => seq([392, 311, 233], 0.12, { type: 'sawtooth', vol: 0.12 });
  X.glass = () => { noise({ f0: 7000, f1: 2500, dur: 0.35, vol: 0.2, q: 0.7, ftype: 'highpass' }); for (let i = 0; i < 6; i++) tone({ f0: 2400 + R() * 3000, dur: 0.06, vol: 0.05, delay: R() * 0.2, type: 'triangle' }); };
  X.knock = () => { tone({ f0: 200, f1: 150, dur: 0.07, type: 'square', vol: 0.15 }); tone({ f0: 200, f1: 150, dur: 0.07, type: 'square', vol: 0.15, delay: 0.1 }); };
  X.crash = () => { noise({ f0: 1200, f1: 120, dur: 0.5, vol: 0.28, q: 0.6 }); tone({ f0: 180, f1: 40, dur: 0.4, type: 'sawtooth', vol: 0.2 }); };
  X.smash = () => { noise({ f0: 2000, f1: 300, dur: 0.18, vol: 0.18 }); tone({ f0: 300, f1: 90, dur: 0.12, type: 'square', vol: 0.1 }); };
  X.boom = () => { noise({ f0: 800, f1: 60, dur: 0.6, vol: 0.3, q: 0.5 }); tone({ f0: 110, f1: 30, dur: 0.5, type: 'sine', vol: 0.3 }); };
  X.honk = () => { if (!gate('honk', 250)) return; tone({ f0: 330, dur: 0.22, type: 'sawtooth', vol: 0.1 }); tone({ f0: 415, dur: 0.22, type: 'sawtooth', vol: 0.1 }); };
  X.bark = (h) => { if (!gate('bark', 150)) return; const f = 220 + ((h || 0) % 7) * 18; tone({ f0: f * 1.6, f1: f, dur: 0.11, type: 'sawtooth', vol: 0.14 }); tone({ f0: f * 1.6, f1: f, dur: 0.11, type: 'sawtooth', vol: 0.12, delay: 0.14 }); };
  X.yelp = () => tone({ f0: 900, f1: 380, dur: 0.22, type: 'triangle', vol: 0.15 });
  X.alarm = () => { for (let i = 0; i < 4; i++) tone({ f0: i % 2 ? 660 : 880, dur: 0.12, type: 'square', vol: 0.1, delay: i * 0.13 }); };
  X.clang = () => { tone({ f0: 1100, f1: 700, dur: 0.18, type: 'square', vol: 0.12 }); noise({ f0: 3000, dur: 0.08, vol: 0.1 }); };
  X.pickup = () => { tone({ f0: 880, dur: 0.07, vol: 0.13 }); tone({ f0: 1320, dur: 0.1, vol: 0.13, delay: 0.06 }); };
  X.power = () => seq([523, 659, 784, 1047, 1319], 0.045, { type: 'square', vol: 0.12 });
  X.oneup = () => seq([784, 988, 1175, 1568, 1319, 1568], 0.07, { type: 'square', vol: 0.14 });
  X.hop = () => tone({ f0: 300, f1: 640, dur: 0.12, type: 'sine', vol: 0.14 });
  X.land = () => { tone({ f0: 120, f1: 60, dur: 0.1, type: 'sine', vol: 0.2 }); };
  X.ramp = () => { tone({ f0: 200, f1: 1200, dur: 0.4, type: 'sawtooth', vol: 0.12 }); };
  X.hoop = () => seq([880, 1175, 1568], 0.05, { type: 'triangle', vol: 0.15 });
  X.target = () => { tone({ f0: 1760, dur: 0.06, vol: 0.14 }); tone({ f0: 880, dur: 0.14, type: 'triangle', vol: 0.14, delay: 0.05 }); };
  X.jingle = () => seq([523, 659, 784, 659, 784, 1047], 0.09, { type: 'triangle', vol: 0.16 });
  X.fanfare = () => { seq([523, 523, 523, 784, 659, 784, 1047], 0.1, { type: 'square', vol: 0.13 }); seq([262, 262, 262, 392, 330, 392, 523], 0.1, { type: 'triangle', vol: 0.12 }); };
  X.over = () => seq([392, 349, 330, 294, 262, 196], 0.18, { type: 'sawtooth', vol: 0.13 });

  /* ---------------- music ---------------- */
  const SONGS = {
    title: { bpm: 118, root: 57, wave: 'triangle', bass: [0, 0, 7, 5, 0, 0, 10, 7], lead: [12, null, 16, null, 19, null, 16, 12, 14, null, 17, null, 21, null, 17, 14], kick: [1, 0, 0, 0, 1, 0, 0, 1], hat: [0, 1, 0, 1, 0, 1, 0, 1] },
    intro: { bpm: 100, root: 55, wave: 'sine', bass: [0, null, 7, null, 5, null, 3, null], lead: [12, null, null, 15, null, null, 19, null, 17, null, null, 15, null, null, 12, null], kick: [1, 0, 0, 0, 0, 0, 0, 0], hat: [0, 0, 1, 0, 0, 0, 1, 0] },
    route: { bpm: 142, root: 52, wave: 'square', bass: [0, 0, 7, 0, 5, 5, 3, 7], lead: [12, 15, 19, 15, 12, 15, 17, 15, 14, 17, 21, 17, 14, 17, 19, 15], kick: [1, 0, 1, 0, 1, 0, 1, 1], hat: [1, 1, 1, 1, 1, 1, 1, 1] },
    course: { bpm: 156, root: 55, wave: 'square', bass: [0, 7, 0, 7, 5, 12, 5, 12], lead: [19, null, 24, null, 19, 17, 15, null, 17, null, 22, null, 17, 15, 12, null], kick: [1, 0, 0, 1, 1, 0, 0, 1], hat: [0, 1, 1, 1, 0, 1, 1, 1] },
    boss: { bpm: 150, root: 46, wave: 'sawtooth', bass: [0, 0, 1, 0, 0, 0, 3, 1], lead: [12, 13, 12, 10, 12, null, 15, 13, 12, 13, 12, 10, 8, null, 10, 12], kick: [1, 0, 1, 0, 1, 1, 1, 0], hat: [1, 0, 1, 1, 1, 0, 1, 1] },
  };
  let cur = null, step = 0, nextT = 0, timer = 0;
  const mid = (n) => 440 * Math.pow(2, (n - 69) / 12);
  function tick() {
    if (!A.ready || !cur) return;
    const ctx = A.ctx, sp = 60 / cur.bpm / 4;
    if (nextT < ctx.currentTime - 0.3) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.25) {
      const i = step % 16, t = nextT;
      const b = cur.bass[(i >> 1) % cur.bass.length];
      if (i % 2 === 0 && b !== null && b !== undefined) tone({ f0: mid(cur.root + b - 12), dur: sp * 1.7, type: 'triangle', vol: 0.4, at: t, bus: musicBus });
      const l = cur.lead[i];
      if (l !== null && l !== undefined) tone({ f0: mid(cur.root + l), dur: sp * 1.5, type: cur.wave, vol: 0.14, at: t, bus: musicBus });
      if (cur.kick[(i >> 1) % 8] && i % 2 === 0) tone({ f0: 150, f1: 45, dur: 0.12, type: 'sine', vol: 0.5, at: t, bus: musicBus });
      if (cur.hat[(i >> 1) % 8] && i % 2 === 1) noise({ f0: 7000, dur: 0.03, vol: 0.07, ftype: 'highpass', at: t, bus: musicBus });
      if (i % 8 === 4) noise({ f0: 1800, dur: 0.09, vol: 0.12, at: t, bus: musicBus });
      nextT += sp; step++;
    }
  }
  A.music = function (name) {
    if (!SONGS[name]) { cur = null; return; }
    if (cur === SONGS[name]) return;
    cur = SONGS[name]; step = 0;
    if (A.ctx) nextT = A.ctx.currentTime + 0.1;
    if (!timer) timer = setInterval(tick, 90);
  };
  A.stopMusic = () => { cur = null; };
  G.audio = A;
})((window.SGS = window.SGS || {}));
