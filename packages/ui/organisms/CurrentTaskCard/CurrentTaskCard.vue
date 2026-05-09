<template>
  <AtomCard class="mb-3 pb-3 current-task">
    <AtomList
      v-if="task && task.id"
      class="concentrated-view elevation-0"
    >
      <AtomListTile
        @click="$emit('click', task)"
        class="active"
        avatar
      >
        <AtomProgressCircular
          :value="percentage"
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
              :disabled="buttonDisabled"
              :color="buttonColor"
              @click="$emit('action-click', { event: $event, task })"
            >
              <transition name="fr-icon-fade" mode="out-in">
                <AtomIcon :key="buttonIcon">{{ buttonIcon }}</AtomIcon>
              </transition>
            </AtomButton>
          </AtomListTileAvatar>
        </AtomProgressCircular>
        <AtomListTileContent>
          <AtomListTileTitle>
            <span>{{ task.name }}</span>
            <div class="step-info" @click="$emit('toggle-step-modal')"><AtomIcon>info</AtomIcon></div>
          </AtomListTileTitle>
          <AtomListTileSubTitle class="pt-2">
            <div class="time-text">
              {{ timeLabel }} - {{ completedCount }}/{{ totalCount }}
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

          <!-- Skeleton loading state for daily goals -->
          <template v-if="showGoalsSkeleton">
            <div class="pt-2 pb-2" style="width: 100%;">
              <AtomLayout class="mb-3" row wrap>
                <AtomFlex xs6>
                  <div class="skeleton skeleton-chip mr-2" style="width: 120px; height: 28px;"></div>
                </AtomFlex>
                <AtomFlex xs6>
                  <div class="skeleton skeleton-chip" style="width: 120px; height: 28px;"></div>
                </AtomFlex>
              </AtomLayout>
              <div class="skeleton skeleton-text mb-3" style="width: 60%; height: 20px;"></div>
              <div class="skeleton skeleton-text mb-3" style="width: 40%; height: 16px;"></div>
            </div>
          </template>

          <!-- Actual content when loaded -->
          <div v-else class="pt-2 pb-2 task-goals">
            <AtomLayout
              class="mb-3"
              row
              wrap
              v-if="hasWeekGoal && hasMonthGoal"
            >
              <AtomFlex xs12>
                <AtomAlert :value="true" color="success" icon="check_circle" outline>
                  You are all set.
                  Do daily milestones to complete weekly and monthly goals.
                </AtomAlert>
              </AtomFlex>
            </AtomLayout>
            <AtomLayout class="mb-3" row wrap v-else>
              <AtomFlex xs6 v-if="!hasMonthGoal">
                <AtomChip small @click="$emit('set-goal-period', 'month')">
                  <AtomAvatar class="red text-white"><AtomIcon>close</AtomIcon></AtomAvatar>
                  Set Month's Goal
                </AtomChip>
              </AtomFlex>
              <AtomFlex xs6 v-if="hasMonthGoal">
                <AtomChip small>
                  <AtomAvatar class="success text-white"><AtomIcon>check</AtomIcon></AtomAvatar>
                  Set Month's Goal
                </AtomChip>
              </AtomFlex>
              <AtomFlex xs6 v-if="!hasWeekGoal">
                <AtomChip small @click="$emit('set-goal-period', 'week')">
                  <AtomAvatar class="red text-white"><AtomIcon>close</AtomIcon></AtomAvatar>
                  Set Week's Goal
                </AtomChip>
              </AtomFlex>
              <AtomFlex xs6 v-if="hasWeekGoal">
                <AtomChip small>
                  <AtomAvatar class="success text-white"><AtomIcon>check</AtomIcon></AtomAvatar>
                  Set Week's Goal
                </AtomChip>
              </AtomFlex>
            </AtomLayout>

            <!-- Event execution timer alert -->
            <AtomLayout class="mb-3" row wrap v-if="eventExecutionInProgress">
              <AtomFlex xs12>
                <AtomAlert :value="true" color="info" icon="timer" outline>
                  <div class="d-flex align-center">
                    <div class="flex-grow-1">
                      <div class="caption">Refreshing goals in {{ eventExecutionTimeLeft }} seconds...</div>
                    </div>
                    <div>
                      <AtomProgressCircular
                        :value="((60 - eventExecutionTimeLeft) / 60) * 100"
                        size="32"
                        width="3"
                        color="info"
                      >
                        {{ eventExecutionTimeLeft }}
                      </AtomProgressCircular>
                    </div>
                  </div>
                </AtomAlert>
              </AtomFlex>
            </AtomLayout>

            <div v-if="filteredPeriodGoals.length">
              <div
                :key="taskGoals.id"
                v-for="taskGoals in filteredPeriodGoals"
              >
                <AtomList two-line subheader>
                  <goal-item-list
                    :key="`goal-${taskGoals.id}-${goalPeriod}`"
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
      </AtomListTile>
    </AtomList>
    <current-task-skeleton v-else-if="showRoutineSkeleton || loading" />
    <div v-else>
      <AtomCardText class="text-xs-center">
        <p>No current items to display. Please go to Routine Settings and add routine items.</p>
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
  AtomFlex,
  AtomIcon,
  AtomLayout,
  AtomList,
  AtomListTile,
  AtomListTileAvatar,
  AtomListTileContent,
  AtomListTileSubTitle,
  AtomListTileTitle,
  AtomProgressCircular,
} from '../../atoms';
import CurrentTaskSkeleton from '../../skeletons/CurrentTaskSkeleton/CurrentTaskSkeleton.vue';
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
  name: 'OrganismCurrentTaskCard',
  components: {
    AtomAlert,
    AtomAvatar,
    AtomBtnToggle,
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomChip,
    AtomFlex,
    AtomIcon,
    AtomLayout,
    AtomList,
    AtomListTile,
    AtomListTileAvatar,
    AtomListTileContent,
    AtomListTileSubTitle,
    AtomListTileTitle,
    AtomProgressCircular,
    CurrentTaskSkeleton,
    GoalItemList,
  },
  props: {
    task: { type: Object, default: null },
    goals: { type: Array, default: () => [] },
    allGoals: { type: Array, default: () => [] },
    goalPeriod: { type: String, default: 'day' },
    percentage: { type: Number, default: 0 },
    completedCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    timeLabel: { type: String, default: '' },
    buttonIcon: { type: String, default: 'more_horiz' },
    buttonColor: { type: String, default: '' },
    buttonDisabled: { type: Boolean, default: false },
    eventExecutionInProgress: { type: Boolean, default: false },
    eventExecutionTimeLeft: { type: Number, default: 0 },
    showGoalsSkeleton: { type: Boolean, default: false },
    showRoutineSkeleton: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    lastCompleteItemGoalRef: { type: [String, Number], default: '' },
  },
  computed: {
    weekGoals() {
      return filterByTaskPeriod(this.goals, this.task && this.task.id, 'week');
    },
    monthGoals() {
      return filterByTaskPeriod(this.goals, this.task && this.task.id, 'month');
    },
    hasWeekGoal() { return this.weekGoals.length > 0; },
    hasMonthGoal() { return this.monthGoals.length > 0; },
    filteredPeriodGoals() {
      return filterByTaskPeriod(this.goals, this.task && this.task.id, this.goalPeriod);
    },
  },
  methods: {
    onGoalPeriodInput(period) {
      this.$emit('update:goalPeriod', period);
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
.current-task {
  overflow: hidden;
}
.current-task .active .v-list__tile--avatar:hover {
  background-color: #fff;
}
.current-task .concentrated-view .active {
  background-color: #fff;
}
.current-task .concentrated-view .active .v-list__tile--avatar,
.current-task .concentrated-view .v-list__tile--avatar {
  transition: 0.35s;
}
.current-task .concentrated-view .active .v-list__tile--avatar {
  height: 300px;
}
.current-task .concentrated-view .active .circular-task {
  align-self: start;
}
.current-task .concentrated-view .active .v-list__tile__avatar {
  align-self: start;
}
.current-task .concentrated-view .active .v-list__tile .circular-task {
  min-width: 48px;
}
.current-task .concentrated-view .active .v-list__tile {
  padding-top: 16px;
  padding-bottom: 16px;
}
.current-task .concentrated-view .active .v-list__tile__avatar {
  justify-content: start;
}
.current-task .concentrated-view .v-list__tile {
  overflow: hidden;
}
.current-task .concentrated-view .v-list__tile__content {
  min-width: 0;
  overflow: hidden;
}
.current-task .concentrated-view .v-list__tile__title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
.current-task .concentrated-view .active .v-list__tile__content {
  justify-content: start;
}
.current-task .concentrated-view .active .v-list__tile__title {
  font-size: 24px;
  height: 28px;
}
.current-task .concentrated-view .active .goal-list .v-list__tile__title {
  font-size: 10px;
}
.current-task .concentrated-view .v-list__tile__sub-title {
  display: flex;
  justify-content: space-between;
  align-content: center;
  padding: 4px 0;
}
.current-task .concentrated-view .v-list__tile__sub-title .time-text {
  align-self: center;
}
.current-task .concentrated-view .v-list__tile__sub-title .v-item-group {
  border: 1px solid #288bd5;
  border-radius: 20px;
  box-shadow: none;
  overflow: hidden;
}
.current-task .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn {
  height: 24px;
  border-radius: 0;
}
.current-task .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn:first-child {
  border-radius: 20px 0 0 20px;
}
.current-task .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn:last-child {
  border-radius: 0 20px 20px 0;
}
.current-task .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn__content {
  font-size: 10px;
  color: #000;
}
.current-task .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active {
  background-color: #288bd5;
}
.current-task .concentrated-view .v-list__tile__sub-title .v-item-group .v-btn--active .v-btn__content {
  color: #fff;
}
.current-task .concentrated-view .task-goals {
  width: 100%;
  height: 240px;
  overflow-x: hidden;
  overflow-y: auto;
}
.current-task .concentrated-view .task-goals .v-list__tile {
  padding: 4px 0;
  height: 32px;
}
.current-task .concentrated-view .task-goals .v-input--selection-controls__ripple,
.current-task .concentrated-view .task-goals .v-list__tile__action .v-btn,
.current-task .concentrated-view .task-goals .v-list__tile__title {
  height: 24px;
}
.current-task .concentrated-view .task-goals .v-input--selection-controls__ripple {
  top: calc(50% - 19px);
}
.current-task .concentrated-view .task-goals .v-list {
  background: transparent;
}
.current-task .concentrated-view .task-goals .v-list__tile__action {
  min-width: 36px;
}
.current-task .concentrated-view .task-goals
  .v-input--selection-controls:not(.v-input--hide-details)
  .v-input__slot {
  margin-bottom: 3px;
}
.current-task .concentrated-view .task-goals .v-list__tile__title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.current-task .concentrated-view .task-goals .v-chip {
  cursor: pointer;
  font-size: 11px;
  margin: 0 2px 0 0;
}
.current-task .concentrated-view .task-goals .no-goals-text {
  display: block;
  padding: 20px 0 20px 36px;
  color: #777;
}
.current-task .concentrated-view .task-goals .v-alert.v-alert--outline {
  padding: 4px;
  font-size: 11px;
}
.current-task .concentrated-view .task-goals .add-new {
  border-top: 1px solid #ccc;
  padding-top: 8px;
}
.current-task .circular-task .v-avatar {
  margin: 0 auto;
}
.current-task .step-info {
  float: right;
  height: 24px;
  line-height: 0;
}
.current-task .text-white { color: #fff; }

/* Skeleton loading styles scoped to this card */
.current-task .skeleton {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: current-task-loading 1.5s infinite;
}
.current-task .skeleton-circle { border-radius: 50%; }
.current-task .skeleton-text { border-radius: 4px; }
.current-task .skeleton-chip { border-radius: 16px; }
@keyframes current-task-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
