<template>
  <v-switch v-if="isIPad" v-model="wakeSwitch" v-on:change="handleChange" label="Wake" class="mr-3"></v-switch>
</template>

<script>
import NoSleep from 'nosleep.js';

export default {
  name: 'WakeCheck',
  data() {
    return {
      wakeSwitch: false,
      isIPad: navigator.userAgent.match(/iPad/i) !== null,
      noSleep: new NoSleep(),
    };
  },
  methods: {
    handleChange() {
      if (this.wakeSwitch) {
        this.noSleep.enable();
      }
      this.noSleep.disable();
    },
    handleVisibilityChange() {
      console.log('=== visible');
      if (this.wakeSwitch && document.visibilityState === 'visible') {
        this.noSleep.enable();
      }
    },
  },
  mounted() {
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  },
};
</script>

<style></style>
