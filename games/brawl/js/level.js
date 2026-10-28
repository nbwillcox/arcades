/* Level scripts. A wave triggers when the camera reaches `at`; the camera is locked there until every enemy of the wave is down. */
(function (G) {
  'use strict';
  const L = {};
  const e = (k, side, d) => ({ k, side: side || 'r', d: d || 0 });
  L.list = [
    {
      name: 'THE STREETS', time: 300, sub: 'LEVEL 1', width: 2240, seed: 5, music: 'street', start: { x: 70, y: 214 },
      waves: [
        { at: 0, enemies: [e('thug', 'r', 0.2), e('thug', 'r', 1.2)] },
        { at: 340, items: [{ t: 'bat', x: 560, y: 224 }, { t: 'drum', x: 470, y: 196, drop: 'apple' }, { t: 'crate', x: 640, y: 240 }], enemies: [e('thug', 'r', 0), e('masked', 'l', 0.6), e('thug', 'r', 2.5)] },
        { at: 760, items: [{ t: 'knife', x: 960, y: 212 }, { t: 'knife', x: 1090, y: 238 }, { t: 'drum', x: 900, y: 240, drop: 'knife' }], enemies: [e('masked', 'r', 0), e('masked', 'l', 0.4), e('thug', 'r', 1.5), e('ninja', 'r', 3.5)] },
        { at: 1180, items: [{ t: 'nunchaku', x: 1400, y: 228 }, { t: 'apple', x: 1560, y: 214 }, { t: 'drum', x: 1300, y: 200, drop: 'chicken' }, { t: 'crate', x: 1470, y: 238 }], enemies: [e('thug', 'l', 0), e('thug', 'r', 0.5), e('masked', 'r', 2.4), e('ninja', 'l', 3.4), e('masked', 'l', 5)] },
        { at: 1500, mini: true, enemies: [e('brute', 'r', 0.3), e('thug', 'l', 3), e('masked', 'r', 5), e('ninja', 'l', 8)] },
        { at: 1760, boss: true, items: [{ t: 'bat', x: 1980, y: 236 }], enemies: [e('boss', 'r', 0.6), e('ninja', 'l', 3), e('ninja', 'r', 9)] },
      ],
    },
  ];

  const it = (t, x, y, drop) => ({ t, x, y, drop });
  L.list.push(
    {
      name: 'THE WAREHOUSE', time: 360, sub: 'LEVEL 2', width: 2260, seed: 7, theme: 'warehouse', music: 'warehouse', start: { x: 70, y: 214 },
      waves: [
        { at: 0, enemies: [e('thug', 'r', 0.2), e('bruiser', 'r', 1.4)] },
        { at: 340, items: [it('crate', 520, 232), it('drum', 470, 198, 'knife'), it('bat', 700, 222)], enemies: [e('thug', 'r', 0), e('masked', 'l', 0.6), e('bruiser', 'r', 2.4), e('thug', 'l', 3.2)] },
        { at: 760, items: [it('crate', 900, 236), it('nunchaku', 1060, 214), it('drum', 960, 200, 'apple')], enemies: [e('bruiser', 'l', 0), e('masked', 'r', 0.5), e('masked', 'l', 2), e('ninja', 'r', 3.5)] },
        { at: 1180, items: [it('crate', 1300, 228), it('crate', 1420, 238), it('drum', 1340, 198, 'chicken')], enemies: [e('thug', 'l', 0), e('thug', 'r', 0.4), e('masked', 'r', 2), e('masked', 'l', 2.6), e('bruiser', 'r', 4)] },
        { at: 1500, mini: true, items: [it('apple', 1700, 220)], enemies: [e('boxer', 'r', 0.3), e('thug', 'l', 3), e('masked', 'r', 5), e('bruiser', 'l', 8)] },
        { at: 1780, boss: true, items: [it('crate', 1950, 238), it('bat', 2060, 220), it('drum', 2000, 198, 'chicken')], enemies: [e('foreman', 'r', 0.6), e('bruiser', 'l', 3), e('masked', 'r', 8), e('bruiser', 'r', 12)] },
      ],
    },
    {
      name: 'THE DOJO', time: 360, sub: 'LEVEL 3', width: 2260, seed: 11, theme: 'dojo', music: 'dojo', start: { x: 70, y: 214 },
      waves: [
        { at: 0, enemies: [e('karateka', 'r', 0.2), e('karateka', 'r', 1.4)] },
        { at: 340, items: [it('nunchaku', 560, 226)], enemies: [e('karateka', 'r', 0), e('karateka', 'l', 0.6), e('ninja', 'r', 3)] },
        { at: 760, items: [it('nunchaku', 960, 230), it('apple', 1100, 214)], enemies: [e('karateka', 'l', 0), e('karateka', 'r', 0.4), e('karateka', 'r', 2.2), e('ninja', 'l', 3.5)] },
        { at: 1180, items: [it('nunchaku', 1340, 218), it('chicken', 1560, 232)], enemies: [e('ninja', 'l', 0), e('ninja', 'r', 0.5), e('karateka', 'r', 2.4), e('karateka', 'l', 3), e('masked', 'r', 5)] },
        { at: 1500, mini: true, items: [it('apple', 1720, 222)], enemies: [e('shadow', 'l', 0.3), e('shadow', 'r', 0.9), e('karateka', 'l', 5), e('karateka', 'r', 7)] },
        { at: 1780, boss: true, items: [it('nunchaku', 1960, 230), it('chicken', 2080, 214)], enemies: [e('sensei', 'r', 0.6), e('karateka', 'l', 3), e('ninja', 'r', 6), e('karateka', 'r', 10)] },
      ],
    },
    {
      name: 'THE DOCKS', time: 360, sub: 'LEVEL 4', width: 2260, seed: 13, theme: 'docks', music: 'docks', start: { x: 70, y: 214 },
      waves: [
        { at: 0, enemies: [e('sailor', 'r', 0.2), e('sailor', 'r', 1.4)] },
        { at: 340, items: [it('barrel', 540, 236), it('drum', 480, 198, 'apple'), it('bat', 690, 224)], enemies: [e('sailor', 'r', 0), e('thug', 'l', 0.6), e('thug', 'r', 2.4)] },
        { at: 760, items: [it('knife', 940, 214), it('barrel', 1080, 238), it('drum', 900, 200, 'knife')], enemies: [e('sailor', 'l', 0), e('sailor', 'r', 0.4), e('bruiser', 'r', 2.6), e('ninja', 'l', 4)] },
        { at: 1180, items: [it('barrel', 1320, 230), it('drum', 1400, 198, 'chicken'), it('bat', 1500, 236)], enemies: [e('sailor', 'l', 0), e('sailor', 'r', 0.5), e('masked', 'r', 2), e('masked', 'l', 2.8), e('bruiser', 'l', 5)] },
        { at: 1500, mini: true, items: [it('apple', 1700, 224)], enemies: [e('skipper', 'r', 0.3), e('sailor', 'l', 3), e('sailor', 'r', 5), e('thug', 'l', 8)] },
        { at: 1780, boss: true, items: [it('barrel', 1940, 236), it('bat', 2040, 222), it('drum', 1990, 200, 'chicken')], enemies: [e('harbor', 'r', 0.6), e('bruiser', 'l', 3), e('sailor', 'r', 7), e('ninja', 'l', 11)] },
      ],
    },
    {
      name: 'THE ROOFTOP', time: 420, sub: 'LEVEL 5', width: 2260, seed: 17, theme: 'roof', music: 'roof', start: { x: 70, y: 214 },
      waves: [
        { at: 0, enemies: [e('agent', 'r', 0.2), e('agent', 'r', 1.2), e('masked', 'l', 2.6)] },
        { at: 340, items: [it('knife', 560, 226), it('drum', 480, 198, 'apple')], enemies: [e('agent', 'r', 0), e('agent', 'l', 0.6), e('ninja', 'r', 3), e('karateka', 'l', 4)] },
        { at: 760, items: [it('barrel', 920, 234), it('bat', 1040, 222), it('drum', 960, 198, 'knife')], enemies: [e('bruiser', 'l', 0), e('agent', 'r', 0.5), e('agent', 'r', 2.2), e('ninja', 'l', 3.5)] },
        { at: 1180, items: [it('nunchaku', 1340, 218), it('chicken', 1560, 232), it('crate', 1420, 238)], enemies: [e('karateka', 'l', 0), e('karateka', 'r', 0.4), e('agent', 'r', 2.4), e('agent', 'l', 3), e('bruiser', 'r', 5)] },
        { at: 1500, mini: true, items: [it('apple', 1700, 222)], enemies: [e('bodyguard', 'r', 0.3), e('agent', 'l', 3), e('agent', 'r', 5), e('ninja', 'l', 8)] },
        { at: 1780, boss: true, items: [it('chicken', 1960, 230), it('bat', 2060, 222), it('drum', 2000, 198, 'chicken')], enemies: [e('kingpin', 'r', 0.6), e('ninja', 'l', 4), e('agent', 'r', 9)] },
      ],
    }
  );
  /* an empty arena for tuning moves: ?lab=1 and the number keys with ?debug=1 */
  L.lab = { name: 'TRAINING YARD', sub: 'LAB', width: 960, seed: 9, music: null, start: { x: 90, y: 214 }, waves: [] };
  G.level = L;
})((window.SGS = window.SGS || {}));
