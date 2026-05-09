<template>
    <span class="pt-2 streak-checks"
        style="display: flex;align-items: center;justify-content: center;"
    >
        <template v-for="indx in stars">
          <template v-if="indx < Number(progress)">
            <AtomAvatar :key="`avatar-${indx}`" size="24">
              <AtomIcon color="green" size="24">check_circle</AtomIcon>
            </AtomAvatar>
          </template>
          <template v-else-if="indx === Number(progress)">
            <AtomAvatar :key="`avatar-${indx}`" size="24">
              <AtomIcon color="green" size="24">
                <template v-if="animate">
                  <template v-if="animateComplete">check_circle</template>
                  <template v-else>check_circle_outline</template>
                </template>
                <template v-else>check_circle</template>
              </AtomIcon>
            </AtomAvatar>
          </template>
          <template v-else>
            <AtomAvatar :key="`avatar-${indx}`" size="24">
              <AtomIcon color="green" size="24">check_circle_outline</AtomIcon>
            </AtomAvatar>
          </template>
          <AtomDivider :key="`divider-${indx}`" v-if="indx !== 5" />
        </template>
    </span>
</template>

<script>
import { AtomAvatar, AtomDivider, AtomIcon } from '../../atoms';

export default {
  name: 'MoleculeStreakChecks',
  components: {
    AtomAvatar,
    AtomDivider,
    AtomIcon,
  },
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
