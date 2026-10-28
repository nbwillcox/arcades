/* Music sequencer (playback). Needs js/music.js. */
(function (G) {
  'use strict';
  const MU = G.music, T = MU.themes, SC = MU.scales;
  const mid = (root, sc, deg) => { const s = SC[sc], oct = Math.floor(deg / s.length); return root + s[((deg % s.length) + s.length) % s.length] + 12 * oct; };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function note(ctx, dst, type, f, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.05);
  }
  function drum(ctx, dst, kind, t) {
    if (kind === 'k') { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14); o.connect(g); g.connect(dst); o.start(t); o.stop(t + 0.16); }
    else if (kind === 'h') { const n = Math.floor(ctx.sampleRate * 0.04), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = 0.05; s.connect(f); f.connect(g); g.connect(dst); s.start(t); }
  }
  function tick() {
    const ctx = G.audio.ctx, th = T[MU.cur]; if (!ctx || !th || !MU.gain) return;
    MU.gain.gain.value = ctx.currentTime < (MU.duckUntil || 0) ? 0 : G.settings.music * 0.9;
    const spb = 60 / th.bpm / 4;
    while (MU.next < ctx.currentTime + 0.18) {
      const s = MU.step % 16, bar = Math.floor(MU.step / 16) % 4, t = MU.next;
      const b = th.bass[s]; if (b !== null) note(ctx, MU.gain, th.bw, hz(mid(th.root - 12, th.sc, b + th.pad[bar])), t, spb * 3.2, 0.09);
      const a = th.arp[s]; if (a !== null) note(ctx, MU.gain, th.aw, hz(mid(th.root + 12, th.sc, a + th.pad[bar])), t, spb * 1.8, th.av);
      if (s === 0) for (const k of [0, 2, 4]) note(ctx, MU.gain, th.pw, hz(mid(th.root, th.sc, th.pad[bar] + k)), t, spb * 15, 0.022);
      const d = th.drums[s]; if (d !== '.') drum(ctx, MU.gain, d, t);
      MU.next += spb; MU.step++;
    }
  }
  /* item fanfares: a short triumphant phrase over the (muted) zone theme. big = ability unlock, small = tank / expansion */
  const hold = (ctx, dst, type, f, t, dur, vol) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.setValueAtTime(vol, t + Math.max(0.03, dur - 0.09)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dst); o.start(t); o.stop(t + dur + 0.05);
  };
  const BIG = [['square', 67, 0, 0.14, 0.12], ['square', 72, 0.15, 0.14, 0.12], ['square', 76, 0.3, 0.14, 0.12], ['square', 79, 0.45, 0.26, 0.12], ['square', 81, 0.78, 0.12, 0.12], ['square', 79, 0.9, 0.12, 0.12], ['square', 77, 1.02, 0.12, 0.12], ['square', 84, 1.14, 0.7, 0.13], ['square', 83, 1.9, 0.18, 0.12], ['square', 84, 2.1, 1.2, 0.13],
    ['sawtooth', 62, 0, 0.14, 0.05], ['sawtooth', 67, 0.15, 0.14, 0.05], ['sawtooth', 71, 0.3, 0.14, 0.05], ['sawtooth', 74, 0.45, 0.26, 0.05], ['sawtooth', 76, 0.78, 0.12, 0.05], ['sawtooth', 74, 0.9, 0.12, 0.05], ['sawtooth', 72, 1.02, 0.12, 0.05], ['sawtooth', 79, 1.14, 0.7, 0.06], ['sawtooth', 77, 1.9, 0.18, 0.05], ['sawtooth', 79, 2.1, 1.2, 0.06],
    ['triangle', 48, 0, 0.45, 0.16], ['triangle', 53, 0.78, 0.35, 0.16], ['triangle', 55, 1.14, 0.7, 0.16], ['triangle', 48, 2.1, 1.2, 0.18], ['triangle', 60, 2.1, 1.2, 0.07], ['triangle', 64, 2.1, 1.2, 0.07], ['triangle', 67, 2.1, 1.2, 0.07]];
  const SMALL = [['square', 72, 0, 0.1, 0.11], ['square', 76, 0.11, 0.1, 0.11], ['square', 79, 0.22, 0.1, 0.11], ['square', 84, 0.33, 0.55, 0.12], ['sawtooth', 67, 0.33, 0.55, 0.05], ['triangle', 48, 0, 0.9, 0.15], ['triangle', 64, 0.33, 0.55, 0.06]];
  MU.fanfare = function (big) {
    const ctx = G.audio.ctx; if (!ctx) return;
    if (!MU.fgain) { MU.fgain = ctx.createGain(); MU.fgain.connect(ctx.destination); }
    MU.fgain.gain.value = G.settings.music * 1.1; const t0 = ctx.currentTime + 0.04;
    MU.duckUntil = t0 + (big ? 3.5 : 1.1);
    for (const [ty, m, st, du, vol] of big ? BIG : SMALL) hold(ctx, MU.fgain, ty, hz(m), t0 + st, du, vol);
  };
  MU.play = function (name) {
    if (MU.cur === name) return;
    const A = G.audio; if (!A.ctx) { MU.pending = name; return; }
    MU.cur = name; MU.step = 0;
    if (!MU.gain) { MU.gain = A.ctx.createGain(); MU.gain.connect(A.ctx.destination); }
    MU.next = A.ctx.currentTime + 0.05;
    if (!MU.timer) MU.timer = setInterval(tick, 40);
  };
  MU.stop = function () { MU.cur = null; };
  const unlock = () => {
    const c = G.audio.ctx; if (c && c.state === 'suspended') c.resume();
    if (MU.pending) { const n = MU.pending; MU.pending = null; MU.cur = null; MU.play(n); }
  };
  for (const ev of ['keydown', 'pointerdown', 'mousedown', 'touchend', 'click']) window.addEventListener(ev, () => setTimeout(unlock, 80));
  MU.forRoom = function (g) { if (g.boss && g.boss.state !== 'wait' && !g.boss.dead) MU.play('boss'); else if (g.escape) MU.play('escape'); else MU.play('z' + (g.room.zone || 1)); };
})((window.SGS = window.SGS || {}));
