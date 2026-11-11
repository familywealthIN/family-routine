#!/usr/bin/env node
/**
 * Blog audit: the anti-slop and SEO checks every post must pass.
 *
 *   node apps/web/scripts/blog-audit.mjs            # all posts
 *   node apps/web/scripts/blog-audit.mjs slug ...   # report only these (pairs still use all)
 *
 * Exits 1 when any check fails. Warnings never fail the run.
 *
 * Fails on:
 *   - banned filler phrases;
 *   - duplicate titles or meta descriptions;
 *   - a missing featured image (public/blog/<slug>.png), missing diagram data
 *     (routines + focus + cascade, or mcp for "Chat with MCP" posts) or image alt text;
 *   - a link to /blog/<slug> that has no post, or whose post goes live after
 *     this one (posts are drip-published by publishDate; the link would 404);
 *   - any pair of posts sharing more than 12% of their 5-word shingles
 *     (shared shingles / the smaller post's shingles, prose only);
 *   - structure: first two sentences that don't answer the title, no worked
 *     example with real numbers, no "what goes wrong / recover" section, no
 *     in-app path (A → B), Introduction/Conclusion headings, emoji, more than
 *     two em dashes, missing key takeaways.
 *
 * Reads frontmatter with the `yaml` package hoisted in the workspace root.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let YAML;
try {
  YAML = (await import('yaml')).default;
} catch {
  console.error('blog-audit: the `yaml` package is missing; run `yarn install` at the repo root.');
  process.exit(2);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.resolve(here, '..');
const DIR = path.join(WEB, 'src/content/blog');
const PUBLIC = path.join(WEB, 'public');
const only = new Set(process.argv.slice(2));

const MAX_SHINGLE_OVERLAP = 0.12;
const MAX_EM_DASHES = 2;
const IMAGE_BUDGET = 80 * 1024;

const TOOLS = new Set([
  'graphql_query', 'get_current_date', 'get_daily_goals', 'get_routine', 'search_goals', 'add_goal_item',
  'complete_goal_item', 'bulk_add_goal_items', 'generate_milestone_plan', 'extract_day_task', 'get_progress',
  'get_priority_goals', 'reschedule_goal_item',
]);

const BANNED = [
  "in today's fast-paced world", 'unlock', 'game-changer', 'game changer', 'delve', 'journey', 'embark',
  'elevate', 'supercharge', 'seamless', 'harness the power', "it's important to note", 'it is important to note',
  'in conclusion', 'at the end of the day', 'transformative', 'revolutionize', 'revolutionise',
  'navigate the complexities', 'a testament to',
];
const bannedRe = BANNED.map((p) => [p, new RegExp(`\\b${p.replace(/[-']/g, (c) => (c === "'" ? "['’]" : '[- ]'))}`, 'i')]);

const STOP = new Set(
  'a an the and or but of for to in on at by with from into your you how why what when who it its is are be as that this than then them they their our we not no without one two three four five six seven eight nine ten first last more less after before about over every each'.split(' '),
);
const stem = (w) => w.toLowerCase().replace(/[’']s$/, '').replace(/(ing|ed|es|s)$/, '');
const words = (s) => (s.toLowerCase().match(/[a-z0-9][a-z0-9'’-]*/g) || []).filter(Boolean);

function parse(file) {
  const src = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { error: 'no frontmatter' };
  try {
    return { data: YAML.parse(m[1]) || {}, body: m[2] };
  } catch (e) {
    return { error: `frontmatter: ${e.message.split('\n')[0]}` };
  }
}

/** Prose only: no tables, code, images, HTML or headings markup. */
function prose(body) {
  return body
    .replace(/```[\s\S]*?```/g, ' ')
    .split('\n')
    .filter((l) => !/^\s*\|/.test(l) && !/^\s*!\[/.test(l))
    .join('\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`]/g, ' ');
}

function shingles(text) {
  const w = words(text);
  const set = new Set();
  for (let i = 0; i + 5 <= w.length; i++) set.add(w.slice(i, i + 5).join(' '));
  return set;
}

function firstSentences(body, n = 2) {
  const para = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p && !p.startsWith('#') && !p.startsWith('|') && !p.startsWith('!') && !p.startsWith('>') && !p.startsWith('```'));
  if (!para) return '';
  const sentences = para.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
  return sentences.slice(0, n).join(' ');
}

const posts = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith('.md'))
  .sort()
  .map((f) => {
    const slug = f.replace(/\.md$/, '');
    return { slug, file: path.join(DIR, f), ...parse(path.join(DIR, f)) };
  });

const fails = new Map();
const warns = new Map();
const fail = (slug, msg) => (fails.get(slug) || fails.set(slug, []).get(slug)).push(msg);
const warn = (slug, msg) => (warns.get(slug) || warns.set(slug, []).get(slug)).push(msg);

for (const p of posts) {
  if (p.error) {
    fail(p.slug, p.error);
    continue;
  }
  const d = p.data;
  const body = p.body;
  const text = prose(body);
  const isMcp = d.category === 'mcp';

  for (const k of ['title', 'description', 'category', 'persona', 'pillar', 'publishDate', 'tags']) {
    if (d[k] === undefined || d[k] === '') fail(p.slug, `frontmatter: missing ${k}`);
  }

  // key takeaways
  if (!Array.isArray(d.takeaways) || d.takeaways.length < 3 || d.takeaways.length > 4) {
    fail(p.slug, 'takeaways: need 3–4');
  } else if (d.takeaways.some((t) => typeof t !== 'string' || t.length < 20 || t.length > 170)) {
    fail(p.slug, 'takeaways: each 20–170 chars');
  }

  // featured image
  const img = path.join(PUBLIC, 'blog', `${p.slug}.png`);
  if (!fs.existsSync(img)) fail(p.slug, `featured image missing: public/blog/${p.slug}.png`);
  else if (fs.statSync(img).size > IMAGE_BUDGET) warn(p.slug, `featured image ${Math.round(fs.statSync(img).size / 1024)} KB > 80 KB`);

  // diagram data
  if (isMcp) {
    const m = d.mcp || {};
    if (!m.prompt || typeof m.prompt !== 'string') fail(p.slug, 'diagram: mcp.prompt missing');
    else if (m.prompt.length > 120) fail(p.slug, 'diagram: mcp.prompt over 120 chars');
    if (!Array.isArray(m.tools) || !m.tools.length || m.tools.length > 6) fail(p.slug, 'diagram: mcp.tools needs 1–6');
    else m.tools.filter((t) => !TOOLS.has(t)).forEach((t) => fail(p.slug, `diagram: unknown tool ${t}`));
  } else {
    const r = d.routines;
    if (!Array.isArray(r) || r.length < 3 || r.length > 14) fail(p.slug, 'diagram: routines needs 3–14');
    else {
      let total = 0;
      r.forEach((x, i) => {
        if (!/^\d{2}:\d0$/.test(String(x.time || ''))) fail(p.slug, `routines[${i}]: time "${x.time}" not HH:M0`);
        if (!x.name) fail(p.slug, `routines[${i}]: name missing`);
        if (!Number.isInteger(x.points) || x.points < 1 || x.points > 50) fail(p.slug, `routines[${i}]: points 1–50`);
        if (!['D', 'K', 'G'].includes(x.pillar)) fail(p.slug, `routines[${i}]: pillar D|K|G`);
        if (!x.cue) fail(p.slug, `routines[${i}]: cue missing`);
        if (String(x.name || '').length > 24) fail(p.slug, `routines[${i}]: name over 24 chars`);
        if (String(x.cue || '').length > 40) fail(p.slug, `routines[${i}]: cue over 40 chars`);
        total += Number(x.points) || 0;
      });
      if (total > 100) fail(p.slug, `routines: ${total} points > 100`);
      const sorted = [...r].map((x) => String(x.time)).join() === [...r].map((x) => String(x.time)).sort().join();
      if (!sorted) fail(p.slug, 'routines: not in time order');
      if (!r.some((x) => x.name === d.focus)) fail(p.slug, `diagram: focus "${d.focus}" is not a routine name`);
    }
    const c = d.cascade || {};
    if (!c.year || !c.month || !c.week) fail(p.slug, 'diagram: cascade.year/month/week missing');
    if (!Array.isArray(c.days) || c.days.length < 2 || c.days.length > 4) fail(p.slug, 'diagram: cascade.days needs 2–4');
    for (const k of ['year', 'month', 'week']) if (String(c[k] || '').length > 56) fail(p.slug, `diagram: cascade.${k} over 56 chars`);
    (c.days || []).forEach((x, i) => String(x).length > 36 && fail(p.slug, `diagram: cascade.days[${i}] over 36 chars`));
  }
  if (d.howTo) {
    if (!d.howTo.name || !Array.isArray(d.howTo.steps) || d.howTo.steps.length < 3) fail(p.slug, 'howTo: name and 3+ steps');
    else if (d.howTo.steps.some((s) => !s.name || !s.text)) fail(p.slug, 'howTo: every step needs name and text');
  }

  // inline images: alt text and a real file
  for (const m of body.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)) {
    if (m[1].trim().length < 15) fail(p.slug, `image alt too short: ${m[2]}`);
    if (m[2].startsWith('/') && !fs.existsSync(path.join(PUBLIC, m[2]))) fail(p.slug, `image not found: ${m[2]}`);
  }

  // banned phrases
  const all = `${d.title}\n${d.description}\n${(d.takeaways || []).join('\n')}\n${body}`;
  for (const [phrase, re] of bannedRe) if (re.test(all)) fail(p.slug, `banned phrase: "${phrase}"`);

  // structure
  const h2s = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  if (/^#\s/m.test(body)) fail(p.slug, 'has an H1');
  if (h2s.some((h) => /^(introduction|conclusion|summary|final thoughts)\b/i.test(h))) fail(p.slug, 'Introduction/Conclusion heading');
  if (/\p{Extended_Pictographic}/u.test(all)) fail(p.slug, 'emoji');
  const dashes = (body.match(/—/g) || []).length;
  if (dashes > MAX_EM_DASHES) fail(p.slug, `${dashes} em dashes (max ${MAX_EM_DASHES})`);
  if (!h2s.some((h) => /wrong|slip|miss|recover|stuck|break|fail|late|derail|fall|off track|plateau|stall|when .* (doesn|isn|won)/i.test(h))) {
    fail(p.slug, 'no "what goes wrong / how to recover" H2');
  }
  if (!h2s.some((h) => /\?$/.test(h))) warn(p.slug, 'no question-phrased H2');
  const times = (text.match(/\b\d{1,2}:\d{2}\b/g) || []).length;
  const numbers = (text.match(/\b\d+\b/g) || []).length;
  if (times + numbers < 6) fail(p.slug, 'no worked example with real numbers');
  if (!/[A-Z][A-Za-z’' ]{1,24}\s→\s[A-Z+]/.test(body)) fail(p.slug, 'no in-app path (e.g. "More → Routines")');
  const wc = words(text).length;
  if (wc < 450 || wc > 950) fail(p.slug, `prose length ${wc} words`);

  // the opening answers the title
  const opening = new Set(words(firstSentences(body)).map(stem));
  const keys = [...new Set(words(String(d.title)).filter((w) => w.length > 3 && !STOP.has(w)).map(stem))];
  const hit = keys.filter((k) => opening.has(k)).length;
  if (keys.length && hit < Math.min(2, keys.length)) fail(p.slug, `opening misses the title (${hit}/${keys.length} title words in the first two sentences)`);

  p.shingles = shingles(text);
}

// duplicates
for (const key of ['title', 'description']) {
  const seen = new Map();
  for (const p of posts) {
    const v = String(p.data?.[key] || '').trim().toLowerCase();
    if (!v) continue;
    if (seen.has(v)) {
      fail(p.slug, `duplicate ${key} with ${seen.get(v)}`);
      fail(seen.get(v), `duplicate ${key} with ${p.slug}`);
    } else seen.set(v, p.slug);
  }
}

// links between posts: the target exists and is live no later than the source
const dayOf = (p) => new Date(p.data?.publishDate || 0).toISOString().slice(0, 10);
const bySlug = new Map(posts.map((p) => [p.slug, p]));
for (const p of posts) {
  if (!p.body) continue;
  for (const [, target] of p.body.matchAll(/\]\(\/blog\/([a-z0-9-]+)\/?[)#]/g)) {
    const t = bySlug.get(target);
    if (!t) fail(p.slug, `links to /blog/${target}, which has no post`);
    else if (dayOf(t) > dayOf(p)) fail(p.slug, `links to /blog/${target}, which goes live ${dayOf(t)}, after this post (${dayOf(p)})`);
  }
}

// near-duplicates by 5-word shingles
const pairs = [];
for (let i = 0; i < posts.length; i++) {
  for (let j = i + 1; j < posts.length; j++) {
    const a = posts[i].shingles;
    const b = posts[j].shingles;
    if (!a || !b || !a.size || !b.size) continue;
    let shared = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const s of small) if (big.has(s)) shared++;
    const ratio = shared / small.size;
    pairs.push([ratio, posts[i].slug, posts[j].slug, shared]);
    if (ratio > MAX_SHINGLE_OVERLAP) {
      const msg = (o) => `shares ${(ratio * 100).toFixed(1)}% of 5-word shingles with ${o}`;
      fail(posts[i].slug, msg(posts[j].slug));
      fail(posts[j].slug, msg(posts[i].slug));
    }
  }
}
pairs.sort((x, y) => y[0] - x[0]);

const report = (map, label) => {
  for (const [slug, list] of [...map].sort()) {
    if (only.size && !only.has(slug)) continue;
    console.log(`${label} ${slug}`);
    for (const m of list) console.log(`    - ${m}`);
  }
};
report(fails, 'FAIL');
report(warns, 'warn');

const top = pairs[0];
console.log(
  `\nblog-audit: ${posts.length} posts, ${fails.size} failing, ${warns.size} with warnings. ` +
    (top ? `Highest shingle overlap ${(top[0] * 100).toFixed(1)}% (${top[1]} ~ ${top[2]}).` : ''),
);
process.exit(fails.size ? 1 : 0);
