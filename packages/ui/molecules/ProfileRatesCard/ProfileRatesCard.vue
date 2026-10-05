<template>
  <!--
    The two read-only sections of Profile: the D / K / G point rates and the
    roll-up chain.

    The old page's yellow "most settings here are READ ONLY" banner is gone. Each
    section header carries a `lock` glyph instead, so "you cannot change this"
    sits on the thing it is true of rather than on a banner above six cards, two
    of which *are* editable.

    Every figure is a function of `PROFILE_SETTINGS` (constants/profile.js). The
    design draws D "3 h", K "1 h" and "9 mos = yr"; the shipped settings say 24,
    2 and 6, and `docs/redesign/chassis.md` § Conflicts binds this card to the
    settings rather than to the mock.
  -->
  <section class="rn-prates" data-testid="profile-rates">
    <div class="rn-prates__head">
      POINT RATES<i class="rn-mi rn-prates__lock" title="Read only">lock</i>
    </div>

    <div class="rn-prates__grid">
      <div
        v-for="rate in rates"
        :key="rate.key"
        class="rn-prates__card"
        :style="{ background: rate.tint }"
        :data-testid="`profile-rate-${rate.key}`"
      >
        <div class="rn-prates__card-head" :style="{ color: rate.color }">
          {{ rate.key }} · {{ rate.name }}
        </div>
        <div class="rn-prates__card-value" :data-testid="`profile-rate-value-${rate.key}`">
          {{ rate.value }}
        </div>
        <div class="rn-prates__card-desc">{{ rate.desc }}</div>
      </div>
    </div>

    <div class="rn-prates__head rn-prates__head--chain">
      GOALS COMPLETE THEMSELVES<i class="rn-mi rn-prates__lock" title="Read only">lock</i>
    </div>

    <div class="rn-prates__chain" data-testid="profile-rollup-chain">
      <div v-for="cell in chain" :key="cell.key" class="rn-prates__link">
        <div class="rn-prates__cell" :data-testid="`profile-rollup-${cell.key}`">
          <div class="rn-prates__cell-n">{{ cell.n }}</div>
          <div class="rn-prates__cell-unit">{{ cell.unit }}</div>
        </div>
        <i v-if="cell.hasArrow" class="rn-mi rn-prates__arrow">arrow_forward</i>
      </div>
    </div>

    <p class="rn-prates__note" data-testid="profile-rollup-sentence">{{ sentence }}</p>
  </section>
</template>

<script>
import { PROFILE_SETTINGS } from '../../constants/settings';
import { rateCards, rollUpChain, rollUpSentence } from '../../constants/profile';

export default {
  name: 'MoleculeProfileRatesCard',
  props: {
    /**
     * The whole settings object, so a server-supplied one drops straight in.
     * Defaults to the shipped constants — the same ones the cascade reads.
     */
    settings: { type: Object, default: () => PROFILE_SETTINGS },
  },
  computed: {
    rates() {
      return rateCards(this.settings);
    },
    threshold() {
      return (this.settings && this.settings.autoCheckThreshold) || null;
    },
    chain() {
      return rollUpChain(this.threshold);
    },
    sentence() {
      return rollUpSentence(this.threshold);
    },
  },
};
</script>

<style>
.rn-prates {
  padding: 14px 16px 16px;
  box-sizing: border-box;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  color: rgba(0, 0, 0, .87);
}

.rn-prates__head {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .5px;
  color: rgba(0, 0, 0, .45);
}

.rn-prates__head--chain {
  margin-top: 18px;
}

.rn-prates__lock {
  font-size: 13px;
}

.rn-prates__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.rn-prates__card {
  padding: 10px 10px 12px;
  border-radius: 12px;
  min-width: 0;
}

.rn-prates__card-head {
  font-size: 12px;
  font-weight: 800;
}

.rn-prates__card-value {
  font-size: 20px;
  font-weight: 700;
  margin-top: 4px;
}

.rn-prates__card-desc {
  font-size: 11px;
  line-height: 1.35;
  color: rgba(0, 0, 0, .6);
  margin-top: 2px;
}

.rn-prates__chain {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-top: 10px;
}

.rn-prates__link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 2px;
}

.rn-prates__cell {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px;
  border-radius: 10px;
  background: #f4f4f4;
}

.rn-prates__cell-n {
  font-size: 15px;
  font-weight: 700;
}

.rn-prates__cell-unit {
  font-size: 10px;
  font-weight: 600;
  color: rgba(0, 0, 0, .5);
  white-space: nowrap;
}

.rn-prates__arrow {
  font-size: 14px;
  color: rgba(0, 0, 0, .35);
}

.rn-prates__note {
  font-size: 12px;
  line-height: 1.45;
  color: rgba(0, 0, 0, .55);
  margin: 8px 0 0;
}
</style>
