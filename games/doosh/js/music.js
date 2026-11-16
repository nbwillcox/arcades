/* Stick Doosh - SGS.Music
 * 15 track ids. If SGS.AUDIO_FILES.music[id] exists it is streamed through an <audio> element
 * (loop) -> MediaElementSource -> music bus, lazy-loaded per request, crossfaded on change.
 * Until/unless a file plays, a small PROCEDURAL HEAVY-METAL band plays the track instead:
 * distorted saw power chords (WaveShaper), palm-muted chugs, double-kick drums, crash/snare, lead riff,
 * per-track key/tempo/riff/style. Scheduled ahead with a setTimeout lookahead; noise buffers are shared. */
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};

  const IDS = ['title', 'select', 'ice', 'fire', 'wind', 'water', 'mud', 'jungle', 'mountain', 'plains', 'fantasy', 'moon', 'retro', 'boss', 'final'];
  const ALIAS = { fortress: 'title', shop: 'select', menu: 'title', levelselect: 'select', final_boss: 'final', bossfight: 'boss' };
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---- track defs ----
   * riff: bars of space-separated tokens (spb per bar): 'm<n>' palm-muted power chord, 'o<n>' open chord,
   *   's<n>' boogie 6th, 'b<n>' boogie b7, 'n<n>' single note, '-' hold, '.' rest. n = semitones from root.
   * prog: transposition per riff pass. Phrase = riff bars x prog length; sections alternate A / B (B = lead + drumsB).
   * drums lanes: one char per step. k kick, s snare, h hat ('o' = open), t toms ('l','m','h').
   * lead: bars of tokens, n = semitones above root+24. harm: fixed interval or 'third' (diatonic).
   * arp {n[],oct,type,every,vol,sec}  pad {type:'saw'|'choir',chord[],oct,vol,sec} */
  const D16 = { s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' };
  const DEFS = {
    title: {
      bpm: 150, spb: 16, root: 40, harm: 7,
      riff: ['m0 . m0 m0 m0 . m0 m0 o3 - . o5 - . o7 -', 'm0 . m0 m0 m0 . m0 m0 o8 - - - o7 - o5 -'],
      prog: [0, 0, -4, -2],
      drums: { k: 'x.xxx.xxx.xxx.xx', s: D16.s, h: D16.h },
      drumsB: { k: 'xxxxxxxxxxxxxxxx', s: D16.s, h: D16.h },
      lead: ['0 - - 3 - - 5 - 7 - 5 - 3 - 0 -', '-2 - - 0 - - 3 - 2 - 0 - -2 - -5 -']
    },
    select: {
      bpm: 128, spb: 16, root: 33,
      riff: ['m0 . . m0 . . m0 . o3 - m0 . o5 - o6 o5'],
      prog: [0, 0, 3, -2],
      drums: { k: 'x..x..x.x.x...x.', s: D16.s, h: D16.h },
      drumsB: { k: 'x..x..x.x.x...x.', s: D16.s, h: 'xxxxxxxxxxxxxxxx' },
      lead: ['12 - 10 - 7 - 10 - 12 - - - 15 - 12 -']
    },
    ice: {
      bpm: 168, spb: 16, root: 38,
      riff: ['m0 m0 m0 m0 m1 m1 m0 m0 m0 m0 m0 m0 o5 - o3 -', 'm0 m0 m0 m0 m1 m1 m0 m0 o7 - o6 - o5 - o1 -'],
      prog: [0, 0, -2, -4],
      drums: { k: 'x.x.x.x.x.x.x.x.', s: D16.s, h: D16.h },
      drumsB: { k: 'xxxxxxxxxxxxxxxx', s: D16.s, h: D16.h },
      lead: ['15 - 12 - 13 - 12 - 10 - 12 - 7 - - -'],
      arp: { n: [0, 3, 7, 10, 12, 10, 7, 3], oct: 36, type: 'sine', every: 1, vol: 0.05, sec: 'AB' }
    },
    fire: {
      bpm: 184, spb: 16, root: 40,
      riff: ['m0 m0 m6 m0 m0 m5 m0 m0 m3 m0 m0 m1 o0 - o6 -', 'm0 m0 m6 m0 m0 m5 m0 m0 o3 - o5 - o6 - - -'],
      prog: [0, 0, 1, -2],
      drums: { k: 'x...x...x...x...', s: '..x...x...x...x.', h: D16.h },
      drumsB: { k: 'x.x.x.x.x.x.x.x.', s: '.x.x.x.x.x.x.x.x', h: 'x...x...x...x...' },
      lead: ['12 13 12 10 12 13 15 - 16 - 15 - 13 - 12 -']
    },
    wind: {
      bpm: 160, spb: 16, root: 42, harm: 'third',
      riff: ['m0 . m0 m0 m0 . m0 m0 m0 . m0 m0 o-2 - o-4 -', 'm0 . m0 m0 m0 . m0 m0 o3 - o5 - o7 - o5 -'],
      prog: [0, -2, -4, -5],
      drums: { k: 'x.xxx.xxx.xxx.xx', s: D16.s, h: D16.h },
      drumsB: { k: 'xxxxxxxxxxxxxxxx', s: D16.s, h: D16.h },
      lead: ['7 - 5 - 3 - 2 - 3 - 5 - 7 - 10 -', '12 - - - 10 - 7 - 5 - 7 - - - - -']
    },
    water: {
      bpm: 100, spb: 12, root: 36,
      riff: ['o0 - - m0 m0 m0 o3 - - o5 - m5', 'o0 - - m0 m0 m0 o-2 - - o-4 - -'],
      prog: [0, 0, 5, 7],
      drums: { k: 'x.....x..x..', s: '...x.....x..', h: 'x..x..x..x..' },
      drumsB: { k: 'x.xx.xx.xx.x', s: '...x.....x..', h: 'xxxxxxxxxxxx' },
      lead: ['7 - 5 3 - 2 0 - - 3 - 5', '7 - 10 12 - 10 7 - - 5 - -'],
      arp: { n: [0, 7, 12, 7], oct: 36, type: 'sine', every: 3, vol: 0.04, sec: 'AB' }
    },
    mud: {
      bpm: 72, spb: 16, root: 35, drive: 10,
      riff: ['o0 - - - - - m0 m0 o1 - - - o-2 - - -', 'o0 - - - - - m0 m0 o3 - - - o1 - o0 -'],
      prog: [0, 0, 5, 1],
      drums: { k: 'x.....xx........', s: '........x.......', h: 'x...x...x...x...' },
      drumsB: { k: 'x.x...xx..x.....', s: D16.s, h: D16.h },
      lead: ['12 - - - 13 - - - 12 - 10 - 7 - - -']
    },
    jungle: {
      bpm: 138, spb: 16, root: 43,
      riff: ['m0 . m0 . o3 - m0 . m0 . o5 - o3 - m0 .'],
      prog: [0, 0, -2, 3],
      drums: { k: 'x..x..x.x..x..x.', s: D16.s, h: '..x...x...x...x.', t: 'l.m.l.h.l.mm.hh.' },
      drumsB: { k: 'x.xx.xx.x.xx.xx.', s: D16.s, h: D16.h, t: 'llmmhhmmllmmhhmm' },
      lead: ['7 - 10 - 7 5 3 - 5 - 7 - - - . .'],
      arp: { n: [0, 7, 12, 7, 10, 7, 12, 15], oct: 24, type: 'triangle', every: 2, vol: 0.06, sec: 'A' }
    },
    mountain: {
      bpm: 150, spb: 16, root: 38, harm: 12,
      riff: ['m0 m0 o3 - m0 m0 o5 - m0 m0 o7 - m0 m0 o8 -', 'm0 m0 o10 - m0 m0 o12 - o10 - o8 - o7 - o5 -'],
      prog: [0, 0, 3, 5],
      drums: { k: 'x..xx..xx..xx..x', s: D16.s, h: D16.h },
      drumsB: { k: 'xxxxxxxxxxxxxxxx', s: D16.s, h: D16.h },
      lead: ['0 - 3 - 5 - 7 - 10 - 12 - 15 - 12 -']
    },
    plains: {
      bpm: 140, spb: 12, root: 45, drive: 5, scale: [0, 2, 3, 5, 7, 9, 10],
      riff: ['m0 . s0 m0 . s0 m0 . b0 m0 . s0'],
      prog: [0, 0, 5, 0, 7, 5, 0, 7],
      drums: { k: 'x.....x.....', s: '...x.....x..', h: 'x.xx.xx.xx.x' },
      drumsB: { k: 'x..x..x..x..', s: '...x.....x..', h: 'x.xx.xx.xx.x' },
      lead: ['12 . 15 12 . 10 7 . 10 12 - -', '15 - 12 10 . 7 9 - 7 5 - -']
    },
    fantasy: {
      bpm: 176, spb: 16, root: 40, harm: 'third',
      riff: ['m0 . m0 m0 m0 . m0 m0 m0 . m0 m0 o7 - o5 -'],
      prog: [0, -4, -2, 0, -7, -4, -2, -2],
      drums: { k: 'x.xxx.xxx.xxx.xx', s: D16.s, h: D16.h },
      drumsB: { k: 'xxxxxxxxxxxxxxxx', s: D16.s, h: D16.h },
      lead: ['7 - 7 5 3 - 2 - 3 - 5 - 7 - - -'],
      arp: { n: [0, 7, 12, 15, 12, 7], oct: 24, type: 'square', every: 2, vol: 0.025, sec: 'A' }
    },
    moon: {
      bpm: 108, spb: 16, root: 37,
      riff: ['o0 - - - m0 m0 m0 . o-2 - - - o3 - m0 .'],
      prog: [0, 0, -4, -2],
      drums: { k: 'x.....x...x.....', s: '........x.......', h: D16.h },
      drumsB: { k: 'x.x...x.x.x.x...', s: D16.s, h: 'xxxxxxxxxxxxxxxx' },
      lead: ['12 - - - 15 - - - 14 - 12 - 10 - - -'],
      arp: { n: [0, 7, 12, 15, 19, 15, 12, 7], oct: 24, type: 'sine', every: 1, vol: 0.05, sec: 'AB', echo: true },
      pad: { type: 'saw', chord: [0, 7, 12, 15], oct: 12, vol: 0.035, sec: 'AB' }
    },
    retro: {
      bpm: 160, spb: 16, root: 45, retro: true,
      riff: ['m0 m0 m12 m0 m0 m10 m0 m0 m7 m0 m0 m5 o3 - o5 -'],
      prog: [0, 0, -4, -2],
      drums: { k: 'x...x...x...x...', s: D16.s, h: D16.h },
      drumsB: { k: 'x.x.x.x.x.x.x.x.', s: D16.s, h: D16.h },
      lead: ['12 - 12 15 - 12 10 - 12 - 7 - 10 - 12 -'],
      arp: { n: [0, 7, 12, 7], oct: 24, type: 'square', every: 1, vol: 0.03, sec: 'A' }
    },
    boss: {
      bpm: 200, spb: 16, root: 40,
      riff: ['m0 m0 m1 m0 m0 m3 m0 m0 m4 m0 m0 m3 m1 m0 o6 -', 'm0 m0 m1 m0 m0 m3 m0 m0 o7 - o6 - o5 - o1 -'],
      prog: [0, 0, 1, -1],
      drums: { k: 'x...x...x...x...', s: '..x...x...x...x.', h: D16.h },
      drumsB: { k: 'x.x.x.x.x.x.x.x.', s: '.x.x.x.x.x.x.x.x', h: 'x...x...x...x...' },
      lead: ['12 13 12 15 12 16 12 15 12 13 12 10 9 10 12 -']
    },
    final: {
      bpm: 132, spb: 16, root: 38, harm: 'third',
      riff: ['o0 - - - - - m0 m0 o-2 - - - - - m0 m0', 'o-4 - - - - - m-4 m-4 o-5 - - - o-2 - - -'],
      prog: [0, 3],
      drums: { k: 'x..xx...x..xx...', s: D16.s, h: D16.h },
      drumsB: { k: 'xxxxxxxxxxxxxxxx', s: D16.s, h: D16.h },
      lead: ['12 - - - 10 - - - 8 - - - 7 - - -', '5 - - - 7 - 8 - 10 - - - 7 - - -'],
      pad: { type: 'choir', chord: [0, 7, 12, 15], oct: 12, vol: 0.06, sec: 'AB' }
    }
  };

  const SHAPES = { m: [0, 7, 12], o: [0, 7, 12], s: [0, 9], b: [0, 10], n: [0], q: [0, 12] };
  const MUTED = { m: 1, s: 1, b: 1 };

  function parseBar(str, spb, isLead) {
    const tk = str.trim().split(/\s+/);
    if (tk.length !== spb) throw new Error('Music bar has ' + tk.length + ' steps, expected ' + spb + ': ' + str);
    const out = new Array(spb).fill(null);
    for (let i = 0; i < spb; i++) {
      const s = tk[i];
      if (s === '-' || s === '.') continue;
      let k = 'n'; let n;
      if (isLead) n = parseInt(s, 10); else { k = s[0]; n = parseInt(s.slice(1), 10); }
      if (isNaN(n) || (!isLead && !SHAPES[k])) throw new Error('Bad music token ' + s);
      let len = 1; while (i + len < spb && tk[i + len] === '-') len++;
      out[i] = { k, n, len };
    }
    return out;
  }
  function compile(id, d) {
    if (d._c) return d._c;
    const spb = d.spb || 16;
    const c = {
      id, bpm: d.bpm, spb, root: d.root, retro: !!d.retro, drive: d.drive || 7, harm: d.harm || 0,
      scale: d.scale || [0, 2, 3, 5, 7, 8, 10],
      riff: d.riff.map((b) => parseBar(b, spb, false)), prog: d.prog || [0],
      lead: (d.lead || []).map((b) => parseBar(b, spb, true)),
      drums: d.drums, drumsB: d.drumsB || d.drums, arp: d.arp || null, pad: d.pad || null
    };
    for (const lane of ['k', 's', 'h', 't']) {
      [c.drums, c.drumsB].forEach((dr) => { if (dr[lane] && dr[lane].length !== spb) throw new Error(id + ' drum lane ' + lane + ' length'); });
    }
    c.stepDur = 60 / d.bpm / (spb / 4);
    c.phraseBars = c.riff.length * c.prog.length;
    d._c = c;
    return c;
  }
  function harmInt(c, n) {
    if (typeof c.harm === 'number') return c.harm;
    const sc = c.scale; const pc = ((n % 12) + 12) % 12;
    let i = sc.length - 1; while (i > 0 && sc[i] > pc) i--;
    const j = i + 2; const up = sc[j % sc.length] + 12 * Math.floor(j / sc.length);
    return up - sc[i];
  }

  /* ---- the band (one per playing procedural track) ---- */
  function Band(A, dest, c, lite) {
    const x = A.ctx;
    this.A = A; this.x = x; this.c = c; this.lite = lite; this.nodes = [];
    const out = this.out = x.createGain(); out.gain.value = 0.6; out.connect(dest);
    const gin = this.gin = x.createGain();
    const drive = x.createGain(); drive.gain.value = c.retro ? 1.2 : c.drive;
    const sh = x.createWaveShaper(); sh.curve = c.retro ? crushCurve() : A.curve(2.5); sh.oversample = lite ? 'none' : '2x';
    const hp = x.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 85;
    const mid = x.createBiquadFilter(); mid.type = 'peaking'; mid.frequency.value = 750; mid.Q.value = 0.8; mid.gain.value = c.retro ? 0 : -5;
    const cab = x.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = c.retro ? 7000 : 4800; cab.Q.value = 0.7;
    const gout = x.createGain(); gout.gain.value = c.retro ? 0.13 : 0.16;
    gin.connect(drive); drive.connect(sh); sh.connect(hp); hp.connect(mid); mid.connect(cab); cab.connect(gout);
    if (!lite && x.createStereoPanner) { // double-tracked rhythm guitar
      const pl = x.createStereoPanner(); pl.pan.value = -0.45; const pr = x.createStereoPanner(); pr.pan.value = 0.45;
      const dl = x.createDelay(0.05); dl.delayTime.value = 0.014;
      gout.connect(pl); pl.connect(out); gout.connect(dl); dl.connect(pr); pr.connect(out);
    } else gout.connect(out);
    this.bass = x.createGain(); this.bass.gain.value = c.retro ? 0.22 : 0.3; this.bass.connect(out);
    this.drum = x.createGain(); this.drum.gain.value = 0.85; this.drum.connect(out);
    // lead: light drive + feedback echo
    const lin = this.lin = x.createGain();
    const lsh = x.createWaveShaper(); lsh.curve = c.retro ? crushCurve() : A.curve(3);
    const llp = x.createBiquadFilter(); llp.type = 'lowpass'; llp.frequency.value = c.retro ? 6000 : 3800;
    const lg = x.createGain(); lg.gain.value = c.retro ? 0.07 : 0.085;
    lin.connect(lsh); lsh.connect(llp); llp.connect(lg); lg.connect(out);
    const echo = this.echo = x.createDelay(1.0); echo.delayTime.value = c.stepDur * 3;
    const fb = x.createGain(); fb.gain.value = 0.3; const ew = x.createGain(); ew.gain.value = 0.35;
    lg.connect(echo); echo.connect(fb); fb.connect(echo); echo.connect(ew); ew.connect(out);
    this.vib = x.createOscillator(); this.vib.frequency.value = 5.5;
    this.vibG = x.createGain(); this.vibG.gain.value = 14; this.vib.connect(this.vibG); this.vib.start();
    this.fx = x.createGain(); this.fx.gain.value = 1; this.fx.connect(out); this.fx.connect(echo); // arps/pads
  }
  let _crush = null;
  function crushCurve() {
    if (_crush) return _crush;
    const n = 1024; _crush = new Float32Array(n);
    for (let i = 0; i < n; i++) { const v = (i / (n - 1)) * 2 - 1; _crush[i] = Math.round(v * 6) / 6; }
    return _crush;
  }
  Band.prototype.env = function (g, t, v, a, len, rel) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.setValueAtTime(v, t + Math.max(a + 0.005, len - rel));
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  };
  Band.prototype.chord = function (t, midi, k, dur) {
    const x = this.x; const c = this.c; const f = mtof(midi); const muted = !!MUTED[k];
    const len = muted ? Math.min(dur, 0.17) : dur + 0.02;
    const lp = x.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.setValueAtTime(muted ? 700 : 3400, t); lp.Q.value = muted ? 1.4 : 0.7;
    if (muted) lp.frequency.exponentialRampToValueAtTime(280, t + 0.12);
    const g = x.createGain();
    this.env(g, t, 0.3, 0.004, len, muted ? 0.1 : 0.05);
    lp.connect(g); g.connect(this.gin);
    const iv = SHAPES[k] || SHAPES.m; const type = c.retro ? 'square' : 'sawtooth';
    const list = c.retro ? iv.slice(0, 2) : iv;
    for (let i = 0; i < list.length; i++) {
      const o = x.createOscillator(); o.type = type; o.frequency.value = f * Math.pow(2, list[i] / 12);
      o.connect(lp); o.start(t); o.stop(t + len + 0.02);
    }
    if (!this.lite && !c.retro) { const o = x.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = 9; o.connect(lp); o.start(t); o.stop(t + len + 0.02); }
  };
  Band.prototype.bassNote = function (t, midi, dur, muted) {
    const x = this.x; const len = muted ? Math.min(dur, 0.2) : dur;
    const o = x.createOscillator(); o.type = this.c.retro ? 'triangle' : 'sawtooth'; o.frequency.value = mtof(midi - 12);
    const g = x.createGain(); this.env(g, t, 0.55, 0.005, len, 0.06);
    if (this.c.retro) o.connect(g); else {
      const lp = x.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; o.connect(lp); lp.connect(g);
    }
    g.connect(this.bass); o.start(t); o.stop(t + len + 0.02);
  };
  Band.prototype.noise = function (t, o) {
    const A = this.A; const x = this.x;
    const s = x.createBufferSource(); s.buffer = this.c.retro ? A._noise8 : A._noise; s.loop = true;
    const f = x.createBiquadFilter(); f.type = o.type; f.frequency.value = o.f; if (o.q) f.Q.value = o.q;
    const g = x.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    s.connect(f); f.connect(g); g.connect(this.drum); s.start(t, Math.random()); s.stop(t + o.dur + 0.02);
  };
  Band.prototype.tone = function (t, type, f0, f1, dur, vol, dest) {
    const x = this.x; const o = x.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4);
    const g = x.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || this.drum); o.start(t); o.stop(t + dur + 0.02);
  };
  Band.prototype.kick = function (t, v) {
    if (this.c.retro) { this.tone(t, 'square', 120, 35, 0.12, 0.35 * v); return; }
    this.tone(t, 'sine', 155, 44, 0.28, 0.95 * v);
    this.noise(t, { type: 'highpass', f: 2500, dur: 0.012, vol: 0.25 * v });
  };
  Band.prototype.snare = function (t, v) {
    if (this.c.retro) { this.noise(t, { type: 'lowpass', f: 6000, dur: 0.12, vol: 0.4 * v }); return; }
    this.noise(t, { type: 'bandpass', f: 1900, q: 0.8, dur: 0.17, vol: 0.5 * v });
    this.tone(t, 'triangle', 190, 150, 0.09, 0.32 * v);
  };
  Band.prototype.hat = function (t, open) { this.noise(t, { type: 'highpass', f: 7500, dur: open ? 0.22 : 0.035, vol: 0.1 }); };
  Band.prototype.crash = function (t) {
    this.noise(t, { type: 'highpass', f: 4500, dur: 1.5, vol: 0.2 });
    if (!this.lite) this.noise(t, { type: 'bandpass', f: 7000, q: 0.5, dur: 1.0, vol: 0.09 });
  };
  Band.prototype.tom = function (t, w) {
    const f = w === 'h' ? 185 : w === 'm' ? 135 : 95;
    this.tone(t, 'sine', f, f * 0.55, 0.3, 0.55);
  };
  Band.prototype.lead = function (t, midi, dur) {
    const x = this.x; const len = dur + 0.03;
    const g = x.createGain(); this.env(g, t, 0.35, 0.012, len, 0.06); g.connect(this.lin);
    const type = this.c.retro ? 'square' : 'sawtooth';
    const n = this.lite ? 1 : 2;
    for (let i = 0; i < n; i++) {
      const o = x.createOscillator(); o.type = type; o.frequency.value = mtof(midi); o.detune.value = i ? 7 : -4;
      if (dur > 0.18) this.vibG.connect(o.detune);
      o.connect(g); o.start(t); o.stop(t + len + 0.02);
    }
  };
  Band.prototype.arp = function (t, midi, dur, a) {
    const x = this.x; const o = x.createOscillator(); o.type = a.type || 'sine'; o.frequency.value = mtof(midi);
    const g = x.createGain(); this.env(g, t, a.vol || 0.05, 0.004, Math.min(dur * 1.6, 0.4), 0.15);
    o.connect(g); g.connect(a.echo ? this.fx : this.out); o.start(t); o.stop(t + 0.45);
  };
  Band.prototype.pad = function (t, midi, chord, dur, p) {
    const x = this.x; const g = x.createGain(); const v = p.vol || 0.04;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + Math.min(0.4, dur * 0.3));
    g.gain.setValueAtTime(v, t + dur * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    let head = g;
    if (p.type === 'choir') { // "aah" formants
      const f1 = x.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 750; f1.Q.value = 3;
      const f2 = x.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 4;
      const m = x.createGain(); m.gain.value = 2.2; f1.connect(m); f2.connect(m); m.connect(this.fx);
      head = { connect(n) { /* unused */ } };
      g.connect(f1); g.connect(f2);
    } else {
      const lp = x.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; g.connect(lp); lp.connect(this.fx);
    }
    const voices = this.lite ? 1 : 2;
    for (const iv of chord) {
      for (let i = 0; i < voices; i++) {
        const o = x.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(midi + iv); o.detune.value = i ? 8 : -8;
        o.connect(g); o.start(t); o.stop(t + dur + 0.3);
      }
    }
    return head;
  };
  Band.prototype.close = function () {
    try { this.vib.stop(); } catch (e) { /* */ }
    try { this.out.disconnect(); } catch (e) { /* */ }
  };

  /* ---- sequencer ---- */
  function hidden() { return !!(typeof document !== 'undefined' && document.hidden); }
  function Seq(A, id, dest) {
    const def = DEFS[id] || DEFS.title;
    this.A = A; this.c = compile(id, def);
    const dv = S.Main && S.Main.device;
    this.band = new Band(A, dest, this.c, !!(dv && (dv.low || dv.mobile)));
    this.step = 0; this.next = A.ctx.currentTime + 0.06; this.alive = true;
    const self = this;
    this.timer = setInterval(() => self.tick(), 25);
    this.tick();
  }
  Seq.prototype.tick = function () {
    if (!this.alive) return;
    const now = this.A.ctx.currentTime;
    if (this.next < now - 0.25) this.next = now + 0.05; // fell far behind: skip, don't burst
    const ahead = hidden() ? 1.5 : 0.18;
    while (this.next < now + ahead) { this.sched(this.step, this.next); this.next += this.c.stepDur; this.step++; }
  };
  Seq.prototype.sched = function (step, t) {
    const c = this.c; const b = this.band; const spb = c.spb; const sd = c.stepDur;
    const bar = Math.floor(step / spb); const s = step % spb;
    const sec = Math.floor(bar / c.phraseBars); const bi = bar % c.phraseBars;
    const B = sec % 2 === 1;
    const tr = c.prog[Math.floor(bi / c.riff.length)];
    const root = c.root + tr;
    const tok = c.riff[bi % c.riff.length][s];
    if (tok) { b.chord(t, root + tok.n, tok.k, tok.len * sd); b.bassNote(t, root + tok.n, tok.len * sd, !!MUTED[tok.k]); }
    const dr = B ? c.drumsB : c.drums;
    const lastBar = bi === c.phraseBars - 1;
    const fill = lastBar && s >= spb - spb / 4;
    if (fill) { b.snare(t, 0.6 + 0.4 * (s - (spb - spb / 4)) / (spb / 4)); if (s === spb - spb / 4) b.kick(t, 1); } else {
      const ch = (lane) => (lane && lane[s] !== '.' ? lane[s] : null);
      if (ch(dr.k)) b.kick(t, dr.k[s] === 'X' ? 1.1 : 1);
      if (ch(dr.s)) b.snare(t, 1);
      const h = ch(dr.h); if (h) b.hat(t, h === 'o');
      const tm = ch(dr.t); if (tm) b.tom(t, tm);
    }
    if (s === 0 && (bi === 0 || (B && bi % 4 === 0))) b.crash(t);
    if (c.lead.length && B) {
      const lt = c.lead[bi % c.lead.length][s];
      if (lt) {
        const m = c.root + 24 + lt.n + tr;
        b.lead(t, m, lt.len * sd);
        if (c.harm) b.lead(t, m + harmInt(c, lt.n), lt.len * sd);
      }
    }
    const a = c.arp;
    if (a && (a.sec.indexOf(B ? 'B' : 'A') >= 0) && s % (a.every || 1) === 0) {
      const i = Math.floor(s / (a.every || 1)) % a.n.length;
      b.arp(t, c.root + a.oct + a.n[i] + tr, sd * (a.every || 1), a);
    }
    const p = c.pad;
    if (p && s === 0 && p.sec.indexOf(B ? 'B' : 'A') >= 0) b.pad(t, c.root + (p.oct || 12) + tr, p.chord, spb * sd, p);
  };
  Seq.prototype.stop = function (after) {
    this.alive = false; clearInterval(this.timer);
    const band = this.band;
    setTimeout(() => band.close(), Math.max(0, after || 0) * 1000 + 400);
  };

  /* ---- public API ---- */
  const M = S.Music = {
    current: null, IDS, DEFS, ALIAS,
    _cur: null, _pending: null, _files: {}, _out: null, _dLevel: 1, _dUntil: 0
  };
  function Au() { return S.Audio; }
  function noMusic() {
    if (S.Main && S.Main.flags && S.Main.flags.nomusic) return true;
    try { return typeof location !== 'undefined' && /[?&]nomusic=1/.test(location.search || ''); } catch (e) { return false; }
  }
  function fileSrc(id) { const f = S.AUDIO_FILES && S.AUDIO_FILES.music; return (f && f[id]) || null; }
  function out() {
    const A = Au();
    if (!M._out) { M._out = A.ctx.createGain(); M._out.connect(A.bus.music); }
    return M._out;
  }
  M.resolve = function (id) { return ALIAS[id] || id; };
  M.compile = function (id) { return compile(id, DEFS[id] || DEFS.title); };

  M.play = function (id, o) {
    o = o || {};
    if (!id) return;
    id = M.resolve(id);
    if (noMusic()) { M.current = id; return; }
    if (M.current === id && (M._cur || M._pending) && !o.restart) return;
    M.current = id;
    const A = Au();
    if (!A) return;
    if (!A.inited) A.init();
    if (!A.ctx || !A.unlocked) { M._pending = { id, fade: o.fade }; return; }
    M._pending = null;
    M._switch(id, o.fade == null ? 0.8 : o.fade);
  };
  M._onUnlock = function () {
    const p = M._pending; M._pending = null;
    if (p && M.current === p.id) M._switch(p.id, p.fade == null ? 1.2 : p.fade);
  };

  M._switch = function (id, fade) {
    const A = Au(); const x = A.ctx; const now = x.currentTime;
    const old = M._cur;
    const g = x.createGain(); g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(1, now + Math.max(0.03, fade));
    g.connect(out());
    const pg = x.createGain(); pg.connect(g); const fg = x.createGain(); fg.connect(g);
    const inst = { id, g, pg, fg, seq: null, file: null, dead: false, waitT: 0 };
    M._cur = inst;
    if (old) M._kill(old, fade);
    const src = fileSrc(id);
    const fe = src ? M._file(id, src) : null;
    if (fe && !fe.failed) {
      if (fe.ready) M._startFile(inst, fe, 0);
      else {
        fe.waiters.push((ok) => { if (inst.dead || inst.file) return; if (ok) M._startFile(inst, fe, inst.seq ? 1.2 : 0); else if (!inst.seq) M._startProc(inst); });
        inst.waitT = setTimeout(() => { if (!inst.dead && !inst.file && !inst.seq) M._startProc(inst); }, 1200);
        try { fe.el.load(); } catch (e) { /* */ }
      }
    } else M._startProc(inst);
  };
  M._startProc = function (inst) {
    const A = Au();
    inst.pg.gain.setValueAtTime(1, A.ctx.currentTime);
    inst.seq = new Seq(A, inst.id, inst.pg);
  };
  M._startFile = function (inst, fe, xfade) {
    const A = Au(); const now = A.ctx.currentTime;
    clearTimeout(inst.waitT);
    inst.file = fe; fe.owner = inst;
    if (fe.node) { try { fe.node.disconnect(); } catch (e) { /* */ } fe.node.connect(inst.fg); }
    try { fe.el.currentTime = 0; } catch (e) { /* */ }
    const pr = fe.el.play(); if (pr && pr.catch) pr.catch(() => { /* autoplay refusal: keep procedural */ });
    if (xfade > 0) {
      inst.fg.gain.setValueAtTime(0, now); inst.fg.gain.linearRampToValueAtTime(1, now + xfade);
      inst.pg.gain.cancelScheduledValues(now); inst.pg.gain.setValueAtTime(1, now); inst.pg.gain.linearRampToValueAtTime(0, now + xfade);
      const seq = inst.seq; inst.seq = null; if (seq) { setTimeout(() => seq.stop(0), xfade * 1000 + 100); }
    } else inst.fg.gain.setValueAtTime(1, now);
  };
  M._kill = function (inst, fade) {
    const A = Au(); const now = A.ctx.currentTime;
    inst.dead = true; clearTimeout(inst.waitT);
    inst.g.gain.cancelScheduledValues(now); inst.g.gain.setValueAtTime(inst.g.gain.value, now);
    inst.g.gain.linearRampToValueAtTime(0, now + Math.max(0.03, fade));
    setTimeout(() => {
      if (inst.seq) inst.seq.stop(0);
      if (inst.file && inst.file.owner === inst) { try { inst.file.el.pause(); } catch (e) { /* */ } inst.file.owner = null; }
      try { inst.g.disconnect(); } catch (e) { /* */ }
    }, Math.max(0.03, fade) * 1000 + 80);
  };
  M._file = function (id, src) {
    if (M._files[id]) return M._files[id];
    const A = Au();
    if (typeof window.Audio !== 'function') return null;
    const el = new window.Audio();
    el.preload = 'auto'; el.loop = true; el.src = src;
    const fe = { id, el, node: null, ready: false, failed: false, owner: null, waiters: [] };
    const done = (ok) => { const w = fe.waiters; fe.waiters = []; w.forEach((f) => f(ok)); };
    el.addEventListener('canplay', () => { if (!fe.ready) { fe.ready = true; done(true); } });
    el.addEventListener('error', () => { fe.failed = true; done(false); if (fe.owner && !fe.owner.seq && !fe.owner.dead) { const o = fe.owner; o.file = null; M._startProc(o); } });
    try { fe.node = A.ctx.createMediaElementSource(el); } catch (e) { fe.node = null; }
    M._files[id] = fe;
    return fe;
  };

  M.stop = function (fade) {
    M.current = null; M._pending = null;
    const A = Au();
    if (M._cur && A && A.ctx) M._kill(M._cur, fade == null ? 0.6 : fade);
    M._cur = null;
  };

  // duck(amt 0..1, sec): dip the music (voice lines, boss death), recover after sec
  M.duck = function (amt, sec) {
    const A = Au();
    if (!A || !A.ctx || !M._out) return;
    const t = A.ctx.currentTime;
    let level = 1 - clamp(amt == null ? 0.5 : amt, 0, 1);
    let until = t + (sec == null ? 1 : sec);
    if (t < M._dUntil) { level = Math.min(level, M._dLevel); until = Math.max(until, M._dUntil); }
    M._dLevel = level; M._dUntil = until;
    const gp = M._out.gain;
    gp.cancelScheduledValues(t); gp.setTargetAtTime(level, t, 0.05); gp.setTargetAtTime(1, until, 0.3);
  };

  M._visibility = function (isHidden) {
    const inst = M._cur;
    if (!inst || !inst.file) return;
    try { if (isHidden) inst.file.el.pause(); else { const p = inst.file.el.play(); if (p && p.catch) p.catch(() => { /* */ }); } } catch (e) { /* */ }
  };
  M.isProcedural = function () { return !!(M._cur && M._cur.seq && !M._cur.file); };
})();
