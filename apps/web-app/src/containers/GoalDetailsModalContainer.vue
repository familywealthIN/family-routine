<template>
  <!--
    Modal container for the "Add Goal" dialog (see ARCHITECTURE.md).
    Wraps the GoalList container in its fullscreen dialog chrome. Open state
    stays with the page via v-model; this container owns the dialog presentation.
  -->
  <AtomDialog
    :value="value"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
    @input="$emit('input', $event)"
  >
    <AtomCard>
      <AtomToolbar dark color="primary">
        <AtomButton icon dark @click="$emit('input', false)">
          <AtomIcon>close</AtomIcon>
        </AtomButton>
        <AtomToolbarTitle>Add Goal</AtomToolbarTitle>
        <AtomSpacer />
      </AtomToolbar>
      <GoalList
        :goals="goals"
        :date="date"
        :period="period"
        :selectedBody="selectedBody"
        :tasklist="tasklist"
        :selectedTaskRef="selectedTaskRef"
        @toggle-goal-details-dialog="(val) => $emit('toggle-goal-details-dialog', val)"
      />
      <AtomAlert :value="true" color="success" icon="ev_station" outline class="ml-3 mr-3">
        It's better to set Month and Weekly goals first to better guide daily milestones.
      </AtomAlert>
    </AtomCard>
  </AtomDialog>
</template>

<script>
import {
  AtomAlert, AtomButton, AtomCard, AtomDialog, AtomIcon, AtomSpacer, AtomToolbar, AtomToolbarTitle,
} from '@routine-notes/ui/atoms';
import GoalList from './GoalListContainer.vue';

export default {
  name: 'GoalDetailsModalContainer',
  components: {
    GoalList,
    AtomAlert,
    AtomButton,
    AtomCard,
    AtomDialog,
    AtomIcon,
    AtomSpacer,
    AtomToolbar,
    AtomToolbarTitle,
  },
  props: {
    value: { type: Boolean, default: false },
    goals: { type: Array, default: () => [] },
    date: { type: String, default: '' },
    period: { type: String, default: 'day' },
    selectedBody: { type: String, default: '' },
    tasklist: { type: Array, default: () => [] },
    selectedTaskRef: { type: String, default: '' },
  },
};
</script>
