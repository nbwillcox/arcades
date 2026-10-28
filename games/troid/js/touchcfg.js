/* Touch controls for SpaceTroid (read by js/mobile.js): a floating stick moves (down crouches, down again morphs, up stands), JUMP, the FIRE pad (hold = fire / charge, drag from its centre = aim in any
   direction, the same 360-degree aim as a gamepad's right stick), MISSILE and DASH, with SWAP / GRAPPLE / SCAN / MORPH shown once the hero owns them, and small MAP / STATUS / PAUSE buttons.
   Menus are drawn on the canvas, so while one is open the kit shows a d-pad with A and B instead (and the rows can also be tapped). */
(function () {
  const G = () => window.SGS, A = () => (G().game && G().game.abil) || {};
  const aim = (x, y) => { const I = G().input; if (I) I.touchStick = x === null || x === undefined ? null : { x, y }; };               /* the FIRE pad's drag: a unit vector, or null when centred */
  const tapDown = () => { window.TK.tapKey('ArrowDown', 60); setTimeout(() => window.TK.tapKey('ArrowDown', 60), 160); };         /* crouch, then morph */
  window.TOUCH_CFG = {
    id: 'spacetroid', title: 'SpaceTroid', orient: 'landscape', accent: '#86f0f2',
    unlock: () => { const a = G().audio; if (a && a.init) a.init(); },
    menuOpen: () => false,
    screen: () => (G().main && G().main.mode === 'play' ? 'play' : 'menu'),
    onRotate: () => { try { if (G().main.mode === 'play') G().main.pause(); } catch (e) { /* ignore */ } },
    pause: { pos: { r: 12, t: 10 } },
    controls: [
      { t: 'stick', id: 'move', zone: [0, 0.18, 0.4, 1], mode: '8', keys: { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' }, r: 56, dead: 0.32 },
      { t: 'btn', id: 'jump', label: 'JUMP', key: 'Space', hold: true, size: 84, pos: { r: 16, b: 18 } },
      { t: 'aimfire', id: 'fire', label: 'FIRE', key: 'KeyX', size: 104, pos: { r: 112, b: 30 }, onAim: aim },
      { t: 'btn', id: 'missile', label: 'MISSILE', key: 'KeyC', hold: true, size: 56, pos: { r: 22, b: 112 }, show: () => !!A().missiles },
      { t: 'btn', id: 'dash', label: 'DASH', key: 'ShiftLeft', hold: true, size: 56, pos: { r: 96, b: 146 } },
      { t: 'btn', id: 'swap', label: 'SWAP', key: 'KeyR', hold: false, size: 50, pos: { r: 24, b: 178 }, show: () => !!(A().missiles && A().supers) },
      { t: 'btn', id: 'grapple', label: 'GRAPPLE', key: 'KeyQ', hold: true, size: 50, pos: { r: 162, b: 150 }, show: () => !!A().grapple },
      { t: 'btn', id: 'morph', label: 'MORPH', hold: false, onDown: tapDown, size: 50, pos: { l: 14, b: 160 }, show: () => !!A().morph },
      { t: 'btn', id: 'scan', label: 'SCAN', key: 'KeyF', hold: false, size: 46, cls: 'tk-small', pos: { l: 14, b: 214 }, show: () => !!A().scan },
      { t: 'btn', id: 'map', label: 'MAP', key: 'KeyM', hold: false, size: 42, cls: 'tk-small', pos: { r: 62, t: 10 } },
      { t: 'btn', id: 'inv', label: 'INFO', key: 'KeyI', hold: false, size: 42, cls: 'tk-small', pos: { r: 112, t: 10 } },
      /* menu mode: a d-pad and A / B for the canvas menus, the map and the status screen */
      { t: 'btn', id: 'mu', label: '\u25B2', key: 'ArrowUp', hold: false, size: 54, when: 'menu', pos: { l: 70, b: 126 } },
      { t: 'btn', id: 'md', label: '\u25BC', key: 'ArrowDown', hold: false, size: 54, when: 'menu', pos: { l: 70, b: 20 } },
      { t: 'btn', id: 'ml', label: '\u25C0', key: 'ArrowLeft', hold: false, size: 54, when: 'menu', pos: { l: 14, b: 73 } },
      { t: 'btn', id: 'mr', label: '\u25B6', key: 'ArrowRight', hold: false, size: 54, when: 'menu', pos: { l: 126, b: 73 } },
      { t: 'btn', id: 'ma', label: 'A', key: 'Enter', hold: false, size: 68, when: 'menu', pos: { r: 22, b: 70 } },
      { t: 'btn', id: 'mb', label: 'B', key: 'Escape', hold: false, size: 56, when: 'menu', pos: { r: 104, b: 24 } },
    ],
  };
})();
