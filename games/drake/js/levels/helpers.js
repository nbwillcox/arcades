// Level-authoring helpers: expand patterns into plain entity lists.
export const gem = (x, z, v = 1, y) => ({ t: 'gem', x, z, v, y });
export function gemLine(x0, z0, x1, z1, n, v = 1, y) {
  const o = []; for (let i = 0; i < n; i++) { const f = n === 1 ? 0 : i / (n - 1); o.push(gem(x0 + (x1 - x0) * f, z0 + (z1 - z0) * f, v, y)); } return o;
}
export function gemRing(cx, cz, r, n, v = 1, y) {
  const o = []; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; o.push(gem(cx + Math.cos(a) * r, cz + Math.sin(a) * r, v, y)); } return o;
}
export function gemPile(cx, cz, v = 1, n = 5) {
  const o = []; for (let i = 0; i < n; i++) { const a = i * 2.4, r = 0.35 * Math.sqrt(i); o.push(gem(cx + Math.cos(a) * r, cz + Math.sin(a) * r, v)); } return o;
}
export const crate = (x, z, gems = [1, 1]) => ({ t: 'crate', x, z, gems });
export const vase = (x, z, gems = [1]) => ({ t: 'vase', x, z, gems });
export const chest = (x, z, gems = [5, 5, 10], yaw = 0) => ({ t: 'chest', x, z, gems, yaw });
export const enemy = (kind, x, z, patrol = 5, extra = {}) => ({ t: 'enemy', kind, x, z, patrol, ...extra });
export const moth = (x, z, h = 1.6) => ({ t: 'moth', x, z, h });
export const lantern = (x, z, yaw = 0) => ({ t: 'lantern', x, z, yaw });
export const elder = (x, z, tip, yaw = 0) => ({ t: 'elder', x, z, tip, yaw });
