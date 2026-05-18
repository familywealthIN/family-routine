// molecules/RadarChart/RadarChart.stories.js
import RadarChart from './RadarChart.vue';

export default {
  title: 'Molecules/RadarChart',
  component: RadarChart,
  argTypes: {
    size: {
      control: {
        type: 'number', min: 100, max: 600, step: 50,
      },
    },
  },
  parameters: {
    layout: 'centered',
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RadarChart },
  template: '<RadarChart v-bind="$props" />',
});

export const Default = Template.bind({});
Default.args = {
  size: 300,
  stats: [
    { name: 'Strength', value: 80 },
    { name: 'Speed', value: 65 },
    { name: 'Endurance', value: 90 },
    { name: 'Intelligence', value: 75 },
    { name: 'Luck', value: 50 },
  ],
};

export const Small = Template.bind({});
Small.args = {
  size: 200,
  stats: [
    { name: 'Health', value: 90 },
    { name: 'Energy', value: 70 },
    { name: 'Focus', value: 60 },
  ],
};

export const Large = Template.bind({});
Large.args = {
  size: 500,
  stats: [
    { name: 'Work', value: 85 },
    { name: 'Fitness', value: 70 },
    { name: 'Learning', value: 60 },
    { name: 'Social', value: 55 },
    { name: 'Sleep', value: 75 },
    { name: 'Nutrition', value: 80 },
  ],
};
