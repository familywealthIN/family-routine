<template>
  <div>
    <template v-for="(goalItem, i) in goal.goalItems">
      <v-list-tile v-bind:key="goalItem.id">
        <v-list-tile-action>
        <v-checkbox
          v-model="goalItem.isComplete"
          @change="completeGoalItem(goalItem.id, goalItem.isComplete, goal.period, goal.date)"
        ></v-checkbox>
        </v-list-tile-action>
        <v-list-tile-content>
        <v-list-tile-title :class="{ completed: goalItem.isComplete}">
          {{goalItem.body}}
        </v-list-tile-title>
        <v-list-tile-sub-title>Some reference text</v-list-tile-sub-title>
        </v-list-tile-content>
        <v-list-tile-action>
          <v-btn
            flat
            icon
            @click="editGoalItem(goalItem, goal.period, goal.date)"
          >
            <v-icon>edit</v-icon>
          </v-btn>
        </v-list-tile-action>
        <v-list-tile-action>
          <v-btn
            flat
            icon
            @click="deleteGoalItem(i, goal.period, goal.date)"
          >
            <v-icon>delete</v-icon>
          </v-btn>
        </v-list-tile-action>
      </v-list-tile>
    </template>
  </div>
</template>
<script>
import gql from 'graphql-tag';

export default {
  props: ['goal', 'editMode', 'newGoalItem'],
  data() {
    return {
      show: true,
      newGoalItemBody: '',
      goalItem: [],
    };
  },
  methods: {
    deleteGoalItem(index, period, date) {
      const { id } = this.goal.goalItems[index];
      this.goal.goalItems.splice(index, 1);

      this.$apollo.mutate({
        mutation: gql`
          mutation deleteGoalItem(
            $id: ID!
            $period: String!
            $date: String!
          ) {
            deleteGoalItem(
              id: $id
              period: $period
              date: $date
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          period,
          date,
        },
        error: (error) => {
          console.log('show task adding error', error);
        },
      });
    },
    completeGoalItem(id, isComplete, period, date) {
      this.$apollo.mutate({
        mutation: gql`
          mutation completeGoalItem(
            $id: ID!
            $period: String!
            $date: String!
            $isComplete: Boolean!
          ) {
            completeGoalItem(
              id: $id
              period: $period
              date: $date
              isComplete: $isComplete
            ) {
              id
            }
          }
        `,
        variables: {
          id,
          period,
          date,
          isComplete: Boolean(isComplete),
        },
        error: (error) => {
          console.log('show task adding error', error);
        },
      });
    },
    editGoalItem(goalItem, period, date) {
      console.log('editGoalItem');
      this.$emit('update-new-goal-item', goalItem, period, date);
    },
  },
};
</script>

<style>
  .completed {
    text-decoration: line-through;
  }
  .v-list__group__items--no-action .v-list__tile {
    padding-left: 16px;
  }
</style>
