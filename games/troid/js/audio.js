/* Synthesized sound effects (WebAudio, created on the first key press). Music comes later. */
(function (G) {
  'use strict';
  const A = { ctx: null };
  G.audio = A;
  let master = null;
  A.init = function () {
    if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
    try { const C = window.AudioContext || window.webkitAudioContext; A.ctx = new C(); master = A.ctx.createGain(); master.gain.value = G.settings.sfx; master.connect(A.ctx.destination); } catch (e) { A.ctx = null; }
  };
  A.running = () => !!A.ctx && A.ctx.state === 'running';
  for (const ev of ['keydown', 'pointerdown', 'mousedown', 'touchend', 'click']) window.addEventListener(ev, A.init);                    /* browsers only allow sound after a real key press or click */
  function tone(f0, f1, dur, type, vol, delay) {
    if (!A.ctx) return; const t = A.ctx.currentTime + (delay || 0), o = A.ctx.createOscillator(), g = A.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, lp) {
    if (!A.ctx) return; const t = A.ctx.currentTime, n = Math.floor(A.ctx.sampleRate * dur), b = A.ctx.createBuffer(1, n, A.ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = A.ctx.createBufferSource(), f = A.ctx.createBiquadFilter(), g = A.ctx.createGain(); s.buffer = b; f.type = 'lowpass'; f.frequency.value = lp || 2000; g.gain.value = vol; s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  const SFX = {
    jump: () => tone(300, 620, 0.12, 'square', 0.12), spacejump: () => { tone(500, 1100, 0.14, 'triangle', 0.16); tone(700, 1500, 0.1, 'sine', 0.1, 0.05); },
    low: () => tone(1320, 1320, 0.07, 'square', 0.07), land: () => noise(0.06, 0.1, 700), step: () => noise(0.025, 0.035, 1100), shot: () => tone(1200, 400, 0.07, 'square', 0.1), charged: () => { tone(300, 1600, 0.2, 'sawtooth', 0.14); noise(0.12, 0.08, 3000); },
    spinStart: () => { tone(180, 900, 0.3, 'sawtooth', 0.12); noise(0.2, 0.1, 3000); }, spinLoop: () => { tone(420, 620, 0.1, 'triangle', 0.05); noise(0.06, 0.04, 2500); },
    chargeStart: () => tone(200, 500, 0.3, 'sine', 0.05), chargeFull: () => { tone(520, 1040, 0.12, 'square', 0.07); tone(780, 1560, 0.14, 'triangle', 0.08, 0.05); }, chargeMega: () => { tone(260, 1500, 0.45, 'sawtooth', 0.1); tone(130, 700, 0.45, 'square', 0.06); noise(0.2, 0.08, 3500); }, mega: () => { tone(90, 28, 0.6, 'sawtooth', 0.2); tone(500, 2200, 0.35, 'sawtooth', 0.12); noise(0.45, 0.2, 2500); }, missile: () => { tone(220, 90, 0.25, 'sawtooth', 0.14); noise(0.18, 0.1, 1500); }, super: () => { tone(160, 60, 0.4, 'sawtooth', 0.18); noise(0.3, 0.14, 1200); },
    bomb: () => tone(180, 140, 0.08, 'triangle', 0.14), boom: () => { noise(0.35, 0.3, 900); tone(120, 40, 0.3, 'square', 0.12); }, break: () => noise(0.14, 0.18, 2500),
    hurt: () => { tone(260, 90, 0.25, 'sawtooth', 0.2); noise(0.15, 0.12, 1800); }, pickup: () => { tone(700, 1400, 0.09, 'square', 0.1); tone(1000, 1800, 0.12, 'square', 0.1, 0.07); },
    hit: () => tone(520, 260, 0.06, 'square', 0.1), die: () => { noise(0.3, 0.2, 1200); tone(300, 60, 0.3, 'square', 0.12); }, door: () => { tone(110, 80, 0.3, 'square', 0.1); noise(0.2, 0.08, 800); },
    save: () => { tone(500, 900, 0.1, 'triangle', 0.15); tone(750, 1200, 0.14, 'triangle', 0.15, 0.1); tone(1000, 1600, 0.2, 'triangle', 0.15, 0.2); }, spit: () => tone(400, 180, 0.12, 'sawtooth', 0.1),
  };
  A.sfx = (n) => { if (A.ctx && SFX[n]) { if (master) master.gain.value = G.settings.sfx; SFX[n](); } };
})((window.SGS = window.SGS || {}));
