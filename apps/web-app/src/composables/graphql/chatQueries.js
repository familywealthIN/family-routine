/**
 * Routine chat GraphQL operations.
 *
 * The chat thread is per routine, per day — switching the focused routine
 * switches the thread (design handoff, *Chat*). Replies come from OpenRouter's
 * free tier server-side; `sendRoutineChat` returns both persisted messages
 * plus the intent the client should act on, because the goal-item mutations
 * that carry out the intent live here (they need the optimistic cache writes).
 */
import gql from 'graphql-tag';

export const CHAT_MESSAGE_FIELDS = `
  id
  date
  taskRef
  from
  kind
  text
  items
  proposals
  added
  tone
  icon
  model
  createdAt
`;

export const ROUTINE_CHAT_QUERY = gql`
  query routineChat($date: String!, $taskRef: String!) {
    routineChat(date: $date, taskRef: $taskRef) {
      ${CHAT_MESSAGE_FIELDS}
    }
  }
`;

export const SEND_ROUTINE_CHAT_MUTATION = gql`
  mutation sendRoutineChat(
    $date: String!
    $taskRef: String!
    $text: String!
    $context: ChatContextInput
  ) {
    sendRoutineChat(date: $date, taskRef: $taskRef, text: $text, context: $context) {
      userMessage { ${CHAT_MESSAGE_FIELDS} }
      replyMessage { ${CHAT_MESSAGE_FIELDS} }
      intent
      tasks
      completeItemId
      model
      error
    }
  }
`;

export const POST_ROUTINE_CHAT_EVENT_MUTATION = gql`
  mutation postRoutineChatEvent(
    $date: String!
    $taskRef: String!
    $text: String!
    $tone: String
    $icon: String
    $items: [String]
  ) {
    postRoutineChatEvent(
      date: $date
      taskRef: $taskRef
      text: $text
      tone: $tone
      icon: $icon
      items: $items
    ) {
      ${CHAT_MESSAGE_FIELDS}
    }
  }
`;

/**
 * The momentum message after a tick — a win, one fresh idea for the next
 * session and a target within reach, in three sentences, once per routine per
 * day, grounded server-side in the routine's last month.
 * `brief` is the area/project description + next steps the client caches.
 */
export const ROUTINE_INSIGHT_MUTATION = gql`
  mutation routineInsight($date: String!, $taskRef: String!, $routineName: String, $brief: String) {
    routineInsight(date: $date, taskRef: $taskRef, routineName: $routineName, brief: $brief) {
      ${CHAT_MESSAGE_FIELDS}
    }
  }
`;

export const MARK_ROUTINE_CHAT_ADDED_MUTATION = gql`
  mutation markRoutineChatAdded($id: ID!, $items: [String]) {
    markRoutineChatAdded(id: $id, items: $items) {
      ${CHAT_MESSAGE_FIELDS}
    }
  }
`;

export const CLEAR_ROUTINE_CHAT_MUTATION = gql`
  mutation clearRoutineChat($date: String!, $taskRef: String!) {
    clearRoutineChat(date: $date, taskRef: $taskRef)
  }
`;

export default {
  ROUTINE_CHAT_QUERY,
  SEND_ROUTINE_CHAT_MUTATION,
  POST_ROUTINE_CHAT_EVENT_MUTATION,
  MARK_ROUTINE_CHAT_ADDED_MUTATION,
  ROUTINE_INSIGHT_MUTATION,
  CLEAR_ROUTINE_CHAT_MUTATION,
};
