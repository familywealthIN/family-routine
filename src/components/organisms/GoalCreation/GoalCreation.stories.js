// organisms/GoalCreation/GoalCreation.stories.js
import GoalCreation from './GoalCreation.vue';

export default {
  title: 'Organisms/GoalCreation',
  component: GoalCreation,
  parameters: {
    layout: 'padded',
  },
};

export const NewDayGoal = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        body: '',
        period: 'day',
        date: '22-12-2025',
        tags: [],
        contribution: '',
        subTasks: [],
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});

export const NewWeekGoal = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        body: '',
        period: 'week',
        date: '2025-W51',
        tags: [],
        contribution: '',
        subTasks: [],
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});

export const EditingGoalWithTags = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        id: '123',
        body: 'Complete project documentation',
        period: 'week',
        date: '2025-W51',
        tags: ['work', 'documentation'],
        contribution: '## Progress\n\n- Completed initial draft\n- Added examples\n- Need to review',
        subTasks: [
          { id: '1', body: 'Write overview', ticked: true },
          { id: '2', body: 'Add code examples', ticked: false },
        ],
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});

export const GoalWithMilestone = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        body: '',
        period: 'month',
        date: '2025-12',
        tags: ['health'],
        contribution: '',
        milestoneId: 'parent-milestone-123',
        subTasks: [],
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});

export const YearGoal = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        body: '',
        period: 'year',
        date: '2025',
        tags: ['career', 'growth'],
        contribution: '',
        subTasks: [],
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});

export const LifetimeGoal = () => ({
  components: { GoalCreation },
  data() {
    return {
      newGoalItem: {
        body: '',
        period: 'lifetime',
        date: '',
        tags: ['life'],
        contribution: '',
        subTasks: [],
      },
    };
  },
  template: '<GoalCreation :newGoalItem="newGoalItem" />',
});
