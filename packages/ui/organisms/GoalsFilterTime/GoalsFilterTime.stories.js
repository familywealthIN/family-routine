// organisms/GoalsFilterTime/GoalsFilterTime.stories.js
import GoalsFilterTime from './GoalsFilterTime.vue';

export default {
  title: 'Organisms/GoalsFilterTime',
  component: GoalsFilterTime,
  parameters: {
    layout: 'padded',
  },
};

export const DayView = () => ({
  components: { GoalsFilterTime },
  data() {
    return {
      goals: [
        {
          id: '1',
          body: 'Daily Goals',
          period: 'day',
          date: '22-12-2025',
          status: 'progress',
          goalItems: [
            { id: '1-1', body: 'Complete morning routine', isComplete: false },
            { id: '1-2', body: 'Exercise for 30 minutes', isComplete: true },
          ],
        },
        {
          id: '2',
          body: 'Work Tasks',
          period: 'day',
          date: '23-12-2025',
          status: 'todo',
          goalItems: [
            { id: '2-1', body: 'Review goals', isComplete: false },
            { id: '2-2', body: 'Finish documentation', isComplete: false },
          ],
        },
      ],
      periodFilter: 'day',
    };
  },
  methods: {
    updateNewGoalItem(item) {
      console.log('Update goal:', item);
    },
  },
  template: '<GoalsFilterTime :goals="goals" :periodFilter="periodFilter" :updateNewGoalItem="updateNewGoalItem" />',
});

export const WeekView = () => ({
  components: { GoalsFilterTime },
  data() {
    return {
      goals: [
        {
          id: '1',
          body: 'Weekly Goals',
          period: 'week',
          date: '22-12-2025',
          status: 'progress',
          goalItems: [
            { id: '1-1', body: 'Complete project milestone', isComplete: true },
            { id: '1-2', body: 'Code review sessions', isComplete: false },
          ],
        },
        {
          id: '2',
          body: 'Personal Development',
          period: 'week',
          date: '22-12-2025',
          status: 'todo',
          goalItems: [
            { id: '2-1', body: 'Prepare presentation', isComplete: false },
            { id: '2-2', body: 'Learn new framework', isComplete: false },
          ],
        },
      ],
      periodFilter: 'week',
    };
  },
  methods: {
    updateNewGoalItem(item) {
      console.log('Update goal:', item);
    },
  },
  template: '<GoalsFilterTime :goals="goals" :periodFilter="periodFilter" :updateNewGoalItem="updateNewGoalItem" />',
});

export const EmptyState = () => ({
  components: { GoalsFilterTime },
  data() {
    return {
      goals: [],
      periodFilter: 'week',
    };
  },
  methods: {
    updateNewGoalItem(item) {
      console.log('Update goal:', item);
    },
  },
  template: '<GoalsFilterTime :goals="goals" :periodFilter="periodFilter" :updateNewGoalItem="updateNewGoalItem" />',
});
