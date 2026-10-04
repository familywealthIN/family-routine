<template>
  <!--
    Container home for the RelatedTasksTimeline molecule. Owns its READ: the
    goalsByGoalRef query for a goalRef, mapped to the timeline's task shape
    (same derivation the quick-goal modal uses). Renders nothing until there is
    related activity. Used by the goal-action modal (and reusable elsewhere).
  -->
  <related-tasks-timeline v-if="relatedTasks.length" :tasks="relatedTasks" />
</template>

<script>
import RelatedTasksTimeline from '@routine-notes/ui/molecules/RelatedTasksTimeline/RelatedTasksTimeline.vue';
import { relatedGoalTasks } from '@routine-notes/ui/utils/relatedGoalTasks';
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
      return relatedGoalTasks(this.relatedGoalsData, {
        goalRef: this.goalRef,
        date: this.date,
        tasklist: this.tasklist,
      });
    },
  },
};
</script>
