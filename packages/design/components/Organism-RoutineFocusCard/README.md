# RoutineFocusCard

The focus card: one routine, concentrated. Status window at the top, the tick ring and title in the middle, then the checklist, then whatever the shell puts in the `thread` slot (the routine chat) — all in ONE scroll area, because the design treats checklist and conversation as a single column. Period tabs are pinned full-bleed to the bottom of the card.

- Level: Organism · on Home · source `packages/ui/organisms/RoutineFocusCard/RoutineFocusCard.vue`
- Used by: `apps/web-app/src/pages/RoutineFocus.vue`, `packages/ui/constants/routineFocus.js`, `packages/ui/molecules/StatusRing/StatusRing.vue`, `packages/ui/styles/app/pages/RoutineFocus.css`
- Stories shown: Phone Today, Phone Ticked, Phone Agent Waiting

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
