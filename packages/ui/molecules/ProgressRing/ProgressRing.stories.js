import ProgressRing from './ProgressRing.vue';

export default {
  title: 'Molecules/ProgressRing',
  component: ProgressRing,
  argTypes: {
    size: { control: 'number' },
    viewBox: { control: 'number' },
    r: { control: 'number' },
    stroke: { control: 'number' },
    value: { control: { type: 'range', min: 0, max: 140 } },
    color: { control: 'color' },
    current: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { ProgressRing },
  template: `
    <div style="padding:8px">
      <ProgressRing v-bind="$props"><span style="font:700 14px Roboto,sans-serif;color:rgba(0,0,0,.87)">{{ Math.round(Math.min(100, value)) }}%</span></ProgressRing>
    </div>`,
});

export const Default = Template.bind({});
Default.args = { size: 64, r: 28, stroke: 6, value: 60 };

export const Empty = Template.bind({});
Empty.args = { size: 64, r: 28, stroke: 6, value: 0 };

export const Current = Template.bind({});
Current.args = { size: 64, r: 28, stroke: 6, value: 35, current: true };

export const Done = Template.bind({});
Done.args = { size: 64, r: 28, stroke: 6, value: 100 };

export const OverAchieved = Template.bind({});
OverAchieved.args = { size: 64, r: 28, stroke: 6, value: 140 };
