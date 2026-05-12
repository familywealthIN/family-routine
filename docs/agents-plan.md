## Overview

We should move the current start-event and end-event behavior out of routine UI components and redesign it as a first-class **Agents** system. This system should live alongside Goals and Routines, with its own MongoDB-backed model, dedicated CRUD flows, execution state handling, and secure event orchestration.

The goal is to make agents reusable, observable, and extensible, while keeping the user experience simple from the routine screen. This initial version should be designed so we can later add connectors, system prompts, and richer execution logic without changing the core model.

## Product direction

Agents should become a dedicated domain, similar to Goals and Routines, instead of being embedded as ad hoc logic inside start/end event components. The Agents page should provide full CRUD support just like Routines Page and store lightweight but secure agent records in MongoDB, including execution metadata such as success and failure counts.

From a user perspective, the routine remains the primary entry point, but agent execution is controlled by the agent system. This keeps routine interactions simple while moving orchestration, status tracking, and event handling into a centralized architecture that is easier to maintain and extend.

## User flow

1. When the user clicks the routine check circle, the system opens Quick Goal Creation.
2. In Quick Goal Creation, remove “Routine Task” droptdown. Along with "Start Task", The user should see either:
    - Start Agent, if an agent is already assigned to the routine.
    - Build Agent, if no agent is assigned yet.
3. Clicking Build Agent should open the standard agent creation flow from the Agents CRUD system, but prefilled with the selected routine. The creation modal should accept:
    - Agent name
    - Start event
    - End event
    - Assigned routine, limited to exactly one routine per agent.
4. After the agent is created and the modal closes, the previous Quick Goal Creation modal should immediately switch from Build Agent to Start Agent.

This flow keeps agent creation contextual when launched from a routine, but still aligns it with the centralized Agents data model and CRUD behavior. That separation is important for consistency and future scalability.

## Execution rules

We should support notification- and deep-link-based execution through these routes:
* `home/{routine-id}/complete`
* `home/{routine-id}/start`
* `home/{routine-id}/build`

These routes should behave as follows:
* `complete`: marks the routine as completed.
* `start`: marks the routine as completed and starts the assigned agent.
* `build`: opens the agent creation flow for that routine.

If the routine does not yet have a goal task, all three routes should fall back to Quick Goal Creation because the agent cannot operate without a goal context. This should match the current bypass behavior where Quick Goal Creation is skipped only when the routine goal already exists.

When the user clicks the routine tick and Quick Goal Creation is bypassed because a goal task already exists, the system should automatically trigger the assigned agent. By default, it should use the first goal ID from the available goal list as the execution target.

Start and Build actions must only be available when the routine task is the current task within its active time window. If the routine is not currently actionable, those options should neither be shown in the UI nor be executable through direct URLs.

## Status and lifecycle

The old timer-based mechanism should be removed and replaced with explicit agent execution states. Once an agent starts, the UI should show a running badge next to the info icon for the relevant routine.

After the start event returns HTTP 200:
* If no end event is configured, the agent should move to finished state and refresh the routine view.
* If an end event is configured, the agent should remain in a listening state until the end event is resolved. refresh at both listening and finished state change

The goal item updated by the agent should show a ready status so the user can clearly see which goal is associated with the current or most recent execution. This makes the relationship between routine action, goal state, and agent execution visible in the UI.

Once all task-goals are complete, using the same completion trigger mechanism currently driven by K stimulus, the system should fire the agent’s end event. After that:
* If the response is HTML, show it in a large iframe modal on desktop and a drawer on mobile.
* If the response is JSON, show a simple completion message indicating that the agent action for the routine has finished.

## Data and extension model

The `agents` collection should remain lightweight, but it must include enough structure to support future expansion. At minimum, the model should cover:
* Agent identity and name
* Assigned routine ID (taskRef)
* Start event configuration (URL or cURL)
* End event configuration (URL or cURL)
* Execution status
* Success count
* Failure count
* Audit and security fields.

This should be treated as the foundation for a larger agent platform. The design should allow us to LATER add:
* Connectors
* System prompts
* Richer execution configurations
* More advanced result handling
* Multi-step orchestration.

A simple extensibility example would be evolving the agent from “routine + start/end webhooks” into “routine + connector + prompt + execution policy, ” without needing to redesign the routine UI or the core MongoDB relationship model. That is why the first version should centralize agent ownership, execution state, and security from the start.
