<template>
  <routine-focus />
</template>

<script>
// The Routine Focus home screen. Unlike every other view it is NOT wrapped by
// MobileLayout/DesktopLayout — it brings its own top bar, nav and drawer (see
// App.vue's `focusHome` branch), because the whole point of the redesign is
// that the home screen is the focused routine and nothing else.
import RoutineFocus from '@/pages/RoutineFocus.vue';

export default {
  name: 'RoutineFocusHome',
  components: { RoutineFocus },
};
</script>
