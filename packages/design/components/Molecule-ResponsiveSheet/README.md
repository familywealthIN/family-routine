# ResponsiveSheet

One overlay, two presentations — docs/redesign/chassis.md § "Sheet vs dialog". Every design file draws the same sheet twice (phone bottom sheet, tablet / desktop centred dialog), so this is one component with a `shell` prop rather than a sheet and a dialog that drift apart.

- Level: Molecule · source `packages/ui/molecules/ResponsiveSheet/ResponsiveSheet.vue`
- Used by: `apps/web-app/src/pages/AgendaTreeTime.vue`, `apps/web-app/src/pages/AgentsBoard.vue`, `apps/web-app/src/pages/CheckHistory.vue`, `apps/web-app/src/pages/FamilyRoutine.vue`, `apps/web-app/src/pages/GoalsTime.vue`, `apps/web-app/src/pages/YearGoalsTime.vue` and more
- Stories shown: Phone, Tablet, Desktop

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
