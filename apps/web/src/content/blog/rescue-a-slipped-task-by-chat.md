---
title: "When the plan slips: rescue tasks by chat without losing the record"
description: "A slipped day, handled in one conversation: reschedule_goal_item for what moves, complete_goal_item for what you did but forgot, and the app for the late routine check-in."
category: mcp
persona: "Someone whose Tuesday fell apart"
pillar: D
publishDate: 2026-11-26
readingTime: 3
tags: ["mcp", "claude", "reschedule", "late-ticks"]
takeaways:
  - "Sort a slipped day into three piles: items that move, items you did but forgot, and the routine itself."
  - "reschedule_goal_item keeps the original date and the item's links, so a moved task still feeds its week goal."
  - "A forgotten item ticked late with complete_goal_item still counts toward the week, even though it reads Missed."
  - "Routine check-ins are never done by chat: use Past on Home the same day, or Skip Day for a lost day."
mcp:
  client: "Claude"
  prompt: "It's been a mess of a day. List today's day items that aren't complete, with the routine each is on."
  tools: ["get_current_date", "get_daily_goals", "reschedule_goal_item", "complete_goal_item"]
---

When the plan slips, you can rescue tasks by chat in about three minutes without losing the record. Move what has to move, tick what you actually did, and leave the routine check-in to the app. Each of those three is a different action in Routine Notes, on purpose.

Days go sideways early. A meeting overruns, a child is sent home from school, the train stops in a tunnel. With the connector in Claude ([setup](/blog/connect-routine-notes-to-claude)), here's how one evening conversation puts Tuesday back in order.

## Start with the facts

> It's been a mess of a day. Using Routine Notes, list today's day items that aren't complete, with the routine each one is on.

Claude calls `get_current_date` (Tuesday 10-11-2026), then `get_daily_goals` for that date. An example of the part that matters:

```json
{ "period": "day", "date": "10-11-2026", "goalItems": [
  { "id": "a1", "body": "Draft the quarterly report outline", "isComplete": false, "status": "todo" },
  { "id": "a2", "body": "Intervals: 6 × 400 m", "isComplete": false, "status": "missed" },
  { "id": "a3", "body": "Call the plumber about the boiler", "isComplete": false, "status": "todo" }
] }
```

Three open items. The week goal above the intervals shows 1 met day so far, Monday, and needs 5 by Sunday. Now go item by item.

## What moves: reschedule, don't re-add

> Move the report outline to tomorrow and the intervals to Thursday.

Claude calls `reschedule_goal_item` twice, each time with the item's `id`, the `oldDate`, the `newDate` and `period: "day"`:

```json
{ "id": "a1", "oldDate": "10-11-2026", "newDate": "11-11-2026", "period": "day" }
```

Each item moves, its status becomes *rescheduled*, and its original date is kept. That beats deleting and re-adding for two reasons. A task that has moved twice is telling you something about the plan, and you'd lose that. And the item keeps its links to its routine and its milestone, so on Thursday 12-11-2026 the intervals still count toward the week.

## What you did but forgot to tick

> Actually, I called the plumber from the car at 13:10. Tick that one.

Claude calls `complete_goal_item` with the item's `id`, its `taskRef`, the date, `period: "day"`, `isComplete: true`, and `isMilestone` as it was. Completion cascades: the linked routine's points update and the tick rolls up toward the week, month and year above it.

The call happened at 13:10, but you're ticking it at 21:00, so the status will read *Missed*. That label records timing. The tick still counts toward its goals, because progress is the record of ticked days, late or not. It works for yesterday's items too. You can't create an item on a day that's gone, but an item made on its day and forgotten can be ticked later.

## What if the routine itself slipped?

The third kind of slip isn't a goal item. The 07:20 Run window opened at 06:20 and closed at 07:50, and you never ticked it. That's not Claude's to fix.

Open **Home → Past**. The routine is there, and today, and only today, you can spend its 10 points to check it in late. The streak holds, agents bound to Run still fire, and the late check-in earns points like any tick. Points settle overnight, so Monday's earnings fund Tuesday's rescue.

It stays in the app because Discipline measures you showing up in the window. A chat that ticked it for you would turn the D ring into decoration.

If the whole day was lost to travel or a family emergency, use **Skip Day** instead: long-press today in the week strip. It marks a rest day, not a failure, it costs no streak, and you get at most 2 a week.

## A prompt for bad days

> Bad day. From Routine Notes: 1) list today's unfinished day items; 2) I'll say which I did, tick those; 3) suggest new dates for the rest, no more than 2 per day this week, and show me before rescheduling. Don't delete anything.

The last sentence matters most. An honestly sorted bad day leaves a plan that still works and a record that's still true.

## Why three minutes is worth it

Tuesday is 1 day of the 5 a week goal needs, and 5 days are still to come. Two moves and one forgotten tick put the week back in reach of 5 met days by Sunday. The other choice is the week you quietly let go on Wednesday.
