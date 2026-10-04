<template>
  <!--
    The points chip as the focus design draws it: a flat 24/28px pill, not a
    Vuetify v-chip. `PointsChip` stays the chip for the legacy toolbars — it
    inherits `#mobileLayout .v-chip` height overrides that would fight the
    64px top bar here.

    Same display semantics as PointsChip: '…' loading, '—' unknown (a balance
    we failed to load is not zero), '∞' when subscribed.
  -->
  <div
    class="rn-points"
    :style="{ height: `${size}px`, fontSize: `${size > 24 ? 14 : 13}px` }"
    :title="tooltipText"
    data-testid="focus-points-chip"
    @click="$emit('click')"
  >
    <i class="rn-mi rn-points__icon">diamond</i>
    <span class="rn-points__value">{{ displayValue }}</span>
  </div>
</template>

<script>
export default {
  name: 'MoleculeFocusPointsChip',
  props: {
    available: { type: Number, default: 0 },
    pendingToday: { type: Number, default: 0 },
    entitled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    error: { type: Boolean, default: false },
    size: { type: Number, default: 24 },
  },
  computed: {
    displayValue() {
      if (this.loading) return '…';
      if (this.error) return '—';
      if (this.entitled) return '∞';
      return Math.round(this.available).toLocaleString();
    },
    tooltipText() {
      if (this.loading) return '';
      if (this.error) return "Points unavailable — we couldn't reach the server.";
      if (this.entitled) return 'Subscribed — unlimited redeems';
      const pending = Math.round(this.pendingToday);
      const base = `${Math.round(this.available).toLocaleString()} points available`;
      return pending > 0
        ? `${base} · ${pending.toLocaleString()} pending today`
        : base;
    },
  },
};
</script>

<style>
.rn-points {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 10px;
  border-radius: 24px;
  background: #288bd5;
  color: #fff;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-weight: 600;
  flex-shrink: 0;
  cursor: pointer;
}

.rn-points__icon {
  font-size: 16px;
}

.rn-points__value {
  font-variant-numeric: tabular-nums;
}
</style>
