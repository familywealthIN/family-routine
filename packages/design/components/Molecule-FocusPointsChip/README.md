# FocusPointsChip

The points chip as the focus design draws it: a flat 24/28px pill, not a Vuetify v-chip. `PointsChip` stays the chip for the legacy toolbars — it inherits `#mobileLayout .v-chip` height overrides that would fight the 64px top bar here.

- Level: Molecule · source `packages/ui/molecules/FocusPointsChip/FocusPointsChip.vue`
- Used by: `apps/web-app/src/pages/RoutineFocus.vue`, `packages/ui/molecules/ProgressHeroCard/ProgressHeroCard.vue`, `packages/ui/organisms/AppShell/AppShell.vue`, `packages/ui/organisms/RoutineTopBar/RoutineTopBar.vue`
- Stories shown: Default, With Pending Today, Empty

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
