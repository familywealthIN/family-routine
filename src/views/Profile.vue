<template>
  <div class="profile">
    <ProfileTime />
  </div>
</template>

<script>
import ProfileTime from '@/containers/ProfileTime.vue';

export default {
  name: 'profile',
  components: {
    ProfileTime,
  },
};
</script>
