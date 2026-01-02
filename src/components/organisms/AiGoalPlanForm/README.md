# AiGoalPlanForm

An organism component for AI-powered milestone planning with timeline editing and bulk goal creation.

## Usage

```vue
<AiGoalPlanForm
  :searchQuery="searchQuery"
  :routines="routines"
  :goalItemsRef="goalItemsRef"
  :relatedGoalsData="relatedGoalsData"
  :currentTask="$currentTaskData"
  :loading.sync="loading"
  :saving.sync="saving"
  @error="handleError"
  @goals-saved="handleGoalsSaved"
  @success="closeModal"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| searchQuery | String | Yes | - | User's natural language query |
| currentTask | Object | No | null | Current routine task (from plugin) |
| goalItemsRef | Array | No | [] | Parent period goals for linking |
| routines | Array | No | [] | Available routine tasks |
| relatedGoalsData | Array | No | [] | Related goals data (unused, for future) |
| loading | Boolean | No | false | AI generation loading state (.sync) |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| error | String | Error message |
| goals-saved | Array | Saved goal items |
| success | - | Save completed successfully |
| update:loading | Boolean | Loading state change |
| update:saving | Boolean | Saving state change |

## Features

### AI-Powered Planning

* **Intelligent query modification**: Adjusts periods based on time remaining
  + Week: 5+ days left = use remaining, else next week
  + Month: 3+ weeks left = use remaining, else next month
  + Year: 6+ months left = use remaining, else next year
* **Auto-period detection**: Extracts week/month/year from query
* **GraphQL mutation**: `generateMilestonePlan`

### Milestone Linking

* **Optional parent linking**: Link plan to higher-level goal
* **Two-level hierarchy**: Plan title → Timeline entries
* **Automatic relationships**: Entries always reference plan title
* **Goal reference selector**: Choose parent goal from dropdown

### Timeline Editing

* **Inline markdown editor**: VueEasymde for rich descriptions
* **Editable titles**: Click to edit each milestone
* **Period display**: Shows period name and date
* **Color-coded dots**: Visual period differentiation

### Bulk Save with Fallback

* **Primary**: `bulkAddGoalItems` mutation for all entries
* **Fallback**: Individual `addGoalItem` mutations if bulk fails
* **Two-step save**:
  1. Save plan title as goal item
  2. Save all timeline entries with goalRef to plan

### Auto-Selection Logic

* **Current task**: Auto-selects from `$currentTaskData`
* **Goal period**: Detects from query keywords
* **Routine task**: Pre-selects after AI generation

## GraphQL Operations

### Mutations

**generateMilestonePlan**:

```graphql
mutation generateMilestonePlan($query: String!) {
  generateMilestonePlan(query: $query) {
    period      # 'week' | 'month' | 'year'
    title       # Plan title
    entries {
      period      # Child period
      periodName  # Display name
      date        # Date string
      title       # Entry title
      description # Entry description (Markdown)
    }
  }
}
```

**bulkAddGoalItems**:

```graphql
mutation bulkAddGoalItems($goalItems: [GoalItemInput!]!) {
  bulkAddGoalItems(goalItems: $goalItems) {
    id
    body
    contribution
    date
    period
    isMilestone
    goalRef
  }
}
```

**addGoalItem** (fallback):

```graphql
mutation addGoalItem($date: String!, $period: String!, ...) {
  addGoalItem(...) {
    id
    body
    contribution
    isMilestone
    goalRef
  }
}
```

## Data Flow

### 1. Query Submission

```
User query → modifyQueryPeriod() → generateMilestonePlan mutation
  ↓
milestoneData populated
  ↓
Auto-select routine task
```

### 2. Save Process

```
Validate inputs
  ↓
Save plan title (addGoalItem)
  ↓
Get planGoalRef
  ↓
Prepare timeline entries (map with goalRef)
  ↓
Try bulk save (bulkAddGoalItems)
  ↓ (if fails)
Fallback: Individual mutations
  ↓
Emit EVENTS.GOALS_SAVED
  ↓
Emit @success to parent
```

## Period Transformation Logic

### Query Modification Examples

**Week Plan (2 days left in week)**:

```javascript
Input: "Learn React this week"
Output: "Learn React next week starting Sunday"
```

**Month Plan (1 week left)**:

```javascript
Input: "Build app this month"
Output: "Build app next month (January 2026)"
```

**Year Plan (4 months left)**:

```javascript
Input: "Career growth this year"
Output: "Career growth next year (2026)"
```

### Entry Period Calculation

Parent period → Child period:
* `week` → `day` (7 daily entries)
* `month` → `week` (4 weekly entries)
* `year` → `month` (12 monthly entries)

### Date Conversion

Uses `getTimelineEntryDate()` utility:
* Week plans: Converts to Friday of each week
* Month plans: Converts to end of month
* Year plans: Uses month-end dates

## Component Integration

### Molecules Used

1. **PlanConfigSelector**: Routine + period selection
2. **TimelineEntryEditor**: Editable timeline items with Markdown

### Utils Required

```javascript
import {
    stepupMilestonePeriodDate, // Get parent period/date
    getTimelineEntryPeriod, // Get child period
    getTimelineEntryDate, // Convert date format
} from '../../../utils/getDates';
```

### EventBus Integration

```javascript
import eventBus, {
    EVENTS
} from '../../../utils/eventBus';

// Emit after successful save
eventBus.$emit(EVENTS.GOALS_SAVED, {
    count: savedItems.length,
    period: 'week',
    hasDayGoals: true,
    items: savedItems,
});
```

## Watchers

1. **searchQuery**: Auto-triggers `searchGoals()` on change
2. **milestoneData**: Enforces milestone/goalRef relationship
3. **searchQuery** (auto-select): Sets `selectedGoalPeriod`
4. **currentTask**: Auto-selects routine when available

## Error Handling

* Validates required fields before save
* Validates date formats (DD-MM-YYYY)
* Catches bulk mutation errors → Falls back to individual
* Emits user-friendly error messages via `@error` event

## Use Cases

* Weekly workout plans
* Monthly learning curricula
* Quarterly project roadmaps
* Annual career development plans
* Multi-step goal breakdowns

## Dependencies

* `vue-easymde` - Markdown editor
* `moment` - Date manipulation
* `graphql-tag` - GraphQL queries
* `vuetify` - UI components

## Accessibility

* Semantic form structure
* Keyboard navigation
* Clear labels and instructions
* Alert explanations for milestone linking
* Screen reader friendly
