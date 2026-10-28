/* Compiles the hand-authored sprite grids (arrays of strings, '.' = transparent, one letter per palette key) into canvases. */
(function (G) {
  'use strict';
  const PX = G.px, P = G.pal, ART = { sets: {} };
  G.art = ART;
  const keyCache = {};
  ART.keys = (armor) => { const a = armor || 'cobalt'; if (!keyCache[a]) { const k = P.keys(a), out = {}; for (const c in k) out[c] = PX.rgb(k[c]); keyCache[a] = out; } return keyCache[a]; };
  /* rows -> { pix, c (canvas), w, h } ; throws on ragged rows or unknown letters so mistakes are loud */
  ART.make = function (rows, armor, name) {
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0), keys = ART.keys(armor);
    const fixed = rows.map((r, i) => { if (r.length !== w) throw new Error((name || 'sprite') + ' row ' + i + ' has ' + r.length + ' chars, expected ' + w); return r; });
    const pix = PX.parse(fixed, keys);
    return { pix, c: pix.toCanvas(1), w, h: rows.length };
  };
  /* stack part grids vertically / paste with offsets into one grid (used to compose body + legs) */
  ART.stack = function (parts) { return [].concat.apply([], parts); };
  ART.paste = function (base, over, ox, oy) {
    const out = base.map((r) => r.split(''));
    over.forEach((r, y) => { for (let x = 0; x < r.length; x++) { if (r[x] === '.') continue; const yy = y + oy, xx = x + ox; if (out[yy] && xx >= 0 && xx < out[yy].length) out[yy][xx] = r[x]; } });
    return out.map((r) => r.join(''));
  };
  ART.blank = (w, h) => Array.from({ length: h }, () => '.'.repeat(w));
})((window.SGS = window.SGS || {}));
