<template>
  <!--
    The pulse card's container home. It owns no GraphQL: every number it shows is
    a *derivation* of the per-member reads the row containers already own — the
    same shape as `StimulusSummaryContainer`, which derives D/K/G totals rather
    than querying them (ARCHITECTURE.md §7).
  -->
  <group-pulse-card
    :average="pulse.average"
    :line="pulse.line"
    :faces="faces"
    :done-count="doneCount"
    :member-count="memberCount"
  />
</template>

<script>
import GroupPulseCard from '@routine-notes/ui/organisms/GroupPulseCard/GroupPulseCard.vue';
import { initials } from '@routine-notes/ui/constants/groups';
import { groupPulse, sortMembers } from '../utils/groupModel';

/** Enough faces to read as a group; more would just shrink the line beside them. */
const MAX_FACES = 5;

export default {
  name: 'GroupPulseContainer',
  components: { GroupPulseCard },
  props: {
    /** `{ name, email, picture }` per member — the roster. */
    members: { type: Array, default: () => [] },
    /** email -> `{ average, todayScore, finishedRecently, color, ... }`. */
    stats: { type: Object, default: () => ({}) },
    myEmail: { type: String, default: '' },
  },
  computed: {
    /** Same order as the list, so the pulse line names people in list order. */
    entries() {
      const rows = this.members.map((member) => {
        const stat = this.stats[member.email] || {};
        return {
          email: member.email,
          name: member.name || member.email,
          picture: member.picture,
          color: stat.color,
          average: stat.average || 0,
          todayScore: stat.todayScore || 0,
          finishedRecently: !!stat.finishedRecently,
        };
      });
      return sortMembers(rows, this.myEmail);
    },
    pulse() {
      // `myEmail` keeps you out of the "could use a nudge" names.
      return groupPulse(this.entries, this.myEmail);
    },
    recent() {
      return this.entries.filter((entry) => entry.finishedRecently);
    },
    doneCount() {
      return this.recent.length;
    },
    memberCount() {
      return this.members.length;
    },
    faces() {
      return this.recent.slice(0, MAX_FACES).map((entry) => ({
        key: entry.email,
        name: entry.name,
        initials: initials(entry.name),
        color: entry.color,
        picture: entry.picture,
      }));
    },
  },
};
</script>
