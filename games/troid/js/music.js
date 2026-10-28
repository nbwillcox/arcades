/* Procedural music: a lookahead step sequencer (bass, arpeggio, pad, kick / hat) with one theme per zone plus title, boss, escape and ending. Everything is synthesized with WebAudio; volume follows the Music setting. */
(function (G) {
  'use strict';
  const MU = { cur: null, step: 0, next: 0, timer: null, gain: null };
  G.music = MU;
  const SC = { minor: [0, 2, 3, 5, 7, 8, 10], pent: [0, 3, 5, 7, 10], lyd: [0, 2, 4, 6, 7, 9, 11], phry: [0, 1, 3, 5, 7, 8, 10], maj: [0, 2, 4, 5, 7, 9, 11] };
  /* bass / arp: 16 steps of scale degrees (null = rest); pad: one chord root degree per bar (4 bars); drums: k kick, h hat */
  const T = {
    title: { bpm: 84, root: 45, sc: 'minor', bass: [0, null, null, null, 0, null, 4, null, 0, null, null, null, 3, null, 2, null], arp: [0, 2, 4, 2, 0, 2, 4, 6, 7, 6, 4, 2, 4, 2, 0, null], pad: [0, 5, 3, 4], bw: 'triangle', aw: 'square', pw: 'sine', av: 0.035, drums: 'h.h.h.h.h.h.h.h.' },
    z1: { bpm: 78, root: 45, sc: 'pent', bass: [0, null, null, 0, null, null, 2, null, 0, null, null, 0, null, 3, null, null], arp: [null, 4, null, 2, null, 4, 5, null, null, 4, null, 2, 0, null, 2, null], pad: [0, 3, 2, 0], bw: 'triangle', aw: 'triangle', pw: 'sine', av: 0.04, drums: '................' },
    z2: { bpm: 72, root: 50, sc: 'lyd', bass: [0, null, null, null, null, null, null, null, 4, null, null, null, null, null, null, null], arp: [7, null, 4, null, 6, null, 2, null, 9, null, 7, null, 4, null, 6, null], pad: [0, 4, 3, 5], bw: 'sine', aw: 'sine', pw: 'triangle', av: 0.05, drums: '................' },
    z3: { bpm: 112, root: 40, sc: 'phry', bass: [0, 0, null, 0, 0, null, 1, null, 0, 0, null, 0, 3, null, 1, null], arp: [null, null, 7, null, null, 8, null, null, 7, null, null, 5, null, 3, null, null], pad: [0, 1, 0, 3], bw: 'sawtooth', aw: 'square', pw: 'sawtooth', av: 0.025, drums: 'k.h.kkh.k.h.k.hh' },
    z4: { bpm: 66, root: 47, sc: 'minor', bass: [0, null, null, null, null, null, 0, null, null, null, null, null, 3, null, null, null], arp: [4, null, null, 6, null, null, 7, null, 4, null, null, 2, null, null, 3, null], pad: [0, 5, 2, 4], bw: 'sine', aw: 'sine', pw: 'sine', av: 0.045, drums: '..h...h...h...h.' },
    z5: { bpm: 94, root: 42, sc: 'phry', bass: [0, null, 0, null, 1, null, 0, null, 0, null, 0, null, 4, null, 3, null], arp: [7, 8, null, 7, null, 5, null, null, 8, 7, null, 5, null, 3, 1, null], pad: [0, 1, 4, 3], bw: 'sawtooth', aw: 'triangle', pw: 'square', av: 0.03, drums: 'k...k.h.k..hk.h.' },
    boss: { bpm: 136, root: 43, sc: 'minor', bass: [0, 0, 7, 0, 0, 7, 0, 5, 0, 0, 7, 0, 3, 3, 5, 5], arp: [7, null, 9, 7, 10, null, 9, 7, 7, null, 9, 12, 10, 9, 7, null], pad: [0, 5, 3, 4], bw: 'sawtooth', aw: 'square', pw: 'sawtooth', av: 0.03, drums: 'k.hkk.hkk.hkk.hk' },
    escape: { bpm: 156, root: 38, sc: 'phry', bass: [0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 3, 3, 1, 1], arp: [12, null, 10, null, 12, null, 8, null, 10, null, 8, null, 7, null, 8, 10], pad: [0, 1, 0, 4], bw: 'sawtooth', aw: 'square', pw: 'square', av: 0.028, drums: 'khkhkhkhkhkhkhkk' },
    ending: { bpm: 70, root: 48, sc: 'maj', bass: [0, null, null, null, 4, null, null, null, 5, null, null, null, 3, null, null, null], arp: [0, 2, 4, 7, 4, 2, 0, null, 2, 4, 5, 9, 5, 4, 2, null], pad: [0, 4, 5, 3], bw: 'sine', aw: 'triangle', pw: 'sine', av: 0.05, drums: '................' },
  };
  MU.themes = T; MU.scales = SC;
})((window.SGS = window.SGS || {}));
