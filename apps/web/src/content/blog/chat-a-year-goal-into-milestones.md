---
title: "Chat a year goal into dated milestones with Claude"
description: "Use generate_milestone_plan to draft a plan, argue with it, then save it with bulk_add_goal_items, linked to a parent goal and to the routine that will do the work."
category: mcp
persona: "Goal-setter with a big, vague ambition"
pillar: G
publishDate: 2026-11-11
readingTime: 3
tags: ["mcp", "claude", "year-goals", "milestones"]
takeaways:
  - "Ask for a draft first and say \"don't save\": generate_milestone_plan returns dated entries without touching your account."
  - "Plan at least 6 month milestones, because a year goal closes at 6 met months; 8 or 10 is ambition, not a higher bar."
  - "Save the year goal first, then every milestone with its id as goalRef and isMilestone set to true."
  - "Link everything to one routine with taskRef so the plan appears on that routine's Week, Month and Year tabs."
mcp:
  client: "Claude"
  prompt: "I want to get competent at product design in 2027. Draft a milestone plan, but don't save anything yet."
  tools: ["generate_milestone_plan", "get_routine", "add_goal_item", "bulk_add_goal_items"]
---

You can chat a year goal into dated milestones with Claude in four moves: draft the plan, argue with it, pick the routine that will carry it, then save it in two calls. The difference from a form is the arguing. You can tell Claude "too much in March" before a single goal exists in your account.

"Get properly good at product design" can't be scheduled. A month milestone can, and so can a Tuesday item on a 19:00 routine. Routine Notes has an in-app AI plan for this too, and the connector ([setup](/blog/connect-routine-notes-to-claude)) brings the same idea into a conversation.

## Step 1: draft, don't save

> I want to get competent at product design in 2027: finish a recognised course, build three portfolio pieces and run one real usability test. Draft a milestone plan with Routine Notes, but don't save anything yet.

Claude calls `generate_milestone_plan` with your sentence as the `query`. It returns a title and entries, each with a `period`, `periodName`, `date` and description. An example, trimmed:

```json
{ "period": "year", "title": "Product design competence plan",
  "entries": [
    { "period": "month", "periodName": "January", "date": "31-01-2027",
      "title": "Foundations: course modules 1-3" },
    { "period": "month", "periodName": "February", "date": "28-02-2027",
      "title": "Portfolio piece 1: redesign a sign-up flow" },
    { "period": "month", "periodName": "March", "date": "31-03-2027",
      "title": "Run a five-person usability test" }
  ] }
```

The entries come back already dated for their period, so once you agree, they can be saved as they are.

## Step 2: argue with it

> March is too early for a usability test, swap it with the second portfolio piece. I'm travelling most of July, so make July a light review month.

Claude rewrites the draft in the chat. Your account hasn't changed yet. Check two numbers before going further:

- **At least 6 months.** A year goal closes once 6 of its month milestones are met. This draft has 10, January to October with July kept light, which leaves 4 months of slack. Fewer than 6 could never close.
- **At least 3 real weeks per month.** A month closes at 3 met weeks. July, with 2 weeks at home, can't carry a heavy milestone, which is why it became a review month.

## Which routine should carry the plan?

> Which of my routines should this live under?

Claude calls `get_routine` for today and lists your routines with their ids. Say you pick *Design practice* at 19:00, 15 points, three evenings a week. Its id becomes the `taskRef` on everything you save, so the plan shows up on that routine's Week, Month and Year tabs on Home.

## Step 3: save the parent, then the milestones

The year goal goes in first, through `add_goal_item`:

```json
{ "body": "Product design competence plan", "period": "year",
  "date": "31-12-2027", "taskRef": "<design practice id>" }
```

That call returns the new item's `id`. All 10 milestones then point at it through `goalRef`, with `isMilestone: true`, in a single `bulk_add_goal_items` call:

```json
{ "goals": [
  { "body": "Foundations: course modules 1-3", "period": "month",
    "date": "31-01-2027", "isMilestone": true,
    "goalRef": "<year goal id>", "taskRef": "<design practice id>" }
] }
```

Ask to see the final list once more before it's sent. One "yes, save it" from you is a good habit.

## Let the weeks come from the week

Don't save 52 week milestones now. They're better written each Monday, when you know what the month actually looks like:

> Add this week's milestone under January: "Finish module 2 and write up notes", linked to Design practice.

That's `add_goal_item` with `period: "week"`, the January milestone as `goalRef`, and `isMilestone: true`. Then the cascade does the arithmetic: 5 met days close a week, 3 met weeks close January, and 6 met months close 2027. In the app, **Goals → Year Goals** shows the plan as a 12-month strip that fills in as months close.

## What if the plan slips in March?

It probably will, at least once. Don't delete the March milestone. Rewrite it on the Year Goals page, or push its content into April. With 10 months planned and 6 needed, one bad month leaves the year intact. Deleting would erase the record that the plan changed, and re-planning mid-year is exactly what Geniuses rewards.

If individual day items slip, ticks still count when they're late: an item done on Thursday and ticked on Saturday moves the week, even though its status says *Missed*. For how the cascade fits together in the app, see the [Goals chapter](/guide/goals).
