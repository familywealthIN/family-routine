// molecules/AiSearchInput/AiSearchInput.stories.js
import AiSearchInput from './AiSearchInput.vue';

export default {
  title: 'Molecules/AiSearchInput',
  component: AiSearchInput,
  argTypes: {
    value: {
      control: 'text',
    },
    placeholder: {
      control: 'text',
    },
    loading: {
      control: 'boolean',
    },
    mode: {
      control: { type: 'select' },
      options: ['task', 'goals'],
    },
    showHint: {
      control: 'boolean',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AiSearchInput },
  data() {
    return {
      searchValue: args.value || '',
    };
  },
  template: `
    <AiSearchInput 
      v-model="searchValue"
      v-bind="$props"
      @submit="handleSubmit"
    />
  `,
  methods: {
    handleSubmit() {
      console.log('Submit:', this.searchValue);
      alert(`Submitted: ${this.searchValue}`);
    },
  },
});

export const TaskMode = Template.bind({});
TaskMode.args = {
  value: '',
  placeholder: 'Try: "Exercise for 30 mins"',
  loading: false,
  mode: 'task',
  showHint: true,
};

export const GoalsMode = Template.bind({});
GoalsMode.args = {
  value: '',
  placeholder: 'Try: "Learn Python this month"',
  loading: false,
  mode: 'goals',
  showHint: true,
};

export const WithValue = Template.bind({});
WithValue.args = {
  value: 'Exercise for 30 minutes every morning',
  placeholder: 'Describe what you want to accomplish',
  loading: false,
  mode: 'task',
  showHint: false,
};

export const Loading = Template.bind({});
Loading.args = {
  value: 'Build a workout routine for this week',
  placeholder: 'Describe what you want to accomplish',
  loading: true,
  mode: 'goals',
  showHint: true,
};

export const NoHint = Template.bind({});
NoHint.args = {
  value: '',
  placeholder: 'Describe your goal',
  loading: false,
  mode: 'task',
  showHint: false,
};

export const LongQuery = Template.bind({});
LongQuery.args = {
  value: 'I want to create a comprehensive 3-month plan to learn Python programming, including data structures, '
    + 'algorithms, web development with Flask, and building at least 3 portfolio projects',
  placeholder: 'Describe what you want to accomplish',
  loading: false,
  mode: 'goals',
  showHint: true,
};
