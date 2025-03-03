<template>
  <v-switch v-if="isIPad" v-model="wakeSwitch" v-on:change="handleChange" label="Wake" class="mr-3"></v-switch>
</template>

<script>
export default {
  name: 'WakeCheck',
  data() {
    return {
      wakeSwitch: false,
      wakeLock: undefined,
      isIPad: navigator.userAgent.match(/iPad/i) !== null,
    };
  },
  methods: {
    async requestWakeLock() {
      if ('WakeLock' in window && 'request' in window.WakeLock) {
        const controller = new AbortController();
        const { signal } = controller;
        window.WakeLock.request('screen', { signal }).catch((e) => {
          if (e.name === 'AbortError') {
            this.wakeSwitch = false;
            console.log('Wake Lock was aborted');
          } else {
            console.error(`${e.name}, ${e.message}`);
            this.wakeSwitch = false;
          }
        });
        console.log('Wake Lock is active');
        return controller;
      } if ('wakeLock' in navigator && 'request' in navigator.wakeLock) {
        try {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', (e) => {
            console.log(e);
            console.log('Wake Lock was released');
            this.wakeSwitch = false;
          });

          console.log('Wake Lock is active');
        } catch (e) {
          this.wakeSwitch = false;
          console.error(`${e.name}, ${e.message}`);
        }
      }
      return null;
    },
    handleChange() {
      console.log('abc');
      this.onWakeSwitchChange();
    },
    async onWakeSwitchChange() {
      if (this.wakeSwitch) {
        this.wakeLock = await this.requestWakeLock();
      } else {
        if ('WakeLock' in window && 'request' in window.WakeLock) {
          this.wakeLock.abort();
        } else if ('wakeLock' in navigator && 'request' in navigator.wakeLock) {
          this.wakeLock.release();
        }
        this.wakeLock = null;
      }
    },
    async handleVisibilityChange() {
      console.log('=== visible');
      if (this.wakeLock !== undefined && document.visibilityState === 'visible') {
        this.wakeLock = await this.requestWakeLock();
        this.wakeSwitch = true;
      }
    },
  },
  mounted() {
    document.addEventListener(
      'visibilitychange',
      this.handleVisibilityChange,
    );
    if ('WakeLock' in window && 'request' in window.WakeLock) {
      console.log('=== window.WakeLock');
    } else if ('wakeLock' in navigator && 'request' in navigator.wakeLock) {
      console.log('=== navigator.wakeLock');
    } else {
      console.error('Wake Lock API not supported.');
    }
  },
};
</script>

<style>

</style>
