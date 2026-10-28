/* All sound is synthesized live with the Web Audio API - no audio files. Chirpy 8-bit-style effects, one little arpeggio tune for the title. */
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
    try { A.ctx = new AC({ sampleRate: 48000, latencyHint: 'interactive' }); } catch (e) { try { A.ctx = new AC(); } catch (e2) { return; } }
    const ctx = A.ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12; comp.knee.value = 14; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
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

  /* ---------- primitives ---------- */
  function pulse(duty) {
    if (waves[duty]) return waves[duty];
    const N = 32, re = new Float32Array(N), im = new Float32Array(N);
    for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
    return (waves[duty] = A.ctx.createPeriodicWave(re, im));
  }
  /* one note: type is 'square' / 'triangle' / 'sawtooth' / 'sine' or 'p25' / 'p12' (pulse), optional slide to a second pitch */
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
  function noise(dur, vol, freq, delay, bus) {
    if (!A.ready) return;
    const ctx = A.ctx, t0 = ctx.currentTime + (delay || 0), s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = freq || 1800; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(bus || sfxBus);
    s.start(t0); s.stop(t0 + dur + 0.03);
  }

  const N = { C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 784, A5: 880, C6: 1046.5 };

  A.sfx.jump = function () { if (!gate('jump', 60)) return; tone(260, 0.16, 'p25', 0.1, 620); };
  A.sfx.land = function () { if (!gate('land', 60)) return; tone(120, 0.07, 'triangle', 0.1, 70); };
  A.sfx.throw = function () { tone(110, 0.25, 'sawtooth', 0.09, 70); noise(0.1, 0.06, 500); };
  A.sfx.item = function () { [N.E5, N.A5].forEach((f, i) => tone(f, 0.08, 'p25', 0.12, 0, i * 0.06)); };
  A.sfx.rivet = function () { tone(1200, 0.06, 'square', 0.09, 700); noise(0.05, 0.06, 4500); };
  A.sfx.smash = function () { tone(420, 0.2, 'sawtooth', 0.12, 90); noise(0.14, 0.1, 1800); };
  A.sfx.boing = function () { if (!gate('boing', 90)) return; tone(220, 0.14, 'triangle', 0.08, 520); };
  A.sfx.power = function () { [N.E5, N.G5, N.C6, N.G5, N.C6].forEach((f, i) => tone(f, 0.08, 'p25', 0.12, 0, i * 0.06)); };
  A.sfx.die = function () { tone(700, 0.9, 'sawtooth', 0.13, 60); tone(350, 0.9, 'square', 0.06, 40, 0.05); noise(0.5, 0.1, 700, 0.3); };
  A.sfx.bossDie = function () { for (let i = 0; i < 6; i++) { noise(0.35, 0.14, 500 + i * 300, i * 0.18); tone(220 - i * 25, 0.4, 'sawtooth', 0.1, 40, i * 0.18); } };
  A.sfx.extra = function () { [N.C5, N.E5, N.G5, N.C6, N.G5, N.C6].forEach((f, i) => tone(f, 0.1, 'p12', 0.12, 0, i * 0.075)); };
  A.sfx.clear = function () { [N.C5, N.E5, N.G5, N.C6, 0, N.G5, N.C6, N.E5 * 2].forEach((f, i) => { if (f) tone(f, 0.16, 'p25', 0.13, 0, i * 0.13); }); tone(N.C4, 1.1, 'triangle', 0.14, 0, 0); };
  A.sfx.ready = function () { [[N.A4, 0], [N.E5, 1], [N.A5, 2], [N.G5, 4], [N.E5, 5], [N.C5, 6]].forEach(([f, s]) => tone(f, 0.15, 'p25', 0.11, 0, s * 0.1)); tone(110, 0.5, 'triangle', 0.15, 0, 0); };
  A.sfx.select = function () { tone(660, 0.06, 'p25', 0.1); };
  A.sfx.start = function () { [N.C5, N.G5, N.C6].forEach((f, i) => tone(f, 0.09, 'p25', 0.12, 0, i * 0.06)); };
  A.sfx.dry = function () { tone(130, 0.12, 'square', 0.08); };
  A.siren = function () {};

  /* ---------- title tune: a four-chord arpeggio loop ---------- */
  const CH = [[N.A4 / 2, [N.A4, N.C5, N.E5, N.A5]], [N.F4 / 2, [N.F4, N.A4, N.C5, N.F5]], [N.C4 / 2, [N.C5, N.E5, N.G5, N.C6]], [N.G4 / 2, [N.G4, N.B4, N.D5, N.G5]]];
  let mTimer = 0, mOn = false, mNext = 0, mStep = 0;
  function mSchedule() {
    if (!mOn || !A.ready) return;
    const ctx = A.ctx, step = 60 / 124 / 2;
    if (ctx.state !== 'running') { mTimer = setTimeout(mSchedule, 200); return; }
    if (mNext < ctx.currentTime) mNext = ctx.currentTime + 0.05;
    while (mNext < ctx.currentTime + 0.4) {
      const bar = Math.floor(mStep / 8) % 4, ch = CH[bar], s = mStep % 8, d = mNext - ctx.currentTime;
      const arp = [0, 1, 2, 3, 2, 1, 2, 3][s];
      tone(ch[1][arp], step * 0.9, 'p25', 0.09, 0, d, musicBus);
      if (s % 4 === 0) tone(ch[0], step * 3.2, 'triangle', 0.16, 0, d, musicBus);
      if (s % 2 === 1) noise(0.04, 0.05, 7000, d, musicBus);
      if (s === 4) noise(0.1, 0.08, 1200, d, musicBus);
      mNext += step; mStep++;
    }
    mTimer = setTimeout(mSchedule, 90);
  }
  A.music = function (name) {
    clearTimeout(mTimer);
    mOn = name === 'title';
    mStep = 0; mNext = 0;
    if (mOn) mSchedule();
  };

  G.audio = A;
})((window.SGS = window.SGS || {}));
