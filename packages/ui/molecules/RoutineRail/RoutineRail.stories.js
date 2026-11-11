import RoutineRail from './RoutineRail.vue';
import { STIMULI } from '../../constants/routineFocus';

export default {
  title: 'Molecules/RoutineRail',
  component: RoutineRail,
  argTypes: {
    routines: { control: 'object' },
    layout: { control: { type: 'select', options: ['rows', 'chips'] } },
    tickedCount: { control: 'number' },
    dayLabel: { control: 'text' },
  },
};

const row = (id, name, time, stim, state, extra = {}) => ({
  id,
  name,
  time,
  stimulus: stim,
  stimulusColor: STIMULI[stim].color,
  stimulusTint: STIMULI[stim].tint,
  ticked: false,
  past: false,
  isFocus: false,
  ...state,
  ...extra,
});

const DONE = { stateIcon: 'check_circle', stateColor: '#4CAF50' };
const NOW = { stateIcon: 'radio_button_checked', stateColor: '#FF9800' };
const TODO = { stateIcon: 'radio_button_unchecked', stateColor: 'rgba(0,0,0,.3)' };
const MISSED = { stateIcon: 'cancel', stateColor: 'rgba(229,57,53,.55)' };

const midDay = [
  row('r1', 'Wake up · brush · invest', '05:30', 'D', DONE, { ticked: true, past: true }),
  row('r2', 'Jogging', '07:15', 'K', DONE, { ticked: true, past: true }),
  row('r3', 'Deep Work', '09:00', 'G', NOW, { isFocus: true }),
  row('r4', 'Workout', '19:30', 'K', TODO),
  row('r5', 'Family time', '21:00', 'D', TODO),
];

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineRail },
  computed: {
    frame() {
      return this.layout === 'chips' ? 'width:760px' : 'width:264px';
    },
  },
  template: '<div :style="frame"><RoutineRail v-bind="$props" @focus-routine="() => {}" /></div>',
});

export const Rows = Template.bind({});
Rows.args = { routines: midDay, layout: 'rows', tickedCount: 2, dayLabel: 'TODAY' };

export const Chips = Template.bind({});
Chips.args = { routines: midDay, layout: 'chips', tickedCount: 2 };

export const AllTicked = Template.bind({});
AllTicked.args = {
  routines: midDay.map((r) => ({
    ...r, ticked: true, past: true, isFocus: false, ...DONE,
  })),
  layout: 'rows',
  tickedCount: 5,
};

export const MissedDay = Template.bind({});
MissedDay.args = {
  routines: [
    row('m1', 'Wake up · brush · invest', '05:30', 'D', DONE, { ticked: true, past: true }),
    row('m2', 'Jogging', '07:15', 'K', MISSED, { past: true }),
    row('m3', 'Deep Work', '09:00', 'G', MISSED, { past: true }),
    row('m4', 'Workout', '19:30', 'K', MISSED, { past: true }),
  ],
  layout: 'rows',
  tickedCount: 1,
  dayLabel: 'FRI 23 OCT',
};

export const Empty = Template.bind({});
Empty.args = { routines: [], layout: 'rows', tickedCount: 0 };
