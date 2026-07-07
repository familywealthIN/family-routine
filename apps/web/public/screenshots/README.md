# Screenshots

Real product screenshots from the Routine Notes web-app land here.

Capture flow (run from project root):

1. Start the GraphQL backend on `:3000`
2. Start the web-app: `yarn workspace web-app dev` → opens on `:8080`
3. Log into your account in Chrome
4. Run the seed script: `yarn workspace web seed` (writes 5 routines + goal cascade)
5. From Claude Code, run the screenshot capture step

Expected files (referenced from `src/components/sections/*.astro`):

- `home-mobile.png` — 393×852 mobile viewport of `/home` (hero phone frame; shows the points chip beside search)
- `feat-routines.png` — 16:10 desktop crop of `/settings`
- `feat-goals.png` — 16:10 desktop crop of `/goals`
- `feat-ai.png` — 16:10 desktop crop of `/agenda/tree` or AI panel
- `feat-points.png` — 16:10 desktop crop of `/home` PAST tab with a passed task showing the white diamond redeem button and a nonzero points chip (seed one task timed >1h30m ago so it auto-passes)
- `feat-progress.png` — 16:10 desktop crop of `/progress`
- `feat-groups.png` — 16:10 desktop crop of `/groups`

Until real screenshots land, placeholder SVGs in this directory keep the
layout from collapsing.

## Feature videos (`public/videos/`)

The features section (`FeatureScenes.astro`) plays real product recordings —
one desktop (1280×800) and one mobile (390×844) webm per scene, with poster
JPGs. Delivery is bifurcated by device: desktop + tablet (md+) render the
desktop recording in a browser frame; phones render the mobile recording in a
phone frame. Recordings pan-and-zoom into the action (Todoist-style close-ups)
via a `<body>` transform during capture so the interaction stays legible at
small render sizes. They are captured by `scripts/record-videos.mjs`
(Playwright, headless):

1. Start backend + web-app as above, seed demo data
2. Sign a JWT (the app sends `Authorization: Bearer` on every call and the
   server verifies it even in dev — a fake token 401s):
   `cd apps/server && node -e "require('dotenv').config(); console.log(require('jsonwebtoken').sign({email:'grvpanchalus@gmail.com'}, process.env.JWT_SECRET, {expiresIn:'2d'}))"`
3. `node apps/web/scripts/record-videos.mjs --tokenFile=<path>` (or
   `ROUTINE_NOTES_TOKEN=<jwt>`); use `--scene=`/`--variant=` to re-record one
4. The `points` scene redeems a passed task for real — `passRoutineItem` a
   fresh task before re-recording it per variant
5. Trim the page-load head afterwards with Playwright's bundled ffmpeg
   (VP8 + png encoders only): `-ss 2.5 -c:v libvpx -b:v 2M -crf 10 -an`

Gotchas: kill any stale `astro dev`/`astro preview` before recording or
building — they stream `public/videos`/`dist/videos` and hold the webm files
delete-pending, which surfaces as EPERM on save/build. Mobile dialogs are
wider than the viewport, so scenes skip the dialog zoom there; buttons near
the bottom edge must be `scrollIntoView({block:'center'})`-ed first or the
bottom nav swallows the tap.
