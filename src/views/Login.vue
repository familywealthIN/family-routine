<template>
  <div class="login">
    <LoginRoutine/>
  </div>
</template>

<script>
// @ is an alias to /src
import LoginRoutine from '@/components/LoginRoutine.vue'

export default {
  name: 'login',
  components: {
    LoginRoutine
  }
}
</script>
