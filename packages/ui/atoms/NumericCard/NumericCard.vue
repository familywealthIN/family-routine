<template>
  <v-card>
    <div>
      <h1 class="text-xs-center" style="font-size: 48px; line-height: 1;">{{ details && details.value || '0' }}</h1>
      <div class="text-xs-center" style="color: #777">
        {{ details && details.name || 'Loading...' }}
        <v-tooltip v-if="details && details.description" bottom>
          <template #activator="{ on }">
            <v-icon small v-on="on">info_outline</v-icon>
          </template>
          <span>{{ details.description }}</span>
        </v-tooltip>
      </div>
    </div>
  </v-card>
</template>

<script>
export default {
  props: {
    details: {
      type: Object,
      default: () => ({
        value: 0,
        name: 'Loading...',
      }),
    },
  },
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
