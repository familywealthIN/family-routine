<template>
  <!-- Mobile/Tablet: Wrap with pull-to-refresh -->
  <div
    v-if="$vuetify.breakpoint.mdAndDown"
    class="pull-to-refresh-container"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @scroll="handleScroll"
  >
    <!-- Pull to refresh indicator -->
    <div class="pull-to-refresh-indicator"
         :class="{ 'visible': pullDistance > 0, 'refreshing': isRefreshing }"
         :style="{ transform: `translateY(${Math.min(pullDistance, 80)}px)` }">
      <v-progress-circular
        v-if="isRefreshing"
        indeterminate
        color="primary"
        size="24">
      </v-progress-circular>
      <v-icon v-else color="primary" size="24">refresh</v-icon>
      <span class="refresh-text">
        {{ isRefreshing ? 'Refreshing...' : (pullDistance > 60 ? 'Release to refresh' : 'Pull to refresh') }}
      </span>
    </div>

    <slot></slot>
  </div>

  <!-- Desktop: No pull-to-refresh wrapper -->
  <div v-else>
    <slot></slot>
  </div>
</template>

<script>
export default {
  name: 'PullToRefreshContainer',
  data() {
    return {
      pullDistance: 0,
      startY: 0,
      isPulling: false,
      isRefreshing: false,
      scrollTop: 0,
    };
  },
  methods: {
    handleTouchStart(event) {
      if (this.scrollTop <= 0) {
        this.startY = event.touches[0].clientY;
        this.isPulling = true;
      }
    },
    handleTouchMove(event) {
      if (!this.isPulling || this.isRefreshing) return;

      const currentY = event.touches[0].clientY;
      const deltaY = currentY - this.startY;

      if (deltaY > 0 && this.scrollTop <= 0) {
        event.preventDefault();
        this.pullDistance = Math.min(deltaY * 0.5, 100); // Dampen the pull effect
      }
    },
    handleTouchEnd() {
      if (!this.isPulling || this.isRefreshing) return;

      this.isPulling = false;

      if (this.pullDistance > 60) {
        this.triggerRefresh();
      } else {
        this.resetPull();
      }
    },
    handleScroll(event) {
      this.scrollTop = event.target.scrollTop;
      if (this.scrollTop > 0) {
        this.resetPull();
      }
    },
    resetPull() {
      this.pullDistance = 0;
      this.isPulling = false;
    },
    triggerRefresh() {
      this.isRefreshing = true;
      this.pullDistance = 60; // Set to final position
      this.$emit('refresh');
    },
    endRefresh() {
      this.resetPull();
      this.isRefreshing = false;
    },
  },
};
</script>

<style scoped>
.pull-to-refresh-container {
  position: relative;
  overflow-y: auto;
}

.pull-to-refresh-indicator {
  position: absolute;
  top: -60px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 100;
}

.pull-to-refresh-indicator.visible {
  opacity: 1;
}

.refresh-text {
  font-size: 12px;
  color: var(--v-primary-base);
}
</style>
