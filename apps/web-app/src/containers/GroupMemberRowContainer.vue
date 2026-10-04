<template>
  <!--
    One member row = one organism + one query (ARCHITECTURE.md §2).

    The query is `routinesByGroupEmail` for THIS member, so the blast radius of a
    bad read is one row. `GroupMemberWeekContainer` asks the same query with the
    same variables for the selected member, which is one cache entry shared by the
    row and the detail panel — never two reads of the same person that can drift.
  -->
  <group-member-row
    :name="displayName"
    :email="email"
    :picture="picture"
    :color="color"
    :you="you"
    :today-score="todayScore"
    :now-text="now.text"
    :live="now.live"
    :dots="dots"
    :selected="selected"
    :divided="divided"
    @open="$emit('open', email)"
  />
</template>

<script>
import GroupMemberRow from '@routine-notes/ui/organisms/GroupMemberRow/GroupMemberRow.vue';
import { avatarColor } from '@routine-notes/ui/constants/groups';
import { GROUP_MEMBER_ROUTINES_QUERY, MY_ROUTINES_QUERY } from '../composables/graphql/groupQueries';
import {
  memberDays, weekAverage, sevenDayDots, nowLine, finishedWithinHour, memberStreak,
} from '../utils/groupModel';

export default {
  name: 'GroupMemberRowContainer',
  components: { GroupMemberRow },
  props: {
    groupId: { type: String, default: '' },
    email: { type: String, required: true },
    name: { type: String, default: '' },
    picture: { type: String, default: '' },
    you: { type: Boolean, default: false },
    selected: { type: Boolean, default: false },
    divided: { type: Boolean, default: false },
    /** Today, DD-MM-YYYY. Owned by the page so every row shares one day. */
    today: { type: String, required: true },
    /** Minutes since midnight. The page ticks it; the row stays pure. */
    nowMinutes: { type: Number, default: 0 },
  },
  data() {
    return { memberRoutines: [], ownRoutines: [] };
  },
  apollo: {
    memberRoutines: {
      query: GROUP_MEMBER_ROUTINES_QUERY,
      // Display read: a stale or partial slice self-heals on the next paint
      // instead of lingering (ARCHITECTURE.md §3.4).
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
        // A member whose history we cannot read still belongs in the list — the
        // row degrades to "no routine logged", it does not vanish.
        console.error('[GroupMemberRowContainer] routinesByGroupEmail failed:', error);
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
        console.error('[GroupMemberRowContainer] routineSevenDays failed:', error);
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
    todayRoutine() {
      const last = this.days[this.days.length - 1];
      return last ? last.routine : null;
    },
    todayScore() {
      const last = this.days[this.days.length - 1];
      return last ? last.score : 0;
    },
    dots() {
      return sevenDayDots(this.days);
    },
    now() {
      return nowLine(this.todayRoutine, this.nowMinutes);
    },
    /**
     * What the pulse card needs from this row. The pulse averages every member,
     * and the list sorts by today's score — both are page-level facts assembled
     * from the rows, so each row reports its own numbers upward.
     */
    stats() {
      return {
        email: this.email,
        name: this.displayName,
        picture: this.picture,
        color: this.color,
        you: this.you,
        todayScore: this.todayScore,
        average: weekAverage(this.days),
        streak: memberStreak(this.days),
        finishedRecently: finishedWithinHour(this.todayRoutine, this.nowMinutes),
        hasData: this.days.some((day) => day.hasData),
      };
    },
  },
  watch: {
    stats: {
      immediate: true,
      handler(next, previous) {
        // Emitting only on a real change keeps the page off a render loop: the
        // page writes these into a map the sort order reads back.
        if (previous && JSON.stringify(next) === JSON.stringify(previous)) return;
        this.$emit('stats', next);
      },
    },
  },
};
</script>
