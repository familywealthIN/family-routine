import YearGoalBoard from './YearGoalBoard.vue';
import RoutineChatThread from '../RoutineChatThread/RoutineChatThread.vue';

export default {
  title: 'Organisms/YearGoalBoard',
  component: YearGoalBoard,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    goal: { control: 'object' },
    tiles: { control: 'object' },
    month: { control: 'object' },
    openWeekId: { control: 'text' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    thresholds: { control: 'object' },
    indexLabel: { control: 'text' },
    hasPrev: { control: 'boolean' },
    hasNext: { control: 'boolean' },
    aboutOpen: { control: 'boolean' },
    emptySub: { control: 'text' },
    chatSubline: { control: 'text' },
  },
};

const GREEN = '#4CAF50';
const ORANGE = '#FF9800';
const BLUE = '#288bd5';

const STATUS = {
  done: {
    label: 'Done', color: GREEN, bg: 'rgba(76,175,80,.12)', chipColor: '#2e7d32',
  },
  active: {
    label: 'Active', color: ORANGE, bg: 'rgba(255,152,0,.14)', chipColor: '#e68900',
  },
  inactive: {
    label: 'Inactive', color: 'rgba(0,0,0,.5)', bg: 'rgba(0,0,0,.06)', chipColor: 'rgba(0,0,0,.5)',
  },
};

// ---------------------------------------------------------------------------
// The month focus card: "Run a 10K in under 55 min", October 2026.
// ---------------------------------------------------------------------------

const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOT_GLYPH = {
  complete: { icon: 'check_circle', color: GREEN, size: 18 },
  upcoming: { icon: 'radio_button_unchecked', color: 'rgba(0,0,0,.3)', size: 18 },
  today: { icon: 'radio_button_checked', color: ORANGE, size: 18 },
  none: { icon: 'fiber_manual_record', color: 'rgba(0,0,0,.15)', size: 8 },
};

const dots = (firstDate, statuses, todayDow = -1) => statuses.map((status, dow) => ({
  key: dow,
  label: DOW[dow],
  num: firstDate + dow,
  ...DOT_GLYPH[dow === todayDow && status === 'upcoming' ? 'today' : status],
  isToday: dow === todayDow,
}));

const day = (id, body, isComplete, dateLabel, isToday = false) => ({
  id, body, isComplete, dateLabel, isToday, dow: 1,
});

const week = (id, number, body, rangeLabel, days, doneDays, statuses, firstDate, extra = {}) => {
  const isComplete = !!extra.isComplete;
  const isCurrent = !!extra.isCurrent;
  return {
    id,
    body,
    week: number,
    rangeLabel,
    days,
    dots: dots(firstDate, statuses, extra.todayDow),
    doneDays,
    isComplete,
    isCurrent,
    canTickByHand: !isComplete,
    status: isComplete ? STATUS.done : STATUS.active,
    percent: Math.min(100, (doneDays / 5) * 100),
    barColor: isComplete ? GREEN : ORANGE,
  };
};

const OCTOBER = {
  index: 9,
  name: 'October',
  label: 'Oct',
  isCurrent: true,
  isPast: false,
  goal: { id: 'm10', body: 'Race-pace intervals', period: 'month', date: '31-10-2026' },
  weeks: [
    week('w42', 42, 'Two interval sessions of 6 × 400 m', '11 – 17 Oct', [], 5, ['none', 'complete', 'complete', 'complete', 'complete', 'complete', 'none'], 11, { isComplete: true }),
    week('w43', 43, 'Tempo run at 5:30 per km', '18 – 24 Oct', [], 5, ['none', 'complete', 'complete', 'complete', 'complete', 'complete', 'none'], 18, { isComplete: true }),
    week('w44', 44, 'Run 25 km this week', '25 – 31 Oct', [
      day('d1', 'Easy 5 km before work', true, 'Sun 25 Oct', true),
      day('d2', 'Intervals: 6 × 400 m', false, 'Tue 27 Oct'),
      day('d3', 'Long run, 10 km', false, 'Sat 31 Oct'),
    ], 1, ['complete', 'upcoming', 'upcoming', 'none', 'upcoming', 'none', 'upcoming'], 25, { isCurrent: true, todayDow: 0 }),
  ],
  weeksDone: 2,
  isComplete: false,
  canTickByHand: true,
  status: STATUS.active,
  percent: 67,
  rule: 'Ticks after 3 week goals · 1 to go',
};

const NOVEMBER_EMPTY = {
  ...OCTOBER,
  index: 10,
  name: 'November',
  label: 'Nov',
  isCurrent: false,
  goal: null,
  weeks: [],
  weeksDone: 0,
  percent: 0,
  rule: '',
};

// ---------------------------------------------------------------------------
// The 12-month strip.
// ---------------------------------------------------------------------------

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_GOALS = [
  null, 'Base mileage: 3 runs a week', 'Run 5K without stopping', 'First 8K', null, 'Parkrun PB under 27 min',
  null, 'Taper-free 10K trial', null, 'Race-pace intervals', 'Race week plan', null,
];
const DONE_MONTHS = [1, 2, 3, 5, 7];

const tileFor = (index, selectedIndex) => {
  const goal = MONTH_GOALS[index];
  const current = index === 9;
  const selected = index === selectedIndex;
  const base = {
    key: index,
    index,
    label: MONTHS[index],
    name: MONTHS[index],
    selected,
    isCurrent: current,
    title: goal ? `${MONTHS[index]}: ${goal}` : `${MONTHS[index]}: no goal`,
    bodyText: goal || 'No goal',
    labelColor: current ? '#e68900' : (selected ? 'rgba(0,0,0,.8)' : 'rgba(0,0,0,.45)'),
    labelWeight: selected || current ? 700 : 500,
  };
  if (goal && DONE_MONTHS.includes(index)) {
    return {
      ...base, state: 'done', ringColor: 'transparent', ringValue: 0, track: 'rgba(76,175,80,.25)', trackDash: null, fill: GREEN, icon: 'check', iconColor: '#fff', text: '',
    };
  }
  if (goal) {
    return {
      ...base, state: 'active', ringColor: current ? ORANGE : BLUE, ringValue: current ? 67 : 0, track: 'rgba(0,0,0,.08)', trackDash: null, fill: 'transparent', icon: '', iconColor: 'rgba(0,0,0,.3)', text: current ? '2/3' : '0/3',
    };
  }
  return {
    ...base, state: 'empty', ringColor: 'transparent', ringValue: 0, track: 'rgba(0,0,0,.22)', trackDash: '3 3', fill: 'transparent', icon: index < 9 ? 'remove' : 'add', iconColor: 'rgba(0,0,0,.3)', text: '',
  };
};

const tiles = (selectedIndex = 9) => MONTHS.map((label, index) => tileFor(index, selectedIndex));

// ---------------------------------------------------------------------------
// The year goal itself and the thread beside it.
// ---------------------------------------------------------------------------

const GOAL = {
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
  isComplete: false,
  ringColor: BLUE,
  status: STATUS.active,
  rule: 'Ticks after 6 month goals · 1 to go',
  months: [OCTOBER],
};

const THREAD = [
  {
    id: 'c1', from: 'me', kind: 'text', text: 'How is October looking?',
  },
  {
    id: 'c2',
    from: 'routine',
    kind: 'text',
    text: 'Two of three week goals are done. This week needs 4 more days of running to tick Race-pace intervals.',
  },
  {
    id: 'c3', from: 'routine', kind: 'event', text: 'Easy 5 km before work ticked · G +12', tone: 'green', icon: 'check_circle',
  },
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { YearGoalBoard, RoutineChatThread },
  data() {
    return { thread: THREAD };
  },
  computed: {
    width() {
      return { phone: '412px', tablet: '1133px', desktop: '1133px' }[this.shell] || '412px';
    },
  },
  template: `
    <div :style="{ width, padding: '12px', background: '#f4f4f4', boxSizing: 'border-box' }">
      <YearGoalBoard
        v-bind="$props"
        @select-month="log('select-month', $event)"
        @expand="log('expand', $event)"
        @step="log('step', $event)"
        @open-switcher="log('open-switcher')"
        @toggle-about="log('toggle-about')"
      >
        <RoutineChatThread
          slot="chat"
          :messages="thread"
          :goal-items="[]"
          routine-name="Jogging"
        />
        <div
          slot="composer"
          style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:24px;background:#f4f4f4;color:rgba(0,0,0,.45);font-size:14px"
        >Ask about this goal…</div>
      </YearGoalBoard>
    </div>`,
  methods: {
    log(name, payload) {
      console.log('year goal board', name, payload);
    },
  },
});

const base = {
  goal: GOAL,
  tiles: tiles(9),
  month: OCTOBER,
  openWeekId: 'w44',
  shell: 'phone',
  thresholds: { week: 5, month: 3, year: 6 },
  indexLabel: '1 of 3',
  hasPrev: false,
  hasNext: true,
  aboutOpen: false,
  emptySub: '',
  chatSubline: 'Run a 10K in under 55 min · 2026',
};

export const PhoneCurrentMonth = Template.bind({});
PhoneCurrentMonth.args = base;

export const PhoneWeeksCollapsed = Template.bind({});
PhoneWeeksCollapsed.args = { ...base, openWeekId: '' };

export const PhoneMonthWithoutGoal = Template.bind({});
PhoneMonthWithoutGoal.args = {
  ...base,
  tiles: tiles(10),
  month: NOVEMBER_EMPTY,
  openWeekId: '',
  emptySub: 'Plan November to move Run a 10K in under 55 min toward its 6 months.',
};

export const PhoneYearDone = Template.bind({});
PhoneYearDone.args = {
  ...base,
  goal: {
    ...GOAL,
    body: 'Google UX Professional Certificate',
    about: [],
    routineName: 'Reading and skills',
    monthsDone: 6,
    percent: 100,
    isComplete: true,
    ringColor: GREEN,
    status: STATUS.done,
    rule: 'Auto-ticked by 6 month goals',
  },
  indexLabel: '2 of 3',
  hasPrev: true,
  hasNext: true,
};

export const TabletTwoColumns = Template.bind({});
TabletTwoColumns.args = { ...base, shell: 'tablet' };

export const DesktopTwoColumns = Template.bind({});
DesktopTwoColumns.args = { ...base, shell: 'desktop', openWeekId: '' };
