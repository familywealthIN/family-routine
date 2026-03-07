<template>
  <AtomCard class="no-shadow goal-task-toolbar">
    <AtomToolbar dense class="toolbar" flat>
      <MoleculeDateSelector
        v-if="!searchMode"
        class="selector-item"
        :value="date"
        @input="$emit('update:date', $event)"
        :period="period"
        @update:period="$emit('update:period', $event)"
        :disabled="disabled"
        :min-date="minDate"
        :task-mode="taskMode"
        :mobile="isMobile"
        label=""
        :placeholder="taskMode ? 'Select date' : 'Select period'"
        prepend-icon=""
        prepend-inner-icon="event"
        hide-details
        solo
        flat
        @change="handleDateChange"
        @period-change="handlePeriodChange"
      />
      <!--
        CRITICAL: date is ALWAYS DD-MM-YYYY format
        MoleculeDateSelector emits DD-MM-YYYY for all period types:
        - day: Last day selected (e.g., "22-02-2026")
        - week: Last Friday of week (e.g., "28-02-2026")
        - month: Last day of month (e.g., "28-02-2026")
        - year: December 31st (e.g., "31-12-2026")
        - lifetime: "01-01-1970"
      -->
      <GoalTaskSelector
        class="selector-item"
        :items="tasklist"
        :disabled="disabled"
        :value="taskRef"
        @input="$emit('update:taskRef', $event)"
        item-value="id"
        label="Routine Task"
        prepend-icon=""
        prepend-inner-icon="label"
        hide-details
        solo
        flat
        :mobile="isMobile"
      />
      <template v-if="!searchMode && (showMilestoneOption || isMilestone)">
        <GoalRefSelector
          class="selector-item"
          :items="goalItemsRef"
          :tasklist="tasklist"
          :task-ref="taskRef"
          :value="goalRef"
          @input="$emit('update:goalRef', $event)"
          :disabled="disabled"
          label="Goal Task"
          prepend-icon=""
          prepend-inner-icon="flag"
          hide-details
          solo
          flat
          :mobile="isMobile"
        />
      </template>
    </AtomToolbar>
  </AtomCard>
</template>

<script>
import { AtomCard, AtomToolbar } from '../../atoms';
import MoleculeDateSelector from '../../molecules/DateSelector/DateSelector.vue';
import GoalTaskSelector from '../../molecules/GoalTaskSelector/GoalTaskSelector.vue';
import GoalRefSelector from '../../molecules/GoalRefSelector/GoalRefSelector.vue';

export default {
  name: 'OrganismGoalTaskToolbar',
  components: {
    AtomCard,
    AtomToolbar,
    MoleculeDateSelector,
    GoalTaskSelector,
    GoalRefSelector,
  },
  props: {
    period: {
      type: String,
      default: '',
    },
    date: {
      type: String,
      default: '',
    },
    taskRef: {
      type: String,
      default: null,
    },
    goalRef: {
      type: String,
      default: null,
    },
    tasklist: {
      type: Array,
      default: () => [],
    },
    goalItemsRef: {
      type: Array,
      default: () => [],
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    minDate: {
      type: String,
      default: '',
    },
    taskMode: {
      type: Boolean,
      default: false,
    },
    searchMode: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      previousPeriod: null,
    };
  },
  computed: {
    /**
     * Whether to render child selectors in mobile sub-drawer mode
     */
    isMobile() {
      return this.$vuetify && this.$vuetify.breakpoint && this.$vuetify.breakpoint.xsOnly;
    },

    showMilestoneOption() {
      const hasPeriod = !!this.period;
      const hasDate = !!this.date;
      const isNotLifetimeDate = this.date !== '01-01-1970';
      const hasRoutineSelected = !!this.taskRef;
      const isArray = Array.isArray(this.goalItemsRef);
      const hasItems = this.goalItemsRef && this.goalItemsRef.length > 0;

      console.log('showMilestoneOption debug:', {
        period: this.period,
        date: this.date,
        taskRef: this.taskRef,
        hasPeriod,
        hasDate,
        isNotLifetimeDate,
        hasRoutineSelected,
        isArray,
        goalItemsRefLength: this.goalItemsRef ? this.goalItemsRef.length : 0,
        hasItems,
        result: hasPeriod && hasDate && isNotLifetimeDate && hasRoutineSelected && isArray && hasItems,
      });

      return (
        hasPeriod
        && hasDate
        && isNotLifetimeDate
        && hasRoutineSelected
        && isArray
        && hasItems
      );
    },
  },
  methods: {
    handleDateChange() {
      this.$emit('date-change');
    },

    handlePeriodChange(newPeriod) {
      // CRITICAL: Only clear date if period actually changed from a DIFFERENT value
      // The previousPeriod tracks the last known period to detect actual changes
      // This prevents clearing date when DateSelector reopens with same period
      const periodActuallyChanged = this.previousPeriod && this.previousPeriod !== newPeriod;

      console.log('handlePeriodChange:', {
        newPeriod,
        previousPeriod: this.previousPeriod,
        periodActuallyChanged,
        currentDate: this.date,
      });

      // If period didn't actually change, don't do anything
      // This handles cases where DateSelector emits period-change on mount/reopen
      if (!periodActuallyChanged) {
        return;
      }

      // Update tracked period since we confirmed it changed
      this.previousPeriod = newPeriod;

      // Reset date when period changes to avoid invalid date formats
      if (newPeriod === 'lifetime') {
        this.$emit('update:date', '01-01-1970');
        // Lifetime doesn't need milestone parent fetching
      } else {
        // Clear date when switching between normal periods (day/week/month/year)
        this.$emit('update:date', '');
      }

      // Trigger query fetch for parent if we have a valid date and not lifetime
      if (this.date && newPeriod !== 'lifetime') {
        this.$emit('period-change', newPeriod);
      }
    },
  },
  watch: {
    period: {
      immediate: true,
      handler(newVal) {
        // Always keep previousPeriod in sync with actual period prop
        // This ensures we track the correct "previous" value
        if (newVal) {
          this.previousPeriod = newVal;
        }
      },
    },
  },
};
</script>

<style>
  .v-toolbar {
    box-shadow: none;
  }

  .v-toolbar.toolbar {
    background: transparent !important;
  }

  .v-toolbar .v-input__control {
    min-height: auto !important;
  }

  .v-toolbar .selector-item {
    flex: 0 0 auto;
    width: 180px;
  }

  .v-toolbar .selector-item .v-input__control {
    width: 100%;
  }

  .v-toolbar .selector-item .v-input__control .v-input__slot {
    margin-bottom: 0 !important;
    background: #f5f5f5 !important;
    border-radius: 16px !important;
    padding: 8px 12px !important;
    min-height: 40px !important;
    max-height: 40px !important;
    box-shadow: none !important;
    border: 1px solid #e0e0e0 !important;
    align-items: center !important;
    display: flex !important;
    overflow: hidden !important;
  }

  /* Remove all underlines from text fields and selects */
  .goal-task-toolbar .v-toolbar .selector-item .v-input__slot::before,
  .goal-task-toolbar .v-toolbar .selector-item .v-input__slot::after,
  .goal-task-toolbar .v-toolbar .selector-item .v-text-field__slot::before,
  .goal-task-toolbar .v-toolbar .selector-item .v-text-field__slot::after {
    display: none !important;
    border: none !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-select__slot::before,
  .goal-task-toolbar .v-toolbar .selector-item .v-select__slot::after {
    display: none !important;
    border: none !important;
  }

  /* Hide floating labels but allow placeholder */
  .goal-task-toolbar .v-toolbar .selector-item .v-label--active {
    display: none !important;
  }

  /* Hide label when field has value (is-dirty) - allows label to act as placeholder */
  .goal-task-toolbar .v-toolbar .selector-item .v-input--is-dirty .v-label {
    display: none !important;
  }

  /* Style the label to look like placeholder text */
  .goal-task-toolbar .v-toolbar .selector-item .v-label {
    color: #999 !important;
    font-size: 14px !important;
    font-weight: 400 !important;
  }

  /* Allow placeholder to show in v-select and v-text-field */
  .goal-task-toolbar .v-toolbar .selector-item .v-select__selections input::placeholder,
  .goal-task-toolbar .v-toolbar .selector-item input::placeholder {
    color: #999 !important;
    opacity: 1 !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-text-field__prefix,
  .goal-task-toolbar .v-toolbar .selector-item .v-text-field__suffix {
    display: none !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-input__control .v-input__slot .v-select__selections {
    padding: 0;
    line-height: 24px;
    flex-wrap: nowrap;
    font-size: 14px !important;
    overflow: hidden;
    max-width: calc(100% - 36px);
    flex: 0 1 auto;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-input__control .v-input__slot .v-select__selection {
    margin: 0 !important;
    max-width: 100%;
    font-size: 14px !important;
    line-height: 24px !important;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-input__control .v-input__slot .v-icon {
    font-size: 18px;
    color: #666;
    margin-left: 4px;
  }

  /* Prepend inner icon (left side - calendar icon) */
  .goal-task-toolbar .v-toolbar .selector-item .v-input__prepend-inner {
    margin-top: 0 !important;
    padding-top: 0 !important;
    align-self: center !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-input__prepend-inner .v-icon {
    margin-right: 8px;
  }

  /* Append icon (right side - dropdown arrow) */
  .goal-task-toolbar .v-toolbar .selector-item .v-input__append-inner {
    margin-top: 0 !important;
    padding-top: 0 !important;
    align-self: center !important;
    margin-right: 0 !important;
    padding-right: 0 !important;
    flex-shrink: 0 !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-input__append-inner .v-icon {
    margin-left: 0;
  }

  /* Align input text vertically */
  .goal-task-toolbar .v-toolbar .selector-item .v-text-field__slot {
    align-items: center !important;
    display: flex !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-text-field__slot input {
    align-self: center !important;
    padding: 0 !important;
    margin-top: 0 !important;
    line-height: 24px !important;
  }

  /* DateSelector specific alignment */
  .goal-task-toolbar .v-toolbar .selector-item.date-selector-field input,
  .goal-task-toolbar .v-toolbar .selector-item .date-selector-field input {
    font-size: 14px !important;
    line-height: 24px !important;
  }

  /* Make DateSelector behave like select with pointer cursor */
  .goal-task-toolbar .v-toolbar .selector-item .date-selector-field .v-input__slot {
    cursor: pointer !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .date-selector-field input {
    cursor: pointer !important;
  }

  .goal-task-toolbar .v-toolbar .selector-item .v-text-field__details {
    display: none !important;
  }

  /* Hide any prepend-icon (icon outside the chip) for toolbar selectors */
  .goal-task-toolbar .v-toolbar .selector-item .v-input__prepend-outer {
    display: none !important;
  }

  /* Ensure text content is properly aligned */
  .goal-task-toolbar .v-toolbar .selector-item input::placeholder {
    color: #999 !important;
    opacity: 1 !important;
  }

  .toolbar {
    overflow-y: hidden;
    overflow-x: auto;
    width: 100%;
  }

  .goal-task-toolbar .v-toolbar__content {
    width: 100%;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 12px;
    padding: 0 !important;
  }
</style>
