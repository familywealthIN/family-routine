# Handoff: Routine Notes v2 — full app redesign

> Put this file at `packages/design/HANDOFF.md`. The design files are already in `packages/design/` (`*.dc.html`, `support.js`, `android-frame.jsx`, `browser-window.jsx`, `assets/`).

## Overview
A redesign of every main page of the Vue web app for **phone (412×892), iPad mini landscape (1133×744) and desktop (1440×900)**: Home (routine focus + chat), Priority, Agents, Goals, Year Goals, Routines, Progress, Groups, Profile, About — plus one navigation model for all devices.

## About the design files
The `.dc.html` files are **design references built in HTML**: prototypes of intended look and behaviour, not production code. Open them in a browser from `packages/design/` (each shows Phone / iPad mini / Desktop side by side, with a "What changed" note on top). **Recreate them in `apps/web-app` using its existing patterns**: Vue 2 + Vuetify 1.x via the `@routine-notes/ui` atoms/molecules/organisms, Apollo GraphQL composables (`useGoalQueries`, `useGoalMutations`), `$agent` store, `@routine-notes/markdown-editor`. Do not ship the HTML.

## Fidelity
**High fidelity.** Colours, type sizes, spacing, radii, shadows and motion are final. Match them with the codebase's components (restyle where needed).

## Implementation plan (one branch: `feat/v2-redesign`)
1. **Tokens + shared atoms** (`packages/ui`): ProgressRing, SlidingSegmented, SlidingTabs, StatusPill, BottomSheet/CenteredModal (sheet on phone, modal ≥ 600px), Toast (dark, bottom), SegmentedTagChip (`a | b | c`).
2. **Navigation shell** (layouts): primary + More + avatar drawer (see below).
3. **Server schema + resolvers** (see "New fields"). Ship before the UI that needs them.
4. Pages in this order: Home → Goal item page → Priority → Agents → Routines → Goals/Year Goals → Progress → Groups → Profile/About.
5. Tests: extend existing Jest tests for resolvers; add e2e for skip day, inbox move, past-day lock, start-without-goal-item rule.

## Navigation (all devices)
- **Primary:** Home · Priority · Agents · Goals.
  - Phone: bottom bar (64px, icon 24, label 12/500, active `#288bd5`).
  - iPad: 76px rail (item 52×30 pill, label 10/600, gap 10, padding 22/14, scrolls if needed).
  - Desktop: 264px sidebar (row 40px, radius 10, 14/600, active bg `rgba(40,139,213,.12)` fg `#1f6fab`).
- **More:** Routines · Progress · Groups · (8px gap) Profile · About.
  - Phone: avatar (top-right, 40px hit area) opens a right drawer (300px) with user card, points + streak chips, the More links and "Log out" (`#d32f2f`).
  - iPad/desktop: a **More** toggle under the primary items (rail: ⋯ / ˄ icon; sidebar: "More ⌄" row with rotating chevron). Expanded by default when the current page is in More.
- **Goals tab:** tapping Goals while already on Goals opens a "Go to" sheet/shelf (Goals overview + year goals by routine time). Goals icon carries a small ring = average year-goal progress.
- Desktop content: centred, `max-width` 980px (Home) / 1040px (others). iPad mini and desktop share **identical type sizes**; two-column pages use a **60/40** split (`flex:3` / `flex:2`).

## Design tokens
- **Font:** Plus Jakarta Sans 400/500/600/700/800; icons Material Icons.
- **Colours:** primary `#288bd5`, primary-dark `#1f6fab`, primary-tint `rgba(40,139,213,.12)`; success `#4CAF50` / `#2e7d32`; warning/now `#FF9800` / `#e68900`; danger `#d32f2f` / `#E53935`; agent blue `#1976d2`; page bg `#f4f4f4`; card `#fff`; text `rgba(0,0,0,.87)` / secondary `.54` / tertiary `.45`; dividers `rgba(0,0,0,.06–.08)`.
  - Priority: DO `#F44336`, PLAN `#1976D2`, DELEGATE `#E68900`, AUTOMATE `#616161`.
  - Stimuli (Progress only): D `#4CAF50`, K `#E53935`, G `#2196F3`.
- **Type scale:** page title 24/700 (phone) · 20/700 (iPad/desktop); card title 15–17/700; body 14–15; meta 12–13; overline 11/700 letter-spacing .5px uppercase; chip 11–13/600.
- **Radii:** cards 16 (phone) / 20 (iPad/desktop); sheets 20 top; modals 20; pills 999; inputs 10–12.
- **Shadows:** card `0 4px 6px -1px rgba(0,0,0,.1), 0 2px 4px -1px rgba(0,0,0,.06)`; modal `0 24px 48px -12px rgba(0,0,0,.35)`; selected card = **inset** `0 0 0 2px #288bd5` (never outer — it gets clipped in scroll columns).
- **Motion:** sliding indicators `left .28s cubic-bezier(.4,0,.2,1)`; sheets `translateY(28px)→0 .25s cubic-bezier(.3,1.1,.5,1)`; toasts 2.6–2.8s; live agent "breathe" `box-shadow 0 0 0 0 → 7px, 1.8s infinite`.
- **Layout rule:** scrolling card columns must not shrink cards — use `grid-auto-rows:max-content` (or `flex-shrink:0` on children).

## Screens

### Home — `Routine Notes Final.dc.html` (RoutineFocus.vue)
- **Header (phone):** Inbox (40px white circle, orange count badge) at far left · "Home" · points pill · avatar (32px image in a 40px hit area) at right. When the routine is ticked, the ring + routine name fly into the header centre (stacked, 34px ring, 12/700 name).
- **Week selector:** 7 day rings (D/K/G triple ring); sliding white highlight; **long-press today (≥520ms) or right-click** → Skip day sheet. Skipped day shows an orange pause badge.
- **Focus card:** 120px tick ring (Muse-style), title under it. Checklist (15/500 rows, 24px checkbox, 44px min height) → row opens the goal item page; checkbox ticks. Bottom tabs Today · Week · Month · Year with sliding underline.
- **Chat with the routine** under the checklist:
  - "Before you start" card from the routine's `area:`/`project:` tags: description, next steps (Add → checklist), past activity.
  - Collapses when the composer is focused (phone also collapses the checklist).
  - Chips: "What did I do last time?", "Plan from next steps".
  - Agent results post a preview card.
- **Start sheet:** opened by the check circle of **any** startable routine — an unticked routine never ticks through, because ticking it directly banks the points with no way to start its agent and nothing on screen naming the item just completed. Contents: "Type your task" input (placeholder becomes "Add another task" once something is locked in) · **LOCKED IN** block · routine (locked) · parent goal selector (week goals grouped by routine) · Related Goals timeline · Start Task / Start Agent.
  - **LOCKED IN** is the routine's **first** day goal item — body, contribution, struck through when complete. That first item is the one an agent's `{goalId}` resolves to, so when an agent is bound the overline reads `LOCKED IN · AGENT TARGET` and the lock tooltip says the agent runs against it. Absent on a routine with nothing on it yet, and the sheet is the plain create form.
  - **A routine cannot start without at least one open goal item** (typed or existing) — the button greys out with an orange hint. *Shipped departure:* Home passes `allow-start-without-task`, because there the sheet is the **only** way to start a routine; refusing an empty input would strand a routine that has no checklist yet. The rule still holds wherever another tick path exists.
  - **Redeem affordability is checked before the sheet opens**, not inside it: Start Task persists the goal item and only then redeems, so a failed redeem would strand an orphan item on an unticked routine. On a passed routine Start Task redeems rather than ticking.
- **Past days (week selector < today):** read-only for additions — no Add task, no + in composer, no ticks, date locked; editing title/contribution/delete still allowed; chat queries allowed (per-day thread, no additions).
- **Inbox sheet/modal:** quick-add input on top; rows with "Do now · <current routine>", "Move to routine" (routine chips), delete; empty state "Inbox zero".
- **Skip day:** sheet with optional reason; once skipped, an orange banner on the card ("Today is skipped … Undo"), ticks blocked.
- iPad/desktop: focus card and chat side by side 60/40; modals centred (desktop 720px, iPad 860px).

### Goal item page (modal / sheet, Notion-like)
- Header: period label · status pill (click toggles Open/Complete) · delete · close.
- Borderless 28/700 auto-height title.
- **Contribution** directly under the title: rendered Markdown, click to edit with `@routine-notes/markdown-editor` (default config).
- **Agent result** card (when `reward` exists): meta "Updated by <agent> · end event · <time>", NEW badge until seen, clamped HTML + Show more / Full transcript (modal = title + HTML only).
- Then: Linked to (routine → parent goal), Date (Today/Tomorrow/Mon chips; locked on past days), Tags (segmented `:` chips, add/remove, level-aware autocomplete), Subtasks (tick, rename, ↑, delete, add with Enter, progress bar).

### Priority — `Priority.dc.html`
- Triage card for items without a quadrant (one at a time, 2×2 buttons, Skip).
- 2×2 map tiles (open count + done ring).
- List grouped by routine. Delegate rows: "Hand to agent". Automate rows: "Make it a routine". ⤧ moves an item to another quadrant.

### Agents — `Agents.dc.html`
- Stats (runs, success %, live).
- Cards: status ring (breathes while running/listening), routine, ok/failed bar, last run.
- Detail: lifecycle Start → Running → Listening → End, counts, start/end events (URL/cURL, dark code box), last result (HTML) or error (red), Run test, Open routine.
- Create/Edit form: name, routine chips, start/end event with URL/cURL sliding switch, delete.

### Routines — `Routines.dc.html` (SettingsTime.vue)
- 24h day dial: arcs from start to next start; current routine orange; tap an arc to select.
- Timeline: time left of the connector line; gaps ≥ 3h offer "Add routine at …".
- Editor (sheet / centred modal): name, time ±10 min, points ±1, description, tags input (same as goal tags), steps (reorder/remove/add), linked agent + year goal, delete.
- **No stimulus picker** — stimuli derive from points.

### Goals / Year Goals
Goals overview + year goal pages as designed; the year goal sheet supports one goal per routine: search, sort by routine time (Now / Later / Earlier) or by progress.

### Progress — `Progress.dc.html`
- Day · Week · Month · Year sliding switch.
- Statement + efficiency % + delta vs the previous period; ⓘ shows the formula.
- Sparkline with a previous-period dashed line; dots are HTML overlays so they stay round.
- D/K/G ring trio; Completed bars; Great going / Needs attention (equal height on iPad/desktop); history link.

### Groups — `Groups.dc.html`
- Group pulse; member rows (today ring around the avatar, live dot, 7-day dots), you pinned on top.
- Member week grid (routine × day) in a sheet (phone) or beside the list.
- Invite (email validation, 10-member cap, pending rows with Cancel); join request card; leave confirmation.

### Profile & About — `Profile and About.dc.html`
- **Profile:** user card; Time (12/24 sliding switch with preview, time zone select, week start locked); point rates (read-only); roll-up chain 1 day → 5 days = wk → 3 wks = mo → 9 mos = yr; Connect AI (Server URL, Client ID, masked secret, copy; platform chips with steps); legacy API key; Delete account (type DELETE).
- **About:** hero; five equal-width feature tabs with sliding underline; Getting started steps.

## New fields / API (UI + GraphQL + new fields)
Add to the schema in `apps/server/src/schema/*` and resolvers, and update the fragments in `apps/web-app/src/composables/graphql/fragments.js`:
1. **GoalItem**
   - `rewardSeenAt: String`: drives the NEW badge on agent results. Mutation `markGoalItemRewardSeen(id)`.
   - `rewardMeta: { agentId, agentName, at }`: written by `agentStore.fireEndEvent` alongside `updateGoalItemReward`.
2. **Routine (day)** — `skipNote: String`. Mutation `skipDay(date, note)` / `unskipDay(date)`, reusing the existing `skip: Boolean`.
3. **Inbox:** day goal items with no `taskRef` and no future date. Query `inboxItems`; mutation `moveGoalItemToRoutine(id, taskRef, date)`.
4. **Priority triage:** `priorityQuadrant: String` (`do|plan|delegate|automate|null`) on GoalItem. `null` means it goes to triage. Mutation `setPriorityQuadrant(id, quadrant)`. Keep the current auto-derivation as the fallback.
5. **Delegate → agent:** mutation `delegateGoalItemToAgent(id, agentId)`. It fires the agent's start event with `goal_id`.
6. **Automate → routine:** mutation `automateGoalItem(id, taskRef, rule)`. It creates a recurring step on the routine item (`steps`).
7. **Group invites:** `pendingInvites: [ { email, createdAt } ]` on the group. Mutations `cancelInvite(email)` and `declineInvite`; `acceptInvite` already exists.
8. **Routine context brief:** query `routineContext(taskRef)` returning, for each `area:`/`project:` tag: `{ tag, description, nextSteps[], recentActivity[] }`. Reuse the AreasTime/ProjectsTime resolvers and `NextStepsContainer` data.
9. **Agent:** existing fields cover the page. Add mutation `testAgent(id)`, a dry run that fires start/end with a test `goal_id`.
10. **Past-day rule (server-side guard):** reject `addGoalItem` for `period:'day'` with `date < today` (in user timezone), and reject `tickRoutine` for past dates. Edits and deletes stay allowed.
11. **Start rule:** `startRoutine`/tick requires ≥1 open goal item under the routine for today (or a body passed to create one). ~~Remove `allow-start-without-task`.~~ **Kept on Home** — the sheet is the only start path there, so an empty-input refusal makes a routine with no checklist unstartable. The prop stays, defaulting to off for every other mount.

## State notes (client)
- Per-routine chat threads keyed by `taskRef` (today) and `taskRef@date` (past days).
- `briefClosed[taskRef]`.
- Selected period / day index drives sliding indicators.
- Long-press timer: 520ms; set a `longPressFired` flag to swallow the click.
- Modals vs sheets: breakpoint 600px (sheet below, centred modal above).

## Assets
- `assets/icon-192.png`, `assets/logo.png`: app logo.
- `assets/avatar.svg`: a neutral illustrated placeholder avatar; use `user.picture`. It replaced a remote photo of a real person — fine in a mock, not shippable in a store screenshot.

## Files (`packages/design/`)
`Routine Notes Final.dc.html`, `Priority.dc.html`, `Agents.dc.html`, `Goals.dc.html`, `Year Goals.dc.html`, `Routines.dc.html`, `Progress.dc.html`, `Groups.dc.html`, `Profile and About.dc.html`, `README.md`, plus the runtime (`support.js`, `android-frame.jsx`, `browser-window.jsx`).
Placeholder values to replace: point rates (3 h / 1 h / 25%), the About version label, and all sample data in each file's logic class.
