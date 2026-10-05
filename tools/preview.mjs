// Screenshots an animated SVG at chosen timestamps with headless Chrome.
//   node preview.mjs header 0.8 1.6 2.6 6
// The last frame is also rendered through <img>, the way GitHub embeds it.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'preview');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const [name = 'header', ...times] = process.argv.slice(2);
const file = path.join(HERE, '..', 'assets', `${name}.svg`);
const svg = fs.readFileSync(file, 'utf8');
const [, vw, vh] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
const bg = process.env.BG || '#0d1117';
fs.mkdirSync(OUT, { recursive: true });

function shoot(html, png, budget) {
  const htmlPath = path.join(OUT, png.replace('.png', '.html'));
  fs.writeFileSync(htmlPath, html);
  execFileSync(CHROME, [
    '--headless=new',
    '--hide-scrollbars',
    `--window-size=${vw},${vh}`,
    `--virtual-time-budget=${budget}`,
    `--screenshot=${path.join(OUT, png)}`,
    'file:///' + htmlPath.replace(/\\/g, '/'),
  ], { stdio: 'ignore' });
  console.log(path.join(OUT, png));
}

for (const t of times.length ? times : ['0.8', '1.6', '2.6', '6']) {
  const html = `<!doctype html><body style="margin:0;background:${bg}">${svg}
<script>document.getAnimations().forEach(a=>{a.pause();a.currentTime=${Number(t) * 1000}})</script>`;
  shoot(html, `${name}-t${t}.png`, 500);
}
shoot(
  `<!doctype html><body style="margin:0;background:${bg}"><img src="file:///${file.replace(/\\/g, '/')}" width="${vw}">`,
  `${name}-img.png`,
  9000,
);
