/* Settings and save slots in localStorage (all reads/writes guarded; the game also runs without storage). */
(function (G) {
  'use strict';
  const KEY = 'spacetroid.settings.v1';
  const S = G.settings = { gamepad: true, mouseAim: true, fireMode: 'charge', hard: false, shake: true, reduced: false, music: 0.5, sfx: 0.7, scale: 0 };
  try { Object.assign(S, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
  S.save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } };
  G.C = { W: 480, H: 270, TILE: 16, STEP: 1 / 60 };
})((window.SGS = window.SGS || {}));
