<template>
  <!--
    /agenda/tree/:selectedTaskRef — the month planner for ONE routine, moved onto
    the chassis and made to fit a phone.

    What it is: a routine's month goal, the three work weeks under it, and the
    five weekdays under each week. Tapping an empty node adds the goal for that
    date. The cascade is the point — a day goal rolls up into a week goal, which
    rolls up into the month goal (chassis.md § "The goal cascade").

    Why it was rebuilt rather than patched:

    * It was drawn as a LEFT-TO-RIGHT tree out of absolutely-positioned `<ul>`s
      with hardcoded pixels — 260px nodes, `left:100%` per level, a 1000px
      wrapper and a 700px children column. Three levels wide is ~820px, so on
      every phone in the fleet (320-412px) half the tree sat outside the
      viewport with no way to reach it: the page scrolls vertically, and the
      overflowing nodes were to the RIGHT. The day column was also 700px tall
      regardless of content, so the 15 days were spread over two screens of
      whitespace.
    * It drew legacy chrome (a MobileLayout toolbar under the status bar, and no
      bottom nav of its own), while the page it is reached FROM — Progress —
      already mounts AppShellContainer.

    Now it is a vertical cascade: the month node, then one card per week holding
    its five day rows. That has no intrinsic width, so it reflows to one column
    on a phone and two or three on tablet/desktop, and each card is as tall as
    the rows it actually has.

    Bugs fixed on the way, all three of them things the old layout hid:

    1. The Months dropdown did nothing. Picking a month moved `date`, and the
       `date` watcher refetched the routine but never the goals, so the tree
       kept showing the month you came from. The watcher now reloads both.
    2. `selectedTaskRef` is a ROUTE PROP and the Routine dropdown had it as its
       `v-model`, so choosing a routine wrote to a prop — Vue warns, and the
       parent overwrites it on the next render. The selection is local state now,
       seeded and re-seeded from the prop.
    3. A failed `monthTaskGoals` read only reached `console.error`, leaving an
       empty tree that looked like "nothing planned yet". It gets the chassis'
       LoadErrorState, like every other page.
  -->
  <app-shell-container
    active="goals"
    title="Month Planner"
    :subtitle="subLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <template v-slot:header-actions>
      <button
        type="button"
        class="rn-shell__act"
        :class="labelledActions ? 'rn-shell__act--label' : 'rn-shell__act--icon'"
        title="Progress"
        data-testid="plan-progress"
        @click="goTo('/progress')"
      >
        <i class="rn-mi rn-shell__act-glyph">insights</i>
        <span v-if="labelledActions">Progress</span>
      </button>
    </template>

    <div class="rn-plan" :class="`rn-plan--${shell}`" data-testid="agenda-tree-page">
      <!--
        The three pickers, as the pill selects the AI search modal's toolbar
        uses: 36px, r12, #f5f5f5 on a #e8e8e8 hairline. Native <select> on
        purpose — it gets the OS picker on a phone, which beats a hand-rolled
        popover on a 360px screen, and it is reachable by keyboard for free.
      -->
      <div class="rn-plan__bar" data-testid="plan-bar">
        <label class="rn-plan__pick">
          <i class="rn-mi rn-plan__pick-glyph">event</i>
          <select v-model="selectedMonth" class="rn-plan__sel" data-testid="plan-month">
            <option v-for="month in months" :key="month.value" :value="month.value">
              {{ month.label }}
            </option>
          </select>
          <i class="rn-mi rn-plan__pick-chev">expand_more</i>
        </label>

        <label class="rn-plan__pick">
          <i class="rn-mi rn-plan__pick-glyph">history</i>
          <select v-model="taskRef" class="rn-plan__sel" data-testid="plan-routine">
            <option value="">Pick a routine</option>
            <option v-for="task in tasklist" :key="task.id" :value="task.id">
              {{ task.name }}
            </option>
          </select>
          <i class="rn-mi rn-plan__pick-chev">expand_more</i>
        </label>

        <!-- Only once there is more than one month goal is there a choice to make. -->
        <label v-if="monthGoals.length > 1" class="rn-plan__pick rn-plan__pick--wide">
          <i class="rn-mi rn-plan__pick-glyph">flag</i>
          <select v-model="monthGoalRef" class="rn-plan__sel" data-testid="plan-month-goal">
            <option v-for="goal in monthGoals" :key="goal.id" :value="goal.id">
              {{ goal.name }}
            </option>
          </select>
          <i class="rn-mi rn-plan__pick-chev">expand_more</i>
        </label>
      </div>

      <load-error-state
        v-if="loadError"
        message="We couldn't load this month's plan."
        :retrying="isLoading"
        @retry="reload"
      />

      <p v-else-if="!taskRef" class="rn-plan__note" data-testid="plan-no-routine">
        Pick a routine to plan its month.
      </p>

      <template v-else>
        <!-- The month node. Its own card, full width: everything below rolls up into it. -->
        <section class="rn-plan__month" data-testid="plan-month-node">
          <div class="rn-plan__month-head">
            <span class="rn-plan__tag">Month</span>
            <span class="rn-plan__month-date">{{ monthLabel }}</span>
            <span class="rn-plan__filled" data-testid="plan-filled">{{ filledLabel }}</span>
          </div>
          <component
            :is="monthNode && monthNode.name ? 'div' : 'button'"
            :type="monthNode && monthNode.name ? null : 'button'"
            class="rn-plan__node rn-plan__node--month"
            :class="{ 'rn-plan__node--empty': !(monthNode && monthNode.name) }"
            data-testid="plan-month-body"
            @click="addFor(monthNode)"
          >
            <template v-if="monthNode && monthNode.name">{{ monthNode.name }}</template>
            <template v-else>
              <i class="rn-mi rn-plan__node-add">add</i>Set a month goal
            </template>
          </component>
        </section>

        <!-- One card per work week, each holding its five weekdays. -->
        <div class="rn-plan__weeks">
          <section
            v-for="(week, index) in weeks"
            :key="week.date"
            class="rn-plan__week"
            :data-testid="`plan-week-${index}`"
          >
            <div class="rn-plan__week-head">
              <span class="rn-plan__tag rn-plan__tag--week">Week {{ index + 1 }}</span>
              <span class="rn-plan__week-range">{{ weekRange(week) }}</span>
            </div>

            <component
              :is="week.name ? 'div' : 'button'"
              :type="week.name ? null : 'button'"
              class="rn-plan__node"
              :class="{ 'rn-plan__node--empty': !week.name }"
              :data-testid="`plan-week-body-${index}`"
              @click="addFor(week)"
            >
              <template v-if="week.name">{{ week.name }}</template>
              <template v-else>
                <i class="rn-mi rn-plan__node-add">add</i>Add a week goal
              </template>
            </component>

            <!--
              The day rows hang off a rail rather than off connector lines drawn
              with fixed-width ::before pseudo-elements. Same reading — these
              roll up into the node above — with no width to overflow.
            -->
            <ul class="rn-plan__days">
              <li v-for="day in week.milestones" :key="day.date" class="rn-plan__day">
                <span class="rn-plan__day-date">{{ dayLabel(day.date) }}</span>
                <component
                  :is="day.name ? 'div' : 'button'"
                  :type="day.name ? null : 'button'"
                  class="rn-plan__node rn-plan__node--day"
                  :class="{ 'rn-plan__node--empty': !day.name }"
                  :data-testid="`plan-day-${day.date}`"
                  @click="addFor(day)"
                >
                  <template v-if="day.name">{{ day.name }}</template>
                  <template v-else>
                    <i class="rn-mi rn-plan__node-add">add</i>Add
                  </template>
                </component>
              </li>
            </ul>
          </section>
        </div>
      </template>
    </div>

    <!--
      Adding a goal for one node. The chassis sheet, not the fullscreen Vuetify
      dialog with a primary-coloured toolbar this page used to raise: on a phone
      that dialog covered the plan completely to host a one-line form.
    -->
    <responsive-sheet
      :open="goalDetailsDialog"
      :shell="shell"
      :title="addTitle"
      @close="toggleGoalDetailsDialog(false)"
    >
      <goal-list
        :goals="monthTaskGoals"
        :date="selectedDate"
        :period="currentGoalPeriod"
        :selected-body="selectedBody"
        :tasklist="tasklist"
        :selected-task-ref="taskRef"
        :is-default-milestone="true"
        @toggle-goal-details-dialog="toggleGoalDetailsDialog"
      />
      <p class="rn-plan__hint">
        <i class="rn-mi rn-plan__hint-glyph">ev_station</i>
        Set the month and week goals first — they are what a day goal rolls up into.
      </p>
    </responsive-sheet>
  </app-shell-container>
</template>

<script>
/* eslint-disable no-param-reassign */
import moment from 'moment';

import LoadErrorState from '@routine-notes/ui/molecules/LoadErrorState/LoadErrorState.vue';
import ResponsiveSheet from '@routine-notes/ui/molecules/ResponsiveSheet/ResponsiveSheet.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import AppShellContainer from '../containers/AppShellContainer.vue';
import GoalList from '../containers/GoalListContainer.vue';
import { signOut } from '../utils/signOut';

export const LOGOUT_KEY = 'logout';

const DATE_FORMAT = 'DD-MM-YYYY';

const MONTHS = Object.freeze([
  { value: '0', label: 'January' },
  { value: '1', label: 'February' },
  { value: '2', label: 'March' },
  { value: '3', label: 'April' },
  { value: '4', label: 'May' },
  { value: '5', label: 'June' },
  { value: '6', label: 'July' },
  { value: '7', label: 'August' },
  { value: '8', label: 'September' },
  { value: '9', label: 'October' },
  { value: '10', label: 'November' },
  { value: '11', label: 'December' },
]);

/** What the add sheet is titled per node period. */
const ADD_TITLE = {
  month: 'Add a month goal',
  week: 'Add a week goal',
  day: 'Add a day goal',
};

export default {
  name: 'AgendaTreeTime',

  components: {
    AppShellContainer,
    GoalList,
    LoadErrorState,
    ResponsiveSheet,
  },

  props: {
    /** From the route. The dropdown's selection is `taskRef`, seeded from this. */
    selectedTaskRef: { type: String, default: '' },
  },

  data() {
    return {
      isLoading: false,
      loadError: false,
      agendaTreeGoals: [],
      goalDetailsDialog: false,
      tasklist: [],
      monthGoals: [],
      monthTaskGoals: [],
      currentGoalPeriod: 'day',
      selectedBody: '',
      /** Which routine the plan is for. NOT the prop — see the template's note. */
      taskRef: this.selectedTaskRef || '',
      date: moment().format(DATE_FORMAT),
      selectedDate: moment().format(DATE_FORMAT),
      selectedMonth: String(moment().month()),
      monthGoalRef: '',
      months: MONTHS,
    };
  },

  computed: {
    /** The ONE breakpoint rule — `resolveShell`, never a second scheme. */
    shell() {
      return resolveShell(this.$vuetify && this.$vuetify.breakpoint);
    },
    isPhone() {
      return this.shell === 'phone';
    },
    /** The phone header has no room for a worded button beside the chip. */
    labelledActions() {
      return !this.isPhone;
    },
    subLabel() {
      if (this.isPhone) return '';
      return this.routineName ? `${this.routineName} · ${this.monthLabel}` : this.monthLabel;
    },
    routineName() {
      const task = (this.tasklist || []).find((item) => item.id === this.taskRef);
      return task ? task.name : '';
    },
    monthLabel() {
      return moment(this.date, DATE_FORMAT).format('MMMM YYYY');
    },
    monthNode() {
      return this.agendaTreeGoals[0] || null;
    },
    weeks() {
      return (this.monthNode && this.monthNode.milestones) || [];
    },
    /** Every node in the cascade, flat — what `filledLabel` counts. */
    allNodes() {
      if (!this.monthNode) return [];
      const days = this.weeks.reduce((acc, week) => acc.concat(week.milestones || []), []);
      return [this.monthNode, ...this.weeks, ...days];
    },
    /**
     * "6 of 19 set". The old layout gave no way to tell a sparse plan from a
     * full one without counting nodes by eye across two screens.
     */
    filledLabel() {
      const total = this.allNodes.length;
      if (!total) return '';
      const set = this.allNodes.filter((node) => !!node.name).length;
      return `${set} of ${total} set`;
    },
    addTitle() {
      return ADD_TITLE[this.currentGoalPeriod] || 'Add a goal';
    },
  },

  watch: {
    /*
     * Both reads, not just the routine. Picking a month used to refetch the
     * routine alone, so the tree kept the month you came from.
     */
    date(newVal, oldVal) {
      if (newVal === oldVal) return;
      this.reload();
    },
    selectedMonth(newVal, oldVal) {
      if (!oldVal || newVal === oldVal) return;
      /* A month goal id belongs to one month, so it cannot survive the move. */
      this.monthGoalRef = '';
      this.date = moment(this.date, DATE_FORMAT).month(Number(newVal)).date(1).format(DATE_FORMAT);
    },
    monthGoalRef(newVal, oldVal) {
      if (oldVal && newVal !== oldVal) {
        this.buildAgendaTreeGoals(this.monthTaskGoals);
      }
    },
    taskRef(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.monthGoalRef = '';
        this.fetchMonthTaskGoalsData();
      }
    },
    /** A different route param (Progress deep-links straight at a routine). */
    selectedTaskRef(newVal) {
      if (newVal && newVal !== this.taskRef) this.taskRef = newVal;
    },
  },

  mounted() {
    this.buildCleanAgendaTreeGoals();
    this.reload();
  },

  methods: {
    reload() {
      return Promise.all([this.fetchRoutineData(), this.fetchMonthTaskGoalsData()]);
    },

    /** The routine list behind the Routine dropdown. */
    async fetchRoutineData() {
      this.isLoading = true;
      try {
        const routineData = await this.$routine.fetchRoutine(this.date, { useCache: true });
        if (routineData) this.tasklist = routineData.tasklist || [];
      } catch (error) {
        console.error('[AgendaTreeTime] routine failed:', error);
        this.$notify({
          title: 'Error',
          text: 'An unexpected error occurred',
          group: 'notify',
          type: 'error',
          duration: 3000,
        });
      } finally {
        this.isLoading = false;
      }
    },

    /** This routine's month / week / day goals for the shown month. */
    async fetchMonthTaskGoalsData() {
      if (!this.taskRef) {
        this.monthTaskGoals = [];
        this.buildCleanAgendaTreeGoals();
        return;
      }

      this.isLoading = true;
      try {
        const goalsData = await this.$goals.fetchMonthTaskGoals(
          this.date,
          this.taskRef,
          { useCache: true },
        );
        this.monthTaskGoals = goalsData || [];
        this.loadError = false;
        this.buildAgendaTreeGoals(this.monthTaskGoals);
      } catch (error) {
        console.error('[AgendaTreeTime] month task goals failed:', error);
        this.loadError = true;
      } finally {
        this.isLoading = false;
      }
    },

    /** The empty cascade for the shown month: 1 month, 3 weeks, 15 weekdays. */
    buildCleanAgendaTreeGoals() {
      const month = moment(this.date, DATE_FORMAT).month();
      const year = moment(this.date, DATE_FORMAT).year();
      this.selectedMonth = String(month);
      const { monthWeekDays, threeFridays } = this.getDaysArray(year, month);
      const weekSlices = [
        monthWeekDays.slice(0, 5),
        monthWeekDays.slice(5, 10),
        monthWeekDays.slice(10, 15),
      ];

      this.monthGoals = [];
      this.agendaTreeGoals = [{
        period: 'month',
        name: '',
        date: `01-${month + 1}-${year}`,
        milestones: threeFridays.map((workWeek, i) => ({
          period: 'week',
          name: '',
          date: workWeek,
          milestones: (weekSlices[i] || []).map((weekDay) => ({
            period: 'day',
            name: '',
            date: weekDay,
          })),
        })),
      }];
    },

    buildAgendaTreeGoals(monthTaskGoals) {
      this.buildCleanAgendaTreeGoals();
      if (!monthTaskGoals || !monthTaskGoals.length) return;

      if (this.monthGoals.length === 0) {
        monthTaskGoals.forEach((monthTaskGoal) => {
          if (monthTaskGoal && monthTaskGoal.period === 'month') {
            monthTaskGoal.goalItems.forEach((goalItem) => {
              this.monthGoals.push({ id: goalItem.id, name: goalItem.body });
            });
          }
        });
      }

      const monthGoal = monthTaskGoals
        .find((monthTaskGoal) => monthTaskGoal && monthTaskGoal.period === 'month');
      const weekGoals = monthTaskGoals
        .filter((monthTaskGoal) => monthTaskGoal && monthTaskGoal.period === 'week');
      const dayGoals = monthTaskGoals
        .filter((monthTaskGoal) => monthTaskGoal && monthTaskGoal.period === 'day');

      if (monthGoal && monthGoal.goalItems && monthGoal.goalItems.length) {
        if (!this.monthGoalRef) {
          this.monthGoalRef = monthGoal.goalItems[0].id;
        }
        const selected = this.monthGoals.find((goal) => goal.id === this.monthGoalRef);
        this.agendaTreeGoals[0].name = selected ? selected.name : '';
      }

      this.agendaTreeGoals[0].milestones = this.agendaTreeGoals[0].milestones.map((milestone) => {
        const milestoneWeek = weekGoals
          .find((weekGoal) => weekGoal.date === moment(milestone.date, DATE_FORMAT).format(DATE_FORMAT));
        if (!milestoneWeek || !milestoneWeek.goalItems || !milestoneWeek.goalItems.length) {
          return milestone;
        }

        const weekGoalSelected = milestoneWeek.goalItems
          .find((goalItem) => goalItem.goalRef === this.monthGoalRef);
        milestone.name = weekGoalSelected ? weekGoalSelected.body : milestone.name;

        milestone.milestones = milestone.milestones.map((dayMilestone) => {
          const milestoneDay = dayGoals
            .find((dayGoal) => dayGoal.date === moment(dayMilestone.date, DATE_FORMAT).format(DATE_FORMAT));
          const hasDays = milestoneDay && milestoneDay.goalItems && milestoneDay.goalItems.length;
          if (hasDays && weekGoalSelected && weekGoalSelected.id) {
            const dayGoalSelected = milestoneDay.goalItems
              .find((goalItem) => goalItem.goalRef === weekGoalSelected.id);
            dayMilestone.name = dayGoalSelected ? dayGoalSelected.body : dayMilestone.name;
          }
          return dayMilestone;
        });
        return milestone;
      });
    },

    /**
     * The month's first three Mon-Fri work weeks, as `DD-M-YYYY` strings, plus
     * the Friday that ends each. Counting starts at the first Monday, so a
     * month opening mid-week begins at the first full week.
     */
    getDaysArray(year, month) {
      let firstMonday = '';
      const threeFridays = [];
      const names = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const date = new Date(year, month, 1);
      const monthWeekDays = [];

      while (threeFridays.length <= 2) {
        if (!firstMonday && names[date.getDay()] === 'mon') {
          firstMonday = `${date.getDate()}-${month + 1}-${year}`;
        }
        if (firstMonday && !['sun', 'sat'].includes(names[date.getDay()])) {
          monthWeekDays.push(`${date.getDate()}-${month + 1}-${year}`);
        }
        if (firstMonday && names[date.getDay()] === 'fri') {
          threeFridays.push(`${date.getDate()}-${month + 1}-${year}`);
        }
        date.setDate(date.getDate() + 1);
      }
      return { monthWeekDays, threeFridays };
    },

    /** "Mon 06". */
    dayLabel(date) {
      return moment(date, DATE_FORMAT).format('ddd DD');
    },

    /** "06 – 10 Oct", read off the week's own day nodes. */
    weekRange(week) {
      const days = week.milestones || [];
      if (!days.length) return moment(week.date, DATE_FORMAT).format('DD MMM');
      const first = moment(days[0].date, DATE_FORMAT);
      const last = moment(days[days.length - 1].date, DATE_FORMAT);
      return `${first.format('DD')} – ${last.format('DD MMM')}`;
    },

    /** A node with a goal already is a label; an empty one opens the add sheet. */
    addFor(node) {
      if (!node || node.name) return;
      this.selectedDate = moment(node.date, DATE_FORMAT).format(DATE_FORMAT);
      this.currentGoalPeriod = node.period;
      this.selectedBody = '';
      this.goalDetailsDialog = true;
    },

    toggleGoalDetailsDialog(open) {
      this.goalDetailsDialog = open;
      if (!open) this.fetchMonthTaskGoalsData();
    },

    goTo(route) {
      if (!route || this.$route.path === route) return;
      this.$router.push(route).catch(() => {});
    },
    onNavigate(key, item) {
      if (key === LOGOUT_KEY) {
        this.onSignOut();
        return;
      }
      this.goTo(item && item.route);
    },
    onSignOut() {
      signOut(this);
    },
  },
};
</script>

<style>
.rn-plan {
  display: grid;
  gap: 12px;
  align-content: start;
  min-width: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* ---- header action, as Milestones draws it ---- */

.rn-plan__bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
}

.rn-plan__pick {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1 1 140px;
  max-width: 220px;
  min-width: 0;
  height: 36px;
  padding: 0 6px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  background: #f5f5f5;
}

.rn-plan__pick--wide {
  flex-basis: 100%;
  max-width: none;
}

.rn-plan__pick-glyph,
.rn-plan__pick-chev {
  flex: 0 0 auto;
  font-size: 14px;
  color: rgba(0, 0, 0, .5);
}

/* The native control, stripped back to the text. `appearance:none` takes the
   platform chrome; the chevron beside it is ours, so it matches the one on the
   AI search modal's selects.

   16px on a phone and not the 12px the toolbar pills use: iOS zooms the whole
   page when a focused form control renders under 16px, and this one is a form
   control (commit 4ed0905 fixed the same thing on four other fields). */
.rn-plan__sel {
  flex: 1 1 auto;
  min-width: 0;
  height: 100%;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, .8);
  text-overflow: ellipsis;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
}

.rn-plan__sel:focus {
  outline: none;
}

.rn-plan--tablet .rn-plan__sel,
.rn-plan--desktop .rn-plan__sel {
  font-size: 13px;
}

/* ---- the cascade ---- */

.rn-plan__month,
.rn-plan__week {
  min-width: 0;
  padding: 12px 14px 14px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .06), 0 8px 18px -12px rgba(0, 0, 0, .12);
}

.rn-plan__month-head,
.rn-plan__week-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  min-width: 0;
}

.rn-plan__tag {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 9px;
  background: rgba(40, 139, 213, .12);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: #1f6fab;
}

.rn-plan__tag--week {
  background: rgba(0, 0, 0, .06);
  color: rgba(0, 0, 0, .6);
}

.rn-plan__month-date,
.rn-plan__week-range {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: rgba(0, 0, 0, .8);
}

.rn-plan__filled {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .45);
}

/*
  One node. Rendered as a <button> while empty and a <div> once it holds a goal,
  because only the empty one does anything — the old markup made every node
  look tappable and then ignored the tap on the ones that were filled.
*/
.rn-plan__node {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid rgba(0, 0, 0, .08);
  border-radius: 12px;
  background: #fff;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  text-align: left;
  color: rgba(0, 0, 0, .85);
  overflow-wrap: anywhere;
}

.rn-plan__node--month {
  font-size: 14px;
  font-weight: 600;
}

.rn-plan__node--empty {
  align-items: center;
  border-style: dashed;
  background: transparent;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-plan__node--empty:active {
  background: rgba(40, 139, 213, .06);
}

.rn-plan__node-add {
  font-size: 16px;
}

/* Phone: one column. Tablet two, desktop three — a week card holds five rows of
   wrapping text, so a fourth column would be narrower than its own content. */
.rn-plan__weeks {
  display: grid;
  gap: 12px;
  min-width: 0;
}

.rn-plan--tablet .rn-plan__weeks {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.rn-plan--desktop .rn-plan__weeks {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

/* The rail: what used to be absolutely-positioned connector lines of a fixed
   width. A border reads the same and costs no layout. */
.rn-plan__days {
  margin: 10px 0 0;
  padding: 2px 0 0 10px;
  border-left: 2px solid rgba(0, 0, 0, .08);
  list-style: none;
}

.rn-plan__day {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
  padding: 4px 0;
}

/* Fixed column so the day bodies line up, and `tabular-nums` so the dates do
   not jitter between rows. */
.rn-plan__day-date {
  flex: 0 0 52px;
  padding-top: 11px;
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: rgba(0, 0, 0, .45);
}

.rn-plan__node--day {
  padding: 8px 10px;
  font-size: 12px;
}

/* ---- notes ---- */

.rn-plan__note {
  margin: 4px 2px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .55);
}

.rn-plan__hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(76, 175, 80, .1);
  font-size: 12px;
  line-height: 1.45;
  color: #2e7d32;
}

.rn-plan__hint-glyph {
  flex: 0 0 auto;
  font-size: 16px;
}
</style>
