---
title: "Thirty points for the day job: weighting one big work routine"
description: "An engineering lead puts 30 of the day's 100 points on one deep-work routine, gives it real steps, and keeps the Do now column at three items or fewer."
category: work
persona: "Engineering lead"
pillar: K
publishDate: 2026-12-25
readingTime: 4
tags: ["points", "deep-work", "quick-tasks", "priority"]
takeaways:
  - "Put the core of the job in one routine: 30 of the day's 100 points sit on a single 08:40 deep-work block."
  - "A heavy routine is costly to rescue: checking in a missed 30-point block late costs 30 points."
  - "Keep Do now at three items. A fourth gets a future date and moves itself to Plan."
  - "Five steps written as actions (door shut, re-read, two hours, two reviews, a stop note) carry the Kinetics."
routines:
  - { time: "06:00", name: "Wake up", points: 5, pillar: D, cue: "Open the curtains" }
  - { time: "06:30", name: "Exercise", points: 10, pillar: K, cue: "Shoes on at the door" }
  - { time: "07:30", name: "Breakfast", points: 5, pillar: D, cue: "Kettle on" }
  - { time: "08:00", name: "Plan the day", points: 10, pillar: D, cue: "Open today's checklist" }
  - { time: "08:40", name: "Deep work", points: 30, pillar: G, cue: "Notifications off, door shut" }
  - { time: "13:00", name: "Team time", points: 15, pillar: K, cue: "Open the review queue" }
  - { time: "17:30", name: "Shutdown", points: 10, pillar: D, cue: "Write tomorrow's first task" }
  - { time: "19:00", name: "Reading", points: 5, pillar: K, cue: "Book on the chair" }
  - { time: "22:00", name: "Night routine", points: 10, pillar: D, cue: "Phone on the charger" }
focus: "Deep work"
cascade:
  year: "Lead the platform migration to production"
  month: "Move the search service to the new platform"
  week: "Search traffic on the new cluster"
  days: ["Load-test the new index", "Fix the slow-query alerts", "Shadow traffic to the new cluster"]
loop: true
---

An engineering lead can put 30 of the day's 100 points on one work routine and get more done than with five small ones. Weighting a single deep-work block this heavily works because the core of the job really is one long stretch of thinking, and every extra check-in before lunch is another chance to be interrupted.

New users usually split the working day into email, stand-up, coding, reviews and admin. It looks organised, but it doesn't match how a lead's morning actually goes. Here is the opposite setup.

| Time | Routine | Points | Step 1 |
| --- | --- | --- | --- |
| 06:00 | Wake up | 5 | Open the curtains |
| 06:30 | Exercise | 10 | Shoes on at the door |
| 07:30 | Breakfast | 5 | Kettle on |
| 08:00 | Plan the day | 10 | Open today's checklist |
| 08:40 | Deep work | 30 | Notifications off, door shut |
| 13:00 | Team time | 15 | Open the review queue |
| 17:30 | Shutdown | 10 | Write tomorrow's first task |
| 19:00 | Reading | 5 | Book on the chair |
| 22:00 | Night routine | 10 | Phone on the charger |

Nine routines share the budget: 5 + 10 + 5 + 10 + 30 + 15 + 10 + 5 + 10 = 100.

## Why one routine and not five?

Five routines before lunch means five punctuality windows to watch, and each tick pulls the lead out of the code. One block at 08:40 has a single window, from 07:40 to 09:10. You tick it as you sit down, and the rest of the morning is for the work.

Separate routines still make sense where the day really does change mode: team time after lunch, the shutdown at 17:30. A simple test: if the only thing that changes between two routines is which ticket you're on, merge them.

## What makes it worth 30?

The budget is set in More → Routines, where each routine's editor caps points at 50 and shows what's left of the 100. Deep work is where the lead's year goal moves, so it gets the most. The weight cuts both ways, though. Rescuing a missed block from **Past** costs that routine's points, so a late check-in on this one costs 30. That's a good reason to be at the desk by 09:10.

## What goes in the steps?

The checklist is where Kinetics comes from, so every step is something you can finish:

1. Notifications off, door shut
2. Re-read yesterday's stop note
3. Two hours on the main task
4. Review the two oldest pull requests
5. Write down where you stopped

Step 1 is the cue, and the reminder opens with it. Step 5 is what makes tomorrow's step 2 take thirty seconds instead of ten minutes.

## Where do interruptions go?

Something unplanned always lands at about 10:15. Tap **+** beside the chat box and type it the way you'd say it.

![The add box open over Home, adding a task with its date and time to the routine that is running](/screenshots/guide/dashboard-quicktask.jpg)

The task lands in the current routine slot with its time filled in ([the Dashboard chapter](/guide/dashboard) walks through the add box). "Reply to the platform team about the outage review by 11" becomes part of Deep work, and finishing it adds Kinetics to the same routine.

Then look at **Priority**. Anything started today sits in Do now, and this lead's rule is three. When a fourth arrives, one item gets Thursday's date and moves itself to Plan. An @mention of the person who should own it moves it to Delegate.

## How does the block feed the year?

The lead's year goal is to get the platform migration into production. This month's milestone moves the search service across, and this week's puts search traffic on the new cluster. Today's day item, "Load-test the new index", is linked to Deep work, so it shows on the routine card, and the card's Week tab shows the milestone it serves. Ticking it earns Geniuses on top of the routine's own points.

The cascade fills in from below. A week of this kind needs five met days, which is every weekday. October's milestone needs three met weeks out of four or five. The year needs six met months out of twelve.

## What happens on a day it slips?

An incident takes the whole morning and the window closes at 09:10 with nothing ticked.

- **The work happened after lunch.** Spend 30 points from **Past** to check Deep work in late. It counts as a full tick, earns its points as normal, and any agent on the routine still runs.
- **It was all firefighting.** Leave it unticked. If the load test runs on Wednesday, tick Wednesday's item when it's done. A tick added after the window reads Missed, but the week still counts it.

## Where to start

Merge the morning's work routines into one, give it the weight it really has, and write five steps you'd actually do. After seven days, check More → Progress → On the clock. If the 08:40 block is regularly ticked after 09:10, change the start time before you change the points.
