<template>
  <!--
    The focus card: one routine, concentrated. Status window at the top, the
    tick ring and title in the middle, then the checklist, then whatever the
    shell puts in the `thread` slot (the routine chat) — all in ONE scroll
    area, because the design treats checklist and conversation as a single
    column. Period tabs are pinned full-bleed to the bottom of the card.

    Purely presentational: every state transition is an emit. See
    design_handoff_routine_focus/README.md § "Screens / Views".
  -->
  <div class="rn-focus-card" :class="`rn-focus-card--${variant}`" :style="cardStyle">
    <!--
      Everything except the period tabs lives in this wrapper, and the wrapper —
      not the card — carries the horizontal padding (`geometry.padX`). On tablet
      and desktop the card is a flex item of `.rn-home__content` at `flex: 3 1 0`,
      and a `box-sizing: border-box` flex item cannot have a base size smaller
      than its own padding: 40px of padding here made the base size 40 instead of
      0, so the card took 40px off the top and the 3:2 split applied only to the
      rest (563.2/348.8 at the 980px column rather than 547.2/364.8). The design
      frames nest it the same way. The card keeps the VERTICAL padding, which the
      cross axis ignores — and which the tabs still cancel to stay full-bleed.
    -->
    <div class="rn-focus-card__body" :style="bodyStyle">
      <!--
        A skipped day says so on the card, not just in the week strip: the ring is
        still drawn and still looks tappable, so the reason a tick is refused has
        to be visible next to it.
      -->
      <div v-if="skipped" class="rn-focus-card__skip" data-testid="focus-card-skip">
        <i class="rn-mi rn-focus-card__skip-icon">pause_circle</i>
        <span>Routines are paused for today. Ticks don’t count — long-press today to undo.</span>
      </div>

      <!-- Status row + elapsed bar -->
      <div class="rn-focus-card__status">
        <div class="rn-focus-card__status-label" :style="{ color: statusColor }">
          <span class="rn-focus-card__dot" :style="{ background: statusColor }"></span>
          <!-- Only the status words give way on a narrow card; the window never does. -->
          <span class="rn-focus-card__status-text">{{ statusLabel }}</span>
          <span class="rn-focus-card__status-time">· {{ routine.time }} – {{ endTime }}</span>
        </div>
        <div class="rn-focus-card__status-right">
          <!-- The phone's "Back to now" lives in the deck header; the large shells
               have no deck, so the card carries it beside the time left. -->
          <button
            v-if="showBackToNow"
            type="button"
            class="rn-focus-card__back"
            data-testid="focus-card-back-to-now"
            @click.stop="$emit('back-to-now')"
          >Back to now</button>
          <div class="rn-focus-card__status-left">{{ leftLabel }}</div>
        </div>
      </div>
      <div class="rn-focus-card__elapsed">
        <div
          class="rn-focus-card__elapsed-fill"
          :style="{ width: `${elapsedPct}%`, background: statusColor }"
        ></div>
      </div>

      <!-- Ring + title -->
      <div class="rn-focus-card__hero">
        <div
          v-if="showRing"
          ref="ring"
          class="rn-focus-card__ring"
          :style="ringStyle"
          data-testid="routine-focus-ring"
        >
          <!--
            Drawn in the ring's own pixel space (viewBox = rendered size), so the
            stroke is a whole-pixel width at every form factor and the radius
            keeps the whole stroke inside the box and clear of the button. The
            old fixed 96-unit viewBox scaled a 6-unit stroke to 2.9px on the
            ticked tablet ring (and 7.5px on the phone) and let the button
            overlap its inner edge — a lopsided, sub-pixel donut.
          -->
          <svg
            :viewBox="`0 0 ${ringPx} ${ringPx}`"
            class="rn-focus-card__ring-svg"
            data-testid="routine-focus-ring-svg"
          >
            <circle
              :cx="ringPx / 2" :cy="ringPx / 2" :r="ringGeom.r"
              fill="none" stroke="rgba(0,0,0,.06)" :stroke-width="ringGeom.stroke"
            />
            <circle
              v-if="ringRemaining < 1"
              :cx="ringPx / 2" :cy="ringPx / 2" :r="ringGeom.r"
              fill="none" stroke="#FF9800" :stroke-width="ringGeom.stroke"
              :stroke-dasharray="ringGeom.c"
              :stroke-dashoffset="ringGeom.c * ringRemaining"
              :stroke-linecap="ringRemaining > 0 ? 'round' : 'butt'"
              class="rn-focus-card__ring-progress"
            />
          </svg>
          <template v-if="agentRing">
            <div
              class="rn-focus-card__ring-breathe"
              :style="{ borderColor: agentRing.color, animation: breatheOne }"
            ></div>
            <div
              class="rn-focus-card__ring-breathe"
              :style="{ borderColor: agentRing.color, animation: breatheTwo }"
            ></div>
          </template>
          <button
            type="button"
            class="rn-focus-card__tick"
            data-testid="routine-tick-button"
            :title="tickTitle"
            :disabled="tickDisabled"
            :style="tickStyle"
            @click.stop="$emit('action', $event)"
          >
            <i class="rn-mi" :style="{ fontSize: `${tickGlyphPx}px` }">{{ tickGlyph }}</i>
          </button>
        </div>

        <div v-if="isCascadeTab" class="rn-focus-card__overline">{{ period }} goal for</div>

        <div v-if="showTitle" class="rn-focus-card__title-row">
          <div ref="title" class="rn-focus-card__title" :style="titleStyle">{{ routine.name }}</div>
        </div>

        <!-- The stimulus pill + "06:00 – 06:30 · Ticked →" line was removed at
             the owner's request (the status row already says all of it); only
             the agent's "View result" link is left, and only when there is one. -->
        <div v-if="showResultLink" class="rn-focus-card__meta">
          <span
            class="rn-focus-card__result"
            data-testid="focus-card-result-link"
            @click.stop="$emit('open-result')"
          >View result</span>
        </div>
      </div>

      <!-- CHECKLIST header. Collapses to a segmented progress strip. -->
      <div v-if="isDayTab" class="rn-focus-card__checklist-head" @click="onChecklistHead">
        <div class="rn-focus-card__checklist-head-row">
          <div class="rn-focus-card__checklist-label">
            CHECKLIST<i class="rn-mi rn-focus-card__chevron">{{ checklistOpen ? 'expand_less' : 'expand_more' }}</i>
          </div>
          <div class="rn-focus-card__checklist-count">
            <b>{{ doneCount }}</b> of {{ totalCount }} done
          </div>
        </div>
        <div v-if="!checklistOpen" class="rn-focus-card__segments">
          <div
            v-for="item in items"
            :key="`seg-${item.id}`"
            class="rn-focus-card__segment"
            :style="{ background: item.isComplete ? '#4CAF50' : 'rgba(0,0,0,.1)' }"
          ></div>
        </div>
      </div>

      <!-- One scroll area: checklist, cascade panel, then the chat thread. -->
      <div ref="scroller" class="rn-focus-card__scroll rn-hidescroll">
        <template v-if="isDayTab && checklistOpen">
          <div v-if="loading" class="rn-focus-card__skeletons">
            <div v-for="n in 3" :key="`sk-${n}`" class="rn-focus-card__skeleton"></div>
          </div>
          <template v-else>
            <div
              v-for="item in items"
              :key="item.id"
              class="rn-focus-card__row"
              :style="{ minHeight: `${geometry.row}px` }"
              @click="$emit('open-item', item)"
            >
              <i
                class="rn-mi rn-focus-card__box"
                :style="{ color: item.isComplete ? '#288bd5' : 'rgba(0,0,0,.54)' }"
                data-testid="checklist-box"
                @click.stop="$emit('toggle-item', item)"
              >{{ item.isComplete ? 'check_box' : 'check_box_outline_blank' }}</i>
              <span
                class="rn-focus-card__row-text"
                :style="{
                  fontSize: `${geometry.rowText}px`,
                  textDecoration: item.isComplete ? 'line-through' : 'none',
                  color: item.isComplete ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.87)',
                }"
              >{{ item.body }}</span>
              <span v-if="item.ready" class="rn-focus-card__ready">READY</span>
              <i
                v-if="item.hasReward"
                class="rn-mi rn-focus-card__transcript"
                title="Open agent transcript"
                @click.stop="$emit('open-transcript', item)"
              >receipt_long</i>
              <!-- The real count, ticked parent or not: completing an item does
                   not tick its subtasks, and the goal sheet shows them as they
                   are — the row used to claim "3/3" over a sheet showing 2/3. -->
              <span v-if="item.subTotal" class="rn-focus-card__subs" data-testid="checklist-subtasks">
                {{ item.subDone }}/{{ item.subTotal }} subtasks
              </span>
            </div>
            <div class="rn-focus-card__add" data-testid="add-task-row" @click="$emit('add-task')">
              <i class="rn-mi rn-focus-card__add-icon">add_circle_outline</i>Add task
            </div>
          </template>
        </template>

        <routine-cascade-panel v-if="isCascadeTab" :cascade="cascade" />

        <slot name="thread"></slot>
      </div>
    </div>

    <!-- Bottom tabs, full bleed -->
    <div class="rn-focus-card__tabs" :style="{ height: `${geometry.tabs}px` }">
      <div
        v-for="tab in tabs"
        :key="tab.key"
        class="rn-focus-card__tab"
        :class="{ 'rn-focus-card__tab--inline': variant !== 'phone' }"
        :style="{
          color: tab.key === period ? '#288bd5' : 'rgba(0,0,0,.54)',
          borderTopColor: tab.key === period ? '#288bd5' : 'transparent',
        }"
        :data-testid="`period-tab-${tab.key}`"
        @click="$emit('set-period', tab.key)"
      >
        <i class="rn-mi rn-focus-card__tab-icon">{{ tab.icon }}</i>
        <span class="rn-focus-card__tab-label">{{ tab.label }}</span>
      </div>
    </div>
  </div>
</template>

<script>
import {
  PERIOD_TABS,
  agentStageOf,
  AGENT_LIVE_STAGES,
  focusVariant,
} from '../../constants/routineFocus';
import RoutineCascadePanel from '../RoutineCascadePanel/RoutineCascadePanel.vue';

// The progress unit `ringOffset` is expressed in: the circumference of the
// design's r=42 ring. The drawn ring scales it to its real circumference.
const RING_CIRCUMFERENCE = 263.9;
// The phone's ticked check (RoutineTopBar mini ring): 20px glyph, 34px button.
const TICKED_GLYPH = 20;
const TICKED_BUTTON = 34;

export default {
  name: 'OrganismRoutineFocusCard',
  components: { RoutineCascadePanel },
  props: {
    /**
     * The focused routine, already enriched by the page:
     * { id, name, time, points, stimulus, ticked, passed, isCurrent,
     *   redeemable, buttonGlyph, buttonBg, buttonFg }
     */
    routine: { type: Object, default: () => ({}) },
    endTime: { type: String, default: '23:59' },
    statusLabel: { type: String, default: '' },
    statusColor: { type: String, default: 'rgba(0,0,0,.45)' },
    leftLabel: { type: String, default: '' },
    /** The viewed routine is not the one the clock says is current. */
    showBackToNow: { type: Boolean, default: false },
    elapsedPct: { type: Number, default: 0 },
    /** Day goal items under this routine: { id, body, isComplete, ready, hasReward, subDone, subTotal } */
    items: { type: Array, default: () => [] },
    doneCount: { type: Number, default: 0 },
    totalCount: { type: Number, default: 0 },
    period: { type: String, default: 'day' },
    checklistOpen: { type: Boolean, default: true },
    /** none | waiting | running | listening | firing | finished | failed */
    agentStage: { type: String, default: 'none' },
    /** phone | tablet | desktop */
    variant: { type: String, default: 'phone' },
    /** Today's routines are paused — a tick will not count. */
    skipped: { type: Boolean, default: false },
    showResultLink: { type: Boolean, default: false },
    /** Week/month/year cascade payload — see RoutineCascadePanel. */
    cascade: { type: Object, default: null },
    loading: { type: Boolean, default: false },
    /**
     * Phone only: while the tick ghost is in flight the card's ring and title
     * are already hidden, so the flight is the only thing moving.
     */
    flying: { type: Boolean, default: false },
  },
  computed: {
    geometry() {
      return focusVariant(this.variant);
    },
    isDayTab() {
      return this.period === 'day';
    },
    isCascadeTab() {
      return this.period !== 'day';
    },
    agentLive() {
      return AGENT_LIVE_STAGES.indexOf(this.agentStage) !== -1;
    },
    /** The agent's breathing rings — only while it is actually doing something. */
    agentRing() {
      return this.agentLive ? agentStageOf(this.agentStage) : null;
    },
    breatheOne() {
      if (!this.agentRing) return 'none';
      return `rn-breathe ${this.agentRing.ringMs}ms ease-out infinite`;
    },
    breatheTwo() {
      // The single slow ring of 'listening' is deliberate — a second ring
      // would read as activity when the agent is only waiting.
      if (!this.agentRing || !this.agentRing.breathe) return 'none';
      return `rn-breathe ${this.agentRing.ringMs}ms ease-out ${this.agentRing.ringMs / 2}ms infinite`;
    },
    /**
     * Ring is shown on the Today tab until the routine is ticked. Tablet and
     * desktop keep a shrunken ring; the phone flies it to the header, so it
     * disappears from the card entirely.
     */
    showRing() {
      if (this.isCascadeTab) return false;
      if (!this.routine.ticked) return true;
      return this.geometry.ringSm > 0;
    },
    ringPx() {
      return this.routine.ticked && this.geometry.ringSm
        ? this.geometry.ringSm
        : this.geometry.ring;
    },
    /**
     * Ring stroke and radius in CSS pixels. Whole-pixel stroke (3px on the small
     * ticked ring, 6px otherwise), radius set so the stroke's outer edge meets
     * the box edge, and never closer to the button than 2px.
     */
    ringGeom() {
      const small = this.ringPx < 64;
      const stroke = small ? 3 : 6;
      const maxStroke = Math.max(2, this.tickInset - 2);
      const w = Math.min(stroke, maxStroke);
      const r = (this.ringPx - w) / 2;
      return { stroke: w, r, c: 2 * Math.PI * r };
    },
    /** Fraction of the ring still to draw (0 = full, 1 = nothing — hidden,
        so a round line-cap never paints a stray dot at 12 o'clock). */
    ringRemaining() {
      return Math.min(1, Math.max(0, this.ringOffset / RING_CIRCUMFERENCE));
    },
    ringStyle() {
      return {
        width: `${this.ringPx}px`,
        height: `${this.ringPx}px`,
        visibility: this.flying ? 'hidden' : 'visible',
      };
    },
    /**
     * How far the tick button is inset inside the ring. A ticked ring on
     * tablet/desktop is the button alone, so it hugs the edge.
     */
    tickInset() {
      return this.routine.ticked && this.geometry.ringSm
        ? Math.round(this.geometry.ringSm / 10)
        : this.geometry.ringInset;
    },
    /**
     * Glyph size inside the tick button, kept at the phone's proportion
     * (32px glyph in its 100px button) on every variant and on the shrunken
     * ticked ring — a fixed token oversized the icon on tablet/desktop. The
     * shrunken ticked ring follows the phone's ticked check instead (the
     * header's 20px check in its 34px button), so the check stays legible.
     */
    tickGlyphPx() {
      const button = this.ringPx - 2 * this.tickInset;
      if (this.routine.ticked && this.geometry.ringSm) {
        return Math.round(button * (TICKED_GLYPH / TICKED_BUTTON));
      }
      const phone = focusVariant('phone');
      const ratio = phone.ringGlyph / (phone.ring - 2 * phone.ringInset);
      return Math.round(button * ratio);
    },
    ringOffset() {
      if (this.routine.ticked && this.geometry.ringSm) return 0;
      const pct = this.totalCount
        ? this.doneCount / this.totalCount
        : (this.routine.ticked ? 1 : 0);
      return RING_CIRCUMFERENCE * (1 - pct);
    },
    tickGlyph() {
      if (this.agentRing && this.agentRing.glyph) return this.agentRing.glyph;
      return this.routine.buttonGlyph || 'more_horiz';
    },
    tickStyle() {
      const stage = this.agentRing;
      const px = `${this.tickInset}px`;
      return {
        top: px, right: px, bottom: px, left: px,
        background: stage ? stage.color : (this.routine.buttonBg || '#f5f5f5'),
        color: stage ? '#fff' : (this.routine.buttonFg || 'rgba(0,0,0,.87)'),
        animation: stage && stage.breathe
          ? `rn-btn-breathe ${stage.ringMs}ms ease-in-out infinite`
          : 'none',
      };
    },
    tickDisabled() {
      // ONLY a domain reason disables the tick — an upcoming routine cannot be
      // ticked early, a past day cannot be changed, a skipped day is off.
      //
      // Never the agent stage. `waiting` means "tick landed before the goal item
      // saved — dispatch is queued, not dropped": a request in flight, which is
      // precisely what ARCHITECTURE § 3.7 says must not gate a control (the
      // `busy` disable-during-load prop was deleted from this screen for the
      // same reason). Disabling here stranded the user mid-dispatch on a button
      // the design keeps live — it only swaps its glyph through the stages.
      return !!this.routine.buttonDisabled;
    },
    tickTitle() {
      if (this.agentLive) return 'Agent working…';
      if (this.routine.ticked) return 'Ticked · tap to undo';
      if (this.routine.redeemable) return 'Redeem with points';
      return 'Tick routine';
    },
    /** On the phone the ticked title lives in the header, not the card. */
    showTitle() {
      if (this.flying) return false;
      return !(this.isDayTab && this.routine.ticked && !this.geometry.ringSm);
    },
    titleStyle() {
      const size = this.routine.ticked && this.geometry.ringSm
        ? this.geometry.titleSm
        : this.geometry.title;
      return { fontSize: `${size}px` };
    },
    /** Vertical only — see `bodyStyle` and the `pad`/`padX` tokens. */
    cardStyle() {
      return { padding: this.geometry.pad };
    },
    /**
     * The card's horizontal inset. It lives on the inner wrapper so the card
     * itself has a zero flex base size on tablet and desktop, where it is a
     * `flex: 3 1 0` item of the checklist/chat split.
     */
    bodyStyle() {
      const px = `${this.geometry.padX}px`;
      return { paddingLeft: px, paddingRight: px };
    },
    tabs() {
      return PERIOD_TABS;
    },
    /** The checklist's membership — what the scroll-to-bottom watcher follows. */
    itemsKey() {
      return (this.items || []).map((item) => item && item.id).join('|');
    },
  },
  watch: {
    // A new message (or a switched routine) must land at the bottom of the
    // thread, which shares this scroller with the checklist. Keyed on the item
    // ids, not the array: a refetch hands over a new array with the same items,
    // and that used to drag a just-switched tab from its top to the bottom.
    // Today only — the other tabs show no checklist.
    itemsKey() {
      if (this.isDayTab) this.scrollToBottomSoon();
    },
    // A new tab is new content: start it at its top, not wherever the last tab
    // was left scrolled. After the render, so it is the new tab's height.
    period() {
      this.$nextTick(this.scrollToTop);
    },
    checklistOpen(open) {
      if (open) this.$nextTick(this.restoreChecklistScroll);
      else this.measureAfterCollapse();
    },
  },
  created() {
    // Non-reactive: scroll bookkeeping for the checklist accordion.
    this.collapseScroll = null;
  },
  methods: {
    /**
     * The CHECKLIST header toggles the accordion. Collapsing removes the rows
     * from the TOP of the shared scroller, so anything scrolled less than the
     * list's height snaps to 0 (the browser's scroll anchoring has nothing above
     * to hold on to), and expanding again then left the user at the very top —
     * the "expand brings me back to top" report. Remember where they were and put
     * them back, unless they have scrolled the collapsed view since.
     */
    onChecklistHead() {
      const el = this.$refs.scroller;
      if (el && this.checklistOpen) {
        this.collapseScroll = { from: el.scrollTop, after: null };
      } else if (el && this.collapseScroll && this.collapseScroll.after !== null
        && Math.abs(el.scrollTop - this.collapseScroll.after) > 1) {
        // Scrolled while collapsed: that position is theirs now; leave it alone.
        this.collapseScroll = null;
      }
      this.$emit('toggle-checklist');
    },
    measureAfterCollapse() {
      this.$nextTick(() => {
        const el = this.$refs.scroller;
        if (el && this.collapseScroll) this.collapseScroll.after = el.scrollTop;
      });
    },
    restoreChecklistScroll() {
      const el = this.$refs.scroller;
      const saved = this.collapseScroll;
      this.collapseScroll = null;
      if (!el || !saved) return;
      // Reading first lets any browser anchoring settle, so this never overshoots.
      if (Math.abs(el.scrollTop - saved.from) > 1) el.scrollTop = saved.from;
    },
    scrollToTop() {
      const el = this.$refs.scroller;
      if (el) el.scrollTop = 0;
    },
    /** Exposed so the page can measure the fly animation's source rect. */
    ringRect() {
      const el = this.$refs.ring;
      return el ? el.getBoundingClientRect() : null;
    },
    titleRect() {
      const el = this.$refs.title;
      return el ? el.getBoundingClientRect() : null;
    },
    scrollToBottom() {
      const el = this.$refs.scroller;
      if (el) el.scrollTop = el.scrollHeight;
    },
    scrollToBottomSoon() {
      this.$nextTick(() => setTimeout(() => this.scrollToBottom(), 30));
    },
  },
};
</script>

<style>
/* Root-class prefixed throughout: these rules must not reach the legacy
   dashboard, which shares the same page shell. */
.rn-focus-card {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  height: 100%;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, .1), 0 4px 6px -2px rgba(0, 0, 0, .05);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-focus-card--tablet,
.rn-focus-card--desktop {
  border-radius: 20px;
}

/* The padded column. It, not the card, owns the horizontal inset so the card's
   flex base size stays 0 in the checklist/chat split. */
.rn-focus-card__body {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
}

.rn-focus-card__skip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0 0 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: #fff3e0;
  color: #8a5300;
  font-size: 12px;
  line-height: 1.4;
}

.rn-focus-card__skip-icon {
  font-size: 18px;
  color: #e68900;
  flex-shrink: 0;
}

.rn-focus-card__status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

/* Phone-first: the base rules are turn 5a, the --tablet/--desktop blocks are
   turns 6a/6b, which step the in-card type up by 1px across the board. */
.rn-focus-card__status-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  text-transform: uppercase;
  white-space: nowrap;
  min-width: 0;
  overflow: hidden;
}

.rn-focus-card--tablet .rn-focus-card__status-label,
.rn-focus-card--desktop .rn-focus-card__status-label {
  font-size: 12px;
}

.rn-focus-card__status-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-focus-card__status-time {
  flex-shrink: 0;
}

.rn-focus-card__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  animation: rn-pulse 1.4s ease-in-out infinite;
}

.rn-focus-card__status-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.rn-focus-card__status-left {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
}

/* Same orange text link as the phone deck's `.rn-deck__back`. */
.rn-focus-card__back {
  border: 0;
  background: none;
  padding: 0;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  color: #FF9800;
  white-space: nowrap;
  cursor: pointer;
}

.rn-focus-card__elapsed {
  height: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, .08);
  overflow: hidden;
}

.rn-focus-card__elapsed-fill {
  height: 100%;
  border-radius: 2px;
  transition: width .4s;
}

.rn-focus-card__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 0 2px;
  flex-shrink: 0;
}

.rn-focus-card--tablet .rn-focus-card__hero,
.rn-focus-card--desktop .rn-focus-card__hero {
  flex-direction: row;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 10px 0 6px;
}

.rn-focus-card__ring {
  position: relative;
  flex-shrink: 0;
  /* width/height/inset animate so the ticked ring shrinks in place on the
     larger form factors (the phone flies it instead). */
  transition: width .55s cubic-bezier(.3, 1.3, .5, 1), height .55s cubic-bezier(.3, 1.3, .5, 1);
}

.rn-focus-card__ring-svg {
  /* Block, not the inline default: an inline SVG sits on the text baseline. */
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  transform: rotate(-90deg);
}

.rn-focus-card__ring-progress {
  transition: stroke-dashoffset .4s;
}

.rn-focus-card__ring-breathe {
  position: absolute;
  top: 5px;
  right: 5px;
  bottom: 5px;
  left: 5px;
  border-radius: 50%;
  border: 3px solid transparent;
  box-sizing: border-box;
  pointer-events: none;
}

.rn-focus-card__tick {
  position: absolute;
  border: 0;
  padding: 0;
  outline: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .12);
  transition: background .3s, color .3s,
    top .55s cubic-bezier(.3, 1.3, .5, 1), right .55s cubic-bezier(.3, 1.3, .5, 1),
    bottom .55s cubic-bezier(.3, 1.3, .5, 1), left .55s cubic-bezier(.3, 1.3, .5, 1);
}

.rn-focus-card__tick[disabled] {
  cursor: default;
}

.rn-focus-card__overline {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .45);
  text-transform: uppercase;
}

.rn-focus-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  max-width: 100%;
  min-width: 0;
}

.rn-focus-card--tablet .rn-focus-card__title-row,
.rn-focus-card--desktop .rn-focus-card__title-row {
  margin-top: 0;
  flex: 1;
}

.rn-focus-card__title {
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: font-size .55s cubic-bezier(.3, 1.3, .5, 1);
}

.rn-focus-card__meta {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 2px;
}

.rn-focus-card--tablet .rn-focus-card__meta,
.rn-focus-card--desktop .rn-focus-card__meta {
  justify-content: flex-start;
  width: 100%;
}

.rn-focus-card__result {
  font-size: 12px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-focus-card--tablet .rn-focus-card__result,
.rn-focus-card--desktop .rn-focus-card__result {
  font-size: 13px;
}

.rn-focus-card__checklist-head {
  margin-top: 4px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  padding: 8px 0 4px;
  cursor: pointer;
  flex-shrink: 0;
}

.rn-focus-card__checklist-head-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rn-focus-card__checklist-label {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .5);
}

.rn-focus-card__chevron {
  font-size: 18px;
}

.rn-focus-card__checklist-count {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
}

.rn-focus-card__checklist-count b {
  color: rgba(0, 0, 0, .87);
}

.rn-focus-card__segments {
  display: flex;
  gap: 3px;
  margin-top: 6px;
}

.rn-focus-card__segment {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  transition: background .3s;
}

.rn-focus-card__scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  /* Don't chain an overscroll to the page: Home has its own pull-to-refresh,
     and the browser's would reload the app on top of it. */
  overscroll-behavior-y: contain;
}

/* The divider is a border-TOP on every row, as drawn: that puts the first rule
   directly under the CHECKLIST header and leaves no stray line hanging above
   "Add task" (which carries its own border-top). */
.rn-focus-card__row {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  border-top: 1px solid rgba(0, 0, 0, .06);
}

.rn-focus-card--desktop .rn-focus-card__row,
.rn-focus-card--tablet .rn-focus-card__row {
  border-radius: 8px;
}

.rn-focus-card--desktop .rn-focus-card__row:hover,
.rn-focus-card--tablet .rn-focus-card__row:hover {
  background: #fafafa;
}

.rn-focus-card__box {
  font-size: 24px;
  flex-shrink: 0;
  min-width: 24px;
  /* 24px glyph + 18px padding = a 42px touch target, and the negative margin
     keeps it from pushing the row past its design min-height (42 / 44). */
  padding: 9px 0;
  margin: -9px 0;
}

.rn-focus-card__row-text {
  flex: 1;
  min-width: 0;
  font-weight: 500;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.rn-focus-card__ready {
  flex-shrink: 0;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .4px;
  padding: 2px 6px;
  border-radius: 999px;
  background: rgba(25, 118, 210, .12);
  color: #1976d2;
}

.rn-focus-card__transcript {
  flex-shrink: 0;
  font-size: 20px;
  color: rgba(0, 0, 0, .45);
}

.rn-focus-card__subs {
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
  white-space: nowrap;
}

/* Same on all three shells in the design: a 38px row, 14px label, 24px glyph —
   deliberately shorter and lighter than a checklist row so it reads as the tail
   of the list rather than another item. */
.rn-focus-card__add {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 14px;
  font-weight: 600;
  color: #288bd5;
  cursor: pointer;
}

.rn-focus-card__add-icon {
  font-size: 24px;
}

.rn-focus-card__skeletons {
  padding: 8px 0;
}

.rn-focus-card__skeleton {
  height: 20px;
  margin-bottom: 14px;
  border-radius: 4px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: rn-focus-skeleton 1.5s infinite;
}

@keyframes rn-focus-skeleton {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* Full-bleed: the tabs are the bottom edge of the card. They sit OUTSIDE
   `__body`, so the horizontal inset never reaches them and there is nothing to
   cancel sideways — only the phone's 16px bottom padding, which the card still
   carries. (Desktop used to pull -24px against a 20px pad and lost 4px of the
   tab row a side to `overflow: hidden`.) */
.rn-focus-card__tabs {
  display: flex;
  flex-shrink: 0;
  background: #fafafa;
  margin: 2px 0 -16px;
}

.rn-focus-card--tablet .rn-focus-card__tabs,
.rn-focus-card--desktop .rn-focus-card__tabs {
  margin: 2px 0 0;
}

.rn-focus-card__tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  cursor: pointer;
  border-top: 2px solid transparent;
  transition: color .2s, border-top-color .2s;
}

.rn-focus-card__tab--inline {
  flex-direction: row;
  gap: 6px;
}

.rn-focus-card__tab-icon {
  font-size: 18px;
}

/* 10px stacked on the phone (the bar is only 40px tall there); 11px inline on
   tablet and desktop, where the bar is 46px and the label sits beside the icon. */
.rn-focus-card__tab-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: .4px;
}

.rn-focus-card--tablet .rn-focus-card__tab-label,
.rn-focus-card--desktop .rn-focus-card__tab-label {
  font-size: 11px;
}
</style>
