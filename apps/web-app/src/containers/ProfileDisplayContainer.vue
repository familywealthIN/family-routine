<template>
  <!-- One organism + the device's keep-awake service. No GraphQL: the choice is per device. -->
  <profile-display-settings
    :always-on="alwaysOn"
    @change-always-on="setAlwaysOn"
  />
</template>

<script>
import ProfileDisplaySettings from '@routine-notes/ui/organisms/ProfileDisplaySettings/ProfileDisplaySettings.vue';
import { alwaysOnCopy } from '@routine-notes/ui/constants/profile';
import { isAlwaysOnSaved, setAlwaysOn } from '../services/keepAwake';

export default {
  name: 'ProfileDisplayContainer',

  components: { ProfileDisplaySettings },

  data() {
    return {
      alwaysOn: isAlwaysOnSaved(),
    };
  },

  methods: {
    /**
     * The switch moves at once; a device that refuses (the plugin missing from
     * an older app build, a browser that drops the lock) puts it back and the
     * page says so.
     */
    setAlwaysOn(on) {
      this.alwaysOn = on;
      return setAlwaysOn(on).then((applied) => {
        if (applied) {
          this.$emit('changed', alwaysOnCopy(on).toast);
          return;
        }
        this.alwaysOn = !on;
        setAlwaysOn(!on);
        this.$emit('failed', 'This device kept its usual screen sleep');
      });
    },
  },
};
</script>
