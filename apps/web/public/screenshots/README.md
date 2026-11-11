# Screenshots and feature videos

Everything here and in `public/videos/` is rendered from the design prototypes in
`packages/design/*.dc.html`. Nothing is captured from the running app, so you need no backend,
login or seeded data:

```
node apps/web/scripts/record-design-media.mjs                 # all screenshots and videos
node apps/web/scripts/record-design-media.mjs --only=shots
node apps/web/scripts/record-design-media.mjs --only=videos --scene=points --variant=mobile
node apps/web/scripts/record-design-media.mjs --only=videos --dry   # a still per step, to check a flow
```

- `home-mobile.png` (the hero) is 786×1704: the Home phone frame (412×892) at 2×.
- `guide/*.jpg` are 1920×1200: a 1440×900 desktop frame at 1.33×. `priority-counts.jpg` comes
  from the iPad mini frame, so it doesn't repeat `priority-quadrants.jpg`.
- `public/videos/{routines,goals,agents,points}-{desktop,mobile}.webm` play in FeatureScenes and
  the guide. Desktop is the 1440×900 frame recorded at 1280×800, with the camera zooming in on the
  action. Mobile is the 412×892 frame with a touch dot and no zoom, so every entry in
  `zoom-timings.json` is empty. Each video has a `-poster.jpg` of its end state.

To change a flow, edit `SHOT_JOBS` or `SCENES` in the script. A step targets the deepest element
whose text matches. `dx` clicks left of the text, for example a checklist row's checkbox.
`nth: -1` takes the last match, and `ring` and `avatar` find those two controls by their shape.

`scripts/record-videos.mjs` is the older recorder that drives the live app (backend, JWT and
seeded data). Use it only if a recording must show real data.
