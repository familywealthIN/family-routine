# Screenshots

`home-mobile.png` (the hero) and `guide/*.jpg` (the guide chapters) are rendered from the
design frames in `packages/design/*.dc.html`, not captured from the running app:

- `home-mobile.png` is 786×1704, the Home phone frame (412×892) at 2×.
- `guide/*.jpg` are 1920×1200, a 1440×900 desktop frame at 1.33×. `priority-counts.jpg` comes
  from the iPad mini frame, so it does not repeat `priority-quadrants.jpg`.
- States such as the Week tab, a past day, quick add, the move sheet, a selected agent and the
  Edit agent dialog come from clicking through the prototype before the shot.

To re-render after the designs change, open each `.dc.html` in headless Chromium (Playwright).
Pin the device frame (`[id=<option>] .sc-host-x > *`) to its design size, then screenshot the frame.

The `feat-*` files are older captures from the app and nothing on the site references them.

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
