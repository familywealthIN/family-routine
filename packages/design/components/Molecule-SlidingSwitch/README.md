# SlidingSwitch

The segmented control the redesign uses four times: Progress (Day · Week · Month · Year), Profile (12h / 24h), About (5 feature tabs) and the agent event kind (URL / cURL). Two variants, one geometry generalised from Progress:

- Level: Molecule · source `packages/ui/molecules/SlidingSwitch/SlidingSwitch.vue`
- Used by: `apps/web-app/src/pages/AboutTime.vue`, `apps/web-app/src/pages/ProgressTime.vue`, `packages/ui/constants/progress.js`, `packages/ui/molecules/DateSelector/DateSelector.vue`, `packages/ui/organisms/AboutFeatureTabs/AboutFeatureTabs.vue`, `packages/ui/organisms/AgentFormSheet/AgentFormSheet.vue` and more
- Stories shown: Periods, Twelve Twenty Four, Compact

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
