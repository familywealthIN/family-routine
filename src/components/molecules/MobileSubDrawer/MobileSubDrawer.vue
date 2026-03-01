<template>
  <AtomBottomSheet
    v-model="isOpen"
    max-width="100%"
    hide-overlay
    class="mobile-sub-drawer"
  >
    <v-card class="mobile-sub-drawer-card">
      <!-- Drag handle -->
      <div class="mobile-sub-drawer-handle" />

      <!-- Header -->
      <div class="mobile-sub-drawer-header">
        <span class="mobile-sub-drawer-title">{{ title }}</span>
        <v-btn icon small class="mobile-sub-drawer-close" @click="close">
          <v-icon small>close</v-icon>
        </v-btn>
      </div>

      <!-- Scrollable content -->
      <div class="mobile-sub-drawer-content">
        <slot />
      </div>
    </v-card>
  </AtomBottomSheet>
</template>

<script>
import { AtomBottomSheet } from '@/components/atoms';

/**
 * MobileSubDrawer - A secondary bottom-sheet that slides up over
 * the main AiSearchModal bottom-sheet on mobile devices.
 *
 * Used to replace floating dropdown menus (v-select, v-menu) that
 * get misplaced when the mobile keyboard is open.
 *
 * @example
 * <MobileSubDrawer v-model="showDrawer" title="Select Task">
 *   <v-list dense>
 *     <v-list-tile v-for="item in items" :key="item.id" @click="select(item)">
 *       <v-list-tile-title>{{ item.name }}</v-list-tile-title>
 *     </v-list-tile>
 *   </v-list>
 * </MobileSubDrawer>
 */
export default {
  name: 'MoleculeMobileSubDrawer',

  components: {
    AtomBottomSheet,
  },

  props: {
    /**
     * Controls visibility (v-model)
     */
    value: {
      type: Boolean,
      default: false,
    },
    /**
     * Title displayed in the header
     */
    title: {
      type: String,
      default: '',
    },
  },

  computed: {
    isOpen: {
      get() {
        return this.value;
      },
      set(val) {
        this.$emit('input', val);
      },
    },
  },

  methods: {
    close() {
      this.isOpen = false;
    },
  },
};
</script>

<style scoped>
.mobile-sub-drawer-card {
  border-radius: 16px 16px 0 0 !important;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.mobile-sub-drawer-handle {
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background-color: #ccc;
  margin: 8px auto 4px;
}

.mobile-sub-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 12px 8px;
  border-bottom: 1px solid #eee;
  flex-shrink: 0;
}

.mobile-sub-drawer-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.mobile-sub-drawer-close {
  margin: 0;
}

.mobile-sub-drawer-content {
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
}
</style>
