# Routine Notes — marketing site (`apps/web`)

Astro 5 static site for **routinenotes.app**. Lives alongside the web-app
(`apps/web-app`) and shares the type system + brand color from
`packages/ui`, but is otherwise an independent build.

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro 5 (static output, no SSR adapter) |
| Styling | Tailwind v4 via `@tailwindcss/vite` |
| Type / display fonts | Plus Jakarta Sans + Fraunces (matches `packages/ui`) |
| Icons | Phosphor via `astro-icon` + `@iconify-json/ph` |
| Motion | Motion One + Astro View Transitions |
| Hosting | Netlify |

## Routes

- `/` — long landing page (Hero · Features · How It Works · KDG · Earn-Your-Way · Social Proof · Final CTA)
- `/pricing` — Free vs Subscriber comparison + earn-your-way explainer
- `/about` — Founder origin story

- `/blog` — persona posts on the KDG framework and "Chat with MCP" posts, filterable by category and pillar
- `/blog/<slug>` — one post: featured image, key takeaways, the body with its diagrams, related posts
- `/blog/rss.xml` — RSS feed · `/llms.txt` — the guide and every post with a one-line summary

Privacy and Terms are external links to `familywealth.in/*`.

## Blog

Posts are Markdown in `src/content/blog/` (an Astro content collection; the
schema is `src/content.config.ts`). Besides the words, each post's frontmatter
holds the data its pictures are drawn from: the persona's `routines` (time,
name, points, pillar, cue), the `focus` routine and the goal `cascade`, or the
`mcp` prompt and tool calls. `takeaways` fill the box at the top, and `howTo`
(setup posts only) adds HowTo JSON-LD.

A post whose `publishDate` is in the future is left out of the index, the
post pages, the sitemap, the RSS feed and `llms.txt` until a build on or after
that date (`src/lib/blogPosts.ts`).

```
node apps/web/scripts/blog-images.mjs [slug …]   # featured images → public/blog/<slug>.png
node apps/web/scripts/blog-audit.mjs  [slug …]   # anti-slop + SEO checks; exits 1 on failure
```

`blog-images.mjs` draws each 1200×630 image from the post's frontmatter with
sharp, in Montserrat and Plus Jakarta Sans from `scripts/fonts/` (SIL OFL).
Re-run it after changing a post's title, persona, routines or tools, and commit
the PNG. `blog-audit.mjs` must pass before a blog change merges: banned filler
phrases, duplicate titles or descriptions, missing images, diagram data or alt
text, near-duplicate posts (over 12% shared 5-word shingles), and the
structure rules (an opening that answers the title, a worked example with real
numbers, a "what goes wrong" section, an in-app path).

## Local development

```
yarn install                 # at repo root — sets up workspaces
yarn workspace web dev       # → http://localhost:4321
yarn workspace web build     # → dist/
yarn workspace web preview   # serves dist/
```

## Screenshots

The Hero phone frame and Feature Grid micro-screenshots reference files
under `public/screenshots/`. Until real captures land, SVG placeholders
in that directory keep the layout intact. See
[`public/screenshots/README.md`](public/screenshots/README.md) for the
capture flow.

## Demo data seed

`scripts/seed-demo.mjs` hits the dev GraphQL endpoint (`localhost:3000/graphql`)
and creates 5 routine agents plus a year → month → week → day goal cascade
for `grvpanchalus@gmail.com`. In dev mode the server auto-resolves that
email without auth (see `apps/server/src/utils/getEmailfromSession.js`).

```
yarn workspace web seed
# or with a custom endpoint:
node scripts/seed-demo.mjs --endpoint http://localhost:3000/graphql
```

The script is additive — it doesn't clear existing data. Drop the relevant
Mongo collections before re-running if you want a clean slate.

## Brand tokens

Single source of truth for the brand palette and type system is
`src/styles/global.css` (Tailwind v4 `@theme` block). Primary brand
colour is `#288bd5` (matches `packages/ui/design.js`).

Cross-app changes (e.g., bumping brand to a new shade) should land in
**both** this file and `packages/ui/design.js` so the marketing site and
the web-app stay visually aligned.

## Deploy

GitHub Pages serves the site at https://routinenotes.app.
`.github/workflows/deploy-web.yml` builds `apps/web` and publishes `dist/` on every
push to `master` that touches `apps/web/**`. You can also run it by hand from the Actions tab.

- `public/CNAME` holds the custom domain. Every deploy carries it, so Pages keeps the domain.
- The DNS A records for the apex and `www` point at GitHub Pages
  (185.199.108–111.153).
- `netlify.toml` is left over from the earlier Netlify setup. Pages does not read it.
