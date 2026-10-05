<template>
  <!--
    Getting to another year goal. One list, three hosts:

      phone    a bottom sheet over the page
      tablet   a shelf that slides out of the 76px icon rail
      desktop  `compact`, inline in the persistent 264px sidebar

    WHY THIS OWNS ITS OVERLAY instead of sitting inside `ResponsiveSheet`:
    ResponsiveSheet unmounts its body when it closes, which is right for a form
    and wrong for this list. The same list is also the page's INDEX — the hero's
    ‹ › steppers need the ordered goals, and the page needs them to land
    somewhere when the route carries no goal id — so it has to stay mounted while
    hidden. Hence `v-show`, which also makes the slide-in replay every time
    (a CSS animation restarts when an element leaves `display: none`).

    A row never navigates away: it switches which goal the page is showing, so
    the months, the weeks and the thread all swap together.
  -->
  <div
    v-show="compact || open"
    class="rn-ygs"
    :class="[`rn-ygs--${compact ? 'inline' : shell}`, { 'rn-ygs--compact': compact }]"
    data-testid="year-goal-switcher"
  >
    <div
      v-if="!compact"
      class="rn-ygs__backdrop"
      data-testid="year-goal-switcher-backdrop"
      @click="$emit('close')"
    ></div>

    <section
      v-swipe-dismiss="{ handler: onSwipeDismiss, disabled: compact || shell !== 'phone' }"
      class="rn-ygs__panel"
    >
      <div
        v-if="shell === 'phone' && !compact"
        class="rn-ygs__grab"
        @click="$emit('close')"
      ><span></span></div>

      <header v-if="!compact" class="rn-ygs__head">
        <div class="rn-ygs__head-text">
          <div class="rn-ygs__head-title">Go to</div>
          <div class="rn-ygs__head-sub">{{ headSub }}</div>
        </div>
        <button
          type="button"
          class="rn-ygs__close"
          title="Close"
          data-testid="year-goal-switcher-close"
          @click="$emit('close')"
        ><i class="rn-mi">close</i></button>
      </header>

      <div v-if="!compact" class="rn-ygs__search">
        <i class="rn-mi rn-ygs__search-icon">search</i>
        <input
          class="rn-ygs__input"
          type="text"
          :value="query"
          placeholder="Search goals or routines"
          data-testid="year-goal-search"
          @input="$emit('query', $event.target.value)"
        />
        <button
          v-if="query"
          type="button"
          class="rn-ygs__clear"
          title="Clear"
          @click="$emit('query', '')"
        ><i class="rn-mi">close</i></button>
      </div>

      <div v-if="!compact" class="rn-ygs__sorts">
        <button
          v-for="chip in sortChips"
          :key="chip.key"
          type="button"
          class="rn-ygs__sort"
          :class="{ 'rn-ygs__sort--on': chip.key === sort }"
          :data-testid="`year-goal-sort-${chip.key}`"
          @click="$emit('sort', chip.key)"
        ><i class="rn-mi rn-ygs__sort-icon">{{ chip.icon }}</i>{{ chip.label }}</button>
      </div>

      <button
        v-if="!compact"
        type="button"
        class="rn-ygs__overview"
        data-testid="year-goal-overview"
        @click="$emit('open-overview')"
      >
        <span class="rn-ygs__overview-glyph"><i class="rn-mi">assignment</i></span>
        <span class="rn-ygs__overview-text">
          <span class="rn-ygs__overview-title">Goals overview</span>
          <span class="rn-ygs__overview-sub">Today · Week · Month · Year · Life</span>
        </span>
        <i class="rn-mi rn-ygs__overview-chev">chevron_right</i>
      </button>

      <div v-if="compact" class="rn-ygs__heading">YEAR GOALS · {{ year }}</div>

      <div class="rn-ygs__rows rn-hidescroll">
        <template v-for="(row, i) in rows">
          <div v-if="row.header" :key="`h${i}`" class="rn-ygs__group">{{ row.header }}</div>
          <button
            v-else
            :key="row.id"
            type="button"
            class="rn-ygs__row"
            :class="{ 'rn-ygs__row--active': row.isActive }"
            :data-testid="`year-goal-row-${row.id}`"
            @click="$emit('select', row.id)"
          >
            <!-- The design puts the linked routine's clock here. `GoalItem.routine`
                 resolves to `{ id, name }` only, so an unknown time prints an em
                 dash rather than a made-up hour. -->
            <span v-if="!compact" class="rn-ygs__time">{{ row.routineTime || '—' }}</span>
            <progress-ring
              class="rn-ygs__ring"
              :size="compact ? 34 : 42"
              :view-box="96"
              :r="40"
              :stroke="12"
              :value="row.percent"
              :color="row.color"
            >
              <span
                v-if="!compact"
                class="rn-ygs__ring-text"
                :style="{ color: row.color }"
              >{{ row.percent }}%</span>
            </progress-ring>
            <span class="rn-ygs__text">
              <span class="rn-ygs__title">{{ row.title }}</span>
              <span class="rn-ygs__sub">{{ subFor(row) }}</span>
            </span>
            <i v-if="row.isActive && !compact" class="rn-mi rn-ygs__check">check</i>
          </button>
        </template>

        <!-- A failed read is not an empty list: say so, and offer the re-read. -->
        <div v-if="!hasRows && failed" class="rn-ygs__none" data-testid="year-goal-failed">
          Couldn't load your year goals.
          <button
            type="button"
            class="rn-ygs__retry"
            data-testid="year-goal-retry"
            @click="$emit('retry')"
          >Retry</button>
        </div>
        <div v-else-if="!hasRows" class="rn-ygs__none" data-testid="year-goal-none">
          {{ query ? `No year goal matches “${query}”` : 'No year goals yet.' }}
        </div>
      </div>

      <div v-if="shell === 'tablet' && !compact" class="rn-ygs__foot">
        <i class="rn-mi">swipe</i>Tap Goals again to close
      </div>
    </section>
  </div>
</template>

<script>
import ProgressRing from '../../molecules/ProgressRing/ProgressRing.vue';
import { swipeDismiss } from '../../utils/swipeDismiss';

export default {
  name: 'OrganismYearGoalSwitcher',
  components: { ProgressRing },
  directives: { swipeDismiss },
  props: {
    /** `yearGoalModel.yearGoalRows()` — headers and rows in one flat list. */
    rows: { type: Array, default: () => [] },
    /** `yearGoalModel.SORT_CHIPS`. */
    sortChips: { type: Array, default: () => [] },
    sort: { type: String, default: 'routine' },
    query: { type: String, default: '' },
    /** Overlay visibility. Ignored by `compact`, which is always on screen. */
    open: { type: Boolean, default: false },
    shell: { type: String, default: 'phone' },
    /** The sidebar form: no overlay, no search, smaller rings. */
    compact: { type: Boolean, default: false },
    year: { type: Number, default: 0 },
    yearThreshold: { type: Number, default: 6 },
    /** The list read failed — render an error with Retry, never "No year goals yet." */
    failed: { type: Boolean, default: false },
  },
  computed: {
    hasRows() {
      return this.rows.some((row) => !row.header);
    },
    count() {
      return this.rows.filter((row) => !row.header).length;
    },
    headSub() {
      const n = this.count;
      return `Overview or one of ${n} year goal${n === 1 ? '' : 's'} · ${this.year}`;
    },
  },
  methods: {
    onSwipeDismiss() {
      this.$emit('close');
    },
    subFor(row) {
      if (this.compact) {
        return `${row.routineName || 'No routine'} · ${row.percent}%`;
      }
      const current = row.currentMonthBody || 'no goal yet';
      return `${row.routineName || 'No routine'} · ${row.monthsDone}/${this.yearThreshold} months`
        + ` · ${row.currentMonthLabel}: ${current}`;
    },
  },
};
</script>

<style>
.rn-ygs {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  min-width: 0;
}

/* ------------------------------------------------- overlay (phone/tablet) --- */
.rn-ygs--phone,
.rn-ygs--tablet {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 68;
}

.rn-ygs__backdrop {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(15, 23, 42, .3);
  animation: rn-fade .2s ease;
}

.rn-ygs--phone .rn-ygs__panel,
.rn-ygs--tablet .rn-ygs__panel {
  position: absolute;
  background: #fff;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.rn-ygs--phone .rn-ygs__panel {
  left: 0;
  right: 0;
  bottom: 0;
  height: 76%;
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, .18);
  padding: 0 16px env(safe-area-inset-bottom);
  animation: rn-sheet-in .25s cubic-bezier(.3, 1.1, .5, 1);
}

/* The shelf starts past the rail, so the nav stays visible and a second tap on
   Goals closes what the first one opened (Year Goals.dc.html § iPad mini). */
.rn-ygs--tablet .rn-ygs__backdrop {
  left: 76px;
  background: rgba(15, 23, 42, .25);
}

.rn-ygs--tablet .rn-ygs__panel {
  left: 76px;
  top: 0;
  bottom: 0;
  width: 360px;
  padding: 0 16px;
  box-shadow: 8px 0 24px rgba(0, 0, 0, .12);
  animation: rn-shelf .28s cubic-bezier(.4, 0, .2, 1);
}

/* ------------------------------------------------------- inline (sidebar) --- */
.rn-ygs--inline {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
}

.rn-ygs--inline .rn-ygs__panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
}

/* -------------------------------------------------------------- the body --- */
.rn-ygs__grab {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
  flex-shrink: 0;
  cursor: pointer;
}

.rn-ygs__grab span {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #ccc;
}

.rn-ygs__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0 10px;
  flex-shrink: 0;
}

.rn-ygs--tablet .rn-ygs__head {
  padding: 26px 0 12px;
}

.rn-ygs__head-text {
  flex: 1;
  min-width: 0;
}

.rn-ygs__head-title {
  font-size: 18px;
  font-weight: 700;
}

.rn-ygs__head-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-ygs__close {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .55);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-ygs__search {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 42px;
  padding: 0 14px;
  border-radius: 21px;
  background: #f4f4f4;
  flex-shrink: 0;
}

.rn-ygs__search-icon {
  font-size: 20px;
  color: rgba(0, 0, 0, .45);
}

.rn-ygs__input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-size: 14px;
  color: #333;
}

.rn-ygs__clear {
  border: 0;
  background: transparent;
  color: rgba(0, 0, 0, .45);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.rn-ygs__clear .rn-mi {
  font-size: 18px;
}

.rn-ygs__sorts {
  display: flex;
  gap: 6px;
  padding: 10px 0 2px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.rn-ygs__sort {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(0, 0, 0, .12);
  border-radius: 15px;
  background: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .6);
  cursor: pointer;
}

.rn-ygs__sort--on {
  background: rgba(40, 139, 213, .12);
  border-color: rgba(40, 139, 213, .4);
  color: #1f6fab;
}

.rn-ygs__sort-icon {
  font-size: 15px;
}

.rn-ygs__overview {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 58px;
  margin-top: 8px;
  padding: 6px 8px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  flex-shrink: 0;
}

.rn-ygs__overview:hover {
  background: rgba(40, 139, 213, .05);
}

.rn-ygs__overview-glyph {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  border-radius: 12px;
  background: #f4f4f4;
  color: #288bd5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-ygs__overview-glyph .rn-mi {
  font-size: 22px;
}

.rn-ygs__overview-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.rn-ygs__overview-title {
  font-size: 15px;
  font-weight: 700;
}

.rn-ygs__overview-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-ygs__overview-chev {
  font-size: 20px;
  color: rgba(0, 0, 0, .3);
}

.rn-ygs__heading {
  padding: 22px 8px 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .45);
  flex-shrink: 0;
}

.rn-ygs__rows {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 8px;
}

.rn-ygs__group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 12px 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .45);
}

.rn-ygs--compact .rn-ygs__group {
  display: none;
}

.rn-ygs__row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 62px;
  padding: 6px 8px;
  border: 0;
  border-radius: 14px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
}

.rn-ygs--compact .rn-ygs__row {
  min-height: 0;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 12px;
}

.rn-ygs__row:hover {
  background: rgba(40, 139, 213, .06);
}

.rn-ygs__row--active {
  background: rgba(40, 139, 213, .08);
  box-shadow: inset 0 0 0 1px rgba(40, 139, 213, .45);
}

.rn-ygs--compact .rn-ygs__row--active {
  background: rgba(40, 139, 213, .1);
  box-shadow: none;
}

.rn-ygs__time {
  width: 40px;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .5);
  font-variant-numeric: tabular-nums;
}

.rn-ygs__ring-text {
  font-size: 11px;
  font-weight: 700;
}

.rn-ygs__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rn-ygs__title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.25;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-ygs--compact .rn-ygs__title {
  font-size: 13px;
}

.rn-ygs__sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-ygs__check {
  font-size: 20px;
  color: #288bd5;
  flex-shrink: 0;
}

.rn-ygs__none {
  padding: 28px 16px;
  text-align: center;
  font-size: 14px;
  color: rgba(0, 0, 0, .45);
}

.rn-ygs__retry {
  display: block;
  margin: 8px auto 0;
  padding: 6px 14px;
  border: 0;
  border-radius: 16px;
  background: rgba(40, 139, 213, .1);
  color: #288bd5;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.rn-ygs__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 12px 4px 18px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

.rn-ygs__foot .rn-mi {
  font-size: 16px;
}
</style>
