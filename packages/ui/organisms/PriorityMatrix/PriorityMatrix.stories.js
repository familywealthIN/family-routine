import PriorityMatrix from './PriorityMatrix.vue';

export default {
  title: 'Organisms/PriorityMatrix',
  component: PriorityMatrix,
  argTypes: {
    editable: {
      control: 'boolean',
    },
    showLabels: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityMatrix },
  data() {
    return {
      tasks: {
        urgentImportant: [
          { id: 1, title: 'Client deadline tomorrow', completed: false },
          { id: 2, title: 'Fix critical bug', completed: false },
        ],
        notUrgentImportant: [
          { id: 3, title: 'Learn new framework', completed: false },
          { id: 4, title: 'Exercise routine', completed: true },
          { id: 5, title: 'Career planning', completed: false },
        ],
        urgentNotImportant: [
          { id: 6, title: 'Reply to emails', completed: false },
          { id: 7, title: 'Attend optional meeting', completed: false },
        ],
        notUrgentNotImportant: [
          { id: 8, title: 'Organize desk', completed: false },
          { id: 9, title: 'Browse social media', completed: false },
        ],
      },
    };
  },
  template: '<PriorityMatrix :tasks="tasks" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const Editable = Template.bind({});
Editable.args = {
  editable: true,
};

export const WithLabels = Template.bind({});
WithLabels.args = {
  showLabels: true,
};

export const EmptyMatrix = () => ({
  components: { PriorityMatrix },
  data() {
    return {
      tasks: {
        urgentImportant: [],
        notUrgentImportant: [],
        urgentNotImportant: [],
        notUrgentNotImportant: [],
      },
    };
  },
  template: '<PriorityMatrix :tasks="tasks" editable showLabels />',
});

export const WorkPriorities = () => ({
  components: { PriorityMatrix },
  data() {
    return {
      tasks: {
        urgentImportant: [
          { id: 1, title: 'Ship feature by EOD', completed: false },
          { id: 2, title: 'Resolve production issue', completed: false },
          { id: 3, title: 'Prepare board presentation', completed: false },
        ],
        notUrgentImportant: [
          { id: 4, title: 'Refactor legacy code', completed: false },
          { id: 5, title: 'Write documentation', completed: false },
          { id: 6, title: 'Mentor junior developer', completed: true },
          { id: 7, title: 'Strategic planning', completed: false },
        ],
        urgentNotImportant: [
          { id: 8, title: 'Reply to Slack messages', completed: false },
          { id: 9, title: 'Attend status meeting', completed: true },
        ],
        notUrgentNotImportant: [
          { id: 10, title: 'Clean up old branches', completed: false },
          { id: 11, title: 'Update profile picture', completed: false },
        ],
      },
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>
        <v-icon left>work</v-icon>
        Work Priority Matrix
      </v-card-title>
      <v-card-text>
        <PriorityMatrix :tasks="tasks" editable showLabels />
      </v-card-text>
    </v-card>
  `,
});

export const PersonalPriorities = () => ({
  components: { PriorityMatrix },
  data() {
    return {
      tasks: {
        urgentImportant: [
          { id: 1, title: 'Doctor appointment', completed: false },
          { id: 2, title: 'Pay bills', completed: false },
        ],
        notUrgentImportant: [
          { id: 3, title: 'Exercise', completed: false },
          { id: 4, title: 'Quality time with family', completed: false },
          { id: 5, title: 'Learning new skill', completed: false },
          { id: 6, title: 'Savings plan', completed: true },
        ],
        urgentNotImportant: [
          { id: 7, title: 'Return phone calls', completed: false },
          { id: 8, title: 'Minor home repairs', completed: false },
        ],
        notUrgentNotImportant: [
          { id: 9, title: 'Watch TV series', completed: false },
          { id: 10, title: 'Scroll social media', completed: false },
        ],
      },
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>
        <v-icon left>person</v-icon>
        Personal Priority Matrix
      </v-card-title>
      <v-card-text>
        <PriorityMatrix :tasks="tasks" showLabels />
      </v-card-text>
    </v-card>
  `,
});
