// WebAudio: synthesized sfx and a small procedural score (no samples, nothing to license).
import { rng } from './levelgen.js';

let ctx = null, master = null, sfxBus = null, musBus = null, noiseBuf = null;
const vol = { master: 0.8, sfx: 0.8, music: 0.5 };

const MODES = {
  major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11],
  mixo: [0, 2, 4, 5, 7, 9, 10], phryg: [0, 1, 3, 5, 7, 8, 10], pent: [0, 2, 4, 7, 9], minpent: [0, 3, 5, 7, 10],
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// style table: key = theme.music
export const TRACKS = {
  title: { bpm: 92, root: 57, mode: 'major', prog: [0, 5, 3, 4], bass: 'half', lead: 'sparse', drums: 'none', pad: 1 },
  hub: { bpm: 96, root: 55, mode: 'major', prog: [0, 3, 4, 0], bass: 'half', lead: 'sparse', drums: 'none', pad: 1 },
  meadow: { bpm: 116, root: 60, mode: 'major', prog: [0, 4, 5, 3], bass: 'walk', lead: 'bounce', drums: 'light', pad: 0.6 },
  mist: { bpm: 84, root: 57, mode: 'lydian', prog: [0, 1, 0, 4], bass: 'half', lead: 'sparse', drums: 'none', pad: 1.2 },
  mill: { bpm: 124, root: 57, mode: 'mixo', prog: [0, 6, 3, 0], bass: 'walk', lead: 'bounce', drums: 'light', pad: 0.5 },
  quarry: { bpm: 102, root: 52, mode: 'dorian', prog: [0, 3, 6, 4], bass: 'drive', lead: 'sparse', drums: 'light', pad: 0.6 },
  flight: { bpm: 142, root: 62, mode: 'major', prog: [0, 4, 5, 3], bass: 'drive', lead: 'run', drums: 'drive', pad: 0.7 },
  boss: { bpm: 150, root: 50, mode: 'minor', prog: [0, 5, 3, 4], bass: 'drive', lead: 'run', drums: 'drive', pad: 0.9 },
  forge: { bpm: 112, root: 48, mode: 'phryg', prog: [0, 1, 0, 6], bass: 'drive', lead: 'sparse', drums: 'drive', pad: 0.7 },
  gale: { bpm: 108, root: 59, mode: 'lydian', prog: [0, 4, 1, 4], bass: 'half', lead: 'bounce', drums: 'light', pad: 0.9 },
  crystal: { bpm: 80, root: 56, mode: 'dorian', prog: [0, 2, 3, 2], bass: 'half', lead: 'sparse', drums: 'none', pad: 1.3 },
  night: { bpm: 100, root: 53, mode: 'minor', prog: [0, 3, 5, 4], bass: 'walk', lead: 'sparse', drums: 'light', pad: 0.8 },
  keep: { bpm: 96, root: 45, mode: 'phryg', prog: [0, 5, 1, 0], bass: 'drive', lead: 'sparse', drums: 'drive', pad: 1 },
  victory: { bpm: 120, root: 60, mode: 'major', prog: [0, 3, 4, 0], bass: 'walk', lead: 'run', drums: 'light', pad: 0.8 },
};

function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = vol.master;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
  master.connect(comp); comp.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = vol.sfx; sfxBus.connect(master);
  musBus = ctx.createGain(); musBus.gain.value = vol.music * 0.5; musBus.connect(master);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function tone(f, t, dur, type = 'sine', g = 0.2, o = {}) {
  if (!ctx) return;
  const osc = ctx.createOscillator(), gn = ctx.createGain();
  osc.type = type; osc.frequency.setValueAtTime(f, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const a = o.attack === undefined ? 0.005 : o.attack, r = o.release === undefined ? 0.06 : o.release;
  gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(g, t + a);
  gn.gain.setValueAtTime(g, t + Math.max(a, dur - r)); gn.gain.linearRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (o.lp) { const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; osc.connect(f2); node = f2; }
  node.connect(gn); gn.connect(o.bus || sfxBus);
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noise(t, dur, g = 0.2, o = {}) {
  if (!ctx) return;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.f || 1200, t); if (o.to) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.to), t + dur); f.Q.value = o.q || 0.8;
  const gn = ctx.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(g, t + (o.attack || 0.004)); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(gn); gn.connect(o.bus || sfxBus);
  src.start(t, Math.random()); src.stop(t + dur + 0.05);
}

const lastPlay = {};
function throttle(name, ms) { const n = performance.now(); if (lastPlay[name] && n - lastPlay[name] < ms) return true; lastPlay[name] = n; return false; }

const SFX = {
  jump: (t) => { tone(280, t, 0.14, 'sine', 0.22, { to: 640 }); },
  land: (t, e) => { const k = Math.min(1, (e && e.impact || 6) / 20); noise(t, 0.12, 0.12 + k * 0.2, { f: 300, type: 'lowpass' }); tone(110, t, 0.12, 'sine', 0.2 + k * 0.2, { to: 50 }); },
  glide: (t) => { noise(t, 0.2, 0.08, { f: 900, to: 500 }); },
  charge: (t) => { noise(t, 0.35, 0.25, { f: 500, to: 2400, q: 1.2 }); tone(120, t, 0.3, 'sawtooth', 0.12, { to: 340, lp: 900 }); },
  flame: (t) => { noise(t, 0.4, 0.28, { f: 1400, to: 500, q: 0.6 }); noise(t + 0.03, 0.34, 0.12, { f: 300, type: 'lowpass' }); },
  gem: (t, e) => { const v = (e && e.v) || 1, base = 880 * Math.pow(2, ({ 1: 0, 2: 2, 5: 4, 10: 7, 25: 12 }[v] || 0) / 12); tone(base, t, 0.09, 'triangle', 0.16); tone(base * 1.5, t + 0.06, 0.16, 'triangle', 0.14); },
  chest: (t) => { tone(220, t, 0.25, 'square', 0.1, { to: 330 }); [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, t + 0.12 + i * 0.07, 0.4, 'triangle', 0.15)); },
  break: (t) => { noise(t, 0.2, 0.3, { f: 1800, to: 400 }); tone(180, t, 0.1, 'square', 0.1, { to: 60 }); },
  kill: (t) => { noise(t, 0.16, 0.25, { f: 2200, to: 500 }); tone(520, t, 0.14, 'square', 0.12, { to: 180 }); },
  hurt: (t) => { tone(300, t, 0.3, 'sawtooth', 0.22, { to: 90, lp: 1200 }); noise(t, 0.14, 0.2, { f: 700 }); },
  heal: (t) => { [523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.06, 0.16, 'triangle', 0.15)); },
  moth: (t) => { tone(1200, t, 0.1, 'sine', 0.12, { to: 1800 }); },
  rescue: (t) => { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, t + i * 0.08, 0.5, 'triangle', 0.14)); tone(262, t, 1.0, 'sine', 0.2); },
  sunstone: (t) => { [392, 523, 659, 784, 1046].forEach((f, i) => tone(f, t + i * 0.1, 0.6, 'sine', 0.16)); },
  checkpoint: (t) => { tone(784, t, 0.5, 'sine', 0.18); tone(1175, t + 0.08, 0.5, 'sine', 0.12); },
  clink: (t) => { tone(1800, t, 0.12, 'square', 0.08, { to: 1500 }); tone(2400, t, 0.08, 'sine', 0.1); },
  spring: (t) => { tone(200, t, 0.3, 'sine', 0.25, { to: 800 }); tone(300, t, 0.3, 'triangle', 0.12, { to: 1000 }); },
  vent: (t) => { noise(t, 0.4, 0.1, { f: 600, to: 1200 }); },
  gate: (t) => { noise(t, 1.2, 0.3, { f: 120, type: 'lowpass' }); tone(70, t, 1.1, 'sawtooth', 0.12, { to: 50, lp: 200 }); },
  locked: (t) => { tone(140, t, 0.2, 'square', 0.12, { to: 110 }); tone(110, t + 0.1, 0.2, 'square', 0.12); },
  zap: (t) => { noise(t, 0.12, 0.15, { f: 2600 }); },
  spit: (t) => { tone(500, t, 0.14, 'sine', 0.16, { to: 200 }); },
  splash: (t) => { noise(t, 0.5, 0.3, { f: 900, to: 300 }); },
  fall: (t) => { tone(500, t, 0.5, 'sine', 0.12, { to: 80 }); },
  ring: (t) => { [659, 880, 1318].forEach((f, i) => tone(f, t + i * 0.05, 0.3, 'triangle', 0.15)); },
  portal: (t) => { tone(220, t, 0.8, 'sine', 0.2, { to: 880 }); noise(t, 0.6, 0.12, { f: 400, to: 3000 }); },
  exit: (t) => { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, t + i * 0.09, 0.4, 'triangle', 0.15)); },
  hit: (t) => { noise(t, 0.14, 0.3, { f: 600, to: 200 }); tone(140, t, 0.16, 'square', 0.15, { to: 60 }); },
  bosshit: (t) => { tone(90, t, 0.4, 'sawtooth', 0.25, { to: 40, lp: 500 }); noise(t, 0.3, 0.3, { f: 300, type: 'lowpass' }); },
  roar: (t) => { tone(80, t, 1.2, 'sawtooth', 0.22, { to: 45, lp: 400, attack: 0.15 }); noise(t, 1.0, 0.2, { f: 200, type: 'lowpass', attack: 0.2 }); },
  slam: (t) => { tone(70, t, 0.6, 'sine', 0.4, { to: 30 }); noise(t, 0.5, 0.4, { f: 200, type: 'lowpass' }); },
  bossdead: (t) => { for (let i = 0; i < 6; i++) { noise(t + i * 0.18, 0.4, 0.3, { f: 400, type: 'lowpass' }); tone(90 - i * 8, t + i * 0.18, 0.4, 'sawtooth', 0.15, { to: 30 }); } },
  menu: (t) => { tone(660, t, 0.05, 'triangle', 0.1); },
  select: (t) => { tone(660, t, 0.07, 'triangle', 0.14); tone(990, t + 0.06, 0.12, 'triangle', 0.14); },
  back: (t) => { tone(500, t, 0.1, 'triangle', 0.12, { to: 300 }); },
};
const THROTTLE = { gem: 40, glide: 400, land: 80, hit: 100, clink: 120, land_: 0, break: 40, vent: 800, menu: 30 };

// ---- music
let mus = null; // { cfg, step, next, timer, seq }
function degNote(cfg, deg, oct = 0) {
  const sc = MODES[cfg.mode]; const n = sc.length;
  const o = Math.floor(deg / n), i = ((deg % n) + n) % n;
  return cfg.root + sc[i] + 12 * (o + oct);
}

function buildPhrase(cfg, name) {
  // 4 bars x 16 steps; deterministic per track
  const r = rng(name.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const out = [];
  let deg = 4;
  for (let bar = 0; bar < 4; bar++) {
    const chordDeg = cfg.prog[bar];
    const steps = new Array(16).fill(null);
    const dens = cfg.lead === 'run' ? 0.7 : cfg.lead === 'bounce' ? 0.5 : 0.22;
    for (let s = 0; s < 16; s++) {
      const strong = s % 4 === 0;
      if (!(strong ? r() < dens + 0.3 : r() < dens * (s % 2 ? 0.35 : 0.7))) continue;
      // choose chord tones on strong beats, scale tones otherwise
      const tones = [chordDeg, chordDeg + 2, chordDeg + 4, chordDeg + 7];
      deg = strong ? tones[Math.floor(r() * tones.length)] + 7 : Math.max(2, Math.min(14, deg + (r() < 0.5 ? -1 : 1) * (r() < 0.7 ? 1 : 2)));
      steps[s] = deg;
    }
    out.push(steps);
  }
  return out;
}

function schedule() {
  if (!mus || !ctx) return;
  const cfg = mus.cfg, spb = 60 / cfg.bpm / 4; // 16th
  while (mus.next < ctx.currentTime + 0.3) {
    const t = mus.next, step = mus.step % 64, bar = (step >> 4) & 3, s = step & 15, chord = cfg.prog[bar];
    // pad: on bar start
    if (s === 0) {
      const dur = spb * 16;
      for (const k of [0, 2, 4]) { tone(mtof(degNote(cfg, chord + k, 0) + 0), t, dur, 'triangle', 0.05 * cfg.pad, { attack: 0.35, release: 0.5, bus: musBus, lp: 1400 }); }
      tone(mtof(degNote(cfg, chord, 1)), t, dur, 'sine', 0.04 * cfg.pad, { attack: 0.5, release: 0.5, bus: musBus });
    }
    // bass
    const bn = degNote(cfg, chord, -2);
    if (cfg.bass === 'half' && (s === 0 || s === 8)) tone(mtof(bn), t, spb * 7, 'sine', 0.2, { release: 0.1, bus: musBus });
    else if (cfg.bass === 'walk' && s % 4 === 0) tone(mtof(bn + (s === 12 ? 7 : s === 8 ? 12 : 0)), t, spb * 3, 'triangle', 0.2, { release: 0.08, bus: musBus });
    else if (cfg.bass === 'drive' && s % 2 === 0) tone(mtof(bn + (s % 8 === 6 ? 7 : 0)), t, spb * 1.6, 'sawtooth', 0.09, { release: 0.05, lp: 500, bus: musBus });
    // lead
    const ln = mus.phrase[bar][s];
    if (ln !== null) tone(mtof(degNote(cfg, ln, 0)), t, spb * (cfg.lead === 'sparse' ? 3.2 : 1.7), cfg.lead === 'run' ? 'square' : 'triangle', cfg.lead === 'run' ? 0.06 : 0.1, { release: 0.1, lp: 3000, bus: musBus });
    // drums
    if (cfg.drums !== 'none') {
      if (s % 4 === 0 && (cfg.drums === 'drive' || s % 8 === 0)) tone(130, t, 0.12, 'sine', 0.3, { to: 45, bus: musBus });
      if (cfg.drums === 'drive' && s % 8 === 4) noise(t, 0.12, 0.1, { f: 1800, q: 0.5, bus: musBus });
      if (s % 2 === 1 || (cfg.drums === 'drive')) noise(t, 0.04, cfg.drums === 'drive' ? 0.04 : 0.025, { f: 7000, type: 'highpass', bus: musBus });
    }
    mus.next += spb; mus.step++;
  }
}

export const Audio = {
  vol,
  unlock() { init(); if (ctx && Audio.pending) { const n = Audio.pending; Audio.pending = null; Audio.music(n); } },
  setVolumes(m, s, mu) {
    if (m !== undefined) vol.master = m; if (s !== undefined) vol.sfx = s; if (mu !== undefined) vol.music = mu;
    if (ctx) { master.gain.value = vol.master; sfxBus.gain.value = vol.sfx; musBus.gain.value = vol.music * 0.5; }
  },
  sfx(name, e) {
    if (!ctx || !SFX[name]) return;
    if (THROTTLE[name] && throttle(name, THROTTLE[name])) return;
    SFX[name](ctx.currentTime + 0.01, e);
  },
  // map gameplay event types to sounds
  event(type, e) {
    const m = { jump: 'jump', land: 'land', charge: 'charge', flame: 'flame', glide: 'glide', gem: 'gem', break: 'break', chest: 'chest', kill: 'kill', hurt: 'hurt', heal: 'heal', moth: 'moth', rescue: 'rescue', sunstone: 'sunstone', checkpoint: 'checkpoint', clink: 'clink', spring: 'spring', gate: 'gate', locked: 'locked', zap: 'zap', spit: 'spit', splash: 'splash', fall: 'fall', ring: 'ring', portal: 'portal', exit: 'exit', hit: 'hit', bosshit: 'bosshit', roar: 'roar', slam: 'slam', bossdead: 'bossdead', bump: 'clink', respawn: null };
    const n = m[type]; if (n) Audio.sfx(n, e);
  },
  music(name) {
    if (!ctx) { Audio.pending = name; return; }
    if (mus && mus.name === name) return;
    Audio.stopMusic();
    const cfg = TRACKS[name] || TRACKS.meadow;
    mus = { name, cfg, step: 0, next: ctx.currentTime + 0.2, phrase: buildPhrase(cfg, name) };
    mus.timer = setInterval(schedule, 60);
  },
  stopMusic() { if (mus) { clearInterval(mus.timer); mus = null; } },
  current() { return mus ? mus.name : null; },
  state() { return ctx ? { state: ctx.state, t: +ctx.currentTime.toFixed(2), step: mus && mus.step, music: mus && mus.name } : null; },
  analyse() { if (!ctx) return null; if (!Audio._an) { Audio._an = ctx.createAnalyser(); Audio._an.fftSize = 512; master.connect(Audio._an); } const d = new Uint8Array(Audio._an.fftSize); Audio._an.getByteTimeDomainData(d); let pk = 0; for (const v of d) pk = Math.max(pk, Math.abs(v - 128)); return pk / 128; },
};
