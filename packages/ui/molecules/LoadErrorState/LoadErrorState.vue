<template>
  <div class="load-error-state text-xs-center">
    <AtomIcon class="load-error-state__icon" color="error" large>cloud_off</AtomIcon>
    <div class="load-error-state__message">{{ message }}</div>
    <div class="load-error-state__hint">{{ hint }}</div>
    <AtomButton
      v-if="retryable"
      flat
      small
      color="error"
      :loading="retrying"
      class="load-error-state__retry"
      @click="$emit('retry')"
    >
      <AtomIcon left small>refresh</AtomIcon>
      Retry
    </AtomButton>
  </div>
</template>

<script>
import AtomButton from '../../atoms/Button/Button.vue';
import AtomIcon from '../../atoms/Icon/Icon.vue';

export default {
  name: 'MoleculeLoadErrorState',

  components: {
    AtomButton,
    AtomIcon,
  },
  props: {
    message: {
      type: String,
      default: "We couldn't reach the server.",
    },
    // The whole point of this state: a failed load must never read as "your
    // data is gone". Say so explicitly.
    hint: {
      type: String,
      default: 'Nothing has been deleted — this is a connection problem.',
    },
    retryable: {
      type: Boolean,
      default: true,
    },
    retrying: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.load-error-state {
  padding: 24px 16px;
}

.load-error-state__message {
  margin-top: 8px;
  font-weight: 500;
}

.load-error-state__hint {
  margin-top: 4px;
  font-size: 13px;
  opacity: 0.7;
}

.load-error-state__retry {
  margin-top: 8px;
}
</style>
