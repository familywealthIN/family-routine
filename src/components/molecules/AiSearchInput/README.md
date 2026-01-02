# AiSearchInput

A molecule component for intelligent AI-powered search input with mode-specific placeholders and hints.

## Usage

```vue
<AiSearchInput
  v-model="searchQuery"
  :placeholder="intelligentPlaceholder"
  :loading="loading"
  :mode="isTaskMode ? 'task' : 'goals'"
  :showHint="true"
  @submit="handleSearch"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| value | String | No | '' | Search query text (v-model) |
| placeholder | String | No | 'Try: "Exercise for 30 mins" or "Learn Python this month"' | Placeholder text |
| loading | Boolean | No | false | Show loading state |
| mode | String | No | 'task' | Mode: 'task' or 'goals' |
| showHint | Boolean | No | false | Show mode hint below input |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| input | String | Emitted when text changes (v-model) |
| submit | - | Emitted on Enter or button click |

## Features

- **Intelligent placeholder**: Adapts to mode
- **Mode-specific icons**: 
  - Task mode: `add_task` icon
  - Goals mode: `search` icon
- **Loading state**: Disables input and shows spinner
- **Enter key submit**: Press Enter to submit
- **Clear button**: Quick reset
- **Mode hint**: Optional contextual help text

## Visual Design

### Task Mode
- Icon: `add_task` (checkmark in circle)
- Hint: "Task mode: Extract single task from your description"
- Color: Green (success)

### Goals Mode
- Icon: `search` (magnifying glass)
- Hint: "Goals mode: Generate milestone plan for this period"
- Color: Blue (primary)

## Mode Detection

The parent component should handle mode detection logic based on query content:

```javascript
computed: {
  isTaskMode() {
    if (!this.searchQuery) return true;
    const query = this.searchQuery.toLowerCase();
    const hasTimeKeywords = /\b(week|month|year|weekly|monthly|yearly)\b/.test(query);
    const hasPlanKeywords = /\b(plan|schedule|routine|program|strategy)\b/.test(query);
    return !(hasTimeKeywords || hasPlanKeywords);
  },
  intelligentPlaceholder() {
    if (this.isTaskMode) {
      return 'Try: "Exercise for 30 mins" or "Read 10 pages"';
    }
    return 'Try: "Learn Python this month" or "Build fitness routine this week"';
  },
}
```

## Use Cases

- AI search modal input
- Task extraction forms
- Goal planning interfaces
- Natural language command interfaces

## Accessibility

- Label for screen readers
- Keyboard navigation (Enter to submit)
- Disabled state prevents interaction
- Clear semantic structure
