# TitleOptions

Presentational day-header row for the dashboard: the date title plus its action cluster. On "today" it shows the wake toggle + skip-day switch + refresh; on any other date it shows just refresh. Props in, events out — no store / Apollo (the page owns skipDay state + the skipRoutine mutation and the refresh side-effect).

- Level: Organism · source `packages/ui/organisms/TitleOptions/TitleOptions.vue`
- **Legacy:** no screen imports it any more. Do not design with it.
- Stories shown: Today, Today Skipped, Other Day

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
