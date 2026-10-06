<template>
  <routine-day-plan
    :items="items"
    :loading="!loaded"
    :shell="shell"
    :selected-id="selectedId"
    :flash-id="flashId"
    :agents="agentNames"
    :goals="yearGoals"
    v-on="$listeners"
  />
</template>

<script>
/**
 * Read container for the Routines screen's body (ARCHITECTURE.md §2).
 *
 * Owns ONE operation — `routineItems` — and feeds the one organism that draws
 * both the dial and the timeline. `cache-and-network` so a stale or partial
 * slice self-heals on the next paint (§3.4).
 *
 * It emits `items` upward because the PAGE needs the same list for two things a
 * container may not own: the header's "7 routines · 83 points a day" subtitle,
 * and the cross-domain slot-change notice after a save (§6 — cross-domain
 * writes are page-orchestrated). The organism's own events pass straight
 * through with `v-on="$listeners"`.
 *
 * The agent name per routine is read from the `$agent` store rather than a query:
 * that store is the agent domain's single source of truth, and giving this
 * container an `agents` query would make it a second owner of it.
 *
 * NOTE there is no `busy` prop and no skeleton gate on "a request is in flight"
 * (§3.7). Every control here is navigational — tapping a row opens a local
 * editor — so there is nothing to protect by disabling.
 *
 * What it DOES track is whether the list has arrived at all (`loaded`). Before
 * the first result, `[]` means "unknown", not "no routines": painting it drew
 * "No routines yet · 0 points" for a moment on every cold load, and a New
 * routine tapped in that window worked the day's points budget out against an
 * empty day (E2E BUG-5). So the organism shows a loading line instead, and the
 * list is not published to the page until it is real.
 */
import RoutineDayPlan from '@routine-notes/ui/organisms/RoutineDayPlan/RoutineDayPlan.vue';
import { sortByTime } from '@routine-notes/ui/utils/dayDial';
import { ROUTINE_SETTINGS_ITEMS_QUERY } from '../composables/graphql/routineSettingsQueries';

export default {
  name: 'RoutineDayPlanContainer',

  components: { RoutineDayPlan },

  props: {
    shell: { type: String, default: 'phone' },
    selectedId: { type: String, default: '' },
    /** The just-saved routine, which tints its row once. */
    flashId: { type: String, default: '' },
    /** routine id -> `{ id, body, pct }`, from RoutineYearGoalLinksContainer. */
    yearGoals: { type: Object, default: () => ({}) },
  },

  data() {
    return { routineItems: [], loaded: false };
  },

  apollo: {
    routineItems: {
      query: ROUTINE_SETTINGS_ITEMS_QUERY,
      fetchPolicy: 'cache-and-network',
      update(data) {
        return (data && data.routineItems) || [];
      },
      /** A cache hit counts — it is the same list, and paints without a flash. */
      result(result) {
        if (result && result.data && Array.isArray(result.data.routineItems)) this.loaded = true;
      },
      /**
       * A failed read falls back to what the screen did before: an honest empty
       * list beats a spinner that never ends.
       */
      error() {
        this.loaded = true;
      },
    },
  },

  computed: {
    /**
     * De-duped and schedule-ordered before it reaches the organism: a routine
     * item's `_id` is reused across days, and a duplicate id is a duplicate
     * `:key` (§3.6).
     */
    items() {
      return sortByTime(this.routineItems);
    },

    /** The list as the page may see it: `null` until the first result lands. */
    published() {
      return this.loaded ? this.items : null;
    },

    /** routine id -> agent name, for the blue agent chip on a row. */
    agentNames() {
      const map = {};
      ((this.$agent && this.$agent.agents) || []).forEach((agent) => {
        if (agent && agent.taskRef && agent.name) map[String(agent.taskRef)] = agent.name;
      });
      return map;
    },
  },

  watch: {
    // One publisher, so the page cannot see the list twice per payload — and
    // never before it has loaded, so the page's first `items` is the real list.
    published: {
      immediate: true,
      handler(list) {
        if (list) this.$emit('items', list);
      },
    },
  },

  mounted() {
    // The agent chips need the store warm; the modal container refetches it
    // after its own writes.
    if (this.$agent) this.$agent.fetchAll();
  },

  methods: {
    /**
     * Re-read the list. Apollo 2.x cannot evict, so an add or a delete heals the
     * list from the server rather than by cloning it (§3.1). An update needs
     * nothing: the mutation returns the complete entity.
     */
    refresh() {
      const query = this.$apollo && this.$apollo.queries && this.$apollo.queries.routineItems;
      return query ? query.refetch() : Promise.resolve();
    },
  },
};
</script>
