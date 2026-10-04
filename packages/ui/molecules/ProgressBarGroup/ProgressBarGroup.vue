<template>
  <!--
    "Tasks and Activities Completed" as the redesign draws it: three labelled
    6px bars instead of `atoms/TasksCompletedCard`'s v-progress-linear trio
    (Progress.dc.html § doneRows).

    The heading carries the SCOPE, because `getProgressReport` divides the
    counts by the number of routine days in the window: a Day period is today,
    anything longer is a per-day mean, and the Year row adds the milestone
    total. `constants/progress.js completedScope()` is the one place that word
    is decided.

    A row whose value the report did not return prints an em dash and an empty
    track rather than 0 / 0, which would read as "nothing done".
  -->
  <div class="rn-pbars" data-testid="progress-bars">
    <div class="rn-pbars__heading" data-testid="progress-bars-heading">{{ heading }}</div>
    <div class="rn-pbars__rows">
      <div
        v-for="row in rows"
        :key="row.key"
        class="rn-pbars__row"
        data-testid="progress-bar-row"
      >
        <div class="rn-pbars__top">
          <i class="rn-mi rn-pbars__icon">{{ row.icon }}</i>
          <div class="rn-pbars__label">{{ row.label }}</div>
          <div class="rn-pbars__num" data-testid="progress-bar-value">
            <b>{{ known(row) ? row.value : '—' }}</b
            ><span v-if="known(row)" class="rn-pbars__total"> / {{ row.total }}</span>
          </div>
        </div>
        <div class="rn-pbars__track">
          <div
            class="rn-pbars__fill"
            :style="{ width: fillWidth(row) }"
            data-testid="progress-bar-fill"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MoleculeProgressBarGroup',
  props: {
    /** "COMPLETED · AVG PER DAY". */
    heading: { type: String, default: '' },
    /** `[{ key, label, icon, value, total }]`. `null` value/total = unknown. */
    rows: { type: Array, default: () => [] },
  },
  methods: {
    known(row) {
      return row.value != null && row.total != null;
    },
    fillWidth(row) {
      if (!this.known(row) || !Number(row.total)) return '0%';
      const pct = (Number(row.value) / Number(row.total)) * 100;
      return `${Math.max(0, Math.min(100, Math.round(pct)))}%`;
    },
  },
};
</script>

<style>
.rn-pbars {
  padding: 14px 16px;
}

.rn-pbars__heading {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-pbars__rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.rn-pbars__top {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.rn-pbars__icon {
  font-size: 16px;
  color: rgba(0, 0, 0, .5);
  align-self: center;
}

.rn-pbars__label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
}

.rn-pbars__num {
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.rn-pbars__total {
  color: rgba(0, 0, 0, .45);
}

.rn-pbars__track {
  height: 6px;
  border-radius: 3px;
  background: rgba(0, 0, 0, .06);
  margin-top: 6px;
  overflow: hidden;
}

.rn-pbars__fill {
  height: 100%;
  border-radius: 3px;
  background: #288bd5;
  transition: width .4s;
}
</style>
