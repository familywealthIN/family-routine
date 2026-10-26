#!/usr/bin/env node
/**
 * The atomic canvases: every packages/ui component, rendered from its Storybook
 * stories, grouped Atoms → Molecules → Organisms.
 *
 *   node packages/design/tools/build-canvases.js            build Storybook, then shoot
 *   node packages/design/tools/build-canvases.js --no-build reuse apps/storybook/dist
 *   node packages/design/tools/build-canvases.js --only Molecules/AppToast,Organisms/GoalCascade
 *
 * Writes:
 *   canvases/shots/<storyId>.jpg            one screenshot per chosen story
 *   canvases/Atoms.html, Molecules.html     one canvas per level
 *   canvases/Organisms-<Page>.html          organisms, one canvas per app page
 *                                           (an organism on several pages shows on each)
 *   components/<Level>-<Name>/preview.html  a Claude Design card per component
 *   components/<Level>-<Name>/README.md     what it is, where it lives, who uses it
 *   canvases/manifest.json                  what was shot, sizes and any problems
 *
 * A component no screen imports any more is marked legacy, so nobody designs
 * with it. Stories that throw or render nothing are reported, not drawn.
 */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync, spawnSync } = require('child_process');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '../../..');
const DESIGN = path.join(REPO, 'packages/design');
const UI = path.join(REPO, 'packages/ui');
const DIST = path.join(REPO, 'apps/storybook/dist');
const SHOTS = path.join(DESIGN, 'canvases/shots');
const LEVELS = [
  { title: 'Atoms', dir: 'atoms', prefix: 'Atom', perComponent: 2, blurb: 'The primitives: Vuetify 1.5 controls restyled by the theme (radius 16 buttons and cards, Plus Jakarta Sans) and the app\'s own small parts.' },
  { title: 'Molecules', dir: 'molecules', prefix: 'Molecule', perComponent: 3, blurb: 'Small composed parts: rings, chips, cards, switches, sheets and the toast.' },
  { title: 'Organisms', dir: 'organisms', prefix: 'Organism', perComponent: 3, blurb: 'Whole sections of a screen: the focus card, the goal cascade, the chat, sheets, boards and the app shell.' },
];
// Stories that show many states at once make the best canvas tiles.
const PREFERRED = /^(all|variants|states|colors|sizes|overview|default|playground)/i;

/**
 * Organism canvases are per page. A page is a route view (apps/web-app/src/views,
 * named by router.js); App.vue and the layouts are the app shell every page
 * sits in. An organism reaches a page through containers, pages and other
 * organisms, so the walk follows imports upward until it lands on one of these.
 */
const PAGES = [
  { key: 'shell', title: 'App shell', slug: 'App-shell', blurb: 'The frame every page sits in: navigation, drawer, header and the global sheets.' },
  { key: 'home', title: 'Home', slug: 'Home', blurb: 'Routine Focus: the focus card, checklist, routine chat, week selector and the Start, Inbox and Skip sheets.' },
  { key: 'goals', title: 'Goals', slug: 'Goals', blurb: 'The goal cascade by routine, milestones and the goal item sheet.' },
  { key: 'year', title: 'Year Goals', slug: 'Year-Goals', blurb: 'A year goal, its month cascade and its chat.' },
  { key: 'priority', title: 'Priority', slug: 'Priority', blurb: 'Triage, the 2×2 map and the quadrant lists.' },
  { key: 'agents', title: 'Agents', slug: 'Agents', blurb: 'Agent list, detail, lifecycle and the create/edit sheet.' },
  { key: 'routines', title: 'Routines', slug: 'Routines', blurb: 'The day dial, timeline and routine editor.' },
  { key: 'progress', title: 'Progress', slug: 'Progress', blurb: 'Period switch, efficiency, D/K/G and timing reports.' },
  { key: 'groups', title: 'Groups', slug: 'Groups', blurb: 'Group pulse, members and their week, invites.' },
  { key: 'profile', title: 'Profile & About', slug: 'Profile-and-About', blurb: 'Time settings, rates, Connect AI, API key, delete account, and the About features.' },
  { key: 'search', title: 'Search', slug: 'Search', blurb: 'Search results across goals and notes.' },
  { key: 'other', title: 'Other screens', slug: 'Other-screens', blurb: 'Smaller routes: history, agenda tree, onboarding, notifications, guide and stats.' },
  { key: 'legacy', title: 'Legacy', slug: 'Legacy', blurb: 'Organisms no page imports any more. Kept for reference; do not design with them.' },
];
const VIEW_PAGE = {
  RoutineFocusHome: 'home',
  Goals: 'goals',
  Milestones: 'goals',
  YearGoals: 'year',
  Priority: 'priority',
  Agents: 'agents',
  Settings: 'routines',
  Progress: 'progress',
  Family: 'groups',
  Profile: 'profile',
  About: 'profile',
  Search: 'search',
};
const pageOf = (key) => PAGES.find((p) => p.key === key);

/** Every non-test source file the walk can pass through, with its text. */
function sourceFiles() {
  const files = [];
  const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/^(node_modules|__tests__|tests|dist)$/.test(entry.name)) walk(full);
    } else if (/\.(vue|js)$/.test(entry.name) && !/\.(test|spec|stories)\.js$/.test(entry.name)) {
      files.push({ file: full, base: entry.name.replace(/\.(vue|js)$/, ''), text: fs.readFileSync(full, 'utf8') });
    }
  });
  [path.join(REPO, 'apps/web-app/src'), UI].forEach(walk);
  return files;
}

const UI_PREFIX = { organisms: 'Organism', molecules: 'Molecule', atoms: 'Atom' };
const uiPrefixOf = (file) => {
  const m = /[\\/]packages[\\/]ui[\\/](organisms|molecules|atoms)[\\/]/.exec(file);
  return m ? UI_PREFIX[m[1]] : '';
};

/** The page keys an organism appears on, walking imports up to the route views. */
function pagesFor(name, files) {
  // A file imports B when it names B's file in an import path, or B's
  // @routine-notes/ui export (OrganismX), not when a comment mentions it.
  const importers = (target) => {
    const pathRef = new RegExp(`/${target.base}(\\.vue)?['"/]`);
    const exportRef = target.prefix ? new RegExp(`\\b${target.prefix}${target.base}\\b`) : null;
    // import { AgentResultModal } from '@routine-notes/ui/organisms'
    const namedRef = target.prefix
      ? new RegExp(`import\\s*\\{[^}]*\\b${target.base}\\b[^}]*\\}\\s*from\\s*['"]@routine-notes/ui(/(atoms|molecules|organisms))?['"]`)
      : null;
    return files.filter((f) => f.file !== target.file && (pathRef.test(f.text)
      || (exportRef && exportRef.test(f.text)) || (namedRef && namedRef.test(f.text))));
  };
  const start = files.find((f) => f.file === path.join(UI, 'organisms', name, `${name}.vue`));
  if (!start) return [];
  const pages = new Set();
  const seen = new Set([start.file]);
  const queue = [{ ...start, prefix: 'Organism' }];
  const SRC = path.join(REPO, 'apps/web-app/src');
  while (queue.length) {
    const current = queue.shift();
    importers(current).forEach((f) => {
      if (seen.has(f.file)) return;
      seen.add(f.file);
      const rel = path.relative(SRC, f.file);
      if (/^views[\\/]/.test(rel)) { pages.add(VIEW_PAGE[f.base] || 'other'); return; }
      if (rel === 'App.vue' || /^layouts[\\/]/.test(rel)) { pages.add('shell'); return; }
      if (rel === 'router.js' || rel === 'main.js') return;
      if (/[\\/](atoms|molecules|organisms)[\\/]index\.js$/.test(f.file) || f.file === path.join(UI, 'index.js')) return;
      queue.push({ ...f, prefix: uiPrefixOf(f.file) });
    });
  }
  // Imported by most pages (the shell itself, the drawer): it is the frame, not
  // part of any one page.
  if ([...pages].filter((k) => k !== 'shell' && k !== 'other').length >= 5) return ['shell'];
  return PAGES.map((p) => p.key).filter((k) => pages.has(k));
}

const args = process.argv.slice(2);
const noBuild = args.includes('--no-build');
const onlyArg = args.includes('--only') ? args[args.indexOf('--only') + 1].split(',') : null;

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildStorybook() {
  console.log('Building Storybook…');
  const result = spawnSync('npx', ['cross-env', 'NODE_OPTIONS=--openssl-legacy-provider', 'build-storybook', '-o', 'dist', '--quiet'], {
    cwd: path.join(REPO, 'apps/storybook'), stdio: 'inherit', shell: true,
  });
  if (result.status !== 0) throw new Error('build-storybook failed');
}

/** A tiny static server for the built Storybook. */
function serve(dir) {
  const types = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  };
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(dir, url === '/' ? 'index.html' : url);
    if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => { server.listen(0, '127.0.0.1', () => resolve(server)); });
}

/** Which screens still import a component: none means legacy. */
function usersOf(level, name) {
  const dir = `packages/ui/${level.dir}/${name}`;
  try {
    const out = execFileSync('git', ['grep', '-l', '-w', '-E', `(${level.prefix}${name}|${name})`, '--',
      'apps/web-app/src', 'packages/ui', `:!${dir}`, ':!*.stories.js', ':!*.test.js', ':!**/__tests__/**', ':!*.md',
      ':!packages/ui/atoms/index.js', ':!packages/ui/molecules/index.js', ':!packages/ui/organisms/index.js', ':!packages/ui/index.js'],
    { cwd: REPO, encoding: 'utf8' });
    return out.split('\n').filter(Boolean);
  } catch (e) { return []; }
}

/** The component's own opening comment, first paragraph, as its one-line summary. */
function summaryOf(level, name) {
  const file = path.join(UI, level.dir, name, `${name}.vue`);
  if (!fs.existsSync(file)) return '';
  const src = fs.readFileSync(file, 'utf8');
  const html = /<template>\s*<!--([\s\S]*?)-->/.exec(src);
  const doc = /<script>[\s\S]*?\/\*\*([\s\S]*?)\*\//.exec(src);
  const raw = (html && html[1]) || (doc && doc[1]) || '';
  const para = raw.replace(/^\s*\* ?/gm, '').trim().split(/\n\s*\n/)[0] || '';
  const flat = para.replace(/\s+/g, ' ').trim();
  return flat.length > 420 ? `${flat.slice(0, 417)}…` : flat;
}

async function listStories(page, base) {
  await page.goto(`${base}/iframe.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__STORYBOOK_STORY_STORE__ || window.__STORYBOOK_PREVIEW__, null, { timeout: 60000 });
  return page.evaluate(async () => {
    const ss = window.__STORYBOOK_STORY_STORE__;
    if (ss && ss.raw) return ss.raw().map((s) => ({ id: s.id, title: s.kind, name: s.name }));
    const store = window.__STORYBOOK_PREVIEW__.storyStore;
    if (store.cacheAllCSFFiles) await store.cacheAllCSFFiles();
    return store.raw().map((s) => ({ id: s.id, title: s.title, name: s.name }));
  });
}

function pick(stories, max) {
  const preferred = stories.filter((s) => PREFERRED.test(s.name));
  const rest = stories.filter((s) => !PREFERRED.test(s.name));
  return [...preferred, ...rest].slice(0, max);
}

async function drawnBox(page) {
  return page.evaluate(() => {
    let x1 = Infinity; let y1 = Infinity; let x2 = 0; let y2 = 0;
    document.querySelectorAll('body *').forEach((el) => {
      if (/^(SCRIPT|STYLE|LINK|META)$/.test(el.tagName)) return;
      if (el.closest('#docs-root, .sb-errordisplay, .sb-nopreview, .sb-preparing-story, .sb-preparing-docs')) return;
      if (el.matches('#root, .application, .application--wrap, .v-content, .v-content__wrap, .v-overlay')) return;
      const style = getComputedStyle(el);
      if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      if (r.width >= window.innerWidth - 1 && r.height >= window.innerHeight - 1) return;
      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      const graphic = /^(svg|img|canvas|input|textarea|select|button|i)$/i.test(el.tagName);
      const bg = style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
      const edge = style.boxShadow !== 'none' || parseFloat(style.borderTopWidth) > 0 || parseFloat(style.borderBottomWidth) > 0;
      if (!ownText && !graphic && !bg && !edge) return;
      x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
    });
    if (x1 === Infinity) return null;
    const pad = 12;
    const left = Math.max(0, Math.floor(x1 - pad));
    const top = Math.max(0, Math.floor(y1 - pad));
    return {
      x: left, y: top,
      width: Math.ceil(Math.min(document.documentElement.scrollWidth, x2 + pad) - left),
      height: Math.ceil(Math.min(Math.max(document.documentElement.scrollHeight, window.innerHeight), y2 + pad) - top),
    };
  });
}

async function shoot(page, base, story) {
  const problems = [];
  const onConsole = (msg) => {
    const text = msg.text();
    if (/Download the Vue Devtools|You are running Vue in development mode/.test(text)) return;
    if (msg.type() === 'error' || /\[Vue warn\]/.test(text)) problems.push(text.split('\n')[0].slice(0, 240));
  };
  const onError = (err) => problems.push(`pageerror: ${err.message.slice(0, 240)}`);
  page.on('console', onConsole);
  page.on('pageerror', onError);
  try {
    await page.goto(`${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`, { waitUntil: 'load' });
    await page.addStyleTag({ content: 'html,body,#root,.application,.application--wrap,.v-application,.v-content,.v-content__wrap,.sb-show-main{background:#f4f4f4 !important}' });
    await page.waitForFunction(() => {
      const root = document.querySelector('#root');
      return (root && root.children.length) || document.querySelector('.sb-show-errordisplay');
    }, null, { timeout: 20000 }).catch(() => {});
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.waitForTimeout(600);
    const shown = await page.evaluate(() => (document.body.classList.contains('sb-show-errordisplay')
      ? (document.querySelector('#error-message') || {}).textContent || 'error' : ''));
    if (shown) problems.push(`story error: ${shown.trim().slice(0, 240)}`);
    const box = shown ? null : await drawnBox(page);
    if (!box || box.width < 8 || box.height < 8) {
      if (!shown) problems.push('rendered nothing visible');
      return { ...story, ok: false, problems };
    }
    const clip = { ...box, height: Math.min(box.height, 1600) };
    const file = path.join(SHOTS, `${story.id}.jpg`);
    await page.screenshot({ path: file, clip, type: 'jpeg', quality: 82 });
    return {
      ...story, ok: true, file: `shots/${story.id}.jpg`, width: clip.width, height: clip.height, problems,
    };
  } finally {
    page.off('console', onConsole);
    page.off('pageerror', onError);
  }
}

const CANVAS_CSS = `
  :root { --canvas: #f0eee9; --ink: #1a1a1a; --muted: rgba(0,0,0,.54); --line: rgba(0,0,0,.08); --primary: #288bd5; --legacy: #9e9e9e; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--canvas); color: var(--ink); font: 14px/1.45 'Plus Jakarta Sans', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  header { padding: 36px 40px 20px; border-bottom: 1px solid var(--line); }
  header nav { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  header nav a { font: 600 12px/1 ui-monospace, Menlo, monospace; padding: 6px 10px; border-radius: 6px; background: #fff; color: var(--ink); text-decoration: none; }
  header nav a[aria-current] { background: var(--ink); color: #fff; }
  h1 { font: 700 28px/1.2 'Plus Jakarta Sans', system-ui, sans-serif; margin: 0 0 6px; }
  header p { margin: 0; color: var(--muted); max-width: 70ch; }
  .index { padding: 14px 40px; display: flex; flex-wrap: wrap; gap: 6px 14px; border-bottom: 1px solid var(--line); font-size: 12px; }
  .index a { color: var(--primary); text-decoration: none; }
  .index a.legacy { color: var(--legacy); }
  section { padding: 28px 40px 32px; border-bottom: 1px solid var(--line); scroll-margin-top: 12px; }
  .head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
  .id { font: 600 10px ui-monospace, Menlo, monospace; padding: 3px 7px; background: var(--ink); color: #fff; border-radius: 4px; }
  h2 { font: 700 17px/1.3 'Plus Jakarta Sans', system-ui, sans-serif; margin: 0; }
  .tag { font: 700 10px/1.6 'Plus Jakarta Sans', sans-serif; padding: 1px 8px; border-radius: 999px; background: rgba(0,0,0,.08); color: var(--muted); text-transform: uppercase; letter-spacing: .4px; }
  .src { font: 12px ui-monospace, Menlo, monospace; color: var(--muted); }
  .summary { margin: 4px 0 16px; color: var(--muted); max-width: 90ch; }
  .tiles { display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 8px; max-width: 100%; }
  figure img { display: block; max-width: 100%; height: auto; border-radius: 10px; background: #f4f4f4; box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04); }
  figcaption { font: 600 12px/1.2 system-ui, sans-serif; color: var(--muted); }
  .none { color: var(--muted); font-style: italic; }
  section.legacy { opacity: .62; }
`;

/**
 * One canvas. `canvas` is { title, file, blurb, idPrefix, pageKey? }; `nav`
 * lists every canvas so each one links to the rest.
 */
function canvasPage(canvas, components, nav) {
  const navHtml = nav.map((n) => `<a href="${n.file}"${n.file === canvas.file ? ' aria-current="page"' : ''}>${esc(n.title)}</a>`).join('');
  const live = components.filter((c) => !c.legacy).length;
  const index = components.map((c) => `<a href="#${c.name}"${c.legacy ? ' class="legacy"' : ''}>${c.name}</a>`).join('');
  const sections = components.map((c, i) => {
    const tiles = c.shots.filter((s) => s.ok).map((s) => `<figure><img src="${s.file}" width="${Math.round(s.width)}" height="${Math.round(s.height)}" alt="${esc(c.name)}: ${esc(s.name)}" loading="lazy"><figcaption>${esc(s.name)}</figcaption></figure>`).join('');
    const elsewhere = (c.pages || []).filter((k) => k !== canvas.pageKey).map((k) => pageOf(k).title);
    return `<section id="${c.name}"${c.legacy ? ' class="legacy"' : ''}>
  <div class="head"><span class="id">${canvas.idPrefix}${String(i + 1).padStart(2, '0')}</span><h2>${esc(c.name)}</h2>${c.legacy ? '<span class="tag">legacy · no screen uses it</span>' : ''}${c.story ? '' : '<span class="tag">no story yet</span>'}${elsewhere.length && canvas.pageKey ? `<span class="tag">also on ${esc(elsewhere.join(', '))}</span>` : ''}<span class="src">packages/ui/${c.dir}/${c.name}</span></div>
  ${c.summary ? `<p class="summary">${esc(c.summary)}</p>` : ''}
  <div class="tiles">${tiles || '<p class="none">No rendered story.</p>'}</div>
</section>`;
  }).join('\n');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(canvas.title)} · Routine Notes</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CANVAS_CSS}</style>
</head>
<body>
<header>
  <nav>${navHtml}<a href="../README.md">README</a></nav>
  <h1>${esc(canvas.title)}</h1>
  <p>${esc(canvas.blurb)} ${canvas.pageKey === 'legacy' ? `${components.length} legacy` : `${live} in use${components.length > live ? `, ${components.length - live} legacy` : ''}`}. Rendered from Storybook on the app background (#f4f4f4). Generated by tools/build-canvases.js; do not edit by hand.</p>
</header>
<div class="index">${index}</div>
${sections}
</body>
</html>
`;
}

/** The Design System pane group: the level, or for organisms their page (or Shared). */
function cardGroup(level, c) {
  if (level.dir !== 'organisms') return level.title;
  if (c.legacy || !c.pages.length) return 'Organisms · Legacy';
  if (c.pages.includes('shell')) return 'Organisms · App shell';
  return c.pages.length === 1 ? `Organisms · ${pageOf(c.pages[0]).title}` : 'Organisms · Shared';
}

function cardPreview(level, c) {
  const ok = c.shots.filter((s) => s.ok);
  const height = Math.min(900, Math.max(160, ...ok.map((s) => Math.round(s.height / 1.5) + 70)));
  const tiles = ok.map((s) => `<figure><img src="../../canvases/${s.file}" style="width:${Math.round(s.width / 1.5)}px" alt="${esc(s.name)}"><figcaption>${esc(s.name)}</figcaption></figure>`).join('');
  return `<!-- @dsCard group="${cardGroup(level, c)}" height=${height} -->
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(c.name)}</title>
<style>
  body { margin: 0; padding: 16px; background: #f4f4f4; font: 12px/1.3 'Plus Jakarta Sans', system-ui, sans-serif; color: rgba(0,0,0,.54); }
  .tiles { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-start; }
  figure { margin: 0; display: flex; flex-direction: column; gap: 6px; max-width: 100%; }
  img { display: block; max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 0 0 1px rgba(0,0,0,.06); }
  figcaption { font-weight: 600; }
</style>
</head>
<body>
<div class="tiles">${tiles}</div>
</body>
</html>
`;
}

function cardReadme(level, c) {
  const users = c.users.slice(0, 6).map((u) => `\`${u}\``).join(', ');
  return `# ${c.name}

${c.summary || `${level.prefix} ${c.name} from @routine-notes/ui.`}

- Level: ${level.title.replace(/s$/, '')}${c.pages && c.pages.length ? ` · on ${c.pages.map((k) => pageOf(k).title).join(', ')}` : ''} · source \`packages/ui/${level.dir}/${c.name}/${c.name}.vue\`
- ${c.legacy ? '**Legacy:** no screen imports it any more. Do not design with it.' : `Used by: ${users}${c.users.length > 6 ? ' and more' : ''}`}
- Stories shown: ${c.shots.filter((s) => s.ok).map((s) => s.name).join(', ') || 'none rendered'}

Rendered from Storybook by \`packages/design/tools/build-canvases.js\`; the screenshot is the shipped component. For the tokens it uses see \`tokens.json\`; for the rules of the core patterns see the hand-built components (\`components/Button\`, \`GoalRow\`, \`ChatThread\`, …).
`;
}

async function main() {
  // --pages prints which page canvas each organism lands on, and stops.
  if (args.includes('--pages')) {
    const files = sourceFiles();
    fs.readdirSync(path.join(UI, 'organisms')).filter((n) => fs.statSync(path.join(UI, 'organisms', n)).isDirectory()).sort()
      .forEach((n) => console.log(`${n.padEnd(24)} ${pagesFor(n, files).map((k) => pageOf(k).title).join(', ') || '(legacy)'}`));
    return;
  }
  if (!noBuild) buildStorybook();
  if (!fs.existsSync(path.join(DIST, 'iframe.html'))) throw new Error('No Storybook build at apps/storybook/dist; run without --no-build');
  fs.mkdirSync(SHOTS, { recursive: true });
  const server = await serve(DIST);
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 1.5 });
  const wide = await browser.newPage({ viewport: { width: 1133, height: 900 }, deviceScaleFactor: 1.5 });

  const files = sourceFiles();
  const stories = await listStories(page, base);
  const byTitle = {};
  stories.forEach((s) => { (byTitle[s.title] = byTitle[s.title] || []).push(s); });

  const manifest = { generatedAt: new Date().toISOString(), levels: {} };
  const previousManifest = fs.existsSync(path.join(DESIGN, 'canvases/manifest.json'))
    ? JSON.parse(fs.readFileSync(path.join(DESIGN, 'canvases/manifest.json'), 'utf8')) : null;

  for (const level of LEVELS) {
    const names = fs.readdirSync(path.join(UI, level.dir)).filter((n) => fs.statSync(path.join(UI, level.dir, n)).isDirectory()).sort()
      // CANVAS_SAMPLE=n shoots only the first n components per level: a quick check of the pipeline.
      .slice(0, Number(process.env.CANVAS_SAMPLE) || undefined);
    const components = [];
    for (const name of names) {
      const title = `${level.title}/${name}`;
      const users = usersOf(level, name);
      const own = byTitle[title] || [];
      const reuse = onlyArg && !onlyArg.includes(title) && previousManifest
        && (previousManifest.levels[level.title] || []).find((c) => c.name === name);
      let shots;
      if (reuse) {
        shots = reuse.shots;
      } else {
        shots = [];
        for (const story of pick(own, level.perComponent)) {
          // Tablet- and desktop-shell stories need the wide viewport.
          const target = /tablet|desktop|ipad/i.test(story.name) ? wide : page;
          // eslint-disable-next-line no-await-in-loop
          const result = await shoot(target, base, story);
          shots.push(result);
          console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${story.id}${result.problems.length ? `  (${result.problems[0]})` : ''}`);
        }
      }
      // An organism is legacy when no page reaches it, whatever else imports it.
      const pages = level.dir === 'organisms' ? pagesFor(name, files) : [];
      components.push({
        name,
        dir: level.dir,
        story: own.length > 0,
        legacy: level.dir === 'organisms' ? pages.length === 0 : users.length === 0,
        users,
        pages,
        summary: summaryOf(level, name),
        shots,
      });
    }
    manifest.levels[level.title] = components;
    components.forEach((c) => {
      const dir = path.join(DESIGN, 'components', `${level.prefix}-${c.name}`);
      if (!c.shots.some((s) => s.ok)) { fs.rmSync(dir, { recursive: true, force: true }); return; }
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'preview.html'), cardPreview(level, c));
      fs.writeFileSync(path.join(dir, 'README.md'), cardReadme(level, c));
    });
  }

  // The canvases: Atoms and Molecules whole, Organisms one per page.
  const [atoms, molecules] = LEVELS.slice(0, 2);
  const organisms = manifest.levels.Organisms;
  const pageCanvases = PAGES.map((p) => ({
    ...p,
    components: organisms.filter((c) => (p.key === 'legacy' ? c.legacy : c.pages.includes(p.key))),
  })).filter((p) => p.components.length);
  const nav = [
    { title: 'Atoms', file: 'Atoms.html' },
    { title: 'Molecules', file: 'Molecules.html' },
    ...pageCanvases.map((p) => ({ title: `Organisms · ${p.title}`, file: `Organisms-${p.slug}.html` })),
  ];
  fs.readdirSync(path.join(DESIGN, 'canvases')).filter((f) => /^Organisms.*\.html$/.test(f))
    .forEach((f) => fs.unlinkSync(path.join(DESIGN, 'canvases', f)));
  [atoms, molecules].forEach((level) => {
    fs.writeFileSync(path.join(DESIGN, `canvases/${level.title}.html`), canvasPage({
      title: level.title, file: `${level.title}.html`, blurb: level.blurb, idPrefix: level.title[0],
    }, manifest.levels[level.title], nav));
  });
  pageCanvases.forEach((p) => {
    fs.writeFileSync(path.join(DESIGN, `canvases/Organisms-${p.slug}.html`), canvasPage({
      title: `Organisms · ${p.title}`, file: `Organisms-${p.slug}.html`, blurb: p.blurb, idPrefix: 'O', pageKey: p.key,
    }, p.components, nav));
  });
  manifest.canvases = nav;

  // Shots no story produced any more are stale.
  const keep = new Set(Object.values(manifest.levels).flat().flatMap((c) => c.shots.filter((s) => s.ok).map((s) => path.basename(s.file))));
  fs.readdirSync(SHOTS).forEach((f) => { if (!keep.has(f)) fs.unlinkSync(path.join(SHOTS, f)); });

  fs.writeFileSync(path.join(DESIGN, 'canvases/manifest.json'), JSON.stringify(manifest, null, 1));
  await browser.close();
  server.close();

  const all = Object.values(manifest.levels).flat();
  const failed = all.flatMap((c) => c.shots.filter((s) => !s.ok).map((s) => `${s.id}: ${s.problems[0] || 'failed'}`));
  console.log(`\n${all.length} components, ${all.filter((c) => c.legacy).length} legacy, ${all.filter((c) => !c.story).length} without a story; ${keep.size} shots; ${failed.length} failed`);
  failed.forEach((f) => console.log(`  ${f}`));
}

main().catch((error) => { console.error(error); process.exit(1); });
