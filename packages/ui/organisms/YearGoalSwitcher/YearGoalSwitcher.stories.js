import YearGoalSwitcher from './YearGoalSwitcher.vue';

export default {
  title: 'Organisms/YearGoalSwitcher',
  component: YearGoalSwitcher,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    rows: { control: 'object' },
    sortChips: { control: 'object' },
    sort: { control: { type: 'select', options: ['routine', 'progress'] } },
    query: { control: 'text' },
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    compact: { control: 'boolean' },
    year: { control: 'number' },
    yearThreshold: { control: 'number' },
    failed: { control: 'boolean' },
  },
};

const BLUE = '#288bd5';
const GREEN = '#4CAF50';

const CHIPS = [
  { key: 'routine', label: 'By routine time', icon: 'schedule' },
  { key: 'progress', label: 'By progress', icon: 'donut_large' },
];

/** What `yearGoalModel.yearGoalRows` returns: one header, then one row per year goal. */
const row = (id, title, percent, monthsDone, routineName, currentMonthBody, extra = {}) => ({
  id,
  title,
  percent,
  monthsDone,
  isComplete: percent === 100,
  routineName,
  // GoalItem.routine carries no time, so the real rows print an em dash.
  routineTime: '',
  currentMonthBody,
  currentMonthLabel: 'Oct',
  isActive: false,
  color: percent === 100 ? GREEN : BLUE,
  ...extra,
});

const ROWS = [
  { header: 'BY ROUTINE' },
  row('y1', 'Run a 10K in under 55 min', 83, 5, 'Jogging', 'Race-pace intervals', { isActive: true }),
  row('y2', 'Launch Routine Notes on both stores', 33, 2, 'Deep Work', 'Launch pricing and checkout'),
  row('y3', 'Google UX Professional Certificate', 100, 6, 'Reading and skills', 'Portfolio case study'),
  row('y4', 'Build a six-month savings cushion', 17, 1, 'Wake up · brush · invest', ''),
];

const BY_PROGRESS = [
  { header: 'LOWEST PROGRESS FIRST' },
  ROWS[4],
  ROWS[2],
  ROWS[1],
  ROWS[3],
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { YearGoalSwitcher },
  computed: {
    frame() {
      if (this.compact) return { width: '264px', height: '420px', background: '#fff' };
      return { width: this.shell === 'phone' ? '412px' : '1000px', height: '700px', background: '#f4f4f4' };
    },
  },
  template: `
    <div :style="{ position: 'relative', overflow: 'hidden', ...frame }">
      <YearGoalSwitcher
        v-bind="$props"
        @select="log('select', $event)"
        @sort="log('sort', $event)"
        @query="log('query', $event)"
        @close="log('close')"
        @open-overview="log('open-overview')"
        @retry="log('retry')"
      />
    </div>`,
  methods: {
    log(name, payload) {
      console.log('year goal switcher', name, payload);
    },
  },
});

const base = {
  rows: ROWS,
  sortChips: CHIPS,
  sort: 'routine',
  query: '',
  open: true,
  shell: 'phone',
  compact: false,
  year: 2026,
  yearThreshold: 6,
  failed: false,
};

export const PhoneSheetByRoutine = Template.bind({});
PhoneSheetByRoutine.args = base;

export const PhoneSheetByProgress = Template.bind({});
PhoneSheetByProgress.args = { ...base, sort: 'progress', rows: BY_PROGRESS };

export const PhoneSheetSearching = Template.bind({});
PhoneSheetSearching.args = {
  ...base,
  query: 'run',
  rows: [{ header: 'BY ROUTINE' }, ROWS[1]],
};

export const PhoneSheetNoMatch = Template.bind({});
PhoneSheetNoMatch.args = { ...base, query: 'marathon', rows: [{ header: 'BY ROUTINE' }] };

export const PhoneSheetNoYearGoalsYet = Template.bind({});
PhoneSheetNoYearGoalsYet.args = { ...base, rows: [{ header: 'BY ROUTINE' }] };

export const PhoneSheetLoadFailed = Template.bind({});
PhoneSheetLoadFailed.args = { ...base, rows: [], failed: true };

export const TabletShelf = Template.bind({});
TabletShelf.args = { ...base, shell: 'tablet' };

export const DesktopSidebarCompact = Template.bind({});
DesktopSidebarCompact.args = { ...base, shell: 'desktop', compact: true };
