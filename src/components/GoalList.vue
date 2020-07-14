<template>
  <v-layout row wrap>
    <v-flex xs12 d-flex>
      <div class="pl-3 pr-3 formGoal mt-3 mb-2">
        <v-text-field
          clearable
          v-model="newGoalItem.body"
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
          @click="addGoalItem(newGoalItem)"
        >
          <v-icon dark>send</v-icon>
        </v-btn>
      </div>
    </v-flex>
    <v-flex class="pl-3" v-if="showMilestoneOption" xs6 d-flex>
    <v-checkbox
      v-model="newGoalItem.isMilestone"
      label="Milestone?"
    ></v-checkbox>
    </v-flex>
    <v-flex class="pr-3" v-if="newGoalItem.isMilestone" xs6 d-flex>
      <v-select
        :items="goalItemsRef"
        v-model="newGoalItem.goalRef"
        item-text="body"
        item-value="id"
        label="Goal Task"
      ></v-select>
    </v-flex>
    <v-flex xs12>
      <template v-for="goal in goals">
        <v-flex xs12 v-if="goal && goal.goalItems" v-bind:key="goal.id">
          <v-card class="pl-3 pr-3">
            <v-list two-line subheader>
              <v-spacer></v-spacer>
                <v-subheader
                  class="subheading"
                  v-if="goal.goalItems.length == 0"
                  v-bind:key="goal.id"
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

import redirectOnError from '../utils/redirectOnError';
import { stepupMilestonePeriodDate } from '../utils/getDates';

const STATIC_PERIOD = 'day';

export default {
  components: {
    GoalItemList,
  },
  props: ['goals', 'date'],
  apollo: {
    goalItemsRef: {
      query: gql`
        query goalDatePeriod($period: String!, $date: String!) {
          goalDatePeriod(period: $period, date: $date) {
            id
            date
            period
            goalItems {
              id
              body
            }
          }
        }
      `,
      update(data) {
        this.loading = false;
        return data.goalDatePeriod && data.goalDatePeriod.date
          ? data.goalDatePeriod.goalItems
          : [];
      },
      variables() {
        return {
          ...stepupMilestonePeriodDate(STATIC_PERIOD, this.date),
        };
      },
      error() {
        this.loading = false;
      },
    },
  },
  data() {
    return {
      show: true,
      newGoalItem: {
        body: '',
        isMilestone: false,
        goalRef: '',
      },
      defaultGoalItem: {
        body: '',
        isMilestone: false,
        goalRef: '',
      },
      goalItem: [],
      showMilestoneOption: true,
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
      const value = this.newGoalItem.body && this.newGoalItem.body.trim();
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
            $goalRef: String
          ) {
            addGoalItem(
              body: $body
              period: $period
              date: $date
              isComplete: $isComplete
              isMilestone: $isMilestone
              goalRef: $goalRef,
            ) {
              id
              body
              isComplete
              isMilestone
              goalRef
            }
          }
        `,
        variables: {
          body: this.newGoalItem.body,
          period: STATIC_PERIOD,
          date: this.date,
          isComplete: false,
          isMilestone: this.newGoalItem.isMilestone,
          goalRef: this.newGoalItem.goalRef,
        },
        update: (scope, { data: { addGoalItem } }) => {
          goal.goalItems.push({
            id: addGoalItem.id,
            body: this.newGoalItem.body,
            isMilestone: this.newGoalItem.isMilestone,
            isComplete: false,
            goalRef: this.newGoalItem.goalRef,
          });
          this.newGoalItem = { ...this.defaultGoalItem };
        },
        error: (error) => {
          redirectOnError(this.$router, error);
          this.$notify({
            title: 'Error',
            text: 'An unexpected error occured',
            group: 'notify',
            type: 'error',
            duration: 3000,
          });
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
