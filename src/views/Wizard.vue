<template>
  <div class="wizard">
    <WelcomeWizard />
  </div>
</template>

<script>
// @ is an alias to /src
import WelcomeWizard from '@/containers/WelcomeWizard.vue';

export default {
  name: 'Wizard',
  components: {
    WelcomeWizard,
  },
};
</script>
