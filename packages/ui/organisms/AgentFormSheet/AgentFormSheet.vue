<template>
  <!--
    New agent / Edit agent — one form, three presentations, from
    `packages/design/Agents.dc.html`. The chassis `ResponsiveSheet` supplies them
    (phone bottom sheet · tablet 860px · desktop 720px), and `SlidingSwitch`
    supplies the URL / cURL toggle, so neither is redrawn here.

    Pure presentational: it emits `save` with a payload and never touches the
    store. Validation is the design's rule — a name and a start value, both
    non-empty once trimmed.
  -->
  <responsive-sheet
    class="rn-agf-sheet"
    :open="open"
    :shell="shell"
    :title="title"
    :handle="false"
    @close="$emit('close')"
  >
    <div class="rn-agf">
      <div class="rn-agf__label">NAME</div>
      <input
        ref="name"
        v-model="form.name"
        class="rn-agf__name"
        placeholder="e.g. PR Summarizer"
        data-testid="agent-form-name"
      />

      <div class="rn-agf__label rn-agf__label--spaced">RUNS WITH ROUTINE</div>
      <!--
        `updateAgent` takes no taskRef (apps/server/src/resolvers/agent.js) and
        there is a one-agent-per-routine unique index, so the binding is fixed at
        creation. Showing the chips as pickable on an edit would promise a move
        the server will not make.
      -->
      <div v-if="locked" class="rn-agf__locked" data-testid="agent-form-routine-locked">
        <div class="rn-agf__chip rn-agf__chip--on rn-agf__chip--static">
          <span v-if="lockedOption.time" class="rn-agf__chip-time">{{ lockedOption.time }}</span>
          {{ lockedOption.name }}
        </div>
        <div class="rn-agf__hint">A routine cannot be changed after the agent is created.</div>
      </div>
      <div v-else class="rn-agf__chips">
        <div
          v-for="option in routineOptions"
          :key="option.value"
          class="rn-agf__chip"
          :class="{ 'rn-agf__chip--on': option.value === form.taskRef }"
          :data-testid="`agent-form-routine-${option.value}`"
          @click="form.taskRef = option.value"
        >
          <span v-if="option.time" class="rn-agf__chip-time">{{ option.time }}</span>
          {{ option.name || option.label }}
        </div>
        <div v-if="!routineOptions.length" class="rn-agf__hint" data-testid="agent-form-no-routines">
          Every routine already has an agent. Free one up, or add a routine first.
        </div>
      </div>

      <div v-for="field in fields" :key="field.key" class="rn-agf__event">
        <div class="rn-agf__row">
          <div class="rn-agf__label">{{ field.label }}</div>
          <sliding-switch
            class="rn-agf__switch"
            :segments="kinds"
            :value="form[field.key].kind"
            :height="26"
            :data-testid="`agent-form-kind-${field.key}`"
            @input="form[field.key].kind = $event"
          />
        </div>
        <textarea
          v-model="form[field.key].value"
          class="rn-agf__code"
          :rows="form[field.key].kind === 'curl' ? 4 : 2"
          :placeholder="placeholderFor(form[field.key].kind)"
          :data-testid="`agent-form-value-${field.key}`"
        ></textarea>
        <div class="rn-agf__hint">{{ field.hint }}</div>
      </div>

      <div v-if="errorMessage" class="rn-agf__error" data-testid="agent-form-error">{{ errorMessage }}</div>
    </div>

    <template v-slot:footer>
      <div class="rn-agf__foot">
        <!-- Two-step, because the old page's confirm dialog was the only thing
             between a stray tap and a deleted agent. -->
        <template v-if="canDelete">
          <button
            v-if="!confirmingDelete"
            type="button"
            class="rn-agf__text-btn rn-agf__text-btn--danger"
            data-testid="agent-form-delete"
            @click="confirmingDelete = true"
          >
            <i class="rn-mi rn-agf__btn-glyph">delete</i>Delete
          </button>
          <div v-else class="rn-agf__confirm" data-testid="agent-form-delete-confirm">
            <span class="rn-agf__confirm-text">Delete this agent?</span>
            <button type="button" class="rn-agf__text-btn" @click="confirmingDelete = false">Keep</button>
            <button
              type="button"
              class="rn-agf__text-btn rn-agf__text-btn--danger"
              data-testid="agent-form-delete-yes"
              @click="$emit('delete', agent.id)"
            >Delete</button>
          </div>
        </template>
        <div class="rn-agf__spacer"></div>
        <button type="button" class="rn-agf__text-btn" data-testid="agent-form-cancel" @click="$emit('close')">
          Cancel
        </button>
        <button
          type="button"
          class="rn-agf__save"
          :class="{ 'rn-agf__save--off': !canSave }"
          :disabled="!canSave"
          data-testid="agent-form-save"
          @click="submit"
        >{{ saveLabel }}</button>
      </div>
    </template>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';
import SlidingSwitch from '../../molecules/SlidingSwitch/SlidingSwitch.vue';
import { AGENT_EVENT_KINDS, GOAL_ID_PLACEHOLDER } from '../../constants/agents';

const blank = () => ({ kind: 'url', value: '' });

const emptyForm = () => ({
  name: '',
  taskRef: '',
  startEvent: blank(),
  endEvent: blank(),
});

export default {
  name: 'OrganismAgentFormSheet',
  components: { ResponsiveSheet, SlidingSwitch },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The agent being edited, or null for "New agent". */
    agent: { type: Object, default: null },
    /** `[{ value, label, time, name }]` — already filtered to free routines. */
    routineOptions: { type: Array, default: () => [] },
    /** Pre-selects the routine on a new agent (deep link from a routine card). */
    prefillTaskRef: { type: String, default: '' },
    errorMessage: { type: String, default: '' },
  },
  data() {
    return {
      form: emptyForm(),
      confirmingDelete: false,
    };
  },
  computed: {
    kinds() {
      return AGENT_EVENT_KINDS;
    },
    editing() {
      return !!(this.agent && this.agent.id);
    },
    locked() {
      return this.editing;
    },
    lockedOption() {
      const { taskRef } = this.form;
      const found = this.routineOptions.find((option) => option.value === taskRef);
      if (found) return found;
      // The bound routine is filtered OUT of the free list on an edit, and it may
      // also have been deleted — either way show the id rather than nothing.
      return { value: taskRef, name: (this.agent && this.agent.routineName) || taskRef, time: (this.agent && this.agent.routineTime) || '' };
    },
    title() {
      return this.editing ? 'Edit agent' : 'New agent';
    },
    saveLabel() {
      return this.editing ? 'Save' : 'Create agent';
    },
    canDelete() {
      return this.editing;
    },
    fields() {
      return [
        { key: 'startEvent', label: 'START EVENT', hint: 'Fires when the routine is ticked.' },
        {
          key: 'endEvent',
          label: 'END EVENT · OPTIONAL',
          hint: 'Optional. Leave empty and the agent finishes once start returns 200.',
        },
      ];
    },
    /** The design's rule, verbatim: a name and a start value, both trimmed. */
    canSave() {
      const named = !!(this.form.name && this.form.name.trim());
      const started = !!(this.form.startEvent.value && this.form.startEvent.value.trim());
      return named && started && !!this.form.taskRef;
    },
  },
  watch: {
    open(isOpen) {
      if (isOpen) this.hydrate();
    },
    agent() {
      if (this.open) this.hydrate();
    },
    prefillTaskRef() {
      if (this.open) this.hydrate();
    },
  },
  created() {
    if (this.open) this.hydrate();
  },
  methods: {
    placeholderFor(kind) {
      if (kind === 'curl') return `curl -X POST https://… -d '{"goal":"${GOAL_ID_PLACEHOLDER}"}'`;
      return `https://… use ${GOAL_ID_PLACEHOLDER} for the goal`;
    },
    hydrate() {
      this.confirmingDelete = false;
      const { agent } = this;
      if (agent && agent.id) {
        this.form = {
          name: agent.name || '',
          taskRef: agent.taskRef || '',
          startEvent: agent.startEvent
            ? { kind: agent.startEvent.kind || 'url', value: agent.startEvent.value || '' }
            : blank(),
          endEvent: agent.endEvent
            ? { kind: agent.endEvent.kind || 'url', value: agent.endEvent.value || '' }
            : blank(),
        };
        return;
      }
      const first = this.routineOptions[0];
      this.form = {
        ...emptyForm(),
        taskRef: this.prefillTaskRef || (first ? first.value : ''),
      };
    },
    submit() {
      if (!this.canSave) return;
      // An empty end value means "no end event" — null, not an event with an
      // empty string, which the server would happily store and then dispatch.
      const end = this.form.endEvent.value && this.form.endEvent.value.trim()
        ? { kind: this.form.endEvent.kind, value: this.form.endEvent.value }
        : null;
      this.$emit('save', {
        id: this.editing ? this.agent.id : null,
        name: this.form.name.trim(),
        taskRef: this.form.taskRef,
        startEvent: { kind: this.form.startEvent.kind, value: this.form.startEvent.value },
        endEvent: end,
      });
    },
  },
};
</script>

<style>
/*
  The chassis sheet, dressed to `packages/design/Agents.dc.html`'s agent modal.
  Every rule below is scoped by `rn-agf-sheet` on the overlay root, so the
  chassis defaults (86%, a 50px head, a 17px title, a 32px close, body
  `0 16px 16px`, foot `12px 16px 16px`) stay exactly as they are for Inbox,
  Skip-day and the goal-item editor. Routine Focus's "Build agent" mounts this
  same organism, so it inherits these numbers rather than redrawing the form.
*/
.rn-agf-sheet .rn-rsheet__panel {
  max-height: 88%;
}

/* 59px tall: 10 + a 38px close + 10 + the 1px rule the design draws under it. */
.rn-agf-sheet .rn-rsheet__head {
  padding: 10px 10px 10px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
}

.rn-agf-sheet .rn-rsheet__title {
  font-size: 18px;
}

.rn-agf-sheet .rn-rsheet__close {
  width: 38px;
  height: 38px;
}

.rn-agf-sheet .rn-rsheet__body {
  padding: 16px 20px 8px;
}

.rn-agf-sheet .rn-rsheet__foot {
  padding: 12px 20px 18px;
}

.rn-agf {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  padding-top: 6px;
}

.rn-agf__label {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-agf__label--spaced {
  margin-top: 16px;
}

.rn-agf__name {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  border-bottom: 2px solid #288bd5;
  outline: 0;
  font: inherit;
  font-size: 18px;
  font-weight: 600;
  color: #222;
  padding: 6px 0 8px;
  background: transparent;
}

.rn-agf__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.rn-agf__locked {
  margin-top: 8px;
}

.rn-agf__chip {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 10px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  background: #fff;
  color: rgba(0, 0, 0, .65);
  border: 1px solid rgba(0, 0, 0, .12);
  cursor: pointer;
}

.rn-agf__chip--on {
  background: rgba(40, 139, 213, .12);
  color: #1f6fab;
  border-color: rgba(40, 139, 213, .45);
}

.rn-agf__chip--static {
  cursor: default;
  display: inline-flex;
}

.rn-agf__chip-time {
  font-variant-numeric: tabular-nums;
  opacity: .7;
}

.rn-agf__event {
  margin-top: 18px;
}

.rn-agf__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* The shared pill is r12 (Progress, Profile and About all draw it that way);
   the agent modal's URL / cURL pill is r10. Two class levels so this beats
   `.rn-switch--thumb` on specificity rather than on stylesheet order. */
.rn-agf .rn-agf__switch {
  width: 120px;
  flex-shrink: 0;
  border-radius: 10px;
}

.rn-agf__code {
  width: 100%;
  box-sizing: border-box;
  margin-top: 8px;
  border: 1px solid rgba(0, 0, 0, .14);
  border-radius: 10px;
  outline: 0;
  padding: 10px 12px;
  font-family: ui-monospace, Menlo, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #222;
  resize: vertical;
  background: #fafafa;
}

.rn-agf__hint {
  font-size: 11px;
  color: rgba(0, 0, 0, .5);
  margin-top: 4px;
}

.rn-agf__error {
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(229, 57, 53, .06);
  border: 1px solid rgba(229, 57, 53, .2);
  color: #b71c1c;
  font-size: 12px;
  line-height: 1.5;
}

/* Wraps instead of squeezing. On a 390px phone the delete confirm
   ("Delete this agent? Keep Delete") plus Cancel and Save do not fit one row;
   unwrapped, the nowrap labels overflowed their shrunken boxes and the confirm
   Delete was painted over Cancel, so tapping Delete cancelled. Cancel / Save
   now drop to a second, right-aligned row instead. */
.rn-agf__foot {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-agf__spacer {
  flex: 1;
}

.rn-agf__text-btn {
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 20px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 4px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.rn-agf__text-btn--danger {
  color: #d32f2f;
}

.rn-agf__confirm {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.rn-agf__confirm-text {
  font-size: 13px;
  font-weight: 600;
  color: rgba(0, 0, 0, .7);
  white-space: nowrap;
}

.rn-agf__btn-glyph {
  font-size: 18px;
}

.rn-agf__save {
  height: 40px;
  padding: 0 20px;
  border: 0;
  border-radius: 20px;
  background: #288bd5;
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
}

.rn-agf__save--off {
  background: rgba(0, 0, 0, .2);
  cursor: not-allowed;
}
</style>
