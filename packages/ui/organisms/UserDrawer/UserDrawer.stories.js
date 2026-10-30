import UserDrawer from './UserDrawer.vue';
import { MORE_NAV } from '../../constants/navigation';

export default {
  title: 'Organisms/UserDrawer',
  component: UserDrawer,
  argTypes: {
    value: { control: 'boolean' },
    name: { control: 'text' },
    picture: { control: 'text' },
    stimulusTotals: { control: 'object' },
    streakDays: { control: 'number' },
    streakHint: { control: 'text' },
    navItems: { control: 'object' },
    timing: { control: 'object' },
  },
};

// A self-contained avatar so the story needs no static files from the web app.
const AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#288bd5"/><text x="48" y="62" font-family="Arial" font-size="40" font-weight="700" text-anchor="middle" fill="#fff">SR</text></svg>',
)}`;

const slots = [
  {
    id: 'a', name: 'Wake up · brush · invest', time: '05:30', state: 'onTime',
  },
  {
    id: 'b', name: 'Jogging', time: '07:15', state: 'onTime',
  },
  {
    id: 'c', name: 'Deep Work', time: '09:00', state: 'late',
  },
  {
    id: 'd', name: 'Workout', time: '19:30', state: 'pending',
  },
  {
    id: 'e', name: 'Family time', time: '21:00', state: 'pending',
  },
];

const navItems = MORE_NAV.map((item) => ({ ...item, active: item.key === 'progress' }));

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { UserDrawer },
  template: '<UserDrawer v-bind="$props" @input="() => {}" @navigate="() => {}" />',
});

export const Default = Template.bind({});
Default.args = {
  value: true,
  name: 'Sam Rivera',
  picture: AVATAR,
  stimulusTotals: { D: 92, K: 64, G: 48 },
  streakDays: 12,
  streakHint: 'Keep it going - tick today to make it 13',
  navItems,
  timing: {
    slots,
    counts: {
      onTime: 2, late: 1, missed: 0, pending: 2,
    },
    nextIndex: 3,
    skip: false,
    rate: 74,
    delta: 6,
  },
};

export const NewUser = Template.bind({});
NewUser.args = {
  value: true,
  name: 'Sam Rivera',
  picture: AVATAR,
  stimulusTotals: { D: 0, K: 0, G: 0 },
  streakDays: 0,
  streakHint: 'Tick your first routine to start a streak',
  navItems: MORE_NAV,
  timing: null,
};

export const OverAchieved = Template.bind({});
OverAchieved.args = {
  value: true,
  name: 'Sam Rivera',
  picture: AVATAR,
  stimulusTotals: { D: 100, K: 140, G: 100 },
  streakDays: 41,
  streakHint: 'Your longest streak yet',
  navItems,
  timing: {
    slots: slots.map((s) => ({ ...s, state: 'onTime' })),
    counts: {
      onTime: 5, late: 0, missed: 0, pending: 0,
    },
    nextIndex: -1,
    skip: false,
    rate: 96,
    delta: 3,
  },
};
