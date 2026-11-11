import GoalRefSelector from './GoalRefSelector.vue';

export default {
  title: 'Molecules/GoalRefSelector',
  component: GoalRefSelector,
  argTypes: {
    items: { control: 'object' },
    tasklist: { control: 'object' },
    value: { control: 'text' },
    label: { control: 'text' },
    solo: { control: 'boolean' },
    filled: { control: 'boolean' },
    dense: { control: 'boolean' },
    clearable: { control: 'boolean' },
    disabled: { control: 'boolean' },
    mobile: { control: 'boolean' },
    open: { control: 'boolean' },
  },
};

const TASKLIST = [
  { id: 'r1', name: 'Wake up · brush · invest', time: '05:30' },
  { id: 'r2', name: 'Reading and skills', time: '06:00' },
  { id: 'r3', name: 'Jogging', time: '07:15' },
  { id: 'r4', name: 'Deep Work', time: '09:00' },
];

/** The goals a new milestone can hang off, each pointing at a routine. */
const GOALS = [
  { id: 'g1', body: 'Ship the pricing page', taskRef: 'r4' },
  { id: 'g2', body: 'Launch pricing and checkout', taskRef: 'r4' },
  { id: 'g3', body: 'Google UX: courses 1–3', taskRef: 'r2' },
  { id: 'g4', body: 'Run a 10K in under 55 min', taskRef: 'r3' },
  { id: 'g5', body: 'Build a savings habit', taskRef: 'r1' },
];

/** `open` is story-only: it opens the list (desktop menu or mobile sub-drawer) after mount. */
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalRefSelector },
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
      if (this.mobile) {
        sel.mobileDrawerOpen = true;
        return;
      }
      const select = sel.$children.find((child) => child.activateMenu);
      if (select) select.activateMenu();
    }, 150);
  },
  template: `
    <div :style="{ width: '340px', minHeight: open ? '420px' : '0', padding: '24px 16px', background: '#fff' }">
      <GoalRefSelector ref="sel" v-bind="bound" @input="onInput" />
    </div>`,
  methods: {
    onInput(value) {
      console.log('goal ref selected', value);
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  items: GOALS,
  tasklist: TASKLIST,
  value: 'g1',
  label: 'Parent goal',
};

export const NoGoalPicked = Template.bind({});
NoGoalPicked.args = {
  items: GOALS,
  tasklist: TASKLIST,
  value: '',
  label: 'Parent goal',
  clearable: true,
};

export const NoGoalsYet = Template.bind({});
NoGoalsYet.args = {
  items: [],
  tasklist: TASKLIST,
  value: '',
  label: 'Parent goal',
};

export const Disabled = Template.bind({});
Disabled.args = {
  items: GOALS,
  tasklist: TASKLIST,
  value: 'g4',
  label: 'Parent goal',
  disabled: true,
};

export const ListOpen = Template.bind({});
ListOpen.args = {
  ...Default.args,
  clearable: true,
  open: true,
};

export const MobileClosed = Template.bind({});
MobileClosed.args = {
  items: GOALS,
  tasklist: TASKLIST,
  value: 'g3',
  label: 'Parent goal',
  mobile: true,
};

export const MobileDrawerOpen = Template.bind({});
MobileDrawerOpen.args = {
  items: GOALS,
  tasklist: TASKLIST,
  value: 'g3',
  label: 'Parent goal',
  clearable: true,
  mobile: true,
  open: true,
};
