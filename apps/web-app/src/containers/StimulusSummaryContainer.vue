<template>
  <!--
    Container home for the StimulusSummary organism (see ARCHITECTURE.md).
    Owns its READ: injects the dashboard data provider and derives the D/K/G
    totals itself (via the pure utils/stimulusTotals), so the page no longer
    carries countTotal / totalD / totalK / totalG or the weekOfMonth helper.
  -->
  <AtomFlex sm2 d-flex class="pl-2 pr-3 hidden-xs-only">
    <StimulusSummary :d="d" :k="k" :g="g" />
  </AtomFlex>
</template>

<script>
import { AtomFlex } from '@routine-notes/ui/atoms';
import StimulusSummary from '@routine-notes/ui/organisms/StimulusSummary/StimulusSummary.vue';
import { stimulusTotal } from '../utils/stimulusTotals';

export default {
  name: 'StimulusSummaryContainer',
  components: { AtomFlex, StimulusSummary },
  inject: ['routineData'],
  computed: {
    d() {
      return stimulusTotal(this.routineData.tasklist, 'D', this.routineData.date);
    },
    k() {
      return stimulusTotal(this.routineData.tasklist, 'K', this.routineData.date);
    },
    g() {
      return stimulusTotal(this.routineData.tasklist, 'G', this.routineData.date);
    },
  },
};
</script>
