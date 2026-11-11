---
title: "Paged at 02:40: an on-call developer, the morning window and an honest record"
description: "An on-call developer goes through a night page hour by hour: what to check in late with points, when a Skip Day is the honest choice, and what the goal rules allow for."
category: work
persona: "On-call developer"
pillar: D
publishDate: 2026-11-11
readingTime: 4
tags: ["on-call", "late-check-in", "skip-day", "honest-data"]
takeaways:
  - "Capture the follow-up with + before going back to bed at 04:10. Items can't be created on a past day."
  - "Wake up's window closes at 06:30. Sleeping to 07:40 is the right call, and a 5-point late check-in is honest."
  - "Leave the missed run unticked. Checking in everything from Past makes On the clock useless."
  - "Two pages in one night means a Skip Day. You get two a week, and an on-call week is what they're for."
routines:
  - { time: "06:00", name: "Wake up", points: 5, pillar: D, cue: "Water by the bed" }
  - { time: "06:30", name: "Run", points: 10, pillar: K, cue: "Shoes on" }
  - { time: "07:30", name: "Breakfast", points: 5, pillar: D, cue: "Kettle on" }
  - { time: "08:00", name: "Plan the day", points: 10, pillar: D, cue: "Read the on-call handover" }
  - { time: "08:30", name: "Deep work", points: 30, pillar: G, cue: "Notifications off, pager on" }
  - { time: "13:30", name: "Reviews and tickets", points: 15, pillar: K, cue: "Oldest pull request first" }
  - { time: "18:00", name: "Family time", points: 10, pillar: D, cue: "Laptop shut" }
  - { time: "21:30", name: "Night routine", points: 15, pillar: D, cue: "Pager charged, phone by the bed" }
focus: "Deep work"
cascade:
  year: "Make the service quiet out of hours"
  month: "Alerting cleaned up"
  week: "A noisy alert fixed on six days this week"
  days: ["Tune the replication lag alert", "Write up the lag incident", "Delete the duplicate disk alert"]
---

An on-call developer paged at 02:40 will miss the morning window, and an honest record is one that shows the miss. On-call weeks break routines in a particular way. The day before is fine and the day after is fine, but the night of the page scrambles the morning. The temptation is either to write the whole week off or to tidy the record so nothing seems to have happened. Both are mistakes. Here's a single night, hour by hour.

| Time | Routine | Points | Step 1 |
| --- | --- | --- | --- |
| 06:00 | Wake up | 5 | Water by the bed |
| 06:30 | Run | 10 | Shoes on |
| 07:30 | Breakfast | 5 | Kettle on |
| 08:00 | Plan the day | 10 | Read the on-call handover |
| 08:30 | Deep work | 30 | Notifications off, pager on |
| 13:30 | Reviews and tickets | 15 | Oldest pull request first |
| 18:00 | Family time | 10 | Laptop shut |
| 21:30 | Night routine | 15 | Pager charged, phone by the bed |

The Night routine gets 15 points, three times Wake up, because a charged pager and a laptop already on the desk decide how bad a 02:40 page turns out to be.

## 02:40: the page

The app doesn't come into this part. The replication lag alarm fires, and the next ninety minutes are about the database. Before you go back to bed at 04:10, do one thing: tap **+** and add "Write up the replication lag incident".

![The add box open over Home, adding a task with its date and time to the routine that is running](/screenshots/guide/dashboard-quicktask.jpg)

It goes onto today's list, because 02:40 is already today ([the Dashboard chapter](/guide/dashboard) shows the add box). That matters, because you can't create a goal item on a past day. A follow-up captured at 04:10 is safe. One left until tomorrow afternoon is gone.

## 06:00: the window you'll miss

Wake up can be ticked on time from 05:00 to 06:30. You sleep until 07:40, which is the right decision after a night like that. Wake up moves to **Past**, and so does Run.

## 08:30: the window you can still make

Deep work's window runs from 07:30 to 09:00. At 08:50 you're at the desk and tick it, on time, and it counts for Discipline even on this morning. The morning's real work is the incident write-up you captured at 04:10, and it sits in the slot where it belongs.

## Which misses should you check in late?

At lunch, go through **Past** one routine at a time:

- **Wake up** happened, at 07:40. A late check-in is legitimate: it costs the routine's 5 points, keeps the streak, and counts as a full tick.
- **Run** didn't happen and isn't going to. Leave it. A missed run after a night page is accurate, not a failure.
- **Breakfast** happened late. Check it in or leave it, whichever you prefer, as long as it really happened.

Late check-ins only work on the same day, so decide at lunch, not on Friday. Yesterday's points settled overnight, so you have a balance to spend.

## When the whole day goes

Some nights include a second page at 05:30, and by 10:00 it's obvious nothing on the list is going to happen. Long-press today in the week strip and take a Skip Day. The day becomes rest, the streak survives, and nothing reads as missed. You get two a week, and an on-call week is what they're for.

What you shouldn't do is check in every routine from **Past** so the day looks clean. More → Progress → On the clock is only useful if it shows what actually happened.

## The goal that makes on-call quieter

The best Geniuses work comes out of incidents. The year goal is to make the service quiet out of hours, where every page is rare and actionable. This month's milestone is cleaning up alerting. The week milestone is a noisy alert fixed on six days of the on-call week, with day items such as "Tune the replication lag alert" linked to Deep work.

Six planned days against a threshold of five met days means one wrecked day still leaves the week able to close. Three of those weeks close the month, and six months close the year. If you fix an alert on Tuesday but only tick it on Wednesday, it still counts. It reads Missed, but the week still moves.

## Before your next on-call week

Under More → Routines, give the Night routine three steps: pager charged, laptop on the desk, runbook open in a tab. Set Wake up to **Alarm** on normal weeks only. For on-call weeks, decide in advance that the morning after a page is allowed to slip.
