<template>
  <v-card>
    <div>
      <h1 class="text-xs-center" style="font-size: 48px; line-height: 1;">{{ details.value }}</h1>
      <div class="text-xs-center" style="color: #777">{{ details && details.name || 'dummy' }}</div>
    </div>
  </v-card>
</template>

<script>
export default {
  props: ['details'],
};
</script>

<style scoped>
  .v-card {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
</style>
