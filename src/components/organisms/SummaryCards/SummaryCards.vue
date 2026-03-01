<template>
  <AtomCard class="flex-column" style="width: 100%;">
    <AtomCardTitle class="headline">
      Description
      <AtomSpacer />
      <AtomButton icon @click="$emit('refresh')">
        <AtomIcon>mdi-refresh</AtomIcon>
      </AtomButton>
    </AtomCardTitle>
    <AtomCardText class="flex-grow-1 d-flex align-center">
      <div v-if="loading" class="text-center w-100">
        <AtomProgressCircular indeterminate color="primary" />
      </div>
      <div v-else-if="error" class="error--text w-100">
        {{ error }}
      </div>
      <div v-else class="text-body-1 w-100">
        {{ summary }}
      </div>
    </AtomCardText>
  </AtomCard>
</template>

<script>
import {
  AtomButton,
  AtomCard,
  AtomCardText,
  AtomCardTitle,
  AtomIcon,
  AtomProgressCircular,
  AtomSpacer,
} from '../../atoms';

export default {
  name: 'SummaryCards',
  components: {
    AtomButton,
    AtomCard,
    AtomCardText,
    AtomCardTitle,
    AtomIcon,
    AtomProgressCircular,
    AtomSpacer,
  },
  props: {
    summary: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    },
    error: {
      type: String,
      default: '',
    },
  },
};
</script>

<style scoped>
.next-steps-content {
  padding: 0 16px;
}
</style>
