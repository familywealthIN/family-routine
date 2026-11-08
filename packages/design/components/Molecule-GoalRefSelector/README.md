# GoalRefSelector

GoalRefSelector - Dropdown for selecting a goal reference (goalRef) Used for milestone parent selection in goal creation forms This component automatically groups goal items by their routine task (taskRef) using Vuetify's header objects: { header: 'Routine Name' } @example <GoalRefSelector :items="goalItems" :tasklist="routineTasks" v-model="selectedGoalRef" />

- Level: Molecule · source `packages/ui/molecules/GoalRefSelector/GoalRefSelector.vue`
- Used by: `apps/web-app/src/containers/AiSearchModalContainer.vue`, `apps/web-app/src/containers/GoalListContainer.vue`, `apps/web-app/src/containers/QuickGoalCreationContainer.vue`, `packages/ui/organisms/AiSearchModal/AiSearchModal.vue`, `packages/ui/organisms/GoalItemSheet/GoalItemSheet.vue`, `packages/ui/organisms/GoalList/GoalList.vue` and more
- Stories shown: Default, No Goal Picked, No Goals Yet

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
