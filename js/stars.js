/* Parallax starfield + nebula backdrop. ARC_STARS.warp(on) streaks the stars for launches. */
(function () {
  const c = document.getElementById('stars'), g = c.getContext('2d');
  let W = 0, H = 0, stars = [], warp = 0, warpTarget = 0, hue = 190, hueT = 190, neb = null, last = 0;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function nebula() {
    neb = document.createElement('canvas'); neb.width = Math.ceil(W / 3); neb.height = Math.ceil(H / 3);
    const n = neb.getContext('2d');
    [[.2, .3, .55, 230], [.8, .25, .5, 290], [.55, .85, .6, 190], [.1, .9, .4, 260]].forEach(([x, y, r, h]) => {
      const gr = n.createRadialGradient(x * neb.width, y * neb.height, 0, x * neb.width, y * neb.height, r * neb.width);
      gr.addColorStop(0, `hsla(${h},90%,45%,.22)`); gr.addColorStop(1, 'hsla(0,0%,0%,0)');
      n.fillStyle = gr; n.fillRect(0, 0, neb.width, neb.height);
    });
  }
  function resize() {
    const d = Math.min(devicePixelRatio || 1, 1.5);
    W = innerWidth; H = innerHeight; c.width = W * d; c.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
    const n = Math.round(W * H / 5200);
    stars = Array.from({ length: Math.min(n, 380) }, () => ({ x: Math.random() * W, y: Math.random() * H, z: Math.random() * .9 + .1, t: Math.random() * 6 }));
    nebula(); if (reduce) frame(0);
  }
  function frame(t) {
    const dt = Math.min((t - last) / 1000 || .016, .05); last = t;
    warp += (warpTarget - warp) * Math.min(1, dt * 5);
    hue += (hueT - hue) * Math.min(1, dt * 3);
    g.fillStyle = '#04060f'; g.fillRect(0, 0, W, H);
    g.globalAlpha = 1; g.drawImage(neb, 0, 0, W, H);
    const tint = g.createRadialGradient(W * .7, H * .5, 0, W * .7, H * .5, W * .6);
    tint.addColorStop(0, `hsla(${hue},100%,50%,.07)`); tint.addColorStop(1, 'transparent');
    g.fillStyle = tint; g.fillRect(0, 0, W, H);
    const sp = (reduce ? 0 : 14) + warp * 900;
    for (const s of stars) {
      s.y += sp * s.z * dt; s.t += dt;
      if (s.y > H) { s.y -= H; s.x = Math.random() * W; }
      const a = (.35 + .65 * Math.abs(Math.sin(s.t * s.z * 2))) * s.z;
      g.strokeStyle = `hsla(${200 + s.z * 40},80%,${75 + s.z * 25}%,${a})`;
      g.lineWidth = s.z * 1.6;
      g.beginPath(); g.moveTo(s.x, s.y); g.lineTo(s.x, s.y - 1 - warp * 60 * s.z); g.stroke();
    }
    if (!reduce) requestAnimationFrame(frame);
  }
  addEventListener('resize', resize); resize();
  if (!reduce) requestAnimationFrame(frame);
  window.ARC_STARS = { warp(on) { warpTarget = on ? 1 : 0; }, hue(h) { hueT = h; } };
})();
