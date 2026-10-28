// Landmark and building kinds for the decor system. Static shells (landmarkKinds) are instanced; the moving parts
// (sails, wheels, smoke, flame, floating crystals, vanes) are small animated groups (landmarkAnim).
export function landmarkKinds(H) {
  const { merge, J, T, S, RY, RZ, RX, mul, cone, cyl, ico, box, shade, THREE } = H;
  const ring = (r, tube, seg = 12) => new THREE.TorusGeometry(r, tube, 5, seg).rotateX(Math.PI / 2);
  const pick = (p, k, d) => (p[k] !== undefined ? p[k] : d);
  // shingle courses on a cone roof: stacked slightly-wider rings in two alternating tones
  const shingles = (parts, r0, r1, y0, y1, n, c, seg, seed) => {
    for (let i = 0; i < n; i++) {
      const t = i / n, r = r0 + (r1 - r0) * t, y = y0 + (y1 - y0) * t;
      parts.push({ g: J(cyl(r * 0.96, r, (y1 - y0) / n * 1.15, seg), 0.04, seed + i), c: i % 2 ? shade(c, 0.88) : shade(c, 1.06), m: T(0, y, 0), sh: 0.3 });
    }
  };
  // vine / moss blobs clinging to a wall
  const vines = (parts, pts, seed) => pts.forEach(([x, y, z, r], i) => parts.push({ g: J(ico(r, 1), r * 0.5, seed + i), c: i % 2 ? 0x4f9e4f : 0x5fb25a, m: mul(T(x, y, z), S(1, 0.8, 0.6)), sh: 0.5 }));
  const flowerBox = (parts, x, y, z, w) => {
    parts.push({ g: box(w, 0.28, 0.34), c: 0x7a4f2e, m: T(x, y, z) });
    for (let i = 0; i < 5; i++) parts.push({ g: ico(0.13, 0), c: [0xff6a8f, 0xffd23e, 0xfff2f2, 0xff9a4a, 0xc78aff][i % 5], m: T(x + (i - 2) * w * 0.2, y + 0.26, z + 0.03), sh: 0.3 });
  };
  const arch = (parts, x, y, z, w, h, c, dark) => { // door with a round-ish top
    parts.push({ g: box(w, h, 0.3), c: dark, m: T(x, y + h / 2, z) }, { g: cyl(w / 2, w / 2, 0.3, 8).rotateX(Math.PI / 2), c: dark, m: T(x, y + h, z) });
    parts.push({ g: box(w + 0.35, 0.22, 0.4), c, m: T(x, y + h + w / 2 + 0.1, z) }, { g: box(0.2, h + 0.1, 0.4), c, m: T(x - w / 2 - 0.1, y + h / 2, z) }, { g: box(0.2, h + 0.1, 0.4), c, m: T(x + w / 2 + 0.1, y + h / 2, z) });
  };
  const windowAt = (parts, x, y, z, ry, w = 0.55, h = 0.8, shutters = true) => {
    const m = mul(RY(ry), T(x, y, z));
    parts.push({ g: box(w, h, 0.18), c: 0x2a3550, m, sh: 0 }, { g: box(w + 0.22, 0.14, 0.3), c: 0xcbbfa8, m: mul(m, T(0, h / 2 + 0.07, 0)) }, { g: box(w + 0.22, 0.14, 0.3), c: 0xcbbfa8, m: mul(m, T(0, -h / 2 - 0.07, 0.04)) }, { g: box(0.05, h, 0.22), c: 0xcbbfa8, m: mul(m, T(0, 0, 0.02)) }, { g: box(w, 0.05, 0.22), c: 0xcbbfa8, m: mul(m, T(0, 0, 0.02)) });
    if (shutters) for (const s of [-1, 1]) parts.push({ g: box(w * 0.5, h + 0.1, 0.1), c: 0x4f7d5a, m: mul(m, T(s * (w * 0.5 + 0.2), 0, 0.06), RY(s * 0.5)) });
  };

  return {
    // ---- Mossgate hub: round stone windmill (the sails are the animated part)
    windmill(p) {
      const plaster = 0xe6dac4, stone = 0x9a8f80, stone2 = 0xb3a793, roof = 0x9c4a38, wood = 0x7a4f2e, dwood = 0x4e3220, iron = 0x2c2c34;
      const rad = (y) => 2.9 - (y - 0.5) * 0.108; // plaster tower radius at height y
      const parts = [
        { g: J(cyl(3.0, 3.3, 0.35, 14), 0.05, 1), c: shade(stone, 0.8), m: T(0, 0.175, 0) },
        { g: J(cyl(2.78, 3.05, 2.0, 14), 0.05, 2), c: stone, m: T(0, 1.5, 0), sh: 0.2 },
        { g: J(cyl(2.1, 2.68, 5.4, 14), 0.05, 3), c: plaster, m: T(0, 5.2, 0), sh: 0.2 },
        { g: cyl(2.8, 2.8, 0.18, 14), c: stone2, m: T(0, 2.5, 0) },
      ];
      // dressed stone blocks on the base course, skipping the doorway
      for (let row = 0; row < 3; row++) {
        const n = 15, y = 0.8 + row * 0.6;
        for (let i = 0; i < n; i++) {
          const a = ((i + (row % 2) * 0.5) / n) * Math.PI * 2;
          if (Math.abs(Math.atan2(Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2))) < 0.5) continue;
          const r = 3.0 - (y - 0.5) * 0.12 + 0.05;
          parts.push({ g: J(box(1.15, 0.5, 0.26), 0.04, 100 + row * 20 + i), c: shade(i % 3 ? stone2 : stone, 0.9 + ((i * 7 + row) % 5) * 0.04), m: mul(T(Math.cos(a) * r, y, Math.sin(a) * r), RY(Math.PI / 2 - a)), sh: 0.3 });
        }
      }
      // timber bands and studs on the plaster
      for (const y of [3.5, 5.5]) parts.push({ g: J(cyl(rad(y) + 0.06, rad(y) + 0.06, 0.16, 14), 0.02, 40 + y), c: dwood, m: T(0, y, 0) });
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + 0.3, r = rad(4.5) + 0.04; parts.push({ g: box(0.16, 2.2, 0.14), c: dwood, m: mul(T(Math.cos(a) * r, 4.5, Math.sin(a) * r), RY(Math.PI / 2 - a)) }); }
      // doorway: stone voussoir arch, planked door with iron straps, steps, lantern
      const dy = 0.35, dw = 1.2, dh = 1.35, dz = 2.85;
      parts.push({ g: box(dw, dh, 0.3), c: dwood, m: T(0, dy + dh / 2, dz) }, { g: cyl(dw / 2, dw / 2, 0.3, 10).rotateX(Math.PI / 2), c: dwood, m: T(0, dy + dh, dz) });
      for (let i = 0; i < 5; i++) parts.push({ g: box(0.2, dh + 0.06, 0.1), c: i % 2 ? wood : shade(wood, 1.15), m: T(-0.48 + i * 0.24, dy + dh / 2, dz + 0.17) });
      parts.push({ g: box(dw, 0.4, 0.1), c: wood, m: T(0, dy + dh + 0.2, dz + 0.17) });
      for (const y of [0.5, 0.95]) parts.push({ g: box(dw, 0.1, 0.14), c: iron, m: T(0, dy + y, dz + 0.2) });
      parts.push({ g: new THREE.TorusGeometry(0.09, 0.025, 5, 8), c: iron, m: T(0.38, dy + 0.75, dz + 0.27) });
      const R = dw / 2 + 0.2;
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI, key = i === 4;
        parts.push({ g: J(box(key ? 0.4 : 0.3, key ? 0.5 : 0.4, 0.55), 0.03, 200 + i), c: key ? 0xcfc3ae : shade(stone2, 0.88 + (i % 3) * 0.07), m: mul(T(Math.cos(a) * R, dy + dh + Math.sin(a) * R, dz + 0.1), RZ(a - Math.PI / 2)), sh: 0.3 });
      }
      for (const sx of [-1, 1]) for (let j = 0; j < 3; j++) parts.push({ g: J(box(0.36, 0.5, 0.55), 0.03, 220 + j), c: shade(stone2, 0.88 + j * 0.06), m: T(sx * R, dy + 0.25 + j * 0.5, dz + 0.1), sh: 0.3 });
      parts.push({ g: box(1.9, 0.12, 0.7), c: stone2, m: T(0, dy + 0.06, 3.35) }, { g: box(2.5, 0.18, 0.6), c: shade(stone, 1.1), m: T(0, 0.09, 3.7) });
      parts.push({ g: box(0.05, 0.4, 0.05), c: iron, m: T(1.55, 2.0, 2.78) }, { g: box(0.05, 0.05, 0.4), c: iron, m: T(1.55, 2.2, 2.9) }, { g: box(0.24, 0.32, 0.24), c: 0xffd27a, m: T(1.55, 1.95, 3.1), sh: 0 }, { g: cone(0.2, 0.2, 4), c: iron, m: T(1.55, 2.2, 3.1) });
      // barrel and sacks beside the door
      parts.push({ g: cyl(0.38, 0.38, 0.8, 8), c: wood, m: T(-1.75, 0.4, 3.4) }, { g: cyl(0.4, 0.4, 0.07, 8), c: iron, m: T(-1.75, 0.2, 3.4) }, { g: cyl(0.4, 0.4, 0.07, 8), c: iron, m: T(-1.75, 0.62, 3.4) });
      for (let i = 0; i < 3; i++) parts.push({ g: J(ico(0.34, 1), 0.06, 300 + i), c: [0xd9c79c, 0xc9b78a, 0xe0d2ac][i], m: mul(T(-2.35 + i * 0.1, 0.25 + i * 0.05, 3.15 + i * 0.4), S(1, 0.8, 0.9)), sh: 0.4 });
      // windows
      windowAt(parts, 0, 4.4, 2.45, 0, 0.5, 0.9); windowAt(parts, 0, 4.4, 2.45, 2.1, 0.5, 0.9); windowAt(parts, 0, 4.4, 2.45, -2.1, 0.5, 0.9);
      windowAt(parts, 0, 6.3, 2.2, 1.0, 0.36, 0.6, false); windowAt(parts, 0, 6.3, 2.2, -1.0, 0.36, 0.6, false);
      flowerBox(parts, 0, 3.75, 2.68, 1.0);
      // gallery deck with corbels, posts and rail
      parts.push({ g: cyl(2.65, 2.65, 0.16, 14), c: wood, m: T(0, 6.9, 0) });
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; parts.push({ g: box(0.18, 0.45, 0.5), c: dwood, m: mul(T(Math.cos(a) * 2.35, 6.62, Math.sin(a) * 2.35), RY(Math.PI / 2 - a)) }); }
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; parts.push({ g: cyl(0.04, 0.04, 0.75, 4), c: wood, m: T(Math.cos(a) * 2.52, 7.3, Math.sin(a) * 2.52) }); }
      parts.push({ g: ring(2.52, 0.05, 16), c: wood, m: T(0, 7.65, 0) });
      // cap
      parts.push({ g: ring(3.08, 0.1, 16), c: dwood, m: T(0, 7.42, 0) });
      shingles(parts, 3.05, 0.5, 7.4, 10.5, 11, roof, 12, 30);
      parts.push({ g: ico(0.28, 0), c: shade(wood, 0.8), m: T(0, 10.6, 0) }, { g: cyl(0.04, 0.04, 1.1, 4), c: iron, m: T(0, 11.2, 0) }, { g: box(0.9, 0.12, 0.04), c: iron, m: T(0.3, 11.6, 0) }, { g: cone(0.12, 0.3, 4), c: iron, m: mul(T(0.82, 11.6, 0), RZ(-Math.PI / 2)) });
      parts.push({ g: J(cyl(0.34, 0.34, 1.6, 6), 0.03, 22).rotateX(Math.PI / 2), c: wood, m: T(0, 8.2, 2.4) });
      // tail pole and hoist beam
      parts.push({ g: box(0.24, 0.24, 8.2), c: wood, m: mul(T(0, 4.7, -4.65), RX(-1.026)) }, { g: box(0.2, 0.2, 1.6), c: dwood, m: T(1.1, 6.2, 2.4) }, { g: cyl(0.025, 0.025, 1.0, 4), c: 0xcbb58a, m: T(1.1, 5.7, 3.1) }, { g: J(ico(0.22, 1), 0.04, 9), c: 0xd9c79c, m: mul(T(1.1, 5.05, 3.1), S(1, 0.8, 0.9)) });
      vines(parts, [[-2.0, 1.8, 1.4, 0.5], [-2.3, 2.6, 0.7, 0.42], [-1.6, 3.4, 1.6, 0.36], [2.3, 1.5, 1.0, 0.45], [2.0, 2.5, 1.5, 0.3]], 60);
      return merge(parts);
    },

    // ---- Brightforge hub: giant anvil on a plinth with chimney, ingots, quench trough and a leaning hammer
    anvil(p) {
      const iron = 0x3a3d4a, iron2 = 0x555a6c, glow = 0xff8a2a, stone = 0x5f5870, brick = 0x6e4a46;
      const parts = [
        { g: J(box(9, 1.2, 6.5), 0.1, 1), c: stone, m: T(0, 0.6, 0) },
        { g: J(box(7.6, 0.6, 5), 0.08, 2), c: shade(stone, 1.12), m: T(0, 1.5, 0) },
        { g: J(box(4.2, 0.8, 2.8), 0.06, 3), c: iron, m: T(0, 2.2, 0) },
        { g: J(cyl(1.0, 1.7, 2.2, 4), 0.06, 4), c: iron, m: mul(T(0, 3.6, 0), RY(Math.PI / 4), S(1.2, 1, 0.8)) },
        { g: J(box(6.0, 1.0, 2.5), 0.07, 5), c: iron2, m: T(0, 5.0, 0) },
        { g: J(cone(1.25, 3.6, 7), 0.08, 6), c: iron2, m: mul(T(4.6, 5.0, 0), RZ(-Math.PI / 2)) },
        { g: J(box(1.4, 0.9, 1.8), 0.06, 7), c: iron2, m: T(-3.3, 4.8, 0) },
        { g: box(2.6, 0.2, 0.55), c: glow, m: T(0.5, 5.6, 0), sh: 0 }, { g: box(1.5, 0.3, 0.7), c: 0xffc24a, m: T(0.9, 5.65, 0), sh: 0 },
        { g: box(0.5, 0.12, 0.5), c: 0x1a1a22, m: T(-1.4, 5.55, 0.4), sh: 0 },
        { g: J(cyl(1.1, 1.7, 11, 8), 0.12, 8), c: brick, m: T(-6.2, 5.5, -1.8), sh: 0.2 },
        { g: cyl(1.45, 1.1, 0.5, 8), c: shade(brick, 0.8), m: T(-6.2, 11.2, -1.8) },
        { g: J(cyl(2.0, 2.2, 0.5, 8), 0.1, 9), c: 0x2e2a2a, m: T(5.8, 0.25, 3.6) }, { g: J(ico(1.6, 0), 0.4, 10), c: 0xff6a22, m: mul(T(5.8, 0.55, 3.6), S(1, 0.35, 1)), sh: 0 },
        { g: cyl(0.14, 0.14, 4.4, 6), c: 0x7a4f2e, m: mul(T(-3.6, 3.0, 3.9), RZ(-0.28)) }, { g: J(box(1.5, 1.0, 1.0), 0.05, 11), c: iron, m: mul(T(-4.3, 5.0, 3.9), RZ(-0.28)) },
        // quench trough with water
        { g: J(box(3.2, 1.0, 1.5), 0.05, 12), c: 0x6a4a2e, m: T(-5.4, 0.5, 4.4) }, { g: box(2.8, 0.1, 1.1), c: 0x3a8ad8, m: T(-5.4, 0.98, 4.4), sh: 0 },
        // ingots stacked beside the plinth
      ];
      for (let i = 0; i < 6; i++) parts.push({ g: box(0.9, 0.3, 0.45), c: i % 2 ? 0xffc24a : 0xe8a83a, m: mul(T(4.9 + (i % 3) * 0.05, 0.18 + Math.floor(i / 3) * 0.32, -3.7 + (i % 3) * 0.5), RY(i * 0.2)), sh: 0.4 });
      // brick bands on the chimney and a sooty collar
      for (const y of [2.5, 5.5, 8.5]) parts.push({ g: J(cyl(1.2 - (y - 2.5) * 0.03, 1.25 - (y - 2.5) * 0.03, 0.22, 8), 0.04, 20 + y), c: shade(brick, 0.7), m: T(-6.2, y, -1.8) });
      return merge(parts);
    },

    // ---- Mistral hub: striped tower with a deck, pennants and a lamp at the door (cups and vane animate)
    windtower(p) {
      const white = 0xf4f6fb, blue = 0x6aa8ff, dblue = 0x3f78d8, gold = 0xffd36a;
      const parts = [
        { g: J(cyl(3.3, 3.7, 0.7, 12), 0.05, 1), c: 0xc8d0e0, m: T(0, 0.35, 0) }, { g: J(cyl(2.8, 3.1, 0.5, 12), 0.05, 2), c: 0xdde3ef, m: T(0, 0.9, 0) },
        { g: J(cyl(1.9, 2.8, 9.8, 12), 0.05, 3), c: white, m: T(0, 5.7, 0), sh: 0.2 },
      ];
      for (let i = 0; i < 5; i++) { const y = 1.8 + i * 1.9; parts.push({ g: cyl(2.65 - (y - 1) * 0.088 + 0.05, 2.67 - (y - 1) * 0.088 + 0.05, 0.5, 12), c: i % 2 ? dblue : blue, m: T(0, y, 0) }); }
      arch(parts, 0, 0.9, 2.45, 1.2, 1.3, 0xc8d0e0, 0x4a5a8a);
      parts.push({ g: cyl(0.04, 0.04, 1.4, 4), c: 0x8a96b0, m: T(1.2, 2.2, 2.45) }, { g: ico(0.22, 1), c: gold, m: T(1.2, 2.95, 2.45), sh: 0 });
      for (let i = 0; i < 4; i++) for (const k of [0, 1.5]) parts.push({ g: box(0.4, 0.7, 0.2), c: 0x2a3a6a, m: mul(RY(i * Math.PI / 2 + 0.5 + k * 0.3), T(0, 4.0 + i * 1.7 - k, 2.1 - i * 0.05)), sh: 0 });
      parts.push({ g: cyl(3.5, 3.0, 0.5, 12), c: blue, m: T(0, 10.6, 0) });
      for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; parts.push({ g: cyl(0.06, 0.06, 1.0, 4), c: white, m: T(Math.cos(a) * 3.25, 11.35, Math.sin(a) * 3.25) }); }
      parts.push({ g: ring(3.25, 0.07, 14), c: white, m: T(0, 11.85, 0) });
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; parts.push({ g: new THREE.ConeGeometry(0.28, 0.9, 3).rotateZ(Math.PI / 2), c: i % 2 ? gold : 0xff7a8a, m: mul(T(Math.cos(a) * 3.25, 11.9, Math.sin(a) * 3.25), RY(-a)) , sh: 0.3 }); }
      parts.push({ g: cyl(1.7, 1.8, 1.9, 12), c: white, m: T(0, 11.7, 0), sh: 0.2 }, { g: cone(2.3, 1.7, 12), c: blue, m: T(0, 13.5, 0) });
      for (let i = 0; i < 4; i++) parts.push({ g: box(0.5, 0.7, 0.2), c: 0x2a3a6a, m: mul(RY(i * Math.PI / 2 + 0.2), T(0, 11.8, 1.72)), sh: 0 });
      parts.push({ g: cyl(0.09, 0.09, 4.4, 5), c: 0x8a96b0, m: T(0, 16.0, 0) });
      return merge(parts);
    },

    // ---- Glimmerdeep hub: stepped runic obelisk with a ring of standing stones (crown crystal floats, animated)
    obeliskhub(p) {
      const st = 0x6a6aa0, st2 = 0x8a8ac8, c1 = pick(p, 'crystal', 0x7fd8ff), c2 = pick(p, 'crystal2', 0xff9aff);
      const parts = [
        { g: J(box(9, 0.5, 9), 0.08, 1), c: shade(st, 0.8), m: T(0, 0.25, 0) }, { g: J(box(7, 0.5, 7), 0.07, 2), c: st, m: T(0, 0.75, 0) }, { g: J(box(5.2, 0.5, 5.2), 0.06, 3), c: shade(st, 1.1), m: T(0, 1.25, 0) },
        { g: J(cyl(1.3, 2.1, 9.5, 4), 0.1, 4), c: st2, m: mul(T(0, 6.3, 0), RY(Math.PI / 4)), sh: 0.2 },
        { g: J(cone(1.35, 2.4, 4), 0.1, 5), c: shade(st2, 1.15), m: mul(T(0, 12.2, 0), RY(Math.PI / 4)) },
      ];
      // rune bands + glyph blocks on each face
      for (const y of [3.0, 5.4, 7.8]) parts.push({ g: cyl(1.5 - (y - 3) * 0.075 + 0.18, 1.55 - (y - 3) * 0.075 + 0.18, 0.18, 4), c: c1, m: mul(T(0, y, 0), RY(Math.PI / 4)), sh: 0 });
      for (let f = 0; f < 4; f++) for (let k = 0; k < 6; k++) { const y = 2.6 + k * 1.15; parts.push({ g: box(0.16 + (k % 2) * 0.1, 0.34, 0.06), c: k % 2 ? c2 : c1, m: mul(RY(f * Math.PI / 2), T((k % 3 - 1) * 0.28, y, 1.78 - k * 0.06)), sh: 0 }); }
      for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, r = 4.6 + (i % 2) * 0.8; parts.push({ g: J(cone(0.45, 2.2 + (i % 3) * 0.6, 5), 0.05, 10 + i), c: i % 2 ? c1 : c2, m: mul(T(Math.cos(a) * r, 1.1 + (i % 3) * 0.3, Math.sin(a) * r), RZ((i % 2 ? 1 : -1) * 0.25)), sh: 0.4 }); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2, r = 7.4; parts.push({ g: J(box(0.8, 2.2 + (i % 3) * 0.5, 0.8), 0.1, 30 + i), c: shade(st, 0.9 + (i % 2) * 0.12), m: mul(T(Math.cos(a) * r, 1.1 + (i % 3) * 0.25, Math.sin(a) * r), RY(a), RZ((i % 3 - 1) * 0.06)), sh: 0.3 }); parts.push({ g: ico(0.12, 0), c: c1, m: T(Math.cos(a) * (r - 0.45), 1.6 + (i % 3) * 0.4, Math.sin(a) * (r - 0.45)), sh: 0 }); }
      return merge(parts);
    },

    // ---- Duskmarket hub: stone clock tower with timber frame, lit windows, shingled roof and lamp at the door
    clocktower(p) {
      const stone = 0x6a5a7a, plaster = 0xd9ccb8, beam = 0x4a3a30, roof = 0xb04a3a, gold = 0xffd36a, glowc = 0xffd36a;
      const parts = [
        { g: J(box(7.2, 5, 7.2), 0.08, 1), c: stone, m: T(0, 2.5, 0), sh: 0.2 },
        { g: J(box(6.2, 5.4, 6.2), 0.05, 2), c: plaster, m: T(0, 7.7, 0), sh: 0.2 },
        { g: J(box(6.8, 0.5, 6.8), 0.05, 3), c: shade(stone, 0.9), m: T(0, 5.2, 0) },
        { g: J(box(6.6, 4.4, 6.6), 0.07, 4), c: shade(stone, 1.1), m: T(0, 12.4, 0), sh: 0.2 },
        { g: J(box(7.4, 0.5, 7.4), 0.05, 5), c: shade(stone, 0.85), m: T(0, 10.4, 0) }, { g: J(box(7.4, 0.5, 7.4), 0.05, 6), c: shade(stone, 0.85), m: T(0, 14.7, 0) },
        { g: box(0.34, 5.4, 0.34), c: shade(stone, 0.8), m: T(3.55, 2.7, 3.55) }, { g: box(0.34, 5.4, 0.34), c: shade(stone, 0.8), m: T(-3.55, 2.7, 3.55) },
        { g: cyl(0.09, 0.09, 3.0, 5), c: gold, m: T(0, 21.0, 0) }, { g: ico(0.3, 1), c: gold, m: T(0, 22.6, 0), sh: 0 },
        { g: box(1.2, 0.08, 0.7), c: 0xe05a5a, m: mul(T(0.6, 22.2, 0), RZ(0.1)), sh: 0.2 },
      ];
      for (let i = 0; i < 10; i++) parts.push({ g: J(cone(1, 1, 4), 0.02, 70 + i), c: i % 2 ? shade(roof, 0.88) : shade(roof, 1.08), m: mul(T(0, 15.2 + i * 0.52, 0), RY(Math.PI / 4), S(5.3 - i * 0.5, 0.72, 5.3 - i * 0.5)), sh: 0.4 });
      arch(parts, 0, 0, 3.7, 1.5, 1.9, 0x7a6a8a, beam);
      parts.push({ g: cyl(0.04, 0.04, 1.0, 4), c: 0x2e2a3c, m: T(2.0, 2.9, 3.75) }, { g: ico(0.2, 1), c: glowc, m: T(2.0, 2.3, 3.75), sh: 0 }, { g: box(0.34, 0.34, 0.34), c: 0x2e2a3c, m: T(2.0, 2.3, 3.75), sh: 0 });
      for (const x of [-2.9, 0, 2.9]) parts.push({ g: box(0.22, 5.4, 0.22), c: beam, m: T(x, 7.7, 3.12) }, { g: box(0.22, 5.4, 0.22), c: beam, m: T(x, 7.7, -3.12) });
      for (const y of [5.4, 7.7, 10.0]) parts.push({ g: box(6.4, 0.22, 0.24), c: beam, m: T(0, y, 3.13) }, { g: box(6.4, 0.22, 0.24), c: beam, m: T(0, y, -3.13) });
      for (const s of [-1, 1]) parts.push({ g: box(0.26, 6.2, 0.18), c: beam, m: mul(T(s * 1.5, 7.7, 3.14), RZ(s * 0.6)) });
      for (const [x, y] of [[-1.5, 6.6], [1.5, 6.6], [-1.5, 8.8], [1.5, 8.8]]) { windowAt(parts, x, y, 3.2, 0, 0.7, 0.9, true); parts.push({ g: box(0.62, 0.8, 0.12), c: glowc, m: T(x, y, 3.28), sh: 0 }); windowAt(parts, x, y, -3.2, Math.PI, 0.7, 0.9, false); }
      flowerBox(parts, -1.5, 5.95, 3.34, 1.0); flowerBox(parts, 1.5, 5.95, 3.34, 1.0);
      for (let i = 0; i < 4; i++) parts.push({ g: box(1.3, 1.5, 0.3), c: 0x1a1428, m: mul(RY(i * Math.PI / 2 + Math.PI / 4), T(0, 15.1, 3.9)), sh: 0 });
      const face = (m) => {
        parts.push({ g: cyl(1.8, 1.8, 0.3, 20).rotateX(Math.PI / 2), c: 0xfff2c8, m: mul(m, T(0, 0, 0.1)), sh: 0 }, { g: ring(1.85, 0.1, 20).rotateX(Math.PI / 2), c: gold, m: mul(m, T(0, 0, 0.26)) });
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; parts.push({ g: box(i % 3 ? 0.1 : 0.18, i % 3 ? 0.26 : 0.4, 0.06), c: 0x3a2e3a, m: mul(m, T(Math.sin(a) * 1.5, Math.cos(a) * 1.5, 0.3), RZ(-a)), sh: 0 }); }
        parts.push({ g: box(0.13, 1.25, 0.08), c: 0x2a2030, m: mul(m, T(0.18, 0.5, 0.33), RZ(-0.3)), sh: 0 }, { g: box(0.18, 0.9, 0.08), c: 0x2a2030, m: mul(m, T(-0.3, -0.1, 0.34), RZ(1.9)), sh: 0 });
      };
      face(T(0, 12.4, 3.4)); face(mul(RY(Math.PI), T(0, 12.4, 3.4))); face(mul(RY(Math.PI / 2), T(0, 12.4, 3.4))); face(mul(RY(-Math.PI / 2), T(0, 12.4, 3.4)));
      return merge(parts);
    },

    // ---- Clockwork Mill: timber-and-stone house, shingled hip roof, shutters, flower boxes, sacks, lamp at the door
    millhouse(p) {
      const stone = 0x9a8f86, plaster = 0xe4d6bc, beam = 0x5a3e2a, roof = 0x8a4a3a, wood = 0x8a5a33;
      const parts = [
        { g: J(box(14, 2.4, 8), 0.1, 1), c: stone, m: T(0, 1.2, 0), sh: 0.2 }, { g: J(box(13.4, 3.0, 7.4), 0.06, 2), c: plaster, m: T(0, 3.9, 0), sh: 0.2 },
        { g: J(box(14.4, 0.35, 8.4), 0.05, 3), c: beam, m: T(0, 2.5, 0) }, { g: J(box(14.4, 0.35, 8.4), 0.05, 4), c: beam, m: T(0, 5.4, 0) },
        { g: J(box(1.4, 4.2, 1.4), 0.05, 6), c: stone, m: T(-4.5, 7.4, 1.2) }, { g: box(1.8, 0.3, 1.8), c: shade(stone, 0.8), m: T(-4.5, 9.6, 1.2) }, { g: box(0.9, 0.4, 0.9), c: 0x2a2420, m: T(-4.5, 9.9, 1.2) },
      ];
      for (let i = 0; i < 9; i++) parts.push({ g: J(cone(1, 1, 4), 0.02, 5 + i), c: i % 2 ? shade(roof, 0.88) : shade(roof, 1.08), m: mul(T(0, 5.7 + i * 0.4, 0), RY(Math.PI / 4), S(10.8 - i * 1.0, 0.62, 6.5 - i * 0.62)), sh: 0.4 });
      parts.push({ g: box(1.6, 1.3, 1.3), c: plaster, m: T(2.6, 7.7, 2.5) }, { g: J(cone(1.3, 1.1, 4), 0.02, 40), c: shade(roof, 1.05), m: mul(T(2.6, 8.9, 2.5), RY(Math.PI / 4)) });
      windowAt(parts, 2.6, 7.7, 3.18, 0, 0.6, 0.7, true);
      arch(parts, 0, 0, 4.12, 1.5, 1.8, 0xb8a78e, wood);
      parts.push({ g: box(2.6, 0.18, 1.2), c: shade(roof, 0.9), m: mul(T(0, 3.15, 4.6), RX(0.35)) }, { g: cyl(0.05, 0.05, 0.9, 4), c: 0x2e2a3c, m: T(1.6, 2.4, 4.15) }, { g: ico(0.2, 1), c: 0xffd36a, m: T(1.6, 1.85, 4.15), sh: 0 });
      for (let i = -3; i <= 3; i++) parts.push({ g: box(0.2, 3.0, 0.14), c: beam, m: T(i * 1.9, 3.9, 3.72) }, { g: box(0.2, 3.0, 0.14), c: beam, m: T(i * 1.9, 3.9, -3.72) });
      for (const s of [-1, 1]) parts.push({ g: box(0.22, 3.1, 0.14), c: beam, m: mul(T(s * 4.4, 3.9, 3.73), RZ(s * 0.7)) });
      for (const x of [-4.4, 4.4]) { windowAt(parts, x, 4.0, 3.84, 0, 0.9, 1.0, true); parts.push({ g: box(0.82, 0.9, 0.12), c: 0xffd36a, m: T(x, 4.0, 3.9), sh: 0 }); flowerBox(parts, x, 3.3, 4.0, 1.4); }
      for (const x of [-3, 3]) windowAt(parts, x, 1.5, 4.02, 0, 0.5, 0.6, false);
      for (let i = 0; i < 5; i++) { const a = i * 1.7; parts.push({ g: J(ico(0.5, 0), 0.25, 50 + i), c: shade(stone, 0.9 + (i % 3) * 0.1), m: mul(T(-6.4 + i * 3.3, 0.25, 4.5 + Math.sin(a) * 0.3), S(1.3, 0.6, 1)), sh: 0.5 }); }
      parts.push({ g: J(ico(0.5, 1), 0.1, 60), c: 0xd9c08a, m: mul(T(-3.1, 0.45, 5.2), S(0.9, 1, 0.8)) }, { g: J(ico(0.45, 1), 0.1, 61), c: 0xcdb27a, m: mul(T(-2.3, 0.4, 5.5), S(0.9, 1, 0.8)) }, { g: J(ico(0.45, 1), 0.1, 62), c: 0xd9c08a, m: mul(T(-2.7, 0.95, 5.3), S(0.9, 1, 0.8)) });
      parts.push({ g: J(box(1.2, 2.0, 1.6), 0.05, 20), c: stone, m: T(8.4, 1.0, -3.2) });
      vines(parts, [[-6.8, 1.6, 0.8, 0.7], [-6.9, 2.8, 2.2, 0.6], [-6.7, 1.0, -1.6, 0.55], [6.8, 1.4, -2.4, 0.5]], 80);
      return merge(parts);
    },

    // ---- Old Quarry: timber mine mouth with rock surround, rails, sign, tool rack, ore sacks and a loaded cart
    mineentrance(p) {
      const wood = 0x7a4f2e, wood2 = 0x5e3c22, iron = 0x3a3d4a, rock = pick(p, 'rock', 0xb8a59a), rock2 = pick(p, 'rock2', 0xd0bdb0);
      const parts = [
        { g: J(box(0.8, 5.6, 0.8), 0.05, 1), c: wood, m: T(-3, 2.8, 0) }, { g: J(box(0.8, 5.6, 0.8), 0.05, 2), c: wood, m: T(3, 2.8, 0) },
        { g: J(box(7.6, 0.8, 0.9), 0.05, 3), c: wood2, m: T(0, 5.7, 0) }, { g: J(box(8.4, 0.5, 1.1), 0.05, 4), c: wood, m: T(0, 6.35, 0) },
        { g: box(0.45, 2.6, 0.4), c: wood2, m: mul(T(-2.2, 4.7, 0), RZ(-0.7)) }, { g: box(0.45, 2.6, 0.4), c: wood2, m: mul(T(2.2, 4.7, 0), RZ(0.7)) },
        { g: box(3.2, 0.9, 0.2), c: 0x6a5238, m: T(0, 6.1, 0.55), sh: 0.2 }, { g: box(2.6, 0.14, 0.06), c: 0xffd36a, m: T(0, 6.35, 0.68), sh: 0 }, { g: box(2.0, 0.1, 0.06), c: 0xffd36a, m: T(0, 6.0, 0.68), sh: 0 },
        { g: cyl(0.04, 0.04, 0.7, 4), c: iron, m: T(0, 4.9, 0.2) }, { g: box(0.34, 0.34, 0.34), c: iron, m: T(0, 4.35, 0.2), sh: 0 },
        { g: J(ico(2.3, 0), 1.0, 5), c: rock, m: mul(T(-5.6, 2.2, -0.4), S(1.0, 1.4, 0.9)), sh: 0.5 }, { g: J(ico(2.1, 0), 0.9, 6), c: rock2, m: mul(T(5.6, 1.9, -0.3), S(1.0, 1.3, 0.9)), sh: 0.5 },
        { g: J(ico(2.6, 0), 1.0, 7), c: shade(rock, 0.92), m: mul(T(-2.2, 7.4, -1.2), S(1.5, 0.9, 1.0)), sh: 0.5 }, { g: J(ico(2.4, 0), 1.0, 8), c: rock, m: mul(T(2.8, 7.2, -1.2), S(1.4, 0.9, 1.0)), sh: 0.5 },
        { g: J(ico(1.6, 0), 0.7, 9), c: rock2, m: T(-6.8, 0.9, 1.5), sh: 0.5 },
        { g: box(0.16, 0.14, 14), c: iron, m: T(-0.7, 0.18, 2.5) }, { g: box(0.16, 0.14, 14), c: iron, m: T(0.7, 0.18, 2.5) },
      ];
      for (let i = 0; i < 10; i++) parts.push({ g: box(2.0, 0.12, 0.35), c: wood2, m: T(0, 0.08, -3.6 + i * 1.5) });
      const cm = T(-4.2, 0, 3.4);
      parts.push({ g: box(1.7, 0.9, 1.2), c: 0x6a5238, m: mul(cm, T(0, 0.85, 0)), sh: 0.2 }, { g: box(1.8, 0.14, 1.3), c: iron, m: mul(cm, T(0, 1.3, 0)) });
      for (const [x, z] of [[-0.6, 0.62], [0.6, 0.62], [-0.6, -0.62], [0.6, -0.62]]) parts.push({ g: cyl(0.3, 0.3, 0.12, 8).rotateX(Math.PI / 2), c: iron, m: mul(cm, T(x, 0.32, z)) });
      parts.push({ g: J(ico(0.5, 0), 0.2, 11), c: 0xffd36a, m: mul(cm, T(-0.2, 1.45, 0.1)), sh: 0.5 }, { g: J(ico(0.42, 0), 0.2, 12), c: 0x8a8f9a, m: mul(cm, T(0.35, 1.4, -0.1)), sh: 0.5 }, { g: J(ico(0.3, 0), 0.15, 13), c: 0xff8a8a, m: mul(cm, T(0.1, 1.6, 0.3)), sh: 0.5 });
      parts.push({ g: cyl(0.42, 0.42, 0.9, 8), c: wood, m: T(4.3, 0.45, 3.0) }, { g: ring(0.43, 0.04, 8), c: iron, m: T(4.3, 0.28, 3.0) }, { g: ring(0.43, 0.04, 8), c: iron, m: T(4.3, 0.7, 3.0) }, { g: cyl(0.42, 0.42, 0.9, 8), c: shade(wood, 0.9), m: T(5.2, 0.45, 2.3) });
      // ore sacks, tool rack with pick and shovel, hanging sign
      for (let i = 0; i < 3; i++) parts.push({ g: J(ico(0.45, 1), 0.1, 30 + i), c: [0xb59a6a, 0xa68a5a, 0xc2a874][i], m: mul(T(2.6 + i * 0.85, 0.4 + (i === 1 ? 0.5 : 0), 3.6 - (i === 1 ? 0.3 : 0)), S(1, 0.85, 0.9)), sh: 0.4 });
      parts.push({ g: box(1.6, 0.14, 0.14), c: wood2, m: T(-1.6, 2.1, -1.5) }, { g: box(0.14, 2.2, 0.14), c: wood2, m: T(-2.4, 1.1, -1.5) }, { g: box(0.14, 2.2, 0.14), c: wood2, m: T(-0.8, 1.1, -1.5) },
        { g: cyl(0.04, 0.04, 1.7, 4), c: wood, m: mul(T(-1.9, 1.3, -1.35), RZ(0.12)) }, { g: box(0.7, 0.14, 0.12), c: iron, m: mul(T(-1.75, 2.2, -1.35), RZ(0.12)) }, { g: cyl(0.04, 0.04, 1.7, 4), c: wood, m: mul(T(-1.3, 1.3, -1.35), RZ(-0.1)) }, { g: box(0.34, 0.5, 0.1), c: iron, m: mul(T(-1.2, 0.5, -1.35), RZ(-0.1)) });
      return merge(parts);
    },
  };
}

// ---------------------------------------------------------------- animated parts
// Each builder returns { obj, update(t) }; buildDecor places one per decor entry whose kind is listed here.
export function landmarkAnim(H) {
  const { merge, J, T, S, RY, RZ, RX, mul, cone, cyl, ico, box, shade, THREE } = H;
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
  const glowTex = (() => { let t = null; return () => { if (t) return t; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); t = new THREE.CanvasTexture(c); return t; }; })();
  const glow = (color, scale, op = 1, add = true) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, transparent: true, opacity: op })); s.scale.setScalar(scale); return s; };
  const smoke = (x, y, z, n, size) => {
    const g = new THREE.Group(); g.position.set(x, y, z); const puffs = [];
    for (let i = 0; i < n; i++) { const s = glow(0xcfcfd8, size, 0.5, false); g.add(s); puffs.push({ s, o: i / n }); }
    return { obj: g, update: (t) => puffs.forEach((p) => { const f = (t * 0.16 + p.o) % 1; p.s.position.set(Math.sin(t * 0.7 + p.o * 9) * 0.5 * f + f * 1.2, f * 5.5, Math.cos(t * 0.5 + p.o * 7) * 0.4 * f); p.s.scale.setScalar(size * (0.6 + f * 1.8)); p.s.material.opacity = 0.5 * Math.sin(f * Math.PI) * (1 - f * 0.4); }) };
  };
  const group = (...kids) => { const g = new THREE.Group(); kids.forEach((k) => g.add(k)); return g; };

  return {
    windmill_anim(p) {
      const wood = 0x7a4f2e, dwood = 0x4e3220, parts = [];
      for (let k = 0; k < 4; k++) {
        const base = RZ(k * Math.PI / 2);
        parts.push({ g: box(0.2, 7.4, 0.16), c: wood, m: mul(base, T(0, 3.9, 0)) });
        for (let r = 1.2; r < 7.2; r += 0.75) parts.push({ g: box(1.55, 0.07, 0.09), c: dwood, m: mul(base, T(0.78, r, 0.02)) });
        parts.push({ g: box(0.07, 5.8, 0.1), c: dwood, m: mul(base, T(1.58, 4.2, 0.02)) }, { g: box(1.6, 0.08, 0.1), c: dwood, m: mul(base, T(0.8, 7.1, 0.02)) });
        for (let i = 0; i < 7; i++) parts.push({ g: box(1.3, 0.8, 0.03), c: i % 2 ? 0xf2ead4 : 0xe4d6b4, m: mul(base, RY(0.1 + i * 0.05), T(0.8, 1.55 + i * 0.82, 0.05)), sh: 0.1 });
      }
      parts.push({ g: ico(0.5, 1), c: shade(wood, 0.8), m: T(0, 0, 0.1) }, { g: cyl(0.3, 0.3, 0.25, 8).rotateX(Math.PI / 2), c: 0x2c2c34, m: T(0, 0, 0.3) });
      const sails = new THREE.Mesh(merge(parts), mat), root = group(sails); root.position.set(0, 8.2, 3.35);
      return { obj: root, update: (t) => { sails.rotation.z = -t * 0.45; } };
    },
    millhouse_anim(p) {
      const wood = 0x8a5a33, beam = 0x5a3e2a, parts = [];
      for (const z of [-0.6, 0.6]) parts.push({ g: new THREE.TorusGeometry(2.7, 0.14, 5, 18), c: wood, m: T(0, 0, z) });
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; parts.push({ g: box(0.16, 5.3, 0.16), c: wood, m: RZ(a) }, { g: box(0.2, 0.5, 1.5), c: shade(wood, 0.9), m: mul(RZ(a), T(0, 2.75, 0)) }); }
      parts.push({ g: cyl(0.34, 0.34, 2.2, 6).rotateX(Math.PI / 2), c: beam });
      const wheel = new THREE.Mesh(merge(parts), mat), wroot = group(wheel); wroot.position.set(8.4, 2.9, 0); wroot.rotation.y = Math.PI / 2;
      const sm = smoke(-4.5, 10.1, 1.2, 6, 1.3);
      const root = group(wroot, sm.obj);
      return { obj: root, update: (t) => { wheel.rotation.z = t * 0.9; sm.update(t); } };
    },
    anvil_anim(p) {
      const flame = glow(0xffa23a, 4.5, 0.7); flame.position.set(-6.2, 12.4, -1.8);
      const embers = []; const g = new THREE.Group(); g.add(flame);
      for (let i = 0; i < 9; i++) { const e = glow(0xffc060, 0.35, 0.9); g.add(e); embers.push({ e, o: i / 9, x: (i % 3 - 1) * 0.3 }); }
      const hot = glow(0xff7a22, 3.2, 0.5); hot.position.set(5.8, 1.1, 3.6); g.add(hot);
      const sm = smoke(-6.2, 12.0, -1.8, 7, 1.8); g.add(sm.obj);
      return { obj: g, update: (t) => { flame.material.opacity = 0.6 + Math.sin(t * 13) * 0.12; flame.scale.setScalar(4.3 + Math.sin(t * 9) * 0.4); hot.material.opacity = 0.4 + Math.sin(t * 7) * 0.1; embers.forEach((m) => { const f = (t * 0.45 + m.o) % 1; m.e.position.set(-6.2 + m.x + Math.sin(t * 3 + m.o * 8) * 0.4, 11.6 + f * 6, -1.8 + Math.cos(t * 2 + m.o * 6) * 0.4); m.e.material.opacity = 0.9 * (1 - f); m.e.scale.setScalar(0.35 * (1 - f * 0.6)); }); sm.update(t); } };
    },
    windtower_anim(p) {
      const parts = [];
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; parts.push({ g: box(2.2, 0.09, 0.09), c: 0xaab4c8, m: mul(RY(a), T(1.1, 0, 0)) }, { g: ico(0.3, 1), c: i === 0 ? 0xffd36a : 0x6aa8ff, m: mul(RY(a), T(2.25, 0, 0)) }); }
      const cups = new THREE.Mesh(merge(parts), mat); cups.position.set(0, 17.4, 0);
      const vane = new THREE.Mesh(merge([{ g: box(2.0, 0.1, 0.5), c: 0xffd36a }, { g: cone(0.35, 0.8, 4).rotateZ(-Math.PI / 2), c: 0xffd36a, m: T(1.3, 0, 0) }, { g: box(0.5, 0.7, 0.08), c: 0xffb23e, m: T(-1.0, 0.3, 0) }]), mat); vane.position.set(0, 15.0, 0);
      return { obj: group(cups, vane), update: (t) => { cups.rotation.y = t * 2.4; vane.rotation.y = Math.sin(t * 0.5) * 1.2 + 0.6; } };
    },
    obeliskhub_anim(p) {
      const c1 = p.crystal !== undefined ? p.crystal : 0x7fd8ff, c2 = p.crystal2 !== undefined ? p.crystal2 : 0xff9aff;
      const top = new THREE.Mesh(merge([{ g: J(cone(0.75, 1.9, 5), 0.06, 6), c: c2, m: T(0, 0.9, 0), sh: 0.4 }, { g: J(cone(0.75, 1.5, 5), 0.06, 7), c: c1, m: mul(T(0, -0.7, 0), RX(Math.PI)), sh: 0.4 }]), mat);
      top.position.set(0, 13.8, 0);
      const halo = glow(c1, 6, 0.4); halo.position.y = 13.8;
      const orbit = []; const g = group(top, halo);
      for (let i = 0; i < 4; i++) { const s = new THREE.Mesh(merge([{ g: new THREE.OctahedronGeometry(0.22, 0), c: i % 2 ? c1 : c2, sh: 0.2 }]), mat); g.add(s); orbit.push(s); }
      return { obj: g, update: (t) => { top.rotation.y = t * 0.9; top.position.y = 13.8 + Math.sin(t * 1.4) * 0.35; halo.position.y = top.position.y; halo.material.opacity = 0.35 + Math.sin(t * 2.2) * 0.1; orbit.forEach((s, i) => { const a = t * 1.3 + i * 1.57; s.position.set(Math.cos(a) * 1.6, top.position.y + Math.sin(t * 2 + i) * 0.5, Math.sin(a) * 1.6); s.rotation.y = t * 2; }); } };
    },
    clocktower_anim(p) {
      const g = new THREE.Group(); const lamp = glow(0xffd36a, 3.2, 0.5); lamp.position.set(2.0, 2.3, 3.75); g.add(lamp);
      const flags = new THREE.Mesh(merge([{ g: box(1.2, 0.08, 0.7), c: 0xe05a5a }]), mat); flags.position.set(0.6, 22.2, 0); g.add(flags);
      return { obj: g, update: (t) => { lamp.material.opacity = 0.45 + Math.sin(t * 8) * 0.07; flags.rotation.z = Math.sin(t * 3) * 0.12; } };
    },
    mineentrance_anim(p) {
      const l = glow(0xffd36a, 3.0, 0.55); l.position.set(0, 4.35, 0.2);
      return { obj: group(l), update: (t) => { l.material.opacity = 0.5 + Math.sin(t * 9) * 0.07 + Math.sin(t * 5.3) * 0.05; } };
    },
  };
}
