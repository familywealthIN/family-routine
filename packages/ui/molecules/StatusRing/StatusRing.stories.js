import StatusRing from './StatusRing.vue';

export default {
  title: 'Molecules/StatusRing',
  component: StatusRing,
  argTypes: {
    stage: {
      control: { type: 'select', options: ['waiting', 'running', 'listening', 'firing', 'finished', 'failed', 'stalled'] },
    },
    size: { control: 'number' },
    color: { control: 'color' },
    glyph: { control: 'text' },
    title: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StatusRing },
  template: '<div style="padding:10px"><StatusRing v-bind="$props" /></div>',
});

export const Waiting = Template.bind({});
Waiting.args = { stage: 'waiting', title: 'Waiting for the start time' };

export const Running = Template.bind({});
Running.args = { stage: 'running', title: 'Running' };

export const Listening = Template.bind({});
Listening.args = { stage: 'listening', title: 'Listening for the end event' };

export const Firing = Template.bind({});
Firing.args = { stage: 'firing' };

export const Finished = Template.bind({});
Finished.args = { stage: 'finished', title: 'Finished' };

export const Failed = Template.bind({});
Failed.args = { stage: 'failed', glyph: 'priority_high', title: 'Failed' };

export const AllStages = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { StatusRing },
  template: `
    <div style="display:flex;flex-wrap:wrap;gap:14px;padding:10px;align-items:center;max-width:380px">
      <StatusRing v-for="s in stages" :key="s" :stage="s" :size="size" :title="s" />
    </div>`,
  data: () => ({ stages: ['waiting', 'running', 'listening', 'firing', 'finished', 'failed', 'stalled'] }),
});
AllStages.args = { size: 48 };
