import SearchResults from './SearchResults.vue';

export default {
  title: 'Organisms/SearchResults',
  component: SearchResults,
  argTypes: {
    results: { control: 'object' },
    isLoading: { control: 'boolean' },
    query: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SearchResults },
  template: '<div style="max-width: 420px; padding: 8px; background: #fff;"><SearchResults v-bind="$props" @select-result="onSelect" /></div>',
  methods: {
    onSelect(item) {
      console.log('select-result', item);
    },
  },
});

const results = [
  {
    id: 's1',
    body: 'Ship the pricing page',
    contribution: '## Plan\n- Draft the **three tiers**\n- Review the copy with the team',
    routine: { name: 'Deep Work' },
    period: 'week',
    date: '25-10-2026',
    status: 'pending',
  },
  {
    id: 's2',
    body: 'Email two beta users',
    contribution: 'Sent both emails and asked for a 15 minute call.',
    routine: { name: 'Start office work' },
    period: 'day',
    date: '24-10-2026',
    status: 'done',
    isComplete: true,
  },
  {
    id: 's3',
    body: 'Run 5 km',
    period: 'day',
    date: '23-10-2026',
  },
];

export const Results = Template.bind({});
Results.args = { results, query: 'ship' };

export const NoQuery = Template.bind({});
NoQuery.args = { results: [], query: '' };

export const NoResults = Template.bind({});
NoResults.args = { results: [], query: 'marathon' };

export const Searching = Template.bind({});
Searching.args = { results: [], query: 'ship', isLoading: true };
