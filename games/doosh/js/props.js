// Stick Doosh - props.js (cast agent): the silly-prop registry. Core ships the dude props in rig.js (pompadour, aviators, headband,
// cowboyHat, mustache, handlebar, mohawk, eyeblack, fishbowl, monocle, beard, nightcap, slippers, helmet, partyHat, beret, scarf, brows);
// this file adds everything else the dudes + the enemy roster wear, carry or have strapped to their backs.
// A prop is fn(ctx, J, look, st) drawn after the head, or {back(ctx,J,look,st), front(ctx,J,look,st)} (back = behind the body).
// J.head{x,y,r}, J.f facing, J.neck/hip/sh, J.handF/handB, J.footF/footB, J.t time, J.s scale, J.portrait true in HUD heads.
// Colour knobs read from the look: hat, band, hair, cap, beard, pack, shield, orb, cape, slipper.
// Dynamic knobs read from rig state: st.swing (held items, radians, - = raised), st.jet (0..1 jetpack flame), st.glow (0..1 staff orb),
// st.block (0..1 shield flash).
(function () {
  'use strict';
  const S = window.SGS = window.SGS || {};
  const U = S.U;
  const INK = '#141018';
  const PR = (S.Rig && S.Rig.PROPS) || {};
  function inkFill(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || 1.6; ctx.strokeStyle = INK; ctx.stroke(); }
  function poly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); }
  function font(sz) { return 'italic ' + Math.max(5, Math.round(sz)) + 'px Bangers, Impact, sans-serif'; }

  // ================= HATS =================
  PR.tophat = (ctx, J, L) => {
    const h = J.head, r = h.r;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - r * 0.8, r * 1.25, r * 0.3, 0, 0, U.TAU); inkFill(ctx, '#2a2438', 1.5);
    ctx.fillStyle = '#2a2438'; ctx.fillRect(h.x - r * 0.8, h.y - r * 2.4, r * 1.6, r * 1.6); ctx.lineWidth = 1.6; ctx.strokeStyle = INK; ctx.strokeRect(h.x - r * 0.8, h.y - r * 2.4, r * 1.6, r * 1.6);
    ctx.fillStyle = L.band || '#e8173a'; ctx.fillRect(h.x - r * 0.8, h.y - r * 1.2, r * 1.6, r * 0.3);
  };
  PR.wizardHat = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, c = L.hat || '#6b3fd6', sw = Math.sin(J.t * 3) * r * 0.25 * f, y0 = h.y - r * 0.8;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - r * 0.72, r * 1.6, r * 0.32, 0, 0, U.TAU); inkFill(ctx, c, 1.6);
    ctx.beginPath(); ctx.moveTo(h.x - r * 0.95, y0);
    ctx.quadraticCurveTo(h.x - f * r * 0.3, h.y - r * 2.3, h.x + f * r * 0.7 + sw, h.y - r * 3.0);
    ctx.quadraticCurveTo(h.x + f * r * 0.4, h.y - r * 1.8, h.x + r * 0.95, y0); ctx.closePath(); inkFill(ctx, c, 1.7);
    ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.arc(h.x - f * r * 0.1, h.y - r * 1.5, r * 0.2, 0, U.TAU); ctx.fill(); ctx.beginPath(); ctx.arc(h.x + f * r * 0.35, h.y - r * 2.0, r * 0.14, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(h.x - r * 0.95, h.y - r * 1.05, r * 1.9, r * 0.2);
  };
  PR.vikingHelmet = (ctx, J, L) => {
    const h = J.head, r = h.r;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(h.x + s * r * 0.9, h.y - r * 0.55); ctx.quadraticCurveTo(h.x + s * r * 1.9, h.y - r * 0.5, h.x + s * r * 1.7, h.y - r * 1.7); ctx.quadraticCurveTo(h.x + s * r * 1.35, h.y - r * 0.95, h.x + s * r * 0.6, h.y - r * 0.9); inkFill(ctx, '#f5ecd0', 1.4); }
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.2, r * 1.1, Math.PI, 0); ctx.closePath(); inkFill(ctx, L.helmet || '#8a8fa6', 1.6);
    ctx.fillStyle = '#c9cede'; ctx.fillRect(h.x - r * 1.1, h.y - r * 0.62, r * 2.2, r * 0.22); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(h.x - r * 1.1, h.y - r * 0.62, r * 2.2, r * 0.22);
  };
  PR.trafficCone = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, y0 = h.y - r * 0.7;
    poly(ctx, [h.x - r * 1.1, y0, h.x + r * 1.1, y0, h.x + r * 0.28, h.y - r * 2.9, h.x - r * 0.28, h.y - r * 2.9]); inkFill(ctx, '#ff7a1a', 1.6);
    ctx.fillStyle = '#ffffff'; poly(ctx, [h.x - r * 0.78, h.y - r * 1.55, h.x + r * 0.78, h.y - r * 1.55, h.x + r * 0.6, h.y - r * 2.05, h.x - r * 0.6, h.y - r * 2.05]); ctx.fill();
    ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#e65a00'; ctx.fillRect(h.x - r * 1.25, h.y - r * 0.82, r * 2.5, r * 0.22); ctx.strokeRect(h.x - r * 1.25, h.y - r * 0.82, r * 2.5, r * 0.22);
  };
  PR.pirateHat = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath(); ctx.moveTo(h.x - r * 1.7, h.y - r * 0.5); ctx.quadraticCurveTo(h.x - r * 1.1, h.y - r * 2.3, h.x, h.y - r * 2.0);
    ctx.quadraticCurveTo(h.x + r * 1.1, h.y - r * 2.3, h.x + r * 1.7, h.y - r * 0.5); ctx.quadraticCurveTo(h.x, h.y - r * 0.95, h.x - r * 1.7, h.y - r * 0.5); ctx.closePath(); inkFill(ctx, '#2a2438', 1.7);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(h.x, h.y - r * 1.35, r * 0.3, 0, U.TAU); ctx.fill();
    ctx.fillStyle = INK; ctx.fillRect(h.x - r * 0.18, h.y - r * 1.42, r * 0.12, r * 0.12); ctx.fillRect(h.x + r * 0.06, h.y - r * 1.42, r * 0.12, r * 0.12);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(h.x - r * 0.45, h.y - r * 1.0); ctx.lineTo(h.x + r * 0.45, h.y - r * 1.15); ctx.moveTo(h.x - r * 0.45, h.y - r * 1.15); ctx.lineTo(h.x + r * 0.45, h.y - r * 1.0); ctx.stroke();
  };
  PR.beanie = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, c = L.hat || '#e8173a';
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.2, r * 1.08, Math.PI * 1.02, Math.PI * 1.98); ctx.closePath(); inkFill(ctx, c, 1.6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x - r * 1.05, h.y - r * 0.78, r * 2.1, r * 0.3); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.strokeRect(h.x - r * 1.05, h.y - r * 0.78, r * 2.1, r * 0.3);
    ctx.beginPath(); ctx.arc(h.x - f * r * 0.1, h.y - r * 1.35, r * 0.34, 0, U.TAU); inkFill(ctx, '#ffffff', 1.3);
  };
  PR.earmuffs = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.arc(h.x, h.y, r * 1.04, Math.PI * 1.02, Math.PI * 1.98); ctx.stroke();
    ctx.strokeStyle = '#9ea3b8'; ctx.lineWidth = 1.8; ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x - f * r * 0.12, h.y + r * 0.05, r * 0.5, 0, U.TAU); inkFill(ctx, L.hat || '#ff7ab8', 1.5);
  };
  PR.trapperHat = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.15, r * 1.18, Math.PI * 1.0, Math.PI * 2.0); ctx.closePath(); inkFill(ctx, L.hat || '#8a6a4a', 1.6);
    ctx.beginPath(); ctx.ellipse(h.x - f * r * 0.1, h.y + r * 0.2, r * 0.38, r * 0.7, 0, 0, U.TAU); inkFill(ctx, '#bfa07a', 1.4);
    ctx.fillStyle = '#e8d5b0'; ctx.fillRect(h.x - r * 1.18, h.y - r * 0.75, r * 2.36, r * 0.3); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.strokeRect(h.x - r * 1.18, h.y - r * 0.75, r * 2.36, r * 0.3);
  };
  PR.sailorHat = (ctx, J, L) => {
    const h = J.head, r = h.r;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - r * 0.9, r * 1.15, r * 0.5, 0, 0, U.TAU); inkFill(ctx, '#ffffff', 1.6);
    ctx.fillStyle = L.hat || '#2f5fd6'; ctx.fillRect(h.x - r * 1.0, h.y - r * 1.05, r * 2.0, r * 0.3); ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.strokeRect(h.x - r * 1.0, h.y - r * 1.05, r * 2.0, r * 0.3);
  };
  PR.bucketHat = (ctx, J, L) => {
    const h = J.head, r = h.r, c = L.hat || '#c9b26a';
    poly(ctx, [h.x - r * 0.95, h.y - r * 0.8, h.x - r * 0.8, h.y - r * 1.9, h.x + r * 0.8, h.y - r * 1.9, h.x + r * 0.95, h.y - r * 0.8]); inkFill(ctx, c, 1.6);
    ctx.beginPath(); ctx.ellipse(h.x, h.y - r * 0.75, r * 1.5, r * 0.3, 0, 0, U.TAU); inkFill(ctx, c, 1.6);
  };
  PR.pithHelmet = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath(); ctx.ellipse(h.x + f * r * 0.1, h.y - r * 0.72, r * 1.5, r * 0.32, 0, 0, U.TAU); inkFill(ctx, '#d9c48a', 1.5);
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.7, r * 1.05, Math.PI, 0); ctx.closePath(); inkFill(ctx, '#d9c48a', 1.6);
    ctx.fillStyle = '#7a5a2a'; ctx.fillRect(h.x - r * 1.0, h.y - r * 1.05, r * 2.0, r * 0.22);
  };
  PR.strawHat = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath(); ctx.ellipse(h.x, h.y - r * 0.7, r * 2.1, r * 0.4, -f * 0.06, 0, U.TAU); inkFill(ctx, '#f2d36b', 1.6);
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.7, r * 1.0, Math.PI, 0); ctx.closePath(); inkFill(ctx, '#f2d36b', 1.6);
    ctx.fillStyle = '#e8173a'; ctx.fillRect(h.x - r * 1.0, h.y - r * 1.05, r * 2.0, r * 0.24);
    ctx.strokeStyle = '#c9a63a'; ctx.lineWidth = 0.8; ctx.beginPath(); for (let i = -2; i <= 2; i++) { ctx.moveTo(h.x + i * r * 0.35, h.y - r * 1.6); ctx.lineTo(h.x + i * r * 0.4, h.y - r * 1.1); } ctx.stroke();
  };
  PR.plumeHelm = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, w = Math.sin(J.t * 6) * r * 0.15;
    ctx.beginPath(); ctx.moveTo(h.x - f * r * 0.3, h.y - r * 1.1); ctx.quadraticCurveTo(h.x - f * r * 1.6, h.y - r * 2.4 + w, h.x - f * r * 1.9, h.y - r * 1.2 + w); ctx.quadraticCurveTo(h.x - f * r * 1.0, h.y - r * 1.5, h.x, h.y - r * 0.9); ctx.closePath(); inkFill(ctx, L.plume || '#e8173a', 1.4);
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.1, r * 1.14, Math.PI, 0); ctx.lineTo(h.x + r * 1.14, h.y + r * 0.25); ctx.lineTo(h.x - r * 1.14, h.y + r * 0.25); ctx.closePath(); inkFill(ctx, L.helmet || '#9ea8c0', 1.7);
    ctx.fillStyle = INK; ctx.fillRect(h.x + f * r * 0.05 - r * 0.02, h.y - r * 0.25, r * 1.0 * (f > 0 ? 1 : -1), r * 0.18);
  };
  PR.chefHat = (ctx, J, L) => {
    const h = J.head, r = h.r;
    ctx.beginPath(); ctx.arc(h.x - r * 0.6, h.y - r * 1.55, r * 0.7, 0, U.TAU); ctx.arc(h.x + r * 0.6, h.y - r * 1.55, r * 0.7, 0, U.TAU); ctx.arc(h.x, h.y - r * 2.0, r * 0.8, 0, U.TAU); inkFill(ctx, '#ffffff', 1.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(h.x - r * 0.95, h.y - r * 1.5, r * 1.9, r * 0.8); ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.strokeRect(h.x - r * 0.95, h.y - r * 1.5, r * 1.9, r * 0.8);
  };
  PR.pixelCap = (ctx, J, L) => { // chunky 8-bit cap built from blocks
    const h = J.head, r = h.r, f = J.f, u = r * 0.42, c = L.hat || '#ff6ae0';
    ctx.fillStyle = c; ctx.strokeStyle = INK; ctx.lineWidth = 1.3;
    const blocks = [[-2, -3], [-1, -3], [0, -3], [1, -3], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1]];
    for (const b of blocks) { const bx = h.x + (f > 0 ? b[0] - 0.5 : -b[0] - 0.5) * u * 0.78, by = h.y + (b[1] - 0.6) * u * 0.9; ctx.fillRect(bx, by, u * 0.78, u * 0.9); ctx.strokeRect(bx, by, u * 0.78, u * 0.9); }
  };
  PR.flameHair = (ctx, J) => {
    const h = J.head, r = h.r, t = J.t;
    for (let i = -2; i <= 2; i++) {
      const fl = Math.sin(t * 14 + i * 1.7) * r * 0.25, hh = r * (1.2 + (i === 0 ? 0.7 : Math.abs(i) === 1 ? 0.4 : 0)) + fl;
      ctx.beginPath(); ctx.moveTo(h.x + i * r * 0.42 - r * 0.28, h.y - r * 0.75); ctx.quadraticCurveTo(h.x + i * r * 0.42 - r * 0.1, h.y - r * 0.75 - hh * 0.6, h.x + i * r * 0.42 + fl * 0.5, h.y - r * 0.75 - hh);
      ctx.quadraticCurveTo(h.x + i * r * 0.42 + r * 0.25, h.y - r * 0.75 - hh * 0.5, h.x + i * r * 0.42 + r * 0.28, h.y - r * 0.75); ctx.closePath(); inkFill(ctx, i % 2 ? '#ffb81c' : '#ff5a1a', 1.2);
    }
  };
  PR.propeller = (ctx, J) => {
    const h = J.head, r = h.r, w = Math.abs(Math.sin(J.t * 30)) * r * 1.3;
    ctx.beginPath(); ctx.arc(h.x, h.y - r * 0.95, r * 0.55, Math.PI, 0); inkFill(ctx, '#ff4fa3', 1.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(h.x - w, h.y - r * 1.6); ctx.lineTo(h.x + w, h.y - r * 1.6); ctx.stroke();
  };
  PR.eyepatch = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(h.x + f * r * 0.62, h.y - r * 0.12, r * 0.28, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(h.x - r * 0.9, h.y - r * 0.5); ctx.lineTo(h.x + f * r * 0.6, h.y - r * 0.12); ctx.stroke();
  };
  PR.horns = (ctx, J, L) => {
    const h = J.head, r = h.r;
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(h.x + s * r * 0.6, h.y - r * 0.7); ctx.quadraticCurveTo(h.x + s * r * 1.5, h.y - r * 1.2, h.x + s * r * 1.2, h.y - r * 2); ctx.quadraticCurveTo(h.x + s * r * 0.9, h.y - r * 1.2, h.x + s * r * 0.2, h.y - r * 0.9); inkFill(ctx, L.horn || '#f2e8c9', 1.4); }
  };
  PR.crown = (ctx, J) => {
    const h = J.head, r = h.r;
    ctx.beginPath(); ctx.moveTo(h.x - r * 0.9, h.y - r * 0.75); ctx.lineTo(h.x - r, h.y - r * 1.8); ctx.lineTo(h.x - r * 0.4, h.y - r * 1.3); ctx.lineTo(h.x, h.y - r * 1.95); ctx.lineTo(h.x + r * 0.4, h.y - r * 1.3); ctx.lineTo(h.x + r, h.y - r * 1.8); ctx.lineTo(h.x + r * 0.9, h.y - r * 0.75); ctx.closePath(); inkFill(ctx, '#ffd23f', 1.5);
    ctx.fillStyle = '#e8173a'; ctx.beginPath(); ctx.arc(h.x, h.y - r * 1.1, r * 0.17, 0, U.TAU); ctx.fill();
  };
  PR.antenna = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, b = Math.sin(J.t * 5) * r * 0.25;
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(h.x + k * r * 0.35, h.y - r * 0.92); ctx.quadraticCurveTo(h.x + k * r * 0.5, h.y - r * 1.6, h.x + k * r * 0.85 + b * k, h.y - r * 2.0); ctx.stroke(); }
    ctx.strokeStyle = L.antenna || '#9af59a'; ctx.lineWidth = 1.2;
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(h.x + k * r * 0.35, h.y - r * 0.92); ctx.quadraticCurveTo(h.x + k * r * 0.5, h.y - r * 1.6, h.x + k * r * 0.85 + b * k, h.y - r * 2.0); ctx.stroke(); }
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(h.x + k * r * 0.85 + b * k, h.y - r * 2.0, r * 0.27, 0, U.TAU); inkFill(ctx, L.bulb || '#ff4fa3', 1.2); }
  };

  // ================= FACES / HAIR =================
  PR.bowtie = (ctx, J, L) => {
    if (J.portrait) { const n = J.neck; poly(ctx, [n.x, n.y + 2, n.x - 5, n.y - 1, n.x - 5, n.y + 5]); inkFill(ctx, L.tie || '#e8173a', 1.2); poly(ctx, [n.x, n.y + 2, n.x + 5, n.y - 1, n.x + 5, n.y + 5]); inkFill(ctx, L.tie || '#e8173a', 1.2); return; }
    const n = J.neck, s = J.s, c = L.tie || '#e8173a';
    poly(ctx, [n.x, n.y + 2 * s, n.x - 5 * s, n.y - 1 * s, n.x - 5 * s, n.y + 5 * s]); inkFill(ctx, c, 1.2);
    poly(ctx, [n.x, n.y + 2 * s, n.x + 5 * s, n.y - 1 * s, n.x + 5 * s, n.y + 5 * s]); inkFill(ctx, c, 1.2);
    ctx.beginPath(); ctx.arc(n.x, n.y + 2 * s, 1.4 * s, 0, U.TAU); inkFill(ctx, '#ffd23f', 1);
  };
  PR.carrotNose = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f, x = h.x + f * r * 0.85, y = h.y + r * 0.08;
    poly(ctx, [x, y - r * 0.2, x + f * r * 1.25, y + r * 0.12, x, y + r * 0.3]); inkFill(ctx, '#ff8c1a', 1.3);
  };
  PR.skullFace = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.fillStyle = INK;
    ctx.beginPath(); ctx.ellipse(h.x + f * r * 0.25, h.y - r * 0.15, r * 0.3, r * 0.36, 0, 0, U.TAU); ctx.ellipse(h.x + f * r * 0.7, h.y - r * 0.15, r * 0.26, r * 0.34, 0, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(h.x + f * r * 0.27, h.y - r * 0.15, r * 0.07, 0, U.TAU); ctx.arc(h.x + f * r * 0.72, h.y - r * 0.15, r * 0.07, 0, U.TAU); ctx.fill();
    ctx.fillStyle = INK; poly(ctx, [h.x + f * r * 0.48, h.y + r * 0.15, h.x + f * r * 0.58, h.y + r * 0.3, h.x + f * r * 0.38, h.y + r * 0.3]); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(h.x + f * r * 0.1, h.y + r * 0.58); ctx.lineTo(h.x + f * r * 0.95, h.y + r * 0.5);
    for (let i = 0; i < 5; i++) { const tx = h.x + f * r * (0.2 + i * 0.16); ctx.moveTo(tx, h.y + r * 0.52); ctx.lineTo(tx, h.y + r * 0.7); } ctx.stroke();
  };
  PR.divemask = (ctx, J) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(h.x - f * r * 0.95, h.y - r * 0.2); ctx.lineTo(h.x + f * r * 0.1, h.y - r * 0.18); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(h.x + f * r * 0.5, h.y - r * 0.12, r * 0.62, r * 0.38, 0, 0, U.TAU); inkFill(ctx, 'rgba(120,225,255,0.65)', 1.8);
    ctx.beginPath(); ctx.moveTo(h.x + f * r * 0.35, h.y + r * 0.65); ctx.quadraticCurveTo(h.x + f * r * 1.4, h.y + r * 0.9, h.x + f * r * 1.5, h.y - r * 1.6); ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke();
    ctx.strokeStyle = '#ffb81c'; ctx.lineWidth = 1.2; ctx.stroke();
  };
  PR.ears = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.beginPath(); ctx.arc(h.x - f * r * 0.3, h.y + r * 0.0, r * 0.52, 0, U.TAU); inkFill(ctx, L.ear || '#f2a8a0', 1.5);
    ctx.beginPath(); ctx.arc(h.x - f * r * 0.3, h.y + r * 0.0, r * 0.25, 0, U.TAU); ctx.fillStyle = '#c9706a'; ctx.fill();
  };

  // ================= BACK / HELD =================
  PR.jetpack = { back: (ctx, J, L, st) => {
    if (J.portrait) return;
    const f = J.f, s = J.s, mx = (J.hip.x + J.neck.x) / 2 - f * 5.5 * s, my = (J.hip.y + J.neck.y) / 2 - 1;
    const fl = st && st.jet != null ? st.jet : (st && st.pose === 'float' ? 1 : 0.35);
    for (const k of [-1, 1]) {
      const x = mx + k * 2.6 * s - 2.2 * s;
      if (fl > 0) { ctx.beginPath(); ctx.moveTo(x - 2 * s, my + 7 * s); ctx.lineTo(x + 2 * s, my + 7 * s); ctx.lineTo(x + Math.sin(J.t * 40 + k) * s, my + (7 + 8 * fl + Math.sin(J.t * 50 + k) * 2) * s); ctx.closePath(); inkFill(ctx, k > 0 ? '#ffb81c' : '#ff5a1a', 1.1); }
      ctx.beginPath(); ctx.moveTo(x - 2.4 * s, my - 7 * s); ctx.lineTo(x + 2.4 * s, my - 7 * s); ctx.lineTo(x + 2.4 * s, my + 6 * s); ctx.lineTo(x - 2.4 * s, my + 6 * s); ctx.closePath(); inkFill(ctx, L.pack || '#d23a2a', 1.4);
      ctx.fillStyle = '#c9cede'; ctx.fillRect(x - 2 * s, my - 7 * s, 4 * s, 1.8 * s);
    }
  } };
  PR.backpack = { back: (ctx, J, L) => {
    if (J.portrait) return;
    const f = J.f, s = J.s, mx = (J.hip.x + J.neck.x) / 2 - f * 6 * s, my = (J.hip.y + J.neck.y) / 2;
    ctx.beginPath(); ctx.moveTo(mx - 4 * s, my - 6 * s); ctx.lineTo(mx + 4 * s, my - 6 * s); ctx.lineTo(mx + 4 * s, my + 6 * s); ctx.lineTo(mx - 4 * s, my + 6 * s); ctx.closePath(); inkFill(ctx, L.pack || '#7a8a3a', 1.5);
    ctx.fillStyle = '#4b5320'; ctx.fillRect(mx - 3 * s, my + 0.5 * s, 6 * s, 3.4 * s); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.strokeRect(mx - 3 * s, my + 0.5 * s, 6 * s, 3.4 * s);
  } };
  PR.cape = { back: (ctx, J, L, st) => {
    if (J.portrait) return;
    const n = J.neck, hp = J.hip, f = J.f, s = J.s, run = st && (st.pose === 'run' || st.pose === 'fall' || st.pose === 'jump') ? 1 : 0.35;
    const w = Math.sin(J.t * 9) * 2 * s * (0.5 + run), len = (hp.y - n.y) * 1.35 + 4 * s;
    ctx.beginPath(); ctx.moveTo(n.x - f * 1.5 * s, n.y + 1);
    ctx.quadraticCurveTo(n.x - f * (7 + 9 * run) * s, n.y + len * 0.45 + w, n.x - f * (11 + 14 * run) * s, n.y + len * (0.9 - 0.25 * run) + w * 2);
    ctx.lineTo(n.x - f * (2 + 3 * run) * s, n.y + len * 0.98 - w); ctx.quadraticCurveTo(n.x - f * 2.5 * s, n.y + len * 0.5, n.x + f * 1.2 * s, n.y + 2); ctx.closePath(); inkFill(ctx, L.cape || '#e8173a', 1.6);
  } };
  PR.tail = { back: (ctx, J, L) => {
    if (J.portrait) return;
    const hp = J.hip, f = J.f, s = J.s, w = Math.sin(J.t * 5) * 3 * s;
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hp.x - f * 1.5 * s, hp.y);
    ctx.bezierCurveTo(hp.x - f * 12 * s, hp.y + 2 * s + w, hp.x - f * 14 * s, hp.y - 12 * s, hp.x - f * 7 * s + w * f, hp.y - 14 * s);
    ctx.strokeStyle = INK; ctx.lineWidth = 4.4 * s; ctx.stroke(); ctx.strokeStyle = L.tailColor || L.limb || '#8a5a2a'; ctx.lineWidth = 2.4 * s; ctx.stroke();
  } };
  PR.scubaGear = { back: (ctx, J, L, st) => {
    if (J.portrait) return;
    const f = J.f, s = J.s, mx = (J.hip.x + J.neck.x) / 2 - f * 5.5 * s, my = (J.hip.y + J.neck.y) / 2 - 1;
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.ellipse(mx + k * 1.6 * s, my, 2.6 * s, 7.5 * s, 0, 0, U.TAU); inkFill(ctx, k > 0 ? '#ffb81c' : '#e8a010', 1.4); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, my - 7 * s); ctx.quadraticCurveTo(mx + f * 4 * s, J.neck.y - 6 * s, J.head.x + f * J.head.r * 0.6, J.head.y + J.head.r * 0.5); ctx.stroke();
  }, front: (ctx, J, L) => { // flippers
    if (J.portrait) return;
    for (const ft of [J.footB, J.footF]) { poly(ctx, [ft.x, ft.y - 2, ft.x + J.f * 11 * J.s, ft.y - 1, ft.x + J.f * 9 * J.s, ft.y + 2.5, ft.x - 1, ft.y + 1]); inkFill(ctx, L.fin || '#2fd0ff', 1.2); }
  } };
  PR.shield = { front: (ctx, J, L, st) => {
    if (J.portrait) return;
    const f = J.f, s = J.s, n = J.neck, hp = J.hip;
    const cx = n.x + f * 9 * s, top = n.y - 3 * s, bot = hp.y + 9 * s, w = 5.5 * s, flash = st && st.block > 0;
    ctx.beginPath(); ctx.moveTo(cx - w, top); ctx.lineTo(cx + w, top); ctx.lineTo(cx + w, bot - 4 * s); ctx.quadraticCurveTo(cx, bot + 3 * s, cx - w, bot - 4 * s); ctx.closePath();
    inkFill(ctx, flash ? '#ffffff' : (L.shield || '#4f6fa8'), 2);
    ctx.fillStyle = flash ? '#fff7b0' : '#9fd8ff'; ctx.fillRect(cx - w * 0.7, top + 3 * s, w * 1.4, 3.4 * s); ctx.lineWidth = 1; ctx.strokeStyle = INK; ctx.strokeRect(cx - w * 0.7, top + 3 * s, w * 1.4, 3.4 * s);
    ctx.fillStyle = '#ffe14d'; ctx.fillRect(cx - w, top + 12 * s, w * 2, 2.2 * s);
  } };
  function held(ctx, J, st, rest, fn) { // draws at the front hand, rotated by the swing angle (0 = forward, - = raised)
    if (J.portrait) return;
    const hnd = J.handF, a = (st && st.swing != null ? st.swing : rest);
    ctx.save(); ctx.translate(hnd.x, hnd.y); ctx.scale(J.f, 1); ctx.rotate(a); ctx.scale(J.s, J.s); ctx.lineJoin = 'round'; ctx.lineCap = 'round'; fn(); ctx.restore();
  }
  PR.sword = { front: (ctx, J, L, st) => held(ctx, J, st, -0.8, () => {
    ctx.fillStyle = '#d7dcea'; poly(ctx, [2, -1.6, 22, -1.2, 25, 0, 22, 1.2, 2, 1.6]); ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke();
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(1, -4.2, 2.2, 8.4); ctx.strokeRect(1, -4.2, 2.2, 8.4); ctx.fillStyle = '#6a3d1a'; ctx.fillRect(-4, -1.4, 5, 2.8); ctx.strokeRect(-4, -1.4, 5, 2.8);
  }) };
  PR.staff = { front: (ctx, J, L, st) => held(ctx, J, st, -1.35, () => {
    ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(22, 0); ctx.stroke(); ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 1.8; ctx.stroke();
    const g = st && st.glow != null ? st.glow : 0.3;
    ctx.beginPath(); ctx.arc(24, 0, 3.2 + g * 2.4, 0, U.TAU); inkFill(ctx, g > 0.6 ? '#ffffff' : (L.orb || '#c77dff'), 1.4);
  }) };
  PR.pitchfork = { front: (ctx, J, L, st) => held(ctx, J, st, -1.2, () => {
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(18, 0); ctx.moveTo(18, -4); ctx.lineTo(18, 4); ctx.moveTo(18, -4); ctx.lineTo(25, -4); ctx.moveTo(18, 0); ctx.lineTo(26, 0); ctx.moveTo(18, 4); ctx.lineTo(25, 4); ctx.stroke();
    ctx.strokeStyle = '#d23a2a'; ctx.lineWidth = 1.4; ctx.stroke();
  }) };

  // SGT. DOOSH's headband: a straight band across the forehead with the word on it + flappy tails
  PR.headbandDoosh = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f, t = J.t, c = L.band || '#3b8bff', y = h.y - r * 0.5, bh = r * 0.5;
    ctx.save(); ctx.beginPath(); ctx.arc(h.x, h.y, r * 1.02, 0, U.TAU); ctx.clip();
    ctx.fillStyle = c; ctx.fillRect(h.x - r * 1.1, y - bh / 2, r * 2.2, bh);
    ctx.restore();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(h.x - r * 0.99, y - bh / 2); ctx.lineTo(h.x + r * 0.99, y - bh / 2); ctx.moveTo(h.x - r * 0.99, y + bh / 2); ctx.lineTo(h.x + r * 0.99, y + bh / 2); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.font = font(r * 0.62); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('DOOSH', h.x + f * r * 0.12, y + r * 0.04);
    const bx = h.x - f * r * 0.98, w = Math.sin(t * 14) * 2;
    ctx.lineCap = 'round';
    for (const k of [0, 1]) {
      ctx.strokeStyle = INK; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(bx, y); ctx.quadraticCurveTo(bx - f * 5, y + 1 + w + k * 2, bx - f * 10, y + 3 + k * 3 - w); ctx.stroke();
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
    }
  };
  // goggles for the scientist-y bits
  PR.goggles = (ctx, J, L) => {
    const h = J.head, r = h.r, f = J.f;
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(h.x - r * 0.95, h.y - r * 0.4); ctx.lineTo(h.x + f * r * 0.2, h.y - r * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.x + f * r * 0.5, h.y - r * 0.2, r * 0.42, 0, U.TAU); inkFill(ctx, 'rgba(255,240,120,0.75)', 1.6);
  };
  // ================= extra guns for the enemy roster (Rig.GUNS: local +x = barrel, grip at 0,0) =================
  if (S.Rig && S.Rig.GUNS) {
    const R = S.Rig;
    function box(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.strokeStyle = INK; ctx.lineWidth = 1.4; ctx.strokeRect(x, y, w, h); }
    R.GUN_LEN.sniper = 25; R.TWO_HANDED.sniper = 1;
    R.GUNS.sniper = (ctx) => { // long rifle with a scope
      box(ctx, -9, -2.5, 9, 4, '#7a4a22'); box(ctx, -1, -3.2, 27, 2.6, '#4b4f63'); box(ctx, 3, -6.6, 9, 3, '#2a2438');
      ctx.fillStyle = '#ff3b6b'; ctx.fillRect(11.4, -6, 1.4, 1.8); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(8, -3.4); ctx.lineTo(10, 1.8); ctx.stroke();
    };
    R.GUN_LEN.raygun = 13;
    R.GUNS.raygun = (ctx, J, st) => { // little green zapper with fins
      box(ctx, -1, -3.6, 11, 4, '#7dff6b'); box(ctx, -1, -0.6, 3, 4.5, '#3d3754');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(2, -3, 5, 1); ctx.fillStyle = '#ff4fa3'; ctx.beginPath(); ctx.arc(11, -1.6, 2 + Math.sin((st.t || 0) * 12) * 0.5, 0, U.TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(3, -3.6); ctx.lineTo(1, -7); ctx.lineTo(6, -3.6); ctx.stroke();
    };
    R.GUN_LEN.harpoon = 17; R.TWO_HANDED.harpoon = 1;
    R.GUNS.harpoon = (ctx) => { // speargun
      box(ctx, -7, -2.6, 9, 4, '#4b4f63'); box(ctx, 1, -1.6, 15, 1.8, '#c9cede');
      ctx.fillStyle = '#d6dae6'; ctx.beginPath(); ctx.moveTo(16, -2.4); ctx.lineTo(22, -0.8); ctx.lineTo(16, 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
      box(ctx, -1, 1, 3, 4, '#3d3754');
    };
    R.GUN_LEN.blunder = 14;
    R.GUNS.blunder = (ctx) => { // flared blunderbuss for the mud guys
      box(ctx, -8, -2.4, 8, 4, '#6a3d1a'); ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.lineTo(9, -3.2); ctx.lineTo(15, -6); ctx.lineTo(15, 3); ctx.lineTo(9, 0.4); ctx.lineTo(0, 1.2); ctx.closePath(); ctx.fillStyle = '#8a6b3a'; ctx.fill(); ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.stroke();
    };
  }
  // exposed for the cast test / level select portraits
  S.PropNames = { hats: ['cowboyHat', 'tophat', 'partyHat', 'crown', 'wizardHat', 'vikingHelmet', 'trafficCone', 'pirateHat', 'helmet', 'beanie', 'earmuffs', 'trapperHat', 'sailorHat', 'bucketHat', 'pithHelmet', 'strawHat', 'plumeHelm', 'chefHat', 'pixelCap', 'flameHair', 'propeller', 'horns', 'beret', 'antenna', 'nightcap'],
    faces: ['pompadour', 'mohawk', 'beard', 'mustache', 'handlebar', 'monocle', 'aviators', 'headband', 'headbandDoosh', 'eyeblack', 'bowtie', 'scarf', 'eyepatch', 'carrotNose', 'skullFace', 'divemask', 'ears', 'goggles', 'brows'],
    held: ['jetpack', 'shield', 'backpack', 'cape', 'tail', 'scubaGear', 'sword', 'staff', 'pitchfork', 'fishbowl', 'slippers'] };
})();
