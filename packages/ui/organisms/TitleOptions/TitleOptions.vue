<template>
  <!--
    Presentational day-header row for the dashboard: the date title plus its
    action cluster. On "today" it shows the wake toggle + skip-day switch +
    refresh; on any other date it shows just refresh. Props in, events out —
    no store / Apollo (the page owns skipDay state + the skipRoutine mutation
    and the refresh side-effect).
  -->
  <div class="d-flex pr-3 pl-3 pb-1 pt-2 title-options">
    <h2>{{ title }}</h2>
    <div class="action-box">
      <div v-if="isToday">
        <WakeCheck />
      </div>
      <div class="d-flex align-center">
        <AtomSwitch
          v-if="isToday"
          :input-value="skipDay"
          label="Skip Day"
          hide-details
          class="mt-0 pt-0"
          @change="$emit('skip-change', $event)"
        />
        <AtomButton
          icon
          small
          :loading="refreshing"
          :class="{ 'ml-2': isToday }"
          @click="$emit('refresh')"
        >
          <AtomIcon color="rgba(0,0,0,0.57)" size="24">refresh</AtomIcon>
        </AtomButton>
      </div>
    </div>
  </div>
</template>

<script>
import {
  AtomSwitch,
  AtomButton,
  AtomIcon,
  WakeCheck,
} from '../../atoms';

export default {
  name: 'TitleOptions',
  components: {
    AtomSwitch,
    AtomButton,
    AtomIcon,
    WakeCheck,
  },
  props: {
    // Date/title text shown on the left.
    title: { type: String, default: '' },
    // Today → show wake + skip-day controls; otherwise only refresh.
    isToday: { type: Boolean, default: false },
    // Skip-day switch state (page-owned; two-way via `skip-change`).
    skipDay: { type: Boolean, default: false },
    // Refresh button loading state.
    refreshing: { type: Boolean, default: false },
  },
};
</script>

<style scoped>
.title-options {
  width: 100%;
  justify-content: space-between;
  align-items: center;
}
.action-box {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
</style>
