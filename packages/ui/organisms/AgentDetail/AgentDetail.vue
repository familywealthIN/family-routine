<template>
  <!--
    The Agents page detail pane (`packages/design/Agents.dc.html`).

    One component, two hosts: the `flex:3` half of the tablet/desktop split
    (always on screen, never a dialog) and the body of the phone's near-full
    detail sheet. It knows nothing about either — the page owns the sheet.

    Pure presentational. Status tokens, the four-step strip and the failure
    override all come from `constants/agents`.
  -->
  <div class="rn-agd" :class="`rn-agd--${shell}`" data-testid="agent-detail">
    <div v-if="!agent" class="rn-agd__none" data-testid="agent-detail-empty">
      <i class="rn-mi rn-agd__none-glyph">smart_toy</i>
      <div class="rn-agd__none-title">No agent selected</div>
      <div class="rn-agd__none-sub">Pick an agent to see its lifecycle, events and last result.</div>
    </div>

    <template v-else>
      <div class="rn-agd__head">
        <status-ring
          :stage="status"
          :size="48"
          :color="token.color"
          :tint="token.tint"
          glyph="smart_toy"
          :title="token.label"
        />
        <div class="rn-agd__head-text">
          <div class="rn-agd__name" data-testid="agent-detail-name">{{ agent.name }}</div>
          <div class="rn-agd__sub">{{ runsWith }}</div>
        </div>
        <button
          type="button"
          class="rn-agd__icon-btn"
          title="Edit agent"
          aria-label="Edit agent"
          data-testid="agent-detail-edit"
          @click="$emit('edit', agent.id)"
        >
          <i class="rn-mi">edit</i>
        </button>
      </div>

      <!--
        The four-step strip. On `failed` the Running step is a red `close`
        circle, not a blue spinner — the failure is drawn where it happened.
        See `agentLifecycle()`.
      -->
      <div class="rn-agd__strip" data-testid="agent-lifecycle">
        <div
          v-for="step in lifecycle"
          :key="step.key"
          class="rn-agd__step"
          :data-testid="`agent-step-${step.key}`"
        >
          <div
            class="rn-agd__dot"
            :class="{ 'rn-agd__dot--breathe': step.breathing }"
            :style="{ background: step.bg, color: step.fg }"
            :data-breathing="step.breathing ? 'true' : 'false'"
          >
            <i class="rn-mi rn-agd__dot-glyph">{{ step.icon }}</i>
          </div>
          <div class="rn-agd__step-label" :style="{ color: step.labelColor }">{{ step.label }}</div>
        </div>
      </div>

      <div class="rn-agd__desc" :style="{ color: token.color }" data-testid="agent-status-desc">
        {{ token.desc }}
      </div>

      <div class="rn-agd__stats">
        <div v-for="tile in statTiles" :key="tile.key" class="rn-agd__stat" :data-testid="`agent-detail-${tile.key}`">
          <div class="rn-agd__stat-k">{{ tile.label }}</div>
          <div class="rn-agd__stat-v" :style="{ color: tile.color }">{{ tile.value }}</div>
        </div>
      </div>

      <div v-for="event in events" :key="event.key" class="rn-agd__event">
        <div class="rn-agd__row">
          <div class="rn-agd__label">{{ event.label }}</div>
          <div class="rn-agd__kind" :data-testid="`agent-event-kind-${event.key}`">{{ event.kind }}</div>
        </div>
        <div
          class="rn-agd__code"
          :class="{ 'rn-agd__code--empty': !event.present }"
          :data-testid="`agent-event-value-${event.key}`"
        >{{ event.value }}</div>
      </div>

      <div class="rn-agd__row rn-agd__row--result">
        <div class="rn-agd__label">LAST RESULT</div>
        <div class="rn-agd__meta">{{ resultMeta }}</div>
      </div>

      <!-- A failed run shows the error instead of a result, in red monospace. -->
      <div v-if="hasError" class="rn-agd__error" data-testid="agent-detail-error">
        <i class="rn-mi rn-agd__error-glyph">error_outline</i>
        <div class="rn-agd__error-text">{{ agent.lastError }}</div>
      </div>

      <!--
        Rendered the way a goal item shows its reward: a light #f6f9fc card with
        a blue hairline. The body is NEVER injected as markup — it is a third
        party's HTTP response, and the app already has a sandboxed viewer for
        that (`AgentResultModal`), so an HTML result offers it instead.
      -->
      <div v-else class="rn-agd__result" data-testid="agent-detail-result">
        <div v-if="!resultBody" class="rn-agd__result-none">No result saved yet.</div>
        <template v-else-if="resultIsHtml">
          <div class="rn-agd__result-note">An HTML transcript was saved for this run.</div>
          <button
            type="button"
            class="rn-agd__link"
            data-testid="agent-detail-view-result"
            @click="$emit('open-result', agent.id)"
          >
            <i class="rn-mi rn-agd__link-glyph">receipt_long</i>View transcript
          </button>
        </template>
        <pre v-else class="rn-agd__result-pre">{{ resultBody }}</pre>
      </div>

      <div class="rn-agd__actions">
        <button
          type="button"
          class="rn-agd__btn rn-agd__btn--run"
          :class="{ 'rn-agd__btn--off': !canRunTest }"
          :style="runStyle"
          :disabled="!canRunTest"
          :title="canRunTest ? runLabel : testDisabledReason"
          data-testid="agent-run-test"
          @click="onRunTest"
        >
          <i class="rn-mi rn-agd__btn-glyph">{{ runIcon }}</i>{{ runLabel }}
        </button>
        <button
          type="button"
          class="rn-agd__btn rn-agd__btn--ghost"
          data-testid="agent-open-routine"
          @click="$emit('open-routine', agent.taskRef)"
        >
          <i class="rn-mi rn-agd__btn-glyph">open_in_new</i>Open routine
        </button>
      </div>
      <div v-if="!canRunTest" class="rn-agd__why" data-testid="agent-run-test-why">{{ testDisabledReason }}</div>
    </template>
  </div>
</template>

<script>
import StatusRing from '../../molecules/StatusRing/StatusRing.vue';
import {
  AGENT_STATUS,
  NO_END_EVENT_COPY,
  agentStatusKey,
  agentLifecycle,
  successRate,
} from '../../constants/agents';
import { lastResultMeta } from '../../utils/agentFormat';

/** A saved body can be 64KB; the card shows the head of it, not a wall. */
const PREVIEW_MAX = 1400;

export default {
  name: 'OrganismAgentDetail',
  components: { StatusRing },
  props: {
    /** An Agent document joined to its routine, or null when nothing is picked. */
    agent: { type: Object, default: null },
    routineTime: { type: String, default: '' },
    routineName: { type: String, default: '' },
    shell: { type: String, default: 'phone' },
    /**
     * A test run is on the wire. Only ever true once a real trigger exists —
     * see `canRunTest`.
     */
    testing: { type: Boolean, default: false },
    /**
     * Whether a manual run can actually be triggered. Default **false**: there
     * is no server operation for it yet (`apps/server/src/resolvers/agent.js`
     * records executions, it cannot start one), and a button that fakes the
     * lifecycle on a timer would report a success nothing performed.
     */
    canRunTest: { type: Boolean, default: false },
    testDisabledReason: {
      type: String,
      default: 'Test runs need a server trigger. For now the start event fires when you tick this agent\'s routine.',
    },
    now: { type: [String, Number, Date], default: undefined },
  },
  computed: {
    status() {
      return agentStatusKey(this.agent, this.now);
    },
    token() {
      return AGENT_STATUS[this.status];
    },
    lifecycle() {
      return agentLifecycle(this.status);
    },
    runsWith() {
      const parts = ['Runs with', this.routineTime, this.routineName || (this.agent && this.agent.taskRef)];
      return parts.filter(Boolean).join(' ');
    },
    statTiles() {
      const ok = Number(this.agent && this.agent.successCount) || 0;
      const fail = Number(this.agent && this.agent.failureCount) || 0;
      return [
        {
          key: 'succeeded', label: 'SUCCEEDED', value: ok, color: '#2e7d32',
        },
        {
          key: 'failed', label: 'FAILED', value: fail, color: fail ? '#d32f2f' : 'rgba(0,0,0,.87)',
        },
        {
          key: 'rate', label: 'RATE', value: `${successRate(ok, fail)}%`, color: 'rgba(0,0,0,.87)',
        },
      ];
    },
    /**
     * START EVENT is required so it always has a kind. END EVENT is nullable,
     * and a null one reads "NONE" with the sentence that explains what happens
     * instead — not an empty black box.
     */
    events() {
      const agent = this.agent || {};
      const view = (event, key, label) => {
        // A kind with no value is not a configured event: the store's
        // `sanitizeEventInput` drops it and the dispatcher never fires it.
        const present = !!(event && event.value);
        return {
          key,
          label,
          present,
          kind: present ? String(event.kind || 'url').toUpperCase() : 'NONE',
          value: present ? event.value : NO_END_EVENT_COPY,
        };
      };
      return [
        view(agent.startEvent, 'start', 'START EVENT'),
        view(agent.endEvent, 'end', 'END EVENT'),
      ];
    },
    hasError() {
      return this.status === 'failed' && !!(this.agent && this.agent.lastError);
    },
    resultIsHtml() {
      return (this.agent && this.agent.lastResultType) === 'html';
    },
    resultBody() {
      const body = this.agent && this.agent.lastResultBody;
      if (typeof body !== 'string' || !body) return '';
      return body.length > PREVIEW_MAX ? `${body.slice(0, PREVIEW_MAX)}…` : body;
    },
    resultMeta() {
      return lastResultMeta(this.agent, this.now);
    },
    /** Three labels, exactly as drawn: Run test / Retry test / Running…. */
    runLabel() {
      if (this.testing) return 'Running…';
      return this.status === 'failed' ? 'Retry test' : 'Run test';
    },
    runIcon() {
      return this.status === 'failed' ? 'replay' : 'play_arrow';
    },
    runStyle() {
      if (!this.canRunTest) return { background: 'rgba(0,0,0,.2)' };
      return { background: this.status === 'failed' ? '#e68900' : '#4CAF50' };
    },
  },
  methods: {
    onRunTest() {
      if (!this.canRunTest || this.testing) return;
      this.$emit('run-test', this.agent.id);
    },
  },
};
</script>

<style>
.rn-agd {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-agd__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0 12px;
}

.rn-agd__head-text {
  flex: 1;
  min-width: 0;
}

.rn-agd__name {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-agd__sub {
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
}

.rn-agd__icon-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.rn-agd__icon-btn:hover {
  background: rgba(0, 0, 0, .05);
}

.rn-agd__strip {
  display: flex;
  align-items: flex-start;
  padding: 12px;
  border-radius: 14px;
  background: #f7f7f7;
}

.rn-agd__step {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.rn-agd__dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* `rn-btn-breathe` is the gentle in-place scale (styles/routine-focus.css). The
   expanding-ring `rn-breathe` belongs to StatusRing's pulse layer and would fade
   this step out entirely. */
.rn-agd__dot--breathe {
  animation: rn-btn-breathe 1.8s ease-in-out infinite;
}

.rn-agd__dot-glyph {
  font-size: 15px;
}

.rn-agd__step-label {
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.rn-agd__desc {
  font-size: 12px;
  margin-top: 8px;
  line-height: 1.45;
}

.rn-agd__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.rn-agd__stat {
  padding: 10px 12px;
  border-radius: 12px;
  background: #f7f7f7;
  min-width: 0;
}

.rn-agd__stat-k {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-agd__stat-v {
  font-size: 17px;
  font-weight: 700;
  margin-top: 2px;
}

.rn-agd__event {
  margin-top: 16px;
}

.rn-agd__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.rn-agd__row--result {
  margin-top: 18px;
}

.rn-agd__label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-agd__kind {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(0, 0, 0, .06);
  color: rgba(0, 0, 0, .6);
}

.rn-agd__meta {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
}

.rn-agd__code {
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #1e2430;
  color: #e6edf3;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  /* cURL values are multi-line and URLs are long and unbreakable. */
  white-space: pre-wrap;
  word-break: break-all;
}

/* "No end event" is prose, not code — it keeps the slot but drops the terminal. */
.rn-agd__code--empty {
  background: #f7f7f7;
  color: rgba(0, 0, 0, .6);
  font-family: inherit;
  word-break: normal;
}

.rn-agd__error {
  margin-top: 6px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(229, 57, 53, .06);
  border: 1px solid rgba(229, 57, 53, .2);
  display: flex;
  gap: 10px;
}

.rn-agd__error-glyph {
  font-size: 20px;
  color: #d32f2f;
  flex-shrink: 0;
}

.rn-agd__error-text {
  flex: 1;
  min-width: 0;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  line-height: 1.55;
  color: #b71c1c;
  word-break: break-word;
}

.rn-agd__result {
  margin-top: 6px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #f6f9fc;
  border: 1px solid rgba(40, 139, 213, .18);
  font-size: 14px;
  line-height: 1.55;
  color: rgba(0, 0, 0, .82);
}

.rn-agd__result-none {
  color: rgba(0, 0, 0, .5);
  font-size: 13px;
}

.rn-agd__result-note {
  font-size: 13px;
}

.rn-agd__result-pre {
  margin: 0;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 220px;
  overflow: auto;
}

.rn-agd__link {
  margin-top: 6px;
  border: 0;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #288bd5;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.rn-agd__link-glyph {
  font-size: 18px;
}

.rn-agd__actions {
  display: flex;
  gap: 8px;
  margin-top: 18px;
}

.rn-agd__btn {
  flex: 1;
  height: 44px;
  border: 0;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
}

.rn-agd__btn--off {
  cursor: not-allowed;
}

.rn-agd__btn--ghost {
  background: transparent;
  border: 1px solid #288bd5;
  color: #288bd5;
}

.rn-agd__btn-glyph {
  font-size: 18px;
}

.rn-agd__why {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .5);
}

.rn-agd__none {
  padding: 36px 20px;
  text-align: center;
}

.rn-agd__none-glyph {
  font-size: 40px;
  color: rgba(0, 0, 0, .16);
}

.rn-agd__none-title {
  font-size: 16px;
  font-weight: 700;
  margin-top: 8px;
}

.rn-agd__none-sub {
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
  margin-top: 4px;
}
</style>
