import PriorityQuadrant from './PriorityQuadrant.vue';

export default {
  title: 'Molecules/PriorityQuadrant',
  component: PriorityQuadrant,
  argTypes: {
    quadrant: {
      control: { type: 'select' },
      options: ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'],
    },
    color: {
      control: 'color',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { PriorityQuadrant },
  data() {
    return {
      tasks: [
        { id: 1, title: 'Task 1', completed: false },
        { id: 2, title: 'Task 2', completed: true },
        { id: 3, title: 'Task 3', completed: false },
      ],
    };
  },
  template: '<PriorityQuadrant :tasks="tasks" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  quadrant: 'urgent-important',
};

export const UrgentImportant = Template.bind({});
UrgentImportant.args = {
  quadrant: 'urgent-important',
  color: '#f44336',
};

export const NotUrgentImportant = Template.bind({});
NotUrgentImportant.args = {
  quadrant: 'not-urgent-important',
  color: '#2196f3',
};

export const UrgentNotImportant = Template.bind({});
UrgentNotImportant.args = {
  quadrant: 'urgent-not-important',
  color: '#ff9800',
};

export const NotUrgentNotImportant = Template.bind({});
NotUrgentNotImportant.args = {
  quadrant: 'not-urgent-not-important',
  color: '#9e9e9e',
};

export const WithTasks = () => ({
  components: { PriorityQuadrant },
  data() {
    return {
      urgentImportant: [
        { id: 1, title: 'Client deadline tomorrow', completed: false },
        { id: 2, title: 'Emergency bug fix', completed: false },
      ],
      notUrgentImportant: [
        { id: 3, title: 'Learn new framework', completed: false },
        { id: 4, title: 'Exercise routine', completed: true },
        { id: 5, title: 'Career planning', completed: false },
      ],
    };
  },
  template: `
    <v-layout wrap>
      <v-flex xs12 sm6 class="pa-2">
        <PriorityQuadrant 
          quadrant="urgent-important" 
          :tasks="urgentImportant"
          color="#f44336"
        />
      </v-flex>
      <v-flex xs12 sm6 class="pa-2">
        <PriorityQuadrant 
          quadrant="not-urgent-important" 
          :tasks="notUrgentImportant"
          color="#2196f3"
        />
      </v-flex>
    </v-layout>
  `,
});
