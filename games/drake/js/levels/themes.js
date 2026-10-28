// Per-world look: ground colours, sky, fog, decor palette, plus matching scatter presets.
export const THEMES = {
  mossgate: {
    grass: 0x58c76a, grass2: 0x7ad98a, rock: 0x9aa2b5, sand: 0xe6d79b, sandBelow: -0.3,
    sky: [0x3b8fff, 0xbfeaff], fog: 0xc4ecff, fogNear: 70, fogFar: 190, water: 0x3fb8ff,
    palette: { leaf: 0x2fae5a, leaf2: 0x46c870, trunk: 0x7a4f2e, moss: 0x5fae5c },
  },
  forge: {
    grass: 0x8a5a44, grass2: 0xa26a4c, rock: 0x5a4a52, sand: 0x3a2a2a, sandBelow: -0.2,
    sky: [0x3a1a2e, 0xff8a4a], fog: 0xff9a5c, fogNear: 55, fogFar: 160, water: 0xff6a2a,
    hemiSky: 0xffc9a0, hemiGround: 0x5a2a1a, sun: 0xffb070, hemi: 0.9,
    palette: { leaf: 0x7a3a2a, leaf2: 0x9a4a30, trunk: 0x3a2a2a, rock: 0x6a5a62, rock2: 0x8a7a82, crystal: 0xff9a4a, crystal2: 0xffd24a, stone: 0x6a5a62, stone2: 0x8a7a82 },
  },
  sky: {
    grass: 0x84e0a2, grass2: 0xa4efbc, rock: 0xb8c2d8, sand: 0xf0f6ff, sandBelow: -5,
    sky: [0x4a8aff, 0xfff1dc], fog: 0xe8f2ff, fogNear: 90, fogFar: 260, water: 0x7ac8ff,
    hemiSky: 0xffffff, hemiGround: 0xb8c8e0, hemi: 1.0,
    palette: { leaf: 0x59c98a, leaf2: 0x7fe0a8, trunk: 0xb59a7a, rock: 0xc8d0e0, rock2: 0xe0e6f2, crystal: 0xbfe8ff, crystal2: 0xffd0e8, stone: 0xe0e4f0, stone2: 0xf4f6fc },
  },
  crystal: {
    grass: 0x2fa8a0, grass2: 0x4cc8b8, rock: 0x5a5a8a, sand: 0x8a7acb, sandBelow: -0.2,
    sky: [0x14122e, 0x2f2a66], fog: 0x2a2a5a, fogNear: 40, fogFar: 140, water: 0x3a8aff,
    hemiSky: 0xa8b8ff, hemiGround: 0x2a2a5a, sun: 0xb8a8ff, sunI: 0.6, hemi: 0.95,
    palette: { leaf: 0x3ab89a, leaf2: 0x5ad8b8, trunk: 0x4a3a7a, rock: 0x6a6a9a, rock2: 0x8a8ab8, crystal: 0x7fe8ff, crystal2: 0xff9aff, cap: 0xff7ad8, stone: 0x7a7aa8, stone2: 0x9a9ac8 },
  },
  night: {
    grass: 0x6a7c98, grass2: 0x7a8caa, rock: 0x7a7a9a, sand: 0x4a4a6a, sandBelow: -0.2,
    sky: [0x080a26, 0x38285a], fog: 0x2a2248, fogNear: 50, fogFar: 165, water: 0x3a5aaf,
    hemiSky: 0xa8b4ff, hemiGround: 0x3a3a5a, sun: 0xb0bcff, sunI: 0.7, hemi: 1.0,
    palette: { leaf: 0x2a4a5a, leaf2: 0x3a5a6a, trunk: 0x3a3048, rock: 0x6a6a8a, rock2: 0x8a8aaa, lamp: 0xffd36a, stone: 0x8a88a8, stone2: 0xa8a6c4, crystal: 0xffc86a, crystal2: 0xff8a6a },
  },
  keep: {
    grass: 0x4a3a56, grass2: 0x5a4a68, rock: 0x6a5a7a, sand: 0x2a1a30, sandBelow: -0.2,
    sky: [0x1a0a22, 0x6a2a4a], fog: 0x3a1a3a, fogNear: 40, fogFar: 135, water: 0xb03a6a,
    hemiSky: 0xc89ac8, hemiGround: 0x2a1a3a, sun: 0xff9a8a, sunI: 0.7, hemi: 0.8,
    palette: { leaf: 0x3a2a4a, leaf2: 0x4a3a5a, trunk: 0x2a2030, rock: 0x6a5a7a, rock2: 0x8a7a9a, crystal: 0xff5a7a, crystal2: 0xff9a5a, stone: 0x5a4a6a, stone2: 0x7a6a8a, lamp: 0xff6a4a },
  },
};

// Scatter (decor) presets matching each theme. `big` adds distant mountain trees/rocks on the rim.
export const SCATTER = {
  mossgate: [
    { k: 'tree', n: 40, where: 'low', solid: 0.7, spacing: 8, maxSlope: 0.22 }, { k: 'roundtree', n: 30, where: 'low', solid: 0.7, spacing: 8, maxSlope: 0.22 },
    { k: 'rock', n: 30, where: 'any', solid: 0.9, spacing: 7 }, { k: 'ruin', n: 4, where: 'any', spacing: 20, solid: 1.1 }, { k: 'flower', n: 220, where: 'low' }, { k: 'tuft', n: 260, where: 'any', s0: 0.8, s1: 1.5 }, { k: 'tree', n: 60, where: 'any', minH: 14, s0: 1.4, s1: 2.2 },
  ],
  forge: [
    { k: 'rock', n: 70, where: 'any', solid: 0.9, spacing: 6, s0: 0.9, s1: 1.8 }, { k: 'crystal', n: 28, where: 'any', spacing: 11, s0: 0.8, s1: 1.5 },
    { k: 'pillar', n: 8, where: 'any', spacing: 20, solid: 1.0, s0: 0.9, s1: 1.2 }, { k: 'ruin', n: 8, where: 'any', spacing: 14, solid: 1.1 }, { k: 'tuft', n: 90, where: 'any', s0: 0.5, s1: 1 }, { k: 'lamppost', n: 10, where: 'any', spacing: 18 },
  ],
  sky: [
    { k: 'roundtree', n: 40, where: 'any', solid: 0.7, spacing: 8, maxSlope: 0.22 }, { k: 'pillar', n: 8, where: 'any', spacing: 16, solid: 1.0 }, { k: 'ruin', n: 7, where: 'any', spacing: 14, solid: 1.1 },
    { k: 'crystal', n: 24, where: 'any', spacing: 12 }, { k: 'tuft', n: 240, where: 'any', s0: 0.8, s1: 1.4 }, { k: 'flower', n: 140, where: 'any' },
  ],
  crystal: [
    { k: 'crystal', n: 70, where: 'any', spacing: 6, s0: 0.9, s1: 2.0 }, { k: 'mushroom', n: 60, where: 'any', s0: 0.8, s1: 1.8 },
    { k: 'rock', n: 40, where: 'any', solid: 0.9, spacing: 7 }, { k: 'tuft', n: 160, where: 'any', s0: 0.8, s1: 1.2 },
  ],
  night: [
    { k: 'lamppost', n: 26, where: 'any', spacing: 12 }, { k: 'pillar', n: 10, where: 'any', spacing: 14, solid: 1.0 }, { k: 'ruin', n: 8, where: 'any', spacing: 12, solid: 1.1 },
    { k: 'rock', n: 36, where: 'any', solid: 0.9, spacing: 8 }, { k: 'tree', n: 24, where: 'any', solid: 0.7, spacing: 10, maxSlope: 0.22 }, { k: 'tuft', n: 90, where: 'any', s0: 0.6, s1: 1.1 },
  ],
  keep: [
    { k: 'pillar', n: 14, where: 'any', spacing: 12, solid: 1.1, s0: 1.0, s1: 1.5 }, { k: 'ruin', n: 12, where: 'any', spacing: 11, solid: 1.1, s0: 1.0, s1: 1.4 }, { k: 'crystal', n: 26, where: 'any', spacing: 12 },
    { k: 'rock', n: 50, where: 'any', solid: 0.9, spacing: 7 }, { k: 'lamppost', n: 14, where: 'any', spacing: 16 },
  ],
};

export const WORLD_NAMES = { mossgate: 'Mossgate Meadows', brightforge: 'Brightforge Vale', mistral: 'Mistral Heights', glimmerdeep: 'Glimmerdeep', duskmarket: 'Duskmarket', keep: "Gloam's Keep" };
