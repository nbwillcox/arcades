/* A crude astronaut autopilot for the attract mode (and for testing the game headlessly). */
(function (G) {
  'use strict';
  const B = {};
  G.bot = B;
  B.make = function (g) {
    const I = { l: false, r: false, jump: false, blow: false, _j: false, _b: false, takeJump() { const v = this._j; this._j = false; return v; }, takeBlow() { const v = this._b; this._b = false; return v; }, jt: 0, bt: 0, think: 0 };
    I.update = function (dt) {
      const P = g.P; I.l = I.r = I.jump = I.blow = false;
      if (!P || P.dead || g.state !== 'play' && g.state !== 'intro') return;
      I.jt -= dt; I.bt -= dt;
      const feet = P.y, cx = P.x;
      let tgt = null, mode = 'none', best = 1e9;
      for (const b of g.bubbles) if (b.enemy) { const d = Math.hypot(b.x - cx, b.y - feet); if (d < best) { best = d; tgt = b; mode = 'pop'; } }
      if (!tgt) for (const f of g.foes) if (!f.dead && f.state !== 'trapped' && f.state !== 'spawn') { const d = Math.abs(f.x - cx) + Math.abs(f.y - feet) * 1.5; if (d < best) { best = d; tgt = f; mode = 'foe'; } }
      if (!tgt && g.bossObj && !g.bossObj.dying && !g.bossObj.ghost) { const bo = g.bossObj; tgt = { x: bo.x, y: bo.y + bo.hh * 0.6 }; mode = 'foe'; }
      if (!tgt) for (const b of g.bubbles) if (b.kind !== 'air') { tgt = b; mode = 'pop'; break; }
      if (!tgt) return;
      const dx = tgt.x - cx, dy = (tgt.y - (mode === 'foe' ? 0 : 7)) - feet;
      if (mode === 'pop') {
        if (Math.abs(dx) > 5) { I.r = dx > 0; I.l = dx < 0; }
        if (dy < -12 && Math.abs(dx) < 14 && P.ground && I.jt <= 0) { I._j = true; I.jump = true; I.jt = 0.5; }
        if (dy < -14 && Math.abs(dx) >= 14 && P.ground && Math.random() < 0.02) { I._j = true; I.jt = 0.6; }
      } else {
        const same = Math.abs(dy) < 14;
        if (same && Math.abs(dx) < 90) {
          P.face = dx > 0 ? 1 : -1;
          if (Math.abs(dx) > 50) { I.r = dx > 0; I.l = dx < 0; }
          if (I.bt <= 0) { I._b = true; I.blow = true; I.bt = 0.45; }
          if (Math.abs(dx) < 22 && P.ground && I.jt <= 0) { I._j = true; I.jt = 0.5; I.r = dx < 0; I.l = dx > 0; }
        } else {
          I.r = dx > 0; I.l = dx < 0;
          if (dy < -18 && Math.abs(dx) < 70 && P.ground && I.jt <= 0) { I._j = true; I.jump = true; I.jt = 0.7; }
          if (P.ground && g.chaser) { /* keep moving */ }
        }
      }
      if (I.r || I.l) { P.face = I.r ? 1 : -1; }
    };
    return I;
  };
})((window.SGS = window.SGS || {}));
