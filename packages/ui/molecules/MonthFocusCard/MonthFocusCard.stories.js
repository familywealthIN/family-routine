import MonthFocusCard from './MonthFocusCard.vue';

export default {
  title: 'Molecules/MonthFocusCard',
  component: MonthFocusCard,
  argTypes: {
    month: { control: 'object' },
    openWeekId: { control: 'text' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    weekThreshold: { control: 'number' },
    monthThreshold: { control: 'number' },
    emptySub: { control: 'text' },
  },
};

const STATUS = {
  done: {
    label: 'Done', color: '#4CAF50', bg: 'rgba(76,175,80,.12)', chipColor: '#2e7d32',
  },
  active: {
    label: 'Active', color: '#FF9800', bg: 'rgba(255,152,0,.14)', chipColor: '#e68900',
  },
  inactive: {
    label: 'Inactive', color: 'rgba(0,0,0,.5)', bg: 'rgba(0,0,0,.06)', chipColor: 'rgba(0,0,0,.5)',
  },
};

/** Sunday-first week strip: S M T W T F S. */
const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const DOT_GLYPH = {
  complete: { icon: 'check_circle', color: '#4CAF50', size: 18 },
  partial: { icon: 'donut_large', color: 'rgba(76,175,80,.6)', size: 18 },
  missed: { icon: 'cancel', color: 'rgba(229,57,53,.55)', size: 18 },
  today: { icon: 'radio_button_checked', color: '#FF9800', size: 18 },
  upcoming: { icon: 'radio_button_unchecked', color: 'rgba(0,0,0,.3)', size: 18 },
  none: { icon: 'fiber_manual_record', color: 'rgba(0,0,0,.15)', size: 8 },
};

/** `firstDate` is the Sunday; `statuses` is one entry per weekday, Sunday first. */
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
    status: isComplete ? STATUS.done : (isCurrent ? STATUS.active : STATUS.inactive),
    percent: Math.min(100, (doneDays / 5) * 100),
    barColor: isComplete ? '#4CAF50' : (isCurrent ? '#FF9800' : 'rgba(0,0,0,.25)'),
  };
};

/** October 2026, viewed on Sunday 25th: two weeks done, the third under way. */
const OCTOBER = {
  index: 9,
  name: 'October',
  label: 'Oct',
  isCurrent: true,
  isPast: false,
  goal: { id: 'm10', body: 'Launch pricing and checkout', period: 'month', date: '31-10-2026' },
  weeks: [
    week('w42', 42, 'Draft the three plan cards', '11 – 17 Oct', [], 5, ['none', 'complete', 'complete', 'complete', 'complete', 'complete', 'none'], 11, { isComplete: true }),
    week('w43', 43, 'Wire up the checkout link', '18 – 24 Oct', [], 5, ['none', 'complete', 'complete', 'partial', 'complete', 'complete', 'none'], 18, { isComplete: true }),
    week('w44', 44, 'Ship the pricing page', '25 – 31 Oct', [
      day('d1', 'Write the pricing FAQ', true, 'Sun 25 Oct', true),
      day('d2', 'Ask two beta users to review', false, 'Tue 27 Oct'),
      day('d3', 'Publish the page', false, 'Thu 29 Oct'),
    ], 1, ['complete', 'upcoming', 'upcoming', 'none', 'upcoming', 'none', 'none'], 25, { isCurrent: true, todayDow: 0 }),
  ],
  weeksDone: 2,
  isComplete: false,
  canTickByHand: true,
  status: STATUS.active,
  percent: 67,
  rule: 'Ticks after 3 week goals · 1 to go',
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { MonthFocusCard },
  computed: {
    width() {
      return { phone: '388px', tablet: '720px', desktop: '720px' }[this.shell] || '412px';
    },
  },
  template: `
    <div :style="{ width, padding: '12px', background: '#f4f4f4' }">
      <MonthFocusCard
        v-bind="$props"
        @expand="log('expand', $event)"
        @tick-week="log('tick-week', $event)"
        @tick-day="log('tick-day', $event)"
        @tick-month="log('tick-month', $event)"
        @menu="log('menu', $event)"
        @add-week="log('add-week', $event)"
        @add-day="log('add-day', $event)"
        @edit-day="log('edit-day', $event)"
      />
    </div>`,
  methods: {
    log(name, payload) {
      console.log('month focus card', name, payload);
    },
  },
});

export const WeeksCollapsed = Template.bind({});
WeeksCollapsed.args = {
  month: OCTOBER,
  openWeekId: '',
  shell: 'phone',
};

export const CurrentWeekOpen = Template.bind({});
CurrentWeekOpen.args = {
  month: OCTOBER,
  openWeekId: 'w44',
  shell: 'phone',
};

export const MonthDone = Template.bind({});
MonthDone.args = {
  month: {
    ...OCTOBER,
    weeksDone: 3,
    isComplete: true,
    status: STATUS.done,
    percent: 100,
    rule: 'Auto-ticked by 3 week goals',
    weeks: OCTOBER.weeks.map((w) => ({
      ...w,
      isComplete: true,
      canTickByHand: false,
      doneDays: 5,
      percent: 100,
      barColor: '#4CAF50',
      status: STATUS.done,
    })),
  },
  openWeekId: '',
  shell: 'phone',
};

export const PastMonthReadOnly = Template.bind({});
PastMonthReadOnly.args = {
  month: {
    ...OCTOBER,
    index: 8,
    name: 'September',
    label: 'Sep',
    isCurrent: false,
    isPast: true,
    goal: { id: 'm9', body: 'Run 5K without stopping', period: 'month', date: '30-09-2026' },
    weeksDone: 3,
    isComplete: true,
    status: STATUS.done,
    percent: 100,
    rule: 'Auto-ticked by 3 week goals',
    weeks: [
      week('w39', 39, 'Three easy runs of 3 km', '13 – 19 Sep', [day('p1', 'Easy 3 km, conversation pace', true, 'Mon 14 Sep')], 5, ['none', 'complete', 'complete', 'complete', 'complete', 'complete', 'none'], 13, { isComplete: true }),
      week('w40', 40, 'Add a fourth run', '20 – 26 Sep', [], 5, ['none', 'complete', 'complete', 'complete', 'complete', 'complete', 'none'], 20, { isComplete: true }),
      week('w41', 41, 'Run 5K without stopping', '27 Sep – 3 Oct', [], 5, ['none', 'complete', 'complete', 'complete', 'complete', 'complete', 'none'], 27, { isComplete: true }),
    ].map((w) => ({ ...w, canTickByHand: false })),
  },
  openWeekId: 'w39',
  shell: 'phone',
};

export const NoDayGoalsYet = Template.bind({});
NoDayGoalsYet.args = {
  month: {
    ...OCTOBER,
    weeks: [week('w44', 44, 'Ship the pricing page', '25 – 31 Oct', [], 0, ['none', 'none', 'none', 'none', 'none', 'none', 'none'], 25, { isCurrent: true })],
    weeksDone: 0,
    percent: 0,
    rule: 'Ticks after 3 week goals · 3 to go',
  },
  openWeekId: 'w44',
  shell: 'phone',
};

export const NoGoalForThisMonth = Template.bind({});
NoGoalForThisMonth.args = {
  month: {
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
  },
  emptySub: 'Plan November to move Run a 10K in under 55 min toward its 6 months.',
  shell: 'phone',
};

export const Tablet = Template.bind({});
Tablet.args = {
  month: OCTOBER,
  openWeekId: 'w44',
  shell: 'tablet',
};
