<template>
    <span class="pt-2 streak-checks"
        style="display: flex;align-items: center;justify-content: center;"
    >
        <template v-for="indx in stars">
          <template v-if="indx < Number(progress)">
            <v-avatar :key="indx" size="24">
              <v-icon color="green" size="24">check_circle</v-icon>
            </v-avatar>
          </template>
          <template v-else-if="indx === Number(progress)">
            <v-avatar :key="indx" size="24">
              <v-icon color="green" size="24">
                <template v-if="animate">
                  <template v-if="animateComplete">check_circle</template>
                  <template v-else>check_circle_outline</template>
                </template>
                <template v-else>check_circle</template>
              </v-icon>
            </v-avatar>
          </template>
          <template v-else>
            <v-avatar :key="indx" size="24">
              <v-icon color="green" size="24">check_circle_outline</v-icon>
            </v-avatar>
          </template>
          <v-divider :key="indx" v-if="indx !== 5"></v-divider>
        </template>
    </span>
</template>

<script>
export default {
  name: 'streak-checks',
  props: ['progress', 'animate'],
  data() {
    return {
      stars: [1, 2, 3, 4, 5],
      animateComplete: false,
    };
  },
  mounted() {
    if (this.animate) {
      setTimeout(() => {
        this.animateComplete = true;
      }, 500);
    }
  },
};
</script>

<style scoped>
  .theme--light.v-divider {
    border: 1px solid #4caf50;
    z-index: 1;
    margin-left: -1px;
    margin-right: -2px;
  }
</style>
