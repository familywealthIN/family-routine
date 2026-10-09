<template>
  <!--
    The Goals screen body (packages/design/Goals.dc.html).

    Three blocks: the cascade LADDER (which is the navigation), the CALENDAR and
    the LIST of the selected level's goals grouped by routine. The calendar
    arrives through a slot because it is fed by its own read (one container, one
    operation — apps/web-app/src/containers/ARCHITECTURE.md § 2): the list needs
    one date's goals, the calendar needs a month of them.

    Phone stacks ladder → calendar (day tab only) → list. Tablet and desktop put
    the ladder and the always-open calendar in a fixed left column (380 / 420px)
    and the list in the remaining width. The design's desktop year-goal list is
    NOT here: it belongs to the 264px nav sidebar, which is the chassis' AppShell
    `sidebar` slot, and the page fills it with the same `YearGoalListContainer`
    the Year Goals screen uses.

    Pure: props in, events out. Every number here is computed by
    `utils/goalCascade.buildCascade` — this file decides layout and colour only.
  -->
  <div class="rn-gcas" :class="`rn-gcas--${shell}`" data-testid="goal-cascade">
    <template v-if="shell === 'phone'">
      <CascadeLadder
        class="rn-gcard"
        v-bind="ladderProps"
        @select="$emit('select-step', $event)"
      />
      <div v-if="tab === 'day'" class="rn-gcard"><slot name="calendar"></slot></div>
      <section class="rn-gcard rn-gcas__list" data-testid="goal-cascade-list">
        <div :key="tab" class="rn-gcas__enter">
          <div class="rn-gcas__list-head">
            <div class="rn-gcas__list-title">{{ listTitle }}</div>
            <div class="rn-gcas__list-count">
              <b>{{ listDone }}</b> of {{ listTotal }} done
            </div>
          </div>
          <GoalGroups v-bind="groupProps" v-on="groupListeners" />
        </div>
      </section>
    </template>

    <div v-else class="rn-gcas__split">
      <div class="rn-gcas__side">
        <CascadeLadder
          class="rn-gcard"
          v-bind="ladderProps"
          @select="$emit('select-step', $event)"
        />
        <div class="rn-gcard"><slot name="calendar"></slot></div>
      </div>

      <section class="rn-gcard rn-gcas__list rn-gcas__list--split" data-testid="goal-cascade-list">
        <div :key="tab" class="rn-gcas__enter">
          <div class="rn-gcas__list-head">
            <div class="rn-gcas__list-title">{{ listTitle }}</div>
            <div class="rn-gcas__list-count">
              <b>{{ listDone }}</b> of {{ listTotal }} done
            </div>
          </div>
          <GoalGroups v-bind="groupProps" v-on="groupListeners" />
        </div>
      </section>
    </div>
  </div>
</template>

<script>
import CascadeLadder from '../../molecules/CascadeLadder/CascadeLadder.vue';
import LoadErrorState from '../../molecules/LoadErrorState/LoadErrorState.vue';
import ProgressRing from '../../molecules/ProgressRing/ProgressRing.vue';
import { YEAR_ROW_RING } from '../../constants/goalsCascade';

/**
 * The routine groups and their three row shapes.
 *
 * Declared here rather than as a fourth file because the phone and the split
 * layout render the SAME list, and a second copy of this markup is how two
 * layouts drift apart. Written as a render function because the three row kinds
 * (checkbox, checkbox + streak bar, year ring) share one wrapper and differ only
 * in their middle.
 *
 * NOT a `functional` component: @vue/vue2-jest marks the WHOLE SFC functional
 * when the script mentions that option (lib/process.js greps for it), which makes
 * Vue call GoalCascade's own compiled render with `this === null` — the same trap
 * AppShell documents, and the reason this comment spells the option out no
 * further.
 */
const GoalGroups = {
  name: 'GoalGroups',
  components: { LoadErrorState, ProgressRing },
  props: {
    groups: { type: Array, default: () => [] },
    empty: { type: Boolean, default: false },
    emptyText: { type: String, default: '' },
    addLabel: { type: String, default: '' },
    /** The read failed AND nothing is cached — see the render below (D-10). */
    loadError: { type: Boolean, default: false },
    retrying: { type: Boolean, default: false },
  },
  data() {
    return { ROW_RING: YEAR_ROW_RING };
  },
  methods: {
    hrefFor(row) {
      return row && row.id ? `/year-goals/${row.id}` : '#';
    },
    onOpenYear(row, event) {
      // A real anchor so middle-click still works, but the in-app navigation is
      // the page's (`open-year`) — a pure organism never touches the router.
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      this.$emit('open-year', row);
    },
    /** A finished week/month goal ticks GREEN (it rolled up); a day goal ticks blue. */
    boxColor(row) {
      if (!row.done) return 'rgba(0,0,0,.54)';
      return row.kind === 'bar' ? '#4CAF50' : '#288bd5';
    },
    /** A year goal is a ring row that NAVIGATES. It is never a checkbox. */
    renderYearRow(h, row) {
      return h('a', {
        key: row.key,
        class: 'rn-gcas__yrow',
        attrs: { href: this.hrefFor(row), 'data-testid': `goal-year-row-${row.id}` },
        on: { click: (event) => this.onOpenYear(row, event) },
      }, [
        h(ProgressRing, {
          props: {
            size: this.ROW_RING.size,
            viewBox: this.ROW_RING.viewBox,
            r: this.ROW_RING.r,
            stroke: this.ROW_RING.stroke,
            value: row.pct || 0,
            color: row.ringColor,
          },
        }, [
          h('span', { class: 'rn-gcas__ypct', style: { color: row.ringColor } }, row.pctLabel),
        ]),
        h('div', { class: 'rn-gcas__yrow-text' }, [
          h('div', { class: 'rn-gcas__yrow-body' }, row.body),
          h('div', { class: 'rn-gcas__row-meta' }, row.meta),
        ]),
        h('i', { class: 'rn-mi rn-gcas__yrow-chevron' }, 'chevron_right'),
      ]);
    },
    renderCheckRow(h, row) {
      const text = [
        h('div', {
          class: ['rn-gcas__row-body', row.done && row.strike ? 'rn-gcas__row-body--done' : ''],
        }, row.body),
      ];

      if (row.kind === 'bar') {
        text.push(h('div', { class: 'rn-gcas__bar-row' }, [
          h('div', { class: 'rn-gcas__bar' }, [
            h('div', {
              class: 'rn-gcas__bar-fill',
              style: { width: `${row.barPct}%`, background: row.done ? '#4CAF50' : '#FF9800' },
            }),
          ]),
          h('div', { class: 'rn-gcas__bar-label' }, row.barLabel),
          h('div', {
            class: 'rn-gcas__chip',
            style: { background: row.status.bg, color: row.status.color },
            attrs: { 'data-testid': `goal-status-${row.id}` },
          }, row.status.label),
        ]));
      } else if (row.meta) {
        text.push(h('div', { class: 'rn-gcas__row-meta' }, row.meta));
      }

      return h('div', {
        key: row.key,
        class: 'rn-gcas__row',
        attrs: {
          'data-testid': `goal-row-${row.id}`,
          role: 'checkbox',
          'aria-checked': String(!!row.done),
        },
        on: { click: () => this.$emit('toggle', row) },
      }, [
        h('i', {
          class: 'rn-mi rn-gcas__box',
          style: { color: this.boxColor(row) },
        }, row.done ? 'check_box' : 'check_box_outline_blank'),
        h('div', { class: 'rn-gcas__row-text' }, text),
        /**
         * The row body is the TICK, so editing needs its own target — a glyph
         * rather than the design's old "tap the text to open it", which on this
         * screen would mean a tap can either complete a goal or open a form.
         * `stopPropagation` is load-bearing: without it the editor opens AND the
         * goal ticks from one tap.
         *
         * Delete sits beside it for the same reason the dashboard puts it on the
         * goal LIST and not inside its editor: the row is where the goal is, and
         * a destructive control inside a form competes with Save. It only asks —
         * the page runs it behind its confirmation.
         */
        this.renderRowButton(h, row, {
          action: 'edit',
          glyph: 'edit',
          label: 'Edit goal',
          modifier: '',
        }),
        this.renderRowButton(h, row, {
          action: 'delete',
          glyph: 'delete_outline',
          label: 'Delete goal',
          modifier: 'rn-gcas__row-act--danger',
        }),
      ]);
    },
    /**
     * One button, two actions — so the edit and the delete cannot drift apart in
     * hit area, hover behaviour or `stopPropagation`.
     */
    renderRowButton(h, row, { action, glyph, label, modifier }) {
      return h('button', {
        class: ['rn-gcas__row-act', `rn-gcas__row-${action}`, modifier],
        attrs: {
          type: 'button',
          title: label,
          'aria-label': label,
          'data-testid': `goal-row-${action}-${row.id}`,
        },
        on: {
          click: (event) => {
            if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
            this.$emit(action, row);
          },
        },
      }, [h('i', { class: 'rn-mi rn-gcas__row-act-glyph' }, glyph)]);
    },
  },
  render(h) {
    /**
     * D-10: a failed read leaves every list on this page empty, so without this
     * branch the page tells the user their goals are gone when the server was
     * simply unreachable. Error and empty are two different screens, and the
     * error one offers a retry — the same split AgentList draws.
     */
    if (this.loadError) {
      return h('div', { class: 'rn-gcas__groups' }, [
        h(LoadErrorState, {
          attrs: { 'data-testid': 'goal-cascade-error' },
          props: { message: "We couldn't load your goals.", retrying: this.retrying },
          on: { retry: () => this.$emit('retry') },
        }),
      ]);
    }

    const nodes = this.groups.map((group) => h('div', { key: group.key, class: 'rn-gcas__group' }, [
      h('div', { class: 'rn-gcas__group-head' }, [
        h('div', {
          class: ['rn-gcas__group-time', group.current ? 'rn-gcas__group-time--now' : ''],
        }, group.time),
        h('div', { class: 'rn-gcas__group-name' }, group.name),
        group.isNow
          ? h('div', { class: 'rn-gcas__now', attrs: { 'data-testid': 'goal-group-now' } }, 'NOW')
          : null,
        h('div', { class: 'rn-gcas__group-line' }),
        h('div', { class: 'rn-gcas__group-count' }, group.count),
      ]),
      ...group.rows.map((row) => (row.kind === 'year'
        ? this.renderYearRow(h, row)
        : this.renderCheckRow(h, row))),
    ]));

    if (this.empty) {
      nodes.push(h('div', {
        key: 'empty',
        class: 'rn-gcas__empty',
        attrs: { 'data-testid': 'goal-cascade-empty' },
      }, this.emptyText));
    }

    nodes.push(h('div', {
      key: 'add',
      class: 'rn-gcas__add',
      attrs: { 'data-testid': 'goal-cascade-add' },
      on: { click: () => this.$emit('add') },
    }, [
      h('i', { class: 'rn-mi rn-gcas__add-glyph' }, 'add_circle_outline'),
      this.addLabel,
    ]));

    return h('div', { class: 'rn-gcas__groups' }, nodes);
  },
};

export default {
  name: 'OrganismGoalCascade',
  components: { CascadeLadder, GoalGroups },
  props: {
    /** 'phone' | 'tablet' | 'desktop' — the one breakpoint rule, resolved by the page. */
    shell: { type: String, default: 'phone' },
    /** Which ladder step is showing: day | week | month | year | lifetime. */
    tab: { type: String, default: 'day' },
    ladder: { type: Array, default: () => [] },
    rule: { type: String, default: '' },
    ruleIcon: { type: String, default: '' },
    listTitle: { type: String, default: '' },
    listDone: { type: Number, default: 0 },
    listTotal: { type: Number, default: 0 },
    groups: { type: Array, default: () => [] },
    empty: { type: Boolean, default: false },
    emptyText: { type: String, default: '' },
    addLabel: { type: String, default: '' },
    /** The read failed AND nothing is cached. Never "a request is in flight". */
    loadError: { type: Boolean, default: false },
    retrying: { type: Boolean, default: false },
  },
  computed: {
    ladderProps() {
      return { steps: this.ladder, rule: this.rule, ruleIcon: this.ruleIcon };
    },
    groupProps() {
      return {
        groups: this.groups,
        empty: this.empty,
        emptyText: this.emptyText,
        addLabel: this.addLabel,
        loadError: this.loadError,
        retrying: this.retrying,
      };
    },
    /** One listener map, so the phone list and the split list cannot diverge. */
    groupListeners() {
      return {
        toggle: (row) => this.$emit('toggle-row', row),
        edit: (row) => this.$emit('edit-row', row),
        delete: (row) => this.$emit('delete-row', row),
        'open-year': (row) => this.$emit('open-year', row),
        add: () => this.$emit('add'),
        retry: () => this.$emit('retry'),
      };
    },
  },
};
</script>

<style>
.rn-gcas {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

/* The card chrome every block here shares, declared once by the organism. */
.rn-gcard {
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
}

.rn-gcas--tablet .rn-gcard,
.rn-gcas--desktop .rn-gcard {
  border-radius: 20px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .08), 0 2px 4px -1px rgba(0, 0, 0, .05);
}

/* The mock replays an entrance by alternating rn-in0 / rn-in1; the list carries
   `:key="tab"` instead, so a step change remounts and animates it once. */
@keyframes rn-gcas-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: none; }
}

.rn-gcas__enter {
  animation: rn-gcas-in .3s ease;
}

.rn-gcas__list {
  padding: 14px 16px 6px;
}

.rn-gcas__list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.rn-gcas__list-title {
  font-size: 17px;
  font-weight: 700;
}

.rn-gcas__list-count {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
}

.rn-gcas__list-count b {
  color: rgba(0, 0, 0, .87);
}

/* ---------------- groups ---------------- */

.rn-gcas__group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 0 4px;
}

.rn-gcas__group-time {
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .5);
  font-variant-numeric: tabular-nums;
}

.rn-gcas__group-time--now {
  color: #e68900;
}

.rn-gcas__group-name {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .4px;
  text-transform: uppercase;
  color: rgba(0, 0, 0, .55);
}

.rn-gcas__now {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 152, 0, .14);
  color: #e68900;
}

.rn-gcas__group-line {
  flex: 1;
  height: 1px;
  background: rgba(0, 0, 0, .06);
}

.rn-gcas__group-count {
  font-size: 11px;
  color: rgba(0, 0, 0, .45);
}

.rn-gcas__row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 4px 0;
  cursor: pointer;
}

/* Quiet until the row is hovered, because the row's own job is the tick — but
   always 32px of real target, and always visible on a touch shell, where there
   is no hover to reveal it. */
.rn-gcas__row-act {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .32);
  font: inherit;
  cursor: pointer;
}

/* Only the first of the pair pushes right, so the two stay one cluster. */
.rn-gcas__row-edit {
  margin-left: auto;
}

.rn-gcas__row:hover .rn-gcas__row-act,
.rn-gcas__row-act:focus {
  color: rgba(0, 0, 0, .6);
}

.rn-gcas__row-act:hover {
  background: rgba(40, 139, 213, .1);
  color: #288bd5;
}

.rn-gcas__row-act--danger:hover {
  background: rgba(211, 47, 47, .1);
  color: #d32f2f;
}

.rn-gcas__row-act-glyph {
  font-size: 18px;
}

.rn-gcas__box {
  font-size: 28px;
}

.rn-gcas__row-text {
  flex: 1;
  min-width: 0;
}

.rn-gcas__row-body {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
  color: rgba(0, 0, 0, .87);
}

.rn-gcas__row-body--done {
  text-decoration: line-through;
  color: rgba(0, 0, 0, .45);
}

.rn-gcas__row-meta {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
  margin-top: 2px;
}

.rn-gcas__bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

.rn-gcas__bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: #eee;
  overflow: hidden;
}

.rn-gcas__bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width .4s;
}

.rn-gcas__bar-label {
  font-size: 11px;
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
}

.rn-gcas__chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
}

.rn-gcas__yrow {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 4px 0;
  color: inherit;
  text-decoration: none;
}

.rn-gcas__ypct {
  font-size: 11px;
  font-weight: 700;
}

.rn-gcas__yrow-text {
  flex: 1;
  min-width: 0;
}

.rn-gcas__yrow-body {
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.rn-gcas__yrow-chevron {
  font-size: 22px;
  color: rgba(0, 0, 0, .35);
}

.rn-gcas__empty {
  padding: 24px 0 18px;
  text-align: center;
  font-size: 14px;
  color: rgba(0, 0, 0, .45);
}

.rn-gcas__add {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  margin-top: 8px;
  color: #288bd5;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.rn-gcas__add-glyph {
  font-size: 28px;
}

/* ---------------- tablet / desktop ---------------- */

.rn-gcas__split {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.rn-gcas__side {
  width: 380px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  overflow-y: auto;
}

/* The left pane stays put while the right one scrolls. Sticky, not just a
   height chain: iPad WebKit can leave the chain's `height: 100%` unresolved,
   and then the whole body scrolls. Sticky holds in both cases; the max-height
   (viewport less the shell's head and padding) keeps a tall pane scrollable. */
.rn-gcas--tablet .rn-gcas__side,
.rn-gcas--desktop .rn-gcas__side {
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: calc(100vh - 120px);
  max-height: calc(100dvh - 120px);
  overflow-y: auto;
}

.rn-gcas--desktop .rn-gcas__split {
  gap: 20px;
}

.rn-gcas--desktop .rn-gcas__side {
  width: 420px;
  gap: 16px;
}

.rn-gcas__list--split {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 20px 8px;
}
</style>
