# RoutineTopBar

Phone top bar. "Home" fades out once the focused routine is ticked and the centre slot takes over: a 34px green ring plus the routine name, popped in after the tick animation lands. That ring is also the flight TARGET, so the page measures it through `ringTargetRect()` / `nameTargetRect()`.

- Level: Organism · on Home · source `packages/ui/organisms/RoutineTopBar/RoutineTopBar.vue`
- Used by: `apps/web-app/src/pages/RoutineFocus.vue`, `packages/ui/molecules/StatusRing/StatusRing.vue`, `packages/ui/organisms/RoutineFocusCard/RoutineFocusCard.vue`, `packages/ui/styles/app/pages/RoutineFocus.css`
- Stories shown: Default, With Inbox, Routine Ticked

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
