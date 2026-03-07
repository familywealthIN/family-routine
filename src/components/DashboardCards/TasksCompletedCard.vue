<template>
  <v-card class="pb-3">
    <v-card-title>
      <h3 class="headline">{{ details && details.name || 'Tasks' }}</h3>
    </v-card-title>
    <v-card-text class="pt-2">
      <div class="task-highlight">
        <div v-for="detail in details.values" :key="detail.name">
          <div class="text-xs-center task-item" style="color: #777">
            {{ detail && detail.name }}
          </div>
          <h1 class="text-xs-center" style="font-size: 20px;">
            <v-progress-circular
              :value="countTotal(detail.value, detail.total)"
              :size="80"
              :rotate="-90"
              class="mt-3"
              color="primary"
              width="8">
              {{ detail && detail.value }}/{{ detail && detail.total }}
            </v-progress-circular>
          </h1>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script>
export default {
  props: ['details'],
  methods: {
    countTotal(val, tot) {
      return ((Number(val) / Number(tot)) * 100) || 0;
    },
  },
};
</script>

<style scoped>
  .task-highlight {
    width: 100%;
    display: flex;
    justify-content: space-around;
    align-items: center;
  }
  .task-item {
    padding: 0 24px;
  }
</style>
