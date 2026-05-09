# ModeIndicator

An atom component that displays the current AI search mode (task or goals) with an icon.

## Usage

```vue
<ModeIndicator mode="task" :showLabel="true" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| mode | String | Yes | - | Mode type: 'task' or 'goals' |
| showLabel | Boolean | No | false | Whether to show text label |
| size | String/Number | No | 24 | Icon size in pixels |

## Features

* Mode-specific icons (task: check_circle, goals: timeline)
* Color-coded by mode (task: success green, goals: primary blue)
* Optional text label display
* Configurable icon size

## Visual States

### Task Mode

* Icon: check_circle (✓)
* Color: Green (success)
* Label: "Task Mode"

### Goals Mode

* Icon: timeline (timeline)
* Color: Blue (primary)
* Label: "Goals Mode"

## Use Cases

* AI search modal mode indicator
* Multi-mode form headers
* Workflow step indicators
* Status displays

## Example

```vue
<template>
  <div>
    <ModeIndicator :mode="currentMode" showLabel />
  </div>
</template>

<script>
export default {
  data() {
    return {
      currentMode: 'task'
    };
  }
};
</script>
```
