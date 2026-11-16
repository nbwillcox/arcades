// Stick Doosh - comic.js (core): onomatopoeia words, gun streams, rocket trails, speech bubbles, halftone, bursts.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U;
  const INK = '#141018';
  const words = [];
  const streams = {};
  const bubbles = [];
  const patCache = {};

  function cap() {
    const mob = S.Main && S.Main.device && S.Main.device.mobile;
    return mob ? S.C.WORDS_MOBILE : S.C.WORDS_DESK;
  }
  function sizeMul() {
    let m = 1;
    if (S.Save) m *= S.Save.settings.video.wordSize || 1;
    if (S.Game && S.Game.stats && S.Game.stats.loudWords) m *= 1.5;
    return m;
  }
  function font(size) { return 'italic ' + Math.max(6, Math.round(size)) + 'px Bangers, Impact, "Arial Black", sans-serif'; }

  function burstPath(ctx, x, y, r1, r2, n, seed) {
    const rnd = U.rng((seed | 0) + 7);
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * U.TAU + rnd.range(-0.12, 0.12);
      const r = (i % 2 === 0 ? r2 : r1) * rnd.range(0.82, 1.12);
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r * 0.78;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  // draws outlined comic text centred at 0,0 (caller transforms)
  function inkText(ctx, text, size, fill, stroke) {
    ctx.font = font(size);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, size * 0.2);
    ctx.strokeStyle = INK;
    ctx.strokeText(text, size * 0.07, size * 0.09); // drop shadow
    ctx.fillStyle = INK; ctx.fillText(text, size * 0.07, size * 0.09);
    if (stroke && stroke !== INK) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(2, size * 0.26); ctx.strokeText(text, 0, 0); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, size * 0.12); }
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = fill; ctx.fillText(text, 0, 0);
  }

  function popScale(t) {
    if (t < 0.09) return U.lerp(0.25, 1.35, t / 0.09);
    if (t < 0.18) return U.lerp(1.35, 1, (t - 0.09) / 0.09);
    return 1;
  }

  const Comic = S.Comic = {
    INK, font, burst: burstPath, inkText,
    words, bubbles,
    clear() { words.length = 0; bubbles.length = 0; for (const k in streams) delete streams[k]; },
    word(text, x, y, o) {
      o = o || {};
      const size = (o.size || 22) * sizeMul();
      const w = {
        text: String(text), x, y, vx: o.vx || 0, vy: o.vy == null ? -40 : o.vy,
        size, color: o.color || '#ffe14d', stroke: o.stroke || null,
        angle: o.angle == null ? U.rand(-0.25, 0.25) : o.angle,
        life: o.life || 0.7, t: 0, burst: !!o.burst, burstColor: o.burstColor || '#ffffff',
        pop: o.pop !== false, seed: (Math.random() * 1e6) | 0, shake: o.shake || 0, screen: !!o.screen,
      };
      words.push(w);
      while (words.length > cap()) words.shift();
      return w;
    },
    // continuous gun word: call every frame while firing
    stream(key, text, x, y, o) {
      o = o || {};
      let s = streams[key];
      if (!s || s.dead) {
        s = streams[key] = { text: String(text), x, y, dir: o.dir || 1, t: 0, grow: 0, idle: 0, dead: false, fade: 0,
          size: (o.size || 20) * sizeMul(), color: o.color || '#ff4040', stroke: o.stroke || null,
          max: o.max || 16, rate: o.rate || 22, angle: U.rand(-0.12, 0.12), seed: (Math.random() * 1e6) | 0 };
      }
      s.x = x; s.y = y; s.dir = o.dir || s.dir; s.idle = 0; s.text = String(text);
      return s;
    },
    endStream(key) { const s = streams[key]; if (s && !s.dead) { s.dead = true; s.fade = 0.45; } },
    // rocket trail: shot keeps .trail = [{x,y}] (Shots maintains); draws letters along it
    trail(shot) {
      const tr = shot.trail; if (!tr || tr.length < 2) return;
      // drawn in Comic.drawTrail during Shots.draw; kept for API symmetry
    },
    drawTrail(ctx, shot, text) {
      const tr = shot.trail; if (!tr || tr.length < 2) return;
      text = text || 'SHHHHHHHHHHH';
      const sz = 15 * sizeMul();
      ctx.save();
      const n = tr.length;
      // letters: oldest point = 'S', H's toward the rocket
      for (let i = 0; i < n; i++) {
        const p = tr[i];
        const ch = i === 0 ? text[0] : 'H';
        const a = 0.25 + 0.75 * (i / n);
        ctx.globalAlpha = a;
        ctx.save(); ctx.translate(p.x, p.y - 12 + Math.sin(p.t * 9 + i) * 2); ctx.rotate(Math.sin(i * 1.7) * 0.15);
        inkText(ctx, ch, sz * (0.75 + 0.35 * (i / n)), '#e9fbff', null);
        ctx.restore();
      }
      ctx.restore();
    },
    bubble(text, x, y, o) {
      o = o || {};
      if (S.Save && S.Save.settings.audio.bubbles === false && !o.force) return null;
      const key = o.speaker || o.follow || null;
      if (key) for (let i = bubbles.length - 1; i >= 0; i--) if (bubbles[i].key === key) bubbles.splice(i, 1);
      const b = { text: String(text).toUpperCase(), x, y, follow: o.follow || null, life: o.life || 2.4, t: 0, key, color: o.color || '#ffffff', shout: !!o.shout };
      b.lines = wrap(b.text, 20);
      bubbles.push(b);
      while (bubbles.length > 6) bubbles.shift();
      return b;
    },
    update(dt) {
      for (let i = words.length - 1; i >= 0; i--) {
        const w = words[i]; w.t += dt;
        w.x += w.vx * dt; w.y += w.vy * dt; w.vy *= 0.96;
        if (w.t >= w.life) words.splice(i, 1);
      }
      for (const k in streams) {
        const s = streams[k];
        s.t += dt;
        if (s.dead) { s.fade -= dt; if (s.fade <= 0) delete streams[k]; continue; }
        s.idle += dt; s.grow = Math.min(s.max, s.grow + dt * s.rate);
        if (s.idle > 0.14) { s.dead = true; s.fade = 0.45; }
      }
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i]; b.t += dt;
        if (b.follow) { if (b.follow.dead && b.t < b.life - 0.4) b.t = b.life - 0.4; b.x = b.follow.x; b.y = b.follow.y - (b.follow.h || 32) - 14; }
        if (b.t >= b.life) bubbles.splice(i, 1);
      }
    },
    draw(ctx, cam) {
      const x0 = cam ? cam.x - 100 : -1e9, x1 = cam ? cam.x + cam.w + 100 : 1e9;
      // streams
      for (const k in streams) {
        const s = streams[k];
        const n = Math.max(3, Math.floor(s.grow));
        let str = s.text; while (str.length < n) str += s.text; str = str.slice(0, n);
        const a = s.dead ? Math.max(0, s.fade / 0.45) : 1;
        ctx.save(); ctx.globalAlpha = a;
        const sz = s.size, step = sz * 0.52;
        const total = step * (str.length - 1);
        for (let i = 0; i < str.length; i++) {
          // word starts at the muzzle when facing right, ends at the muzzle when facing left
          const off = s.dir > 0 ? i * step : -(total - i * step);
          const jit = Math.sin(s.t * 40 + i * 2.1 + s.seed) * 2.5;
          const grow = 1 + (s.dir > 0 ? i : str.length - 1 - i) * 0.03;
          ctx.save();
          ctx.translate(s.x + off + s.dir * 8, s.y - 10 + jit + off * Math.sin(s.angle) * 0.6);
          ctx.rotate(s.angle + Math.sin(s.t * 30 + i) * 0.08);
          inkText(ctx, str[i], sz * grow, s.color, s.stroke);
          ctx.restore();
        }
        ctx.restore();
      }
      for (const w of words) {
        if (!w.screen && (w.x < x0 || w.x > x1)) continue;
        const sc = w.pop ? popScale(w.t) : 1;
        const fade = w.t > w.life * 0.72 ? Math.max(0, 1 - (w.t - w.life * 0.72) / (w.life * 0.28)) : 1;
        ctx.save();
        ctx.globalAlpha = fade;
        let jx = 0, jy = 0;
        if (w.shake) { jx = U.rand(-w.shake, w.shake); jy = U.rand(-w.shake, w.shake); }
        ctx.translate(w.x + jx, w.y + jy); ctx.rotate(w.angle); ctx.scale(sc, sc);
        if (w.burst) {
          ctx.font = font(w.size);
          const tw = ctx.measureText(w.text).width;
          const r = Math.max(tw * 0.62, w.size * 0.9);
          burstPath(ctx, 0, 0, r * 0.72, r * 1.05, 11, w.seed);
          ctx.fillStyle = w.burstColor; ctx.fill();
          ctx.lineWidth = Math.max(2, w.size * 0.09); ctx.strokeStyle = INK; ctx.stroke();
        }
        inkText(ctx, w.text, w.size, w.color, w.stroke);
        ctx.restore();
      }
      for (const b of bubbles) drawBubble(ctx, b);
    },
    // cached halftone dot pattern
    pattern(ctx, color, dot, gap) {
      const k = color + '|' + dot + '|' + gap;
      if (patCache[k]) return patCache[k];
      if (typeof document === 'undefined') return color;
      const c = document.createElement('canvas');
      const g = Math.max(2, Math.round(gap));
      c.width = c.height = g * 2;
      const x = c.getContext('2d');
      x.fillStyle = color;
      const r = dot / 2;
      x.beginPath(); x.arc(g * 0.5, g * 0.5, r, 0, U.TAU); x.arc(g * 1.5, g * 1.5, r, 0, U.TAU); x.fill();
      patCache[k] = ctx.createPattern(c, 'repeat');
      return patCache[k];
    },
    // caption box (screen space helper for HUD/intro)
    caption(ctx, text, x, y, size, bg, fg, angle) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(angle || 0);
      ctx.font = font(size);
      const tw = ctx.measureText(text).width, pw = tw + size * 0.9, ph = size * 1.35;
      ctx.fillStyle = INK; ctx.fillRect(-pw / 2 + 5, -ph / 2 + 5, pw, ph);
      ctx.fillStyle = bg || '#ffe14d'; ctx.fillRect(-pw / 2, -ph / 2, pw, ph);
      ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = fg || INK;
      ctx.fillText(text, 0, 2);
      ctx.restore();
    },
  };

  function wrap(text, n) {
    const out = []; let line = '';
    for (const w of text.split(' ')) {
      if ((line + ' ' + w).trim().length > n && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
    }
    if (line) out.push(line);
    return out.slice(0, 4);
  }

  function drawBubble(ctx, b) {
    const sz = 12 * Math.min(1.3, sizeMul());
    const fade = b.t > b.life - 0.3 ? Math.max(0, (b.life - b.t) / 0.3) : 1;
    const sc = b.t < 0.12 ? U.easeOutBack(b.t / 0.12) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.font = font(sz);
    let w = 0; for (const l of b.lines) w = Math.max(w, ctx.measureText(l).width);
    const pw = w + 16, ph = b.lines.length * sz * 1.05 + 10;
    const bx = b.x, by = b.y - 12;
    ctx.translate(bx, by); ctx.scale(sc, sc);
    // tail
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(4, 12); ctx.lineTo(8, -2); ctx.closePath();
    ctx.fillStyle = b.color; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.stroke();
    // body
    const x = -pw / 2, y = -ph - 2;
    if (b.shout) { burstPath(ctx, 0, y + ph / 2, Math.max(pw, ph) * 0.55, Math.max(pw, ph) * 0.72, 9, 3); }
    else { roundRect(ctx, x, y, pw, ph, 8); }
    ctx.fillStyle = b.color; ctx.fill(); ctx.stroke();
    ctx.fillStyle = b.color; ctx.fillRect(-5, -3, 12, 3); // hide tail seam
    ctx.fillStyle = INK; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < b.lines.length; i++) ctx.fillText(b.lines[i], 0, y + 5 + sz * 0.55 + i * sz * 1.05);
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  Comic.roundRect = roundRect;
})();
