/* Tiny synthesized UI sounds. ARC_SFX.play('move'|'ok'|'back'|'launch'|'fav'). Nothing plays until the first user input. */
(function () {
  let ctx = null, muted = false;
  try { muted = localStorage.getItem('arcades.mute') === '1'; } catch (e) {}
  function ac() {
    if (!ctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; ctx = new A(); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, f2, dur, type, vol, delay) {
    const a = ac(); if (!a || muted) return;
    const t = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(vol || .04, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + .02);
  }
  const S = {
    move: () => tone(620, 760, .05, 'square', .025),
    tab: () => tone(420, 640, .08, 'triangle', .05),
    ok: () => { tone(520, 0, .07, 'square', .04); tone(780, 0, .12, 'square', .04, .07); },
    back: () => tone(520, 260, .14, 'triangle', .05),
    fav: () => { tone(880, 0, .06, 'triangle', .05); tone(1320, 0, .12, 'triangle', .05, .06); },
    launch: () => { tone(120, 900, .7, 'sawtooth', .035); tone(60, 480, .7, 'sine', .08); },
  };
  window.ARC_SFX = {
    play(n) { try { S[n] && S[n](); } catch (e) {} },
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem('arcades.mute', m ? '1' : '0'); } catch (e) {} },
    unlock() { ac(); },
  };
})();
