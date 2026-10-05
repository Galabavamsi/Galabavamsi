// Procedural brush strokes rendered to static SVG geometry.
// Everything random flows from a seed, so a given seed always paints the same canvas.

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(str) {
  let h = 0x811c9dc5;
  for (const ch of String(str)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Smooth 1D value noise in [-1, 1].
export function noise1(rand, n = 97) {
  const v = Array.from({ length: n }, () => rand() * 2 - 1);
  return (x) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = v[((i % n) + n) % n];
    const b = v[(((i + 1) % n) + n) % n];
    return a + (b - a) * f * f * (3 - 2 * f);
  };
}

// Catmull-Rom through `points`, resampled every `step` px of arc length, with unit normals.
export function samplePath(points, step = 6) {
  const P = [points[0], ...points, points[points.length - 1]];
  const dense = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let j = 0; j < 48; j++) {
      const t = j / 48, t2 = t * t, t3 = t2 * t;
      const c = (a, b, c2, d) =>
        0.5 * (2 * b + (-a + c2) * t + (2 * a - 5 * b + 4 * c2 - d) * t2 + (-a + 3 * b - 3 * c2 + d) * t3);
      dense.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  dense.push(points[points.length - 1]);

  const cum = [0];
  for (let i = 1; i < dense.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const length = cum[cum.length - 1];

  const pts = [];
  let k = 0;
  for (let s = 0; s <= length; s += step) {
    while (k < cum.length - 2 && cum[k + 1] < s) k++;
    const f = (s - cum[k]) / (cum[k + 1] - cum[k] || 1);
    pts.push({
      x: dense[k][0] + (dense[k + 1][0] - dense[k][0]) * f,
      y: dense[k][1] + (dense[k + 1][1] - dense[k][1]) * f,
      s,
    });
  }
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    pts[i].tx = dx / d;
    pts[i].ty = dy / d;
    pts[i].nx = -dy / d;
    pts[i].ny = dx / d;
  }
  return { pts, length };
}

const f1 = (n) => (Math.round(n * 10) / 10).toString();

// Absolute move, then relative lines: about half the bytes of absolute coordinates.
export function polyD(seg) {
  let d = `M${f1(seg[0][0])} ${f1(seg[0][1])}`;
  let [px, py] = [Math.round(seg[0][0] * 10), Math.round(seg[0][1] * 10)];
  for (let i = 1; i < seg.length; i++) {
    const x = Math.round(seg[i][0] * 10), y = Math.round(seg[i][1] * 10);
    d += `l${(x - px) / 10} ${(y - py) / 10}`;
    [px, py] = [x, y];
  }
  return d;
}

export function centerlineD(path, extend = 0) {
  const pts = path.pts.map((p) => [p.x, p.y]);
  if (extend) {
    const a = path.pts[0], b = path.pts[path.pts.length - 1];
    pts.unshift([a.x - a.tx * extend, a.y - a.ty * extend]);
    pts.push([b.x + b.tx * extend, b.y + b.ty * extend]);
  }
  return polyD(pts);
}

function pickTone(tones, r) {
  let acc = 0;
  for (const t of tones) {
    acc += t.w;
    if (r <= acc) return t;
  }
  return tones[tones.length - 1];
}

/**
 * One loaded brush dragged along `points`.
 * width     full brush width in px
 * tones     [{c: '#hex', w: weight}] bristle colours, weights sum to 1
 * dryStart  fraction of the stroke where the brush starts running out of paint
 * Returns { svg, path } where svg is the paint and path is the sampled centreline.
 */
export function brushStroke({
  points,
  width,
  tones,
  body,
  seed,
  bristles = 72,
  dryStart = 0.8,
  step = 6,
  attack = 0.035,
  wobble = 1.4,
  edgeRag = 0.12,
}) {
  const rand = rng(seed);
  const path = samplePath(points, step);
  const { pts, length } = path;
  const wNoise = noise1(rand);

  const widthAt = (u) => {
    let w = 1 + 0.045 * wNoise(u * 9);
    if (u < attack) w *= 0.7 + 0.3 * Math.sin(((u / attack) * Math.PI) / 2);
    if (u > dryStart) w *= 1 - (0.1 * (u - dryStart)) / (1 - dryStart);
    return width * w;
  };

  // Solid underpainting so the bristles never show canvas through the middle of the stroke.
  const bodyEnd = dryStart + 0.03;
  const left = [], right = [];
  for (const p of pts) {
    const u = p.s / length;
    if (u > bodyEnd) break;
    const fade = Math.min(1, Math.max(0, (bodyEnd - u) / 0.09)) ** 0.6;
    const hb = (0.86 * widthAt(u) * fade) / 2 + 0.8 * wNoise(u * 40);
    left.push([p.x + p.nx * hb, p.y + p.ny * hb]);
    right.push([p.x - p.nx * hb, p.y - p.ny * hb]);
  }
  const bodyD = polyD([...left, ...right.reverse()]) + 'z';

  // Bristles grouped by tone and thickness, one <path> per group to keep the DOM small.
  const groups = new Map();
  const bw = (width / bristles) * 2.1;
  for (let k = 0; k < bristles; k++) {
    const o = -1 + (2 * (k + 0.5)) / bristles + (rand() - 0.5) * (1.4 / bristles);
    const edge = Math.abs(o);
    // Translucent tones over bare canvas turn muddy, so outer bristles stay opaque.
    let tone = pickTone(tones, rand());
    if (edge > 0.8 && tone.o) tone = tones[0];
    const thick = rand() < 0.3 ? 1.45 : 1;
    const key = `${tone.c}|${thick}`;
    if (!groups.has(key)) groups.set(key, { tone, thick, d: [] });
    const g = groups.get(key);

    const lateral = noise1(rand);
    const drift = noise1(rand);
    const gaps = noise1(rand);
    // Outer bristles wander more, which is what gives a flat brush its wavy edge.
    const wob = wobble * (0.5 + rand()) * (edge > 0.8 ? 2.2 : 1);
    let uEnd = dryStart + (1 - dryStart) * rand() ** 0.7;
    if (edge > 0.85) uEnd -= rand() * 0.12;
    // Glazes only read as paint on top of paint; past the underpainting they go grey.
    if (tone.o) uEnd = Math.min(uEnd, dryStart);
    const uStart = edge > 0.75 ? rand() * attack * 1.6 : 0;
    const gapScale = 34 + rand() * 60;

    let seg = [];
    const flush = () => {
      if (seg.length > 1) g.d.push(polyD(seg));
      seg = [];
    };
    for (const p of pts) {
      const u = p.s / length;
      if (u < uStart || u > uEnd) {
        flush();
        continue;
      }
      const dry = u > dryStart ? (u - dryStart) / (1 - dryStart) : 0;
      const rag = edge > 0.9 ? edgeRag : 0;
      if (gaps(p.s / gapScale) < -1.05 + 1.3 * dry ** 1.4 + rag) {
        flush();
        continue;
      }
      const off = (o * widthAt(u)) / 2 + wob * lateral(u * 11) + 2.2 * wob * drift(u * 2.5);
      seg.push([p.x + p.nx * off, p.y + p.ny * off]);
    }
    flush();
  }

  let svg = `<path d="${bodyD}" fill="${body}"/>`;
  for (const { tone, thick, d } of groups.values()) {
    svg += `<path d="${d.join('')}" fill="none" stroke="${tone.c}" stroke-width="${f1(bw * thick)}" stroke-linecap="round" stroke-linejoin="round"${tone.o ? ` stroke-opacity="${tone.o}"` : ''}/>`;
  }
  return { svg, path };
}
