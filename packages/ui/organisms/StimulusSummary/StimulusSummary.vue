<template>
  <!--
    Presentational D/K/G stimulus summary — three stacked progress circles.
    Pure: values in, nothing else. The container derives D/K/G and feeds them.
  -->
  <div class="stimulus-summary">
    <AtomCard class="mb-3 pb-3">
      <div class="text-xs-center">
        <AtomProgressCircular
          :value="d"
          :size="50"
          :rotate="-90"
          class="mt-3"
          width="6"
          color="#4caf50"
        >D</AtomProgressCircular>
      </div>
    </AtomCard>
    <AtomCard class="mb-3 pb-3">
      <div class="text-xs-center">
        <AtomProgressCircular
          :value="k"
          :size="50"
          :rotate="-90"
          class="mt-3"
          width="6"
          color="#E53935"
        >K</AtomProgressCircular>
      </div>
    </AtomCard>
    <AtomCard class="mb-3 pb-3">
      <div class="text-xs-center">
        <AtomProgressCircular
          :value="g"
          :size="50"
          :rotate="-90"
          class="mt-3"
          width="6"
          color="#2196F3"
        >G</AtomProgressCircular>
      </div>
    </AtomCard>
  </div>
</template>

<script>
import { AtomCard, AtomProgressCircular } from '../../atoms';

export default {
  name: 'OrganismStimulusSummary',
  components: { AtomCard, AtomProgressCircular },
  props: {
    d: { type: Number, default: 0 },
    k: { type: Number, default: 0 },
    g: { type: Number, default: 0 },
  },
};
</script>

<style scoped>
.stimulus-summary {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
</style>
