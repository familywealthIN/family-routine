# MoleculeDateSelector

An advanced, Airbnb-style date selector component with integrated period toggle and smart date label display. Supports day, week, month, year, and lifetime periods with proper ISO 8601 week calculations.

## Features

### Period Toggle Integration

* **Inline Period Selection**: Period selector (Day/Week/Month/Year/Lifetime) is integrated within the dropdown
* **Smart Labels**: Displays context-aware labels like "Today", "Tomorrow", "This Month", "This Year"
* **Dynamic Icons**: Shows tree icon for lifetime, calendar icon for time-bound periods

### Period Types

#### Day Period

* Visual calendar picker
* Smart labels:
  + "Today" for current date
  + "Tomorrow" for next day
  + Locale-aware formatted date (e.g., "Feb 22" or "Feb 22, 2026")
* Quick action: "Today" button

#### Week Period (ISO 8601)

* List of all weeks in selected year
* Smart labels:
  + "This Week" for current week
  + "Week N, YYYY" for other weeks
* Date range display (e.g., "Mar 3 - Mar 9")
* Proper ISO week calculation (Week 1 = week with first Thursday)
* Handles 52/53 week years correctly
* Quick action: "This Week" button

#### Month Period

* Grid of all 12 months
* Smart labels:
  + "This Month" for current month
  + "MMM YYYY" format (e.g., "Mar 2026")
* Current month indicator chip
* Quick action: "This Month" button

#### Year Period

* Decade grid (12 years per view)
* Smart labels:
  + "This Year" for current year
  + Year number (e.g., "2026")
* Current year indicator
* Quick action: "This Year" button

#### Lifetime Period

* Special legacy/lifetime goal period
* Fixed date: `01-01-1970`
* Tree icon (`mdi-tree`)
* Simple display with legacy indicator

## Usage

### Basic Usage

```vue
<template>
  <MoleculeDateSelector
    v-model="selectedDate"
    :period.sync="selectedPeriod"
    label="Select Date"
  />
</template>

<script>
export default {
  data() {
    return {
      selectedDate: '',
      selectedPeriod: 'day',
    };
  },
};
</script>
```

### With Event Handlers

```vue
<MoleculeDateSelector
  v-model="localGoalItem.date"
  :period.sync="localGoalItem.period"
  :disabled="isDisabled"
  label="Date"
  prepend-icon="event"
  hide-details
  @change="handleDateChange"
  @period-change="handlePeriodChange"
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | String | `''` | Selected date value (v-model) |
| `period` | String | `'day'` | Period type (supports .sync modifier) |
| `label` | String | `'Select Date'` | Input field label |
| `placeholder` | String | `''` | Input placeholder text |
| `prependIcon` | String | `'mdi-calendar'` | Icon before input (auto-switches to tree for lifetime) |
| `appendIcon` | String | `''` | Icon after input |
| `disabled` | Boolean | `false` | Disable the selector |
| `dense` | Boolean | `false` | Dense mode |
| `outlined` | Boolean | `false` | Outlined style |
| `hideDetails` | Boolean | `false` | Hide validation details |
| `clearable` | Boolean | `false` | Show clear button |
| `showHeader` | Boolean | `false` | Show header in dropdown |
| `showActions` | Boolean | `true` | Show quick action buttons |
| `minDate` | String | `''` | Minimum date for day picker (YYYY-MM-DD) |
| `maxDate` | String | `''` | Maximum date for day picker (YYYY-MM-DD) |
| `allowedDates` | Function | `null` | Function to filter allowed dates |
| `birthYear` | Number | `1990` | Birth year for year range calculation |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `String` | Emitted when date value changes (v-model) |
| `change` | `String` | Emitted when date is selected |
| `update:period` | `String` | Emitted when period changes (.sync modifier) |
| `period-change` | `String` | Emitted when period changes |

## Date Formats

### Input/Output Formats by Period

| Period | Format | Example |
|--------|--------|---------|
| Day | `DD-MM-YYYY` | `22-02-2026` |
| Week | `YYYY-WNN` | `2026-W08` |
| Month | `YYYY-MM` | `2026-02` |
| Year | `YYYY` | `2026` |
| Lifetime | `01-01-1970` | `01-01-1970` |

### Display Formats

| Period | Context | Display |
|--------|---------|---------|
| Day | Today | "Today" |
| Day | Tomorrow | "Tomorrow" |
| Day | Other | "Feb 22" or "Feb 22, 2026" |
| Week | Current | "This Week" |
| Week | Other | "Week 8, 2026" |
| Month | Current | "This Month" |
| Month | Other | "Mar 2026" |
| Year | Current | "This Year" |
| Year | Other | "2026" |
| Lifetime | Always | "Lifetime" |

## ISO 8601 Week Implementation

The component implements proper ISO 8601 week calculation:

### Rules

* Week starts on Monday
* Week 1 is the week containing the first Thursday of the year
* A year can have 52 or 53 weeks

### 53-Week Years

A year has 53 weeks when:
* January 1 falls on a Thursday, OR
* It's a leap year AND January 1 falls on a Wednesday

### Week Date Ranges

Each week displays its date range (Monday to Sunday):

```
Week 1, 2026: Dec 29 - Jan 4  (spans year boundary)
Week 8, 2026: Feb 16 - Feb 22
```

## Methods (Public)

### Navigation

* `navigateYear(direction)` - Move forward/backward by year
* `navigateDecade(direction)` - Move forward/backward by decade (12 years)

### Quick Actions

* `handleToday()` - Select today's date
* `handleThisWeek()` - Select current ISO week
* `handleThisMonth()` - Select current month
* `handleThisYear()` - Select current year

### Selection Handlers

* `handleDaySelect(isoDate)` - Handle day selection from calendar
* `handleWeekSelect(weekValue)` - Handle week selection
* `handleMonthSelect(monthValue)` - Handle month selection
* `handleYearSelect(yearValue)` - Handle year selection
* `handleClear()` - Clear selection

### Period Management

* `handlePeriodChange(newPeriod)` - Handle period toggle and auto-adjust dates

## Styling

The component includes built-in styles:

```css
.period-toggle-container
/* Period buttons background */
.period-toggle
/* Period toggle layout */
.year-title
/* Year/decade display in navigation */
.week-list
/* Scrollable week list */
.month-grid
/* Month button grid (3 columns) */
.year-grid
/* Year button grid (3 columns) */
.lifetime-selector
/* Lifetime period display */
```

## Examples

### Day Selection with Smart Labels

```vue
<MoleculeDateSelector
  v-model="taskDate"
  :period.sync="period"
  label="Task Date"
/>
<!-- If taskDate is today: displays "Today" -->
<!-- If taskDate is tomorrow: displays "Tomorrow" -->
<!-- Otherwise: displays formatted date -->
```

### Week Selection with ISO Calculation

```vue
<MoleculeDateSelector
  v-model="weekValue"
  :period.sync="period"
  label="Week"
/>
<!-- Value: "2026-W08" -->
<!-- Display: "This Week" or "Week 8, 2026" -->
<!-- Range: "Feb 16 - Feb 22" -->
```

### Lifetime Goal with Tree Icon

```vue
<MoleculeDateSelector
  v-model="goalDate"
  :period.sync="goalPeriod"
  label="Goal Date"
/>
<!-- When period is "lifetime": -->
<!-- Value: "01-01-1970" -->
<!-- Display: "Lifetime" -->
<!-- Icon: Tree (mdi-tree) -->
```

### Handling Period Changes

```vue
<template>
  <MoleculeDateSelector
    v-model="date"
    :period.sync="period"
    @period-change="onPeriodChange"
  />
</template>

<script>
export default {
  data() {
    return {
      date: '',
      period: 'day',
    };
  },
  methods: {
    onPeriodChange(newPeriod) {
      console.log('Period changed to:', newPeriod);
      
      // Period is already updated via .sync
      // Date is auto-adjusted for lifetime
      if (newPeriod === 'lifetime') {
        // date is now '01-01-1970'
      }
    },
  },
};
</script>
```

## Testing

The component includes comprehensive unit tests covering:

* Component initialization
* Period toggle functionality
* Icon display (tree for lifetime)
* Smart label display for all periods
* ISO 8601 week calculation
* Month generation
* Year navigation
* Date selection handlers
* Quick actions
* Edge cases (leap years, 53-week years, year boundaries)

Run tests:

```bash
npm run test:unit DateSelector.spec.js
```

## Accessibility

* Keyboard navigation supported
* ARIA labels included
* Focus management
* Screen reader friendly

## Browser Support

* Modern browsers (Chrome, Firefox, Safari, Edge)
* IE11+ (with polyfills)

## Dependencies

* Vue 2.6+
* Vuetify 1.x
* AtomMenu, AtomTextField, AtomDatePicker from atoms

## Migration from Old Implementation

### Before (Separate Period Toggle)

```vue
<AtomBtnToggle v-model="period" />
<MoleculeDateSelector
  v-model="date"
  :period="period"
/>
```

### After (Integrated)

```vue
<MoleculeDateSelector
  v-model="date"
  :period.sync="period"
/>
```

## Future Enhancements

* [ ] Time picker for day selection
* [ ] Fiscal year/quarter support
* [ ] Custom week start day
* [ ] Date range selection
* [ ] Keyboard shortcuts
* [ ] Touch gestures for mobile

## Changelog

### v2.0.0 (Current)

* ✅ Integrated period toggle into dropdown
* ✅ Smart labels for all periods
* ✅ ISO 8601 week calculation
* ✅ Tree icon for lifetime
* ✅ Proper month/year generation
* ✅ Comprehensive unit tests
* ✅ Centered year titles in navigation

### v1.0.0  

* Initial release with external period selector

## License

Part of the Family Routine project.
