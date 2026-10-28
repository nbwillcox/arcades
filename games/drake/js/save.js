// Save data: three slots in localStorage. Progress is per level (collected gem slots, rescued Elders).
const KEY = 'spacedrake.save.v1';
const blank = () => ({ levels: {}, totals: { gems: 0, elders: 0, sunstones: 0 }, settings: { cozy: true }, created: Date.now(), playtime: 0, hubPos: null });

let data = { slots: [null, null, null], last: 0, settings: { sens: 1, invertY: false, hudScale: 1, volume: 0.7, music: 0.6, rumble: true, glideToggle: false, bindings: null } };
try { const raw = localStorage.getItem(KEY); if (raw) data = Object.assign(data, JSON.parse(raw)); } catch (e) { /* private mode */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* ignore */ } };

export const Save = {
  slot: 0, cur: null,
  get settings() { return data.settings; },
  lastSlot() { return data.last || 0; },
  saveSettings() { persist(); },
  slots() { return data.slots; },
  start(i, fresh = false) {
    this.slot = i;
    if (fresh || !data.slots[i]) data.slots[i] = blank();
    this.cur = data.slots[i]; data.last = i; persist();
    return this.cur;
  },
  erase(i) { data.slots[i] = null; persist(); },
  flush() { if (this.cur) { data.slots[this.slot] = this.cur; persist(); } },
  level(id) { return (this.cur && this.cur.levels[id]) || { gemSlots: [], elders: [], done: false, gems: 0, gemsTotal: 0, time: 0, sunstones: [] }; },
  commitLevel(id, rec) {
    if (!this.cur) return;
    this.cur.levels[id] = rec;
    this.recount(); this.flush();
  },
  recount() {
    const t = { gems: 0, elders: 0, sunstones: 0, done: [] };
    for (const [id, r] of Object.entries(this.cur.levels)) {
      if (r.done) t.done.push(id); t.gems += r.gems || 0; t.elders += (r.elders || []).length; t.sunstones += (r.sunstones || []).length; }
    this.cur.totals = t;
  },
  totals() { return this.cur ? this.cur.totals : { gems: 0, elders: 0, sunstones: 0, done: [] }; },
  summarize(i) {
    const s = data.slots[i]; if (!s) return null;
    return { gems: s.totals.gems, elders: s.totals.elders, sunstones: s.totals.sunstones, playtime: s.playtime };
  },
};
