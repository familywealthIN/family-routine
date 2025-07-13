# AI Search Modal: Milestone and Goal Task Integration

## Overview

The AI Search Modal has been enhanced to include full milestone and goal task functionality for both task creation and goals planning. This integration brings the same advanced goal management features from the main RoutineTime interface into the AI-powered workflow.

## New Features Added

### Task Creation Mode

#### Milestone Functionality

* **Milestone Checkbox**: Users can mark AI-generated tasks as milestones
* **Conditional Goal Reference**: When milestone is checked, a "Goal Task" dropdown appears
* **Smart Logic**: Goal reference is only saved when milestone is enabled
* **Integration**: Uses the existing goalItemsRef Apollo query for consistency

#### Enhanced Task Creation Flow

1. User describes a task in natural language
2. AI extracts task details (title, description, tags, priority, due date)
3. User can select routine task assignment
4. User can mark as milestone and select related goal task
5. Task is saved with full metadata including milestone status

### Goals Planning Mode

#### Per-Entry Milestone Control

* **Individual Checkboxes**: Each generated goal entry can be marked as a milestone
* **Conditional Goal References**: Goal task dropdown appears per entry when milestone is checked
* **Flexible Planning**: Mix of regular goals and milestone goals in the same plan
* **Consistent UI**: Same interface pattern as task creation

#### Enhanced Goals Creation Flow

1. User describes goal plan in natural language
2. AI generates structured timeline with multiple entries
3. User can edit titles and descriptions for each entry
4. User can mark individual entries as milestones
5. User can link milestones to existing goal tasks
6. All goals are saved with appropriate milestone metadata

## Technical Implementation

### UI Components

#### Task Creation Section

```vue
<!-- Milestone Checkbox -->
<v-checkbox
  v-model="taskData.isMilestone"
  label="Milestone?"
  class="mb-3"
></v-checkbox>

<!-- Goal Reference (only show when milestone is checked) -->
<v-select
  v-if="taskData.isMilestone"
  :items="goalItemsRef"
  v-model="taskData.goalRef"
  item-text="body"
  item-value="id"
  label="Goal Task"
  prepend-icon="flag"
  filled
  class="mb-3"
></v-select>
```

#### Goals Planning Section

```vue
<!-- Milestone Checkbox for Goals -->
<v-checkbox
  v-model="entry.isMilestone"
  label="Milestone?"
  class="mb-2"
></v-checkbox>

<!-- Goal Reference for Goals (only show when milestone is checked) -->
<v-select
  v-if="entry.isMilestone"
  :items="goalItemsRef"
  v-model="entry.goalRef"
  item-text="body"
  item-value="id"
  label="Goal Task"
  prepend-icon="flag"
  filled
  dense
  class="mb-2"
></v-select>
```

### Data Management

#### Task Data Structure

```javascript
taskData: {
    title: "AI-extracted title",
    description: "AI-extracted description",
    tags: ["priority:do", "category:work"],
    priority: "do",
    dueDate: "2025-06-29",
    taskRef: "routine-task-id",
    goalRef: "goal-task-id", // Only used when isMilestone is true
    isMilestone: false
}
```

#### Goals Entry Structure

```javascript
entry: {
    period: "day",
    periodName: "Monday",
    date: "2025-06-30",
    title: "Goal title",
    description: "Goal description",
    isMilestone: false,
    goalRef: null // Only used when isMilestone is true
}
```

### GraphQL Mutations

#### Enhanced Task Creation

```graphql
mutation addGoalItem(
  $date: String!
  $period: String!
  $body: String!
  $taskRef: String!
  $goalRef: String
  $tags: [String]
  $isMilestone: Boolean!
) {
  addGoalItem(
    date: $date
    period: $period
    body: $body
    taskRef: $taskRef
    goalRef: $goalRef
    tags: $tags
    isMilestone: $isMilestone
  ) {
    id
    body
    taskRef
    goalRef
    tags
    isMilestone
  }
}
```

#### Enhanced Goals Creation

```graphql
mutation addGoalItem(
  $date: String!
  $period: String!
  $body: String!
  $taskRef: String!
  $isMilestone: Boolean!
  $goalRef: String
) {
  addGoalItem(
    date: $date
    period: $period
    body: $body
    taskRef: $taskRef
    isMilestone: $isMilestone
    goalRef: $goalRef
  ) {
    id
    body
    isMilestone
    goalRef
  }
}
```

### Logic Implementation

#### Smart Goal Reference Handling

```javascript
// Only include goalRef when milestone is enabled
goalRef: this.taskData.isMilestone ? this.taskData.goalRef || null : null,
    isMilestone: this.taskData.isMilestone || false,
```

#### Entry Initialization

```javascript
// Initialize milestone fields for each generated entry
if (this.milestoneData.entries) {
    this.milestoneData.entries = this.milestoneData.entries.map((entry) => ({
        ...entry,
        isMilestone: false,
        goalRef: null,
    }));
}
```

#### Enhanced Goal Items Reference

```javascript
groupGoalItemsRef(goalItems) {
    // Create a copy and add time information from routine tasks
    const goalItemsWithTime = goalItems.map((goalItem) => {
        const timeTask = this.routines.find((task) => task.taskId === goalItem.taskRef);
        return {
            ...goalItem,
            time: timeTask ? timeTask.time : null,
        };
    });

    // Sort by task reference and time
    // Group by task with headers
    // Return structured dropdown items
}
```

## User Experience Improvements

### Consistency with Main Interface

* **Same UI Patterns**: Identical milestone checkbox and goal reference behavior
* **Familiar Interactions**: Users who know the main routine interface can immediately use AI features
* **Data Consistency**: All milestone data flows through the same backend mutations

### Enhanced Workflow Integration

* **Smart Defaults**: Milestone checkboxes start unchecked for flexible user choice
* **Conditional Visibility**: Goal reference dropdowns only appear when needed
* **Context Awareness**: Goal items are properly grouped and sorted by routine tasks

### Flexible Planning Options

* **Mixed Goals**: Users can create plans with both regular goals and milestones
* **Individual Control**: Each timeline entry can be independently configured
* **Progressive Enhancement**: Basic planning works without milestones, advanced users can add them

## Benefits

### For Users

* **Unified Experience**: AI planning now has the same power as manual goal creation
* **Strategic Linking**: Can connect AI-generated goals to existing goal hierarchies
* **Progress Tracking**: Milestones enable better progress monitoring across goal periods
* **Flexible Planning**: Choose which goals are milestones based on importance

### For Developers

* **Code Reuse**: Leverages existing milestone infrastructure
* **Consistent APIs**: Same GraphQL mutations used across the application
* **Maintainable**: Changes to milestone logic automatically apply to AI features
* **Extensible**: Easy to add more goal management features in the future

## Testing Considerations

### Milestone Logic

* Test milestone checkbox enabling/disabling goal reference dropdown
* Verify goal reference is only saved when milestone is enabled
* Test with and without goal reference values when milestone is checked

### Data Flow

* Verify proper initialization of milestone fields
* Test GraphQL mutation parameter handling
* Ensure proper data persistence and retrieval

### UI/UX

* Test responsive design with additional form fields
* Verify proper form validation
* Test accessibility of conditional form elements

### Integration

* Test compatibility with existing goal management features
* Verify proper Apollo query refetching after creation
* Test interaction with main RoutineTime interface

This enhancement brings the AI Search Modal to feature parity with the main goal creation interface while maintaining the intelligent automation that makes it valuable for users.
