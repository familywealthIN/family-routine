import RoutineDayPlan from './RoutineDayPlan.vue';

export default {
  title: 'Organisms/RoutineDayPlan',
  component: RoutineDayPlan,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    items: { control: 'object' },
    loading: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    nowMinutes: { control: 'number' },
    selectedId: { control: 'text' },
    flashId: { control: 'text' },
    agents: { control: 'object' },
    goals: { control: 'object' },
  },
};

const step = (name) => ({ name });

/** The routines of a typical working day, in no particular order (the plan sorts them). */
const ITEMS = [
  {
    id: 'r4',
    name: 'Deep Work',
    time: '09:00',
    points: 30,
    steps: [step('Close chat and mail'), step('Top task on a timer'), step('Write down what shipped')],
    tags: ['area:work:product'],
  },
  {
    id: 'r1',
    name: 'Wake up · brush · invest',
    time: '05:30',
    points: 10,
    steps: [step('Water and brush'), step('Check the market open')],
    tags: ['morning'],
  },
  {
    id: 'r6',
    name: 'Lunch walk',
    time: '12:30',
    points: 8,
    steps: [step('Phone away'), step('Twenty minutes outside')],
    tags: [],
  },
  {
    id: 'r3',
    name: 'Jogging',
    time: '07:15',
    points: 20,
    steps: [step('Shoes on'), step('Easy 5 km'), step('Stretch')],
    tags: ['area:health:fitness'],
  },
  {
    id: 'r2',
    name: 'Reading and skills',
    time: '06:00',
    points: 15,
    steps: [step('One course module'), step('Ten pages of a book')],
    tags: ['area:learning'],
  },
  {
    id: 'r5',
    name: 'Workout',
    time: '19:30',
    points: 20,
    steps: [step('Warm-up'), step('Strength set'), step('Cool-down')],
    tags: ['area:health:fitness'],
  },
];

const AGENTS = { r4: 'Copy Reviewer', r2: 'Course Notes' };
const GOALS = {
  r3: { body: 'Run a 10K in under 55 min', pct: 83 },
  r4: { body: 'Launch Routine Notes on both stores', pct: 33 },
  r2: { body: 'Google UX Professional Certificate', pct: 100 },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineDayPlan },
  computed: {
    width() {
      return { phone: '412px', tablet: '820px', desktop: '1100px' }[this.shell] || '412px';
    },
  },
  template: `
    <div :style="{ width, padding: '12px', background: '#f4f4f4' }">
      <RoutineDayPlan
        v-bind="$props"
        @select="log('select', $event)"
        @open="log('open', $event)"
        @insert="log('insert', $event)"
        @new="log('new')"
      />
    </div>`,
  methods: {
    log(name, payload) {
      console.log('routine day plan', name, payload);
    },
  },
});

const base = {
  items: ITEMS,
  loading: false,
  shell: 'phone',
  // 09:30, so Deep Work is "now" whatever day the canvas is opened.
  nowMinutes: 9 * 60 + 30,
  selectedId: '',
  flashId: '',
  agents: AGENTS,
  goals: GOALS,
};

export const PhoneDeepWorkNow = Template.bind({});
PhoneDeepWorkNow.args = base;

export const PhoneRoutineSelected = Template.bind({});
PhoneRoutineSelected.args = { ...base, selectedId: 'r3' };

export const PhoneJustSaved = Template.bind({});
PhoneJustSaved.args = { ...base, selectedId: 'r3', flashId: 'r3' };

export const PhoneEveningAfterWorkout = Template.bind({});
PhoneEveningAfterWorkout.args = { ...base, nowMinutes: 21 * 60 };

export const PhoneEmpty = Template.bind({});
PhoneEmpty.args = { ...base, items: [], agents: {}, goals: {} };

export const PhoneLoading = Template.bind({});
PhoneLoading.args = { ...base, items: [], loading: true };

export const TabletDial = Template.bind({});
TabletDial.args = { ...base, shell: 'tablet', selectedId: 'r4' };

export const DesktopDial = Template.bind({});
DesktopDial.args = { ...base, shell: 'desktop' };
