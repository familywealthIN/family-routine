# Routine Focus — the new Home screen

Implementation notes for `apps/web-app/design_handoff_routine_focus`. The handoff
is the design spec; this is what was built, where it lives, and where it
deliberately departs from the spec.

## What it is

`/home` is now one idea: **concentrate on the current routine**. The eye lands on
the focused routine's checklist; below it the routine has a **chat thread** you
talk to, which replies with tappable checkboxes and logs the day's events as
pills. D/K/G moved out of the home screen into the user drawer. The existing
**agent lifecycle** (start event → running → listening → end event → result) and
the **goal cascade** (day → week → month → year) are unchanged — they are
re-presented, not re-designed.

Three shells, one page:

| Shell | Breakpoint | Layout |
|---|---|---|
| phone | `xs` (< 600) | top bar · collapsible week strip · card deck · focus card (checklist + chat) · composer · bottom nav |
| tablet | 600–1263 (iPad mini landscape is 1133) | 76px nav rail · header + day chips · focus card ∥ 400px chat pane |
| desktop | ≥ 1264 | 264px sidebar with today's routine rail · header · focus card ∥ 420px chat pane |

`/home` is the only home screen. The previous dashboard — `pages/DashBoard.vue`
behind `views/Home.vue` on `/home/classic` — was **removed on 4 Oct 2026**.

Skip Day moved onto this screen with it (`SkipDayContainer`, which the sheet
also uses for "Undo skip"), so nothing was lost there. Three things the old
dashboard carried did go, deliberately: the upcoming/past task lists, the
related-tasks timeline and the Week Goal Streak card. The other-dates agenda
had already been unreachable — `/agenda` was commented out of the router long
before this.

Removing it also retired `MissedDayRecoveryContainer` and the
`MissedDayRecovery` organism, `RelatedTasksTimelineContainer`, the
`TaskActionButtons` molecule and `utils/missedDay.js`. Four containers were
already orphaned before the removal and are untouched by it:
`AgendaTaskListContainer`, `UpcomingPastTasksContainer`, `CurrentTaskContainer`
and `WeekGoalStreakContainer` — nothing imports them.

## Where the code is

| Piece | File |
|---|---|
| The screen (data, mutations, three shells) | `apps/web-app/src/pages/RoutineFocus.vue` |
| Route target (rendered outside the layouts) | `apps/web-app/src/views/RoutineFocusHome.vue` |
| Pure derivations — current routine, window, button states, cascade | `apps/web-app/src/utils/routineFocusModel.js` |
| Chat data layer + intent handling | `apps/web-app/src/containers/RoutineChatContainer.vue` |
| Chat GraphQL operations | `apps/web-app/src/composables/graphql/chatQueries.js` |
| `passed` / `wait` sweep | `apps/web-app/src/mixins/routinePassWaitMixin.js` |
| Sign out (shared with MobileLayout) | `apps/web-app/src/utils/signOut.js` |
| Focus card, cascade panel, chat thread, composer, deck, sheet, top bar, drawer | `packages/ui/organisms/Routine*`, `packages/ui/organisms/UserDrawer` |
| Routine rail / day chips, points chip | `packages/ui/molecules/RoutineRail`, `packages/ui/molecules/FocusPointsChip` |
| Design tokens (colours, agent stages, per-shell geometry) | `packages/ui/constants/routineFocus.js` |
| Motion keyframes (`rn-fly`, `rn-breathe`, `rn-pop`, …) | `packages/ui/styles/routine-focus.css` |
| Chat model calls (free OpenRouter tier) | `apps/server/src/utils/chatApi.js` |
| Chat persistence + resolvers | `apps/server/src/schema/RoutineChatSchema.js`, `apps/server/src/resolvers/routineChat.js` |

The page renders **outside** `MobileLayout` / `DesktopLayout`: the route carries
`meta.focusHome`, and `App.vue` branches on it. The focus screen brings its own
top bar, nav and drawer, which is the whole point of the redesign — wrapping it
in the old toolbar + bottom-nav frame would give it two of each.

## Routine chat

The thread is per routine, per day (`RoutineChatMessage`: `email`, `date`,
`taskRef`). Message bodies are encrypted at rest (`ENCRYPTION_FIELDS.routineChat`),
the same content class as goal items.

### Free models only

`sendRoutineChat` answers through **OpenRouter's free tier and nothing else**.
`aiApi.js` (milestone planning, task extraction) still prefers Gemini and falls
back to a paid OpenRouter model; chat is a separate module precisely because it
is high-volume, interactive and must never spend credits.

- The roster is **discovered at runtime** from `https://openrouter.ai/api/v1/models`,
  filtered to `:free`, and cached for 30 minutes per warm container. This is not
  optional polish: the free catalogue churns constantly, and the first cut of
  this shipped a hardcoded roster of ids that had *all* been retired — every
  call 404'd. `FALLBACK_FREE_MODELS` only covers the case where discovery itself
  is unreachable.
- Models are ranked by `modelRank()`: `structured_outputs` > `response_format` >
  `reasoning`, context length only as a tie-break. Context length is the wrong
  signal here — a turn is a short routine snapshot, not a long document, and what
  decides whether a reply is usable is whether the model can be held to the JSON
  contract.
- Requests send `reasoning: { enabled: false, exclude: true }`. Nearly every free
  model today is a reasoning model; left on, the chain of thought eats the token
  budget and the answer is truncated before the closing brace.
- `usableProse()` is the last line of defence: if JSON parsing fails, the raw
  text is only shown when it reads like a reply. Leaked chain-of-thought and
  truncated monologues are replaced with a short fallback, because pasting a
  model's thinking into a chat bubble is worse than saying nothing.
- `OPENROUTER_FREE_MODELS` (comma-separated) overrides discovery outright, for
  pinning a roster without a deploy.
- Every id must end in `:free`. Ids without the suffix are **dropped at
  runtime** — a paid id slipping into the env override would silently start
  charging.
- `MAX_ATTEMPTS` (5) bounds one turn's failover chain so an exhausted catalogue
  cannot hang the request.
- Needs `OPENROUTER_API_KEY`. With the key absent, or every model exhausted, the
  turn degrades to a saved user message plus "I can't reach the chat model right
  now" — the dashboard around it keeps working.

### Intents

The model is asked for a JSON object, and the client acts on the intent:

| Intent | What the client does |
|---|---|
| `add_tasks` | creates day goal items under the focused routine, then attaches their ids to the reply bubble so it renders live checkboxes |
| `break_down` | nothing — the three steps are **proposals**, created only when the user presses "Add all to checklist" |
| `complete_task` | completes the named item through the same mutation a checkbox tap uses |
| `status` | nothing; the reply quotes the D/K/G percentages it was given |
| `chat` | nothing |

Guards worth knowing:

- A `completeItemId` is honoured only if it is an **open item on this routine** —
  both server-side (`chatApi.js`) and again client-side. A hallucinated id would
  otherwise report "marked done" having completed nothing.
- An item the chat creates inherits the routine's existing `goalRef`, so it rolls
  up into the same week goal as one created through AI Search.
- A free model that ignores JSON mode keeps its prose as a plain `chat` reply
  rather than losing the turn.

System events (`kind: 'event'`) are written by the client the moment the
underlying mutation succeeds — routine ticked, item checked, agent started, end
event firing — so the thread is a record of the day, not a reconstruction.

## Deliberate departures from the handoff

1. **The ticked ring does not undo the tick.** The handoff says "tap again to
   undo". `tickRoutineItem` refuses to act on an already-ticked task, and the XP
   ledger settles a day's stimuli once (`utils/xpLedger.js`) — reverting a tick
   would credit points the server has banked. The gesture does the useful thing
   instead (opens the agent result when there is one) and says why otherwise.
   Making it a real undo is a server + economy change, not a UI one.
2. **Toasts use the app's existing notification system** (`$notify`, bottom
   centre) rather than a second bottom-right toast stack. The copy from the
   handoff's feedback table is preserved; the chrome is the app's.
3. **The Add-task sheet is the existing global `AiSearchModal`**, opened through
   the `OPEN_AI_SEARCH` event bus. The handoff's revisions to it (drop Routine
   mode, Task/Goal toggle only) are not applied — that organism is 2.5k lines and
   is shared with every other screen, so reworking it is its own piece of work.
4. **The streak is derived, not persisted.** Nothing stores a streak yet, so the
   drawer states what today can prove: whether today clears the 3-tick bar.
5. **An invalid bearer token no longer refuses the request.**
   `src/graphql.js` answered `401 {"error":"Invalid authorization token"}` for
   any unverifiable token, before GraphQL ran. Because the client attaches the
   stored token to every operation — `authGoogle` included — and tokens last 60
   days, an expired token locked the user out of signing back IN: the request
   that would have minted a fresh token was the one being refused. The
   middleware (`attachDecodedToken`) now decodes what it can and otherwise
   continues unauthenticated; `getEmailfromSession` remains the gate and still
   throws 401 for every resolver that needs a user. Covered by
   `tests/authMiddleware.spec.js`.
6. **`firing` is derived client-side.** `agentStore` shows `running` for both the
   start and the end dispatch, so the page marks the taskRefs whose end event
   *it* put on the wire and draws the handoff's fast `bolt` stage from that.

## Numbers that look the same but are not

- **The checklist header and the tick ring** count real goal items —
  "2 of 3 done", ring = done ÷ total. That is what the handoff draws.
- **The agent's end-event rule** counts *slots*: `D.splitRate / K.splitRate`,
  derived from the routine's time gap, not from the checklist length (D-20). A
  listening agent completes when that counter fills. Do not unify these two —
  the first is what the user sees, the second is what the economy counts.
- **`countTotal('G')`** multiplies by 4 / 2 / 1.334 depending on how far into the
  week, month and year the day sits. The drawer's donuts clamp at 100%, because
  the raw value legitimately exceeds it early in the week.

## Tests

| Suite | Covers |
|---|---|
| `packages/ui/organisms/RoutineFocusCard/RoutineFocusCard.test.js` | ring geometry per shell, tick/agent states, checklist collapse, cascade swap |
| `packages/ui/organisms/RoutineChatThread/RoutineChatThread.test.js` | bubble alignment, event pills, live checkbox rows, proposals, quick-reply placement |
| `apps/web-app/src/utils/__tests__/routineFocusModel.test.js` | current routine, window maths, button states, cascade grid |
| `apps/web-app/src/pages/__tests__/routineFocusPage.test.js` | shell selection, tasklist dedupe, `firing` derivation, ticked-ring gesture, the computed graph (catches the rows ↔ focus cycle) |
| `apps/web-app/src/containers/__tests__/RoutineChatContainer.test.js` | every intent path, proposal acceptance, event posting |
| `apps/server/src/utils/chatApi.test.js` | free-roster enforcement, runtime discovery + ranking, model failover, intent coercion, chain-of-thought filtering, outage degradation |
| `apps/server/src/schema/RoutineChatSchema.test.js` | chat body + per-proposal encryption round trip |
| `apps/server/tests/authMiddleware.spec.js` | an expired/garbage token leaves the request unauthenticated rather than refused |

## Running it locally

`apps/web-app/src/blob/config.js` is gitignored and generated from the root
`.env` by the repo's own script — if it is missing, nothing builds:

```sh
cd apps/web-app
# point the client at a LOCAL server, so the chat resolvers exist
GQL_URL=http://localhost:3000/graphql node -r dotenv/config scripts/create-env.js dotenv_config_path=../../.env
```

Omit the `GQL_URL=` prefix to go back to the deployed dev API (where
`routineChat` is not deployed, so chat will fail).

Then, from the repo root:

```sh
NODE_ENV=development node apps/server/server.js   # :3000, dev auth bypass
npm run dev --workspace=web-app                   # :8080
```

Google sign-in works locally when `http://localhost:8080` is a registered JS
origin on the OAuth client; otherwise use the same JWT bypass the Playwright
suite does (`e2e/helpers/auth.js` → `mintToken`): set `token`, `email`, `name`
and `picture` in localStorage and reload. Note the server talks to the live
Atlas database — treat it as real data.

`blob/config.js` is generated by the SAME script CI uses
(`.github/workflows/mobile-build.yml` → `node ./scripts/create-env.js`) from the
same variable names, so a local blob and a CI-built one differ only in
`GQL_URL` and `IS_DEVELOPMENT`.
