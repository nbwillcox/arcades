/* The rules: the marker on the lattice, drawing and closing trails, prowlers, border crawlers, the fuse, power-ups, bosses and levels. */
(function (G) {
  'use strict';
  const U = G.U, C = G.C, S = G.settings, FX = G.fx, A = G.audio, I = G.input, Pics = G.pics, Field = G.Field, Art = G.art;
  const G0 = G.debug || {};
  const { DX, DY, OPP } = Field;
  const CELL = C.CELL;

  const Game = {
    demo: true, phase: 'demo', time: 0, level: 1, score: 0, lives: 3, F: null, pic: null, claimC: null, borderC: null, p: null,
    prowlers: [], crawlers: [], items: [], bolts: [], fuse: null, target: 65, nextLife: C.EXTRA_LIFE, onOver: null, banner: '', bannerT: 0, phaseT: 0, flash: 0, boss: null, rnd: Math.random,
  };
  const fx = (cx) => C.PX + cx * CELL, fy = (cy) => C.PY + cy * CELL;                     /* lattice vertex -> canvas */
  Game.vx = fx; Game.vy = fy;
  const cellOf = (x, y) => [Math.floor((x - C.PX) / CELL), Math.floor((y - C.PY) / CELL)];

  /* ---------- setup ---------- */
  Game.reset = function (demo) {
    Game.demo = !!demo; Game.score = 0; Game.lives = C.START_LIVES; Game.nextLife = C.EXTRA_LIFE; Game.time = 0; FX.reset();
    Game.startLevel(demo ? 1 : (G0.level || 1));
    if (demo) Game.demoSetup();
    Game.phase = demo ? 'demo' : 'ready';
  };

  Game.startLevel = function (level) {
    Game.level = level;
    const boss = level % 5 === 0 && !Game.demo;
    Game.isBoss = boss;
    Game.target = boss ? 75 : Math.min(80, Math.round(65 + 1.5 * (level - 1)));
    if (!Game.F) Game.F = new Field(C.NX, C.NY); else Game.F.reset();
    Game.pic = Pics.make((level - 1) % Pics.count);
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    Game.claimC = mk(C.FW * 2, C.FH * 2); Game.borderC = mk(C.FW * 2, C.FH * 2);
    Game.picInfo = C.PICS[(level - 1) % C.PICS.length];
    Game.rebuildBorder();
    Game.p = { x: Math.floor(C.NX / 2), y: C.NY, sx: Math.floor(C.NX / 2), sy: C.NY, dir: 0, drawing: false, mode: 1, stepT: 0, idleT: 0, lastDir: 0, shield: 0, speedT: 0, inv: 1.5, dead: false, freeze: 0, doubleT: 0 };
    Game.prowlers = []; Game.crawlers = []; Game.items = []; Game.bolts = []; Game.fuse = null; Game.itemT = 6; Game.flash = 0;
    const L = level;
    const n = boss ? 1 : L < 6 ? 1 : L < 15 ? 2 : 3;
    for (let i = 0; i < n; i++) Game.addProwler(boss);
    Game.boss = boss ? { skin: ((L / 5 - 1) % 3 + 3) % 3, boltT: 3 } : null;
    const nc = Math.min(5, 2 + Math.floor(L / 4));
    for (let i = 0; i < nc; i++) Game.addCrawler(i);
    for (let i = 0; i < (boss ? 3 : 2); i++) Game.addItem();
    Game.phase = Game.demo ? 'demo' : 'ready'; Game.phaseT = 2.0;
    Game.banner = boss ? 'BOSS: ' + C.BOSSES[Game.boss.skin].name : 'LEVEL ' + level; Game.bannerT = 2.0;
    if (!Game.demo) A.sfx.ready();
  };

  Game.addProwler = function (boss) {
    const F = Game.F, L = Game.level;
    const cx = C.NX / 2 + U.rand(-12, 12), cy = C.NY * 0.4 + U.rand(-10, 10);
    Game.prowlers.push({
      x: fx(cx), y: fy(cy), head: Math.random() * U.TAU, turn: 0, rot: Math.random() * U.TAU, spin: U.rand(-3, 3), boss: !!boss,
      len: boss ? 46 : 34 + Math.min(14, L), speed: Math.min(190, (boss ? 78 : 82) + 5 * L), hist: [], histT: 0, lines: boss ? 3 : 1, region: F.regionAt(Math.round(cx), Math.round(cy)), bad: 0, hue: Math.random() * 360, eff: 1,
    });
  };

  Game.addCrawler = function (i) {
    const F = Game.F, L = Game.level;
    const corners = [[0, 0, 4], [C.NX, 0, 3], [C.NX, C.NY, 2], [0, C.NY, 1], [C.NX / 2, 0, 4]];
    const c = corners[i % corners.length];
    Game.crawlers.push({ x: c[0], y: c[1], dir: c[2], stepT: 0, speed: Math.min(38, 20 + 1.2 * L), wait: 2.5 + i * 0.8, ph: Math.random() * 6 });
  };

  Game.addItem = function () {
    const F = Game.F, c = F.randomOpenCell(Math.random, 8);
    if (!c) return;
    const r = Math.random() * 100;
    const type = r < 28 ? 'F' : r < 52 ? 'H' : r < 76 ? 'S' : r < 94 ? 'B' : 'L';
    Game.items.push({ cx: c[0], cy: c[1], type, t: 0 });
  };

  /* ---------- painting the claimed area ---------- */
  Game.paintCells = function (cells, mode) {
    const cx = Game.claimC.getContext('2d'), nx = C.NX, K = CELL * 2;
    let i = 0;
    while (i < cells.length) {
      const row = (cells[i] / nx) | 0, x0 = cells[i] % nx;
      let j = i;
      while (j + 1 < cells.length && cells[j + 1] === cells[j] + 1 && ((cells[j + 1] / nx) | 0) === row) j++;
      const w = j - i + 1;
      cx.drawImage(Game.pic, x0 * K, row * K, w * K, K, x0 * K, row * K, w * K, K);
      cx.fillStyle = mode === 2 ? 'rgba(255,255,255,0.07)' : 'rgba(2,4,18,0.14)';
      cx.fillRect(x0 * K, row * K, w * K, K);
      i = j + 1;
    }
  };
  Game.rebuildBorder = function () {
    const F = Game.F, c = Game.borderC.getContext('2d'), th = Game.picInfo;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, Game.borderC.width, Game.borderC.height);
    c.scale(2, 2);
    const path = new Path2D();
    for (let y = 0; y <= F.ny; y++) for (let x = 0; x < F.nx; x++) if (F.safeH(x, y)) { path.moveTo(x * CELL, y * CELL); path.lineTo((x + 1) * CELL, y * CELL); }
    for (let y = 0; y < F.ny; y++) for (let x = 0; x <= F.nx; x++) if (F.safeV(x, y)) { path.moveTo(x * CELL, y * CELL); path.lineTo(x * CELL, (y + 1) * CELL); }
    c.lineCap = 'round'; c.lineJoin = 'round';
    c.shadowColor = th.glow; c.shadowBlur = 10; c.strokeStyle = th.rim; c.lineWidth = 3; c.stroke(path);
    c.shadowBlur = 0; c.strokeStyle = '#ffffff'; c.globalAlpha = 0.55; c.lineWidth = 1; c.stroke(path);
    Game.borderPath = path;
  };
  Game.claimRect = function (x0, y0, x1, y1, mode) {
    const F = Game.F, cells = [];
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * F.nx + x; if (!F.claimed[i]) { F.claimed[i] = mode; F.claimedCount++; cells.push(i); } }
    F.relabel(); Game.paintCells(cells, mode); Game.rebuildBorder();
  };
  Game.demoSetup = function () {
    Game.claimRect(0, 70, 100, 108, 1); Game.claimRect(0, 0, 22, 70, 2); Game.claimRect(78, 0, 100, 40, 1);
    Game.p.dead = true;
    for (const pr of Game.prowlers) { pr.x = fx(50); pr.y = fy(30); }
    Game.crawlers.length = 0;
  };

  /* ---------- score and lives ---------- */
  Game.addScore = function (n) {
    Game.score += n;
    while (Game.score >= Game.nextLife) { Game.nextLife += C.EXTRA_LIFE; Game.lives++; A.sfx.extra(); FX.text(C.W / 2, C.PY + C.FH / 2, '1UP', '#7dffb0', 24); }
  };
  Game.percent = () => Game.F.percent() * 100;

  /* ---------- the marker ---------- */
  Game.hitPlayer = function () {
    const p = Game.p;
    if (p.dead || p.inv > 0 || Game.phase !== 'play' || Game.demo || G0.god) return;
    if (p.shield > 0) { p.shield--; p.inv = 1.4; FX.ring(fx(p.x), fy(p.y), 8, 50, 'rgba(120,230,255,1)', 0.5, 3); A.sfx.shield(); return; }
    p.dead = true; Game.phase = 'dying'; Game.phaseT = 1.3;
    FX.explosion(fx(p.x), fy(p.y), 2.2, 50); FX.doFlash(0.3, '255,200,120'); FX.addShake(5);
    A.sfx.die();
  };
  function respawn() {
    const p = Game.p, F = Game.F;
    F.clearTrail(); Game.fuse = null;
    if (p.drawing) { p.x = p.sx; p.y = p.sy; }
    p.drawing = false; p.dead = false; p.inv = 2.4; p.idleT = 0; p.stepT = 0; Game.bolts = [];
    const crawlerFar = [[0, 0, 4], [C.NX, 0, 3], [C.NX, C.NY, 2], [0, C.NY, 1]];
    Game.crawlers.forEach((c, i) => { const q = crawlerFar[i % 4]; if (F.onBorder(q[0], q[1])) { c.x = q[0]; c.y = q[1]; c.dir = q[2]; } c.wait = 2; });
  }

  function stepPlayer(d) {
    const p = Game.p, F = Game.F, nx = p.x + DX[d], ny = p.y + DY[d];
    if (nx < 0 || ny < 0 || nx > F.nx || ny > F.ny) return false;
    if (!p.drawing) {
      if (F.edgeSafe(p.x, p.y, d)) { p.x = nx; p.y = ny; return true; }
      if (F.edgeFree(p.x, p.y, d)) {
        if (F.onBorder(nx, ny)) return false;
        p.drawing = true; p.mode = I.slow ? 2 : 1; p.sx = p.x; p.sy = p.y; p.idleT = 0; p.lastDir = d;
        F.beginTrail(p.x, p.y); F.extendTrail(d); p.x = nx; p.y = ny;
        A.sfx.begin(p.mode);
        return true;
      }
      return false;
    }
    if (d === OPP[p.lastDir] || !F.edgeFree(p.x, p.y, d)) return false;
    if (F.onTrail(nx, ny) && !F.onBorder(nx, ny)) return false;
    F.extendTrail(d); p.x = nx; p.y = ny; p.lastDir = d; p.idleT = 0;
    A.sfx.tick();
    if (F.onBorder(nx, ny)) closeTrail();
    return true;
  }

  function prowlerCells() {
    const cells = [];
    for (const pr of Game.prowlers) {
      for (const s of prowlerSamples(pr, 1)) cells.push(cellOf(s[0], s[1]));
      cells.push(cellOf(pr.x, pr.y));
    }
    return cells;
  }

  function closeTrail() {
    const p = Game.p, F = Game.F, mode = p.mode;
    const taken = F.finish(prowlerCells(), mode);
    p.drawing = false; Game.fuse = null; p.idleT = 0;
    if (!taken.length) { Game.rebuildBorder(); A.sfx.dry(); return; }
    Game.paintCells(taken, mode);
    Game.rebuildBorder();
    let pts = Math.round(taken.length * mode * (p.doubleT > 0 ? 2 : 1));
    const big = taken.length > 1100;
    if (big) pts = Math.round(pts * 1.5);
    Game.addScore(pts);
    /* flash and numbers at the centre of what was taken */
    let sx = 0, sy = 0; for (const i of taken) { sx += i % C.NX; sy += (i / C.NX) | 0; }
    const mx = fx(sx / taken.length), my = fy(sy / taken.length);
    FX.text(mx, my, '+' + U.fmt(pts), mode === 2 ? '#ffd24a' : '#ffffff', big ? 26 : 18);
    if (mode === 2) FX.text(mx, my + 22, 'SLOW x2', '#ffd24a', 12);
    if (big) FX.text(mx, my - 24, 'BIG CLAIM', '#7dffb0', 14);
    FX.ring(mx, my, 10, Math.min(160, 20 + Math.sqrt(taken.length)), Game.picInfo.rim, 0.6, 3);
    FX.addShake(Math.min(3, taken.length / 800));
    A.sfx.claim(Math.min(1, taken.length / 1500));
    /* items inside the new area, and crawlers whose line has vanished */
    for (const it of Game.items) if (!it.dead && F.cellClaimed(it.cx, it.cy)) { it.dead = true; collect(it); }
    Game.items = Game.items.filter((it) => !it.dead);
    for (const c of Game.crawlers) if (!F.onBorder(c.x, c.y)) { c.dead = true; Game.addScore(150); FX.explosion(fx(c.x), fy(c.y), 1, 35); FX.text(fx(c.x), fy(c.y) - 8, '150', '#ffa22e', 13); A.sfx.kill(); }
    Game.crawlers = Game.crawlers.filter((c) => !c.dead);
    for (const pr of Game.prowlers) pr.region = F.regionAt(cellOf(pr.x, pr.y)[0], cellOf(pr.x, pr.y)[1]) || pr.region;
    if (Game.percent() >= Game.target) levelClear();
  }

  function collect(it) {
    const p = Game.p, x = fx(it.cx), y = fy(it.cy);
    const names = { F: 'FREEZE', H: 'SHIELD', S: 'SPEED', B: 'BOMB', L: '1UP' };
    if (it.type === 'F') { for (const pr of Game.prowlers) pr.frozen = 4.5; for (const c of Game.crawlers) c.frozen = 4.5; }
    else if (it.type === 'H') p.shield = Math.min(3, p.shield + 1);
    else if (it.type === 'S') p.speedT = 12;
    else if (it.type === 'B') {
      for (const c of Game.crawlers) { FX.explosion(fx(c.x), fy(c.y), 1.2, 35); c.dead = true; Game.addScore(150); }
      Game.crawlers = Game.crawlers.filter((c) => !c.dead); Game.bolts = []; FX.doFlash(0.5, '255,240,200'); FX.addShake(4);
      for (const pr of Game.prowlers) pr.head += Math.PI;
    } else Game.lives = Math.min(9, Game.lives + 1);
    Game.addScore(300);
    FX.text(x, y - 16, names[it.type], Art.ITEM[it.type][0], 15);
    FX.ring(x, y, 6, 44, Art.ITEM[it.type][0], 0.5, 3);
    A.sfx.power();
  }

  function levelClear() {
    Game.phase = 'clear'; Game.phaseT = 3.0; Game.flash = 0;
    const over = Math.max(0, Game.percent() - Game.target);
    const bonus = Math.round(over) * 500 + Game.level * 500 + (Game.isBoss ? 5000 : 0);
    Game.clearBonus = bonus; Game.addScore(bonus);
    Game.banner = Game.isBoss ? 'BOSS DEFEATED' : 'LEVEL CLEAR'; Game.bannerT = 3.0;
    Game.p.drawing = false; Game.F.clearTrail(); Game.fuse = null; Game.bolts = [];
    for (const pr of Game.prowlers) FX.explosion(pr.x, pr.y, pr.boss ? 3.5 : 2, pr.hue);
    Game.prowlers = []; Game.crawlers = [];
    FX.doFlash(0.4, '255,255,255');
    A.sfx.clear();
  }

  /* ---------- prowlers ---------- */
  function prowlerSamples(pr, scale) {
    const out = [], n = 8, h = pr.len * 0.5 * (pr.eff || 1) * (scale || 1);
    for (let l = 0; l < pr.lines; l++) {
      const a = pr.rot + l * U.TAU / pr.lines;
      for (let k = -n; k <= n; k++) { const t = k / n * h; out.push([pr.x + Math.cos(a) * t, pr.y + Math.sin(a) * t]); }
    }
    return out;
  }
  Game.prowlerSamples = prowlerSamples;
  function valid(pr, x, y, rot) {
    const F = Game.F, h = pr.len * 0.5 * pr.eff, lines = pr.lines;
    for (let l = 0; l < lines; l++) {
      const a = rot + l * U.TAU / lines;
      for (let k = -4; k <= 4; k++) {
        const t = k / 4 * h, cx = Math.floor((x + Math.cos(a) * t - C.PX) / CELL), cy = Math.floor((y + Math.sin(a) * t - C.PY) / CELL);
        if (!F.cellOpen(cx, cy) || (pr.region && F.regionAt(cx, cy) !== pr.region)) return false;
      }
    }
    return true;
  }
  function updateProwler(pr, dt) {
    const F = Game.F;
    if (pr.frozen > 0) { pr.frozen -= dt; return; }
    /* shrink the line in a small region so it can still move */
    const area = F.regionArea[pr.region] || 0;
    pr.eff = Math.min(1, Math.max(0.28, 0.5 * Math.sqrt(area * CELL * CELL) / pr.len));
    pr.turn += (Math.random() - 0.5) * dt * 26; pr.turn *= 1 - dt * 1.6; pr.turn = U.clamp(pr.turn, -3.2, 3.2);
    pr.spin += (Math.random() - 0.5) * dt * 30; pr.spin = U.clamp(pr.spin * (1 - dt * 0.8), -5, 5);
    const sp = pr.speed * (Game.p && Game.p.drawing && Game.p.mode === 2 ? 1 : 1);
    const nh = pr.head + pr.turn * dt, nxp = pr.x + Math.cos(nh) * sp * dt, nyp = pr.y + Math.sin(nh) * sp * dt, nr = pr.rot + pr.spin * dt;
    if (valid(pr, nxp, nyp, nr)) { pr.x = nxp; pr.y = nyp; pr.head = nh; pr.rot = nr; pr.bad = 0; }
    else {
      pr.bad += dt; pr.head += Math.PI + U.rand(-1, 1); pr.turn = 0; pr.spin = U.rand(-4, 4);
      if (valid(pr, pr.x, pr.y, pr.rot + 0.6)) pr.rot += 0.6;
      if (pr.bad > 0.8) {                                                       /* wedged: put it back in the middle of its piece */
        const c = findSpot(pr);
        if (c) { pr.x = c[0]; pr.y = c[1]; pr.eff = Math.max(0.2, pr.eff * 0.7); pr.bad = 0; }
      }
    }
    pr.histT += dt;
    if (pr.histT > 0.035) { pr.histT = 0; pr.hist.push({ x: pr.x, y: pr.y, rot: pr.rot, eff: pr.eff }); if (pr.hist.length > 7) pr.hist.shift(); }
    /* touching the trail is fatal */
    const p = Game.p;
    if (p.drawing && Game.phase === 'play') {
      for (const s of prowlerSamples(pr, 1)) {
        const cx = Math.floor((s[0] - C.PX) / CELL), cy = Math.floor((s[1] - C.PY) / CELL);
        if (F.inside(cx, cy) && F.trailCell[cy * F.nx + cx]) { Game.hitPlayer(); break; }
      }
    }
  }
  function findSpot(pr) {
    const F = Game.F; let best = null;
    for (let t = 0; t < 300; t++) {
      const cx = 1 + Math.floor(Math.random() * (F.nx - 2)), cy = 1 + Math.floor(Math.random() * (F.ny - 2));
      if (F.cellOpen(cx, cy) && F.regionAt(cx, cy) === pr.region) { best = [fx(cx + 0.5), fy(cy + 0.5)]; break; }
    }
    return best;
  }

  /* ---------- boss bolts ---------- */
  function bossUpdate(dt) {
    const b = Game.boss;
    if (!b || !Game.prowlers.length) return;
    const pr = Game.prowlers[0];
    if (pr.frozen > 0) return;
    b.boltT -= dt;
    if (b.boltT <= 0) {
      b.boltT = Math.max(1.8, 3.8 - Game.level * 0.05);
      const p = Game.p, tx = p.drawing ? fx(p.x) : fx(C.NX / 2), ty = p.drawing ? fy(p.y) : fy(C.NY / 2);
      const base = Math.atan2(ty - pr.y, tx - pr.x), n = b.skin === 1 ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const a = base + (i - (n - 1) / 2) * 0.32;
        Game.bolts.push({ x: pr.x, y: pr.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, homing: b.skin === 2, life: 7 });
      }
      A.sfx.bolt();
    }
  }
  function boltsUpdate(dt) {
    const F = Game.F, p = Game.p;
    for (const b of Game.bolts) {
      b.life -= dt;
      if (b.homing && p.drawing) { const a = Math.atan2(fy(p.y) - b.y, fx(p.x) - b.x), v = Math.hypot(b.vx, b.vy), ca = Math.atan2(b.vy, b.vx); let d = a - ca; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = ca + U.clamp(d, -1.6 * dt, 1.6 * dt); b.vx = Math.cos(na) * v; b.vy = Math.sin(na) * v; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      const cx = Math.floor((b.x - C.PX) / CELL), cy = Math.floor((b.y - C.PY) / CELL);
      if (!F.cellOpen(cx, cy) || b.life <= 0) { b.dead = true; FX.sparks(b.x, b.y, 4, 60, 'rgba(255,200,120,1)', 0.25); continue; }
      if (p.drawing && Game.phase === 'play') {
        if (F.trailCell[cy * F.nx + cx] || Math.hypot(b.x - fx(p.x), b.y - fy(p.y)) < 6) { b.dead = true; Game.hitPlayer(); }
      }
    }
    Game.bolts = Game.bolts.filter((b) => !b.dead);
  }

  /* ---------- crawlers ---------- */
  function updateCrawler(c, dt) {
    const F = Game.F, p = Game.p;
    if (c.frozen > 0) { c.frozen -= dt; return; }
    if (c.wait > 0) { c.wait -= dt; return; }
    c.stepT += dt;
    const iv = 1 / c.speed;
    while (c.stepT >= iv) {
      c.stepT -= iv;
      const opts = [];
      for (let d = 1; d <= 4; d++) if (d !== OPP[c.dir] && F.edgeSafe(c.x, c.y, d)) opts.push(d);
      if (!opts.length) { if (F.edgeSafe(c.x, c.y, OPP[c.dir])) opts.push(OPP[c.dir]); else { c.dead = true; return; } }
      let pick = opts[Math.floor(Math.random() * opts.length)];
      if (opts.length > 1 && Math.random() < 0.55) {
        let bd = 1e9;
        for (const d of opts) { const dd = Math.abs(c.x + DX[d] - p.x) + Math.abs(c.y + DY[d] - p.y); if (dd < bd) { bd = dd; pick = d; } }
      }
      c.dir = pick; c.x += DX[pick]; c.y += DY[pick];
      if (!p.dead && c.x === p.x && c.y === p.y) Game.hitPlayer();
    }
  }

  /* ---------- phases ---------- */
  Game.update = function (dt) {
    Game.time += dt;
    FX.update(dt);
    const F = Game.F;
    if (Game.demo) { for (const pr of Game.prowlers) updateProwler(pr, dt); return; }
    if (Game.bannerT > 0) Game.bannerT -= dt;
    const p = Game.p, ph = Game.phase;
    if (p.inv > 0) p.inv -= dt;
    if (p.speedT > 0) p.speedT -= dt;
    if (ph === 'ready') { Game.phaseT -= dt; if (Game.phaseT <= 0) Game.phase = 'play'; return; }
    if (ph === 'dying') {
      Game.phaseT -= dt;
      if (Game.phaseT <= 0) {
        Game.lives--;
        if (Game.lives <= 0) { Game.phase = 'over'; if (Game.onOver) Game.onOver(); return; }
        respawn(); Game.phase = 'play';
      }
      return;
    }
    if (ph === 'clear') {
      Game.phaseT -= dt; Game.flash += dt;
      if (Game.phaseT <= 0) Game.startLevel(Game.level + 1);
      return;
    }
    if (ph !== 'play') return;
    /* the marker */
    const d = I.dir;
    const base = p.drawing ? (p.mode === 2 ? C.SLOW : C.FAST) : C.FAST, iv = 1 / (base * (p.speedT > 0 ? 1.4 : 1));
    p.stepT += dt;
    if (d) {
      let guard = 3;
      while (p.stepT >= iv && guard-- > 0) {
        if (stepPlayer(d)) p.stepT -= iv; else { p.stepT = Math.min(p.stepT, iv); break; }
        if (Game.phase !== 'play') return;
      }
    } else p.stepT = Math.min(p.stepT, iv);
    if (p.drawing) {
      if (!d || p.stepT >= iv) p.idleT += dt; else p.idleT = 0;
      if (p.idleT > 1.6 && !Game.fuse) { Game.fuse = { i: 0 }; A.sfx.fuse(); }
    }
    if (Game.fuse) {
      Game.fuse.i += dt * 36;
      if (Game.fuse.i >= F.trail.length - 1) { Game.hitPlayer(); if (Game.phase === 'play') Game.fuse = null; }
    }
    for (const pr of Game.prowlers) updateProwler(pr, dt);
    if (Game.phase !== 'play') return;
    bossUpdate(dt); boltsUpdate(dt);
    for (const c of Game.crawlers) updateCrawler(c, dt);
    Game.crawlers = Game.crawlers.filter((c) => !c.dead);
    if (Game.crawlers.length < Math.min(5, 2 + Math.floor(Game.level / 4)) && Math.random() < dt * 0.15) Game.addCrawler(Math.floor(Math.random() * 4));
    for (const it of Game.items) it.t += dt;
    Game.itemT -= dt;
    if (Game.itemT <= 0) { Game.itemT = 12; if (Game.items.length < 2 && Game.percent() < Game.target - 8) Game.addItem(); }
  };

  /* ---------- drawing ---------- */
  Game.render = function (ctx) {
    const F = Game.F;
    if (!F) return;
    const t = Game.time, p = Game.p;
    ctx.fillStyle = 'rgba(2,3,12,0.9)'; ctx.fillRect(C.PX, C.PY, C.FW, C.FH);
    Art.drawGrid(ctx, t, Game.picInfo);
    let a = 1;
    if (Game.phase === 'clear') a = 1;
    ctx.drawImage(Game.claimC, C.PX, C.PY, C.FW, C.FH);
    if (Game.phase === 'clear' && Game.pic) { ctx.globalAlpha = Math.min(1, Game.flash / 1.2); ctx.drawImage(Game.pic, C.PX, C.PY, C.FW, C.FH); ctx.globalAlpha = 1; }
    ctx.drawImage(Game.borderC, C.PX, C.PY, C.FW, C.FH);
    for (const it of Game.items) Art.drawItem(ctx, fx(it.cx + 0.5), fy(it.cy + 0.5), it, t);
    if (F.trail.length > 1) Art.drawTrail(ctx, F, p, Game.fuse, t);
    for (const c of Game.crawlers) Art.drawCrawler(ctx, fx(c.x), fy(c.y), c, t);
    ctx.globalCompositeOperation = 'lighter';
    for (const pr of Game.prowlers) Art.drawProwler(ctx, pr, t, Game.boss ? C.BOSSES[Game.boss.skin].col : null);
    for (const b of Game.bolts) Art.drawBolt(ctx, b, t);
    ctx.globalCompositeOperation = 'source-over';
    if (!Game.demo && !(p.dead && Game.phase === 'dying') && Game.phase !== 'clear') Art.drawMarker(ctx, fx(p.x), fy(p.y), p, t);
    ctx.globalCompositeOperation = 'lighter'; FX.drawAdd(ctx); ctx.globalCompositeOperation = 'source-over';
    FX.drawNorm(ctx); FX.drawText(ctx);
  };

  G.game = Game;
})((window.SGS = window.SGS || {}));
