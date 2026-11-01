import GoalCascade from './GoalCascade.vue';
import GoalCalendar from '../../molecules/GoalCalendar/GoalCalendar.vue';

export default {
  title: 'Organisms/GoalCascade',
  component: GoalCascade,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    tab: { control: { type: 'select', options: ['day', 'week', 'month', 'year', 'lifetime'] } },
    ladder: { control: 'object' },
    rule: { control: 'text' },
    ruleIcon: { control: 'text' },
    listTitle: { control: 'text' },
    listDone: { control: 'number' },
    listTotal: { control: 'number' },
    groups: { control: 'object' },
    empty: { control: 'boolean' },
    emptyText: { control: 'text' },
    addLabel: { control: 'text' },
    canAdd: { control: 'boolean' },
    loadError: { control: 'boolean' },
    retrying: { control: 'boolean' },
  },
};

const BLUE = '#288bd5';
const ORANGE = '#FF9800';
const GREEN = '#4CAF50';
const ACTIVE = { label: 'Active', color: '#FF9800', bg: 'rgba(255,152,0,.14)' };
const DONE = { label: 'Done', color: '#4CAF50', bg: 'rgba(76,175,80,.12)' };

const step = (key, label, num, value, color, active, threshold) => ({
  key, label, num, value, color, active, threshold, pop: false,
});

/** The ladder `buildCascade` returns for Sunday 25 Oct 2026, one step active. */
const ladderFor = (active, overrides = {}) => [
  step('day', 'Today', '3/5', 60, ORANGE, active === 'day', '×5'),
  step('week', 'Week', '1/3', 33, BLUE, active === 'week', '×3'),
  step('month', 'Month', '1/2', 50, BLUE, active === 'month', '×6'),
  step('year', 'Year', '41%', 41, BLUE, active === 'year', ''),
  step('lifetime', 'Life', '0/2', 0, BLUE, active === 'lifetime', ''),
].map((s) => ({ ...s, ...(overrides[s.key] || {}) }));

const dayRow = (id, body, done) => ({
  key: id, id, kind: 'check', body, done, strike: true, period: 'day',
});

const DAY_GROUPS = [
  {
    key: 'wake',
    time: '05:30',
    name: 'Wake up · brush · invest',
    isNow: false,
    current: false,
    count: '2/2',
    rows: [
      dayRow('d1', 'Check the market open for 10 minutes', true),
      dayRow('d2', 'Log yesterday’s spending', true),
    ],
  },
  {
    key: 'read',
    time: '06:00',
    name: 'Reading and skills',
    isNow: false,
    current: false,
    count: '1/2',
    rows: [
      dayRow('d3', 'Google UX: course 2, module 4', true),
      dayRow('d4', 'Sketch two onboarding flows', false),
    ],
  },
  {
    key: 'deep',
    time: '09:00',
    name: 'Deep Work',
    isNow: true,
    current: true,
    count: '0/1',
    rows: [dayRow('d5', 'Ship the pricing page', false)],
  },
];

const barRow = (id, period, body, done, label, pct, meta) => ({
  key: id,
  id,
  kind: 'bar',
  body,
  done,
  period,
  strike: false,
  barLabel: label,
  barPct: pct,
  status: done ? DONE : ACTIVE,
  meta,
  blocked: !done,
});

const WEEK_GROUPS = [
  {
    key: 'deep',
    time: '09:00',
    name: 'Deep Work',
    isNow: false,
    current: true,
    count: '1/2',
    rows: [
      barRow('w1', 'week', 'Ship the pricing page', true, '5/5 milestones', 100, 'Needs 5 of 5 day milestones met'),
      barRow('w2', 'week', 'Publish two Routine Notes posts', false, '3/5 milestones', 60, 'Needs 5 of 7 day milestones met'),
    ],
  },
  {
    key: 'jog',
    time: '07:15',
    name: 'Jogging',
    isNow: false,
    current: false,
    count: '0/1',
    rows: [barRow('w3', 'week', 'Run 25 km this week', false, '2/5 milestones', 40, 'Needs 5 of 5 day milestones met')],
  },
];

const MONTH_GROUPS = [{
  key: 'deep',
  time: '09:00',
  name: 'Deep Work',
  isNow: false,
  current: true,
  count: '1/2',
  rows: [
    barRow('m1', 'month', 'Launch pricing and checkout', true, '3/3 milestones', 100, 'Needs 3 of 4 week milestones met'),
    barRow('m2', 'month', 'Finish Google UX courses 1–3', false, '1/3 milestones', 33, 'Needs 3 of 4 week milestones met'),
  ],
}];

const yearRow = (id, body, pct, done, months) => ({
  key: id,
  id,
  kind: 'year',
  body,
  done,
  period: 'year',
  pct,
  pctLabel: `${pct}%`,
  ringColor: done ? GREEN : BLUE,
  meta: `${months}/6 months · ${done ? 'Done' : 'Active'}`,
});

const YEAR_GROUPS = [
  {
    key: 'jog',
    time: '07:15',
    name: 'Jogging',
    isNow: false,
    current: false,
    count: '0/1',
    rows: [yearRow('y1', 'Run a 10K in under 55 min', 83, false, 5)],
  },
  {
    key: 'none',
    time: '—',
    name: 'No routine',
    isNow: false,
    current: false,
    count: '1/2',
    rows: [
      yearRow('y2', 'Google UX Professional Certificate', 100, true, 6),
      yearRow('y3', 'Launch Routine Notes on both stores', 33, false, 2),
    ],
  },
];

const LIFE_GROUPS = [{
  key: 'none',
  time: '—',
  name: 'No routine',
  isNow: false,
  current: false,
  count: '0/2',
  rows: [
    {
      key: 'l1',
      id: 'l1',
      kind: 'check',
      body: 'Run a marathon',
      done: false,
      strike: false,
      period: 'lifetime',
      meta: '↑ From year goal: Run a 10K in under 55 min',
    },
    {
      key: 'l2',
      id: 'l2',
      kind: 'check',
      body: 'Build a product used by a million people',
      done: false,
      strike: false,
      period: 'lifetime',
      meta: 'No linked year goal yet',
    },
  ],
}];

/** October 2026: four leading blanks, 31 days, today (Sunday the 25th) selected. */
const buildCells = () => {
  const cells = [0, 1, 2, 3].map((i) => ({ key: `pad-${i}`, blank: true }));
  for (let day = 1; day <= 31; day += 1) {
    const future = day > 25;
    const total = day === 25 ? 5 : (future || day % 7 === 6 ? 0 : 4);
    const done = day === 25 ? 3 : (day % 5 === 0 ? 2 : total);
    const key = `${String(day).padStart(2, '0')}-10-2026`;
    cells.push({
      key,
      blank: false,
      day,
      date: key,
      total,
      done: Math.min(done, total),
      value: total ? (Math.min(done, total) / total) * 100 : 0,
      selected: day === 25,
      today: day === 25,
      future,
    });
  }
  while (cells.length % 7) cells.push({ key: `tail-${cells.length}`, blank: true });
  return cells;
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalCascade, GoalCalendar },
  data() {
    return { cells: buildCells() };
  },
  computed: {
    wide() {
      return this.shell !== 'phone';
    },
  },
  template: `
    <div :style="{ width: wide ? '1100px' : '412px', padding: '12px', background: '#f4f4f4' }">
      <GoalCascade
        v-bind="$props"
        @select-step="log('select-step', $event)"
        @toggle-row="log('toggle-row', $event)"
        @add="log('add')"
      >
        <GoalCalendar
          slot="calendar"
          month-label="October 2026"
          :cells="cells"
          :collapsible="!wide"
          :hint="wide ? 'Tap a day' : ''"
        />
      </GoalCascade>
    </div>`,
  methods: {
    log(name, payload) {
      console.log('goal cascade', name, payload);
    },
  },
});

const todayArgs = {
  shell: 'phone',
  tab: 'day',
  ladder: ladderFor('day'),
  rule: 'Day goals count toward this week’s goal for the same routine (5 days auto-tick it).',
  ruleIcon: 'today',
  listTitle: 'Today',
  listDone: 3,
  listTotal: 5,
  groups: DAY_GROUPS,
  empty: false,
  emptyText: '',
  addLabel: 'Add day goal',
  canAdd: true,
};

export const TodayPhone = Template.bind({});
TodayPhone.args = todayArgs;

export const WeekView = Template.bind({});
WeekView.args = {
  ...todayArgs,
  tab: 'week',
  ladder: ladderFor('week'),
  rule: 'This week · 19–25 Oct. A week goal auto-ticks once every day milestone on it is met (min 5).',
  ruleIcon: 'view_week',
  listTitle: 'This week',
  listDone: 1,
  listTotal: 3,
  groups: WEEK_GROUPS,
  addLabel: 'Add week goal',
};

export const MonthView = Template.bind({});
MonthView.args = {
  ...todayArgs,
  tab: 'month',
  ladder: ladderFor('month'),
  rule: 'October 2026. A month goal auto-ticks once every week milestone on it is met (min 3).',
  ruleIcon: 'calendar_month',
  listTitle: 'October',
  listDone: 1,
  listTotal: 2,
  groups: MONTH_GROUPS,
  addLabel: 'Add month goal',
};

export const YearView = Template.bind({});
YearView.args = {
  ...todayArgs,
  tab: 'year',
  ladder: ladderFor('year'),
  rule: '2026. A year goal auto-ticks after 6 month goals. Tap one to open it.',
  ruleIcon: 'event_repeat',
  listTitle: '2026',
  listDone: 1,
  listTotal: 3,
  groups: YEAR_GROUPS,
  addLabel: 'Add year goal',
};

export const LifetimeView = Template.bind({});
LifetimeView.args = {
  ...todayArgs,
  tab: 'lifetime',
  ladder: ladderFor('lifetime'),
  rule: 'Lifetime goals have no date. Year goals link up into them; tick them by hand.',
  ruleIcon: 'all_inclusive',
  listTitle: 'Lifetime',
  listDone: 0,
  listTotal: 2,
  groups: LIFE_GROUPS,
  addLabel: 'Add lifetime goal',
};

export const NothingPlannedYet = Template.bind({});
NothingPlannedYet.args = {
  ...todayArgs,
  ladder: ladderFor('day', { day: { num: '0/0', value: 0 } }),
  listTitle: 'Monday 26 Oct',
  listDone: 0,
  listTotal: 0,
  groups: [],
  empty: true,
  emptyText: 'Nothing planned yet for this day.',
};

export const LoadFailed = Template.bind({});
LoadFailed.args = {
  ...todayArgs,
  ladder: ladderFor('day', {
    day: { num: '—', value: 0 },
    week: { num: '—', value: 0 },
    month: { num: '—', value: 0 },
    year: { num: '—', value: 0 },
    lifetime: { num: '—', value: 0 },
  }),
  listDone: 0,
  listTotal: 0,
  groups: [],
  loadError: true,
};

export const TodayTablet = Template.bind({});
TodayTablet.args = {
  ...todayArgs,
  shell: 'tablet',
};

export const WeekDesktop = Template.bind({});
WeekDesktop.args = {
  ...WeekView.args,
  shell: 'desktop',
};
