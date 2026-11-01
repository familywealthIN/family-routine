# AiGoalPlanForm

MarkdownEditor doesn't participate in v-model for a nested prop cleanly (it emits 'input'), so we write the new description onto localMilestoneData explicitly. The deep watcher then propagates it to the parent container via update:milestoneData.

- Level: Organism · on App shell · source `packages/ui/organisms/AiGoalPlanForm/AiGoalPlanForm.vue`
- Used by: `apps/web-app/src/containers/AiGoalPlanFormContainer.vue`, `packages/ui/organisms/AiSearchModal/AiSearchModal.vue`
- Stories shown: Week Plan, Month Plan, Year Plan

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
