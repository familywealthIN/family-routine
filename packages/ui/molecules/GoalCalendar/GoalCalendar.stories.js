import GoalCalendar from './GoalCalendar.vue';

export default {
  title: 'Molecules/GoalCalendar',
  component: GoalCalendar,
  argTypes: {
    monthLabel: { control: 'text' },
    cells: { control: 'object' },
    collapsible: { control: 'boolean' },
    expanded: { control: 'boolean' },
    hint: { control: 'text' },
    loadError: { control: 'boolean' },
  },
};

/**
 * October 2026 as `utils/goalCascade.calendarCells` builds it: Sunday-first,
 * four leading blanks (the 1st is a Thursday), 31 days, padded to whole weeks.
 * "Today" is Sunday the 25th, which is also the selected day by default.
 */
const buildCells = ({ today = 25, selected = 25 } = {}) => {
  const cells = [0, 1, 2, 3].map((i) => ({ key: `pad-${i}`, blank: true }));
  for (let day = 1; day <= 31; day += 1) {
    const future = day > today;
    // A routine-planned month: 4 day goals most days, a rest day now and then.
    const total = future && day > today + 3 ? 0 : (day % 7 === 6 ? 0 : 4);
    const done = future ? 0 : (day % 5 === 0 ? 2 : (day % 3 === 0 ? 3 : total));
    const key = `${String(day).padStart(2, '0')}-10-2026`;
    cells.push({
      key,
      blank: false,
      day,
      date: key,
      total,
      done: Math.min(done, total),
      value: total ? (Math.min(done, total) / total) * 100 : 0,
      selected: day === selected,
      today: day === today,
      future,
    });
  }
  while (cells.length % 7) cells.push({ key: `tail-${cells.length}`, blank: true });
  return cells;
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalCalendar },
  template: '<div style="width:380px;background:#fff;border-radius:16px;padding:4px 8px 8px"><GoalCalendar v-bind="$props" @toggle="onToggle" @select-day="onSelect" /></div>',
  methods: {
    onToggle() {
      console.log('calendar toggled');
    },
    onSelect(date) {
      console.log('day selected', date);
    },
  },
});

export const PhoneWeekFolded = Template.bind({});
PhoneWeekFolded.args = {
  monthLabel: 'October 2026',
  cells: buildCells(),
  collapsible: true,
  expanded: false,
};

export const PhoneMonthOpen = Template.bind({});
PhoneMonthOpen.args = {
  monthLabel: 'October 2026',
  cells: buildCells(),
  collapsible: true,
  expanded: true,
};

export const AlwaysOpenWithHint = Template.bind({});
AlwaysOpenWithHint.args = {
  monthLabel: 'October 2026',
  cells: buildCells({ selected: 21 }),
  collapsible: false,
  hint: 'Tap a day',
};

export const MonthNotLoaded = Template.bind({});
MonthNotLoaded.args = {
  monthLabel: 'October 2026',
  cells: buildCells(),
  collapsible: false,
  loadError: true,
};
