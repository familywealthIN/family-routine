# Goal row

A week, month or year goal on the Goals screen: checkbox, title, progress bar with its milestone counter and status, and the rule line, grouped under its routine.

- Grouped by routine in clock order. The group header is the time (12/600, tabular), the routine name (12/700 uppercase, 0.4 px tracking), a `NOW` badge on the current routine (its time turns `now-dark`), a hairline and an `n/n` count.
- Row: min-height 54, gap 12. Checkbox glyph 28 px (`check_box` in `success` when done). Title 16/500, line-height 1.3.
- Bar: 5 px, radius 3, track `#eee`. Fill `success` when Done, `now` when Active. The bar fills at the threshold.
- Counter "3/5 milestones" reads against every planned milestone, never fewer than the threshold. The status pill is the server's `Done`/`Active`.
- **Rule line** (12 px, 50% black): "Needs 3 of 5 week milestones met" when more are planned than the threshold, otherwise "Needs 3 week milestones met". Thresholds: week 5 day milestones, month 3 week milestones, year 6 month milestones. Reaching the threshold ticks the goal; the rest of the plan does not hold it open.
- Edit and delete are 32 px round targets, always visible on touch shells, `primary` / `danger` tinted on hover.
- A hand tick on a goal already at its threshold is refused with the toast "Ticked automatically · 3 of 5 week milestones are met".

Source: `organisms/GoalCascade`, `apps/web-app/src/utils/goalCascade.js` (`barRow`), `utils/routineFocusModel.js` (`milestoneTally`).
