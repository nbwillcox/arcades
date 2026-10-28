// DOM HUD: gems, Wick health, lives, Elders, toast, fade. Large and readable from the couch.
import { WICK_COLORS } from './game.js';

const hex = (c) => '#' + c.toString(16).padStart(6, '0');

export class Hud {
  constructor(game) {
    this.game = game;
    const root = document.createElement('div'); root.id = 'hud';
    root.innerHTML = `
      <div class="pill gems"><span class="ico gemico"></span><b id="h-gems">0</b><small id="h-gemtot"></small></div>
      <div class="pill wick" id="h-wick"><span class="pip"></span><span class="pip"></span><span class="pip"></span></div>
      <div class="pill lives"><span class="ico heart"></span><b id="h-lives">∞</b></div>
      <div class="pill suns" id="h-suns"><span class="ico sunico"></span><b id="h-sun">0</b><small id="h-suntot"></small></div>
      <div class="pill elders"><span class="ico eld"></span><b id="h-eld">0</b><small id="h-eldtot"></small></div>
      <div id="levelname"></div>
      <div id="bossbar"><div class="nm"></div><div class="bar"><i></i></div></div><div id="banner"></div><div id="toast"></div><div id="fade"></div><div id="prompt"></div>`;
    document.body.appendChild(root);
    this.$ = (id) => document.getElementById(id);
    this.last = {};
    this.gemsEl = this.$('h-gems');
  }

  setMode(kind) {
    this.mode = kind; document.getElementById('hud').dataset.mode = kind;
    const f = document.getElementById('fhud'); if (f) f.style.display = kind === 'flight' ? 'flex' : 'none';
  }

  flight(st) {
    let f = document.getElementById('fhud');
    if (!f) { f = document.createElement('div'); f.id = 'fhud'; f.innerHTML = '<div class="pill"><b id="f-ring">0</b><small id="f-ringt"></small><span>rings</span></div><div class="pill"><b id="f-tar">0</b><small id="f-tart"></small><span>lanterns</span></div>'; document.getElementById('hud').appendChild(f); }
    f.style.display = 'flex';
    this.set('f-ring', st.rings); this.set('f-ringt', '/' + st.ringsTotal); this.set('f-tar', st.targets); this.set('f-tart', '/' + st.targetsTotal);
  }

  // Quiet level label in the top-right corner, under the Wick pips.
  setLevel(name) { const el = this.$('levelname'); if (el) el.textContent = name || ''; }

  bind(game) { this.game = game; this.last = {}; }

  banner(text, sub = '', ms = 2600) {
    const b = this.$('banner'); b.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    b.classList.add('on'); clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('on'), ms);
  }

  set(id, v) { if (this.last[id] !== v) { this.last[id] = v; this.$(id).textContent = v; return true; } return false; }

  update(padActive) {
    const g = this.game, S = g.state;
    if (this.set('h-gems', S.gems)) { this.gemsEl.classList.remove('pop'); void this.gemsEl.offsetWidth; this.gemsEl.classList.add('pop'); }
    this.set('h-gemtot', '/' + S.gemsTotal);
    this.set('h-lives', isFinite(S.lives) ? S.lives : '∞');
    this.$('h-suns').style.display = S.sunstoneTotal > 0 ? 'flex' : 'none';
    this.set('h-sun', S.sunstones); this.set('h-suntot', '/' + S.sunstoneTotal);
    this.set('h-eld', S.elders); this.set('h-eldtot', '/' + S.eldersTotal);
    const pips = this.$('h-wick').children;
    for (let i = 0; i < 3; i++) {
      const on = i < S.hp;
      pips[i].style.background = on ? hex(WICK_COLORS[S.hp]) : 'rgba(255,255,255,0.12)';
      pips[i].style.boxShadow = on ? `0 0 10px ${hex(WICK_COLORS[S.hp])}` : 'none';
    }
    const bb = this.$('bossbar');
    if (g.boss) { bb.classList.add('on'); bb.firstChild.textContent = g.boss.name; bb.lastChild.firstChild.style.width = (100 * g.boss.hp / g.boss.max) + '%'; } else bb.classList.remove('on');
    const t = this.$('toast');
    const show = g.toastT > 0;
    if (this.last.toast !== (show ? g.toastText : '')) { this.last.toast = show ? g.toastText : ''; t.textContent = this.last.toast; }
    t.classList.toggle('on', show);
    const f = this.$('fade'), want = g.dying > 0 ? Math.min(1, (1.3 - g.dying) / 0.5) : 0;
    if (this.last.fade !== want) { this.last.fade = want; f.style.opacity = want; }
  }
}
