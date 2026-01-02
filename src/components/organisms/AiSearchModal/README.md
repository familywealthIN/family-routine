# AiSearchModal Organism

**Category**: Organism  
**Purpose**: Main orchestrator for AI-powered task creation and goal planning with intelligent mode detection.

## Overview

The `AiSearchModal` is an orchestrator organism that coordinates between two specialized sub-organisms:
- **AiTaskCreationForm**: Handles simple task extraction and creation
- **AiGoalPlanForm**: Handles multi-step goal planning with AI-generated milestones

It features intelligent mode detection based on query keywords, automatic routine task selection, and seamless integration with GraphQL for data fetching and mutations.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| value | Boolean | Yes | - | v-model for dialog visibility |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| input | Boolean | Emitted when dialog visibility changes |

## Features

### 1. Intelligent Mode Detection
- **Task Mode**: Triggered by simple action queries (e.g., "Call dentist tomorrow")
- **Goals Mode**: Triggered by queries containing:
  - Time keywords: `week`, `month`, `year`, `weekly`, `monthly`, `yearly`, `weeks`, `months`, `years`
  - Planning keywords: `plan`, `schedule`, `routine`, `program`, `strategy`, `course`, `curriculum`

### 2. Auto-Selection Logic
- Automatically selects current routine task from `$currentTaskData`
- In **Task Mode**: Auto-selects `taskRef` in AiTaskCreationForm
- In **Goals Mode**: Auto-selects `selectedRoutine` in AiGoalPlanForm
- Auto-links week goals when milestone checkbox is enabled

### 3. Scroll Shadow Indicators
- Shows visual shadow at top when content is scrolled down
- Shows visual shadow at bottom when more content is available below
- Enhances UX by indicating scrollable areas

### 4. GraphQL Integration
- **goalItemsRef**: Fetches week goals for milestone linking (task mode)
- **relatedGoalsData**: Fetches related goals when a milestone is selected
- Intelligent skip logic based on authentication and mode

### 5. Coordination Layer
- Delegates task creation to `AiTaskCreationForm`
- Delegates goal planning to `AiGoalPlanForm`
- Manages shared state: `searchQuery`, `error`, `loading`, `saving`
- Handles success/error states and modal lifecycle

## Usage

```vue
<template>
  <div>
    <v-btn @click="showAiSearch = true">Open AI Search</v-btn>
    <AiSearchModal v-model="showAiSearch" />
  </div>
</template>

<script>
import AiSearchModal from '@/components/organisms/AiSearchModal/AiSearchModal.vue';

export default {
  components: {
    AiSearchModal,
  },
  data() {
    return {
      showAiSearch: false,
    };
  },
};
</script>
```

## Component Structure

```
AiSearchModal (Orchestrator)
├── v-dialog (persistent, max-width: 800px)
│   ├── Sticky Header
│   │   ├── Mode Icon (task_alt | timeline)
│   │   ├── Dynamic Title
│   │   └── Close Button
│   ├── Scroll Shadow (Top)
│   ├── Scrollable Content
│   │   ├── Search Input (v-text-field)
│   │   ├── Mode Hint (v-alert)
│   │   ├── Error Display (v-alert)
│   │   ├── AiTaskCreationForm (v-if isTaskMode)
│   │   └── AiGoalPlanForm (v-else)
│   ├── Scroll Shadow (Bottom)
│   └── Sticky Footer
│       ├── Cancel Button
│       └── Save Button (Create Task | Save Plan & Timeline)
```

## Computed Properties

### isTaskMode
```javascript
computed: {
  isTaskMode() {
    if (!this.searchQuery) return true;
    
    const query = this.searchQuery.toLowerCase();
    const timeKeywords = /\b(week|month|year|weekly|monthly|yearly|weeks|months|years)\b/;
    const planKeywords = /\b(plan|schedule|routine|program|strategy|course|curriculum)\b/;
    
    // If query contains time or planning keywords, it's goals mode
    if (timeKeywords.test(query) || planKeywords.test(query)) {
      return false;
    }
    
    return true; // Default to task mode
  }
}
```

### dynamicTitle
- **Task Mode**: "Add Task with AI"
- **Goals Mode**: "Build Goals with AI"

### intelligentPlaceholder
- **Task Mode**: Examples of simple action tasks
- **Goals Mode**: Examples of time-based goals

### canSave
- **Task Mode**: Validates `taskData.title` and `taskData.description` from AiTaskCreationForm
- **Goals Mode**: Validates `milestoneData`, `selectedRoutine`, `selectedGoalPeriod`, and timeline entries from AiGoalPlanForm

## Methods

### handleSaveClick()
Delegates save action to the active child organism:
- **Task Mode**: Calls `this.$refs.taskForm.saveTask()`
- **Goals Mode**: Calls `this.$refs.goalForm.saveGoals()`

### handleSubmit()
Delegates search/extraction to the active child organism:
- **Task Mode**: Calls `this.$refs.taskForm.createTask()`
- **Goals Mode**: Calls `this.$refs.goalForm.searchGoals()`

### handleScroll()
Calculates scroll position and updates shadow visibility indicators.

### resetForm()
Resets orchestrator state and calls `resetForm()` on both child organisms.

### refreshApolloQueries()
Refreshes Apollo queries after login/logout events.

## Apollo Queries

### goalItemsRef
```graphql
query getGoalItemsRef($period: String!, $date: String!) {
  goalDatePeriod(period: $period, date: $date) {
    id
    body
    period
    date
    taskRef
    tags
    isComplete
  }
}
```
- **Variables**: `{ period: 'week', date: '2025-W51' }` (current Friday)
- **Skip Logic**: Skips if not authenticated
- **Purpose**: Provides week goals for milestone linking in task mode

### relatedGoalsData
```graphql
query getRelatedGoalsData($goalRef: ID!) {
  goalItemMilestone(goalRef: $goalRef) {
    id
    body
    period
    date
    taskRef
    tags
    isComplete
  }
}
```
- **Variables**: `{ goalRef: taskData.goalRef || milestoneData.goalRef }`
- **Skip Logic**: Skips if not authenticated or no goalRef is set
- **Purpose**: Fetches related goals for timeline display when milestone is selected

## Watchers

### dialog
Initializes modal state when opened:
- Calls `resetForm()`
- Initializes scroll shadow detection
- Handled by child organisms: Auto-selects current task in active form

### $route
Detects login/logout navigation and refreshes Apollo queries.

### $root.$data.email
Detects user email changes (login/logout) and refreshes Apollo queries.

### routines
Auto-selects current task in the active child organism when routine data loads:
- **Task Mode**: Sets `taskData.taskRef` in AiTaskCreationForm
- **Goals Mode**: Sets `selectedRoutine` in AiGoalPlanForm

## Styling

### Sticky Header
- Positioned at top with `position: sticky; top: 0; z-index: 2`
- White background with bottom border
- Contains mode icon, dynamic title, and close button

### Sticky Footer
- Positioned at bottom with `position: sticky; bottom: 0; z-index: 2`
- White background with top border
- Contains cancel and save buttons

### Scroll Shadows
- **Top Shadow**: `linear-gradient(to bottom, rgba(0, 0, 0, 0.1), transparent)`
- **Bottom Shadow**: `linear-gradient(to top, rgba(0, 0, 0, 0.1), transparent)`
- Positioned at 64px from top and 52px from bottom
- Only visible when scrolling

### Scrollable Content
- Max height: 70vh
- Overflow: auto
- Padding: 24px

## Integration with Child Organisms

### AiTaskCreationForm Props
```vue
<AiTaskCreationForm
  ref="taskForm"
  :searchQuery="searchQuery"
  :currentTask="$currentTaskData"
  :goalItemsRef="goalItemsRef"
  :routines="routines"
  :relatedGoalsData="relatedGoalsData"
  :loading.sync="loading"
  @error="error = $event"
  @update:loading="loading = $event"
  @update:saving="saving = $event"
  @task-created="handleTaskCreated"
  @success="handleSuccess"
/>
```

### AiGoalPlanForm Props
```vue
<AiGoalPlanForm
  ref="goalForm"
  :searchQuery="searchQuery"
  :currentTask="$currentTaskData"
  :goalItemsRef="goalItemsRef"
  :routines="routines"
  :loading.sync="loading"
  @error="error = $event"
  @update:loading="loading = $event"
  @update:saving="saving = $event"
  @goals-saved="handleGoalsSaved"
  @success="handleSuccess"
/>
```

## Orchestrator Pattern

This component follows the **Orchestrator Pattern**:

1. **Coordination**: Manages dialog lifecycle, mode switching, and shared state
2. **Delegation**: Passes domain-specific logic to specialized child organisms
3. **Data Provision**: Fetches shared data via Apollo and provides to children
4. **Event Handling**: Listens to child events and coordinates responses
5. **State Management**: Maintains shared state (`searchQuery`, `error`, `loading`, `saving`)

## Dependencies

- **Vue 2**: Component framework
- **Vuetify 1.x**: UI components (v-dialog, v-card, v-text-field, v-btn, v-alert)
- **Vue Apollo**: GraphQL client
- **Moment.js**: Date formatting for goalRefPeriodData
- **AiTaskCreationForm**: Child organism for task creation
- **AiGoalPlanForm**: Child organism for goal planning
- **currentTask Plugin**: Provides `$currentTaskData` and `$currentTaskList` globally

## Related Components

- **AiTaskCreationForm** (`organisms/AiTaskCreationForm`) - Task creation sub-organism
- **AiGoalPlanForm** (`organisms/AiGoalPlanForm`) - Goal planning sub-organism
- **GoalTagsInput** (`molecules/GoalTagsInput`) - Used by AiTaskCreationForm
- **PlanConfigSelector** (`molecules/PlanConfigSelector`) - Used by AiGoalPlanForm
- **TimelineEntryEditor** (`molecules/TimelineEntryEditor`) - Used by AiGoalPlanForm
- **RelatedTasksTimeline** (`molecules/RelatedTasksTimeline`) - Used by AiTaskCreationForm

## Lifecycle Flow

### Opening Modal
1. User clicks "Open AI Search" button
2. `dialog` watcher triggers
3. `resetForm()` cleans all state
4. Scroll shadows initialized via `checkScrollShadows()`
5. Child organisms auto-select current task (handled internally)

### Mode Detection
1. User types in search query
2. `isTaskMode` computed property evaluates query
3. Template conditionally renders AiTaskCreationForm or AiGoalPlanForm
4. Mode hint displays appropriate guidance

### Submitting Query
1. User presses Enter or clicks search icon
2. `handleSubmit()` delegates to active child organism
3. Child calls GraphQL mutation (extractDayTask or generateMilestonePlan)
4. Loading state synchronized via `:loading.sync`
5. Results displayed in child organism's template

### Saving Data
1. User clicks "Create Task" or "Save Plan & Timeline"
2. `handleSaveClick()` delegates to active child organism
3. Child calls GraphQL mutation (addGoalItem or bulkAddGoalItems)
4. Saving state synchronized via `:saving.sync`
5. Success event triggers `handleSuccess()` which closes modal

### Error Handling
1. Child organism encounters error (API, validation, network)
2. Child emits `@error` event with error message
3. Orchestrator sets `error = $event`
4. Error alert displays at top of scrollable content
5. User can dismiss error by clicking X

## Differences from Original Monolithic Component

### Removed Responsibilities (Delegated to Children)
- ❌ AI extraction logic → AiTaskCreationForm
- ❌ AI planning logic → AiGoalPlanForm
- ❌ Task data management → AiTaskCreationForm
- ❌ Milestone data management → AiGoalPlanForm
- ❌ Timeline editing → AiGoalPlanForm
- ❌ Tag management → AiTaskCreationForm
- ❌ Date transformation → AiGoalPlanForm
- ❌ Save mutations → Both child organisms
- ❌ Auto-selection watchers → Both child organisms

### Retained Responsibilities (Orchestrator Core)
- ✅ Dialog lifecycle management
- ✅ Mode detection (isTaskMode)
- ✅ Scroll shadow indicators
- ✅ Apollo queries (goalItemsRef, relatedGoalsData)
- ✅ Routines computed property
- ✅ Error/success state coordination
- ✅ Save button enablement logic (canSave)
- ✅ Navigation watchers ($route, $root.$data.email)
- ✅ Query refresh on login/logout

## Testing Considerations

### Unit Tests
- Test `isTaskMode` regex patterns with various queries
- Test `canSave` computed property for both modes
- Test `handleSaveClick` delegation to correct child ref
- Test `handleSubmit` delegation to correct child ref
- Test scroll shadow calculation logic
- Test Apollo query skip logic

### Integration Tests
- Test mode switching when query changes
- Test auto-selection of current task in both modes
- Test error propagation from child organisms
- Test success flow and modal closure
- Test Apollo query refetch on login/logout

### E2E Tests
- Test full task creation flow from search to save
- Test full goal planning flow from search to timeline save
- Test mode switching with different query types
- Test milestone linking in task mode
- Test bulk save fallback in goals mode

## Performance Optimizations

- **Conditional Rendering**: Only one child organism rendered at a time
- **Apollo Skip Logic**: Queries skipped when not needed (authentication, mode, data)
- **Debounced Scroll**: Scroll shadow calculation uses efficient DOM queries
- **Lazy Load Children**: Child organisms only created when modal opens
- **Reset on Close**: Cleans up state to prevent memory leaks

## Accessibility

- **Keyboard Navigation**: Enter key triggers search, Escape closes modal
- **Focus Management**: Auto-focus search input when modal opens
- **ARIA Labels**: Mode icon indicates current mode (task_alt vs timeline)
- **Screen Reader**: Dynamic title announces current mode
- **Dismissible Errors**: Errors can be dismissed with keyboard

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (Vue 2 limitation)

## Future Enhancements

- [ ] Add voice input for search query
- [ ] Support drag-and-drop timeline reordering
- [ ] Add undo/redo for timeline edits
- [ ] Support collaborative goal planning
- [ ] Add export to calendar feature
- [ ] Implement AI-powered query refinement suggestions
- [ ] Add analytics tracking for mode switching patterns

## Changelog

### v1.0.0 (Dec 22, 2025)
- Initial orchestrator organism created
- Extracted from monolithic 1,762-line AiSearchModal.vue
- Delegates task creation to AiTaskCreationForm
- Delegates goal planning to AiGoalPlanForm
- Implements intelligent mode detection
- Manages Apollo queries and scroll shadows
- Reduced orchestrator to ~400 lines

---

**Component Type**: Organism (Orchestrator)  
**Atomic Design Level**: Level 3  
**Complexity**: High (coordination logic)  
**Reusability**: Low (app-specific orchestration)  
**Dependencies**: 2 child organisms, Apollo, Moment.js, currentTask plugin
