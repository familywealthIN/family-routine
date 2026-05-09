# PlanConfigSelector

A molecule component for selecting routine tasks and goal periods in AI-powered planning interfaces.

## Usage

```vue
<PlanConfigSelector
  :routines="routines"
  :selectedRoutine.sync="selectedRoutine"
  :selectedPeriod.sync="selectedPeriod"
  :periodOptions="goalPeriodOptions"
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| routines | Array | No | [] | List of routine tasks |
| selectedRoutine | String | No | null | Selected routine task ID (.sync) |
| selectedPeriod | String | No | null | Selected goal period (.sync) |
| periodOptions | Array | No | [week, month, year] | Period dropdown options |
| disabled | Boolean | No | false | Disable both selectors |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| update:selectedRoutine | String | Emitted when routine changes |
| update:selectedPeriod | String | Emitted when period changes |

## Features

* **Two-column layout**: Routine and period selectors side-by-side
* **Dependent disable**: Period selector disabled until routine selected
* **Sync modifiers**: Supports `.sync` for two-way binding
* **Custom period options**: Override default week/month/year
* **Icons**: Schedule icon for routine, calendar for period

## Routine Items Format

```javascript
routines: [{
        taskId: '1',
        name: 'Morning Routine'
    },
    {
        taskId: '2',
        name: 'Work Focus'
    },
    {
        taskId: '3',
        name: 'Exercise'
    },
]
```

## Period Options Format

```javascript
periodOptions: [{
        text: 'Week Goals',
        value: 'week'
    },
    {
        text: 'Month Goals',
        value: 'month'
    },
    {
        text: 'Year Goals',
        value: 'year'
    },
]
```

## Integration with AiSearchModal

This component is extracted from the AiSearchModal's routine and period selection logic:

```vue
<!-- In AiSearchModal template (lines 244-267) -->
<PlanConfigSelector
  :routines="routines"
  :selectedRoutine.sync="selectedRoutine"
  :selectedPeriod.sync="selectedPeriod"
  :periodOptions="goalPeriodOptions"
  :disabled="loading"
/>
```

The parent component provides:
* `routines` from `routineTasksData` computed property
* `selectedRoutine` for auto-selection logic
* `selectedPeriod` for goal period management
* `goalPeriodOptions` from data

## Auto-selection Pattern

Parent components typically auto-select the current task when the modal opens:

```javascript
watch: {
    dialog(isOpen) {
        if (isOpen && this.$currentTaskData && this.$currentTaskData.id) {
            this.selectedRoutine = this.$currentTaskData.id;
        }
    },
}
```

## Use Cases

* AI goal planning interfaces
* Milestone configuration forms
* Period-based task scheduling
* Routine-linked goal creation

## Accessibility

* Semantic labels for screen readers
* Keyboard navigation support
* Disabled state prevents interaction
* Clear visual hierarchy
