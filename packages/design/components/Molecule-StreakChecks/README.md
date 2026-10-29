# StreakChecks

One entry per calendar day of the period, in calendar order, as published by the server's `milestoneDays`: { date: 'DD-MM-YYYY', status }. A count cannot be used here — it packs the wins to the left and makes a broken week look unbroken.

- Level: Molecule · source `packages/ui/molecules/StreakChecks/StreakChecks.vue`
- Used by: `packages/ui/organisms/WeekGoalStreak/WeekGoalStreak.vue`
- Stories shown: No Progress, Three Complete, Broken Streak

Rendered from Storybook by `packages/design/tools/build-canvases.js`; the screenshot is the shipped component. For the tokens it uses see `tokens.json`; for the rules of the core patterns see the hand-built components (`components/Button`, `GoalRow`, `ChatThread`, …).
