# GoalCreation

A complex organism component for creating and editing goals with auto-save, milestone relationships, and multi-period support.

## Usage

```vue
<GoalCreation :newGoalItem="goalItem" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| newGoalItem | Object | Yes | - | Goal item to create or edit |

## Goal Item Structure

```javascript
{
    id: String, // Optional - for editing existing goals
    body: String, // Goal description
    period: String, // 'day', 'week', 'month', 'year', 'lifetime'
    date: String, // Date in period format
    tags: Array, // Goal tags/categories
    contribution: String, // Markdown notes/progress
    milestoneId: String, // Parent milestone ID
    taskRef: String, // Related routine task
    goalRef: String, // Related goal reference
    status: String, // 'todo', 'progress', 'done', etc.
    subTasks: Array // Subtask items
}
```

## Features

### Core Functionality

* Create new goals or edit existing ones
* Auto-save contribution field after 2s delay
* Multi-period support (day/week/month/year/lifetime)
* Milestone parent/child relationships
* Task and goal reference linking

### Form Components

* Period selector with date picker
* Tag management with autocomplete
* Subtask list with inline creation
* Markdown editor for contribution notes
* Task status indicator

### Auto-Save

* Debounced auto-save for contribution field (2000ms delay)
* Visual loading indicator during save
* Prevents data loss on accidental navigation
* Cleanup on component destruction

### Validation

* Required fields: body, period, date
* Period-specific date validation
* Tag format validation

## GraphQL Operations

### Queries

* `tasklist` - Fetches routine tasks for task reference
* `goalItemsRef` - Fetches related goals for goal reference

### Mutations

* `addGoalItem` - Creates new goal
* `updateGoalItem` - Updates existing goal
* `updateGoalItemContribution` - Auto-save contribution field

## Dependencies

* VueEasymde - Markdown editor
* SubTaskItemList (molecule) - Subtask management
* GoalTagsInput (molecule) - Tag input with autocomplete
* TaskStatusTag (atom) - Status indicator
* taskStatusMixin - Status management logic
* getDates utility - Period date calculations
* eventBus - GOAL_ITEM_CREATED event emission

## Events

### Emitted

* `GOAL_ITEM_CREATED` (via eventBus) - Fired after successful goal creation

## Methods

### Form Management

* `updatePeriod(period)` - Switch between periods
* `resetForm()` - Clear all form fields
* `saveGoalItem()` - Validate and save goal
* `autoSaveContribution()` - Debounced auto-save handler

### Data Fetching

* `triggerGoalItemsRef()` - Load related goals
* `refreshApolloQueries()` - Refresh data after mutations

### Tag & Task Management

* `updateNewTagItems(tags)` - Update goal tags
* `setLocalUserTag(tags)` - Save tags to localStorage
* `updateSubTaskItems(subtasks)` - Update subtasks

## Computed Properties

* `dateOptionList` - Available dates for selected period
* `showMilestoneOption` - Whether to show milestone selector

## Watchers

* `newGoalItem` - Resets form when goal changes
* `newGoalItem.contribution` (debounced) - Auto-saves after 2s
* `newGoalItem.taskRef` - Loads related goals
* `$root.$data.email` - Resets on auth changes

## Lifecycle

* `beforeDestroy` - Clears auto-save timeout

## Use Cases

* Quick goal creation from dashboard
* Detailed goal planning with milestones
* Goal editing and updates
* Linking goals to routine tasks
* Breaking goals into subtasks

## Example

```vue
<template>
  <GoalCreation :newGoalItem="newGoal" />
</template>

<script>
export default {
  data() {
    return {
      newGoal: {
        body: '',
        period: 'week',
        date: '2025-W51',
        tags: ['work'],
        contribution: '',
        subTasks: []
      }
    };
  }
};
</script>
```

## Notes

* Auto-save only works for existing goals (with ID)
* Contribution field uses markdown syntax
* Period changes reset the date picker
* Tags are persisted to localStorage for quick access
