# Status pill

A small rounded label that states a goal's or routine's state in one word, coloured by meaning.

- Goal status is `Active` (`now-tint` ground, `now-dark` text) or `Done` (green tint, `success-dark` text). `Inactive` appears only on Year Goals, for a past or future period with no completion.
- `Done` comes from the server's `isComplete` and nothing else. A week goal ticks itself at 5 met day milestones, a month at 3 week milestones, a year at 6 month milestones; the pill flips when that happens.
- The `NOW` badge (9/700, 0.4 px tracking) marks the current routine in group headers and next to the routine name.
- Sizes: 10/700 inside rows, 12/700 in headers. Always radius 999, never an outline.
- Late ticks count towards goals. Never show a ticked item as missed because it was ticked after its window.

Source: `organisms/GoalCascade` (`.rn-gcas__chip`, `.rn-gcas__now`), `utils/routineFocusModel.milestoneTally` (`statusLabel`, `statusColor`).
