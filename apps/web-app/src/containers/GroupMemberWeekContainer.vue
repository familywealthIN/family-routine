<template>
  <!--
    The selected member's week: one organism + one query (the same
    `routinesByGroupEmail` read the row container owns, with the same variables,
    so both read ONE cache entry — ARCHITECTURE.md §3.5).
  -->
  <group-member-week
    :name="displayName"
    :email="email"
    :picture="picture"
    :color="color"
    :streak="streak"
    :week-average="average"
    :today-score="todayScore"
    :day-heads="grid.dayHeads"
    :rows="grid.rows"
    :day-totals="grid.dayTotals"
    :you="you"
    :closable="closable"
    @close="$emit('close')"
  />
</template>

<script>
import GroupMemberWeek from '@routine-notes/ui/organisms/GroupMemberWeek/GroupMemberWeek.vue';
import { avatarColor } from '@routine-notes/ui/constants/groups';
import { GROUP_MEMBER_ROUTINES_QUERY, MY_ROUTINES_QUERY } from '../composables/graphql/groupQueries';
import {
  memberDays, weekAverage, weekGrid, memberStreak,
} from '../utils/groupModel';

export default {
  name: 'GroupMemberWeekContainer',
  components: { GroupMemberWeek },
  props: {
    groupId: { type: String, default: '' },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    picture: { type: String, default: '' },
    today: { type: String, required: true },
    nowMinutes: { type: Number, default: 0 },
    /** This week is the signed-in user's own (read without a group if need be). */
    you: { type: Boolean, default: false },
    /** Phone sheet: closable. Tablet/desktop panel: not. */
    closable: { type: Boolean, default: false },
  },
  data() {
    return { memberRoutines: [], ownRoutines: [] };
  },
  apollo: {
    memberRoutines: {
      query: GROUP_MEMBER_ROUTINES_QUERY,
      fetchPolicy: 'cache-and-network',
      variables() {
        return { groupId: this.groupId, email: this.email };
      },
      skip() {
        return !this.groupId || !this.email;
      },
      update(data) {
        return (data && data.routinesByGroupEmail) || [];
      },
      error(error) {
        console.error('[GroupMemberWeekContainer] routinesByGroupEmail failed:', error);
      },
    },
    /**
     * Your own week when you are in no group. `routinesByGroupEmail` needs a
     * `groupId`, so without one your row would read as seven empty days.
     */
    ownRoutines: {
      query: MY_ROUTINES_QUERY,
      fetchPolicy: 'cache-and-network',
      skip() {
        return !this.solo;
      },
      update(data) {
        return (data && data.routineSevenDays) || [];
      },
      error(error) {
        console.error('[GroupMemberWeekContainer] routineSevenDays failed:', error);
      },
    },
  },
  computed: {
    displayName() {
      return this.name || this.email;
    },
    color() {
      return avatarColor(this.email);
    },
    /** You, with no group to read through. */
    solo() {
      return this.you && !this.groupId;
    },
    days() {
      return memberDays(this.solo ? this.ownRoutines : this.memberRoutines, this.today);
    },
    grid() {
      return weekGrid(this.days, this.nowMinutes);
    },
    average() {
      return weekAverage(this.days);
    },
    todayScore() {
      const last = this.days[this.days.length - 1];
      return last ? last.score : 0;
    },
    streak() {
      return memberStreak(this.days);
    },
  },
};
</script>
