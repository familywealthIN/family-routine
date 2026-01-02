import AiSearchModal from './AiSearchModal.vue';

export default {
  title: 'Organisms/AiSearchModal',
  component: AiSearchModal,
  parameters: {
    layout: 'fullscreen',
  },
};

// Mock current task data
const mockCurrentTask = {
  id: 'task-123',
  body: 'Morning Exercise',
  time: '07:00',
  tags: ['health', 'morning'],
};

// Mock routines
const mockRoutines = [
  { taskId: 'task-123', name: 'Morning Exercise', time: '07:00', tags: ['health', 'morning'] },
  { taskId: 'task-456', name: 'Review emails', time: '09:00', tags: ['work', 'communication'] },
  { taskId: 'task-789', name: 'Lunch break', time: '12:00', tags: ['break', 'food'] },
];

// Mock goal items
const mockGoalItems = [
  {
    id: 'goal-123',
    body: 'Build healthy habits',
    period: 'week',
    date: '2025-W51',
    taskRef: 'task-123',
    tags: ['health'],
    isComplete: false,
  },
  {
    id: 'goal-456',
    body: 'Improve productivity',
    period: 'week',
    date: '2025-W51',
    taskRef: 'task-456',
    tags: ['work'],
    isComplete: false,
  },
];

// Template
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AiSearchModal },
  data() {
    return {
      isOpen: args.value,
    };
  },
  // Mock global data
  beforeCreate() {
    if (!this.$root.$data) {
      this.$root.$data = {};
    }
    this.$root.$data.email = 'user@example.com';

    // Mock currentTask plugin data
    this.$currentTaskData = mockCurrentTask;
    this.$currentTaskList = mockRoutines.map(r => ({
      id: r.taskId,
      body: r.name,
      time: r.time,
      tags: r.tags,
    }));
  },
  template: `
    <div>
      <v-btn @click="isOpen = true" color="primary">Open AI Search</v-btn>
      <AiSearchModal v-model="isOpen" v-bind="$props" />
    </div>
  `,
});

export const TaskMode = Template.bind({});
TaskMode.args = {
  value: true,
};
TaskMode.parameters = {
  docs: {
    description: {
      story: 'Task creation mode - triggered by simple action queries without time keywords.',
    },
  },
};

export const GoalsMode = Template.bind({});
GoalsMode.args = {
  value: true,
};
GoalsMode.parameters = {
  docs: {
    description: {
      story: 'Goals planning mode - triggered by queries with time keywords (week, month, year) or planning keywords.',
    },
  },
};

export const Closed = Template.bind({});
Closed.args = {
  value: false,
};
Closed.parameters = {
  docs: {
    description: {
      story: 'Modal closed state - click button to open.',
    },
  },
};

export const WithCurrentTask = Template.bind({});
WithCurrentTask.args = {
  value: true,
};
WithCurrentTask.parameters = {
  docs: {
    description: {
      story: 'Modal with current task context - auto-selects routine task in both modes.',
    },
  },
};

export const ModeSwitch = () => ({
  components: { AiSearchModal },
  data() {
    return {
      isOpen: true,
      queries: [
        'Call dentist tomorrow',
        'Plan healthy eating this week',
        'Buy groceries',
        'Learn Python this month',
      ],
      currentQueryIndex: 0,
    };
  },
  beforeCreate() {
    if (!this.$root.$data) {
      this.$root.$data = {};
    }
    this.$root.$data.email = 'user@example.com';
    this.$currentTaskData = mockCurrentTask;
    this.$currentTaskList = mockRoutines.map(r => ({
      id: r.taskId,
      body: r.name,
      time: r.time,
      tags: r.tags,
    }));
  },
  computed: {
    currentQuery() {
      return this.queries[this.currentQueryIndex];
    },
  },
  template: `
    <div>
      <div class="mb-4">
        <v-btn 
          v-for="(query, index) in queries" 
          :key="index"
          @click="currentQueryIndex = index; isOpen = true"
          :color="currentQueryIndex === index ? 'primary' : 'default'"
          class="mr-2 mb-2"
          small
        >
          {{ query }}
        </v-btn>
      </div>
      <AiSearchModal v-model="isOpen" />
      <div class="mt-4 pa-4" style="background: #f5f5f5; border-radius: 4px;">
        <strong>Current Query:</strong> {{ currentQuery }}<br>
        <strong>Mode:</strong> {{ currentQuery.match(/\b(week|month|year|plan)\b/i) ? 'Goals Mode' : 'Task Mode' }}
      </div>
    </div>
  `,
});
ModeSwitch.parameters = {
  docs: {
    description: {
      story: 'Interactive demo showing intelligent mode switching based on query keywords.',
    },
  },
};
