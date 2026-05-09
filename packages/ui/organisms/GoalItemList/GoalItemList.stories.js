import GoalItemList from './GoalItemList.vue';

const mockGoalItems = [
  {
    id: '1',
    body: 'Complete morning workout routine',
    isComplete: true,
    status: 'done',
    tags: ['health', 'fitness'],
  },
  {
    id: '2',
    body: 'Review and update project documentation',
    isComplete: false,
    status: 'progress',
    tags: ['work'],
  },
  {
    id: '3',
    body: 'Read chapter 5 of current book',
    isComplete: false,
    status: 'todo',
    tags: ['personal', 'learning'],
  },
  {
    id: '4',
    body: 'Prepare presentation slides',
    isComplete: false,
    status: 'todo',
    tags: ['work'],
  },
];

export default {
  title: 'Organisms/GoalItemList',
  component: GoalItemList,
};

export const Default = () => ({
  components: { GoalItemList },
  data() {
    return {
      goal: {
        id: 'goal-day-1',
        period: 'day',
        date: '22-12-2025',
        goalItems: mockGoalItems,
      },
    };
  },
  template: '<GoalItemList :goal="goal" />',
});

export const Editable = () => ({
  components: { GoalItemList },
  data() {
    return {
      goal: {
        id: 'goal-day-2',
        period: 'day',
        date: '22-12-2025',
        goalItems: mockGoalItems,
      },
    };
  },
  template: '<GoalItemList :goal="goal" editMode />',
});

export const EmptyState = () => ({
  components: { GoalItemList },
  data() {
    return {
      goal: {
        id: 'goal-empty',
        period: 'day',
        date: '22-12-2025',
        goalItems: [],
      },
    };
  },
  template: '<GoalItemList :goal="goal" />',
});

export const WeeklyGoalItems = () => ({
  components: { GoalItemList },
  data() {
    return {
      goal: {
        id: 'goal-week-1',
        period: 'week',
        date: '27-12-2025',
        goalItems: [
          { id: '1', body: 'Complete API integration', isComplete: true, status: 'done', tags: ['work', 'development'] },
          { id: '2', body: 'Write unit tests for new features', isComplete: false, status: 'progress', tags: ['work', 'testing'] },
          { id: '3', body: 'Exercise 3 times this week', isComplete: false, status: 'progress', tags: ['health'] },
          { id: '4', body: 'Family movie night', isComplete: false, status: 'todo', tags: ['family'] },
          { id: '5', body: 'Review monthly budget', isComplete: false, status: 'todo', tags: ['finance'] },
        ],
      },
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>This Week's Goals</v-card-title>
      <GoalItemList :goal="goal" editMode />
    </v-card>
  `,
});

export const WithMilestones = () => ({
  components: { GoalItemList },
  data() {
    return {
      goal: {
        id: 'goal-month-1',
        period: 'month',
        date: '31-12-2025',
        goalItems: [
          { id: '1', body: 'Learn React basics', isComplete: true, status: 'done', tags: ['learning'], isMilestone: true },
          { id: '2', body: 'Build first React app', isComplete: false, status: 'progress', tags: ['learning', 'project'], isMilestone: true },
          { id: '3', body: 'Learn React hooks', isComplete: false, status: 'todo', tags: ['learning'], isMilestone: false },
        ],
      },
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Learning Path: React</v-card-title>
      <GoalItemList :goal="goal" />
    </v-card>
  `,
});
