# TimelineEntryEditor

A molecule component for editing timeline entries with title, description (Markdown), period name, and date display.

## Usage

```vue
<v-timeline dense>
  <TimelineEntryEditor
    v-for="(entry, index) in entries"
    :key="index"
    :title.sync="entry.title"
    :description.sync="entry.description"
    :periodName="entry.periodName"
    :date="entry.date"
    :color="getTimelineColor(entry.period)"
    :editorKey="index"
  />
</v-timeline>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| title | String | No | '' | Goal title (editable) |
| description | String | No | '' | Goal description in Markdown |
| periodName | String | Yes | - | Display name (e.g., "Week 1", "January") |
| date | String | Yes | - | Date string (e.g., "2025-W01", "2025-01") |
| color | String | No | 'primary' | Timeline dot color |
| editorKey | String/Number | No | 0 | Key for forcing editor refresh |
| editorConfig | Object | No | Default config | EasyMDE configuration object |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| update:title | String | Emitted when title changes |
| update:description | String | Emitted when description changes |

## Features

* **Inline editing**: Title and description editable in place
* **Markdown support**: VueEasymde for rich text descriptions
* **Compact design**: Minimal toolbar, optimized for timeline view
* **Color-coded dots**: Visual period differentiation
* **Sync modifiers**: Two-way binding with `.sync`

## Editor Configuration

Default EasyMDE config optimized for timeline entries:

```javascript
{
    toolbar: false, // Hide toolbar for compact view
    status: false, // Hide status bar
    spellChecker: false, // Disable spell checker
    hideIcons: ['side-by-side', 'fullscreen'],
    minHeight: '72px', // Match v-textarea (3 rows)
    maxHeight: '120px', // Prevent excessive height
    placeholder: 'Enter goal description...',
    renderingConfig: {
        singleLineBreaks: true,
        markedOptions: {
            breaks: true,
            gfm: true, // GitHub Flavored Markdown
        },
    },
}
```

## Color Mapping

Period-based color coding:

```javascript
getTimelineColor(period) {
    switch (period) {
        case 'day':
            return 'success';
        case 'week':
            return 'primary';
        case 'month':
            return 'warning';
        case 'year':
            return 'info';
        default:
            return 'primary';
    }
}
```

## Integration with AiSearchModal

Extracted from AiSearchModal template lines 272-313:

```vue
<!-- BEFORE: Monolithic template -->
<v-timeline-item
  v-for="(entry, index) in milestoneData.entries"
  :key="index"
  :color="getTimelineColor(entry.period)"
  small
>
  <!-- ~40 lines of inline editing UI -->
</v-timeline-item>

<!-- AFTER: Clean molecule usage -->
<TimelineEntryEditor
  v-for="(entry, index) in milestoneData.entries"
  :key="index"
  :title.sync="entry.title"
  :description.sync="entry.description"
  :periodName="entry.periodName"
  :date="entry.date"
  :color="getTimelineColor(entry.period)"
  :editorKey="editorKey"
/>
```

## Markdown Rendering

The component supports GitHub Flavored Markdown:

* **Headers**: `# H1`,  `## H2`
* **Lists**: Ordered and unordered
* **Bold/Italic**: `**bold**`,  `*italic*`
* **Line breaks**: Preserved with `singleLineBreaks: true`
* **Code blocks**: Inline and fenced

## Use Cases

* Milestone plan editing (week/month/year entries)
* Goal timeline visualization
* Multi-step project planning
* Curriculum/course breakdown
* Quarterly goal planning

## Accessibility

* Semantic timeline structure (Vuetify)
* Label for description editor
* Keyboard navigation in text fields
* Contrast-compliant colors
* Screen reader friendly

## Dependencies

* `vue-easymde` - Markdown editor component
* `vuetify` - Timeline components and text fields
