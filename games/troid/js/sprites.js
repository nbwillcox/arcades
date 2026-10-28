/* Compiles every art grid into canvases once at start-up: hero frames (+ mirrored copies), ball, tiles, enemies. */
(function (G) {
  'use strict';
  const A = G.art, S = {};
  G.sprites = S;
  const flipC = (c) => { const o = document.createElement('canvas'); o.width = c.width; o.height = c.height; const x = o.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return o; };
  const both = (rows, armor, name) => { const s = A.make(rows, armor, name); return { r: s.c, l: flipC(s.c), w: s.w, h: s.h }; };
  S.flipC = flipC;
  S.build = function () {
    /* the hero is painted frames (PNG data URIs in art/heroimg.js, facing right): canvases fill in when each image decodes; the crimson and teal suits are hue-shifted copies.
       ax/axl = feet-centre x for the right/left-facing canvas, ay = feet y, tx/ty = cannon muzzle relative to the feet (right-facing) */
    const HI = A.heroimg, shift = { cobalt: 0, crimson: 150, teal: -48 };
    const recolor = (c, dh) => {
      const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        if (!a[i + 3]) continue;
        const r = a[i] / 255, g = a[i + 1] / 255, b = a[i + 2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), df = mx - mn, l = (mx + mn) / 2;
        if (df < 0.12) continue;
        let h = mx === r ? ((g - b) / df + 6) % 6 : mx === g ? (b - r) / df + 2 : (r - g) / df + 4; h *= 60;
        if (h < 185 || h > 262) continue;                                  /* only the blue armour; orange trim and the visor keep their colours */
        const sat = df / (1 - Math.abs(2 * l - 1)); h = (h + dh + 360) % 360;
        const q = sat * (1 - Math.abs(2 * l - 1)), xx = q * (1 - Math.abs((h / 60) % 2 - 1)), m = l - q / 2; let rr, gg, bb;
        if (h < 60) { rr = q; gg = xx; bb = 0; } else if (h < 120) { rr = xx; gg = q; bb = 0; } else if (h < 180) { rr = 0; gg = q; bb = xx; } else if (h < 240) { rr = 0; gg = xx; bb = q; } else if (h < 300) { rr = xx; gg = 0; bb = q; } else { rr = q; gg = 0; bb = xx; }
        a[i] = (rr + m) * 255; a[i + 1] = (gg + m) * 255; a[i + 2] = (bb + m) * 255;
      }
      x.putImageData(d, 0, 0);
    };
    const heroFrame = (spec, dh) => {
      const mk = () => { const c = document.createElement('canvas'); c.width = spec.w; c.height = spec.h; return c; };
      const f = { r: mk(), l: mk(), w: spec.w, h: spec.h, ax: spec.ax, axl: spec.w - spec.ax, ay: spec.ay, tx: spec.tx || 0, ty: spec.ty || 0 }, im = new Image();
      im.onload = () => {
        f.r.getContext('2d').drawImage(im, 0, 0); if (dh) recolor(f.r, dh);
        const x = f.l.getContext('2d'); x.translate(spec.w, 0); x.scale(-1, 1); x.drawImage(f.r, 0, 0);
      };
      im.src = spec.u;
      return f;
    };
    S.hero = {}; S.heroSpec = HI; S.heroParts = {};
    /* the hero is a painted torso (one per aim angle) on a drawn leg pose: both parts are loaded per suit and composed on demand into one cached frame, so the head, arms and cannon never jump when the legs change */
    const part = (spec, dh) => { const c = document.createElement('canvas'); c.width = spec.w; c.height = spec.h; const f = { c, spec, ok: false }, im = new Image(); im.onload = () => { c.getContext('2d').drawImage(im, 0, 0); if (dh) recolor(c, dh); f.ok = true; }; im.src = spec.u; return f; };
    const CW = 80, CH = 96, HX = 40, HY = 64, poseCache = new Map(), blank = document.createElement('canvas'); blank.width = CW; blank.height = CH;
    S.heroPose = function (suit, tor, leg, ox, oy) {
      const k = suit + '|' + tor + '|' + leg + '|' + ox + '|' + oy, hit = poseCache.get(k); if (hit) return hit;
      const P = S.heroParts[suit], T = P['tor_' + tor], L = P['leg_' + leg]; if (!T || !L) return { r: blank, l: blank, w: CW, h: CH, ax: HX, axl: CW - HX, ay: HY, tx: 0, ty: 0 };      /* an unknown part name draws nothing instead of stopping the frame */
      const g = L.spec.g, ay = HY + g;
      if (!T.ok || !L.ok) return { r: blank, l: blank, w: CW, h: CH, ax: HX, axl: CW - HX, ay, tx: 0, ty: 0 };           /* still decoding: draw nothing this frame */
      const r = document.createElement('canvas'), l = document.createElement('canvas'); r.width = l.width = CW; r.height = l.height = CH;
      const x = r.getContext('2d'); x.drawImage(L.c, Math.round(HX - L.spec.hx), Math.round(HY - L.spec.hy)); x.drawImage(T.c, Math.round(HX + ox - T.spec.hx), Math.round(HY + oy - T.spec.hy));
      const y = l.getContext('2d'); y.translate(CW, 0); y.scale(-1, 1); y.drawImage(r, 0, 0);
      const f = { r, l, w: CW, h: CH, ax: HX, axl: CW - HX, ay, tx: T.spec.tx + ox, ty: T.spec.ty + oy - g }; poseCache.set(k, f); return f;
    };
    for (const suit in shift) {
      const o = {}, P = S.heroParts[suit] = {};
      for (const k in HI) { if (k.indexOf('tor_') === 0 || k.indexOf('leg_') === 0) P[k] = part(HI[k], shift[suit]); else if (k.indexOf('suit_') !== 0) o[k] = heroFrame(HI[k], shift[suit]); }
      Object.defineProperty(o, 'idle', { get: () => S.heroPose(suit, 'r12', 'idle', 0, 0) });
      S.hero[suit] = o;
    }
    const Z = A.zone1, M = A.zone1misc, D = A.zone1deco;
    /* one tileset per zone: the same hand-drawn grids, compiled with that zone's palette (plus zone-specific extras) */
    const tileset = (key, zone) => {
      const mk = (r, n) => A.make(r, key, n).c, t = { edge: {}, diag: {}, slopeR: mk(M.slopeR, 'sr'), slopeL: mk(M.slopeL, 'sl'), spikes: mk(M.spikes, 'sp'), shot: mk(M.blockShot, 'bs'), bomb: mk(M.blockBomb, 'bb'), missile: mk(M.blockMissile, 'bm') };
      for (const m in Z.edge) t.edge[m] = Z.edge[m].map((g, i) => mk(g, 'e' + m + '_' + i));
      for (const d in Z.diag) t.diag[d] = mk(Z.diag[d], 'd' + d);
      t.wall = D.bgWall.map((g, i) => mk(g, 'w' + i)); t.ledge = mk(D.ledge, 'ledge');
      const deco = { rune: D.rune.map((g, i) => mk(g, 'r' + i)), vine: D.vine.map((g, i) => mk(g, 'v' + i)), tuft: mk(D.tuft, 'tuft'), fern: mk(D.fern, 'fern'), rubble: mk(D.rubble, 'rub'), pillar: mk(D.pillar, 'pil') };
      t.mega = mk(M.blockMega, 'mega'); t.wave = mk(A.zone3.wave, 'wave'); t.dashblock = mk(A.zone3.dashblock, 'dblk');
      t.deco = deco; t.top = [[deco.tuft, 3, 7], [deco.fern, 0, 11], [deco.rubble, 0, 7]]; t.hang = deco.vine.map((v) => [v, 4]);
      if (zone === 2) {
        const Z2 = A.zone2; t.ice = mk(Z2.ice, 'ice');
        const cr = Z2.crystal.map((g, i) => mk(g, 'cr' + i)); t.top = [[cr[0], 0, cr[0].height - 1], [cr[1], 4, cr[1].height - 1], [deco.rubble, 0, 7], [deco.tuft, 3, 7]];
        t.hang = Z2.icicle.map((g, i) => { const c = mk(g, 'ic' + i); return [c, 4]; });
      }
      if (zone === 3) { const Z3 = A.zone3; t.lava = Z3.lava.map((g, i) => mk(g, 'lv' + i)); t.lavaTop = Z3.lavaTop.map((g, i) => mk(g, 'lt' + i)); }
      return t;
    };
    S.tilesets = { 1: tileset('world', 1), 2: tileset('world2', 2), 3: tileset('world3', 3), 4: tileset('world4', 4), 5: tileset('world5', 5) }; S.tile = S.tilesets[1].tile || S.tilesets[1]; S.deco = S.tilesets[1].deco;
    S.bg1 = A.buildZone1Bg();                                                  /* only the title screen still uses a parallax backdrop; rooms are black space + back wall */
    S.ship = (() => { const spec = A.shipimg, c = document.createElement('canvas'); c.width = spec.w; c.height = spec.h; const im = new Image(); im.onload = () => c.getContext('2d').drawImage(im, 0, 0); im.src = spec.u; return { c, w: spec.w, h: spec.h, lights: spec.lights }; })();
    /* enemies are painted frames (art/monimg.js, facing right): canvases fill in when each image decodes; the arc emitter is drawn in code */
    S.foe = { arc: [] };
    for (const type in A.monimg) S.foe[type] = A.monimg[type].frames.map((spec) => {
      const mk = () => { const c = document.createElement('canvas'); c.width = spec.w; c.height = spec.h; return c; }, f = { r: mk(), l: mk(), w: spec.w, h: spec.h }, im = new Image();
      im.onload = () => { f.r.getContext('2d').drawImage(im, 0, 0); const x = f.l.getContext('2d'); x.translate(spec.w, 0); x.scale(-1, 1); x.drawImage(im, 0, 0); };
      im.src = spec.u; return f;
    });
    const W1 = A.world1, mkc = (rows, ramp, n) => A.make(rows, ramp, n).c;
    S.door = { blue: W1.door.map((g, i) => mkc(g, 'cobalt', 'db' + i)), red: W1.door.map((g, i) => mkc(g, 'crimson', 'dr' + i)), green: W1.door.map((g, i) => mkc(g, 'teal', 'dg' + i)), boss: W1.door.map((g, i) => mkc(g, 'gold', 'dB' + i)) };
    S.orb = {}; for (const r of ['cobalt', 'crimson', 'teal', 'gold', 'visor']) S.orb[r] = W1.orb.map((g, i) => mkc(g, r, 'orb' + r + i));
    S.tank = { energy: W1.tankEnergy.map((g) => mkc(g, 'cobalt', 'te')), missile: W1.tankMissile.map((g) => mkc(g, 'cobalt', 'tm')), super: W1.tankSuper.map((g) => mkc(g, 'cobalt', 'ts')) };
    const IT = A.items;                                                    /* item art: icons (the object itself), tank pickups, drop icons, shrine statues */
    const II = A.iconimg, icv = (k, glow) => { const c = document.createElement('canvas'); c.width = II.w; c.height = II.h; const im = new Image(); im.onload = () => { const x = c.getContext('2d'); x.drawImage(im, 0, 0); if (glow) { x.globalCompositeOperation = 'lighter'; x.globalAlpha = 0.22; x.drawImage(im, 0, 0); } }; im.src = II.icons[k]; return c; };      /* painted pickup icons; a tank's second frame is a brighter copy so it still blinks */
    S.icon = {}; for (const k in IT.icons) S.icon[k] = icv(k, false);
    S.tank = { energy: [icv('energyTank', false), icv('energyTank', true)], missile: [icv('missileTank', false), icv('missileTank', true)], super: [icv('superTank', false), icv('superTank', true)] };
    S.drop = {}; for (const k in IT.drops) S.drop[k] = IT.drops[k].map((g, i) => mkc(g, IT.dropRamps[k], 'dr' + k + i));
    const stc = (sp) => { const c = document.createElement('canvas'); c.width = sp.w; c.height = sp.h; const im = new Image(); im.onload = () => c.getContext('2d').drawImage(im, 0, 0); im.src = sp.u; return c; };      /* the painted shrine statues: one image per size for every zone, visor and chest jewel glow */
    const SB = A.statueimg, SS = SB.small, sbc = stc(SB), ssc = stc(SS);
    S.statue = { big: {}, small: {}, lights: SB.lights, lightsSmall: SS.lights }; for (let z = 1; z <= 5; z++) { S.statue.big[z] = sbc; S.statue.small[z] = ssc; }
    /* boss sprites are painted frames (PNG data URIs in art/bossimg.js): each canvas fills in when its image decodes; ax, ay = the point that sits at the boss's position */
    const BI = A.bossimg;
    const loadFrame = (spec, flip) => {
      const mk = () => { const c = document.createElement('canvas'); c.width = spec.w; c.height = spec.h; return c; };
      const r = mk(), l = flip ? mk() : null, im = new Image();
      im.onload = () => { r.getContext('2d').drawImage(im, 0, 0); if (l) { const x = l.getContext('2d'); x.translate(spec.w, 0); x.scale(-1, 1); x.drawImage(im, 0, 0); } };
      im.src = spec.u; r.ax = spec.ax; r.ay = spec.ay;
      return flip ? { r, l, w: spec.w, h: spec.h, ax: spec.ax, ay: spec.ay } : r;
    };
    const bb = (sp) => loadFrame(sp, true), bp = (sp) => loadFrame(sp, false), B1 = BI.beetle;
    S.boss = { walk: B1.walk.map(bb), rear: bb(B1.rear), tele: B1.tele.map(bb), charge: B1.charge.map(bb), stun: B1.stun.map(bb), core: B1.core };
    const B2 = BI.moth;
    S.boss2 = { fly: B2.fly.map(bp), shoot: B2.shoot.map(bp), dive: bp(B2.dive), stun: B2.stun.map(bp), dead: bp(B2.dead) };
    const whites = new Map();
    S.whiteOf = (c) => { let w = whites.get(c); if (!w) { w = document.createElement('canvas'); w.width = c.width; w.height = c.height; const x = w.getContext('2d'); x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, w.width, w.height); whites.set(c, w); } return w; };
    const BW = BI.wyrm; S.wyrm = { head: BW.head.map(bb), neck: bp(BW.neck), splash: BW.splash.map(bp) };
    S.jellyBoss = BI.jelly.bell.map(bp);
    S.heart = { body: BI.heart.heart.map(bp), node: BI.heart.node.map(bp) };
    { const CI = A.capsuleimg, cc = document.createElement('canvas'); cc.width = CI.w; cc.height = CI.h; const cim = new Image(); cim.onload = () => cc.getContext('2d').drawImage(cim, 0, 0); cim.src = CI.u; S.capsule = { c: cc, w: CI.w, h: CI.h, glass: CI.glass, lights: CI.lights }; }      /* the save capsule: one painted picture; its cyan lights pulse in world.js */
    { const LI = A.liftimg, lc = document.createElement('canvas'); lc.width = LI.w; lc.height = LI.h; const lim = new Image(); lim.onload = () => lc.getContext('2d').drawImage(lim, 0, 0); lim.src = LI.u; S.lift = { c: lc, w: LI.w, h: LI.h, bay: LI.bay, deck: LI.deck, lights: LI.lights }; }      /* the elevator arch: the hero hops onto its deck to teleport */
    S.portrait = {}; { const PI = A.portraitimg, pim = new Image(); const cs = {}; for (const suit in shift) { const c = document.createElement('canvas'); c.width = PI.w; c.height = PI.h; cs[suit] = c; S.portrait[suit] = c; }
      pim.onload = () => { for (const suit in shift) { cs[suit].getContext('2d').drawImage(pim, 0, 0); if (shift[suit]) recolor(cs[suit], shift[suit]); } }; pim.src = PI.u; }      /* the detailed hero picture for the status screen, tinted per suit */
    S.pad = W1.pad.map((g) => mkc(g, 'cobalt', 'pad')); S.term = W1.terminal.map((g) => mkc(g, 'cobalt', 'term')); S.wreck = mkc(W1.wreck, 'cobalt', 'wreck');
  };
})((window.SGS = window.SGS || {}));
