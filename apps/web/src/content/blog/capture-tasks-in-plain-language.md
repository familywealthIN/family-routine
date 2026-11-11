---
title: "Capture tasks in plain language and file them under the right routine"
description: "How extract_day_task and add_goal_item turn a rushed sentence in Claude into a dated item on the routine that will actually do it, or into the Inbox when it has no home yet."
category: mcp
persona: "Busy professional capturing tasks between meetings"
pillar: K
publishDate: 2026-11-16
readingTime: 3
tags: ["mcp", "claude", "capture", "quick-tasks"]
takeaways:
  - "Say the task once, messily; extract_day_task returns a title, description, tags, due date and priority."
  - "Give the item a taskRef from get_routine so it appears on that routine's card at the right hour."
  - "Leave taskRef off when a task has no home yet: it waits in the Inbox until you file it."
  - "After a meeting, capture 6 follow-ups in one bulk_add_goal_items call, but read the list first."
mcp:
  client: "Claude"
  prompt: "Remind me to send the revised onboarding deck to the design team before Thursday's review."
  tools: ["get_current_date", "extract_day_task", "get_routine", "add_goal_item", "bulk_add_goal_items"]
---

To capture tasks in plain language, say the task to Claude in one sentence and let `extract_day_task` give it a shape. Then file it under the right routine with `add_goal_item`, so it turns up at the hour you'll actually do it. Tasks arrive mid-meeting or mid-thread, and the fewer app switches it takes to write one down, the fewer get lost.

You'll need the Routine Notes connector in Claude ([setup](/blog/connect-routine-notes-to-claude)). The payoff is Kinetics: a task filed inside a routine slot gets worked in that slot, and working the slot is what earns K.

## Step 1: say it messily

> Remind me to send the revised onboarding deck to the design team before Thursday's review, and it needs the new screenshots.

That one sentence holds a task, a deadline, a dependency and an audience. Claude calls `get_current_date` (it's Wednesday 11-11-2026), then passes the sentence to `extract_day_task`. An example result:

```json
{ "title": "Send revised onboarding deck to design team",
  "description": "Include the new screenshots. Due before Thursday's review.",
  "tags": ["design", "onboarding"],
  "dueDate": "12-11-2026",
  "priority": "high" }
```

Check the date before anything is saved. "Thursday" became 12-11-2026, the next day, which is what you meant.

## Which routine should it go under?

> Which of my routines is this for?

Claude calls `get_routine` and sees the day: *Deep work* at 08:30 (35 points), *Admin* at 14:00 (15 points) and *Writing* at 19:00 (10 points), each with an id. Sending a deck is admin. Admin's window runs from 13:00 to 14:30, and the review is at 16:00, so the 14:00 slot leaves two hours of margin. The item gets Admin's id as its `taskRef`:

```json
{ "body": "Send revised onboarding deck to design team",
  "period": "day", "date": "12-11-2026",
  "taskRef": "<admin routine id>",
  "contribution": "Include the new screenshots." }
```

That's `add_goal_item`. The `contribution` field holds Markdown notes, so "the new screenshots" travels with the task. At 14:00 on Thursday it's sitting on the Admin card. If you're unsure what your routines are called, **More → Routines** shows the whole day as a 24-hour dial with a timeline.

## Or leave it in the Inbox

Some tasks don't have a home yet, and forcing one is worse than waiting. Leave `taskRef` off and the item lands in the **Inbox**, the tray icon at the top of Home, with a count beside it. From there, *Do now* drops it on the current routine and *Move to routine* files it properly. Capture now, file later.

## Linking it to the bigger plan

If the task serves a milestone, say so:

> This is part of the onboarding redesign week goal.

Claude finds that goal with `get_daily_goals`, then adds the item with the milestone's id as `goalRef` and `isMilestone: true`. Now it's Geniuses as well: the tick moves the week, and the week moves the month.

## Six follow-ups after one meeting

A 10:00 meeting ends with 6 follow-ups. Paste your rough notes:

> Turn these into tasks for this week, spread across my routines, no more than 2 a day. Show me the list before you save.

Claude extracts each one and proposes dates and routines: 2 on Thursday's Admin, 2 on Friday's Deep work, 1 on Monday and 1 left for the Inbox. You change one date, and it saves the agreed 6 in a single `bulk_add_goal_items` call.

## What can go wrong with capture?

- **Capturing into the past.** You can't create an item on a day that's already gone. If you forgot to log yesterday's task, add it for today, or tick the original if it exists.
- **The wrong quadrant.** Priority groups items by their `priority:` tag, which the app writes when you create a task in it. If a captured item should land in a particular quadrant, ask Claude to add the tag.
- **A pipeline into a routine you never open.** Kinetics comes from working the routine's steps and the tasks in its slot. Perfect capture into a routine you skip just builds a tidier backlog.
- **Ticking the routine from chat.** Claude adds and ticks goal items. The routine check-in happens in the app, inside its window.

## The habit

If a task takes under two minutes, do it. If not, say it to Claude in one sentence, agree the routine, and get back to work. At 14:00 on Thursday the routine brings it back.
