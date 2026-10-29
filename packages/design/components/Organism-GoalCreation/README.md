# GoalCreation

Push the item to the next day. `updateGoalItem` already relocates the subdocument between date documents and stamps originalDate / rescheduled (server resolvers/goal.js moveGoalItem), so a defer is just a save with tomorrow's date — no second code path to keep in step.

- Level: Organism · on App shell · source `packages/ui/organisms/GoalCreation/GoalCreation.vue`
- Used by: `apps/web-app/src/containers/GoalEditSheetContainer.vue`, `packages/ui/molecules/GoalTagsInput/GoalTagsInput.vue`, `packages/ui/organisms/PendingList/PendingList.vue`
- Stories shown: New Day Goal, New Week Goal, Editing Goal With Tags

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
