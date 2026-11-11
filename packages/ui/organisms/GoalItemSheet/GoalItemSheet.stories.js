import GoalItemSheet from './GoalItemSheet.vue';

export default {
  title: 'Organisms/GoalItemSheet',
  component: GoalItemSheet,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    open: { control: 'boolean' },
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    mode: { control: { type: 'select', options: ['edit', 'create'] } },
    period: { control: 'text' },
    seed: { control: 'object' },
    saving: { control: 'boolean' },
    dateTaskMode: { control: 'boolean' },
    item: { control: 'object' },
    routines: { control: 'object' },
    goalRefOptions: { control: 'object' },
    linkLocked: { control: 'boolean' },
    periodLabel: { control: 'text' },
    routineLabel: { control: 'text' },
    goalRefLabel: { control: 'text' },
    dateLabel: { control: 'text' },
    dateLocked: { control: 'boolean' },
    dateOptions: { control: 'object' },
    tagUniverse: { control: 'object' },
    tagUsage: { control: 'object' },
    readonly: { control: 'boolean' },
    readonlyNote: { control: 'text' },
    rewardMeta: { control: 'text' },
    rewardNew: { control: 'boolean' },
  },
};

const ROUTINES = [
  { id: 'r1', name: 'Wake up · brush · invest', time: '05:30' },
  { id: 'r2', name: 'Reading and skills', time: '06:00' },
  { id: 'r3', name: 'Jogging', time: '07:15' },
  { id: 'r4', name: 'Deep Work', time: '09:00' },
  { id: 'r5', name: 'Workout', time: '19:30' },
];

const TAG_UNIVERSE = [
  'area:work:product', 'area:work:writing', 'area:learning', 'area:health:fitness',
  'project:pricing-page', 'project:google-ux', 'project:10k',
];
const TAG_USAGE = { 'area:work:product': 3, 'project:pricing-page': 2, 'project:google-ux': 1 };

const DATE_OPTIONS = [
  { key: 'today', label: 'Today', active: true, date: '25-10-2026' },
  { key: 'tomorrow', label: 'Tomorrow', active: false, date: '26-10-2026' },
  { key: 'monday', label: 'Mon', active: false, date: '26-10-2026' },
];

const ITEM = {
  id: 'g1',
  body: 'Ship the pricing page',
  contribution: 'Three plan cards, a monthly and yearly toggle and a checkout link.\n\n- FAQ still to write\n- Ask two beta users to review',
  isComplete: false,
  ready: false,
  reward: '',
  goalRef: 'wg1',
  taskRef: 'r4',
  tags: ['project:pricing-page', 'area:work:product'],
  subTasks: [
    { id: 's1', body: 'Draft the three plan cards', isComplete: true },
    { id: 's2', body: 'Write the pricing FAQ', isComplete: false },
    { id: 's3', body: 'Ask two beta users to review', isComplete: false },
  ],
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GoalItemSheet },
  template: `
    <GoalItemSheet
      v-bind="$props"
      @close="log('close')"
      @toggle-status="log('toggle-status', $event)"
      @delete="log('delete', $event)"
      @create="log('create', $event)"
      @pick-date="log('pick-date', $event)"
      @open-transcript="log('open-transcript', $event)"
    />`,
  methods: {
    log(name, payload) {
      console.log('goal item sheet', name, payload);
    },
  },
});

const editArgs = {
  open: true,
  shell: 'phone',
  mode: 'edit',
  period: 'day',
  item: ITEM,
  routines: ROUTINES,
  periodLabel: 'Day goal · Sun 25 Oct 2026',
  routineLabel: 'Deep Work · 09:00',
  goalRefLabel: 'Ship the pricing page this week',
  dateLabel: 'Today · Sun 25 Oct',
  dateOptions: DATE_OPTIONS,
  tagUniverse: TAG_UNIVERSE,
  tagUsage: TAG_USAGE,
};

export const EditOpenGoal = Template.bind({});
EditOpenGoal.args = editArgs;

export const EditCompleted = Template.bind({});
EditCompleted.args = {
  ...editArgs,
  item: {
    ...ITEM,
    isComplete: true,
    subTasks: ITEM.subTasks.map((subtask) => ({ ...subtask, isComplete: true })),
  },
};

export const EditAgentTarget = Template.bind({});
EditAgentTarget.args = {
  ...editArgs,
  item: { ...ITEM, ready: true },
};

export const EditWithAgentResult = Template.bind({});
EditWithAgentResult.args = {
  ...editArgs,
  item: {
    ...ITEM,
    reward: '<p>Reviewed the pricing page copy. Three plan names are inconsistent between the cards and the FAQ.</p><p>Suggested one wording for each plan and flagged the yearly discount line.</p>',
  },
  rewardMeta: 'Updated by Copy Reviewer · end event · Today 11:42',
  rewardNew: true,
};

export const EditNoParentGoal = Template.bind({});
EditNoParentGoal.args = {
  ...editArgs,
  item: { ...ITEM, goalRef: '', subTasks: [], tags: [] },
  goalRefLabel: '',
  routineLabel: 'Inbox',
};

export const EditPastDateLocked = Template.bind({});
EditPastDateLocked.args = {
  ...editArgs,
  item: { ...ITEM, isComplete: true },
  dateLabel: 'Fri 16 Oct',
  dateLocked: true,
  dateOptions: [],
};

export const ViewOnlyPastMonth = Template.bind({});
ViewOnlyPastMonth.args = {
  ...editArgs,
  item: { ...ITEM, isComplete: true },
  dateLabel: 'Fri 18 Sep',
  dateLocked: true,
  readonly: true,
  readonlyNote: 'View only · September has ended',
};

export const CreateDayGoal = Template.bind({});
CreateDayGoal.args = {
  open: true,
  shell: 'phone',
  mode: 'create',
  seed: { period: 'day', date: '25-10-2026', taskRef: 'r4', goalRef: '' },
  routines: ROUTINES,
  goalRefOptions: [
    { id: 'wg1', body: 'Ship the pricing page this week', taskRef: 'r4' },
    { id: 'wg2', body: 'Run 25 km this week', taskRef: 'r3' },
  ],
  periodLabel: 'Day goal · Sun 25 Oct 2026',
  dateTaskMode: true,
  tagUniverse: TAG_UNIVERSE,
  tagUsage: TAG_USAGE,
};

export const CreateWithParentLocked = Template.bind({});
CreateWithParentLocked.args = {
  ...CreateDayGoal.args,
  seed: { period: 'week', date: '31-10-2026', taskRef: 'r3', goalRef: 'm2' },
  periodLabel: 'Week goal · 25 – 31 Oct',
  linkLocked: true,
  goalRefLabel: 'Base mileage: 3 runs a week',
  dateLocked: true,
  dateLabel: '25 – 31 Oct 2026',
};

export const EditTablet = Template.bind({});
EditTablet.args = {
  ...editArgs,
  shell: 'tablet',
};

export const EditDesktop = Template.bind({});
EditDesktop.args = {
  ...editArgs,
  shell: 'desktop',
};
