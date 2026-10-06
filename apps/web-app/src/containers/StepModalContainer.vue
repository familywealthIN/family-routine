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

      <AtomCardText>
        <ul v-if="steps.length">
          <li v-for="(step, index) in steps" :key="index">{{ step.name }}</li>
        </ul>
        <span v-else class="step-modal-container__empty">This item has no steps yet.</span>
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
  computed: {
    // A step's id is optional and two steps can share a name, so the list is
    // keyed by position — keyed by name, repeated steps collide on one key and
    // the item's own steps stop rendering one row each.
    steps() {
      return (this.task && this.task.steps) || [];
    },
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
