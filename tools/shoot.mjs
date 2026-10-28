// Headless-Chrome smoke test + cover capture. Usage: node tools/shoot.mjs <outDir> [id ...]
// Serves nothing itself: expects http://127.0.0.1:8140/ to serve the repo root.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const out = process.argv[2]; mkdirSync(out, { recursive: true });
const src = readFileSync(new URL('../js/catalog.js', import.meta.url), 'utf8');
const ids = [...src.matchAll(/id: '([a-z]+)'/g)].map((m) => m[1]);
const want = process.argv.slice(3).length ? process.argv.slice(3) : ids;
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const port = 9333;
const proc = spawn(chrome, ['--headless=new', `--remote-debugging-port=${port}`, '--window-size=1280,800', '--hide-scrollbars',
  '--autoplay-policy=no-user-gesture-required', '--user-data-dir=' + out + '/profile', 'about:blank'], { stdio: 'ignore' });
await sleep(2500);
const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); let errs = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d.result || d.error); pend.delete(d.id); }
  if (d.method === 'Runtime.exceptionThrown') errs.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).split('\n')[0]);
  if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errs.push('LOG ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
};
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
for (const g of want) {
  errs = [];
  const url = g === 'hub' ? 'http://127.0.0.1:8140/index.html' : `http://127.0.0.1:8140/games/${g}/index.html`;
  await send('Page.navigate', { url });
  await sleep(g === 'troid' || g === 'drake' || g === 'fox' ? 6000 : 3500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${g}.png`, Buffer.from(shot.data, 'base64'));
  console.log(g.padEnd(9), errs.length ? errs.slice(0, 3).join(' | ') : 'ok');
}
ws.close(); proc.kill();
process.exit(0);
