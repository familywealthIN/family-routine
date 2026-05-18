# LoadingIndicator

An atom component that displays a circular progress indicator with an optional message during loading states.

## Usage

```vue
<LoadingIndicator :loading="isLoading" message="Loading your data..." />
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| loading | Boolean | No | false | Controls visibility of the indicator |
| message | String | No | '' | Optional text to display below spinner |
| size | String/Number | No | 40 | Diameter of the circular spinner (px) |
| width | String/Number | No | 4 | Width of the spinner stroke (px) |

## Features

* Conditional rendering (only shows when loading=true)
* Indeterminate circular progress (continuous animation)
* Optional message text
* Customizable size and stroke width
* Centered layout with flexbox
* Primary color theme (Vuetify)

## Visual Design

### Spinner

* Type: Indeterminate circular progress
* Color: Primary (blue)
* Default size: 40px diameter
* Default stroke: 4px width
* Animation: Continuous rotation

### Message

* Position: Below spinner (16px gap)
* Font size: 14px
* Color: rgba(0, 0, 0, 0.6) (subtle gray)
* Alignment: Center

### Layout

* Padding: 24px all sides
* Gap: 16px between spinner and message
* Alignment: Center (horizontal and vertical)

## Size Variants

```vue
<!-- Small (24px) -->
<LoadingIndicator :loading="true" :size="24" :width="3" message="Loading..." />

<!-- Default (40px) -->
<LoadingIndicator :loading="true" message="Loading your data..." />

<!-- Large (64px) -->
<LoadingIndicator :loading="true" :size="64" :width="6" message="Processing..." />
```

## Use Cases

* **API Calls**: Display while fetching data from GraphQL
* **AI Processing**: Show during AI model inference
* **Form Submission**: Indicate form processing
* **Page Loading**: Show during initial data load
* **Modal Content**: Display in dialogs while loading
* **Card Content**: Show in data cards during refresh

## Common Patterns

### With Apollo Query

```vue
<template>
  <div>
    <LoadingIndicator :loading="$apollo.loading" message="Fetching goals..." />
    <div v-if="!$apollo.loading">
      <!-- Content -->
    </div>
  </div>
</template>
```

### With Async Action

```vue
<template>
  <div>
    <LoadingIndicator :loading="submitting" message="Saving changes..." />
  </div>
</template>

<script>
export default {
  data() {
    return {
      submitting: false,
    };
  },
  methods: {
    async submit() {
      this.submitting = true;
      try {
        await this.$apollo.mutate({ mutation, variables });
      } finally {
        this.submitting = false;
      }
    },
  },
};
</script>
```

### In Modal

```vue
<v-dialog v-model="dialog">
  <v-card>
    <v-card-title>Processing</v-card-title>
    <v-card-text>
      <LoadingIndicator
        :loading="processing"
        message="AI is analyzing your request..."
      />
    </v-card-text>
  </v-card>
</v-dialog>
```

## Accessibility

* Uses Vuetify's accessible progress component
* Message provides context for screen readers
* Respects prefers-reduced-motion (through Vuetify)
* Semantic HTML structure
