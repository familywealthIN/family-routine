import TaskTile from './TaskTile.vue';

export default {
  title: 'Organisms/TaskTile',
  component: TaskTile,
  decorators: [
    () => ({
      template: '<v-list class="concentrated-view elevation-0"><story /></v-list>',
    }),
  ],
  argTypes: {
    active: { control: 'boolean' },
    disabled: { control: 'boolean' },
    showSubtitle: { control: 'boolean' },
    showActionCount: { control: 'boolean' },
    percentage: { control: { type: 'range', min: 0, max: 100 } },
  },
};

const mockTask = {
  id: '1',
  name: 'Morning Routine',
  time: '07:00',
  description: 'Start the day right',
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { TaskTile },
  template: `
    <TaskTile
      v-bind="$props"
      @click="handleClick"
      @action-click="handleActionClick"
    />
  `,
  methods: {
    handleClick(task) {
      console.log('Task clicked:', task);
    },
    handleActionClick(task) {
      console.log('Action clicked:', task);
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  task: mockTask,
  percentage: 50,
  completedCount: 3,
  totalCount: 6,
  displayTime: '07:00 AM',
  buttonIcon: 'mdi-check',
  buttonColor: 'success',
};

export const Active = Template.bind({});
Active.args = {
  task: mockTask,
  active: true,
  percentage: 75,
  completedCount: 5,
  totalCount: 6,
  displayTime: '07:00 AM',
  buttonIcon: 'mdi-check',
  buttonColor: 'success',
};

export const NotStarted = Template.bind({});
NotStarted.args = {
  task: mockTask,
  percentage: 0,
  completedCount: 0,
  totalCount: 6,
  displayTime: '07:00 AM',
  buttonIcon: 'mdi-play',
  buttonColor: 'primary',
};

export const Completed = Template.bind({});
Completed.args = {
  task: { ...mockTask, name: 'Completed Task' },
  percentage: 100,
  completedCount: 6,
  totalCount: 6,
  displayTime: '07:00 AM',
  buttonIcon: 'mdi-check-all',
  buttonColor: 'success',
};

export const Disabled = Template.bind({});
Disabled.args = {
  task: mockTask,
  percentage: 0,
  completedCount: 0,
  totalCount: 6,
  displayTime: '07:00 AM',
  buttonIcon: 'mdi-clock-outline',
  buttonColor: 'grey',
  disabled: true,
};

export const WithActionCount = Template.bind({});
WithActionCount.args = {
  task: mockTask,
  percentage: 33,
  completedCount: 2,
  totalCount: 6,
  displayTime: '07:00 AM',
  buttonIcon: 'mdi-check',
  buttonColor: 'warning',
  showActionCount: true,
  showSubtitle: false,
};

export const MultipleItems = () => ({
  components: { TaskTile },
  data() {
    return {
      tasks: [
        {
          id: '1', name: 'Morning Routine', time: '07:00', percentage: 100, completed: 4, total: 4,
        },
        {
          id: '2', name: 'Work Focus', time: '09:00', percentage: 50, completed: 2, total: 4,
        },
        {
          id: '3', name: 'Lunch Break', time: '12:00', percentage: 0, completed: 0, total: 2,
        },
        {
          id: '4', name: 'Evening Routine', time: '18:00', percentage: 25, completed: 1, total: 4,
        },
      ],
      selectedId: '2',
    };
  },
  template: `
    <div>
      <TaskTile
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :active="task.id === selectedId"
        :percentage="task.percentage"
        :completedCount="task.completed"
        :totalCount="task.total"
        :displayTime="task.time"
        :buttonIcon="task.percentage === 100 ? 'mdi-check-all' : 'mdi-check'"
        :buttonColor="task.percentage === 100 ? 'success' : 'warning'"
        :showActionCount="task.id !== selectedId"
        :showSubtitle="task.id === selectedId"
        @click="selectedId = task.id"
      />
    </div>
  `,
});
