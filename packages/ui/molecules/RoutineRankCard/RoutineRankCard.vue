<template>
  <!--
    "Great going" / "Needs attention" - the top three and bottom three routines
    by score (Progress.dc.html § good/bad). Replaces the generic
    `molecules/TableCard` this page used to render twice.

    One component, two tones, because the only real difference is what a row
    means:
      - great-going rows are NOT links. There is nothing to fix, so a chevron
        promising a destination would be a lie.
      - attention rows ARE links, and they emit the routine's id. The mock links
        every one of them to the generic Routines page; the id is already in the
        data, so the real screen opens THAT routine (docs/redesign/chassis.md
        § "Things the mocks get wrong on purpose").

    Three fields are drawn only when the host actually has them - the routine's
    scheduled `time`, the 7-pip weekly hit `pattern`, and the attention row's
    `why`. `getProgressReport`'s good/bad cards carry id, name and score only,
    so the row degrades to what is true instead of inventing a time or a reason.
  -->
  <div class="rn-prank" data-testid="routine-rank-card">
    <div class="rn-prank__head">
      <i class="rn-mi rn-prank__glyph" :style="{ color: tone.color }">{{ tone.icon }}</i>
      <div class="rn-prank__title">{{ title }}</div>
    </div>

    <div v-if="!rows.length" class="rn-prank__empty" data-testid="routine-rank-empty">
      {{ emptyText }}
    </div>

    <component
      :is="attention ? 'a' : 'div'"
      v-for="(row, i) in rows"
      :key="row.id || row.name"
      class="rn-prank__row"
      :class="{ 'rn-prank__row--link': attention }"
      :style="{ borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,.06)' : '0' }"
      :href="attention ? href(row) : null"
      data-testid="routine-rank-row"
      :data-routine-id="row.id || ''"
      @click="open(row, $event)"
    >
      <div v-if="row.time" class="rn-prank__time">{{ row.time }}</div>
      <div class="rn-prank__body">
        <div class="rn-prank__name">{{ row.name }}</div>
        <div
          v-if="!attention && row.pattern && row.pattern.length"
          class="rn-prank__pips"
          data-testid="routine-rank-pips"
        >
          <span
            v-for="(hit, p) in row.pattern"
            :key="p"
            class="rn-prank__pip"
            :style="{ background: hit ? PROGRESS_COLORS.good : 'rgba(0,0,0,.12)' }"
          ></span>
        </div>
        <div v-if="attention && row.why" class="rn-prank__why">{{ row.why }}</div>
      </div>
      <div class="rn-prank__score" :style="{ color: tone.score }" data-testid="routine-rank-score">
        {{ row.score == null ? '—' : row.score }}{{ scoreSuffix }}
      </div>
      <i v-if="attention" class="rn-mi rn-prank__chevron">chevron_right</i>
    </component>
  </div>
</template>

<script>
import { PROGRESS_COLORS } from '../../constants/progress';

const TONES = {
  good: { icon: 'trending_up', color: PROGRESS_COLORS.good, score: PROGRESS_COLORS.up },
  attention: { icon: 'trending_down', color: PROGRESS_COLORS.attention, score: PROGRESS_COLORS.attention },
};

export default {
  name: 'MoleculeRoutineRankCard',
  props: {
    title: { type: String, default: '' },
    /** `good` = celebrate, no link. `attention` = deep-link to the routine. */
    variant: { type: String, default: 'good' },
    /** `[{ id, name, score, time?, why?, pattern?: [0|1 x7] }]`. */
    rows: { type: Array, default: () => [] },
    emptyText: { type: String, default: '' },
    /**
     * The report's routine score is a summed D/K/G figure, not a percentage, so
     * the suffix is the HOST's call. Empty by default - printing "%" on an
     * unbounded points total is the kind of plausible number this page avoids.
     */
    scoreSuffix: { type: String, default: '' },
    /** Resolved href per row, so the anchor is real for middle-click / SEO. */
    routeFor: { type: Function, default: null },
  },
  data() {
    return { PROGRESS_COLORS };
  },
  computed: {
    attention() {
      return this.variant === 'attention';
    },
    tone() {
      return TONES[this.variant] || TONES.good;
    },
  },
  methods: {
    href(row) {
      if (!this.routeFor) return '#';
      return this.routeFor(row) || '#';
    },
    /**
     * The anchor keeps a real href, but navigation goes through the host so the
     * router handles it - a pure molecule must not know about routing.
     */
    open(row, event) {
      if (!this.attention) return;
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      this.$emit('open-routine', row.id, row);
    },
  },
};
</script>

<style>
.rn-prank {
  padding: 14px 16px 6px;
}

.rn-prank__head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rn-prank__glyph {
  font-size: 18px;
}

.rn-prank__title {
  font-size: 15px;
  font-weight: 700;
}

.rn-prank__empty {
  padding: 14px 0 16px;
  font-size: 13px;
  color: rgba(0, 0, 0, .5);
}

.rn-prank__row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  color: inherit;
  text-decoration: none;
}

.rn-prank__row--link {
  margin: 0 -8px;
  padding: 0 8px;
  border-radius: 10px;
  cursor: pointer;
}

.rn-prank__row--link:hover {
  background: #fafafa;
}

.rn-prank__time {
  width: 40px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(0, 0, 0, .5);
  font-variant-numeric: tabular-nums;
}

.rn-prank__body {
  flex: 1;
  min-width: 0;
}

.rn-prank__name {
  font-size: 14px;
  font-weight: 600;
}

.rn-prank__pips {
  display: flex;
  gap: 3px;
  margin-top: 4px;
}

.rn-prank__pip {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.rn-prank__why {
  font-size: 12px;
  color: rgba(0, 0, 0, .55);
  margin-top: 2px;
}

.rn-prank__score {
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.rn-prank__chevron {
  font-size: 20px;
  color: rgba(0, 0, 0, .3);
}
</style>
