import RadarCard from './RadarCard.vue';

export default {
  title: 'Atoms/RadarCard',
  component: RadarCard,
  argTypes: {
    data: {
      control: 'object',
    },
    title: {
      control: 'text',
    },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RadarCard },
  template: '<RadarCard v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  title: 'Life Balance',
  data: {
    labels: ['Health', 'Career', 'Family', 'Finance', 'Personal', 'Social'],
    values: [75, 60, 85, 70, 55, 65],
  },
};

export const GoalProgress = Template.bind({});
GoalProgress.args = {
  title: 'Goal Categories',
  data: {
    labels: ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Lifetime'],
    values: [90, 75, 60, 40, 25],
  },
};

export const RoutineAreas = Template.bind({});
RoutineAreas.args = {
  title: 'Routine Areas',
  data: {
    labels: ['Morning', 'Work', 'Exercise', 'Evening', 'Sleep'],
    values: [80, 65, 45, 70, 85],
  },
};

export const Comparison = () => ({
  components: { RadarCard },
  template: `
    <v-layout wrap>
      <v-flex xs12 md6 class="pa-2">
        <RadarCard 
          title="This Week" 
          :data="{
            labels: ['Health', 'Career', 'Family', 'Finance', 'Personal'],
            values: [75, 60, 85, 70, 55]
          }" 
        />
      </v-flex>
      <v-flex xs12 md6 class="pa-2">
        <RadarCard 
          title="Last Week" 
          :data="{
            labels: ['Health', 'Career', 'Family', 'Finance', 'Personal'],
            values: [65, 55, 80, 65, 60]
          }" 
        />
      </v-flex>
    </v-layout>
  `,
});
