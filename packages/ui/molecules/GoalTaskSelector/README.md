# GoalTaskSelector Molecule

A reusable dropdown component for selecting routine tasks. Supports optional grouping by time period and multiple styling variants for use in different contexts (toolbars, forms, cards).

## Features

* **V-model binding** for easy two-way data binding
* **Time period grouping** - Groups tasks by Morning, Afternoon, Evening, Night
* **Flexible data structures** - Works with both `id` and `taskId` item values
* **Multiple style variants** - solo, filled, dense for different UI contexts
* **Emits full task object** on change for easy tag merging in parent

## Usage

### Basic Usage

```vue
<GoalTaskSelector
  :items="tasklist"
  v-model="goalItem.taskRef"
/>
```

### With Grouping

```vue
<GoalTaskSelector
  :items="tasklist"
  v-model="goalItem.taskRef"
  grouped
/>
```

### Toolbar Style (GoalCreation)

```vue
<GoalTaskSelector
  :items="tasklist"
  v-model="localGoalItem.taskRef"
  :disabled="newItemLoaded"
  prepend-inner-icon="history"
  solo
/>
```

### Form Style (AiTaskCreationForm)

```vue
<GoalTaskSelector
  :items="routines"
  v-model="taskData.taskRef"
  item-value="taskId"
  prepend-icon="schedule"
  filled
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `items` | Array | `[]` | Array of routine task objects |
| `value` | String | `''` | Selected task ID (v-model) |
| `itemText` | String | `'name'` | Property name for display text |
| `itemValue` | String | `'id'` | Property name for value ( `'id'` or `'taskId'` ) |
| `label` | String | `'Routine Task'` | Field label |
| `prependIcon` | String | `''` | Icon outside input |
| `prependInnerIcon` | String | `''` | Icon inside input |
| `disabled` | Boolean | `false` | Disabled state |
| `solo` | Boolean | `false` | Solo style for toolbars |
| `filled` | Boolean | `false` | Filled style for forms |
| `clearable` | Boolean | `false` | Allow clearing selection |
| `hideDetails` | Boolean | `false` | Hide validation messages |
| `rules` | Array | `[]` | Validation rules |
| `dense` | Boolean | `false` | Dense styling |
| `grouped` | Boolean | `false` | Enable time period grouping |
| `selectClass` | String/Array/Object | `''` | Additional CSS classes |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `input` | `String` | Emitted when value changes (v-model) |
| `change` | `String, Object` | Emitted with value and full task object |

## Data Structure

### Standard Tasklist (from routine store)

```javascript
[{
        id: '123',
        name: 'Morning Routine',
        time: '08:00',
        tags: ['health']
    },
    {
        id: '456',
        name: 'Work Tasks',
        time: '14:00',
        tags: ['work']
    },
]
```

### Transformed Routines (from AI components)

```javascript
[{
        taskId: '123',
        name: 'Morning Routine',
        time: '08:00',
        tags: ['health']
    },
    {
        taskId: '456',
        name: 'Work Tasks',
        time: '14:00',
        tags: ['work']
    },
]
```

## Grouping

When `grouped` is true, tasks are organized by time period:

* **Morning (6:00 - 12:00)**
* **Afternoon (12:00 - 18:00)**
* **Evening (18:00 - 22:00)**
* **Night (22:00 - 6:00)**
* **Unscheduled** (no time set)

Groups use Vuetify's header pattern: `{ header: 'Period Name' }`
