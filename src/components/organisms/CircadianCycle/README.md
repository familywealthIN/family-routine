# CircadianCycle

An organism component that visualizes daily routines as a 24-hour circular clock diagram.

## Usage

```vue
<CircadianCycle :routineItems="routineItems" :size="400" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| routineItems | Array | Yes | - | Array of routine time blocks |
| size | Number | No | 400 | Diameter of the circle in pixels |

## Routine Item Structure

```javascript
{
  startTime: String,   // Format: 'HH:MM' (24-hour)
  endTime: String,     // Format: 'HH:MM' (24-hour)
  name: String,
  color: String        // Hex color code
}
```

## Features

- SVG-based 24-hour circular visualization
- Color-coded time blocks
- Automatic angle calculations for time segments
- Responsive sizing via size prop
- Handles overnight time spans (e.g., sleep 22:00-06:00)

## Visualization

- Inner circle: 12 AM (top) → 6 AM (bottom)
- Outer sections: Time blocks as arc segments
- Colors: Custom per activity
- Labels: Activity names positioned at arc centers

## Use Cases

- Daily routine planning
- Circadian rhythm visualization
- Time management dashboard
- Sleep schedule tracking

## Dependencies

- Pure SVG rendering (no external chart libraries)
- Mathematical calculations for arc positioning
