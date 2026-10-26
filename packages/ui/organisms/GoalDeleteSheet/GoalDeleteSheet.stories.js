import GoalDeleteSheet from './GoalDeleteSheet.vue';

export default {
  title: 'Organisms/GoalDeleteSheet',
  component: GoalDeleteSheet,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    summary: { control: 'text' },
    milestones: { control: 'object' },
    hiddenCount: { control: 'number' },
    confirmText: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalDeleteSheet },
  template: '<GoalDeleteSheet v-bind="$props" @close="onClose" @confirm="onConfirm" />',
  methods: {
    onClose() {
      console.log('delete sheet closed');
    },
    onConfirm() {
      console.log('delete confirmed');
    },
  },
});

export const WithMilestones = Template.bind({});
WithMilestones.args = {
  open: true,
  shell: 'phone',
  summary: 'This deletes “Launch pricing and checkout” and the 3 week goals hanging off it.',
  milestones: [
    { id: 'w1', body: 'Draft the three plan cards' },
    { id: 'w2', body: 'Wire up the checkout link' },
    { id: 'w3', body: 'Ship the pricing page' },
  ],
  hiddenCount: 0,
  confirmText: 'Delete',
};

export const ManyMilestonesTruncated = Template.bind({});
ManyMilestonesTruncated.args = {
  open: true,
  shell: 'phone',
  summary: 'This deletes “Run a 10K in under 55 min” and the 11 goals hanging off it.',
  milestones: [
    { id: 'm1', body: 'Base mileage: 3 runs a week' },
    { id: 'm2', body: 'Run 5K without stopping' },
    { id: 'm3', body: 'First 8K' },
    { id: 'm4', body: 'Parkrun PB under 27 min' },
    { id: 'm5', body: 'Race-pace intervals' },
  ],
  hiddenCount: 6,
  confirmText: 'Delete all 12',
};

export const NothingDependsOnIt = Template.bind({});
NothingDependsOnIt.args = {
  open: true,
  shell: 'phone',
  summary: 'This deletes “Sketch two onboarding flows”. Nothing else depends on it.',
  milestones: [],
  hiddenCount: 0,
  confirmText: 'Delete',
};

export const Desktop = Template.bind({});
Desktop.args = {
  ...WithMilestones.args,
  shell: 'desktop',
};

export const Tablet = Template.bind({});
Tablet.args = {
  ...ManyMilestonesTruncated.args,
  shell: 'tablet',
};
