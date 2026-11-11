---
title: "No boss, no stand-up: a freelancer lets the punctuality window be the client"
description: "A freelance developer with no fixed hours turns client blocks into routines, lets the 1h 30m window do a manager's job, and logs each start with an agent."
category: work
persona: "Freelance developer"
pillar: D
publishDate: 2026-11-11
readingTime: 4
tags: ["freelance", "punctuality", "agents", "client-work"]
takeaways:
  - "Give each client its own routine, weighted by its share of the week: 30 points for the morning client, 25 for the afternoon one."
  - "An 08:30 block is on time from 07:30 to 09:00. After a fortnight, On the clock shows which client keeps starting late."
  - "An agent's start event can add a row to your own timesheet, and it fires on a late check-in too, at the late time."
routines:
  - { time: "07:00", name: "Wake up and walk", points: 10, pillar: D, cue: "Keys and headphones by the door" }
  - { time: "08:00", name: "Admin and inbox", points: 5, pillar: K, cue: "Inbox open, timer on" }
  - { time: "08:30", name: "Client A block", points: 30, pillar: G, cue: "Open the client's board" }
  - { time: "12:30", name: "Lunch away from the desk", points: 5, pillar: D, cue: "Laptop lid closed" }
  - { time: "13:30", name: "Client B block", points: 25, pillar: K, cue: "Pull the latest branch" }
  - { time: "16:30", name: "Own product", points: 10, pillar: G, cue: "Open the roadmap note" }
  - { time: "18:00", name: "Exercise", points: 10, pillar: K, cue: "Gym bag on the shoulder" }
  - { time: "22:00", name: "Wind-down", points: 5, pillar: D, cue: "Desk light off" }
focus: "Client A block"
cascade:
  year: "Deliver Client A's product rebuild"
  month: "Redesigned onboarding live"
  week: "Onboarding screens through review"
  days: ["Empty-state screens", "Address the review notes", "Hand off the sign-up flow"]
---

A freelancer with no boss and no stand-up can let the punctuality window act as the client who checks when work starts. Without it, a 09:00 start drifts to 10:30 within a month, and nobody notices because nobody is watching.

This is a five-step setup for a freelance developer with two retainer clients and a product of their own.

| Time | Routine | Points | Step 1 |
| --- | --- | --- | --- |
| 07:00 | Wake up and walk | 10 | Keys and headphones by the door |
| 08:00 | Admin and inbox | 5 | Inbox open, timer on |
| 08:30 | Client A block | 30 | Open the client's board |
| 12:30 | Lunch away from the desk | 5 | Laptop lid closed |
| 13:30 | Client B block | 25 | Pull the latest branch |
| 16:30 | Own product | 10 | Open the roadmap note |
| 18:00 | Exercise | 10 | Gym bag on the shoulder |
| 22:00 | Wind-down | 5 | Desk light off |

## 1. Turn each client into a routine

Each engagement gets a routine with a fixed start time and points that reflect its share of the week. Client A has the mornings, so it gets 30. Client B gets 25. The freelancer's own product gets 10. That's an honest split of the hours, even if it isn't the order they'd choose if nobody were paying.

Tag each client routine, for example `project:client-a`. When the block starts, the routine chat's "Before you start" brief shows the project's standing commitment, up to three next steps and the last three things you did, so Monday doesn't begin with ten minutes of trying to remember where you were.

## 2. Who checks the start time when nobody does?

The window does. Client A starts at 08:30, so you can tick it on time from 07:30 until 09:00. Tick inside that and it earns Discipline. Tick at 09:20 and the app records exactly that, with no comment and no penalty beyond what you didn't earn.

Two weeks in, open More → Progress and look at *On the clock*, broken down by routine. For most freelancers the afternoon block is the one that slips. A long lunch at 12:30 rarely ends at 13:30.

## 3. Wire an agent to log the start

Bind an agent to the Client A block and point its start event at an endpoint you own. An n8n webhook that adds a row to a timesheet is the usual choice.

![The Edit agent dialog with its name, the routine it is bound to, and start and end event URLs](/screenshots/guide/agents-editor.jpg)

The editor asks for four things: a name, the routine to bind to, a start event and an optional end event ([the Agents chapter](/guide/agents) covers each field). Put `{{ goal_id }}` in the URL and it's filled in when the event fires. If you add an end event, the same flow can record when you stopped.

The agent goes from idle to listening to finished, and its success and failure counts show you if the webhook ever breaks. One thing to know: agents also run on late check-ins. Rescue the block from **Past** at 11:00 and the timesheet gets an 11:00 row. It's accurate, but it isn't flattering.

## 4. Put each engagement on the cascade

Client A's rebuild is the year goal. This month's milestone is getting the redesigned onboarding live. The week milestone is getting the onboarding screens through review. Each day item, such as "Empty-state screens", is linked to the Client A block, so it appears on that routine's card.

The roll-up is mechanical. This week closes after five days with every linked item ticked. The month closes after three met weeks, and the rebuild's year closes after six met months. The 16:30 Own product slot has its own year goal, shipping version 1, which moves forward one small day item at a time. Both chains earn Geniuses whenever a linked item is ticked.

## 5. Decide in advance what a slipped day costs

Freelance days slip for good reasons: a client moves a call, or a production bug needs fixing at 07:00. Set the rules before it happens:

- **The block happened, just later.** Spend 30 points from **Past** to check it in the same day. The streak holds and the late tick counts in full.
- **A gap between contracts.** Long-press today in the week strip and take a Skip Day. You get two a week, and a skipped day doesn't break the streak.
- **The work was done but never ticked.** Tick Tuesday's item on Wednesday. It reads Missed, but it still counts toward the review week.

## The first week

Set up the routines, give each client a project tag, and wire one agent, only to the 30-point block. Don't change any start times for seven days. Then compare *On the clock* with the times you wrote down and move whichever one turned out to be fiction.
