# tools/visual

These scripts prove that a CSS or layout change left the UI as it was. Run all three before
calling a styling change safe. Pages alone are not enough: a modal's buttons can break while
every page looks the same.

1. **`css-snapshot.js <dist> <out.json>`** writes the compiled CSS of a production build,
   rule by rule, for each chunk. Scoped `data-v` hashes are normalised. Snapshot a build
   before your change and one after, then compare the two JSON files. Identical means the
   cascade is unchanged.
2. **`route-diff.js <beforeDist> <afterDist> <outDir>`** screenshots every route on the
   phone (Pixel 7), the iPhone 13 in WebKit (390 px, which is under the sheets' 400 px
   narrow-phone breakpoint), the iPad mini (1133×744) and the desktop (1440×900). It shoots both
   builds back to back with a frozen clock and pixel-diffs each pair.
3. **`modal-diff.js <outDir> before=<dist|origin> after=<dist|origin> [dev=http://localhost:8080]`**
   opens the same modals and sheets on each target. It screenshots and pixel-diffs them, and
   compares every button's computed style inside the open modal. It blocks every mutation
   and never presses a button inside a modal. A scenario whose `opened` is `false` proved
   nothing: fix its hook rather than reading a pass into it. It uses the same four shells.
   The iPhone shell exists because the Start sheet's buttons collapsed on a 390 px iPhone 13
   while every 412 px Pixel shot passed (26 Oct 2026).

```bash
cd apps/web-app && yarn build && cp -r dist /tmp/dist-before   # before the change
# ...make the change, build again...
node tools/visual/css-snapshot.js /tmp/dist-before before.json
node tools/visual/css-snapshot.js apps/web-app/dist after.json
MSYS_NO_PATHCONV=1 node tools/visual/route-diff.js /tmp/dist-before apps/web-app/dist out/routes
MSYS_NO_PATHCONV=1 node tools/visual/modal-diff.js out/modals before=/tmp/dist-before after=apps/web-app/dist
```

Notes:
- They need the API on `:3000` and `JWT_SECRET` in the root `.env`.
- On Git Bash, set `MSYS_NO_PATHCONV=1` or `/home` turns into a Windows path.
- Expected noise:
  - live data that changes between two shots, such as the Profile page's freshly generated
    client secret;
  - a dev server's animations, which keep running.
