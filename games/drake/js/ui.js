// DOM menus and overlays. Every screen is operable with a gamepad (d-pad / stick + A / B) or keyboard or mouse.
import { Input } from './input.js';

const root = document.createElement('div');
root.id = 'ui';
document.body.appendChild(root);
const wipe = document.createElement('div'); wipe.id = 'wipe'; document.body.appendChild(wipe);

let current = null; // active screen {el, items, index, onBack, onNav}
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };

export const UI = {
  active() { return !!current; },

  // items: [{label, sub?, action, disabled?, value?(fn -> text), left?, right?}]
  menu({ title, subtitle, items, onBack, index = 0, wide = false, note }) {
    UI.close();
    const box = el('div', 'screen' + (wide ? ' wide' : ''));
    if (title) box.appendChild(el('h1', '', title));
    if (subtitle) box.appendChild(el('p', 'sub', subtitle));
    const list = el('div', 'list');
    const scr = { el: box, items, index, onBack, list, nodes: [] };
    items.forEach((it, i) => {
      const row = el('button', 'item' + (it.disabled ? ' off' : ''));
      row.type = 'button';
      const l = el('span', 'lbl', it.label); row.appendChild(l);
      const v = el('span', 'val', it.value ? it.value() : ''); row.appendChild(v);
      if (it.sub) row.appendChild(el('small', '', it.sub));
      row.addEventListener('mouseenter', () => { scr.index = i; UI._focus(); });
      row.addEventListener('click', () => { scr.index = i; UI._activate(0); });
      list.appendChild(row); scr.nodes.push({ row, v, it });
    });
    box.appendChild(list);
    if (note) box.appendChild(el('p', 'note', note));
    root.appendChild(box); root.classList.add('on'); document.body.classList.add('ui-on');
    current = scr; UI._focus();
    return scr;
  },

  custom(node, onBack, onConfirm) {
    UI.close();
    const box = el('div', 'screen wide'); box.appendChild(node);
    root.appendChild(box); root.classList.add('on'); document.body.classList.add('ui-on');
    current = { el: box, items: [], index: 0, onBack, onConfirm, nodes: [], list: null, custom: true };
    return current;
  },

  close() {
    if (current) { current.el.remove(); current = null; }
    root.classList.remove('on'); document.body.classList.remove('ui-on');
  },

  refresh() { if (current) current.nodes.forEach((n) => { if (n.it.value) n.v.textContent = n.it.value(); }); },

  _focus() {
    if (!current) return;
    current.nodes.forEach((n, i) => n.row.classList.toggle('focus', i === current.index));
    const n = current.nodes[current.index]; if (n && n.row.scrollIntoView) n.row.scrollIntoView({ block: 'nearest' });
  },

  _activate(dir) {
    if (!current || !current.nodes.length) return;
    const it = current.items[current.index];
    if (!it || it.disabled) return;
    if (dir < 0 && it.left) it.left(); else if (dir > 0 && it.right) it.right(); else if (dir === 0 && it.action) it.action();
    UI.refresh();
  },

  // Call once per frame with Input.state; handles navigation edges. Returns true if a screen consumed input.
  update(s) {
    if (!current) return false;
    if (current.custom) {
      if (s.confirmPressed && current.onConfirm) current.onConfirm();
      if (s.backPressed && current.onBack) current.onBack();
      return true;
    }
    const n = current.items.length;
    if (s.navUp) { current.index = (current.index - 1 + n) % n; UI._focus(); UI.onSound && UI.onSound('menu'); }
    if (s.navDown) { current.index = (current.index + 1) % n; UI._focus(); UI.onSound && UI.onSound('menu'); }
    if (s.navLeft) UI._activate(-1);
    if (s.navRight) UI._activate(1);
    if (s.confirmPressed) UI._activate(0);
    if (s.backPressed && current.onBack) { UI.onSound && UI.onSound('back'); current.onBack(); }
    return true;
  },

  // Fade the whole screen to black, run fn in the dark, fade back in.
  async transition(fn, ms = 350) {
    wipe.style.transition = `opacity ${ms}ms`; wipe.style.opacity = 1;
    await new Promise((r) => setTimeout(r, ms));
    await fn();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    wipe.style.opacity = 0;
    await new Promise((r) => setTimeout(r, ms));
  },
  cover(on) { wipe.style.transition = 'none'; wipe.style.opacity = on ? 1 : 0; },

  el,
};
