import Vue from 'vue';
import moment from 'moment';
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
import {
  bgSyncSupported, enqueueAgentJob, settleAgentJob, drainDoneJobs, onSyncResult,
} from '../utils/agentSync';
import { graphQLUrl } from '../blob/config';
import { getSessionItem } from '../token';
import { GC_AUTH_TOKEN } from '../constants/settings';

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

// Agent status badges (running/listening/done) are day-scoped and persisted to
// localStorage so they survive closing and reopening the app. A new day starts
// clean — yesterday's badges never leak into today.
const STATUS_STORAGE_KEY = 'agent-status-by-day';
const todayKey = () => moment().format('DD-MM-YYYY');
const now = () => (typeof Date !== 'undefined' ? Date.now() : 0);

// Per-task metadata for a 'running' badge: when it started and where it should
// resolve to. 'running' is an in-flight, page-owned state — the fetch that set
// it lives in this tab. If the tab dies mid-flight the badge would stick on
// 'running' forever, so we remember what it should become and un-stick it on
// the next load (which, by definition, has no in-flight dispatch).
let statusMeta = {};

const persistStatus = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STATUS_STORAGE_KEY, JSON.stringify({
      day: todayKey(),
      statuses: state.statusByRoutineId,
      meta: statusMeta,
    }));
  } catch (e) {
    // ignore quota / serialization errors — persistence is best-effort
  }
};

// resolveTo is only meaningful for a 'running' status — where the badge should
// land if this page dies before the dispatch resolves.
const setStatus = (taskRef, status, resolveTo) => {
  Vue.set(state.statusByRoutineId, taskRef, status);
  if (status === 'running') {
    statusMeta[taskRef] = { at: now(), resolveTo: resolveTo || 'finished' };
  } else {
    delete statusMeta[taskRef];
  }
  persistStatus();
  eventBus.$emit(EVENTS.AGENT_STATUS_CHANGED, { taskRef, status });
};

const clearStatus = (taskRef) => {
  if (state.statusByRoutineId[taskRef] === undefined) return;
  Vue.delete(state.statusByRoutineId, taskRef);
  delete statusMeta[taskRef];
  persistStatus();
  eventBus.$emit(EVENTS.AGENT_STATUS_CHANGED, { taskRef, status: '' });
};

// Wipe all badges (a new day, or logout). Persists the empty state under today.
const clearDayStatuses = () => {
  Object.keys(state.statusByRoutineId).forEach((taskRef) => Vue.delete(state.statusByRoutineId, taskRef));
  statusMeta = {};
  persistStatus();
};

// Restore day-scoped badges on load — but only for the SAME day, so reopening
// the app on a new day shows no stale agent tags.
const hydrateStatus = () => {
  try {
    if (typeof localStorage === 'undefined') return;
    const raw = localStorage.getItem(STATUS_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.day === todayKey() && parsed.statuses) {
      const meta = parsed.meta || {};
      let resolvedAny = false;
      Object.keys(parsed.statuses).forEach((taskRef) => {
        let status = parsed.statuses[taskRef];
        // A persisted 'running' is stale: the dispatch that set it died with
        // the previous page. Resolve it to where it was headed — a start event
        // with an end trigger becomes 'listening'; anything else 'finished' —
        // so a badge never sticks on 'running' after close/reopen. When the
        // Service Worker completes a dispatch in the background it overwrites
        // this with the real outcome.
        if (status === 'running') {
          status = (meta[taskRef] && meta[taskRef].resolveTo) || 'finished';
          resolvedAny = true;
        } else if (meta[taskRef]) {
          statusMeta[taskRef] = meta[taskRef];
        }
        Vue.set(state.statusByRoutineId, taskRef, status);
      });
      // Persist the resolved view so storage matches what's shown (and a stale
      // 'running' isn't re-resolved on every future load).
      if (resolvedAny) persistStatus();
    } else {
      localStorage.removeItem(STATUS_STORAGE_KEY);
    }
  } catch (e) {
    // ignore malformed storage
  }
};

hydrateStatus();

// Adopt an outcome the Service Worker produced for a dispatch the page couldn't
// finish (closed mid-flight). Only overwrites a badge that's actually shown —
// silent/implicit runs stay silent, and a cleared badge stays cleared.
const applySyncResult = (taskRef, resolvedStatus) => {
  if (!taskRef || !resolvedStatus) return;
  if (state.statusByRoutineId[taskRef] !== undefined) setStatus(taskRef, resolvedStatus);
};

// Live results from an in-flight SW dispatch (page reopened while it ran).
onSyncResult((data) => applySyncResult(data.taskRef, data.resolvedStatus));
// Results the SW completed entirely while the app was closed.
drainDoneJobs().then((jobs) => {
  jobs.forEach((j) => applySyncResult(j.taskRef, j.outcome && j.outcome.resolvedStatus));
}).catch(() => {});

// A task is "visible" (shows badges) once it has a status — only explicit
// "Start Agent" presses set one; implicit fires (Start Task/tick/redeem) run
// silently and never set a status. Because the status is persisted, the
// visibility survives reload, so an end event still shows running/done after
// reopening the app. Presence-of-status replaces the old in-memory Set.
const isStatusVisible = (taskRef) => state.statusByRoutineId[taskRef] !== undefined;

const setResult = (taskRef, result) => {
  Vue.set(state.lastResultByRoutineId, taskRef, result);
};

// Status to persist to the agent doc. Implicit (silent) failures never write a
// "failed" state — the user didn't start the agent — but the failure count
// still increments for diagnostics.
const recordedStatus = (visible, ok, okStatus) => {
  if (ok) return okStatus;
  return visible ? 'failed' : 'idle';
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

// Background Sync can only replay a plain URL GET (not curl/log/notify). Returns
// the final, goal-id-substituted URL for a url-kind event, else null.
const resolveUrlEvent = (event, goalId) => {
  if (!event || !event.value) return null;
  const value = substituteGoalId(event.value, goalId);
  const kind = event.kind || inferKind(value);
  return (kind === 'url' || isHttpUrl(value)) ? value : null;
};

// Enqueue a background-sync safety-net job for a url-kind dispatch. Returns the
// job id (or null when unsupported / not a url event) so the caller can settle
// it once the page finishes the dispatch itself.
const enqueueDispatchJob = ({
  taskRef, agent, event, phase, hasEnd, goalId, goalDate, goalPeriod,
}) => {
  if (!bgSyncSupported()) return Promise.resolve(null);
  const url = resolveUrlEvent(event, goalId);
  if (!url) return Promise.resolve(null);
  const at = (typeof Date !== 'undefined') ? Date.now() : 0;
  return enqueueAgentJob({
    id: `${taskRef}:${phase}:${at}`,
    taskRef,
    agentId: agent.id,
    phase,
    hasEnd: !!hasEnd,
    url,
    goalId: goalId || null,
    goalDate: goalDate || null,
    goalPeriod: goalPeriod || null,
    graphqlUrl: graphQLUrl,
    token: getSessionItem(GC_AUTH_TOKEN) || null,
    createdAt: at,
  });
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
    apollo, vm, taskRef, goalId, goalDate, goalPeriod, implicit = false,
  }) {
    const agent = state.agentsByTaskRef[taskRef];
    if (!agent || !agent.startEvent || !agent.startEvent.value) return null;

    // Only an explicit Start Agent shows badges. An implicit fire runs
    // silently and clears any stale badge so nothing flashes. Setting a status
    // is what marks the task "visible" — persisted, so it survives reload.
    const visible = !implicit;
    const hasEnd = !!(agent.endEvent && agent.endEvent.value);
    if (visible) {
      // If this start dies mid-flight, a reopen should land on 'listening'
      // (start fired, waiting for the end trigger) or 'finished' if there is
      // no end event.
      setStatus(taskRef, 'running', hasEnd ? 'listening' : 'finished');
    } else {
      clearStatus(taskRef);
    }
    // Safety net: if this tab dies before the dispatch resolves, the Service
    // Worker replays the job and reports the real outcome. Only for visible
    // (user-started) url dispatches; settled below once the page finishes.
    const jobIdP = visible
      ? enqueueDispatchJob({
        taskRef, agent, event: agent.startEvent, phase: 'start', hasEnd, goalId, goalDate, goalPeriod,
      })
      : Promise.resolve(null);
    const settleJob = () => jobIdP.then((jid) => (jid ? settleAgentJob(jid) : null)).catch(() => {});
    const show = (s) => { if (visible) setStatus(taskRef, s); };
    try {
      const result = await dispatchEvent({
        vm, event: stripGraphqlMeta(agent.startEvent), goalId,
      });
      settleJob();

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
        status: recordedStatus(visible, ok, nextStatus),
        lastResultType: resultType || null,
        lastResultBody,
        lastError: ok ? null : cap((result && result.statusText) || 'Start event failed', ERROR_MAX),
        incrementSuccess: ok ? 1 : 0,
        incrementFailure: ok ? 0 : 1,
      });
      if (updated) upsertAgent(updated);
      show(nextStatus);

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
      settleJob();
      show('failed');
      await recordExecution(apollo, {
        id: agent.id,
        status: visible ? 'failed' : 'idle',
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

    // Badges only for agents the user explicitly started — detected by the
    // presence of a (persisted) status like "listening". An agent that
    // auto-started on Start Task has no status, so its end event runs silently.
    // Because status is persisted, this still shows running/done after the app
    // was closed and reopened while the agent was listening.
    const visible = isStatusVisible(taskRef);
    const show = (s) => { if (visible) setStatus(taskRef, s); };

    // While the end event is in flight the badge shows "running" (not
    // "listening") — same as the start-event dispatch. If the page dies now, a
    // reopen resolves it to 'finished'.
    if (visible) setStatus(taskRef, 'running', 'finished');
    // Same background-sync safety net as the start event.
    const jobIdP = visible
      ? enqueueDispatchJob({
        taskRef, agent, event: agent.endEvent, phase: 'end', hasEnd: false, goalId,
      })
      : Promise.resolve(null);
    const settleJob = () => jobIdP.then((jid) => (jid ? settleAgentJob(jid) : null)).catch(() => {});
    try {
      const result = await dispatchEvent({
        vm, event: stripGraphqlMeta(agent.endEvent), goalId,
      });
      settleJob();
      const ok = result && (result.ok !== false);
      const resultData = result && result.data;
      const resultType = result && result.type;
      const lastResultBody = typeof resultData === 'string'
        ? cap(resultData, RESULT_BODY_MAX)
        : cap(JSON.stringify(resultData == null ? null : resultData), RESULT_BODY_MAX);

      const updated = await recordExecution(apollo, {
        id: agent.id,
        // Silent (implicit) end-event failures don't persist a "failed" state.
        status: recordedStatus(visible, ok, 'finished'),
        lastResultType: resultType || null,
        lastResultBody,
        lastError: ok ? null : cap((result && result.statusText) || 'End event failed', ERROR_MAX),
        incrementSuccess: ok ? 1 : 0,
        incrementFailure: ok ? 0 : 1,
      });
      if (updated) upsertAgent(updated);
      // Leaves the badge on "Agent done" (persisted, day-scoped) as the final
      // visible state.
      show(ok ? 'finished' : 'failed');

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
      settleJob();
      show('failed');
      await recordExecution(apollo, {
        id: agent.id,
        status: visible ? 'failed' : 'idle',
        lastError: cap(err.message || 'End event error', ERROR_MAX),
        incrementFailure: 1,
      }).catch(() => {});
      return null;
    }
  },

  // Wipe agent badges — call on a new day so yesterday's tags don't linger.
  clearDayStatuses() {
    clearDayStatuses();
  },

  reset() {
    state.agents = [];
    state.agentsByTaskRef = {};
    state.statusByRoutineId = {};
    state.lastResultByRoutineId = {};
    state.loading = false;
    state.error = null;
    state.resultModalRoutineId = null;
    clearDayStatuses();
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
