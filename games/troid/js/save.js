/* Three save slots in localStorage (guarded; the game also runs without storage). A save = progress flags + hero stats + where to wake up. */
(function (G) {
  'use strict';
  const S = {}, KEY = (n) => 'spacetroid.save.v1.' + n;
  G.save = S;
  S.slots = 3;
  S.read = function (n) { try { const j = localStorage.getItem(KEY(n)); return j ? JSON.parse(j) : null; } catch (e) { return null; } };
  S.write = function (n, data) { try { localStorage.setItem(KEY(n), JSON.stringify(data)); return true; } catch (e) { return false; } };
  S.erase = function (n) { try { localStorage.removeItem(KEY(n)); } catch (e) { /* ignore */ } };
  /* a fresh progress record */
  S.fresh = function () {
    return { v: 1, room: 'crash', door: null, x: null, y: null, abil: { morph: false, bombs: false, sbombs: false, missiles: false, supers: false, spinflip: false, spacejump: false, dash: false, charge: false, hasIce: false, hasWave: false, hasPlasma: false, beams: { ice: false, wave: false, plasma: false } },
      hero: { tanks: 0, missileMax: 0, missiles: 0, sbombMax: 0, sbombs: 0, superMax: 0, supers: 0 }, items: {}, doors: {}, flags: {}, visited: {}, mapped: {}, time: 0, saves: 0 };
  };
  /* snapshot of live game state -> save record */
  S.snapshot = function (g, station) {
    const p = g.P, r = JSON.parse(JSON.stringify(g.prog));
    r.room = g.roomId; r.x = station ? station.x : p.x; r.y = station ? station.y : p.y;
    r.abil = JSON.parse(JSON.stringify(g.abil));
    r.hero = { tanks: p.tanks, missileMax: p.missileMax, missiles: p.missiles, sbombMax: p.sbombMax, sbombs: p.sbombs, superMax: p.superMax, supers: p.supers };
    r.time = Math.floor(g.playTime || 0); r.saves = (g.prog.saves || 0) + 1;
    return r;
  };
  S.summary = function (r) {
    if (!r) return null;
    const rm = G.rooms[r.room];
    const n = Object.keys(r.items || {}).length, tot = G.world ? G.world.itemTotal() : 1;
    return { place: rm ? rm.name : r.room, pct: Math.round(100 * n / Math.max(1, tot)), tanks: r.hero.tanks, time: r.time };
  };
})((window.SGS = window.SGS || {}));
