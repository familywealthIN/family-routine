<template>
  <div class="scroll-shadow-indicator">
    <transition name="fade">
      <div v-if="showTop" class="shadow shadow--top"></div>
    </transition>
    <transition name="fade">
      <div v-if="showBottom" class="shadow shadow--bottom"></div>
    </transition>
  </div>
</template>

<script>
export default {
  name: 'AtomScrollShadowIndicator',
  props: {
    showTop: {
      type: Boolean,
      default: false,
    },
    showBottom: {
      type: Boolean,
      default: false,
    },
  },
};
</script>

<style scoped>
.scroll-shadow-indicator {
  position: relative;
  pointer-events: none;
}

.shadow {
  position: fixed;
  left: 0;
  right: 0;
  height: 20px;
  z-index: 10;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.shadow--top {
  top: 64px; /* Below toolbar */
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0) 100%
  );
}

.shadow--bottom {
  bottom: 0;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.1) 0%,
    rgba(0, 0, 0, 0) 100%
  );
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
