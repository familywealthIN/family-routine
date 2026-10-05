import LoadErrorState from './LoadErrorState.vue';

export default {
  title: 'Molecules/LoadErrorState',
  component: LoadErrorState,
  argTypes: {
    message: { control: 'text' },
    hint: { control: 'text' },
    retryable: { control: 'boolean' },
    retrying: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { LoadErrorState },
  template: '<LoadErrorState v-bind="$props" @retry="onRetry" />',
  methods: {
    onRetry() {
      console.log('retry requested');
    },
  },
});

export const Default = Template.bind({});
Default.args = {};

export const Goals = Template.bind({});
Goals.args = {
  message: "We couldn't load your goals.",
};

export const Retrying = Template.bind({});
Retrying.args = {
  message: "We couldn't load your agents.",
  retrying: true,
};

export const WithoutRetry = Template.bind({});
WithoutRetry.args = {
  retryable: false,
};
