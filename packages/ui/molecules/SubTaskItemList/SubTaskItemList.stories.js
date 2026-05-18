import SubTaskItemList from './SubTaskItemList.vue';

export default {
  title: 'Molecules/SubTaskItemList',
  component: SubTaskItemList,
  argTypes: {
    editable: {
      control: 'boolean',
    },
    showProgress: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SubTaskItemList },
  data() {
    return {
      subtasks: [
        { id: 1, title: 'Research topic', completed: true },
        { id: 2, title: 'Create outline', completed: true },
        { id: 3, title: 'Write first draft', completed: false },
        { id: 4, title: 'Review and edit', completed: false },
        { id: 5, title: 'Final submission', completed: false },
      ],
    };
  },
  template: '<SubTaskItemList v-model="subtasks" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Editable = Template.bind({});
Editable.args = {
  editable: true,
};

export const WithProgress = Template.bind({});
WithProgress.args = {
  showProgress: true,
};

export const EmptyList = () => ({
  components: { SubTaskItemList },
  data() {
    return {
      subtasks: [],
    };
  },
  template: '<SubTaskItemList v-model="subtasks" editable />',
});

export const AllCompleted = () => ({
  components: { SubTaskItemList },
  data() {
    return {
      subtasks: [
        { id: 1, title: 'Task 1', completed: true },
        { id: 2, title: 'Task 2', completed: true },
        { id: 3, title: 'Task 3', completed: true },
      ],
    };
  },
  template: '<SubTaskItemList v-model="subtasks" showProgress />',
});

export const MorningRoutineSubtasks = () => ({
  components: { SubTaskItemList },
  data() {
    return {
      subtasks: [
        { id: 1, title: 'Wake up at 6:00 AM', completed: true },
        { id: 2, title: 'Drink water', completed: true },
        { id: 3, title: '10 min stretching', completed: false },
        { id: 4, title: 'Shower', completed: false },
        { id: 5, title: 'Healthy breakfast', completed: false },
        { id: 6, title: 'Review daily goals', completed: false },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Morning Routine</v-card-title>
      <v-card-text>
        <SubTaskItemList v-model="subtasks" editable showProgress />
      </v-card-text>
    </v-card>
  `,
});
