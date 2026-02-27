import TasksCompletedCard from './TasksCompletedCard.vue';

export default {
  title: 'Atoms/TasksCompletedCard',
  component: TasksCompletedCard,
  argTypes: {
    completed: {
      control: 'number',
    },
    total: {
      control: 'number',
    },
    date: {
      control: 'text',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TasksCompletedCard },
  template: '<TasksCompletedCard v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  completed: 8,
  total: 12,
};

export const AllCompleted = Template.bind({});
AllCompleted.args = {
  completed: 10,
  total: 10,
};

export const NoneCompleted = Template.bind({});
NoneCompleted.args = {
  completed: 0,
  total: 15,
};

export const PartialProgress = Template.bind({});
PartialProgress.args = {
  completed: 5,
  total: 20,
  date: 'Today',
};

export const WeeklyView = () => ({
  components: { TasksCompletedCard },
  template: `
    <v-layout wrap>
      <v-flex xs12 sm6 md4 class="pa-2" v-for="day in days" :key="day.name">
        <TasksCompletedCard 
          :completed="day.completed" 
          :total="day.total" 
          :date="day.name" 
        />
      </v-flex>
    </v-layout>
  `,
  data() {
    return {
      days: [
        { name: 'Monday', completed: 10, total: 12 },
        { name: 'Tuesday', completed: 8, total: 10 },
        { name: 'Wednesday', completed: 6, total: 8 },
        { name: 'Thursday', completed: 4, total: 10 },
        { name: 'Friday', completed: 9, total: 9 },
        { name: 'Saturday', completed: 3, total: 5 },
      ],
    };
  },
});
