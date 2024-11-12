<template>
  <v-layout row wrap>
    <v-flex xs12>
      <v-card class="pt-3">
        <v-list subheader>
          <v-spacer></v-spacer>
          <v-subheader
            class="subheading"
            v-if="pending && pending.length == 0"
          >
            You have 0 Pending tasks.
          </v-subheader>
          <v-list-tile
            v-for="(mott, i) in pending"
            :key="mott.id"
          >
            <v-list-tile-content>
              <v-list-tile-title>{{ mott.mottoItem }}</v-list-tile-title>
            </v-list-tile-content>
            <v-list-tile-action>
              <v-btn
                flat
                icon
                @click="openGoalItemDialog(mott.mottoItem, i)"
              >
                <v-icon>exit_to_app</v-icon>
              </v-btn>
            </v-list-tile-action>
            <v-list-tile-action>
              <v-btn
                flat
                icon
                @click="deletePendingItem(i)"
              >
                <v-icon>delete</v-icon>
              </v-btn>
            </v-list-tile-action>
          </v-list-tile>
        </v-list>
      </v-card>
    </v-flex>
    <v-flex xs12 d-flex>
      <div class="pl-3 pr-3 formPending mt-3 mb-2">
        <v-text-field
          clearable
          v-model="newPendingItem.mottoItem"
          id="newPendingItem"
          name="newPendingItem"
          label="Type your unplanned task"
          class="inputPending"
          @keyup.enter="addPendingItem"
        >
        </v-text-field>
        <v-btn
          icon
          color="success"
          fab
          class="ml-3 mr-0"
          :loading="buttonLoading"
          @click="addPendingItem(newPendingItem)"
        >
          <v-icon dark>send</v-icon>
        </v-btn>
      </div>
    </v-flex>
    <v-dialog
    v-model="addGoalItemDialog"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
  >
    <v-card>
      <v-toolbar dark color="primary">
        <v-btn icon dark @click="closeGoalItemDialog()">
          <v-icon>close</v-icon>
        </v-btn>
        <v-toolbar-title>Sort Goal</v-toolbar-title>
        <v-spacer></v-spacer>
      </v-toolbar>
      <v-card>
        <v-card-text>
          <goal-creation :newGoalItem="newGoalItem" v-on:add-update-goal-entry="addUpdateGoalEntry" />
        </v-card-text>
      </v-card>
    </v-card>
  </v-dialog>
  </v-layout>
</template>
<script>
import gql from 'graphql-tag';
import GoalCreation from './GoalCreation.vue';
import { defaultGoalItem } from '../constants/goals';

export default {
  props: [],
  components: {
    GoalCreation,
  },
  apollo: {
    pending: {
      query: gql`
        query motto {
          motto {
            id
            mottoItem
          }
        }
      `,
      update(data) {
        this.loading = false;
        return data.motto !== null
          ? data.motto
          : [];
      },
      error() {
        this.loading = false;
      },
    },
  },
  data() {
    return {
      show: true,
      buttonLoading: false,
      newPendingItem: {
        pendingItem: '',
      },
      defaultPendingItem: {
        pendingItem: '',
      },
      newGoalItem: {
        body: '',
        index: undefined,
      },
      defaultGoalItem,
    };
  },
  methods: {
    addPendingItem() {
      const value = this.newPendingItem.mottoItem && this.newPendingItem.mottoItem.trim();

      if (!value) {
        return;
      }

      this.buttonLoading = true;

      this.$apollo.mutate({
        mutation: gql`
          mutation addMottoItem(
            $mottoItem: String!
          ) {
            addMottoItem(
              mottoItem: $mottoItem
            ) {
              id
              mottoItem
            }
          }
        `,
        variables: {
          mottoItem: this.newPendingItem.mottoItem,
        },
        update: (scope, { data: { addMottoItem } }) => {
          this.pending.push({
            id: addMottoItem.id,
            mottoItem: this.newPendingItem.mottoItem,
          });
          this.newPendingItem = { ...this.defaultPendingItem };
          this.buttonLoading = false;
        },
      }).catch(() => {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
    },
    addUpdateGoalEntry(newGoalItem) {
      this.deletePendingItem(newGoalItem.index);
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
    deletePendingItem(index) {
      const { id } = this.pending[index];
      this.pending.splice(index, 1);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteMottoItem(
            $id: ID!
          ) {
            deleteMottoItem(
              id: $id
            ) {
              id
            }
          }
        `,
        variables: {
          id,
        },
      }).catch(() => {
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occured',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      });
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
