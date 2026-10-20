/**
 * Which buttons a routine's notification carries depends on how much AI the
 * routine has:
 *
 *   - no AI, or AI without context  → Do now · Complete
 *   - AI with an agent              → Start agent
 *   - AI with context, no agent yet → Build agent (the context is there to
 *                                     build one from)
 *
 * "Context" is what the server can see: the person has talked to the
 * routine's chat, or goal items are linked to it. The category ids match the
 * action types the app registers (apps/web-app/src/services/pushService.js).
 */

const CATEGORIES = {
  routine: 'ROUTINE_ACTIONS',
  agentStart: 'AGENT_START_ACTIONS',
  agentBuild: 'AGENT_BUILD_ACTIONS',
};

function routineActions({ hasAgent, hasAiContext }) {
  if (hasAgent) return { level: 'agent', category: CATEGORIES.agentStart, action: 'start' };
  if (hasAiContext) return { level: 'context', category: CATEGORIES.agentBuild, action: 'build' };
  return { level: 'none', category: CATEGORIES.routine, action: 'complete' };
}

/** Deep link the app opens for a routine action (router.js homeRoutineAction). */
const routineRoute = (routineId, action) => `/home/${routineId}/${action}?src=push`;

module.exports = { CATEGORIES, routineActions, routineRoute };
