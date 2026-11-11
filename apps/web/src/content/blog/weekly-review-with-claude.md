---
title: "A twenty-minute weekly review with Claude and your real numbers"
description: "Run a Sunday review on facts instead of feelings: get_progress for the week, get_daily_goals for what's open, then draft next week's milestones together."
category: mcp
persona: "Weekly reviewer"
pillar: G
publishDate: 2026-11-11
readingTime: 3
tags: ["mcp", "claude", "weekly-review", "progress"]
takeaways:
  - "Four prompts in twenty minutes: the scoreboard, what's still open, what's crowding Monday, and next week's milestones."
  - "Read D, K and G against each other: D far below K means the schedule is drifting late, not that effort is low."
  - "A week goal one met day short of 5 is usually one forgotten tick away, and late ticks still count."
  - "Have Claude show each new week milestone before it saves it with add_goal_item."
mcp:
  client: "Claude"
  prompt: "Show my progress from 02-11-2026 to 08-11-2026: D, K and G totals, and goals completed out of total."
  tools: ["get_progress", "get_daily_goals", "get_priority_goals", "reschedule_goal_item", "add_goal_item"]
---

A twenty-minute weekly review with Claude works because it starts from your real numbers: the points you earned, the goals that closed, and the items you left open. Memory is kind to the good days and vague about the rest, and the record isn't.

A weekly review is Geniuses in its plainest form, the plan getting better. With the Routine Notes connector in Claude ([setup](/blog/connect-routine-notes-to-claude)), it takes four prompts.

## Prompt 1: the scoreboard

> Using Routine Notes, show my progress from 02-11-2026 to 08-11-2026: D, K and G totals, and how many day, week and month goals I completed out of how many.

Claude calls `get_progress` with `period: "week"` and the two dates. An example result:

```json
{ "D": 455, "K": 390, "G": 610, "totalPoints": 1455,
  "goalProgress": {
    "day":   { "complete": 24, "total": 31 },
    "week":  { "complete": 2,  "total": 4 },
    "month": { "complete": 0,  "total": 3 } } }
```

## How do you read the three letters?

Each letter can reach 100 a day, so 700 is the ceiling for a seven-day week. In this example, D is 455 of 700 (65%), K is 390 (56%) and G is 610 (87%). Compare them with each other, not with the ceiling:

- **D well below K:** the work happens, but not at the promised time. Routines are drifting out of their windows, so the times need fixing.
- **K well below D:** you show up on time and leave the checklist half done. The steps may be labels instead of actions.
- **G high, day items unfinished:** here, 24 of 31 day items done but G at 87% says the plan is well linked, and the gap is in the doing.

The app shows the same figures under **More → Progress**, where *On the clock* also splits check-ins into on time and late, by routine.

## Prompt 2: what's still open

> Which week goals didn't close, and which day items did I leave unticked?

Claude calls `get_daily_goals` for 08-11-2026. That returns every goal active that day, with each item's `isComplete`, `status` and `progress`. Two of the 4 week goals closed. A third shows 4 met days with one open item on Thursday. A day only counts once every item linked to that week on that date is ticked, so that goal is a single tick from 5. If you did Thursday's item and forgot to tick it, tick it now. Late ticks count. The status will say *Missed*, but the week still closes.

## Prompt 3: what's crowding Monday

> Look at Monday's priorities. How many items are in Do now, and what's in Plan?

`get_priority_goals` returns Monday's items in four groups: do, plan, delegate and automate. If Do now already holds 6 items before the week has started, that's the review's most useful finding. Ask which ones really belong later in the week, and move them with `reschedule_goal_item`, which keeps the original date and marks each one rescheduled.

## Prompt 4: next week's milestones

> Draft next week's week milestones, one for each month goal that's behind. Show them to me first.

Claude proposes, you cut, and then it saves each milestone with `add_goal_item`, using `period: "week"`, `isMilestone: true`, the month goal's id as `goalRef`, and the carrying routine as `taskRef`.

A good week milestone can be met on 5 days: "Three runs, one of them intervals", not "Get fitter". A month needs 3 met weeks, and with 0 of 3 month goals closed so far, two steady weeks are worth more than one heroic one.

## What goes wrong in a weekly review?

- **Ticking last week's routines through Claude.** Routine check-ins belong in the app, inside their windows, or late from **Past** on the same day. The review is for goals and the plan.
- **Rewriting the year goal after one bad week.** A year closes at 6 met months. One week out of 52 is noise.
- **Saving without reading.** Ask for the list first, every time.
- **Reviewing from the wrong dates.** Give both dates in DD-MM-YYYY, or ask Claude to call `get_current_date` and count back 7 days.

## A template to paste

> Weekly review, Routine Notes. Dates: [first day] to [last day]. 1) get_progress for the week. 2) Week goals not closed and why, from get_daily_goals on the last day. 3) Monday's priorities. 4) Draft next week's milestones; show before saving. Be brief.

Twenty minutes, four prompts, and a better plan for Monday than the one you had on Friday.
