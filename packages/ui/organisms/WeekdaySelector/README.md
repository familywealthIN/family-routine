# WeekdaySelector

A reusable weekday selector component that displays a week at a time with clickable days.

## Overview

WeekdaySelector is an organism-level component that displays 7 days of the week (Sunday through Saturday) and allows users to select a specific day. The component automatically updates to show the correct week based on the selected date.

## Usage

```vue
<template>
  <weekday-selector
    :selectedDate="date"
    @date-selected="handleDateSelected"
  />
</template>

<script>
import WeekdaySelector from '@/components/organisms/WeekdaySelector/WeekdaySelector.vue';

export default {
  components: {
    WeekdaySelector,
  },
  data() {
    return {
      date: moment().format('DD-MM-YYYY'),
    };
  },
  methods: {
    handleDateSelected(newDate) {
      this.date = newDate;
      // Do something with the new date
    },
  },
};
</script>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| selectedDate | String | No | Current date | The currently selected date in 'DD-MM-YYYY' format |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| date-selected | String | Emitted when a day is clicked. Payload is the date in 'DD-MM-YYYY' format |

## Features

* **Automatic Week Calculation**: Displays the week containing the selected date
* **Visual Active State**: Highlights the currently selected day
* **Responsive**: Works on mobile and desktop layouts
* **Reactive Updates**: Automatically rebuilds week when selectedDate prop changes

## Styling

The component includes scoped styles with:
* Flexbox layout for even spacing
* Hover effects for better UX
* Active state with blue background (#288bd5)
* Rounded corners for visual appeal
* Mobile-optimized touch targets

## Accessibility

* Clickable day elements with proper cursor
* Clear visual feedback on hover and selection
* Semantic HTML structure

## Dependencies

* **moment.js**: Used for date manipulation and formatting

## Examples

### Basic Usage

```vue
<weekday-selector @date-selected="handleDateSelected" />
```

### With Specific Date

```vue
<weekday-selector 
  :selectedDate="specificDate"
  @date-selected="handleDateSelected" 
/>
```

### In Dashboard Context

```vue
<template>
  <div>
    <weekday-selector
      :selectedDate="date"
      @date-selected="handleDateSelected"
    />
    <!-- Other dashboard content -->
  </div>
</template>

<script>
export default {
  data() {
    return {
      date: moment().format('DD-MM-YYYY'),
    };
  },
  methods: {
    handleDateSelected(newDate) {
      this.date = newDate;
      this.refreshData(); // Refresh other components
    },
  },
};
</script>
```

## Component Structure

```
WeekdaySelector/
├── WeekdaySelector.vue          # Component implementation
├── WeekdaySelector.stories.js   # Storybook stories
└── README.md                    # This file
```

## Technical Details

### Data Model

```javascript
{
    weekDays: [{
            dayNumber: '01', // Date number (DD)
            isActive: false, // Whether this day is selected
            day: 'SU' // Day abbreviation
        },
        // ... 6 more days
    ]
}
```

### Key Methods

* `buildWeekdays()`: Generates array of 7 days starting from Sunday
* `updateWeekdays(date)`: Updates weekdays based on new selected date
* `handleDateSelect(index)`: Handles day click and emits new date

## Migration Notes

This component was extracted from `DashBoard.vue` to improve code organization and enable reusability. It replaces the inline weekdays functionality that was previously embedded in the dashboard container.

### Before (in DashBoard.vue)

```vue
<div class="weekdays pt-2 pb-2">
  <div
    v-for="(weekDay, i) in weekDays"
    :key="weekDay.day"
    @click="setDate(i)"
    :class="`day ${weekDay.isActive ? 'active' : ''}`"
  >
    <div>{{ weekDay.day }}</div>
    <div>{{ weekDay.dayNumber }}</div>
  </div>
</div>
```

### After (using WeekdaySelector)

```vue
<weekday-selector
  :selectedDate="date"
  @date-selected="handleDateSelected"
/>
```

## Future Enhancements

* [ ] Add keyboard navigation (arrow keys)
* [ ] Add swipe gestures for week navigation
* [ ] Add optional week number display
* [ ] Add customizable day abbreviations (locale support)
* [ ] Add optional today indicator badge
* [ ] Add animation on week change

## Related Components

* **DashBoard.vue**: Primary consumer of this component
* **ContainerBox.vue**: Often wraps this component in layouts

## Testing

Run Storybook to see all variations:

```bash
yarn storybook
```

Navigate to `Organisms > WeekdaySelector` to see:
* Default (current week)
* WithSelectedDate (specific date)
* PreviousWeek (navigation example)
* Interactive (full functionality demo)
* MobileLayout (mobile context)

## Support

For issues or questions, refer to the project documentation or contact the development team.

---

**Last Updated**: December 22, 2025  
**Component Type**: Organism  
**Status**: ✅ Production Ready
