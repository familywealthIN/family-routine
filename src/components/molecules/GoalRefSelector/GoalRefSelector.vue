<template>
  <v-select
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
</template>

<script>
import { groupGoalItemsByTaskRef } from '@/utils/groupingUtils';

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
  },
};
</script>

<style scoped>
/* Subheader styling for grouped items (by routine task) */
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
