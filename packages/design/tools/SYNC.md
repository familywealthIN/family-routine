# Syncing packages/design with Claude Design

`packages/design` is laid out as a Claude Design design system: `README.md` and `BRAND.md` are the
brand book, `tokens.json` the tokens, `components/<Name>/preview.html` the cards (each starts with a
`<!-- @dsCard group="…" -->` line, which is how the Design System pane groups them), `assets/Logos`
the mark, and `canvases/` plus the `*.dc.html` screens the reference material.

## 1. Refresh the folder from the code

```bash
node packages/design/tools/build-tokens.js     # after editing tokens.json
node packages/design/tools/build-canvases.js   # after adding or changing stories in packages/ui
```

`build-canvases.js` builds Storybook, screenshots the stories, and rewrites `canvases/` and every
generated `components/Atom-*`, `Molecule-*`, `Organism-*` card. The hand-built cards (`Button`,
`GoalRow`, `ChatThread` …) are never touched by it.

## 2. Push it to Claude Design

In Claude Code, from the repo root:

```
/design-sync packages/design
```

The project already exists: "Routine Notes", pinned in `.design-sync/config.json`. The sync stages
this folder with `node .design-sync/stage.mjs` into `ds-bundle/` (cards upload as `<Name>.html`, so the
Design System pane shows real names), shows the exact files it will write or delete, and waits for
your approval before uploading anything. `.design-sync/NOTES.md` records how it's done and why.

Left out of the sync: `tools/` (build scripts) and `canvases/manifest.json`.

## 3. Use it in Claude Design

Pick the "Routine Notes" design system when you start a design, prototype or deck. Claude reads
`README.md` first, then the tokens, cards and screens, and designs in our type, colours, shapes and
voice.

## When the design changes in Claude Design

Edits made in Claude Design do not flow back into the repo by themselves. Bring the change into the
code (`packages/ui`, `tokens.json`), then run steps 1 and 2 again so the two stay identical. The code
is the source of truth.
