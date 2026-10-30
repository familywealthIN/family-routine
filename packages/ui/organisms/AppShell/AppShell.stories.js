import AppShell from './AppShell.vue';

export default {
  title: 'Organisms/AppShell',
  component: AppShell,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    shell: { control: { type: 'select', options: ['phone', 'tablet', 'desktop'] } },
    active: { control: 'text' },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    points: { control: 'number' },
    pointsEntitled: { control: 'boolean' },
    pointsLoading: { control: 'boolean' },
    pointsError: { control: 'boolean' },
    user: { control: 'object' },
    streakDays: { control: 'number' },
    streakHint: { control: 'text' },
    scores: { control: 'object' },
    timing: { control: 'object' },
    yearAverage: { control: 'number' },
    statusBar: { control: 'boolean' },
    moreInitiallyOpen: { control: 'boolean' },
    clock: { control: 'text' },
  },
};

// Self-contained images so the story needs no static files from the web app.
const svg = (markup) => `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`;
const AVATAR = svg('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#288bd5"/><text x="48" y="62" font-family="Arial" font-size="40" font-weight="700" text-anchor="middle" fill="#fff">SR</text></svg>');
const LOGO = svg('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" rx="22" fill="#288bd5"/><path d="M26 50l15 15 30-34" stroke="#fff" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>');

const USER = { name: 'Sam Rivera', email: 'sam@example.com', picture: AVATAR };

const routines = [
  ['05:30', 'Wake up · brush · invest', 'D', true],
  ['07:15', 'Jogging', 'K', true],
  ['09:00', 'Deep Work', 'G', false],
  ['19:30', 'Workout', 'K', false],
];

const page = `
  <div style="padding:16px;font-family:'Plus Jakarta Sans',system-ui,sans-serif">
    <div v-for="r in rows" :key="r[0]" style="display:flex;align-items:center;gap:12px;background:#fff;border-radius:14px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 2px rgba(0,0,0,.06)">
      <span style="color:rgba(0,0,0,.54);font-size:14px;width:44px">{{ r[0] }}</span>
      <span style="flex:1;font-size:15px;font-weight:600;color:rgba(0,0,0,.87)">{{ r[1] }}</span>
      <span :style="{ color: r[3] ? '#4CAF50' : 'rgba(0,0,0,.3)', fontSize: '13px', fontWeight: 700 }">{{ r[3] ? 'Done' : 'Next' }}</span>
    </div>
  </div>`;

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { AppShell },
  data: () => ({ rows: routines }),
  template: `<AppShell v-bind="$props" @navigate="() => {}" @open-points="() => {}">${page}</AppShell>`,
});

const base = {
  active: 'goals',
  title: 'Goals',
  subtitle: 'Week of 19 - 25 Oct',
  points: 1420,
  user: USER,
  streakDays: 12,
  streakHint: 'Keep it going - tick today to make it 13',
  scores: { D: 92, K: 64, G: 48 },
  yearAverage: 62,
  logo: LOGO,
  clock: '9:41',
};

export const Phone = Template.bind({});
Phone.args = { ...base, shell: 'phone' };

export const Tablet = Template.bind({});
Tablet.args = { ...base, shell: 'tablet' };

export const Desktop = Template.bind({});
Desktop.args = { ...base, shell: 'desktop' };

export const PhonePointsUnavailable = Template.bind({});
PhonePointsUnavailable.args = {
  ...base,
  shell: 'phone',
  active: 'home',
  title: 'Home',
  subtitle: 'Sunday 25 October',
  pointsError: true,
  yearAverage: null,
  scores: null,
  streakDays: null,
};

export const DesktopMoreCollapsed = Template.bind({});
DesktopMoreCollapsed.args = {
  ...base,
  shell: 'desktop',
  active: 'agents',
  title: 'Agents',
  subtitle: '3 running',
  pointsEntitled: true,
  moreInitiallyOpen: false,
};
