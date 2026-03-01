<template>
  <div class="goal-ref-selector-wrapper">
    <!-- Desktop: standard v-select -->
    <v-select
      v-if="!mobile"
      :value="value"
      :items="displayItems"
      :item-text="itemText"
      :item-value="itemValue"
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
      @input="$emit('input', $event)"
      @change="$emit('change', $event)"
    >
      <template v-if="$slots.selection" #selection="data">
        <slot name="selection" v-bind="data" />
      </template>
    </v-select>

    <!-- Mobile: read-only trigger + sub-drawer -->
    <template v-else>
      <div class="mobile-selector-trigger" :class="{ disabled }" @click="openMobileDrawer">
        <v-icon small class="trigger-icon">{{ prependInnerIcon || 'flag' }}</v-icon>
        <span class="trigger-text" :class="{ 'trigger-placeholder': !selectedDisplayText }">
          {{ selectedDisplayText || label || 'Goal Task' }}
        </span>
        <v-icon small class="trigger-arrow">arrow_drop_down</v-icon>
      </div>

      <MobileSubDrawer v-model="mobileDrawerOpen" :title="label || 'Goal Task'">
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
          <template v-for="(item, index) in displayItems">
            <!-- Group header -->
            <v-subheader
              v-if="item.header"
              :key="'header-' + index"
              class="mobile-group-header"
            >
              {{ item.header }}
            </v-subheader>
            <!-- Goal item -->
            <v-list-tile
              v-else
              :key="item[itemValue] || index"
              :class="{ 'v-list__tile--active primary--text': item[itemValue] === value }"
              @click="selectMobileItem(item[itemValue])"
            >
              <v-list-tile-action>
                <v-icon v-if="item[itemValue] === value" small color="primary">check</v-icon>
              </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>{{ item[itemText] }}</v-list-tile-title>
              </v-list-tile-content>
            </v-list-tile>
          </template>
        </v-list>
      </MobileSubDrawer>
    </template>
  </div>
</template>

<script>
import { groupGoalItemsByTaskRef } from '@/utils/groupingUtils';
import { blurActiveElement } from '@/utils/blurActiveElement';
import MobileSubDrawer from '../MobileSubDrawer/MobileSubDrawer.vue';

/**
 * GoalRefSelector - Dropdown for selecting a goal reference (goalRef)
 * Used for milestone parent selection in goal creation forms
 *
 * This component automatically groups goal items by their routine task (taskRef)
 * using Vuetify's header objects: { header: 'Routine Name' }
 *
 * @example
 * <GoalRefSelector
 *   :items="goalItems"
 *   :tasklist="routineTasks"
 *   v-model="selectedGoalRef"
 * />
 */
export default {
  name: 'MoleculeGoalRefSelector',

  components: {
    MobileSubDrawer,
  },

  inheritAttrs: false,

  props: {
    /**
     * Array of goal items to display
     * Expected: [{ id, body, taskRef, ... }, ...]
     */
    items: {
      type: Array,
      default: () => [],
    },
    /**
     * Array of routine tasks for grouping labels
     * Expected: [{ id, name, time, ... }, ...]
     */
    tasklist: {
      type: Array,
      default: () => [],
    },
    /**
     * Selected goal ID (v-model)
     */
    value: {
      type: String,
      default: '',
    },
    /**
     * Current selected routine task ID (for auto-selection)
     * When provided, first goal matching this taskRef will be auto-selected
     */
    taskRef: {
      type: String,
      default: null,
    },
    /**
     * Property name for display text
     */
    itemText: {
      type: String,
      default: 'body',
    },
    /**
     * Property name for item value
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
      default: 'Goal Task',
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
     * Use solo style
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
     * Items grouped by taskRef (routine task)
     * If tasklist is provided, items are grouped with routine names as headers
     * Otherwise, items are returned as-is (may already be grouped by container)
     */
    displayItems() {
      if (!this.items || this.items.length === 0) {
        return [];
      }

      // If tasklist is provided, apply grouping
      if (this.tasklist && this.tasklist.length > 0) {
        return groupGoalItemsByTaskRef(this.items, this.tasklist);
      }

      // Return items as-is (may already include header objects from container)
      return this.items;
    },

    /**
     * Display text for the currently selected goal (mobile trigger)
     */
    selectedDisplayText() {
      if (!this.value) return '';
      // Search in raw items (not display items which include headers)
      const selected = this.items.find(
        (item) => item[this.itemValue] === this.value,
      );
      return selected ? selected[this.itemText] : '';
    },
  },

  methods: {
    async openMobileDrawer() {
      if (this.disabled) return;
      await blurActiveElement();
      this.mobileDrawerOpen = true;
    },

    selectMobileItem(value) {
      this.mobileDrawerOpen = false;
      this.$emit('input', value);
      this.$emit('change', value);
    },
  },
};
</script>

<style scoped>
.goal-ref-selector-wrapper {
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

.mobile-group-header {
  padding: 0 16px;
  height: 32px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.87);
  background-color: #e3f2fd;
  border-bottom: 1px solid #bbdefb;
  margin-top: 4px;
}

/* Desktop subheader styling */
::v-deep .v-select-list .v-subheader {
  padding: 0 16px;
  height: 32px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.87);
  background-color: #e3f2fd;
  border-bottom: 1px solid #bbdefb;
  margin-top: 4px;
}

::v-deep .v-select-list .v-subheader:first-child {
  margin-top: 0;
}
</style>
