# AgentFormSheet

New agent / Edit agent — one form, three presentations, from `packages/design/Agents.dc.html`. The chassis `ResponsiveSheet` supplies them (phone bottom sheet · tablet 860px · desktop 720px), and `SlidingSwitch` supplies the URL / cURL toggle, so neither is redrawn here.

- Level: Organism · on Home, Agents, Routines · source `packages/ui/organisms/AgentFormSheet/AgentFormSheet.vue`
- Used by: `apps/web-app/src/containers/AgentFormContainer.vue`
- Stories shown: New Agent, Edit Agent, Save Failed

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
