<template>
  <AtomCard class="upcoming-past-card">
    <AtomTabs :value="tabs" @change="onTabsInput" right>
      <AtomTab>Upcoming</AtomTab>
      <AtomTab>Past</AtomTab>
    </AtomTabs>
    <AtomList
      subheader
      style="width:100%"
      v-if="activeTasks.length > 0"
      class="concentrated-view elevation-0"
    >
      <div v-for="(task, index) in activeTasks" :key="`task-${task.id}`">
        <AtomDivider v-if="index != 0" :key="`divider-${task.id}`" :inset="task.inset" />
        <AtomListTile
          :key="`tile-${task.id}`"
          @click="$emit('task-click', task)"
          :class="task.id === selectedTaskRef ? 'active' : ''"
          avatar
        >
          <AtomProgressCircular
            :value="task.percentage || 0"
            :size="48"
            :rotate="-90"
            class="mr-3 circular-task"
            width="2"
            color="warning"
          >
            <AtomListTileAvatar>
              <AtomButton
                fab
                small
                class="elevation-0 task-action-btn"
                :disabled="task.buttonDisabled"
                :color="task.buttonColor"
                @click="$emit('action-click', { event: $event, task })"
              >
                <transition name="fr-icon-fade" mode="out-in">
                  <AtomIcon :key="task.buttonIcon">{{ task.buttonIcon }}</AtomIcon>
                </transition>
              </AtomButton>
            </AtomListTileAvatar>
          </AtomProgressCircular>
          <AtomListTileContent>
            <AtomListTileTitle>
              <span>{{ task.name }}</span>
            </AtomListTileTitle>
            <AtomListTileSubTitle v-if="task.id === selectedTaskRef">
              <div class="time-text">
                {{ task.timeLabel }} - {{ task.completedCount }}/{{ task.totalCount }}
              </div>
              <div>
                <AtomBtnToggle :value="goalPeriod" @change="onGoalPeriodInput" mandatory>
                  <AtomButton flat value="day">Today</AtomButton>
                  <AtomButton flat value="week">Week</AtomButton>
                  <AtomButton flat value="month">Month</AtomButton>
                  <AtomButton flat value="year">Year</AtomButton>
                </AtomBtnToggle>
              </div>
            </AtomListTileSubTitle>
            <AtomListTileSubTitle v-else>
              {{ task.timeLabel }}
            </AtomListTileSubTitle>
            <div v-if="task.id === selectedTaskRef" class="pt-2 pb-2 task-goals">
              <AtomLayout
                class="mb-3"
                row
                wrap
                v-if="hasWeekGoalFor(task.id) && hasMonthGoalFor(task.id)"
              >
                <AtomFlex xs12>
                  <AtomAlert :value="true" color="success" icon="check_circle" outline>
                    You are all set.
                    Do daily milestones to complete weekly and monthly goals.
                  </AtomAlert>
                </AtomFlex>
              </AtomLayout>
              <AtomLayout class="mb-3" row wrap v-else>
                <AtomFlex xs6 v-if="!hasMonthGoalFor(task.id)">
                  <AtomChip small @click="$emit('set-goal-period', { period: 'month', task })">
                    <AtomAvatar class="red text-white"><AtomIcon>close</AtomIcon></AtomAvatar>
                    Set Month's Goal
                  </AtomChip>
                </AtomFlex>
                <AtomFlex xs6 v-if="hasMonthGoalFor(task.id)">
                  <AtomChip small>
                    <AtomAvatar class="success text-white"><AtomIcon>check</AtomIcon></AtomAvatar>
                    Set Month's Goal
                  </AtomChip>
                </AtomFlex>
                <AtomFlex xs6 v-if="!hasWeekGoalFor(task.id)">
                  <AtomChip small @click="$emit('set-goal-period', { period: 'week', task })">
                    <AtomAvatar class="red text-white"><AtomIcon>close</AtomIcon></AtomAvatar>
                    Set Week's Goal
                  </AtomChip>
                </AtomFlex>
                <AtomFlex xs6 v-if="hasWeekGoalFor(task.id)">
                  <AtomChip small>
                    <AtomAvatar class="success text-white"><AtomIcon>check</AtomIcon></AtomAvatar>
                    Set Week's Goal
                  </AtomChip>
                </AtomFlex>
              </AtomLayout>
              <div v-if="filteredPeriodGoalsFor(task.id).length">
                <div
                  :key="taskGoals.id"
                  v-for="taskGoals in filteredPeriodGoalsFor(task.id)"
                >
                  <AtomList two-line subheader>
                    <goal-item-list
                      :key="`goal-${taskGoals.id}-${goalPeriod}-${task.id}`"
                      :goal="taskGoals"
                      :progress="getWeekProgress(taskGoals)"
                      :passive="showGoalsSkeleton"
                      @delete-task-goal="$emit('delete-task-goal', $event)"
                      @refresh-task-goal="$emit('refresh-task-goal', $event)"
                      @toggle-goal-display-dialog="forwardToggleGoalDisplayDialog"
                      @complete-goal-item="$emit('complete-goal-item', $event)"
                      @complete-sub-task="$emit('complete-sub-task', $event)"
                    />
                  </AtomList>
                </div>
              </div>
              <small class="no-goals-text" v-else>
                No goal or activity logged.
              </small>
            </div>
          </AtomListTileContent>
          <AtomListTileAction v-if="task.id !== selectedTaskRef">
            <AtomListTileActionText>
              <b>{{ task.completedCount }}</b>/{{ task.totalCount }}
            </AtomListTileActionText>
            <AtomListTileActionText>tasks</AtomListTileActionText>
          </AtomListTileAction>
        </AtomListTile>
      </div>
    </AtomList>
    <div v-else>
      <AtomCardText class="text-xs-center">
        <p>No upcoming routine items.</p>
      </AtomCardText>
    </div>
  </AtomCard>
</template>

<script>
import {
  AtomAlert,
  AtomAvatar,
  AtomBtnToggle,
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomChip,
  AtomDivider,
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAction,
  AtomListTileActionText,
  AtomListTileAvatar,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomProgressCircular,
  AtomTab,
  AtomTabs,
} from '../../atoms';
import GoalItemList from '../GoalItemList/GoalItemList.vue';

function filterByTaskPeriod(goals, taskId, period) {
  if (!Array.isArray(goals) || !goals.length || !taskId) return [];
  const bucket = [];
  goals.forEach((goal) => {
    if (goal && goal.period === period) {
      const items = (goal.goalItems || []).filter((gi) => gi.taskRef === taskId);
      if (items.length) {
        bucket.push({
          id: goal.id,
          period: goal.period,
          date: goal.date,
          goalItems: items,
        });
      }
    }
  });
  return bucket;
}

export default {
  name: 'OrganismUpcomingPastTasks',
  components: {
    AtomAlert,
    AtomAvatar,
    AtomBtnToggle,
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomChip,
    AtomDivider,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAction,
    AtomListTileActionText,
    AtomListTileAvatar,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomProgressCircular,
    AtomTab,
    AtomTabs,
    GoalItemList,
  },
  props: {
    upcomingTasks: { type: Array, default: () => [] },
    pastTasks: { type: Array, default: () => [] },
    tabs: { type: Number, default: 0 },
    selectedTaskRef: { type: String, default: '' },
    goalPeriod: { type: String, default: 'day' },
    goals: { type: Array, default: () => [] },
    allGoals: { type: Array, default: () => [] },
    showGoalsSkeleton: { type: Boolean, default: false },
    lastCompleteItemGoalRef: { type: [String, Number], default: '' },
  },
  computed: {
    activeTasks() {
      return this.tabs === 1 ? this.pastTasks : this.upcomingTasks;
    },
  },
  methods: {
    onTabsInput(val) {
      this.$emit('update:tabs', val);
    },
    onGoalPeriodInput(val) {
      this.$emit('update:goalPeriod', val);
    },
    /**
     * Forward GoalItemList's two-argument toggle-goal-display-dialog
     * event up to the dashboard. Method binding (vs. an inline arrow)
     * is required because Vue 2 templates lose `this` inside arrow
     * function expressions, leading to `Cannot read properties of
     * undefined (reading '_events')` on $emit.
     */
    forwardToggleGoalDisplayDialog(goalItem, open) {
      this.$emit('toggle-goal-display-dialog', goalItem, open);
    },
    hasWeekGoalFor(taskId) {
      return filterByTaskPeriod(this.goals, taskId, 'week').length > 0;
    },
    hasMonthGoalFor(taskId) {
      return filterByTaskPeriod(this.goals, taskId, 'month').length > 0;
    },
    filteredPeriodGoalsFor(taskId) {
      return filterByTaskPeriod(this.goals, taskId, this.goalPeriod);
    },
    getWeekProgress(taskGoals) {
      if (this.goalPeriod !== 'day') return 0;
      const mainTaskGoalRef = taskGoals.goalItems.length === 1 ? taskGoals.goalItems[0].goalRef : 0;
      if (this.allGoals && this.allGoals.length) {
        const week = this.allGoals.find((g) => g.period === 'week');
        const matched = week
          && week.goalItems.find((gi) => gi.id === this.lastCompleteItemGoalRef || mainTaskGoalRef);
        return (matched && matched.progress) || 0;
      }
      return 0;
    },
  },
};
</script>

<style>
.upcoming-past-card {
  overflow: hidden;
}
.upcoming-past-card .concentrated-view .active {
  background-color: #fff;
}
.upcoming-past-card .concentrated-view .active .v-list__tile--avatar,
.upcoming-past-card .concentrated-view .v-list__tile--avatar {
  transition: 0.35s;
}
.upcoming-past-card .concentrated-view .active .v-list__tile--avatar {
  height: 300px;
}
.upcoming-past-card .concentrated-view .active .circular-task {
  align-self: start;
}
.upcoming-past-card .concentrated-view .active .v-list__tile__avatar {
  align-self: start;
}
.upcoming-past-card .concentrated-view .active .v-list__tile .circular-task {
  min-width: 48px;
}
.upcoming-past-card .concentrated-view .active .v-list__tile {
  padding-top: 16px;
  padding-bottom: 16px;
}
.upcoming-past-card .concentrated-view .active .v-list__tile__avatar {
  justify-content: start;
}
.upcoming-past-card .concentrated-view .v-list__tile {
  overflow: hidden;
}
.upcoming-past-card .concentrated-view .v-list__tile__content {
  min-width: 0;
  overflow: hidden;
}
.upcoming-past-card .concentrated-view .v-list__tile__title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.upcoming-past-card .concentrated-view .active .v-list__tile__content {
  justify-content: start;
}
.upcoming-past-card .concentrated-view .active .v-list__tile__title {
  font-size: 24px;
  height: 28px;
}
.upcoming-past-card .concentrated-view .active .goal-list .v-list__tile__title {
  font-size: 10px;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title {
  display: flex;
  justify-content: space-between;
  align-content: center;
  padding: 4px 0;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .time-text {
  align-self: center;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .v-item-group {
  border: 1px solid #288bd5;
  border-radius: 20px;
  box-shadow: none;
  overflow: hidden;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn {
  height: 24px;
  border-radius: 0;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn:first-child {
  border-radius: 20px 0 0 20px;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn:last-child {
  border-radius: 0 20px 20px 0;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn__content {
  font-size: 10px;
  color: #000;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active {
  background-color: #288bd5;
}
.upcoming-past-card .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active .v-btn__content {
  color: #fff;
}
.upcoming-past-card .concentrated-view .task-goals {
  width: 100%;
  height: 240px;
  overflow-x: hidden;
  overflow-y: auto;
}
.upcoming-past-card .concentrated-view .task-goals .v-list__tile {
  padding: 4px 0;
  height: 32px;
}
.upcoming-past-card .concentrated-view .task-goals .v-input--selection-controls__ripple,
.upcoming-past-card .concentrated-view .task-goals .v-list__tile__action .v-btn,
.upcoming-past-card .concentrated-view .task-goals .v-list__tile__title {
  height: 24px;
}
.upcoming-past-card .concentrated-view .task-goals .v-input--selection-controls__ripple {
  top: calc(50% - 19px);
}
.upcoming-past-card .concentrated-view .task-goals .v-list {
  background: transparent;
}
.upcoming-past-card .concentrated-view .task-goals .v-list__tile__action {
  min-width: 36px;
}
.upcoming-past-card .concentrated-view .task-goals
  .v-input--selection-controls:not(.v-input--hide-details)
  .v-input__slot {
  margin-bottom: 3px;
}
.upcoming-past-card .concentrated-view .task-goals .v-list__tile__title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.upcoming-past-card .concentrated-view .task-goals .v-chip {
  cursor: pointer;
  font-size: 11px;
  margin: 0 2px 0 0;
}
.upcoming-past-card .concentrated-view .task-goals .no-goals-text {
  display: block;
  padding: 20px 0 20px 36px;
  color: #777;
}
.upcoming-past-card .concentrated-view .task-goals .v-alert.v-alert--outline {
  padding: 4px;
  font-size: 11px;
}
.upcoming-past-card .concentrated-view .task-goals .add-new {
  border-top: 1px solid #ccc;
  padding-top: 8px;
}
.upcoming-past-card .circular-task .v-avatar {
  margin: 0 auto;
}
.upcoming-past-card .text-white { color: #fff; }

/* Mobile: task-goals full width */
@media (max-width: 600px) {
  .upcoming-past-card .concentrated-view .active .v-list__tile--avatar {
    height: auto;
  }
  .upcoming-past-card .concentrated-view .active .v-list__tile__content {
    overflow: visible;
    min-width: 0;
  }
  .upcoming-past-card .concentrated-view .active .task-goals {
    height: auto;
    max-height: 300px;
    position: relative;
    z-index: 1;
    margin-left: -60px;
    width: calc(100% + 60px);
  }
}
</style>
