# UserHistory

An organism component that displays user routine history in a calendar view with task completion tracking.

## Usage

```vue
<UserHistory :routines="routines" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| routines | Array | Yes | - | Array of routine objects with date and tasklist |

## Routine Structure

```javascript
{
  id: String,
  date: String,        // Format: 'DD-MM-YYYY'
  tasklist: [
    {
      id: String,
      name: String,
      ticked: Boolean,
      passed: Boolean,
      wait: Boolean,
      points: Number
    }
  ]
}
```

## Features

- Calendar view of routine history
- Progress indicators showing completion percentage
- Clickable dates to view task details
- Navigation buttons for previous/next months
- Fullscreen dialog with task breakdown
- Color-coded task states (success, error, warning, pending)
- Empty state message when no history exists

## Task States

- **Success** (green check): Task completed
- **Error** (red close): Task passed but not completed
- **Warning** (yellow alarm): Task pending and not yet passed
- **Grey** (dots): Task waiting

## Dependencies

- `moment` - Date formatting and manipulation
- `vuetify` - Calendar and UI components
