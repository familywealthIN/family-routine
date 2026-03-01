<template>
  <div class="goal-task-selector-wrapper">
    <!-- Desktop: standard v-select -->
    <v-select
      v-if="!mobile"
      :value="value"
      :items="displayItems"
      :item-text="itemText"
      :item-value="computedItemValue"
      :label="label"
      :disabled="disabled"
      :prepend-icon="prependIcon"
      :prepend-inner-icon="prependInnerIcon"
      :solo="solo"
      :filled="filled"
      :clearable="clearable"
      :hide-details="hideDetails"
      :rules="rules"
      :dense="dense"
      :class="selectClass"
      v-bind="$attrs"
      @input="handleInput"
      @change="handleChange"
    >
      <template v-if="$slots.selection" #selection="data">
        <slot name="selection" v-bind="data" />
      </template>
    </v-select>

    <!-- Mobile: read-only trigger + sub-drawer -->
    <template v-else>
      <div class="mobile-selector-trigger" :class="{ disabled }" @click="openMobileDrawer">
        <v-icon small class="trigger-icon">{{ prependInnerIcon || 'label' }}</v-icon>
        <span class="trigger-text" :class="{ 'trigger-placeholder': !selectedDisplayText }">
          {{ selectedDisplayText || label || 'Routine Task' }}
        </span>
        <v-icon small class="trigger-arrow">arrow_drop_down</v-icon>
      </div>

      <MobileSubDrawer v-model="mobileDrawerOpen" :title="label || 'Routine Task'">
        <v-list dense class="pa-0">
          <v-list-tile
            v-if="clearable && value"
            @click="selectMobileItem(null)"
            class="mobile-clear-item"
          >
            <v-list-tile-action>
              <v-icon small color="grey">close</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title class="grey--text">Clear selection</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
          <v-list-tile
            v-for="item in displayItems"
            :key="item[computedItemValue] || item.id"
            :class="{ 'v-list__tile--active primary--text': item[computedItemValue] === value }"
            @click="selectMobileItem(item[computedItemValue])"
          >
            <v-list-tile-action>
              <v-icon v-if="item[computedItemValue] === value" small color="primary">check</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
              <v-list-tile-title>{{ item[itemText] }}</v-list-tile-title>
            </v-list-tile-content>
          </v-list-tile>
        </v-list>
      </MobileSubDrawer>
    </template>
  </div>
</template>

<script>
import { blurActiveElement } from '@/utils/blurActiveElement';
import MobileSubDrawer from '../MobileSubDrawer/MobileSubDrawer.vue';

export default {
  name: 'MoleculeGoalTaskSelector',

  components: {
    MobileSubDrawer,
  },

  inheritAttrs: false,

  props: {
    /**
     * Array of routine task items
     * Expected structure: [{ id, name, time, tags, ... }]
     * or with taskId: [{ taskId, name, time, tags, ... }]
     */
    items: {
      type: Array,
      default: () => [],
    },
    /**
     * Selected task ID (v-model)
     */
    value: {
      type: String,
      default: '',
    },
    /**
     * Property name for display text
     */
    itemText: {
      type: String,
      default: 'name',
    },
    /**
     * Property name for item value
     * Supports both 'id' (from tasklist) and 'taskId' (from routines)
     */
    itemValue: {
      type: String,
      default: 'id',
    },
    /**
     * Field label
     */
    label: {
      type: String,
      default: 'Routine Task',
    },
    /**
     * Icon to prepend outside the input
     */
    prependIcon: {
      type: String,
      default: '',
    },
    /**
     * Icon to prepend inside the input
     */
    prependInnerIcon: {
      type: String,
      default: '',
    },
    /**
     * Disabled state
     */
    disabled: {
      type: Boolean,
      default: false,
    },
    /**
     * Use solo style (toolbar-friendly)
     */
    solo: {
      type: Boolean,
      default: false,
    },
    /**
     * Use filled style
     */
    filled: {
      type: Boolean,
      default: false,
    },
    /**
     * Allow clearing selection
     */
    clearable: {
      type: Boolean,
      default: false,
    },
    /**
     * Hide validation details
     */
    hideDetails: {
      type: Boolean,
      default: false,
    },
    /**
     * Validation rules
     */
    rules: {
      type: Array,
      default: () => [],
    },
    /**
     * Use dense styling
     */
    dense: {
      type: Boolean,
      default: false,
    },
    /**
     * Additional CSS classes
     */
    selectClass: {
      type: [String, Array, Object],
      default: '',
    },
    /**
     * Mobile mode — renders as a trigger button + sub-drawer
     * instead of a floating v-select dropdown
     */
    mobile: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    return {
      mobileDrawerOpen: false,
    };
  },

  computed: {
    /**
     * Computed item-value that handles both 'id' and 'taskId' data structures
     */
    computedItemValue() {
      return this.itemValue;
    },

    /**
     * Items to display - normalized to ensure consistent id property
     */
    displayItems() {
      if (!this.items || this.items.length === 0) {
        return [];
      }

      // Normalize items to ensure they have 'id' property for consistency
      return this.items.map((item) => {
        // If itemValue is 'taskId', ensure we also have 'id' for internal use
        if (this.itemValue === 'taskId' && item.taskId && !item.id) {
          return { ...item, id: item.taskId };
        }
        return item;
      });
    },

    /**
     * Display text for the currently selected item (mobile trigger)
     */
    selectedDisplayText() {
      if (!this.value) return '';
      const selected = this.displayItems.find(
        (item) => item[this.computedItemValue] === this.value,
      );
      return selected ? selected[this.itemText] : '';
    },
  },

  methods: {
    /**
     * Handle input event and emit to parent
     */
    handleInput(value) {
      this.$emit('input', value);
    },

    /**
     * Handle change event and emit to parent with full task object
     */
    handleChange(value) {
      // Find the selected task to emit with change event
      const selectedTask = this.items.find((item) => {
        const itemId = this.itemValue === 'taskId' ? item.taskId : item.id;
        return itemId === value;
      });

      this.$emit('change', value, selectedTask);
    },

    async openMobileDrawer() {
      if (this.disabled) return;
      await blurActiveElement();
      this.mobileDrawerOpen = true;
    },

    selectMobileItem(value) {
      this.mobileDrawerOpen = false;
      this.handleInput(value);
      this.handleChange(value);
    },
  },
};
</script>

<style scoped>
.goal-task-selector-wrapper {
  width: 100%;
}

.mobile-selector-trigger {
  display: flex;
  align-items: center;
  background: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 16px;
  padding: 8px 12px;
  min-height: 40px;
  max-height: 40px;
  cursor: pointer;
  user-select: none;
  overflow: hidden;
}

.mobile-selector-trigger.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.trigger-icon {
  color: #666;
  margin-right: 8px;
  flex-shrink: 0;
}

.trigger-text {
  flex: 1;
  font-size: 14px;
  line-height: 24px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger-placeholder {
  color: #999;
}

.trigger-arrow {
  color: #666;
  flex-shrink: 0;
  margin-left: 4px;
}

.mobile-clear-item {
  border-bottom: 1px solid #eee;
}
</style>
