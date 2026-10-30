import GoalTaskSelector from './GoalTaskSelector.vue';

export default {
  title: 'Molecules/GoalTaskSelector',
  component: GoalTaskSelector,
  argTypes: {
    items: { control: 'object' },
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

const ROUTINES = [
  { id: 'r1', name: 'Wake up · brush · invest', time: '05:30' },
  { id: 'r2', name: 'Reading and skills', time: '06:00' },
  { id: 'r3', name: 'Jogging', time: '07:15' },
  { id: 'r4', name: 'Deep Work', time: '09:00' },
  { id: 'r5', name: 'Workout', time: '19:30' },
];

/** `open` is story-only: it opens the list (desktop menu or mobile sub-drawer) after mount. */
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalTaskSelector },
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
      <GoalTaskSelector ref="sel" v-bind="bound" @input="onInput" />
    </div>`,
  methods: {
    onInput(value) {
      console.log('routine task selected', value);
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  items: ROUTINES,
  value: 'r4',
  label: 'Routine Task',
};

export const NothingSelected = Template.bind({});
NothingSelected.args = {
  items: ROUTINES,
  value: '',
  label: 'Routine Task',
};

export const ToolbarSolo = Template.bind({});
ToolbarSolo.args = {
  items: ROUTINES,
  value: 'r3',
  label: 'Routine Task',
  solo: true,
  dense: true,
  clearable: true,
};

export const Disabled = Template.bind({});
Disabled.args = {
  items: ROUTINES,
  value: 'r2',
  label: 'Routine Task',
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
  items: ROUTINES,
  value: 'r4',
  label: 'Routine Task',
  mobile: true,
};

export const MobileDrawerOpen = Template.bind({});
MobileDrawerOpen.args = {
  items: ROUTINES,
  value: 'r4',
  label: 'Routine Task',
  clearable: true,
  mobile: true,
  open: true,
};
