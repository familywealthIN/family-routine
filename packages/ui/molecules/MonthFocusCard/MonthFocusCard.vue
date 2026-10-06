<template>
  <!--
    The focused month: its own goal, then its weeks as big checklist rows that
    EXPAND IN PLACE. Tapping a week neither navigates nor opens a modal — it
    unfolds its 7-day strip and its day rows directly underneath, because the
    week and its days are one thought and splitting them across screens is what
    the nested expansion panels got wrong.

    Edit and delete are not on the MONTH or WEEK row: they live behind the ⋮,
    which opens an action sheet. "Add week goal" / "Add day goal" are inline rows
    instead, since adding is the frequent act and deleting is the rare one.

    A DAY row is the exception, and it carries an edit glyph of its own. A day
    goal is a whole goal item — markdown contribution, tags, subtasks, the
    milestone link — so it has a real editor to open, and the whole row is
    already the TICK (the design draws it that way, and that is the gesture the
    user repeats). So editing gets its own 32px target with `@click.stop`, the
    same shape `GoalCascade` uses on the Goals page, rather than taking the row
    tap away from completing a goal or burying one action behind a second sheet.
  -->
  <div class="rn-mfc" :class="`rn-mfc--${shell}`" data-testid="month-focus-card">
    <template v-if="month && month.goal">
      <div class="rn-mfc__head">
        <div class="rn-mfc__eyebrow" :style="{ color: month.status.color }">
          <span
            class="rn-mfc__pulse"
            :class="{ 'rn-mfc__pulse--live': month.isCurrent && !month.isComplete }"
            :style="{ background: month.status.color }"
          ></span>
          <span data-testid="month-focus-status">
            {{ month.name.toUpperCase() }} · {{ month.status.label.toUpperCase() }}
          </span>
        </div>
        <div class="rn-mfc__tally">
          <b>{{ month.weeksDone }}</b> / {{ monthThreshold }} weeks
        </div>
      </div>

      <div class="rn-mfc__bar">
        <div
          class="rn-mfc__bar-fill"
          :style="{ width: `${month.percent}%`, background: month.status.color }"
        ></div>
      </div>

      <div class="rn-mfc__goal">
        <button
          type="button"
          class="rn-mfc__box rn-mfc__box--month"
          :style="{ color: month.isComplete ? '#4CAF50' : 'rgba(0,0,0,.54)' }"
          :title="month.isComplete ? 'Untick this month goal' : 'Tick this month goal'"
          data-testid="month-focus-tick"
          @click="$emit('tick-month', month)"
        >
          <i class="rn-mi">{{ month.isComplete ? 'check_box' : 'check_box_outline_blank' }}</i>
        </button>
        <div class="rn-mfc__goal-text">
          <div class="rn-mfc__goal-body" data-testid="month-focus-body">{{ month.goal.body }}</div>
          <div class="rn-mfc__goal-rule" data-testid="month-focus-rule">{{ month.rule }}</div>
        </div>
        <button
          type="button"
          class="rn-mfc__more"
          title="Month goal actions"
          data-testid="month-focus-menu"
          @click="$emit('menu', { kind: 'month', month })"
        ><i class="rn-mi">more_vert</i></button>
      </div>

      <div class="rn-mfc__section">
        <span>WEEKS</span>
        <span class="rn-mfc__section-count">{{ month.weeksDone }} of {{ month.weeks.length }} done</span>
      </div>

      <div
        v-for="week in month.weeks"
        :key="week.id"
        class="rn-mfc__week"
        :data-testid="`week-row-${week.id}`"
      >
        <div class="rn-mfc__week-row">
          <button
            type="button"
            class="rn-mfc__box"
            :style="{ color: week.isComplete ? '#4CAF50' : 'rgba(0,0,0,.54)' }"
            :title="week.canTickByHand ? 'Tick this week goal' : 'Ticked automatically by its day goals'"
            :data-testid="`week-tick-${week.id}`"
            @click="$emit('tick-week', week)"
          >
            <i class="rn-mi">{{ week.isComplete ? 'check_box' : 'check_box_outline_blank' }}</i>
          </button>

          <div
            class="rn-mfc__week-text"
            :data-testid="`week-expand-${week.id}`"
            @click="$emit('expand', week)"
          >
            <div
              class="rn-mfc__week-body"
              :style="{ color: week.isComplete ? 'rgba(0,0,0,.55)' : 'rgba(0,0,0,.87)' }"
            >{{ week.body }}</div>
            <div class="rn-mfc__week-meta">
              <span class="rn-mfc__week-range">Week {{ week.week }} · {{ week.rangeLabel }}</span>
              <span
                class="rn-mfc__week-chip"
                :style="{ background: week.status.bg, color: week.status.chipColor }"
                :data-testid="`week-status-${week.id}`"
              >{{ week.status.label }}</span>
            </div>
            <div class="rn-mfc__week-progress">
              <span class="rn-mfc__week-bar">
                <span
                  class="rn-mfc__week-bar-fill"
                  :style="{ width: `${week.percent}%`, background: week.barColor }"
                ></span>
              </span>
              <span class="rn-mfc__week-days">
                <b>{{ week.doneDays }}</b>/{{ weekThreshold }} days
              </span>
            </div>
          </div>

          <button
            type="button"
            class="rn-mfc__more rn-mfc__more--week"
            title="Week goal actions"
            :data-testid="`week-menu-${week.id}`"
            @click="$emit('menu', { kind: 'week', week, month })"
          ><i class="rn-mi">more_vert</i></button>
          <button
            type="button"
            class="rn-mfc__chev"
            :title="openWeekId === week.id ? 'Collapse' : 'Expand'"
            @click="$emit('expand', week)"
          >
            <i class="rn-mi">{{ openWeekId === week.id ? 'expand_less' : 'expand_more' }}</i>
          </button>
        </div>

        <div
          v-if="openWeekId === week.id"
          class="rn-mfc__days"
          :data-testid="`week-days-${week.id}`"
        >
          <div class="rn-mfc__dots">
            <div v-for="dot in week.dots" :key="dot.key" class="rn-mfc__dot">
              <span
                class="rn-mfc__dot-label"
                :style="{
                  color: dot.isToday ? '#e68900' : 'rgba(0,0,0,.45)',
                  fontWeight: dot.isToday ? 700 : 500,
                }"
              >{{ dot.label }}</span>
              <span class="rn-mfc__dot-glyph">
                <i
                  class="rn-mi"
                  :style="{ fontSize: `${dot.size}px`, color: dot.color }"
                >{{ dot.icon }}</i>
              </span>
              <span class="rn-mfc__dot-num">{{ dot.num }}</span>
            </div>
          </div>

          <div
            v-for="day in week.days"
            :key="day.id"
            class="rn-mfc__day"
            :data-testid="`day-row-${day.id}`"
            @click="$emit('tick-day', { day, week })"
          >
            <i
              class="rn-mi rn-mfc__day-box"
              :style="{ color: day.isComplete ? '#288bd5' : 'rgba(0,0,0,.54)' }"
            >{{ day.isComplete ? 'check_box' : 'check_box_outline_blank' }}</i>
            <span
              class="rn-mfc__day-body"
              :style="{
                textDecoration: day.isComplete ? 'line-through' : 'none',
                color: day.isComplete ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.87)',
              }"
            >{{ day.body }}</span>
            <span
              class="rn-mfc__day-date"
              :style="{
                color: day.isToday ? '#e68900' : 'rgba(0,0,0,.45)',
                fontWeight: day.isToday ? 700 : 500,
              }"
            >{{ day.isToday ? 'Today' : day.dateLabel }}</span>
            <!--
              `.stop` is load-bearing: without it one tap would open the editor
              AND tick the day. The row stays the tick; this is the only way in
              to the full day-goal editor.
            -->
            <button
              type="button"
              class="rn-mfc__day-edit"
              title="Edit day goal"
              aria-label="Edit day goal"
              :data-testid="`day-edit-${day.id}`"
              @click.stop="$emit('edit-day', { day, week })"
            ><i class="rn-mi">edit</i></button>
          </div>

          <div v-if="!week.days.length" class="rn-mfc__empty-days">
            No day goals yet. They count toward this week's {{ weekThreshold }}.
          </div>

          <button
            type="button"
            class="rn-mfc__add rn-mfc__add--day"
            :data-testid="`add-day-${week.id}`"
            @click="$emit('add-day', week)"
          >
            <i class="rn-mi">add_circle_outline</i>Add day goal
          </button>
        </div>
      </div>

      <button
        type="button"
        class="rn-mfc__add rn-mfc__add--week"
        data-testid="add-week-goal"
        @click="$emit('add-week', month)"
      >
        <i class="rn-mi">add_circle_outline</i>Add week goal
      </button>
    </template>

    <div v-else-if="month" class="rn-mfc__blank" data-testid="month-focus-empty">
      <div class="rn-mfc__blank-ring"><i class="rn-mi">flag</i></div>
      <div class="rn-mfc__blank-title">No goal for {{ month.name }}</div>
      <div class="rn-mfc__blank-sub">{{ emptySub }}</div>
      <button
        type="button"
        class="rn-mfc__blank-cta"
        data-testid="add-month-goal"
        @click="$emit('add-month', month)"
      ><i class="rn-mi">add</i>Set month goal</button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoleculeMonthFocusCard',
  props: {
    /** One entry of `buildYearGoal().months`. */
    month: { type: Object, default: null },
    /** Which week is unfolded. One at a time, like the design. */
    openWeekId: { type: String, default: '' },
    shell: { type: String, default: 'phone' },
    weekThreshold: { type: Number, default: 5 },
    monthThreshold: { type: Number, default: 3 },
    /** Written by the page: it knows the year title and how many months remain. */
    emptySub: { type: String, default: '' },
  },
};
</script>

<style>
.rn-mfc {
  background: #fff;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, .1), 0 2px 4px -1px rgba(0, 0, 0, .06);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  box-sizing: border-box;
  overflow: hidden;
}

.rn-mfc--phone {
  border-radius: 16px;
  padding: 16px;
}

.rn-mfc--tablet,
.rn-mfc--desktop {
  border-radius: 20px;
  padding: 18px 20px;
}

.rn-mfc__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rn-mfc__eyebrow {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .6px;
  white-space: nowrap;
}

.rn-mfc__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.rn-mfc__pulse--live {
  animation: rn-pulse 1.4s ease-in-out infinite;
}

.rn-mfc__tally {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
}

.rn-mfc__tally b {
  color: rgba(0, 0, 0, .87);
}

.rn-mfc__bar {
  height: 4px;
  border-radius: 2px;
  background: rgba(0, 0, 0, .08);
  overflow: hidden;
  margin-top: 10px;
}

.rn-mfc__bar-fill {
  display: block;
  height: 100%;
  border-radius: 2px;
  transition: width .4s;
}

.rn-mfc__goal {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-top: 14px;
}

.rn-mfc__box {
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
  line-height: 1;
}

.rn-mfc__box .rn-mi {
  font-size: 28px;
}

.rn-mfc__box--month .rn-mi {
  font-size: 30px;
}

.rn-mfc__goal-text {
  flex: 1;
  min-width: 0;
}

.rn-mfc__goal-body {
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
}

.rn-mfc__goal-rule {
  font-size: 12px;
  color: rgba(0, 0, 0, .54);
  margin-top: 3px;
}

.rn-mfc__more,
.rn-mfc__chev {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .45);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.rn-mfc__more .rn-mi {
  font-size: 22px;
}

.rn-mfc__more--week .rn-mi {
  font-size: 20px;
}

.rn-mfc__chev .rn-mi {
  font-size: 22px;
}

.rn-mfc__section {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 14px;
  padding-bottom: 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .5);
}

.rn-mfc__section-count {
  font-weight: 400;
  letter-spacing: 0;
  color: rgba(0, 0, 0, .54);
}

.rn-mfc__week {
  border-top: 1px solid rgba(0, 0, 0, .06);
}

.rn-mfc__week-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 6px 0;
}

.rn-mfc__week-text {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.rn-mfc__week-body {
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
}

.rn-mfc__week-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 3px;
  flex-wrap: wrap;
}

.rn-mfc__week-range {
  font-size: 12px;
  color: rgba(0, 0, 0, .5);
}

.rn-mfc__week-chip {
  font-size: 10px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 999px;
}

.rn-mfc__week-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}

.rn-mfc__week-bar {
  flex: 1;
  height: 5px;
  border-radius: 3px;
  background: #eee;
  overflow: hidden;
}

.rn-mfc__week-bar-fill {
  display: block;
  height: 100%;
  border-radius: 3px;
  transition: width .4s;
}

.rn-mfc__week-days {
  font-size: 11px;
  color: rgba(0, 0, 0, .54);
  white-space: nowrap;
}

.rn-mfc__week-days b {
  color: rgba(0, 0, 0, .8);
}

.rn-mfc__days {
  padding: 0 0 12px 40px;
  animation: rn-sheet-in .25s ease;
}

.rn-mfc__dots {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 2px;
  padding: 8px 0 10px;
  border-radius: 12px;
  background: #fafafa;
}

.rn-mfc__dot {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}

.rn-mfc__dot-label {
  font-size: 10px;
}

.rn-mfc__dot-glyph {
  height: 20px;
  display: flex;
  align-items: center;
}

.rn-mfc__dot-num {
  font-size: 10px;
  color: rgba(0, 0, 0, .4);
}

.rn-mfc__day {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, .05);
}

.rn-mfc__day-box {
  font-size: 24px;
  flex-shrink: 0;
}

.rn-mfc__day-body {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  line-height: 1.35;
}

.rn-mfc__day-date {
  font-size: 11px;
  white-space: nowrap;
}

/* Always visible, never hover-only: this is a touch screen first, so there is no
   hover to reveal it — the same rule GoalCascade's row actions follow. */
.rn-mfc__day-edit {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgba(0, 0, 0, .32);
  font: inherit;
  cursor: pointer;
}

.rn-mfc__day-edit .rn-mi {
  font-size: 18px;
}

.rn-mfc__day:hover .rn-mfc__day-edit,
.rn-mfc__day-edit:focus {
  color: rgba(0, 0, 0, .6);
}

.rn-mfc__day-edit:hover {
  background: rgba(40, 139, 213, .1);
  color: #288bd5;
}

.rn-mfc__empty-days {
  font-size: 13px;
  color: rgba(0, 0, 0, .45);
  padding: 10px 0 2px;
}

.rn-mfc__add {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  background: transparent;
  color: #288bd5;
  font-family: inherit;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  text-align: left;
}

.rn-mfc__add--day {
  min-height: 40px;
  font-size: 13px;
}

.rn-mfc__add--day .rn-mi {
  font-size: 22px;
}

.rn-mfc__add--week {
  min-height: 50px;
  gap: 12px;
  border-top: 1px solid rgba(0, 0, 0, .06);
  font-size: 15px;
}

.rn-mfc__add--week .rn-mi {
  font-size: 28px;
}

.rn-mfc__blank {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 8px 12px;
}

.rn-mfc__blank-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  border: 2px dashed rgba(0, 0, 0, .2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, .35);
}

.rn-mfc__blank-ring .rn-mi {
  font-size: 26px;
}

.rn-mfc__blank-title {
  font-size: 17px;
  font-weight: 700;
  margin-top: 12px;
}

.rn-mfc__blank-sub {
  font-size: 13px;
  color: rgba(0, 0, 0, .54);
  margin-top: 4px;
  max-width: 280px;
  line-height: 1.5;
}

.rn-mfc__blank-cta {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 18px;
  margin-top: 16px;
  border: 0;
  border-radius: 20px;
  background: #288bd5;
  color: #fff;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, .14);
}

.rn-mfc__blank-cta .rn-mi {
  font-size: 18px;
}
</style>
