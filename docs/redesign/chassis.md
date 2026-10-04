# Redesign chassis — the contract every page shares

Source: `packages/design/*.dc.html`. The nav/drawer plumbing (`NAV_MORE`,
`DRAWER_ITEMS`, `NAV_HREF`, `navMoreFor`, `drawerFor`, `fixNav`) and the drawer
markup are duplicated **verbatim in every design file**. They are one chassis,
not nine. Build it once; every page consumes it.

Read this before touching a page, then read that page's own `.dc.html` for detail.
The `.dc.html` is the source of truth; this file is only what is common to all of them.

## Three shells

| Shell | Viewport | Frame | Nav |
|---|---|---|---|
| phone | 412x892 | `AndroidDevice` | 64px header + 64px bottom bar |
| tablet | 1133x744 | bezel 1165x776, r40, `#121212`, 16px pad, screen r24 | 76px left icon rail + "More" flyout |
| desktop | 1440x900 | `ChromeWindow` | 264px sidebar; content `max-width:1040px` |

Tablet and desktop share type sizes and grid splits. Desktop content padding
`22px 28px 28px`.

**Page titles vary per screen — read the frame, not this line.** Desktop titles run
26px on most screens and 22px on tablet, but that is a generalisation and it has
already misled one fix: Home's header date is **20px/700 on both** tablet and
desktop (frames `6a` and `6b` draw the same rule), and Progress uses 20px. The
`.dc.html` frame is the source of truth for any individual number; this document
only describes what is genuinely common to all nine.

The app already resolves these three shells in `RoutineFocus.vue`:

```js
shell() {
  const bp = this.$vuetify.breakpoint;
  if (bp.xsOnly) return 'phone';
  return bp.width >= 1264 ? 'desktop' : 'tablet';
}
```

Use that same rule. Do not introduce a second breakpoint scheme.

## Navigation

- **Primary** (bottom bar / rail / sidebar): Home · Priority · Agents · Goals
- **More** (flyout; phone puts these in the avatar drawer): Routines · Progress ·
  Groups · Profile · About · Log out
- The "More" toggle swaps `more_horiz` / `expand_less` and rotates its chevron 180deg.
- The Goals nav icon carries a progress ring showing the year average %.

## Drawer (right-anchored, 300px, shadow `-4px 0 24px rgba(0,0,0,.2)`)

Copy is fixed across files: name, email, `{points} points`, `{n}-day streak`,
then the More items plus "Log out". Opened by the 32-40px avatar in the header;
dismissed by backdrop or close icon.

## Toast

- phone: full-width pill, `left:16px right:16px bottom:80px` (above the tab bar)
- tablet/desktop: 360px card, `right:24px bottom:24px`
- `#1a1a1a` bg, white text, r14, icon + 14px bold title + 12px sub at 75% opacity
- `animation: rn-toast 2.8s ease forwards` (in to 12%, hold to 85%, out)

Toast copy is always **title + sub**, where the sub carries the consequence
("streak kept", "Launch mobile dashboard → 2/3 weeks"). Keep that pairing.

## Sheet vs dialog (one component, two presentations)

- phone: bottom sheet, `left:0 right:0 bottom:0`, radius `16px 16px 0 0`,
  `animation: rn-sheet-in .25s cubic-bezier(.3,1.1,.5,1)`, backdrop `rgba(0,0,0,.32)`
- tablet: centred modal, width **860px**, r20,
  `animation: rn-modal .22s cubic-bezier(.3,1.1,.5,1)`, backdrop `rgba(15,23,42,.42)`,
  shadow `0 24px 48px -12px rgba(0,0,0,.35)`
- desktop: centred modal, width **720px**, otherwise identical to tablet
- both dialogs `max-width:94%`, `max-height:86%`

Per-page exceptions: the Routines editor is 560px on tablet and desktop; Year Goals'
create/menu sheets are 480px; Goals' new-goal sheet is 500px.

## Palette

| Token | Value | Use |
|---|---|---|
| primary | `#288bd5` (hover `#1f6fab`) | links, rings, active nav, AREA |
| canvas | `#f0eee9` | the design-doc page behind the frames (not the app) |
| app bg | `#f4f4f4` | the screen itself |
| card | `#fff`, r16 phone / r20 tablet+desktop | shadow `0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -1px rgba(0,0,0,.06)` |
| now / warn | `#FF9800`, `#E68900`, `#e68900` | current routine, PROJECT, attention |
| D Discipline | `#4CAF50` | "showing up on time" |
| K Kinetics | `#E53935` | "movement and energy" |
| G Geniuses | `#2196F3` | "focused output" |
| danger | `#d32f2f` / `#F44336` | delete, DO quadrant, failed |
| muted field | `#f7f7f7` | stepper cards, formula box, lifecycle strip |
| code block | `#1e2430` | agent event bodies |

Where a page already renders D/K/G (week selector, drawer), keep the existing
tokens in `packages/ui/constants/routineFocus.js` rather than adding a second set.

## Rings

`circumference c = 2*PI*r`; `stroke-dashoffset = c * (1 - value/100)`; SVG rotated
-90deg so fill starts at 12 o'clock; round line caps.

| Ring | Size | r | stroke | dasharray |
|---|---|---|---|---|
| D/K/G trio | 128 | 56 / 42 / 28 | 10 | — |
| Goals ladder step | 44 (vb 48) | 20 | 4 | 125.66 |
| Goals calendar day | 34 | 21 | 3 | 131.95 |
| Year hero | 120 / 80 / 100 | 42 | 7 | 263.9 |
| Priority tile | 26 | 19 | — | 119.4 |
| Agent avatar | 42 | — | `inset 0 0 0 2px` | — |

Ring colour rule: green `#4CAF50` at 100%, orange for "today"/current, blue
`#288bd5` otherwise, grey/transparent for future or empty.

## Motion

Existing keyframes live in `packages/ui/styles/routine-focus.css` (`rn-fly`,
`rn-breathe`, `rn-btn-breathe`, `rn-pop`, `rn-drawer-in`, `rn-fade`, `rn-pulse`,
`rn-toast`). The designs also use:

| Keyframe | Where |
|---|---|
| `rn-breathe 1.8s ease-in-out infinite` | agent status ring while running/listening |
| `rn-pulse 1s infinite` | 8px dot on a Delegate row mid-run |
| `rn-sheet-in .25s cubic-bezier(.3,1.1,.5,1)` | phone bottom sheet |
| `rn-modal .22s cubic-bezier(.3,1.1,.5,1)` | tablet/desktop centred dialog |
| `rn-flash .9s ease` | a just-saved timeline row |
| `rn-bump .5s` | a tapped Priority quadrant tile |
| `rn-shelf` | Goals/Year Goals switcher sliding from the rail edge |
| `rn-in0` / `rn-in1` (identical pair) | replayed entrance |
| `rn-c0` / `rn-c1` (identical pair) | dial centre swap |

The duplicated-pair trick (`rn-in0`/`rn-in1`, `rn-c0`/`rn-c1`) and the mocks'
`k`/`ck`/`lk`/`listKey` counters exist only to restart a CSS animation on
re-render. In Vue, bump a `:key` instead — do not port the paired keyframes.

## Hierarchical `:` tags

Used by the Routines editor and the goal-item page. One component, same rules.

- `normTag`: trim, whitespace -> `-`, collapse `::+` -> `:`, strip leading/trailing `:`
- chips split per `:` segment; segment 0 is weight 600 when there are >= 2 segments,
  later segments weight 500 with a `1px solid #ccc` left border and 5px padding
- autocomplete is **level-aware**: input containing `:` shows only children one
  level deeper than that scope; no `:` yet shows top-level matches first, then
  deeper partial matches, shortest first; already-applied tags excluded; max 5-6
- a suggestion with children shows a blue `{n} inside >` pill that **drills in**
  (sets the input to `tag:`) rather than selecting
- a trailing `Create {tag}` row appears when the typed value is new
- the suggestion universe is the known vocabulary plus every tag in use plus every
  ancestor prefix of those
- keys: Enter / Tab / `,` / space adds (the highlighted suggestion if arrow-selected,
  else the raw text); `,`/space on an empty value is swallowed; Backspace on an empty
  input removes the last chip; ArrowUp/Down move the highlight; ArrowRight at
  end-of-text drills into a highlighted tag with children; Escape clears + blurs
- helper text: "Enter, Tab, comma or space adds · Backspace removes the last tag"
- scope header when the input has `:`: "Inside **{scope}**" (segments joined with "›")

## The goal cascade

`TH = { week: 5, month: 3, year: 6 }` — this matches the server's existing
`autoCheckThreshold`. Do not re-derive it per page.

- a **day** goal contributes to its routine's week goal only once **every** task
  under that routine for that day is done
- a **week** goal auto-ticks at 5 done days; it can be ticked by hand only if it has
  fewer than 5 days defined
- a **month** goal auto-ticks at 3 done weeks
- a **year** goal auto-ticks at 6 done months; its percentage is
  `Math.round(count / 6 * 100)` — so 5/6 shows **83%**, not 84%
- a tick that crosses a threshold cascades immediately and upward in one gesture,
  posting one chat event per crossing plus a single rollup toast
- a tick blocked because the level below already satisfies it toasts
  "Ticked automatically" / "{n} of 5 day goals are done"

Status labels are `Done` / `Active` / `Inactive`. `Inactive` appears only on Year
Goals (a past or future period with no completion); Goals uses `Done` / `Active`.

## Chat has two hosts

The thread is not a Home-only feature. Both the routine thread (Home) and the
**year-goal thread** (Year Goals) render the same parts: event pills, message
bubbles, proposal cards with a bulk "Add N …" button, suggestion chips, a typing
indicator (750ms delay) and a sticky composer. Year Goals keeps one thread per
goal and stashes it when the user switches goals.

Build the thread as one organism with a host-agnostic message contract. The
existing `packages/ui/organisms/RoutineChatThread` is the starting point.

## Areas and projects live in chat

They are **not** a tapped tag and **not** a page. Each routine's thread opens with
a collapsible card titled **"Before you start"**, open by default, auto-collapsing
when the composer takes focus. Per `area:`/`project:` tag on the routine it renders:

- kind label + breadcrumb. `CTX_KIND`: `area` -> `{kind:'AREA', icon:'dashboard', color:'#288bd5'}`,
  `project` -> `{kind:'PROJECT', icon:'folder', color:'#E68900'}`. The breadcrumb drops
  the kind segment, title-cases each `kebab-case` segment, separates with a left border.
- `desc` — **at most 2 sentences and 24 words**, plain language, states the standing
  commitment. e.g. "Product + engineering. Mornings for the hardest thing." Note it is
  *not* one sentence: the design's own register is two clipped clauses, so a hard
  first-sentence cut mangles it. A real paragraph still reduces to its first sentence.
  Enforced by `normaliseDescription` in `apps/server/src/utils/aiApi.js`.
- **NEXT STEPS** — **verb-first fragments, max 3**, each with an `Add` pill that flips
  to `Added`. The string is appended to the checklist **verbatim**, so it has to read
  as a task on its own. Enforced by `normaliseNextSteps`: <= 7 words, <= 60 chars,
  <= 3 items, list markers / `Step 1:` labels / markdown emphasis / wrapping quotes
  and trailing punctuation stripped, duplicates dropped, failure yields `[]` (never a
  partial string — anything returned here lands on someone's checklist).
  `getNextStepsListFromGoalItems` returns the array; `getNextStepsFromGoalItems`
  keeps the `String` GraphQL contract and joins on a **blank line**, because
  `NextSteps.vue` renders it through `vue-markdown` and single newlines collapse.
- **PAST ACTIVITY** — up to 3 rows of `[day, what happened, done?]`
- collapsed subline: `{breadcrumbs joined by ' · '} · {n} next steps`
- right-aligned stat per block: `{doneCount}/{acts.length} recent`

Two chat quick-replies read the same data: "What did I do last time?" and
"Plan from next steps" (returns the unadded steps as proposals with
"Add all to checklist").

**Hold the generator to those lengths in code, not in the prompt alone.** A
paragraph where a fragment belongs breaks the Add-to-checklist contract.

## Things the mocks get wrong on purpose

- Routines' `ticks` getter (dial tick positions) is computed but never read — the
  tick labels are hardcoded `<text>` at 0/6/12/18. Dead scaffolding, not a gap.
- Progress' "Needs attention" rows link to the generic Routines page. The stated
  intent is "open the routine", and `RANK[...].bad` already carries the id — so
  deep-link the real implementation.
- Goals' Milestones button only toasts `Opens /goals/milestones`. A real route
  already exists for it.
- Sample data, agent runs and webhooks are simulated in every file. The avatar is
  a remote URL — use the real profile image. Point rates (3h / 1h / 25%) and the
  About version label are placeholders — read `profileSettings`.
- `@routine-notes/markdown-editor` (EasyMDE default config) already exists — use
  the package, do not reimplement the toolbar the mock draws by hand.
- The Home mock's `"done with the PR"` demo **does not work**: its word filter drops
  tokens of <= 2 chars, so "PR" is stripped with the stop-words and nothing matches.
  It always falls through to "Which one? Tick it here:". Our `chatApi.js` resolves a
  real `complete_task` intent with a validated `completeItemId` — keep ours.
- Several `__rv()` values are computed and never rendered: Home's `lgRingSize`/
  `lgRingInset`/`lgRingIcon`/`lgTitleSize` (iPad and desktop both use `tbRingSize`),
  `agentSteps`, `agentSummary`, `stageGallery`, `hasBadge`, `badgeLabel`, and the
  legacy `periods`/`tabUp`/`tabPast`. Don't port them.

## Conflicts between design files — decided

These are places where the designs disagree with each other or with shipped data.
Resolved here so nine agents don't each decide differently.

| Conflict | Design says | Reality | Decision |
|---|---|---|---|
| month -> year threshold | Profile's roll-up chain: "9 months tick the year" | Goals + Year Goals both use **6**; `PROFILE_SETTINGS.autoCheckThreshold.month` is **6** | **6.** Profile's copy is wrong; two design files and the server agree. Fix the chain copy to "6 months tick the year". |
| D / K rates | D "3 h", K "1 h" | `routineDiscipline: 24`, `taskKinetics: 2` | Bind to `profileSettings`. The mock's numbers are illustrative; G's 25% matches by coincidence. |
| time zones | 5 entries, `"India (GMT+5:30)"`, London as GMT+1 | `TIMEZONE_OPTIONS`, ~38 entries, `"(GMT +5:30) Bombay, Calcutta, Madras, New Delhi"` | Use the real list and its label format. |
| Connect AI state | always renders the green "Connected" chip | `oauthConnected` defaults **false**; secret prefix is `frt_secret_`, not `rn_sec_` | Model the **disconnected** state too — the design omits it. Use the real prefix. |
| legacy API key | generated locally, `'rn_' + random` | a GraphQL mutation | Call the mutation. Replace the current `alert()` with the chassis toast. |
| delete account | local no-op, toasts "Prototype only" | `deleteAccount` mutation, clears localStorage + Apollo cache, redirects to `/` | Keep the real behaviour. The type-DELETE gate is correct as drawn. |
| About copy | README promises "copy is kept as written"; the file actually trims the soldier metaphor out of Discipline/Kinetics/Geniuses, drops Priority's 5th point, and drops the "Picture a soldier..." opener | `AboutTime.vue` has the long form | **Follow the design's trimmed copy.** It is the newer authored text and reads better. The README's "as written" claim is inaccurate — noted, not obeyed. |
| Goals "Dashboard" wording | "shows on the **Home** card" | Vue says "Dashboard card" | "Home" — matches the nav. |

One more, not a conflict but a gap: the Groups join-request **Accept** handler only
dismisses the card and toasts. It does not switch groups. Implement the real switch.
