---
title: "A morning briefing from Claude, built from your own routines"
description: "One prompt, three connector tools: how an early riser gets Claude to read today's routines and goals and point at the window that closes first."
category: mcp
persona: "Early riser who plans over coffee"
pillar: D
publishDate: 2026-11-11
readingTime: 3
tags: ["mcp", "claude", "morning", "briefing"]
takeaways:
  - "One pasted prompt makes Claude call get_current_date, get_routine and get_daily_goals, in that order."
  - "Put the window rule (opens 60 minutes before, closes 30 after) in the prompt so Claude can name closing times."
  - "Ask for step 1 of the next routine, not its name: \"Lace the running shoes\" gets you moving, \"Run\" doesn't."
  - "Passed routines are checked in late from Past in the app; Claude can only reschedule the goal items."
mcp:
  client: "Claude"
  prompt: "Give me today's briefing: routines in order, which window closes first, and the items linked to each."
  tools: ["get_current_date", "get_routine", "get_daily_goals", "reschedule_goal_item"]
---

A morning briefing from Claude takes one pasted prompt and about twenty seconds, and because it's built from your own routines, it tells you which window closes first, not what a generic productivity list thinks you should do. For an early riser who reads it over coffee, it replaces ten minutes of scrolling with a list of what's due and when each window closes.

You need the Routine Notes connector added to Claude first ([setup](/blog/connect-routine-notes-to-claude)).

## The prompt to keep

Save this in a note and paste it each morning:

> Good morning. Using Routine Notes, give me today's briefing: my routines in order with start times, which window closes first, the day items linked to each routine, and any week goal that needs today. A routine's window opens 60 minutes before its start time and closes 30 minutes after. Under 150 words.

The window rule has to be in the prompt. The tools return start times, and Claude needs the rule to turn "07:20" into "open until 07:50".

## Which tools does Claude call, and why?

**`get_current_date`** comes first. The server asks Claude to call it whenever you say "today".

**`get_routine`** with that date returns the day's list: each routine's name, time, points, whether it's ticked or passed, its steps, and the D/K/G points it has earned. An example, trimmed:

```json
{ "tasklist": [
  { "name": "Wake up", "time": "05:30", "points": 5, "ticked": true },
  { "name": "Reading", "time": "06:00", "points": 5, "ticked": false, "passed": false },
  { "name": "Run", "time": "07:20", "points": 10, "ticked": false,
    "steps": [{ "name": "Lace the running shoes" }] }
] }
```

**`get_daily_goals`** with the same date returns everything active today, from day items up to the year. That's how Claude links Tuesday's "Intervals: 6 × 400 m" to the week goal "Three runs, one of them intervals" and to the month block above it.

## A briefing, worked through

Say you paste the prompt at 06:05 on a Tuesday. Wake up was ticked at 05:40, inside its 04:30–06:00 window. Reading started at 06:00, so its window is open until 06:30. Run starts at 07:20, so its window runs from 06:20 to 07:50. The week goal shows 1 met day so far (Monday) out of the 5 it needs, with 6 days left including today. An example reply:

> **Now:** Reading (06:00), open until 06:30. Step 1: phone face-down in another room.
> **Next:** Run (07:20), window 06:20–07:50. Today: Intervals 6 × 400 m, the week's 2nd run.
> **Watch:** Plan the day (08:00) has nothing linked yet. Its window shuts at 08:30.
> **Week:** 1 of 5 days met, 6 days left. Today and Thursday keep it on course.

It doesn't motivate you or rate your sleep. It reads the list and tells you which window is closing.

## Lead with step 1

Each routine has an ordered checklist, and step 1 is meant to be tiny and physical. Ask Claude to quote step 1 of the next routine rather than its name. "Lace the running shoes" gets you out of the chair at 07:15. "Run" is just a label.

## What if you read the brief too late?

Read it at 06:40 and Reading shows `passed: true` with `ticked: false`. Its window shut at 06:30. Claude can flag that, but the routine itself is fixed in the app: open **Past** on Home and check it in late with points the same day. The streak holds, and agents bound to Reading still run. Claude doesn't tick routines, because Discipline counts you turning up inside the window.

What Claude can repair is the goal side. If the interval session clearly isn't happening today:

> Move today's interval session to Thursday.

That calls `reschedule_goal_item`. It keeps the original date, marks the item rescheduled, and keeps its link to the week goal, so the week can still reach 5 met days.

## Three variations

- **Evening:** "What did I finish today, and what's still open?" Add `get_progress` for the day's D, K and G totals.
- **Week ahead:** run `get_daily_goals` for each of the next 5 dates and ask which day is overloaded.
- **Priority:** add "and today's Do now items" so Claude calls `get_priority_goals`. More than 3 means some belong in Plan.

## The in-app version

If you'd rather not open Claude, Routine Notes has its own **Good morning** notification, turned on under **More → Notifications**. It gives your day at a glance at a time you choose. The Claude briefing is for days when you want to ask follow-up questions, move things and plan around the answer.
