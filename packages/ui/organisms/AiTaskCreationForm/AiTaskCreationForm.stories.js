import AiTaskCreationForm from './AiTaskCreationForm.vue';

// The editable result of an AI search: the task the model drafted (title plus
// markdown description), and, when the task hangs off a goal, that goal's
// related-tasks timeline. It renders nothing until `taskData` arrives.
export default {
  title: 'Organisms/AiTaskCreationForm',
  component: AiTaskCreationForm,
  argTypes: {
    taskData: { control: 'object' },
    taskSuccess: { control: 'boolean' },
    saving: { control: 'boolean' },
    loading: { control: 'boolean' },
    selectedGoalRef: { control: 'text' },
    relatedGoalsData: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AiTaskCreationForm },
  template: '<div style="max-width: 560px; background: #fff; padding: 0 16px 16px;"><AiTaskCreationForm v-bind="$props" /></div>',
});

const taskData = {
  title: 'Draft the pricing page',
  description: '- Compare three tiers against two competitors\n- Write the headline and the FAQ\n- Share the draft with Ben by Friday',
};

export const Default = Template.bind({});
Default.args = { taskData };

export const Created = Template.bind({});
Created.args = { taskData, taskSuccess: true };

export const WithGoalTimeline = Template.bind({});
WithGoalTimeline.args = {
  taskData,
  selectedGoalRef: 'm-launch',
  relatedGoalsData: [
    {
      date: '27-10-2026',
      period: 'day',
      goalItems: [
        {
          id: 'g1', body: 'Write the pricing FAQ', goalRef: 'm-launch', isComplete: true,
        },
      ],
    },
    {
      date: '28-10-2026',
      period: 'day',
      goalItems: [
        {
          id: 'g2', body: 'Compare competitor tiers', goalRef: 'm-launch', isComplete: false,
        },
      ],
    },
  ],
};
