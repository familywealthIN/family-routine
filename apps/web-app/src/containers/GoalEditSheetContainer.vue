<template>
  <!--
    The goal editor for the Goals and Year Goals pages: the SAME GoalItemSheet
    (and its write container) that Home opens from a checklist row, so a goal
    edited anywhere looks and behaves the same. It replaces the old fullscreen
    GoalCreation dialog on those pages.

    What this container adds is only what those pages lack:
    * a live item — the pages hand over a shallow copy from their cascade read,
      so the item is re-read through `goalItem` and follows every write;
    * the labels the sheet shows (period, routine, date), built from the item's
      own address.
    Completion stays page-orchestrated (a tick can close the week, month and year
    above it), so `toggle-item` is forwarded as `toggle`.
  -->
  <goal-item-sheet-container
    :open="open && !!liveItem"
    :shell="shell"
    :item="liveItem"
    :date="address.date"
    :period="address.period"
    :period-label="periodLabel"
    :routine-label="routineLabel"
    :goal-ref-label="goalRefLabel"
    :readonly="readonly"
    :readonly-note="readonlyNote"
    :date-label="dateLabel"
    :date-locked="dateLocked"
    :date-options="dateOptions"
    :tag-universe="tagUniverse"
    @close="$emit('close')"
    @toggle-item="$emit('toggle', { ...address, ...liveItem })"
    @changed="onChanged"
  />
</template>

<script>
import moment from 'moment';
import GoalItemSheetContainer from './GoalItemSheetContainer.vue';
import { GOAL_ITEM_LIVE_QUERY, GOAL_ITEM_PARENT_QUERY } from '../composables/graphql/goalItemQueries';

const PERIOD_NAMES = {
  day: 'Day goal', week: 'Week goal', month: 'Month goal', year: 'Year goal',
};
const DATE_PICKS = [
  { key: 'today', label: 'Today', days: 0 },
  { key: 'tomorrow', label: 'Tomorrow', days: 1 },
];

export default {
  name: 'GoalEditSheetContainer',
  components: { GoalItemSheetContainer },
  props: {
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The goal item, stamped with the `period` + `date` of its Goal document. */
    item: { type: Object, default: null },
    /** `[{ id, name, time }]`, for the routine row. */
    routines: { type: Array, default: () => [] },
    /** View only: the same sheet, every input disabled. */
    readonly: { type: Boolean, default: false },
    readonlyNote: { type: String, default: 'View only' },
  },
  apollo: {
    liveItem: {
      query: GOAL_ITEM_LIVE_QUERY,
      variables() {
        return { id: this.item.id, date: this.address.date, period: this.address.period };
      },
      skip() {
        return !this.open || !this.item || !this.item.id;
      },
      update(data) {
        return data && data.goalItem ? data.goalItem : null;
      },
      fetchPolicy: 'cache-and-network',
    },
    // What the item rolls up into, for Linked to. Without it the sheet said
    // "Not linked" for every week and day goal on Goals and Year Goals, even
    // though those pages draw them under their parent.
    parentItem: {
      query: GOAL_ITEM_PARENT_QUERY,
      variables() {
        return { id: this.parentId };
      },
      skip() {
        return !this.open || !this.parentId;
      },
      update(data) {
        return data && data.goalItemById ? data.goalItemById : null;
      },
      error() {
        // A parent that is gone reads as not linked; nothing to tell the user.
        this.parentItem = null;
      },
    },
  },
  data() {
    return { liveItem: null, parentItem: null };
  },
  computed: {
    address() {
      const item = this.item || {};
      return { period: item.period || 'day', date: item.date || '' };
    },
    when() {
      return moment(this.address.date, 'DD-MM-YYYY');
    },
    periodLabel() {
      const name = PERIOD_NAMES[this.address.period] || 'Goal';
      return this.when.isValid() ? `${name} · ${this.when.format('D MMM YYYY')}` : name;
    },
    parentId() {
      const item = this.liveItem || this.item;
      return (item && item.goalRef) || '';
    },
    goalRefLabel() {
      const parent = this.parentItem;
      return parent && String(parent.id) === String(this.parentId) ? parent.body || '' : '';
    },
    routineLabel() {
      const ref = this.liveItem && this.liveItem.taskRef;
      const routine = ref && this.routines.find((r) => String(r.id) === String(ref));
      if (!routine) return 'Inbox';
      return routine.time ? `${routine.name} · ${routine.time}` : routine.name;
    },
    dateLabel() {
      if (!this.when.isValid()) return '';
      if (this.address.period !== 'day') return this.when.format('ddd D MMM');
      const prefix = this.when.isSame(moment(), 'day') ? 'Today · ' : '';
      return `${prefix}${this.when.format('ddd D MMM')}`;
    },
    /**
     * Day items follow Home's rule: finished work on a past day is locked, an
     * open one can be carried forward. A week, month or year goal is addressed
     * by its period, so it offers no day chips at all.
     */
    isPastDay() {
      return this.address.period === 'day' && this.when.isBefore(moment(), 'day');
    },
    dateLocked() {
      return this.isPastDay && !!(this.liveItem && this.liveItem.isComplete);
    },
    dateOptions() {
      if (this.address.period !== 'day') return [];
      const today = moment().startOf('day');
      const picks = DATE_PICKS.map((pick) => {
        const date = today.clone().add(pick.days, 'days').format('DD-MM-YYYY');
        return {
          key: pick.key, label: pick.label, date, active: date === this.address.date,
        };
      });
      const monday = today.clone().add(1, 'week').startOf('isoWeek');
      const mondayDate = monday.format('DD-MM-YYYY');
      if (!picks.some((pick) => pick.date === mondayDate)) {
        picks.push({
          key: 'monday', label: monday.format('ddd'), date: mondayDate, active: mondayDate === this.address.date,
        });
      }
      return picks;
    },
    tagUniverse() {
      let remembered = [];
      try {
        remembered = JSON.parse(localStorage.getItem('userTags') || '[]') || [];
      } catch (e) {
        remembered = [];
      }
      const own = (this.liveItem && this.liveItem.tags) || [];
      return [...new Set([...own, ...remembered])];
    },
  },
  methods: {
    /** A move or delete takes the item off the read the page is showing. */
    onChanged(change) {
      this.$emit('changed', change);
      if (change && (change.op === 'delete' || change.op === 'move-date')) this.$emit('close');
    },
  },
};
</script>
