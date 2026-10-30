# Routine Notes design system

Routine Notes is the evolution app for ambitious people: you build your day from routines, tick
them inside their window, and every tick feeds three scores, **D**iscipline, **K**inetics and
**G**eniuses. This folder is its design system: the brand, the tokens, the components as they
ship today, and the screen designs the app was rebuilt from. It is laid out so Claude Design (and
any other agent) can read it and design new screens that look like ours.

**Start here, then read [BRAND.md](BRAND.md) for the name, mark and voice.**

## What is in this folder

| Path | What it is |
|---|---|
| `README.md` | This brand book: foundations, rules and the index. |
| `BRAND.md` | Name, logo, the K/D/G idea, voice and words, taglines, do and don't. |
| `tokens.json` | Every colour, type style, spacing, radius and shadow, each with a usage note. The source of truth. |
| `tokens.css` | The same tokens as CSS variables and `.t-<style>` classes. Generated: `node tools/build-tokens.js`. |
| `components/<Name>/` | Hand-built HTML previews of the core components (`preview.html`) with their rules (`README.md`). Copy these patterns. |
| `canvases/Atoms.html`, `canvases/Molecules.html` | Atomic-design canvases: every atom on one canvas, every molecule on another, rendered from Storybook. |
| `canvases/Organisms-<Page>.html` | Organisms, one canvas per app page (App shell, Home, Goals, Year Goals, Priority, Agents, Routines, Progress, Groups, Profile & About, Search, Other screens, Legacy). |
| `canvases/shots/` | The component screenshots the canvases show. Generated: `node tools/build-canvases.js`. |
| `*.dc.html` | The full-screen designs for every page on phone, iPad mini and desktop (see Screens). |
| `HANDOFF.md` | The redesign handoff: layouts, behaviour and the shipped departures from the designs. |
| `assets/` | The logo (`assets/Logos/`), the avatar placeholder and licences (`assets/README.md`). |
| `tools/` | Build scripts. Not part of the design system. |

## Foundations

### Colour

One brand blue, a warm orange for *now*, green for *done*, and the three stimulus colours. Colour
always carries meaning; nothing is coloured for decoration.

| Role | Token | Value |
|---|---|---|
| Brand, primary action, active nav, links | `primary` | `#288bd5` |
| Hover / pressed, active label on tint | `primary-dark` | `#1f6fab` |
| Selected background | `primary-tint` | `rgba(40,139,213,.12)` |
| Page | `bg-app` | `#f4f4f4` |
| Cards, sheets | `surface` | `#ffffff` |
| Text / secondary / tertiary | `text`, `text-secondary`, `text-tertiary` | black at 87% / 54% / 45% |
| Now, Active, today | `now` / `now-dark` | `#FF9800` / `#e68900` |
| Done | `success` | `#4CAF50` |
| Destructive | `danger` | `#d32f2f` |
| D Discipline · K Kinetics · G Geniuses | `stimulus-d`, `stimulus-k`, `stimulus-g` | `#4CAF50`, `#E53935`, `#2196F3` |
| Priority DO · PLAN · DELEGATE · AUTOMATE | `priority-*` | `#F44336`, `#1976D2`, `#E68900`, `#616161` |
| Toast | `toast-bg` | `#1a1a1a` |

- Ring and bar colour rule: `success` at 100%, `now` for today or the current period, `primary`
  otherwise, no fill for the future.
- D, K and G keep their colours and their order (D, K, G) everywhere in the product.
- The app has **one light theme**. There is no dark mode; do not invent one.
- The marketing site (`apps/web`) adds a blue ramp (`brand-50` … `brand-900`) and navy ink
  (`ink-900` `#0d1b2a`). Use those for marketing pages only.

### Type

- **Plus Jakarta Sans** (400–800) for everything in the product; **Montserrat** (600) for marketing
  headlines only; **Material Icons** for every icon. All three load from Google Fonts.
- Scale (`tokens.json` › type): page title 24/700 on phone, 20/700 on iPad and desktop; focus-card
  title 19 (phone) / 26 (iPad, desktop); card title 17/700 (15 when small); rows 15/500; body
  15/400 and 14/400; meta 13/500; caption 12/500; chips 12/600; overline 11/700 uppercase with
  0.5 px tracking.
- Every single-line clipped title uses **line-height 1.3** so the descenders of g, y and p are never cut.
- Times and counts use tabular figures.

### Layout

- Three shells, one rule: **phone** (412 × 892 design frame), **iPad mini landscape** (1133 × 744)
  and **desktop** (1440 × 900). iPad and desktop share type sizes; two-column pages split 60/40.
- Phone gutter 16 px; iPad and desktop card padding 20 px; 24 px between cards.
- Desktop content is capped at 980 px on Home and 1040 px everywhere else.
- Navigation: a 64 px bottom bar on phone, a 76 px rail on iPad, a 264 px sidebar on desktop.
  See `components/Navigation`.
- Tap targets are at least 42–44 px tall.
- Scrolling columns of cards never shrink their cards (`grid-auto-rows: max-content`).

### Shape and depth

- Radius: inputs 10–12, toast 14, cards and labelled buttons 16 (phone), cards 20 (iPad and
  desktop), sheets 20 at the top, pills and chips 999.
- Shadows are soft and low: `shadow-card` for Home's cards and the chat composer, `shadow-raised`
  for cards elsewhere, `shadow-modal` for dialogs. A selected card is an **inset** 2 px primary
  ring, never an outer one.
- No gradients in the product. No borders where a shadow does the job.

### Motion

| What | Motion |
|---|---|
| Sliding indicators (segmented switch, tabs) | `left .28s cubic-bezier(.4,0,.2,1)` |
| Phone sheet | `translateY(28px) → 0`, `.25s cubic-bezier(.3,1.1,.5,1)` |
| iPad / desktop modal | `.22s cubic-bezier(.3,1.1,.5,1)` |
| Toast | in over 12%, hold, out from 85%; 2.8 s |
| Ticked ring (phone) | flies to the header centre (`rn-fly`), then pops (`rn-pop`) |
| Live agent | ring breathes, `1.8s` infinite; firing pulses every 1 s |

Respect `prefers-reduced-motion`.

### Iconography

Material Icons, filled, at 18 / 20 / 22 / 24 px. Navigation: `home`, `dashboard`, `smart_toy`,
`assignment`. Periods: `today`, `view_week`, `calendar_month`, `event_repeat`. Agent stages:
`smart_toy` (running), `hearing` (listening), `bolt` (firing), `check` (finished), `warning`
(stalled). Points use a diamond glyph in a primary pill; in copy they are always "points". No
emoji in the UI.

## Product rules a design must keep

- **The goal cascade.** Day goals feed week goals, week goals feed month goals, month goals feed the
  year. A goal ticks itself at its threshold: **5 day milestones tick a week, 3 week milestones tick
  a month, 6 month milestones tick a year**, however many more were planned. A month goal at 3 of 5
  week milestones is Done. Show the plan in the counter ("3/5 milestones") and the rule in words
  ("Needs 3 of 5 week milestones met").
- Late ticks count. The tick window is 1 h 30 m: it opens 60 min before a routine's start and closes
  30 min after.
- An unticked routine opens the **Start sheet**; it never ticks straight through. A routine needs at
  least one open goal item to start.
- Past days are read-only for additions; open items can be carried to today.
- **A goal item's status is one-to-one with timing** (owner, 26 Oct 2026). `done` means ticked
  within its window, and `missed` means not done within it. A late tick leaves it **Missed**, with
  its box ticked; the tick still counts. "Complete" is only ever on-time. The tick (`isComplete`)
  and the status are separate facts; see `docs/task-status-system.md`.
- **A late tick is always allowed** (owner, 26 Oct 2026). You cannot create a goal item on a past
  day, but an item you created on its day and forgot to tick can still be ticked later, and the late
  tick counts. The server never refuses a tick for being late; do not add a time-window check to
  `tickRoutineItem` or `completeGoalItem`. Only the app chooses how a late routine tick is offered
  (the late check-in sheet).
- Every notification is the one dark toast with a title and a consequence.
- The chat answers questions; it only adds tasks when asked. Suggestions come as proposals with
  "Add all to checklist".
- Areas and projects are context inside the routine's chat ("Before you start"), not pages or
  tapped tags.

## Components

Hand-built previews (`components/`), the patterns to copy:

| Component | Group | What it shows |
|---|---|---|
| `Cover` | Brand | Mark, tagline and the D/K/G pillars |
| `Button` | Actions | Primary, outline, text, danger, pill, header circle |
| `StatusPill` | Status | Active, Done, Inactive, NOW, Missed |
| `ProgressRing` | Progress | Ring sizes and the D/K/G trio |
| `Toast` | Feedback | The one toast, four types |
| `FocusCard` | Home | Tick ring, checklist, period tabs |
| `GoalRow` | Goals | Goal rows grouped by routine, with bar, counter, status and rule |
| `ChatThread` | Chat | Bubbles, insight, event pill, proposals, chips, composer |
| `Navigation` | Navigation | Bottom bar, rail, sidebar |
| `SegmentedSwitch` | Inputs | Thumb and underline variants |
| `Sheet` | Surfaces | Cards, phone sheet with scrim |

The **atomic canvases** in `canvases/` show every component in `packages/ui` as it renders today,
from its Storybook stories. All atoms are on one canvas (`Atoms.html`: Vuetify-based primitives
restyled by the theme), all molecules on another (`Molecules.html`: rings, chips, cards,
switches), and the organisms are split **by page** (`Organisms-Home.html`, `Organisms-Goals.html`
…), so each canvas shows the sections that make up one screen. An organism used on several pages
appears on each, tagged "also on …"; the shell, the drawer and the global sheets are on
`Organisms-App-shell.html`. Components no page uses any more are on `Organisms-Legacy.html` or
marked *legacy*; do not design with them. Every component also has its own card in
`components/Atom-*`, `Molecule-*` and `Organism-*`, grouped the same way.

## Screens

Open any `.dc.html` in a browser from this folder. Each shows Phone (412×892), iPad mini landscape
(1133×744) and Desktop (1440×900) side by side, with notes on what changed. They are the designs the
app was rebuilt from; where the shipped app departs from them, `HANDOFF.md` says so.

| File | Page | Highlights |
|---|---|---|
| Routine Notes Final.dc.html | Home | Focus card and checklist, routine chat with "Before you start", Start sheet, agent lifecycle, week selector, Inbox, goal item page |
| Priority.dc.html | Priority | Triage card, 2×2 map, Delegate → agent, Automate → routine |
| Agents.dc.html | Agents | Agent list, lifecycle, events, last result, run test, create/edit |
| Goals.dc.html | Goals | Goals overview by routine; tap Goals again to switch to a year goal |
| Year Goals.dc.html | Year Goals | Year ring, month cascade, goal sheet |
| Routines.dc.html | Routines | 24 h day dial, timeline, editor with `:` tags and steps |
| Progress.dc.html | Progress | Period switch, efficiency and trend, D/K/G rings |
| Groups.dc.html | Groups | Group pulse, members with today ring and 7-day dots |
| Profile and About.dc.html | Profile, About | Time settings, rates, roll-up chain, Connect AI, API key, delete account; About features |

Notes for building from the screens:
- Sample data is illustrative; agent runs and webhooks are simulated.
- The avatar is `assets/avatar.svg`, a neutral placeholder; swap for the user's picture.
- Point rates (3 h / 1 h / 25%) and the About version label are placeholders; the app reads
  `profileSettings`.
- Profile's roll-up chain in the design says "9 months tick the year"; the rule is **6**.

## Keeping this folder current

- Change a token in `tokens.json`, then run `node packages/design/tools/build-tokens.js`.
- Add or change a story next to a component in `packages/ui`, then run
  `node packages/design/tools/build-canvases.js` (it builds Storybook, screenshots every story and
  rewrites the canvases).
- Then sync the folder to Claude Design (see `tools/SYNC.md`).
