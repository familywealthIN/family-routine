import Vue from 'vue';
import eventBus, { EVENTS } from '../utils/eventBus';
import {
  AGENTS_QUERY,
  AGENT_BY_TASK_REF_QUERY,
  ADD_AGENT_MUTATION,
  UPDATE_AGENT_MUTATION,
  DELETE_AGENT_MUTATION,
  RECORD_AGENT_EXECUTION_MUTATION,
  MARK_GOAL_ITEM_READY_MUTATION,
} from '../composables/useAgentQueries';

const RESULT_BODY_MAX = 65536;
const ERROR_MAX = 2048;

const cap = (value, max) => {
  if (typeof value !== 'string') return value;
  return value.length > max ? value.slice(0, max) : value;
};

const sanitizeEventInput = (event) => {
  if (!event || !event.kind || typeof event.value !== 'string') return null;
  return { kind: event.kind, value: event.value };
};

const stripGraphqlMeta = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = { ...obj };
  delete out.__typename;
  return out;
};

const state = Vue.observable({
  agents: [],
  agentsByTaskRef: {},
  statusByRoutineId: {},
  lastResultByRoutineId: {},
  loading: false,
  error: null,
  resultModalRoutineId: null,
});

const indexAgents = () => {
  const map = {};
  state.agents.forEach((agent) => {
    if (agent.taskRef) map[agent.taskRef] = agent;
  });
  state.agentsByTaskRef = map;
};

const upsertAgent = (agent) => {
  if (!agent) return;
  const idx = state.agents.findIndex((a) => a.id === agent.id);
  if (idx === -1) state.agents.push(agent);
  else Vue.set(state.agents, idx, agent);
  indexAgents();
};

const removeAgentLocal = (id) => {
  state.agents = state.agents.filter((a) => a.id !== id);
  indexAgents();
};

const setStatus = (taskRef, status) => {
  Vue.set(state.statusByRoutineId, taskRef, status);
  eventBus.$emit(EVENTS.AGENT_STATUS_CHANGED, { taskRef, status });
};

const setResult = (taskRef, result) => {
  Vue.set(state.lastResultByRoutineId, taskRef, result);
};

const sniffResultType = (response) => {
  const ct = (response && response.headers && (response.headers['content-type'] || response.headers['Content-Type'])) || '';
  if (typeof ct === 'string' && ct.toLowerCase().includes('html')) return 'html';
  if (typeof ct === 'string' && ct.toLowerCase().includes('json')) return 'json';
  if (response && typeof response.data === 'object') return 'json';
  const data = response && response.data;
  if (typeof data === 'string' && /<\s*html/i.test(data)) return 'html';
  return 'json';
};

const substituteGoalId = (value, goalId) => {
  if (typeof value !== 'string' || !goalId) return value;
  return value.replace(/\{\{\s*goal_id\s*\}\}/g, String(goalId));
};

const isHttpUrl = (value) => /^https?:\/\//i.test(value);

const inferKind = (value) => {
  const trimmed = (value || '').trim();
  if (trimmed.toLowerCase().startsWith('curl ')) return 'curl';
  if (isHttpUrl(trimmed)) return 'url';
  return null;
};

const dispatchEvent = async ({ vm, event, goalId }) => {
  const value = substituteGoalId(event.value, goalId);
  const kind = event.kind || inferKind(value);

  if (kind === 'log') {
    const line = value.replace(/^log:\s*/, '');
    console.log('[agent:log]', line);
    return {
      ok: true, status: 200, headers: {}, data: { logged: line }, type: 'json',
    };
  }

  if (kind === 'notify') {
    const body = value.replace(/^notify:\s*/, '');
    if (vm && vm.$notify) {
      vm.$notify({
        title: 'Agent', text: body, group: 'notify', type: 'info', duration: 4000,
      });
    } else {
      console.log('[agent:notify]', body);
    }
    return {
      ok: true, status: 200, headers: {}, data: { notified: body }, type: 'json',
    };
  }

  if (kind === 'curl' && vm && vm.$curl) {
    const response = await vm.$curl.execute(value);
    return { ...response, type: sniffResultType(response) };
  }

  if (kind === 'url' || isHttpUrl(value)) {
    const response = await fetch(value, { method: 'GET' });
    const ct = response.headers.get('content-type') || '';
    let data;
    if (ct.toLowerCase().includes('json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    const wrapped = {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: { 'content-type': ct },
      data,
    };
    return { ...wrapped, type: sniffResultType(wrapped) };
  }

  throw new Error(`Unsupported agent event kind: ${kind}`);
};

const recordExecution = async (apollo, variables) => {
  if (!apollo) return null;
  const { data } = await apollo.mutate({
    mutation: RECORD_AGENT_EXECUTION_MUTATION,
    variables,
  });
  return data && data.recordAgentExecution;
};

const actions = {
  async fetchAll(apollo) {
    if (!apollo) return [];
    state.loading = true;
    state.error = null;
    try {
      const { data } = await apollo.query({
        query: AGENTS_QUERY,
        fetchPolicy: 'network-only',
      });
      state.agents = (data && data.agents) ? data.agents : [];
      indexAgents();
      return state.agents;
    } catch (err) {
      state.error = err;
      console.error('[agentStore.fetchAll]', err);
      return [];
    } finally {
      state.loading = false;
    }
  },

  async fetchByTaskRef(apollo, taskRef) {
    if (!apollo || !taskRef) return null;
    try {
      const { data } = await apollo.query({
        query: AGENT_BY_TASK_REF_QUERY,
        variables: { taskRef },
        fetchPolicy: 'network-only',
      });
      const agent = data && data.agentByTaskRef;
      if (agent) upsertAgent(agent);
      else if (state.agentsByTaskRef[taskRef]) {
        removeAgentLocal(state.agentsByTaskRef[taskRef].id);
      }
      return agent;
    } catch (err) {
      console.error('[agentStore.fetchByTaskRef]', err);
      return null;
    }
  },

  getByTaskRef(taskRef) {
    return state.agentsByTaskRef[taskRef] || null;
  },

  async add(apollo, input) {
    const { data } = await apollo.mutate({
      mutation: ADD_AGENT_MUTATION,
      variables: {
        name: input.name,
        taskRef: input.taskRef,
        startEvent: sanitizeEventInput(input.startEvent),
        endEvent: input.endEvent ? sanitizeEventInput(input.endEvent) : null,
      },
    });
    const agent = data && data.addAgent;
    upsertAgent(agent);
    return agent;
  },

  async update(apollo, id, patch) {
    const { data } = await apollo.mutate({
      mutation: UPDATE_AGENT_MUTATION,
      variables: {
        id,
        name: patch.name,
        startEvent: patch.startEvent ? sanitizeEventInput(patch.startEvent) : undefined,
        endEvent: patch.endEvent !== undefined ? sanitizeEventInput(patch.endEvent) : undefined,
      },
    });
    const agent = data && data.updateAgent;
    upsertAgent(agent);
    return agent;
  },

  async remove(apollo, id) {
    await apollo.mutate({
      mutation: DELETE_AGENT_MUTATION,
      variables: { id },
    });
    removeAgentLocal(id);
  },

  setLocalStatus(taskRef, status) {
    setStatus(taskRef, status);
  },

  clearResult(taskRef) {
    Vue.delete(state.lastResultByRoutineId, taskRef);
    if (state.resultModalRoutineId === taskRef) state.resultModalRoutineId = null;
  },

  openResultModal(taskRef) {
    state.resultModalRoutineId = taskRef;
  },

  closeResultModal() {
    state.resultModalRoutineId = null;
  },

  async fireStartEventIfPresent({
    apollo, vm, taskRef, goalId, goalDate, goalPeriod,
  }) {
    const agent = state.agentsByTaskRef[taskRef];
    if (!agent || !agent.startEvent || !agent.startEvent.value) return null;

    setStatus(taskRef, 'running');
    try {
      const result = await dispatchEvent({
        vm, event: stripGraphqlMeta(agent.startEvent), goalId,
      });

      const ok = result && (result.ok !== false);
      let nextStatus;
      if (!ok) nextStatus = 'failed';
      else if (agent.endEvent && agent.endEvent.value) nextStatus = 'listening';
      else nextStatus = 'finished';
      const resultData = result && result.data;
      const resultType = result && result.type;
      const lastResultBody = typeof resultData === 'string'
        ? cap(resultData, RESULT_BODY_MAX)
        : cap(JSON.stringify(resultData == null ? null : resultData), RESULT_BODY_MAX);

      const updated = await recordExecution(apollo, {
        id: agent.id,
        status: nextStatus,
        lastResultType: resultType || null,
        lastResultBody,
        lastError: ok ? null : cap((result && result.statusText) || 'Start event failed', ERROR_MAX),
        incrementSuccess: ok ? 1 : 0,
        incrementFailure: ok ? 0 : 1,
      });
      if (updated) upsertAgent(updated);
      setStatus(taskRef, nextStatus);

      if (ok && goalId && goalDate && goalPeriod && apollo) {
        try {
          await apollo.mutate({
            mutation: MARK_GOAL_ITEM_READY_MUTATION,
            variables: { id: goalId, date: goalDate, period: goalPeriod },
          });
        } catch (err) {
          console.warn('[agentStore] markGoalItemReady failed:', err);
        }
      }

      if (ok && nextStatus === 'finished' && resultType === 'html' && typeof resultData === 'string') {
        setResult(taskRef, { type: 'html', body: cap(resultData, RESULT_BODY_MAX) });
        actions.openResultModal(taskRef);
      }

      return result;
    } catch (err) {
      console.error('[agentStore.fireStartEventIfPresent]', err);
      setStatus(taskRef, 'failed');
      await recordExecution(apollo, {
        id: agent.id,
        status: 'failed',
        lastError: cap(err.message || 'Start event error', ERROR_MAX),
        incrementFailure: 1,
      }).catch(() => {});
      return null;
    }
  },

  async fireEndEvent({
    apollo, vm, taskRef, goalId,
  }) {
    const agent = state.agentsByTaskRef[taskRef];
    if (!agent || !agent.endEvent || !agent.endEvent.value) return null;

    try {
      const result = await dispatchEvent({
        vm, event: stripGraphqlMeta(agent.endEvent), goalId,
      });
      const ok = result && (result.ok !== false);
      const resultData = result && result.data;
      const resultType = result && result.type;
      const lastResultBody = typeof resultData === 'string'
        ? cap(resultData, RESULT_BODY_MAX)
        : cap(JSON.stringify(resultData == null ? null : resultData), RESULT_BODY_MAX);

      const updated = await recordExecution(apollo, {
        id: agent.id,
        status: ok ? 'finished' : 'failed',
        lastResultType: resultType || null,
        lastResultBody,
        lastError: ok ? null : cap((result && result.statusText) || 'End event failed', ERROR_MAX),
        incrementSuccess: ok ? 1 : 0,
        incrementFailure: ok ? 0 : 1,
      });
      if (updated) upsertAgent(updated);
      setStatus(taskRef, ok ? 'finished' : 'failed');

      if (ok) {
        if (resultType === 'html' && typeof resultData === 'string') {
          setResult(taskRef, { type: 'html', body: cap(resultData, RESULT_BODY_MAX) });
          actions.openResultModal(taskRef);
        } else if (vm && vm.$notify) {
          vm.$notify({
            title: 'Agent finished',
            text: `Agent action for "${agent.name}" complete`,
            group: 'notify',
            type: 'success',
            duration: 3000,
          });
        }
      }

      return result;
    } catch (err) {
      console.error('[agentStore.fireEndEvent]', err);
      setStatus(taskRef, 'failed');
      await recordExecution(apollo, {
        id: agent.id,
        status: 'failed',
        lastError: cap(err.message || 'End event error', ERROR_MAX),
        incrementFailure: 1,
      }).catch(() => {});
      return null;
    }
  },

  reset() {
    state.agents = [];
    state.agentsByTaskRef = {};
    state.statusByRoutineId = {};
    state.lastResultByRoutineId = {};
    state.loading = false;
    state.error = null;
    state.resultModalRoutineId = null;
  },
};

export default {
  state,
  ...actions,
  get agents() { return state.agents; },
  get agentsByTaskRef() { return state.agentsByTaskRef; },
  get statusByRoutineId() { return state.statusByRoutineId; },
  get lastResultByRoutineId() { return state.lastResultByRoutineId; },
  get loading() { return state.loading; },
  get error() { return state.error; },
};
