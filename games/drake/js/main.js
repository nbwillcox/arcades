import * as THREE from 'three';
import { Input } from './input.js';
import { Session, STEP } from './session.js';
import { FlightSession } from './flight.js';
import { LEVELS, START_LEVEL, HUBS } from './levels/index.js';
import { Hud } from './hud.js';
import { UI } from './ui.js';
import { Save } from './save.js';
import { Audio as Snd } from './audio.js';
import { installMenus, applySettings } from './menus.js';

const q = new URLSearchParams(location.search);
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 400);
Input.init(canvas);

const hud = new Hud(null);
const dbg = document.getElementById('dbg');
let showDbg = q.has('dbg');

const App = window.SD = {
  THREE, renderer, camera, hud, UI, Save, Input,
  session: null, paused: false, camLocked: false, busy: false,
  sfx: (t, e) => Snd.event(t, e), levels: LEVELS,

  make(id, opts) { return LEVELS[id].kind === 'flight' ? new FlightSession(App, id) : new Session(App, id, opts); },

  async goto(id, opts = {}) {
    if (App.busy) return;
    App.busy = true;
    await UI.transition(() => {
      UI.close();
      if (App.session) { App.session.dispose(); App.session = null; }
      App.session = App.make(id, opts);
      hud.bind(App.session.game);
      hud.setMode(App.session.spec.kind);
      hud.setLevel(App.session.spec.name);
      document.getElementById('hud').style.display = '';
      Snd.music(App.session.def.music || 'meadow');
      App.paused = false;
      const s = App.session.spec;
      hud.banner(s.name, App.worldName(s), 2800);
    });
    App.busy = false;
  },

  title(initial) {
    UI.close(); App.paused = false;
    if (App.session) { App.session.dispose(); App.session = null; }
    App.session = App.make('m_hub');
    App.session.attract = true;
    hud.bind(App.session.game);
    document.getElementById('hud').style.display = 'none';
    Snd.music('title');
    if (initial) Menus.splash(); else Menus.title();
  },

  beginSlot() { App.goto((Save.cur && Save.cur.hub) || 'm_hub'); },
  continueGame() { Save.start(Save.lastSlot()); App.beginSlot(); },

  // Finale: story beats, then credits with your totals, then back to the title.
  onEnding(session) {
    session.commit(true);
    if (Save.cur) { Save.cur.completed = true; Save.flush(); }
    Snd.music('victory');
    const T = Save.totals();
    const pages = [
      `<h1>Warlord Gloam falls!</h1><p class="sub">The crystal Elders wake, one by one, and the stolen treasure rains back over the realm.</p><p class="hint">Press A / Enter</p>`,
      `<h1>Thank you, Cinder!</h1><p class="sub">Wick glows brighter than ever. The six realms are safe again.</p><p class="hint">Press A / Enter</p>`,
    ];
    let i = 0;
    const show = () => {
      if (i < pages.length) { const n = UI.el('div'); n.innerHTML = pages[i++]; UI.custom(n, null, show); return; }
      const n = UI.el('div');
      n.innerHTML = `<div class="credits"><div class="roll">
        <h1 class="logo">SPACEDRAKE</h1>
        <p>A dragon adventure</p><p>&nbsp;</p>
        <h2>You collected</h2><p>${T.gems} gems</p><p>${T.elders} Elders rescued</p><p>${T.sunstones} Sunstones</p><p>&nbsp;</p>
        <h2>Starring</h2><p>Cinder, the little dragon</p><p>Wick, the firefly</p><p>&nbsp;</p>
        <h2>Made with</h2><p>Three.js (MIT licence)</p><p>Every model, level, sound and tune<br>generated in code, live in your browser</p><p>&nbsp;</p>
        <h2>Made for MJ</h2><p>&nbsp;</p><p>Thanks for playing!</p>
      </div></div><p class="hint">Press A / Enter to return to the title</p>`;
      UI.custom(n, null, () => { UI.close(); App.title(false); });
    };
    show();
  },

  onGameOver(session) {
    Menus.gameOver(session, () => { UI.close(); App.goto(session.id); }, () => { UI.close(); const hub = App.hubFor(session.spec); App.goto(hub && LEVELS[hub] ? hub : session.id, { fromLevel: session.id }); });
  },

  worldName(spec) { return ({ mossgate: 'Mossgate Meadows', brightforge: 'Brightforge Vale', mistral: 'Mistral Heights', glimmerdeep: 'Glimmerdeep', duskmarket: 'Duskmarket', keep: "Gloam's Keep" })[spec.world] || ''; },

  hubFor(spec) { return HUBS[spec.world]; },

  // Level exit reached: save, show results, return to the hub.
  onExit(session) {
    session.commit(true);
    const S = session.game.state;
    const node = UI.el('div');
    const row = (k, v, n, full) => `<span class="k">${k}</span><span class="v ${full ? 'full' : ''}">${v}</span><span class="n">${n}</span>`;
    const t = Math.round(session.time), mm = String(Math.floor(t / 60)), ss = String(t % 60).padStart(2, '0');
    node.innerHTML = `<h1>${session.def.winTitle || session.spec.name + ' complete!'}</h1><p class="sub">${App.worldName(session.spec)}</p>
      <div class="stats">${row('Gems', S.gems, '/ ' + S.gemsTotal, S.gems >= S.gemsTotal)}${row('Elders rescued', S.elders, '/ ' + S.eldersTotal, S.elders >= S.eldersTotal)}${row('Time', mm + ':' + ss, '')}</div>
      <p class="hint">Press A / Enter to continue</p>`;
    const go = () => { UI.close(); App.leave(session); };
    UI.custom(node, go, go);
  },

  onFlightDone(session) {
    session.commit(true);
    const st = session.stats, ok = st.rings >= st.ringsTotal * 0.6 && st.targets >= st.targetsTotal * 0.5;
    const perfect = st.rings === st.ringsTotal && st.targets === st.targetsTotal;
    const node = UI.el('div');
    const row = (k, v, n, full) => `<span class="k">${k}</span><span class="v ${full ? 'full' : ''}">${v}</span><span class="n">${n}</span>`;
    const t = Math.round(session.time), mm = String(Math.floor(t / 60)), ss = String(t % 60).padStart(2, '0');
    node.innerHTML = `<h1>${session.spec.name} complete!</h1><p class="sub">${App.worldName(session.spec)}</p>
      <div class="stats">${row('Rings', st.rings, '/ ' + st.ringsTotal, st.rings === st.ringsTotal)}${row('Lanterns lit', st.targets, '/ ' + st.targetsTotal, st.targets === st.targetsTotal)}${row('Gems', st.gems, '/ ' + session.gemTotalValue, false)}${row('Time', mm + ':' + ss, '')}</div>
      <p class="sub">${perfect ? 'Perfect flight!' : ok ? 'An Elder is grateful: rescued!' : 'Get 60% of the rings and half the lanterns to rescue the Elder.'}</p>
      <p class="hint">Press A / Enter to continue</p>`;
    const go = () => { UI.close(); App.leave(session); };
    UI.custom(node, go, go);
  },

  leave(session) {
    const hub = App.hubFor(session.spec);
    if (hub && LEVELS[hub]) App.goto(hub, { fromLevel: session.id });
    else App.goto(session.id);
  },

  onPortal(session, target) {
    if (!LEVELS[target]) { session.game.toast('Coming soon!', 2.5); return; }
    session.commit(false);
    App.goto(target, { fromLevel: session.id });
  },

  pause() {
    const s = App.session; if (!s || App.busy) return;
    App.paused = true;
    const hub = App.hubFor(s.spec);
    const items = [
      { label: 'Resume', action: () => App.resume() },
      { label: 'Restart level', action: () => { UI.close(); App.paused = false; App.goto(s.id); } },
    ];
    if (hub && hub !== s.id) items.push({ label: 'Leave level', sub: 'Gems and Elders you found are kept', action: () => { s.commit(false); UI.close(); App.paused = false; App.goto(hub, { fromLevel: s.id }); } });
    items.push({ label: 'Settings', action: () => Menus.settings(() => App.pause()) });
    items.push({ label: 'How to play', action: () => Menus.help(() => App.pause()) });
    items.push({ label: 'Quit to title', action: () => { s.commit(false); Save.flush(); App.title(false); } });
    UI.menu({ title: 'Paused', subtitle: s.spec.name, items, onBack: () => App.resume() });
  },
  resume() { UI.close(); App.paused = false; },
};

// ---------- main loop
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  const rawDt = (now - last) / 1000;
  const dt = Math.min(0.1, rawDt); last = now;
  adaptScale(rawDt);
  const inp = Input.poll();
  const s = App.session;
  if (inp.usingPad && inp.buttons.some((b) => b)) Snd.unlock();
  const hintEl = document.getElementById('hint'); if (hintEl) hintEl.style.display = (inp.usingPad || inp.locked) ? 'none' : '';
  if (s && s.attract) { const t = now / 1000; s.freeCam = { pos: [100 + Math.cos(t * 0.12) * 58, 20 + Math.sin(t * 0.07) * 4, 100 + Math.sin(t * 0.12) * 58], look: [100, 5, 100] }; }
  if (UI.active()) UI.update(inp);
  else if (s && !App.busy && inp.pausePressed) App.pause();
  if (s) {
    if (!App.paused && !UI.active() && !App.busy && !s.attract) s.advance(dt, inp);
    else s.acc = 0;
    s.render(dt, s.acc / STEP);
    hud.update();
    if (s.stats) hud.flight(s.stats);
    resize();
    renderer.render(s.scene, camera);
  }
  if (showDbg) updateDbg();
}

// Adaptive resolution: keep roughly 60 fps on weak laptop GPUs and 4K TVs by trading pixels for frames.
let prCur = Math.min(devicePixelRatio || 1, 1.5), emaMs = 16, slowT = 0, fastT = 0;
function prMax() { const w = canvas.clientWidth || 1280, h = canvas.clientHeight || 720; return Math.max(0.55, Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(3.4e6 / (w * h)))); }
function adaptScale(rawDt) {
  if (rawDt > 0.25 || rawDt <= 0) return;
  emaMs += (rawDt * 1000 - emaMs) * 0.06;
  if (emaMs > 26) { slowT += rawDt; fastT = 0; } else if (emaMs < 15.5) { fastT += rawDt; slowT = 0; } else { slowT = fastT = 0; }
  const max = prMax();
  if (slowT > 1.2 && prCur > 0.55) { prCur = Math.max(0.55, prCur - 0.15); slowT = 0; emaMs = 18; renderer.setPixelRatio(prCur); }
  else if (fastT > 6 && prCur < max) { prCur = Math.min(max, prCur + 0.1); fastT = 0; renderer.setPixelRatio(prCur); }
  else if (prCur > max + 0.01) { prCur = max; renderer.setPixelRatio(prCur); }
}

function resize() {
  const w = canvas.clientWidth, h = canvas.clientHeight, pr = renderer.getPixelRatio();
  if (canvas.width !== Math.floor(w * pr) || canvas.height !== Math.floor(h * pr)) { renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
}

function updateDbg() {
  const s = Input.state, p = App.session && App.session.player;
  dbg.textContent =
    `pad: ${s.padName || 'none'}${s.usingPad ? ' (active)' : ''}\n` +
    `move ${s.mx.toFixed(2)},${s.my.toFixed(2)}  cam ${s.csx.toFixed(2)},${s.csy.toFixed(2)}\n` +
    `btn ${s.buttons.join('')}\naxes ${s.axes.map((a) => a.toFixed(2)).join(' ')}\n` +
    (p ? `pos ${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} spd ${p.speedH.toFixed(1)} vy ${p.vy.toFixed(1)}\n${p.onGround ? 'GROUND ' : ''}${p.gliding ? 'GLIDE ' : ''}${p.charging ? 'CHARGE ' : ''}${p.sliding ? 'SLIDE ' : ''}` : '');
}
addEventListener('keydown', (e) => { if (e.code === 'F3') { showDbg = !showDbg; dbg.style.display = showDbg ? 'block' : 'none'; } });
dbg.style.display = showDbg ? 'block' : 'none';

// headless stepping for tests: SD.step(120, {my:1})
App.step = (n = 1, inp = {}) => {
  const s = App.session; const base = { mx: 0, my: 0, jumpHeld: false, lookHeld: false };
  for (let i = 0; i < n; i++) {
    Object.assign(s.pending, { jumpPressed: !!(inp.jumpPressed && i === 0), flamePressed: !!(inp.flamePressed && i === 0), chargePressed: !!(inp.chargePressed && i === 0) });
    s.simStep(Object.assign(base, inp));
  }
  s.acc = 0; s.lastInp = Object.assign({ csx: 0, csy: 0, cdx: 0, cdy: 0 }, base, inp); s.render(STEP, 1); hud.update(); if (s.stats) hud.flight(s.stats); resize(); renderer.render(s.scene, camera);
};

// ---------- boot
const Menus = installMenus(App);
App.Menus = Menus; App.Snd = Snd;
function boot() {
  applySettings();
  for (const ev of ['keydown', 'mousedown', 'pointerdown', 'touchstart']) addEventListener(ev, () => Snd.unlock(), { passive: true });
  Input.onUnlock = () => { if (App.session && !App.paused && !UI.active() && !App.busy && !App.session.attract) App.pause(); };
  const dev = q.get('level');
  if (dev) {
    const used = Save.slots().findIndex((x) => x);
    Save.start(used >= 0 ? used : 0);
    App.session = App.make(dev);
    hud.bind(App.session.game); hud.setMode(App.session.spec.kind); hud.setLevel(App.session.spec.name);
    hud.banner(App.session.spec.name, App.worldName(App.session.spec));
    Snd.music(App.session.def.music || 'meadow');
  } else {
    App.title(true);
  }
  UI.cover(false);
  requestAnimationFrame((n) => { last = n; frame(n); });
}
document.getElementById('hint').addEventListener('click', () => canvas.requestPointerLock && canvas.requestPointerLock());
UI.cover(true);
boot();
