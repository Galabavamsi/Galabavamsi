// Real-time screenshots of an SVG embedded through <img>, the way GitHub serves it.
//   node preview-img.mjs header 0.5 1.5 3 6

import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'preview');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [name = 'header', ...rest] = process.argv.slice(2);
const times = (rest.length ? rest : ['0.5', '1.5', '3', '6']).map(Number);
const file = path.join(HERE, '..', 'assets', `${name}.svg`);
const svg = fs.readFileSync(file, 'utf8');
const [, vw, vh] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
const bg = process.env.BG || '#0d1117';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

fs.mkdirSync(OUT, { recursive: true });
const page = path.join(OUT, `${name}-img-live.html`);
fs.writeFileSync(page, `<!doctype html><body style="margin:0;background:${bg}"><img src="${name}.svg?${Date.now()}" width="${vw}">`);
fs.copyFileSync(file, path.join(OUT, `${name}.svg`));

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [
  '--headless=new', '--hide-scrollbars', `--remote-debugging-port=${port}`,
  `--window-size=${vw},${vh}`, `--user-data-dir=${path.join(OUT, '.chrome')}`, 'about:blank',
], { stdio: 'ignore' });

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try {
    target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === 'page');
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (pending.has(m.id)) pending.get(m.id)(m.result), pending.delete(m.id);
};
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: +vw, height: +vh, deviceScaleFactor: 1, mobile: false });
const t0 = Date.now();
await send('Page.navigate', { url: 'file:///' + page.replace(/\\/g, '/') });
for (const t of times) {
  await sleep(Math.max(0, t * 1000 - (Date.now() - t0)));
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const png = path.join(OUT, `${name}-live-t${t}.png`);
  fs.writeFileSync(png, Buffer.from(data, 'base64'));
  console.log(png, `(${((Date.now() - t0) / 1000).toFixed(2)}s)`);
}
ws.close();
chrome.kill();
