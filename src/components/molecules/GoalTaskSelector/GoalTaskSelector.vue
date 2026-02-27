<template>
  <v-select
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
</template>

<script>
export default {
  name: 'MoleculeGoalTaskSelector',

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
  },
};
</script>

<style scoped>
/* Component styles if needed */
</style>
