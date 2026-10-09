// Regenerates the painted SVGs in ../assets.
//
//   node paint.mjs                   seed from today's date (UTC), data from data/github.json
//   SEED=2026-10-06 node paint.mjs   reproduce a specific day's canvas
//   GITHUB_TOKEN=... node paint.mjs  refresh data/github.json from the GitHub API first

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import opentype from 'opentype.js';
import { brushStroke, centerlineD, hashSeed, polyD, rng, samplePath } from './brush.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, '..', 'assets');
const CACHE = path.join(HERE, 'data', 'github.json');
const SEED = process.env.SEED || new Date().toISOString().slice(0, 10);
const USER = 'Galabavamsi';

const TAGLINE = 'Mechatronics at IIT Bhilai. Open-source contributor to robotics tools.';

// Upstream projects shown in the open-source chart. Counts come from the API.
const PROJECTS = [
  { repo: 'Hebbian-Robotics/hflow', name: 'HFlow', role: 'robot data processing' },
  { repo: 'cerulion-inc/cerulion', name: 'Cerulion', role: 'robot runtime, ROS 2 interop' },
  { repo: 'robocurve/inspect-robots', name: 'Inspect Robots', role: 'robot evaluation' },
];

const font = (f) => opentype.loadSync(path.join(HERE, 'fonts', f));
const DISPLAY = font('BarlowCondensed-Black.ttf');
const HEAD = font('BarlowCondensed-ExtraBold.ttf');
const MEDIUM = font('Barlow-Medium.ttf');
const TEXT = font('Barlow-Regular.ttf');

// Prussian-blue ground, cadmium-yellow paint, steel for the machine's plan.
const C = {
  ground: '#152238',
  groundEdge: '#0f192b',
  steel: '#6d86ab',
  bone: '#e6ebf2',
  mute: '#8c9cb8',
  paint: [
    { c: '#eba92e', w: 0.46 },
    { c: '#f1b73f', w: 0.22 },
    { c: '#f6c65a', w: 0.1 },
    { c: '#e09c26', w: 0.12 },
    { c: '#c98419', w: 0.06, o: 0.75 },
    { c: '#fff1c4', w: 0.04, o: 0.45 },
  ],
  paintBody: '#e7a52c',
  // Contribution levels 1-4, one hue dark to light (validated against `ground`).
  levels: ['#7c5e24', '#b0832a', '#e2a42e', '#ffd25e'],
};
const MONO = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';

// ---------------------------------------------------------------------------- data

async function loadGitHub() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return JSON.parse(fs.readFileSync(CACHE, 'utf8'));

  const gh = async (url, body) => {
    const res = await fetch(url, {
      method: body ? 'POST' : 'GET',
      headers: { authorization: `bearer ${token}`, 'user-agent': USER, accept: 'application/vnd.github+json' },
      body: body && JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${url} -> ${res.status} ${await res.text()}`);
    return res.json();
  };
  const cal = await gh('https://api.github.com/graphql', {
    query: `query($u:String!){user(login:$u){contributionsCollection{contributionCalendar{
      totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`,
    variables: { u: USER },
  });
  const q = encodeURIComponent(`is:pr author:${USER} -user:${USER}`);
  const search = await gh(`https://api.github.com/search/issues?q=${q}&per_page=100`);

  const levelOf = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };
  const c = cal.data.user.contributionsCollection.contributionCalendar;
  const data = {
    fetched: new Date().toISOString(),
    total: c.totalContributions,
    weeks: c.weeks.map((w) => w.contributionDays.map((d) => [d.date, d.contributionCount, levelOf[d.contributionLevel]])),
    prs: search.items.map((i) => ({
      repo: i.repository_url.replace('https://api.github.com/repos/', ''),
      number: i.number,
      state: i.pull_request?.merged_at ? 'merged' : i.state,
    })),
  };
  fs.mkdirSync(path.dirname(CACHE), { recursive: true });
  fs.writeFileSync(CACHE, JSON.stringify(data) + '\n');
  return data;
}

// ---------------------------------------------------------------------------- shared

function setText(f, str, x, y, size, tracking = 0) {
  const glyphs = f.stringToGlyphs(str);
  const scale = size / f.unitsPerEm;
  let d = '';
  let cx = x;
  glyphs.forEach((g, i) => {
    d += g.getPath(cx, y, size).toPathData(1);
    cx += g.advanceWidth * scale + tracking * size;
    if (i < glyphs.length - 1) cx += f.getKerningValue(g, glyphs[i + 1]) * scale;
  });
  return { d, width: cx - x - tracking * size };
}

const textWidth = (f, str, size) => setText(f, str, 0, 0, size).width;
const capHeight = (f, size) => (f.tables.os2.sCapHeight / f.unitsPerEm) * size;

// Fraction of the stroke's length at which it crosses x (searching in its direction of travel).
function uAtX(points, x) {
  const { pts, length } = samplePath(points);
  const dir = Math.sign(points[points.length - 1][0] - points[0][0]);
  const p = pts.find((q) => dir * (q.x - x) >= 0);
  return p ? p.s / length : 1;
}

const cross = (x, y, r = 6) =>
  `<path d="M${(x - r).toFixed(1)} ${y.toFixed(1)}h${2 * r}M${x.toFixed(1)} ${(y - r).toFixed(1)}v${2 * r}"/>`;

// Canvas ground, grain, and the paint filter every piece shares.
function canvasDefs(W, H, warp = 5) {
  return `<clipPath id="card"><rect width="${W}" height="${H}" rx="14"/></clipPath>
<radialGradient id="vig" cx=".42" cy=".42" r=".8"><stop offset=".55" stop-color="${C.groundEdge}" stop-opacity="0"/><stop offset="1" stop-color="${C.groundEdge}" stop-opacity=".85"/></radialGradient>
<filter id="grain" x="0" y="0" width="100%" height="100%">
<feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="4" stitchTiles="stitch"/>
<feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .07 0"/>
<feComposite in2="SourceGraphic" operator="in"/>
</filter>
<filter id="paint" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
<feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="11" result="warp"/>
<feDisplacementMap in="SourceGraphic" in2="warp" scale="${warp}" xChannelSelector="R" yChannelSelector="G" result="rough"/>
<feColorMatrix in="rough" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  .2 .7 .1 0 0" result="height"/>
<feGaussianBlur in="height" stdDeviation="1.1" result="bump"/>
<feSpecularLighting in="bump" surfaceScale="2.6" specularConstant=".55" specularExponent="22" lighting-color="#fff6dc" result="spec"><feDistantLight azimuth="225" elevation="52"/></feSpecularLighting>
<feComposite in="spec" in2="rough" operator="in" result="gloss"/>
<feComposite in="rough" in2="gloss" operator="arithmetic" k2="1" k3=".45"/>
</filter>`;
}

const canvasGround = (W, H) => `<rect width="${W}" height="${H}" fill="${C.ground}"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
<rect width="${W}" height="${H}" fill="#fff" filter="url(#grain)"/>`;

const svgOpen = (W, H, title, desc) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="t d">
<title id="t">${title}</title>
<desc id="d">${desc}</desc>`;

const REDUCED = '@media (prefers-reduced-motion:reduce){*{animation:none!important;stroke-dashoffset:0!important;opacity:1!important}}';

// ---------------------------------------------------------------------------- header

function header() {
  const W = 1200, H = 352;
  const rand = rng(hashSeed(`header:${SEED}`));
  const jitter = (n) => (rand() - 0.5) * 2 * n;

  // Name: fit to a fixed measure so the brush passes can be planned around it.
  const NAME = 'GALABA VAMSI';
  const nameX = 72, measure = 800, tracking = 0.012;
  const size = (100 * measure) / setText(DISPLAY, NAME, 0, 0, 100, tracking).width;
  const capH = capHeight(DISPLAY, size);
  const capTop = 84;
  const baseline = capTop + capH;
  const name = setText(DISPLAY, NAME, nameX, baseline, size, tracking);
  const nameEnd = nameX + name.width;

  // Two raster passes, left-to-right then back, overlapping through the middle of the caps.
  const margin = 40;
  const span = capH + 2 * margin;
  const ws = span * 0.6;
  const y1 = capTop - margin + ws / 2;
  const y2 = baseline + margin - ws / 2;

  const p1 = [
    [-90, y1 + 6 + jitter(4)],
    [260, y1 - 4 + jitter(5)],
    [620, y1 + 3 + jitter(5)],
    [nameEnd + 40, y1 - 3 + jitter(4)],
    [nameEnd + 185, y1 + 4 + jitter(6)],
  ];
  const pass1 = brushStroke({
    points: p1,
    width: ws,
    tones: C.paint,
    body: C.paintBody,
    seed: hashSeed(`p1:${SEED}`),
    // The brush only runs dry once it has cleared the last letter.
    dryStart: uAtX(p1, nameEnd + 14),
  });
  const turnX = nameEnd + 140;
  const pass2 = brushStroke({
    points: [
      [turnX, y2 + jitter(4)],
      [nameEnd - 120, y2 + 5 + jitter(5)],
      [430, y2 - 3 + jitter(5)],
      [90, y2 + 4 + jitter(4)],
      [-140, y2 - 2 + jitter(4)],
    ],
    width: ws * 0.97,
    tones: C.paint,
    body: C.paintBody,
    seed: hashSeed(`p2:${SEED}`),
    dryStart: 0.9,
  });

  // The planner's toolpath: pass 1, a G2 turnaround, pass 2.
  const a = pass1.path.pts[pass1.path.pts.length - 1];
  const b = pass2.path.pts[0];
  const reach = Math.max(a.x, b.x) + 70;
  const turnD = `M${a.x.toFixed(1)} ${a.y.toFixed(1)}C${reach} ${a.y.toFixed(1)} ${reach} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
  const toolD = polyD(pass1.path.pts.map((p) => [p.x, p.y])) + turnD + polyD(pass2.path.pts.map((p) => [p.x, p.y]));
  const waypoints = [cross(a.x, a.y), cross(b.x, b.y), cross(reach - 18, (a.y + b.y) / 2, 4)];

  const tagline = setText(TEXT, TAGLINE, nameX + 2, baseline + margin + 58, 25);

  const len1 = Math.ceil(pass1.path.length + 60);
  const len2 = Math.ceil(pass2.path.length + 60);
  const lenTool = 3600;

  // Timeline (s): the plan draws first, the brush follows a beat behind it.
  const T = { tool: [0, 1.15], p1: [0.45, 1.5], p2: [1.95, 1.55] };
  const reveal = (cls, d) => `<mask id="${cls}" maskUnits="userSpaceOnUse" x="-200" y="0" width="${W + 400}" height="${H}">
<path class="${cls}" d="${d}" fill="none" stroke="#fff" stroke-width="${(ws * 1.45).toFixed(0)}" stroke-linecap="round" filter="url(#ragged)"/>
</mask>`;

  return `${svgOpen(W, H, 'Galaba Vamsi', `A robot toolpath is planned across a dark blue canvas, then a brush paints two passes of yellow along it, leaving the name Galaba Vamsi as unpainted letters. Tagline: ${TAGLINE}`)}
<style>
.tool{stroke-dasharray:${lenTool};stroke-dashoffset:${lenTool};animation:draw ${T.tool[1]}s cubic-bezier(.4,0,.6,1) ${T.tool[0]}s forwards}
.r1{stroke-dasharray:${len1} ${len1 + 10};stroke-dashoffset:${len1};animation:draw ${T.p1[1]}s cubic-bezier(.55,.05,.3,1) ${T.p1[0]}s forwards}
.r2{stroke-dasharray:${len2} ${len2 + 10};stroke-dashoffset:${len2};animation:draw ${T.p2[1]}s cubic-bezier(.55,.05,.3,1) ${T.p2[0]}s forwards}
.wp{opacity:0;animation:show .3s ease-out ${(T.tool[0] + T.tool[1] * 0.55).toFixed(2)}s forwards}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes show{to{opacity:1}}
${REDUCED}
</style>
<defs>
${canvasDefs(W, H)}
<filter id="ragged" filterUnits="userSpaceOnUse" x="-200" y="0" width="${W + 400}" height="${H}">
<feTurbulence type="fractalNoise" baseFrequency=".015 .11" numOctaves="2" seed="7"/>
<feDisplacementMap in="SourceGraphic" scale="34" xChannelSelector="R" yChannelSelector="G"/>
</filter>
<mask id="stencil" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
<rect width="${W}" height="${H}" fill="#fff"/><path d="${name.d}" fill="#000"/>
</mask>
${reveal('r1', centerlineD(pass1.path, 30))}
${reveal('r2', centerlineD(pass2.path, 30))}
<mask id="mt" maskUnits="userSpaceOnUse" x="-200" y="0" width="${W + 400}" height="${H}">
<path class="tool" d="${toolD}" fill="none" stroke="#fff" stroke-width="16"/>
</mask>
</defs>
<g clip-path="url(#card)">
${canvasGround(W, H)}
<g mask="url(#stencil)"><g mask="url(#mt)" fill="none" stroke="${C.steel}" stroke-width="1.3" stroke-linecap="round">
<path d="${toolD}" stroke-dasharray="1 7" opacity=".8"/>
</g></g>
<g class="wp" fill="none" stroke="${C.steel}" stroke-width="1.3">${waypoints.join('')}</g>
<text class="wp" x="${(reach + 14).toFixed(0)}" y="${((a.y + b.y) / 2 + 4).toFixed(0)}" fill="${C.mute}" font-family="${MONO}" font-size="13">G2</text>
<g mask="url(#stencil)" filter="url(#paint)">
<g mask="url(#r1)">${pass1.svg}</g>
<g mask="url(#r2)">${pass2.svg}</g>
</g>
<path d="${tagline.d}" fill="${C.bone}"/>
</g>
</svg>
`;
}

// ---------------------------------------------------------------------------- open source

// One brush dab per merged PR; open PRs are toolpath the brush hasn't painted yet.
function openSource(data) {
  const W = 1200, pad = 64;
  const rows = PROJECTS.map((p) => {
    const mine = data.prs.filter((pr) => pr.repo === p.repo);
    return {
      ...p,
      merged: mine.filter((pr) => pr.state === 'merged').length,
      open: mine.filter((pr) => pr.state === 'open').length,
    };
  }).sort((a, b) => b.merged - a.merged || b.open - a.open);
  const total = rows.reduce((n, r) => n + r.merged, 0);
  const totalOpen = rows.reduce((n, r) => n + r.open, 0);

  const top = 170, rowH = 78;
  const H = top + rows.length * rowH - 10;
  const x0 = 352, dabLen = 56, dabGap = 10, unit = dabLen + dabGap;

  const title = setText(HEAD, `${total} pull requests merged upstream`, pad, 78, 42);
  const caption = setText(
    TEXT,
    totalOpen
      ? `Each stroke is a merged PR. Dotted paths are ${totalOpen} open PRs still in review.`
      : 'Each stroke is a merged PR.',
    pad, 114, 20,
  );

  let labels = '', painted = '', planned = '', masks = '', css = '';
  let t = 0.35;
  rows.forEach((r, i) => {
    const cy = top + i * rowH;
    const y = cy + 6;
    labels += `<path d="${setText(MEDIUM, r.name, pad, cy - 2, 25).d}" fill="${C.bone}"/>`;
    labels += `<path d="${setText(TEXT, r.role, pad, cy + 23, 18).d}" fill="${C.mute}"/>`;
    const count = r.open ? `${r.merged} merged, ${r.open} open` : `${r.merged} merged`;
    labels += `<path d="${setText(TEXT, count, W - pad - textWidth(TEXT, count, 20), cy + 13, 20).d}" fill="${C.bone}"/>`;

    const rand = rng(hashSeed(`oss:${r.repo}:${SEED}`));
    const wob = () => (rand() - 0.5) * 3;
    let dabs = '';
    for (let k = 0; k < r.merged; k++) {
      const x = x0 + k * unit;
      dabs += brushStroke({
        points: [[x, y + wob()], [x + dabLen / 2, y + wob()], [x + dabLen, y + wob()]],
        width: 22,
        tones: C.paint,
        body: C.paintBody,
        seed: hashSeed(`dab:${r.repo}:${k}:${SEED}`),
        bristles: 18,
        step: 2,
        attack: 0.08,
        dryStart: 0.78,
        wobble: 0.22,
        edgeRag: 0,
      }).svg;
    }

    // The brush sweeps the row at a steady pace, then the plan for the open PRs appears.
    const sweep = r.merged * unit + 30;
    const dur = Math.max(0.3, r.merged * 0.11);
    masks += `<mask id="row${i}" maskUnits="userSpaceOnUse" x="0" y="${cy - 40}" width="${W}" height="80"><path class="row${i}" d="M${x0 - 16} ${y}h${sweep}" stroke="#fff" stroke-width="44" fill="none"/></mask>`;
    css += `.row${i}{stroke-dasharray:${sweep} ${sweep + 10};stroke-dashoffset:${sweep};animation:draw ${dur.toFixed(2)}s linear ${t.toFixed(2)}s forwards}
`;
    painted += `<g mask="url(#row${i})">${dabs}</g>`;
    t += dur + 0.12;

    if (r.open) {
      const from = x0 + r.merged * unit;
      let marks = '';
      for (let k = 0; k <= r.open; k++) marks += cross(from + k * unit - dabGap / 2, y, 5);
      css += `.open${i}{opacity:0;animation:show .5s ease-out ${(t - 0.08).toFixed(2)}s forwards}
`;
      planned += `<g class="open${i}" fill="none" stroke="${C.steel}" stroke-width="1.4" stroke-linecap="round"><path d="M${from} ${y}h${r.open * unit - dabGap}" stroke-dasharray="1 7"/>${marks}</g>`;
    }
  });

  const desc = `${total} pull requests merged upstream. ` +
    rows.map((r) => `${r.name}: ${r.merged} merged${r.open ? `, ${r.open} open` : ''}`).join('. ') + '.';

  return `${svgOpen(W, H, `${total} pull requests merged upstream`, desc)}
<style>
${css}@keyframes draw{to{stroke-dashoffset:0}}
@keyframes show{to{opacity:1}}
${REDUCED}
</style>
<defs>
${canvasDefs(W, H, 2.5)}
${masks}
</defs>
<g clip-path="url(#card)">
${canvasGround(W, H)}
<path d="${title.d}" fill="${C.bone}"/>
<path d="${caption.d}" fill="${C.mute}"/>
${labels}
${planned}
<g filter="url(#paint)">${painted}</g>
</g>
</svg>
`;
}

// ---------------------------------------------------------------------------- calendar

// The contribution year, one brush dab per active day, painted week by week.
function calendar(data) {
  const W = 1200, pad = 64;
  const weeks = data.weeks;
  const step = (W - 2 * pad) / weeks.length;
  const gridTop = 138;
  const H = Math.round(gridTop + 7 * step + 40);
  const rand = rng(hashSeed(`cal:${SEED}`));

  const title = setText(HEAD, `${data.total.toLocaleString('en-US')} contributions in the last year`, pad, 76, 38);

  // Legend: the four paint levels, right-aligned with the title.
  const lgSize = 17;
  const lessW = textWidth(TEXT, 'Less', lgSize), moreW = textWidth(TEXT, 'More', lgSize);
  const lgDabs = 4 * 26;
  const lgX = W - pad - moreW - 12 - lgDabs - 12 - lessW;
  let legend = `<path d="${setText(TEXT, 'Less', lgX, 74, lgSize).d}" fill="${C.mute}"/>`;
  legend += `<path d="${setText(TEXT, 'More', W - pad - moreW, 74, lgSize).d}" fill="${C.mute}"/>`;

  const dab = (cx, cy, level, seed) => {
    const len = 8 + level * 3.2;
    const width = 5 + level * 1.7;
    const ang = (-32 + (rand() - 0.5) * 24) * (Math.PI / 180);
    const dx = (Math.cos(ang) * len) / 2, dy = (Math.sin(ang) * len) / 2;
    const tone = C.levels[level - 1];
    return brushStroke({
      points: [[cx - dx, cy - dy], [cx + (rand() - 0.5), cy + (rand() - 0.5)], [cx + dx, cy + dy]],
      width,
      tones: [{ c: tone, w: 0.7 }, { c: C.levels[Math.min(3, level)], w: 0.2 }, { c: C.levels[Math.max(0, level - 2)], w: 0.1 }],
      body: tone,
      seed,
      bristles: 9,
      step: 1.2,
      attack: 0.2,
      dryStart: 0.62,
      wobble: 0.35,
    }).svg;
  };

  for (let l = 1; l <= 4; l++) legend += dab(lgX + lessW + 12 + (l - 0.5) * 26, 68, l, hashSeed(`lg:${l}`));

  // Month labels at the first week that starts in each month.
  let months = '';
  let last = '';
  weeks.forEach((w, i) => {
    const m = w[0][0].slice(0, 7);
    if (m !== last && i < weeks.length - 2) {
      if (last) {
        const label = new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
        months += `<path d="${setText(TEXT, label, pad + i * step, gridTop - 18, 16).d}" fill="${C.mute}"/>`;
      }
      last = m;
    }
  });

  let grid = '';
  let dabs = '';
  weeks.forEach((w, i) => {
    w.forEach(([date, count, level], j) => {
      const cx = pad + (i + 0.5) * step;
      const cy = gridTop + (j + 0.5) * step;
      if (!level) {
        grid += `M${cx.toFixed(1)} ${cy.toFixed(1)}h0`;
        return;
      }
      const delay = (0.3 + i * 0.034 + j * 0.006).toFixed(3);
      dabs += `<g class="dab" style="animation-delay:${delay}s"><title>${count} on ${date}</title>${dab(cx, cy, level, hashSeed(`day:${date}:${SEED}`))}</g>`;
    });
  });

  const active = weeks.flat().filter((d) => d[2]).length;
  return `${svgOpen(W, H, `${data.total} contributions in the last year`, `Contribution calendar painted as brush dabs: ${data.total} contributions over ${active} active days in the last year. Brighter, larger dabs mean more contributions that day.`)}
<style>
.dab{opacity:0;animation:show .22s ease-out forwards}
@keyframes show{to{opacity:1}}
${REDUCED}
</style>
<defs>
${canvasDefs(W, H, 1.5)}
</defs>
<g clip-path="url(#card)">
${canvasGround(W, H)}
<path d="${title.d}" fill="${C.bone}"/>
<g filter="url(#paint)">${legend}</g>
${months}
<path d="${grid}" stroke="${C.steel}" stroke-opacity=".45" stroke-width="2.2" stroke-linecap="round" fill="none"/>
<g filter="url(#paint)">${dabs}</g>
</g>
</svg>
`;
}

// ---------------------------------------------------------------------------- main

const data = await loadGitHub();
fs.mkdirSync(ASSETS, { recursive: true });
for (const [file, svg] of [
  ['header.svg', header()],
  ['open-source.svg', openSource(data)],
  ['year.svg', calendar(data)],
]) {
  fs.writeFileSync(path.join(ASSETS, file), svg);
  console.log(`${file.padEnd(16)} ${(svg.length / 1024).toFixed(1)} KB`);
}
console.log(`seed=${SEED}  data=${data.fetched}`);
