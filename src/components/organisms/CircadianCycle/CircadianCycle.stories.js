// organisms/CircadianCycle/CircadianCycle.stories.js
import CircadianCycle from './CircadianCycle.vue';

export default {
  title: 'Organisms/CircadianCycle',
  component: CircadianCycle,
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
  components: { CircadianCycle },
  data() {
    return {
      routineItems: [
        { startTime: '06:00', endTime: '07:00', name: 'Morning Exercise', color: '#4CAF50' },
        { startTime: '07:00', endTime: '08:00', name: 'Breakfast', color: '#FF9800' },
        { startTime: '09:00', endTime: '12:00', name: 'Work', color: '#2196F3' },
        { startTime: '12:00', endTime: '13:00', name: 'Lunch', color: '#FF9800' },
        { startTime: '13:00', endTime: '17:00', name: 'Work', color: '#2196F3' },
        { startTime: '18:00', endTime: '19:00', name: 'Dinner', color: '#FF9800' },
        { startTime: '22:00', endTime: '06:00', name: 'Sleep', color: '#9C27B0' },
      ],
    };
  },
  template: '<CircadianCycle :routineItems="routineItems" :size="size" />',
});

export const Default = Template.bind({});
Default.args = {
  size: 400,
};

export const Small = Template.bind({});
Small.args = {
  size: 250,
};

export const Large = Template.bind({});
Large.args = {
  size: 600,
};
