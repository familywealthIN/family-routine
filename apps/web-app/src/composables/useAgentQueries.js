import gql from 'graphql-tag';

const AGENT_FIELDS = `
  id
  name
  email
  taskRef
  startEvent { kind value }
  endEvent { kind value }
  executionStatus
  successCount
  failureCount
  lastRunAt
  lastResultType
  lastResultBody
  lastError
  createdAt
  updatedAt
`;

export const AGENTS_QUERY = gql`
  query getAgents {
    agents {
      ${AGENT_FIELDS}
    }
  }
`;

export const AGENT_BY_TASK_REF_QUERY = gql`
  query getAgentByTaskRef($taskRef: String!) {
    agentByTaskRef(taskRef: $taskRef) {
      ${AGENT_FIELDS}
    }
  }
`;

export const ADD_AGENT_MUTATION = gql`
  mutation addAgent(
    $name: String!
    $taskRef: String!
    $startEvent: AgentEventConfigInput!
    $endEvent: AgentEventConfigInput
  ) {
    addAgent(name: $name, taskRef: $taskRef, startEvent: $startEvent, endEvent: $endEvent) {
      ${AGENT_FIELDS}
    }
  }
`;

export const UPDATE_AGENT_MUTATION = gql`
  mutation updateAgent(
    $id: ID!
    $name: String
    $startEvent: AgentEventConfigInput
    $endEvent: AgentEventConfigInput
  ) {
    updateAgent(id: $id, name: $name, startEvent: $startEvent, endEvent: $endEvent) {
      ${AGENT_FIELDS}
    }
  }
`;

export const DELETE_AGENT_MUTATION = gql`
  mutation deleteAgent($id: ID!) {
    deleteAgent(id: $id)
  }
`;

export const RECORD_AGENT_EXECUTION_MUTATION = gql`
  mutation recordAgentExecution(
    $id: ID!
    $status: String!
    $lastResultType: String
    $lastResultBody: String
    $lastError: String
    $incrementSuccess: Int
    $incrementFailure: Int
  ) {
    recordAgentExecution(
      id: $id
      status: $status
      lastResultType: $lastResultType
      lastResultBody: $lastResultBody
      lastError: $lastError
      incrementSuccess: $incrementSuccess
      incrementFailure: $incrementFailure
    ) {
      ${AGENT_FIELDS}
    }
  }
`;

export const MARK_GOAL_ITEM_READY_MUTATION = gql`
  mutation markGoalItemReady($id: ID!, $date: String!, $period: String!) {
    markGoalItemReady(id: $id, date: $date, period: $period) {
      id
      status
    }
  }
`;
