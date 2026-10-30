# PullToRefresh

Pull down to refresh, for touch screens. Wraps any content; when a downward drag starts while every scroller under the finger (inside this wrapper) is already at its top, an indicator follows the finger down and, released past `threshold`, emits `refresh`. The host does the refetch and reports it back through `refreshing`, which keeps the indicator spinning until it is false.

- Level: Molecule · source `packages/ui/molecules/PullToRefresh/PullToRefresh.vue`
- Used by: `apps/web-app/src/pages/RoutineFocus.vue`
- Stories shown: Idle, Refreshing, Disabled

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
