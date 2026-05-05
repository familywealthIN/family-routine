<template>
  <AiSearchModal
    :value="value"
    :open-mode="openMode"
    :goalItemsRef="goalItemsRef"
    :relatedGoalsData="relatedGoalsData"
    :routines="routines"
    :tasklist="tasklist"
    :taskFormComponent="taskFormComponent"
    :goalFormComponent="goalFormComponent"
    @input="$emit('input', $event)"
    @refetch-related-goals="handleRefetchRelatedGoals"
    @refetch-goal-items-ref="handleRefetchGoalItemsRef"
    @period-above-changed="handlePeriodAboveChanged"
    @direct-task-create="handleDirectTaskCreate"
  />
</template>

<script>
import moment from 'moment';
import gql from 'graphql-tag';
import AiSearchModal from '@routine-notes/ui/organisms/AiSearchModal/AiSearchModal.vue';
import { stepupMilestonePeriodDate } from '@routine-notes/ui/utils/getDates';
import eventBus, { EVENTS } from '@routine-notes/ui/utils/eventBus';
import { GOAL_DATE_PERIOD_QUERY, GOALS_BY_GOAL_REF_QUERY } from '../composables/graphql/queries';
import { notifyNonCurrentTaskGoalCreation } from '../utils/taskCreationNotification';
import AiTaskCreationFormContainer from './AiTaskCreationFormContainer.vue';
import AiGoalPlanFormContainer from './AiGoalPlanFormContainer.vue';

const CLASSIFY_PRIORITY_MUTATION = gql`
  mutation classifyTaskPriority($body: String!, $context: String) {
    classifyTaskPriority(body: $body, context: $context) {
      priority
    }
  }
`;
const ALLOWED_PRIORITIES = ['do', 'plan', 'delegate', 'automate'];

export default {
  name: 'AiSearchModalContainer',
  components: {
    AiSearchModal,
  },
  props: {
    value: {
      type: Boolean,
      required: true,
    },
    openMode: {
      type: String,
      default: 'add',
    },
  },
  data() {
    return {
      activeGoalRef: '',
      currentParentPeriodData: null,
    };
  },
  created() {
    // The AI form containers are passed straight to AiSearchModal's
    // <component :is="..."> slot. They MUST stay plain non-reactive
    // properties:
    //   - Putting them in data() makes Vue 2 deep-walk the component
    //     definition and convert every nested option into a reactive
    //     getter/setter — wasteful and slow for a SFC option object.
    //   - Object.freeze()-ing them around the data() return then
    //     poisoned Vue.extend, which writes a `_Ctor` cache onto the
    //     options object (`Cannot add property _Ctor, object is not
    //     extensible`).
    // Assigning them as bare instance properties in created() avoids
    // both — they're still resolvable by templates via `this[key]`,
    // they bypass the reactivity walk, and Vue.extend can still cache
    // `_Ctor` on them.
    this.taskFormComponent = AiTaskCreationFormContainer;
    this.goalFormComponent = AiGoalPlanFormContainer;
  },
  computed: {
    // Get routine tasks from $currentTaskList - transformed for GoalTaskSelector
    routines() {
      if (!this.$currentTaskList || !Array.isArray(this.$currentTaskList)) {
        return [];
      }

      return this.$currentTaskList.map((task) => ({
        id: task.id,
        name: task.name || task.body || task.title || 'Unnamed Task',
        time: task.time || null,
        tags: task.tags || [],
      }));
    },

    // Raw tasklist for GoalRefSelector grouping (uses 'id' property)
    tasklist() {
      return this.$currentTaskList || [];
    },

    /**
     * Compute period data for goalItemsRef query (parent period goals)
     *
     * MILESTONE PERIOD HIERARCHY:
     * This computed property calculates which parent period goals to fetch
     * for milestone linking options using stepupMilestonePeriodDate().
     *
     * Priority order:
     * 1. currentParentPeriodData: Set when period changes in toolbar
     *    (from AiSearchModal's fetchGoalsForPeriod → period-above-changed event)
     *
     * 2. $currentTaskData: When user is working on a task
     *    - Uses stepupMilestonePeriodDate to step up from task's period
     *    - Example: day task → fetch week goals
     *
     * 3. Default fallback: week goals (Friday of current week)
     *    - Used when no task context exists
     *
     * Period step-up examples:
     * - day    → week:     Fetch week goals ending Friday
     * - week   → month:    Fetch month goals ending last day of month
     * - month  → year:     Fetch year goals ending Dec 31
     * - year   → lifetime: Fetch lifetime goals (01-01-1970)
     *
     * This ensures the goalRef dropdown always shows appropriate parent goals
     * for the current context.
     */
    goalRefPeriodData() {
      // If we have specific parent period data from the form, use it
      if (this.currentParentPeriodData) {
        return {
          period: this.currentParentPeriodData.period,
          date: this.currentParentPeriodData.date,
        };
      }

      // For task mode, calculate based on current task date and period
      if (this.$currentTaskData) {
        // If current task has period and date, step up to parent period
        const taskPeriod = this.$currentTaskData.period || 'day';
        const taskDate = this.$currentTaskData.date || moment().format('DD-MM-YYYY');
        return stepupMilestonePeriodDate(taskPeriod, taskDate);
      }

      // Default fallback to week goals
      const friday = moment().day(5); // Friday
      return {
        period: 'week',
        date: friday.format('DD-MM-YYYY'),
      };
    },
  },
  apollo: {
    // Query for goals in the period above (used for milestone linking)
    goalItemsRef: {
      query: GOAL_DATE_PERIOD_QUERY,
      variables() {
        return this.goalRefPeriodData;
      },
      skip() {
        return !this.$root.$data.email;
      },
      update(data) {
        return data.goalDatePeriod && data.goalDatePeriod.date ? data.goalDatePeriod.goalItems : [];
      },
    },

    // Query for related goals data (used when a goal is selected as milestone)
    relatedGoalsData: {
      query: GOALS_BY_GOAL_REF_QUERY,
      variables() {
        return { goalRef: this.activeGoalRef || '' };
      },
      skip() {
        if (!this.$root.$data.email) return true;
        return !this.activeGoalRef;
      },
      update(data) {
        return data && data.goalsByGoalRef ? data.goalsByGoalRef : [];
      },
    },
  },
  watch: {
    '$root.$data.email': function watchUserEmail(newEmail, oldEmail) {
      if ((!oldEmail && newEmail) || (oldEmail && newEmail && oldEmail !== newEmail)) {
        this.refreshApolloQueries();
      }
    },
  },
  methods: {
    handleRefetchRelatedGoals(goalRef = '') {
      if (goalRef) {
        this.activeGoalRef = goalRef;
      }
      if (this.$apollo && this.$apollo.queries && this.$apollo.queries.relatedGoalsData) {
        this.$apollo.queries.relatedGoalsData.refetch();
      }
    },

    handleRefetchGoalItemsRef() {
      if (this.$apollo.queries.goalItemsRef) {
        this.$apollo.queries.goalItemsRef.refetch();
      }
    },

    /**
     * Handle period change from child modal (auto-switch feature)
     *
     * EVENT FLOW:
     * 1. User types query like "learn Python this week"
     * 2. AiSearchModal detects "week" keyword
     * 3. Auto-switches period to 'week'
     * 4. Calls fetchGoalsForPeriod('week')
     * 5. Emits 'period-above-changed' with { period: 'month', date: '28-02-2026' }
     * 6. THIS METHOD receives the event
     * 7. Updates currentParentPeriodData (used by goalRefPeriodData computed)
     * 8. Refetches goalItemsRef GraphQL query with NEW parent period
     * 9. Modal receives MONTH goals for milestone selection
     *
     * This enables intelligent milestone options based on detected period.
     *
     * @param {Object} data - Parent period data { period: string, date: string }
     */
    handlePeriodAboveChanged(data) {
      this.currentParentPeriodData = data;
      this.handleRefetchGoalItemsRef();
    },

    refreshApolloQueries() {
      this.$apollo.queries.goalItemsRef.refetch();
      if (!this.$apollo.queries.relatedGoalsData.skip) {
        this.$apollo.queries.relatedGoalsData.refetch();
      }
    },

    /**
     * Handle direct task creation (AI Enhanced Task OFF).
     * Creates a goal item immediately without AI processing — UI is
     * instant. If `_aiClassifyBody` is set on the payload, the modal is
     * asking us to refine the placeholder `priority:do` tag in the
     * background after the goal item is saved.
     *
     * @param {Object} goalItemData - The task data to save (may carry
     *   the internal `_aiClassifyBody` hint).
     */
    handleDirectTaskCreate(goalItemData) {
      // Strip the internal hint before it touches the GraphQL mutation —
      // the server doesn't know about it.
      const { _aiClassifyBody: aiClassifyBody, ...payload } = goalItemData;

      // Close modal immediately
      this.$emit('input', false);
      notifyNonCurrentTaskGoalCreation({
        vm: this,
        goalItemData: payload,
        routines: this.routines,
      });

      // Fire mutation in background — Apollo's optimistic response makes
      // the new goal item appear in the list right away.
      this.$goals.addGoalItem(payload)
        .then((addedItem) => {
          if (addedItem) {
            eventBus.$emit(EVENTS.TASK_CREATED, addedItem);
          }
          if (aiClassifyBody && addedItem && addedItem.id) {
            // The addGoalItem response doesn't echo back `period` / `date`,
            // which the heavier updateGoalItem mutation requires — so
            // layer the original payload underneath the saved item to
            // fill those gaps. id + final tags from the server win.
            this.refinePriorityInBackground(
              { ...payload, ...addedItem },
              aiClassifyBody,
            );
          }
        })
        .catch((error) => {
          console.error('Error saving direct task:', error);
        });
    },

    /**
     * Background-only: classify the freshly saved goal item via the AI
     * mutation and, if the model picks something other than the default
     * `do`, patch the goal item's tags in place. Failures are swallowed
     * — the user already has a usable task with `priority:do`.
     */
    async refinePriorityInBackground(savedItem, body) {
      try {
        const routine = savedItem.taskRef
          && Array.isArray(this.tasklist)
          && this.tasklist.find((t) => t.id === savedItem.taskRef || t.taskId === savedItem.taskRef);
        const contextLine = routine && routine.name ? `Routine: ${routine.name}` : null;

        const res = await this.$apollo.mutate({
          mutation: CLASSIFY_PRIORITY_MUTATION,
          variables: { body, context: contextLine },
          fetchPolicy: 'no-cache',
        });
        const priority = res
          && res.data
          && res.data.classifyTaskPriority
          && res.data.classifyTaskPriority.priority;
        if (!priority || !ALLOWED_PRIORITIES.includes(priority) || priority === 'do') {
          return;
        }

        const currentTags = Array.isArray(savedItem.tags) ? savedItem.tags : [];
        const nextTags = currentTags.filter((t) => !String(t).startsWith('priority:'));
        nextTags.push(`priority:${priority}`);

        // Heavy mutation — pass through every required field unchanged
        // so we only end up replacing the priority tag.
        await this.$goals.updateGoalItem(savedItem.id, {
          body: savedItem.body || '',
          period: savedItem.period || 'day',
          date: savedItem.date || '',
          isMilestone: !!savedItem.isMilestone,
          deadline: savedItem.deadline || '',
          contribution: savedItem.contribution || '',
          reward: savedItem.reward || '',
          taskRef: savedItem.taskRef || '',
          goalRef: savedItem.goalRef || '',
          tags: nextTags,
        });
      } catch (err) {
        // Non-fatal: the task already saved with priority:do.
        console.warn('[AiSearchModal] AI priority refinement skipped:', err && err.message);
      }
    },
  },
};
</script>
