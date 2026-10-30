import GroupMemberWeek from './GroupMemberWeek.vue';
import { WEEK_CELL, scoreColor } from '../../constants/groups';

// Same output shape as `weekGrid` in apps/web-app/src/utils/groupModel.js, built
// by hand so the story needs no web-app import. The week runs Mon 19 – Sun 25 Oct
// 2026, so the last column is "Today". Cell codes: d ticked, m missed, l later
// today, n nothing logged.
const LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
const DATES = ['19', '20', '21', '22', '23', '24', '25'].map((d) => `${d}-10-2026`);

const ROUTINES = [
  { name: 'Wake Up', time: '06:30' },
  { name: 'Start Work', time: '09:00' },
  { name: 'Lunch Walk', time: '12:30' },
  { name: 'Review', time: '18:00' },
  { name: 'Wind Down', time: '22:00' },
];

const cell = (code, rowKey, rowName, dayIndex) => {
  const isToday = dayIndex === 6;
  const state = { d: 'done', m: 'missed', l: 'later', n: 'nodata' }[code];
  const label = isToday ? 'Today' : LABELS[dayIndex];
  const stateLabel = { done: 'ticked', missed: 'missed', later: 'later today', nodata: 'nothing logged' }[state];
  let ring = WEEK_CELL.noRing;
  if (isToday && state !== 'later') ring = WEEK_CELL.todayRing;
  return {
    key: `${rowKey}|${DATES[dayIndex]}`,
    state,
    title: `${rowName} · ${label} · ${stateLabel}`,
    bg: {
      done: WEEK_CELL.doneBg, missed: WEEK_CELL.missedBg, later: WEEK_CELL.laterBg, nodata: 'transparent',
    }[state],
    ring,
    icon: state === 'done' ? 'check' : '',
  };
};

// `matrix[row]` is seven codes, Mon to Today.
const build = (matrix, totals) => ({
  dayHeads: DATES.map((key, i) => ({
    key,
    label: LABELS[i],
    isToday: i === 6,
    color: i === 6 ? '#288bd5' : 'rgba(0,0,0,.45)',
  })),
  rows: ROUTINES.map((routine, r) => {
    const key = `${routine.time}|${routine.name}`;
    return {
      key,
      name: routine.name,
      time: routine.time,
      cells: matrix[r].split('').map((code, i) => cell(code, key, routine.name, i)),
    };
  }),
  dayTotals: DATES.map((key, i) => (totals[i] === null
    ? { key, value: '–', color: 'rgba(0,0,0,.3)' }
    : { key, value: `${totals[i]}%`, color: scoreColor(totals[i]) })),
});

const FULL_WEEK = build(
  ['dddmddd', 'ddmdddd', 'dmdddml', 'ddddmdl', 'mddmddl'],
  [80, 80, 60, 60, 80, 40, 40],
);

const PARTIAL = build(
  ['nnddddd', 'nnddmdd', 'nnmdddl', 'nnddmdl', 'nnddddl'],
  [null, null, 80, 100, 60, 100, 80],
);

export default {
  title: 'Organisms/GroupMemberWeek',
  component: GroupMemberWeek,
  argTypes: {
    name: { control: 'text' },
    email: { control: 'text' },
    picture: { control: 'text' },
    color: { control: 'color' },
    streak: { control: 'number' },
    weekAverage: { control: 'number' },
    todayScore: { control: 'number' },
    dayHeads: { control: 'object' },
    rows: { control: 'object' },
    dayTotals: { control: 'object' },
    you: { control: 'boolean' },
    closable: { control: 'boolean' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GroupMemberWeek },
  template: '<div :style="{ maxWidth: closable ? \'412px\' : \'640px\', background: \'#fff\', borderRadius: \'20px\', padding: \'16px\' }"><GroupMemberWeek v-bind="$props" @close="onClose" /></div>',
  methods: {
    onClose() {
      console.log('close');
    },
  },
});

export const PhoneSheet = Template.bind({});
PhoneSheet.args = {
  name: 'Jordan Okafor',
  email: 'jordan@example.com',
  color: '#00838f',
  streak: 4,
  weekAverage: 74,
  todayScore: 40,
  closable: true,
  ...FULL_WEEK,
};

export const DesktopPane = Template.bind({});
DesktopPane.args = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  color: '#7b5ea7',
  streak: 9,
  weekAverage: 74,
  todayScore: 40,
  you: true,
  closable: false,
  ...FULL_WEEK,
};

// Days with no routine document are unknown, not missed: blank cells and a dash.
export const PartialHistory = Template.bind({});
PartialHistory.args = {
  name: 'Sam Taylor',
  email: 'sam@example.com',
  color: '#E68900',
  streak: 1,
  weekAverage: 49,
  todayScore: 80,
  closable: true,
  ...PARTIAL,
};

export const NoHistoryYet = Template.bind({});
NoHistoryYet.args = {
  name: 'Priya Nair',
  email: 'priya@example.com',
  color: '#c2185b',
  streak: 0,
  weekAverage: 0,
  todayScore: 0,
  closable: true,
  dayHeads: [],
  rows: [],
  dayTotals: [],
};
