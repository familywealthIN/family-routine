import SearchResultCard from './SearchResultCard.vue';

export default {
  title: 'Atoms/SearchResultCard',
  component: SearchResultCard,
  argTypes: {
    result: { control: 'object' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SearchResultCard },
  template: '<div style="max-width: 420px; background: #fff;"><SearchResultCard v-bind="$props" @click="onClick" /></div>',
  methods: {
    onClick() {
      console.log('search result clicked');
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  result: {
    body: 'Ship the pricing page',
    contribution: '## Plan\n- Draft the **three tiers**\n- Review the [copy](https://example.com) with the team',
    routine: { name: 'Deep Work' },
    period: 'week',
    date: '25-10-2026',
    status: 'pending',
  },
};

export const Done = Template.bind({});
Done.args = {
  result: {
    body: 'Run 5 km',
    contribution: 'Finished in 31 minutes. Felt strong after the first kilometre.',
    routine: { name: 'Jogging' },
    period: 'day',
    date: '24-10-2026',
    status: 'done',
    isComplete: true,
  },
};

export const NoRoutineNoNotes = Template.bind({});
NoRoutineNoNotes.args = {
  result: {
    body: 'Email two beta users',
    period: 'day',
    date: '25-10-2026',
  },
};

export const LongContribution = Template.bind({});
LongContribution.args = {
  result: {
    body: 'Write the weekly review',
    contribution: 'This week the focus was on shipping the pricing page and closing the beta feedback loop. '
      + 'Three beta users replied, two asked for a calendar view, and one found the streak counter confusing. '
      + 'Next week: simplify the streak copy and schedule the calendar work.',
    routine: { name: 'Start office work' },
    period: 'week',
    date: '19-10-2026',
    status: 'pending',
  },
};
