# Building with the Routine Notes design system

**There is no component bundle.** The app is Vue 2 + Vuetify, so its components can't be loaded here. Build designs with your own markup, styled only from this system's tokens. The cards in `components/<Name>/<Name>.html` are the patterns to copy: open the one closest to what you're building and reuse its structure, sizes and token choices.

**Setup.** Load `styles.css`. It imports `tokens.css`, which defines every token as a CSS variable on `:root` and loads the fonts: Plus Jakarta Sans, Montserrat and Material Icons. Without it, nothing has the brand's colours or type. Page background is `var(--bg-app)`, cards are `var(--surface)`, and text is `var(--text)` in `var(--family-sans)`.

**Styling idiom: CSS variables plus a few classes.** Never hard-code a colour, radius or shadow that has a token.

| Family | Tokens |
|---|---|
| Brand | `--primary` `--primary-dark` `--primary-tint` `--on-primary` |
| Surfaces | `--bg-app` `--surface` `--surface-subtle` `--divider` `--divider-strong` |
| Text | `--text` `--text-secondary` `--text-tertiary` `--text-disabled` |
| Status | `--success` `--now` `--now-dark` `--now-tint` `--danger` `--info` |
| Scores | `--stimulus-d` (Discipline) `--stimulus-k` (Kinetics) `--stimulus-g` (Geniuses) |
| Priority | `--priority-do` `--priority-plan` `--priority-delegate` `--priority-automate` |
| Agents | `--agent-waiting` `--agent-running` `--agent-listening` `--agent-finished` `--agent-failed` |
| Space | `--space-1` to `--space-6`, `--space-8` (there is no 7), `--row-min` |
| Shape | `--radius-control` `--radius-card` `--radius-card-lg` `--radius-pill`; `--shadow-card` `--shadow-raised` `--shadow-modal` |
| Layout | `--bottom-bar` `--rail` `--sidebar` `--content-max-home` `--content-max` |

- **Type:** use the `.t-*` classes, for example `.t-page-title`, `.t-card-title`, `.t-row`, `.t-body`, `.t-meta`, `.t-caption`, `.t-chip` and `.t-overline`. In your own CSS, use the matching `font: var(--font-row)` shorthands.
- **Icons:** `<span class="mi">check_circle</span>`, where the text is a Material Icons ligature name.

**Where the truth lives:**
- `tokens.css` holds the variables and classes, and `tokens.json` gives each token's usage note.
- This README has the foundations and the product rules a design must keep.
- `BRAND.md` covers the voice and words.
- `HANDOFF.md` lists where the shipped app departs from the `*.dc.html` screens.
- The `README.md` next to each card holds that component's rules.

**Example** (adapted from `components/Button`):

```jsx
<div style={{ background: 'var(--bg-app)', padding: 'var(--space-4)', fontFamily: 'var(--family-sans)' }}>
  <div className="t-overline" style={{ color: 'var(--text-tertiary)' }}>Up next</div>
  <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 40, padding: '0 18px',
    border: 0, borderRadius: 'var(--radius-card)', background: 'var(--primary)', color: 'var(--on-primary)',
    font: '600 14px/1 var(--family-sans)' }}>
    <span className="mi" style={{ fontSize: 20 }}>play_arrow</span>Start task
  </button>
</div>
```

---

