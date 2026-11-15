---
title: "Connect Routine Notes to Claude in four steps"
description: "Add the Routine Notes connector to Claude, approve it on the Allow page, and learn the thirteen tools Claude can use to read your day and change your goals."
category: mcp
persona: "Claude user setting up the connector"
pillar: G
publishDate: 2026-11-11
readingTime: 4
tags: ["mcp", "claude", "setup", "connector"]
takeaways:
  - "The server URL is https://mcp.routinenotes.app/mcp. Claude needs no API key, no client secret and no Client ID."
  - "The Allow page grants exactly two things: reading routines, goals, notes and points, and adding, changing and ticking goals."
  - "Thirteen tools cover reading the day, writing goals, planning, progress reports and a GraphQL escape hatch."
  - "Routine check-ins stay in the app, inside each routine's 1h 30m window; the connector works with goals."
mcp:
  client: "Claude"
  prompt: "What does my day look like? List my routines with their start times and the goals each one feeds."
  tools: ["get_current_date", "get_routine", "get_daily_goals"]
howTo:
  name: "Connect Routine Notes to Claude"
  steps:
    - { name: "Open Connectors", text: "In Claude, open Settings → Connectors." }
    - { name: "Add a custom connector", text: "Click Add custom connector." }
    - { name: "Paste the server URL", text: "Name it Routine Notes and paste https://mcp.routinenotes.app/mcp." }
    - { name: "Connect and allow", text: "Click Connect, sign in to Routine Notes if asked, then click Allow." }
---

To connect Routine Notes to Claude you add one custom connector and approve it on a Routine Notes page: four steps, about two minutes, no keys to copy. After that, Claude can read your routines and goals and change goals when you ask it to.

Routine Notes speaks the Model Context Protocol (MCP), the standard way for an AI app to use another app's data with your permission. This post covers the setup, what the permission page means, and what Claude can do once it's in.

## What do you need before you start?

- A Routine Notes account. Web, iOS and Android all use the same one.
- Claude, with custom connectors available in its settings.
- The server URL. In the app it's under **More → Profile → Connect AI**, with a copy button, but it never changes:

```
https://mcp.routinenotes.app/mcp
```

The Connect AI card also shows a Client ID, `routine-notes-mcp`. Claude doesn't need it, because it registers itself. Only n8n's credential form asks for it.

## The four steps

1. In Claude, open **Settings → Connectors**.
2. Click **Add custom connector**.
3. Name it *Routine Notes* and paste the server URL.
4. Click **Connect**. A Routine Notes page opens. Sign in if asked, then click **Allow**.

Sign-in is standard MCP OAuth with PKCE, so Claude gets access by asking you, not from a password pasted into a field.

## Reading the Allow page

The page asks one question, *Allow Claude to use Routine Notes?*, and shows the account you're signed in as, with a *Not you?* link. Below that, it lists what Claude will be able to do:

- See your routines, goals, notes and points
- Add and change goals, and tick them off

A final line names the host that **Allow** sends you back to. A look-alike app can copy the wording, but not that host, so read it. Access lasts until you disconnect Routine Notes in Claude. Back in the app, the Connect AI card's chip changes from *Not connected* to *Connected*.

## What can Claude do once it's connected?

You never call tools yourself. You ask in plain language, and Claude picks from thirteen:

| Tool | What it's for |
| --- | --- |
| `get_current_date` | Today's date in DD-MM-YYYY, so "today" means today |
| `get_routine` | A day's routines: times, points, ticked or passed, steps, D/K/G earned |
| `get_daily_goals` | Every goal active on a date, from day items up to the year |
| `search_goals` | Full-text search over goal items and their notes |
| `add_goal_item` | Add one item at any horizon, linked to a routine or a parent |
| `bulk_add_goal_items` | Add many items in one call |
| `complete_goal_item` | Tick or untick an item; completion cascades upward |
| `reschedule_goal_item` | Move an item to another date, keeping the original |
| `generate_milestone_plan` | Draft a dated milestone plan from one sentence |
| `extract_day_task` | Turn a messy sentence into a structured task |
| `get_progress` | D, K and G totals plus goal completion over a date range |
| `get_priority_goals` | A day's items in Do now, Plan, Delegate and Automate |
| `graphql_query` | Anything else in the published schema |

The server also tells Claude to call `get_current_date` first whenever you say "today" or "tomorrow", so dates come from the clock, not a guess.

## A first prompt, worked through

Start with something that only reads:

> What does my day look like? List my routines with their start times, and the goals each one feeds.

Say it's 06:40 on 11-11-2026. Claude calls `get_current_date`, then `get_routine` for 11-11-2026, then `get_daily_goals` for the same date. An example of the routine result, trimmed:

```json
{ "routineDate": { "date": "11-11-2026", "tasklist": [
  { "name": "Wake up", "time": "05:30", "points": 5, "ticked": true },
  { "name": "Run", "time": "07:20", "points": 10, "ticked": false, "passed": false }
] } }
```

From that, a good answer reads: 2 of 9 routines done, Run at 07:20 is next and its window is open until 07:50, and today's interval session is 1 of the 3 runs your week goal asks for. Each of those numbers comes from your account, not from Claude's imagination.

Each conversation reads fresh data through the tools. Ask the same question at 12:00 and the answer reflects the ticks you made since breakfast.

## What goes wrong during setup, and how to recover

- **"This connection link isn't valid."** The sign-in request has expired. Go back to Claude and click Connect again.
- **The wrong account on the Allow page.** Use *Not you?* before allowing, not after.
- **The chip still says Not connected.** The Allow step didn't finish. Repeat step 4.
- **A host you don't recognise.** Click **Cancel**. Nothing is granted until you click Allow.

## What stays in the app

Ticking a routine is something you do in Routine Notes, inside its punctuality window, because Discipline measures you showing up. If a window has passed, check the routine in late from **Past** on Home the same day. The connector's job is goals, plans and reading points. For the cascade Claude writes into, see the [Goals chapter](/guide/goals). For a daily use, try the [morning briefing](/blog/morning-briefing-from-claude).
