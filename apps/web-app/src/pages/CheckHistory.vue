<template>
  <!--
    /history, moved onto the chassis.

    It was the last page still drawing the pre-redesign chrome — a MobileLayout
    toolbar with search and checklist icons, and a bottom bar whose third tab
    read "Routine" where every chassis page reads "Agents" — around three
    things that each had their own visual language:

    * a full-bleed sparkline in a red/yellow/cyan gradient, as tall as the hero
      itself, plotting raw points with no scale to read it against;
    * a Vuetify `v-calendar` month grid with hard cell borders and grey/white
      banding, drawing three concentric D/K/G rings BEHIND the day number — at
      393px the number sat on top of its own rings ("28" over the arc) and the
      1st was clipped to "1 Oc";
    * ALL-CAPS outlined PREV / NEXT buttons under the grid.

    Now it is the same calendar the Goals page draws (`GoalCalendar`): one ring
    per day with the number inside it, the month flanked by chevrons, and a
    `MiniSparkline` — the chassis' own — for the trend. Tapping a day opens a
    ResponsiveSheet instead of a fullscreen Vuetify dialog with a blue toolbar.

    The reads are unchanged: the same `routines` query and the same
    `getProgress` card, which is still where Routine Efficiency is defined (this
    screen used to average it differently from /progress and the two disagreed).
  -->
  <app-shell-container
    active="progress"
    title="History"
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
        data-testid="history-progress"
        @click="goTo('/progress')"
      >
        <i class="rn-mi rn-shell__act-glyph">insights</i>
        <span v-if="labelledActions">Progress</span>
      </button>
    </template>

    <div class="rn-hist" :class="`rn-hist--${shell}`" data-testid="history-page">
      <section class="rn-hist__hero" data-testid="history-efficiency">
        <div class="rn-hist__hero-head">
          <span class="rn-hist__hero-label">Routine efficiency</span>
          <span class="rn-hist__hero-scope">this week</span>
        </div>
        <div class="rn-hist__hero-value">{{ efficiency.value || '—' }}</div>
        <p v-if="efficiency.description" class="rn-hist__hero-note">
          {{ efficiency.description }}
        </p>

        <!--
          Percent of each day's routine actually ticked, not the raw points the
          old chart plotted: points have no ceiling to read a line against, and
          the number above this is a percentage, so the trend under it should be
          the same unit. `null` is a day with no routine at all — a gap, which
          the sparkline draws as a break rather than as a zero.
        -->
        <mini-sparkline
          v-if="trend.values.length > 1"
          class="rn-hist__spark"
          :values="trend.values"
          :labels="trend.labels"
          data-testid="history-spark"
        />
      </section>

      <!-- The molecule carries no surface of its own — its consumer supplies the
           card, the same way Goals does. -->
      <section class="rn-hist__cal">
        <goal-calendar
          :month-label="monthLabel"
          :cells="cells"
          hint="Tap a day"
          @select-day="openDay"
          @prev-month="stepMonth(-1)"
          @next-month="stepMonth(1)"
        />
      </section>

      <p v-if="!loading && !routines.length" class="rn-hist__empty" data-testid="history-empty">
        No routine history yet. Once you have ticked a day, it shows up here.
      </p>
    </div>

    <responsive-sheet
      :open="dayOpen"
      :shell="shell"
      :title="dayTitle"
      data-testid="history-day-sheet"
      @close="dayOpen = false"
    >
      <div class="rn-hist__day">
        <!-- The D/K/G totals the old grid tried to show as three rings behind
             each day number. They are legible here and nowhere near a 34px cell. -->
        <div class="rn-hist__stims">
          <div
            v-for="stim in dayStimuli"
            :key="stim.key"
            class="rn-hist__stim"
            :data-testid="`history-stim-${stim.key}`"
          >
            <span class="rn-hist__stim-dot" :style="{ background: stim.color }"></span>
            <span class="rn-hist__stim-name">{{ stim.label }}</span>
            <span class="rn-hist__stim-value">{{ stim.earned }}</span>
          </div>
        </div>

        <ul v-if="dayTasks.length" class="rn-hist__tasks">
          <li v-for="(task, index) in dayTasks" :key="`${task.name}-${index}`" class="rn-hist__task">
            <i class="rn-mi rn-hist__task-glyph" :style="{ color: taskColor(task) }">
              {{ taskGlyph(task) }}
            </i>
            <span class="rn-hist__task-name">{{ task.name }}</span>
            <span class="rn-hist__task-time">{{ task.time }}</span>
          </li>
        </ul>
        <p v-else class="rn-hist__empty">Nothing was recorded for this day.</p>
      </div>
    </responsive-sheet>
  </app-shell-container>
</template>

<script>
import gql from 'graphql-tag';
import moment from 'moment';

import GoalCalendar from '@routine-notes/ui/molecules/GoalCalendar/GoalCalendar.vue';
import MiniSparkline from '@routine-notes/ui/molecules/MiniSparkline/MiniSparkline.vue';
import ResponsiveSheet from '@routine-notes/ui/molecules/ResponsiveSheet/ResponsiveSheet.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import AppShellContainer from '../containers/AppShellContainer.vue';
import { signOut } from '../utils/signOut';

export const LOGOUT_KEY = 'logout';

const DATE_FORMAT = 'DD-MM-YYYY';

// The scope /progress opens on (Progress.vue defaults its period prop to
// 'week'). This screen asks getProgress for the same window so the two
// headline numbers are the same number, not two readings of one name.
const EFFICIENCY_PERIOD = 'week';

/** How many days of trend the sparkline carries. */
const TREND_DAYS = 30;

/** The chassis' D/K/G tokens (chassis.md § Palette). */
const STIMULI = Object.freeze([
  { key: 'D', label: 'Discipline', color: '#4CAF50' },
  { key: 'K', label: 'Kinetics', color: '#E53935' },
  { key: 'G', label: 'Geniuses', color: '#2196F3' },
]);

export default {
  name: 'CheckHistory',

  components: {
    AppShellContainer,
    GoalCalendar,
    MiniSparkline,
    ResponsiveSheet,
  },

  apollo: {
    routines: {
      query: gql`
        query routines {
          routines {
            id
            date
            tasklist {
              name
              time
              points
              ticked
              passed
              stimuli {
                name
                earned
              }
            }
          }
        }
      `,
    },
    // Routine Efficiency is not worked out here. This screen used to average
    // every routine day ever recorded while /progress averaged only the days
    // that scored, so one account read 6% here and 15% there at the same
    // instant. The server owns the single definition now and both screens read
    // the card it returns.
    progress: {
      query: gql`
        query getProgress($period: String!, $startDate: String!, $endDate: String!) {
          getProgress(period: $period, startDate: $startDate, endDate: $endDate) {
            period
            cards {
              id
              value
              description
            }
          }
        }
      `,
      update(data) {
        return data.getProgress;
      },
      variables() {
        return {
          period: EFFICIENCY_PERIOD,
          startDate: moment().startOf(EFFICIENCY_PERIOD).format(DATE_FORMAT),
          endDate: moment().format(DATE_FORMAT),
        };
      },
    },
  },

  data() {
    return {
      routines: [],
      progress: null,
      /** First of the month the grid is showing. */
      monthDate: moment().startOf('month').format(DATE_FORMAT),
      selectedDate: moment().format(DATE_FORMAT),
      dayOpen: false,
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
      return this.isPhone ? '' : 'Every day you have recorded';
    },
    loading() {
      const q = this.$apollo.queries.routines;
      return !!(q && q.loading);
    },
    efficiency() {
      const cards = (this.progress && this.progress.cards) || [];
      return cards.find((card) => card && card.id === 'efficiency') || {};
    },

    /** `DD-MM-YYYY` -> that day's routine. */
    routinesByDate() {
      const map = {};
      (this.routines || []).forEach((routine) => {
        if (routine && routine.date) map[routine.date] = routine;
      });
      return map;
    },

    monthLabel() {
      return moment(this.monthDate, DATE_FORMAT).format('MMMM YYYY');
    },

    /**
     * Whole Sunday-first weeks with blanks padded — the shape GoalCalendar's
     * `cells` contract wants. `value` is the share of the day's tasks ticked,
     * which is what its ring draws.
     */
    cells() {
      const month = moment(this.monthDate, DATE_FORMAT);
      if (!month.isValid()) return [];
      const today = moment().format(DATE_FORMAT);
      const todayMoment = moment(today, DATE_FORMAT);
      const firstDow = month.clone().startOf('month').day();
      const days = month.daysInMonth();
      const out = [];

      for (let i = 0; i < firstDow; i += 1) out.push({ key: `pad-${i}`, blank: true });

      for (let d = 1; d <= days; d += 1) {
        const date = month.clone().date(d).format(DATE_FORMAT);
        const tasks = this.tasksFor(date);
        const done = tasks.filter((task) => task.ticked).length;
        out.push({
          key: date,
          blank: false,
          day: d,
          date,
          total: tasks.length,
          done,
          value: tasks.length ? (done / tasks.length) * 100 : 0,
          selected: date === this.selectedDate,
          today: date === today,
          future: moment(date, DATE_FORMAT).isAfter(todayMoment, 'day'),
        });
      }

      while (out.length % 7) out.push({ key: `tail-${out.length}`, blank: true });
      return out;
    },

    /** The last TREND_DAYS of recorded days, oldest first. */
    trend() {
      const dated = (this.routines || [])
        .filter((routine) => routine && routine.date)
        .map((routine) => ({ routine, at: moment(routine.date, DATE_FORMAT) }))
        .filter((entry) => entry.at.isValid())
        .sort((a, b) => a.at.valueOf() - b.at.valueOf())
        .slice(-TREND_DAYS);

      const values = dated.map(({ routine }) => {
        const tasks = routine.tasklist || [];
        if (!tasks.length) return null;
        return (tasks.filter((task) => task.ticked).length / tasks.length) * 100;
      });

      const labels = dated.length
        ? [dated[0].at.format('D MMM'), dated[dated.length - 1].at.format('D MMM')]
        : [];

      return { values, labels };
    },

    dayTitle() {
      return moment(this.selectedDate, DATE_FORMAT).format('dddd, D MMMM YYYY');
    },
    dayTasks() {
      return this.tasksFor(this.selectedDate);
    },
    /** D/K/G earned across the open day. */
    dayStimuli() {
      const tasks = this.dayTasks;
      return STIMULI.map((stim) => ({
        ...stim,
        earned: tasks.reduce((sum, task) => {
          const found = (task.stimuli || []).find((entry) => entry && entry.name === stim.key);
          return sum + ((found && found.earned) || 0);
        }, 0),
      }));
    },
  },

  methods: {
    tasksFor(date) {
      const routine = this.routinesByDate[date];
      return (routine && routine.tasklist) || [];
    },

    stepMonth(delta) {
      this.monthDate = moment(this.monthDate, DATE_FORMAT)
        .add(delta, 'month')
        .startOf('month')
        .format(DATE_FORMAT);
    },

    /* A day with no routine recorded still opens — the sheet says so, which is
       a clearer answer than a tap that does nothing. */
    openDay(date) {
      this.selectedDate = date;
      this.dayOpen = true;
    },

    taskGlyph(task) {
      if (task.ticked) return 'check_circle';
      if (task.passed) return 'cancel';
      return 'schedule';
    },
    taskColor(task) {
      if (task.ticked) return '#4CAF50';
      if (task.passed) return '#d32f2f';
      return 'rgba(0, 0, 0, .35)';
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
.rn-hist {
  display: grid;
  gap: 12px;
  align-content: start;
  min-width: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* Two columns once there is room: the hero and the calendar are both about a
   month, so side by side reads as one answer rather than two screens. */
.rn-hist--desktop {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  align-items: start;
}

.rn-hist__cal,
.rn-hist__hero {
  min-width: 0;
  padding: 14px 16px 10px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .06), 0 8px 18px -12px rgba(0, 0, 0, .12);
}

.rn-hist__cal {
  padding: 4px 4px 2px;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, .06), 0 8px 18px -12px rgba(0, 0, 0, .12);
}

.rn-hist__hero-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.rn-hist__hero-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: rgba(0, 0, 0, .5);
}

.rn-hist__hero-scope {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .35);
}

/* The old card set this in Vuetify's `display-2 font-weight-black` (56px/900),
   which was louder than any heading on any other page. */
.rn-hist__hero-value {
  margin-top: 2px;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}

.rn-hist__hero-note {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .55);
}

.rn-hist__spark {
  margin-top: 8px;
}

/* ---- the day sheet ---- */

.rn-hist__day {
  min-width: 0;
}

.rn-hist__stims {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rn-hist__stim {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, .04);
  font-size: 12px;
}

.rn-hist__stim-dot {
  width: 8px;
  height: 8px;
  border-radius: 4px;
}

.rn-hist__stim-name {
  font-weight: 600;
  color: rgba(0, 0, 0, .6);
}

.rn-hist__stim-value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rn-hist__tasks {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}

.rn-hist__task {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 14px;
}

.rn-hist__task-glyph {
  flex: 0 0 auto;
  font-size: 19px;
}

.rn-hist__task-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.rn-hist__task-time {
  flex: 0 0 auto;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: rgba(0, 0, 0, .45);
}

.rn-hist__empty {
  margin: 12px 2px;
  font-size: 14px;
  line-height: 1.5;
  color: rgba(0, 0, 0, .55);
}
</style>
