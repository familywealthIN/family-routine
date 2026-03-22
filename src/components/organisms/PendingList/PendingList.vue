<template>
  <AtomLayout row wrap>
    <AtomFlex xs12>
      <AtomContainer style="max-width: 900px;">
        <AtomCard class="modern-card">
        <AtomList subheader>
          <AtomSpacer />
          <AtomSubheader
            class="subheading"
            v-if="pending && pending.length == 0"
          >
            You have 0 Pending tasks.
          </AtomSubheader>
          <AtomListTile
            v-for="(mott, i) in pending"
            :key="mott.id"
          >
            <AtomListTileContent>
              <AtomListTileTitle>{{ mott.mottoItem }}</AtomListTileTitle>
            </AtomListTileContent>
            <AtomListTileAction>
              <AtomButton
                flat
                icon
                @click="openGoalItemDialog(mott.mottoItem, i)"
              >
                <AtomIcon>exit_to_app</AtomIcon>
              </AtomButton>
            </AtomListTileAction>
            <AtomListTileAction>
              <AtomButton
                flat
                icon
                @click="$emit('delete-pending-item', i)"
              >
                <AtomIcon>delete</AtomIcon>
              </AtomButton>
            </AtomListTileAction>
          </AtomListTile>
        </AtomList>
      </AtomCard>
      </AtomContainer>
    </AtomFlex>
    <AtomFlex xs12 d-flex>
      <div class="pl-3 pr-3 formPending mt-3 mb-2">
        <AtomTextField
          clearable
          v-model="newPendingItem.mottoItem"
          id="newPendingItem"
          name="newPendingItem"
          label="Type your unplanned task"
          class="inputPending"
          @keyup.enter="handleAddPendingItem"
        />
        <AtomButton
          icon
          color="success"
          fab
          class="ml-3 mr-0"
          :loading="buttonLoading"
          @click="handleAddPendingItem"
        >
          <AtomIcon dark>send</AtomIcon>
        </AtomButton>
      </div>
    </AtomFlex>
    <AtomDialog
    v-model="addGoalItemDialog"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
  >
    <AtomCard class="modern-card-elevated">
      <AtomToolbar dark color="primary">
        <AtomButton icon dark @click="closeGoalItemDialog()">
          <AtomIcon>close</AtomIcon>
        </AtomButton>
        <AtomToolbarTitle>Sort Goal</AtomToolbarTitle>
        <AtomSpacer />
      </AtomToolbar>
      <AtomCard class="modern-card">
        <AtomCardText class="pa-0">
          <goal-creation :newGoalItem="newGoalItem" v-on:add-update-goal-entry="addUpdateGoalEntry" />
        </AtomCardText>
      </AtomCard>
    </AtomCard>
  </AtomDialog>
  </AtomLayout>
</template>
<script>
import {
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomContainer,
  AtomDialog,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileContent,
  AtomListTileTitle,
  AtomSpacer,
  AtomSubheader,
  AtomTextField,
  AtomToolbar,
  AtomToolbarTitle,
} from '@/components/atoms';
import GoalCreation from '../../../containers/GoalCreationContainer.vue';
import { defaultGoalItem } from '../../../constants/goals';

export default {
  name: 'OrganismPendingList',

  components: {
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomContainer,
    AtomDialog,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileContent,
    AtomListTileTitle,
    AtomSpacer,
    AtomSubheader,
    AtomTextField,
    AtomToolbar,
    AtomToolbarTitle,
    GoalCreation,
  },

  props: {
    pending: {
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
  },
  data() {
    return {
      show: true,
      addGoalItemDialog: false,
      newPendingItem: {
        mottoItem: '',
      },
      defaultPendingItem: {
        mottoItem: '',
      },
      newGoalItem: {
        ...defaultGoalItem, // Use defaultGoalItem as base
        index: undefined, // Add index for pending list tracking
      },
      defaultGoalItem,
    };
  },
  methods: {
    handleAddPendingItem() {
      const value = this.newPendingItem.mottoItem && this.newPendingItem.mottoItem.trim();
      if (!value) {
        return;
      }
      this.$emit('add-pending-item', this.newPendingItem.mottoItem);
      this.newPendingItem = { ...this.defaultPendingItem };
    },
    addUpdateGoalEntry(newGoalItem) {
      this.$emit('goal-entry-added', newGoalItem.index);
      this.addGoalItemDialog = false;
      this.newGoalItem = { ...this.defaultGoalItem };
    },
    openGoalItemDialog(body, index) {
      this.newGoalItem = { body, index };
      this.addGoalItemDialog = true;
    },
    closeGoalItemDialog() {
      this.newGoalItem = { ...this.defaultGoalItem };
      this.addGoalItemDialog = false;
    },
  },
};
</script>

<style scoped>
  .completed {
    text-decoration: line-through;
  }

  .formPending {
    display: flex;
    grid-column: 2;
    width: 100%;
  }

  .inputPending {
    display:inline-block;
    flex-shrink: 0;
    flex-grow: 1;
  }
</style>
