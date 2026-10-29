# UpcomingPastTasks

Forward GoalItemList's two-argument toggle-goal-display-dialog event up to the dashboard. Method binding (vs. an inline arrow) is required because Vue 2 templates lose `this` inside arrow function expressions, leading to `Cannot read properties of undefined (reading '_events')` on $emit.

- Level: Organism · source `packages/ui/organisms/UpcomingPastTasks/UpcomingPastTasks.vue`
- **Legacy:** no screen imports it any more. Do not design with it.
- Stories shown: Upcoming Default, Past With Selection, Empty State

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
