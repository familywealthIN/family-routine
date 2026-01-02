# GoalsFilterTime

An organism component that filters and displays goals by time period and date range.

## Usage

```vue
<GoalsFilterTime 
  :goals="goals" 
  :periodFilter="'week'" 
  :updateNewGoalItem="handleUpdate"
  :rangeType="'current'"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| goals | Array | Yes | - | Array of goal items to filter and display |
| periodFilter | String | Yes | - | Period type: 'day', 'week', 'month', 'year' |
| updateNewGoalItem | Function | Yes | - | Callback when creating new goal |
| rangeType | String | No | 'current' | 'current', 'past', or 'future' |

## Features

* Filters goals by period and date range
* Supports day, week, month, and year periods
* Identifies overdue/missed goals (before today)
* Allows editing based on date and range type
* Groups goals by date within period

## Utility Methods

* `isItBeforeToday(date)` - Checks if date is in the past
* `shouldAllowEdit(date, rangeType)` - Determines if goal can be edited
* `getPeriodDate(period, date)` - Formats date for display
* `inRangeType(goalDate, rangeType)` - Filters goals by range

## Dependencies

* moment.js - Date manipulation
* GoalItemList component - Displays filtered goals
* getDates utility - Date formatting and validation

## Use Cases

* Dashboard goal filtering
* Timeline view of goals
* Historical goal review
* Future goal planning
