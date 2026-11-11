---
title: "People time: an engineering manager gives the 1:1 prep to an agent"
description: "An engineering manager binds an agent to the afternoon people-time routine so 1:1 prep starts when the routine does, then audits it through idle, listening and finished."
category: work
persona: "Engineering manager"
pillar: K
publishDate: 2026-12-04
readingTime: 4
tags: ["agents", "one-on-ones", "automation", "manager"]
takeaways:
  - "People time at 14:00 carries 25 points, the same as the team's focus block, because for a manager the 1:1s are the job."
  - "The agent's start event calls an n8n flow with {{ goal_id }} in the URL, so the flow knows which 1:1 it's preparing."
  - "Rising failure counts are the audit. An expired connection shows up there before you notice a summary is missing."
  - "Agents still run on a late check-in, so prep still arrives when an outage review pushes the 1:1s to 15:10."
routines:
  - { time: "06:30", name: "Wake up", points: 5, pillar: D, cue: "Water by the bed" }
  - { time: "07:00", name: "Exercise", points: 10, pillar: K, cue: "Kit on" }
  - { time: "08:30", name: "Plan the day", points: 10, pillar: D, cue: "Open Priority" }
  - { time: "09:00", name: "Stand-up and focus", points: 25, pillar: K, cue: "Open the team board" }
  - { time: "14:00", name: "People time", points: 25, pillar: G, cue: "Open today's 1:1 list" }
  - { time: "16:30", name: "Reviews and decisions", points: 15, pillar: K, cue: "Open the oldest review" }
  - { time: "22:00", name: "Night routine", points: 10, pillar: D, cue: "Phone on the charger" }
focus: "People time"
cascade:
  year: "Every report has a growth plan they agree with"
  month: "A growth conversation with each of the six"
  week: "1:1s held and notes filed every weekday"
  days: ["1:1 with the backend lead", "1:1 with the newest hire", "1:1 with the QA engineer"]
---

An engineering manager can hand the 1:1 prep to an agent that starts when the afternoon People time routine does. With six reports and one or two 1:1s every weekday, the conversations themselves go well. The ten minutes before each one, spent scrolling last week's pull requests and tickets, is a repeated chore, and repeated chores are what agents are for.

This guide covers the routine, then the agent, then the goal they both serve.

| Time | Routine | Points | Step 1 |
| --- | --- | --- | --- |
| 06:30 | Wake up | 5 | Water by the bed |
| 07:00 | Exercise | 10 | Kit on |
| 08:30 | Plan the day | 10 | Open Priority |
| 09:00 | Stand-up and focus | 25 | Open the team board |
| 14:00 | People time | 25 | Open today's 1:1 list |
| 16:30 | Reviews and decisions | 15 | Open the oldest review |
| 22:00 | Night routine | 10 | Phone on the charger |

People time has the same 25 points as the team's focus block. For a manager, 1:1s are the job, not a break from it.

## Step 1: give the routine real steps

Open People time under More → Routines and give it five steps:

1. Open today's 1:1 list
2. Read the prep summary for each person
3. Hold the 1:1s
4. Write two lines in each 1:1's notes
5. File the follow-ups as quick tasks

Each 1:1 is also a day item linked to People time, such as "1:1 with the backend lead", so it shows on the card. The two lines from step 4 go in that item's notes, which means next week's prep starts with something already written. Working through the five steps and closing the follow-ups during the slot is where this routine's Kinetics comes from.

## Step 2: build the agent

You can start from the Agents page, or from **Build Agent** in the add box at the moment you realise you're doing something for the third time. The editor asks for four things:

- **Name:** 1:1 prep.
- **Routine:** People time. An agent belongs to exactly one routine and runs on that routine's schedule.
- **Start event:** the URL of an n8n flow that collects each report's merged pull requests and open tickets from the past seven days and writes a short summary. Put `{{ goal_id }}` in the URL and it becomes the item's id when the event fires.
- **End event (optional):** a second flow that files the notes when you finish.

## Step 3: what does a healthy agent look like?

The agent moves from idle to listening while you work, then finished, and the table keeps success and failure counts for each agent.

![A finished agent attached to a 15:00 routine, with every lifecycle step done and its success and failure counts](/screenshots/guide/agents-lifecycle.jpg)

That count is the audit ([the Agents chapter](/guide/agents) shows the full table). If the flow's connection to the code host expires, you won't notice the missing summaries for a while, but the failure count will start rising. Work started with an agent also shows up in the Automate quadrant of **Priority**, so when the same manual chore fills Do now twice a week, that's the next agent to build.

## Which goal does People time serve?

The year goal is for every report to have a growth plan they agree with. This month's milestone is a growth conversation with each of the six. The week milestone is 1:1s held and notes filed every weekday, with the named 1:1s as day items underneath.

A five-weekday rota fits the week's rule exactly: five met days, where a day counts once every item linked to the week that day is ticked. The month needs three of those weeks, and the year needs six of those months. Every ticked 1:1 that sits inside this cascade earns Geniuses on top of the routine's points.

## When the afternoon slips

An outage review runs from 13:30 to 15:00, and People time's window, 13:00 to 14:30, closes before the manager is back at the desk.

- **The 1:1s happened from 15:10.** Spend the routine's 25 points from **Past** to check it in. The streak holds, and the agent still runs on a late check-in, so the prep still arrives.
- **A 1:1 was cancelled.** Move the item to another day instead of deleting it.
- **A 1:1 happened but its item was never ticked.** Tick it the next morning. It reads Missed, but the week still counts it.

## Start small

Build one agent for one routine, and only for a chore you've done by hand at least five times. Check its success and failure counts on Friday. If they're clean, the next chore that keeps appearing in Do now is the one to automate.
