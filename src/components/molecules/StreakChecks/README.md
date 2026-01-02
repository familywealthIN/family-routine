# StreakChecks

A molecule component that displays a visual streak indicator with 5 checkmarks showing progress.

## Usage

```vue
<StreakChecks :progress="3" :animate="true" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| progress | Number/String | No | 0 | Current progress (0-5) |
| animate | Boolean | No | false | Whether to animate the current progress check |

## Features

- Visual representation of streak progress (1-5)
- Filled check circles for completed steps
- Outlined check circles for incomplete steps
- Optional animation for the current progress step
- Connecting dividers between checks

## Animation Behavior

When `animate` is true, the current progress check will animate from outlined to filled after 500ms.

## Styling

- Uses green color theme for checks and dividers
- 24px icon size
- Responsive flex layout
