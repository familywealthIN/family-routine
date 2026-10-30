import InboxSheet from './InboxSheet.vue';

export default {
  title: 'Organisms/InboxSheet',
  component: InboxSheet,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    items: { control: 'object' },
    pending: { control: 'object' },
    currentRoutine: { control: 'object' },
    routines: { control: 'object' },
    movingId: { control: 'text' },
  },
};

const ROUTINES = [
  { id: 'r1', name: 'Wake up · brush · invest', time: '05:30' },
  { id: 'r2', name: 'Reading and skills', time: '06:00' },
  { id: 'r3', name: 'Jogging', time: '07:15' },
  { id: 'r4', name: 'Deep Work', time: '09:00' },
  { id: 'r5', name: 'Workout', time: '19:30' },
];

const ITEMS = [
  { id: 'i1', body: 'Reply to the two beta feedback emails', meta: 'Added Sat 21:40' },
  { id: 'i2', body: 'Book a dentist appointment', meta: '' },
  { id: 'i3', body: 'Draft the launch-day checklist', meta: 'Added today 08:12' },
];

const PENDING = [
  { id: 'p1', body: 'Look into a standing desk', meta: 'From your pending list' },
  { id: 'p2', body: 'Pick a name for the weekly review email', meta: 'From your pending list' },
];

/**
 * `movingId` is story-only: it expands that row's "Move to routine" chips after
 * mount (the component keeps that in its own `moving` state).
 */
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { InboxSheet },
  computed: {
    bound() {
      const { movingId, ...rest } = this.$props;
      return rest;
    },
  },
  mounted() {
    if (!this.movingId) return;
    setTimeout(() => { this.$refs.sheet.moving = this.movingId; }, 150);
  },
  template: `
    <InboxSheet
      ref="sheet"
      v-bind="bound"
      @close="log('close')"
      @add="log('add', $event)"
      @do-now="log('do-now', $event)"
      @move="log('move', $event)"
      @remove="log('remove', $event)"
    />`,
  methods: {
    log(name, payload) {
      console.log('inbox sheet', name, payload);
    },
  },
});

const base = {
  open: true,
  shell: 'phone',
  items: ITEMS,
  pending: [],
  currentRoutine: ROUTINES[3],
  routines: ROUTINES,
};

export const WithTasks = Template.bind({});
WithTasks.args = base;

export const MoveToRoutineOpen = Template.bind({});
MoveToRoutineOpen.args = { ...base, movingId: 'i1' };

export const TodayAndPending = Template.bind({});
TodayAndPending.args = { ...base, pending: PENDING };

export const NoRoutineRunningNow = Template.bind({});
NoRoutineRunningNow.args = { ...base, currentRoutine: null };

export const InboxZero = Template.bind({});
InboxZero.args = { ...base, items: [] };

export const Tablet = Template.bind({});
Tablet.args = { ...base, shell: 'tablet', pending: PENDING };

export const Desktop = Template.bind({});
Desktop.args = { ...base, shell: 'desktop', movingId: 'i2' };
