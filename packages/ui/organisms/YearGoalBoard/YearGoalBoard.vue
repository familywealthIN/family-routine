<template>
  <!--
    One year goal, laid out per shell.

    phone      one scrolling column: hero, 12-month strip, focus card, thread,
               and a composer that sticks to the bottom of the scroller.
    tablet /   a hero band (hero + strip in one card), then two columns — the
    desktop    focus card left, the chat panel right (380px / 420px), each with
               its own scroll and its own composer.

    The thread itself is NOT drawn here: it arrives through the `chat` slot,
    because it is the same `RoutineChatThread` organism Home mounts and this page
    has no business owning a second one.
  -->
  <div class="rn-ygb" :class="`rn-ygb--${shell}`" data-testid="year-goal-board">
    <template v-if="shell === 'phone'">
      <year-goal-hero
        :goal="goal"
        shell="phone"
        :year-threshold="thresholds.year"
        :index-label="indexLabel"
        :has-prev="hasPrev"
        :has-next="hasNext"
        :about-open="aboutOpen"
        @step="$emit('step', $event)"
        @open-switcher="$emit('open-switcher')"
        @toggle-about="$emit('toggle-about')"
      />

      <year-month-strip
        class="rn-ygb__strip-phone"
        :tiles="tiles"
        shell="phone"
        @select="$emit('select-month', $event)"
      />

      <month-focus-card
        :month="month"
        :open-week-id="openWeekId"
        shell="phone"
        :week-threshold="thresholds.week"
        :month-threshold="thresholds.month"
        :empty-sub="emptySub"
        v-on="$listeners"
      />

      <div class="rn-ygb__chat-phone"><slot name="chat"></slot></div>

      <div class="rn-ygb__composer-phone"><slot name="composer"></slot></div>
    </template>

    <template v-else>
      <year-goal-hero
        :goal="goal"
        :shell="shell"
        :year-threshold="thresholds.year"
        :index-label="indexLabel"
        :about-open="aboutOpen"
        @open-switcher="$emit('open-switcher')"
        @toggle-about="$emit('toggle-about')"
      >
        <template v-slot:strip>
          <year-month-strip
            :tiles="tiles"
            :shell="shell"
            @select="$emit('select-month', $event)"
          />
        </template>
      </year-goal-hero>

      <div class="rn-ygb__cols">
        <div class="rn-ygb__left rn-hidescroll">
          <month-focus-card
            :month="month"
            :open-week-id="openWeekId"
            :shell="shell"
            :week-threshold="thresholds.week"
            :month-threshold="thresholds.month"
            :empty-sub="emptySub"
            v-on="$listeners"
          />
        </div>

        <aside class="rn-ygb__panel" :style="{ flexBasis: `${panelWidth}px` }" data-testid="year-goal-chat-panel">
          <header class="rn-ygb__panel-head">
            <span class="rn-ygb__panel-glyph"><i class="rn-mi">forum</i></span>
            <span class="rn-ygb__panel-text">
              <span class="rn-ygb__panel-title">Chat with this goal</span>
              <span class="rn-ygb__panel-sub">{{ chatSubline }}</span>
            </span>
          </header>
          <div class="rn-ygb__panel-body rn-hidescroll"><slot name="chat"></slot></div>
          <div class="rn-ygb__panel-foot"><slot name="composer"></slot></div>
        </aside>
      </div>
    </template>
  </div>
</template>

<script>
import YearGoalHero from '../../molecules/YearGoalHero/YearGoalHero.vue';
import YearMonthStrip from '../../molecules/YearMonthStrip/YearMonthStrip.vue';
import MonthFocusCard from '../../molecules/MonthFocusCard/MonthFocusCard.vue';

/** Chat panel width per shell — 380 on tablet, 420 on desktop (Year Goals.dc.html). */
const PANEL = { tablet: 380, desktop: 420 };

export default {
  name: 'OrganismYearGoalBoard',
  components: { YearGoalHero, YearMonthStrip, MonthFocusCard },
  props: {
    /** `yearGoalModel.buildYearGoal()` output. */
    goal: { type: Object, required: true },
    /** `yearGoalModel.monthTiles(goal, selectedIndex)`. */
    tiles: { type: Array, default: () => [] },
    /** The focused month — one entry of `goal.months`. */
    month: { type: Object, default: null },
    openWeekId: { type: String, default: '' },
    shell: { type: String, default: 'phone' },
    /** `{ week, month, year }` from `yearGoalModel.TH`. Never re-declared here. */
    thresholds: { type: Object, default: () => ({ week: 5, month: 3, year: 6 }) },
    indexLabel: { type: String, default: '' },
    hasPrev: { type: Boolean, default: false },
    hasNext: { type: Boolean, default: false },
    aboutOpen: { type: Boolean, default: false },
    emptySub: { type: String, default: '' },
    chatSubline: { type: String, default: '' },
  },
  computed: {
    panelWidth() {
      return PANEL[this.shell] || PANEL.desktop;
    },
  },
};
</script>

<style>
.rn-ygb {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  min-width: 0;
}

/* ----------------------------------------------------------------- phone ---
   The shell body is already the scroller on the phone, so the board is plain
   flow and the composer is sticky inside it. A second scroller here would mean
   two nested scrollbars and a thread that cannot be reached by flicking the
   page. */
.rn-ygb--phone {
  display: block;
}

.rn-ygb__strip-phone {
  margin: 14px 0 12px;
}

.rn-ygb__chat-phone {
  margin-top: 6px;
}

/*
  Sticky rather than fixed: the composer belongs to the scroller it sits in, so
  it travels with the page's own padding instead of needing to know the tab
  bar's height.
*/
.rn-ygb__composer-phone {
  position: sticky;
  bottom: 0;
  z-index: 2;
  background: #f4f4f4;
  padding-bottom: 2px;
}

/* -------------------------------------------------- tablet / desktop --- */
.rn-ygb--tablet,
.rn-ygb--desktop {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  min-height: 0;
}

.rn-ygb--desktop {
  gap: 16px;
}

.rn-ygb__cols {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.rn-ygb--desktop .rn-ygb__cols {
  gap: 20px;
}

.rn-ygb__left {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.rn-ygb__panel {
  flex-grow: 0;
  flex-shrink: 0;
  min-width: 0;
  background: #fff;
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rn-ygb__panel-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(0, 0, 0, .06);
  flex-shrink: 0;
}

.rn-ygb__panel-glyph {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  border-radius: 50%;
  background: rgba(40, 139, 213, .1);
  color: #288bd5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-ygb__panel-glyph .rn-mi {
  font-size: 20px;
}

.rn-ygb__panel-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.rn-ygb__panel-title {
  font-size: 15px;
  font-weight: 700;
}

.rn-ygb__panel-sub {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rn-ygb__panel-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 10px 18px 0;
}

.rn-ygb__panel-foot {
  flex-shrink: 0;
  padding: 0 18px 12px;
}
</style>
