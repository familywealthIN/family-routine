import GroupMemberList from './GroupMemberList.vue';
import GroupMemberRow from '../GroupMemberRow/GroupMemberRow.vue';
import {
  TODAY_DOT_BG, scoreColor, scoreIcon, avatarColor,
} from '../../constants/groups';

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

const MEMBERS = [
  {
    name: 'Alex Rivera', email: 'alex@example.com', you: true, todayScore: 68, nowText: 'In Start Work · 3 of 5 done', live: true, dots: dots([82, 91, 64, 45, 100, 38, 0]),
  },
  {
    name: 'Jordan Okafor', email: 'jordan@example.com', todayScore: 92, nowText: 'Finished Lunch Walk · 12 min ago', live: false, dots: dots([95, 88, 100, 76, 90, 85, 0]),
  },
  {
    name: 'Sam Taylor', email: 'sam@example.com', todayScore: 18, nowText: 'Next: Lunch Walk at 12:30', live: false, dots: dots([30, 20, 55, 12, 40, 25, 0]),
  },
];

const PENDING = [
  { id: 'p1', email: 'priya@example.com' },
  { id: 'p2', email: 'leo@example.com' },
];

export default {
  title: 'Organisms/GroupMemberList',
  component: GroupMemberList,
  argTypes: {
    pending: { control: 'object' },
    full: { control: 'boolean' },
    empty: { control: 'boolean' },
    emptyText: { control: 'text' },
  },
};

// The member rows arrive through the default slot, each owning its own read.
const Template = (args, { argTypes }) => ({
  props: Object.keys(argTypes),
  components: { GroupMemberList, GroupMemberRow },
  template: `
    <div style="max-width: 412px">
      <GroupMemberList v-bind="$props" @invite="onEvent('invite')" @cancel-invite="onEvent('cancel invite')">
        <GroupMemberRow
          v-for="(member, index) in members"
          :key="member.email"
          v-bind="member"
          :color="color(member.email)"
          :divided="index > 0"
        />
      </GroupMemberList>
    </div>`,
  data() {
    return { members: this.empty ? [] : MEMBERS };
  },
  methods: {
    color: avatarColor,
    onEvent(name) {
      console.log(name);
    },
  },
});

export const Default = Template.bind({});
Default.args = {
  pending: [],
  full: false,
  empty: false,
};

export const WithPendingInvites = Template.bind({});
WithPendingInvites.args = {
  pending: PENDING,
  full: false,
  empty: false,
};

export const Full = Template.bind({});
Full.args = {
  pending: PENDING,
  full: true,
  empty: false,
};

export const Empty = Template.bind({});
Empty.args = {
  pending: [],
  full: false,
  empty: true,
};
