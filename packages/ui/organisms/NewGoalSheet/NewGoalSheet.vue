<template>
  <!--
    The new-goal sheet (Goals.dc.html § sheetOpen) — a phone bottom sheet and a
    500px centred dialog, which is `ResponsiveSheet` with the per-page width
    override chassis.md records for Goals.

    One field, two choices: which level the goal belongs to and which routine it
    hangs off. The routine chip row is horizontally scrollable because a day has
    seven routines and a phone has 412px.

    Pure: props in, `submit` / `close` out. The DRAFT (period, text, routine) is
    local UI state, reset from the props every time the sheet opens — it is not
    server state, and threading three `.sync` props through a container to type a
    sentence would be worse.
  -->
  <ResponsiveSheet
    :open="open"
    :shell="shell"
    :width="SHEET_WIDTH"
    title="New goal"
    @close="$emit('close')"
  >
    <div class="rn-ngoal" data-testid="new-goal-sheet">
      <div class="rn-ngoal__periods">
        <div
          v-for="chip in PERIOD_CHIPS"
          :key="chip.key"
          class="rn-ngoal__period"
          :class="{ 'rn-ngoal__period--on': chip.key === draft.period }"
          :data-testid="`new-goal-period-${chip.key}`"
          @click="draft.period = chip.key; $emit('period-change', chip.key)"
        >{{ chip.label }}</div>
      </div>

      <input
        ref="body"
        v-model="draft.body"
        class="rn-ngoal__input"
        type="text"
        :placeholder="placeholder"
        data-testid="new-goal-body"
        @keydown.enter.prevent="submit"
      />

      <div class="rn-ngoal__label">{{ routineLabel }}</div>
      <div class="rn-ngoal__chips rn-hidescroll">
        <div
          v-for="chip in routineChips"
          :key="chip.key"
          class="rn-ngoal__chip"
          :class="{ 'rn-ngoal__chip--on': chip.id === draft.taskRef }"
          :data-testid="`new-goal-routine-${chip.key}`"
          @click="draft.taskRef = chip.id"
        >{{ chip.label }}</div>
      </div>

      <div class="rn-ngoal__foot">
        <div class="rn-ngoal__hint">{{ hint }}</div>
        <button
          type="button"
          class="rn-ngoal__add"
          :class="{ 'rn-ngoal__add--ready': ready }"
          data-testid="new-goal-submit"
          @click="submit"
        >Add</button>
      </div>
    </div>
  </ResponsiveSheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';
import {
  LIFETIME, NO_ROUTINE, PERIOD_CHIPS, PERIOD_PLACEHOLDER,
} from '../../constants/goalsCascade';

/** chassis.md § "Sheet vs dialog": Goals' new-goal sheet is 500px. */
const SHEET_WIDTH = 500;

export default {
  name: 'OrganismNewGoalSheet',
  components: { ResponsiveSheet },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The level the ladder is on when the sheet opens. */
    period: { type: String, default: 'day' },
    /** The routine pre-selected — the one whose window contains now. */
    taskRef: { type: String, default: '' },
    /** `[{ id, name, time }]` in time order. */
    routines: { type: Array, default: () => [] },
    /** What this period's date means: "For today · counts toward the week". */
    hint: { type: String, default: '' },
  },
  data() {
    return {
      SHEET_WIDTH,
      PERIOD_CHIPS,
      draft: { period: this.period, body: '', taskRef: this.taskRef },
    };
  },
  computed: {
    placeholder() {
      return PERIOD_PLACEHOLDER[this.draft.period] || '';
    },
    /**
     * A lifetime goal need not hang off a routine at all, so that period — and
     * only that period — offers an explicit "No routine" chip.
     */
    routineChips() {
      const chips = this.draft.period === LIFETIME
        ? [{ key: NO_ROUTINE.id, id: '', label: NO_ROUTINE.name }]
        : [];
      return chips.concat(this.routines.map((routine) => ({
        key: String(routine.id),
        id: String(routine.id),
        label: [routine.time, routine.name].filter(Boolean).join(' '),
      })));
    },
    routineLabel() {
      return this.draft.period === LIFETIME ? 'LINK TO A ROUTINE (OPTIONAL)' : 'ROUTINE';
    },
    ready() {
      return !!this.draft.body.trim();
    },
  },
  watch: {
    /**
     * Reset on OPEN, not on every prop change: the draft is the user's, and
     * re-seeding it while they type would eat the sentence.
     */
    open(isOpen) {
      if (!isOpen) return;
      this.draft = { period: this.period, body: '', taskRef: this.taskRef };
      this.$nextTick(() => {
        if (this.$refs.body && this.$refs.body.focus) this.$refs.body.focus();
      });
    },
  },
  methods: {
    submit() {
      if (!this.ready) return;
      this.$emit('submit', {
        period: this.draft.period,
        body: this.draft.body.trim(),
        taskRef: this.draft.taskRef || '',
      });
    },
  },
};
</script>

<style>
.rn-ngoal {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-ngoal__periods {
  display: flex;
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid #288bd5;
  margin-bottom: 12px;
}

.rn-ngoal__period {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  background: #fff;
  color: rgba(0, 0, 0, .7);
  cursor: pointer;
  transition: background .2s;
}

.rn-ngoal__period--on {
  background: #288bd5;
  color: #fff;
}

.rn-ngoal__input {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  border-bottom: 2px solid #288bd5;
  outline: 0;
  font: inherit;
  font-size: 17px;
  line-height: 1.6;
  color: #333;
  padding: 6px 0;
  background: transparent;
}

.rn-ngoal__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
  margin: 14px 0 6px;
}

.rn-ngoal__chips {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.rn-ngoal__chip {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  background: #fff;
  color: rgba(0, 0, 0, .7);
  border: 1px solid rgba(0, 0, 0, .12);
  cursor: pointer;
}

.rn-ngoal__chip--on {
  background: rgba(40, 139, 213, .12);
  color: #1f6fab;
  border-color: rgba(40, 139, 213, .45);
}

.rn-ngoal__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
}

.rn-ngoal__hint {
  flex: 1;
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

.rn-ngoal__add {
  height: 38px;
  padding: 0 18px;
  border: 0;
  border-radius: 19px;
  background: rgba(0, 0, 0, .2);
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background .2s;
}

.rn-ngoal__add--ready {
  background: #288bd5;
}
</style>
