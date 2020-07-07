<template>
  <v-layout row wrap>
      <div class="pl-3 pr-3 formGoal mt-3 mb-2">
        <v-text-field
          clearable
          v-model="newGoalItemBody"
          id="newGoalItemBody"
          name="newGoalItemBody"
          label="Type your task"
          class="inputGoal"
          @keyup.enter="addGoalItem"
        >
        </v-text-field>
        <v-btn
            icon
            color="success"
            fab
            dark
            class="ml-3 mr-0"
            @click="addGoalItem(newGoalItemBody)"
          >
            <v-icon dark>send</v-icon>
          </v-btn>
        </div>
    <v-flex xs12>
      <template v-for="goal in goals">
        <v-flex xs12 v-if="goal && goal.goalItems" v-bind:key="goal.id">
          <v-card class="pl-3 pr-3">
            <v-list two-line subheader>
              <v-spacer></v-spacer>
                <v-subheader
                  class="subheading"
                  v-if="goal.goalItems.length == 0"
                  v-bind:key="goal"
                >
                  You have 0 Goals for {{ goal.period === 'day' ? 'Today' : goal.period }}, add some
                </v-subheader>
                <v-subheader class="subheading" v-bind:key="goal.id" v-else>
                  {{ goal.period === 'day' ? 'Today' : goal.period }} Goals
                </v-subheader>
                <goal-item-list :goal="goal"/>
            </v-list>
          </v-card>
        </v-flex>
      </template>
    </v-flex>
  </v-layout>
</template>
<script>
import gql from 'graphql-tag';

import GoalItemList from './GoalItemList.vue';

const STATIC_PERIOD = 'day';

export default {
  components: {
    GoalItemList,
  },
  props: ['goals', 'date'],
  data() {
    return {
      show: true,
      newGoalItemBody: '',
      goalItem: [],
    };
  },
  methods: {
    getGoal(period, date) {
      const goal = this.goals.find((aGoal) => aGoal.period === period && aGoal.date === date);
      if (!goal) {
        const newGoal = {
          id: `${Math.random()}`,
          period,
          date,
          goalItems: [],
        };
        this.goals.push(newGoal);
        return newGoal;
      }

      return goal;
    },
    addGoalItem() {
      const value = this.newGoalItemBody && this.newGoalItemBody.trim();
      const goal = this.getGoal(STATIC_PERIOD, this.date);

      if (!value) {
        return;
      }

      this.$apollo.mutate({
        mutation: gql`
          mutation addGoalItem(
            $body: String!
            $period: String!
            $date: String!
            $isComplete: Boolean!
            $isMilestone: Boolean!
          ) {
            addGoalItem(
              body: $body
              period: $period
              date: $date
              isComplete: $isComplete
              isMilestone: $isMilestone
            ) {
              id
              body
              isComplete
              isMilestone
            }
          }
        `,
        variables: {
          body: this.newGoalItemBody,
          period: STATIC_PERIOD,
          date: this.date,
          isComplete: false,
          isMilestone: false,
        },
        update: (scope, { data: { addGoalItem } }) => {
          goal.goalItems.push({
            id: addGoalItem.id,
            body: this.newGoalItemBody,
            isComplete: false,
          });
          this.newGoalItemBody = '';
        },
        error: (error) => {
          console.log('show task adding error', error);
        },
      });
    },
  },
};
</script>

<style lang="stylus" scoped>
  .completed {
    text-decoration: line-through;
  }

  .formGoal {
    display: flex;
    grid-column: 2;
    width: 100%;
  }

  .inputGoal {
    display:inline-block;
    flex-shrink: 0;
    flex-grow: 1;
  }
</style>
