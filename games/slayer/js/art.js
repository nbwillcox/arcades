/* Procedural pixel-art + bitmap font + backgrounds. Any PNG listed in assets/manifest.json overrides the procedural sprite (nearest-neighbour). */
(function () {
  var A = CS.art = { spr: {}, tiles: [], tcache: {}, tcount: 0, loaded: 0 };
  var SC = 2; // art pixel -> virtual pixel

  /* ---------- 5x7 bitmap font ---------- */
  var F = {
    A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30], E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16],
    G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17], I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
    M: [17, 27, 21, 21, 17, 17, 17], N: [17, 17, 25, 21, 19, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16], Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17],
    S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4], U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 21, 10], X: [17, 17, 10, 4, 10, 17, 17],
    Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
    0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [31, 2, 4, 2, 1, 17, 14], 4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14],
    6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8], 8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
    '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], ':': [0, 12, 12, 0, 12, 12, 0], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4], '-': [0, 0, 0, 31, 0, 0, 0],
    '+': [0, 4, 4, 31, 4, 4, 0], '%': [24, 25, 2, 4, 8, 19, 3], '/': [1, 2, 2, 4, 8, 8, 16], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], "'": [4, 4, 8, 0, 0, 0, 0],
    '*': [0, 21, 14, 31, 14, 21, 0], '=': [0, 0, 31, 0, 31, 0, 0], '<': [2, 4, 8, 16, 8, 4, 2], '>': [8, 4, 2, 1, 2, 4, 8], '_': [0, 0, 0, 0, 0, 0, 31], '#': [10, 10, 31, 10, 31, 10, 10],
    '[': [14, 8, 8, 8, 8, 8, 14], ']': [14, 2, 2, 2, 2, 2, 14], '|': [4, 4, 4, 4, 4, 4, 4], '^': [4, 10, 17, 0, 0, 0, 0], '&': [12, 18, 20, 8, 21, 18, 13], '~': [0, 0, 8, 21, 2, 0, 0], ' ': [0, 0, 0, 0, 0, 0, 0]
  };
  A.textW = function (s, sc) { return s.length * 6 * (sc || 1) - (sc || 1); };
  A.text = function (ctx, s, x, y, col, sc, al, shadow) {
    s = ('' + s).toUpperCase(); sc = sc || 1; col = col || '#fff';
    var key = sc + col + (shadow ? 1 : 0) + s, c = A.tcache[key];
    if (!c) {
      if (A.tcount > 1800) { A.tcache = {}; A.tcount = 0; }
      c = document.createElement('canvas'); var w = s.length * 6 * sc + sc, h = 8 * sc + sc; c.width = w; c.height = h; var g = c.getContext('2d');
      for (var pass = shadow ? 0 : 1; pass < 2; pass++) {
        g.fillStyle = pass === 0 ? 'rgba(0,0,0,.85)' : col; var off = pass === 0 ? sc : 0;
        for (var i = 0; i < s.length; i++) { var gl = F[s[i]] || F['?']; for (var r = 0; r < 7; r++) for (var b = 0; b < 5; b++) if (gl[r] & (16 >> b)) g.fillRect(i * 6 * sc + b * sc + off, r * sc + off, sc, sc); }
      }
      A.tcache[key] = c; A.tcount++;
    }
    x = Math.round(x); y = Math.round(y);
    if (al === 'center') x -= (s.length * 6 * sc - sc) >> 1; else if (al === 'right') x -= s.length * 6 * sc - sc;
    ctx.drawImage(c, x, y);
  };

  /* ---------- grid sprites ---------- */
  function grid(rows, pal, w, h) {
    w = w || rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0); h = rows.length;
    var c = document.createElement('canvas'); c.width = w; c.height = h; var g = c.getContext('2d');
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) { var ch = rows[y][x]; if (ch && ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }
    return c;
  }
  function reg(key, canvas, scale) { var s = scale || SC; A.spr[key] = { c: canvas, w: canvas.width, h: canvas.height, fw: canvas.width, frames: 1, dw: canvas.width * s, dh: canvas.height * s, white: null, proc: true }; }
  function hex(c, f) { var n = parseInt(c.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; r = Math.min(255, r * f) | 0; g = Math.min(255, g * f) | 0; b = Math.min(255, b * f) | 0; return '#' + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1); }
  function tint(c, a) { var n = parseInt(c.slice(1), 16), r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; r += (255 - r) * a; g += (255 - g) * a; b += (255 - b) * a; return '#' + (1 << 24 | (r | 0) << 16 | (g | 0) << 8 | (b | 0)).toString(16).slice(1); }
  A.hex = hex; A.tint = tint;

  function makeSprites() {
    reg('gunner', grid([
      '......hhhh......', '.....hhhhhh.....', '.....hvvvvh.....', '.....hhhhhh.....', '....kkkkkkkk....', '...kkcckkcckk...', '..akkcckkcckkgg.', '..aakkkkkkkkgGg.',
      '..aakkkkkkkk.gg.', '...kkkkkkkkk....', '...kkkkkkkkk....', '...kkk..kkk.....', '...kkk..kkk.....', '...bbb..bbb.....', '..bbbb..bbbb....'], { h: '#3a3f55', v: '#27e6ff', k: '#8a6440', c: '#5a3f26', a: '#27e6ff', g: '#b8c0d0', G: '#ffb347', b: '#1b1b24' }, 16));
    reg('engineer', grid([
      '.....hhhhhh.....', '....hhhhhhhh....', '....gwwhhwwg....', '....hsssssh.....', '.....ssssss.....', '..BBeeeeeeee....', '.BBBeeqeeqeeb...', '.BoBeeeeeeeeb...',
      '.BBBeeeeeeeb....', '..BBeeeeeeee....', '....ee..ee......', '....ee..ee......', '....nn..nn......', '...nnn..nnn.....'], { h: '#7a4a1e', g: '#ffcc33', w: '#9fffff', s: '#e8b894', B: '#3a4a5a', o: '#ffcc33', e: '#2fbf86', q: '#ffcc33', b: '#2a7a5a', n: '#222233' }, 16));
    reg('priest', grid([
      '.....yyyyyy.....', '.....y....y.....', '.....yyyyyy.....', '.....ssssss.....', '.....sdssds.....', '....rrrrrrrr....', '...rrgrrrrgrr...', '..rrrgrrrrgrrp..', '..rrrrrrrrrrrp..',
      '..rrrrgggrrrrp..', '..rrrrrrrrrrrp..', '..rrrrrrrrrrrp..', '..rrrrrrrrrrrp..', '...rrrrrrrrrr...', '....nn...nn.....'], { y: '#ffe44d', s: '#f0c8a8', d: '#27e6ff', r: '#3b2a6e', g: '#ffe44d', p: '#9fb4ff', n: '#222233' }, 16));
    reg('skeleton', grid([
      '...wwwwww...', '..wwwwwwww..', '..wrrwwrrw..', '..wrrwwrrw..', '..wwwwwwww..', '...w.ww.w...', '..gwwwwwwgc.', '..gwgwwgwgc.', '..gwwwwwwgc.', '...gwwwwg...', '...ww..ww...', '..ww....ww..'],
      { w: '#cfd6e6', g: '#6f7a99', r: '#ff2a2a', c: '#27e6ff' }));
    reg('ghost', grid([
      '....cccc....', '...cCCCCc...', '..cCCCCCCc..', '..cCkCCkCc..', '..cCCCCCCc..', '...cCkkCc...', '....cccc....', '.rr.gggg.rr.', 'rrr.goog.rrr', '.rr.gggg.rr.', '....g..g....', '...r....r...'],
      { c: '#2fa7c8', C: '#9fefff', k: '#0a2a3a', g: '#555d77', o: '#ff4fd8', r: '#9fb4ff' }));
    reg('hound', grid([
      '..........wwww..', '.....wwwwwwwrw..', '..wwwgwgwgwwww..', '.wwgwwwwwwwwwww.', 'gw.gwwwwwwgw.gw.', 'g..g........g.g.', 'g..g........g.g.', 'gg.gg......gg.gg'],
      { w: '#d6d2c8', g: '#7a8090', r: '#ff2a2a' }));
    reg('lich', grid([
      '....pppppp....', '...pppppppp...', '..ppwwwwwwpp..', '..pwwrwwrwwp..', '..pwwwwwwwwp..', '..ppwwkkwwpp..', '...pppppppp...', '..pppppoopppp.', '.ppppoOOoppppp', '.ppppoOOopppp.', '..pppppoopppp.',
      '..pppppppppp..', '.pppp.pp.pppp.', '.pp..pppp..pp.', 'p....pppp....p', '......pp......'], { p: '#4a2a7a', w: '#d6d2c8', r: '#ff2a2a', k: '#222', o: '#8a1aff', O: '#e07bff' }));
    reg('golem', grid([
      '....gggggggggg....', '...gGGGGGGGGGGg...', '...gGrrGGGGrrGg...', '...gGrrGGGGrrGg...', '..ggGGGGGGGGGGgg..', '.ggGGGggggggGGGgg.', 'ggGGGGgOOOOgGGGGgg', 'gGGGGGgOooOgGGGGGg', 'gGGGGGgOOOOgGGGGGg',
      'ggGGGGggggggGGGGgg', '.ggGGGGGGGGGGGGgg.', '..ggGGGGGGGGGGgg..', '...gggGGGGGGggg...', '...gGGGg..gGGGg...', '...gGGGg..gGGGg...', '..ggGGGg..gGGGgg..', '..gggggg..gggggg..'],
      { g: '#4a3020', G: '#8a5a3a', r: '#ff3030', O: '#ff7a1a', o: '#ffd35a' }));
    reg('banshee', grid([
      '....pppp....', '...pPPPPp...', '..pPwPPwPp..', '..pPPkkPPp..', '..pPPkkPPp..', '...pPPPPp...', '..pppPPppp..', '.pppPPPPppp.', 'pp.ppPPpp.pp', 'p..pppppp..p', '...pp..pp...', '..p..pp..p..', '..p......p..'],
      { p: '#7a2a9a', P: '#d48bff', w: '#fff', k: '#14001f' }));
    reg('drone', grid(['.rr......rr.', 'rrrr.gg.rrrr', '.rr.gGGg.rr.', '....gOOg....', '.rr.gGGg.rr.', 'rrrr.gg.rrrr', '.rr......rr.'], { r: '#9fb4ff', g: '#3a4a5a', G: '#6a7a8a', O: '#4dffb0' }));
    /* minion sprites per class colour */
    var MG = {
      vanguard: ['..hhhh....', '.hhvvhh...', '.hhhhhh...', '..cccc.s..', '.ccAAcc.s.', 'ccAAAAcc.s', '.cccccc...', '.cc..cc...', '.bb..bb...', '.bb..bb...'],
      sniper: ['...hhh....', '..hvvhh...', '..hhhhh...', '.ccccc.gg.', 'ccAAAcgggg', 'ccAAAcggG.', '.ccccc....', '.cc.cc....', '.bb.bb....', '.bb.bb....'],
      aegis: ['...AAAA...', '..AwwwwA..', '.AwAAAAwA.', '.AwAhhAwA.', '.AwAhhAwA.', '.AwAAAAwA.', '..AwwwwA..', '...AAAA...', '..........', '..........'],
      detonator: ['..........', '...rrrr...', '..rRRRRr..', '.rRRwwRRr.', '.rRRwwRRr.', '..rRRRRr..', '...rrrr...', '..b....b..', '..........', '..........'],
      giant: ['....hhhhhh....', '...hhvvvvhh...', '...hhhhhhhh...', '.ccccccccccc..', 'ccAAAAAAAAAcc.', 'ccAAwwwwAAAcc.', 'ccAAwOOwAAAcgg', 'ccAAwwwwAAAcgG', '.ccAAAAAAAcc..', '.ccccccccccc..', '..cccc..cccc..', '..cccc..cccc..', '..bbbb..bbbb..', '.bbbbb..bbbbb.']
    };
    ['gunner', 'engineer', 'priest'].forEach(function (cl) {
      var C = CS.CLASSES[cl];
      for (var k in MG) reg('mn_' + k + '_' + cl, grid(MG[k], { h: '#3a3f55', v: C.c2, c: hex(C.c, 0.6), A: C.c, s: '#b8c0d0', g: '#b8c0d0', G: C.c2, b: '#1b1b24', w: '#fff', r: C.c, R: tint(C.c, 0.4), O: C.c2 }));
    });
    /* loot / shots */
    reg('coin', grid(['..yyyy..', '.yYYYYy.', 'yYYwYYYy', 'yYYwYYYy', 'yYYYYYYy', 'yYYYYYYy', '.yYYYYy.', '..yyyy..'], { y: '#c98a00', Y: '#ffd700', w: '#fff6a0' }));
    reg('scrap', grid(['..gggg..', '.gccccg.', 'gcc..ccg', 'gc.OO.cg', 'gc.OO.cg', 'gcc..ccg', '.gccccg.', '..gggg..'], { g: '#5a6a80', c: '#9fb4d0', O: '#27e6ff' }));
    reg('health', grid(['.wwwwww.', 'wrrwwrrw', 'wrrwwrrw', 'wwwwwwww', 'wwwwwwww', 'wrrwwrrw', 'wrrwwrrw', '.wwwwww.'].map(function (r) { return r; }), { w: '#e8fff0', r: '#ff3b5c' }));
    reg('magnet', grid(['rr....ww', 'rr....ww', 'rr....ww', 'rr....ww', 'rrr..www', '.rrrwww.', '..rrww..', '........'], { r: '#ff3b5c', w: '#e8eaff' }));
    reg('chest', grid(['..yyyyyyyyyy..', '.yYYYYYYYYYYy.', 'yYYggggggggYYy', 'yYggYYYYYYggYy', 'yyyyyyoooyyyyy', 'yYYYYYyOoyYYYy', 'yYYYYYyoyyYYYy', 'yYYYYYYYYYYYYy', 'yYYYYYYYYYYYYy', '.yyyyyyyyyyyy.'],
      { y: '#8a5a00', Y: '#ffd700', g: '#27e6ff', o: '#fff6a0', O: '#ff4fd8' }), 3);
    reg('shot_slug', grid(['..yyyyyy', 'ywwwwwww', '..yyyyyy'], { y: '#ffb347', w: '#fff6d0' }));
    reg('shot_plasma', grid(['.cc.', 'cwwc', 'cwwc', '.cc.'], { c: '#4dffb0', w: '#e8fff6' }));
    reg('shot_orb', grid(['..mmmm..', '.mMMMMm.', 'mMwwwwMm', 'mMwwwwMm', 'mMwwwwMm', 'mMwwwwMm', '.mMMMMm.', '..mmmm..'], { m: '#ff2a9a', M: '#ff7ad0', w: '#fff' }));
    reg('shot_saw', grid(['...cc...', '..cwwc..', '.cwGGwc.', 'cwGppGwc', 'cwGppGwc', '.cwGGwc.', '..cwwc..', '...cc...'].map(function (r) { return r; }), { c: '#6a7aa0', w: '#c9d6ff', G: '#27e6ff', p: '#0a1030' }));
    reg('shot_bolt', grid(['.yy.', 'ywwy', 'ywwy', '.yy.'], { y: '#ffe44d', w: '#ffffff' }));
  }

  /* ---------- bosses ---------- */
  var BR = {
    mech: [[7, 1, 5, 5, 'k'], [8, 2, 4, 3, 'm'], [9, 3, 3, 1, 'e'], [3, 6, 9, 8, 'k'], [4, 7, 8, 6, 'm'], [8, 8, 4, 4, 'a'], [0, 5, 4, 5, 'k'], [1, 6, 2, 3, 'a'], [1, 10, 3, 9, 'k'], [2, 11, 1, 7, 'm'], [0, 18, 4, 3, 'a'], [5, 14, 4, 8, 'k'], [6, 15, 2, 6, 'm'], [4, 21, 6, 2, 'k']],
    lich: [[6, 2, 6, 5, 'k'], [7, 3, 5, 3, 'm'], [8, 4, 3, 2, 'w'], [9, 5, 1, 1, 'e'], [3, 7, 9, 4, 'k'], [4, 8, 8, 2, 'm'], [2, 11, 10, 7, 'k'], [3, 12, 9, 5, 'm'], [0, 17, 12, 5, 'k'], [1, 18, 11, 3, 'm'], [8, 10, 4, 4, 'a'], [9, 11, 2, 2, 'w'], [0, 4, 2, 14, 'a']],
    angel: [[8, 3, 4, 5, 'k'], [9, 4, 3, 3, 'l'], [10, 5, 2, 1, 'e'], [7, 8, 5, 9, 'k'], [8, 9, 4, 7, 'm'], [9, 11, 3, 3, 'a'], [1, 3, 6, 2, 'a'], [0, 5, 7, 2, 'a'], [0, 7, 7, 2, 'k'], [1, 9, 6, 2, 'a'], [2, 11, 5, 2, 'a'], [3, 13, 4, 2, 'k'], [6, 0, 6, 1, 'l'], [8, 17, 4, 5, 'm'], [9, 18, 2, 4, 'a']],
    beast: [[7, 2, 5, 5, 'k'], [8, 3, 4, 3, 'm'], [9, 4, 3, 1, 'e'], [4, 0, 3, 5, 'a'], [2, 0, 2, 3, 'a'], [2, 7, 10, 8, 'k'], [3, 8, 9, 6, 'm'], [4, 9, 2, 1, 'l'], [4, 11, 2, 1, 'l'], [4, 13, 2, 1, 'l'], [0, 8, 3, 10, 'k'], [1, 9, 1, 8, 'm'], [0, 17, 3, 4, 'a'], [4, 15, 5, 7, 'k'], [5, 16, 3, 5, 'm'], [3, 21, 6, 2, 'k']],
    core: [[8, 1, 4, 3, 'a'], [6, 2, 2, 2, 'a'], [4, 3, 2, 2, 'a'], [6, 4, 6, 6, 'k'], [7, 5, 5, 4, 'm'], [9, 6, 3, 2, 'e'], [2, 9, 10, 9, 'k'], [3, 10, 9, 7, 'm'], [7, 11, 5, 5, 'a'], [9, 12, 3, 3, 'w'], [0, 8, 3, 3, 'a'], [0, 12, 4, 8, 'k'], [1, 13, 2, 6, 'm'], [3, 17, 9, 5, 'k'], [4, 18, 8, 3, 'm']]
  };
  function boss(key, style, col, S, eye) {
    var c = document.createElement('canvas'); c.width = c.height = S; var g = c.getContext('2d'), k = S / 24;
    var P = { k: '#120c1c', m: hex(col, 0.45), a: col, l: tint(col, 0.5), e: eye || '#ff2a2a', w: '#ffffff' };
    BR[style].forEach(function (r) {
      g.fillStyle = P[r[4]]; var x0 = Math.round(r[0] * k), y0 = Math.round(r[1] * k), x1 = Math.round((r[0] + r[2]) * k), y1 = Math.round((r[1] + r[3]) * k);
      g.fillRect(x0, y0, x1 - x0, y1 - y0); g.fillRect(S - x1, y0, x1 - x0, y1 - y0);
    });
    reg(key, c); return c;
  }
  function makeBosses() {
    CS.MIDBOSSES.forEach(function (m, i) { boss('mb_' + i, m.st, m.c, 32); });
    CS.STAGES.forEach(function (s, i) { boss('boss_' + i, s.boss.st, s.pal[2], i === 9 ? 60 : 48, i === 9 ? '#ffe44d' : '#ff2a2a'); });
  }

  /* ---------- tile backgrounds (256x256 seamless) ---------- */
  var TS = 256;
  function mkTile(i) {
    var st = CS.STAGES[i], pal = st.pal, c = document.createElement('canvas'); c.width = c.height = TS; var g = c.getContext('2d'), s = i * 977 + 13;
    function rnd() { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }
    g.fillStyle = pal[0]; g.fillRect(0, 0, TS, TS);
    g.fillStyle = hex(pal[1], 0.6);
    for (var y = 0; y < TS; y += 32) for (var x = 0; x < TS; x += 32) if (((x + y) >> 5) & 1) g.fillRect(x, y, 32, 32);
    g.fillStyle = pal[1]; for (x = 0; x < TS; x += 32) g.fillRect(x, 0, 1, TS); for (y = 0; y < TS; y += 32) g.fillRect(0, y, TS, 1);
    function wrap(fn) { for (var ox = -TS; ox <= TS; ox += TS) for (var oy = -TS; oy <= TS; oy += TS) fn(ox, oy); }
    var th = [0, 1, 0, 2, 3, 4, 5, 6, 7, 8][i], n, k;
    if (th === 0 || th === 5) { // circuit traces
      g.globalAlpha = 0.55; for (n = 0; n < 26; n++) { var px = (rnd() * 8 | 0) * 32 + 16, py = (rnd() * 8 | 0) * 32 + 16, len = (2 + rnd() * 4 | 0) * 32, hz = rnd() < 0.5; g.fillStyle = n % 3 ? pal[1] : hex(pal[2], 0.7);
        wrap(function (ox, oy) { if (hz) g.fillRect(px + ox, py + oy, len, 2); else g.fillRect(px + ox, py + oy, 2, len); g.fillRect(px + ox - 2, py + oy - 2, 6, 6); }); }
      g.globalAlpha = 1;
    } else if (th === 1) { // rivet plates + hazard stripes
      g.fillStyle = hex(pal[2], 0.5); for (n = 0; n < 40; n++) { px = rnd() * TS | 0; py = rnd() * TS | 0; wrap(function (ox, oy) { g.fillRect(px + ox, py + oy, 3, 3); }); }
      g.globalAlpha = 0.5; g.fillStyle = pal[2]; for (n = 0; n < 5; n++) { px = (rnd() * 8 | 0) * 32; py = (rnd() * 8 | 0) * 32; for (k = 0; k < 32; k += 8) g.fillRect(px + k, py + 28, 4, 4); } g.globalAlpha = 1;
    } else if (th === 2) { // data glyph columns
      g.globalAlpha = 0.5; for (n = 0; n < 60; n++) { px = rnd() * TS | 0; py = rnd() * TS | 0; g.fillStyle = rnd() < 0.2 ? pal[3] : pal[2]; wrap(function (ox, oy) { g.fillRect(px + ox, py + oy, 2, 2 + (rnd() * 8 | 0)); }); } g.globalAlpha = 1;
    } else if (th === 3) { // stars + hull seams
      for (n = 0; n < 90; n++) { px = rnd() * TS | 0; py = rnd() * TS | 0; g.fillStyle = rnd() < 0.3 ? pal[3] : pal[2]; g.globalAlpha = 0.3 + rnd() * 0.5; g.fillRect(px, py, 1 + (rnd() < 0.15), 1 + (rnd() < 0.15)); } g.globalAlpha = 1;
    } else if (th === 4) { // stained-glass diamonds
      g.globalAlpha = 0.35; for (n = 0; n < 14; n++) { px = (rnd() * 8 | 0) * 32 + 16; py = (rnd() * 8 | 0) * 32 + 16; g.fillStyle = [pal[2], pal[3], '#46a0ff'][n % 3]; wrap(function (ox, oy) { g.beginPath(); g.moveTo(px + ox, py + oy - 14); g.lineTo(px + ox + 10, py + oy); g.lineTo(px + ox, py + oy + 14); g.lineTo(px + ox - 10, py + oy); g.fill(); }); } g.globalAlpha = 1;
    } else if (th === 6) { // blobs (swamp / flesh)
      g.globalAlpha = 0.35; for (n = 0; n < 30; n++) { px = rnd() * TS | 0; py = rnd() * TS | 0; var rr = 3 + rnd() * 9; g.fillStyle = n % 2 ? pal[1] : hex(pal[2], 0.5); wrap(function (ox, oy) { g.fillRect(px + ox - rr, py + oy - rr / 2, rr * 2, rr); }); } g.globalAlpha = 1;
    } else if (th === 7) { // ice cracks
      g.globalAlpha = 0.5; g.fillStyle = pal[2]; for (n = 0; n < 20; n++) { px = rnd() * TS | 0; py = rnd() * TS | 0; var dx = rnd() < 0.5 ? 1 : -1; wrap(function (ox, oy) { for (var q = 0; q < 14; q++) g.fillRect(px + ox + q * dx, py + oy + (q >> 1), 1, 1); }); } g.globalAlpha = 1;
    } else { // void rings / citadel
      g.globalAlpha = 0.4; g.strokeStyle = pal[2]; for (n = 0; n < 7; n++) { px = rnd() * TS | 0; py = rnd() * TS | 0; var r2 = 8 + rnd() * 30; wrap(function (ox, oy) { g.beginPath(); g.arc(px + ox, py + oy, r2, 0, 6.3); g.stroke(); }); } g.globalAlpha = 1;
    }
    return c;
  }
  A.tile = function (i) { return A.tiles[i] || (A.tiles[i] = mkTile(i)); };

  /* ---------- icons ---------- */
  A.icon = function (id) {
    var cl = (CS.save && CS.save.d && CS.save.d.cls) || '', v = A.spr['icon_' + id + '_' + cl]; if (v) return v;
    var key = 'icon_' + id, s = A.spr[key];
    if (s) return s;
    var it = CS.ITEMS[id], c = document.createElement('canvas'); c.width = c.height = 24; var g = c.getContext('2d');
    g.fillStyle = '#0b0f1c'; g.fillRect(0, 0, 24, 24); g.fillStyle = hex(it.c, 0.35); g.fillRect(2, 2, 20, 20); g.fillStyle = it.c; g.fillRect(2, 2, 20, 1); g.fillRect(2, 21, 20, 1); g.fillRect(2, 2, 1, 20); g.fillRect(21, 2, 1, 20);
    var gl = F[it.ico] || F['?']; g.fillStyle = '#fff'; for (var r = 0; r < 7; r++) for (var b = 0; b < 5; b++) if (gl[r] & (16 >> b)) g.fillRect(6 + b * 2, 5 + r * 2, 2, 2);
    g.fillStyle = it.c; for (r = 0; r < 7; r++) for (b = 0; b < 5; b++) if (gl[r] & (16 >> b)) g.fillRect(6 + b * 2, 5 + r * 2 + 1, 2, 1);
    reg(key, c, 1); return A.spr[key];
  };
  A.drawIcon = function (ctx, id, x, y, sc) { var s = A.icon(id); sc = sc || 1; if (!s.proc) { ctx.fillStyle = A.hex(CS.ITEMS[id].c, 0.32); ctx.fillRect(Math.round(x), Math.round(y), 24 * sc, 24 * sc); } ctx.drawImage(s.c, 0, 0, s.fw, s.h, Math.round(x), Math.round(y), 24 * sc, 24 * sc); };

  /* soft radial glow sprites (cached per colour) for additive blending */
  var GL = {};
  A.glow = function (col) {
    var g = GL[col]; if (g) return g; var c = document.createElement('canvas'); c.width = c.height = 32; var x = c.getContext('2d'), rg = x.createRadialGradient(16, 16, 1, 16, 16, 16);
    rg.addColorStop(0, col); rg.addColorStop(0.35, A.hex(col, 0.55)); rg.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = rg; x.fillRect(0, 0, 32, 32); GL[col] = c; return c;
  };
  var VIG = null;
  A.vignette = function () {
    if (VIG) return VIG; VIG = document.createElement('canvas'); VIG.width = CS.W; VIG.height = CS.H; var x = VIG.getContext('2d'), rg = x.createRadialGradient(CS.W / 2, CS.H / 2, CS.H * 0.45, CS.W / 2, CS.H / 2, CS.W * 0.62);
    rg.addColorStop(0, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(0,0,10,0.55)'); x.fillStyle = rg; x.fillRect(0, 0, CS.W, CS.H); return VIG;
  };

  /* ---------- draw helpers ---------- */
  function white(s) { var c = document.createElement('canvas'); c.width = s.c.width; c.height = s.c.height; var g = c.getContext('2d'); g.drawImage(s.c, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); s.white = c; return c; }
  function flipped(c) { var f = document.createElement('canvas'); f.width = c.width; f.height = c.height; var g = f.getContext('2d'); g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0); return f; }
  A.draw = function (ctx, key, x, y, flip, flash, sc, rot, alpha) {
    var s = A.spr[key]; if (!s) return;
    var img, dw = s.dw * (sc || 1), dh = s.dh * (sc || 1), fr = s.frames > 1 ? Math.floor(CS.t * 8) % s.frames : 0;
    if (flip && !rot) { // cached mirrored sheet: no save/restore per sprite
      if (flash) { if (!s.fwhite) s.fwhite = flipped(s.white || white(s)); img = s.fwhite; } else { if (!s.fc) s.fc = flipped(s.c); img = s.fc; }
      fr = s.frames > 1 ? s.frames - 1 - fr : 0; flip = false;
    } else img = flash ? (s.white || white(s)) : s.c;
    var sx = fr * s.fw; x = Math.round(x); y = Math.round(y);
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); if (flip) ctx.scale(-1, 1); ctx.drawImage(img, sx, 0, s.fw, s.h, -dw / 2, -dh / 2, dw, dh); ctx.restore(); }
    else ctx.drawImage(img, sx, 0, s.fw, s.h, x - (dw >> 1), y - (dh >> 1), dw, dh);
    if (alpha !== undefined && alpha < 1) ctx.globalAlpha = 1;
  };

  /* ---------- manifest loader: PNG overrides ---------- */
  A.init = function () { makeSprites(); makeBosses(); };
  A.load = function () {
    return fetch('assets/manifest.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (m) {
      var jobs = [], k, Q = m.ver ? '?v=' + m.ver : '';
      Object.keys(m.sprites || {}).forEach(function (key) {
        var e = m.sprites[key], file = typeof e === 'string' ? e : e.file, frames = (e && e.frames) || 1, scale = e && e.scale;
        jobs.push(new Promise(function (res) {
          var im = new Image(); im.onload = function () {
            var old = A.spr[key], cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; cv.getContext('2d').drawImage(im, 0, 0);
            var fw = im.width / frames, dw = old ? old.dw : fw, dh = dw * im.height / fw; if (scale) { dw = fw * scale; dh = im.height * scale; }
            var tm = key.match(/^tile_(\d)$/); if (tm) { A.tiles[+tm[1]] = cv; res(); return; }
            if (key === 'title_bg') { A.titleBg = cv; res(); return; }
            A.spr[key] = { c: cv, w: im.width, h: im.height, fw: im.width / frames, frames: frames, dw: dw, dh: dh, white: null, fc: null, fwhite: null, proc: false }; A.loaded++; res();
          }; im.onerror = function () { res(); }; im.src = file + Q;
        }));
      });
      Object.keys(m.audio || {}).forEach(function (key) { jobs.push(CS.audio.loadSample(key, m.audio[key] + Q)); });
      return Promise.all(jobs);
    }).catch(function () { });
  };
})();
