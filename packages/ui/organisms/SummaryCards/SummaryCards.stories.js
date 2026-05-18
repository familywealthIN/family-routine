import SummaryCards from './SummaryCards.vue';

export default {
  title: 'Organisms/SummaryCards',
  component: SummaryCards,
  argTypes: {
    summary: {
      control: 'text',
    },
    loading: {
      control: 'boolean',
    },
    error: {
      control: 'text',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SummaryCards },
  template: '<SummaryCards v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  summary: 'You completed 8 of 10 morning tasks today. Your exercise streak is at 5 days. Focus area: finish project documentation before end of week.',
  loading: false,
  error: '',
};

export const Loading = Template.bind({});
Loading.args = {
  summary: '',
  loading: true,
  error: '',
};

export const WithError = Template.bind({});
WithError.args = {
  summary: '',
  loading: false,
  error: 'Failed to load summary. Check your API key in settings.',
};

export const EmptySummary = Template.bind({});
EmptySummary.args = {
  summary: '',
  loading: false,
  error: '',
};

export const LongSummary = Template.bind({});
LongSummary.args = {
  summary: `This week you made excellent progress across all areas. You completed 45 tasks, achieved 3 major goals, and maintained a 7-day streak. 

Your top performing area is Health with 92% completion rate. Work goals are at 78% — consider revisiting the project documentation task that has been pending for 3 days.

Recommended focus for tomorrow: Complete the morning routine by 8am and review weekly goals before starting work.`,
  loading: false,
  error: '',
};

