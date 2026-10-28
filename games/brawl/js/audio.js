/* All sound is synthesized live with the Web Audio API - no audio files. 8-bit effects plus a pulse/triangle/noise chiptune sequencer. */
(function (G) {
  'use strict';
  const S = G.settings;
  const A = { ctx: null, ready: false, sfx: {} };
  let master, sfxBus, musicBus, noiseBuf;
  const last = {}, waves = {};

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
    try { A.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    const ctx = A.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.applyVolumes();
    A.ready = true;
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

  function pulse(duty) {
    if (waves[duty]) return waves[duty];
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return (waves[duty] = A.ctx.createPeriodicWave(re, im));
  }
  /* one note: type 'square' / 'triangle' / 'sawtooth' / 'sine' or 'p25' / 'p12' (pulse), optional pitch slide */
  function tone(f, dur, type, vol, slideTo, delay, bus) {
    if (!A.ready) return;
    const ctx = A.ctx, t0 = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    if (type === 'p25') o.setPeriodicWave(pulse(0.25)); else if (type === 'p12') o.setPeriodicWave(pulse(0.125)); else o.type = type || 'square';
    o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, freq, delay, bus, q, type) {
    if (!A.ready) return;
    const ctx = A.ctx, t0 = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = q || 0.8;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.03);
  }
  function sweepNoise(dur, vol, f0, f1) {
    if (!A.ready) return;
    const ctx = A.ctx, t0 = ctx.currentTime, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.Q.value = 1.4;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(sfxBus);
    s.start(t0, Math.random() * 0.5); s.stop(t0 + dur + 0.03);
  }

  const N = (() => { const o = {}, names = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']; for (let m = 24; m < 96; m++) o[names[m % 12] + (Math.floor(m / 12) - 1)] = 440 * Math.pow(2, (m - 69) / 12); return o; })();
  const semi = (root, n) => root * Math.pow(2, n / 12);

  /* ---------- effects ---------- */
  A.sfx.punch = function () { if (!gate('punch', 30)) return; noise(0.07, 0.2, 1500, 0, 0, 0.6); tone(170, 0.08, 'square', 0.12, 90); };
  A.sfx.punchH = function () { noise(0.14, 0.26, 900, 0, 0, 0.6); tone(120, 0.16, 'square', 0.16, 50); tone(70, 0.2, 'triangle', 0.2, 40); };
  A.sfx.kick = function () { noise(0.11, 0.24, 1100, 0, 0, 0.6); tone(150, 0.14, 'square', 0.14, 60); tone(80, 0.18, 'triangle', 0.18, 45); };
  A.sfx.whoosh = function () { if (!gate('whoosh', 70)) return; sweepNoise(0.14, 0.09, 700, 2400); };
  A.sfx.swing = function () { if (!gate('swing', 70)) return; sweepNoise(0.2, 0.12, 400, 1800); };
  A.sfx.bat = function () { noise(0.16, 0.3, 700, 0, 0, 0.6); tone(95, 0.2, 'square', 0.2, 40); tone(300, 0.07, 'p25', 0.1, 120); };
  A.sfx.stab = function () { noise(0.08, 0.2, 3200, 0, 0, 1.2); tone(520, 0.08, 'p25', 0.1, 260); };
  A.sfx.jump = function () { if (!gate('jump', 60)) return; tone(260, 0.14, 'p25', 0.08, 560); };
  A.sfx.land = function () { if (!gate('land', 50)) return; noise(0.09, 0.14, 300, 0, 0, 0.5); tone(90, 0.1, 'triangle', 0.14, 55); };
  A.sfx.thud = function () { noise(0.2, 0.28, 220, 0, 0, 0.5, 'lowpass'); tone(70, 0.22, 'triangle', 0.26, 38); };
  A.sfx.grab = function () { tone(520, 0.05, 'square', 0.1); tone(780, 0.05, 'square', 0.1, 0, 0.05); };
  A.sfx.knee = function () { noise(0.09, 0.22, 800, 0, 0, 0.6); tone(110, 0.12, 'square', 0.14, 55); };
  A.sfx.throw = function () { sweepNoise(0.22, 0.16, 500, 2000); tone(200, 0.16, 'p25', 0.08, 500); };
  A.sfx.pickup = function () { [N.E5, N.A5].forEach((f, i) => tone(f, 0.07, 'p25', 0.1, 0, i * 0.05)); };
  A.sfx.food = function () { [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.09, 'p25', 0.12, 0, i * 0.065)); };
  A.sfx.snap = function () { noise(0.1, 0.22, 2400, 0, 0, 1); tone(240, 0.12, 'sawtooth', 0.12, 80); };
  A.sfx.die = function () { tone(500, 0.7, 'sawtooth', 0.14, 50); tone(250, 0.7, 'square', 0.08, 40, 0.05); };
  A.sfx.kill = function () { tone(330, 0.1, 'p25', 0.1, 150); };
  A.sfx.extra = function () { [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach((f, i) => tone(f, 0.1, 'p12', 0.12, 0, i * 0.075)); };
  A.sfx.go = function () { [N.G5, N.C6].forEach((f, i) => tone(f, 0.12, 'p25', 0.12, 0, i * 0.11)); };
  A.sfx.warn = function () { tone(220, 0.14, 'square', 0.12); tone(220, 0.14, 'square', 0.12, 0, 0.2); };
  A.sfx.clear = function () { [N.C5, N.E5, N.G5, N.C6, 0, N.G5, N.C6, N.E6 || N.C6 * 1.25].forEach((f, i) => { if (f) tone(f, 0.16, 'p25', 0.13, 0, i * 0.13); }); tone(N.C3, 1.1, 'triangle', 0.16); };
  A.sfx.select = function () { tone(660, 0.06, 'p25', 0.1); };
  A.sfx.start = function () { [N.C5, N.G5, N.C6].forEach((f, i) => tone(f, 0.09, 'p25', 0.12, 0, i * 0.06)); };
  A.sfx.tick = function () { tone(900, 0.04, 'square', 0.06); };

  /* ---------- music: a 16th-note sequencer ---------- */
  /* each track: bpm, bars[] of {root (bass Hz), lead[16] of semitone offsets from `key` or null, arp?}, drums pattern */
  const A3 = N.A2, KEY = N.A4;
  const T = {};
  /* title: slow, moody */
  T.title = {
    bpm: 112, key: N.A4, lead: 'p25', leadVol: 0.085,
    bars: [
      { r: N.A2, l: [0, null, null, 3, null, 7, null, null, 5, null, 3, null, 0, null, null, null] },
      { r: N.F2, l: [-4, null, null, 0, null, 3, null, null, 5, null, 3, null, 0, null, -4, null] },
      { r: N.G2, l: [-2, null, null, 2, null, 5, null, null, 7, null, 5, null, 2, null, -2, null] },
      { r: N.E2, l: [-5, null, null, -1, null, 2, null, null, 4, null, 2, null, -1, null, 7, null] },
    ],
    drums: { kick: [0, 8], snare: [4, 12], hat: [2, 6, 10, 14] }, bassOct: [0, 0, 12, 0, 0, 0, 12, 0],
  };
  /* level 1: driving street theme */
  T.street = {
    bpm: 148, key: N.A4, lead: 'p25', leadVol: 0.09,
    bars: [
      { r: N.A2, l: [0, 0, null, 3, 0, null, 7, null, 5, null, 3, null, 0, null, 3, 5] },
      { r: N.A2, l: [7, null, 7, 5, 3, null, 5, null, 3, 0, null, -2, 0, null, null, null] },
      { r: N.F2, l: [-4, -4, null, 0, -4, null, 3, null, 5, null, 3, null, 0, null, 3, 5] },
      { r: N.G2, l: [7, null, 7, 5, 2, null, 5, 7, 9, null, 7, null, 5, 2, 0, -2] },
      { r: N.A2, l: [12, null, 12, 10, 7, null, 10, null, 7, 5, 3, null, 5, null, 3, 0] },
      { r: N.A2, l: [0, null, 3, null, 7, null, 12, null, 10, null, 7, null, 5, 3, 5, 7] },
      { r: N.F2, l: [5, null, 5, 3, 0, null, 3, null, 5, null, 8, null, 7, 5, 3, 0] },
      { r: N.E2, l: [4, null, 4, 7, 11, null, 7, null, 4, null, 7, 11, 12, null, 11, 7] },
    ],
    drums: { kick: [0, 6, 8, 14], snare: [4, 12], hat: [2, 6, 10, 14, 15] }, bassOct: [0, 0, 12, 0, 0, 12, 0, 12],
  };
  /* boss: tense, faster, minor second colour */
  T.boss = {
    bpm: 168, key: N.A4, lead: 'p12', leadVol: 0.08,
    bars: [
      { r: N.A2, l: [0, null, 1, null, 0, null, -1, null, 0, null, 7, null, 6, null, 7, null] },
      { r: N.A2, l: [0, 0, null, 12, null, 11, null, 7, 6, null, 7, null, 0, null, 1, null] },
      { r: N.F2, l: [5, null, 6, null, 5, null, 4, null, 5, null, 12, null, 11, null, 12, null] },
      { r: N.E2, l: [4, 4, null, 11, null, 10, null, 7, 6, null, 4, null, 3, null, 4, null] },
    ],
    drums: { kick: [0, 3, 8, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] }, bassOct: [0, 12, 0, 12, 0, 12, 0, 12],
  };

  /* warehouse: gritty, mid tempo, low square lead */
  T.warehouse = {
    bpm: 132, key: N.E4, lead: 'p12', leadVol: 0.085,
    bars: [
      { r: N.E2, l: [0, null, 0, null, 3, null, 0, null, 5, null, 3, null, 0, null, -2, null] },
      { r: N.E2, l: [7, null, 7, 5, 3, null, 5, null, 3, null, 0, null, 3, 5, 7, null] },
      { r: N.C2, l: [-4, null, -4, null, 0, null, -4, null, 3, null, 0, null, -4, null, -1, null] },
      { r: N.D2, l: [-2, null, -2, 0, 3, null, 5, null, 3, null, 0, null, -2, null, 0, 3] },
      { r: N.E2, l: [12, null, 10, null, 7, null, 10, 7, 5, null, 3, null, 5, null, 7, null] },
      { r: N.E2, l: [0, 3, 0, null, 7, null, 3, null, 0, 3, 5, null, 3, null, 0, null] },
      { r: N.C2, l: [-4, 0, -4, null, 3, null, 0, null, 5, null, 3, 0, -4, null, 0, 3] },
      { r: N.B1, l: [-5, null, -5, null, -1, null, 2, null, 4, null, 2, null, -1, null, -5, null] },
    ],
    drums: { kick: [0, 4, 8, 10, 12], snare: [4, 12], hat: [2, 6, 10, 14] }, bassOct: [0, 0, 0, 12, 0, 0, 12, 0],
  };
  /* dojo: pentatonic, a sparse lead over a steady taiko beat */
  T.dojo = {
    bpm: 118, key: N.D4, lead: 'p25', leadVol: 0.09,
    bars: [
      { r: N.D2, l: [0, null, null, 3, null, null, 7, null, 5, null, null, 3, null, null, 0, null] },
      { r: N.D2, l: [10, null, 7, null, 5, null, null, null, 3, null, 5, null, 7, null, null, null] },
      { r: N.G2, l: [5, null, null, 7, null, null, 10, null, 12, null, null, 10, null, null, 7, null] },
      { r: N.A2, l: [7, null, 5, null, 3, null, 0, null, -2, null, 0, null, 3, null, null, null] },
      { r: N.D2, l: [12, null, 10, 7, null, 10, null, null, 7, null, 5, null, 3, null, 5, null] },
      { r: N.D2, l: [0, 3, 5, null, 7, null, 5, 3, 0, null, null, null, 3, null, 0, null] },
      { r: N.G2, l: [5, null, 7, null, 10, null, 12, null, 14, null, 12, null, 10, null, 7, null] },
      { r: N.A2, l: [7, null, null, 5, null, null, 3, null, 0, null, null, null, null, null, null, null] },
    ],
    drums: { kick: [0, 3, 8, 11], snare: [6, 14], hat: [2, 4, 10, 12] }, bassOct: [0, 0, 12, 0, 0, 0, 12, 0],
  };
  /* docks: a rolling sea-shanty feel, major */
  T.docks = {
    bpm: 140, key: N.D4, lead: 'p25', leadVol: 0.09,
    bars: [
      { r: N.D2, l: [0, null, 4, null, 7, null, 12, null, 11, null, 7, null, 4, null, 7, null] },
      { r: N.D2, l: [9, null, 7, null, 4, null, 7, null, 4, null, 2, null, 0, null, null, null] },
      { r: N.G2, l: [-5, null, 2, null, 7, null, 11, null, 14, null, 11, null, 7, null, 2, null] },
      { r: N.A2, l: [4, null, 7, null, 9, null, 7, null, 4, null, 1, null, 4, null, null, null] },
      { r: N.D2, l: [12, null, 11, 12, 14, null, 12, null, 9, null, 7, null, 9, null, 12, null] },
      { r: N.B2, l: [11, null, 9, null, 6, null, 9, null, 6, null, 3, null, 6, null, null, null] },
      { r: N.G2, l: [7, null, 11, null, 14, null, 11, null, 7, null, 2, null, 7, null, 11, null] },
      { r: N.A2, l: [9, null, 7, null, 4, 7, 9, null, 12, null, 9, null, 7, null, null, null] },
    ],
    drums: { kick: [0, 6, 8, 14], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] }, bassOct: [0, 12, 0, 12, 0, 12, 0, 12],
  };
  /* rooftop: fast and tense, a rising line over a pounding bass */
  T.roof = {
    bpm: 156, key: N.E4, lead: 'p25', leadVol: 0.09,
    bars: [
      { r: N.E2, l: [0, 0, null, 7, 0, null, 10, null, 7, null, 5, null, 3, null, 5, 7] },
      { r: N.E2, l: [12, null, 10, 12, 15, null, 12, null, 10, 7, null, 5, 7, null, null, null] },
      { r: N.C2, l: [-4, -4, null, 3, -4, null, 5, null, 3, null, 0, null, -4, null, 0, 3] },
      { r: N.D2, l: [-2, -2, null, 5, -2, null, 7, null, 5, 3, null, 0, 3, null, 5, 7] },
      { r: N.E2, l: [7, null, 12, null, 15, null, 19, null, 15, null, 12, null, 10, 12, 10, 7] },
      { r: N.E2, l: [0, 3, 7, 12, 7, 3, 0, null, 3, 7, 10, 15, 10, 7, 3, null] },
      { r: N.C2, l: [8, null, 8, 7, 3, null, 7, null, 8, null, 12, null, 15, null, 12, 8] },
      { r: N.B1, l: [11, 11, null, 14, 11, null, 18, null, 14, null, 11, null, 7, null, 11, 14] },
    ],
    drums: { kick: [0, 2, 6, 8, 10, 14], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14] }, bassOct: [0, 12, 0, 12, 0, 12, 0, 12],
  };
  /* final boss: the boss riff with a higher, nastier second half */
  T.boss2 = {
    bpm: 180, key: N.A4, lead: 'p12', leadVol: 0.085,
    bars: [
      { r: N.A2, l: [0, 1, 0, 12, 11, 12, 0, 1, 0, 7, 6, 7, 0, 1, 0, null] },
      { r: N.A2, l: [12, 13, 12, 19, 18, 19, 12, 13, 12, 7, 6, 7, 5, 4, 3, null] },
      { r: N.F2, l: [5, 6, 5, 17, 16, 17, 5, 6, 5, 12, 11, 12, 5, 4, 3, null] },
      { r: N.E2, l: [4, 4, 4, 11, 10, 11, 4, 3, 4, 7, 6, 7, 11, 10, 4, null] },
    ],
    drums: { kick: [0, 2, 3, 8, 10, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14, 15] }, bassOct: [0, 12, 0, 12, 0, 12, 0, 12],
  };
  A.tracks = T;

  let mTimer = 0, mTrack = null, mNext = 0, mStep = 0, mName = null;
  function mSchedule() {
    if (!mTrack || !A.ready) return;
    const ctx = A.ctx, tr = mTrack, step = 60 / tr.bpm / 4;
    if (ctx.state !== 'running') { mTimer = setTimeout(mSchedule, 200); return; }
    if (mNext < ctx.currentTime) mNext = ctx.currentTime + 0.05;
    while (mNext < ctx.currentTime + 0.35) {
      const bar = tr.bars[Math.floor(mStep / 16) % tr.bars.length], s = mStep % 16, d = mNext - ctx.currentTime;
      const ln = bar.l[s];
      if (ln !== null && ln !== undefined) tone(semi(tr.key, ln), step * 1.7, tr.lead, tr.leadVol, 0, d, musicBus);
      if (s % 2 === 0) tone(semi(bar.r, tr.bassOct[(s >> 1) % tr.bassOct.length]), step * 1.8, 'triangle', 0.2, 0, d, musicBus);
      if (tr.drums.kick.indexOf(s) >= 0) { tone(110, 0.1, 'sine', 0.3, 40, d, musicBus); }
      if (tr.drums.snare.indexOf(s) >= 0) noise(0.12, 0.13, 1800, d, musicBus, 0.5);
      if (tr.drums.hat.indexOf(s) >= 0) noise(0.04, 0.05, 7500, d, musicBus, 1, 'highpass');
      mNext += step; mStep++;
    }
    mTimer = setTimeout(mSchedule, 80);
  }
  A.music = function (name) {
    if (name === mName && mTrack) return;
    clearTimeout(mTimer);
    mName = name; mTrack = name ? T[name] : null;
    mStep = 0; mNext = 0;
    if (mTrack) mSchedule();
  };
  A.stopMusic = function () { A.music(null); };
  /* one-shot jingle that interrupts the music (stage clear / game over) */
  A.jingle = function (name) {
    A.music(null);
    if (name === 'clear') A.sfx.clear();
    else if (name === 'over') { [N.A4, N.F4, N.D4, N.A3].forEach((f, i) => tone(f, 0.3, 'p25', 0.12, 0, i * 0.26)); tone(N.A2, 1.2, 'triangle', 0.2); }
  };

  /* attract mode behind the title screen is silent; the menu's own sounds still play */
  const UI_SFX = { select: 1, start: 1, pickup: 1, tick: 1 };
  for (const k of Object.keys(A.sfx)) { const fn = A.sfx[k]; A.sfx[k] = function () { if (A.demo && !UI_SFX[k]) return undefined; return fn.apply(this, arguments); }; }
  A.demo = false;

  G.audio = A;
})((window.SGS = window.SGS || {}));
