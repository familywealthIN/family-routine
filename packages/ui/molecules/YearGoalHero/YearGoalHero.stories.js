import YearGoalHero from './YearGoalHero.vue';
import YearMonthStrip from '../YearMonthStrip/YearMonthStrip.vue';

export default {
  title: 'Molecules/YearGoalHero',
  component: YearGoalHero,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    goal: { control: 'object' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    yearThreshold: { control: 'number' },
    indexLabel: { control: 'text' },
    hasPrev: { control: 'boolean' },
    hasNext: { control: 'boolean' },
    aboutOpen: { control: 'boolean' },
  },
};

const STATUS = {
  done: {
    label: 'Done', color: '#4CAF50', bg: 'rgba(76,175,80,.12)', chipColor: '#2e7d32',
  },
  active: {
    label: 'Active', color: '#FF9800', bg: 'rgba(255,152,0,.14)', chipColor: '#e68900',
  },
};

/** What `yearGoalModel.buildYearGoal` hands the hero: a view-model, no arithmetic here. */
const TEN_K = {
  id: 'y1',
  body: 'Run a 10K in under 55 min',
  about: [
    'Three runs a week, one of them intervals',
    'Race a 10K on 15 Nov',
    'Log every run in the Jogging routine',
  ],
  year: 2026,
  routineName: 'Jogging',
  monthsDone: 5,
  percent: 83,
  ringColor: '#288bd5',
  status: STATUS.active,
  rule: 'Ticks after 6 month goals · 1 to go',
};

const FINISHED = {
  ...TEN_K,
  id: 'y2',
  body: 'Google UX Professional Certificate',
  about: [],
  routineName: 'Reading and skills',
  monthsDone: 6,
  percent: 100,
  ringColor: '#4CAF50',
  status: STATUS.done,
  rule: 'Auto-ticked by 6 month goals',
};

const JUST_STARTED = {
  ...TEN_K,
  id: 'y3',
  body: 'Launch Routine Notes on both stores',
  about: [],
  routineName: '',
  monthsDone: 1,
  percent: 17,
  rule: 'Ticks after 6 month goals · 5 to go',
};

const STRIP_STATES = ['empty', 'done', 'done', 'done', 'empty', 'done', 'empty', 'done', 'empty', 'active', 'active', 'empty'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const stripTiles = () => STRIP_STATES.map((state, index) => {
  const current = index === 9;
  const base = {
    key: index,
    index,
    label: MONTH_LABELS[index],
    name: MONTH_LABELS[index],
    selected: current,
    isCurrent: current,
    title: MONTH_LABELS[index],
    bodyText: state === 'empty' ? 'No goal' : 'Month goal',
    labelColor: current ? '#e68900' : 'rgba(0,0,0,.45)',
    labelWeight: current ? 700 : 500,
  };
  if (state === 'done') {
    return {
      ...base, state, ringColor: 'transparent', ringValue: 0, track: 'rgba(76,175,80,.25)', trackDash: null, fill: '#4CAF50', icon: 'check', iconColor: '#fff', text: '',
    };
  }
  if (state === 'active') {
    return {
      ...base, state, ringColor: current ? '#FF9800' : '#288bd5', ringValue: current ? 33 : 0, track: 'rgba(0,0,0,.08)', trackDash: null, fill: 'transparent', icon: '', iconColor: 'rgba(0,0,0,.3)', text: current ? '1/3' : '0/3',
    };
  }
  return {
    ...base, state: 'empty', ringColor: 'transparent', ringValue: 0, track: 'rgba(0,0,0,.22)', trackDash: '3 3', fill: 'transparent', icon: index < 9 ? 'remove' : 'add', iconColor: 'rgba(0,0,0,.3)', text: '',
  };
});

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { YearGoalHero, YearMonthStrip },
  data() {
    return { tiles: stripTiles() };
  },
  computed: {
    width() {
      return { phone: '412px', tablet: '820px', desktop: '1100px' }[this.shell] || '412px';
    },
  },
  template: `
    <div :style="{ width, padding: '12px', background: '#f4f4f4' }">
      <div style="background:#fff;border-radius:16px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)">
        <YearGoalHero v-bind="$props" @step="onStep" @toggle-about="onAbout" @open-switcher="onSwitcher">
          <YearMonthStrip slot="strip" :tiles="tiles" :shell="shell" />
        </YearGoalHero>
      </div>
    </div>`,
  methods: {
    onStep(direction) {
      console.log('year goal step', direction);
    },
    onAbout() {
      console.log('about toggled');
    },
    onSwitcher() {
      console.log('switcher opened');
    },
  },
});

export const PhoneActive = Template.bind({});
PhoneActive.args = {
  goal: TEN_K,
  shell: 'phone',
  indexLabel: '1 of 3',
  hasPrev: false,
  hasNext: true,
};

export const PhoneAboutOpen = Template.bind({});
PhoneAboutOpen.args = {
  goal: TEN_K,
  shell: 'phone',
  indexLabel: '1 of 3',
  hasPrev: false,
  hasNext: true,
  aboutOpen: true,
};

export const PhoneDone = Template.bind({});
PhoneDone.args = {
  goal: FINISHED,
  shell: 'phone',
  indexLabel: '2 of 3',
  hasPrev: true,
  hasNext: true,
  aboutOpen: true,
};

export const PhoneOnlyGoalNoRoutine = Template.bind({});
PhoneOnlyGoalNoRoutine.args = {
  goal: JUST_STARTED,
  shell: 'phone',
  indexLabel: '',
};

export const Tablet = Template.bind({});
Tablet.args = {
  goal: TEN_K,
  shell: 'tablet',
  indexLabel: '1 of 3',
};

export const Desktop = Template.bind({});
Desktop.args = {
  goal: TEN_K,
  shell: 'desktop',
  indexLabel: '1 of 3',
};
