import RoutineFocusCard from './RoutineFocusCard.vue';
import RoutineChatThread from '../RoutineChatThread/RoutineChatThread.vue';
import { CASCADE_UNIT_STYLE } from '../../constants/routineFocus';

export default {
  title: 'Organisms/RoutineFocusCard',
  component: RoutineFocusCard,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    routine: { control: 'object' },
    endTime: { control: 'text' },
    statusLabel: { control: 'text' },
    statusColor: { control: 'color' },
    leftLabel: { control: 'text' },
    showBackToNow: { control: 'boolean' },
    elapsedPct: { control: { type: 'range', min: 0, max: 100 } },
    items: { control: 'object' },
    doneCount: { control: 'number' },
    totalCount: { control: 'number' },
    period: { control: { type: 'select', options: ['day', 'week', 'month', 'year'] } },
    checklistOpen: { control: 'boolean' },
    agentStage: {
      control: { type: 'select', options: ['none', 'waiting', 'running', 'listening', 'firing', 'finished', 'failed', 'stalled'] },
    },
    variant: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    skipped: { control: 'boolean' },
    showResultLink: { control: 'boolean' },
    cascade: { control: 'object' },
    loading: { control: 'boolean' },
    flying: { control: 'boolean' },
  },
};

const NOW = {
  id: 'dw',
  name: 'Deep Work',
  time: '09:00',
  points: 12,
  stimulus: 'G',
  ticked: false,
  passed: false,
  isCurrent: true,
  redeemable: false,
  buttonGlyph: 'more_horiz',
  buttonBg: '#f5f5f5',
  buttonFg: 'rgba(0,0,0,.87)',
};

const TICKED = {
  ...NOW,
  ticked: true,
  buttonGlyph: 'check',
  buttonBg: '#4CAF50',
  buttonFg: '#fff',
};

const items = [
  {
    id: 'g1', body: 'Ship the pricing page', isComplete: true, subDone: 2, subTotal: 3,
  },
  { id: 'g2', body: 'Draft the onboarding email', isComplete: false },
  {
    id: 'g3', body: 'Run 5 km', isComplete: false, hasReward: true, ready: true,
  },
];

const unit = (label, sub, state) => {
  const style = CASCADE_UNIT_STYLE[state];
  return {
    label, sub, state, icon: style.icon, color: style.color, bg: style.bg, fg: 'rgba(0,0,0,.75)',
  };
};

const cascade = {
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
  units: [
    unit('Mon', '19', 'done'),
    unit('Tue', '20', 'done'),
    unit('Wed', '21', 'partial'),
    unit('Thu', '22', 'done'),
    unit('Fri', '23', 'missed'),
    unit('Sat', '24', 'done'),
    unit('Sun', '25', 'active'),
  ],
  linked: [],
  linkedLabel: 'Linked day goals',
  parent: 'Rolls up into the next period’s goal',
};

const messages = [
  {
    id: 'm1', from: 'routine', kind: 'event', text: 'Routine started · 09:00', tone: 'blue', icon: 'play_circle',
  },
  {
    id: 'm2', from: 'me', kind: 'text', text: 'What should I tackle first?',
  },
  {
    id: 'm3', from: 'routine', kind: 'text', text: 'Start with Ship the pricing page. It is two of three subtasks away.',
  },
];

const WIDTH = { phone: 412, tablet: 560, desktop: 560 };

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineFocusCard, RoutineChatThread },
  data: () => ({ messages }),
  computed: {
    frame() {
      return `box-sizing:border-box;width:${WIDTH[this.variant] || 412}px;height:760px;padding:8px;background:#f4f4f4`;
    },
  },
  template: `
    <div :style="frame">
      <RoutineFocusCard v-bind="$props" @action="() => {}" @set-period="() => {}" @toggle-item="() => {}" @open-item="() => {}" @add-task="() => {}" @toggle-checklist="() => {}">
        <RoutineChatThread slot="thread" :messages="routine && routine.id === 'dw' ? messages : []" :goal-items="items" :routine-name="routine && routine.name" />
      </RoutineFocusCard>
    </div>`,
});

const nowBase = {
  routine: NOW,
  endTime: '12:00',
  statusLabel: 'In progress',
  statusColor: '#FF9800',
  leftLabel: '1h 50m left',
  elapsedPct: 38,
  items,
  doneCount: 1,
  totalCount: 3,
  period: 'day',
};

export const PhoneToday = Template.bind({});
PhoneToday.args = { ...nowBase, variant: 'phone' };

export const PhoneTicked = Template.bind({});
PhoneTicked.args = {
  ...nowBase,
  variant: 'phone',
  routine: TICKED,
  statusLabel: 'Ticked',
  statusColor: '#4CAF50',
  leftLabel: 'On time',
  elapsedPct: 100,
  doneCount: 2,
};

// On the phone a ticked routine's ring flies to the header (see RoutineTopBar's
// AgentRunning story); the agent stage shows on the card's own ring on the
// large shells, and while the tick is still waiting to dispatch.
export const PhoneAgentWaiting = Template.bind({});
PhoneAgentWaiting.args = {
  ...nowBase,
  variant: 'phone',
  agentStage: 'waiting',
};

export const TabletAgentRunning = Template.bind({});
TabletAgentRunning.args = {
  ...nowBase,
  variant: 'tablet',
  routine: TICKED,
  agentStage: 'running',
  statusLabel: 'Ticked',
  statusColor: '#4CAF50',
  elapsedPct: 100,
  showResultLink: false,
};

export const DesktopAgentFinished = Template.bind({});
DesktopAgentFinished.args = {
  ...nowBase,
  variant: 'desktop',
  routine: TICKED,
  agentStage: 'finished',
  statusLabel: 'Ticked',
  statusColor: '#4CAF50',
  elapsedPct: 100,
  showResultLink: true,
};

export const PhoneWeekGoal = Template.bind({});
PhoneWeekGoal.args = { ...nowBase, variant: 'phone', period: 'week', cascade };

export const PhoneNoGoalForPeriod = Template.bind({});
PhoneNoGoalForPeriod.args = { ...nowBase, variant: 'phone', period: 'month', cascade: null };

export const PhoneLoading = Template.bind({});
PhoneLoading.args = {
  ...nowBase, variant: 'phone', loading: true, items: [], doneCount: 0, totalCount: 0,
};

export const PhoneSkippedDay = Template.bind({});
PhoneSkippedDay.args = { ...nowBase, variant: 'phone', skipped: true };

export const PhoneChecklistCollapsed = Template.bind({});
PhoneChecklistCollapsed.args = { ...nowBase, variant: 'phone', checklistOpen: false };

export const PhoneUpcoming = Template.bind({});
PhoneUpcoming.args = {
  ...nowBase,
  variant: 'phone',
  routine: {
    ...NOW,
    id: 'wo',
    name: 'Workout',
    time: '19:30',
    isCurrent: false,
    buttonGlyph: 'alarm',
    buttonDisabled: true,
  },
  endTime: '20:30',
  statusLabel: 'Up next',
  statusColor: 'rgba(0,0,0,.45)',
  leftLabel: 'Starts in 8h 40m',
  elapsedPct: 0,
  showBackToNow: true,
  items: [],
  doneCount: 0,
  totalCount: 0,
};

export const TabletToday = Template.bind({});
TabletToday.args = { ...nowBase, variant: 'tablet' };

export const TabletTicked = Template.bind({});
TabletTicked.args = {
  ...nowBase,
  variant: 'tablet',
  routine: TICKED,
  statusLabel: 'Ticked',
  statusColor: '#4CAF50',
  leftLabel: 'On time',
  elapsedPct: 100,
  doneCount: 2,
};

export const DesktopToday = Template.bind({});
DesktopToday.args = { ...nowBase, variant: 'desktop' };
