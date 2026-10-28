// Title, slots, settings, controls, help and game-over screens.
import { UI } from './ui.js';
import { Input, KEYMAP, KEY_DEFAULTS, ACTION_LABELS } from './input.js';
import { Save } from './save.js';
import { Audio as Snd } from './audio.js';
import { camSettings } from './camera.js';

const pct = (v) => Math.round(v * 100) + '%';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const keyName = (c) => (c || '').replace('Key', '').replace('Arrow', '').replace('Digit', '').replace('Space', 'Space').replace('Escape', 'Esc').replace('ShiftLeft', 'L-Shift').replace('Enter', 'Enter');

export function applySettings() {
  const s = Save.settings;
  Snd.setVolumes(1, s.volume, s.music);
  camSettings.sens = s.sens; camSettings.invertY = s.invertY;
  Input.rumbleOn = s.rumble;
  document.getElementById('hud').style.setProperty('--hs', s.hudScale);
  if (s.bindings) for (const [a, codes] of Object.entries(s.bindings)) if (KEYMAP[a]) KEYMAP[a] = codes;
}

export function installMenus(App) {
  const S = () => Save.settings;
  const persist = () => { Save.saveSettings(); applySettings(); };
  const sound = (n) => Snd.sfx(n);
  UI.onSound = (n) => Snd.sfx(n);

  const Menus = {
    // ---- title
    splash() {
      const node = UI.el('div');
      node.innerHTML = `<h1 class="logo">SPACEDRAKE</h1><p class="sub">A dragon platformer</p><p class="hint blink">Press A, Enter or click to start</p>`;
      node.addEventListener('click', () => { Snd.unlock(); Menus.title(); });
      UI.custom(node, null, () => { Snd.unlock(); Snd.sfx('select'); Menus.title(); });
    },

    title() {
      const used = Save.slots().findIndex((x) => x);
      const items = [];
      if (used >= 0) items.push({ label: 'Continue', sub: `Slot ${Save.slots().findIndex((x, i) => x && i === Save.lastSlot()) >= 0 ? Save.lastSlot() + 1 : used + 1}`, action: () => { sound('select'); App.continueGame(); } });
      items.push({ label: 'New Game', action: () => { sound('select'); Menus.slots(); } });
      items.push({ label: 'Settings', action: () => { sound('select'); Menus.settings(() => Menus.title()); } });
      items.push({ label: 'How to Play', action: () => { sound('select'); Menus.help(() => Menus.title()); } });
      UI.menu({ title: 'SPACEDRAKE', subtitle: 'Collect gems. Rescue the Elders. Beat Warlord Gloam.', items, wide: false });
    },

    slots() {
      const items = Save.slots().map((s, i) => {
        const sm = Save.summarize(i);
        return {
          label: `Slot ${i + 1}`,
          sub: sm ? `${sm.gems} gems · ${sm.elders} Elders · ${sm.sunstones} Sunstones` : 'Empty',
          value: () => (sm ? (Save.slots()[i].settings.cozy ? 'Cozy' : 'Classic') : ''),
          action: () => { sound('select'); if (sm) Menus.slotActions(i); else Menus.difficulty(i); },
        };
      });
      items.push({ label: 'Back', action: () => { sound('back'); Menus.title(); } });
      UI.menu({ title: 'Choose a slot', items, onBack: () => Menus.title() });
    },

    slotActions(i) {
      UI.menu({
        title: `Slot ${i + 1}`,
        items: [
          { label: 'Continue', action: () => { sound('select'); Save.start(i); App.beginSlot(); } },
          { label: 'Erase and start over', sub: 'This cannot be undone', action: () => Menus.confirm('Erase this slot?', () => { Save.erase(i); Menus.slots(); }, () => Menus.slotActions(i)) },
          { label: 'Back', action: () => Menus.slots() },
        ], onBack: () => Menus.slots(),
      });
    },

    confirm(text, yes, no) {
      UI.menu({ title: text, items: [{ label: 'No', action: no }, { label: 'Yes', action: yes }], onBack: no });
    },

    difficulty(i) {
      const go = (cozy) => { sound('select'); Save.start(i, true); Save.cur.settings.cozy = cozy; Save.flush(); App.beginSlot(true); };
      UI.menu({
        title: 'Difficulty', subtitle: 'You can not change this later',
        items: [
          { label: 'Cozy', sub: 'Unlimited tries, extra hearts, gentle gates. Recommended for relaxed play.', action: () => go(true) },
          { label: 'Classic', sub: 'Three lives per level, standard gate counts.', action: () => go(false) },
          { label: 'Back', action: () => Menus.slots() },
        ], onBack: () => Menus.slots(),
      });
    },

    // ---- settings
    settings(back) {
      const sl = (get, set, step = 0.1, lo = 0, hi = 1) => ({ value: () => pct(get()), left: () => { set(clamp(+(get() - step).toFixed(2), lo, hi)); persist(); sound('menu'); }, right: () => { set(clamp(+(get() + step).toFixed(2), lo, hi)); persist(); sound('menu'); } });
      const tg = (get, set, labels) => ({ value: () => labels[get() ? 1 : 0], left: () => { set(!get()); persist(); sound('menu'); }, right: () => { set(!get()); persist(); sound('menu'); }, action: () => { set(!get()); persist(); sound('menu'); } });
      const items = [
        Object.assign({ label: 'Music volume' }, sl(() => S().music, (v) => { S().music = v; })),
        Object.assign({ label: 'Sound volume' }, sl(() => S().volume, (v) => { S().volume = v; })),
        Object.assign({ label: 'Camera speed' }, sl(() => S().sens, (v) => { S().sens = v; }, 0.1, 0.4, 2)),
        Object.assign({ label: 'Invert camera up/down' }, tg(() => S().invertY, (v) => { S().invertY = v; }, ['Off', 'On'])),
        Object.assign({ label: 'Glide button' }, tg(() => S().glideToggle, (v) => { S().glideToggle = v; }, ['Hold', 'Press once'])),
        Object.assign({ label: 'Controller rumble' }, tg(() => S().rumble, (v) => { S().rumble = v; }, ['Off', 'On'])),
        Object.assign({ label: 'Text and HUD size' }, sl(() => S().hudScale, (v) => { S().hudScale = v; }, 0.15, 0.8, 1.6)),
        { label: 'Keyboard controls', action: () => { sound('select'); Menus.controls(() => Menus.settings(back)); } },
        { label: 'Back', action: () => { sound('back'); back(); } },
      ];
      UI.menu({ title: 'Settings', items, onBack: back, wide: true, note: 'Left / Right changes a value' });
    },

    // ---- controls (keyboard rebinding) + gamepad cheat sheet
    controls(back) {
      const acts = Object.keys(ACTION_LABELS);
      const items = acts.map((a) => ({
        label: ACTION_LABELS[a], value: () => (KEYMAP[a] || []).map(keyName).join(' / '),
        action: () => Menus.capture(a, () => Menus.controls(back)),
      }));
      items.push({ label: 'Reset to defaults', action: () => { for (const a of acts) KEYMAP[a] = KEY_DEFAULTS[a].slice(); S().bindings = null; persist(); Menus.controls(back); } });
      items.push({ label: 'Back', action: () => { sound('back'); back(); } });
      UI.menu({ title: 'Keyboard controls', subtitle: 'Gamepad: A jump / glide, X flame, B charge, sticks move + camera, R3 look around', items, onBack: back, wide: true, note: 'Choose an action, then press the new key' });
    },

    capture(action, back) {
      const node = UI.el('div');
      node.innerHTML = `<h1>${ACTION_LABELS[action]}</h1><p class="sub">Press the new key...</p><p class="hint">Esc to cancel</p>`;
      UI.custom(node, null, null);
      const onKey = (e) => {
        e.preventDefault(); e.stopPropagation();
        removeEventListener('keydown', onKey, true);
        if (e.code !== 'Escape') {
          KEYMAP[action] = [e.code];
          S().bindings = Object.assign({}, S().bindings || {}, { [action]: [e.code] });
          persist();
        }
        setTimeout(back, 0);
      };
      addEventListener('keydown', onKey, true);
    },

    // ---- how to play
    help(back) {
      const node = UI.el('div');
      node.innerHTML = `<h1>How to play</h1>
        <div class="help">
          <div><b>Move</b><span>Left stick / WASD</span></div>
          <div><b>Camera</b><span>Right stick / mouse / arrows</span></div>
          <div><b>Jump</b><span>A / Space</span></div>
          <div><b>Glide</b><span>Press jump again in the air and hold it</span></div>
          <div><b>Flame</b><span>X / J / left click</span></div>
          <div><b>Charge</b><span>B / K / right click</span></div>
          <div><b>Look around</b><span>Click right stick / hold E</span></div>
          <div><b>Re-centre camera</b><span>Left trigger / Q</span></div>
        </div>
        <p class="sub">Collect gems, find Sunstones, rescue the crystal Elders, and step through the portals.</p>
        <p class="hint">Press A / Enter to go back</p>`;
      UI.custom(node, back, back);
    },

    gameOver(session, retry, leave) {
      UI.menu({ title: 'Out of lives', subtitle: session.spec.name, items: [{ label: 'Try again', action: retry }, { label: 'Leave level', action: leave }], onBack: null });
    },
  };
  return Menus;
}
