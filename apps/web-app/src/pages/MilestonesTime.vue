<template>
  <!--
    /goals/milestones, moved onto the chassis.

    It was the last page in the Goals area still drawing legacy chrome: a
    MobileLayout toolbar (which rendered UNDER the status bar), a bottom nav
    whose third tab read "Routine" where every chassis page reads "Agents", and
    a floating action button parked over the content to get back to /goals.
    Now it mounts AppShellContainer like Goals, Progress and About, so there is
    one header, one nav and one set of safe-area rules across the area.

    The accordion is gone with it. Each period that HAS milestones is a card,
    open, with its count in the header — on a page whose whole job is to show
    what is outstanding, collapsing the answer by default was working against
    the reader. Periods with nothing are omitted rather than rendered empty.

    Layout + composition only: the `goalMilestones` read and
    `GoalItemMilestoneList` are unchanged.
  -->
  <app-shell-container
    active="goals"
    title="Milestones"
    :subtitle="subLabel"
    @navigate="onNavigate"
    @sign-out="onSignOut"
  >
    <template v-slot:header-actions>
      <button
        type="button"
        class="rn-shell__act"
        :class="labelledActions ? 'rn-shell__act--label' : 'rn-shell__act--icon'"
        title="Goals"
        data-testid="milestones-goals"
        @click="goTo('/goals')"
      >
        <i class="rn-mi rn-shell__act-glyph">view_agenda</i>
        <span v-if="labelledActions">Goals</span>
      </button>
    </template>

    <div class="rn-miles" :class="`rn-miles--${shell}`" data-testid="milestones-page">
      <load-error-state
        v-if="loadError"
        message="We couldn't load your goals."
        :retrying="loading"
        @retry="retryMilestones"
      />

      <p v-else-if="loading && !hasAny" class="rn-miles__note">Loading your milestones…</p>

      <p v-else-if="!hasAny" class="rn-miles__note" data-testid="milestones-empty">
        No milestones yet. A goal becomes a milestone when a longer-period goal
        depends on it.
      </p>

      <section
        v-for="group in groups"
        :key="group.period"
        class="rn-miles__card"
        :data-testid="`milestones-group-${group.period}`"
      >
        <header class="rn-miles__head">
          <h2 class="rn-miles__title">{{ group.label }}</h2>
          <span class="rn-miles__count">{{ group.items.length }}</span>
        </header>
        <p v-if="group.failed" class="rn-miles__note rn-miles__note--card">
          Couldn't load these. <button type="button" class="rn-miles__retry" @click="retryMilestones">Retry</button>
        </p>
        <template v-else>
          <goal-item-milestone-list :goal-items="shownItems(group)" />
          <button
            v-if="group.items.length > shownItems(group).length"
            type="button"
            class="rn-miles__more"
            :data-testid="`milestones-more-${group.period}`"
            @click="showAll(group.period)"
          >
            Show all {{ group.items.length }}
          </button>
        </template>
      </section>
    </div>
  </app-shell-container>
</template>

<script>
import gql from 'graphql-tag';

import GoalItemMilestoneList from '@routine-notes/ui/molecules/GoalItemMilestoneList/GoalItemMilestoneList.vue';
import LoadErrorState from '@routine-notes/ui/molecules/LoadErrorState/LoadErrorState.vue';
import { resolveShell } from '@routine-notes/ui/constants/navigation';
import AppShellContainer from '../containers/AppShellContainer.vue';
import { signOut } from '../utils/signOut';

export const LOGOUT_KEY = 'logout';

/* Longest horizon last, and the label the card shows. `periodsArray` from
   constants/goals is deliberately NOT reused: its entries carry an `active`
   flag that the old accordion mutated in place, so the shared constant kept
   one page's open/closed state and handed it to the next mount. */
/** `day` -> `milestonesDay`, the apollo key that period's query writes to. */
function queryKey(period) {
  return `milestones${period.charAt(0).toUpperCase()}${period.slice(1)}`;
}

/** Rows drawn per card before "Show all". */
const PAGE_SIZE = 50;

const GROUPS = Object.freeze([
  { period: 'day', label: 'Day goals' },
  { period: 'week', label: 'Week goals' },
  { period: 'month', label: 'Month goals' },
  { period: 'year', label: 'Year goals' },
  { period: 'lifetime', label: 'Life goals' },
]);

export default {
  name: 'MilestonesTime',

  components: {
    AppShellContainer,
    GoalItemMilestoneList,
    LoadErrorState,
  },

  data() {
    return { loadErrors: {}, expanded: {} };
  },

  /*
   * One query PER PERIOD, not one query for all five.
   *
   * The single combined query returned HTTP 502 "Internal server error" and the
   * page showed its load-error state permanently. The periods are fine
   * individually but not together — measured against the live API:
   *
   *   day       926 items, 0 nested levels  -> 3.9 MB
   *   lifetime    2 items, 4 nested levels  -> 2.5 MB
   *   year        1 item,  3 nested levels  -> 558 KB
   *   week        1 item,  1 nested level   ->   7 KB
   *   month       0 items                   ->   67 B
   *
   * ~7 MB in one response, over Lambda's 6 MB limit, so the function died
   * before it could answer. Split, every one of them returns 200, and a period
   * that does fail now only costs its own card instead of the whole page.
   */
  apollo: {
    milestonesDay: {
      query: gql`
        query {
          goalMilestones {
            day {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            }
          }
        }
      `,
      update: (data) => (data && data.goalMilestones && data.goalMilestones.day) || [],
      result({ data }) {
        if (data) this.$set(this.loadErrors, 'day', false);
      },
      error(error) {
        console.error('[MilestonesTime] day milestones failed:', error);
        this.$set(this.loadErrors, 'day', true);
      },
    },
    milestonesWeek: {
      query: gql`
        query {
          goalMilestones {
            week {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            milestones {
              id
              body
              period
              date
              deadline
              contribution
              reward
              isComplete
              isMilestone
              taskRef
              goalRef
            }
            }
          }
        }
      `,
      update: (data) => (data && data.goalMilestones && data.goalMilestones.week) || [],
      result({ data }) {
        if (data) this.$set(this.loadErrors, 'week', false);
      },
      error(error) {
        console.error('[MilestonesTime] week milestones failed:', error);
        this.$set(this.loadErrors, 'week', true);
      },
    },
    milestonesMonth: {
      query: gql`
        query {
          goalMilestones {
            month {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            milestones {
              id
              body
              period
              date
              deadline
              contribution
              reward
              isComplete
              isMilestone
              taskRef
              goalRef
              milestones {
                id
                body
                period
                date
                deadline
                contribution
                reward
                isComplete
                isMilestone
                taskRef
                goalRef
              }
            }
            }
          }
        }
      `,
      update: (data) => (data && data.goalMilestones && data.goalMilestones.month) || [],
      result({ data }) {
        if (data) this.$set(this.loadErrors, 'month', false);
      },
      error(error) {
        console.error('[MilestonesTime] month milestones failed:', error);
        this.$set(this.loadErrors, 'month', true);
      },
    },
    milestonesYear: {
      query: gql`
        query {
          goalMilestones {
            year {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            milestones {
              id
              body
              period
              date
              deadline
              contribution
              reward
              isComplete
              isMilestone
              taskRef
              goalRef
              milestones {
                id
                body
                period
                date
                deadline
                contribution
                reward
                isComplete
                isMilestone
                taskRef
                goalRef
                milestones {
                  id
                  body
                  period
                  date
                  deadline
                  contribution
                  reward
                  isComplete
                  isMilestone
                  taskRef
                  goalRef
                }
              }
            }
            }
          }
        }
      `,
      update: (data) => (data && data.goalMilestones && data.goalMilestones.year) || [],
      result({ data }) {
        if (data) this.$set(this.loadErrors, 'year', false);
      },
      error(error) {
        console.error('[MilestonesTime] year milestones failed:', error);
        this.$set(this.loadErrors, 'year', true);
      },
    },
    milestonesLifetime: {
      query: gql`
        query {
          goalMilestones {
            lifetime {
            id
            body
            period
            date
            deadline
            contribution
            reward
            isComplete
            isMilestone
            taskRef
            goalRef
            milestones {
              id
              body
              period
              date
              deadline
              contribution
              reward
              isComplete
              isMilestone
              taskRef
              goalRef
              milestones {
                id
                body
                period
                date
                deadline
                contribution
                reward
                isComplete
                isMilestone
                taskRef
                goalRef
                milestones {
                  id
                  body
                  period
                  date
                  deadline
                  contribution
                  reward
                  isComplete
                  isMilestone
                  milestones {
                    id
                    body
                    period
                    date
                    deadline
                    contribution
                    reward
                    isComplete
                    isMilestone
                    taskRef
                    goalRef
                  }
                  taskRef
                  goalRef
                }
              }
            }
            }
          }
        }
      `,
      update: (data) => (data && data.goalMilestones && data.goalMilestones.lifetime) || [],
      result({ data }) {
        if (data) this.$set(this.loadErrors, 'lifetime', false);
      },
      error(error) {
        console.error('[MilestonesTime] lifetime milestones failed:', error);
        this.$set(this.loadErrors, 'lifetime', true);
      },
    },
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
      return this.isPhone ? '' : 'Goals that other goals depend on';
    },
    /** Still loading while ANY period is in flight. */
    loading() {
      return GROUPS.some(({ period }) => {
        const q = this.$apollo.queries[queryKey(period)];
        return !!(q && q.loading);
      });
    },
    /** Every period failed — then it is the page that is broken, not a card. */
    loadError() {
      return GROUPS.every(({ period }) => this.loadErrors[period]);
    },
    /** Only the periods that actually have milestones; the rest are omitted. */
    groups() {
      return GROUPS
        .map(({ period, label }) => ({
          period,
          label,
          items: this[queryKey(period)] || [],
          failed: !!this.loadErrors[period],
        }))
        .filter((group) => group.items.length > 0 || group.failed);
    },
    hasAny() {
      return this.groups.length > 0;
    },
  },

  methods: {
    /*
     * First PAGE_SIZE rows until asked for the rest. `day` came back with 926
     * milestones, and rendering every one (each a recursive list component)
     * built a card taller than the scroller could usefully carry.
     */
    shownItems(group) {
      if (this.expanded[group.period]) return group.items;
      return group.items.slice(0, PAGE_SIZE);
    },
    showAll(period) {
      this.$set(this.expanded, period, true);
    },
    retryMilestones() {
      GROUPS.forEach(({ period }) => {
        const q = this.$apollo.queries[queryKey(period)];
        if (q) q.refetch().catch(() => {});
      });
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

<style src="@routine-notes/ui/styles/app/pages/MilestonesTime.css"></style>
