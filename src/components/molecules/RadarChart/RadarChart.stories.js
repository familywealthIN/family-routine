// molecules/RadarChart/RadarChart.stories.js
import RadarChart from './RadarChart.vue';

export default {
  title: 'Molecules/RadarChart',
  component: RadarChart,
  argTypes: {
    size: {
      control: { type: 'number', min: 100, max: 600, step: 50 },
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
    { stat: 'Strength', value: 80 },
    { stat: 'Speed', value: 65 },
    { stat: 'Endurance', value: 90 },
    { stat: 'Intelligence', value: 75 },
    { stat: 'Luck', value: 50 },
  ],
};

export const Small = Template.bind({});
Small.args = {
  size: 200,
  stats: [
    { stat: 'Health', value: 90 },
    { stat: 'Energy', value: 70 },
    { stat: 'Focus', value: 60 },
  ],
};

export const Large = Template.bind({});
Large.args = {
  size: 500,
  stats: [
    { stat: 'Work', value: 85 },
    { stat: 'Fitness', value: 70 },
    { stat: 'Learning', value: 60 },
    { stat: 'Social', value: 55 },
    { stat: 'Sleep', value: 75 },
    { stat: 'Nutrition', value: 80 },
  ],
};
