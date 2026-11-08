import YearMonthStrip from './YearMonthStrip.vue';

export default {
  title: 'Molecules/YearMonthStrip',
  component: YearMonthStrip,
  argTypes: {
    tiles: { control: 'object' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
  },
};

const GREEN = '#4CAF50';
const ORANGE = '#FF9800';
const BLUE = '#288bd5';

const MONTHS = [
  ['Jan', 'January'], ['Feb', 'February'], ['Mar', 'March'], ['Apr', 'April'],
  ['May', 'May'], ['Jun', 'June'], ['Jul', 'July'], ['Aug', 'August'],
  ['Sep', 'September'], ['Oct', 'October'], ['Nov', 'November'], ['Dec', 'December'],
];

/**
 * One tile, the way `yearGoalModel.monthTile` builds it. Three states only:
 * done (green disc + check), active (a ring reading n/3) and empty (dashed
 * track with + for a future month or − for a past one).
 */
const tile = (index, goal, state, { current = false, selected = false, weeksDone = 0 } = {}) => {
  const [label, name] = MONTHS[index];
  let labelColor = selected ? 'rgba(0,0,0,.8)' : 'rgba(0,0,0,.45)';
  if (current) labelColor = '#e68900';
  const base = {
    key: index,
    index,
    label,
    name,
    selected,
    isCurrent: current,
    title: goal ? `${name}: ${goal}` : `${name}: no goal`,
    bodyText: goal || 'No goal',
    labelColor,
    labelWeight: selected || current ? 700 : 500,
  };
  if (state === 'done') {
    return {
      ...base,
      state,
      ringColor: 'transparent',
      ringValue: 0,
      track: 'rgba(76,175,80,.25)',
      trackDash: null,
      fill: GREEN,
      icon: 'check',
      iconColor: '#fff',
      text: '',
    };
  }
  if (state === 'active') {
    return {
      ...base,
      state,
      ringColor: current ? ORANGE : BLUE,
      ringValue: Math.round((weeksDone / 3) * 100),
      track: 'rgba(0,0,0,.08)',
      trackDash: null,
      fill: 'transparent',
      icon: '',
      iconColor: 'rgba(0,0,0,.3)',
      text: `${weeksDone}/3`,
    };
  }
  return {
    ...base,
    state: 'empty',
    ringColor: 'transparent',
    ringValue: 0,
    track: 'rgba(0,0,0,.22)',
    trackDash: '3 3',
    fill: 'transparent',
    icon: index < 9 ? 'remove' : 'add',
    iconColor: 'rgba(0,0,0,.3)',
    text: '',
  };
};

/** "Run a 10K in under 55 min", as of 25 Oct 2026: five months done, October live. */
const goals = [
  null, 'Base mileage: 3 runs a week', 'Run 5K without stopping', 'First 8K', null, 'Parkrun PB under 27 min',
  null, 'Taper-free 10K trial', null, 'Race-pace intervals', 'Race week plan', null,
];
const DONE_MONTHS = [1, 2, 3, 5, 7];

const buildTiles = (selected = 9) => MONTHS.map((month, index) => {
  const goal = goals[index];
  const current = index === 9;
  if (!goal) return tile(index, null, 'empty', { current, selected: selected === index });
  if (DONE_MONTHS.includes(index)) return tile(index, goal, 'done', { current, selected: selected === index });
  return tile(index, goal, 'active', {
    current, selected: selected === index, weeksDone: current ? 1 : 0,
  });
});

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { YearMonthStrip },
  computed: {
    width() {
      return { phone: '380px', tablet: '700px', desktop: '1000px' }[this.shell] || '380px';
    },
  },
  template: `
    <div :style="{ width, padding: '12px', background: '#fff', borderRadius: '16px' }">
      <YearMonthStrip v-bind="$props" @select="onSelect" />
    </div>`,
  methods: {
    onSelect(index) {
      console.log('month focused', index);
    },
  },
});

export const Phone = Template.bind({});
Phone.args = {
  tiles: buildTiles(9),
  shell: 'phone',
};

export const PhoneAnotherMonthSelected = Template.bind({});
PhoneAnotherMonthSelected.args = {
  tiles: buildTiles(3),
  shell: 'phone',
};

export const Tablet = Template.bind({});
Tablet.args = {
  tiles: buildTiles(9),
  shell: 'tablet',
};

export const DesktopWithBodies = Template.bind({});
DesktopWithBodies.args = {
  tiles: buildTiles(9),
  shell: 'desktop',
};

export const NothingPlannedYet = Template.bind({});
NothingPlannedYet.args = {
  tiles: MONTHS.map((month, index) => tile(index, null, 'empty', { current: index === 9, selected: index === 9 })),
  shell: 'phone',
};
