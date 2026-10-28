/* All sound is synthesized live with the Web Audio API - no audio files: a continuous rolling hiss that follows the marble, glass cracks and shatters, trap stings, and a looping chiptune per race. */
(function (G) {
  'use strict';
  const S = G.settings;
  const A = { ctx: null, ready: false, sfx: {} };
  let master, sfxBus, musicBus, noiseBuf, rollNoise, rollFilt, rollGain, rumble, rumbleGain, rollSurf = 0;
  const last = {}, waves = {};

  function gate(name, ms) { const now = performance.now(); if (now - (last[name] || 0) < ms) return false; last[name] = now; return true; }

  A.init = function () {
    if (A.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { A.ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { try { A.ctx = new AC(); } catch (e2) { return; } }
    const ctx = A.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
    master = ctx.createGain(); sfxBus = ctx.createGain(); musicBus = ctx.createGain();
    sfxBus.connect(master); musicBus.connect(master); master.connect(comp); comp.connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    /* rolling loop: filtered noise + a low rumble, always running, gain follows the marble */
    rollNoise = ctx.createBufferSource(); rollNoise.buffer = noiseBuf; rollNoise.loop = true;
    rollFilt = ctx.createBiquadFilter(); rollFilt.type = 'bandpass'; rollFilt.frequency.value = 400; rollFilt.Q.value = 0.9;
    rollGain = ctx.createGain(); rollGain.gain.value = 0;
    rollNoise.connect(rollFilt); rollFilt.connect(rollGain); rollGain.connect(sfxBus); rollNoise.start();
    rumble = ctx.createOscillator(); rumble.type = 'sine'; rumble.frequency.value = 60; rumbleGain = ctx.createGain(); rumbleGain.gain.value = 0;
    rumble.connect(rumbleGain); rumbleGain.connect(sfxBus); rumble.start();
    A.applyVolumes();
    A.ready = true;
  };
  A.resume = function () { A.init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  A.applyVolumes = function () {
    if (!A.ctx) return;
    master.gain.value = S.master; sfxBus.gain.value = S.sfx; musicBus.gain.value = S.music * 0.5;
  };

  /* ---------- primitives ---------- */
  function pulse(duty) {
    if (waves[duty]) return waves[duty];
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return (waves[duty] = A.ctx.createPeriodicWave(re, im));
  }
  function tone(f, dur, type, vol, slideTo, delay, bus) {
    if (!A.ready) return;
    const ctx = A.ctx, t0 = ctx.currentTime + (delay || 0), o = ctx.createOscillator(), g = ctx.createGain();
    if (type === 'p25') o.setPeriodicWave(pulse(0.25)); else if (type === 'p12') o.setPeriodicWave(pulse(0.125)); else o.type = type || 'square';
    o.frequency.setValueAtTime(f, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, freq, delay, bus, q, type) {
    if (!A.ready) return;
    const ctx = A.ctx, t0 = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.playbackRate.value = 0.8 + Math.random() * 0.4; f.type = type || 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = q === undefined ? 0.8 : q;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.03);
  }
  const N = { C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196, A3: 220, B3: 246.94, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 784, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5 };

  /* rolling loop control: speed 0..1, airborne silences it, surface colours it */
  A.roll = function (speed, grounded, surf) {
    if (!A.ready) return;
    const t = A.ctx.currentTime;
    const v = grounded ? Math.min(1, speed) : 0;
    const ice = surf === 1, goo = surf === 2;
    rollFilt.frequency.setTargetAtTime((ice ? 1900 : goo ? 260 : 380) + v * (ice ? 2600 : goo ? 300 : 1500), t, 0.05);
    rollGain.gain.setTargetAtTime(v * v * (goo ? 0.12 : ice ? 0.08 : 0.2), t, 0.06);
    rumble.frequency.setTargetAtTime(48 + v * 52, t, 0.08);
    rumbleGain.gain.setTargetAtTime(v * (ice ? 0.02 : 0.08), t, 0.08);
  };
  A.silenceRoll = function () { if (A.ready) { rollGain.gain.setTargetAtTime(0, A.ctx.currentTime, 0.03); rumbleGain.gain.setTargetAtTime(0, A.ctx.currentTime, 0.03); } };

  A.sfx.bump = function (s) { if (!gate('bump', 70)) return; const v = Math.min(1, s / 9); tone(110 + v * 40, 0.09, 'triangle', 0.1 + v * 0.1, 60); noise(0.05, 0.05 + v * 0.07, 2400); };
  A.sfx.land = function (level) {
    if (!gate('land', 80)) return;
    if (level === 0) { tone(90, 0.06, 'triangle', 0.07, 60); return; }
    tone(100, 0.14, 'triangle', 0.16, 45); noise(0.09, 0.1, 1100);
    if (level >= 2) { noise(0.25, 0.14, 4200, 0.02, null, 1.5); tone(1700, 0.2, 'sine', 0.06, 700, 0.01); }
  };
  A.sfx.crack = function (stage) {
    noise(0.04, 0.2, 5200, 0, null, 3); noise(0.12, 0.12, 3400, 0.03, null, 2);
    tone(2300, 0.35, 'sine', 0.1, 1500); tone(3100 - stage * 400, 0.22, 'sine', 0.06, 1900, 0.04);
    tone(80, 0.2, 'sawtooth', 0.1, 40);
  };
  A.sfx.shatter = function () {
    noise(0.5, 0.26, 4800, 0, null, 1.2); noise(0.9, 0.14, 2600, 0.03, null, 0.7); noise(0.18, 0.2, 8000, 0, null, 2, 'highpass');
    for (let i = 0; i < 7; i++) tone(1400 + Math.random() * 2600, 0.12 + Math.random() * 0.25, 'sine', 0.07, 600 + Math.random() * 800, i * 0.035 + Math.random() * 0.05);
    tone(120, 0.55, 'sawtooth', 0.16, 30); tone(55, 0.7, 'sine', 0.2, 28);
  };
  A.sfx.fall = function () { tone(1000, 1.1, 'sine', 0.09, 120); tone(700, 1.1, 'triangle', 0.05, 90, 0.05); };
  A.sfx.respawn = function () { [N.C5, N.E5, N.G5, N.C6, N.E6].forEach((f, i) => tone(f, 0.12, 'p25', 0.08, 0, i * 0.045)); noise(0.35, 0.06, 6000, 0, null, 1.4, 'highpass'); };
  A.sfx.tilecrack = function (k) { noise(0.07, 0.14, 1500 + k * 1500, 0, null, 2); tone(300 - k * 90, 0.09, 'square', 0.05, 120); };
  A.sfx.tilebreak = function () { noise(0.55, 0.22, 500, 0, null, 0.6); noise(0.3, 0.14, 2200, 0.05, null, 1.4); tone(90, 0.4, 'sawtooth', 0.16, 36); for (let i = 0; i < 4; i++) noise(0.05, 0.08, 1800 + i * 500, 0.12 + i * 0.07, null, 2); };
  A.sfx.glassCrack = function (k) { noise(0.05, 0.16, 6200, 0, null, 3); tone(2600 + k * 900, 0.3, 'sine', 0.07, 1700); tone(3400, 0.18, 'sine', 0.04, 2300, 0.03); };
  A.sfx.glassBreak = function () { noise(0.35, 0.2, 5200, 0, null, 1.4); noise(0.14, 0.16, 8500, 0, null, 2, 'highpass'); for (let i = 0; i < 5; i++) tone(1800 + Math.random() * 2400, 0.1 + Math.random() * 0.2, 'sine', 0.06, 800 + Math.random() * 600, i * 0.04); tone(110, 0.3, 'triangle', 0.1, 50); };  A.sfx.tileform = function () { tone(500, 0.14, 'p25', 0.05, 900); };
  A.sfx.laser = function () { tone(1600, 0.16, 'sawtooth', 0.06, 400); noise(0.12, 0.05, 6000, 0, null, 1, 'highpass'); };
  A.sfx.slam = function () { if (!gate('slam', 60)) return; tone(70, 0.45, 'sawtooth', 0.22, 24); noise(0.3, 0.2, 380, 0, null, 0.8); noise(0.12, 0.12, 1800, 0.01); };
  A.sfx.spike = function () { tone(1200, 0.07, 'square', 0.05, 2200); noise(0.06, 0.08, 4200, 0, null, 2); };
  A.sfx.sweep = function () { tone(250, 0.22, 'sawtooth', 0.09, 90); noise(0.14, 0.1, 2000); };
  A.sfx.bumper = function (s) { if (!gate('bumper', 60)) return; tone(300, 0.2, 'triangle', 0.14, 900); tone(1500, 0.12, 'sine', 0.07, 2600, 0.03); };
  A.sfx.bounce = function () { tone(180, 0.28, 'triangle', 0.16, 640); tone(900, 0.1, 'sine', 0.05, 1500, 0.1); };
  A.sfx.launch = function () { if (!gate('launch', 200)) return; noise(0.25, 0.07, 2600, 0, null, 0.5); tone(220, 0.2, 'triangle', 0.05, 500); };
  A.sfx.timeGem = function () { [N.E5, N.G5, N.C6, N.E6].forEach((f, i) => tone(f, 0.1, 'p25', 0.11, 0, i * 0.055)); };
  A.sfx.gem = function () { [N.A5, N.E6].forEach((f, i) => tone(f, 0.09, 'p12', 0.09, 0, i * 0.05)); };
  A.sfx.orbHit = function () { if (!gate('orb', 80)) return; tone(520, 0.1, 'square', 0.1, 220); noise(0.06, 0.1, 3600); tone(150, 0.12, 'triangle', 0.12, 70); };
  A.sfx.foeDie = function () { noise(0.3, 0.16, 1400); tone(400, 0.25, 'sawtooth', 0.1, 70); [N.C5, N.G5].forEach((f, i) => tone(f, 0.08, 'p25', 0.08, 0, 0.1 + i * 0.05)); };
  A.sfx.chomp = function () { tone(130, 0.08, 'square', 0.14, 70); tone(110, 0.08, 'square', 0.14, 60, 0.09); noise(0.06, 0.1, 900); };
  A.sfx.sizzle = function () { noise(0.2, 0.07, 5200, 0, null, 1.2, 'highpass'); };
  A.sfx.slurp = function () { tone(100, 0.4, 'sawtooth', 0.14, 900); noise(0.35, 0.1, 700, 0, null, 0.6); };
  A.sfx.mine = function () { noise(0.5, 0.26, 600, 0, null, 0.5); tone(90, 0.5, 'sawtooth', 0.2, 28); noise(0.15, 0.2, 3000); };
  A.sfx.shoot = function () { tone(700, 0.14, 'square', 0.06, 180); };
  A.sfx.boltHit = function () { noise(0.15, 0.14, 2200); tone(200, 0.15, 'sawtooth', 0.1, 70); };
  A.sfx.gate = function () { tone(180, 0.18, 'square', 0.06, 120); noise(0.12, 0.06, 700); };
  A.sfx.beep = function (hi) { tone(hi ? 1320 : 660, hi ? 0.45 : 0.14, 'p25', 0.14); };
  A.sfx.tick = function () { tone(1000, 0.04, 'square', 0.06); };
  A.sfx.finish = function () { [N.C5, N.E5, N.G5, N.C6, 0, N.G5, N.C6, N.E6].forEach((f, i) => { if (f) tone(f, 0.18, 'p25', 0.13, 0, i * 0.12); }); tone(N.C4, 1.3, 'triangle', 0.16, 0, 0); noise(0.9, 0.05, 7000, 0.3, null, 1, 'highpass'); };
  A.sfx.timeup = function () { [N.G4, N.E4, N.C4, N.G3].forEach((f, i) => tone(f, 0.3, 'triangle', 0.16, f * 0.9, i * 0.22)); };
  A.sfx.select = function () { tone(660, 0.06, 'p25', 0.1); };
  A.sfx.start = function () { [N.C5, N.G5, N.C6].forEach((f, i) => tone(f, 0.09, 'p25', 0.12, 0, i * 0.06)); };
  A.sfx.cash = function (i) { tone(800 + i * 40, 0.05, 'p25', 0.08); };

  /* ---------- music: a chord loop with arpeggio, bass and a light beat; one flavour per race ---------- */
  const TRACKS = {
    title: { bpm: 124, ch: [[N.A3 / 2, [N.A4, N.C5, N.E5, N.A5]], [N.F3 / 2, [N.F4, N.A4, N.C5, N.F5]], [N.C3 / 2, [N.C5, N.E5, N.G5, N.C6]], [N.G3 / 2, [N.G4, N.B4, N.D5, N.G5]]], arp: [0, 1, 2, 3, 2, 1, 2, 3], wave: 'p25', bass: 'triangle', drums: 1 },
    l1: { bpm: 126, ch: [[N.C3, [N.C4, N.E4, N.G4, N.C5]], [N.G3 / 2, [N.B3, N.D4, N.G4, N.B4]], [N.A3 / 2, [N.A3, N.C4, N.E4, N.A4]], [N.F3 / 2, [N.A3, N.C4, N.F4, N.A4]]], arp: [0, 2, 1, 3, 2, 3, 1, 2], wave: 'p25', bass: 'triangle', drums: 1 },
    l2: { bpm: 132, ch: [[N.D3, [N.D4, N.F4, N.A4, N.D5]], [N.A3 / 2 * 0.89, [N.F4, N.A4, N.C5, N.F5]], [N.F3 / 2, [N.F4, N.A4, N.C5, N.E5]], [N.C3, [N.E4, N.G4, N.C5, N.E5]]], arp: [0, 1, 2, 3, 3, 2, 1, 0], wave: 'square', bass: 'sawtooth', drums: 2 },
    l3: { bpm: 112, ch: [[N.E3, [N.E4, N.G4, N.B4, N.E5]], [N.C3, [N.E4, N.G4, N.C5, N.E5]], [N.G3 / 2, [N.D4, N.G4, N.B4, N.D5]], [N.D3, [N.D4, N.F4 * 1.06, N.A4, N.D5]]], arp: [3, 2, 1, 0, 1, 2, 3, 2], wave: 'sine', bass: 'triangle', drums: 0 },
    l4: { bpm: 138, ch: [[N.A3 / 2, [N.A4, N.C5, N.E5, N.A5]], [N.E3, [N.B4, N.E5, N.G5, N.B5]], [N.F3 / 2, [N.A4, N.C5, N.F5, N.A5]], [N.D3, [N.A4, N.D5, N.F5, N.A5]]], arp: [0, 1, 2, 3, 2, 3, 1, 3], wave: 'p12', bass: 'sawtooth', drums: 2 },
    l5: { bpm: 146, ch: [[N.C3, [N.C5, N.E5, N.G5, N.E5]], [N.D3 * 1.06, [N.D5, N.F5, N.A5, N.F5]], [N.F3, [N.F4, N.A4, N.C5, N.A4]], [N.G3, [N.G4, N.B4, N.D5, N.B4]]], arp: [0, 3, 1, 2, 3, 0, 2, 1], wave: 'p25', bass: 'square', drums: 2 },
    l6: { bpm: 152, ch: [[N.A3 / 2, [N.A4, N.C5, N.E5, N.A5]], [N.D3, [N.A4, N.D5, N.F5, N.A5]], [N.E3, [N.B4, N.E5, N.G5 * 1.0, N.B5]], [N.A3 / 2, [N.A4, N.C5, N.E5, N.C6]]], arp: [0, 1, 2, 3, 3, 2, 1, 2], wave: 'square', bass: 'sawtooth', drums: 3 },
  };
  let mTimer = 0, mOn = false, mNext = 0, mStep = 0, mTrack = null;
  function mSchedule() {
    if (!mOn || !A.ready || !mTrack) return;
    const ctx = A.ctx, tr = mTrack, step = 60 / tr.bpm / 2;
    if (ctx.state !== 'running') { mTimer = setTimeout(mSchedule, 200); return; }
    if (mNext < ctx.currentTime) mNext = ctx.currentTime + 0.05;
    while (mNext < ctx.currentTime + 0.4) {
      const bar = Math.floor(mStep / 8) % 4, ch = tr.ch[bar], s = mStep % 8, d = mNext - ctx.currentTime;
      tone(ch[1][tr.arp[s]], step * 0.9, tr.wave, tr.wave === 'sine' ? 0.12 : 0.085, 0, d, musicBus);
      if (s % 4 === 0) tone(ch[0], step * 3.2, tr.bass, 0.15, 0, d, musicBus);
      if (tr.drums) {
        if (s % 2 === 1) noise(0.035, 0.045, 7000, d, musicBus, 1, 'highpass');
        if (s === 0 || (tr.drums > 1 && s === 4)) { tone(120, 0.12, 'sine', 0.2, 42, d, musicBus); }
        if (s === 4 || (tr.drums > 2 && s === 7)) noise(0.09, 0.09, 1500, d, musicBus);
      }
      mNext += step; mStep++;
    }
    mTimer = setTimeout(mSchedule, 90);
  }
  A.music = function (name) {
    clearTimeout(mTimer);
    mTrack = TRACKS[name] || null;
    mOn = !!mTrack;
    mStep = 0; mNext = 0;
    if (mOn) mSchedule();
  };
  A.musicVol = function (k) { if (A.ready) musicBus.gain.setTargetAtTime(S.music * 0.5 * k, A.ctx.currentTime, 0.2); };

  G.audio = A;
})((window.SGS = window.SGS || {}));
