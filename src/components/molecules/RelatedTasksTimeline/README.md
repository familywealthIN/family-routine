# RelatedTasksTimeline

A molecule component for displaying a timeline of related goals/tasks with status indicators, dates, and tags.

## Usage

```vue
<RelatedTasksTimeline :tasks="relatedTasks" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| tasks | Array | No | [] | Array of related task/goal objects |

## Task Object Format

```javascript
{
  id: String,          // Unique identifier
  body: String,        // Task description/title
  date: String,        // Date in DD-MM-YYYY format
  time: String,        // Time in HH:MM format (optional)
  tags: Array,         // Array of tag strings
  isComplete: Boolean, // Completion status
}
```

## Features

- **Color-coded status**: 
  - Green dot: Completed tasks (`isComplete: true`)
  - Orange dot: Pending tasks (`isComplete: false`)
- **Compact timeline**: Dense layout for modal/card display
- **Date formatting**: Displays as "Ddd, MMM D" (e.g., "Mon, Dec 22")
- **Tag display**: Chip-based tag visualization
- **Conditional rendering**: Only shows when tasks array has items
- **Responsive**: Adapts to container width

## Visual Design

### Header
- Icon: `track_changes` (goal tracking icon)
- Title: "Related Goals (count)"
- Subtitle-2 font size

### Timeline Items
- **Completed**: Green timeline dot
- **Pending**: Orange timeline dot
- **Date**: Caption text, secondary color
- **Time**: Caption text (if present)
- **Body**: Body-2 font weight (medium)
- **Tags**: Extra-small outlined chips

## Integration with AiSearchModal

Extracted from AiSearchModal template lines 145-180:

```vue
<!-- BEFORE: Inline timeline in modal -->
<v-card v-if="relatedTasks.length > 0" outlined class="modern-shadow-sm">
  <v-card-title class="pb-2">
    <v-icon left small>track_changes</v-icon>
    <span class="subtitle-2">Related Goals ({{ relatedTasks.length }})</span>
  </v-card-title>
  <v-card-text class="pt-0">
    <v-timeline dense>
      <!-- ~35 lines of timeline item template -->
    </v-timeline>
  </v-card-text>
</v-card>

<!-- AFTER: Clean molecule usage -->
<RelatedTasksTimeline :tasks="relatedTasks" />
```

### Parent Component Setup

The parent component provides the `relatedTasks` computed property:

```javascript
computed: {
  relatedTasks() {
    if (!this.relatedGoalsData || !Array.isArray(this.relatedGoalsData)) {
      return [];
    }
    // Flatten relatedGoalsData into timeline items
    return this.relatedGoalsData.flatMap(goalGroup => 
      goalGroup.items.map(item => ({
        id: item.id,
        body: item.body,
        date: item.date,
        time: item.time,
        tags: item.tags,
        isComplete: item.status === 'done',
      }))
    );
  },
}
```

## Use Cases

- Display related goals in task creation modal
- Show milestone progress in goal planning
- Visualize weekly goal timeline
- Display task dependencies
- Show historical completion patterns

## Empty State

When `tasks` array is empty, the component renders nothing (no empty state message). Parent component should handle empty state if needed:

```vue
<div v-if="relatedTasks.length === 0" class="text-center text--secondary">
  No related goals found
</div>
<RelatedTasksTimeline v-else :tasks="relatedTasks" />
```

## Accessibility

- Semantic timeline structure (Vuetify)
- Color indicators supplemented by status text
- Screen reader friendly layout
- Keyboard navigable (via Vuetify)

## Date Formatting

Uses moment.js for consistent date formatting:

```javascript
formatDate(date) {
  if (!date) return '';
  return moment(date, 'DD-MM-YYYY').format('ddd, MMM D');
  // Output: "Mon, Dec 22"
}
```

## Dependencies

- `moment` - Date formatting
- `vuetify` - Timeline, card, chip components
