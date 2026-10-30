import RoutineCascadePanel from './RoutineCascadePanel.vue';
import { CASCADE_UNIT_STYLE } from '../../constants/routineFocus';

export default {
  title: 'Organisms/RoutineCascadePanel',
  component: RoutineCascadePanel,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    cascade: { control: 'object' },
  },
};

// Same shape the web app's buildCascade() hands over: a unit is a state plus the
// icon, colour and background that state maps to in CASCADE_UNIT_STYLE.
const unit = (label, sub, state) => {
  const style = CASCADE_UNIT_STYLE[state];
  return {
    label,
    sub,
    state,
    icon: style.icon,
    color: style.color,
    bg: style.bg,
    fg: state === 'none' ? 'rgba(0,0,0,.35)' : 'rgba(0,0,0,.75)',
  };
};

const weekUnits = [
  unit('Mon', '19', 'done'),
  unit('Tue', '20', 'done'),
  unit('Wed', '21', 'partial'),
  unit('Thu', '22', 'done'),
  unit('Fri', '23', 'missed'),
  unit('Sat', '24', 'done'),
  unit('Sun', '25', 'active'),
];

const linked = [
  {
    id: 'l1', label: 'Mon', body: 'Run 5 km', isComplete: true, detail: { status: 'Done' },
  },
  {
    id: 'l2', label: 'Wed', body: 'Draft the onboarding email', isComplete: false, detail: { status: 'Active' },
  },
  {
    id: 'l3', label: 'Fri', body: 'Ship the pricing page', isComplete: false, detail: { status: 'Missed' },
  },
];

const week = {
  title: 'Run 5 km, three times',
  range: 'Week of 19 – 25 Oct',
  unitName: 'milestones',
  done: 4,
  threshold: 5,
  complete: false,
  statusLabel: 'Active',
  statusColor: '#FF9800',
  pct: 80,
  rule: 'Needs 5 day milestones met',
  cols: 7,
  units: weekUnits,
  linked,
  linkedLabel: 'Linked day goals',
  parent: 'Rolls up into the next period’s goal',
};

const monthUnits = [
  unit('W1', '1 Oct', 'done'),
  unit('W2', '8 Oct', 'done'),
  unit('W3', '15 Oct', 'partial'),
  unit('W4', '22 Oct', 'active'),
  unit('W5', '29 Oct', 'none'),
];

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthState = ['done', 'done', 'done', 'missed', 'done', 'done', 'partial', 'done', 'done', 'active', 'none', 'none'];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineCascadePanel },
  template: '<div style="box-sizing:border-box;width:412px;background:#fff;padding:16px;border-radius:16px"><RoutineCascadePanel v-bind="$props" /></div>',
});

export const Week = Template.bind({});
Week.args = { cascade: week };

export const WeekDone = Template.bind({});
WeekDone.args = {
  cascade: {
    ...week,
    done: 6,
    threshold: 6,
    complete: true,
    statusLabel: 'Done',
    statusColor: '#4CAF50',
    pct: 100,
    units: weekUnits.map((u, i) => (i === 6 ? unit('Sun', '25', 'done') : u)),
    linked: linked.map((l) => ({ ...l, isComplete: true, detail: { status: 'Done' } })),
  },
};

export const Month = Template.bind({});
Month.args = {
  cascade: {
    title: 'Launch the mobile dashboard',
    range: 'October 2026',
    unitName: 'milestones',
    done: 2,
    threshold: 3,
    complete: false,
    statusLabel: 'Active',
    statusColor: '#FF9800',
    pct: 67,
    rule: 'Needs 3 week milestones met',
    cols: 5,
    units: monthUnits,
    linked: [],
    linkedLabel: 'Linked week goals',
    parent: 'Top of the cascade',
  },
};

export const Year = Template.bind({});
Year.args = {
  cascade: {
    title: 'Run a half marathon',
    range: '2026',
    unitName: 'milestones',
    done: 8,
    threshold: 12,
    complete: false,
    statusLabel: 'Active',
    statusColor: '#FF9800',
    pct: 100,
    rule: 'Needs 6 month milestones met',
    cols: 6,
    units: months.map((m, i) => unit(m, '', monthState[i])),
    linked: [],
    linkedLabel: 'Linked month goals',
    parent: 'Top of the cascade',
  },
};

export const NoGoalLinked = Template.bind({});
NoGoalLinked.args = { cascade: null };
