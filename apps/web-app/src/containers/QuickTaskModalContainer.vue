<template>
  <!--
    Modal container for the quick-task dialog (see ARCHITECTURE.md).
    Wraps the QuickGoalCreation container in its dialog chrome. Open state stays
    with the page via v-model; the quick-goal actions (start task / build agent /
    start agent) are page-orchestrated, so they bubble up unchanged.
  -->
  <AtomDialog :value="value" max-width="600px" @input="$emit('input', $event)">
    <AtomCard>
      <AtomCardTitle>
        <span class="headline">{{ title }}</span>
      </AtomCardTitle>
      <AtomCardText>
        <p>{{ description }}</p>
        <QuickGoalCreation
          :key="modalKey"
          :goals="goals"
          :date="date"
          period="day"
          :tasklist="tasklist"
          :selectedTaskRef="selectedTaskRef"
          @start-quick-goal-task="(task) => $emit('start-quick-goal-task', task)"
          @build-agent="(taskRef) => $emit('build-agent', taskRef)"
          @start-agent="(taskRef) => $emit('start-agent', taskRef)"
        />
      </AtomCardText>
    </AtomCard>
  </AtomDialog>
</template>

<script>
import {
  AtomCard, AtomCardText, AtomCardTitle, AtomDialog,
} from '@routine-notes/ui/atoms';
import QuickGoalCreation from './QuickGoalCreationContainer.vue';

export default {
  name: 'QuickTaskModalContainer',
  components: {
    QuickGoalCreation, AtomCard, AtomCardText, AtomCardTitle, AtomDialog,
  },
  props: {
    value: { type: Boolean, default: false },
    title: { type: String, default: '' },
    description: { type: String, default: '' },
    modalKey: { type: [Number, String], default: 0 },
    goals: { type: Array, default: () => [] },
    date: { type: String, default: '' },
    tasklist: { type: Array, default: () => [] },
    selectedTaskRef: { type: String, default: '' },
  },
};
</script>
