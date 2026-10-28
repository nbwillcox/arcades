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
  X.countdown = (n) => { if (!n) return; tone({ type: 'square', f0: 440, dur: 0.16, vol: 0.22 }); };
  X.go = () => { tone({ type: 'square', f0: 880, dur: 0.14, vol: 0.24 }); tone({ type: 'square', f0: 1320, dur: 0.4, vol: 0.22, delay: 0.1 }); tone({ type: 'p25', f0: 660, dur: 0.4, vol: 0.12, delay: 0.1 }); };
  X.dash = () => { tone({ type: 'p25', f0: 260, f1: 1400, dur: 0.3, vol: 0.2 }); noise({ type: 'bandpass', f0: 600, f1: 3500, dur: 0.3, vol: 0.18, q: 1.5 }); };
  X.jump = () => { tone({ type: 'triangle', f0: 180, f1: 560, dur: 0.22, vol: 0.3 }); };
  X.land = () => { if (!gate('land', 120)) return; noise({ type: 'lowpass', f0: 600, f1: 90, dur: 0.18, vol: 0.4 }); tone({ type: 'sine', f0: 130, f1: 45, dur: 0.16, vol: 0.4 }); };
  X.wall = (i) => { if (!gate('wall', 90)) return; i = i === undefined ? 0.5 : i; noise({ type: 'highpass', f0: 1500, dur: 0.14, vol: 0.2 + 0.25 * i }); tone({ type: 'square', f0: 240, f1: 110, dur: 0.12, vol: 0.12 + 0.16 * i }); };
  X.bump = () => { if (!gate('bump', 120)) return; noise({ type: 'bandpass', f0: 900, dur: 0.07, vol: 0.28, q: 2 }); tone({ type: 'square', f0: 150, f1: 90, dur: 0.09, vol: 0.2 }); };
  X.mine = () => { noise({ type: 'lowpass', f0: 2600, f1: 120, dur: 0.5, vol: 0.55 }); tone({ type: 'sine', f0: 190, f1: 38, dur: 0.4, vol: 0.55 }); tone({ type: 'square', f0: 90, f1: 40, dur: 0.3, vol: 0.2 }); };
  X.boom = () => { noise({ type: 'lowpass', f0: 3000, f1: 80, dur: 1.1, vol: 0.7 }); tone({ type: 'sine', f0: 150, f1: 26, dur: 0.9, vol: 0.65 }); tone({ type: 'sawtooth', f0: 70, f1: 30, dur: 0.7, vol: 0.25 }); };
  X.lap = () => arp([523, 659, 784], 0.07, { type: 'square', dur: 0.12, vol: 0.2 });
  X.finalLap = () => arp([523, 659, 784, 1047, 1319], 0.06, { type: 'p25', dur: 0.13, vol: 0.22 });
  X.rankUp = () => arp([659, 988], 0.07, { type: 'square', dur: 0.1, vol: 0.18 });
  X.rankDown = () => arp([494, 330], 0.08, { type: 'square', dur: 0.12, vol: 0.16 });
  X.finish = () => { arp([523, 659, 784, 1047, 784, 1047, 1319], 0.1, { type: 'square', dur: 0.2, vol: 0.22 }); arp([262, 330, 392, 523], 0.2, { type: 'triangle', dur: 0.3, vol: 0.28 }); };
  X.select = () => { tone({ type: 'square', f0: 660, dur: 0.07, vol: 0.2 }); tone({ type: 'square', f0: 990, dur: 0.1, vol: 0.2, delay: 0.06 }); };
  X.blip = () => tone({ type: 'square', f0: 520, dur: 0.05, vol: 0.14 });
  X.back = () => { tone({ type: 'square', f0: 520, dur: 0.06, vol: 0.18 }); tone({ type: 'square', f0: 330, dur: 0.1, vol: 0.18, delay: 0.05 }); };
  X.win = () => { arp([523, 659, 784, 1047, 1319, 1568], 0.11, { type: 'p25', dur: 0.24, vol: 0.22 }); arp([262, 392, 523, 784], 0.22, { type: 'triangle', dur: 0.4, vol: 0.3 }); };
  X.lose = () => arp([392, 370, 349, 330, 294], 0.16, { type: 'square', dur: 0.24, vol: 0.2 });
  /* map race events onto sounds that need no extra data */
  A.onEvent = function (e) {
    if (e.name === 'rec' && gate('rec', 160)) tone({ type: 'p25', f0: 880, f1: 1180, dur: 0.07, vol: 0.1 });
    else if (e.name === 'lap' && G.race && e.data.k === G.race.laps - 1) A.music('race', G.race.tr.world, 1);
  };

  /* ---------- engine hum: stepped like a chip voice, pitch follows speed ---------- */
  let eng = null;
  A.engine = function (on) {
    if (!A.ready) return;
    if (!on) { if (eng) { eng.g.gain.setTargetAtTime(0, A.ctx.currentTime, 0.1); const e = eng; setTimeout(() => { try { e.a.stop(); e.b.stop(); e.c.stop(); } catch (x) { /* ignore */ } }, 400); eng = null; } return; }
    if (eng) return;
    const ctx = A.ctx, g = ctx.createGain(), a = ctx.createOscillator(), b = ctx.createOscillator(), c = ctx.createOscillator(), cg = ctx.createGain(), f = ctx.createBiquadFilter();
    a.setPeriodicWave(waves.p25); b.type = 'triangle'; c.type = 'sawtooth'; cg.gain.value = 0; f.type = 'lowpass'; f.frequency.value = 1400;
    g.gain.value = 0.0001; a.connect(g); b.connect(g); c.connect(cg); cg.connect(g); g.connect(f); f.connect(sfxBus);
    a.frequency.value = b.frequency.value = c.frequency.value = 60; a.start(); b.start(); c.start();
    eng = { g, a, b, c, cg, f, slide: 0 };
  };
  A.engineUpdate = function (R) {
    if (!eng || !A.ready) return;
    const P = R.P, t = A.ctx.currentTime, racing = R.state === 'race' || R.state === 'countdown' || R.state === 'finish';
    const sp = P.spdShow || 0, f0 = 52 + sp * 0.95, stepped = 52 * Math.pow(2, Math.round(12 * Math.log2(f0 / 52) * 0.5) / 6);
    eng.a.frequency.setTargetAtTime(stepped, t, 0.04); eng.b.frequency.setTargetAtTime(stepped / 2, t, 0.04); eng.c.frequency.setTargetAtTime(stepped * 1.5, t, 0.04);
    eng.g.gain.setTargetAtTime(racing && !P.dead ? 0.045 + Math.min(0.06, sp / 3200) : 0.0001, t, 0.08);
    eng.cg.gain.setTargetAtTime(P.boostOn ? 0.5 : 0, t, 0.05);
    eng.f.frequency.setTargetAtTime(900 + sp * 5, t, 0.1);
    if (P.slideT > 0.05 && gate('slide', 70)) noise({ type: 'bandpass', f0: 2200, dur: 0.09, vol: 0.07, q: 3 });
  };

  /* ---------- music: lead, arpeggio, bass and drums driven by a 16-step sequencer ---------- */
  const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], phrygian: [0, 1, 3, 5, 7, 8, 10], mixo: [0, 2, 4, 5, 7, 9, 10], harm: [0, 2, 3, 5, 7, 8, 11] };
  const R_ = -99;
  const SONGS = [
    { root: 9, scale: 'minor', tempo: 142, prog: [0, 5, 2, 6, 0, 5, 3, 4], A: [0, R_, 2, R_, 4, R_, 2, R_, 0, R_, 2, 4, 7, R_, 4, R_], B: [7, R_, 4, R_, 2, 4, 7, R_, 9, R_, 7, 4, 2, R_, 0, R_], drums: 'four', arp: [0, 2, 4, 7] },
    { root: 2, scale: 'dorian', tempo: 126, prog: [0, 3, 6, 4, 0, 3, 2, 4], A: [4, R_, R_, 2, 4, R_, 7, R_, 5, R_, R_, 4, 2, R_, 0, R_], B: [9, R_, 7, R_, 5, R_, 4, 2, 4, R_, 2, R_, 0, R_, R_, R_], drums: 'half', arp: [0, 4, 7, 9] },
    { root: 4, scale: 'phrygian', tempo: 152, prog: [0, 1, 0, 5, 0, 1, 6, 4], A: [0, 0, R_, 0, 2, R_, 1, R_, 0, 0, R_, 0, 4, R_, 2, 1], B: [7, R_, 7, 6, 4, R_, 2, R_, 4, 2, 1, 0, 1, 2, 4, R_], drums: 'break', arp: [0, 2, 4, 2] },
    { root: 7, scale: 'mixo', tempo: 134, prog: [0, 3, 4, 0, 0, 3, 4, 6], A: [0, R_, 4, R_, 2, R_, 4, 5, 4, R_, 2, R_, 0, R_, 2, R_], B: [7, R_, 5, 4, 5, R_, 4, 2, 0, 2, 4, R_, 7, R_, 4, R_], drums: 'four', arp: [0, 4, 2, 7] },
    { root: 6, scale: 'harm', tempo: 146, prog: [0, 5, 3, 4, 0, 5, 6, 4], A: [7, R_, R_, R_, 6, R_, 5, R_, 4, R_, R_, R_, 2, R_, 4, R_], B: [9, R_, R_, 7, 6, R_, 4, R_, 5, R_, 6, R_, 7, R_, R_, R_], drums: 'break', arp: [0, 2, 4, 7] },
    { root: 0, scale: 'minor', tempo: 118, prog: [0, 5, 3, 4, 0, 5, 6, 4], A: [4, R_, R_, 2, 4, R_, 5, R_, 7, R_, R_, 5, 4, R_, 2, R_], B: [7, R_, 5, 4, 5, R_, 7, R_, 9, R_, 7, 5, 4, R_, 2, R_], drums: 'half', arp: [0, 2, 4, 7] },
  ];
  const LAYERS = { lead: 1, arp: 0.8, bass: 1, drums: 1 }, L = {}, M = { on: false, step: 0, next: 0, song: 5, tempo: 120, boost: 1 };
  function initMusic() { for (const k in LAYERS) { L[k] = A.ctx.createGain(); L[k].gain.value = 0; L[k].connect(musicBus); } }
  const hz = (semis) => 261.63 * Math.pow(2, semis / 12);
  const deg = (sg, d) => { const sc = SCALES[sg.scale], i = ((d % 7) + 7) % 7; return sg.root + sc[i] + 12 * Math.floor(d / 7); };
  function schedStep(t, s) {
    const sg = SONGS[M.song], bar = (s >> 4) & 7, st = s & 15, cd = sg.prog[bar], six = 60 / (sg.tempo * M.boost) / 4, motif = bar < 4 ? sg.A : sg.B;
    if (st === 0) for (const k in LAYERS) L[k].gain.setTargetAtTime(LAYERS[k], t, 0.1);
    const lead = motif[st];
    if (lead !== R_) tone({ type: 'p25', f0: hz(deg(sg, cd + lead) + 12), dur: six * 2.1, vol: 0.085, bus: L.lead, attack: 0.006, at: t });
    if (st % 2 === 0 || M.boost > 1) tone({ type: 'p125', f0: hz(deg(sg, cd + sg.arp[(st >> 1) % 4]) + 24), dur: six * 0.9, vol: 0.04, bus: L.arp, at: t });
    const bs = [0, 3, 6, 8, 11, 14];
    if (bs.indexOf(st) >= 0) tone({ type: 'triangle', f0: hz(deg(sg, cd) - 24 + (st === 8 || st === 14 ? 7 : 0)), dur: six * 2.2, vol: 0.34, bus: L.bass, attack: 0.004, at: t });
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
  /** mode: 'off' | 'title' | 'race' (song = world index; level 1 = final lap, faster) */
  A.music = function (mode, world, level) {
    if (!A.ready) return;
    if (mode === 'off') { M.on = false; for (const k in L) L[k].gain.setTargetAtTime(0, A.ctx.currentTime, 0.2); return; }
    const song = mode === 'race' ? world : 5, boost = level ? 1.1 : 1;
    if (!M.on || M.song !== song) { M.step = 0; M.next = A.ctx.currentTime + 0.08; }
    M.song = song; M.boost = boost;
    if (!M.on) { M.on = true; if (!M.timer) M.timer = setInterval(scheduler, 30); }
  };
  G.audio = A;
})((window.SGS = window.SGS || {}));
