# Store screenshots

The 24 slides the listings take: 6 screens x 4 listing sizes.

```
node store-assets/tools/capture-design.js      # packages/design -> raw/<platform>/<key>.png
node store-assets/tools/render-all.js <plat>   # raw -> build/<plat>-<key>.html  (one per platform)
node store-assets/tools/rasterise.js           # build -> final/<plat>-<key>.png
```

`final/` is what gets uploaded. Run all three in order after any design change;
the whole chain is deterministic and needs no running app.

## Where the screens come from

**`packages/design/*.dc.html`** — the design prototypes, not a live capture of
the app. They carry curated demo data, render identically every run, and need no
backend, auth or seeded database. `capture-design.js` serves the design folder
over a throwaway loopback origin (the prototypes `fetch` their `.jsx` device
frames, which a `file://` page cannot do), strips each prototype's own bezel,
status bar and gesture nav, resizes the content box to the target viewport so
the app reflows, and screenshots it.

> **Check before each submission:** the shipped app must still look like the
> design these slides are cut from. Apple 2.3.3 and Play's metadata policy both
> require screenshots to show the actual in-app experience. The redesign shipped,
> so they currently agree — but a UI change that lands in `apps/web-app` without
> landing in `packages/design` quietly makes the listing wrong.

The older real-app captures taken over Chrome DevTools are still in
`raw/<platform>/*.jpeg`. `render-all.js` reads `png` first precisely so a stale
jpeg can never shadow a fresh capture.

## The four sizes

| Platform | Canvas | Device frame | Design frame | Viewport |
|---|---|---|---|---|
| `iphone` | 1290x2796 | iPhone 17 Pro | phone | 412x892 @3x |
| `android` | 1080x1920 | Pixel 10 Pro | phone | 412x868 @3x |
| `ipad` | 2732x2048 **landscape** | iPad Pro 13" | iPad mini landscape | 1133x744 @2x |
| `mac` | 2880x1800 | macOS window | desktop | 1440x856 @2x |

The iPad set is landscape because the design has no portrait tablet layout. The
App Store accepts a 13" set in either orientation as long as every slide in the
set agrees, and they do.

`mac` has no upload slot today — the App Store record is "Designed for iPad",
which serves the iPad set on Apple Silicon. Those six are built for the marketing
site and for a future Mac target.

## Compositing

`compose.js` draws the sky/cloud/band background, the caption and the device
body, and inlines the capture as a base64 data URI so the page is self-contained.
It derives the screen height from the capture's own aspect ratio and puts its
status bar **above** the image, so a capture must contain no device chrome of its
own — which is what `capture-design.js` guarantees, and why the design's
simulated iPadOS status row is marked `data-sim-status` and hidden.

Captions live in `tools/slides.js`, one per screen, in listing order.

## Listing text and the pre-flight check

The store copy lives in `fastlane/metadata/`. Build the two authored Play images,
stage the slides into the fastlane trees, and assert every store cap:

```
node store-assets/tools/make-store-images.js   # icon.png + featureGraphic.png (committed)
node store-assets/tools/stage-fastlane.js      # slides -> fastlane (gitignored, pure copy)
node store-assets/tools/verify-listing.js      # non-zero exit on any violation
```

`verify-listing.js` is `docs/store-deployment.md`'s requirement tables turned
into assertions, so the listing cannot drift past a cap between releases. It
prints the six things it cannot check from the repo — demo account, privacy
questionnaires, content rating, and whether the app still matches the design.

## Review sheet

```
node store-assets/tools/make-review.js && node store-assets/tools/make-review-page.js
```

Builds `build/review.html` — all 24 downscaled and inlined on one page, with the
open decisions called out. `build/` is generated and gitignored.
