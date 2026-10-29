# GoalItemList

Ask the parent to toggle a sub-task. Emits intent only. `subTasks` is passed so the container can build an optimistic response for the whole list — the checkbox still flips instantly, but the write goes through Apollo instead of `$set`-ing the cached SubTaskItem, which is what used to desynchronise the store from the rendered result.

- Level: Organism · source `packages/ui/organisms/GoalItemList/GoalItemList.vue`
- **Legacy:** no screen imports it any more. Do not design with it.
- Stories shown: Default, Editable, Weekly Goal Items

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
