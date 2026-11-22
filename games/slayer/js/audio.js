/* Web Audio engine: layered synth SFX + procedural synthwave BGM. WAV/OGG files in /assets/audio override synth (see manifest). */
(function () {
  var A = CS.audio = { ctx: null, master: null, sg: null, mg: null, buf: {}, last: {}, mus: null, musStage: -1, timer: 0 };
  var NB = null;

  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    var c = A.ctx = new AC(); A.master = c.createGain(); A.master.gain.value = 0.9;
    var comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    A.sg = c.createGain(); A.mg = c.createGain(); A.sg.connect(comp); A.mg.connect(comp); comp.connect(A.master); A.master.connect(c.destination);
    var len = c.sampleRate * 1.5; NB = c.createBuffer(1, len, c.sampleRate); var d = NB.getChannelData(0); for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.vol();
    if (A.pendingMusic !== undefined) { var s = A.pendingMusic; A.pendingMusic = undefined; A.music(s); }
  };
  A.vol = function () { if (!A.ctx) return; var s = CS.save.d.set; A.sg.gain.value = s.sfx * 0.7; A.mg.gain.value = s.music * 0.5; };

  function tone(type, f0, f1, dur, vol, delay, dest) {
    var c = A.ctx, t = c.currentTime + (delay || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || A.sg); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, f0, f1, type, delay, dest) {
    var c = A.ctx, t = c.currentTime + (delay || 0), s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = NB; s.loop = true; f.type = type || 'bandpass'; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || A.sg); s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  var N = { // note frequencies
    c4: 262, e4: 330, g4: 392, c5: 523, e5: 659, g5: 784, c6: 1047 };
  var S = {
    slug: function () { tone('sine', 150, 38, 0.22, 0.9); noise(0.09, 0.8, 2200, 600, 'bandpass'); tone('sawtooth', 700, 110, 0.12, 0.35); },
    plasma: function () { tone('square', 1000, 420, 0.07, 0.22); },
    bolt: function () { for (var i = 0; i < 4; i++) tone('sawtooth', 1800 - i * 250, 250, 0.09, 0.18, i * 0.018); noise(0.14, 0.35, 5000, 900, 'highpass'); tone('sine', 880, 1760, 0.18, 0.18); },
    zap: function () { noise(0.18, 0.5, 3500, 400, 'bandpass'); tone('sawtooth', 2200, 180, 0.15, 0.25); },
    hit: function () { noise(0.05, 0.3, 1500, 500, 'bandpass'); tone('square', 220, 90, 0.05, 0.18); },
    crit: function () { tone('square', 1100, 1900, 0.06, 0.3); noise(0.07, 0.5, 3000, 800, 'bandpass'); tone('sine', 120, 50, 0.1, 0.6); },
    kill: function () { tone('triangle', 340, 70, 0.09, 0.28); },
    boom: function () { noise(0.55, 1.0, 900, 60, 'lowpass'); tone('sine', 90, 26, 0.5, 1.0); },
    smallboom: function () { noise(0.25, 0.7, 1200, 100, 'lowpass'); tone('sine', 110, 40, 0.22, 0.6); },
    coin: function () { tone('sine', 1760, 1760, 0.12, 0.28); tone('sine', 2637, 2637, 0.16, 0.22, 0.045); noise(0.05, 0.12, 6000, 6000, 'highpass'); },
    scrap: function () { tone('square', 700, 520, 0.05, 0.16); tone('triangle', 1250, 900, 0.07, 0.18, 0.03); noise(0.06, 0.15, 4000, 2000, 'highpass'); },
    whoosh: function () { noise(0.16, 0.22, 400, 3000, 'bandpass'); },
    heal: function () { tone('sine', 523, 523, 0.12, 0.28); tone('sine', 784, 784, 0.16, 0.28, 0.07); tone('sine', 1047, 1047, 0.2, 0.25, 0.14); },
    levelup: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone('triangle', f, f, 0.2, 0.35, i * 0.065); tone('square', f * 2, f * 2, 0.1, 0.1, i * 0.065); }); },
    pick: function () { tone('square', 660, 990, 0.1, 0.25); tone('square', 990, 1320, 0.14, 0.2, 0.07); },
    chest: function () { [523, 659, 784, 1047, 784, 1047, 1319].forEach(function (f, i) { tone('square', f, f, 0.16, 0.26, i * 0.09); tone('triangle', f / 2, f / 2, 0.2, 0.3, i * 0.09); }); noise(0.5, 0.25, 7000, 7000, 'highpass', 0.5); },
    warning: function () { for (var i = 0; i < 4; i++) { tone('sawtooth', 420, 880, 0.42, 0.4, i * 0.45); tone('square', 210, 440, 0.42, 0.2, i * 0.45); } },
    hurt: function () { tone('sawtooth', 240, 55, 0.22, 0.55); noise(0.14, 0.5, 900, 200, 'lowpass'); },
    shield: function () { tone('sine', 400, 1400, 0.22, 0.35); tone('triangle', 800, 2000, 0.15, 0.15); },
    shieldbreak: function () { noise(0.3, 0.7, 3000, 200, 'bandpass'); tone('sawtooth', 900, 60, 0.3, 0.4); },
    dodge: function () { noise(0.12, 0.3, 2500, 600, 'bandpass'); tone('sine', 1200, 1800, 0.08, 0.12); },
    laser: function () { tone('sawtooth', 1700, 240, 0.28, 0.3); tone('sine', 900, 120, 0.3, 0.35); },
    beam: function () { tone('sawtooth', 120, 1100, 0.3, 0.45); noise(0.5, 0.5, 400, 4000, 'bandpass'); tone('sine', 60, 40, 0.6, 0.8); },
    nova: function () { noise(0.5, 0.5, 300, 2500, 'bandpass'); tone('sine', 220, 880, 0.4, 0.45); tone('triangle', 110, 440, 0.4, 0.3); },
    spawn: function () { tone('sine', 90, 140, 0.25, 0.4); },
    boss: function () { tone('sawtooth', 70, 38, 1.1, 0.7); tone('square', 74, 36, 1.1, 0.3); noise(0.9, 0.5, 300, 60, 'lowpass'); },
    slam: function () { noise(0.7, 1.0, 600, 40, 'lowpass'); tone('sine', 70, 20, 0.7, 1.0); },
    click: function () { tone('square', 880, 880, 0.04, 0.16); },
    move: function () { tone('square', 520, 520, 0.03, 0.1); },
    buy: function () { tone('square', 988, 988, 0.07, 0.22); tone('square', 1319, 1319, 0.14, 0.24, 0.07); },
    deny: function () { tone('square', 140, 100, 0.18, 0.3); },
    victory: function () { [523, 659, 784, 1047, 1319, 1568, 2093].forEach(function (f, i) { tone('square', f, f, 0.3, 0.26, i * 0.12); tone('triangle', f / 2, f / 2, 0.4, 0.3, i * 0.12); }); },
    defeat: function () { [330, 294, 262, 196].forEach(function (f, i) { tone('sawtooth', f, f * 0.9, 0.5, 0.3, i * 0.28); }); },
    saw: function () { tone('sawtooth', 1400, 1500, 0.06, 0.12); },
    summon: function () { tone('sawtooth', 100, 600, 0.35, 0.35); noise(0.3, 0.3, 500, 3000, 'bandpass'); },
    telegraph: function () { tone('sine', 300, 300, 0.1, 0.18); }
  };
  var LIM = { hit: 0.04, kill: 0.04, plasma: 0.05, coin: 0.035, scrap: 0.045, whoosh: 0.1, saw: 0.12, zap: 0.06, smallboom: 0.06, crit: 0.05, bolt: 0.08, slug: 0.08, boom: 0.08 };
  var SMIX = { hit: 0.45, kill: 0.5, plasma: 0.4, coin: 0.6, scrap: 0.5, saw: 0.4, zap: 0.6, smallboom: 0.65, move: 0.5, click: 0.6, whoosh: 0.5, slug: 0.75, bolt: 0.7, spawn: 0.6, telegraph: 0.6, crit: 0.65 };
  A.sfx = function (name, vol, rate) {
    if (!A.ctx) return; var c = A.ctx, now = c.currentTime;
    if (A.last[name] && now - A.last[name] < (LIM[name] || 0.02)) return; A.last[name] = now;
    var b = A.buf[name];
    if (b) { var s = c.createBufferSource(), g = c.createGain(); s.buffer = b; s.playbackRate.value = (rate || 1) * (0.96 + Math.random() * 0.08); g.gain.value = (vol || 1) * (SMIX[name] || 0.8); s.connect(g); g.connect(A.sg); s.start(); return; }
    if (S[name]) S[name]();
  };

  /* ---- procedural BGM: kick / hat / snare / bass / arp, per-stage root + bpm ---- */
  var MIN = [0, 2, 3, 5, 7, 8, 10], PROG = [0, 0, 5, 3, 0, 0, 6, 4];
  A.stopMusic = function () { clearInterval(A.timer); A.timer = 0; if (A.mus && A.mus.stop) { try { A.mus.stop(); } catch (e) { } } A.mus = null; A.musStage = -1; A.pendingMusic = undefined; };
  A.music = function (stage) {
    if (!A.ctx) { A.pendingMusic = stage; return; }
    if (A.musStage === stage) return; A.stopMusic(); A.musStage = stage;
    var key = 'music_' + stage;
    if (A.buf[key]) { var s = A.ctx.createBufferSource(); s.buffer = A.buf[key]; s.loop = true; s.connect(A.mg); s.start(); A.mus = s; return; }
    var st = stage === 'menu' ? { bpm: 96, root: 55 } : CS.STAGES[stage], c = A.ctx, step = 0, next = c.currentTime + 0.1, spb = 60 / st.bpm / 4, mg = A.mg;
    var seed = (typeof stage === 'number' ? stage : 11) * 7 + 3, arp = []; for (var i = 0; i < 16; i++) arp.push(((seed * (i + 3) * 31) >> 2) % 7);
    function sched() {
      while (next < c.currentTime + 0.2) {
        var t = next - c.currentTime, s16 = step % 16, bar = Math.floor(step / 16) % 8, deg = PROG[bar], root = st.root * Math.pow(2, MIN[deg] / 12);
        if (s16 % 4 === 0) tone('sine', 150, 42, 0.18, 0.9, t, mg);
        if (s16 === 4 || s16 === 12) { noise(0.14, 0.45, 2200, 900, 'bandpass', t, mg); tone('triangle', 220, 120, 0.08, 0.2, t, mg); }
        if (s16 % 2 === 0) noise(0.04, s16 % 4 === 2 ? 0.28 : 0.14, 8000, 8000, 'highpass', t, mg);
        if (s16 % 2 === 1 || s16 % 4 === 0) tone('sawtooth', root, root, spb * 1.6, 0.34, t, mg);
        if (s16 % 2 === 0 || bar % 2) { var f = st.root * 4 * Math.pow(2, (MIN[(arp[s16] + deg) % 7]) / 12); tone('square', f, f, spb * 0.9, 0.09, t, mg); }
        if (s16 === 0 && bar % 4 === 0) tone('triangle', root * 4, root * 4, spb * 14, 0.1, t, mg);
        step++; next += spb;
      }
    }
    sched(); A.timer = setInterval(sched, 60);
  };

  A.loadSample = function (key, url) {
    return fetch(url).then(function (r) { if (!r.ok) throw 0; return r.arrayBuffer(); }).then(function (ab) {
      if (!A.ctx) A.init(); if (!A.ctx) return;
      return A.ctx.decodeAudioData(ab).then(function (b) { A.buf[key] = b; if (key.indexOf('music_') === 0 && 'music_' + A.musStage === key) { var st = A.musStage; A.stopMusic(); A.music(st); } });
    }).catch(function () { });
  };
})();
