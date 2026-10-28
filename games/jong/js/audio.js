/* All sound is synthesized live with the Web Audio API (square / pulse / triangle / noise, 8-bit style) - no audio files. */
(function (G) {
  'use strict';
  const S = G.settings;
  const A = { ctx: null, ready: false, sfx: {} };
  let master, sfxBus, musicBus, noiseBuf, voices = 0;
  const last = {}, waves = {};
  const gate = (name, ms) => { const now = performance.now(); if (now - (last[name] || 0) < ms) return false; last[name] = now; return true; };

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC(); } catch (e) { return; }
    const ctx = A.ctx, comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.18;
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    for (const [name, duty] of [['p25', 0.25], ['p125', 0.125], ['p50', 0.5]]) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
      waves[name] = ctx.createPeriodicWave(re, im);
    }
    A.applyVolumes(); A.ready = true; initMusic();
  };
  A.resume = function () { A.init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.suspend = function () { if (A.ctx) A.ctx.suspend(); };
  A.resumeAll = function () { if (A.ctx) A.ctx.resume(); };
  A.applyVolumes = function () { if (!A.ctx) return; master.gain.value = S.master; sfxBus.gain.value = S.sfx; musicBus.gain.value = S.music * 0.5; };

  function tone(o) {
    if (!A.ready || voices > 56) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0), osc = ctx.createOscillator(), g = ctx.createGain();
    if (waves[o.type]) osc.setPeriodicWave(waves[o.type]); else osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1 && o.f1 !== o.f0) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.2 : o.vol, t + (o.attack || 0.003)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); g.connect(o.bus || sfxBus); osc.start(t); osc.stop(t + o.dur + 0.03);
    voices++; osc.onended = () => { voices--; g.disconnect(); };
  }
  function noise(o) {
    if (!A.ready || voices > 56) return;
    const ctx = A.ctx, t = o.at !== undefined ? o.at : ctx.currentTime + (o.delay || 0), src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = noiseBuf; f.type = o.type || 'lowpass'; f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    if (o.q) f.Q.value = o.q;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(o.vol === undefined ? 0.3 : o.vol, t + (o.attack || 0.004)); g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus); src.start(t, Math.random() * 1.5, o.dur + 0.05);
    voices++; src.onended = () => { voices--; g.disconnect(); };
  }
  A.tone = tone; A.noise = noise;

  /* ---------- effects: glass chimes, shimmer and soft UI blips ---------- */
  const X = A.sfx, arp = (notes, step, o) => notes.forEach((f, i) => tone(Object.assign({ f0: f, delay: i * step }, o)));
  const ping = (f, d, v, dl, ty) => tone({ type: ty || 'sine', f0: f, dur: d, vol: v, delay: dl || 0 });
  const PENT = [0, 2, 4, 7, 9];
  const note = (n) => 523.25 * Math.pow(2, (PENT[n % 5] + 12 * Math.floor(n / 5)) / 12);
  X.pick = () => { ping(880, 0.16, 0.14); ping(1319, 0.22, 0.08, 0.02); };
  X.drop = () => { ping(660, 0.1, 0.1); };
  X.blocked = () => { if (!gate('blk', 90)) return; tone({ type: 'triangle', f0: 150, f1: 95, dur: 0.16, vol: 0.2 }); noise({ type: 'lowpass', f0: 700, f1: 200, dur: 0.1, vol: 0.1 }); };
  X.nomatch = () => { tone({ type: 'sine', f0: 330, f1: 260, dur: 0.18, vol: 0.14 }); };
  X.shatter = (n) => { noise({ type: 'highpass', f0: 2600, f1: 8000, dur: 0.4, vol: 0.18 + n * 0.02, q: 0.8 }); for (let i = 0; i < 5 + n; i++) ping(1800 + Math.random() * 3600, 0.12 + Math.random() * 0.14, 0.04, i * 0.018); };
  X.match = (combo) => {
    const n = Math.min(14, combo * 2); X.shatter(Math.min(4, combo));
    arp([note(n), note(n + 2), note(n + 4)], 0.055, { type: 'sine', dur: 0.4, vol: 0.16 });
    ping(note(n) / 2, 0.5, 0.1, 0, 'triangle');
    if (combo > 2) { noise({ type: 'bandpass', f0: 1500, f1: 6000, dur: 0.3, vol: 0.08 * Math.min(4, combo), q: 1.2 }); }
  };
  X.combo = (n) => arp([note(n), note(n + 2), note(n + 4), note(n + 7)], 0.05, { type: 'p25', dur: 0.16, vol: 0.1 });
  X.hint = () => { ping(1568, 0.3, 0.09); ping(2093, 0.4, 0.07, 0.09); };
  X.undo = () => { tone({ type: 'sine', f0: 1500, f1: 400, dur: 0.22, vol: 0.14 }); ping(600, 0.18, 0.08, 0.1); };
  X.shuffle = () => { noise({ type: 'bandpass', f0: 400, f1: 4500, dur: 0.7, vol: 0.2, q: 1.5 }); tone({ type: 'sawtooth', f0: 120, f1: 900, dur: 0.6, vol: 0.06 }); arp([880, 1109, 1319, 1760], 0.07, { type: 'sine', dur: 0.3, vol: 0.1, delay: 0.5 }); };
  X.intro = () => { noise({ type: 'bandpass', f0: 300, f1: 3500, dur: 1.3, vol: 0.12, q: 0.9 }); arp([392, 523, 659, 784, 1047], 0.14, { type: 'sine', dur: 0.6, vol: 0.09 }); };
  X.tick = () => { if (gate('tick', 600)) tone({ type: 'square', f0: 880, dur: 0.05, vol: 0.1 }); };
  X.stuck = () => { arp([392, 349, 330], 0.12, { type: 'triangle', dur: 0.3, vol: 0.14 }); };
  X.win = () => { arp([523, 659, 784, 1047, 1319, 1568, 2093], 0.09, { type: 'sine', dur: 0.7, vol: 0.18 }); arp([262, 392, 523, 784], 0.2, { type: 'triangle', dur: 0.8, vol: 0.2 }); noise({ type: 'highpass', f0: 4000, dur: 1.4, vol: 0.06 }); };
  X.firework = () => { noise({ type: 'highpass', f0: 3000, f1: 9000, dur: 0.3, vol: 0.1 }); ping(1500 + Math.random() * 2000, 0.2, 0.06); };
  X.over = () => arp([392, 349, 330, 294, 262, 196], 0.17, { type: 'triangle', dur: 0.45, vol: 0.2 });
  X.select = () => { ping(660, 0.12, 0.12); ping(990, 0.2, 0.1, 0.06); };
  X.blip = () => ping(520, 0.06, 0.08, 0, 'triangle');
  X.back = () => { ping(520, 0.08, 0.1); ping(330, 0.14, 0.1, 0.05); };

  /* ---------- music: slow ambient chord loop, bell arpeggios and a soft pad ---------- */
  const CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 67], [48, 52, 55, 59, 64], [55, 59, 62, 64, 69]], ARP = [0, 2, 4, 3, 1, 4, 2, 3, 0, 3, 4, 2, 1, 3, 2, 4];
  const L = {}, M = { on: false, step: 0, next: 0, boost: 1 }, mtof = (m) => 440 * Math.pow(2, (m - 69) / 12), SD = 60 / 76 / 2;
  function initMusic() { for (const k of ['pad', 'arp', 'bass']) { L[k] = A.ctx.createGain(); L[k].gain.value = 0; L[k].connect(musicBus); } }
  function schedStep(t, s) {
    const bar = (s >> 4) & 3, st = s & 15, ch = CH[bar];
    if (st === 0) {
      for (const k in L) L[k].gain.setTargetAtTime(k === 'arp' ? 0.9 : 1, t, 0.3);
      ch.slice(0, 4).forEach((m, i) => tone({ type: 'sine', f0: mtof(m - 12), dur: SD * 15, vol: 0.05, attack: 1.4, bus: L.pad, at: t + i * 0.03 }));
      tone({ type: 'triangle', f0: mtof(ch[0] - 24), dur: SD * 7, vol: 0.26, attack: 0.05, bus: L.bass, at: t });
    }
    if (st === 8) tone({ type: 'triangle', f0: mtof(ch[2] - 24), dur: SD * 6, vol: 0.18, attack: 0.05, bus: L.bass, at: t });
    if (st % 2 === 0 || (M.boost > 1 && Math.random() < 0.5)) tone({ type: 'sine', f0: mtof(ch[ARP[st]] + (st & 4 ? 24 : 12)), dur: SD * 5, vol: 0.055, attack: 0.008, bus: L.arp, at: t });
    if (st === 4 && bar % 2 === 1) noise({ type: 'highpass', f0: 6000, dur: 0.5, vol: 0.02, bus: L.arp, at: t });
  }
  function scheduler() {
    if (!M.on || !A.ready || A.ctx.state !== 'running') return;
    const ctx = A.ctx;
    if (M.next < ctx.currentTime - 0.25) M.next = ctx.currentTime + 0.05;
    while (M.next < ctx.currentTime + 0.14) { schedStep(M.next, M.step); M.next += SD / M.boost; M.step = (M.step + 1) & 63; }
  }
  /** mode: 'off' | 'title' | 'play' */
  A.music = function (mode) {
    if (!A.ready) return;
    if (mode === 'off') { M.on = false; for (const k in L) L[k].gain.setTargetAtTime(0, A.ctx.currentTime, 0.3); return; }
    M.boost = mode === 'play' ? 1.12 : 1;
    if (!M.on) { M.step = 0; M.next = A.ctx.currentTime + 0.08; M.on = true; if (!M.timer) M.timer = setInterval(scheduler, 30); }
  };
  G.audio = A;
})((window.SGS = window.SGS || {}));
