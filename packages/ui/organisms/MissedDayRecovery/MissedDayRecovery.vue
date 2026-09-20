<template>
  <!--
    Presentational acknowledgement of a day that got away, plus the one concrete
    thing the user can do about it. Pure: the derived missed day comes in, the
    two intents go out. The copy is support, never reproach — the app noticing
    is the point, not the shortfall.
  -->
  <AtomCard
    v-if="missedDay"
    class="missed-day-recovery pa-3"
    data-testid="missed-day-recovery"
  >
    <div class="d-flex align-center mb-2">
      <AtomIcon class="mr-2" color="primary" small>history</AtomIcon>
      <span class="missed-day-headline">{{ missedDay.weekday }} went unlogged.</span>
    </div>
    <p class="missed-day-note mb-3">
      One quiet day doesn't undo the week. Anything from {{ missedDay.weekday }} you
      still want to count can be picked up on the day itself.
    </p>
    <AtomButton
      small
      color="primary"
      class="ml-0"
      @click="$emit('open-day', missedDay.date)"
    >
      Pick {{ missedDay.weekday }} back up
    </AtomButton>
    <AtomButton small flat @click="$emit('dismiss', missedDay.date)">
      Not now
    </AtomButton>
  </AtomCard>
</template>

<script>
import { AtomButton, AtomCard, AtomIcon } from '../../atoms';

export default {
  name: 'OrganismMissedDayRecovery',
  components: { AtomButton, AtomCard, AtomIcon },
  props: {
    // { date: 'DD-MM-YYYY', weekday: 'Wednesday' }, or null when the week holds
    // no missed day — the card owns its own v-if so the page stays thin.
    missedDay: {
      type: Object,
      default: null,
    },
  },
};
</script>

<style scoped>
.missed-day-recovery .missed-day-headline {
  font-size: 15px;
  font-weight: 500;
}

.missed-day-recovery .missed-day-note {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.57);
  margin-bottom: 0;
}
</style>
