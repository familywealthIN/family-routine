# TaskStatusTag

A simple atom component that displays a task status as a chip with an icon and label.

## Usage

```vue
<TaskStatusTag :status="'todo'" :showStatus="true" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| status | String | Yes | - | The status of the task (todo, progress, done, missed, rescheduled) |
| showStatus | Boolean | No | true | Whether to show the status chip |

## Status Types

* **todo**: Grey chip with help icon
* **progress**: Orange chip with in-progress icon
* **done**: Green chip with check icon
* **missed**: Red chip with warning icon
* **rescheduled**: Blue chip with calendar icon

## Dependencies

* `@/utils/taskStatus` - Contains TASK_STATUS_CONFIG constant
