# Task Status System

This document explains the new status tag system for day tasks that automatically tracks task status based on when they were created, completed, or modified.

## Status Types

The system supports 5 status types:

1. **TODO (blue)** - Task created before the current task
2. **PROGRESS (orange)** - Task created during the current task
3. **DONE (green)** - Task completed during the current task
4. **MISSED (red)** - Task checked after the current task (in past tab list)
5. **RESCHEDULED (purple)** - Task date was changed

## Auto Status Assignment

Status is automatically assigned based on these rules:

### On Task Creation:

* If task is created for the current active task → **PROGRESS**
* If task is created for a future task → **TODO**
* If task is being rescheduled (originalDate provided) → **RESCHEDULED**

### On Task Completion:

* If task is completed during its time window → **DONE**
* If task is completed after its time window → **MISSED**

### On Task Rescheduling:

* When a task's date is changed → **RESCHEDULED**
* Original date is tracked for reference

## Implementation

### Backend (Schema & Resolvers)

1. **Schema Updates** (`GoalItemSchema`):

```javascript
status: {
        type: String,
        enum: ['todo', 'progress', 'done', 'missed', 'rescheduled'],
        default: 'todo',
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    completedAt: Date,
    originalDate: String,
```

2. **Mutations Enhanced**:
* `addGoalItem` - Sets initial status based on context
* `completeGoalItem` - Updates status and completedAt timestamp
* `rescheduleGoalItem` - New mutation for rescheduling with status tracking

### Frontend (Components & Utils)

1. **Status Utility** (`src/utils/taskStatus.js`):
* `determineTaskStatus()` - Calculate status based on context
* `getInitialTaskStatus()` - Get status for new tasks
* `updateTaskStatusOnComplete()` - Update status on completion

2. **Composable** (`src/composables/useTaskStatus.js`):
* Vue 2 mixin for easy integration
* Reactive status management
* Current task context handling

3. **Status Component** (`src/components/TaskStatusTag.vue`):
* Visual status tag with icon and color
* Tooltip with status description
* Configurable visibility

### Usage in Components

1. **Add the mixin**:

```javascript
import {
    taskStatusMixin
} from '@/composables/useTaskStatus';

export default {
    mixins: [taskStatusMixin],
    // ...
}
```

2. **Display status tag**:

```vue
<task-status-tag 
  v-if="shouldShowStatus(goal.period)"
  :status="getGoalItemStatus(goalItem)"
  class="ml-2"
/>
```

3. **Calculate status**:

```javascript
methods: {
    getGoalItemStatus(goalItem) {
        return goalItem.status || this.calculateTaskStatus(
            goalItem,
            goalItem.isComplete,
            goalItem.originalDate,
        );
    }
}
```

## Updated Components

The following components have been updated to support the status system:

1. **GoalItemList.vue** - Displays status tags for day tasks
2. **GoalCreation.vue** - Sets initial status on task creation
3. **QuickGoalCreation.vue** - Sets initial status on quick task creation
4. **AiSearchModal.vue** - Status-aware task creation
5. **TaskStatusTag.vue** - New component for displaying status

## GraphQL Updates

### Mutations

1. **addGoalItem** - Added `originalDate` parameter
2. **bulkAddGoalItems** - Enhanced with status handling
3. **completeGoalItem** - Updates status and timestamps
4. **rescheduleGoalItem** - New mutation for rescheduling

### Schema

* Added status, createdAt, completedAt, originalDate fields
* Updated GraphQL types to include new fields
* Enhanced input types for mutations

## Usage Examples

### Creating a Task with Status

```javascript
// The status is automatically determined based on context
this.$apollo.mutate({
    mutation: ADD_GOAL_ITEM,
    variables: {
        body: 'Complete project',
        period: 'day',
        date: '06-07-2025',
        taskRef: 'current-task-id',
        // status will be auto-assigned based on current task context
    }
});
```

### Rescheduling a Task

```javascript
// Use the new reschedule mutation
this.$apollo.mutate({
    mutation: RESCHEDULE_GOAL_ITEM,
    variables: {
        id: 'goal-item-id',
        oldDate: '06-07-2025',
        newDate: '07-07-2025',
        period: 'day',
    }
});
```

### Displaying Status

```vue
<template>
  <div>
    <span>{{ goalItem.body }}</span>
    <task-status-tag 
      v-if="shouldShowStatus(goal.period)"
      :status="goalItem.status"
    />
  </div>
</template>
```

## Benefits

1. **Automatic Tracking** - No manual status management required
2. **Visual Feedback** - Clear status indicators for users
3. **Context Awareness** - Status based on current task timing
4. **Rescheduling Support** - Track when tasks are moved
5. **Performance** - Efficient status calculation and caching

## Migration

Existing tasks without status will:
* Default to 'todo' status
* Calculate status dynamically using the utility functions
* Get proper status on next completion/update

The system is backward compatible and will enhance existing functionality without breaking changes.
