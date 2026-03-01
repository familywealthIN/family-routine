<template>
  <div class="molecule-date-selector">
    <!-- Desktop: standard AtomMenu dropdown -->
    <AtomMenu
      v-if="!mobile"
      v-model="menuOpen"
      :close-on-content-click="false"
      :nudge-right="40"
      transition="scale-transition"
      offset-y
      min-width="290px"
      max-width="320px"
    >
      <template v-slot:activator="{ on }">
        <AtomTextField
          :value="displayValue"
          :label="labelText"
          :placeholder="placeholder"
          :prepend-icon="prependIcon"
          :prepend-inner-icon="prependInnerIcon || computedPrependIcon"
          :append-icon="appendIcon || 'arrow_drop_down'"
          :disabled="disabled"
          :readonly="true"
          :dense="dense"
          :outlined="outlined"
          :hide-details="hideDetails"
          :clearable="clearable"
          class="date-selector-field"
          v-on="on"
          @click:clear="handleClear"
        />
      </template>

      <v-card class="date-selector-card">
        <!-- Period Toggle (fixed at top) - hidden in task mode -->
        <template v-if="!taskMode">
          <div class="period-toggle-container">
            <v-btn-toggle
              v-model="internalPeriod"
              mandatory
              class="period-toggle"
              @change="handlePeriodChange"
            >
              <v-btn small value="day" :disabled="disabled">
                Day
              </v-btn>
              <v-btn small value="week" :disabled="disabled">
                Week
              </v-btn>
              <v-btn small value="month" :disabled="disabled">
                Month
              </v-btn>
              <v-btn small value="year" :disabled="disabled">
                Year
              </v-btn>
              <v-btn small value="lifetime" :disabled="disabled">
                Lifetime
              </v-btn>
            </v-btn-toggle>
          </div>

          <v-divider />
        </template>

        <v-card-text class="pa-0">
          <!-- Day Mode: Visual Calendar -->
          <template v-if="internalPeriod === 'day'">
            <AtomDatePicker
              :value="isoValue"
              :min="minDate"
              :max="maxDate"
              :allowed-dates="allowedDates"
              no-title
              scrollable
              full-width
              color="primary"
              @input="handleDaySelect"
            />
          </template>

          <!-- Week Mode: Week List -->
          <template v-else-if="internalPeriod === 'week'">
            <div class="week-selector">
              <!-- Year navigation for weeks -->
              <div class="year-nav d-flex align-center justify-center pa-2">
                <v-btn icon small @click="navigateYear(-1)">
                  <v-icon>chevron_left</v-icon>
                </v-btn>
                <span class="year-title font-weight-medium flex-grow-1 text-center">{{ displayYear }}</span>
                <v-btn icon small @click="navigateYear(1)">
                  <v-icon>chevron_right</v-icon>
                </v-btn>
              </div>

              <v-divider />

              <!-- Week list -->
              <div class="week-list">
                <v-list dense class="pa-0">
                  <v-list-tile
                    v-for="week in weekOptions"
                    :key="week.value"
                    :class="{ 'v-list__tile--active primary--text': week.value === internalWeekValue }"
                    @click="handleWeekSelect(week.value)"
                  >
                    <v-list-tile-content>
                      <v-list-tile-title class="d-flex justify-space-between">
                        <span class="week-number">W{{ week.weekNum }}</span>
                        <span class="week-range caption grey--text">{{ week.range }}</span>
                      </v-list-tile-title>
                    </v-list-tile-content>
                    <v-list-tile-action v-if="week.isCurrent">
                      <v-chip small color="primary" text-color="white">Current</v-chip>
                    </v-list-tile-action>
                  </v-list-tile>
                </v-list>
              </div>
            </div>
          </template>

          <!-- Month Mode: Month Grid -->
          <template v-else-if="internalPeriod === 'month'">
            <div class="month-selector">
              <!-- Year navigation for months -->
              <div class="year-nav d-flex align-center justify-center pa-2">
                <v-btn icon small @click="navigateYear(-1)">
                  <v-icon>chevron_left</v-icon>
                </v-btn>
                <span class="year-title font-weight-medium flex-grow-1 text-center">{{ displayYear }}</span>
                <v-btn icon small @click="navigateYear(1)">
                  <v-icon>chevron_right</v-icon>
                </v-btn>
              </div>

              <v-divider />

              <!-- Month grid -->
              <div class="month-grid pa-3">
                <v-btn
                  v-for="month in monthOptions"
                  :key="month.value"
                  :color="month.value === internalMonthValue ? 'primary' : ''"
                  :outline="month.value !== internalMonthValue"
                  :flat="month.value !== internalMonthValue"
                  small
                  class="month-btn ma-1"
                  @click="handleMonthSelect(month.value)"
                >
                  {{ month.shortName }}
                  <v-chip
                    v-if="month.isCurrent"
                    x-small
                    color="primary"
                    text-color="white"
                    class="current-chip ml-1"
                  >
                    •
                  </v-chip>
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Year Mode: Year Grid -->
          <template v-else-if="internalPeriod === 'year'">
            <div class="year-selector">
              <!-- Decade navigation -->
              <div class="decade-nav d-flex align-center justify-center pa-2">
                <v-btn icon small @click="navigateDecade(-1)">
                  <v-icon>chevron_left</v-icon>
                </v-btn>
                <span class="year-title font-weight-medium flex-grow-1 text-center">{{ decadeRange }}</span>
                <v-btn icon small @click="navigateDecade(1)">
                  <v-icon>chevron_right</v-icon>
                </v-btn>
              </div>

              <v-divider />

              <!-- Year grid -->
              <div class="year-grid pa-3">
                <v-btn
                  v-for="year in yearOptions"
                  :key="year.value"
                  :color="year.value === internalYearValue ? 'primary' : ''"
                  :outline="year.value !== internalYearValue"
                  :flat="year.value !== internalYearValue"
                  small
                  class="year-btn ma-1"
                  @click="handleYearSelect(year.value)"
                >
                  {{ year.label }}
                  <v-icon v-if="year.isCurrent" x-small color="primary" class="ml-1">
                    fiber_manual_record
                  </v-icon>
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Lifetime Mode: Simple display -->
          <template v-else-if="internalPeriod === 'lifetime'">
            <div class="lifetime-selector pa-4 text-center">
              <v-icon large color="primary">nature</v-icon>
              <p class="mt-2 mb-0 subtitle-1 font-weight-medium">Legacy Goal</p>
              <p class="caption grey--text">Lifetime goals have no specific date</p>
            </div>
          </template>
        </v-card-text>

        <!-- Quick actions -->
        <v-card-actions v-if="showActions" class="pa-2">
          <v-spacer />
          <v-btn flat small @click="handleToday" v-if="internalPeriod === 'day'">
            Today
          </v-btn>
          <v-btn flat small @click="handleThisWeek" v-if="internalPeriod === 'week'">
            This Week
          </v-btn>
          <v-btn flat small @click="handleThisMonth" v-if="internalPeriod === 'month'">
            This Month
          </v-btn>
          <v-btn flat small @click="handleThisYear" v-if="internalPeriod === 'year'">
            This Year
          </v-btn>
          <v-btn color="primary" flat small @click="menuOpen = false">
            Done
          </v-btn>
        </v-card-actions>
      </v-card>
    </AtomMenu>

    <!-- Mobile: read-only trigger + sub-drawer -->
    <template v-if="mobile">
      <div class="mobile-selector-trigger" :class="{ disabled }" @click="openMobileDrawer">
        <v-icon small class="trigger-icon">{{ prependInnerIcon || computedPrependIcon || 'event' }}</v-icon>
        <span class="trigger-text" :class="{ 'trigger-placeholder': !displayValue }">
          {{ displayValue || placeholder || 'Select date' }}
        </span>
        <v-icon small class="trigger-arrow">arrow_drop_down</v-icon>
      </div>

      <MobileSubDrawer v-model="mobileDrawerOpen" :title="taskMode ? 'Select Date' : 'Select Period & Date'">
        <div class="mobile-date-content">
          <!-- Period Toggle - hidden in task mode -->
          <template v-if="!taskMode">
            <div class="period-toggle-container">
              <v-btn-toggle
                v-model="internalPeriod"
                mandatory
                class="period-toggle"
                @change="handlePeriodChange"
              >
                <v-btn small value="day" :disabled="disabled">Day</v-btn>
                <v-btn small value="week" :disabled="disabled">Week</v-btn>
                <v-btn small value="month" :disabled="disabled">Month</v-btn>
                <v-btn small value="year" :disabled="disabled">Year</v-btn>
                <v-btn small value="lifetime" :disabled="disabled">Lifetime</v-btn>
              </v-btn-toggle>
            </div>
            <v-divider />
          </template>

          <!-- Day Mode -->
          <template v-if="internalPeriod === 'day'">
            <AtomDatePicker
              :value="isoValue"
              :min="minDate"
              :max="maxDate"
              :allowed-dates="allowedDates"
              no-title
              scrollable
              full-width
              color="primary"
              @input="handleMobileDaySelect"
            />
          </template>

          <!-- Week Mode -->
          <template v-else-if="internalPeriod === 'week'">
            <div class="week-selector">
              <div class="year-nav d-flex align-center justify-center pa-2">
                <v-btn icon small @click="navigateYear(-1)"><v-icon>chevron_left</v-icon></v-btn>
                <span class="year-title font-weight-medium flex-grow-1 text-center">{{ displayYear }}</span>
                <v-btn icon small @click="navigateYear(1)"><v-icon>chevron_right</v-icon></v-btn>
              </div>
              <v-divider />
              <div class="week-list">
                <v-list dense class="pa-0">
                  <v-list-tile
                    v-for="week in weekOptions"
                    :key="week.value"
                    :class="{ 'v-list__tile--active primary--text': week.value === internalWeekValue }"
                    @click="handleMobileWeekSelect(week.value)"
                  >
                    <v-list-tile-content>
                      <v-list-tile-title class="d-flex justify-space-between">
                        <span class="week-number">W{{ week.weekNum }}</span>
                        <span class="week-range caption grey--text">{{ week.range }}</span>
                      </v-list-tile-title>
                    </v-list-tile-content>
                    <v-list-tile-action v-if="week.isCurrent">
                      <v-chip small color="primary" text-color="white">Current</v-chip>
                    </v-list-tile-action>
                  </v-list-tile>
                </v-list>
              </div>
            </div>
          </template>

          <!-- Month Mode -->
          <template v-else-if="internalPeriod === 'month'">
            <div class="month-selector">
              <div class="year-nav d-flex align-center justify-center pa-2">
                <v-btn icon small @click="navigateYear(-1)"><v-icon>chevron_left</v-icon></v-btn>
                <span class="year-title font-weight-medium flex-grow-1 text-center">{{ displayYear }}</span>
                <v-btn icon small @click="navigateYear(1)"><v-icon>chevron_right</v-icon></v-btn>
              </div>
              <v-divider />
              <div class="month-grid pa-3">
                <v-btn
                  v-for="month in monthOptions"
                  :key="month.value"
                  :color="month.value === internalMonthValue ? 'primary' : ''"
                  :outline="month.value !== internalMonthValue"
                  :flat="month.value !== internalMonthValue"
                  small
                  class="month-btn ma-1"
                  @click="handleMobileMonthSelect(month.value)"
                >
                  {{ month.shortName }}
                  <v-chip v-if="month.isCurrent" x-small color="primary" text-color="white" class="current-chip ml-1">•</v-chip>
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Year Mode -->
          <template v-else-if="internalPeriod === 'year'">
            <div class="year-selector">
              <div class="decade-nav d-flex align-center justify-center pa-2">
                <v-btn icon small @click="navigateDecade(-1)"><v-icon>chevron_left</v-icon></v-btn>
                <span class="year-title font-weight-medium flex-grow-1 text-center">{{ decadeRange }}</span>
                <v-btn icon small @click="navigateDecade(1)"><v-icon>chevron_right</v-icon></v-btn>
              </div>
              <v-divider />
              <div class="year-grid pa-3">
                <v-btn
                  v-for="year in yearOptions"
                  :key="year.value"
                  :color="year.value === internalYearValue ? 'primary' : ''"
                  :outline="year.value !== internalYearValue"
                  :flat="year.value !== internalYearValue"
                  small
                  class="year-btn ma-1"
                  @click="handleMobileYearSelect(year.value)"
                >
                  {{ year.label }}
                  <v-icon v-if="year.isCurrent" x-small color="primary" class="ml-1">fiber_manual_record</v-icon>
                </v-btn>
              </div>
            </div>
          </template>

          <!-- Lifetime Mode -->
          <template v-else-if="internalPeriod === 'lifetime'">
            <div class="lifetime-selector pa-4 text-center">
              <v-icon large color="primary">nature</v-icon>
              <p class="mt-2 mb-0 subtitle-1 font-weight-medium">Legacy Goal</p>
              <p class="caption grey--text">Lifetime goals have no specific date</p>
            </div>
          </template>

          <!-- Quick actions -->
          <v-card-actions v-if="showActions" class="pa-2">
            <v-spacer />
            <v-btn flat small @click="handleMobileToday" v-if="internalPeriod === 'day'">Today</v-btn>
            <v-btn flat small @click="handleMobileThisWeek" v-if="internalPeriod === 'week'">This Week</v-btn>
            <v-btn flat small @click="handleMobileThisMonth" v-if="internalPeriod === 'month'">This Month</v-btn>
            <v-btn flat small @click="handleMobileThisYear" v-if="internalPeriod === 'year'">This Year</v-btn>
            <v-btn color="primary" flat small @click="mobileDrawerOpen = false">Done</v-btn>
          </v-card-actions>
        </div>
      </MobileSubDrawer>
    </template>
  </div>
</template>

<script>
import { AtomMenu, AtomTextField, AtomDatePicker } from '@/components/atoms';
import { blurActiveElement } from '@/utils/blurActiveElement';
import MobileSubDrawer from '../MobileSubDrawer/MobileSubDrawer.vue';

/**
 * MoleculeDateSelector - Airbnb-style date selector with support for
 * day, week, month, year, and lifetime periods
 *
 * @example
 * <MoleculeDateSelector
 *   v-model="selectedDate"
 *   period="day"
 *   label="Select Date"
 * />
 */
export default {
  name: 'MoleculeDateSelector',

  components: {
    AtomMenu,
    AtomTextField,
    AtomDatePicker,
    MobileSubDrawer,
  },

  props: {
    /**
     * Selected value (v-model)
     * CRITICAL: ALWAYS DD-MM-YYYY format regardless of period type
     * Examples:
     * - day: "22-02-2026" (selected date)
     * - week: "28-02-2026" (Friday of the week)
     * - month: "28-02-2026" (last day of month)
     * - year: "31-12-2026" (December 31st)
     * - lifetime: "01-01-1970"
     */
    value: {
      type: String,
      default: '',
    },
    /**
     * Period type (v-model support via period prop and update:period event)
     */
    period: {
      type: String,
      default: 'day',
      validator: (v) => ['day', 'week', 'month', 'year', 'lifetime'].includes(v),
    },
    /**
     * Input label
     */
    label: {
      type: String,
      default: 'Date',
    },
    /**
     * Placeholder text
     */
    placeholder: {
      type: String,
      default: '',
    },
    /**
     * Prepend icon (outside the border)
     */
    prependIcon: {
      type: String,
      default: '',
    },
    /**
     * Prepend inner icon (inside the border)
     */
    prependInnerIcon: {
      type: String,
      default: '',
    },
    /**
     * Append icon
     */
    appendIcon: {
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
     * Dense mode
     */
    dense: {
      type: Boolean,
      default: false,
    },
    /**
     * Outlined style
     */
    outlined: {
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
     * Allow clearing the value
     */
    clearable: {
      type: Boolean,
      default: false,
    },
    /**
     * Show action buttons
     */
    showActions: {
      type: Boolean,
      default: true,
    },
    /**
     * Minimum date for day picker (YYYY-MM-DD)
     */
    minDate: {
      type: String,
      default: '',
    },
    /**
     * Maximum date for day picker (YYYY-MM-DD)
     */
    maxDate: {
      type: String,
      default: '',
    },
    /**
     * Allowed dates function for day picker
     */
    allowedDates: {
      type: Function,
      default: null,
    },
    /**
     * Birth year for year range calculation
     */
    birthYear: {
      type: Number,
      default: 1990,
    },
    /**
     * Task mode - hides period toggle and locks to day mode
     */
    taskMode: {
      type: Boolean,
      default: false,
    },
    /**
     * Mobile mode — renders as a trigger button + sub-drawer
     * instead of a floating AtomMenu dropdown
     */
    mobile: {
      type: Boolean,
      default: false,
    },
  },

  data() {
    const getLabelForPeriod = (period, customLabel) => {
      if (customLabel) return customLabel;
      switch (period) {
        case 'day': return 'Date';
        case 'week': return 'Week';
        case 'month': return 'Month';
        case 'year': return 'Year';
        case 'lifetime': return 'Lifetime';
        default: return 'Select Date';
      }
    };

    return {
      menuOpen: false,
      mobileDrawerOpen: false,
      displayYear: new Date().getFullYear(),
      decadeStart: Math.floor(new Date().getFullYear() / 10) * 10,
      internalPeriod: this.period,
      labelText: getLabelForPeriod(this.period, this.label),
      // CRITICAL: internalValue is ALWAYS DD-MM-YYYY format regardless of period type
      // Display formatting happens in displayValue computed property using moment.js
      internalValue: this.value,
    };
  },

  computed: {
    /**
     * Computed prepend icon (tree for lifetime, calendar otherwise)
     */
    computedPrependIcon() {
      // Default to 'event' icon if no prepend-inner-icon is provided
      const defaultIcon = this.prependInnerIcon || 'event';
      if (this.internalPeriod === 'lifetime') {
        return defaultIcon === 'event' ? 'nature' : defaultIcon;
      }
      return defaultIcon;
    },

    /**
     * Display value for the text field with smart labels
     *
     * CRITICAL: internalValue is ALWAYS DD-MM-YYYY format
     * This computed property formats it for human-readable display using moment.js
     * Examples:
     * - day: "Today", "Tomorrow", or "22 Feb"
     * - week: "Week 8"
     * - month: "February" or "Feb"
     * - year: "This Year" or "2026"
     */
    displayValue() {
      if (!this.internalValue) return '';

      // All formatting functions expect DD-MM-YYYY input
      switch (this.internalPeriod) {
        case 'day':
          return this.formatDayDisplaySmart(this.internalValue);
        case 'week':
          return this.formatWeekDisplaySmart(this.internalValue);
        case 'month':
          return this.formatMonthDisplaySmart(this.internalValue);
        case 'year':
          return this.formatYearDisplaySmart(this.internalValue);
        case 'lifetime':
          return 'Lifetime';
        default:
          return this.internalValue;
      }
    },

    /**
     * Convert DD-MM-YYYY to YYYY-MM-DD for v-date-picker
     */
    isoValue() {
      if (!this.internalValue || this.internalPeriod !== 'day') return '';
      const [day, month, year] = this.internalValue.split('-');
      if (!day || !month || !year) return '';
      return `${year}-${month}-${day}`;
    },

    /**
     * Convert DD-MM-YYYY internalValue to YYYY-WNN format for week comparison
     */
    internalWeekValue() {
      if (!this.internalValue || this.internalPeriod !== 'week') return '';
      const [day, month, year] = this.internalValue.split('-');
      if (!day || !month || !year) return '';
      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      const weekNum = this.getISOWeekNumber(date);
      // The week year may differ from the calendar year for dates near year boundaries
      const isoYear = this.getISOWeekYear(date);
      return `${isoYear}-W${String(weekNum).padStart(2, '0')}`;
    },

    /**
     * Convert DD-MM-YYYY internalValue to YYYY-MM format for month comparison
     */
    internalMonthValue() {
      if (!this.internalValue || this.internalPeriod !== 'month') return '';
      const [day, month, year] = this.internalValue.split('-');
      if (!day || !month || !year) return '';
      return `${year}-${month}`;
    },

    /**
     * Convert DD-MM-YYYY internalValue to YYYY format for year comparison
     */
    internalYearValue() {
      if (!this.internalValue || this.internalPeriod !== 'year') return '';
      const parts = this.internalValue.split('-');
      return parts.length === 3 ? parts[2] : '';
    },

    /**
     * Week options for the current display year
     */
    weekOptions() {
      const weeks = this.getWeeksOfYearISO(this.displayYear);
      const currentWeekValue = this.getCurrentWeekValue();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return weeks
        .map((week) => {
          const { weekNum } = week;
          return {
            ...week,
            weekNum,
            range: this.getWeekDateRange(this.displayYear, weekNum),
            isCurrent: week.value === currentWeekValue,
          };
        })
        .filter((week) => {
          // If minDate is set, filter out past weeks
          if (!this.minDate) return true;

          // Calculate the end date of the week (Sunday) directly
          const jan4 = new Date(this.displayYear, 0, 4);
          const jan4Day = jan4.getDay() || 7;
          const week1Monday = new Date(jan4);
          week1Monday.setDate(jan4.getDate() - jan4Day + 1);

          const firstDay = new Date(week1Monday);
          firstDay.setDate(week1Monday.getDate() + (week.weekNum - 1) * 7);

          const lastDay = new Date(firstDay);
          lastDay.setDate(firstDay.getDate() + 6);
          lastDay.setHours(23, 59, 59, 999);

          // Only show weeks where the end date is today or later
          return lastDay >= today;
        });
    },

    /**
     * Month options for the current display year
     */
    monthOptions() {
      const months = this.getMonthsForYear(this.displayYear);
      const currentMonthValue = this.getCurrentMonthValue();
      const today = new Date();
      const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      return months
        .map((month) => ({
          ...month,
          isCurrent: month.value === currentMonthValue,
        }))
        .filter((month) => {
          // If minDate is set, filter out past months
          if (!this.minDate) return true;

          // Compare YYYY-MM format (month.value is selector option, not stored value)
          return month.value >= currentYearMonth;
        });
    },

    /**
     * Year options for the current decade
     */
    yearOptions() {
      const years = [];
      const currentYear = new Date().getFullYear();

      for (let i = 0; i < 12; i += 1) {
        const year = this.decadeStart + i;

        // If minDate is set, filter out past years
        if (!this.minDate || year >= currentYear) {
          years.push({
            value: String(year),
            label: String(year),
            isCurrent: year === currentYear,
          });
        }
      }

      return years;
    },

    /**
     * Decade range display
     */
    decadeRange() {
      return `${this.decadeStart} - ${this.decadeStart + 11}`;
    },
  },

  watch: {
    value: {
      immediate: true,
      handler(val) {
        // CRITICAL: value is ALWAYS DD-MM-YYYY format
        // Simply sync it directly to internal value - no format checking needed
        this.internalValue = val;
        if (val) {
          this.initializeDisplayYear();
        }
      },
    },
    period(newPeriod) {
      this.internalPeriod = newPeriod;
      this.labelText = this.computeLabelForPeriod(newPeriod);
      this.initializeDisplayYear();
    },
    internalPeriod(newPeriod) {
      this.labelText = this.computeLabelForPeriod(newPeriod);
    },
  },

  mounted() {
    // CRITICAL: Sync default period to parent if not provided
    // DateSelector defaults to 'day' but parent might not have period set
    // This ensures checkAndFetchGoalItemsRef has a valid period value
    if (!this.period || this.period === '') {
      this.$emit('update:period', 'day');
      this.$emit('period-change', 'day');
    }
  },

  methods: {
    /**
     * Compute label text for a given period
     */
    computeLabelForPeriod(period) {
      console.log('==== period', period);
      switch (period) {
        case 'day':
          return 'Date';
        case 'week':
          return 'Week';
        case 'month':
          return 'Month';
        case 'year':
          return 'Year';
        case 'lifetime':
          return 'Lifetime';
        default:
          return 'Date';
      }
    },

    /**
     * Handle period change
     */
    handlePeriodChange(newPeriod) {
      this.$emit('update:period', newPeriod);
      this.$emit('period-change', newPeriod);

      // Clear date when switching to lifetime
      if (newPeriod === 'lifetime') {
        const lifetimeDate = '01-01-1970';
        this.internalValue = lifetimeDate;
        this.$emit('input', lifetimeDate);
        this.$emit('change', lifetimeDate);
      } else if (this.internalValue === '01-01-1970') {
        // Clear lifetime date when switching away
        this.internalValue = '';
        this.$emit('input', '');
        this.$emit('change', '');
      }

      this.initializeDisplayYear();
    },

    /**
     * Initialize display year based on current value
     * CRITICAL: internalValue is ALWAYS DD-MM-YYYY format, year is always at index [2]
     */
    initializeDisplayYear() {
      if (!this.internalValue) {
        this.displayYear = new Date().getFullYear();
        this.decadeStart = Math.floor(this.displayYear / 10) * 10;
        return;
      }

      // internalValue is always DD-MM-YYYY, so year is always the third part
      const parts = this.internalValue.split('-');
      const year = parts.length === 3 ? parseInt(parts[2], 10) : NaN;

      if (!isNaN(year) && year > 100) {
        this.displayYear = year;
        this.decadeStart = Math.floor(year / 10) * 10;
      } else {
        this.displayYear = new Date().getFullYear();
        this.decadeStart = Math.floor(this.displayYear / 10) * 10;
      }
    },

    /**
     * Check if incoming value should sync to internal value
     * Prevents circular updates when parent echoes the converted DD-MM-YYYY format
     */
    /**
     * REMOVED: shouldSyncValue method
     *
     * No longer needed because ALL date values are ALWAYS in DD-MM-YYYY format.
     * Display formatting is handled separately in displayValue computed property.
     * This simplifies data flow and eliminates "Invalid date" errors.
     */

    /**
     * Get all 12 months for a given year
     */
    getMonthsForYear(year) {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];

      const months = [];
      for (let i = 0; i < 12; i += 1) {
        const monthNum = String(i + 1).padStart(2, '0');
        const monthValue = `${year}-${monthNum}`;
        months.push({
          label: monthNames[i],
          shortName: monthNames[i],
          value: monthValue,
        });
      }

      return months;
    },

    /**
     * Get all ISO weeks for a given year
     */
    getWeeksOfYearISO(year) {
      const weeks = [];

      // Calculate number of weeks in the year (ISO)
      // A year has 53 weeks if Jan 1 is Thursday or leap year and Jan 1 is Wednesday
      const jan1 = new Date(year, 0, 1);
      const jan1Day = jan1.getDay();
      const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);

      let numWeeks = 52;
      if (jan1Day === 4 || (isLeapYear && jan1Day === 3)) {
        numWeeks = 53;
      }

      // Generate all weeks
      for (let weekNum = 1; weekNum <= numWeeks; weekNum += 1) {
        const weekValue = `${year}-W${String(weekNum).padStart(2, '0')}`;
        weeks.push({
          label: `Week ${weekNum}`,
          value: weekValue,
          weekNum,
        });
      }

      return weeks;
    },

    /**
     * Navigate year forward or backward
     */
    navigateYear(direction) {
      this.displayYear += direction;
    },

    /**
     * Navigate decade forward or backward
     */
    navigateDecade(direction) {
      this.decadeStart += direction * 12;
    },

    /**
     * Handle day selection from calendar
     */
    handleDaySelect(isoDate) {
      // Convert YYYY-MM-DD to DD-MM-YYYY
      const [year, month, day] = isoDate.split('-');
      const formattedDate = `${day}-${month}-${year}`;

      // Update internal value for display
      this.internalValue = formattedDate;

      // Emit to parent (day already in DD-MM-YYYY format)
      this.$emit('input', formattedDate);
      this.$emit('change', formattedDate);
      this.menuOpen = false;
    },

    /**
     * Handle week selection
     * Converts YYYY-WNN to Friday of week in DD-MM-YYYY format
     * CRITICAL: Both stores AND emits DD-MM-YYYY format
     */
    handleWeekSelect(weekValue) {
      // Parse YYYY-WNN format
      const match = weekValue.match(/(\d{4})-W(\d{2})/);
      if (!match) {
        this.$emit('input', weekValue);
        this.$emit('change', weekValue);
        this.menuOpen = false;
        return;
      }

      const year = parseInt(match[1], 10);
      const weekNum = parseInt(match[2], 10);

      // Calculate Friday of the given ISO week
      const jan4 = new Date(year, 0, 4);
      const jan4Day = jan4.getDay() || 7;
      const week1Monday = new Date(jan4);
      week1Monday.setDate(jan4.getDate() - jan4Day + 1);

      const weekMonday = new Date(week1Monday);
      weekMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

      const friday = new Date(weekMonday);
      friday.setDate(weekMonday.getDate() + 4);

      // Format as DD-MM-YYYY
      const day = String(friday.getDate()).padStart(2, '0');
      const month = String(friday.getMonth() + 1).padStart(2, '0');
      const fridayYear = friday.getFullYear();
      const formattedDate = `${day}-${month}-${fridayYear}`;

      // CRITICAL: Store DD-MM-YYYY format (not YYYY-WNN)
      this.internalValue = formattedDate;

      this.$emit('input', formattedDate);
      this.$emit('change', formattedDate);
      this.menuOpen = false;
    },

    /**
     * Handle month selection
     * Converts YYYY-MM to last day of month in DD-MM-YYYY format
     * CRITICAL: Both stores AND emits DD-MM-YYYY format
     */
    handleMonthSelect(monthValue) {
      // Parse YYYY-MM format
      const [yearStr, monthStr] = monthValue.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);

      // Get last day of month
      const lastDay = new Date(year, month, 0);
      const day = String(lastDay.getDate()).padStart(2, '0');
      const formattedMonth = String(month).padStart(2, '0');
      const formattedDate = `${day}-${formattedMonth}-${year}`;

      // Store DD-MM-YYYY format internally (not YYYY-MM)
      this.internalValue = formattedDate;

      this.$emit('input', formattedDate);
      this.$emit('change', formattedDate);
      this.menuOpen = false;
    },

    /**
     * Handle year selection
     * Converts YYYY to December 31st in DD-MM-YYYY format
     * CRITICAL: Both stores AND emits DD-MM-YYYY format
     */
    handleYearSelect(yearValue) {
      // Convert YYYY to 31-12-YYYY format
      const formattedDate = `31-12-${yearValue}`;

      // Store DD-MM-YYYY format internally (not just YYYY)
      this.internalValue = formattedDate;

      this.$emit('input', formattedDate);
      this.$emit('change', formattedDate);
      this.menuOpen = false;
    },

    /**
     * Handle clear action
     */
    handleClear() {
      this.internalValue = '';
      this.$emit('input', '');
      this.$emit('change', '');
    },

    /**
     * Quick action: Select today
     */
    handleToday() {
      const today = new Date();
      const day = String(today.getDate()).padStart(2, '0');
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const year = today.getFullYear();
      this.handleDaySelect(`${year}-${month}-${day}`);
    },

    /**
     * Quick action: Select this week
     * CRITICAL: Must pass YYYY-WNN format (what handleWeekSelect expects)
     * getCurrentWeekValue() returns YYYY-WNN, getCurrentWeek() returns DD-MM-YYYY
     */
    handleThisWeek() {
      const currentWeek = this.getCurrentWeekValue();
      this.handleWeekSelect(currentWeek);
    },

    /**
     * Quick action: Select this month
     * CRITICAL: Must pass YYYY-MM format (what handleMonthSelect expects)
     * getCurrentMonthValue() returns YYYY-MM, getCurrentMonth() returns DD-MM-YYYY
     */
    handleThisMonth() {
      const currentMonth = this.getCurrentMonthValue();
      this.handleMonthSelect(currentMonth);
    },

    /**
     * Quick action: Select this year
     */
    handleThisYear() {
      const currentYear = String(new Date().getFullYear());
      this.handleYearSelect(currentYear);
    },

    /**
     * Get current week as DD-MM-YYYY format (Friday of current ISO week)
     * CRITICAL: Returns DD-MM-YYYY format for consistency
     * Uses same ISO week calculation as handleWeekSelect for consistency
     */
    getCurrentWeek() {
      // Use getCurrentWeekValue() to get YYYY-WNN, then calculate Friday
      // This ensures consistency with handleWeekSelect's Friday calculation
      const now = new Date();
      const weekNum = this.getISOWeekNumber(now);
      const isoYear = this.getISOWeekYear(now);

      // Calculate Friday of the ISO week (same algorithm as handleWeekSelect)
      const jan4 = new Date(isoYear, 0, 4);
      const jan4Day = jan4.getDay() || 7;
      const week1Monday = new Date(jan4);
      week1Monday.setDate(jan4.getDate() - jan4Day + 1);

      const weekMonday = new Date(week1Monday);
      weekMonday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

      const friday = new Date(weekMonday);
      friday.setDate(weekMonday.getDate() + 4);

      const day = String(friday.getDate()).padStart(2, '0');
      const month = String(friday.getMonth() + 1).padStart(2, '0');
      const year = friday.getFullYear();

      return `${day}-${month}-${year}`;
    },

    /**
     * Get current month in DD-MM-YYYY format (last day of current month)
     * CRITICAL: Returns DD-MM-YYYY format for consistency
     */
    getCurrentMonth() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Get last day of current month
      const lastDay = new Date(year, month, 0).getDate();

      const day = String(lastDay).padStart(2, '0');
      const monthStr = String(month).padStart(2, '0');

      return `${day}-${monthStr}-${year}`;
    },

    /**
     * Get current week in YYYY-WNN format (for comparing with weekOptions values)
     */
    getCurrentWeekValue() {
      const now = new Date();
      const weekNum = this.getISOWeekNumber(now);
      const isoYear = this.getISOWeekYear(now);
      return `${isoYear}-W${String(weekNum).padStart(2, '0')}`;
    },

    /**
     * Get current month in YYYY-MM format (for comparing with monthOptions values)
     */
    getCurrentMonthValue() {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    },

    /**
     * Get ISO week year for a date
     * The ISO week year may differ from the calendar year for dates near year boundaries
     * @param {Date} date - JavaScript Date object
     * @returns {number} - ISO week year
     */
    getISOWeekYear(date) {
      const target = new Date(date.valueOf());
      const dayNum = (date.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNum + 3); // Nearest Thursday
      return target.getFullYear();
    },

    /**
     * Format day value for display
     */
    formatDayDisplay(value) {
      // Value is DD-MM-YYYY
      const [day, month, year] = value.split('-');
      if (!day || !month || !year) return value;

      const date = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10));
      const options = {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      };
      return date.toLocaleDateString('en-US', options);
    },

    /**
     * Format day value with smart labels (Today, Tomorrow, or date)
     */
    formatDayDisplaySmart(value) {
      // Value is DD-MM-YYYY
      const [day, month, year] = value.split('-');
      if (!day || !month || !year) return value;

      const selectedDate = new Date(year, parseInt(month, 10) - 1, parseInt(day, 10));
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      const diffTime = selectedDate - today;
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } if (diffDays === 1) {
        return 'Tomorrow';
      }
      // Always show year for dates after tomorrow
      const options = {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      };
      return selectedDate.toLocaleDateString(undefined, options);
    },

    /**
     * Format week value for display
     */
    formatWeekDisplay(value) {
      // CRITICAL: value is DD-MM-YYYY format
      // Convert to week number for display
      const [day, month, year] = value.split('-');
      if (!day || !month || !year) return value;

      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
      const weekNum = this.getISOWeekNumber(date);

      return `Week ${weekNum}, ${year}`;
    },

    /**
     * Format week value with smart labels (This Week or Week N, YYYY)
     */
    formatWeekDisplaySmart(value) {
      const currentWeek = this.getCurrentWeek();
      if (value === currentWeek) {
        return 'This Week';
      }
      return this.formatWeekDisplay(value);
    },

    /**
     * Format month value for display
     * CRITICAL: value is DD-MM-YYYY format
     */
    formatMonthDisplay(value) {
      const [day, month, year] = value.split('-');
      if (!day || !month || !year) return value;

      const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      const options = {
        month: 'long',
        year: 'numeric',
      };
      return date.toLocaleDateString('en-US', options);
    },

    /**
     * Format month value with smart labels (This Month or MMM YYYY)
     * CRITICAL: value is DD-MM-YYYY format
     */
    formatMonthDisplaySmart(value) {
      const currentMonth = this.getCurrentMonth();
      if (value === currentMonth) {
        return 'This Month';
      }

      // Parse DD-MM-YYYY format
      const [day, month, year] = value.split('-');
      if (!day || !month || !year) return value;

      const date = new Date(year, parseInt(month, 10) - 1, 1);
      const options = {
        month: 'short',
        year: 'numeric',
      };
      return date.toLocaleDateString(undefined, options);
    },

    /**
     * Format year value with smart labels (This Year or YYYY)
     */
    /**
     * Format year value with smart labels
     * CRITICAL: value is DD-MM-YYYY format (December 31st of the year)
     */
    formatYearDisplaySmart(value) {
      // Parse DD-MM-YYYY to extract year
      const [day, month, year] = value.split('-');
      if (!day || !month || !year) return value;

      const currentYear = String(new Date().getFullYear());
      if (year === currentYear) {
        return 'This Year';
      }
      return year;
    },

    /**
     * Get ISO week number from a date
     * @param {Date} date - JavaScript Date object
     * @returns {number} - ISO week number (1-53)
     */
    getISOWeekNumber(date) {
      // Copy date so we don't modify original
      const target = new Date(date.valueOf());
      const dayNum = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
      target.setDate(target.getDate() - dayNum + 3); // Nearest Thursday

      // Get first Thursday of year
      const firstThursday = new Date(target.getFullYear(), 0, 4);
      const jan1 = new Date(target.getFullYear(), 0, 1);
      const jan1Day = (jan1.getDay() + 6) % 7;

      // Adjust to get first Thursday
      if (jan1Day <= 3) {
        firstThursday.setDate(1 + (3 - jan1Day));
      } else {
        firstThursday.setDate(1 + (10 - jan1Day));
      }

      // Calculate week number
      const weekNum = Math.floor((target - firstThursday) / 86400000 / 7) + 1;
      return weekNum;
    },

    /**
     * Get date range string for a week (ISO week calculation)
     */
    getWeekDateRange(year, weekNum) {
      // ISO week date calculation
      // Week 1 is the week with the first Thursday of the year
      const jan4 = new Date(year, 0, 4); // January 4th is always in week 1
      const jan4Day = jan4.getDay() || 7; // Sunday = 7 in ISO

      // Find Monday of week 1
      const week1Monday = new Date(jan4);
      week1Monday.setDate(jan4.getDate() - jan4Day + 1);

      // Calculate the Monday of the target week
      const firstDay = new Date(week1Monday);
      firstDay.setDate(week1Monday.getDate() + (weekNum - 1) * 7);

      // Calculate Sunday of the target week
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);

      const formatDate = (d) => {
        if (isNaN(d.getTime())) return 'Invalid';
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        return `${month} ${d.getDate()}`;
      };

      return `${formatDate(firstDay)} - ${formatDate(lastDay)}`;
    },

    /**
     * Open the mobile sub-drawer after dismissing the keyboard
     */
    async openMobileDrawer() {
      if (this.disabled) return;
      await blurActiveElement();
      this.mobileDrawerOpen = true;
    },

    /**
     * Mobile-specific day select — closes sub-drawer instead of menu
     */
    handleMobileDaySelect(isoDate) {
      this.handleDaySelect(isoDate);
      this.mobileDrawerOpen = false;
    },

    /**
     * Mobile-specific week select — closes sub-drawer instead of menu
     */
    handleMobileWeekSelect(weekValue) {
      this.handleWeekSelect(weekValue);
      this.mobileDrawerOpen = false;
    },

    /**
     * Mobile-specific month select — closes sub-drawer instead of menu
     */
    handleMobileMonthSelect(monthValue) {
      this.handleMonthSelect(monthValue);
      this.mobileDrawerOpen = false;
    },

    /**
     * Mobile-specific year select — closes sub-drawer instead of menu
     */
    handleMobileYearSelect(yearValue) {
      this.handleYearSelect(yearValue);
      this.mobileDrawerOpen = false;
    },

    handleMobileToday() {
      this.handleToday();
      this.mobileDrawerOpen = false;
    },

    handleMobileThisWeek() {
      this.handleThisWeek();
      this.mobileDrawerOpen = false;
    },

    handleMobileThisMonth() {
      this.handleThisMonth();
      this.mobileDrawerOpen = false;
    },

    handleMobileThisYear() {
      this.handleThisYear();
      this.mobileDrawerOpen = false;
    },
  },
};
</script>

<style scoped>
.molecule-date-selector {
  width: 100%;
}

.date-selector-card {
  max-height: 500px;
  overflow: hidden;
}

/* Period Toggle Styles */
.period-toggle-container {
  background-color: transparent;
  box-shadow: none;
  padding: 8px;
}

.period-toggle {
  width: 100%;
  display: flex;
  background-color: transparent;
  box-shadow: none;
}

.period-toggle .v-btn {
  flex: 1;
  text-transform: capitalize;
  font-size: 12px;
  min-width: 0 !important;
  color: #000000 !important;
  font-weight: 500;
}

.period-toggle .v-btn.v-btn--active {
  color: #1976d2 !important;
  font-weight: 600;
}

.date-selector-header {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  color: white;
}

/* Week Selector Styles */
.week-selector {
  width: 100%;
}

.week-list {
  max-height: 280px;
  overflow-y: auto;
}

.week-list .v-list__tile--active {
  background-color: rgba(25, 118, 210, 0.08);
}

.week-number {
  font-weight: 500;
  min-width: 40px;
}

.week-range {
  text-align: right;
}

/* Month Selector Styles */
.month-selector {
  width: 100%;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.month-btn {
  min-width: 80px !important;
  text-transform: capitalize;
}

.current-chip {
  height: 12px !important;
  font-size: 8px;
}

/* Year Selector Styles */
.year-selector {
  width: 100%;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.year-btn {
  min-width: 80px !important;
}

/* Lifetime Selector Styles */
.lifetime-selector {
  min-height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

/* Year/Decade Navigation */
.year-nav,
.decade-nav {
  background-color: #f5f5f5;
  position: relative;
}

.year-title {
  font-size: 16px;
  text-align: center;
}

/* Scrollbar styling */
.week-list::-webkit-scrollbar {
  width: 6px;
}

.week-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.week-list::-webkit-scrollbar-thumb {
  background: #ccc;
  border-radius: 3px;
}

.week-list::-webkit-scrollbar-thumb:hover {
  background: #999;
}
.molecule-date-selector .v-input {
  padding-top: 0px;
}

/* Mobile trigger styles */
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

.mobile-date-content {
  width: 100%;
}

.mobile-date-content .week-list {
  max-height: 50vh;
}
</style>
