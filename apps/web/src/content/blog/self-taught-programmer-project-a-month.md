---
title: "One project a month: a self-taught programmer's year that actually ships"
description: "A self-taught programmer gives each month one small project, splits it into four week milestones, and makes deploying it the tick that closes the month."
category: mind
persona: "Self-taught programmer"
pillar: G
publishDate: 2026-12-17
readingTime: 4
tags: ["programming", "projects", "monthly-goals", "geniuses"]
takeaways:
  - "A 06:30 Build routine worth 20 points carries the code. A 20:30 Read & review slot worth 15 carries docs and review."
  - "Every month runs the same four week milestones: spec and skeleton, core feature, tests and polish, ship and write up."
  - "Twelve projects are planned, but the year closes at 6 met months, and six deployed projects already make a portfolio."
routines:
  - { time: "06:00", name: "Wake up", points: 5, pillar: D, cue: "Glass of water" }
  - { time: "06:30", name: "Build", points: 20, pillar: G, cue: "Yesterday's branch checked out" }
  - { time: "08:00", name: "Get ready & commute", points: 5, pillar: D, cue: "Bag by the door" }
  - { time: "09:00", name: "Day job", points: 40, pillar: K, cue: "Open today's list" }
  - { time: "13:00", name: "Walk", points: 5, pillar: D, cue: "Shoes on" }
  - { time: "19:00", name: "Dinner", points: 5, pillar: D, cue: "Clear the table" }
  - { time: "20:30", name: "Read & review", points: 15, pillar: K, cue: "Docs open in one tab only" }
  - { time: "22:30", name: "Night routine", points: 5, pillar: D, cue: "Write tomorrow's first task" }
focus: "Build"
cascade:
  year: "Twelve small projects, each one deployed"
  month: "Project 1: a command-line to-do tool"
  week: "Week 2: the core feature"
  days: ["Parse the command flags", "Store tasks in a JSON file", "Deploy and update the README"]
---

A self-taught programmer ships more in a year by giving each month one small project and counting a month only when that project is deployed. Tutorials aren't the scarce thing. Finished work is, and a folder of half-built apps only shows you can start.

The goal cascade already has the right shape for this. A month is a project, a week is a phase, and a day is one piece of the work that gets ticked when it's done.

## The routines that carry the code

| Time | Routine | Points | Step 1 |
| --- | --- | --- | --- |
| 06:00 | Wake up | 5 | Glass of water |
| 06:30 | Build | 20 | Yesterday's branch checked out |
| 08:00 | Get ready & commute | 5 | Bag by the door |
| 09:00 | Day job | 40 | Open today's list |
| 13:00 | Walk | 5 | Shoes on |
| 19:00 | Dinner | 5 | Clear the table |
| 20:30 | Read & review | 15 | Docs open in one tab only |
| 22:30 | Night routine | 5 | Write tomorrow's first task |

Build gets 20 points: an hour of fresh attention before the day job takes it. The 20:30 slot is lighter work at a lower weight, reading docs and reviewing the morning's code.

Build's steps never change: check out yesterday's branch, read the last commit message, write one failing test, make it pass, then commit with a message that says what's next. That last step is the cue for tomorrow.

## What does the year look like?

The year goal is "Twelve small projects, each one deployed". Each month milestone is one project, kept small on purpose: a command-line to-do tool, a static site generator for your notes, a weather dashboard on a public API, a small web app with sign-in, a browser extension, a scraper on a schedule. That's six, and then six more.

Every month runs the same four week milestones:

1. **Spec and skeleton.** One page of spec, the repo, a hello-world deployed on day one.
2. **The core feature.** The one thing the project exists to do.
3. **Tests and polish.** Edge cases, error messages, a README.
4. **Ship and write up.** Deploy it properly and write a short post on what you learned.

Day items sit under the weeks and link to Build: "Parse the command flags", "Store tasks in a JSON file", "Deploy and update the README". Tag the routine with the project, say `project:cli-todo`, and its chat opens with a **Before you start** brief listing next steps and what you did last time. Monday doesn't begin with twenty minutes of re-reading your own code.

![Goals with the period ladder, the month calendar of day rings and today's goals grouped by routine](/screenshots/guide/goals-calendar.jpg)

Under Goals → Month, the calendar puts a ring on every day, so a project month with a blank week stands out by the 10th ([the Goals chapter](/guide/goals) shows the other views).

## What counts as shipped?

You set this rule yourself: **a month counts only if the deploy happened.** The last day item of week four is always "Deployed and written up", and you tick it only when it's true.

The app's thresholds do the rest. With 7 days planned in a phase, 5 met days close the week, so one lost evening doesn't sink it. A month closes at 3 met weeks out of 4, which can absorb one rough week as long as it isn't the ship week. And the year closes at 6 met months: twelve is the ambition, and six deployed projects already make a portfolio. Each linked item earns Geniuses points, and a deploy that closes a week and then a month outweighs another tutorial chapter.

When week two shows that "a small web app with sign-in" is really a month's work on its own, cut the milestone down to "Sign-in only, deployed" and move the rest to next month. Editing mid-project is the plan improving, not the plan failing.

## When the 06:30 session slips

A late night, and Build starts at 07:20. Its window closed at 07:00, so Home moves it to **Past**. Write the code anyway, then spend points that same day for a late check-in. The streak carries on, and the tick earns what an on-time one would. A day item ticked late shows Missed and still counts toward the week.

If that happens every Monday, move Monday's day items to the 20:30 routine instead of paying for the same slip each week.

## Start this month

- Pick one project small enough to deploy in four weeks.
- Write the four week milestones before any code.
- Make "Deployed and written up" the last item, and tick it only when it's real.
