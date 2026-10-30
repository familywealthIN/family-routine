import GroupMemberRow from './GroupMemberRow.vue';
import {
  TODAY_DOT_BG, scoreColor, scoreIcon, avatarColor,
} from '../../constants/groups';

// Same output shape as `sevenDayDots` in apps/web-app/src/utils/groupModel.js:
// six scored days, then today as a flat blue tint with no glyph.
const dots = (scores) => scores.map((score, index) => {
  const isToday = index === scores.length - 1;
  const key = `${19 + index}-10-2026`;
  if (isToday) {
    return {
      key, title: 'Today · still going', bg: TODAY_DOT_BG, icon: '', isToday: true,
    };
  }
  return {
    key, title: `${score}%`, bg: scoreColor(score), icon: scoreIcon(score), isToday: false,
  };
});

// A fake initials avatar for the picture path; storybook serves no /img folder.
const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#00838f"/><text x="48" y="62" font-family="Roboto, Arial, sans-serif" font-size="40" font-weight="500" fill="#fff" text-anchor="middle">JO</text></svg>',
)}`;

export default {
  title: 'Organisms/GroupMemberRow',
  component: GroupMemberRow,
  argTypes: {
    name: { control: 'text' },
    email: { control: 'text' },
    picture: { control: 'text' },
    color: { control: 'color' },
    you: { control: 'boolean' },
    todayScore: { control: { type: 'range', min: 0, max: 100 } },
    nowText: { control: 'text' },
    live: { control: 'boolean' },
    dots: { control: 'object' },
    pending: { control: 'boolean' },
    selected: { control: 'boolean' },
    divided: { control: 'boolean' },
  },
};

// The row sits inside the members card on the real page; give it the same white
// surface so its hairlines and tints read correctly.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GroupMemberRow },
  template: '<div style="max-width: 412px; background: #fff; border-radius: 20px; overflow: hidden"><GroupMemberRow v-bind="$props" @open="onOpen" @cancel="onCancel" /></div>',
  methods: {
    onOpen(email) {
      console.log('open', email);
    },
    onCancel() {
      console.log('cancel invite');
    },
  },
});

export const YouLive = Template.bind({});
YouLive.args = {
  name: 'Alex Rivera',
  email: 'alex@example.com',
  color: avatarColor('alex@example.com'),
  you: true,
  todayScore: 68,
  nowText: 'In Start Work · 3 of 5 done',
  live: true,
  dots: dots([82, 91, 64, 45, 100, 38, 0]),
};

export const MemberWithPicture = Template.bind({});
MemberWithPicture.args = {
  name: 'Jordan Okafor',
  email: 'jordan@example.com',
  picture: PICTURE,
  todayScore: 92,
  nowText: 'Finished Lunch Walk · 12 min ago',
  dots: dots([95, 88, 100, 76, 90, 85, 0]),
};

export const LowScoreSelected = Template.bind({});
LowScoreSelected.args = {
  name: 'Sam Taylor',
  email: 'sam@example.com',
  color: avatarColor('sam@example.com'),
  todayScore: 18,
  nowText: 'Next: Lunch Walk at 12:30',
  dots: dots([30, 20, 55, 12, 40, 25, 0]),
  selected: true,
};

export const PendingInvite = Template.bind({});
PendingInvite.args = {
  name: 'priya@example.com',
  email: 'priya@example.com',
  pending: true,
  nowText: 'Invite sent · waiting to join',
};
