# Redesign — what shipped, what is missing, what changed

Implementation of `packages/design/*.dc.html`. The shared contract is in
[chassis.md](./chassis.md); that file is binding where a mock disagrees with it.

## Screens

| Screen | File | Notes |
|---|---|---|
| Home | `pages/RoutineFocus.vue` | already existed; this round added the goal-item page, Inbox, Skip-day long-press and the Start Work -> Build Agent chain |
| Priority | `pages/PriorityTime.vue` | 2x2 map is navigation on phone only; all four quadrants render at once on tablet/desktop |
| Agents | `pages/AgentsBoard.vue` (via `views/Agents.vue`) | rewrite of the existing data-table page; list+detail 2:3 on tablet/desktop, list pane `position: sticky` |
| Goals | `pages/GoalsTime.vue` | cascade ladder is the navigation; left pane `position: sticky` on tablet/desktop; add row + New goal disabled once the period shown has ended (`goalCascade.periodIsOver`) |
| Year Goals | `pages/YearGoalsTime.vue` | reuses Home's chat thread, one thread per goal; every level adds and edits in the shared goal-item sheet; a past month takes no new goals and its goals open view-only |
| Routines | `pages/SettingsTime.vue` | 24h dial + editable timeline; delete moved into the editor; left pane `position: sticky` on tablet/desktop |
| Progress | `pages/ProgressTime.vue` | efficiency hero + sparkline + D/K/G trio; "On the clock" card (`TimingReportCard`, `routineTiming` query), full-width row on tablet/desktop |
| Groups | `pages/FamilyRoutine.vue` | group pulse, member week grid; `confirm()` replaced by a sheet |
| Profile / About | `pages/ProfileTime.vue`, `pages/AboutTime.vue` | lock icons replace the read-only banner; About trimmed per the design |

All nine render outside `MobileLayout`/`DesktopLayout` via `meta: { appShell: true }`
(Home keeps its original `meta.focusHome`; `App.vue` accepts either). The legacy
layouts still serve every route that was not redesigned.

## Shared chassis

`organisms/AppShell` (three shells, primary + More nav, drawer), `constants/navigation.js`,
`molecules/AppToast`, and six primitives: `ResponsiveSheet`, `SlidingSwitch`,
`ProgressRing`, `DkgRingTrio`, `MiniSparkline`, `StatusRing`. Tag parsing is one
module, `utils/tags.js`, with `HierarchicalTagInput` over it — `GoalTagsInput` is
now a thin adapter, so the repo has one tag editor instead of the four ad-hoc
splitters it started with.

## Areas and projects moved into chat

The Areas and Projects pages are retired: routes removed, sidebars removed from
both layouts. Their content is now the **"Before you start"** card pinned at the
top of each routine's thread (`organisms/RoutineBriefCard`), plus two quick
replies, fed by the `DASHBOARD_CACHE:<tag>` entries `useDashboardCaching`
already maintained.

Coverage matches the retired pages — **any** `area:`/`project:` tag, not only
the AI-Search opt-in. Two paths fill the one store: the daily sweep
(`dashboardContextMixin`, opted-in routines) and `ensureTagContext`, which
`RoutineChatContainer` calls when a routine becomes the focused one and a tag of
its has no fresh entry. The lazy path runs once per tag per session, shares the
sweep's in-flight registry, and spends nothing on tags nobody opens. While a run
is out its block renders its kind label and breadcrumb — derivable from the tag
with no model call — and the body fills in; a run that resolves to nothing, or
fails, leaves no block and no error bubble.

Description and next-steps length is enforced in code, not just prompted:
`normaliseDescription` / `normaliseNextSteps` in `apps/server/src/utils/aiApi.js`,
mirrored client-side in `utils/routineBrief.js` because a cached entry can
predate the server guard by up to the 24h TTL.

**Deleted:** `pages/AreasTime.vue`, `pages/ProjectsTime.vue`, `views/Areas.vue`,
`views/Projects.vue`, `molecules/AreaSidebar/`, `molecules/ProjectSidebar/`, and
the two sidebar barrel exports. The sidebars had to go with the routes — they
linked to `name: 'areas'` / `name: 'projects'`, which no longer resolve.

`SummaryCardsContainer` / `NextStepsContainer` and the `SummaryCards` /
`NextSteps` organisms are now unused but still present. They are the existing UI
for "description + next steps" and are harmless where they sit; remove them if
nothing adopts them.

## Server work the UI is waiting on

Each of these is built honestly in the UI — an empty state, a disabled control
with a reason, or a narrower scope — never a fake.

| # | Needed | Unblocks |
|---|---|---|
| 1 | `recurrence` field on `RoutineItem` | Priority's Automate rule ("every Friday"); the chip states the real cadence instead |
| 2 | `triggerAgentRun(id: ID!): Agent` | the Agents page's "Run test"; currently disabled with an on-screen reason |
| 3 | sparkline series + previous-period efficiency in `getProgressReport` | Progress' trend chart, delta label and reference line |
| 4 | routine `time`, weekly hit pattern, attention `why` on the rankings | Progress' 7-pip row and "what slipped" copy |
| 5 | completion timestamp on `RoutineItem` | Groups' "finished N min ago" and the pulse's last-hour count (measured from *due* time today) |
| 6 | a query listing invites **you** sent | Groups' pending rows (client-held in localStorage today) |
| 7 | stored per-member streak | Groups (derived from 7 days against the 3-tick bar today) |
| 8 | `groupWeek(groupId)` | collapses one `routinesByGroupEmail` per member into one round trip |
| 9 | goal context on chat: `kind` / `goalPeriod` / `threshold` on `ChatContextInput`, and a prompt override | the Year Goals thread answers in a routine's voice today, because `chatApi.js`'s `SYSTEM_PROMPT` is a module constant |
| 10 | `time` on `RoutineItemRef` | Year Goals' "By routine time" sort and NOW/LATER/EARLIER grouping |
| 11 | `progress` / `milestonesComplete` readable without `autoCheckTaskPeriod` | the ladder and week counts, which are client-derived to avoid a read that writes |
| 12 | the OAuth client secret exposed through a GraphQL field | Connect AI — the displayed `frt_secret_...` is a placeholder that can never match |
| 13 | a real production `mcpServerUrl` | it is still `https://your-api-domain.com/dev/mcp` |
| 14 | `reason` on `skipRoutine` / `skipReason` on `Routine` | the skip sheet's reason, recorded as a chat event today |
| 15 | `inboxGoalItems`, or a `hasTaskRef: Boolean` filter | a cross-date Inbox; it is scoped to the selected day because no query filters "taskRef unset" |

~~16. widen area/project context beyond the AI-Search opt-in~~ — **closed client-side.**
It needed no server change after all: `ensureTagContext` in
`composables/useDashboardCaching.js` builds a tag's context the first time the
user focuses a routine carrying it, into the same store with the same 24h TTL.
That covers every tagged routine at a fraction of the cost of the alternative
(one model call per tagged routine per day, opened or not).

## Bugs found and fixed along the way

- **`updateSubTaskItem` renamed the wrong row.** Registered but uncalled, it `$set`
  a hardcoded `subTasks.0.body` and returned `null`. Fixed to target the right
  element; `reorderSubTaskItems` added (order has no field of its own, so a move
  returns the parent). `mcpSchema.js` updated to match.
- **Routines settings could overwrite a tick made on Home.** The old page selected
  `ticked`/`passed` on `routineItems`; every day's copy in `routine.tasklist`
  keeps the template `_id`, so they share one `RoutineItem:<id>`. The read and all
  three mutations now carry template fields only.
- **`efficiencyFormula` read "across this day's days"** on the Day period. It now
  takes the unit word.
- **`getBestRoutineSorted` double-slices**, so with <= 4 routines the same routine
  appeared in both Great going and Needs attention. Worked around client-side.
- **`GOALS_OPTIMIZED_QUERY` was dead and selected `progress`**, which its resolver
  never fills, on an entity that normalizes to the same `GoalItem:<id>`. Removed.
- **The old `AgentEditModal` offered routines that already had an agent**, which the
  unique index refuses. Home now mounts the Agents page's `AgentFormContainer`.
- **Copy-to-clipboard reported success regardless.** `copyText` returns a real
  boolean and the tick and toast follow it.

## Deliberate departures

- **No capture sheet.** It duplicates the global `AiSearchModal` — same Task/Goal
  modes, same input, same pickers — and `routine-focus-home.md` already records the
  decision not to rework that organism. Home keeps opening it via `OPEN_AI_SEARCH`;
  a test pins "no second capture path". The one genuinely missing piece, client-side
  `every…`/date/time/`p1`/`#tag` chips, belongs inside `AiSearchInput`.
- **Log out appears on all three shells.** The designs put it only in the phone
  drawer; a desktop user with no way to sign out is a bug.
- **`UserDrawer` moved from left to right**, matching every design file. This is a
  visible change to the already-live Home screen.
- **Progress' "Needs attention" rows deep-link the specific routine.** The mock links
  the generic Routines page despite carrying the id.
- **Groups' join-request Accept calls `acceptInvite`.** The mock only dismissed the
  card and toasted.
- The mocks' paired keyframes (`rn-in0`/`rn-in1`, `rn-c0`/`rn-c1`) and their
  `k`/`ck`/`lk` counters exist only to restart a CSS animation; Vue uses a `:key`
  bump instead. `rn-breathe` was NOT redefined as the Agents mock's box-shadow
  pulse — `RoutineFocusCard` and `RoutineTopBar` already ship against the existing
  scale+fade definition.

## Behaviour changes — resolved

The governing instruction: *"our change is majorly design change not logical."*
Where the redesign dropped behaviour, the behaviour came back.

1. ~~**Daily points are now unbounded.**~~ **Restored.** `remainingPoints()` /
   `maxPointsFor()` in `utils/dayDial.js` reinstate the 100-per-day budget with the
   original arithmetic, including adding back the edited routine's own points so it
   never counts against its own ceiling. The design's per-routine 1-50 clamp stays,
   so the effective ceiling is `min(POINTS_MAX, remaining)`. The figure rides in the
   POINTS caption (`Earned when ticked · 8 left today`) and stays plain while the
   ceiling is >= 50. An exhausted day gets its own copy, because the original's
   "Points must be 0 or fewer" names no value a user can pick.
2. ~~**`/goals` lost capabilities the design does not draw.**~~ **Restored** by
   mounting the dashboard's own `GoalCreationContainer` unchanged inside the chassis
   `ResponsiveSheet` — one editor, one mutation path, DashBoard parity asserted by
   test. Month prev/next and the `MeasurementMixin` events are back under their old
   names. **`goalsPast` deliberately not restored:** `goalsOptimized`'s day branch is
   `{ period:'day', date: { $in: datesInMonth } }`, so past days already come back
   with the month, and `goalsPast` would be a second cache owner of the same
   `GoalItem` records. Reasoned in `goalsQueries.js` and pinned by a test.
3. ~~**Area/project context is narrower than the pages it replaces**~~ — resolved;
   see #16 above. The one judgement left in it: a lazily built tag is attempted
   **once per session**, so a tag whose single attempt hit a dead network stays
   blank until a reload. The alternative — retry on every focus change — spends
   a model call per retry on a user who is offline.
4. ~~**The check circle stopped asking, and the locked-in goal item disappeared.**~~
   **Restored.** `DashBoard.checkDialogClick` opened a modal on EVERY startable
   routine, and branched: a routine that already had a day goal item got a
   goal-action modal naming that item above Start Task / Start Agent / Build Agent,
   while an empty one got the create form. The redesign kept only the create form,
   and only for `isCurrent || redeemable` — so a routine that was startable but not
   the clock's current one ticked straight through, banking the points with no
   option to start its agent and nothing on screen saying which item had just been
   completed. `onRingAction` now opens the sheet for any routine whose ring is
   enabled, and `QuickGoalCreation` gained a `lockedItem` block — the routine's
   first day goal item, which is the one `{goalId}` resolves to, labelled
   `LOCKED IN · AGENT TARGET` when an agent is bound. One sheet does both jobs
   rather than the dashboard's two dialogs. Two fixes came with it: the redeem
   affordability pre-flight runs **before** the sheet again (the dashboard's
   documented reason — Start Task persists the goal item and only then redeems, so a
   failed redeem strands an orphan item on an unticked routine), and Start Task
   redeems a passed routine instead of silently doing nothing, which is what
   `tickRoutine`'s `passed` guard made it do while Start Agent beside it worked.
5. **About's copy is the design's trimmed version**, not `AboutTime.vue`'s longer
   text, despite the design README claiming the copy is "kept as written". It drops
   the soldier-metaphor restatements and Priority's fifth point.
