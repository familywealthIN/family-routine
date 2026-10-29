# design-sync notes: Routine Notes

- **No component bundle (owner's choice, 28 Oct 2026).** `packages/ui` is Vue 2 + Vuetify. Claude Design binds React components and the converter needs React 18+, so `package-build.mjs` / `resync.mjs` don't apply here. The project carries:
  - the brand book, tokens and `styles.css` (which `@import`s `tokens.css`);
  - the hand-built cards in `packages/design/components/<Name>/preview.html`, uploaded as `components/<Name>/<Name>.html` because the Design System pane names each card after its file (29 Oct: all 11 showed as "preview");
  - the `*.dc.html` screens and `assets/`.

  Staging is `node .design-sync/stage.mjs`, which writes to `ds-bundle/` (gitignored). The options the owner turned down: React adapters around the Vue components (experimental, hours of work), or a refresh through `build-canvases.js` first.
- **README:** the uploaded copy is `.design-sync/conventions.md` followed by `packages/design/README.md`, with the `tools/` row and "Keeping this folder current" (the build steps) trimmed out, and `preview.html` rewritten as `<Name>.html`. The repo README stays as it is.
- **The atomic layer (since 29 Oct).** The project includes:
  - every `packages/ui` component as a card, `components/Atom-*|Molecule-*|Organism-*`, uploaded as `<Name>.html`;
  - the 15 `canvases/` with 519 screenshots.

  Refresh it with `node packages/design/tools/build-canvases.js` (on this machine, build Storybook first with `--max-old-space-size=3072`, then pass `--no-build`). `stage.mjs` refuses to stage with fewer than 100 shots, so a half-finished run never uploads. Left out: `tools/` and `canvases/manifest.json`.
- **What it took to get there.** The 26 Oct run stopped after 2 shots because one story drew outside the page, and the screenshot error ended the run. Now:
  - the crop is clamped to the page and taken with `fullPage`;
  - a failing story is reported, not fatal;
  - pictures painted as background images count as drawn content;
  - the story list loads every CSF file first.

  Storybook string templates didn't render Vuetify tags, because vuetify-loader only sees `.vue` files. `preview.js` now registers every Vuetify component and directive.

  13 stories were stale or broken and were fixed: Icon, Switch (`<Switch>` is the SVG `<switch>`), TasksCompletedCard, PriorityQuadrant, TableCard, AiTaskCreationForm, WakeCheck (iPad only), GoalItemList, GoalItemMilestoneList and GoalItemMilestoneTile (DD-MM-YYYY dates), plus three new stories for GoalPeriodForm, NewGoalSheet and TitleOptions.
- **Verify the atomic layer by eye, not by count.** A story can "pass" while drawing junk; StepperContent showed only the text "Step 1". Look at contact sheets of every shot. Cards carry `loading="lazy"` images, so an image check must force `loading = "eager"`.
- **Storybook matches Claude Design:**
  - a `Foundations/Tokens` page drawn from `packages/design/tokens.json`;
  - sidebar order Foundations → Atoms → Molecules → Organisms;
  - stories on `--bg-app`.

  There's no Claude Design plugin for Storybook. The skill's Storybook mode needs React 18+.
- **Verification:** each card is rendered at 412 px in Playwright with these checks:
  - `--primary` resolves, so `tokens.css` loaded;
  - the fonts load;
  - there are no failed requests;
  - the content height is at most the `@dsCard height=`.

  On 28 Oct 7 cards declared a height shorter than their content and would have been clipped in the pane; the heights were corrected in the source. When editing a card, re-measure it.
- **No `_ds_sync.json` anchor.** Its recipe hashes a component bundle this project doesn't have, so every sync re-checks all cards. There are 11 of them, so that is cheap.
- **Target:** Claude Design project "Routine Notes" (`4ce4417f-33df-4629-9fa3-d9e33f40b143`), created 29 Oct 2026 and pinned in `config.json`, so later syncs update it in one pass. The account's older "Design System" project (Apr 2026) isn't ours; leave it alone.
- **Font check gotcha:** browsers download a font face only once something on the page uses it. So `document.fonts.check('24px "Material Icons"')` is false on cards with no icons, and `600 … "Plus Jakarta Sans"` is false on cards that only use 400/700. Compare the faces in use with the loaded ones (`[...document.fonts].filter(f => f.status === 'loaded')`) rather than probing one fixed face.
- **The pane caps a card frame at 500 px** (measured 29 Oct). A taller `@dsCard height=` still renders, with a scrollbar inside the card: six hand-built cards (FocusCard, ChatThread, Cover, Navigation, ProgressRing, Sheet) and the taller atomic cards. The owner kept them whole instead of splitting them; split a card only if the scrollbar gets in the way.
- **Files the app writes itself:** `_ds_manifest.json`, `_ds_bundle.js` and `_adherence.oxlintrc.json` appear once the project is opened. They aren't ours, so reconciliation must never delete them (the approved delete globs only cover `components/**`, `canvases/**` and `assets/**`).
