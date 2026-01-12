# ScrollShadowIndicator

An atom component that displays gradient shadows to indicate scrollable content above or below the viewport.

## Usage

```vue
<ScrollShadowIndicator :showTop="hasContentAbove" :showBottom="hasContentBelow" />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| showTop | Boolean | No | false | Show shadow at top (content above) |
| showBottom | Boolean | No | false | Show shadow at bottom (content below) |

## Features

* Smooth fade transitions (300ms)
* Fixed positioning for scroll containers
* Gradient shadows with subtle opacity
* Non-interactive (pointer-events: none)
* Responsive to scroll state changes

## Visual Design

### Top Shadow

* Position: Fixed at top (64px from top to avoid toolbar)
* Gradient: Dark to transparent (top to bottom)
* Height: 20px
* Opacity: 0.1

### Bottom Shadow

* Position: Fixed at bottom
* Gradient: Dark to transparent (bottom to top)
* Height: 20px
* Opacity: 0.1

## Implementation Pattern

Typically used with scroll event handler:

```vue
<template>
  <div @scroll="handleScroll">
    <ScrollShadowIndicator :showTop="showTop" :showBottom="showBottom" />
    <div class="content">
      <!-- Scrollable content -->
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      showTop: false,
      showBottom: true,
    };
  },
  methods: {
    handleScroll(event) {
      const { scrollTop, scrollHeight, clientHeight } = event.target;
      this.showTop = scrollTop > 0;
      this.showBottom = scrollTop + clientHeight < scrollHeight - 5;
    },
  },
};
</script>
```

## Use Cases

* Modal dialogs with long content
* Full-screen forms
* Chat interfaces
* Article readers
* Any scrollable container where visual feedback improves UX

## Accessibility

* Purely decorative (no semantic meaning)
* Does not interfere with keyboard navigation
* Does not capture pointer events
