# Routine Notes — redesign

Open any `.dc.html` file in a browser (keep the folder structure). Each page shows **Phone (412×892)**, **iPad mini landscape (1133×744)** and **Desktop (1440×900)** side by side, with notes on what changed from the current Vue page.

## Pages
| File | Replaces | Highlights |
|---|---|---|
| Routine Notes Final.dc.html | RoutineFocus.vue (Home) | Focus card + checklist, routine chat with "Before you start" context, check circle → Start sheet (locked-in goal item + Start Task / Start Agent) → agent lifecycle, week selector (long-press today = Skip day), Inbox, goal item page (Markdown contribution, tags, subtasks, agent result) |
| Priority.dc.html | PriorityTime.vue | Triage card, 2×2 map, Delegate → agent, Automate → routine |
| Agents.dc.html | — | Agent list, lifecycle, events, last result, run test, create/edit |
| Goals.dc.html | GoalsTime.vue | Goals overview; tap Goals again to switch to a year goal |
| Year Goals.dc.html | YearGoalsTime.vue | Year goal ring, month cascade, goal sheet with search/sort |
| Routines.dc.html | SettingsTime.vue | 24h day dial, timeline, editor with `:` tags and steps |
| Progress.dc.html | ProgressTime.vue | Period switch, efficiency + trend, D/K/G rings, great going / needs attention |
| Groups.dc.html | FamilyRoutine.vue | Group pulse, members with today ring + 7-day dots, member week grid, invite / leave |
| Profile and About.dc.html | ProfileTime.vue, AboutTime.vue | Time settings, rates, roll-up chain, Connect AI (MCP), API key, delete account · About features |

## Navigation (same on every device)
- **Primary:** Home · Priority · Agents · Goals — phone bottom bar, iPad rail, desktop sidebar.
- **More:** Routines · Progress · Groups · Profile · About — phone avatar menu, iPad/desktop "More" toggle.
- Desktop content is capped at 980–1040px; iPad mini and desktop share type sizes and the 60/40 split.

## Notes for development
- Data is sample data in each file's logic class; agent runs and webhooks are simulated.
- Avatar is `assets/avatar.svg`, a neutral illustrated placeholder — swap for `user.picture`. It replaced a remote photo of a real person, which could not appear in a store screenshot.
- Point rates (3 h / 1 h / 25%) and the version label on About are placeholders — use `profileSettings`.
- Markdown contribution mirrors `@routine-notes/markdown-editor` (EasyMDE default config) — use the package in the app.
