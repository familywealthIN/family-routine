<template>
  <!--
    Modal home for the "Routine Steps" dialog (see ARCHITECTURE.md).
    Pure UI (no GraphQL) — it just holds the open state + the task whose steps
    are shown, so the page no longer carries that state. Page calls `open(task)`.
  -->
  <AtomDialog v-model="isOpen" width="500">
    <AtomCard>
      <AtomCardTitle class="headline grey lighten-2" primary-title>
        Routine Steps
      </AtomCardTitle>

      <AtomCardText v-if="task && task.steps">
        <ul>
          <li v-for="step in task.steps" :key="step.name">{{ step.name }}</li>
        </ul>
      </AtomCardText>

      <AtomDivider />

      <AtomCardActions>
        <AtomSpacer />
        <AtomButton color="primary" flat @click="close">Close</AtomButton>
      </AtomCardActions>
    </AtomCard>
  </AtomDialog>
</template>

<script>
import {
  AtomButton,
  AtomCard,
  AtomCardActions,
  AtomCardText,
  AtomCardTitle,
  AtomDialog,
  AtomDivider,
  AtomSpacer,
} from '@routine-notes/ui/atoms';

export default {
  name: 'StepModalContainer',
  components: {
    AtomButton,
    AtomCard,
    AtomCardActions,
    AtomCardText,
    AtomCardTitle,
    AtomDialog,
    AtomDivider,
    AtomSpacer,
  },
  data() {
    return {
      isOpen: false,
      task: null,
    };
  },
  methods: {
    open(task) {
      this.task = task || null;
      this.isOpen = true;
    },
    close() {
      this.isOpen = false;
    },
  },
};
</script>
