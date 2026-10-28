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

  /* ---------- effects ---------- */
  const X = A.sfx, arp = (notes, step, o) => notes.forEach((f, i) => tone(Object.assign({ f0: f, delay: i * step }, o)));
  X.jump = () => tone({ type: 'square', f0: 330, f1: 780, dur: 0.14, vol: 0.18 });
  X.blow = () => { tone({ type: 'p25', f0: 520, f1: 900, dur: 0.1, vol: 0.18 }); noise({ type: 'bandpass', f0: 1800, dur: 0.07, vol: 0.12, q: 2 }); };
  X.pop = () => { if (!gate('pop', 25)) return; tone({ type: 'square', f0: 1100, f1: 300, dur: 0.07, vol: 0.18 }); noise({ type: 'highpass', f0: 3000, dur: 0.05, vol: 0.12 }); };
  X.trap = () => { tone({ type: 'p25', f0: 440, f1: 220, dur: 0.18, vol: 0.2 }); tone({ type: 'triangle', f0: 880, f1: 440, dur: 0.14, vol: 0.2, delay: 0.05 }); };
  X.free = () => arp([330, 247, 330, 247], 0.05, { type: 'square', dur: 0.06, vol: 0.14 });
  X.spawn = () => { if (!gate('spawn', 60)) return; tone({ type: 'square', f0: 200, f1: 900, dur: 0.18, vol: 0.12 }); };
  X.die = () => { tone({ type: 'square', f0: 700, f1: 90, dur: 0.7, vol: 0.28 }); noise({ type: 'lowpass', f0: 2000, f1: 100, dur: 0.5, vol: 0.2 }); };
  X.gameOver = () => arp([392, 349, 330, 294, 262], 0.18, { type: 'square', dur: 0.3, vol: 0.2 });
  X.level = () => arp([392, 523, 659], 0.07, { type: 'p25', dur: 0.1, vol: 0.16 });
  X.clear = () => { arp([523, 659, 784, 1047, 1319], 0.08, { type: 'square', dur: 0.16, vol: 0.2 }); arp([262, 330, 392], 0.16, { type: 'triangle', dur: 0.3, vol: 0.28 }); };
  X.extend = () => arp([523, 659, 784, 1047, 784, 1047, 1319, 1568], 0.07, { type: 'p25', dur: 0.14, vol: 0.22 });
  X.letter = () => arp([880, 1175, 1568], 0.05, { type: 'square', dur: 0.08, vol: 0.16 });
  X.item = () => { if (!gate('item', 40)) return; tone({ type: 'square', f0: 1046, dur: 0.06, vol: 0.15 }); tone({ type: 'square', f0: 1568, dur: 0.1, vol: 0.15, delay: 0.05 }); };
  X.power = () => arp([523, 784, 1047, 1568], 0.05, { type: 'square', dur: 0.09, vol: 0.18 });
  X.blast = () => { noise({ type: 'bandpass', f0: 500, f1: 3000, dur: 0.4, vol: 0.3, q: 1.2 }); tone({ type: 'sawtooth', f0: 120, f1: 600, dur: 0.35, vol: 0.14 }); };
  X.boom = () => { noise({ type: 'lowpass', f0: 2600, f1: 100, dur: 0.4, vol: 0.4 }); tone({ type: 'sine', f0: 150, f1: 35, dur: 0.35, vol: 0.4 }); };
  X.zap = () => { if (!gate('zap', 80)) return; tone({ type: 'sawtooth', f0: 900, f1: 200, dur: 0.12, vol: 0.14 }); };
  X.warp = () => { tone({ type: 'p25', f0: 200, f1: 1800, dur: 0.6, vol: 0.2 }); noise({ type: 'bandpass', f0: 400, f1: 4000, dur: 0.6, vol: 0.15, q: 1 }); };
  X.hurry = () => arp([784, 659, 784, 659, 784, 659], 0.1, { type: 'square', dur: 0.09, vol: 0.2 });
  X.maw = () => { tone({ type: 'sawtooth', f0: 70, f1: 40, dur: 1.2, vol: 0.3 }); noise({ type: 'lowpass', f0: 500, dur: 1.0, vol: 0.25 }); };
  X.boss = () => { tone({ type: 'sawtooth', f0: 90, f1: 50, dur: 0.5, vol: 0.28 }); noise({ type: 'lowpass', f0: 1200, f1: 80, dur: 0.5, vol: 0.3 }); };
  X.hit = () => { if (!gate('hit', 50)) return; tone({ type: 'square', f0: 300, f1: 140, dur: 0.08, vol: 0.2 }); noise({ type: 'highpass', f0: 1500, dur: 0.06, vol: 0.15 }); };
  X.select = () => { tone({ type: 'square', f0: 660, dur: 0.07, vol: 0.18 }); tone({ type: 'square', f0: 990, dur: 0.1, vol: 0.18, delay: 0.06 }); };
  X.blip = () => tone({ type: 'square', f0: 520, dur: 0.05, vol: 0.12 });
  X.back = () => { tone({ type: 'square', f0: 520, dur: 0.06, vol: 0.16 }); tone({ type: 'square', f0: 330, dur: 0.1, vol: 0.16, delay: 0.05 }); };
  X.win = () => { arp([523, 659, 784, 1047, 1319, 1568], 0.11, { type: 'p25', dur: 0.24, vol: 0.22 }); arp([262, 392, 523, 784], 0.22, { type: 'triangle', dur: 0.4, vol: 0.3 }); };

  /* ---------- music: lead, arpeggio, bass and drums on a 16-step sequencer; 5 world themes + boss + title + ending ---------- */
  const SCALES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], mixo: [0, 2, 4, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10], lyd: [0, 2, 4, 6, 7, 9, 11] };
  const R_ = -99;
  const SONGS = [
    { root: 0, scale: 'major', tempo: 132, prog: [0, 4, 5, 3, 0, 4, 1, 4], A: [4, R_, 2, 4, 7, R_, 4, R_, 5, R_, 4, 2, 4, R_, R_, R_], B: [7, R_, 9, 7, 4, R_, 2, 4, 5, R_, 4, 2, 0, R_, R_, R_], drums: 'four', arp: [0, 2, 4, 7] },
    { root: 9, scale: 'minor', tempo: 138, prog: [0, 5, 2, 6, 0, 5, 3, 4], A: [0, R_, 2, R_, 4, R_, 2, R_, 0, R_, 2, 4, 7, R_, 4, R_], B: [7, R_, 4, R_, 2, 4, 7, R_, 9, R_, 7, 4, 2, R_, 0, R_], drums: 'four', arp: [0, 2, 4, 7] },
    { root: 5, scale: 'lyd', tempo: 120, prog: [0, 1, 4, 0, 0, 1, 5, 4], A: [4, R_, R_, 2, 4, R_, 7, R_, 6, R_, R_, 4, 2, R_, 0, R_], B: [9, R_, 7, R_, 6, R_, 4, 2, 4, R_, 2, R_, 0, R_, R_, R_], drums: 'half', arp: [0, 4, 2, 7] },
    { root: 2, scale: 'dorian', tempo: 142, prog: [0, 3, 6, 4, 0, 3, 2, 4], A: [0, 0, R_, 2, 4, R_, 2, R_, 0, 0, R_, 4, 7, R_, 4, 2], B: [7, R_, 7, 4, 2, R_, 4, R_, 5, R_, 4, 2, 0, 2, 4, R_], drums: 'break', arp: [0, 2, 4, 2] },
    { root: 7, scale: 'mixo', tempo: 126, prog: [0, 3, 4, 0, 0, 3, 4, 6], A: [0, R_, 4, R_, 2, R_, 4, 5, 4, R_, 2, R_, 0, R_, 2, R_], B: [7, R_, 5, 4, 5, R_, 4, 2, 0, 2, 4, R_, 7, R_, 4, R_], drums: 'four', arp: [0, 4, 2, 7] },
    { root: 4, scale: 'phryg', tempo: 158, prog: [0, 1, 0, 5, 0, 1, 6, 4], A: [0, 0, R_, 0, 2, R_, 1, R_, 0, 0, R_, 0, 4, R_, 2, 1], B: [7, R_, 7, 6, 4, R_, 2, R_, 4, 2, 1, 0, 1, 2, 4, R_], drums: 'break', arp: [0, 2, 4, 2] },
    { root: 0, scale: 'major', tempo: 112, prog: [0, 4, 5, 2, 3, 0, 1, 4], A: [4, R_, R_, 2, 4, R_, 5, R_, 7, R_, 5, 4, 2, R_, 0, R_], B: [7, R_, 9, R_, 7, 5, 4, R_, 5, 4, 2, R_, 0, R_, R_, R_], drums: 'half', arp: [0, 2, 4, 7] },
    { root: 0, scale: 'major', tempo: 128, prog: [0, 3, 4, 0, 5, 3, 1, 4], A: [7, R_, 4, R_, 7, 9, 7, R_, 5, R_, 2, R_, 4, R_, 7, R_], B: [9, R_, 7, 9, 11, R_, 9, R_, 7, R_, 4, 5, 7, R_, R_, R_], drums: 'four', arp: [0, 2, 4, 7] },
  ];
  const THEME_SONG = [0, 1, 2, 3, 4], BOSS = 5, TITLE = 6, ENDING = 6;
  const LAYERS = { lead: 1, arp: 0.8, bass: 1, drums: 1 }, L = {}, M = { on: false, step: 0, next: 0, song: 0, boost: 1, ending: false };
  function initMusic() { for (const k in LAYERS) { L[k] = A.ctx.createGain(); L[k].gain.value = 0; L[k].connect(musicBus); } }
  const hz = (semis) => 261.63 * Math.pow(2, semis / 12);
  const deg = (sg, d) => { const sc = SCALES[sg.scale], i = ((d % 7) + 7) % 7; return sg.root + sc[i] + 12 * Math.floor(d / 7); };
  function schedStep(t, s) {
    const sg = SONGS[M.song], bar = (s >> 4) & 7, st = s & 15, cd = sg.prog[bar], six = 60 / (sg.tempo * M.boost) / 4, motif = bar < 4 ? sg.A : sg.B;
    if (st === 0) for (const k in LAYERS) L[k].gain.setTargetAtTime(LAYERS[k], t, 0.1);
    const lead = motif[st];
    if (lead !== R_) tone({ type: 'p25', f0: hz(deg(sg, cd + lead) + 12), dur: six * 2.1, vol: 0.085, bus: L.lead, attack: 0.006, at: t });
    if (st % 2 === 0 || M.boost > 1) tone({ type: 'p125', f0: hz(deg(sg, cd + sg.arp[(st >> 1) % 4]) + 24), dur: six * 0.9, vol: 0.04, bus: L.arp, at: t });
    if ([0, 3, 6, 8, 11, 14].indexOf(st) >= 0) tone({ type: 'triangle', f0: hz(deg(sg, cd) - 24 + (st === 8 || st === 14 ? 7 : 0)), dur: six * 2.2, vol: 0.34, bus: L.bass, attack: 0.004, at: t });
    const kick = sg.drums === 'break' ? [0, 6, 10] : sg.drums === 'half' ? [0, 10] : [0, 4, 8, 12], snare = sg.drums === 'half' ? [8] : [4, 12];
    if (kick.indexOf(st) >= 0) tone({ type: 'sine', f0: 160, f1: 42, dur: 0.14, vol: 0.55, bus: L.drums, at: t });
    if (snare.indexOf(st) >= 0) { noise({ type: 'highpass', f0: 1800, dur: 0.12, vol: 0.2, bus: L.drums, at: t }); tone({ type: 'triangle', f0: 210, f1: 120, dur: 0.08, vol: 0.16, bus: L.drums, at: t }); }
    if (st % (sg.drums === 'half' ? 4 : 2) === 0) noise({ type: 'highpass', f0: 7500, dur: st % 4 === 2 ? 0.08 : 0.035, vol: st % 4 === 2 ? 0.1 : 0.06, bus: L.drums, at: t });
  }
  function scheduler() {
    if (!M.on || !A.ready || A.ctx.state !== 'running') return;
    const ctx = A.ctx;
    if (M.next < ctx.currentTime - 0.25) M.next = ctx.currentTime + 0.05;
    while (M.next < ctx.currentTime + 0.14) { schedStep(M.next, M.step); M.next += 60 / (SONGS[M.song].tempo * M.boost) / 4; M.step = (M.step + 1) & 127; }
  }
  /** mode: 'off' | 'title' | 'ending' | 'play' | 'boss' | 'hurry' (play theme, faster); theme: 0-4 */
  A.music = function (mode, theme) {
    if (!A.ready) return;
    if (mode === 'off') { M.on = false; for (const k in L) L[k].gain.setTargetAtTime(0, A.ctx.currentTime, 0.2); return; }
    const song = mode === 'title' ? TITLE : mode === 'ending' ? ENDING : mode === 'boss' ? BOSS : THEME_SONG[(theme | 0) % 5], boost = mode === 'hurry' ? 1.28 : mode === 'boss' ? 1.04 : 1;
    if (!M.on || M.song !== song) { M.step = 0; M.next = A.ctx.currentTime + 0.08; }
    M.song = song; M.boost = boost;
    if (!M.on) { M.on = true; if (!M.timer) M.timer = setInterval(scheduler, 30); }
  };
  G.audio = A;
})((window.SGS = window.SGS || {}));
