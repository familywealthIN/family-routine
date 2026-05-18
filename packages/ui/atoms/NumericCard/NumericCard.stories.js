import NumericCard from './NumericCard.vue';

export default {
  title: 'Atoms/NumericCard',
  component: NumericCard,
  argTypes: {
    value: {
      control: 'number',
    },
    label: {
      control: 'text',
    },
    color: {
      control: 'color',
    },
    icon: {
      control: 'text',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { NumericCard },
  template: '<NumericCard v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  value: 42,
  label: 'Tasks Completed',
};

export const WithIcon = Template.bind({});
WithIcon.args = {
  value: 15,
  label: 'Goals Achieved',
  icon: 'flag',
  color: '#4CAF50',
};

export const LargeNumber = Template.bind({});
LargeNumber.args = {
  value: 1234,
  label: 'Total Points',
  icon: 'star',
  color: '#FF9800',
};

export const Percentage = Template.bind({});
Percentage.args = {
  value: 85,
  label: 'Completion Rate',
  icon: 'trending_up',
  color: '#2196F3',
};

export const Dashboard = () => ({
  components: { NumericCard },
  template: `
    <v-layout wrap>
      <v-flex xs6 sm3 class="pa-2">
        <NumericCard :value="12" label="Tasks Today" icon="check_circle" color="#4CAF50" />
      </v-flex>
      <v-flex xs6 sm3 class="pa-2">
        <NumericCard :value="5" label="Goals This Week" icon="flag" color="#2196F3" />
      </v-flex>
      <v-flex xs6 sm3 class="pa-2">
        <NumericCard :value="87" label="Completion %" icon="trending_up" color="#FF9800" />
      </v-flex>
      <v-flex xs6 sm3 class="pa-2">
        <NumericCard :value="21" label="Day Streak" icon="whatshot" color="#F44336" />
      </v-flex>
    </v-layout>
  `,
});
