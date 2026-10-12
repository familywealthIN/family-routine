# Design assets

| File | What it is | Licence |
|---|---|---|
| `avatar-demo.png` | The demo profile photo in every screen's header and drawer. | [Unsplash License](https://unsplash.com/license) — free for commercial use, no attribution required. Source: `https://unsplash.com/photos/0a1dd7228f2d` (`photo-1507003211169-0a1dd7228f2d`), cropped square to 256×256. |
| `avatar.svg` | Neutral illustrated fallback, used when `avatar-demo.png` is absent. | Drawn here. |
| `icon-192.png`, `logo.png` | App mark. | Ours. |

## Why the avatar is pinned here

The `.dc.html` prototypes reference `assets/avatar.svg`. `store-assets/tools/capture-design.js`
serves `avatar-demo.png` in its place whenever that file exists, so the store slides
carry a real photograph while the prototypes still open standalone.

**This matters legally.** The mocks originally loaded a Google-hosted image of an
identifiable stranger with no licence — fine while it was only a prototype, not
publishable once the same pixels became App Store and Play marketing. Any
replacement must be a photo you own or one whose licence permits commercial use.
Record the source in the table above when you swap it.
