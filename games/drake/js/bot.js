// Autoplay bot (pure): drives a Player toward waypoints using only real player inputs.
// Used by the Node validator and by ?bot=1 in the browser.
import { P } from './controller.js';

export class Bot {
  constructor(world, player) { this.w = world; this.p = player; this.reset(); }
  reset() { this.mode = 'walk'; this.hasJumped = false; this.glideArmed = false; this.t = 0; this.stuck = 0; this.lastPos = null; this.lastCheck = 0; }

  // mode: 'walk' (jump over small obstacles), 'gap' (jump at the edge, then glide), 'charge' (jump, charge, then glide)
  // returns the input for this step; tx,tz target; targetY = height we want to land at
  think(dt, tx, tz, mode = 'walk', targetY = 0) {
    const p = this.p, w = this.w;
    this.t += dt;
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz) || 1;
    const dirx = dx / d, dirz = dz / d;
    const inp = { mx: dirx, mz: dirz, jumpPressed: false, jumpHeld: false, flamePressed: false, chargePressed: false, frozen: false };
    if (d < 0.6) { inp.mx = inp.mz = 0; }
    const look = mode === 'walk' ? Math.max(1.1, p.speedH * 0.2) : Math.max(0.55, p.speedH * 0.075);
    const ax = p.x + dirx * look, az = p.z + dirz * look;
    const ground = w.groundAt(ax, az, p.y + 0.6, P.stepUp, {}).y;

    if (mode === 'walk') {
      // hop small obstacles and slopes that need a bit of lift
      if (p.onGround && ground - p.y > 0.42) { inp.jumpPressed = true; inp.jumpHeld = true; }
      if (!p.onGround) inp.jumpHeld = p.vy > 0 && ground - p.y > 0.3;
      return inp;
    }

    // gap crossing
    const sl = w.sample(ax, az);
    const dropAhead = ground < p.y - 0.45 || (sl.ny < 0.8 && ground < p.y - 0.15);
    if (p.onGround && !this.hasJumped) {
      if (dropAhead || ground - p.y > 0.42) { inp.jumpPressed = true; inp.jumpHeld = true; this.hasJumped = true; }
    } else if (!p.onGround && this.hasJumped) {
      inp.jumpHeld = true;
      if (mode === 'charge' && !this.glideArmed && p.vy < 4 && p.chargeCool <= 0 && !p.charging) { inp.chargePressed = true; this.glideArmed = 'c'; }
      // glide as soon as falling when the target is far or higher
      if (p.vy < 1.5 && !p.gliding && (d > 4.5 || targetY > p.y - 0.5)) inp.jumpPressed = true;
      // stop gliding just before landing so we do not overshoot a small plateau
      if (p.gliding && d < 1.5 && p.y - targetY < 1.2) inp.jumpHeld = false;
    } else if (p.onGround && this.hasJumped) {
      this.hasJumped = false;
    }
    return inp;
  }
}
