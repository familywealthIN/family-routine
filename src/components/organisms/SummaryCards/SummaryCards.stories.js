import SummaryCards from './SummaryCards.vue';

export default {
  title: 'Organisms/SummaryCards',
  component: SummaryCards,
  argTypes: {
    columns: {
      control: { type: 'number', min: 1, max: 4 },
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SummaryCards },
  data() {
    return {
      cards: [
        {
          title: 'Tasks Today', value: 12, icon: 'check_circle', color: 'success',
        },
        {
          title: 'Goals Active', value: 5, icon: 'flag', color: 'primary',
        },
        {
          title: 'Streak Days', value: 21, icon: 'whatshot', color: 'error',
        },
        {
          title: 'Completion %', value: '87%', icon: 'trending_up', color: 'warning',
        },
      ],
    };
  },
  template: '<SummaryCards :cards="cards" v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {};

export const TwoColumns = Template.bind({});
TwoColumns.args = {
  columns: 2,
};

export const ThreeColumns = Template.bind({});
ThreeColumns.args = {
  columns: 3,
};

export const DashboardOverview = () => ({
  components: { SummaryCards },
  data() {
    return {
      cards: [
        {
          title: 'Morning Tasks', value: '8/10', icon: 'wb_sunny', color: 'amber',
        },
        {
          title: 'Work Tasks', value: '5/8', icon: 'work', color: 'blue',
        },
        {
          title: 'Personal Tasks', value: '3/5', icon: 'person', color: 'purple',
        },
        {
          title: 'Family Tasks', value: '2/3', icon: 'family_restroom', color: 'pink',
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>Today's Progress</v-card-title>
      <v-card-text>
        <SummaryCards :cards="cards" :columns="4" />
      </v-card-text>
    </v-card>
  `,
});

export const WeeklyStats = () => ({
  components: { SummaryCards },
  data() {
    return {
      cards: [
        {
          title: 'Tasks Completed', value: 45, icon: 'done_all', color: 'success',
        },
        {
          title: 'Goals Achieved', value: 3, icon: 'emoji_events', color: 'warning',
        },
        {
          title: 'Hours Focused', value: '32h', icon: 'timer', color: 'info',
        },
        {
          title: 'Points Earned', value: 520, icon: 'star', color: 'error',
        },
      ],
    };
  },
  template: `
    <v-card class="pa-4">
      <v-card-title>This Week's Summary</v-card-title>
      <v-card-text>
        <SummaryCards :cards="cards" :columns="2" />
      </v-card-text>
    </v-card>
  `,
});
