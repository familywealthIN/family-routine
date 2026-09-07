// Builds the approval sheet from review-cards.json. Images are inlined because
// the artifact CSP blocks every external host.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const groups = JSON.parse(fs.readFileSync(path.join(root, 'build', 'review-cards.json'), 'utf8'));

const DECISIONS = [
  {
    k: 'Avatar',
    t: 'The face is still a placeholder',
    d: 'Every slide carries a generated silhouette; on iPad and Mac it sits in the sidebar next to your name. I cannot put a stranger&rsquo;s likeness into published marketing &mdash; drop a photo you own into the repo (or point me at a path) and I&rsquo;ll wire it in as <code>avatar-demo.png</code> and re-render all 24.',
  },
  {
    k: 'Clipping',
    t: 'Year goal ladder overflows on the phone',
    d: 'The month rows read &ldquo;0 / 3 weeks &middot; I&hellip;&rdquo; because <code>.period-progress-label</code> sets <code>white-space: nowrap</code> inside a cell capped at 200&thinsp;px. It is a real responsive bug, not a capture artefact, and it disappears on iPad and Mac where there is room. Say the word and I&rsquo;ll let the label wrap.',
  },
  {
    k: 'Copy',
    t: 'Captions are new, not your existing lines',
    d: 'Your live listing uses &ldquo;An Evolution Framework App for Routine and Goals&rdquo; and friends. I wrote fresh ones per slide, flattened to a single line on the landscape Mac canvas. Keep mine or swap back to yours &mdash; either way I&rsquo;ll fix the &ldquo;Refine <em>you</em> Year Goals&rdquo; typo.',
  },
  {
    k: 'Mac',
    t: 'The Mac set has nowhere to go yet',
    d: 'Catalyst was dropped, so the App Store record is &ldquo;Designed for iPad&rdquo; and serves the iPad screenshots on Macs &mdash; there is no macOS screenshot slot to upload these to. They are ready for a marketing site or a future Mac target; tell me if you want the Mac build reinstated instead.',
  },
];

const cardHtml = (c) => `
      <figure class="slide${c.flag ? ' slide--flag' : ''}">
        <div class="shot"><img src="data:image/jpeg;base64,${c.b64}" alt="${c.title}" loading="lazy"></div>
        <figcaption>
          <div class="slide-head">
            <h3>${c.title}</h3>
            ${c.flag ? `<span class="chip chip--flag">${c.flag}</span>` : '<span class="chip chip--ok">Clean</span>'}
          </div>
          <p class="caption-line">&ldquo;${c.caption}&rdquo;</p>
        </figcaption>
      </figure>`;

const groupHtml = groups.map((g) => `
  <section class="platform" id="${g.name}">
    <div class="platform-head">
      <h2>${g.label}</h2>
      <div class="platform-meta">
        <span class="spec"><b>${g.canvas}</b></span>
        <span class="spec">frame <b>${g.device}</b></span>
        <span class="spec">captured at <b>${g.capture.split(',')[0]}</b></span>
        <span class="spec"><b>${g.cards.length}</b> slides</span>
      </div>
    </div>
    <div class="grid grid--${g.name === 'mac' ? 'wide' : 'tall'}">${g.cards.map(cardHtml).join('')}
    </div>
  </section>`).join('');

const decisionHtml = DECISIONS.map((d) => `    <div class="decision">
      <span class="k">${d.k}</span>
      <div>
        <h4>${d.t}</h4>
        <p>${d.d}</p>
      </div>
    </div>`).join('\n');

const navHtml = groups.map((g) => `<a href="#${g.name}">${g.name === 'iphone' ? 'iPhone' : g.name === 'ipad' ? 'iPad' : g.name === 'mac' ? 'Mac' : 'Android'}</a>`).join('');

const html = `<title>Routine Notes Store Slides</title>
<style>
  :root {
    --ground: #eef5fb;
    --surface: #ffffff;
    --surface-2: #f6fafd;
    --line: #d3e2ee;
    --ink: #12283d;
    --muted: #56718c;
    --accent: #11367a;
    --accent-soft: #bdddf2;
    --flag: #a4530b;
    --flag-bg: #fdf0dd;
    --ok: #1c6b4a;
    --ok-bg: #e0f2e9;
    --shadow: 0 1px 2px rgba(18, 40, 61, .06), 0 12px 28px -18px rgba(18, 40, 61, .5);
    --display: "Segoe UI Variable Display", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", sans-serif;
    --body: "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", sans-serif;
    --mono: ui-monospace, "Cascadia Mono", "SF Mono", Menlo, Consolas, monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #081321; --surface: #0f2033; --surface-2: #142943; --line: #23405f;
      --ink: #e6f0f9; --muted: #93aec7; --accent: #7db0f2; --accent-soft: #1d3d63;
      --flag: #f0b366; --flag-bg: #3a2a12; --ok: #79d3a8; --ok-bg: #10331f;
      --shadow: 0 1px 2px rgba(0, 0, 0, .5), 0 14px 32px -20px rgba(0, 0, 0, .9);
    }
  }
  :root[data-theme="dark"] {
    --ground: #081321; --surface: #0f2033; --surface-2: #142943; --line: #23405f;
    --ink: #e6f0f9; --muted: #93aec7; --accent: #7db0f2; --accent-soft: #1d3d63;
    --flag: #f0b366; --flag-bg: #3a2a12; --ok: #79d3a8; --ok-bg: #10331f;
    --shadow: 0 1px 2px rgba(0, 0, 0, .5), 0 14px 32px -20px rgba(0, 0, 0, .9);
  }

  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--ground); color: var(--ink);
    font-family: var(--body); font-size: 16px; line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }
  .wrap { max-width: 1240px; margin: 0 auto; padding: 48px 24px 96px; }

  header { display: flex; flex-direction: column; gap: 18px; margin-bottom: 20px; }
  .eyebrow {
    font-family: var(--mono); font-size: 12px; letter-spacing: .14em;
    text-transform: uppercase; color: var(--muted);
  }
  h1 {
    font-family: var(--display); font-weight: 800;
    font-size: clamp(30px, 5vw, 46px); letter-spacing: -.025em;
    line-height: 1.08; margin: 0; text-wrap: balance;
  }
  .lede { margin: 0; max-width: 64ch; color: var(--muted); font-size: 17px; }

  nav { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }
  nav a {
    font-family: var(--mono); font-size: 12.5px; text-decoration: none;
    padding: 7px 14px; border: 1px solid var(--line); border-radius: 999px;
    background: var(--surface); color: var(--ink);
  }
  nav a:hover, nav a:focus-visible { border-color: var(--accent); color: var(--accent); }
  nav a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  .platform { margin-top: 52px; scroll-margin-top: 20px; }
  .platform-head {
    display: flex; flex-wrap: wrap; align-items: baseline; gap: 10px 18px;
    padding-bottom: 14px; margin-bottom: 22px; border-bottom: 1px solid var(--line);
  }
  h2 {
    font-family: var(--display); font-size: 24px; font-weight: 700;
    letter-spacing: -.015em; margin: 0;
  }
  .platform-meta { display: flex; flex-wrap: wrap; gap: 8px; }
  .spec {
    font-family: var(--mono); font-size: 12px; padding: 4px 10px;
    border: 1px solid var(--line); border-radius: 999px;
    background: var(--surface); color: var(--muted); white-space: nowrap;
  }
  .spec b { color: var(--ink); font-weight: 600; }

  .grid { display: grid; gap: 22px; }
  .grid--tall { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
  .grid--wide { grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); }

  .slide {
    margin: 0; display: flex; flex-direction: column;
    background: var(--surface); border: 1px solid var(--line);
    border-radius: 13px; overflow: hidden; box-shadow: var(--shadow);
  }
  .slide--flag { border-color: color-mix(in srgb, var(--flag) 45%, var(--line)); }
  .shot { background: var(--accent-soft); line-height: 0; }
  .shot img { width: 100%; height: auto; display: block; }
  figcaption { padding: 13px 15px 16px; display: flex; flex-direction: column; gap: 6px; }
  .slide-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  h3 { font-family: var(--display); font-size: 15.5px; font-weight: 700; letter-spacing: -.01em; margin: 0; }
  .chip {
    font-family: var(--mono); font-size: 10px; letter-spacing: .07em;
    text-transform: uppercase; padding: 3px 7px; border-radius: 5px; white-space: nowrap;
  }
  .chip--ok { background: var(--ok-bg); color: var(--ok); }
  .chip--flag { background: var(--flag-bg); color: var(--flag); }
  .caption-line { margin: 0; font-size: 13.5px; color: var(--muted); font-style: italic; }

  .decisions-head { margin: 64px 0 6px; font-family: var(--display); font-size: 24px; font-weight: 700; letter-spacing: -.015em; }
  .h2-sub { margin: 0 0 22px; color: var(--muted); font-size: 15px; }
  .decisions { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  .decision {
    display: grid; grid-template-columns: 110px 1fr; gap: 20px;
    padding: 20px 22px; background: var(--surface); align-items: start;
  }
  .decision + .decision { border-top: 1px solid var(--line); }
  .decision .k {
    font-family: var(--mono); font-size: 11px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--accent); padding-top: 3px;
  }
  .decision h4 { font-family: var(--display); font-size: 16px; font-weight: 700; margin: 0 0 4px; letter-spacing: -.01em; }
  .decision p { margin: 0; color: var(--muted); font-size: 14.5px; }
  code {
    font-family: var(--mono); font-size: .88em; background: var(--surface-2);
    border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px;
  }

  footer {
    margin-top: 52px; padding-top: 20px; border-top: 1px solid var(--line);
    color: var(--muted); font-size: 14px;
  }
  @media (max-width: 560px) { .decision { grid-template-columns: 1fr; gap: 8px; } }
</style>

<div class="wrap">
  <header>
    <span class="eyebrow">Approval sheet &middot; 24 slides &middot; 4 platforms</span>
    <h1>Routine Notes store slides</h1>
    <p class="lede">Generated from live app captures with the demo week pinned to Thursday 10 September 2026, 09:41. Every slide was verified at its exact store size. Nothing is committed yet &mdash; these are waiting on your sign-off.</p>
    <nav>${navHtml}</nav>
  </header>
${groupHtml}

  <h2 class="decisions-head">Before you approve</h2>
  <p class="h2-sub">Four things I need from you, in rough order of how much they change the output.</p>
  <div class="decisions">
${decisionHtml}
  </div>

  <footer>
    Rendered by <code>store-assets/build/compose.js</code>; one device profile per platform in <code>platforms.js</code>. Captures live in <code>store-assets/raw/&lt;platform&gt;/</code>, finals in <code>store-assets/final/</code>. The demo week (6&ndash;10&nbsp;Sep&nbsp;2026) is real data on your account and can be cleaned up whenever you want.
  </footer>
</div>
`;

fs.writeFileSync(path.join(root, 'build', 'review.html'), html);
console.log('wrote review.html', (Buffer.byteLength(html) / 1024 / 1024).toFixed(2), 'MB');
