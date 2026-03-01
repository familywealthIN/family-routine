import TableCard from './TableCard.vue';

export default {
  title: 'Molecules/TableCard',
  component: TableCard,
  argTypes: {
    title: {
      control: 'text',
    },
    sortable: {
      control: 'boolean',
    },
    searchable: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TableCard },
  data() {
    return {
      headers: [
        { text: 'Task', value: 'task' },
        { text: 'Status', value: 'status' },
        { text: 'Due Date', value: 'dueDate' },
        { text: 'Priority', value: 'priority' },
      ],
      items: [
        {
          task: 'Complete project report', status: 'In Progress', dueDate: '2025-01-15', priority: 'High',
        },
        {
          task: 'Review team goals', status: 'Pending', dueDate: '2025-01-18', priority: 'Medium',
        },
        {
          task: 'Update documentation', status: 'Completed', dueDate: '2025-01-10', priority: 'Low',
        },
        {
          task: 'Prepare presentation', status: 'In Progress', dueDate: '2025-01-20', priority: 'High',
        },
      ],
    };
  },
  template: '<TableCard :headers="headers" :items="items" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  title: 'Tasks Overview',
};

export const Sortable = Template.bind({});
Sortable.args = {
  title: 'Tasks Overview',
  sortable: true,
};

export const Searchable = Template.bind({});
Searchable.args = {
  title: 'Tasks Overview',
  searchable: true,
};

export const GoalsTable = () => ({
  components: { TableCard },
  data() {
    return {
      headers: [
        { text: 'Goal', value: 'goal' },
        { text: 'Category', value: 'category' },
        { text: 'Progress', value: 'progress' },
        { text: 'Deadline', value: 'deadline' },
      ],
      items: [
        {
          goal: 'Learn Spanish', category: 'Personal', progress: '45%', deadline: '2025-06-01',
        },
        {
          goal: 'Run marathon', category: 'Health', progress: '30%', deadline: '2025-09-01',
        },
        {
          goal: 'Save $10,000', category: 'Finance', progress: '60%', deadline: '2025-12-31',
        },
        {
          goal: 'Read 24 books', category: 'Personal', progress: '8%', deadline: '2025-12-31',
        },
      ],
    };
  },
  template: '<TableCard title="Yearly Goals" :headers="headers" :items="items" sortable searchable />',
});

export const FamilyMembersTable = () => ({
  components: { TableCard },
  data() {
    return {
      headers: [
        { text: 'Member', value: 'name' },
        { text: 'Tasks Today', value: 'tasksToday' },
        { text: 'Completed', value: 'completed' },
        { text: 'Points', value: 'points' },
      ],
      items: [
        {
          name: 'Dad', tasksToday: 8, completed: 6, points: 120,
        },
        {
          name: 'Mom', tasksToday: 10, completed: 9, points: 180,
        },
        {
          name: 'Alex', tasksToday: 5, completed: 5, points: 100,
        },
        {
          name: 'Sam', tasksToday: 6, completed: 4, points: 80,
        },
      ],
    };
  },
  template: '<TableCard title="Family Progress Today" :headers="headers" :items="items" sortable />',
});
