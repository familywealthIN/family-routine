import SkipDaySheet from './SkipDaySheet.vue';

export default {
  title: 'Organisms/SkipDaySheet',
  component: SkipDaySheet,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select' }, options: ['phone', 'tablet', 'desktop'] },
    dayLabel: { control: 'text' },
    skipped: { control: 'boolean' },
    errorMessage: { control: 'text' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { SkipDaySheet },
  template: '<SkipDaySheet v-bind="$props" @close="onClose" @confirm="onConfirm" />',
  methods: {
    onClose() {
      console.log('close');
    },
    onConfirm(payload) {
      console.log('confirm', payload);
    },
  },
});

export const Phone = Template.bind({});
Phone.args = {
  open: true,
  shell: 'phone',
  dayLabel: 'Sunday, 25 October',
};

export const Tablet = Template.bind({});
Tablet.args = {
  open: true,
  shell: 'tablet',
  dayLabel: 'Sunday, 25 October',
};

export const AlreadySkipped = Template.bind({});
AlreadySkipped.args = {
  open: true,
  shell: 'phone',
  skipped: true,
};

export const QuotaReached = Template.bind({});
QuotaReached.args = {
  open: true,
  shell: 'desktop',
  dayLabel: 'Sunday, 25 October',
  errorMessage: 'You can skip at most two days a week.',
};
