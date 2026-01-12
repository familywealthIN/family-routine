# GoalItemMilestoneTile

A molecule component that displays a single goal milestone item with completion status.

## Usage

```vue
<GoalItemMilestoneTile :goalItem="goalItem" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| goalItem | Object | Yes | - | Goal item with id, body, period, date, isComplete |

## Features

* Displays goal with period/date prefix
* Shows check icon for completed goals
* Shows close icon for incomplete goals
* Strike-through styling for completed items

## Goal Item Structure

```javascript
{
    id: String,
    body: String,
    period: String, // 'day', 'week', 'month', 'year'
    date: String, // Format depends on period
    isComplete: Boolean
}
```

## Dependencies

* `@/utils/getDates` - For period date formatting
