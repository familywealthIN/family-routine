import RoutineTopBar from './RoutineTopBar.vue';

export default {
  title: 'Organisms/RoutineTopBar',
  component: RoutineTopBar,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    title: { control: 'text' },
    subtitle: { control: 'text' },
    ticked: { control: 'boolean' },
    routineName: { control: 'text' },
    flying: { control: 'boolean' },
    miniColor: { control: 'color' },
    miniGlyph: { control: 'text' },
    miniBreathing: { control: 'boolean' },
    inboxCount: { control: 'number' },
    available: { control: 'number' },
    pendingToday: { control: 'number' },
    entitled: { control: 'boolean' },
    pointsLoading: { control: 'boolean' },
    pointsError: { control: 'boolean' },
    picture: { control: 'text' },
    userName: { control: 'text' },
  },
};

// A self-contained avatar so the story needs no static files from the web app.
const AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#288bd5"/><text x="48" y="62" font-family="Arial" font-size="40" font-weight="700" text-anchor="middle" fill="#fff">SR</text></svg>',
)}`;

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { RoutineTopBar },
  template: '<div style="width:412px;background:#f4f4f4"><RoutineTopBar v-bind="$props" /></div>',
});

const base = {
  title: 'Home',
  subtitle: '3 routines left · 5/9 tasks',
  picture: AVATAR,
  userName: 'Sam Rivera',
  available: 1420,
};

export const Default = Template.bind({});
Default.args = { ...base };

export const WithInbox = Template.bind({});
WithInbox.args = { ...base, inboxCount: 4, pendingToday: 120 };

export const RoutineTicked = Template.bind({});
RoutineTicked.args = {
  ...base,
  ticked: true,
  routineName: 'Deep Work',
  subtitle: '2 routines left · 7/9 tasks',
};

export const AgentRunning = Template.bind({});
AgentRunning.args = {
  ...base,
  ticked: true,
  routineName: 'Deep Work',
  miniColor: '#1976d2',
  miniGlyph: 'smart_toy',
  miniTitle: 'Agent running',
  miniBreathing: true,
};

export const PointsUnavailable = Template.bind({});
PointsUnavailable.args = { ...base, pointsError: true };

export const Subscribed = Template.bind({});
Subscribed.args = { ...base, entitled: true, inboxCount: 2 };
