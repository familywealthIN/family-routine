import GroupPulseCard from './GroupPulseCard.vue';

// Fake initials avatar for the picture path; storybook serves no /img folder.
const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#00838f"/><text x="48" y="62" font-family="Roboto, Arial, sans-serif" font-size="40" font-weight="500" fill="#fff" text-anchor="middle">JO</text></svg>',
)}`;

// `{ key, name, initials, color, picture }` — who finished a routine in the last hour.
const FACES = [
  {
    key: 'alex', name: 'Alex Rivera', initials: 'AR', color: '#7b5ea7', picture: '',
  },
  {
    key: 'jordan', name: 'Jordan Okafor', initials: 'JO', color: '#00838f', picture: PICTURE,
  },
  {
    key: 'sam', name: 'Sam Taylor', initials: 'ST', color: '#E68900', picture: '',
  },
];

export default {
  title: 'Organisms/GroupPulseCard',
  component: GroupPulseCard,
  argTypes: {
    average: { control: { type: 'range', min: 0, max: 100 } },
    line: { control: 'text' },
    faces: { control: 'object' },
    doneCount: { control: 'number' },
    memberCount: { control: 'number' },
  },
};

const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GroupPulseCard },
  template: '<div style="max-width: 412px"><GroupPulseCard v-bind="$props" /></div>',
});

export const StrongWeek = Template.bind({});
StrongWeek.args = {
  average: 78,
  line: 'Strong week. Everyone is showing up.',
  faces: FACES,
  doneCount: 3,
  memberCount: 4,
};

export const NeedsANudge = Template.bind({});
NeedsANudge.args = {
  average: 52,
  line: 'Average across 4 members. Sam could use a nudge.',
  faces: FACES.slice(0, 1),
  doneCount: 1,
  memberCount: 4,
};

export const JustYou = Template.bind({});
JustYou.args = {
  average: 64,
  line: 'Just you so far. Invite someone to share the week with.',
  faces: [],
  doneCount: 0,
  memberCount: 1,
};
