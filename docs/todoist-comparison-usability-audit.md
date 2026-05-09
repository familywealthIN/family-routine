# Todoist vs Routine Notes — Usability & Performance Audit

**Date:** 2026-05-02
**Method:** Live side-by-side test in a real Chrome session driven via Chrome DevTools MCP. Six scenarios derived from the daily-logging Todoist user persona. Each scenario was performed first on Todoist (production: `app.todoist.com`) to set the baseline, then on Routine Notes (`localhost:8080`).
**Persona:** A Todoist user who logs daily activity — types tasks fast, expects natural language parsing, expects recurring "every weekday at 7pm", glances at Today view, marks tasks done, and now considers switching to Routine Notes.

---

## Test scenarios

| # | Scenario | What it measures |
|---|---|---|
| 1 | Quick capture: *"Call dentist tomorrow at 10am p1"* | Clicks + time + natural-language parsing |
| 2 | Recurring routine: *"Workout every weekday at 7pm"* | Repeat-pattern flexibility, time-of-day handling |
| 3 | Today-glance review | Glanceability, info density, "what's next" clarity |
| 4 | Mark complete + reward | Visual feedback, score/karma update |
| 5 | AI: *"Help me build a morning routine for discipline"* | Whether AI is the killer differentiator |
| 6 | Performance baseline | Load time, TTI, network/console hygiene |

---

## Scenario 1 — Quick Capture

| Dimension | Todoist | Routine Notes |
|---|---|---|
| Discoverable "Add task" CTA | "Add task" button + sidebar shortcut + `Q` key | Unlabeled FAB; no keyboard shortcut visible |
| Composer placement | Inline at bottom of Today | Modal with backdrop, blocks page |
| Natural-language parsing | "tomorrow at 10am" → date+time pill; "p1" → priority pill, **as you type** | Stored verbatim as task title |
| Date inference | Saved to **May 3**, 10 AM | Saved to **May 2 (today)** |
| Priority inference | p1 set | Just text in title |
| Default container | Inbox (dump-first) | Forced into **Start Work** routine |
| After submit | Form persists with rotating example placeholder for next capture | Modal closes; capture friction restarts each time |
| User actions for 1 dated/prioritized task | **1** (type + Enter) | **5+** clicks; priority field doesn't even appear in this composer |

### The killer flaw — title pollution

The task is now **literally named "Call dentist tomorrow at 10am p1"** forever. A daily Todoist user dumps 10–30 tasks/day this way; in Routine Notes they'd accumulate 30 garbage titles a day.

### Recommended fixes

1. **Inline natural-language parser.** Catch `tomorrow`, `next Mon`, `at 10am`, `every weekday`, `p1`–`p4` as you type — strip them from the title and apply them as fields. `chrono-node` + a priority regex covers 80% of cases.
2. **Drop the modal for quick capture.** Inline composer at top of Today (or replace the FAB with an always-visible input bar).
3. **Allow "Inbox / no routine" as default.** Forcing every task to attach to a routine on creation is correct for *routines*, but a Todoist user wants to dump first and triage later.
4. **Auto-detect intent: Task vs Routine.** If the parser sees "every X", treat as Routine; otherwise Task. The Task/Goal toggle adds friction the user doesn't want.
5. **Hide "# time / work" tags + "No Goal Ta..." truncation** until the parser has something meaningful to put there. Empty pre-filled metadata creates anxiety.

---

## Scenario 2 — Recurring Routine

| Dimension | Todoist | Routine Notes |
|---|---|---|
| Composer supports recurring | inline NL: "every weekday at 7pm" → recurring rule + 7 PM time, no extra clicks | no recurring field exists in the composer |
| Title cleanup | saved as just "Workout" | would store the full string verbatim |
| Time-of-day inference | 7 PM | no time field for tasks |
| Smart "next occurrence" | Saturday today → first run Mon May 4 (skipped weekend) | N/A — can't create the routine via this UI |
| Where to create a recurring routine | Same composer as one-off | **Couldn't find it** — explored FAB composer (Task & Goal modes), settings icon, "Goals" nav (not expandable as static text). No discoverable path from Home. |
| Composer modality | Inline | Modal that I had to fight to close |

### The deepest finding

The "+task" composer in Routine Notes is **not a task composer — it's a sub-task composer that forces attachment to an existing routine**. The "Routine Task" dropdown auto-fills with "Start Work" (the only existing routine that fits the current time) and there's no way to opt out. So a Todoist user who tries to add a recurring "Workout" via the obvious "+" button ends up adding a one-off sub-task under "Start Work" instead.

This is **not a parsing bug — it's an information-architecture mismatch**. Two different concepts (routine creation vs. sub-task creation) share the same entry point, and the dominant one is the wrong one for new users.

### Recommended fixes

1. **Mode-explicit composer.** The Task/Goal toggle should be Task / Routine / Goal — three modes, not two. Routine mode = create a recurring time-blocked container. Task mode = one-off (with optional routine attachment). Goal mode = outcome.
2. **Recurring rule field with NL parser.** "every weekday", "Mon Wed Fri", "weekly", "daily" — same chrono-node-style parser as Todoist's.
3. **Make routine creation discoverable from Home.** A "+ New Routine" affordance directly on the Home screen, *not* hidden behind sidebar nav.
4. **Don't auto-attach to a default routine.** Force a deliberate choice (or default to "no routine"), otherwise tasks silently land under the wrong parent.
5. **Strip parsed tokens from the title.**

---

## Scenario 3 — Today-Glance Review

| Glanceability question | Todoist (2-sec answer) | Routine Notes (2-sec answer) |
|---|---|---|
| How many tasks today? | **2** (in heading) | Unclear — 1 routine card visible, 2 in Upcoming, no consolidated count |
| What's next? | Top of the list | "Start Work 09:00" shown but no "now" indicator |
| Untimed task quick capture | "+ Add task" inline at bottom of list | FAB in corner — disconnected from list context |
| Sidebar count | "Today: 2" — accurate | "Tasks in Time: 0 / Tasks out of Time: 0" — both 0 despite 1 task added; what counts? |
| Score/karma feedback | Hidden until you open it (intentional) | 3 rings (D, K, G) on right column — **but unlabeled, no legend** |

### Six concrete glanceability flaws

1. **No flat "today list."** Home shows **one routine card at a time** (Start Work). To see Workout's tasks I have to click in. Todoist shows all of today's tasks in one scroll.
2. **KDG rings are invisible as a feature.** Three small unlabeled letter-rings in a side column. The thing that's *supposed to be the entire moat* is a sidebar afterthought.
3. **Punitive empty state.** Red ❌ pills on "Set Month's Goal" / "Set Week's Goal" read as failure/error.
4. **"5/5" indicator on Start Work — meaning unknown.** Streak? Sub-tasks done? Days completed? Mystery numbers erode trust.
5. **No "now" cursor.** The day-strip and routine list don't indicate where in the day you are. Workout is at 18:00 — 30 min away or 6 hours?
6. **"Tasks in Time / out of Time" both show 0** despite the dentist task I added. Either the metric is only counting time-bound completions (label it differently), or the sub-task isn't being counted at all (bug).

### What's already good

- The week-strip with progress rings on each day is a *better* glance than Todoist's calendar nav.
- The Today/Week/Month/Year tabs on the routine card are a goal-cascade feature Todoist literally cannot offer.
- Skip Day toggle is novel — handles "I'm sick today" gracefully.

---

## Scenario 4 — Complete + Reward

| Dimension | Todoist | Routine Notes |
|---|---|---|
| Visual feedback on tap | Task vanishes, count decrements (heading + sidebar) | Strikethrough + checkbox stays checked, sidebar metric `0→1`, **no other change** |
| Karma/score in-line feedback | Silent (intentional — Karma hidden in Reporting) | Silent — but the visible KDG rings on Home **did not move**, even though they're presented as the score |
| Where the score lives | Reporting page (separate destination) | KDG rings on Home (right column) + Radar chart on Progress page |
| Score moved by my action? | (Karma yes — but invisible) | **No** — K stayed 12%, G stayed 12%, D stayed 0% after marking complete |
| Discoverability of "what does this score mean?" | Karma onboarding tour | **Zero** — D/K/G rings have no aria-label, no tooltip, no title attribute |

### Three serious findings

1. **The KDG rings are decorative on Home.** The DOM exposes them as `v-progress-circular` with `role="progressbar"` but **no aria-label, no name, no tooltip, no click handler.** A user cannot learn what D/K/G mean by hovering, clicking, or tabbing. They're billboard-only.

2. **Marking a task complete doesn't move the score.** The dentist task was completed. K and G remained at 12%. Sub-tasks of routines without dimension classification contribute nothing to KDG. A daily-logger Todoist user who dumps 30 tasks/day would see *zero* score movement and conclude the whole framework is broken — even though it's actually waiting for a categorized routine completion.

3. **Progress page IS rich, but it's hidden.** The radar chart, "Great Going / Needs Attention" tables, and Tasks Completed widget on `/progress` are exactly what Todoist users would expect from the karma equivalent. **Nothing on Home tells you these exist or links you to them.**

### Recommended fixes (ranked by leverage)

1. **Make D/K/G rings on Home labeled, clickable, and link to their detail pages.** Add `Discipline 0%`, `Kinetics 12%`, `Geniuses 12%` labels under the letters. Hovering should show today's delta; clicking should go to the dimension's full breakdown.
2. **Every task contributes to a dimension by default.** Either inherit the dimension of its parent routine (so any sub-task under "Workout" → +Kinetics), or auto-classify via AI when the task is created, or default new uncategorized tasks to "+Discipline" (since adherence is universal).
3. **Show today's score delta on the home screen.** A small banner at top: `Today: +0 D · +12 K · +12 G`. The Strava/Whoop pattern.
4. **Celebrate the FIRST completion of the day** with a small toast: "+5 Kinetics — first workout this week." Repeat completions stay silent.
5. **Move the "Great Going / Needs Attention" widget to Home.** Hiding it on Progress is hiding the killer feature.
6. **Offer a "hide completed" toggle.** Strikethrough is fine but a long-running list will get crowded.

---

## Scenario 5 — AI Routine Generation

**The wedge is unbuilt.**

The bar prominently labeled **"Build your routine goals with AI"** does not call AI. Confirmed by inspecting the network call: clicking submit fires a GraphQL mutation called `addMottoItem` that stores the string verbatim in a "MottoItem" table. No model invocation, no decomposition, no time-block generation.

| Test | Expected (per marketing) | Actual |
|---|---|---|
| Bar label promises | AI builds routines from natural-language goals | Stores text as a "MottoItem" / pending inbox |
| GraphQL operation | A model call returning structured routines | `addMottoItem(mottoItem: String!)` — opaque pass-through |
| Result on page | Generated routine "Wake 6am, Meditate 6:15am, Cold shower 6:45am…" auto-scheduled | Single pending item with the user's whole prompt as title |
| To turn pending → real | Should be optional refinement | Required: open arrow → modal → re-type "Type your task" → fill date/routine/tag/markdown editor → SAVE |

### Why this is the most serious finding

A daily-logging Todoist user will try this once. The bar is the highest-real-estate element on the home screen. They will type a real prompt — *"plan a healthy lunch routine,"* *"build study sessions for my Spanish exam in June,"* *"7-minute morning workout three days a week"* — and get back **a single un-decomposed pending item** with their prompt as its title.

That's worse than not having an AI feature at all. It's a credibility hit.

### Recommended fixes

1. **Either ship the AI or remove the label.** Right now the label is cashing a check the product can't pay. Renaming the bar to *"Quick capture"* or *"Inbox"* is a 5-minute fix that buys back trust.
2. **Then ship the AI.** A minimum viable version: GPT-4 / Claude with a system prompt — "Decompose this user goal into 3–5 time-blocked daily routines, each tagged Discipline/Kinetics/Geniuses." Returns a JSON array. UI shows the proposed routines as draft cards the user can accept/edit/discard.
3. **Make the 2-step capture flow shorter.** Even setting AI aside, "dump in pending → click arrow → re-type in modal → fill 6 fields → save" is 6× the friction of Todoist's "type + Enter."

### What's actually salvageable

The **two-step capture** (dump fast, triage later) is conceptually right for a Todoist user who's also a "routine person" — exactly the GTD inbox pattern. The execution is broken, not the concept.

---

## Scenario 6 — Performance

| Metric | Routine Notes (localhost dev) | Todoist (production) |
|---|---|---|
| LCP (lab) | **1,749 ms** | 2,227 ms |
| TTFB | 306 ms | 27 ms |
| Render delay | **1,442 ms (82% of LCP)** | 2,200 ms |
| Render-blocking opportunity | 1,081 ms | — |
| CLS | 0.00 | 0.00 |
| LCP (real users / CrUX) | n/a (not enough traffic) | 4,333 ms (p75) |

**Caveat:** Localhost vs production is apples vs oranges. Routine Notes wins the lab number only because there's no network latency. Behind a CDN with HTTPS handshake, real-network LCP will plausibly be **3–5 seconds**.

### Real findings

1. **Render delay is 82% of Routine Notes LCP**, even on localhost. Indicates a heavy initial JS payload + slow first paint after the bundle parses.
2. **Render-blocking requests cost 1,081 ms.** Easy wins: defer non-critical scripts, inline critical CSS, preload key fonts.
3. **Console errors that ship to production:**
   - **CSP blocks Font Awesome from `maxcdn.bootstrapcdn.com`** (woff2/woff/ttf all blocked). The CSP `font-src` doesn't include the CDN that the app references. Either icons fall back to text/glyph boxes, or you've already moved to MDI and these references are dead code.
   - **Vuetify `@input` deprecated; should be `@change`** — `<VTabs>` in `OrganismGoalCreation` and `PendingList` are the two callsites flagged.
4. **Bundle splits** look reasonable — separate chunks for `home`, `goals`, `agendaTree`, vendors. But the dev build ships full source maps + HMR runtime; production bundle should be smaller. Worth measuring the production build size.

### Performance fixes ranked by leverage

1. **Defer or async non-critical scripts** — that 1,081 ms render-block is the biggest single win. Audit script tags in `index.html`.
2. **Preload the critical font + LCP image** — `<link rel="preload">` to start the font/image fetch in parallel with the JS parse.
3. **Code-split the markdown editor** — it's loaded for the task-promotion modal which most users never open. Lazy-load on first open.
4. **Replace Font Awesome dependency** if MDI suffices — drops one CSP exception and one external font roundtrip.
5. **Run a real production build trace** (`vue-cli-service build` + `serve`) and re-measure.

---

## Final synthesis: where Routine Notes loses the Todoist user

Ordered by severity for a daily-logging Todoist user:

### Severity 1 — Trust violations (fix immediately)

1. **The "AI" bar isn't AI.** It calls `addMottoItem`, a string-passthrough mutation. Either ship the AI feature or rename the bar.
2. **The KDG framework is invisible.** D/K/G rings have zero labels, zero tooltips, zero click handlers. The thing that's *supposed to be the entire moat* is a decorative sidebar element.

### Severity 2 — Capture friction (the daily-logger's #1 pain)

3. **No natural-language parser.** Every dated/prioritized task on Todoist is one type-and-Enter; on Routine Notes it's 5+ clicks through a modal with no NL recognition. This alone will lose 80% of switchers.
4. **No recurring rule field exists in the composer.** Recurring routines must be created via a separate UI that I couldn't even find from the home screen.
5. **Two-step capture-then-promote loop is too long.** Promoting a pending item forces re-typing the title and filling 6 fields in a markdown-editor modal.

### Severity 3 — Reward / feedback loop broken

6. **Completing a task doesn't move the score.** Sub-tasks of routines without dimension classification contribute nothing to KDG.
7. **Punitive empty states.** Red ❌ pills on "Set Month's Goal / Set Week's Goal" feel like errors.
8. **Mystery numbers.** "5/5" on routine cards, "Tasks in Time / out of Time" — neither labeled clearly.

### Severity 4 — Performance / hygiene

9. **Render-blocking ~1s + heavy first paint.** Behind a real CDN this will hurt.
10. **CSP blocks Font Awesome fonts in production.** Likely visible icon glitches.

### What's worth keeping (do not regress)

- **Two-step capture pattern (dump + promote)** is conceptually right.
- **Goal cascade tabs (Today/Week/Month/Year)** — Todoist literally cannot do this.
- **Skip Day toggle** — novel, handles "I'm sick" gracefully.
- **Progress page radar chart + Great Going / Needs Attention** — the right shape for KDG visualization, just hidden too deep.
- **Week-strip with progress rings on each day** — better than Todoist's calendar nav.

### Suggested ship order

| Sprint | Ship |
|---|---|
| **1 (week 1)** | Rename "Build your routine goals with AI" → "Quick capture." Add NL parser to title field (chrono-node + p1-p4 regex). Label D/K/G rings on Home with full names + tooltips. |
| **2 (week 2)** | Add recurring-rule field to composer. Add "no routine / Inbox" default. Strip parsed tokens from titles. |
| **3 (week 3)** | Move Progress widgets (radar, Great Going / Needs Attention) onto Home. Add today's score deltas as a banner. Auto-attribute task completions to the parent routine's KDG dimension. |
| **4 (week 4)** | Real AI: a Claude/GPT call on the Quick Capture bar that decomposes goals into draft routines. *Then* relabel the bar back to "AI." |
| **Ongoing** | Defer render-blocking, fix CSP, code-split markdown editor. |

After sprint 1 alone, a Todoist user trying Routine Notes for the first time has a coherent, honest, parseable capture flow with a legible scoring framework. That's the floor for keeping them. Everything after is what gets them to *prefer* it.
