<template>
  <div class="login">
    <LoginRoutine/>
  </div>
</template>

<script>
// @ is an alias to /src
import LoginRoutine from '@/containers/LoginRoutine.vue';

export default {
  name: 'login',
  components: {
    LoginRoutine,
  },
};
</script>
