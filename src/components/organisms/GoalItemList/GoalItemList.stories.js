import GoalItemList from './GoalItemList.vue';

export default {
  title: 'Organisms/GoalItemList',
  component: GoalItemList,
  argTypes: {
    editable: {
      control: 'boolean',
    },
    showStatus: {
      control: 'boolean',
    },
    compact: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalItemList },
  data() {
    return {
      items: [
        {
          id: 1,
          body: 'Complete morning workout routine',
          status: 'done',
          tags: ['health', 'fitness'],
          period: 'day',
        },
        {
          id: 2,
          body: 'Review and update project documentation',
          status: 'progress',
          tags: ['work'],
          period: 'day',
        },
        {
          id: 3,
          body: 'Read chapter 5 of current book',
          status: 'todo',
          tags: ['personal', 'learning'],
          period: 'day',
        },
        {
          id: 4,
          body: 'Prepare presentation slides',
          status: 'todo',
          tags: ['work'],
          period: 'day',
        },
      ],
    };
  },
  template: '<GoalItemList :items="items" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Editable = Template.bind({});
Editable.args = {
  editable: true,
};

export const WithStatus = Template.bind({});
WithStatus.args = {
  showStatus: true,
};

export const Compact = Template.bind({});
Compact.args = {
  compact: true,
};

export const EmptyState = () => ({
  components: { GoalItemList },
  template: '<GoalItemList :items="[]" />',
});

export const WeeklyGoalItems = () => ({
  components: { GoalItemList },
  data() {
    return {
      items: [
        {
          id: 1, body: 'Complete API integration', status: 'done', tags: ['work', 'development'],
        },
        {
          id: 2, body: 'Write unit tests for new features', status: 'progress', tags: ['work', 'testing'],
        },
        {
          id: 3, body: 'Exercise 3 times this week', status: 'progress', tags: ['health'],
        },
        {
          id: 4, body: 'Family movie night', status: 'todo', tags: ['family'],
        },
        {
          id: 5, body: 'Review monthly budget', status: 'todo', tags: ['finance'],
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>This Week's Goals</v-card-title>
      <GoalItemList :items="items" showStatus editable />
    </v-card>
  `,
});

export const WithMilestones = () => ({
  components: { GoalItemList },
  data() {
    return {
      items: [
        {
          id: 1,
          body: 'Learn React basics',
          status: 'done',
          tags: ['learning'],
          milestones: ['Components', 'State', 'Props'],
        },
        {
          id: 2,
          body: 'Build first React app',
          status: 'progress',
          tags: ['learning', 'project'],
          milestones: ['Setup', 'Components', 'Styling', 'Deploy'],
        },
        {
          id: 3,
          body: 'Learn React hooks',
          status: 'todo',
          tags: ['learning'],
          milestones: ['useState', 'useEffect', 'Custom hooks'],
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Learning Path: React</v-card-title>
      <GoalItemList :items="items" showStatus />
    </v-card>
  `,
});
