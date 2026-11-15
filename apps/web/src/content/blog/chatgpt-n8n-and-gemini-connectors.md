---
title: "One connector, three more clients: ChatGPT, n8n and Gemini CLI"
description: "The Routine Notes MCP server isn't only for Claude. Set it up in ChatGPT, an n8n agent or Gemini CLI, and wire an n8n flow to a routine's start event."
category: mcp
persona: "Automation builder"
pillar: K
publishDate: 2026-11-23
readingTime: 3
tags: ["mcp", "n8n", "chatgpt", "gemini", "automation"]
takeaways:
  - "Every MCP client uses the same URL, https://mcp.routinenotes.app/mcp, and the same Allow page; no API key or secret."
  - "n8n is the only client that asks for the Client ID, routine-notes-mcp, shown under Profile → Connect AI."
  - "A Sunday 18:00 n8n flow can call get_progress for the last 7 days and send a 3-line summary, read-only."
  - "Point a routine agent's start event at an n8n webhook with {{ goal_id }} to prepare each session automatically."
mcp:
  client: "n8n"
  prompt: "Call get_current_date, then get_progress for the last 7 days. Summarise D, K and G in three lines."
  tools: ["get_current_date", "get_progress", "graphql_query", "search_goals"]
howTo:
  name: "Add the Routine Notes connector to ChatGPT, n8n or Gemini CLI"
  steps:
    - { name: "Copy the server URL", text: "In Routine Notes, open More → Profile → Connect AI and copy https://mcp.routinenotes.app/mcp." }
    - { name: "ChatGPT", text: "Turn on Developer mode under Settings → Apps & Connectors → Advanced, click Create, paste the URL and choose OAuth." }
    - { name: "n8n", text: "Add an MCP Client Tool node: the URL as endpoint, HTTP Streamable transport, MCP OAuth2 with Client ID routine-notes-mcp, then Connect my account." }
    - { name: "Gemini CLI", text: "Run gemini mcp add --transport http routine-notes with the URL, then /mcp auth routine-notes inside gemini." }
    - { name: "Allow", text: "On the Routine Notes page that opens, check the account and the return host, then click Allow." }
---

One connector serves three more clients besides Claude: ChatGPT, n8n and Gemini CLI all use the same server URL and the same Allow page. The Routine Notes connector is a standard MCP server with OAuth, so any client that speaks MCP over HTTP can sign in with your account.

The address never changes:

```
https://mcp.routinenotes.app/mcp
```

In the app, **More → Profile → Connect AI** shows it with copy buttons and setup tabs for Claude, ChatGPT, n8n and Gemini. Claude has its own walkthrough ([here](/blog/connect-routine-notes-to-claude)). This post covers the other three, then wires n8n to a routine.

## How does sign-in work in every client?

The same way each time. There's no API key and no secret: the client finds the sign-in endpoints from the URL, opens a Routine Notes page, and you click **Allow**. The page names the app asking, lists what it can do ("See your routines, goals, notes and points" and "Add and change goals, and tick them off"), and shows the host that Allow returns you to. Access lasts until you disconnect it in that app.

## ChatGPT

1. Open **Settings → Apps & Connectors → Advanced** and turn on **Developer mode**.
2. Back in **Apps & Connectors**, click **Create**.
3. Name it *Routine Notes*, paste the URL, and choose **OAuth**.
4. Click **Create**, then **Allow** on the Routine Notes page.

ChatGPT sees the same 13 tools as Claude, from `get_current_date` and `get_routine` to `generate_milestone_plan` and `graphql_query`, so prompts from the other posts work unchanged.

## Gemini CLI

```bash
gemini mcp add --transport http routine-notes https://mcp.routinenotes.app/mcp
```

Start `gemini`, run `/mcp auth routine-notes`, and click **Allow** in the browser. A terminal suits quick reads mid-task: "What's on my 14:00 routine today?" triggers a `get_routine` call, and the answer arrives without leaving the editor.

## n8n

n8n is where the connector stops being chat and becomes automation.

1. Add an **MCP Client Tool** node to your AI agent.
2. **Endpoint:** the URL. **Transport:** HTTP Streamable.
3. **Authentication:** MCP OAuth2, with a new credential.
4. Enter the Client ID from the Connect AI card, `routine-notes-mcp`. n8n is the only client that asks. Click **Connect my account**.
5. Click **Allow** on the Routine Notes page.

## Example: a Sunday summary nobody has to ask for

A **Schedule Trigger** fires at 18:00 every Sunday. It feeds an AI agent node with the Routine Notes tool attached, and this instruction:

> Call get_current_date, then get_progress with period "week" for the last 7 days. Summarise D, K and G in three lines, and list week goals that didn't close.

On 08-11-2026 the agent calls `get_current_date`, then `get_progress` from 02-11-2026 to 08-11-2026. It might find D at 455, K at 390 and G at 610 out of a possible 700 each, with 2 of 4 week goals closed. It writes three lines, and the rest of your flow sends them wherever your flows already send things. Nothing in Routine Notes changes, because the flow only reads.

## Example: a routine agent that calls n8n

Routine Notes' own agents are each bound to one routine. A **start event** URL fires when you start the task, an optional **end event** URL fires when you finish, and `{{ goal_id }}` in either URL is replaced with the task's id. Say your *Design review* routine starts at 15:00:

```
https://n8n.example.com/webhook/design-brief?goal={{ goal_id }}
```

At 15:00 the webhook hands the id to an n8n agent with the MCP tool, which looks the task up through `graphql_query`:

```graphql
query ($id: ID!) { goalItemById(id: $id) { body contribution tags } }
```

It then calls `search_goals` for last session's notes on the same topic and prepares a short brief. In **Agents**, the run goes from idle to listening to finished, and the success and failure counts (say 14 and 1 after three weeks) tell you whether the webhook is healthy. A task started with an agent files itself under Priority's **Automate** quadrant. Agents fire on late check-ins too, so starting at 15:40 from **Past** still runs the flow.

## What goes wrong with automated flows?

- **A flow that writes before you trust it.** Build with read tools first. `add_goal_item` and `complete_goal_item` change real goals.
- **Ticking routines on someone's behalf.** Routine check-ins belong to you, in the app, inside the window. That's what Discipline measures.
- **Home-made dates.** Everything is DD-MM-YYYY. Have the agent call `get_current_date` instead of formatting dates itself.
- **A failure count that creeps up.** Check the agent's counts weekly. A webhook that broke last Tuesday shows up as a number, not a feeling.
