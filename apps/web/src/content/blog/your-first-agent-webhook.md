---
title: "Your first agent: bind one webhook to one routine and watch it run"
description: "A practical first agent: pick the routine you repeat most, point its start event at a webhook with {{ goal_id }}, and read the lifecycle and counts to know it works."
category: playbook
persona: "Automation tinkerer"
pillar: K
publishDate: 2026-11-11
readingTime: 4
tags: ["agents", "webhook", "automation", "n8n"]
takeaways:
  - "Automate the chore you do every time a routine starts, not the interesting one: here, posting the day log at 17:30."
  - "An agent has a name, one routine, a start event URL and an optional end event; {{ goal_id }} is filled in when it fires."
  - "Watch idle → listening → finished, and read the success and failure counts weekly for the first 2 weeks."
  - "A late check-in from Past still fires the agent, so a 17:50 rescue posts the log anyway."
routines:
  - { time: "06:30", name: "Wake up", points: 5, pillar: D, cue: "Fill a glass of water" }
  - { time: "07:00", name: "Run", points: 10, pillar: K, cue: "Lace the running shoes" }
  - { time: "08:30", name: "Deep work", points: 35, pillar: G, cue: "Close every tab but one" }
  - { time: "12:30", name: "Lunch walk", points: 5, pillar: D, cue: "Shoes on, keys in pocket" }
  - { time: "14:00", name: "Admin", points: 15, pillar: K, cue: "Open the inbox" }
  - { time: "17:30", name: "Shutdown", points: 10, pillar: D, cue: "Write tomorrow's first step" }
  - { time: "19:00", name: "Reading", points: 10, pillar: K, cue: "Phone in another room" }
  - { time: "22:30", name: "Night routine", points: 10, pillar: D, cue: "Phone on charge outside the bedroom" }
focus: "Shutdown"
cascade:
  year: "Ship the reporting rebuild by June"
  month: "January: migrate the first two dashboards"
  week: "Post a day log on five workdays"
  days: ["Shutdown: day log posted", "Write tomorrow's first step"]
howTo:
  name: "Bind your first agent to a routine"
  steps:
    - { name: "Pick the routine", text: "Choose the routine whose opening chore you repeat every time, such as posting a day log at Shutdown." }
    - { name: "Create the agent", text: "Open Agents, create an agent, give it a name and bind it to that routine." }
    - { name: "Add the start event", text: "Paste your webhook URL as the start event, with {{ goal_id }} where the task id should go. Leave the end event empty." }
    - { name: "Watch it run", text: "Start the routine's task and watch the agent go from idle to listening to finished, then check its success and failure counts." }
---

Your first agent should bind one webhook to one routine, the routine whose opening chore you repeat every single time, and then you should watch it run for two weeks before building a second. Most people who like automation start with the interesting job instead of the repetitive one. The boring choice is the right one, because it makes the routine start faster and leaves the slot for the work.

## What is an agent in Routine Notes?

A worker bound to exactly one routine. It has:

- a **name**,
- the **routine** it serves, whose schedule becomes its schedule,
- a **start event**, a URL that fires when you start the task,
- an optional **end event**, a URL that fires when you finish it.

The URL can be an n8n webhook, your own small endpoint, or any service that takes a webhook. Write `{{ goal_id }}` inside it and the task's id is filled in when the event fires, so the receiving end knows which item started. Every agent answers to a routine, and the Agents page lists each one with the routine it serves.

## Step 1: find the repetition

Look at one week of a routine and ask what you do every time before the real work begins. Here's a working day with three candidates:

| Time | Routine | Points | Step 1 | Agent candidate? |
| --- | --- | --- | --- | --- |
| 06:30 | Wake up | 5 | Fill a glass of water | No |
| 07:00 | Run | 10 | Lace the running shoes | No |
| 08:30 | Deep work | 35 | Close every tab but one | Yes: open today's ticket notes |
| 12:30 | Lunch walk | 5 | Shoes on, keys in pocket | No |
| 14:00 | Admin | 15 | Open the inbox | Yes: pull overnight requests |
| 17:30 | Shutdown | 10 | Write tomorrow's first step | Yes: post the day log |
| 19:00 | Reading | 10 | Phone in another room | No |
| 22:30 | Night routine | 10 | Phone on charge outside the bedroom | No |

All 100 points are spoken for, and the three candidates are all work routines. *Shutdown* is the safest first pick: at 17:30 the day log should start on its way, and nothing else depends on it if a run fails. If you're unsure which routine repeats most, **More → Routines** shows the whole day as a dial and timeline.

The Priority view gives a second hint. A manual chore that lands in **Do now** twice a week is a chore asking for an agent.

## Step 2: wire it

Open **Agents** and create one:

1. **Name:** *Day log*.
2. **Routine:** Shutdown.
3. **Start event:** your webhook, with the id in the URL:

```
https://n8n.example.com/webhook/day-log?goal={{ goal_id }}
```

4. **End event:** empty for now. Add one later if you want a second signal when you finish.

![The Edit agent dialog with the agent's name, the routine it is bound to, and its start and end event URLs](/screenshots/guide/agents-editor.jpg)

That's the whole form ([the Agents chapter](/guide/agents) walks through every field). There's also a shortcut: the add box on Home has a **Build Agent** button beside Start Task, for the moment you notice a repetition mid-day.

What the webhook does is your side's business: append to a sheet, post a message, build a summary. Routine Notes fires it at the right moment with the right id.

## Step 3: watch the lifecycle

Start Shutdown's task at 17:35 the next day with the Agents page open. The agent moves through three states:

- **Idle:** waiting for its routine.
- **Listening:** the task has started and the agent is working with it.
- **Finished:** the run is over, marked success or failure.

Each agent keeps its own success and failure counts. After 10 workdays you might read 9 and 1. That one failure is a number you can investigate, not a vague feeling that the log went missing once. A task started with an agent also files itself in Priority's **Automate** quadrant, so that column doubles as a list of your automations.

## What if the agent fails or the routine runs late?

- **The failure count climbs.** Open the agent and test the URL by hand, and check whether the webhook address has changed on your side.
- **You miss the window.** Shutdown's window runs from 16:30 to 18:00. Miss it, and at 18:10 the routine sits in **Past** on Home. Check it in late with its 10 points that evening and the agent still fires. The late check-in is a full tick, so the day log posts and the streak survives.
- **You automate the wrong thing.** If the agent saves you nothing after a week, delete it. Agents are cheap to remove.

## What does an agent do for your points?

It earns nothing directly. Kinetics still comes from ticking the routine's steps and finishing the tasks in its slot. What the agent removes is the friction of the first five minutes, which is where routines get abandoned. Fewer abandoned starts mean more on-time ticks (Discipline) and more of the checklist done (Kinetics).

Run the one agent for two weeks. If successes climb and failures stay flat, give a second routine its own agent.
