<template>
  <!--
    The members card: one organism (`GroupMemberList`) + one query
    (`getUsersByGroupId`).

    The rows arrive through the list's default slot as `GroupMemberRowContainer`s
    rather than as props, because each member's week is its own read. Slot
    children are containers, not markup — the list organism stays a function of
    its props.
  -->
  <group-member-list
    :pending="pending"
    :full="full"
    :empty="!sortedMembers.length && !pending.length"
    @invite="$emit('invite')"
    @cancel-invite="$emit('cancel-invite', $event)"
  >
    <group-member-row-container
      v-for="(member, index) in sortedMembers"
      :key="member.email"
      :group-id="groupId"
      :email="member.email"
      :name="member.name"
      :picture="member.picture"
      :you="isYou(member)"
      :selected="member.email === selectedEmail"
      :divided="index > 0"
      :today="today"
      :now-minutes="nowMinutes"
      @open="$emit('open', $event)"
      @stats="$emit('stats', $event)"
    />
  </group-member-list>
</template>

<script>
import GroupMemberList from '@routine-notes/ui/organisms/GroupMemberList/GroupMemberList.vue';
import { GROUP_MEMBERS_QUERY } from '../composables/graphql/groupQueries';
import { sortMembers } from '../utils/groupModel';
import GroupMemberRowContainer from './GroupMemberRowContainer.vue';

export default {
  name: 'GroupMembersContainer',
  components: { GroupMemberList, GroupMemberRowContainer },
  props: {
    groupId: { type: String, default: '' },
    /** `{ name, email, picture }` of the signed-in user. */
    me: { type: Object, default: () => ({}) },
    /** Sent invites awaiting acceptance — from `pendingInvites`, see the page's note. */
    pending: { type: Array, default: () => [] },
    /** email -> row stats, collected by the page. Drives the sort order. */
    stats: { type: Object, default: () => ({}) },
    selectedEmail: { type: String, default: '' },
    today: { type: String, required: true },
    nowMinutes: { type: Number, default: 0 },
    full: { type: Boolean, default: false },
  },
  data() {
    return { groupUsers: [] };
  },
  apollo: {
    groupUsers: {
      query: GROUP_MEMBERS_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { groupId: this.groupId };
      },
      skip() {
        return !this.groupId;
      },
      update(data) {
        return (data && data.getUsersByGroupId) || [];
      },
      error(error) {
        console.error('[GroupMembersContainer] getUsersByGroupId failed:', error);
      },
    },
  },
  computed: {
    myEmail() {
      return String(this.me.email || '').toLowerCase();
    },
    /**
     * You are always in your own list — before the read lands, and when you are
     * in no group at all (the server returns nothing for an empty `groupId`).
     * De-duped by email so you never appear twice.
     */
    members() {
      const list = [];
      const seen = {};
      const push = (member) => {
        if (!member || !member.email) return;
        const key = String(member.email).toLowerCase();
        if (seen[key]) return;
        seen[key] = true;
        list.push(member);
      };
      push({ name: this.me.name, email: this.me.email, picture: this.me.picture });
      (this.groupUsers || []).forEach(push);
      return list;
    },
    /** You first, then today's score descending (`groupModel.sortMembers`). */
    sortedMembers() {
      const withScores = this.members.map((member) => ({
        ...member,
        todayScore: (this.stats[member.email] || {}).todayScore || 0,
      }));
      return sortMembers(withScores, this.me.email);
    },
  },
  watch: {
    members: {
      immediate: true,
      handler(next) {
        // The page needs the roster for the 10-member cap, the pulse's member
        // count, the invite form's duplicate check and the leave sheet's names.
        this.$emit('members', next);
      },
    },
  },
  methods: {
    isYou(member) {
      return String(member.email || '').toLowerCase() === this.myEmail;
    },
  },
};
</script>
