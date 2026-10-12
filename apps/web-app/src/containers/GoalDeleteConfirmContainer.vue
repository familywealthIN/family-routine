<template>
  <!--
    Modal container for the destructive goal-item delete (see ARCHITECTURE.md
    §7). Owns its READ — the milestones the delete will cascade to — and the
    dialog chrome; the page calls `open(target)` and acts on `confirm`, so no
    page holds modal state and no organism talks to Apollo.
  -->
  <goal-delete-sheet
    :open="isOpen"
    :shell="shell"
    :summary="summary"
    :milestones="milestoneBodies"
    :hidden-count="hiddenCount"
    :confirm-text="confirmText"
    data-testid="goal-delete-confirm"
    @close="close"
    @confirm="onConfirm"
  />
</template>

<script>
import GoalDeleteSheet from '@routine-notes/ui/organisms/GoalDeleteSheet/GoalDeleteSheet.vue';
import { GOAL_ITEM_MILESTONES_QUERY } from '../composables/useGoalQueries';

// Enough to recognise the plan without turning the dialog into a list view.
const PREVIEW_LIMIT = 5;

export default {
  name: 'GoalDeleteConfirmContainer',
  components: { GoalDeleteSheet },
  props: {
    shell: { type: String, default: 'phone' },
  },
  data() {
    return {
      isOpen: false,
      // { id, period, date, body } of the goal item awaiting confirmation.
      target: null,
      goalItemMilestones: [],
    };
  },
  apollo: {
    goalItemMilestones: {
      query: GOAL_ITEM_MILESTONES_QUERY,
      // The counts must reflect the server, not a cached read taken before the
      // plan was built — this is the only thing the user sees before deleting.
      fetchPolicy: 'network-only',
      variables() {
        return { id: this.target ? this.target.id : '' };
      },
      skip() {
        return !this.target;
      },
      update(data) {
        return (data && data.goalItemMilestones) || [];
      },
    },
  },
  computed: {
    milestoneCount() {
      return this.goalItemMilestones ? this.goalItemMilestones.length : 0;
    },
    milestoneBodies() {
      return (this.goalItemMilestones || []).slice(0, PREVIEW_LIMIT);
    },
    hiddenCount() {
      return Math.max(0, this.milestoneCount - PREVIEW_LIMIT);
    },
    isLoadingMilestones() {
      return this.$apollo.queries.goalItemMilestones.loading;
    },
    // Says what actually happens: the server cascades, so the dialog promises a
    // cascade. Until the read lands it promises nothing it cannot back up.
    summary() {
      const name = this.target && this.target.body ? `"${this.target.body}"` : 'This goal';
      if (this.isLoadingMilestones) {
        return `Checking what ${name} has hanging off it…`;
      }
      if (!this.milestoneCount) {
        return `${name} will be deleted. This cannot be undone.`;
      }
      const plural = this.milestoneCount === 1 ? 'milestone' : 'milestones';
      return `${name} has ${this.milestoneCount} ${plural}. `
        + `Deleting it deletes ${this.milestoneCount === 1 ? 'that one' : 'them'} too. `
        + 'This cannot be undone.';
    },
    confirmText() {
      if (!this.milestoneCount) return 'Delete';
      return `Delete goal + ${this.milestoneCount}`;
    },
  },
  methods: {
    open(target) {
      this.target = target || null;
      this.goalItemMilestones = [];
      this.isOpen = !!target;
    },
    close() {
      this.isOpen = false;
      this.target = null;
    },
    onConfirm() {
      const { target } = this;
      this.close();
      if (target) this.$emit('confirm', target);
    },
  },
};
</script>
