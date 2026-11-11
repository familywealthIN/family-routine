---
title: "Ask your own history: search_goals as a memory you can talk to"
description: "Use search_goals to ask Claude what you did last time, filter it by routine or tag, and reach for graphql_query when you want a week of D, K and G day by day."
category: mcp
persona: "Note-taker who never rereads their notes"
pillar: G
publishDate: 2026-11-12
readingTime: 4
tags: ["mcp", "claude", "search", "notes"]
takeaways:
  - "search_goals searches goal items and their notes, and can be narrowed to one routine (taskRef) or one tag."
  - "Asking \"what did I do last time?\" brings back three weeks of context in your own words in seconds."
  - "graphql_query with weekStimuli returns D, K and G for each day of a week, with Skip Days flagged."
  - "Search only finds what you wrote: one line of notes and consistent words make it work."
mcp:
  client: "Claude"
  prompt: "Find everything about the conference talk. What did I last work on, and what did I write in the notes?"
  tools: ["search_goals", "get_routine", "graphql_query"]
---

To ask your own history a question, give Claude a topic and let it run `search_goals`. That tool searches your goal items and the notes on them, which makes your Routine Notes record a memory you can talk to. It answers "what did I do last time?" in your own words instead of a summary someone else wrote.

Notes apps are good at storing pages and bad at returning them when you need them. In Routine Notes, notes live on the goal item they belong to, in its contribution field, so they're filed by what you were doing that day. With the connector in Claude ([setup](/blog/connect-routine-notes-to-claude)), that record becomes searchable by conversation.

## What does search_goals take?

- `query`: the words to look for, at least 2 characters.
- `limit`: an optional cap on items returned. The default is 50.
- `taskRef`: optionally, one routine's id, to search only that routine.
- `tags`: optionally, one tag, such as `project:thesis`.

It returns matching goals with only the matching items inside them, each with its date, period, completion, status and notes.

## "What did I do last time?", worked through

You paused work on a conference talk 21 days ago and want to pick it up tonight at 19:00:

> Using Routine Notes, find everything about the conference talk. What did I last work on, and what did I write in the notes?

Claude calls `search_goals` with `query: "conference talk"`. It gets back 7 items across 3 weeks. The most recent, as an example:

```json
{ "date": "21-10-2026", "period": "day",
  "body": "Rehearse the conference talk: sections 1-3",
  "isComplete": true, "status": "done",
  "contribution": "Section 2 runs long. Cut the second case study. Next: record a full run-through." }
```

From that, Claude answers: on 21-10-2026 you rehearsed sections 1 to 3, section 2 ran long, you decided to cut the second case study, and the next step was a full recorded run-through. That's three weeks of context back in about 15 seconds.

The app has the same idea built in. Each routine's chat on Home opens with a *Before you start* brief and a *What did I do last time?* quick reply. In the app you can also search from the add box: **Home → + → Search**. The connector brings it into Claude, where you may be drafting the talk anyway.

## Narrowing a search

Broad words match too much. Two filters help:

> Search only my Writing routine for "chapter".

Claude gets the Writing routine's id from `get_routine` and passes it as `taskRef`. If you tag by area and project:

> Search the project:thesis tag for "methods". Most recent first, 10 items.

That's `tags: "project:thesis"` and `limit: "10"`. Tags nest with a colon, so a consistent scheme set up in January pays off when you're hunting for one decision in September.

## Questions worth asking

- *When did I last do a long run, and what did I note about it?*
- *Which chapter items did I reschedule more than once?* Rescheduled items keep their original date, so repeat moves show up.
- *What did I write after the last 2 client workshops?*
- *Have I ever closed a week goal for my night routine?*

These are Geniuses questions: they improve the plan by showing what actually happened.

## When you want numbers: graphql_query

For anything outside the 12 named tools, `graphql_query` runs an operation from the published schema. Claude can read the schema from the `graphql://schema` resource. A useful one is `weekStimuli`, which gives D, K and G for each day of the week that contains a date:

```graphql
query { weekStimuli(date: "11-11-2026") { date D K G skipped } }
```

An example result might show Monday at D 65, K 58 and G 80, Tuesday down to D 30, K 41 and G 25, and Wednesday at zeros with `skipped: true`. That flag marks a Skip Day, a rest day you chose. Ask Claude to keep skipped days apart from bad ones, so a planned rest doesn't read as a collapse.

Use `graphql_query` for reading unless you know exactly what a mutation does. The named tools handle the common writes better.

## Why does a search miss what you wrote?

Usually for one of three reasons:

1. **You never wrote it down.** Search only finds text. Write one line of notes when you tick something meaningful: what happened, and what's next.
2. **You used different words.** "Conference talk" on Monday and "keynote" on Friday means two searches forever. Pick a name and stick with it.
3. **The query is too short or too broad.** Two characters is the minimum, but a word like "plan" matches hundreds of items. Add a tag or a routine filter.

Each conversation starts by reading fresh data through the tools, so the answer reflects what's in your account at that moment. Keep the account well written and the answers stay good.
