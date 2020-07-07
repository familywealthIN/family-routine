<template>
  <v-form
    ref="form"
    v-model="valid"
  >
    <v-layout wrap >
      <v-flex xs12 d-flex>
        <v-text-field
          v-model="newGoalItem.body"
          id="newGoalItemBody"
          name="newGoalItemBody"
          label="Type your task"
          class="inputGoal"
          @keyup.enter="addGoalItem"
          required
        >
        </v-text-field>
      </v-flex>
      <v-flex xs4 d-flex>
        <v-select
          :items="periodOptionList"
          v-model="newGoalItem.period"
          item-text="label"
          item-value="value"
          label="Period"
          required
        ></v-select>
      </v-flex>
      <v-flex v-if="dateOptionList.length" xs8 d-flex>
        <v-select
          :items="dateOptionList"
          v-model="newGoalItem.date"
          item-text="label"
          item-value="value"
          label="Date"
          required
        ></v-select>
      </v-flex>
      <v-flex v-else xs8 d-flex>
      </v-flex>
      <v-flex xs12 d-flex>
        <v-select
          :items="tasklist"
          v-model="newGoalItem.taskRef"
          item-text="name"
          item-value="id"
          label="Routine Task"
        ></v-select>
      </v-flex>
      <v-flex v-if="newGoalItem.period && newGoalItem.date" xs6 d-flex>
        <v-checkbox
          v-model="newGoalItem.isMilestone"
          label="Milestone?"
          @change="triggerUserItems()"
        ></v-checkbox>
      </v-flex>
      <v-flex v-if="newGoalItem.isMilestone" xs6 d-flex>
        <v-select
          :items="goalItemsRef"
          v-model="newGoalItem.goalRef"
          item-text="body"
          item-value="id"
          label="Goal Task"
        ></v-select>
      </v-flex>
      <v-flex xs12>
        <v-textarea
          v-model="newGoalItem.contribution"
        >
          <template v-slot:label>
            <div>
              Contribution
            </div>
          </template>
        </v-textarea>
      </v-flex>
      <v-flex xs12>
        <v-textarea
          v-model="newGoalItem.reward"
        >
          <template v-slot:label>
            <div>
              Reward
            </div>
          </template>
        </v-textarea>
      </v-flex>
      {{ JSON.stringify(newGoalItem, null, 2) }}
      <v-flex xs12>
        <div style="float: right;">
          <v-btn color="primary" @click="saveGoalItem">Save</v-btn>
        </div>
      </v-flex>
    </v-layout>
  </v-form>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import {
  getDatesOfYear,
  getWeeksOfYear,
  getMonthsOfYear,
  getYearsOfLife,
} from '../utils/getDates';

export default {
  props: ['newGoalItem'],
  apollo: {
    tasklist: {
      query: gql`
        query getRoutineDate($date: String!) {
          routineDate(date: $date) {
            id
            date
            tasklist {
              id
              name
              time
              points
              ticked
              passed
              wait
            }
          }
        }
      `,
      update(data) {
        this.loading = false;
        return data.routineDate && data.routineDate.date
          ? data.routineDate.tasklist
          : [];
      },
      variables() {
        return {
          date: moment().format('DD-MM-YYYY'),
        };
      },
      error() {
        this.loading = false;
      },
    },
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
      skip() {
        return this.skipQuery;
      },
      variables() {
        return {
          period: this.newGoalItem.period,
          date: this.newGoalItem.date,
        };
      },
      error() {
        this.loading = false;
      },
    },
  },
  data() {
    return {
      skipQuery: true,
      valid: false,
      periodOptionList: [
        {
          label: 'Day',
          value: 'day',
        },
        {
          label: 'Week',
          value: 'week',
        },
        {
          label: 'Month',
          value: 'month',
        },
        {
          label: 'Year',
          value: 'year',
        },
        {
          label: 'Lifetime',
          value: 'lifetime',
        },
      ],
    };
  },
  computed: {
    dateOptionList() {
      switch (this.newGoalItem.period) {
        case 'day':
          return getDatesOfYear();
        case 'week':
          return getWeeksOfYear();
        case 'month':
          return getMonthsOfYear();
        case 'year':
          return getYearsOfLife();
        default:
          return [];
      }
    },
  },
  methods: {
    triggerUserItems() {
      this.$apollo.queries.goalItemsRef.skip = false;
      this.$apollo.queries.goalItemsRef.refetch();
    },
    saveGoalItem() {
      this.$refs.form.validate();
      console.log(this.valid);
      if (this.valid) {
        this.buttonLoading = true;
        if (this.editedIndex > -1) {
          this.updateGoalItem();
        } else {
          this.addGoalItem();
        }
      }
    },
  },
};
</script>
