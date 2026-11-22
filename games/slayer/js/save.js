/* persistent save (localStorage) */
(function () {
  var KEY = 'cyberslayersurvivor.v1';
  var S = CS.save = { d: null };
  function def() {
    return { gold: 0, keys: 0, cleared: {}, unlocked: { 1: true }, shop: { shared: {}, gunner: {}, engineer: {}, priest: {} }, cls: 'gunner', blitz: false,
      best: {}, warned: false, warnedAt: '', set: { music: 0.5, sfx: 0.8, shake: 1, autopause: false, dmgnums: true, safe: false, intscale: false, autofs: true, bloom: true, flash: true, haptics: true, stick: 'float', deadzone: 0.2, keys: {}, pad: {} }, runs: 0, kills: 0, intro: false };
  }
  S.load = function () {
    var d = def();
    try { var r = JSON.parse(localStorage.getItem(KEY)); if (r) { for (var k in r) d[k] = r[k]; for (var s in def().shop) if (!d.shop[s]) d.shop[s] = {}; } } catch (e) { }
    var ds = def().set; for (var q in ds) if (d.set[q] === undefined) d.set[q] = ds[q]; S.d = d; return d;
  };
  S.store = function () { try { localStorage.setItem(KEY, JSON.stringify(S.d)); } catch (e) { } };
  S.rank = function (cls, id) { var t = S.d.shop.shared[id]; if (t !== undefined) return t; return (S.d.shop[cls] && S.d.shop[cls][id]) || 0; };
  S.sharedRank = function (id) { return S.d.shop.shared[id] || 0; };
  S.classRank = function (cls, id) { return S.d.shop[cls][id] || 0; };
  S.clearedCount = function () { var n = 0; for (var k in S.d.cleared) if (S.d.cleared[k]) n++; return n; };
  S.reset = function () { S.d = def(); S.store(); };
})();
