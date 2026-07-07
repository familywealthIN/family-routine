# Routine Notes — marketing site (`apps/web`)

Astro 5 static site for **routinenotes.ai**. Lives alongside the web-app
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

Privacy and Terms are external links to `familywealth.in/*`.

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

Netlify auto-deploys on push to `master`. Config in `netlify.toml`:
- Build command: `yarn build`
- Publish: `dist/`
- Node: 20

DNS for `routinenotes.ai` should point at this Netlify site once the
domain is live.
