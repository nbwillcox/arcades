/* Game flow: Grand Prix cups (5 races, points, qualification cut, 3 machines), Time Trial, records. */
(function (G) {
  'use strict';
  const R = G.race, REC = G.records, PX = G.px, F = {};
  G.flow = F;
  F.gp = null; F.tt = null;
  const shuffle = (arr, rnd) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
  F.cupKey = (cup, diff) => cup + ':' + diff;

  F.startGP = function (cup, diff, machine) {
    const pts = { P: 0 }; for (let i = 0; i < 19; i++) pts[i] = 0;
    F.gp = { cup, diff, machine, idx: 0, lives: 3, pts, rnd: PX.rng(cup * 17 + diff * 3 + 5), base: shuffle(Array.from({ length: 19 }, (_, i) => i), PX.rng(cup * 31 + 7)), done: false };
    F.tt = null;
    F.nextIntro();
  };
  F.gridOrder = function () {
    const g = F.gp;
    if (g.idx === 0) { const o = g.base.slice(); o.splice(14, 0, 'P'); return o; }
    const ids = ['P'].concat(g.base);
    return ids.sort((a, b) => g.pts[b] - g.pts[a] || (a === 'P' ? 1 : b === 'P' ? -1 : 0));
  };
  F.trackIdx = () => F.gp.cup * 5 + F.gp.idx;
  F.nextIntro = function () {
    const g = F.gp, tr = G.tracks.list[F.trackIdx()];
    G.ui.showIntro({ title: G.tracks.CUPS[g.cup].name + '  RACE ' + (g.idx + 1) + '/5', track: tr, world: G.tracks.WORLDS[tr.world].name, diff: R.DIFF[g.diff].name, cut: R.DIFF[g.diff].cut, lives: g.lives, go: F.launch });
  };
  F.launch = function () {
    const g = F.gp, M = G.main;
    M.startRace({ track: F.trackIdx(), machine: g.machine, mode: 'gp', diff: g.diff, order: F.gridOrder() });
  };
  F.startTT = function (track, machine) {
    F.tt = { track, machine }; F.gp = null;
    G.main.startRace({ track, machine, mode: 'tt', diff: 1 });
  };
  F.retry = function () { if (F.tt) { G.main.startRace({ track: F.tt.track, machine: F.tt.machine, mode: 'tt', diff: 1 }); } else if (F.gp) F.launch(); };

  /* called by the main loop when the race state reaches 'done' */
  F.raceDone = function () {
    const M = G.main; M.mode = 'results';
    if (G.audio) { G.audio.engine(false); G.audio.music('off'); }
    const P = R.P, order = R.rankAll().slice(), tr = R.tr;
    if (R.tt) {
      const total = P.finished ? P.finishT : null, lap = P.lapTimes.length ? Math.min.apply(null, P.lapTimes) : null, prev = REC.tracks[tr.id] ? { race: REC.tracks[tr.id].race, lap: REC.tracks[tr.id].lap } : { race: null, lap: null };
      const nr = P.finished ? REC.submit(tr.id, total, lap) : { race: false, lap: false };
      if (G.audio) G.audio.sfx[P.finished ? 'win' : 'lose']();
      G.ui.showTTResults({ track: tr, finished: P.finished, total, laps: P.lapTimes, lap, prev, newRace: nr.race, newLap: nr.lap, ghost: R.newGhost });
      return;
    }
    const g = F.gp, rank = P.rank, cut = R.DIFF[g.diff].cut, rows = order.map((q) => {
      const add = R.POINTS[q.rank - 1] || 0; g.pts[q.id] += add;
      return { id: q.id, name: q.name, hue: q.hue, isP: q.isP, rank: q.rank, time: q.finished ? q.finishT : null, add, total: g.pts[q.id] };
    });
    const ok = rank <= cut && !R.retired;
    let status = 'next';
    if (!ok) { g.lives--; status = g.lives <= 0 ? 'over' : 'retry'; for (const q of rows) { q.total -= q.add; g.pts[q.id] -= q.add; q.add = 0; } }
    else if (g.idx >= 4) status = 'cup';
    if (G.audio) G.audio.sfx[ok ? 'win' : 'lose']();
    const standings = Object.keys(g.pts).map((id) => ({ id: id === 'P' ? 'P' : +id, pts: g.pts[id] })).sort((a, b) => b.pts - a.pts);
    const prank = standings.findIndex((s) => s.id === 'P') + 1;
    let cupInfo = null;
    if (status === 'cup') { const newBest = REC.cup(F.cupKey(g.cup, g.diff), g.pts.P, prank); cupInfo = { rank: prank, pts: g.pts.P, newBest, name: G.tracks.CUPS[g.cup].name, diff: R.DIFF[g.diff].name }; }
    if (ok && P.finished) REC.submit(tr.id, P.finishT, P.lapTimes.length ? Math.min.apply(null, P.lapTimes) : null);
    G.ui.showGPResults({ rows, rank, cut, ok, status, lives: g.lives, track: tr, race: g.idx + 1, cup: cupInfo, retired: R.retired, standings: standings.map((s) => ({ name: s.id === 'P' ? 'YOU' : R.NAMES[s.id], isP: s.id === 'P', pts: s.pts })) });
  };
  F.advance = function () { const g = F.gp; if (!g) return; g.idx++; F.nextIntro(); };
})((window.SGS = window.SGS || {}));
