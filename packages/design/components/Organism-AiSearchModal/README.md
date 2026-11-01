# AiSearchModal

AI Search Modal - Intelligent Task/Goal Creation MILESTONE PERIOD FETCHING LOGIC: ================================= When the modal switches from Task mode to Goal mode (auto or manual), or when the period changes to week/month/year, it automatically fetches goals from the PARENT period to populate milestone selection options. Period Hierarchy (uses stepupMilestonePeriodDate): - day → fetches WEEK goals (Friday of …

- Level: Organism · on App shell · source `packages/ui/organisms/AiSearchModal/AiSearchModal.vue`
- Used by: `apps/web-app/src/App.vue`, `apps/web-app/src/containers/AiGoalPlanFormContainer.vue`, `apps/web-app/src/containers/AiSearchModalContainer.vue`, `apps/web-app/src/containers/AiTaskCreationFormContainer.vue`, `packages/ui/molecules/MobileSubDrawer/MobileSubDrawer.vue`, `packages/ui/organisms/QuickGoalCreation/QuickGoalCreation.vue` and more
- Stories shown: Task Mode, Goals Mode, Closed

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
