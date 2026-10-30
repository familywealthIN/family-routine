# MobileSubDrawer

MobileSubDrawer - A secondary bottom-sheet that slides up over the main AiSearchModal bottom-sheet on mobile devices. Used to replace floating dropdown menus (v-select, v-menu) that get misplaced when the mobile keyboard is open. @example <MobileSubDrawer v-model="showDrawer" title="Select Task"> <v-list dense> <v-list-tile v-for="item in items" :key="item.id" @click="select(item)"> <v-list-tile-title>{{ item.name…

- Level: Molecule · source `packages/ui/molecules/MobileSubDrawer/MobileSubDrawer.vue`
- Used by: `packages/ui/molecules/DateSelector/DateSelector.vue`, `packages/ui/molecules/GoalRefSelector/GoalRefSelector.vue`, `packages/ui/molecules/GoalTaskSelector/GoalTaskSelector.vue`, `packages/ui/organisms/AiSearchModal/AiSearchModal.vue`
- Stories shown: Open, Empty

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
