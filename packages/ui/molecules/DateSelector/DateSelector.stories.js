import DateSelector from './DateSelector.vue';

export default {
  title: 'Molecules/DateSelector',
  component: DateSelector,
  argTypes: {
    value: { control: 'text' },
    period: { control: { type: 'select', options: ['day', 'week', 'month', 'year', 'lifetime'] } },
    label: { control: 'text' },
    placeholder: { control: 'text' },
    outlined: { control: 'boolean' },
    dense: { control: 'boolean' },
    disabled: { control: 'boolean' },
    clearable: { control: 'boolean' },
    taskMode: { control: 'boolean' },
    mobile: { control: 'boolean' },
    open: { control: 'boolean' },
  },
};

/**
 * `open` is a story-only switch: it drives the component's own `menuOpen` /
 * `mobileDrawerOpen` after mount so the picker panel shows in the canvas. It is
 * not a prop of DateSelector, so it is kept out of what we bind.
 */
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { DateSelector },
  computed: {
    bound() {
      const { open, ...rest } = this.$props;
      return rest;
    },
  },
  mounted() {
    if (!this.open) return;
    setTimeout(() => {
      const sel = this.$refs.sel;
      if (this.mobile) sel.mobileDrawerOpen = true;
      else sel.menuOpen = true;
    }, 150);
  },
  template: `
    <div :style="{ width: '340px', minHeight: open ? '560px' : '0', padding: '24px 16px', background: '#fff' }">
      <DateSelector ref="sel" v-bind="bound" @input="onInput" />
    </div>`,
  methods: {
    onInput(value) {
      console.log('date selector value', value);
    },
  },
});

export const DayField = Template.bind({});
DayField.args = {
  value: '14-11-2026',
  period: 'day',
  label: 'Goal date',
  outlined: true,
};

export const DayPickerOpen = Template.bind({});
DayPickerOpen.args = {
  value: '14-11-2026',
  period: 'day',
  label: 'Goal date',
  outlined: true,
  open: true,
};

export const WeekPickerOpen = Template.bind({});
WeekPickerOpen.args = {
  value: '08-11-2026',
  period: 'week',
  label: 'Goal week',
  outlined: true,
  open: true,
};

export const MonthPickerOpen = Template.bind({});
MonthPickerOpen.args = {
  value: '30-11-2026',
  period: 'month',
  label: 'Goal month',
  outlined: true,
  open: true,
};

export const YearPickerOpen = Template.bind({});
YearPickerOpen.args = {
  value: '31-12-2026',
  period: 'year',
  label: 'Goal year',
  outlined: true,
  open: true,
};

export const LifetimeField = Template.bind({});
LifetimeField.args = {
  value: '01-01-1970',
  period: 'lifetime',
  label: 'Goal period',
  outlined: true,
};

export const NothingPicked = Template.bind({});
NothingPicked.args = {
  value: '',
  period: '',
  label: 'Select Date',
  placeholder: 'Pick a date',
  outlined: true,
};

export const MobileDrawerOpen = Template.bind({});
MobileDrawerOpen.args = {
  value: '14-11-2026',
  period: 'day',
  label: 'Goal date',
  outlined: true,
  mobile: true,
  open: true,
};
