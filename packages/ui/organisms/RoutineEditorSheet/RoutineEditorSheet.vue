<template>
  <!--
    The Routines editor (packages/design/Routines.dc.html § the sheet).

    One sheet for New and Edit: a bottom sheet from `top:48px` on phone, a 560px
    centred dialog on tablet AND desktop (the chassis' per-page exception —
    chassis.md § "Sheet vs dialog"). It carries everything a routine is: name,
    start time in 10-minute steps, points, description, hierarchical `:` tags,
    an ordered checklist, its linked agent and year goal, and — only when the
    routine already exists — Delete. The per-row edit/delete icons the old
    settings table had are gone; this is where delete lives now.

    Points obey two caps: 1..50 for this one routine (the new design's), and the
    day's 100-point budget shared across all of them (the old dialog's "Point
    Remaining", which the XP ledger settles against). The second one needs the
    routine list, which a pure organism may not read — so it arrives as
    `maxPoints` and the POINTS caption names what is left.

    Purely presentational. The draft lives here so a cancelled edit cannot touch
    the cache; `save` emits the complete routine and the container owns the write.
  -->
  <responsive-sheet
    class="rn-red"
    :open="open"
    :shell="shell"
    :width="560"
    :handle="false"
    :closable="false"
    @close="$emit('close')"
  >
    <template v-slot:header>
      <div class="rn-red__head">
        <i class="rn-mi rn-red__close" data-testid="editor-close" @click="$emit('close')">close</i>
        <div class="rn-red__title" data-testid="editor-title">{{ title }}</div>
        <!--
          Save stays clickable even when the form is short of something. A button
          disabled for a reason the form never states leaves the user with nowhere
          to go (D-11) — so it is muted, and pressing it prints what is missing.
        -->
        <button
          type="button"
          class="rn-red__save"
          :class="{ 'rn-red__save--off': !canSave }"
          data-testid="editor-save"
          @click="submit"
        >Save</button>
      </div>
    </template>

    <div class="rn-red__body">
      <div v-if="problem" class="rn-red__problem" data-testid="editor-problem">{{ problem }}</div>

      <div class="rn-red__label">ROUTINE NAME</div>
      <input
        v-model="draft.name"
        type="text"
        class="rn-red__name"
        placeholder="e.g. Evening Stretch"
        data-testid="editor-name"
      />

      <div class="rn-red__grid">
        <div class="rn-red__stepper">
          <div class="rn-red__label">STARTS AT</div>
          <div class="rn-red__stepper-row">
            <i class="rn-mi rn-red__round" data-testid="editor-time-down" @click="stepStart(-1)">remove</i>
            <div class="rn-red__stepper-value" data-testid="editor-time">{{ draft.time }}</div>
            <i class="rn-mi rn-red__round" data-testid="editor-time-up" @click="stepStart(1)">add</i>
          </div>
          <div class="rn-red__caption" data-testid="editor-until">{{ untilLabel }}</div>
        </div>

        <div class="rn-red__stepper">
          <div class="rn-red__label">POINTS</div>
          <div class="rn-red__stepper-row">
            <i class="rn-mi rn-red__round" data-testid="editor-points-down" @click="stepPoints(-1)">remove</i>
            <div class="rn-red__stepper-value rn-red__stepper-value--pts" data-testid="editor-points">
              <i class="rn-mi rn-red__pts-glyph">diamond</i>{{ draft.points }}
            </div>
            <i class="rn-mi rn-red__round" data-testid="editor-points-up" @click="stepPoints(1)">add</i>
          </div>
          <!-- The caption carries the day's remaining budget once that budget is
               what bounds this routine — the same figure the old dialog printed
               as "Point Remaining", in the design's own "value · value" form. -->
          <div class="rn-red__caption" data-testid="editor-points-caption">{{ pointsCaption }}</div>
        </div>
      </div>

      <div class="rn-red__label rn-red__label--spaced">DESCRIPTION</div>
      <textarea
        v-model="draft.description"
        rows="2"
        class="rn-red__desc"
        placeholder="What is this routine for?"
        data-testid="editor-description"
      ></textarea>

      <div class="rn-red__row-label rn-red__label--spaced">
        <div class="rn-red__label">TAGS</div>
        <div class="rn-red__hint">Use <b class="rn-red__mono">:</b> for levels · area:health:fitness</div>
      </div>
      <!-- The one tag editor in the app. Level-aware autocomplete, the
           `{n} inside ›` drill-in pill, Enter/Tab/comma/space to add. -->
      <hierarchical-tag-input
        v-model="draft.tags"
        :universe="tagUniverse"
        :usage="tagUsage"
        usage-noun="routine"
        data-testid="editor-tags"
      />

      <div class="rn-red__row-label rn-red__label--spaced">
        <div class="rn-red__label">STEPS</div>
        <div class="rn-red__hint">{{ draft.steps.length }} · shown as the routine's checklist</div>
      </div>
      <div class="rn-red__steps">
        <div
          v-for="(step, i) in draft.steps"
          :key="step.key"
          class="rn-red__step"
          :class="{ 'rn-red__step--first': i === 0, 'rn-red__step--moved': step.key === movedKey }"
          data-testid="editor-step"
        >
          <div class="rn-red__step-n">{{ i + 1 }}</div>
          <div class="rn-red__step-name">{{ step.name }}</div>
          <i
            class="rn-mi rn-red__step-btn"
            :class="{ 'rn-red__step-btn--off': i === 0 }"
            title="Move up"
            data-testid="editor-step-up"
            @click="move(i, -1)"
          >arrow_upward</i>
          <i
            class="rn-mi rn-red__step-btn"
            :class="{ 'rn-red__step-btn--off': i === draft.steps.length - 1 }"
            title="Move down"
            data-testid="editor-step-down"
            @click="move(i, 1)"
          >arrow_downward</i>
          <i
            class="rn-mi rn-red__step-x"
            title="Remove step"
            data-testid="editor-step-remove"
            @click="removeStep(i)"
          >close</i>
        </div>
        <div class="rn-red__step-add">
          <i class="rn-mi rn-red__step-add-glyph">add</i>
          <input
            v-model="stepText"
            type="text"
            class="rn-red__step-input"
            placeholder="Type a step, Enter to add"
            data-testid="editor-step-input"
            @keydown="onStepKey"
          />
        </div>
      </div>

      <div class="rn-red__label rn-red__label--spaced">LINKED</div>
      <div class="rn-red__linked">
        <div class="rn-red__linked-row" data-testid="editor-agent">
          <i class="rn-mi rn-red__linked-glyph rn-red__linked-glyph--agent">smart_toy</i>
          <div class="rn-red__linked-text">
            <div class="rn-red__linked-title">{{ agentLabel }}</div>
            <div class="rn-red__linked-sub">{{ agentSub }}</div>
          </div>
          <button
            type="button"
            class="rn-red__manage"
            data-testid="editor-agent-manage"
            @click="$emit('manage-agent')"
          >{{ agent ? 'Manage' : 'Add' }}</button>
        </div>

        <div
          class="rn-red__linked-row rn-red__linked-row--next"
          data-testid="editor-goal"
          @click="$emit('open-goal', yearGoal && yearGoal.id ? yearGoal.id : '')"
        >
          <i class="rn-mi rn-red__linked-glyph rn-red__linked-glyph--goal">flag</i>
          <div class="rn-red__linked-text">
            <div class="rn-red__linked-title rn-red__linked-title--clip">{{ goalLabel }}</div>
            <div class="rn-red__linked-sub">Year goal · {{ goalSub }}</div>
          </div>
          <i class="rn-mi rn-red__linked-chevron">chevron_right</i>
        </div>
      </div>

      <!-- Delete exists only for a routine that exists. On a new one there is
           nothing to delete, and a live Delete there reads as "discard". -->
      <div
        v-if="canDelete"
        class="rn-red__delete"
        data-testid="editor-delete"
        @click="$emit('delete', draft.id)"
      >
        <i class="rn-mi rn-red__delete-glyph">delete</i>Delete routine
      </div>
    </div>
  </responsive-sheet>
</template>

<script>
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';
import HierarchicalTagInput from '../../molecules/HierarchicalTagInput/HierarchicalTagInput.vue';
import {
  clampPoints,
  moveStep,
  stepTime,
  untilCaption,
  DAILY_POINTS_BUDGET,
  POINTS_MAX,
  POINTS_MIN,
} from '../../utils/dayDial';

/** Server-side field caps, re-stated so the refusal names the field. */
export const NAME_MAX = 100;
export const DESCRIPTION_MAX = 255;

/** The design's POINTS caption. The budget figure is appended to it, never below it. */
export const POINTS_CAPTION = 'Earned when ticked';

/** Where a brand-new routine starts when nothing suggested a time. */
export const DEFAULT_START = '19:30';

/** What a new routine is worth before the stepper is touched. */
export const DEFAULT_POINTS = 10;

let stepSeq = 0;
/** A render key for a step row. Not an id — the container owns persisted ids. */
const nextKey = () => {
  stepSeq += 1;
  return `s${stepSeq}`;
};

/**
 * Where a NEW routine's points start: the default, or what the day has left when
 * that is less (E2E BUG-6 — with 1 point left the sheet opened at 10 and the
 * first Save was refused). An exhausted day still opens at the 1-point floor;
 * the sheet says why it cannot be saved rather than showing a 0 nobody can pick.
 */
export const defaultPointsFor = (ceiling) => {
  const max = Number(ceiling);
  return clampPoints(Number.isFinite(max) ? Math.min(DEFAULT_POINTS, max) : DEFAULT_POINTS);
};

const toDraft = (routine, defaultTime, ceiling) => ({
  id: (routine && routine.id) || '',
  name: (routine && routine.name) || '',
  description: (routine && routine.description) || '',
  time: (routine && routine.time) || defaultTime || DEFAULT_START,
  points: clampPoints(routine ? routine.points : defaultPointsFor(ceiling)),
  tags: [...((routine && routine.tags) || [])],
  steps: ((routine && routine.steps) || []).map((step) => ({
    key: nextKey(),
    id: (step && step.id) || '',
    name: (step && step.name) || '',
  })),
});

export default {
  name: 'OrganismRoutineEditorSheet',

  components: { ResponsiveSheet, HierarchicalTagInput },

  props: {
    open: { type: Boolean, default: false },
    /** phone | tablet | desktop. Drives bottom sheet vs 560px dialog. */
    shell: { type: String, default: 'phone' },
    /** The routine being edited, or `null` for a new one. */
    routine: { type: Object, default: null },
    /** "HH:mm" a new routine should open at — the gap row's midpoint. */
    defaultTime: { type: String, default: '' },
    /**
     * Every routine's `{ id, time }`, for the "Until 12:30 · 3h 30m" caption.
     * The routine being edited is excluded by id, so it cannot bound itself.
     */
    siblings: { type: Array, default: () => [] },
    /**
     * The ceiling this routine's points may reach — `min(POINTS_MAX, what the
     * day's 100-point budget has left)`. This organism cannot read the routine
     * list, so the container works it out (`maxPointsFor`) and hands it down.
     * It may be 0 or negative when the day is already spoken for, which is a
     * state the editor explains rather than silently clamps.
     */
    maxPoints: { type: Number, default: POINTS_MAX },
    tagUniverse: { type: Array, default: () => [] },
    tagUsage: { type: Object, default: () => ({}) },
    /** `{ name, status }` of the agent bound to this routine, or null. */
    agent: { type: Object, default: null },
    /** `{ id, body, pct }` of the linked year goal, or null. */
    yearGoal: { type: Object, default: null },
    /** A failed save's reason, shown above the fields so the sheet can stay open. */
    errorMessage: { type: String, default: '' },
  },

  data() {
    return {
      draft: toDraft(null, '', POINTS_MAX),
      stepText: '',
      movedKey: '',
      localProblem: '',
    };
  },

  computed: {
    isNew() {
      return !this.draft.id;
    },
    title() {
      return this.isNew ? 'New routine' : 'Edit routine';
    },
    canDelete() {
      return !this.isNew;
    },
    canSave() {
      return !this.validate();
    },
    /** The save refusal, or the container's error — whichever is live. */
    problem() {
      return this.localProblem || this.errorMessage;
    },
    untilLabel() {
      return untilCaption(this.draft.time, this.siblings, this.draft.id);
    },
    /**
     * Where the `+` stops. `maxPoints` is already the lower of the two caps, but
     * a caller that passed only the budget must not be able to lift the
     * per-routine 50.
     */
    pointsCeiling() {
      const max = Number(this.maxPoints);
      return Number.isFinite(max) ? Math.min(POINTS_MAX, max) : POINTS_MAX;
    },
    /**
     * "Earned when ticked · 8 left today".
     *
     * The budget earns a mention only once it is the binding cap. At or above
     * the per-routine 50 the day has more than this routine could ever take, so
     * naming a figure there would be noise in an 11px caption.
     */
    pointsCaption() {
      if (this.pointsCeiling >= POINTS_MAX) return POINTS_CAPTION;
      return `${POINTS_CAPTION} · ${Math.max(0, this.pointsCeiling)} left today`;
    },
    agentLabel() {
      return (this.agent && this.agent.name) || 'No agent';
    },
    agentSub() {
      if (!this.agent) return 'Nothing runs when this routine starts';
      const status = this.agent.status || 'idle';
      return `Agent · ${status} · runs from Start Agent on Home`;
    },
    goalLabel() {
      return (this.yearGoal && this.yearGoal.body) || 'No year goal linked';
    },
    goalSub() {
      if (!this.yearGoal) return 'Link one from Year Goals';
      const pct = Number(this.yearGoal.pct) || 0;
      return `${pct}% this year`;
    },
  },

  watch: {
    // Re-seed on every open, and whenever the page swaps which routine is being
    // edited while the sheet is up (tapping another arc).
    open: {
      immediate: true,
      handler(isOpen) {
        if (isOpen) this.reset();
      },
    },
    routine() {
      if (this.open) this.reset();
    },
  },

  methods: {
    reset() {
      this.draft = toDraft(this.routine, this.defaultTime, this.pointsCeiling);
      this.stepText = '';
      this.movedKey = '';
      // A new routine on a spent day cannot be saved at any value; say so up
      // front instead of on the first Save.
      this.localProblem = this.isNew && this.pointsCeiling < POINTS_MIN ? this.pointsRefusal() : '';
    },

    /** The first failing rule, or '' — same order the fields are laid out in. */
    validate() {
      const name = this.draft.name.trim();
      if (!name) return 'Name is required';
      if (name.length > NAME_MAX) return `Name must be less than ${NAME_MAX} characters`;
      if ((this.draft.description || '').length > DESCRIPTION_MAX) {
        return `Description must be less than ${DESCRIPTION_MAX} characters`;
      }
      if (!this.draft.time) return 'Time is required';
      if (this.draft.points > this.pointsCeiling) return this.pointsRefusal();
      return '';
    },

    /**
     * Why the points cannot go any higher. Exhausted gets its own line because
     * the generic one would read "Points must be 0 or fewer", which names no
     * value the user could pick — there is nothing to do to this routine, the
     * room has to come off another one.
     */
    pointsRefusal() {
      if (this.pointsCeiling < POINTS_MIN) {
        return `All ${DAILY_POINTS_BUDGET} points of the day are already given out — lower another routine to make room`;
      }
      return `Points must be ${this.pointsCeiling} or fewer`;
    },

    stepStart(direction) {
      this.draft.time = stepTime(this.draft.time, direction);
    },

    /**
     * The budget bounds going UP only. It never pulls a stored value back down:
     * a routine saved at 30 in a day that now has 10 left opens at its own 30,
     * and the refusal says what is wrong — a silent clamp would rewrite the
     * user's number for them (D-11).
     */
    stepPoints(direction) {
      const next = clampPoints(this.draft.points + direction);
      if (direction > 0 && next > this.pointsCeiling) {
        // A `+` that moves nothing and says nothing reads as a broken button.
        this.localProblem = this.pointsRefusal();
        return;
      }
      this.draft.points = next;
      // The refusal is about the points, so it goes once the points are valid
      // again (E2E BUG-7) — any other problem stays until Save re-checks it.
      if (this.localProblem && this.localProblem === this.pointsRefusal() && next <= this.pointsCeiling) {
        this.localProblem = '';
      }
    },

    addStep() {
      const name = this.stepText.trim();
      if (!name) return;
      this.draft.steps.push({ key: nextKey(), id: '', name });
      this.stepText = '';
    },

    removeStep(index) {
      this.draft.steps.splice(index, 1);
    },

    /**
     * Swap with the neighbour. `moveStep` returns the SAME array when the row is
     * already at a bound, which is how the flash stays off instead of tinting a
     * row that did not move.
     */
    move(index, direction) {
      const next = moveStep(this.draft.steps, index, direction);
      if (next === this.draft.steps) return;
      this.movedKey = this.draft.steps[index].key;
      this.draft.steps = next;
    },

    onStepKey(event) {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.addStep();
        return;
      }
      // Backspace on an empty field pulls the last step back off, the same way
      // the tag input drops its last chip.
      if (event.key === 'Backspace' && !this.stepText && this.draft.steps.length) {
        event.preventDefault();
        this.removeStep(this.draft.steps.length - 1);
      }
    },

    submit() {
      const problem = this.validate();
      if (problem) {
        this.localProblem = problem;
        return;
      }
      this.localProblem = '';
      this.$emit('save', {
        id: this.draft.id,
        name: this.draft.name.trim(),
        description: this.draft.description || '',
        time: this.draft.time,
        points: clampPoints(this.draft.points),
        tags: [...this.draft.tags],
        // `id: ''` marks a step the container still has to mint an id for.
        steps: this.draft.steps.map((step) => ({ id: step.id, name: step.name })),
      });
    },
  },
};
</script>

<style>
/* The phone sheet is near-full-screen (`top:48px`): the editor carries steps,
   tags and two linked rows, which do not fit in a half sheet. This reaches into
   ResponsiveSheet's own class, so it cannot be scoped — every selector is
   prefixed with `.rn-red`. */
.rn-red .rn-rsheet__panel--sheet {
  top: 48px;
  max-height: none;
}

.rn-red .rn-rsheet__head {
  padding: 0;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
}

.rn-red .rn-rsheet__body {
  padding: 0;
}

.rn-red__head {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 8px 8px 8px 4px;
  box-sizing: border-box;
}

.rn-red__close {
  font-size: 22px;
  color: rgba(0, 0, 0, .6);
  cursor: pointer;
  padding: 10px;
}

.rn-red__title {
  flex: 1;
  min-width: 0;
  font-size: 17px;
  font-weight: 700;
}

.rn-red__save {
  height: 36px;
  padding: 0 18px;
  border: 0;
  border-radius: 18px;
  background: #288bd5;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-red__save--off {
  background: rgba(0, 0, 0, .2);
}

.rn-red__body {
  padding: 16px 16px 24px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-red__problem {
  margin-bottom: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(211, 47, 47, .08);
  color: #d32f2f;
  font-size: 12px;
  font-weight: 600;
}

.rn-red__label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-red__label--spaced {
  margin-top: 18px;
}

.rn-red__row-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.rn-red__hint {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-red__mono {
  font-family: ui-monospace, Menlo, monospace;
  color: rgba(0, 0, 0, .7);
}

.rn-red__name {
  width: 100%;
  box-sizing: border-box;
  border: 0;
  border-bottom: 2px solid #288bd5;
  outline: 0;
  font: inherit;
  font-size: 20px;
  font-weight: 600;
  color: #222;
  padding: 6px 0 8px;
  background: transparent;
}

.rn-red__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 16px;
}

.rn-red__stepper {
  border-radius: 14px;
  background: #f7f7f7;
  padding: 10px 12px;
}

.rn-red__stepper-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
}

.rn-red__round {
  font-size: 22px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .1);
  cursor: pointer;
  flex-shrink: 0;
}

.rn-red__stepper-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rn-red__stepper-value--pts {
  display: flex;
  align-items: center;
  gap: 3px;
}

.rn-red__pts-glyph {
  font-size: 18px;
  color: #288bd5;
}

.rn-red__caption {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
  margin-top: 6px;
  text-align: center;
}

.rn-red__desc {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 12px;
  outline: 0;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
  color: #333;
  padding: 10px 12px;
  margin-top: 8px;
  resize: none;
  background: #fff;
}

.rn-red__steps {
  margin-top: 6px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, .08);
  overflow: hidden;
}

.rn-red__step {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 6px 0 10px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  background: #fff;
}

.rn-red__step--first {
  border-top: 0;
}

.rn-red__step--moved {
  animation: rn-flash .6s ease;
}

.rn-red__step-n {
  width: 22px;
  font-size: 12px;
  font-weight: 700;
  color: rgba(0, 0, 0, .35);
}

.rn-red__step-name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}

.rn-red__step-btn {
  font-size: 20px;
  color: rgba(0, 0, 0, .55);
  cursor: pointer;
  padding: 4px;
}

/* Dim rather than hide: the pair has to stay in place, or every row's icons
   would shift as the list is reordered. */
.rn-red__step-btn--off {
  color: rgba(0, 0, 0, .15);
}

.rn-red__step-x {
  font-size: 18px;
  color: rgba(0, 0, 0, .4);
  cursor: pointer;
  padding: 4px;
}

.rn-red__step-add {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 6px 0 10px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  background: #fafafa;
}

.rn-red__step-add-glyph {
  font-size: 20px;
  color: #288bd5;
}

.rn-red__step-input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: #333;
}

.rn-red__linked {
  margin-top: 8px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, .08);
  overflow: hidden;
}

.rn-red__linked-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 0 12px;
}

.rn-red__linked-row--next {
  border-top: 1px solid rgba(0, 0, 0, .06);
  cursor: pointer;
}

.rn-red__linked-glyph {
  font-size: 22px;
  flex-shrink: 0;
}

.rn-red__linked-glyph--agent {
  color: #1976d2;
}

.rn-red__linked-glyph--goal {
  color: #288bd5;
}

.rn-red__linked-text {
  flex: 1;
  min-width: 0;
}

.rn-red__linked-title {
  font-size: 14px;
  font-weight: 600;
}

.rn-red__linked-title--clip {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-red__linked-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

.rn-red__manage {
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-red__linked-chevron {
  font-size: 20px;
  color: rgba(0, 0, 0, .3);
  flex-shrink: 0;
}

.rn-red__delete {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 46px;
  margin-top: 20px;
  border-radius: 12px;
  border: 1px solid rgba(211, 47, 47, .25);
  color: #d32f2f;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.rn-red__delete-glyph {
  font-size: 18px;
}
</style>
