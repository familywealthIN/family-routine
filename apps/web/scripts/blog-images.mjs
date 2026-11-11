#!/usr/bin/env node
/**
 * Featured images for the blog: one 1200×630 PNG per post in public/blog/,
 * used as the post hero, og:image and twitter:image.
 *
 *   node apps/web/scripts/blog-images.mjs            # every post
 *   node apps/web/scripts/blog-images.mjs slug ...   # just these
 *
 * Each image is drawn from the post's own frontmatter, never stock art and
 * never AI-generated: the title, the persona, and a timeline of the persona's
 * routines coloured by K/D/G pillar (or, for "Chat with MCP" posts, the chain
 * of tool calls). It's an SVG template in the site's tokens, rasterised by
 * sharp (librsvg). Montserrat and Plus Jakarta Sans come from scripts/fonts
 * (OFL), loaded through a throwaway fontconfig file, so the text renders in
 * the site's fonts on any machine. Text is measured with the same fonts
 * (sharp's Pango text input) so titles wrap without overflowing.
 *
 * Uses `sharp` and `yaml` hoisted in the workspace root.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const self = fileURLToPath(import.meta.url);
const here = path.dirname(self);
const WEB = path.resolve(here, '..');
const POSTS = path.join(WEB, 'src/content/blog');
const OUT = path.join(WEB, 'public/blog');
const FONTS = path.join(here, 'fonts');

// fontconfig reads FONTCONFIG_FILE from the C runtime's environment, which on
// Windows never sees a change made through process.env. So the script writes a
// fonts.conf that knows only scripts/fonts and runs itself again as a child
// with that file in its starting environment.
if (!process.env.RN_BLOG_IMAGES_CHILD) {
  const fcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rn-blog-fc-'));
  const fcFile = path.join(fcDir, 'fonts.conf');
  fs.writeFileSync(
    fcFile,
    `<?xml version="1.0"?>\n<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n  <dir>${FONTS.replace(/\\/g, '/')}</dir>\n  <cachedir>${fcDir.replace(/\\/g, '/')}/cache</cachedir>\n</fontconfig>\n`,
  );
  const child = spawnSync(process.execPath, [self, ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, FONTCONFIG_FILE: fcFile, RN_BLOG_IMAGES_CHILD: '1' },
  });
  fs.rmSync(fcDir, { recursive: true, force: true });
  process.exit(child.status ?? 1);
}

const sharp = (await import('sharp')).default;
const YAML = (await import('yaml')).default;

const W = 1200;
const H = 630;
const PAD = 64;
const PANEL_TOP = 374;

const C = {
  ink900: '#0d1b2a',
  ink700: '#2a3a55',
  ink500: '#5b6e8e',
  ink400: '#8696b0',
  ink200: '#d6dce5',
  ink100: '#e9edf2',
  surface: '#ffffff',
  soft: '#f7f9fb',
  brand50: '#f0f7fc',
  brand100: '#dbecf7',
  brand500: '#288bd5',
  brand600: '#1f6fb0',
  brand700: '#1a5a8f',
};
// The pillar colours of the KDG framework section (KdgFramework.astro).
const PILLAR = {
  D: { name: 'Discipline', color: '#5aa3d3' },
  K: { name: 'Kinetics', color: '#288bd5' },
  G: { name: 'Geniuses', color: '#1a5a8f' },
};
const CATEGORY = {
  work: 'Work & career',
  body: 'Body & sport',
  mind: 'Mind & learning',
  home: 'Home & family',
  life: 'Life stages',
  playbook: 'Playbooks',
  mcp: 'Chat with MCP',
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Width in px of `text` in a Pango font ("Montserrat Bold 56"), measured with the real font. */
const measured = new Map();
async function measure(text, font) {
  const key = `${font}|${text}`;
  if (!measured.has(key)) {
    const { width } = await sharp({ text: { text: esc(text), font, dpi: 72, rgba: true } }).metadata();
    measured.set(key, width || 0);
  }
  return measured.get(key);
}

async function wrapMeasured(text, font, maxWidth) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (!line || (await measure(next, font)) <= maxWidth) line = next;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** The biggest title size (56 → 40) that fits in three lines. */
async function layoutTitle(title, maxWidth) {
  // two lines as large as possible, else three smaller ones
  for (const [size, max] of [[56, 2], [52, 2], [48, 2], [46, 3], [42, 3]]) {
    const lines = await wrapMeasured(title, `Montserrat Bold ${size}`, maxWidth);
    if (lines.length <= max) return { size, lines };
  }
  const lines = await wrapMeasured(title, 'Montserrat Bold 40', maxWidth);
  return { size: 40, lines: lines.slice(0, 3) };
}

async function fitText(text, font, maxWidth) {
  if ((await measure(text, font)) <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && (await measure(`${t}…`, font)) > maxWidth) t = t.slice(0, -1);
  return `${t.replace(/[\s,.;:·-]+$/, '')}…`;
}

const toMin = (hhmm) => {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
};

/** The persona's routines on a time axis, one coloured block per routine. */
async function timelinePanel(routines, focusName) {
  const x0 = PAD + 36;
  const x1 = W - PAD - 36;
  const axisY = PANEL_TOP + 166;
  const mins = routines.map((r) => toMin(r.time));
  let start = Math.floor(Math.min(...mins) / 60) * 60 - 60;
  let end = Math.ceil(Math.max(...mins) / 60) * 60 + 60;
  if (end - start < 6 * 60) end = start + 6 * 60;
  start = Math.max(0, start);
  end = Math.min(24 * 60, end);
  const x = (m) => x0 + ((m - start) / (end - start)) * (x1 - x0);

  const parts = [];
  // hour ticks
  const span = (end - start) / 60;
  const step = span > 16 ? 3 : span > 9 ? 2 : 1;
  for (let h = Math.ceil(start / 60); h * 60 <= end; h += step) {
    const xx = x(h * 60);
    parts.push(`<line x1="${xx}" y1="${axisY}" x2="${xx}" y2="${axisY + 7}" stroke="${C.ink200}" stroke-width="2"/>`);
    parts.push(
      `<text x="${xx}" y="${axisY + 28}" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="500" font-size="15" fill="${C.ink400}">${String(h).padStart(2, '0')}:00</text>`,
    );
  }
  parts.push(`<line x1="${x0}" y1="${axisY}" x2="${x1}" y2="${axisY}" stroke="${C.ink200}" stroke-width="2" stroke-linecap="round"/>`);

  // blocks
  const sorted = routines.map((r, i) => ({ ...r, m: mins[i] })).sort((a, b) => a.m - b.m);
  sorted.forEach((r, i) => {
    const next = sorted[i + 1] ? sorted[i + 1].m : r.m + 60;
    const left = x(r.m);
    const width = Math.max(12, Math.min(x(next) - left - 4, 150));
    const focus = r.name === focusName;
    const color = (PILLAR[r.pillar] || PILLAR.D).color;
    if (focus) {
      parts.push(`<rect x="${left - 4}" y="${axisY - 46}" width="${width + 8}" height="44" rx="10" fill="none" stroke="${C.ink900}" stroke-width="2.5"/>`);
    }
    parts.push(`<rect x="${left}" y="${axisY - 42}" width="${width}" height="36" rx="7" fill="${color}"/>`);
    if (width >= 30) {
      parts.push(
        `<text x="${left + width / 2}" y="${axisY - 18}" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="15" fill="#ffffff">${r.points}</text>`,
      );
    }
  });

  // labels above blocks: the focus routine first, then the heaviest, never overlapping
  const font = 'Plus Jakarta Sans SemiBold 16';
  const order = [...sorted].sort((a, b) => (b.name === focusName) - (a.name === focusName) || b.points - a.points);
  const placed = [];
  for (const r of order) {
    if (placed.length >= 4) break;
    const label = await fitText(`${r.time} ${r.name}`, font, 230);
    const wdt = await measure(label, font);
    let lx = Math.min(Math.max(x(r.m), x0), x1 - wdt);
    const clash = placed.some((p) => lx < p.right + 18 && lx + wdt > p.left - 18);
    if (clash) continue;
    placed.push({ left: lx, right: lx + wdt });
    const isFocus = r.name === focusName;
    parts.push(
      `<line x1="${x(r.m) + 1}" y1="${axisY - 50}" x2="${x(r.m) + 1}" y2="${axisY - 66}" stroke="${isFocus ? C.ink900 : C.ink400}" stroke-width="1.5"/>`,
    );
    parts.push(
      `<text x="${lx}" y="${axisY - 72}" font-family="Plus Jakarta Sans" font-weight="${isFocus ? 700 : 600}" font-size="16" fill="${isFocus ? C.ink900 : C.ink700}">${esc(label)}</text>`,
    );
  }

  const total = routines.reduce((s, r) => s + (Number(r.points) || 0), 0);
  return { svg: parts.join('\n'), caption: `A DAY OF ROUTINES · ${total} OF 100 POINTS` };
}

/** Client → connector → tools → app, as a row of chips that always fits. */
async function mcpPanel(mcp) {
  const tools = mcp.tools || [];
  const chain = (shown) => [
    { label: mcp.client || 'Claude', kind: 'client' },
    { label: 'mcp.routinenotes.app', kind: 'server' },
    ...tools.slice(0, shown).map((t) => ({ label: t, kind: 'tool' })),
    ...(shown < tools.length ? [{ label: `+${tools.length - shown} more`, kind: 'tool' }] : []),
    { label: 'Routine Notes', kind: 'app' },
  ];
  const y = PANEL_TOP + 70;
  const gap = 34;
  const room = W - 2 * PAD - 48;
  const fits = async (nodes, size) => {
    const widths = await Promise.all(nodes.map((n) => measure(n.label, `${n.kind === 'tool' ? 'Plus Jakarta Sans Medium' : 'Plus Jakarta Sans Bold'} ${size}`)));
    return { widths, ok: widths.reduce((s, w) => s + w + 28, 0) + gap * (nodes.length - 1) <= room };
  };
  // shrink the type to 14px, then fold the last tool calls into "+N more"
  let size = 17;
  let shown = tools.length;
  let nodes = chain(shown);
  let { widths, ok } = await fits(nodes, size);
  while (!ok && size > 14) ({ widths, ok } = await fits(nodes, --size));
  while (!ok && shown > 1) {
    nodes = chain(--shown);
    ({ widths, ok } = await fits(nodes, size));
  }
  const parts = [];
  let cx = PAD + 24;
  nodes.forEach((n, i) => {
    const w = widths[i] + 28;
    const fill = n.kind === 'tool' ? C.surface : n.kind === 'server' ? C.brand50 : n.kind === 'app' ? C.brand500 : C.ink900;
    const stroke = n.kind === 'tool' ? C.ink200 : n.kind === 'server' ? C.brand100 : 'none';
    const color = n.kind === 'tool' ? C.ink700 : n.kind === 'server' ? C.brand700 : '#ffffff';
    parts.push(`<rect x="${cx}" y="${y}" width="${w}" height="46" rx="23" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`);
    parts.push(
      `<text x="${cx + w / 2}" y="${y + 29}" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="${n.kind === 'tool' ? 500 : 700}" font-size="${size}" fill="${color}">${esc(n.label)}</text>`,
    );
    if (i < nodes.length - 1) {
      const ax = cx + w + 6;
      parts.push(`<path d="M${ax} ${y + 23} H${ax + gap - 14}" stroke="${C.ink400}" stroke-width="2.5" stroke-linecap="round"/>`);
      parts.push(`<path d="M${ax + gap - 18} ${y + 17} L${ax + gap - 11} ${y + 23} L${ax + gap - 18} ${y + 29}" fill="none" stroke="${C.ink400}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`);
    }
    cx += w + gap;
  });
  const prompt = await fitText(`“${mcp.prompt}”`, 'Plus Jakarta Sans Medium 21', W - 2 * PAD - 48);
  parts.push(
    `<text x="${PAD + 24}" y="${y + 96}" font-family="Plus Jakarta Sans" font-weight="500" font-size="21" fill="${C.ink700}">${esc(prompt)}</text>`,
  );
  return { svg: parts.join('\n'), caption: `ONE PROMPT, ${tools.length} TOOL CALL${tools.length === 1 ? '' : 'S'}, YOUR OWN DATA` };
}

async function render(slug, d) {
  const titleMax = W - 2 * PAD;
  const { size, lines } = await layoutTitle(d.title, titleMax);
  const lh = Math.round(size * 1.14);
  const titleTop = 160;
  const titleSvg = lines
    .map(
      (l, i) =>
        `<text x="${PAD}" y="${titleTop + i * lh}" font-family="Montserrat" font-weight="700" font-size="${size}" letter-spacing="-1" fill="${C.ink900}">${esc(l)}</text>`,
    )
    .join('\n');
  const personaY = titleTop + (lines.length - 1) * lh + 50;
  const persona = await fitText(`${d.persona} · an illustrative persona`, 'Plus Jakarta Sans Medium 24', titleMax);

  // header: brand on the left, category pill + pillar badge on the right
  const cat = (CATEGORY[d.category] || '').toUpperCase();
  const catW = (await measure(cat, 'Plus Jakarta Sans Bold 15')) + 36;
  const pillar = PILLAR[d.pillar] || PILLAR.D;
  const badgeR = 22;
  const badgeX = W - PAD - badgeR;
  const pillX = badgeX - badgeR - 14 - catW;

  const brandW = await measure('Routine Notes', 'Montserrat Bold 26');
  const panel = d.category === 'mcp' && d.mcp ? await mcpPanel(d.mcp) : await timelinePanel(d.routines || [], d.focus);
  const legend = Object.entries(PILLAR)
    .map(([k, p], i) => {
      const lx = W - PAD - 24 - (2 - i) * 132 - 110;
      return `<rect x="${lx}" y="${PANEL_TOP + 24}" width="16" height="16" rx="4" fill="${p.color}"/><text x="${lx + 24}" y="${PANEL_TOP + 38}" font-family="Plus Jakarta Sans" font-weight="600" font-size="15" fill="${C.ink500}">${k} · ${p.name}</text>`;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.brand500}" stop-opacity="0.20"/>
      <stop offset="1" stop-color="${C.brand500}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="${C.brand500}" fill-opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="${C.surface}"/>
  <rect x="${W * 0.45}" y="0" width="${W * 0.55}" height="${H * 0.62}" fill="url(#dots)"/>
  <circle cx="${W - 120}" cy="40" r="430" fill="url(#glow)"/>

  <text x="${PAD + 58}" y="84" font-family="Montserrat" font-weight="700" font-size="26" fill="${C.ink900}">Routine Notes</text>
  <text x="${PAD + 58 + brandW + 10}" y="84" font-family="Montserrat" font-weight="600" font-size="26" fill="${C.ink400}">· Blog</text>

  <rect x="${pillX}" y="52" width="${catW}" height="40" rx="20" fill="${C.brand50}" stroke="${C.brand100}" stroke-width="2"/>
  <text x="${pillX + catW / 2}" y="78" text-anchor="middle" font-family="Plus Jakarta Sans" font-weight="700" font-size="15" letter-spacing="1.5" fill="${C.brand700}">${esc(cat)}</text>
  <circle cx="${badgeX}" cy="72" r="${badgeR}" fill="${C.surface}" stroke="${pillar.color}" stroke-width="3"/>
  <text x="${badgeX}" y="81" text-anchor="middle" font-family="Montserrat" font-weight="700" font-size="24" fill="${pillar.color}">${esc(d.pillar)}</text>

  ${titleSvg}
  <text x="${PAD}" y="${personaY}" font-family="Plus Jakarta Sans" font-weight="500" font-size="24" fill="${C.ink500}">${esc(persona)}</text>

  <rect x="${PAD}" y="${PANEL_TOP}" width="${W - 2 * PAD}" height="${H - PANEL_TOP - 36}" rx="22" fill="${C.soft}" stroke="${C.ink100}" stroke-width="2"/>
  <text x="${PAD + 24}" y="${PANEL_TOP + 38}" font-family="Plus Jakarta Sans" font-weight="700" font-size="14" letter-spacing="2" fill="${C.ink500}">${esc(panel.caption)}</text>
  ${d.category === 'mcp' ? '' : legend}
  ${panel.svg}
</svg>`;

  // the logo mark, composited (librsvg won't load external images)
  const logo = await sharp(path.join(WEB, 'public/logo.png')).resize(44, 44, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const file = path.join(OUT, `${slug}.png`);
  await sharp(Buffer.from(svg))
    .composite([{ input: logo, left: PAD, top: 50 }])
    .png({ palette: true, quality: 92, effort: 10, compressionLevel: 9 })
    .toFile(file);
  return { file, bytes: fs.statSync(file).size, titleSize: size, lines: lines.length };
}

const wanted = new Set(process.argv.slice(2));
fs.mkdirSync(OUT, { recursive: true });
const files = fs.readdirSync(POSTS).filter((f) => f.endsWith('.md')).sort();
let done = 0;
let failed = 0;
for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  if (wanted.size && !wanted.has(slug)) continue;
  const src = fs.readFileSync(path.join(POSTS, f), 'utf8').replace(/\r\n/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---/);
  const d = m ? YAML.parse(m[1]) : null;
  const ready = d && (d.category === 'mcp' ? d.mcp : Array.isArray(d.routines) && d.routines.length);
  if (!ready) {
    console.warn(`skip ${slug}: no routines/mcp data in frontmatter yet`);
    failed++;
    continue;
  }
  const r = await render(slug, d);
  done++;
  console.log(`${slug}.png  ${Math.round(r.bytes / 1024)} KB  title ${r.titleSize}px × ${r.lines} lines`);
}
console.log(`\nblog-images: ${done} written, ${failed} skipped`);
