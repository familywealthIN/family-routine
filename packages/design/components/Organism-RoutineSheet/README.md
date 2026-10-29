# RoutineSheet

One overlay, two shapes. Phone/tablet get a bottom sheet (radius 16 top, `0 -8px 24px rgba(0,0,0,.18)`); desktop gets a centred 480px dialog with radius 20. Both over a `rgba(0,0,0,.32)` scrim.

- Level: Organism · source `packages/ui/organisms/RoutineSheet/RoutineSheet.vue`
- **Legacy:** no screen imports it any more. Do not design with it.
- Stories shown: Phone, Tablet, Desktop

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
