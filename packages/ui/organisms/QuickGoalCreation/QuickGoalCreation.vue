<template>
  <!--
    Start Work — `sheetAction` in `packages/design/Routine Notes Final.dc.html`,
    the sheet the tick ring on an unticked routine opens.

    It used to be a bare Vuetify form body that whichever host mounted it wrapped
    in its own dialog chrome, so on the Routine Focus home it came up as a 480px
    `v-dialog` with a close button, a 17px title and uppercase pill buttons —
    none of which the design draws. It now presents itself on the chassis
    `ResponsiveSheet` (phone bottom sheet · tablet 860 · desktop 720, radius 20,
    docs/redesign/chassis.md § "Sheet vs dialog"), with the design's own parts:
    a task line, the locked routine chip, a bordered PARENT GOAL picker, the
    Related Goals timeline, the one-line hint, and two equal 44px buttons.

    It is also where the classic dashboard's SECOND dialog went. There, a check
    circle on a routine that already had a day goal item opened a goal-action
    modal instead of this form, so the user could see the item Start Task would
    complete and the agent would be handed. That is the `lockedItem` block below:
    one sheet, which either has an item locked in or does not.

    `sheet` is the switch, and it is off by default: the classic dashboard's
    quick-task dialog and `QuickTaskModalContainer` already supply their own
    `v-dialog`, and nesting a second overlay inside one would stack two scrims.
    Off, the identical body renders inline for them; on, it owns the overlay.

    There is no close button. The design dismisses this sheet by backdrop (and
    `ResponsiveSheet` adds Escape), because the one thing a stray tap must never
    do here is start a routine or fire an agent.

    Pure presentational: props in, events out. Every event the old form emitted
    is emitted unchanged — `add-goal-item`, `start-quick-goal-task`,
    `start-agent`, `build-agent`, `goal-ref-changed` — plus `close`.
  -->
  <component
    :is="sheet ? 'responsive-sheet' : 'div'"
    v-bind="wrapperAttrs"
    :class="sheet ? 'rn-qg-sheet' : 'rn-qg-host'"
    @close="$emit('close')"
  >
    <div class="rn-qg">
      <!--
        The header lives inside the scroll column, not in the chassis header
        slot: the design scrolls the title with the body and draws no close
        button, and `ResponsiveSheet` only renders its sticky, closable header
        when there is a title, a × or a header slot to put in it.
      -->
      <div v-if="sheet" class="rn-qg__head">
        <div class="rn-qg__title" data-testid="quick-goal-title">{{ headingText }}</div>
        <div v-if="hasMeta" class="rn-qg__meta" data-testid="quick-goal-meta">
          <span v-if="timeRangeLabel">{{ timeRangeLabel }}</span>
          <span v-if="timeRangeLabel && earnLabel"> · </span>
          <span v-if="earnLabel">earns <b class="rn-qg__earn">{{ earnLabel }}</b></span>
        </div>
        <p v-if="description" class="rn-qg__desc" data-testid="quick-goal-description">
          {{ description }}
        </p>
      </div>

      <div class="rn-qg__fields">
        <div
          class="rn-qg__line"
          :class="{ 'rn-qg__line--on': bodyFocused }"
          data-testid="quick-goal-body-row"
        >
          <i class="rn-mi rn-qg__line-glyph">add_task</i>
          <input
            id="newGoalItemBody"
            v-model="newGoalItem.body"
            name="newGoalItemBody"
            class="rn-qg__input"
            type="text"
            autocomplete="off"
            :placeholder="bodyPlaceholder"
            data-testid="quick-goal-body"
            @focus="bodyFocused = true"
            @blur="bodyFocused = false"
            @keyup.enter="handleAddGoalItem"
          />
          <i
            v-if="typedBody"
            class="rn-mi rn-qg__line-clear"
            title="Clear"
            data-testid="quick-goal-clear"
            @click="clearBody"
          >close</i>
        </div>

        <!--
          The routine is fixed for this sheet: it is the one whose tick ring was
          tapped, and the old form said so with a DISABLED Vuetify select, which
          reads as a control that is broken rather than one that is settled. The
          design's chip states the binding and carries the lock.
        -->
        <div
          v-if="lockedRoutine"
          class="rn-qg__locked"
          data-testid="quick-goal-locked-routine"
        >
          <i class="rn-mi rn-qg__locked-glyph">history</i>
          <div class="rn-qg__locked-text">
            <b class="rn-qg__locked-name">{{ lockedRoutine.name }}</b>
            <span v-if="lockedRoutine.time"> · {{ lockedRoutine.time }}</span>
          </div>
          <i
            class="rn-mi rn-qg__locked-lock"
            title="Routine is fixed for this sheet"
            aria-label="Routine is fixed for this sheet"
            data-testid="quick-goal-routine-lock"
          >lock</i>
        </div>

        <!--
          The goal item this routine is already locked in on.

          The classic dashboard branched to a SECOND dialog here
          (`DashBoard.openGoalActionModal`): tapping the check circle on a
          routine that already had a day goal item opened a goal-action modal
          showing that item plus Start Task / Start Agent / Build Agent, and only
          a routine with nothing on it got the create form. The branch is folded
          into this one sheet rather than restored as a second modal — the sheet
          already carries both actions, so the only thing it was missing is the
          item itself.

          It matters because of the agent: `{goalId}` in an agent's start URL
          resolves to the routine's FIRST day goal item, so Start Agent acts on
          exactly this row. With it off-screen there was no way to tell what was
          about to be dispatched, which is what the lock and the overline say.

          Plain text, not markdown: the dashboard ran the contribution through
          `vue-markdown`, and `packages/ui` carries no markdown dependency.
        -->
        <div
          v-if="lockedItem"
          class="rn-qg__item"
          data-testid="quick-goal-locked-item"
        >
          <div class="rn-qg__item-head">
            <span class="rn-qg__item-label">{{ lockedItemLabel }}</span>
            <i
              class="rn-mi rn-qg__item-lock"
              :title="lockedItemLockTitle"
              :aria-label="lockedItemLockTitle"
              data-testid="quick-goal-item-lock"
            >lock</i>
          </div>
          <div
            class="rn-qg__item-body"
            :class="{ 'rn-qg__item-body--done': !!lockedItem.isComplete }"
            data-testid="quick-goal-locked-item-body"
          >{{ lockedItem.body }}</div>
          <div
            v-if="lockedItem.contribution"
            class="rn-qg__item-note"
            data-testid="quick-goal-locked-item-note"
          >{{ lockedItem.contribution }}</div>
        </div>

        <!--
          The parent-goal picker, drawn as one of the AI search modal's toolbar
          selects rather than as a 52px two-line row of its own: this is the same
          choice that modal's `flag` select makes, and the two sit one tap apart
          on the same screen. One line, so the caption above the value goes — the
          glyph says which link it is, exactly as it does there.
        -->
        <div
          class="rn-qg__pick"
          :class="{ 'rn-qg__pick--on': pickerOpen }"
          role="button"
          :aria-expanded="pickerOpen ? 'true' : 'false'"
          data-testid="quick-goal-goal-picker"
          @click="togglePicker"
        >
          <i class="rn-mi rn-qg__pick-glyph">flag</i>
          <div
            class="rn-qg__pick-value"
            :class="{ 'rn-qg__pick-value--empty': !selectedGoalBody }"
            data-testid="quick-goal-goal-value"
          >{{ selectedGoalBody || noParentGoal }}</div>
          <i class="rn-mi rn-qg__pick-chev">{{ pickerOpen ? 'expand_less' : 'expand_more' }}</i>
        </div>

        <div
          v-if="pickerOpen"
          class="rn-qg__opts rn-hidescroll"
          data-testid="quick-goal-goal-options"
        >
          <template v-for="(option, index) in goalOptions">
            <div
              v-if="option.header"
              :key="`gh-${index}`"
              class="rn-qg__opt-head"
            >{{ option.header }}</div>
            <div
              v-else
              :key="`go-${index}`"
              class="rn-qg__opt"
              :class="{ 'rn-qg__opt--on': isSelectedOption(option) }"
              :data-testid="`quick-goal-option-${option.id || 'none'}`"
              @click.stop="pickGoalRef(option)"
            >
              <div class="rn-qg__opt-text">{{ option.body }}</div>
              <i
                v-if="isSelectedOption(option)"
                class="rn-mi rn-qg__opt-check"
                data-testid="quick-goal-option-check"
              >check</i>
            </div>
          </template>
        </div>

        <!-- Related Goals (N) — the existing molecule, not a second timeline. -->
        <related-tasks-timeline v-if="newGoalItem.goalRef" :tasks="relatedTasks" />

        <!--
          Tags are not in the design's Start Work sheet, but the editor is
          load-bearing (it feeds the user's tag vocabulary and the Priority
          quadrants), so on the sheet it sits behind one line instead of being
          dropped. The inline hosts keep it open, exactly as before.
        -->
        <div v-if="sheet" class="rn-qg__tags">
          <button
            v-if="!tagsOpen"
            type="button"
            class="rn-qg__tags-toggle"
            data-testid="quick-goal-tags-toggle"
            @click="tagsOpen = true"
          >
            <i class="rn-mi rn-qg__tags-glyph">sell</i>{{ tagsToggleLabel }}
          </button>
          <goal-tags-input
            v-else
            :goal-tags="newGoalItem.tags"
            :user-tags="userTags"
            @update-new-tag-items="updateNewTagItems"
          />
        </div>
        <goal-tags-input
          v-else
          :goal-tags="newGoalItem.tags"
          :user-tags="userTags"
          @update-new-tag-items="updateNewTagItems"
        />

        <div
          v-if="redeemCost > 0"
          class="rn-qg__redeem"
          data-testid="quick-goal-redeem-note"
        >This task has already passed — starting it costs {{ redeemCost }} points.</div>

        <!--
          The design's one-line hint, immediately above the buttons: it is the
          only place that says what Start Task is about to DO with what has been
          typed. Blocked ("a routine can't start without a goal item") is the
          same sentence in warning orange rather than a separate disabled state,
          because the button works again the moment something is typed.
        -->
        <div
          v-if="hint"
          class="rn-qg__hint quick-goal-hint"
          :class="{ 'rn-qg__hint--warn': hintWarn, 'quick-goal-hint--warn': hintWarn }"
          data-testid="quick-goal-hint"
        >{{ hint }}</div>
      </div>

      <!--
        Two equal buttons, 44px, radius 16 — the design gives Start Task and the
        agent the same weight, because they are two ways to begin the same
        routine. Neither is ever disabled by work in flight: the pending-entity
        guard (`utils/cacheGuard.js`) owns that, and a disable-during-load on
        this screen has already had to be undone once. The spinner rides on the
        button that was actually pressed.
      -->
      <div class="rn-qg__foot" data-testid="quick-goal-actions">
        <button
          type="button"
          class="rn-qg__btn rn-qg__btn--primary"
          :class="{ 'rn-qg__btn--off': startBlocked }"
          :aria-busy="spinning('task') ? 'true' : 'false'"
          data-testid="quick-goal-start-task"
          @click="handleAddGoalItem"
        >
          <span
            v-if="spinning('task')"
            class="rn-qg__spin"
            data-testid="quick-goal-task-spin"
          ></span>
          Start Task
          <span v-if="costLabel" class="rn-qg__cost">
            <i class="rn-mi rn-qg__cost-glyph">diamond</i>{{ costLabel }}
          </span>
        </button>
        <button
          type="button"
          class="rn-qg__btn rn-qg__btn--ghost"
          :aria-busy="spinning('agent') ? 'true' : 'false'"
          data-testid="quick-goal-agent"
          @click="onAgentButton"
        >
          <span
            v-if="spinning('agent')"
            class="rn-qg__spin rn-qg__spin--ghost"
            data-testid="quick-goal-agent-spin"
          ></span>
          <i v-else class="rn-mi rn-qg__btn-glyph">smart_toy</i>{{ agentButtonLabel }}
          <span v-if="costLabel && agentAssigned" class="rn-qg__cost">
            <i class="rn-mi rn-qg__cost-glyph">diamond</i>{{ costLabel }}
          </span>
        </button>
      </div>
    </div>
  </component>
</template>

<script>
import getJSON from '../../utils/getJSON';
import GoalTagsInput from '../../molecules/GoalTagsInput/GoalTagsInput.vue';
import RelatedTasksTimeline from '../../molecules/RelatedTasksTimeline/RelatedTasksTimeline.vue';
import ResponsiveSheet from '../../molecules/ResponsiveSheet/ResponsiveSheet.vue';
import { groupGoalItemsByTaskRef } from '../../utils/groupingUtils';
import { USER_TAGS } from '../../constants/settings';

/** The picker's "roll this up into nothing" row, and the empty trigger value. */
const NO_PARENT_GOAL = 'No parent goal';

export default {
  name: 'QuickGoalCreation',
  components: {
    GoalTagsInput,
    RelatedTasksTimeline,
    ResponsiveSheet,
  },
  props: {
    goals: {
      type: Array,
      default: () => [],
    },
    selectedBody: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    period: {
      type: String,
      default: '',
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
    goalDetailsDialog: {
      type: Boolean,
      default: false,
    },
    selectedTaskRef: {
      type: String,
      default: '',
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    relatedTasks: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    buttonLoading: {
      type: Boolean,
      default: false,
    },
    // Which action initiated the in-flight work ('task' | 'agent') — the
    // spinner shows only on the button the user actually clicked. It never
    // disables anything; see the footer comment.
    loadingAction: {
      type: String,
      default: '',
    },
    agentState: {
      type: String,
      default: 'none', // 'none' | 'assigned'
    },
    // Points charged when the selected task has passed (0 = nothing to pay).
    redeemCost: {
      type: Number,
      default: 0,
    },
    /**
     * Present the form as the chassis sheet rather than as a bare body.
     *
     * Off by default so the hosts that already own a dialog — the classic
     * dashboard's quick-task `v-dialog` and `QuickTaskModalContainer` — keep
     * working untouched; nesting this sheet inside theirs would stack two
     * scrims and two radii.
     */
    sheet: {
      type: Boolean,
      default: false,
    },
    /** Sheet mode only: whether the overlay is up. */
    open: {
      type: Boolean,
      default: false,
    },
    /** phone | tablet | desktop — the three shells RoutineFocus resolves. */
    shell: {
      type: String,
      default: 'phone',
    },
    /** The routine this sheet starts. Heads the sheet and names the locked row. */
    routineName: {
      type: String,
      default: '',
    },
    /** Its start time, e.g. "09:00". */
    routineTime: {
      type: String,
      default: '',
    },
    /** Where its window closes, e.g. "12:30" — the "09:00 – 12:30" in the head. */
    routineEndTime: {
      type: String,
      default: '',
    },
    /** Points the routine earns, for the header's "earns +12 pts". */
    earnPoints: {
      type: Number,
      default: 0,
    },
    /** The routine's own description, which the old host sheet rendered above. */
    description: {
      type: String,
      default: '',
    },
    /**
     * Whether Start Task may start the routine with the input left empty.
     *
     * Off by default, which is the classic dashboard: there the modal is one of
     * several ways to tick (the task rows carry their own checkboxes), so Start
     * Task is reserved for "create this item, then tick". On the Routine Focus
     * home the sheet is the ONLY way to start a routine, so refusing an empty
     * input strands the user — a routine that has no checklist yet could not be
     * started at all.
     */
    allowStartWithoutTask: {
      type: Boolean,
      default: false,
    },
    /**
     * The goal item the routine is already locked in on — `{ body, contribution,
     * isComplete }`, the routine's FIRST day goal item, which is the one
     * `{goalId}` resolves to when an agent starts.
     *
     * `null` means the routine has nothing on it yet, and the sheet is the
     * create form it has always been.
     */
    lockedItem: {
      type: Object,
      default: null,
    },
    /**
     * How many open goal items the routine already has.
     *
     * Only used for the hint line, which is the one place the sheet says what
     * Start Task is about to do. -1 means "the host does not know", and the hint
     * is suppressed rather than guessed at.
     */
    openItemCount: {
      type: Number,
      default: -1,
    },
  },
  data() {
    return {
      noParentGoal: NO_PARENT_GOAL,
      bodyFocused: false,
      pickerOpen: false,
      tagsOpen: false,
      newGoalItem: {
        body: this.selectedBody || '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      defaultGoalItem: {
        body: this.selectedBody || '',
        isMilestone: false,
        goalRef: '',
        taskRef: this.selectedTaskRef || '',
        tags: [],
      },
      userTags: getJSON(localStorage.getItem(USER_TAGS), []),
    };
  },
  mounted() {
    this.initializeTagsFromSelectedTask();
  },
  computed: {
    /** Only the sheet presentation takes the overlay props. */
    wrapperAttrs() {
      if (!this.sheet) return {};
      return { open: this.open, shell: this.shell, closable: false };
    },
    headingText() {
      return this.routineName || 'Start work';
    },
    timeRangeLabel() {
      if (!this.routineTime) return '';
      return this.routineEndTime
        ? `${this.routineTime} – ${this.routineEndTime}`
        : this.routineTime;
    },
    earnLabel() {
      return this.earnPoints > 0 ? `+${this.earnPoints} pts` : '';
    },
    hasMeta() {
      return Boolean(this.timeRangeLabel || this.earnLabel);
    },
    /**
     * The routine the sheet is fixed to. Resolved from the tasklist so the chip
     * carries the real time, with the header props as the fallback for hosts
     * that pass the routine but not the whole day.
     */
    lockedRoutine() {
      const ref = this.newGoalItem.taskRef || this.selectedTaskRef;
      const task = (this.tasklist || [])
        .find((item) => item && (item.id === ref || item.taskId === ref));
      const name = (task && task.name) || this.routineName || '';
      if (!name) return null;
      return { name, time: (task && task.time) || this.routineTime || '' };
    },
    /** "Type your task" is wrong once there is already one; this adds to it. */
    bodyPlaceholder() {
      return this.lockedItem ? 'Add another task' : 'Type your task';
    },
    /**
     * Names the locked item for what it is. With an agent bound it is also the
     * dispatch target, and saying so is the whole point of showing the row.
     */
    lockedItemLabel() {
      return this.agentAssigned ? 'LOCKED IN · AGENT TARGET' : 'LOCKED IN';
    },
    lockedItemLockTitle() {
      return this.agentAssigned
        ? 'The agent runs against this goal item'
        : 'Already on this routine';
    },
    /**
     * The picker's rows: the same list the Vuetify select used to be handed, so
     * the grouping headers and the "no parent" row are unchanged — it is the
     * presentation that moved, not the data.
     */
    goalOptions() {
      const none = { id: '', body: NO_PARENT_GOAL };
      const items = this.goalItemsRef || [];
      if (!items.length) return [none];
      if (this.tasklist && this.tasklist.length) {
        return [none, ...groupGoalItemsByTaskRef(items, this.tasklist)];
      }
      return [none, ...items];
    },
    tagsToggleLabel() {
      const count = (this.newGoalItem.tags || []).length;
      return count ? `Tags (${count})` : 'Add tags';
    },
    agentAssigned() {
      return this.agentState === 'assigned';
    },
    /**
     * One control, two jobs — the design flips the label rather than hiding a
     * button, so the agent slot is always in the same place. With no agent bound
     * to this routine there is nothing to start, so it builds one.
     */
    agentButtonLabel() {
      return this.agentAssigned ? 'Start Agent' : 'Build Agent';
    },
    /** Price shown on the buttons that spend it, so the charge is no surprise. */
    costLabel() {
      return this.redeemCost > 0 ? String(Math.round(this.redeemCost)) : '';
    },
    /** Greys Start Task while there is nothing for the routine to start with. */
    startBlocked() {
      return this.hintWarn;
    },
    typedBody() {
      return (this.newGoalItem.body || '').trim();
    },
    /** The parent goal's body, for the hint — '' when nothing is selected. */
    selectedGoalBody() {
      const selected = (this.goalItemsRef || [])
        .find((goalItem) => goalItem && goalItem.id === this.newGoalItem.goalRef);
      return selected ? selected.body : '';
    },
    /**
     * A routine cannot start with nothing to show for it: no typed item AND no
     * open item on the checklist is the blocked case, and it is the only one that
     * warns.
     */
    hintWarn() {
      return !this.typedBody && this.openItemCount === 0;
    },
    hint() {
      if (this.typedBody) {
        const under = this.selectedGoalBody ? ` under ${this.selectedGoalBody}` : '';
        return `Start adds “${this.typedBody}” to the checklist${under}, then starts the routine.`;
      }
      if (this.openItemCount < 0) return '';
      if (!this.openItemCount) {
        return 'Type a goal item to start — a routine can’t start without one.';
      }
      const plural = this.openItemCount === 1 ? '' : 's';
      return `${this.openItemCount} open item${plural} on the checklist · `
        + 'type to add another, or just start.';
    },
  },
  methods: {
    /** True only for the button that started the in-flight work. */
    spinning(which) {
      return this.buttonLoading && this.loadingAction === which;
    },
    clearBody() {
      this.newGoalItem.body = '';
    },
    togglePicker() {
      this.pickerOpen = !this.pickerOpen;
    },
    isSelectedOption(option) {
      return (option.id || '') === (this.newGoalItem.goalRef || '');
    },
    pickGoalRef(option) {
      this.newGoalItem.goalRef = option.id || '';
      this.pickerOpen = false;
    },
    onAgentButton() {
      if (this.agentAssigned) {
        this.$emit('start-agent', { ...this.newGoalItem });
        return;
      }
      // No agent on this routine yet — hand off to the host's agent form, which
      // is the Agents page's own `AgentFormContainer`, pre-bound to the routine.
      this.$emit('build-agent');
    },
    initializeTagsFromSelectedTask() {
      if (this.selectedTaskRef && this.tasklist && this.tasklist.length > 0) {
        const selectedTask = this.tasklist.find((task) => task.id === this.selectedTaskRef || task.taskId === this.selectedTaskRef);
        const taskTags = selectedTask && selectedTask.tags ? [...selectedTask.tags] : [];

        this.newGoalItem.tags = taskTags;
        this.defaultGoalItem.tags = taskTags;
      }
    },
    handleAddGoalItem() {
      const value = this.newGoalItem.body && this.newGoalItem.body.trim();
      if (!value) {
        // Nothing typed: start the routine as it stands where the host allows
        // it, rather than leaving Start Task as a button that does nothing.
        if (this.allowStartWithoutTask) this.$emit('start-quick-goal-task', null);
        return;
      }

      this.setLocalUserTag(this.newGoalItem.tags);
      this.$emit('add-goal-item', { ...this.newGoalItem });
    },
    updateNewTagItems(tags) {
      this.newGoalItem.tags = tags;
    },
    setLocalUserTag(newTags) {
      const userTags = getJSON(localStorage.getItem(USER_TAGS), []) || [];
      newTags.forEach((tag) => {
        if (!userTags.includes(tag)) {
          userTags.push(tag);
        }
      });
      localStorage.setItem(USER_TAGS, JSON.stringify(userTags));
      this.userTags = [...userTags];
    },
    autoSelectGoalRef() {
      if (this.goalItemsRef && this.goalItemsRef.length) {
        this.goalItemsRef.forEach((goalItem) => {
          if (this.selectedTaskRef && goalItem.taskRef === this.selectedTaskRef) {
            this.newGoalItem.goalRef = goalItem.id;
          }
        });
      }
    },
  },
  watch: {
    // A sheet that comes back up is a fresh start: a half-open picker or an
    // expanded tag editor left over from last time is not the design's view.
    open(isOpen) {
      if (!isOpen) {
        this.pickerOpen = false;
        this.tagsOpen = false;
        this.bodyFocused = false;
      }
    },
    selectedBody(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.newGoalItem = {
          ...this.defaultGoalItem,
          body: newVal,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
          body: newVal,
        };
      }
    },
    selectedTaskRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        const selectedTask = this.tasklist ? this.tasklist.find((task) => task.id === newVal || task.taskId === newVal) : null;
        const taskTags = selectedTask && selectedTask.tags ? [...selectedTask.tags] : [];

        this.newGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
          tags: taskTags,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
          taskRef: newVal,
          tags: taskTags,
        };
        this.autoSelectGoalRef();
      }
    },
    period(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.newGoalItem = {
          ...this.defaultGoalItem,
        };
        this.defaultGoalItem = {
          ...this.defaultGoalItem,
        };
      }
    },
    'newGoalItem.taskRef': function watchNewGoalItemTaskRef(newTaskRef, oldTaskRef) {
      if (newTaskRef !== oldTaskRef && newTaskRef && this.tasklist && this.tasklist.length > 0) {
        const selectedTask = this.tasklist.find((task) => task.id === newTaskRef || task.taskId === newTaskRef);
        if (selectedTask && selectedTask.tags && selectedTask.tags.length > 0) {
          const existingTags = this.newGoalItem.tags || [];
          const routineTags = selectedTask.tags || [];
          const mergedTags = [...new Set([...existingTags, ...routineTags])];
          this.newGoalItem.tags = mergedTags;
        }
      }
    },
    'newGoalItem.goalRef': function newGoalItemGoalRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$emit('goal-ref-changed', newVal);
      }
    },
    tasklist(newVal) {
      if (newVal && newVal.length > 0) {
        this.initializeTagsFromSelectedTask();
      }
    },
    goalItemsRef() {
      this.autoSelectGoalRef();
    },
  },
};
</script>

<style>
/*
  Every rule is prefixed with a root class this organism owns (`rn-qg`, or
  `rn-qg-sheet` / `rn-qg-host` on the wrapper) — inline <style> in this repo
  leaks globally otherwise.
*/

/* The design's sheet is ONE scrolling column at 90% of the viewport with
   `0 16px 32px` of padding, so the chassis body supplies the padding and the
   buttons ride at the end of the content rather than in a bordered footer. */
.rn-qg-sheet .rn-rsheet__panel--sheet {
  max-height: 90%;
}

/* 90% on the centred dialog too. The chassis default is 86% — right for Inbox,
   Skip-day and the goal-item editor, and left alone there — but Start Work's own
   frames draw all three shells at 90%, and taking the dialog down to 86% clipped
   the Related Goals timeline a row earlier than the design does. */
.rn-qg-sheet .rn-rsheet__panel--dialog {
  max-height: 90%;
}

.rn-qg-sheet .rn-rsheet__body {
  padding: 18px 20px 32px;
}

.rn-qg {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: #222;
}

.rn-qg__title {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
}

.rn-qg__meta {
  margin-top: 2px;
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
}

.rn-qg__earn {
  color: #288bd5;
  font-weight: 700;
}

.rn-qg__desc {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .6);
}

.rn-qg__fields {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Task line: a 2px underline that takes the primary colour on focus, which is
   the only chrome the design gives the field. */
.rn-qg__line {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0 6px;
  border-bottom: 2px solid rgba(0, 0, 0, .12);
  transition: border-color .15s;
}

.rn-qg__line--on {
  border-bottom-color: #288bd5;
}

.rn-qg__line-glyph {
  font-size: 22px;
  color: rgba(0, 0, 0, .45);
}

.rn-qg__input {
  flex: 1;
  min-width: 0;
  height: 30px;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 16px;
  color: #222;
}

.rn-qg__line-clear {
  font-size: 18px;
  padding: 4px;
  color: rgba(0, 0, 0, .45);
  cursor: pointer;
}

/* The locked routine chip. */
.rn-qg__locked {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 12px;
  border-radius: 12px;
  background: #f7f7f7;
  color: rgba(0, 0, 0, .6);
  font-size: 13px;
}

.rn-qg__locked-glyph {
  font-size: 18px;
}

.rn-qg__locked-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-qg__locked-name {
  color: rgba(0, 0, 0, .8);
  font-weight: 600;
}

.rn-qg__locked-lock {
  font-size: 16px;
  color: rgba(0, 0, 0, .35);
}

/* The goal item already locked in — the bordered-card grammar the design uses
   for Related Goals, so the two read as one family rather than two inventions. */
.rn-qg__item {
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 12px;
}

.rn-qg__item-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rn-qg__item-label {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-qg__item-lock {
  font-size: 16px;
  color: rgba(0, 0, 0, .35);
}

.rn-qg__item-body {
  margin-top: 2px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(0, 0, 0, .87);
}

.rn-qg__item-body--done {
  color: rgba(0, 0, 0, .45);
  text-decoration: line-through;
}

.rn-qg__item-note {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: rgba(0, 0, 0, .54);
}

/* PARENT GOAL picker, to the AI search modal's toolbar-select spec:
   36px tall, r12, #f5f5f5 on a #e8e8e8 hairline, 12px text and 14px glyphs.
   See `.prompt-toolbar .selector-item` in AiSearchModal.vue — if those numbers
   move, these follow. */
.rn-qg__pick {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 8px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #f5f5f5;
  cursor: pointer;
}

.rn-qg__pick--on {
  border-color: #288bd5;
}

.rn-qg__pick-glyph,
.rn-qg__pick-chev {
  flex: 0 0 auto;
  font-size: 14px;
  color: rgba(0, 0, 0, .5);
}

.rn-qg__pick-value {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-qg__pick-value--empty {
  color: rgba(0, 0, 0, .45);
  font-weight: 500;
}

/* The open list is the menu that select drops: its own white surface, lifted
   off the sheet, rather than a panel tinted like the closed pill. */
.rn-qg__opts {
  margin-top: 2px;
  max-height: 210px;
  overflow-y: auto;
  padding: 4px;
  border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, .08);
}

.rn-qg__opt-head {
  padding: 8px 10px 4px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-qg__opt {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 10px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.rn-qg__opt:hover {
  background: rgba(40, 139, 213, .06);
}

.rn-qg__opt--on {
  background: rgba(40, 139, 213, .08);
}

.rn-qg__opt-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-qg__opt--on .rn-qg__opt-text {
  color: #288bd5;
  font-weight: 600;
}

.rn-qg__opt-check {
  font-size: 18px;
  color: #288bd5;
}

.rn-qg__tags-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-qg__tags-glyph {
  font-size: 18px;
}

.rn-qg__redeem,
.rn-qg__hint {
  font-size: 12px;
  line-height: 1.4;
  color: rgba(0, 0, 0, .5);
}

.rn-qg__hint--warn {
  color: #e68900;
}

/* Two equal buttons. `flex:1` and a fixed 44px height, not Vuetify pills with
   hardcoded widths — which is what pushed the old pair out of a phone sheet. */
.rn-qg__foot {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.rn-qg__btn {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 0;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}

.rn-qg__btn--primary {
  background: #288bd5;
  color: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, .14);
  transition: background .15s;
}

.rn-qg__btn--primary:hover {
  background: #1f6fab;
}

/* Nothing typed and nothing open: the routine has nothing to start with. The
   hint above says so in the same orange; this only stops the button shouting. */
.rn-qg__btn--off {
  background: #bdbdbd;
  box-shadow: none;
}

.rn-qg__btn--off:hover {
  background: #bdbdbd;
}

.rn-qg__btn--ghost {
  background: #fff;
  border: 1px solid #288bd5;
  color: #288bd5;
}

.rn-qg__btn-glyph {
  font-size: 18px;
}

/* The price pill borrows the button's own text colour, so it reads on the solid
   Start Task and the outlined agent button without knowing which it is on. */
.rn-qg__cost {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  border: 1px solid currentColor;
  border-radius: 10px;
  font-size: 12px;
  line-height: 18px;
  font-weight: 600;
  opacity: .85;
}

.rn-qg__cost-glyph {
  font-size: 13px;
}

.rn-qg__spin {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, .45);
  border-top-color: #fff;
  animation: rn-qg-spin .7s linear infinite;
}

.rn-qg__spin--ghost {
  border-color: rgba(40, 139, 213, .3);
  border-top-color: #288bd5;
}

@keyframes rn-qg-spin {
  to { transform: rotate(360deg); }
}

/* Inline hosts (the classic dashboard's quick-task dialog) supply their own
   title and padding, so the body only needs its own top gutter there. */
.rn-qg-host .rn-qg__fields {
  margin-top: 8px;
}

/* Below the narrow phone breakpoint two priced buttons cannot share a row. */
@media (max-width: 400px) {
  .rn-qg__foot {
    flex-direction: column;
  }
}
</style>
