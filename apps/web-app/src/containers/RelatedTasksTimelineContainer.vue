<template>
  <!--
    Container home for the RelatedTasksTimeline molecule. Owns its READ: the
    goalsByGoalRef query for a goalRef, mapped to the timeline's task shape and
    scoped to the day being viewed. Renders nothing until there is
    related activity. Used by the goal-action modal (and reusable elsewhere).
  -->
  <related-tasks-timeline v-if="relatedTasks.length" :tasks="relatedTasks" />
</template>

<script>
import moment from 'moment';
import RelatedTasksTimeline from '@routine-notes/ui/molecules/RelatedTasksTimeline/RelatedTasksTimeline.vue';
import { GOALS_BY_GOAL_REF_QUERY } from '../composables/useGoalQueries';
import { scopeGoalsToRef } from '../utils/goalRefScope';

export default {
  name: 'RelatedTasksTimelineContainer',
  components: { RelatedTasksTimeline },
  props: {
    goalRef: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      relatedGoalsData: [],
    };
  },
  apollo: {
    relatedGoalsData: {
      query: GOALS_BY_GOAL_REF_QUERY,
      // principle #4 — cache-first served the list fetched the first time this
      // goalRef's modal was opened, so days added after that never appeared.
      fetchPolicy: 'cache-and-network',
      variables() {
        return { goalRef: this.goalRef };
      },
      skip() {
        return !this.goalRef;
      },
      update(data) {
        // The server returns each Goal's COMPLETE goalItems list (returning a
        // filtered one truncated the shared normalized entity). Scope here.
        return scopeGoalsToRef(data && data.goalsByGoalRef, this.goalRef);
      },
    },
  },
  computed: {
    relatedTasks() {
      if (!this.goalRef || !Array.isArray(this.relatedGoalsData)) {
        return [];
      }

      const viewedDay = moment(this.date, 'DD-MM-YYYY');
      const seen = new Set();
      const tasks = [];

      this.relatedGoalsData.forEach((goal) => {
        if (!goal.goalItems || !Array.isArray(goal.goalItems)) return;

        // A goalRef spans every day it was planned for, so keep only the day
        // being viewed — the other days are a different day's milestone.
        if (goal.date && viewedDay.isValid()) {
          const goalDate = moment(goal.date, 'DD-MM-YYYY');
          if (goalDate.isValid() && !goalDate.isSame(viewedDay, 'day')) return;
        }

        goal.goalItems.forEach((goalItem) => {
          if (goalItem.goalRef !== this.goalRef) return;
          if (seen.has(goalItem.id)) return;
          seen.add(goalItem.id);

          const routineTask = this.tasklist
            ? this.tasklist.find((t) => t.id === goalItem.taskRef || t.taskId === goalItem.taskRef)
            : null;

          tasks.push({
            id: goalItem.id,
            body: goalItem.body,
            date: goal.date,
            period: goal.period,
            time: (routineTask && routineTask.time) || null,
            isComplete: goalItem.isComplete,
            goalRef: goalItem.goalRef,
            taskRef: goalItem.taskRef,
            tags: goalItem.tags || [],
          });
        });
      });

      return tasks
        .sort((a, b) => {
          const da = moment(a.date, 'DD-MM-YYYY');
          const db = moment(b.date, 'DD-MM-YYYY');
          return db.valueOf() - da.valueOf();
        })
        .slice(0, 10);
    },
  },
};
</script>
