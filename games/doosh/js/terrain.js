// Stick Doosh - terrain.js (core): destructible tile grid, chunked comic rendering, raycasts, SGS.Phys.
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U, C = S.C;
  const INK = '#141018';
  const T = C.T;

  const MAT = { EMPTY: 0, DIRT: 1, ROCK: 2, STEEL: 3, WOOD: 4, PLAT: 5, LADDER: 6, SPIKES: 7, ICE: 8, BEDROCK: 9, LAVA: 10, WATER: 11, MUD: 12, SAND: 13, CRATE: 14, GLASS: 15, VINE: 16 };
  const INDESTRUCTIBLE = 255;
  const P = [];
  function def(id, o) { P[id] = Object.assign({ solid: false, oneway: false, climb: false, hp: 1, liquid: false, hazard: 0, slippery: false, slow: 0, burn: false, dmgMul: 1 }, o); }
  def(0, { hp: 0 });
  def(1, { solid: true, hp: 3 });
  def(2, { solid: true, hp: 7 });
  def(3, { solid: true, hp: 30, dmgMul: 0.35 });
  def(4, { solid: true, hp: 2, burn: true });
  def(5, { oneway: true, hp: 2, burn: true });
  def(6, { climb: true, hp: 2, burn: true });
  def(7, { hazard: 1, hp: 3 });
  def(8, { solid: true, hp: 4, slippery: true });
  def(9, { solid: true, hp: INDESTRUCTIBLE });
  def(10, { liquid: true, hazard: 1, hp: INDESTRUCTIBLE });
  def(11, { liquid: true, hp: INDESTRUCTIBLE });
  def(12, { solid: true, hp: 2, slow: 0.55 });
  def(13, { solid: true, hp: 2 });
  def(14, { solid: true, hp: 2, burn: true });
  def(15, { solid: true, hp: 1 });
  def(16, { climb: true, hp: 1, burn: true });
  for (let i = 17; i < 256; i++) if (!P[i]) def(i, { solid: true, hp: 3 });

  const DEFAULT_MATS = {
    1: { base: '#c7813f', dark: '#7a4a24', light: '#e9a964', top: '#5fd35f', pattern: 'dirt' },
    2: { base: '#9a96b0', dark: '#5c5970', light: '#c9c5da', top: null, pattern: 'brick' },
    3: { base: '#a8bccf', dark: '#5d7085', light: '#e3edf6', top: null, pattern: 'metal' },
    4: { base: '#d08f4e', dark: '#8b5a2b', light: '#f0bd86', top: null, pattern: 'wood' },
    5: { base: '#d08f4e', dark: '#8b5a2b', light: '#f0bd86', pattern: 'plank' },
    6: { base: '#d6974f', dark: '#8b5a2b', light: '#f0bd86', pattern: 'ladder' },
    7: { base: '#d3dbe6', dark: '#7d8899', light: '#ffffff', pattern: 'spikes' },
    8: { base: '#a8e6ff', dark: '#5fb4e0', light: '#effcff', top: '#ffffff', pattern: 'ice' },
    9: { base: '#3d3754', dark: '#25213a', light: '#5e5780', pattern: 'hatch' },
    10: { base: '#ff6a1a', dark: '#c8200e', light: '#ffe14d', pattern: 'lava' },
    11: { base: '#3bb4ff', dark: '#1f6fd0', light: '#bdeaff', pattern: 'water' },
    12: { base: '#7d5a38', dark: '#4f3820', light: '#a07c52', top: '#5a8a3a', pattern: 'mud' },
    13: { base: '#f0cf7a', dark: '#c49a48', light: '#fff0b8', top: null, pattern: 'dirt' },
    14: { base: '#e0a45c', dark: '#8b5a2b', light: '#ffd29a', pattern: 'crate' },
    15: { base: '#c4f0ff', dark: '#6bbbe0', light: '#ffffff', pattern: 'glass' },
    16: { base: '#43b043', dark: '#24702a', light: '#8ae37a', pattern: 'vine' },
  };

  let tiles = new Uint8Array(1), hp = new Uint8Array(1), back = null, surfArr = null;
  let W = 1, H = 1;
  let bcache = {}, dcache = {}, rebuildBudget = 6;
  // opaque solid = hides whatever is behind it (glass is see-through, so back walls show through glass)
  function opaque(m) { return m !== 0 && P[m].solid && m !== 15; }
  let theme = null;
  let styles = {};
  const breakCbs = [];
  const chunks = new Map();
  const canvasPool = [];
  let rs = 1, retroScale = 0, lastSfx = 0;
  let frameNo = 0;

  function style(m) {
    if (styles[m]) return styles[m];
    const base = DEFAULT_MATS[m] || DEFAULT_MATS[2];
    const tm = theme && theme.mats && theme.mats[m];
    const o = styles[m] = Object.assign({}, base, tm || {});
    const AL = { bricks: 'brick', cracks: 'stone', glowcracks: 'stone', rivets: 'metal', planks: 'wood', shine: 'ice', bubbles: 'mud', blocks: 'hatch', stripes: 'hatch', none: 'plain', dots: 'speckle', speckle: 'speckle' };
    if (AL[o.pattern]) o.pattern = AL[o.pattern];
    return o;
  }

  function idx(tx, ty) { return ty * W + tx; }
  function get(tx, ty) {
    if (!tiles) return MAT.EMPTY;
    if (tx < 0 || tx >= W) return MAT.BEDROCK;
    if (ty < 0 || ty >= H) return MAT.EMPTY;
    return tiles[ty * W + tx];
  }
  function solid(tx, ty) { return P[get(tx, ty)].solid; }

  function markDirty(tx, ty) {
    const CH = C.CHUNK;
    const cx = Math.floor(tx / CH), cy = Math.floor(ty / CH);
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const nx = tx + ox, ny = ty + oy;
      const k = Math.floor(nx / CH) + ',' + Math.floor(ny / CH);
      const c = chunks.get(k); if (c) c.dirty = true;
    }
    const c = chunks.get(cx + ',' + cy); if (c) c.dirty = true;
  }

  const Terrain = S.Terrain = {
    MAT, PROPS: P, DEFAULT_MATS, INDESTRUCTIBLE,
    get W() { return W; }, get H() { return H; },
    get tiles() { return tiles; }, get hp() { return hp; },
    get theme() { return theme; },
    load(level, th) {
      W = level.w; H = level.h;
      tiles = new Uint8Array(level.tiles);
      hp = new Uint8Array(W * H);
      for (let i = 0; i < tiles.length; i++) hp[i] = Math.min(255, P[tiles[i]].hp);
      surfArr = level.surface || null;
      // back = back-wall material per cell (0 = open air). Private copy: destroyed tiles write into it.
      back = level.back ? new Uint8Array(level.back) : (surfArr ? new Uint8Array(W * H) : null);
      theme = th || (S.Game && S.Game.theme) || null;
      styles = {}; bcache = {}; dcache = {};
      for (const c of chunks.values()) { if (c.cv) canvasPool.push(c.cv); if (c.cvB) canvasPool.push(c.cvB); }
      chunks.clear();
    },
    get, solid,
    idx,
    inBounds(tx, ty) { return tx >= 0 && ty >= 0 && tx < W && ty < H; },
    solidPx(x, y) { return P[get(Math.floor(x / T), Math.floor(y / T))].solid; },
    matPx(x, y) { return get(Math.floor(x / T), Math.floor(y / T)); },
    set(tx, ty, m) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return;
      tiles[idx(tx, ty)] = m; hp[idx(tx, ty)] = Math.min(255, P[m].hp);
      markDirty(tx, ty);
    },
    style,
    onBreak(cb) { breakCbs.push(cb); },
    // returns true if the tile broke
    damageTile(tx, ty, dmg, src) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return false;
      const i = idx(tx, ty), m = tiles[i];
      if (!m) return false;
      const pr = P[m];
      if (pr.hp >= INDESTRUCTIBLE || pr.liquid) return false;
      let d = dmg * pr.dmgMul;
      if (src && src.fire && pr.burn) d += 2;
      const left = hp[i] - d;
      if (left > 0.001) {
        hp[i] = Math.max(1, Math.ceil(left));
        markDirty(tx, ty);
        if (pr.dmgMul < 1 && S.FX) S.FX.spark((tx + 0.5) * T, (ty + 0.5) * T, 3, '#ffffff');
        return false;
      }
      tiles[i] = 0; hp[i] = 0;
      // destroyed solid reveals a back wall, never the sky: below the natural surface (carved earth) or next to an interior cell
      if (back && !back[i] && pr.solid) {
        if (surfArr && tx >= 0 && tx < surfArr.length && ty >= surfArr[tx] && m !== MAT.GLASS) back[i] = m === MAT.ICE || m === MAT.SAND || m === MAT.MUD || m === MAT.DIRT || m === MAT.ROCK ? m : MAT.ROCK;
        else if (m !== MAT.GLASS) {
          const nb = (tx > 0 ? back[i - 1] : 0) || (tx < W - 1 ? back[i + 1] : 0) || (ty > 0 ? back[i - W] : 0) || (ty < H - 1 ? back[i + W] : 0);
          if (nb) back[i] = nb;
        }
      }
      markDirty(tx, ty);
      const st = style(m);
      const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
      if (S.FX) {
        if (m === MAT.GLASS) S.FX.spark(cx, cy, 10, '#e0faff');
        else { S.FX.debris(cx, cy, S.Main && S.Main.device && S.Main.device.mobile ? 2 : 4, st.base); S.FX.dust(cx, cy + 6, 2); }
      }
      const now = U.now();
      if (S.Audio && now - lastSfx > 45) { lastSfx = now; S.Audio.sfx(m === MAT.GLASS ? 'glass' : m === MAT.WOOD || m === MAT.CRATE || m === MAT.PLAT ? 'wood' : 'tile', { vol: 0.5, x: cx }); }
      for (const cb of breakCbs) { try { cb(m, tx, ty, src); } catch (e) { console.error(e); } }
      return true;
    },
    // damages tiles in a radius (px); returns tiles broken
    explode(x, y, r, dmg) {
      let n = 0;
      const t0x = Math.floor((x - r) / T), t1x = Math.floor((x + r) / T);
      const t0y = Math.floor((y - r) / T), t1y = Math.floor((y + r) / T);
      for (let ty = t0y; ty <= t1y; ty++) for (let tx = t0x; tx <= t1x; tx++) {
        const d = Math.hypot((tx + 0.5) * T - x, (ty + 0.5) * T - y);
        if (d > r) continue;
        const m = get(tx, ty); if (!m) continue;
        if (Terrain.damageTile(tx, ty, Math.ceil(dmg * (1 - 0.5 * d / r)), { blast: true })) n++;
      }
      return n;
    },
    // DDA ray: first blocking (solid) tile -> {x,y,tx,ty,m} or null
    raycast(x0, y0, x1, y1, opts) {
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy); if (len < 0.0001) return null;
      const ux = dx / len, uy = dy / len;
      let tx = Math.floor(x0 / T), ty = Math.floor(y0 / T);
      const stepX = ux > 0 ? 1 : -1, stepY = uy > 0 ? 1 : -1;
      const tDX = Math.abs(T / (ux || 1e-9)), tDY = Math.abs(T / (uy || 1e-9));
      let tMX = ux > 0 ? ((tx + 1) * T - x0) / ux : ux < 0 ? (tx * T - x0) / ux : Infinity;
      let tMY = uy > 0 ? ((ty + 1) * T - y0) / uy : uy < 0 ? (ty * T - y0) / uy : Infinity;
      let t = 0;
      const block = (m) => P[m].solid || (opts && opts.liquid && P[m].liquid);
      if (block(get(tx, ty))) return { x: x0, y: y0, tx, ty, m: get(tx, ty) };
      for (let i = 0; i < 400; i++) {
        if (tMX < tMY) { t = tMX; tMX += tDX; tx += stepX; } else { t = tMY; tMY += tDY; ty += stepY; }
        if (t > len) return null;
        const m = get(tx, ty);
        if (block(m)) return { x: x0 + ux * t, y: y0 + uy * t, tx, ty, m };
      }
      return null;
    },
    los(x0, y0, x1, y1) { return !Terrain.raycast(x0, y0, x1, y1); },
    // highest empty spot above a solid floor at column x, starting at y going down
    groundBelow(x, y, maxDist) {
      const tx = Math.floor(x / T);
      for (let ty = Math.floor(y / T); ty < Math.min(H, Math.floor((y + (maxDist || 2000)) / T)); ty++) {
        const m = get(tx, ty);
        if (P[m].solid || P[m].oneway) return ty * T;
      }
      return null;
    },

    // ---------------- rendering ----------------
    setScale(scale, retro) {
      const r = retro ? retro : 0;
      if (Math.abs(scale - rs) > 0.001 || r !== retroScale) { rs = scale; retroScale = r; bcache = {}; for (const c of chunks.values()) c.dirty = true; }
    },
    invalidate() { for (const c of chunks.values()) c.dirty = true; },
    // layer: 'back' = back walls only (draw BEFORE deco), 'front' = tiles (draw after deco); omitted = both (legacy)
    draw(ctx, cam, layer) {
      if (layer !== 'front') { frameNo++; rebuildBudget = 6; }
      const CH = C.CHUNK, CW = CH * T;
      const cx0 = Math.max(0, Math.floor(cam.x / CW)), cx1 = Math.min(Math.ceil(W / CH) - 1, Math.floor((cam.x + cam.w) / CW));
      const cy0 = Math.max(0, Math.floor(cam.y / CW)), cy1 = Math.min(Math.ceil(H / CH) - 1, Math.floor((cam.y + cam.h) / CW));
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
        const k = cx + ',' + cy;
        let c = chunks.get(k);
        if (!c) { c = { cv: null, cvB: null, dirty: true, used: 0, cx, cy, empty: false }; chunks.set(k, c); buildChunk(c); }
        else if (c.dirty && (rebuildBudget-- > 0 || (!c.cv && !c.cvB))) buildChunk(c);
        c.used = frameNo;
        if (layer !== 'front' && c.cvB) ctx.drawImage(c.cvB, cx * CW, cy * CW, CW, CW);
        if (layer !== 'back' && !c.empty && c.cv) ctx.drawImage(c.cv, cx * CW, cy * CW, CW, CW);
      }
      if (layer !== 'back' && chunks.size > C.CHUNK_CACHE) evict();
    },
    chunkCount() { return chunks.size; },
  };

  function evict() {
    const arr = [...chunks.entries()].sort((a, b) => a[1].used - b[1].used);
    while (chunks.size > C.CHUNK_CACHE * 0.8 && arr.length) {
      const [k, c] = arr.shift();
      if (c.used === frameNo) break;
      if (c.cv) canvasPool.push(c.cv);
      if (c.cvB) canvasPool.push(c.cvB);
      chunks.delete(k);
    }
  }

  function chunkCanvas(px) {
    let cv = canvasPool.pop();
    if (!cv) cv = document.createElement('canvas');
    if (cv.width !== px || cv.height !== px) { cv.width = px; cv.height = px; }
    return cv;
  }

  function buildChunk(c) {
    const CH = C.CHUNK;
    const tx0 = c.cx * CH, ty0 = c.cy * CH;
    // what does this chunk need? front = any tile; anyB = any back-wall cell not hidden by an opaque solid
    let any = false, anyB = false;
    for (let y = ty0; y < ty0 + CH && y < H; y++) for (let x = tx0; x < tx0 + CH && x < W; x++) {
      const m = tiles[y * W + x];
      if (m) any = true;
      if (back && back[y * W + x] && !opaque(m)) anyB = true;
    }
    c.dirty = false;
    const sc = retroScale || rs;
    const px = Math.max(8, Math.ceil(CH * T * sc));
    const prep = function (key, need) {
      if (!need) { if (c[key]) { canvasPool.push(c[key]); c[key] = null; } return null; }
      if (!c[key]) c[key] = chunkCanvas(px);
      else if (c[key].width !== px) { c[key].width = px; c[key].height = px; }
      const q = c[key].getContext('2d');
      q.setTransform(1, 0, 0, 1, 0, 0);
      q.clearRect(0, 0, px, px);
      q.imageSmoothingEnabled = !retroScale;
      q.setTransform(px / (CH * T), 0, 0, px / (CH * T), 0, 0);
      return q;
    };
    // pass 0 (own canvas, drawn before deco): back walls behind empty / non-opaque cells
    const gb = prep('cvB', anyB);
    if (gb) drawBackWalls(gb, tx0, ty0, CH);
    c.empty = !any;
    const g = prep('cv', any);
    if (!g) return;
    // pass 1: liquids + non-solids behind
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
      const tx = tx0 + x, ty = ty0 + y; if (tx >= W || ty >= H) continue;
      const m = tiles[idx(tx, ty)]; if (!m) continue;
      if (!P[m].solid) drawSoft(g, m, tx, ty, x * T, y * T);
    }
    // pass 2: solids
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
      const tx = tx0 + x, ty = ty0 + y; if (tx >= W || ty >= H) continue;
      const m = tiles[idx(tx, ty)]; if (!m) continue;
      if (P[m].solid) drawSolid(g, m, tx, ty, x * T, y * T);
    }
    // pass 3: ink outlines on exposed edges + caps (drawn last so they sit on top of neighbours)
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
      const tx = tx0 + x, ty = ty0 + y; if (tx >= W || ty >= H) continue;
      const m = tiles[idx(tx, ty)]; if (!m || !P[m].solid) continue;
      drawEdges(g, m, tx, ty, x * T, y * T);
    }
  }

  // ---------------- back walls ----------------
  // Darkened version of the surrounding material with a simple pattern that is periodic in tile coordinates (T = 20 px),
  // so it runs unbroken across cells. Drawn only where the foreground tile is not an opaque solid.
  function backStyle(bm) {
    let b = bcache[bm]; if (b) return b;
    const st = style(bm), retro = !!retroScale;
    let pat = st.pattern;
    if (pat === 'hatch' && bm !== MAT.BEDROCK) pat = 'brick';
    if (pat === 'plank') pat = 'wood';
    if (pat === 'crate') pat = 'wood';
    if (pat === 'pixel' || pat === 'plain' || pat === 'glass' || pat === 'water' || pat === 'lava' || pat === 'vine' || pat === 'ladder' || pat === 'spikes') pat = retro ? 'pixel' : 'dirt';
    b = bcache[bm] = {
      pat,
      fill: retro ? st.dark : U.shade(st.base, -0.62),
      line: retro ? U.shade(st.dark, 0.2) : U.shade(st.base, -0.76),
      hi: retro ? U.shade(st.dark, 0.2) : U.shade(st.base, -0.46),
    };
    return b;
  }

  function drawBackWalls(g, tx0, ty0, CH) {
    const retro = !!retroScale, fire = theme && theme.id === 'fire', lw = retro ? 3 : 2.4;
    g.lineCap = 'butt';
    for (let y = 0; y < CH; y++) for (let x = 0; x < CH; x++) {
      const tx = tx0 + x, ty = ty0 + y; if (tx >= W || ty >= H) continue;
      const i = ty * W + tx, bm = back[i]; if (!bm || opaque(tiles[i])) continue;
      const b = backStyle(bm), px = x * T, py = y * T, h = U.hash(tx, ty, 41);
      g.fillStyle = b.fill; g.fillRect(px, py, T, T);
      g.strokeStyle = b.line; g.fillStyle = b.hi; g.lineWidth = 1.3;
      g.beginPath();
      switch (b.pat) {
        case 'brick':
          g.moveTo(px, py + 0.5); g.lineTo(px + T, py + 0.5); g.moveTo(px, py + 10.5); g.lineTo(px + T, py + 10.5);
          g.moveTo(px + 0.5, py); g.lineTo(px + 0.5, py + 10); g.moveTo(px + 10.5, py + 10); g.lineTo(px + 10.5, py + T);
          g.stroke();
          if (!retro && h < 0.35) { g.globalAlpha = 0.18; g.fillRect(px + 2, py + 2, 7, 6); g.globalAlpha = 1; }
          break;
        case 'wood':
          g.moveTo(px + 0.5, py); g.lineTo(px + 0.5, py + T); g.moveTo(px + 10.5, py); g.lineTo(px + 10.5, py + T);
          g.stroke();
          if (!retro) { g.globalAlpha = 0.5; g.fillStyle = b.line; g.fillRect(px + 3 + h * 4, py + 4 + h * 10, 2, 3); g.globalAlpha = 1; }
          break;
        case 'metal':
          g.moveTo(px, py + 0.5); g.lineTo(px + T, py + 0.5);
          if (!(tx & 1)) { g.moveTo(px + 0.5, py); g.lineTo(px + 0.5, py + T); }
          g.stroke();
          if (!retro && !(tx & 1)) { g.fillStyle = b.hi; g.fillRect(px + 3, py + 3, 2, 2); g.fillRect(px + 3, py + 15, 2, 2); }
          break;
        case 'hatch': {
          const s = (16 - ((tx + ty) * T) % 8) % 8;
          for (let d = s; d < 2 * T; d += 8) { const x1 = Math.min(d, T), x2 = d - x1; g.moveTo(px + x1, py + d - x1); g.lineTo(px + x2, py + x1); }
          g.stroke();
          break;
        }
        case 'ice':
          if (h < 0.5) { g.strokeStyle = b.hi; g.moveTo(px + 3 + h * 8, py + 14); g.lineTo(px + 9 + h * 8, py + 6); g.stroke(); }
          break;
        case 'pixel':
          g.stroke(); g.fillStyle = b.hi; if (h < 0.5) g.fillRect(px + 3 + ((h * 40) | 0) % 12, py + 4 + ((h * 90) | 0) % 12, 3, 3);
          break;
        default: { // rock / dirt: speckles + a hairline crack
          g.stroke(); g.fillStyle = b.line;
          g.beginPath(); g.ellipse(px + 4 + h * 11, py + 5 + U.hash(ty, tx, 5) * 9, 1.9, 1.3, 0, 0, U.TAU); g.ellipse(px + 14 - h * 6, py + 14, 1.4, 1, 0, 0, U.TAU); g.fill();
          if (h > 0.55) { g.strokeStyle = b.line; g.beginPath(); g.moveTo(px + h * 12, py); g.lineTo(px + h * 12 + 4, py + 8); g.lineTo(px + h * 12 - 1, py + 15); g.stroke(); }
          if (!retro && h < 0.3) { g.fillStyle = b.hi; g.beginPath(); g.arc(px + 12, py + 7 + h * 10, 1.1, 0, U.TAU); g.fill(); }
        }
      }
      if (fire && h < 0.14 && !retro) { // faint glowing cracks in basalt
        g.strokeStyle = 'rgba(255,110,30,0.38)'; g.lineWidth = 1.2; g.beginPath();
        g.moveTo(px + 3 + h * 40, py + 2); g.lineTo(px + 8 + h * 40, py + 9); g.lineTo(px + 6 + h * 40, py + 17); g.stroke();
      }
      // contact shadows against opaque neighbours keep shapes readable
      if (!retro) {
        g.fillStyle = 'rgba(8,6,14,0.26)';
        if (ty > 0 && opaque(tiles[i - W])) g.fillRect(px, py, T, 5);
        if (tx > 0 && opaque(tiles[i - 1])) g.fillRect(px, py, 3, T);
        if (tx < W - 1 && opaque(tiles[i + 1])) g.fillRect(px + T - 3, py, 3, T);
      }
      // clear ink line where the back wall meets open air (neighbour has neither back wall nor an opaque tile)
      const oL = tx > 0 && !back[i - 1] && !opaque(tiles[i - 1]), oR = tx < W - 1 && !back[i + 1] && !opaque(tiles[i + 1]);
      const oU = ty > 0 && !back[i - W] && !opaque(tiles[i - W]), oD = ty < H - 1 && !back[i + W] && !opaque(tiles[i + W]);
      if (oL || oR || oU || oD) {
        const q = lw / 2;
        g.strokeStyle = INK; g.lineWidth = lw; g.lineCap = 'square'; g.beginPath();
        if (oL) { g.moveTo(px + q, py); g.lineTo(px + q, py + T); }
        if (oR) { g.moveTo(px + T - q, py); g.lineTo(px + T - q, py + T); }
        if (oU) { g.moveTo(px, py + q); g.lineTo(px + T, py + q); }
        if (oD) { g.moveTo(px, py + T - q); g.lineTo(px + T, py + T - q); }
        g.stroke(); g.lineCap = 'butt';
      }
    }
  }

  function drawSolid(g, m, tx, ty, x, y) {
    const st = style(m);
    const h = U.hash(tx, ty, m);
    const retro = !!retroScale;
    if (m === MAT.GLASS) {
      g.fillStyle = U.rgba(st.base, 0.55); g.fillRect(x, y, T, T);
      g.strokeStyle = st.light; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 4, y + 14); g.lineTo(x + 14, y + 4); g.stroke();
      g.strokeStyle = INK; g.lineWidth = 1.6; g.strokeRect(x + 0.8, y + 0.8, T - 1.6, T - 1.6);
      return;
    }
    // deep strata get a little darker (quantised, cached) so deep rock never reads washed-out and sits apart from the back wall
    let base = st.base;
    if (surfArr && !retro && (m === MAT.DIRT || m === MAT.ROCK || m === MAT.SAND || m === MAT.MUD) && tx >= 0 && tx < surfArr.length) {
      const q = Math.min(4, Math.max(0, Math.floor((ty - surfArr[tx] - 5) / 5)));
      if (q > 0) { const k = m * 8 + q; base = dcache[k] || (dcache[k] = U.shade(st.base, -0.065 * q)); }
    }
    g.fillStyle = h < 0.33 ? U.shade(base, -0.05) : h > 0.75 ? U.shade(base, 0.05) : base;
    g.fillRect(x, y, T, T);
    let pat = st.pattern;
    if (pat === 'hatch' && m !== MAT.BEDROCK) pat = 'brick';   // carved blocks instead of pale diagonal hatching (e.g. jungle temple stone)
    if (!retro) {
      // halftone shade on lower part
      g.fillStyle = S.Comic ? S.Comic.pattern(g, U.rgba(st.dark, 0.55), 1.7, 4) : st.dark;
      g.fillRect(x, y + T * 0.55, T, T * 0.45);
    }
    g.strokeStyle = st.dark; g.fillStyle = st.dark; g.lineWidth = 1.3;
    switch (pat) {
      case 'brick': {
        const off = (ty % 2) ? T / 2 : 0;
        g.beginPath(); g.moveTo(x, y + T / 2); g.lineTo(x + T, y + T / 2);
        g.moveTo(x + (off ? 0 : T / 2), y); g.lineTo(x + (off ? 0 : T / 2), y + T / 2);
        g.moveTo(x + (off ? T / 2 : 0), y + T / 2); g.lineTo(x + (off ? T / 2 : 0), y + T);
        g.stroke();
        g.strokeStyle = st.light; g.beginPath(); g.moveTo(x + 1, y + 1.5); g.lineTo(x + T - 2, y + 1.5); g.stroke();
        break;
      }
      case 'stone': {
        g.beginPath(); g.moveTo(x, y + 7 + h * 6); g.lineTo(x + T, y + 9 + h * 4); g.moveTo(x + 6 + h * 8, y); g.lineTo(x + 8 + h * 5, y + 8 + h * 5); g.stroke();
        break;
      }
      case 'metal': {
        g.strokeStyle = st.dark; g.strokeRect(x + 1.5, y + 1.5, T - 3, T - 3);
        g.fillStyle = st.light;
        for (const [a, b] of [[4, 4], [T - 4, 4], [4, T - 4], [T - 4, T - 4]]) { g.beginPath(); g.arc(x + a, y + b, 1.4, 0, U.TAU); g.fill(); }
        break;
      }
      case 'wood': case 'crate': {
        if (pat === 'crate') {
          g.lineWidth = 1.6; g.strokeRect(x + 2, y + 2, T - 4, T - 4);
          g.beginPath(); g.moveTo(x + 3, y + 3); g.lineTo(x + T - 3, y + T - 3); g.moveTo(x + T - 3, y + 3); g.lineTo(x + 3, y + T - 3); g.stroke();
        } else {
          g.beginPath(); g.moveTo(x, y + 7); g.lineTo(x + T, y + 7); g.moveTo(x, y + 14); g.lineTo(x + T, y + 14); g.stroke();
          g.beginPath(); g.moveTo(x + 4 + h * 10, y + 2); g.lineTo(x + 6 + h * 10, y + 5); g.stroke();
        }
        break;
      }
      case 'ice': {
        g.strokeStyle = st.light; g.lineWidth = 1.8;
        g.beginPath(); g.moveTo(x + 3 + h * 4, y + 12); g.lineTo(x + 10 + h * 4, y + 4); g.moveTo(x + 9 + h * 3, y + 15); g.lineTo(x + 13 + h * 3, y + 10); g.stroke();
        break;
      }
      case 'mud': {
        g.fillStyle = st.light; g.beginPath(); g.arc(x + 5 + h * 10, y + 6 + h * 4, 1.8, 0, U.TAU); g.arc(x + 13 - h * 4, y + 13, 1.2, 0, U.TAU); g.fill();
        break;
      }
      case 'hatch': {
        g.beginPath(); for (let k = -T; k < T; k += 6) { g.moveTo(x + k, y + T); g.lineTo(x + k + T, y); } g.stroke();
        break;
      }
      case 'pixel': {
        g.fillStyle = st.light; g.fillRect(x, y, T, 2); g.fillRect(x, y, 2, T);
        g.fillStyle = st.dark; g.fillRect(x, y + T - 2, T, 2); g.fillRect(x + T - 2, y, 2, T);
        break;
      }
      case 'plain': break;
      default: { // dirt-like speckles
        g.beginPath();
        g.ellipse(x + 4 + h * 11, y + 5 + U.hash(ty, tx, 3) * 9, 1.8, 1.2, 0, 0, U.TAU);
        g.ellipse(x + 14 - h * 6, y + 13, 1.3, 1, 0, 0, U.TAU);
        g.fill();
        g.fillStyle = st.light; g.beginPath(); g.arc(x + 10 + h * 6, y + 8, 1.1, 0, U.TAU); g.fill();
      }
    }
    // cracks
    const maxhp = P[m].hp;
    if (maxhp < INDESTRUCTIBLE) {
      const cur = hp[idx(tx, ty)];
      const dmg = 1 - cur / maxhp;
      if (dmg > 0.05) {
        g.strokeStyle = INK; g.lineWidth = 1.2;
        g.beginPath();
        const n = dmg > 0.6 ? 3 : dmg > 0.3 ? 2 : 1;
        for (let k = 0; k < n; k++) {
          const a = U.hash(tx, ty, k + 9) * U.TAU;
          g.moveTo(x + T / 2, y + T / 2);
          g.lineTo(x + T / 2 + Math.cos(a) * 5, y + T / 2 + Math.sin(a) * 5);
          g.lineTo(x + T / 2 + Math.cos(a + 0.5) * 9, y + T / 2 + Math.sin(a + 0.5) * 9);
        }
        g.stroke();
      }
    }
  }

  function drawEdges(g, m, tx, ty, x, y) {
    const st = style(m);
    const up = get(tx, ty - 1), dn = get(tx, ty + 1), lf = get(tx - 1, ty), rt = get(tx + 1, ty);
    const sU = P[up].solid && up !== MAT.GLASS, sD = P[dn].solid && dn !== MAT.GLASS, sL = P[lf].solid && lf !== MAT.GLASS, sR = P[rt].solid && rt !== MAT.GLASS;
    const lw = retroScale ? 2 : 2.6, h = lw / 2;
    g.strokeStyle = INK; g.lineWidth = lw; g.lineCap = 'square';
    g.beginPath();
    if (!sU) { g.moveTo(x, y + h); g.lineTo(x + T, y + h); }
    if (!sD) { g.moveTo(x, y + T - h); g.lineTo(x + T, y + T - h); }
    if (!sL) { g.moveTo(x + h, y); g.lineTo(x + h, y + T); }
    if (!sR) { g.moveTo(x + T - h, y); g.lineTo(x + T - h, y + T); }
    g.stroke();
    // thin seams between different solid materials
    g.lineWidth = 1; g.beginPath();
    if (sU && up !== m) { g.moveTo(x, y + 0.5); g.lineTo(x + T, y + 0.5); }
    if (sL && lf !== m) { g.moveTo(x + 0.5, y); g.lineTo(x + 0.5, y + T); }
    g.stroke();
    // top cap (grass/snow) when exposed to air
    const hasCap = theme && theme.mats ? !!st.cap : !!st.top;
    if (!sU && st.top && hasCap && !P[up].liquid) {
      const hh = U.hash(tx, ty, 77);
      g.fillStyle = st.top;
      g.beginPath(); g.moveTo(x - 0.5, y);
      g.lineTo(x + T + 0.5, y); g.lineTo(x + T + 0.5, y + 5);
      for (let k = 4; k >= 0; k--) g.lineTo(x + k * 5, y + (k % 2 ? 4 : 7 + hh * 2));
      g.closePath(); g.fill();
      g.strokeStyle = INK; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(x + T + 0.5, y + 5); for (let k = 4; k >= 0; k--) g.lineTo(x + k * 5, y + (k % 2 ? 4 : 7 + hh * 2)); g.stroke();
      g.lineWidth = lw; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + T, y + h); g.stroke();
      if (!sL) { g.lineWidth = lw; g.beginPath(); g.moveTo(x + h, y); g.lineTo(x + h, y + 7); g.stroke(); }
      if (!sR) { g.lineWidth = lw; g.beginPath(); g.moveTo(x + T - h, y); g.lineTo(x + T - h, y + 7); g.stroke(); }
    } else if (!sU && !retroScale) {
      g.strokeStyle = st.light; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x + 2, y + 3.5); g.lineTo(x + T - 2, y + 3.5); g.stroke();
    }
  }

  function drawSoft(g, m, tx, ty, x, y) {
    const st = style(m);
    g.lineCap = 'round';
    switch (m) {
      case MAT.PLAT: {
        g.fillStyle = st.base; g.fillRect(x, y, T, 6);
        g.strokeStyle = st.light; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y + 1.6); g.lineTo(x + T, y + 1.6); g.stroke();
        g.strokeStyle = INK; g.lineWidth = 1.8; g.strokeRect(x, y + 0.9, T, 5.2);
        if (!P[get(tx, ty + 1)].solid && (tx % 3 === 0)) { g.lineWidth = 1.6; g.beginPath(); g.moveTo(x + 4, y + 6); g.lineTo(x + 10, y + 12); g.stroke(); }
        break;
      }
      case MAT.LADDER: {
        g.strokeStyle = INK; g.lineWidth = 4.2;
        g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + 4, y + T); g.moveTo(x + 16, y); g.lineTo(x + 16, y + T);
        for (const ry of [4, 11, 18]) { g.moveTo(x + 4, y + ry); g.lineTo(x + 16, y + ry); } g.stroke();
        g.strokeStyle = st.base; g.lineWidth = 2;
        g.beginPath(); g.moveTo(x + 4, y); g.lineTo(x + 4, y + T); g.moveTo(x + 16, y); g.lineTo(x + 16, y + T);
        for (const ry of [4, 11, 18]) { g.moveTo(x + 4, y + ry); g.lineTo(x + 16, y + ry); } g.stroke();
        break;
      }
      case MAT.VINE: {
        g.strokeStyle = INK; g.lineWidth = 4;
        g.beginPath(); g.moveTo(x + 10, y); g.quadraticCurveTo(x + 4, y + 10, x + 10, y + T); g.stroke();
        g.strokeStyle = st.base; g.lineWidth = 2.2;
        g.beginPath(); g.moveTo(x + 10, y); g.quadraticCurveTo(x + 4, y + 10, x + 10, y + T); g.stroke();
        g.fillStyle = st.light; g.strokeStyle = INK; g.lineWidth = 1;
        for (const [a, b, s] of [[5, 6, -1], [11, 14, 1]]) { g.beginPath(); g.ellipse(x + a + s * 3, y + b, 3.5, 2, s * 0.6, 0, U.TAU); g.fill(); g.stroke(); }
        break;
      }
      case MAT.SPIKES: {
        g.fillStyle = st.base; g.strokeStyle = INK; g.lineWidth = 1.6; g.lineJoin = 'round';
        g.beginPath();
        for (let k = 0; k < 3; k++) { g.moveTo(x + k * 6.67, y + T); g.lineTo(x + k * 6.67 + 3.33, y + 7); g.lineTo(x + (k + 1) * 6.67, y + T); }
        g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = st.light; g.lineWidth = 1; g.beginPath(); for (let k = 0; k < 3; k++) { g.moveTo(x + k * 6.67 + 3.3, y + 9); g.lineTo(x + k * 6.67 + 2.2, y + 15); } g.stroke();
        break;
      }
      case MAT.WATER: case MAT.LAVA: {
        const water = m === MAT.WATER;
        const surf = get(tx, ty - 1) !== m && !P[get(tx, ty - 1)].solid;
        g.fillStyle = water ? U.rgba(st.base, st.alpha || 0.5) : st.base;
        g.fillRect(x, y + (surf ? 4 : 0), T, T - (surf ? 4 : 0));
        if (!water) {
          g.fillStyle = st.light; const h = U.hash(tx, ty, 5);
          g.beginPath(); g.arc(x + 4 + h * 12, y + 10 + h * 6, 1.8 + h * 1.5, 0, U.TAU); g.fill();
          g.fillStyle = S.Comic ? S.Comic.pattern(g, U.rgba(st.dark, 0.6), 1.8, 4) : st.dark; g.fillRect(x, y + 12, T, T - 12);
        }
        if (surf) {
          g.fillStyle = water ? U.rgba(st.light, 0.8) : st.light;
          g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x + 5, y + 1, x + 10, y + 4); g.quadraticCurveTo(x + 15, y + 7, x + 20, y + 4); g.lineTo(x + 20, y + 7); g.lineTo(x, y + 7); g.fill();
          g.strokeStyle = INK; g.lineWidth = 1.6;
          g.beginPath(); g.moveTo(x, y + 4); g.quadraticCurveTo(x + 5, y + 1, x + 10, y + 4); g.quadraticCurveTo(x + 15, y + 7, x + 20, y + 4); g.stroke();
        }
        break;
      }
      default: break;
    }
  }

  // ---------------- physics ----------------
  function oneWayAt(e, tx, ty) {
    const m = get(tx, ty), pr = P[m];
    if (pr.oneway) return true;
    if (pr.climb && !e.climbing && !e.wantDown && !P[get(tx, ty - 1)].climb) return true; // top of ladder acts like a platform
    return false;
  }

  function moveX(e, dx) {
    if (!dx) return;
    const nx = e.x + dx;
    const edge = dx > 0 ? nx + e.w / 2 : nx - e.w / 2;
    const tx = Math.floor(edge / T);
    const r0 = Math.floor((e.y - e.h + 0.5) / T), r1 = Math.floor((e.y - 0.5) / T);
    let blockRows = 0, lowestOnly = true;
    for (let ty = r0; ty <= r1; ty++) if (solid(tx, ty)) { blockRows++; if (ty !== r1) lowestOnly = false; }
    if (!blockRows) { e.x = nx; return; }
    // auto step-up over a single tile ledge
    if (e.stepUp && e.onGround && lowestOnly) {
      const ny = r1 * T; let clear = true;
      const c0 = Math.floor((nx - e.w / 2 + 0.5) / T), c1 = Math.floor((nx + e.w / 2 - 0.5) / T);
      for (let ty = Math.floor((ny - e.h + 0.5) / T); ty < r1; ty++) for (let cx = c0; cx <= c1; cx++) if (solid(cx, ty)) clear = false;
      if (clear) { e.y = ny; e.x = nx; e.stepped = true; return; }
    }
    if (dx > 0) e.x = tx * T - e.w / 2 - 0.01; else e.x = (tx + 1) * T + e.w / 2 + 0.01;
    e.vx = 0; e.hitWall = dx > 0 ? 1 : -1;
  }

  function moveY(e, dy) {
    if (!dy) return;
    const c0 = Math.floor((e.x - e.w / 2 + 0.5) / T), c1 = Math.floor((e.x + e.w / 2 - 0.5) / T);
    if (dy > 0) {
      const ny = e.y + dy;
      const row = Math.floor((ny - 0.01) / T);
      const oldRow = Math.floor((e.y - 0.01) / T);
      if (row !== oldRow || e.y % T === 0) {
        for (let cx = c0; cx <= c1; cx++) {
          if (solid(cx, row) || (!e.drop && oneWayAt(e, cx, row) && e.y <= row * T + 0.5)) {
            e.y = row * T; e.vy = 0; e.onGround = true; return;
          }
        }
      }
      e.y = ny;
    } else {
      const ny = e.y + dy;
      const row = Math.floor((ny - e.h) / T);
      let blocked = 0, which = 0;
      for (let cx = c0; cx <= c1; cx++) if (solid(cx, row)) { blocked++; which = cx; }
      if (blocked) {
        // corner correction: nudge past a ledge corner if we only clip it a little
        if (blocked === 1 && c0 !== c1) {
          const l = e.x - e.w / 2, r = e.x + e.w / 2;
          if (which === c0 && (c0 + 1) * T - l < 6) { e.x += (c0 + 1) * T - l + 0.1; e.y = ny; return; }
          if (which === c1 && r - c1 * T < 6) { e.x -= r - c1 * T + 0.1; e.y = ny; return; }
        }
        e.y = (row + 1) * T + e.h + 0.01; e.vy = 0; e.bonk = true; return;
      }
      e.y = ny;
    }
  }

  function sense(e) {
    const top = e.y - e.h, bot = e.y;
    // wall contact
    e.wall = 0;
    const r0 = Math.floor((top + 3) / T), r1 = Math.floor((bot - 3) / T);
    const lx = Math.floor((e.x - e.w / 2 - 1.5) / T), rx = Math.floor((e.x + e.w / 2 + 1.5) / T);
    let wl = false, wr = false;
    for (let ty = r0; ty <= r1; ty++) { if (solid(lx, ty)) wl = true; if (solid(rx, ty)) wr = true; }
    e.wallL = wl; e.wallR = wr;
    e.wall = wr && wl ? (e.facing || 1) : wr ? 1 : wl ? -1 : 0;
    // ground material
    const gm = get(Math.floor(e.x / T), Math.floor((bot + 1) / T));
    e.groundMat = e.onGround ? gm : 0;
    e.slippery = e.onGround && P[gm].slippery;
    e.slow = e.onGround ? P[gm].slow : 0;
    // liquids / hazards / ladders
    const midM = get(Math.floor(e.x / T), Math.floor((bot - e.h * 0.45) / T));
    e.inLiquid = P[midM].liquid; e.liquid = e.inLiquid ? midM : 0;
    if (!e.inLiquid && S.Phys.liquidHook && S.Phys.liquidHook(e)) { e.inLiquid = true; e.liquid = MAT.WATER; }
    e.hazard = 0;
    const c0 = Math.floor((e.x - e.w / 2 + 2) / T), c1 = Math.floor((e.x + e.w / 2 - 2) / T);
    for (let ty = Math.floor((top + 2) / T); ty <= Math.floor((bot - 1) / T); ty++) for (let cx = c0; cx <= c1; cx++) {
      const m = get(cx, ty); if (P[m].hazard) { e.hazard = m; }
    }
    const ladM = get(Math.floor(e.x / T), Math.floor((bot - 6) / T));
    const ladM2 = get(Math.floor(e.x / T), Math.floor((bot - e.h * 0.6) / T));
    e.ladder = P[ladM].climb || P[ladM2].climb;
    e.ladderBelow = P[get(Math.floor(e.x / T), Math.floor((bot + 2) / T))].climb;
    e.fellOut = bot > H * T + 80;
  }

  S.Phys = {
    move(e, dt) {
      const g = (e.grav == null ? 1 : e.grav) * ((S.Game && S.Game.grav) || 1);
      if (!e.noGrav) e.vy += C.GRAV * g * dt * (e.inLiquid ? 0.35 : 1);
      const maxFall = e.inLiquid ? 150 : (e.maxFall || C.MAX_FALL);
      if (e.vy > maxFall) e.vy = maxFall;
      e.hitWall = 0; e.bonk = false; e.stepped = false;
      if (e.noTerrain) { e.x += e.vx * dt; e.y += e.vy * dt; e.onGround = false; return; }
      if (e.zoneT > 0) e.zoneT -= dt;
      let dx = e.vx * dt * (e.zoneT > 0 && e.zoneSlow ? e.zoneSlow : 1), dy = e.vy * dt;
      const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / (T * 0.4)));
      dx /= steps; dy /= steps;
      const wasGround = e.onGround;
      let ground = false;
      for (let i = 0; i < steps; i++) {
        e.onGround = ground || (i === 0 && wasGround);
        moveX(e, dx);
        e.onGround = false;
        moveY(e, dy);
        if (e.onGround) { ground = true; dy = 0; }
        else if (e.bonk && dy < 0) dy = 0;
      }
      e.onGround = ground;
      // standing check (no downward motion this frame)
      if (!e.onGround && e.vy >= 0) {
        const row = Math.floor((e.y + 0.5) / T);
        if (Math.abs(e.y - row * T) < 0.6) {
          const c0 = Math.floor((e.x - e.w / 2 + 0.5) / T), c1 = Math.floor((e.x + e.w / 2 - 0.5) / T);
          for (let cx = c0; cx <= c1; cx++) if (solid(cx, row) || (!e.drop && oneWayAt(e, cx, row))) { e.onGround = true; e.y = row * T; break; }
        }
      }
      sense(e);
    },
    sense,
    // free spot test for an AABB at x,y (feet)
    free(x, y, w, h) {
      const c0 = Math.floor((x - w / 2 + 0.5) / T), c1 = Math.floor((x + w / 2 - 0.5) / T);
      const r0 = Math.floor((y - h + 0.5) / T), r1 = Math.floor((y - 0.5) / T);
      for (let ty = r0; ty <= r1; ty++) for (let cx = c0; cx <= c1; cx++) if (solid(cx, ty)) return false;
      return true;
    },
  };
})();
