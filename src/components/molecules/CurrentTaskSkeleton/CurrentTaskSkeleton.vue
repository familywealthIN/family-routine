<template>
  <atom-card-text class="current-task-skeleton">
    <div class="current-task-skeleton__header mb-3">
      <div class="current-task-skeleton__shimmer current-task-skeleton__circle"></div>
      <div class="current-task-skeleton__meta">
        <div class="current-task-skeleton__shimmer current-task-skeleton__title mb-2"></div>
        <div class="current-task-skeleton__shimmer current-task-skeleton__subtitle"></div>
      </div>
    </div>
    <div class="current-task-skeleton__chips mb-3">
      <div class="current-task-skeleton__shimmer current-task-skeleton__chip"></div>
      <div class="current-task-skeleton__shimmer current-task-skeleton__chip"></div>
    </div>
    <div class="current-task-skeleton__shimmer current-task-skeleton__line mb-3"></div>
    <div class="current-task-skeleton__shimmer current-task-skeleton__line current-task-skeleton__line--short"></div>
  </atom-card-text>
</template>

<script>
import { AtomCardText } from '../../atoms';

export default {
  name: 'MoleculeCurrentTaskSkeleton',
  components: {
    AtomCardText,
  },
};
</script>

<style scoped>
.current-task-skeleton {
  max-width: 560px;
}

.current-task-skeleton__header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-task-skeleton__meta {
  flex: 1;
  max-width: 360px;
}

.current-task-skeleton__chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.current-task-skeleton__shimmer {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: current-task-skeleton-loading 1.5s infinite;
  border-radius: 4px;
}

.current-task-skeleton__circle {
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
}

.current-task-skeleton__title {
  width: 70%;
  height: 18px;
}

.current-task-skeleton__subtitle {
  width: 42%;
  height: 14px;
}

.current-task-skeleton__chip {
  width: 132px;
  height: 28px;
  border-radius: 16px;
}

.current-task-skeleton__line {
  width: 66%;
  height: 18px;
}

.current-task-skeleton__line--short {
  width: 46%;
  height: 14px;
}

@media screen and (max-width: 600px) {
  .current-task-skeleton {
    max-width: 100%;
  }

  .current-task-skeleton__meta {
    max-width: none;
  }

  .current-task-skeleton__title {
    width: 78%;
  }

  .current-task-skeleton__subtitle {
    width: 58%;
  }

  .current-task-skeleton__chip {
    width: min(150px, calc(50% - 4px));
  }

  .current-task-skeleton__line {
    width: 84%;
  }

  .current-task-skeleton__line--short {
    width: 62%;
  }
}

@keyframes current-task-skeleton-loading {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}
</style>
