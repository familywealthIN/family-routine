<template>
  <!--
    Modal container for the goal editor dialog (see ARCHITECTURE.md).
    Wraps the GoalCreation container in its fullscreen dialog chrome. Open state
    stays with the page via v-model (it's toggled from many goal-edit flows);
    this container just owns the dialog presentation so the page template is thin.
  -->
  <AtomDialog
    :value="value"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
    @input="$emit('input', $event)"
  >
    <AtomCard>
      <AtomToolbar color="white">
        <AtomSpacer />
        <AtomButton icon @click="$emit('add-update-goal-entry', null, false)">
          <AtomIcon>close</AtomIcon>
        </AtomButton>
      </AtomToolbar>
      <AtomCard class="no-shadow">
        <AtomCardText class="pa-0">
          <GoalCreation
            :newGoalItem="goalItem"
            @add-update-goal-entry="(item, open) => $emit('add-update-goal-entry', item, open)"
          />
        </AtomCardText>
      </AtomCard>
    </AtomCard>
  </AtomDialog>
</template>

<script>
import {
  AtomButton, AtomCard, AtomCardText, AtomDialog, AtomIcon, AtomSpacer, AtomToolbar,
} from '@routine-notes/ui/atoms';
import GoalCreation from './GoalCreationContainer.vue';

export default {
  name: 'GoalDisplayModalContainer',
  components: {
    GoalCreation, AtomButton, AtomCard, AtomCardText, AtomDialog, AtomIcon, AtomSpacer, AtomToolbar,
  },
  props: {
    value: { type: Boolean, default: false },
    goalItem: { type: Object, default: null },
  },
};
</script>
