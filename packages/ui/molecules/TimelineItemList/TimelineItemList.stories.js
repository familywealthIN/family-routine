import TimelineItemList from './TimelineItemList.vue';

export default {
  title: 'Molecules/TimelineItemList',
  component: TimelineItemList,
};

const sampleGoal = {
  id: '1',
  period: 'week',
  date: '2025-W51',
  goalItems: [
    {
      id: 'gi1', body: 'Complete project documentation', progress: 60, isComplete: false,
    },
    {
      id: 'gi2', body: 'Review pull requests', progress: 100, isComplete: true,
    },
    {
      id: 'gi3', body: 'Write unit tests', progress: 20, isComplete: false,
    },
  ],
};

export const Default = () => ({
  components: { TimelineItemList },
  data() {
    return {
      goal: sampleGoal,
      newGoalItem: { body: '' },
    };
  },
  template: '<TimelineItemList :goal="goal" :newGoalItem="newGoalItem" />',
});

export const EditMode = () => ({
  components: { TimelineItemList },
  data() {
    return {
      goal: sampleGoal,
      newGoalItem: { body: '' },
    };
  },
  template: '<TimelineItemList :goal="goal" :newGoalItem="newGoalItem" :editMode="true" />',
});

export const DayGoal = () => ({
  components: { TimelineItemList },
  data() {
    return {
      goal: {
        id: '2',
        period: 'day',
        date: '2025-12-22',
        goalItems: [
          { id: 'gi4', body: 'Morning workout', progress: null, isComplete: true },
          { id: 'gi5', body: 'Read for 30 minutes', progress: null, isComplete: false },
          { id: 'gi6', body: 'Meditate', progress: null, isComplete: false },
        ],
      },
      newGoalItem: { body: '' },
    };
  },
  template: '<TimelineItemList :goal="goal" :newGoalItem="newGoalItem" />',
});

export const EmptyGoal = () => ({
  components: { TimelineItemList },
  data() {
    return {
      goal: { id: '3', period: 'day', date: '2025-12-22', goalItems: [] },
      newGoalItem: { body: '' },
    };
  },
  template: '<TimelineItemList :goal="goal" :newGoalItem="newGoalItem" />',
});

