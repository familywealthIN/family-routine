# PriorityGoalList

A compact goal-item checklist: checkbox + title (strike-through when done) + an optional subtitle (linked parent-goal name • routine task name), plus optional sub-tasks, an agent-transcript button, and edit/delete actions. Extracted from PriorityQuadrant so the same list can be reused (e.g. the Goals-page day drawer). Item shape: { id, body, isComplete, taskRef, parentGoalBody, reward, subTasks: [{ id, body, isCom…

- Level: Molecule · source `packages/ui/molecules/PriorityGoalList/PriorityGoalList.vue`
- Used by: `packages/ui/molecules/PriorityQuadrant/PriorityQuadrant.vue`, `packages/ui/molecules/PriorityTaskList/PriorityTaskList.vue`
- Stories shown: Default, With Subtasks And Delete, Empty

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
